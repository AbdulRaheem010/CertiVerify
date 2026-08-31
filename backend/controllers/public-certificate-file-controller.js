import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { prisma } from '../config/prisma.js';
import { localStorageRoot } from '../services/storage-service.js';
import { generateCertificateAssets } from '../services/certificate-renderer.js';
import { publicStatus } from '../utils/certificate.js';

function notFound() {
  const error = new Error('Certificate file not found.');
  error.status = 404;
  error.code = 'CERTIFICATE_FILE_NOT_FOUND';
  return error;
}

function unavailable() {
  const error = new Error('This certificate is not currently available for public download.');
  error.status = 403;
  error.code = 'PUBLIC_DOWNLOAD_UNAVAILABLE';
  return error;
}

export async function download(req, res) {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateId: req.params.certificateId.toUpperCase() },
    include: { recipient: true, course: true, organization: true, template: true },
  });

  if (!certificate) throw notFound();
  if (publicStatus(certificate) !== 'VALID') throw unavailable();

  const readStored = async (fileUrl) => {
    if (!fileUrl?.startsWith('/files/')) return null;
    const encodedName = fileUrl.slice('/files/'.length);
    let filename;
    try {
      filename = decodeURIComponent(encodedName);
    } catch {
      return null;
    }
    if (!/^[a-zA-Z0-9-]+\.pdf$/.test(filename)) return null;
    const root = path.resolve(localStorageRoot);
    const filePath = path.resolve(root, filename);
    if (!filePath.startsWith(`${root}${path.sep}`)) return null;
    try {
      return await readFile(filePath);
    } catch {
      return null;
    }
  };

  let buffer = await readStored(certificate.certificateFileUrl);

  if (!buffer) {
    const assets = await generateCertificateAssets(certificate);
    await prisma.certificate.update({ where: { id: certificate.id }, data: assets });
    buffer = await readStored(assets.certificateFileUrl);
  }

  if (!buffer) throw notFound();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificateId}.pdf"`);
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(buffer);
}
