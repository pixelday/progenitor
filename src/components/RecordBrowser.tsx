import { useState } from 'react';
import { CSPProvider } from '@base-ui/react/csp-provider';
import { Input } from '@base-ui/react/input';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { css } from 'styled-system/css';
import { recordHref, type RecordSummary } from '../lib/records';
import { usePrefs } from '../lib/usePrefs';

type Props = {
  records: RecordSummary[];
  categories: string[];
};

const focusRing = { outline: '2px solid', outlineColor: 'blue.600', outlineOffset: '2px' };

/**
 * The page's one island: search and category filters over a list that is already in the HTML.
 * The chosen categories persist in localStorage (src/lib/storage.ts); the search text does not.
 */
export default function RecordBrowser({ records, categories }: Props) {
  const [query, setQuery] = useState('');
  const { prefs, setPrefs, resetPrefs } = usePrefs();

  // Ignore stored categories that no longer exist in the data.
  const selected = prefs.categories.filter((category) => categories.includes(category));

  const q = query.trim().toLowerCase();
  const visible = records.filter(
    (record) =>
      (selected.length === 0 || selected.includes(record.category)) &&
      (q === '' || [record.name, record.summary, ...record.tags].some((text) => text.toLowerCase().includes(q))),
  );

  return (
    // The site's CSP has no nonce to give, so Base UI must not inject <style> elements.
    <CSPProvider disableStyleElements>
      <section className={css({ display: 'grid', gap: '4' })}>
        <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '3', alignItems: 'center' })}>
          <Input
            type="search"
            aria-label="Search records"
            placeholder="Search"
            value={query}
            onValueChange={setQuery}
            className={css({
              flex: '1 1 16rem',
              px: '3',
              py: '2',
              borderWidth: '1px',
              borderColor: 'gray.400',
              rounded: 'md',
              _focusVisible: focusRing,
            })}
          />

          <ToggleGroup
            multiple
            aria-label="Filter by category"
            value={selected}
            onValueChange={(next) => setPrefs({ v: 1, categories: next })}
            className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}
          >
            {categories.map((category) => (
              <Toggle
                key={category}
                value={category}
                className={css({
                  px: '3',
                  py: '1.5',
                  borderWidth: '1px',
                  borderColor: 'gray.400',
                  rounded: 'full',
                  fontSize: 'sm',
                  cursor: 'pointer',
                  // Base UI sets data-pressed; Panda's _pressed condition matches it.
                  _pressed: { bg: 'gray.900', color: 'white', borderColor: 'gray.900' },
                  _focusVisible: focusRing,
                })}
              >
                {category}
              </Toggle>
            ))}
          </ToggleGroup>

          <button
            type="button"
            onClick={() => {
              setQuery('');
              resetPrefs();
            }}
            className={css({
              px: '3',
              py: '1.5',
              fontSize: 'sm',
              textDecoration: 'underline',
              cursor: 'pointer',
              _focusVisible: focusRing,
            })}
          >
            Reset filters
          </button>
        </div>

        <p aria-live="polite" className={css({ fontSize: 'sm', color: 'gray.600' })}>
          {visible.length} of {records.length} shown
        </p>

        <ul
          className={css({ display: 'grid', gap: '3', gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))' })}
        >
          {visible.map((record) => (
            <li
              key={record.id}
              className={css({ borderWidth: '1px', borderColor: 'gray.200', rounded: 'lg', p: '4' })}
            >
              <a
                href={recordHref(record.id)}
                className={css({ fontWeight: 'semibold', textDecoration: 'underline', _hover: { textDecoration: 'none' } })}
              >
                {record.name}
              </a>
              <p className={css({ fontSize: 'sm', color: 'gray.600', mt: '1' })}>
                {record.category} · As of {record.updated}
              </p>
              <p className={css({ mt: '2' })}>{record.summary}</p>
            </li>
          ))}
        </ul>
      </section>
    </CSPProvider>
  );
}
