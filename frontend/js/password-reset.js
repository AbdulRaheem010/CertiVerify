import { api } from './api.js';

const message = (text, isError = false) => {
  const target = document.querySelector('#reset-message');
  if (!target) return;
  target.textContent = text;
  target.classList.toggle('error-text', isError);
};

document.querySelector('#forgot-password-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Sending…';
  message('');
  try {
    const result = await api.post('/auth/forgot-password', { email: new FormData(form).get('email') });
    message(result.message || 'If an account exists for that email, a reset link will be sent shortly.');
    form.querySelector('input[name="email"]').value = '';
  } catch (error) {
    message(error.message || 'Unable to request a reset link. Please try again.', true);
  } finally {
    button.disabled = false;
    button.textContent = 'Send reset link';
  }
});

document.querySelector('#reset-password-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  if (values.password !== values.confirmPassword) {
    message('The passwords do not match.', true);
    return;
  }
  const token = new URLSearchParams(location.search).get('token');
  if (!token) {
    message('This reset link is missing its token. Request a new password-reset email.', true);
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Updating…';
  message('');
  try {
    const result = await api.post('/auth/reset-password', { token, password: values.password });
    message(result.message || 'Password updated. Redirecting to sign in…');
    form.reset();
    setTimeout(() => { location.href = '/login.html'; }, 1400);
  } catch (error) {
    message(error.message || 'Unable to reset your password. Request a new link.', true);
  } finally {
    button.disabled = false;
    button.textContent = 'Update password';
  }
});
