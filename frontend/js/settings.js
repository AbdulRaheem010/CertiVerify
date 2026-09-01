import { api } from './api.js';
import { protectPage } from './auth.js';
import { escapeHtml, formatDate, toast, setButtonLoading } from './utils.js';

const qs = (s) => document.querySelector(s);
let state = { members: [], invitations: [] };

function roleLabel(role){ return String(role || '').replaceAll('_',' ').replace('ORGANIZATION ',''); }
function safeDate(value){
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : formatDate(date.toISOString());
}
function render(){
  const membersBody = qs('#members-body');
  const invitesBody = qs('#invitations-body');
  membersBody.innerHTML = state.members.length ? state.members.map(m=>`<tr><td><strong>${escapeHtml(m.user?.name || '—')}</strong><br><small>${escapeHtml(m.user?.email || '')}</small></td><td>${escapeHtml(roleLabel(m.role))}</td><td><span class="badge"><span></span> ${m.isActive?'Active':'Inactive'}</span></td><td>${safeDate(m.createdAt)}</td></tr>`).join('') : `<tr><td colspan="4" class="empty-state">No staff members yet.</td></tr>`;
  invitesBody.innerHTML = state.invitations.length ? state.invitations.map(i=>`<tr><td><strong>${escapeHtml(i.email)}</strong></td><td>${escapeHtml(roleLabel(i.role))}</td><td>${safeDate(i.expiresAt)}</td><td><button class="button secondary small revoke-invite" data-id="${escapeHtml(i.id)}">Revoke</button></td></tr>`).join('') : `<tr><td colspan="4" class="empty-state">No pending invitations.</td></tr>`;
}
async function load(){ state = await api.get('/staff'); render(); }

qs('#invite-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const button=qs('#invite-submit');
  const email = qs('#invite-email').value.trim().toLowerCase();
  const role = qs('#invite-role').value;
  setButtonLoading(button,true,'Sending…');
  try {
    const invitation = await api.post('/staff/invitations',{email,role});
    if (invitation?.id) {
      qs('#invite-form').reset();
      qs('#invite-dialog').close();
      state.invitations = [invitation, ...state.invitations.filter(i => i.id !== invitation.id)];
      render();
      toast('Invitation created.');
      return;
    }
    throw new Error('The invitation service returned an invalid response.');
  }
  catch(err){
    // A network interruption can happen after the backend has already committed the invitation.
    // Re-read the pending invitations so we do not show a false failure to the owner.
    try {
      const latest = await api.get('/staff');
      const existing = latest?.invitations?.find((item) => String(item.email).toLowerCase() === email && item.status === 'PENDING');
      if (existing) {
        state = latest;
        render();
        qs('#invite-form').reset();
        qs('#invite-dialog').close();
        toast('Invitation created.');
        return;
      }
    } catch { /* Keep the original error below. */ }
    toast(err.message || 'Unable to create invitation.','error');
  }
  finally{ setButtonLoading(button,false); }
});
qs('#open-invite').addEventListener('click',()=>qs('#invite-dialog').showModal());
qs('#invitations-body').addEventListener('click',async e=>{
  const button=e.target.closest('.revoke-invite'); if(!button)return;
  if(!confirm('Revoke this pending invitation?')) return;
  button.disabled=true;
  try{
    await api.post(`/staff/invitations/${encodeURIComponent(button.dataset.id)}/revoke`);
    state.invitations = state.invitations.filter(i => i.id !== button.dataset.id);
    render();
    toast('Invitation revoked.');
  }
  catch(err){toast(err.message || 'Unable to revoke invitation.','error');button.disabled=false;}
});

document.addEventListener('DOMContentLoaded',async()=>{if(!(await protectPage()))return;try{await load();}catch(err){qs('#page-error').textContent=err.message || 'Unable to load team data.';}});
