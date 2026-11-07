let config, baseUrl, headers;
let editingId = null;

const form = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const descInput = document.getElementById('task-description');
const submitBtn = document.getElementById('task-submit');
const list = document.getElementById('task-list');
const statusEl = document.getElementById('status-message');

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = isError ? 'error' : '';
}

async function api(path, options = {}) {
  const res = await fetch(`${baseUrl}/${config.tableName}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function loadTasks() {
  try {
    const tasks = await api('?select=*&order=id.asc');
    render(tasks);
    setStatus(tasks.length ? '' : 'No tasks yet. Add one above.');
  } catch (e) {
    setStatus('Could not load tasks: ' + e.message, true);
  }
}

function render(tasks) {
  list.innerHTML = '';
  tasks.forEach(t => {
    const item = document.createElement('div');
    item.className = 'task-item' + (t.completed ? ' done' : '');
    item.dataset.id = t.id;

    const title = document.createElement('p');
    title.className = 'task-title';
    title.textContent = t.title;

    const desc = document.createElement('p');
    desc.className = 'task-description';
    desc.textContent = t.description || '';

    const status = document.createElement('p');
    status.className = 'task-status';
    status.textContent = t.completed ? 'Completed' : 'Not completed';

    const toggle = document.createElement('button');
    toggle.className = 'toggle-task';
    toggle.textContent = t.completed ? 'Mark incomplete' : 'Mark complete';
    toggle.addEventListener('click', () => toggleTask(t));

    const edit = document.createElement('button');
    edit.className = 'edit-task';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => startEdit(t));

    const del = document.createElement('button');
    del.className = 'delete-task';
    del.textContent = 'Delete';
    del.addEventListener('click', () => deleteTask(t.id));

    item.append(title, desc, status, toggle, edit, del);
    list.appendChild(item);
  });
}

function startEdit(t) {
  editingId = t.id;
  titleInput.value = t.title;
  descInput.value = t.description || '';
  submitBtn.textContent = 'Save changes';
  titleInput.focus();
}

function resetForm() {
  editingId = null;
  form.reset();
  submitBtn.textContent = 'Add task';
}

async function toggleTask(t) {
  try {
    await api(`?id=eq.${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !t.completed })
    });
    setStatus('Task updated.');
    loadTasks();
  } catch (e) {
    setStatus('Could not update task: ' + e.message, true);
  }
}

async function deleteTask(id) {
  try {
    await api(`?id=eq.${id}`, { method: 'DELETE' });
    if (editingId === id) resetForm();
    setStatus('Task deleted.');
    loadTasks();
  } catch (e) {
    setStatus('Could not delete task: ' + e.message, true);
  }
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const body = { title: titleInput.value.trim(), description: descInput.value.trim() };
  if (!body.title) { setStatus('Title is required.', true); return; }
  try {
    if (editingId === null) {
      await api('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(body)
      });
      setStatus('Task added.');
    } else {
      await api(`?id=eq.${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      setStatus('Task saved.');
    }
    resetForm();
    loadTasks();
  } catch (e) {
    setStatus('Could not save task: ' + e.message, true);
  }
});

async function init() {
  try {
    const res = await fetch('config.json');
    config = await res.json();
    baseUrl = `${config.supabaseUrl}/rest/v1`;
    headers = {
      apikey: config.supabasePublishableKey,
      Authorization: `Bearer ${config.supabasePublishableKey}`
    };
    loadTasks();
  } catch (e) {
    setStatus('Could not load configuration: ' + e.message, true);
  }
}

init();
