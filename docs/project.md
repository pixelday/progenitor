# <site name or domain>

> Starter template. Replace each `<...>` placeholder, then delete this note. This file is the
> project map: `AGENTS.md` sends every agent session here first.

<What the site is, who it is for, and the one thing a visitor should do or learn.>

It is a static site on Cloudflare Workers (static assets), deployed from a private GitHub
repo. There is no server and no database. Data records are YAML files that Astro renders at
build time. Any per-visitor state is stored in the browser with localStorage. Built with
Astro, React + TypeScript, PandaCSS and Base UI.

<Layout priorities, for example mobile-first, and why.>

## Context

<Why the site exists, and what a new session must know before it starts.>

## Profile

```
recorded:        <date>
domain:          <the domain, or "none yet">. <Its registrar; whether its DNS is on Cloudflare.>
email at domain: <none, or what handles it>
GitHub:          <the account or organization that owns the repo; who else has access>
Cloudflare:      <the account that holds the Worker and the zone; who has a login>
Worker name:     <the name in wrangler.jsonc: public and permanent>
deadline:        <a date and its reason, or "none">. A deadline cuts scope, never the checks.
analytics:       <none, or which and why>
AI crawlers:     <allowed or blocked; robots.txt and the Cloudflare dashboard must agree>
data:            src/data/records.yml, with its schema in src/content.config.ts.
                 <What the records are and where the facts come from.>
```

## Status

- **Now:** <what is in progress>
- **Next:** <what follows>
- **Open decisions:** <what is waiting on the owner>

## Setup log

Record each step of `docs/setup/` as it is done: the date, who did it and anything that
differed from the step as written. Then correct the step.

| Step | Done | Notes |
|---|---|---|
| 1. Local build | | |
| 2. GitHub | | |
| 3. Cloudflare, `workers.dev` | | |
| 4. Launch | | |

## Backlog

- <items not yet scheduled>
