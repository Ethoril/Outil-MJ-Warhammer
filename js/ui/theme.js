/**
 * Gestionnaire du Thème (Sombre / Clair / Système).
 * Sombre par défaut (style de la maquette de la refonte, MJ, 24/11/2026). Le choix est mémorisé dans localStorage sous
 * 'wfrp.theme' seulement quand le MJ clique : 'dark', 'light' ou 'auto' (suivre le système). L'ancienne valeur 'system',
 * que l'outil écrivait d'office à chaque ouverture, ne traduit aucun choix : elle se lit comme le défaut, sombre.
 */
import { safeLocalStorage } from '../core/safe-storage.js';

const CHOICES = ['dark', 'light', 'auto'];

export function initThemeManager() {
  const btn = document.getElementById('btn-theme-toggle');
  if (!btn) return;

  const SAVED_KEY = 'wfrp.theme';
  // Stockage interdit ou plein : le thème reste réglable, sans être mémorisé (BOOT-05).
  const storage = safeLocalStorage();
  let currentTheme = 'dark';
  try {
    const saved = storage?.getItem(SAVED_KEY);
    if (CHOICES.includes(saved)) currentTheme = saved;
  } catch { /* mode dégradé */ }

  function applyTheme(theme) {
    currentTheme = theme;
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      btn.textContent = 'Thème : Clair';
      btn.title = 'Cliquer pour suivre le thème du système';
    } else if (theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
      btn.textContent = 'Thème : Système';
      btn.title = 'Cliquer pour revenir au thème sombre';
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      btn.textContent = 'Thème : Sombre';
      btn.title = 'Cliquer pour passer au thème clair';
    }
  }

  btn.addEventListener('click', () => {
    const next = CHOICES[(CHOICES.indexOf(currentTheme) + 1) % CHOICES.length];
    applyTheme(next);
    try { storage?.setItem(SAVED_KEY, next); } catch { /* mode dégradé */ }
  });

  applyTheme(currentTheme);
}
