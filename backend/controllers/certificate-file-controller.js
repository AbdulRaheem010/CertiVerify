import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { prisma } from '../config/prisma.js';
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

export async function download(req, res) {
  const certificate = await loadCertificate(req.params.id, req.auth.organizationId);
  if (!certificate?.certificateFileUrl?.startsWith('/files/')) throw notFound();

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

  let buffer;
  try {
    buffer = await readFile(filePath);
  } catch {
    // Render's local filesystem is not durable across deploys/restarts. Regenerate
    // the certificate asset from the canonical database record when the file is gone.
    const assets = await generateCertificateAssets(certificate);
    await prisma.certificate.update({ where: { id: certificate.id }, data: assets });
    const regeneratedName = decodeURIComponent(assets.certificateFileUrl.slice('/files/'.length));
    const regeneratedPath = path.resolve(root, regeneratedName);
    if (!regeneratedPath.startsWith(`${root}${path.sep}`)) throw notFound();
    try {
      buffer = await readFile(regeneratedPath);
    } catch {
      throw notFound();
    }
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificateId}.pdf"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(buffer);
}
