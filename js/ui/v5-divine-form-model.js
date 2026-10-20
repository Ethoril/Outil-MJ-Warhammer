/**
 * Modèle de formulaire des prières divines (T5) : pur, sans DOM.
 * Il lit le contrat (effects, targetRules, params, extensions) et décrit les champs à saisir ; le panneau ne fait que les afficher.
 * Aucune branche par culte ou par nom de prière : tout vient des types d'effet et des règles du contrat.
 * - describeDivineForm(contract, {actor}) : ce que le contrat demande, indépendamment des cibles choisies.
 * - buildDivineForm(contract, {actor, targets, form}) : champs d'effet, faits de cible, extensions, avertissements.
 * - toEngineInput(form, {targetIds, contract, actor}) : traduction du brouillon vers input.* attendu par le moteur.
 * Les gestionnaires d'effet déclarent leurs saisies (handler.inputFields) et leurs faits de cible (handler.factFields) : voir
 * v5-divine-effect-handlers.js ; ce modèle les lit sans connaître aucun type d'effet.
 * - classifyNeeds, describeEffectResult, summarizeExecution, deadlineLines : lecture de l'aperçu et du reçu.
 */
import { calendarDurationUnits, targetRuleFactFields } from '../core/v5-divine-grammar.js';
import { campaignDurationSeconds } from '../core/v5-game-time.js';
import { spellObjectChoices } from '../core/equipment.js';
import { effectHandler, hasImplicitCasterTarget } from '../core/v5-divine-effect-handlers.js';

const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const CHARACTERISTIC_KINDS = new Set(['characteristic', 'characteristic-bonus']);
const NUMERIC_KINDS = new Set(['fixed', 'count', 'characteristic', 'characteristic-bonus', 'area']);

/** Brouillon vide : tous les nombres sont des chaînes (champs <input>), les faits des chaînes 'true' | 'false' | ''. */
export const emptyDivineForm = () => ({ damageRoll: '', damageRolls: {}, removals: {}, healCount: '', weaponId: '', weaponClassConfirmed: false, expiryRounds: '', facts: {} });

/** Texte de source : « Livre de base V5 EN, p. 227 ». */
export function sourceText(contract) {
  const source = contract?.source;
  if (!source?.document) return 'source originale non retrouvée';
  const document = String(source.document).replace(/\s*v\d+\.pdf$/i, '').replace(/\.pdf$/i, '');
  const pages = source.printedPage === undefined ? '' : `, p. ${[].concat(source.printedPage).join(', ')}`;
  return document + pages;
}

// Faits de cible de la liste blanche (targetRuleFactFields) + `judgement` (requiresFact des dégâts directs).
export const FACT_FIELDS = Object.freeze({
  withinRange: { label: 'Portée / zone confirmée', help: 'La cible est à portée ou dans la zone, telle que résolue après les extensions.' },
  withinTouch: { label: 'Cible à portée de contact', help: 'Le prêtre touche réellement la cible (portée Contact, jamais étendue).' },
  ally: { label: 'Allié admissible', help: 'Allié du prêtre ; sert aussi à signaler un allié pris dans une zone.' },
  nonMyrmidian: { label: 'Ne vénère pas Myrmidia', help: 'Fait MJ : la cible ne vénère pas Myrmidia.' },
  lookingAtPriest: { label: 'Regarde le prêtre', help: 'Fait MJ : la cible regarde le prêtre au moment de la prière.' },
  undead: { label: 'Mort-vivant (fait MJ)', help: 'Fait MJ : la cible est un mort-vivant, si le Trait Mort-vivant n’est pas déjà sur sa fiche.' },
  ruinServant: { label: 'Serviteur de la Ruine, orque ou gobelin', help: 'Fait MJ : serviteur des Puissances de la Ruine, orque ou gobelin (laisser « À préciser » si inconnu).' },
  seesPriest: { label: 'Voit le prêtre', help: 'Fait MJ : la cible a le prêtre en ligne de vue.' },
  zeroWounds: { label: 'À 0 Blessure', help: 'La cible est bien à 0 Blessure.' },
  consenting: { label: 'Consentante', help: 'La cible consent à l’effet.' },
  criminal: { label: 'A commis un crime (décision MJ)', help: 'Décision MJ : la cible a commis un crime.' },
  deniesCrime: { label: 'Nie ce crime', help: 'La cible nie le crime dont elle est accusée.' }
});

