import { escapeHtml } from './dom.js';

let container = null;

function ensureContainer() {
  if (!container) {
    container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.position = 'fixed';
      container.style.bottom = '20px';
      container.style.right = '20px';
      container.style.zIndex = '9999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '8px';
      container.style.maxWidth = '360px';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }
  }
  return container;
}

/**
 * Affiche un toast informatif, de succès, d'avertissement ou d'erreur.
 * @param {string} message - Contenu du message
 * @param {'info'|'success'|'warning'|'error'} [type='info'] - Type de notification
 * @param {{ label: string, onClick: Function }} [action=null] - Action optionnelle (ex: Annuler)
 * @param {number} [duration=5000] - Durée d'affichage en ms
 */
export function showToast(message, type = 'info', action = null, duration = 5000) {
  const parent = ensureContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} card`;
  toast.style.pointerEvents = 'auto';
  toast.style.padding = '10px 14px';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '10px';
  toast.style.fontSize = '0.9em';
  toast.style.borderRadius = '4px';

  let bg = '#2a2421';
  let border = '#8b2626';
  if (type === 'success') { bg = '#1e382b'; border = '#4caf50'; }
  else if (type === 'warning') { bg = '#3d301b'; border = '#ff9800'; }
  else if (type === 'error') { bg = '#3d1b1b'; border = '#f44336'; }

  toast.style.background = bg;
  toast.style.borderLeft = `4px solid ${border}`;
  toast.style.color = '#e0d8c3';

  const textSpan = document.createElement('span');
  textSpan.style.flex = '1';
  textSpan.textContent = message;
  toast.appendChild(textSpan);

  if (action && action.label && typeof action.onClick === 'function') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tiny ghost';
    btn.textContent = action.label;
    btn.style.marginLeft = '8px';
    btn.style.cursor = 'pointer';
    btn.style.color = '#e6c887';
    btn.style.borderColor = '#e6c887';
    btn.addEventListener('click', () => {
      action.onClick();
      toast.remove();
    });
    toast.appendChild(btn);
  }

  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.opacity = '0.7';
  closeBtn.style.fontSize = '1.2em';
  closeBtn.style.paddingLeft = '4px';
  closeBtn.addEventListener('click', () => toast.remove());
  toast.appendChild(closeBtn);

  parent.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  return toast;
}
