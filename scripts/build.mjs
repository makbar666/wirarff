import { cp, mkdir, access } from 'node:fs/promises';

await access('public/index.html');
await cp('calculator.html', 'public/kalkulator.html');
await mkdir('public/assets', { recursive: true });
for (const asset of ['app.js', 'master.js', 'members.js', 'password-visibility.js', 'style.css', 'wirarff-logo.png', 'favicon.svg', 'login-background.jpg', 'dashboard-background.jpg']) {
  await cp(`assets/${asset}`, `public/assets/${asset}`);
}
await cp('assets/menu-icons', 'public/assets/menu-icons', { recursive: true });
console.log('Aset portal siap untuk deploy.');
