/**
 * The runner page: the suite's last CI run, replayed from its feed.
 *
 * Every lane is drawn on one time axis, one row per parallel worker, one block
 * per case, positioned where the case started and as long as it took. The
 * replay moves a playhead across that axis and writes a log line whenever a
 * case finishes, so the page shows the run as it happened: which cases ran side
 * by side, which were slow, what failed and why.
 */
import { loadFeed, loadHistory, ago, duration, dateTime, laneName, caseRef, plural, el } from './feed.js';

const REPO = 'https://github.com/ArtemCherbaev/agentic-playwright-suite';
const REPORTS = 'https://artemcherbaev.github.io/agentic-playwright-suite/';

const $ = (id) => document.getElementById(id);
const summary = $('runSummary');
const replay = $('replay');
const timeline = $('timeline');
const log = $('console');
const clock = $('clock');
const playBtn = $('playBtn');
const replayStatus = $('replayStatus');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clockText = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const SHORT = { chromium: 'chromium', webkit: 'webkit', visual: 'visual', api: 'api' };
const EVENT = { push: 'a push to main', workflow_dispatch: 'a manual run', schedule: 'the schedule' };
const byRef = (a, b) => caseRef(a).localeCompare(caseRef(b), 'en', { numeric: true });

/* ---------- summary ---------- */

function renderSummary(feed) {
  const failed = feed.run.conclusion === 'failed';
  summary.dataset.state = feed.run.conclusion;

  const badge = summary.querySelector('[data-badge]');
  badge.className = `badge ${failed ? 'failed' : 'passed'}`;
  badge.replaceChildren(el('span', { class: 'dot', 'aria-hidden': 'true' }), failed ? 'Failed' : 'Passed');
  summary.querySelector('[data-run-title]').textContent = `Run #${feed.run.number}`;

  summary.querySelector('[data-run-meta]').replaceChildren(
    el('span', {}, 'commit ', feed.run.commitUrl ? el('a', { href: feed.run.commitUrl }, feed.run.commit) : feed.run.commit),
    el('span', { title: dateTime(feed.generatedAt) }, `published ${ago(feed.generatedAt)}`),
    el('span', {}, `triggered by ${EVENT[feed.run.event] ?? feed.run.event}`),
    feed.run.url ? el('a', { href: feed.run.url }, 'open the CI run') : null,
  );

  const t = feed.totals;
  const parked = t.parked + t.skipped;
  const tile = (key, label, value, flag) =>
    el('div', { class: `t-${key}` }, el('dt', {}, label), el('dd', { class: flag ? 'nonzero' : undefined }, value));
  summary
    .querySelector('[data-tiles]')
    .replaceChildren(
      tile('cases', 'Cases', String(t.cases)),
      tile('passed', 'Passed', String(t.passed)),
      tile('failed', 'Failed', String(t.failed + t.flaky), t.failed + t.flaky > 0),
      tile('parked', 'Parked', String(parked), parked > 0),
      tile('wall', 'Wall time', duration(feed.run.wallMs)),
    );

  document.title = `Run #${feed.run.number} ${failed ? 'failed' : 'passed'} — Agentic Playwright Suite`;
}

function renderError(error) {
  summary.dataset.state = 'error';
  const badge = summary.querySelector('[data-badge]');
  badge.className = 'badge';
  badge.textContent = 'Unavailable';
  summary.querySelector('[data-run-title]').textContent = 'The run feed could not be loaded';
  summary.querySelector('[data-run-meta]').replaceChildren();
  summary.querySelector('[data-tiles]').replaceWith(
    el(
      'p',
      { class: 'error-text' },
      `${error?.message ?? 'The request failed'}. The same run is published as reports below, and the raw feed lives at `,
      el('a', { href: '/agentic-playwright-suite/feed/latest.json' }, '/agentic-playwright-suite/feed/latest.json'),
      '.',
    ),
  );
}

/* ---------- the replay ---------- */

function niceStep(raw) {
  const steps = [5e3, 10e3, 15e3, 30e3, 60e3, 120e3, 300e3, 600e3, 1200e3];
  return steps.find((s) => s >= raw) ?? steps.at(-1);
}

