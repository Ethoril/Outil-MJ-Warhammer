import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { hasMomentum } from '../js/core/v5-combat-rules.js';
import { getV5Fortune, projectV5Resources } from '../js/core/v5-resources.js';

const envelope = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };
function memory() {
  let state, reject = false;
  return {load: async () => state && structuredClone(state), saveAtomic: async ({state: next}) => { if (reject) throw new Error('Disque de contrôle indisponible'); state = structuredClone(next); return {ok: true}; }, snapshot: () => structuredClone(state), reject: value => {reject = value;}};
}
async function setup({actorTalents = [], targetTalents = []} = {}) {
  const persistence = memory(), store = createStore({persistence}); await store.ready;
  await store.addProfile({id:'control-profile-a',name:'Même nom de contrôle',kind:'PJ',hp:40,maxHp:40,initiative:60,caracs:{CC:60,E:30,F:30},size:3,talents:actorTalents,armor:{head:0,body:0,arms:0,legs:0},extensions:{ficheId:'synthetic-a'}});
  await store.addProfile({id:'control-profile-t',name:'Même nom de contrôle',kind:'PJ',hp:40,maxHp:40,initiative:30,caracs:{CC:30,E:30,F:30},size:3,talents:targetTalents,armor:{head:0,body:0,arms:0,legs:0},extensions:{ficheId:'synthetic-t'}});
  for (const id of ['control-enc-a','control-enc-b']) await store.saveEncounter({id,title:'Même titre de contrôle',entries:[{id:id+':a',profileId:'control-profile-a',quantity:1,zone:'active'},{id:id+':t',profileId:'control-profile-t',quantity:1,zone:'active'}]});
  await store.launchEncounter('control-enc-a'); const engine=createCombatEngine(store); await engine.start();
  const [actor,target]=store.listParticipants(); return {store,engine,persistence,actorId:actor.id,targetId:target.id};
}
const attack = (ctx, resolutionId, v5 = {}) => ctx.store.previewResolution({resolutionId,actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:4},roll:61,defense:{kind:'melee',base:20,roll:81},v5:{kind:'melee',...v5}});
const subject = (ctx,id) => ctx.store.listParticipants().find(row => row.id===id);
const ledger = store => envelope(store).extensions?.v5?.actionLedger;

test('Contrôle raccordement 2.3 — Élan payé avant inversion, registre et dégâts atomiques, regain ne contourne pas quota', async () => {
  const ctx=await setup(); await ctx.store.updateParticipant(ctx.actorId,{extensions:{...subject(ctx,ctx.actorId).extensions,v5:{hasMomentum:true}}});
  const preview=attack(ctx,'control-paid',{extraAttack:true});
  assert.equal(preview.choiceRequired,false); assert.equal(preview.roll,61); assert.equal(hasMomentum(preview.input.actor),false); assert.equal(preview.actionCosts.ready,true);
  const beforeRevision=ctx.store.getLocalRevision(), beforeHp=subject(ctx,ctx.targetId).hp;
  assert.equal((await ctx.store.applyResolution(preview)).status,'applied');
  assert.equal(ctx.store.getLocalRevision(),beforeRevision+1); assert.ok(subject(ctx,ctx.targetId).hp<beforeHp);
  assert.equal(ledger(ctx.store).quotaUsage.find(row=>row.quotaId==='system:paid-momentum-extra-attack').used,1);
  assert.equal(hasMomentum(subject(ctx,ctx.actorId)),true,'Win regains Momentum, quota must remain consumed');
  const reloaded=createStore({persistence:ctx.persistence}); await reloaded.ready; const repeated=attack({...ctx,store:reloaded},'control-paid-again',{extraAttack:true});
  assert.equal(repeated.actionCosts.ready,false); assert.ok(repeated.unresolved.some(reason=>/Quota/.test(reason)));
  assert.equal((await reloaded.applyResolution(repeated)).status,'manual');
  assert.equal((await reloaded.applyResolution(preview)).status,'duplicate');
});

test('Contrôle raccordement 2.3 — annulation restaure coût, usage et résultat ensemble, reçu local conservé', async () => {
  const ctx=await setup(); await ctx.store.setFortune(ctx.actorId,2); const before=envelope(ctx.store), beforeHistory=ctx.store.getHistory();
  const preview=attack(ctx,'control-fortune-attack',{costs:[{id:'fortune-control',resource:'fortune',amount:1}],quotas:[{id:'control-talent',scope:'encounter',maximum:1}]});
  assert.equal(preview.actionCosts.ready,true); assert.equal((await ctx.store.applyResolution(preview)).status,'applied'); assert.equal(ctx.store.getFortune(ctx.actorId).balance,1);
  await ctx.store.undo(); assert.equal(ctx.store.getFortune(ctx.actorId).balance,2); assert.equal(subject(ctx,ctx.targetId).hp,before.combat.participants.find(row=>row.id===ctx.targetId).hp);
  assert.deepEqual(ledger(ctx.store),before.extensions?.v5?.actionLedger); assert.equal(ctx.store.getLog().filter(row=>row.detail?.resolutionId===preview.resolutionId).length,1);
  assert.equal(ctx.store.getHistory().past.length,beforeHistory.past.length);
});

