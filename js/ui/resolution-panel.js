import {readDivineRejections} from '../core/v5-divine-access.js';
import {renderSpellOptions} from './v5-spell-options.js';
import { isBrokenActor, renderBrokenEscapeVisibilityControl } from './v5-broken-escape-panel.js';
import {magicTalentRank} from '../core/v5-magic-talents.js';
import {renderMagicControls,renderSpellRecipientControls,natureSelects} from './v5-magic-controls.js';
import {wardDiceCount,reductionLayers,weaponAttackNature} from '../core/v5-magic-combat.js';
import { ARCANE_ARMOR_LOCATIONS } from '../core/v5-magic-arcane-unforgiving.js';
import {renderSituationFields,renderSupportFields} from './v5-talent-situations.js';
import { renderV5TalentMeasures } from './v5-talent-measures.js';
import { V5_ACTIVATED_TALENTS,knownV5MartialQualities,noTestV5TalentAction }  from '../core/v5-talent-actions.js';
import { inferV5Kind, hasMomentum } from '../core/v5-combat-rules.js';
import { naturalCombatTraits, naturalAttackNeedsSize } from '../core/creature-combat.js';
import { EXCLUDED_BASE_CHARACTERISTIC_TALENTS } from '../core/talent-contracts.js';
import { hasV5Talent, V5_TALENT_IDS } from '../core/v5-talents.js';
import { ammunitionCompatibility, equipmentAttackContext } from '../core/equipment.js';
/**
 * Résolution intégrée de Jouer (sans modale). Ce module ne fait que construire
 * le DOM à partir du brouillon tenu par workspace-view : toute saisie remonte
 * par `handlers`, et la vue reste propriétaire de l'état entre deux rendus.
 */
import { formatDamageFormula, damageBreakdown, describeWeaponDamage, inferActionType, previewHpLoss } from '../core/resolution.js';
import { getReferenceCatalogue } from '../core/reference-catalog.js';
import { V5_TEST_TALENT_IDS, V5_TALENT_TEST_CONTEXT_FIELDS, applicableV5TalentTestFields } from '../core/v5-talent-tests.js';
import { acquiredV5TalentCoverage, V5_TALENT_TREATMENT_LABELS } from '../core/v5-talent-coverage.js';
import { actionHasDamage } from '../core/damage.js';
import { qualityLabel } from '../core/quality-normalization.js';
import { getSpellContract, getAllSpellContracts, getContractChoiceOptions, validateSpellTargets } from '../core/v5-spell-contracts.js';
import { getChannellingReserve } from '../core/v5-magic-channelling.js';
import { resolveCastingSkill } from '../core/v5-magic-casting.js';
import { DURATION_UNIT_LABELS, parseSpellDuration } from '../core/v5-magic-effects.js';

export const ACTION_TYPES = Object.freeze([
  ['attack', 'Attaque'],
  ['skill', 'Compétence'],
  ['defense', 'Défense / esquive'],
  ['opposition', 'Opposition'],
  ['channelling', 'Focalisation V5'],
  ['cast', 'Incantation V5'],
  ['dispel', 'Dissipation persistante V5']
]);
const ROLL_LABELS = Object.freeze({ attack: 'Attaque', skill: 'Compétence', defense: 'Défense', opposition: 'Opposition', channelling: 'Focalisation', cast: 'Incantation', dispel: 'Dissipation' });
const MINUS = '−';

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function button(label, className, attrs = {}) {
  const element = node('button', className, label);
  element.type = 'button';
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

/** Nombre sans signe « + », négatif en U+2212 (PV sous zéro). */
export const minusSigned = value => {
  const number = Number(value) || 0;
  return number < 0 ? `${MINUS}${Math.abs(number)}` : String(number);
};

export const signed = value => {
  const number = Number(value) || 0;
  return number < 0 ? `${MINUS}${Math.abs(number)}` : `+${number}`;
};

// Un dé manquant dans l'aperçu : le <details> « Surpuissance & Paramètres » contient son champ, il doit être ouvert.
function missingMagicDice(preview) {
  if (!preview) return false;
  return [preview.missing, preview.spellPreview?.missing, preview.castPreview?.missing, preview.castPreview?.miscast?.missingSecondaryDice, preview.miscast?.missingSecondaryDice]
    .some(list => Array.isArray(list) && list.length > 0);
}

/** Stable key of an action within the actor's list (dice lines may lack an id). */
export function actionKey(action, index) {
  return action?.id ? String(action.id) : `index-${index}`;
}

const finiteBase = value => (value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null);

/**
 * Choix de défense d'une cible : CC, Ag, ses jets enregistrés à base numérique, puis « Autre ».
 * `actions` est la liste complète de la cible (l'index fait la clé `jet:`).
 */
export function defenseOptions(target, actions = [], { includeEndurance = false } = {}) {
  const caracs = ['CC', 'Ag', ...(finiteBase(target?.caracs?.F)!==null?['F']:[]), ...(includeEndurance ? ['E'] : [])].map(stat => {
    const base = finiteBase(target?.caracs?.[stat]);
    return { value: stat, attr:stat,label: `${stat} · ${base ?? '—'}`, statLabel: stat, group: 'caracs', base, extensions:{v5:{scoreIsCurrent:true}}, ...(stat === 'E' ? { type: 'skill', v5: { kind: 'test' } } : {}) };
  });
  const jets = [];
  actions.forEach((action, index) => {
    const raw = finiteBase(action?.base);
    if (raw === null) return;
    const base = raw;
    const statLabel = action.note || action.name || 'Jet';
    jets.push({ value: `jet:${actionKey(action, index)}`, label: `${statLabel} · ${base}`, statLabel, group: 'jets', base, mod: action.mod || 0, v5: { ...(action.extensions?.v5 || {}), kind: action.extensions?.v5?.kind || (inferActionType(action) === 'skill' || (action.attr && action.attr !== 'CC') || /esquive|dodge/i.test(statLabel) ? 'test' : 'melee') }, attr:action.attr,qualities: action.qualities || [], damage:action.damage,damageFormula:action.damageFormula, extensions: action.extensions, type: inferActionType(action) });
  });
  const skills=(target.skills||[]).filter(row=>row.status==='resolved'&&finiteBase(row.total)!==null).map(row=>({value:'skill:'+row.id,label:(row.name||row.nom||row.sourceName)+' · '+row.total,statLabel:row.name||row.nom||row.sourceName,group:'skills',attr:row.carac || getReferenceCatalogue().skills.find(s=>s.id===row.id)?.carac,base:Number(row.total),mod:0,type:'skill',extensions:{fiche:{skillId:row.id}},v5:{kind:row.group==='Corps à corps'?'melee':'test'}}));
  const perceptionOption=includeEndurance?[['Perception','I','perception'],['Calme','FM','calm'],['Charme','Soc','charm'],['Intuition','I','intuition']].flatMap(([name,attr,value])=>{
    const skill=getReferenceCatalogue().skills.find(s=>s.nom===name);if(!skill||skills.some(s=>s.extensions?.fiche?.skillId===skill.id))return[];
    return[{value,label:name+' · '+(target?.caracs?.[attr]??'—'),statLabel:name,attr,group:'skills',base:finiteBase(target?.caracs?.[attr]),type:'skill',extensions:{fiche:{skillId:skill.id},v5:{scoreIsCurrent:true}},v5:{kind:'test'}}];
  }):[];
  return [...caracs, ...skills, ...perceptionOption, ...jets, { value: 'Autre', label: 'Autre (valeur libre)', statLabel: 'Autre', group: 'autre', base: null }];
}

/** Défense proposée d'office : le premier jet de type défense, sinon la CC. */
export function defaultDefenseValue(options) {
  return options.find(option => option.group === 'jets' && option.type === 'defense')?.value || 'CC';
}

export function actionLabel(action = {}) {
  return `${action.note || action.name || action.attr || 'Action'} · ${action.base ?? '—'}`;
}

function qualityNames(action = {}) {
  return (action.qualities || []).map(quality => qualityLabel(quality)).filter(Boolean);
}

function rubric(text) {
  return node('h4', 'workspace-rubric', text);
}

function chip(label, { pressed = false, key, attrs = {} } = {}) {
  const element = button(label, 'workspace-chip', { 'aria-pressed': String(pressed), 'data-focus-key': key, ...attrs });
  return element;
}

// Champs de jet du critique : clé du brouillon de workspace-view. Saisir ou cocher ne vide jamais l'aperçu.
const CRITICAL_ROLL_KEYS = Object.freeze({ location: 'criticalLocationRoll', effect: 'criticalEffectRoll', second: 'criticalSecondRoll', effectAlternative: 'criticalEffectAlternativeRoll', secondEffectAlternative: 'criticalSecondAlternativeRoll', injure: 'criticalInjureRoll', injureSecond: 'criticalInjureSecondRoll', injureAlternative: 'criticalInjureAlternativeRoll', injureSecondAlternative: 'criticalInjureSecondAlternativeRoll', defenderSecond:'defenderCriticalSecondRoll',defenderSecondAlternative:'defenderCriticalSecondAlternativeRoll',defenderInjureSecond:'defenderCriticalInjureSecondRoll',defenderInjureSecondAlternative:'defenderCriticalInjureSecondAlternativeRoll',defenderInjure: 'defenderCriticalInjureRoll', defenderInjureAlternative: 'defenderCriticalInjureAlternativeRoll', defenderLocation: 'defenderCriticalLocationRoll', defenderEffect: 'defenderCriticalEffectRoll', defenderEffectAlternative: 'defenderCriticalEffectAlternativeRoll' });

function rollField({ field, label, value, error, handlers, disabled, critical = null }) {
  const wrapper = node('div', 'workspace-roll');
  const id = `workspace-roll-${field}`;
  const caption = node('label', 'workspace-roll-label', label);
  caption.htmlFor = id;
  const row = node('div', 'workspace-roll-row');
  const input = document.createElement('input');
  input.id = id;
  input.className = 'workspace-roll-input num';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.placeholder = 'Saisir';
  input.title = 'Tapez le d100 lancé à la table (01 à 00), puis Entrée';
  input.maxLength = 3;
  input.value = value;
  input.dataset.rollInput = field;
  input.dataset.focusKey = `roll-${field}`;
  input.disabled = disabled;
  input.setAttribute('aria-describedby', error ? `workspace-roll-hint ${id}-error` : 'workspace-roll-hint');
  if (error) input.setAttribute('aria-invalid', 'true');
  input.addEventListener('input', () => (critical
    ? handlers.criticalInput(CRITICAL_ROLL_KEYS[critical], input.value)
    : handlers.input(field === 'attack' ? 'attackRoll' : 'defenseRoll', input.value)));
  if (critical) input.addEventListener('change', () => handlers.criticalChange());
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handlers.calculate();
  });
  const roll = button('Lancer', 'workspace-secondary', { 'aria-label': `Lancer le d100 : ${label}`, 'data-focus-key': `roll-${field}-dice` });
  roll.disabled = disabled;
  roll.addEventListener('click', () => (critical ? handlers.criticalRoll(CRITICAL_ROLL_KEYS[critical]) : handlers.roll(field)));
  row.append(input, roll);
  wrapper.append(caption, row);
  if (error) {
    const alert = node('p', 'workspace-field-error', error);
    alert.id = `${id}-error`;
    alert.setAttribute('role', 'alert');
    wrapper.appendChild(alert);
  }
  return wrapper;
}

function outcomePill(label, success, sl) {
  return node('span', `workspace-outcome ${success ? 'is-success' : 'is-failure'}`, `${label} : ${success ? 'Réussite' : 'Échec'} · DR ${signed(sl)}`);
}

const zoneName = location => String(location.name).toLocaleLowerCase();

function criticalEffectLine(part) {
  const base = part.effectRollBase;
  const choice = part.effectRollCandidates?.length === 2 ? `min(${part.effectRollCandidates.join(', ')}) = ` : '';
  const roll = choice + (part.bonus ? `${base} + ${part.bonus} = ${part.effectRoll}` : String(part.effectRoll));
  const line = node('p', 'workspace-result-line workspace-critical-effect');
  line.append(node('span', 'num', `${roll} → `), node('strong', '', `« ${part.effect.name} »`), ` : ${part.effect.eff}`);
  return line;
}

function criticalItemBox(item, handlers, busy) {
  const label = node('label', 'workspace-critical-item');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = item.applied;
  box.disabled = busy;
  box.dataset.focusKey = `critical-item-${item.id}`;
  box.addEventListener('change', () => handlers.criticalToggle(item.id, box.checked));
  label.append(box, node('span', '', item.label));
  return label;
}

// Gravité (d100), effet lu, cases à cocher, rappels : commun au critique et au second critique.
function criticalSeverity(part, crit, { field, label, value, error }, preview, draft, handlers) {
  const nodes = [rollField({ field, label, value, error, handlers, disabled: draft.busy, critical: crit === 'first' ? 'effect' : 'second' })];
  if (part.effect) nodes.push(criticalEffectLine(part));
  const items = preview.critical.items.filter(item => item.crit === crit);
  if (items.length) {
    const list = node('div', 'workspace-critical-items');
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', crit === 'first' ? 'Effets du critique' : 'Effets du second critique');
    items.forEach(item => list.appendChild(criticalItemBox(item, handlers, draft.busy)));
    nodes.push(list);
  }
  if (part.parsed?.reminders.length) nodes.push(node('p', 'workspace-formula-notes workspace-muted', `À arbitrer : ${part.parsed.reminders.join(' ; ')}`));
  if (part.parsed?.death) nodes.push(node('p', 'workspace-critical-death', 'Mort instantanée'));
  return nodes;
}

function renderCritical(preview, draft, handlers, defending = false) {
  const critical = defending ? preview.defenderCritical : preview.critical;
  const { details, second } = critical;
  const errors = draft.criticalErrors || {};
  const block = node('div', 'workspace-critical');
  const title = defending ? 'Critique défensif sur l’attaquant' : 'Blessures critiques sur la cible';
  block.setAttribute('role', 'group'); block.setAttribute('aria-label', title);
  block.appendChild(rubric(title));
  const appendPart = (part, kind, label) => {
    if (!part) return;
    block.appendChild(rubric(label));
    if (kind === 'first') block.appendChild(rollField({ field: defending ? 'defender-critical-location' : 'critical-location',
      label: 'Localisation du critique (nouveau d100)', value: defending ? draft.defenderCriticalLocationRoll : draft.criticalLocationRoll,
      error: errors[defending ? 'defenderLocation' : 'location'] || '', handlers, disabled: draft.busy,
      critical: defending ? 'defenderLocation' : 'location' }));
    if (!part.location) return;
    block.appendChild(node('p', 'workspace-result-line', `${part.locationRoll} → ${part.location.name}`));
    block.appendChild(rollField({ field: defending ? 'defender-critical-effect' : kind === 'first' ? 'critical-effect' : 'critical-second',
      label: part.bonus ? `Gravité (d100 + ${part.bonus})` : 'Gravité (d100)',
      value: defending ? kind==='first'?draft.defenderCriticalEffectRoll:draft.defenderCriticalSecondRoll : kind === 'first' ? draft.criticalEffectRoll : draft.criticalSecondRoll,
      error: errors[defending ? 'defenderEffect' : kind === 'first' ? 'effect' : 'secondEffect'] || '', handlers, disabled: draft.busy,
      critical: defending ? kind==='first'?'defenderEffect':'defenderSecond' : kind === 'first' ? 'effect' : 'second' }));
    if (part.needsAlternative || part.effectAlternativeRoll != null) block.appendChild(rollField({
      field: defending ? 'defender-critical-effect-alternative' : kind === 'first' ? 'critical-effect-alternative' : 'critical-second-alternative',
      label: 'Inoffensive : deuxième gravité (retenir le minimum)',
      value: defending ? kind==='first'?draft.defenderCriticalEffectAlternativeRoll:draft.defenderCriticalSecondAlternativeRoll : kind === 'first' ? draft.criticalEffectAlternativeRoll : draft.criticalSecondAlternativeRoll,
      error: errors[defending ? 'defenderEffectAlternative' : kind === 'first' ? 'effectAlternative' : 'secondEffectAlternative'] || '', handlers, disabled: draft.busy,
      critical: defending ? kind==='first'?'defenderEffectAlternative':'defenderSecondAlternative' : kind === 'first' ? 'effectAlternative' : 'secondEffectAlternative' }));
    const subject=defending?preview.input.target:preview.input.actor;
    const pinned=(preview.talentPlans||[]).filter(p=>p.event==='critical.beforeTable'&&p.role===(defending?'defender':'attacker')).flatMap(p=>p.proposals||[]);
    if(pinned.some(p=>p.op==='chooseCriticalRoll')){
      const field=defending?kind==='first'?'defenderInjure':'defenderInjureSecond':kind==='first'?'injure':'injureSecond';
      const draftKey=CRITICAL_ROLL_KEYS[field];
      block.appendChild(rollField({field:'injure-'+(defending?'defender-':'')+kind,label:'Frappe blessante : deuxième gravité au choix',value:draft[draftKey]||'',error:'',handlers,disabled:draft.busy,critical:field}));
      if((defending?preview.input.defense?.qualities:preview.input.action.qualities)?.some(q=>q.id==='inoffensive')){
        const alt=field+'Alternative';block.appendChild(rollField({field:'injure-alt-'+(defending?'defender-':'')+kind,label:'Inoffensive : autre dé de la deuxième paire',value:draft[CRITICAL_ROLL_KEYS[alt]]||'',error:'',handlers,disabled:draft.busy,critical:alt}));
      }
      const label=node('label','workspace-type','Frappe blessante : gravité retenue');const choice=document.createElement('select');choice.setAttribute('aria-label','Frappe blessante : gravité retenue ('+(defending?'défense, '+kind:kind)+')');choice.append(new Option('Choisir',''),new Option('Premier résultat','false'),new Option('Deuxième résultat','true'));
      const current=draft[defending?'defenseTalentChoices':'talentChoices']?.['injure:'+kind];choice.value=typeof current==='boolean'?String(current):'';
      choice.addEventListener('change',()=>handlers.criticalChoose(defending?'defender':'actor','injure:'+kind,choice.value===''?undefined:choice.value==='true'));label.append(choice);block.append(label);
    }
    if(pinned.some(p=>p.op==='modifyCriticalRoll')){
      const label=node('label','workspace-type');const check=document.createElement('input');check.type='checkbox';check.setAttribute('aria-label','Harponneur : augmenter la gravité');check.checked=draft.talentChoices?.harpooner===true;check.addEventListener('change',()=>handlers.criticalChoose('actor','harpooner',check.checked));label.append(check,'Harponneur : +10 par acquisition (d100 plafonné à 100)');block.append(label);
    }
    if (part.effect) block.appendChild(criticalEffectLine(part));
    for (const item of critical.items.filter(item => item.crit === kind)) block.appendChild(criticalItemBox(
      { ...item, id: defending ? `defender:${item.id}` : item.id }, handlers, draft.busy));
    if (part.parsed?.reminders.length) block.appendChild(node('p', 'workspace-muted', `À traiter : ${part.parsed.reminders.join(' ; ')}`));
    if (part.parsed?.death) block.appendChild(node('p', 'workspace-critical-death', 'Mort instantanée — décision du MJ à enregistrer.'));
  };
  appendPart(details, 'first', defending ? 'Critique de la défense' : 'Critique du jet');
  appendPart(second, 'second', `Critique d’excédent : ${critical.excessWounds} Blessures au-delà de 0`);
  return block;
}

