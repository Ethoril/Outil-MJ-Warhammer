/**
 * U8 lot L7 · contenu de supplément sans JS (docs/specs/moteur-effets-unifie/, CA8-CA10).
 *
 * Un supplément est une entrée de `js/data/v5-supplements.json` ; ses talents, prières et sorts s'écrivent en **clauses
 * communes** (vocabulaire de `effect-engine.js`, liste dans `docs/specs/moteur-effets-unifie/briques.md`, générée par
 * `tools/build-effect-bricks.mjs`). Le chargement est validé au démarrage : un élément invalide est écarté et signalé
 * (`SUPPLEMENT_ERRORS`, message qui nomme le supplément, l'élément et le champ, CA9) ; les éléments valides restent chargés et
 * l'application démarre.
 *
 *  - talent : contrat v2 des talents (mêmes clauses, coûts, exemptions et quotas d'action), ajouté au registre de `v5-talents.js` et évalué par
 *    `evaluateTalentContractsV2` comme un talent du livre. Le texte de l'effet (`description`) est épinglé par `source.effectHash`
 *    (sha256 du texte, vérifié par `tests/unit/moteur/supplement-sans-js.test.js`).
 *  - prière, sort : effets de couche (`modifySL` avant le jet, sur une clé de Test), compilés au format stocké des couches
 *    (`testModifiers`) que lit l'adaptateur `layerTestEffects` (v5-magic-talents.js) : cumul R3 p. 235 / Q10 dans la famille,
 *    somme entre prières et sorts (Q2). Le porteur (`bearer`) est déduit de la famille, jamais écrit par l'auteur.
 */
import supplementData from '../data/v5-supplements.json' with { type: 'json' };
import baseTalents from '../data/v5-talent-contracts.json' with { type: 'json' };
import testTalents from '../data/v5-test-talent-contracts.json' with { type: 'json' };
import qualityTalents from '../data/v5-quality-talent-contracts.json' with { type: 'json' };
import additionalTalents from '../data/v5-additional-talent-contracts.json' with { type: 'json' };
import spellContracts from '../data/v5-spell-contracts.json' with { type: 'json' };
import divineContracts from '../data/v5-divine-contracts.json' with { type: 'json' };
import { onlyFields, validateEffectClause, normalizeTestTarget } from './effect-engine.js';
import { validateV5ActionDeclarations } from './v5-action-costs-schema.js';
import { CARAC_KEYS } from './carac-keys.js';

export const SUPPLEMENT_SCHEMA_VERSION = 1;
/** Familles qu'un supplément peut déclarer : clé du JSON → famille du porteur. */
export const SUPPLEMENT_FAMILIES = Object.freeze({ talents: 'talent', prayers: 'prayer', spells: 'spell' });
/** Briques admises pour une prière ou un sort de supplément (format des couches stockées). */
export const LAYER_BRICKS = Object.freeze({ event: 'test.beforeRoll', role: 'actor', ops: Object.freeze(['modifySL']), stack: 'bestBonusWorstPenalty', stackGroup: 'magic-test' });

const SUPPLEMENT_KEYS = ['id', 'title', 'version', 'edition', 'reference', 'talents', 'prayers', 'spells'];
const TALENT_KEYS = ['id', 'name', 'description', 'status', 'source', 'clauses'];
const LAYER_KEYS = ['id', 'name', 'description', 'reference', 'clauses'];
/** Champs de lancement (MJ 06/11, Q4) : un sort et une prière de supplément sont lançables par les chemins existants. */
const SPELL_KEYS = [...LAYER_KEYS, 'page', 'lore', 'domain', 'wind', 'cn', 'range', 'target', 'duration', 'overcast', 'aoe'];
const PRAYER_KEYS = [...LAYER_KEYS, 'page', 'type', 'deity', 'range', 'targets', 'duration'];
export const SPELL_OVERCAST_OPTIONS = Object.freeze(['range', 'duration', 'targets', 'aoe']);
/** Paramètres de prière (vocabulaire du registre divin, `numericParam` de v5-divine-engine.js). */
export const PRAYER_PARAM_KINDS = Object.freeze({
  range: Object.freeze(['fixed', 'self', 'touch', 'characteristic', 'characteristic-bonus']),
  targets: Object.freeze(['count', 'self', 'characteristic-bonus']),
  duration: Object.freeze(['fixed', 'characteristic', 'characteristic-bonus']),
});
const CHARACTERISTICS = CARAC_KEYS;
const LAYER_CLAUSE_KEYS = ['id', 'event', 'role', 'when', 'effects'];
const LAYER_EFFECT_KEYS = ['op', 'amount', 'key', 'stackable'];