test('Contrôle raccordement 2.3 — rejet disque et aperçu périmé préservent Fortune, quota, blessures et annulation', async () => {
  const ctx=await setup(); await ctx.store.setFortune(ctx.actorId,2);
  const preview=attack(ctx,'control-disk',{costs:[{id:'fortune-control',resource:'fortune',amount:1}],quotas:[{id:'control-talent',scope:'turn',maximum:1}]});
  const before={durable:ctx.persistence.snapshot(),log:ctx.store.getLog(),history:ctx.store.getHistory(),participants:ctx.store.listParticipants(),fortune:ctx.store.getFortune(ctx.actorId)};
  ctx.persistence.reject(true); assert.equal((await ctx.store.applyResolution(preview)).status,'error');
  assert.deepEqual(ctx.persistence.snapshot(),before.durable); assert.deepEqual(ctx.store.getLog(),before.log); assert.deepEqual(ctx.store.getHistory(),before.history); assert.deepEqual(ctx.store.listParticipants(),before.participants); assert.deepEqual(ctx.store.getFortune(ctx.actorId),before.fortune);
  ctx.persistence.reject(false); await ctx.store.setFortune(ctx.actorId,3); assert.equal((await ctx.store.applyResolution(preview)).status,'stale'); assert.equal(ctx.store.getFortune(ctx.actorId).balance,3); assert.deepEqual(ledger(ctx.store),before.durable.extensions?.v5?.actionLedger);
});

test('Contrôle raccordement 2.3 — exemption conserve quota talent, acteur suivant et Tour suivant indépendants', async () => {
  const ctx=await setup();
  const options={extraAttack:true,costs:[{id:'waived-momentum',resource:'momentum',amount:1}],exemptions:[{costId:'waived-momentum',sourceId:'control-free-attack'}],quotas:[{id:'control-free-talent',scope:'turn',maximum:1}]};
  const first=attack(ctx,'control-free-first',options); assert.equal(first.actionCosts.ready,true); assert.equal(first.actionCosts.paid.length,0); assert.equal((await ctx.store.applyResolution(first)).status,'applied');
  const repeat=attack(ctx,'control-free-repeat',options); assert.equal(repeat.actionCosts.ready,false); assert.ok(repeat.unresolved.some(reason=>/Quota/.test(reason)));
  assert.ok(!ledger(ctx.store).quotaUsage.some(row=>row.quotaId==='system:paid-momentum-extra-attack'));
  await ctx.engine.nextTurn(); await ctx.engine.nextTurn(); const next=attack(ctx,'control-free-next',options); assert.equal(next.actionCosts.ready,true);
});

test('Contrôle raccordement 2.3 — Fortune unknown reste inconnue malgré cache participant, maximum et destin', () => {
  const actor={id:'control-a',kind:'PJ',extensions:{ficheId:'synthetic-a',v5:{resources:{fortune:5}}},ficheSnapshot:{charId:'synthetic-a',resources:{fortuneMax:5},destin:3}};
  const state={combat:{participants:[actor]},reserve:[],extensions:{v5:{}}};
  assert.equal(getV5Fortune(state,actor).balance,null); assert.equal(getV5Fortune(state,actor).sourceBalance,null); assert.equal(Object.hasOwn(projectV5Resources(state,[actor])[0].extensions.v5.resources,'fortune'),false);
});


