# Handoff brief: a new static Astro site on Cloudflare

> **Status (2026-11-25): background, not instructions.** In this starter the instructions are
> `README.md` and `docs/setup/`. Where this brief disagrees with them, they win: they record
> what was built and run on 2026-11-25. Read this brief for the reasons: the invariants (§2),
> the launch floor (§7), localStorage (§8), the interactive layer (§9), ownership and handoff
> (§11) and agent guards (§12).
>
> It was written before the starter had code, for a workspace of two repos. What the starter
> does differently:
> - **One repo.** Read `production/` as the repo root and `development/` as `docs/`, and drop
>   `git -C <repo>` and the subshells. `development/index.md` is `docs/project.md`.
> - **The schema is Zod**, in `src/content.config.ts`, not JSON Schema. The rule in §1's data
>   contract still holds: one schema, and it fails the build.
> - **Node is pinned in `.nvmrc` only**, with no `NODE_VERSION` build variable (§4.2).
> - **HSTS starts at `max-age=300`** and is raised after launch (§7.6), and the `www` redirect
>   starts as a 302 (§6.6).
> - **§4's open questions are answered** for a local build in `docs/setup/1-local.md` and
>   `docs/stack-wiring.md`. `docs/setup/3-cloudflare.md` lists what the first deploy still has
>   to settle.
> - **Ownership is the owner's choice.** §11's dedicated accounts and handoff plan are one
>   option, not a requirement of the starter.

```
status:   ACTIVE INSTRUCTIONS until the site is handoff-ready (§13 step 7); after that, a
          reference record. Current state lives in development/, not here.
written:  2026-11-21 by a Claude session, distilled from prior production work building static
          sites in Jekyll on Cloudflare Pages (Aug–Nov 2026).
updated:  2026-11-21. Added the launch checklist, the setup runbook (§6), ownership and handoff
          readiness (§11) and the tool-agnostic working method (§12). Generalized for reuse:
          people are "the owner" and "the next owner".
          2026-11-22. Dispositioned an independent cross-vendor review: Workers chosen over
          Pages (§6.1); handoff moved to the providers' supported transfers (§11); commands
          made root-safe; post-deploy checks made to fail loudly (§10); agent guards
          corrected (§12). Later the same day: reconciled with the owner's starter research
          (sitemap filename, CSP style attributes, manifest restored, a contact alias,
          build-gated tests, no `wrangler login`, the owner's working stack). Then: the owner's
          stack rationale (§1), compliance as architecture (§2), and the research method
          (§12.7).
          Then: reconciled a cross-vendor review of an agent-orchestration tool's ideas. A
          branch that loosens a check does nothing else, evidence names its commit, and the
          residue check is split between build and pre-push (§10); merge commits only (§6.3);
          one writer across the workspace, reviews that write only their own output file,
          owner-only guard files (§12).
          2026-11-25. A deadline and no throwaway spike: the walking skeleton is the spike, and
          the stack is decided, React at launch included (§1, §9, §13). Reconciled the owner's
          11-25 stack assessment (development/docs/, the file ending
          "-assessment-as-of-2026-11-25.md"; it carries the outcomes): Astro's CSP as the owner
          (§4.6), Node 24 and npm (§4.1-4.2), Version URLs off (§6.5), the data contract (§1).
          Applied a second cross-vendor review and a refute-first pass on the result: the
          skeleton's build passes as specified (§10), robots.txt never blocks (§7.5), more
          `verify-live` checks and a pre-merge check (§10), and a residue scan that prints
          PASS/FAIL (§6.3).
          Then: generalized into a starter. The §1 instance profile and data contract are
          templates to fill in, and the wording no longer assumes one page, a game or an
          infographic.
for:      whichever agent session (Claude, Codex, Gemini...) drives the project, and the owner,
          who works from the checklist at the top.
reuse:    fits a small static site: a few pages, no forms, no user accounts, no mail at the
          domain. To start one, copy this brief and fill in the §1 instance profile.
          Profile fields that reach further: identity → §6.2, §11; domain and registrar →
          §6.0, §6.4; email at the domain → §6.4, §7.10; deploy product → §6.1, §6.5–§6.9,
          §7.6, §10. When the brief turns out wrong, fix the brief, not just the site (§14).
scope:    stack-agnostic lessons, the minimum-viable-website (MVW) floor, account and Cloudflare
          setup, verification method, and the working conventions. You own the Astro
          specifics: this brief says where it stops and what you need to confirm.
labels:   MEASURED  = run and observed: in prior production work (on Jekyll), unless the line
                      dates it to this project. Unless noted, it doesn't depend on the stack.
          DOCS      = vendor docs that a prior session read but did not test.
          RECALLED  = from model memory, not checked anywhere. Verify it before relying on it.
          YOURS     = Astro-specific. Deliberately left to you.
dates:    every vendor-side claim is as of the date given. Dashboards get reorganized, so
          navigate by the description rather than trusting a click-path blindly.
```

## Launch checklist

One line per item; the § reference has the detail. ⚡ marks things that are easy to miss or that
bit prior work. Rough order is top to bottom, but sections 7–9 run in parallel with the
build.

### 1. Ownership: this site is a portable asset (§11)
- [ ] The site's own accounts (Proton, GitHub, Cloudflare) stay separate from the owner's
      personal ones; the owner operates through their own GitHub account as a collaborator,
      like an agency on a client's accounts
