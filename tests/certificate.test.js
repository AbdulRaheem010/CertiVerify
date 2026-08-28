import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificateId, publicStatus } from '../backend/utils/certificate.js';

test('certificate IDs are non-sequential and unique', () => {
  const ids = new Set(Array.from({ length: 1000 }, () => createCertificateId(2026)));
  assert.equal(ids.size, 1000);
  for (const id of ids) assert.match(id, /^CERT-2026-[A-Z2-9]{20}$/);
});

test('revoked and expired certificates never report valid', () => {
  assert.equal(publicStatus({ status: 'REVOKED' }), 'REVOKED');
  assert.equal(publicStatus({ status: 'VALID', expiryDate: new Date('2020-01-01') }), 'EXPIRED');
  assert.equal(publicStatus({ status: 'VALID' }), 'VALID');
});

test('certificate identifiers exclude ambiguous public characters', () => {
  const suffix = createCertificateId(2026).split('-').at(-1);
  assert.equal(/[01ILO]/.test(suffix), false);
});
