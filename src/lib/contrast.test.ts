import preset from '@pandacss/preset-panda';
import { describe, expect, it } from 'vitest';
import config from '../../panda.config';
import { site } from '../site';

// Contrast of the site's color tokens, worked out from panda.config.ts in each color scheme.
// Text must reach 7:1, because `npm run audit` runs axe's AAA contrast rule. The edges of
// controls, the focus ring and the pressed state must reach 3:1 (WCAG 1.4.11).
const TEXT: [string, string][] = [
  ['fg', 'bg'],
  ['fg', 'bg.subtle'],
  ['fg.muted', 'bg'],
  ['fg.inverse', 'bg.inverse'],
];
const NON_TEXT: [string, string][] = [
  ['border.control', 'bg'],
  ['focusRing', 'bg'],
  ['bg.inverse', 'bg'],
];
type Scheme = 'light' | 'dark';
type Mode = { scheme: Scheme; moreContrast: boolean };
const MODES: Mode[] = [
  { scheme: 'light', moreContrast: false },
  { scheme: 'dark', moreContrast: false },
  { scheme: 'light', moreContrast: true },
  { scheme: 'dark', moreContrast: true },
];

type Tree = Record<string, unknown>;
const palette = (preset.theme?.tokens?.colors ?? {}) as Tree;
const semantic = (config.theme?.extend?.semanticTokens?.colors ?? {}) as Tree;

/** Follows a dotted path such as "fg.muted" or "gray.900" to its token, or undefined. */
function lookup(tree: Tree, path: string): { value: unknown } | undefined {
  let node: unknown = tree;
  for (const key of path.split('.')) node = (node as Tree | undefined)?.[key];
  if (node && typeof node === 'object' && !('value' in node)) node = (node as Tree).DEFAULT;
  return node && typeof node === 'object' && 'value' in node ? (node as { value: unknown }) : undefined;
}

/** A semantic token's color in one mode, as a CSS color string such as "#fff" or "oklch(...)". */
function resolve(path: string, mode: Mode): string {
  const token = lookup(semantic, path) ?? lookup(palette, path);
  if (!token) throw new Error(`no color token "${path}"`);
  let value = token.value;
  if (value && typeof value === 'object') {
    const conditions = value as Record<string, string>;
    value = (mode.moreContrast && conditions._moreContrast) || conditions.base;
  }
  let text = String(value).trim();
  const pair = text.match(/^light-dark\((.*),(.*)\)$/);
  if (pair) text = (mode.scheme === 'light' ? pair[1] : pair[2]).trim();
  const reference = text.match(/^\{colors\.(.+)\}$/);
  return reference ? resolve(reference[1], mode) : text;
}

/** Linear-light sRGB channels of a hex or oklch() color, clipped to the sRGB gamut. */
function linearRgb(color: string): [number, number, number] {
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
    return [0, 2, 4].map((i) => {
      const c = parseInt(full.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
  }
  const oklch = color.match(/^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  if (!oklch) throw new Error(`cannot read the color "${color}"`);
  const [L, C, h] = [Number(oklch[1]) / 100, Number(oklch[2]), (Number(oklch[3]) * Math.PI) / 180];
  const [a, b] = [C * Math.cos(h), C * Math.sin(h)];
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (x: number) => Math.min(1, Math.max(0, x));
  return [
    clip(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clip(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clip(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const luminance = (color: string) => {
  const [r, g, b] = linearRgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (x: string, y: string) => {
  const [lighter, darker] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (lighter + 0.05) / (darker + 0.05);
};
/** 8-bit sRGB, for comparing a hex value with a token. */
const srgb8 = (color: string) =>
  linearRgb(color).map((c) => Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)));

describe('color contrast', () => {
  it('reads known values correctly', () => {
    expect(ratio('#000', '#fff')).toBeCloseTo(21, 5);
    expect(ratio('#777', '#fff')).toBeCloseTo(4.48, 2);
    expect(srgb8('oklch(100% 0 0)')).toEqual([255, 255, 255]);
  });

  for (const mode of MODES) {
    const label = `${mode.scheme}${mode.moreContrast ? ', more contrast' : ''}`;
    it(`text reaches 7:1 (${label})`, () => {
      const low = TEXT.map(([fg, bg]) => ({ pair: `${fg} on ${bg}`, ratio: ratio(resolve(fg, mode), resolve(bg, mode)) })).filter(
        ({ ratio: r }) => r < 7,
      );
      expect(low).toEqual([]);
    });
    it(`controls, focus and the pressed state reach 3:1 (${label})`, () => {
      const low = NON_TEXT.map(([fg, bg]) => ({ pair: `${fg} on ${bg}`, ratio: ratio(resolve(fg, mode), resolve(bg, mode)) })).filter(
        ({ ratio: r }) => r < 3,
      );
      expect(low).toEqual([]);
    });
  }

  it('has a theme color equal to the page background in each scheme', () => {
    for (const scheme of ['light', 'dark'] as const) {
      expect(srgb8(site.themeColor[scheme]), scheme).toEqual(srgb8(resolve('bg', { scheme, moreContrast: false })));
    }
  });
});
