// The light, dark or system choice. src/components/ThemeScript.astro inlines this file into
// every page's <head>, so it runs before the page paints. No stored value means "system".
(() => {
  const KEY = 'site:theme';
  const root = document.documentElement;
  const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
  const schemeOf = (meta) => (meta.media.includes('dark') ? 'dark' : 'light');
  const colors = Object.fromEntries(metas.map((meta) => [schemeOf(meta), meta.content]));
  const valid = (value) => (value === 'light' || value === 'dark' ? value : 'system');
  const stored = () => {
    try {
      return valid(localStorage.getItem(KEY));
    } catch {
      return 'system';
    }
  };
  const apply = (choice) => {
    if (choice === 'system') delete root.dataset.theme;
    else root.dataset.theme = choice;
    for (const meta of metas) meta.content = colors[choice === 'system' ? schemeOf(meta) : choice];
  };
  apply(stored());
  addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('theme');
    if (!select) return;
    select.value = stored();
    select.closest('[hidden]')?.removeAttribute('hidden');
    select.addEventListener('change', () => {
      const choice = valid(select.value);
      try {
        if (choice === 'system') localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, choice);
      } catch {
        // Storage is blocked: the choice holds for this page only.
      }
      apply(choice);
    });
  });
})();
