/**
 * Gestionnaires d'effet divins de la tâche T2 : dégâts directs en Blessures, dégâts ordinaires (BE et PA) et soins en formule.
 * Enregistrés par v5-divine-effect-handlers.js ({type -> {validate, needs, buildLayer, applyInstant, receipt}}).
 * Tous les dés sont saisis explicitement (input.damageRoll commun, input.damageRolls[targetId] par cible ; localisation des dégâts
 * ordinaires : input.locationRolls[targetId] (d100) ou input.locationChoices[targetId], comme les sorts).
 */
import { acquireV5Conditions, healV5Wounds } from './v5-effects.js';
import { momentumAfterChange } from './v5-combat-rules.js';
import { resolveSpellDamage, spellFormulaValue, STANDARD_CARACS } from './v5-magic-effects.js';
import { hasTargetNatureOrTrait, isTargetDaemon, isTargetUndead } from './v5-magic-attributes.js';
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

const LOCATION_OPTIONS = [['', 'Selon le jet d100'], ['head', 'Tête'], ['body', 'Corps'], ['arm', 'Bras'], ['leg', 'Jambe']];
const LOCATIONS = new Set(LOCATION_OPTIONS.map(([key]) => key).filter(Boolean));
const MIRROR_MATCH = new Set(['any', 'none']);
const factSpec = row => isRecord(row) && typeof row.field === 'string' && row.field && typeof row.label === 'string';

// Contrôle commun de direct-damage (Blessures directes) et ordinary-damage (dégâts ordinaires, BE et PA applicables).
function damageError(effect) {
  const { dice } = effect;
  const ordinary = effect.type === 'ordinary-damage';
  if (dice !== undefined && (!isRecord(dice) || !isCount(dice.count) || !isCount(dice.sides))) return `${effect.type} exige dice {count, sides} (entiers positifs).`;
  if (effect.fixed !== undefined && !isCount(effect.fixed)) return `${effect.type} : fixed doit être un entier positif.`;
  if (dice === undefined && effect.fixed === undefined) return `${effect.type} exige dice {count, sides} (entiers positifs) ou fixed.`;
  if (ordinary) {
    if (effect.bonusFrom !== undefined && !STANDARD_CARACS.includes(effect.bonusFrom)) return `bonusFrom doit être l’une de ${STANDARD_CARACS.join(', ')}.`;
    if (['ignoreAp', 'ignoreBe'].some(key => effect[key] !== undefined && typeof effect[key] !== 'boolean')) return 'ignoreAp et ignoreBe doivent être des booléens.';
  } else if (['bonusFrom', 'ignoreAp', 'ignoreBe'].some(key => effect[key] !== undefined)) return 'bonusFrom, ignoreAp et ignoreBe ne concernent que ordinary-damage.';
  if (effect.perSuccessLevel !== undefined && !isCountOrZero(effect.perSuccessLevel)) return 'perSuccessLevel doit être un entier positif ou nul.';
  const bonus = effect.conditionalBonus;
  if (bonus !== undefined && (!isRecord(bonus) || !BONUS_TARGETS.has(bonus.when) || !isCount(bonus.perSuccessLevel)))
    return `conditionalBonus exige when (${[...BONUS_TARGETS].join(', ')}) et perSuccessLevel entier positif.`;
  const filter = effect.targetFilter;
  if (filter !== undefined && filter !== 'undead' && !(isRecord(filter) && factSpec({ field: filter.fact, label: filter.label })
    && (filter.traits === undefined || Array.isArray(filter.traits) && filter.traits.every(trait => typeof trait === 'string' && trait))))
    return 'targetFilter doit valoir « undead » ou {traits?: [trait], fact, label}.';
  if (effect.requiresFact !== undefined && (!factSpec(effect.requiresFact) || (effect.requiresFact.onFalse !== undefined && effect.requiresFact.onFalse !== 'skip')))
    return 'requiresFact exige field et label (onFalse : « skip » seulement).';
  const mirror = effect.casterWhen;
  if (mirror !== undefined && (!factSpec(mirror) || typeof mirror.value !== 'boolean' || !MIRROR_MATCH.has(mirror.match) || effect.appliesTo !== 'caster'))
    return 'casterWhen exige appliesTo « caster » et field, label, value (booléen), match (any ou none).';
  if (effect.conditions !== undefined && (!Array.isArray(effect.conditions)
    || effect.conditions.some(row => !isRecord(row) || typeof (row.key || row.name) !== 'string' || (row.when !== undefined && !CONDITION_WHEN.has(row.when)))))
    return 'conditions doit lister des États {key, level?, when?}.';
  return null;
}

