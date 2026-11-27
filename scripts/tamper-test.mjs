// Tests the checker, not the site. Breaks a built site on purpose, one way per case, and
// confirms that scripts/verify-dist.mjs prints FAIL for exactly the checks that case should
// trip. A PASS line here means verify-dist caught the break.
//
//   npm run tamper
//
// It needs no build first and leaves dist/ alone. It copies the project into a temporary
// folder and builds it twice: as a site that is not launched, and as a launched site with
// test values, because some checks run only on a launched site. Each case copies one of the
// two builds, breaks it and runs verify-dist there. Every check in verify-dist must have a
// case: a check added without one fails this script.
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  appendFileSync,
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '..');
const VERIFY = join(ROOT, 'scripts/verify-dist.mjs');
const ASTRO = join(ROOT, 'node_modules/astro/bin/astro.mjs');

// Each check in verify-dist, by the start of the line it prints.
const CHECKS = {
  noDist: /^dist\/ does not exist/,
  required: /^required files exist/,
  csp: /^CSP <meta> on every page/,
  inline: /^no style="" attributes/,
  floor: /^every page has lang/,
  icons: /^icons, share card and manifest/,
  indexing: /^each page has exactly one of noindex or canonical/,
  launch: /^the launch switch is applied everywhere/,
  sitemapPage: /^the sitemap page lists every page/,
  placeholders: /^a launched site has no starter placeholders/,
  robots: /^robots\.txt never blocks everything/,
  jsPages: /^only .+ loads JavaScript/,
  jsBudget: /^JS is .+ gzipped/,
  cssBudget: /^CSS is .+ gzipped/,
  pageBudget: /^the largest page/,
  links: /^internal links, assets and #fragments resolve/,
  residue: /^no localhost or TODO/,
  setHtml: /^src\/ uses set:html only/,
  hostLimits: /^\d+ files \(limit/,
};
// The one check that stops verify-dist before the others run.
const EARLY_EXIT = ['noDist'];

// A site that has replaced the starter's name is a site, not the starter. Its icons are its
// own, so the cases that need the starter's icons cannot run there.
const isStarter = /^\s*name: 'Site name',$/m.test(readFileSync(join(ROOT, 'src/site.ts'), 'utf8'));

// ---------------------------------------------------------------------------------------
// Helpers for cases. `d` is the case's folder; `dist/` and `src/` are inside it.

const dist = (d, file) => join(d, 'dist', file);
const read = (d, file) => readFileSync(dist(d, file), 'utf8');
const write = (d, file, content) => writeFileSync(dist(d, file), content);
const remove = (d, file) => rmSync(dist(d, file), { recursive: true });

/** Replaces `from` in a built file and fails the case if it was not there to replace. */
function edit(d, file, from, to) {
  const before = read(d, file);
  const after = before.replace(from, to);
  if (after === before) throw new Error(`the tamper did not apply: ${from} is not in ${file}`);
  write(d, file, after);
}
/** Adds markup just before </head> or just after the opening <main> of a page. */
const inHead = (d, file, markup) => edit(d, file, '</head>', `${markup}</head>`);
const inMain = (d, file, markup) => edit(d, file, /<main[^>]*>/, (main) => `${main}${markup}`);
/** Random bytes do not compress, so they push a gzipped size up by their own size. */
const incompressible = (kb) => randomBytes(kb * 1024);
const fromRepo = (d, file) => copyFileSync(join(ROOT, 'public', file), dist(d, file));
/** The first script file the home page loads. */
const scriptOf = (d) => read(d, 'index.html').match(/component-url="([^"]+)"/)[1];

// ---------------------------------------------------------------------------------------
// The cases. `base` is the build a case starts from: 'site' (not launched) or 'launched'.
// `fails` is every check that must print FAIL, and no other may.

const T = 'terms/index.html';

