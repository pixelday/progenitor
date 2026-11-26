# Static Astro 7 + React Islands on Cloudflare Workers Static Assets: Performance, Security and Maintainability Assessment (as of 2026-11-25)

> **Status: research record, 2026-11-25. Not instructions.** Where it conflicts with `README.md` or `docs/setup/`, those govern; then `docs/archive/technical-brief.md`. Its measurements came from a test project (300 records, a browse/filter page), not from a live site. Reconciled 2026-11-25; the brief now carries each outcome:
> - **Adopted:**
>   - Astro's `security.csp` as the CSP owner from the first build (sites on this stack have React islands), with the header cut to `frame-ancestors`, `base-uri`, `form-action` and `object-src` (brief §4.6, §7.6)
>   - Base UI's `CSPProvider` with `disableStyleElements`, and no Base UI inline scripts (§4.6)
>   - the island rules: `client:visible` by default, one island per page region, native elements first (§9)
>   - Panda's `transform: true`, measured in the island (§1)
>   - Node 24 (§4.1)
>   - `preview_urls: false`; PR Previews don't use Version URLs (§6.5)
>   - no `Cache-Control` in a `/*` rule (§7.6)
>   - `engine-strict` and `save-exact` (§6.3)
>   - the Fonts API as the likely font mechanism (§7.8)
>   - scheme-checked data URLs, no `set:html`, and a test that island props don't grow (§1's data contract, §10)
> - **Adopted for after launch:** npm 12 strict install scripts, the release-age cooldown, Renovate, Lighthouse CI, COOP and CORP (brief §4.2, §13).
> - **Not adopted** (notes below): the platform-first default (the starter's stack is React + Base UI, decided 2026-11-25); no non-production branch builds; `img-src data:`; a single-placeholder `workers.dev` rule; GitHub Actions as the gate.
> - Its npm 12, Panda and Base UI facts weren't re-checked at their sources. The Node, npm and TypeScript versions were, on 2026-11-25 (brief §4.1, §4.2, §4.15).

The single highest-impact change for this stack is to stop using React for simple widgets: rebuild small controls like the browse/filter island as progressively enhanced HTML with a few kilobytes of plain Astro `<script>`, keep React + Base UI only for complex widgets, and lock the platform down with a `_headers` file, Astro's stable hash-based CSP, npm 12's script blocking and a cooldown-based Renovate policy. Everything below is split into **sourced facts** (with version/date) and **assessment** (my judgment). Items that are experimental, beta, under 12 months old in a way that matters, or backed by sources older than ~12 months are flagged inline.

## TL;DR

- **Payload:** React 19 + Base UI has a fixed floor of roughly 67 KB gzipped per page before any widget code (your own measurement). The only ways to get meaningfully smaller are (a) no framework (platform features + a small Astro `<script>`; a projected low-single-digit KB for a filter UI) or (b) preact/compat (~11 KB runtime in your test, but Base UI under compat has only community-level evidence). Make (a) the default and keep React islands as the escape hatch for widgets that need Base UI's focus/ARIA machinery.
- **Security/performance baseline:** Workers Static Assets honors a `_headers` file (up to 100 rules) and defaults every asset to `Cache-Control: public, max-age=0, must-revalidate`, so you must add `immutable` caching for `/_astro/*` yourself. Astro's `security.csp` (stable since Astro 6.0, `kind` scoping since 7.1) emits only a `<meta>` CSP on a static build. Put `frame-ancestors` and friends in a header CSP alongside it, and disable `workers.dev`/preview URLs explicitly.
- **Churn:** Run Renovate with a 3–7 day `minimumReleaseAge`, grouped monorepo updates, weekly schedule and patch automerge gated on CI. Use npm 12 (install scripts off by default since July 8, 2026) with `strict-allow-scripts` in CI. Move builds to Node 24 before Node 22's end of life on April 30, 2027. Panda (2.0 rewrite shipped Sept 29, 2026) and Base UI (1.0 Dec 2025) are the youngest pieces and the ones to keep easiest to swap.

## Executive summary: top 10 recommendations

Ranked by impact ÷ (effort + ongoing maintenance). "Impact" covers performance, security and churn together.

| # | Recommendation | Impact | Effort | Ongoing cost |
|---|---|---|---|---|
| 1 | Default to zero-framework widgets (native form controls, `<details>`, `<dialog>`, Popover API, `:has()`, anchor positioning) + small Astro `<script>`s; reserve React islands for complex widgets | Very high (projected ~83 KB → a few KB JS on browse/filter pages; removes ~10 KB props payload) | Medium | Lower than today (fewer deps in browser) |
| 2 | Add `public/_headers`: `immutable` for `/_astro/*`, security headers, header-CSP for `frame-ancestors`/`base-uri`/`form-action`/`object-src` | High | Low | Near zero |
| 3 | Set `workers_dev: false` and `preview_urls: false` (or `X-Robots-Tag: noindex` on workers.dev) in `wrangler.jsonc` | High (security/SEO hygiene) | Trivial | Zero |
| 4 | Enable `security.csp` with SHA-384, strict `script-src`, `style-src-attr 'unsafe-inline'` only via `kind: "attribute"` | High | Low–Medium | Low (verify per Astro minor) |
| 5 | npm 12 + `npm ci` + `strict-allow-scripts=true` in CI + committed `allowScripts` allowlist + `min-release-age` | High (supply chain) | Low | Low |
| 6 | Renovate (Mend hosted app) with `config:best-practices`, grouped Astro/Panda/React/Base UI updates, weekly schedule, 3–7 day cooldown, patch automerge | High (churn) | Low | Low |
| 7 | Move build runtime to Node 24 (Workers Builds default 24.22.1); plan Node 26 for 2027 | Medium–High | Low | Low |
| 8 | Harden content schemas: Zod URL protocol allowlists, length limits, no `set:html` on data, lint rule banning it | Medium | Low | Near zero |
| 9 | Fonts via Astro Fonts API (stable since 6.0) with `fontProviders.local()`; images via `<Picture>` AVIF/WebP with explicit `sizes` | Medium (LCP/CLS) | Low | Low |
| 10 | Time-boxed spike: Panda `transform: true`, then Base UI under preact/compat behind a feature branch with an a11y test suite; adopt only if both pass | Medium (possible ~50 KB saving on remaining islands) | Medium | Unknown (higher risk) |

## 1. JS payload vs UX

### Sourced facts

- **Your baseline (measured, 2026-11-25):** browse/filter island (Base UI Input + ToggleGroup) about 83 KB gz JS; island without Base UI about 67 KB on React vs about 11 KB on preact/compat; props for 300 records 10.2 KB gz as plain JSON vs 11.3 KB with Astro props encoding. Derived: Base UI Input + ToggleGroup + your widget code add about 16 KB gz over the React floor.
- **Astro preact/compat:** The `@astrojs/preact` docs say `compat: true` renders React components and that "the compat option only works for React libraries that export code as ESM." Swapping `react`/`react-dom` for libraries is done with package overrides to `@preact/compat`.\[1\]
- **Base UI + Preact evidence is community-level only.** Base UI v1.2.0 release notes include "Fix flash at origin before positioning completes in Preact (#3975)".\[2\] That suggests maintainers accept Preact fixes, but I found no official support statement. In the shadcn/ui issue #8065, a commenter reported on July 27, 2026 that Base UI input, input-group, button and Toast "work fine on Astro" with "minor type issues."\[3\] The Preact discussion #4559 says "Not all but a few Base UI … if you do path aliasing" work.\[4\] **Evidence is thin and anecdotal.**
- **Base UI 1.9.0** (Oct 9, 2026, no breaking changes listed) improves mount performance of large lists and includes "Avoid re-rendering inactive triggers on open and close." Base UI reached 1.0 in December 2025.\[5\]\[6\]\[7\]\[8\]
- **Panda source transforms (Panda 2.0, Sept 29, 2026):** "with `transform: true`, the bundler rewrites static `css()`, recipe, pattern, and `styled()` calls to class strings, so the styling runtime drops out of your bundle."\[9\]\[10\] The docs add: "Dynamic values keep their runtime form." The Panda Astro guide shows `vite: { plugins: [pandacss({ transform: true })] }`.\[11\]\[12\] Known issue #4081: a runtime helper call like `cx(css(...), value)` keeps the generated `styled-system/css/index.js` barrel imported and produces false `panda_call_unextractable` warnings.\[13\] **This is new (under 2 months old); treat it as beta-grade in practice.**
- **CSS anchor positioning** became Baseline Newly available on January 13, 2026 (Firefox 147; Chrome/Edge 125, Safari 26). Caveats: `position-anchor`'s initial value differed across engines, so set it explicitly.\[14\]\[15\]\[16\] Some sub-features (`position-visibility`, `anchor-size()`) are less interoperable. "Widely available" is projected around July 2028.\[15\]\[17\]
- **Popover API** has been Baseline Newly available since January 27, 2025 (source date over 12 months old, but the fact is stable).\[15\] Widely available is projected around July 2027.
- Panda 2.0 adds `positionTry()` (named anchor-positioning fallbacks) and `viewTransition()` factories, so the platform-first approach is supported in your styling layer.\[10\]\[18\]

### Assessment

**Floor math.** With React the floor is about 67 KB gz, so no amount of Base UI tree-shaking or compiler tuning gets a React island below that. Base UI's incremental cost (~16 KB for two components in your test) is not the problem; the runtime is. Your options:

| Approach | Projected JS (gz) | UX parity | Maintenance | Status |
|---|---|---|---|---|
| Plain Astro `<script>` + native controls + platform CSS | ~1–5 KB (projection; measure) | Equal or better for inputs, toggles, disclosure, dialogs, popovers | Lowest: no browser deps | Stable platform features |
| Web component (light DOM, no library) | ~2–6 KB (projection) | Same as above; better encapsulation for reuse | Low | Stable |
| preact/compat + Base UI | ~27–35 KB (projection: 11 KB + Base UI ~16 KB + widget) | Unknown: needs verification of focus management, portals, `useSyncExternalStore`-style hooks | Medium–High: two runtimes' semantics, community-only support | **Untested; experimental** |
| React 19 + Base UI (current) | ~67 KB floor + ~8 KB per typical component | Reference | Medium | Stable |

**Recommended default: platform-first.** For the browse/filter page:
- Render all 300 records into HTML at build time, which already happens for SEO.
- Use a native `<input type="search">` and a native radio/checkbox group styled as a toggle group. Panda conditions on `:checked` / `:has(:checked)` replace Base UI's `data-*` state.
- Add an Astro `<script>` that filters by toggling `hidden` on items, using `data-*` attributes written at build time. This also eliminates the 10.2–11.3 KB props payload, because the data is already in the DOM.

Native radios and checkboxes come with correct keyboard, focus and screen-reader semantics. There is no hydration delay, because the script is a tiny deferred module and the controls work as soon as the HTML paints. There is no layout shift, because nothing is client-rendered. Announce result counts through an `aria-live="polite"` region.

**Escape hatch: React island + Base UI** for widgets where hand-rolling ARIA is risky:
- combobox/autocomplete with async results
- menus with typeahead and submenus
- select with `alignItemWithTrigger`
- toast stacks
- drawers with swipe gestures

Rules for the escape hatch:
- Use `client:visible` by default and `client:load` only when the widget is above the fold and interacted with immediately.
- Use `client:idle` for above-the-fold widgets that aren't needed in the first second.
- Use `client:media` for mobile-only or desktop-only widgets.
- Astro emits the React runtime as a shared hashed chunk. Multiple islands on a page, and across pages, share one cached copy, so the cost is per first visit, not per island. Prefer one island per page region rather than many tiny React islands, because each island root has its own hydration cost.

**React Compiler.** I found **no 2026 primary-source measurement** of its bundle or runtime trade-off; evidence is thin. Mechanically, the compiler adds memoization cache code per component (a slight size increase per component) and removes re-render work at runtime. For small islands with one or two components, the effect on both size and INP is likely negligible either way. Keep it on, because it is the React team's default direction. Verify with your budget script that per-island deltas stay under ~1 KB gz, and don't count on it to reduce bundle size.

**Panda `transform: true`.** Worth a spike now. In islands, static `css()`/recipe calls become strings and the `styled-system/css` runtime should drop out.\[10\] Avoid `cx()` with dynamic values (issue #4081), or the barrel stays.\[13\] The saving is unmeasured for your stack: check the island chunk before and after. In `.astro` files, `css()` already runs at build time and ships nothing.

**Speculation Rules / prefetch and View Transitions** (see section 2). Use cross-document View Transitions via CSS, not Astro's `<ClientRouter />`, which is incompatible with Astro's CSP.\[19\]\[20\]

**When a plain `<script>` or web component beats a React island:**
- the widget's state fits in DOM attributes
- it has five or fewer interactive elements
- a native element provides the semantics (`<details>`, `<dialog>`, `popover`, radios, `<input>`)
- it needs no portal or complex focus trap beyond what `<dialog>`/`popover` give for free

Use a web component when the same behavior is reused on many pages or in the no-React flavor.

## 2. Performance beyond JS

### Sourced facts

- **Default cache headers** (Cloudflare docs, modified 2026-11-12): static assets get `Cache-Control: public, max-age=0, must-revalidate` (when there's no `Authorization`/`Range` header), an `ETag` (hash of the file), and `CF-Cache-Status`.\[21\]
- **`_headers` is honored** for static asset responses: "Headers defined in the `_headers` file override what Cloudflare ordinarily sends." It is not applied to Worker-generated responses, which is another reason to keep no `main`.\[21\]
  - Limits: 100 rules, 2,000 characters per line.\[21\]
  - Repeated headers are joined with commas, which breaks `Cache-Control` (e.g. `public, max-age=604800, public, max-age=0`). Use `! Header` to detach, and place narrower rules *after* broader ones.\[21\]
  - Cloudflare's own example: `/static/* Cache-Control: public, max-age=31556952, immutable`.\[21\]\[22\]
  - Older reports of `_headers` "not working" (withastro/astro #13164, early 2025, **over 12 months old**) involved a Worker `main`/SSR setup, which matches the documented caveat.\[21\]\[23\]
- **Astro Fonts API** is stable since Astro 6.0 (top-level `fonts` config, `fontProviders.local()`, `.fontsource()`, `.google()`, `.bunny()`, `.adobe()`, `.npm()` in 7.x).\[19\]\[24\] It downloads and self-hosts provider fonts and generates fallbacks.\[24\]
- **Astro 7.0** (June 22, 2026) builds were 15–61% faster in Astro's benchmarks. Astro 7.2 added experimental incremental static builds and 7.4 experimental parallel prerendering; both are **experimental**.\[25\]\[26\]\[27\]
- **Panda 2.0** emits `@layer reset, base, tokens, recipes, utilities`, media-range syntax, and `@property`-registered variables (Safari 16.4+, Firefox 128+; `optimize.propertyFallback` for older engines).\[10\]\[28\]

### Not verified in this research (flagged)

I could not confirm from 2026 primary sources:
- whether Workers Static Assets responses are served with zstd as well as Brotli
- whether Early Hints is generated for Workers Static Assets (it is documented for Pages)
- the exact free-plan HTTP/3 default

Check with `curl -sI --http3 -H 'Accept-Encoding: zstd, br' https://yoursite/` and in the dashboard (Speed → Optimization; Network → HTTP/3). Treat these as zone settings, not something your repo controls.

### Recommendations and config

**Caching.** HTML can keep the default (`max-age=0, must-revalidate` + ETag), which is correct for deploy freshness. Add immutable caching for hashed output:

```txt
/_astro/*
  ! Cache-Control
  Cache-Control: public, max-age=31536000, immutable
```

Effect: repeat visits skip one conditional revalidation round trip per JS/CSS/font/image asset. On mobile that is typically tens to hundreds of milliseconds saved per request (estimate). Don't add a broad `/*` `Cache-Control` rule, because it would be comma-joined with this one.\[21\]

**Fonts (LCP/CLS).**

```js
// astro.config.mjs (Astro 7.4)
import { defineConfig, fontProviders } from 'astro/config';
export default defineConfig({
  fonts: [{
    provider: fontProviders.local(),
    name: 'Inter',
    cssVariable: '--font-sans',
    fallbacks: ['system-ui', 'sans-serif'],
    options: { variants: [{ src: ['./src/assets/fonts/InterVariable-latin.woff2'], weight: '100 900', style: 'normal' }] },
  }],
});
```

- Use the `<Font cssVariable="--font-sans" preload />` component in the layout head, and wire the CSS variable into Panda tokens (`fonts.sans.value: 'var(--font-sans)'`).
- Subset to the scripts you serve.
- Keep `font-display: swap` (or `optional` for body text if you prefer zero swap shift). The fallback metrics Astro generates are what prevent CLS.
- Check where font files are emitted in `dist/`. If not under `/_astro/`, add an `immutable` rule for that path.

**Images.**
- Use `‹Picture src={img} formats={['avif','webp']} widths={[400,800,1200]} sizes="(width >= 64rem) 50vw, 100vw" />` for content images.
- Set `loading="eager"` + `fetchpriority="high"` on the LCP image only.
- Watch the 20,000-file limit: every width × format multiplies output files. Pick 3–4 widths and 2 formats at most.

**CSS delivery.** One extracted Panda file of about 6.4 KB gz is ideal. Keep it external (cacheable, CSP-friendly) rather than inlining it.

**Prefetch / Speculation Rules.**
- Use Astro's `prefetch` with `defaultStrategy: 'hover'` for internal links on browse pages.\[19\]
- Astro's Speculation-Rules-based prerender option has been **experimental**; I did not re-verify its status in 7.4.
- A hand-written `<script type="speculationrules">` is Chromium-only and needs its hash added to `scriptDirective.hashes` under CSP.
- Moderate prefetching costs nothing on free-plan static asset requests, which are unlimited.

**View Transitions.** Use `@view-transition { navigation: auto; }` in global CSS as a progressive enhancement. Avoid `<ClientRouter />` (CSP-incompatible per Astro docs).\[19\] Cross-browser support for cross-document transitions in Firefox was not verified here.

**Testing within free tiers.**
- Lighthouse CI in GitHub Actions against `astro preview`, with 3 runs on 3–5 representative URLs, takes a few minutes per run. GitHub Free private repos get $12 of included compute per month, which equals 2,000 Linux minutes at $0.006 per minute (cicdcalculator.com, citing GitHub's billing docs as checked 13 Nov 2026; the overage rate was cut from $0.008 on Jan 1, 2026, and Windows/macOS minutes use up the allowance faster). Run it on PRs that touch `src/` and weekly, not on every Renovate patch.
- Assert `total-byte-weight`, `interactive`, CLS and `unused-javascript`, and keep your existing JS budget script as the hard gate. Lab INP isn't measurable in Lighthouse navigation mode, so use Total Blocking Time as the proxy.
- Field data: CrUX/PageSpeed Insights is free but needs traffic. Cloudflare Web Analytics is free but injects a beacon script, which would need a CSP allowance and breaks the 0 KB JS rule on detail pages. My judgment: skip it unless you need field INP.

## 3. Security

### Sourced facts

- **Astro CSP:** `security.csp` (`boolean | object`, default `false`), added in astro@6.0.0 (it was experimental in 5.9–5.x).\[19\]\[29\]
  - "When enabled, Astro will add a `<meta>` element inside the `<head>` element of each page" with `script-src`/`style-src` built from the page's scripts and styles.\[19\]
  - Header output (`staticHeaders: true`) exists only for adapters (Node, Vercel, Netlify).\[30\]\[31\]\[32\] **With no adapter you get a meta tag only.**
  - Documented limitations:
    - external scripts and styles need your own hashes\[19\]
    - `<ClientRouter />` is not supported\[19\]
    - Shiki is not supported (inline styles)\[19\]
    - including `'unsafe-inline'` makes Astro drop hashes from that directive\[19\]
    - not supported in `dev`; test with `build` + `preview`\[19\]
  - Astro 5.10/5.11 blog posts state that `report-uri`, `frame-ancestors` and `sandbox` are not supported in `<meta>`.\[33\]\[34\] These sources are over 12 months old, but the restriction comes from the CSP spec.
  - `scriptDirective.strictDynamic` renders an import map with integrity metadata so "bundled scripts, the modules they import, and hydrated islands load" (requires Chrome 127, Firefox 138, Safari 18).\[19\]
  - The `algorithm` default is SHA-256; SHA-384/512 are available.\[19\]
- **Astro 7.1** (July 16, 2026) added `script-src-elem`/`-attr` and `style-src-elem`/`-attr`, plus a `kind` field (`"element" | "attribute" | "default"`) on hashes/resources.\[35\]\[36\] Attribute sources are limited to `'none'`, `'unsafe-hashes'`, `'unsafe-inline'` and `'report-sample'`. The docs' own example: allowing inline `style` attributes with `{ resource: "'unsafe-inline'", kind: "attribute" }`.\[19\]
- **Base UI CSP Provider** (1.9.0): some components render inline `<style>`/`<script>` tags. `disableStyleElements` removes the inline `<style>` (used by ScrollArea.Viewport, and by Select.Popup/List with `alignItemWithTrigger`), and you then add `.base-ui-disable-scrollbar { scrollbar-width: none; } .base-ui-disable-scrollbar::-webkit-scrollbar { display: none; }` to your own CSS. Inline `<script>`s are opt-in and need a nonce, which is impossible on a static site, so don't use them. Inline `style=""` attributes rendered on the server are governed by `style-src-attr`. Styles set by JavaScript at runtime via CSSOM are not blocked by CSP.\[37\]\[38\]
- **Workers URLs:** `workers_dev: false` disables the `*.workers.dev` route.\[39\] Version/Preview URLs follow the `workers_dev` default unless `preview_urls` is set, and Wrangler ≥ 4.34.0 defaults `preview_urls` to false (Cloudflare changelog, 2025, **over 12 months old**).\[40\]\[41\]\[42\] Preview URLs, when enabled, "are public and available immediately after version creation."\[41\] Cloudflare documents a `_headers` rule to `noindex` workers.dev hosts.\[21\]
- **GitHub Free, private repos** (multiple 2026 reports of API responses): rulesets and branch protection return 403 "Upgrade to GitHub Pro or make this repository public". Secret scanning, push protection and code scanning are unavailable;\[43\]\[44\] GitHub docs say private-repo secret scanning requires GitHub Secret Protection on Team/Enterprise.\[45\] Dependabot alerts are available on private repos.\[46\]
- **npm 12** (12.0.0 shipped July 8, 2026): `allowScripts` is off by default, covering dependency `preinstall`/`install`/`postinstall` and implicit `node-gyp` builds. `--allow-git` and `--allow-remote` default to none. Approvals are made with `npm approve-scripts --allow-scripts-pending` and committed to `package.json`.\[47\]\[48\] By default an unapproved script is skipped with a warning and the install still succeeds; `strict-allow-scripts=true` makes it fail (`ESTRICTALLOWSCRIPTS`).\[48\]\[49\] npm 11.10 added `min-release-age` (days).\[50\]\[51\] One 2026 test reports that `npm ci` and installs from an existing lockfile do **not** check release age.\[52\]

### Assessment: hardened baseline

**Two-policy CSP design.** Browsers enforce every CSP they receive, and a resource must pass all of them.
- Astro's **meta** policy carries the hash-based `script-src`/`style-src` and the fetch directives.
- A **header** policy in `_headers` carries what meta can't: `frame-ancestors`, plus belt-and-braces `base-uri`, `form-action` and `object-src`.
- Don't put `default-src` or `script-src` in the header policy, or it will block Astro's hashed inline hydration scripts that only the meta policy allows.
- Moving the whole policy into `_headers` per route is impractical: 100 rules, 2,000 characters per line, and hashes vary per page.\[21\]

```js
// astro.config.mjs (Astro 7.4.x). Verify the exact object shapes against the 7.4 config reference.
export default defineConfig({
  output: 'static',
  security: {
    csp: {
      algorithm: 'SHA-384',
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",  // Reconciled 2026-11-25: not adopted. No data: URIs (brief §4.6: an inlined data: image broke in production for 15 days)
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ],
      styleDirective: {
        // React/Base UI server-rendered style="" attributes only; <style> elements stay hash-only.
        resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }],
      },
      // scriptDirective: { strictDynamic: true }  // optional; needs import-map integrity support (Chrome 127 / Firefox 138 / Safari 18)
    },
  },
});
```

**Compatibility notes:**
- **Islands:** Astro hashes the hydration scripts it emits.\[20\] Confirm by loading a built page with DevTools open and checking for zero violations.
- **Panda:** a single external stylesheet is covered by `'self'`. Inline `style=""` from React `style` props needs the `style-src-attr` allowance above.
- **Base UI:** set `<CSPProvider disableStyleElements>` at the island root, add the scrollbar rule to Panda `globalCss`, and never enable Base UI inline scripts.\[38\]

**Trusted Types.** `require-trusted-types-for 'script'` is a reasonable later hardening step. React 19 only touches `innerHTML` via `dangerouslySetInnerHTML`, which you should ban. I did not verify late-2026 cross-browser support, and meta policies can't be report-only, so trial it on a branch.

**SRI.** For same-origin hashed `/_astro/*` files, SRI adds little beyond CSP `'self'` + immutable hashes. `strictDynamic` mode gives you integrity via the import map if you want it.

**`public/_headers` (ready to adapt):**

```txt
# Applies to all static asset responses (no Worker main => all responses)
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=(), browsing-topics=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  X-Frame-Options: DENY
  Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'

# Hashed build output: cache forever (narrower rule after broader one)
/_astro/*
  ! Cache-Control
  Cache-Control: public, max-age=31536000, immutable

# Belt and braces if workers.dev is ever re-enabled
https://:subdomain.workers.dev/*
  X-Robots-Tag: noindex
```

> **Reconciled 2026-11-25:** the brief keeps its own block (§7.6), with three differences:
> - It uses Cloudflare's documented two-placeholder rule, `https://:version.:subdomain.workers.dev/*`. The hostnames have two labels before `workers.dev`, and whether one placeholder matches across a dot wasn't checked.
> - COOP and CORP wait until after launch.
> - The header's CSP is the short form above from the first build (§4.6, §7.6), with `form-action 'none'` instead of `'self'`, since the site has no forms.

Header choices:
- **HSTS `preload`:** add only after confirming every subdomain is HTTPS-only. Preload is hard to undo.
- **COEP:** leave it out for now. `require-corp` breaks cross-origin images/fonts unless they send CORP. Revisit only if 3D work needs `SharedArrayBuffer` (section 5).
- **`X-Frame-Options: DENY`:** redundant with `frame-ancestors` in modern browsers but harmless.

**`wrangler.jsonc` additions:**

```jsonc
{
  "name": "site",
  "compatibility_date": "2026-11-18",
  "workers_dev": false,
  "preview_urls": false,
  "assets": { "directory": "./dist", "not_found_handling": "404-page" }
}
```

Set both flags explicitly. If the dashboard and the file disagree, Wrangler re-applies the file on the next deploy.\[39\]\[41\] Keep a custom domain route for production.\[53\]

> **Reconciled 2026-11-25:** adopted: `preview_urls: false` and `workers_dev` off at launch. Cloudflare's docs (2026-11-25) say `preview_urls` governs Version URLs only, and PR Previews don't use them (brief §6.5, §6.6). Not adopted: turning off non-production branch builds, because those builds are the PR Previews, the review loop and the owner's real-phone check.

**YAML content risks and schema defenses.**
- Astro escapes `{expressions}` by default, so the risk lies in `set:html`, `dangerouslySetInnerHTML`, `href`/`src` from data, and Markdown rendered from data.
- **URLs:** use `z.url().refine(u => ['https:', 'mailto:'].includes(new URL(u).protocol))`. This blocks `javascript:` and `data:` links. Allowlist hosts for embeds.
- **Strings:** set `.max()` on every string to stop accidental giant payloads in props. Use `.trim()`, and `z.enum()` for anything used in class names or `data-*` selectors.
- **Markdown in YAML:** render at build time and disallow raw HTML (or sanitize). Never `set:html` raw data.
- Lint-ban `set:html` and `dangerouslySetInnerHTML` except in a reviewed allowlist.
- `toSummary()` is a good pattern: keep it, and add a test that fails if new fields leak into island props.

**Supply chain on free plans.**
- Commit `package-lock.json`. Use `npm ci` in Workers Builds and CI.
- `.npmrc`: `save-exact=true`, `min-release-age=3`, `strict-allow-scripts=true`, `engine-strict=true`.
- Check which npm version Workers Builds' Node 24.22.1 image ships. If it is below 12, add a build step `npx npm@12 ci` or set `packageManager` in `package.json`. This was not verified.
- Run `npm approve-scripts --allow-scripts-pending` once and approve only packages that truly need scripts (native binaries).\[54\]
- Run `npm audit signatures` in CI to verify registry signatures and provenance attestations.
- Turn on Dependabot alerts (free on private repos), even if Renovate does version updates.\[46\]
- **No GitHub secret scanning on free private repos:**\[44\] run gitleaks (open source) in a pre-commit hook and in an Actions job. It is cheap, about 1 minute per run.
- OSV-Scanner or `npm audit --omit=dev` covers the runtime dependency set.
- **Actions minutes:** a full CI run (install, typecheck, build, budget, gitleaks, audit signatures) takes about 3–5 minutes. At ~100 runs/month that is 300–500 minutes, well inside the free allowance.

**Cloudflare / Workers Builds hygiene.**
- A pure static build needs **no secrets**. Anything referenced as `import.meta.env.PUBLIC_*` ships to browsers. Keep build variables non-sensitive and audit them in the dashboard.
- If you ever deploy from Actions instead of Workers Builds, use a token scoped to "Edit Cloudflare Workers" on one account, stored as an Actions secret, with an expiry.
- Enable 2FA on both GitHub and Cloudflare accounts.
- **No branch protection on free private repos:**\[43\] compensate with:
  - Workers Builds deploying production only from `main`
  - CI as a "soft gate": Renovate only automerges after green checks
  - disabling non-production branch builds, which avoids public previews and the one-concurrent-build queue
  - a `CODEOWNERS` file for documentation, even though it isn't enforced

### CI checklist

> **Reconciled 2026-11-25:** on a free private repo an Actions check can't block a merge, so the brief runs its gates in `npm run build` and before each PR, not in Actions (§10). It keeps non-production branch builds on (§6.5).

1. `npm ci` (npm ≥12, `strict-allow-scripts=true`, committed allowlist)
2. `npm audit signatures`
3. `npm audit --omit=dev --audit-level=high` (or OSV-Scanner)
4. gitleaks on the diff (and full history weekly)
5. `astro check` / `tsc --noEmit`
6. ESLint incl. Panda's first-party ESLint plugin and a `set:html`/`dangerouslySetInnerHTML` ban
7. `astro build`
8. JS/CSS budget script (0 KB JS on detail pages; per-route budgets)
9. File-count check (< 20,000) and max-file-size check (< 25 MiB)
10. Header lint: assert `dist/_headers` exists and has ≤100 rules; grep built HTML for the CSP meta
11. Lighthouse CI on 3–5 URLs (PRs touching `src/`, plus weekly)
12. Playwright + axe smoke test of each interactive widget (keyboard path, focus return, no CSP violations in the console)

## 4. Minimal update churn

### Sourced facts (cadence and support)

| Component | Current | Recent majors / breaking changes | Security-fix window |
|---|---|---|---|
| Astro | 7.4.13 | 6.0 (shipped March 10, 2026 per the official "Astro 6.0" blog post; the January date was the Astro 6 beta), 7.0 (June 22, 2026). Rust compiler: no HTML auto-correction, JSX-style strictness and whitespace collapsing. Minors 7.1 (Jul 16), 7.2 (Aug 6), 7.3 (Sep 3), 7.4 (Oct 15) | "Extended maintenance for security fixes only for one previous major version" (docs)\[55\] |
| Base UI | 1.9.0 (Oct 9, 2026) | 1.0 Dec 2025; package rename from `@base-ui-components/react`; ten minors since 1.0\[6\] | No published LTS policy found |
| Panda CSS | 2.6.0 | 2.0 Sept 29, 2026: Rust/Oxc engine, ESM-only, Node 22+, template-literal syntax removed, `panda ship` removed, `inspect`/`validate`/`info` merged into `panda doctor`\[10\]\[56\] | No published v1 support window found |
| TypeScript | 7.x | 7.0 stable July 8, 2026 (Go-native `tsc`); 6.0 was the last JS-based line; 7.0 ships **no stable programmatic compiler API**\[57\] | Not published |
| Node.js | 22.23.x | 22 in maintenance, EOL **Apr 30, 2027**; 24 maintenance since Oct 20, 2026, EOL Apr 30, 2028; 26 Active LTS since Oct 28, 2026, EOL Apr 30, 2029\[58\]\[59\] | Per release schedule |
| npm | 12.x | 12.0 Jul 8, 2026 (scripts off); 12.2 Sep 30, 2026\[48\] | — |
| Vite | 8 | 8.0 with Rolldown (2026); Astro majors track Vite majors (Astro team comment)\[60\] | Not verified in this research |
| React | 19.3.1 | — | Cadence not verified in this research |
| Wrangler | 4.168 | Very frequent releases (inferred from version number) | Not verified |

Related facts:
- Astro's Node policy allows raising the minimum Maintenance LTS in a *minor*, or even a *patch* for Node security flaws.\[55\]\[61\] That is why your floor moved to 22.23.4.
- Astro's dependency count dropped from 247 (astro@6.0.0) to 190 (astro@7.0.6), per Hacker News user pier25's node-modules.dev measurement in the "Astro 7.0" thread ("Astro has gone from 247 deps in v6 to 190 in v7"), later repeated by InfoQ (Aug 2026).
- Cloudflare's blog post "Astro is joining Cloudflare" (Brendan Irvine-Broque and Fred Schott, Jan 16, 2026) and a Business Wire release the same day state that "All full-time employees of The Astro Technology Company are now employees of Cloudflare, and will continue to work on Astro." That aligns framework and host, which makes it reasonable to bet on long-term Workers compatibility (my judgment).

### Assessment

**Runtime (browser) surface:**
- React + react-dom
- Base UI (plus its `@base-ui/utils` dependency)
- Panda's `styled-system` runtime (removable with `transform: true`)
- Astro's island hydration runtime
- your own code

Minimize it by applying recommendation #1. Every widget moved to the platform removes React from that page entirely.

**Build-only (supply-chain) surface:** everything else (Astro, Vite/Rolldown, Panda compiler native binaries, Sätteri, sharp, TypeScript, Wrangler, ESLint). Native binaries are where install scripts and platform packages live, so npm 12's allowlist matters most here.

**TypeScript 7 caution:** tooling that imports `typescript` as a library (some ESLint typed rules, language servers, `astro check`) may still need a 6.x API.\[62\] Pin `typescript` to whatever `@astrojs/check` declares as its peer, and let Renovate move it only as a group with Astro. I did not verify `@astrojs/check`'s current peer range.

**Update policy (works on free plans):**
- **Exact pins** (`save-exact=true`) for everything. The lockfile is the real pin, but exact ranges make Renovate PRs explicit and stop accidental drift during `npm install`.
- **Renovate over Dependabot.** Mend's hosted Renovate app is free: its GitHub Marketplace listing shows "Renovate Community Cloud. Free, hosted Renovate by Mend.io" at $0 for "Personal and org accounts / Public and private repos", and says "no paid plan is required." It supports group presets for monorepos, `lockFileMaintenance`, `minimumReleaseAge`, and native automerge that waits for passing checks, which matters because you can't require checks on a free private repo. Dependabot now has cooldowns (default 3 days for version updates)\[63\]\[64\] and groups but no native automerge.

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:best-practices", ":semanticCommits"],
  "schedule": ["before 6am on monday"],
  "timezone": "Europe/Berlin",
  "minimumReleaseAge": "3 days",
  "prConcurrentLimit": 3,
  "lockFileMaintenance": { "enabled": true, "schedule": ["before 6am on the first day of the month"] },
  "packageRules": [
    { "groupName": "astro", "matchPackageNames": ["astro", "@astrojs/**"] },
    { "groupName": "panda", "matchPackageNames": ["@pandacss/**"] },
    { "groupName": "react", "matchPackageNames": ["react", "react-dom", "@types/react", "@types/react-dom", "babel-plugin-react-compiler", "oxc-transform-react"] },
    { "groupName": "base-ui", "matchPackageNames": ["@base-ui/**"] },
    { "matchUpdateTypes": ["major"], "minimumReleaseAge": "14 days", "dependencyDashboardApproval": true },
    { "matchUpdateTypes": ["patch", "digest", "pin"], "automerge": true, "automergeType": "branch" },
    { "matchPackageNames": ["wrangler"], "schedule": ["before 6am on the first day of the month"] }
  ],
  "vulnerabilityAlerts": { "enabled": true }
}
```

Notes on this config:
- Security updates bypass `minimumReleaseAge` in both Renovate and Dependabot.\[52\]\[63\]
- Wrangler is only used in local dev here (Workers Builds supplies its own), so monthly updates are enough.
- `automergeType: "branch"` avoids PR noise and fits the one-concurrent-build limit. Combine it with Workers Builds' production branch = `main`, and disable non-production branch builds so Renovate branches don't trigger Cloudflare builds.

**Exit plan (least to most effort):**
1. **Panda → plain CSS with cascade layers.** Panda already outputs static atomic CSS + CSS-variable tokens. Exit path:
   - freeze the generated `styles.css` and the tokens
   - convert `css()` calls component by component to CSS Modules or `@layer` files
   - the `data-*` state selectors survive unchanged

   This is moderate effort and mechanical. Risk factors: the 2.0 rewrite is two months old and has fast minors. Keep custom Panda config features (`panda lib`, `designSystem`, `staticCss`) to a minimum to keep the exit cheap.
2. **Base UI → React Aria Components (Adobe; 1.0 Dec 2023) or native elements.**\[6\] Base UI's API is part-based and `data-*`-driven, so styles mostly carry over. Wrap Base UI parts in your own `components/ui/*` modules so swaps are local.
3. **React → Preact compat** (see section 1) if a cheaper runtime becomes compelling.
4. **Astro** is the hardest piece to replace and the least likely to need it.

## 5. Later: 3D (architecture only)

### Sourced facts

- **WebGPU** ships in Chrome/Edge 113+, Safari 26 (macOS Tahoe/iOS/iPadOS/visionOS 26; Sept 2025, **over 12 months old**), Firefox 141 on Windows (July 2025, **over 12 months old**), and Firefox 145 on Apple-silicon macOS, extended in 147. As of August 2026, Firefox on Linux/Android was pre-release only.\[65\]\[66\] Several 2026 articles call WebGPU "Baseline",\[67\]\[68\] but those claims are loose; the Firefox platform gaps remain.
- **R2 free tier:** 10 GB-month of storage, 1M Class A and 10M Class B operations/month, zero egress (Standard class only).\[69\]
- **Workers Static Assets:** 25 MiB per file, 20,000 files per version (your verified limits).

### Assessment

**Engine choice.**
- Use vanilla Three.js in a dedicated island component (React flavor) or a custom element (no-React flavor), mounted with `client:visible`/`client:only`. Inside it, `await import('three')` only after a user gesture or visibility.
- React-three-fiber adds a reconciler layer on top of React and ties 3D churn to React majors. Use it only if the 3D scenes are UI-heavy and built by React developers.
- Use raw WebGPU/WebGL only for single-purpose effects where Three.js would dominate the page weight.
- Three.js's `WebGPURenderer` falls back to WebGL2 according to secondary 2026 sources; verify on Firefox Linux/Android.
- Always feature-detect (`navigator.gpu?.requestAdapter()`) and provide a poster image fallback. That fallback also serves as the LCP element.

**Keep heavy code off other pages.** Dynamic `import()` inside the island guarantees a separate chunk. Extend the budget script with per-route budgets (e.g. `/3d/**`: ≤ X KB initial, heavy chunks only after interaction; all other routes unchanged), and fail CI if `three` appears in any non-3D route's modulepreload graph.

**Asset hosting.**
- Assets ≤ 25 MiB after compression: Workers Static Assets, unlimited free requests, with `immutable` caching for hashed filenames.
- Larger assets, or many variants: R2 behind a custom domain on the same zone. Set `Cache-Control: public, max-age=31536000, immutable` as object metadata and use content-hashed keys. Add CORS for your origin and CORP `cross-origin` if you ever enable COEP.
- Compression: Meshopt (small decoder) or Draco for geometry, KTX2/Basis for textures. Self-host the decoder/transcoder WASM files; Three.js examples default to CDN URLs, which your CSP would block (by design).

**CSP for 3D pages** (add per route via `Astro.csp.insertDirective` on those pages only):\[70\]
- `script-src` gains `'wasm-unsafe-eval'`, needed to compile WASM decoders.
- `worker-src 'self' blob:` for decoder workers. Prefer `'self'` with real worker files if the library allows it.
- `connect-src` gains your R2 asset origin.
- `img-src` gains `blob:` if textures are decoded to blob URLs.
- COOP + COEP (`require-corp` or `credentialless`) only if you need `SharedArrayBuffer` (multithreaded WASM). Apply it via a path-scoped `_headers` rule so other pages are unaffected.

## 6. Later: no-React flavor

### Assessment (with supporting facts)

**Interactivity without a framework, in order of preference:**
1. **Platform:**
   - `<details name="...">` for exclusive accordions
   - `<dialog>` with `showModal()` for modals, which gives focus trap and Esc handling for free
   - the `popover` attribute + `popovertarget` for menus and tooltips (Baseline Newly available Jan 2025)\[15\]
   - CSS anchor positioning for placement (Baseline Newly available Jan 2026; add a non-anchored fallback position)\[16\]
   - `:has()`/`:checked` for state-driven styling
   - cross-document View Transitions in CSS
2. **Astro `<script>`:** processed, bundled, deduplicated and hashed for CSP automatically.\[19\]\[20\] Keep each one under ~1 KB.
3. **Light-DOM custom elements:** for reusable behaviors such as a filter list, a copy button or a disclosure group, defined in `src/elements/*.ts` and shared with the React flavor.

**Is Panda still right for near-zero-JS?** Yes, with a caveat:
- In `.astro` files, `css()` and recipes execute at build time and ship no JS. Output is one atomic CSS file with layers and tokens, the same as today.
- The cost is build-side complexity: native compiler binaries and a fast-moving 2.x line.
- For a purely brochure site, plain CSS with `@layer`, custom-property tokens and a small set of utility classes would be lower-churn.
- Sharing tokens and recipes with the React flavor is worth more than that difference, so keep Panda unless the brochure template is maintained by people who don't touch the React flavor.

**Sharing design tokens and tooling:**
- **Recommended: one template repo with React as an opt-in layer**, not two templates. Keep `@astrojs/react`, React and Base UI in a clearly separated `src/islands/` + `integrations/react.ts` that a setup script removes. The zero-JS budget then becomes a CI flag (`BUDGET_JS_MAX=0`).
- **Shared design system:** keep the Panda preset (tokens, recipes, conditions) as a `design-system/` directory inside the template. Downstream sites pull updates with a sync script or `git subtree`.
- Avoid git-URL npm dependencies: npm 12 blocks them by default (`--allow-git none`).\[47\]
- Panda 2's publishable design systems (`panda lib` + `designSystem`) are the cleaner long-term answer.\[10\] They are two months old, and private npm packages need a paid registry or GitHub Packages quotas. Revisit in 2027.
- A monorepo (npm workspaces) only pays off if one team maintains several sites together. In that case, run one Renovate config and one CI for all sites.

## Do now / do later / avoid

| Do now | Do later | Avoid |
|---|---|---|
| `_headers` with `immutable` `/_astro/*` + security headers + header CSP for `frame-ancestors` | Trusted Types (`require-trusted-types-for 'script'`) after a branch trial | Adding a Worker `main` or `@astrojs/cloudflare` (headers stop applying; requests count toward 100k/day)\[21\] |
| `workers_dev: false`, `preview_urls: false` | Base UI under preact/compat: only after a passing a11y/focus test suite | `<ClientRouter />` (incompatible with Astro CSP) and Shiki (inline styles)\[19\] |
| `security.csp` (SHA-384, `kind: "attribute"` for style attrs) + Base UI `CSPProvider disableStyleElements` | Panda `designSystem`/`panda lib` for cross-repo sharing (2027) | `'unsafe-inline'` on `style-src`/`script-src` (Astro drops all hashes)\[19\] |
| Rewrite browse/filter as native controls + Astro `<script>` | Astro experimental incremental builds / parallel prerendering once stable | A broad `/*` `Cache-Control` rule (comma-joins with specific rules)\[21\] |
| npm 12 + `strict-allow-scripts` + `min-release-age` + `npm audit signatures` + gitleaks | Node 26 for builds (2027, before Node 24 EOL in Apr 2028) | Git-URL or tarball-URL dependencies |
| Renovate with grouping, cooldown, weekly schedule, patch branch-automerge | 3D: vanilla Three.js island, R3F only if needed; WASM CSP scoped per route | Global COEP `require-corp`; HSTS `preload` before auditing subdomains |
| Node 24 for Workers Builds (Node 22 EOL Apr 30, 2027) | Cloudflare Web Analytics only if field INP is needed (costs a beacon + CSP change) | Base UI inline `<script>`s (need nonces, impossible on static)\[38\] |
| Astro Fonts API (local provider) + `<Picture>` AVIF/WebP with `sizes` | Lighthouse CI thresholds tightened after 4 weeks of baselines | `set:html` / `dangerouslySetInnerHTML` with YAML data |
| Panda `transform: true` spike; measure island delta | — | Expecting React Compiler to shrink bundles |

## Caveats

- **Thin or unverified evidence:**
  - React Compiler's size/runtime trade-off (no 2026 primary measurement found)
  - Base UI under preact/compat (community anecdotes only)
  - Workers Static Assets zstd/Early Hints/HTTP/3 behavior
  - Vite, React and Wrangler support windows
  - the GitHub Actions allowance ($12/month of included compute, i.e. 2,000 Linux minutes, per cicdcalculator.com citing GitHub billing docs as of 13 Nov 2026) and Renovate app pricing ($0 "Renovate Community Cloud" per its GitHub Marketplace listing) come from secondary or listing pages, not GitHub's own docs pages
  - `@astrojs/check`'s TypeScript peer range
  - Firefox's cross-document View Transitions support
- **Conflicting sources:**
  - Astro 6's release date: settled as March 10, 2026 by the official "Astro 6.0" blog post; the January date was the beta
  - "WebGPU is Baseline" claims vs documented Firefox Linux/Android gaps
- **Projections, not measurements:** all KB projections for the platform-first and preact/compat paths. Validate them with your budget script before adopting.
- **Recent, fast-moving releases (under 6 months old):** Panda 2.x (Sept 2026), Astro 7.x CSP `kind` scoping (July 2026) and npm 12 (July 2026). Re-check behavior on each minor.
- **Sources over 12 months old:** the Popover Baseline date (Jan 2025), Safari 26 / Firefox 141 WebGPU ship dates (2025), the Wrangler 4.34 `preview_urls` default (2025) and the Astro 5.10/5.11 meta-CSP statements. They are cited where the underlying fact is stable.

## Sources

1. [astrojs/preact - Astro Docs](https://docs.astro.build/en/guides/integrations-guide/preact/)
2. [v1.2.0 · Base UI](https://base-ui.com/react/overview/releases/v1-2-0)
3. [\[feat\]: Compatible with Preact · Issue #8065 · shadcn-ui/ui · GitHub](https://github.com/shadcn-ui/ui/issues/8065)
4. [UI/Component libraries known to work with Preact? · preactjs/preact · Discussion #4559 · GitHub](https://github.com/preactjs/preact/discussions/4559)
5. [Upgrade Base UI to 1.9.0 · Issue #973 · raystack/apsara · GitHub](https://github.com/raystack/apsara/issues/973)
6. [Base UI vs. React Aria Components: Which Headless React Library Should You Use in 2026?](https://www.untitledui.com/blog/base-ui-vs-react-aria)
7. [v1.9.0 · Base UI](https://base-ui.com/react/overview/releases/v1-9-0)
8. [--- title: Releases subtitle: Changelogs for each Base UI release. ---](https://base-ui.com/react/overview/releases.md)
9. [Release @pandacss/transformer@2.0.0 · chakra-ui/panda · GitHub](https://github.com/chakra-ui/panda/releases/tag/%40pandacss/transformer%402.0.0)
10. [Panda CSS 2.0](https://panda-css.com/blog/panda-css-v2)
11. [Using Vue - Panda CSS](https://panda-css.com/docs/get-started/vue)
12. [Using Astro - Panda CSS](https://panda-css.com/docs/get-started/astro)
13. [\[vite\] transform: true lints generated runtime files (false panda\_call\_unextractable on cva.js / sva.js) · Issue #4081 · chakra-ui/panda · GitHub](https://github.com/chakra-ui/panda/issues/4081)
14. [CSS anchor positioning: tooltips that flip - DEV Community](https://dev.to/richicodes/css-anchor-positioning-tooltips-that-flip-3ld6)
15. [CSS Anchor Positioning Is Baseline](https://wunderlandmedia.com/css-anchor-positioning-replace-tooltip-library)
16. [CSS Anchor Positioning Is Baseline: Drop Your Tooltip JavaScript](https://trade-assistance.com/blog/css-anchor-positioning-baseline-2026/)
17. [CSS Anchor Positioning: Delete Floating UI](https://www.buildmvpfast.com/blog/css-anchor-positioning-baseline-delete-floating-ui-2026)
18. [chakra-ui/panda @pandacss/compiler@2.0.0-beta.16 on GitHub](https://newreleases.io/project/github/chakra-ui/panda/release/@pandacss/compiler@2.0.0-beta.16)
19. [Configuration Reference](https://docs.astro.build/en/reference/configuration-reference/)
20. [Astro - Report URI Docs](https://docs.report-uri.com/frameworks/astro/)
21. [--- agent:](https://developers.cloudflare.com/workers/static-assets/headers/index.md)
22. [Headers · Cloudflare Workers docs](https://developers.cloudflare.com/workers/static-assets/headers/)
23. [Cloudflare Workers (Beta Assets). Broken Caching \`\_headers\` · Issue #13164 · withastro/astro · GitHub](https://github.com/withastro/astro/issues/13164)
24. [Astro Fonts API Explained: Providers, Preloads, Fallbacks — Komal Nakrani Blog](https://komalnakrani.com/blog/astro-fonts-api-deep-dive/)
25. [What's new in Astro 7, up to 7.3](https://astrobuild.eu/en/blog/astro-7-whats-new)
26. [Astro Versions: Release History from 1.0 to Astro 7 — Komal Nakrani Blog](https://komalnakrani.com/blog/astro-version-history/)
27. [Astro 7.0 | Astro](https://astro.build/blog/astro-7/)
28. [FAQs - Panda CSS](https://panda-css.com/docs/overview/faq)
29. [feat: stabilise CSP (#14946) · withastro/astro@95c40f7 · GitHub](https://github.com/withastro/astro/commit/95c40f7109ce240206c3951761a7bb439dd809cb)
30. [astrojs/node - Astro Docs](https://docs.astro.build/en/guides/integrations-guide/node/)
31. [astrojs/vercel - Astro Docs](https://docs.astro.build/en/guides/integrations-guide/vercel/)
32. [astrojs/netlify - Astro Docs](https://docs.astro.build/en/guides/integrations-guide/netlify/)
33. [Astro 5.10](https://astro.build/blog/astro-5100/)
34. [Astro 5.11](https://astro.build/blog/astro-5110/)
35. [Release astro@7.1.0 · withastro/astro · GitHub](https://github.com/withastro/astro/releases/tag/astro@7.1.0)
36. [Astro 7.1 | Astro](https://astro.build/blog/astro-710/)
37. [fix(app): stop Base UI inline styles under entry CSP by corylanou · Pull Request #3115 · digitaldrywood/detent · GitHub](https://github.com/digitaldrywood/detent/pull/3115)
38. [CSP Provider · Base UI](https://base-ui.com/react/utils/csp-provider)
39. [cloudflare-docs/src/content/docs/workers/configuration/routing/workers-dev.mdx at production · cloudflare/cloudflare-docs · GitHub](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers/configuration/routing/workers-dev.mdx)
40. [Version URLs · Cloudflare Workers docs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/)
41. [Preview URLs · Cloudflare Workers docs](https://d1-custom-bindings-docs.previews.developers.cloudflare.com/workers/versions-and-deployments/preview-urls/)
42. [developers.cloudflare.com](https://developers.cloudflare.com/changelog/product-group/developer-platform/6)
43. [docs: say what a private repository gets on the free plan · Issue #39 · studiobimo/project-template · GitHub](https://github.com/studiobimo/project-template/issues/39)
44. [chore(security): no secret scanning, push protection or code scanning on a free private repo · Issue #150 · xb3sox/nextjob · GitHub](https://github.com/xb3sox/nextjob/issues/150)
45. [Secret scanning - GitHub Docs](https://docs.github.com/code-security/secret-scanning/about-secret-scanning)
46. [Securing your public GitHub Repos for Free! · community · Discussion #131888 · GitHub](https://github.com/orgs/community/discussions/131888)
47. [npm 12 Disables Install Scripts by Default to Reduce Supply Chain Risk](https://thehackernews.com/2026/07/npm-12-disables-install-scripts-by.html)
48. [npm allowScripts warning: fix "install scripts not covered" on npm 12 · Indra Gusti Prasetya](https://indragustiprasetya.com/blog/npm-v12-breaking-changes-lock-down-install-scripts.html)
49. [npm v12 Ships With Install Scripts Off by Default, Begins Deprecating 2FA-Bypass Tokens](https://socket.dev/blog/npm-12)
50. [Renovate & Dependabot: The New Malware Delivery System](https://blog.gitguardian.com/renovate-dependabot-the-new-malware-delivery-system/)
51. [Minimum Release Age is an Underrated Supply Chain Defense](https://daniakash.com/posts/simplest-supply-chain-defense/)
52. [npm minimum release age: a cooldown for dependencies - Sascha Mirow-Stanitzok](https://sascha-ms.de/en/npm-minimum-release-age)
53. [workers dev](https://docs.cloudflare.com/workers/configuration/routing/workers-dev/)
54. [npm 12 turns install scripts off by default — 0dayNews](https://0daynews.com/articles/2026-07-11-npm-12-allowscripts-off-default-gats-oidc-branch/)
55. [Upgrade Astro](https://docs.astro.build/en/upgrade-astro/)
56. [Release @pandacss/dev@2.0.0 · chakra-ui/panda · GitHub](https://github.com/chakra-ui/panda/releases/tag/%40pandacss/dev%402.0.0)
57. [TypeScript 7 Native Go Port: What to Do](https://arg.software/blog/typescript-7-rewritten-in-go/)
58. [Node.js EOL: Node 22 Ends 30 Apr 2027. Upgrade or Extend](https://acemq.com/blogs/nodejs-end-of-life/)
59. [Node 22 vs Node 24: LTS Support and Upgrade Checks — PkgPulse Guides](https://www.pkgpulse.com/guides/nodejs-22-vs-nodejs-24-2026)
60. [Astro 7.0: Rust Compiler, Vite 8, and Up to 61% Faster Builds](https://www.developersdigest.tech/blog/astro-7-rust-vite-8-release)
61. [@astrojs/vue 7.1.2 Patch Changes](https://raw.githubusercontent.com/withastro/astro/main/packages/integrations/vue/CHANGELOG.md)
62. [TypeScript 7.0 Goes Native in Go, TS 6.0 Breaks Defaults - DEV Community](https://dev.to/matheus_releaserun/typescript-70-goes-native-in-go-ts-60-breaks-defaults-3kb8)
63. [Keep Your Pins Fresh: Dependabot, Renovate and the UnJS Preset - DEV Community](https://dev.to/gioboa/keep-your-pins-fresh-dependabot-renovate-and-the-unjs-preset-1lfe)
64. [Dependency Update Automation: Dependabot and Renovate](https://nhimg.org/dependency-update-automation-guide)
65. [WebGPU](https://en.wikipedia.org/wiki/WebGPU)
66. [WebGPU: Browser Support, Features, Limitations](https://www.testmuai.com/learning-hub/webgpu-browser-support/)
67. [WebGPU Just Hit Baseline in Every Major Browser. Three.js Is Already Shipping It and WebXR Is the Real Winner.](https://vr.org/articles/webgpu-baseline-2026-three-js-webxr-default)
68. [Frontier Web APIs 2026: WebGPU, WebTransport & What's Production-Ready](https://www.utsubo.com/blog/frontier-web-apis-2026-production-ready)
69. [Cloudflare R2 Pricing 2026: Complete Cost Guide - BucketMate](https://www.bucketmate.app/blogs/cloudflare-r2-pricing-2026)
70. [How To Implement Content Security Policy (CSP) Headers Fo...](https://trevorlasn.com/blog/csp-headers-astro)