// Jet d'une cible : jet propre à la cible, sinon jet commun ; null si absent ou hors de la plage des dés ; 0 sans dés (valeur fixe).
function rollFor(effect, input, target) {
  if (!effect.dice) return 0;
  const own = input?.damageRolls?.[target?.id];
  const value = own !== undefined ? own : input?.damageRoll;
  const { count, sides } = effect.dice;
  return Number.isSafeInteger(value) && value >= count && value <= count * sides ? value : null;
}
const rollNeed = (effect, input, target, label) => {
  if (rollFor(effect, input, target) !== null) return [];
  const { count, sides } = effect.dice;
  return [need(input.damageRolls?.[target.id] !== undefined ? `damageRolls.${target.id}` : 'damageRoll', `Jet ${count}d${sides} de Blessures (entre ${count} et ${count * sides}) pour ${label}`)];
};

// Localisation d'un coup ordinaire : choix MJ valide ou d100 (inversé par resolveSpellDamage) ; PA ignorés : aucune localisation.
const locationChoice = (input, target) => LOCATIONS.has(input?.locationChoices?.[target?.id]) ? input.locationChoices[target.id] : null;
const locationRoll = (input, target) => {
  const value = input?.locationRolls?.[target?.id];
  return Number.isSafeInteger(value) && value >= 1 && value <= 100 ? value : null;
};
const locationMissing = (effect, input, target) => effect.type === 'ordinary-damage' && effect.ignoreAp !== true
  && locationChoice(input, target) === null && locationRoll(input, target) === null;

// Filtre de cible : 'in' (visée), 'out' (fait MJ faux : ignorée), 'unknown' (fait manquant : bloque l'aperçu).
function filterState(effect, target, input) {
  const filter = effect.targetFilter;
  if (filter === undefined) return 'in';
  if (filter === 'undead') return undeadEstablished(target, input) ? 'in' : 'unknown';
  if ((filter.traits || []).some(trait => hasTargetNatureOrTrait(target, trait))) return 'in';
  const fact = factsOf(input, target)[filter.fact];
  return fact === true ? 'in' : fact === false ? 'out' : 'unknown';
}
const excluded = (effect, target, input) => filterState(effect, target, input) === 'out'
  || (effect.requiresFact?.onFalse === 'skip' && factsOf(input, target)[effect.requiresFact.field] === false);

// Effet miroir sur le prêtre (casterWhen) : actif selon le fait des cibles désignées ; jamais si le prêtre est lui-même désigné.
function mirrorActive(effect, actorId, targetIds, input) {
  const { field, value, match } = effect.casterWhen;
  if (targetIds.includes(actorId)) return false;
  const hit = targetIds.some(id => input?.facts?.targets?.[id]?.[field] === value);
  return match === 'any' ? hit : !hit;
}

function mirrorNeeds(effect, { targets, input, actor }) {
  const rule = effect.casterWhen;
  const needs = targets.filter(target => factsOf(input, target)[rule.field] === undefined)
    .map(target => need(`facts.targets.${target.id}.${rule.field}`, `${target.name || target.id} : ${rule.label}`));
  if (!needs.length && mirrorActive(effect, actor?.id, targets.map(target => target.id), input))
    needs.push(...rollNeed(effect, input, actor, `${actor?.name || 'le prêtre'} (retour sur le prêtre)`));
  return needs;
}

