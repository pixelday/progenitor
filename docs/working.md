# Working

Open items for developing the starter itself, as of 2026-11-26. A site built from the starter
can delete this file: its own backlog goes in `docs/index.md`.

Each item says what is open and what would settle it. When one is done, delete it here and
record the result where it belongs: the step in `docs/setup/`, or "What has been proven" in
`README.md`.

## Where things stand

From a fresh clone, on Node 24.22.3, all of this ran on 2026-11-26:

- `npm ci`, then `npm run build`: fifteen `PASS` lines.
- `npm run preview`, then `npm run audit`: thirteen `PASS` lines.
- `npx wrangler deploy --dry-run` accepts `wrangler.jsonc`. It uploads nothing.

The development machine now has Node 24.22.3: `npm ci` and `npm run build` printed the same
fifteen lines there.

The starter is on `main` of its public GitHub repository, behind a ruleset that requires a
pull request and blocks force pushes (`docs/setup/2-github.md`, part 4). It is deployed as a
Worker on a `workers.dev` hostname, unlaunched and `noindex`, and a merge to `main` builds
and deploys it. The live check passes: 36 `PASS` lines (`docs/setup/3-cloudflare.md`).
No second site has been built from the starter.

## Get it online

The owner does these. A session can verify each one.

1. **Read `docs/archive/`.** The repository is public, so the archive was published with the
   first push. Decide whether all four files stay.
2. **Finish the repository settings** (`docs/setup/2-github.md`, part 3). Read back on
   2026-11-26: squash merging, rebase merging and wikis are on, and the step turns all three
   off. The Actions and Dependabot settings can't be read without Admin: confirm both on the
   settings page.
3. **Check a branch preview** (`docs/setup/3-cloudflare.md`, part 6). It is the one part of
   step 3 not yet seen. `preview_urls` in `wrangler.jsonc` is `true`, and production has
   deployed with it. Push a branch, then:
   - see whether the "Deployment URL" column of Cloudflare's pull request comment carries the
     preview's address. It was empty on the one comment so far
   - run `scripts/verify-live.sh` against the address in `preview` mode. That also shows
     whether the `workers.dev` rule in `public/_headers` sends `noindex` on a preview hostname

   Still open beside it:
   - whether Cloudflare's build status shows on pull requests with Actions disabled. It
     showed on 2026-11-26, with the Actions setting unconfirmed
   - whether the empty `previews` block in `wrangler.jsonc` is needed, or merely allowed

   Then correct the step, and update "What has been proven" in `README.md`.
4. **Set a commit identity in every clone.** This clone commits as a GitHub noreply address
   (`docs/setup/2-github.md`, part 2). A clone on another machine needs the same before its
   first commit: a global git identity is usually a personal or work address, and this
   repository is public.

## Decide

- **A public demo of the starter.** The build refuses to launch the starter as it stands.
  With `launched: true` it fails on the URL, the name, the three legal pages, the icons, the
  share image and its alt text. That is what the check is for. If the starter itself should
  ever be live and indexable on a domain, that needs a deliberate exception. Today it is
  deployed unlaunched, on a `workers.dev` hostname that sends `noindex`.
- **The restored config.** `astro.config.ts`, `wrangler.jsonc` and `.gemini/settings.json` were
  rewritten from the docs on 2026-11-25. If the originals turn up, compare them.
- **Agent files in the site's repository.** `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.codex/` and
  `.gemini/` ship beside the site. Decide whether a site built from the starter keeps them.
- **Stronger agent guards.** `docs/archive/workspace.md` proposes them. None is installed or
  tested.
- **The manifest's `display` value.** It is `browser`. `standalone` would let a browser offer
  the site as an installable app.
- **The React island.** The home page ships 83.4 KB of gzipped JavaScript for a search box and
  three toggles, and about 67 KB of that is React. The assessment in `docs/archive/`
  recommends plain HTML and a small script for a control this simple.
- **The archive's future.** If `docs/archive/` goes, eight lines outside this file point into
  it. Find them with `git grep -n 'docs/archive' -- . ':!docs/archive' ':!docs/working.md'`.
- **Whether the accessibility page is mandatory.** Today it is: the build fails without
  `/accessibility/`, a launched build refuses its starter text, and `scripts/verify-live.sh`
  expects it to answer 200. Decide whether every site must publish one. This is for later:
  nothing waits on it. If the answer is no, the requirement comes out of
  `scripts/verify-dist.mjs`, `scripts/verify-live.sh`, `src/lib/pages.ts` and its test, and
  the README and setup steps that name three legal pages.
- **How a site takes later changes from the starter.** A site begins as a copy, and nothing
  carries a later fix in the starter down to it. Decide whether that stays a port by hand.
  The second site (below) is where it will first cost something.

## Build next

- **Fingerprint all six assets.** `scripts/verify-dist.mjs` refuses a launched site that still
  ships the starter's `favicon.svg`, `favicon.ico` or share image. `apple-touch-icon.png`,
  `icon-192.png` and `icon-512.png` are not on that list.
- **Guard the fingerprints.** If the starter's own icons change and the hashes in
  `STARTER_ASSETS` do not, the check passes silently. Nothing catches that.
- **Keep the tamper test.** Every check in `verify-dist` was proven by breaking a build on
  purpose, forty ways, and confirming a `FAIL` each time. That harness ran from a temporary
  folder and is not in the repository. Port it if the checks keep changing.
- **A token layer.** Sixteen palette names such as `gray.900` are written into three files,
  and `panda.config.ts` extends no theme. Semantic tokens would let a site change its colors
  in one place.
- **Color scheme and user preferences.** The page is light only. Nothing handles
  `prefers-color-scheme`, `prefers-contrast` or `forced-colors`. `prefers-reduced-motion` has
  nothing to act on, because nothing animates. `npm run audit` already loads every page in
  dark mode, so it will test a dark scheme as soon as there is one.
- **A second site.** Build one from the starter by changing only data and settings. Until
  then, that claim is a design goal.
- **The AI-crawler list.** `src/pages/robots.txt.ts` names five agents as of 2026-11-25. The
  names were not checked against each vendor's documentation.
- **The sample data's punctuation.** `src/data/records.yml` has a straight apostrophe in prose
  ("this year's"). The legal pages use curly quotes.

## Check by hand

None of these has been run.

- WAVE and Accessibility Insights, on the preview.
- A screen reader on every page, and the whole site by keyboard alone.
- Real phones at 320 and 390 px wide: iOS Safari and Android Chrome. Only desktop Chrome 158
  has been used.
- Firefox and Safari.
- The W3C CSS validator. The Nu checker's CSS mode passed.
- The Rich Results Test and a share-card validator. Both need a launched site on a public URL.
- Non-text contrast, whenever colors change. No automated tool here measures it: borders and
  focus rings need 3:1 against what is behind them.

One note stands: the W3C checker prints an "info" on the home page, because React writes
`<input/>`.
