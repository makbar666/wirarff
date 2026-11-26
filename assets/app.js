const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginScreen = document.getElementById('login-screen') || loginForm?.closest('.login-layout');
const portalApp = document.getElementById('portal-app');

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

loginForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  loginError.hidden = true;
  try {
    const input = Object.fromEntries(new FormData(loginForm));
    const { user } = await api('login', { method: 'POST', body: JSON.stringify(input) });
    showPortal(user);
  } catch (error) {
    loginError.textContent = error.message;
    loginError.hidden = false;
  } finally { button.disabled = false; }
});

document.getElementById('logout-button')?.addEventListener('click', async () => {
  try { await api('logout', { method: 'POST', body: '{}' }); } finally { showLogin(); }
});

api('session').then(({ user }) => showPortal(user)).catch(() => showLogin());

const dialog = document.getElementById('maintenance-dialog');
const opener = document.getElementById('open-maintenance');
if (dialog && opener) {
  opener.addEventListener('click', () => dialog.showModal());
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => opener.focus());
}
