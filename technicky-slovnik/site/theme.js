(() => {
  const key = 'technical-dictionary-theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let saved;
  try { saved = localStorage.getItem(key); } catch {}
  let theme = saved === 'light' || saved === 'dark' ? saved : system.matches ? 'dark' : 'light';
  function apply() {
    root.dataset.theme = theme;
    const button = document.getElementById('theme-toggle');
    const english = root.lang === 'en';
    if (button) {
      button.textContent = theme === 'dark' ? '☀' : '☾';
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.setAttribute('aria-label', english ? (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') : (theme === 'dark' ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'));
      button.title = button.getAttribute('aria-label');
    }
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#201725' : '#f4eff4';
  }
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.getElementById('theme-toggle').addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      saved = theme;
      try { localStorage.setItem(key, theme); } catch {}
      apply();
    });
    new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ['lang'] });
  });
  system.addEventListener('change', event => {
    if (!saved) { theme = event.matches ? 'dark' : 'light'; apply(); }
  });
})();
