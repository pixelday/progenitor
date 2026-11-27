// Browser audit of a served build: accessibility on every page in every color mode, then the
// island's behavior, the Theme select and the other user preferences. It needs a browser, so
// it is not part of `npm run build`. Run it before opening a pull request:
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
const THEME_KEY = 'site:theme';

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

/** A context with a color mode, and optionally a Theme choice already stored. */
async function contextFor({ theme, width = 1280, ...options } = {}) {
  const context = await browser.newContext({ ...options, viewport: { width, height: 800 } });
  if (theme) await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [THEME_KEY, theme]);
  return context;
}

// Screenshots are compared in a blank page: the site's own CSP rightly refuses data: images.
const decoder = await browser.newPage();
/** The share of pixels that differ clearly between two screenshots of the same element. */
const changedShare = (before, after) =>
  decoder.evaluate(
    async ([x, y]) => {
      const load = (src) => new Promise((done) => Object.assign(new Image(), { onload: (e) => done(e.target), src: `data:image/png;base64,${src}` }));
      const pixels = (image) => {
        const canvas = new OffscreenCanvas(image.width, image.height);
        canvas.getContext('2d').drawImage(image, 0, 0);
        return canvas.getContext('2d').getImageData(0, 0, image.width, image.height).data;
      };
      const [a, b] = (await Promise.all([load(x), load(y)])).map(pixels);
      if (a.length !== b.length) return 1;
      let changed = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) changed++;
      }
      return changed / (a.length / 4);
    },
    [before.toString('base64'), after.toString('base64')],
  );

// The sitemap page lists every page (verify-dist enforces that), so it is the page list.
const lister = await browser.newPage();
await lister.goto(`${base}/sitemap`);
const paths = await lister.locator('main a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
await lister.close();
paths.push('/audit-no-such-page'); // the 404 page

// 1. axe on every page in every color mode the site supports: the system's light and dark at
//    desktop and small-phone widths, a Theme choice against the system, more contrast, and
//    forced colors (Windows High Contrast).
const MODES = [
  { label: 'light, 1280px', colorScheme: 'light' },
  { label: 'light, 320px', colorScheme: 'light', width: 320 },
  { label: 'dark, 1280px', colorScheme: 'dark' },
  { label: 'dark, 320px', colorScheme: 'dark', width: 320 },
  { label: 'Dark chosen on a light system', colorScheme: 'light', theme: 'dark' },
  { label: 'Light chosen on a dark system', colorScheme: 'dark', theme: 'light' },
  { label: 'more contrast, light', colorScheme: 'light', contrast: 'more' },
  { label: 'more contrast, dark', colorScheme: 'dark', contrast: 'more' },
  { label: 'forced colors, light', colorScheme: 'light', forcedColors: 'active' },
  { label: 'forced colors, dark', colorScheme: 'dark', forcedColors: 'active' },
];
for (const { label, ...mode } of MODES) {
  const context = await contextFor(mode);
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
    if (mode.theme) {
      const applied = await page.evaluate(() => document.documentElement.dataset.theme);
      if (applied !== mode.theme) problems.push(`${path}: the stored choice "${mode.theme}" was not applied (data-theme is ${applied})`);
    }
    await page.evaluate(axeSource);
    const { violations } = await page.evaluate((tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags } }), AXE_TAGS);
    for (const { id, help, nodes } of violations) problems.push(`${path}: ${id}: ${help} (${nodes.length}, first: ${nodes[0].target.join(' ')})`);
    for (const message of messages) problems.push(`${path}: console: ${message.slice(0, 160)}`);
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (overflows) problems.push(`${path}: scrolls sideways at ${mode.width ?? 1280}px`);
    await page.close();
  }
  await context.close();
  check(`axe, console and overflow: ${paths.length} pages, ${label}`, problems);
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

// 3. The Theme select: System by default, a choice that overrides the system, holds across
//    pages and can be taken back.
{
  const context = await contextFor({ colorScheme: 'light' });
  const page = await context.newPage();
  const look = () =>
    page.evaluate((key) => {
      const select = document.getElementById('theme');
      return {
        theme: document.documentElement.dataset.theme ?? 'none',
        scheme: getComputedStyle(document.documentElement).colorScheme,
        colors: [...document.querySelectorAll('meta[name="theme-color"]')].map((meta) => `${meta.media}=${meta.content}`),
        stored: localStorage.getItem(key),
        select: select?.value,
        shown: Boolean(select?.checkVisibility()),
      };
    }, THEME_KEY);
  await page.goto(`${base}/terms`, { waitUntil: 'networkidle' });
  const first = await look();
  check(
    'the Theme select is shown, starts on System and leaves the scheme to the system',
    first.shown && first.select === 'system' && first.theme === 'none' && first.scheme === 'light dark' && first.stored === null ? [] : [JSON.stringify(first)],
  );
  const darkColor = first.colors.find((entry) => entry.includes('dark'))?.split('=')[1];
  await page.selectOption('#theme', 'dark');
  const chosen = await look();
  check(
    'choosing Dark on a light system turns the page and both theme colors dark, and stores it',
    chosen.theme === 'dark' && chosen.scheme === 'dark' && chosen.stored === 'dark' && chosen.colors.every((entry) => entry.endsWith(`=${darkColor}`))
      ? []
      : [JSON.stringify(chosen)],
  );
  await page.reload({ waitUntil: 'networkidle' });
  const reloaded = await look();
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  const elsewhere = await look();
  check(
    'the choice holds after a reload and on another page',
    [reloaded, elsewhere].every((state) => state.theme === 'dark' && state.select === 'dark') ? [] : [JSON.stringify(reloaded), JSON.stringify(elsewhere)],
  );
  await page.selectOption('#theme', 'system');
  const cleared = await look();
  check(
    'choosing System clears the choice and the stored key',
    cleared.theme === 'none' && cleared.stored === null && cleared.colors.join() === first.colors.join() ? [] : [JSON.stringify(cleared)],
  );
  await context.close();
}

