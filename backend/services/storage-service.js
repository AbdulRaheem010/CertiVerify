import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

const root = path.resolve(process.env.STORAGE_LOCAL_PATH || 'storage');
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const allowedMime = new Set(['application/pdf', 'image/png', 'image/svg+xml']);

function filename(prefix, extension) {
  return `${prefix}-${crypto.randomUUID()}.${extension}`;
}

function cleanPrefix(prefix) {
  return prefix.replace(/[^a-zA-Z0-9-]/g, '');
}

function storagePath(name) {
  return `certificates/${name}`;
}

async function storeSupabase({ name, mimeType, buffer }) {
  const response = await fetch(
    `${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(env.supabaseStorageBucket)}/${storagePath(name)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.supabaseStorageKey}`,
        apikey: env.supabaseStorageKey,
        'Content-Type': mimeType,
        'x-upsert': 'true',
      },
      body: buffer,
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new ApiError(502, `Supabase Storage upload failed.${detail ? ` ${detail}` : ''}`, 'STORAGE_UPLOAD_FAILED');
  }

  return `supabase://${env.supabaseStorageBucket}/${storagePath(name)}`;
}

export async function storeBuffer({ prefix, extension, mimeType, buffer }) {
  if (!allowedMime.has(mimeType)) throw new ApiError(422, 'Unsupported generated file type.', 'INVALID_FILE_TYPE');
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_FILE_BYTES) {
    throw new ApiError(422, 'Generated file exceeds storage limits.', 'INVALID_FILE_SIZE');
  }

  const name = filename(cleanPrefix(prefix), extension);

  if (env.storageDriver === 'supabase') {
    return storeSupabase({ name, mimeType, buffer });
  }

  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, name), buffer, { mode: 0o600 });
  return `/files/${encodeURIComponent(name)}`;
}

export async function removeStoredFile(url) {
  if (!url) return;

  if (url.startsWith('supabase://')) {
    const marker = `supabase://${env.supabaseStorageBucket}/`;
    if (!url.startsWith(marker)) return;
    const objectPath = url.slice(marker.length);
    const response = await fetch(
      `${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(env.supabaseStorageBucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${env.supabaseStorageKey}`,
          apikey: env.supabaseStorageKey,
        },
      },
    );
    if (!response.ok && response.status !== 404) {
      throw new ApiError(502, 'Supabase Storage deletion failed.', 'STORAGE_DELETE_FAILED');
    }
    return;
  }

  if (!url.startsWith('/files/')) return;
  const name = decodeURIComponent(url.slice('/files/'.length));
  if (!/^[a-zA-Z0-9-]+\.(pdf|png|svg)$/.test(name)) return;
  await unlink(path.join(root, name)).catch(() => {});
}

export const localStorageRoot = root;
export const storageMode = env.storageDriver;
