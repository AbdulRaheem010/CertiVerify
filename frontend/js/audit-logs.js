import { api } from './api.js';
import { protectPage } from './auth.js';
import { escapeHtml, formatDate } from './utils.js';
const rows=document.querySelector('#audit-rows');
document.addEventListener('DOMContentLoaded',async()=>{if(!(await protectPage()))return;try{const d=await api.get('/audit-logs');rows.innerHTML=(d.items||[]).map(x=>`<tr><td>${formatDate(x.createdAt)}</td><td><b>${escapeHtml(x.action)}</b></td><td>${escapeHtml(x.resourceType||'—')}</td><td>${escapeHtml(x.resourceId||'—')}</td><td>${escapeHtml(x.actorId||'—')}</td></tr>`).join('')||'<tr><td colspan="5"><div class="empty-state">No audit events yet.</div></td></tr>';}catch(e){rows.innerHTML=`<tr><td colspan="5">${escapeHtml(e.message)}</td></tr>`;}});
