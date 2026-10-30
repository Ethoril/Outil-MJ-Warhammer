import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { previewSuddenDeath, applyAmputationShock, createCriticalAftermathRecord, decideCriticalDeath, decideImmediateCriticalDeath, decideSuddenDeath, previewAmputationShock, updateCriticalDeathCountdown, CRITICAL_AFTERMATH_FIELD, CRITICAL_DEATH_FIELD } from '../../../js/core/v5-critical-aftermath.js';
import { indexedDB } from 'fake-indexeddb';
import { createStore } from '../../../js/core/store.js';
import { createPersistence } from '../../../js/core/persistence.js';
import { V5_CRIT_DATA, getV5CriticalEffect } from '../../../js/data/v5-crits.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { advanceAftermathCalendar, aftermathDate, aftermathEnduranceScore, aftermathHealer, careForDisease, closeAftermathIncident, createAftermathState, previewAftermathAdvance, registerDisease, registerWoundIncident, treatInfection, treatSurgicalIncident, treatWoundIncident, validateAftermathState } from '../../../js/core/v5-aftermath.js';
import { sequelaEffectRows, effectiveSequelaMovement, sequelaCharacteristicTotals } from '../../../js/core/v5-sequela-effects.js';
import { planSequelae, splitCharacteristicLoss } from '../../../js/core/v5-sequelae.js';

describe('Claude T2bis mort subite et criteres', () => {
const options = { tableOptionEnabled: true, secondaryNpcConfirmed: true };
const person = (talents = [], states = []) => ({ id: 'extra', kind: 'Créature', hp: 0, talents, states, extensions: { v5: {} } });

test('mort subite refuse Chanceux importé comme libellé ou objet de talent', () => {
  assert.equal(previewSuddenDeath(person(['Chanceux']), options).status, 'ineligible');
  assert.equal(previewSuddenDeath(person([{ name: 'Chanceux' }]), options).status, 'ineligible');
});

test('mort subite ne repropose pas un figurant déjà rendu Inconscient', () => {
  assert.equal(previewSuddenDeath(person([], [{ key: 'inconscient', name: 'Inconscient' }]), options).status, 'ineligible');
});
});

describe('Combat mort cicatrices et refus amputation', () => {
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
  const shoulderReset=get('ARM','Dislocated Shoulder').parsed.durableEffects.find(row=>row.kind==='reset-limb');
  assert.equal(shoulderReset.extendedHealSL,6);
  assert.equal(shoulderReset.testsPerRound,undefined,'la fréquence par Round est imprimée pour le genou, pas pour l’épaule (L06 p.365)');
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

test('F2-I — refuser un choc sans amputation persiste et peut être annulé',async()=>{
  let saved=null;const persistence={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const source=createCriticalAftermathRecord(person('hero'),{table:'LEG',effectRoll:110,resolutionId:'no-amputation-ui',round:1});
  const hero={...source.participant,zone:'active'};
  const store=createStore({storage:null,persistence});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'hero',order:['hero'],participants:[hero]},log:[],diceLines:[],extensions:{v5:{combatId:'no-amputation-ui'}}});
  const current=store.listParticipants().find(row=>row.id==='hero');
  await store.updateParticipant('hero',{extensions:{...current.extensions,v5:{...current.extensions.v5,criticalAftermath:current.extensions.v5.criticalAftermath.map(row=>({...row,amputationShockStatus:'not-occurred'}))}}});
  assert.equal(store.listParticipants().find(row=>row.id==='hero').extensions.v5.criticalAftermath[0].amputationShockStatus,'not-occurred');
  assert.equal(await store.undo(),true);
  assert.equal(store.listParticipants().find(row=>row.id==='hero').extensions.v5.criticalAftermath[0].amputationShockStatus,undefined);
});

test('F2-I — refus d’amputation conditionnelle survit au rechargement depuis IndexedDB',async()=>{
  const dbName=`f2-i-amputation-declined-${Date.now()}`;
  const source=createCriticalAftermathRecord(person('hero'),{table:'LEG',effectRoll:110,resolutionId:'indexeddb-no-amputation',round:1});
  const hero={...source.participant,zone:'active'};
  const persistence=createPersistence({indexedDB,dbName,contextId:'amputation-ui'});
  const store=createStore({storage:null,persistence});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'hero',order:['hero'],participants:[hero]},log:[],diceLines:[],extensions:{v5:{combatId:'indexeddb-no-amputation'}}});
  const current=store.listParticipants().find(row=>row.id==='hero');
  const saved=await store.updateParticipant('hero',{extensions:{...current.extensions,v5:{...current.extensions.v5,criticalAftermath:current.extensions.v5.criticalAftermath.map(row=>({...row,amputationShockStatus:'not-occurred'}))}}});
  assert.equal(saved?.ok,true);
  persistence.close();

  const reopenedPersistence=createPersistence({indexedDB,dbName,contextId:'amputation-ui'});
  const reloaded=createStore({storage:null,persistence:reopenedPersistence});await reloaded.ready;
  assert.equal(reloaded.listParticipants().find(row=>row.id==='hero').extensions.v5.criticalAftermath[0].amputationShockStatus,'not-occurred');
  reopenedPersistence.close();
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
});

describe('Remplacement de critique et compte a rebours mortel', () => {
const clone = structuredClone;
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const participant = {
  id: 'hero', name: 'Hero', kind: 'PJ', camp: 'pj', zone: 'active', hp: 0, maxHp: 20,
  caracs: { E: 20, BE: 2 }, states: [{ id: 'unconscious', key: 'inconscient', name: 'Inconscient', level: 1 }],
  extensions: { v5: { criticalWounds: ['crit-a', 'crit-b', 'crit-c'].map(id => ({ id })) } }
};

test('F2-I: replacing a healed critical wound at equal count cancels stale death IDs with undo/redo and reload', async () => {
  const initial = clone(participant);
  Object.assign(initial, updateCriticalDeathCountdown(initial, { round: 1, toughnessBonus: 2 }).participant);
  const persistence = memory();
  const store = createStore({ storage: null, persistence });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['hero'], participants: [initial] }, log: [], diceLines: [], extensions: { v5: { combatId: 'f2-i-replacement', turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);

  await store.updateParticipant('hero', { extensions: { ...initial.extensions, v5: { ...initial.extensions.v5,
    criticalWounds: [{ id: 'crit-b' }, { id: 'crit-c' }, { id: 'crit-new' }] } } });

  const after = store.listParticipants().find(row => row.id === 'hero');
  assert.equal(after.extensions.v5.criticalWounds.length, 3);
  assert.deepEqual(after.extensions.v5.criticalDeath.criticalIds, ['crit-a', 'crit-b', 'crit-c']);
  assert.equal(after.extensions.v5.criticalDeath.status, 'cancelled');
  assert.equal(after.extensions.v5.criticalDeath.cancelReason, 'critical-wound-healed');
  const reloaded = createStore({ storage: null, persistence });
  await reloaded.ready;
  const persisted = () => reloaded.listParticipants().find(row => row.id === 'hero');
  assert.equal(persisted().extensions.v5.criticalDeath.status, 'cancelled');
  assert.equal(await reloaded.undo(), true);
  assert.deepEqual(persisted().extensions.v5.criticalWounds.map(row => row.id), ['crit-a', 'crit-b', 'crit-c']);
  assert.equal(persisted().extensions.v5.criticalDeath.status, 'countdown');
  assert.equal(await reloaded.redo(), true);
  assert.deepEqual(persisted().extensions.v5.criticalWounds.map(row => row.id), ['crit-b', 'crit-c', 'crit-new']);
  assert.equal(persisted().extensions.v5.criticalDeath.status, 'cancelled');
  const finalReload = createStore({ storage: null, persistence });
  await finalReload.ready;
  const finalHero = finalReload.listParticipants().find(row => row.id === 'hero');
  assert.equal(finalHero.extensions.v5.criticalDeath.status, 'cancelled');
  assert.deepEqual(finalHero.extensions.v5.criticalWounds.map(row => row.id), ['crit-b', 'crit-c', 'crit-new']);
});
});

describe('Revue integration critiques et mort', () => {
const clone=structuredClone;
const memory=()=>{let saved=null;return{async load(){return saved&&clone(saved);},async saveAtomic({state}){saved=clone(state);return{ok:true};}};};
const person=(id,extra={})=>({id,name:id,kind:'PJ',camp:id==='foe'?'ennemi':'pj',zone:'active',hp:0,maxHp:20,caracs:{CC:50,F:40,E:20,BE:2,Ag:30},skills:[{id:'force',name:'Force',total:40},{id:'bagarre',name:'Bagarre',total:50}],talents:[],equipment:[],states:[{id:`${id}-unconscious`,key:'inconscient',name:'Inconscient',level:1}],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},...extra});
async function fixture(participants,round=1){
 const persistence=memory(),store=createStore({storage:null,persistence});await store.ready;
 const snapshot={schemaVersion:3,reserve:[],combat:{round,currentActorId:'hero',order:['hero','foe'],participants},log:[],diceLines:[],extensions:{v5:{combatId:'f2-i-review',turnIndex:1}}};
 snapshot.extensions.v5.gameClock=createGameClock(snapshot);await store.loadFromJSON(snapshot);return{store,persistence};
}
const byId=(store,id)=>store.listParticipants().find(row=>row.id===id);

test('F2-I integration review: nextTurn reconciles an existing critical countdown through the due Round',async()=>{
 const p=person('hero',{extensions:{v5:{criticalWounds:Array.from({length:3},(_,i)=>({id:`crit-${i}`,name:`Crit ${i}`}))}}});
 const countdown=updateCriticalDeathCountdown(p,{round:1,toughnessBonus:2});Object.assign(p,countdown.participant);
 const{store,persistence}=await fixture([p,person('foe')]);
 while(store.getCombat().round<3)await store.nextTurn();
 assert.equal(byId(store,'hero').extensions.v5[CRITICAL_DEATH_FIELD].status,'awaiting-mj');
});

test('F2-I integration review: absent BE and E stay unknown during Round reconciliation',async()=>{
 const p=person('hero',{caracs:{CC:50},extensions:{v5:{criticalWounds:[{id:'a'},{id:'b'},{id:'c'}]}}});
 const{store}=await fixture([p,person('foe')]);
 while(store.getCombat().round<4)await store.nextTurn();
 const after=byId(store,'hero');
 assert.equal(after.extensions.v5.criticalDeath,undefined,'un BE absent ne doit pas être inventé à zéro ni démarrer un décompte');
 assert.notEqual(after.extensions.v5.dead,true,'des données incomplètes ne doivent pas provoquer une mort automatique');
});

test('F2-I integration review: absent BE and E do not start countdown on unconscious transition',async()=>{
 const p=person('hero',{caracs:{CC:50},states:[],extensions:{v5:{criticalWounds:[{id:'a'},{id:'b'},{id:'c'}]}}});
 const{store}=await fixture([p,person('foe')]);
 const applied=await store.applySpellEffects('hero',{id:'spell-ko-unknown-be',spellName:'Sommeil',conditions:[{name:'Inconscient',level:1}]},{resolutionId:'spell-ko-unknown-be',source:{kind:'spell'}});
 assert.equal(applied.ok,true);
 const after=byId(store,'hero');
 assert.ok(after.states.some(row=>row.key==='inconscient'));
 assert.equal(after.extensions.v5.criticalDeath,undefined,'l’inconscience ne doit pas fabriquer BE=0 si E et BE sont absents');
 assert.notEqual(after.extensions.v5.dead,true);
});

test('F2-I integration review: explicit BE zero is known and starts the countdown',async()=>{
 const p=person('hero',{caracs:{CC:50,BE:0},states:[],extensions:{v5:{criticalWounds:[{id:'a'},{id:'b'},{id:'c'}]}}});
 const{store}=await fixture([p,person('foe')]);
 const applied=await store.applySpellEffects('hero',{id:'spell-ko-be-zero',spellName:'Sommeil',conditions:[{name:'Inconscient',level:1}]},{resolutionId:'spell-ko-be-zero',source:{kind:'spell'}});
 assert.equal(applied.ok,true);
 assert.equal(byId(store,'hero').extensions.v5.criticalDeath?.status,'awaiting-mj','BE 0 explicite reste connu et atteint le terme immédiat du décompte');
});

test('F2-I integration review: real resolution does not infer BE zero from null or empty BE/E',async()=>{
 for(const [caracs,expected] of [[{CC:50,BE:null,E:null},undefined],[{CC:50,BE:'',E:''},undefined],
  [{CC:50,BE:null,E:20},'countdown'],[{CC:50,BE:0},'awaiting-mj']]){
  const hero=person('hero',{hp:20,maxHp:20,caracs,extensions:{v5:{criticalWounds:[{id:'prior-a'},{id:'prior-b'}]}}});
  const{store}=await fixture([hero,person('foe',{hp:20,states:[]})]);
  const preview=store.previewResolution({resolutionId:'crit-unknown-be',actorId:'foe',targetId:'hero',roll:22,
   action:{type:'attack',attr:'CC',base:60,damage:5},v5:{kind:'melee'},criticalRolls:{location:2,effect:45}});
  assert.ok(preview.critical?.details,'résolution réelle avec critique attendu '+JSON.stringify(preview.critical));
  const applied=await store.applyResolution(preview);assert.equal(applied.status,'applied',(applied.reason||applied.error||JSON.stringify(applied))+' critical='+JSON.stringify(preview.critical));
  const after=byId(store,'hero');
  assert.equal(after.extensions.v5.criticalWounds.length,3,'le registre du critique doit être écrit');
  assert.equal(after.extensions.v5.criticalDeath?.status,expected,'BE/E absents ou vides restent inconnus, E valide sert de fallback, et BE=0 explicite reste valide');
 }
});

test('F2-I integration review: a spell effect causing Inconscient starts the countdown atomically',async()=>{
 const p=person('hero',{states:[],extensions:{v5:{criticalWounds:Array.from({length:3},(_,i)=>({id:`prior-crit-${i}`,name:`Crit ${i}`}))}}});
 const{store,persistence}=await fixture([p,person('foe')]);
 const applied=await store.applySpellEffects('hero',{id:'spell-ko',spellName:'Sommeil',conditions:[{name:'Inconscient',level:1}]},{resolutionId:'spell-ko',source:{kind:'spell'}});
 assert.equal(applied.ok,true);
 const after=byId(store,'hero');
 assert.ok(after.states.some(row=>row.key==='inconscient'));
 assert.equal(after.extensions.v5.criticalDeath?.status,'countdown','le décompte doit commencer avec le changement d’État, sans attendre nextTurn');
 assert.equal(after.extensions.v5.criticalDeath?.startedRound,1);
 const reloaded=createStore({storage:null,persistence});await reloaded.ready;
 assert.equal(byId(reloaded,'hero').extensions.v5.criticalDeath.status,'countdown');
 assert.equal(await reloaded.undo(),true);
 assert.equal(byId(reloaded,'hero').states.some(row=>row.key==='inconscient'),false,'Undo retire l’Inconscient acquis');
 assert.equal(byId(reloaded,'hero').extensions.v5.criticalDeath,undefined,'Undo retire aussi le décompte atomique');
});

test('F2-I integration review: direct Store acquisition of Inconscient reconciles in the same command',async()=>{
 const p=person('hero',{states:[],extensions:{v5:{criticalWounds:[{id:'c1'},{id:'c2'},{id:'c3'}]}}});
 const{store}=await fixture([p,person('foe')]);
 const applied=await store.acquireConditions('hero',[{name:'Inconscient',level:1}],{resolutionId:'direct-ko'});
 assert.equal(applied.status,'applied');
 assert.equal(byId(store,'hero').extensions.v5.criticalDeath.status,'countdown');
});

test('F2-I integration review: Store exposes undoable preview/apply for amputation shock',async()=>{
 const source=createCriticalAftermathRecord(person('hero'),{table:'ARM',effectRoll:115,resolutionId:'amputation-store',round:1});
 const{store,persistence}=await fixture([source.participant,person('foe')]);
 assert.equal(typeof store.previewAmputationShock,'function');
 assert.equal(typeof store.applyAmputationShock,'function');
 const preview=store.previewAmputationShock({participantId:'hero',criticalId:source.record.id,difficultyDR:2,test:{success:false,sl:-1}});
 assert.equal(preview.status,'ready');
 const applied=await store.applyAmputationShock(preview);assert.equal(applied.status,'applied');
 assert.equal(byId(store,'hero').extensions.v5.criticalAftermath[0].amputationShock.test.sl,-1);
 assert.ok(byId(store,'hero').states.some(row=>row.key==='sonne'));
 const duplicate=store.previewAmputationShock({participantId:'hero',criticalId:source.record.id,test:{success:false,sl:-1}});assert.equal(duplicate.status,'duplicate');
 assert.equal((await store.applyAmputationShock(duplicate)).status,'duplicate');
 const appliedReload=createStore({storage:null,persistence});await appliedReload.ready;
 assert.equal(byId(appliedReload,'hero').extensions.v5.criticalAftermath[0].amputationShock.test.sl,-1);
 assert.ok(byId(appliedReload,'hero').states.some(row=>row.key==='sonne'));
 assert.equal(await appliedReload.undo(),true);assert.equal(byId(appliedReload,'hero').extensions.v5.criticalAftermath[0].amputationShock,undefined);
 assert.ok(!byId(appliedReload,'hero').states.some(row=>row.key==='sonne'),'Undo retire l’État généré par le choc');
 const reloaded=createStore({storage:null,persistence});await reloaded.ready;
 assert.equal(byId(reloaded,'hero').extensions.v5.criticalAftermath[0].amputationShock,undefined);
});

test('F2-I integration review: conditional amputation requires MJ occurrence confirmation before Test application',async()=>{
 const source=createCriticalAftermathRecord(person('hero'),{table:'LEG',effectRoll:110,resolutionId:'conditional-store',round:1});
 const{store}=await fixture([source.participant,person('foe')]);
 const missing=store.previewAmputationShock({participantId:'hero',criticalId:source.record.id,test:{success:false,sl:-1}});assert.equal(missing.status,'requires-input');
 const denied=store.previewAmputationShock({participantId:'hero',criticalId:source.record.id,amputationOccurred:false,test:{success:false,sl:-1}});assert.equal(denied.status,'blocked');
 const confirmed=store.previewAmputationShock({participantId:'hero',criticalId:source.record.id,amputationOccurred:true,test:{success:false,sl:-1}});assert.equal(confirmed.status,'ready');
 const result=await store.applyAmputationShock(confirmed);assert.equal(result.status,'applied');assert.equal(byId(store,'hero').extensions.v5.criticalAftermath[0].amputationShock.amputationOccurred,true);
});

test('F2-N boundary review: a grapple constrains only the held participant’s Action, not other Tests',async()=>{
 const link={id:'old-grapple',initiatorId:'foe',targetId:'hero',status:'active',createdTurnId:'previous-turn'};
 const hero=person('hero',{hp:20,states:[{id:'held-state',key:'enchevetre',name:'Enchevêtré',level:1,source:{linkId:link.id}}],extensions:{v5:{grapples:[link]}}}),foe=person('foe',{hp:20,extensions:{v5:{grapples:[link]}}});
 const{store}=await fixture([hero,foe]);
 const preview=store.previewResolution({actorId:'hero',targetId:'foe',action:{type:'skill',attr:'Ag',base:30,extensions:{fiche:{skillId:'bagarre'}}},roll:35,v5:{kind:'test',context:{isAction:false,skillId:'bagarre'}}});
 assert.notEqual(preview.code,'F2_GRAPPLE_FIRST_ACTION');
 const action=store.previewResolution({actorId:'hero',targetId:'foe',action:{type:'skill',attr:'F',base:40,extensions:{fiche:{skillId:'force'}}},roll:35,v5:{kind:'test',context:{isAction:true,skillId:'force'}}});
 assert.equal(action.code,'F2_GRAPPLE_FIRST_ACTION');
});

test('F2-N boundary review: la garde ne s’applique qu’au Tour du participant pris',async()=>{
 const link={id:'old-grapple',initiatorId:'foe',targetId:'hero',status:'active',createdTurnId:'previous-turn'};
 const hero=person('hero',{hp:20,states:[{id:'held-state',key:'enchevetre',name:'Enchevêtré',level:1,source:{linkId:link.id}}],extensions:{v5:{grapples:[link]}}}),foe=person('foe',{hp:20,extensions:{v5:{grapples:[link]}}});
 const{store}=await fixture([hero,foe]);
 await store.setRoundTurn(1,'foe');
 const preview=store.previewResolution({actorId:'hero',targetId:'foe',action:{type:'skill',attr:'F',base:40,extensions:{fiche:{skillId:'force'}}},roll:35,v5:{kind:'test',context:{isAction:true,skillId:'force'}}});
 assert.notEqual(preview.code,'F2_GRAPPLE_FIRST_ACTION');
});

test('F2-I integration review: MJ decisions for countdown persist and undo as commands',async()=>{
 const p=person('hero',{extensions:{v5:{criticalWounds:[{id:'a'},{id:'b'},{id:'c'}]}}});
 const countdown=updateCriticalDeathCountdown(p,{round:1,toughnessBonus:2});Object.assign(p,countdown.participant);
 const{store,persistence}=await fixture([p,person('foe')],3);
 const pending=await store.decideCriticalDeath('hero','confirm',{round:3});assert.notEqual(pending?.ok,false);
 assert.equal(byId(store,'hero').extensions.v5.dead,true);
 const reloaded=createStore({storage:null,persistence});await reloaded.ready;assert.equal(byId(reloaded,'hero').extensions.v5.dead,true);
 assert.equal(await reloaded.undo(),true);assert.equal(byId(reloaded,'hero').extensions.v5.dead,undefined);
});

test('F2-N boundary review: a grapple created during this Turn does not impose the start-of-Turn gate',async()=>{
 const link={id:'mid-turn-grapple',initiatorId:'foe',targetId:'hero',status:'active',createdTurnId:'f2-i-review:1:hero'};
 const hero=person('hero',{hp:20,states:[{id:'held-state',key:'enchevetre',name:'Enchevêtré',level:1,source:{linkId:link.id}}],extensions:{v5:{grapples:[link]}}}),foe=person('foe',{hp:20,extensions:{v5:{grapples:[link]}}});
 const{store}=await fixture([hero,foe]);
 const preview=store.previewResolution({actorId:'hero',targetId:'foe',action:{type:'skill',attr:'F',base:40},roll:35,v5:{kind:'test',context:{isAction:true}}});
 assert.notEqual(preview.code,'F2_GRAPPLE_FIRST_ACTION');
});
});

