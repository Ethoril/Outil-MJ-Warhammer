/**
 * U8 lot L7 · contenu de supplément sans JS (docs/specs/moteur-effets-unifie/, CA8-CA10).
 *
 * Un supplément est une entrée de `js/data/v5-supplements.json` ; ses talents, prières et sorts s'écrivent en **clauses
 * communes** (vocabulaire de `effect-engine.js`, liste dans `docs/specs/moteur-effets-unifie/briques.md`, générée par
 * `tools/build-effect-bricks.mjs`). Le chargement est validé au démarrage : un élément invalide est écarté et signalé
 * (`SUPPLEMENT_ERRORS`, message qui nomme le supplément, l'élément et le champ, CA9) ; les éléments valides restent chargés et
 * l'application démarre.
 *
 *  - talent : contrat v2 des talents (mêmes clauses ; coûts et quotas d'action pas encore couverts), ajouté au registre de `v5-talents.js` et évalué par
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

export const SUPPLEMENT_SCHEMA_VERSION = 1;
/** Familles qu'un supplément peut déclarer : clé du JSON → famille du porteur. */
export const SUPPLEMENT_FAMILIES = Object.freeze({ talents: 'talent', prayers: 'prayer', spells: 'spell' });
/** Briques admises pour une prière ou un sort de supplément (format des couches stockées). */
export const LAYER_BRICKS = Object.freeze({ event: 'test.beforeRoll', role: 'actor', ops: Object.freeze(['modifySL']), stack: 'bestBonusWorstPenalty', stackGroup: 'magic-test' });

const SUPPLEMENT_KEYS = ['id', 'title', 'version', 'edition', 'reference', 'talents', 'prayers', 'spells'];
const TALENT_KEYS = ['id', 'name', 'description', 'status', 'source', 'clauses'];
const LAYER_KEYS = ['id', 'name', 'description', 'reference', 'clauses'];
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
  // Coûts, exemptions et quotas d'action : non couverts en L7 (leur validateur, v5-action-costs.js, ne peut pas être chargé ici
  // sans cycle d'import avec v5-talents.js). Refusés plutôt qu'appliqués sans contrôle (question au MJ).
  for (const clause of element.clauses) for (const key of ['costs', 'exemptions', 'quotas'])
    if (clause[key] !== undefined) fail(`« ${key} » non couvert pour un talent de supplément (coûts et quotas d’action : lot suivant)`, `clauses.${clause.id}.${key}`);
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
  fields(element, LAYER_KEYS);
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
  return { id: element.id, name: element.name, kind, supplementId: supplement.id, reference: element.reference ?? supplement.reference ?? null,
    description: element.description ?? null, clauses, testModifiers, ...(stackable ? { stackable: true } : {}) };
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
const SPELLS = byId(SUPPLEMENTS.spells), PRAYERS = byId(SUPPLEMENTS.prayers);
export const supplementSpell = id => SPELLS.get(id) ?? null;
export const supplementPrayer = id => PRAYERS.get(id) ?? null;
export const listSupplementSpells = () => [...SUPPLEMENTS.spells];
export const listSupplementPrayers = () => [...SUPPLEMENTS.prayers];
