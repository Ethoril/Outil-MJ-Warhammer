// Chantier H : écriture en retour de l'outil MJ vers les fiches des PJ (commande `outil-mj` de executeFicheCommand).
// Module pur : aucune E/S. L'envoi passe par fiche-source.js (`sendCommand`) ; l'écran relève de fiche-writeback-view.js.
// Contrat : docs/specs/chantier-h-ecriture-fiches/plan.md §1. Lot A : compteurs (`counter`), caractéristiques (`carac`, Base
// seulement). Lot B : Avances de Prière (`skill-adv`), talents et équipement (`row`). Lot C : « Suivi du MJ » (`suivi`).
// Identité de fiche, jamais de nom : une ligne sans `id` de fiche sûr est « à faire à la main ». Rien de réservé au MJ
// (preuves de jet, motifs, notes, mutations en attente, délais, perte de personnage à arbitrer) n'entre dans un change.
import { cloneValue } from './models.js';
import { sequelaEffectRows, sequelaCharacteristicTotals, normalizeCarac, PART_TEXT } from './v5-sequela-effects.js';
import { rebaseMagicLayers } from './v5-magic-effects.js';

export const WRITEBACK_COMMAND_TYPE = 'outil-mj';
const SEND_ID = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_CHANGES = 40;
// Compteurs : champ de la fiche → lecture dans l'outil et clé du snapshot (`durables` / `resources`).
const COUNTERS = Object.freeze({
  destin: { label: 'Destin modifié en jeu (outil MJ)', snapshot: ['durables', 'fate'] },
  fortune: { label: 'Fortune modifiée en jeu (outil MJ)', snapshot: ['resources', 'fortune'] },
  peche: { label: 'Péché modifié en jeu (outil MJ)', snapshot: ['durables', 'sin'] },
  corruption: { label: 'Corruption modifiée en jeu (outil MJ)', snapshot: ['durables', 'corruption'] }
});
// Clés de caractéristique de la fiche → clés canoniques de l'outil.
const CARACS = Object.freeze({ cc: 'CC', ct: 'CT', f: 'F', e: 'E', i: 'I', ag: 'Ag', dex: 'Dex', int: 'Int', fm: 'FM', soc: 'Soc' });
const FICHE_CARAC = Object.freeze(Object.fromEntries(Object.entries(CARACS).map(([key, canonical]) => [canonical, key])));

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const text = (value, max) => String(value).slice(0, max);
const ficheIdOf = subject => (typeof subject?.extensions?.ficheId === 'string' && subject.extensions.ficheId) || (typeof subject?.ficheSnapshot?.charId === 'string' && subject.ficheSnapshot.charId) || null;

/** Copies lues, dans l'ordre de priorité validé par le MJ (06/11) : participant du combat, scène active, personnage persistant, profil de réserve. */
function readCopies(state, charId) {
  return [state.combat?.participants, state.activeScene?.participants, state.persistentCharacters, state.reserve]
    .flatMap(rows => Array.isArray(rows) ? rows : []).filter(row => isRecord(row) && ficheIdOf(row) === charId);
}
/** Toutes les copies d'un personnage, scènes suspendues comprises, pour les mises à jour. */
function mapCopies(state, charId, transform) {
  const update = rows => Array.isArray(rows) ? rows.map(row => isRecord(row) && ficheIdOf(row) === charId ? transform(row) : row) : rows;
  state.reserve = update(state.reserve);
  state.persistentCharacters = update(state.persistentCharacters);
  if (state.combat) state.combat = { ...state.combat, participants: update(state.combat.participants) };
  if (state.activeScene) state.activeScene = { ...state.activeScene, participants: update(state.activeScene.participants) };
  if (Array.isArray(state.suspendedScenes)) state.suspendedScenes = state.suspendedScenes.map(scene => isRecord(scene) ? { ...scene, participants: update(scene.participants) } : scene);
}
/** Snapshot de fiche portant la base d'écriture : celui du profil de réserve d'abord, sinon la copie la plus récente. */
function baseSnapshot(state, charId) {
  const candidates = [...(state.reserve || []), ...readCopies(state, charId)].filter(row => ficheIdOf(row) === charId && row.ficheSnapshot?.charId === charId && isRecord(row.ficheSnapshot.writebackBase));
  return candidates[0]?.ficheSnapshot || null;
}
const linkedCharIds = state => [...new Set([state.reserve, state.persistentCharacters, state.combat?.participants, state.activeScene?.participants, ...(state.suspendedScenes || []).map(scene => scene?.participants)]
  .flatMap(rows => Array.isArray(rows) ? rows : []).map(ficheIdOf).filter(Boolean))].sort();

const writeback = state => state.extensions?.v5?.ficheWriteback || {};
const stable = value => Array.isArray(value) ? `[${value.map(stable).join(',')}]`
  : isRecord(value) ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
  : JSON.stringify(value === undefined ? null : value);