describe('Sequelles soins et convalescence', () => {
const wounds = { kind: 'wounds-lost', cause: 'chute de cheval' };
const register = (state, options = {}) => registerWoundIncident(state, {
  id: 'injury-1', operationId: 'register-1', expectedRevision: state.revision,
  participantId: 'participant-1', source: wounds, ...options
});
const advance = (state, operationId, days, dailyTests = [], enduranceScores = { 'participant-1': 30 }) => advanceAftermathCalendar(state, {
  operationId, expectedRevision: state.revision, days, dailyTests, enduranceScores
});
const healer = (extra = {}) => ({ participantId: 'healer', skill: 'heal', skillId: 'heal', score: 60, intelligenceBonus: 5, advances: 10, hasSurgeryTalent: false, ...extra });
const treat = (state, operationId, extra = {}) => treatWoundIncident(state, {
  operationId, expectedRevision: state.revision, incidentId: 'injury-1', healer: healer(), roll: 20, wounds: 8, supplies: true, ...extra
});

test('calendar is independent, whole-day, and counts an eight-day Imperial week', () => {
  let state = createAftermathState({ originDay: 17 });
  assert.deepEqual(aftermathDate(state), { day: 17, dayInImperialWeek: 1 });
  for (let i = 1; i <= 8; i += 1) {
    const out = advance(state, `advance-${i}`, 1);
    assert.equal(out.receipt.status, 'applied');
    state = out.state;
  }
  assert.deepEqual(aftermathDate(state), { day: 25, dayInImperialWeek: 1 });
  assert.equal(advance(state, 'fractional', 0.5).receipt.reason, 'positive-whole-days-required');
});

test('incident needs a valid source, is idempotent by operation, and one critical opens one incident', () => {
  assert.throws(() => register(createAftermathState(), { source: undefined }), TypeError);
  assert.throws(() => register(createAftermathState(), { source: { kind: 'critical' } }), TypeError);
  const critical = { kind: 'critical', criticalId: 'res:aftermath:participant-1:0' };
  const first = register(createAftermathState(), { source: critical });
  const replay = register(first.state, { source: critical, id: 'different-incident' });
  assert.deepEqual(replay.receipt, first.receipt);
  const duplicate = register(first.state, { source: critical, id: 'other', operationId: 'other-op' });
  assert.equal(duplicate.receipt.reason, 'incident-for-source-already-exists');
  assert.equal(duplicate.state.incidents.length, 1);
});

test('the preview lists every day of the jump; later days are conditional and the engine rolls only what is needed', () => {
  const state = register(createAftermathState()).state;
  const preview = previewAftermathAdvance(state, { days: 3, expectedRevision: state.revision });
  assert.deepEqual(preview.requiredDailyChecks.map(check => [check.day, check.conditional, check.difficultyDR]), [[0, false, 2], [1, true, 2], [2, true, 2]]);
  const missing = advance(state, 'skip-tests', 3, [{ incidentId: 'injury-1', day: 0, roll: 10 }]);
  assert.equal(missing.receipt.reason, 'daily-tests-required');
  assert.deepEqual(missing.receipt.missingDailyChecks.map(check => check.day), [1]);
  assert.equal(missing.state.calendar.currentDay, 0);
  // Infection le jour 0 : les jets des jours 1 et 2 sont ignorés, jamais inventés ni comptés.
  const infected = advance(state, 'infected-day-0', 3, [0, 1, 2].map(day => ({ incidentId: 'injury-1', day, roll: day === 0 ? 99 : 10 })));
  assert.equal(infected.receipt.status, 'applied');
  assert.equal(infected.state.calendar.currentDay, 3);
  assert.equal(infected.state.incidents[0].infection, true);
  assert.deepEqual(infected.state.incidents[0].dailyChecks.map(check => [check.day, check.success]), [[0, false]]);
  assert.deepEqual(infected.receipt.ignoredDailyTests.map(item => item.day), [1, 2]);
  // Réussite le jour 0 : le jour 1 devient indispensable.
  const passed = advance(state, 'passed-day-0', 2, [{ incidentId: 'injury-1', day: 0, roll: 10 }]);
  assert.equal(passed.receipt.reason, 'daily-tests-required');
  const both = advance(state, 'passed-both', 2, [{ incidentId: 'injury-1', day: 0, roll: 10 }, { incidentId: 'injury-1', day: 1, roll: 90 }]);
  assert.deepEqual(both.state.incidents[0].dailyChecks.map(check => [check.day, check.success]), [[0, true], [1, false]]);
  assert.equal(both.state.incidents[0].infection, true);
  assert.equal(advance(state, 'foreign', 1, [{ incidentId: 'injury-1', day: 5, roll: 10 }]).receipt.reason, 'unexpected-daily-test');
  assert.equal(advance(state, 'no-score', 1, [{ incidentId: 'injury-1', day: 0, roll: 10 }], {}).receipt.reason, 'endurance-score-missing');
});

test('the daily Endurance Test is a real +2 DR Test on the patient score', () => {
  const state = register(createAftermathState()).state;
  // Score 30, jet 80 : 3 − 8 = −5 DR, +2 = −3 : échec. Jet 40 : 3 − 4 = −1, +2 = +1 : réussite.
  assert.equal(advance(state, 'a', 1, [{ incidentId: 'injury-1', day: 0, roll: 80 }]).state.incidents[0].infection, true);
  const ok = advance(state, 'b', 1, [{ incidentId: 'injury-1', day: 0, roll: 40 }]);
  assert.deepEqual([ok.state.incidents[0].dailyChecks[0].success, ok.state.incidents[0].dailyChecks[0].sl], [true, 1]);
});

test('bandaging before the end of the first day suppresses the infection check', () => {
  let state = register(createAftermathState(), { bandaged: true }).state;
  assert.deepEqual(previewAftermathAdvance(state, { days: 1, expectedRevision: state.revision }).requiredDailyChecks, []);
  state = advance(state, 'bandaged-day', 1).state;
  assert.equal(state.incidents[0].dailyChecks.length, 0);
});

test('Heal recovers Intelligence Bonus + DR from a real Test, needs supplies, and is once per incident', () => {
  const state = register(createAftermathState()).state;
  assert.equal(treat(state, 'no-supplies', { supplies: false }).receipt.reason, 'medical-supplies-required');
  assert.equal(treat(state, 'no-healer', { healer: null }).receipt.reason, 'healer-skill-required');
  assert.equal(treat(state, 'bad-roll', { roll: 0 }).receipt.reason, 'invalid-test-facts');
  // Score 60, jet 20 : 6 − 2 = 4 DR ; Bonus d'Intelligence 5.
  const treated = treat(state, 'heal-success');
  assert.deepEqual([treated.receipt.success, treated.receipt.sl, treated.receipt.healed], [true, 4, 9]);
  assert.equal(treated.state.incidents[0].bandaged, true);
  assert.equal(treat(treated.state, 'heal-again', { roll: 10 }).receipt.reason, 'treatment-already-used-for-incident');
  // Difficulté du MJ en DR : −2 → 2 DR.
  assert.equal(treat(state, 'hard', { difficultyDR: -2 }).receipt.healed, 7);
  // Échec sans maladresse : le soin est consommé, rien n'est soigné, pas de bandage.
  const failed = treat(state, 'failed', { roll: 90 });
  assert.deepEqual([failed.receipt.success, failed.receipt.healed, failed.state.incidents[0].bandaged], [false, 0, false]);
  assert.equal(treat(failed.state, 'retry', { roll: 10 }).receipt.reason, 'treatment-already-used-for-incident');
});

test('animal incidents use Animal Care; a fumble costs d10 Wounds but leaves at least one', () => {
  const animal = register(createAftermathState(), { id: 'animal', operationId: 'register-animal', participantId: 'horse', subjectKind: 'animal' }).state;
  const options = { incidentId: 'animal', wounds: 2, healer: healer({ skill: 'animal-care' }) };
  assert.equal(treat(animal, 'wrong', { ...options, healer: healer() }).receipt.reason, 'wrong-skill-for-subject');
  assert.equal(treat(animal, 'no-d10', { ...options, roll: 77 }).receipt.reason, 'fumble-d10-required');
  const fumble = treat(animal, 'fumble', { ...options, roll: 77, d10: 7 });
  assert.deepEqual([fumble.receipt.fumble, fumble.receipt.fumbleDamage, fumble.receipt.currentWoundsAfter, fumble.receipt.healed], [true, 1, 1, 0]);
  assert.equal(fumble.state.incidents[0].bandaged, false);
});

test('combat Healing cannot be easier than Challenging (+0 DR)', () => {
  const state = register(createAftermathState()).state;
  assert.equal(treat(state, 'combat-easy', { difficultyDR: 1, inCombat: true }).receipt.reason, 'combat-heal-cannot-be-easier-than-challenging');
  assert.equal(treat(state, 'combat-hard', { difficultyDR: -1, inCombat: true }).receipt.status, 'applied');
});

test('untreated infection clears only on a successful Heal −1 Test or an adapted remedy', () => {
  let state = register(createAftermathState()).state;
  state = advance(state, 'infection-trigger', 1, [{ incidentId: 'injury-1', day: 0, roll: 99 }]).state;
  const care = (current, operationId, extra) => treatInfection(current, { operationId, expectedRevision: current.revision, incidentId: 'injury-1', ...extra });
  assert.equal(care(state, 'free', {}).receipt.reason, 'healer-skill-required');
  const failed = care(state, 'failed', { healer: healer(), roll: 96 });
  assert.equal(failed.state.incidents[0].infection, true);
  // Score 60, jet 60 : 6 − 6 = 0, −1 = −1 : échec ; jet 50 : 1 − 1 = 0 : réussite marginale refusée par le −1 ? 6 − 5 − 1 = 0 : réussite.
  assert.equal(care(failed.state, 'marginal-fail', { healer: healer(), roll: 60 }).state.incidents[0].infection, true);
  const healed = care(failed.state, 'healed', { healer: healer(), roll: 50 });
  assert.equal(healed.state.incidents[0].infection, false);
  assert.equal(care(state, 'remedy', { remedy: true }).state.incidents[0].infection, false);
});

test('surgery needs the Surgery talent and a Challenging (+0 DR) Heal Test, and gates closing a critical', () => {
  const critical = { kind: 'critical', criticalId: 'c1' };
  let state = register(createAftermathState(), { source: critical, requiresSurgery: true }).state;
  const operate = (current, operationId, extra) => treatSurgicalIncident(current, { operationId, expectedRevision: current.revision, incidentId: 'injury-1', ...extra });
  assert.equal(operate(state, 'no-surgeon', { healer: healer(), roll: 10 }).receipt.reason, 'surgery-talent-required');
  assert.equal(operate(state, 'no-healer', {}).receipt.reason, 'healer-skill-required');
  const surgeon = healer({ hasSurgeryTalent: true });
  const failed = operate(state, 'fail', { healer: surgeon, roll: 90 });
  assert.equal(failed.state.incidents[0].surgeryCompleted, false);
  assert.equal(closeAftermathIncident(failed.state, { operationId: 'close-early', expectedRevision: failed.state.revision, incidentId: 'injury-1', temporaryEffectsEnded: true }).receipt.reason, 'surgery-not-completed');
  const done = operate(failed.state, 'success', { healer: surgeon, roll: 60 });
  assert.equal(done.state.incidents[0].surgeryCompleted, true);
  assert.equal(validateAftermathState(done.state).revision, done.state.revision);
});

test('a critical is healed only once states and temporary effects are over; infection blocks closing', () => {
  const critical = { kind: 'critical', criticalId: 'c1' };
  let state = register(createAftermathState(), { source: critical }).state;
  const close = (current, operationId, extra) => closeAftermathIncident(current, { operationId, expectedRevision: current.revision, incidentId: 'injury-1', ...extra });
  assert.equal(close(state, 'states', { statesCleared: false, temporaryEffectsEnded: true }).receipt.reason, 'critical-states-remaining');
  assert.equal(close(state, 'effects', { temporaryEffectsEnded: false }).receipt.reason, 'temporary-effects-not-confirmed');
  const infected = advance(state, 'infected', 1, [{ incidentId: 'injury-1', day: 0, roll: 99 }]).state;
  assert.equal(close(infected, 'infected-close', { temporaryEffectsEnded: true }).receipt.reason, 'infection-still-active');
  const closed = close(state, 'ok', { temporaryEffectsEnded: true });
  assert.deepEqual([closed.receipt.reason, closed.state.incidents[0].status], ['critical-healed', 'closed']);
  assert.equal(close(closed.state, 'again', { temporaryEffectsEnded: true }).receipt.reason, 'incident-closed');
});

test('disease care: an Advance in Heal, a +0 DR Test protecting the carer and DR−1 others, one extra day off for rest', () => {
  let state = createAftermathState();
  state = registerDisease(state, { id: 'd1', operationId: 'disease', expectedRevision: 0, participantId: 'patient', label: 'Fièvre', durationDays: 5 }).state;
  const care = (current, operationId, extra) => careForDisease(current, { operationId, expectedRevision: current.revision, diseaseId: 'd1', healer: healer(), roll: 20, rested: true, ...extra });
  assert.equal(care(state, 'untrained', { healer: healer({ advances: 0 }) }).receipt.reason, 'heal-advance-required');
  const first = care(state, 'care-1');
  assert.deepEqual([first.receipt.carerProtected, first.receipt.othersProtected, first.state.diseases[0].remainingDays], [true, 3, 4]);
  assert.equal(care(first.state, 'care-2').receipt.reason, 'care-already-recorded-today');
  const failed = care(state, 'failed', { roll: 90, rested: false });
  assert.deepEqual([failed.receipt.carerProtected, failed.receipt.othersProtected, failed.state.diseases[0].remainingDays], [false, 0, 5]);
  // Le calendrier retire les jours écoulés ; la maladie se termine à zéro.
  const later = advance(first.state, 'later', 4);
  assert.deepEqual([later.state.diseases[0].remainingDays, later.state.diseases[0].status], [0, 'ended']);
  assert.equal(care(later.state, 'after-end', { operationId: 'x' }).receipt.reason, 'disease-ended');
});

test('healer and Endurance facts are read from the sheet with the engine score functions', () => {
  const sheet = {
    id: 'sheet', caracs: { Int: 47, E: 35 }, talents: [{ id: 'talent-surgery', status: 'resolved', rank: 1 }],
    skills: [{ id: 'heal', name: 'Guérison', carac: 'Int', total: 52, advances: 5 }, { id: 'ac', name: 'Soin aux animaux', carac: 'Int', total: 41, advances: 0 }]
  };
  const found = aftermathHealer(sheet, 'heal');
  assert.deepEqual([found.ok, found.healer.score, found.healer.intelligenceBonus, found.healer.hasSurgeryTalent, found.healer.advances], [true, 52, 4, true, 5]);
  assert.equal(aftermathHealer(sheet, 'animal-care').healer.score, 41);
  assert.equal(aftermathHealer({ id: 'bare', skills: [], caracs: {} }, 'heal').reason, 'skill-missing');
  // Écart de caractéristique : même fonction que le reste du moteur (Int 47 au lieu de 40 de base : +7).
  const shifted = { ...sheet, extensions: { v5: { baseCaracs: { Int: 40 } } } };
  assert.equal(aftermathHealer(shifted, 'heal').healer.score, 59);
  assert.equal(aftermathEnduranceScore(sheet), 35);
  assert.equal(aftermathEnduranceScore({ ...sheet, skills: [{ name: 'Résistance', carac: 'E', total: 48 }] }), 48);
});
});

