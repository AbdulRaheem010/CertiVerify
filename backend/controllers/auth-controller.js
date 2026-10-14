import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { clearSession, createSession, setSession } from '../middleware/auth.js';
import { ApiError } from '../utils/errors.js';
import { sendPasswordResetEmail } from '../services/email-service.js';

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role });
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export async function register(req, res) {
  const { name, password, organizationName } = req.body;
  const email = req.body.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(422, 'An account already uses this email.', 'EMAIL_EXISTS');
  const baseSlug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 45) || 'organization';
  const slug = `${baseSlug}-${crypto.randomBytes(4).toString('hex')}`;
  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12), role: 'ORGANIZATION_OWNER', memberships: { create: { role: 'ORGANIZATION_OWNER', organization: { create: { name: organizationName, slug } } } } },
    include: { memberships: true }
  });
  const organizationId = user.memberships[0].organizationId;
  setSession(res, await createSession({ id: user.id, role: user.role, organizationId }));
  res.status(201).json({ user: publicUser(user), organizationId });
}

export async function login(req, res) {
  const email = req.body.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, include: { memberships: { where: { organization: { status: 'ACTIVE' } }, take: 1 } } });
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) throw new ApiError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  if (user.role !== 'SUPER_ADMIN' && !user.memberships[0]) throw new ApiError(403, 'This organization is unavailable.', 'ORGANIZATION_UNAVAILABLE');
  const organizationId = user.memberships[0]?.organizationId;
  setSession(res, await createSession({ id: user.id, role: user.role, organizationId }));
  res.json({ user: publicUser(user), organizationId });
}

export function logout(_req, res) { clearSession(res); res.status(204).end(); }
export async function me(req, res) { const user = await prisma.user.findUnique({ where: { id: req.auth.userId }, select: { id: true, name: true, email: true, role: true } }); res.json({ user, organizationId: req.auth.organizationId }); }

export async function requestPasswordReset(req, res) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  // Always return the same response so callers cannot discover registered emails.
  const message = 'If an account exists for that email, a password-reset link will be sent shortly.';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.json({ message });
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } });
  if (!user) return res.json({ message });

  const rawToken = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt } })
  ]);

  const baseUrl = (process.env.APP_URL || 'https://certi-verify-nu.vercel.app').replace(/\/$/, '');
  const url = `${baseUrl}/reset-password.html?token=${encodeURIComponent(rawToken)}`;
  try {
    const result = await sendPasswordResetEmail({ email: user.email, name: user.name, url });
    if (!result.delivered) console.error('[CertiVerify password reset] Email was not delivered:', result.mode);
  } catch (error) {
    console.error('[CertiVerify password reset email]', error?.message || error);
  }
  res.json({ message });
}

export async function resetPassword(req, res) {
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');
  if (token.length < 32 || token.length > 200) throw new ApiError(400, 'This reset link is invalid or expired. Request a new one.', 'RESET_TOKEN_INVALID');
  if (password.length < 12 || password.length > 128) throw new ApiError(422, 'Your new password must be between 12 and 128 characters.', 'PASSWORD_INVALID');

  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true } } }
  });
  if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt <= new Date()) {
    throw new ApiError(400, 'This reset link is invalid or expired. Request a new one.', 'RESET_TOKEN_INVALID');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: tokenRecord.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: tokenRecord.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.updateMany({ where: { userId: tokenRecord.userId, usedAt: null, id: { not: tokenRecord.id } }, data: { usedAt: new Date() } })
  ]);
  clearSession(res);
  res.json({ message: 'Password updated successfully. You can now sign in with your new password.' });
}