const same = (left, right) => stable(left) === stable(right);
const ROW_COLLECTIONS = Object.freeze(['talentsAcq', 'equipment']);
const MAX_ROW_ID = 200;
/** Clé d'un change → { op, collection?, id?, name? } (les identifiants peuvent contenir « : »). */
function parseKey(key) {
  const value = String(key);
  const op = value.slice(0, value.indexOf(':'));
  const rest = value.slice(op.length + 1);
  if (op === 'row') { const collection = rest.slice(0, rest.indexOf(':')); return { op, collection, id: rest.slice(collection.length + 1) }; }
  if (op === 'skill-adv' || op === 'suivi') return { op, id: rest };
  return { op, name: rest };
}
/** Première copie (ordre de priorité) qui porte une liste ; avertissement si les copies divergent. */
function firstList(state, charId, read) {
  const lists = readCopies(state, charId).map(read).filter(Array.isArray);
  return { value: lists[0] || [], disagree: new Set(lists.map(stable)).size > 1 };
}
const participantIdsOf = (state, charId) => new Set(readCopies(state, charId).concat((state.suspendedScenes || []).flatMap(scene => scene?.participants || []).filter(row => ficheIdOf(row) === charId)).map(row => row.id));
const reportedOf = (state, charId, key) => count(writeback(state).caracReported?.[charId]?.[key]) ?? 0;

/** Valeur de l'outil pour un compteur ; `null` quand l'outil ne la connaît pas. */
function toolCounter(state, charId, field) {
  if (field === 'fortune') {
    const entry = (state.extensions?.v5?.characterResources || []).find(row => row?.characterId === `fiche:${charId}`);
    return { value: count(entry?.fortune), disagree: false };
  }
  const read = subject => {
    const v5 = subject.extensions?.v5 || {};
    if (field === 'destin') return count(v5.fate ?? subject.fate);
    if (field === 'peche') return count(v5.divine?.sin);
    return count(v5.corruptionPoints);
  };
  const values = readCopies(state, charId).map(read).filter(value => value !== null);
  return { value: values.length ? values[0] : null, disagree: new Set(values).size > 1 };
}
/** Valeur d'un compteur brut de la fiche (chaîne de 0 à 4 chiffres, la chaîne vide vaut 0) ; NaN si illisible. */
const ficheCounterNumber = raw => raw === null || raw === undefined ? null
  : typeof raw === 'string' ? (/^\d{0,4}$/.test(raw) ? Number(raw || 0) : NaN)
  : Number.isSafeInteger(raw) && raw >= 0 ? raw : NaN;

/** Total des pertes permanentes par caractéristique (clé de fiche → points perdus), `split` ignoré (Q8). */
function permanentLosses(state, charId) {
  const register = state.extensions?.v5?.aftermathRegister;
  if (!register || !Array.isArray(register.sequelae)) return {};
  const ids = participantIdsOf(state, charId);
  const losses = {};
  for (const id of ids) {
    if (!register.sequelae.some(row => row.participantId === id)) continue;
    const totals = sequelaCharacteristicTotals(sequelaEffectRows(register, id), { lifetime: 'permanent' });
    for (const [carac, { amount }] of Object.entries(totals)) {
      const key = FICHE_CARAC[normalizeCarac(carac)];
      if (key && Number.isFinite(amount)) losses[key] = (losses[key] || 0) - amount;
    }
  }
  return losses;
}

/**
 * Différences durables du lot A, par fiche liée. `{ fiches: [{ charId, revision, rows }], skipped, empty }`.
 * Ligne : `{ key, op, label, ficheValue, toolValue, change, manual, reason?, warning?, meta? }` ; `change` est le Change
 * du contrat, `null` pour une ligne « à faire à la main ». Une fiche sans base d'écriture connue est écartée (`skipped`).
 */
