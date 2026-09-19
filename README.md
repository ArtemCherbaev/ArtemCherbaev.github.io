# Portfolio

Personal landing page and CV for Artem Cherbaev, published with GitHub Pages.

Hand written: four HTML pages, one stylesheet, one script, no framework and no build step. What is in
the repository is what Pages serves. The only machinery is a Playwright smoke suite, and it gates the
deploy, so a page that fails it is not published.

Live at <https://artemcherbaev.github.io/portfolio/> once Pages is enabled.

## Run it

```bash
corepack enable
yarn install
yarn playwright:install
yarn serve            # http://127.0.0.1:4173
yarn test             # the smoke suite, starts the server itself
```

`yarn test` runs the suite on desktop Chromium and on a Pixel 7 viewport. The second project is not
decoration: the navigation collapses below 680px and the hero reorders, and both have broken before.

## What the suite checks

| File                                     | Covers                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| [`tests/smoke.spec.ts`](tests/smoke.spec.ts) | Each page answers 200, is titled, has exactly one `h1`, logs no console error. The expanders, the contact form and its labels, the 404 page, heading order, alt text, the skip link. |
| [`tests/links.spec.ts`](tests/links.spec.ts) | Every internal link and asset resolves. That the stylesheet applied rather than merely downloaded. The canonical URL and the meta description. |

External links are not followed. A third party being down is not a defect in this repository.

## Structure

```
index.html         Landing page: hero, about, experience, skills, impact, projects, contact
cv.html            Full career history, print styled as the fallback for the PDF
qa-suite.html      How to run the test suite project, and what each published report answers
404.html           Served with a 404 status by Pages and by the local server
assets/css/        styles.css owns the tokens; pages.css is the sub pages and print
assets/js/         One progressive enhancement script. The site works without it.
assets/img/        Favicon and portrait
assets/cv/         Drop Artem-Cherbaev-CV.pdf here
scripts/serve.mjs  Dependency free static server, used by the suite and by yarn serve
tests/             The smoke suite
```

## Before this goes live

Content that is still a placeholder is marked in the pages with the `.todo` class, which renders as
amber dotted text so nothing unfinished can ship unnoticed. The full list is in
[`PLACEHOLDERS.md`](PLACEHOLDERS.md).

Two more steps that are not content:

1. **Pages.** Settings, Pages, Source: GitHub Actions. The workflow does the rest.
2. **The contact form.** `index.html` points at `https://formspree.io/f/REPLACE_ME`. Until that is a
   real endpoint the form is inert on purpose, rather than quietly dropping mail.

## Why it looks like this

The design owes its layout and palette to the portfolio of
[Emanuela Telescu](https://ella79.github.io/portfolio/), which is worth reading on its own terms. The
code here is written from scratch and the content is mine.

## Licence

Code MIT, content all rights reserved. See [`LICENSE.md`](LICENSE.md).
