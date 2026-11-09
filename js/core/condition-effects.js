/**
 * U8 lot L4 (docs/specs/moteur-effets-unifie/) : les États passent dans le moteur d'effets (`combineEffects`).
 * Adaptateur pur : lit les niveaux d'États pertinents d'un Test et leurs exceptions, produit des effets portés par la famille
 * `condition`, cumulés en `strongest` (V5 : des pénalités d'États différentes ne s'additionnent pas, seule la plus forte
 * s'applique). Les autres familles (talent, sort, prière) restent des lignes distinctes du Test et se somment à la pénalité
 * d'États (MJ 05/11 Q3, MJ 06/11 Q12, `BETWEEN_GROUPS`).
 */
import { combineEffects } from './effect-engine.js';

const PENALTY_GROUP = 'condition-penalty';
const DISADVANTAGE_GROUP = 'condition-disadvantage';

/**
 * Exceptions appliquées aux niveaux avant le cumul :
 *  - `ignoreAll` : Endurance de l'anachorète (`ignoreConditionPenalties`, p. 226), aucune pénalité d'État ;
 *  - `ignoreFatigue` : `ignoreFatiguePenalties` (Œil de la tempête en magie), Exténué compté mais sans pénalité ; Clarté d'esprit
 *    n'efface pas Exténué (MJ 06/11) ;
 *  - `ignoreStun` : Clarté de pensée sur un Test mental (`clarityOfThought`), Sonné sans pénalité ;
 *  - `talentIgnores` : propositions `ignoreConditionPenalty` des talents (`{ key, amount }`), niveaux retirés de l'État visé.
 * Retourne `{ penalty, levels, kept, dropped }` : `penalty` positif (montant de la pénalité en DR), `levels` les niveaux
 * pénalisants après exceptions, `kept`/`dropped` les États retenus et écartés par la règle de cumul (CA7).
 */
export function conditionPenaltyEffects(relevant, { ignoreAll = false, ignoreFatigue = false, ignoreStun = false, talentIgnores = [] } = {}) {
  const levels = new Map(relevant);
  if (ignoreFatigue && levels.has('extenue')) levels.set('extenue', 0);
  for (const effect of talentIgnores) if (levels.has(effect.key)) levels.set(effect.key, Math.max(0, (levels.get(effect.key) || 0) - effect.amount));
  if (ignoreStun && levels.has('sonne')) levels.set('sonne', 0);
  if (ignoreAll) levels.clear();
  const entries = [...levels].filter(([, level]) => level > 0).map(([key, level]) => ({
    bearer: { kind: 'condition', sourceId: key },
    effect: { op: 'modifySL', amount: -level, stack: 'strongest', stackGroup: PENALTY_GROUP } }));
  const combined = combineEffects(entries);
  const group = combined.groups[0];
  return { penalty: Math.max(0, -(combined.totals.modifySL ?? 0)), levels,
    kept: group ? group.kept.map(entry => entry.bearer.sourceId) : [],
    dropped: group ? group.dropped.map(({ entry, rule }) => ({ key: entry.bearer.sourceId, rule })) : [] };
}

/**
 * Désavantages d'États : un seul État en donne, le plus fort (plus grand nombre de Désavantages ; à égalité, le premier
 * déclaré). `byCondition` : Map clé d'État → liste de Désavantages `{ id, label }`. Retourne la liste retenue.
 */
export function conditionDisadvantageEffects(byCondition) {
  const entries = [...byCondition].filter(([, rows]) => rows.length).map(([key, rows]) => ({
    bearer: { kind: 'condition', sourceId: key },
    effect: { op: 'grantDisadvantage', amount: rows.length, stack: 'strongest', stackGroup: DISADVANTAGE_GROUP } }));
  const group = combineEffects(entries).groups[0];
  return group ? byCondition.get(group.kept[0].bearer.sourceId) : [];
}

/** Questions posées au MJ quand le contexte du Test ne dit pas si un État pèse (mêmes libellés pour tous les Tests). */
export const CONDITION_QUESTIONS = Object.freeze({
  movement: 'Préciser si le Test implique un mouvement.',
  escape: 'Préciser si le Test sert à fuir ou se cacher.',
  sight: 'Préciser si le Test repose sur la vue.',
  fellowship: 'Préciser si le Test utilise la Sociabilité.'
});

