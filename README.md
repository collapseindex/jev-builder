# jev-builder

**v1.16.0** · [Open the tool](https://collapseindex.github.io/jev-builder/) · Apache-2.0

A browser form for building requests to [TypeSafe's Jev](https://typesafe.ai). Pick a template,
fill in the blanks, and copy a working request: for the Playground, for Python, or for the command
line. No JSON to write and nothing to install.

Jev reads some text (the **state**) and answers **questions** about it: yes or no, a rating on a
scale you describe, or a pick from your options, each with a probability. Writing that by hand means
escaping every line break and quote in your text and getting the question shape right. This page
does both for you, and shows the request as you type.

It runs entirely in the browser. No cookies, no analytics, no third-party requests, no build step,
no framework: one HTML file, one stylesheet, one module.

## Features

- **34 templates** across support, moderation, writing, sales, research, engineering and AI
  evaluation, from rating song lyrics to detecting AI refusals. Six carry a second, constant field
  (a refund policy, routing rules, a job posting) so the question is judged against a rule.
- **Three answer types**: yes or no (`noul`), a rating (`score`), and a pick from your options
  (`choice`), with as many questions per request as you like.
- **A live preview** in four shapes: the full JSON request, the Playground's State and Questions
  panes, a Python snippet, and a curl command. Coloured and numbered, with a rough input token
  estimate.
- **Save your own templates**: keep a draft under Your templates in the library, reopen it later,
  delete it when you are done. Kept in your browser only, never uploaded.
- **Draggable splitters**, a charcoal or white theme, and your draft kept in your own browser.
- **Run it and keep the runs**: Run sends the request through your own local runner, and the Evals
  tab beside the preview keeps every run per question with distribution bars, agreement, mean, standard
  deviation, spread, confidence, latency, tokens, an estimated cost, an answer tally, a spread strip with the mean and one standard deviation, the raw response
  and a Save PNG button.
- **Say what you expect**, as loosely or as strictly as you like: the answer alone (`yes`), the
  answer with a floor under it (`yes, at 80% or more`), or a range for a rating (`between 1 and 2`).
  Every run then reads PASS or FAIL, with a tally of how many met the rule. It is a note to
  yourself; nothing about it is sent to Jev.
- **Run once, three times or ten**: repeats are what make the spread and the agreement mean
  anything, and a run in progress can be stopped.
- **Robustness probes**: run the same request again with changes that carry no meaning (spacing, a
  code fence, filler, manufactured confidence, an appeal to authority, politeness, and for a
  pick-one question the options reversed) and see which ones move the answer. The probes and their
  names match [dinostomp](https://github.com/collapseindex/dinostomp), so a finding here means the
  same thing there.
- **A check file** for [dinostomp](https://github.com/collapseindex/dinostomp), so a question can be
  measured against examples you have labelled before you rely on it.

## Use it

Open <https://collapseindex.github.io/jev-builder/>. There is nothing to install.

To run it yourself:

```bash
git clone https://github.com/collapseindex/jev-builder.git
cd jev-builder
npm start            # http://localhost:4321
```

`npm start` is a 40-line static file server with no dependencies; any other static server works too.
Opening `index.html` straight from disk does not, because browsers refuse ES modules over `file://`.

## Running a request

Jev's API refuses cross-origin browser requests, so no web page can call it, whatever it does with
your key. Running therefore happens on your own machine:

```bash
git clone https://github.com/collapseindex/jev-builder.git
cd jev-builder
TYPESAFE_API_KEY=... npm start        # or put the key in a .env beside the repo
```

`npm start` then serves the page and answers its `Run` button by forwarding the request to Jev with
your key. The key is read from the environment, never from the page, never sent to the page and
never logged, and the runner listens on the loopback address only.

On the hosted page, Run explains this and offers **Paste a response** instead: run the request
wherever you like (the Playground, dinostomp, curl), paste back what Jev answered, and it is
recorded with the same statistics.

Every run is kept in your browser's local storage, up to 200 of them, and can be cleared per
question in the panel.

## Your key

The page never asks for your TypeSafe key and never sends a request to Jev. The snippets it writes
read the key from a `TYPESAFE_API_KEY` environment variable:

```bash
export TYPESAFE_API_KEY=...      # in your shell, or a .env your program loads
python jev_request.py
```

Never paste an API key into a web page, including this one.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The page: markup and the module that runs it. |
| `jev-builder-core.js` | Everything that turns a draft into a request: the template catalogue, the generators for each output shape, validation, and the highlighter. No DOM. |
| `styles.css` | The whole stylesheet, themed with custom properties. |
| `tests/test_jev_workspace.mjs` | Behaviour tests against a DOM stub, run with `node --test`. |
| `scripts/check-jev-builder.mjs` | Loads every template's check file with dinostomp's own loader. |
| `scripts/serve.mjs` | The local server behind `npm start`. |

## Development

```bash
npm test                 # 12 behaviour tests, no dependencies
npm run check:templates  # needs `pip install dinostomp` and python on PATH
```

The tests read `index.html`, pull out its module and run it against a small DOM stub, so they cover
what the page actually ships. `check:templates` writes each template's `.jev.yaml` and loads it with
dinostomp, which is what catches a template that looks fine but would not run.

## Security

The page collects nothing and never holds your key; the runner keeps it on your machine, listens on
loopback only, and answers just its own page. What it protects against, what it does not, and where
to report a problem: [SECURITY.md](SECURITY.md).

## Contributing

Issues and pull requests are welcome. A new template needs a category, a short title, a blurb,
sample text, a question, and (for yes-or-no and pick-one questions) labelled examples. Run both
commands above before opening a pull request.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

[Apache-2.0](LICENSE). Not affiliated with TypeSafe.
