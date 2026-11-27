const loadingDialog = document.getElementById('loading-dialog');
const masterContent = document.getElementById('master-content');
const masterError = document.getElementById('master-error');
const masterRows = document.getElementById('master-rows');
const recordForm = document.getElementById('record-form');
const recordDialog = document.getElementById('record-dialog');
const recordError = document.getElementById('record-form-error');
const toast = document.getElementById('app-toast');
let pendingRequests = 0;
let records = { documents: [], vehicles: [] };
let pendingDelete = null;
let draggedDocumentId = null;
let toastTimer;

async function api(path, options = {}) {
  pendingRequests++;
  if (pendingRequests === 1 && !loadingDialog.open) loadingDialog.showModal();
  try {
    const response = await fetch(`/api/${path}`, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    const data = await response.json().catch(() => null);
    if (!data || typeof data !== 'object') throw new Error('Server mengirim respons yang tidak valid.');
    if (!response.ok) throw new Error(data.error || 'Layanan tidak tersedia. Coba lagi.');
    return data;
  } finally {
    pendingRequests--;
    if (pendingRequests === 0 && loadingDialog.open) loadingDialog.close();
  }
}
function node(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) element.textContent = content;
  return element;
}
function safeHttpsUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; }
  catch { return ''; }
}
function showToast(message) {
  document.getElementById('app-toast-message').textContent = message;
  toast.hidden = false;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.remove('is-visible'); toast.hidden = true; }, 3000);
}
function renderTable() {
  const rows = [
    ...records.documents.map(item => ({ kind: 'documents', type: 'Dokumen', id: item.id, number: item.number, name: item.title, description: item.description, category: item.category, actionType: item.actionType, url: item.url, item })),
    ...records.vehicles.map(item => ({ kind: 'vehicles', type: 'Kendaraan', id: item.id, number: item.number, name: item.name, description: '', category: '', actionType: item.url ? 'link' : '', url: item.url, item }))
  ];
  masterRows.replaceChildren();
  document.getElementById('table-empty').hidden = rows.length > 0;
  rows.forEach((record, index) => {
    const row = document.createElement('tr');
    if (record.kind === 'documents') {
      row.dataset.documentId = record.id;
      row.draggable = true;
      row.classList.add('sortable-row');
      row.title = 'Tarik untuk mengubah posisi';
      row.addEventListener('dragstart', event => {
        draggedDocumentId = record.id;
        row.classList.add('is-dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', record.id);
      });
      row.addEventListener('dragend', () => {
        draggedDocumentId = null;
        row.classList.remove('is-dragging');
        masterRows.querySelectorAll('.drop-before').forEach(item => item.classList.remove('drop-before'));
      });
      row.addEventListener('dragover', event => {
        if (!draggedDocumentId || draggedDocumentId === record.id) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        masterRows.querySelectorAll('.drop-before').forEach(item => item.classList.remove('drop-before'));
        row.classList.add('drop-before');
      });
      row.addEventListener('drop', async event => {
        event.preventDefault();
        const movingId = event.dataTransfer.getData('text/plain') || draggedDocumentId;
        if (!movingId || movingId === record.id) return;
        const movingRow = masterRows.querySelector(`[data-document-id="${CSS.escape(movingId)}"]`);
        if (!movingRow) return;
        const bounds = row.getBoundingClientRect();
        const insertAfter = event.clientY > bounds.top + bounds.height / 2;
        masterRows.insertBefore(movingRow, insertAfter ? row.nextSibling : row);
        const ids = [...masterRows.querySelectorAll('[data-document-id]')].map(item => item.dataset.documentId);
        try {
          await api('documents/reorder', { method: 'POST', body: JSON.stringify({ ids }) });
          await loadMasterData();
          showToast('Urutan dokumen berhasil disimpan.');
        } catch (error) {
          await loadMasterData();
          masterError.textContent = error.message;
          masterError.hidden = false;
        }
      });
    }
    row.append(node('td', 'table-number', String(index + 1).padStart(2, '0')));
    row.append(node('td', '', record.type));
    const nameCell = node('td', 'table-name', record.name);
    if (record.description) nameCell.append(node('small', '', record.description));
    row.append(nameCell);
    row.append(node('td', '', record.kind === 'vehicles' ? (record.url ? 'Buka tautan' : '—') : record.actionType === 'vehicle_picker' ? 'Pilihan kendaraan' : 'Buka tautan'));
    const urlCell = document.createElement('td');
    if (safeHttpsUrl(record.url)) {
      const link = node('a', 'table-link', 'Buka ↗');
      link.href = safeHttpsUrl(record.url);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      urlCell.append(link);
    } else urlCell.textContent = '—';
    row.append(urlCell);
    const actions = node('td', 'table-actions');
    const editButton = node('button', 'edit-item', 'Edit');
    editButton.type = 'button';
    editButton.addEventListener('click', () => openEdit(record));
    const deleteButton = node('button', 'delete-item', 'Hapus');
    deleteButton.type = 'button';
    deleteButton.addEventListener('click', () => askDelete(record));
    actions.append(editButton, deleteButton);
    row.append(actions);
    masterRows.append(row);
  });
}
async function loadMasterData() {
  masterError.hidden = true;
  try {
    records = await api('master-data');
    records.documents ||= [];
    records.vehicles ||= [];
    renderTable();
  } catch (error) {
    masterError.textContent = error.message;
    masterError.hidden = false;
  }
}
function updateFormMode(clearUrl = false) {
  const kind = recordForm.elements.kind.value;
  const isVehicle = kind === 'vehicle';
  const isPicker = !isVehicle && recordForm.elements.actionType.value === 'vehicle_picker';
  document.getElementById('document-fields').hidden = isVehicle;
  document.getElementById('record-name-label').textContent = isVehicle ? 'Nama kendaraan' : 'Nama dokumen';
  document.getElementById('record-url-label').textContent = isVehicle ? 'URL dokumen kendaraan (opsional)' : 'URL HTTPS (opsional)';
  document.getElementById('record-url-field').hidden = isPicker;
  document.getElementById('document-options-field').hidden = isVehicle || !isPicker;
  if (isPicker && !document.getElementById('document-options').children.length) addDocumentOption();
  document.getElementById('record-action-hint').hidden = isVehicle;
  if (clearUrl) document.getElementById('record-url').value = '';
  document.getElementById('record-action-hint').textContent = isPicker ? 'Kartu akan membuka opsi pilihan kendaraan.' : 'Kartu akan membuka tautan dokumen.';
}
function addDocumentOption(option = {}) {
  const container = document.getElementById('document-options');
  const row = node('div', 'document-option-row');
  const title = document.createElement('input');
  title.type = 'text'; title.name = 'optionLabel'; title.maxLength = 120; title.placeholder = 'Teks pilihan'; title.value = option.label || ''; title.required = true;
  const url = document.createElement('input');
  url.type = 'url'; url.name = 'optionUrl'; url.maxLength = 2000; url.placeholder = 'https://...'; url.value = option.url || ''; url.required = true;
  const remove = node('button', 'option-remove', '×');
  remove.type = 'button'; remove.title = 'Hapus pilihan'; remove.setAttribute('aria-label', 'Hapus pilihan');
  remove.addEventListener('click', () => row.remove());
  row.append(title, url, remove);
  container.append(row);
}
function renderDocumentOptions(options = []) {
  document.getElementById('document-options').replaceChildren();
  options.forEach(option => addDocumentOption(option));
}
function openNew() {
  recordForm.reset();
  delete recordForm.dataset.editId;
  delete recordForm.dataset.category;
  recordForm.elements.kind.disabled = false;
  recordForm.elements.kind.value = 'document';
  recordForm.elements.actionType.value = 'link';
  renderDocumentOptions([]);
  document.getElementById('record-dialog-title').textContent = 'Tambah data.';
  recordForm.querySelector('button[type="submit"]').innerHTML = 'Simpan data <span>↗</span>';
  recordError.hidden = true;
  updateFormMode();
  recordDialog.showModal();
}
function openEdit(record) {
  recordForm.reset();
  recordForm.dataset.editId = record.id;
  recordForm.elements.kind.value = record.kind === 'vehicles' ? 'vehicle' : 'document';
  recordForm.elements.kind.disabled = true;
  recordForm.elements.name.value = record.kind === 'vehicles' ? record.item.name : record.item.title;
  document.getElementById('record-url').value = record.url || '';
  if (record.kind === 'vehicles') {
    delete recordForm.dataset.category;
  } else {
    recordForm.dataset.category = record.category || '';
    recordForm.elements.description.value = record.description || '';
    recordForm.elements.actionType.value = record.actionType;
    renderDocumentOptions(record.item.options || []);
  }
  document.getElementById('record-dialog-title').textContent = record.kind === 'vehicles' ? 'Edit kendaraan.' : 'Edit dokumen.';
  recordForm.querySelector('button[type="submit"]').innerHTML = 'Simpan perubahan <span>↗</span>';
  recordError.hidden = true;
  updateFormMode();
  recordDialog.showModal();
}
function askDelete(record) {
  pendingDelete = record;
  document.getElementById('delete-confirm-message').textContent = `Hapus ${record.type.toLowerCase()} “${record.name}”?`;
  document.getElementById('delete-confirm-dialog').showModal();
}