function buildReplay(feed) {
  const lanes = feed.lanes;
  const axisMs = Math.max(
    1000,
    ...lanes.map((lane) => Math.max(lane.durationMs, ...lane.cases.map((c) => c.startMs + c.durationMs))),
  );
  const pct = (ms) => `${Math.min(100, (ms / axisMs) * 100)}%`;
  const tick = niceStep(axisMs / 5);
  const items = [];

  const laneNodes = lanes.map((lane) => {
    const ran = lane.cases.filter((c) => c.status !== 'parked' && c.status !== 'skipped');
    const passed = lane.cases.filter((c) => c.status === 'passed').length;
    const workers = Math.max(1, ...lane.cases.map((c) => c.worker + 1));
    const count = lane.missing
      ? 'no report'
      : `${passed}/${ran.length} passed · ${plural(workers, 'worker')} · ${duration(lane.durationMs)}`;

    const track = el('div', { class: 'lane-track' });
    track.style.setProperty('--tick', pct(tick));
    if (lane.missing) {
      track.textContent = 'This job ended before it could report';
    } else {
      const rows = Array.from({ length: workers }, () => el('div', { class: 'worker-row' }));
      for (const c of lane.cases) {
        const parked = c.status === 'parked' || c.status === 'skipped';
        const node = el('span', {
          class: parked ? 'marker' : `block ${c.status}`,
          title: `${caseRef(c)} ${c.title} — ${c.status}${parked ? '' : `, ${duration(c.durationMs)}`}`,
        });
        node.style.left = pct(c.startMs);
        if (!parked) node.style.width = pct(c.durationMs);
        rows[parked ? 0 : c.worker].append(node);
        items.push({ c, lane, node, start: c.startMs, end: c.startMs + (parked ? 0 : c.durationMs), state: '' });
      }
      track.append(...rows);
    }

    return el(
      'div',
      { class: `lane${lane.missing ? ' missing' : ''}` },
      el('div', { class: 'lane-head' }, el('strong', {}, laneName(lane)), el('span', { class: 'lane-count' }, count)),
      track,
    );
  });

  const axis = el('div', { class: 'axis', 'aria-hidden': 'true' });
  for (let ms = 0; ms < axisMs - tick / 3; ms += tick) {
    const label = el('span', {}, clockText(ms));
    label.style.left = pct(ms);
    axis.append(label);
  }
  const end = el('span', {}, clockText(axisMs));
  end.style.left = '100%';
  axis.append(end);

  const playhead = el('div', { class: 'playhead', 'aria-hidden': 'true' });
  timeline.replaceChildren(...laneNodes, axis, playhead);
  timeline.setAttribute('role', 'img');
  timeline.setAttribute(
    'aria-label',
    `Timeline of run ${feed.run.number}: ${lanes.map((l) => `${laneName(l)}, ${l.missing ? 'no report' : plural(l.cases.length, 'case')}`).join('; ')}. The table below lists every case.`,
  );

  /* ----- engine ----- */

  const fast = Math.min(60, Math.max(4, Math.round(axisMs / 22000)));
  const speeds = [
    { value: 1, label: 'Real time' },
    { value: fast, label: `${fast}×` },
    { value: fast * 3, label: `${fast * 3}×` },
  ];
  let speed = fast;
  let t = 0;
  let playing = false;
  let last = 0;

  const speedGroup = $('speed');
  speedGroup.replaceChildren(
    ...speeds.map((s) =>
      el(
        'button',
        {
          type: 'button',
          'aria-pressed': String(s.value === speed),
          onclick: (event) => {
            speed = s.value;
            for (const b of speedGroup.children) b.setAttribute('aria-pressed', String(b === event.currentTarget));
          },
        },
        s.label,
      ),
    ),
  );

  const lanePad = (key) => (SHORT[key] ?? key).padEnd(8, ' ');

  function write(item) {
    const { c, lane } = item;
    const mark = c.status === 'passed' ? '✓' : c.status === 'failed' ? '✘' : c.status === 'flaky' ? '~' : '◌';
    const tone = c.status === 'passed' ? 'ok' : c.status === 'failed' || c.status === 'flaky' ? 'bad' : 'park';
    const stick = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
    log.append(
      el(
        'div',
        { class: 'line' },
        el('span', { class: tone }, mark),
        el('span', { class: 'lane-k' }, lanePad(lane.key)),
        el('span', { class: 't' }, el('span', { class: tone }, caseRef(c)), ' ', c.title),
        el('span', { class: 'd' }, c.status === 'parked' || c.status === 'skipped' ? 'parked' : duration(c.durationMs)),
      ),
    );
    if (c.error) log.append(el('span', { class: 'err' }, c.error));
    if (stick) log.scrollTop = log.scrollHeight;
  }

  function header() {
    log.replaceChildren(
      el(
        'span',
        { class: 'note' },
        `$ replaying run #${feed.run.number} · ${feed.run.commit} · ${lanes.length} lanes, ${plural(feed.totals.cases, 'case')}`,
      ),
    );
  }

  function seek(next) {
    t = Math.max(0, Math.min(axisMs, next));
    playhead.style.left = pct(t);
    clock.textContent = `${clockText(t)} / ${clockText(axisMs)}`;
    const finished = [];
    for (const item of items) {
      const state = t >= item.end && (item.end > 0 || t > 0) ? 'done' : t >= item.start && t > 0 ? 'running' : 'pending';
      if (state === item.state) continue;
      if (state === 'done') finished.push(item);
      item.state = state;
      item.node.classList.toggle('running', state === 'running');
      item.node.classList.toggle('done', state === 'done');
    }
    finished.sort((a, b) => a.end - b.end || byRef(a.c, b.c)).forEach(write);
    if (t >= axisMs) finish();
  }

  function setButton(label, icon) {
    playBtn.querySelector('span').textContent = label;
    playBtn.querySelector('use').setAttribute('href', icon);
  }

  function frame(now) {
    if (!playing) return;
    const dt = last ? Math.min(100, now - last) : 0;
    last = now;
    seek(t + dt * speed);
    if (playing) requestAnimationFrame(frame);
  }

  function play() {
    if (t >= axisMs) restart();
    playing = true;
    last = 0;
    playhead.style.opacity = '1';
    setButton('Pause', '#i-pause');
    requestAnimationFrame(frame);
  }

  function pause() {
    playing = false;
    setButton('Resume', '#i-play');
  }

  function restart() {
    for (const item of items) {
      item.state = '';
      item.node.classList.remove('running', 'done');
    }
    header();
    replayStatus.textContent = '';
    seek(0);
  }

  let announced = false;
  function finish() {
    const wasPlaying = playing;
    playing = false;
    setButton('Replay again', '#i-restart');
    const s = feed.totals;
    const parts = [`${s.passed} passed`];
    if (s.failed) parts.push(`${s.failed} failed`);
    if (s.flaky) parts.push(`${s.flaky} flaky`);
    if (s.parked + s.skipped) parts.push(`${s.parked + s.skipped} parked`);
    const text = `${plural(s.cases, 'case')}: ${parts.join(', ')}. Run #${feed.run.number} ${feed.run.conclusion} in ${duration(feed.run.wallMs)} of wall time.`;
    if (!log.querySelector('.summary')) {
      log.append(el('span', { class: 'summary' }, text));
      log.scrollTop = log.scrollHeight;
    }
    if (wasPlaying || !announced) replayStatus.textContent = text;
    announced = true;
  }

  playBtn.addEventListener('click', () => (playing ? pause() : play()));
  $('restartBtn').addEventListener('click', () => {
    restart();
    play();
  });
  $('endBtn').addEventListener('click', () => {
    playing = false;
    seek(axisMs);
  });

  header();
  replay.hidden = false;
  seek(0);

  if (reducedMotion) {
    // No animation unless asked for: show the finished run straight away.
    seek(axisMs);
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          if (!playing && t === 0) play();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(replay);
  }

  return items;
}