function renderV5Decisions(preview, draft, handlers) {
  const block = node('div', 'workspace-v5-decisions');
  for (const [role, decision] of Object.entries(preview.decisions || {})) {
    if (!decision.choiceRequired && !decision.forcedInversion) continue;
    const name = role === 'actor' ? preview.input.actor?.name || 'Acteur' : preview.input.target?.name || 'Défenseur';
    const group = node('fieldset', 'workspace-v5-choice-group');
    group.appendChild(node('legend', '', `${name} — ${decision.forcedInversion ? 'inversion obligatoire' : 'choix du joueur'}`));
    const cards = node('div', 'workspace-v5-choice-cards');
    const selected = role === 'actor' ? preview.input.v5.choice : preview.input.defense?.v5.choice;
    for (const option of decision.options) {
      const card = node('label', 'workspace-v5-choice');
      if (option.id === selected) card.classList.add('is-selected');
      const radio = document.createElement('input'); radio.type = 'radio'; radio.name = `v5-choice-${role}`;
      radio.value = option.id; radio.checked = option.id === selected || !decision.choiceRequired;
      radio.disabled = draft.busy || !decision.choiceRequired; radio.dataset.focusKey = `v5-choice-${role}-${option.id}`;
      radio.addEventListener('change', () => handlers.chooseV5(role, option.id));
      const summary = option.summary;
      const text = node('div', 'workspace-v5-choice-text');
      text.append(node('strong', '', option.label), node('span', '', `${role === 'defender' ? (summary.hit ? 'Touche reçue' : 'Attaque évitée') : (summary.hit ? 'Touché' : 'Pas de touche')} · ${signed(summary.sl)} DR`));
      if (summary.location) text.appendChild(node('span', '', summary.location));
      text.appendChild(node('span', '', summary.woundsLost == null ? 'Blessures à préciser' : `${summary.woundsLost} Blessures ${role === 'defender' ? 'subies par le défenseur' : 'perdues par la cible'}`));
      if (summary.certainty === 'partial') text.appendChild(node('span', 'workspace-muted', 'Conséquences incomplètes : données à préciser.'));
      if (summary.importantEffects.length) text.appendChild(node('span', '', summary.importantEffects.join(' · ')));
      text.appendChild(node('span', 'workspace-muted', 'Coût : aucun'));
      if (decision.recommendation?.optionId === option.id) text.appendChild(node('span', 'workspace-v5-recommendation', `Conseil : ${decision.recommendation.label}`));
      card.append(radio, text); cards.appendChild(card);
    }
    group.appendChild(cards);
    if (decision.equivalentKnownWounds) group.appendChild(node('p', 'workspace-muted', 'Même nombre de Blessures connu : comparez les autres conséquences.'));
    block.appendChild(group);
  }
  return block;
}

/** Temps écoulé : un seul contrôle pour les durées de sorts, d'incidents, de méditations (états de talent) et de Forme bestiale. */
function renderElapsedTime(participants, handlers) {
  const timed = p => (p.states || []).some(s => Number.isFinite(s.remainingMinutes))
    || (p.extensions?.v5?.spellEffects || []).some(e => Number.isFinite(e.remainingMinutes) || Number.isFinite(e.expiresAtRound))
    || (p.extensions?.v5?.miscastEffects || []).some(e => Number.isFinite(e.remainingMinutes))
    || Boolean(p.extensions?.v5?.beastForm);
  if (!participants.some(timed)) return null;
  const block = node('div', 'workspace-v5-context');
  const advance = button('Temps de campagne', 'workspace-secondary', { 'data-focus-key': 'advance-minutes-btn' });
  advance.addEventListener('click', () => handlers.openCampaignTime());
  block.appendChild(advance);
  return block;
}

/** Sort proposé par défaut : le premier du lanceur, sinon Carreau. */
function defaultMagicSpellId(draft, actor) {
  if (draft.magicSpellId) return draft.magicSpellId;
  const first = (actor.spells || [])[0];
  const contract = first && (getSpellContract(first.id) || getSpellContract(first.name || first.nom || first));
  const allContracts = getAllSpellContracts();
  return (first && (contract?.id || first.id || first.name || first.nom)) || allContracts.find(c => c.name === 'Carreau')?.id || allContracts[0]?.id || '';
}

/** Cibles du sort : celles cochées, sinon la cible par défaut du contrat (un brouillon vide vaut « par défaut »). */
function magicTargetIdsOf(draft, contract, actor, target, participants) {
  if (Array.isArray(draft.magicTargetIds) && draft.magicTargetIds.length) return draft.magicTargetIds;
  const isSelfSpell = /^vous$/i.test((contract?.target || '').trim()) || /^vous$/i.test((contract?.range || '').trim());
  const isAllyOnlySpell = ['hand-of-glory', 'shield-of-saphery', 'twist-of-fate', 'hunters-moons', 'timewarp', 'ox-stands'].includes(contract?.effects?.special);
  if(contract?.effects?.excludeCaster)return [participants.find(p=>p.id!==actor.id&&p.zone==='active')?.id].filter(Boolean);
  if (isSelfSpell) return [actor.id];
  if (contract?.effects?.special === 'monstrous-regiment') {
    const firstAlly = participants.find(p => p.id !== actor.id && p.camp === actor.camp);
    return firstAlly ? [firstAlly.id] : [];
  }
  if (isAllyOnlySpell) return target && (target.id === actor.id || target.camp === actor.camp) ? [target.id] : [actor.id];
  return target ? [target.id] : [actor.id];
}

function renderV5MagicContext({ actor, participants = [], target, type, draft, handlers }) {
  const v5 = node('div', 'workspace-v5-context workspace-v5-magic');
  const reserve = getChannellingReserve(actor);
  const reserveLabel = reserve.type === 'high' ? 'Haute Magie (Qhaysh)' : reserve.type === 'winds' ? '8 Vents' : 'aucune';
  const reserveLine = node('p', 'workspace-result-line workspace-magic-reserve', `Réserve de Focalisation : ${reserve.sl} DR (${reserveLabel})`);
  reserveLine.dataset.magicReserve = String(reserve.sl);
  reserveLine.dataset.magicReserveType = reserve.type || 'none';
  v5.appendChild(reserveLine);

  const selectField = (key, labelText, options, currentVal) => {
    const label = node('label', 'workspace-type', labelText);
    const select = document.createElement('select');
    select.setAttribute('aria-label', labelText);
    select.dataset.focusKey = key;
    for (const [val, txt] of options) select.appendChild(new Option(txt, val));
    select.value = currentVal;
    select.addEventListener('change', () => handlers.select({ [key]: select.value }));
    label.appendChild(select);
    v5.appendChild(label);
    return select;
  };

  const numberField = (key, labelText, value, min = null, max = null) => {
    const label = node('label', 'workspace-type', labelText);
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '1';
    if (min !== null) input.min = String(min);
    if (max !== null) input.max = String(max);
    input.value = value ?? '';
    input.setAttribute('aria-label', labelText);
    input.dataset.focusKey = key;
    input.addEventListener('input', () => handlers.input(key, input.value === '' ? null : Number(input.value)));
    label.appendChild(input);
    v5.appendChild(label);
    return input;
  };

  const magicTargetIds = type === 'cast' ? magicTargetIdsOf(draft, getSpellContract(defaultMagicSpellId(draft, actor)), actor, target, participants) : [];
  v5.appendChild(renderMagicControls({actor,participants,type,draft,handlers,targetIds:magicTargetIds}));
  if (type === 'dispel') return v5;
  if (type === 'channelling') {
    v5.prepend(rubric('Focalisation V5'));
    selectField('magicChannelMode', 'Mode de Focalisation', [
      ['channel', 'Accumuler (Focalisation +0 DR)'],
      ['pause', 'Pause de focalisation (Résistance Accessible +2 DR)'],
      ['interruption', 'Test d’interruption (Calme Difficile −2 DR)']
    ], draft.magicChannelMode || 'channel');
    selectField('magicChannelType', 'Type de Focalisation', [
      ['winds', 'Les 8 Vents (Focalisation)'],
      ['high', 'Haute Magie (Qhaysh)']
    ], draft.magicChannelType || 'winds');
    selectField('magicLore', 'Vent ou Domaine déclaré', [
      ['fire', 'Aqshy (Feu)'],
      ['heavens', 'Azyr (Cieux)'],
      ['metal', 'Chamon (Métal)'],
      ['beasts', 'Ghur (Bêtes)'],
      ['life', 'Ghyran (Vie)'],
      ['light', 'Hysh (Lumière)'],
      ['death', 'Shyish (Mort)'],
      ['shadow', 'Ulgu (Ombres)'],
      ['high', 'Qhaysh (Haute Magie)'],
      ['arcane', 'Magie Arcanique']
    ], draft.magicLore || 'fire');
    numberField('v5SlModifier', 'Modificateur V5 (DR)', draft.v5SlModifier ?? 0);
    if(draft.preview?.fumble || draft.preview?.miscast || draft.magicMiscastRoll!=null || draft.magicFumbleLossRoll!=null){
    numberField('magicFumbleLossRoll', 'Perte de réserve si maladresse (1d10)', draft.magicFumbleLossRoll ?? '', 1, 10);
    numberField('magicMiscastRoll', 'Jet d’incident si maladresse (1d100)', draft.magicMiscastRoll ?? '', 1, 100);
    numberField('magicMajorRoll', 'Jet Majeur d’incident si cascade (1d100)', draft.magicMajorRoll ?? '', 1, 100);
    numberField('magicSecondaryDurationRoll', 'Dé secondaire : Durée / États (1d10 ou 2d10)', draft.magicSecondaryDurationRoll ?? '', 1, 20);
    numberField('magicSecondaryDamageRoll', 'Dé secondaire : Dégâts (1d10)', draft.magicSecondaryDamageRoll ?? '', 1, 10);
    numberField('magicSecondaryDistanceRoll', 'Dé secondaire : Distance (1d10 ou 1d100)', draft.magicSecondaryDistanceRoll ?? '', 1, 100);
    selectField('magicSecondaryLocation', 'Membre gelé (incident)', [['', '— Membre gelé (si incident) —'], ['Bras principal', 'Bras principal'], ['Bras secondaire', 'Bras secondaire'], ['Jambe gauche', 'Jambe gauche'], ['Jambe droite', 'Jambe droite']], draft.magicSecondaryLocation || '');
    }
  } else if (type === 'cast') {
    v5.prepend(rubric('Incantation & Contrat de sort V5'));
    const allContracts = getAllSpellContracts();
    const actorSpells = (actor.spells || []).map(s => {
      const c = getSpellContract(s.id) || getSpellContract(s.name || s.nom || s);
      return { id: c?.id || s.id || s.name || s.nom, label: `${c?.name || s.name || s.nom} (NI ${c?.cn ?? s.cn ?? 0})` };
    });
    const defaultSpellId = defaultMagicSpellId(draft, actor);
    const spellLabel = node('label', 'workspace-type', 'Sort à lancer');
    const spellSelect = document.createElement('select');
    spellSelect.setAttribute('aria-label', 'Sort à lancer');
    spellSelect.dataset.focusKey = 'magic-spell';
    if (actorSpells.length) {
      const grpActor = document.createElement('optgroup');
      grpActor.label = `Sorts de ${actor.name}`;
      actorSpells.forEach(s => grpActor.appendChild(new Option(s.label, s.id)));
      spellSelect.appendChild(grpActor);
    }
    const grpAll = document.createElement('optgroup');
    grpAll.label = 'Contrats de sorts V5';
    allContracts.forEach(c => grpAll.appendChild(new Option(`${c.name} · NI ${c.cn} (${c.domain})`, c.id)));
    spellSelect.appendChild(grpAll);
    spellSelect.value = defaultSpellId;
    spellSelect.addEventListener('change', () => handlers.select({ magicSpellId: spellSelect.value }));
    spellLabel.appendChild(spellSelect);
    v5.appendChild(spellLabel);

    const contract = getSpellContract(defaultSpellId);
    const recipientControls = contract && renderSpellRecipientControls({ actor, participants, contract, draft, handlers, targetIds: magicTargetIds, target });
    if (recipientControls) v5.appendChild(recipientControls);
    if (contract) {
      const summary = node('p', 'workspace-muted workspace-magic-contract-summary',
        `${contract.name} (${contract.canonicalName || contract.domain}) · NI ${contract.cn} · Portée : ${contract.range} · Cible : ${contract.target} · Durée : ${contract.duration}`);
      summary.dataset.magicContractSummary = contract.id;
      v5.appendChild(summary);
    }

    const choiceOptions = contract ? getContractChoiceOptions(contract) : [];
    if (choiceOptions.length > 0) {
      const mjChoiceSelect = selectField(
        'magicMjChoice',
        'Choix d’effet du sort',
        [['', '— Choisir une option —'], ...choiceOptions.map(opt => [opt, opt])],
        draft.magicMjChoice || ''
      );
      mjChoiceSelect.dataset.focusKey = 'magic-mj-choice';
      mjChoiceSelect.dataset.action = 'set-magic-mj-choice';
    }

    numberField('v5SlModifier', 'Modificateur V5 (DR)', draft.v5SlModifier ?? 0);
    selectField('magicCriticalChoice', 'Effet critique d’incantation', [
      ['', 'Aucun / Non applicable'],
      ['critical-wound', 'Blessure Critique'],
      ['total-power', 'Puissance totale (+dizaines DR)'],
      ['unstoppable-force', 'Force irrésistible (non dissipable)']
    ], draft.magicCriticalChoice || '');
    if(Number(draft.attackRoll)%11===0 && Number(draft.attackRoll)>0 || Number(draft.attackRoll)===100 || draft.preview?.castPreview?.miscast || draft.magicMiscastRoll!=null)numberField('magicMiscastRoll', 'Jet d’incident si double / maladresse (1d100)', draft.magicMiscastRoll ?? '', 1, 100);

    // Options propres au sort (une seule rubrique, uniquement pour le sort concerné) ; la surpuissance générique reste dans le bloc suivant.
    const specificBox = node('div', 'workspace-v5-context');
    specificBox.append(...renderSpellOptions({ actor, participants, contract, draft, handlers, targetIds: magicTargetIds }));
    const isVortexSpell = contract?.isVortex || contract?.effects?.type === 'vortex';
    const movementOnly=contract?.effects?.vortexMovementOnly === true;
    const isArcane = contract?.effects?.special === 'arcane-unforgiving';
    const addCheck = (box, key, lbl, checked = Boolean(draft[key]), onChange = value => handlers.select({ [key]: value })) => {
      const wrap = node('label', 'workspace-type workspace-recipient-check');
      const chk = document.createElement('input');
      chk.type = 'checkbox'; chk.checked = checked;
      chk.setAttribute('aria-label', lbl); chk.dataset.focusKey = key;
      chk.addEventListener('change', () => onChange(chk.checked));
      wrap.append(chk, ` ${lbl}`);
      box.appendChild(wrap);
    };
    const addNum = (box, key, lbl, min = 0, max = 100) => {
      const wrap = node('label', 'workspace-type', lbl);
      const inp = document.createElement('input');
      inp.type = 'number'; inp.min = String(min); inp.max = String(max); inp.step = '1';
      inp.value = draft[key] ?? '';
      inp.setAttribute('aria-label', lbl);
      inp.dataset.focusKey = key;
      inp.addEventListener('input', () => handlers.input(key, inp.value === '' ? null : Number(inp.value)));
      wrap.appendChild(inp);
      box.appendChild(wrap);
      return inp;
    };
    if(movementOnly){addNum(specificBox,'magicVortexDirectionRoll','Tempête : direction aléatoire d10 (sans Test de FM)',1,10);addNum(specificBox,'magicVortexDistance','Tempête : déplacement 2d10 mètres',2,20);}
    if (isVortexSpell && !movementOnly) {
      // Vortex aléatoire (Winds of Magic p. 20) : direction choisie + Test de Force Mentale Accessible (+2 DR) ; en cas d'échec, d10 de direction.
      const compassLabel = node('label', 'workspace-type', 'Vortex : direction choisie par le lanceur');
      const compassSelect = document.createElement('select');
      compassSelect.setAttribute('aria-label', 'Direction du Vortex choisie par le lanceur');
      compassSelect.dataset.focusKey = 'magicVortexDirection';
      for (const [val, txt] of [['', '— Direction —'], ['N', 'Nord'], ['NE', 'Nord-Est'], ['E', 'Est'], ['SE', 'Sud-Est'], ['S', 'Sud'], ['SW', 'Sud-Ouest'], ['W', 'Ouest'], ['NW', 'Nord-Ouest']]) compassSelect.appendChild(new Option(txt, val));
      compassSelect.value = draft.magicVortexDirection || '';
      compassSelect.addEventListener('change', () => handlers.select({ magicVortexDirection: compassSelect.value || null }));
      compassLabel.appendChild(compassSelect);
      specificBox.appendChild(compassLabel);
      const willLabel = node('label', 'workspace-type', 'Vortex : Test de Force Mentale Accessible (+2 DR)');
      const willSelect = document.createElement('select');
      willSelect.setAttribute('aria-label', 'Résultat du Test de Force Mentale du Vortex');
      willSelect.dataset.focusKey = 'magicVortexWillpower';
      for (const [val, txt] of [['', '— Résultat —'], ['success', 'Réussi : direction choisie'], ['failure', 'Raté : direction aléatoire (d10)']]) willSelect.appendChild(new Option(txt, val));
      willSelect.value = draft.magicVortexWillpower || '';
      willSelect.addEventListener('change', () => handlers.select({ magicVortexWillpower: willSelect.value || null }));
      willLabel.appendChild(willSelect);
      specificBox.appendChild(willLabel);
      addNum(specificBox, 'magicVortexDirectionRoll', 'Vortex : d10 de direction si Test raté (1 disparaît, 2 N, 3 NE, 4 E, 5 en place, 6 SE, 7 S, 8 SO, 9 O, 10 NO)', 1, 10);
      addNum(specificBox, 'magicVortexDistance', 'Distance du Vortex (2d10 yards)', 2, 20);
    }
    if (isArcane) specificBox.appendChild(renderArcaneFields(draft, actor, target, participants, handlers));
    if (specificBox.childElementCount) {
      const specificDetails = node('details', 'workspace-v5-context-details');
      specificDetails.open = draft.magicOptionsOpen ?? true;
      const specificSummary = node('summary', '', `Options du sort : ${contract?.name || 'sort choisi'}`);
      specificSummary.addEventListener('click', () => handlers.input('magicOptionsOpen', !specificDetails.open));
      specificDetails.append(specificSummary, specificBox);
      v5.appendChild(specificDetails);
    }

    const overcastDetails = node('details', 'workspace-v5-context-details');
    if (
      draft.magicOvercastDamage != null ||
      draft.magicOvercastTargets != null ||
      draft.magicOvercastRange != null ||
      draft.magicOvercastDuration != null ||
      draft.magicOvercastAoe != null ||
      draft.magicDurationAmount != null ||
      draft.magicResistanceRoll != null ||
      draft.magicMajorRoll != null ||
      draft.magicSecondaryDurationRoll != null ||
      draft.magicSecondaryDamageRoll != null ||
      draft.magicSecondaryDistanceRoll != null ||
      draft.magicNoOtherTargets ||
      missingMagicDice(draft.preview)
    ) {
      overcastDetails.open = true;
    }
    overcastDetails.appendChild(node('summary', '', 'Surpuissance & Paramètres du sort'));
    const overcastBox = node('div', 'workspace-v5-context');
    const addOvercastNum = (key, lbl, min = 0, max = 100) => addNum(overcastBox, key, lbl, min, max);
    const overcastAllowed=contract?.overcast?.allowed!==false && !contract?.isPetty;
    const genericOptions=overcastAllowed ? contract?.overcast?.options || [] : [];
    if (!isArcane && genericOptions.includes('damage')) addOvercastNum('magicOvercastDamage', 'Surpuissance : Dégâts', 0, 18);
    if(genericOptions.includes('targets')) addOvercastNum('magicOvercastTargets', 'Surpuissance : Cibles', 0, 18);
    if(genericOptions.includes('range')) addOvercastNum('magicOvercastRange', 'Surpuissance : Portée', 0, 18);
    if (!isArcane && genericOptions.includes('duration')) addOvercastNum('magicOvercastDuration', 'Surpuissance : Durée', 0, 18);
    if (!isArcane && genericOptions.includes('aoe')) addOvercastNum('magicOvercastAoe', 'Surpuissance : Zone', 0, 18);
    if (!isArcane && genericOptions.includes('special')) addOvercastNum('magicOvercastSpecial', 'Surpuissance : Spécial (DR)', 0, 20);

    // Paramètres génériques : durée illisible (Spécial, dés, unités à choisir) = donnée MJ, transmise à l'application du sort.
    if (!isArcane) {
      if (!contract || parseSpellDuration(contract.duration, { caster: actor }).kind === 'unknown' || draft.magicDurationAmount != null) {
        addOvercastNum('magicDurationAmount', 'Durée de base, avant surpuissance (si le sort l’exige) : nombre', 1, 9999);
        const durationUnitLabel = node('label', 'workspace-type', 'Durée de base, avant surpuissance : unité');
        const durationUnit = document.createElement('select');
        durationUnit.setAttribute('aria-label', 'Unité de la durée saisie par le MJ');
        durationUnit.dataset.focusKey = 'magic-duration-unit';
        for (const [unit, label] of Object.entries(DURATION_UNIT_LABELS)) durationUnit.appendChild(new Option(label, unit));
        durationUnit.value = draft.magicDurationUnit || 'rounds';
        durationUnit.addEventListener('change', () => handlers.input('magicDurationUnit', durationUnit.value));
        durationUnitLabel.appendChild(durationUnit);
        overcastBox.appendChild(durationUnitLabel);
      }
      if(contract?.effects?.secondaryTest || contract?.effects?.mjInput?.resistanceTest){
      const resInp = addOvercastNum('magicResistanceRoll', 'Jet de résistance / test secondaire (Soc / End / Résistance, 1d100)', 1, 100);
      resInp.dataset.action = 'set-magic-resistance-roll';
      }
    }
    addCheck(overcastBox, 'magicUnmemorized', 'Sort lancé depuis un grimoire sans être mémorisé (surpuissance interdite)');
    if(missingMagicDice(draft.preview) || draft.preview?.castPreview?.miscast || draft.preview?.miscast){
    addOvercastNum('magicMajorRoll', 'Jet Majeur d’incident si cascade (1d100)', 1, 100);
    addOvercastNum('magicSecondaryDurationRoll', 'Dé secondaire : Durée / États (1d10 ou 2d10)', 1, 20);
    addOvercastNum('magicSecondaryDamageRoll', 'Dé secondaire : Dégâts / Perte (1d10)', 1, 10);
    addOvercastNum('magicSecondaryDistanceRoll', 'Dé secondaire : Distance (1d10 ou 1d100)', 1, 100);
    const limbLabel = node('label', 'workspace-type', 'Membre gelé (incident)');
    const limbSelect = document.createElement('select');
    limbSelect.setAttribute('aria-label', 'Membre gelé (incident)');
    limbSelect.dataset.focusKey = 'magicSecondaryLocation';
    for (const [val, txt] of [['', '— Membre gelé (si incident) —'], ['Bras principal', 'Bras principal'], ['Bras secondaire', 'Bras secondaire'], ['Jambe gauche', 'Jambe gauche'], ['Jambe droite', 'Jambe droite']]) limbSelect.appendChild(new Option(txt, val));
    limbSelect.value = draft.magicSecondaryLocation || '';
    limbSelect.addEventListener('change', () => handlers.select({ magicSecondaryLocation: limbSelect.value }));
    limbLabel.appendChild(limbSelect);
    overcastBox.appendChild(limbLabel);
    // Contre-réaction aéthyrique (Majeur 96+, Livre de base p. 239) : le lanceur n'est jamais sa propre cible.
    addCheck(overcastBox, 'magicNoOtherTargets', 'Aucune autre cible à portée (Contre-réaction 96+ : la tête du lanceur explose)');
    }
    overcastDetails.appendChild(overcastBox);
    v5.appendChild(overcastDetails);

    if (participants.length >= 1) {
      const multiBox = node('details', 'workspace-v5-context-details');
      multiBox.open = draft.magicTargetsOpen ?? Boolean(draft.magicTargetIds?.length > 1);
      const targetSummary=node('summary', '', `Cibles multiples (Contrat : ${contract?.target || '1'})`);
      targetSummary.addEventListener('click',()=>handlers.input('magicTargetsOpen',!multiBox.open));
      multiBox.appendChild(targetSummary);
      const isSelfSpell = /^vous$/i.test((contract?.target || '').trim()) || /^vous$/i.test((contract?.range || '').trim());
      const isAllyOnlySpell = ['hand-of-glory', 'shield-of-saphery', 'twist-of-fate', 'hunters-moons', 'timewarp', 'ox-stands'].includes(contract?.effects?.special);
      const isAllyExcludingCaster = contract?.effects?.special === 'monstrous-regiment';
      let defaultTargets;
      if(contract?.effects?.excludeCaster){defaultTargets=[participants.find(p=>p.id!==actor.id&&p.zone==='active')?.id].filter(Boolean);}
      else if (isSelfSpell) {
        defaultTargets = [actor.id];
      } else if (isAllyExcludingCaster) {
        const firstAlly = participants.find(p => p.id !== actor.id && p.camp === actor.camp);
        defaultTargets = firstAlly ? [firstAlly.id] : [];
      } else if (isAllyOnlySpell) {
        const targetIsAlly = target && (target.id === actor.id || target.camp === actor.camp);
        defaultTargets = targetIsAlly ? [target.id] : [actor.id];
      } else {
        defaultTargets = target ? [target.id] : [actor.id];
      }
      const currentTargets = Array.isArray(draft.magicTargetIds) && draft.magicTargetIds.length
        ? draft.magicTargetIds
        : defaultTargets;
      for (const p of participants) {
        const lbl = node('label', 'workspace-type workspace-recipient-check');
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = currentTargets.includes(p.id);
        chk.setAttribute('aria-label', `Cible du sort : ${p.name}`);
        chk.dataset.focusKey = `magic-target-${p.id}`;
        chk.addEventListener('change', () => {
          const next = chk.checked
            ? [...new Set([...currentTargets, p.id])]
            : currentTargets.filter(id => id !== p.id);
          handlers.select({ magicTargetIds: next });
        });
        lbl.append(chk, ` ${p.name}`);
        multiBox.appendChild(lbl);
      }
      v5.appendChild(multiBox);
    }
  }

  return v5;
}

