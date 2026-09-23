/** E17 local profile parser. Input is inert text; no HTML, code or network is evaluated. */
import { ENGINES } from '../data/keyword-engines.js';
import { canonicalQualityId, normalizeQualities } from './quality-normalization.js';

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const stripAccents = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const keyText = value => stripAccents(value).toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const clone = value => value === null || typeof value !== 'object' ? value : Array.isArray(value) ? value.map(clone) : Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clone(child)]));

const FIELD_ALIASES = new Map([
  ['nom', 'name'], ['profil', 'name'], ['identite', 'name'], ['type', 'kind'], ['type pnj', 'kind'],
  ['groupe', 'group'], ['pv', 'hp'], ['points de vie', 'hp'], ['initiative', 'initiative'],
  ['notes', 'notes'], ['tags', 'tags'], ['mots cles', 'tags']
]);
const CARAC_NAMES = new Set(['cc', 'ct', 'f', 'e', 'agi', 'dex', 'int', 'fm', 'soc', 'm', 'a', 'bf', 'b']);
const ARMOR_NAMES = new Map([['tete', 'head'], ['tête', 'head'], ['corps', 'body'], ['body', 'body'], ['bras', 'arms'], ['jambes', 'legs'], ['head', 'head'], ['arms', 'arms'], ['legs', 'legs']]);

function splitBlocks(text) {
  return String(text ?? '').split(/^\s*---+\s*$/m).map(block => block.trim()).filter(Boolean);
}

function parseInteger(value, field, errors, line) {
  const raw = String(value ?? '').trim();
  if (!/^[+-]?\d+$/.test(raw)) {
    errors.push({ field, line, reason: 'entier-attendu', value: raw });
    return null;
  }
  const result = Number(raw);
  if (!Number.isSafeInteger(result)) {
    errors.push({ field, line, reason: 'entier-hors-limites', value: raw });
    return null;
  }
  return result;
}

function addField(fields, field, value, line) {
  if (!fields[field]) { fields[field] = { status: 'found', value, lines: [line] }; return; }
  fields[field].lines.push(line);
  if (JSON.stringify(fields[field].value) !== JSON.stringify(value)) fields[field].status = 'ambiguous';
}

function parseAction(value, line, errors, unknownQualities) {
  const parts = String(value).split('|').map(part => part.trim()).filter(Boolean);
  const action = { name: parts.shift() || `Action ligne ${line}`, qualities: [] };
  for (const part of parts) {
    const separator = part.indexOf('=');
    if (separator < 0) { action.note = action.note ? `${action.note} ; ${part}` : part; continue; }
    const key = keyText(part.slice(0, separator));
    const raw = part.slice(separator + 1).trim();
    if (key === 'base' || key === 'mod' || key === 'valeur' || key === 'valeurs') action[key === 'valeur' ? 'base' : key] = parseInteger(raw, key, errors, line);
    else if (key === 'degats' || key === 'damage') action.damage = raw;
    else if (key === 'qualites' || key === 'qualities') {
      const rawQualities = raw.split(',').map(item => item.trim()).filter(Boolean);
      action.qualities = normalizeQualities(rawQualities);
      rawQualities.forEach(item => { if (!ENGINES[canonicalQualityId(item)]) unknownQualities.push({ value: item, line, action: action.name }); });
    } else if (key === 'note' || key === 'texte') action.note = raw;
    else action[key.replace(/\s+/g, '')] = raw;
  }
  return action;
}

function parseBlock(block, blockIndex) {
  const fields = {};
  const errors = [];
  const ambiguities = [];
  const unknownQualities = [];
  const caracs = {};
  const armor = {};
  const actions = [];
  const lines = block.split(/\r?\n/);
  lines.forEach((rawLine, lineIndex) => {
    const line = lineIndex + 1;
    const content = rawLine.trim();
    if (!content || /^\[profil\]$/i.test(content)) return;
    const match = content.match(/^([^:=]+)\s*[:=]\s*(.*)$/);
    if (!match) { errors.push({ line, reason: 'ligne-non-reconnue', value: content }); return; }
    const label = keyText(match[1]);
    const value = match[2].trim();
    const field = FIELD_ALIASES.get(label);
    if (field) {
      const parsed = ['hp', 'initiative'].includes(field) ? parseInteger(value, field, errors, line) : field === 'tags' ? value.split(',').map(item => item.trim()).filter(Boolean) : value;
      addField(fields, field, parsed, line);
      return;
    }
    const caracLabel = label.replace(/^caracteristique[s]?\s+/, '');
    if (CARAC_NAMES.has(caracLabel)) {
      const valueNumber = parseInteger(value, `caracs.${caracLabel}`, errors, line);
      if (caracs[caracLabel] !== undefined && caracs[caracLabel] !== valueNumber) ambiguities.push({ field: `caracs.${caracLabel}`, line, reason: 'valeurs-concurrentes' });
      caracs[caracLabel] = valueNumber; return;
    }
    const armorMatch = label.match(/^(?:armure\s+)?(.+)$/);
    const armorKey = ARMOR_NAMES.get(armorMatch?.[1]);
    if (armorKey) { armor[armorKey] = parseInteger(value, `armor.${armorKey}`, errors, line); return; }
    if (label === 'action' || label === 'attaque' || label === 'capacite' || label === 'capacite') { actions.push(parseAction(value, line, errors, unknownQualities)); return; }
    errors.push({ line, reason: 'champ-inconnu', field: match[1].trim(), value });
  });
  for (const field of ['name', 'hp']) if (!fields[field]) fields[field] = { status: 'missing', value: null, lines: [] };
  for (const [field, value] of Object.entries(fields)) if (value.status === 'ambiguous') ambiguities.push({ field, lines: value.lines, reason: 'valeurs-concurrentes' });
  const profile = {
    name: fields.name.value,
    kind: fields.kind?.value || 'Créature',
    group: fields.group?.value || '',
    hp: fields.hp.value,
    initiative: fields.initiative?.value ?? null,
    caracs, armor, actions,
    tags: fields.tags?.value || [], notes: fields.notes?.value || ''
  };
  const blocking = ['name', 'hp'].some(field => fields[field].status !== 'found') || errors.some(item => item.reason === 'entier-attendu' || item.reason === 'entier-hors-limites');
  return { index: blockIndex, profile, fields, errors, ambiguities, unknownQualities, blocking, sourceText: block };
}

/** Parse one or more `Nom: …` blocks separated by a line containing `---`. */
export function parseProfileText(text) {
  if (typeof text !== 'string') throw new TypeError('Le texte du profil doit être une chaîne');
  const blocks = splitBlocks(text).map(parseBlock);
  const profiles = blocks.map(item => item.profile);
  return {
    status: blocks.some(item => item.blocking || item.ambiguities.length || item.unknownQualities.length) ? 'needs-review' : 'ready',
    profiles: clone(profiles), blocks: clone(blocks), sourceText: text,
    ambiguities: blocks.flatMap(item => item.ambiguities.map(value => ({ ...value, block: item.index }))),
    unknownQualities: blocks.flatMap(item => item.unknownQualities),
    errors: blocks.flatMap(item => item.errors.map(value => ({ ...value, block: item.index })))
  };
}

export const parseProfilesText = parseProfileText;
export const previewTextImport = parseProfileText;
