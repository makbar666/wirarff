import { cp, mkdir, access } from 'node:fs/promises';

await access('public/index.html');
await cp('calculator.html', 'public/kalkulator.html');
await mkdir('public/assets', { recursive: true });
for (const asset of ['app.js', 'master.js', 'members.js', 'style.css', 'wirarff-logo.png']) {
  await cp(`assets/${asset}`, `public/assets/${asset}`);
}
console.log('Aset portal siap untuk deploy.');
