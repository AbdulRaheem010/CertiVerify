import { ApiError } from '../utils/errors.js';
export function errorHandler(error, _req, res, _next) {
  const status = error instanceof ApiError || Number.isInteger(error.status) ? error.status : 500;
  if (status === 500) console.error(error);
  res.status(status).json({ error: { code: error.code || 'INTERNAL_ERROR', message: status === 500 ? 'An unexpected error occurred.' : error.message } });
}
export function notFoundHandler(_req, _res, next) { next(new ApiError(404, 'Endpoint not found.', 'NOT_FOUND')); }