const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const text = value => typeof value === 'string' && value.trim() !== '';
const clone = value => structuredClone(value);
const deepFreeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };
class SupplementError extends TypeError {
  constructor(message, field) { super(message); this.field = field; }
}
const fail = (message, field) => { throw new SupplementError(message, field); };
const requireText = (value, field) => { if (!text(value)) fail(`champ « ${field} » requis`, field); };
const fields = (value, keys, prefix = '') => {
  try { onlyFields(value, keys, 'Champ non couvert'); } catch (error) { fail(error.field ? `champ « ${prefix}${error.field} » non couvert` : `objet requis${prefix ? ` (${prefix.slice(0, -1)})` : ''}`, error.field ? prefix + error.field : prefix.slice(0, -1) || null); }
};

/** Talent de supplément → contrat v2 (schéma des talents), validé par le validateur des talents. */
function compileTalent(element, supplement) {
  fields(element, TALENT_KEYS);
  requireText(element.id, 'id'); requireText(element.name, 'name'); requireText(element.description, 'description');
  if (!isRecord(element.source)) fail('champ « source » requis', 'source');
  if (!Array.isArray(element.clauses) || !element.clauses.length) fail('champ « clauses » requis (au moins une clause)', 'clauses');
  // Chaque clause d'abord par le moteur : son message nomme la clause et le champ fautif.
  for (const clause of element.clauses) {
    try { validateEffectClause({ ...clause, bearer: { kind: 'talent', sourceId: element.id } }); }
    catch (error) { fail(error.message, `clauses.${error.element ?? '?'}${error.field ? '.' + error.field : ''}`); }
  }
  // Coûts, exemptions et quotas d'action (« une fois par Round »…) : même vocabulaire que les talents du livre (v5-action-costs-schema.js).
  for (const clause of element.clauses) {
    try { validateV5ActionDeclarations({ costs: clause.costs, exemptions: clause.exemptions, quotas: clause.quotas }); }
    catch (error) { fail(`coûts ou quotas d’action refusés : ${error.message}`, `clauses.${clause.id}.${['quotas', 'costs', 'exemptions'].find(key => clause[key] !== undefined) ?? 'costs'}`); }
  }
  if (!['draft', 'validated'].includes(element.status ?? 'validated')) fail('statut « draft » ou « validated » requis', 'status');
  fields(element.source, ['reference', 'effectHash'], 'source.');
  requireText(element.source.reference, 'source.reference');
  if (!/^sha256:[a-f0-9]{64}$/.test(element.source.effectHash ?? '')) fail('empreinte « sha256:<64 hex> » du texte requise', 'source.effectHash');
  const seen = new Set();
  for (const clause of element.clauses) { if (seen.has(clause.id)) fail('clause dupliquée', `clauses.${clause.id}.id`); seen.add(clause.id); }
  // Même forme que les contrats v2 du livre (validateTalentContractV2 l'accepte : vérifié par le test du lot).
  const contract = { schemaVersion: 2, talentId: element.id, edition: 'V5', status: element.status ?? 'validated',
    ruleVersion: `supplement:${supplement.id}@${supplement.version}`, source: clone(element.source), clauses: clone(element.clauses) };
  return { contract, description: element.description };
}

