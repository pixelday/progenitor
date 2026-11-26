// Checks the built site in dist/ and fails the build (exit 1) if anything is wrong.
// It runs last in `npm run build`, so Cloudflare never deploys a build that fails it.
// Every check prints PASS or FAIL. Loosening a check is its own change, with a stated reason.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';

// The share image's file name is a setting, because a new name is how a cached preview gets
// replaced. It is read from src/site.ts, so the image is checked before launch as well.
const SHARE_IMAGE = readFileSync('src/site.ts', 'utf8').match(/shareImage:\s*\{\s*path:\s*'\/([^']+)'/)?.[1];

// Files the host and the launch checks rely on. The list grows with the site.
// sitemap.xml and llms.txt are not here: they exist only on a launched site (check 7).
const REQUIRED = [
  'index.html',
  '404.html',
  'privacy-policy/index.html',
  'terms/index.html',
  'accessibility/index.html',
  'sitemap/index.html',
  '_headers',
  'robots.txt',
  'manifest.webmanifest',
  'favicon.ico',
  'favicon.svg',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  SHARE_IMAGE ?? 'the share image (no shareImage.path found in src/site.ts)',
];

// Raster files and the pixel size each must have.
const PNG_SIZES = {
  'apple-touch-icon.png': [180, 180],
  'icon-192.png': [192, 192],
  'icon-512.png': [512, 512],
  ...(SHARE_IMAGE && { [SHARE_IMAGE]: [1200, 630] }),
};

// The starter's own icons and share image, by SHA-256. A launched site must have replaced them.
const STARTER_ASSETS = {
  'favicon.svg': 'd581fc010024c7150fef6410676a31f4958fe746329c6c450b28390da99dc80c',
  'favicon.ico': '73169e7fead41469b2c8327e6e60be82d49195f319056bad0efe6c8afa25f97b',
  [SHARE_IMAGE]: '9291d8a6c8677d9a3f08c50ea6826dfac532bf476ecfda5d14d1fe2f02f73b97',
};
// The starter's share image alt text. A launched site must have written its own.
const STARTER_ALT = 'Describe the share image here.';

// Pages allowed to load JavaScript. Every other page must ship none.
const PAGES_WITH_JS = ['index.html'];

// Gzipped size of all JS in dist/_astro. Measured at 83.4 KB on 2026-11-25: React is about
// 67 KB of it, the island with Base UI's Input and ToggleGroup about 16 KB. Every island
// lives on one page today; move to per-page budgets when that changes.
const JS_BUDGET_KB = 90;

// The one file allowed to render a raw string (structured data, with "<" escaped).
const SET_HTML_ALLOWED = ['src/components/JsonLd.astro'];

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
const rel = (path) => relative(DIST, path).split(sep).join('/');
const inDist = (name) => existsSync(join(DIST, name)) && statSync(join(DIST, name)).isFile();
const text = (name) => (inDist(name) ? readFileSync(join(DIST, name), 'utf8') : '');

let failed = false;
function check(name, problems) {
  if (problems.length === 0) {
    console.log(`PASS  ${name}`);
    return;
  }
  failed = true;
  console.log(`FAIL  ${name}`);
  for (const problem of problems.slice(0, 20)) console.log(`      ${problem}`);
  if (problems.length > 20) console.log(`      ...and ${problems.length - 20} more`);
}

if (!existsSync(DIST)) {
  console.log(`FAIL  ${DIST}/ does not exist. Run "astro build" first.`);
  process.exit(1);
}

const files = walk(DIST);
const pages = files
  .filter((path) => path.endsWith('.html'))
  .map((path) => ({ name: rel(path), html: readFileSync(path, 'utf8') }));
const robots = text('robots.txt');

// Small readers for built HTML. Astro writes double-quoted attributes.
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'))?.[1];
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? [];
const meta = (html, key) =>
  tags(html, 'meta')
    .filter((tag) => attr(tag, 'name') === key || attr(tag, 'property') === key)
    .map((tag) => attr(tag, 'content') ?? '');