const owned = id => ({id,name:id,rank:1,status:'resolved'});
test('Contrôle raccordement 2.3 — Fortune par identité et pas par nom, suspendre/supprimer/recharger/exporter/cloud conserve le solde', async () => {
  const ctx=await setup(); await ctx.store.setFortune(ctx.actorId,2); await ctx.store.setFortune(ctx.targetId,5);
  const preview=attack(ctx,'control-between-encounters',{costs:[{id:'fortune-control',resource:'fortune',amount:1}],quotas:[{id:'control-per-encounter',scope:'encounter',maximum:1}]});
  assert.equal((await ctx.store.applyResolution(preview)).status,'applied'); await ctx.store.suspendActiveScene(); await ctx.store.launchEncounter('control-enc-b'); await ctx.engine.start();
  const [actor,target]=ctx.store.listParticipants(); assert.notEqual(actor.id,ctx.actorId); assert.equal(ctx.store.getFortune(actor.id).balance,1); assert.equal(ctx.store.getFortune(target.id).balance,5);
  await ctx.store.deleteEncounter('control-enc-a'); assert.equal(ctx.store.getFortune(actor.id).balance,1); assert.ok(!ledger(ctx.store).appliedActions.some(row=>row.encounterId==='control-enc-a')); assert.ok(!ledger(ctx.store).quotaUsage.some(row=>JSON.parse(row.scopeKey)[0]==='control-enc-a'));
  for (const command of ctx.persistence.snapshot().history.past) for (const state of [command.result?.state,command.inverse?.state].filter(Boolean)) assert.ok(!(state.extensions?.v5?.actionLedger?.quotaUsage||[]).some(row=>JSON.parse(row.scopeKey)[0]==='control-enc-a'));
  await ctx.store.undo(); assert.equal(ctx.store.getFortune(actor.id).balance,1); assert.ok(!ledger(ctx.store).quotaUsage.some(row=>JSON.parse(row.scopeKey)[0]==='control-enc-a'));
  const reloaded=createStore({persistence:ctx.persistence}); await reloaded.ready; assert.equal(reloaded.getFortune(actor.id).balance,1);
  const imported=createStore({persistence:memory()}); await imported.ready; await imported.loadFromJSON(reloaded.getFullJSON()); assert.equal(imported.getFortune(actor.id).balance,1);
  const {createSyncDocument,validateSyncDocument}=await import('../js/core/sync-protocol.js'); const cloud=validateSyncDocument(JSON.parse(JSON.stringify(createSyncDocument(envelope(reloaded),{revision:15})))); assert.deepEqual(cloud.state.extensions.v5.characterResources,envelope(reloaded).extensions.v5.characterResources); assert.deepEqual(cloud.state.extensions.v5.actionLedger,ledger(reloaded));
});

test('Contrôle raccordement 2.3 — Mâchoires direct Sonné1 évité0 consomme quota, conserve Élan, undo et reload exacts', async () => {
  const ctx=await setup({targetTalents:[owned('talent-iron-jaw')]}); await ctx.store.updateParticipant(ctx.targetId,{extensions:{...subject(ctx,ctx.targetId).extensions,v5:{hasMomentum:true}}});
  assert.equal((await ctx.store.acquireConditions(ctx.targetId,[{name:'Stunned',level:0}],{resolutionId:'control-stun-zero'})).status,'applied'); assert.ok(!(ledger(ctx.store)?.quotaUsage||[]).some(row=>row.quotaId==='talent-iron-jaw:first-stunned'));
  assert.equal((await ctx.store.acquireConditions(ctx.targetId,[{name:'Sonné',level:1}],{resolutionId:'control-first-stun'})).status,'applied'); assert.equal(subject(ctx,ctx.targetId).states.length,0); assert.equal(hasMomentum(subject(ctx,ctx.targetId)),true);
  assert.equal(ledger(ctx.store).quotaUsage.find(row=>row.quotaId==='talent-iron-jaw:first-stunned').used,1);
  await ctx.store.undo(); assert.ok(!(ledger(ctx.store)?.quotaUsage||[]).some(row=>row.quotaId==='talent-iron-jaw:first-stunned')); assert.equal(hasMomentum(subject(ctx,ctx.targetId)),true);
  await ctx.store.redo(); const reload=createStore({persistence:ctx.persistence}); await reload.ready; assert.equal((await reload.acquireConditions(ctx.targetId,[{name:'Stunned',level:1}],{resolutionId:'control-second-stun'})).status,'applied'); assert.equal(reload.listParticipants().find(row=>row.id===ctx.targetId).states.find(row=>row.key==='sonne').level,1); assert.equal(hasMomentum(reload.listParticipants().find(row=>row.id===ctx.targetId)),false);
});

test('Contrôle raccordement 2.3 — attaque payante critique et Mâchoires gardent leurs deux quotas dans la même commande', async () => {
  const ctx=await setup({targetTalents:[owned('talent-iron-jaw')]}); await ctx.store.setFortune(ctx.actorId,2);
  const preview=ctx.store.previewResolution({resolutionId:'control-paid-iron',actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:4},roll:22,defense:{base:20,roll:81},criticalRolls:{location:2,effect:20},v5:{kind:'melee',costs:[{id:'fortune-control',resource:'fortune',amount:1}],quotas:[{id:'control-outer-cost-quota',scope:'turn',maximum:1}]}});
  assert.equal(preview.critical.application.states.length,0); assert.equal(preview.talentUsageRequests.length,1); assert.equal((await ctx.store.applyResolution(preview)).status,'applied'); assert.equal(ctx.store.getFortune(ctx.actorId).balance,1);
  assert.equal(ledger(ctx.store).quotaUsage.find(row=>row.quotaId==='control-outer-cost-quota').used,1); assert.equal(ledger(ctx.store).quotaUsage.find(row=>row.quotaId==='talent-iron-jaw:first-stunned').used,1);
  assert.equal((await ctx.store.acquireConditions(ctx.targetId,[{name:'Sonné',level:1}],{resolutionId:'control-paid-iron-later'})).status,'applied'); assert.equal(subject(ctx,ctx.targetId).states.find(row=>row.key==='sonne').level,1);
});

