/**
 * The one source of truth for the site's identity. The <head>, the share card, structured
 * data, the web manifest, robots.txt, sitemap.xml and llms.txt all read from here, so they
 * cannot disagree.
 */
type Site = {
  name: string;
  /** The home-screen label. Keep it to 12 characters or fewer. */
  shortName: string;
  description: string;
  /** Canonical origin, without a trailing slash. */
  url: string;
  /** Language of the content: a BCP 47 tag for <html lang>, and its Open Graph form. */
  lang: string;
  locale: string;
  /**
   * The browser's toolbar color in each color scheme, as hex. Keep each equal to the page
   * background, the `bg` token in panda.config.ts: src/lib/contrast.test.ts checks it. The
   * web manifest takes one color, the light one.
   */
  themeColor: { light: string; dark: string };
  /**
   * The share card: a 1200x630 PNG in public/. The alt text says what the image shows.
   * Previews are cached by every platform: to change the card, add the new file under a new
   * name and change the path here.
   */
  shareImage: { path: string; alt: string };
  /** Who publishes the site, for structured data. Leave null unless it is true. */
  publisher: { type: 'Organization' | 'Person'; name: string } | null;
  /** Where a visitor reports a problem: an email alias, never a personal address. */
  contact: string | null;
  /** The date the privacy, terms and accessibility pages last changed (YYYY-MM-DD). */
  legalUpdated: string;
  /**
   * THE LAUNCH SWITCH. One value, six consumers:
   *   false  every page says noindex, and nothing states an absolute URL.
   *   true   pages carry a canonical, a share card and structured data; robots.txt names
   *          the sitemap; sitemap.xml and (if AI crawlers are allowed) llms.txt exist.
   * scripts/verify-dist.mjs fails a build where the consumers disagree.
   */
  launched: boolean;
  /**
   * AI crawlers. One value, two consumers:
   *   'allow'  robots.txt welcomes them and llms.txt is published.
   *   'block'  robots.txt disallows the named agents and there is no llms.txt.
   * robots.txt is advisory. Enforcement is in the Cloudflare dashboard, which must agree
   * (docs/setup/4-launch.md, part 5).
   */
  aiCrawlers: 'allow' | 'block';
};

export const site: Site = {
  name: 'Site name',
  shortName: 'Site',
  description: 'One sentence that says what this site is.',
  url: 'https://example.com',
  lang: 'en',
  locale: 'en_US',
  themeColor: { light: '#ffffff', dark: '#030712' },
  shareImage: { path: '/social.png', alt: 'Describe the share image here.' },
  publisher: null,
  contact: null,
  legalUpdated: '2026-11-25',
  launched: false,
  aiCrawlers: 'allow',
};
