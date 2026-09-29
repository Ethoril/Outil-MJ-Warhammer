/** Pure lecture des effets de la table des critiques : ce que l'appli propose d'appliquer, et le reste en rappel. */
import { normalizeState } from './effects.js';

// Nom lu dans la table (sans accent, minuscules) → nom de l'état dans l'appli.
const STATE_NAMES = Object.freeze({
  hemorragie: 'Hémorragique',
  sonne: 'Sonné',
  aveugle: 'Aveuglé',
  assourdi: 'Assourdi',
  'a terre': 'À Terre',
  extenue: 'Exténué'
});
const STATE_PART = /^(?:(\d+)\s+)?(Hémorragie|Sonné|Aveuglé|Assourdi|À Terre|Exténué)$/i;
const CONDITIONAL = /(?:^|[^\p{L}])(?:test|ou|risque|si)(?![\p{L}])|\d+d\d+/iu;

const plain = text => text.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** `{ extraWounds, states: [{ key, name, level }], reminders: [texte], death }` d'une ligne de la table. */
export function parseCriticalEffect(text) {
  const out = { extraWounds: 0, states: [], reminders: [], death: false };
  const addState = (name, level) => {
    const state = normalizeState({ name, level });
    const known = out.states.find(item => item.key === state.key);
    if (known) known.level += level;
    else out.states.push({ key: state.key, name: state.name, level });
  };
  const segments = String(text ?? '').replace(/Rés\./g, 'Rés').split(/[,.;]/).map(item => item.trim()).filter(Boolean);
  for (const segment of segments) {
    const wounds = /^\+(\d+)\s+Blessures?$/.exec(segment);
    if (wounds) { out.extraWounds += Number(wounds[1]); continue; }
    if (segment === 'Mort instantanée') { out.death = true; continue; }
    const noted = /^(.*?)\s*\(([^)]*)\)$/.exec(segment);
    const core = noted ? noted[1] : segment;
    const note = noted ? noted[2].trim() : '';
    if (CONDITIONAL.test(core)) { out.reminders.push(segment); continue; }
    const parts = core.split(/\s+et\s+/i).map(part => STATE_PART.exec(part.trim()));
    if (parts.some(part => !part)) { out.reminders.push(segment); continue; }
    parts.forEach(([, level, name]) => addState(STATE_NAMES[plain(name)], Number(level) || 1));
    if (note) {
      const label = core.replace(/^\d+\s+/, '');
      out.reminders.push(/\d/.test(note) ? `${label} (${note})` : `${label} : ${note}`);
    }
  }
  return out;
}
