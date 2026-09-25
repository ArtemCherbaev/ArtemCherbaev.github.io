/**
 * Copies what is published, and only that, into the directory Pages deploys.
 *
 * There is no build: every file is copied as it is. The list exists so the
 * tests, the scripts and the tooling in this repository are never served, and
 * so adding a page is a deliberate edit here rather than an accident.
 *
 *   node scripts/assemble.mjs _site
 */
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = resolve(ROOT, process.argv[2] ?? '_site');

const PUBLISHED = [
  'index.html',
  'qa-suite.html',
  'cv.html',
  '404.html',
  'robots.txt',
  'sitemap.xml',
  'build.json',
  'assets/css',
  'assets/js',
  'assets/img',
  'assets/fonts',
  'assets/cv/Artem-Cherbaev-CV.pdf',
];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const path of PUBLISHED) {
  const from = resolve(ROOT, path);
  await stat(from); // a missing file fails the deploy rather than publishing without it
  await cp(from, resolve(OUT, path), { recursive: true });
}
console.log(`assembled ${PUBLISHED.length} entries into ${OUT}`);
