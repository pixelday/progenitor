import type { APIRoute } from 'astro';
import { absolute } from '../lib/pages';
import { siteMap } from '../lib/site-map';
import { site } from '../site';

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// A consumer of the launch switch. Before launch the response has no body, and Astro writes
// no file for an empty response, so an unlaunched build has no sitemap.xml at all.
export const GET: APIRoute = async () => {
  if (!site.launched) return new Response(null, { status: 204 });

  const urls = (await siteMap())
    .flatMap((group) => group.pages)
    .map(
      ({ path, updated }) =>
        `<url><loc>${escape(absolute(path))}</loc>${updated ? `<lastmod>${updated}</lastmod>` : ''}</url>`,
    );

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