export function planFicheWriteback(state) {
  const fiches = [];
  const skipped = [];
  for (const charId of linkedCharIds(state || {})) {
    const snapshot = baseSnapshot(state, charId);
    if (!snapshot) { skipped.push({ charId, reason: 'base-unknown' }); continue; }
    const base = snapshot.writebackBase;
    const rows = [];
    for (const [field, { label }] of Object.entries(COUNTERS)) {
      const tool = toolCounter(state, charId, field);
      if (tool.value === null) continue;
      const raw = Object.hasOwn(base.fields || {}, field) ? base.fields[field] : null;
      if (ficheCounterNumber(raw) === tool.value) continue;
      const ficheValue = raw === null ? null : String(raw);
      const row = { key: `counter:${field}`, op: 'counter', ficheValue, toolValue: String(tool.value), manual: false };
      const changeLabel = label;
      if (tool.value > 9999) Object.assign(row, { manual: true, reason: 'value-out-of-range', change: null, label: changeLabel });
      else Object.assign(row, { label: changeLabel, change: { op: 'counter', field, base: ficheValue, value: String(tool.value), label: changeLabel } });
      if (tool.disagree) row.warning = 'copies-disagree';
      rows.push(row);
    }
    const losses = permanentLosses(state, charId);
    for (const key of Object.keys(CARACS)) {
      const loss = losses[key] || 0;
      const reported = reportedOf(state, charId, key);
      const pending = loss - reported;
      if (pending === 0) continue;
      const label = text(loss > 0 ? `Séquelles permanentes : ${CARACS[key]} −${loss} au total` : `Séquelles permanentes levées : ${CARACS[key]}`, 200);
      const ficheBase = base.carac?.[key]?.base;
      const known = Number.isSafeInteger(Number(ficheBase)) && ficheBase !== '' && ficheBase !== null && typeof ficheBase !== 'boolean';
      const value = known ? Number(ficheBase) - pending : null;
      const row = { key: `carac:${key}`, op: 'carac', label, ficheValue: known ? Number(ficheBase) : null, toolValue: value, manual: false,
        meta: { caracReportedBefore: reported, caracReportedAfter: loss } };
      if (!known) Object.assign(row, { manual: true, reason: 'base-unknown', change: null });
      else if (value < 0) Object.assign(row, { manual: true, reason: 'loss-exceeds-base', change: null });
      else row.change = { op: 'carac', carac: key, base: Number(ficheBase), value, label };
      rows.push(row);
    }
    const dismissed = writeback(state).dismissed?.[charId] || {};
    rows.push(...[...prayerAndTalentRows(state, charId, snapshot), ...equipmentRows(state, charId, base), ...suiviRows(state, charId, base)]
      .filter(row => row.manual || !Object.hasOwn(dismissed, row.key) || dismissed[row.key] !== stable(row.change.value)));
    if (rows.length) fiches.push({ charId, revision: base.revision, rows });
  }
  return { fiches, skipped, empty: fiches.length === 0 };
}

const manualRow = (key, op, label, reason, extra = {}) => ({ key, op, label: text(label, 200), ficheValue: null, toolValue: null, change: null, manual: true, reason, ...extra });
const rowChange = (collection, id, base, value, label) => ({ key: `row:${collection}:${id}`, op: 'row', label, ficheValue: base, toolValue: value, manual: false,
  change: { op: 'row', collection, id, base: cloneValue(base), value: cloneValue(value), label } });
const validRowId = id => typeof id === 'string' && id.length >= 1 && id.length <= MAX_ROW_ID && id.trim() === id && !/[\u0000-\u001f]/u.test(id);

/** Lot B : rejet définitif (excommunication) → Avances de Prière à zéro et talents Béni / Invocation du culte retirés (CA18). */
function prayerAndTalentRows(state, charId, snapshot) {
  const base = snapshot.writebackBase;
  const rows = new Map();
  const rejections = firstList(state, charId, subject => subject.extensions?.v5?.divineRejections);
  const advanced = base.rows?.skillsAdvanced;
  const talents = base.rows?.talentsAcq;
  for (const record of rejections.value.filter(row => isRecord(row) && row.kind === 'permanent' && row.lossConfirmedBy === 'MJ')) {
    const cult = typeof record.cult === 'string' ? record.cult : '';
    const label = text(`Rejet définitif du culte${cult ? ` de ${cult}` : ''}`, 200);
    if (record.prayLoss?.skillId) {
      // La compétence de l'outil porte l'identifiant de la ligne de fiche (`storageKey`) ; `advanced:<n>` n'en est pas un.
      const skill = readCopies(state, charId).flatMap(subject => Array.isArray(subject.skills) ? subject.skills : []).find(row => row?.id === record.prayLoss.skillId);
      const id = typeof skill?.storageKey === 'string' && !skill.storageKey.startsWith('advanced:') ? skill.storageKey : null;
      const fiche = id && isRecord(advanced) && Object.hasOwn(advanced, id) ? advanced[id] : null;
      const manualKey = `manual:${record.id}:priere`;
      if (!isRecord(advanced)) rows.set(manualKey, manualRow(manualKey, 'skill-adv', `${label} : Avances de Prière à mettre à zéro`, 'collection-absent'));
      else if (!id || !fiche) rows.set(manualKey, manualRow(manualKey, 'skill-adv', `${label} : Avances de Prière à mettre à zéro`, 'no-fiche-id'));
      else if (!(Number.isSafeInteger(fiche.adv) && fiche.adv >= 0 && fiche.adv <= 999)) rows.set(`skill-adv:${id}`, manualRow(`skill-adv:${id}`, 'skill-adv', `${label} : Avances de Prière`, 'base-unknown'));
      else if (fiche.adv !== 0) {
        const changeLabel = text(`${label} : Avances de Prière à zéro`, 200);
        rows.set(`skill-adv:${id}`, { key: `skill-adv:${id}`, op: 'skill-adv', label: changeLabel, ficheValue: fiche.adv, toolValue: 0, manual: false,
          change: { op: 'skill-adv', id, base: fiche.adv, value: 0, label: changeLabel } });
      }
    }
    for (const [index, acquisition] of (record.removedTalents || []).flatMap(talent => Array.isArray(talent?.acquisitions) ? talent.acquisitions : []).entries()) {
      const changeLabel = text(`${label} : talent retiré`, 200);
      const manualKey = `manual:${record.id}:talent:${index}`;
      if (!isRecord(talents)) rows.set(manualKey, manualRow(manualKey, 'row', changeLabel, 'collection-absent'));
      else if (!validRowId(acquisition?.id)) rows.set(manualKey, manualRow(manualKey, 'row', changeLabel, 'no-fiche-id'));
      else if (Object.hasOwn(talents, acquisition.id)) rows.set(`row:talentsAcq:${acquisition.id}`, rowChange('talentsAcq', acquisition.id, talents[acquisition.id], null, changeLabel));
    }
  }
  return [...rows.values()].map(row => rejections.disagree ? { ...row, warning: 'copies-disagree' } : row);
}