const cases = [
  // verify-dist stops at once without a build.
  { name: 'no dist/ folder', base: 'site', fails: ['noDist'], tamper: (d) => rmSync(join(d, 'dist'), { recursive: true }) },

  // 1. Required files.
  { name: '404.html is missing', base: 'site', fails: ['required'], tamper: (d) => remove(d, '404.html') },
  { name: '_headers is missing', base: 'site', fails: ['required'], tamper: (d) => remove(d, '_headers') },
  { name: 'the accessibility page is missing', base: 'site', fails: ['required', 'links'], tamper: (d) => remove(d, 'accessibility') },
  { name: 'the manifest is missing', base: 'site', fails: ['required', 'icons', 'links'], tamper: (d) => remove(d, 'manifest.webmanifest') },

  // 2. The CSP <meta>, with a hash for every inline block.
  { name: 'a page has no CSP <meta>', base: 'site', fails: ['csp'], tamper: (d) => edit(d, T, /<meta http-equiv="content-security-policy"[^>]*>/, '') },
  { name: 'an inline <style> in <head> has no hash', base: 'site', fails: ['csp'], tamper: (d) => inHead(d, T, '<style>p{color:red}</style>') },
  { name: 'an inline <script> was changed after hashing', base: 'site', fails: ['csp'], tamper: (d) => edit(d, 'index.html', '<script>(function(){', '<script>(function(){0;') },
  { name: 'a structured-data block has no hash', base: 'launched', fails: ['csp'], tamper: (d) => inHead(d, T, '<script type="application/ld+json">{"@context":"https://schema.org"}</script>') },

  // 3. Nothing the CSP blocks silently.
  { name: 'a style="" attribute', base: 'site', fails: ['inline'], tamper: (d) => edit(d, T, '<h1>', '<h1 style="color:red">') },
  { name: 'a data: URI', base: 'site', fails: ['inline'], tamper: (d) => inMain(d, T, '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="">') },
  { name: 'a <style> in <body>', base: 'site', fails: ['inline', 'csp'], tamper: (d) => inMain(d, T, '<style>p{}</style>') },

  // 4. The floor every page stands on.
  { name: '<html> has no lang', base: 'site', fails: ['floor'], tamper: (d) => edit(d, T, '<html lang="en">', '<html>') },
  { name: '<meta charset> is not first', base: 'site', fails: ['floor'], tamper: (d) => edit(d, T, '<head><meta charset="utf-8">', '<head><meta name="x" content="y"><meta charset="utf-8">') },
  { name: 'no viewport', base: 'site', fails: ['floor'], tamper: (d) => edit(d, T, /<meta name="viewport"[^>]*>/, '') },
  { name: 'the viewport disables zoom', base: 'site', fails: ['floor'], tamper: (d) => edit(d, T, 'initial-scale=1"', 'initial-scale=1, maximum-scale=1"') },
  { name: 'an empty <title>', base: 'site', fails: ['floor'], tamper: (d) => edit(d, T, /<title>[^<]*<\/title>/, '<title></title>') },
  { name: 'two pages share a title', base: 'site', fails: ['floor'], tamper: (d) => edit(d, T, /<title>[^<]*<\/title>/, read(d, 'privacy-policy/index.html').match(/<title>[^<]*<\/title>/)[0]) },
  { name: 'no meta description', base: 'site', fails: ['floor'], tamper: (d) => edit(d, T, /<meta name="description"[^>]*>/, '') },
  { name: 'no theme-color', base: 'site', fails: ['floor'], tamper: (d) => edit(d, T, /<meta name="theme-color"[^>]*>/g, '') },
  { name: 'an empty theme-color', base: 'site', fails: ['floor'], tamper: (d) => edit(d, T, /(<meta name="theme-color"[^>]*content=")[^"]*"/, '$1"') },
  {
    name: 'two theme-colors for the same scheme',
    base: 'site',
    fails: ['floor'],
    tamper: (d) => {
      edit(d, T, /<meta name="theme-color"[^>]*>/g, '');
      const light = '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">';
      inHead(d, T, light + light);
    },
  },
  {
    name: 'two theme-colors with no scheme',
    base: 'site',
    fails: ['floor'],
    tamper: (d) => {
      edit(d, T, /<meta name="theme-color"[^>]*>/g, '');
      inHead(d, T, '<meta name="theme-color" content="#ffffff"><meta name="theme-color" content="#000000">');
    },
  },
  { name: 'no favicon.svg link', base: 'site', fails: ['floor'], tamper: (d) => edit(d, T, /<link rel="icon" href="\/favicon\.svg"[^>]*>/, '') },
  { name: 'no apple-touch-icon link', base: 'site', fails: ['floor'], tamper: (d) => edit(d, T, /<link rel="apple-touch-icon"[^>]*>/, '') },
  { name: 'no manifest link', base: 'site', fails: ['floor'], tamper: (d) => edit(d, T, /<link rel="manifest"[^>]*>/, '') },
  { name: 'two <h1>', base: 'site', fails: ['floor'], tamper: (d) => inMain(d, T, '<h1>Again</h1>') },
  { name: 'no <h1>', base: 'site', fails: ['floor'], tamper: (d) => edit(d, T, /<h1>([^<]*)<\/h1>/, '<h2>$1</h2>') },

  // 5. Icons, share card and manifest.
  { name: 'favicon.ico is a PNG', base: 'site', fails: ['icons'], tamper: (d) => copyFileSync(dist(d, 'icon-192.png'), dist(d, 'favicon.ico')) },
  {
    name: 'favicon.ico holds no 32x32 image',
    base: 'site',
    fails: ['icons'],
    tamper: (d) => {
      const ico = readFileSync(dist(d, 'favicon.ico'));
      for (let i = 0; i < ico.readUInt16LE(4); i++) ico[6 + 16 * i] = ico[7 + 16 * i] = 16;
      writeFileSync(dist(d, 'favicon.ico'), ico);
    },
  },
  { name: 'favicon.svg is not an SVG', base: 'site', fails: ['icons'], tamper: (d) => write(d, 'favicon.svg', 'not an image') },
  { name: 'apple-touch-icon.png is not a PNG', base: 'site', fails: ['icons'], tamper: (d) => write(d, 'apple-touch-icon.png', '<svg></svg>') },
  { name: 'icon-192.png is 512x512', base: 'site', fails: ['icons'], tamper: (d) => copyFileSync(dist(d, 'icon-512.png'), dist(d, 'icon-192.png')) },
  { name: 'the share image is 512x512', base: 'site', fails: ['icons'], tamper: (d) => copyFileSync(dist(d, 'icon-512.png'), dist(d, 'social.png')) },
  { name: 'the manifest is not JSON', base: 'site', fails: ['icons'], tamper: (d) => edit(d, 'manifest.webmanifest', /}$/, '') },
  { name: 'the manifest has no short_name', base: 'site', fails: ['icons'], tamper: (d) => edit(d, 'manifest.webmanifest', /"short_name":"[^"]*",/, '') },
  { name: 'a manifest icon does not exist', base: 'site', fails: ['icons'], tamper: (d) => edit(d, 'manifest.webmanifest', '/icon-192.png', '/icon-193.png') },

  // 6. Exactly one of noindex or canonical.
  { name: 'a page has neither noindex nor canonical', base: 'site', fails: ['indexing'], tamper: (d) => edit(d, T, /<meta name="robots"[^>]*>/, '') },
  { name: 'the 404 page is not noindex', base: 'site', fails: ['indexing'], tamper: (d) => edit(d, '404.html', /<meta name="robots"[^>]*>/, '') },
  { name: 'a launched page has both noindex and canonical', base: 'launched', fails: ['indexing'], tamper: (d) => inHead(d, T, '<meta name="robots" content="noindex">') },

  // 7. The launch switch, before launch.
  { name: 'robots.txt names a sitemap before launch', base: 'site', fails: ['launch'], tamper: (d) => appendFileSync(dist(d, 'robots.txt'), '\nSitemap: https://example.com/sitemap.xml\n') },
  { name: 'sitemap.xml exists before launch', base: 'site', fails: ['launch'], tamper: (d) => write(d, 'sitemap.xml', '<urlset></urlset>') },
  { name: 'llms.txt exists before launch', base: 'site', fails: ['launch'], tamper: (d) => write(d, 'llms.txt', '# Site name\n') },
  { name: 'a share card before launch', base: 'site', fails: ['launch'], tamper: (d) => inHead(d, T, '<meta property="og:image" content="https://example.com/social.png">') },

  // 7. The launch switch, after launch.
  { name: 'robots.txt has no Sitemap line', base: 'launched', fails: ['launch'], tamper: (d) => edit(d, 'robots.txt', /^Sitemap: .*$/m, '') },
  { name: 'sitemap.xml leaves out a page', base: 'launched', fails: ['launch'], tamper: (d) => edit(d, 'sitemap.xml', /<url><loc>[^<]*\/terms\/<\/loc>.*?<\/url>/s, '') },
  { name: 'sitemap.xml lists a page that is not built', base: 'launched', fails: ['launch'], tamper: (d) => edit(d, 'sitemap.xml', '</urlset>', '<url><loc>https://tamper.test/gone/</loc></url></urlset>') },
  { name: 'llms.txt is missing while AI crawlers are allowed', base: 'launched', fails: ['launch'], tamper: (d) => remove(d, 'llms.txt') },
  { name: 'llms.txt exists while robots.txt blocks AI crawlers', base: 'launched', fails: ['launch'], tamper: (d) => appendFileSync(dist(d, 'robots.txt'), '\nUser-agent: GPTBot\nDisallow: /\n') },
  { name: 'canonicals use two origins', base: 'launched', fails: ['launch'], tamper: (d) => edit(d, T, '<link rel="canonical" href="https://tamper.test/', '<link rel="canonical" href="https://other.test/') },
  { name: 'a canonical points at another page', base: 'launched', fails: ['launch'], tamper: (d) => edit(d, T, '<link rel="canonical" href="https://tamper.test/terms/"', '<link rel="canonical" href="https://tamper.test/accessibility/"') },
  { name: 'og:url is not the canonical', base: 'launched', fails: ['launch'], tamper: (d) => edit(d, T, '<meta property="og:url" content="https://tamper.test/terms/"', '<meta property="og:url" content="https://tamper.test/"') },
  { name: 'a share card has no og:title', base: 'launched', fails: ['launch'], tamper: (d) => edit(d, T, /<meta property="og:title"[^>]*>/, '') },
  { name: 'og:image is on another host', base: 'launched', fails: ['launch'], tamper: (d) => edit(d, T, /(<meta property="og:image" content=")[^"]*"/, '$1https://other.test/social.png"') },
  { name: 'the home page has no WebSite structured data', base: 'launched', fails: ['launch'], tamper: (d) => edit(d, 'index.html', /<script type="application\/ld\+json">[\s\S]*?<\/script>/, '') },
  { name: 'structured data is not valid JSON', base: 'launched', fails: ['launch', 'csp'], tamper: (d) => edit(d, 'index.html', '<script type="application/ld+json">{', '<script type="application/ld+json">{,') },

  // 8. The sitemap page lists every page.
  { name: 'the sitemap page leaves out a record', base: 'site', fails: ['sitemapPage'], tamper: (d) => edit(d, 'sitemap/index.html', /<a href="\/records\/[^"]+"/, '<a href="/"') },
  {
    name: 'a page is built outside the registry',
    base: 'site',
    fails: ['sitemapPage'],
    tamper: (d) => {
      mkdirSync(dist(d, 'extra'));
      write(d, 'extra/index.html', read(d, T).replace(/<title>[^<]*/, '<title>Extra'));
    },
  },

  // 9. A launched site carries none of the starter's placeholders.
  { name: "a launched site ships the starter's favicon.svg", base: 'launched', fails: ['placeholders'], starterOnly: true, tamper: (d) => fromRepo(d, 'favicon.svg') },
  { name: "a launched site ships the starter's favicon.ico", base: 'launched', fails: ['placeholders'], starterOnly: true, tamper: (d) => fromRepo(d, 'favicon.ico') },
  { name: "a launched site ships the starter's share image", base: 'launched', fails: ['placeholders'], starterOnly: true, tamper: (d) => fromRepo(d, 'social.png') },
  {
    name: 'a launched site is still on example.com',
    base: 'launched',
    fails: ['placeholders'],
    // Every URL moves, except inside structured data: its hash is in the CSP, and a changed
    // block would trip that check as well.
    tamper: (d) => {
      for (const file of readdirSync(join(d, 'dist'), { recursive: true, encoding: 'utf8' }).filter((f) => /\.(html|txt|xml)$/.test(f))) {
        const parts = read(d, file).split(/(<script type="application\/ld\+json">[\s\S]*?<\/script>)/);
        write(d, file, parts.map((part, i) => (i % 2 ? part : part.replaceAll('https://tamper.test', 'https://example.com'))).join(''));
      }
    },
  },
  { name: 'a launched page carries starter text', base: 'launched', fails: ['placeholders'], tamper: (d) => edit(d, T, '<h1>', '<p data-starter-placeholder>Starter text.</p><h1>') },
  { name: 'a launched title still says "Site name"', base: 'launched', fails: ['placeholders'], tamper: (d) => edit(d, T, /<title>([^<·]*)· [^<]*<\/title>/, '<title>$1· Site name</title>') },
  { name: "a launched share card keeps the starter's alt text", base: 'launched', fails: ['placeholders'], tamper: (d) => edit(d, T, /(<meta property="og:image:alt" content=")[^"]*"/, '$1Describe the share image here."') },

  // 10. robots.txt never blocks everything.
  { name: 'robots.txt blocks every crawler', base: 'site', fails: ['robots'], tamper: (d) => appendFileSync(dist(d, 'robots.txt'), '\n\nUser-agent: *\nDisallow: /\n') },

  // 11. Weight.
  { name: 'a second page loads a script file', base: 'site', fails: ['jsPages'], tamper: (d) => inHead(d, T, `<script type="module" src="${scriptOf(d)}"></script>`) },
  { name: 'a second page carries an island', base: 'site', fails: ['jsPages'], tamper: (d) => inMain(d, T, '<astro-island></astro-island>') },
  { name: 'a second page carries an inline script', base: 'site', fails: ['jsPages', 'csp'], tamper: (d) => inHead(d, T, '<script>document.title="x"</script>') },
  { name: 'JavaScript is over budget', base: 'site', fails: ['jsBudget'], tamper: (d) => writeFileSync(dist(d, '_astro/pad.js'), incompressible(100)) },
  { name: 'CSS is over budget', base: 'site', fails: ['cssBudget'], tamper: (d) => writeFileSync(dist(d, '_astro/pad.css'), incompressible(100)) },
  { name: 'a page is over budget', base: 'site', fails: ['pageBudget'], tamper: (d) => inMain(d, T, `<!-- ${incompressible(100).toString('hex')} -->`) },

  // 12. Internal links, assets and fragments.
  { name: 'a link to a page that does not exist', base: 'site', fails: ['links'], tamper: (d) => inMain(d, T, '<a href="/no-such-page/">x</a>') },
  { name: 'a page link without its trailing slash', base: 'site', fails: ['links'], tamper: (d) => inMain(d, T, '<a href="/privacy-policy">x</a>') },
  { name: 'a relative link', base: 'site', fails: ['links'], tamper: (d) => inMain(d, T, '<a href="privacy-policy/">x</a>') },
  { name: 'a link to a missing #fragment', base: 'site', fails: ['links'], tamper: (d) => inMain(d, T, '<a href="/privacy-policy/#no-such-id">x</a>') },
  { name: 'a stylesheet that does not exist', base: 'site', fails: ['links'], tamper: (d) => edit(d, T, /href="\/_astro\/[^"]+\.css"/, 'href="/_astro/missing.css"') },

  // 13. Residue.
  { name: 'TODO in a page', base: 'site', fails: ['residue'], tamper: (d) => inMain(d, T, '<p>TODO</p>') },
  { name: 'localhost in a page', base: 'site', fails: ['residue'], tamper: (d) => inMain(d, T, '<a href="http://localhost:4321/">x</a>') },

  // 14. Raw HTML only in the structured-data component.
  { name: 'set:html outside the two allowed files', base: 'site', fails: ['setHtml'], tamper: (d) => writeFileSync(join(d, 'src/components/Raw.astro'), '<div set:html={"<b>x</b>"} />\n') },
  { name: 'dangerouslySetInnerHTML in a component', base: 'site', fails: ['setHtml'], tamper: (d) => writeFileSync(join(d, 'src/components/Raw.tsx'), 'export const Raw = () => <div dangerouslySetInnerHTML={{ __html: "x" }} />;\n') },

  // 15. The host's limits.
  {
    name: 'more than 20,000 files',
    base: 'site',
    fails: ['hostLimits'],
    tamper: (d) => {
      mkdirSync(dist(d, 'pad'));
      for (let i = 0; i <= 20000; i++) writeFileSync(dist(d, `pad/${i}`), '');
    },
  },
  {
    name: 'a file over 25 MiB',
    base: 'site',
    fails: ['hostLimits'],
    // A sparse file: it reports 26 MiB and takes almost no disk.
    tamper: (d) => {
      writeFileSync(dist(d, 'big.bin'), '');
      truncateSync(dist(d, 'big.bin'), 26 * 1024 * 1024);
    },
  },
];

// ---------------------------------------------------------------------------------------
// The two builds every case starts from.

/** Copies the project into `dir` without node_modules, links each package and builds it. */
async function buildCopy(dir, changes) {
  for (const entry of ['src', 'public', 'styled-system', 'astro.config.ts', 'panda.config.ts', 'tsconfig.json', 'package.json']) {
    cpSync(join(ROOT, entry), join(dir, entry), { recursive: true });
  }
  // One link per package, not one for the folder: Astro and Vite write caches into
  // node_modules, and those must land in the copy, not in the repo's own.
  mkdirSync(join(dir, 'node_modules'));
  for (const entry of readdirSync(join(ROOT, 'node_modules')).filter((name) => !name.startsWith('.'))) {
    symlinkSync(join(ROOT, 'node_modules', entry), join(dir, 'node_modules', entry));
  }
  changes(dir);
  await run(process.execPath, [ASTRO, 'build', '--silent'], { cwd: dir, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }, maxBuffer: 64 * 1024 * 1024 });
}

/** Replaces one setting in the copy's src/site.ts, or stops if the setting is not found. */
function setSite(dir, pattern, value) {
  const path = join(dir, 'src/site.ts');
  const before = readFileSync(path, 'utf8');
  if (!pattern.test(before)) throw new Error(`src/site.ts has no setting matching ${pattern}: update scripts/tamper-test.mjs`);
  writeFileSync(path, before.replace(pattern, value));
}

const notLaunched = (dir) => setSite(dir, /^(\s*)launched: (true|false),$/m, '$1launched: false,');

// A launched site with its own name, address, alt text, legal text and icons, so that it
// passes every check and each case breaks exactly one thing.
function launched(dir) {
  setSite(dir, /^(\s*)name: '[^']*',$/m, "$1name: 'Tamper Test',");
  setSite(dir, /^(\s*)url: '[^']*',$/m, "$1url: 'https://tamper.test',");
  setSite(dir, /^(\s*)launched: (true|false),$/m, '$1launched: true,');
  setSite(dir, /(shareImage: \{ path: '[^']*', alt: ')[^']*'/, "$1A plain test card.'");
  for (const page of ['accessibility', 'privacy-policy', 'terms']) {
    const path = join(dir, `src/pages/${page}.astro`);
    writeFileSync(path, readFileSync(path, 'utf8').replaceAll(' data-starter-placeholder', ''));
  }
  // One byte more makes each file the site's own and keeps its format readable.
  appendFileSync(join(dir, 'public/favicon.svg'), '<!-- tamper -->\n');
  appendFileSync(join(dir, 'public/favicon.ico'), Buffer.from([0]));
  appendFileSync(join(dir, 'public/social.png'), Buffer.from([0]));
}

// ---------------------------------------------------------------------------------------
// Running verify-dist and reading what it printed.

async function verify(dir) {
  const result = await run(process.execPath, [VERIFY], { cwd: dir, maxBuffer: 16 * 1024 * 1024 }).then(
    ({ stdout }) => ({ code: 0, stdout }),
    (error) => ({ code: error.code, stdout: error.stdout ?? '' }),
  );
  const lines = result.stdout.split('\n').filter((line) => /^(PASS|FAIL) {2}/.test(line));
  const named = lines.map((line) => {
    const text = line.slice(6);
    return { status: line.slice(0, 4), text, key: Object.keys(CHECKS).find((key) => CHECKS[key].test(text)) };
  });
  return { ...result, named };
}

let failed = false;
let skipped = 0;
function report(name, problems) {
  if (problems.length === 0) {
    console.log(`PASS  ${name}`);
    return;
  }
  failed = true;
  console.log(`FAIL  ${name}`);
  for (const problem of problems) console.log(`      ${problem}`);
}

const work = mkdtempSync(join(tmpdir(), 'tamper-'));
try {
  const bases = { site: join(work, 'site'), launched: join(work, 'launched') };
  await Promise.all([buildCopy(bases.site, notLaunched), buildCopy(bases.launched, launched)]);

  // Each build must pass every check before breaking it can prove anything.
  const expected = Object.keys(CHECKS).filter((key) => !EARLY_EXIT.includes(key));
  for (const [base, dir] of Object.entries(bases)) {
    const { code, named } = await verify(dir);
    report(`control: the ${base === 'site' ? 'site as it stands, not launched,' : 'launched copy'} passes all ${expected.length} checks`, [
      ...(code === 0 ? [] : [`verify-dist exited ${code}`]),
      ...named.filter(({ key }) => !key).map(({ text }) => `a check this script does not know: "${text}". Add it to CHECKS, with a case.`),
      ...named.filter(({ status, key }) => key && status === 'FAIL').map(({ text }) => `FAIL ${text}`),
      ...expected.filter((key) => !named.some((line) => line.key === key)).map((key) => `no line matched ${CHECKS[key]}`),
      ...(base === 'launched' && !named.some(({ text }) => /LAUNCHED/.test(text)) ? ['verify-dist did not see this build as launched'] : []),
    ]);
  }
  if (failed) throw new Error('a control failed, so the cases would prove nothing');

  const untested = Object.keys(CHECKS).filter((key) => !cases.some(({ fails }) => fails.includes(key)));
  report(`every check has a case (${expected.length} checks and the missing-dist/ stop, ${cases.length} cases)`, untested.map((key) => `no case for ${CHECKS[key]}`));

  // Run the cases a few at a time; print them in order.
  const results = new Array(cases.length);
  let next = 0;
  const worker = async () => {
    while (next < cases.length) {
      const index = next++;
      const { name, base, fails, starterOnly, tamper } = cases[index];
      const dir = join(work, `case-${index}`);
      mkdirSync(dir);
      cpSync(join(bases[base], 'dist'), join(dir, 'dist'), { recursive: true });
      cpSync(join(bases[base], 'src'), join(dir, 'src'), { recursive: true });
      try {
        tamper(dir);
      } catch (error) {
        results[index] = { name, problems: [String(error.message)] };
        continue;
      }
      const { code, named } = await verify(dir);
      rmSync(dir, { recursive: true });
      const failing = named.filter(({ status }) => status === 'FAIL').map(({ key, text }) => key ?? text);
      const problems = [
        ...(code === 1 ? [] : [`verify-dist exited ${code}, not 1`]),
        ...fails.filter((key) => !failing.includes(key)).map((key) => `did not FAIL: ${CHECKS[key]}`),
        ...failing.filter((key) => !fails.includes(key)).map((key) => `also FAILed: ${CHECKS[key] ?? key}`),
      ];
      if (starterOnly && !isStarter && problems.length > 0) {
        results[index] = { name, skip: "this site has its own icons, so the starter's cannot be tested" };
      } else if (starterOnly && problems.length > 0) {
        problems.push("If the starter's icon changed in public/, update its hash in STARTER_ASSETS in scripts/verify-dist.mjs.");
        results[index] = { name, problems };
      } else {
        results[index] = { name, problems };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(2, availableParallelism()) }, worker));
  for (const { name, problems, skip } of results) {
    if (skip) console.log(`SKIP  ${name}: ${skip}`);
    else report(name, problems);
  }
  skipped = results.filter(({ skip }) => skip).length;
} catch (error) {
  failed = true;
  console.log(`FAIL  ${error.message}`);
  if (error.stderr) console.log(String(error.stderr).trim().split('\n').slice(-15).join('\n'));
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(
  failed
    ? '\ntamper-test: FAILED'
    : `\ntamper-test: ${cases.length - skipped} breaks, every one caught${skipped ? `; ${skipped} skipped` : ''}`,
);
process.exit(failed ? 1 : 0);
