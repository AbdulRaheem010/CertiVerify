import { parse } from 'csv-parse/sync';
import { ApiError } from '../utils/errors.js';

export const CSV_COLUMNS = ['name', 'email', 'course', 'issueDate', 'expiryDate', 'grade'];
const MAX_ROWS = 500;
export const safeCsvCell = (value = '') => { const text = String(value).replace(/[\r\n]+/g, ' ').trim(); return /^[=+\-@]/.test(text) ? `'${text}` : text; };
export function csv(rows) { return rows.map((row) => row.map((value) => `"${safeCsvCell(value).replaceAll('"', '""')}"`).join(',')).join('\r\n'); }
export function parseImportCsv(buffer) {
  if (!buffer?.length || buffer.length > 1024 * 1024) throw new ApiError(422, 'CSV must be between 1 byte and 1 MB.', 'INVALID_CSV_SIZE');
  if (buffer.includes(0)) throw new ApiError(422, 'CSV contains invalid binary data.', 'INVALID_CSV_ENCODING');
  let rows;
  try { rows = parse(buffer.toString('utf8'), { columns: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: false }); } catch { throw new ApiError(422, 'CSV could not be parsed. Check quoting and column count.', 'MALFORMED_CSV'); }
  if (!rows.length || rows.length > MAX_ROWS) throw new ApiError(422, `CSV must contain between 1 and ${MAX_ROWS} rows.`, 'INVALID_CSV_ROW_COUNT');
  const missing = CSV_COLUMNS.filter((column) => !(column in rows[0]));
  if (missing.length) throw new ApiError(422, `Missing required CSV columns: ${missing.join(', ')}.`, 'MISSING_CSV_COLUMNS');
  return rows;
}
