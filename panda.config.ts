import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  // Keep both presets. Without them there are no utilities, tokens or conditions.
  presets: ['@pandacss/preset-base', '@pandacss/preset-panda'],
  preflight: true,

  // Scan .astro pages as well as React components. `panda init` leaves `astro` out.
  include: ['./src/**/*.{js,jsx,ts,tsx,astro}'],
  exclude: [],

  globalCss: {
    // Base UI quick start: popups portal into the stacking context that .root creates
    // (src/layouts/Base.astro), and iOS Safari needs a positioned body for backdrops.
    '.root': { isolation: 'isolate' },
    body: { position: 'relative' },
    // Base UI's CSPProvider runs with disableStyleElements (src/components), so the rule
    // Base UI would have injected as an inline <style> lives here instead.
    '.base-ui-disable-scrollbar': { scrollbarWidth: 'none' },
    '.base-ui-disable-scrollbar::-webkit-scrollbar': { display: 'none' },
    // Astro's island wrappers must not affect layout. Astro would inject this rule as a
    // <style> in <body>; astro.config.ts removes that element, so the rule lives here.
    'astro-island, astro-slot, astro-static-slot': { display: 'contents' },
    // The color scheme. Every color token below is light-dark(<light>, <dark>), and this
    // property picks the half: "light dark" follows the operating system. A visitor's choice
    // in the header sets data-theme on <html> (src/scripts/theme.js), which overrides it.
    html: { colorScheme: 'light dark' },
    'html[data-theme="light"]': { colorScheme: 'light' },
    'html[data-theme="dark"]': { colorScheme: 'dark' },
    // Paper is light whatever the screen shows: browsers leave backgrounds out of print by
    // default, so dark-scheme text would come out pale on white.
    '@media print': { html: { colorScheme: 'light !important' } },
  },

  theme: {
    extend: {
      // The site's colors, by role. Components name these, never a palette color such as
      // gray.900 (src/lib/tokens.test.ts fails the build if one does). To rebrand, change the
      // values here: each points at a palette token from @pandacss/preset-panda, or is a
      // color of its own. src/lib/contrast.test.ts fails the build if a pair falls below its
      // contrast ratio in either scheme. Keep themeColor in src/site.ts equal to `bg`.
      // _moreContrast applies when the visitor asks the system for more contrast: muted text
      // becomes body text and every edge gets stronger. It points at other tokens, so it
      // follows the scheme by itself.
      semanticTokens: {
        colors: {
          bg: {
            DEFAULT: { value: 'light-dark({colors.white}, {colors.gray.950})' }, // the page
            subtle: { value: 'light-dark({colors.gray.100}, {colors.gray.800})' }, // tags
            inverse: { value: 'light-dark({colors.gray.900}, {colors.gray.100})' }, // a pressed toggle
          },
          fg: {
            DEFAULT: { value: 'light-dark({colors.gray.900}, {colors.gray.50})' }, // body text
            muted: { value: { base: 'light-dark({colors.gray.600}, {colors.gray.400})', _moreContrast: '{colors.fg}' } }, // dates, counts, the footer
            inverse: { value: 'light-dark({colors.white}, {colors.gray.950})' }, // text on bg.inverse
          },
          border: {
            subtle: { value: { base: 'light-dark({colors.gray.200}, {colors.gray.800})', _moreContrast: '{colors.border.control}' } }, // cards: decoration only
            control: { value: { base: 'light-dark({colors.gray.500}, {colors.gray.500})', _moreContrast: '{colors.fg}' } }, // the edge of a control
          },
          focusRing: { value: 'light-dark({colors.blue.600}, {colors.blue.400})' },
        },
      },
    },
  },
  outdir: 'styled-system',
});
