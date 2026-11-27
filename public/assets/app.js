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
let allDocuments = [];
let allVehicles = [];
let pendingRequests = 0;

function showPortal(user) {
  const name = user?.name ?? user?.display_name ?? user?.displayName;
  if (typeof name !== 'string' || !name.trim()) throw new Error('Respons sesi tidak memuat nama akun.');
  if (loginScreen) loginScreen.hidden = true;
  if (portalApp) portalApp.hidden = false;
  const menuLink = document.getElementById('master-menu-link');
  const usersLink = document.getElementById('master-users-link');
  if (menuLink) menuLink.hidden = user?.canManageMenus !== true;
  if (usersLink) usersLink.hidden = user?.canManageUsers !== true;
  document.body.className = 'app';
  document.title = `Dashboard — ${name} — PKP-PK Weda Bay`;
}
function showLogin() {
  if (portalApp) portalApp.hidden = true;
  if (loginScreen) loginScreen.hidden = false;
  document.body.className = 'login-body';
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
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; }
  catch { return ''; }
}
function renderDocuments(documents) {
  if (!documentList) return;
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
    card.append(top, node('h3', '', item.title), node('p', '', item.description || ''));
    const bottom = node('div', 'card-bottom');
    if (item.actionType === 'vehicle_picker') {
      const button = node('button', 'card-action', 'Pilih kendaraan →');
      button.type = 'button';
      button.dataset.openVehicles = 'true';
      button.dataset.vehicleIds = JSON.stringify(item.optionVehicleIds || []);
      bottom.append(button);
    } else if (safeHttpsUrl(item.url)) {
      const link = node('a', 'card-action', 'Buka dokumen ↗');
      link.href = safeHttpsUrl(item.url);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      bottom.append(link);
    } else bottom.append(node('span', 'unavailable', 'Tautan belum tersedia'));
    card.append(bottom);
    documentList.append(card);
  }
  if (query && !filtered.length) documentList.append(node('p', 'search-empty', 'Dokumen tidak ditemukan.'));
}
function renderVehicles(vehicles, optionIds = []) {
  if (!vehicleList) return;
  vehicleList.replaceChildren();
  if (optionIds.length) vehicles = vehicles.filter(vehicle => optionIds.includes(vehicle.id));
  if (!vehicles.length) {
    vehicleList.append(node('p', 'vehicle-status', 'Belum ada kendaraan.'));
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
    vehicleList.append(row);
  });
}
async function loadMasterData() {
  masterError.hidden = true;
  try {
    const data = await api('master-data');
    allDocuments = data.documents || [];
    allVehicles = data.vehicles || [];
    renderDocuments(allDocuments);
  } catch (error) {
    masterError.textContent = error.message;
    masterError.hidden = false;
  }
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
  const button = event.target.closest('[data-open-vehicles]');
  if (button) {
    let optionIds = [];
    try { optionIds = JSON.parse(button.dataset.vehicleIds || '[]'); } catch { /* use all vehicles for older menu data */ }
    renderVehicles(allVehicles, optionIds);
    document.getElementById('maintenance-dialog').showModal();
  }
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
document.getElementById('maintenance-dialog')?.querySelector('.close')?.addEventListener('click', () => document.getElementById('maintenance-dialog').close());
document.getElementById('maintenance-dialog')?.addEventListener('click', event => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});

api('session').then(async ({ user }) => { showPortal(user); await loadMasterData(); }).catch(() => showLogin());
