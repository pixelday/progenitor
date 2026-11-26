// Checks the built site in dist/ and fails the build (exit 1) if anything is wrong.
// It runs last in `npm run build`, so Cloudflare never deploys a build that fails it.
// Every check prints PASS or FAIL. Loosening a check is its own change, with a stated reason.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';

// Files the host and the launch checks rely on. The list grows with the site.
const REQUIRED = [
  'index.html',
  '404.html',
  'privacy/index.html',
  'terms/index.html',
  '_headers',
  'robots.txt',
  'sitemap-index.xml',
];

// Pages allowed to load JavaScript. Every other page must ship none.
const PAGES_WITH_JS = ['index.html'];

// Gzipped size of all JS in dist/_astro. Measured at 83.4 KB on 2026-11-25: React is about
// 67 KB of it, the island with Base UI's Input and ToggleGroup about 16 KB. Every island
// lives on one page today; move to per-page budgets when that changes.
const JS_BUDGET_KB = 90;

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
const rel = (path) => relative(DIST, path).split(sep).join('/');

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
const robots = existsSync(join(DIST, 'robots.txt')) ? readFileSync(join(DIST, 'robots.txt'), 'utf8') : '';

// 1. Required files.
check(
  'required files exist',
  REQUIRED.filter((name) => !existsSync(join(DIST, name))).map((name) => `missing ${name}`),
);

// 2. Every page carries Astro's CSP <meta>, and every inline script and style is hashed in it.
const inlineBlocks = (html, tag) =>
  [...html.matchAll(new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'gi'))]
    .map((match) => ({ attrs: match[1] ?? '', body: match[2] }))
    .filter(({ attrs }) => !/\ssrc\s*=/.test(attrs) && !/application\/(ld\+)?json/i.test(attrs));
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

// 3. Nothing the CSP would block silently: style attributes and data: URIs.
check(
  'no style="" attributes and no data: URIs in built HTML',
  pages.flatMap(({ name, html }) => [
    ...(/<[^>]+\sstyle\s*=\s*["']/i.test(html) ? [`${name}: style="" attribute`] : []),
    ...(/(src|href|srcset|poster)\s*=\s*["']data:/i.test(html) ? [`${name}: data: URI`] : []),
  ]),
);

// 4. Indexability: exactly one of a noindex robots meta or a canonical link. Never both, never
//    neither. The 404 page is always noindex.
const hasNoindex = (html) => /<meta[^>]*name=["']?robots["']?[^>]*noindex/i.test(html);
const canonicalOf = (html) => html.match(/<link[^>]*rel=["']?canonical["']?[^>]*href="([^"]*)"/i)?.[1];
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

// 5. robots.txt never blocks crawling, before or after launch: a blocked page cannot show
//    its noindex. The <meta name="robots"> does the pre-launch job.
check('robots.txt never blocks everything', /^\s*disallow:\s*\/\s*$/im.test(robots) ? ['"Disallow: /" found'] : []);

// 6. A launched site (its pages carry canonicals) has one origin, names its sitemap in
//    robots.txt, and carries none of the starter's placeholders.
const origins = [
  ...new Set(
    pages
      .map(({ html }) => canonicalOf(html))
      .filter(Boolean)
      .map((url) => new URL(url).origin),
  ),
];
check('a launched site has one origin, a sitemap line in robots.txt and no starter placeholders', [
  ...(origins.length > 1 ? [`canonicals use more than one origin: ${origins.join(', ')}`] : []),
  ...(origins.length === 1 && !robots.includes(`Sitemap: ${origins[0]}/`)
    ? [`robots.txt has no "Sitemap: ${origins[0]}/..." line`]
    : []),
  ...pages.flatMap(({ name, html }) => {
    const canonical = canonicalOf(html);
    if (!canonical) return [];
    return [
      ...(/^https?:\/\/(www\.)?example\.com(\/|$)/i.test(canonical) ? [`${name}: canonical is still example.com`] : []),
      ...(html.includes('data-starter-placeholder') ? [`${name}: starter placeholder text`] : []),
      ...(/<title>[^<]*Site name/.test(html) ? [`${name}: title still says "Site name"`] : []),
    ];
  }),
]);

// 7. JavaScript: only the listed pages load any, and the total stays inside the budget.
const loadsJs = (html) => /<script[\s>]|<astro-island[\s>]/i.test(html);
check(
  `only ${PAGES_WITH_JS.join(', ')} loads JavaScript`,
  pages.filter(({ name, html }) => !PAGES_WITH_JS.includes(name) && loadsJs(html)).map(({ name }) => name),
);
const jsKB =
  files
    .filter((path) => rel(path).startsWith('_astro/') && path.endsWith('.js'))
    .reduce((total, path) => total + gzipSync(readFileSync(path), { level: 9 }).length, 0) / 1024;
check(`JS is ${jsKB.toFixed(1)} KB gzipped (budget ${JS_BUDGET_KB} KB)`, jsKB <= JS_BUDGET_KB ? [] : ['over budget']);

// 8. Internal links, assets and #fragments point at something that exists. Links to pages use
//    the trailing-slash form, which the host serves without a redirect.
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
      const onDisk = join(DIST, target);
      if (!existsSync(onDisk) || !statSync(onDisk).isFile()) {
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

// 9. Residue that should never reach production.
check(
  'no localhost or TODO in built HTML',
  pages.filter(({ html }) => /localhost|\bTODO\b/.test(html)).map(({ name }) => name),
);

// 10. Data never renders as raw HTML.
check(
  'src/ does not use set:html',
  walk('src').filter((path) => /\.(astro|tsx?|jsx?|mdx?)$/.test(path) && readFileSync(path, 'utf8').includes('set:html')),
);

console.log(failed ? '\nverify-dist: FAILED' : `\nverify-dist: ${pages.length} pages checked, all passed`);
process.exit(failed ? 1 : 0);
