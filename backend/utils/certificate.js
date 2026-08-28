import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Generates a permanent, non-sequential public credential ID with 100 bits of entropy. */
export function createCertificateId(year = new Date().getUTCFullYear()) {
  const bytes = crypto.randomBytes(20);
  let value = '';
  for (const byte of bytes) value += ALPHABET[byte % ALPHABET.length];
  return `CERT-${year}-${value}`;
}

export function verificationCode() {
  return crypto.randomBytes(32).toString('base64url');
}

export function isExpired(certificate, now = new Date()) {
  return Boolean(certificate.expiryDate && new Date(certificate.expiryDate) < now);
}

export function publicStatus(certificate) {
  if (certificate.status === 'REVOKED') return 'REVOKED';
  return isExpired(certificate) ? 'EXPIRED' : 'VALID';
}
