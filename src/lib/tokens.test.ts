import preset from '@pandacss/preset-panda';
import { describe, expect, it } from 'vitest';

// Every color the palette defines, written the way a component would name it: 'gray.900',
// 'white'. The site's own colors are semantic tokens in panda.config.ts, which point at these.
const colors = (preset.theme?.tokens?.colors ?? {}) as Record<string, Record<string, unknown>>;
const palette = Object.entries(colors).flatMap(([name, token]) =>
  'value' in token ? [name] : Object.keys(token).map((shade) => `${name}.${shade}`),
);
// CSS keywords, not colors a brand would change.
const KEYWORDS = new Set(['current', 'transparent']);

const sources = import.meta.glob(['../**/*.{astro,ts,tsx}', '!../**/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('the token layer', () => {
  it('can see the palette and the source files', () => {
    expect(palette).toContain('gray.900');
    expect(palette).toContain('white');
    expect(Object.keys(sources)).toContain('../components/RecordBrowser.tsx');
  });

  it('keeps palette colors out of components: they name semantic tokens', () => {
    const quoted = (color: string) => new RegExp(`['"\`]${color.replace('.', '\\.')}['"\`]`);
    const found = Object.entries(sources).flatMap(([file, text]) =>
      palette.filter((color) => !KEYWORDS.has(color) && quoted(color).test(text)).map((color) => `${file}: '${color}'`),
    );
    expect(found).toEqual([]);
  });
});
