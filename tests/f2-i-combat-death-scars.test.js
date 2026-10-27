import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { V5_CRIT_DATA, getV5CriticalEffect } from '../js/data/v5-crits.js';
import {
  applyAmputationShock,
  createCriticalAftermathRecord,
  decideCriticalDeath,
  decideImmediateCriticalDeath,
  decideSuddenDeath,
  previewAmputationShock,
  previewSuddenDeath,
  updateCriticalDeathCountdown,
  CRITICAL_AFTERMATH_FIELD,
  CRITICAL_DEATH_FIELD
} from '../js/core/v5-critical-aftermath.js';

const person = (id = 'p', overrides = {}) => ({
  id, name: id, kind: 'PJ', hp: 12, maxHp: 12, caracs: { E: 30 }, states: [], extensions: { v5: {} }, ...overrides
});
const wounds = count => Array.from({ length: count }, (_, index) => ({ id: `crit-${index + 1}`, name: `Critique ${index + 1}` }));
const unconscious = { id: 'unconscious-1', key: 'inconscient', name: 'Inconscient', level: 1 };

test('F2-I — chaque ligne de chaque table V5 produit une séquelle durable sérialisable et idempotente', () => {
  const subject = person();
  let current = subject;
  let index = 0;
  for (const [table, rows] of Object.entries(V5_CRIT_DATA)) {
    let previousMax = 0;
    for (const entry of rows) {
      index += 1;
      const effectRoll = previousMax + 1;
      previousMax = entry.max;
      const result = createCriticalAftermathRecord(current, {
        table, effectRoll, location: table, resolutionId: 'table-audit', criticalIndex: index, round: 3
      });
      assert.equal(result.status, 'applied', `${table} · ${entry.name}`);
      assert.equal(result.record.effectName, entry.name);
      assert.deepEqual(result.record.source, entry.source, `${table} · ${entry.name} garde son folio et nom source`);
      assert.equal(result.record.source.book, 'L06');
      assert.equal(result.record.source.printedPage, {HEAD:173,ARM:174,BODY:175,LEG:176}[table]);
      assert.ok(result.record.source.printedName.length>0);
      assert.equal(result.record.sequela.criticalDeath, entry.parsed.death === true);
      assert.deepEqual(result.record.sequela.states,entry.parsed.states);
      assert.deepEqual(result.record.sequela.injuries,entry.parsed.injuries);
      assert.deepEqual(result.record.sequela.durableEffects,entry.parsed.durableEffects);
      current = result.participant;
      assert.equal(createCriticalAftermathRecord(current, {
        table, effectRoll, location: table, resolutionId: 'table-audit', criticalIndex: index, round: 3
      }).status, 'duplicate', `${table} · ${entry.name} ne doit pas doubler`);
    }
  }
  const records = current.extensions.v5[CRITICAL_AFTERMATH_FIELD];
  assert.equal(records.length, index);
  assert.deepEqual(JSON.parse(JSON.stringify(records)), records);
});

test('F2-I — sequelles persistantes représentatives suivent les tables imprimées L06 p.173–176',()=>{
  const get=(table,name)=>V5_CRIT_DATA[table].find(row=>row.source.printedName===name);
  assert.deepEqual(get('HEAD','Fractured Jaw').parsed.injuries,[{kind:'injury',name:'Broken Bone',severity:'minor',part:'head'}]);
  assert.ok(get('ARM','Dislocated Shoulder').parsed.durableEffects.some(row=>row.kind==='reset-limb'&&row.extendedHealSL===6&&row.testsPerRound===1));
  assert.ok(get('ARM','Clean Break').parsed.durableEffects.some(row=>row.kind==='test'&&row.skill==='Endurance'&&row.difficultySL===-1&&row.onFailure==='sonne:1'));
  assert.ok(get('HEAD','Concussive Blow').parsed.durableEffects.some(row=>row.kind==='random-condition-count'&&row.condition==='sonne'&&row.dice==='1d10'));
  assert.ok(get('BODY','Spinal Cord Damage').parsed.durableEffects.some(row=>row.kind==='permanent-functional-loss'&&row.part==='legs'&&row.difficultySL===-3));
  const crushedFoot=get('LEG','Crushed Foot').parsed.durableEffects;
  const enduranceFail=crushedFoot.find(row=>row.kind==='test'&&row.skill==='Endurance').onFailure.effects;
  assert.ok(enduranceFail.includes('a-terre'));
  assert.ok(enduranceFail.some(row=>row.kind==='amputation'&&row.part==='toes'&&row.plusOnePerNegativeSL));
  assert.ok(crushedFoot.some(row=>row.kind==='surgery-deadline'&&row.days==='TB'));
  const gutBlow=get('BODY','Gut Blow').parsed.durableEffects.find(row=>row.kind==='test');
  assert.deepEqual(gutBlow.onFailure,{kind:'compound',effects:[
    {kind:'event',event:'vomit'},
    {kind:'condition',name:'Sonné',key:'sonne',level:1,durationRounds:1},
    {kind:'condition',name:'Souillé',key:'souille',level:1}
  ]});
  assert.deepEqual(Object.fromEntries(Object.entries(V5_CRIT_DATA).map(([key,rows])=>[key,new Set(rows.map(row=>row.source.printedPage)).size])),{HEAD:1,ARM:1,BODY:1,LEG:1});
});

