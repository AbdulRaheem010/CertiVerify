import { prisma } from '../config/prisma.js';
import { bulkIssue } from '../services/bulk-issuance-service.js';
import { csv } from '../services/csv-service.js';
import { ApiError } from '../utils/errors.js';
export async function issue(req, res) { if (!req.file || req.file.mimetype !== 'text/csv') throw new ApiError(422, 'Upload a CSV file.', 'INVALID_CSV_FILE'); const key = req.get('idempotency-key'); if (!key || key.length > 120) throw new ApiError(422, 'A valid idempotency key is required.', 'IDEMPOTENCY_KEY_REQUIRED'); res.json(await bulkIssue(prisma, req.auth.organizationId, req.auth.userId, req.file.buffer, key)); }
export function errorReport(req, res) { const rows = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 500) : []; res.type('text/csv').attachment('certiverify-import-errors.csv').send(csv([['row', 'email', 'course', 'error'], ...rows.map((row) => [row.row, row.email, row.course, row.error])])); }
