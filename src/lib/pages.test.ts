import { describe, expect, it } from 'vitest';
import { site } from '../site';
import { absolute, legalPages, pages } from './pages';

describe('site identity', () => {
  it('has an absolute https origin with no trailing slash', () => {
    expect(site.url).toMatch(/^https:\/\/[^/]+$/);
    expect(new URL(site.url).origin).toBe(site.url);
  });

  it('builds absolute URLs from config', () => {
    expect(absolute('/terms/')).toBe(`${site.url}/terms/`);
    expect(absolute(site.shareImage.path)).toBe(`${site.url}${site.shareImage.path}`);
  });

  it('keeps the home-screen label short and the legal date well formed', () => {
    expect(site.shortName.length).toBeLessThanOrEqual(12);
    expect(site.legalUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('page registry', () => {
  const entries = Object.values(pages);

  it('uses unique root-relative paths that end with a slash', () => {
    for (const { path } of entries) expect(path).toMatch(/^\/([a-z0-9-]+\/)*$/);
    expect(new Set(entries.map(({ path }) => path)).size).toBe(entries.length);
  });

  it('gives every page a title and a description', () => {
    for (const { title, description } of entries) {
      expect(title.trim()).not.toBe('');
      expect(description.trim()).not.toBe('');
    }
  });

  it('lists privacy, terms and accessibility as the legal pages', () => {
    expect(legalPages.map(({ path }) => path)).toEqual(['/privacy-policy/', '/terms/', '/accessibility/']);
  });
});
