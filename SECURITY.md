# Security

jev-builder is a static page plus an optional runner you start yourself. This is what it does with
your data and your key, what it refuses to do, and how to report a problem.

## Reporting a problem

Email **ask@collapseindex.org** with what you found and how to reproduce it. Please do not open a
public issue for anything that could be used against someone before it is fixed. There is no bounty;
there is a thank you in the changelog if you want one.

## What the page does

- It runs entirely in your browser. No cookies, no analytics, no third-party requests, no build
  step. The only thing it loads is its own stylesheet and module.
- A Content Security Policy on the page allows loading and connecting to nothing but its own origin,
  blocks framing, and blocks form submissions.
- Your draft, saved templates and run history are kept in `localStorage`, in that browser only. They
  are never uploaded. Clearing site data removes them.
- The page never asks for an API key and never holds one. The snippets it writes read the key from a
  `TYPESAFE_API_KEY` environment variable, so nothing is pasted into a web page.
- Everything rendered from data you provide, and from what Jev answers, goes in as text, never as
  markup.

## What the runner does

`npm start` serves the page and answers its `Run` button. It exists because Jev's API refuses
cross-origin browser requests, so no web page can call it however the key is handled.

- **Your key is read on the server side only**, from `TYPESAFE_API_KEY` in the environment or a
  `.env` beside the repo (which is in `.gitignore`). It is never sent to the page, never echoed in a
  response, and never written to the log.
- **It listens on 127.0.0.1**, so nothing outside your machine can reach it.
- **It answers only its own page.** Both the `Host` and, when present, the `Origin` header must name
  a loopback address on the port it is serving. That is what stops DNS rebinding: a site whose name
  resolves to 127.0.0.1 would otherwise reach the runner from your browser.
- **Only `GET` and `HEAD` serve files**, and only from the repository folder; a path that resolves
  outside it is refused, encoded or not.
- **Limits**: 1 MB request bodies, a 60 second timeout on the call to Jev, and 120 runs a minute.
- Responses carry `X-Content-Type-Options: nosniff`, and API responses are `no-store`.

## What it does not protect against

- **Deploying the runner to a public host.** It is written for loopback. On a public address, anyone
  who finds the URL can spend your key, because there is no account, no auth and no quota in it. If
  you want a hosted version, put authentication and a spending limit in front of it.
- **Anyone with access to your machine or browser profile.** Drafts and run history sit in
  `localStorage` in the clear, and a `.env` beside the repo is an ordinary file.
- **What you paste in.** Text you put in the state is sent to TypeSafe when you run it. Do not paste
  anything you are not willing to send to their API, and mind other people's personal data.
- **The dependency chain.** There are no runtime dependencies to compromise, which is deliberate, but
  the page is served by whatever host you deploy it to.

## Supported versions

The latest release on `main` is the supported one. Fixes go there.