function renderArcaneFields(draft, actor, target, participants, handlers) {
  const box = node('fieldset', 'workspace-v5-choice-group workspace-arcane-options');
  box.appendChild(node('legend', '', 'Destruction des Arcanes'));
  const armorPoints = Number(draft.magicArcaneArmorPoints) || 0;
  const amountLabel = node('label', 'workspace-type', 'PA à détruire (1 DR chacun)');
  const amount = document.createElement('input');
  amount.type = 'number'; amount.min = '0'; amount.max = '20'; amount.step = '1';
  amount.value = armorPoints; amount.dataset.focusKey = 'magic-arcane-armor-points';
  amount.addEventListener('input', () => {
    const points = amount.value === '' ? 0 : Number(amount.value);
    const targets = Object.fromEntries(Object.entries(draft.magicArcaneTargets || {}).map(([id, facts]) =>
      [id, { ...facts, armorDamageLocations: (facts.armorDamageLocations || []).slice(0, Math.max(0, points)) }]));
    handlers.select({ magicArcaneArmorPoints: points, magicArcaneTargets: targets });
  });
  amountLabel.appendChild(amount); box.appendChild(amountLabel);
  for (const [key, label] of [['magicArcaneEnhancedDamage', 'Dégâts : 1 par PA porté (+8 DR)'], ['magicArcaneChooseItem', 'Choisir l’objet magique (+3 DR, Test de Dextérité +2 DR)']]) {
    const wrap = node('label', 'workspace-type workspace-arcane-toggle');
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = Boolean(draft[key]);
    input.dataset.focusKey = key; input.addEventListener('change', () => handlers.select({ [key]: input.checked }));
    wrap.append(input, ` ${label}`); box.appendChild(wrap);
  }
  const cost = armorPoints + (draft.magicArcaneEnhancedDamage ? 8 : 0) + (draft.magicArcaneChooseItem ? 3 : 0);
  box.appendChild(node('p', 'workspace-muted', `Surpuissance à dépenser : ${cost} DR. Les tirages aléatoires sont renseignés par le MJ.`));
  const ids = draft.magicTargetIds?.length ? draft.magicTargetIds : [target?.id || actor.id];
  for (const person of participants.filter(p => ids.includes(p.id))) {
    const facts = draft.magicArcaneTargets?.[person.id] || {};
    const update = patch => handlers.select({ magicArcaneTargets: { ...draft.magicArcaneTargets, [person.id]: { ...facts, ...patch } } });
    box.appendChild(node('p', 'workspace-result-line', person.name));
    for (let index = 0; index < Math.min(20, armorPoints); index++) {
      const label = node('label', 'workspace-type', `PA ${index + 1} : localisation tirée au sort`);
      const select = document.createElement('select'); select.dataset.focusKey = `magic-arcane-armor-${person.id}-${index}`;
      select.appendChild(new Option('Sélectionner le résultat', ''));
      for (const [id, name] of ARCANE_ARMOR_LOCATIONS) select.appendChild(new Option(name, id));
      select.value = facts.armorDamageLocations?.[index] || '';
      select.addEventListener('change', () => {
        const values = Array.from({ length: armorPoints }, (_, i) => facts.armorDamageLocations?.[i] || '');
        values[index] = select.value; update({ armorDamageLocations: values });
      });
      label.appendChild(select); box.appendChild(label);
    }
    const presentLabel = node('label', 'workspace-type', 'Objet magique porté');
    const present = document.createElement('select'); present.dataset.focusKey = `magic-arcane-item-present-${person.id}`;
    [['', 'À préciser'], ['none', 'Aucun'], ['present', 'Présent']].forEach(([value, text]) => present.appendChild(new Option(text, value)));
    present.value = facts.magicItemPresent === true ? 'present' : facts.magicItemPresent === false ? 'none' : '';
    present.addEventListener('change', () => update({ magicItemPresent: present.value === 'present' ? true : present.value === 'none' ? false : null }));
    presentLabel.appendChild(present); box.appendChild(presentLabel);
    if (facts.magicItemPresent) {
      for (const [key, text, numeric] of [
        ['focalisationRoll', 'Test de Focalisation (Haute Magie), 1d100', true],
        ['randomMagicItem', 'Objet magique tiré au sort', false],
        ...(draft.magicArcaneChooseItem ? [['dexterityRoll', 'Test de Dextérité (+2 DR), 1d100', true], ['chosenMagicItem', 'Objet magique choisi', false]] : [])
      ]) {
        const label = node('label', 'workspace-type', text);
        const input = document.createElement('input'); input.type = numeric ? 'number' : 'text';
        if (numeric) { input.min = '1'; input.max = '100'; input.step = '1'; }
        input.value = facts[key] ?? ''; input.dataset.focusKey = `magic-arcane-${key}-${person.id}`;
        input.addEventListener('input', () => update({ [key]: numeric ? (input.value === '' ? null : Number(input.value)) : input.value }));
        label.appendChild(input); box.appendChild(label);
      }
    }
  }
  return box;
}


/** Précision après un nombre de Blessures : réduction, Protection réussie ou immunité. */
/** Durée résolue de l'effet appliqué (après surpuissance), à défaut le texte du contrat. */
function appliedDurationText(target, fallback) {
  const applied = target?.appliedSim?.appliedEffect;
  const plural = (amount, unit) => `${amount} ${unit}${amount > 1 ? 's' : ''}`;
  if (applied?.durationType === 'rounds' && Number.isFinite(applied.durationRounds)) return plural(applied.durationRounds, 'Round');
  if (applied?.durationType === 'minutes' && Number.isFinite(applied.durationMinutes)) return plural(applied.durationMinutes, 'minute');
  if (applied?.durationType === 'hours' && Number.isFinite(applied.durationHours)) return plural(applied.durationHours, 'heure');
  if (applied?.durationType === 'days' && Number.isFinite(applied.durationDays)) return plural(applied.durationDays, 'jour');
  return fallback;
}

function protectionNote(protection) {
  if (!protection) return '';
  if (protection.immune) return ` (immunité${protection.immunity ? ' : ' + protection.immunity : ''})`;
  if (protection.wardSaved) return ` (Protection ${protection.ward}+ réussie${protection.wardRoll ? ', d10 ' + protection.wardRoll : ''} : dégâts annulés)`;
  if (protection.reduction) return ` (réduction de ${protection.reduction})`;
  return '';
}