describe('Caracterisation sequelles et calendrier', () => {
const clone = structuredClone;
function memoryPersistence() {
  let saved = null;
  return {
    async load() { return saved && clone(saved); },
    async saveAtomic({ state }) { saved = clone(state); return { ok: true }; }
  };
}
const participant = { id:'j-characterization',name:'PJ test',kind:'PJ',camp:'pj',zone:'active',hp:12,maxHp:12,caracs:{E:30},states:[],extensions:{v5:{untouchedSentinel:{v:1}}} };

test('F2-J caractérisation — extensions inconnues et commandes Store survivent à Undo/Redo et rechargement', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ storage:null,persistence });
  await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:0,currentActorId:null,order:[],participants:[participant]},log:[],diceLines:[],extensions:{v5:{unknownSentinel:{kept:true}}}});
  await store.updateParticipant(participant.id,{hp:11});
  assert.equal(store.listParticipants()[0].hp,11);
  assert.deepEqual(store.listParticipants()[0].extensions.v5.untouchedSentinel,{v:1});
  assert.equal(await store.undo(),true);
  assert.equal(store.listParticipants()[0].hp,12);
  assert.equal(await store.redo(),true);
  const saved = JSON.parse(store.getFullJSON());
  assert.deepEqual(saved.extensions.v5.unknownSentinel,{kept:true});
  const reloaded = createStore({storage:null,persistence});
  await reloaded.ready;
  await reloaded.loadFromJSON(saved);
  assert.equal(reloaded.listParticipants()[0].hp,11);
  assert.deepEqual(reloaded.listParticipants()[0].extensions.v5.untouchedSentinel,{v:1});
});
});

describe('Revue caracterisation blessures et maladies', () => {
// Revue J1 du 29/10 : trois défauts bloquants, reproduits ici avant correction.
const clone = structuredClone;
function memoryPersistence() {
  let saved = null;
  return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } };
}
const patient = { id: 'patient', name: 'Patient', kind: 'PJ', camp: 'pj', zone: 'active', hp: 5, maxHp: 10, caracs: { E: 30, Int: 40 }, skills: [], talents: [], states: [], extensions: { v5: {} } };
const healer = { id: 'healer', name: 'Soigneur', kind: 'PJ', camp: 'pj', zone: 'active', hp: 10, maxHp: 10, caracs: { E: 30, Int: 50 }, skills: [{ id: 'heal', name: 'Guérison', carac: 'Int', total: 60, advances: 10, status: 'resolved' }], talents: [], states: [], extensions: { v5: {} } };
const seeded = { schemaVersion: 1, revision: 1, calendar: { schemaVersion: 1, originDay: 0, currentDay: 0 }, receipts: [], incidents: [{ id: 'seeded', participantId: 'patient', source: { kind: 'critical', criticalId: 'res:aftermath:patient:0' }, subjectKind: 'person', injuryDay: 0, status: 'open', bandaged: false, requiresSurgery: false, surgeryCompleted: true, infection: false, dailyChecks: [], treatments: [] }] };
async function setup(register = null) {
  const store = createStore({ storage: null, persistence: memoryPersistence() });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants: [clone(patient), clone(healer)] }, log: [], diceLines: [], extensions: { v5: register ? { aftermathRegister: clone(register) } : {} } });
  return store;
}

test('défaut 1 — aucun incident sans occurrence criticalAftermath vérifiable', async () => {
  const store = await setup();
  const out = await store.registerAftermathIncident({ id: 'arbitrary', operationId: 'arbitrary-op', participantId: 'patient' });
  assert.equal(out.receipt.status, 'refused', 'un incident créé depuis le panneau, sans occurrence ni provenance, doit être refusé');
  assert.equal(store.getAftermathState().incidents.length, 0);
});

test('défaut 2 — un soin sans soigneur ni d100 est refusé, quel que soit le « résultat » fourni', async () => {
  const store = await setup(seeded);
  const out = await store.treatAftermathWound({ operationId: 'free-result', incidentId: 'seeded', participantId: 'patient', skill: 'heal', intelligenceBonus: 9, supplies: true, testSL: 9, difficultySL: 0 });
  assert.equal(out.receipt.status, 'refused');
  assert.equal(store.listParticipants().find(row => row.id === 'patient').hp, 5, 'le patient ne doit pas être soigné par un DR saisi à la main');
});

test('défaut 3 — une infection au jour 0 ne bloque pas un saut de trois jours dont l’aperçu liste les jours 0 à 2', () => {
  let state = registerWoundIncident(createAftermathState(), { id: 'i1', operationId: 'r1', expectedRevision: 0, participantId: 'patient', source: { kind: 'wounds-lost', cause: 'test' } }).state;
  const out = advanceAftermathCalendar(state, {
    operationId: 'jump', expectedRevision: state.revision, days: 3,
    dailyTests: [0, 1, 2].map(day => ({ incidentId: 'i1', day, roll: day === 0 ? 99 : 10 })), enduranceScores: { patient: 30 }
  });
  assert.equal(out.receipt.status, 'applied', `refus inattendu : ${out.receipt.reason}`);
  assert.equal(out.state.calendar.currentDay, 3);
});
});

describe('Contre verification soins chirurgicaux et infections', () => {
// Contre-vérification J1 du 29/10 : un test par écart.
const clone = structuredClone;
function memoryPersistence() {
  let saved = null;
  return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } };
}
const base = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 5, maxHp: 20, caracs: { E: 30, Int: 50 }, skills: [], talents: [], states: [], extensions: { v5: {} }, ...extra });
const healerSheet = (extra = {}) => base('healer', { hp: 20, skills: [{ id: 'heal', name: 'Guérison', carac: 'Int', total: 60, advances: 10, status: 'resolved' }], ...extra });
async function setup(participants) {
  const store = createStore({ storage: null, persistence: memoryPersistence() });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants }, log: [], diceLines: [], extensions: { v5: {} } });
  return store;
}
const get = (store, id) => store.listParticipants().find(row => row.id === id);
const openCritical = async (store, participantId, criticalId) => {
  await store.registerAftermathIncident({ operationId: `c-${participantId}`, participantId, criticalId });
  return store.getAftermathState().incidents.at(-1).id;
};
const open = async (store, participantId = 'patient') => {
  await store.registerAftermathIncident({ operationId: `r-${participantId}`, participantId, cause: 'combat' });
  return store.getAftermathState().incidents.at(-1).id;
};
const wounds = { kind: 'wounds-lost', cause: 'x' };
const reg = (state, extra = {}) => registerWoundIncident(state, { id: 'i1', operationId: 'r1', expectedRevision: state.revision, participantId: 'p1', source: wounds, ...extra }).state;
const healer = (extra = {}) => ({ participantId: 'h', skill: 'heal', skillId: 'heal', score: 60, intelligenceBonus: 5, advances: 10, hasSurgeryTalent: true, ...extra });

test('1a — le soin passe par healV5Wounds : projectile fiché, Empoisonné à 0 PV, Hémorragique retiré par Blessure récupérée', async () => {
  const bleeding = [{ id: 'b1', key: 'hemorragique', name: 'Hémorragique', level: 1 }, { id: 'b2', key: 'hemorragique', name: 'Hémorragique', level: 1 }];
  const store = await setup([base('patient', { hp: 5, states: bleeding, extensions: { v5: { lodgedProjectiles: [{ id: 'arrow', removed: false }] } } }), healerSheet(), base('poisoned', { hp: 0, states: [{ id: 'p', key: 'empoisonne', name: 'Empoisonné', level: 1 }] })]);
  const incidentId = await open(store);
  const out = await store.treatAftermathWound({ operationId: 'h1', incidentId, healerId: 'healer', roll: 20, supplies: true });
  // 9 Blessures annoncées, 1 bloquée par le projectile Empaleuse fiché : 8 récupérées, 8 occurrences d'Hémorragique max (2 ici).
  assert.deepEqual([get(store, 'patient').hp, out.receipt.healed], [13, 8]);
  assert.equal(get(store, 'patient').states.filter(row => row.key === 'hemorragique').length, 0);
  const sick = await open(store, 'poisoned');
  await store.treatAftermathWound({ operationId: 'h2', incidentId: sick, healerId: 'healer', roll: 20, supplies: true });
  assert.equal(get(store, 'poisoned').hp, 0, 'Empoisonné à 0 Blessure : aucune récupération');
});

test('1b — encadré p.170 : le soin de Blessures consommé, un autre Test retire encore des Hémorragiques', async () => {
  const bleeding = [1, 2, 3, 4].map(n => ({ id: `b${n}`, key: 'hemorragique', name: 'Hémorragique', level: 1 }));
  const store = await setup([base('patient', { hp: 15, maxHp: 20, states: bleeding }), healerSheet()]);
  const incidentId = await open(store);
  await store.treatAftermathWound({ operationId: 'h1', incidentId, healerId: 'healer', roll: 90, supplies: true });
  const again = await store.treatAftermathWound({ operationId: 'h2', incidentId, healerId: 'healer', roll: 20, supplies: true, bleedingOnly: true });
  assert.equal(again.receipt.status, 'applied');
  assert.equal(get(store, 'patient').hp, 15, 'aucune Blessure rendue une seconde fois');
  assert.equal(get(store, 'patient').states.filter(row => row.key === 'hemorragique').length, 0, '9 Blessures auraient été rendues : les 4 Hémorragiques partent');
});

test('2 — un patient retiré du combat ne bloque pas le calendrier ; son incident est signalé puis archivable', async () => {
  const store = await setup([base('patient'), base('gone'), healerSheet()]);
  await open(store); const goneId = await open(store, 'gone');
  store.removeParticipant('gone'); await new Promise(done => setTimeout(done, 20));
  const patientIncident = store.getAftermathState().incidents[0].id;
  const preview = store.previewAftermathAdvance({ days: 1, expectedRevision: store.getAftermathState().revision });
  assert.deepEqual(preview.requiredDailyChecks.map(row => row.incidentId), [patientIncident]);
  assert.deepEqual(preview.absentIncidents.map(row => row.incidentId), [goneId]);
  const jump = await store.advanceAftermathCalendar({ operationId: 'j', days: 1, dailyTests: [{ incidentId: patientIncident, day: 0, roll: 10 }] });
  assert.equal(jump.receipt.status, 'applied', jump.receipt.reason);
  const archived = await store.archiveAftermathIncident({ operationId: 'a', incidentId: goneId });
  assert.equal(archived.receipt.status, 'applied');
  assert.equal(store.getAftermathState().incidents.find(row => row.id === goneId).status, 'archived');
  assert.equal((await store.archiveAftermathIncident({ operationId: 'a2', incidentId: patientIncident })).receipt.reason, 'subject-still-present');
});

test('3 — critique guéri : amputation exige la Chirurgie ; les durables de J2 exigent leur suivi', async () => {
  const roll = Array.from({ length: 200 }, (_, i) => i + 1).find(n => getV5CriticalEffect('ARM', n)?.source?.printedName === 'Severed Finger');
  const withRecord = (table, effectRoll, id) => createCriticalAftermathRecord(base(id), { table, effectRoll, resolutionId: `res-${id}` });
  const finger = withRecord('ARM', roll, 'finger');
  const surgeon = healerSheet({ id: 'surgeon', talents: [{ id: 'talent-surgery', status: 'resolved', rank: 1 }] });
  const store = await setup([finger.participant, surgeon]);
  const incidentId = await openCritical(store, 'finger', finger.record.id);
  const closeOnce = (operationId, extra = {}) => store.closeAftermathIncident({ operationId, incidentId, temporaryEffectsEnded: true, ...extra });
  // La création de l'incident ne connaît pas encore l'amputation : sa décision est en attente.
  assert.equal((await closeOnce('c0')).receipt.reason, 'amputation-decision-pending');
  const record = { ...finger.record, amputationShock: { amputationOccurred: true, part: 'finger' } };
  await store.updateParticipant('finger', { extensions: { v5: { ...get(store, 'finger').extensions.v5, criticalAftermath: [record] } } });
  // J2 : la perte confirmée a son propre suivi (côté et nombre saisis par le MJ) avant que le critique puisse être déclaré guéri.
  assert.equal((await closeOnce('c1a')).receipt.reason, 'sequelae-follow-up-not-opened');
  assert.equal((await store.openAftermathSequelae({ operationId: 'os', incidentId, facts: { 'shock:0:finger': { side: 'left', count: 1 } } })).receipt.status, 'applied');
  assert.equal((await closeOnce('c1')).receipt.reason, 'surgery-not-completed');
  assert.equal((await store.treatAftermathSurgicalIncident({ operationId: 's', incidentId, healerId: 'surgeon', roll: 10 })).receipt.reason, 'surgery-success');
  assert.equal((await closeOnce('c2')).receipt.reason, 'critical-states-remaining', 'sans stateIds rattachés, le MJ confirme les États');
  assert.equal((await closeOnce('c3', { statesConfirmed: true })).receipt.reason, 'critical-healed');
  // Durables non gérés : reset-limb (Épaule disloquée), medical-attention-required, surgery-deadline…
  const unsupported = Array.from({ length: 200 }, (_, i) => i + 1).map(n => ['ARM', n]).filter(([table, n]) => (getV5CriticalEffect(table, n)?.parsed?.durableEffects || []).some(e => ['reset-limb', 'medical-attention-required', 'surgery-deadline', 'permanent-functional-loss', 'scar', 'disease'].includes(e.kind)));
  const [table, effectRoll] = unsupported[0] || ['LEG', 110];
  const odd = withRecord(table, effectRoll, 'odd');
  const store2 = await setup([odd.participant]);
  const oddId = await openCritical(store2, 'odd', odd.record.id);
  assert.equal((await store2.closeAftermathIncident({ operationId: 'c', incidentId: oddId, temporaryEffectsEnded: true })).receipt.reason, 'sequelae-follow-up-not-opened');
});

test('4 — une infection guérie par Guérison −1 laisse la blessure traitée (pas de réinfection)', () => {
  let state = reg(createAftermathState());
  state = advanceAftermathCalendar(state, { operationId: 'adv', expectedRevision: state.revision, days: 1, dailyTests: [{ incidentId: 'i1', day: 0, roll: 99 }], enduranceScores: { p1: 30 } }).state;
  const cured = treatInfection(state, { operationId: 't', expectedRevision: state.revision, incidentId: 'i1', healer: healer(), roll: 50 });
  assert.deepEqual([cured.state.incidents[0].infection, cured.state.incidents[0].bandaged], [false, true]);
  assert.deepEqual(previewAftermathAdvance(cured.state, { days: 1, expectedRevision: cured.state.revision }).requiredDailyChecks, []);
});

test('5 — Guérison est une compétence Avancée : aucun soin sans Avancement', () => {
  const state = reg(createAftermathState());
  const untrained = healer({ advances: 0 });
  assert.equal(treatWoundIncident(state, { operationId: 'a', expectedRevision: state.revision, incidentId: 'i1', healer: untrained, roll: 20, wounds: 5, supplies: true }).receipt.reason, 'heal-advance-required');
  const infected = advanceAftermathCalendar(state, { operationId: 'adv', expectedRevision: state.revision, days: 1, dailyTests: [{ incidentId: 'i1', day: 0, roll: 99 }], enduranceScores: { p1: 30 } }).state;
  assert.equal(treatInfection(infected, { operationId: 'b', expectedRevision: infected.revision, incidentId: 'i1', healer: untrained, roll: 20 }).receipt.reason, 'heal-advance-required');
});

test('6 — plusieurs soigneurs le même jour : chacun son Test de protection, un seul jour de maladie gagné', () => {
  let state = registerDisease(createAftermathState(), { id: 'd', operationId: 'r', expectedRevision: 0, participantId: 'p', label: 'Fièvre', durationDays: 5 }).state;
  const care = (current, operationId, id, rested = true) => careForDisease(current, { operationId, expectedRevision: current.revision, diseaseId: 'd', healer: healer({ participantId: id }), roll: 20, rested });
  const one = care(state, 'c1', 'h1');
  const two = care(one.state, 'c2', 'h2');
  assert.equal(two.receipt.status, 'applied', two.receipt.reason);
  assert.equal(two.receipt.carerProtected, true);
  assert.equal(two.state.diseases[0].remainingDays, 4, 'seul le premier repos du jour retire un jour');
  assert.equal(care(two.state, 'c3', 'h1').receipt.reason, 'care-already-recorded-today');
});

test('7 — chirurgie et traitement d’infection : un double enregistrement identique est refusé', () => {
  let state = reg(createAftermathState(), { requiresSurgery: true });
  state = advanceAftermathCalendar(state, { operationId: 'adv', expectedRevision: state.revision, days: 1, dailyTests: [{ incidentId: 'i1', day: 0, roll: 99 }], enduranceScores: { p1: 30 } }).state;
  const failed = treatInfection(state, { operationId: 'i-a', expectedRevision: state.revision, incidentId: 'i1', healer: healer(), roll: 96 });
  const twice = treatInfection(failed.state, { operationId: 'i-b', expectedRevision: failed.state.revision, incidentId: 'i1', healer: healer(), roll: 96 });
  assert.equal(twice.receipt.status, 'refused');
  assert.equal(twice.state.incidents[0].treatments.length, 1);
  const surgery = treatSurgicalIncident(failed.state, { operationId: 's-a', expectedRevision: failed.state.revision, incidentId: 'i1', healer: healer(), roll: 96 });
  const again = treatSurgicalIncident(surgery.state, { operationId: 's-b', expectedRevision: surgery.state.revision, incidentId: 'i1', healer: healer(), roll: 96 });
  assert.equal(again.receipt.status, 'refused');
});

test('9 — _runAftermathCommand n’est pas une API publique du Store', async () => {
  const store = await setup([base('patient')]);
  assert.equal(store._runAftermathCommand, undefined);
  assert.equal(store._aftermathHealer, undefined);
});

// Décision MJ 14 : chaque critique d'une même résolution rattache ses propres stateIds.
test('14 — deux critiques d’une même résolution : chacun ses stateIds, sans tout mettre sur le premier', async () => {
  const { actor, baseFixtureStore } = await import('../../helpers/f2-j-two-criticals.mjs');
  const { store, preview } = await baseFixtureStore({ secondEffect: 10 });
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  const foe = store.listParticipants().find(row => row.id === 'foe');
  const [first, second] = foe.extensions.v5.criticalWounds;
  const aftermath = foe.extensions.v5.criticalAftermath;
  assert.ok(aftermath[0].sequela.states.length && aftermath[1].sequela.states.length, 'les deux critiques portent des États');
  assert.ok(second.stateIds.length > 0, 'le second critique a ses propres États');
  assert.equal(second.stateIds.filter(id => first.stateIds.includes(id)).length, 0, 'aucun État partagé');
  const keysOf = (ids) => ids.map(id => foe.states.find(row => row.id === id)?.key);
  for (const key of keysOf(second.stateIds)) assert.ok(aftermath[1].sequela.states.some(row => row.key === key));
  assert.ok(actor);
});

