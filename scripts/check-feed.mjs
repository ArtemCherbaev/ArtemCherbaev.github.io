/**
 * The consumer's side of the run feed contract.
 *
 * The suite checks its feed before publishing it; this checks the published
 * feed from the side that reads it, with the site's own reader, so the two can
 * only disagree loudly. Run daily by .github/workflows/feed.yml, and by hand:
 *
 *   node scripts/check-feed.mjs [https://artemcherbaev.github.io/agentic-playwright-suite/feed/]
 */
import { readable, SCHEMA } from '../assets/js/feed.js';

const BASE = process.argv[2] ?? 'https://artemcherbaev.github.io/agentic-playwright-suite/feed/';
const STATUSES = new Set(['passed', 'failed', 'flaky', 'skipped', 'parked']);
const STALE_DAYS = 8;

const problems = [];
const need = (ok, what) => {
  if (!ok) problems.push(what);
};

async function get(name) {
  const response = await fetch(new URL(name, BASE), { cache: 'no-store' });
  if (!response.ok) throw new Error(`${name} answered ${response.status}`);
  return response.json();
}

const feed = await get('latest.json');
need(readable(feed), `latest.json is readable by the site (${SCHEMA})`);
for (const lane of feed.lanes ?? []) {
  need(typeof lane.label === 'string' && typeof lane.engine === 'string', `lane ${lane.key} is labelled`);
  need(Number.isFinite(lane.durationMs), `lane ${lane.key} is timed`);
  for (const c of lane.cases ?? []) {
    need(typeof c.title === 'string' && c.title.length > 0, `a case in ${lane.key} has a title`);
    need(STATUSES.has(c.status), `${c.id ?? c.title} has a known status (${c.status})`);
    need(Number.isFinite(c.durationMs) && Number.isFinite(c.startMs), `${c.id ?? c.title} is timed`);
    need(Number.isInteger(c.worker) && c.worker >= 0, `${c.id ?? c.title} names its worker`);
  }
}
const counted = (feed.lanes ?? []).reduce((n, lane) => n + (lane.cases?.length ?? 0), 0);
need(counted === feed.totals?.cases, `totals.cases (${feed.totals?.cases}) equals the cases listed (${counted})`);

const history = await get('history.json');
need(Array.isArray(history.runs) && history.runs.length > 0, 'history.json lists runs');
need(
  (history.runs ?? []).every((r) => Number.isInteger(r.number) && ['passed', 'failed'].includes(r.conclusion)),
  'every run in the history is numbered and concluded',
);
need(history.runs?.at(-1)?.number === feed.run?.number, 'the history ends with the published run');

if (problems.length) {
  console.error(`the published feed breaks what this site reads:\n  - ${[...new Set(problems)].join('\n  - ')}`);
  process.exit(1);
}

const age = (Date.now() - Date.parse(feed.generatedAt)) / 86_400_000;
console.log(
  `feed ok: run #${feed.run.number} ${feed.run.conclusion}, ${feed.totals.cases} cases, ` +
    `${history.runs.length} runs of history, published ${age.toFixed(1)} days ago`,
);
if (age > STALE_DAYS) {
  console.log(`::warning::the feed is ${Math.floor(age)} days old; the suite has not published since`);
}
