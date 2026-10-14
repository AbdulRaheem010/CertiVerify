import crypto from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

const key = new TextEncoder().encode(env.jwtSecret);
const sameSite = env.isProduction ? 'none' : 'lax';
const sessionOptions = { httpOnly: true, sameSite, secure: env.isProduction, maxAge: 8 * 60 * 60 * 1000, path: '/' };

export async function createSession(user) {
  return new SignJWT({ role: user.role, organizationId: user.organizationId || null })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('certiverify')
    .setAudience('certiverify-web')
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(key);
}

export function setSession(res, token) {
  res.cookie('cv_session', token, sessionOptions);
  res.cookie('cv_csrf', crypto.randomUUID(), { httpOnly: false, sameSite, secure: env.isProduction, maxAge: sessionOptions.maxAge, path: '/' });
}

export function clearSession(res) {
  res.clearCookie('cv_session', { path: '/' });
  res.clearCookie('cv_csrf', { path: '/' });
}

export async function requireAuth(req, _res, next) {
  let stage = 'read-cookie';
  try {
    const token = req.cookies.cv_session;
    if (!token) throw new Error('No session cookie');

    stage = 'verify-token';
    const { payload } = await jwtVerify(token, key, { issuer: 'certiverify', audience: 'certiverify-web' });

    stage = 'find-user';
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true } });
    if (!user || user.role !== payload.role) throw new Error('User missing or role mismatch');

    if (['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ORGANIZATION_STAFF'].includes(user.role)) {
      stage = 'check-membership';
      const membership = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: user.id, organizationId: payload.organizationId } },
        include: { organization: { select: { status: true } } }
      });

      if (!membership || !membership.isActive || membership.role !== user.role || membership.organization.status !== 'ACTIVE') {
        // Log only boolean/status diagnostics; never log user IDs, tokens, or cookies.
        console.warn('[auth] Membership diagnostics:', {
          membershipFound: Boolean(membership),
          isActive: membership?.isActive ?? null,
          roleMatchesUser: membership ? membership.role === user.role : null,
          organizationStatus: membership?.organization?.status ?? null
        });
        throw new Error('Organization membership validation failed');
      }
    }

    req.auth = { userId: user.id, role: user.role, organizationId: user.role === 'SUPER_ADMIN' ? null : payload.organizationId };
    next();
  } catch (error) {
    // Never log cookies, tokens, or other credentials.
    console.warn(`[auth] Session rejected at ${stage}: ${error?.message || 'unknown error'}`);
    next(new ApiError(401, 'Please sign in to continue.', 'UNAUTHENTICATED'));
  }
}

export const allowRoles = (...roles) => (req, _res, next) => roles.includes(req.auth?.role) ? next() : next(new ApiError(403, 'You do not have permission for this action.', 'FORBIDDEN'));
export const requireTenant = (req, _res, next) => req.auth?.organizationId ? next() : next(new ApiError(403, 'An organization workspace is required for this action.', 'TENANT_REQUIRED'));