const withSource = (help, contract) => `${help} Source : ${sourceText(contract)}.`;
const isSelfTargeted = contract => contract?.params?.targets?.kind === 'self' || contract?.params?.sourceTarget === 'You';
export { isSelfTargeted };

// Une portée chiffrée exige le fait « à portée » (miroir de validateTargetRules).
const needsDistance = params => (NUMERIC_KINDS.has(params?.range?.kind) && !(params.range.kind === 'fixed' && Number(params.range.value) === 0))
  || params?.targets?.unit === 'yards';

/** Faits de cible demandés par le contrat : [{field, label, help, required, custom?}], dans l'ordre d'affichage. */
export function targetFactFields(contract) {
  // Le prêtre est la cible implicite (invocations) : aucun fait de portée ni de cible à fournir.
  if (hasImplicitCasterTarget(contract)) return [];
  const params = contract?.params || {};
  const rules = contract?.targetRules || (contract?.extensions || []).flatMap(row => row.targetRules || []);
  const rows = new Map();
  const add = (field, required, extra = {}) => {
    const meta = FACT_FIELDS[field];
    if (!rows.has(field)) rows.set(field, { field, label: meta?.label || field, help: withSource(meta?.help || '', contract).trim(), required, ...extra });
    else if (required) rows.get(field).required = true;
  };
  // Portée chiffrée ou zone : fait exigé ; sinon (portée spéciale, Vous) il reste proposé à titre facultatif.
  if (params.range?.kind === 'touch') add('withinTouch', true);
  else add('withinRange', needsDistance(params));
  for (const rule of rules) if (targetRuleFactFields[rule]) add(targetRuleFactFields[rule], true);
  if (params.targets?.unit === 'allies') add('ally', true);
  for (const effect of contract?.effects || []) {
    if (effect.type === 'direct-damage' && effect.targetFilter === 'undead') add('undead', true);
    // Faits propres au type d'effet (handler.factFields) : [{field, label, help?, required?}], requis par défaut.
    for (const row of effectHandler(effect.type)?.factFields?.(effect, { contract }) || [])
      if (row?.field) add(row.field, row.required !== false, { custom: true, label: row.label, help: withSource(row.help ?? '', contract) });
    if (effect.type !== 'direct-damage') continue;
    const when = effect.conditionalBonus?.when;
    if (when === 'foe') { add('undead', false); add('ruinServant', false); }
    if (when === 'undead') add('undead', false);
    if (when === 'ruinServant') add('ruinServant', false);
    if ((effect.conditions || []).some(row => row.when === 'daemonOrUndead')) add('undead', false);
  }
  add('ally', false);
  return [...rows.values()];
}

// Pas d'une extension déclarée, en clair : « +6 mètres de jeu », « + la valeur de base ».
function extensionStep(contract, row, key) {
  if (key === 'effect') return row.effect?.type === 'wound-heal' ? 'un effet de soin supplémentaire' : 'un effet supplémentaire';
  const choice = (row.choices || []).find(item => item.param === key || Object.hasOwn(item, key));
  const spec = choice?.[key] ?? choice;
  if (spec?.addBaseValue === true || choice?.addBaseValue === true) return 'la valeur de base en plus';
  const add = spec?.add ?? choice?.add;
  if (!Number.isFinite(add)) return null;
  const unit = spec?.unit || choice?.unit;
  return `+${add}${unit === 'yards' ? ' mètres de jeu' : unit ? ' ' + ({ rounds: 'Rounds', minutes: 'minutes', hours: 'heures', days: 'jours' }[unit] || unit) : ''}`;
}

const EXTENSION_LABELS = Object.freeze({ range: 'Extensions de portée', targets: 'Extensions de destinataires', duration: 'Extensions de durée', effect: 'Extensions propres à l’effet' });

