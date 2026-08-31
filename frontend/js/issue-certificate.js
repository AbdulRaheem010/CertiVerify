import { api } from './api.js';
import { protectPage } from './auth.js';

const form = document.querySelector('#issue-form');
const message = document.querySelector('#issue-message');
const submitButton = document.querySelector('#submit-button');
const result = document.querySelector('#issue-result');

function showError(text) {
  message.textContent = text || '';
}

function option(select, value, label) {
  const el = document.createElement('option');
  el.value = value;
  el.textContent = label;
  select.appendChild(el);
}

async function loadData() {
  const [recipients, courses, templates] = await Promise.all([
    api.get('/recipients'),
    api.get('/courses'),
    api.get('/templates')
  ]);

  const recipientSelect = document.querySelector('#recipientId');
  const courseSelect = document.querySelector('#courseId');
  const templateSelect = document.querySelector('#templateId');

  recipientSelect.innerHTML = '<option value="">Select recipient</option>';
  for (const item of recipients.items || []) option(recipientSelect, item.id, `${item.name} — ${item.email}`);

  courseSelect.innerHTML = '<option value="">Select course / programme</option>';
  for (const item of courses.items || []) option(courseSelect, item.id, `${item.name} (${item.code})`);

  templateSelect.innerHTML = '<option value="">Use default template</option>';
  for (const item of templates.items || []) option(templateSelect, item.id, `${item.name} — ${item.design}`);

  if (!recipients.items?.length) showError('Add a recipient first before issuing a certificate.');
  if (!courses.items?.length) showError('Create a course first before issuing a certificate.');
}

function payloadFromForm() {
  const data = Object.fromEntries(new FormData(form).entries());
  const payload = {
    recipientId: data.recipientId,
    courseId: data.courseId,
    title: data.title,
    issueDate: data.issueDate,
    skills: []
  };

  for (const key of ['templateId', 'expiryDate', 'grade', 'credentialLevel', 'issuerName', 'issuerTitle']) {
    if (data[key]) payload[key] = data[key];
  }
  if (data.score !== '') payload.score = Number(data.score);
  return payload;
}

document.addEventListener('DOMContentLoaded', async () => {
  const session = await protectPage();
  if (!session) return;

  document.querySelector('#issueDate').value = new Date().toISOString().slice(0, 10);

  try {
    await loadData();
  } catch (error) {
    showError(error.message || 'Unable to load recipients, courses, or templates.');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError('');
    result.hidden = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Issuing…';

    try {
      const payload = payloadFromForm();
      const idempotencyKey = crypto.randomUUID();
      const certificate = await api.post('/certificates', payload, idempotencyKey);

      document.querySelector('#result-title').textContent = certificate.title || 'Certificate created';
      document.querySelector('#result-meta').textContent = `Certificate ID: ${certificate.certificateId || certificate.id}`;
      const download = document.querySelector('#download-link');
      const verify = document.querySelector('#verify-link');

      if (certificate.certificateFileUrl) {
        download.href = certificate.certificateFileUrl;
        download.hidden = false;
      } else {
        download.hidden = true;
      }
      if (certificate.certificateId) {
        verify.href = `/verify.html?id=${encodeURIComponent(certificate.certificateId)}`;
        verify.hidden = false;
      } else {
        verify.hidden = true;
      }

      result.hidden = false;
      form.reset();
      document.querySelector('#issueDate').value = new Date().toISOString().slice(0, 10);
      await loadData();
    } catch (error) {
      showError(error.message || 'Unable to issue certificate.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Issue secure certificate';
    }
  });
});
