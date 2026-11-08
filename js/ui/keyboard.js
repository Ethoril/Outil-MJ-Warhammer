import { showToast } from './toast.js';

// Touches des onglets, dans l’ordre de la barre (index.html les annonce par aria-keyshortcuts).
export const SPACE_SHORTCUTS = Object.freeze([
  { key: '1', space: 'prepare' },
  { key: '2', space: 'play' },
  { key: '3', space: 'campaign' },
  { key: '4', space: 'library' }
]);

/**
 * Initialise la gestion globale des raccourcis clavier (macOS / PC).
 * Active uniquement lorsque le focus n'est PAS dans un champ de saisie texte.
 * `goToSpace` change d'espace (onglet, vue et bandeau) ; `advanceTurn` démarre
 * ou avance le combat, disponible dès que le bandeau de combat est visible.
 */
export function initKeyboardShortcuts(Store, CombatEngine, goToSpace, { advanceTurn = () => CombatEngine.nextTurn(), isCombatVisible = () => false } = {}) {
  document.addEventListener('keydown', async (e) => {
    const targetTag = e.target.tagName;
    const isInput = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT' || e.target.isContentEditable;

    // ⌘Z / Ctrl+Z -> Annuler
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      if (isInput) return;
      e.preventDefault();
      if (e.shiftKey) {
        const ok = await Store.redo?.();
        if (ok) showToast('↷ Action rétablie (⌘⇧Z)', 'info');
        return;
      }
      if (Store.canUndo()) {
        const ok = await Store.undo();
        if (ok) showToast('⏪ Action annulée (⌘Z)', 'info');
      } else {
        showToast('Aucune action à annuler', 'info');
      }
      return;
    }

    // Échap -> Fermer le menu ⋯, puis la fenêtre d’outil ouverte et les palettes de couleurs
    if (e.key === 'Escape') {
      const menu = document.getElementById('app-menu');
      if (menu?.matches(':popover-open')) {
        menu.hidePopover();
        return;
      }
      document.querySelectorAll('.color-palette').forEach(p => p.classList.add('hidden'));
      // Une saisie en cours hors de la fenêtre (jet, recherche…) ne la ferme pas.
      const dlg = document.querySelector('dialog[open]');
      if (dlg && (dlg.contains(e.target) || !isInput)) dlg.close();
      return;
    }

    // Ignorer les raccourcis simples si l'utilisateur saisit du texte, ou s’ils sont combinés
    // à Ctrl, Alt ou ⌘ : ces combinaisons restent au navigateur (Ctrl+D, Ctrl+1…).
    if (isInput || e.ctrlKey || e.altKey || e.metaKey) return;

    const key = e.key.toLowerCase();

    // N -> Tour suivant partout hors saisie ; Espace seulement sans focus précis
    // (page ou racine de la vue de travail), sinon défilement ou activation natifs.
    if (key === 'n' || e.code === 'Space') {
      if (e.code === 'Space' && !(e.target === document.body || e.target.matches?.('#workspace-root, .workspace-view'))) return;
      if (!isCombatVisible()) return;
      e.preventDefault();
      advanceTurn();
      return;
    }

    // D -> Focus sur le jet d'attaque de Jouer
    if (key === 'd') {
      e.preventDefault();
      goToSpace('play');
      const rollInput = document.querySelector('[data-roll-input="attack"]');
      if (rollInput) {
        rollInput.focus();
        showToast('🎲 Jet d’attaque sélectionné', 'info');
      }
      return;
    }

    // 1 à 4 -> Navigation par onglets, dans l’ordre de la barre
    const shortcut = SPACE_SHORTCUTS.find(entry => entry.key === key);
    if (shortcut) {
      e.preventDefault();
      goToSpace(shortcut.space);
    }
  });
}
