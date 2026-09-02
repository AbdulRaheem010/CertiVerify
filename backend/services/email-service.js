import { env } from '../config/env.js';

async function sendWithResend({ to, subject, text, html }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'CertiVerify <onboarding@resend.dev>',
      to: [to],
      subject,
      text,
      html: html || `<p>${text.replaceAll('\n', '<br>')}</p>`,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error?.message || `Email provider returned ${response.status}.`);
  }
  return { delivered: true, mode: 'resend', id: payload?.id || null };
}

export async function sendEmail({ to, subject, text, html }) {
  if (process.env.RESEND_API_KEY) {
    return sendWithResend({ to, subject, text, html });
  }

  if (!env.isProduction) {
    console.info('[CertiVerify development email]', { to, subject, text });
    return { delivered: false, mode: 'development-log' };
  }

  console.error('[CertiVerify email]', 'RESEND_API_KEY is not configured.');
  return { delivered: false, mode: 'not-configured' };
}

export const sendStaffInvitationEmail = ({ email, organizationName, role, url }) => sendEmail({
  to: email,
  subject: `Join ${organizationName} on CertiVerify`,
  text: `You have been invited as ${role === 'ORGANIZATION_ADMIN' ? 'Organization Admin' : 'Organization Staff'} on CertiVerify.\n\nAccept your invitation: ${url}\n\nThis invitation expires in 7 days and can only be used once.`,
  html: `<p>You have been invited as <strong>${role === 'ORGANIZATION_ADMIN' ? 'Organization Admin' : 'Organization Staff'}</strong> on CertiVerify.</p><p><a href="${url}">Accept invitation</a></p><p>This invitation expires in 7 days and can only be used once.</p>`,
});

export const sendCertificateIssuedEmail = ({ email, title, certificateId, url }) => sendEmail({
  to: email,
  subject: 'Your Certificate Has Been Issued',
  text: `${title} (${certificateId}) is ready. Verify it: ${url}`,
});
