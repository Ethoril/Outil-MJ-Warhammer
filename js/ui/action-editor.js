import { getKeywordList } from '../core/keywords.js';
import { canonicalQualityId, normalizeQualities } from '../core/quality-normalization.js';

/**
 * Petit éditeur partagé de qualités. Il conserve les libellés inconnus et
 * renvoie toujours une liste canonisée au moteur.
 */
export function createQualityPicker({ container, qualities = [], onChange = () => {} } = {}) {
  if (!container) throw new TypeError('Conteneur de qualités manquant');
  let current = normalizeQualities(qualities);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-inoffensive';
  button.title = 'Ajouter ou modifier les qualités';
  const popover = document.createElement('div');
  popover.className = 'color-palette hidden';
  popover.style.cssText = 'position:absolute; top:28px; left:0; width:240px; max-height:260px; overflow-y:auto; background:var(--panel); border:1px solid var(--border); border-radius:6px; padding:6px; z-index:100; box-shadow:0 4px 12px rgba(0,0,0,0.4);';
  container.style.position = 'relative';
  container.style.display = 'inline-block';

  const refreshButton = () => {
    button.textContent = current.length ? `Mots-clés (${current.length})` : 'Mots-clés';
    button.classList.toggle('active', current.length > 0);
  };

  const commit = next => {
    current = normalizeQualities(next);
    refreshButton();
    onChange(current.map(item => ({ ...item })));
  };

  const render = () => {
    popover.replaceChildren();
    const known = getKeywordList();
    const entries = [...known];
    for (const quality of current) {
      const id = canonicalQualityId(quality);
      if (id && !entries.some(item => canonicalQualityId(item.slug || item.name) === id)) {
        entries.push({ name: quality.name || quality.id, slug: id, effect: 'Qualité conservée ; moteur local à confirmer.', hasRating: false, unknown: true });
      }
    }
    entries.forEach(keyword => {
      const id = canonicalQualityId(keyword.slug || keyword.name);
      const active = current.find(item => canonicalQualityId(item) === id);
      const row = document.createElement('label');
      row.style.cssText = 'display:flex; align-items:center; gap:6px; font-size:0.82em; padding:3px 4px; cursor:pointer; color:var(--text);';
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = Boolean(active);
      check.style.margin = '0';
      const text = document.createElement('span');
      text.textContent = keyword.name;
      text.title = keyword.effect || '';
      row.append(check, text);
      if (keyword.hasRating && active) {
        const rating = document.createElement('input');
        rating.type = 'number'; rating.min = '1'; rating.max = '99'; rating.value = active.rating || 1;
        rating.title = 'Valeur X'; rating.style.cssText = 'width:42px; margin-left:auto;';
        rating.addEventListener('change', () => {
          commit(current.map(item => canonicalQualityId(item) === id ? { ...item, rating: Math.max(1, parseInt(rating.value, 10) || 1) } : item));
        });
        row.append(rating);
      }
      check.addEventListener('change', () => {
        if (check.checked) {
          commit([...current, { id, name: keyword.name, ...(keyword.hasRating ? { rating: 1 } : {}) }]);
        } else {
          commit(current.filter(item => canonicalQualityId(item) !== id));
        }
        render();
      });
      popover.append(row);
    });
  };

  button.addEventListener('click', event => {
    event.stopPropagation();
    popover.classList.toggle('hidden');
    if (!popover.classList.contains('hidden')) render();
  });
  container.append(button, popover);
  refreshButton();
  return {
    button,
    popover,
    getQualities: () => current.map(item => ({ ...item })),
    setQualities(next) { current = normalizeQualities(next); refreshButton(); render(); }
  };
}

export function createActionEditor({ container, action = {}, onChange = () => {} } = {}) {
  if (!container) throw new TypeError('Conteneur d’action manquant');
  let state = { ...action, qualities: normalizeQualities(action.qualities) };
  const root = document.createElement('div');
  root.className = 'action-editor';
  const input = (className, type, value, placeholder, title) => {
    const node = document.createElement('input');
    node.className = className; node.type = type; node.value = value ?? ''; node.placeholder = placeholder; node.title = title;
    node.addEventListener('change', () => { state = readValue(); onChange({ ...state }); });
    return node;
  };
  const typeSelect = document.createElement('select'); typeSelect.className = 'action-type'; typeSelect.title = 'Type d’action'; typeSelect.append(new Option('Type…', ''), new Option('Attaque', 'attack'), new Option('Compétence', 'skill'), new Option('Défense', 'defense'), new Option('Opposition', 'opposition')); typeSelect.value = state.type || ''; typeSelect.addEventListener('change', () => { state = readValue(); onChange({ ...state }); }); root.append(typeSelect);
  root.append(input('action-base', 'number', state.base, 'Score', 'Score de base'));
  root.append(input('action-mod', 'number', state.mod || 0, 'Mod.', 'Modificateur'));
  root.append(input('action-note', 'text', state.note, 'Action / arme', 'Nom ou note de l’action'));
  root.append(input('action-damage', 'number', state.damage, 'Dég.', 'Dégâts de base'));
  root.append(input('action-values-x', 'number', state.valuesX, 'X', 'Valeur X du mot-clé'));
  root.append(input('action-capacity', 'number', state.capacity, 'Cap.', 'Capacité ou munitions'));
  const qualityContainer = document.createElement('span');
  const readValue = () => ({ ...state, type: root.querySelector('.action-type')?.value || '', base: root.querySelector('.action-base')?.value ?? '', mod: Number(root.querySelector('.action-mod')?.value) || 0, note: root.querySelector('.action-note')?.value ?? '', damage: Number(root.querySelector('.action-damage')?.value) || 0, valuesX: root.querySelector('.action-values-x')?.value || null, capacity: root.querySelector('.action-capacity')?.value || null, qualities: picker.getQualities() });
  const picker = createQualityPicker({ container: qualityContainer, qualities: state.qualities, onChange: qualities => { state = { ...readValue(), qualities }; onChange({ ...state }); } });
  root.append(qualityContainer);
  container.append(root);
  return { element: root, picker, getValue: () => readValue() };
}
