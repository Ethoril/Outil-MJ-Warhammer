import { getKeywordList } from '../core/keywords.js';
import { actionWeaponDamage, evaluateWeaponDamage, normalizeDamageFields, strengthBonusOf } from '../core/damage.js';
import { canonicalQualityId, normalizeQualities } from '../core/quality-normalization.js';

/** Aide des cases d'un jet, en infobulle : formulaire de profil et édition d'un combattant. */
export const ACTION_FIELD_HELP = Object.freeze({
  type: 'Type du jet : Attaque (dégâts, défense de la cible), Compétence, Défense ou Opposition. Vide : attaque s’il y a des dégâts, sinon compétence.',
  base: 'Score à atteindre au d100 (compétence ou caractéristique), par exemple 45.',
  mod: 'Modificateur ajouté au score à chaque jet, par exemple 10 ou −10.',
  note: 'Nom du jet, affiché dans Jouer et proposé quand ce personnage se défend (Épée, Esquive…).',
  damage: 'Dégâts de l’arme : un nombre (7) ou une formule avec le Bonus de Force (BF+4). Vide : aucun dégât.',
  qualities: 'Mots-clés de l’arme (Percutante, Précise…). Un mot-clé à X (Recharge X…) se règle ici avec sa valeur.',
  remove: 'Retirer ce jet'
});

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
  button.title = ACTION_FIELD_HELP.qualities;
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

export function createActionEditor({ container, action = {}, caracs, onChange = () => {} } = {}) {
  if (!container) throw new TypeError('Conteneur d’action manquant');
  let state = { ...action, qualities: normalizeQualities(action.qualities) };
  const root = document.createElement('div');
  root.className = 'action-editor';
  const input = (className, type, value, placeholder, label, title) => {
    const node = document.createElement('input');
    node.className = className; node.type = type; node.value = value ?? ''; node.placeholder = placeholder; node.title = title;
    node.setAttribute('aria-label', label);
    node.addEventListener('change', () => { state = readValue(); onChange({ ...state }); });
    return node;
  };
  const typeSelect = document.createElement('select'); typeSelect.className = 'action-type'; typeSelect.title = ACTION_FIELD_HELP.type; typeSelect.setAttribute('aria-label', 'Type du jet'); typeSelect.append(new Option('Type…', ''), new Option('Attaque', 'attack'), new Option('Compétence', 'skill'), new Option('Défense', 'defense'), new Option('Opposition', 'opposition')); typeSelect.value = state.type || ''; typeSelect.addEventListener('change', () => { state = readValue(); onChange({ ...state }); }); root.append(typeSelect);
  root.append(input('action-base', 'number', state.base, 'Score', 'Score', ACTION_FIELD_HELP.base));
  root.append(input('action-mod', 'number', state.mod || 0, 'Mod.', 'Modificateur', ACTION_FIELD_HELP.mod));
  root.append(input('action-note', 'text', state.note, 'Action / arme', 'Nom du jet', ACTION_FIELD_HELP.note));
  const damageInput = input('action-damage', 'text', state.damageFormula || state.damage, 'Dég. (BF+4)', 'Dégâts', ACTION_FIELD_HELP.damage);
  const damageValue = document.createElement('output');
  damageValue.className = 'action-damage-value';
  const refreshDamageValue = () => {
    // Evaluate what will be saved (`4.5` stays a number), not the raw text.
    const evaluation = evaluateWeaponDamage(actionWeaponDamage(normalizeDamageFields({ damage: damageInput.value })), strengthBonusOf(caracs));
    damageValue.textContent = evaluation.status === 'manual'
      ? (evaluation.reason === 'force-inconnue' ? 'F inconnue' : 'à arbitrer')
      : evaluation.kind === 'strength' ? `= ${String(evaluation.value).replace('-', '−')}` : '';
  };
  damageInput.addEventListener('input', refreshDamageValue);
  refreshDamageValue();
  root.append(damageInput, damageValue);
  const qualityContainer = document.createElement('span');
  // Les anciennes cases X et Cap. ne sont plus affichées : `...rest` garde leurs valeurs telles quelles.
  const readValue = () => {
    const { damageFormula, ...rest } = state;
    const damage = normalizeDamageFields({ damage: root.querySelector('.action-damage')?.value ?? '' });
    return { ...rest, type: root.querySelector('.action-type')?.value || '', base: root.querySelector('.action-base')?.value ?? '', mod: Number(root.querySelector('.action-mod')?.value) || 0, note: root.querySelector('.action-note')?.value ?? '', damage: damage.damage, ...(damage.damageFormula ? { damageFormula: damage.damageFormula } : {}), qualities: picker.getQualities() };
  };
  const picker = createQualityPicker({ container: qualityContainer, qualities: state.qualities, onChange: qualities => { state = { ...readValue(), qualities }; onChange({ ...state }); } });
  root.append(qualityContainer);
  container.append(root);
  return { element: root, picker, getValue: () => readValue() };
}
