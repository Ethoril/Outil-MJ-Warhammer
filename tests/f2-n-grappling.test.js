import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyGrappleAction,
  applyGrappleInitiation,
  previewGrappleAction,
  previewGrappleInitiation,
  previewGrappleTurnActionGate,
  V5_GRAPPLING_RULE_VERSION
} from '../js/core/v5-grappling.js';

const participant = (id, F = 40, states = []) => ({ id, name: id, hp: 20, maxHp: 20, caracs: { F, E: 30 }, states });
const attack = (winner = 'attacker') => ({
  attack: true, hit: winner === 'attacker', unresolved: [],
  opposition: { mode: 'opposed', winner, netSl: winner === 'attacker' ? 2 : -2 }
});
const link = (overrides = {}) => ({
  id: 'grapple:entry-1', resolutionId: 'entry-1', initiatorId: 'holder', targetId: 'held',
  status: 'active', ruleVersion: V5_GRAPPLING_RULE_VERSION, targetConditionIds: ['grapple-state'], ...overrides
});
const stateLevel = person => person.states
  .filter(row => row.key === 'enchevetre')
  .reduce((sum, row) => sum + row.level, 0);

test('F2-N garde préparatoire — première Action sous prise : Test de Force déclaré avant tout autre Action',()=>{
  const held=participant('held');held.extensions={v5:{grapples:[link()]}};
  assert.equal(previewGrappleTurnActionGate({actor:held,action:'damage',skillName:'Force'}).allowed,true);
  assert.match(previewGrappleTurnActionGate({actor:held,action:'damage',skillName:'Corps à corps'}).unresolved.join(' '),/première Action.*Force/);
  assert.match(previewGrappleTurnActionGate({actor:held,action:'attack',skillName:'Force',alreadySpentAction:true}).unresolved.join(' '),/avant toute autre Action/);
  assert.equal(previewGrappleTurnActionGate({actor:participant('free'),action:'attack',skillName:'Corps à corps'}).required,false);
});

test('F2-N — déclaration avant le jet : victoire crée une prise persistante et Enchevêtré sans dégâts', () => {
  const actor = participant('holder');
  const target = participant('held');
  assert.deepEqual(previewGrappleInitiation({ actor, target, declared: false }), { ruleVersion: V5_GRAPPLING_RULE_VERSION, handled: false });

  const plan = previewGrappleInitiation({
    actor, target, declared: true, eligibleBrawling: true, attack: attack(), resolutionId: 'entry-1', round: 1
  });
  assert.equal(plan.ready, true);
  assert.equal(plan.won, true);
  assert.equal(plan.suppressOrdinaryDamage, true);
  assert.equal(plan.targetCondition.level, 1);
  assert.equal(plan.targetCondition.source.linkId, plan.link.id);

  const applied = applyGrappleInitiation(plan, target);
  assert.equal(applied.status, 'applied');
  assert.equal(stateLevel(applied.participant), 1);
  assert.equal(applied.participant.hp, target.hp);
  assert.equal(applied.link.targetConditionIds.length, 1);
  assert.equal(applied.participant.states[0].source.linkId, applied.link.id);
  assert.deepEqual(JSON.parse(JSON.stringify(applied.link)), applied.link, 'identité du lien sérialisable pour la sauvegarde');
  assert.equal(applyGrappleInitiation(plan, applied.participant).status, 'duplicate');
});

test('F2-N — l’échec ou une déclaration inadmissible ne crée aucun lien', () => {
  const actor = participant('holder');
  const target = participant('held');
  const failed = previewGrappleInitiation({
    actor, target, declared: true, eligibleBrawling: true, attack: attack('defender'), resolutionId: 'miss-1'
  });
  assert.equal(failed.status, 'opposition-lost');
  assert.equal(failed.link, null);
  assert.equal(failed.targetCondition, null);

  const inadmissible = previewGrappleInitiation({
    actor, target, declared: true, eligibleBrawling: false, attack: attack(), resolutionId: 'armed-1'
  });
  assert.equal(inadmissible.ready, false);
  assert.match(inadmissible.unresolved.join(' '), /Bagarre/);
  assert.equal(applyGrappleInitiation(inadmissible, target).participant, target);
});

