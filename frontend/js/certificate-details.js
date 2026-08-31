import { api } from './api.js';
import { protectPage } from './auth.js';
import { escapeHtml, statusBadge, formatDate, toast, setButtonLoading } from './utils.js';

const qs = (s) => document.querySelector(s);
const id = new URLSearchParams(location.search).get('id');
let certificate;

function set(id, value) { const el = qs(`#${id}`); if (el) el.textContent = value ?? '—'; }
function verificationUrl(c) { return `${location.origin}/verify.html?id=${encodeURIComponent(c.certificateId)}`; }

function render(c) {
  certificate = c;
  qs('#certificate-card').hidden = false;
  set('cert-title', c.title);
  set('cert-subtitle', `${c.certificateId} • ${c.course?.name || 'Certificate'}`);
  qs('#cert-status').innerHTML = statusBadge(c.status);
  set('recipient-name', c.recipient?.name);
  set('recipient-email', c.recipient?.email);
  set('course-name', c.course?.name);
  set('credential-level', c.credentialLevel || c.course?.credentialLevel || '—');
  set('issue-date', formatDate(c.issueDate));
  set('expiry-date', c.expiryDate ? `Expires ${formatDate(c.expiryDate)}` : 'No expiry');
  set('version', `v${c.version || 1}`);
  set('verification-code', c.verificationCode || '—');
  set('certificate-id', c.certificateId);
  set('verification-code-detail', c.verificationCode);
  set('issuer', [c.issuerName, c.issuerTitle].filter(Boolean).join(' — ') || '—');
  set('grade', c.grade || '—');
  set('score', c.score == null ? '—' : `${c.score}%`);
  set('created-at', c.createdAt ? formatDate(c.createdAt) : '—');
  const url = verificationUrl(c);
  set('verification-url', url);
  qs('#verify-link').href = url;
  const hasPdf = Boolean(c.certificateFileUrl);
  qs('#pdf-link').href = hasPdf ? `/api/certificates/${encodeURIComponent(c.id)}/file` : '#';
  qs('#pdf-link').style.display = hasPdf ? '' : 'none';
  const revoked = c.status === 'REVOKED';
  qs('#revoke-btn').style.display = revoked ? 'none' : '';
  qs('#reissue-btn').style.display = revoked ? 'none' : '';
}

async function load() {
  if (!id) throw new Error('No certificate was selected.');
  render(await api.get(`/certificates/${encodeURIComponent(id)}`));
}

qs('#copy-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(verificationUrl(certificate)); toast('Verification link copied.'); }
  catch { toast('Could not copy the verification link.', 'error'); }
});

qs('#revoke-btn').addEventListener('click', () => qs('#revoke-dialog').showModal());
qs('#reissue-btn').addEventListener('click', () => { qs('#reissue-title').value = certificate.title || ''; qs('#reissue-dialog').showModal(); });

qs('#revoke-form').addEventListener('submit', async (event) => {
  if (event.submitter?.value !== 'submit') return;
  event.preventDefault();
  const button = qs('#revoke-confirm');
  setButtonLoading(button, true, 'Revoking…');
  try {
    await api.post(`/certificates/${encodeURIComponent(certificate.id)}/revoke`, { reason: qs('#revoke-reason').value.trim() });
    qs('#revoke-dialog').close();
    toast('Certificate revoked successfully.');
    await load();
  } catch (e) { toast(e.message, 'error'); }
  finally { setButtonLoading(button, false); }
});

qs('#reissue-form').addEventListener('submit', async (event) => {
  if (event.submitter?.value !== 'submit') return;
  event.preventDefault();
  const button = qs('#reissue-confirm');
  setButtonLoading(button, true, 'Reissuing…');
  try {
    const issued = await api.post(`/certificates/${encodeURIComponent(certificate.id)}/reissue`, { title: qs('#reissue-title').value.trim() || undefined });
    qs('#reissue-dialog').close();
    toast('New certificate version created.');
    location.href = `/certificate-details.html?id=${encodeURIComponent(issued.id)}`;
  } catch (e) { toast(e.message, 'error'); }
  finally { setButtonLoading(button, false); }
});

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await protectPage())) return;
  try { await load(); } catch (e) { qs('#page-error').textContent = escapeHtml(e.message); }
});
