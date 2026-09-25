import { test, expect, recorded } from './fixtures';

/**
 * The runner page against recorded feeds: a passing run, a failing one, and a
 * feed that cannot be read. The page must never show a number the feed did not
 * contain, and must never show nothing at all.
 */
const nonParked = (feed: ReturnType<typeof recorded>) =>
  feed.lanes.flatMap((l: { cases: { status: string }[] }) => l.cases).filter((c: { status: string }) => c.status !== 'parked' && c.status !== 'skipped').length;

test.describe('a passing run', () => {
  test('the summary states the run exactly as recorded', async ({ page }) => {
    const feed = recorded('passed');
    await page.goto('/qa-suite.html');
    const summary = page.locator('#runSummary');
    await expect(summary.locator('[data-badge]')).toHaveText('Passed');
    await expect(summary.getByRole('heading', { name: `Run #${feed.run.number}` })).toBeVisible();
    await expect(summary.locator('.t-cases dd')).toHaveText(String(feed.totals.cases));
    await expect(summary.locator('.t-passed dd')).toHaveText(String(feed.totals.passed));
    await expect(summary.locator('.t-failed dd')).toHaveText('0');
    await expect(summary.locator('.t-parked dd')).toHaveText(String(feed.totals.parked));
    await expect(summary.getByRole('link', { name: feed.run.commit })).toHaveAttribute('href', feed.run.commitUrl);
    await expect(page).toHaveTitle(`Run #${feed.run.number} passed — Agentic Playwright Suite`);
  });

  test('the timeline has one block per case that ran and one marker per parked case', async ({ page }) => {
    const feed = recorded('passed');
    await page.goto('/qa-suite.html');
    await expect(page.locator('#timeline .lane')).toHaveCount(feed.lanes.length);
    await expect(page.locator('#timeline .block')).toHaveCount(nonParked(feed));
    await expect(page.locator('#timeline .marker')).toHaveCount(feed.totals.parked);
  });

  test('skipping to the end finishes every case and writes the summary', async ({ page }) => {
    const feed = recorded('passed');
    await page.goto('/qa-suite.html');
    await page.getByRole('button', { name: 'Skip to the end' }).click();
    await expect(page.locator('#timeline .block.done')).toHaveCount(nonParked(feed));
    await expect(page.locator('#console .summary')).toContainText(
      `${feed.totals.cases} cases: ${feed.totals.passed} passed, ${feed.totals.parked} parked. Run #${feed.run.number} passed`,
    );
    await expect(page.locator('#console .line')).toHaveCount(feed.totals.cases);
    await expect(page.getByRole('button', { name: 'Replay again' })).toBeVisible();
  });

  test('the replay plays, pauses and can be restarted', async ({ page }) => {
    await page.goto('/qa-suite.html');
    const play = page.locator('#playBtn');
    // It starts on its own once scrolled into view; pause it, then resume.
    await page.locator('#replay').scrollIntoViewIfNeeded();
    await expect(play).toContainText('Pause');
    await play.click();
    await expect(play).toContainText('Resume');
    const paused = await page.locator('#clock').textContent();
    await page.waitForTimeout(400);
    await expect(page.locator('#clock')).toHaveText(paused!);
    await page.getByRole('button', { name: 'Replay from the start' }).click();
    await expect(play).toContainText('Pause');
  });

  test('filters and search narrow the table', async ({ page }) => {
    const feed = recorded('passed');
    await page.goto('/qa-suite.html');
    const rows = page.locator('#caseRows tr');
    await expect(rows).toHaveCount(feed.totals.cases);

    await page.locator('#filters').getByRole('button', { name: /REST API/ }).click();
    await expect(rows).toHaveCount(feed.lanes.find((l: { key: string }) => l.key === 'api').cases.length);

    await page.locator('#filters').getByRole('button', { name: /All/ }).click();
    // Search reads the id, the title and the area a case belongs to.
    await page.getByPlaceholder('Search cases').fill('cart');
    const expected = feed.lanes
      .flatMap((l: { cases: { id: string; title: string; area: string }[] }) => l.cases)
      .filter((c: { id: string; title: string; area: string }) => `${c.id} ${c.title} ${c.area}`.toLowerCase().includes('cart'));
    expect(expected.length).toBeGreaterThan(0);
    await expect(rows).toHaveCount(expected.length);

    await page.getByPlaceholder('Search cases').fill('nothing matches this');
    await expect(rows).toHaveCount(0);
    await expect(page.getByText('No case matches.')).toBeVisible();
  });

  test('each case links to its source at the commit that ran', async ({ page }) => {
    const feed = recorded('passed');
    const sha = feed.run.commitUrl.split('/').pop();
    await page.goto('/qa-suite.html');
    const first = page.locator('#caseRows tr').first().locator('a');
    await expect(first).toHaveAttribute(
      'href',
      new RegExp(`^https://github\\.com/ArtemCherbaev/agentic-playwright-suite/blob/${sha}/tests/.+\\.spec\\.ts#L\\d+$`),
    );
  });

  test('the history shows every recorded run, the current one marked', async ({ page }) => {
    const history = recorded('passed', 'history');
    await page.goto('/qa-suite.html');
    await expect(page.locator('#historyBars a')).toHaveCount(history.runs.length);
    await expect(page.locator('#historyBars a.current')).toHaveCount(1);
    await expect(page.locator('#historyBars a.failed')).toHaveCount(
      history.runs.filter((r: { conclusion: string }) => r.conclusion === 'failed').length,
    );
  });
});

test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the finished run is shown straight away, without playing', async ({ page }) => {
    const feed = recorded('passed');
    await page.goto('/qa-suite.html');
    await expect(page.locator('#timeline .block.done')).toHaveCount(nonParked(feed));
    await expect(page.locator('#playBtn')).toContainText('Replay again');
  });
});

test.describe('a failing run', () => {
  test.use({ feed: 'failed' });

  test('opens on the failures, with their errors', async ({ page }) => {
    const feed = recorded('failed');
    await page.goto('/qa-suite.html');
    await expect(page.locator('#runSummary [data-badge]')).toHaveText('Failed');
    await expect(page.locator('#runSummary .t-failed dd')).toHaveText(String(feed.totals.failed));
    await expect(page.locator('#filters').getByRole('button', { name: /Failed/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#caseRows tr')).toHaveCount(feed.totals.failed);
    await expect(page.locator('#caseRows .case-error').first()).not.toBeEmpty();
    await expect(page.locator('#timeline .block.failed')).toHaveCount(feed.totals.failed);
    await expect(page).toHaveTitle(/failed/);
  });
});

for (const feed of ['unavailable', 'malformed'] as const) {
  test.describe(`when the feed is ${feed}`, () => {
    test.use({ feed, allowConsoleErrors: feed === 'unavailable' });

    test('says so, and points at the reports instead', async ({ page }) => {
      await page.goto('/qa-suite.html');
      await expect(page.locator('#runSummary')).toHaveAttribute('data-state', 'error');
      await expect(page.getByRole('heading', { name: 'The run feed could not be loaded' })).toBeVisible();
      await expect(page.locator('#replay')).toBeHidden();
      await expect(page.locator('#cases')).toBeHidden();
      await expect(page.getByRole('link', { name: /Results dashboard/ })).toBeVisible();
    });
  });
}