/* ---------- every case ---------- */

function renderCases(feed, items) {
  const card = $('cases');
  const rows = $('caseRows');
  const filters = $('filters');
  const search = $('caseSearch');
  const empty = $('casesEmpty');
  const sha = feed.run.commitUrl?.split('/').pop() || 'main';
  const laneOrder = new Map(feed.lanes.map((l, i) => [l.key, i]));

  const all = feed.lanes
    .flatMap((lane) => lane.cases.map((c) => ({ c, lane })))
    .sort((a, b) => laneOrder.get(a.lane.key) - laneOrder.get(b.lane.key) || byRef(a.c, b.c));

  const nodeOf = new Map(items.map((item) => [item.c, item.node]));

  const tests = [
    { key: 'all', label: 'All', test: () => true },
    { key: 'failed', label: 'Failed', test: (x) => x.c.status === 'failed' || x.c.status === 'flaky' },
    { key: 'parked', label: 'Parked', test: (x) => x.c.status === 'parked' || x.c.status === 'skipped' },
    ...feed.lanes
      .filter((l) => !l.missing)
      .map((l) => ({ key: l.key, label: laneName(l), test: (x) => x.lane.key === l.key })),
  ];
  let active = 'all';

  const rowFor = ({ c, lane }) => {
    const parked = c.status === 'parked' || c.status === 'skipped';
    const source = c.file ? `${REPO}/blob/${sha}/${c.file}${c.line ? `#L${c.line}` : ''}` : null;
    const title = source ? el('a', { href: source, title: `${c.file}:${c.line}` }, c.title) : c.title;
    const row = el(
      'tr',
      {},
      el(
        'td',
        {},
        el(
          'span',
          { class: `status ${c.status}`, title: c.status },
          el('span', { class: 'dot', 'aria-hidden': 'true' }),
          el('span', { class: 'word' }, c.status),
        ),
      ),
      el(
        'td',
        {},
        c.id ? el('span', { class: 'case-id' }, c.id) : null,
        title,
        el('span', { class: 'case-lane' }, laneName(lane)),
        c.error ? el('span', { class: 'case-error' }, c.error) : null,
        parked ? el('span', { class: 'case-note' }, c.note ?? 'Parked with test.fixme() on a defect in the application') : null,
      ),
      el('td', { class: 'lane-cell' }, laneName(lane)),
      el('td', { class: 'num' }, parked ? '—' : duration(c.durationMs)),
    );
    const node = nodeOf.get(c);
    if (node) {
      row.addEventListener('mouseenter', () => node.classList.add('hl'));
      row.addEventListener('mouseleave', () => node.classList.remove('hl'));
    }
    return row;
  };

  const draw = () => {
    const filter = tests.find((f) => f.key === active) ?? tests[0];
    const q = search.value.trim().toLowerCase();
    const shown = all.filter(
      (x) =>
        filter.test(x) &&
        (!q || `${x.c.id ?? ''} ${x.c.title} ${x.c.area} ${laneName(x.lane)}`.toLowerCase().includes(q)),
    );
    rows.replaceChildren(...shown.map(rowFor));
    empty.hidden = shown.length > 0;
  };

  filters.replaceChildren(
    ...tests.map((f) => {
      const n = all.filter(f.test).length;
      return el(
        'button',
        {
          type: 'button',
          'aria-pressed': String(f.key === active),
          disabled: n === 0 && f.key !== 'all',
          onclick: (event) => {
            active = f.key;
            for (const b of filters.children) b.setAttribute('aria-pressed', String(b === event.currentTarget));
            draw();
          },
        },
        f.label,
        el('span', { class: 'n' }, String(n)),
      );
    }),
  );
  search.addEventListener('input', draw);

  // Arrive filtered to the failures when there are any: that is what someone
  // opening a red run came for.
  if (feed.totals.failed + feed.totals.flaky > 0) {
    active = 'failed';
    for (const b of filters.children) b.setAttribute('aria-pressed', String(b.textContent.startsWith('Failed')));
  }
  draw();
  card.hidden = false;
}

