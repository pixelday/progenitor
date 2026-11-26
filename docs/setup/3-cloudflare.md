# Step 3. Deploy to a `workers.dev` hostname

As of 2026-11-25. **This step has not been run with this starter, and nothing here has been
deployed to Cloudflare.** Everything is **DOCS** unless tagged. The first deploy settles the
**OPEN** items; when it does, correct this file.

No domain is needed. The site goes live on `https://<worker-name>.<subdomain>.workers.dev`,
which sends `noindex`. The owner does the dashboard parts; a session verifies.

## 1. The account

| Setting | Set to | Tag |
|---|---|---|
| Two-factor authentication | On, with recovery codes stored offline | LIVE |
| Members | Only people who need the dashboard. On the Free plan the one role an added member can hold is Administrator, which reaches DNS, the registrar and member management. | LIVE |
| API tokens | None before the repo is connected. Exactly one afterwards: see below. | DOCS |

- Connecting a repo makes Cloudflare generate **one API token** for its builds. It is a user
  token, listed under the connecting user's My Profile, API Tokens. Do not delete or roll it:
  builds then fail with "The build token selected for this build has been deleted or rolled".
- **The owner connects the repo, signed in as themselves.** The token belongs to whoever made
  the connection and stops working when that user leaves the account.
- **No machine needs `wrangler login`.** Deploys happen in Cloudflare's build. `wrangler dev`
  and `wrangler deploy --dry-run` both ran here without a login (LOCAL).

## 2. Before creating the Worker

In `wrangler.jsonc`, set `name` and `compatibility_date` (step 1). The file as shipped:

| Key | Value | Why |
|---|---|---|
| `name` | the Worker's name | Must equal the name given in the dashboard, or the build fails. It appears in the public hostname, so keep it neutral. |
| `main` | absent | An assets-only Worker has no code. Its absence is what keeps the site static. |
| `assets.directory` | `./dist` | Astro's output. |
| `assets.not_found_handling` | `404-page` | The default is `none`, an empty 404. This serves `404.html` with a 404 status (LOCAL, in `wrangler dev`). |
| `workers_dev` | `true` | Gives the spike a hostname. Step 4 turns it off. Set it in the file: a dashboard-only toggle is undone by the next deploy. |
| `preview_urls` | `false` | Version URLs: a public URL for every uploaded version. These are not pull-request previews. Wrangler 4.168's schema gives `false` as the default; it is written out so the dashboard can't differ. |
| `previews` | `{}` | Pull-request previews are built with `wrangler preview`, which reads this block. Empty means no overrides. |

`npx wrangler deploy --dry-run` accepts this file (LOCAL). It uploads nothing.

**OPEN:** whether an empty `previews` block is required for branch builds, or merely allowed.

## 3. Create the Worker

In the Cloudflare dashboard: Workers & Pages, Create application, import a repository.
Choose the GitHub account and this repo, scoping the GitHub App to this repo only (step 2).
Give the Worker the same name as `name` in `wrangler.jsonc`.

Build settings, under the Worker's Settings, Build. The first two rows are the ones to set.
The rest are the documented defaults, listed so nothing is left to guess:

| Setting | Set to | Why |
|---|---|---|
| Build command | `npm run build` | It runs the type check, the tests and `verify-dist` around the build. `npx astro build` alone would deploy without any of them. |
| Enable Preview Builds (Branch control) | On | Every push to a branch other than `main` builds a preview, and the pull request gets its URL. |
| Deploy command | `npx wrangler deploy` (the default) | |
| Production branch | `main` (the default) | |
| Root directory | the repo root (the default) | |
| Build variables and secrets | none | Node comes from `.nvmrc`. This project has no secrets. |

## 4. Read the first build log

A green check is not enough. In the log, confirm:

1. **Node is 24.22.3.** Workers Builds reads `.nvmrc`, and its image defaulted to Node 24.22.1
   on 2026-11-25. **OPEN:** that the image can supply 24.22.3.
   - If the install step fails with `EBADENGINE`, the pin was not honored. Set a build variable
     `NODE_VERSION=24.22.3` and rebuild.
   - If the image cannot provide 24.22.3 at all, change `.nvmrc` and `engines.node` in
     `package.json` to the newest 24.x it offers, in one commit. Keep the two equal.
2. **The install used the lockfile**, and `panda codegen` ran after it (the `prepare` script).
   Without it, `astro check` fails on every `styled-system/...` import.
3. **`npm run build` printed fifteen `PASS` lines** and `all passed`.
4. **The deploy step uploaded the assets.**

Record the Node line and anything unexpected in `docs/project.md`.

## 5. Verify the deployed site

```bash
bash scripts/verify-live.sh <worker-name>.<subdomain>.workers.dev "$(git rev-parse main)" preview
```

Every line must say `PASS`. In `preview` mode it checks:

- the page answers 200 and carries this commit's marker (`<meta name="site-marker">`)
- an unknown path answers 404 with the site's own page
- the six security headers arrive on the page and on the 404
- both halves of the CSP arrive: the header and the `<meta>`
- no `Set-Cookie`, and nothing injected at the edge
- `robots.txt` answers 200 and does not block everything
- the icons and the manifest answer 200 with the right type, and the privacy policy, terms,
  accessibility and sitemap pages answer 200
- the host sends `X-Robots-Tag: noindex`

The script is copied from `docs/archive/technical-brief.md`, where it was run against public hosts. It
has not been run against a deploy of this starter. What it will settle:

| OPEN until this runs | If it fails |
|---|---|
| `_headers` applies on Workers, including to the 404 response (true in `wrangler dev`, LOCAL) | Check that `dist/_headers` exists in the build log's upload list. |
| The marker equals the full commit SHA. Workers Builds sets `WORKERS_CI_COMMIT_SHA` at build time (DOCS). | If the page shows `local`, the variable has another name: fix `src/layouts/Base.astro`. If it shows a short SHA, pass the short form. |
| The `workers.dev` rule in `public/_headers` matches the production hostname, so it sends `noindex`. Cloudflare's example is written for preview hostnames; the production one has the same two-label shape. | Add a second rule for the exact hostname. Never put `X-Robots-Tag` under `/*`: that de-indexes the real domain later. |

Then open the site in a browser with the console open and repeat step 1's island check.

## 6. Prove the whole loop once

1. On a branch, change one word in `src/data/records.yml`. The owner pushes it and opens a
   pull request.
2. Cloudflare comments with a preview URL. Run `verify-live.sh` in `preview` mode against it,
   with the branch's commit.
3. Run the "branch contains `main`" check from step 2, then the owner merges.
4. Wait for the green check on the merge commit, then run `verify-live.sh` against the
   production hostname with the new `main` commit.

Until this has run once, "auto-deploy is set up" is an assumption.

## 7. Know these before they are needed

- **Rollback** is in the dashboard: the Worker, Deployments, the menu on an older deployment.
  Code, config and assets roll back together.
- **A failed build sends no alert** and leaves the previous version serving. The merged
  commit's status check is the alert, which is why the loop ends with `verify-live.sh`.
- **Previews are public** to anyone with the URL. They send `noindex`, but they are not
  private. Do not put uncleared content on a branch.
- **Free plan limits:** 3,000 build minutes a month, one build at a time, 20 minutes per
  build; 20,000 files per version, 25 MiB per file.
- **Some default client user agents are refused on `workers.dev`** (error 1010, seen with
  Python's `urllib`, LIVE). `verify-live.sh` sends its own user agent for this reason.