/** Lot B : objet retenu par le Courroux retiré de la fiche ; rendu, il revient à l'identique s'il a été retiré par l'outil (CA19). */
function equipmentRows(state, charId, base) {
  const rows = new Map();
  const equipment = base.rows?.equipment;
  const kept = writeback(state).keptRows?.[charId] || {};
  const confiscations = firstList(state, charId, subject => subject.extensions?.v5?.divineConfiscations);
  for (const record of confiscations.value.filter(isRecord)) {
    const cult = typeof record.cult === 'string' ? record.cult : '';
    for (const [index, item] of (Array.isArray(record.items) ? record.items : []).entries()) {
      const key = `row:equipment:${item?.itemId}`;
      if (item?.status === 'held') {
        const label = text(`Objet retenu par le Courroux${cult ? ` (${cult})` : ''}`, 200);
        const manualKey = `manual:${record.id}:objet:${index}`;
        if (!isRecord(equipment)) rows.set(manualKey, manualRow(manualKey, 'row', label, 'collection-absent'));
        else if (!validRowId(item.itemId)) rows.set(manualKey, manualRow(manualKey, 'row', label, 'no-fiche-id'));
        else if (Object.hasOwn(equipment, item.itemId)) rows.set(key, rowChange('equipment', item.itemId, equipment[item.itemId], null, label));
      } else if (item?.status === 'returned' && validRowId(item.itemId) && isRecord(kept[key])) {
        // Seule la copie conservée au retrait par l'outil revient : un objet que l'outil n'a pas retiré n'est jamais recréé.
        const label = text(`Objet rendu après pénitence${cult ? ` (${cult})` : ''}`, 200);
        if (!isRecord(equipment)) rows.set(key, manualRow(key, 'row', label, 'collection-absent'));
        else if (!Object.hasOwn(equipment, item.itemId)) rows.set(key, rowChange('equipment', item.itemId, null, kept[key], label));
      }
    }
  }
  return [...rows.values()].map(row => confiscations.disagree ? { ...row, warning: 'copies-disagree' } : row);
}

const SUIVI_LABELS = Object.freeze({ penitence: 'pénitence', sequelle: 'séquelle', cicatrice: 'cicatrice', maladie: 'maladie', mutation: 'mutation' });
/** Lot C : entrées « Suivi du MJ » voulues, par identifiant `outil:<id source>` (CA20). Libellés et effets visibles seulement. */
function wantedSuivi(state, charId) {
  const wanted = new Map();
  const add = (sourceId, categorie, libelle, detail) => {
    if (typeof sourceId !== 'string' || !sourceId) return;
    const id = `outil:${sourceId}`;
    wanted.set(id, { id, categorie, libelle: text(libelle || SUIVI_LABELS[categorie], 200), detail: text(detail || '', 1000) });
  };
  const penances = firstList(state, charId, subject => subject.extensions?.v5?.divinePenances);
  for (const penance of penances.value.filter(row => isRecord(row) && row.status === 'open')) add(penance.id, 'penitence', `Pénitence${typeof penance.cult === 'string' && penance.cult ? ` (${penance.cult})` : ''}`, typeof penance.text === 'string' ? penance.text : '');
  const register = state.extensions?.v5?.aftermathRegister;
  const ids = participantIdsOf(state, charId);
  if (Array.isArray(register?.sequelae)) {
    for (const participantId of ids) {
      const own = register.sequelae.filter(row => isRecord(row) && row.participantId === participantId);
      if (!own.length) continue;
      let effects = [];
      try { effects = sequelaEffectRows(register, participantId); } catch { effects = []; }
      const detail = sequela => effects.filter(row => row.sourceId === sequela.id).map(row => row.label).join(' ; ');
      for (const sequela of own) {
        if (sequela.kind === 'loss' && sequela.status === 'permanent') add(sequela.id, 'sequelle', sequela.label || `Perte : ${PART_TEXT[sequela.part] || sequela.part}`, detail(sequela));
        else if (sequela.kind === 'broken-bone' && sequela.status === 'permanent') add(sequela.id, 'sequelle', `Fracture mal soignée (${PART_TEXT[sequela.part] || sequela.part})`, detail(sequela));
        else if (sequela.kind === 'scar' && sequela.status === 'permanent') add(sequela.id, 'cicatrice', sequela.label || 'Cicatrice', detail(sequela));
        else if (sequela.kind === 'scar-decision' && sequela.agreed === true) add(sequela.id, 'cicatrice', sequela.label || 'Cicatrices impressionnantes', detail(sequela));
      }
    }
  }
  for (const disease of Array.isArray(register?.diseases) ? register.diseases : []) {
    if (isRecord(disease) && ids.has(disease.participantId) && disease.status === 'active') add(disease.id, 'maladie', disease.label, '');
  }
  const mutations = firstList(state, charId, subject => subject.extensions?.v5?.corruptionMutations);
  for (const mutation of mutations.value.filter(row => isRecord(row) && row.status === 'confirmed')) add(mutation.id, 'mutation', mutation.label || mutation.description, typeof mutation.summary === 'string' ? mutation.summary : '');
  return { wanted, disagree: penances.disagree || mutations.disagree };
}

