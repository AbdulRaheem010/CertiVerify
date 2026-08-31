import { api } from './api.js';
import { protectPage } from './auth.js';
import { escapeHtml, toast } from './utils.js';

const rows = document.querySelector('#course-rows');
const dialog = document.querySelector('#course-dialog');
const form = document.querySelector('#course-form');
const title = document.querySelector('#course-dialog-title');
const count = document.querySelector('#course-count');
const errorBox = document.querySelector('#course-error');

let courses = [];

function render(items) {
  courses = items;
  count.textContent = `${items.length} course${items.length === 1 ? '' : 's'}`;
  rows.innerHTML = items.length ? items.map(c => `
    <tr>
      <td><b>${escapeHtml(c.name)}</b><br><small>${escapeHtml(c.code)}</small></td>
      <td>${escapeHtml(c.credentialLevel || '—')}</td>
      <td>${escapeHtml(c.certificateType || '—')}</td>
      <td>${Array.isArray(c.skills) && c.skills.length ? escapeHtml(c.skills.join(', ')) : '—'}</td>
      <td><button class="text-button" data-edit="${escapeHtml(c.id)}">Edit</button></td>
    </tr>`).join('') : '<tr><td colspan="5"><div class="empty-state">No courses yet. Add your first course.</div></td></tr>';
}

async function load() {
  errorBox.textContent = '';
  rows.innerHTML = '<tr><td colspan="5"><div class="skeleton row-skeleton"></div></td></tr>';
  try {
    const data = await api.get('/courses');
    render(data.items || []);
  } catch (e) {
    errorBox.textContent = e.message || 'Unable to load courses.';
    rows.innerHTML = '<tr><td colspan="5"><div class="empty-state">Unable to load courses.</div></td></tr>';
  }
}

function openCreate() {
  form.reset();
  form.elements.id.value = '';
  title.textContent = 'Add course';
  dialog.showModal();
}

function openEdit(course) {
  form.elements.id.value = course.id || '';
  form.elements.name.value = course.name || '';
  form.elements.code.value = course.code || '';
  form.elements.description.value = course.description || '';
  form.elements.duration.value = course.duration || '';
  form.elements.credentialLevel.value = course.credentialLevel || '';
  form.elements.certificateType.value = course.certificateType || '';
  form.elements.skills.value = Array.isArray(course.skills) ? course.skills.join(', ') : '';
  title.textContent = 'Edit course';
  dialog.showModal();
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await protectPage())) return;

  document.querySelector('#new-course').addEventListener('click', openCreate);
  document.querySelector('#course-cancel').addEventListener('click', () => dialog.close());
  rows.addEventListener('click', event => {
    const button = event.target.closest('[data-edit]');
    if (!button) return;
    const course = courses.find(item => String(item.id) === String(button.dataset.edit));
    if (course) openEdit(course);
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const f = new FormData(form);
    const id = f.get('id');
    const skills = (f.get('skills') || '').split(',').map(x => x.trim()).filter(Boolean);
    const payload = {
      name: f.get('name'),
      code: f.get('code'),
      description: f.get('description') || undefined,
      duration: f.get('duration') || undefined,
      credentialLevel: f.get('credentialLevel') || undefined,
      certificateType: f.get('certificateType') || undefined,
      skills
    };

    const save = document.querySelector('#course-save');
    save.disabled = true;
    try {
      if (id) {
        await api.patch(`/courses/${encodeURIComponent(id)}`, payload);
        toast('Course updated.');
      } else {
        await api.post('/courses', payload);
        toast('Course created.');
      }
      dialog.close();
      await load();
    } catch (err) {
      toast(err.message || 'Unable to save course.', 'error');
    } finally {
      save.disabled = false;
    }
  });

  await load();
});