/** Extensions (+2 DR) réellement utilisables : déclarées par le contrat, et que les règles du moteur n'interdisent pas. */
export function extensionFields(contract) {
  const params = contract?.params || {};
  const found = new Map();
  for (const row of contract?.extensions || []) {
    if (!Number.isSafeInteger(row.everySuccessLevels)) continue;
    const keys = (row.choices || []).map(choice => choice.param || Object.keys(choice)[0]);
    if (row.effect) keys.push('effect');
    for (const key of keys) if (EXTENSION_LABELS[key] && !found.has(key)) found.set(key, row);
  }
  const youLocked = row => row.restrictions?.youAndYouCannotIncreaseRangeOrTargets === true;
  const allowed = (key, row) => {
    if (key === 'effect') return true;
    if (!NUMERIC_KINDS.has(params[key]?.kind)) return false;
    if (key === 'range' && youLocked(row) && params.range?.kind === 'self') return false;
    if (key === 'targets' && youLocked(row) && (params.targets?.kind === 'self' || params.targets?.kind === 'special')) return false;
    return true;
  };
  return [...found].filter(([key, row]) => allowed(key, row)).map(([key, row]) => {
    const step = extensionStep(contract, row, key);
    return { key, label: EXTENSION_LABELS[key], min: 0, help: withSource(`Paliers de +${row.everySuccessLevels} DR dépensés ici${step ? ` (chacun apporte ${step})` : ''}.`, contract) };
  });
}

/** Ce que le contrat demande, sans tenir compte des cibles choisies. */
export function describeDivineForm(contract, { actor, targets = [] } = {}) {
  const params = contract?.params || {};
  const effects = contract?.effects || [];
  const damage = effects.find(effect => effect.type === 'direct-damage' && effect.dice);
  const heal = effects.find(effect => effect.type === 'wound-heal');
  const removal = effects.find(effect => effect.type === 'remove-condition');
  const weapon = effects.find(effect => effect.type === 'weapon-bonus' && effect.designatedWeapon === true);
  const durationUnit = params.duration?.unit;
  const instant = durationUnit === 'instant' || params.duration?.kind === 'instant';
  const targetsParam = params.targets || {};
  let targetLimit = null;
  if (targetsParam.kind === 'count' && Number.isSafeInteger(Number(targetsParam.value))) targetLimit = Number(targetsParam.value);
  if (targetsParam.kind === 'characteristic-bonus' && targetsParam.unit === 'targets' && Number.isFinite(Number(actor?.caracs?.[targetsParam.characteristic])))
    targetLimit = Math.floor(Number(actor.caracs[targetsParam.characteristic]) / 10);
  return {
    contractId: contract?.id,
    selfTargeted: isSelfTargeted(contract),
    implicitTarget: hasImplicitCasterTarget(contract),
    areaTargets: targetsParam.kind === 'area' || targetsParam.unit === 'yards' || targetsParam.unit === 'allies',
    targetLimit,
    targetFacts: targetFactFields(contract),
    damage: damage ? { dice: damage.dice, perSuccessLevel: damage.perSuccessLevel ?? 0, conditionalBonus: damage.conditionalBonus || null } : null,
    heal: heal && (contract.extensions || []).some(row => row.effect?.type === 'wound-heal') ? { extendable: true } : null,
    removal: removal ? { chosen: removal.chosen === true, key: removal.key || null, amount: removal.amount ?? 1, onAllRemoved: removal.onAllRemoved || null } : null,
    // Arme désignée du prêtre (miracles) ou de la cible (bénédiction de Droiture) : options de la fiche de son propriétaire.
    weapon: weapon ? { weaponClass: weapon.weaponClass || null, owner: weapon.weaponOwner === 'target' ? 'target' : 'priest',
      options: weapon.weaponOwner === 'target' ? [...new Map(targets.flatMap(target => spellObjectChoices(target, { weaponsOnly: true })).map(row => [row.id, row])).values()] : spellObjectChoices(actor, { weaponsOnly: true }) } : null,
    calendarDuration: calendarDurationUnits.has(durationUnit),
    instant,
    // Fin de l'effet choisie par le MJ : seulement pour une durée en Rounds ou à préciser.
    expiryField: !instant && !calendarDurationUnits.has(durationUnit),
    extensions: extensionFields(contract),
    targetNotes: Array.isArray(contract?.targetNotes) ? contract.targetNotes.slice() : []
  };
}

// Genres de saisie déclarés par les gestionnaires -> genre de champ du panneau ('tri-state' : Oui / Non / À préciser).
const FORM_KINDS = Object.freeze({ number: 'number', text: 'text', boolean: 'check', select: 'select', 'tri-state': 'tri' });

/** Saisies déclarées par les effets du contrat (handler.inputFields), valides seulement : [{path, label, kind, scope, ...}]. */
function handlerInputFields(contract, ctx) {
  return (contract?.effects || []).flatMap(effect => effectHandler(effect.type)?.inputFields?.(effect, { contract, ...ctx }) || [])
    .filter(def => isRecord(def) && typeof def.path === 'string' && def.path && typeof def.label === 'string' && FORM_KINDS[def.kind]);
}

