import type { APIRoute } from 'astro';
import { site } from '../site';

// robots.txt never blocks crawling, even before launch: a blocked page cannot show its
// noindex, so the <meta name="robots"> in the layout does the pre-launch job instead.
// The sitemap is named only once the site is launched and the URL is the real one.
export const GET: APIRoute = () => {
  const lines = ['User-agent: *', 'Allow: /'];
  if (site.launched) lines.push('', `Sitemap: ${new URL('/sitemap-index.xml', site.url).href}`);
  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
