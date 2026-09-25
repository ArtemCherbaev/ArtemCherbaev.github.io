import { test as base, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Every test gets two things for free.
 *
 * The suite's run feed, answered from a recording. The pages fetch it from the
 * same origin, and in production another repository publishes it; here it is
 * always one of the recorded feeds in tests/fixtures/feed, so a test says which
 * run it is about instead of depending on whatever CI last did.
 *
 * A console that has to stay clean. A page that logs an error has a defect even
 * when everything visible looks right: a Content Security Policy refusing a
 * style, a script throwing halfway through. Tests that provoke an error on
 * purpose say so with `allowConsoleErrors`.
 */

export type FeedName = 'passed' | 'failed' | 'unavailable' | 'malformed';

const FEEDS = fileURLToPath(new URL('./fixtures/feed/', import.meta.url));

export function recorded(name: 'passed' | 'failed', file: 'latest' | 'history' = 'latest') {
  return JSON.parse(readFileSync(join(FEEDS, name, `${file}.json`), 'utf8'));
}

async function serveFeed(page: Page, name: FeedName) {
  await page.route('**/agentic-playwright-suite/feed/*.json', async (route) => {
    const file = route.request().url().endsWith('history.json') ? 'history' : 'latest';
    if (name === 'unavailable') {
      await route.fulfill({ status: 503, contentType: 'text/plain', body: 'Service Unavailable' });
    } else if (name === 'malformed') {
      await route.fulfill({ json: { schema: 'apw-feed/0', lanes: 'not a list' } });
    } else {
      await route.fulfill({ json: recorded(name, file) });
    }
  });
}

interface Fixtures {
  feed: FeedName;
  allowConsoleErrors: boolean;
  consoleErrors: string[];
}

export const test = base.extend<Fixtures>({
  feed: ['passed', { option: true }],
  allowConsoleErrors: [false, { option: true }],

  consoleErrors: [
    async ({ page, feed, allowConsoleErrors }, use) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`));
      await serveFeed(page, feed);

      await use(errors);

      if (!allowConsoleErrors) {
        expect(errors, 'the browser console logged errors').toEqual([]);
      }
    },
    { auto: true },
  ],
});

export { expect };

/** The pages the site publishes, and what each is for. */
export const PAGES = [
  { path: '/', title: /Artem Cherbaev — QA Engineer/ },
  { path: '/qa-suite.html', title: /Agentic Playwright Suite/ },
  { path: '/cv.html', title: /CV — Artem Cherbaev/ },
] as const;
