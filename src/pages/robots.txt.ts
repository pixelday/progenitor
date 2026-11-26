import type { APIRoute } from 'astro';
import { absolute } from '../lib/pages';
import { site } from '../site';

// robots.txt never blocks crawling, even before launch: a blocked page cannot show its
// noindex, so the <meta name="robots"> in the layout does the pre-launch job instead.
// The sitemap is named only once the site is launched and the URL is the real one.

// The agents that 'block' names, as of 2026-11-25. Check each vendor's documentation before
// relying on the list: the names change, and robots.txt is a request, not a control.
const AI_AGENTS = ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'Google-Extended', 'PerplexityBot'];

export const GET: APIRoute = () => {
  const lines = ['User-agent: *', 'Allow: /'];
  if (site.aiCrawlers === 'block') {
    for (const agent of AI_AGENTS) lines.push('', `User-agent: ${agent}`, 'Disallow: /');
  }
  if (site.launched) lines.push('', `Sitemap: ${absolute('/sitemap.xml')}`);
  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
