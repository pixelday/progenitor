# How Astro, React, Panda and Base UI are wired together

What the starter's config does and the traps around it. **LOCAL** means it runs in this
starter as of 2026-11-25 (Astro 7.4.13, React 19.3.1, Panda CSS 2.6.0, Base UI 1.9.0,
TypeScript 6.0.3). **RESEARCH** means it comes from the November 2026 research runs that this
file replaces, and has not been run here.

Model memory is unreliable for this stack: Panda 2 and Base UI 1 are both recent. Check the
installed package or the current docs before trusting a remembered API.

## Astro

- **Static output, no adapter.** `output: 'static'` is the default. `@astrojs/cloudflare` is
  only for on-demand rendering; do not add it. (LOCAL)
- **The config is `astro.config.ts`** so it can import `src/site.ts`. (LOCAL)
- **TypeScript 6, not 7.** `@astrojs/check` 0.9.12 declares `typescript` `^5 || ^6`, and
  TypeScript's latest is 7. `package.json` pins 6.0.3. `astro build` does not type-check, which
  is why `npm run build` runs `astro check` first. (LOCAL)
- **`build.inlineStylesheets: 'never'` and `vite.build.assetsInlineLimit: 0`.** Astro and Vite
  otherwise inline small stylesheets and assets, which the CSP would have to hash or would
  block. (LOCAL)
- **`markdown.syntaxHighlight: false`.** With the CSP on, Astro warns on every build that its
  default highlighter writes inline styles. The starter has no Markdown. Use Prism if that
  changes. (LOCAL)
- **The type check and the tests cover `src/` and the root config files, nothing else.**
  `tsconfig.json` includes `src` and `*.ts`, and the test script is `vitest run --dir src`.
  With Astro's default `**/*`, and Vitest's default of the whole folder, any other folder
  sitting in the repo is checked too, ignored by git or not: a local scratch folder with a
  copied example project failed the build that way. (LOCAL)
- **Content collections:** the config is `src/content.config.ts`, loaders come from
  `astro/loaders`, `z` comes from `astro/zod`, and every collection needs a loader. (LOCAL)
- **`astro:content` cannot be imported in client code.** `import type` is fine, which is how
  `src/lib/records.ts` is shared with the island. `src/lib/site-map.ts` reads the collection,
  so no island may import it. (LOCAL)
- **An endpoint that returns an empty response writes no file.** `src/pages/sitemap.xml.ts`
  and `src/pages/llms.txt.ts` return status 204 with no body before launch, and `astro build`
  then creates neither. A 4xx status does the same but logs a warning on every build. (LOCAL)
- **`sitemap.xml` is an endpoint, not `@astrojs/sitemap`.** The integration always writes
  `sitemap-index.xml` plus `sitemap-0.xml`; it has no single-file mode. The endpoint reads the
  page registry, adds `<lastmod>`, and `verify-dist` checks it against the built pages. (LOCAL)
- **Astro does not evaluate `{expressions}` inside `<script>`.** Structured data therefore
  needs `set:html`, in `src/components/JsonLd.astro`, which escapes `<`. The theme script
  needs it too, in `src/components/ThemeScript.astro`, which inlines a source file. Those two
  files are the only ones `verify-dist` allows to use it. (LOCAL)

## Panda CSS

- **It runs as a Vite plugin:** `pandacss()` from `@pandacss/vite` in `vite.plugins`. Not
  PostCSS and not `@pandacss/astro`. (LOCAL)
- **`panda init` leaves `.astro` out of `include`.** Without it, `css()` calls in `.astro` files
  produce no CSS and nothing warns. `panda.config.ts` lists it. (LOCAL)
- **Keep both presets** (`@pandacss/preset-base`, `@pandacss/preset-panda`). Without them there
  are no utilities, tokens or conditions. (LOCAL)
- **`styled-system/` is generated and gitignored.** The `prepare` script (`panda codegen`)
  writes it after every install, locally and in Cloudflare's build. Import from it as
  `styled-system/css`; `tsconfig.json` maps the path. (LOCAL)
- **`src/styles/global.css` holds one line**, the cascade-layer order. The plugin injects the
  generated CSS. Import the file once, in the layout. (LOCAL)
- **In `.astro` files `css()` runs at build time and ships no JavaScript.** In an island it
  ships Panda's small runtime. `pandacss({ transform: true })` rewrites static calls into
  class strings instead; it is young and not enabled here. Measure the island's size with and
  without it before adopting it. (RESEARCH)
