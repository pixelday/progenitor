# Progenitor

A static site starter: a generic, working site to copy and make your own. It builds to plain
HTML, CSS and JS and is served from Cloudflare's edge. There is no server, no database and no
runtime data fetching. Records live in a YAML file and are rendered at build time. A merge to
`main` on GitHub is the only way anything deploys.

Stack: Astro (static output only), React + TypeScript for interactive islands, PandaCSS,
Base UI, Cloudflare Workers static assets (free plan), one private GitHub repo (free plan).

Start here. Everything a new session needs is in this file, `docs/index.md` and
`docs/setup/`. `docs/stack-wiring.md` explains the config. `docs/archive/` is background from
before the starter had code: where it disagrees with the files above, they win.

## [Live Demo](https://progenitor.pixelday.workers.dev/)

## Prerequisites (as of 2026-11-25)

For the spike:

- **Node 24.22.3** and the npm that ships with it (11.x). `.nvmrc` pins it. An older Node is
  refused: `npm ci` stops with `EBADENGINE`.
- **git**
- **A GitHub account** (free), with two-factor authentication on
- **A Cloudflare account** (free), with two-factor authentication on

For launch only:

- **A domain** whose DNS is on Cloudflare

Optional:

- **Claude Code**, **Codex** or **Gemini**. `AGENTS.md` holds the rules they follow.

## The path

Fill in `docs/index.md` first. Then:

| Step | File | Who |
|---|---|---|
| 1. Build and preview locally | [docs/setup/1-local.md](docs/setup/1-local.md) | a session, or you |
| 2. Configure GitHub | [docs/setup/2-github.md](docs/setup/2-github.md) | you, in the browser |
| 3. Deploy to a `workers.dev` hostname | [docs/setup/3-cloudflare.md](docs/setup/3-cloudflare.md) | you, in the browser; a session verifies |
| 4. Launch on a domain | [docs/setup/4-launch.md](docs/setup/4-launch.md) | you; a session verifies |

**The spike is done** at the end of step 3, when this prints only `PASS`:

```bash
bash scripts/verify-live.sh <worker-name>.<subdomain>.workers.dev "$(git rev-parse main)" preview
```

"You" means the owner. A session can't click a dashboard, and `AGENTS.md` forbids it from
pushing, so the owner does every push, merge and dashboard step.

## What has been proven

Each claim in `docs/setup/` carries one of these tags.

| Tag | Meaning |
|---|---|
| **LOCAL** | Run against this starter on 2026-11-25: macOS, Node 24.22.3, the versions in `package.json`. |
| **LIVE** | Observed on live Cloudflare sites in earlier work, on a different build stack (Jekyll on Cloudflare Pages). |
| **DEPLOYED** | Observed on the starter's own Worker at its `workers.dev` hostname, from 2026-11-26. |
| **DOCS** | Read in vendor documentation in November 2026. Not run. |
| **OPEN** | Not established. The step says how to settle it. |

- **Step 1 is LOCAL throughout.** Install from the lockfile, the full build, the header-faithful
  preview and the island hydrating under the Content Security Policy in Chrome 158 all ran.
- **Step 2 has been run only in part.** On 2026-11-26 the starter's own repository was on
  GitHub, public, with `main` pushed and a ruleset on `main`. The step's other settings are
  LIVE or DOCS.
- **Step 3 has been run, and its live check passes.** On 2026-11-26 the Worker was created,
  a merge to `main` built and deployed it, and `scripts/verify-live.sh` printed 36 `PASS`
  lines against the `workers.dev` hostname. `npm run audit` printed thirteen `PASS` lines
  against the same host. A branch preview passed both at its own address before its merge
  (`docs/setup/3-cloudflare.md`, part 6).
- **Step 4 has never been run with this starter.** Its settings are LIVE or DOCS.
- **No second site has been built from it yet.** Until one has, "copy it and change only the
  data and the settings" is a design goal, not a result.
- **`astro.config.ts`, `wrangler.jsonc` and `.gemini/settings.json` were rewritten on
  2026-11-25** from this README and `docs/`, after the originals were lost in a copy. With
  them the build reproduced the figures recorded before the loss: the same pages, the same
  checks passing and 83.4 KB of JavaScript.

## Commands

