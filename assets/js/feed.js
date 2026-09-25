/**
 * The suite's run feed: where it lives, how to read it, how to say it.
 *
 * The Agentic Playwright Suite publishes `feed/latest.json` on every push to
 * main (schema apw-feed/1). It is served from this same origin, so there is no
 * cross-origin request and no third party involved. Every widget that shows a
 * number from the suite gets it from here, and every widget has to survive the
 * feed being unavailable: the page then shows links instead of numbers.
 */

export const SUITE_BASE = '/agentic-playwright-suite/';
export const FEED_URL = `${SUITE_BASE}feed/latest.json`;
export const HISTORY_URL = `${SUITE_BASE}feed/history.json`;
export const SCHEMA = 'apw-feed/1';

async function getJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: 'no-cache', signal: controller.signal });
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/** The fields this site reads, checked before anything is drawn from them. */
export function readable(feed) {
  return (
    feed?.schema === SCHEMA &&
    typeof feed.run?.number === 'number' &&
    typeof feed.totals?.cases === 'number' &&
    Array.isArray(feed.lanes) &&
    feed.lanes.every((lane) => typeof lane.key === 'string' && Array.isArray(lane.cases))
  );
}

let latest;
export function loadFeed() {
  latest ??= getJson(FEED_URL).then((feed) => {
    if (!readable(feed)) throw new Error('the feed is not in a format this page can read');
    return feed;
  });
  return latest;
}

let history;
export function loadHistory() {
  history ??= getJson(HISTORY_URL)
    .then((doc) => (Array.isArray(doc?.runs) ? doc.runs : []))
    .catch(() => []);
  return history;
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "3 minutes ago", "yesterday", "2 weeks ago". */
export function ago(iso, now = Date.now()) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const seconds = Math.round((then - now) / 1000);
  const steps = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.345, 'week'],
    [12, 'month'],
    [Infinity, 'year'],
  ];
  let value = seconds;
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) {
      return unit === 'second' && Math.abs(value) < 45 ? 'just now' : relative.format(Math.round(value), unit);
    }
    value /= size;
  }
  return '';
}

/** "840 ms", "12.8 s", "3 min 58 s". */
export function duration(ms) {
  if (!Number.isFinite(ms)) return '';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${Math.round(seconds % 60)} s`;
}

export function dateTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "Functional · Chromium", "Visual · Chromium", "REST API". */
export function laneName(lane) {
  if (lane.suite === 'api') return 'REST API';
  const suite = lane.suite === 'visual' ? 'Visual' : 'Functional';
  return `${suite} · ${lane.engine}`;
}

/** A case's reference as the suite writes it: "TC-04", or the title when it has no id. */
export const caseRef = (c) => c.id ?? c.title;

export const STATUS_WORD = {
  passed: 'passed',
  failed: 'failed',
  flaky: 'flaky',
  skipped: 'skipped',
  parked: 'parked',
};

/** Tiny element builder: el('span', { class: 'x', title: 'y' }, 'text', child). */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child === undefined || child === null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
