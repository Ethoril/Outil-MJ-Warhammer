/**
 * Gestionnaires d'effet divins de la tâche T2 : dégâts directs en Blessures et soins en formule.
 * Enregistrés par v5-divine-effect-handlers.js ({type -> {validate, needs, buildLayer, applyInstant, receipt}}).
 * Tous les dés sont saisis explicitement (input.damageRoll commun, input.damageRolls[targetId] par cible).
 */
import { acquireV5Conditions, healV5Wounds } from './v5-effects.js';
import { momentumAfterChange } from './v5-combat-rules.js';
import { resolveSpellDamage, spellFormulaValue } from './v5-magic-effects.js';
import { isTargetDaemon, isTargetUndead } from './v5-magic-attributes.js';
import { hasV5Talent } from './v5-talents.js';

const clone = value => structuredClone(value);
const need = (field, label) => ({ field, label });
const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const isCount = value => Number.isSafeInteger(value) && value >= 1;
const isCountOrZero = value => Number.isSafeInteger(value) && value >= 0;
const HOLY_HATRED = 'talent-holy-hatred';
const HOLY_HATRED_BONUS = 2;
// `foe` : serviteur de la Ruine (fait MJ), mort-vivant (trait ou fait MJ) ou Démon (trait).
const BONUS_TARGETS = new Set(['undead', 'ruinServant', 'foe']);
const CONDITION_WHEN = new Set(['always', 'daemonOrUndead']);

const factsOf = (input, target) => input?.facts?.targets?.[target?.id] || {};
const undeadEstablished = (target, input) => isTargetUndead(target) || factsOf(input, target).undead === true;
const foeEstablished = (target, input) => undeadEstablished(target, input) || isTargetDaemon(target) || factsOf(input, target).ruinServant === true;
const matchesBonus = (when, target, input) => when === 'undead' ? undeadEstablished(target, input)
  : when === 'ruinServant' ? factsOf(input, target).ruinServant === true : foeEstablished(target, input);

function directDamageError(effect) {
  const { dice } = effect;
  if (!isRecord(dice) || !isCount(dice.count) || !isCount(dice.sides)) return 'direct-damage exige dice {count, sides} (entiers positifs).';
  if (effect.perSuccessLevel !== undefined && !isCountOrZero(effect.perSuccessLevel)) return 'perSuccessLevel doit être un entier positif ou nul.';
  const bonus = effect.conditionalBonus;
  if (bonus !== undefined && (!isRecord(bonus) || !BONUS_TARGETS.has(bonus.when) || !isCount(bonus.perSuccessLevel)))
    return `conditionalBonus exige when (${[...BONUS_TARGETS].join(', ')}) et perSuccessLevel entier positif.`;
  if (effect.targetFilter !== undefined && effect.targetFilter !== 'undead') return 'targetFilter ne peut valoir que « undead ».';
  if (effect.requiresFact !== undefined && (!isRecord(effect.requiresFact) || typeof effect.requiresFact.field !== 'string' || !effect.requiresFact.field || typeof effect.requiresFact.label !== 'string'))
    return 'requiresFact exige field et label.';
  if (effect.conditions !== undefined && (!Array.isArray(effect.conditions)
    || effect.conditions.some(row => !isRecord(row) || typeof (row.key || row.name) !== 'string' || (row.when !== undefined && !CONDITION_WHEN.has(row.when)))))
    return 'conditions doit lister des États {key, level?, when?}.';
  return null;
}

// Jet d'une cible : jet propre à la cible, sinon jet commun ; null si absent ou hors de la plage des dés.
function rollFor(effect, input, target) {
  const own = input?.damageRolls?.[target?.id];
  const value = own !== undefined ? own : input?.damageRoll;
  const { count, sides } = effect.dice;
  return Number.isSafeInteger(value) && value >= count && value <= count * sides ? value : null;
}