const num = (value, label, extra) => ({ kind: 'number', label, value, ...extra });
const nameOf = target => target?.name || target?.id;

/**
 * Champs d'effet et faits pour les cibles retenues.
 * `targets` : participants visés (le prêtre lui-même si la prière le vise). `form` : brouillon courant.
 */
export function buildDivineForm(contract, { actor, targets = [], participants = [], form = emptyDivineForm(), choices = {} } = {}) {
  const descr = describeDivineForm(contract, { actor, targets });
  const effectFields = [];
  if (descr.damage) {
    const { count, sides } = descr.damage.dice;
    const bonus = [descr.damage.perSuccessLevel ? `+${descr.damage.perSuccessLevel} par DR` : '',
      descr.damage.conditionalBonus ? `+${descr.damage.conditionalBonus.perSuccessLevel} par DR contre les cibles désignées` : ''].filter(Boolean).join(', ');
    const help = withSource(`Résultat du ${count}d${sides} lancé à table (entre ${count} et ${count * sides})${bonus ? `, ${bonus}` : ''}. Blessures directes : ni Bonus d’Endurance ni PA.`, contract);
    effectFields.push({ id: 'damageRoll', anchor: 'damageRoll', scope: 'global', kind: 'number', path: ['damageRoll'], label: `Jet de dégâts commun (${count}d${sides})`, min: count, max: count * sides, help });
    for (const target of targets) effectFields.push({ id: `damageRolls:${target.id}`, anchor: `damageRolls:${target.id}`, scope: 'target', targetId: target.id, kind: 'number',
      path: ['damageRolls', target.id], label: `${nameOf(target)} · Jet de dégâts propre (facultatif)`, min: count, max: count * sides, help: withSource('Remplace le jet commun pour cette cible seulement.', contract) });
  }
  if (descr.removal?.chosen) {
    for (const target of targets) {
      const states = (target.states || []).filter(row => row?.id);
      const options = [['', 'Choisir un État'], ...states.map(row => [row.id, `${row.name || row.key}${Number(row.level) > 1 ? ` (niveau ${row.level})` : ''}`]), ['__none', 'Aucun État retiré']];
      effectFields.push({ id: `removal:${target.id}`, anchor: `removal:${target.id}`, scope: 'target', targetId: target.id, kind: 'select', path: ['removals', target.id],
        label: `${nameOf(target)} · État retiré`, options, empty: !states.length,
        help: withSource(states.length ? 'États actuels de la cible : le prêtre en retire un (choix du joueur, sans critère dans la source).' : 'La cible n’a aucun État : rien à retirer.', contract) });
    }
  }
  if (descr.heal) {
    const effectSlots = 1 + (Number(choices?.effect) || 0);
    effectFields.push({ id: 'healCount', anchor: 'healCount', scope: 'global', kind: 'number', path: ['healCount'], label: 'Effets consacrés au soin de Blessures', min: 0,
      max: effectSlots,
      help: withSource('Laisser vide : tous les effets soignent des Blessures. Réduire si un effet est consacré à autre chose (maladie : rappel MJ).', contract) });
  }
  if (descr.weapon) {
    const { weaponClass, owner, options } = descr.weapon;
    effectFields.push({ id: 'weapon', anchor: 'weapon', scope: 'global', kind: 'select', path: ['weaponId'], label: owner === 'target' ? 'Arme maniée par la cible' : 'Arme maniée par le prêtre',
      options: [['', options.length ? 'Choisir une arme' : 'Aucune arme dans la fiche'], ...options.map(row => [row.id, row.label])], empty: !options.length,
      help: withSource(`Arme de l’équipement de la fiche qui reçoit le bonus${weaponClass ? ` (attendu : ${weaponClass})` : ''}.`, contract) });
    effectFields.push({ id: 'weaponClass', anchor: 'weaponClass', scope: 'global', kind: 'check', path: ['weaponClassConfirmed'],
      label: `L’arme est bien de la classe attendue${weaponClass ? ` (${weaponClass})` : ''}`,
      help: withSource('Confirmation du MJ ; elle n’est jamais bloquante et est conservée dans le reçu.', contract) });
  }
  // Saisies déclarées par les types d'effet : `engineField` = chemin pointé de l'entrée moteur (aussi la clé du besoin renvoyé par l'aperçu).
  for (const def of handlerInputFields(contract, { actor, targets, participants, choices })) {
    const path = def.path.split('.');
    const shared = { kind: FORM_KINDS[def.kind], help: def.source ? withSource(def.help ?? '', contract).trim() : def.help ?? '',
      ...(def.min !== undefined ? { min: def.min } : {}), ...(def.max !== undefined ? { max: def.max } : {}), ...(def.options ? { options: def.options.some(([value]) => value === '') ? def.options : [['', 'À préciser'], ...def.options] } : {}) };
    if (def.scope === 'target') for (const target of targets) effectFields.push({ id: `${def.path}:${target.id}`, anchor: `${def.path}:${target.id}`, scope: 'target', targetId: target.id,
      path: [...path, target.id], engineField: `${def.path}.${target.id}`, label: `${nameOf(target)} · ${def.label}`, ...shared });
    else effectFields.push({ id: def.id || def.path, anchor: def.id || def.path, scope: 'global', path, engineField: def.path, label: def.label, ...shared });
  }
  // Prière visant le prêtre : seuls les faits exigés sont demandés (ex. portée chiffrée sur soi).
  if (descr.expiryField && prayerDurationRounds(contract, actor, choices) === null)
    effectFields.push({ id: 'expiryRounds', anchor: 'expiryRounds', scope: 'global', kind: 'number', path: ['expiryRounds'], label: 'Durée retenue par le MJ (Rounds)', min: 1,
      help: withSource('La durée n’est pas chiffrée en Rounds par la source : indiquer combien de Rounds suivre (laisser vide si aucune échéance n’est à suivre).', contract) });
  const factFields = {};
  const wanted = descr.selfTargeted ? descr.targetFacts.filter(fact => fact.required) : descr.targetFacts;
  if (wanted.length) for (const target of targets) factFields[target.id] = wanted.map(fact => ({ ...fact, id: `fact:${target.id}:${fact.field}`, anchor: `fact:${target.id}:${fact.field}`,
    scope: 'target', targetId: target.id, kind: 'tri', path: ['facts', target.id, fact.field], label: `${nameOf(target)} · ${fact.label}` }));
  return { descr, effectFields, factFields, extensions: descr.extensions, warnings: formWarnings(descr, actor, targets, form),
    info: descr.removal && !descr.removal.chosen ? [`Retrait automatique : ${descr.removal.key} (${descr.removal.amount === 'all' ? 'tous les niveaux' : descr.removal.amount + ' niveau'}) chez chaque cible.`] : [], notes: descr.targetNotes };
}

