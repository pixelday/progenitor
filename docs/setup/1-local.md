# Step 1. Build and preview locally

Everything here is **LOCAL**: run on 2026-11-25 on macOS with Node 24.22.3 and npm 11.19.1.
A session can do the whole step. Nothing in it needs the network except `npm ci`.

## 1. Check Node

```bash
node -v    # expect v24.22.3, the version in .nvmrc
```

Any version manager that reads `.nvmrc` works (`nvm use`, `fnm use`). Astro 7.4 needs Node
22.23.4 or later; the starter pins 24. On an older Node the next command stops with:

```
npm ERR! code EBADENGINE
npm ERR! notsup Required: {"node":">=24.22.3"}
```

## 2. Install

```bash
npm ci
```

- It installs exactly what `package-lock.json` names, then runs the `prepare` script
  (`panda codegen`), which writes `styled-system/`. That folder is generated and gitignored.
- Until this has run, an editor shows errors that are not real: `File
  'astro/tsconfigs/strict' not found` in `tsconfig.json`, and every `styled-system/...` import
  unresolved. Both files come from the install.
- npm prints a warning that lists four dependencies with install scripts (`esbuild`,
  `workerd`, `@parcel/watcher`, `fsevents`) and how to approve them. Leave it: the build and
  the preview both work without approving any.

## 3. Build

```bash
npm run build
```

The script is `astro check && vitest run --dir src && astro build && html-validate dist &&
node scripts/verify-dist.mjs`. Expect, in order:

```
- 0 errors                                  (astro check)
Tests  12 passed (12)                       (vitest)
[build] 12 page(s) built                    (astro build)
                                            (html-validate prints nothing when it passes)
PASS  required files exist                  (verify-dist: nineteen PASS lines)
...
verify-dist: 12 pages checked, all passed
```

`astro build` notes that `/sitemap.xml` and `/llms.txt` were not created. That is the launch
switch at work: they exist only on a launched site.

What `scripts/verify-dist.mjs` refuses to pass:

| Check | Why it exists |
|---|---|
| A required file is missing: a page (home, 404, privacy policy, terms, accessibility, sitemap), `_headers`, `robots.txt`, the manifest, an icon or the share card | A missing `_headers` or 404 page fails silently on the host. |
| A page lacks the CSP `<meta>`, or an inline script, style or structured-data block has no hash in it | The browser would block it and the island would never respond. Nothing visible fails. |
| A `style=""` attribute or a `data:` URI in built HTML; a `<style>` in `<body>` | The CSP blocks the first two. The third is invalid HTML. |
| A page lacks `lang`, a zoomable viewport, a description, a theme color (one, or one each for light and dark), the icon or manifest links, or exactly one `<h1>`; two pages share a title | The floor every page stands on. |
| `favicon.ico` is not an ICO or holds no 32x32 image, an icon or the share image has the wrong pixel size, or the manifest is not valid JSON | A PNG renamed to `.ico` works only because browsers sniff it. |
| A page has both `noindex` and a canonical, or neither; the 404 is not `noindex` | Indexability is one switch (`launched` in `src/site.ts`). |
| The launch switch is half applied: a canonical without a share card, a `sitemap.xml` that does not list exactly the indexable pages, a `Sitemap:` line or an `llms.txt` before launch, an `llms.txt` that contradicts `robots.txt` | One switch, every consumer, or the build fails. |
| A page is built that the sitemap page does not list | Every page enters the registry (`src/lib/pages.ts`) that `sitemap.xml` and `llms.txt` read. |
| `robots.txt` blocks every crawler | A blocked page can't show its `noindex`. |
| A launched site still says `example.com` or "Site name", carries starter text, or ships the starter's icons, share image or share image alt text | Stops a launch with placeholders. |
| A page other than the home page loads JavaScript, apart from the theme script (`src/scripts/theme.js`, matched exactly), or total JS passes 90 KB gzipped | The budget was set from the first measurement, 83.4 KB. |
| Total CSS passes 15 KB gzipped, or any one page passes 50 KB | The home page holds every record twice, as HTML and as the island's props, so it grows fastest with the data. |
| More than 20,000 files, or one over 25 MiB | Cloudflare's limits for static assets on the free plan. A build past either passes here and fails at the deploy. |
| An internal link, asset or `#fragment` points at nothing; a page link ends in a slash or `.html` | The host serves `terms.html` at `/terms` and answers `/terms/` and `/terms.html` with a temporary redirect. Only a folder's `index.html`, such as the home page, is served with a trailing slash. |
| `localhost` or `TODO` in built HTML; `set:html` in `src/` outside `src/components/JsonLd.astro` and `src/components/ThemeScript.astro` | Residue, and data rendered as raw HTML. |
| The island's props, written into the home page, leave out a record that has a page, name one that has none, or carry a field that `RecordSummary` in `src/lib/records.ts` does not list | Props are public in the page source. Only what the list needs goes there, and it must match the pages. |

