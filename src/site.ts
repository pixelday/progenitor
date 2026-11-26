/**
 * The one source of truth for the site's identity. The <head>, canonical URLs and the
 * launch switch all read from here.
 */
type Site = {
  name: string;
  description: string;
  /** Canonical origin, without a trailing slash. */
  url: string;
  /** false: every page says noindex. true: pages carry a canonical URL instead. */
  launched: boolean;
};

export const site: Site = {
  name: 'Site name',
  description: 'One sentence that says what this site is.',
  url: 'https://example.com',
  launched: false,
};
