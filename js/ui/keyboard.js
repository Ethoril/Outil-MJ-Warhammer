import { showToast } from './toast.js';

/**
 * Initialise la gestion globale des raccourcis clavier (macOS / PC).
 * Active uniquement lorsque le focus n'est PAS dans un champ de saisie texte.
 */
export function initKeyboardShortcuts(Store, CombatEngine, switchTab) {
  document.addEventListener('keydown', (e) => {
    const targetTag = e.target.tagName;
    const isInput = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT' || e.target.isContentEditable;

    // ⌘Z / Ctrl+Z -> Annuler
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      if (isInput) return;
      e.preventDefault();
      if (Store.canUndo()) {
        const ok = Store.undo();
        if (ok) showToast('⏪ Action annulée (⌘Z)', 'info');
      } else {
        showToast('Aucune action à annuler', 'info');
      }
      return;
    }

    // Échap -> Fermer modales, palettes de couleurs
    if (e.key === 'Escape') {
      document.querySelectorAll('.color-palette').forEach(p => p.classList.add('hidden'));
      const dlg = document.querySelector('dialog[open]');
      if (dlg) dlg.close();
      return;
    }

    // Ignorer les raccourcis simples si l'utilisateur saisit du texte
    if (isInput) return;

    const key = e.key.toLowerCase();

    // N ou Espace -> Tour suivant
    if (key === 'n' || e.code === 'Space') {
      e.preventDefault();
      CombatEngine.nextTurn();
      return;
    }

    // D -> Focus sur le premier jet de dé
    if (key === 'd') {
      e.preventDefault();
      switchTab('combat');
      const firstRollBtn = document.querySelector('.btn-roll');
      if (firstRollBtn) {
        firstRollBtn.focus();
        showToast('🎲 Jet de dés actif sélectionné', 'info');
      }
      return;
    }

    // 1, 2, 3 -> Navigation par onglets
    if (key === '1') {
      e.preventDefault();
      switchTab('reserve');
      return;
    }

    if (key === '2') {
      e.preventDefault();
      switchTab('combat');
      return;
    }

    if (key === '3') {
      e.preventDefault();
      switchTab('rules');
      return;
    }
  });
}
