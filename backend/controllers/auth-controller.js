import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { clearSession, createSession, setSession } from '../middleware/auth.js';
import { ApiError } from '../utils/errors.js';

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role });

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
