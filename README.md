# artemcherbaev.github.io

Portfolio and CV of Artem Cherbaev, QA Engineer — and a page that replays the last CI run of the
[Agentic Playwright Suite](https://github.com/ArtemCherbaev/agentic-playwright-suite), lane by lane,
from the feed that suite's pipeline publishes.

[![CI](https://github.com/ArtemCherbaev/ArtemCherbaev.github.io/actions/workflows/ci.yml/badge.svg)](https://github.com/ArtemCherbaev/ArtemCherbaev.github.io/actions/workflows/ci.yml)
[![Run feed](https://github.com/ArtemCherbaev/ArtemCherbaev.github.io/actions/workflows/feed.yml/badge.svg)](https://github.com/ArtemCherbaev/ArtemCherbaev.github.io/actions/workflows/feed.yml)

**Live:** <https://artemcherbaev.github.io/> · [the suite, replayed](https://artemcherbaev.github.io/qa-suite.html)
· [CV](https://artemcherbaev.github.io/cv.html)

Hand-written HTML, CSS and JavaScript: no framework, no build step, no trackers, no third-party
requests. What is in the repository is what Pages serves, minus the tooling. A Playwright suite has to
pass before anything is deployed.

## Run it

```bash
corepack enable
yarn install
yarn playwright:install
yarn serve              # http://127.0.0.1:4173, the suite's real feed proxied in
yarn serve:fixture      # http://127.0.0.1:4174, a recorded feed instead
yarn test               # the site's suite; starts its own server
```

On Windows without an elevated shell, `corepack enable` fails with EPERM; prefix the commands instead:
`corepack yarn install`, `corepack yarn test`.

## How the pieces fit

```
agentic-playwright-suite (another repository)
  └─ CI on every push to main, and daily
       └─ publishes /agentic-playwright-suite/ on this same domain:
            Allure reports, suite health, traces, and feed/latest.json (schema apw-feed/1)

this repository
  ├─ index.html     the home page; the hero card, the header pill and the live panel read the feed
  ├─ qa-suite.html  the runner: the last run replayed on one time axis, every case, run history
  ├─ cv.html        the CV as a page, print-styled; the PDF is in assets/cv/
  └─ 404.html       served with a 404 status by Pages and by the local server
```

The feed is read from the same origin, so there is no cross-origin request. Every widget that shows a
number has to survive the feed being unavailable or malformed: it then shows links to the published
reports instead of numbers nobody measured. The tests prove both cases.

## The suite

| File                                     | Covers                                                                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [`pages.spec.ts`](tests/pages.spec.ts)   | Every page answers, is titled, has one h1, a language, a description and a canonical URL; headings never skip; no sideways scroll; the 404; the theme choice survives a reload |
| [`links.spec.ts`](tests/links.spec.ts)   | Every internal link and asset resolves, every external link is https, every fragment exists, the CV is a real PDF, the stylesheet actually applies |
| [`home.spec.ts`](tests/home.spec.ts)     | The widgets from a passing, a failing, an unavailable and a malformed feed; the email composer; copying the address; the phone menu; the skip link |
| [`runner.spec.ts`](tests/runner.spec.ts) | The runner against recorded feeds: exact totals, one block per case, the replay's controls, filters and search, source links at the commit that ran, history, reduced motion, the error state |
| [`a11y.spec.ts`](tests/a11y.spec.ts)     | An axe-core scan of every page in both themes, after the suite's numbers have rendered                                  |

Every test also fails on any browser console error, which is how a Content Security Policy refusing a
style gets noticed. It runs on desktop Chromium and on a Pixel 7 viewport.

Recorded feeds live in [`tests/fixtures/feed/`](tests/fixtures/feed). Tests never fetch the real one,
so a red run in the suite's repository cannot turn this one red. The real one is checked every day by
[`feed.yml`](.github/workflows/feed.yml) with [`scripts/check-feed.mjs`](scripts/check-feed.mjs), from the
reading side, with the site's own reader.

## Deploy

[`ci.yml`](.github/workflows/ci.yml): the suite runs; on `main` only, `stamp.mjs` writes `build.json`
from the suite's own JSON report — the footer's "deployed after N checks passed" — and `assemble.mjs`
copies the published files, and only those, into the Pages artefact. Pages is set to deploy from
GitHub Actions.

## Credits

The idea of a QA portfolio that replays a public suite's last CI run comes from
[Emanuela Telescu's portfolio](https://ella79.github.io/portfolio/). The design, code and content here
are my own.

## Licence

Code MIT, content all rights reserved, fonts OFL. See [`LICENSE.md`](LICENSE.md).
