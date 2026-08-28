import test from 'node:test';
import assert from 'node:assert/strict';
import { findTenantCertificate } from '../backend/services/certificate-service.js';

test('tenant certificate lookup always scopes the resource by organization ID', async () => {
  let observedWhere;
  const prisma = { certificate: { findFirst: async ({ where }) => { observedWhere = where; return null; } } };
  await assert.rejects(() => findTenantCertificate(prisma, 'certificate-from-org-b', 'organization-a'), { code: 'NOT_FOUND' });
  assert.deepEqual(observedWhere, { id: 'certificate-from-org-b', organizationId: 'organization-a' });
});

test('tenant lookup returns a resource only when the database confirms matching ownership', async () => {
  const certificate = { id: 'cert-a', organizationId: 'organization-a' };
  const prisma = { certificate: { findFirst: async ({ where }) => where.organizationId === 'organization-a' ? certificate : null } };
  assert.equal(await findTenantCertificate(prisma, 'cert-a', 'organization-a'), certificate);
  await assert.rejects(() => findTenantCertificate(prisma, 'cert-a', 'organization-b'), { code: 'NOT_FOUND' });
});