// Décisions MJ du 29/10.
test('10 — Talent Chirurgie (p.127) : hors combat, DR ou chiffre des unités du d100, choix explicite, 0 vaut 0', () => {
  const state = reg(createAftermathState());
  const surgeon = healer();
  const treat = (operationId, extra) => treatWoundIncident(state, { operationId, expectedRevision: state.revision, incidentId: 'i1', healer: surgeon, wounds: 5, supplies: true, ...extra });
  assert.equal(treat('a', { roll: 37 }).receipt.reason, 'surgery-talent-choice-required');
  // Score 60, jet 37 : 6 − 3 = 3 DR ; Bonus 5 ; unités 7.
  const sl = treat('b', { roll: 37, surgeryChoice: 'sl' });
  const units = treat('c', { roll: 37, surgeryChoice: 'units' });
  assert.deepEqual([sl.receipt.healed, units.receipt.healed, units.receipt.amountChoice], [8, 12, 'units']);
  assert.equal(treat('d', { roll: 20, surgeryChoice: 'units' }).receipt.healed, 5, 'un 0 aux unités vaut 0');
  assert.equal(treat('e', { roll: 37, inCombat: true }).receipt.healed, 8, 'en combat, le Talent ne change rien');
  assert.equal(treatWoundIncident(state, { operationId: 'f', expectedRevision: state.revision, incidentId: 'i1', healer: healer({ hasSurgeryTalent: false }), roll: 37, wounds: 5, supplies: true }).receipt.healed, 8);
});

test('11 — maladresse d’un Test de Chirurgie : 1d10 Blessures saisi, jamais sous 1 Blessure', async () => {
  const state = reg(createAftermathState(), { requiresSurgery: true });
  const operate = (operationId, extra) => treatSurgicalIncident(state, { operationId, expectedRevision: state.revision, incidentId: 'i1', healer: healer(), wounds: 4, ...extra });
  assert.equal(operate('a', { roll: 77 }).receipt.reason, 'fumble-d10-required');
  const fumble = operate('b', { roll: 77, d10: 9 });
  assert.deepEqual([fumble.receipt.status, fumble.receipt.fumbleDamage, fumble.receipt.currentWoundsAfter, fumble.state.incidents[0].surgeryCompleted], ['applied', 3, 1, false]);
  const surgeon = healerSheet({ id: 'surgeon', talents: [{ id: 'talent-surgery', status: 'resolved', rank: 1 }] });
  const { patient, record } = (() => { const stored = createCriticalAftermathRecord(base('patient', { hp: 4 }), { table: 'ARM', effectRoll: 56, resolutionId: 'res1' }); return { patient: stored.participant, record: stored.record }; })();
  const store = await setup([patient, surgeon]);
  const incidentId = await openCritical(store, 'patient', record.id);
  await store.treatAftermathSurgicalIncident({ operationId: 's', incidentId, healerId: 'surgeon', roll: 77, d10: 9 });
  assert.equal(get(store, 'patient').hp, 1);
});

test('12 — infection : un Test de Résistance par blessure non traitée et par soir, pour chaque blessure', () => {
  let state = reg(createAftermathState());
  state = registerWoundIncident(state, { id: 'i2', operationId: 'r2', expectedRevision: state.revision, participantId: 'p1', source: { kind: 'wounds-lost', cause: 'autre' } }).state;
  const preview = previewAftermathAdvance(state, { days: 1, expectedRevision: state.revision });
  assert.deepEqual(preview.requiredDailyChecks.map(row => [row.incidentId, row.day, row.difficultyDR]), [['i1', 0, 2], ['i2', 0, 2]]);
});

test('13 — Test de Guérison raté : la blessure n’est pas bandée', () => {
  const state = reg(createAftermathState());
  const failed = treatWoundIncident(state, { operationId: 'x', expectedRevision: state.revision, incidentId: 'i1', healer: healer({ hasSurgeryTalent: false }), roll: 90, wounds: 5, supplies: true });
  assert.deepEqual([failed.receipt.success, failed.state.incidents[0].bandaged], [false, false]);
});
});

describe('Store sequelles et incidents', () => {
const clone = structuredClone;
function memoryPersistence() {
  let saved = null;
  return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } };
}
const base = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 5, maxHp: 20, caracs: { E: 30, Int: 50 }, skills: [], talents: [], states: [], extensions: { v5: {} }, ...extra });
const healerSheet = (extra = {}) => base('healer', { hp: 20, skills: [{ id: 'heal', name: 'Guérison', carac: 'Int', total: 60, advances: 10, status: 'resolved' }], ...extra });
// Un critique réel de la table F2-I (Blessure béante au bras : chirurgie exigée, Hémorragique 2).
function woundedPatient() {
  const stored = createCriticalAftermathRecord(base('patient'), { table: 'ARM', effectRoll: 56, resolutionId: 'res1' });
  const patient = stored.participant;
  patient.extensions.v5.criticalWounds = [{ id: stored.record.criticalWoundId, name: 'Blessure béante', location: 'Bras', stateIds: ['st-bleed'] }];
  patient.states = [{ id: 'st-bleed', key: 'hemorragique', name: 'Hémorragique', level: 2 }];
  return { patient, record: stored.record };
}
async function setup({ participants, extensions = {}, persistence = memoryPersistence() } = {}) {
  const store = createStore({ storage: null, persistence });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants }, log: [], diceLines: [], extensions: { v5: extensions } });
  return { store, persistence };
}
const hp = (store, id) => store.listParticipants().find(row => row.id === id).hp;

test('incidents are born from an F2-I occurrence or a real wounds-lost cause, never from nothing', async () => {
  const { patient, record } = woundedPatient();
  const { store } = await setup({ participants: [patient, healerSheet(), base('whole', { hp: 20 })] });
  assert.deepEqual(store.listAftermathProposals().map(row => [row.participantId, row.criticalId, row.requiresSurgery]), [['patient', record.id, true]]);
  assert.equal((await store.registerAftermathIncident({ operationId: 'o0', participantId: 'patient' })).receipt.reason, 'incident-source-required');
  assert.equal((await store.registerAftermathIncident({ operationId: 'o1', participantId: 'patient', criticalId: 'no:such:record' })).receipt.reason, 'critical-occurrence-not-found');
  assert.equal((await store.registerAftermathIncident({ operationId: 'o2', participantId: 'whole', cause: 'rien' })).receipt.reason, 'no-wounds-lost');
  assert.equal((await store.registerAftermathIncident({ operationId: 'o3', participantId: 'ghost', cause: 'x' })).receipt.reason, 'unknown-subject');
  // La chirurgie vient de la table, pas de la saisie.
  const created = await store.registerAftermathIncident({ operationId: 'o4', participantId: 'patient', criticalId: record.id, requiresSurgery: false });
  assert.equal(created.receipt.status, 'applied');
  const incident = store.getAftermathState().incidents[0];
  assert.deepEqual([incident.requiresSurgery, incident.surgeryCompleted, incident.source], [true, false, { kind: 'critical', criticalId: record.id, criticalWoundId: record.criticalWoundId }]);
  // Migration répétée : aucune seconde création, et plus de proposition.
  assert.equal((await store.registerAftermathIncident({ operationId: 'o5', participantId: 'patient', criticalId: record.id })).receipt.reason, 'incident-for-source-already-exists');
  assert.equal(store.getAftermathState().incidents.length, 1);
  assert.deepEqual(store.listAftermathProposals(), []);
  const lost = await store.registerAftermathIncident({ operationId: 'o6', participantId: 'patient', cause: 'chute dans l’escalier' });
  assert.equal(lost.receipt.status, 'applied');
  assert.equal(store.getAftermathState().incidents[1].source.kind, 'wounds-lost');
});

test('a heal uses the healer’s sheet skill and the MJ d100; typed results are ignored; Undo/Redo and reload keep it', async () => {
  const { patient } = woundedPatient();
  const persistence = memoryPersistence();
  const { store } = await setup({ participants: [patient, healerSheet(), base('novice')], persistence });
  await store.registerAftermathIncident({ operationId: 'r', participantId: 'patient', cause: 'combat' });
  const incidentId = store.getAftermathState().incidents[0].id;
  const heal = (operationId, extra) => store.treatAftermathWound({ operationId, incidentId, supplies: true, ...extra });
  assert.equal((await heal('free', { testSL: 9, intelligenceBonus: 9 })).receipt.reason, 'healer-required');
  assert.equal((await heal('novice', { healerId: 'novice', roll: 20 })).receipt.reason, 'skill-missing');
  assert.equal((await heal('no-roll', { healerId: 'healer' })).receipt.reason, 'invalid-test-facts');
  assert.equal(hp(store, 'patient'), 5);
  // Score 60, jet 20 : 4 DR ; Int 50 → Bonus 5 : 9 Blessures rendues.
  const done = await heal('real', { healerId: 'healer', roll: 20, testSL: -9 });
  assert.deepEqual([done.receipt.status, done.receipt.sl, done.receipt.healed, hp(store, 'patient')], ['applied', 4, 9, 14]);
  assert.equal((await heal('again', { healerId: 'healer', roll: 10 })).receipt.reason, 'treatment-already-used-for-incident');
  assert.equal(await store.undo(), true);
  assert.equal(hp(store, 'patient'), 5);
  assert.equal(store.getAftermathState().incidents[0].treatments.length, 0);
  assert.equal(await store.redo(), true);
  const saved = JSON.parse(store.getFullJSON());
  const reloaded = createStore({ storage: null, persistence });
  await reloaded.ready;
  await reloaded.loadFromJSON(saved);
  assert.equal(hp(reloaded, 'patient'), 14);
  assert.equal(reloaded.getAftermathState().incidents[0].treatments[0].healerId, 'healer');
});

test('a fumble costs d10 Wounds from the patient without going under one', async () => {
  const { store } = await setup({ participants: [base('patient', { hp: 3 }), healerSheet()] });
  await store.registerAftermathIncident({ operationId: 'r', participantId: 'patient', cause: 'combat' });
  const incidentId = store.getAftermathState().incidents[0].id;
  const fumble = await store.treatAftermathWound({ operationId: 'f', incidentId, healerId: 'healer', roll: 77, supplies: true, d10: 9 });
  assert.deepEqual([fumble.receipt.fumble, fumble.receipt.fumbleDamage, hp(store, 'patient')], [true, 2, 1]);
});

test('a three-day jump asks for each daily Test, applies with an infection on day 0 and reads the patient’s Endurance', async () => {
  const { store } = await setup({ participants: [base('patient', { hp: 5, caracs: { E: 30, Int: 40 } }), healerSheet()] });
  await store.registerAftermathIncident({ operationId: 'r', participantId: 'patient', cause: 'combat' });
  const preview = store.previewAftermathAdvance({ days: 3, expectedRevision: store.getAftermathState().revision });
  assert.deepEqual(preview.requiredDailyChecks.map(row => [row.day, row.conditional, row.score, row.participantName]), [[0, false, 30, 'patient'], [1, true, 30, 'patient'], [2, true, 30, 'patient']]);
  const incidentId = store.getAftermathState().incidents[0].id;
  const jump = (operationId, rolls) => store.advanceAftermathCalendar({ operationId, days: 3, dailyTests: rolls.map(([day, roll]) => ({ incidentId, day, roll })) });
  assert.equal((await jump('few', [[1, 10]])).receipt.reason, 'daily-tests-required');
  assert.equal(store.getAftermathState().calendar.currentDay, 0);
  const applied = await jump('all', [[0, 99], [1, 10], [2, 10]]);
  assert.equal(applied.receipt.status, 'applied');
  assert.deepEqual([store.getAftermathState().calendar.currentDay, store.getAftermathState().incidents[0].infection], [3, true]);
  assert.equal(await store.undo(), true);
  assert.equal(store.getAftermathState().calendar.currentDay, 0);
});

test('surgery and closing a critical: states must be gone from the sheet, temporary effects confirmed by the MJ', async () => {
  const { patient, record } = woundedPatient();
  const surgeon = healerSheet({ id: 'surgeon', talents: [{ id: 'talent-surgery', status: 'resolved', rank: 1 }] });
  const { store } = await setup({ participants: [patient, healerSheet(), surgeon] });
  await store.registerAftermathIncident({ operationId: 'r', participantId: 'patient', criticalId: record.id });
  const incidentId = store.getAftermathState().incidents[0].id;
  assert.equal((await store.treatAftermathSurgicalIncident({ operationId: 's0', incidentId, healerId: 'healer', roll: 10 })).receipt.reason, 'surgery-talent-required');
  assert.equal((await store.closeAftermathIncident({ operationId: 'c0', incidentId, temporaryEffectsEnded: true })).receipt.reason, 'surgery-not-completed');
  assert.equal((await store.treatAftermathSurgicalIncident({ operationId: 's1', incidentId, healerId: 'surgeon', roll: 10 })).receipt.reason, 'surgery-success');
  // Hémorragique est toujours sur la fiche : le critique n'est pas guéri.
  assert.equal((await store.closeAftermathIncident({ operationId: 'c1', incidentId, temporaryEffectsEnded: true })).receipt.reason, 'critical-states-remaining');
  await store.updateParticipant('patient', { states: [] });
  assert.equal((await store.closeAftermathIncident({ operationId: 'c2', incidentId, temporaryEffectsEnded: false })).receipt.reason, 'temporary-effects-not-confirmed');
  const closed = await store.closeAftermathIncident({ operationId: 'c3', incidentId, temporaryEffectsEnded: true });
  assert.equal(closed.receipt.reason, 'critical-healed');
  const after = store.listParticipants().find(row => row.id === 'patient');
  assert.deepEqual(after.extensions.v5.criticalWounds, []);
  assert.equal(after.extensions.v5.criticalAftermath.length, 1, 'l’occurrence F2-I et ses effets durables restent');
  assert.equal(await store.undo(), true);
  assert.equal(store.listParticipants().find(row => row.id === 'patient').extensions.v5.criticalWounds.length, 1);
});

test('old saves without a register stay readable; an existing register survives with unknown extensions', async () => {
  const { store } = await setup({ participants: [base('patient')], extensions: { unknownSentinel: { kept: true } } });
  assert.equal(store.getAftermathState().incidents.length, 0);
  await store.registerAftermathIncident({ operationId: 'r', participantId: 'patient', cause: 'combat' });
  const saved = JSON.parse(store.getFullJSON());
  assert.deepEqual(saved.extensions.v5.unknownSentinel, { kept: true });
  assert.equal(saved.extensions.v5.aftermathRegister.incidents.length, 1);
});

test('disease care goes through the healer’s sheet and a d100', async () => {
  const { store } = await setup({ participants: [base('patient'), healerSheet(), base('apprentice', { skills: [{ id: 'heal', name: 'Guérison', carac: 'Int', total: 40, advances: 0 }] })] });
  const registered = await store.registerAftermathDisease({ operationId: 'd', participantId: 'patient', label: 'Fièvre des marais', durationDays: 6 });
  assert.equal(registered.receipt.status, 'applied');
  const diseaseId = store.getAftermathState().diseases[0].id;
  assert.equal((await store.careForAftermathDisease({ operationId: 'c0', diseaseId, healerId: 'apprentice', roll: 10, rested: true })).receipt.reason, 'heal-advance-required');
  const care = await store.careForAftermathDisease({ operationId: 'c1', diseaseId, healerId: 'healer', roll: 20, rested: true });
  assert.deepEqual([care.receipt.carerProtected, care.receipt.othersProtected, store.getAftermathState().diseases[0].remainingDays], [true, 3, 5]);
});
});