test('Contrôle raccordement 2.3 — Battement efface toutes Blessures/critique cible et garde critique défenseur indépendant', async () => {
  const ctx=await setup({actorTalents:[owned('talent-beat-blade')]}); await ctx.store.updateParticipant(ctx.targetId,{hp:1});
  const preview=ctx.store.previewResolution({resolutionId:'control-beat-both-criticals',actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:40},roll:22,defense:{base:70,roll:44},defenderCriticalRolls:{location:2,effect:20},v5:{kind:'melee',actorSize:3,targetSize:3,talentChoices:{'talent-beat-blade:replace-damage':true}}});
  assert.equal(preview.unresolved.length,0); assert.equal(preview.damage,null); assert.equal(preview.critical,null); assert.ok(preview.defenderCritical); assert.equal(preview.activeEffects.length,1); assert.equal(preview.activeEffects[0].v5Timing.expiry.actorId,ctx.actorId);
  assert.equal((await ctx.store.applyResolution(preview)).status,'applied'); assert.equal(subject(ctx,ctx.targetId).hp,1); assert.equal(subject(ctx,ctx.targetId).states.length,1); assert.equal(subject(ctx,ctx.targetId).states[0].kind,'talent-active'); assert.equal(subject(ctx,ctx.targetId).states[0].source.talentId,'talent-beat-blade'); assert.ok(subject(ctx,ctx.actorId).hp<40); assert.ok(subject(ctx,ctx.actorId).states.some(row=>row.key==='sonne'));
  await ctx.store.undo(); assert.equal(subject(ctx,ctx.targetId).states.length,0); assert.equal(subject(ctx,ctx.actorId).hp,40);
});

test('Contrôle raccordement 2.3 — Battement interdit Melee, autorise Esquive et expire fin prochain Tour auteur après reload', async () => {
  const ctx=await setup({actorTalents:[owned('talent-beat-blade')]});
  const input={actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:4},roll:23,defense:{base:20,roll:81},v5:{kind:'melee',actorSize:3,targetSize:3,talentChoices:{'talent-beat-blade:replace-damage':true}}};
  const first=ctx.store.previewResolution({...input,resolutionId:'control-beat-clock'}); assert.equal((await ctx.store.applyResolution(first)).status,'applied');
  const later={...input,v5:{...input.v5,choice:'keep',talentChoices:{'talent-beat-blade:replace-damage':false}}};
  const melee=ctx.store.previewResolution({...later,resolutionId:'control-beat-restrict'}); assert.ok(melee.unresolved.some(row=>/Battement.*Corps à corps/.test(row))); assert.equal((await ctx.store.applyResolution(melee)).status,'manual');
  const dodge=ctx.store.previewResolution({...later,resolutionId:'control-beat-dodge',defense:{label:'Esquive',base:20,roll:81,v5:{kind:'test'}}}); assert.ok(!dodge.unresolved.some(row=>/Battement.*Corps à corps/.test(row))); assert.ok(dodge.test.advantage.advantage.some(row=>row.id==='talent-beat-blade'));
  await ctx.engine.nextTurn(); assert.ok(subject(ctx,ctx.targetId).states.some(row=>row.kind==='talent-active' && row.source?.talentId==='talent-beat-blade')); await ctx.engine.nextTurn(); assert.ok(subject(ctx,ctx.targetId).states.some(row=>row.kind==='talent-active' && row.source?.talentId==='talent-beat-blade'));
  const reload=createStore({persistence:ctx.persistence}); await reload.ready; const resumed=createCombatEngine(reload); await resumed.nextTurn(); assert.ok(!reload.listParticipants().find(row=>row.id===ctx.targetId).states.some(row=>row.kind==='talent-active' && row.source?.talentId==='talent-beat-blade')); await reload.undo(); assert.ok(reload.listParticipants().find(row=>row.id===ctx.targetId).states.some(row=>row.kind==='talent-active' && row.source?.talentId==='talent-beat-blade'));
});


test('Contrôle raccordement 2.3 — Coup puissant utilise Avantage net après paiement et annulation, sans multiplier rang', async () => {
  const ctx=await setup({actorTalents:[{...owned('talent-strike-mighty-blow'),rank:3}]}); await ctx.store.updateParticipant(ctx.actorId,{extensions:{...subject(ctx,ctx.actorId).extensions,v5:{hasMomentum:true}}});
  const normal=attack(ctx,'control-mighty-normal',{choice:'keep'}), paid=attack(ctx,'control-mighty-paid',{extraAttack:true});
  const bonus = preview => preview.talentPlans.flatMap(plan=>plan.proposals).find(row=>row.op==='modifyDamage')?.amount;
  assert.equal(bonus(normal),2); assert.equal(bonus(paid),1); assert.equal(paid.test.advantage.net,0); assert.equal(normal.damage.finalDamage-paid.damage.finalDamage,1);
  const cancelled=attack(ctx,'control-mighty-cancelled',{disadvantageSources:[{id:'control-disadvantage',label:'Désavantage synthétique'}]}); assert.equal(cancelled.test.advantage.net,0); assert.equal(bonus(cancelled),1);
  assert.equal((await ctx.store.applyResolution(paid)).status,'applied'); assert.equal(ctx.store.getLog()[0].detail.talentPlans.flatMap(plan=>plan.proposals).find(row=>row.op==='modifyDamage').amount,1);
});

