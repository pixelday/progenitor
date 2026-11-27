import { site } from '../site';

/**
 * The page registry: one entry per fixed page. Each page file reads its title and
 * description from here, and so do the sitemap page, sitemap.xml, llms.txt and the footer.
 * A page added to src/pages/ but not here fails the build (scripts/verify-dist.mjs).
 */
export type PageEntry = {
  /**
   * Root-relative, the form the host serves without a redirect: no trailing slash for a
   * page, and a slash only for a folder's index.html, such as the home page.
   */
  path: string;
  title: string;
  description: string;
  /** YYYY-MM-DD. Becomes <lastmod> in sitemap.xml. */
  updated?: string;
};

export const pages = {
  home: { path: '/', title: 'Home', description: site.description },
  privacy: {
    path: '/privacy-policy',
    title: 'Privacy policy',
    description: 'What this site stores on your device, and what it never collects.',
    updated: site.legalUpdated,
  },
  terms: {
    path: '/terms',
    title: 'Terms',
    description: 'Terms of use, the content license and credits.',
    updated: site.legalUpdated,
  },
  accessibility: {
    path: '/accessibility',
    title: 'Accessibility',
    description: 'The accessibility standard this site aims for, and how to report a barrier.',
    updated: site.legalUpdated,
  },
  sitemap: { path: '/sitemap', title: 'Sitemap', description: 'Every page on this site, in one list.' },
} satisfies Record<string, PageEntry>;

/** The footer of every page links these three. */
export const legalPages: PageEntry[] = [pages.privacy, pages.terms, pages.accessibility];

/** Absolute URL from config, never from the request. */
export const absolute = (path: string) => new URL(path, site.url).href;