/** Avertissements affichés dès la sélection : un allié coché pour une zone ou un effet de dégâts. */
export function formWarnings(descr, actor, targets = [], form = emptyDivineForm()) {
  if (!descr.areaTargets && !descr.damage) return [];
  const camp = value => value?.camp ?? null;
  return targets.filter(target => target.id !== actor?.id && ((camp(target) !== null && camp(target) === camp(actor)) || form.facts?.[target.id]?.ally === 'true'))
    .map(target => `${nameOf(target)} est un allié du prêtre : l’effet de zone l’atteindra aussi.`);
}

const readPath = (form, path) => path.reduce((value, key) => (isRecord(value) ? value[key] : undefined), form);
/** Valeur du brouillon pour un champ généré (chaîne pour number/select/tri, booléen pour check). */
export function fieldValue(form, field) {
  const value = readPath(form, field.path);
  return field.kind === 'check' ? value === true : value === undefined || value === null ? '' : String(value);
}
/** Écrit une valeur dans le brouillon (création des niveaux intermédiaires). */
export function setFieldValue(form, field, value) {
  let cursor = form;
  for (const key of field.path.slice(0, -1)) { if (!isRecord(cursor[key])) cursor[key] = {}; cursor = cursor[key]; }
  cursor[field.path[field.path.length - 1]] = value;
}

const optionalNumber = value => value === '' || value === undefined || value === null ? undefined : Number(value);

// Valeur de brouillon -> valeur d'entrée moteur ; undefined : rien à transmettre.
const engineValue = (kind, value) => {
  if (kind === 'number') return optionalNumber(value);
  if (kind === 'boolean') return value === true ? true : undefined;
  if (kind === 'tri-state') return value === 'true' ? true : value === 'false' ? false : undefined;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};
function setPath(target, path, value) {
  let cursor = target;
  for (const key of path.slice(0, -1)) { if (!isRecord(cursor[key])) cursor[key] = {}; cursor = cursor[key]; }
  cursor[path[path.length - 1]] = value;
}