/** Lot C : différences du « Suivi du MJ ». Une entrée close dans l'outil part en `value: null` (CA22) ; les entrées hors `outil:` ne sont jamais touchées. */
function suiviRows(state, charId, base) {
  const { wanted, disagree } = wantedSuivi(state, charId);
  const current = new Map((Array.isArray(base.suiviMj) ? base.suiviMj : []).filter(row => isRecord(row) && typeof row.id === 'string').map(row => [row.id, row]));
  const rows = [];
  const push = (id, from, to) => {
    const entry = to || from;
    const label = text(`Suivi du MJ : ${SUIVI_LABELS[entry.categorie] || 'entrée'} ${to ? (from ? 'mise à jour' : 'ajoutée') : 'close'}`, 200);
    if (id.length > MAX_ROW_ID) { rows.push(manualRow(`suivi:${id}`, 'suivi', label, 'id-too-long')); return; }
    rows.push({ key: `suivi:${id}`, op: 'suivi', label, ficheValue: from, toolValue: to, manual: false, ...(disagree ? { warning: 'copies-disagree' } : {}),
      change: { op: 'suivi', id, base: cloneValue(from), value: cloneValue(to), label } });
  };
  for (const [id, entry] of wanted) { const from = current.get(id) || null; if (!same(from, entry)) push(id, from, entry); }
  for (const [id, entry] of current) if (id.startsWith('outil:') && !wanted.has(id)) push(id, entry, null);
  return rows;
}

/** Commande `outil-mj` d'une fiche : une seule opération, identifiant déterministe (CA6). Les lignes manuelles ne partent pas. */
export function buildFicheCommand(charId, rows, { sendId, revision, reason, undoOf } = {}) {
  if (typeof charId !== 'string' || !SEND_ID.test(charId)) throw new TypeError('Fiche invalide.');
  if (typeof sendId !== 'string' || !SEND_ID.test(sendId)) throw new TypeError('Identifiant d’envoi invalide.');
  if (!Number.isSafeInteger(revision) || revision < 0) throw new TypeError('Révision de la fiche inconnue : relisez les fiches.');
  if (typeof reason !== 'string' || reason.trim().length < 3 || reason.length > 1000) throw new TypeError('Motif de 3 à 1000 caractères requis.');
  const changes = (rows || []).filter(row => !row.manual && row.change).map(row => cloneValue(row.change));
  if (changes.length < 1 || changes.length > MAX_CHANGES) throw new TypeError(`Entre 1 et ${MAX_CHANGES} changements par fiche.`);
  if (undoOf !== undefined && (typeof undoOf !== 'string' || !undoOf)) throw new TypeError('Opération annulée invalide.');
  return { charId, operationId: `outilmj-${sendId}-${charId}`, baseRevision: revision, type: WRITEBACK_COMMAND_TYPE,
    payload: { reason: reason.trim(), sendId, ...(undoOf !== undefined ? { undoOf } : {}), changes } };
}

/**
 * Commandes inverses du dernier envoi (CA13–CA15) : seules les fiches réellement écrites et pas encore annulées.
 * Renvoie `[{ charId, command, rows }]` ; `rows` se passe à applyWritebackSuccess. Une annulation ne s'annule pas.
 */
