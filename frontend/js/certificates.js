import { api } from './api.js';
import { protectPage } from './auth.js';
import { escapeHtml, statusBadge, formatDate } from './utils.js';

const rows = document.querySelector('#certificate-rows');
const search = document.querySelector('#certificate-search');
const status = document.querySelector('#certificate-status');

function render(items) {
  rows.innerHTML = items.length ? items.map(c => `<tr><td><b>${escapeHtml(c.certificateId)}</b><br><small>${escapeHtml(c.title || '')}</small></td><td><b>${escapeHtml(c.recipient?.name || '—')}</b><br><small>${escapeHtml(c.recipient?.email || '')}</small></td><td>${escapeHtml(c.course?.name || '—')}</td><td>${formatDate(c.issueDate)}</td><td>${statusBadge(c.status)}</td><td>${c.certificateFileUrl ? `<a href="${escapeHtml(c.certificateFileUrl)}" target="_blank" rel="noopener">PDF</a> ` : ''}<a href="/certificate-details.html?id=${encodeURIComponent(c.id)}">View</a></td></tr>`).join('') : '<tr><td colspan="6"><div class="empty-state">No certificates found.</div></td></tr>';
}

async function load() {
  rows.innerHTML = '<tr><td colspan="6"><div class="skeleton row-skeleton"></div></td></tr>';
  try {
    const q = encodeURIComponent(search.value.trim());
    const s = status.value ? `&status=${encodeURIComponent(status.value)}` : '';
    const data = await api.get(`/certificates?q=${q}${s}`);
    render(data.items || []);
  } catch (e) {
    rows.innerHTML = `<tr><td colspan="6">${escapeHtml(e.message)}</td></tr>`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await protectPage())) return;
  let timer;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 250); });
  status.addEventListener('change', load);
  load();
});
