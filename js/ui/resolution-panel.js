import { sequelaContextFields } from '../core/v5-sequela-effects.js';
import { isBrokenActor, renderBrokenEscapeVisibilityControl } from './v5-broken-escape-panel.js';
import {magicTalentRank} from '../core/v5-magic-talents.js';
import {natureSelects} from './v5-magic-controls.js';
import {wardDiceCount,reductionLayers,weaponAttackNature} from '../core/v5-magic-combat.js';
import {renderSituationFields,renderSupportFields} from './v5-talent-situations.js';
import { renderV5TalentMeasures } from './v5-talent-measures.js';
import { V5_ACTIVATED_TALENTS,knownV5MartialQualities,noTestV5TalentAction }  from '../core/v5-talent-actions.js';
import { computeV5WeaponReachGuide, computeV5WeaponRangeBands } from '../core/v5-talent-combat.js';
import { inferV5Kind, hasMomentum } from '../core/v5-combat-rules.js';
import { naturalCombatTraits, naturalAttackNeedsSize } from '../core/creature-combat.js';
import { psychologyTraits } from '../core/creature-psychology.js';
import { planBestiaryProfileAbilities } from '../core/creature-abilities.js';
import { creatureSizeOf } from '../core/creature-size.js';
import { carriesSense } from '../core/creature-senses.js';
import { carriesMovement } from '../core/creature-movement.js';
import { engagedCandidates, planOutnumbering } from '../core/outnumbering.js';
import { hasV5Talent, V5_TALENT_IDS } from '../core/v5-talents.js';
import { ammunitionCompatibility, equipmentAttackContext, weaponSkillGroupInfo, conjuredWeaponMetadata, weaponHandsForParticipant } from '../core/equipment.js';
import { isBlackpowderIncidentEligible } from '../core/v5-combat-fumbles.js';
import { previewV5Test } from '../core/v5-roll.js';
import { deriveHitMorphology, normalizeHitMorphology } from '../core/v5-hit-morphology.js';
/**
 * Résolution intégrée de Jouer (sans modale). Ce module ne fait que construire
 * le DOM à partir du brouillon tenu par workspace-view : toute saisie remonte
 * par `handlers`, et la vue reste propriétaire de l'état entre deux rendus.
 */
import { damageBreakdown, describeWeaponDamage, inferActionType, previewHpLoss } from '../core/resolution.js';
import { getReferenceCatalogue } from '../core/reference-catalog.js';
import { V5_TEST_TALENT_IDS, applicableV5TalentTestFields } from '../core/v5-talent-tests.js';
import { MASTER_AND_COMMANDER_TALENT } from '../core/v5-effects.js';
import { actionHasDamage } from '../core/damage.js';
import { qualityLabel } from '../core/quality-normalization.js';
import { resolveCastingSkill } from '../core/v5-magic-casting.js';
import { isDouble } from '../core/dice.js';

export const isCriticalFateRoll = value => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 100 && isDouble(Number(value));
export const hitMorphologySelection = (override, profileMorphology) => override !== undefined ? override : profileMorphology || '';

export const ACTION_TYPES = Object.freeze([
  ['attack', 'Attaque'],
  ['test', 'Test'],
  ['skill', 'Compétence'],
  ['defense', 'Défense / esquive'],
  ['opposition', 'Opposition'],
  ['channelling', 'Focalisation V5'],
  ['cast', 'Incantation V5'],
  ['dispel', 'Dissipation persistante V5']
]);
export { minusSigned, signed } from './resolution-panel/dom.js';
import { ROLL_LABELS, renderResult, renderComparison, renderDivineSocialFacts } from './resolution-panel/result.js';
import { node, button, chip, rubric, outcomePill, signed } from './resolution-panel/dom.js';
import { renderV5MagicContext } from './resolution-panel/magic.js';
import { rollField, renderElapsedTime } from './resolution-panel/critical.js';

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
    const skill=getReferenceCatalogue().skills.find(s=>s.nom===name);
    if(!skill||skills.some(s=>s.extensions?.fiche?.skillId===skill.id))return[];
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