test('Contrôle raccordement 2.3 — simulation ne dépense rien puis confirme coût et résultat une seule fois', async () => {
  const ctx=await setup(); await ctx.store.setFortune(ctx.actorId,2); await ctx.store.updateParticipant(ctx.actorId,{extensions:{...subject(ctx,ctx.actorId).extensions,v5:{hasMomentum:true}}});
  const beforeHp=subject(ctx,ctx.targetId).hp, beforeRevision=ctx.store.getLocalRevision();
  const simulation=ctx.store.simulateAction({resolutionId:'control-simulation-paid',actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:4},roll:61,defense:{base:20,roll:81},v5:{kind:'melee',extraAttack:true,costs:[{id:'fortune-control',resource:'fortune',amount:1}]}});
  assert.equal(ctx.store.getFortune(ctx.actorId).balance,2); assert.equal(hasMomentum(subject(ctx,ctx.actorId)),true); assert.equal(subject(ctx,ctx.targetId).hp,beforeHp); assert.equal(ctx.store.getLocalRevision(),beforeRevision); assert.equal(simulation.preview.roll,61);
  assert.equal((await ctx.store.applySimulation(simulation)).status,'applied'); assert.equal(ctx.store.getFortune(ctx.actorId).balance,1); assert.equal(ctx.store.getLocalRevision(),beforeRevision+1); assert.equal(ledger(ctx.store).appliedActions.filter(row=>row.actionId==='control-simulation-paid').length,1);
  assert.equal((await ctx.store.applySimulation(simulation)).status,'duplicate'); await ctx.store.undo(); assert.equal(ctx.store.getFortune(ctx.actorId).balance,2); assert.equal(subject(ctx,ctx.targetId).hp,beforeHp); assert.equal(hasMomentum(subject(ctx,ctx.actorId)),true);
});

test('Contrôle raccordement 2.3 — Battement choix/tailles inconnus bloquent, refus reste action ordinaire sans tailles', async () => {
  const ctx=await setup({actorTalents:[owned('talent-beat-blade')]});
  const input={actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:4},roll:23,defense:{base:20,roll:81}};
  const missing=ctx.store.previewResolution({...input,resolutionId:'control-beat-missing',v5:{kind:'melee',talentChoices:{'talent-beat-blade:replace-damage':true}}}); assert.ok(missing.unresolved.some(row=>row.includes('size'))); assert.equal((await ctx.store.applyResolution(missing)).status,'manual');
  const ordinary=ctx.store.previewResolution({...input,resolutionId:'control-beat-declined',v5:{kind:'melee',talentChoices:{'talent-beat-blade:replace-damage':false}}}); assert.equal(ordinary.unresolved.length,0); assert.ok(ordinary.damage); assert.equal(ordinary.activeEffects.length,0);
  const larger=ctx.store.previewResolution({...input,resolutionId:'control-beat-larger',v5:{kind:'melee',actorSize:3,targetSize:4,talentChoices:{'talent-beat-blade:replace-damage':true}}}); assert.ok(larger.damage); assert.equal(larger.activeEffects.length,0);
});

test('Contrôle raccordement 2.3 — Battement suspendu ne prend pas Tours autre rencontre avant reprise', async () => {
  const ctx=await setup({actorTalents:[owned('talent-beat-blade')]});
  const preview=ctx.store.previewResolution({resolutionId:'control-beat-paused',actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:4},roll:23,defense:{base:20,roll:81},v5:{kind:'melee',actorSize:3,targetSize:3,talentChoices:{'talent-beat-blade:replace-damage':true}}}); assert.equal((await ctx.store.applyResolution(preview)).status,'applied');
  await ctx.engine.nextTurn(); const scene=ctx.store.getActiveScene(); await ctx.store.suspendActiveScene(); await ctx.store.launchEncounter('control-enc-b'); await ctx.engine.start(); for(let i=0;i<6;i++)await ctx.engine.nextTurn();
  await ctx.store.suspendActiveScene(); await ctx.store.resumeScene(scene.id); assert.ok(subject(ctx,ctx.targetId).states.some(row=>row.kind==='talent-active'&&row.source?.talentId==='talent-beat-blade'));
  await ctx.engine.nextTurn(); assert.ok(subject(ctx,ctx.targetId).states.some(row=>row.kind==='talent-active'&&row.source?.talentId==='talent-beat-blade')); await ctx.engine.nextTurn(); assert.ok(!subject(ctx,ctx.targetId).states.some(row=>row.kind==='talent-active'&&row.source?.talentId==='talent-beat-blade'));
});

