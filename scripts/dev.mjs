import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createHandler } from '../server/api.mjs';

try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const handler = createHandler();
const root = resolve('public');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost:8083');
    if (url.pathname.startsWith('/api/')) {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const request = new Request(url, { method: req.method, headers: req.headers, ...(['GET','HEAD'].includes(req.method) ? {} : { body: Buffer.concat(chunks) }) });
      const response = await handler(request);
      res.statusCode = response.status;
      for (const [key, value] of response.headers) if (key !== 'set-cookie') res.setHeader(key, value);
      if (response.headers.getSetCookie().length) res.setHeader('set-cookie', response.headers.getSetCookie());
      res.end(Buffer.from(await response.arrayBuffer()));
    } else {
      const file = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
      const contents = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(contents);
    }
  } catch (error) {
    if (res.headersSent) {
      if (!res.writableEnded) res.end();
      return;
    }
    const notFound = error?.code === 'ENOENT';
    res.writeHead(notFound ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(notFound ? 'Tidak ditemukan.' : 'Layanan lokal tidak tersedia.');
  }
}).listen(8083, '127.0.0.1', () => console.log('Portal lokal: http://localhost:8083'));
