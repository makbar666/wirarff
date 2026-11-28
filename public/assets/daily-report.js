const loading = document.getElementById('report-loading');
const content = document.getElementById('report-content');
const personnelRows = document.getElementById('personnel-rows');
const activityRows = document.getElementById('activity-rows');
const signaturePad = document.getElementById('signature-pad');
const signatureContext = signaturePad.getContext('2d');
let signaturePresent = false;
let drawingPointer = null;
let signatureVersion = 0;
let signatureMethod = '';
const signatureDrafts = {};
const undoHistory = [];
const redoHistory = [];
const captureSignature = () => ({ pixels: signatureContext.getImageData(0, 0, signaturePad.width, signaturePad.height), present: signaturePresent });
function updateSignatureTools() {
  document.getElementById('signature-undo').disabled = signatureMethod !== 'digital' || !undoHistory.length || drawingPointer !== null;
  document.getElementById('signature-redo').disabled = signatureMethod !== 'digital' || !redoHistory.length || drawingPointer !== null;
  document.getElementById('signature-clear').disabled = !signaturePresent || drawingPointer !== null;
}
function rememberSignature() {
  undoHistory.push(captureSignature());
  if (undoHistory.length > 30) undoHistory.shift();
  redoHistory.length = 0;
}
function restoreSignature(state) {
  signatureContext.putImageData(state.pixels, 0, 0);
  signaturePresent = state.present;
  signatureVersion++;
  updateSignatureTools();
}
document.getElementById('signature-undo').addEventListener('click', () => {
  if (signatureMethod !== 'digital' || !undoHistory.length || drawingPointer !== null) return;
  redoHistory.push(captureSignature());
  restoreSignature(undoHistory.pop());
});
document.getElementById('signature-redo').addEventListener('click', () => {
  if (signatureMethod !== 'digital' || !redoHistory.length || drawingPointer !== null) return;
  undoHistory.push(captureSignature());
  restoreSignature(redoHistory.pop());
});
document.querySelectorAll('[name="signature-method"]').forEach(input => input.addEventListener('change', () => {
  if (signatureMethod) signatureDrafts[signatureMethod] = { pixels: signatureContext.getImageData(0, 0, signaturePad.width, signaturePad.height), present: signaturePresent };
  signatureVersion++;
  drawingPointer = null;
  signatureMethod = input.value;
  signatureContext.clearRect(0, 0, signaturePad.width, signaturePad.height);
  const draft = signatureDrafts[signatureMethod];
  if (draft) signatureContext.putImageData(draft.pixels, 0, 0);
  signaturePresent = draft?.present || false;
  document.getElementById('signature-upload-panel').hidden = signatureMethod !== 'upload';
  document.getElementById('signature-workspace').hidden = false;
  document.getElementById('signature-instruction').textContent = signatureMethod === 'digital' ? 'Gambar tanda tangan di area berikut dengan mouse, pena, atau jari.' : 'Pratinjau tanda tangan yang diunggah.';
  signaturePad.style.touchAction = signatureMethod === 'digital' ? 'none' : 'auto';
  document.getElementById('signature-error').hidden = true;
  updateSignatureTools();
}));
const signaturePoint = event => {
  const rect = signaturePad.getBoundingClientRect();
  return [(event.clientX - rect.left) * signaturePad.width / rect.width, (event.clientY - rect.top) * signaturePad.height / rect.height];
};
signaturePad.addEventListener('pointerdown', event => {
  if (signatureMethod !== 'digital' || drawingPointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
  signatureVersion++;
  rememberSignature();
  drawingPointer = event.pointerId;
  signaturePad.setPointerCapture(event.pointerId);
  signatureContext.lineWidth = 3;
  signatureContext.lineCap = 'round';
  signatureContext.lineJoin = 'round';
  signatureContext.beginPath();
  signatureContext.moveTo(...signaturePoint(event));
  signatureContext.lineTo(...signaturePoint(event));
  signatureContext.stroke();
  signaturePresent = true;
  updateSignatureTools();
});
signaturePad.addEventListener('pointermove', event => {
  if (drawingPointer !== event.pointerId) return;
  signatureContext.lineTo(...signaturePoint(event));
  signatureContext.stroke();
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  signaturePad.addEventListener(name, event => { if (drawingPointer === event.pointerId) { drawingPointer = null; updateSignatureTools(); } });
}
document.getElementById('signature-clear').addEventListener('click', () => {
  if (!signaturePresent || drawingPointer !== null) return;
  if (signatureMethod === 'digital') rememberSignature();
  signatureVersion++;
  signatureContext.clearRect(0, 0, signaturePad.width, signaturePad.height);
  signaturePresent = false;
  document.getElementById('signature-upload').value = '';
  document.getElementById('signature-error').hidden = true;
  updateSignatureTools();
});
document.getElementById('signature-upload').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  const version = ++signatureVersion;
  const error = document.getElementById('signature-error');
  let url;
  try {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Pilih gambar PNG, JPG, atau WebP maksimal 5 MB.');
    url = URL.createObjectURL(file);
    const img = new Image(); img.src = url;
    await img.decode();
    if (version !== signatureVersion) return;
    const scale = Math.min(signaturePad.width / img.width, signaturePad.height / img.height);
    signatureContext.clearRect(0, 0, signaturePad.width, signaturePad.height);
    signatureContext.drawImage(img, (signaturePad.width - img.width * scale) / 2, (signaturePad.height - img.height * scale) / 2, img.width * scale, img.height * scale);
    signaturePresent = true;
    updateSignatureTools();
    error.hidden = true;
  } catch (failure) {
    error.textContent = failure.message || 'Gambar gagal dibaca.';
    error.hidden = false;
  } finally { if (url) URL.revokeObjectURL(url); event.target.value = ''; }
});

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
document.getElementById('print-report').addEventListener('click', async () => {
  const date = document.getElementById('report-date');
  if (!date.value) { date.reportValidity(); return; }
  const button = document.getElementById('print-report');
  button.disabled = true;
  button.textContent = 'Menyiapkan PDF…';
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:-20000px;top:0;width:1000px;height:1000px;border:0';
  try {
    preparePrintReport();
    document.body.append(frame);
    const doc = frame.contentDocument;
    doc.open(); doc.write('<!doctype html><html><head></head><body></body></html>'); doc.close();
    const base = doc.createElement('base'); base.href = document.baseURI; doc.head.append(base);
    const style = doc.createElement('style');
    const rules = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.type === CSSRule.MEDIA_RULE && rule.conditionText === 'print') rules.push([...rule.cssRules].map(item => item.cssText).join('\n'));
          else if (rule.type === CSSRule.STYLE_RULE) rules.push(rule.cssText);
        }
      } catch { /* External font stylesheet is optional. */ }
    }
    style.textContent = rules.join('\n') + '\nbody{margin:0!important;padding:0!important;width:1000px!important}#report-print-output{display:block!important;padding:0}';
    doc.head.append(style);
    doc.body.append(doc.importNode(document.getElementById('report-print-output'), true));
    await Promise.all([...doc.images].map(img => img.decode().catch(() => {})));
    const canvas = await window.html2canvas(doc.getElementById('report-print-output'), { scale:2, backgroundColor:'#ffffff', logging:false });
    const pdf = new window.jspdf.jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const width = 194, height = 281;
    const sliceHeight = Math.floor(canvas.width * height / width);
    for (let y = 0; y < canvas.height; y += sliceHeight) {
      if (y) pdf.addPage();
      const slice = document.createElement('canvas'); slice.width = canvas.width; slice.height = Math.min(sliceHeight, canvas.height-y);
      slice.getContext('2d').drawImage(canvas, 0,y,canvas.width,slice.height,0,0,canvas.width,slice.height);
      pdf.addImage(slice.toDataURL('image/png'), 'PNG',8,8,width,slice.height*width/canvas.width);
    }
    pdf.save(`Laporan-Harian-${date.value}.pdf`);
  } catch (error) {
    const status = document.getElementById('pdf-status');
    status.textContent = 'PDF gagal dibuat. Silakan coba kembali.';
    status.hidden = false;
  } finally {
    frame.remove(); button.disabled = false; button.textContent = 'Download PDF';
  }
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
    const removePhoto = document.createElement('button');
    removePhoto.type = 'button';
    removePhoto.className = 'report-photo-remove';
    removePhoto.textContent = '×';
    removePhoto.setAttribute('aria-label', `Hapus foto ${file.name}`);
    removePhoto.title = 'Hapus foto';
    removePhoto.addEventListener('click', () => {
      URL.revokeObjectURL(image.src);
      figure.remove();
    });
    figure.append(image, caption, removePhoto);
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
    tr.append(el('td', inputs[2].value.trim()));
    const photos = el('td'); photos.className='pdf-photos'; row.querySelectorAll('.report-photo-list img').forEach(img => photos.append(img.cloneNode())); tr.append(photos); body.append(tr);
  });
  table.append(body); output.append(table);
  const signature = el('div'); signature.className = 'pdf-signature';
  signature.append(el('p', 'Tanda tangan'));
  if (signaturePresent) { const img = el('img'); img.src = signaturePad.toDataURL('image/png'); img.alt = 'Tanda tangan'; signature.append(img); }
  signature.append(el('p', document.getElementById('signature-name').value));
  output.append(signature);
  document.body.append(output);
}
window.addEventListener('beforeprint', preparePrintReport);