const linkHref = (html, relValue) =>
  tags(html, 'link')
    .filter((tag) => attr(tag, 'rel') === relValue)
    .map((tag) => attr(tag, 'href') ?? '');
const titleOf = (html) => html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '';
const hasNoindex = (html) => meta(html, 'robots').some((content) => /noindex/i.test(content));
const canonicalOf = (html) => linkHref(html, 'canonical')[0];
const jsonLdBlocks = (html) =>
  [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
// The path a built page is served at: index.html -> /, terms/index.html -> /terms/.
const servedPath = (name) => `/${name.replace(/index\.html$/, '')}`;

// 1. Required files.
check(
  'required files exist',
  REQUIRED.filter((name) => !inDist(name)).map((name) => `missing ${name}`),
);

// 2. Every page carries Astro's CSP <meta>, and every inline script and style is hashed in it,
//    structured-data blocks included.
const inlineBlocks = (html, tag) =>
  [...html.matchAll(new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'gi'))]
    .map((match) => ({ attrs: match[1] ?? '', body: match[2] }))
    .filter(({ attrs }) => !/\ssrc\s*=/.test(attrs));
const hashes = (body) =>
  ['sha256', 'sha384', 'sha512'].map((alg) => `'${alg}-${createHash(alg).update(body).digest('base64')}'`);

