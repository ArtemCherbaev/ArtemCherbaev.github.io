import { test, expect, PAGES } from './fixtures';

/**
 * Every published page: it answers, it is titled, it has one h1, it declares
 * its language and canonical address, and nothing on it breaks the console
 * (checked by the fixture after every test).
 */
for (const { path, title } of PAGES) {
  test.describe(path, () => {
    test('answers 200 and is titled', async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
    });

    test('has exactly one h1, a language, a description and a canonical address', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^.{80,}$/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        new RegExp(`^https://artemcherbaev\\.github\\.io${path === '/' ? '/$' : path.replace('.', '\\.')}`),
      );
    });

    test('headings never skip a level', async ({ page }) => {
      await page.goto(path);
      const levels = await page
        .locator('h1, h2, h3, h4, h5, h6')
        .evaluateAll((nodes) => nodes.map((n) => Number(n.tagName[1])));
      for (let i = 1; i < levels.length; i += 1) {
        expect(levels[i]! - levels[i - 1]!, `h${levels[i - 1]} followed by h${levels[i]}`).toBeLessThanOrEqual(1);
      }
    });

    test('fits the screen without scrolling sideways', async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}

test.describe('a missing page', () => {
  // The browser logs the 404 status of the document itself; that is the point here.
  test.use({ allowConsoleErrors: true });

  test('answers 404, and offers a way back', async ({ page }) => {
    const response = await page.goto('/no/such/page');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('failed its existence check');
    // Nested deeper than the site root, and still styled: the page uses absolute paths.
    await expect(page.locator('.btn-primary')).toHaveCSS('border-radius', '999px');
    await page.getByRole('link', { name: 'Go to the home page' }).click();
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
  });
});

test('the theme follows the system until chosen, and the choice survives a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const dark = await background();

  await page.getByRole('button', { name: 'Switch to the light theme' }).click();
  const light = await background();
  expect(light).not.toBe(dark);

  await page.reload();
  expect(await background()).toBe(light);
  await expect(page.getByRole('button', { name: 'Switch to the dark theme' })).toBeVisible();
});