test('Contrôle raccordement 2.3 — modifier aperçu ou simulation après confirmation ne change pas la commande capturée', async () => {
  const ctx=await setup(); await ctx.store.setFortune(ctx.actorId,2);
  const preview=attack(ctx,'control-captured-queue',{costs:[{id:'fortune-control',resource:'fortune',amount:1}]}); const damage=preview.damage.finalDamage, hp=subject(ctx,ctx.targetId).hp;
  const committing=ctx.store.applyResolution(preview); preview.input.actor.hp=1; preview.damage.finalDamage=99; preview.actionCostPlan.request.costs[0].amount=2; preview.resolutionId='control-tampered';
  assert.equal((await committing).status,'applied'); assert.equal(ctx.store.getFortune(ctx.actorId).balance,1); assert.equal(subject(ctx,ctx.targetId).hp,hp-damage); assert.equal(ctx.store.getLog()[0].detail.resolutionId,'control-captured-queue');
  await ctx.store.undo();
  const sim=ctx.store.simulateAction({resolutionId:'control-captured-simulation',actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:4},roll:61,defense:{base:20,roll:81},v5:{kind:'melee',costs:[{id:'fortune-control',resource:'fortune',amount:1}]}}); const simDamage=sim.preview.damage.finalDamage;
  const simCommit=ctx.store.applySimulation(sim); sim.preview.input.actor.hp=1; sim.preview.damage.finalDamage=99; sim.preview.actionCostPlan.request.costs[0].amount=2; sim.preview.resolutionId='control-tampered-sim';
  assert.equal((await simCommit).status,'applied'); assert.equal(ctx.store.getFortune(ctx.actorId).balance,1); assert.equal(subject(ctx,ctx.targetId).hp,hp-simDamage); assert.equal(ctx.store.getLog()[0].detail.resolutionId,'control-captured-simulation');
});

const sourceAttack = (ctx,id) => ctx.store.previewResolution({resolutionId:id,actorId:ctx.actorId,targetId:ctx.targetId,action:{id:'control-blade',type:'attack',attr:'CC',base:60,damage:4},roll:23,defense:{base:20,roll:81},v5:{kind:'melee'}});
const reactionAttack = (ctx,offer,id,overrides={}) => ctx.store.previewResolution({resolutionId:id,actorId:ctx.actorId,targetId:ctx.targetId,action:structuredClone(offer.action),roll:61,defense:{base:20,roll:81},v5:{kind:'melee',reactionId:offer.id,costs:[],quotas:[],reactionSourceResolutionId:'forged-client-source'},...overrides});

test('Contrôle raccordement 2.3 — Assaut offre après touche, Élan avant calcul, confirmation atomique Round/Tour et undo', async () => {
  const ctx=await setup({actorTalents:[owned('talent-furious-assault'),owned('talent-strike-mighty-blow')]}); const source=sourceAttack(ctx,'control-furious-source'); assert.equal((await ctx.store.applyResolution(source)).status,'applied');
  const offer=ctx.store.getReactionOpportunities(ctx.actorId)[0]; assert.ok(offer); assert.equal(offer.sourceResolutionId,source.resolutionId); assert.equal(offer.actorId,ctx.actorId); assert.equal(offer.targetId,ctx.targetId); assert.equal((ledger(ctx.store).quotaUsage||[]).length,0);
  const durable=ctx.persistence.snapshot(), hp=subject(ctx,ctx.targetId).hp; const preview=reactionAttack(ctx,offer,'control-furious-result'); assert.equal(ctx.store.getLocalRevision(),durable.localRevision); assert.equal(preview.roll,61); assert.equal(preview.choiceRequired,false); assert.equal(preview.input.actor.extensions.v5.hasMomentum,false); assert.equal(preview.input.v5.reactionSourceResolutionId,source.resolutionId); assert.equal(preview.talentPlans.flatMap(plan=>plan.proposals).find(row=>row.op==='modifyDamage').amount,1);
  assert.deepEqual(ctx.persistence.snapshot(),durable,'Preparing opportunity must not consume or persist anything'); ctx.persistence.reject(true); assert.equal((await ctx.store.applyResolution(preview)).status,'error'); assert.deepEqual(ctx.persistence.snapshot(),durable); assert.equal(ctx.store.getReactionOpportunities(ctx.actorId).length,1); assert.equal(subject(ctx,ctx.targetId).hp,hp);
  ctx.persistence.reject(false); assert.equal((await ctx.store.applyResolution(preview)).status,'applied'); assert.equal(ctx.store.getReactionOpportunities(ctx.actorId).length,0); assert.equal(ledger(ctx.store).quotaUsage.find(row=>row.quotaId==='talent-furious-assault:round').used,1); assert.equal(ledger(ctx.store).quotaUsage.find(row=>row.quotaId==='system:paid-momentum-extra-attack').used,1); assert.equal(hasMomentum(subject(ctx,ctx.actorId)),true);
  const repeat=sourceAttack(ctx,'control-furious-repeat'); repeat.input.v5.choice='keep'; const rebuilt=ctx.store.previewResolution({...repeat.input,resolutionId:'control-furious-repeat',v5:{...repeat.input.v5,choice:'keep'}}); assert.equal((await ctx.store.applyResolution(rebuilt)).status,'applied'); assert.equal(ctx.store.getReactionOpportunities(ctx.actorId).length,0,'Round usage blocks another opportunity despite regained Momentum'); await ctx.store.undo(); await ctx.store.undo(); assert.equal(ctx.store.getReactionOpportunities(ctx.actorId).length,1); assert.equal(ledger(ctx.store).quotaUsage.length,0); assert.equal(subject(ctx,ctx.targetId).hp,hp);
});