function directDamageNeeds(effect, { targets = [], input = {} } = {}) {
  const error = directDamageError(effect);
  if (error) return [need('contract.effects.damage', error)];
  const needs = [];
  const { count, sides } = effect.dice;
  for (const target of targets) {
    const name = target.name || target.id;
    if (rollFor(effect, input, target) === null)
      needs.push(need(input.damageRolls?.[target.id] !== undefined ? `damageRolls.${target.id}` : 'damageRoll', `Jet ${count}d${sides} de Blessures (entre ${count} et ${count * sides}) pour ${name}`));
    if (effect.targetFilter === 'undead' && !undeadEstablished(target, input))
      needs.push(need(`facts.targets.${target.id}.undead`, `${name} : Trait Mort-vivant (ou fait MJ « mort-vivant ») requis`));
    const field = effect.requiresFact?.field;
    if (field && factsOf(input, target)[field] !== true)
      needs.push(need(`facts.targets.${target.id}.${field}`, `${name} : ${effect.requiresFact.label}`));
    if (effect.conditionalBonus?.when === 'foe' && !foeEstablished(target, input) && factsOf(input, target).ruinServant === undefined)
      needs.push(need(`facts.targets.${target.id}.ruinServant`, `${name} : serviteur de la Ruine, orque ou gobelin (fait MJ)`));
  }
  return needs;
}

// États infligés avec les Blessures (ex. Enflammé) ; renvoie les noms réellement acquis.
function acquireConditions(participant, effect, { contract, executionId, index, input, round }) {
  const requested = (effect.conditions || []).filter(row => row.when !== 'daemonOrUndead' || undeadEstablished(participant, input) || isTargetDaemon(participant));
  if (!requested.length) return [];
  const beforeIds = new Set((participant.states || []).map(row => row.id));
  const acquired = acquireV5Conditions(participant, requested.map(row => ({ name: row.key || row.name, level: row.level ?? 1,
    source: { kind: 'divine', prayerId: contract.id, executionId } })), { round });
  if (!acquired.ready) throw Object.assign(new Error('Données requises pour appliquer la Condition divine.'), { code: 'DIVINE_CONDITION_INPUT', needsInput: acquired.needsInput });
  Object.assign(participant, acquired.participant);
  return (participant.states || []).filter(row => !beforeIds.has(row.id)).map((row, stateIndex) => {
    row.id = `divine-condition:${executionId}:${participant.id}:${index}:${stateIndex}`;
    return row.name || row.key;
  });
}

const directDamage = {
  layerless: true,
  validate: directDamageError,
  needs: directDamageNeeds,
  applyInstant(participant, effect, ctx) {
    const { input = {}, actor, prayer } = ctx;
    const before = clone(participant);
    const die = rollFor(effect, input, participant);
    const levels = Math.max(0, Number(prayer?.sl) || 0);
    const bonuses = { successLevels: levels * (effect.perSuccessLevel ?? 0), conditional: 0, holyHatred: 0 };
    if (effect.conditionalBonus && matchesBonus(effect.conditionalBonus.when, participant, input)) bonuses.conditional = levels * effect.conditionalBonus.perSuccessLevel;
    const total = die + bonuses.successLevels + bonuses.conditional;
    if (total > 0 && hasV5Talent(actor, HOLY_HATRED)) bonuses.holyHatred = HOLY_HATRED_BONUS;
    // Blessures directes : ni Bonus d'Endurance ni PA ; le total est déjà chiffré, aucun second ajout.
    const resolved = resolveSpellDamage({ caster: actor, target: participant, formula: String(total + bonuses.holyHatred), directWounds: true });
    participant.hp = resolved.targetNewHp;
    const destroyed = effect.killAtZeroNoReraise === true && participant.hp === 0 && undeadEstablished(participant, input);
    if (destroyed) {
      participant.extensions ||= {}; participant.extensions.v5 ||= {};
      participant.extensions.v5.dead = true; participant.extensions.v5.cannotRaiseUndead = true;
    }
    const conditions = acquireConditions(participant, effect, ctx);
    Object.assign(participant, momentumAfterChange(before, participant));
    return { die, DR: levels, bonuses, wounds: resolved.finalDamage, woundsLost: resolved.woundsLost, hpBefore: resolved.targetCurrentHp, hpAfter: participant.hp,
      ...(destroyed ? { destroyed } : {}), ...(conditions.length ? { conditions } : {}),
      ...(factsOf(input, participant).ally === true ? { warning: 'Allié touché par la zone.' } : {}) };
  },
  receipt(effect, { targetId, actor }, result) {
    const { count, sides } = effect.dice;
    const parts = [`${count}d${sides} = ${result.die}`, `${result.DR} DR`];
    if (result.bonuses.holyHatred) parts.push(`Haine sacrée +${result.bonuses.holyHatred}`);
    return { targetId, type: effect.type, result: clone(result),
      log: `${actor?.name || 'Le prêtre'} · ${targetId} perd ${result.woundsLost} Blessure(s) (${parts.join(', ')}) : ${result.hpBefore} → ${result.hpAfter}${result.destroyed ? ' · détruit, plus relevable' : ''}${result.warning ? ' · ' + result.warning : ''}` };
  }
};

