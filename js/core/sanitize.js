import { normalizeEffects, normalizeState, resolveEffectCapability } from './effects.js';
import { cloneValue, normalizeAction, normalizeTags } from './models.js';

export function normalizeSearchText(value) {
  return String(value ?? '').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function sanitizeArray(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') return Object.values(val);
  return [];
}

export function sanitizeProfile(o) {
  if (!o || typeof o !== 'object' || !o.id || typeof o.id !== 'string') return null;
  return {
    id: String(o.id),
    name: (typeof o.name === 'string' && o.name.trim()) ? o.name.trim() : 'Sans-nom',
    kind: ['PJ', 'PNJ', 'Créature'].includes(o.kind) ? o.kind : 'Créature',
    initiative: Number(o.initiative) || 0,
    hp: Number(o.hp) || 0,
    caracs: (o.caracs && typeof o.caracs === 'object') ? cloneValue(o.caracs) : {},
    armor: (o.armor && typeof o.armor === 'object') ? cloneValue(o.armor) : { head: 0, body: 0, arms: 0, legs: 0 },
    diceLines: sanitizeArray(o.diceLines).map(normalizeAction),
    group: typeof o.group === 'string' ? o.group.trim() : '',
    tags: normalizeTags(o.tags),
    notes: typeof o.notes === 'string' ? o.notes : '',
    favorite: Boolean(o.favorite),
    extensions: (o.extensions && typeof o.extensions === 'object' && !Array.isArray(o.extensions)) ? o.extensions : {},
    ...(Array.isArray(o.actions) ? { actions: o.actions.map(normalizeAction) } : {})
  };
}

export function sanitizeParticipant(o) {
  const base = sanitizeProfile(o);
  if (!base) return null;
  return {
    ...base,
    profileId: o.profileId || null,
    persistentCharacterId: o.persistentCharacterId || null,
    improvised: Boolean(o.improvised),
    maxHp: o.maxHp !== undefined ? Number(o.maxHp) : undefined,
    // Les sauvegardes E04 peuvent encore contenir des chaînes ; conserver aussi
    // les objets modernes et leurs extensions lors de la normalisation.
    states: normalizeEffects(o.states),
    zone: ['active', 'bench'].includes(o.zone) ? o.zone : 'bench',
    camp: typeof o.camp === 'string' && o.camp.trim() ? o.camp.trim() : 'neutre',
    color: ['default', 'red', 'green', 'blue', 'purple', 'orange'].includes(o.color) ? o.color : 'default',
    tags: normalizeTags(o.tags),
    notes: typeof o.notes === 'string' ? o.notes : '',
    source: o.source == null ? null : cloneValue(o.source),
    extensions: (o.extensions && typeof o.extensions === 'object' && !Array.isArray(o.extensions)) ? o.extensions : {}
  };
}

export function parseState(s) {
  if (s && typeof s === 'object' && !Array.isArray(s)) {
    const name = typeof s.name === 'string' ? s.name : (typeof s.key === 'string' ? s.key : '');
    const duration = s.duration ?? s.remainingTurns ?? s.turns;
    const turns = duration === null || duration === undefined || duration === '' || !Number.isFinite(Number(duration))
      ? null : (Number(duration) > 0 ? Math.floor(Number(duration)) : null);
    return { name, turns };
  }
  if (typeof s !== 'string') return { name: '', turns: null };
  const idx = s.indexOf('|');
  if (idx === -1) return { name: s, turns: null };
  return { name: s.slice(0, idx), turns: parseInt(s.slice(idx + 1)) || null };
}

const MODE_LABELS = Object.freeze({ automatic: 'Automatique', reminder: 'Rappel', manual: 'Manuel' });

export function makeStateBadge(rawState, index = 0) {
  const state = normalizeState(rawState, index);
  const { name, turns } = parseState(state);
  const level = state.level > 1 ? ` ×${state.level}` : '';
  const duration = turns === null ? '' : ` · ${turns} tour${turns > 1 ? 's' : ''}`;
  const capability = resolveEffectCapability(state);
  const el = document.createElement('span');
  el.className = 'badge warn state-badge';
  el.title = 'Cliquer pour retirer';
  el.dataset.stateId = state.id;
  el.dataset.mode = capability.mode;
  el.title = `Cliquer pour retirer · ${MODE_LABELS[capability.mode] || 'Manuel'}`;
  el.textContent = `${name}${level}${duration} · ${MODE_LABELS[capability.mode] || 'Manuel'}`;
  return el;
}
