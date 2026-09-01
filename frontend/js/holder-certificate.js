import { api } from './api.js';
import { escapeHtml, formatDate, statusBadge } from './utils.js';

const qs = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const id = params.get('id');

function date(value) {
  if (!value) return '—';
  try { return formatDate(new Date(value).toISOString()); } catch { return '—'; }
}

function renderHistory(certificate) {
  const history = qs('#history');
  const prior = certificate.prior;
  const renewals = Array.isArray(certificate.renewals) ? certificate.renewals : [];
  const entries = [
    ...(prior ? [{ label: 'Previous version', value: prior.certificateId }] : []),
    ...renewals.map((item) => ({ label: 'Renewed certificate', value: item.certificateId })),
  ];
  history.innerHTML = entries.length
    ? `<div class="section-title"><div><h2>Certificate history</h2><p>Related versions of this credential.</p></div></div><div class="history-list">${entries.map((item) => `<div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value || '—')}</strong></div>`).join('')}</div>`
    : '';
}

async function load() {
  if (!id) throw new Error('Certificate reference is missing.');
  const certificate = await api.get(`/holder/certificates/${encodeURIComponent(id)}`);
  const recipientName = certificate.recipient?.name || 'Certificate holder';
  const title = certificate.title || certificate.course?.name || 'Certificate';
  const publicFile = `/api/certificates/${encodeURIComponent(certificate.certificateId)}/public-file`;

  qs('#title').textContent = title;
  qs('#subtitle').textContent = `Issued to ${recipientName}`;
  qs('#recipient').textContent = recipientName;
  qs('#organization').textContent = certificate.organization?.name || '—';
  qs('#course').textContent = certificate.course?.name || '—';
  qs('#status').innerHTML = statusBadge(certificate.status);
  qs('#issue-date').textContent = date(certificate.issueDate);
  qs('#expiry-date').textContent = date(certificate.expiryDate);
  qs('#certificate-id').textContent = certificate.certificateId || '—';
  qs('#version').textContent = certificate.version ? `Version ${certificate.version}` : 'Original';
  qs('#preview').src = publicFile;
  qs('#download').href = `${publicFile}?download=1`;
  renderHistory(certificate);
}

document.addEventListener('DOMContentLoaded', async () => {
  try { await load(); }
  catch (error) { qs('#page-error').textContent = error.message || 'Unable to load certificate.'; }
});