/**
 * Brouillon -> entrées moteur : damageRoll(s), removals, healCount, facts.targets et facts.weapon (cibles retenues seulement),
 * puis les saisies déclarées par les effets de `contract` (handler.inputFields), écrites au même chemin que dans le brouillon.
 */
export function toEngineInput(form, { targetIds = [], contract = null, actor = null } = {}) {
  const input = { facts: { targets: {} } };
  const damageRoll = optionalNumber(form.damageRoll);
  if (damageRoll !== undefined) input.damageRoll = damageRoll;
  const damageRolls = {}, removals = {};
  for (const id of targetIds) {
    const own = optionalNumber(form.damageRolls?.[id]);
    if (own !== undefined) damageRolls[id] = own;
    const choice = form.removals?.[id];
    if (choice === '__none') removals[id] = { none: true };
    else if (choice) removals[id] = { stateId: choice };
    const facts = Object.fromEntries(Object.entries(form.facts?.[id] || {}).filter(([, value]) => value === 'true' || value === 'false').map(([key, value]) => [key, value === 'true']));
    if (Object.keys(facts).length) input.facts.targets[id] = facts;
  }
  if (Object.keys(damageRolls).length) input.damageRolls = damageRolls;
  if (Object.keys(removals).length) input.removals = removals;
  const healCount = optionalNumber(form.healCount);
  if (healCount !== undefined) input.healCount = healCount;
  if (form.weaponId) input.facts.weapon = { equipmentId: form.weaponId, classConfirmed: form.weaponClassConfirmed === true };
  for (const def of handlerInputFields(contract, { actor, targets: [] })) {
    const path = def.path.split('.');
    for (const key of def.scope === 'target' ? targetIds : [null]) {
      const full = key === null ? path : [...path, key];
      const value = engineValue(def.kind, readPath(form, full));
      if (value !== undefined) setPath(input, full, value);
    }
  }
  return input;
}

const KNOWN_ANCHORS = { roll: 'roll', canSpeak: 'voice', targetIds: 'targets', expiry: 'expiry', healCount: 'healCount', damageRoll: 'damageRoll', wrathRoll: 'wrathRoll', testOptionId: 'test-option' };

/** Rattache chaque `needsInput` renvoyé par l'aperçu à un champ du formulaire : [{field, label, anchor|null}]. */
export function classifyNeeds(needs = [], { targets = [], fields = [] } = {}) {
  const name = id => nameOf(targets.find(row => row.id === id)) || id;
  return needs.map(item => {
    const field = typeof item === 'string' ? item : item?.field || '';
    const label = typeof item === 'string' ? item : item?.label || item?.message || field;
    let match;
    // Besoin d'une saisie déclarée par un type d'effet : son champ du formulaire (engineField).
    const declared = fields.find(row => row.engineField === field);
    if (declared) return { field, label, anchor: declared.anchor };
    if ((match = /^damageRolls\.(.+)$/.exec(field))) return { field, label, anchor: `damageRolls:${match[1]}` };
    if ((match = /^removals\.(.+)\.stateId$/.exec(field))) return { field, label, anchor: `removal:${match[1]}` };
    if (field === 'facts.weapon.equipmentId') return { field, label, anchor: 'weapon' };
    if ((match = /^facts\.targets\.(.+)\.([A-Za-z]+)$/.exec(field))) {
      const meta = FACT_FIELDS[match[2]];
      return { field, label: meta ? `${name(match[1])} : ${meta.label}` : label, anchor: `fact:${match[1]}:${match[2]}` };
    }
    if (field === 'clockAnchor') return { field, label: 'Horloge de jeu absente : fixez le temps de campagne (Menu, Temps de campagne) puis recalculez.', anchor: null };
    if (field.startsWith('choices')) return { field, label, anchor: 'extensions' };
    return { field, label, anchor: KNOWN_ANCHORS[field] ?? null };
  });
}

const FR_KEYS = { assourdi: 'Assourdi', aveugle: 'Aveuglé', brise: 'Brisé', enflamme: 'Enflammé', entrave: 'Entravé', epuise: 'Exténué', extenue: 'Exténué', inconscient: 'Inconscient', sonne: 'Sonné' };
const stateLabel = (key, level) => `${FR_KEYS[String(key).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()] || key}${Number(level) > 1 ? ` ×${level}` : ''}`;

