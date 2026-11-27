const loadingDialog = document.getElementById('loading-dialog');
const accessContent = document.getElementById('access-content');
const accessError = document.getElementById('access-error');
const userForm = document.getElementById('user-form');
const userDialog = document.getElementById('user-dialog');
const userFormError = document.getElementById('user-form-error');
const memberRows = document.getElementById('member-rows');
const toast = document.getElementById('app-toast');
let pendingRequests = 0;
let roles = [];
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
function node(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
}
function showToast(message) {
  document.getElementById('app-toast-message').textContent = message;
  toast.hidden = false;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.remove('is-visible'); toast.hidden = true; }, 3000);
}
function renderMembers(members) {
  memberRows.replaceChildren();
  members.forEach((member, index) => {
    const row = document.createElement('tr');
    row.append(node('td', 'table-number', String(index + 1).padStart(2, '0')));
    row.append(node('td', 'table-name', member.name));
    row.append(node('td', '', member.email || 'Email tidak ditemukan'));
    const roleCell = document.createElement('td');
    const select = document.createElement('select');
    select.className = 'role-select';
    roles.forEach(role => {
      const option = document.createElement('option');
      option.value = role.id;
      option.textContent = role.name;
      option.selected = role.id === member.roleId;
      select.append(option);
    });
    roleCell.append(select);
    row.append(roleCell);
    const actions = node('td', 'table-actions');
    const save = node('button', 'edit-item', 'Simpan');
    save.type = 'button';
    save.disabled = select.value === member.roleId;
    select.addEventListener('change', () => { save.disabled = select.value === member.roleId; });
    save.addEventListener('click', async () => {
      save.disabled = true;
      try {
        await api('members', { method: 'PUT', body: JSON.stringify({ userId: member.userId, roleId: select.value }) });
        await loadMembers();
        showToast(`Role untuk ${member.name} diperbarui.`);
      } catch (error) {
        accessError.textContent = error.message;
        accessError.hidden = false;
        save.disabled = false;
      }
    });
    actions.append(save);
    row.append(actions);
    memberRows.append(row);
  });
}
async function loadMembers() {
  accessError.hidden = true;
  const data = await api('members');
  roles = data.roles || [];
  renderMembers(data.members || []);
}
document.getElementById('add-user-button').addEventListener('click', () => {
  userForm.reset();
  userFormError.hidden = true;
  userDialog.showModal();
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog && dialog.id !== 'loading-dialog') dialog.close(); }));
userForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = userForm.querySelector('button[type="submit"]');
  const input = Object.fromEntries(new FormData(userForm));
  button.disabled = true;
  userFormError.hidden = true;
  try {
    await api('members', { method: 'POST', body: JSON.stringify(input) });
    userDialog.close();
    userForm.reset();
    await loadMembers();
    showToast('User berhasil dibuat.');
  } catch (error) {
    userFormError.textContent = error.message;
    userFormError.hidden = false;
  } finally { button.disabled = false; }
});
document.getElementById('members-logout').addEventListener('click', async () => {
  try { await api('logout', { method: 'POST', body: '{}' }); } finally { window.location.assign('/'); }
});
api('session').then(async ({ user }) => {
  if (!user?.canManageUsers) return window.location.replace('/');
  accessContent.hidden = false;
  try { await loadMembers(); } catch (error) { accessError.textContent = error.message; accessError.hidden = false; }
}).catch(() => window.location.replace('/'));
