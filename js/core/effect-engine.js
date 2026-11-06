/**
 * U8 · moteur d'effets unifié (lot L2, docs/specs/moteur-effets-unifie/). Module pur : aucune lecture du store, aucune mutation
 * de ses entrées.
 *
 * Clause commune = clause v2 des talents + un porteur :
 *   clause : { id, event, role, when[], effects[], bearer }
 *   bearer : { kind, sourceId, layerId?, casterId?, expiry?, extraBonusSources? }
 *   effect : { op, amount?, key?, target?, stackGroup, stack, stackable? }
 *
 * Cumul en deux temps (`combineEffects`) :
 *  1. dans une même famille (même `bearer.kind`), par groupe [op, cible, stackGroup] : la politique `stack` de l'effet décide
 *     (`unique`, `add`, `max`, `bestBonusWorstPenalty`, `strongest`) ; une cible de Test (`target`) est normalisée et résolue
 *     contre le Test en cours AVANT le cumul (deux clés qui visent le même Test forment un seul groupe, R3 p. 235) ;
 *  2. entre familles : la table `BETWEEN_GROUPS` (règle du livre ou arbitrage tracé du MJ). Une paire absente de la table est
 *     signalée (CA5) : ses montants restent visibles dans `signals` et hors des totaux, jamais additionnés ni écartés en silence.
 */
import { normalizeTestKey } from './v5-divine-effects-tests.js';

export const EFFECT_ENGINE_VERSION = 'u8-effect-engine-2026-11-06.1';

const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const fail = (message, field) => { const error = new TypeError(message); if (field) error.field = field; throw error; };
const id = (value, label, field) => { if (typeof value !== 'string' || !value.trim()) fail(`${label} requis`, field); };
const integer = value => Number.isSafeInteger(value);
const scalar = value => ['string', 'boolean'].includes(typeof value) || Number.isFinite(value) && typeof value === 'number';
/** Refuse tout champ hors de `keys` ; l'erreur nomme le premier champ inconnu (`error.field`). */
export function onlyFields(value, keys, message = 'Champ de contrat v2 non couvert') {
  if (!isRecord(value)) fail(message);
  const unknown = Object.keys(value).find(key => !keys.includes(key));
  if (unknown !== undefined) fail(message, unknown);
}
const deepFreeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };

// ---------------------------------------------------------------------------------------------------------------------------
// Vocabulaire des clauses (repris tel quel du schéma 2 des talents, `talent-contract-v2.js`).
// ---------------------------------------------------------------------------------------------------------------------------
export const CLAUSE_EVENTS = Object.freeze(new Set(['test.beforeRoll','test.afterRoll','damage.beforeProtection','condition.beforeAcquire','momentum.beforeLoss','action.before','action.afterAttack','critical.beforeTable','protection.before','talent.activate','combat.beforeTests','situation.calculate','healing.afterTest']));
export const CLAUSE_ROLES = Object.freeze(new Set(['actor','attacker','defender']));
const FIELDS = new Set(['kind','skillId','skillGroupId','specialization','specializationId','lying','influencingGroup','touchingOpponent','resistingThreat','threatId','runningOrJumping','running','potentialDanger','falling','begging','inCombat','resistingInfluence','escapingBonds','breakingEntry','resistingPoisonOrAlcohol','onOcean','estimatingObject','test.success','test.roll','test.sl','silentTakedown','calledShot','outsideCombat','targetUnaware','aimed','charging','terrain','weapon.group','weapon.reach','weapon.isMelee','weapon.improvised','weapon.pummel','actor.id','actor.size','target.id','target.size','condition.id','condition.instances','momentum.lossReason','attack.success','attack.hit','attack.usedAdvantageV5',
  'attributeId','repairing','hasSkillAdvance','arguingBeforeAssembly','musicSpecialization','clowning','winningHigherStatusFavour','causeId','denouncingOrLyingAboutCause','targetAttracted','onRiverOrLake','pursuit','pursuitRole','opposedTest','enemyGroup','recallingEvent','socialTest','targetEonir','resistingVice','breakingObject','airshipFlight','extendedTest','seasickness','identifyingHeraldry','weapon.hack','weapon.crewed','weapon.unarmed','emergingBelowSurprisedTarget','buildingCover','weapon.impale','oppositionWon','talentAction','preRollTalent','actor.hasMomentum','target.hasMomentum','receivedCharge','chargedByLargerEnemy','guardedAlly','coverPenalty','involvesMovement','psychologyKind','blackpowderBrokenTest','avoidingSurprise','normallyAllowedSurpriseTest','dualWielding','weapon.dagger','situation','recoveryTest']);