test('F2-I — critique mortel de table reste soumis à confirmation explicite du MJ', () => {
  const target = person();
  const record = createCriticalAftermathRecord(target, {
    table: 'HEAD', effectRoll: 100, resolutionId: 'fatal-table', criticalIndex: 0, round: 1
  });
  assert.equal(record.record.sequela.criticalDeath, true);
  assert.equal(record.record.source.printedName,'Shattered Skull');
  assert.equal(getV5CriticalEffect('HEAD', 100).parsed.death, true);

  const pending = decideImmediateCriticalDeath(record.participant, { criticalId: record.record.id });
  assert.equal(pending.status, 'confirmation-required');
  assert.equal(record.participant.hp, 12);
  assert.equal(record.participant.extensions.v5.dead, undefined);
  const confirmed = decideImmediateCriticalDeath(record.participant, { criticalId: record.record.id, decision: 'confirm' });
  assert.equal(confirmed.status, 'dead');
  assert.equal(confirmed.participant.hp, 0);
  assert.equal(confirmed.participant.extensions.v5.dead, true);
});

test('F2-I — décompte critique exige BE+1 et Inconscient, puis attend le MJ', () => {
  const target = person('p', { hp: 0, states: [unconscious], extensions: { v5: { criticalWounds: wounds(4) } } });
  const started = updateCriticalDeathCountdown(target, { round: 10, toughnessBonus: 3 });
  assert.equal(started.status, 'countdown');
  assert.equal(started.countdown.dueRound, 13);
  const atDeadline = updateCriticalDeathCountdown(started.participant, { round: 13, toughnessBonus: 3 });
  assert.equal(atDeadline.status, 'awaiting-mj');
  const noDecision = decideCriticalDeath(atDeadline.participant, { round: 13 });
  assert.equal(noDecision.status, 'confirmation-required');
  assert.equal(noDecision.participant.extensions.v5.dead, undefined);
  const stale = structuredClone(atDeadline.participant);
  stale.extensions.v5.criticalWounds.pop();
  assert.equal(decideCriticalDeath(stale, { round: 13, decision: 'confirm' }).status, 'blocked');
  const declined = decideCriticalDeath(atDeadline.participant, { round: 13, decision: 'decline' });
  assert.equal(declined.status, 'declined');
  assert.equal(declined.participant.extensions.v5.dead, undefined);
  const confirmed = decideCriticalDeath(atDeadline.participant, { round: 13, decision: 'confirm' });
  assert.equal(confirmed.status, 'dead');
  assert.equal(confirmed.participant.hp, 0);
  assert.equal(confirmed.participant.extensions.v5.dead, true);
});

test('F2-I — crit égal à BE ne déclenche rien, et soins / retrait d’Inconscient annulent le décompte', () => {
  const equal = person('equal', { hp: 0, states: [unconscious], extensions: { v5: { criticalWounds: wounds(3) } } });
  assert.equal(updateCriticalDeathCountdown(equal, { round: 4, toughnessBonus: 3 }).status, 'not-eligible');

  const wounded = person('wounded', { hp: 0, states: [unconscious], extensions: { v5: { criticalWounds: wounds(5) } } });
  const started = updateCriticalDeathCountdown(wounded, { round: 4, toughnessBonus: 3 });
  const healed = structuredClone(started.participant);
  healed.extensions.v5.criticalWounds.pop();
  const stoppedByHealing = updateCriticalDeathCountdown(healed, { round: 5, toughnessBonus: 3 });
  assert.equal(stoppedByHealing.status, 'cancelled');
  assert.equal(stoppedByHealing.countdown.cancelReason, 'critical-wound-healed');
  assert.equal(updateCriticalDeathCountdown(stoppedByHealing.participant, { round: 6, toughnessBonus: 3 }).status, 'cancelled');

  const recovered = structuredClone(started.participant);
  recovered.states = [];
  const stoppedByRecovery = updateCriticalDeathCountdown(recovered, { round: 5, toughnessBonus: 3 });
  assert.equal(stoppedByRecovery.status, 'cancelled');
  assert.equal(stoppedByRecovery.countdown.cancelReason, 'unconscious-removed');
});

