export class ApiError extends Error { constructor(status, message, code = 'API_ERROR') { super(message); this.status = status; this.code = code; } }
export const notFound = (message = 'Resource not found.') => new ApiError(404, message, 'NOT_FOUND');
