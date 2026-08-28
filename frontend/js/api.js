const API = '/api';
export class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
function csrfToken() { return document.cookie.split('; ').find((part) => part.startsWith('cv_csrf='))?.split('=').slice(1).join(''); }
async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
  if (options.body) headers['Content-Type'] = 'application/json';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers['x-csrf-token'] = csrfToken() || '';
  const response = await fetch(`${API}${path}`, { credentials: 'same-origin', headers, ...options });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { if (response.status === 401 && !location.pathname.endsWith('/login.html')) location.assign('/login.html'); throw new ApiError(data.error?.message || 'Something went wrong. Please try again.', response.status); }
  return data;
}
export const api = { get: (p) => request(p), post: (p, b, idempotencyKey) => request(p, { method: 'POST', body: JSON.stringify(b), idempotencyKey }), patch: (p, b) => request(p, { method: 'PATCH', body: JSON.stringify(b) }), delete: (p) => request(p, { method: 'DELETE' }) };