/* ---------- history ---------- */

async function renderHistory(feed) {
  const runs = (await loadHistory()).slice(-40);
  if (!runs.length) return;
  const card = $('history');
  const longest = Math.max(1, ...runs.map((r) => r.wallMs || 0));
  $('historyBars').replaceChildren(
    ...runs.map((r) => {
      const label = `Run #${r.number}: ${r.conclusion}, ${r.totals?.passed ?? 0} of ${r.totals?.cases ?? 0} passed, ${duration(r.wallMs)}, ${ago(r.startedAt)}`;
      const bar = el('a', {
        href: r.url || REPORTS,
        class: [r.conclusion === 'failed' ? 'failed' : '', r.number === feed.run.number ? 'current' : '']
          .filter(Boolean)
          .join(' ') || undefined,
        title: label,
        'aria-label': label,
      });
      bar.style.height = `${Math.max(12, Math.round(((r.wallMs || 0) / longest) * 100))}%`;
      return bar;
    }),
  );
  const green = runs.filter((r) => r.conclusion === 'passed').length;
  card.querySelector('[data-history-note]').textContent =
    `${plural(runs.length, 'run')}, ${green} green · bar height is wall time` +
    (runs.length < 3 ? ' · this fills in as CI runs' : '');
  card.hidden = false;
}

/* ---------- go ---------- */

loadFeed()
  .then((feed) => {
    renderSummary(feed);
    const items = buildReplay(feed);
    renderCases(feed, items);
    return renderHistory(feed);
  })
  .catch((error) => renderError(error));