/**
 * Un seul calcul des États d'un Test, celui du combat, pour tous les Tests (MJ 06/11 Q19 : combat, magie, contexte de Test).
 * `levels` : Map clé d'État → niveau ; `kind` : `melee`, `ranged` ou `test` ; `attr` : Caractéristique du Test ;
 * `context` : `involvesMovement`, `runningOrHiding`, `requiresSight`, `reliesOnSight`, `usesFellowship`, `festeringWounds` ;
 * `ignoreAll` : Endurance de l'anachorète (p. 226), ni pénalité ni Désavantage d'État, les restrictions restent.
 * Rend `{ relevant, disadvantages, unresolved, restrictions }` : `relevant` (Map des niveaux pénalisants, pour
 * `conditionPenaltyEffects`), `disadvantages` (Map clé d'État → `{ count, label }`, dans l'ordre À terre, Aveuglé, Souillé),
 * `unresolved` (questions au MJ, `CONDITION_QUESTIONS`), `restrictions` (Aveuglé sans tir, Test qui exige la vue).
 */
export function conditionTestRules(levels, { kind = 'test', attr = null, context = {}, ignoreAll = false } = {}) {
  const relevant = new Map(['sonne', 'extenue', 'empoisonne'].map(key => [key, levels.get(key) || 0]));
  const disadvantages = new Map(), unresolved = [], restrictions = [], questions = [];
  const question = label => { if (!questions.includes(label)) questions.push(label); };
  const movement = kind === 'melee' ? true : context.involvesMovement;
  if (levels.has('enchevetre') && !ignoreAll) {
    if (kind !== 'melee') question(CONDITION_QUESTIONS.movement);
    if (movement == null) unresolved.push(CONDITION_QUESTIONS.movement);
    if (movement) relevant.set('enchevetre', levels.get('enchevetre'));
  }
  if (levels.has('brise') && !ignoreAll) {
    const escape = kind !== 'test' ? false : context.runningOrHiding;
    if (kind === 'test') question(CONDITION_QUESTIONS.escape);
    if (escape == null) unresolved.push(CONDITION_QUESTIONS.escape);
    if (escape === false) relevant.set('brise', levels.get('brise'));
  }
  if (levels.has('aterre') && !ignoreAll) {
    if (kind !== 'melee') question(CONDITION_QUESTIONS.movement);
    if (movement == null) unresolved.push(CONDITION_QUESTIONS.movement);
    if (movement) disadvantages.set('aterre', { count: 1, label: 'À terre' });
  }
  if (levels.has('aveugle')) {
    const blinded = { count: levels.get('aveugle'), label: 'Aveuglé' };
    if (kind === 'ranged') restrictions.push('Un combattant Aveuglé ne peut pas effectuer de tir.');
    if (kind === 'melee' && !ignoreAll) disadvantages.set('aveugle', blinded);
    if (kind === 'test' && context.requiresSight === true) restrictions.push('Ce Test exige la vue : un combattant Aveuglé ne peut pas l’effectuer.');
    if (kind === 'test' && context.requiresSight !== true && !ignoreAll) question(CONDITION_QUESTIONS.sight);
    if (kind === 'test' && context.reliesOnSight == null && context.requiresSight !== true && !ignoreAll) unresolved.push(CONDITION_QUESTIONS.sight);
    if (kind === 'test' && context.reliesOnSight && context.requiresSight !== true && !ignoreAll) disadvantages.set('aveugle', blinded);
  }
  if (levels.has('souille') && !ignoreAll) {
    const fellowship = kind !== 'test' ? false : attr === 'Soc' ? true : context.usesFellowship;
    const festering = kind === 'test' && attr === 'E' && context.festeringWounds === true;
    if (kind === 'test' && attr !== 'Soc' && !festering) question(CONDITION_QUESTIONS.fellowship);
    if (fellowship == null && !festering) unresolved.push(CONDITION_QUESTIONS.fellowship);
    if (fellowship) disadvantages.set('souille', { count: 1, label: 'Souillé' });
    // V5 v3 p.185 : Désavantage aussi aux Tests d'Endurance contre les Plaies purulentes (le MJ le déclare).
    else if (festering) disadvantages.set('souille', { count: 1, label: 'Souillé (Plaies purulentes)' });
  }
  return { relevant, disadvantages, unresolved, restrictions, questions };
}

const DISADVANTAGE_IDS = Object.freeze({ aterre: 'prone', aveugle: 'blinded', souille: 'besmirched' });
/**
 * Lignes de Désavantage des États (`conditionTestRules(...).disadvantages`) pour `conditionDisadvantageEffects`, identifiants du
 * combat par défaut (`prone`, `blinded-0…`, `besmirched`) ; `idOf(key, index)` les remplace (contexte de Test : `condition:<clé>:<n>`).
 */
export function conditionDisadvantageRows(disadvantages, idOf = (key, index) => key === 'aveugle' ? `blinded-${index}` : DISADVANTAGE_IDS[key]) {
  return new Map([...disadvantages].map(([key, { count, label }]) => [key, Array.from({ length: count }, (_, index) => ({ id: idOf(key, index), label }))]));
}
