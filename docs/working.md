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

Later that day three checks were added: total CSS, the largest page and the host's file
limits. `npm run build` now prints eighteen `PASS` lines, and each new check printed `FAIL` on
a build tampered to break it.

`verify-live.sh` also gained three checks that day, from the archived Cloudflare and GitHub
guide before it was deleted (its other unique content moved into `docs/setup/`). In both
modes, HTML must say `max-age=0, must-revalidate` and a file under `/_astro/` must say
`immutable`: against the production `workers.dev` host the script printed 38 `PASS` lines.
In prod mode, the `workers.dev` host given as a fourth argument must no longer serve the
site. That line printed `FAIL` against a host still serving it, and has never run against a
domain.

The starter is on `main` of its public GitHub repository, behind a ruleset that requires a
pull request and blocks force pushes (`docs/setup/2-github.md`, part 4). It is deployed as a
Worker on a `workers.dev` hostname, unlaunched and `noindex`, and a merge to `main` builds
and deploys it. The live check passes on production and on a branch preview: 36 `PASS` lines
each (`docs/setup/3-cloudflare.md`).
No second site has been built from the starter.

## Get it online

The owner does these. A session can verify each one.

1. **Read `docs/archive/`.** The repository is public, so the archive was published with the
   first push. Decide whether all four files stay.
2. **Finish the repository settings** (`docs/setup/2-github.md`, part 3). Read back on
   2026-11-26: squash merging, rebase merging and wikis are on, and the step turns all three
   off. The Actions and Dependabot settings can't be read without Admin: confirm both on the
   settings page.
3. **Settle two small questions in step 3** (`docs/setup/3-cloudflare.md`). The step itself
   has been run end to end, a branch preview included.
   - whether Cloudflare's build status shows on pull requests with Actions disabled. It
     showed on 2026-11-26, with the Actions setting unconfirmed
   - whether the empty `previews` block in `wrangler.jsonc` is needed, or merely allowed
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
- **Stronger agent guards.** `docs/archive/workspace.md` proposes them, and none of its
  proposals is installed. One other guard is installed and tested: see `docs/stack-wiring.md`,
  "Working with an agent", which also says how to test a guard.
- **The manifest's `display` value.** It is `browser`. `standalone` would let a browser offer
  the site as an installable app.
- **The React island.** The home page ships 83.4 KB of gzipped JavaScript for a search box and
  three toggles, and about 67 KB of that is React. The assessment in `docs/archive/`
  recommends plain HTML and a small script for a control this simple. Measured with the
  token layer in place, gzipped at level 9 as `verify-dist` counts:

  | File | Gzipped | Raw |
  |---|---|---|
  | `client.*.js`: React DOM and Astro's island loader | 64.1 KB | 213 KB |
  | `react.*.js`: React | 3.2 KB | 8 KB |
  | `RecordBrowser.*.js`: the island, Base UI's Input and ToggleGroup, Panda's runtime | 16.1 KB | 46 KB |
  | All CSS | 6.8 KB | 24 KB |
  | `index.html`, with every record twice: as HTML and as the island's props | 4.3 KB | 13 KB |

  The token layer changed none of these by more than 0.1 KB: CSS went from 6.75 to 6.84 KB,
  the island from 16.12 to 16.13 KB.
- **The React Compiler.** The starter runs `react()` without it, and nothing records why. The
  assessment in `docs/archive/` says to keep it on. It is `react({ compiler: true })` in
  `astro.config.ts` plus `oxc-transform-react` as a dev dependency. Expect no saving in size:
  measure the JS budget before and after.
- **The archive's future.** If `docs/archive/` goes, eight lines outside this file point into
  it. Find them with `git grep -n 'docs/archive' -- . ':!docs/archive' ':!docs/working.md'`.
- **Whether the accessibility page is mandatory.** Today it is: the build fails without
  `/accessibility`, a launched build refuses its starter text, and `scripts/verify-live.sh`
  expects it to answer 200. Decide whether every site must publish one. This is for later:
  nothing waits on it. If the answer is no, the requirement comes out of
  `scripts/verify-dist.mjs`, `scripts/verify-live.sh`, `src/lib/pages.ts` and its test, and
  the README and setup steps that name three legal pages.
- **How a site takes later changes from the starter.** A site begins as a copy, and nothing
  carries a later fix in the starter down to it. Decide whether that stays a port by hand.
  The second site (below) is where it will first cost something.
- **Site settings in YAML.** The records are YAML; the site's settings are TypeScript, in
  `src/site.ts`. One proposal: `src/data/site.yml` becomes the single source, and
  `src/site.ts` shrinks to a loader that parses it, validates it with Zod from `astro/zod` and
  exports the same typed `site`, so none of its importers change. What it costs:
  - `yaml` becomes a direct dependency. Version 2.9.1 is already installed under Astro and
    Vite, so no new code arrives, but `AGENTS.md` requires the owner's approval.
  - `astro.config.ts` imports `src/site.ts`, so the loader has to run there too, before Vite.
  - `scripts/verify-dist.mjs` and `scripts/tamper-test.mjs` read settings out of `src/site.ts`
    with regular expressions. Both would read the YAML instead, in a change of their own.
  - The type and its comments in `src/site.ts` become a Zod schema and comments in the YAML.

  Whether the colors in `panda.config.ts` belong in the same file is part of the decision.

## Build next

- **Fingerprint all six assets.** `scripts/verify-dist.mjs` refuses a launched site that still
  ships the starter's `favicon.svg`, `favicon.ico` or share image. `apple-touch-icon.png`,
  `icon-192.png` and `icon-512.png` are not on that list.
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