/** Prière ou sort de supplément → élément compilé `{ id, name, kind, clauses (avec porteur), testModifiers }`. */
function compileLayerElement(element, kind, supplement) {
  fields(element, kind === 'spell' ? SPELL_KEYS : PRAYER_KEYS);
  requireText(element.id, 'id'); requireText(element.name, 'name');
  if (!Array.isArray(element.clauses) || !element.clauses.length) fail('champ « clauses » requis (au moins une clause)', 'clauses');
  const testModifiers = {};
  const clauses = element.clauses.map(raw => {
    const label = isRecord(raw) && text(raw.id) ? raw.id : '?';
    fields(raw, LAYER_CLAUSE_KEYS, `clauses.${label}.`);
    requireText(raw.id, `clauses.${label}.id`);
    if (raw.event !== LAYER_BRICKS.event) fail(`événement « ${raw.event} » non couvert pour une couche de ${kind === 'spell' ? 'sort' : 'prière'} (seul « ${LAYER_BRICKS.event} »)`, `clauses.${label}.event`);
    if (raw.role !== LAYER_BRICKS.role) fail(`rôle « ${raw.role} » non couvert pour une couche (seul « ${LAYER_BRICKS.role} »)`, `clauses.${label}.role`);
    if (!Array.isArray(raw.when) || raw.when.length) fail('une couche ne porte pas de condition : « when » doit être [] (la clé de Test cible le Test)', `clauses.${label}.when`);
    if (!Array.isArray(raw.effects) || !raw.effects.length) fail('au moins un effet requis', `clauses.${label}.effects`);
    const effects = raw.effects.map((effect, index) => {
      const at = `clauses.${label}.effects.${index}`;
      fields(effect, LAYER_EFFECT_KEYS, `${at}.`);
      if (!LAYER_BRICKS.ops.includes(effect.op)) fail(`opération « ${effect.op} » non couverte pour une couche (seule « modifySL »)`, `${at}.op`);
      if (!Number.isSafeInteger(effect.amount) || effect.amount === 0) fail('montant entier non nul requis', `${at}.amount`);
      try { normalizeTestTarget(effect.key); } catch { fail('clé de Test requise (« Endurance », « carac:e », « all »…)', `${at}.key`); }
      if (effect.stackable !== undefined && typeof effect.stackable !== 'boolean') fail('« stackable » : vrai ou faux', `${at}.stackable`);
      testModifiers[effect.key] = (testModifiers[effect.key] ?? 0) + effect.amount; // une couche = une source, ses clés s'additionnent (Q13)
      return { op: effect.op, amount: effect.amount, target: effect.key, stack: LAYER_BRICKS.stack, stackGroup: LAYER_BRICKS.stackGroup, ...(effect.stackable ? { stackable: true } : {}) };
    });
    return { id: raw.id, event: raw.event, role: raw.role, when: [], effects, bearer: { kind, sourceId: element.id } };
  });
  const stackable = element.clauses.some(clause => clause.effects?.some(effect => effect.stackable === true));
  if (stackable && element.clauses.some(clause => clause.effects?.some(effect => effect.stackable !== true))) fail('« stackable » doit valoir pour tous les effets de l’élément (la couche entière se cumule)', 'clauses');
  const compiled = { id: element.id, name: element.name, kind, supplementId: supplement.id, reference: element.reference ?? supplement.reference ?? null,
    description: element.description ?? null, clauses, testModifiers, ...(stackable ? { stackable: true } : {}) };
  compiled.contract = kind === 'spell' ? spellContract(element, compiled, supplement) : prayerContract(element, compiled, supplement);
  return compiled;
}

