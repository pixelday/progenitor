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
  },

  theme: { extend: {} },
  outdir: 'styled-system',
});
