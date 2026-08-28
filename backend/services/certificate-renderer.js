import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { storeBuffer } from './storage-service.js';
import { env } from '../config/env.js';

const asBuffer = (document) => new Promise((resolve, reject) => { const chunks = []; document.on('data', (chunk) => chunks.push(chunk)); document.on('end', () => resolve(Buffer.concat(chunks))); document.on('error', reject); });
const date = (value) => value ? new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(value)) : 'No expiry';

export async function generateCertificateAssets(certificate) {
  const url = `${env.appUrl}/verify.html?id=${encodeURIComponent(certificate.certificateId)}`;
  const qrPng = await QRCode.toBuffer(url, { errorCorrectionLevel: 'M', type: 'png', width: 320, margin: 1, color: { dark: '#163a2c', light: '#ffffff' } });
  const qrCodeUrl = await storeBuffer({ prefix: `qr-${certificate.certificateId}`, extension: 'png', mimeType: 'image/png', buffer: qrPng });
  const document = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 42, info: { Title: certificate.title, Author: certificate.organization.name } });
  const output = asBuffer(document);
  const design = certificate.template?.design || 'classic';
  const colors = { classic: ['#153a2c', '#d0a95b'], modern: ['#172554', '#4f46e5'], minimal: ['#252525', '#9a7d47'] }[design] || ['#153a2c', '#d0a95b'];
  document.rect(0, 0, 842, 595).fill('#fffdf7'); document.lineWidth(11).strokeColor(colors[0]).rect(18, 18, 806, 559).stroke();
  document.fillColor(colors[0]).fontSize(12).font('Helvetica-Bold').text(certificate.organization.name.toUpperCase(), 70, 72, { align: 'center' });
  document.fillColor(colors[1]).fontSize(11).text('VERIFIED PROFESSIONAL CREDENTIAL', 70, 97, { align: 'center', characterSpacing: 1.4 });
  document.fillColor(colors[0]).fontSize(34).font('Times-Roman').text(certificate.title, 70, 145, { align: 'center' });
  document.fillColor('#5e675f').fontSize(13).font('Helvetica').text('This certificate is proudly awarded to', 70, 210, { align: 'center' });
  document.fillColor(colors[0]).fontSize(32).font('Times-Bold').text(certificate.recipient.name, 70, 240, { align: 'center' });
  document.fillColor('#5e675f').fontSize(13).font('Helvetica').text('for successfully completing', 70, 295, { align: 'center' });
  document.fillColor(colors[0]).fontSize(19).font('Helvetica-Bold').text(certificate.course.name, 70, 320, { align: 'center' });
  document.fillColor('#5e675f').fontSize(10).font('Helvetica').text(`Issued ${date(certificate.issueDate)}  •  ${certificate.credentialLevel || 'Professional credential'}`, 70, 355, { align: 'center' });
  document.image(qrPng, 695, 410, { width: 88 }); document.fillColor('#5e675f').fontSize(7).text('Scan to verify', 695, 503, { width: 88, align: 'center' });
  document.fillColor(colors[0]).fontSize(9).text(`Certificate ID: ${certificate.certificateId}`, 65, 485); document.text(`Verify: ${url}`, 65, 502);
  document.moveTo(300, 465).lineTo(510, 465).strokeColor('#b7bdb7').lineWidth(0.5).stroke(); document.fillColor(colors[0]).fontSize(11).text(certificate.issuerName || certificate.organization.name, 300, 472, { width: 210, align: 'center' }); document.fillColor('#5e675f').fontSize(8).text(certificate.issuerTitle || 'Authorized issuer', 300, 487, { width: 210, align: 'center' });
  document.end();
  const certificateFileUrl = await storeBuffer({ prefix: `certificate-${certificate.certificateId}`, extension: 'pdf', mimeType: 'application/pdf', buffer: await output });
  return { qrCodeUrl, certificateFileUrl };
}
