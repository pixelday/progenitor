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

The script is `astro check && vitest run && astro build && node scripts/verify-dist.mjs`.
Expect, in order:

```
- 0 errors                                  (astro check)
Tests  6 passed (6)                         (vitest)
[build] 10 page(s) built                    (astro build)
PASS  required files exist                  (verify-dist: eleven PASS lines)
...
verify-dist: 10 pages checked, all passed
```

What `scripts/verify-dist.mjs` refuses to pass:

| Check | Why it exists |
|---|---|
| A required file is missing (`index.html`, `404.html`, privacy, terms, `_headers`, `robots.txt`, `sitemap-index.xml`) | A missing `_headers` or 404 page fails silently on the host. |
| A page lacks the CSP `<meta>`, or an inline script or style has no hash in it | The browser would block it and the island would never respond. Nothing visible fails. |
| A `style=""` attribute or a `data:` URI in built HTML | The CSP blocks both. |
| A page has both `noindex` and a canonical, or neither; the 404 is not `noindex` | Indexability is one switch (`launched` in `src/site.ts`). |
| `robots.txt` contains `Disallow: /` | A blocked page can't show its `noindex`. |
| A launched site still says `example.com`, "Site name" or carries starter text | Stops a launch with placeholders. |
| A page other than the home page loads JavaScript, or total JS passes 90 KB gzipped | The budget was set from the first measurement, 83.4 KB. |
| An internal link, asset or `#fragment` points at nothing; a page link lacks its trailing slash | The host answers a slashless page path with a temporary redirect. |
| `localhost` or `TODO` in built HTML; `set:html` in `src/` | Residue, and data rendered as raw HTML. |

Each check was also tested the other way: a build tampered to break it prints `FAIL`.

## 4. Preview with the real headers

```bash
npm run preview    # wrangler dev: serves dist/ as Cloudflare will. No login needed.
```

It prints the address it serves on. With `B` set to that address, expect:

```bash
B=http://localhost:8787
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' $B/              # 200
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' $B/privacy/      # 200
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' $B/privacy       # 307 .../privacy/
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' $B/no-such-page  # 404
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
- Pick a category and reload: it is still picked. That choice is the only thing stored, under
  the localStorage key `site:v1`.

Run on 2026-11-25 in headless Chrome 158: the island hydrated with no CSP message. A control
with `script-src 'self'` added to the header in `public/_headers` did not hydrate and logged
two CSP messages, so a silent failure here is detectable.

Not run in a browser: the reload with a stored choice. The unit tests cover the store
(`src/lib/storage.test.ts`); the React hook that reads it (`src/lib/usePrefs.ts`) is checked
only by hand, with the third bullet above.

## 6. Make it this site's

| File | Change |
|---|---|
| `src/site.ts` | `name` and `description`. Leave `url` and `launched` for step 4. |
| `wrangler.jsonc` | `name`: the Worker's name. It appears in the public `workers.dev` hostname, so keep it neutral and treat it as permanent. `compatibility_date`: today. |
| `package.json` | `name`. |
| `src/data/records.yml`, `src/content.config.ts` | The site's own records and their schema. Change both together. |
| `src/pages/privacy.astro`, `src/pages/terms.astro` | Real text before launch. The build refuses to launch with the starter text. |
| `docs/project.md` | The profile and status. |

Then run `npm run build` again. It must end with `all passed`.

## How the pieces fit

- **Records to pages.** `src/content.config.ts` loads `src/data/records.yml` and validates it.
  `src/pages/index.astro` lists the records; `src/pages/records/[id].astro` makes one static
  page per record with no JavaScript.
- **Records to the island.** `src/lib/records.ts` slims each record to the fields the list
  needs before it becomes a prop. Props are written into the page's HTML, so never pass whole
  records.
- **The CSP has two halves.** `astro.config.ts` makes Astro write a `<meta>` policy with a hash
  for each inline script it emits. `public/_headers` carries what a `<meta>` cannot
  (`frame-ancestors`) plus `base-uri`, `form-action` and `object-src`. Never put
  `script-src`, `style-src` or `default-src` in `_headers`: the browser enforces both
  policies, so a strict header blocks what the `<meta>` allows.
- **Styling.** `docs/stack-wiring.md` covers Panda and Base UI.
