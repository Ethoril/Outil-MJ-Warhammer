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
/** Mouvement de base ; les séquelles (pied perdu, fracture…) le réduisent : la projection du registre fait foi quand elle existe. */
const baseMovement = actor => Number(actor.extensions?.v5?.sequelaEffects?.movement?.effective ?? actor.caracs?.M ?? actor.M ?? actor.movement);
const finiteInt = (v,min=0) => Number.isSafeInteger(v) && v >= min;
const talentRank = (actor, idPattern, namePattern) => (actor?.talents || [])
  .filter(row => row?.status === 'resolved' && (idPattern.test(String(row.id || row.catalogueTalentId || '')) || (namePattern && namePattern.test(String(row.name || row.label || '')))))
  .reduce((sum, row) => sum + (Number.isSafeInteger(row.rank) && row.rank > 0 ? row.rank : 1), 0);
const hasFleeTalent = actor => talentRank(actor, /^talent-flee$/i, /^fuite\s*!?$|^flee\s*!?$/i) > 0;
const hasSteadyOnFleeExemption = (actor, facts) =>
  facts?.steadyOnActive === true ||
  (actor?.states || []).some(s => ['steady-on', 'en-bon-ordre', 'tenez-bon', 'orderly-retreat'].includes(String(s?.key || s?.name || '').toLowerCase()));

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
    let engagedEscapeEffects = null;
    if (facts.engagedEnemyIds.length) {
      if (facts.engagedEscapeConfirmed !== true || facts.freeAttacksResolved !== true) {
        return {ready:false,status:'blocked',error:'Fuite engagée non raccordée : Momentum, Brisé et attaques gratuites restent à résoudre.'};
      }
      const uniqueEnemies = [...new Set(facts.engagedEnemyIds)];
      const participants = state?.combat?.participants || [];
      if (participants.length && uniqueEnemies.some(id => id === actorId || !participants.some(p => p.id === id && p.zone === 'active'))) {
        return fail('Chaque ennemi engagé doit être un combattant actif distinct.', 'facts.engagedEnemyIds');
      }
      const spentSet = new Set(Array.isArray(facts.freeAttackSpentMomentumIds) ? facts.freeAttackSpentMomentumIds : []);
      const brokenExempt = hasFleeTalent(actor) || hasSteadyOnFleeExemption(actor, facts);
      const addedBrokenCount = brokenExempt ? 0 : uniqueEnemies.length;
      engagedEscapeEffects = {
        engagedEnemyIds: uniqueEnemies,
        momentumGainedEnemyIds: [...uniqueEnemies],
        freeAttackSpentMomentumIds: uniqueEnemies.filter(id => spentSet.has(id)),
        momentumRetainedEnemyIds: uniqueEnemies.filter(id => !spentSet.has(id)),
        brokenExempt,
        addedBrokenCount,
        surrounded: facts.surrounded === true
      };
    }
    if (!['walk','run'].includes(facts.moveMode)) return fail('Choisir explicitement le mode de déplacement Flee (Walk ou Run).','facts.moveMode');
    if (typeof facts.visibleToAnyEnemyAfter !== 'boolean') return fail('Le MJ doit confirmer si le personnage reste visible après Flee.','facts.visibleToAnyEnemyAfter');
    const moveDistance = baseMovement(actor);
    if (!finiteInt(moveDistance,0)) return fail('Mouvement de base inconnu; la distance Flee ne peut pas être calculée.','actor.caracs.M');
    const distance = moveDistance * (facts.moveMode === 'run' ? 4 : 2);
    return {ready:true,status:'ready',ruleVersion:BROKEN_ESCAPE_RULE_VERSION,action,actorId,turn:clone(turn),facts:clone(facts),...(engagedEscapeEffects?{engagedEscapeEffects}:{}),moveDistance:distance,moveUnit:'yards',sequenceAfter:{fleeCommitted:true,visibleToAnyEnemy:facts.visibleToAnyEnemyAfter,moveMode:facts.moveMode,moveDistance:distance},source:clone(BROKEN_ESCAPE_SOURCE)};
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
    const movement = baseMovement(actor);
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