test('Contrôle raccordement 2.3 — Assaut refuse source inconnue, auteur/cible/arme changés et horloge expirée', async () => {
  const ctx=await setup({actorTalents:[owned('talent-furious-assault')]}); assert.equal((await ctx.store.applyResolution(sourceAttack(ctx,'control-furious-invalid-source'))).status,'applied'); const offer=ctx.store.getReactionOpportunities(ctx.actorId)[0];
  for(const [name,override] of [['unknown',{v5:{kind:'melee',reactionId:'no-such-source'}}],['target',{targetId:ctx.actorId}],['actor',{actorId:ctx.targetId}],['weapon',{action:{...offer.action,id:'control-other-weapon'}}],['damage',{action:{...offer.action,damage:100}}]]){
    const preview=reactionAttack(ctx,offer,'control-invalid-'+name,override); assert.ok(preview.unresolved.length>0,name); assert.notEqual((await ctx.store.applyResolution(preview)).status,'applied',name); assert.equal(ctx.store.getReactionOpportunities(ctx.actorId).length,1);
  }
  await ctx.engine.nextTurn(); assert.equal(ctx.store.getReactionOpportunities(ctx.actorId).length,0); const expired=reactionAttack(ctx,offer,'control-furious-expired'); assert.ok(expired.unresolved.length>0); assert.notEqual((await ctx.store.applyResolution(expired)).status,'applied');
});

test('Contrôle raccordement 2.3 — Assaut rechargé/exporté/cloud conserve lien, purge rencontre nettoie offres et historique', async () => {
  const ctx=await setup({actorTalents:[owned('talent-furious-assault')]}); assert.equal((await ctx.store.applyResolution(sourceAttack(ctx,'control-furious-durable-source'))).status,'applied'); const offer=ctx.store.getReactionOpportunities(ctx.actorId)[0];
  const reload=createStore({persistence:ctx.persistence}); await reload.ready; assert.equal(reload.getReactionOpportunities(ctx.actorId)[0].sourceResolutionId,offer.sourceResolutionId); assert.equal(reactionAttack({...ctx,store:reload},offer,'control-reloaded-reaction').actionCosts.ready,true);
  const {createSyncDocument}=await import('../js/core/sync-protocol.js'); const cloud=createSyncDocument(envelope(reload)); assert.equal(cloud.state.extensions.v5.reactionOpportunities[0].sourceResolutionId,offer.sourceResolutionId); assert.equal(Object.hasOwn(cloud.state,'appliedResolutionIds'),false); const imported=createStore({persistence:memory()}); await imported.ready; await imported.loadFromJSON(cloud.state); assert.equal(imported.getReactionOpportunities(ctx.actorId)[0].sourceResolutionId,offer.sourceResolutionId);
  await reload.deleteEncounter('control-enc-a'); assert.equal((envelope(reload).extensions.v5.reactionOpportunities||[]).length,0); for(const command of ctx.persistence.snapshot().history.past)for(const state of [command.result?.state,command.inverse?.state].filter(Boolean))assert.ok(!(state.extensions?.v5?.reactionOpportunities||[]).some(row=>row.encounterId==='control-enc-a')); await reload.undo(); assert.equal(reload.getReactionOpportunities(ctx.actorId).length,0);
});

test('Contrôle raccordement 2.3 — événement Sonné identifié est appliqué une fois même après quota Mâchoires épuisé', async () => {
  const ctx=await setup({targetTalents:[owned('talent-iron-jaw')]}); assert.equal((await ctx.store.acquireConditions(ctx.targetId,[{name:'Sonné',level:1}],{resolutionId:'control-direct-id'})).status,'applied'); const before=ctx.persistence.snapshot(); assert.equal((await ctx.store.acquireConditions(ctx.targetId,[{name:'Sonné',level:1}],{resolutionId:'control-direct-id'})).status,'duplicate'); assert.deepEqual(ctx.persistence.snapshot(),before); assert.equal(subject(ctx,ctx.targetId).states.length,0);
});

