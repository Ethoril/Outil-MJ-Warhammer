import { previewV5Test, selectV5Test } from './v5-roll.js';
import { effectiveSkillScore } from './v5-magic-talents.js';
import { resolveV5ConditionTestContext } from './v5-test-context.js';

export const BROKEN_ESCAPE_RULE_VERSION = 'l06-broken-escape-2026-10-18.1';
export const BROKEN_ESCAPE_SOURCE = Object.freeze({
  document: 'Livre de base V5 EN v2.pdf',
  fileSha256: '53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de',
  readingRefs: [161,163,185,186].map(printedPage=>({document:'Livre de base V5 EN v2.pdf',fileSha256:'53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de',edition:'V5 EN',printedPage,sourceStatus:'read-and-page-checked'})),
  ruleVersion: BROKEN_ESCAPE_RULE_VERSION
});
const clone = value => structuredClone(value);
const conditionLevels = actor => resolveV5ConditionTestContext(actor,{characteristic:'Ag',isAction:true,involvesMovement:true,runningOrHiding:true,requiresSight:false,reliesOnSight:false}).levels || {};
const broken = actor => Number(conditionLevels(actor).brise||0)>0;
const uncertainMovement = actor => {const levels=conditionLevels(actor);return levels.inconscient>0?'Inconscient interdit cette Action de fuite.':levels.enchevetre>0?'Enchevêtré interdit le Move.':levels.sonne>0?'Sonné réduit le Mouvement; son calcul de Sprint n’est pas raccordé.':levels.aterre>0?'À terre limite le déplacement; le redressement/ramper n’est pas raccordé.':null;};
const fail = (reason, field) => ({ ready:false, status:'requires-input', error:reason, needsInput: field ? [{field,label:reason}] : [], unresolved:[reason] });
const finiteInt = (v,min=0) => Number.isSafeInteger(v) && v >= min;

