import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

const root = path.resolve(process.env.STORAGE_LOCAL_PATH || 'storage');
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const allowedMime = new Set(['application/pdf', 'image/png', 'image/svg+xml']);

function filename(prefix, extension) { return `${prefix}-${crypto.randomUUID()}.${extension}`; }
export async function storeBuffer({ prefix, extension, mimeType, buffer }) {
  if (!allowedMime.has(mimeType)) throw new ApiError(422, 'Unsupported generated file type.', 'INVALID_FILE_TYPE');
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_FILE_BYTES) throw new ApiError(422, 'Generated file exceeds storage limits.', 'INVALID_FILE_SIZE');
  await mkdir(root, { recursive: true });
  const name = filename(prefix.replace(/[^a-zA-Z0-9-]/g, ''), extension);
  await writeFile(path.join(root, name), buffer, { mode: 0o600 });
  return `/files/${encodeURIComponent(name)}`;
}
export async function removeStoredFile(url) { if (!url?.startsWith('/files/')) return; const name = decodeURIComponent(url.slice('/files/'.length)); if (!/^[a-zA-Z0-9-]+\.(pdf|png|svg)$/.test(name)) return; await unlink(path.join(root, name)).catch(() => {}); }
export const localStorageRoot = root;
export const storageMode = process.env.STORAGE_DRIVER || 'local';
