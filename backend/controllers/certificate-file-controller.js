import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { prisma } from '../config/prisma.js';
import { localStorageRoot } from '../services/storage-service.js';

function notFound() {
  const error = new Error('Certificate file not found.');
  error.status = 404;
  error.code = 'CERTIFICATE_FILE_NOT_FOUND';
  return error;
}

export async function download(req, res) {
  const certificate = await prisma.certificate.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.auth.organizationId,
    },
    select: { certificateFileUrl: true, certificateId: true },
  });

  if (!certificate?.certificateFileUrl?.startsWith('/files/')) throw notFound();

  const encodedName = certificate.certificateFileUrl.slice('/files/'.length);
  const filename = decodeURIComponent(encodedName);
  if (!/^[a-zA-Z0-9-]+\.pdf$/.test(filename)) throw notFound();

  const root = path.resolve(localStorageRoot);
  const filePath = path.resolve(root, filename);
  if (!filePath.startsWith(`${root}${path.sep}`)) throw notFound();

  let buffer;
  try {
    buffer = await readFile(filePath);
  } catch {
    throw notFound();
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificateId}.pdf"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(buffer);
}
