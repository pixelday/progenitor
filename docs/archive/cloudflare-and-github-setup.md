# Cloudflare and GitHub setup for a progenitor instance

Everything that has to be configured outside the site's own content before a
progenitor-derived site can build, deploy and serve correctly: the GitHub repository, the
Cloudflare project, the domain and DNS, the zone settings, and the few repo files that
Cloudflare reads.

This guide stands alone. It uses `example.com` throughout and names no client, so it can
sit in a new instance's getting-started folder as-is.

## Status and confidence

Two stacks appear here, and they are not equally proven.

- **Proven stack: Jekyll, built and served by Cloudflare Pages.** The reference instance (the
  first production progenitor site) has run this configuration since mid-2026.
- **Target stack: Astro, built by Workers Builds and served as Workers static assets.** This
  is where new instances are headed. No progenitor instance has been deployed on it yet.

The domain, DNS, zone, account and GitHub configuration is the same on both stacks. Only
the build and the project differ. Sections 5 and 6 give the target stack; Appendix A gives
the proven values for the same settings.

Every claim carries one of four tags:

| Tag | Meaning |
|---|---|
| **RUN** | Executed on a live progenitor instance. Where it can be observed from outside, it was re-measured on 2026-11-25. |
| **LOCAL** | Executed on 2026-11-25 against a throwaway Astro 7.4 fixture using `astro build`, `wrangler dev`, `wrangler deploy --dry-run` (wrangler 4.168) and headless Chrome. Never deployed to Cloudflare. |
| **DOCS** | Read in Cloudflare, Astro or GitHub documentation on 2026-11-25. Not executed. |
| **OPEN** | Not established. The step says how to settle it. |

Treat every DOCS and OPEN item as something the first target-stack instance must confirm,
then update this file. Dashboard labels move often: where a click path is given, navigate
by intent and do not trust the exact wording.

## 1. The model

```
 client's GitHub account                       client's Cloudflare account
┌───────────────────────────┐   GitHub App    ┌──────────────────────────────────┐
│ private repo: example.com │ ──────────────▶ │ project: builds on every push     │
│   main  = production      │  read access,   │   └▶ static files on the edge     │
│   other branches = preview│  this repo only │ zone example.com: DNS, TLS, rules │
└───────────────────────────┘                 │ registrar: example.com            │
                                              └──────────────────────────────────┘
```

Four rules shape every setting below.

1. **The client owns both accounts.** The repository, the Cloudflare account, the zone and
   the domain registration all belong to the client. The operator is a collaborator on the
   repository and, by default, holds no Cloudflare login at all (section 3).
2. **A merge to `main` is the only deploy path.** Cloudflare's Git integration builds on
   push. There is no GitHub Actions workflow, no deploy token and no secret stored in
   GitHub.
3. **Nothing executes at the edge.** The site is static files only: no Worker script, no
   Pages Functions. Forms post from the visitor's browser straight to the third-party
   system that processes them, so visitor data never crosses the Cloudflare account. Adding
   server-side code changes the site's data-handling position and needs a fresh review
   first.
4. **Configuration lives in the repository wherever the platform allows it.** Whatever can
   only be set in a dashboard is listed in section 10, because those settings do not travel
   with the client's files.

## 2. Order of operations

Do these in order. Each step names the section that explains it.

1. Confirm who owns each account, that recovery paths work, and turn on 2FA (section 3).
2. Create the private repository, apply its settings and set the commit identity
   (section 4).
3. Add the host-configuration files to the repository and get a green local build
   (section 5).
4. Connect the repository to Cloudflare and get a green first build on the platform
   hostname (section 6).
5. Check the build output on the platform hostname **before touching DNS** (section 6.4).
6. Attach the apex domain (section 7.2).
7. Add the `www` redirect, starting at 302 (section 7.3).
8. Apply the zone settings, plus the no-mail records if the domain carries no mail
   (sections 8 and 7.8).
9. Flip the launch switches: canonical URL and indexability (section 5.7).
10. Run the verification sweep (section 9).
11. Change the `www` redirect to 301, then raise HSTS (sections 7.3 and 7.6).
12. Record what was set in dashboards, and remove any temporary operator access
    (sections 10 and 3).

## 3. Accounts and access

| Account | Owner | Operator's access |
|---|---|---|
| GitHub (repository) | Client | Collaborator with Write access |
| Cloudflare (hosting, DNS, registrar) | Client | None by default. The client drives on a screenshare. |

**Why the operator holds no Cloudflare login.** On the Free plan the only role an added
member can be given is Administrator (RUN). That one seat reaches DNS, including the MX records that deliver
the client's mail, the domain registration, and member management. A Write collaborator on
one repository reaches one repository's contents. Not holding the credential removes the
whole class of custody, rotation and offboarding work. If a seat is ever granted, time-box
it to the task and remove it afterwards.

**Before removing an operator seat**, finish everything that needs the dashboard (sections
6 to 8 and the sweep in section 9), and confirm the owner cannot be locked out. The recovery
action for a failed deploy is a dashboard click, so one login is a single point of failure
(RUN). Where the client has more than one principal, give two of them their own Cloudflare
logins. Where the site has a single owner, a second member is not the answer: the control
is the offline recovery kit in 3.1, tested once.

**The owner, not a temporary operator, connects the repository to Cloudflare** (6.1). The
build token belongs to the user who made the connection (3.2), so it stops working when that
user leaves the account.

### 3.1 Recovery first, then 2FA

Do these in this order. Enabling 2FA on an account whose recovery path is broken can lock
the client out.

1. Confirm each account's recovery email and phone are current and reachable.
2. Where the service allows it, have two owners or administrators.
3. Enable 2FA with an authenticator app (TOTP) on every account that has access, then add a
   passkey. On GitHub a passkey can only be added after TOTP or SMS is configured (DOCS,
   read 2026-09), so TOTP comes first. Path: profile picture, Settings, Password and
   authentication, Two-factor authentication (RUN).
4. Print or store the recovery codes offline. Do not store them inside the account they
   recover.
5. Check each account from a private browser window: the sign-in must ask for the second
   factor.
6. Test one recovery end to end from a logged-out browser before relying on any of it.

**Where the secrets live.** Three rules, all from the reference instance's hardening work:

- **Find the root of the recovery tree and harden it hardest.** One mailbox or identity
  receives the password resets for everything else. Its own 2FA and recovery material live
  offline, outside any password manager that the same identity unlocks.
- **Do not keep an account's TOTP seed in the same vault as its password.** That collapses
  two factors into one: whoever opens the vault holds both. For the accounts in this guide
  use a separate authenticator app, or passkeys.
- **Recovery codes are a second-factor bypass**, so the same reasoning applies to them.
  Offline is the reference rule. Keeping them in the password manager beside the password
  is a convenience trade that should be made on purpose, not by default.

**The circular dependency to check for.** If the Cloudflare login address is a mailbox on
the same domain whose MX records live in this Cloudflare zone, then resetting the
Cloudflare password depends on Cloudflare DNS working. Offline recovery codes, and a second
member where there is one, are what break that loop (RUN).

### 3.2 Cloudflare API credentials

- **Global API Key.** Every Cloudflare user has one. It cannot be created or deleted, only
  viewed or rolled, and it carries that user's full permissions (DOCS). Nothing in this
  setup uses it. If it has ever been copied anywhere, roll it. Path: avatar, My Profile,
  API Tokens, API Keys, Global API Key (RUN). It is not on the account-level API tokens
  page.