- **`css()` sees only values written in the file.** Panda reads the source at build time. A
  literal, or a choice between literals (`open ? '0' : '2'`), produces CSS. A value known only
  when the code runs, such as a prop in `css({ width: size })`, produces none: the build prints
  a `panda_call_unextractable` warning and passes. Write each value as a literal and choose
  between them with a `cva` variant or a condition on a `data-*` attribute. Panda's usual
  answer, a CSS variable set with `style={{ '--size': size }}`, puts a `style=""` attribute in
  the built HTML, which the CSP rules out (below). (LOCAL)
- **Colors are semantic tokens.** `panda.config.ts` names each color by its role (`fg`,
  `fg.muted`, `bg.subtle`, `border.control`, `focusRing`) under `semanticTokens`, pointing at
  the preset's palette. A `DEFAULT` key makes the bare name a token too: `fg` beside
  `fg.muted`. Each becomes a CSS variable and `css({ color: 'fg.muted' })` uses it. (LOCAL)
- **Light and dark come from one value per token.** Each token is `light-dark(<light>,
  <dark>)`, and Panda resolves the references inside it: `--colors-fg-muted:
  light-dark(var(--colors-gray-600), var(--colors-gray-400))`. The CSS `color-scheme` property
  picks the half. `html { color-scheme: light dark }` follows the operating system, so the
  dark values need no condition and no second selector. `<meta name="color-scheme">` says the
  same before the CSS loads. `light-dark()` needs Chrome 123, Firefox 120 or Safari 17.5. (LOCAL
  in Chrome 158; the versions are DOCS)
- **`src/lib/contrast.test.ts` checks every token pair** in light and dark, with and without
  more contrast: text at 7:1, control edges, the focus ring and the pressed state at 3:1. It
  converts the palette's OKLCH values to sRGB itself; on every color the tokens use it agreed
  with Chrome's canvas to within 1/255. It also checks `themeColor` in `src/site.ts` against
  `bg`. (LOCAL)
- **`strictTokens` would not keep palette colors out of components**, because palette colors
  are tokens too. `src/lib/tokens.test.ts` does that, and fails the build on a quoted palette
  name in `src/`. `strictTokens` would also reject plain values such as `'2px solid'`, so it
  stays off. (LOCAL for the test; RESEARCH for `strictTokens`)

## Base UI

- **The package is `@base-ui/react`.** `@base-ui-components/react` is its old name and
  `@mui/base` is a different, older library. (LOCAL)
- **Global CSS it needs:** `.root { isolation: isolate }` around the page, so popups portal
  above it, and `body { position: relative }` for iOS Safari. Both are in `panda.config.ts`
  under `globalCss`, and `src/layouts/Base.astro` has the `.root` wrapper. (LOCAL)
- **State styling uses Panda conditions.** Base UI sets attributes such as `data-pressed`,
  and Panda's `_pressed` matches it. The same holds for `_open`, `_checked`, `_disabled` and
  `_highlighted`. (LOCAL for `_pressed`; RESEARCH for the rest)
- **Do not name a custom condition `starting`.** Panda's built-in `_starting` already means
  CSS `@starting-style`. For Base UI's `data-starting-style` and `data-ending-style`, add
  conditions named `startingStyle` and `endingStyle`. (RESEARCH)
