import type { APIRoute } from 'astro';
import { absolute } from '../lib/pages';
import { siteMap } from '../lib/site-map';
import { site } from '../site';

// A plain-language index of the site for AI systems, in the llms.txt format: a title, a
// summary, then a list of links per section. It is a consumer of both switches in
// src/site.ts: it exists only on a launched site that allows AI crawlers.
export const GET: APIRoute = async () => {
  if (!site.launched || site.aiCrawlers !== 'allow') return new Response(null, { status: 204 });

  const sections = (await siteMap()).map(
    ({ heading, pages }) =>
      `## ${heading}\n\n${pages.map(({ path, title, description }) => `- [${title}](${absolute(path)}): ${description}`).join('\n')}`,
  );

  return new Response(`# ${site.name}\n\n> ${site.description}\n\n${sections.join('\n\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