/** Une ligne lisible pour un reçu d'effet divin ({targetId, type, result}) ; null si l'effet ne dit rien de plus. */
export function describeEffectResult(row, { contract, participants = [] } = {}) {
  const result = row?.result;
  if (!result) return null;
  const target = participants.find(item => item.id === row.targetId);
  const who = nameOf(target) || row.targetId;
  switch (row.type) {
    case 'direct-damage':
    case 'ordinary-damage': {
      const dice = (contract?.effects || []).find(effect => effect.type === row.type && effect.dice)?.dice;
      const parts = [...(result.die === null || result.die === undefined ? [] : [`${dice ? `${dice.count}d${dice.sides}` : 'dé'} = ${result.die}`]), `${result.DR} DR`];
      if (result.rawDamage !== undefined) parts.push(`${result.rawDamage} bruts − BE ${result.be} − PA ${result.ap}`);
      if (result.mirror) parts.push('retour sur le prêtre');
      if (result.bonuses?.conditional) parts.push(`bonus ciblé +${result.bonuses.conditional}`);
      if (result.bonuses?.holyHatred) parts.push(`Haine sacrée +${result.bonuses.holyHatred}`);
      return `${who} : ${result.woundsLost} Blessure(s) perdue(s) (${parts.join(', ')}) · ${result.hpBefore} → ${result.hpAfter}`
        + `${result.destroyed ? ' · détruit, plus relevable' : ''}${result.conditions?.length ? ' · État acquis : ' + result.conditions.join(', ') : ''}${result.warning ? ' · ' + result.warning : ''}`;
    }
    case 'remove-condition': {
      const named = (result.removed || []).map((item, index) => {
        const state = (target?.states || []).find(entry => entry.id === item.id);
        return stateLabel(result.removedNames?.[index] || state?.name || item.key, item.level);
      });
      return `${who} : ${named.length ? 'État(s) retiré(s) : ' + named.join(', ') : 'aucun État retiré'}${Number.isFinite(result.remaining) ? ` · ${result.remaining} État(s) restant(s)` : ''}`
        + `${result.rested ? ' · bonus de repos posé' : ''}${result.restedReminder ? ' · ' + result.restedReminder : ''}`;
    }
    case 'wound-heal': case 'healing':
      return `${who} : ${result.hpDelta ?? 0} Blessure(s) récupérée(s)${Number.isFinite(result.amount) ? ` (${result.amount} × ${result.chosen}/${result.slots} effet(s))` : ''}`;
    case 'weapon-bonus':
      return `${who} : bonus d’arme sur ${result.equipmentId || 'l’arme du prêtre'}${Number.isFinite(result.damage) ? `, dégâts +${result.damage}` : ''}${result.equipmentId && result.classConfirmed === false ? ' · classe d’arme non confirmée' : ''}`;
    case 'condition':
      return `${who} : force de l’État ${result.strength}`;
    case 'summon-creature':
      return result.kind === 'sensor' ? `Invocation : ${result.name}, capteur hors de l’ordre du combat, invulnérable`
        : `Invocation : ${result.name} (profil ${result.profileKey}) · ${result.wounds} Blessure(s)${result.woundsFormula ? ` (${result.woundsFormula})` : ''}`;
    default:
      return null;
  }
}

/** Libellé d'une couche d'invocation du prêtre (`summon-creature`) pour « Prières actives » ; null pour toute autre couche. */
export function summonLayerLabel(layer, participants = []) {
  if (layer?.type !== 'summon-creature') return null;
  const created = participants.find(item => item.extensions?.v5?.divineSummon?.layerId === layer.id);
  const sensor = layer.summon?.kind === 'sensor';
  if (sensor) return `Invocation : ${created ? `${created.name} (capteur)` : 'capteur'}`;
  return `Invocation : ${created?.name || layer.summon?.profileKey || 'créature'}`;
}

/** Lignes d'un reçu appliqué (ou d'une projection d'aperçu) : DR, dés, Blessures perdues, États retirés. */
export function summarizeExecution(receipt, { contract, participants = [] } = {}) {
  if (!receipt) return null;
  const prayer = receipt.prayer;
  const title = prayer ? `${contract?.name || 'Prière'} · ${prayer.success ? 'prière réussie' : 'prière ratée'} (${prayer.sl} DR)` : contract?.name || 'Prière';
  const lines = (receipt.effectReceipts || []).map(row => describeEffectResult(row, { contract, participants })).filter(Boolean);
  return { title, lines, reminders: [...(receipt.reminders || [])] };
}