function renderV5MagicResult(preview, target, draft, handlers) {
  const result = node('div', 'workspace-result workspace-magic-result');
  const pills = node('div', 'workspace-result-pills');

  if(preview.error)result.appendChild(node('p','workspace-result-line',preview.error));
  if (preview.v5MagicKind === 'dispel') {
    result.appendChild(node('p', preview.allowed === false ? 'workspace-result-line workspace-field-error' : 'workspace-result-line', preview.reason ? `Dissipation impossible : ${preview.reason}` : preview.summary));
    if (preview.attemptFailed) result.appendChild(node('p', 'workspace-result-line workspace-field-error', 'Total négatif : la tentative est échouée ; cocher « Recommencer la tentative » pour repartir de zéro DR.'));
    return result;
  }
  if (preview.v5MagicKind === 'channelling') {
    pills.appendChild(outcomePill('Focalisation', preview.success, preview.sl));
    if (preview.critical) pills.appendChild(node('span', 'workspace-outcome is-success', 'Critique (+2 × BFM)'));
    if (preview.fumble) pills.appendChild(node('span', 'workspace-outcome is-critical', 'Maladresse de Focalisation'));
    result.appendChild(pills);

    const rType = (preview.type || preview.reserveType) === 'high' ? 'Haute Magie' : '8 Vents';
    const prevSl = preview.currentReserve?.sl ?? preview.previousReserve?.sl ?? 0;
    const nextSl = preview.newReserve?.sl ?? 0;
    const gained = preview.gain ?? preview.gainedSl ?? 0;
    result.appendChild(node('p', 'workspace-result-line',
      `${preview.success ? 'Focalisation réussie' : 'Focalisation échouée'} · Réserve (${rType}) : ${prevSl} DR → ${nextSl} DR (gain ${signed(gained)})`));
    if (preview.typeChanged || preview.wipedPreviousReserve) {
      result.appendChild(node('p', 'workspace-result-line workspace-muted', 'Changement de type : la réserve précédente d’un autre type a été effacée avant le jet.'));
    }
    if (preview.skillWarning) result.appendChild(node('p','workspace-field-error',preview.skillWarning));
    if (preview.armorPenalty) {
      result.appendChild(node('p', 'workspace-result-line', `Pénalité d’armure portée : ${signed(preview.armorPenalty)} DR`));
    }
    if ((preview.actualLoss ?? preview.lostSl ?? 0) > 0) {
      const lost = preview.actualLoss ?? preview.lostSl ?? 0;
      result.appendChild(node('p', 'workspace-result-line workspace-field-error', `Perte de réserve : −${lost} DR (modificateur d’incident +${lost * 10})`));
    }
    if (preview.miscast) {
      result.appendChild(node('p', 'workspace-result-line workspace-critical-effect',
        `Incident magique (${preview.miscast.severity || preview.miscast.table || 'MINOR'}) : ${preview.miscast.name || preview.miscast.entry?.title || 'Incident'} — ${preview.miscast.effect || preview.miscast.entry?.effect || ''}`));
    }
    return result;
  }

  // Cast / Spell Execution
  const cast = preview.castPreview || {};
  const sp = preview.spellPreview || {};
  const contract = preview.contract || sp?.contract || {};
  const totalSl = cast.totalCastingSl ?? cast.totalSl ?? 0;
  const reserveUsed = cast.matchingReserve ?? cast.reserveConsumed ?? cast.reserveUsed ?? 0;
  // X-01 : une réaction de dissipation remplace le DR et le total du lanceur par ceux d'après l'opposition.
  const reaction = sp?.dispelReaction;
  // Réaction refusée ou incomplète : seul le motif s'affiche (une fois), sans total ni opposition calculés.
  if (reaction && !(reaction.ready && reaction.allowed)) {
    const reason = reaction.reason || reaction.summary || sp.error;
    if (reason && reason !== preview.error) result.appendChild(node('p', 'workspace-result-line workspace-field-error', reason));
    return result;
  }
  const castOk = reaction ? sp.spellSuccess === true : cast.spellSuccess;
  const finalTotal = reaction ? sp.castingPreview?.totalCastingSl ?? reaction.casterSlAfterDispel : totalSl;
  pills.appendChild(outcomePill('Test Langue (Magick)', cast.testSuccess, cast.testSl ?? 0));
  pills.appendChild(node('span', `workspace-outcome ${castOk ? 'is-success' : 'is-failure'}`,
    `${contract.name || 'Sort'} (NI ${contract.cn ?? 0}) : ${reaction?.dispelled ? 'Sort DISSIPÉ' : `${castOk ? 'Sort lancé ! Incantation réussie' : 'Échec d’incantation'} · Total ${finalTotal} DR`}`));
  if (cast.critical) pills.appendChild(node('span', 'workspace-outcome is-critical', `Critique d’incantation${cast.criticalChoice ? ` (${cast.criticalChoice})` : ''}`));
  if (cast.fumble) pills.appendChild(node('span', 'workspace-outcome is-critical', 'Maladresse d’incantation'));
  result.appendChild(pills);

  result.appendChild(node('p', 'workspace-result-line',
    `Calcul d’incantation : ${signed(cast.testSl ?? 0)} DR (test) + ${reserveUsed} DR (réserve consommée) = ${totalSl} DR vs NI ${contract.cn ?? 0}`));

  if (reaction) {
    result.appendChild(node('p', 'workspace-result-line', `Opposition de dissipation : Test du lanceur ${signed(reaction.casterSl)} DR − dissipateur ${signed(reaction.dispellerSl)} DR = ${signed(reaction.netSl)} DR nets.`));
    result.appendChild(node('p', 'workspace-result-line', reaction.dispelled
      ? `Sort dissipé : DR net négatif ; la réserve (${reaction.reserveSl} DR) ne sauve pas le sort, aucun effet ni épuisement.`
      : `Le lanceur gagne l’opposition : ${signed(reaction.netSl)} DR nets + réserve ${reaction.reserveSl} DR = ${signed(reaction.casterSlAfterDispel)} DR restants contre NI ${contract.cn ?? 0}${castOk ? '.' : ' : NI non atteint, sort raté (réserve consommée).'}`));
  }
  if(sp?.burnout) result.appendChild(node('p','workspace-result-line',sp.burnout.summary));
  const miscast = cast.miscast || sp?.miscast;
  if (miscast) {
    result.appendChild(node('p', 'workspace-result-line workspace-critical-effect',
      `Incident magique (${miscast.severity || miscast.table || 'MINOR'}) : ${miscast.name || miscast.entry?.title || 'Incident'} — ${miscast.effect || miscast.entry?.effect || ''}`));
  }

  if ((sp?.fingerprintCheck && !sp.fingerprintCheck.valid) || sp?.valid === false || (cast.spellSuccess && sp?.ready === false)) {
    const errText = (sp?.fingerprintCheck && !sp.fingerprintCheck.valid)
      ? `Contrat obsolète ou modifié (${sp.fingerprintCheck?.reason || sp.reason || 'empreinte invalide'}) : l’automatisation est désactivée.`
      : (sp?.error || sp?.reason || 'Paramètres d’exécution du sort invalides ou incomplets.');
    const err = node('p', 'workspace-field-error', errText);
    err.setAttribute('role', 'alert');
    result.appendChild(err);
    return result;
  }

  if (cast.spellSuccess && sp) {
    for (const t of sp.targetResults || sp.targets || []) {
      const tName = t.targetName || t.name || 'Cible';
      for(const action of t.actions || [])if(['mj-input','chain-ended','conjured-weapon','option-tests','affliction-receipt','suppression','banishment-receipt','calm'].includes(action.kind) && action.summary)result.appendChild(node('p','workspace-result-line',tName+' : '+action.summary));
      if(t.quantifiedReminder)result.appendChild(node('p','workspace-result-line',tName+' : '+Object.entries(t.quantifiedReminder).map(([key,value])=>key+' = '+value).join(' ; ')+' (reçu à appliquer sur la fiche ou le terrain).'));
      if (t.missile) {
        const rawDmg = t.missile.rawDamage ?? t.missile.baseDamage ?? 0;
        // Blessures nettes après armure, Protection et réduction : `t.woundsLost` quand une Protection a joué.
        const netWounds = t.magicProtection ? t.woundsLost : t.missile.woundsLost ?? t.missile.finalDamage ?? t.missile.netWounds ?? 0;
        result.appendChild(node('p', 'workspace-result-line',
          `${tName} : Projectile magique · ${rawDmg} Dégâts bruts → ${netWounds} Blessures${protectionNote(t.magicProtection)} (${t.missile.location || 'Corps'}) · PV ${t.finalHp ?? ''}`));
      }
      if (t.damage) {
        const rawDmg = t.damage.rawDamage ?? 0;
        const netWounds = t.magicProtection ? t.woundsLost : t.damage.woundsLost ?? t.damage.finalDamage ?? t.damage.netWounds ?? 0;
        result.appendChild(node('p', 'workspace-result-line',
          `${tName} : Dégâts magiques · ${rawDmg} Dégâts bruts → ${netWounds} Blessures${protectionNote(t.magicProtection)}`));
      }
      if (t.arcaneUnforgiving) {
        const arcane = t.arcaneUnforgiving;
        result.appendChild(node('p', 'workspace-result-line', 'Surpuissance dépensée : ' + arcane.overcastCost + ' DR'));
        for (const action of t.actions || []) {
          if (action.kind?.startsWith('arcane-')) result.appendChild(node('p', 'workspace-result-line', tName + ' : ' + action.summary));
        }
        const names = Object.fromEntries(ARCANE_ARMOR_LOCATIONS);
        for (const loc of Object.keys(arcane.damageByLocation)) {
          result.appendChild(node('p', 'workspace-result-line', names[loc] + ' : ' + arcane.armorBefore[loc] + ' → ' + arcane.armorAfter[loc] + ' PA'));
        }
      }
      if (t.healing) {
        const healed = t.healing.healedAmount ?? t.healing.healedWounds ?? t.woundsHealed ?? 0;
        result.appendChild(node('p', 'workspace-result-line',
          `${tName} : Soin magique · +${healed} Blessures`));
      }
      if (t.temporaryEffect) {
        result.appendChild(node('p', 'workspace-result-line',
          `${tName} : Effets temporaires (${appliedDurationText(t, contract.duration || 'durée active')}) — ${t.temporaryEffect.spellName || contract.name}`));
      }
      if (t.beastForm) {
        const bf = t.beastForm;
        result.appendChild(node('p', 'workspace-result-line',
          `Transformation (${contract.name}) : ${bf.summary}`));
      }
      if (t.verdantApotheosis) {
        const va = t.verdantApotheosis;
        result.appendChild(node('p', 'workspace-result-line',
          va.admissible
            ? `Apothéose Verdoyante : ${tName} revient à la vie avec ${va.healedHp} PV · ${va.corruptionTest}`
            : `Apothéose Verdoyante : ${tName} non admissible (${va.reason})`));
      }
      if (t.handOfGlory) {
        result.appendChild(node('p', 'workspace-result-line', t.handOfGlory.summary || `Main de Gloire appliquée sur ${tName}`));
      }
      if (t.daemonbane) {
        result.appendChild(node('p', 'workspace-result-line', t.daemonbane.summary || `Fléau des Démons sur ${tName}`));
      }
      if (t.sapheryWard) {
        result.appendChild(node('p', 'workspace-result-line', t.sapheryWard.summary || `Bouclier de Saphery : Protection ${t.sapheryWard.threshold}+`));
      }
      if (t.scythe) {
        result.appendChild(node('p', 'workspace-result-line', t.scythe.summary));
      }
      if (t.specialEffect) {
        result.appendChild(node('p', 'workspace-result-line',
          `${tName} : ${t.specialEffect.summary || contract.name}`));
      }
    }
    // Destinataires secondaires désignés par le MJ (ennemis engagés, attaquant) : États et Blessures après Protection.
    for (const r of sp.secondaryResults || []) {
      const effects = r.recurring ? ['sera frappé à chacun de ses Tours']
        : r.immune ? [`immunisé (${r.immune})`]
        : r.test?.passed ? [`${r.test.skill} réussi (${r.test.roll} ≤ ${r.test.score}), aucun effet`]
        : [...r.conditions, ...(r.woundsLost ? [`${r.woundsLost} Blessures${protectionNote(r.magicProtection)}`] : r.magicProtection?.wardSaved ? [`0 Blessure${protectionNote(r.magicProtection)}`] : [])];
      result.appendChild(node('p', 'workspace-result-line', `${r.targetName} : ${effects.join(', ') || 'aucun effet'}`));
    }
    for (const ar of sp.attributeReceipts || []) {
      result.appendChild(node('p', 'workspace-result-line workspace-muted',
        `Attribut de Domaine (${ar.lore}) : ${ar.effect}`));
    }
    for (const item of sp.ficheFollowUpReceipt?.inventoryChanges || []) {
      result.appendChild(node('p', 'workspace-muted', item.summary));
    }
    if (sp.ficheFollowUpReceipt?.reminderText) {
      result.appendChild(node('p', 'workspace-muted', `Rappel : ${sp.ficheFollowUpReceipt.reminderText}`));
    }
    for (const rem of sp.reminders || []) {
      result.appendChild(node('p', 'workspace-muted', `Rappel : ${rem}`));
    }
  }
  return result;
}

function renderResult(preview, target, draft, handlers) {
  if (preview?.v5MagicKind) return renderV5MagicResult(preview, target, draft, handlers);
  const result = node('div', 'workspace-result');
  if (preview.choiceRequired) result.appendChild(node('p', 'workspace-muted', 'Aperçu provisoire : les joueurs doivent confirmer leurs choix.'));
  result.appendChild(renderV5Decisions(preview, draft, handlers));
  for(const choice of Object.entries(preview.talentSLChoices || {}).flatMap(([role,choices])=>choices.map(row=>({...row,role})))){
    const role=choice.role || 'actor', draftKey=role==='defender'?'defenseTalentChoices':'talentChoices';
    const label=node('label','workspace-type',choice.label+' · '+(role==='defender'?'défense':'Test')+' · '+(choice.optionId==='keep'?'jet conservé':'jet inversé'));
    const select=document.createElement('select');select.setAttribute('aria-label',choice.label+' : DR ou unités ('+(role==='defender'?'défenseur':'acteur')+', '+(choice.optionId==='keep'?'jet conservé':'jet inversé')+')');
    select.dataset.focusKey='talent-sl-'+role+'-'+choice.key;
    select.append(new Option('Choisir après réussite',''),new Option('Conserver '+choice.sl+' DR','false'),new Option('Retenir '+choice.units+' (unités)','true'));
    const value=draft[draftKey]?.[choice.key];select.value=typeof value==='boolean'?String(value):'';
    select.addEventListener('change',()=>{handlers.select({[draftKey]:{...(draft[draftKey]||{}),[choice.key]:select.value===''?undefined:select.value==='true'}});handlers.calculate();});
    label.append(select);result.append(label);
  }
  const pills = node('div', 'workspace-result-pills');
  pills.appendChild(outcomePill(ROLL_LABELS[preview.actionType] || 'Jet', preview.success, preview.sl));
  if (preview.opposition?.mode === 'opposed') pills.appendChild(outcomePill('Défense', preview.opposition.defender.success, preview.opposition.defender.sl));
  if (preview.fumble) pills.appendChild(node('span', 'workspace-outcome is-critical', 'Maladresse de l’attaquant'));
  if (preview.defenderFumble) pills.appendChild(node('span', 'workspace-outcome is-critical', 'Maladresse du défenseur'));
  result.appendChild(pills);
  if(preview.prayerSLAdjustment)result.appendChild(node('p','workspace-result-line',`Courroux « Pensez à vos actes » · ${preview.prayerSLAdjustment.rawSL} DR bruts → ${preview.prayerSLAdjustment.effectiveSL} DR appliqués · plafond de +0 pendant huit jours impériaux.`));
  for(const state of preview.actorConditionApplication||[])if(state.source?.keywordId==='a-poudre-noire')result.append(node('p','workspace-result-line','À Poudre noire : '+state.level+' état(s) Brisé sur '+preview.input.actor.name));
  if(preview.test?.automatic)result.appendChild(node('p','workspace-result-line',preview.test.noTest?'Choix de talent sans Test.':'Réussite automatique, sans jet.'));
  if(preview.defenderDamage)result.appendChild(node('p','workspace-result-line','Riposte : '+preview.defenderDamage.finalDamage+' Blessures sur '+(preview.input.actor?.name||'l’attaquant')));
  if (preview.attack) result.appendChild(node('p', 'workspace-result-line', `${preview.hit ? 'Touché' : 'Pas de touche'}${preview.location ? ` · ${preview.location.name}` : ''}`));
  if (target && preview.damage) result.appendChild(node('p', 'workspace-result-line', `${target.name} : ${previewHpLoss(preview)} Blessures proposées · PV ${target.hp} → ${Math.max(0, Number(target.hp) - previewHpLoss(preview))}`));
  if (preview.actionCosts?.paid?.length) result.appendChild(node('p', 'workspace-result-line',
    'Coût proposé avant le jet : ' + preview.actionCosts.paid.map(cost => cost.resource === 'momentum' ? '1 Élan' : cost.amount + ' ' + cost.resource).join(', ')));
  if (preview.damageReplacedByTalent) result.appendChild(node('p', 'workspace-result-line', preview.damageReplacedByTalent.name||'Battement : 0 Blessure ; toutes les conséquences du critique remplacé sont supprimées. Esquive reste possible.'));
  if(preview.defenderDamageReplacedByTalent)result.append(node('p','workspace-result-line',preview.defenderDamageReplacedByTalent.name));for(const plan of preview.postActionCosts||[])result.append(node('p','workspace-result-line','Coût après le résultat : '+plan.paid.map(c=>c.amount+' Élan').join(', ')));
  const reductions = (preview.talentPlans || []).flatMap(plan => plan.proposals || []).filter(proposal => proposal.op === 'reduceConditionAcquisition');
  if (reductions.length) result.appendChild(node('p', 'workspace-result-line', 'Mâchoires d’acier : un Sonné évité, premier usage de cette rencontre.'));
  for (const change of preview.momentum || []) {
    const name = change.participantId === preview.input.actor?.id ? preview.input.actor.name : target?.name;
    result.appendChild(node('p', 'workspace-result-line', `${name || 'Combattant'} : Élan ${change.before ? 'oui' : 'non'} → ${change.after ? 'oui' : 'non'}`));
  }
  for(const reminder of preview.reminders || [])result.appendChild(node('p','workspace-muted',reminder));
  for(const occurrence of preview.weaponConditions?.applied || [])result.appendChild(node('p','workspace-result-line','Assommante : '+occurrence.level+' état Sonné proposé.'));
  for (const warning of preview.unresolved || []) {
    const match = /^Talent(?: (talent-[a-z0-9-]+))? : préciser (.+)\.$/.exec(warning);
    const talentName = match?.[1] ? getReferenceCatalogue().talents.find(row=>row.id===match[1])?.nom || 'Talent' : 'Talent';
    const field = match?.[2];
    const contextLabel = V5_TALENT_TEST_CONTEXT_FIELDS.find(row=>row.field===field)?.label || ({skillId:'Compétence du Test',skillGroupId:'Compétence du Test',specialization:'Spécialité du Test',specializationId:'Spécialité du Test',weaponImprovised:'Arme improvisée','weapon.improvised':'Arme improvisée',silentTakedown:'Neutralisation silencieuse',outsideCombat:'Procédure hors combat',targetUnaware:'Cible ignorant le danger'})[field];
    const text = match && (contextLabel || field.startsWith('choices.')) ? talentName+' : '+(contextLabel ? contextLabel+' — à préciser.' : 'choisir DR ou unités pour ce jet réussi.') : warning;
    result.appendChild(node('p', 'workspace-field-error', text));
  }
  if (preview.choiceRequired) result.appendChild(node('p', 'workspace-muted', 'Choisissez chaque inversion facultative avant de confirmer.'));
  if (preview.weapon?.status === 'manual') result.appendChild(node('p', 'workspace-field-error', `Dégâts à arbitrer : ${preview.weapon.text}.`));
  if (preview.protection?.manual?.length) result.appendChild(node('p', 'workspace-field-error', 'Protection à préciser : renseignez les PA après arbitrage.'));
  if (preview.mechanicalWarnings?.length) result.appendChild(node('p', 'workspace-field-error', `Effets non validés V5 : ${preview.mechanicalWarnings.map(item => item.keywordId).join(', ')}.`));
  if (preview.critical?.details || preview.critical?.second) result.appendChild(renderCritical(preview, draft, handlers));
  for(const row of preview.secondaryTargets||[]){
    result.append(node('p','workspace-result-line',row.name+' : '+(row.damage.finalDamage+(row.critical?.application.extraWounds||0))+' Blessures proposées ; '+row.location.name));
    if(row.critical?.second){
      const injure=hasV5Talent(preview.input.actor,'talent-strike-to-injure'),inoffensive=row.damage.isInoffensive;
      const fields=[['secondEffect','Gravité du critique : '+row.name],...(inoffensive?[['secondEffectAlternative','Seconde gravité Inoffensive : '+row.name]]:[]),...(injure?[['injureSecondEffect','Autre gravité Frappe blessante : '+row.name],...(inoffensive?[['injureSecondEffectAlternative','Autre seconde gravité Inoffensive : '+row.name]]:[])]:[])];
      for(const[key,text]of fields){const label=node('label','workspace-type',text),input=document.createElement('input');input.type='number';input.min='1';input.max='100';input.value=draft.v5Context?.whirlwindRolls?.[row.participantId]?.[key]??'';input.setAttribute('aria-label',text);const update=()=>{const value=Number(input.value);if(Number.isInteger(value)&&value>=1&&value<=100)handlers.situationalCritical(row.participantId,key,value);};input.addEventListener('change',update);input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();update();}});label.append(input);result.append(label);}
      if(injure){const text='Frappe blessante : gravité à retenir pour '+row.name,label=node('label','workspace-type',text),select=document.createElement('select');select.setAttribute('aria-label',text);select.append(new Option('Choisir',''),new Option('Première gravité','false'),new Option('Autre gravité','true'));const value=draft.v5Context?.whirlwindChoices?.[row.participantId]?.['injure:second'];select.value=typeof value==='boolean'?String(value):'';select.addEventListener('change',()=>{if(select.value)handlers.situationalCriticalChoose(row.participantId,'injure:second',select.value==='true');});label.append(select);result.append(label);}
      if(row.critical.second.effect)result.append(criticalEffectLine(row.critical.second));
    }
  }
  if (preview.defenderCritical) result.appendChild(renderCritical(preview, draft, handlers, true));
  const calculations = node('details', 'workspace-v5-calculations');
  calculations.appendChild(node('summary', '', 'Détail des calculs et règles'));
  for (const [name, test] of [['Attaque / Test', preview.test], ['Défense', preview.defenderTest]]) {
    if (!test) continue;
    calculations.appendChild(node('p', 'workspace-formula-notes', `${name} : ${test.automatic?'réussite automatique, sans jet':`jet initial ${test.initialRoll}, jet final ${test.roll}`} · score ${test.score} · DR de base ${signed(test.details.baseSl)} · modificateurs ${signed(test.details.totalModifier)} · ${test.advantage.advantage.length} Avantage(s), ${test.advantage.disadvantage.length} Désavantage(s)`));
    for (const modifier of test.details.modifiers) calculations.appendChild(node('p', 'workspace-formula-notes', `${modifier.label} : ${signed(modifier.amount)} DR`));
    if (test.zeroOutcome) calculations.appendChild(node('p', 'workspace-formula-notes', test.success ? 'Réussite marginale (+0 DR)' : 'Échec marginal (−0 DR)'));
  }
  if (preview.opposition?.mode === 'opposed') calculations.appendChild(node('p', 'workspace-formula-notes', `DR net ${signed(preview.opposition.netSl)}${preview.opposition.tie ? ' · égalité : l’initiateur gagne' : ''}`));
  if (preview.damage) calculations.appendChild(node('p', 'workspace-formula num', formatDamageFormula(preview.damage)));
  if (preview.protection) calculations.appendChild(node('p', 'workspace-formula-notes', `Protection retenue : ${preview.protection.ap ?? 'inconnue'} PA`));
  calculations.appendChild(node('p', 'workspace-muted', `Règle : ${preview.ruleVersion}`));
  const covered = new Set([...Object.values(V5_TALENT_IDS),...V5_TEST_TALENT_IDS,'talent-strike-to-stun']);
  const excluded = new Set(EXCLUDED_BASE_CHARACTERISTIC_TALENTS);
  const acquired = preview.input.actor?.talents || [];

  if (acquired.some(row => excluded.has(row.id))) calculations.appendChild(node('p', 'workspace-muted', 'Les bonus permanents de caractéristiques sont déjà compris dans la fiche.'));
  const disabled = new Map((preview.talentPlans || []).flatMap(plan => plan.trace || [])
    .filter(row => ['sourceChanged','sourceUnavailable','draft'].includes(row.status)).map(row => [row.talentId, row.status]));
  for (const [id, status] of disabled) {
    const talent = [...acquired, ...(preview.input.target?.talents || [])].find(row => row.id === id);
    calculations.appendChild(node('p', 'workspace-field-error', (talent?.name || id) + ' : ' +
      (status === 'sourceChanged' ? 'description modifiée' : status === 'sourceUnavailable' ? 'source indisponible' : 'règle encore en préparation') + ' ; effet à arbitrer par le MJ.'));
  }
  for (const [role, subject] of [['Acteur',preview.input.actor],['Défenseur',preview.input.target]]) {
    const rows=acquiredV5TalentCoverage(subject);
    if(!rows.length)continue;
    const details=node('details','workspace-talent-coverage');details.append(node('summary','',role+' : traitement des talents acquis'));
    for(const row of rows){details.append(node('strong','',row.name||row.talentId));for(const clause of row.clauses)details.append(node('p','workspace-muted',V5_TALENT_TREATMENT_LABELS[clause.mode]+' · '+clause.text));}
    calculations.append(details);
  }
  result.appendChild(calculations);
  return result;
}

