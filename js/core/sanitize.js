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
    kind: ['PJ', 'Créature'].includes(o.kind) ? o.kind : 'Créature',
    initiative: Number(o.initiative) || 0,
    hp: Number(o.hp) || 0,
    caracs: (o.caracs && typeof o.caracs === 'object') ? o.caracs : {},
    armor: (o.armor && typeof o.armor === 'object') ? o.armor : { head: 0, body: 0, arms: 0, legs: 0 },
    diceLines: sanitizeArray(o.diceLines),
    group: typeof o.group === 'string' ? o.group.trim() : ''
  };
}

export function sanitizeParticipant(o) {
  const base = sanitizeProfile(o);
  if (!base) return null;
  return {
    ...base,
    profileId: o.profileId || null,
    maxHp: o.maxHp !== undefined ? Number(o.maxHp) : undefined,
    states: Array.isArray(o.states) ? o.states.filter(s => typeof s === 'string') : [],
    zone: ['active', 'bench'].includes(o.zone) ? o.zone : 'bench',
    color: ['default', 'red', 'green', 'blue', 'purple', 'orange'].includes(o.color) ? o.color : 'default'
  };
}

export function parseState(s) {
  const idx = s.indexOf('|');
  if (idx === -1) return { name: s, turns: null };
  return { name: s.slice(0, idx), turns: parseInt(s.slice(idx + 1)) || null };
}

export function makeStateBadge(rawState) {
  const { name, turns } = parseState(rawState);
  const el = document.createElement('span');
  el.className = 'badge warn state-badge';
  el.title = 'Cliquer pour retirer';
  el.dataset.raw = rawState;
  el.textContent = turns ? `${name} ×${turns}` : name;
  return el;
}