test('F2-I — mort subite désactivée par défaut, limitée aux PNJ secondaires sans Chanceux', () => {
  const secondary = person('npc', { kind: 'PNJ', hp: 0, talents: [] });
  assert.equal(previewSuddenDeath(secondary).status, 'disabled');
  assert.equal(previewSuddenDeath(secondary, { tableOptionEnabled: true }).status, 'ineligible');
  const plan = previewSuddenDeath(secondary, { tableOptionEnabled: true, secondaryNpcConfirmed: true });
  assert.equal(plan.status, 'choice-required');
  assert.equal(decideSuddenDeath(secondary, plan).status, 'confirmation-required');
  const dead = decideSuddenDeath(secondary, plan, 'dead');
  assert.equal(dead.participant.hp, 0);
  assert.equal(dead.participant.extensions.v5.dead, true);
  const healedBeforeApply = { ...secondary, hp: 1 };
  assert.equal(decideSuddenDeath(healedBeforeApply, plan, 'dead').status, 'blocked');

  const lucky = person('lucky-npc', { kind: 'PNJ', hp: 0, talents: [{ id: 'talent-luck', nom: 'Chanceux', status: 'resolved' }] });
  assert.equal(previewSuddenDeath(lucky, { tableOptionEnabled: true, secondaryNpcConfirmed: true }).status, 'ineligible');
  const hero = person('hero', { kind: 'PJ', hp: 0 });
  assert.equal(previewSuddenDeath(hero, { tableOptionEnabled: true, secondaryNpcConfirmed: true }).status, 'ineligible');
});

test('F2-I — choc d’amputation : bornes 0, −1, −4 DR, chirurgie requise et résultat explicite', () => {
  const severity = createCriticalAftermathRecord(person(), {
    table: 'ARM', effectRoll: 115, resolutionId: 'amputation', criticalIndex: 0, round: 2
  });
  const cases = [
    [{ success: true, sl: 0 }, []],
    [{ success: false, sl: -1 }, ['À Terre', 'Sonné']],
    [{ success: false, sl: -4 }, ['À Terre', 'Sonné', 'Inconscient']]
  ];
  for (const [testResult, expected] of cases) {
    const plan = previewAmputationShock({ participant: severity.participant, criticalId: severity.record.id, difficultyDR: 2, test: testResult });
    assert.deepEqual(plan.states.map(state => state.name), expected);
    assert.equal(plan.surgeryRequired, true);
  }
  assert.equal(previewAmputationShock({ participant: severity.participant, criticalId: severity.record.id, difficultyDR: 2 }).status, 'requires-input');
  const failed = previewAmputationShock({ participant: severity.participant, criticalId: severity.record.id, difficultyDR: 2, test: { success: false, sl: -1 } });
  const applied = applyAmputationShock(severity.participant, failed);
  assert.equal(applied.status, 'applied');
  assert.ok(applied.participant.states.some(state => state.key === 'a-terre'));
  assert.ok(applied.participant.states.some(state => state.key === 'sonne'));
  assert.equal(applied.record.amputationShock.surgeryRequired, true);
  assert.equal(applyAmputationShock(applied.participant, failed).status, 'duplicate');

  const deeperSeverity = createCriticalAftermathRecord(person('deeper'), {
    table: 'ARM', effectRoll: 115, resolutionId: 'amputation-deep', criticalIndex: 0, round: 2
  });
  const severeFailure = previewAmputationShock({ participant: deeperSeverity.participant, criticalId: deeperSeverity.record.id, difficultyDR: 2, test: { success: false, sl: -4 } });
  const severe = applyAmputationShock(deeperSeverity.participant, severeFailure);
  assert.ok(severe.participant.states.some(state => state.key === 'inconscient'));
  assert.ok(!severe.participant.states.some(state => state.key === 'sonne'), 'l’acquisition canonique d’Inconscient retire Sonné');
});

