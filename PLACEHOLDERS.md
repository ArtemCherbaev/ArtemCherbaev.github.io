# Placeholders

Everything below is a fact only you know, so it ships as a visible placeholder rather than an
invention. In the browser each one renders amber with a dotted underline (`.todo` in
`assets/css/styles.css`), which makes an unfinished page obvious at a glance instead of plausible.

Work top to bottom, delete the `todo` class as you replace each one, and delete this file when the
list is empty. Grep for what is left at any point:

```bash
grep -rn "todo" index.html cv.html
```

## index.html

| Where                  | What to write                                                                    |
| ---------------------- | -------------------------------------------------------------------------------- |
| Hero, `.hero-meta`     | City, country and UTC offset.                                                    |
| About, `.facts`        | Four numbers: years in QA, years in automation, years of agentic work, industries. |
| Experience, each role  | Dates, employer, what you owned, and the measured result. Two roles are visible, two more are in the document behind "Show the earlier roles" — delete the ones you do not need. |
| Skills timeline        | "since MM/YYYY" and the duration for each row. The bar position is the `left:` percentage on `.t-bar`, where 0% is 2019 and 100% is now. |
| Impact, `.impact-grid` | Four before-and-after numbers. If you cannot source one, delete the tile rather than round it up. |
| Contact                | LinkedIn handle, and city plus UTC offset again.                                 |

## cv.html

| Where             | What to write                                                       |
| ----------------- | ------------------------------------------------------------------- |
| Experience        | The same roles as the landing page, with the detail the summary drops. |
| Education         | Degree, institution, year.                                          |
| Certification     | Any certifications worth the space, with issuer and year.           |
| Aside, contact    | LinkedIn handle, city and UTC offset.                               |
| Aside, languages  | Languages beyond English.                                           |

## Files rather than text

| What                                    | Why it matters                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| `assets/cv/Artem-Cherbaev-CV.pdf`       | Linked from the header, the contact list and the CV page. It is listed in `PENDING` in `tests/links.spec.ts`; delete that entry once the file is committed so the check starts enforcing it. |
| `assets/img/portrait.svg`               | Replace with a photograph. Keep it square; it is cropped to a circle at 258px.   |
| Formspree endpoint in `index.html`      | `action="https://formspree.io/f/REPLACE_ME"`. Until it is real, the form is inert. |
| `artemcherbaev` in URLs                 | If your GitHub username differs, it appears in both HTML pages, `robots.txt`, `sitemap.xml`, the README and `tests/links.spec.ts`. |
