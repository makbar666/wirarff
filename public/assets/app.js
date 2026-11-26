const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginScreen = document.getElementById('login-screen') || loginForm?.closest('.login-layout');
const portalApp = document.getElementById('portal-app');
const documentList = document.getElementById('document-list');
const vehicleList = document.getElementById('vehicle-list');
const masterError = document.getElementById('master-error');

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
async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== 'object') throw new Error('Server mengirim respons yang tidak valid. Pastikan backend API sudah terpasang.');
  if (!response.ok) throw new Error(data.error || 'Layanan tidak tersedia. Coba lagi.');
  return data;
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
function renderDocuments(documents) {
  documentList.replaceChildren();
  document.getElementById('document-count').textContent = `${documents.length} MENU TERSEDIA`;
  for (const item of documents) {
    const card = node('article', 'card');
    const top = node('div', 'card-top');
    top.append(node('span', 'card-number', `${String(item.number).padStart(2, '0')} / ${item.category}`));
    top.append(node('span', 'card-icon', item.icon || '▤'));
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
    vehicleList.append(row);
  });
}
async function loadMasterData() {
  masterError.hidden = true;
  try {
    const data = await api('master-data');
    renderDocuments(data.documents || []);
    renderVehicles(data.vehicles || []);
  } catch (error) {
    masterError.textContent = error.message;
    masterError.hidden = false;
  }
}
function openDialog(id) { document.getElementById(id)?.showModal(); }
function closeDialog(id) { document.getElementById(id)?.close(); }

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
document.getElementById('add-document-button')?.addEventListener('click', () => openDialog('document-form-dialog'));
document.getElementById('add-vehicle-button')?.addEventListener('click', () => openDialog('vehicle-form-dialog'));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(button.dataset.close)));
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
    await api('documents', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    form.reset();
    closeDialog('document-form-dialog');
    await loadMasterData();
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
    await api('vehicles', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    form.reset();
    closeDialog('vehicle-form-dialog');
    await loadMasterData();
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
  } finally { button.disabled = false; }
});

api('session').then(async ({ user }) => { showPortal(user); await loadMasterData(); }).catch(() => showLogin());
