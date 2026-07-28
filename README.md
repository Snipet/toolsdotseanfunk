# The Everything Toolbox

A static Svelte 5 site that tries to be the one place you go for any small task:
converting, calculating, generating, checking, visualizing.

**216 tools across 15 categories.** Every one runs in your browser. There is no
backend, no account, no ads, and nothing you type or upload leaves your device.

```bash
npm install
npm run dev      # development server
npm run verify   # type-check, test, build
npm run e2e      # browser suite against build/ (needs npx playwright install chromium)
```

## What is here

| Category | Tools | Highlights |
| --- | --- | --- |
| Converters | 91 | 17 dimensions plus 71 dedicated pair pages, number bases, Roman numerals |
| Cooking | 7 | Cups-to-grams by ingredient, recipe scaler, baker's percentages |
| Math | 11 | Expression calculator, quadratic and triangle solvers with steps, matrices |
| Statistics | 6 | Descriptive stats with a box plot, distributions, regression, A/B testing |
| Finance | 13 | Amortization schedules, compounding, inflation from CPI-U |
| Health | 11 | BMI, BMR/TDEE, pace, 1RM, caffeine half-life — all with cited formulas |
| Date & time | 12 | Date arithmetic, time-zone overlap planner, cron builder |
| Text | 13 | Counting, diffing, ciphers, readability, an offline notepad |
| Developer | 17 | JSON, JWT, hashes, regex, subnets, and a QR encoder written from the spec |
| Color | 6 | Conversion, WCAG contrast, palettes, colour-blindness simulation |
| Images | 5 | Resize, convert, compress to a target size, crop — all on canvas |
| Random | 8 | Verifiable seeded draws, dice notation, Secret Santa derangements |
| School | 6 | Grades, GPA, citations in five styles, printable graph paper |
| Visualizers | 5 | Supply & demand, function grapher, CLT, sorting races, unit circle |
| Reference | 5 | Printable charts worth bookmarking |

The flagship is
[`/visualize/supply-and-demand`](src/lib/tools/visualize/supply-and-demand.svelte):
draggable curves with live equilibrium, consumer and producer surplus, tax
incidence, deadweight loss, price controls and point elasticities.

## The parts that matter

**Answer-first omnibox.** Typing `3 tbsp to tsp` shows **9 teaspoons** in the
dropdown, not a link to a converter. Also handles `15% of 80`,
`days until Dec 25`, `72F in C`, `255 in hex`, `1994 to roman`, and bare
arithmetic. See [`src/lib/omnibox.ts`](src/lib/omnibox.ts).

**State in the URL.** Every tool encodes its inputs in the query string, so any
result is shareable and bookmarkable. `/convert/tablespoon-to-teaspoon?value=3`
is a complete, linkable answer.

**Command palette.** <kbd>⌘K</kbd> or <kbd>/</kbd> anywhere, with fuzzy matching
over titles, slugs and synonyms — "resize pic", "shrink image" and "image
resizer" all find the same tool.

**Every tool shows its work.** The formula used, why that formula, and where it
comes from. Health and finance tools name the specific method (Mifflin–St Jeor,
the US Navy tape method, Karvonen) because the choice changes the answer.

**Nothing is uploaded.** Images are processed on a canvas, hashes use Web
Crypto, and the QR encoder is implemented from ISO/IEC 18004. The site is a
folder of static files.

## Correctness

179 tests across 10 suites, run on every build.

- **Units** — a property test round-trips every unit pair in every dimension,
  plus hand-checked reference values (1 inch = 2.54 cm exactly, −40 °C = −40 °F,
  1 acre = 43,560 ft²). Factors follow NIST SP 811 and the BIPM SI Brochure.
- **QR encoder** — the rendered matrix is decoded back to the original string,
  and the Reed–Solomon codewords are verified to have zero syndromes.
- **Statistics** — CDF and inverse CDF checked against published z-table values;
  quantiles match R type 7 and NumPy.
- **Finance** — amortization checked against textbook mortgage figures; NPV and
  IRR verified to be mutually consistent.
- **Dates** — calendar arithmetic across leap years, month-end clamping and ISO
  week boundaries.

Beyond unit tests, the build is verified in a real browser by `npm run e2e`:
`scripts/smoke.mjs` exercises the key interactions (omnibox, palette,
converters, the visualizer) and `scripts/crawl.mjs` walks all 234 prerendered
pages looking for console and runtime errors. That last layer earns its keep —
it caught an infinite reactive loop in the sorting visualizer that the tests and
the type-checker both missed.

CI (`.github/workflows/ci.yml`) runs the type-check, the unit tests, both builds
and the browser suite on every pull request and on pushes to `main` and `dev`.

## Architecture

```
src/lib/
  catalog.ts              one entry per tool — drives search, nav, routing, prerender
  omnibox.ts              natural-language answer parsers
  search.ts               fuzzy tool search
  units/                  conversion engine, 17 dimensions
  math/                   expression parser, stats, finance, dates, number theory
  text/  color/  qr/      domain libraries, each independently tested
  components/             shared UI: ToolShell, Result, Field, Omnibox…
  tools/<category>/<slug>.svelte
```

Adding a tool means two things: a catalog entry and a component at the matching
path. Routing, search, the command palette, related-tool links and the prerender
manifest all follow from the catalog — there is no separate wiring step.

Each tool is its own lazily-loaded chunk, so opening the tip calculator does not
download the matrix solver.

## Accessibility and presentation

WCAG-minded throughout: labelled inputs, keyboard-operable visualizers (the
supply-and-demand curves respond to arrow keys), a skip link, visible focus
rings, `prefers-reduced-motion` support, and light/dark/system themes applied
before first paint so there is no flash. Reference pages and printables carry a
print stylesheet that strips the interface.

## Deploying

`npm run build` produces a fully static `build/` directory (adapter-static, with
a `404.html` fallback). It can be served by anything — Cloudflare Pages, Netlify,
Vercel, GitHub Pages, S3, or `node scripts/serve.mjs`.

Two branches, two targets:

| Branch | Target | Base path |
| --- | --- | --- |
| `dev` | GitHub Pages, deployed by `.github/workflows/pages.yml` | `/<repo>`, from `actions/configure-pages` |
| `main` | Cloudflare Pages (build command `npm run build`, output `build`) | none |

The site is served from a subdirectory on a GitHub Pages project site, so the
build takes a `BASE_PATH` environment variable and every internal link goes
through `base` from `$app/paths`. Nothing else needs to change between the two
deployments, and a custom domain on Pages makes `BASE_PATH` empty on its own.

```bash
BASE_PATH=/toolsdotseanfunk npm run build   # what the Pages workflow runs
BASE_PATH=/toolsdotseanfunk npm run e2e     # verify that build the way it is served
```

The Pages workflow enables Pages itself (`enablement: true`), so the source
setting needs no visit. One thing does, once: GitHub restricts the
`github-pages` environment to the default branch, so deploying from `dev` is
rejected with *"Branch dev is not allowed to deploy to github-pages due to
environment protection rules"* until `dev` is allowed under **Settings →
Environments → github-pages → Deployment branches and tags**.

## Not yet built

Deliberately scoped out of this first pass, in rough priority order: PDF and
audio/video tools built on WebAssembly; the rest of the converter matrix;
embeddable widgets and classroom presentation mode; offline/PWA support; a
request-a-tool board; and the AI layer. The visualizer program is intended to
expand one subject per release — economics is first, then more math, statistics,
physics and computer science.
