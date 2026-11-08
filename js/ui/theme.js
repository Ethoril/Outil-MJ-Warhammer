/**
 * Gestionnaire du Thème (Clair / Sombre / Système).
 * Mémorise le choix dans localStorage sous 'wfrp.theme'.
 */
import { safeLocalStorage } from '../core/safe-storage.js';

export function initThemeManager() {
  const btn = document.getElementById('btn-theme-toggle');
  if (!btn) return;

  const SAVED_KEY = 'wfrp.theme';
  // Stockage interdit ou plein : le thème reste réglable, sans être mémorisé (BOOT-05).
  const storage = safeLocalStorage();
  let currentTheme = 'system';
  try { currentTheme = storage?.getItem(SAVED_KEY) || 'system'; } catch { /* mode dégradé */ }

  function applyTheme(theme) {
    currentTheme = theme;
    try { storage?.setItem(SAVED_KEY, theme); } catch { /* mode dégradé */ }

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