- **API tokens.** Before a repository is connected, expect none anywhere. On the proven
  stack that stays true. On the target stack expect exactly one after connecting: Workers
  Builds generates an API token for its own deploys and reuses it for every build (DOCS).
  - It is a **user** token, listed under the connecting user's My Profile, API Tokens, not
    under the account's tokens. Only user tokens are supported today (DOCS).
  - Its permissions are Account Settings (read), Workers Scripts, KV and R2 (edit), Workers
    Routes (edit) on every zone in the account, and User Details and Memberships (read)
    (DOCS).
  - If it is deleted or rolled, builds fail with "The build token selected for this build
    has been deleted or rolled", and the fix is to create a new token and select it in the
    build settings (DOCS). So a check that says "API tokens: none" is right before the
    connection and wrong after it. Do not delete this token to make that check pass.
  - Any other token is something a person created on purpose, so ask what it is for.
  - No machine needs `wrangler login`. Deploys happen in Cloudflare's build, never from a
    laptop.

## 4. GitHub repository

Create the repository in the client's GitHub account, private, named after the domain
(`example.com`), with `main` as the default branch. Start it empty or from the progenitor
starter.

**Do not seed it by copying another client's repository.** That has leaked another
client's URL, config keys and internal comments into a new instance's first commit (RUN).
Copy structure by hand. Before the first push, scan tracked files for anything that does
not belong:

```bash
git grep -nIiE 'other-client-name|other-client-domain|operator-codename|staging'   # expect no output
```

### 4.1 Settings

These are the reference instance's values, read from the GitHub API on 2026-11-25 (RUN).

