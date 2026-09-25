import { test, expect, recorded } from './fixtures';

/**
 * The home page: the numbers it borrows from the suite's last run, the contact
 * paths, and the navigation on both screen sizes.
 */
test.describe('the suite widgets, from a passing run', () => {
  test('the hero card states the run and links to the replay', async ({ page }) => {
    const feed = recorded('passed');
    await page.goto('/');
    const card = page.locator('#heroRun');
    await expect(card).toBeVisible();
    await expect(card).toContainText(`${feed.totals.passed}`);
    await expect(card).toContainText(`of ${feed.totals.cases} passed · ${feed.totals.parked} parked`);
    await expect(card).toContainText(`run #${feed.run.number}`);
    await expect(card.locator('[data-run-spark] span')).toHaveCount(recorded('passed', 'history').runs.length);
    await card.click();
    await expect(page).toHaveURL(/qa-suite\.html$/);
  });

  test('the header pill says the suite is passing', async ({ page }) => {
    await page.goto('/');
    const pill = page.locator('#statusPill');
    await expect(pill).toBeVisible();
    await expect(pill).toContainText('run #42');
    await expect(pill.locator('.dot')).toHaveClass(/passed/);
  });

  test('the live panel draws every case of every lane', async ({ page }) => {
    const feed = recorded('passed');
    await page.goto('/#work');
    const lanes = page.locator('#suiteLive .lane-mini');
    await expect(lanes).toHaveCount(feed.lanes.length);
    for (const [i, lane] of feed.lanes.entries()) {
      await expect(lanes.nth(i).locator('.cell')).toHaveCount(lane.cases.length);
    }
    await expect(page.locator('#suiteLive [data-live-lanes] .cell.parked')).toHaveCount(feed.totals.parked);
    await expect(page.locator('#suiteLive [data-live-stats]')).toContainText('Wall time');
    await expect(page.locator('#suiteLive .slow-row')).toHaveCount(4);
  });
});

test.describe('the suite widgets, from a failing run', () => {
  test.use({ feed: 'failed' });

  test('the header pill and the hero card say so', async ({ page }) => {
    const feed = recorded('failed');
    await page.goto('/');
    await expect(page.locator('#statusPill .dot')).toHaveClass(/failed/);
    await expect(page.locator('#heroRun')).toContainText(`${feed.totals.failed} failed`);
    await expect(page.locator('#suiteLive [data-live-lanes] .cell.failed')).toHaveCount(feed.totals.failed);
  });
});

for (const feed of ['unavailable', 'malformed'] as const) {
  test.describe(`when the feed is ${feed}`, () => {
    test.use({ feed, allowConsoleErrors: feed === 'unavailable' });

    test('no numbers are shown, and the links to the reports remain', async ({ page }) => {
      await page.goto('/#work');
      await expect(page.locator('#suiteLive')).toContainText('could not be loaded');
      await expect(page.locator('#statusPill')).toBeHidden();
      await expect(page.locator('#heroRun')).toBeHidden();
      await expect(page.locator('#suiteLive').getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
        'href',
        'https://artemcherbaev.github.io/agentic-playwright-suite/',
      );
    });
  });
}

test.describe('getting in touch', () => {
  test('the composer drafts the email with what was typed', async ({ page }) => {
    await page.goto('/#contact');
    await page.getByLabel('Your name').fill('Jane Doe');
    await page.getByLabel('Company').fill('Acme & Co');
    await page.getByLabel('What is it about').selectOption('A role');
    await page.getByLabel('Message').fill('We are hiring an SDET.\nInterested?');

    const href = await page.getByRole('link', { name: 'Open in your email app' }).getAttribute('href');
    const url = new URL(href!);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('artemcherbaevjob@gmail.com');
    expect(url.searchParams.get('subject')).toBe('A role — Jane Doe, Acme & Co');
    expect(url.searchParams.get('body')).toBe('We are hiring an SDET.\nInterested?\n\nJane Doe, Acme & Co');
  });

  test('the email address copies to the clipboard', async ({ page, context, browserName }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Clipboard permissions are a desktop Chromium matter');
    test.skip(browserName !== 'chromium', 'Clipboard permissions are Chromium only');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/#contact');
    // Located by what it copies, not by its label: the label is what changes.
    const copy = page.locator('.contact-list button[data-copy]');
    await expect(copy).toHaveAccessibleName('Copy');
    await copy.click();
    await expect(copy).toContainText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('artemcherbaevjob@gmail.com');
  });

  test('the CV is offered as a download and online', async ({ page }) => {
    await page.goto('/#contact');
    await expect(page.locator('.contact-list a[download]')).toHaveAttribute('href', 'assets/cv/Artem-Cherbaev-CV.pdf');
    await expect(page.locator('.contact-list').getByRole('link', { name: 'Read online' })).toHaveAttribute(
      'href',
      'cv.html',
    );
  });
});

test.describe('navigation', () => {
  test('on a phone, the menu opens, leads somewhere and closes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'The menu only exists on narrow screens');
    await page.goto('/');
    const menu = page.getByRole('button', { name: 'Open the menu' });
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav).toBeHidden();
    await menu.click();
    await expect(nav).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close the menu' })).toHaveAttribute('aria-expanded', 'true');
    await nav.getByRole('link', { name: 'Skills' }).click();
    await expect(nav).toBeHidden();
    await expect(page).toHaveURL(/#skills$/);
  });

  test('on a desktop, the section in view is marked in the navigation', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'The inline navigation only exists on wide screens');
    await page.goto('/');
    await page.locator('#skills').scrollIntoViewIfNeeded();
    await page.evaluate(() => document.getElementById('skills')!.scrollIntoView({ block: 'center' }));
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Skills' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  test('the skip link reaches the content first', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
  });
});