/** Durées des effets : copie pure de l'échéance calculée (Rounds ou calendrier de campagne). */
export function formatCampaignTime(seconds) {
  const parts = [];
  for (const [factor, label] of [[86400, 'j'], [3600, 'h'], [60, 'min'], [1, 's']]) {
    const count = Math.floor(seconds / factor);
    if (count) parts.push(`${count} ${label}`);
    seconds %= factor;
  }
  return parts.join(' ') || '0 s';
}

/** Échéance(s) calculée(s) d'un aperçu prêt ou non : [texte]. Jamais d'échéance inventée. */
export function deadlineLines(result, { actorName } = {}) {
  const preview = result?.preview;
  const input = result?.input;
  const duration = preview?.resolvedParams?.duration;
  if (!preview?.success || !duration || duration.value === null || duration.value === undefined || duration.unit === 'instant') return [];
  if (calendarDurationUnits.has(duration.unit)) {
    const anchor = input?.clockAnchor;
    if (!anchor || !Number.isSafeInteger(anchor.campaignSeconds)) return [];
    let seconds;
    try { seconds = campaignDurationSeconds(duration.value, duration.unit); } catch { return []; }
    return [`Échéance calendaire : ${formatCampaignTime(anchor.campaignSeconds + seconds)} de temps de campagne (horloge actuelle ${formatCampaignTime(anchor.campaignSeconds)} + ${formatCampaignTime(seconds)}).`];
  }
  const expiry = input?.expiry || preview.expiry;
  if (expiry?.round) return [expiry.phase === 'endOfTurn' ? `Échéance : fin du Tour de ${actorName || 'l’auteur'} au Round ${expiry.round}.` : `Échéance : fin du Round ${expiry.round}.`];
  return [];
}

/** Quelques mots-clés d'accessibilité communs aux champs générés : identifiant stable de focus. */
export const focusKey = anchor => 'divine-form-' + String(anchor).replace(/[^A-Za-z0-9_-]+/g, '-');

const characteristicScore = (actor, key) => {
  const score = Number(actor?.caracs?.[key] ?? actor?.caracs?.[String(key).toLowerCase()]);
  return Number.isFinite(score) ? score : null;
};

/** Durée en Rounds après extensions (même arithmétique que le moteur) ; null si la durée n'est pas chiffrée en Rounds. */
export function prayerDurationRounds(contract, actor, choices = {}) {
  const duration = contract?.params?.duration;
  if (!isRecord(duration) || duration.unit !== 'rounds') return null;
  let base = Number.isFinite(Number(duration.value)) && duration.value !== null ? Number(duration.value) : null;
  if (CHARACTERISTIC_KINDS.has(duration.kind) && typeof duration.characteristic === 'string') {
    const score = characteristicScore(actor, duration.characteristic);
    base = score === null ? null : duration.kind === 'characteristic-bonus' ? Math.floor(score / 10) : score;
  }
  if (base === null) return null;
  const choice = (contract.extensions || []).flatMap(row => row.choices || []).find(item => item.param === 'duration' || Object.hasOwn(item, 'duration'));
  const spec = choice?.duration ?? choice;
  const step = spec?.addBaseValue === true || choice?.addBaseValue === true ? base : Number(spec?.add ?? choice?.add ?? 0);
  // durationBonus (test-modifier) : Bonus + n, compté aussi dans chaque extension de durée.
  const bonus = Math.max(0, ...(contract.effects || []).map(effect => Number.isSafeInteger(effect?.durationBonus) ? effect.durationBonus : 0));
  const total = base + bonus + (Number(choices.duration) || 0) * ((Number.isFinite(step) ? step : 0) + bonus);
  return Number.isSafeInteger(total) && total >= 1 ? total : null;
}

/** Échéance transmise au moteur : fin du Tour du prêtre ou fin de Round selon le choix du MJ ; undefined sans choix ni durée. */
export function buildExpiry({ contract, actor, choices, round, phase, manualRounds }) {
  const rounds = prayerDurationRounds(contract, actor, choices) ?? (Number.isSafeInteger(Number(manualRounds)) && Number(manualRounds) >= 1 ? Number(manualRounds) : null);
  if (!phase || rounds === null) return undefined;
  const start = Number.isSafeInteger(round) && round > 0 ? round : 1;
  return { phase, round: start + rounds - 1, ...(phase === 'endOfTurn' ? { actorId: actor.id } : {}), moment: 'afterEffects' };
}