test('F2-N — Test de Force gagné blesse de BF + DR - BE, ignore les PA et localise avec le jet', () => {
  const plan = previewGrappleAction({
    actor: participant('holder', 45), target: participant('held'), link: link(), action: 'damage',
    actorTest: { roll: 23, success: true, sl: 4 }, opponentTest: { roll: 72, success: true, sl: 1 },
    resolutionId: 'damage-1', round: 2
  });
  assert.equal(plan.ready, true);
  assert.deepEqual(plan.effects[0], {
    type: 'damage', targetId: 'held', amount: 4, armourApplied: false,
    strengthBonus: 4, toughnessBonus: 3, netSL: 3,
    location: { roll: 32, name: 'Bras Droit', key: 'ARM' }
  });
  assert.equal(applyGrappleAction(plan, { actor: participant('holder', 45), target: participant('held'), link: link() }).damage.amount, 4);
});

test('F2-N — Bonus d’Endurance absent bloque les Blessures au lieu de les sous-calculer',()=>{
  const plan=previewGrappleAction({actor:participant('holder',40),target:{id:'held',states:[],caracs:{}},link:link(),action:'damage',actorTest:{roll:23,sl:2},opponentTest:{sl:0},resolutionId:'unknown-be'});
  assert.equal(plan.ready,false);assert.match(plan.unresolved.join(' '),/Bonus d’Endurance/);
});

test('F2-N — immobiliser ajoute un niveau, puis un par DR au-delà du premier', () => {
  const actor = participant('holder');
  const target = participant('held');
  const originalLink = link();
  const plan = previewGrappleAction({
    actor, target, link: originalLink, action: 'immobilize',
    actorTest: { roll: 40, success: true, sl: 3 }, opponentTest: { roll: 55, success: true, sl: 0 },
    resolutionId: 'hold-1', round: 2
  });
  assert.equal(plan.effects[0].condition.level, 3);
  assert.equal(stateLevel(target), 0, 'l’aperçu ne mute pas le participant');

  const applied = applyGrappleAction(plan, { actor, target, link: originalLink });
  assert.equal(applied.status, 'applied');
  assert.equal(stateLevel(applied.target), 3);
  assert.equal(applied.link.targetConditionIds.length, 2);
  assert.equal(stateLevel(target), 0);
  assert.equal(applyGrappleAction(plan, { actor, target: applied.target, link: applied.link }).status, 'duplicate');
});

test('F2-N — dégagement retire 1 + DR après le premier uniquement de l’Enchevêtré de cette prise', () => {
  const target = participant('held', 40, [
    { id: 'grapple-state', key: 'enchevetre', name: 'Enchevêtré', level: 3, source: { kind: 'grapple', linkId: 'grapple:entry-1' } },
    { id: 'net-state', key: 'enchevetre', name: 'Enchevêtré', level: 2, source: { kind: 'net' } }
  ]);
  const holder = participant('holder');
  const active = link();
  const plan = previewGrappleAction({
    actor: target, target: holder, link: active, action: 'escape',
    actorTest: { roll: 34, success: true, sl: 3 }, opponentTest: { roll: 77, success: true, sl: 1 },
    resolutionId: 'escape-1', round: 3
  });
  assert.equal(plan.effects[0].amount, 2);
  assert.equal(plan.endLink, false, 'un niveau appartenant au lien subsiste');

  const result = applyGrappleAction(plan, { actor: target, target: holder, link: active });
  assert.equal(stateLevel(result.actor), 3, 'un niveau du lien et deux niveaux étrangers subsistent');
  assert.equal(result.actor.states.find(row => row.id === 'net-state').level, 2, 'une entrave étrangère n’est pas retirée');
  assert.equal(result.link.status, 'active');
});

test('F2-N — dégagement retire les niveaux de toutes les occurrences liées avant de libérer la prise',()=>{
  const holder=participant('holder',40,[
    {id:'grapple-state-a',key:'enchevetre',name:'Enchevêtré',level:1,source:{kind:'grapple',linkId:'grapple:entry-1'}},
    {id:'foreign',key:'enchevetre',name:'Enchevêtré',level:2,source:{kind:'net'}},
    {id:'grapple-state-b',key:'enchevetre',name:'Enchevêtré',level:2,source:{kind:'grapple',linkId:'grapple:entry-1'}}
  ]),opponent=participant('held'),active=link({targetConditionIds:['grapple-state-a','grapple-state-b']});
  const plan=previewGrappleAction({actor:holder,target:opponent,link:active,action:'escape',actorTest:{roll:34,sl:4},opponentTest:{sl:0},resolutionId:'escape-all',round:3});
  assert.deepEqual(plan.effects.map(row=>[row.conditionId,row.amount]),[['grapple-state-a',1],['grapple-state-b',2]]);
  assert.equal(plan.endLink,true);
  const result=applyGrappleAction(plan,{actor:holder,target:opponent,link:active});
  assert.equal(result.link.status,'released');assert.equal(stateLevel(result.actor),2);
  assert.deepEqual(result.actor.states.map(row=>row.id),['foreign']);
});

