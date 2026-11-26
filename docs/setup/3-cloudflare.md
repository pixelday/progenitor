# Step 3. Deploy to a `workers.dev` hostname

As of 2026-11-26. **This step has been run with this starter, and its live check passes.**
The Worker was created, a merge to `main` built and deployed it, and `verify-live.sh` printed
only `PASS` (part 5). What the deploys showed is tagged **DEPLOYED**. Everything else is
**DOCS** unless tagged. One thing is left: no branch preview has been reached at an address
(part 6).

No domain is needed. The site goes live on `https://<worker-name>.<subdomain>.workers.dev`,
which sends `noindex` (DEPLOYED). `<subdomain>` is the Cloudflare account's, not the
Worker's: the create screen has no field for it, and it is public. The owner does the
dashboard parts; a session verifies.

## 1. The account

| Setting | Set to | Tag |
|---|---|---|
| Two-factor authentication | On, with recovery codes stored offline | LIVE |
| Members | Only people who need the dashboard. On the Free plan the one role an added member can hold is Administrator, which reaches DNS, the registrar and member management. | LIVE |
| API tokens | None before the repo is connected. Exactly one afterwards: see below. | DOCS |

- Connecting a repo makes Cloudflare generate **one API token** for its builds. It is a user
  token, listed under the connecting user's My Profile, API Tokens. Do not delete or roll it:
  builds then fail with "The build token selected for this build has been deleted or rolled".
- **The token is not scoped to this Worker** (DEPLOYED: the create screen lists its
  permissions before making it). It can edit Workers scripts and the account's Workers
  storage products, such as KV, R2, D1 and Queues. It can edit Workers Routes on every zone
  in the account. It can read the account's settings and the user's details and memberships.
  Give it a name on the create screen (part 3), so it can be told apart later.
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
| `preview_urls` | `true` | Gives previews an address, at hostnames ending `-<worker-name>.<subdomain>.workers.dev`. The cost is a public address for every uploaded version too. Wrangler 4.168's schema gives `false` as the default. |
| `previews` | `{}` | Pull-request previews are built with `wrangler preview`, which reads this block. Empty means no overrides. |

`npx wrangler deploy --dry-run` accepts this file (LOCAL). It uploads nothing.

**With `preview_urls` set to `false`, a branch's preview has no address** (DEPLOYED). The
starter shipped that way at first. A pushed branch's preview built and passed, and its
hostname answered Cloudflare's `error code: 1042`. The dashboard has a switch for the same
setting, on the Worker's Domains tab. It was turned on there while the file still said
`false`, and after the next deploy the preview hostnames answered 1042 as before. Set it in
the file.

**OPEN:** that a preview answers now that the file says `true`. That comes from Wrangler
4.168's schema and from its own message for a preview with no active URL. It has not been
seen on a deploy.

**OPEN:** whether an empty `previews` block is required for branch builds, or merely allowed.
A branch build ran with the block present (DEPLOYED).

## 3. Create the Worker

In the Cloudflare dashboard: Workers & Pages, Create application, import a repository.
Choose the GitHub account and this repo, scoping the GitHub App to this repo only (step 2).

The last screen, "Set up your application", takes every setting at once. These are its
fields, with the values the starter was deployed with on 2026-11-26 (DEPLOYED):

| Field | Set to | Why |
|---|---|---|
| Project name | the same as `name` in `wrangler.jsonc` | This is the Worker's name, and the first label of its hostname. |
| Build command | `npm run build` | It runs the type check, the tests and `verify-dist` around the build. `npx astro build` alone would deploy without any of them. |
| Deploy command | `npx wrangler deploy` | |
| Preview command | `npx wrangler preview` | Builds the preview for a branch other than `main` (DOCS). |
| Enable Preview builds | On | Every push to a branch other than `main` builds a preview, and the pull request shows its build check (DEPLOYED). |
| Protect with Cloudflare Access | Off | Not tried. `verify-live.sh` expects to reach the site without signing in. |
| Path, under Advanced settings | `/` | The repo root. |
| API token | Create new token | Cloudflare makes the build token described in part 1. |
| API token name | a name that says what the token is for, such as `<worker-name> builds` | The field starts empty. The name is how the token is recognised later in the user's list of API tokens. |
| Variable name, Variable value | empty | Node comes from `.nvmrc`. This project has no secrets. |

Then press Deploy. Cloudflare creates the Worker, then builds and deploys the default branch.

The screen has no field for the production branch. After creation it is on the Worker's
Settings, Builds page, set to `main`, beside the same build settings (DEPLOYED). That page
also has a "Disable builds" switch, build watch paths (`*` to begin with), deploy hooks and
a build cache.

**Open that page once the first build is done.** If it carries the banner "This project is
disconnected from your Git account", the GitHub App cannot see the repo, and no push will
build (step 2, part 5). A first build that deployed does not show the repo is connected: on
2026-11-26 the first build succeeded while the banner was up (DEPLOYED).