- **Build each Base UI component inside one `.tsx` file.** Each island is its own React tree,
  so the parts of a compound component (`Root`, `Trigger`, `Popup`) cannot share context
  across `.astro` tags. Pass only serializable props across the Astro boundary. (RESEARCH;
  the starter's one island follows it)
- **Multi-part components:** define one slot recipe with `sva` and bind it with
  `createSlotRecipeContext`, which needs `jsxFramework: 'react'` in `panda.config.ts`. Use
  `withRootProvider` when the Base UI `Root` renders no element (Popover, Dialog, Menu,
  Tooltip), `withProvider` when it does (Switch, Accordion, Tabs), and `withContext` for
  every styled part. (RESEARCH. The starter has no multi-part component and does not set
  `jsxFramework`.)

## The Content Security Policy

- **Astro owns scripts and styles.** `security.csp` in `astro.config.ts` writes a `<meta>`
  policy into every page, with a hash for each inline block Astro emits. An island page gets
  seven script hashes and one style hash. (LOCAL)
- **Astro writes a `<style>` into `<body>` beside the first island**, which the W3C checker
  rejects with two errors. Astro has no option for it. `astro.config.ts` removes the element
  after the build and `panda.config.ts` carries the same rule. `verify-dist` fails if a
  `<style>` is ever left in a `<body>`, which is also how a change in Astro's markup would
  show. (LOCAL)
- **A structured-data block gets a hash too.** Browsers do not apply `script-src` to a data
  block, but the W3C checker warns about one. `JsonLd.astro` adds the block's hash with
  `Astro.csp.insertScriptHash`. (LOCAL)
- **`public/_headers` carries only what a `<meta>` cannot**, plus `base-uri`, `form-action` and
  `object-src`. A `script-src` in the header blocks the island even though the `<meta>` allows
  it, because the browser enforces both. (LOCAL: tested in Chrome 158 both ways)
- **Wrap each island in Base UI's `CSPProvider` with `disableStyleElements`.** Some Base UI
  components inject `<style>` elements, and a static site has no nonce to give them. The
  scrollbar rule Base UI would have injected is in `panda.config.ts`. The starter's Input and
  ToggleGroup need neither; the wrapper is there for the next component. (LOCAL that it
  builds and hydrates; RESEARCH for which components inject)
- **No `style` props in markup that renders at build time.** A hash covers a `<style>` block,
  not a `style=""` attribute, and `verify-dist` fails the build on one. Styles set from
  JavaScript after hydration are not affected. If one can't be avoided, the narrow exception
  is `style-src-attr 'unsafe-inline'`, as a resource with `kind: 'attribute'` under
  `security.csp.styleDirective`, and only with the owner's go. (RESEARCH for the exception)
- **Astro's CSP does not support `<ClientRouter />` view transitions.** (RESEARCH)

## Size

Measured from `dist/_astro` on 2026-11-26, gzipped at level 9 as `verify-dist` counts (LOCAL):

| File | Size |
|---|---|
| React runtime (`client.*.js` and `react.*.js`) | 67.3 KB |
| The island with Base UI Input and ToggleGroup | 16.1 KB |
| All CSS | 6.8 KB |

Only the home page loads any of these files. Every page also carries the theme script,
`src/scripts/theme.js`, inline in its `<head>`: 1.5 KB, 0.7 KB gzipped, counted in each page's
size and not in the JS budget. It sets `data-theme` on `<html>` before the page paints and
wires up the Theme select in the header. Without JavaScript the select stays hidden and the
page follows the system.

- Hydrate with `client:visible` by default, `client:idle` above the fold when it is not
  needed in the first second, and `client:load` only when it is used at once. The starter's
  island is the page's main control, so it uses `client:load`. (RESEARCH)
- Prefer a native element (`<details>`, `<dialog>`, a radio group) where it supplies the
  semantics. Base UI earns its weight where hand-rolled ARIA is risky: comboboxes, menus with
  typeahead, toasts. (RESEARCH)

## Working with an agent

Astro publishes a documentation server for agent tools at `https://mcp.docs.astro.build/mcp`.
Connecting it gives a session current Astro APIs. (RESEARCH; not connected here. A sandboxed
session needs that host allowed.)

- **A folder's own instruction files load mid-session.** In Claude Code, a folder's
  `CLAUDE.md`, `.claude/rules/` and `.claude/skills/` load the first time a session reads a
  file in that folder. `claudeMdExcludes` in `.claude/settings.json` keeps the instruction
  files and rules under `untracked/` and `node_modules/` from loading. It does not reach
  skills, but Claude Code skips a skills folder that `.gitignore` covers, and both trees are
  gitignored. (LOCAL with Claude Code 2.1.332, for `untracked/`. `node_modules/` uses the same
  pattern and was not tested separately. That a `cat` counts as a read is RESEARCH.)
- **Project settings come from the folder a session starts in.** Start sessions at the repo
  root, or `.claude/settings.json` is not read. (RESEARCH)
- **No approval prompt guards `untracked/`** (the owner's decision, 2026-11-26). Nothing reads
  it in the background: searches skip gitignored paths, its instruction files are excluded,
  and `AGENTS.md` keeps sessions out. If a prompt is ever wanted, an `ask` permission rule
  prompts in every mode, bypass included. But `cat`, `ls`, `find` and `grep` run without a
  prompt in every mode, so only a `PreToolUse` hook could gate the shell. The
  `InstructionsLoaded` hook can only observe a file that has already loaded. (RESEARCH)
- **To test a guard**, run a headless `claude -p` session with an `InstructionsLoaded` hook
  that appends each event to a log, plus `--debug-file`. Put the test folder inside the repo
  and delete it afterwards: Claude Code ignores instruction files and skills inside a
  session's scratchpad. Started from inside another session, `claude` inherits that session's
  `CLAUDE_CODE_*` variables, a messaging token among them, so unset them first. (LOCAL)
