# Changelog

All notable changes to jev-builder. Versions follow [semantic versioning](https://semver.org).

## v1.13.0 (2026-09-19)

### Fixed
- The evals follow the draft. Taking a template, adding a question or editing one now leads with
  the draft's own questions, instead of leaving an earlier question's history on screen as though
  it belonged to what is in the editors.
- Editing anything with the Evals tab open refreshes it, so the runs, the stats and the note about
  older runs match what the request says now.

### Added
- Questions with runs that are no longer in the draft stay reachable, marked as past, and say so
  when empty. Choosing one keeps it until the draft's questions change again.

## v1.12.2 (2026-09-19)

### Changed
- The selected Evals tab is white on a deeper blue in light mode, and dark on the pale blue in
  charcoal, so the label stays readable either way.
- The answer tally only appears when the answers actually differ. One bar at 100% said nothing, so
  the spread takes that space instead.

## v1.12.1 (2026-09-19)

### Fixed
- The question chip counted probe answers as runs, so it disagreed with the report. It counts runs
  now, names both figures on hover, and the runs stat says "+ n probes" when a pass has been made.

## v1.12.0 (2026-09-19)

### Fixed
- The chart follows the theme: it is painted pixels, so switching to light left the old dark
  picture behind until something else redrew it.

### Changed
- The Evals tab is blue when it is the one you are on.

## v1.11.1 (2026-09-19)

### Changed
- The spread strip zooms to the runs instead of the whole scale, labels both ends with where that
  window sits, and stacks runs that land on the same spot, so twenty-five answers at 0.80 read as a
  tight column rather than one smear.

## v1.11.0 (2026-09-19)

### Added
- Every run records a fingerprint of the request that produced it. The report counts only runs of
  the request as it stands, says how many older ones exist, and offers All runs to see them.

### Changed
- The chart drops the trendline for two panels that suit small samples: how often each answer came
  up, and where the runs fell on the scale with the mean and a one standard deviation band.
- A robustness pass keeps its own baseline, so probes are compared with the run made beside them
  rather than whatever ran last.
- The local runner allows 120 runs a minute instead of 30: it is your key and your machine.

## v1.10.0 (2026-09-19)

### Changed
- Run moves into the Evals tab, beside Robustness, Save PNG and Clear, so it sits with the results
  it produces. The top bar keeps the name and the draft note.

## v1.9.1 (2026-09-19)

### Fixed
- The preview and the evals no longer draw at once: a pane's own display rule was beating the
  hidden attribute, which left the two overlapping and clipped.

### Changed
- Robustness, Save PNG and Clear sit inside the report they act on, not in the pane's heading.
- The Paste a response button is gone; Run still offers pasting when there is no runner, which is
  the only time it is needed.

## v1.9.0 (2026-09-19)

### Changed
- The runs move out of a dialog: the right pane now switches between Request preview and Evals, so
  a question and what it answered sit side by side and a run never covers the draft. Run switches
  the pane itself, Robustness, Paste a response, Save PNG and Clear live in the tab's heading, and
  the History button is gone.

## v1.8.0 (2026-09-19)

### Added
- Robustness: a fresh baseline and then one run per probe (whitespace, formatting, verbosity,
  confidence, authority, politeness, and option order for a pick-one question), with a table of
  which probes held and which flipped, how far support moved, and the worst case. The probe names
  and wording match dinostomp's own perturbations.
- The raw response under the history, coloured like the preview, with a copy button.
- `PERTURBATIONS`, `probesFor`, `probeModel` and `robustness` in the core module.

### Changed
- Probe runs are kept out of the trendline and the run statistics, which stay about repeats of the
  same request.

## v1.7.0 (2026-09-19)

### Changed
- What the answers mean is always open for a yes-or-no question, in the same fields as the rest,
  instead of a fold.
- Placeholders show a concrete example rather than advice: a real question, a real level on a
  scale, a real option and what it covers.

## v1.6.0 (2026-09-19)

### Changed
- Run and History sit in the middle of the top bar, with the runner's state and the draft note on
  the right; the bar along the bottom is gone.
- The theme toggle moves to the foot of the rail, and collapses to its icon with the rest.

## v1.5.0 (2026-09-19)

### Changed
- Browse templates, Start blank and Save as template move to a rail down the left that collapses to
  its icons, remembered per browser, and becomes a row of buttons on narrow screens.

## v1.4.0 (2026-09-19)

### Changed
- Run and History (was Runs) move to a bar of their own along the bottom, with the draft note and a
  line saying whether the runner is ready, has no key, or is absent.

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