The Worker's Domains tab lists two Worker URLs, each with a switch (DEPLOYED): Production,
`<worker-name>.<subdomain>.workers.dev`, and Preview,
`*-<worker-name>.<subdomain>.workers.dev`. `workers_dev` and `preview_urls` in
`wrangler.jsonc` are the same two settings. Change the file, not the switch (part 2).

## 4. Read the first build log

A green check is not enough. In the log, confirm the four things below. The lines quoted are
from the starter's production build of 2026-11-26 (DEPLOYED).

1. **Node is 24.22.3.** Workers Builds reads `.nvmrc`. With no build variable set, the log
   said `Detected the following tools from environment: nodejs@24.22.3, npm@10.9.2`, then
   `Installing nodejs 24.22.3`.
   - If the install step fails with `EBADENGINE`, the pin was not honored. Set a build variable
     `NODE_VERSION=24.22.3` and rebuild.
   - If the image cannot provide 24.22.3 at all, change `.nvmrc` and `engines.node` in
     `package.json` to the newest 24.x it offers, in one commit. Keep the two equal.
2. **The install used the lockfile:** `Installing project dependencies: npm clean-install
   --progress=false`. `panda codegen` ran after it (the `prepare` script) and wrote
   `styled-system`. Without it, `astro check` fails on every `styled-system/...` import.
3. **`npm run build` printed fifteen `PASS` lines**, then `verify-dist: 12 pages checked, all
   passed`.
4. **The deploy step uploaded the assets** and printed the hostname. It lists only new or
   modified assets, so a file that did not change is not on the list. Every HTML page is on
   it after every commit, because each page carries the commit's marker.

That build took a little over two minutes from start to finish.

The detection line names npm 10.9.2. The development machine's Node 24.22.3 has npm 11.19.1.
The log does not say which npm ran the install; it succeeded.

Record the Node line and anything unexpected in `docs/index.md`.

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

The script is copied from `docs/archive/technical-brief.md`, where it was run against public
hosts. On 2026-11-26, after a merge to `main` had built and deployed, it printed 36 `PASS`
lines and no `FAIL` against the starter's production hostname (DEPLOYED):

| Was open | What the deploy showed |
|---|---|
| `_headers` applies on Workers, including to the 404 response | It does. The six headers arrived on the page and on the 404. |
| The `workers.dev` rule in `public/_headers` matches the production hostname | It does: the host sent `X-Robots-Tag: noindex`. Never put `X-Robots-Tag` under `/*`: that de-indexes the real domain later. |
| The marker equals the full commit SHA | It does, on a build that a push started: `WORKERS_CI_COMMIT_SHA` held the merge commit's full SHA. |

**A build started from the dashboard has no commit** (DEPLOYED). The Worker's very first
build was started by the create screen. Its marker read `main`, the Deployments list showed
it as "Empty commit message", and two lines of this script failed: the marker line, and the
404 line, which looks for the same SHA. They passed once a push-started build replaced it.

The status codes and cache headers of step 1, part 4 were the same on the deployed host
(DEPLOYED): `/terms` answered 307 to `/terms/`, `/sitemap.xml` and `/_headers` answered 404, a
file under `/_astro/` was `immutable`, and HTML was `max-age=0, must-revalidate`.

Then check the island on the deployed host. `npm run audit -- https://<host>` does it in
Chrome. Against the deployed host it printed thirteen `PASS` lines, among them "no console
message, so no Content Security Policy violation" (DEPLOYED).

## 6. Prove the whole loop once

1. On a branch, change one word in `src/data/records.yml`. The owner pushes it and opens a
   pull request.
2. Find the preview's address and run `verify-live.sh` in `preview` mode against it, with the
   branch's commit. **OPEN:** where Cloudflare gives the address. It left no comment on a
   pull request whose preview had none.
3. Run the "branch contains `main`" check from step 2, then the owner merges.
4. Wait for the green check on the merge commit, then run `verify-live.sh` against the
   production hostname with the new `main` commit.

Run on 2026-11-26, all but item 2 (DEPLOYED). A pushed branch started a preview build 16
seconds after the push, and the pull request showed its build check. The merge started a
production build, and `verify-live.sh` passed against production with the merge commit. So
auto-deploy is seen, not assumed. What is still assumed is that a preview can be checked
before the merge: `preview_urls` was `false` then (part 2).

## 7. Know these before they are needed

- **Rollback** is in the dashboard: the Worker, Deployments, the menu on an older deployment.
  Code, config and assets roll back together.
- **A failed build sends no alert** and leaves the previous version serving. The merged
  commit's status check is the alert, which is why the loop ends with `verify-live.sh`.
- **A push that starts no build sends no alert either.** The previous version keeps serving
  and the commit has no status check at all (DEPLOYED: part 3).
- **Previews are public** to anyone with the URL. They send `noindex`, but they are not
  private. Do not put uncleared content on a branch.
- **Free plan limits:** 3,000 build minutes a month, one build at a time, 20 minutes per
  build; 20,000 files per version, 25 MiB per file.
- **Some default client user agents are refused on `workers.dev`** (error 1010, seen with
  Python's `urllib`, LIVE). `verify-live.sh` sends its own user agent for this reason.
