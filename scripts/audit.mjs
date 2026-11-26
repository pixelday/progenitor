// Browser audit of a served build: accessibility on every page, then the island's behavior.
// It needs a browser, so it is not part of `npm run build`. Run it before opening a pull request:
//
//   npm run build && npm run preview        (one terminal)
//   npm run audit                           (another; or: npm run audit -- https://<preview-host>)
//
// It drives the Chrome that is already installed. Every line prints PASS or FAIL, and the
// script exits 1 if anything failed. An automated pass is the floor, not proof of conformance:
// docs/setup/4-launch.md lists the checks that only a person can do.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const base = (process.argv[2] ?? 'http://localhost:8787').replace(/\/$/, '');
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
// WCAG 2.2 A and AA are the target. The AAA and best-practice rules that axe can test run too.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

let failed = false;
function check(name, problems) {
  if (problems.length === 0) {
    console.log(`PASS  ${name}`);
    return;
  }
  failed = true;
  console.log(`FAIL  ${name}`);
  for (const problem of problems) console.log(`      ${problem}`);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });

// The sitemap page lists every page (verify-dist enforces that), so it is the page list.
const lister = await browser.newPage();
await lister.goto(`${base}/sitemap/`);
const paths = await lister.locator('main a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
await lister.close();
paths.push('/audit-no-such-page'); // the 404 page

// 1. axe on every page, in light and dark, at desktop and small-phone widths.
for (const colorScheme of ['light', 'dark']) {
  for (const width of [1280, 320]) {
    const context = await browser.newContext({ colorScheme, viewport: { width, height: 800 } });
    const problems = [];
    for (const path of paths) {
      const page = await context.newPage();
      const messages = [];
      page.on('console', (message) => {
        const isOwn404 = path === '/audit-no-such-page' && /404/.test(message.text());
        if (['error', 'warning'].includes(message.type()) && !isOwn404) messages.push(message.text());
      });
      page.on('pageerror', (error) => messages.push(String(error)));
      await page.goto(base + path, { waitUntil: 'networkidle' });
      await page.evaluate(axeSource);
      const { violations } = await page.evaluate((tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags } }), AXE_TAGS);
      for (const { id, help, nodes } of violations) problems.push(`${path}: ${id}: ${help} (${nodes.length}, first: ${nodes[0].target.join(' ')})`);
      for (const message of messages) problems.push(`${path}: console: ${message.slice(0, 160)}`);
      const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      if (overflows) problems.push(`${path}: scrolls sideways at ${width}px`);
      await page.close();
    }
    await context.close();
    check(`axe, console and overflow: ${paths.length} pages, ${colorScheme}, ${width}px`, problems);
  }
}

// 2. The island: it hydrates under the Content Security Policy, filters, persists and resets.
{
  const context = await browser.newContext();
  const page = await context.newPage();
  const messages = [];
  page.on('console', (message) => ['error', 'warning'].includes(message.type()) && messages.push(message.text()));
  page.on('pageerror', (error) => messages.push(String(error)));
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  const cards = page.locator('main ul > li');
  const total = await cards.count();
  const stored = () => page.evaluate(() => localStorage.getItem('site:v1'));

  await page.keyboard.press('Tab');
  const firstStop = await page.evaluate(() => document.activeElement?.textContent?.trim());
  check('the first Tab stop is the skip link', firstStop === 'Skip to content' ? [] : [`it was "${firstStop}"`]);

  const toggle = page.getByRole('search').getByRole('button', { pressed: false }).first();
  const category = await toggle.innerText();
  await toggle.click();
  const filtered = await cards.count();
  check('a category filter narrows the list (the island hydrated)', filtered > 0 && filtered < total ? [] : [`${filtered} of ${total} shown`]);
  check('the result count is announced', (await page.locator('[aria-live="polite"]').innerText()) === `${filtered} of ${total} shown` ? [] : ['the live region is out of step']);
  check('the choice is stored under site:v1', (await stored()) === JSON.stringify({ v: 1, categories: [category] }) ? [] : [`stored: ${await stored()}`]);

  await page.reload({ waitUntil: 'networkidle' });
  check('the choice survives a reload', (await cards.count()) === filtered ? [] : [`${await cards.count()} shown after reload`]);

  await page.getByRole('button', { name: 'Reset filters' }).click();
  check('reset clears the filter and the stored value', (await cards.count()) === total && (await stored()) === null ? [] : [`stored: ${await stored()}`]);
  check('no console message, so no Content Security Policy violation', messages);
  await context.close();
}

// 3. Storage blocked: the page works on defaults and throws nothing.
{
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  const total = await page.locator('main ul > li').count();
  await page.getByRole('search').getByRole('button', { pressed: false }).first().click();
  const filtered = await page.locator('main ul > li').count();
  check('with storage blocked the filter still works', filtered < total && errors.length === 0 ? [] : [`${filtered} of ${total} shown`, ...errors]);
  await context.close();
}

// 4. JavaScript off: the content is all there.
{
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${base}/`);
  const links = await page.locator('main ul > li a').count();
  check('with JavaScript off every record is still a link', links > 0 ? [] : ['no record links in the static HTML']);
  await context.close();
}

await browser.close();
console.log(failed ? '\naudit: FAILED' : `\naudit: ${paths.length} pages checked, all passed`);
process.exit(failed ? 1 : 0);