export function previewV5BrokenEscape({ state, actor, actorId=actor?.id, action, facts, turn, roll, choice, sequence, skillName='Athlétisme' } = {}) {
  if (!actor || actor.id !== actorId) return fail('Personnage actif introuvable.','actorId');
  if (!broken(actor)) return {ready:false,status:'blocked',error:'Le personnage ne porte pas Brisé.'};
  if (!['flee','sprint','hide'].includes(action)) return fail('Choisir Flee, Sprint ou Hide.','action');
  if (!turn?.encounterId || !turn?.turnId || !finiteInt(turn.round,1)) return fail('Horloge canonique de Tour indisponible.','turn');
  if (!facts || typeof facts !== 'object' || Array.isArray(facts)) return fail('Fournir les faits MJ de cette étape.','facts');
  if (action === 'flee' && typeof facts.visibleToAnyEnemy !== 'boolean') return fail('Le MJ doit préciser la visibilité actuelle envers tout ennemi.','facts.visibleToAnyEnemy');
  if (action === 'flee' && facts.visibleToAnyEnemy === false) return {ready:false,status:'blocked',error:'Le MJ confirme que le personnage est déjà hors de vue : Flee n’est pas requise.'};
  if (action === 'sprint' && !sequence?.fleeCommitted) return {ready:false,status:'blocked',error:'Le Move (Flee) doit être confirmé avant l’Action suivante.'};
  if (action === 'flee') {
    const movementBlock=uncertainMovement(actor);if(movementBlock)return {ready:false,status:'blocked',error:movementBlock+' Résoudre son interaction avant d’inventer une distance.'};
    if (!Array.isArray(facts.engagedEnemyIds) || facts.engagedEnemyIds.some(id => typeof id !== 'string' || !id.trim())) return fail('Confirmer explicitement la liste des ennemis engagés.','facts.engagedEnemyIds');
    if (facts.engagedEnemyIds.length) return {ready:false,status:'blocked',error:'Fuite engagée non raccordée : Momentum, Brisé et attaques gratuites restent à résoudre.'};
    if (!['walk','run'].includes(facts.moveMode)) return fail('Choisir explicitement le mode de déplacement Flee (Walk ou Run).','facts.moveMode');
    if (typeof facts.visibleToAnyEnemyAfter !== 'boolean') return fail('Le MJ doit confirmer si le personnage reste visible après Flee.','facts.visibleToAnyEnemyAfter');
    const moveDistance = Number(actor.caracs?.M ?? actor.M ?? actor.movement);
    if (!finiteInt(moveDistance,0)) return fail('Mouvement de base inconnu; la distance Flee ne peut pas être calculée.','actor.caracs.M');
    const distance = moveDistance * (facts.moveMode === 'run' ? 4 : 2);
    return {ready:true,status:'ready',ruleVersion:BROKEN_ESCAPE_RULE_VERSION,action,actorId,turn:clone(turn),facts:clone(facts),moveDistance:distance,moveUnit:'yards',sequenceAfter:{fleeCommitted:true,visibleToAnyEnemy:facts.visibleToAnyEnemyAfter,moveMode:facts.moveMode,moveDistance:distance},source:clone(BROKEN_ESCAPE_SOURCE)};
  }
  if (action === 'sprint') {
    if (sequence.visibleToAnyEnemy !== true) return {ready:false,status:'blocked',error:'Sprint n’est pas obligatoire : le MJ a confirmé que le personnage est hors de vue.'};
    if (typeof facts.visibleToAnyEnemyAfter !== 'boolean') return fail('Le MJ doit confirmer la visibilité après Sprint.','facts.visibleToAnyEnemyAfter');
    if (!finiteInt(roll,1) || roll > 100) return fail('Fournir le jet d100 explicite pour Athlétisme.','roll');
    const movementBlock=uncertainMovement(actor);if(movementBlock)return {ready:false,status:'blocked',error:movementBlock+' Résoudre son interaction avant de calculer Sprint.'};
    if ((actor.talents||[]).some(row=>row.status==='resolved'&&/sprinter/i.test([row.id,row.catalogueTalentId,row.name,row.label].filter(Boolean).join(' ')))) return {ready:false,status:'blocked',error:'Sprinter est acquis mais son effet sur le Test/distance n’est pas raccordé à cette commande.'};
    const skill = (actor.skills || []).find(row => /athl[ée]tisme/i.test(row.name || row.nom || '') && row.status === 'resolved' && Number.isInteger(row.total ?? row.value));
    if (!skill) return fail('Le score actuel importé d’Athlétisme doit être résolu avant Sprint.','skills.Athlétisme');
    const baseScore = skill.total ?? skill.value;
    const score = effectiveSkillScore(actor, baseScore, skill.carac || 'Ag');
    const context = resolveV5ConditionTestContext(actor,{characteristic:skill.carac || 'Ag',isAction:true,involvesMovement:true,runningOrHiding:true,requiresSight:false,reliesOnSight:false});
    if (!context.ready) return {ready:false,status:'requires-input',error:'Le contexte du Test Athlétisme est incomplet.',needsInput:clone(context.needsInput),unresolved:clone(context.needsInput)};
    const testPreview=previewV5Test({score,roll,slModifiers:[...context.slModifiers,{id:'broken-sprint-average',label:'Sprint moyen (+2 DR)',amount:2}],advantageSources:context.advantageSources,disadvantageSources:context.disadvantageSources});
    if (testPreview.choiceRequired && !['keep','reverse'].includes(choice)) return fail('Choisir le résultat du Test Athlétisme.','choice');
    const selectedChoice=testPreview.options.length===1?testPreview.options[0].id:choice;
    const test=selectV5Test(testPreview,selectedChoice);
    const movement = Number(actor.caracs?.M ?? actor.M ?? actor.movement);
    if (!finiteInt(movement,0)) return fail('Mouvement de base inconnu; Sprint ne peut pas être calculé.','actor.caracs.M');
    const moveDistance=movement*(sequence.moveMode==='run'?4:2), sprintDistance=movement*4+test.sl;
    if (sprintDistance < 0) return {ready:false,status:'requires-input',error:'La formule source donne une distance Sprint négative; arbitrage MJ requis.',needsInput:[{field:'sprintDistance',label:'Arbitrer une distance Sprint négative.'}]};
    return {ready:true,status:'ready',ruleVersion:BROKEN_ESCAPE_RULE_VERSION,action,actorId,turn:clone(turn),facts:clone(facts),test:{...clone(test),score,characteristic:skill.carac||'Ag',difficultySl:2,result:clone(test),preview:clone(testPreview),context:clone(context)},moveDistance,sprintDistance,totalDistance:moveDistance+sprintDistance,moveUnit:'yards',sequenceAfter:{fleeCommitted:true,visibleToAnyEnemy:facts.visibleToAnyEnemyAfter,moveMode:sequence.moveMode,moveDistance,sprintDistance,totalDistance:moveDistance+sprintDistance},source:clone(BROKEN_ESCAPE_SOURCE)};
  }
  if (facts.visibleToAnyEnemy !== false) return {ready:false,status:'blocked',error:'Hide est une Action facultative uniquement après confirmation MJ que le personnage est hors de vue.'};
  const skill=(actor.skills||[]).find(row=>(facts.skillId&&row.id===facts.skillId)||(facts.skillName&&String(row.name||row.nom||'').toLowerCase()===String(facts.skillName).toLowerCase()));
  if (!skill || skill.status!=='resolved' || !Number.isInteger(skill.total??skill.value)) return fail('Choisir une compétence résolue pour le Test facultatif de Hide.','facts.skillId');
  if (!finiteInt(roll,1)||roll>100) return fail('Fournir le jet d100 explicite du Test facultatif de Hide.','roll');
  const score=effectiveSkillScore(actor,skill.total??skill.value,skill.carac||'Ag');
  const context=resolveV5ConditionTestContext(actor,{characteristic:skill.carac||'Ag',isAction:true,involvesMovement:false,runningOrHiding:true,requiresSight:false,reliesOnSight:false});
  if(!context.ready)return {ready:false,status:'requires-input',error:'Le contexte du Test de Hide est incomplet.',needsInput:clone(context.needsInput)};
  const testPreview=previewV5Test({score,roll,slModifiers:context.slModifiers,advantageSources:context.advantageSources,disadvantageSources:context.disadvantageSources});
  if(testPreview.choiceRequired&&!['keep','reverse'].includes(choice))return fail('Choisir le résultat du Test de Hide.','choice');
  const selectedChoice=testPreview.options.length===1?testPreview.options[0].id:choice,test=selectV5Test(testPreview,selectedChoice);
  return {ready:true,status:'ready',ruleVersion:BROKEN_ESCAPE_RULE_VERSION,action,actorId,turn:clone(turn),facts:clone(facts),test:{...clone(test),score,characteristic:skill.carac||'Ag',result:clone(test),preview:clone(testPreview),context:clone(context)},sequenceAfter:sequence?clone(sequence):null,source:clone(BROKEN_ESCAPE_SOURCE)};
}

export function isV5BrokenEscapeActionBlocked(actor, { visibleToAnyEnemy, sequence } = {}) {
  if (!broken(actor)) return false;
  if (typeof visibleToAnyEnemy !== 'boolean') return 'needs-fact';
  if (visibleToAnyEnemy) return sequence?.fleeCommitted && sequence?.sprintCommitted ? 'visible-after-sprint' : 'mandatory-flee-sprint';
  return false;
}
