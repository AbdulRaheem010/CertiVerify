import { createCertificateId, publicStatus, verificationCode } from '../utils/certificate.js';
import { ApiError, notFound } from '../utils/errors.js';
import { reserveCertificateQuota } from './usage-service.js';
import { audit } from '../utils/audit.js';

async function createCertificateRecord(prisma, organizationId, actorId, input, idempotencyKey) {
  if (idempotencyKey) {
    const existing = await prisma.certificate.findFirst({ where: { organizationId, idempotencyKey } });
    if (existing) return existing;
  }
  await reserveCertificateQuota(prisma, organizationId);
  const [recipient, course, template] = await Promise.all([
    prisma.recipient.findFirst({ where: { id: input.recipientId, organizationId } }),
    prisma.course.findFirst({ where: { id: input.courseId, organizationId } }),
    input.templateId ? prisma.certificateTemplate.findFirst({ where: { id: input.templateId, organizationId } }) : Promise.resolve(null)
  ]);
  if (!recipient || !course || (input.templateId && !template)) throw notFound('Recipient, course, or template was not found.');
  const data = { ...input, certificateId: createCertificateId(), verificationCode: verificationCode(), idempotencyKey: idempotencyKey || null, organizationId, recipientId: recipient.id, courseId: course.id, expiryDate: input.expiryDate || null };
  try {
    const certificate = await prisma.certificate.create({ data });
    await audit(prisma, { organizationId, actorId, action: 'CERTIFICATE_ISSUED', resourceType: 'Certificate', resourceId: certificate.id });
    return certificate;
  } catch (error) {
    if (error.code === 'P2002' && idempotencyKey) return prisma.certificate.findFirst({ where: { organizationId, idempotencyKey } });
    throw error;
  }
}

async function renderAssets(prisma, certificateId) {
  const certificate = await prisma.certificate.findUnique({ where: { id: certificateId }, include: { recipient: true, course: true, organization: true, template: true } });
  const { generateCertificateAssets } = await import('./certificate-renderer.js');
  const assets = await generateCertificateAssets(certificate);
  return prisma.certificate.update({ where: { id: certificateId }, data: assets });
}

export async function issueCertificate(prisma, organizationId, actorId, input, idempotencyKey) {
  const certificate = await prisma.$transaction((tx) => createCertificateRecord(tx, organizationId, actorId, input, idempotencyKey));
  return certificate.certificateFileUrl ? certificate : renderAssets(prisma, certificate.id);
}

export async function findTenantCertificate(prisma, id, organizationId) {
  const certificate = await prisma.certificate.findFirst({ where: { id, organizationId }, include: { recipient: true, course: true, organization: true } });
  if (!certificate) throw notFound('Certificate not found.');
  return certificate;
}

export async function revokeCertificate(prisma, certificate, actorId, reason) {
  if (certificate.status === 'REVOKED') throw new ApiError(422, 'This certificate is already revoked.', 'ALREADY_REVOKED');
  return prisma.$transaction(async (tx) => {
    const updated = await tx.certificate.update({ where: { id: certificate.id }, data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: reason } });
    await audit(tx, { organizationId: certificate.organizationId, actorId, action: 'CERTIFICATE_REVOKED', resourceType: 'Certificate', resourceId: certificate.id, metadata: { reason } });
    return updated;
  });
}

export async function reissueCertificate(prisma, certificate, actorId, changes = {}) {
  if (certificate.status === 'REVOKED') throw new ApiError(422, 'A revoked certificate cannot be reissued.', 'REISSUE_REVOKED');
  return prisma.$transaction(async (tx) => {
    const replacement = await createCertificateRecord(tx, certificate.organizationId, actorId, { recipientId: certificate.recipientId, courseId: certificate.courseId, templateId: certificate.templateId, title: changes.title || certificate.title, issueDate: new Date(), expiryDate: certificate.expiryDate, grade: certificate.grade, score: certificate.score, credentialLevel: certificate.credentialLevel, skills: certificate.skills, issuerName: certificate.issuerName, issuerTitle: certificate.issuerTitle });
    const issued = await tx.certificate.update({ where: { id: replacement.id }, data: { renewedFromId: certificate.id, version: certificate.version + 1 } });
    await tx.certificate.update({ where: { id: certificate.id }, data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: 'Superseded by reissued credential.' } });
    await audit(tx, { organizationId: certificate.organizationId, actorId, action: 'CERTIFICATE_REISSUED', resourceType: 'Certificate', resourceId: issued.id, metadata: { previousCertificateId: certificate.certificateId } });
    return issued;
  }).then((issued) => renderAssets(prisma, issued.id));
}

export async function publicCertificate(prisma, certificateId, ipHash) {
  const certificate = await prisma.certificate.findUnique({ where: { certificateId }, include: { recipient: true, course: true, organization: true } });
  if (!certificate) throw notFound('No credential matches that certificate ID.');
  await prisma.verificationEvent.create({ data: { certificateId: certificate.id, ipHash } });
  const status = publicStatus(certificate);
  return { status, certificateId: certificate.certificateId, title: certificate.title, recipientName: certificate.recipient.name, courseName: certificate.course.name, organizationName: certificate.organization.name, organizationLogo: certificate.organization.logoUrl, issueDate: certificate.issueDate, expiryDate: certificate.expiryDate, credentialLevel: certificate.credentialLevel, issuerName: certificate.issuerName, certificateFileUrl: status === 'VALID' ? certificate.certificateFileUrl : undefined, qrCodeUrl: status === 'VALID' ? certificate.qrCodeUrl : undefined, verificationUrl: `/verify.html?id=${encodeURIComponent(certificate.certificateId)}`, revokedAt: certificate.revokedAt, revokedReason: status === 'REVOKED' ? certificate.revokedReason : undefined };
}