| Setting | Value | Where |
|---|---|---|
| Visibility | Private | Settings, General, Danger Zone |
| Default branch | `main` | Settings, General |
| Automatically delete head branches | On | Settings, General, Pull Requests |
| Merge methods | Merge commit, squash and rebase all allowed (GitHub's default). Optional tightening: merge commits only (4.2). | Settings, General, Pull Requests |
| Auto-merge | Off | Settings, General, Pull Requests |
| Wikis | Off | Settings, General, Features |
| Discussions | Off | Settings, General, Features |
| Issues, Projects | On (GitHub's default, unused). Optional tightening: Projects off. | Settings, General, Features |
| GitHub Pages | Not enabled, and no `CNAME` file in the repository | Settings, Pages |
| Actions workflows | None. There is no `.github/` directory. | repository contents |
| Actions secrets, deploy keys | None | Settings, Secrets and variables; Deploy keys |

Two more settings belong here. Neither can be read without Admin, so the reference
instance's values are unknown and both are DOCS:

| Setting | Value | Where |
|---|---|---|
| GitHub Actions | Disabled | Settings, Actions, General, Actions permissions |
| Dependabot alerts | On | Settings, Security and quality, Advanced Security |

- **Disabling Actions makes rule 2 in section 1 mechanical**: a workflow file added later
  cannot run. Cloudflare builds on its own infrastructure and does not use Actions. Whether
  its build status still appears on pull requests with Actions disabled is not documented;
  confirm it on the first pull request (OPEN).
- **Dependabot alerts report vulnerable build dependencies** (`astro`, `wrangler`, gems).
  They do not need Actions. If Dependabot updates are ever enabled, GitHub runs them even
  where Actions is disabled (DOCS).

Read the settings back. This works with Write access:

```bash
gh api repos/OWNER/REPO --jq '{private, default_branch, delete_branch_on_merge, allow_merge_commit, allow_squash_merge, allow_rebase_merge, has_wiki, has_projects, has_discussions, has_pages}'
# the reference instance prints:
# {"allow_merge_commit":true,"allow_rebase_merge":true,"allow_squash_merge":true,"default_branch":"main","delete_branch_on_merge":true,"has_discussions":false,"has_pages":false,"has_projects":true,"has_wiki":false,"private":true}
# with both optional tightenings, allow_rebase_merge, allow_squash_merge and has_projects read false

gh api repos/OWNER/REPO/contents/.github
# expect an error ending "gh: Not Found (HTTP 404)": no workflows exist
```

The Actions and Dependabot settings have no collaborator-side command: both API reads
return 404 to a Write collaborator (RUN). Confirm them on the settings page with the owner.

Changing settings needs Admin, which a collaborator does not have, so the owner applies
them in the web UI or runs this (DOCS, not run here for that reason):

```bash
gh api -X PATCH repos/OWNER/REPO -F delete_branch_on_merge=true -F has_wiki=false
```

### 4.2 Collaborators and branch protection

- **Operator access is Write, not Admin.** On a repository owned by a personal account,
  collaborators can push and open pull requests but cannot change settings, manage
  collaborators or delete the repository (RUN). That limit is the point.
- **Keep the collaborator list minimal.** Only the owner can read or prune it.
- **Merge commits only is a sound tightening.** The reference instance allows all three
  merge methods. Squash and rebase merges rewrite the branch's commits into new ones, so a
  local `git branch -d` on the merged branch then refuses with "not fully merged" (LOCAL),
  and cleanup needs the unsafe `-D`. Allowing merge commits only keeps the safe delete
  working and keeps every branch's commits reachable from `main`.
- **Branch protection is a plan decision, not a default.** Protected branches and rulesets
  on a *private* repository need a paid GitHub plan (Pro for a personal account, Team for
  an organization); on Free they apply to public repositories only (DOCS, read 2026-06).
  The reference instance runs on convention: every change arrives as a pull request and
  nobody commits to `main` directly. Decide per instance whether the plan cost is worth
  making that mechanical.

### 4.3 The Cloudflare GitHub App

Cloudflare reads the repository through the GitHub App named **Cloudflare Workers and
Pages**. One App serves both Pages and Workers Builds (DOCS).

- Install it on the account that owns the repository, choose **Only select repositories**,
  and select this repository alone (RUN). This scoping is the one credential in the whole
  deploy path, so keep it to one repository.
- A new repository does not appear in Cloudflare's picker until it is added to the App's
  repository access. This is the most common stall (RUN). Fix it in GitHub: Settings,
  Applications, Installed GitHub Apps, Cloudflare Workers and Pages, Configure.
- The App posts a build status check and a comment on each pull request (DOCS).

### 4.4 Working loop

1. Branch from `main`, commit, push the branch. Cloudflare builds a preview.
2. Open a pull request. Review the preview URL in the pull request comment.
3. Merge to `main`. Cloudflare builds and deploys production.
4. Wait for the green check on the merge commit, then give it a minute before loading the
   site. A failed build does not take the site down; the previous deployment keeps serving
   (DOCS).

After the first merge, set `git config --global fetch.prune true`. With auto-delete on,
merged branches linger locally as phantom `origin/*` refs unless fetches prune (RUN).
`git ls-remote --heads origin` is the ground truth for what exists on GitHub.

### 4.5 Commit identity

Every commit carries its author's email address, and history cannot be changed afterwards
without rewriting it. Decide this before the first commit. The reference instance did not:
most of its history carries real addresses (RUN). Everything below is DOCS.

On every GitHub account that will commit or merge, under Settings, Emails:

| Setting | Value | Effect |
|---|---|---|
| Keep my email addresses private | On | Merges and edits made in the web UI are authored with the account's `noreply` address. |
| Block command line pushes that expose my email | On | A push is refused when its most recent commit is authored with one of the account's private addresses. It requires the setting above. |

Then set the same `noreply` address in each clone, per repository and not globally:

```bash
gh api users/LOGIN --jq '"\(.id)+\(.login)@users.noreply.github.com"'   # prints the address
git config user.email "ID+LOGIN@users.noreply.github.com"
```

Accounts created before July 2017 may show the older `LOGIN@users.noreply.github.com` form;
use whichever the Emails page displays. The push block inspects only the latest commit, so
it is a net and not a guarantee. The audit is:

```bash
git log --format='%ae' | sort | uniq -c    # expect only noreply addresses
```

## 5. Repository files that configure the host

Target-stack layout:

```
example.com/
├── wrangler.jsonc        Cloudflare project config: assets, 404, domain, hostnames
├── astro.config.mjs      canonical URL, URL shape, no inlining
├── package.json          build script, astro + wrangler as locked dependencies
├── package-lock.json     committed
├── .node-version         the only Node pin
├── .gitignore
├── public/
│   ├── _headers          security headers, CSP, cache rules
│   ├── _redirects        path-level redirects
│   └── robots.txt
└── src/pages/404.astro   becomes dist/404.html
```

### 5.1 `wrangler.jsonc`

```jsonc
{
  // Must match the Worker's name in the Cloudflare dashboard.
  "name": "example-com",
  "compatibility_date": "2026-11-25",

  // Static files only. There is deliberately no "main": no code runs at the edge.
  "assets": {
    "directory": "./dist",
    "not_found_handling": "404-page",
    "html_handling": "auto-trailing-slash"
  },

  // Production hostname. Cloudflare creates the DNS record and certificate.
  "routes": [{ "pattern": "example.com", "custom_domain": true }],

  // Platform hostnames: off for production, on for branch previews.
  "workers_dev": false,
  "preview_urls": true
}
```

This file parses and passes `wrangler deploy --dry-run` (LOCAL). What each key is for:

| Key | Value | Why |
|---|---|---|
| `name` | `example-com` | Workers Builds fails the build if this differs from the Worker's dashboard name (DOCS). Worker names cannot contain dots. |
| `main` | absent | Assets-only Workers do not need it (DOCS). Its absence is what guarantees rule 3 in section 1. |
| `assets.directory` | `./dist` | Astro's output directory. |
| `assets.not_found_handling` | `404-page` | The default is `none`. With `404-page`, a missing path returns status 404 with the body of `404.html` (LOCAL). On Pages this was automatic; on Workers it must be set (DOCS). |
| `assets.html_handling` | `auto-trailing-slash` | The default, written out. `about.html` is served at `/about`; `/about/` and `/about.html` answer 307 to `/about` (LOCAL). |
| `routes` | apex with `custom_domain: true` | Attaches the production domain from the file instead of the dashboard (DOCS). See 6.5 for when to add it. |
| `workers_dev` | `false` | Turns off `example-com.<account>.workers.dev`. Set it in the file: a dashboard-only toggle is re-enabled by the next deploy (DOCS). |
| `preview_urls` | `true` | Keeps branch previews working. With `workers_dev` off, preview URLs default to off unless this is set (DOCS). |

`_headers` and `_redirects` are read from the assets directory and are not served as files:
requesting `/_headers` returns 404 (LOCAL).

### 5.2 `public/_headers`

Astro copies everything in `public/` to `dist/` unchanged (LOCAL), which is where Cloudflare
looks for this file (DOCS).

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; manifest-src 'self'; form-action 'self'; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests
  Strict-Transport-Security: max-age=300
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

https://:worker.:account.workers.dev/*
  X-Robots-Tag: noindex
```

**Security headers.** The six headers under `/*` are the reference instance's production
set (RUN, re-measured 2026-11-25), with two differences: the CSP shown is the baseline
before any additions, and HSTS starts low (section 7.6 raises it to `max-age=31536000;
includeSubDomains`).

**The CSP is strict `'self'` on purpose.** The site hosts its own CSS, fonts, images and
scripts, with no inline styles, no inline scripts and no iframes. The policy is what
enforces the no-third-party posture the privacy policy describes. Each addition below is a
deliberate change that must be made together with the matching privacy-policy wording:

| To allow | Add | Note |
|---|---|---|
| A form that posts to a third-party processor | `form-action 'self' https://processor.example https://example.com` | Browsers enforce `form-action` across the whole redirect chain. If the processor answers with a redirect to a thank-you page on the canonical domain, a submission from any other hostname (a preview URL) is blocked on that hop unless the canonical origin is listed. The console error names the processor's URL, which makes an allowed origin look blocked (RUN). |
| Cloudflare Web Analytics | `script-src 'self' https://static.cloudflareinsights.com` and `connect-src 'self' https://cloudflareinsights.com` | See section 8.3. Whether the `connect-src` entry is needed on a proxied zone has not been verified; it costs nothing (RUN). |
| Images embedded as `data:` URIs | `img-src 'self' data:` | Image context only. Never copy `data:` to `script-src`, `style-src` or `default-src` (RUN). |
| Turnstile, tag managers, pixels, embeds | the vendor's hosts on `script-src`, `connect-src`, `img-src`, `frame-src` as needed | Tag managers and pixels also ship an inline bootstrap script, which `script-src 'self'` blocks even when the hosts are allowed. Each of these is a privacy-policy change first and a header change second. |

If something is blocked unexpectedly after a deploy, rename the header to
`Content-Security-Policy-Report-Only`, read the browser console, fix the cause, then rename
it back.

**Cache rules.** Cloudflare serves every asset as `public, max-age=0, must-revalidate` with
an ETag by default (LOCAL, DOCS). Astro writes content-hashed filenames into `/_astro/`
(LOCAL: `main.l9UgTbXj.css`), so those files are safe to cache for a year as `immutable`
(LOCAL: the header is served). Files that come from `public/` keep their names across
deploys, so they must keep the default. Do not add a long `max-age` to them.

**Platform-hostname rule.** `_headers` rules can be scoped to a hostname with an absolute
URL, and Cloudflare documents this pattern for keeping `workers.dev` URLs out of search
results (DOCS). It covers the period before `workers_dev` is turned off. Cloudflare's
example is written for preview hostnames; the production `workers.dev` hostname has the
same two-label shape, so the rule should match it too, but that is an inference: check it
with `curl` during the first build (6.4). After adding any `X-Robots-Tag` rule, confirm the
canonical domain does **not** carry the header (section 9): a `noindex` that reaches the
canonical domain de-indexes the site.

Limits: 100 rules, 2,000 characters per line (DOCS).

### 5.3 `public/_redirects`

Path-level aliases within the site, one per line. Always write the status code, because it
defaults to 302 when omitted (DOCS).

```
/home        /         301
/about-us    /about    301
/privacy     /privacy-policy    301
```

`_redirects` matches paths only. It cannot match a hostname, so `www` and secondary domains
are handled by zone Redirect Rules (section 7), never here (DOCS). Limits: 2,000 static and
100 dynamic redirects, 1,000 characters each (DOCS). A `/home` rule returns 301 as written
(LOCAL).

### 5.4 `astro.config.mjs`

```js
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://example.com",
  trailingSlash: "never",
  build: {
    format: "file",
    inlineStylesheets: "never",
  },
  vite: {
    build: { assetsInlineLimit: 0 },
  },
});
```

No Cloudflare adapter is installed. A static Astro site does not need one (DOCS).

| Option | Value | Why |
|---|---|---|
| `site` | the canonical origin | Source of canonical URLs and the sitemap. Keep it equal to the hostname the `www` redirect targets. |
| `build.format` | `"file"` | Emits `about.html`, served at `/about`. The default (`"directory"`) emits `about/index.html`, served at `/about/` (LOCAL). The reference instance's URLs have no trailing slash; pick one shape and keep canonical tags, the sitemap and `_redirects` consistent with it. |
| `trailingSlash` | `"never"` | Matches the URL shape above in generated links. |
| `build.inlineStylesheets` | `"never"` | The default inlines small stylesheets as `<style>` blocks, which `style-src 'self'` blocks (LOCAL). |
| `vite.build.assetsInlineLimit` | `0` | The default inlines small scripts as `<script type="module">` blocks, which `script-src 'self'` blocks. Removing this line alone brings the inline script back (LOCAL). |

**Check the built output, not the config.** Run both after every build; both must print
nothing. With Astro's defaults both report hits (LOCAL):

```bash
# inline styles
grep -rlE '<style[ >]| style="' dist --include='*.html'

# inline scripts (JSON-LD data blocks are not governed by script-src)
grep -rhoE '<script[^>]*>' dist --include='*.html' | grep -v ' src=' | grep -v 'application/ld+json' | sort | uniq -c
```

Astro also has a built-in CSP feature (`security.csp`, since 6.0) that emits a `<meta>` tag
with hashes (DOCS). Leave it off on a site with no client-side components: a `<meta>` policy
cannot carry `frame-ancestors`, and the header in `_headers` is then the single home for the
policy. A site with an interactive island needs it; see 5.8.

### 5.5 Runtime pin and lockfile

- **`.node-version`** holds one exact version, for example `24.22.1`. This is the only Node
  pin. Workers Builds honors `.node-version`, `.nvmrc` or a `NODE_VERSION` build variable,
  and does not document which wins when they disagree (DOCS), so use exactly one, and use
  the file because it travels with the repository.
- **The version must satisfy the framework.** Astro 7.4 requires Node 22.23.4 or later and
  refuses to build on anything older (LOCAL). On 2026-11-25 the build image defaulted to
  Node 24.22.1 and also preinstalled 22.23.4 (DOCS). The image's defaults move to newer
  minor versions without notice, which is the reason to pin.
- **The operator's machine runs the same version.** A local build proves something about
  the deploy only when both sides run the same runtime. Confirm the version in the first
  build log (OPEN until then).
- **Commit `package-lock.json`, and generate it under the pinned Node.** A lockfile
  installed under an unsupported Node skipped a native dependency and the build then failed
  with a missing-module error; reinstalling under the right Node fixed it (LOCAL).
- **Keep `astro` and `wrangler` in `package.json`** so the lockfile fixes the versions the
  build and deploy commands use.

`.gitignore`: `node_modules/`, `dist/`, `.astro/`, `.wrangler/`, `.env*`, `.dev.vars*`,
`.DS_Store`. Pages excluded stray files from uploads automatically; Workers does not, and
uses a `.assetsignore` file in the assets directory instead (DOCS). Keeping junk out of
`public/` is simpler than maintaining one.

### 5.6 The 404 page

`src/pages/404.astro` builds to `dist/404.html` (LOCAL). Together with `not_found_handling`
it makes a missing path return a real 404. Without both, the failure is silent: the proven
stack served the homepage with status 200 for every missing URL until a `404.html` existed
(RUN).

### 5.7 Launch switches

Two values decide whether a deploy is exposed to search engines, and they flip together at
launch:

1. **Canonical URL**: `site` in `astro.config.mjs`.
2. **Indexability**: before launch, `robots.txt` says `Disallow: /` and pages carry
   `<meta name="robots" content="noindex">`. At launch, `robots.txt` allows crawling and
   names the sitemap, and the `noindex` is gone.

How the starter exposes the second switch is the starter's business. What matters here is
the check after the flip: four surfaces on the live canonical domain, in section 9. The
reference instance once shipped a production release with the pre-launch values still in
place, which is why this is checked on the live site and not in the source (RUN).

Workers Builds sets `WORKERS_CI_BRANCH` during the build (DOCS). An Astro build can read it,
so a later refinement is to derive indexability from the branch instead of from a value a
person has to remember to change (OPEN, not built).

### 5.8 Sites with an interactive island

Sections 5.2 and 5.4 assume pages with no inline script. An Astro island (a framework
component with a `client:*` directive) breaks that assumption. Astro writes its island
loader into the page as inline `<script>` blocks, plus one inline `<style>`: a React
component with `client:load` produced two inline scripts and one inline style, and both
checks in 5.4 reported them (LOCAL). Under the strict header in 5.2 the browser refuses
those scripts, and the island never becomes interactive. Nothing visible fails.

Four arrangements were tested with a React island, served by `wrangler dev` and loaded in
headless Chrome (LOCAL):

| | Policy in `_headers` | Astro `security.csp` | Island |
|---|---|---|---|
| A | strict `'self'` from 5.2 | off | does not hydrate |
| B | `frame-ancestors 'none'; upgrade-insecure-requests` | on | **hydrates** |
| C | strict `'self'` from 5.2 | on | does not hydrate |
| D | none (control) | off | hydrates |

Browsers enforce every policy they receive, so a strict header still blocks what the
`<meta>` policy allows (C). Use arrangement B: the fetch directives move into Astro's
config, which adds a hash for each inline block at build time, and the header keeps only
what a `<meta>` policy cannot carry.

Add to `astro.config.mjs`:

```js
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self'",
        "font-src 'self'",
        "connect-src 'self'",
        "manifest-src 'self'",
        "form-action 'self'",
        "frame-src 'none'",
        "base-uri 'self'",
        "object-src 'none'",
      ],
    },
  },
```

Astro writes `script-src 'self'` and `style-src 'self'` itself, each followed by its hashes.
Replace the first rule in `public/_headers` with:

```
/*
  Content-Security-Policy: frame-ancestors 'none'; upgrade-insecure-requests
  Strict-Transport-Security: max-age=300
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()
```

What changes for an island site:

- **The additions table in 5.2 now applies to the `directives` list**, not to the header.
- **The 5.4 checks no longer print nothing.** They list Astro's own island blocks. The
  acceptance check becomes a browser one: load the page with the console open, confirm the
  island responds, and confirm no CSP violation is logged.
- **The header sweep in section 9 no longer shows the full policy.** Read it from the page:
  `curl -sS https://example.com/ | grep -oE '<meta http-equiv="content-security-policy"[^>]*>'`
- **Keep `style` attributes out of island markup.** A hash covers a `<style>` block, not a
  `style="..."` attribute, so inline style props rendered into the HTML are still blocked
  (OPEN: reasoned, not tested).
- Astro's CSP does not support its `<ClientRouter />` view transitions or Shiki syntax
  highlighting (DOCS; the build prints a warning about Shiki).

The alternative of keeping the whole policy in `_headers` and pasting Astro's hashes into it
was not tested. The hashes change whenever Astro or the island runtime changes, so it would
need a build step to regenerate the file.

## 6. Cloudflare project

### 6.1 Create it

In the client's Cloudflare account: Workers & Pages, Create application, connect GitHub and
import the repository (DOCS). Give the Worker the same name as `name` in `wrangler.jsonc`.
The account owner makes this connection, signed in as themselves: the build token it creates
belongs to that user (3.2).

### 6.2 Build settings

Set under the Worker's Settings, Build (DOCS).

| Setting | Value |
|---|---|
| Git repository | `OWNER/example.com` |
| Production branch | `main` |
| Build command | `npx astro build` |
| Deploy command | `npx wrangler deploy` (the default) |
| Preview command | `npx wrangler preview` (the default) |
| Root directory | repository root |
| Enable Preview Builds | On |
| Build watch paths | default (everything) |
| Build variables and secrets | none |
| API token | the one Cloudflare generates |

Dependencies are installed automatically from the lockfile before the build command runs
(DOCS). No build variable is needed: Node comes from `.node-version`.

Free-plan limits: 3,000 build minutes a month, one concurrent build, a 20-minute timeout
per build (DOCS). A static site uses a small fraction of this.

### 6.3 Previews

Every push to a branch other than `main` builds a preview with its own URL (DOCS).

- **Previews are public.** Preview URLs carry `X-Robots-Tag: noindex`, so they stay out of
  search results, but anyone holding the URL can read them (DOCS).
- **Before a preview carries content that is not cleared for the public**, protect previews
  with Cloudflare Access: the Worker's Access tab, Protect this Worker behind Access,
  **Previews only** (DOCS). Use the one-time PIN login with an email allowlist, and test the
  PIN login during setup: the code is single-use, expires in ten minutes, and a mail scanner
  can consume it before the person clicks. Access was planned for the reference instance and
  never put into service, so all of this is DOCS.

### 6.4 First build: verify before touching DNS

For the first deploy only, commit `wrangler.jsonc` without the `routes` entry and with
`"workers_dev": true`. Then:

1. Let the first build finish. Open the build log and confirm the Node version matches
   `.node-version`.
2. Check the site at `https://example-com.<account>.workers.dev`: pages render with styles,
   a `_redirects` alias redirects, a made-up path returns 404, and `curl -sI` shows the
   security headers plus `x-robots-tag: noindex` from the platform-hostname rule.
3. Push a trivial commit and confirm it rebuilds on its own.

This sequence is the proven stack's "verify on the platform hostname before touching
domains" step translated to Workers. Each part is DOCS or LOCAL; the sequence as a whole is
OPEN until the first instance runs it.

### 6.5 Attach the domain from the file

Open a pull request that adds the `routes` entry and sets `"workers_dev": false`, as shown
in 5.1. Merging it attaches the apex and turns off the platform hostname in one deploy.

- The zone must already be active on Cloudflare (section 7.1). Workers custom domains do not
  work on a domain whose nameservers are elsewhere (DOCS).
- A custom domain cannot be created on a hostname that already has a CNAME record (DOCS).
  Remove an existing apex record first. If the domain is currently serving a live site,
  treat this as a cutover: export the zone's DNS records before changing anything.
- If the deploy fails on the route because the generated token lacks a permission, attach
  the domain once in the dashboard (Settings, Domains & Routes, Add, Custom Domain) and
  keep the `routes` entry in the file as the record (OPEN).

## 7. Domain, DNS and TLS

Everything in this section is the same on both stacks and comes from the reference
instance (RUN), except where a line says otherwise.

### 7.1 Before changing anything

```bash
D=example.com
whois "$D" | grep -iE '^\s*(registrar|name server):'   # where the domain lives today
dig +short NS "$D" @1.1.1.1                              # which nameservers answer
dig +short MX "$D" @1.1.1.1                              # is mail at risk?
dig +short DS "$D" @1.1.1.1                              # is DNSSEC on at the registrar?
```

- **Check before assuming a transfer is needed.** A domain already registered at Cloudflare
  with Cloudflare nameservers needs no registrar work at all.
- **A nameserver move moves all DNS, including mail.** If MX records exist, recreate every
  mail record in the Cloudflare zone before the move, and send test mail in both directions
  afterwards.
- **DNSSEC must be disabled at the old registrar before a nameserver move**, or the domain
  stops resolving. Empty `DS` output means none is set.
- **Registrar transfers have a trap.** Changing the registrant's name, organization or email
  can start a 60-day transfer lock at the losing registrar. Transfer first and update contact
  details afterwards. The transfer also needs the registrant's email address to be one that
  receives mail.
- **Mail and verification records are DNS-only** (grey cloud) and are never edited as part
  of site work: MX, SPF, DKIM, DMARC, and site-verification TXT records. A domain that
  carries no mail at all gets the records in 7.8.

### 7.2 Apex

Attach the apex through the project, not by hand-writing a DNS record. Cloudflare creates
the record and the certificate; the apex works through CNAME flattening. The dashboard's
"up to 48 hours" notice is boilerplate: activation took minutes. If a certificate is still
pending after 24 hours, look for CAA records on the zone.

On the target stack this is the `routes` entry (6.5). On Pages it is the project's Custom
domains screen (Appendix A).

### 7.3 `www` redirects to the apex

`www` is **not** attached to the project. Attaching it makes the project serve the whole
site on a second hostname, which is the duplicate the redirect exists to prevent. A Worker
custom domain matches one exact hostname in any case (DOCS).

1. **DNS.** Add a proxied placeholder record. Redirect Rules only run on proxied hostnames;
   a rule for a hostname with no record, or a grey-cloud record, deploys cleanly and never
   fires.

   | Type | Name | Content | Proxy |
   |---|---|---|---|
   | A | `www` | `192.0.2.1` | Proxied |

   `192.0.2.1` is reserved documentation address space. The redirect fires at the edge and
   the address is never contacted.

2. **Rule.** In the zone: Rules, Create rule, Redirect Rule.

   | Field | Value |
   |---|---|
   | Rule name | `www to apex` |
   | When incoming requests match | Wildcard pattern |
   | Request URL | `https://www.*` |
   | Target URL | `https://${1}` |
   | Status code | 302 first, 301 after verification |
   | Preserve query string | On |

   The scheme is required in the pattern. A pattern without `https://` saves cleanly and
   never matches (DOCS).

3. **Expect a false warning on deploy**: "This rule may not apply to your traffic". The
   pre-flight check reads the hostname in the pattern as the literal `www.` and finds no
   such record. Confirm the `www` record exists, then choose to deploy anyway. Do not accept
   the offer to create a DNS record; it prefills the same invalid name.

4. **Verify with `curl`, not a browser**, then edit the rule to 301 (section 9).

**Why 302 first.** Browsers cache a 301 for weeks and there is no way to recall it from a
visitor's machine. A 302 is re-asked every time, so a mistake is fixed the moment the rule
is fixed. Move to 301 when every hostname returns the expected status and `location`, a
deep path and query string survive, and no certificate warning appears. That is a
checklist, not a waiting period: on a site with no traffic it takes minutes.

**A half-configured `www` hangs.** A proxied `www` record with no rule and no origin behind
it does not return an error. Requests time out with no bytes (`curl` reports `HTTP 000`),
so a visitor sees a spinner. Never leave the record in place without the rule.

### 7.4 Secondary domains

A domain that exists only to redirect (another TLD of the same name) is its own zone with
its own single rule.

- DNS: proxied `192.0.2.1` A records for `@` and `www`. No wildcard record on a zone that
  carries mail.
- Rule: match **All incoming requests**; type Dynamic; expression
  `concat("https://example.com", http.request.uri)`; status 302 first, then 301;
  **Preserve query string Off**, because `http.request.uri` already contains the query
  string.
- Always Use HTTPS on that zone: **Off**. The rule already catches `http://`, and the toggle
  would add a second hop.

One rule covers `http://`, `https://`, and both with `www`, in a single hop. If the zone is
currently serving a live site or carrying mail, export its DNS records first, change only
the web records, and confirm mail still arrives afterwards.

### 7.5 HTTPS

| Setting | Content zone | Redirect-only zone | Where |
|---|---|---|---|
| Always Use HTTPS | **On** | **Off** | SSL/TLS, Edge Certificates |
| SSL/TLS encryption mode | Full (strict) | Full (strict) | SSL/TLS, Overview |

- Always Use HTTPS is per zone, and it was **off** by default on a newly created zone.
  Check each zone; do not assume.
- It always answers 301 and cannot be set to 302. That is safe, because `http://host/x` to
  `https://host/x` cannot point at the wrong place.
- If the toggle is missing, the encryption mode is set to Off.
- The encryption mode is the reference runbook's value and was not re-read from a dashboard
  for this guide (OPEN on a zone whose only origin is a Worker).
- **A content zone has exactly one Redirect Rule.** The `http` to `https` leg is this
  toggle, not a rule. Two rules mean something was duplicated.
- **The universal certificate covers the apex and first-level subdomains only.**
  `www.example.com` and `staging.example.com` are covered. `www.staging.example.com` is
  not: it fails during the TLS handshake, before any redirect can run, and no rule can fix
  that. Do not create records two levels deep.

### 7.6 HSTS

HSTS is delivered by `_headers`, not by the dashboard toggle. It has the same hazard as a
bad 301, for longer: browsers hold it for the full `max-age` and it cannot be recalled.

1. Ship `max-age=300` at stand-up.
2. After every redirect is on 301 and verified, raise it to the reference value:
   `max-age=31536000; includeSubDomains`.
3. Before adding `includeSubDomains`, list every subdomain of the zone, including DNS-only
   ones that point at other services. All of them are committed to HTTPS for a year.
4. No `preload`.

### 7.7 Search engines

After launch, add the canonical domain to Google Search Console as a **domain property**,
verified by a DNS TXT record (DNS-only), and submit the sitemap. Import the property into
Bing Webmaster Tools. If the site moved from another domain, keep the old property so the
redirect can be watched landing.

### 7.8 A domain that sends no mail

A domain with no mailboxes should say so in DNS. Otherwise anyone can send mail that claims
to come from it, and receiving servers have nothing to check it against. Three records, all
DNS-only:

| Type | Name | Content | What it says |
|---|---|---|---|
| MX | `@` | priority `0`, mail server `.` | This domain accepts no mail (a "null MX"). |
| TXT | `@` | `v=spf1 -all` | No server may send as this domain. |
| TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s` | Reject anything that claims to. |

```bash
D=example.com
dig +short MX "$D" @1.1.1.1                   # expect: 0 .
dig +short TXT "$D" @1.1.1.1 | grep -i spf1   # expect: "v=spf1 -all"
dig +short TXT "_dmarc.$D" @1.1.1.1           # expect: "v=DMARC1;p=reject;..."
```

- These are the standard records for the purpose, and the commands print exactly this for
  the real `example.com`. No progenitor instance runs them yet (OPEN): the reference
  instance's redirect-only domain carries none of the three (RUN, 2026-11-25), which is a
  gap there, not a decision.
- A `rua=` reporting address is optional. It needs a mailbox to receive the reports, which
  a no-mail domain does not have.
- The same three records suit a redirect-only secondary domain (7.4) that carries no mail.
- **These records and an address on the same domain cannot coexist.** If the site later
  publishes `name@example.com`, replace the null MX and the `-all` SPF with the mail
  provider's records before the address goes live.

## 8. Zone settings

These exist only in the Cloudflare dashboard. The zone runs on the **Free** plan; nothing
here needs a paid plan.

**The rule that explains most of this section:** any zone feature that rewrites pages at the
edge is a change to the site that is not in the repository. Each one stays off unless it has
been decided on purpose, together with the CSP and the privacy policy. Two of them were found
running on live sites without anyone having decided to turn them on.

| Setting | Value | Where | Tag |
|---|---|---|---|
| Browser Cache TTL | **Respect Existing Headers** | Caching, Configuration | RUN |
| Cache Rules, Edge Cache TTL | none | Caching, Cache Rules | RUN |
| Web Analytics | a recorded decision, on or off | Analytics & Logs, Web Analytics | RUN |
| Email Address Obfuscation | **Off** | Scrape Shield | RUN |
| Bot Fight Mode | **Off** | Security, Settings | RUN |
| AI crawler policy | matches `robots.txt` | Security, Settings, Bot traffic | DOCS |
| Rocket Loader and other HTML-rewriting features | Off | Speed | DOCS |
| Turnstile | not used | n/a | RUN |
| Registrar transfer lock | On | Domain Registration | RUN |

### 8.1 Browser Cache TTL

The zone default is four hours, and it silently rewrites any origin `Cache-Control` value
*lower* than itself up to `max-age=14400`. The site's HTML and unhashed assets are served
with `max-age=0`, so under the default a visitor keeps stale pages and stylesheets for four
hours after every deploy. This caused a stale-CSS incident on the reference instance and was
proven by fetching one deployment through the platform hostname and through the zone: same
ETag, different `Cache-Control`. Values longer than the TTL pass through untouched.

Set it to **Respect Existing Headers**. With it set, the canonical domain serves
`cache-control: public, max-age=0, must-revalidate` on HTML (re-measured 2026-11-25).

Whether a Worker custom domain is subject to the same rewrite is OPEN. Settle it at first
stand-up: compare `curl -sI` output for the same path on the `workers.dev` hostname and on
the custom domain before turning `workers_dev` off.

### 8.2 No cache rules

Do not add an Edge Cache TTL or a Cache Rule. Cloudflare's own guidance is that custom
caching in front of its static hosting is what creates stale-after-deploy behavior (DOCS).

### 8.3 Web Analytics

Cloudflare Web Analytics is cookieless, but it is a script served from
`static.cloudflareinsights.com` that Cloudflare injects into pages at the edge. Treat it as
a three-part decision that moves together:

1. the zone's Web Analytics setting,
2. the CSP entries in `_headers` (5.2),
3. the privacy policy's description of analytics.

- **Check the setting even if nobody enabled it.** The beacon was found injected on zones
  where it had never been decided. If the answer is "off", turn it off in the dashboard
  (Web Analytics, Manage site); a strict CSP blocks the script but logs a console error on
  every page load.
- **If on, widen the CSP in the same change.** A strict CSP with the setting on breaks the
  beacon silently.
- **A plain `curl` does not see the beacon.** Cloudflare injects it only into requests that
  send `Accept: text/html`. Probe with that header (section 9).
- The reference instance runs it on, discloses it, and showed no `Set-Cookie` on the pages
  measured.
- Whether edge injection applies to a Worker custom domain is not documented (OPEN). The
  fallback is the manual snippet from the Web Analytics setup screen, which is an external
  script and works with the same CSP entries.

### 8.4 Email Address Obfuscation

It was already on when first looked for, on two zones nobody had configured. It rewrites
every `mailto:` link into a placeholder and injects a decoding
script from `/cdn-cgi/`. Because that path is same-origin, `script-src 'self'` allows it
without any console error: it was found only by reading the served HTML. With it on, a
visitor without JavaScript sees `[email protected]` and no working link. Turn it off for the
zone. If obfuscation is wanted with exceptions, wrap the exempt regions in
`<!--email_off-->` and `<!--/email_off-->`.

### 8.5 Bots and AI crawlers

- **Bot Fight Mode stays off.** Bot-management features can set cookies, which would make a
  "no cookies" statement in the privacy policy untrue. Confirmed off on the reference
  instance.
- **The AI crawler policy must agree with `robots.txt`.** The dashboard setting (now titled
  AI Crawler and Agent access policies) defaults to allow (DOCS). If any policy is set to
  block and Bot Preference Sync is on, Cloudflare prepends its own rules to the site's
  `robots.txt` at the edge (DOCS), so the file served is no longer the file in the
  repository. Decide the posture once and make both layers say the same thing. `robots.txt`
  is advisory; the dashboard policy is the enforcement. If the site ships an `llms.txt`, it
  is a third statement of the same posture and must agree with the other two.
- **Turnstile is not used.** It needs a server-side verification call that a static site
  with a third-party form processor does not have, and the widget does not work without
  JavaScript. Unverified, it is decoration.

### 8.6 Registrar

For domains registered at Cloudflare: keep the transfer lock and auto-renew on, keep a
valid payment method on the account, and make sure the registrant contact is accurate and
its email is a monitored mailbox. The lock, the expiry date and the DNSSEC state are visible
from outside:

```bash
whois example.com | grep -iE 'domain status|dnssec|expir'
# expect "Domain Status: clientTransferProhibited" and an expiry date well in the future
```

The reference instance shows the lock on (RUN, 2026-11-25).

**DNSSEC is a per-instance decision.** The reference instance is unsigned, and that was
never decided either way. What is known:

- When the registrar and the DNS are both Cloudflare, enabling it is one click and free,
  and Cloudflare adds the DS record at the registry itself. Activation can take one to two
  days (DOCS). Path: Domain Registration, Manage Domains, Manage, Configuration, Enable
  DNSSEC.
- The cost is at the exit. Before any nameserver change, DNSSEC must be disabled and the
  old DS record's TTL allowed to expire (commonly 24 to 48 hours), or validating resolvers
  answer SERVFAIL and the domain goes dark for them (DOCS).

```bash
dig +short DS example.com @1.1.1.1                                   # non-empty once signed
dig +dnssec example.com A @1.1.1.1 | grep -E '^;; flags:.* ad[ ;]'   # one line once signed, nothing if unsigned
```

## 9. Verification sweep

Run all of it from outside. It needs no dashboard access, which is the point: every
dashboard setting above has an observable effect here. Quote any URL that contains `?`.
Replace `/about` with a real page path.

```bash
D=example.com

# DNS
dig +short NS "$D" @1.1.1.1      # Cloudflare nameservers
dig +short A  "$D" @1.1.1.1      # Cloudflare proxy addresses
dig +short MX "$D" @1.1.1.1      # unchanged from before the work

# Redirects, HTTPS, 404
for u in "http://$D/" "https://www.$D/about?x=1" "http://www.$D/" \
         "https://$D/about" "https://$D/about/" "https://$D/no-such-page-xyz"; do
  printf '%s -> ' "$u"
  curl -sI --max-time 15 "$u" | grep -iE '^(HTTP|location)' | tr -d '\r' | tr '\n' ' '
  echo
done
```

| Request | Expect |
|---|---|
| `http://example.com/` | 301 to `https://example.com/` (Always Use HTTPS) |
| `https://www.example.com/about?x=1` | 301 to `https://example.com/about?x=1`, path and query intact (302 while testing) |
| `http://www.example.com/` | 301 to `https://www.example.com/`. This is the one legitimate two-hop chain: the HTTPS toggle runs before the rule. |
| `https://example.com/about` | 200 |
| `https://example.com/about/` | a redirect to `/about` (307 on Workers, 308 on Pages) |
| `https://example.com/no-such-page-xyz` | **404**, not 200 |
| any of the above | `HTTP 000` means a proxied hostname with nothing behind it (7.3), not a network blip |

```bash
# Security headers, cache policy, and no stray noindex on the canonical domain
curl -sI --max-time 15 "https://$D/" | grep -iE '^(content-security-policy|strict-transport-security|x-content-type-options|referrer-policy|x-frame-options|permissions-policy|cache-control|x-robots-tag)'
```

Expect all six security headers, `cache-control: public, max-age=0, must-revalidate`, and
**no** `x-robots-tag` line.

```bash
# Edge rewrites: probe the way a browser does
curl -sS --max-time 15 -H 'Accept: text/html' "https://$D/" | grep -oE 'cloudflareinsights|__cf_email__|email-decode|rocket-loader' | sort | uniq -c
```

Expect `cloudflareinsights` only if Web Analytics was decided on, and nothing else.

```bash
# Hashed assets carry the long cache header (target stack)
A=$(curl -sS --max-time 15 "https://$D/" | grep -oE '/_astro/[^"]+\.css' | head -1)
curl -sI --max-time 15 "https://$D$A" | grep -i '^cache-control'    # public, max-age=31536000, immutable

# Indexability after launch: all four surfaces
curl -sS --max-time 15 "https://$D/robots.txt"                              # Allow, plus the Sitemap line
curl -sS --max-time 15 "https://$D/" | grep -ioE '<meta name="robots"[^>]*>|<link rel="canonical"[^>]*>'
curl -sI --max-time 15 "https://$D/sitemap.xml" | head -1                   # 200 (use the sitemap URL robots.txt names)
```

Expect no `noindex` in the `meta` output and a canonical on `https://example.com`.

```bash
# Platform hostname (target stack): must not serve the site once workers_dev is off
curl -sI --max-time 15 "https://example-com.ACCOUNT.workers.dev/" | head -1
```

Finally, load each page type in a browser with the console open and confirm no CSP
violation is logged, and submit the form once from the canonical domain and once from a
preview URL.

## 10. What lives only in dashboards

These settings are not in the repository. If the client takes their files elsewhere, or the
zone is rebuilt, each has to be re-created by hand.

| Where | Setting | Section |
|---|---|---|
| GitHub | repository settings, including Actions and Dependabot; collaborators; the Cloudflare App's repository scope; each account's email privacy settings | 4 |
| Cloudflare project | Git connection, build and deploy commands, production branch, preview builds, Access on previews | 6 |
| Cloudflare zone, DNS | every record: `www` placeholder, mail, verification | 7 |
| Cloudflare zone, Rules | the `www` Redirect Rule; one rule on each secondary zone | 7.3, 7.4 |
| Cloudflare zone, SSL/TLS | Always Use HTTPS; encryption mode | 7.5 |
| Cloudflare zone, Caching | Browser Cache TTL | 8.1 |
| Cloudflare zone, other | Web Analytics; Email Address Obfuscation; Bot Fight Mode; AI crawler policy | 8.3 to 8.5 |
| Cloudflare account | members; 2FA; the build token; registrar lock, contacts and DNSSEC | 3, 8.6 |

Record **that** each was set, by whom and when. Do not keep a document that mirrors the
current values: it drifts from the dashboard without anyone noticing and then reads as
authoritative. To learn the zone's state, read the zone, or run section 9.

## 11. Traps

Each of these cost real time once. Tags as above.

| Symptom | Cause | Fix |
|---|---|---|
| Security headers or redirects absent on the live site | `_headers` or `_redirects` never reached the build output | Astro: keep them in `public/`. Jekyll: list them under `include:` (RUN). |
| Every missing URL returns 200 | No 404 page, or `not_found_handling` unset | 5.1 and 5.6 (RUN on Pages, LOCAL on Workers) |
| Stale pages for hours after a deploy | Zone Browser Cache TTL default | 8.1 (RUN) |
| `www` spins forever, `curl` shows `HTTP 000` | Proxied record with no rule and no origin | 7.3 (RUN) |
| Redirect Rule saved but never fires | Hostname has no proxied record, or the pattern lacks `https://` | 7.3 (RUN, DOCS) |
| Redirect Rule deploy warns it "may not apply" | Pre-flight check misreads the wildcard | Deploy anyway; verify with `curl` (RUN) |
| `http://` not redirected | Always Use HTTPS is off by default | 7.5 (RUN) |
| Certificate error on a deep subdomain | Universal certificate covers one level | 7.5 (RUN) |
| A bad redirect persists after it is fixed | It shipped as 301 and browsers cached it | 302 first, 7.3 (RUN) |
| An audit with `curl` finds no analytics script, a browser does | Edge injection keys on the `Accept` header | Probe with `Accept: text/html` (RUN) |
| Email links show `[email protected]` | Email Address Obfuscation | 8.4 (RUN) |
| Form submits fine in production, blocked on a preview | `form-action` and the processor's redirect back to the canonical domain | 5.2 (RUN) |
| Styles or scripts blocked by CSP after moving to Astro | Astro inlines small stylesheets and scripts by default | 5.4 (LOCAL) |
| An interactive component renders but never responds | The strict CSP blocks Astro's inline island loader | 5.8 (LOCAL) |
| Builds fail with "build token ... deleted or rolled" | The user who connected the repository left the account, or the token was removed | 3.2 (DOCS) |
| `git branch -d` refuses a branch that was merged | The pull request was squash-merged or rebase-merged | 4.2 (LOCAL) |
| Mail forged from a domain that has no mailboxes | No null MX, SPF or DMARC on a no-mail domain | 7.8 |
| Build fails with a missing native module | Lockfile or install produced under an unsupported Node | 5.5 (LOCAL) |
| Build fails with "name must match" | `name` in `wrangler.jsonc` differs from the Worker's dashboard name | 5.1 (DOCS) |
| `workers.dev` hostname comes back after being disabled | It was disabled in the dashboard only | Set `workers_dev` in the file (DOCS) |
| A new repository is missing from Cloudflare's picker | The GitHub App is scoped to selected repositories | 4.3 (RUN) |
| Another client's details in the first commit | The repository was seeded by copying a sibling | 4 (RUN) |
| A deleted branch still shows in `git branch -a` | Fetch does not prune by default | 4.4 (RUN) |
| A registrar transfer is refused for 60 days | Registrant details were changed first | 7.1 (RUN) |

## Appendix A. The proven stack: Jekyll on Cloudflare Pages

Use these values to stand up an instance on the stack that is running today, or to read an
existing instance. Sections 3, 4, 7, 8 and 10 apply unchanged, and so does the sweep in
section 9 apart from its two checks marked "target stack". All RUN unless tagged.

### A.1 Project

Create a **Pages** project, not a Worker. The Create application screen leads with Workers;
the Pages entry is a small link beneath it, or go straight to
`https://dash.cloudflare.com/?to=/:account/workers-and-pages/create/pages`. Choose **Import
an existing Git repository**. A project created by Direct Upload can never be converted to
Git integration (DOCS).

| Setting | Value |
|---|---|
| Production branch | `main` |
| Build command | `bundle exec jekyll build` |
| Build output directory | `_site` |
| Build system version | v3 |
| Environment variable `RUBY_VERSION` | `3.4.4`, on Production and Preview |
| Environment variable `LANG` | `en_US.UTF-8`, on Production and Preview |

- **`RUBY_VERSION` is exactly 3.4.4**, the v3 image's default. Versions 3.4.5 to 3.4.8
  failed to install on the image in early 2026 (DOCS), so the pin has to be exact.
- **`RUBY_VERSION` is the only Ruby pin on the reference instance.** It has no
  `.ruby-version` file and its lockfile has no Ruby block. Two other instances commit a
  `.ruby-version` that disagrees with their `RUBY_VERSION` and build green anyway, so a
  green build does not show which pin won. Which one Pages honors is OPEN: read `ruby -v` in
  a build log of a project that has both. Until then, keep one pin, and if a file is added
  make it equal to the variable.
- **`LANG` is required** as soon as any source file contains a non-ASCII character. Without
  a UTF-8 locale the build reads SCSS as US-ASCII and fails on the first typographic
  character (`Invalid US-ASCII character "\xE2"`).
- Set `JEKYLL_ENV=production` only if templates branch on `jekyll.environment`. The
  reference instance does not set it.
- Free-plan limits: 500 builds a month, one concurrent build, a 20-minute timeout (DOCS).

### A.2 Repository files

| File | Value |
|---|---|
| `_config.yml` | `include: [_redirects, _headers]`. Jekyll drops underscore-prefixed files from `_site` otherwise, and the headers and redirects then never deploy. `exclude:` lists `Gemfile`, `Gemfile.lock`, `README.md` and any tooling files. |
| `_headers`, `_redirects` | At the repository root. Same content as 5.2 and 5.3, without the `/_astro/*` and `workers.dev` rules. |
| `404.html` | At the top level. Without it Pages assumes a single-page app and serves the homepage for every missing path. |
| `Gemfile`, `Gemfile.lock` | Both committed. The reference instance uses the `github-pages` gem at version 232, which resolves to Jekyll 3.10.0 and locks `csv`, `base64`, `logger` and `bigdecimal`; that is what lets it build on Ruby 3.4. An older `github-pages` lock fails on Ruby 3.4 with a `LoadError`. A plain `gem "jekyll", "~> 4.4"` Gemfile is also in service on another instance. If the lockfile was generated on a Mac, add the Linux platform: `bundle lock --add-platform x86_64-linux`. |
| `.gitignore` | `_site/`, `.sass-cache/`, `.jekyll-cache/`, `.jekyll-metadata`, `.bundle/`, `vendor/`, `.DS_Store` |
| `CNAME` | Must not exist. It is a GitHub Pages artifact. |

**Asset caching on Jekyll.** Jekyll does not hash filenames, so the reference instance
stamps every CSS, JS and font URL with `?v=<build time>` and serves `/assets/css/*`,
`/assets/js/*` and `/assets/fonts/*` with `Cache-Control: public, max-age=31536000`. The
stamp and the long cache header are gated by one switch so they cannot drift apart:
unstamped URLs under a year-long cache would pin visitors to stale files. Images are
excluded, and `immutable` is not used because the filenames are not content-hashed. Any
cache rule that ignores query strings would break this.

### A.3 Domain and platform hostname

- Attach the apex in the project's **Custom domains** screen only. A hand-made CNAME to
  `<project>.pages.dev` without that step returns error 522.
- **`<project>.pages.dev` cannot be turned off.** It serves a public copy of production with
  no `noindex`; only the canonical tag points search engines away. Deployment-specific
  preview URLs (`<hash>.<project>.pages.dev`) do carry `X-Robots-Tag: noindex`. An Access
  policy protects previews only, not the project hostname or the custom domain (DOCS).
- Cloudflare documents a host-scoped `_headers` rule for exactly this (DOCS, not yet run on
  a progenitor instance):

  ```
  https://:project.pages.dev/*
    X-Robots-Tag: noindex

  https://:version.:project.pages.dev/*
    X-Robots-Tag: noindex
  ```

  After shipping it, run the header check in section 9 and confirm the canonical domain has
  no `x-robots-tag`. Never put `X-Robots-Tag: noindex` under `/*`.
- Preview deployments are public. Enable the access policy under the project's Settings,
  General before a preview carries content not cleared for the public (DOCS).
- A zone Redirect Rule cannot act on the `pages.dev` hostname, because that hostname is in
  Cloudflare's zone, not the client's. Redirecting it needs an account-level Bulk Redirect
  (DOCS).

### A.4 What changes when an instance moves to the target stack

| Proven (Jekyll on Pages) | Target (Astro on Workers) |
|---|---|
| Pages project settings in the dashboard | `wrangler.jsonc` in the repository |
| `RUBY_VERSION`, `LANG` build variables | `.node-version` file; no variables |
| `bundle exec jekyll build`, output `_site` | `npx astro build`, output `dist` |
| `_headers`, `_redirects` at the root, plus `include:` | the same files in `public/` |
| `404.html` detected automatically | `not_found_handling: "404-page"` |
| `?v=` stamps and a cache switch | content-hashed `/_astro/` files, cached as `immutable` |
| `<project>.pages.dev` always on | `workers_dev: false` |
| Trailing-slash redirects are 308 | Trailing-slash redirects are 307 |
| 500 builds a month | 3,000 build minutes a month |
| Custom domain attached in the dashboard | `routes` entry in the file |

A custom domain cannot be attached to a Worker while the hostname still has the CNAME that
Pages created (DOCS). Moving a live instance is therefore a cutover with a brief gap or a
planned sequence: export the zone, remove the domain from the Pages project, deploy the
Worker with its `routes` entry, run section 9, and keep the Pages project until the sweep
is clean (OPEN: not yet rehearsed).

## Appendix B. Documentation to re-read before relying on a DOCS item

- Workers static assets: `developers.cloudflare.com/workers/static-assets/` (headers,
  redirects, routing, the Pages migration guide)
- Wrangler configuration: `developers.cloudflare.com/workers/wrangler/configuration/`
- Workers Builds: `developers.cloudflare.com/workers/ci-cd/builds/` (configuration, build
  image, limits)
- Workers custom domains, `workers.dev` and previews:
  `developers.cloudflare.com/workers/configuration/routing/`,
  `developers.cloudflare.com/workers/previews/`
- Access for Workers: `developers.cloudflare.com/workers/configuration/cloudflare-access/`
- Astro on Workers: `developers.cloudflare.com/workers/framework-guides/web-apps/astro/`
- Astro configuration reference: `docs.astro.build/en/reference/configuration-reference/`
- Pages: `developers.cloudflare.com/pages/configuration/` (build image, headers, serving
  pages, custom domains, preview deployments)
- Web Analytics: `developers.cloudflare.com/web-analytics/`
- AI crawler policies and managed `robots.txt`:
  `developers.cloudflare.com/bots/additional-configurations/`
