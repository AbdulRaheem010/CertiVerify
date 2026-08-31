import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { localStorageRoot } from '../services/storage-service.js';
import { generateCertificateAssets } from '../services/certificate-renderer.js';

function notFound() {
  const error = new Error('Certificate file not found.');
  error.status = 404;
  error.code = 'CERTIFICATE_FILE_NOT_FOUND';
  return error;
}

async function loadCertificate(id, organizationId) {
  return prisma.certificate.findFirst({
    where: { id, organizationId },
    include: { recipient: true, course: true, organization: true, template: true },
  });
}

async function readSupabaseFile(url) {
  const marker = `supabase://${env.supabaseStorageBucket}/`;
  if (!url.startsWith(marker)) throw notFound();
  const objectPath = url.slice(marker.length);
  if (!objectPath.startsWith('certificates/')) throw notFound();

  const response = await fetch(
    `${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(env.supabaseStorageBucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`,
    {
      headers: {
        Authorization: `Bearer ${env.supabaseStorageKey}`,
        apikey: env.supabaseStorageKey,
      },
    },
  );

  if (!response.ok) throw notFound();
  return Buffer.from(await response.arrayBuffer());
}

export async function download(req, res) {
  const certificate = await loadCertificate(req.params.id, req.auth.organizationId);
  if (!certificate?.certificateFileUrl) throw notFound();

  let buffer;

  if (certificate.certificateFileUrl.startsWith('supabase://')) {
    try {
      buffer = await readSupabaseFile(certificate.certificateFileUrl);
    } catch {
      const assets = await generateCertificateAssets(certificate);
      await prisma.certificate.update({ where: { id: certificate.id }, data: assets });
      buffer = await readSupabaseFile(assets.certificateFileUrl);
    }
  } else if (certificate.certificateFileUrl.startsWith('/files/')) {
    const encodedName = certificate.certificateFileUrl.slice('/files/'.length);
    let filename;
    try {
      filename = decodeURIComponent(encodedName);
    } catch {
      throw notFound();
    }
    if (!/^[a-zA-Z0-9-]+\.pdf$/.test(filename)) throw notFound();

    const root = path.resolve(localStorageRoot);
    const filePath = path.resolve(root, filename);
    if (!filePath.startsWith(`${root}${path.sep}`)) throw notFound();

    try {
      buffer = await readFile(filePath);
    } catch {
      const assets = await generateCertificateAssets(certificate);
      await prisma.certificate.update({ where: { id: certificate.id }, data: assets });
      if (assets.certificateFileUrl.startsWith('supabase://')) {
        buffer = await readSupabaseFile(assets.certificateFileUrl);
      } else {
        const regeneratedName = decodeURIComponent(assets.certificateFileUrl.slice('/files/'.length));
        const regeneratedPath = path.resolve(root, regeneratedName);
        if (!regeneratedPath.startsWith(`${root}${path.sep}`)) throw notFound();
        try {
          buffer = await readFile(regeneratedPath);
        } catch {
          throw notFound();
        }
      }
    }
  } else {
    throw notFound();
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificateId}.pdf"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(buffer);
}
