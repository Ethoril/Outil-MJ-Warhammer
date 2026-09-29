/**
 * Gestionnaire du Thème (Clair / Sombre / Système).
 * Mémorise le choix dans localStorage sous 'wfrp.theme'.
 */
export function initThemeManager() {
  const btn = document.getElementById('btn-theme-toggle');
  if (!btn) return;

  const SAVED_KEY = 'wfrp.theme';
  let currentTheme = localStorage.getItem(SAVED_KEY) || 'system';

  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem(SAVED_KEY, theme);

    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      btn.textContent = 'Thème : Sombre';
      btn.title = 'Cliquer pour suivre le thème du système';
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      btn.textContent = 'Thème : Clair';
      btn.title = 'Cliquer pour passer au thème sombre';
    } else {
      document.documentElement.removeAttribute('data-theme');
      btn.textContent = 'Thème : Système';
      btn.title = 'Cliquer pour passer au thème clair';
    }
  }

  btn.addEventListener('click', () => {
    if (currentTheme === 'system') applyTheme('light');
    else if (currentTheme === 'light') applyTheme('dark');
    else applyTheme('system');
  });

  applyTheme(currentTheme);
}