document.getElementById('add-record-button').addEventListener('click', openNew);
document.getElementById('add-document-option').addEventListener('click', () => addDocumentOption());
recordForm.elements.kind.addEventListener('change', () => updateFormMode(true));
recordForm.elements.actionType.addEventListener('change', () => updateFormMode(true));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target === dialog && dialog.id !== 'loading-dialog') dialog.close();
}));
document.getElementById('delete-cancel').addEventListener('click', () => document.getElementById('delete-confirm-dialog').close());
document.getElementById('delete-confirm').addEventListener('click', async () => {
  if (!pendingDelete) return;
  const record = pendingDelete;
  pendingDelete = null;
  document.getElementById('delete-confirm-dialog').close();
  try {
    await api(record.kind, { method: 'DELETE', body: JSON.stringify({ id: record.id }) });
    await loadMasterData();
    showToast(`${record.type} dihapus.`);
  } catch (error) { masterError.textContent = error.message; masterError.hidden = false; }
});

recordForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = recordForm.querySelector('button[type="submit"]');
  const isEdit = Boolean(recordForm.dataset.editId);
  const kind = recordForm.elements.kind.value;
  const url = recordForm.elements.url.value.trim();
  button.disabled = true;
  recordError.hidden = true;
  try {
    let path;
    let input;
    if (kind === 'vehicle') {
      path = 'vehicles';
      input = { name: recordForm.elements.name.value, url };
    } else {
      path = 'documents';
      const actionType = recordForm.elements.actionType.value;
      const options = actionType === 'vehicle_picker' ? [...recordForm.querySelectorAll('.document-option-row')].map(row => ({ label: row.querySelector('[name="optionLabel"]').value.trim(), url: row.querySelector('[name="optionUrl"]').value.trim() })) : [];
      input = { title: recordForm.elements.name.value, description: recordForm.elements.description.value, category: recordForm.dataset.category || '', actionType, url, options };
    }
    if (isEdit) input.id = recordForm.dataset.editId;
    await api(path, { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(input) });
    recordDialog.close();
    await loadMasterData();
    showToast(`${kind === 'vehicle' ? 'Kendaraan' : 'Dokumen'} ${isEdit ? 'diperbarui' : 'ditambahkan'}.`);
  } catch (error) {
    recordError.textContent = error.message;
    recordError.hidden = false;
  } finally { button.disabled = false; }
});

document.getElementById('master-logout').addEventListener('click', async () => {
  try { await api('logout', { method: 'POST', body: '{}' }); } finally { window.location.assign('/'); }
});

api('session').then(async ({ user }) => {
  if (!user?.canManageMenus) return window.location.replace('/');
  const usersLink = document.getElementById('master-users-link');
  if (usersLink) usersLink.hidden = user?.canManageUsers !== true;
  masterContent.hidden = false;
  await loadMasterData();
}).catch(() => window.location.replace('/'));