test('Contrôle raccordement 2.3 — Assaut refuse talent retiré ou empreinte source durable inconnue/modifiée', async () => {
  const missing=await setup({actorTalents:[owned('talent-furious-assault')]}); assert.equal((await missing.store.applyResolution(sourceAttack(missing,'control-furious-talent-source'))).status,'applied'); const offer=missing.store.getReactionOpportunities(missing.actorId)[0]; await missing.store.updateParticipant(missing.actorId,{talents:[]}); const removed=reactionAttack(missing,offer,'control-furious-talent-removed'); assert.ok(removed.unresolved.length>0); assert.notEqual((await missing.store.applyResolution(removed)).status,'applied');
  for(const hash of [null,'sha256:'+'0'.repeat(64)]) {
    const ctx=await setup({actorTalents:[owned('talent-furious-assault')]}); assert.equal((await ctx.store.applyResolution(sourceAttack(ctx,'control-furious-source-pin'))).status,'applied'); const offer=ctx.store.getReactionOpportunities(ctx.actorId)[0];
    await ctx.store.executeCommand('control-change-public-origin',draft=>({...draft,extensions:{...draft.extensions,v5:{...draft.extensions.v5,reactionOpportunities:draft.extensions.v5.reactionOpportunities.map(row=>({...row,source:hash?{...row.source,effectHash:hash}:null}))}}}));
    const changed=reactionAttack(ctx,offer,'control-furious-source-blocked'); assert.ok(changed.unresolved.length>0); assert.notEqual((await ctx.store.applyResolution(changed)).status,'applied');
  }
});

test('Contrôle raccordement 2.3 — première association PJ conserve Fortune dépensée dans scènes active/suspendue, undo/refresh et autre fiche distincts', async () => {
  const persistence=memory(), store=createStore({persistence}); await store.ready; await store.addProfile({id:'control-unbound-pj',name:'Même nom',kind:'PJ',hp:40,maxHp:40,initiative:60,caracs:{E:30}});
  for(const id of ['control-binding-a','control-binding-b'])await store.saveEncounter({id,title:'Même titre',entries:[{id:id+':entry',profileId:'control-unbound-pj',quantity:1,zone:'active'}]});
  await store.launchEncounter('control-binding-a'); const first=store.listParticipants()[0].id; await createCombatEngine(store).start(); await store.setFortune(first,3); await store.acquireConditions(first,[{name:'Sonné',level:2}],{resolutionId:'control-binding-stun'}); await store.recoverCondition(first,'sonne',{method:'fortune'}); assert.equal(store.getFortune(first).balance,2);
  await store.suspendActiveScene(); await store.launchEncounter('control-binding-b'); const second=store.listParticipants()[0].id;
  const {ficheSnapshot}=await import('../js/core/fiche-sync.js'); const snapshot=ficheSnapshot('synthetic-first-bind',{nom:'Même nom',chance:'9',destin:'99'}); await store.applyFicheSync([{profileId:'control-unbound-pj',snapshot}]);
  assert.equal(store.getFortune(second).characterId,'fiche:synthetic-first-bind'); assert.equal(store.getFortune(second).balance,2); assert.equal(store.getFortune('control-unbound-pj').balance,2); assert.equal(store.getFortune(second).initializedFrom,'mj'); assert.equal(store.listSuspendedScenes()[0].participants.find(row=>row.id===first).extensions.v5.resources.fortune,2); assert.equal(envelope(store).extensions.v5.characterResources.length,1);
  await store.undo(); assert.equal(store.getFortune(second).characterId,'copy:control-binding-b:control-binding-b:entry:0'); assert.equal(store.getFortune(second).balance,null); const undone=envelope(store),suspendedFirst=undone.suspendedScenes[0].participants.find(row=>row.id===first); assert.equal(getV5Fortune(undone,suspendedFirst).balance,2,'Undo restores the spent pool only to the original anonymous scene copy'); await store.redo(); assert.equal(store.getFortune(second).balance,2);
  await store.applyFicheSync([{profileId:'control-unbound-pj',snapshot:ficheSnapshot('synthetic-first-bind',{nom:'Même nom',chance:'8'})}]); assert.equal(store.getFortune(second).balance,2);
  const reload=createStore({persistence}); await reload.ready; assert.equal(reload.getFortune(second).balance,2); await reload.applyFicheSync([{profileId:'control-unbound-pj',replaceAssociation:true,snapshot:ficheSnapshot('synthetic-other-bind',{nom:'Même nom',chance:'5'})}]); assert.equal(reload.getFortune(second).balance,null); assert.equal(reload.getFortune(second).characterId,'fiche:synthetic-other-bind');
});
