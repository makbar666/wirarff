import { cp, mkdir, access } from 'node:fs/promises';

await access('public/index.html');
await mkdir('public/assets', { recursive: true });
await cp('assets', 'public/assets', { recursive: true });
console.log('Aset portal siap untuk Netlify.');