export function buildUndoCommands(lastSend, { reason = null } = {}) {
  if (!lastSend) return [];
  if (lastSend.undoOf !== undefined || lastSend.kind === 'undo') throw new TypeError('Une annulation ne s’annule pas.');
  const sendId = `${String(lastSend.sendId).slice(0, 62)}-u`;
  const why = reason || `Annulation de l’envoi ${lastSend.sendId} (outil MJ)`;
  const result = [];
  for (const [charId, fiche] of Object.entries(lastSend.fiches || {})) {
    if (fiche.undone) continue;
    const rows = (fiche.rows || []).filter(row => row.change).map(row => {
      const label = text(`Annulation : ${row.change.label}`, 200);
      const inverse = { ...cloneValue(row.change), base: row.change.value, value: row.change.base, label };
      const undo = { ...cloneValue(row), label, undoOf: fiche.operationId, ficheValue: row.change.value, toolValue: row.change.base, change: inverse, manual: false };
      if (row.meta) undo.meta = { caracReportedBefore: row.meta.caracReportedAfter, caracReportedAfter: row.meta.caracReportedBefore };
      // Un compteur absent de la fiche avant l'envoi ne peut pas redevenir absent : à faire à la main.
      if (inverse.op === 'counter' && inverse.value === null) Object.assign(undo, { manual: true, reason: 'absent-before-send', change: null });
      return undo;
    });
    if (!rows.some(row => !row.manual)) continue;
    result.push({ charId, rows, command: buildFicheCommand(charId, rows, { sendId, revision: fiche.revision, reason: why, undoOf: fiche.operationId }) });
  }
  return result;
}

/** Erreur de la fonction → `{ fields, revision }` pour un conflit (CA10), sinon null. */
export function ficheConflictOf(error) {
  const code = String(error?.code || '');
  if (!['aborted', 'functions/aborted'].includes(code) || error?.details?.kind !== 'conflict') return null;
  return { fields: Array.isArray(error.details.fields) ? error.details.fields.filter(field => typeof field === 'string') : [],
    revision: Number.isSafeInteger(error.details.revision) ? error.details.revision : null };
}

/** Valeur actuelle d'une clé de conflit dans les données brutes d'une fiche relue (`null` si absente). */
export function ficheValueForKey(data, key) {
  const { op, name, collection, id } = parseKey(key);
  if (op === 'counter' && Object.hasOwn(COUNTERS, name)) return isRecord(data) && Object.hasOwn(data, name) ? cloneValue(data[name]) : null;
  if (op === 'carac' && Object.hasOwn(CARACS, name)) return data?.carac?.[name]?.base ?? null;
  if (!(op === 'skill-adv' || op === 'suivi' || (op === 'row' && ROW_COLLECTIONS.includes(collection))) || !id) throw new TypeError(`Clé de fiche non prise en charge : ${key}`);
  const list = op === 'skill-adv' ? data?.skillsAdvanced : op === 'suivi' ? data?.suiviMj : data?.[collection];
  const matches = (Array.isArray(list) ? list : []).filter(row => row?.id === id);
  if (matches.length !== 1) return null;
  return op === 'skill-adv' ? (Object.hasOwn(matches[0], 'adv') ? matches[0].adv : null) : cloneValue(matches[0]);
}

// ---------- Mises à jour de l'état de l'outil ----------

