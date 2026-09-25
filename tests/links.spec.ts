import { test, expect, PAGES } from './fixtures';

/**
 * Every internal link and asset resolves; every external link is https.
 *
 * External links are checked for shape, not followed: a third party being down
 * is not a defect in this repository. The suite's own published site lives
 * under /agentic-playwright-suite/ and is deployed by another repository, so it
 * counts as external here too.
 */
const OTHER_REPOSITORY = '/agentic-playwright-suite/';

for (const { path } of PAGES) {
  test(`${path}: every internal link and asset resolves`, async ({ page, request, baseURL }) => {
    await page.goto(path);
    const urls = await page.evaluate(() => [
      ...[...document.querySelectorAll('a[href]')].map((a) => (a as HTMLAnchorElement).href),
      ...[...document.querySelectorAll('link[href]')].map((l) => (l as HTMLLinkElement).href),
      ...[...document.querySelectorAll('script[src], img[src]')].map((n) => (n as HTMLImageElement).src),
    ]);

    const internal = [
      ...new Set(
        urls
          .filter((u) => u.startsWith(baseURL!))
          .map((u) => u.split('#')[0]!)
          .filter((u) => !new URL(u).pathname.startsWith(OTHER_REPOSITORY)),
      ),
    ];
    expect(internal.length).toBeGreaterThan(3);

    for (const url of internal) {
      const response = await request.get(url);
      expect(response.status(), url).toBe(200);
    }
  });

  test(`${path}: every external link is https and every fragment exists`, async ({ page, baseURL }) => {
    await page.goto(path);
    const links = await page.locator('a[href]').evaluateAll((nodes) =>
      nodes.map((a) => ({ href: a.getAttribute('href')!, resolved: (a as HTMLAnchorElement).href })),
    );
    for (const { href, resolved } of links) {
      if (href.startsWith('mailto:')) continue;
      if (!resolved.startsWith(baseURL!)) {
        expect(resolved, href).toMatch(/^https:\/\//);
        continue;
      }
      const url = new URL(resolved);
      if (url.hash && url.pathname === new URL(page.url()).pathname) {
        await expect(page.locator(url.hash), `${href} points at nothing`).toHaveCount(1);
      }
    }
  });
}

test('the CV downloads as a PDF', async ({ request }) => {
  const response = await request.get('/assets/cv/Artem-Cherbaev-CV.pdf');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('application/pdf');
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
});

test('the stylesheet is applied, not merely downloaded', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('font-family', /Geist/);
  await expect(page.locator('.btn-primary').first()).toHaveCSS('border-radius', '999px');
});
