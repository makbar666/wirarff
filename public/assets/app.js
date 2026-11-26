const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginScreen = document.getElementById('login-screen') || loginForm?.closest('.login-layout');
const portalApp = document.getElementById('portal-app');
const documentList = document.getElementById('document-list');
const vehicleList = document.getElementById('vehicle-list');
const masterError = document.getElementById('master-error');
const searchInput = document.getElementById('document-search');
const clearSearchButton = document.getElementById('clear-search');
const loadingDialog = document.getElementById('loading-dialog');
const toast = document.getElementById('app-toast');
let allDocuments = [];
let pendingRequests = 0;
let resolveDeleteConfirmation = null;
let toastTimer;

function showPortal(user) {
  const userName = user?.name ?? user?.display_name ?? user?.displayName;
  if (typeof userName !== 'string' || !userName.trim()) throw new Error('Respons sesi tidak memuat nama akun. Muat ulang halaman atau hubungi pengelola.');
  if (loginScreen) loginScreen.hidden = true;
  if (portalApp) portalApp.hidden = false;
  document.body.className = 'app';
  document.title = `Dashboard — ${userName} — PKP-PK Weda Bay`;
}
function showLogin() {
  if (portalApp) portalApp.hidden = true;
  if (loginScreen) loginScreen.hidden = false;
  document.body.className = 'login-body';
}
function showToast(message) {
  document.getElementById('app-toast-message').textContent = message;
  toast.hidden = false;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.hidden = true;
  }, 3000);
}
async function api(path, options = {}) {
  pendingRequests++;
  if (pendingRequests === 1 && loadingDialog && !loadingDialog.open) loadingDialog.showModal();
  try {
    const response = await fetch(`/api/${path}`, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    const data = await response.json().catch(() => null);
    if (!data || typeof data !== 'object') throw new Error('Server mengirim respons yang tidak valid. Pastikan backend API sudah terpasang.');
    if (!response.ok) throw new Error(data.error || 'Layanan tidak tersedia. Coba lagi.');
    return data;
  } finally {
    pendingRequests--;
    if (pendingRequests === 0 && loadingDialog?.open) loadingDialog.close();
  }
}

function node(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) element.textContent = content;
  return element;
}
function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch { return ''; }
}
async function deleteItem(kind, item) {
  const typeLabel = kind === 'documents' ? 'dokumen' : 'kendaraan';
  if (!await confirmDelete(`Hapus ${typeLabel} “${item.title || item.name}”?`)) return;
  try {
    await api(kind, { method: 'DELETE', body: JSON.stringify({ id: item.id }) });
    await loadMasterData();
    showToast(`${typeLabel === 'dokumen' ? 'Dokumen' : 'Kendaraan'} dihapus.`);
  } catch (error) {
    masterError.textContent = error.message;
    masterError.hidden = false;
  }
}
function confirmDelete(message) {
  const dialog = document.getElementById('delete-confirm-dialog');
  document.getElementById('delete-confirm-message').textContent = message;
  return new Promise(resolve => {
    resolveDeleteConfirmation = resolve;
    dialog.showModal();
  });
}
function renderDocuments(documents) {
  documentList.replaceChildren();
  const query = searchInput.value.trim().toLowerCase();
  const filtered = query ? documents.filter(item => `${item.title} ${item.description} ${item.category || ''}`.toLowerCase().includes(query)) : documents;
  document.getElementById('document-count').textContent = query
    ? `${filtered.length} DARI ${documents.length} MENU`
    : `${documents.length} MENU TERSEDIA`;
  for (const item of filtered) {
    const card = node('article', 'card');
    const top = node('div', 'card-top');
    top.append(node('span', 'card-number', `${String(item.number).padStart(2, '0')}${item.category ? ` / ${item.category}` : ''}`));
    top.append(node('span', 'card-icon', item.icon || '▤'));
    const removeButton = node('button', 'delete-item', 'Hapus');
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', `Hapus ${item.title}`);
    removeButton.addEventListener('click', () => deleteItem('documents', item));
    const editButton = node('button', 'edit-item', 'Edit');
    editButton.type = 'button';
    editButton.setAttribute('aria-label', `Edit ${item.title}`);
    editButton.addEventListener('click', () => editDocument(item));
    top.append(editButton, removeButton);
    card.append(top, node('h3', '', item.title), node('p', '', item.description || ''));
    const bottom = node('div', 'card-bottom');
    if (item.actionType === 'vehicle_picker') {
      const button = node('button', 'card-action', 'Pilih kendaraan →');
      button.type = 'button';
      button.dataset.openVehicles = 'true';
      bottom.append(button);
    } else if (safeHttpsUrl(item.url)) {
      const link = node('a', 'card-action', 'Buka dokumen ↗');
      link.href = safeHttpsUrl(item.url);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      bottom.append(link);
    } else {
      const unavailable = node('span', 'unavailable', 'Tautan belum tersedia');
      bottom.append(unavailable);
    }
    card.append(bottom);
    documentList.append(card);
  }
  if (query && !filtered.length) documentList.append(node('p', 'search-empty', 'Dokumen tidak ditemukan.'));
  const addCard = node('article', 'card add-card');
  const addTop = node('div', 'card-top');
  addTop.append(node('span', 'card-number', 'MASTER DATA'));
  addTop.append(node('span', 'card-icon add-card-icon', '+'));
  addCard.append(addTop, node('h3', '', 'Tambah dokumen'), node('p', '', 'Tambahkan tautan dokumen atau pilihan kendaraan.'));
  const addBottom = node('div', 'card-bottom');
  const addButton = node('button', 'card-action', 'Tambah dokumen →');
  addButton.type = 'button';
  addButton.addEventListener('click', prepareNewDocument);
  addBottom.append(addButton);
  addCard.append(addBottom);
  documentList.append(addCard);
}
function renderVehicles(vehicles) {
  vehicleList.replaceChildren();
  if (!vehicles.length) {
    vehicleList.append(node('p', 'vehicle-status', 'Belum ada kendaraan. Tambahkan kendaraan terlebih dahulu.'));
    return;
  }
  vehicles.forEach((vehicle, index) => {
    const row = node('div', 'vehicle');
    row.append(node('span', 'vehicle-number', String(index + 1).padStart(2, '0')));
    row.append(node('strong', '', vehicle.name));
    if (safeHttpsUrl(vehicle.url)) {
      const link = node('a', '', 'Buka ↗');
      link.href = safeHttpsUrl(vehicle.url);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      row.append(link);
    } else row.append(node('span', 'vehicle-status', 'Belum tersedia'));
    const editButton = node('button', 'edit-item vehicle-edit', 'Edit');
    editButton.type = 'button';
    editButton.setAttribute('aria-label', `Edit ${vehicle.name}`);
    editButton.addEventListener('click', () => editVehicle(vehicle));
    row.append(editButton);
    const removeButton = node('button', 'delete-item vehicle-delete', 'Hapus');
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', `Hapus ${vehicle.name}`);
    removeButton.addEventListener('click', () => deleteItem('vehicles', vehicle));
    row.append(removeButton);
    vehicleList.append(row);
  });
}
async function loadMasterData() {
  masterError.hidden = true;
  try {
    const data = await api('master-data');
    allDocuments = data.documents || [];
    renderDocuments(allDocuments);
    renderVehicles(data.vehicles || []);
  } catch (error) {
    masterError.textContent = error.message;
    masterError.hidden = false;
  }
}
function openDialog(id) { document.getElementById(id)?.showModal(); }
function closeDialog(id) { document.getElementById(id)?.close(); }
function updateDocumentAction(clearUrl = false) {
  const choosingVehicle = document.getElementById('document-action').value === 'vehicle_picker';
  document.getElementById('document-url-field').hidden = choosingVehicle;
  if (clearUrl) document.getElementById('document-url').value = '';
  document.getElementById('document-action-hint').textContent = choosingVehicle
    ? 'Kartu akan membuka pilihan kendaraan.'
    : 'Kartu akan membuka tautan dokumen.';
}
function prepareNewDocument() {
  const form = document.getElementById('document-form');
  delete form.dataset.editId;
  form.dataset.category = '';
  form.reset();
  document.getElementById('document-form-title').textContent = 'Tambah dokumen.';
  form.querySelector('button[type="submit"]').innerHTML = 'Simpan dokumen <span>↗</span>';
  updateDocumentAction();
  openDialog('document-form-dialog');
}
function editDocument(item) {
  const form = document.getElementById('document-form');
  form.dataset.editId = item.id;
  form.dataset.category = item.category || '';
  form.elements.title.value = item.title;
  form.elements.description.value = item.description || '';
  form.elements.actionType.value = item.actionType;
  form.elements.url.value = item.url || '';
  document.getElementById('document-form-title').textContent = 'Edit dokumen.';
  form.querySelector('button[type="submit"]').innerHTML = 'Simpan perubahan <span>↗</span>';
  updateDocumentAction();
  openDialog('document-form-dialog');
}
function prepareNewVehicle() {
  const form = document.getElementById('vehicle-form');
  delete form.dataset.editId;
  form.reset();
  document.getElementById('vehicle-form-title').textContent = 'Tambah kendaraan.';
  form.querySelector('button[type="submit"]').innerHTML = 'Simpan kendaraan <span>↗</span>';
  openDialog('vehicle-form-dialog');
}
function editVehicle(vehicle) {
  const form = document.getElementById('vehicle-form');
  form.dataset.editId = vehicle.id;
  form.elements.name.value = vehicle.name;
  form.elements.url.value = vehicle.url || '';
  document.getElementById('vehicle-form-title').textContent = 'Edit kendaraan.';
  form.querySelector('button[type="submit"]').innerHTML = 'Simpan perubahan <span>↗</span>';
  openDialog('vehicle-form-dialog');
}

loginForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  loginError.hidden = true;
  try {
    const input = Object.fromEntries(new FormData(loginForm));
    const { user } = await api('login', { method: 'POST', body: JSON.stringify(input) });
    showPortal(user);
    await loadMasterData();
  } catch (error) {
    loginError.textContent = error.message;
    loginError.hidden = false;
  } finally { button.disabled = false; }
});

document.getElementById('logout-button')?.addEventListener('click', async () => {
  try { await api('logout', { method: 'POST', body: '{}' }); } finally { showLogin(); }
});
documentList?.addEventListener('click', event => {
  if (event.target.closest('[data-open-vehicles]')) openDialog('maintenance-dialog');
});
document.getElementById('add-vehicle-button')?.addEventListener('click', prepareNewVehicle);
document.getElementById('delete-confirm')?.addEventListener('click', () => document.getElementById('delete-confirm-dialog').close('confirm'));
document.getElementById('delete-cancel')?.addEventListener('click', () => document.getElementById('delete-confirm-dialog').close('cancel'));
document.getElementById('delete-confirm-dialog')?.addEventListener('close', event => {
  resolveDeleteConfirmation?.(event.currentTarget.returnValue === 'confirm');
  resolveDeleteConfirmation = null;
});
searchInput?.addEventListener('input', () => {
  clearSearchButton.hidden = !searchInput.value;
  renderDocuments(allDocuments);
});
clearSearchButton?.addEventListener('click', () => {
  searchInput.value = '';
  clearSearchButton.hidden = true;
  renderDocuments(allDocuments);
  searchInput.focus();
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(button.dataset.close)));
document.getElementById('document-action')?.addEventListener('change', () => updateDocumentAction(true));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
}));