export function previewV5FleeTalentDisengageMove({ actor, disengagedConfirmed, moveMode = 'run' } = {}) {
  if (!actor || typeof actor.id !== 'string') return fail('Personnage introuvable.', 'actor');
  if (!hasFleeTalent(actor)) return { ready: false, status: 'blocked', error: 'Le personnage ne possède pas le Talent Fuite ! résolu.' };
  if (disengagedConfirmed !== true) return fail('Confirmer explicitement que le Désengagement vient d’être effectué.', 'disengagedConfirmed');
  const movementBlock = uncertainMovement(actor);
  if (movementBlock) return { ready: false, status: 'blocked', error: movementBlock };
  const movement = baseMovement(actor);
  if (!finiteInt(movement, 0)) return fail('Mouvement de base inconnu.', 'actor.caracs.M');
  const extraMoveDistance = movement * (moveMode === 'walk' ? 2 : 4);
  return {
    ready: true,
    status: 'ready',
    ruleVersion: BROKEN_ESCAPE_RULE_VERSION,
    actorId: actor.id,
    moveMode: moveMode === 'walk' ? 'walk' : 'run',
    extraMoveDistance,
    moveUnit: 'yards',
    source: clone(BROKEN_ESCAPE_SOURCE)
  };
}

function resolvePursuitActorTest(actor, roll, choice, slBonus, bonusLabel, extraSl = 0) {
  const skill = (actor?.skills || []).find(
    row => /athl[ée]tisme|chevaucher|conduite/i.test(row.name || row.nom || '') && row.status === 'resolved' && Number.isInteger(row.total ?? row.value)
  );
  const baseScore = skill ? (skill.total ?? skill.value) : Number(actor?.caracs?.Ag ?? 0);
  if (!finiteInt(baseScore, 1)) return { ready: false, error: 'Score de compétence de poursuite introuvable.' };
  const score = effectiveSkillScore(actor, baseScore, skill?.carac || 'Ag');
  const slModifiers = [];
  if (slBonus !== 0) slModifiers.push({ id: 'pursuit-talent-bonus', label: bonusLabel, amount: slBonus });
  if (extraSl !== 0) slModifiers.push({ id: 'pursuit-obstacle-modifier', label: 'Modificateur d’obstacle', amount: extraSl });
  const preview = previewV5Test({ score, roll, slModifiers });
  if (preview.choiceRequired && !['keep', 'reverse'].includes(choice)) {
    return { ready: false, error: 'Choisir le résultat du Test de poursuite.' };
  }
  const selected = preview.options.length === 1 ? preview.options[0].id : choice;
  const test = selectV5Test(preview, selected);
  return { ready: true, score, test, preview };
}

export function resolveV5PursuitStep({
  quarry,
  pursuer,
  initialDistance,
  quarryRoll,
  pursuerRoll,
  quarryChoice,
  pursuerChoice,
  obstaclePenaltySl = 0
} = {}) {
  if (!quarry || !pursuer) return fail('Proie et poursuivant requis.', 'quarry');
  if (!finiteInt(initialDistance, 1) || initialDistance > 10) {
    return fail('Fournir une distance initiale de poursuite entre 1 et 10 (L06 p.158).', 'initialDistance');
  }
  if (!finiteInt(quarryRoll, 1) || quarryRoll > 100) return fail('Jet d100 de la proie requis.', 'quarryRoll');
  if (!finiteInt(pursuerRoll, 1) || pursuerRoll > 100) return fail('Jet d100 du poursuivant requis.', 'pursuerRoll');
  const quarrySlBonus = talentRank(quarry, /^talent-flee$/i, /^fuite\s*!?$|^flee\s*!?$/i);
  const pursuerSlBonus = talentRank(pursuer, /^talent-relentless$/i, /^acharn[ée]$|^impitoyable$|^relentless$/i);
  const qRes = resolvePursuitActorTest(quarry, quarryRoll, quarryChoice, quarrySlBonus, 'Fuite ! (+1 DR par rang)');
  if (!qRes.ready) return fail(qRes.error, 'quarryChoice');
  const pRes = resolvePursuitActorTest(pursuer, pursuerRoll, pursuerChoice, pursuerSlBonus, 'Impitoyable / Acharné (+1 DR par rang)', obstaclePenaltySl);
  if (!pRes.ready) return fail(pRes.error, 'pursuerChoice');
  const deltaSl = qRes.test.sl - pRes.test.sl;
  const rawNextDistance = initialDistance + deltaSl;
  const nextDistance = Math.max(0, rawNextDistance);
  const outcome = rawNextDistance <= 0 ? 'caught' : rawNextDistance > 10 ? 'escaped' : 'ongoing';
  return {
    ready: true,
    status: 'ready',
    ruleVersion: BROKEN_ESCAPE_RULE_VERSION,
    initialDistance,
    deltaSl,
    nextDistance,
    outcome,
    quarrySlBonus,
    pursuerSlBonus,
    quarryTest: qRes.test,
    pursuerTest: pRes.test
  };
}
