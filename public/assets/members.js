const loadingDialog = document.getElementById('loading-dialog');
const accessContent = document.getElementById('access-content');
const accessError = document.getElementById('access-error');
const roleForm = document.getElementById('role-form');
const roleDialog = document.getElementById('role-dialog');
const roleFormError = document.getElementById('role-form-error');
const roleRows = document.getElementById('role-rows');
const memberRows = document.getElementById('member-rows');
const toast = document.getElementById('app-toast');
let pendingRequests = 0;
let roles = [];
let deleteRoleId = null;
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
function permissionSummary(role) {
  const permissions = [];
  if (role.canManageMenus) permissions.push('Kelola menu');
  if (role.canManageUsers) permissions.push('Kelola pengguna');
  return permissions.join(' · ') || 'Akses anggota';
}
function renderRoles() {
  roleRows.replaceChildren();
  roles.forEach((role, index) => {
    const row = document.createElement('tr');
    row.append(node('td', 'table-number', String(index + 1).padStart(2, '0')));
    row.append(node('td', 'table-name', role.name));
    row.append(node('td', '', permissionSummary(role)));
    const actions = node('td', 'table-actions');
    if (!role.isSystem) {
      const edit = node('button', 'edit-item', 'Edit');
      edit.type = 'button';
      edit.addEventListener('click', () => openRole(role));
      const remove = node('button', 'delete-item', 'Hapus');
      remove.type = 'button';
      remove.addEventListener('click', () => askDeleteRole(role));
      actions.append(edit, remove);
    } else actions.textContent = 'Role sistem';
    row.append(actions);
    roleRows.append(row);
  });
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
        await loadAccess();
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
async function loadAccess() {
  accessError.hidden = true;
  const data = await api('members');
  roles = data.roles || [];
  renderRoles();
  renderMembers(data.members || []);
}
function openRole(role = null) {
  roleForm.reset();
  delete roleForm.dataset.editId;
  if (role) {
    roleForm.dataset.editId = role.id;
    roleForm.elements.name.value = role.name;
    roleForm.elements.canManageMenus.checked = role.canManageMenus;
    roleForm.elements.canManageUsers.checked = role.canManageUsers;
  }
  document.getElementById('role-dialog-title').textContent = role ? 'Edit role.' : 'Tambah role.';
  roleForm.querySelector('button[type="submit"]').textContent = role ? 'Simpan perubahan ↗' : 'Simpan role ↗';
  roleFormError.hidden = true;
  roleDialog.showModal();
}
function askDeleteRole(role) {
  deleteRoleId = role.id;
  document.getElementById('role-delete-message').textContent = `Hapus role “${role.name}”? Role yang masih dipakai pengguna tidak dapat dihapus.`;
  document.getElementById('role-delete-dialog').showModal();
}

document.getElementById('add-role-button').addEventListener('click', () => openRole());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog && dialog.id !== 'loading-dialog') dialog.close(); }));
roleForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = roleForm.querySelector('button[type="submit"]');
  const editing = Boolean(roleForm.dataset.editId);
  const input = {
    name: roleForm.elements.name.value,
    canManageMenus: roleForm.elements.canManageMenus.checked,
    canManageUsers: roleForm.elements.canManageUsers.checked
  };
  if (editing) input.id = roleForm.dataset.editId;
  button.disabled = true;
  roleFormError.hidden = true;
  try {
    await api('roles', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(input) });
    roleDialog.close();
    await loadAccess();
    showToast(`Role ${editing ? 'diperbarui' : 'ditambahkan'}.`);
  } catch (error) {
    roleFormError.textContent = error.message;
    roleFormError.hidden = false;
  } finally { button.disabled = false; }
});
document.getElementById('role-delete-cancel').addEventListener('click', () => document.getElementById('role-delete-dialog').close());
document.getElementById('role-delete-confirm').addEventListener('click', async () => {
  if (!deleteRoleId) return;
  const id = deleteRoleId;
  deleteRoleId = null;
  document.getElementById('role-delete-dialog').close();
  try {
    await api('roles', { method: 'DELETE', body: JSON.stringify({ id }) });
    await loadAccess();
    showToast('Role dihapus.');
  } catch (error) { accessError.textContent = error.message; accessError.hidden = false; }
});
document.getElementById('members-logout').addEventListener('click', async () => {
  try { await api('logout', { method: 'POST', body: '{}' }); } finally { window.location.assign('/'); }
});
api('session').then(async ({ user }) => {
  if (!user?.canManageUsers) return window.location.replace('/');
  accessContent.hidden = false;
  try { await loadAccess(); } catch (error) { accessError.textContent = error.message; accessError.hidden = false; }
}).catch(() => window.location.replace('/'));
