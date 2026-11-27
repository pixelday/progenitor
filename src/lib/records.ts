import type { CollectionEntry } from 'astro:content';

/**
 * The slim shape sent to the browser. Island props are serialized into the page's HTML,
 * so include only the fields the list and its filters read. Detail pages read the full
 * entry at build time and ship no data at all.
 */
export type RecordSummary = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  summary: string;
  /** YYYY-MM-DD */
  updated: string;
};

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export function toSummary({ id, data }: CollectionEntry<'records'>): RecordSummary {
  return {
    id,
    name: data.name,
    category: data.category,
    tags: data.tags,
    summary: data.summary,
    updated: isoDate(data.updated),
  };
}

/** No trailing slash on purpose: it is the form the host serves without a redirect. */
export const recordHref = (id: string) => `/records/${id}`;