`npm run tamper` tests each check the other way. It needs no build first and leaves `dist/`
alone: it builds two copies of the site in a temporary folder, one as it stands and one
launched with test values, then breaks a copy of one of them for each case and runs
`verify-dist` there. A case passes when exactly the checks it should trip print `FAIL`.
Expect two controls, one coverage line and a `PASS` line for each case, ending with
`tamper-test: 87 breaks, every one caught`.

- A check added to `verify-dist` without a case fails the run, and so does a check that stops
  catching its case. A change to `verify-dist` therefore comes with its case.
- If the starter's `favicon.svg`, `favicon.ico` or share image changes while its fingerprint
  in `STARTER_ASSETS` does not, the run fails and says so. A site that has replaced its name
  and icons skips those three cases instead, since it no longer has the starter's files.

`html-validate` runs before it, with the rules in `.htmlvalidate.mjs`. One rule is off, and
the file says why.

## 4. Preview with the real headers

```bash
npm run preview    # wrangler dev: serves dist/ as Cloudflare will. No login needed.
```

It prints the address it serves on. With `B` set to that address, expect:

```bash
B=http://localhost:8787
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' $B/              # 200
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' $B/terms         # 200
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' $B/terms/        # 307 .../terms
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' $B/no-such-page  # 404
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' $B/sitemap.xml   # 404 until launch
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' $B/favicon.ico   # 200 image/vnd.microsoft.icon
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' $B/_headers      # 404: read, not served
curl -sI $B/ | grep -iE 'content-security|strict-transport|x-content-type|referrer|x-frame|permissions'
```

- The last command prints six headers. The same six arrive on the 404 response.
- The 404 body is the site's own page (`<title>Page not found ...`), not an empty response.
- Files under `/_astro/` answer `Cache-Control: public, max-age=31536000, immutable`. HTML
  answers `public, max-age=0, must-revalidate`.

`npm run dev` is not a substitute. The dev server sends none of these headers, puts no CSP
in the page and serves `/_headers` as a plain file.

## 5. Check the island in a browser

Open the preview address with the browser console open.

- The category buttons and the search box filter the list. "Reset filters" clears them.
- The console shows no Content Security Policy message.
- Pick a category and reload: it is still picked. It is stored under the localStorage key
  `site:v1`.
- Pick Dark, or Light, under Theme in the header, then open another page: the choice holds,
  stored under `site:theme`. Picking System removes the key. These two keys are the only
  things the site stores.

Run on 2026-11-25 in headless Chrome 158: the island hydrated with no CSP message. A control
with `script-src 'self'` added to the header in `public/_headers` did not hydrate and logged
two CSP messages, so a silent failure here is detectable.

`npm run audit` does all of this in Chrome, with the preview running in another terminal. It
takes about two minutes. Expect 28 `PASS` lines:

- axe, the console and sideways scrolling on every page in ten color modes: the system's light
  and dark at 1280 and 320 px, Dark chosen on a light system and Light on a dark one, more
  contrast in light and dark, and forced colors in light and dark
- the island: it hydrates, filters, announces the count, stores the choice, keeps it across a
  reload and resets
- the Theme select: System by default, a choice that overrides the system and holds across a
  reload and another page, and System again to clear it
- a pressed toggle visibly changes in every color mode, forced colors included
- with reduced motion nothing animates or transitions; print is light and leaves out the
  controls
- with storage blocked the filters and the Theme select still work; with JavaScript off every
  record is a link and the Theme select is hidden

Each of the newer checks was shown to fail on a build broken for it: the forced-colors fix
removed, a transition added, the print rule removed, the theme script ignoring the stored
choice, and the select shown without JavaScript.

## 5a. The other audits

Run these by hand before launch and after any change to the layout. None is a dependency.