document.getElementById('document-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const error = document.getElementById('document-form-error');
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  error.hidden = true;
  try {
    const editId = form.dataset.editId;
    const input = Object.fromEntries(new FormData(form));
    input.category = form.dataset.category || '';
    if (editId) input.id = editId;
    await api('documents', { method: editId ? 'PUT' : 'POST', body: JSON.stringify(input) });
    form.reset();
    delete form.dataset.editId;
    delete form.dataset.category;
    closeDialog('document-form-dialog');
    await loadMasterData();
    showToast(editId ? 'Dokumen diperbarui.' : 'Dokumen ditambahkan.');
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
  } finally { button.disabled = false; }
});

document.getElementById('vehicle-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const error = document.getElementById('vehicle-form-error');
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  error.hidden = true;
  try {
    const editId = form.dataset.editId;
    const input = Object.fromEntries(new FormData(form));
    if (editId) input.id = editId;
    await api('vehicles', { method: editId ? 'PUT' : 'POST', body: JSON.stringify(input) });
    form.reset();
    delete form.dataset.editId;
    closeDialog('vehicle-form-dialog');
    await loadMasterData();
    showToast(editId ? 'Kendaraan diperbarui.' : 'Kendaraan ditambahkan.');
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
  } finally { button.disabled = false; }
});

api('session').then(async ({ user }) => { showPortal(user); await loadMasterData(); }).catch(() => showLogin());
