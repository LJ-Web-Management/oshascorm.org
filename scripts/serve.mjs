#!/usr/bin/env node
// Tiny static server that mimics GitHub Pages URL resolution for local QA:
//   /a/b      -> docs/a/b.html (or docs/a/b/index.html)
//   /a/b/     -> docs/a/b/index.html
//   missing   -> docs/404.html with status 404
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// DIR: folder to serve (default docs/). BASE: optional sub-path to mount it
// under, e.g. BASE=/oshascorm.org to test a preview build the way a
// *.github.io project site serves it.
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', process.env.DIR || 'docs');
const PORT = Number(process.env.PORT || 4173);
const MOUNT = (process.env.BASE || '').replace(/\/$/, '');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

function resolve(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (MOUNT) {
    if (p !== MOUNT && !p.startsWith(MOUNT + '/')) return null;
    p = p.slice(MOUNT.length) || '/';
  }
  const base = path.join(ROOT, p);
  if (!base.startsWith(ROOT)) return null;
  const tries = p.endsWith('/') ? [path.join(base, 'index.html')] : [base, base + '.html', path.join(base, 'index.html')];
  for (const f of tries) if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  return null;
}

http.createServer((req, res) => {
  const file = resolve(req.url);
  const status = file ? 200 : 404;
  const f = file || path.join(ROOT, '404.html');
  const type = TYPES[path.extname(f)] || 'application/json';
  let body = fs.readFileSync(f);
  const headers = { 'content-type': type, 'cache-control': 'max-age=600' };
  if (/gzip/.test(req.headers['accept-encoding'] || '') && /text|json|javascript|xml|svg|markdown/.test(type)) {
    body = zlib.gzipSync(body);
    headers['content-encoding'] = 'gzip';
  }
  res.writeHead(status, headers);
  res.end(body);
}).listen(PORT, () => console.log(`serving docs/ on http://localhost:${PORT}`));
