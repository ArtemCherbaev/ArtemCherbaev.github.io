/**
 * Behaviour shared by every page. Progressive enhancement throughout: without
 * this script every page still reads top to bottom, every link works, and the
 * suite's numbers are replaced by links to where they are published.
 */
import { loadFeed, loadHistory, ago, duration, laneName, caseRef, plural, el } from './feed.js';

const root = document.documentElement;
root.classList.add('js');

/* ---------- theme ---------- */

const themeToggle = document.getElementById('themeToggle');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function currentTheme() {
  return root.getAttribute('data-theme') ?? (systemDark.matches ? 'dark' : 'light');
}

function labelThemeToggle() {
  if (!themeToggle) return;
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  themeToggle.setAttribute('aria-label', `Switch to the ${next} theme`);
  themeToggle.title = `Switch to the ${next} theme`;
}

themeToggle?.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try {
    localStorage.setItem('theme', next);
  } catch {
    // The choice holds for this page view only.
  }
  labelThemeToggle();
});
systemDark.addEventListener?.('change', labelThemeToggle);
labelThemeToggle();

/* ---------- header ---------- */

const header = document.getElementById('siteHeader');
const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const nav = document.getElementById('siteNav');
const menuBtn = document.getElementById('menuBtn');

function setMenu(open) {
  nav?.classList.toggle('open', open);
  menuBtn?.setAttribute('aria-expanded', String(open));
  menuBtn?.setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu');
}

menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
nav?.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuBtn?.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuBtn.focus();
  }
});

// Mark the section currently on screen in the navigation.
const sectionLinks = new Map(
  [...(nav?.querySelectorAll('a[href^="#"]') ?? [])].map((a) => [a.getAttribute('href').slice(1), a]),
);
if (sectionLinks.size && 'IntersectionObserver' in window) {
  const inView = new Set();
  const order = [...sectionLinks.keys()];
  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) inView.add(entry.target.id);
        else inView.delete(entry.target.id);
      }
      const current = order.find((id) => inView.has(id));
      for (const [id, link] of sectionLinks) {
        if (id === current) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  for (const id of sectionLinks.keys()) {
    const section = document.getElementById(id);
    if (section) spy.observe(section);
  }
}

/* ---------- reveal on scroll ---------- */

const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  reveals.forEach((node) => io.observe(node));
} else {
  reveals.forEach((node) => node.classList.add('in'));
}

/* ---------- copy ---------- */

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers, or a page without clipboard permission.
    const area = el('textarea', { class: 'sr-only', 'aria-hidden': 'true' });
    area.value = text;
    document.body.append(area);
    area.select();
    const ok = document.execCommand?.('copy') ?? false;
    area.remove();
    return ok;
  }
}

for (const button of document.querySelectorAll('button[data-copy]')) {
  const label = button.querySelector('span');
  const original = label?.textContent ?? '';
  button.addEventListener('click', async () => {
    const ok = await copyText(button.dataset.copy);
    button.classList.toggle('done', ok);
    if (label) label.textContent = ok ? 'Copied' : 'Press Ctrl+C';
    setTimeout(() => {
      button.classList.remove('done');
      if (label) label.textContent = original;
    }, 2200);
  });
}

/* ---------- the email composer ---------- */

