import AxeBuilder from '@axe-core/playwright';
import { test, expect, PAGES } from './fixtures';

/**
 * An axe-core scan of every page, in both themes, once the suite's numbers have
 * rendered: the dynamic parts are where contrast and naming mistakes creep in.
 * Anything axe rates serious or critical fails the build.
 */
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    // Reduced motion, so nothing is scanned halfway through fading in: axe
    // would measure the contrast of a transition rather than of the page.
    test.use({ colorScheme: scheme, contextOptions: { reducedMotion: 'reduce' } });

    for (const { path } of PAGES) {
      test(`${path} has no serious accessibility violations`, async ({ page }) => {
        await page.goto(path);
        if (path === '/') await expect(page.locator('#heroRun')).toBeVisible();
        // With reduced motion the replay shows its finished state straight away.
        if (path === '/qa-suite.html') await expect(page.locator('#console .summary')).toBeVisible();

        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(
          serious.map((v) => `${v.id}: ${v.help} — ${v.nodes.map((n) => n.target.join(' ')).slice(0, 4).join(', ')}`),
        ).toEqual([]);
      });
    }
  });
}
