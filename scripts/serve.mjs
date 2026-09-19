/**
 * Static file server for the smoke suite.
 *
 * Node only, no dependencies: the site itself has none, and a test harness that
 * needs half a registry to serve four HTML files would be the largest thing in
 * the repository. Serves the working tree as-is, so what the suite tests is what
 * Pages publishes.
 *
 *   node scripts/serve.mjs [port]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.argv[2] || process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
};

/** Resolve a request path to a file inside ROOT, or null if it escapes. */
function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const rel = normalize(decoded).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  const full = join(ROOT, rel);
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  return full;
}

async function resolveFile(full) {
  try {
    const info = await stat(full);
    if (info.isDirectory()) return resolveFile(join(full, 'index.html'));
    return full;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const requested = safePath(req.url || '/');
  if (!requested) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const file = await resolveFile(requested);

  if (!file) {
    // Pages serves 404.html with a 404 status, and the suite asserts on that
    // status, so the local server has to behave the same way.
    const notFound = await resolveFile(join(ROOT, '404.html'));
    const body = notFound ? await readFile(notFound) : Buffer.from('Not found');
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(body);
    return;
  }

  const body = await readFile(file);
  res.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  res.end(body);
});

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`serving ${ROOT} on http://127.0.0.1:${PORT}\n`);
});