const ensureWriteback = next => {
  next.extensions = { ...(next.extensions || {}) };
  next.extensions.v5 = { ...(next.extensions.v5 || {}) };
  next.extensions.v5.ficheWriteback = cloneValue(next.extensions.v5.ficheWriteback || {});
  return next.extensions.v5.ficheWriteback;
};
const setReported = (next, charId, key, amount) => {
  const store = ensureWriteback(next);
  store.caracReported = { ...(store.caracReported || {}), [charId]: { ...(store.caracReported?.[charId] || {}), [key]: amount } };
};
/** Ce que l'outil sait de la fiche pour un compteur : base d'écriture et valeur lue par la synchronisation. */
function setFicheCounter(next, charId, field, raw) {
  const [group, name] = COUNTERS[field].snapshot;
  const number = ficheCounterNumber(raw);
  mapCopies(next, charId, subject => {
    if (subject.ficheSnapshot?.charId !== charId) return subject;
    const snapshot = cloneValue(subject.ficheSnapshot);
    snapshot.writebackBase ||= { fields: {}, carac: {}, rows: {}, unidentified: {} };
    snapshot.writebackBase.fields = { ...(snapshot.writebackBase.fields || {}), [field]: raw };
    if (count(number) !== null) snapshot[group] = { ...(snapshot[group] || {}), [name]: number };
    return { ...subject, ficheSnapshot: snapshot };
  });
}
/** Base de caractéristique désormais portée par la fiche : snapshot, puis caractéristiques de l'outil décalées d'autant. */
function setFicheCaracBase(next, charId, key, value) {
  const canonical = CARACS[key];
  mapCopies(next, charId, subject => {
    const old = subject.ficheSnapshot?.charId === charId ? Number(subject.ficheSnapshot.writebackBase?.carac?.[key]?.base) : NaN;
    if (!Number.isFinite(old)) return subject;
    const delta = value - old;
    const snapshot = cloneValue(subject.ficheSnapshot);
    snapshot.writebackBase.carac[key] = { ...snapshot.writebackBase.carac[key], base: value };
    if (Number.isFinite(snapshot.caracs?.[canonical])) snapshot.caracs = { ...snapshot.caracs, [canonical]: snapshot.caracs[canonical] + delta };
    let output = { ...subject, ficheSnapshot: snapshot };
    if (delta) {
      const v5 = output.extensions?.v5;
      const source = v5?.beastForm?.originalBaseCaracs || v5?.baseCaracs || output.baseCaracs || output.caracs;
      if (Number.isFinite(source?.[canonical])) output = rebaseMagicLayers(output, { caracs: { [canonical]: source[canonical] + delta } });
    }
    return output;
  });
}
/** Valeur de l'outil pour un compteur (« Garder la fiche ») : toutes les copies, ou le registre de Fortune. */
function setToolCounter(next, charId, field, value) {
  if (field === 'fortune') {
    const registry = cloneValue(next.extensions?.v5?.characterResources || []);
    const entry = registry.find(row => row?.characterId === `fiche:${charId}`);
    if (entry) entry.fortune = value; else registry.push({ characterId: `fiche:${charId}`, fortune: value, initializedFrom: 'fiche' });
    ensureWriteback(next);
    next.extensions.v5.characterResources = registry;
    return;
  }
  mapCopies(next, charId, subject => {
    const v5 = { ...(subject.extensions?.v5 || {}) };
    if (field === 'destin') v5.fate = value;
    else if (field === 'peche') v5.divine = { ...(v5.divine || {}), sin: value };
    else v5.corruptionPoints = value;
    const output = { ...subject, extensions: { ...(subject.extensions || {}), v5 } };
    if (field === 'destin' && Object.hasOwn(subject, 'fate')) output.fate = value;
    return output;
  });
}
/** Ligne de fiche (lots B et C) désormais connue de l'outil : base d'écriture ; null = absente. */
function setFicheLine(next, charId, op, collection, id, value) {
  mapCopies(next, charId, subject => {
    if (subject.ficheSnapshot?.charId !== charId || !isRecord(subject.ficheSnapshot.writebackBase)) return subject;
    const snapshot = cloneValue(subject.ficheSnapshot);
    const wb = snapshot.writebackBase;
    if (op === 'suivi') {
      const list = (Array.isArray(wb.suiviMj) ? wb.suiviMj : []).filter(row => row?.id !== id);
      wb.suiviMj = value === null ? list : [...list, cloneValue(value)];
    } else if (op === 'skill-adv') {
      wb.rows ||= {};
      if (isRecord(wb.rows.skillsAdvanced) && isRecord(wb.rows.skillsAdvanced[id])) {
        if (value === null) delete wb.rows.skillsAdvanced[id]; else wb.rows.skillsAdvanced[id] = { ...wb.rows.skillsAdvanced[id], adv: value };
      }
    } else {
      wb.rows ||= {};
      wb.rows[collection] = isRecord(wb.rows[collection]) ? wb.rows[collection] : {};
      if (value === null) delete wb.rows[collection][id]; else wb.rows[collection][id] = cloneValue(value);
    }
    return { ...subject, ficheSnapshot: snapshot };
  });
}
const setKept = (next, charId, key, value) => {
  const store = ensureWriteback(next);
  const rows = { ...(store.keptRows?.[charId] || {}) };
  if (value === null) delete rows[key]; else rows[key] = cloneValue(value);
  store.keptRows = { ...(store.keptRows || {}), [charId]: rows };
};
const setDismissed = (next, charId, key, value) => {
  const store = ensureWriteback(next);
  store.dismissed = { ...(store.dismissed || {}), [charId]: { ...(store.dismissed?.[charId] || {}), [key]: value } };
};
const setBaseRevision = (next, charId, revision) => mapCopies(next, charId, subject => {
  if (subject.ficheSnapshot?.charId !== charId || !isRecord(subject.ficheSnapshot.writebackBase)) return subject;
  const snapshot = cloneValue(subject.ficheSnapshot);
  snapshot.writebackBase.revision = revision;
  if (isRecord(snapshot.source)) snapshot.source.revision = revision;
  return { ...subject, ficheSnapshot: snapshot };
});

/**
 * Envoi réussi d'une fiche (CA7) : la base d'écriture et le snapshot portent les valeurs envoyées et la nouvelle révision,
 * « déjà reporté » suit les pertes, et le dernier envoi est enregistré. Une annulation (lignes `undoOf`) ne touche pas
 * l'état de jeu de l'outil et ne remplace pas le dernier envoi ; elle le marque annulé pour cette fiche.
 */
