# Placeholders

Almost everything is now filled in from the CV. What is left is either a fact the CV does not state
or a file only you can supply.

In the browser the remaining text placeholders render amber with a dotted underline (`.todo` in
`assets/css/styles.css`), so an unfinished page stays obvious rather than plausible. Grep for what is
left at any point:

```bash
grep -rn "todo" index.html cv.html
```

## Two dates the CV does not give

Both are in the skills timeline in [`index.html`](index.html). The CV says the Playwright migration
happened "as the front end matured" and that AI-assisted QA was "pioneered", without dating either.

| Row                                             | What to write                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Playwright, TypeScript and Python               | The month and year you led the migration, and the duration. Then set the bar's `from-YYYY` class. |
| AI-assisted and agentic QA, Claude Code and MCP | The month and year you started, and the duration. Same class on the bar.                          |

The bar classes are `from-2021` through `from-2026`, defined at the bottom of
[`assets/css/styles.css`](assets/css/styles.css). The axis runs 2021 to now, so each year is a fifth
of the track. Currently Playwright is drawn from 2023 and AI-assisted QA from 2025; correct both to
the real years and delete the `todo` class from the two `<small>` labels and the two durations.

## Files and accounts

| What                               | Why it matters                                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `assets/img/portrait.svg`          | Currently a monogram placeholder reading "replace with a photo". Swap in a square photograph; it is cropped to a circle at 258px. Keep the filename or update the three pages that reference it. |
| Formspree endpoint in `index.html` | `action="https://formspree.io/f/REPLACE_ME"`. Until it is real the contact form is inert on purpose, rather than quietly dropping mail. Email and LinkedIn work regardless.                      |
| `artemcherbaev` in URLs            | If your GitHub username differs, it appears in both HTML pages, `robots.txt`, `sitemap.xml`, the README and `tests/links.spec.ts`.                                                               |

## Two judgement calls worth checking

**The title.** The site says "QA Engineer, manual and automation", which is what your CV says. The
contact section says you are open to QA Automation Engineer and SDET roles, which is a statement
about what you want rather than a claim about what you were. If you would rather lead with a senior
title, change the `.role` line in `index.html` and the `.sub` line in `cv.html` — but the CV a
recruiter opens two clicks later should agree with it.

**The email.** The site uses `artemcherbaevjob@gmail.com`, the address on the CV, not the personal
one. `tests/smoke.spec.ts` asserts it, so changing it fails the suite until the test is updated too,
which is the intended behaviour.
