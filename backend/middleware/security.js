import { ApiError } from '../utils/errors.js';
import { env } from '../config/env.js';
const unsafeMethods = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export function csrfProtection(req, _res, next) {
  if (!unsafeMethods.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin && origin !== env.appUrl) return next(new ApiError(403, 'Cross-origin requests are not allowed.', 'ORIGIN_INVALID'));
  // Login/register have no authenticated cookie yet; same-origin policy above prevents login CSRF.
  if (req.path === '/auth/login' || req.path === '/auth/register' || req.path === '/staff-invitations/accept') return next();
  const token = req.get('x-csrf-token');
  if (!token || !req.cookies.cv_csrf || token !== req.cookies.cv_csrf) return next(new ApiError(403, 'Your session check failed. Refresh the page and try again.', 'CSRF_INVALID'));
  next();
}
