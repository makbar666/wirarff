import { cp, mkdir, access } from 'node:fs/promises';

await access('public/index.html');
await cp('calculator.html', 'public/kalkulator.html');
await cp('daily-report.html', 'public/laporan-harian.html');
await mkdir('public/assets', { recursive: true });
await cp('assets/vendor', 'public/assets/vendor', { recursive: true });
for (const asset of ['app.js', 'master.js', 'members.js', 'daily-report.js', 'password-visibility.js', 'style.css', 'wirarff-logo.png', 'wap-logo.png', 'weda-bay-arff-seal.png', 'favicon.svg', 'login-background.jpg', 'dashboard-background.jpg']) {
  await cp(`assets/${asset}`, `public/assets/${asset}`);
}
await cp('assets/menu-icons', 'public/assets/menu-icons', { recursive: true });
console.log('Aset portal siap untuk deploy.');