export const CLAUSE_FIELDS = Object.freeze(FIELDS);
const PREDICATE_OPS = ['eq','in','gte','lteField','matchesSpecialization'];
const NUMERIC_PHASES = {modifySL:['test.beforeRoll','test.afterRoll'],modifyDamage:['damage.beforeProtection'],reduceConditionAcquisition:['condition.beforeAcquire'],ignoreConditionPenalty:['test.beforeRoll'],multiplySL:['test.afterRoll'],limitTestPenalty:['test.beforeRoll'],improveCover:['combat.beforeTests'],modifyQuality:['action.before'],increaseConditionAcquisition:['condition.beforeAcquire'],modifyCriticalRoll:['critical.beforeTable'],incomingPenalty:['combat.beforeTests'],reduceCover:['combat.beforeTests'],modifyQuantity:['situation.calculate'],divideQuantity:['situation.calculate'],modifyHealing:['healing.afterTest']};
const UNIQUE_PHASES = {grantAdvantage:'test.beforeRoll',grantDisadvantage:'test.beforeRoll',preventMomentumLoss:'momentum.beforeLoss',suppressQuality:'action.before',addQuality:'action.before',grantExtraAttack:'action.before',suppressTestPenalty:'test.beforeRoll',chooseCriticalRoll:'critical.beforeTable',ignoreArmourFlaw:'protection.before',riposte:'damage.beforeProtection',activateTalent:'talent.activate',forceTestSuccess:'test.beforeRoll',ignoreNegativeModifiers:'test.beforeRoll',forceDefenseSkill:'action.before',grantMomentum:'combat.beforeTests',suppressProneBonus:'combat.beforeTests',ignoreQuantityPenalty:'situation.calculate'};
export const NUMERIC_OPS = Object.freeze(new Set(Object.keys(NUMERIC_PHASES)));
export const UNIQUE_OPS = Object.freeze(new Set(Object.keys(UNIQUE_PHASES)));

/** Valide un effet de clause pour son événement (messages du schéma 2 des talents ; `error.field` nomme le champ fautif). */
export function validateClauseEffect(effect, event) {
  const op = effect?.op;
  if (NUMERIC_OPS.has(op)) {
    onlyFields(effect,['op','amount','key','stackGroup','stack']);
    if (!['max','add'].includes(effect.stack)) fail('Cumul numérique requis', 'stack');
    if (!(integer(effect.amount) || isRecord(effect.amount) && integer(effect.amount.base) && integer(effect.amount.perRank) && (effect.amount.maximum === undefined || integer(effect.amount.maximum)))) fail('Quantité déclarative invalide', 'amount');
    if (isRecord(effect.amount)) onlyFields(effect.amount,['base','perRank','maximum']);
    if (op === 'reduceConditionAcquisition') { id(effect.key,'État réduit','key'); if (typeof effect.amount === 'number' ? effect.amount < 0 : effect.amount.base < 0 || effect.amount.perRank < 0) fail('Réduction négative', 'amount'); }
    if (!NUMERIC_PHASES[op].includes(event)) fail('Phase numérique invalide', 'event');
    if (op === 'ignoreConditionPenalty') id(effect.key,'État de pénalité','key');
    if (op === 'multiplySL' && (!integer(effect.amount) || effect.amount < 1)) fail('Multiplicateur de DR positif requis', 'amount');
  } else if (UNIQUE_OPS.has(op)) {
    onlyFields(effect,['op','key','stackGroup','stack']);
    if (effect.stack !== 'unique') fail('Cumul unique requis', 'stack');
    if (['preventMomentumLoss','suppressQuality','addQuality'].includes(op)) id(effect.key,'Cible d’opération','key');
    if (UNIQUE_PHASES[op] !== event && !(op === 'grantExtraAttack' && event === 'action.afterAttack')) fail('Phase unique invalide', 'event');
    if (op === 'preventMomentumLoss' && !['oppositionLost','meleeTestFailed','woundsLost','conditionAcquired','combatPause','combatEnd'].includes(effect.key)) fail('Motif d’Élan non couvert', 'key');
  } else if (op === 'chooseSLUnits') {
    onlyFields(effect,['op','stackGroup','stack']);
    if (effect.stack !== 'unique' || event !== 'test.afterRoll') fail('Choix de DR/unités invalide', 'stack');
  } else if (op === 'replaceDamage') {
    onlyFields(effect,['op','scope','stackGroup','stack']);
    if (effect.scope !== 'allDamage' || effect.stack !== 'unique' || event !== 'action.afterAttack') fail('Remplacement de dégâts invalide', 'scope');
  } else if (op === 'createActiveEffect') {
    onlyFields(effect,['op','key','restriction','advantageFilter','stackGroup','stack','expiry']);
    if (effect.restriction !== 'cannotOpposeWithMelee' || effect.advantageFilter !== 'meleeAttacksAgainstTarget' || effect.stack !== 'unique' || event !== 'action.afterAttack') fail('Effet actif non couvert', 'restriction');
    id(effect.key,'Effet actif','key'); onlyFields(effect.expiry,['anchor']);
    if (effect.expiry.anchor !== 'authorNextTurnEnd') fail('Échéance non couverte', 'expiry');
  } else fail('Opération v2 non couverte', 'op');
  id(effect.stackGroup,'Groupe de cumul','stackGroup');
}