/** Sort de supplément → contrat de sort (format de `v5-spell-contracts.json`, effets `test-modifiers` comme Bonne Volonté). */
function spellContract(element, compiled, supplement) {
  requireText(element.lore, 'lore');
  if (!Number.isSafeInteger(element.cn) || element.cn < 0) fail('NI entière positive ou nulle requise', 'cn');
  for (const key of ['range', 'target', 'duration']) requireText(element[key], key);
  for (const key of ['domain', 'wind']) if (element[key] != null && !text(element[key])) fail('texte ou null attendu', key);
  if (element.page != null && !Number.isSafeInteger(element.page)) fail('page entière attendue', 'page');
  if (element.aoe !== undefined && typeof element.aoe !== 'boolean') fail('vrai ou faux attendu', 'aoe');
  const overcast = element.overcast ?? { allowed: false, options: [] };
  fields(overcast, ['allowed', 'options'], 'overcast.');
  if (typeof overcast.allowed !== 'boolean' || !Array.isArray(overcast.options) || overcast.options.some(option => !SPELL_OVERCAST_OPTIONS.includes(option)))
    fail(`surincantation : { allowed, options } avec options parmi ${SPELL_OVERCAST_OPTIONS.join(', ')}`, 'overcast');
  return { id: element.id, row: null, name: element.name, canonicalName: null, page: element.page ?? null, domain: element.domain ?? null, wind: element.wind ?? null,
    type: element.lore, cn: element.cn, range: element.range, target: element.target, duration: element.duration, sourceFingerprint: null, treatment: 'engine',
    overcast: { allowed: overcast.allowed, options: [...overcast.options] },
    effects: { type: 'test-modifiers', ...(element.aoe ? { aoe: true } : {}), testModifiers: { ...compiled.testModifiers }, ...(compiled.stackable ? { isStackable: true } : {}) },
    reminders: element.description ?? '', assistedClauses: [], sharedWith: null, sourceBook: supplement.id, edition: `Supplément ${supplement.title} (${supplement.edition})`,
    isBookV5: false, isElf: false, isWom: false, isJadeVariant: false, isCatalogue: false, isTradition: false, ficheFollowUp: false, isVortex: false, isAuxiliary: false,
    supplementId: supplement.id };
}

const BOOK_DIVINE = divineContracts.contracts;
const DIVINE_EXTENSIONS = {
  blessing: BOOK_DIVINE.find(row => row.id === 'divine:blessing:myrmidia:battle')?.extensions ?? [],
  miracle: BOOK_DIVINE.find(row => row.type === 'miracle' && row.extensions?.[0]?.sourceRef === 'miracle-scaling')?.extensions ?? [],
};
function prayerParam(value, name) {
  fields(value, ['kind', 'value', 'unit', 'characteristic'], `${name}.`);
  if (!PRAYER_PARAM_KINDS[name].includes(value.kind)) fail(`type « ${value.kind} » non couvert (${PRAYER_PARAM_KINDS[name].join(', ')})`, `${name}.kind`);
  if (['fixed', 'count'].includes(value.kind) && (!Number.isSafeInteger(value.value) || value.value < 0)) fail('valeur entière requise', `${name}.value`);
  if (value.kind.startsWith('characteristic') && !CHARACTERISTICS.includes(value.characteristic)) fail(`caractéristique parmi ${CHARACTERISTICS.join(', ')}`, `${name}.characteristic`);
  if (name === 'duration' && !['rounds', 'minutes', 'hours', 'days'].includes(value.unit)) fail('unité de durée : rounds, minutes, hours ou days', 'duration.unit');
  if (name === 'range' && ['fixed', 'characteristic', 'characteristic-bonus'].includes(value.kind) && value.unit !== 'yards') fail('unité de portée « yards » (mètres, même valeur)', 'range.unit');
  return clone(value);
}
/**
 * Prière de supplément → contrat divin v1 (format de `v5-divine-contracts.json`). Le talent requis (Béni / Invocation du dieu) et
 * la progression par DR sont repris d'une prière du livre du même dieu et du même type : un dieu sans prière au livre est refusé.
 */