// Soin en Blessures : valeur chiffrée ou {formula} lue sur le prêtre (ex. BSoc) ; extraHeals = effets supplémentaires par tranche de +2 DR.
const healAmount = (effect, actor) => {
  const value = effect.value ?? effect.wounds;
  if (typeof value === 'number') return value;
  return isRecord(value) && typeof value.formula === 'string' ? spellFormulaValue(value.formula, actor || {}) : NaN;
};
const woundHeal = {
  layerless: true,
  validate(effect) {
    const value = effect.value ?? effect.wounds;
    if (Number.isFinite(value)) return null;
    return isRecord(value) && typeof value.formula === 'string' && Number.isFinite(spellFormulaValue(value.formula, { caracs: { Soc: 60 } })) ? null : `${effect.type} exige value (nombre ou {formula}).`;
  },
  needs(effect, { actor, input = {} } = {}) {
    const needs = [];
    if (!Number.isFinite(healAmount(effect, actor))) needs.push(need('contract.effects.healing', 'Valeur de soin sourcée requise (caractéristique du prêtre lisible)'));
    if (input.healCount !== undefined && !isCountOrZero(input.healCount)) needs.push(need('healCount', 'Nombre d’effets de soin choisis (entier positif ou nul)'));
    return needs;
  },
  buildLayer: effect => ({ healing: { value: effect.value ?? effect.wounds } }),
  applyInstant(participant, effect, { actor, input = {} }) {
    const amount = healAmount(effect, actor);
    const slots = 1 + (Number.isSafeInteger(effect.extraHeals) ? effect.extraHeals : 0);
    // Le MJ peut consacrer un effet à autre chose (ex. maladie) : healCount, plafonné aux effets disponibles.
    const chosen = Number.isSafeInteger(input.healCount) ? Math.min(Math.max(0, input.healCount), slots) : slots;
    const { participant: healed, ...receipt } = healV5Wounds(participant, amount * chosen);
    Object.assign(participant, healed);
    return { ...clone(receipt), amount, slots, chosen };
  },
  receipt: (effect, { targetId, targetName, actor }, result) => ({ targetId, type: effect.type, result: clone(result),
    log: `${actor?.name || 'Le prêtre'} · ${targetName || targetId} récupère ${result.hpDelta ?? 0} Blessure(s) (${result.amount} × ${result.chosen}/${result.slots} effet(s))` })
};

// `wound-heal` remplace ici le gestionnaire du socle (même contrat, soin chiffré inchangé).
export default { 'direct-damage': directDamage, 'wound-heal': woundHeal };