function damageNeeds(effect, { targets = [], input = {}, actor } = {}) {
  const error = damageError(effect);
  if (error) return [need('contract.effects.damage', error)];
  if (effect.casterWhen) return mirrorNeeds(effect, { targets, input, actor });
  const needs = [];
  for (const target of targets) {
    const name = target.name || target.id;
    if (excluded(effect, target, input)) continue;
    if (effect.dice) needs.push(...rollNeed(effect, input, target, name));
    if (locationMissing(effect, input, target)) needs.push(need(`locationRolls.${target.id}`, `Jet d100 de localisation (ou choix de la localisation) pour ${name}`));
    if (effect.targetFilter === 'undead' && !undeadEstablished(target, input)) needs.push(need(`facts.targets.${target.id}.undead`, `${name} : Trait Mort-vivant (ou fait MJ « mort-vivant ») requis`));
    else if (isRecord(effect.targetFilter) && filterState(effect, target, input) === 'unknown')
      needs.push(need(`facts.targets.${target.id}.${effect.targetFilter.fact}`, `${name} : ${effect.targetFilter.label}`));
    const field = effect.requiresFact?.field;
    const fact = field ? factsOf(input, target)[field] : true;
    if (field && (fact === undefined || fact !== true && effect.requiresFact.onFalse !== 'skip'))
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

// Haine sacrée : +2 Blessures après BE et PA, seulement si la cible perd réellement des Blessures (jamais sur le prêtre lui-même).
function withHolyHatred(resolved) {
  const finalDamage = resolved.finalDamage + HOLY_HATRED_BONUS;
  return { ...resolved, finalDamage, woundsLost: Math.min(resolved.targetCurrentHp, finalDamage), targetNewHp: Math.max(0, resolved.targetCurrentHp - finalDamage) };
}

// Faits de cible exigés par le contrat (requiresFact, targetFilter, casterWhen) : saisis par le mécanisme générique des gestionnaires.
function damageFactFields(effect) {
  const rows = [];
  for (const spec of [effect.requiresFact, isRecord(effect.targetFilter) ? { field: effect.targetFilter.fact, label: effect.targetFilter.label } : null, effect.casterWhen]) {
    if (!isRecord(spec) || !spec.field) continue;
    const label = String(spec.label || spec.field);
    const short = label.split(/\s*[:(]/)[0].trim();
    rows.push({ field: spec.field, label: short ? short[0].toUpperCase() + short.slice(1) : label, help: label + '.', required: true });
  }
  return rows;
}

// Calcule les Blessures d'une cible (hors États) ; ordinary : BE et PA selon l'effet, localisation par choix MJ ou d100.
function strike(participant, effect, { actor, prayer, input = {} }) {
  const ordinary = effect.type === 'ordinary-damage';
  const die = effect.dice ? rollFor(effect, input, participant) : null;
  const levels = Math.max(0, Number(prayer?.sl) || 0);
  const bonuses = { successLevels: levels * (effect.perSuccessLevel ?? 0), conditional: 0, holyHatred: 0,
    ...(effect.fixed ? { fixed: effect.fixed } : {}), ...(effect.bonus ? { characteristic: effect.bonus } : {}) };
  if (effect.conditionalBonus && matchesBonus(effect.conditionalBonus.when, participant, input)) bonuses.conditional = levels * effect.conditionalBonus.perSuccessLevel;
  const total = (die ?? 0) + (effect.fixed ?? 0) + (effect.bonus ?? 0) + bonuses.successLevels + bonuses.conditional;
  // Direct : ni Bonus d'Endurance ni PA ; le total est déjà chiffré, aucun second ajout.
  let resolved = resolveSpellDamage({ caster: actor, target: participant, formula: String(total), directWounds: !ordinary,
    ...(ordinary ? { ignoreAp: effect.ignoreAp === true, ignoreBe: effect.ignoreBe === true, roll: locationRoll(input, participant) ?? undefined,
      spell: { location: locationChoice(input, participant) } } : {}) });
  if (resolved.woundsLost > 0 && participant.id !== actor?.id && hasV5Talent(actor, HOLY_HATRED)) {
    bonuses.holyHatred = HOLY_HATRED_BONUS;
    resolved = withHolyHatred(resolved);
  }
  return { die, levels, bonuses, resolved, ordinary };
}

function damageResult({ die, levels, bonuses, resolved, ordinary }, participant, effect, input, extra) {
  return { die, DR: levels, bonuses, wounds: resolved.finalDamage, woundsLost: resolved.woundsLost, hpBefore: resolved.targetCurrentHp, hpAfter: participant.hp,
    ...(ordinary ? { rawDamage: resolved.rawDamage, be: resolved.be, ap: resolved.ap, ...(resolved.location ? { location: resolved.location } : {}) } : {}),
    ...(effect.casterWhen ? { mirror: true } : {}), ...extra,
    ...(factsOf(input, participant).ally === true ? { warning: 'Allié touché par la zone.' } : {}) };
}

function damageReceipt(effect, { targetId, actor }, result) {
  const parts = [];
  if (effect.dice) parts.push(`${effect.dice.count}d${effect.dice.sides} = ${result.die}`);
  if (result.bonuses.fixed) parts.push(`${result.bonuses.fixed} fixe`);
  if (result.bonuses.characteristic) parts.push(`+${result.bonuses.characteristic} (caractéristique)`);
  if (result.DR && result.bonuses.successLevels) parts.push(`${result.DR} DR`);
  if (result.bonuses.conditional) parts.push(`bonus ciblé +${result.bonuses.conditional}`);
  if (result.rawDamage !== undefined) parts.push(`BE ${result.be}, PA ${result.ap}${result.location ? ' (' + result.location + ')' : ''}`);
  if (result.bonuses.holyHatred) parts.push(`Haine sacrée +${result.bonuses.holyHatred}`);
  return { targetId, type: effect.type, result: clone(result),
    log: `${actor?.name || 'Le prêtre'} · ${targetId} perd ${result.woundsLost} Blessure(s) (${parts.join(', ')}) : ${result.hpBefore} → ${result.hpAfter}${result.mirror ? ' · retour sur le prêtre' : ''}${result.destroyed ? ' · détruit, plus relevable' : ''}${result.warning ? ' · ' + result.warning : ''}` };
}

const baseDamage = {
  layerless: true,
  validate: damageError,
  needs: damageNeeds,
  factFields: damageFactFields,
  // Cible écartée par un fait MJ faux, ou prêtre hors du cas de l'effet miroir.
  applies(effect, participant, { actorId, input = {} } = {}) {
    if (effect.casterWhen) return participant?.id === actorId && mirrorActive(effect, actorId, input.targetIds || [], input);
    return !excluded(effect, participant, input);
  },
  receipt: damageReceipt
};

const directDamage = {
  ...baseDamage,
  applyInstant(participant, effect, ctx) {
    const { input = {} } = ctx;
    const before = clone(participant);
    const computed = strike(participant, effect, ctx);
    participant.hp = computed.resolved.targetNewHp;
    const destroyed = effect.killAtZeroNoReraise === true && participant.hp === 0 && undeadEstablished(participant, input);
    if (destroyed) {
      participant.extensions ||= {}; participant.extensions.v5 ||= {};
      participant.extensions.v5.dead = true; participant.extensions.v5.cannotRaiseUndead = true;
    }
    const conditions = acquireConditions(participant, effect, ctx);
    Object.assign(participant, momentumAfterChange(before, participant));
    return damageResult(computed, participant, effect, input, { ...(destroyed ? { destroyed } : {}), ...(conditions.length ? { conditions } : {}) });
  }
};

// Dégâts ordinaires (Poing de vengeance, Tempête de glace) : formule du miracle puis BE et PA, minimum 1.
const ordinaryDamage = {
  ...baseDamage,
  resolve(effect, { actor }) {
    if (effect.bonusFrom === undefined) return effect;
    const score = Number(actor?.caracs?.[effect.bonusFrom]);
    if (!Number.isFinite(score)) return { error: `Caractéristique ${effect.bonusFrom} du prêtre illisible.`, needs: [need(`actor.caracs.${effect.bonusFrom}`, 'Caractéristique du prêtre requise pour le Bonus de dégâts')] };
    return { ...effect, bonus: Math.floor(score / 10) };
  },
  inputFields(effect) {
    const fields = [];
    if (effect.dice) {
      const { count, sides } = effect.dice;
      fields.push({ path: 'damageRoll', label: `Jet de dégâts commun (${count}d${sides})`, kind: 'number', scope: 'effect', min: count, max: count * sides, source: true,
        help: `Résultat du ${count}d${sides} lancé à table (entre ${count} et ${count * sides}). Dégâts ordinaires : Bonus d’Endurance${effect.ignoreAp ? '' : ' et PA'} déduits.` });
      fields.push({ path: 'damageRolls', label: 'Jet de dégâts propre (facultatif)', kind: 'number', scope: 'target', min: count, max: count * sides, source: true,
        help: 'Remplace le jet commun pour cette cible seulement.' });
    }
    if (effect.ignoreAp !== true) {
      fields.push({ path: 'locationRolls', label: 'Jet de localisation (d100)', kind: 'number', scope: 'target', min: 1, max: 100, source: true,
        help: 'Résultat du d100 du coup, inversé par le moteur pour la localisation ; laisser vide si la localisation est choisie ci-dessous.' });
      fields.push({ path: 'locationChoices', label: 'Localisation choisie par le MJ (facultatif)', kind: 'select', scope: 'target', options: LOCATION_OPTIONS, source: true,
        help: 'Remplace le jet de localisation.' });
    }
    return fields;
  },
  applyInstant(participant, effect, ctx) {
    const { input = {} } = ctx;
    const before = clone(participant);
    const computed = strike(participant, effect, ctx);
    participant.hp = computed.resolved.targetNewHp;
    const conditions = acquireConditions(participant, effect, ctx);
    Object.assign(participant, momentumAfterChange(before, participant));
    return damageResult(computed, participant, effect, input, conditions.length ? { conditions } : {});
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
export default { 'direct-damage': directDamage, 'ordinary-damage': ordinaryDamage, 'wound-heal': woundHeal };
