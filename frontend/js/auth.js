import { api } from './api.js';
import { toast, setButtonLoading } from './utils.js';

export async function protectPage() {
  try {
    return await api.get('/me');
  } catch {
    return null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('[data-logout]')?.addEventListener('click', async () => {
    await api.post('/auth/logout', {});
    location.href = '/';
  });

  document.querySelector('#login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.submitter;
    setButtonLoading(button, true, 'Signing in…');
    try {
      await api.post('/auth/login', Object.fromEntries(new FormData(e.target)));
      location.href = '/dashboard.html';
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setButtonLoading(button, false);
    }
  });

  document.querySelector('#register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));

    if (data.password !== data.confirmPassword) {
      return toast('Passwords do not match.', 'error');
    }

    // confirmPassword is a frontend-only field. The backend registration
    // schema is intentionally strict and must not receive unknown fields.
    delete data.confirmPassword;

    const button = e.submitter;
    setButtonLoading(button, true, 'Creating workspace…');
    try {
      await api.post('/auth/register', data);
      location.href = '/dashboard.html';
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setButtonLoading(button, false);
    }
  });
});
