# Changelog

All notable changes to jev-builder. Versions follow [semantic versioning](https://semver.org).

## v1.3.0 (2026-09-19)

### Added
- Run: a local runner in `npm start` forwards the request to Jev with a key from your environment,
  because the API refuses cross-origin browser calls. The key never touches the page, and the
  runner binds to loopback, rate limits itself and caps the body size.
- Paste a response: the same history from a run made anywhere else.
- The eval panel: per question, the latest answer with its distribution, runs, most common answer,
  agreement, mean, standard deviation, spread, mean confidence, latency, tokens and estimated cost,
  a trendline with a one standard deviation band, a run table, Save PNG, and Clear history.
- `readAnswer`, `summariseRuns` and `estimateCost` in the core module, covering noul, choice and
  score responses.

## v1.2.0 (2026-09-19)

### Added
- Save the current draft as a template: it is listed first in the library under Your templates,
  reopens the exact draft it was saved from, and can be deleted there (with a confirmation).
  Saved templates live in this browser only, up to 40 of them, and the page says so when a browser
  refuses to store them.

## v1.1.0 (2026-09-19)

### Changed
- The preview opens on the Playground view, which is where most people start; the JSON request,
  Python and curl views are one select away, and a saved choice still wins.
- Browse templates breathes until the library has been opened once, remembered per browser and
  still for anyone who prefers reduced motion.

## v1.0.0 (2026-09-19)

First release as its own repository, lifted out of
[ci1t-web](https://github.com/collapseindex/ci-1t-web) where it was an Astro page. The tool is
unchanged; it is now plain files with no framework and no build step.

### Added
- 34 templates across nine categories, six of them carrying a second constant field (an escalation
  policy, routing rules, a refund policy, a spam policy, a job posting, a moderation policy).
- Three answer types (yes or no, rating, pick one) and any number of questions per request.
- A live preview as the full JSON request, the Playground's two panes, Python, or curl, coloured by
  a small tokenizer and numbered by a CSS counter, with a rough input token estimate.
- A dinostomp check file, with constant fields folded into every example.
- Draggable splitters, remembered per browser; a charcoal and a white theme; drafts kept in local
  storage only.
- 12 behaviour tests against a DOM stub, and a script that loads every template's check file with
  dinostomp's own loader.