/**
 * Forme d'une clause sans ses ressources (coûts, exemptions, quotas : propres aux talents, validés par l'appelant).
 * `extraKeys` : champs admis en plus (le porteur des clauses communes) ; `seen` : identifiants déjà vus (doublons refusés).
 */
export function validateClauseShape(clause, { extraKeys = [], seen = null } = {}) {
  onlyFields(clause,['id','event','role','when','effects','choice','costs','exemptions','quotas', ...extraKeys]); id(clause.id,'Clause','id');
  if (seen) { if (seen.has(clause.id)) fail('Clause dupliquée', 'id'); seen.add(clause.id); }
  if (!CLAUSE_EVENTS.has(clause.event) || !CLAUSE_ROLES.has(clause.role) || !Array.isArray(clause.when) || !Array.isArray(clause.effects) || !clause.effects.length) fail('Clause v2 invalide', !CLAUSE_EVENTS.has(clause.event) ? 'event' : !CLAUSE_ROLES.has(clause.role) ? 'role' : !Array.isArray(clause.when) ? 'when' : 'effects');
  for (const condition of clause.when) {
    onlyFields(condition,['field','op', ...(condition.op === 'lteField' ? ['otherField'] : condition.op === 'matchesSpecialization' ? [] : ['value'])]);
    if (!FIELDS.has(condition.field) || !PREDICATE_OPS.includes(condition.op)) fail('Prédicat v2 non couvert', 'when');
    if (condition.op === 'lteField' ? !FIELDS.has(condition.otherField) : condition.op === 'in' ? !Array.isArray(condition.value) || !condition.value.length || !condition.value.every(scalar) : condition.op === 'eq' ? !scalar(condition.value) : condition.op === 'gte' && !Number.isFinite(condition.value)) fail('Valeur de prédicat invalide', 'when');
  }
  clause.effects.forEach(effect => validateClauseEffect(effect, clause.event));
  if (clause.effects.some(effect => effect.op === 'chooseSLUnits') && !clause.choice) fail('Choix explicite de DR/unités requis', 'choice');
  if (clause.choice) { onlyFields(clause.choice,['id']); id(clause.choice.id,'Choix','choice'); }
  for (const collection of ['costs','exemptions','quotas']) if (clause[collection] !== undefined && !Array.isArray(clause[collection])) fail('Ressources v2 invalides', collection);
  return true;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Porteur
// ---------------------------------------------------------------------------------------------------------------------------
/** Familles d'effets (CA6) : talent, prière, sort, État, Trait, qualité, monture, situation (surnombre…), saisie du MJ. */
export const BEARER_KINDS = Object.freeze(['talent','prayer','spell','condition','trait','quality','mount','situation','gm']);
const BEARER_KEYS = ['kind','sourceId','layerId','casterId','expiry','extraBonusSources'];

/** Valide un porteur ; l'erreur nomme le champ (`Porteur : …`, `error.field` = `bearer.<champ>`). */
export function validateBearer(bearer) {
  if (!isRecord(bearer)) fail('Porteur requis', 'bearer');
  const unknown = Object.keys(bearer).find(key => !BEARER_KEYS.includes(key));
  if (unknown !== undefined) fail(`Porteur : champ « ${unknown} » non couvert`, `bearer.${unknown}`);
  if (!BEARER_KINDS.includes(bearer.kind)) fail(`Porteur : famille « ${bearer.kind} » inconnue`, 'bearer.kind');
  id(bearer.sourceId, 'Porteur : source', 'bearer.sourceId');
  for (const key of ['layerId','casterId']) if (bearer[key] != null) id(bearer[key], `Porteur : ${key}`, `bearer.${key}`);
  if (bearer.expiry != null && !isRecord(bearer.expiry)) fail('Porteur : échéance invalide', 'bearer.expiry');
  if (bearer.extraBonusSources != null && (!integer(bearer.extraBonusSources) || bearer.extraBonusSources < 0)) fail('Porteur : sources de bonus supplémentaires invalides', 'bearer.extraBonusSources');
  return true;
}

/** Clause commune (clause v2 + porteur). Toute erreur nomme l'élément et le champ (CA9) : « Clause « id » (champ x) : … ». */
export function validateEffectClause(clause) {
  try {
    validateClauseShape(clause, { extraKeys: ['bearer'] });
    validateBearer(clause.bearer);
    return true;
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    const element = isRecord(clause) && typeof clause.id === 'string' ? clause.id : '?';
    const wrapped = new TypeError(`Clause « ${element} »${error.field ? ` (champ « ${error.field} »)` : ''} : ${error.message}`);
    wrapped.element = element; if (error.field) wrapped.field = error.field;
    throw wrapped;
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Cibles de Test normalisées (table de `testKeyApplies` / `magicAdverseModifiers`, v5-magic-talents.js)
// ---------------------------------------------------------------------------------------------------------------------------
const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const splitSkill = name => { const match = String(name || '').match(/^(.*?)\s*\((.*)\)\s*$/); return { base: fold(match ? match[1] : name).trim(), spec: match ? fold(match[2]).trim() : null }; };

/**
 * Clé de Test d'un effet → cible normalisée :
 *  `all` / « Tous les Tests » → `{ scope:'self', kind:'all', qualifier }` ;
 *  `carac:e` → `{ scope:'self', kind:'carac', carac:'e' }` (tout Test lié à la caractéristique) ;
 *  « Endurance », « Mêlée (Escrime) » → `{ scope:'self', kind:'skill', skill:'resistance', spec }` (alias V5 p. 248) ;
 *  « Perception adverse » → même forme avec `scope:'opponent'` (vise le Test de qui s'oppose au porteur).
 */
export function normalizeTestTarget(key) {
  if (typeof key !== 'string' || !key.trim()) fail('Cible de Test requise', 'target');
  if (key === 'all') return Object.freeze({ scope: 'self', kind: 'all', qualifier: null });
  if (/^carac:/i.test(key)) return Object.freeze({ scope: 'self', kind: 'carac', carac: fold(key.slice(6)).trim() });
  if (splitSkill(key).base.endsWith(' adverse')) {
    const wanted = splitSkill(normalizeTestKey(String(key).replace(/\s+adverse(?=\s*(\(|$))/i, '')));
    return Object.freeze({ scope: 'opponent', kind: 'skill', skill: wanted.base, spec: wanted.spec });
  }
  const wanted = splitSkill(normalizeTestKey(key));
  if (wanted.base === 'tous les tests') return Object.freeze({ scope: 'self', kind: 'all', qualifier: wanted.spec });
  return Object.freeze({ scope: 'self', kind: 'skill', skill: wanted.base, spec: wanted.spec });
}

/**
 * La cible vise-t-elle ce Test ? `test = { skill, carac?, skillContext?, scope? }` ; `scope:'opponent'` pour lire les cibles
 * « … adverse » du porteur sur le Test de son opposant. Mêmes règles que `testKeyApplies` : « Tous les Tests » vaut pour tous
 * (le qualificatif « Secousse » n'est qu'une étiquette, tout autre qualificatif est une condition non lue) ; une compétence sans
 * spécialité couvre toutes ses spécialités ; une spécialité vaut pour le nom du Test ou `skillContext` (pas pour l'adverse).
 */
export function targetAppliesToTest(target, test = {}) {
  const wanted = typeof target === 'string' ? normalizeTestTarget(target) : target;
  if ((test.scope ?? 'self') !== wanted.scope) return false;
  if (wanted.kind === 'all') return !wanted.qualifier || wanted.qualifier === 'secousse';
  if (wanted.kind === 'carac') return Boolean(test.carac) && wanted.carac === fold(test.carac).trim();
  const actual = splitSkill(normalizeTestKey(test.skill ?? ''));
  if (wanted.skill !== actual.base) return false;
  if (!wanted.spec) return true;
  if (actual.spec === wanted.spec) return true;
  return wanted.scope === 'self' && [].concat(test.skillContext || []).map(value => fold(value)).includes(wanted.spec);
}

// ---------------------------------------------------------------------------------------------------------------------------
// Politiques de cumul dans une famille
// ---------------------------------------------------------------------------------------------------------------------------
export const STACK_POLICIES = Object.freeze({
  unique: Object.freeze({ label: 'une seule occurrence', reference: 'contrat de l’effet' }),
  add: Object.freeze({ label: 'somme', reference: 'contrat de l’effet' }),
  max: Object.freeze({ label: 'la plus haute valeur', reference: 'contrat de l’effet' }),
  bestBonusWorstPenalty: Object.freeze({ label: 'meilleur bonus et pire pénalité', reference: 'V5 p. 235 (sorts) ; arbitrage du MJ du 06/11 (prières) ; HEPG p. 83 (Bénédiction de Lileath)' }),
  strongest: Object.freeze({ label: 'la plus forte pénalité', reference: 'États : seule la plus forte pénalité s’applique (v5-combat-rules.js)' }),
});
const safeSum = (total, value) => { const next = total + value; if (!integer(next)) fail('Cumul hors plage sûre', 'amount'); return next; };

/**
 * Applique une politique à des membres `{ amount, source?, casterId?, extraBonusSources?, stackable? }` d'un même groupe.
 * Retourne `{ amount, kept, dropped: [{ member, rule }] }` (les écartés restent listés pour l'affichage « non cumulé », CA7).
 *  - `bestBonusWorstPenalty` : une source (`source`, à défaut le membre) = une couche, ses montants de même signe s'additionnent ;
 *    meilleur bonus seul, plus pour chaque lanceur ses `extraBonusSources` meilleurs autres bonus (Bénédiction de Lileath,
 *    HEPG p. 83, D-06, jamais au profit d'un autre lanceur) ; pire pénalité seule ; les membres `stackable` s'ajoutent toujours.
 *  - `strongest` : le membre de plus grande valeur absolue.
 */
export function applyStackPolicy(policy, members) {
  if (!Object.hasOwn(STACK_POLICIES, policy)) fail(`Politique de cumul « ${policy} » inconnue`, 'stack');
  if (!Array.isArray(members) || !members.length) fail('Membres de cumul requis');
  const numeric = members.every(member => typeof member.amount === 'number');
  if (policy !== 'unique' && !numeric) fail('Quantité numérique requise', 'amount');
  const result = (kept, amount) => ({ amount, kept, dropped: members.filter(member => !kept.includes(member)).map(member => ({ member, rule: policy })) });
  if (policy === 'unique') return result([members[0]], members[0].amount);
  if (policy === 'add') return result([...members], members.slice(1).reduce((total, member) => safeSum(total, member.amount), members[0].amount));
  if (policy === 'max') { const best = members.reduce((a, b) => (b.amount > a.amount ? b : a)); return result([best], best.amount); }
  if (policy === 'strongest') { const best = members.reduce((a, b) => (Math.abs(b.amount) > Math.abs(a.amount) ? b : a)); return result([best], best.amount); }
  // bestBonusWorstPenalty
  const stackables = members.filter(member => member.stackable === true);
  const regular = members.filter(member => member.stackable !== true && member.amount !== 0);
  const sources = sign => {
    const bySource = new Map();
    for (const member of regular.filter(row => Math.sign(row.amount) === sign)) {
      const key = member.source ?? member;
      if (!bySource.has(key)) bySource.set(key, { value: 0, casterId: member.casterId ?? null, rank: 0, members: [] });
      const source = bySource.get(key);
      source.value += member.amount; source.members.push(member);
      source.rank = Math.max(source.rank, member.extraBonusSources || 0);
    }
    return [...bySource.values()];
  };
  const bonuses = sources(1).sort((a, b) => b.value - a.value);
  const taken = new Set(bonuses.slice(0, 1));
  const ranks = new Map();
  for (const source of bonuses) if (source.casterId != null && source.rank > 0) ranks.set(source.casterId, Math.max(ranks.get(source.casterId) || 0, source.rank));
  for (const [casterId, rank] of ranks) for (const source of bonuses.filter(item => item.casterId === casterId && !taken.has(item)).slice(0, rank)) taken.add(source);
  const penalties = sources(-1);
  if (penalties.length) taken.add(penalties.reduce((a, b) => (b.value < a.value ? b : a)));
  const kept = [...stackables, ...[...taken].flatMap(source => source.members)];
  return result(members.filter(member => kept.includes(member)), kept.reduce((total, member) => safeSum(total, member.amount), 0));
}

/**
 * Regroupe des propositions d'une même famille par [op, key, stackGroup, (sélection de chooseSLUnits)] et applique leur `stack`.
 * Contrat du schéma 2 des talents : deux `stack` différents dans un groupe sont refusés ; `origins` sont concaténées dans l'ordre ;
 * la première proposition du groupe porte le résultat. `assertCompatible(first, other)` : contrôle propre à l'appelant.
 */
export function mergeProposals(proposals, { assertCompatible = () => {} } = {}) {
  const groups = new Map();
  for (const proposal of proposals) {
    const key = JSON.stringify([proposal.op, proposal.key ?? null, proposal.stackGroup, ...(proposal.op === 'chooseSLUnits' ? [proposal.selection] : [])]);
    const members = groups.get(key);
    if (!members) { groups.set(key, [proposal]); continue; }
    if (members[0].stack !== proposal.stack) fail('Cumul contradictoire', 'stack');
    assertCompatible(members[0], proposal);
    members.push(proposal);
  }
  return [...groups.values()].map(members => {
    const merged = { ...members[0], origins: members.flatMap(member => member.origins || []) };
    if (members.length > 1 && Object.hasOwn(merged, 'amount')) merged.amount = applyStackPolicy(merged.stack, members).amount;
    return merged;
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Cumul entre familles
// ---------------------------------------------------------------------------------------------------------------------------
const R1 = 'R1 V5 p. 130 : Difficulté et modificateurs du personnage (Talents, équipement, Sorts, autres effets) se combinent';
const Q2 = 'MJ 05/11 Q2 : prière et sort sur le même Test se somment (sources différentes, p. 130), même clé comprise';
const Q3 = 'MJ 05/11 Q3 : le malus d’un sort ou d’une prière s’ajoute à la pénalité d’États';
const Q4 = 'MJ 05/11 Q4 : qualités, montures et surnombre se somment avec tout le reste, sans autre exclusion ; Avantage de cavalerie et Avantage d’un talent sont deux sources distinctes';
const pairKey = (a, b) => [a, b].sort().join('+');
/**
 * Politiques de cumul entre familles, une ligne par paire tracée (livre ou arbitrage du MJ). `sum` : les deux s'appliquent
 * (montants additionnés ; pour un Avantage, deux sources distinctes, R2 p. 130). Les exclusions ponctuelles déjà codées
 * (Bouclier sans Défensive, Maîtrise du combat à deux sans la Taille, B12) sont des règles d'effet, pas de famille.
 */
export const BETWEEN_GROUPS = deepFreeze((() => {
  const rows = new Map();
  const put = (a, b, reference) => { const key = pairKey(a, b); if (!rows.has(key)) rows.set(key, { kinds: [a, b].sort(), policy: 'sum', reference }); };
  put('talent', 'spell', R1);
  put('talent', 'prayer', R1);
  put('prayer', 'spell', Q2);
  put('condition', 'spell', Q3);
  put('condition', 'prayer', Q3);
  for (const kind of ['quality', 'mount', 'situation']) for (const other of BEARER_KINDS) if (other !== kind) put(kind, other, Q4);
  return Object.fromEntries(rows);
})());
const BETWEEN_POLICIES = new Set(['sum']);

/** Règle de cumul entre deux familles distinctes, ou `null` si la paire n'est ni dans le livre ni arbitrée (à signaler, CA5). */
export function betweenGroupsRule(kindA, kindB, table = BETWEEN_GROUPS) {
  if (!BEARER_KINDS.includes(kindA) || !BEARER_KINDS.includes(kindB)) fail('Famille d’effet inconnue', 'bearer.kind');
  if (kindA === kindB) fail('Paire de familles distinctes requise', 'bearer.kind');
  const rule = table[pairKey(kindA, kindB)] ?? null;
  if (rule && !BETWEEN_POLICIES.has(rule.policy)) fail(`Politique entre familles « ${rule.policy} » non couverte`, 'policy');
  return rule;
}

/**
 * Cumule des effets portés `[{ bearer, effect }]`. Avec `test` (`{ skill, carac?, skillContext?, scope? }`), les effets à
 * `target` ne retiennent que ceux qui visent ce Test, et tous ceux d'une famille forment un seul groupe pour ce Test, quelle que
 * soit leur clé (R3 par Test résolu). Sans `test`, la cible brute sert de clé de groupe.
 * Retourne `{ ready, groups, totals, signals }` :
 *  - `groups` : `[{ kind, op, target, stackGroup, policy, amount, kept, dropped, status }]`, `status` = `applied` ou `unresolved` ;
 *  - `totals` : somme par `op` des groupes `applied` à montant numérique ;
 *  - `signals` : `[{ type:'pairNotArbitrated', op, kinds }]` ; un groupe pris dans une paire non arbitrée est `unresolved` :
 *    son montant reste dans `groups`, hors de `totals`, et `ready` vaut `false` jusqu'à l'arbitrage du MJ.
 */
export function combineEffects(entries, { test = null, table = BETWEEN_GROUPS } = {}) {
  if (!Array.isArray(entries)) fail('Effets portés requis');
  const groups = new Map();
  for (const entry of entries) {
    validateBearer(entry?.bearer);
    const { effect, bearer } = entry;
    if (!isRecord(effect)) fail('Effet requis', 'effect');
    id(effect.op, 'Opération', 'op'); id(effect.stackGroup, 'Groupe de cumul', 'stackGroup');
    if (!Object.hasOwn(STACK_POLICIES, effect.stack)) fail(`Politique de cumul « ${effect.stack} » inconnue`, 'stack');
    if (effect.amount !== undefined && !Number.isFinite(effect.amount)) fail('Quantité numérique requise', 'amount');
    let target = effect.key ?? null;
    if (effect.target !== undefined) {
      const normalized = normalizeTestTarget(effect.target);
      if (test) { if (!targetAppliesToTest(normalized, test)) continue; target = '@test'; } else target = effect.target;
    }
    const key = JSON.stringify([bearer.kind, effect.op, target, effect.stackGroup]);
    if (!groups.has(key)) groups.set(key, { kind: bearer.kind, op: effect.op, target, stackGroup: effect.stackGroup, policy: effect.stack, entries: [] });
    const group = groups.get(key);
    if (group.policy !== effect.stack) fail('Cumul contradictoire', 'stack');
    group.entries.push(entry);
  }
  const resolved = [...groups.values()].map(group => {
    const members = group.entries.map(entry => ({ amount: entry.effect.amount, source: entry.bearer.layerId ?? entry.bearer.sourceId, casterId: entry.bearer.casterId ?? null, extraBonusSources: entry.bearer.extraBonusSources || 0, stackable: entry.effect.stackable === true, entry }));
    const { amount, kept, dropped } = applyStackPolicy(group.policy, members);
    return { kind: group.kind, op: group.op, target: group.target, stackGroup: group.stackGroup, policy: group.policy, amount,
      kept: kept.map(member => member.entry), dropped: dropped.map(({ member, rule }) => ({ entry: member.entry, rule })), status: 'applied' };
  });
  const signals = [];
  for (const op of new Set(resolved.map(group => group.op))) {
    const kinds = [...new Set(resolved.filter(group => group.op === op).map(group => group.kind))].sort();
    for (let i = 0; i < kinds.length; i += 1) for (let j = i + 1; j < kinds.length; j += 1) {
      if (betweenGroupsRule(kinds[i], kinds[j], table)) continue;
      signals.push({ type: 'pairNotArbitrated', op, kinds: [kinds[i], kinds[j]] });
      for (const group of resolved) if (group.op === op && (group.kind === kinds[i] || group.kind === kinds[j])) group.status = 'unresolved';
    }
  }
  const totals = {};
  for (const group of resolved) if (group.status === 'applied' && typeof group.amount === 'number') totals[group.op] = safeSum(totals[group.op] ?? 0, group.amount);
  return { ready: !signals.length, groups: resolved, totals, signals };
}