test('F2-N caractérisation T2 bis — le dégagement de l’initiateur libère aussi le partenaire lié',()=>{
  const holder=participant('holder',40,[
    {id:'holder-grapple-state',key:'enchevetre',name:'Enchevêtré',level:1,source:{kind:'grapple',linkId:'grapple:entry-1'}}
  ]);
  const held=participant('held',40,[
    {id:'held-grapple-state',key:'enchevetre',name:'Enchevêtré',level:2,source:{kind:'grapple',linkId:'grapple:entry-1'}}
  ]);
  const active=link({targetConditionIds:['held-grapple-state']});
  const plan=previewGrappleAction({actor:holder,target:held,link:active,action:'escape',
    actorTest:{roll:34,success:true,sl:2},opponentTest:{sl:0},resolutionId:'holder-escape',round:3});
  assert.equal(plan.endLink,true);
  const result=applyGrappleAction(plan,{actor:holder,target:held,link:active});
  assert.equal(result.link.status,'released');
  assert.equal(stateLevel(result.actor),0,'l’initiateur est libéré');
  assert.equal(stateLevel(result.target),0,'le partenaire est libéré par la clôture du même lien');
});

test('F2-N — perdre l’opposition laisse lien, Blessures et États inchangés', () => {
  const actor = participant('holder');
  const target = participant('held', 40, [{ id: 'grapple-state', key: 'enchevetre', level: 2, source: { kind: 'grapple', linkId: 'grapple:entry-1' } }]);
  const active = link();
  const before = structuredClone({ actor, target, active });
  const plan = previewGrappleAction({
    actor, target, link: active, action: 'immobilize',
    actorTest: { roll: 80, success: false, sl: -3 }, opponentTest: { roll: 20, success: true, sl: 2 },
    resolutionId: 'lose-1', round: 2
  });
  assert.equal(plan.won, false);
  assert.deepEqual(plan.effects, []);
  const result = applyGrappleAction(plan, { actor, target, link: active });
  assert.deepEqual(structuredClone({ actor: result.actor, target: result.target }), { actor: before.actor, target: before.target });
  assert.equal(result.link.status, 'active');
  assert.deepEqual(result.link.targetConditionIds, before.active.targetConditionIds);
  assert.ok(result.link.appliedActionIds.includes('lose-1'), 'la tentative est journalisable sans réussir l’action choisie');
});

test('F2-N — scénario sur trois Tours : engager, blesser, se dégager', () => {
  const holder = participant('holder', 40);
  let held = participant('held', 30);
  const entry = previewGrappleInitiation({
    actor: holder, target: held, declared: true, eligibleBrawling: true,
    attack: attack(), resolutionId: 'three-turn-entry', round: 1
  });
  const acquired = applyGrappleInitiation(entry, held);
  held = acquired.participant;
  let currentLink = acquired.link;
  assert.equal(stateLevel(held), 1);

  const injury = previewGrappleAction({
    actor: holder, target: held, link: currentLink, action: 'damage',
    actorTest: { roll: 43, success: true, sl: 3 }, opponentTest: { roll: 55, success: true, sl: 1 },
    resolutionId: 'three-turn-damage', round: 2
  });
  assert.equal(injury.effects[0].amount, 3);
  assert.equal(injury.effects[0].armourApplied, false);
  assert.equal(injury.effects[0].toughnessBonus,3);

  const escape = previewGrappleAction({
    actor: held, target: holder, link: currentLink, action: 'escape',
    actorTest: { roll: 40, success: true, sl: 2 }, opponentTest: { roll: 50, success: true, sl: 0 },
    resolutionId: 'three-turn-escape', round: 3
  });
  const released = applyGrappleAction(escape, { actor: held, target: holder, link: currentLink });
  held = released.actor;
  currentLink = released.link;
  assert.equal(stateLevel(held), 0);
  assert.equal(currentLink.status, 'released');
  assert.equal(JSON.parse(JSON.stringify({ held, currentLink })).currentLink.status, 'released');
});

test('F2-N — entrée sans jet ou Action sans opposition est bloquée sans mutation', () => {
  const missing = previewGrappleInitiation({ actor: participant('holder'), target: participant('held'), declared: true, eligibleBrawling: true });
  assert.equal(missing.ready, false);
  assert.ok(missing.unresolved.some(message => /Test opposé/.test(message)));

  const noOpposition = previewGrappleAction({ actor: participant('holder'), target: participant('held'), link: link(), action: 'damage', resolutionId: 'none' });
  assert.equal(noOpposition.ready, false);
  assert.ok(noOpposition.unresolved.some(message => /résultat du Test de Force opposé/.test(message)));
});
