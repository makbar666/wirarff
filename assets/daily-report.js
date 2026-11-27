const loading = document.getElementById('report-loading');
const content = document.getElementById('report-content');
const personnelRows = document.getElementById('personnel-rows');
const activityRows = document.getElementById('activity-rows');

function updateRowNumbers(container) {
  [...container.rows].forEach((row, index) => { row.querySelector('.row-number').textContent = String(index + 1); });
}

function addPersonnel() {
  personnelRows.append(document.getElementById('personnel-template').content.cloneNode(true));
  updateRowNumbers(personnelRows);
}

function addActivity() {
  activityRows.append(document.getElementById('activity-template').content.cloneNode(true));
}

document.getElementById('add-personnel').addEventListener('click', addPersonnel);
document.getElementById('add-activity').addEventListener('click', addActivity);
document.getElementById('print-report').addEventListener('click', () => {
  const date = document.getElementById('report-date');
  if (!date.value) { date.reportValidity(); return; }
  window.print();
});

document.addEventListener('click', event => {
  const remove = event.target.closest('.report-remove');
  if (!remove) return;
  const row = remove.closest('tr');
  const table = row.parentElement;
  row.remove();
  if (table === personnelRows) updateRowNumbers(personnelRows);
});

document.addEventListener('change', event => {
  if (!event.target.matches('.report-upload input[type="file"]')) return;
  const list = event.target.closest('td').querySelector('.report-photo-list');
  for (const file of event.target.files || []) {
    if (!file.type.startsWith('image/')) continue;
    const figure = document.createElement('figure');
    const image = document.createElement('img');
    image.src = URL.createObjectURL(file);
    image.alt = file.name;
    const caption = document.createElement('figcaption');
    caption.textContent = file.name;
    figure.append(image, caption);
    list.append(figure);
  }
  event.target.value = '';
});

document.getElementById('report-date').value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
for (let index = 0; index < 10; index++) addPersonnel();
addActivity();

fetch('/api/session', { credentials: 'same-origin' })
  .then(response => response.ok ? response.json() : Promise.reject(new Error('Sesi tidak tersedia')))
  .then(data => {
    if (!data.user) throw new Error('Sesi tidak tersedia');
    loading.hidden = true;
    content.hidden = false;
  })
  .catch(() => window.location.replace('/'));