const composer = document.getElementById('composer');
if (composer) {
  const to = 'artemcherbaevjob@gmail.com';
  const mailLink = document.getElementById('composeMail');
  const copyButton = document.getElementById('composeCopy');
  const status = document.getElementById('composeStatus');
  const field = (name) => composer.elements.namedItem(name);

  const draft = () => {
    const name = field('name').value.trim();
    const company = field('company').value.trim();
    const topic = field('topic').value;
    const message = field('message').value.trim();
    const from = [name, company].filter(Boolean).join(', ');
    const subject = from ? `${topic} — ${from}` : `${topic} — via your portfolio`;
    const signature = from ? `\n\n${from}` : '';
    return { subject, body: `${message || 'Hi Artem,'}${signature}` };
  };

  const refresh = () => {
    const { subject, body } = draft();
    mailLink.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  composer.addEventListener('input', refresh);
  composer.addEventListener('change', refresh);
  composer.addEventListener('submit', (event) => event.preventDefault());
  copyButton?.addEventListener('click', async () => {
    const { subject, body } = draft();
    const ok = await copyText(`To: ${to}\nSubject: ${subject}\n\n${body}`);
    status.textContent = ok
      ? `Copied. Paste it into any email to ${to}.`
      : `Copying is blocked here; the address is ${to}.`;
  });
  refresh();
}

/* ---------- the suite's last run ---------- */

const pill = document.getElementById('statusPill');
const heroRun = document.getElementById('heroRun');
const live = document.getElementById('suiteLive');

function runSummary(feed) {
  const t = feed.totals;
  const parts = [];
  if (t.failed) parts.push(`${t.failed} failed`);
  if (t.flaky) parts.push(`${t.flaky} flaky`);
  if (t.parked) parts.push(`${t.parked} parked`);
  const missing = feed.lanes.filter((l) => l.missing).length;
  if (missing) parts.push(`${plural(missing, 'lane')} missing`);
  return parts;
}

function renderPill(feed) {
  if (!pill) return;
  const failed = feed.run.conclusion === 'failed';
  pill.querySelector('.dot')?.classList.add(failed ? 'failed' : 'passed');
  const text = pill.querySelector('.pill-text');
  text.replaceChildren(
    el('span', { class: 'pill-long' }, failed ? `${feed.totals.failed || 'some'} failing · ` : 'suite passing · '),
    `run #${feed.run.number}`,
  );
  pill.title = `The Agentic Playwright Suite's last CI run ${failed ? 'failed' : 'passed'}. Watch it replayed.`;
  pill.hidden = false;
}

async function renderHeroRun(feed) {
  if (!heroRun) return;
  const failed = feed.run.conclusion === 'failed';
  heroRun.querySelector('[data-run-dot]').classList.add(failed ? 'failed' : 'passed');
  const when = heroRun.querySelector('[data-run-when]');
  when.textContent = ago(feed.generatedAt);
  when.title = feed.generatedAt;
  heroRun.querySelector('[data-run-passed]').textContent = String(feed.totals.passed);
  const rest = runSummary(feed);
  heroRun.querySelector('[data-run-summary]').textContent =
    `of ${feed.totals.cases} passed` + (rest.length ? ` · ${rest.join(' · ')}` : '');
  heroRun
    .querySelector('[data-run-foot]')
    .replaceChildren(
      `run #${feed.run.number} · ${feed.run.commit} · ${duration(feed.run.wallMs)}`,
      el('span', { class: 'go' }, 'Watch the replay →'),
    );

  const runs = (await loadHistory()).slice(-24);
  const spark = heroRun.querySelector('[data-run-spark]');
  if (runs.length) {
    const longest = Math.max(...runs.map((r) => r.wallMs || 0), 1);
    spark.replaceChildren(
      ...runs.map((r) => {
        const bar = el('span', { class: r.conclusion === 'failed' ? 'failed' : undefined });
        bar.style.height = `${Math.max(18, Math.round(((r.wallMs || 0) / longest) * 100))}%`;
        return bar;
      }),
    );
  } else {
    spark.remove();
  }
  heroRun.setAttribute(
    'aria-label',
    `Last CI run of the suite: ${feed.totals.passed} of ${feed.totals.cases} passed, ${ago(feed.generatedAt)}. Watch it replayed.`,
  );
  heroRun.hidden = false;
}

function renderLive(feed) {
  if (!live) return;
  const failed = feed.run.conclusion === 'failed';
  live.querySelector('[data-live-dot]').classList.add(failed ? 'failed' : 'passed');
  const when = live.querySelector('[data-live-when]');
  when.textContent = ago(feed.generatedAt);
  when.title = feed.generatedAt;

  const lanes = feed.lanes.map((lane) => {
    const ran = lane.cases.filter((c) => c.status !== 'parked' && c.status !== 'skipped').length;
    const count = lane.missing
      ? 'no report'
      : `${lane.totals.passed}/${ran} passed${lane.totals.parked ? ` · ${lane.totals.parked} parked` : ''}`;
    const ordered = [...lane.cases].sort((a, b) => caseRef(a).localeCompare(caseRef(b), 'en', { numeric: true }));
    return el(
      'div',
      { class: 'lane-mini' },
      el('div', { class: 'lane-mini-top' }, el('span', {}, laneName(lane)), el('span', { class: 'count' }, count)),
      el(
        'div',
        { class: 'cells', role: 'img', 'aria-label': `${laneName(lane)}: ${count}` },
        lane.missing
          ? Array.from({ length: 12 }, () => el('span', { class: 'cell missing' }))
          : ordered.map((c) =>
              el('span', {
                class: `cell ${c.status}`,
                title: `${caseRef(c)} ${c.title} · ${c.status}${c.status === 'parked' ? '' : ` · ${duration(c.durationMs)}`}`,
              }),
            ),
      ),
    );
  });
  live.querySelector('[data-live-lanes]').replaceChildren(...lanes);

  // What the run looked like, beyond pass and fail: its size and its slowest cases.
  const ran = feed.lanes.flatMap((lane) =>
    lane.cases.filter((c) => c.status !== 'parked' && c.status !== 'skipped').map((c) => ({ c, lane })),
  );
  const workers = feed.lanes.reduce((sum, lane) => sum + (lane.workers || 0), 0);
  const stats = live.querySelector('[data-live-stats]');
  stats?.replaceChildren(
    ...[
      ['Wall time', duration(feed.run.wallMs)],
      ['Cases run', String(ran.length)],
      ['Workers', String(workers)],
      ['Retries', String(ran.filter(({ c }) => c.attempts > 1).length)],
    ].map(([k, v]) => el('div', {}, el('dt', {}, k), el('dd', {}, v))),
  );
  const slow = live.querySelector('[data-live-slow]');
  if (slow) {
    const slowest = [...ran].sort((a, b) => b.c.durationMs - a.c.durationMs).slice(0, 4);
    slow.replaceChildren(
      el('p', { class: 'slow-title' }, 'Slowest cases'),
      ...slowest.map(({ c, lane }) =>
        el(
          'p',
          { class: 'slow-row' },
          el('span', { class: 'slow-id' }, caseRef(c)),
          el('span', { class: 'slow-t' }, `${c.title} · ${laneName(lane)}`),
          el('span', { class: 'slow-d' }, duration(c.durationMs)),
        ),
      ),
    );
    slow.hidden = slowest.length === 0;
  }

  const run = live.querySelector('[data-live-run]');
  const label = `run #${feed.run.number} · ${feed.run.commit}`;
  run.replaceChildren(feed.run.url ? el('a', { href: feed.run.url }, label) : label);
}

if (pill || heroRun || live) {
  loadFeed()
    .then((feed) => {
      renderPill(feed);
      renderLive(feed);
      return renderHeroRun(feed);
    })
    .catch(() => {
      // The page already carries links to the published reports; nothing to undo.
      live?.querySelector('[data-live-lanes] .live-empty')?.append(
        ' The feed could not be loaded just now, but the dashboard below always has the last run.',
      );
    });
}

/* ---------- what this deploy passed ---------- */

const buildNote = document.getElementById('buildNote');
if (buildNote) {
  fetch('build.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((build) => {
      if (!build?.checks?.passed) return;
      const text = `Deployed ${ago(build.deployedAt)} after ${plural(build.checks.passed, 'check')} passed`;
      buildNote.replaceChildren(
        el('span', { class: 'dot passed', 'aria-hidden': 'true' }),
        build.runUrl ? el('a', { href: build.runUrl }, text) : text,
      );
    })
    .catch(() => {
      // Not deployed by CI (a local preview): the default text stays.
    });
}