- [ ] Proton Pass holds the GitHub and Cloudflare credentials: passwords, 2FA and recovery codes
- [ ] ⚡ Proton's own 2FA and recovery phrase live OUTSIDE Pass, in an offline recovery kit
- [ ] Service inventory written: every service, its login, plan, cost and renewal date (no secrets)
- [ ] Rule: every new service is registered to the Proton address, with an inventory row that
      says how it transfers (the Proton account itself doesn't)
- [ ] ⚡ Offline `git bundle` of both repos, kept outside GitHub and Proton (neither is a backup
      of itself)
- [ ] ⚡ Personal ties listed for removal at handoff: the owner's collaborator access, payment
      card, registrant contact, machine keys and sessions
- [ ] Handoff runbook written: repo transfer, Cloudflare membership swap, what to rotate
- [ ] Accepted terms risks recorded (§11): no login handoff; possibly a second free account

### 2. Local workspace and agent tools (§12)
- [ ] `AGENTS.md` is the single cross-tool contract; `CLAUDE.md` imports it
- [ ] Adapters only for tools actually in use: `.claude/`, `.codex/`; `.gemini/` once Gemini is
      used (no separate `GEMINI.md`)
- [ ] ⚡ Agent shell commands can't reach GitHub: Claude's sandbox, Codex's network-off profile
- [ ] ⚡ Guards tested with the harmless push test, tool and version recorded (§12.4)
- [ ] Push deny rules mirrored at user level by the owner (the file is outside the workspace),
      so a session opened in a child folder keeps them
- [ ] AI commit attribution is off in every tool
- [ ] ⚡ Each repo's git identity is the site account's GitHub noreply address, not the
      owner's personal email
- [ ] Workspace shell (root files and adapters) recorded in `development/` so it can be rebuilt

### 3. GitHub (§6.2, §6.3)
- [ ] Site account: email private; its noreply address noted for the per-repo git identity
- [ ] ⚡ Owner's own account (the one that pushes): "Block command line pushes that expose my
      email" on
- [ ] Repos private; default branch `main`; head branches auto-delete on merge; merge commits only
- [ ] Unused features off (wiki, projects, discussions); Actions off unless needed
- [ ] Dependabot alerts on
- [ ] ⚡ Know the limit: GitHub Free can't protect branches on private repos. A push to `main`
      IS a production deploy, and "PR-only" is a convention backed by the agent guards
- [ ] Cloudflare's GitHub App can see the production repo, and only that repo

### 4. Cloudflare account, domain and DNS (§6.4)
- [ ] Cloudflare 2FA on; no extra members; no API tokens unless needed
- [ ] Registrar: auto-renew on, payment method valid, transfer lock on, WHOIS redacted
- [ ] ⚡ Renewal date written in the inventory (the only recurring cost)
- [ ] DNSSEC enabled, and answers actually validate (a DS record alone isn't proof)
- [ ] ⚡ No-mail domain locked against spoofing: null MX, SPF `-all`, DMARC `p=reject`
- [ ] DNS holds exactly the expected records, nothing stray (§6.4)

### 5. Cloudflare auto-deploy (§6.1, §6.5)
- [ ] Workers chosen over Pages (decided 2026-11-22)
- [ ] ⚡ `wrangler.jsonc` committed: name, assets `./dist`, a real 404 page, and `workers_dev`
      and `preview_urls` set explicitly
- [ ] Worker created from the repo: neutral name (it's public), build `npm run build`, deploy
      `npx wrangler deploy`, Node pinned
- [ ] Preview builds on, so every PR gets a preview URL to review before merging
- [ ] ⚡ First build green and verified on the `workers.dev` hostname before the domain is attached
- [ ] Build log read: Node version and build image as expected
- [ ] Full loop proven: branch → PR → preview URL → merge → production deploy
- [ ] ⚡ Rollback located before it's needed (Deployments → Rollback)
- [ ] ⚡ No Cloudflare alert exists for failed Workers builds: the owner checks the merged commit (§6.8)

### 6. Domain and edge (§6.6, §6.7, §6.9)
- [ ] Apex attached as a Workers custom domain; the production `workers.dev` hostname then off
- [ ] ⚡ `www` 301-redirects to the apex. Never leave it half-configured: it hangs
- [ ] HTTPS: Always Use HTTPS on, TLS 1.2 minimum, never "Flexible"
- [ ] ⚡ Page-rewriting features off: Rocket Loader, email obfuscation, auto-injected analytics
- [ ] AI-crawler policy set, and the dashboard agrees with robots.txt
- [ ] Browser cache respects the repo's `_headers`
- [ ] ⚡ Every `workers.dev` hostname is `noindex` or off; the real domain is NOT

### 7. What the site ships (§7)
- [ ] Main page `/`, and every other content page
- [ ] Privacy page: what's stored on the device, that the site's code sends none of it, the
      host's role, how to reset
- [ ] Terms page: content license, "informational only" disclaimer, credits
- [ ] ⚡ 404 page that returns a real 404 status
- [ ] Head basics: language, charset, viewport, title, description, canonical, theme color
- [ ] ⚡ Icons: a real `favicon.ico`, SVG icon, Apple touch icon, 192/512 icons, web manifest
- [ ] Social share card: Open Graph + Twitter tags, 1200×630 image with alt text
- [ ] Structured data (JSON-LD): WebSite, plus a publisher only if true
- [ ] `robots.txt` (with a sitemap line), a sitemap (all public pages), `llms.txt` (optional)
- [ ] ⚡ Security headers and Content Security Policy live from the very first deploy
- [ ] Footer: copyright, privacy and terms links

### 8. Experience quality (§7.7–7.9, §8, §9)
- [ ] The content reads with JavaScript off; the interactive layer only enhances it
- [ ] Keyboard, focus, screen-reader announcements, reduced motion, no flashing
- [ ] Timers can be paused or extended; drag interactions have a tap alternative
- [ ] Contrast passes; color is never the only signal; tap targets ≥24 px
- [ ] ⚡ Phones: no sideways scroll at 320/390 px, checked on real iOS Safari and Android Chrome
- [ ] Performance budget met (Core Web Vitals); fonts self-hosted
- [ ] localStorage, if used, handled safely: survives blocked storage, versioned, with a reset button
- [ ] Zero third-party requests, or each one declared on purpose

### 9. Content and legal (§7.10)
- [ ] ⚡ Every fact has a source, its tier and an as-of date, checked at the source (§12.7)
- [ ] Spelling and grammar pass
- [ ] Licenses for fonts, images and libraries recorded; rights to any third-party data

### 10. Launch and verify (§10, §13)
- [ ] Build-time checks pass (`astro check`, Vitest, `verify-dist`, HTML validator, accessibility pass)
- [ ] Switched to indexable: meta robots removed, canonical added (robots.txt never blocked; §7.5)
- [ ] ⚡ `verify-live` passes: a script that asserts, with browser-shaped requests (§10)
- [ ] Social preview checked (and re-scraped after any change)
- [ ] Optional: Search Console (a new service: inventory row, including how it transfers)
- [ ] Launch recorded in `development/`

### 11. After launch (recurring)
- [ ] Monthly: read the Proton inbox, check the latest deploy is green, review dependency
      alerts, refresh the offline bundles if anything changed
- [ ] ⚡ Yearly: domain renewed, logins still work, Proton account still active, Node and Astro
      on supported versions
- [ ] Before any handoff: run the handoff runbook

## 0. How to use this

- **The prior work behind this brief never built a real Astro site.** The only Astro artifact
  it produced was a throwaway fixture (`src/pages/index.astro`, `public/`, `astro.config.mjs`,
  `package.json`), used in Aug 2026 to test an in-house publishing tool. It was never deployed.
  So nothing in this brief about Astro is MEASURED.
- What does transfer: the web-platform floor, how Cloudflare's edge behaves, the
  deploy/DNS procedure, the verification method, and the conventions.
- **Where this brief disagrees with current docs, the docs win.** Then tell the owner, because
  it means this brief has gone stale.
- **Where the owner's own research disagrees with this brief, reconcile it explicitly** rather
  than following either one silently. Update this brief, annotate the research inline (it's a
  record, so mark it rather than rewrite it), and keep a short note of each conflict and its
  decision until both files carry the outcome. Then retire the note.
- **Check the owner's Astro experience** (§1). If Astro is new to them, give one line of why
  with each Astro-specific choice, especially where it differs from Jekyll (§5 has the concept
  map).
- **Don't copy files from any other project's repo into this one** (§6.3). Rebuild from this
  checklist instead.
- **This brief is a record once the site is handoff-ready** (§13 step 7). Until then it's the
  instructions; afterwards, a reference. Current status always lives in `development/`
  (§12.1), so don't copy this checklist there.

## 1. The project and its instance profile (confirm with the owner)

**The model, which holds for any instance of this brief:**

- **Static, informational, one-way.** One main page or a handful, with small Privacy and Terms
  pages beside them, plus a 404. No server, no async data, no accounts, and (presumably) no
  forms.
- **Astro**, in a **private GitHub repo**, auto-deployed to **Cloudflare Workers** (static
  assets only, no Worker code) on every push to `main` (§6.1).
- **The site has its own accounts, separate from the owner's:** one email and password-manager
  account, with the GitHub and Cloudflare accounts registered to it. Treat them like a
  client's accounts: everything the site needs lives in them, and the owner operates through
  their own GitHub account as a collaborator.
- **A portable asset:** it moves to a next owner through the providers' supported transfers
  (repository transfer, Cloudflare account membership), not by handing over a password (§11).
- **The full MVW floor applies even to one page** (§7).
- **Two folders under one workspace root:**
  - `development/`: thinking, docs, notes, runbooks.
  - `production/`: the single private repo Cloudflare builds, with the Astro project at its root.

**Instance profile** (a template: fill in each `<...>`; the other lines are the starter's
defaults, so change any that don't hold for this site):

```
recorded:        <date>, as reported by the owner. Verify before relying on it (§6.0).
site:            <what the site is, who it is for, and the one thing a visitor should do or
                 learn>. <Whether it keeps client-side state in localStorage (§8).>
regulated:       <yes or no>. General accessibility and privacy expectations apply either way.
identity:        the site's own free Proton account (Mail + Pass), with free GitHub and
                 Cloudflare accounts registered to that address. No paid plans anywhere; the
                 domain renewal is the only cost.
domain:          <the domain>, registered through Cloudflare Registrar, in the same Cloudflare
                 account.
email at domain: none, and none planned (free Proton can't host a custom domain).
repos:           production and development: private, on the site's GitHub account. The
                 owner's own GitHub account is a collaborator on both and pushes with it.
                 <Whether the Cloudflare GitHub App is installed on the site's account yet.>
deploy:          Cloudflare Workers static assets, not Pages (§6.1). <Whether the Worker exists.>
workspace root:  <which of AGENTS.md, CLAUDE.md and the tool adapters exist (§12.2)>
owner:           <experience with Astro and with the rest of the stack; which agent tool drives
                 the project, and which ones review>
plans:           <commercial or not; whether a handoff to a next owner is expected, and how
                 soon (§11)>
terms risk:      <the owner's ruling and its date on the second-free-account risk (§11), or
                 "none">
stack:           fixed by this starter: Astro; React + TypeScript for interactive islands;
                 PandaCSS for styling; Base UI for interactive primitives; GitHub; and
                 Cloudflare Workers static assets. Keep each island as small as the
                 interaction allows (§9).
product:         development/index.md is the owner's product and content spec. <The names of
                 the production and development repos.> The Worker's name gets chosen at §6.5
                 (public and permanent).
deadline:        <a date and its reason, or "none">. A deadline cuts scope, never the
                 invariants (§2, §13).
data:            <the records files and their schema>, in development/knowledge/ (the data
                 contract, below).
```

### Why this stack (the reasons behind the starter's choices)

Each choice, with what it means for the build:

- **Astro, on Cloudflare.** Files in and static HTML out, as with Jekyll, with components and
  islands where Jekyll had includes and none (§5 maps the concepts). It deploys on Workers
  static assets rather than Pages (§6.1).
- **React + TypeScript.** A widely known stack, and the one Base UI is built for. For an island
  or two, that fluency outweighs React's runtime cost. Measure the cost anyway (§7.8); Preact's
  compatibility mode is the fallback if the JS budget is missed, unless Base UI rules it out
  (§9). The cost is real: the 11-25 assessment reports, from a test project, about 67 KB
  gzipped of React before any widget code, and about 83 KB for a filter island with two Base UI
  components. §9 keeps each island small and §10 budgets it.
- **PandaCSS.** It offers two styling modes to use together, not either/or:
  self-contained component styles with BEM-like variants (Panda's recipes and slot recipes,
  which also style Base UI's parts) and composable utility classes in the Tailwind manner
  (`css()` and patterns). It suits a static build: Panda generates its CSS at build time into a
  stylesheet
  (RECALLED), which fits the strict CSP (§4.6). Runtime CSS-in-JS, such as styled-components,
  injects `<style>` tags and would need `'unsafe-inline'` or nonces (RECALLED). Inline
  `style=` attributes still count (§4.6). In `.astro` files Panda's calls run at build time and
  ship no JS (per the 11-25 assessment). In the island they would ship Panda's runtime, unless
  `transform: true` rewrites the static calls into class strings. The assessment calls that
  option under two months old, with a known issue (`cx()` with dynamic values keeps the
  runtime), so measure the island's chunk with and without it (§10).
- **GitHub.** The industry standard.
- **Cloudflare.** Value and consolidation:
  - Requests for static assets are free and unlimited (DOCS, 2026-11-22), and the domain is
    billed at Cloudflare Registrar's at-cost price (RECALLED). The domain is the only
    recurring cost.
  - A free private repo can drive the site. GitHub Pages on the free plan publishes only
    public repos (RECALLED).
  - Registrar, DNS, hosting and edge settings sit in one account, which is what makes the
    handoff a single membership swap (§11).
- **One agent tool drives, other vendors review.** A second vendor's tool provides periodic
  adversarial review. That's why the workspace is tool-agnostic (§12), and why load-bearing
  changes get a different vendor's refute-first review (§12.1, principle 6).

### The data contract (a template: `records` stands for this site's own file names)

Invariant 6 in practice. Where the records are the product, the rules are strict:

- **One source, one schema.** In `development/knowledge/`, the YAML records files (one
  `records.yml` or several) are the source of truth; `records.schema.json` (JSON Schema
  2020-12) is the only schema. Don't write a second one, such as a Zod schema, that restates
  it: two schemas drift. If the build needs types, derive them from this one (how is YOURS).
- **Production gets a copy, never a link.** Nothing in `production/` points into
  `development/` (§12.7), so the YAML files and the schema are copied into
  `production/src/data/` in a branch, and the copies must match before a PR. Check it from
  the workspace root (tested in zsh 2026-11-25):
  `F=records.yml; cmp -s "development/knowledge/$F" "production/src/data/$F" && echo PASS || echo FAIL`
  (repeat for each copied file). A data fix lands in `development/` first, then gets copied.
- **The build validates the copy against the schema** and fails on any error (the mechanism is
  YOURS; a JSON Schema 2020-12 validator such as Ajv's is one candidate).
- **Render at build time; ship only what the page uses.** Static content renders into HTML. An
  island gets a projection of only the fields it reads, never whole records: Astro serializes
  island props into the page's HTML. Add a test that fails when a new field leaks in.
- **Every URL from data gets its scheme checked** in the build: `https:` for links, and `tel:`
  only from E.164 phone strings (`+1...`), where the data has them. Never render data with
  `set:html`.
- **Remote images get vendored.** Where records point at another site's image URLs, invariant 2
  rules out hot-linking, so each image is downloaded into the repo ahead of time, never during
  the build, with its source and license recorded. Check the reuse rights of each one.
- **YAML's silent retyping.** Values YAML can turn into numbers or dates (leading zeros, `1.10`,
  ISO dates, `no`) stay quoted. Each file's header says so. Schema validation catches
  regressions.
- **Time-sensitive fields carry an as-of date**, and the page shows it next to anything that
  can change.

## 2. Compliance as architecture: the invariants

**Compliance as architecture** is the principle behind everything in this brief. The site's
obligations are honest privacy, accessibility, security, sourced facts and a clean handoff.
They are properties of its structure, enforced by the repo and the build, not a checklist run
before launch:
- the CSP and headers live in the repo (Astro's config and `_headers`) from the first deploy
- the build fails on a missing page or an inline script the CSP doesn't hash (§10)
- the facts carry their sources (§12.7)
- nothing personal enters the asset

**Always shippable** is its working form (invariant 7). Every commit on `main` could go live,
and the floor ships *with* the walking skeleton, so there's never a "make it compliant later"
phase. The invariants below change only by an explicit owner decision. Everything around them,
especially the design of the interactive layer, is cheap to try and cheap to throw away.

1. **Static output only.** No SSR adapter, no Functions or Worker code, no runtime server. If a
   feature looks like it needs an adapter, stop and ask the owner. Don't quietly add one.
2. **No third-party requests by default.** Self-host fonts. No CDN-hosted libraries, no embeds,
   and no analytics unless the owner rules on it. Any exception is declared on purpose, ranked
   from least to most invasive:
   - **Data only:** the page uses another service's data but renders its own markup. Nothing
     foreign runs.
   - **Foreign script:** runs inside the site's origin with access to the DOM, cookies and network,
     and needs the CSP widened.
   - **Iframe:** isolated by the browser, but the site loses control of styling, accessibility and flow.

   Also: **no paid-service dependency** beyond the domain itself. Everything else stays on
   free plans.
3. **The repo is the site.** Behavior lives in files (headers, redirects, robots, CSP).
   Dashboard-only config is allowed only where it can't be avoided (domain, DNS, the `www`
   redirect, zone toggles). Keep those in a short "provider-side config" list, each with a
   verification command. Don't mirror dashboard state into docs as if it were fact: it reads as
   authoritative and goes stale silently. The test: the repo could move to another static
   host with no dashboard archaeology.
4. **One source of truth for site identity.** Name, description, canonical URL, share image and
   theme color live in one config/data module. The `<head>`, Open Graph tags, JSON-LD, sitemap,
   robots.txt, manifest and llms.txt all derive from it. MEASURED: hand-rolled layers drift. An
   audited site had og:description on 38% of pages and a meta description on 0%, because
   nothing tied the two together.
5. **Absolute URLs come from config, never from the request or runtime.** MEASURED: behind
   Cloudflare, one site's runtime believed it was on `http`, which would have produced `http://`
   canonicals. Ask what every URL looks like in every environment: local, preview and
   production. An absolute self-reference looks fine on the domain it names and is wrong
   everywhere else.
6. **Content lives in data, not markup.** Facts, numbers and copy go in a data file,
   and each fact carries **a source and an as-of date**. Components iterate over it. How facts
   get verified before they get there: §12.7.
7. **Always shippable.** The walking skeleton deploys on day one, and every commit on `main` is
   deployable. The floor lands with the skeleton: the CSP, the 404, `noindex`, and the
   Privacy and Terms pages (placeholder text is fine) are in the first deploy.
8. **Nothing personal in the asset.** No personal email in git history, DNS or page source. No
   service registered outside the site's Proton identity. The owner's own accounts may be
   collaborators or members while they operate the site, like an agency on a client's
   accounts; they're on the handoff cut list (§11).

## 3. Decisions to raise with the owner early

| Decision | Suggested default | Why it matters |
|---|---|---|
| Cloudflare **Pages vs Workers** (static assets) | **Decided for this starter: Workers** (2026-11-22) | The dashboard labels Pages "legacy" (§6.1) |
| Domain shape | Apex is canonical; `www` 301s to the apex | A half-configured `www` hangs (§6.6) |
| Indexable before launch? | `noindex` until launch day; every non-production hostname is **always** off or `noindex` | Cloudflare-owned hostnames can leak a public, indexable copy (§6.9) |
| AI-crawler policy | Ask | Set in robots.txt (advisory) and in the Cloudflare dashboard (enforcement) |
| Analytics | **None** | If the owner wants some: cookieless, declared as an exception, with the CSP widened on purpose (§6.9) |
| Preview deployments | On for every PR branch | Previews are how a PR gets reviewed, but anyone with the URL can see them (§6.5) |
| Approach for the interactive part | **Decided for this starter: React + TypeScript islands with Base UI, styled with PandaCSS** (2026-11-25) | The 11-25 assessment reports about 67 KB gzipped for React alone, from a test project, so keep the island small (§9) and budget it (§10). Preact's compatibility mode is the fallback if it misses the budget, unless Base UI rules it out |
| llms.txt | Ask | Cheap to add, optional |
| Privacy and Terms pages | Yes, both short | localStorage use gets disclosed (§8) |
| Is `development/` a repo? | Yes: private, on the site's GitHub account, plus an offline bundle | Otherwise it neither transfers nor gets backed up (§11) |
| Proton account recovery | An offline recovery kit, outside Pass | Pass can't hold the keys to the account that opens it (§11) |
| Accepted terms risks | Record the owner's ruling in the §1 profile (§11) | The site's free accounts may be the owner's second ones, and logins can't be handed over |
| Git flow | Tool-named branches, PR, preview, merge (§12) | Branch names record which tool did the work |

## 4. What you need to confirm (YOURS: Astro-specific)

1. **Current Astro version and minimum Node.** DOCS (npm registry, 2026-11-22, re-checked
   2026-11-25): `astro` **7.4.13** and `create-astro` **5.3.2** (separate version lines), both
   requiring Node **≥22.23.4**. **Use Node 24** (the 11-25 assessment's call): it's the line
   Workers Builds defaults to (24.22.1, §6.5), and the assessment dates Node 22's end of life to
   2027-04-30 against Node 24's 2028-04-30. DOCS (nodejs.org release index, 2026-11-25): the
   newest 24.x is **24.22.3**, a security release of 2026-11-10. Pin it, or whatever 24.x is
   newest at setup. Node 20 went EOL 2026-04-30. A development machine was found on **Node
   v21.1.0** in Aug 2026, an odd-numbered release below that floor, so run `node -v` first. The
   prior work's own notes admit it "reasoned about Astro from v5-era facts while Astro was at
   v7." Re-check at the start with `npm view astro version engines`; don't trust model memory
   here, including your own.
2. **Pin Node in two places and keep them equal:** in the repo (`.nvmrc` or `.node-version`)
   and in Cloudflare's build settings (`NODE_VERSION`). DOCS (2026-11-22): Cloudflare's build
   images ignore `package.json` `engines`, so it isn't a pin. npm's own version is pinned with
   `package.json`'s `packageManager` field (DOCS, 2026-11-22: Cloudflare says `engines.npm`
   doesn't set it). DOCS (nodejs.org release index, 2026-11-25): no Node release bundles npm 12,
   Node 26 included (24.22.x ships npm 11.19.1), while npm's latest is 12.2.3. The 11-25
   assessment's case for npm 12 is that it stops running dependencies' install scripts unless
   they're approved (not checked here). npm 12 itself is optional before launch: adopt it only
   if it installs cleanly the first time, pinned in `packageManager`, installed locally too, and
   confirmed in the build log. Its strict install-script mode waits until after launch either
   way (§13).
   **Read the build log to see which version Cloudflare actually used.** MEASURED: for Ruby, prior
   work never settled it. `.ruby-version` said 3.4.1, the env var said 3.4.4, both versions were
   supported, and builds went green either way, so the evidence couldn't tell which pin won. A
   mismatch doesn't break the build. It means local builds silently test a different runtime
   than production.
3. **Static mode needs no adapter.** Confirm the default `output` and that `astro build` emits a
   plain `dist/`.
4. **Everything in `public/` is copied verbatim**, so `_headers`, `_redirects`, robots.txt and
   favicons should land at the root of `dist/`. Check with `ls -la production/dist`. The Jekyll version of
   this trap: underscore-prefixed files were dropped silently unless explicitly included.
5. **Where hashed assets go** (`/_astro/`?) and whether filenames are content-hashed. That
   decides the immutable cache rule in §7.6.
6. **Inline output vs a strict CSP. This is the big one.** Does Astro inline scripts or styles
   (hydration bootstrap, small stylesheets, `is:inline`, `define:vars`)? Does Vite inline small
   imported assets as `data:` URIs? DOCS (2026-11-21 review): Vite's default `assetsInlineLimit`
   is 4 KiB, and Astro may change build behavior. MEASURED: this exact class of bug — an inlined
   `data:` image against `img-src 'self'` — rendered as broken-image glyphs in production **for
   15 days**, invisible in every local environment. Possible fixes: config that externalizes the
   inlined content, Astro's own CSP support (`security.csp` per the review; confirm), or hashes
   in `_headers`. **Don't fall back to `'unsafe-inline'` silently.** If you have to, tell the
   owner why.
   **Give the CSP one owner.** Browsers enforce every policy they receive, so a hash allowed by
   a `<meta>` policy is still blocked by a stricter response header. A site on this stack has
   React islands, and Astro's islands bring an inline bootstrap script and style
   (RECALLED; a published Astro blog's own build checks note the island runtime's `<style>`),
   which a strict header policy blocks. So:
   - **Astro's `security.csp` owns the policy, from the walking skeleton on.** Per the 11-25
     assessment (DOCS, not run here): it's stable since Astro 6.0, it hashes the scripts and
     styles Astro emits, and with no adapter it emits only a `<meta>` policy. Give it the fetch
     directives: `default-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self';
     manifest-src 'self'; upgrade-insecure-requests`. Astro adds `script-src` and `style-src`.
   - **The header (`_headers`, §7.6) carries the rest:** `frame-ancestors 'none'`, which a
     `<meta>` policy can't carry, plus `base-uri 'self'; form-action 'none'; object-src 'none'`
     as a second layer. Never `default-src`, `script-src` or `style-src` there: they would
     block the hashed inline scripts the `<meta>` allows.
   - **Base UI under that policy** (per the 11-25 assessment; DOCS, not run here): wrap the
     island in Base UI's `CSPProvider` with `disableStyleElements`, and add the scrollbar rule
     its docs give to your own CSS. Never turn on Base UI's inline scripts: they need a nonce,
     which a static site can't issue.
   - **The skeleton proves it** (§13 step 3). A built page with the island, loaded with
     DevTools open, shows no violations, and `verify-dist` confirms each inline script and style
     has its hash in that page's policy (§10). If Astro's CSP can't cover something, stop and
     tell the owner before working around it.
   - Set `build.inlineStylesheets: 'never'` so stylesheets stay external and cacheable
     (RECALLED option name). Never `data:`.
   ⚡ **Style attributes count.** `style="…"` attributes in the *built* HTML, common in React,
   animation and component-library markup rendered at build time, are blocked by
   `style-src 'self'` whichever policy owns it. Keep them out of prerendered markup; styles set
   from JavaScript after hydration aren't affected (RECALLED). If some can't be avoided, the
   narrow exception is `style-src-attr 'unsafe-inline'` (RECALLED, CSP Level 3), not
   `'unsafe-inline'` on `style-src`, and only with the owner's go. In Astro's config that's a
   resource with `kind: "attribute"` (Astro 7.1+, per the 11-25 assessment). Either way the
   CSP ships on day one.
7. **Head and SEO plumbing:** the `site` config that feeds absolute URLs, trailing-slash and
   `build.format` behavior (Workers answers slashless paths with a temporary 307, §6.9), the
   sitemap (`@astrojs/sitemap` writes `sitemap-index.xml` plus `sitemap-0.xml`, not
   `sitemap.xml`; a hand-written list is the alternative), and
   whether `src/pages/404.astro` emits `404.html`.
8. **Templated text files:** files in `public/` aren't processed, so a robots.txt, llms.txt or
   manifest that reads site config has to be an endpoint. The Jekyll analog: a file without
   front matter was copied verbatim, and the failure was silent.
9. **Islands:** the hydration directives, which one suits each interactive part, and how state
   that depends on localStorage hydrates without a mismatch or a flash (§8).
10. **Image and font pipeline:** built-in image optimization (does its native dependency, e.g.
    sharp, work on Cloudflare's build image?) and how to self-host fonts.
11. **Telemetry:** DOCS (2026-11-21 review), the Astro CLI sends anonymous telemetry. Ask the owner whether to
    turn it off (an env var on Cloudflare plus `astro telemetry disable` locally, if that's still
    the mechanism). Wrangler has its own telemetry too (RECALLED opt-out:
    `WRANGLER_SEND_METRICS=false`, or `wrangler telemetry disable`).
12. **Env vars:** DOCS (2026-11-21 review), anything prefixed `PUBLIC_` ships to the browser. This project should have **no secrets at all**.
13. **The dev server isn't production.** `astro dev` and `astro preview` almost certainly ignore
    `_headers`. Find a local preview that honors headers. Candidate: DOCS (Wrangler changelog,
    3.114.1) says `wrangler dev` applies `_headers` and `_redirects` for Workers static
    assets, so try `( cd production && npm run build && npx wrangler dev )`. Confirm it
    actually sends the headers and serves the 404 page with a 404 before trusting it; local
    `not_found_handling` isn't documented. §10 has the fallback.
14. **Cloudflare and Astro.** DOCS (2026-11-22): on 2026-01-16 Cloudflare's blog announced that
    "The Astro Technology Company... is joining Cloudflare", and the same day's press release
    is titled "Cloudflare Acquires Astro". It's part of why Astro's guide steers to Workers
    (§6.1).
15. **TypeScript 6, not 7.** Two starter-research runs (Nov 2026) found that `astro check`
    rejects TypeScript 7 ("install TypeScript 6 instead"). DOCS (npm registry, 2026-11-25):
    `@astrojs/check` 0.9.12 declares `typescript` `^5.0.0 || ^6.0.0` while `typescript`'s latest
    is 7.0.2, so pin `typescript@6.0.3` (the newest 6.x) until the checker supports 7.

## 5. Jekyll → Astro concept map (for orientation only; confirm each line)

| Jekyll | Astro (expected) |
|---|---|
| `_config.yml` | `astro.config.mjs` plus a site-identity module (e.g. `src/data/site.ts`) |
| `_data/*.yml` | Imported JSON/YAML/TS in `src/data/`, or content collections (overkill here?) |
| `_layouts/` | `src/layouts/*.astro` |
| `_includes/` | `src/components/*.astro` |
| Liquid tags | JS expressions in templates; logic goes in the component's `---` frontmatter script |
| Page front matter | Component props and the frontmatter script |
| `include: ["_headers"]` | Put the file in `public/` |
| `_site/` | `dist/` |
| `bundle exec jekyll serve` / `build` | `npm run dev` / `npm run build` plus `npm run preview` |
| `Gemfile` + `Gemfile.lock` | `package.json` + `package-lock.json` (commit it; `npm ci` in builds) |
| `.ruby-version` / `RUBY_VERSION` | `.nvmrc` / `NODE_VERSION` (§4.2) |
| Sass and global CSS | Native CSS; component-scoped `<style>` |
| `?v={{ site.time }}` cache-busting | Content-hashed filenames, built in (§4.5) |
| A JS file with no build step | Bundled `<script>` or a framework island |

## 6. Accounts, GitHub and Cloudflare: the setup runbook

Hands-on stand-ups from prior work (MEASURED, n=2 on Jekyll) and docs reading are the basis for
this. Every step pairs an action with a check. Where a step says "owner", it's a dashboard or
credential action a session can't do. Write the exact click-path *with today's date* when you
hand it over.

### 6.0 Starting state (from the §1 instance profile; verify it, don't assume it)

- A domain **registered through Cloudflare Registrar** in the new Cloudflare account, so the DNS
  zone already sits on Cloudflare nameservers. There's no transfer and no nameserver move, which
  makes the old "check MX before moving nameservers" and "disable DNSSEC before moving" steps
  moot.
- **No email at the domain, and none planned** (free Proton can't host a custom domain). So: no
  MX records, and the domain gets locked against spoofing instead (§6.4).
- The site's **free GitHub** account holds the **private repos**, with the owner's own account
  as a collaborator. The Cloudflare GitHub App may already be installed on the site's account
  ("accounts linked"); either way, §6.3 scopes it to one repo.
- **No Workers project yet.** Auto-deploy is the main piece of work.
- **A different instance with a different starting point:** if the domain sits at another
  registrar or on other nameservers, the nameserver move comes first. ⛔ Check MX before
  moving (`dig +short MX $D @1.1.1.1`): moving nameservers moves mail too. Disable DNSSEC at
  the old registrar before the move (RECALLED; follow the current registrar docs), then
  continue with §6.4. A full zone migration is out of this brief's scope.

Verify the domain part (commands tested in zsh 2026-11-21):

```bash
D=yourdomain.com
whois $D | grep -iE '^[[:space:]]*(registrar|name server):'   # expect: Cloudflare, *.ns.cloudflare.com
dig +short NS $D @1.1.1.1                                      # expect: two *.ns.cloudflare.com names
dig +short MX $D @1.1.1.1                                      # expect: empty (before §6.4)
```

### 6.1 Workers static assets, not Pages (decided 2026-11-22)

DOCS (2026-11-22): Cloudflare calls Workers "Cloudflare's primary platform for building
applications. Start new projects with Workers", and Astro's Cloudflare guide says "Cloudflare
recommends using Cloudflare Workers for new projects." Pages has no announced end date; the
dashboard has labeled it "legacy" since at least 2026-09-09. Workers static assets meet every
requirement here:

- static output with no Worker code: `main` is optional for an assets-only Worker (invariant 1)
- `_headers` and `_redirects`, in Pages' syntax, from the repo (invariant 3)
- builds from a private GitHub repo on the free plan, with a preview URL on every PR
- a production `workers.dev` hostname that can be **switched off**. Pages' `*.pages.dev` alias
  served a public, indexable copy of production in prior work (MEASURED).

**Prior work's track record is all on Pages** (MEASURED with Jekyll), so everything Workers-
specific below is DOCS until this project measures it. The differences that matter:

- the build config lives in a committed `wrangler.jsonc` (§6.5)
- a real 404 needs `not_found_handling: "404-page"`; the default is an empty 404 (§6.9)
- Workers doesn't add `X-Content-Type-Options` or `Referrer-Policy` the way Pages does, so
  `_headers` must (§7.6)
- there's no Cloudflare notification for a failed build (§6.8)
- slashless paths get a *temporary* 307 to the trailing-slash form (§6.9)
- the build's API token belongs to whoever connected the repo (§6.5, §11)

**Fallback:** if Workers blocks something, Pages still works for a static site, and prior work
measured it end to end. Write down why before switching.

### 6.2 Identity and accounts (do this first)

1. **2FA everywhere (owner).** On the site's GitHub and Cloudflare accounts, with recovery
   codes in Proton Pass. DOCS (2026-11-22): Proton's own pages disagree on whether Pass Free
   generates 2FA codes (the pricing table says no; a landing page allows three), so check in the
   app. If it can't, use passkeys or a free authenticator app, and record which in the
   inventory. DOCS (2026-11-21 review): GitHub requires 2FA for accounts that contribute code.
   **Proton's own 2FA and recovery phrase never go in Pass** (§11).
2. **GitHub email privacy (owner).** On the site's account, *Settings → Emails → Keep my email
   addresses private*, and note its noreply address
   (`<id>+<username>@users.noreply.github.com`). On the owner's own account, which does the
   pushing, turn on *Block command line pushes that expose my email*. RECALLED: it checks
   commits against the *pusher's* private addresses, so that's the account where it guards this
   history.
3. **⚡ Per-repo git identity.** The owner's global git config usually carries their personal identity, and
   commits made with it would bake that email permanently into the portable asset's history.
   Set it per repo (inside the workspace, so a session may do it):

   ```bash
   git -C production config user.name  "<display name for this identity>"
   git -C production config user.email "<id>+<username>@users.noreply.github.com"
   git -C production config user.email                         # verify
   git -C production log --all --format='%an <%ae>%n%cn <%ce>' | sort -u   # every author AND committer, every branch
   ```

   (Tested 2026-11-22 on a fixture: without `--all`, a personal address on a side branch went
   unreported.) If any commit carries a personal address, stop and tell the owner *before*
   anything else is pushed. Rewriting pushed history is the owner's decision. Do the same for
   `development/`.
4. **Pushing (owner).** The owner pushes with their own GitHub account, a collaborator on the
   site's repos. ⚡ The consequence: credentials already saved on this machine (the keychain,
   `gh`, an SSH agent) can write to production `main`, and on GitHub Free nothing server-side
   stops that. Any agent session on the machine can reach them too, so the network guards in
   §12.3–§12.5 are what actually stand between a session and a production deploy. Commit
   authorship stays the site account's noreply address (item 3), whoever pushes.
5. **Cloudflare members (owner).** The account has one member, the site's Proton identity.
   Create no API tokens unless something needs one, and record any that exist in the
   inventory. If the owner's own Cloudflare login is ever added, it goes on the handoff cut
   list (§11).

### 6.3 GitHub repo setup

1. **Boundary.** Scaffold fresh (`npm create astro@latest`) into `production/`, then pin
   `astro` to an exact version in `package.json`. **Never seed from another repo.** MEASURED: a
   site seeded from a copy brought along another site's production URL and internal comments,
   and was one commit away from making them public. Before every push, scan the working tree
   **and** the history, from the workspace root:

   ```bash
   P='<other-project-names>|<owner-personal-strings>'
   scan() { case $? in 0) echo "FAIL  residue: $1";; 1) echo "PASS  $1";; *) echo "FAIL  scan error: $1";; esac; }
   case $P in ''|*'<'*) echo "FAIL  fill in P first";; *)
     grep -rniE --exclude-dir={node_modules,dist,.astro,.git,.wrangler} -- "$P" production; scan "working tree"
     L=$(git -C production log --all -p) && { grep -niE -- "$P" <<<"$L"; scan "history"; } || echo "FAIL  git log"
   esac
   ```
   Expect two PASS lines; any hit prints above its FAIL. Tested 2026-11-25 in zsh 5.9 and
   macOS's bash 3.2 with BSD grep: a clean tree, a hit in the tree, a hit only in history, a
   missing `production/`, and an unfilled pattern each gave the right line. The
   earlier version printed nothing for an unfilled pattern or a missing folder, which reads
   as a pass.
2. **Repo settings (owner, signed in as the site's account; a collaborator can't change them).** Private; default
   branch `main`; *Automatically delete head branches* on. Turn off wiki, projects and
   discussions if unused. Turn on Dependabot alerts. Turn GitHub Actions off unless something
   needs them; Cloudflare's builds don't. On a free private repo an Actions check can't block a
   merge anyway (no branch protection), so the gate lives in the build (§10).
   Verify: `gh api repos/OWNER/REPO --jq '.private, .default_branch, .delete_branch_on_merge'`
   → `true` / `main` / `true`.
   **Merge commits only:** under *Pull Requests* in the repo's settings, keep *Allow merge
   commits* and turn off squash and rebase merging. DOCS (GitHub, 2026-11-22): a repo enforces
   one method by enabling only that one, and rebase merging "always ... creates new commit
   SHAs". Tested 2026-11-22 on a fixture (git 2.50.1): after a squash or rebase merge,
   `git branch -d` (§12.6) refuses once the remote branch is pruned (after a squash, a stale
   remote ref lets it delete anyway, checking nothing useful); after a merge commit it works.
3. **⚡ Branch protection isn't available.** DOCS (confirmed 2026-11-21): on GitHub Free,
   branch protection and rulesets only work on *public* repos; the fix is a paid plan, which
   this instance declines (§1). So a push to `main` is a production deploy, and "every change
   goes through a PR" is a convention backed by the agent guards in §12. Don't plan around a
   server-side block that doesn't exist.
4. **Scope the Cloudflare GitHub App to this repo only (owner).** On the site's GitHub account: *Settings →
   Applications → Installed GitHub Apps → Cloudflare (Workers and Pages) → Configure →
   Repository access → Only select repositories*, then add the production repo and nothing else
   (not `development/`). MEASURED: the most common stall is a repo missing from Cloudflare's
   picker because the app was scoped to other repos.
5. **`.gitignore`:** `node_modules/`, `dist/`, `.astro/`, `.wrangler/`, `.env*`, `.DS_Store`.
   **Commit the lockfile.** And a `.npmrc` with `engine-strict=true` (an install fails, instead
   of warning, when a dependency rules out the running Node; it doesn't enforce the Node 24 pin,
   which is `.nvmrc`'s job plus the build log's) and `save-exact=true` (new dependencies get
   exact pins). Both come from a published Astro blog's setup and the 11-25 assessment; neither
   is run here yet.
6. **Green local build before Cloudflare sees anything** (a subshell, so the session stays at
   the root; tested 2026-11-22):
   `( cd production && npm ci && npm run build && find dist -type f | sort )`.
7. **Operator README** in `production/`: how to build, how deploys happen, where the
   provider-side settings live (pointing to the inventory). It transfers with the repo, and it
   isn't public: only `dist/` is served.

### 6.4 Registrar and DNS baseline (owner in the dashboard; a session verifies)

1. **Registrar settings** (*Domain Registration → Manage domain*, RECALLED location):
   - auto-renew **on**
   - a payment method on file, the only recurring cost
   - registrar/transfer lock **on**
   - WHOIS redaction **on** (DOCS, 2026-11-21 review: redacted by default where the registry
     permits). Verify (tested in zsh 2026-11-22 on a Cloudflare-registered domain):
     `whois $D | grep -iE '^[[:space:]]*registrant (name|organization|email):'` → `DATA
     REDACTED` and a `domaincontact.registrar.cloudflare.com` link, never the owner's details
   - registrant contact accurate (ICANN requires it, and it changes at handoff)
   - the expiry date copied into the inventory
2. **DNSSEC: enable it** (*DNS → Settings*, RECALLED location). DOCS (2026-11-21 review): for
   domains registered with Cloudflare, the DS record is published for you where the registry
   permits. A DS record existing isn't proof, since a stale or mismatched one breaks
   resolution. Verify that answers actually validate, once it propagates (tested 2026-11-22:
   prints a line for signed domains, nothing for unsigned ones):
   `dig +dnssec $D A @1.1.1.1 | grep -E '^;; flags:.* ad[ ;]'` → one line containing `ad`, the
   resolver's "authenticated data" flag.
3. **⚡ Lock down a domain that sends no mail.** A domain with no mail records can still be
   spoofed in phishing. Standard practice for a no-mail domain is three records. MEASURED:
   `example.com` publishes exactly these, from Cloudflare nameservers, so the Cloudflare zone
   can hold a null MX.

   | Type | Name | Content | Meaning |
   |---|---|---|---|
   | MX | `@` | `.` with priority `0` | "Null MX" (RFC 7505): this domain accepts no mail |
   | TXT | `@` | `v=spf1 -all` | No server is allowed to send as this domain |
   | TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s` | Receivers reject anything claiming to be from it |

   - **Don't add a `rua=` report address.** It would publish the Proton address in public DNS.
   - If custom-domain email is ever added (paid Proton), remove or replace all three *first*.

   Verify (tested 2026-11-21 against `example.com`):

   ```bash
   dig +short MX $D @1.1.1.1                          # expect: 0 .
   dig +short TXT $D @1.1.1.1 | grep -i 'v=spf1'      # expect: "v=spf1 -all"
   dig +short TXT _dmarc.$D @1.1.1.1                  # expect: "v=DMARC1; p=reject; ..."
   ```
4. **Exactly the expected records, nothing stray.** Before launch: only the three above. After
   launch, add the record(s) the Workers custom domain creates for the apex and the proxied
   `www` record the redirect needs (§6.6). Anything else gets explained or deleted, and **`www`
   is never "stray"**: deleting it breaks the redirect.

### 6.5 Create the Worker: the auto-deploy

All DOCS (Cloudflare and Astro docs, read 2026-11-22) unless marked; none of it is measured yet.

1. **Config in the repo first (session).** Commit `production/wrangler.jsonc`. Cloudflare
   recommends `.jsonc` for new projects, and without a config the build fails:

   ```json
   {
     "name": "<worker-name>",
     "compatibility_date": "<the date you create it, YYYY-MM-DD>",
     "assets": {
       "directory": "./dist",
       "not_found_handling": "404-page"
     },
     "workers_dev": true,
     "preview_urls": false,
     "previews": {}
   }
   ```

   - `name` must equal the Worker's name in the dashboard, or the build fails. It appears in
     public `workers.dev` hostnames, so make it neutral, with nothing personal, and treat it
     as permanent (renaming wasn't checked).
   - `not_found_handling: "404-page"` serves `404.html` with a 404. Without it, unknown paths
     get an empty 404.
   - `workers_dev: true` gives the skeleton a hostname to verify on before the domain exists;
     §6.6 turns it off at launch. Set it and `preview_urls` explicitly: when a key is omitted,
     Wrangler leaves whatever the dashboard has.
   - `previews: {}`: preview builds need the block, even empty, and Wrangler ≥4.135.0. Pin
     `wrangler` as a devDependency (4.168.0 is current per npm, 2026-11-25), because the deploy
     step uses the version in `package.json`. This preview feature was new in late 2026, so
     confirm both against the current docs.
   - **Two keys, two features.** DOCS (Cloudflare, 2026-11-25): "Version URLs are not
     Previews". `preview_urls` (the name predates the rename) turns on Version URLs: a public URL
     for every uploaded version, running production's settings. Cloudflare says not to use them
     for branch or PR testing. The `previews` block configures Previews, which is what a
     non-production branch build creates and what the PR comment links to. So `preview_urls` is
     `false`, as the 11-25 assessment proposed, and PR previews still work. `assets` is
     top-level only, so Previews use it too.
   - Not adopted from the assessment: turning off non-production branch builds. Those builds
     are the PR Previews, the review loop (§12.6) and the owner's real-phone check before a
     merge. Their `workers.dev` URLs send `noindex` (DOCS, same date).
2. **Create (owner).** *Workers & Pages → Create application*, then import from GitHub. Pick the
   site's account and the production repo. The GitHub App is "Cloudflare Workers and Pages",
   already installed and scoped to this repo (§6.3).
3. **Build settings.** Production branch `main`. Build command `npm run build`; deploy command
   `npx wrangler deploy` (the default). Leave the root directory blank if Astro sits at the
   repo root. Set `NODE_VERSION` to match `.nvmrc` (the default is Node 24.22.1, and `engines`
   isn't one of the documented sources), plus the telemetry opt-out if the owner chose it
   (§4.11).
4. **Save and deploy, then read the build log.** Check the Node version actually used, the
   install step (`npm ci` or `npm install`?), that `dist/` was found, and that the deploy step
   uploaded the assets. "Site is up" is not "build passed" (§6.9).
5. **Preview builds** (*Settings → Build → Branch control → Enable Preview Builds*): on. Every
   push to a non-production branch builds, and Cloudflare comments on the PR with the preview
   URL. There are no branch patterns. `workers.dev` preview URLs send `noindex` automatically.
   Free plan: 3,000 build minutes a month, one build at a time, a 20-minute timeout, and 100
   previews per Worker (the oldest get deleted).
6. **Previews are public to anyone with the URL.** Locking them behind Cloudflare Access needs
   a preview custom domain plus Zero Trust onboarding, which asks for payment details even on
   the free plan (it doesn't charge). Skip it unless the content needs it.
7. **Verify on `<worker-name>.<subdomain>.workers.dev`** with `verify-live` in preview mode
   (§10): page, 404, headers and `noindex`.
8. **⚡ Prove the whole loop once.** The owner pushes a trivial branch and opens a PR.
   Cloudflare comments with the preview URL. The owner checks it and merges, the production
   deploy runs, and the new commit's marker shows on the `workers.dev` hostname (§10). Until
   that loop has run once, "auto-deploy is set up" is an assumption.
9. **Know the rollback before you need it (owner).** *Deployments → ⋯ → Rollback* in the
   dashboard. Code, config and static assets roll back together, to any of the last 100
   versions. (`wrangler rollback` exists too, but it needs `wrangler login`, which this machine
   avoids; §12.5.)
10. **The build token belongs to a person.** Connecting the repo creates an API token tied to
    the Cloudflare login that did it, which is the site's. At handoff the next owner reconnects
    the build before the site's login is removed (§11).

### 6.6 Custom domain and `www` (at launch, after §6.5 is green)

1. **Apex.** Preferably in the repo: add
   `"routes": [{ "pattern": "<apex>", "custom_domain": true }]` to `wrangler.jsonc`, and set
   `"workers_dev": false` in the same change, so production is served only on the domain.
   DOCS (Cloudflare, 2026-11-25): Previews don't inherit production settings, so PR previews
   should keep their `workers.dev` URLs; open one after this change to confirm. DOCS (2026-11-22):
   Cloudflare creates the DNS record and the certificate itself, and a Custom Domain can't be
   created on a hostname that already has a CNAME. Not documented: whether the build's token
   may create the domain during a deploy. If the deploy fails on permissions, the owner adds it
   in the dashboard (*the Worker → Settings → Domains & Routes → Add → Custom domain*, RECALLED
   path) and lists it as provider-side config (invariant 3).
2. **⚡ `www`: configure it fully or redirect it, never half.** MEASURED: a proxied `www` record
   with nothing behind it **hangs**. `curl` gets `HTTP 000` after 15 s instead of a 404, and
   nothing in the dashboard flags it.
3. **Recommended:** a zone **Redirect Rule** for `www` → apex, plus a proxied `www` record so the
   rule has traffic to act on. DOCS (2026-11-22): this is Cloudflare's documented pattern for
   Workers, because `_redirects` can't match on hostname ("Domain-level redirects ❌"). Prior
   work planned this exact path but never ran it end to end.
   - As of Sep 2026 there was a template, *Rules → Templates → "Redirect from WWW to root"*.
     Use a dynamic redirect, **301**, query string preserved. A static redirect sends every
     deep link to the homepage.
   - If you type the rule by hand, **the scheme is required**. DOCS: a pattern of
     `www.example.com/*` saves cleanly and never fires.
   - Then add the record Cloudflare's docs give: `A www 192.0.2.0`, **proxied**. That address
     is reserved for documentation and never receives traffic; the redirect answers first.
4. **Verify:** `curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' 'https://www.'$D'/x?y=1'`
   → `301 https://<apex>/x?y=1`. A `000` means the hang (the rule isn't firing).

### 6.7 Zone settings sweep (owner in the dashboard; names RECALLED, navigate by description)

| Setting | Set to | Why |
|---|---|---|
| SSL/TLS encryption mode | Full (strict), or leave "Automatic" if that's what the new zone shows. **Never Flexible** | Flexible downgrades the connection behind the proxy and is the classic redirect-loop cause |
| Always Use HTTPS | On | `http://` → `https://` at the edge |
| Minimum TLS version | 1.2 | |
| HSTS (dashboard) | Off | Sent from `_headers` instead: the repo is the site |
| Email Address Obfuscation | Off | Rewrites page content (§6.9) |
| Rocket Loader | Off | Rewrites scripts; fights the CSP and hydration |
| Web Analytics automatic setup (zone) | Off, unless the owner chose analytics | Injects a beacon at the edge (§6.9) |
| Zaraz | Not configured | Injects third-party scripts |
| Browser Cache TTL | Respect existing headers | Lets `_headers` be the one source of caching |
| AI crawlers / managed robots.txt | Per the owner's policy (§3) | DOCS (2026-11-21 review): current bot controls treat search, AI training and AI agents separately, some defaults depend on the zone, and Cloudflare can serve its own robots.txt. Make the served file match the policy (§6.9) |
| Development Mode | Off | |

Whether the page-rewriting features act on Workers responses isn't documented (2026-11-22).
Turning them off costs nothing, and `verify-live` measures the result (§10).

Afterwards, write this list into the provider-side config list (invariant 3) as *intended
settings plus how to check each one*, not as a claim about the current state.

### 6.8 Notifications and monitoring

- **⚡ Failed builds send no Cloudflare alert.** DOCS (2026-11-22): the notification list has a
  Pages deployment alert but nothing for Workers Builds. The documented alternative publishes
  failures to a Queue for a Worker to forward, which is Worker code (invariant 1), so skip it.
  The owner merges every change, so the merged commit is the alert: after each merge, check
  that Cloudflare's check on `main` goes green and that `verify-live` sees the new commit's
  marker (§10). A failed build leaves the previous version serving, so silence proves nothing.
- **⚡ Someone has to read the inbox.** Renewal notices, failure alerts and security mail all go
  to the Proton inbox. DOCS (2026-11-22): automatic forwarding is paid-only on Proton. So a
  human cadence (§11) is the only thing that makes these alerts real.

### 6.9 Edge behaviors that bite (MEASURED unless marked)

"MEASURED" here means on Pages, or on a GitHub Pages origin behind Cloudflare. Re-measure on
Workers; `verify-live` covers each item (§10).


- **Cloudflare Web Analytics can inject its beacon at the edge** when the zone setting is on.
  ⚡ The trigger is the request's **`Accept: text/html` header, not the user agent**, which is
  why a bare `curl` never sees it. A strict CSP blocks the beacon and logs one console error per
  page load. Make the zone setting match the analytics decision.
- **Email obfuscation (Scrape Shield) rewrites `mailto:` links** into a `__cf_email__`
  placeholder plus an injected decoder script. A strict CSP blocks that script, leaving
  `[email protected]` and a dead link. If the page ever has a `mailto:`, wrap it in
  `<!--email_off-->…<!--/email_off-->` or turn the feature off (§6.7), then check with the Accept
  header.
- **Cloudflare can write your robots.txt for you.** One fronted site was served a robots.txt
  written by the edge: 24 lines, all comments, no directives, no `Sitemap:` line. **Verify the
  robots.txt that's actually served, not the file you shipped.**
- ⛔ **Cloudflare-owned hostnames can serve a public, indexable copy of production.** MEASURED
  on Pages: the `*.pages.dev` alias sent no `X-Robots-Tag`, and robots.txt said `Allow`. On
  Workers, DOCS (2026-11-22): `workers.dev` *Preview* URLs get `noindex` automatically; the
  production `workers.dev` hostname and Version URLs aren't documented to.
  - Fix: switch the production `workers.dev` hostname off at launch (§6.6), and cover every
    `workers.dev` host with one `_headers` rule (§7.6).
  - Then **measure that the custom domain does NOT send it.** A blanket `noindex` is exactly how
    a production site gets deindexed. The canonical tag pointing at the custom domain is a
    second layer, not a replacement.
- DOCS (2026-11-22): **Workers static assets cap each file at 25 MiB, and a version at 20,000
  files**, on the free plan. On non-video plans, a **proxied zone may not serve video through
  the CDN.** Keep video out of the repo; if it's ever needed, host it elsewhere
  and name that host in the CSP.
- **Edge caching:** 404s and 301s can stay cached far longer than 200s. That was MEASURED on a
  GitHub-Pages origin behind Cloudflare, not on Cloudflare Pages. Two rules follow:
  - Never request an asset path on a live domain before you're serving it.
  - A marker that's missing in the first minutes after a deploy is not proof of failure.
- **A failed build leaves the previous deployment serving.** So "the site is up" is not evidence
  that a build passed; check the deployments list. The build image also gets rolling updates,
  so any future build can behave differently.
- **404s:** DOCS (2026-11-22): on Workers, `not_found_handling` defaults to `"none"`, which is an
  empty 404. `"404-page"` serves the nearest `404.html` with a 404 (§6.5).
  `"single-page-application"` would serve the index **with a 200 for every unknown path**, i.e.
  soft 404s, so don't use it. Whether `_headers` rules reach the 404 response isn't
  documented; Cloudflare's source suggests they do. `verify-live` checks both (§10).
- **Trailing slashes:** DOCS (2026-11-22): with Astro's default output
  (`dist/privacy/index.html`), `/privacy/` answers 200, `/privacy` gets a 307 to `/privacy/`,
  and `/privacy.html` takes two 307 hops. A 307 is a *temporary* redirect, so use the
  trailing-slash form everywhere the site names its own URLs: canonical tags, the sitemap,
  internal links.
- **Some default client user agents get refused** on `workers.dev` (error 1010; seen with
  Python's `urllib` during research on 2026-11-22). If a check fails that way, send a
  descriptive user agent, as `verify-live` does.

## 7. The MVW floor

Each item has a verify step. Generate everything from the one identity source (invariant 4).

### 7.1 Document and head (every page, from one layout)
- [ ] `<html lang="en">`; `<meta charset="utf-8">` comes first.
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">`. Never disable zoom.
- [ ] `<title>` and `<meta name="description">`, both from one source.
- [ ] `<link rel="canonical">` with an absolute URL from config. Leave it out in `noindex` mode.
- [ ] `<meta name="robots" content="noindex, nofollow">` **only** while not indexable.
- [ ] `theme-color`, and a `color-scheme` decision if the page supports dark mode.
- [ ] `<meta name="format-detection" content="telephone=no">`. iOS Safari can turn numeric
      strings into phone links, and a data-heavy page is full of numbers.
- Verify: view the built HTML in `dist/`, not the source.

### 7.2 Icons and identity (generate them from one master asset)
- [ ] `favicon.ico` must be a **real ICO**, not a renamed PNG. MEASURED failure: a PNG renamed
      to `.ico` works only because browsers sniff the content. Current guidance (Evil Martians'
      2026 favicon guide, per the owner's starter research): 32×32, linked with
      `sizes="32x32"` so browsers prefer the SVG.
- [ ] An SVG `rel="icon"` (it can carry a dark-mode style). `apple-touch-icon` at 180×180.
- [ ] `icon-192.png` and `icon-512.png`, plus `manifest.webmanifest` (name, short_name, icons,
      theme_color, background_color, display), linked with `rel="manifest"`. Needs
      `manifest-src 'self'` in the CSP. It's the current standard set and costs three small
      files; a maskable icon is optional.
- Verify: each icon URL returns 200 with the right `content-type`;
  `file production/dist/favicon.ico` reports an MS Windows icon.

### 7.3 Social share (often a site's growth path, so the card matters)
- [ ] `og:type` website, plus `og:title`, `og:description`, `og:url` (the canonical),
      `og:site_name` and `og:locale`.
- [ ] `og:image`: absolute URL, 1200×630 PNG/JPG, with `og:image:width`, `:height`, `:type`
      and `:alt`.
- [ ] `twitter:card` = `summary_large_image`.
- Verify: run a card validator. After any change, re-scrape (LinkedIn Post Inspector, Slack)
  because previews are cached. To bust that cache, rename the image file.

### 7.4 Structured data
- [ ] JSON-LD `WebSite` (name, url), plus a publisher (`Person` or `Organization`) only if it's
      true, and consistent with the identity rules in §11. Mark up nothing you can't stand
      behind.
- Note: CSP doesn't police `application/ld+json`, since data blocks don't execute.
- Verify: Schema.org validator / Google Rich Results Test.

### 7.5 Discovery
- [ ] **robots.txt** owned by the site: an absolute `Sitemap:` line and the AI-crawler policy
      per the owner. ⚡ **It never blocks everything, even before launch.** DOCS (Google Search
      Central's noindex page, 2026-11-25): "For the noindex rule to be effective, the page or
      resource must not be blocked by a robots.txt file", and a blocked URL can still show up
      in results. `noindex` does the
      pre-launch job (§7.1, §7.6); `verify-live` checks that robots.txt doesn't block (§10).
- [ ] **A sitemap** listing every indexable page (content, privacy, terms; never the 404):
      `sitemap-index.xml` if `@astrojs/sitemap` writes it. robots.txt names whichever it is.
- [ ] **404 page** that returns a **real 404 status** and links home.
- [ ] `llms.txt` if the owner wants it.
- [ ] `_redirects` only if something actually needs redirecting.
- Verify: fetch the **served** files (§10), not `dist/`.

### 7.6 Security headers and caching (`public/_headers`, live from the first deploy)

A starting point for a site with no third parties. Its CSP line is only the header's half; the
rest lives in Astro's `<meta>` policy (§4.6):

```
/*
  Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'none'; object-src 'none'
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

https://:version.:subdomain.workers.dev/*
  X-Robots-Tag: noindex
```

- Put the CSP in **on day one**, so violations show up during development instead of at launch.
- `includeSubDomains`: confirm that no subdomain of the domain needs plain http. Don't add
  `preload` without the owner.
- Use a long TTL **only** for content-hashed paths (§4.5). Favicons, the OG image and the HTML
  keep their default caching, or changes won't propagate.
- The `workers.dev` rule is Cloudflare's own example (DOCS, 2026-11-22). It matches every
  `<a>.<b>.workers.dev` host, which covers the production `workers.dev` hostname and the
  Version and Preview URLs. Only one `*` splat is allowed per rule, so
  `https://*.workers.dev/*` doesn't work. Limits: 100 rules, 2,000 characters per line.
- On Workers, `X-Content-Type-Options` and `Referrer-Policy` arrive only because this file sets
  them; Pages added them itself. Workers' default for assets is `Cache-Control: public,
  max-age=0, must-revalidate`, which the `/_astro/*` rule overrides for hashed files.
- **Never put `Cache-Control` in the `/*` rule.** Per the 11-25 assessment (DOCS, from
  Cloudflare's headers page): when several rules match, their values are comma-joined, which
  breaks caching, and `! Cache-Control` detaches an inherited value.
- The `/_astro/*` path is unconfirmed (§4.5). The header's CSP and Astro's `<meta>` policy
  split the job (§4.6), and `verify-live` checks that both arrive (§10).

### 7.7 Accessibility (target WCAG 2.2 AA; §9 covers the interactive part)
- [ ] A skip link, landmarks (`header`/`main`/`footer`), one `<h1>`, and headings in logical
      order.
- [ ] **Explicit, stable `id`s** on sections people might link to. Generated ids drift when
      wording changes. If there's a sticky header, use `scroll-padding-top`.
- [ ] Contrast: 4.5:1 for text, 3:1 for UI components and meaningful graphics (1.4.11).
- [ ] Manual checks for what automated tools miss: affordances that appear only on hover,
      reduced-motion handling, and focus hidden behind a sticky header.
- Note: valid HTML is a maintainability gate, not a WCAG 2.2 criterion (4.1.1 was removed).
  Keep a validator anyway.

### 7.8 Performance
- [ ] Targets: the Core Web Vitals "good" thresholds on a mid-range phone (LCP < 2.5 s,
      CLS < 0.1, INP < 200 ms), plus a JS budget for the island.
- [ ] Self-hosted fonts, with a preload whose URL is byte-identical to the `@font-face` URL
      (otherwise the font downloads twice). Astro's Fonts API with the local provider is the
      likely mechanism: per the 11-25 assessment it's stable since Astro 6.0 and generates the
      preload and fallback metrics (DOCS, not run here). Use modern image formats and lazy-load
      anything below the fold.
- Verify: Lighthouse, and **say which mode** in every claim. MEASURED: mixing desktop and
  mobile scores produced wrong figures that later got quoted as measured.

### 7.9 Works on every client
- [ ] No horizontal overflow at **320 px and 390 px**, in light and dark.
- [ ] Without JS, the content still reads (§9).
- [ ] `prefers-reduced-motion` is honored. Decide whether a print stylesheet earns its keep.
- [ ] **Real devices:** iOS Safari and Android Chrome. MEASURED: plain headless screenshots
      clamp to a 500 px minimum width and ignore the viewport meta. Only device emulation
      (`mobile: true`) or a real device actually tests mobile.

### 7.10 Privacy, terms, content
- [ ] **Privacy page:** what's stored locally, that the site's code never sends it anywhere,
      how to reset it (§8), and that there are no cookies or tracking. Don't claim "no third
      parties": the host (Cloudflare) processes standard request data, such as IP addresses,
      to serve every page, so say that plainly. Back the "no cookies" claim with the served
      responses (no `Set-Cookie`, §10). If analytics is ever added, this page changes in the
      same commit.
- [ ] **Terms page:** short. Content license and reuse terms, an "informational only, no
      warranty" disclaimer, and credits and licenses for fonts, libraries and assets. With no
      accounts or transactions, it doesn't need to be more than that.
- [ ] Footer on every page: copyright line plus links to Privacy and Terms.
- [ ] **No raw contact address on the site.** The Proton address is the asset's recovery
      channel, and publishing it invites spam into the inbox that has to stay readable (§11).
      If the privacy page needs a contact, publish a Proton Pass email alias (RECALLED: Pass
      Free includes a few), which delivers to the same inbox and can be switched off. Give it an
      inventory row. Skip `security.txt`: it needs a published contact plus an `Expires` date
      that has to be kept current.
- [ ] **Every published fact has a source and an as-of date** in the data file, verified the
      way §12.7 describes. Check reuse rights on any third-party data or imagery.
- [ ] Spelling and grammar pass. This isn't legal advice; if the audience or jurisdiction
      raises a real question, flag it to the owner.

## 8. The localStorage contract

Applies only if the site keeps state in the browser. A site that stores nothing skips this
section, and its privacy page says so.

1. **Treat storage as optional.** Merely *accessing* `localStorage` can throw (blocked storage,
   some private modes), and writes can throw `QuotaExceededError`. Wrap every read and write in
   try/catch. The page must work, with defaults, when storage is missing.
2. **Use one namespaced, versioned key**, e.g. `"<site>:v1"` → `{ "v": 1, ... }`. If the data
   doesn't parse or the version is unknown, migrate it or reset to defaults. Never crash.
3. **Store interaction state only.** No personal data and no identifiers. The site's code never
   transmits stored values.
4. **Add a visible reset control**, such as "Reset progress".
5. **The build renders without storage.** The HTML ships the default state and the script (or
   island) reads storage once the page has rendered. In React the usual mechanism is
   `useSyncExternalStore` with a server
   snapshot that returns the defaults. `client:only` skips the static HTML entirely, so keep it
   for canvas or WebGL. Design that transition so it causes no layout shift or flash. If something
   has to be restored before first paint, the tiny inline script involved collides with the CSP
   (§4.6, §4.9).
6. Optionally, listen for the `storage` event to keep multiple open tabs in sync.
7. **Privacy posture:** first-party, functional-only storage of what the user did, disclosed
   plainly (§7.10). This is the simplest defensible position. Don't add a cookie banner for it
   without the owner's call. Saving progress the visitor asked for is the kind of storage that
   privacy rules generally treat as strictly necessary (RECALLED; not legal advice), so keep
   storage to exactly that: no visit counters, no identifiers, nothing analytics-shaped.

## 9. The interactive layer

- **Information first.** The site's core content must exist as static HTML: readable
  without JS, by screen readers, crawlers and link previews. The interactive layer enhances it
  and never gates it.
- **Hydrate the smallest island that works**, and defer it when it's below the fold. Something
  with no real state, like a countdown, can be plain TypeScript in a bundled `<script>`
  instead.
- **Interactive parts are React islands**, with Base UI and Panda. Keep each as small as the
  interaction allows: static content renders in Astro, and the island takes only the
  interactive part, with a projection of the data (§1, the data contract). From the 11-25
  assessment:
  - Hydrate with `client:visible` by default. Use `client:idle` above the fold when it isn't
    needed in the first second, and `client:load` only when it's used at once.
  - Prefer one island per page region to many small ones: they share one cached React chunk,
    but each root hydrates on its own.
  - Inside the island, a native element (`<details>`, `<dialog>`, a radio group) still beats a
    component where it supplies the semantics. Base UI earns its weight where hand-rolled ARIA
    is risky: comboboxes, menus with typeahead, toasts, drawers.

  The island sets the CSP's owner (§4.6) and gets its own JS budget (§10).
- **Keep data separate from presentation** (invariant 6). Rules and content come from the
  data file.
- **WCAG items that interactive pages tend to trip:**
  - Every interaction works by **keyboard**, with visible `:focus-visible` and no focus traps.
    Move focus deliberately after state changes.
  - **Status updates** (a score, progress, a result count) go through a polite `aria-live`
    region, without spamming it.
  - **Timed interactions** need a way to turn off, adjust or extend the time limit (2.2.1).
  - **Dragging** needs a single-pointer alternative (2.5.7). **Targets** are at least 24×24 px
    (2.5.8); about 44 px is better for touch.
  - Anything that moves for more than 5 s on its own needs pause or stop (2.2.2). Nothing
    flashes more than 3 times a second (2.3.1).
  - Under `prefers-reduced-motion`, cut non-essential animation. (2.3.3 is AAA, but do it
    anyway.)
  - Color is never the only signal. **Canvas and complex SVG are opaque to assistive tech**, so
    provide a text or table equivalent.
- **Measure, then discuss.** Layout disputes resolved instantly once they were numbers from
  browser measurement. The owner's annotated screenshots plus your measurements were the
  highest-bandwidth loop in prior work.
- **Third-party widgets fail in browsers, not in code review.** MEASURED: `loading="lazy"` on an
  embed whose script hid it until load caused a deadlock that left a permanently blank form.
  Only browser testing caught it.

## 10. Verification battery

**Before deploying, mechanically.** Cloudflare fails the deploy on any non-zero exit, so put the
checks in the build chain: a check that doesn't halt the chain is not a check. ⚡ On a free
private repo the build is the **only** gate: with no branch protection, a GitHub Actions check
can't block a merge (§6.3). So the build script is
`"build": "astro check && vitest run && astro build && node scripts/verify-dist.mjs"`, and
`scripts/verify-dist.mjs` fails if any of these hold:

- a required file is missing from `dist/`. **The list grows with the site, so the build passes
  at every step.**
  - From the walking skeleton (§13 step 3): the index with its deploy marker, `404.html`, the
    privacy and terms pages (placeholders), `_headers` and robots.txt.
  - From the MVW floor (§13 step 4), add the sitemap, the icons and the manifest.
- `dist/` contains `data:` URIs or `style=` attributes, a page lacks Astro's CSP `<meta>`, or an
  inline `<script>` or `<style>` has no hash in its page's policy (§4.6)
- the privacy, terms or 404 page loads any script (a budget of 0 from the skeleton on), or a
  page's scripts exceed its JS budget: their gzipped bytes, measured from `dist/`. Set each
  content page's budget from its first measurement with its island (§13 step 3) plus a stated
  margin.
  Raising it later is a check-loosening branch (below).
- a page carries both a `noindex` robots meta and a canonical, or neither (§7.1). The 404 page
  keeps `noindex` and never gets a canonical, in every mode. A published Astro blog's build
  checks gave the cue.
- an internal link or `#fragment` points at a page or `id` that doesn't exist in `dist/`
- `src/` uses `set:html` (data never renders as raw HTML; §1, the data contract)
- `dist/` contains residue (`localhost`, `TODO`). Other project names and personal strings
  can't go in a committed script without becoming residue themselves, so the pre-push scan
  (§6.3) covers them; its pattern lives outside both repos and never enters `development/`.

⚡ **`vitest run` fails when it finds no test files** (DOCS, Vitest: `passWithNoTests` defaults
to false). So the skeleton ships one real test, for example that the identity module's canonical
URL is absolute (invariant 5). Don't paper over it with the flag.

Keep it free of false positives: a check that cries wolf gets switched off. Add an HTML
validator (e.g. html-validate) and an a11y pass (axe or Lighthouse).

**The branch carries its own judge.** The `build` script, `scripts/`, the tests and their
config, `public/_headers`, the `security.csp` block in `astro.config.mjs` and `wrangler.jsonc`
all live in the branch they judge, the production
build runs whatever was merged, and on a free private repo nothing outside the branch can block
a merge (§6.3). The one spot outside the branch is the dashboard build command, and moving checks
there would break invariant 3. So the owner's review is the gate on the gates; make it easy. A
branch that loosens any of those files (drops an assertion, narrows a pattern, widens the CSP,
skips a step) does nothing else and says why. Adding a check alongside a feature is fine. When a
session hands over a branch, it lists which of those files the branch touches:
`git -C production diff --name-only main...HEAD` (tested in zsh 2026-11-22 on a fixture).

**Tests, sized to the site.**
- **Vitest** for the storage module, where there is one: migration, malformed data, blocked
  storage. It's pure logic, cheap enough to run in the build.
- **A Playwright smoke test** (load, interact, reload, state persists, storage blocked), which
  the session runs before opening a PR. Not in the Cloudflare build: browsers are heavy.
- **Lighthouse** locally, with the mode named (§7.8). One lint and format tool. No git hooks.

**Local preview with production headers.** Use §4.13. If wrangler doesn't honor `_headers`, a
tiny static server that reads `dist/_headers` and applies them works; prior work ran a ~60-line
Python stdlib version of exactly that. Keep DevTools' Console open: CSP violations show up there.

**After a deploy: `production/scripts/verify-live.sh`.** Output you have to read gets misread:
a 500 prints just like a 200, and a header grep passes if any one header exists. So every line
asserts and prints PASS or FAIL, and the script exits non-zero if anything failed. Run it from
the workspace root after every production deploy, and in preview mode on a `workers.dev`
hostname before launch. It needs the network, so in a sandboxed agent session it's an approved
escalation (it only reads), or the owner runs it:

```bash
bash production/scripts/verify-live.sh <domain> "$(git -C production rev-parse main)"   # production, after pulling the merge
bash production/scripts/verify-live.sh <worker>.<subdomain>.workers.dev <sha> preview    # before launch, or a PR preview
```

A starting point. Tested 2026-11-22 with macOS's bash 3.2 against public hosts: each check
passed and failed where it should. The three indexability checks (no `noindex` meta, the
canonical, robots.txt not blocking `*`) and the CSP `<meta>` checks were added 2026-11-25 and
tested the same way: their matchers on 22 fixtures (8 robots.txt shapes, 5 canonical, 3
`noindex` meta, 6 CSP meta), then the whole script against public hosts in both modes. The
robots.txt checks run in both modes, because a blocking robots.txt does its damage before
launch, and "robots.txt 200" keeps a missing file from passing as "doesn't block". Adapt the
marker format to what the site emits, and the DNS checks to the §1 profile: they assume
Cloudflare nameservers and no mail at the domain. The page checks cover `/` and one missing
path, so a site with more pages repeats them for each.

```bash
#!/usr/bin/env bash
# verify-live.sh <host> <expected-commit-sha> [prod|preview]
#   prod (default): <host> is the production domain. Every check, including www, http and DNS.
#   preview: <host> is a workers.dev hostname (a PR Preview or the production alias).
#            Page checks only, and the host must send noindex.
# Prints PASS/FAIL per check; exits 1 if any check failed.
set -uo pipefail
D=${1:?host}; SHA=${2:?expected commit sha}; MODE=${3:-prod}
H='Accept: text/html,application/xhtml+xml'   # browser-shaped: bare curl misses edge injection
bad=0
check() { local name=$1; shift; if "$@"; then echo "PASS  $name"; else echo "FAIL  $name"; bad=1; fi; }
has()   { grep -qiE -- "$1" <<<"$2"; }        # here-strings, not pipes: no SIGPIPE races
lacks() { ! has "$1" "$2"; }
eq()    { [ "$1" = "$2" ]; }
get()   { curl -sS --max-time 15 -A 'verify-live' -H "$H" "$@"; }
code()  { get -o /dev/null -w '%{http_code}' "$1"; }
dest()  { get -o /dev/null -w '%{redirect_url}' "$1"; }
hdrs()  { get -D - -o /dev/null "$1"; }
blanket() { sed 's/#.*//' <<<"$1" | tr -d '\r' | awk '   # prints a Disallow: / that applies to *
  { l = tolower($0); sub(/^[ \t]+/, "", l) }
  l == "" { next }
  l ~ /^user-agent:/ { if (!ua) star = 0; ua = 1; if (l ~ /^user-agent:[ \t]*\*[ \t]*$/) star = 1; next }
  { ua = 0 }
  star && l ~ /^disallow:[ \t]*\/[ \t]*$/ { print; exit }'; }

PAGE="https://$D/"; MISS="https://$D/verify-live-no-such-page"
PH=$(hdrs "$PAGE"); PB=$(get "$PAGE"); MH=$(hdrs "$MISS"); MB=$(get "$MISS")

check "page 200"                     eq "$(code "$PAGE")" 200
check "page is build $SHA"           has "name=\"site-marker\" content=\"$SHA\"" "$PB"
check "unknown path 404"             eq "$(code "$MISS")" 404
check "404 is the site's own page"   has "$SHA" "$MB"
for h in content-security-policy strict-transport-security x-content-type-options \
         referrer-policy x-frame-options permissions-policy; do
  check "$h (page)"                  has "^$h:" "$PH"
  check "$h (404)"                   has "^$h:" "$MH"
done
check "no Set-Cookie (page)"         lacks '^set-cookie:' "$PH"
check "no Set-Cookie (404)"          lacks '^set-cookie:' "$MH"
check "no edge injection"            lacks 'cloudflareinsights|__cf_email__|rocket-loader' "$PB"
check "CSP meta (page)"              has "<meta[^>]*http-equiv=[\"']?content-security-policy" "$PB"
check "CSP meta (404)"               has "<meta[^>]*http-equiv=[\"']?content-security-policy" "$MB"
ROBOTS=$(get "https://$D/robots.txt")
check "robots.txt 200"               eq "$(code "https://$D/robots.txt")" 200
check "robots.txt doesn't block *"   eq "$(blanket "$ROBOTS")" ""

if [ "$MODE" = preview ]; then
  check "noindex on this host"       has '^x-robots-tag:.*noindex' "$PH"
else
  check "production is indexable"    lacks '^x-robots-tag:' "$PH"
  check "no noindex meta"            lacks '<meta[^>]*noindex' "$PB"
  check "canonical is https://$D/"   has "<link[^>]*rel=\"canonical\"[^>]*href=\"https://$D/\"|<link[^>]*href=\"https://$D/\"[^>]*rel=\"canonical\"" "$PB"
  check "www -> apex, 301"           eq "$(code "https://www.$D/x?y=1")" 301
  check "www keeps path and query"   eq "$(dest "https://www.$D/x?y=1")" "https://$D/x?y=1"
  check "http -> https"              eq "$(dest "http://$D/")" "https://$D/"
  SMAP=$(sed -nE 's/^[Ss]itemap:[[:space:]]*([^[:space:]]+).*/\1/p' <<<"$ROBOTS" | head -n1)
  check "robots.txt has Sitemap"     has "^Sitemap: https://$D/" "$ROBOTS"
  check "named sitemap is 200"       eq "$(code "${SMAP:-https://$D/sitemap.xml}")" 200
  check "nameservers on Cloudflare"  has 'ns\.cloudflare\.com\.?$' "$(dig +short NS "$D" @1.1.1.1)"
  check "null MX"                    eq "$(dig +short MX "$D" @1.1.1.1)" "0 ."
  check "SPF -all"                   has '"v=spf1 -all"' "$(dig +short TXT "$D" @1.1.1.1)"
  check "DMARC p=reject"             has 'p=reject' "$(dig +short TXT "_dmarc.$D" @1.1.1.1)"
  check "DNSSEC validates (ad flag)" has '^;; flags:.* ad[ ;]' "$(dig +dnssec "$D" A @1.1.1.1)"
fi
exit $bad
```

- **Deploy marker:** the page emits `<meta name="site-marker" content="<commit sha>">` with the
  commit it was built from. DOCS (2026-11-22): Workers Builds sets `WORKERS_CI_COMMIT_SHA` at
  build time only, so read it during the build and fall back to `local` (how is YOURS). A
  per-build value proves *this* deploy is serving, which a fixed string can't. ⚡ MEASURED:
  check the marker against **the failure page as well as the old page**. The first marker
  chosen in prior work also appeared on the host's own 404 page, so it would have scored a
  dead site as a successful cutover. The script's "404 is the site's own page" check leans on
  the marker for exactly that.
- **Resolve asset URLs from the served HTML**, hash included. Never construct asset paths by hand.
- **Tie evidence to a commit.** A result from a local run names the commit it ran against as
  well as the instrument ("Lighthouse mobile, `a1b2c3d`"), and says which checks didn't run. The
  live marker names the merge commit, not the branch head the preview showed.
  **Before merging (owner; it needs the network):** check that the branch already contains
  `main`, so the merge ships exactly the tree the preview showed:

  ```bash
  B=<branch>; if ! git -C production fetch -q origin; then echo "FAIL  fetch: no network or no access"; elif git -C production merge-base --is-ancestor origin/main "origin/$B"; then echo "PASS  $B contains main: merging ships what the preview showed"; else echo "FAIL  main moved (or no such branch): merge main into $B, push, re-verify the preview"; fi
  ```
  Tested 2026-11-25 on a fixture with a bare remote: PASS, then FAIL once `main` moved, then
  PASS after merging `main` into the branch. A mistyped branch fails after git's own "Not a
  valid object name" line, and an unreachable remote prints the fetch FAIL instead of nothing.
  **After merging,** confirm it: if `main` didn't move under the PR, the two share a tree:
  `git -C production rev-parse <branch>^{tree} main^{tree}` prints the same hash twice (tested
  in zsh 2026-11-22 on a fixture; run it before deleting the branch). Two different hashes mean
  production is a combination nobody previewed.

## 11. Ownership and handoff readiness

The design goal: a next owner can operate, renew and fully take over the site without ever
talking to the previous owner, using only the providers' supported transfers. Everything below
serves that.

- **What transfers, and how** (DOCS, 2026-11-22):
  - **The repos:** GitHub's repository transfer, to the next owner's own GitHub account. The
    history goes with them. Reconnect Cloudflare's build to the moved repo afterwards: the
    GitHub App installation belongs to the old account, and the build's API token belongs to
    the Cloudflare login that connected it (§6.5), so reconnecting as the next owner moves
    both.
  - **The Cloudflare account, whole** (domain, DNS, the Workers project, zone settings): add
    the next owner's login as **Super Administrator**, then remove the site's login. The
    Registrar's documented move between accounts is the fallback only: it drops every zone
    setting, needs DNSSEC off, and locks the domain for 30 days.
  - **The Proton account doesn't transfer.** It stays behind and gets closed at the end of the
    handoff, so nothing may still depend on it by then (the inventory rule below).
  - **The site's GitHub account** is empty once the repos move. Close it too, which also ends
    the second-free-account risk below.
- **⚠ Why not hand over the master password.** DOCS (quoted from the terms, 2026-11-22):
  Proton's terms list "trading, selling or otherwise transferring the ownership of an Account
  to a third party" and "sharing your Account or login credentials with any other person" as
  unauthorized, and GitHub's say a login "may only be used by one person". A donation counts:
  "otherwise transferring" reads as covering gifts, and a recipient who already holds free
  accounts of their own would make these their second ones. Using no real name changes
  nothing; the terms count people, not names. The transfers above get the same result within
  the terms.
- **⚠ Accepted terms risks** (the owner's ruling and its date go in the §1 profile). GitHub
  allows "no more than one free Account" per person, and Proton bans "having multiple free
  Accounts" and using a free address "for the unique purpose of registering to third-party
  services". If the owner has free accounts of their own, the site's are second ones. The only
  fixes that keep the accounts separate are paid plans. The exposure: a suspended GitHub
  account takes the repos offline. The live site keeps serving from Cloudflare, but builds stop
  until the repos are restored from the offline bundle (below) and reconnected. The risk ends
  at handoff, when the emptied GitHub account and then the Proton account get closed.
- **An alternative for other instances: a GitHub organization.** If an owner doesn't need the
  site's accounts kept separate from their own, a free organization owned by their own GitHub
  account is the terms-clean shape. DOCS (2026-11-22): free organizations get unlimited private
  repos, and ownership moves by adding a new owner and removing yourself. So there's no second
  free account, the handoff is an owner swap, and Cloudflare's app installation, which belongs
  to the organization, survives it. The free-plan limits are the same (no branch protection on
  private repos), and the site stays tied to the owner's own account until the handoff.
  Converting a dedicated account into an organization doesn't get around that, because an
  organization still needs a personal account as its owner (RECALLED).
- **Recovery that doesn't depend on itself.** Pass opens only after signing in to Proton, so
  Proton's own 2FA and recovery phrase can't live in Pass; Proton's support says the same
  (DOCS). Keep them in an **offline recovery kit**, printed or on a device kept elsewhere, and
  test a recovery once from a logged-out browser. Everything else lives in Pass.
- **Backups outside the providers.** Both repos sit on one GitHub account, which is not a
  backup of itself. Keep an offline bundle of each, refreshed after significant changes (tested
  2026-11-22, including a clone back from the bundle):

  ```bash
  git -C production bundle create <backup-dir>/production.bundle --all
  git -C production bundle verify <backup-dir>/production.bundle      # must run inside a repo
  ```

  The same for `development/`. The backup location is outside the workspace, so it's the
  owner's (§12.6).
- **Service inventory** (`development/`, no secrets). One row per service:

  | Service | Login | Plan | What it controls | 2FA and recovery codes | Cost and renewal | How it transfers |
  |---|---|---|---|---|---|---|
  | Proton (Mail + Pass) | the address | Free | Recovery inbox for everything; the vault | offline kit (above) | Free (inactivity policy, below) | Doesn't: closed after the handoff |
  | Contact alias (Proton Pass), if published | the alias | Free | The privacy page's contact | (none) | Free | Doesn't: the next owner publishes their own |
  | GitHub (site account) | ... | Free | Both repos; the Cloudflare app grant | ... | Free | Repos move by repository transfer; then the account is closed |
  | GitHub (owner's own, collaborator) | the owner's | (theirs) | Push access to both repos | (theirs) | (theirs) | Removed from both repos |
  | Cloudflare | ... | Free | Registrar, DNS, Workers, zone settings | ... | Domain renewal, yearly | Next owner added as Super Administrator; the site's login removed |

  Rule: **any new service** (Search Console, a font foundry account, anything) is registered to
  the Proton address, gets a Pass entry, and gets an inventory row *in the same change*,
  including how it transfers. The Proton account doesn't transfer, so a service with no
  transfer path is stranded at handoff. Prefer services that let you add another owner, or that
  verify ownership through DNS, which moves with the Cloudflare account (RECALLED: Search
  Console allows both).
- **`development/` is a repo so it transfers.** It's the second private repo on the site's
  account; Cloudflare's app doesn't get access to it. A folder on the owner's disk is neither
  backed up nor handed over.
- **The workspace shell** (root `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.codex/`, `.gemini/`)
  isn't inside either repo. Record each file's contents in `development/workspace.md` and update
  it in the same change as any shell edit, so the next owner can rebuild it. Never record
  `.claude/settings.local.json`: it's personal. Prior work used this approach, and it held up.
- **Liveness, the silent failures** (ranked by how quietly they fail, not by how bad they are):
  - **Domain expiry.** Auto-renew needs a valid card, and the notices go to an inbox nobody may
    read.
  - **Proton inactivity.** DOCS (2026-11-22): Proton's terms allow deleting free accounts
    inactive for 24 consecutive months (one support page says to sign in yearly; do that). A
    deleted mailbox breaks password resets for GitHub and Cloudflare.
  - **The unread inbox.** DOCS (2026-11-22): automatic forwarding is paid-only. A recurring
    human check (monthly is plenty) is the only fix, and the runbook should name it.
- **Personal ties to cut at handoff:**
  - the owner's own GitHub account as a collaborator on both repos
  - any owner login added as a Cloudflare member
  - the payment card on Cloudflare
  - the registrant contact on the domain
  - the owner's SSH keys or tokens on the site's GitHub account, and any `gh`/browser sessions
  - the owner's personal git identity, if any of it got into history (§6.2)

  The next owner signs in with their own logins and 2FA, so there's little to rotate: any
  Cloudflare API tokens and any deploy keys on the repos.
- **Docs stay owner-neutral.** Write "the owner" and "the next owner", never a person's
  name, in this brief, in `development/` and in `AGENTS.md`, so nothing needs scrubbing at
  handoff. The production repo, the site and DNS name no person and no other project; the
  residue scan in §6.3 enforces it.
- **Handoff runbook** (`development/docs/transfer-ownership.md`), written now while it's cheap
  (under a deadline, right after launch: §13):
  - what the next owner needs first: their own GitHub and Cloudflare logins, with 2FA
  - the order of operations: invite them as Cloudflare Super Administrator → they accept and
    add their payment method → update the registrant contact → transfer both repos to their
    GitHub account → they reconnect the Cloudflare build to the moved repo, under their own
    login → prove a deploy from their side → only then remove the site's Cloudflare login
    (removing it first breaks the build's token) and everything on the cut list → move any
    service still tied to the Proton address, as the inventory says → close the site's GitHub
    account, then the Proton account
  - how to verify they're in control (`verify-live` from §10, plus a test deploy they push)

## 12. Working method and the agent workspace (tool-agnostic)

The owner may switch between agent tools (Claude Code, Codex, Gemini...). The method below is
how prior work made that cheap. Each piece is MEASURED in prior work unless marked.

### 12.1 Principles

1. **Files are the memory.** Decisions, status and lessons land in `development/` in the same
   session that produces them. Assistant-private memory stays empty (a standing policy).
   The next session may be a different tool with nothing shared but the files. MEASURED: in
   prior work, outcomes that lived only in chat never reached the trackers, three times in one
   session.
2. **One entry point.** `development/index.md` is the map: one screen, with pointers out to
   everything else. Keep a short *Now / Next / Open decisions* block in it (or a `status.md` it
   points to) as the single home for current state. **New docs get their one-line index entry
   in the same change that creates them.**
3. **One cross-tool contract.** `AGENTS.md` at the workspace root holds the guardrails that every
   tool obeys. Tool adapters only point at it and add mechanical guards. **Never duplicate the
   rules** into `GEMINI.md`, `.cursorrules` and the like: a second copy is a sync bug waiting
   to happen. A prior workspace created a `GEMINI.md` once and retired it within hours for
   exactly this reason.
4. **Each fact has one home.** Link to it; don't restate it. Restating re-asserts, and copies
   drift.
5. **Session start:** read the index, check the branch and status of **both** repos before
   writing to either (`git -C production status -sb` and `git -C development status -sb`; the
   first line names the branch), and re-verify any state you're about to rely on.
   **Session end:** land the outcomes in files before closing.
6. **Use the tool switch as a second opinion.** For load-bearing changes, have a *different*
   vendor's tool do a refute-first review. Tell it which facts were supplied rather than
   measured, or its review just echoes them back. Then treat its findings as input, not
   instructions: check each against its primary source before applying it. MEASURED on this
   brief's first review (2026-11-22): 2 of 27 findings were wrong, and one probe misled,
   because Codex's offline rule checker doesn't unwrap `zsh -lc` commands the way a live
   session does. Launch the reviewer from the workspace root with web search on, in a sandbox
   that lets it create temp files (that review's couldn't), and paste the prompt rather than
   storing it, so it can't be re-run by accident. Even an accepted finding is provisional: this
   brief cut the web manifest on a review finding, then restored it when the owner's own
   research showed it's the current standard.
   Start a review from a clean tree, and afterwards check it wrote nothing but its own output
   file: `git -C production status --short` and `git -C development status --short` list only
   that file (tested as a command 2026-11-22; the practice is new here).
7. **Stored prompts and briefs carry a status line** ("record, not instruction" once they're
   spent). Otherwise a later session executes stale instructions with full confidence. That
   includes this brief (its header's `status:` line).

### 12.2 Workspace shape

```
<workspace>/                 not a git repo: every git command is `git -C <repo>`
├── AGENTS.md                the cross-tool contract (read natively by Codex and many others)
├── CLAUDE.md                imports AGENTS.md + development/index.md
├── .claude/settings.json    shared Claude guards (sandbox, push deny, attribution off)
├── .claude/settings.local.json   personal; never relied on for guards, never recorded
├── .codex/config.toml       Codex permission profile (network off)
├── .codex/rules/no-remote-write.rules
├── .gemini/settings.json    only once Gemini is used: points it at AGENTS.md
├── development/             private repo: map, notes, inventory, runbooks, this brief
└── production/              private repo: the Astro site Cloudflare builds; nothing else
```

- **Always open the workspace root** as the session and window root. DOCS (2026-11-22): a
  session started inside `production/` or `development/` loses root config. Codex stops at the
  nearest git root, so it skips the root `AGENTS.md` and `.codex/`. Claude Code still loads
  the root `CLAUDE.md`, but not the root `.claude/settings.json`. That's why the push deny
  rules are mirrored at user level (§12.3).
- **`production/` holds only the site** plus its operator README. Agent files, notes and
  development vocabulary stay out. It's the part that transfers to a stranger's toolchain.

### 12.3 Adapter files (proposed contents; adapt them, then record them in `development/workspace.md`)

`AGENTS.md`. It says "the owner" rather than a name so it survives a handoff:

```markdown
Before doing project work, read `development/index.md`: it is the project map. Follow its
pointers as the task needs.

Treat the folder containing this file and everything under it as the whole project. Do not
read, search, run against, or modify anything outside it unless the owner explicitly asks. If
outside access seems necessary, explain why and wait for approval.

The workspace root is not a git repo. `production/` (the site Cloudflare deploys) and
`development/` (docs and notes) are separate repos; scope every git command with `git -C <repo>`.
Stay at the workspace root: run anything that needs a repo's folder in a subshell, for example
`( cd production && npm run build )`.

Work on a non-`main` branch named `<tool>-<topic>` (for example `claude-hero-layout`), and check
the branch of every repo you will write to before writing. A push to `main` deploys production.
The owner reviews every change and merges every pull request.

Never push to any Git remote, and do not use another command, script, API, connector, or Git
plumbing operation to perform an equivalent remote write.

Stage files by explicit path. Never use `git add -A` or `git add .`.

Do not add an AI assistant as a commit co-author or add AI attribution to commits or pull
requests.

Files are the memory: record decisions, status, and lessons in `development/` before the session
ends, and add a one-line entry to `development/index.md` for any new document. Nothing important
may live only in chat or in an assistant's private memory.

State confidence inside the sentence: MEASURED (run and observed), DOCS (read in current vendor
docs, not tested), or RECALLED (from memory, unchecked). Verify built output and the deployed
site, not just exit codes.

Keep `production/` limited to the site and its operator README: no notes, agent files, or
development vocabulary.

Ask the owner early for anything that needs a dashboard, a login, or human judgment. Put anything
the owner will paste elsewhere inside a fenced code block.

Never weaken a check to get a build to pass: not a test, an assertion, a scan pattern, the build
script, `_headers`, the CSP in `astro.config.mjs` or `wrangler.jsonc`. If a check is wrong, say
so and fix it in a branch that does nothing else. If the same failure survives two attempts at
a fix, stop: record the first and latest output where `development/index.md` keeps open
decisions, and ask the owner.

Once `AGENTS.md`, `.claude/`, `.codex/` and `.gemini/` are set up, only the owner changes them;
propose the change instead. A review or research session writes nothing but its own output file.
```

`CLAUDE.md` (if yours has only the second line, add the first):

```
@AGENTS.md
@development/index.md
```

`.claude/settings.json`:

```json
{
  "permissions": {
    "deny": [
      "Bash(git push:*)",
      "Bash(git push *)",
      "Bash(git -C * push*)",
      "Bash(wrangler login:*)",
      "Bash(npx wrangler login:*)",
      "Bash(wrangler deploy:*)",
      "Bash(npx wrangler deploy:*)"
    ],
    "disableBypassPermissionsMode": "disable"
  },
  "sandbox": {
    "enabled": true,
    "failIfUnavailable": true,
    "allowUnsandboxedCommands": false,
    "network": {
      "allowedDomains": ["registry.npmjs.org"]
    }
  },
  "attribution": false
}
```

- DOCS (Claude Code docs, 2026-11-22) for every key. `"attribution": false` hides all
  attribution and needs v2.1.281+. On older versions use
  `{"commit": "", "pr": "", "sessionUrl": false}`: the earlier two-field form left
  `sessionUrl` on, which links cloud and Remote Control commits to a session.
- **The sandbox is the real push guard here.** Shell commands reach only the allowed domains,
  and other hosts prompt (decline anything for `github.com`), so `git push` can't reach GitHub
  however it's spelled. `failIfUnavailable` fails closed instead of running unsandboxed;
  `allowUnsandboxedCommands: false` removes the per-command escape hatch. Add a domain only
  when a build step needs one. Not yet tested in the VS Code extension; §12.4 is the test.
- The deny rules are a second layer. They match command shapes, and Claude's docs say outright
  that `git -C . push` slips past `Bash(git push *)`, hence the third rule. No shape list is
  complete (`git -c k=v push` still slips past), which is why the sandbox matters. The four
  `wrangler` rules back up §12.5 the same way: no login and no deploy from this machine. They
  also block `wrangler deploy --dry-run`, which publishes nothing; that's an acceptable loss.
- `disableBypassPermissionsMode` refuses the skip-every-prompt mode.
- **The owner mirrors the deny rules into the user-level `~/.claude/settings.json`**, so a
  session opened in a child folder keeps them (§12.2). It's outside the workspace, so a session
  proposes the edit and the owner makes it. Keep the sandbox project-level: its network
  allowlist would get in the way of other projects. Check what's already in the user file
  first.
- Optional, cheap: `"blockReadsOutsideWorkingDirectories": true` under `permissions`
  (v2.1.257+) keeps Claude's file tools out of `~/.ssh` and the like. It doesn't limit shell
  commands.

`.codex/config.toml`:

```toml
approval_policy = "on-request"
default_permissions = "site"

[permissions.site]
description = "Built-in workspace profile with network off: writes stay in the workspace and temp dirs; anything more needs the owner's approval."
extends = ":workspace"

[permissions.site.network]
enabled = false
```

- DOCS (Codex permissions docs and source, 2026-11-22), not yet run against a Codex build.
  Validate it from the workspace root with `codex --strict-config doctor --summary` before
  relying on it (§12.4). The permissions schema is beta; re-check after upgrades.
- `extends = ":workspace"` keeps the filesystem readable (the Node toolchain lives outside the
  workspace) and the system temp dir writable. Writes anywhere else, and all network access,
  need an approved escalation. The earlier version denied everything outside the workspace:
  an independent review hit exactly that wall when it couldn't create temp files, and it would
  likely have hidden a Node install that lives outside the workspace (RECALLED).
- `git_attribution` is gone. DOCS: it isn't a Codex config key; attribution is an
  account-level setting on OpenAI's side, so the AGENTS.md rule carries it.
- With network off, `npm install` and `npm ci` become approved escalations. That's a feature:
  dependency changes get a human look.
- There's no machine-specific path any more, so the file survives a move or a handoff. Project
  `.codex/` loads only when the folder is trusted and Codex starts at the root (§12.2).

`.codex/rules/no-remote-write.rules`:

```python
prefix_rule(
    pattern = ["git", ["push", "send-pack"]],
    decision = "forbidden",
    justification = "Remote Git writes are owner-only; prepare a local branch for the owner to review and push.",
    match = ["git push", "git push origin main", "git send-pack origin refs/heads/local:refs/heads/main"],
    not_match = ["git status", "git fetch origin"],
)

prefix_rule(
    pattern = ["git", "-C", ["production", "development"], ["push", "send-pack"]],
    decision = "forbidden",
    justification = "Remote Git writes are owner-only; prepare a local branch for the owner to review and push.",
    match = ["git -C production push", "git -C development push origin main"],
    not_match = ["git -C production status", "git -C development fetch origin"],
)
```

- The second rule covers the `git -C` form this brief mandates. Not yet run against a Codex
  build: confirm the build accepts it, then check both shapes:
  `codex execpolicy check --rules .codex/rules/no-remote-write.rules -- git -C production push origin main`
  and the same with `-- git push origin main`; each → `forbidden`.
- DOCS and RAN (2026-11-21 review; 2026-11-22 source read): prefix rules still miss
  `git -c k=v push`, `git --git-dir=… push`, `/usr/bin/git push` and `env git push`. At runtime
  Codex does split simple `zsh -lc '…'` scripts and checks each command, though
  `execpolicy check` doesn't. So the rule is a warning layer; network-off is the guard.

`.gemini/settings.json`, **only once Gemini is actually used**:

```json
{
  "context": { "fileName": "AGENTS.md" }
}
```

- `context.fileName` is MEASURED in prior work; older Gemini docs show a flat `contextFileName`.
- ⛔ **Gemini has no project-level push guard.** MEASURED 2026-11-22 against Gemini's policy
  engine (the core library, v0.70.0, not the full CLI): a command-qualified `tools.exclude`
  entry such as `run_shell_command(git push)` blocks nothing, and `tools.exclude` is
  deprecated. DOCS: project-level policy files are "currently non-functional". A guard has to
  live in a user-level policy. Until one passes §12.4, keep Gemini sessions consultative:
  review and research, no commits.
- **No `GEMINI.md`** (principle 3).

### 12.4 Test the guards (safe by construction)

The push test aims at a local path that doesn't exist, so even if every guard misses, it
touches no network, no credentials and no remote. (A real `--dry-run` to `origin` isn't
harmless: it still contacts the remote with the owner's credentials.)

1. **The owner runs it once in a plain terminal first**, to see what a miss looks like:
   `git -C production push --dry-run /nonexistent-guard-test.git HEAD`
   RECALLED, not run by the session that wrote this (it doesn't run push in any form): git
   should fail at once with "does not appear to be a git repository".
2. **Then ask each agent tool to run the same command.** Expect the *harness* to refuse it
   before it runs. If the agent shows the local git error instead, that tool's guard missed.
3. **Codex, statically:** the two `codex execpolicy check` commands in §12.3 → `forbidden`.
4. **The network guard:** ask each tool to run `git -C production ls-remote origin`. Under
   Claude's sandbox and Codex's network-off profile it should fail to connect or ask for
   approval (decline). It's read-only, so a miss reveals the branch list and nothing more.

Record each result, with tool name and version, in `development/workspace.md`. A guard that has
never refused anything is an assumption.

### 12.5 The real boundary is the network, then credentials

Prose rules and deny lists are behavioral; a different command shape slips past them. The
conclusion from prior work: **an agent shouldn't be able to reach a credential that can
write.**

In this instance the owner pushes with their own GitHub account (§6.2), whose credentials are
already on the machine, and GitHub Free gives private repos no branch protection. So the
barrier is the network layer: Claude's sandbox and Codex's network-off profile (§12.3) keep
shell commands from reaching GitHub at all, whatever the command looks like. Approval prompts
are the weak point: read any request to reach `github.com` before approving it.

**Don't run `wrangler login` on this machine.** It stores a Cloudflare token that every agent
session can reach, and nothing here needs it: deploys come from Workers Builds on merge,
rollback is in the dashboard (§6.5), and `wrangler dev` runs locally without a login
(RECALLED). So `package.json` has no `deploy` script; generated starters often add one.

Stronger, optional (the owner's call; outside the workspace, and it affects every project on
the machine): make the push credential something only a human can unlock, such as an SSH key
with a passphrase that's kept out of ssh-agent and the keychain, and don't leave `gh` signed in
with write scope.

### 12.6 Conventions (proven in prior work)

- **Agents never push, to any repo; the owner pushes and merges.** Branches are named
  `<tool>-<topic>`. Flow: PR → Cloudflare preview URL → the owner reviews → merge → delete the
  branch. Delete merged local branches with `git -C <repo> branch -d <branch>` (never `-D`); it
  refuses anything unmerged.
- **The session stays at the workspace root.** Commands that need a repo's folder run in a
  subshell, `( cd production && npm run build )`, so the next command still starts at the root.
  Every command in this brief is written that way and was tested from the root.
- **Stage by explicit path. Never `git add -A`.** MEASURED twice: it wrote false history, and
  under concurrency it swallowed another session's work. One session per working tree.
  Re-check the branch right before writing, not just at session start.
  Across the whole workspace, run one *writing* session at a time: a session can write to both
  repos and the root files, so per-tree isn't enough. Other sessions only review or research
  (§12.1, principle 6). Nothing enforces this but the owner: a pre-edit hook misses shell writes
  and the other tools, so don't count one as a guard. (Workspace-wide is new here, not yet
  tried.)
- Remote ground truth comes from `git -C <repo> ls-remote --heads origin`, which the owner runs
  when agent sessions have no network. `git branch -r` is a local cache, and plain `git fetch`
  doesn't prune.
- **Only create or modify files inside the workspace** unless the owner okays otherwise.
- **Put anything the owner will paste elsewhere inside a fenced block** (copying rendered text in the
  VS Code extension loses formatting). Use `1.` `2.` lists, never circled numerals.
- **Ask the owner early for human-easy steps** like dashboard clicks and logins. Write click-paths
  with their date and a fallback ("as of <date>, look for X; if it's gone, try Y"), paired with
  a verification command: a command survives a redesign, a click-path doesn't.
- **Put confidence in the sentence:** MEASURED / DOCS / RECALLED next to the claim, and name
  the instrument ("Lighthouse mobile"). A caveat in a header doesn't survive summarizing.
- **Verify the emitted artifact, not the exit code.** "The build succeeded" is not "the output is
  correct." **Verify with a different mechanism than the one you acted with.** Prefer checks
  that fail loudly: expect a known-present string to be found, not just zero hits.
- **Run a command before shipping it as an instruction**, and run it in the shell it'll actually
  run in (zsh here). **Test destructive commands against a throwaway copy first.**
- **Reproduce the target environment.** MEASURED: an em dash in a CSS comment broke a
  production build, because Cloudflare's builder ran under a US-ASCII locale. Keep source ASCII
  unless a character is doing real work.
- **Rank verification by how *silently* a surface fails**, not by how bad the failure is.
- **Don't delete user-facing files because grep finds no references.** Bookmarks, QR codes and
  external configs are invisible to grep. Ask first.
- **Size the effort to the decision.** This is a small static site: no CMS, no monorepo, no test
  framework that doesn't earn its keep.

### 12.7 Research and sourced facts: the corpus is the asset

The site is informational, so its facts are the product. This is prior work's research
method, distilled. It was used there across many runs; apply it in proportion to how much
weight a claim carries.

- **Verifiability, not truth.** A claim gets in only if it can be checked against a source
  outside the session, and "I don't know" is a correct answer. The burden sits with whoever
  adds a claim: no resolvable source, no claim.
- **Tier the sources.** T1 is official or primary; T2 is a respected secondary (industry, data,
  peer-reviewed); then observational. Label the tier. A T2 never stands in for a T1 on a
  load-bearing point, so prefer primaries.
- **Fan out, independently.** Send one byte-identical prompt to several vendors' research
  modes, each in a fresh thread that never sees another's work.
  - Agreement is corroboration, not proof. Lanes citing the same two URLs are one source with
    several witnesses.
  - A claim that flips a conclusion, comes from a single run, or gets challenged is re-checked
    at the original publisher.
- **Uncited answers are hypotheses.** Keep them, because they often hold the best non-obvious
  idea, but never let one carry a finding alone.
- **Synthesis can't invent.** When combining reports, put any conclusion that no source states
  on its own line, labeled as an inference.
- **The repo-aware session is the arbiter, never a vote on its own work.** It takes in the
  returns, runs whatever can be tested, and reconciles the rest against primary sources.
- **Keep the corpus in two tiers.**
  - Verified fact tables. Each row has the claim, the source URL, its tier and an as-of date;
    re-fetch the source before relying on a row.
  - Research syntheses. Their confidence varies by file, so each carries a status block that
    states confidence, not just provenance. A synthesis filed beside a verified table borrows
    credibility it hasn't earned.
- **Yield counts only once it lands in the corpus.** A finding left in a chat transcript is
  spend with no return.

**Where it lives:**
- `development/research/` holds the runs and raw returns.
- `development/knowledge/` holds the distilled tables and syntheses.
- The site's data file (invariant 6) derives from the verified table. Each fact ships with its
  public source URL and as-of date, and nothing in `production/` points into `development/`
  (§12.2).

The starter research behind this brief went through the same loop: three independent runs,
then a reconciliation against this brief (§0).

## 13. Recommended sequence

**No throwaway spike.** The walking skeleton is the spike. Each open
question in §4 gets answered in the real repo, at the first step that needs it, and the answer
lands in `development/astro-notes.md` (§14) with its commit. A finding that would change an
invariant (§2) or the stack (§1) stops the work and goes to the owner. This is safe because of
invariant 7: every commit on `main` could go live, so the experiment never runs ahead of the
floor.

1. **Before any code:** run `node -v` (§4.1). Set up identity and guards (§6.2, §12: git
   identity, adapters, guard tests) and the offline recovery kit (§11). Confirm the versions
   (§4.1, §4.2, §4.15) and raise §3 with the owner; the rest of §4 gets answered as the build
   reaches it. Write the answers into `development/`.
2. **Accounts baseline:** the registrar and DNS lockdown (§6.4) and the repo settings (§6.3).
   These are cheap, and they're independent of the build.
3. **Walking skeleton:** a minimal page with the deploy marker, `_headers` (CSP included), a 404
   page, placeholder Privacy and Terms pages, and robots.txt, with the `noindex` meta. Plus one
   trivial island: a Base UI component styled with Panda that reads localStorage after it
   mounts. It proves the CSP owner, hydration and the JS budget before design work (§4.6, §8,
   §9). The skeleton ships one real test and the skeleton-sized `verify-dist`, so the build
   passes as specified (§10). Commit `wrangler.jsonc`, create the Worker (§6.5), deploy to its
   `workers.dev` hostname, and prove the PR → preview → merge → deploy loop. Run `verify-live`
   in preview mode: page, 404 status and page, headers, both CSP halves, robots.txt, `noindex`.
   On the way it settles §4.3–4.6, §4.9, §4.13 and whether `_headers` reaches the 404.
   **The pipeline is proven before any design work starts.**
4. **The MVW floor with placeholder content:** identity module → head/OG/JSON-LD/sitemap/
   icons and manifest, the Privacy and Terms pages, an accessibility skeleton,
   `verify-dist`'s full file list, `verify-live`, and the header-faithful preview.
5. **The experience:** the data contract first (§1: copy, validate, render), static content
   from it, then the island (§9), the localStorage contract if used, motion and keyboard
   support, the performance budget, and real devices.
6. **Launch:**
   - content QA and the final OG image
   - attach the domain and redirect `www` (§6.6), then sweep the zone settings (§6.7)
   - flip to indexable and run `verify-live` against the domain (§10)
   - re-scrape the social previews and set up notifications (§6.8)
   - optionally submit the sitemap to Search Console
7. **Handoff-ready:** the inventory, the runbook (`development/docs/transfer-ownership.md`) and
   the workspace record are current (§11), and the recurring checks are on someone's calendar.
8. **Report back** (§14).

**Under a deadline** (§1's `deadline:`), cut scope, never the floor:
- **Waits until after launch:**
  - a second island, animation and other polish
  - Panda's `transform: true`, if it doesn't work cleanly the first time (§1)
  - the 11-25 assessment's extra headers (COOP, CORP, a longer HSTS)
  - `llms.txt`, JSON-LD beyond `WebSite`, Search Console, Lighthouse CI
  - dependency automation (Renovate, npm's release-age cooldown) and npm 12's strict
    install-script mode
  - step 7's runbook
- **Never waits:**
  - the guards and their test (§12.4) and the residue scan (§6.3)
  - `_headers` with the CSP, the 404 page, Privacy and Terms
  - `noindex` on every host but the production domain
  - sourced facts with as-of dates (§12.7, §1's data contract)
  - keyboard and screen-reader basics (§7.7) and the real-phone check (§7.9)
  - the share card when sharing is part of the experience (§7.3)
  - `verify-live` against the domain (§10)
- If one of those can't make the date, cut a feature instead. Launching without the floor is
  the "make it compliant later" phase that invariant 7 rules out.
- List what waited in `development/index.md`'s open decisions, so it doesn't get lost.

## 14. Report back (so the next instance starts smarter)

Each site built from this brief is a data point for the next one, and for any wider decision
about adopting Astro. Keep `development/astro-notes.md`, recording:

- the confirmed versions, and the answer to each §4 item
- which §7 items needed Astro-specific handling, and how
- **anything in this brief that turned out wrong or stale**, then fix the brief itself so
  the next copy inherits the correction
- two answers that matter to anyone weighing a wider move from Jekyll to Astro:
  - Did rendering content **from a data file** feel natural, or did it take contortions?
  - Did everything stay **static with no adapter**?

  Report them honestly either way. One small site is weak evidence, so say so rather than
  overclaim.