| Tool | Command or place | Expect |
|---|---|---|
| W3C Nu HTML checker | `java -jar vnu.jar --format gnu http://localhost:8787/ ...` with `-Dnu.validator.servlet.allow-forbidden-hosts=true`, or validator.w3.org once deployed | No errors, no warnings. One "info" about a trailing slash on the home page: React writes `<input/>`. Check a served URL, not a file: from disk the checker cannot resolve `'self'` and reports the stylesheet as blocked. |
| Lighthouse | `npx lighthouse http://localhost:8787/ --preset=desktop`, and again without the preset for mobile | 100 in all four categories on a launched build. Before launch SEO reads 63, because every page says `noindex`. Say which mode in any figure you quote. |
| WAVE, Accessibility Insights | browser extensions, on the preview | No errors. |
| Rich Results Test, a share-card validator | on the live domain, after launch | The `WebSite` block and the card are read. |
| A screen reader, a keyboard, 200% zoom, real phones | by hand | `docs/setup/4-launch.md`, part 2. |

## 6. Make it this site's

| File | Change |
|---|---|
| `src/site.ts` | `name`, `shortName`, `description`, `lang`, `themeColor` (light and dark, each equal to the `bg` token), the share image's `alt`, `contact`, `aiCrawlers`. Leave `url` and `launched` for step 4. |
| `panda.config.ts` | The colors, under `semanticTokens`: each is a light and a dark value. The build fails if a pair loses contrast. |
| `public/` | The site's own icons and share image, under the same names: `favicon.ico` (holding a 32x32 image), `favicon.svg`, `apple-touch-icon.png` (180x180), `icon-192.png`, `icon-512.png` and `social.png` (1200x630). Any favicon generator makes the set. The build checks each file's type and size. |
| `src/lib/pages.ts` | The fixed pages' titles and descriptions. |
| `wrangler.jsonc` | `name`: the Worker's name. It appears in the public `workers.dev` hostname, so keep it neutral and treat it as permanent. `compatibility_date`: today. |
| `package.json` | `name`. |
| `src/data/records.yml`, `src/content.config.ts` | The site's own records and their schema. Change both together. |
| `src/pages/privacy-policy.astro`, `src/pages/terms.astro`, `src/pages/accessibility.astro` | Real text before launch, and `legalUpdated` in `src/site.ts`. The build refuses to launch with the starter text. |
| `docs/index.md` | The profile and status. |

Then run `npm run build` again. It must end with `all passed`.

## How the pieces fit

- **One YAML file, two outputs.** `src/data/records.yml` is the only place a record's facts
  are written. The build turns it into HTML, and into a JavaScript object for the island.
  - *Records to pages.* `src/content.config.ts` loads the file and validates it: a bad record
    fails the build and names the entry. `src/pages/index.astro` lists the records, and
    `src/pages/records/[id].astro` makes one static page per record with no island.
  - *Records to the island.* `src/lib/records.ts` slims each record to `RecordSummary`, the
    fields the list and its filters read. Astro writes the island's props into the home
    page's HTML, where anyone can read them, so never pass whole records. `verify-dist` fails
    the build if the props carry a field `RecordSummary` does not list, or do not hold exactly
    the records that have pages.
- **Records checked as they are typed.** The first line of `src/data/records.yml` points an
  editor's YAML extension at the schema the build writes, `.astro/collections/records.schema.json`.
  VS Code's YAML extension (Red Hat) then marks a missing field or an `http:` source as it is
  typed. Until the first `npm run build`, or `npx astro sync`, writes that file, the extension
  says it cannot load the schema. (LOCAL: run through the extension's language server,
  `yaml-language-server` 1.23.0, not through the editor itself.)
- **One identity, one registry.** `src/site.ts` feeds the `<head>`, the share card, the
  structured data, the manifest, `robots.txt`, `sitemap.xml` and `llms.txt`.
  `src/lib/pages.ts` lists the fixed pages, and `src/lib/site-map.ts` adds the records. The
  sitemap page, `sitemap.xml` and `llms.txt` all read that one list.
- **The CSP has two halves.** `astro.config.ts` makes Astro write a `<meta>` policy with a hash
  for each inline script it emits. `public/_headers` carries what a `<meta>` cannot
  (`frame-ancestors`) plus `base-uri`, `form-action` and `object-src`. Never put
  `script-src`, `style-src` or `default-src` in `_headers`: the browser enforces both
  policies, so a strict header blocks what the `<meta>` allows.
- **Styling.** `docs/stack-wiring.md` covers Panda and Base UI.
