import { parseImportCsv } from './csv-service.js';
import { issueCertificate } from './certificate-service.js';
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function bulkIssue(prisma, organizationId, actorId, buffer, importKey) {
  const rows = parseImportCsv(buffer); const courses = await prisma.course.findMany({ where: { organizationId }, select: { id: true, name: true, code: true } });
  const byCourse = new Map(courses.flatMap((course) => [[course.name.toLowerCase(), course], [course.code.toLowerCase(), course]])); const seen = new Set(); const results = [];
  for (let index = 0; index < rows.length; index += 1) { const row = rows[index]; const rowNumber = index + 2; const fingerprint = `${row.email?.toLowerCase()}|${row.course?.toLowerCase()}|${row.issueDate}`; const course = byCourse.get(row.course?.toLowerCase()); const issueDate = new Date(row.issueDate); const expiryDate = row.expiryDate ? new Date(row.expiryDate) : null; let error;
    if (!row.name?.trim() || !email.test(row.email || '')) error = 'Name and valid email are required.'; else if (!course) error = 'Course was not found in this organization.'; else if (Number.isNaN(+issueDate) || (expiryDate && Number.isNaN(+expiryDate)) || (expiryDate && expiryDate <= issueDate)) error = 'Issue/expiry dates are invalid.'; else if (seen.has(fingerprint)) error = 'Duplicate row in this import.'; seen.add(fingerprint);
    if (error) { results.push({ row: rowNumber, status: 'failed', error, ...row }); continue; }
    try { const recipient = await prisma.recipient.upsert({ where: { organizationId_email: { organizationId, email: row.email.toLowerCase() } }, update: { name: row.name.trim() }, create: { organizationId, email: row.email.toLowerCase(), name: row.name.trim() } }); const certificate = await issueCertificate(prisma, organizationId, actorId, { recipientId: recipient.id, courseId: course.id, title: 'Certificate of Completion', issueDate, expiryDate, grade: row.grade || undefined, skills: [] }, `${importKey}:${index}`); results.push({ row: rowNumber, status: 'success', certificateId: certificate.certificateId }); } catch (exception) { results.push({ row: rowNumber, status: 'failed', error: 'Certificate could not be issued.' }); }
  }
  return { total: rows.length, successful: results.filter((row) => row.status === 'success').length, failed: results.filter((row) => row.status === 'failed').length, skipped: 0, results };
}
