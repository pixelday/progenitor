import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import type { AstroIntegration } from 'astro';
import react from '@astrojs/react';
import pandacss from '@pandacss/vite';
import { site } from './src/site';

// Astro writes this <style> into <body> beside the first island on a page. A <style> there
// is invalid HTML, and the W3C checker reports two errors for it. The same rule is in
// panda.config.ts (globalCss), so the element is removed from the built pages.
// scripts/verify-dist.mjs fails the build if a <style> is ever left in a <body>.
const ISLAND_STYLE = '<style>astro-island,astro-slot,astro-static-slot{display:contents}</style>';
const hoistIslandStyle: AstroIntegration = {
  name: 'hoist-island-style',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const dist = fileURLToPath(dir);
      for (const name of readdirSync(dist, { recursive: true, encoding: 'utf8' })) {
        if (!name.endsWith('.html')) continue;
        const html = readFileSync(join(dist, name), 'utf8');
        if (html.includes(ISLAND_STYLE)) writeFileSync(join(dist, name), html.replace(ISLAND_STYLE, ''));
      }
    },
  },
};

export default defineConfig({
  // Static output is the default. There is no adapter on purpose.
  site: site.url,
  integrations: [react(), hoistIslandStyle],
  // 'preserve' builds terms.astro as terms.html and an index.astro as index.html. The host's
  // default html_handling (auto-trailing-slash) then serves /terms without a slash and a
  // folder index at /folder/, and redirects the other spelling of each with a 307.
  build: { inlineStylesheets: 'never', format: 'preserve' },
  markdown: { syntaxHighlight: false },
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self'",
        "font-src 'self'",
        "connect-src 'self'",
        "manifest-src 'self'",
      ],
    },
  },
  vite: {
    plugins: [pandacss()],
    build: { assetsInlineLimit: 0 },
  },
});