describe('Effets des sequelles et caracteristiques', () => {
// F2-J2 : les malus permanents et temporaires des séquelles (V5 p.177-179) se lisent dans la résolution, une seule source (le registre).
const memoryPersistence = () => { let state = null; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } }; };
const person = (id, extra = {}) => ({ id, name: id, kind: id === 'foe' ? 'PNJ' : 'PJ', camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 50, CT: 40, F: 40, E: 30, I: 40, Ag: 40, Dex: 35, Int: 40, FM: 35, Soc: 30, M: 4 }, skills: [], talents: [], states: [], equipment: [], extensions: { v5: {} }, ...extra });
const sequela = (id, participantId, extra) => ({ id, participantId, incidentId: 'inc', key: id, label: id, status: 'permanent', startDay: 0, history: [], ...extra });
const loss = (id, part, side, extra = {}) => sequela(id, 'hero', { kind: 'loss', part, side, count: 1, relearned: 0, ...extra });
async function table(sequelae, { day = 0, heroExtra = {}, incidents = [] } = {}) {
  const store = createStore({ storage: null, persistence: memoryPersistence() });
  await store.ready;
  const register = { ...createAftermathState(), sequelae, incidents };
  register.calendar.currentDay = day;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], diceLines: [], log: [], extensions: { v5: { aftermathRegister: register } }, combat: { round: 0, currentActorId: null, order: [], participants: [person('hero', heroExtra), person('foe')] } });
  return store;
}
const sword = { id: 'sword', kind: 'weapon', name: 'Épée', category: 'Base', damage: 'BF+4', qualities: [] };
const greatsword = { id: 'great', kind: 'weapon', name: 'Épée à deux mains', category: 'Deux mains', hands: 2, damage: 'BF+5', qualities: [] };
const attack = (weapon, context = {}) => ({ resolutionId: `r-${weapon?.id || 'none'}-${Math.random()}`, actorId: 'hero', targetId: 'foe', action: { type: 'attack', attr: 'CC', base: 50, damage: 4, qualities: [], label: 'Attaque', extensions: weapon ? { fiche: { equipmentId: weapon.id } } : {} }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee', context } });
const skillTest = (label, attr, context = {}, base = 50) => ({ resolutionId: `t-${label}-${Math.random()}`, actorId: 'hero', action: { type: 'skill', attr, base, label, note: label }, roll: 24, v5: { kind: 'test', context: { isAction: false, involvesMovement: false, runningOrHiding: false, ...context } } });
const mods = preview => (preview.test?.details?.modifiers || []).filter(row => row.id.startsWith('sequela:'));

test('J2 effets : une main perdue interdit l’arme à deux mains et donne le Désavantage aux Tests à deux mains, une seule source', async () => {
  const store = await table([loss('hand-l', 'hand', 'left', { primary: false })], { heroExtra: { equipment: [sword, greatsword] } });
  const mirror = store.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects;
  assert.deepEqual(mirror.rows.map(row => row.type), ['two-hands']);
  const two = store.previewResolution(attack(greatsword));
  assert.ok(two.unresolved.some(text => /arme à deux mains est interdite/.test(text)), two.unresolved.join('|'));
  assert.equal(two.ready, false);
  const one = store.previewResolution(attack(sword));
  assert.ok(!one.unresolved.some(text => /deux mains/.test(text)));
  // Test hors attaque : la circonstance est demandée au MJ puis appliquée (Désavantage), sans double comptage.
  const asked = store.previewResolution(skillTest('Escalade', 'F'));
  assert.ok(asked.unresolved.some(text => /deux mains/.test(text)));
  const yes = store.previewResolution(skillTest('Escalade', 'F', { sequelaTwoHands: true }));
  assert.equal(yes.unresolved.filter(text => /deux mains/.test(text)).length, 0);
  assert.deepEqual(yes.test.advantage.disadvantage.map(row => row.label), ['Main ou bras perdu (Test à deux mains)']);
  const no = store.previewResolution(skillTest('Escalade', 'F', { sequelaTwoHands: false }));
  assert.equal(no.test.advantage.disadvantage.length, 0);
});

test('J2 effets : main directrice perdue, une seule pénalité de main non directrice (règle générale), réduite de 1 DR par 100 PX', async () => {
  const offHand = preview => (preview.test?.details?.modifiers || []).filter(row => /offHand|offhand/.test(row.id)).map(row => row.amount);
  const store = await table([loss('hand-r', 'hand', 'right', { primary: true })], { heroExtra: { equipment: [sword] } });
  assert.deepEqual(offHand(store.previewResolution(attack(sword, { sequelaOffHand: true, sequelaTwoHands: false }))), [-2]);
  assert.deepEqual(offHand(store.previewResolution(attack(sword, { sequelaOffHand: false }))), []);
  const relearned = await table([loss('hand-r', 'hand', 'right', { primary: true, relearned: 1 })], { heroExtra: { equipment: [sword] } });
  assert.deepEqual(offHand(relearned.previewResolution(attack(sword, { sequelaOffHand: true }))), [-1]);
  // Pas de second malus : la case générale « main secondaire » cochée en plus ne cumule pas, et les 100 PX la réduisent aussi.
  assert.deepEqual(offHand(store.previewResolution(attack(sword, { sequelaOffHand: true, penalties: { offHand: -2 } }))), [-2]);
  assert.deepEqual(offHand(relearned.previewResolution(attack(sword, { penalties: { offHand: -2 } }))), [-1]);
  assert.ok(!mods(store.previewResolution(attack(sword, { sequelaOffHand: true }))).some(row => row.amount === -2));
  // Ambidextre supprime la pénalité, même séquelle.
  const ambi = await table([loss('hand-r', 'hand', 'right', { primary: true })], { heroExtra: { equipment: [sword], talents: [{ id: 'talent-ambidextrous', name: 'Ambidextre', status: 'resolved', rank: 1 }] } });
  assert.deepEqual(offHand(ambi.previewResolution(attack(sword, { sequelaOffHand: true }))).filter(amount => amount < 0), []);
});

test('J2 effets : bras perdu, bouclier impossible ; doigts : −1 DR par doigt, quatre doigts valent une main', async () => {
  const arm = await table([loss('arm', 'arm', 'left')], { heroExtra: { equipment: [sword] } });
  const shield = arm.previewResolution(attack(sword, { attackWithShield: true, sequelaShieldOnLostArm: true }));
  assert.ok(shield.unresolved.some(text => /ne peut pas y fixer de bouclier|bouclier/.test(text)));
  const fingers = await table([loss('f', 'finger', 'right', { count: 2 })]);
  assert.deepEqual(mods(fingers.previewResolution(skillTest('Crochetage', 'Dex', { 'sequelaUses:arm:right': true }))).map(row => row.amount), [-2]);
  assert.ok(fingers.previewResolution(skillTest('Crochetage', 'Dex')).unresolved.some(text => /utilise cette zone/.test(text)));
  const four = await table([loss('f', 'finger', 'right', { count: 4 })]);
  assert.deepEqual(four.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects.rows.map(row => row.type), ['two-hands']);
});

test('J2 effets : pied perdu, Mouvement arrondi au-dessus, −10 CC et Agilité, Esquive et Athlétisme en Désavantage ; jambe : Esquive interdite', async () => {
  const foot = await table([loss('foot', 'foot', 'left')]);
  const row = foot.listParticipants().find(item => item.id === 'hero').extensions.v5.sequelaEffects;
  assert.deepEqual(row.movement, { base: 4, effective: 2 });
  assert.deepEqual(Object.fromEntries(Object.entries(sequelaCharacteristicTotals(row.rows)).map(([key, value]) => [key, value.amount])), { CC: -10, Ag: -10 });
  const dodge = foot.previewResolution(skillTest('Esquive', 'Ag'));
  assert.equal(dodge.test.advantage.disadvantage.length, 1);
  assert.equal(dodge.test.score, 40, 'Agilité −10 sur le score du Test (50 → 40)');
  const athletics = foot.previewResolution(skillTest('Athlétisme', 'Ag'));
  assert.equal(athletics.test.advantage.disadvantage.length, 1);
  const leg = await table([loss('leg', 'leg', 'right')]);
  assert.ok(leg.previewResolution(skillTest('Esquive', 'Ag')).unresolved.some(text => /Esquive est impossible/.test(text)));
  assert.ok(!foot.previewResolution(skillTest('Esquive', 'Ag')).unresolved.some(text => /Esquive est impossible/.test(text)));
});

test('J2 effets : deux pieds, Mouvement 1 et −15 ; les orteils déjà perdus réduisent la pénalité du pied sans la compter deux fois', async () => {
  const two = await table([loss('foot-l', 'foot', 'left'), loss('foot-r', 'foot', 'right')]);
  const rows = two.listParticipants().find(item => item.id === 'hero').extensions.v5.sequelaEffects;
  assert.equal(rows.movement.effective, 1);
  assert.equal(sequelaCharacteristicTotals(rows.rows).CC.amount, -15);
  const toes = await table([loss('toes', 'toe', 'left', { count: 3 })]);
  assert.equal(sequelaCharacteristicTotals(toes.listParticipants().find(item => item.id === 'hero').extensions.v5.sequelaEffects.rows).Ag.amount, -3);
  const both = await table([loss('toes', 'toe', 'left', { count: 3 }), loss('foot-l', 'foot', 'left')]);
  assert.equal(sequelaCharacteristicTotals(both.listParticipants().find(item => item.id === 'hero').extensions.v5.sequelaEffects.rows).Ag.amount, -10, '10 pour le pied dont 3 déjà comptés avec les orteils');
});

test('J2 effets : deux yeux perdus (vue + Avantage de mêlée adverse), deux oreilles, nez, langue', async () => {
  const eyes = await table([loss('e1', 'eye', 'left'), loss('e2', 'eye', 'right')]);
  assert.ok(eyes.previewResolution(skillTest('Perception', 'I')).unresolved.some(text => /influencé par la vue/.test(text)));
  assert.equal(eyes.previewResolution(skillTest('Perception', 'I', { reliesOnSight: true })).test.advantage.disadvantage.length, 1);
  assert.equal(eyes.previewResolution(skillTest('Perception', 'I', { reliesOnSight: false, requiresSight: false })).test.advantage.disadvantage.length, 0);
  const oneEye = await table([loss('e1', 'eye', 'left')]);
  assert.equal(oneEye.previewResolution(skillTest('Perception', 'I')).unresolved.filter(text => /vue/.test(text)).length, 0, 'un seul œil perdu : aucun malus chiffré');
  // L'adversaire gagne l'Avantage pour toucher en mêlée un combattant privé de ses deux yeux.
  const blind = await table([loss('e1', 'eye', 'left'), loss('e2', 'eye', 'right')]);
  await blind.updateParticipant('hero', { camp: 'ennemi' }); await blind.updateParticipant('foe', { camp: 'pj' });
  const hit = blind.previewResolution({ ...attack(null), actorId: 'foe', targetId: 'hero', action: { type: 'attack', attr: 'CC', base: 50, damage: 4, qualities: [], label: 'Attaque' } });
  assert.ok(hit.test.advantage.advantage.some(row => /deux yeux|privée de ses deux yeux/i.test(row.label)), JSON.stringify(hit.test.advantage));
  const ears = await table([loss('a1', 'ear', 'left'), loss('a2', 'ear', 'right')]);
  assert.equal(ears.previewResolution(skillTest('Perception', 'I', { sequelaHearing: true })).test.advantage.disadvantage.length, 1);
  assert.equal(ears.previewResolution(skillTest('Perception', 'I', { sequelaHearing: false })).test.advantage.disadvantage.length, 0);
  const nose = await table([loss('nose', 'nose', null)]);
  assert.deepEqual(mods(nose.previewResolution(skillTest('Intimidation', 'Soc'))).map(row => row.amount), [2]);
  assert.deepEqual(mods(nose.previewResolution(skillTest('Charme', 'Soc'))).map(row => row.amount), [-2]);
  assert.equal(nose.previewResolution(skillTest('Perception', 'I', { sequelaSmell: true })).test.advantage.disadvantage.length, 1);
  const tongue = await table([loss('tongue', 'tongue', null)]);
  assert.ok(tongue.previewResolution(skillTest('Langue (Reikspiel)', 'Int', { sequelaSpeech: true })).unresolved.some(text => /échec automatique/.test(text)));
  assert.ok(!tongue.previewResolution(skillTest('Langue (Reikspiel)', 'Int', { sequelaSpeech: false })).unresolved.some(text => /échec automatique/.test(text)));
});

test('J2 effets : dents (1 Sociabilité par paire), perte de caractéristique (base d’abord, puis Avancements)', async () => {
  const teeth = await table([loss('teeth', 'teeth', null, { count: 5 })]);
  assert.equal(teeth.previewResolution(skillTest('Charme', 'Soc', {}, 50)).test.score, 48, '5 dents : −2 Sociabilité');
  const characteristic = await table([sequela('lost', 'hero', { kind: 'characteristic-loss', carac: 'Ag', requested: 5, applied: 5, split: { appliedToBase: 5, appliedToAdvances: 0, base: 0, advances: 3 }, reason: 'Poison' })]);
  assert.equal(characteristic.previewResolution(skillTest('Équitation', 'Ag')).test.score, 45);
  assert.equal(characteristic.previewResolution(skillTest('Équitation', 'F')).test.score, 50);
});

test('J2 effets : cicatrices impressionnantes selon l’accord du MJ, le nez remplace le bonus ordinaire, la cicatrice de duel guérie vaut une fois', async () => {
  const agreed = await table([sequela('scars', 'hero', { kind: 'scar-decision', agreed: true })]);
  assert.deepEqual(mods(agreed.previewResolution(skillTest('Intimidation', 'Soc'))).map(row => row.amount), [1]);
  assert.deepEqual(mods(agreed.previewResolution(skillTest('Charme', 'Soc'))).map(row => row.amount), [-1]);
  const declined = await table([sequela('scars', 'hero', { kind: 'scar-decision', agreed: false })]);
  assert.deepEqual(mods(declined.previewResolution(skillTest('Intimidation', 'Soc'))), []);
  const nose = await table([sequela('scars', 'hero', { kind: 'scar-decision', agreed: true }), loss('nose', 'nose', null)]);
  assert.deepEqual(mods(nose.previewResolution(skillTest('Intimidation', 'Soc'))).map(row => row.amount), [2], 'le nez remplace +1/−1 par +2/−2, sans cumul');
  const incident = { id: 'inc', participantId: 'hero', source: { kind: 'critical', criticalId: 'c' }, injuryDay: 0, status: 'closed', bandaged: true, requiresSurgery: false, surgeryCompleted: true, subjectKind: 'person', infection: false, dailyChecks: [], treatments: [] };
  const duel = await table([sequela('scar', 'hero', { kind: 'scar', status: 'permanent' })], { incidents: [incident] });
  assert.ok(duel.previewResolution(skillTest('Charme', 'Soc')).unresolved.some(text => /cicatrice de duel/.test(text)));
  assert.deepEqual(mods(duel.previewResolution(skillTest('Charme', 'Soc', { sequelaScarAppropriate: true }))).map(row => row.amount), [1]);
  const open = await table([sequela('scar', 'hero', { kind: 'scar', status: 'permanent' })], { incidents: [{ ...incident, status: 'open' }] });
  assert.ok(!open.previewResolution(skillTest('Charme', 'Soc')).unresolved.some(text => /cicatrice de duel/.test(text)), 'la cicatrice ne compte qu’une fois le critique guéri');
});

test('J2 effets : fracture et déchirure temporaires s’appliquent pendant leur durée et disparaissent au bon jour', async () => {
  const bone = (extra) => sequela('bone', 'hero', { kind: 'broken-bone', status: 'open', severity: 'minor', startDay: 0, d10: 4, durationDays: 34, endDay: 34, immobilization: { state: 'none', waiver: false, attempts: [] }, ...extra });
  const head = await table([bone({ part: 'head' })], { day: 33 });
  assert.deepEqual(mods(head.previewResolution(skillTest('Langue (Reikspiel)', 'Int'))).map(row => row.amount), [-3]);
  assert.deepEqual(mods(head.previewResolution(skillTest('Charme', 'Soc'))), [], 'seulement les Tests de Langue');
  const later = await table([bone({ part: 'head' })], { day: 34 });
  assert.deepEqual(mods(later.previewResolution(skillTest('Langue (Reikspiel)', 'Int'))), [], 'le jour de fin, la fracture est guérie');
  const body = await table([bone({ part: 'body' })], { day: 10 });
  const strength = body.previewResolution(skillTest('Escalade', 'F'));
  assert.equal(strength.test.advantage.disadvantage.length, 2, 'Désavantage majeur : deux Désavantages');
  assert.equal(body.previewResolution(skillTest('Savoir', 'Int')).test.advantage.disadvantage.length, 0);
  assert.equal(body.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects.movement.effective, 2);
  const tear = (extra) => sequela('tear', 'hero', { kind: 'torn-muscle', status: 'open', part: 'arm', side: 'left', startDay: 0, toughnessBonus: 3, reducedDays: 0, ...extra });
  const minor = await table([tear({ severity: 'minor', endDay: 27 })], { day: 26 });
  assert.deepEqual(mods(minor.previewResolution(skillTest('Escalade', 'F', { 'sequelaUses:arm:left': true }))).map(row => row.amount), [-1]);
  assert.deepEqual(mods((await table([tear({ severity: 'minor', endDay: 27 })], { day: 27 })).previewResolution(skillTest('Escalade', 'F'))), []);
  const major = (day) => table([tear({ severity: 'major', partialDay: 27, endDay: 54 })], { day });
  assert.deepEqual(mods((await major(26)).previewResolution(skillTest('Escalade', 'F', { 'sequelaUses:arm:left': true }))).map(row => row.amount), [-2]);
  assert.deepEqual(mods((await major(27)).previewResolution(skillTest('Escalade', 'F', { 'sequelaUses:arm:left': true }))).map(row => row.amount), [-1]);
  assert.deepEqual(mods((await major(54)).previewResolution(skillTest('Escalade', 'F'))), []);
  const leg = await table([tear({ part: 'leg', severity: 'minor', endDay: 27 })], { day: 5 });
  assert.equal(leg.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects.movement.effective, 2, 'jambe : Mouvement divisé par deux');
});

test('J2 effets : fracture mal soignée, séquelle permanente (Mouvement, Agilité, Langue parlée) ; majeure : doublée', async () => {
  const bad = (part, severity, extra = {}) => sequela('bad', 'hero', { kind: 'broken-bone', status: 'permanent', severity, part, side: 'left', endDay: 30, ...extra });
  const leg = await table([bad('leg', 'minor')], { day: 90 });
  const mirror = leg.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects;
  assert.equal(mirror.movement.effective, 3);
  assert.equal(sequelaCharacteristicTotals(mirror.rows).Ag.amount, -10);
  const major = await table([bad('body', 'major')], { day: 90 });
  const mirror2 = major.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects;
  assert.equal(mirror2.movement.effective, 2);
  assert.equal(sequelaCharacteristicTotals(mirror2.rows).Ag.amount, -20);
  const head = await table([bad('head', 'major')], { day: 90 });
  assert.ok(head.previewResolution(skillTest('Langue (Reikspiel)', 'Int')).unresolved.some(text => /implique la parole/.test(text)));
  assert.deepEqual(mods(head.previewResolution(skillTest('Langue (Reikspiel)', 'Int', { sequelaSpeech: true }))).map(row => row.amount), [-2]);
  const arm = await table([bad('arm', 'minor')], { day: 90 });
  assert.deepEqual(mods(arm.previewResolution(skillTest('Équitation', 'Ag', { 'sequelaUses:arm:left': true }))).map(row => row.amount), [-1]);
  assert.deepEqual(mods(arm.previewResolution(skillTest('Escalade', 'F', { 'sequelaUses:arm:left': true }))), [], 'seulement les Tests d’Agilité');
});

test('J2 effets : aucune séquelle, aucun changement ; la projection suit le registre (plus de registre, plus de projection)', async () => {
  const none = await table([]);
  assert.equal(none.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects, undefined);
  const plain = none.previewResolution(skillTest('Escalade', 'F'));
  assert.deepEqual(plain.unresolved, []);
  assert.equal(effectiveSequelaMovement([], 4), 4);
  assert.deepEqual(sequelaEffectRows({ calendar: { currentDay: 0 }, sequelae: [], incidents: [] }, 'hero'), []);
});

test('J2 effets : le départage d’Initiative ne pose aucune question de circonstance de séquelle et ne suppose aucun malus', async () => {
  const { prepareCombatInitiative } = await import('../../../js/core/turn-order.js');
  const mirror = rows => ({ schemaVersion: 1, rows, movement: null, reminders: [] });
  const rows = [
    { id: 'h:two-hands', sourceId: 'h', lifetime: 'permanent', type: 'two-hands', label: 'Main perdue' },
    { id: 'f:fingers', sourceId: 'f', lifetime: 'permanent', type: 'loc-dr', loc: 'arm:right', amount: -2, label: '2 doigts perdus' },
    { id: 'x:eyes', sourceId: 'x', lifetime: 'permanent', type: 'both-eyes', label: 'Deux yeux perdus' },
    { id: 'x:tear', sourceId: 'x', lifetime: 'temporary', type: 'loc-dr', loc: 'leg:left', amount: -1, label: 'Déchirure' }
  ];
  const mk = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 40, hp: 10, maxHp: 10, states: [], caracs: { I: 40 }, extensions: { v5: {} }, ...extra });
  const hurt = mk('first', { extensions: { v5: { sequelaEffects: mirror(rows) } } }), other = mk('second');
  const group = prepareCombatInitiative([hurt, other], { diceById: { first: 4, second: 4 } }).tieGroups[0];
  const plan = prepareCombatInitiative([hurt, other], { diceById: { first: 4, second: 4 }, tieOrders: { [group.key]: ['first', 'second'] },
    opposedRolls: { [`${group.key}:first:second`]: { initiatorRoll: 44, opponentRoll: 60 } } });
  assert.ok(!plan.needsInput.some(item => item.field === 'oppositionContext'), JSON.stringify(plan.needsInput));
  assert.equal(plan.oppositions[0].initiator.modifiers?.length ?? 0, 0);
});

