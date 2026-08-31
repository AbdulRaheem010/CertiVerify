import { api } from './api.js';
import { setButtonLoading, toast } from './utils.js';

const qs = (s) => document.querySelector(s);
const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
  qs('#invite-error').textContent = 'This invitation link is missing its invitation token.';
  qs('#accept-submit').disabled = true;
}

qs('#accept-invite-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = qs('#invite-password').value;
  const confirm = qs('#invite-confirm').value;
  if (password !== confirm) {
    toast('Passwords do not match.', 'error');
    return;
  }
  const button = qs('#accept-submit');
  setButtonLoading(button, true, 'Accepting…');
  qs('#invite-error').textContent = '';
  try {
    await api.post('/staff-invitations/accept', {
      token,
      name: qs('#invite-name').value.trim(),
      password
    });
    qs('#accept-invite-form').innerHTML = '<div class="success-text">Invitation accepted successfully. You can now sign in.</div><a class="button wide" href="/login.html">Go to sign in</a>';
  } catch (error) {
    qs('#invite-error').textContent = error.message || 'Unable to accept this invitation.';
    setButtonLoading(button, false);
  }
});
