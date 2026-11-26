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
- **Content collections:** the config is `src/content.config.ts`, loaders come from
  `astro/loaders`, `z` comes from `astro/zod`, and every collection needs a loader. (LOCAL)
- **`astro:content` cannot be imported in client code.** `import type` is fine, which is how
  `src/lib/records.ts` is shared with the island. (LOCAL)

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
- **`strictTokens`** catches token typos but also rejects plain values such as `'2px solid'`.
  Leave it off until there is a real token set. (RESEARCH)

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

Measured from `dist/_astro` on 2026-11-25, gzipped (LOCAL):

| File | Size |
|---|---|
| React runtime (`client.*.js` and `react.*.js`) | 67.3 KB |
| The island with Base UI Input and ToggleGroup | 16.1 KB |
| All CSS | 6.6 KB |

Only the home page loads any of the JavaScript. A page with no island ships none.

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