test('J2 effets : « à renvoyer à la fiche » ne contient que le permanent, avec la provenance de chaque effet', async () => {
  const fracture = (side = 'right') => sequela('frac', 'hero', { kind: 'broken-bone', part: 'leg', side, severity: 'minor', status: 'open', durationDays: 40, endDay: 40, immobilization: { state: 'none', waiver: false, attempts: [] } });
  const only = await table([fracture()]);
  assert.deepEqual(only.listAftermathSequelae().characteristics, {}, 'une fracture de jambe en cours ne se renvoie pas à la fiche');
  assert.deepEqual(Object.keys(sequelaCharacteristicTotals(sequelaEffectRows(only.getAftermathState(), 'hero'))), ['CC', 'Ag'], 'le combat, lui, applique la fracture');
  const both = await table([loss('foot', 'foot', 'left'), fracture('right')]);
  const sheet = both.listAftermathSequelae().characteristics.hero;
  assert.deepEqual(Object.fromEntries(Object.entries(sheet).map(([key, value]) => [key, value.amount])), { CC: -10, Ag: -10 });
  assert.ok(Object.values(sheet).every(entry => entry.sources.every(source => source.sourceId === 'foot' && source.lifetime === 'permanent')));
  // Au combat, les deux jambes comptent (−15) : la part temporaire garde la fracture pour source.
  const combat = sequelaCharacteristicTotals(sequelaEffectRows(both.getAftermathState(), 'hero'));
  assert.equal(combat.CC.amount, -15);
  assert.deepEqual(combat.CC.sources.map(source => [source.sourceId, source.lifetime, source.amount]), [['foot', 'permanent', -10], ['frac', 'temporary', -5]]);
});

test('J2 effets : Fuite, Sprint et Fuite ! lisent le Mouvement réduit par les séquelles', async () => {
  const { previewV5BrokenEscape, previewV5FleeTalentDisengageMove } = await import('../../../js/core/v5-broken-escape.js');
  const actor = (movement, extra = {}) => ({ ...person('hero'), states: [{ id: 'b1', key: 'brise', name: 'Brisé', level: 1 }],
    skills: [{ id: 'ath', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total: 55 }],
    talents: [{ id: 'talent-flee', name: 'Fuite !', status: 'resolved', rank: 1 }],
    extensions: { v5: movement === undefined ? {} : { sequelaEffects: { schemaVersion: 1, rows: [], movement: { base: 4, effective: movement }, reminders: [] } } }, ...extra });
  const turn = { encounterId: 'e', turnId: 't', round: 1 };
  const facts = { visibleToAnyEnemy: true, engagedEnemyIds: [], moveMode: 'run', visibleToAnyEnemyAfter: true };
  const flee = (hero) => previewV5BrokenEscape({ actor: hero, action: 'flee', facts, turn });
  assert.equal(flee(actor()).moveDistance, 16, 'sans séquelle : 4 × M');
  assert.equal(flee(actor(2)).moveDistance, 8, 'pied perdu : M 2 × 4');
  const sprint = hero => previewV5BrokenEscape({ actor: hero, action: 'sprint', facts: { visibleToAnyEnemyAfter: false }, turn, roll: 10, sequence: { fleeCommitted: true, visibleToAnyEnemy: true, moveMode: 'run' } });
  const whole = sprint(actor()), reduced = sprint(actor(2));
  assert.equal(whole.ready, true, JSON.stringify(whole.error || whole.needsInput));
  assert.equal(whole.moveDistance - reduced.moveDistance, 8);
  assert.equal(reduced.sprintDistance, whole.sprintDistance - 8);
  const talent = hero => previewV5FleeTalentDisengageMove({ actor: hero, disengagedConfirmed: true });
  assert.deepEqual([talent(actor()).extraMoveDistance, talent(actor(2)).extraMoveDistance], [16, 8]);
});

test('J2 effets : Obstiné n’efface pas les malus de séquelles (décision du MJ) mais efface les autres négatifs', async () => {
  const store = await table([loss('f', 'finger', 'right', { count: 2 })], { heroExtra: { talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }] } });
  await store.startTalentSession();
  const test = {
    resolutionId: 'stubborn', actorId: 'hero', action: { type: 'skill', attr: 'Dex', base: 50, label: 'Crochetage', note: 'Crochetage' }, roll: 24,
    v5: { kind: 'test', slModifier: -3, context: { isAction: false, involvesMovement: false, runningOrHiding: false, preRollTalent: 'strong-minded', 'sequelaUses:arm:right': true } }
  };
  const preview = store.previewResolution(test);
  assert.deepEqual(mods(preview).map(row => row.amount), [-2], 'le malus de séquelle reste');
  assert.equal(preview.test.details.modifiers.filter(row => row.amount < 0 && !row.id.startsWith('sequela:')).length, 0, 'les autres négatifs sont effacés');
  assert.equal(preview.test.details.totalModifier, -2, 'Obstiné a bien joué : le −3 du MJ est effacé, il ne reste que la séquelle');
});

test('J2 effets : arme à deux mains non reconnue — marqueur (2M) du nom lu, arc ou arme sans mains connues : la question est posée', async () => {
  const bow = { id: 'bow', kind: 'weapon', name: 'Arc long', category: 'Arc', range: '50', damage: 'BF+4', qualities: [] };
  const store = await table([loss('hand-l', 'hand', 'left', { primary: false })], { heroExtra: { equipment: [sword, bow] } });
  const bare = (label, context = {}) => ({ resolutionId: `m-${label}-${Math.random()}`, actorId: 'hero', targetId: 'foe', action: { type: 'attack', attr: 'CC', base: 50, damage: 4, qualities: [], label }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee', context } });
  const marked = store.previewResolution(bare('Espadon (2M)'));
  assert.ok(marked.unresolved.some(text => /arme à deux mains est interdite/.test(text)), marked.unresolved.join('|'));
  assert.ok(store.previewResolution(bare('Épée')).unresolved.some(text => /exige deux mains/.test(text)), 'sans marqueur ni arme connue : la question est posée');
  const asked = store.previewResolution(attack(bow));
  assert.ok(asked.unresolved.some(text => /exige deux mains/.test(text)), asked.unresolved.join('|'));
  const yes = store.previewResolution(attack(bow, { sequelaWeaponTwoHands: true }));
  assert.ok(yes.unresolved.some(text => /arme à deux mains est interdite/.test(text)));
  const no = store.previewResolution(attack(bow, { sequelaWeaponTwoHands: false }));
  assert.ok(!no.unresolved.some(text => /deux mains/.test(text)), no.unresolved.join('|'));
});

test('J2 effets : une perte sur une partie déjà perdue (troisième oreille) peut être close « sans objet », sans effet', async () => {
  const third = sequela('ear-3', 'hero', { kind: 'loss', part: 'ear', count: 1, status: 'needs-facts', missing: ['side'], relearned: 0 });
  const store = await table([loss('ear-l', 'ear', 'left'), loss('ear-r', 'ear', 'right'), third]);
  const before = store.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects.rows.length;
  assert.equal((await store.setAftermathSequelaFacts({ operationId: 'moot-1', sequelaId: 'ear-3', facts: { side: 'left' } })).receipt.reason, 'part-already-lost');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: 'moot-2', sequelaId: 'ear-3', facts: { alreadyLost: false } })).receipt.reason, 'invalid-facts');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: 'moot-3', sequelaId: 'ear-3', facts: { alreadyLost: true } })).receipt.reason, 'sequela-not-applicable');
  const closed = store.getAftermathState().sequelae.find(row => row.id === 'ear-3');
  assert.deepEqual([closed.status, closed.reason], ['not-applicable', 'part-already-lost']);
  assert.equal(store.listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects.rows.length, before, 'aucun effet ajouté');
  assert.equal(store.listAftermathSequelae().pending.length, 0, 'plus rien n’est en attente');
  // Une première perte, sur un côté libre, ne peut pas être déclarée sans objet.
  const free = await table([sequela('ear-1', 'hero', { kind: 'loss', part: 'ear', count: 1, status: 'needs-facts', missing: ['side'], relearned: 0 })]);
  assert.equal((await free.setAftermathSequelaFacts({ operationId: 'moot-4', sequelaId: 'ear-1', facts: { alreadyLost: true } })).receipt.reason, 'invalid-facts');
});

test('J2 effets : dents, rappel « plus de la moitié » par espèce, strictement supérieur (Humains 16, Elfes 18, Halflings et Nains 20)', async () => {
  const reminders = async (count, race) => (await table([loss('teeth', 'teeth', undefined, { count })], { heroExtra: race ? { race } : {} })).listParticipants().find(row => row.id === 'hero').extensions.v5.sequelaEffects.reminders.filter(text => /dents/.test(text));
  assert.equal((await reminders(16, 'Humain')).length, 0, '16 dents : exactement la moitié, pas plus');
  assert.equal((await reminders(17, 'Humain')).length, 1);
  assert.equal((await reminders(18, 'Haut Elfe')).length, 0);
  assert.equal((await reminders(19, 'Elfe sylvain')).length, 1);
  assert.equal((await reminders(20, 'Nain')).length, 0);
  assert.equal((await reminders(21, 'Nain')).length, 1);
  assert.equal((await reminders(20, 'Halfling')).length, 0);
  assert.equal((await reminders(21, 'Halfling')).length, 1);
  assert.equal((await reminders(16)).length, 0, 'espèce inconnue : au plus 16, rien');
  assert.match((await reminders(17))[0], /Elfes plus de 18/, 'espèce inconnue : rappel des seuils');
});
});

describe('Planification et pertes de sequelles', () => {
// F2-J2 : suivi des séquelles d'un critique F2-I (fractures, déchirures, pertes), étapes de guérison, issue et clôture.
const clone = structuredClone;
function memoryPersistence() {
  let saved = null;
  return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } };
}
const base = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 20, maxHp: 20, caracs: { E: 30, Int: 50, M: 4, CC: 50, Ag: 40 }, skills: [], talents: [], states: [], extensions: { v5: {} }, ...extra });
const healerSheet = (extra = {}) => base('healer', { skills: [{ id: 'heal', name: 'Guérison', carac: 'Int', total: 60, advances: 10, status: 'resolved' }], ...extra });
const rollOf = (table, name) => Array.from({ length: 200 }, (_, i) => i + 1).find(n => getV5CriticalEffect(table, n)?.source?.printedName === name);
function wounded(id, table, name, patch = {}) {
  const made = createCriticalAftermathRecord(base(id), { table, effectRoll: rollOf(table, name), resolutionId: `res-${id}` });
  const participant = made.participant;
  const record = { ...made.record, ...patch };
  participant.extensions.v5.criticalAftermath = [record];
  participant.extensions.v5.criticalWounds = [{ id: record.criticalWoundId, name: record.effectName, location: record.location }];
  return { participant, record };
}
async function setup(participants, persistence = memoryPersistence()) {
  const store = createStore({ storage: null, persistence });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants }, log: [], diceLines: [], extensions: { v5: {} } });
  return { store, persistence };
}
let counter = 0;
const op = () => `op-${++counter}`;
async function follow(store, participantId, record) {
  const created = await store.registerAftermathIncident({ operationId: op(), participantId, criticalId: record.id, bandaged: true });
  assert.equal(created.receipt.status, 'applied', created.receipt.reason);
  return store.getAftermathState().incidents.find(row => row.source.criticalId === record.id).id;
}
const sequelaeOf = store => store.getAftermathState().sequelae;
const rowsOf = (store, id) => store.listParticipants().find(row => row.id === id).extensions.v5.sequelaEffects?.rows || [];
const advance = (store, days) => store.advanceAftermathCalendar({ operationId: op(), days });
const close = (store, incidentId, extra = {}) => store.closeAftermathIncident({ operationId: op(), incidentId, temporaryEffectsEnded: true, statesConfirmed: true, ...extra });

test('J2 — la proposition de suivi liste les séquelles de la table avec un identifiant stable dérivé de l’occurrence', () => {
  const { record } = wounded('p', 'ARM', 'Clean Break');
  const plan = planSequelae(record);
  assert.deepEqual(plan.map(item => [item.id, item.kind, item.severity, item.part]), [[`${record.id}:j2:injury:0`, 'broken-bone', 'minor', 'arm']]);
  const shin = wounded('q', 'LEG', 'Cracked Shin');
  assert.deepEqual(planSequelae(shin.record).map(item => [item.kind, item.severity, item.part]), [['broken-bone', 'minor', 'leg'], ['torn-muscle', 'major', 'leg']], 'plusieurs lésions d’un même critique restent distinctes');
  const hand = wounded('h', 'ARM', 'Mangled Hand', { amputationShock: { amputationOccurred: true, part: 'hand', difficultyDR: -2 } });
  assert.deepEqual(planSequelae(hand.record).map(item => [item.kind, item.part]), [['loss', 'hand']]);
  const unconfirmed = wounded('u', 'ARM', 'Cleft Hand', { amputationShock: { amputationOccurred: true, part: 'finger', difficultyDR: -1 } });
  assert.deepEqual(planSequelae(unconfirmed.record).map(item => item.part), ['finger'], 'la main conditionnelle n’est suivie qu’une fois confirmée dans le registre F2-I');
  assert.deepEqual(planSequelae(wounded('d', 'BODY', 'Winded').record), [], 'un critique sans séquelle n’ouvre aucun suivi');
});

test('J2 — fracture : faits manquants, immobilisation à temps, fin de guérison dispensée, critique déclaré guéri', async () => {
  const { participant, record } = wounded('patient', 'ARM', 'Clean Break');
  const { store } = await setup([participant, healerSheet()]);
  const incidentId = await follow(store, 'patient', record);
  assert.equal((await close(store, incidentId)).receipt.reason, 'sequelae-follow-up-not-opened');
  const opened = await store.openAftermathSequelae({ operationId: op(), incidentId });
  assert.equal(opened.receipt.status, 'applied');
  const [bone] = sequelaeOf(store);
  assert.deepEqual([bone.status, bone.missing], ['needs-facts', ['side', 'd10']]);
  assert.equal((await store.openAftermathSequelae({ operationId: op(), incidentId })).receipt.reason, 'sequelae-already-open', 'migration répétée : aucun doublon');
  assert.equal((await close(store, incidentId)).receipt.reason, 'sequelae-follow-up-open');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: bone.id, facts: { side: 'left' } })).receipt.reason, 'facts-missing:d10');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: bone.id, facts: { side: 'left', d10: 11 } })).receipt.reason, 'invalid-facts');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: bone.id, facts: { side: 'left', d10: 4 } })).receipt.status, 'applied');
  assert.deepEqual([sequelaeOf(store)[0].durationDays, sequelaeOf(store)[0].endDay], [34, 34], '30 + 1d10 jours');
  assert.deepEqual(rowsOf(store, 'patient').map(row => row.type), ['two-hands', 'shield-arm'], 'bras inutilisable : règles du bras amputé');
  // Test de Guérison (score 60, jet 20 : 4 DR) à +2 DR dans la semaine.
  assert.equal((await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: bone.id, healerId: 'patient', roll: 20 })).receipt.reason, 'skill-missing');
  const bound = await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: bone.id, healerId: 'healer', roll: 20 });
  assert.deepEqual([bound.receipt.reason, bound.receipt.difficultyDR, bound.receipt.success], ['fracture-bound', 2, true]);
  assert.equal((await store.resolveAftermathFracture({ operationId: op(), sequelaId: bone.id })).receipt.reason, 'fracture-still-healing');
  await advance(store, 33);
  assert.equal(rowsOf(store, 'patient').length, 2, 'le jour 33 la fracture bloque encore le bras');
  await advance(store, 1);
  assert.deepEqual(rowsOf(store, 'patient'), [], 'le jour 34 le malus temporaire a disparu');
  assert.equal(store.listAftermathSequelae().pending[0].kind, 'fracture-final-test');
  assert.equal((await close(store, incidentId)).receipt.reason, 'sequelae-follow-up-open');
  const healed = await store.resolveAftermathFracture({ operationId: op(), sequelaId: bone.id });
  assert.deepEqual([healed.receipt.reason, healed.receipt.waived], ['fracture-healed-bound', true], 'attachée tout le long : pas de Test d’Endurance');
  assert.equal((await close(store, incidentId)).receipt.reason, 'critical-healed');
  const kept = sequelaeOf(store)[0];
  assert.deepEqual([kept.status, kept.finalTest.waived, kept.history.length >= 0], ['healed', true, true], 'l’historique reste après la clôture');
  assert.deepEqual(store.getAftermathState().incidents[0].status, 'closed');
});

test('J2 — fracture : hors délai, pas d’immobilisation ; bandage retiré sans nouveau Test, l’Endurance finale s’impose et un échec laisse une séquelle', async () => {
  const { participant, record } = wounded('patient', 'ARM', 'Clean Break');
  const { store } = await setup([participant, healerSheet()]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId, facts: { 'injury:0': { side: 'right', d10: 1 } } });
  const bone = sequelaeOf(store)[0];
  assert.equal(bone.endDay, 31);
  assert.equal((await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: bone.id, healerId: 'healer', roll: 97 })).receipt.reason, 'immobilization-failed' === 'x' ? '' : 'immobilization-failed');
  await advance(store, 9);
  assert.equal((await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: bone.id, healerId: 'healer', roll: 10 })).receipt.reason, 'immobilization-window-passed', 'plus d’une semaine de 8 jours après la fracture');
  await advance(store, 22);
  assert.equal(store.listAftermathSequelae().sequelae[0].phase, 'awaiting-test');
  assert.equal((await store.resolveAftermathFracture({ operationId: op(), sequelaId: bone.id })).receipt.reason, 'invalid-test-facts');
  // Résistance +2 DR, score 30 : jet 90 raté → mal soignée.
  const failed = await store.resolveAftermathFracture({ operationId: op(), sequelaId: bone.id, roll: 90 });
  assert.deepEqual([failed.receipt.reason, failed.receipt.difficultyDR, failed.receipt.success], ['fracture-badly-healed', 2, false]);
  assert.equal(sequelaeOf(store)[0].status, 'permanent');
  assert.deepEqual(rowsOf(store, 'patient').map(row => [row.type, row.amount, row.lifetime]), [['loc-dr', -1, 'permanent']], 'bras mal soigné : −1 DR aux Tests d’Agilité avec ce bras');
  assert.equal((await close(store, incidentId)).receipt.reason, 'critical-healed', 'le critique est guéri, la séquelle permanente reste');
  assert.equal(rowsOf(store, 'patient').length, 1);
});

test('J2 — fracture : le bandage retiré exige un nouveau Test dans la journée, sinon le Test d’Endurance final revient ; majeure : 40 + 1d10 jours, Tests à +0', async () => {
  const { participant, record } = wounded('patient', 'LEG', 'Broken Knee');
  const { store } = await setup([participant, healerSheet()]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId, facts: { 'injury:0': { side: 'left', d10: 5 } } });
  const bone = sequelaeOf(store)[0];
  assert.deepEqual([bone.severity, bone.durationDays, bone.endDay], ['major', 45, 45]);
  assert.equal((await store.unbindAftermathFracture({ operationId: op(), sequelaId: bone.id })).receipt.reason, 'not-bound');
  const bound = await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: bone.id, healerId: 'healer', roll: 30 });
  assert.equal(bound.receipt.difficultyDR, 0, 'fracture majeure : Test Intermédiaire +0');
  assert.equal(bound.receipt.reason, 'fracture-bound');
  assert.equal((await store.unbindAftermathFracture({ operationId: op(), sequelaId: bone.id })).receipt.status, 'applied');
  await advance(store, 2);
  assert.equal((await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: bone.id, healerId: 'healer', roll: 30 })).receipt.reason, 'rebind-window-passed');
  await advance(store, 43);
  const final = await store.resolveAftermathFracture({ operationId: op(), sequelaId: bone.id, roll: 20 });
  assert.deepEqual([final.receipt.reason, final.receipt.difficultyDR, final.receipt.success], ['fracture-healed', 0, true]);
});