function prayerContract(element, compiled, supplement) {
  if (!['blessing', 'miracle'].includes(element.type)) fail('type « blessing » ou « miracle » requis', 'type');
  requireText(element.deity, 'deity');
  const model = BOOK_DIVINE.find(row => row.type === element.type && row.deity === element.deity && row.requiredTalent?.id);
  if (!model) fail(`aucune ${element.type === 'blessing' ? 'bénédiction' : 'miracle'} du livre pour « ${element.deity} » : talent requis inconnu`, 'deity');
  if (element.page != null && !Number.isSafeInteger(element.page)) fail('page entière attendue', 'page');
  const params = { range: prayerParam(element.range, 'range'), targets: prayerParam(element.targets, 'targets'), duration: prayerParam(element.duration, 'duration') };
  const duration = params.duration.kind === 'fixed' ? { value: params.duration.value, unit: params.duration.unit }
    : { value: null, sourceParameter: 'params.duration', unit: params.duration.unit, requiresResolvedExpiry: true };
  const source = { document: `supplement:${supplement.id}`, fileSha256: null, edition: `${supplement.title} (${supplement.edition})`, sourceStatus: 'supplement-json',
    printedPage: element.page ?? null, section: element.name, clauses: [] };
  return { id: element.id, type: element.type, name: element.name, deity: element.deity, catalogueName: element.name, status: 'implemented',
    source, sourceReceipt: { ...clone(source), supplementId: supplement.id, supplementVersion: supplement.version },
    requiredTalent: clone(model.requiredTalent), requiredKnownPrayer: true, params, extensions: clone(DIVINE_EXTENSIONS[element.type]),
    effects: [{ type: 'test-modifier', modifiers: { ...compiled.testModifiers }, duration }],
    labels: { effect: element.description ?? '', sourceStatus: `Supplément ${supplement.title}` },
    clauses: [{ id: 'pray-test', mode: 'engine', sourceRef: 'prayer-success' }, ...compiled.clauses.map(clause => ({ id: clause.id, mode: 'engine', sourceRef: `supplement:${supplement.id}` }))],
    needsInput: [], supplementId: supplement.id };
}

/**
 * Charge un registre de suppléments `{ schemaVersion, supplements:[…] }`. Ne lève jamais d'exception : chaque erreur est rangée
 * dans `errors` (`{ supplementId, family, elementId, field, message }`, `message` lisible par le MJ) et l'élément est écarté.
 * `reservedIds` : identifiants déjà pris par le livre (`{ talent:Set, prayer:Set, spell:Set }`).
 */
export function loadSupplements(data, { reservedIds = {} } = {}) {
  const result = { talents: [], talentDescriptions: {}, talentHashes: {}, prayers: [], spells: [], errors: [] };
  const report = (supplementId, family, elementId, error) => {
    const field = error?.field ?? null;
    result.errors.push({ supplementId, family, elementId, field,
      message: `Supplément « ${supplementId} »${family ? `, ${family} « ${elementId} »` : ''}${field ? ` (champ « ${field} »)` : ''} : ${error?.message ?? error}` });
  };
  if (!isRecord(data) || data.schemaVersion !== SUPPLEMENT_SCHEMA_VERSION || !Array.isArray(data.supplements)) {
    report('?', null, null, new SupplementError(`registre illisible : { schemaVersion: ${SUPPLEMENT_SCHEMA_VERSION}, supplements: [] } attendu`, 'schemaVersion'));
    return deepFreeze(result);
  }
  const taken = Object.fromEntries(Object.values(SUPPLEMENT_FAMILIES).map(kind => [kind, new Set(reservedIds[kind] || [])]));
  const seenSupplements = new Set();
  for (const supplement of data.supplements) {
    const supplementId = isRecord(supplement) && text(supplement.id) ? supplement.id : '?';
    try {
      fields(supplement, SUPPLEMENT_KEYS);
      requireText(supplement.id, 'id'); requireText(supplement.title, 'title'); requireText(supplement.version, 'version');
      if (supplement.edition !== 'V5') fail('édition « V5 » requise', 'edition');
      if (seenSupplements.has(supplement.id)) fail('supplément dupliqué', 'id');
      seenSupplements.add(supplement.id);
      for (const key of Object.keys(SUPPLEMENT_FAMILIES)) if (supplement[key] !== undefined && !Array.isArray(supplement[key])) fail('liste attendue', key);
    } catch (error) { report(supplementId, null, null, error); continue; }
    for (const [key, kind] of Object.entries(SUPPLEMENT_FAMILIES)) {
      const label = { talent: 'talent', prayer: 'prière', spell: 'sort' }[kind];
      for (const element of supplement[key] || []) {
        const elementId = isRecord(element) && text(element.id) ? element.id : '?';
        try {
          if (taken[kind].has(elementId)) fail(`identifiant déjà pris (livre ou autre supplément)`, 'id');
          if (kind === 'talent') {
            const { contract, description } = compileTalent(element, supplement);
            result.talents.push(contract); result.talentDescriptions[contract.talentId] = description; result.talentHashes[contract.talentId] = contract.source.effectHash;
          } else result[key].push(compileLayerElement(element, kind, supplement));
          taken[kind].add(elementId);
        } catch (error) { report(supplementId, label, elementId, error); }
      }
    }
  }
  return deepFreeze(result);
}

