/**
 * Panneau latéral de Jouer : onglets non modaux (Règles, Profils, Journal),
 * repliable en rail. L'élément est construit une fois et n'est jamais recréé
 * par les re-rendus de la vue, ce qui préserve recherche, filtres et focus.
 * Onglet et repli choisis par l'utilisateur sont mémorisés dans localStorage
 * (`wfrp.sidePanel`) ; sans choix mémorisé, le repli dépend de la largeur.
 */
const STORAGE_KEY = 'wfrp.sidePanel';

function readStored() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function writeStored(value) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* stockage indisponible : état non mémorisé */ }
}

/**
 * @param {{ tabs: Array<{ id: string, label: string, render: (content: HTMLElement) => void }>, onToggle?: (collapsed: boolean) => void }} options
 */
export function initSidePanel({ tabs, onToggle = () => {}, onTemporaryReveal = () => {} }) {
  const stored = readStored();
  const state = {
    tab: tabs.some(tab => tab.id === stored.tab) ? stored.tab : tabs[0].id,
    collapsed: typeof stored.collapsed === 'boolean'
      ? stored.collapsed
      : (typeof window !== 'undefined' && window.innerWidth < 1100)
  };
  const rendered = new Set();
  let temporarilyCollapsed = false;
  const isCollapsed = () => state.collapsed || temporarilyCollapsed;

  const element = document.createElement('aside');
  element.className = 'workspace-side';
  element.setAttribute('aria-label', 'Panneau latéral');

  const header = document.createElement('div');
  header.className = 'workspace-side-header';
  const list = document.createElement('div');
  list.className = 'workspace-side-tabs';
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-label', 'Panneau latéral');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'workspace-side-toggle';
  header.append(list, toggle);
  element.appendChild(header);

  const buttons = new Map();
  const panels = new Map();
  tabs.forEach(tab => {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = `workspace-side-tab-${tab.id}`;
    button.className = 'workspace-side-tab';
    button.textContent = tab.label;
    button.dataset.sideTab = tab.id;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `workspace-side-panel-${tab.id}`);
    list.appendChild(button);
    buttons.set(tab.id, button);

    const panel = document.createElement('div');
    panel.id = `workspace-side-panel-${tab.id}`;
    panel.className = 'workspace-side-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id);
    panel.tabIndex = 0;
    element.appendChild(panel);
    panels.set(tab.id, panel);
  });

  function sync({ remember = true } = {}) {
    const collapsed = isCollapsed();
    element.classList.toggle('is-collapsed', collapsed);
    toggle.textContent = collapsed ? '«' : '»';
    toggle.setAttribute('aria-label', collapsed ? 'Déplier le panneau' : 'Replier le panneau');
    toggle.title = toggle.getAttribute('aria-label');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    tabs.forEach(tab => {
      const active = tab.id === state.tab;
      const button = buttons.get(tab.id);
      button.setAttribute('aria-selected', String(active && !collapsed));
      button.tabIndex = active ? 0 : -1;
      panels.get(tab.id).hidden = collapsed || !active;
    });
    if (!collapsed && !rendered.has(state.tab)) refresh(state.tab);
    if (remember) writeStored({ tab: state.tab, collapsed: state.collapsed });
    onToggle(collapsed);
  }

  function refresh(id = null) {
    const targets = id ? [id] : [...rendered];
    targets.forEach(tabId => {
      const tab = tabs.find(item => item.id === tabId);
      if (!tab) return;
      // A hidden tab is refreshed when it is shown again.
      if (isCollapsed() || tabId !== state.tab) { rendered.delete(tabId); return; }
      tab.render(panels.get(tabId));
      rendered.add(tabId);
    });
  }

  // `remember: false` : affichage passager (ex. bouton Circonstances) ; onglet et repli choisis par l'utilisateur
  // sont gardés pour `restore()` et rien n'est écrit dans localStorage.
  let before = null;
  function open(id, { remember = true } = {}) {
    if (!buttons.has(id)) throw new RangeError(`Panneau inconnu : ${id}`);
    if (temporarilyCollapsed) onTemporaryReveal();
    if (remember) before = null;
    else if (!before) before = { tab: state.tab, collapsed: state.collapsed };
    state.tab = id;
    state.collapsed = false;
    sync({ remember });
  }

  /** Revient à l'onglet et au repli d'avant un affichage passager ; faux s'il n'y en avait pas. */
  function restore() {
    if (!before) return false;
    Object.assign(state, before);
    before = null;
    sync({ remember: false });
    return true;
  }

  function collapse() {
    state.collapsed = true;
    sync();
  }

  list.addEventListener('click', event => {
    const button = event.target.closest('[data-side-tab]');
    if (button) open(button.dataset.sideTab);
  });
  list.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const ids = tabs.map(tab => tab.id);
    const index = ids.indexOf(state.tab);
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? ids.length - 1
        : ['ArrowRight', 'ArrowDown'].includes(event.key) ? (index + 1) % ids.length : (index - 1 + ids.length) % ids.length;
    open(ids[next]);
    buttons.get(ids[next]).focus();
  });
  toggle.addEventListener('click', () => {
    if (temporarilyCollapsed) {
      onTemporaryReveal();
      state.collapsed = false;
      sync();
      return;
    }
    state.collapsed = !state.collapsed;
    sync();
  });

  // Rendu initial : le repli par défaut (largeur) n'est pas un choix à mémoriser.
  sync({ remember: false });

  return Object.freeze({
    element,
    open,
    restore,
    collapse,
    refresh,
    setTemporaryCollapsed(value) {
      if (temporarilyCollapsed === Boolean(value)) return;
      temporarilyCollapsed = Boolean(value);
      sync({ remember: false });
    },
    getState: () => ({ ...state })
  });
}