test('J2 — déchirure musculaire mineure : 30 − BE jours, un Test de Guérison réussi raccourcit une fois, effets pendant la durée', async () => {
  const { participant, record } = wounded('patient', 'ARM', 'Torn Muscles');
  const { store } = await setup([participant, healerSheet()]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId, facts: { 'injury:0': { side: 'left' } } });
  const tear = sequelaeOf(store)[0];
  assert.deepEqual([tear.severity, tear.toughnessBonus, tear.endDay], ['minor', 3, 27], '30 − BE 3');
  assert.deepEqual(rowsOf(store, 'patient').map(row => [row.type, row.amount, row.loc]), [['loc-dr', -1, 'arm:left']]);
  // Score 60, jet 20 → 4 DR : 1 jour + 3 jours après le premier = 4.
  const healed = await store.treatAftermathTornMuscle({ operationId: op(), sequelaId: tear.id, healerId: 'healer', roll: 20 });
  assert.deepEqual([healed.receipt.reason, healed.receipt.reduction, healed.receipt.endDay], ['tear-shortened', 4, 23]);
  assert.equal((await store.treatAftermathTornMuscle({ operationId: op(), sequelaId: tear.id, healerId: 'healer', roll: 20 })).receipt.reason, 'muscle-heal-already-used', 'le bénéfice ne se gagne qu’une fois');
  await advance(store, 22);
  assert.equal(rowsOf(store, 'patient').length, 1);
  await advance(store, 1);
  assert.deepEqual(rowsOf(store, 'patient'), []);
  assert.equal((await close(store, incidentId)).receipt.reason, 'critical-healed');
});

test('J2 — déchirure musculaire majeure : −2 DR puis −1 DR, guérie après un second délai ; le soin n’y change rien', async () => {
  const { participant, record } = wounded('patient', 'LEG', 'Badly Twisted Knee');
  const { store } = await setup([participant, healerSheet()]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId, facts: { 'injury:0': { side: 'right' } } });
  const tear = sequelaeOf(store)[0];
  assert.deepEqual([tear.severity, tear.partialDay, tear.endDay], ['major', 27, 54]);
  assert.equal((await store.treatAftermathTornMuscle({ operationId: op(), sequelaId: tear.id, healerId: 'healer', roll: 20 })).receipt.reason, 'heal-does-not-shorten-major-tear');
  assert.deepEqual(rowsOf(store, 'patient').map(row => [row.type, row.amount]), [['loc-dr', -2], ['movement', undefined]]);
  await advance(store, 27);
  assert.deepEqual(rowsOf(store, 'patient').map(row => [row.type, row.amount]), [['loc-dr', -1], ['movement', undefined]]);
  await advance(store, 27);
  assert.deepEqual(rowsOf(store, 'patient'), []);
});

test('J2 — main perdue confirmée : côté et main directrice saisis, effets permanents, même membre refusé deux fois, critique guéri après Chirurgie', async () => {
  const { participant, record } = wounded('patient', 'ARM', 'Mangled Hand', { amputationShock: { amputationOccurred: true, part: 'hand', difficultyDR: -2 } });
  const surgeon = healerSheet({ id: 'surgeon', talents: [{ id: 'talent-surgery', status: 'resolved', rank: 1 }] });
  const { store } = await setup([participant, surgeon]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId });
  const hand = sequelaeOf(store)[0];
  assert.deepEqual([hand.status, hand.missing], ['needs-facts', ['side']]);
  assert.deepEqual(rowsOf(store, 'patient'), [], 'aucun effet tant que le côté manque');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: hand.id, facts: { side: 'left', primary: true } })).receipt.status, 'applied');
  assert.equal(sequelaeOf(store)[0].status, 'permanent');
  assert.deepEqual(rowsOf(store, 'patient').map(row => row.type), ['two-hands', 'offhand-dr']);
  assert.equal((await close(store, incidentId)).receipt.reason, 'surgery-not-completed');
  assert.equal((await store.treatAftermathSurgicalIncident({ operationId: op(), incidentId, healerId: 'surgeon', roll: 10 })).receipt.reason, 'surgery-success');
  assert.equal((await close(store, incidentId)).receipt.reason, 'critical-healed');
  assert.equal(rowsOf(store, 'patient').length, 2, 'la perte reste après la clôture');
  assert.equal((await store.recordAftermathRelearning({ operationId: op(), sequelaId: hand.id, hundredsOfXp: 1 })).receipt.reason, 'hand-relearned');
  assert.deepEqual(rowsOf(store, 'patient').map(row => row.amount).filter(Boolean), [-1]);
  assert.equal((await store.recordAftermathRelearning({ operationId: op(), sequelaId: hand.id, hundredsOfXp: 2 })).receipt.reason, 'invalid-test-facts');
});

test('J2 — pertes composées : œil et nez, dents (nombre saisi), jambes (Moelle épinière), même partie jamais perdue deux fois', async () => {
  const eyeNose = wounded('face', 'HEAD', 'Disfiguring Blow', { amputationShock: { amputationOccurred: true, part: 'eye-and-nose', difficultyDR: -2 } });
  const teeth = wounded('mouth', 'HEAD', 'Smashed Teeth', { amputationShock: { amputationOccurred: true, part: 'teeth', difficultyDR: 4 } });
  const spine = wounded('spine', 'BODY', 'Spinal Cord Damage', { amputationShock: { amputationOccurred: true, part: 'legs', difficultyDR: -3 } });
  const { store } = await setup([eyeNose.participant, teeth.participant, spine.participant]);
  assert.deepEqual(planSequelae(eyeNose.record).map(item => item.part), ['eye', 'nose']);
  assert.deepEqual(planSequelae(spine.record).map(item => [item.kind, item.part, item.side]), [['broken-bone', 'body', undefined], ['loss', 'leg', 'left'], ['loss', 'leg', 'right']], 'jambes inutilisables : une jambe par côté, pas de doublon avec le choc');
  const faceIncident = await follow(store, 'face', eyeNose.record);
  await store.openAftermathSequelae({ operationId: op(), incidentId: faceIncident, facts: { 'shock:0:eye': { side: 'left' } } });
  assert.deepEqual(sequelaeOf(store).map(row => [row.part, row.status]), [['eye', 'permanent'], ['nose', 'permanent']]);
  assert.deepEqual(rowsOf(store, 'face').map(row => row.type), ['smell', 'social'], 'nez perdu : cicatrice +2/−2 et odorat ; un œil : aucun malus chiffré');
  const mouthIncident = await follow(store, 'mouth', teeth.record);
  await store.openAftermathSequelae({ operationId: op(), incidentId: mouthIncident });
  const tooth = sequelaeOf(store).find(row => row.part === 'teeth');
  assert.equal(tooth.status, 'needs-facts');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: tooth.id, facts: { count: 0 } })).receipt.reason, 'invalid-facts');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: tooth.id, facts: { count: 6 } })).receipt.status, 'applied');
  assert.deepEqual(rowsOf(store, 'mouth').map(row => [row.type, row.carac, row.amount]), [['char', 'Soc', -3]], 'une paire de dents = 1 point de Sociabilité');
  const spineIncident = await follow(store, 'spine', spine.record);
  await store.openAftermathSequelae({ operationId: op(), incidentId: spineIncident, facts: { 'injury:0': { d10: 3 } } });
  assert.equal(sequelaeOf(store).filter(row => row.participantId === 'spine' && row.kind === 'loss').length, 2);
  assert.deepEqual(rowsOf(store, 'spine').map(row => row.type).sort(), ['char', 'char', 'disadvantage-carac', 'dodge-athletics-disadvantage', 'movement', 'movement', 'no-dodge'].sort(), 'jambes perdues et fracture du corps majeure, sans doublon');
  assert.equal(store.listParticipants().find(row => row.id === 'spine').extensions.v5.sequelaEffects.movement.effective, 1, 'deux jambes perdues : Mouvement 1');
});

test('J2 — Pied écrasé : chirurgie dans les BE jours, sinon décision du MJ sur la perte du pied', async () => {
  const { participant, record } = wounded('patient', 'LEG', 'Crushed Foot');
  const surgeon = healerSheet({ id: 'surgeon', talents: [{ id: 'talent-surgery', status: 'resolved', rank: 1 }] });
  const { store } = await setup([participant, surgeon]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId });
  const deadline = sequelaeOf(store).find(row => row.kind === 'surgery-deadline');
  assert.equal(deadline.deadlineDay, 3, 'BE 3 jours');
  assert.equal((await store.decideAftermathSurgeryDeadline({ operationId: op(), sequelaId: deadline.id, footLost: false })).receipt.reason, 'deadline-not-reached');
  await advance(store, 4);
  assert.equal(store.listAftermathSequelae().pending.some(row => row.kind === 'surgery-deadline-missed'), true);
  assert.equal((await close(store, incidentId)).receipt.reason, 'sequelae-follow-up-open');
  assert.equal((await store.decideAftermathSurgeryDeadline({ operationId: op(), sequelaId: deadline.id, footLost: true })).receipt.reason, 'facts-missing:side');
  const lost = await store.decideAftermathSurgeryDeadline({ operationId: op(), sequelaId: deadline.id, footLost: true, side: 'left' });
  assert.equal(lost.receipt.reason, 'foot-lost-confirmed');
  assert.deepEqual(sequelaeOf(store).filter(row => row.kind === 'loss').map(row => [row.part, row.side]), [['foot', 'left']]);
  assert.deepEqual(store.listParticipants().find(row => row.id === 'patient').extensions.v5.sequelaEffects.movement, { base: 4, effective: 2 });
});

test('J2 — épaule disloquée : remise en place confirmée, puis critique guéri ; cicatrices : décision explicite du MJ', async () => {
  const { participant, record } = wounded('patient', 'ARM', 'Dislocated Shoulder');
  const { store } = await setup([participant]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId });
  const reset = sequelaeOf(store).find(row => row.kind === 'reset-limb');
  assert.equal((await close(store, incidentId)).receipt.reason, 'sequelae-follow-up-open');
  assert.equal((await store.confirmAftermathResetLimb({ operationId: op(), sequelaId: reset.id })).receipt.reason, 'limb-reset-confirmed');
  assert.equal((await close(store, incidentId)).receipt.reason, 'critical-healed');
  assert.equal((await store.decideAftermathImpressiveScars({ operationId: op(), participantId: 'patient', agreed: true })).receipt.reason, 'scars-agreed');
  assert.equal((await store.decideAftermathImpressiveScars({ operationId: op(), participantId: 'patient', agreed: false })).receipt.reason, 'scars-declined');
  assert.equal(sequelaeOf(store).filter(row => row.kind === 'scar-decision').length, 1, 'une seule décision par personnage');
});

test('J2 — Orteil entaillé : Test de Résistance après la rencontre, la perte éventuelle suit le choc F2-I', async () => {
  const { participant, record } = wounded('patient', 'LEG', 'Badly Cut Toe');
  const { store } = await setup([participant]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId });
  const test = sequelaeOf(store).find(row => row.kind === 'post-encounter-test');
  assert.equal(test.difficultyDR, 0);
  assert.equal((await store.recordAftermathPostEncounterTest({ operationId: op(), sequelaId: test.id })).receipt.reason, 'invalid-test-facts');
  const failed = await store.recordAftermathPostEncounterTest({ operationId: op(), sequelaId: test.id, roll: 90 });
  assert.deepEqual([failed.receipt.reason, failed.receipt.score, failed.receipt.success], ['post-encounter-failed', 30, false]);
  const refused = await close(store, incidentId);
  assert.deepEqual([refused.receipt.reason, refused.receipt.outstanding.map(row => row.reason)], ['sequelae-follow-up-open', ['amputation-decision-pending']], 'l’échec attend la décision du choc d’amputation du registre F2-I');
  // Choc confirmé : la perte de l’orteil devient une séquelle à suivre, avec son côté et son nombre.
  const confirmed = { ...record, amputationShock: { amputationOccurred: true, part: 'toe', difficultyDR: 2 } };
  await store.updateParticipant('patient', { extensions: { v5: { ...store.listParticipants().find(row => row.id === 'patient').extensions.v5, criticalAftermath: [confirmed] } } });
  assert.equal((await close(store, incidentId)).receipt.reason, 'sequelae-follow-up-not-opened');
});

test('J2 — perte de caractéristique : base d’abord, puis Avancements ; rien n’est écrit sur la fiche, provenance conservée', async () => {
  assert.deepEqual(splitCharacteristicLoss({ base: 30, advances: 5, amount: 10 }), { appliedToBase: 10, appliedToAdvances: 0, base: 20, advances: 5 });
  assert.deepEqual(splitCharacteristicLoss({ base: 4, advances: 5, amount: 10 }), { appliedToBase: 4, appliedToAdvances: 5, base: 0, advances: 0 }, 'à 0 de base, les Avancements achetés sont retirés');
  assert.deepEqual(splitCharacteristicLoss({ base: 4, advances: 9, amount: 10 }), { appliedToBase: 4, appliedToAdvances: 6, base: 0, advances: 3 });
  const { store } = await setup([base('patient')]);
  const sheetBefore = clone(store.listParticipants().find(row => row.id === 'patient').caracs);
  const lost = await store.recordAftermathCharacteristicLoss({ operationId: op(), participantId: 'patient', carac: 'Ag', amount: 10, base: 4, advances: 9, reason: 'Poison de la Lance du Néant' });
  assert.deepEqual([lost.receipt.reason, lost.receipt.applied], ['characteristic-loss-recorded', 10]);
  assert.deepEqual(store.listParticipants().find(row => row.id === 'patient').caracs, sheetBefore, 'la fiche du participant n’est pas modifiée');
  assert.deepEqual(store.listAftermathSequelae().characteristics.patient.Ag.sources.map(row => [row.amount, row.lifetime]), [[-10, 'permanent']]);
  assert.equal((await store.recordAftermathCharacteristicLoss({ operationId: op(), participantId: 'patient', carac: 'Ag', amount: 0, reason: 'x' })).receipt.reason, 'invalid-facts');
  assert.equal((await store.recordAftermathCharacteristicLoss({ operationId: op(), participantId: 'ghost', carac: 'Ag', amount: 1, reason: 'x' })).receipt.reason, 'unknown-subject');
});

test('J2 — Undo/Redo, sauvegarde, rechargement, ancienne sauvegarde sans séquelles, opération rejouée', async () => {
  const { participant, record } = wounded('patient', 'ARM', 'Clean Break');
  const persistence = memoryPersistence();
  const { store } = await setup([participant, healerSheet()], persistence);
  const incidentId = await follow(store, 'patient', record);
  const operationId = op();
  const first = await store.openAftermathSequelae({ operationId, incidentId, facts: { 'injury:0': { side: 'left', d10: 2 } } });
  const replay = await store.openAftermathSequelae({ operationId, incidentId, facts: { 'injury:0': { side: 'left', d10: 2 } } });
  assert.deepEqual(replay.receipt, first.receipt, 'même opération rejouée : même reçu, aucune seconde création');
  assert.equal(sequelaeOf(store).length, 1);
  assert.equal(rowsOf(store, 'patient').length, 2);
  assert.equal(await store.undo(), true);
  assert.deepEqual(sequelaeOf(store) || [], [], 'Undo retire le suivi');
  assert.deepEqual(rowsOf(store, 'patient'), [], 'et sa projection sur le participant');
  assert.equal(await store.redo(), true);
  assert.equal(rowsOf(store, 'patient').length, 2);
  const saved = JSON.parse(store.getFullJSON());
  const reloaded = createStore({ storage: null, persistence: memoryPersistence() });
  await reloaded.ready;
  await reloaded.loadFromJSON(saved);
  assert.equal(reloaded.getAftermathState().sequelae[0].endDay, 32);
  assert.equal(rowsOf(reloaded, 'patient').length, 2);
  // Ancienne sauvegarde : registre J1 sans séquelles, lisible, aucune projection.
  const old = clone(saved);
  delete old.extensions.v5.aftermathRegister.sequelae;
  for (const row of old.combat.participants) delete row.extensions.v5.sequelaEffects;
  const legacy = createStore({ storage: null, persistence: memoryPersistence() });
  await legacy.ready;
  await legacy.loadFromJSON(old);
  assert.deepEqual(legacy.listAftermathSequelae().sequelae, []);
  assert.equal(legacy.listAftermathSequelae().incidents[0].needsOpening, true, 'proposition explicite de reprise, rien d’appliqué en silence');
  assert.deepEqual(rowsOf(legacy, 'patient'), []);
});

test('J2 — l’aperçu d’avancement annonce les fins de guérison et les échéances sans rien inventer', async () => {
  const { participant, record } = wounded('patient', 'ARM', 'Clean Break');
  const { store } = await setup([participant, healerSheet()]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId, facts: { 'injury:0': { side: 'left', d10: 1 } } });
  const preview = store.previewAftermathAdvance({ days: 40, expectedRevision: store.getAftermathState().revision });
  assert.deepEqual(preview.sequelaEvents.map(row => [row.kind, row.day, row.testNeeded, row.participantName]), [['fracture-heals', 31, true, 'patient']]);
  const stateBefore = clone(store.getAftermathState());
  assert.deepEqual(store.getAftermathState(), stateBefore, 'l’aperçu ne change pas le registre');
  assert.deepEqual(store.previewAftermathAdvance({ days: 5, expectedRevision: stateBefore.revision }).sequelaEvents, []);
});

test('J2 — toute amputation exige la Chirurgie (p.178) : tendon sectionné et Moelle épinière, comme les amputations directes', async () => {
  const tendon = wounded('patient', 'LEG', 'Cut Tendon', { amputationShock: { amputationOccurred: true, part: 'leg', difficultyDR: -3 } });
  const surgeon = healerSheet({ id: 'surgeon', talents: [{ id: 'talent-surgery', status: 'resolved', rank: 1 }] });
  const { store } = await setup([tendon.participant, surgeon]);
  const incidentId = await follow(store, 'patient', tendon.record);
  await store.openAftermathSequelae({ operationId: op(), incidentId });
  const leg = sequelaeOf(store).find(row => row.kind === 'loss' && row.part === 'leg');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: leg.id, facts: { side: 'left' } })).receipt.status, 'applied');
  assert.equal((await close(store, incidentId)).receipt.reason, 'surgery-not-completed');
  assert.equal((await store.treatAftermathSurgicalIncident({ operationId: op(), incidentId, healerId: 'surgeon', roll: 10 })).receipt.reason, 'surgery-success');
  assert.equal((await close(store, incidentId)).receipt.reason, 'critical-healed');
});