test('F2-I — aucun choc sans amputation; une amputation conditionnelle exige sa confirmation',()=>{
  const nonAmputation=createCriticalAftermathRecord(person('plain'),{table:'ARM',effectRoll:40,resolutionId:'no-amputation',criticalIndex:0,round:1});
  assert.equal(previewAmputationShock({participant:nonAmputation.participant,criticalId:nonAmputation.record.id,difficultyDR:2,test:{success:false,sl:-1}}).status,'blocked');

  const conditional=createCriticalAftermathRecord(person('toe'),{table:'LEG',effectRoll:110,resolutionId:'conditional-amputation',criticalIndex:0,round:1});
  assert.equal(previewAmputationShock({participant:conditional.participant,criticalId:conditional.record.id,difficultyDR:2,test:{success:false,sl:-1}}).status,'requires-input');
  assert.equal(previewAmputationShock({participant:conditional.participant,criticalId:conditional.record.id,difficultyDR:2,test:{success:false,sl:-1},amputationOccurred:false}).status,'blocked');
  const confirmed=previewAmputationShock({participant:conditional.participant,criticalId:conditional.record.id,difficultyDR:2,test:{success:false,sl:-1},amputationOccurred:true});
  assert.equal(confirmed.status,'ready');
  assert.equal(confirmed.amputatedPart,'toes');
  assert.equal(previewAmputationShock({participant:conditional.participant,criticalId:conditional.record.id,difficultyDR:-2,test:{success:false,sl:-1},amputationOccurred:true}).status,'blocked');
  const forged=applyAmputationShock(nonAmputation.participant,{ready:true,participantId:'plain',criticalId:nonAmputation.record.id,amputationOccurred:true,difficultyDR:2,test:{success:false,sl:-1},states:[]});
  assert.equal(forged.status,'blocked');assert.deepEqual(nonAmputation.participant.states,[]);
});

test('F2-I raccord : la résolution d’attaque persiste séquelle critique, et le Store exige une décision MJ',async()=>{
  let saved=null;const persistence={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const fighter=(id,extra={})=>({id,name:id,kind:'PJ',camp:id==='foe'?'ennemi':'pj',zone:'active',hp:40,maxHp:40,caracs:{CC:60,F:30,E:30,I:40,Ag:40},skills:[],talents:[],equipment:[],traits:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},...extra});
  const store=createStore({storage:null,persistence});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'hero',order:['hero','foe'],participants:[fighter('hero'),fighter('foe')]},log:[],diceLines:[],extensions:{v5:{combatId:'f2i'}}});
  const preview=store.previewResolution({resolutionId:'f2-i-integration',actorId:'hero',targetId:'foe',roll:22,action:{type:'attack',base:60,attr:'CC',damage:5},defense:{base:30,roll:82,v5:{kind:'melee'}},v5:{kind:'melee'},criticalRolls:{location:2,effect:80}});
  assert.ok(preview.critical?.details?.effect);
  assert.equal((await store.applyResolution(preview)).status,'applied');
  const foe=store.listParticipants().find(row=>row.id==='foe'),record=foe.extensions.v5[CRITICAL_AFTERMATH_FIELD]?.[0];
  assert.equal(record.table,'HEAD');assert.equal(record.effectRoll,preview.critical.details.effectRoll);assert.equal(record.effectName,preview.critical.details.effect.name);
  const reloaded=createStore({storage:null,persistence});await reloaded.ready;
  assert.deepEqual(reloaded.listParticipants().find(row=>row.id==='foe').extensions.v5[CRITICAL_AFTERMATH_FIELD],foe.extensions.v5[CRITICAL_AFTERMATH_FIELD]);
  const mortal=createCriticalAftermathRecord(foe,{table:'HEAD',effectRoll:100,resolutionId:'mj-confirmation',round:1});
  const replace=await reloaded.updateParticipant('foe',{extensions:mortal.participant.extensions});assert.equal(replace?.ok,true);
  await assert.rejects(reloaded.decideImmediateCriticalDeath('foe',mortal.record.id,undefined),/Confirmation MJ requise/);
  assert.equal(reloaded.listParticipants().find(row=>row.id==='foe').extensions.v5.dead,undefined);
  await reloaded.decideImmediateCriticalDeath('foe',mortal.record.id,'confirm');
  assert.equal(reloaded.listParticipants().find(row=>row.id==='foe').extensions.v5.dead,true);
  const confirmedReload=createStore({storage:null,persistence});await confirmedReload.ready;
  assert.equal(confirmedReload.listParticipants().find(row=>row.id==='foe').extensions.v5.dead,true);
  assert.equal(await confirmedReload.undo(),true);
  assert.equal(confirmedReload.listParticipants().find(row=>row.id==='foe').extensions.v5.dead,undefined,'Undo annule la confirmation MJ');
});