export function renderResolutionPanel({ draft, actor, participants=[], actions, actionKey: selectedKey, type, target, groups, defense, previousWeaponAttacks=[], resolutionClock={}, canCalculate, canApply, canDeclareCombatAction=false, canDeclareCombatMovement=false, handlers }) {
  const fuseClock={currentRound:resolutionClock.currentRound??draft?.round,currentTurnIndex:resolutionClock.currentTurnIndex??draft?.v5Clock?.turnIndex};
  const section = node('section', 'workspace-resolution workspace-card');
  section.setAttribute('aria-labelledby', 'workspace-resolution-title');
  const title = node('h3', 'workspace-rubric', 'Résolution');
  title.id = 'workspace-resolution-title';
  section.appendChild(title);

  const brokenFacts=renderBrokenEscapeVisibilityControl({actor,value:draft.brokenEscapeVisibility,onChange:value=>handlers.select({brokenEscapeVisibility:value}),key:'resolution'});
  if(brokenFacts){
    section.appendChild(brokenFacts);
    section.appendChild(node('p','workspace-muted','Cette confirmation est transmise au moteur pour le Test ou la résolution; elle ne change pas seule l’état de Brisé.'));
  }

  if (!actor) {
    section.appendChild(node('p', 'workspace-muted', 'Aucun combattant en jeu : faites entrer un combattant pour résoudre une action.'));
    return section;
  }

  const dueBomb=(actor.extensions?.v5?.combatEffects||[]).find(row=>row.kind==='bomb-detonation');
  if(dueBomb){
    const box=node('div','workspace-v5-context'),heading=node('p','workspace-field-error','Bombe échue : explosion à résoudre même sans tir (L13-0117). Le MJ doit fournir les cibles et les dégâts, absents du texte L13 p. 104.');
    box.append(heading);
    const targetsLabel=node('label','workspace-type','Cibles touchées — choix du MJ'),targets=document.createElement('select');
    targets.multiple=true;
    targets.setAttribute('aria-label',targetsLabel.textContent);
    for(const p of participants.filter(row=>row.zone==='active'))targets.append(new Option(p.name||p.id,p.id));
    for(const option of targets.options)option.selected=(draft.v5Context?.designatedTargetIds||[]).includes(option.value);
    targets.addEventListener('change',()=>handlers.select({v5Context:{...(draft.v5Context||{}),designatedTargetIds:[...targets.selectedOptions].map(option=>option.value)}}));
    targetsLabel.append(targets);
    box.append(targetsLabel);
    const damageLabel=node('label','workspace-type','Dégâts de l’explosion confirmés par le MJ (profil absent)'),damage=document.createElement('input');
    damage.type='number';
    damage.min='0';
    damage.step='1';
    damage.value=draft.v5Context?.bombDamage??'';
    damage.setAttribute('aria-label',damageLabel.textContent);
    damage.addEventListener('input',()=>handlers.select({v5Context:{...(draft.v5Context||{}),bombDamage:damage.value===''?undefined:Number(damage.value)}}));
    damageLabel.append(damage);
    box.append(damageLabel);
    const resolve=button('Préparer la résolution de la détonation','workspace-secondary');
    resolve.addEventListener('click',()=>handlers.select({type:'skill',v5Context:{...(draft.v5Context||{}),bombDetonation:true,isAction:false}}));
    box.append(resolve);
    section.append(box);
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

    if (canDeclareCombatAction || canDeclareCombatMovement) {
      const combatActions = node('section', 'workspace-resolution-row');
      combatActions.appendChild(rubric('Actions du Tour'));
      combatActions.appendChild(node('p', 'workspace-muted', 'Mouvement narratif non observable automatiquement : indiquez-le quand il a lieu. La réorganisation des combattants ne constitue pas un déplacement.'));
      if (canDeclareCombatMovement) {
        const move = button('Déclarer un déplacement effectué', 'workspace-secondary', { 'data-focus-key': 'declare-movement' });
        move.disabled = draft.busy;
        move.addEventListener('click', () => handlers.declareCombatMovement());
        combatActions.appendChild(move);
      }
      if (canDeclareCombatAction && target && target.id !== actor.id) {
        const weapons=(actor.equipment||[]).filter(row=>row?.kind==='weapon');
        if(weapons.length){
          const label=node('label','workspace-type',`Arme de tir tenue pour viser ${target.name}`),select=document.createElement('select');
          select.setAttribute('aria-label',label.textContent);
          select.append(new Option('Choisir une arme équipée…',''));
          for(const weapon of weapons)select.append(new Option(`${weapon.name||weapon.id}${String(weapon.range||'').trim()?'':' · portée non renseignée'}`,weapon.id));
          select.value=draft.combatAimWeaponId||'';
          select.addEventListener('change',()=>handlers.select({combatAimWeaponId:select.value,combatAimWeaponHeldConfirmed:false,combatAimWeaponKindConfirmed:false}));
          label.append(select);
          combatActions.appendChild(label);
          const selectedWeapon=weapons.find(row=>row.id===draft.combatAimWeaponId);
          if(selectedWeapon&&!String(selectedWeapon.range||'').trim()){
            const kindLabel=node('label','workspace-type','Je confirme que cette arme équipée est une arme à distance');
            const ranged=document.createElement('input');
            ranged.type='checkbox';
            ranged.checked=draft.combatAimWeaponKindConfirmed===true;
            ranged.setAttribute('aria-label',kindLabel.textContent);
            ranged.addEventListener('change',()=>handlers.select({combatAimWeaponKindConfirmed:ranged.checked}));
            kindLabel.prepend(ranged);
            combatActions.appendChild(kindLabel);
          }
          const confirmLabel=node('label','workspace-type','Je confirme que cette arme est tenue en main');
          const confirm=document.createElement('input');
          confirm.type='checkbox';
          confirm.checked=draft.combatAimWeaponHeldConfirmed===true;
          confirm.disabled=!draft.combatAimWeaponId;
          confirm.setAttribute('aria-label',confirmLabel.textContent);
          confirm.addEventListener('change',()=>handlers.select({combatAimWeaponHeldConfirmed:confirm.checked}));
          confirmLabel.prepend(confirm);
          combatActions.appendChild(confirmLabel);
          const aim = button(`Viser ${target.name}`, 'workspace-secondary', { 'data-focus-key': 'declare-aim' });
          aim.disabled = draft.busy || !draft.combatAimWeaponId || draft.combatAimWeaponHeldConfirmed!==true || Boolean(selectedWeapon&&!String(selectedWeapon.range||'').trim()&&draft.combatAimWeaponKindConfirmed!==true);
          aim.addEventListener('click', () => handlers.declareCombatAction('aim', { targetId: target.id, weaponId:draft.combatAimWeaponId, rangedWeaponConfirmed: Boolean(selectedWeapon&&!String(selectedWeapon.range||'').trim()), rangedWeaponHeldConfirmed:draft.combatAimWeaponHeldConfirmed===true }));
          combatActions.appendChild(aim);
        } else {
          const nameLabel=node('label','workspace-type','Nom de l’arme de tir utilisée pour viser '+target.name),nameInput=document.createElement('input');
          nameInput.type='text';
          nameInput.value=draft.combatAimWeaponName||'';
          nameInput.setAttribute('aria-label',nameLabel.textContent);
          nameInput.addEventListener('change',()=>handlers.select({combatAimWeaponName:nameInput.value.trim()}));
          nameLabel.appendChild(nameInput);
          combatActions.appendChild(nameLabel);
          const natureLabel=node('label','workspace-type','Je confirme que cette attaque utilise une arme à distance');
          const nature=document.createElement('input');
          nature.type='checkbox';
          nature.checked=draft.combatAimWeaponKindConfirmed===true;
          nature.setAttribute('aria-label',natureLabel.textContent);
          nature.addEventListener('change',()=>handlers.select({combatAimWeaponKindConfirmed:nature.checked}));
          natureLabel.prepend(nature);
          combatActions.appendChild(natureLabel);
          const heldLabel=node('label','workspace-type','Je confirme que l’arme est tenue en main');
          const held=document.createElement('input');
          held.type='checkbox';
          held.checked=draft.combatAimWeaponHeldConfirmed===true;
          held.setAttribute('aria-label',heldLabel.textContent);
          held.addEventListener('change',()=>handlers.select({combatAimWeaponHeldConfirmed:held.checked}));
          heldLabel.prepend(held);
          combatActions.appendChild(heldLabel);
          const aim=button(`Viser ${target.name}`,'workspace-secondary',{'data-focus-key':'declare-aim'});
          aim.disabled=draft.busy||!draft.combatAimWeaponName||draft.combatAimWeaponKindConfirmed!==true||draft.combatAimWeaponHeldConfirmed!==true;
          aim.addEventListener('click',()=>handlers.declareCombatAction('aim',{targetId:target.id,weaponName:draft.combatAimWeaponName,rangedWeaponConfirmed:true,rangedWeaponHeldConfirmed:true}));
          combatActions.appendChild(aim);
        }
      }
      const tripPrimaries=previousWeaponAttacks.filter(row=>row.targetId===target?.id&&row.hit===true&&row.actionType==='attack');
      const athletics=(target?.skills||[]).filter(row=>row.status==='resolved'&&row.id&&/athlet/i.test(String(row.name||row.nom||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''))&&Number.isFinite(Number(row.total??row.value)));
      if(target&&tripPrimaries.length){
        combatActions.appendChild(rubric('Croche-pied · après une touche appliquée sur '+target.name));
        const primaryLabel=node('label','workspace-type','Attaque réussie déjà appliquée ce Tour'),primarySelect=document.createElement('select');
        primarySelect.setAttribute('aria-label',primaryLabel.textContent);
        primarySelect.append(new Option('Choisir la touche…',''));
        for(const row of tripPrimaries)primarySelect.append(new Option(`${row.weaponName} · ${target.name}`+(row.hit?' · touche':''),row.actionId));
        primarySelect.value=draft.v5Context?.tripPrimaryResolutionId||'';
        primarySelect.addEventListener('change',()=>handlers.select({v5Context:{...(draft.v5Context||{}),tripPrimaryResolutionId:primarySelect.value||undefined}}));
        primaryLabel.append(primarySelect);
        combatActions.appendChild(primaryLabel);
        if(athletics.length){
          const skillLabel=node('label','workspace-type',`Athlétisme de ${target.name}`),skillSelect=document.createElement('select');
          skillSelect.setAttribute('aria-label',skillLabel.textContent);
          skillSelect.append(new Option('Choisir la compétence…',''));
          for(const skill of athletics)skillSelect.append(new Option(`${skill.name||skill.nom} · ${skill.total??skill.value}`,skill.id));
          skillSelect.value=draft.v5Context?.athleticsSkillId||'';
          skillSelect.addEventListener('change',()=>handlers.select({v5Context:{...(draft.v5Context||{}),athleticsSkillId:skillSelect.value||undefined}}));
          skillLabel.append(skillSelect);
          combatActions.appendChild(skillLabel);
          const prepare=button('Préparer le Croche-pied','workspace-secondary',{'data-focus-key':'prepare-trip'});
          prepare.disabled=draft.busy||!draft.v5Context?.tripPrimaryResolutionId||!draft.v5Context?.athleticsSkillId;
          prepare.addEventListener('click',()=>handlers.select({v5Context:{...(draft.v5Context||{}),trip:true},v5Kind:'test'}));
          combatActions.appendChild(prepare);
          if(draft.v5Context?.trip===true){
            combatActions.appendChild(node('p','workspace-muted',`Opposition Force de ${actor.name} contre Athlétisme de ${target.name}. Entrez les deux d100 ci-dessous; l’Élan sera débité une fois, quelle que soit l’issue. Seule une victoire de l’attaquant fait tomber ${target.name}.`));
            if(target.extensions?.v5?.mounted===true){
              combatActions.appendChild(node('p','workspace-muted','Cible montée : chute verticale de 2 m, démontage et À Terre après victoire de l’attaquant. Les champs conditionnels restent vides tant que leurs dés réels ne sont pas lancés.'));
              const fallFields=[['tripFallWardRoll',`Protection de chute de ${target.name} (d10, si requise)`,1,10],['tripFallEnduranceRoll',`Test d’Endurance de ${target.name} (d100, si perte après protection > BE)`,1,100],['tripLegLocationRoll','Localisation d100 (doit donner Jambe)',1,100],['tripLegCriticalEffectRoll','Effet d100 du critique à la Jambe',1,100],['tripExtraLocationRoll','Localisation d100 du critique supplémentaire (échec extraordinaire)',1,100],['tripExtraCriticalEffectRoll','Effet d100 du critique supplémentaire (échec extraordinaire)',1,100]];
              for(const[key,text,min,max]of fallFields){
                const label=node('label','workspace-type',text),input=document.createElement('input');
                input.type='number';
                input.min=String(min);
                input.max=String(max);
                input.value=draft.v5Context?.[key]??'';
                input.setAttribute('aria-label',text);
                input.addEventListener('change',()=>handlers.select({v5Context:{...(draft.v5Context||{}),[key]:input.value===''?null:Number(input.value)}}));
                label.append(input);
                combatActions.appendChild(label);
              }
              const calmLabel=node('label','workspace-type',`Test de Calme de ${target.name} contre la protection de chute (si requis)`),calmSelect=document.createElement('select');
              calmSelect.setAttribute('aria-label',calmLabel.textContent);
              calmSelect.append(new Option('À préciser si requis',''),new Option('Échec','fail'),new Option('Réussite','success'));
              calmSelect.value=draft.v5Context?.tripFallCalmTest?.success===true?'success':draft.v5Context?.tripFallCalmTest?.success===false?'fail':'';
              const calmSl=document.createElement('input');
              calmSl.type='number';
              calmSl.min='0';
              calmSl.max='20';
              calmSl.value=draft.v5Context?.tripFallCalmTest?.sl??'';
              calmSl.setAttribute('aria-label',`DR du Test de Calme de ${target.name}`);
              const saveCalm=()=>handlers.select({v5Context:{...(draft.v5Context||{}),tripFallCalmTest:calmSelect.value?{success:calmSelect.value==='success',sl:Number(calmSl.value)||0}:null}});
              calmSelect.addEventListener('change',saveCalm);
              calmSl.addEventListener('change',saveCalm);
              calmLabel.append(calmSelect,calmSl);
              combatActions.appendChild(calmLabel);
            }
          }
        }else combatActions.appendChild(node('p','workspace-field-error',`Croche-pied indisponible : ${target.name} doit avoir une compétence Athlétisme résolue.`));
      }
      const skills = canDeclareCombatAction ? (actor.skills || []).filter(row => row.status === 'resolved' && row.id && Number.isFinite(Number(row.total))) : [];
      if (skills.length) {
        const label = node('label', 'workspace-type', 'Compétence choisie pour l’Action défensive');
        const select = document.createElement('select');
        select.setAttribute('aria-label', label.textContent);
        select.append(new Option('Choisir une compétence…', ''));
        for (const skill of skills) select.append(new Option(`${skill.name || skill.nom || skill.id} · ${skill.total}`, skill.id));
        select.value = draft.combatDefensiveSkillId || '';
        select.addEventListener('change', () => handlers.select({ combatDefensiveSkillId: select.value }));
        label.appendChild(select);
        combatActions.appendChild(label);
        const defend = button('Déclarer l’Action défensive', 'workspace-secondary', { 'data-focus-key': 'declare-defensive' });
        defend.disabled = draft.busy || !draft.combatDefensiveSkillId;
        defend.addEventListener('click', () => handlers.declareCombatAction('defensive', { skillId: draft.combatDefensiveSkillId }));
        combatActions.appendChild(defend);
      } else if (canDeclareCombatAction) combatActions.appendChild(node('p', 'workspace-muted', 'Aucune compétence résolue disponible pour l’Action défensive.'));
      section.appendChild(combatActions);
    }

    if(action.extensions?.fiche?.requiresLink) section.appendChild(node('p','workspace-field-error','Compétence à choisir dans « Mettre à jour les PJ » avant de lancer cette action.'));
    const conjured=conjuredWeaponMetadata(actor,action);
    const materialized=Boolean(conjured?.key||conjured?.profile||conjured?.spellContract?.effects?.conjureWeapon===true||conjured?.materialized===true&&/aethyrique/i.test(String(action.note||action.name||'')));
    const conjuredProfile=conjured?.profile||action.extensions?.v5?.conjuredWeaponProfile;
    const conjuredGroup=conjured?.group;
    const weapon = action.extensions?.equipment || actor?.equipment?.find(row => row?.id === action.extensions?.fiche?.equipmentId)
      ||(materialized?{id:`conjured:${action.extensions?.v5?.conjuredWeaponKey||action.id}`,kind:'weapon',name:conjuredProfile?.name||action.note||'Arme conjurée',category:conjuredGroup||'',hands:conjuredProfile?.hands||action.extensions?.v5?.weaponHands,range:'',keywords:(action.qualities||[]).map(row=>typeof row==='string'?{id:row}:row)}:null);
    if(type==='attack'&&weapon?.kind==='weapon'&&!conjured?.spellScoreImposed){
      const current=draft.v5Context||{};
      const groups=['Base','Bagarre','Escrime','Fléau','Cavalerie','Deux-Mains',"Arme d'Hast",'Armes d’Hast','Parade','Arc','Arbalète','Fronde','Lancer','Poudre Noire','Ingénierie mêlée','Ingénierie tir','Explosif','Explosifs','Sarbacane','Siège','Embarquée','Entraves'];
      if(!weaponSkillGroupInfo(weapon.category,weapon)){
        const label=node('label','workspace-type','Groupe d’arme à confirmer par le MJ'),select=document.createElement('select');
        select.setAttribute('aria-label',label.textContent);
        select.append(new Option('Choisir un groupe',''));
        groups.forEach(value=>select.append(new Option(value,value)));
        select.value=current.weaponTrainingGroup||'';
        select.addEventListener('change',()=>handlers.select({v5Context:{...current,weaponTrainingGroup:select.value||undefined},...(select.value==='Ingénierie tir'?{v5Kind:'ranged'}:select.value==='Ingénierie mêlée'?{v5Kind:'melee'}:{})}));
        label.append(select);
        section.append(label);
      }
      const effectiveGroup=current.weaponTrainingGroup||weapon.category;
      const isCavalry=/^cavalerie$/i.test(String(effectiveGroup||''));
      const foldedWeaponName=String(weapon.name||action.note||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
      const isBastard=/epee batarde/.test(foldedWeaponName);
      const isSabre=/sabre/.test(foldedWeaponName);
      const isCavalryHammer=/marteau de cavalerie/.test(foldedWeaponName);
      if(isCavalry) section.append(node('p','workspace-muted',`État du participant : ${actor?.extensions?.v5?.mounted===true?'monté':'démonté'} · modifiable dans « Modifier ${actor?.name||'le participant'} »`));
      if(isBastard){
        const stored=actor?.extensions?.v5?.weaponHandsByEquipmentId?.[weapon.id];
        const hands=stored===1||stored===2?stored:/\(\s*2\s*M\s*\)/i.test(weapon.name||'')?2:Number(weapon.hands)||1;
        section.append(node('p','workspace-muted',`Épée bâtarde : ${hands} main${hands>1?'s':''} · réglage durable dans « Modifier ${actor?.name||'le participant'} »`));
      }
      const skills=actor?.skills||actor?.ficheSnapshot?.skills||[];
      const selectedSkill=current.weaponSkillId||action.extensions?.fiche?.skillId||'';
      const genericRanged=['siege','embarquee'].includes(String(weapon.category||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
      if(genericRanged){
        const references=getReferenceCatalogue().skills.filter(row=>row.group==='Projectiles'&&row.specialization);
        const powderOnly=(weapon.keywords||[]).some(row=>(typeof row==='string'?row:row?.id)==='a-poudre-noire');
        const selectableReferences=powderOnly?references.filter(row=>['poudre noire','ingenierie'].includes(String(row.specialization).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())):references;
        const linked=skills.find(row=>row.id===selectedSkill||row.name===selectedSkill||row.storageKey===selectedSkill);
        const currentReference=selectableReferences.find(row=>row.specialization===current.weaponTrainingSpecialty||row.id===linked?.id);
        const label=node('label','workspace-type','Spécialité de tir pour cette arme (choix MJ si le catalogue ne la précise pas)'),select=document.createElement('select');
        select.setAttribute('aria-label',label.textContent);
        select.append(new Option('Choisir une spécialité de tir',''));
        for(const ref of selectableReferences){
          const owned=skills.find(row=>row.id===ref.id||row.name===ref.nom);
          select.append(new Option(`${ref.nom}${owned?` · ${owned.advances??'augmentations inconnues'} augmentation(s)`:' · choix explicite MJ'}`,owned?`skill:${owned.id}`:`manual:${ref.specialization}`));
        }
        select.value=linked?`skill:${linked.id}`:currentReference?`manual:${currentReference.specialization}`:'';
        select.addEventListener('change',()=>{
          if(select.value.startsWith('skill:')){
            const row=skills.find(skill=>skill.id===select.value.slice(6));
            const reference=references.find(ref=>ref.id===row?.id);
            handlers.select({v5Context:{...current,weaponSkillId:row?.id,weaponTrainingSpecialty:reference?.specialization,weaponAdvances:undefined,weaponSkillScore:undefined}});
          }
          else if(select.value.startsWith('manual:'))handlers.select({v5Context:{...current,weaponSkillId:undefined,weaponTrainingSpecialty:select.value.slice(7),weaponAdvances:undefined,weaponSkillScore:undefined}});
          else handlers.select({v5Context:{...current,weaponSkillId:undefined,weaponTrainingSpecialty:undefined,weaponAdvances:undefined,weaponSkillScore:undefined}});
        });
        label.append(select);
        section.append(label);
      }
      if(skills.length&&!genericRanged){
        const label=node('label','workspace-type','Compétence utilisée pour cette arme'),select=document.createElement('select');
        select.setAttribute('aria-label',label.textContent);
        select.append(new Option('Spécialité du groupe',''));
        skills.forEach(skill=>{
          if(!skill?.id||!skill.name)return;
          const advances=skill.advances==null?'augmentations inconnues':`${skill.advances} augmentation(s)`;
          select.append(new Option(`${skill.name} · ${advances}`,skill.id));
        });
        select.value=selectedSkill;
        select.addEventListener('change',()=>handlers.select({v5Context:{...current,weaponSkillId:select.value||undefined}}));
        label.append(select);
        section.append(label);
      }
      const selected=skills.find(skill=>skill.id===selectedSkill);
      const missingTrainingFacts=!skills.length||actor?.ficheSnapshot?.coverage?.skills!=='present'&&!actor?.ficheSkillsComplete||Boolean(selected&&(selected.advances==null||selected.total==null));
      const genericTrainingMissing=genericRanged&&(!selected||selected.advances==null||selected.total==null);
      if(missingTrainingFacts||genericTrainingMissing||isCavalry||isBastard||action.extensions?.fiche?.requiresLink||materialized&&!weaponSkillGroupInfo(weapon.category,weapon)||!weaponSkillGroupInfo(weapon.category,weapon)){
        const hasActionScore=action.base!==null&&action.base!==undefined&&action.base!==''&&Number.isSafeInteger(Number(action.base))&&(!genericRanged||!selectedSkill||selectedSkill===action.extensions?.fiche?.skillId);
        const advances=node('label','workspace-type','Augmentations de la spécialité (MJ, si la fiche ne les fournit pas)'),advanceInput=document.createElement('input');
        advanceInput.type='number';
        advanceInput.min='0';
        advanceInput.step='1';
        advanceInput.value=current.weaponAdvances??'';
        advanceInput.setAttribute('aria-label',advances.textContent);
        advanceInput.addEventListener('change',()=>handlers.select({v5Context:{...current,weaponAdvances:advanceInput.value===''?undefined:Number(advanceInput.value),weaponSkillScore:current.weaponSkillScore??(hasActionScore?Number(action.base):undefined)}}));
        advances.append(advanceInput);
        section.append(advances);
        const score=node('label','workspace-type','Score de compétence (prérempli depuis l’action, à confirmer par le MJ)'),scoreInput=document.createElement('input');
        scoreInput.type='number';
        scoreInput.min='0';
        scoreInput.value=current.weaponSkillScore??(hasActionScore?Number(action.base):'');
        scoreInput.setAttribute('aria-label',score.textContent);
        scoreInput.addEventListener('change',()=>handlers.select({v5Context:{...current,weaponSkillScore:scoreInput.value===''?undefined:Number(scoreInput.value)}}));
        score.append(scoreInput);
        section.append(score);
      }
    }
    if(type!=='attack'){
      const skillId=action.extensions?.fiche?.skillId||draft.v5Context?.skillId;
      const referenceSkill=getReferenceCatalogue().skills.find(row=>row.id===skillId);
      const fichaSkill=(actor?.skills||actor?.ficheSnapshot?.skills||[]).find(row=>row.id===skillId);
      if(referenceSkill?.basic===false&&(!fichaSkill||fichaSkill.advances==null)){
        const current=draft.v5Context||{},label=node('label','workspace-type','Augmentations de cette compétence avancée (MJ, si la fiche ne les fournit pas)'),input=document.createElement('input');
        input.type='number';
        input.min='0';
        input.step='1';
        input.value=current.advancedSkillAdvances??'';
        input.setAttribute('aria-label',label.textContent);
        input.addEventListener('change',()=>handlers.select({v5Context:{...current,advancedSkillAdvances:input.value===''?undefined:Number(input.value)}}));
        label.append(input);
        section.append(label);
      }
    }
    if (['channelling', 'cast', 'dispel'].includes(type)) {
      section.appendChild(renderV5MagicContext({ actor, participants, target, type, draft, handlers }));
    } else {
      if(type === 'attack') {
        const ammo=action.extensions?.equipment?.range ? (actor.equipment||[]).filter(row=>row.kind==='ammunition' && ammunitionCompatibility(action.extensions.equipment,row).status !== 'incompatible') : [];
        if(ammo.length) {
          const label=node('label','workspace-type','Munition');
          const select=document.createElement('select');
          select.setAttribute('aria-label','Munition');
          select.append(new Option('Aucune munition ajoutée',''));
          ammo.forEach(row=>select.append(new Option(row.name,row.id)));
          select.value=draft.ammunitionId||'';
          select.addEventListener('change',()=>handlers.select({ammunitionId:select.value,ammunitionArbitrated:false}));
          label.append(select);
          section.append(label);
        }
        const selectedAmmo = ammo.find(row=>row.id===draft.ammunitionId);
        if(selectedAmmo && ammunitionCompatibility(action.extensions.equipment,selectedAmmo).status==='manual') {
          const label=node('label','workspace-type');
          const checkbox=document.createElement('input');
          checkbox.type='checkbox';
          checkbox.checked=draft.ammunitionArbitrated===true;
          checkbox.addEventListener('change',()=>handlers.select({ammunitionArbitrated:checkbox.checked}));
          label.append(checkbox,'Compatibilité de cette munition vérifiée par le MJ');
          section.append(label);
        }
        if(target) {
          const context=draft.protectionContext||{};
          const block=node('details','workspace-defense');
          block.append(node('summary','','Protection et bouclier pour cette attaque'));
          const shields=(target.equipment||[]).filter(row=>row.kind==='shield'&&target?.extensions?.v5?.paviseDeploymentByItemId?.[row.id]?.status!=='planted');
          if(shields.length){
            const label=node('label','workspace-type','Bouclier');
            const select=document.createElement('select');
            select.setAttribute('aria-label','Bouclier utilisé');
            select.append(new Option('Aucun',''));
            shields.forEach(row=>select.append(new Option(row.name,row.id)));
            select.value=context.shieldId||'';
            select.addEventListener('change',()=>handlers.select({protectionContext:{...context,shieldId:select.value}}));
            label.append(select);
            block.append(label);
          }
          if(context.shieldId){
            const attachedLabel=node('label','workspace-type','Bouclier attaché au bras ou en bandoulière');
            const attached=document.createElement('input');
            attached.type='checkbox';
            attached.checked=context.shieldAttached===true;
            attached.setAttribute('aria-label',attachedLabel.textContent);
            attached.addEventListener('change',()=>handlers.select({protectionContext:{...context,shieldAttached:attached.checked,nonDominantArmSide:attached.checked?context.nonDominantArmSide:undefined}}));
            attachedLabel.append(attached);
            block.append(attachedLabel);
            if(attached.checked){
              const sideLabel=node('label','workspace-type','Bras non directeur');
              const side=document.createElement('select');
              side.setAttribute('aria-label','Bras non directeur');
              side.append(new Option('À préciser',''),new Option('Gauche','left'),new Option('Droit','right'));
              side.value=context.nonDominantArmSide||'';
              side.addEventListener('change',()=>handlers.select({protectionContext:{...context,nonDominantArmSide:side.value||undefined}}));
              sideLabel.append(side);
              block.append(sideLabel);
            }
          }
          const pavises=(target?.equipment||[]).filter(item=>item.kind==='shield'&&/pavise|pavois/i.test(item.name||item.id||'')&&target?.extensions?.v5?.paviseDeploymentByItemId?.[item.id]?.status==='planted');
          if(pavises.length){
            const pavise=node('div','workspace-type');
            const itemLabel=node('label','workspace-type','Pavois planté utilisé');
            const itemChoice=document.createElement('select');
            itemChoice.setAttribute('aria-label',itemLabel.textContent);
            itemChoice.append(new Option('Aucun',''));
            for(const item of pavises)itemChoice.append(new Option(item.name||item.id,item.id));
            itemChoice.value=context.paviseId||'';
            itemChoice.addEventListener('change',()=>handlers.select({protectionContext:{...context,paviseId:itemChoice.value||undefined}}));
            itemLabel.append(itemChoice);
            pavise.append(itemLabel);
            for(const [key,labelText] of [['attackDirection','Direction d’arrivée de l’attaque']]){
              const label=node('label','workspace-type',labelText);
              const choice=document.createElement('select');
              choice.setAttribute('aria-label',labelText);
              choice.append(new Option('À préciser',''));
              for(const [value,text] of [['north','Nord'],['south','Sud'],['east','Est'],['west','Ouest']])choice.append(new Option(text,value));
              choice.value=context[key]||'';
              choice.addEventListener('change',()=>handlers.select({protectionContext:{...context,[key]:choice.value||undefined}}));
              label.append(choice);
              pavise.append(label);
            }
            const distance=node('label','workspace-type','Distance derrière le pavois (mètres)');
            const yards=document.createElement('input');
            yards.type='number';
            yards.min='0';
            yards.max='1';
            yards.step='0.1';
            yards.value=context.paviseDistanceYards??'';
            yards.setAttribute('aria-label',distance.textContent);
            yards.addEventListener('change',()=>handlers.select({protectionContext:{...context,paviseDistanceYards:yards.value===''?undefined:Number(yards.value)}}));
            distance.append(yards);
            pavise.append(distance);
            const melee=node('label','workspace-type','Mêlée de face pendant le premier Tour');
            const first=document.createElement('input');
            first.type='checkbox';
            first.checked=context.paviseMeleeFirstTurn===true;
            first.setAttribute('aria-label',melee.textContent);
            first.addEventListener('change',()=>handlers.select({protectionContext:{...context,paviseMeleeFirstTurn:first.checked}}));
            melee.append(first);
            pavise.append(melee);
            pavise.append(node('p','workspace-muted','Protectrice 5 ne s’applique qu’après deux Actions enregistrées de mise en place, dans la direction, la distance et le Tour définis.'));
            block.append(pavise);
          }
          for(const [key,text] of [['shieldAvailable','Bouclier disponible ce tour'],['opposedWithShield','Défense opposée avec ce bouclier'],['ranged','Attaque à distance'],['lineOfSight','Attaquant visible']]) {
            const label=node('label','workspace-type',text);
            const choice=document.createElement('select');
            choice.setAttribute('aria-label',text);
            const protectionWeapon=action.extensions?.equipment||actor?.equipment?.find(row=>row?.id===action.extensions?.fiche?.equipmentId);
            const inferred=key === 'ranged' && protectionWeapon ? equipmentAttackContext(protectionWeapon,draft.v5Context||{})?.ranged : undefined;
            const value=typeof inferred==='boolean'?inferred:context[key];
            choice.append(new Option('À préciser',''),new Option('Oui','true'),new Option('Non','false'));
            choice.value=typeof value==='boolean'?String(value):'';
            choice.disabled=typeof inferred==='boolean';
            choice.addEventListener('change',()=>handlers.select({protectionContext:{...context,[key]:choice.value===''?undefined:choice.value==='true'}}));
            label.append(choice);
            block.append(label);
          }
          const manual=node('label','workspace-type','PA retenus après arbitrage (requis si la zone de la créature est inconnue)');
          const input=document.createElement('input');
          input.type='number';
          input.min='0';
          input.setAttribute('aria-label','PA retenus après arbitrage');
          input.value=context.manualAp ?? '';
          input.addEventListener('change',()=>handlers.select({protectionContext:{...context,manualAp:input.value===''?undefined:Number(input.value)}}));
          manual.append(input);
          block.append(manual);
          section.append(block);
        }
      }
      const v5 = node('div', 'workspace-v5-context');
      v5.appendChild(rubric('Test V5'));
      if(type!=='attack'){
        const social=renderDivineSocialFacts(actor,draft,handlers);
        if(social)v5.append(social);
        if(type==='opposition'&&target){
          const defenseSocial=renderDivineSocialFacts(target,draft,handlers,{defending:true});
          if(defenseSocial)v5.append(defenseSocial);
        }
      }
      if((actor?.extensions?.v5?.spellEffects || []).some(e=>e.magicTalentId==='talent-mind-over-body')){
        const label=node('label','workspace-type','Pénalité de Blessures Critiques (DR négatifs, hors autre modificateur)');
        const input=document.createElement('input');
        input.type='number';
        input.max='0';
        input.min='-100';
        input.value=draft.v5Context?.magicCriticalPenalty ?? '';
        input.setAttribute('aria-label',label.textContent);
        input.addEventListener('input',()=>handlers.input('v5Context',{...draft.v5Context,magicCriticalPenalty:input.value===''?null:Number(input.value)}));
        label.append(input);
        v5.append(label);
      }
      const actionEquipment=action.extensions?.equipment||actor?.equipment?.find(row=>row?.id===action.extensions?.fiche?.equipmentId);
      const metadataGroup=weaponSkillGroupInfo(actionEquipment?.category,actionEquipment);
      const selectedGroupInfo=type==='attack'&&!metadataGroup?weaponSkillGroupInfo(draft.v5Context?.weaponTrainingGroup,actionEquipment):null;
      const attackContext=equipmentAttackContext(actionEquipment,type==='attack'?draft.v5Context||{}:{});
      const attackKind=selectedGroupInfo?.kind || draft.v5Kind || inferV5Kind({ ...action, type }, attackContext);
      const attackBase=weaponAttackNature({actor,action:{...action,type},ranged:attackContext?.ranged,kind:attackKind});
      for(const field of natureSelects(target,()=>draft.v5Context?.attackNature,next=>handlers.select({v5Context:{...draft.v5Context,attackNature:next}}),attackBase))v5.append(field);
      // Bénédiction de Protection : résultat du Test de Calme Accessible (+2 DR) de l’attaquant, saisi par le MJ.
      const protectionLayer=(target?.extensions?.v5?.divineEffects||[]).find(layer=>layer?.attackDeterrent);
      // Attaquant déjà passé : le Test de Calme n'est plus demandé.
      if(actor?.camp!==target?.camp&&protectionLayer&&!(protectionLayer.attackDeterrent.passedAttackerIds||[]).includes(actor.id)){
        const label=node('label','workspace-type','Bénédiction de Protection : Test de Calme Accessible (+2 DR) de l’attaquant');
        const select=document.createElement('select');
        select.setAttribute('aria-label','Test de Calme de l’attaquant (Bénédiction de Protection)');
        select.append(new Option('À saisir',''),new Option('Échec : autre cible ou Action','fail'),new Option('Réussite','pass'));
        const calm=draft.v5Context?.protectionCalm;
        select.value=calm?(calm.success?'pass':'fail'):'';
        select.addEventListener('change',()=>handlers.select({v5Context:{...draft.v5Context,protectionCalm:select.value===''?undefined:{success:select.value==='pass'}}}));
        label.append(select);
        v5.append(label);
      }
      if(reductionLayers(target?.extensions?.v5).some(r=>r.calmTest)){
        const label=node('label','workspace-type','Test de Calme (+0 DR) contre cette attaque : réussi, DR obtenus');
        const select=document.createElement('select');
        select.setAttribute('aria-label','Test de Calme contre cette attaque');
        select.append(new Option('À saisir',''),new Option('Échec','fail'),new Option('Réussite','pass'));
        const calm=draft.v5Context?.reductionCalm;
        select.value=calm?(calm.success?'pass':'fail'):'';
        const sl=document.createElement('input');
        sl.type='number';
        sl.min='0';
        sl.max='20';
        sl.value=calm?.sl??0;
        sl.setAttribute('aria-label','DR du Test de Calme');
        const update=()=>handlers.select({v5Context:{...draft.v5Context,reductionCalm:select.value===''?undefined:{success:select.value==='pass',sl:Number(sl.value)||0}}});
        select.addEventListener('change',update);
        sl.addEventListener('change',update);
        label.append(select,sl);
        v5.append(label);
      }
      {
        const dice=wardDiceCount(target?.extensions?.v5,{...attackBase,...draft.v5Context?.attackNature});
        for(let k=0;k<dice;k++){
          const text=dice>1?`Protection magique ${k+1}/${dice} (Bénédiction de Lileath) : résultat du d10`:'Protection magique : résultat du d10';
          const label=node('label','workspace-type',text);
          const input=document.createElement('input');
          input.type='number';
          input.min='1';
          input.max='10';
          const saved=draft.v5Context?.magicWardRoll;
          input.value=(Array.isArray(saved)?saved[k]:k===0?saved:null) ?? '';
          input.setAttribute('aria-label',text);
          input.addEventListener('input',()=>{
            const now=draft.v5Context?.magicWardRoll;
            const list=Array.isArray(now)?[...now]:dice>1?[]:[now];
            const value=input.value===''?null:Number(input.value);
            list.length=dice;
            for(let j=0;j<dice;j++)list[j]??=null;
            list[k]=value;
            handlers.input('v5Context',{...draft.v5Context,magicWardRoll:dice===1?list[0]:list});
          });
          label.append(input);
          v5.append(label);
        }
      }

      if(participants.some(p=>magicTalentRank(p,'animal-assistant')||magicTalentRank(p,'magical-assistant')) || magicTalentRank(actor,'magical-sense')){
        const section=node('details','workspace-v5-context-details');
        section.append(node('summary','','Assistance et perception magiques'));
        const context=draft.v5Context || {};
        const label=node('label','workspace-type','Familier assistant');
        const select=document.createElement('select');
        select.setAttribute('aria-label',label.textContent);
        select.append(new Option('Aucun',''));
        for(const p of participants)if(p.id!==actor.id&&(magicTalentRank(p,'animal-assistant')||magicTalentRank(p,'magical-assistant')))select.append(new Option(p.name,p.id));
        select.value=context.magicAssistantId || '';
        select.addEventListener('change',()=>handlers.select({v5Context:{...context,magicAssistantId:select.value}}));
        label.append(select);
        section.append(label);
        for(const [key,text] of [['magicAssistantLinked','Familier lié, assistance possible'],['magicalNature','Recherche ou perception de nature magique'],['seesWinds','Seconde vue ou Vents autrement perceptibles']]){
          const label=node('label','workspace-type',text);
          const check=document.createElement('input');
          check.type='checkbox';
          check.checked=Boolean(context[key]);
          check.addEventListener('change',()=>handlers.select({v5Context:{...context,[key]:check.checked}}));
          label.append(check);
          section.append(label);
        }
        v5.append(section);
      }
      if(magicTalentRank(actor,'suffuse-with')){
        const label=node('label','workspace-type','Imprégné : remplacer la compétence par Focalisation');
        const select=document.createElement('select');
        select.setAttribute('aria-label',label.textContent);
        select.append(new Option('Ne pas remplacer',''));
        for(const row of actor.talents || [])if(row.id==='talent-suffuse-with'&&row.status==='resolved'&&row.specialization)select.append(new Option(row.specialization,row.specialization));
        select.value=draft.v5Context?.magicSuffusedWind || '';
        select.addEventListener('change',()=>handlers.select({v5Context:{...draft.v5Context,magicSuffusedWind:select.value}}));
        label.append(select);
        v5.append(label);
      }
  const numberField = (key, label, value, minimum = null) => {
    const caption = node('label', 'workspace-type', label);
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '1';
    if (minimum != null) {
      input.min = String(minimum);
      input.max = '100';
    }
    input.value = value ?? '';
    input.setAttribute('aria-label', label);
    input.dataset.focusKey = key;
    input.addEventListener('change', () => handlers.select({ [key]: input.value === '' ? null : Number(input.value) }));
    caption.appendChild(input);
    v5.appendChild(caption);
  };
  const kindLabel = node('label', 'workspace-type', 'Nature du Test');
  const kind = document.createElement('select');
  for (const [value, label] of [['melee','Corps à corps'],['ranged','Tir'],['test','Autre Test']]) kind.appendChild(new Option(label,value));
  const kindEquipment=action.extensions?.equipment||actor?.equipment?.find(row=>row?.id===action.extensions?.fiche?.equipmentId);
  const kindMetadataGroup=weaponSkillGroupInfo(kindEquipment?.category,kindEquipment);
  const selectedKind=type==='attack'&&!kindMetadataGroup?weaponSkillGroupInfo(draft.v5Context?.weaponTrainingGroup,kindEquipment)?.kind:null;
  kind.value = selectedKind || draft.v5Kind || inferV5Kind({ ...action, type }, equipmentAttackContext(kindEquipment,type==='attack'?draft.v5Context||{}:{}));
  kind.setAttribute('aria-label','Nature du Test');
  kind.dataset.focusKey='v5-kind';
  kind.addEventListener('change', () => handlers.select({ v5Kind: kind.value }));
  kindLabel.appendChild(kind);
  v5.appendChild(kindLabel);
  numberField('v5SlModifier', 'Modificateur V5 (DR)', draft.v5SlModifier ?? action.extensions?.v5?.slModifier ?? (action.mod ? null : 0));
  if (action.mod && draft.v5SlModifier == null && action.extensions?.v5?.slModifier == null) v5.appendChild(node('p','workspace-field-error',`Ancien modificateur de seuil ${signed(action.mod)} : saisissez les DR V5 retenus.`));
  numberField('v5Advantages','Sources supplémentaires d’Avantage',draft.v5Advantages || 0,0);
  numberField('v5Disadvantages','Sources de Désavantage',draft.v5Disadvantages || 0,0);
  // Attaque naturelle d'un Trait de créature (Langue, Souffle, Cornes…) : posée dans le contexte, lue par la résolution et le Store.
  const naturalTraits = type === 'attack' ? naturalCombatTraits(actor).filter(trait => trait.key !== 'v4-weapon') : [];
  if (naturalTraits.length) {
    const label = node('label','workspace-type','Attaque naturelle (Trait de créature)'), select = document.createElement('select');
    select.setAttribute('aria-label','Attaque naturelle');
    select.append(new Option('Attaque ordinaire de l’action',''));
    for (const trait of naturalTraits) select.append(new Option(`${trait.name}${trait.detail ? ` (${trait.detail})` : ''}`, trait.key));
    select.value = draft.v5Context?.naturalAttack || '';
    select.addEventListener('change', () => handlers.select({ v5Context: { ...(draft.v5Context || {}), naturalAttack: select.value || undefined } }));
    label.append(select);
    v5.appendChild(label);
  }
  const f2hActorId = actor?.extensions?.v5?.bestiary?.id || actor?.profileId;
  const f2hTargetId = target?.extensions?.v5?.bestiary?.id || target?.profileId;
  const f2hRules = [...planBestiaryProfileAbilities(actor), ...planBestiaryProfileAbilities(target)];
  if (f2hRules.length) {
    const section = node('details', 'workspace-v5-context-details');
    // Reste ouverte d’un rendu à l’autre, comme « Circonstances des Tests » : chaque saisie redessine le panneau.
    section.open = draft.profileRulesOpen === true;
    section.addEventListener('toggle', () => { draft.profileRulesOpen = section.open; });
    section.append(node('summary', '', 'Règles propres au profil'));
    for (const reminder of [...new Set(f2hRules.flatMap(plan => plan.reminders))]) section.append(node('p', 'workspace-muted', reminder));
    const f2h = draft.v5Context?.f2h || {};
    const setF2h = (key, value) => handlers.select({ v5Context: { ...(draft.v5Context || {}), f2h: { ...f2h, [key]: value } } });
    const addChoice = (key, labelText, choices) => {
      const label = node('label', 'workspace-type', labelText), select = document.createElement('select');
      select.setAttribute('aria-label', labelText);
      choices.forEach(([text, value]) => select.append(new Option(text, value)));
      select.value = f2h[key] == null ? '' : String(f2h[key]);
      select.addEventListener('change', () => setF2h(key, select.value === '' ? undefined : select.value === 'true' ? true : select.value === 'false' ? false : select.value));
      label.append(select);
      section.append(label);
    };
    const addCheck = (key, labelText) => {
      const label = node('label', 'workspace-type', labelText), check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = f2h[key] === true;
      check.addEventListener('change', () => setF2h(key, check.checked || undefined));
      label.append(check);
      section.append(label);
    };
    const ability = action?.extensions?.v5?.specialProfileAbility;
    if (ability === 'cliff-spider-lasso') {
      const labelText = 'Araignée de falaise : niveaux d’échec au Test d’Esquive';
      const label = node('label', 'workspace-type', labelText), input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.step = '1';
      input.value = f2h.cliffSpiderFailureSL ?? '';
      input.setAttribute('aria-label', labelText);
      input.addEventListener('change', () => setF2h('cliffSpiderFailureSL', input.value === '' ? undefined : Number(input.value)));
      label.append(input);
      section.append(label);
    }
    if (ability === 'farmyard-beast-spit') addChoice('farmyardResistance', 'Crachat venimeux : Test de Résistance (+0 DR)', [['À saisir', ''], ['Réussite', 'pass'], ['Échec', 'fail']]);
    if (f2hActorId === 'E0-P-910') {
      addCheck('targetGrappled', 'Gargantuan : cible agrippée au début de son Tour');
      if (f2h.targetGrappled === true) {
        addChoice('targetEnduranceSuccess', 'Cible : Test d’Endurance Difficile (−1 DR)', [['À saisir', ''], ['Réussite', 'true'], ['Échec', 'false']]);
        addChoice('selfEnduranceSuccess', 'Gargantuan : Test d’Endurance Moyenne (+2 DR)', [['À saisir', ''], ['Réussite', 'true'], ['Échec', 'false']]);
      }
      addCheck('fatigued', 'Gargantuan Fatigué (décharge réduite à 6 dégâts)');
      section.append(node('p', 'workspace-muted', 'Décharge : dépensez 1 Élan. Les règles de constriction de navire et les dégâts à son équipage restent des rappels.'));
    }
    if (['E0-P-565', 'E0-P-567', 'E0-P-758'].includes(f2hTargetId)) addCheck('skullReversionConfirmed', 'MJ : à 0 Blessure, le crâne redevient un crâne ordinaire');
    if (f2hTargetId === 'E0-P-916') addChoice('fireSize', 'Feu face au Léviathan noir', [['À préciser', ''], ['Torche ou plus petit', 'torch'], ['Grand feu de joie', 'bonfire']]);
    if (f2hActorId === 'E0-P-921') {
      addCheck('targetChaosFollower', 'La cible est adepte du Chaos (Test social)');
      addCheck('singleCombatLeader', 'Chef ou champion adverse en duel singulier (+1 Élan, une fois par duel)');
      if (f2h.singleCombatLeader === true) addCheck('championSlayerRearm', 'Nouveau duel contre cette cible : réarmer le gain d’Élan');
      addCheck('wulfrikHeadCritical', 'Blessure Critique : choisir la table Critique à la tête');
    }
    v5.append(section);
  }
  // Listes de Taille (rangs 0-6) : Battement, et toute attaque naturelle dont un effet dépend de la Taille (Attaque caudale, Piétinement, Langue).
  let sizesShown = false;
  const sizeSelects = () => {
    sizesShown = true;
    for (const [key, labelText] of [['actorSize','Taille de l’auteur'],['targetSize','Taille de la cible']]) {
      const label = node('label', 'workspace-type', labelText);
      const select = document.createElement('select');
      select.appendChild(new Option('À préciser', ''));
      for (const [value, text] of [[0,'Minuscule'],[1,'Très petite'],[2,'Petite'],[3,'Moyenne'],[4,'Grande'],[5,'Énorme'],[6,'Monstrueuse']])
        select.appendChild(new Option(text, String(value)));
      const person = key === 'actorSize' ? actor : target;
      const size = creatureSizeOf(person);
      select.value = draft[key] == null ? String(size.rank) : String(draft[key]);
      select.setAttribute('aria-label', labelText);
      select.dataset.focusKey = key;
      select.addEventListener('change', () => handlers.select({ [key]: select.value === '' ? null : Number(select.value) }));
      label.appendChild(select);
      v5.appendChild(label);
    }
    if (creatureSizeOf(actor).assumed || target && creatureSizeOf(target).assumed) v5.appendChild(node('p', 'workspace-muted', 'Taille non renseignée sur la fiche : Moyenne est la valeur supposée. Le MJ peut corriger les listes si nécessaire.'));
  };
  if (type === 'attack') sizeSelects();
  if (type === 'attack') {
    const current = draft.v5Context || {};
    const actorMount = participants.find(row => row.id === actor?.extensions?.v5?.mountId);
    const targetMount = participants.find(row => row.id === target?.extensions?.v5?.mountId);
    const sizeChoices = current.mountedSizeChoices || {};
    const requiredSizes = [
      ...(actor?.extensions?.v5?.mounted === true && String(draft.v5Kind || kind.value) === 'melee' && /^cavalerie$/i.test(String(kindEquipment?.category || current.weaponTrainingGroup || '')) ? [['actorMount','Taille de la monture de l’attaquant',actorMount],['target','Taille de la cible',target]] : []),
      ...(target?.extensions?.v5?.mounted === true && String(draft.v5Kind || kind.value) === 'melee' ? [['targetMount','Taille de la monture de la cible',targetMount],['actor','Taille de l’attaquant',actor]] : [])
    ];
    for (const [key,labelText,subject] of requiredSizes) {
      if (!subject || !creatureSizeOf(subject).assumed) continue;
      const label = node('label','workspace-type',`${labelText} · choix requis`), select = document.createElement('select');
      select.setAttribute('aria-label',label.textContent);
      select.append(new Option('Choisir explicitement…',''));
      for (const [value,text] of [['small','Petite'],['average','Moyenne'],['large','Grande'],['enormous','Énorme'],['monstrous','Monstrueuse']]) select.append(new Option(text,value));
      select.value = sizeChoices[key] || '';
      select.addEventListener('change',()=>handlers.select({v5Context:{...current,mountedSizeChoices:{...sizeChoices,[key]:select.value||undefined}}}));
      label.append(select);
      v5.append(label);
    }
  }
  if (kind.value === 'melee' && type === 'attack') {
    const charge = node('label','workspace-type');
    const check = document.createElement('input');
    check.type='checkbox';
    check.checked=draft.charging === true;
    check.addEventListener('change',()=>handlers.select({charging:check.checked}));
    charge.append(check,'Charge donnant Élan (distance et conditions vérifiées)');
    v5.appendChild(charge);
    const mountId = actor?.extensions?.v5?.mountId;
    const mount = participants.find(row => row.id === mountId && row.zone === 'active');
    if (actor?.extensions?.v5?.mounted === true && mount) {
      const useMount = node('label','workspace-type');
      const useMountCheck = document.createElement('input');
      useMountCheck.type='checkbox';
      useMountCheck.checked = draft.v5Context?.useMountStrengthBonus === true;
      useMountCheck.disabled = draft.charging !== true;
      useMountCheck.setAttribute('aria-label','Employer la BF de la monture pour cette charge');
      useMountCheck.addEventListener('change',()=>handlers.select({v5Context:{...(draft.v5Context||{}),useMountStrengthBonus:useMountCheck.checked}}));
      useMount.append(useMountCheck,`Employer la BF de ${mount.name||mount.id} pour cette charge`);
      v5.appendChild(useMount);
    }
  }
  const talentToggle = (key, text, checked, disabled = false) => {
    const label = node('label', 'workspace-type');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = checked === true;
    check.disabled=disabled;
    check.setAttribute('aria-label', text);
    check.dataset.focusKey = key;
    check.addEventListener('change', () => handlers.select({ [key]: check.checked }));
    label.append(check, text);
    v5.appendChild(label);
  };
  talentToggle('fortuneReroll', 'Relancer ce Test avec 1 Point de Chance (Fortune)', draft.fortuneReroll);
  const fortuneAdvantageLocked=draft.preview!=null||draft.attackRoll!==undefined&&draft.attackRoll!==null&&String(draft.attackRoll).trim()!=='';
  talentToggle('fortuneForAdvantage', 'Dépenser 1 Point de Chance pour obtenir Avantage avant le jet', draft.fortuneForAdvantage,fortuneAdvantageLocked);
  if(fortuneAdvantageLocked)v5.appendChild(node('p','workspace-muted','Chance → Avantage se choisit avant de connaître le résultat du d100. Effacez le jet avant de modifier ce choix.'));
  // Fortune généreuse (Ranald) : proposée seulement si l’acteur porte encore une faveur d’inversion.
  if ((actor?.extensions?.v5?.divineEffects || []).some(layer => layer?.reverseDice?.remaining > 0)) {
    talentToggle('reverseDice', 'Inverser les dés de ce Test (Fortune généreuse : 82 devient 28)', draft.reverseDice);
    if (draft.preview?.reverseDiceHint?.wouldSucceed === true && !draft.reverseDice) v5.appendChild(node('p', 'workspace-muted', `L’inversion (${String(draft.preview.reverseDiceHint.reversed).padStart(2, '0')}) réussirait ce Test.`));
  }
  if (draft.fortuneReroll) {
    const label=node('label','workspace-type','Jets successifs de relance (d100, séparés par des virgules)');
    const input=document.createElement('input');
    input.type='text';
    input.value=(draft.fortuneRerollRolls||[]).join(', ');
    input.setAttribute('aria-label',label.textContent);
    input.addEventListener('change',()=>handlers.select({fortuneRerollRolls:input.value.split(',').map(value=>value.trim()).filter(Boolean).map(Number)}));
    label.append(input);
    v5.appendChild(label);
  }
  if (type === 'attack') {
    if (draft.reactionId) {
      v5.appendChild(node('p', 'workspace-muted', 'Assaut féroce : nouvelle attaque avec la même arme contre le même adversaire. Coût : 1 Élan ; une fois par Round et un seul paiement d’attaque supplémentaire par Tour.'));
      const cancel = button('Quitter la préparation d’Assaut féroce', 'workspace-ghost');
      cancel.addEventListener('click', () => handlers.select({ reactionId: null, extraAttack: false }));
      v5.appendChild(cancel);
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
    const label=node('label','workspace-type','Nature de la défense');
    const select=document.createElement('select');
    select.append(new Option('Corps à corps','melee'),new Option('Esquive / autre Test','test'));
    select.value=draft.defenseKind || defense.option.v5?.kind || (defense.option.value === 'Ag' || /esquive|dodge/i.test(defense.option.statLabel) ? 'test' : 'melee');
    select.dataset.focusKey='defense-kind';
    select.setAttribute('aria-label','Nature de la défense');
    select.addEventListener('change',()=>handlers.select({defenseKind:select.value}));
    label.appendChild(select);
    v5.appendChild(label);
    numberField('defenseSlModifier','Modificateur V5 de défense (DR)',draft.defenseSlModifier ?? defense.option.v5?.slModifier ?? (defense.option.mod ? null : 0));
    numberField('defenseAdvantages','Avantages supplémentaires de défense',draft.defenseAdvantages || 0,0);
    numberField('defenseDisadvantages','Désavantages de défense',draft.defenseDisadvantages || 0,0);
  }
  const contextField = (container, role, key, label) => {
    const contextKey = role === 'actor' ? 'v5Context' : 'defenseContext';
    const current = draft[contextKey] || {};
    const caption = node('label', 'workspace-type', label);
    const select = document.createElement('select');
    select.setAttribute('aria-label', `${label}${role === 'defender' ? ' (défense)' : ''}`);
    select.dataset.focusKey = `${role}-${key}`;
    select.append(new Option('À préciser', ''), new Option('Oui', 'true'), new Option('Non', 'false'));
    select.value = typeof current[key] === 'boolean' ? String(current[key]) : '';
    select.addEventListener('change', () => handlers.select({ [contextKey]: { ...current, [key]: select.value === '' ? undefined : select.value === 'true' } }));
    caption.appendChild(select);
    container.appendChild(caption);
  };
  const choiceField = (container, key, label, options) => {
    const current = draft.v5Context || {}, caption = node('label', 'workspace-type', label), select = document.createElement('select');
    select.setAttribute('aria-label', label);
    select.dataset.focusKey = `actor-${key}`;
    select.append(new Option('À préciser', ''));
    for (const [value, text] of options) select.append(new Option(text, value));
    select.value = current[key] == null ? '' : String(current[key]);
    select.addEventListener('change', () => handlers.select({ v5Context: { ...current, [key]: select.value || undefined } }));
    caption.appendChild(select);
    container.appendChild(caption);
  };
  const conditionModeField = (container, role) => {
    const contextKey = role === 'actor' ? 'v5Context' : 'defenseContext';
    const current = draft[contextKey] || {};
    const label = node('label', 'workspace-type', 'Pénalité retenue entre États mixtes');
    const select = document.createElement('select');
    select.setAttribute('aria-label', `Pénalité retenue entre États mixtes${role === 'defender' ? ' (défense)' : ''}`);
    select.dataset.focusKey = `${role}-condition-penalty-mode`;
    select.append(new Option('À préciser si nécessaire', ''), new Option('Pénalité en DR', 'sl'), new Option('Désavantage', 'disadvantage'));
    select.value = current.conditionPenaltyMode || '';
    select.addEventListener('change', () => handlers.select({ [contextKey]: { ...current, conditionPenaltyMode: select.value || undefined } }));
    label.appendChild(select);
    container.appendChild(label);
  };
  const talentFields=node('div','workspace-v5-context');
  const addTalentContext=(role,subject,selectedAction)=>{
    const contextKey=role==='defender'?'defenseContext':'v5Context',current=draft[contextKey]||{};
    if(!(subject?.talents||[]).some(row=>V5_TEST_TALENT_IDS.includes(row.id)||V5_ACTIVATED_TALENTS[row.id]||row.id===MASTER_AND_COMMANDER_TALENT.id))return;
    const importedSkill=selectedAction?.extensions?.fiche?.skillId;
    const skillId=importedSkill||current.skillId;
    const label=node('label','workspace-type',role==='defender'?'Compétence de défense pour les talents':'Compétence de ce Test pour les talents');
    const select=document.createElement('select');
    select.setAttribute('aria-label',label.textContent);
    select.dataset.focusKey=role+'-talent-skill';
    select.append(new Option('À préciser',''),new Option('Test de caractéristique (aucune compétence)','none'));
    for(const skill of getReferenceCatalogue().skills)select.append(new Option(skill.nom||skill.name||skill.id,skill.id));
    select.value=skillId||'';
    select.disabled=Boolean(importedSkill);
    select.addEventListener('change',()=>handlers.select({[contextKey]:{...current,skillId:select.value||undefined}}));
    label.append(select);
    talentFields.append(label);
    for(const descriptor of applicableV5TalentTestFields(subject,skillId)){
      if(descriptor.type==='boolean'){
        contextField(talentFields,role,descriptor.field,descriptor.label);
        continue;
      }
      const caption=node('label','workspace-type',descriptor.label);
      const choice=document.createElement('select');
      choice.setAttribute('aria-label',descriptor.label+(role==='defender'?' (défense)':''));
      choice.dataset.focusKey=role+'-'+descriptor.field;
      choice.append(new Option('À préciser',''));
      for(const option of descriptor.options||[])choice.append(new Option(option.label,String(option.value)));
      choice.value=current[descriptor.field]||'';
      choice.addEventListener('change',()=>handlers.select({[contextKey]:{...current,[descriptor.field]:choice.value||undefined}}));
      caption.append(choice);
      talentFields.append(caption);
    }
  };
  addTalentContext('actor',actor,action);
  if(['attack','opposition'].includes(type)&&target)addTalentContext('defender',target,defense?.option);
  if(['melee','ranged'].includes(kind.value)&&type==='attack'&&hasV5Talent(actor,'talent-strike-to-stun'))contextField(talentFields,'actor','weaponImprovised','Arme improvisée (Frappe assommante)');
  if(type==='attack'){
    const morphologyContext=draft.v5Context||{};
    const morphologyLabel=node('label','workspace-type','Morphologie de la cible (choix du MJ)');
    const morphologySelect=document.createElement('select');
    morphologySelect.setAttribute('aria-label',morphologyLabel.textContent);
    morphologySelect.append(new Option('Morphologie du profil',''),new Option('Humanoïde (forcer)','humanoid'),new Option('Quadrupède','quadruped'),new Option('Oiseau','bird'),new Option('Serpent','snake'),new Option('Araignée','spider'));
    const profileMorphology=deriveHitMorphology(target);
    morphologySelect.value=hitMorphologySelection(morphologyContext.hitMorphology,profileMorphology);
    morphologySelect.addEventListener('change',()=>handlers.select({v5Context:{...morphologyContext,hitMorphology:morphologySelect.value||undefined}}));
    morphologyLabel.append(morphologySelect);
    talentFields.append(morphologyLabel);
    if(normalizeHitMorphology(morphologySelect.value||profileMorphology)==='spider'&&draft.preview?.location?.key==='LEG'&&!draft.preview.location.side){
      const sideLabel=node('label','workspace-type','Côté de patte touché (choix MJ si nécessaire)'),sideSelect=document.createElement('select');
      sideSelect.setAttribute('aria-label',sideLabel.textContent);
      sideSelect.append(new Option('À choisir',''),new Option('Patte gauche','left'),new Option('Patte droite','right'));
      sideSelect.value=morphologyContext.spiderLegSide||'';
      sideSelect.addEventListener('change',()=>handlers.select({v5Context:{...morphologyContext,spiderLegSide:sideSelect.value||undefined}}));
      sideLabel.append(sideSelect);
      talentFields.append(sideLabel);
    }
    const appendageLabel=node('label','workspace-type','Appendice atteint sans table propre (si applicable)');
    const appendageInput=document.createElement('input');
    appendageInput.type='text';
    appendageInput.value=morphologyContext.hitAppendage||'';
    appendageInput.setAttribute('aria-label',appendageLabel.textContent);
    appendageInput.addEventListener('change',()=>handlers.select({v5Context:{...morphologyContext,hitAppendage:appendageInput.value.trim()||undefined}}));
    appendageLabel.append(appendageInput);
    talentFields.append(appendageLabel);
    contextField(talentFields,'actor','calledShot','Coup ciblé (−2 DR, hors modificateur saisi)');
    if(draft.v5Context?.calledShot){
      const label=node('label','workspace-type','Localisation du coup ciblé');
      const select=document.createElement('select');
      select.setAttribute('aria-label','Localisation du coup ciblé');
      select.append(new Option('À préciser',''));
      for(const [value,text] of [['head','Tête'],['body','Corps'],['leftArm','Bras gauche'],['rightArm','Bras droit'],['leftLeg','Jambe gauche'],['rightLeg','Jambe droite']])select.append(new Option(text,value));
      select.value=draft.v5Context?.calledShotLocation||'';
      select.addEventListener('change',()=>handlers.select({v5Context:{...(draft.v5Context||{}),calledShotLocation:select.value||undefined}}));
      label.append(select);
      talentFields.append(label);
    }
  }
  if(hasV5Talent(actor,'talent-strike-to-stun')){
    contextField(talentFields,'actor','silentTakedown','Test de neutralisation silencieuse (page 135)');
    if(draft.v5Context?.silentTakedown){
      contextField(talentFields,'actor','outsideCombat','Procédure hors combat');
      contextField(talentFields,'actor','targetUnaware','Cible ignorant le danger');
      talentFields.append(node('p','workspace-muted','Choisir Opposition et Corps à corps contre Résistance. Après le Test, arbitrer : victoire = BF Blessures et Inconscient ; défaite = cible Sonnée et alarme.'));
    }
  }
  if(talentFields.childNodes.length){
    talentFields.prepend(rubric('Contexte des talents'));
    v5.append(talentFields);
  }
  const contextual = node('details', 'workspace-v5-context-details');
  contextual.open = draft.combatSituationOpen ?? type === 'attack';
  contextual.addEventListener('toggle', () => { draft.combatSituationOpen = contextual.open; });
  contextual.appendChild(node('summary', '', 'Circonstances des Tests'));
  const fields = node('div', 'workspace-v5-context');
  const focusActionLabel=String(action?.name||action?.note||action?.skillName||'');
  const linkedSupplementalItem=actor?.equipment?.find(item=>item.id===action?.extensions?.fiche?.equipmentId)||action?.extensions?.equipment;
  if(type==='attack'&&/dague funeste|doom dagger/i.test(String(linkedSupplementalItem?.name||focusActionLabel))){
    const current=draft.v5Context||{},label=node('label','workspace-type','Test d’Endurance de la cible à −1 DR'),select=document.createElement('select');
    select.setAttribute('aria-label',label.textContent);
    select.append(new Option('À saisir',''),new Option('Réussite','true'),new Option('Échec : appliquer Empoisonné','false'));
    select.value=typeof current.supplementalPoisonTest?.success==='boolean'?String(current.supplementalPoisonTest.success):'';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,supplementalPoisonTest:select.value===''?undefined:{success:select.value==='true'}}}));
    label.append(select);
    fields.append(label);
    const rollLabel=node('label','workspace-type','Jet secret du MJ (d10 à chaque utilisation)'),rollInput=document.createElement('input');
    rollInput.type='number';
    rollInput.min='1';
    rollInput.max='10';
    rollInput.step='1';
    rollInput.value=current.fellDaggerSecretRoll??'';
    rollInput.setAttribute('aria-label',rollLabel.textContent);
    rollInput.addEventListener('change',()=>handlers.select({v5Context:{...current,fellDaggerSecretRoll:rollInput.value===''?undefined:Number(rollInput.value)}}));
    rollLabel.append(rollInput);
    fields.append(rollLabel);
  }
  if(type==='attack'&&/warp blade|lame de malepierre/i.test(String(linkedSupplementalItem?.name||focusActionLabel))){
    const current=draft.v5Context||{},stored=current.warpBladeEnduranceTest||{};
    const setTest=(key,value)=>{
      const next={...stored,[key]:value};
      delete next.success;
      if(value===undefined)delete next[key];
      handlers.select({v5Context:{...current,warpBladeEnduranceTest:Object.keys(next).length?next:undefined}});
    };
    for(const [key,text,min] of [['score','Warp Blade : score de Résistance de la cible (Test +2 DR si >1 Blessure)',0],['roll','Warp Blade : jet d100 du Test de Résistance de la cible',1]]){
      const label=node('label','workspace-type',text),input=document.createElement('input');
      input.type='number';
      input.min=String(min);
      if(key==='roll')input.max='100';
      input.step='1';
      input.value=stored[key]??'';
      input.setAttribute('aria-label',text);
      input.addEventListener('change',()=>setTest(key,input.value===''?undefined:Number(input.value)));
      label.append(input);
      fields.append(label);
    }
    if(Number.isFinite(Number(target?.caracs?.E)))fields.append(node('p','workspace-muted',`Endurance de la cible : ${target.caracs.E} (reporter la compétence Résistance si elle figure sur la fiche).`));
    fields.append(node('p','workspace-muted','La Warp Blade ignore les PA des pièces métalliques; ses qualités Défensive, Tailleuse et Empaleuse sont imprimées dans le profil d’attaque.'));
  }
  if(type==='attack'&&/antler hilted blade|lame.*poignee de bois|lame.*poignée de bois/i.test(String(linkedSupplementalItem?.name||focusActionLabel))){
    const current=draft.v5Context||{},label=node('label','workspace-type','Origine de la poignée en bois de Grand Cerf'),select=document.createElement('select');
    select.setAttribute('aria-label',label.textContent);
    select.append(new Option('À préciser',''),new Option('Bois tombé naturellement','naturally-fallen'),new Option('Bois acquis par violence','violent'));
    select.value=current.antlerHandleOrigin||'';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,antlerHandleOrigin:select.value||undefined}}));
    label.append(select);
    fields.append(label);
  }
  if(type==='attack'&&/griffes du tigre|tiger claws/i.test(String(linkedSupplementalItem?.name||focusActionLabel))){
    fields.append(node('p','workspace-muted','Profil Taggees : les Griffes du tigre utilisent Corps à corps (Bagarre), avec les statistiques d’une Dague. Toute Blessure infligée peut être présentée comme causée par un grand félin.'));
    const current=draft.v5Context||{},label=node('label','workspace-type','Maquiller la blessure en griffure de grand félin'),input=document.createElement('input');
    input.type='checkbox';
    input.checked=current.felidWoundDisguise===true;
    input.setAttribute('aria-label',label.textContent);
    input.addEventListener('change',()=>handlers.select({v5Context:{...current,felidWoundDisguise:input.checked||undefined}}));
    label.prepend(input);
    fields.append(label);
  }
  if(/focalisation/i.test(focusActionLabel)){
    const current=draft.v5Context||{},ruleLabel=node('label','workspace-type','Objet de focalisation utilisé'),ruleSelect=document.createElement('select');
    ruleSelect.setAttribute('aria-label',ruleLabel.textContent);
    ruleSelect.append(new Option('Aucun',''),new Option('Bâton du domaine (+1 DR)','F-L06-1104'),new Option('Robes de sorcier (rang choisi)','F-L06-1105'));
    ruleSelect.value=current.focalisationSupplementRuleId||'';
    ruleSelect.addEventListener('change',()=>handlers.select({v5Context:{...current,focalisationSupplementRuleId:ruleSelect.value||undefined}}));
    ruleLabel.append(ruleSelect);
    fields.append(ruleLabel);
    if(ruleSelect.value){
      const domainLabel=node('label','workspace-type','Domaine associé à l’objet et au Test'),domainInput=document.createElement('input');
      domainInput.type='text';
      domainInput.value=current.focalisationAssociatedDomain||'';
      domainInput.setAttribute('aria-label',domainLabel.textContent);
      domainInput.addEventListener('change',()=>handlers.select({v5Context:{...current,focalisationAssociatedDomain:domainInput.value.trim()||undefined,focalisationDomain:domainInput.value.trim()||undefined}}));
      domainLabel.append(domainInput);
      fields.append(domainLabel);
    }
    if(ruleSelect.value){
      const rankLabel=node('label','workspace-type','Rang de Focalisation lié à cet objet'),rankSelect=document.createElement('select');
      rankSelect.setAttribute('aria-label',rankLabel.textContent);
      for(const [value,label] of [['','À choisir'],['1','+1 DR'],['2','+2 DR'],['3','+3 DR']])rankSelect.append(new Option(label,value));
      rankSelect.value=String(current.focalisationFocusRank??current.focalisationRobeRank??'');
      rankSelect.addEventListener('change',()=>handlers.select({v5Context:{...current,focalisationFocusRank:rankSelect.value?Number(rankSelect.value):undefined,focalisationRobeRank:rankSelect.value?Number(rankSelect.value):undefined}}));
      rankLabel.append(rankSelect);
      fields.append(rankLabel);
    }
    fields.append(node('p','workspace-muted','Le bonus s’applique uniquement à Focalisation dans le domaine indiqué; le bâton ne réduit pas le niveau d’incantation.'));
  }
  if(type==='attack'&&kind.value==='melee'){
    const current=draft.v5Context||{},label=node('label','workspace-type','Assommer — déclarer avant le jet et retenir ses coups'),check=document.createElement('input');
    check.type='checkbox';
    check.checked=current.knockout===true;
    check.setAttribute('aria-label',label.textContent);
    check.addEventListener('change',()=>handlers.select({v5Context:{...current,knockout:check.checked}}));
    label.prepend(check);
    fields.append(label);
    if(current.knockout)fields.append(node('p','workspace-muted','Les Blessures ordinaires restent appliquées. Les Blessures Critiques sont ignorées; Damaging, Hack, Impale et Penetrating sont retirées.'));
  }
  if(type==='attack'&&(actor.equipment||[]).some(item=>item.kind==='shield')){
    const current=draft.v5Context||{},wrap=node('label','workspace-type','Bouclier tenu par l’attaquant'),select=document.createElement('select');
    select.setAttribute('aria-label',wrap.textContent);
    select.append(new Option('Aucun',''));
    for(const item of actor.equipment.filter(row=>row.kind==='shield'))select.append(new Option(item.name,item.id));
    select.value=current.actorShieldId||'';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,actorShieldId:select.value||undefined}}));
    wrap.append(select);
    fields.append(wrap);
    if(current.actorShieldId){
      const label=node('label','workspace-type','Bouclier attaché au bras ou en bandoulière'),check=document.createElement('input');
      check.type='checkbox';
      check.checked=current.shieldAttached===true;
      check.setAttribute('aria-label',label.textContent);
      check.addEventListener('change',()=>handlers.select({v5Context:{...current,shieldAttached:check.checked}}));
      label.append(check);
      fields.append(label);
      const attackLabel=node('label','workspace-type','Frapper avec ce bouclier (arme improvisée, allonge Personnelle)'),attackCheck=document.createElement('input');
      attackCheck.type='checkbox';
      attackCheck.checked=current.attackWithShield===true;
      attackCheck.setAttribute('aria-label',attackLabel.textContent);
      attackCheck.addEventListener('change',()=>handlers.select({v5Context:{...current,attackWithShield:attackCheck.checked}}));
      attackLabel.prepend(attackCheck);
      fields.append(attackLabel);
      const enc=node('label','workspace-type','Encombrement de l’arme tenue par l’attaquant (fiche/catalogue ou MJ)'),input=document.createElement('input');
      input.type='number';
      input.min='0';
      input.step='1';
      input.value=current.weaponEncumbrance??'';
      input.setAttribute('aria-label',enc.textContent);
      input.addEventListener('change',()=>handlers.select({v5Context:{...current,weaponEncumbrance:input.value===''?undefined:Number(input.value)}}));
      enc.append(input);
      fields.append(enc);
      const off=node('label','workspace-type','Arme de la main non directrice'),other=document.createElement('select');
      other.setAttribute('aria-label',off.textContent);
      other.append(new Option('Aucune',''));
      for(const item of actor.equipment.filter(row=>row.kind==='weapon'&&row.id!==action?.extensions?.fiche?.equipmentId))other.append(new Option(item.name,item.id));
      other.value=current.offHandWeaponId||'';
      other.addEventListener('change',()=>handlers.select({v5Context:{...current,offHandWeaponId:other.value||undefined}}));
      off.append(other);
      fields.append(off);
    }
  }
  const droppedWeapons=participants.flatMap(person=>(person.equipment||[]).filter(item=>item.kind==='weapon'&&item.extensions?.v5?.weaponDisposition==='dropped').map(item=>({person,item})));
  if(droppedWeapons.length){
    const current=draft.v5Context||{},wrap=node('label','workspace-type','Piège-lame : récupérer explicitement une arme lâchée'),select=document.createElement('select');
    select.setAttribute('aria-label',wrap.textContent);
    select.append(new Option('Aucune récupération',''));
    for(const row of droppedWeapons)select.append(new Option(`${row.item.name} — ${row.person.name||row.person.id}`,JSON.stringify([row.person.id,row.item.id])));
    const selectedRecovery=current.recoverDroppedWeaponId?JSON.stringify([current.recoverDroppedWeaponOwnerId||'',current.recoverDroppedWeaponId]):'';
    select.value=selectedRecovery;
    select.addEventListener('change',()=>{
      let ownerId,weaponId;
      try{[ownerId,weaponId]=JSON.parse(select.value||'[]');}catch{}
      handlers.select({type:weaponId?'test':type,v5Context:{...current,recoverDroppedWeaponId:weaponId||undefined,recoverDroppedWeaponOwnerId:ownerId||undefined}});
    });
    wrap.append(select);
    fields.append(wrap);
    if(current.recoverDroppedWeaponId)fields.append(node('p','workspace-muted','Le MJ confirme ici le ramassage; l’arme désignée par propriétaire et identifiant est rendue à l’inventaire de l’acteur courant.'));
  }
  const armorRelevantTest=(type==='test'||type==='skill')&&/(discretion|furtivite|perception)/u.test(String(action?.label||action?.note||'').normalize('NFD').replace(/[\u0300-\u036f]/gu,'').toLowerCase());
  if(armorRelevantTest){
    const current=draft.v5Context||{},items=(actor.equipment||[]).filter(item=>item.kind==='armour'&&['Mailles','Mailles Naines','Plates','Plates Naines','Gromril (nain)','Ithilmar Haut Elfe','Dragon Haut Elfe'].includes(item.category));
    fields.append(node('p','workspace-muted','Indiquez les pièces de maille/plates ou le heaume fermé effectivement portés pour ce Test.'));
    for(const item of items){
      const label=node('label','workspace-type'),check=document.createElement('input');
      check.type='checkbox';
      check.checked=(current.wornArmorItemIds||[]).includes(item.id);
      check.setAttribute('aria-label',item.name+' porté');
      check.addEventListener('change',()=>{
        const ids=(current.wornArmorItemIds||[]).filter(id=>id!==item.id);
        if(check.checked)ids.push(item.id);
        handlers.select({v5Context:{...current,wornArmorItemIds:ids}});
      });
      label.append(check,item.name+' porté');
      fields.append(label);
    }
  }
  const selectedNetEscape=(draft.v5Context||{}).netEscapeConditionId;
  for (const [key, label] of [['involvesMovement','Le Test implique un mouvement'],['runningOrHiding','Le Test sert à fuir ou se cacher'],['reliesOnSight','Le Test est réalisable sans voir mais repose sur la vue'],['requiresSight','Le Test est impossible sans voir'],['usesFellowship','Le Test utilise la Sociabilité'],...(action?.attr==='E'?[['festeringWounds','Test d’Endurance contre les Plaies purulentes (Souillé : Désavantage)']]:[])])
    if(key!=='involvesMovement'||!selectedNetEscape)contextField(fields, 'actor', key, label);
  // Séquelles durables (F2-J2) : circonstances que l'outil ne connaît pas (zone utilisée, parole, ouïe, main directrice…), demandées au MJ.
  for (const field of sequelaContextFields(actor)) if (!['reliesOnSight', 'requiresSight'].includes(field.key)) contextField(fields, 'actor', field.key, `Séquelle · ${field.label}`);
  const testWeaponId=action?.extensions?.fiche?.equipmentId||action?.extensions?.equipment?.id;
  const testWeapon=actor.equipment?.find(row=>row.id===testWeaponId);
  const testWeaponKind=testWeapon?.extensions?.v5?.entanglementKind
    ||(testWeapon?.baseId==='weapon-armes-corps-a-corps-armes-d-hast-mancatcher-2m'?'mancatcher':null);
  const secondaryHitMorphology=(current,id,prefix)=>{
    const person=participants.find(row=>row.id===id);
    if(!person)return;
    const label=node('label','workspace-type',`${prefix}Morphologie de ${person.name||id} (choix du MJ)`),select=document.createElement('select');
    select.setAttribute('aria-label',label.textContent);
    select.append(new Option('Morphologie du profil',''),new Option('Humanoïde (forcer)','humanoid'),new Option('Quadrupède','quadruped'),new Option('Oiseau','bird'),new Option('Serpent','snake'),new Option('Araignée','spider'));
    select.value=hitMorphologySelection(current.hitMorphologiesById?.[id],deriveHitMorphology(person));
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,hitMorphologiesById:{...(current.hitMorphologiesById||{}),[id]:select.value||undefined}}}));
    label.append(select);
    fields.append(label);
    if (select.value === 'spider') {
      const sideLabel=node('label','workspace-type',`${prefix}Côté des pattes de ${person.name||id} (choix du MJ)`),sideSelect=document.createElement('select');
      sideSelect.setAttribute('aria-label',sideLabel.textContent);
      sideSelect.append(new Option('Choisir le côté',''),new Option('Gauche','left'),new Option('Droite','right'));
      sideSelect.value=current.spiderLegSidesById?.[id]||'';
      sideSelect.addEventListener('change',()=>handlers.select({v5Context:{...current,spiderLegSidesById:{...(current.spiderLegSidesById||{}),[id]:sideSelect.value||undefined}}}));
      sideLabel.append(sideSelect);
      fields.append(sideLabel);
    }
  };
  if(type==='test'&&action?.attr==='F'&&testWeaponKind==='mancatcher'){
    contextField(fields,'actor','entanglementTest','Test de Force pour immobiliser avec le Mancatcher');
    if(testWeapon.extensions?.v5?.springLoaded!==true)contextField(fields,'actor','springLoaded','Mancatcher équipé du ressort (+2 DR)');
  }
  if(type==='attack'&&(action?.qualities||[]).some(row=>(typeof row==='string'?row:row?.id)==='dispersion')){
    const current=draft.v5Context||{},range=node('label','workspace-type','Dispersion : bande choisie par le MJ'),select=document.createElement('select');
    select.setAttribute('aria-label',range.textContent);
    select.append(new Option('Choisir la bande',''),new Option('À bout portant','point-blank'),new Option('Courte','short'),new Option('Moyenne','medium'),new Option('Longue','long'),new Option('Extrême','extreme'));
    select.value=current.spreadRangeBand||'';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,spreadRangeBand:select.value||undefined}}));
    range.append(select);
    fields.append(range);
    const targets=node('label','workspace-type','Dispersion : identifiants des cibles choisies (virgules)'),input=document.createElement('input');
    input.type='text';
    input.value=(current.spreadTargetIds||[]).join(', ');
    input.setAttribute('aria-label',targets.textContent);
    input.addEventListener('change',()=>handlers.select({v5Context:{...current,spreadTargetIds:input.value.split(',').map(value=>value.trim()).filter(Boolean)}}));
    targets.append(input);
    fields.append(targets);
    for(const id of(current.spreadTargetIds||[]).filter(id=>id!==target?.id)){
      secondaryHitMorphology(current,id,'Dispersion · ');
      const label=node('label','workspace-type',`Dispersion · localisation d100 de ${participants.find(row=>row.id===id)?.name||id}`),die=document.createElement('input');
      die.type='number';
      die.min='1';
      die.max='100';
      die.value=current.spreadLocationRollsById?.[id]??'';
      die.setAttribute('aria-label',label.textContent);
      die.addEventListener('change',()=>handlers.select({v5Context:{...current,spreadLocationRollsById:{...(current.spreadLocationRollsById||{}),[id]:die.value===''?undefined:Number(die.value)}}}));
      label.append(die);
      fields.append(label);
    }
    const spreadRating=Number((action.qualities||[]).find(row=>(typeof row==='string'?row:row?.id)==='dispersion')?.parameter)||Number(current.spreadRating)||0;
    fields.append(node('p','workspace-muted',`Bout portant : une cible, dégâts +${spreadRating}. Courte à longue : cible initiale et jusqu’à ${spreadRating} cibles visibles les plus proches; aucune paire ne dépasse ${spreadRating} m. Extrême : mêmes cibles, dégâts −${spreadRating}. Distances et visibilité sont arbitrées par le MJ; saisissez un jet de localisation d100 pour chaque cible secondaire.`));
  }
  if(type==='attack'&&(action?.qualities||[]).some(row=>(typeof row==='string'?row:row?.id)==='explosion')){
    const current=draft.v5Context||{},targets=node('label','workspace-type','Explosion : identifiants de toutes les cibles dans le diamètre (virgules)'),input=document.createElement('input');
    input.type='text';
    input.value=(current.explosionTargetIds||[]).join(', ');
    input.setAttribute('aria-label',targets.textContent);
    input.addEventListener('change',()=>handlers.select({v5Context:{...current,explosionTargetIds:input.value.split(',').map(value=>value.trim()).filter(Boolean)}}));
    targets.append(input);
    fields.append(targets);
    for(const id of(current.explosionTargetIds||[]).filter(id=>id!==target?.id)){
      secondaryHitMorphology(current,id,'Explosion · ');
      const label=node('label','workspace-type',`Explosion · localisation d100 de ${participants.find(row=>row.id===id)?.name||id}`),die=document.createElement('input');
      die.type='number';
      die.min='1';
      die.max='100';
      die.value=current.explosionLocationRollsById?.[id]??'';
      die.setAttribute('aria-label',label.textContent);
      die.addEventListener('change',()=>handlers.select({v5Context:{...current,explosionLocationRollsById:{...(current.explosionLocationRollsById||{}),[id]:die.value===''?undefined:Number(die.value)}}}));
      label.append(die);
      fields.append(label);
    }
    contextField(fields,'actor','explosionOpposed','Exception MJ : la cible oppose normalement cette Explosion');
    fields.append(node('p','workspace-muted','Désignez toutes les cibles touchées. Par défaut, elles ne font pas d’opposition ordinaire; les dégâts ne prennent pas les DR de l’attaque.'));
  }
  if(type==='attack'&&(action?.qualities||[]).some(row=>(typeof row==='string'?row:row?.id)==='taille')&&target){
    const current=draft.v5Context||{},wrap=node('label','workspace-type','Taille : pièce d’armure ou bouclier frappé'),select=document.createElement('select');
    select.setAttribute('aria-label',wrap.textContent);
    select.append(new Option('À préciser',''));
    for(const item of(target.equipment||[]).filter(row=>['armour','shield'].includes(row.kind)&&Number.isSafeInteger(row.ap)))select.append(new Option(`${item.name} · ${item.ap} PA`,item.id));
    select.value=current.struckItemId||'';
    select.addEventListener('change',()=>{
      const struckItemId=select.value||undefined,hitShield=(target.equipment||[]).find(item=>item.id===struckItemId&&item.kind==='shield');
      handlers.select({v5Context:{...current,struckItemId},...(hitShield?{protectionContext:{...(draft.protectionContext||{}),shieldId:hitShield.id,shieldAvailable:true,opposedWithShield:true,defenseProvided:true,ranged:draft.attackContext?.ranged===true}}:{})});
    });
    wrap.append(select);
    fields.append(wrap);
  }
  if(type==='attack'&&(action?.qualities||[]).some(row=>(typeof row==='string'?row:row?.id)==='entaille')&&target){
    const current=draft.v5Context||{},wrap=node('label','workspace-type','Entaille : dépenser 1 Élan pour +1 Hémorragique'),select=document.createElement('select');
    select.setAttribute('aria-label',wrap.textContent);
    select.append(new Option('Aucun Élan dépensé','0'),new Option('Dépenser 1 Élan','1'));
    select.value=String(current.entailleMomentumSpend||0);
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,entailleMomentumSpend:Number(select.value)}}));
    wrap.append(select);
    fields.append(wrap);
    fields.append(node('p','workspace-muted','V5 p.58 : un critique donne un Hémorragique; dépenser l’Élan donne exactement un Hémorragique supplémentaire, sans multiplicateur V4.'));
  }
  if(type==='attack'){
    const current=draft.v5Context||{},label=node('label','workspace-type','Cette arme est un filet à crochets (confirmation MJ)'),check=document.createElement('input');
    check.type='checkbox';
    check.checked=current.hookedNet===true;
    check.setAttribute('aria-label',label.textContent);
    check.addEventListener('change',()=>handlers.select({v5Context:{...current,hookedNet:check.checked}}));
    label.prepend(check);
    fields.append(label);
    fields.append(node('p','workspace-muted','Le catalogue ne décrit pas le profil à crochets : utilisez ce marqueur seulement après identification MJ de cette variante.'));
  }
  const entangledStates=(actor.states||[]).filter(state=>['enchevetre','empetre','entangled'].includes(String(state.key||state.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()));
  if(entangledStates.length&&(type==='test'||type==='skill')){
    const current=draft.v5Context||{},wrap=node('label','workspace-type','Sortie d’entrave : état Empêtré'),select=document.createElement('select');
    select.setAttribute('aria-label',wrap.textContent);
    select.append(new Option('Test ordinaire',''));
    for(const state of entangledStates)select.append(new Option(`${state.name||'Empêtré'} · Force ${state.strength??'à préciser'}`,state.id));
    select.value=current.netEscapeConditionId||'';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,netEscapeConditionId:select.value||undefined}}));
    wrap.append(select);
    fields.append(wrap);
    if(current.netEscapeConditionId){
      const state=entangledStates.find(row=>row.id===current.netEscapeConditionId),progress=actor.extensions?.v5?.netEscapeProgress?.[current.netEscapeConditionId]||0;
      const source=state?.source||{},sourceActor=(participants||[]).find(row=>row.id===source.authorId);
      const force=['wielder','mancatcher','garrote','druchii-net'].includes(source.entanglementKind)&&sourceActor?.caracs?.F!=null?Number(sourceActor.caracs.F):Number(state?.strength??source.escapeStrength);
      const score=force;
      const rollLabel=node('label','workspace-type',`Jet d100 opposé — Force ${Number.isFinite(score)?score:'à préciser'}${source.springLoaded?' · Mancatcher à ressort (+2 DR)':''}`),rollInput=document.createElement('input');
      rollInput.type='number';
      rollInput.min='1';
      rollInput.max='100';
      rollInput.step='1';
      rollInput.value=current.netEscapeOpponentRoll??'';
      rollInput.setAttribute('aria-label',rollLabel.textContent);
      rollInput.addEventListener('change',()=>handlers.select({v5Context:{...current,netEscapeOpponentRoll:rollInput.value===''?undefined:Number(rollInput.value)}}));
      rollLabel.append(rollInput);
      fields.append(rollLabel);
      if(state?.source?.hookedNet===true){
        const label=node('label','workspace-type','Filet à crochets : dégâts MJ (armure ignorée)'),input=document.createElement('input');
        input.type='number';
        input.min='0';
        input.step='1';
        input.value=current.hookedNetDamage??'';
        input.setAttribute('aria-label',label.textContent);
        input.addEventListener('change',()=>handlers.select({v5Context:{...current,hookedNetDamage:input.value===''?undefined:Number(input.value)}}));
        label.append(input);
        fields.append(label);
      }
      fields.append(node('p','workspace-muted',`L06 p.186 : ce Test est traité comme impliquant un mouvement. Gagnez l’opposition pour retirer Empêtré. Chaque DR après le premier retire un état supplémentaire. Les DR des tentatives précédentes ne se cumulent pas. En cas d’échec, rien ne change (décision MJ, V5). ${progress?'Ancienne progression ignorée.':''}`));
    }
  }
  const heldEntrapments=[
    ...(actor.equipment||[]).flatMap(weapon=>(weapon.extensions?.v5?.entanglementLocks||[]).map(linkId=>({weapon,linkId}))),
    ...(actor.extensions?.v5?.spellEffects||[]).flatMap(effect=>(effect.weaponLocks||[]).map(lock=>({weapon:{id:lock.weaponKey,name:(effect.grantedActions||[]).find(row=>row.extensions?.v5?.conjuredWeaponKey===lock.weaponKey)?.note||lock.weaponKey},linkId:lock.linkId,conjuredEffectId:effect.id})))
  ]
    .map(row=>({...row,condition:(participants||[]).flatMap(person=>(person.states||[]).map(state=>({person,state})))
      .find(entry=>entry.state.source?.linkId===row.linkId&&entry.state.source?.weaponId===row.weapon.id)})).filter(row=>row.condition);
  if(heldEntrapments.length){
    const current=draft.v5Context||{},wrap=node('label','workspace-type','Libération volontaire (L06 p.304)'),select=document.createElement('select');
    select.setAttribute('aria-label',wrap.textContent);
    select.append(new Option('Ne pas libérer',''));
    for(const row of heldEntrapments)select.append(new Option(`${row.weapon.name||'Arme'} · Empêtré sur ${row.condition.person.name||row.condition.person.id}`,row.linkId));
    select.value=current.releaseEntanglementLinkId||'';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,releaseEntanglementLinkId:select.value||undefined}}));
    wrap.append(select);
    fields.append(wrap);
    fields.append(node('p','workspace-muted','Cette option libère volontairement la cible et l’arme liée, sans Test de Force.'));
  }
  const validGrapple=link=>{
    if(!link||link.status!=='active'||!actor?.id||![link.initiatorId,link.targetId].includes(actor.id))return false;
    const initiator=participants.find(row=>row.id===link.initiatorId),held=participants.find(row=>row.id===link.targetId);
    const alive=subject=>subject&&subject.zone!=='bench'&&subject.extensions?.v5?.dead!==true&&(subject.hp===undefined||Number(subject.hp)>0);
    return alive(initiator)&&alive(held)&&(held.states||[]).some(state=>state.source?.linkId===link.id
      &&['enchevetre','entangled'].includes(String(state.key||state.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())&&Number(state.level??1)>0);
  };
  const actorHasActiveGrapple=participants.flatMap(row=>row.extensions?.v5?.grapples||[])
    .some(link=>[link.initiatorId,link.targetId].includes(actor?.id)&&validGrapple(link));
  if(['test','skill','defense','opposition'].includes(type)&&(isBrokenActor(actor)||actorHasActiveGrapple)&&!draft.reactionId){
    if(action?.id?.startsWith('broken-hide:'))fields.appendChild(node('p','workspace-muted','Le Test consomme l’Action du Tour : Oui (Hide facultatif).'));
    else contextField(fields,'actor','isAction','Le Test consomme l’Action du Tour');
  }
  const fateBalance=person=>{
    const permanent=Number(person?.extensions?.v5?.fate??person?.fate);
    if(!Number.isSafeInteger(permanent)||permanent<0)return 0;
    const temporary=[person?.extensions?.v5?.spellEffects,person?.extensions?.v5?.divineEffects].flatMap(rows=>Array.isArray(rows)?rows:[]).reduce((sum,effect)=>sum+Math.max(0,Number(effect?.remainingTempFate)||0),0);
    return permanent+temporary;
  };
  const actorFate=fateBalance(actor),targetFate=fateBalance(target);
  if ((actorFate > 0 || targetFate > 0) && !draft.reactionId && ['attack','test','skill','opposition'].includes(type)) {
    const current = draft.v5Context || {}, wrap = node('label','workspace-type','Dépenser 1 Destin');
    const select = document.createElement('select');
    select.setAttribute('aria-label',wrap.textContent);
    select.append(new Option('Ne pas dépenser',''));
    if(targetFate>0&&type==='attack')select.append(new Option('Annuler cette attaque (Destin de la cible)','cancel-attack'),new Option('Survivre et quitter la rencontre (Destin de la cible)','survive'));
    if(actorFate>0)select.append(new Option('Réussite automatique (Destin de l’acteur)','automatic-success'));
    select.value = current.fateAction || '';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,fateAction:select.value||undefined}}));
    wrap.append(select);
    fields.append(wrap);
    if(current.fateAction==='automatic-success'){
      const rollLabel=node('label','workspace-type','Résultat d100 choisi par le Destin (sans lancer les dés)'),rollInput=document.createElement('input');
      rollInput.type='number';
      rollInput.min='1';
      rollInput.max='100';
      rollInput.step='1';
      rollInput.value=current.fateChosenRoll??'';
      rollInput.setAttribute('aria-label',rollLabel.textContent);
      rollInput.addEventListener('change',()=>handlers.select({v5Context:{...current,fateChosenRoll:rollInput.value===''?undefined:Number(rollInput.value)}}));
      rollLabel.append(rollInput);
      fields.append(rollLabel);
    }
    if(current.fateAction==='automatic-success'&&type==='attack'&&isCriticalFateRoll(Number(current.fateChosenRoll))){
      const label=node('label','workspace-type','Localisation de la Blessure Critique (si le jet en inflige une)'),locationSelect=document.createElement('select');
      locationSelect.setAttribute('aria-label',label.textContent);
      locationSelect.append(new Option('Choisir…',''),new Option('Tête','head'),new Option('Corps','body'),new Option('Bras gauche','leftArm'),new Option('Bras droit','rightArm'),new Option('Jambe gauche','leftLeg'),new Option('Jambe droite','rightLeg'));
      locationSelect.value=current.fateCriticalLocation||'';
      locationSelect.addEventListener('change',()=>handlers.select({v5Context:{...current,fateCriticalLocation:locationSelect.value||undefined}}));
      label.append(locationSelect);
      fields.append(label);
    }
    fields.append(node('p','workspace-muted','Le Destin est permanent. Annuler une attaque ou survivre dépense le Destin de la cible ; la réussite automatique dépense celui de l’acteur.'));
  }
  conditionModeField(fields, 'actor');
  // Traits de sens : le moteur ne connaît ni les distances ni le mouvement, c'est le MJ qui le constate.
  if (target && carriesSense(target, 'chameleon')) contextField(fields, 'actor', 'targetMoving', 'La cible Caméléon se déplace (Perception pour la voir)');
  if (participants.some(person => person.id !== actor.id && carriesSense(person, 'distracting'))) contextField(fields, 'actor', 'distractingInRange', 'Un Perturbant est à portée (−2 DR, une seule fois)');
  // Traits de déplacement : le moteur ne connaît ni l'altitude ni le milieu, c'est le MJ qui le constate.
  if (kind.value === 'ranged' && carriesMovement(actor, 'fly')) contextField(fields, 'actor', 'airborne', 'Le tireur en Vol est en vol (−2 DR au tir)');
  if (kind.value === 'ranged' && target && carriesMovement(target, 'fly')) fields.appendChild(node('p', 'workspace-muted', 'Cible en Vol : pour la viser, la portée est décalée d’un cran.'));
  if (carriesMovement(actor, 'marine')) contextField(fields, 'actor', 'inWater', 'La Créature marine est dans l’eau');
  contextField(fields,'actor','blackpowderBrokenTest','Calme contre un tir À Poudre noire');
  if(draft.v5Context?.blackpowderBrokenTest){
    const current=draft.v5Context,wrap=node('label','workspace-type','Auteur du tir À Poudre noire'),select=document.createElement('select');
    select.setAttribute('aria-label',wrap.textContent);
    select.append(new Option('Choisir',''));
    for(const shooter of participants.filter(p=>p.id!==actor.id))select.append(new Option(shooter.name,shooter.id));
    select.value=current.blackpowderShooterId||'';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,blackpowderShooterId:select.value||undefined}}));
    wrap.append(select);
    fields.append(wrap);
  }
  if (kind.value === 'ranged' && target) {
    contextField(fields, 'actor', 'rangedOppositionAllowed', 'Tir opposé par Esquive confirmé par le MJ (tireur à moins de Bonus d’Initiative mètres de la cible, ou bouclier de 2 PA ou plus)');
    contextField(fields, 'actor', 'pointBlank', 'Tir à bout portant');
  }
  if (type === 'attack' && target) contextField(fields, 'actor', 'targetHelpless', 'Cible sans défense : situation vérifiée par le MJ');
  // Surnombre (L06 p. 167, BR-16) : le moteur ne suit pas l'engagement, le MJ coche les engagés avec la cible de chaque côté.
  if (type === 'attack' && kind.value === 'melee' && target && target.id !== actor.id) {
    const current = draft.v5Context || {};
    const engagedBoxes = (key, title, people) => {
      if (!people.length) return;
      fields.appendChild(node('p', 'workspace-muted', title));
      for (const person of people) {
        const label = node('label', 'workspace-type'), box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = (current[key] || []).includes(person.id);
        box.setAttribute('aria-label', `${title} ${person.name}`);
        box.addEventListener('change', () => {
          const ids = box.checked ? [...new Set([...(current[key] || []), person.id])] : (current[key] || []).filter(id => id !== person.id);
          // Plus de deuxième attaquant : la case « Cible encerclée » disparaît, son choix avec elle.
          handlers.select({ v5Context: { ...current, [key]: ids, ...(key === 'outnumberAttackerIds' && !ids.some(id => candidates.attackers.some(person => person.id === id)) ? { surrounded: undefined } : {}) } });
        });
        label.append(box, person.name);
        fields.appendChild(label);
      }
    };
    const candidates = engagedCandidates({ actor, target, participants, context: current });
    fields.appendChild(rubric('Surnombre (mêlée)'));
    engagedBoxes('outnumberAttackerIds', 'Engagés avec la cible, du côté de l’attaquant :', candidates.attackers);
    engagedBoxes('outnumberDefenderIds', 'Engagés avec eux, du côté de la cible :', candidates.defenders);
    if (candidates.attackers.some(person => (current.outnumberAttackerIds || []).includes(person.id))) contextField(fields, 'actor', 'surrounded', 'Cible encerclée, sans voie d’échappement (en général 3 attaquants, 2 en espace étroit : +2 DR)');
    const outnumber = planOutnumbering({ actor, target, participants, context: current });
    if (outnumber.summary) fields.appendChild(node('p', 'workspace-muted', outnumber.summary));
    fields.appendChild(node('p', 'workspace-muted', 'Désengagement (L06 p. 167) : Désavantage si l’on est en infériorité numérique ; impossible si l’on est encerclé (la Fuite reste possible). Rappel : le moteur n’a pas d’action de Désengagement.'));
  }
  if (['attack', 'opposition'].includes(type) && target) {
    fields.appendChild(rubric('Circonstances de la défense'));
    for (const [key, label] of [['involvesMovement','Le Test implique un mouvement'],['runningOrHiding','Le Test sert à fuir ou se cacher'],['reliesOnSight','Le Test est réalisable sans voir mais repose sur la vue'],['requiresSight','Le Test est impossible sans voir'],['usesFellowship','Le Test utilise la Sociabilité'],...(defense?.option?.value==='E'?[['festeringWounds','Test d’Endurance contre les Plaies purulentes (Souillé : Désavantage)']]:[])]) contextField(fields, 'defender', key, label);
    contextField(fields,'defender','offHandWeapon','Défense avec l’arme de la main non directrice (−2 DR sans Parade)');
    for (const field of sequelaContextFields(target)) if (!['reliesOnSight', 'requiresSight'].includes(field.key)) contextField(fields, 'defender', field.key, `Séquelle · ${field.label}`);
    if (participants.some(person => person.id !== target.id && carriesSense(person, 'distracting'))) contextField(fields, 'defender', 'distractingInRange', 'Un Perturbant est à portée du défenseur (−2 DR, une seule fois)');
    conditionModeField(fields, 'defender');
  }
  if (type === 'attack') {
    fields.appendChild(rubric('Circonstances de combat · L06 p.166'));
    if (kind.value === 'ranged') {
      const rangedWeapons = (actor?.equipment || []).filter(item => item?.kind === 'weapon' && String(item.range || '').trim());
      const rangedWeapon = actor?.equipment?.find(item => item?.id === action.extensions?.fiche?.equipmentId) || action.extensions?.equipment || (rangedWeapons.length === 1 ? rangedWeapons[0] : null);
      const rangeBands = computeV5WeaponRangeBands(draft.v5Context?.weaponRangeYards ?? rangedWeapon?.range ?? action.range, actor);
      choiceField(fields, 'shotRange', 'Bande de portée choisie par le MJ', [['point-blank','Bout portant'],['short','Courte'],['medium','Moyenne'],['long','Longue'],['extreme','Extrême']]);
      if (rangeBands) fields.appendChild(node('p', 'workspace-muted', `Bandes dérivées de la portée imprimée (${rangeBands.printedYards} m) : ${rangeBands.pointBlankYards === null ? 'Pas de bout portant (portée courte de 4 m ou moins)' : `Bout portant ≤ ${rangeBands.pointBlankYards} m (+2 DR)`} · Courte ≤ ${rangeBands.shortYards} m (+1 DR) · Moyenne ≤ ${rangeBands.mediumYards} m (0 DR) · Longue ≤ ${rangeBands.longYards} m (−1 DR) · Extrême ≤ ${rangeBands.extremeYards} m (−2 DR).`));
      if ((rangedWeapon?.keywords || []).some(row => (typeof row === 'string' ? row : row?.id) === 'a-repetition')) {
        contextField(fields, 'actor', 'repeaterDoubleShot', 'À répétition : tir double (deux tirs sur la même cible à −1 DR, une seule Action)');
        if (draft.v5Context?.repeaterDoubleShot === true) {
          const firstShots = previousWeaponAttacks.filter(row => row.weaponId === rangedWeapon?.id && row.targetId === target.id && row.actionType === 'attack');
          const second = node('label', 'workspace-type', 'Premier tir du tir double (le tir actuel est alors le second, gratuit et sans Élan)'), secondSelect = document.createElement('select');
          secondSelect.setAttribute('aria-label', second.textContent);
          secondSelect.append(new Option('Premier tir (ou choisir le tir déjà appliqué…)', ''));
          for (const row of firstShots) secondSelect.append(new Option(`${row.weaponName || 'Tir'} · ${row.hit ? 'touche' : 'raté'}`, row.actionId));
          secondSelect.value = draft.v5Context?.primaryResolutionId || '';
          secondSelect.addEventListener('change', () => {
            const current = draft.v5Context || {}, chosen = secondSelect.value;
            handlers.select({ extraAttack: Boolean(chosen), v5Context: { ...current, primaryResolutionId: chosen || undefined, repeaterSecondShot: chosen ? true : undefined, freeAttackTalent: chosen ? 'repeater-double' : undefined } });
          });
          second.appendChild(secondSelect);
          fields.appendChild(second);
        }
      }
      choiceField(fields, 'weather', 'Météo', [['normal','Aucune pénalité'],['fog','Brouillard (−1 DR)'],['rain-wind','Pluie ou vent (−2 DR)'],['extreme','Météo extrême (−3 DR)']]);
      choiceField(fields, 'lighting', 'Lumière', [['normal','Aucune pénalité'],['fog','Faible lumière (−1 DR)'],['dim','Pénombre (−1 DR)'],['dark','Noir total (−3 DR)']]);
      fields.appendChild(node('p', 'workspace-muted', 'Météo et lumière partagent une seule ligne du tableau : seule la pénalité la plus sévère s’applique. La portée est un choix du MJ; l’application ne suit pas la distance.'));
      const covered = node('label', 'workspace-type', 'La cible est à couvert ou À Terre (−1 DR, une seule fois)');
      const cover = document.createElement('input');
      cover.type = 'checkbox';
      cover.checked = Number(draft.v5Context?.penalties?.cover || draft.v5Context?.penalties?.targetProne) < 0;
      cover.setAttribute('aria-label', covered.textContent);
      cover.addEventListener('change', () => {
        const current = draft.v5Context || {}, penalties = { ...(current.penalties || {}) };
        delete penalties.targetProne;
        if (cover.checked) penalties.cover = -1; else delete penalties.cover;
        handlers.select({ v5Context: { ...current, penalties } });
      });
      covered.prepend(cover);
      fields.appendChild(covered);
      const moved = node('label', 'workspace-type', 'Tireur déplacé avant ce tir (−1 DR)');
      const movedBox = document.createElement('input');
      movedBox.type = 'checkbox';
      movedBox.checked = draft.v5Context?.movedBeforeRangedAttack === true;
      movedBox.setAttribute('aria-label', moved.textContent);
      movedBox.addEventListener('change', () => handlers.select({ v5Context: { ...(draft.v5Context || {}), movedBeforeRangedAttack: movedBox.checked } }));
      moved.prepend(movedBox);
      fields.appendChild(moved);
      if (hasV5Talent(actor, 'talent-sharpshooter')) {
        const extraordinary = node('label', 'workspace-type', 'Tir extraordinaire selon Tireur d’élite');
        const enabled = document.createElement('input');
        enabled.type = 'checkbox';
        enabled.checked = draft.v5Context?.extraordinaryShot === true;
        enabled.setAttribute('aria-label', extraordinary.textContent);
        enabled.addEventListener('change', () => handlers.select({ v5Context: { ...(draft.v5Context || {}), extraordinaryShot: enabled.checked } }));
        extraordinary.prepend(enabled);
        fields.appendChild(extraordinary);
        if (enabled.checked) {
          const description = node('label', 'workspace-type', 'Décrire le Tir extraordinaire');
          const text = document.createElement('input');
          text.type = 'text';
          text.value = draft.v5Context?.extraordinaryShotDescription || '';
          text.setAttribute('aria-label', description.textContent);
          text.addEventListener('change', () => handlers.select({ v5Context: { ...(draft.v5Context || {}), extraordinaryShotDescription: text.value } }));
          description.appendChild(text);
          fields.appendChild(description);
          const difficulty = node('label', 'workspace-type', 'Difficulté du Tir extraordinaire (DR signés)');
          const value = document.createElement('input');
          value.type = 'number';
          value.step = '1';
          value.max='0';
          value.value = draft.v5Context?.extraordinaryShotDifficulty ?? '';
          value.setAttribute('aria-label', difficulty.textContent);
          value.addEventListener('change', () => handlers.select({ v5Context: { ...(draft.v5Context || {}), extraordinaryShotDifficulty: value.value === '' ? undefined : Number(value.value) } }));
          difficulty.appendChild(value);
          fields.appendChild(difficulty);
        }
      }
      const throwing = node('label', 'workspace-type', 'Il s’agit d’une arme de jet (dispersion seulement si le tir échoue)');
      const thrownWeapon=actor.equipment?.find(item=>item.id===action.extensions?.fiche?.equipmentId)||action.extensions?.equipment;
      const knownThrowing=weaponSkillGroupInfo(thrownWeapon?.category||draft.v5Context?.weaponGroup||action.category,thrownWeapon)?.specialty==='Lancer';
      const throwingBox = document.createElement('input');
      throwingBox.type='checkbox';
      throwingBox.checked=draft.v5Context?.throwingWeapon===true;
      throwingBox.setAttribute('aria-label',throwing.textContent);
      throwingBox.addEventListener('change',()=>handlers.select({v5Context:{...(draft.v5Context||{}),throwingWeapon:throwingBox.checked}}));
      throwing.prepend(throwingBox);
      fields.appendChild(throwing);
      if(knownThrowing){
        throwingBox.checked=true;
        throwingBox.disabled=true;
      }
      if (knownThrowing||draft.v5Context?.throwingWeapon === true) {
        choiceField(fields,'scatterDirectionRoll','Déviation d10 (direction relative à la cible)',[[1,'1 · haut-gauche'],[2,'2 · haut'],[3,'3 · haut-droite'],[4,'4 · gauche'],[5,'5 · droite'],[6,'6 · bas-gauche'],[7,'7 · bas'],[8,'8 · bas-droite'],[9,'9 · aux pieds du tireur'],[10,'10 · aux pieds de la cible']]);
        const rolls = draft.v5Context?.scatterDistanceRolls || [];
        for (let index=0; index<2; index++) {
          const label=node('label','workspace-type',`Dispersion · d10 ${index+1} (mètres)`),input=document.createElement('input');
          input.type='number';
          input.min='1';
          input.max='10';
          input.value=rolls[index]??'';
          input.setAttribute('aria-label',label.textContent);
          input.addEventListener('change',()=>{
            const next=[...(draft.v5Context?.scatterDistanceRolls||[])];
            next.length=2;
            next[index]=input.value===''?null:Number(input.value);
            handlers.select({v5Context:{...(draft.v5Context||{}),scatterDistanceRolls:next}});
          });
          label.appendChild(input);
          fields.appendChild(label);
        }
        const label=node('label','workspace-type','Distance cible-tireur confirmée par le MJ (mètres; nécessaire pour plafonner la dispersion)');
        const distance=document.createElement('input');
        distance.type='number';
        distance.min='0';
        distance.step='1';
        distance.value=draft.v5Context?.shooterTargetDistanceYards??'';
        distance.setAttribute('aria-label',label.textContent);
        distance.addEventListener('change',()=>handlers.select({v5Context:{...(draft.v5Context||{}),shooterTargetDistanceYards:distance.value===''?null:Number(distance.value)}}));
        label.appendChild(distance);
        fields.appendChild(label);
        fields.appendChild(node('p','workspace-muted','Le reçu conserve les dés, la distance obtenue et le plafond; le pion n’est pas déplacé automatiquement. Pour un résultat aux pieds du tireur ou de la cible, aucun repère de distance n’est requis.'));
      }
      contextField(fields, 'actor', 'targetEngaged', 'La cible est engagée au corps à corps (Désavantage au tir)');
      contextField(fields, 'actor', 'engagedWithShooter', 'La cible est engagée avec le tireur (le tir se résout comme une mêlée : Corps à corps opposé, pas de Désavantage de tir dans la mêlée)');
      if (draft.v5Context?.targetEngaged === true && draft.v5Context?.engagedWithShooter !== true && target) {
        const current = draft.v5Context || {}, engagedIds = new Set(current.engagedTargetIds || [target.id]);
        engagedIds.add(target.id);
        fields.appendChild(node('p', 'workspace-muted', 'Cochez les combattants effectivement engagés, alliés compris. Le jet de choix est saisi une fois et reste stable au recalcul.'));
        for (const person of participants.filter(row => row.zone === 'active' && row.id !== actor.id)) {
          const label = node('label', 'workspace-type', `${person.name} · ${person.kind === 'PJ' ? 'Personnage joueur' : 'Personnage non joueur'}${person.camp ? ` · ${person.camp}` : ''}`), check = document.createElement('input');
          check.type = 'checkbox';
          check.checked = engagedIds.has(person.id);
          check.disabled = person.id === target.id;
          check.setAttribute('aria-label', `Engagé avec la cible : ${person.name}`);
          check.addEventListener('change', () => {
            const next = new Set(draft.v5Context?.engagedTargetIds || [target.id]);
            if (check.checked) next.add(person.id); else next.delete(person.id);
            next.add(target.id);
            handlers.select({ v5Context: { ...(draft.v5Context || {}), engagedTargetIds: [...next] } });
          });
          label.prepend(check);
          fields.appendChild(label);
          if (person.id !== target.id && engagedIds.has(person.id)) {
            const defense = current.engagedDefensesById?.[person.id] || {};
            const kindLabel = node('label', 'workspace-type', `Défense de ${person.name}`), kindSelect = document.createElement('select');
            kindSelect.setAttribute('aria-label', `Type de défense de ${person.name}`);
            kindSelect.append(new Option('Esquive / autre Test','test'),new Option('Corps à corps','melee'));
            kindSelect.value = defense.v5?.kind || 'test';
            const baseLabel = node('label','workspace-type',`Score de défense de ${person.name}`), baseInput = document.createElement('input');
            baseInput.type='number';
            baseInput.min='0';
            baseInput.max='200';
            baseInput.value=defense.base??'';
            baseInput.setAttribute('aria-label',baseLabel.textContent);
            const rollLabel = node('label','workspace-type',`Jet de défense d100 de ${person.name}`), rollInput = document.createElement('input');
            rollInput.type='number';
            rollInput.min='1';
            rollInput.max='100';
            rollInput.value=defense.roll??'';
            rollInput.setAttribute('aria-label',rollLabel.textContent);
            const saveDefense = () => {
              const all = { ...(draft.v5Context?.engagedDefensesById || {}) };
              all[person.id] = { base: baseInput.value === '' ? null : Number(baseInput.value), roll: rollInput.value === '' ? null : Number(rollInput.value), label: kindSelect.value === 'melee' ? 'Corps à corps' : 'Esquive', v5: { kind: kindSelect.value, choice: 'keep' } };
              handlers.select({ v5Context: { ...(draft.v5Context || {}), engagedDefensesById: all } });
            };
            kindSelect.addEventListener('change', saveDefense);
            baseInput.addEventListener('change', saveDefense);
            rollInput.addEventListener('change', saveDefense);
            kindLabel.appendChild(kindSelect);
            baseLabel.appendChild(baseInput);
            rollLabel.appendChild(rollInput);
            fields.append(kindLabel,baseLabel,rollLabel);
          }
        }
        const rollLabel = node('label','workspace-type','Jet d100 pour désigner le combattant touché');
        const roll = document.createElement('input');
        roll.type='number';
        roll.min='1';
        roll.max='100';
        roll.value=current.engagedTargetRoll??'';
        roll.setAttribute('aria-label',rollLabel.textContent);
        roll.addEventListener('change',()=>handlers.select({v5Context:{...(draft.v5Context||{}),engagedTargetRoll:roll.value===''?null:Number(roll.value)}}));
        rollLabel.appendChild(roll);
        fields.appendChild(rollLabel);
      }
    } else if (kind.value === 'melee') {
      choiceField(fields, 'height', 'Hauteur relative', [['attacker','Attaquant plus haut (+1 DR)'],['defender','Défenseur plus haut (−1 DR)']]);
      contextField(fields, 'actor', 'difficultTerrain', 'Terrain difficile (−1 DR)');
      contextField(fields, 'actor', 'narrowSpace', 'Espace exigu (choix du MJ)');
      if (draft.v5Context?.narrowSpace === true) choiceField(fields, 'weaponReachBand', 'Allonge de l’arme dans cet espace', [['very-short','Très courte (aucun malus)'],['short','Courte (aucun malus)'],['average','Moyenne (−1 DR)'],['superior','Supérieure (−2 DR)']]);
      const equipmentId = action.extensions?.fiche?.equipmentId, meleeWeapons = (actor?.equipment || []).filter(item => item?.kind === 'weapon' && String(item.reach || '').trim());
      const currentWeapon = actor?.equipment?.find(item => item?.id === equipmentId) || action.extensions?.equipment || (meleeWeapons.length === 1 ? meleeWeapons[0] : null);
      const reachGuide = computeV5WeaponReachGuide(draft.v5Context?.weaponReach || currentWeapon?.reach || action.reach);
      if (reachGuide) fields.appendChild(node('p', 'workspace-result-line', reachGuide.text));
      fields.appendChild(node('p', 'workspace-muted', 'Repères imprimés : allonge Très longue = 4 m, Massive = 6. Les bandes servent d’aide au MJ; la position et la distance ne sont pas suivies.'));
    }
    if(type==='attack'&&['melee','ranged'].includes(kind.value)) {
      const offHand = node('label', 'workspace-type', 'Attaque avec la main secondaire (−2 DR selon les règles)');
      const offHandBox = document.createElement('input');
      offHandBox.type = 'checkbox';
      offHandBox.checked = Number(draft.v5Context?.penalties?.offHand) === -2;
      offHandBox.setAttribute('aria-label', offHand.textContent);
      offHandBox.addEventListener('change', () => {
        const current = draft.v5Context || {}, penalties = { ...(current.penalties || {}) };
        if (offHandBox.checked) penalties.offHand = -2; else delete penalties.offHand;
        handlers.select({ v5Context: { ...current, penalties } });
      });
      offHand.prepend(offHandBox);
      fields.appendChild(offHand);
      const equipmentId=action.extensions?.fiche?.equipmentId,allWeapons=(actor?.equipment||[]).filter(item=>item?.kind==='weapon');
      const currentWeapon=allWeapons.find(item=>item.id===equipmentId)||action.extensions?.equipment||(allWeapons.length===1?allWeapons[0]:null);
      const oneHanded=weaponHandsForParticipant(currentWeapon,actor,{action,context:draft.v5Context})===1;
      const eligiblePrimaries=previousWeaponAttacks.filter(row=>{
        if(!row.weaponId||row.weaponId===equipmentId)return false;
        const primaryWeapon=allWeapons.find(item=>item.id===row.weaponId);
        return weaponHandsForParticipant(primaryWeapon,actor)===1;
      });
      if(oneHanded&&eligiblePrimaries.length) {
        const primary = node('label', 'workspace-type', 'Attaque précédente pour l’attaque immédiate de l’autre arme');
        const select = document.createElement('select');
        select.setAttribute('aria-label', primary.textContent);
        select.append(new Option('Choisir l’attaque déjà appliquée…', ''));
        for (const row of eligiblePrimaries) select.append(new Option(`${row.weaponName} · ${row.hit ? 'touche' : 'ratée'}`, row.actionId));
        select.value = draft.v5Context?.primaryResolutionId || '';
        select.addEventListener('change', () => {
          const first=eligiblePrimaries.find(row=>row.actionId===select.value);
          handlers.select({ extraAttack: Boolean(select.value), v5Context: { ...(draft.v5Context || {}), primaryResolutionId: select.value || undefined, secondWeaponAttack: Boolean(select.value),dualWielding:Boolean(select.value)||draft.v5Context?.dualWielding===true,firstWeaponAttackHit:first?.hit===true } });
        });
        primary.appendChild(select);
        fields.appendChild(primary);
        fields.appendChild(node('p', 'workspace-muted', 'Une arme différente utilisable à une main; coût de l’attaque supplémentaire : 1 Élan. Une seule attaque de seconde arme par Tour, même si l’Élan est regagné.'));
      } else if(oneHanded) fields.appendChild(node('p','workspace-muted','Aucune attaque d’une autre arme à une main de ce Tour n’est disponible pour la seconde arme.'));
      else if(currentWeapon)fields.appendChild(node('p','workspace-muted','La seconde attaque exige une arme actuelle utilisable à une main.'));
    }
    if (target && (kind.value === 'melee' || kind.value === 'ranged')) {
      const current=draft.v5Context||{}, helpless=current.targetHelpless===true||(target.states||[]).some(row=>['inconscient','unconscious'].includes(row.key));
      fields.appendChild(rubric('Issue létale · confirmation MJ'));
      fields.appendChild(node('p','workspace-muted','L’option létale est désactivée par défaut. Une intention létale demande une activation distincte de la règle de table, puis une confirmation explicite de la mort. Valable contre une cible sans défense en mêlée ou à bout portant.'));
      const checkbox=(text,key)=>{
        const label=node('label','workspace-type',text),check=document.createElement('input');
        check.type='checkbox';
        check.checked=current[key]===true;
        check.setAttribute('aria-label',text);
        check.addEventListener('change',()=>handlers.select({v5Context:{...(draft.v5Context||{}),[key]:check.checked,...(['lethalIntent','lethalTableEnabled'].includes(key)&&!check.checked?{confirmLethalDeath:false}:{})}}));
        label.prepend(check);
        fields.appendChild(label);
        return check;
      };
      checkbox('Activer l’option létale de la table pour cette résolution','lethalTableEnabled');
      checkbox('Déclarer une intention létale contre '+target.name,'lethalIntent');
      if(helpless&&current.lethalTableEnabled===true&&current.lethalIntent===true)checkbox('Je confirme explicitement la mort de '+target.name,'confirmLethalDeath');
      else if(current.lethalIntent===true&&!helpless)fields.appendChild(node('p','workspace-field-error','La cible doit être déclarée sans défense avant la confirmation explicite.'));
    }
  }
  contextual.appendChild(fields);
  v5.appendChild(contextual);
  if(type==='attack'&&target&&draft.charging&&hasV5Talent(target,'talent-slayer')&&!draft.beatBlade){if(!sizesShown)sizeSelects();}
  if(type==='attack'&&target){
    const guards=participants.filter(p=>p.id!==actor.id&&p.id!==target.id&&p.camp===target.camp&&hasV5Talent(p,'talent-kingsguard'));
    for(const guard of guards){
      const label=node('label','workspace-type');
      const check=document.createElement('input');
      check.type='checkbox';
      check.checked=(draft.v5Context?.nearbyGuardIds||[]).includes(guard.id);
      check.setAttribute('aria-label','Garde royal à deux mètres : '+guard.name);
      check.addEventListener('change',()=>{
        const ids=(draft.v5Context?.nearbyGuardIds||[]).filter(id=>id!==guard.id);
        if(check.checked)ids.push(guard.id);
        handlers.select({v5Context:{...draft.v5Context,nearbyGuardIds:ids}});
      });
      label.append(check,'Garde royal à deux mètres : '+guard.name);
      v5.append(label);
    }
  }
  const current={...(action.extensions?.v5?.initialContext||{}),...(draft.v5Context||{})};
  if(['frightening','large-fear','stomp','large-disengage'].includes(current.talentAction)||naturalAttackNeedsSize(draft.v5Context?.naturalAttack)||['disarm'].includes(current.specialAttack)||hasV5Talent(actor,'talent-large')||hasV5Talent(target,'talent-large')||hasV5Talent(actor,'talent-small')||hasV5Talent(target,'talent-small')||current.specialAttack==='whirlwind-of-death'&&participants.some(p=>(current.engagedIds||[]).includes(p.id)&&hasV5Talent(p,'talent-small'))){if(!sizesShown)sizeSelects();}
  if(current.talentAction==='frenzy' && magicTalentRank(actor,'suffuse-with','Aqshy')){
    const label=node('label','workspace-type','Compétence du Test de Frénésie'),select=document.createElement('select');
    select.setAttribute('aria-label',label.textContent);
    select.append(new Option('Force Mentale','FM'),new Option('Focalisation (Aqshy)','Aqshy'));
    select.value=current.magicSuffusedWind==='Aqshy'?'Aqshy':'FM';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,magicSuffusedWind:select.value==='Aqshy'?'Aqshy':null}}));
    label.append(select);
    v5.append(label);
  }
  const activations=(actor.talents||[]).filter(t=>V5_ACTIVATED_TALENTS[t.id]);
  if(magicTalentRank(actor,'suffuse-with','Aqshy') && !activations.some(t=>t.id==='talent-frenzy'))activations.push({id:'talent-frenzy'});
  if(activations.length){
    const label=node('label','workspace-type','Activation de talent');
    const select=document.createElement('select');
    select.setAttribute('aria-label',label.textContent);
    select.append(new Option('Aucune','none'));
    for(const row of activations)select.append(new Option(V5_ACTIVATED_TALENTS[row.id],row.id.slice(7)));
    if((actor.states||[]).some(s=>s.key==='frenzy'))select.append(new Option('Terminer la Frénésie','end-frenzy'));
    select.value=current.talentAction||'none';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,talentAction:select.value}}));
    label.append(select);
    v5.append(label);
    if(current.talentAction==='crew-commander'){
      contextField(v5,'actor','crewWithinVoice','Arme à équipage à portée de voix');
      const label=node('label','workspace-type','Compétence de tir du commandant');
      const input=document.createElement('input');
      input.type='number';
      input.min='0';
      input.max='200';
      input.value=current.crewRangedBase??'';
      input.setAttribute('aria-label',label.textContent);
      input.addEventListener('change',()=>handlers.select({v5Context:{...current,crewRangedBase:input.value===''?undefined:Number(input.value)}}));
      label.append(input);
      v5.append(label);
    }
    function talentNumber(key,label,min=0,max=10){
      const wrap=node('label','workspace-type',label),input=document.createElement('input');
      input.type='number';
      input.min=String(min);
      input.max=String(max);
      input.step='1';
      input.value=current[key]??'';
      input.setAttribute('aria-label',label);
      input.addEventListener('change',()=>handlers.select({v5Context:{...current,[key]:input.value===''?undefined:Number(input.value)}}));
      wrap.append(input);
      v5.append(wrap);
    }
    if(current.talentAction==='argumentative')contextField(v5,'actor','debateBegun','Débat effectivement engagé');
    if(current.talentAction==='blather'){
      contextField(v5,'actor','caughtInAct','Pris en faute');
      talentNumber('targetWillpowerBonus','BFM de la cible si absent de la fiche',0,20);
      const wrap=node('label','workspace-type','Unité de durée de conviction'),select=document.createElement('select');
      select.setAttribute('aria-label',wrap.textContent);
      select.append(new Option('Choisir',''),new Option('Tours','turn'),new Option('Minutes','minute'));
      select.value=current.convictionUnit||'';
      select.addEventListener('change',()=>handlers.select({v5Context:{...current,convictionUnit:select.value||undefined}}));
      wrap.append(select);
      v5.append(wrap);
    }
    if(current.talentAction==='martial-arts'){
      contextField(v5,'actor','beginningOfTurn','Début du combat ou de votre Tour');
      const wrap=node('label','workspace-type','Atout d’Arts martiaux connu'),select=document.createElement('select');
      select.setAttribute('aria-label',wrap.textContent);
      select.append(new Option('Choisir',''));
      for(const id of knownV5MartialQualities(actor))select.append(new Option(qualityLabel({id}),id));
      select.value=current.martialQuality||'';
      select.addEventListener('change',()=>handlers.select({v5Context:{...current,martialQuality:select.value||undefined}}));
      wrap.append(select);
      v5.append(wrap);
      if(select.options.length===1)v5.append(node('p','workspace-muted','Aucun Atout appris n’est renseigné dans la fiche importée.'));
    }
    if(current.talentAction==='combat-reflexes'){
      contextField(v5,'actor','beginningOfCombat','Début du combat');
      talentNumber('initiativeFirst','Premier d10 d’Initiative',1,10);
      talentNumber('initiativeSecond','Deuxième d10 d’Initiative',1,10);
      const wrap=node('label','workspace-type','Résultat d’Initiative choisi'),select=document.createElement('select');
      select.setAttribute('aria-label',wrap.textContent);
      select.append(new Option('Choisir',''),new Option('Premier d10','first'),new Option('Deuxième d10','second'));
      select.value=current.initiativeChoice||'';
      select.addEventListener('change',()=>handlers.select({v5Context:{...current,initiativeChoice:select.value||undefined}}));
      wrap.append(select);
      v5.append(wrap);
    }
    if(current.talentAction==='drilled')for(const ally of participants.filter(p=>p.id!==actor.id&&p.camp===actor.camp&&hasV5Talent(p,'talent-drilled'))){
      const label=node('label','workspace-type'),check=document.createElement('input');
      check.type='checkbox';
      check.checked=(current.shoulderAllyIds||[]).includes(ally.id);
      check.setAttribute('aria-label','Allié au coude-à-coude : '+ally.name);
      check.addEventListener('change',()=>handlers.select({v5Context:{...current,shoulderAllyIds:check.checked?[...new Set([...(current.shoulderAllyIds||[]),ally.id])]:(current.shoulderAllyIds||[]).filter(id=>id!==ally.id)}}));
      label.append(check,ally.name+' au coude-à-coude');
      v5.append(label);
    }
    if(current.talentAction==='end-frenzy')contextField(v5,'actor','nearbyEnemiesDefeated','Tous les ennemis proches sont vaincus');
    if(current.talentAction==='distract')contextField(v5,'actor','withinTwoYards','Cible à deux mètres maximum');
  }
  if((actor.talents||[]).some(t=>['talent-strong-minded','talent-resistant'].includes(t.id))){
    const label=node('label','workspace-type','Talent à choisir avant le jet');
    const select=document.createElement('select');
    select.setAttribute('aria-label',label.textContent);
    select.append(new Option('Aucun','none'));
    if(hasV5Talent(actor,'talent-strong-minded'))select.append(new Option('Obstiné : ignorer les modificateurs négatifs','strong-minded'));
    if(hasV5Talent(actor,'talent-resistant'))select.append(new Option('Résistance : réussite automatique','resistant'));
    select.value=current.preRollTalent||'none';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,preRollTalent:select.value}}));
    label.append(select);
    v5.append(label);
    const start=button('Commencer une nouvelle séance','workspace-ghost');
    start.addEventListener('click',()=>handlers.startTalentSession());
    v5.append(start);
  }
  if((actor.states||[]).some(s=>s.key==='frenzy')){
    const label=node('label','workspace-type','Ennemi le plus proche'),select=document.createElement('select');
    select.setAttribute('aria-label',label.textContent);
    select.append(new Option('Choisir',''));
    for(const p of participants.filter(p=>p.camp!==actor.camp&&Number(p.hp)>0))select.append(new Option(p.name,p.id));
    select.value=current.nearestEnemyId||'';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,nearestEnemyId:select.value||undefined}}));
    label.append(select);
    v5.append(label);
  }
  if((actor.states||[]).some(s=>s.key==='frenzy'))contextField(v5,'actor','mandatoryTest','Test obligatoire imposé par les règles pendant la Frénésie');
  if(type==='attack'&&(actor.states||[]).some(s=>s.key==='frenzy')){
    const label=node('label','workspace-type');
    const check=document.createElement('input');
    check.type='checkbox';
    check.checked=current.freeAttackTalent==='frenzy';
    check.setAttribute('aria-label','Attaque gratuite de Frénésie');
    check.addEventListener('change',()=>handlers.select({extraAttack:check.checked,v5Context:{...current,freeAttackTalent:check.checked?'frenzy':undefined}}));
    label.append(check,'Attaque gratuite de Frénésie (une par Round)');
    v5.append(label);
  }
  // Fureur d’Ulric : d10 de dégâts explosif (relancé et ajouté sur 10) du premier coup de mêlée touché du Tour, saisi en Frénésie.
  if(type==='attack'&&(actor.states||[]).some(s=>s.key==='frenzy')&&(actor.extensions?.v5?.divineEffects||[]).some(layer=>layer?.frenzyFury)){
    const label=node('label','workspace-type','Fureur d’Ulric : d10 de dégâts (ex. 10,4)');
    const input=document.createElement('input');
    input.type='text';
    input.value=(draft.v5Context?.ulricFuryDice||[]).join(',');
    input.setAttribute('aria-label',label.textContent);
    input.addEventListener('change',()=>{
      const text=input.value.trim();
      const dice=text===''?[]:text.split(',').map(part=>Number(part.trim())).filter(part=>Number.isInteger(part));
      handlers.select({v5Context:{...draft.v5Context,ulricFuryDice:text===''?undefined:dice}});
    });
    label.append(input);
    v5.append(label);
  }
  // Attaque rapide (Myrmidia) : attaque gratuite hors séquence, proposée seulement si l’acteur porte la couche freeAttack du miracle.
  if(type==='attack'&&(actor.extensions?.v5?.divineEffects||[]).some(layer=>layer?.freeAttack)){
    const quick=current.freeAttackTalent==='divine-free-attack';
    const label=node('label','workspace-type');
    const check=document.createElement('input');
    check.type='checkbox';
    check.checked=quick;
    check.setAttribute('aria-label','Attaque rapide (Myrmidia) : attaque gratuite hors séquence');
    check.addEventListener('change',()=>handlers.select({extraAttack:check.checked,v5Context:{...current,freeAttackTalent:check.checked?'divine-free-attack':undefined}}));
    label.append(check,'Attaque rapide (Myrmidia) : attaque gratuite hors séquence');
    v5.append(label);
    if(quick){
      const test=node('label','workspace-type','Test d’Initiative (+0 DR) de l’Attaque rapide');
      const select=document.createElement('select');
      select.setAttribute('aria-label','Test d’Initiative (+0 DR) de l’Attaque rapide');
      select.append(new Option('À saisir',''),new Option('Échec','fail'),new Option('Réussite','pass'));
      const saved=current.freeAttackTest;
      select.value=saved?(saved.success?'pass':'fail'):'';
      select.addEventListener('change',()=>handlers.select({v5Context:{...current,freeAttackTest:select.value===''?undefined:{success:select.value==='pass'}}}));
      test.append(select);
      v5.append(test);
      const hand=node('label','workspace-type');
      const handCheck=document.createElement('input');
      handCheck.type='checkbox';
      handCheck.checked=current.mainHand===true;
      handCheck.setAttribute('aria-label','Attaque rapide : arme de la main principale');
      handCheck.addEventListener('change',()=>handlers.select({v5Context:{...current,mainHand:handCheck.checked}}));
      hand.append(handCheck,'Attaque rapide : arme de la main principale');
      v5.append(hand);
    }
  }
  if(type==='skill'&&hasV5Talent(actor,'talent-robust')){
    contextField(v5,'actor','recoveryTest','Ce Test sert à récupérer des Blessures');
    if(current.recoveryTest){
      const wrap=node('label','workspace-type','Blessures normalement récupérées par ce Test'),input=document.createElement('input');
      input.type='number';
      input.min='0';
      input.step='1';
      input.value=current.recoveredWounds??'';
      input.setAttribute('aria-label',wrap.textContent);
      input.addEventListener('change',()=>handlers.select({v5Context:{...current,recoveredWounds:input.value===''?undefined:Number(input.value)}}));
      wrap.append(input);
      v5.append(wrap);
      const label=node('label','workspace-type','Robuste : récupérer 2 Blessures supplémentaires'),select=document.createElement('select');
      select.setAttribute('aria-label',label.textContent);
      select.append(new Option('Choisir',''),new Option('Oui','true'),new Option('Non','false'));
      const key='talent-robust:extra-healing';
      select.value=typeof draft.talentChoices?.[key]==='boolean'?String(draft.talentChoices[key]):'';
      select.addEventListener('change',()=>handlers.select({talentChoices:{...draft.talentChoices,[key]:select.value===''?undefined:select.value==='true'}}));
      label.append(select);
      v5.append(label);
    }
  }
  if(type==='attack'&&hasV5Talent(actor,'talent-dual-wielder')){
    contextField(v5,'actor','dualWielding','Combat avec deux armes');
    contextField(v5,'actor','weaponDagger','Arme utilisée : dague ou couteau (arbitrage MJ)');
    contextField(v5,'actor','secondWeaponAttack','Attaque avec la seconde arme');
    const label=node('label','workspace-type'),check=document.createElement('input');
    check.type='checkbox';
    check.checked=current.freeAttackTalent==='dual-wielder';
    check.setAttribute('aria-label','Attaque de seconde arme sans Élan');
    check.addEventListener('change',()=>handlers.select({extraAttack:check.checked,v5Context:{...current,freeAttackTalent:check.checked?'dual-wielder':undefined}}));
    label.append(check,'Attaque de seconde arme sans Élan');
    v5.append(label);
  }
  if(type==='attack'&&psychologyTraits(actor).some(t=>t.key==='grim')){
    const label=node('label','workspace-type'),check=document.createElement('input');
    check.type='checkbox';
    check.checked=current.freeAttackTalent==='grim';
    check.setAttribute('aria-label','Attaque gratuite de Grim : sans perdre l’Élan');
    check.addEventListener('change',()=>handlers.select({extraAttack:check.checked,v5Context:{...current,freeAttackTalent:check.checked?'grim':undefined}}));
    label.append(check,'Attaque gratuite de Grim : sans perdre l’Élan (il faut en avoir ; une seule par Tour, limite posée par l’outil, le livre p.358 n’en pose pas)');
    v5.append(label);
  }
  const penalties=node('details','workspace-v5-context-details');
  penalties.append(node('summary','','Pénalités de situation en DR'));
  const addPenaltyFields=(role)=>{
    const field=role==='actor'?'v5Context':'defenseContext',current=draft[field]||{};
    for(const [key,text]of [['mounted','Esquive montée'],['confined','Espace exigu'],['status','Statut supérieur'],['proneAttack','Attaque À terre'],['belowTarget','Attaque sous la cible'],['longRange','Longue portée'],['extremeRange','Portée extrême'],['flying','Tir sous Trait Vol'],['terrainMovement','Terrain gênant le mouvement'],['critical','Blessure critique'],['amputation','Amputation']]){
      if(role==='actor'&&['belowTarget','terrainMovement'].includes(key))continue;
      if(role==='defender'&&key==='mounted'&&target?.extensions?.v5?.mounted===true&&defense?.option?.extensions?.fiche?.skillId==='skill-45_73_71_75_69_76_65-base')continue;
      const label=node('label','workspace-type',text+(role==='defender'?' (défense)':''));
      const input=document.createElement('input');
      input.type='number';
      input.step='1';
      input.max='0';
      input.value=current.penalties?.[key]??'';
      input.setAttribute('aria-label',label.textContent);
      input.addEventListener('change',()=>handlers.select({[field]:{...current,penalties:{...current.penalties,[key]:input.value===''?undefined:Number(input.value)}}}));
      label.append(input);
      penalties.append(label);
    }
  };
  addPenaltyFields('actor');
  if(target&&['attack','opposition'].includes(type))addPenaltyFields('defender');
  if(target?.extensions?.v5?.mounted===true&&defense?.option?.extensions?.fiche?.skillId==='skill-45_73_71_75_69_76_65-base'&&draft.defenseContext?.penalties?.mounted<0)penalties.append(node('p','workspace-muted','Esquive à cheval : le Désavantage automatique remplace l’ancien modificateur manuel; les deux ne se cumulent pas.'));
  v5.append(penalties);
  if(type==='attack'&&(actor.talents||[]).some(t=>['talent-gunner','talent-short-fuse','talent-harpooner','talent-martial-arts'].includes(t.id))&&!action.extensions?.fiche?.equipmentId){
    const current=draft.v5Context||{};
    const label=node('label','workspace-type','Groupe de l’arme pour les talents');
    const select=document.createElement('select');
    select.setAttribute('aria-label',label.textContent);
    select.append(new Option('À préciser',''));
    for(const value of ['Base','Bagarre','Arbalète','Poudre Noire','Ingénierie','Explosif','Explosifs'])select.append(new Option(value,value));
    select.value=current.weaponGroup||'';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,weaponGroup:select.value||undefined}}));
    label.append(select);
    v5.append(label);
    if(hasV5Talent(actor,'talent-martial-arts'))contextField(v5,'actor','weaponUnarmed','Attaque à mains nues');
  }
  for(const[subject,role]of[[actor,'actor'],[target,'defender']])if((subject?.states||[]).some(s=>s.key==='debate')){
    contextField(v5,role,'relatedToDebate','Ce Test concerne la dispute'+(role==='defender'?' (défense)':''));
    contextField(v5,role,'importantProblem','Un problème plus important interrompt la dispute'+(role==='defender'?' (défense)':''));
  }
  if(target&&['attack','opposition'].includes(type))contextField(v5,'defender','longerWeaponDefense','Arme plus longue en défense (+1 DR sauf Combattant au contact)');
  if(target&&['attack','opposition'].includes(type)&&(defense?.qualities||[]).some(row=>(typeof row==='string'?row:row?.id)==='piege-lame')){
    const values=draft.defenseContext||{},choose=node('label','workspace-type','Piège-lame : remplacer le critique défensif par un désarmement'),check=document.createElement('input');
    check.type='checkbox';
    check.checked=values.trapBladeChoice===true;
    check.setAttribute('aria-label',choose.textContent);
    check.addEventListener('change',()=>handlers.select({defenseContext:{...values,trapBladeChoice:check.checked}}));
    choose.append(check);
    v5.append(choose);
    const kind=node('label','workspace-type','Type de l’arme adverse'),select=document.createElement('select');
    select.setAttribute('aria-label',kind.textContent);
    select.append(new Option('À préciser',''),new Option('Lame','blade'),new Option('Autre','other'));
    select.value=values.opponentWeaponType||'';
    select.addEventListener('change',()=>handlers.select({defenseContext:{...values,opponentWeaponType:select.value||undefined}}));
    kind.append(select);
    v5.append(kind);
    for(const [key,label]of[['defenderSize','Taille du défenseur'],['opponentSize','Taille de l’adversaire']]){
      const wrap=node('label','workspace-type',label),input=document.createElement('input');
      input.type='number';
      input.min='1';
      input.max='5';
      input.value=values[key]??'';
      input.setAttribute('aria-label',label);
      input.addEventListener('change',()=>handlers.select({defenseContext:{...values,[key]:input.value===''?undefined:Number(input.value)}}));
      wrap.append(input);
      v5.append(wrap);
    }
    if(values.trapBladeChoice){
      const catchLabel=node('label','workspace-type','Talent Désarmement : saisir dans une main libre (dépense 1 Élan)'),catchInput=document.createElement('input');
      catchInput.type='checkbox';
      catchInput.checked=values.trapBladeCatch===true;
      catchInput.setAttribute('aria-label',catchLabel.textContent);
      catchInput.addEventListener('change',()=>handlers.select({defenseContext:{...values,trapBladeCatch:catchInput.checked,trapBladeSpendMomentum:catchInput.checked}}));
      catchLabel.append(catchInput);
      v5.append(catchLabel);
      const breakLabel=node('label','workspace-type',values.trapBladeCatch?'Après saisie, tenter de briser l’arme : Test de Force très difficile (+ DR de mêlée)':'Tenter de briser l’arme : Test de Force très difficile (+ DR de mêlée)'),breakInput=document.createElement('input');
      breakInput.type='checkbox';
      breakInput.checked=values.trapBladeChooseBreak===true;
      breakInput.setAttribute('aria-label',breakLabel.textContent);
      breakInput.addEventListener('change',()=>handlers.select({defenseContext:{...values,trapBladeChooseBreak:breakInput.checked}}));
      breakLabel.append(breakInput);
      v5.append(breakLabel);
      if(values.trapBladeChooseBreak)for(const [key,label,min,max]of[['base','Seuil Force',1,100],['roll','d100 Force',1,100]]){
        const wrap=node('label','workspace-type',label),input=document.createElement('input');
        input.type='number';
        input.min=String(min);
        input.max=String(max);
        input.value=values.trapBladeStrengthTest?.[key]??'';
        input.setAttribute('aria-label',label);
        input.addEventListener('change',()=>handlers.select({defenseContext:{...values,trapBladeStrengthTest:{...(values.trapBladeStrengthTest||{}),[key]:input.value===''?undefined:Number(input.value)}}}));
        wrap.append(input);
        v5.append(wrap);
      }
    }
  }
  for(const[subject,role]of[[actor,'actor'],[target,'defender']])if(hasV5Talent(subject,'talent-resolute')){
    contextField(v5,role,'tryResolute','Déterminé : tenter Calme après un État'+(role==='defender'?' (défense)':''));
    const key=role==='actor'?'v5Context':'defenseContext',values=role==='actor'?current:draft.defenseContext||{};
    if(values.tryResolute){
      const label=node('label','workspace-type','Jet de Calme Déterminé'+(role==='defender'?' (défense)':'')),input=document.createElement('input');
      input.type='number';
      input.min='1';
      input.max='100';
      input.value=values.resoluteRoll??'';
      input.setAttribute('aria-label',label.textContent);
      input.addEventListener('change',()=>handlers.select({[key]:{...values,resoluteRoll:input.value===''?undefined:Number(input.value)}}));
      label.append(input);
      v5.append(label);
    }
  }
  if(target&&hasV5Talent(target,'talent-shieldsman')){
    const values=draft.defenseContext||{},label=node('label','workspace-type','Porte-bouclier en défense'),select=document.createElement('select');
    select.setAttribute('aria-label',label.textContent);
    select.append(new Option('Défense normale','none'),new Option('Repousser après opposition gagnée','shieldsman'));
    select.value=values.specialAttack||'none';
    select.addEventListener('change',()=>handlers.select({defenseContext:{...values,specialAttack:select.value}}));
    label.append(select);
    v5.append(label);
    if(values.specialAttack==='shieldsman'){
      contextField(v5,'defender','shieldAvailable','Bouclier tenu et disponible (défense)');
      const label=node('label','workspace-type','Recul en mètres (défense)'),input=document.createElement('input');
      input.type='number';
      input.min='0';
      input.max='2';
      input.value=values.pushDistance??'';
      input.setAttribute('aria-label',label.textContent);
      input.addEventListener('change',()=>handlers.select({defenseContext:{...values,pushDistance:input.value===''?undefined:Number(input.value)}}));
      label.append(input);
      v5.append(label);
    }
  }
  if(target&&(hasV5Talent(actor,'talent-small')||hasV5Talent(target,'talent-small'))){
    const label=node('label','workspace-type','Actions de taille de Petit'),select=document.createElement('select');
    select.setAttribute('aria-label',label.textContent);
    select.append(new Option('Action ordinaire','none'),new Option('Peur / Terreur : créature plus grande agressive','small-psychology'),new Option('Quitter un adversaire plus petit','small-disengage'),new Option('Piétinement : 1 Élan','stomp'));
    select.value=['small-psychology','small-disengage','stomp'].includes(current.talentAction)?current.talentAction:'none';
    select.addEventListener('change',()=>handlers.select({type:select.value==='stomp'?'attack':select.value==='none'?type:'skill',v5Context:{...current,talentAction:select.value}}));
    label.append(select);
    v5.append(label);
    if(current.talentAction==='small-psychology')contextField(v5,'actor','aggressive','La créature plus grande est agressive');
    if(current.talentAction==='small-disengage')contextField(v5,'actor','bothEngaged','Engagés avec cet adversaire plus petit');
  }
  const situationFields=renderSituationFields({actor,target,participants,context:current,onContext:v5Context=>handlers.select({v5Context})});
  if(situationFields)v5.append(situationFields);
  const anklePenalty=(actor?.extensions?.v5?.combatEffects||[]).find(row=>row.kind==='twisted-ankle'&&Number(draft.round||0)<Number(row.createdRound||0)+Number(row.rounds||0));
  if(anklePenalty){
    const wrap=node('label','workspace-type','Cheville tordue : jambe utilisée pour ce Test'),select=document.createElement('select');
    select.setAttribute('aria-label',wrap.textContent);
    select.append(new Option('Ne pas appliquer',''),new Option('Jambe gauche','jambe-gauche'),new Option('Jambe droite','jambe-droite'));
    select.value=current.legUsed||'';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,legUsed:select.value||undefined}}));
    wrap.append(select);
    v5.append(wrap);
  }
  const linkedGrapple=[...(actor?.extensions?.v5?.grapples||[]),...(target?.extensions?.v5?.grapples||[])].find(row=>
    row.initiatorId===target?.id&&row.targetId===actor?.id||row.initiatorId===actor?.id&&row.targetId===target?.id
  );
  const liveLinkedGrapple=validGrapple(linkedGrapple)?linkedGrapple:null;
  if(['attack','skill','opposition'].includes(type)&&(draft.v5Kind==='melee'||String(action?.attr||'').toUpperCase()==='CC')&&target){
    const label=node('label','workspace-type','Déclarer une tentative d’empoignade (Bagarre avant le jet)'),check=document.createElement('input');
    check.type='checkbox';
    check.checked=current.grappleDeclared===true;
    check.addEventListener('change',()=>handlers.select({v5Context:{...current,grappleDeclared:check.checked||undefined,grappleAction:undefined}}));
    label.prepend(check);
    v5.append(label);
  }
  if(liveLinkedGrapple){
    const label=node('label','workspace-type','Action d’empoignade — Test opposé de Force'),select=document.createElement('select');
    select.setAttribute('aria-label',label.textContent);
    select.append(new Option('Choisir',''),new Option('Blesser (BF + DR, sans PA)','damage'),new Option('Immobiliser (Enchevêtré +1, puis +1 par DR au-delà du premier)','immobilize'),new Option('Se dégager','escape'));
    select.value=current.grappleAction||'';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,grappleDeclared:undefined,grappleAction:select.value||undefined}}));
    label.append(select);
    v5.append(label);
  }
  if(current.grappleAction&&!liveLinkedGrapple){
    const warning=node('p','workspace-muted','Lien d’empoignade inopérant : l’action enregistrée ne sera pas résolue comme une empoignade. Effacez-la avant de calculer.');
    const clear=button('Effacer l’action d’empoignade enregistrée','workspace-secondary');
    clear.addEventListener('click',()=>handlers.select({v5Context:{...current,grappleAction:undefined}}));
    v5.append(warning,clear);
  }
  const addDirectorArm=(container)=>{
    const label=node('label','workspace-type','Bras directeur touché : choix du MJ'),select=document.createElement('select');
    select.setAttribute('aria-label',label.textContent);
    select.append(new Option('À préciser',''),new Option('Gauche','left'),new Option('Droit','right'));
    select.value=current.weaponExplosionArmSide||'';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,weaponExplosionArmSide:select.value||undefined}}));
    label.append(select);
    container.appendChild(label);
  };
  const combatFumbleDue=Boolean(draft.preview?.fumble),defenderFumbleDue=Boolean(draft.preview?.defenderFumble);
  const powderIncidentDue=Boolean(draft.preview?.combatFailure?.misfire)||Number(draft.attackRoll)>=99&&isBlackpowderIncidentEligible({actor,action,context:current});
  const incidentWeapon=actor?.equipment?.find(row=>row.id===action?.extensions?.fiche?.equipmentId)||action?.extensions?.equipment;
  const incidentQualities=[...(incidentWeapon?.keywords||[]),...(action?.qualities||[])].map(row=>typeof row==='string'?row:row?.id);
  const salvoBlackpowder=incidentQualities.some(value=>['salve','salvo'].includes(value))
    &&isBlackpowderIncidentEligible({actor,action,context:current,weapon:incidentWeapon});
  const incidentWeaponName=String(actor?.equipment?.find(row=>row.id===action?.extensions?.fiche?.equipmentId)?.name||action?.extensions?.equipment?.name||action?.note||action?.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(combatFumbleDue||defenderFumbleDue||powderIncidentDue){
    const failureFields=node('div','workspace-v5-context');
    const addFailureRoll=(key,label,min=1,max=10)=>{
      const wrap=node('label','workspace-type',label),input=document.createElement('input');
      input.type='number';
      input.min=String(min);
      input.max=String(max);
      input.step='1';
      input.value=current[key]??'';
      input.setAttribute('aria-label',label);
      input.dataset.focusKey=key;
      input.addEventListener('input',()=>handlers.select({v5Context:{...current,[key]:input.value===''?undefined:Number(input.value)}}));
      wrap.appendChild(input);
      failureFields.appendChild(wrap);
    };
    if(combatFumbleDue){
      addFailureRoll('fumbleRoll','Maladresse de combat : résultat du d10 (V5 p. 165)');
      if(Number(current.fumbleRoll)===9){
        addFailureRoll('fumbleDurationRoll','Cheville : durée en Rounds (d10)');
        addFailureRoll('fumbleLocationRoll','Cheville : localisation de jambe (d10)');
      }
      if(Number(current.fumbleRoll)===10){
        const allies=participants.filter(row=>row.id!==actor?.id&&row.camp===actor?.camp&&row.zone==='active');
        const wrap=node('label','workspace-type','Maladresse 10 : alliés à portée désignés par le MJ');
        const select=document.createElement('select');
        select.multiple=true;
        select.setAttribute('aria-label',wrap.textContent);
        for(const ally of allies)select.append(new Option(ally.name||ally.id,ally.id));
        const chosen=new Set(current.allyCandidates||[]);
        for(const option of select.options)option.selected=chosen.has(option.value);
        select.addEventListener('change',()=>handlers.select({v5Context:{...current,allyCandidates:[...select.selectedOptions].map(option=>option.value),allyRangeConfirmed:undefined,fumbleAllySelectionRoll:undefined}}));
        wrap.appendChild(select);
        failureFields.appendChild(wrap);
        if(!(current.allyCandidates||[]).length){
          const noAlly=node('label','workspace-type','Le MJ confirme qu’aucun allié n’est à portée'),check=document.createElement('input');
          check.type='checkbox';
          check.checked=current.allyRangeConfirmed===true;
          check.setAttribute('aria-label',noAlly.textContent);
          check.addEventListener('change',()=>handlers.select({v5Context:{...current,allyRangeConfirmed:check.checked}}));
          noAlly.prepend(check);
          failureFields.appendChild(noAlly);
        }
        if((current.allyCandidates||[]).length){
          addFailureRoll('fumbleAllySelectionRoll','Maladresse 10 : jet d100 de sélection aléatoire (1–100)',1,100);
          addFailureRoll('fumbleAllyUnitsRoll','Dé des unités du jet pour les DR (0–9)',0,9);
        }
      }
    }
    if(defenderFumbleDue){
      const defenseContext=draft.defenseContext||{},wrap=node('label','workspace-type','Maladresse du défenseur : résultat du d10 (V5 p. 165)'),input=document.createElement('input');
      input.type='number';
      input.min='1';
      input.max='10';
      input.step='1';
      input.value=defenseContext.defenderFumbleRoll??'';
      input.setAttribute('aria-label',wrap.textContent);
      input.addEventListener('input',()=>handlers.select({defenseContext:{...defenseContext,defenderFumbleRoll:input.value===''?undefined:Number(input.value)}}));
      wrap.append(input);
      failureFields.append(wrap);
    }
    if(powderIncidentDue){
      addFailureRoll('powderIncidentRoll','Incident de poudre : premier d10 (V5 p. 165)');
      if(Number(current.powderIncidentRoll)>=9)addDirectorArm(failureFields);
    }
    if(powderIncidentDue&&salvoBlackpowder&&Number(current.powderIncidentRoll)>=1&&Number(current.powderIncidentRoll)<=10)addFailureRoll('salvoIncidentRoll','Incident de Salve : second d10 (L13 p. 126, après l’incident générique)');
    if(powderIncidentDue&&salvoBlackpowder&&Number(current.powderIncidentRoll)>=1&&Number(current.powderIncidentRoll)<=10&&Number(current.salvoIncidentRoll)>=1&&Number(current.salvoIncidentRoll)<=10){
      const participantsNow=participants.filter(person=>person.zone==='active'),ctx={...current},put=next=>handlers.select({v5Context:next});
      const number=(key,label,min,max)=>{
        const wrap=node('label','workspace-type',label),input=document.createElement('input');
        input.type='number';
        input.min=String(min);
        input.max=String(max);
        input.step='1';
        input.value=ctx[key]??'';
        input.setAttribute('aria-label',label);
        input.addEventListener('input',()=>put({...ctx,[key]:input.value===''?undefined:Number(input.value)}));
        wrap.append(input);
        failureFields.append(wrap);
      };
      const outcome=Number(ctx.salvoIncidentRoll);
      if(outcome>=8)number('remainingSalvo','Incident de Salve : points de Salve restants',0,100);
      const noRemainingShots=outcome>=8&&Number(ctx.remainingSalvo)===0;
      if(outcome<=9&&!noRemainingShots){
        number('salvoUnitsRoll','Incident de Salve : dé des unités (0–9), DR effectifs',0,9);
        const crewWrap=node('label','workspace-type','Incident de Salve : servants touchés (choix du MJ)'),crewSelect=document.createElement('select');
        crewSelect.multiple=true;
        crewSelect.setAttribute('aria-label',crewWrap.textContent);
        for(const person of participantsNow)crewSelect.append(new Option(person.name||person.id,person.id));
        for(const option of crewSelect.options)option.selected=(ctx.salvoCrewIds||[]).includes(option.value);
        crewSelect.addEventListener('change',()=>put({...ctx,salvoCrewIds:[...crewSelect.selectedOptions].map(option=>option.value)}));
        crewWrap.append(crewSelect);
        failureFields.append(crewWrap);
        for(const id of ctx.salvoCrewIds||[]){
          const person=participantsNow.find(row=>row.id===id);
          if(!person)continue;
          const selectLocation=(label,value,onchange)=>{
            const wrap=node('label','workspace-type',label),select=document.createElement('select');
            select.setAttribute('aria-label',label);
            select.append(new Option('À préciser',''),new Option('Tête','head'),new Option('Corps','body'),new Option('Bras gauche','left'),new Option('Bras droit','right'),new Option('Jambe gauche','left-leg'),new Option('Jambe droite','right-leg'));
            select.value=value||'';
            select.addEventListener('change',()=>onchange(select.value||undefined));
            wrap.append(select);
            failureFields.append(wrap);
          };
          if(outcome<=4)selectLocation(`Bras principal de ${person.name||id}`,ctx.salvoPrimaryArms?.[id],value=>put({...ctx,salvoPrimaryArms:{...(ctx.salvoPrimaryArms||{}),[id]:value}}));
          else{
            const count=outcome<=7?1:Math.max(1,Number(ctx.remainingSalvo)||1),rows=[...(ctx.salvoLocations?.[id]||[])];
            for(let i=0;i<count;i++)selectLocation(`Localisation aléatoire ${i+1} de ${person.name||id}`,rows[i],value=>{
              const next=[...(ctx.salvoLocations?.[id]||[])];
              next[i]=value;
              put({...ctx,salvoLocations:{...(ctx.salvoLocations||{}),[id]:next}});
            });
          }
        }
      }else if(!noRemainingShots){
        for(let i=0;i<Math.max(1,Number(ctx.remainingSalvo)||0);i++){
          const old=(ctx.salvoTrajectories||[])[i]||{},setShot=next=>{
            const rows=[...(ctx.salvoTrajectories||[])];
            rows[i]={...old,...next};
            put({...ctx,salvoTrajectories:rows});
          };
          for(const [field,label,type,min,max]of[['direction','Direction aléatoire du tir '+(i+1),'text'],['distanceRoll','Distance d100 en mètres du tir '+(i+1),'number',1,100]]){
            const wrap=node('label','workspace-type',label),input=document.createElement('input');
            input.type=type;
            if(type==='number'){
              input.min=String(min);
              input.max=String(max);
            }
            input.value=old[field]??'';
            input.setAttribute('aria-label',label);
            input.addEventListener('input',()=>setShot({[field]:type==='number'?(input.value===''?undefined:Number(input.value)):input.value}));
            wrap.append(input);
            failureFields.append(wrap);
          }
          const targetsWrap=node('fieldset','workspace-v5-context'),legend=node('legend','workspace-type',`Personnes sur la trajectoire ${i+1}`);
          targetsWrap.append(legend);
          const confirmed=node('label','workspace-type','Le MJ a vérifié la trajectoire (personnes listées ci-dessous, ou personne présente)'),confirmedInput=document.createElement('input');
          confirmedInput.type='checkbox';
          confirmedInput.checked=old.personsConfirmed===true;
          confirmedInput.setAttribute('aria-label',confirmed.textContent);
          confirmedInput.addEventListener('change',()=>setShot({personsConfirmed:confirmedInput.checked}));
          confirmed.prepend(confirmedInput);
          targetsWrap.append(confirmed);
          for(const person of participantsNow){
            const existing=(old.targets||[]).find(row=>row.participantId===person.id),line=node('div','workspace-v5-context'),wrap=node('label','workspace-type',person.name||person.id),check=document.createElement('input');
            check.type='checkbox';
            check.checked=Boolean(existing);
            check.setAttribute('aria-label',`Sur la trajectoire : ${person.name||person.id}`);
            check.addEventListener('change',()=>{
              const targets=[...(old.targets||[]).filter(row=>row.participantId!==person.id)];
              if(check.checked)targets.push({participantId:person.id,dodge:{}});
              setShot({targets});
            });
            wrap.prepend(check);
            line.append(wrap);
            if(existing){
              const targets=[...(old.targets||[])],loc=document.createElement('select');
              loc.setAttribute('aria-label',`Localisation de ${person.name||person.id}`);
              for(const [value,label]of[['','Localisation à préciser'],['head','Tête'],['body','Corps'],['left','Bras gauche'],['right','Bras droit'],['left-leg','Jambe gauche'],['right-leg','Jambe droite']])loc.append(new Option(label,value));
              loc.value=existing.location||'';
              loc.addEventListener('change',()=>setShot({targets:targets.map(row=>row.participantId===person.id?{...row,location:loc.value||undefined}:row)}));
              line.append(loc);
              for(const [key,label,min,max]of[['base','Seuil Esquive',1,100],['roll','d100 Esquive',1,100]]){
                const input=document.createElement('input');
                input.type='number';
                input.min=String(min);
                input.max=String(max);
                input.value=existing.dodge?.[key]??'';
                input.setAttribute('aria-label',`${person.name||person.id} — ${label} (−30)`);
                input.addEventListener('input',()=>setShot({targets:targets.map(row=>row.participantId===person.id?{...row,dodge:{...(row.dodge||{}),[key]:input.value===''?undefined:Number(input.value)}}:row)}));
                line.append(input);
              }
            }
            targetsWrap.append(line);
          }
          failureFields.append(targetsWrap);
        }
      }
    }
    v5.append(failureFields);
  }
  const linkedWeapon=actor?.equipment?.find(row=>row.id===action?.extensions?.fiche?.equipmentId)||action?.extensions?.equipment;
  const failureWeaponName=String(linkedWeapon?.name||action?.note||action?.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const isGunAxe=/hache.fusil|gun axe/.test(failureWeaponName),isGunHalberd=/hallebarde.fusil|gun halberd/.test(failureWeaponName),isGriffonsfoot=/griffonsfoot/.test(failureWeaponName),isHandMortar=/mortier (?:a|de) main|hand mortar/.test(failureWeaponName),isVolley=/arquebuse a salve|volley gun/.test(failureWeaponName),isMatchlock=/matchlock|meche/.test(failureWeaponName);
  if(linkedWeapon?.keywords?.some(row=>(typeof row==='string'?row:row?.id)==='a-repetition'&&row?.asterisk===true)){
    const controls=node('div','workspace-v5-context'),wrap=node('label','workspace-type','Seconde main pour la Poivrière'),choice=document.createElement('select');
    choice.setAttribute('aria-label','Seconde main libre pour préparer le canon de la Poivrière');
    choice.append(new Option('À préciser',''),new Option('Oui, libre','true'),new Option('Non, occupée','false'));
    choice.value=typeof current.freeHandAvailable==='boolean'?String(current.freeHandAvailable):'';
    choice.addEventListener('change',()=>handlers.select({v5Context:{...current,freeHandAvailable:choice.value===''?undefined:choice.value==='true'}}));
    wrap.append(choice);
    controls.append(wrap,node('p','workspace-muted',current.freeHandAvailable===false?'Main occupée : après ce tir, recharge complète nécessaire, comme pour une arme sans À répétition.':'Si la seconde main est occupée, un tir reste possible puis une recharge complète est nécessaire.'));
    v5.append(controls);
  }
  const salvoActive=linkedWeapon?.keywords?.some(row=>['salve','salvo'].includes(typeof row==='string'?row:row?.id))||action?.qualities?.some(row=>['salve','salvo'].includes(typeof row==='string'?row:row?.id));
  const priorSalvoShots=previousWeaponAttacks.filter(row=>row.weaponId===linkedWeapon?.id&&row.actionType==='attack').length;
  if(salvoActive&&type==='attack'&&priorSalvoShots>0)v5.append(node('p','workspace-muted',`Salve : −${priorSalvoShots} DR (tir(s) antérieur(s) de cette arme pendant ce Tour).`));
  if(isGunAxe||isGunHalberd||isGriffonsfoot||isHandMortar||isVolley||isMatchlock){
    const controls=node('div','workspace-v5-context');
    const addCheck=(key,label)=>{
      const wrap=node('label','workspace-type workspace-recipient-check');
      const input=document.createElement('input');
      input.type='checkbox';
      input.checked=current[key]===true;
      input.setAttribute('aria-label',label);
      input.addEventListener('change',()=>handlers.select({v5Context:{...current,[key]:input.checked}}));
      wrap.append(input,` ${label}`);
      controls.append(wrap);
    };
    const addNumber=(key,label,min=0,max=100)=>{
      const wrap=node('label','workspace-type',label),input=document.createElement('input');
      input.type='number';
      input.min=String(min);
      input.max=String(max);
      input.step='1';
      input.value=current[key]??'';
      input.setAttribute('aria-label',label);
      input.addEventListener('input',()=>handlers.select({v5Context:{...current,...(key==='fuseTurns'?fuseClock:{}),[key]:input.value===''?undefined:Number(input.value)}}));
      wrap.append(input);
      controls.append(wrap);
    };
    const addTargets=(key,label)=>{
      const wrap=node('label','workspace-type',label),select=document.createElement('select');
      select.multiple=true;
      select.setAttribute('aria-label',label);
      for(const p of participants.filter(row=>row.id!==actor?.id&&row.zone==='active'))select.append(new Option(p.name||p.id,p.id));
      const selected=new Set(current[key]||[]);
      for(const option of select.options)option.selected=selected.has(option.value);
      select.addEventListener('change',()=>handlers.select({v5Context:{...current,[key]:[...select.selectedOptions].map(option=>option.value)}}));
      wrap.append(select);
      controls.append(wrap);
    };
    if(isGunAxe||isGunHalberd){
      addCheck('meleeUse','Utiliser l’arme comme arme de mêlée');
      addCheck('weaponLoaded','L’arme à feu est chargée');
    }
    if(isGunHalberd)addTargets('designatedTargetIds','Hallebarde-fusil : personnes directement derrière (choix MJ)');
    if(isGriffonsfoot){
      const progress=Number(linkedWeapon?.extensions?.v5?.griffonsfootReloadProgress)||0;
      controls.append(node('p','workspace-muted',`Griffonsfoot · Recharge 6 : ${Math.min(6,progress)}/6 succès. Chaque Test réussi apporte 1 succès plus les DR positifs; un échec n’ajoute rien. Les six projectiles et charges sont débités au terme du cycle.`));
      addCheck('reloading','Effectuer un Test de Recharge du Griffonsfoot');
    }
    if(isHandMortar){
      addCheck('reloading','Recharger le mortier à main');
      addCheck('grappleLoaded','Charger le grappin');
      addCheck('grappleAnchorChosen','Le MJ désigne un point d’ancrage pour la corde');
      addCheck('bombPayload','Charger une bombe à mèche');
      if(current.bombPayload){
        addCheck('bombFuseLit','Le MJ confirme que la mèche de la bombe a été allumée avant chargement');
        addNumber('fuseTurns','Délai de la mèche en Tours du porteur',1,10);
      }
      if(draft.preview?.fumble&&current.reloading&&Number(current.fumbleRoll)>=1&&Number(current.fumbleRoll)<=10)addDirectorArm(controls);
    }
    if(isMatchlock){
      const light=button('Allumer la mèche — Action distincte','workspace-secondary');
      light.addEventListener('click',()=>handlers.select({type:'skill',v5Context:{...current,lightFuseAction:true,isAction:true}}));
      controls.append(light);
      addCheck('weatherExtinguishesFuse','Pluie ou vent éteint la mèche');
    }
    if(isVolley){
      addNumber('recoilTestBase','Résistance (+2 DR)',1,100);
      addNumber('recoilTestRoll','d100 de Résistance',1,100);
      const base=Number(current.recoilTestBase),roll=Number(current.recoilTestRoll);
      let recoilTest=null;
      if(Number.isInteger(base)&&base>=1&&base<=100&&Number.isInteger(roll)&&roll>=1&&roll<=100)
        recoilTest=previewV5Test({score:base,roll,kind:'test',slModifiers:[{id:'f2-e:salvo-recoil',label:'Recul de l’arquebuse à salve',amount:2}]}).options[0].result;
      if(recoilTest&&!recoilTest.success&&recoilTest.sl<=-5)addNumber('recoilCriticalRolls','Critique d’épaule : d100 table du bras V5',1,100);
      const wrap=node('label','workspace-type','Nombre de servants'),input=document.createElement('input');
      input.type='number';
      input.min='1';
      input.step='1';
      input.value=current.crewCount??'';
      input.setAttribute('aria-label',wrap.textContent);
      input.addEventListener('input',()=>handlers.select({v5Context:{...current,crewCount:input.value===''?undefined:Number(input.value)}}));
      wrap.append(input);
      controls.append(wrap);
      if(current.crewCount===1){
        const moved=node('label','workspace-type','Servant seul : l’arme a-t-elle été déplacée pendant ce Tour ?'),choice=document.createElement('select');
        choice.setAttribute('aria-label',moved.textContent);
        choice.append(new Option('À préciser',''),new Option('Non','false'),new Option('Oui','true'));
        choice.value=typeof current.moved==='boolean'?String(current.moved):'';
        choice.addEventListener('change',()=>handlers.select({v5Context:{...current,moved:choice.value===''?undefined:choice.value==='true'}}));
        moved.append(choice);
        controls.append(moved);
      }
    }
    v5.append(controls);
  }
  if(['griffonsfoot','arquebuse a salve','volley gun'].some(value=>failureWeaponName.includes(value))){
    const stock=actor?.extensions?.v5?.blackpowderStock,controls=node('div','workspace-v5-context');
    if(stock?.version===1)controls.append(node('p','workspace-muted',`Stock poudre noire enregistré : ${stock.projectiles} projectile(s), ${stock.powderCharges} charge(s).`));
    else{
      const initial={...(current.blackpowderStockInitial||{})};
      for(const [field,label] of [['projectiles','Stock initial de projectiles — saisi par le MJ'],['powderCharges','Stock initial de charges de poudre — saisi par le MJ']]){
        const wrap=node('label','workspace-type',label),input=document.createElement('input');
        input.type='number';
        input.min='0';
        input.step='1';
        input.value=initial[field]??'';
        input.setAttribute('aria-label',label);
        input.addEventListener('input',()=>handlers.select({v5Context:{...current,blackpowderStockInitial:{...initial,[field]:input.value===''?undefined:Number(input.value),confirmed:false}}}));
        wrap.append(input);
        controls.append(wrap);
      }
      const label='Le MJ confirme ce stock initial';
      const wrap=node('label','workspace-type workspace-recipient-check'),check=document.createElement('input');
      check.type='checkbox';
      check.checked=initial.confirmed===true;
      check.setAttribute('aria-label',label);
      check.addEventListener('change',()=>handlers.select({v5Context:{...current,blackpowderStockInitial:{...initial,confirmed:check.checked}}}));
      wrap.append(check,` ${label}`);
      controls.append(wrap);
    }
    v5.append(controls);
  }
  const selectedAmmo=actor?.equipment?.find(row=>row.id===draft.ammunitionId),largeBullet=/large bullet|gros projectile/i.test(selectedAmmo?.name||'');
  if(largeBullet&&type==='attack'){
    const controls=node('div','workspace-v5-context');
    const wrap=node('label','workspace-type','Gros projectile : tireur et cibles à deux mètres (choix MJ)'),select=document.createElement('select');
    select.multiple=true;
    select.setAttribute('aria-label',wrap.textContent);
    for(const p of participants.filter(row=>row.zone==='active'))select.append(new Option(p.name||p.id,p.id));
    const chosen=new Set(current.designatedTargetIds||[]);
    for(const option of select.options)option.selected=chosen.has(option.value);
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,largeBullet:true,designatedTargetIds:[...select.selectedOptions].map(option=>option.value)}}));
    wrap.append(select);
    controls.append(wrap);
    for(const id of current.designatedTargetIds||[]){
      const p=participants.find(row=>row.id===id);
      if(!p)continue;
      for(const [field,label,min,max] of [['base','seuil de Résistance',1,100],['roll','d100',1,100]]){
        const key=`deafenedTests.${id}.${field}`,row=node('label','workspace-type',`Résistance de ${p.name||p.id} (+0 DR) — ${label}`),input=document.createElement('input');
        input.type='number';
        input.min=String(min);
        input.max=String(max);
        input.step='1';
        input.value=current.deafenedTests?.[id]?.[field]??'';
        input.setAttribute('aria-label',row.textContent);
        input.addEventListener('input',()=>handlers.select({v5Context:{...current,deafenedTests:{...(current.deafenedTests||{}),[id]:{...(current.deafenedTests?.[id]||{}),[field]:input.value===''?undefined:Number(input.value)}}}}));
        row.append(input);
        controls.append(row);
      }
    }
    v5.append(controls);
  }
  // Arme qui frappe pour la défense (critique défensif, Riposte) : les Protections de l'attaquant peuvent en dépendre.
  if(target&&defense?.option&&type==='attack')for(const field of natureSelects(actor,()=>draft.defenseContext?.attackNature,next=>handlers.select({defenseContext:{...draft.defenseContext,attackNature:next}}),weaponAttackNature({actor:target,action:{...defense.option,type:'attack'},ranged:false})))v5.append(field);
  if(target&&['attack','opposition'].includes(type)){
    const support=renderSupportFields({actor:target,target:actor,participants,context:draft.defenseContext||{},prefix:'Défense — ',onContext:defenseContext=>handlers.select({defenseContext})});
    if(support)v5.append(support);
  }
  if(current.specialAttack==='whirlwind-of-death')for(const victim of participants.filter(p=>(current.engagedIds||[]).includes(p.id)&&p.id!==target?.id)){
    const morphologyLabel=node('label','workspace-type',`Tourbillon · Morphologie de ${victim.name||victim.id} (choix du MJ)`),morphologySelect=document.createElement('select');
    morphologySelect.setAttribute('aria-label',morphologyLabel.textContent);
    morphologySelect.append(new Option('Morphologie du profil',''),new Option('Humanoïde (forcer)','humanoid'),new Option('Quadrupède','quadruped'),new Option('Oiseau','bird'),new Option('Serpent','snake'),new Option('Araignée','spider'));
    morphologySelect.value=hitMorphologySelection(current.hitMorphologiesById?.[victim.id],deriveHitMorphology(victim));
    morphologySelect.addEventListener('change',()=>handlers.select({v5Context:{...current,hitMorphologiesById:{...(current.hitMorphologiesById||{}),[victim.id]:morphologySelect.value||undefined}}}));
    morphologyLabel.append(morphologySelect);
    v5.append(morphologyLabel);
    if(morphologySelect.value==='spider'){
      const sideLabel=node('label','workspace-type',`Tourbillon · Côté des pattes de ${victim.name||victim.id} (choix du MJ)`),sideSelect=document.createElement('select');
      sideSelect.setAttribute('aria-label',sideLabel.textContent);
      sideSelect.append(new Option('Choisir le côté',''),new Option('Gauche','left'),new Option('Droite','right'));
      sideSelect.value=current.spiderLegSidesById?.[victim.id]||'';
      sideSelect.addEventListener('change',()=>handlers.select({v5Context:{...current,spiderLegSidesById:{...(current.spiderLegSidesById||{}),[victim.id]:sideSelect.value||undefined}}}));
      sideLabel.append(sideSelect);
      v5.append(sideLabel);
    }
    const support=renderSupportFields({actor,target:victim,participants,onlyProtection:true,showMetal:Boolean(current.forgeAuthorIds?.length),context:current.whirlwindSupport?.[victim.id]||{},prefix:victim.name+' — ',onContext:values=>handlers.select({v5Context:{...current,whirlwindSupport:{...current.whirlwindSupport,[victim.id]:values}}})});
    if(support)v5.append(support);
  }
  const measures=renderV5TalentMeasures(actor);
  if(measures)v5.append(measures);
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
  const explicitWeaponGroup=type==='attack'&&Boolean(draft.v5Context?.weaponTrainingGroup||draft.v5Context?.weaponSkillId);
  calculate.disabled = draft.busy || !canCalculate || action.extensions?.fiche?.requiresLink&&!explicitWeaponGroup;
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
    live.appendChild(renderResult(preview, target, draft, handlers, participants));
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
      const effectiveTarget = participants.find(row => row.id === preview.targetId) || target;
      const label = needsLocation && effectiveTarget ? (manual ? `Appliquer le critique à ${effectiveTarget.name}` : `Appliquer les dégâts à ${effectiveTarget.name}`)
        : preview.damage && effectiveTarget ? `Appliquer ${previewHpLoss(preview)} dégâts à ${effectiveTarget.name}`
          : effectiveTarget && effects && (effects.extraWounds || effects.states.length) ? `Appliquer le critique à ${effectiveTarget.name}`
            : manual ? 'Enregistrer sans dégâts' : 'Enregistrer le résultat';
      const primary = button(label, 'workspace-primary', { 'data-focus-key': 'apply' });
      const missingProtection = [preview.protection, preview.critical?.details?.protection, preview.critical?.second?.protection, preview.defenderCritical?.details?.protection]
        .some(row => row && (row.ap === null || row.manual?.length));
      primary.disabled = preview.choiceRequired || preview.unresolved?.length > 0 || preview.critical?.details?.pending || preview.critical?.second?.pending || preview.defenderCritical?.details?.pending || preview.defenderCritical?.details?.needsAlternative || draft.busy || !canApply || needsTarget || needsLocation || invalidCritical || preview.critical?.details?.needsAlternative || preview.critical?.second?.needsAlternative || missingProtection || Boolean(preview.mechanicalWarnings?.length);
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