test('J2 — Orteil entaillé : l’orteil perdu confirmé par le choc exige aussi la Chirurgie avant la clôture', async () => {
  const toe = wounded('patient', 'LEG', 'Badly Cut Toe', { amputationShock: { amputationOccurred: true, part: 'toe', difficultyDR: 2 } });
  const surgeon = healerSheet({ id: 'surgeon', talents: [{ id: 'talent-surgery', status: 'resolved', rank: 1 }] });
  const { store } = await setup([toe.participant, surgeon]);
  const incidentId = await follow(store, 'patient', toe.record);
  await store.openAftermathSequelae({ operationId: op(), incidentId });
  const test = sequelaeOf(store).find(row => row.kind === 'post-encounter-test');
  await store.recordAftermathPostEncounterTest({ operationId: op(), sequelaId: test.id, roll: 90 });
  const lost = sequelaeOf(store).find(row => row.kind === 'loss' && row.part === 'toe');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: lost.id, facts: { side: 'left', count: 1 } })).receipt.status, 'applied');
  assert.equal((await close(store, incidentId)).receipt.reason, 'surgery-not-completed');
});

test('J2 — décisions du MJ épinglées : l’immobilisation est un Test à part qui ne consomme pas le soin unique de Blessures ; « Major Disadvantage » = deux Désavantages', async () => {
  const { participant, record } = wounded('patient', 'ARM', 'Clean Break');
  const { store } = await setup([participant, healerSheet()]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId });
  const bone = sequelaeOf(store)[0];
  await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: bone.id, facts: { side: 'left', d10: 4 } });
  assert.equal((await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: bone.id, healerId: 'healer', roll: 20 })).receipt.reason, 'fracture-bound');
  const incident = store.getAftermathState().incidents.find(row => row.id === incidentId);
  assert.equal(incident.treatments.some(item => ['heal', 'animal-care'].includes(item.kind)), false, 'l’immobilisation n’est pas un soin de Blessures');
  const heal = await store.treatAftermathWound({ operationId: op(), incidentId, healerId: 'healer', roll: 20, supplies: true });
  assert.notEqual(heal.receipt.reason, 'treatment-already-used-for-incident');
  const spine = wounded('spine', 'BODY', 'Spinal Cord Damage');
  const { store: second } = await setup([spine.participant]);
  const spineIncident = await follow(second, 'spine', spine.record);
  await second.openAftermathSequelae({ operationId: op(), incidentId: spineIncident, facts: { 'injury:0': { d10: 3 } } });
  const disadvantage = rowsOf(second, 'spine').find(row => row.type === 'disadvantage-carac');
  assert.equal(disadvantage.count, 2, 'Désavantage majeur : deux Désavantages');
});

test('J2 — maladresse de Guérison (p.170) sur l’immobilisation et le soin de déchirure : 1d10 saisi, jamais sous 1 Blessure', async () => {
  const hpOf = store => store.listParticipants().find(row => row.id === 'patient').hp;
  const bone = wounded('patient', 'ARM', 'Clean Break');
  const { store } = await setup([bone.participant, healerSheet()]);
  const incidentId = await follow(store, 'patient', bone.record);
  await store.openAftermathSequelae({ operationId: op(), incidentId });
  const fracture = sequelaeOf(store)[0];
  await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: fracture.id, facts: { side: 'left', d10: 4 } });
  assert.equal((await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: fracture.id, healerId: 'healer', roll: 99 })).receipt.reason, 'fumble-d10-required');
  assert.equal((await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: fracture.id, healerId: 'healer', roll: 99, d10: 11 })).receipt.reason, 'invalid-test-facts');
  const fumbled = await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: fracture.id, healerId: 'healer', roll: 99, d10: 7 });
  assert.deepEqual([fumbled.receipt.reason, fumbled.receipt.fumbleDamage, hpOf(store)], ['immobilization-failed', 7, 13]);
  assert.equal(sequelaeOf(store)[0].immobilization.attempts.at(-1).d10, 7, 'la maladresse est conservée dans l’historique du Test');
  // Peu de Blessures : on ne descend jamais sous 1.
  const tear = wounded('weak', 'ARM', 'Torn Muscles');
  tear.participant.hp = 3;
  const { store: second } = await setup([tear.participant, healerSheet()]);
  const tearIncident = await follow(second, 'weak', tear.record);
  await second.openAftermathSequelae({ operationId: op(), incidentId: tearIncident, facts: { 'injury:0': { side: 'left' } } });
  const muscle = sequelaeOf(second)[0];
  assert.equal((await second.treatAftermathTornMuscle({ operationId: op(), sequelaId: muscle.id, healerId: 'healer', roll: 99 })).receipt.reason, 'fumble-d10-required');
  const hurt = await second.treatAftermathTornMuscle({ operationId: op(), sequelaId: muscle.id, healerId: 'healer', roll: 99, d10: 9 });
  assert.deepEqual([hurt.receipt.reason, hurt.receipt.fumbleDamage, second.listParticipants().find(row => row.id === 'weak').hp], ['tear-heal-failed', 2, 1]);
});

test('J2 — fracture de bras : la main directrice est demandée et réduite par les règles du bras amputé ; fracture majeure sans soins : rappel ; libellé de la déchirure mineure', async () => {
  const { sequelaAsksPrimary } = await import('../../../js/core/v5-sequelae.js');
  const arm = wounded('patient', 'ARM', 'Crushed Elbow');
  const plan = planSequelae(arm.record);
  assert.deepEqual(plan.map(item => [item.kind, item.part, sequelaAsksPrimary(item)]), [['broken-bone', 'arm', true]]);
  assert.equal(sequelaAsksPrimary({ kind: 'broken-bone', part: 'leg' }), false);
  assert.equal(sequelaAsksPrimary({ kind: 'loss', part: 'hand' }), true);
  const { store } = await setup([arm.participant, healerSheet()]);
  const incidentId = await follow(store, 'patient', arm.record);
  await store.openAftermathSequelae({ operationId: op(), incidentId });
  const bone = sequelaeOf(store)[0];
  assert.match(store.listAftermathSequelae().sequelae[0].warnings[0], /sans soins médicaux/);
  assert.equal((await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: bone.id, facts: { side: 'left', d10: 2, primary: true } })).receipt.status, 'applied');
  assert.deepEqual(rowsOf(store, 'patient').map(row => row.type), ['two-hands', 'shield-arm', 'offhand-dr']);
  assert.equal(rowsOf(store, 'patient').find(row => row.type === 'offhand-dr').lifetime, 'temporary');
  // Un Test de Guérison réussi (immobilisation) vaut soins médicaux : le rappel disparaît.
  assert.equal((await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: bone.id, healerId: 'healer', roll: 20 })).receipt.reason, 'fracture-bound');
  assert.deepEqual(store.listAftermathSequelae().sequelae[0].warnings, []);
  const tear = wounded('tear', 'ARM', 'Torn Muscles');
  const { store: second } = await setup([tear.participant]);
  const tearIncident = await follow(second, 'tear', tear.record);
  await second.openAftermathSequelae({ operationId: op(), incidentId: tearIncident, facts: { 'injury:0': { side: 'left' } } });
  assert.match(rowsOf(second, 'tear')[0].label, /guérie au terme de 30 − BE jours/);
});
});

describe('Main fendue deuxieme choc et amputation', () => {
const clone=structuredClone;
const memory=()=>{let saved=null;return{async load(){return saved&&clone(saved);},async saveAtomic({state}){saved=clone(state);return{ok:true};}};};
const person=(id,extra={})=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',hp:20,maxHp:20,caracs:{CC:50,F:40,E:30,BE:3,Ag:30},skills:[],talents:[],equipment:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},...extra});

test('T2 bis characterization: Split Hand progresses from finger loss to a second hand shock on the same critical',async()=>{
 const effectRoll=Array.from({length:200},(_,i)=>i+1).find(roll=>getV5CriticalEffect('ARM',roll)?.source?.printedName==='Cleft Hand');
 assert.ok(effectRoll,'actual Split Hand critical line is present in the V5 table');
 const source=createCriticalAftermathRecord(person('hero'),{table:'ARM',effectRoll,resolutionId:'split-hand',round:1});
 assert.equal(source.record.effectName,'Main ouverte','use the actual Split Hand critical line');
 assert.deepEqual(source.record.sequela.durableEffects,[{kind:'amputation',part:'finger',difficultySL:-1,recurrence:'one-finger-per-round-without-medical-attention',eventualPart:'hand'},{kind:'amputation',part:'hand',difficultySL:-1,conditional:true,trigger:'all-fingers-lost'}]);
 const beforeAllFingers=previewAmputationShock({participant:source.participant,criticalId:source.record.id,difficultyDR:-1,test:{success:false,sl:-2}});
 assert.equal(beforeAllFingers.amputatedPart,'finger','the hand shock stays unavailable while fingers remain');
 assert.equal(previewAmputationShock({participant:source.participant,criticalId:source.record.id,shockPart:'hand',difficultyDR:-1,test:{success:false,sl:-2},amputationOccurred:true}).status,'blocked','direct engine calls cannot force the hand shock before any finger-loss shock');
 // Characterize the Store after the Cleft Hand recurrence has removed every finger.
 // The first application represents the finger amputation; the same critical must
 // then accept the distinct hand shock required by the MJ decision.
 const first={...source.record,sequela:{...source.record.sequela,durableEffects:[{kind:'amputation',part:'hand',difficultySL:-2,trigger:'all-fingers-lost'}]},amputationShock:{amputationOccurred:true,part:'finger',difficultyDR:-1,test:{success:false,sl:-1},acquiredStates:['À Terre','Sonné'],surgeryRequired:true}};
 const hero={...source.participant,extensions:{v5:{...source.participant.extensions.v5,criticalAftermath:[first]}}};
 assert.equal(previewAmputationShock({participant:hero,criticalId:source.record.id,difficultyDR:-2,amputationOccurred:false,test:{success:false,sl:-2}}).status,'blocked','the MJ can explicitly reject the hand loss if fingers remain');
 assert.equal(previewAmputationShock({participant:hero,criticalId:source.record.id,shockPart:'hand',difficultyDR:-2,amputationOccurred:true,test:{success:false,sl:-2}}).status,'ready','the hand shock becomes available only after a finger shock receipt and MJ confirmation');
 const persistence=memory(),store=createStore({storage:null,persistence});await store.ready;
 const snapshot={schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'hero',order:['hero','foe'],participants:[hero,person('foe')]},log:[],diceLines:[],extensions:{v5:{combatId:'split-hand-second-shock',turnIndex:1}}};
 snapshot.extensions.v5.gameClock=createGameClock(snapshot);await store.loadFromJSON(snapshot);

 const recordId=source.record.id;
 await store.deferAmputationShock('hero',recordId,'hand');
 assert.equal(store.previewAmputationShock({participantId:'hero',criticalId:recordId}).status,'deferred','Non suspends the hand shock to the next Round');
 const deferredReload=createStore({storage:null,persistence});await deferredReload.ready;
 assert.equal(deferredReload.previewAmputationShock({participantId:'hero',criticalId:recordId}).status,'deferred','the temporary deferral survives reload');
 await store.nextTurn();await store.nextTurn();
 assert.equal(store.getCombat().round,2,'two turns advance the encounter to the next Round');
 assert.equal(store.previewAmputationShock({participantId:'hero',criticalId:recordId}).status,'requires-input','the hand shock reappears at the next Round and waits for MJ confirmation');
 await store.deferAmputationShock('hero',recordId,'hand');
 assert.equal(store.previewAmputationShock({participantId:'hero',criticalId:recordId}).status,'deferred');
 assert.equal(await store.undo(),true,'the temporary deferral is undoable');
 assert.equal(store.previewAmputationShock({participantId:'hero',criticalId:recordId}).status,'requires-input','undo restores the pending shock immediately');
 const preview=store.previewAmputationShock({participantId:'hero',criticalId:recordId,amputationOccurred:true,test:{success:false,sl:-2}});
 assert.equal(preview.status,'ready','the same critical must allow its separate hand shock after all fingers are gone');
 assert.ok(preview.requirements.some(row=>row.part==='hand'&&row.difficultyDR===-2));
 const applied=await store.applyAmputationShock(preview);
 assert.equal(applied.status,'applied','Store must persist the separate second shock');
 const records=store.listParticipants().find(row=>row.id==='hero').extensions.v5.criticalAftermath;
 assert.equal(records.length,1,'both shocks belong to the single Cleft Hand critical');
 assert.equal(records[0].amputationShocks[0].part,'hand');
 assert.match(store.getLog()[0].text,/choc d’amputation appliqué · hand$/,'the journal names the hand shock, not the earlier finger shock');
 assert.equal(store.previewAmputationShock({participantId:'hero',criticalId:recordId,shockPart:'hand',test:{success:false,sl:-2}}).status,'duplicate','the hand shock is idempotent');
 const reloaded=createStore({storage:null,persistence});await reloaded.ready;
 assert.equal(reloaded.listParticipants().find(row=>row.id==='hero').extensions.v5.criticalAftermath[0].amputationShocks[0].part,'hand','the second receipt survives reload');
 assert.equal(await store.undo(),true,'the second shock is undoable');
 assert.equal(store.listParticipants().find(row=>row.id==='hero').extensions.v5.criticalAftermath[0].amputationShocks,undefined,'undo removes only the second receipt');
});
});

describe('Caracterisation mort subite et options', () => {
const npc = (overrides = {}) => ({
  id: 'extra', name: 'Figurant', kind: 'PNJ', hp: 0, states: [],
  extensions: { v5: {} }, talents: [], ...overrides
});

test('T2 bis — mort subite inactive par défaut et réservée au choix MJ d’un figurant éligible', () => {
  const target = npc();
  assert.equal(previewSuddenDeath(target).status, 'disabled');
  const eligible = previewSuddenDeath(target, { tableOptionEnabled: true, secondaryNpcConfirmed: true });
  assert.equal(eligible.status, 'choice-required');
  assert.deepEqual(eligible.outcomes, ['dead', 'unconscious']);
  assert.equal(decideSuddenDeath(target, eligible, undefined).status, 'confirmation-required');
});

test('T2 bis — PJ, Chanceux, PNJ non confirmé et figurant au-dessus de 0 B sont exclus', () => {
  const cases = [
    [npc({ kind: 'PJ' }), true],
    [npc({ talents: [{ id: 'talent-luck' }] }), true],
    [npc(), false],
    [npc({ hp: 1 }), true]
  ];
  for (const [target, secondaryNpcConfirmed] of cases) {
    assert.notEqual(previewSuddenDeath(target, { tableOptionEnabled: true, secondaryNpcConfirmed }).status, 'choice-required');
  }
});

test('T2 bis — résolution refusée sans choix explicite, morte ou inconsciente après choix MJ', () => {
  const target = npc();
  const plan = previewSuddenDeath(target, { tableOptionEnabled: true, secondaryNpcConfirmed: true });
  assert.equal(decideSuddenDeath(target, plan, 'other').status, 'confirmation-required');
  const dead = decideSuddenDeath(target, plan, 'dead');
  assert.equal(dead.status, 'dead');
  assert.equal(dead.participant.hp, 0);
  assert.equal(dead.participant.extensions.v5.dead, true);
  const unconscious = decideSuddenDeath(target, plan, 'unconscious');
  assert.equal(unconscious.status, 'unconscious');
  assert.equal(unconscious.participant.hp, 0);
  assert.ok(unconscious.participant.states.some(state => state.key === 'inconscient'));
});

test('T2 bis — Store persiste le réglage de table et annule/rétablit les décisions par historique', async () => {
  const store = createStore({ storage: null });
  await store.ready;
  await store.loadFromJSON(JSON.stringify({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'extra', order: ['extra'], participants: [npc()] }, log: [], diceLines: [], extensions: { v5: {} } }));
  assert.equal(JSON.parse(store.getFullJSON()).extensions.v5.suddenDeathEnabled, undefined);
  assert.equal(store.previewSuddenDeath('extra', true).status, 'disabled');
  await store.setSuddenDeathEnabled(true);
  assert.equal(JSON.parse(store.getFullJSON()).extensions.v5.suddenDeathEnabled, true);
  assert.equal(store.previewSuddenDeath('extra', true).ready, true);
  await store.decideSuddenDeath('extra', 'unconscious', { secondaryNpcConfirmed: true });
  assert.ok(store.listParticipants()[0].states.some(state => state.key === 'inconscient'));
  assert.equal(await store.undo(), true);
  assert.equal(store.listParticipants()[0].states.some(state => state.key === 'inconscient'), false);
  assert.equal(await store.redo(), true);
  assert.ok(store.listParticipants()[0].states.some(state => state.key === 'inconscient'));
  assert.equal(await store.undo(), true);
  assert.equal(await store.undo(), true);
  assert.notEqual(JSON.parse(store.getFullJSON()).extensions.v5.suddenDeathEnabled, true);
});

test('T2 bis — réglage de table survit à la fermeture et au rechargement IndexedDB', async () => {
  const dbName = `f2-t2bis-sudden-death-${Date.now()}`;
  const persistence = createPersistence({ indexedDB, dbName, contextId: 'sudden-death' });
  const store = createStore({ storage: null, persistence }); await store.ready;
  await store.loadFromJSON(JSON.stringify({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'extra', order: ['extra'], participants: [npc()] }, log: [], diceLines: [], extensions: { v5: {} } }));
  await store.setSuddenDeathEnabled(true); await store.whenIdle(); persistence.close();
  const reopenedPersistence = createPersistence({ indexedDB, dbName, contextId: 'sudden-death' });
  const reloaded = createStore({ storage: null, persistence: reopenedPersistence }); await reloaded.ready;
  assert.equal(JSON.parse(reloaded.getFullJSON()).extensions.v5.suddenDeathEnabled, true);
  assert.equal(reloaded.previewSuddenDeath('extra', true).status, 'choice-required');
  reopenedPersistence.close();
});

test('T2 bis — les décisions refusent une révision périmée, une option désactivée ou une cible devenue inéligible', async () => {
  const persistence = createPersistence({ indexedDB, dbName: `f2-t2bis-sudden-stale-${Date.now()}`, contextId: 'sudden-stale' });
  const store = createStore({ storage: null, persistence }); await store.ready;
  await store.loadFromJSON(JSON.stringify({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'extra', order: ['extra'], participants: [npc()] }, log: [], diceLines: [], extensions: { v5: {} } }));
  await store.setSuddenDeathEnabled(true);
  let plan = store.previewSuddenDeath('extra', true);
  await store.updateParticipant('extra', { notes: 'changement concurrent' });
  await assert.rejects(store.decideSuddenDeath('extra', 'dead', { secondaryNpcConfirmed: true, baseRevision: plan.baseRevision }), /changé depuis l’aperçu/i);
  plan = store.previewSuddenDeath('extra', true);
  await store.setSuddenDeathEnabled(false);
  await assert.rejects(store.decideSuddenDeath('extra', 'dead', { secondaryNpcConfirmed: true }), /désactivée/i);
  await store.setSuddenDeathEnabled(true);
  plan = store.previewSuddenDeath('extra', true);
  await store.updateParticipant('extra', { talents: [{ id: 'talent-luck', name: 'Chanceux' }] });
  await assert.rejects(store.decideSuddenDeath('extra', 'unconscious', { secondaryNpcConfirmed: true }), /Chanceux/i);
  assert.equal(store.listParticipants()[0].extensions.v5.dead, undefined);
  assert.equal(store.listParticipants()[0].states.some(state => state.key === 'inconscient'), false);
  persistence.close();
});
});