// Une ligne par cible : « Saskia : touché · 12 dégâts · PV 14 → 2 ».
function comparisonText({ name, hp, preview }) {
  const damage = preview.damage;
  const outcome = preview.hit ? 'touché' : 'pas de touche';
  const manual = preview.hit && preview.weapon?.status === 'manual' ? ' · dégâts à arbitrer' : '';
  const pending = preview.critical?.details?.needsLocation ? ' · coup critique (localisation à lancer)' : '';
  const loss = previewHpLoss(preview);
  return `${name} : ${outcome}${manual}${pending}${damage ? ` · ${loss} dégâts · PV ${minusSigned(hp)} → ${minusSigned(Math.max(0, (Number(hp) || 0) - loss))}` : ''}`;
}

function renderComparison(entries, handlers, busy) {
  const block = node('div', 'workspace-comparison');
  block.appendChild(rubric('Comparaison des cibles'));
  const list = node('ul', 'workspace-comparison-list');
  entries.forEach(entry => {
    const item = node('li', 'workspace-comparison-item');
    item.dataset.targetId = entry.targetId;
    const choose = button('Choisir', 'workspace-ghost', { 'aria-label': `Choisir ${entry.name}`, 'data-focus-key': `compare-choose-${entry.targetId}` });
    choose.disabled = busy;
    choose.addEventListener('click', () => handlers.choose(entry.targetId));
    item.append(node('span', 'num', comparisonText(entry)), choose);
    list.appendChild(item);
  });
  block.appendChild(list);
  return block;
}

/**
 * @param {object} options
 * @param {object} options.draft brouillon de la vue (jets, défense, aperçu, erreurs)
 * @param {object|null} options.actor participant qui agit
 * @param {Array} options.actions actions de celui qui agit
 * @param {string|null} options.actionKey clé de l'action retenue
 * @param {string|null} options.type type retenu
 * @param {object|null} options.target cible effective
 * @param {{ adversaries: Array, allies: Array }} options.groups cibles possibles
 * @param {{ options: Array, value: string, option: object }|null} options.defense choix de défense de la cible (attaque avec cible)
 * @param {boolean} options.canCalculate
 * @param {boolean} options.canApply
 * @param {object} options.handlers select, input, roll, calculate, compare, choose, apply, cancel
 */
