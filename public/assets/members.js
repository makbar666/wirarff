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
let pendingDeleteMember = null;
let editingMember = null;
let passwordMember = null;
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
    const role = roles.find(item => item.id === member.roleId);
    row.append(node('td', '', role?.name || member.roleId));
    const actions = node('td', 'table-actions');
    const edit = node('button', 'icon-action edit-item', '✎');
    edit.type = 'button'; edit.title = 'Edit data user'; edit.setAttribute('aria-label', `Edit data ${member.name}`);
    edit.addEventListener('click', () => {
      editingMember = member;
      const form = document.getElementById('user-edit-form');
      form.elements.name.value = member.name;
      form.elements.roleId.value = member.roleId;
      document.getElementById('user-edit-error').hidden = true;
      document.getElementById('user-edit-dialog').showModal();
    });
    const password = node('button', 'icon-action edit-item', '🔑');
    password.type = 'button'; password.title = 'Ganti kata sandi'; password.setAttribute('aria-label', `Ganti kata sandi ${member.name}`);
    password.addEventListener('click', () => {
      passwordMember = member;
      const form = document.getElementById('user-password-form');
      form.reset();
      document.getElementById('user-password-error').hidden = true;
      document.getElementById('user-password-dialog').showModal();
    });
    const remove = node('button', 'icon-action delete-item', '×');
    remove.type = 'button';
    remove.title = 'Hapus user'; remove.setAttribute('aria-label', `Hapus ${member.name}`);
    remove.addEventListener('click', () => {
      pendingDeleteMember = member;
      document.getElementById('user-delete-message').textContent = `Cabut akses portal untuk ${member.name} (${member.email || member.userId})? Akun Neon Auth tetap tersimpan.`;
      document.getElementById('user-delete-dialog').showModal();
    });
    actions.append(edit, password, remove);
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
document.getElementById('user-delete-cancel').addEventListener('click', () => {
  pendingDeleteMember = null;
  document.getElementById('user-delete-dialog').close();
});
document.getElementById('user-delete-confirm').addEventListener('click', async () => {
  if (!pendingDeleteMember) return;
  const member = pendingDeleteMember;
  pendingDeleteMember = null;
  document.getElementById('user-delete-dialog').close();
  try {
    await api('members', { method: 'DELETE', body: JSON.stringify({ userId: member.userId }) });
    await loadMembers();
    showToast(`Akses ${member.name} dicabut.`);
  } catch (error) { accessError.textContent = error.message; accessError.hidden = false; }
});
document.getElementById('user-edit-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!editingMember) return;
  const member = editingMember;
  const form = event.currentTarget;
  const errorBox = document.getElementById('user-edit-error');
  errorBox.hidden = true;
  try {
    await api('members', { method: 'PUT', body: JSON.stringify({ userId: member.userId, name: form.elements.name.value, roleId: form.elements.roleId.value }) });
    document.getElementById('user-edit-dialog').close();
    editingMember = null;
    await loadMembers();
    showToast(`Data ${member.name} diperbarui.`);
  } catch (error) { errorBox.textContent = error.message; errorBox.hidden = false; }
});
document.getElementById('user-password-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!passwordMember) return;
  const member = passwordMember;
  const form = event.currentTarget;
  const errorBox = document.getElementById('user-password-error');
  errorBox.hidden = true;
  try {
    await api('members/change-password', { method: 'POST', body: JSON.stringify({ userId: member.userId, currentPassword: form.elements.currentPassword.value, newPassword: form.elements.newPassword.value }) });
    document.getElementById('user-password-dialog').close();
    passwordMember = null;
    form.reset();
    showToast(`Kata sandi ${member.name} berhasil diganti.`);
  } catch (error) { errorBox.textContent = error.message; errorBox.hidden = false; }
});
userForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = userForm.querySelector('button[type="submit"]');
  const input = Object.fromEntries(new FormData(userForm));
  button.disabled = true;
  userFormError.hidden = true;
  try {
    const result = await api('members', { method: 'POST', body: JSON.stringify(input) });
    userDialog.close();
    userForm.reset();
    await loadMembers();
    showToast(result.restored ? 'Akses user dipulihkan; kata sandi lama tetap berlaku.' : 'User berhasil dibuat.');
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
