import { test, expect } from "@playwright/test";

/**
 * Every internal link and asset on the site resolves.
 *
 * This is the check that catches the class of mistake a static site actually
 * makes: a renamed file, a stylesheet that stopped loading, a CV that was never
 * committed. External links are not followed, because a third party being down
 * is not a defect in this repository.
 */

const PAGES = ["/", "/cv.html", "/qa-suite.html", "/404.html"];

/**
 * Assets known to be missing and deliberately not failing the suite yet. Empty,
 * and it should stay that way: an allowance that outlives its reason is how a
 * suite stops meaning anything. The CV PDF was the last entry here and is now
 * committed, so the check enforces it like every other link.
 */
const PENDING: string[] = [];

test.describe("internal links and assets resolve", () => {
  for (const path of PAGES) {
    test(`${path}`, async ({ page, request, baseURL }) => {
      await page.goto(path);

      const hrefs = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLElement>(
            "a[href], link[href], script[src], img[src]",
          ),
        )
          .map((el) => el.getAttribute("href") ?? el.getAttribute("src") ?? "")
          .filter(Boolean),
      );

      const internal = hrefs
        .filter((href) => !/^(https?:|mailto:|tel:|data:|#)/.test(href))
        .map((href) => href.split("#")[0])
        .filter(Boolean);

      const unique = [...new Set(internal)];
      expect(unique.length, `${path} should link to something`).toBeGreaterThan(
        0,
      );

      const broken: string[] = [];
      for (const href of unique) {
        if (PENDING.some((pending) => href.startsWith(pending))) {
          test
            .info()
            .annotations.push({ type: "pending asset", description: href });
          continue;
        }
        const url = new URL(href, new URL(path, baseURL).href).href;
        const response = await request.get(url);
        if (!response.ok()) broken.push(`${href} -> ${response.status()}`);
      }

      expect(broken, `${path} has links that do not resolve`).toEqual([]);
    });
  }
});

test("the stylesheet actually applied, not just downloaded", async ({
  page,
}) => {
  await page.goto("/");
  // A 200 on the CSS proves nothing if the selector never matched. The hero name
  // is the one element whose look is unmistakable when the sheet is live.
  const family = await page
    .locator(".hero h1")
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toContain("Allura");
});

test("the published site declares where it lives", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://artemcherbaev.github.io/portfolio/",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /.{80,}/,
  );
});