/**
 * Couche stockée (`spellEffects` / `divineEffects`) d'une prière ou d'un sort de supplément posé sur une cible : même format que
 * les couches des sorts et prières du livre, lu par `layerTestEffects`.
 */
export function supplementLayer(element, { id = null, casterId = null } = {}) {
  if (!isRecord(element) || !['spell', 'prayer'].includes(element.kind)) throw new TypeError('Prière ou sort de supplément requis');
  const idKey = element.kind === 'spell' ? 'spellId' : 'prayerId';
  const nameKey = element.kind === 'spell' ? 'spellName' : 'prayerName';
  return { id: id ?? `${element.id}:layer`, [idKey]: element.id, [nameKey]: element.name, supplementId: element.supplementId,
    testModifiers: { ...element.testModifiers }, ...(element.stackable ? { stackable: true } : {}), ...(casterId != null ? { casterId: String(casterId) } : {}) };
}

/** Registre des talents du livre + talents de supplément (utilisé par `v5-talents.js`). */
export function mergeTalentRegistry(base, loaded) {
  return { contracts: [...base.contracts, ...loaded.talents], sourceDescriptions: { ...base.sourceDescriptions, ...loaded.talentDescriptions } };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Chargement au démarrage
// ---------------------------------------------------------------------------------------------------------------------------
export const BOOK_RESERVED_IDS = Object.freeze({
  talent: Object.freeze([...baseTalents.contracts, ...testTalents.contracts, ...qualityTalents.contracts, ...additionalTalents.contracts].map(row => row.talentId)),
  prayer: Object.freeze(divineContracts.contracts.map(row => row.id)),
  spell: Object.freeze(spellContracts.map(row => row.id)),
});
export const SUPPLEMENTS = loadSupplements(supplementData, { reservedIds: BOOK_RESERVED_IDS });
/** Erreurs du chargement au démarrage (affichées par `main.js`) ; vide quand tout est valide. */
export const SUPPLEMENT_ERRORS = SUPPLEMENTS.errors;
if (SUPPLEMENT_ERRORS.length && typeof console !== 'undefined') for (const error of SUPPLEMENT_ERRORS) console.error(`[supplément] ${error.message}`);

const byId = list => new Map(list.map(row => [row.id, row]));
const PRAYERS = byId(SUPPLEMENTS.prayers);
/** Contrats de lancement des sorts et prières de supplément (ajoutés aux registres de v5-spell-contracts.js et du divin). */
export const SUPPLEMENT_SPELL_CONTRACTS = Object.freeze(SUPPLEMENTS.spells.map(row => row.contract));
export const SUPPLEMENT_DIVINE_CONTRACTS = Object.freeze(SUPPLEMENTS.prayers.map(row => row.contract));
/** Un contrat divin est-il une prière de supplément chargée (source `supplement:<id>`) ? */
export const isSupplementDivineContract = contract => Boolean(typeof contract?.source?.document === 'string' && contract.source.document.startsWith('supplement:') && PRAYERS.has(contract.id));
