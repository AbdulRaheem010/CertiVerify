import {api} from './api.js';
import {escapeHtml,statusBadge,formatDate} from './utils.js';

function publicFileUrl(certificateId){
  return `/api/certificates/${encodeURIComponent(certificateId)}/public-file`;
}

async function verify(id){
  const result=document.querySelector('#verification-result');
  result.innerHTML='<div class="skeleton certificate-skeleton"></div>';
  result.hidden=false;
  try{
    const c=await api.get(`/verify/${encodeURIComponent(id)}`);
    document.title=`${c.title} — Verified by CertiVerify`;
    const fileUrl=publicFileUrl(c.certificateId);
    const valid=c.status==='VALID';
    result.innerHTML=`
      <div class="verification-banner ${c.status.toLowerCase()}" role="status">
        <strong>${valid?'✓ VERIFIED CREDENTIAL':`CREDENTIAL ${escapeHtml(c.status)}`}</strong>
        <span>Verified on CertiVerify</span>
      </div>
      <article class="certificate-result">
        <span class="verification-seal">AUTHENTIC CERTIFICATE</span>
        <div class="org-mark">${escapeHtml(c.organizationName.slice(0,2))}</div>
        <p class="eyebrow">${escapeHtml(c.organizationName)}</p>
        <h1>${escapeHtml(c.title)}</h1>
        <p class="completion">This credential is awarded to</p>
        <h2>${escapeHtml(c.recipientName)}</h2>
        <p class="completion">for successfully completing</p>
        <h3>${escapeHtml(c.courseName)}</h3>
        <div class="certificate-meta">
          <div><small>Certificate ID</small><b>${escapeHtml(c.certificateId)}</b></div>
          <div><small>Issue date</small><b>${formatDate(c.issueDate)}</b></div>
          <div><small>Status</small>${statusBadge(c.status)}</div>
          ${c.expiryDate?`<div><small>Expiry date</small><b>${formatDate(c.expiryDate)}</b></div>`:''}
        </div>
        ${c.status==='REVOKED'?`<p class="revocation">Revoked ${formatDate(c.revokedAt)}. ${escapeHtml(c.revokedReason||'')}</p>`:''}
        ${valid?`
          <section class="public-certificate-card" aria-label="Certificate preview">
            <div class="public-certificate-preview">
              <iframe title="Certificate preview" src="${fileUrl}#toolbar=0&navpanes=0&scrollbar=0"></iframe>
              <div class="public-certificate-preview-caption"><span>Secure public certificate preview</span><span>PDF • CertiVerify verified</span></div>
            </div>
            <div class="public-certificate-actions">
              <a class="button" href="${fileUrl}" target="_blank" rel="noopener">View Certificate</a>
              <a class="button secondary" href="${fileUrl}?download=1">Download Certificate</a>
            </div>
            <p class="public-certificate-note">The certificate file is served through the public verification endpoint and is available only while the credential remains valid.</p>
          </section>`:''}
        <div class="verify-actions">
          <button class="button secondary" id="copy-verification-link" type="button">Copy verification link</button>
          <a class="button secondary" href="mailto:?subject=Verified credential&body=${encodeURIComponent(location.href)}">Share credential</a>
        </div>
      </article>`;
    document.querySelector('#copy-verification-link')?.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(location.href);const b=document.querySelector('#copy-verification-link');b.textContent='Copied ✓';setTimeout(()=>{b.textContent='Copy verification link'},1800)}catch{window.prompt('Copy verification link:',location.href)}
    });
  }catch(error){
    result.innerHTML=`<div class="not-found"><div class="not-found-icon">!</div><h2>Credential not found</h2><p>${escapeHtml(error.message)}</p><p>Check the certificate ID and try again.</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  const form=document.querySelector('#verify-form'),input=document.querySelector('#certificate-id'),id=new URLSearchParams(location.search).get('id');
  form?.addEventListener('submit',e=>{e.preventDefault();const value=input.value.trim().toUpperCase();if(!value)return;history.replaceState({},'',`?id=${encodeURIComponent(value)}`);verify(value)});
  if(id){input.value=id;verify(id)}
});