function renderDivineSocialFacts(subject,draft,handlers,{defending=false}={}){const checked=readDivineRejections(subject),cults=[...new Set(checked.records.filter(row=>row.kind==='permanent'||row.stage<2).map(row=>row.cult))];if(!cults.length)return null;const key=defending?'defenseContext':'v5Context',context=draft[key]||{},box=node('div','workspace-divine-social');box.append(node('p','workspace-muted',(defending?'Défenseur':'Auteur')+' : une interaction avec un membre du culte est au mieux Très Difficile (−3 DR), sans amélioration positive au-dessus de ce seuil. Source L06 p.219.'));for(const cult of cults){const text=(defending?'Défenseur · ':'')+'L’interaction concerne un membre de '+cult,label=node('label','workspace-type',text),select=document.createElement('select');select.setAttribute('aria-label',text);select.append(new Option('À préciser',''),new Option('Oui','true'),new Option('Non','false'));select.value=typeof context.divineCultMembership?.[cult]==='boolean'?String(context.divineCultMembership[cult]):'';select.addEventListener('change',()=>handlers.select({[key]:{...context,divineCultMembership:{...context.divineCultMembership,[cult]:select.value===''?undefined:select.value==='true'}}}));label.append(select);box.append(label);}const text=(defending?'Défenseur · ':'')+'Ce Test est une interaction sociale',label=node('label','workspace-type',text),select=document.createElement('select');select.setAttribute('aria-label',text);select.append(new Option('Selon la compétence choisie',''),new Option('Oui','true'));select.value=context.socialInteraction===true?'true':'';select.addEventListener('change',()=>handlers.select({[key]:{...context,socialInteraction:select.value==='true'?true:undefined}}));label.append(select);box.append(label);return box;}
export function renderResolutionPanel({ draft, actor, participants=[], actions, actionKey: selectedKey, type, target, groups, defense, canCalculate, canApply, handlers }) {
  const section = node('section', 'workspace-resolution workspace-card');
  section.setAttribute('aria-labelledby', 'workspace-resolution-title');
  const title = node('h3', 'workspace-rubric', 'Résolution');
  title.id = 'workspace-resolution-title';
  section.appendChild(title);

  const brokenFacts=renderBrokenEscapeVisibilityControl({actor,value:draft.brokenEscapeVisibility,onChange:value=>handlers.select({brokenEscapeVisibility:value}),key:'resolution'});
  if(brokenFacts){section.appendChild(brokenFacts);section.appendChild(node('p','workspace-muted','Cette confirmation est transmise au moteur pour le Test ou la résolution; elle ne change pas seule l’état de Brisé.'));}

  if (!actor) {
    section.appendChild(node('p', 'workspace-muted', 'Aucun combattant en jeu : faites entrer un combattant pour résoudre une action.'));
    return section;
  }

  // Action
  const actionBlock = node('div', 'workspace-resolution-row');
  actionBlock.appendChild(rubric('Action'));
  const actionChips = node('div', 'workspace-chip-list');
  if (!actions.length) actionChips.appendChild(node('p', 'workspace-muted', 'Aucune action préparée : ajoutez-en une avec « Modifier ».'));
  actions.forEach((action, index) => {
    const key = actionKey(action, index);
    const qualities = qualityNames(action);
    const item = chip('', { pressed: key === selectedKey, key: `action-${key}`, attrs: { 'data-action-key': key } });
    item.append(node('span', '', actionLabel(action)));
    if (actionHasDamage(action)) item.append(node('span', 'workspace-chip-note', ` · dégâts ${describeWeaponDamage(action, actor.caracs)}`));
    if (qualities.length) item.append(node('span', 'workspace-chip-note', ` · ${qualities.join(', ')}`));
    item.addEventListener('click', () => handlers.select({ actionKey: key }));
    actionChips.appendChild(item);
  });
  actionBlock.appendChild(actionChips);
  if (actions.length) {
    const typeLabel = node('label', 'workspace-type');
    typeLabel.append('Type');
    const select = document.createElement('select');
    select.dataset.focusKey = 'action-type';
    select.setAttribute('aria-label', 'Type d’action');
    ACTION_TYPES.forEach(([value, label]) => select.appendChild(new Option(label, value)));
    select.value = type || 'skill';
    select.addEventListener('change', () => handlers.select({ type: select.value }));
    typeLabel.appendChild(select);
    actionBlock.appendChild(typeLabel);
  }
  section.appendChild(actionBlock);

  // Cible
  const targetBlock = node('div', 'workspace-resolution-row');
  targetBlock.appendChild(rubric('Cible'));
  const targetChips = node('div', 'workspace-chip-list');
  [['Adversaires', groups.adversaries], ['Alliés', groups.allies]].forEach(([label, list]) => {
    if (!list.length) return;
    const group = node('div', 'workspace-chip-group');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', label);
    group.appendChild(node('span', 'workspace-chip-group-label', label));
    list.forEach(participant => {
      const item = chip(participant.name, { pressed: participant.id === target?.id, key: `target-${participant.id}` });
      item.classList.add('combatant-name');
      item.addEventListener('click', () => handlers.select({ targetId: participant.id }));
      group.appendChild(item);
    });
    targetChips.appendChild(group);
  });
    const selfChip = type === 'cast' ? chip(`Soi-même (${actor.name})`, { pressed: target?.id === actor.id, key: `target-${actor.id}` }) : null;
    if (selfChip) {
      selfChip.classList.add('combatant-name');
      selfChip.addEventListener('click', () => handlers.select({ targetId: actor.id }));
      targetChips.appendChild(selfChip);
    }
    const none = chip('Aucune cible', { pressed: !target, key: 'target-none' });
    none.addEventListener('click', () => handlers.select({ targetId: 'none' }));
    targetChips.appendChild(none);
    targetBlock.appendChild(targetChips);
    section.appendChild(targetBlock);

    if (!actions.length) return section;
    const action = actions.find((item, index) => actionKey(item, index) === selectedKey) || actions[0];

    if(action.extensions?.fiche?.requiresLink) section.appendChild(node('p','workspace-field-error','Compétence à choisir dans « Mettre à jour les PJ » avant de lancer cette action.'));
    if (['channelling', 'cast', 'dispel'].includes(type)) {
      section.appendChild(renderV5MagicContext({ actor, participants, target, type, draft, handlers }));
    } else {
      if(type === 'attack') {
        const ammo=action.extensions?.equipment?.range ? (actor.equipment||[]).filter(row=>row.kind==='ammunition' && ammunitionCompatibility(action.extensions.equipment,row).status !== 'incompatible') : [];
        if(ammo.length) { const label=node('label','workspace-type','Munition');const select=document.createElement('select');select.setAttribute('aria-label','Munition');select.append(new Option('Aucune munition ajoutée',''));ammo.forEach(row=>select.append(new Option(row.name,row.id)));select.value=draft.ammunitionId||'';select.addEventListener('change',()=>handlers.select({ammunitionId:select.value,ammunitionArbitrated:false}));label.append(select);section.append(label); }
        const selectedAmmo = ammo.find(row=>row.id===draft.ammunitionId);
        if(selectedAmmo && ammunitionCompatibility(action.extensions.equipment,selectedAmmo).status==='manual') { const label=node('label','workspace-type');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=draft.ammunitionArbitrated===true;checkbox.addEventListener('change',()=>handlers.select({ammunitionArbitrated:checkbox.checked}));label.append(checkbox,'Compatibilité de cette munition vérifiée par le MJ');section.append(label); }
        if(target) {
          const context=draft.protectionContext||{};const block=node('details','workspace-defense');block.append(node('summary','','Protection et bouclier pour cette attaque'));
          const shields=(target.equipment||[]).filter(row=>row.kind==='shield');
          if(shields.length){const label=node('label','workspace-type','Bouclier');const select=document.createElement('select');select.setAttribute('aria-label','Bouclier utilisé');select.append(new Option('Aucun',''));shields.forEach(row=>select.append(new Option(row.name,row.id)));select.value=context.shieldId||'';select.addEventListener('change',()=>handlers.select({protectionContext:{...context,shieldId:select.value}}));label.append(select);block.append(label);}
          for(const [key,text] of [['shieldAvailable','Bouclier disponible ce tour'],['opposedWithShield','Défense opposée avec ce bouclier'],['ranged','Attaque à distance'],['lineOfSight','Attaquant visible']]) {
            const label=node('label','workspace-type',text);const choice=document.createElement('select');choice.setAttribute('aria-label',text);
            const inferred=key === 'ranged' && action.extensions?.equipment ? equipmentAttackContext(action.extensions.equipment)?.ranged : undefined;
            const value=typeof inferred==='boolean'?inferred:context[key];choice.append(new Option('À préciser',''),new Option('Oui','true'),new Option('Non','false'));choice.value=typeof value==='boolean'?String(value):'';choice.disabled=typeof inferred==='boolean';
            choice.addEventListener('change',()=>handlers.select({protectionContext:{...context,[key]:choice.value===''?undefined:choice.value==='true'}}));label.append(choice);block.append(label);
          }
          const manual=node('label','workspace-type','PA retenus après arbitrage (facultatif)');const input=document.createElement('input');input.type='number';input.min='0';input.setAttribute('aria-label','PA retenus après arbitrage');input.value=context.manualAp ?? '';input.addEventListener('change',()=>handlers.select({protectionContext:{...context,manualAp:input.value===''?undefined:Number(input.value)}}));manual.append(input);block.append(manual);section.append(block);
        }
      }
      const v5 = node('div', 'workspace-v5-context');
      v5.appendChild(rubric('Test V5'));if(type!=='attack'){const social=renderDivineSocialFacts(actor,draft,handlers);if(social)v5.append(social);if(type==='opposition'&&target){const defenseSocial=renderDivineSocialFacts(target,draft,handlers,{defending:true});if(defenseSocial)v5.append(defenseSocial);}}
      if((actor?.extensions?.v5?.spellEffects || []).some(e=>e.magicTalentId==='talent-mind-over-body')){const label=node('label','workspace-type','Pénalité de Blessures Critiques (DR négatifs, hors autre modificateur)');const input=document.createElement('input');input.type='number';input.max='0';input.min='-100';input.value=draft.v5Context?.magicCriticalPenalty ?? '';input.setAttribute('aria-label',label.textContent);input.addEventListener('input',()=>handlers.input('v5Context',{...draft.v5Context,magicCriticalPenalty:input.value===''?null:Number(input.value)}));label.append(input);v5.append(label);}
      const attackKind=draft.v5Kind || inferV5Kind({ ...action, type }, equipmentAttackContext(action.extensions?.equipment));
      const attackBase=weaponAttackNature({actor,action:{...action,type},ranged:equipmentAttackContext(action.extensions?.equipment)?.ranged,kind:attackKind});
      for(const field of natureSelects(target,()=>draft.v5Context?.attackNature,next=>handlers.select({v5Context:{...draft.v5Context,attackNature:next}}),attackBase))v5.append(field);
      // Bénédiction de Protection : résultat du Test de Calme Accessible (+2 DR) de l’attaquant, saisi par le MJ.
      const protectionLayer=(target?.extensions?.v5?.divineEffects||[]).find(layer=>layer?.attackDeterrent);
      // Attaquant déjà passé : le Test de Calme n'est plus demandé.
      if(actor?.camp!==target?.camp&&protectionLayer&&!(protectionLayer.attackDeterrent.passedAttackerIds||[]).includes(actor.id)){const label=node('label','workspace-type','Bénédiction de Protection : Test de Calme Accessible (+2 DR) de l’attaquant');const select=document.createElement('select');select.setAttribute('aria-label','Test de Calme de l’attaquant (Bénédiction de Protection)');select.append(new Option('À saisir',''),new Option('Échec : autre cible ou Action','fail'),new Option('Réussite','pass'));const calm=draft.v5Context?.protectionCalm;select.value=calm?(calm.success?'pass':'fail'):'';select.addEventListener('change',()=>handlers.select({v5Context:{...draft.v5Context,protectionCalm:select.value===''?undefined:{success:select.value==='pass'}}}));label.append(select);v5.append(label);}
      if(reductionLayers(target?.extensions?.v5).some(r=>r.calmTest)){const label=node('label','workspace-type','Test de Calme (+0 DR) contre cette attaque : réussi, DR obtenus');const select=document.createElement('select');select.setAttribute('aria-label','Test de Calme contre cette attaque');select.append(new Option('À saisir',''),new Option('Échec','fail'),new Option('Réussite','pass'));const calm=draft.v5Context?.reductionCalm;select.value=calm?(calm.success?'pass':'fail'):'';const sl=document.createElement('input');sl.type='number';sl.min='0';sl.max='20';sl.value=calm?.sl??0;sl.setAttribute('aria-label','DR du Test de Calme');const update=()=>handlers.select({v5Context:{...draft.v5Context,reductionCalm:select.value===''?undefined:{success:select.value==='pass',sl:Number(sl.value)||0}}});select.addEventListener('change',update);sl.addEventListener('change',update);label.append(select,sl);v5.append(label);}
      {const dice=wardDiceCount(target?.extensions?.v5,{...attackBase,...draft.v5Context?.attackNature});for(let k=0;k<dice;k++){const text=dice>1?`Protection magique ${k+1}/${dice} (Bénédiction de Lileath) : résultat du d10`:'Protection magique : résultat du d10';const label=node('label','workspace-type',text);const input=document.createElement('input');input.type='number';input.min='1';input.max='10';const saved=draft.v5Context?.magicWardRoll;input.value=(Array.isArray(saved)?saved[k]:k===0?saved:null) ?? '';input.setAttribute('aria-label',text);input.addEventListener('input',()=>{const now=draft.v5Context?.magicWardRoll;const list=Array.isArray(now)?[...now]:dice>1?[]:[now];const value=input.value===''?null:Number(input.value);list.length=dice;for(let j=0;j<dice;j++)list[j]??=null;list[k]=value;handlers.input('v5Context',{...draft.v5Context,magicWardRoll:dice===1?list[0]:list});});label.append(input);v5.append(label);}}

      if(participants.some(p=>magicTalentRank(p,'animal-assistant')||magicTalentRank(p,'magical-assistant')) || magicTalentRank(actor,'magical-sense')){
        const section=node('details','workspace-v5-context-details');section.append(node('summary','','Assistance et perception magiques'));
        const context=draft.v5Context || {};
        const label=node('label','workspace-type','Familier assistant');const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);select.append(new Option('Aucun',''));for(const p of participants)if(p.id!==actor.id&&(magicTalentRank(p,'animal-assistant')||magicTalentRank(p,'magical-assistant')))select.append(new Option(p.name,p.id));select.value=context.magicAssistantId || '';select.addEventListener('change',()=>handlers.select({v5Context:{...context,magicAssistantId:select.value}}));label.append(select);section.append(label);
        for(const [key,text] of [['magicAssistantLinked','Familier lié, assistance possible'],['magicalNature','Recherche ou perception de nature magique'],['seesWinds','Seconde vue ou Vents autrement perceptibles']]){const label=node('label','workspace-type',text);const check=document.createElement('input');check.type='checkbox';check.checked=Boolean(context[key]);check.addEventListener('change',()=>handlers.select({v5Context:{...context,[key]:check.checked}}));label.append(check);section.append(label);}v5.append(section);
      }
      if(magicTalentRank(actor,'suffuse-with')){
        const label=node('label','workspace-type','Imprégné : remplacer la compétence par Focalisation');const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);select.append(new Option('Ne pas remplacer',''));
        for(const row of actor.talents || [])if(row.id==='talent-suffuse-with'&&row.status==='resolved'&&row.specialization)select.append(new Option(row.specialization,row.specialization));
        select.value=draft.v5Context?.magicSuffusedWind || '';select.addEventListener('change',()=>handlers.select({v5Context:{...draft.v5Context,magicSuffusedWind:select.value}}));label.append(select);v5.append(label);
      }
  const numberField = (key, label, value, minimum = null) => {
    const caption = node('label', 'workspace-type', label); const input = document.createElement('input');
    input.type = 'number'; input.step = '1'; if (minimum != null) { input.min = String(minimum); input.max = '100'; }
    input.value = value ?? ''; input.setAttribute('aria-label', label); input.dataset.focusKey = key;
    input.addEventListener('change', () => handlers.select({ [key]: input.value === '' ? null : Number(input.value) }));
    caption.appendChild(input); v5.appendChild(caption);
  };
  const kindLabel = node('label', 'workspace-type', 'Nature du Test'); const kind = document.createElement('select');
  for (const [value, label] of [['melee','Corps à corps'],['ranged','Tir'],['test','Autre Test']]) kind.appendChild(new Option(label,value));
  kind.value = draft.v5Kind || inferV5Kind({ ...action, type }, equipmentAttackContext(action.extensions?.equipment));
  kind.setAttribute('aria-label','Nature du Test'); kind.dataset.focusKey='v5-kind'; kind.addEventListener('change', () => handlers.select({ v5Kind: kind.value }));
  kindLabel.appendChild(kind); v5.appendChild(kindLabel);
  numberField('v5SlModifier', 'Modificateur V5 (DR)', draft.v5SlModifier ?? action.extensions?.v5?.slModifier ?? (action.mod ? null : 0));
  if (action.mod && draft.v5SlModifier == null && action.extensions?.v5?.slModifier == null) v5.appendChild(node('p','workspace-field-error',`Ancien modificateur de seuil ${signed(action.mod)} : saisissez les DR V5 retenus.`));
  numberField('v5Advantages','Sources supplémentaires d’Avantage',draft.v5Advantages || 0,0);
  numberField('v5Disadvantages','Sources de Désavantage',draft.v5Disadvantages || 0,0);
  // Attaque naturelle d'un Trait de créature (Langue, Souffle, Cornes…) : posée dans le contexte, lue par la résolution et le Store.
  const naturalTraits = type === 'attack' ? naturalCombatTraits(actor).filter(trait => trait.key !== 'v4-weapon') : [];
  if (naturalTraits.length) {
    const label = node('label','workspace-type','Attaque naturelle (Trait de créature)'), select = document.createElement('select');
    select.setAttribute('aria-label','Attaque naturelle'); select.append(new Option('Attaque ordinaire de l’action',''));
    for (const trait of naturalTraits) select.append(new Option(`${trait.name}${trait.detail ? ` (${trait.detail})` : ''}`, trait.key));
    select.value = draft.v5Context?.naturalAttack || '';
    select.addEventListener('change', () => handlers.select({ v5Context: { ...(draft.v5Context || {}), naturalAttack: select.value || undefined } }));
    label.append(select); v5.appendChild(label);
  }
  // Listes de Taille (rangs 0-6) : Battement, et toute attaque naturelle dont un effet dépend de la Taille (Attaque caudale, Piétinement, Langue).
  let sizesShown = false;
  const sizeSelects = () => {
    sizesShown = true;
    for (const [key, labelText] of [['actorSize','Taille de l’auteur'],['targetSize','Taille de la cible']]) {
      const label = node('label', 'workspace-type', labelText); const select = document.createElement('select');
      select.appendChild(new Option('À préciser', ''));
      for (const [value, text] of [[0,'Minuscule'],[1,'Très petite'],[2,'Petite'],[3,'Moyenne'],[4,'Grande'],[5,'Énorme'],[6,'Monstrueuse']])
        select.appendChild(new Option(text, String(value)));
      select.value = draft[key] == null ? '' : String(draft[key]); select.setAttribute('aria-label', labelText); select.dataset.focusKey = key;
      select.addEventListener('change', () => handlers.select({ [key]: select.value === '' ? null : Number(select.value) }));
      label.appendChild(select); v5.appendChild(label);
    }
  };
  if (type === 'attack' && naturalAttackNeedsSize(draft.v5Context?.naturalAttack)) sizeSelects();
  if (kind.value === 'melee' && type === 'attack') {
    const charge = node('label','workspace-type'); const check = document.createElement('input'); check.type='checkbox'; check.checked=draft.charging === true;
    check.addEventListener('change',()=>handlers.select({charging:check.checked})); charge.append(check,'Charge donnant Élan (distance et conditions vérifiées)'); v5.appendChild(charge);
  }
  const talentToggle = (key, text, checked) => {
    const label = node('label', 'workspace-type'); const check = document.createElement('input');
    check.type = 'checkbox'; check.checked = checked === true; check.setAttribute('aria-label', text);
    check.dataset.focusKey = key; check.addEventListener('change', () => handlers.select({ [key]: check.checked }));
    label.append(check, text); v5.appendChild(label);
  };
  talentToggle('fortuneReroll', 'Relancer ce Test avec 1 Point de Chance (Fortune)', draft.fortuneReroll);
  // Fortune généreuse (Ranald) : proposée seulement si l’acteur porte encore une faveur d’inversion.
  if ((actor?.extensions?.v5?.divineEffects || []).some(layer => layer?.reverseDice?.remaining > 0)) {
    talentToggle('reverseDice', 'Inverser les dés de ce Test (Fortune généreuse : 82 devient 28)', draft.reverseDice);
    if (draft.preview?.reverseDiceHint?.wouldSucceed === true && !draft.reverseDice) v5.appendChild(node('p', 'workspace-muted', `L’inversion (${String(draft.preview.reverseDiceHint.reversed).padStart(2, '0')}) réussirait ce Test.`));
  }
  if (draft.fortuneReroll) {
    numberField('fortuneRerollRoll', 'Nouveau jet de relance (Chance, d100)', draft.fortuneRerollRoll, 1);
  }
  if (type === 'attack') {
    if (draft.reactionId) {
      v5.appendChild(node('p', 'workspace-muted', 'Assaut féroce : nouvelle attaque avec la même arme contre le même adversaire. Coût : 1 Élan ; une fois par Round et un seul paiement d’attaque supplémentaire par Tour.'));
      const cancel = button('Quitter la préparation d’Assaut féroce', 'workspace-ghost');
      cancel.addEventListener('click', () => handlers.select({ reactionId: null, extraAttack: false })); v5.appendChild(cancel);
    } else talentToggle('extraAttack', 'Attaque supplémentaire : payer 1 Élan (une fois par Tour)', draft.extraAttack);
    if (kind.value === 'ranged' && hasV5Talent(actor, V5_TALENT_IDS.accurateShot))
      talentToggle('aimed', 'Visée effectuée : Tir précis donne +2 Dégâts', draft.aimed);
    if (kind.value === 'melee' && hasV5Talent(actor, V5_TALENT_IDS.beatBlade)) {
      talentToggle('beatBlade', 'Battement : remplacer toutes les Blessures et conséquences du critique', draft.beatBlade);
      if (draft.beatBlade) {
        if (!sizesShown) sizeSelects();
        v5.appendChild(node('p', 'workspace-muted', 'Jusqu’à la fin du prochain Tour de l’auteur : la cible ne peut opposer Corps à corps ; Esquive reste possible et les attaques de mêlée contre elle ont Avantage.'));
      }
    }
  }
  if (['attack','opposition'].includes(type) && target) {
    const label=node('label','workspace-type','Nature de la défense'); const select=document.createElement('select');
    select.append(new Option('Corps à corps','melee'),new Option('Esquive / autre Test','test'));
    select.value=draft.defenseKind || defense.option.v5?.kind || (defense.option.value === 'Ag' || /esquive|dodge/i.test(defense.option.statLabel) ? 'test' : 'melee'); select.dataset.focusKey='defense-kind'; select.setAttribute('aria-label','Nature de la défense');
    select.addEventListener('change',()=>handlers.select({defenseKind:select.value})); label.appendChild(select); v5.appendChild(label);
    numberField('defenseSlModifier','Modificateur V5 de défense (DR)',draft.defenseSlModifier ?? defense.option.v5?.slModifier ?? (defense.option.mod ? null : 0));
    numberField('defenseAdvantages','Avantages supplémentaires de défense',draft.defenseAdvantages || 0,0);
    numberField('defenseDisadvantages','Désavantages de défense',draft.defenseDisadvantages || 0,0);
  }
  const contextField = (container, role, key, label) => {
    const contextKey = role === 'actor' ? 'v5Context' : 'defenseContext';
    const current = draft[contextKey] || {};
    const caption = node('label', 'workspace-type', label); const select = document.createElement('select');
    select.setAttribute('aria-label', `${label}${role === 'defender' ? ' (défense)' : ''}`); select.dataset.focusKey = `${role}-${key}`;
    select.append(new Option('À préciser', ''), new Option('Oui', 'true'), new Option('Non', 'false'));
    select.value = typeof current[key] === 'boolean' ? String(current[key]) : '';
    select.addEventListener('change', () => handlers.select({ [contextKey]: { ...current, [key]: select.value === '' ? undefined : select.value === 'true' } }));
    caption.appendChild(select); container.appendChild(caption);
  };
  const conditionModeField = (container, role) => {
    const contextKey = role === 'actor' ? 'v5Context' : 'defenseContext'; const current = draft[contextKey] || {};
    const label = node('label', 'workspace-type', 'Pénalité retenue entre États mixtes'); const select = document.createElement('select');
    select.setAttribute('aria-label', `Pénalité retenue entre États mixtes${role === 'defender' ? ' (défense)' : ''}`); select.dataset.focusKey = `${role}-condition-penalty-mode`;
    select.append(new Option('À préciser si nécessaire', ''), new Option('Pénalité en DR', 'sl'), new Option('Désavantage', 'disadvantage'));
    select.value = current.conditionPenaltyMode || '';
    select.addEventListener('change', () => handlers.select({ [contextKey]: { ...current, conditionPenaltyMode: select.value || undefined } }));
    label.appendChild(select); container.appendChild(label);
  };
  const talentFields=node('div','workspace-v5-context');
  const addTalentContext=(role,subject,selectedAction)=>{
    const contextKey=role==='defender'?'defenseContext':'v5Context',current=draft[contextKey]||{};
    if(!(subject?.talents||[]).some(row=>V5_TEST_TALENT_IDS.includes(row.id)||V5_ACTIVATED_TALENTS[row.id]))return;
    const importedSkill=selectedAction?.extensions?.fiche?.skillId;
    const skillId=importedSkill||current.skillId;
    const label=node('label','workspace-type',role==='defender'?'Compétence de défense pour les talents':'Compétence de ce Test pour les talents');
    const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);select.dataset.focusKey=role+'-talent-skill';
    select.append(new Option('À préciser',''),new Option('Test de caractéristique (aucune compétence)','none'));
    for(const skill of getReferenceCatalogue().skills)select.append(new Option(skill.nom||skill.name||skill.id,skill.id));
    select.value=skillId||'';select.disabled=Boolean(importedSkill);
    select.addEventListener('change',()=>handlers.select({[contextKey]:{...current,skillId:select.value||undefined}}));label.append(select);talentFields.append(label);
    for(const descriptor of applicableV5TalentTestFields(subject,skillId)){
      if(descriptor.type==='boolean'){contextField(talentFields,role,descriptor.field,descriptor.label);continue;}
      const caption=node('label','workspace-type',descriptor.label);const choice=document.createElement('select');choice.setAttribute('aria-label',descriptor.label+(role==='defender'?' (défense)':''));choice.dataset.focusKey=role+'-'+descriptor.field;
      choice.append(new Option('À préciser',''));for(const option of descriptor.options||[])choice.append(new Option(option.label,String(option.value)));choice.value=current[descriptor.field]||'';
      choice.addEventListener('change',()=>handlers.select({[contextKey]:{...current,[descriptor.field]:choice.value||undefined}}));caption.append(choice);talentFields.append(caption);
    }
  };
  addTalentContext('actor',actor,action);
  if(['attack','opposition'].includes(type)&&target)addTalentContext('defender',target,defense?.option);
  if(['melee','ranged'].includes(kind.value)&&type==='attack'&&hasV5Talent(actor,'talent-strike-to-stun'))contextField(talentFields,'actor','weaponImprovised','Arme improvisée (Frappe assommante)');
  if(type==='attack'){
    contextField(talentFields,'actor','calledShot','Coup ciblé (−2 DR, hors modificateur saisi)');
    if(draft.v5Context?.calledShot){const label=node('label','workspace-type','Localisation du coup ciblé');const select=document.createElement('select');select.setAttribute('aria-label','Localisation du coup ciblé');select.append(new Option('À préciser',''));for(const [value,text] of [['head','Tête'],['body','Corps'],['leftArm','Bras gauche'],['rightArm','Bras droit'],['leftLeg','Jambe gauche'],['rightLeg','Jambe droite']])select.append(new Option(text,value));select.value=draft.v5Context?.calledShotLocation||'';select.addEventListener('change',()=>handlers.select({v5Context:{...(draft.v5Context||{}),calledShotLocation:select.value||undefined}}));label.append(select);talentFields.append(label);}
  }
  if(hasV5Talent(actor,'talent-strike-to-stun')){
    contextField(talentFields,'actor','silentTakedown','Test de neutralisation silencieuse (page 135)');
    if(draft.v5Context?.silentTakedown){contextField(talentFields,'actor','outsideCombat','Procédure hors combat');contextField(talentFields,'actor','targetUnaware','Cible ignorant le danger');talentFields.append(node('p','workspace-muted','Choisir Opposition et Corps à corps contre Résistance. Après le Test, arbitrer : victoire = BF Blessures et Inconscient ; défaite = cible Sonnée et alarme.'));
    }
  }
  if(talentFields.childNodes.length){talentFields.prepend(rubric('Contexte des talents'));v5.append(talentFields);}
  const contextual = node('details', 'workspace-v5-context-details'); contextual.appendChild(node('summary', '', 'Circonstances des Tests'));
  const fields = node('div', 'workspace-v5-context');
  for (const [key, label] of [['involvesMovement','Le Test implique un mouvement'],['runningOrHiding','Le Test sert à fuir ou se cacher'],['reliesOnSight','Le Test est réalisable sans voir mais repose sur la vue'],['requiresSight','Le Test est impossible sans voir'],['usesFellowship','Le Test utilise la Sociabilité']]) contextField(fields, 'actor', key, label);
  if(['skill','defense','opposition'].includes(type)&&isBrokenActor(actor)&&!draft.reactionId){
    if(action?.id?.startsWith('broken-hide:'))fields.appendChild(node('p','workspace-muted','Le Test consomme l’Action du Tour : Oui (Hide facultatif).'));
    else contextField(fields,'actor','isAction','Le Test consomme l’Action du Tour');
  }
  conditionModeField(fields, 'actor');
  contextField(fields,'actor','blackpowderBrokenTest','Calme contre un tir À Poudre noire');
  if(draft.v5Context?.blackpowderBrokenTest){const current=draft.v5Context,wrap=node('label','workspace-type','Auteur du tir À Poudre noire'),select=document.createElement('select');select.setAttribute('aria-label',wrap.textContent);select.append(new Option('Choisir',''));for(const shooter of participants.filter(p=>p.id!==actor.id))select.append(new Option(shooter.name,shooter.id));select.value=current.blackpowderShooterId||'';select.addEventListener('change',()=>handlers.select({v5Context:{...current,blackpowderShooterId:select.value||undefined}}));wrap.append(select);fields.append(wrap);}
  if (kind.value === 'ranged' && target) { contextField(fields, 'actor', 'rangedOppositionAllowed', 'Tir opposé : exception vérifiée par le MJ'); contextField(fields, 'actor', 'pointBlank', 'Tir à bout portant'); }
  if (type === 'attack' && target) contextField(fields, 'actor', 'targetHelpless', 'Cible sans défense : situation vérifiée par le MJ');
  if (['attack', 'opposition'].includes(type) && target) {
    fields.appendChild(rubric('Circonstances de la défense'));
    for (const [key, label] of [['involvesMovement','Le Test implique un mouvement'],['runningOrHiding','Le Test sert à fuir ou se cacher'],['reliesOnSight','Le Test est réalisable sans voir mais repose sur la vue'],['requiresSight','Le Test est impossible sans voir'],['usesFellowship','Le Test utilise la Sociabilité']]) contextField(fields, 'defender', key, label);
    conditionModeField(fields, 'defender');
  }
  contextual.appendChild(fields); v5.appendChild(contextual);
  if(type==='attack'&&target&&draft.charging&&hasV5Talent(target,'talent-slayer')&&!draft.beatBlade){for(const[key,text]of[['actorSize','Taille du chargeur'],['targetSize','Taille de la cible chargée']]){const label=node('label','workspace-type',text);const choice=document.createElement('select');choice.setAttribute('aria-label',text);choice.append(new Option('À préciser',''));['Minuscule','Très petite','Petite','Moyenne','Grande','Énorme','Monstrueuse'].forEach((name,index)=>choice.append(new Option(name,String(index))));choice.value=draft[key]==null?'':String(draft[key]);choice.addEventListener('change',()=>handlers.select({[key]:choice.value===''?null:Number(choice.value)}));label.append(choice);v5.append(label);}}
  if(type==='attack'&&target){const guards=participants.filter(p=>p.id!==actor.id&&p.id!==target.id&&p.camp===target.camp&&hasV5Talent(p,'talent-kingsguard'));for(const guard of guards){const label=node('label','workspace-type');const check=document.createElement('input');check.type='checkbox';check.checked=(draft.v5Context?.nearbyGuardIds||[]).includes(guard.id);check.setAttribute('aria-label','Garde royal à deux yards : '+guard.name);check.addEventListener('change',()=>{const ids=(draft.v5Context?.nearbyGuardIds||[]).filter(id=>id!==guard.id);if(check.checked)ids.push(guard.id);handlers.select({v5Context:{...draft.v5Context,nearbyGuardIds:ids}});});label.append(check,'Garde royal à deux yards : '+guard.name);v5.append(label);}}
  const current={...(action.extensions?.v5?.initialContext||{}),...(draft.v5Context||{})};
  if(['frightening','large-fear','stomp','large-disengage'].includes(current.talentAction)||['tongue','stomp'].includes(current.naturalAttack)||['disarm'].includes(current.specialAttack)||hasV5Talent(actor,'talent-large')||hasV5Talent(target,'talent-large')||hasV5Talent(actor,'talent-small')||hasV5Talent(target,'talent-small')||current.specialAttack==='whirlwind-of-death'&&participants.some(p=>(current.engagedIds||[]).includes(p.id)&&hasV5Talent(p,'talent-small'))){for(const[key,text]of[['actorSize','Taille de l’auteur'],['targetSize','Taille de la cible']]){const label=node('label','workspace-type',text),select=document.createElement('select');select.setAttribute('aria-label',text);select.append(new Option('À préciser',''));['Minuscule','Très petite','Petite','Moyenne','Grande','Énorme','Monstrueuse'].forEach((name,index)=>select.append(new Option(name,String(index))));select.value=draft[key]==null?'':String(draft[key]);select.addEventListener('change',()=>handlers.select({[key]:select.value===''?null:Number(select.value)}));label.append(select);v5.append(label);}}
  if(current.talentAction==='frenzy' && magicTalentRank(actor,'suffuse-with','Aqshy')){
    const label=node('label','workspace-type','Compétence du Test de Frénésie'),select=document.createElement('select');
    select.setAttribute('aria-label',label.textContent);select.append(new Option('Force Mentale','FM'),new Option('Focalisation (Aqshy)','Aqshy'));select.value=current.magicSuffusedWind==='Aqshy'?'Aqshy':'FM';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,magicSuffusedWind:select.value==='Aqshy'?'Aqshy':null}}));label.append(select);v5.append(label);
  }
  const activations=(actor.talents||[]).filter(t=>V5_ACTIVATED_TALENTS[t.id]);
  if(magicTalentRank(actor,'suffuse-with','Aqshy') && !activations.some(t=>t.id==='talent-frenzy'))activations.push({id:'talent-frenzy'});
  if(activations.length){const label=node('label','workspace-type','Activation de talent');const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);select.append(new Option('Aucune','none'));for(const row of activations)select.append(new Option(V5_ACTIVATED_TALENTS[row.id],row.id.slice(7)));if((actor.states||[]).some(s=>s.key==='frenzy'))select.append(new Option('Terminer la Frénésie','end-frenzy'));select.value=current.talentAction||'none';select.addEventListener('change',()=>handlers.select({v5Context:{...current,talentAction:select.value}}));label.append(select);v5.append(label);
    if(current.talentAction==='crew-commander'){
      contextField(v5,'actor','crewWithinVoice','Arme à équipage à portée de voix');const label=node('label','workspace-type','Compétence de tir du commandant');const input=document.createElement('input');input.type='number';input.min='0';input.max='200';input.value=current.crewRangedBase??'';input.setAttribute('aria-label',label.textContent);input.addEventListener('change',()=>handlers.select({v5Context:{...current,crewRangedBase:input.value===''?undefined:Number(input.value)}}));label.append(input);v5.append(label);
    }
    function talentNumber(key,label,min=0,max=10){const wrap=node('label','workspace-type',label),input=document.createElement('input');input.type='number';input.min=String(min);input.max=String(max);input.step='1';input.value=current[key]??'';input.setAttribute('aria-label',label);input.addEventListener('change',()=>handlers.select({v5Context:{...current,[key]:input.value===''?undefined:Number(input.value)}}));wrap.append(input);v5.append(wrap);}
    if(current.talentAction==='argumentative')contextField(v5,'actor','debateBegun','Débat effectivement engagé');
    if(current.talentAction==='blather'){
      contextField(v5,'actor','caughtInAct','Pris en faute');talentNumber('targetWillpowerBonus','BFM de la cible si absent de la fiche',0,20);const wrap=node('label','workspace-type','Unité de durée de conviction'),select=document.createElement('select');select.setAttribute('aria-label',wrap.textContent);select.append(new Option('Choisir',''),new Option('Tours','turn'),new Option('Minutes','minute'));select.value=current.convictionUnit||'';select.addEventListener('change',()=>handlers.select({v5Context:{...current,convictionUnit:select.value||undefined}}));wrap.append(select);v5.append(wrap);
    }
    if(current.talentAction==='martial-arts'){
      contextField(v5,'actor','beginningOfTurn','Début du combat ou de votre Tour');const wrap=node('label','workspace-type','Atout d’Arts martiaux connu'),select=document.createElement('select');select.setAttribute('aria-label',wrap.textContent);select.append(new Option('Choisir',''));for(const id of knownV5MartialQualities(actor))select.append(new Option(qualityLabel({id}),id));select.value=current.martialQuality||'';select.addEventListener('change',()=>handlers.select({v5Context:{...current,martialQuality:select.value||undefined}}));wrap.append(select);v5.append(wrap);if(select.options.length===1)v5.append(node('p','workspace-muted','Aucun Atout appris n’est renseigné dans la fiche importée.'));
    }
    if(current.talentAction==='combat-reflexes'){
      contextField(v5,'actor','beginningOfCombat','Début du combat');talentNumber('initiativeFirst','Premier d10 d’Initiative',1,10);talentNumber('initiativeSecond','Deuxième d10 d’Initiative',1,10);const wrap=node('label','workspace-type','Résultat d’Initiative choisi'),select=document.createElement('select');select.setAttribute('aria-label',wrap.textContent);select.append(new Option('Choisir',''),new Option('Premier d10','first'),new Option('Deuxième d10','second'));select.value=current.initiativeChoice||'';select.addEventListener('change',()=>handlers.select({v5Context:{...current,initiativeChoice:select.value||undefined}}));wrap.append(select);v5.append(wrap);
    }
    if(current.talentAction==='drilled')for(const ally of participants.filter(p=>p.id!==actor.id&&p.camp===actor.camp&&hasV5Talent(p,'talent-drilled'))){const label=node('label','workspace-type'),check=document.createElement('input');check.type='checkbox';check.checked=(current.shoulderAllyIds||[]).includes(ally.id);check.setAttribute('aria-label','Allié au coude-à-coude : '+ally.name);check.addEventListener('change',()=>handlers.select({v5Context:{...current,shoulderAllyIds:check.checked?[...new Set([...(current.shoulderAllyIds||[]),ally.id])]:(current.shoulderAllyIds||[]).filter(id=>id!==ally.id)}}));label.append(check,ally.name+' au coude-à-coude');v5.append(label);}
    if(current.talentAction==='end-frenzy')contextField(v5,'actor','nearbyEnemiesDefeated','Tous les ennemis proches sont vaincus');
    if(current.talentAction==='distract')contextField(v5,'actor','withinTwoYards','Cible à deux yards maximum');
  }
  if((actor.talents||[]).some(t=>['talent-strong-minded','talent-resistant'].includes(t.id))){
    const label=node('label','workspace-type','Talent à choisir avant le jet');const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);select.append(new Option('Aucun','none'));if(hasV5Talent(actor,'talent-strong-minded'))select.append(new Option('Obstiné : ignorer les modificateurs négatifs','strong-minded'));if(hasV5Talent(actor,'talent-resistant'))select.append(new Option('Résistance : réussite automatique','resistant'));select.value=current.preRollTalent||'none';select.addEventListener('change',()=>handlers.select({v5Context:{...current,preRollTalent:select.value}}));label.append(select);v5.append(label);
    const start=button('Commencer une nouvelle séance','workspace-ghost');start.addEventListener('click',()=>handlers.startTalentSession());v5.append(start);
  }
  if((actor.states||[]).some(s=>s.key==='frenzy')){const label=node('label','workspace-type','Ennemi le plus proche'),select=document.createElement('select');select.setAttribute('aria-label',label.textContent);select.append(new Option('Choisir',''));for(const p of participants.filter(p=>p.camp!==actor.camp&&Number(p.hp)>0))select.append(new Option(p.name,p.id));select.value=current.nearestEnemyId||'';select.addEventListener('change',()=>handlers.select({v5Context:{...current,nearestEnemyId:select.value||undefined}}));label.append(select);v5.append(label);}
  if((actor.states||[]).some(s=>s.key==='frenzy'))contextField(v5,'actor','mandatoryTest','Test obligatoire imposé par les règles pendant la Frénésie');
  if(type==='attack'&&(actor.states||[]).some(s=>s.key==='frenzy')){
    const label=node('label','workspace-type');const check=document.createElement('input');check.type='checkbox';check.checked=current.freeAttackTalent==='frenzy';check.setAttribute('aria-label','Attaque gratuite de Frénésie');check.addEventListener('change',()=>handlers.select({extraAttack:check.checked,v5Context:{...current,freeAttackTalent:check.checked?'frenzy':undefined}}));label.append(check,'Attaque gratuite de Frénésie (une par Round)');v5.append(label);
  }
  // Fureur d’Ulric : d10 de dégâts explosif (relancé et ajouté sur 10) du premier coup de mêlée touché du Tour, saisi en Frénésie.
  if(type==='attack'&&(actor.states||[]).some(s=>s.key==='frenzy')&&(actor.extensions?.v5?.divineEffects||[]).some(layer=>layer?.frenzyFury)){
    const label=node('label','workspace-type','Fureur d’Ulric : d10 de dégâts (ex. 10,4)');const input=document.createElement('input');input.type='text';input.value=(draft.v5Context?.ulricFuryDice||[]).join(',');input.setAttribute('aria-label',label.textContent);
    input.addEventListener('change',()=>{const text=input.value.trim();const dice=text===''?[]:text.split(',').map(part=>Number(part.trim())).filter(part=>Number.isInteger(part));handlers.select({v5Context:{...draft.v5Context,ulricFuryDice:text===''?undefined:dice}});});
    label.append(input);v5.append(label);
  }
  // Attaque rapide (Myrmidia) : attaque gratuite hors séquence, proposée seulement si l’acteur porte la couche freeAttack du miracle.
  if(type==='attack'&&(actor.extensions?.v5?.divineEffects||[]).some(layer=>layer?.freeAttack)){
    const quick=current.freeAttackTalent==='divine-free-attack';
    const label=node('label','workspace-type');const check=document.createElement('input');check.type='checkbox';check.checked=quick;check.setAttribute('aria-label','Attaque rapide (Myrmidia) : attaque gratuite hors séquence');check.addEventListener('change',()=>handlers.select({extraAttack:check.checked,v5Context:{...current,freeAttackTalent:check.checked?'divine-free-attack':undefined}}));label.append(check,'Attaque rapide (Myrmidia) : attaque gratuite hors séquence');v5.append(label);
    if(quick){
      const test=node('label','workspace-type','Test d’Initiative (+0 DR) de l’Attaque rapide');const select=document.createElement('select');select.setAttribute('aria-label','Test d’Initiative (+0 DR) de l’Attaque rapide');select.append(new Option('À saisir',''),new Option('Échec','fail'),new Option('Réussite','pass'));const saved=current.freeAttackTest;select.value=saved?(saved.success?'pass':'fail'):'';select.addEventListener('change',()=>handlers.select({v5Context:{...current,freeAttackTest:select.value===''?undefined:{success:select.value==='pass'}}}));test.append(select);v5.append(test);
      const hand=node('label','workspace-type');const handCheck=document.createElement('input');handCheck.type='checkbox';handCheck.checked=current.mainHand===true;handCheck.setAttribute('aria-label','Attaque rapide : arme de la main principale');handCheck.addEventListener('change',()=>handlers.select({v5Context:{...current,mainHand:handCheck.checked}}));hand.append(handCheck,'Attaque rapide : arme de la main principale');v5.append(hand);
    }
  }
  if(type==='skill'&&hasV5Talent(actor,'talent-robust')){
    contextField(v5,'actor','recoveryTest','Ce Test sert à récupérer des Blessures');
    if(current.recoveryTest){const wrap=node('label','workspace-type','Blessures normalement récupérées par ce Test'),input=document.createElement('input');input.type='number';input.min='0';input.step='1';input.value=current.recoveredWounds??'';input.setAttribute('aria-label',wrap.textContent);input.addEventListener('change',()=>handlers.select({v5Context:{...current,recoveredWounds:input.value===''?undefined:Number(input.value)}}));wrap.append(input);v5.append(wrap);
      const label=node('label','workspace-type','Robuste : récupérer 2 Blessures supplémentaires'),select=document.createElement('select');select.setAttribute('aria-label',label.textContent);select.append(new Option('Choisir',''),new Option('Oui','true'),new Option('Non','false'));const key='talent-robust:extra-healing';select.value=typeof draft.talentChoices?.[key]==='boolean'?String(draft.talentChoices[key]):'';select.addEventListener('change',()=>handlers.select({talentChoices:{...draft.talentChoices,[key]:select.value===''?undefined:select.value==='true'}}));label.append(select);v5.append(label);
    }
  }
  if(type==='attack'&&hasV5Talent(actor,'talent-dual-wielder')){
    contextField(v5,'actor','dualWielding','Combat avec deux armes');contextField(v5,'actor','weaponDagger','Arme utilisée : dague ou couteau (arbitrage MJ)');contextField(v5,'actor','secondWeaponAttack','Attaque avec la seconde arme');const label=node('label','workspace-type'),check=document.createElement('input');check.type='checkbox';check.checked=current.freeAttackTalent==='dual-wielder';check.setAttribute('aria-label','Attaque de seconde arme sans Élan');check.addEventListener('change',()=>handlers.select({extraAttack:check.checked,v5Context:{...current,freeAttackTalent:check.checked?'dual-wielder':undefined}}));label.append(check,'Attaque de seconde arme sans Élan');v5.append(label);
  }
  const penalties=node('details','workspace-v5-context-details');penalties.append(node('summary','','Pénalités de situation en DR'));
  const addPenaltyFields=(role)=>{const field=role==='actor'?'v5Context':'defenseContext',current=draft[field]||{};
    for(const [key,text]of [['offHand','Main secondaire'],['mounted','Esquive montée'],['confined','Espace exigu'],['status','Statut supérieur'],['proneAttack','Attaque À terre'],['belowTarget','Attaque sous la cible'],['cover','Couvert'],['targetProne','Tir sur une cible À terre'],['longRange','Longue portée'],['extremeRange','Portée extrême'],['flying','Tir sous Trait Vol'],['terrainMovement','Terrain gênant le mouvement'],['critical','Blessure critique'],['amputation','Amputation']]){
      const label=node('label','workspace-type',text+(role==='defender'?' (défense)':''));const input=document.createElement('input');input.type='number';input.step='1';input.max='0';input.value=current.penalties?.[key]??'';input.setAttribute('aria-label',label.textContent);input.addEventListener('change',()=>handlers.select({[field]:{...current,penalties:{...current.penalties,[key]:input.value===''?undefined:Number(input.value)}}}));label.append(input);penalties.append(label);
    }
  };addPenaltyFields('actor');if(target&&['attack','opposition'].includes(type))addPenaltyFields('defender');v5.append(penalties);
  if(type==='attack'&&(actor.talents||[]).some(t=>['talent-gunner','talent-short-fuse','talent-harpooner','talent-martial-arts'].includes(t.id))&&!action.extensions?.fiche?.equipmentId){
    const current=draft.v5Context||{};const label=node('label','workspace-type','Groupe de l’arme pour les talents');const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);select.append(new Option('À préciser',''));for(const value of ['Base','Bagarre','Arbalète','Poudre Noire','Ingénierie','Explosif','Explosifs'])select.append(new Option(value,value));select.value=current.weaponGroup||'';select.addEventListener('change',()=>handlers.select({v5Context:{...current,weaponGroup:select.value||undefined}}));label.append(select);v5.append(label);
    if(hasV5Talent(actor,'talent-martial-arts'))contextField(v5,'actor','weaponUnarmed','Attaque à mains nues');
  }
  for(const[subject,role]of[[actor,'actor'],[target,'defender']])if((subject?.states||[]).some(s=>s.key==='debate')){contextField(v5,role,'relatedToDebate','Ce Test concerne la dispute'+(role==='defender'?' (défense)':''));contextField(v5,role,'importantProblem','Un problème plus important interrompt la dispute'+(role==='defender'?' (défense)':''));}
  if(target&&['attack','opposition'].includes(type))contextField(v5,'defender','longerWeaponDefense','Arme plus longue en défense (+1 DR sauf Combattant au contact)');
  for(const[subject,role]of[[actor,'actor'],[target,'defender']])if(hasV5Talent(subject,'talent-resolute')){contextField(v5,role,'tryResolute','Déterminé : tenter Calme après un État'+(role==='defender'?' (défense)':''));const key=role==='actor'?'v5Context':'defenseContext',values=role==='actor'?current:draft.defenseContext||{};if(values.tryResolute){const label=node('label','workspace-type','Jet de Calme Déterminé'+(role==='defender'?' (défense)':'')),input=document.createElement('input');input.type='number';input.min='1';input.max='100';input.value=values.resoluteRoll??'';input.setAttribute('aria-label',label.textContent);input.addEventListener('change',()=>handlers.select({[key]:{...values,resoluteRoll:input.value===''?undefined:Number(input.value)}}));label.append(input);v5.append(label);}}
  if(target&&hasV5Talent(target,'talent-shieldsman')){const values=draft.defenseContext||{},label=node('label','workspace-type','Porte-bouclier en défense'),select=document.createElement('select');select.setAttribute('aria-label',label.textContent);select.append(new Option('Défense normale','none'),new Option('Repousser après opposition gagnée','shieldsman'));select.value=values.specialAttack||'none';select.addEventListener('change',()=>handlers.select({defenseContext:{...values,specialAttack:select.value}}));label.append(select);v5.append(label);if(values.specialAttack==='shieldsman'){contextField(v5,'defender','shieldAvailable','Bouclier tenu et disponible (défense)');const label=node('label','workspace-type','Recul en yards (défense)'),input=document.createElement('input');input.type='number';input.min='0';input.max='2';input.value=values.pushDistance??'';input.setAttribute('aria-label',label.textContent);input.addEventListener('change',()=>handlers.select({defenseContext:{...values,pushDistance:input.value===''?undefined:Number(input.value)}}));label.append(input);v5.append(label);}}
  if(target&&(hasV5Talent(actor,'talent-small')||hasV5Talent(target,'talent-small'))){const label=node('label','workspace-type','Actions de taille de Petit'),select=document.createElement('select');select.setAttribute('aria-label',label.textContent);select.append(new Option('Action ordinaire','none'),new Option('Peur / Terreur : créature plus grande agressive','small-psychology'),new Option('Quitter un adversaire plus petit','small-disengage'),new Option('Piétinement : 1 Élan','stomp'));select.value=['small-psychology','small-disengage','stomp'].includes(current.talentAction)?current.talentAction:'none';select.addEventListener('change',()=>handlers.select({type:select.value==='stomp'?'attack':select.value==='none'?type:'skill',v5Context:{...current,talentAction:select.value}}));label.append(select);v5.append(label);if(current.talentAction==='small-psychology')contextField(v5,'actor','aggressive','La créature plus grande est agressive');if(current.talentAction==='small-disengage')contextField(v5,'actor','bothEngaged','Engagés avec cet adversaire plus petit');}
  const situationFields=renderSituationFields({actor,target,participants,context:current,onContext:v5Context=>handlers.select({v5Context})});if(situationFields)v5.append(situationFields);
  // Arme qui frappe pour la défense (critique défensif, Riposte) : les Protections de l'attaquant peuvent en dépendre.
  if(target&&defense?.option&&type==='attack')for(const field of natureSelects(actor,()=>draft.defenseContext?.attackNature,next=>handlers.select({defenseContext:{...draft.defenseContext,attackNature:next}}),weaponAttackNature({actor:target,action:{...defense.option,type:'attack'},ranged:false})))v5.append(field);
  if(target&&['attack','opposition'].includes(type)){const support=renderSupportFields({actor:target,target:actor,participants,context:draft.defenseContext||{},prefix:'Défense — ',onContext:defenseContext=>handlers.select({defenseContext})});if(support)v5.append(support);}
  if(current.specialAttack==='whirlwind-of-death')for(const victim of participants.filter(p=>(current.engagedIds||[]).includes(p.id)&&p.id!==target?.id)){const support=renderSupportFields({actor,target:victim,participants,onlyProtection:true,showMetal:Boolean(current.forgeAuthorIds?.length),context:current.whirlwindSupport?.[victim.id]||{},prefix:victim.name+' — ',onContext:values=>handlers.select({v5Context:{...current,whirlwindSupport:{...current.whirlwindSupport,[victim.id]:values}}})});if(support)v5.append(support);}
  const measures=renderV5TalentMeasures(actor);if(measures)v5.append(measures);
  section.appendChild(v5);
    }
  const elapsed = ['cast','channelling','dispel'].includes(type) ? renderElapsedTime(participants, handlers) : null;
  if (elapsed) section.appendChild(elapsed);
  // Jets
  const rolls = node('div', 'workspace-resolution-rolls');
  // L'incantation et la dissipation se jouent sur Langue (Magick), pas sur l'Intelligence de l'action.
  const dispelSkill = ['cast', 'dispel'].includes(type) ? resolveCastingSkill(actor) : null;
  const attr = dispelSkill ? `${dispelSkill.skillName} ` : action.attr && action.attr !== 'Custom' ? `${action.attr} ` : '';
  const mod = Number(action.mod) || 0;
  const currentCtx = { ...(action.extensions?.v5?.initialContext || {}), ...(draft.v5Context || {}) };
  const noTestAction=type==='skill'&&noTestV5TalentAction(actor,currentCtx.talentAction,target);
  if(noTestAction)rolls.append(node('p','workspace-muted','Choix de talent sans jet.'));
  else rolls.appendChild(rollField({
    field: 'attack',
    label: `${ROLL_LABELS[type] || 'Jet'} (${attr}${dispelSkill ? dispelSkill.score : action.base ?? '—'})`,
    value: draft.attackRoll,
    error: draft.error?.field === 'attack' ? draft.error.message : '',
    handlers,
    disabled: draft.busy
  }));
  const kindVal = draft.v5Kind || inferV5Kind({ ...action, type }, equipmentAttackContext(action.extensions?.equipment));
  if (['attack', 'opposition'].includes(type) && target) {
    const defenseBlock = node('div', 'workspace-defense');
    const legend = node('p', 'workspace-roll-label');
    legend.append('Défense de ', node('span', 'combatant-name', target.name), kindVal === 'melee' ? ' (requise en mêlée)' : ' (selon les circonstances)');
    defenseBlock.appendChild(legend);
    const row = node('div', 'workspace-roll-row');
    const stat = document.createElement('select');
    stat.setAttribute('aria-label', `Défense de ${target.name} : caractéristique ou jet`);
    stat.dataset.focusKey = 'defense-stat';
    const groupOf = (label, group) => {
      const items = defense.options.filter(option => option.group === group);
      if (!items.length) return;
      const optgroup = document.createElement('optgroup');
      optgroup.label = label;
      items.forEach(option => optgroup.appendChild(new Option(option.label, option.value)));
      stat.appendChild(optgroup);
    };
    groupOf('Caractéristiques', 'caracs');
    groupOf('Compétences importées', 'skills');
    groupOf('Jets enregistrés', 'jets');
    defense.options.filter(option => option.group === 'autre').forEach(option => stat.appendChild(new Option(option.label, option.value)));
    stat.value = defense.value;
    stat.disabled = draft.busy;
    stat.addEventListener('change', () => handlers.select({ defenseStat: stat.value, defenseBase: null }));
    const base = document.createElement('input');
    base.type = 'number';
    base.className = 'workspace-defense-base';
    base.setAttribute('aria-label', `Valeur de défense de ${target.name}`);
    base.dataset.focusKey = 'defense-base';
    base.value = draft.defenseBase ?? '';
    base.disabled = draft.busy;
    base.addEventListener('input', () => handlers.input('defenseBase', base.value));
    row.append(stat, base);
    defenseBlock.appendChild(row);
    defenseBlock.appendChild(rollField({
      field: 'defense',
      label: `Jet de défense (${defense.option.value === 'Autre' ? 'valeur' : defense.option.statLabel} ${draft.defenseBase || '—'})`,
      value: draft.defenseRoll,
      error: draft.error?.field === 'defense' ? draft.error.message : '',
      handlers,
      disabled: draft.busy
    }));
    rolls.appendChild(defenseBlock);
  }
  section.append(rolls, node('p', 'workspace-roll-hint', 'Dés lancés à la table : tapez le résultat dans la case, puis Entrée.'));
  section.lastChild.id = 'workspace-roll-hint';

  const commands = node('div', 'workspace-inline-actions workspace-resolution-commands');
  const calculate = button('Calculer', 'workspace-secondary', { 'data-focus-key': 'calculate' });
  calculate.disabled = draft.busy || !canCalculate || action.extensions?.fiche?.requiresLink;
  if (!canCalculate) calculate.title = 'Action indisponible';
  calculate.addEventListener('click', () => handlers.calculate());
  commands.appendChild(calculate);
  // « Et si… » : mêmes jets sur chaque cible possible, sans rien appliquer.
  if (type === 'attack' && groups.adversaries.length + groups.allies.length > 1) {
    const compare = button('Comparer les cibles', 'workspace-secondary', { 'data-focus-key': 'compare' });
    compare.disabled = draft.busy || !canCalculate;
    compare.addEventListener('click', () => handlers.compare());
    commands.appendChild(compare);
  }
  section.appendChild(commands);

  const live = node('div', 'workspace-result-live');
  live.setAttribute('aria-live', 'polite');
  if (draft.error?.field === 'apply' || draft.error?.field === 'general') {
    const alert = node('p', 'workspace-field-error', draft.error.message);
    alert.setAttribute('role', 'alert');
    live.appendChild(alert);
  }
  if (draft.comparison) live.appendChild(renderComparison(draft.comparison, handlers, draft.busy));
  const preview = draft.preview;
  const earlyBlockedPreview = Boolean(preview && !preview.v5MagicKind && preview.ready === false
    && ['blocked','requires-input'].includes(preview.status) && !Array.isArray(preview.unresolved));
  if (earlyBlockedPreview) {
    const message = preview.error || (preview.needsInput || []).map(row => row.label || row.message).filter(Boolean).join(' ')
      || 'Résultat bloqué : vérifiez les faits et conditions requis avant de recalculer.';
    const alert = node('p', 'workspace-field-error', message);
    alert.setAttribute('role', 'alert');
    live.appendChild(alert);
    for (const need of preview.needsInput || []) {
      const detail = need.label || need.message;
      if (detail && detail !== message) live.appendChild(node('p', 'workspace-muted', detail));
    }
    const cancel = button('Annuler', 'workspace-ghost', { 'data-focus-key': 'cancel-preview', 'aria-label': 'Annuler le résultat calculé' });
    cancel.disabled = draft.busy;
    cancel.addEventListener('click', () => handlers.cancel());
    const commands = node('div', 'workspace-inline-actions workspace-resolution-commands');
    commands.appendChild(cancel);
    live.appendChild(commands);
  } else if (preview) {
    live.appendChild(renderResult(preview, target, draft, handlers));
    const apply = node('div', 'workspace-inline-actions workspace-resolution-commands');
    if (preview.v5MagicKind) {
      const magicLabel = preview.v5MagicKind === 'channelling'
        ? 'Appliquer la focalisation'
        : preview.v5MagicKind === 'dispel' ? 'Appliquer la dissipation'
        : ((preview.spellPreview?.dispelReaction ? preview.spellPreview.spellSuccess : preview.castPreview?.spellSuccess) ? 'Appliquer le sort' : preview.spellPreview?.dispelled ? 'Enregistrer la dissipation' : 'Enregistrer l’incantation ratée');
      const primary = button(magicLabel, 'workspace-primary', { 'data-focus-key': 'apply' });
      const spellNotReadyOrInvalid = preview.v5MagicKind === 'cast' && (
        preview.spellPreview?.fingerprintCheck?.valid === false ||
        preview.spellPreview?.valid === false ||
        (preview.castPreview?.spellSuccess && preview.spellPreview?.ready === false)
      );
      primary.disabled = draft.busy || !canApply || spellNotReadyOrInvalid || preview.ready === false;
      primary.addEventListener('click', () => handlers.apply());
      const cancel = button('Annuler', 'workspace-ghost', { 'data-focus-key': 'cancel-preview', 'aria-label': 'Annuler le résultat calculé' });
      cancel.disabled = draft.busy;
      cancel.addEventListener('click', () => handlers.cancel());
      apply.append(primary, cancel);
      live.appendChild(apply);
    } else {
      const needsTarget = preview.attack && !preview.targetId;
      const needsLocation = Boolean(preview.critical?.details?.needsLocation || preview.defenderCritical?.details?.needsLocation);
      const invalidCritical = Object.keys(draft.criticalErrors || {}).length > 0;
      const effects = preview.critical?.application;
      const manual = preview.weapon?.status === 'manual';
      const label = needsLocation && target ? (manual ? `Appliquer le critique à ${target.name}` : `Appliquer les dégâts à ${target.name}`)
        : preview.damage && target ? `Appliquer ${previewHpLoss(preview)} dégâts à ${target.name}`
          : target && effects && (effects.extraWounds || effects.states.length) ? `Appliquer le critique à ${target.name}`
            : manual ? 'Enregistrer sans dégâts' : 'Enregistrer le résultat';
      const primary = button(label, 'workspace-primary', { 'data-focus-key': 'apply' });
      primary.disabled = preview.choiceRequired || preview.unresolved?.length > 0 || preview.critical?.details?.pending || preview.critical?.second?.pending || preview.defenderCritical?.details?.pending || preview.defenderCritical?.details?.needsAlternative || draft.busy || !canApply || needsTarget || needsLocation || invalidCritical || preview.critical?.details?.needsAlternative || preview.critical?.second?.needsAlternative || Boolean(preview.protection?.manual?.length || preview.mechanicalWarnings?.length);
      if (needsTarget) primary.title = 'Choisissez une cible pour appliquer une attaque';
      else if (needsLocation) primary.title = 'Lancez d’abord la localisation du critique';
      else if (invalidCritical) primary.title = 'Corrigez le jet de critique';
      primary.addEventListener('click', () => handlers.apply());
      const cancel = button('Annuler', 'workspace-ghost', { 'data-focus-key': 'cancel-preview', 'aria-label': 'Annuler le résultat calculé' });
      cancel.disabled = draft.busy;
      cancel.addEventListener('click', () => handlers.cancel());
      apply.append(primary, cancel);
      if (needsTarget) apply.appendChild(node('span', 'workspace-muted', 'Choisissez une cible pour appliquer une attaque.'));
      live.appendChild(apply);
    }
  }
  section.appendChild(live);
  return section;
}
