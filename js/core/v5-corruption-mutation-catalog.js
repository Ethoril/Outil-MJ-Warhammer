import { L06_CORRUPTION_MUTATION_TABLES } from './v5-corruption-mutations-l06.js';
import { V5_L17_ARCANE_MARKS } from '../data/v5-corruption-mutations-l17.js';
import { V5_L23_MUTATION_TABLES } from '../data/v5-corruption-mutations-l23.js';

export const V5_CORRUPTION_MUTATION_DATA_VERSION = 'f2-k2-1';

const normalizeL06 = () => L06_CORRUPTION_MUTATION_TABLES.tables.map(table => ({
  id: table.id, family: table.family, domain: table.family, source: { book: 'L06', edition: 'V5', printedPage: 189, pdfPage: 189 },
  selection: table.selection, entries: table.entries.map(entry => ({
    id: entry.id, label: entry.name, summary: entry.summary, selection: entry.selection,
    source: entry.source, conversion: entry.conversion, effects: entry.effects,
    mechanicStatus: entry.mechanicStatus, questionsMJ: entry.questionsMJ, references: []
  }))
}));

const normalizeL17 = () => V5_L17_ARCANE_MARKS.map(table => ({
  id: table.id, family: table.famille, domain: table.id === 'l23-physical' || table.id === 'l23-beast-head' ? 'physical' : table.id === 'l23-mental' ? 'mental' : null, source: table.source,
  selection: table.selection, entries: table.entrees.map(entry => ({
    id: entry.id, label: entry.nom, summary: entry.resume, selection: entry.selection,
    source: entry.source, conversion: entry.conversion, effects: entry.effets,
    mechanicStatus: entry.statutMecanique, questionsMJ: entry.questionsMJ, references: []
  }))
}));

const normalizeL23 = () => V5_L23_MUTATION_TABLES.map(table => ({
  id: table.id, family: table.famille,
  domain: table.id === 'l23-physical' || table.id === 'l23-beast-head' ? 'physical' : table.id === 'l23-mental' ? 'mental' : null,
  source: table.source,
  selection: table.selection, entries: table.entrees.map(entry => ({
    id: entry.id, label: entry.nom, summary: entry.resume, selection: entry.selection,
    source: entry.source, conversion: entry.conversion, effects: entry.effets,
    mechanicStatus: entry.statutMecanique, questionsMJ: entry.questionsMJ, references: entry.source?.referencesF2 || [],
    referenceF2: entry.source?.referenceF2 || null
  }))
}));

const deepFreeze = value => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
};

export const V5_CORRUPTION_MUTATION_CATALOG = deepFreeze([
  ...normalizeL06(), ...normalizeL17(), ...normalizeL23()
]);

export function getCorruptionMutationTable(tableId) {
  return V5_CORRUPTION_MUTATION_CATALOG.find(table => table.id === tableId) || null;
}

export function resolveCorruptionMutationSelection({ tableId, entryId, result, column, renvoiParentEntryId } = {}) {
  const table = getCorruptionMutationTable(tableId);
  if (!table) throw new TypeError('Table de mutations inconnue');
  const entry = table.entries.find(row => row.id === entryId);
  if (!entry) throw new TypeError('Résultat de mutation inconnu dans cette table');
  const range = entry.selection || {};
  const selectedColumn = column || null;
  let matched = true;
  if (range.ranges && selectedColumn) matched = Boolean(range.ranges[selectedColumn]);
  if (range.ranges && !selectedColumn) matched = false;
  if (Number.isSafeInteger(range.min) && Number.isSafeInteger(range.max)) {
    const value = Number(result);
    matched = matched && Number.isSafeInteger(value) && value >= range.min && value <= range.max;
  }
  if (range.ranges && selectedColumn && Number.isSafeInteger(result)) {
    const text = range.ranges[selectedColumn];
    const parsed = typeof text === 'string' ? text.split('-').map(Number) : [];
    const inPrintedBand = parsed.length === 1 ? result === parsed[0]
      : parsed.length === 2 && (parsed[0] <= parsed[1] ? result >= parsed[0] && result <= parsed[1] : result >= parsed[0] || result <= parsed[1]);
    matched = matched && inPrintedBand;
  }
  if (range.min === undefined && range.max === undefined && !range.ranges && result !== undefined && result !== null) {
    const value = Number(result);
    matched = matched && Number.isSafeInteger(value) && value === range.min;
  }
  if (!matched) throw new RangeError('Le résultat saisi ne correspond pas à la ligne et à la colonne choisies');
  let renvoiParent = null;
  const renvoi = table.selection?.renvoiDepuis;
  if (typeof renvoi === 'string') {
    const [parentTableId, parentLabel] = renvoi.split(':');
    const parentTable = getCorruptionMutationTable(parentTableId);
    const parentEntry = parentTable?.entries.find(row => row.label === parentLabel);
    if (!parentEntry) throw new TypeError('Renvoi imprimé vers la table parente introuvable');
    renvoiParent = { tableId: parentTable.id, entryId: parentEntry.id, label: parentEntry.label, domain: parentTable.domain || null };
  } else if (Array.isArray(renvoi)) {
    const parentTables = V5_CORRUPTION_MUTATION_CATALOG.filter(parent => parent.entries.some(row => renvoi.includes(row.label)));
    const parent = parentTables.find(candidate => candidate.entries.some(row => row.id === renvoiParentEntryId && renvoi.includes(row.label)));
    const parentEntry = parent?.entries.find(row => row.id === renvoiParentEntryId);
    if (!parentEntry) throw new TypeError('Choisissez explicitement la ligne parente indiquée par le renvoi');
    renvoiParent = { tableId: parent.id, entryId: parentEntry.id, label: parentEntry.label, domain: parent.domain || null };
  }
  return deepFreeze({
    dataVersion: V5_CORRUPTION_MUTATION_DATA_VERSION,
    tableId: table.id, tableFamily: table.family, entryId: entry.id,
    ...((table.domain || renvoiParent?.domain) ? { domain: table.domain || renvoiParent.domain } : {}),
    label: entry.label, summary: entry.summary,
    result: result === '' || result === undefined ? null : Number(result), column: selectedColumn,
    source: { ...table.source, ...entry.source }, conversion: entry.conversion,
    effects: entry.effects || [], mechanicStatus: entry.mechanicStatus,
    questionsMJ: entry.questionsMJ || [],
    references: entry.references || [], referenceF2: entry.referenceF2 || entry.source?.referenceF2 || null,
    selection: entry.selection, tableSelection: table.selection,
    tableRenvoiFrom: renvoi || null, renvoiParent,
    tableNotes: table.source?.notes || null
  });
}
