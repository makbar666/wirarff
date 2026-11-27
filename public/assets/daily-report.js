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

function preparePrintReport() {
  document.getElementById('report-print-output')?.remove();
  const output = document.createElement('article');
  output.id = 'report-print-output';
  const el = (tag, text) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; };
  const header = el('header');
  for (const src of ['assets/wap-logo.png', 'assets/weda-bay-arff-seal.png']) { const img = el('img'); img.src = src; header.append(img); }
  output.append(header);
  const meta = el('div'); meta.className = 'pdf-meta';
  const date = new Date(document.getElementById('report-date').value + 'T12:00:00');
  for (const [label, value] of [['HARI/TANGGAL', date.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).toUpperCase()], ['REGU', document.getElementById('report-team').value], ['SHIFT', document.getElementById('report-shift').value + ' (' + document.getElementById('report-hours').value + ')']]) { const line = el('div'); line.append(el('b', label), el('span', ': ' + value)); meta.append(line); }
  output.append(meta);
  const table = el('table'); table.className = 'pdf-main';
  const head = el('thead'); head.innerHTML = '<tr><th rowspan="2" style="width:33%">PERSONEL / POSISI</th><th rowspan="2" style="width:6%">WAKTU</th><th rowspan="2" style="width:24%">KEGIATAN</th><th rowspan="2" style="width:18%">KETERANGAN</th><th rowspan="2" style="width:19%">DOKUMENTASI</th></tr><tr></tr>'; table.append(head);
  const body = el('tbody');
  const activities = [...activityRows.rows];
  activities.forEach((row, index) => {
    const tr = el('tr');
    if (index === 0) {
      const left = el('td'); left.rowSpan = activities.length; left.className = 'pdf-personnel';
      const people = el('table'); people.innerHTML = '<thead><tr><th rowspan="2">NO</th><th rowspan="2">PERSONEL</th><th colspan="3">POSISI</th></tr><tr><th>M</th><th>O</th><th>+</th></tr></thead>';
      const entries = el('tbody'); [...personnelRows.rows].forEach((person, i) => { const r = el('tr'); r.append(el('td', String(i+1))); person.querySelectorAll('input').forEach(input => r.append(el('td', input.value))); entries.append(r); }); people.append(entries); left.append(people);
      const summary = el('table'); summary.className = 'pdf-summary'; summary.innerHTML = '<thead><tr><th colspan="2">REKAP PERSONEL</th><th>KETERANGAN</th></tr></thead>';
      const summaryBody = el('tbody'); document.querySelectorAll('.report-summary>div label').forEach((label, i) => { const r = el('tr'); r.append(el('td', label.firstChild.textContent), el('td', label.querySelector('input').value)); if(i===0){const note=el('td',document.querySelector('.report-summary-note textarea').value);note.rowSpan=6;r.append(note);} summaryBody.append(r); }); summary.append(summaryBody); left.append(summary); tr.append(left);
    }
    const inputs = row.querySelectorAll('input:not([type=file]), textarea');
    tr.append(el('td', inputs[0].value), el('td', inputs[1].value));
    const notes = inputs[2].value + (index === activities.length-1 ? '\n\n' + document.querySelector('.vehicle-condition textarea').value : ''); tr.append(el('td', notes.trim()));
    const photos = el('td'); photos.className='pdf-photos'; row.querySelectorAll('.report-photo-list img').forEach(img => photos.append(img.cloneNode())); tr.append(photos); body.append(tr);
  });
  table.append(body); output.append(table); document.body.append(output);
}
window.addEventListener('beforeprint', preparePrintReport);