// 4. A pressed toggle looks pressed in every color mode. Forced colors replace the page's
//    colors, so a state shown only by a fill can vanish there. Compares the same toggle before
//    and after pressing: a visible state changes most of it.
{
  const problems = [];
  for (const { label, ...mode } of MODES.filter(({ width, theme }) => !width && !theme)) {
    const context = await contextFor(mode);
    const page = await context.newPage();
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    const name = await page.getByRole('search').getByRole('button', { pressed: false }).first().innerText();
    const toggle = page.getByRole('search').getByRole('button', { name });
    const before = await toggle.screenshot();
    await toggle.click();
    await page.evaluate(() => document.activeElement?.blur());
    await page.mouse.move(0, 0);
    const share = await changedShare(before, await toggle.screenshot());
    if (share < 0.25) problems.push(`${label}: pressing "${name}" changed ${(share * 100).toFixed(0)}% of it`);
    await context.close();
  }
  check('a pressed toggle looks pressed: normal, more contrast and forced colors, light and dark', problems);
}

// 5. Reduced motion: nothing animates or transitions, on any page or in the island's states.
{
  const context = await contextFor({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const problems = [];
  for (const path of paths) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    if (path === '/') {
      await page.getByRole('search').getByRole('button', { pressed: false }).first().click();
      await page.locator('input[type="search"]').focus();
    }
    const moving = await page.evaluate(() => [
      ...document.getAnimations().map((animation) => `an animation on <${animation.effect?.target?.tagName.toLowerCase()}>`),
      ...[...document.querySelectorAll('*')]
        .filter((element) => {
          const style = getComputedStyle(element);
          return [style.transitionDuration, style.animationDuration].some((value) => value.split(',').some((part) => parseFloat(part) > 0));
        })
        .map((element) => `<${element.tagName.toLowerCase()}> has a transition or an animation`),
    ]);
    problems.push(...moving.map((what) => `${path}: ${what}`));
  }
  await context.close();
  check('with reduced motion nothing animates or transitions (put motion under _motionSafe)', problems);
}

// 6. Print is light whatever the screen shows, and leaves out controls that do nothing on paper.
{
  const problems = [];
  for (const [label, mode] of [['dark system', { colorScheme: 'dark' }], ['Dark chosen', { colorScheme: 'light', theme: 'dark' }]]) {
    const context = await contextFor(mode);
    const page = await context.newPage();
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });
    const printed = await page.evaluate(() => ({
      scheme: getComputedStyle(document.documentElement).colorScheme,
      shown: ['#theme', 'search'].filter((selector) => document.querySelector(selector)?.checkVisibility()),
    }));
    if (printed.scheme !== 'light') problems.push(`${label}: color-scheme is "${printed.scheme}" on paper`);
    for (const selector of printed.shown) problems.push(`${label}: ${selector} is printed`);
    await context.close();
  }
  check('print is light, without the Theme select or the filters', problems);
}

// 7. Storage blocked: the page works on defaults and throws nothing.
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
  await page.selectOption('#theme', 'dark');
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  check('with storage blocked a Theme choice still applies to the page', theme === 'dark' && errors.length === 0 ? [] : [`data-theme is ${theme}`, ...errors]);
  await context.close();
}

// 8. JavaScript off: the content is all there, and no control is shown that could do nothing.
{
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${base}/`);
  const links = await page.locator('main ul > li a').count();
  check('with JavaScript off every record is still a link', links > 0 ? [] : ['no record links in the static HTML']);
  const shown = await page.evaluate(() => document.getElementById('theme')?.checkVisibility());
  check('with JavaScript off the Theme select is hidden', shown === false ? [] : ['the Theme select is shown but cannot work']);
  await context.close();
}

await browser.close();
console.log(failed ? '\naudit: FAILED' : `\naudit: ${paths.length} pages checked, all passed`);
process.exit(failed ? 1 : 0);
