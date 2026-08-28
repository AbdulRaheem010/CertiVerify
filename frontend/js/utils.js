export const escapeHtml=(s='')=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
export function statusBadge(status){return `<span class="badge badge-${String(status).toLowerCase()}"><span></span>${escapeHtml(status)}</span>`;}
export function toast(message,type='success'){const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),3600);}
export function setButtonLoading(button,loading,label='Saving…'){button.disabled=loading;button.dataset.original??=button.textContent;button.textContent=loading?label:button.dataset.original;}
export function formatDate(date){return new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric'}).format(new Date(date));}
