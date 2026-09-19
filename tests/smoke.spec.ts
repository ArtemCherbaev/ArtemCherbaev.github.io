import { test, expect, type Page } from "@playwright/test";

/**
 * What this suite is for: the deploy workflow waits on it, so anything asserted
 * here is something that must never reach the published site broken. It is
 * deliberately small. A smoke suite that takes four minutes stops being run
 * before a push, and then it is decoration.
 */

const PAGES = [
  { path: "/", title: /Artem Cherbaev/i, heading: "Artem Cherbaev" },
  { path: "/cv.html", title: /CV/i, heading: "Artem Cherbaev" },
  { path: "/qa-suite.html", title: /QA suites/i, heading: "Run the QA suites" },
];

/** Console errors are collected per page; a page that logs one is broken. */
function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("every page", () => {
  for (const { path, title, heading } of PAGES) {
    test(`${path} loads, titled and headed, with a clean console`, async ({
      page,
    }) => {
      const errors = collectConsoleErrors(page);

      const response = await page.goto(path);
      expect(response?.status(), `${path} should answer 200`).toBe(200);

      await expect(page).toHaveTitle(title);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toContainText(heading);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");

      expect(errors, `${path} logged console errors`).toEqual([]);
    });
  }
});

test("an unknown address answers 404 and offers the way back", async ({
  page,
}) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Nothing here",
  );
  await expect(
    page.getByRole("link", { name: /back to the portfolio/i }),
  ).toBeVisible();
});

test.describe("the landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("carries the sections the navigation promises", async ({ page }) => {
    for (const id of ["about", "experience", "projects", "contact"]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });

  test("shows both projects, each with a repository link", async ({ page }) => {
    const cards = page.locator(".project-card");
    await expect(cards).toHaveCount(2);
    await expect(
      page.getByRole("link", { name: /github repository/i }),
    ).toHaveCount(2);
  });

  test("the full role detail is in the document but hidden until asked for", async ({
    page,
  }) => {
    const extra = page.locator(".tl-extra");
    await expect(extra.first()).toBeHidden();

    const button = page.getByRole("button", { name: /show the full detail/i });
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await button.click();

    await expect(extra.first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /show less detail/i }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("the rest of the skills expand the same way", async ({ page }) => {
    const extra = page.locator(".t-extra");
    await expect(extra.first()).toBeHidden();
    await page
      .getByRole("button", { name: /show the rest of my skills/i })
      .click();
    await expect(extra.first()).toBeVisible();
  });

  test("the contact form opens on request and takes focus", async ({
    page,
  }) => {
    const form = page.locator("#contactForm");
    await expect(form).toBeHidden();

    await page.getByRole("button", { name: /open the contact form/i }).click();

    await expect(form).toBeVisible();
    await expect(page.locator("#cf-name")).toBeFocused();
    // Every field the form asks for is labelled, or a screen reader user is
    // filling in three anonymous boxes.
    for (const id of ["#cf-name", "#cf-email", "#cf-msg"]) {
      const field = page.locator(id);
      const labelFor = page.locator(`label[for="${id.slice(1)}"]`);
      await expect(labelFor).toHaveCount(1);
      await expect(field).toBeVisible();
    }
  });

  test("email and GitHub are reachable without opening anything", async ({
    page,
  }) => {
    await expect(
      page.getByRole("link", { name: "artemcherbaevjob@gmail.com" }),
    ).toHaveAttribute("href", "mailto:artemcherbaevjob@gmail.com");
    await expect(
      page.getByRole("link", { name: "github.com/artemcherbaev" }),
    ).toHaveAttribute("href", "https://github.com/artemcherbaev");
  });
});

test.describe("accessibility basics", () => {
  for (const { path } of PAGES) {
    test(`${path}: images are described and headings do not skip`, async ({
      page,
    }) => {
      await page.goto(path);

      const images = page.locator("img");
      const count = await images.count();
      for (let i = 0; i < count; i++) {
        await expect(images.nth(i)).toHaveAttribute("alt", /.+/);
      }

      const levels = await page.evaluate(() =>
        Array.from(document.querySelectorAll("h1,h2,h3,h4")).map((h) =>
          Number(h.tagName[1]),
        ),
      );
      let previous = levels[0] ?? 1;
      for (const level of levels) {
        expect(
          level - previous,
          `heading jumped from h${previous} to h${level}`,
        ).toBeLessThanOrEqual(1);
        previous = level;
      }
    });
  }

  test("the landing page can be reached by keyboard past the header", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip")).toBeFocused();
  });
});