| Command | What it does |
|---|---|
| `npm ci` | Installs from the lockfile, then generates `styled-system/` (Panda's helpers). |
| `npm run dev` | Dev server with hot reload. It sends no security headers and no CSP. |
| `npm run build` | Type check, unit tests, build, `html-validate` over `dist/`, then `scripts/verify-dist.mjs`. This is what Cloudflare runs, so a failing check blocks the deploy. |
| `npm run preview` | Serves `dist/` the way Cloudflare will, with the headers and the real 404. Build first. |
| `npm run audit` | Browser checks against the preview: axe on every page, then the island's behavior. Needs Chrome, so it is not part of the build. Run it before a pull request. |
| `npm test` | Unit tests only. |
| `npm run tamper` | Tests the checker: breaks a build on purpose, one way per case, and confirms `verify-dist` fails each time. Run it after any change to `scripts/verify-dist.mjs`. |

There is no `deploy` script on purpose. Deploys come only from Cloudflare building a merge to
`main`.

## What is where

```
README.md               this file
AGENTS.md  CLAUDE.md    rules for agent tools
docs/index.md           what this site is, and its current status: fill it in
docs/setup/             the four steps
docs/stack-wiring.md    how Astro, React, Panda and Base UI are wired together
docs/archive/           background from before the starter had code: not instructions
docs/working.md         open items for developing the starter itself
src/site.ts             the site's identity and its two switches: launched, AI crawlers
src/lib/pages.ts        the page registry: every fixed page's path, title and description
src/data/records.yml    the records: the source of truth for content
src/content.config.ts   the records' schema; bad data fails the build
src/pages/              one file per page; records/[id].astro makes a page per record;
                        the .ts files write robots.txt, sitemap.xml, llms.txt and the manifest
src/layouts/Base.astro  the one <head>: icons, share card, structured data, canonical
src/components/         React islands, JSON-LD, prose, and the component that inlines the theme script
src/scripts/theme.js    the light, dark or system choice: the one script on every page
src/lib/                the data projection and the localStorage store, with their tests
public/                 _headers (security headers, cache rules), the icons, the share card
astro.config.ts         static output, the Content Security Policy, Panda
wrangler.jsonc          the Cloudflare Worker: static assets only, no code
.htmlvalidate.mjs       markup rules for the built HTML
scripts/verify-dist.mjs checks the build; runs inside `npm run build`
scripts/tamper-test.mjs checks verify-dist by breaking builds on purpose; `npm run tamper`
scripts/audit.mjs       checks a served build in a browser; `npm run audit`
scripts/verify-live.sh  checks a deployed host; run it after every deploy
```

## What every site built from this ships

The build fails if any of it is missing, malformed or out of step.

| What | Where it comes from |
|---|---|
| `/`, a page per record, `/privacy-policy`, `/terms`, `/accessibility`, `/sitemap`, a real 404 | `src/pages/` |
| `robots.txt`, `manifest.webmanifest` | `src/pages/*.ts`, from `src/site.ts` |
| `sitemap.xml`, `llms.txt` | the same, on a launched site only |
| `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `social.png` | `public/`. The starter's are a plain blue square and card: a site replaces all six |
| Title, description, canonical or `noindex`, theme color, icon and manifest links | `src/layouts/Base.astro` |
| Open Graph and Twitter card tags, JSON-LD `WebSite` | the same, on a launched site only |
| Security headers and the Content Security Policy | `public/_headers`, `astro.config.ts` |

**Two switches, in `src/site.ts`.** Each has several consumers, and `verify-dist` fails a
build where they disagree.

- `launched` decides whether pages are indexable. While it is false, nothing states an
  absolute URL: no canonical, no share card, no structured data, no `sitemap.xml`, no
  `llms.txt`, and no `Sitemap:` line in `robots.txt`.
- `aiCrawlers` is `'allow'` or `'block'`. It decides what `robots.txt` tells AI crawlers and
  whether `llms.txt` exists. The Cloudflare dashboard must be set to agree
  (`docs/setup/4-launch.md`, part 5).

**Adding a page:** create the file in `src/pages/` and add its entry to `src/lib/pages.ts`.
The registry feeds the sitemap page, `sitemap.xml`, `llms.txt` and the footer. The build
fails if a page is built that the sitemap page does not list.

## Rules that hold

1. **Static output only.** No adapter, no Worker code, no server. If a feature seems to need
   one, stop and ask the owner.
2. **No third-party requests.** Fonts, scripts and images are served from this site. An
   exception is declared in `astro.config.ts` and on the privacy policy in the same change.
3. **The repo is the site.** Headers, redirects, the CSP and the Worker config are files.
   What can only be set in a dashboard is listed in `docs/setup/`.
4. **Content lives in data.** Facts go in `src/data/`, each with an as-of date and, where it
   has one, a source.
5. **Never weaken a check to make a build pass.** If a check is wrong, fix it in a change that
   does nothing else and say why.

`docs/archive/technical-brief.md` gives the reasons behind each rule.

## The starter's own rules

The name describes the relation. A progenitor cell descends from a stem cell: it is more
committed than its parent and still generic. A site built from this starter descends from it
in the same way: it begins as a copy and becomes specific through its data and settings.

The rules above hold for every site. These hold for the starter.

1. **It always builds.** `npm run build` passes on the starter as it stands, with nothing but
   its sample records. A change that breaks that does not merge, because every site made
   afterwards would start broken.
2. **Brandless, not styleless.** The starter is styled and carries no brand: the name is
   "Site name", the address is `example.com` and the icons are a plain blue square. A site
   takes on a brand by changing the semantic color tokens in `panda.config.ts`, not by editing
   components. `src/lib/tokens.test.ts` fails the build if a component names a palette color
   such as `gray.900` instead of a token.
3. **The real checks from the first build.** A fresh copy passes `npm run build`, which is the
   only build script and the one the deploy is set to run. There is no relaxed script for a
   site that is just starting. The checks that apply only to a launched site turn on with
   `launched` in `src/site.ts`.
4. **A site's content belongs to the site.** Its records, settings and page text live in its
   own repository. The starter carries sample data only.
5. **The legal pages are part of the floor.** The privacy policy, the terms and the
   accessibility page have the same standing as the favicon, the 404 page and the sitemap:
   the build fails without them. Whether the accessibility page stays required is open
   (`docs/working.md`).

The principle behind all five is compliance as architecture: a site's obligations (privacy,
accessibility, security) are properties of its structure that the build enforces, not a list
run before launch. The legal pages are that principle extended, not a separate concern.

Nothing yet carries a later change in the starter down to a site already built from it
(`docs/working.md`).
