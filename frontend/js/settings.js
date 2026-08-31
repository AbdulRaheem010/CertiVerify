import { api } from './api.js';
import { protectPage } from './auth.js';
import { escapeHtml, formatDate, toast, setButtonLoading } from './utils.js';

const qs = (s) => document.querySelector(s);
let state = { members: [], invitations: [] };

function roleLabel(role){ return role.replaceAll('_',' ').replace('ORGANIZATION ',''); }
function render(){
  const membersBody = qs('#members-body');
  const invitesBody = qs('#invitations-body');
  membersBody.innerHTML = state.members.length ? state.members.map(m=>`<tr><td><strong>${escapeHtml(m.user?.name || '—')}</strong><br><small>${escapeHtml(m.user?.email || '')}</small></td><td>${escapeHtml(roleLabel(m.role))}</td><td><span class="badge"><span></span> ${m.isActive?'Active':'Inactive'}</span></td><td>${formatDate(m.createdAt)}</td></tr>`).join('') : `<tr><td colspan="4" class="empty-state">No staff members yet.</td></tr>`;
  invitesBody.innerHTML = state.invitations.length ? state.invitations.map(i=>`<tr><td><strong>${escapeHtml(i.email)}</strong></td><td>${escapeHtml(roleLabel(i.role))}</td><td>${formatDate(i.expiresAt)}</td><td><button class="button secondary small revoke-invite" data-id="${escapeHtml(i.id)}">Revoke</button></td></tr>`).join('') : `<tr><td colspan="4" class="empty-state">No pending invitations.</td></tr>`;
}
async function load(){ state = await api.get('/staff'); render(); }

qs('#invite-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const button=qs('#invite-submit'); setButtonLoading(button,true,'Sending…');
  try { await api.post('/staff/invitations',{email:qs('#invite-email').value.trim(),role:qs('#invite-role').value}); qs('#invite-form').reset(); qs('#invite-dialog').close(); toast('Invitation created.'); await load(); }
  catch(err){ toast(err.message,'error'); }
  finally{ setButtonLoading(button,false); }
});
qs('#open-invite').addEventListener('click',()=>qs('#invite-dialog').showModal());
qs('#invitations-body').addEventListener('click',async e=>{
  const button=e.target.closest('.revoke-invite'); if(!button)return;
  if(!confirm('Revoke this pending invitation?')) return;
  button.disabled=true;
  try{await api.post(`/staff/invitations/${encodeURIComponent(button.dataset.id)}/revoke`);toast('Invitation revoked.');await load();}
  catch(err){toast(err.message,'error');button.disabled=false;}
});

document.addEventListener('DOMContentLoaded',async()=>{if(!(await protectPage()))return;try{await load();}catch(err){qs('#page-error').textContent=err.message;}});
