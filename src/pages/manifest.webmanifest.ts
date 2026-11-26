import type { APIRoute } from 'astro';
import { site } from '../site';

// The web manifest, built from the site's identity so the name and colors cannot drift from
// the <head>. Paths are root-relative, so it is right on every hostname.
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: site.name,
      short_name: site.shortName,
      description: site.description,
      lang: site.lang,
      start_url: '/',
      display: 'browser',
      theme_color: site.themeColor,
      background_color: site.themeColor,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    }),
    { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } },
  );