export function applyWritebackSuccess(state, charId, response, rows, { now = Date.now() } = {}) {
  if (!isRecord(response) || response.charId !== charId || !Number.isSafeInteger(response.revision) || typeof response.operationId !== 'string') throw new TypeError('Réponse de la fonction invalide.');
  const prefix = 'outilmj-';
  const suffix = `-${charId}`;
  if (!response.operationId.startsWith(prefix) || !response.operationId.endsWith(suffix)) throw new TypeError('Opération inattendue pour cette fiche.');
  const sendId = response.operationId.slice(prefix.length, -suffix.length);
  const sent = (rows || []).filter(row => !row.manual && row.change);
  const undoOf = sent.find(row => row.undoOf)?.undoOf;
  const next = cloneValue(state);
  for (const row of sent) {
    if (row.change.op === 'counter') setFicheCounter(next, charId, row.change.field, row.change.value);
    else if (row.change.op === 'carac') {
      setFicheCaracBase(next, charId, row.change.carac, row.change.value);
      if (Number.isSafeInteger(row.meta?.caracReportedAfter)) setReported(next, charId, row.change.carac, row.meta.caracReportedAfter);
    } else {
      const { op, collection, id, base, value } = row.change;
      setFicheLine(next, charId, op, collection, id, value);
      // Objet ou talent retiré : la ligne exacte est conservée pour une restitution à l'identique ; revenu, elle est oubliée.
      if (op === 'row') setKept(next, charId, `row:${collection}:${id}`, value === null ? base : null);
    }
  }
  setBaseRevision(next, charId, response.revision);
  const store = ensureWriteback(next);
  if (undoOf) {
    const fiche = store.lastSend?.fiches?.[charId];
    if (fiche?.operationId === undoOf) fiche.undone = { operationId: response.operationId, revision: response.revision, at: now };
  } else {
    if (store.lastSend?.sendId !== sendId) store.lastSend = { sendId, at: now, fiches: {} };
    store.lastSend.fiches[charId] = { operationId: response.operationId, revision: response.revision,
      rows: sent.map(row => ({ key: row.key, op: row.op, label: row.label, change: cloneValue(row.change), ...(row.meta ? { meta: cloneValue(row.meta) } : {}) })) };
  }
  return next;
}

/**
 * Choix du MJ sur un champ en conflit (CA11). `ficheValue` : valeur actuelle relue sur la fiche.
 * 'fiche' : l'outil reprend la valeur de la fiche ; pour une perte de caractéristique, seule la valeur à envoyer
 * s'aligne (« déjà reporté » = total) et la séquelle ne change pas (Q10). 'outil' : la base devient la valeur de la
 * fiche, le renvoi impose celle de l'outil.
 */
export function applyConflictChoice(state, charId, key, choice, ficheValue) {
  if (!['fiche', 'outil'].includes(choice)) throw new TypeError('Choix « fiche » ou « outil » attendu.');
  const [op, name] = String(key).split(':');
  const next = cloneValue(state);
  if (op === 'counter' && Object.hasOwn(COUNTERS, name)) {
    setFicheCounter(next, charId, name, ficheValue);
    if (choice === 'fiche') {
      const number = ficheCounterNumber(ficheValue);
      if (count(number) === null) throw new TypeError('Valeur de la fiche illisible : corrigez-la sur la fiche.');
      setToolCounter(next, charId, name, number);
    }
    return next;
  }
  if (op === 'carac' && Object.hasOwn(CARACS, name)) {
    const value = Number(ficheValue);
    if (!Number.isSafeInteger(value) || ficheValue === null || ficheValue === '') throw new TypeError('Base de la fiche illisible : à faire à la main.');
    setFicheCaracBase(next, charId, name, value);
    if (choice === 'fiche') setReported(next, charId, name, permanentLosses(next, charId)[name] || 0);
    return next;
  }
  const parsed = parseKey(key);
  if (['row', 'skill-adv', 'suivi'].includes(parsed.op) && (parsed.op !== 'row' || ROW_COLLECTIONS.includes(parsed.collection)) && parsed.id) {
    // « Garder la fiche » : l'outil ne réécrit pas ses registres (rejet, confiscation, suivi) ; la différence est écartée
    // tant que la valeur voulue par l'outil reste la même. « Imposer l'outil » : la base devient la valeur de la fiche.
    const wanted = planFicheWriteback(state).fiches.find(fiche => fiche.charId === charId)?.rows.find(row => row.key === key);
    setFicheLine(next, charId, parsed.op, parsed.collection, parsed.id, ficheValue ?? null);
    if (choice === 'fiche' && wanted?.change) setDismissed(next, charId, key, stable(wanted.change.value));
    return next;
  }
  throw new TypeError(`Clé de fiche non prise en charge : ${key}`);
}
