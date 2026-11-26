import { getCollection } from 'astro:content';
import { legalPages, pages, type PageEntry } from './pages';
import { isoDate, recordHref } from './records';

export type PageGroup = { heading: string; pages: PageEntry[] };

/**
 * Every indexable page, in the groups the sitemap page and llms.txt show. Build time only:
 * it reads the collection, so no island may import this file.
 */
export async function siteMap(): Promise<PageGroup[]> {
  const records = (await getCollection('records'))
    .sort((a, b) => a.data.name.localeCompare(b.data.name))
    .map(({ id, data }) => ({
      path: recordHref(id),
      title: data.name,
      description: data.summary,
      updated: isoDate(data.updated),
    }));

  return [
    { heading: 'Main pages', pages: [pages.home] },
    { heading: 'Records', pages: records },
    { heading: 'Legal', pages: legalPages },
    { heading: 'More', pages: [pages.sitemap] },
  ];
}
