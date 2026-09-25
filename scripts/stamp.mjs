/**
 * Writes build.json: what this deploy passed, for the footer to say so.
 *
 * Read from the suite's own JSON report, so the number on the page is the
 * number that ran. It refuses to stamp a run with failures: such a run is not
 * deployed, and a stamp claiming otherwise would be the one thing on the site
 * nobody measured.
 *
 *   node scripts/stamp.mjs reports/results.json build.json
 */
import { readFile, writeFile } from 'node:fs/promises';

const [reportPath = 'reports/results.json', outPath = 'build.json'] = process.argv.slice(2);
const report = JSON.parse(await readFile(reportPath, 'utf8'));
const { expected = 0, unexpected = 0, flaky = 0, skipped = 0 } = report.stats ?? {};

if (unexpected > 0 || flaky > 0 || expected === 0) {
  console.error(`not stamping: ${expected} passed, ${unexpected} failed, ${flaky} flaky`);
  process.exit(1);
}

const env = process.env;
const build = {
  deployedAt: new Date().toISOString(),
  commit: (env.GITHUB_SHA ?? 'local').slice(0, 7),
  runUrl: env.GITHUB_RUN_ID
    ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
    : null,
  checks: { passed: expected, skipped },
};
await writeFile(outPath, JSON.stringify(build, null, 2) + '\n', 'utf8');
console.log(`stamped ${outPath}: ${expected} checks passed, ${skipped} skipped by design`);
