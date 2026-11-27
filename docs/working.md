# Working

Open items for developing the starter itself, as of 2026-11-26. A site built from the starter
can delete this file: its own backlog goes in `docs/index.md`.

Each item says what is open and what would settle it. When one is done, delete it here and
record the result where it belongs: the step in `docs/setup/`, or "What has been proven" in
`README.md`.

## Where things stand

From a fresh clone, on Node 24.22.3, all of this ran on 2026-11-26:

- `npm ci`, then `npm run build`: every line `PASS`.
- `npm run preview`, then `npm run audit`: every line `PASS`.
- `npx wrangler deploy --dry-run` accepts `wrangler.jsonc`. It uploads nothing.

The development machine now has Node 24.22.3: `npm ci` and `npm run build` passed there in
the same way.

Later that day three checks were added: total CSS, the largest page and the host's file
limits. Each printed `FAIL` on a build tampered to break it.

`verify-live.sh` also gained three checks that day, from the archived Cloudflare and GitHub
guide before it was deleted (its other unique content moved into `docs/setup/`). In both
modes, HTML must say `max-age=0, must-revalidate` and a file under `/_astro/` must say
`immutable`: against the production `workers.dev` host the script printed only `PASS`.
In prod mode, the `workers.dev` host given as a fourth argument must no longer serve the
site. That line printed `FAIL` against a host still serving it, and has never run against a
domain.

The starter is on `main` of its public GitHub repository, behind a ruleset that requires a
pull request and blocks force pushes (`docs/setup/2-github.md`, part 4). It is deployed as a
Worker on a `workers.dev` hostname, unlaunched and `noindex`, and a merge to `main` builds
and deploys it. The live check passes on production and on a branch preview
(`docs/setup/3-cloudflare.md`).
No second site has been built from the starter.

## Get it online

The owner does these. A session can verify each one.

1. **Read `docs/archive/`.** The repository is public, so everything in the archive is
   published. Decide whether each file stays: `docs/archive/index.md` lists them.
2. **Confirm two repository settings** (`docs/setup/2-github.md`, part 3). The Actions and
   Dependabot settings can't be read without Admin: confirm both on the settings page. The
   settings the API does show were read back on 2026-11-26 and match the step, except that
   this repository is public.
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
- **Three departures from `docs/architecture.md` that it does not list.** Section 4 of that
  file names three places where this iteration differs from the design. These are three
  more. For each, either change the starter or add it to that list.
  - *One launch switch.* Section 8 asks for separate exposure switches, so that a deploy can
    stay out of search results and still show its share card and structured data for
    testing. The starter has one, `launched` in `src/site.ts`. The share card and the
    structured data need the site's address, so both wait for launch, and neither can be
    checked on a deployed host before it ("Check by hand", below).
  - *One settings file.* Section 7 splits settings by who may change them: the operator,
    anyone through review, and the site's owner. `src/site.ts` holds all three kinds, and so
    would the `site.yml` proposed below. A boundary is cheapest to add before a second site
    exists.
  - *Unequal agent guards.* Section 1 says no agent tool works to a weaker set of rules.
    `AGENTS.md` is shared, but only Claude Code has a mechanical guard: two `git push` deny
    rules in `.claude/settings.json`. `.codex/config.toml` gives the shell network access
    and has no rule, and `.gemini/settings.json` only points at `AGENTS.md`. "Stronger agent
    guards", above, is where this gets settled.
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
- **The archive's future.** If `docs/archive/` goes, lines outside this file still point into
  it. Find them with `git grep -n 'docs/archive' -- . ':!docs/archive' ':!docs/working.md'`.
- **Whether the accessibility page is mandatory.** Today it is: the build fails without
  `/accessibility`, a launched build refuses its starter text, and `scripts/verify-live.sh`
  expects it to answer 200. Decide whether every site must publish one. This is for later:
  nothing waits on it. If the answer is no, the requirement comes out of
  `scripts/verify-dist.mjs`, `scripts/verify-live.sh`, `src/lib/pages.ts` and its test, and
  the README and setup steps that name three legal pages.
- **How a site is derived from the starter, and how it takes later changes.** These are one
  decision: how a site begins decides whether a later fix can reach it. Neither is written
  down. The starter's repository is public and is not a GitHub template.
  `docs/setup/2-github.md`, part 2, assumes a folder with no history. On a clone its
  `git init` changes nothing, `git remote add origin` fails because `origin` exists, and the
  identity check lists the starter's own authors. And nothing carries a later fix in the
  starter down to a site.

  A suggestion, not decided (2026-11-26): derive by clone and keep the history.
  1. Clone the starter and run `git remote rename origin upstream`.
  2. Create the site's own empty private repository and add it as `origin`.
  3. Set the commit identity, then change only the site's own files, on a branch.
  4. Later, `git fetch upstream` and merge `upstream/main` into a branch. It is reviewed on
     a preview like any other change.

  What it gives:
  - The site and the starter share an ancestor, so a fix arrives as an ordinary merge, with
    no tool and no dependency. `upstream` is a line in one clone's config, and the site
    builds without it.
  - "Changed only data and settings" becomes a command: `git diff --stat upstream/main...HEAD`
    should name the site's own files and nothing else.
  - The identity check narrows to the site's own commits: `git log upstream/main..HEAD`.

  What it costs:
  - The starter's history travels into the site's repository.
  - A merge conflicts wherever a site has edited a file the starter also changes, and today
    a site must edit some. `scripts/verify-dist.mjs` holds the JS budget and the list of
    pages that may load JavaScript, step 4 tells a site with mail to delete lines from
    `scripts/verify-live.sh`, and the legal text is in page files. So the files a site owns
    have to be separated from the rest first.

  Run on a throwaway on 2026-11-26 (LOCAL): the rename, both commands above, a clean merge
  of a starter change to a file the site had not touched, and a conflict when both sides had
  changed the budget line in `scripts/verify-dist.mjs`. Not run: a push to a private
  repository, or a Cloudflare build of the result.

  The alternative is a GitHub template repository: one click and a fresh history, with every
  later fix a port by hand. To settle it, try both when the second site is built (below),
  then write the result as the first part of step 2.
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