const cspProblems = [];
for (const { name, html } of pages) {
  const policy = html.match(/<meta[^>]*http-equiv=["']?content-security-policy["']?[^>]*content="([^"]*)"/i)?.[1];
  if (!policy) {
    cspProblems.push(`${name}: no Content-Security-Policy <meta>`);
    continue;
  }
  for (const tag of ['script', 'style']) {
    for (const { body } of inlineBlocks(html, tag)) {
      if (!hashes(body).some((hash) => policy.includes(hash))) {
        cspProblems.push(`${name}: inline <${tag}> with no hash in the policy: ${body.slice(0, 60)}...`);
      }
    }
  }
}
check('CSP <meta> on every page, with a hash for every inline script and style', cspProblems);

// 3. Nothing the CSP would block silently, and nothing the HTML checker rejects: style
//    attributes, data: URIs, and a <style> element outside <head>.
check(
  'no style="" attributes, no data: URIs and no <style> in <body>',
  pages.flatMap(({ name, html }) => [
    ...(/<[^>]+\sstyle\s*=\s*["']/i.test(html) ? [`${name}: style="" attribute`] : []),
    ...(/(src|href|srcset|poster)\s*=\s*["']data:/i.test(html) ? [`${name}: data: URI`] : []),
    ...(/<style[\s>]/i.test(html.slice(html.search(/<body[\s>]/i))) ? [`${name}: <style> in <body>`] : []),
  ]),
);

// 4. The floor every page stands on: language, charset first, a zoomable viewport, a unique
//    title, a description, the icon links, the manifest link and exactly one <h1>.
const titles = new Map();
for (const { name, html } of pages) titles.set(titleOf(html), [...(titles.get(titleOf(html)) ?? []), name]);
check(
  'every page has lang, charset, viewport, a unique title, a description, icons and one <h1>',
  pages.flatMap(({ name, html }) => {
    const viewport = meta(html, 'viewport')[0] ?? '';
    const sameTitle = titles.get(titleOf(html));
    const icons = linkHref(html, 'icon');
    return [
      ...(/<html[^>]*\slang="[a-z]{2,3}(-[A-Za-z0-9]+)*"/.test(html) ? [] : [`${name}: <html> has no lang`]),
      ...(/<head[^>]*>\s*<meta charset="utf-8">/i.test(html) ? [] : [`${name}: <meta charset> is not first in <head>`]),
      ...(/width=device-width/.test(viewport) ? [] : [`${name}: no viewport`]),
      ...(/user-scalable\s*=\s*(no|0)|maximum-scale/i.test(viewport) ? [`${name}: viewport disables zoom`] : []),
      ...(titleOf(html).trim() === '' ? [`${name}: empty <title>`] : []),
      ...(sameTitle.length > 1 ? [`${name}: shares its <title> with ${sameTitle.filter((other) => other !== name).join(', ')}`] : []),
      ...((meta(html, 'description')[0] ?? '').trim() === '' ? [`${name}: no meta description`] : []),
      ...(meta(html, 'theme-color').length === 1 ? [] : [`${name}: no theme-color`]),
      ...(icons.includes('/favicon.ico') && icons.includes('/favicon.svg') ? [] : [`${name}: missing an icon link`]),
      ...(linkHref(html, 'apple-touch-icon').length === 1 ? [] : [`${name}: no apple-touch-icon link`]),
      ...(linkHref(html, 'manifest').length === 1 ? [] : [`${name}: no manifest link`]),
      ...((html.match(/<h1[\s>]/gi) ?? []).length === 1 ? [] : [`${name}: needs exactly one <h1>`]),
    ];
  }),
);

// 5. Icons and the share card are what their names say. A PNG renamed to .ico works only
//    because browsers sniff it, and a wrong-sized share card is cropped by every platform.
const bytes = (name) => (inDist(name) ? readFileSync(join(DIST, name)) : Buffer.alloc(0));
const PNG_SIGNATURE = '89504e470d0a1a0a';
// The sizes inside an ICO file: a 6-byte header, then one 16-byte entry per image.
const icoSizes = (data) =>
  data.subarray(0, 4).toString('hex') === '00000100'
    ? Array.from({ length: data.readUInt16LE(4) }, (_, i) => `${data[6 + 16 * i] || 256}x${data[7 + 16 * i] || 256}`)
    : null;
const ico = icoSizes(bytes('favicon.ico'));
let manifest = null;
try {
  manifest = JSON.parse(text('manifest.webmanifest'));
} catch {
  // Reported below.
}
check('icons, share card and manifest are well formed', [
  ...(ico === null ? ['favicon.ico is not an ICO file'] : []),
  ...(ico !== null && !ico.includes('32x32') ? [`favicon.ico holds ${ico.join(', ') || 'no images'}, but the page links it as 32x32`] : []),
  ...(/<svg[\s>]/.test(text('favicon.svg')) ? [] : ['favicon.svg is not an SVG file']),
  ...Object.entries(PNG_SIZES).flatMap(([name, [width, height]]) => {
    const data = bytes(name);
    if (data.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) return [`${name} is not a PNG file`];
    const size = `${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`;
    return size === `${width}x${height}` ? [] : [`${name} is ${size}, expected ${width}x${height}`];
  }),
  ...(manifest === null
    ? ['manifest.webmanifest is not valid JSON']
    : [
        ...(manifest.name && manifest.short_name ? [] : ['manifest has no name or short_name']),
        ...(Array.isArray(manifest.icons) && manifest.icons.length > 0 ? [] : ['manifest lists no icons']),
        ...(manifest.icons ?? [])
          .filter((icon) => !inDist(String(icon.src).replace(/^\//, '')))
          .map((icon) => `manifest icon ${icon.src} does not exist`),
      ]),
]);

// 6. Indexability: exactly one of a noindex robots meta or a canonical link. Never both, never
//    neither. The 404 page is always noindex.
check(
  'each page has exactly one of noindex or canonical; 404 is noindex',
  pages.flatMap(({ name, html }) => {
    const noindex = hasNoindex(html);
    const canonical = canonicalOf(html);
    if (name === '404.html') return noindex && !canonical ? [] : [`${name}: must be noindex with no canonical`];
    if (noindex && canonical) return [`${name}: both noindex and canonical`];
    if (!noindex && !canonical) return [`${name}: neither noindex nor canonical`];
    return [];
  }),
);

// 7. The launch switch moves every consumer together, or the build fails. A site is launched
//    when its pages carry canonicals. Launched: one origin; every page has a share card whose
//    URL is its canonical; robots.txt names sitemap.xml; sitemap.xml lists exactly the
//    indexable pages; structured data parses. Not launched: nothing states an absolute URL,
//    and neither sitemap.xml nor llms.txt exists.
const indexable = pages.filter(({ html }) => canonicalOf(html));
const launched = indexable.length > 0;
const origins = [...new Set(indexable.map(({ html }) => new URL(canonicalOf(html)).origin))];
const origin = origins[0];
const sitemapLocs = [...text('sitemap.xml').matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
const blocksAi = /^user-agent:\s*GPTBot\s*$/im.test(robots);
const switchProblems = [];
if (launched) {
  if (origins.length > 1) switchProblems.push(`canonicals use more than one origin: ${origins.join(', ')}`);
  if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`)) switchProblems.push(`robots.txt has no "Sitemap: ${origin}/sitemap.xml" line`);
  if (!inDist('sitemap.xml')) switchProblems.push('sitemap.xml does not exist');
  const canonicals = indexable.map(({ html }) => canonicalOf(html));
  for (const url of canonicals.filter((url) => !sitemapLocs.includes(url))) switchProblems.push(`sitemap.xml does not list ${url}`);
  for (const url of sitemapLocs.filter((url) => !canonicals.includes(url))) switchProblems.push(`sitemap.xml lists ${url}, which is not an indexable page`);
  if (inDist('llms.txt') === blocksAi) {
    switchProblems.push(blocksAi ? 'llms.txt exists although robots.txt blocks AI crawlers' : 'llms.txt is missing although robots.txt allows AI crawlers');
  }
  for (const { name, html } of indexable) {
    const canonical = canonicalOf(html);
    const image = meta(html, 'og:image')[0] ?? '';
    if (servedPath(name) !== new URL(canonical).pathname) switchProblems.push(`${name}: canonical ${canonical} is not this page`);
    if (meta(html, 'og:url')[0] !== canonical) switchProblems.push(`${name}: og:url is not the canonical`);
    for (const key of ['og:type', 'og:site_name', 'og:locale', 'og:title', 'og:description', 'og:image:alt', 'twitter:card']) {
      if ((meta(html, key)[0] ?? '').trim() === '') switchProblems.push(`${name}: no ${key}`);
    }
    if (!image.startsWith(`${origin}/`) || !inDist(image.slice(origin.length + 1))) switchProblems.push(`${name}: og:image "${image}" is not a file on this site`);
    for (const block of jsonLdBlocks(html)) {
      try {
        if (JSON.parse(block)['@context'] !== 'https://schema.org') switchProblems.push(`${name}: structured data has no schema.org @context`);
      } catch {
        switchProblems.push(`${name}: structured data is not valid JSON`);
      }
    }
  }
  if (!jsonLdBlocks(text('index.html')).some((block) => /"@type":"WebSite"/.test(block))) switchProblems.push('index.html: no WebSite structured data');
} else {
  if (/^sitemap:/im.test(robots)) switchProblems.push('robots.txt names a sitemap before launch');
  for (const name of ['sitemap.xml', 'llms.txt']) if (inDist(name)) switchProblems.push(`${name} exists before launch`);
  for (const { name, html } of pages) {
    if (meta(html, 'og:url').length || meta(html, 'og:image').length) switchProblems.push(`${name}: share card before launch`);
    if (jsonLdBlocks(html).length) switchProblems.push(`${name}: structured data before launch`);
  }
}
check(`the launch switch is applied everywhere (this build is ${launched ? 'LAUNCHED' : 'not launched'})`, switchProblems);

// 8. The sitemap page links every built page except the 404, so a page cannot be added
//    without entering the registry (src/lib/pages.ts) that sitemap.xml and llms.txt read.
const sitemapPageLinks = new Set(tags(text('sitemap/index.html'), 'a').map((tag) => attr(tag, 'href')));
check(
  'the sitemap page lists every page',
  pages
    .filter(({ name }) => name !== '404.html' && !sitemapPageLinks.has(servedPath(name)))
    .map(({ name }) => `${servedPath(name)} is built but is not on the sitemap page: add it to src/lib/pages.ts`),
);

// 9. A launched site carries none of the starter's placeholders.
check('a launched site has no starter placeholders', [
  ...(launched
    ? Object.entries(STARTER_ASSETS)
        .filter(([name, sha256]) => createHash('sha256').update(bytes(name)).digest('hex') === sha256)
        .map(([name]) => `${name} is still the starter's: replace it in public/`)
    : []),
  ...indexable.flatMap(({ name, html }) => [
    ...(/^https?:\/\/(www\.)?example\.com(\/|$)/i.test(canonicalOf(html)) ? [`${name}: canonical is still example.com`] : []),
    ...(html.includes('data-starter-placeholder') ? [`${name}: starter placeholder text`] : []),
    ...(/<title>[^<]*Site name/.test(html) ? [`${name}: title still says "Site name"`] : []),
    ...(meta(html, 'og:image:alt')[0] === STARTER_ALT ? [`${name}: share image alt is still the starter's`] : []),
  ]),
]);

// 10. robots.txt never blocks crawling, before or after launch: a blocked page cannot show
//     its noindex. The <meta name="robots"> does the pre-launch job.
const blocksAll = robots
  .split(/\n\s*\n/)
  .some((group) => /^user-agent:\s*\*\s*$/im.test(group) && /^disallow:\s*\/\s*$/im.test(group));
check('robots.txt never blocks everything', blocksAll ? ['"Disallow: /" applies to every crawler'] : []);

// 11. JavaScript: only the listed pages load any, and the total stays inside the budget.
//     A structured-data block is data, not script.
const loadsJs = (html) =>
  /<script[\s>]|<astro-island[\s>]/i.test(html.replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, ''));
check(
  `only ${PAGES_WITH_JS.join(', ')} loads JavaScript`,
  pages.filter(({ name, html }) => !PAGES_WITH_JS.includes(name) && loadsJs(html)).map(({ name }) => name),
);
const jsKB =
  files
    .filter((path) => rel(path).startsWith('_astro/') && path.endsWith('.js'))
    .reduce((total, path) => total + gzipSync(readFileSync(path), { level: 9 }).length, 0) / 1024;
check(`JS is ${jsKB.toFixed(1)} KB gzipped (budget ${JS_BUDGET_KB} KB)`, jsKB <= JS_BUDGET_KB ? [] : ['over budget']);

// 12. Internal links, assets and #fragments point at something that exists. Links to pages use
//     the trailing-slash form, which the host serves without a redirect.
const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
const pageByName = new Map(pages.map((page) => [page.name, page]));
const linkProblems = [];
for (const { name, html } of pages) {
  const urls = [...html.matchAll(/\s(?:href|src|component-url|renderer-url)="([^"]*)"/g)].map((match) => match[1]);
  for (const url of urls) {
    if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) continue; // absolute URL: not ours to check
    const [pathAndQuery, fragment] = url.split('#');
    const path = pathAndQuery.split('?')[0];
    let target = name;
    if (path !== '') {
      if (!path.startsWith('/')) {
        linkProblems.push(`${name}: relative link "${url}" (use a root-relative path)`);
        continue;
      }
      target = path.endsWith('/') ? `${path.slice(1)}index.html` : path.slice(1);
      if (!inDist(target)) {
        linkProblems.push(`${name}: "${url}" does not exist in ${DIST}/ (page links end with a slash)`);
        continue;
      }
    }
    if (fragment && pageByName.has(target) && !idsOf(pageByName.get(target).html).has(fragment)) {
      linkProblems.push(`${name}: "${url}" points at a missing id`);
    }
  }
}
check('internal links, assets and #fragments resolve', linkProblems);

// 13. Residue that should never reach production.
check(
  'no localhost or TODO in built HTML',
  pages.filter(({ html }) => /localhost|\bTODO\b/.test(html)).map(({ name }) => name),
);

// 14. Data never renders as raw HTML. The structured-data component is the one exception.
check(
  `src/ uses set:html only in ${SET_HTML_ALLOWED.join(', ')}`,
  walk('src')
    .map((path) => path.split(sep).join('/'))
    .filter((path) => /\.(astro|tsx?|jsx?|mdx?)$/.test(path) && !SET_HTML_ALLOWED.includes(path))
    .filter((path) => /set:html|dangerouslySetInnerHTML/.test(readFileSync(path, 'utf8'))),
);

console.log(failed ? '\nverify-dist: FAILED' : `\nverify-dist: ${pages.length} pages checked, all passed`);
process.exit(failed ? 1 : 0);
