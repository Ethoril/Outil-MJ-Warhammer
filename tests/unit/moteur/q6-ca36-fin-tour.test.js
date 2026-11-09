import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomVortexStep, roundSpellEffects, spellTestContext } from '../../../js/core/v5-magic-turn.js';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';

const person = (id, extra = {}) => ({ id, name: id, camp: 'allie', hp: 12, maxHp: 12,
  caracs: { FM: 40 }, skills: [], talents: [], states: [], extensions: { v5: {} }, ...extra });
const effect = id => ({ id, spellId: 'sp', spellName: id, casterId: 'c', appliedAtRound: 1,
  roundEffect: { phase: 'endOfRound', test: { skill: 'Calme', stat: 'FM', modifierSl: -1 } } });

test('identité Obstiné : deux copies d’une même fiche partagent leur identité', async () => {
  const store=createStore({storage:null});await store.ready;
  const a=person('a',{ficheSnapshot:{charId:'fiche-1'}}),b=person('b',{ficheSnapshot:{charId:'fiche-1'}}),c=person('c',{ficheSnapshot:{charId:'fiche-2'}});
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:0,currentActorId:null,order:[],participants:[a,b,c]},extensions:{v5:{}}});
  assert.equal(store.getObstinateIdentity('a'),store.getObstinateIdentity('b'));
  assert.notEqual(store.getObstinateIdentity('a'),store.getObstinateIdentity('c'));
});

test('fin de Tour : chaque Test a son choix Obstiné propre, proposé avec son dé et lu par le calcul', () => {
  const target = person('t', { states: [{ id: 's', key: 'sonne', name: 'Sonné', level: 1 }],
    talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }],
    extensions: { v5: { spellEffects: [effect('a'), effect('b')] } } });
  const participants = [person('c'), target];
  const pending = roundSpellEffects(participants, 'endOfRound', 2, {});
  assert.deepEqual(pending.requests.map(row => [row.field, row.testTalentField]), [
    ['spell:a:roundTest', 'spell:a:roundTest:preRollTalent'],
    ['spell:b:roundTest', 'spell:b:roundTest:preRollTalent']
  ]);
  const out = roundSpellEffects(participants, 'endOfRound', 2, { t: {
    'spell:a:roundTest': 35, 'spell:a:roundTest:preRollTalent': 'strong-minded',
    'spell:b:roundTest': 35
  } });
  assert.match(out.logs.find(row => row.text.startsWith('a —')).text, /Calme 1 DR, réussi/);
  assert.match(out.logs.find(row => row.text.startsWith('b —')).text, /Calme -1 DR, raté/);
  assert.deepEqual(spellTestContext({ 'x:preRollTalent': 'strong-minded', 'y:preRollTalent': 'none' }, name => 'x:' + name), { preRollTalent: 'strong-minded' });
});

test('fin de Tour : usage atomique du Test réellement exécuté et annulation', async () => {
  const store = createStore({ storage: null }); await store.ready;
  const caster = person('c', { zone:'active', initiative: 10 });
  const target = person('t', { zone:'active', initiative: 20, talents: [{id:'talent-strong-minded',status:'resolved',rank:1}],
    states: [{id:'s',key:'sonne',name:'Sonné',level:1}], extensions:{v5:{spellEffects:[{...effect('a'),roundEffect:{...effect('a').roundEffect,phase:'endOfTurn'}}]}} });
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'t',order:['t','c'],orderMode:'manual',participants:[target,caster]},extensions:{v5:{}}});
  await store.startTalentSession();
  const engine=createCombatEngine(store), options={inputs:{t:{'spell:a:roundTest':35,'spell:a:roundTest:preRollTalent':'strong-minded'}}};
  assert.equal(engine.previewNextTurn(options).ready,true);
  assert.equal(store.getObstinateStatus('t').available,true);
  assert.equal((await engine.nextTurn(options)).status,'applied');
  assert.equal(store.getObstinateStatus('t').available,false);
  await store.undo();
  assert.equal(store.getObstinateStatus('t').available,true);
});

test('fin de Tour : deux Tests différents avec Obstiné sont refusés sans rien consommer', async () => {
  const store=createStore({storage:null});await store.ready;
  const target=person('t',{zone:'active',initiative:20,talents:[{id:'talent-strong-minded',status:'resolved',rank:1}],extensions:{v5:{spellEffects:['a','b'].map(id=>({...effect(id),roundEffect:{...effect(id).roundEffect,phase:'endOfTurn'}}))}}});
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'t',order:['t','c'],orderMode:'manual',participants:[target,person('c',{zone:'active',initiative:10})]},extensions:{v5:{}}});
  await store.startTalentSession();const engine=createCombatEngine(store);
  const inputs={t:Object.fromEntries(['a','b'].flatMap(id=>[[`spell:${id}:roundTest`,35],[`spell:${id}:roundTest:preRollTalent`,'strong-minded']]))};
  assert.equal(engine.previewNextTurn({inputs}).ready,true);
  await assert.rejects(async()=>engine.nextTurn({inputs}),/déjà utilisé/);
  assert.equal(store.getObstinateStatus('t').available,true);
});

test('vortex : seul le Calme réellement exécuté consomme le quota et undo le rend', async () => {
  const store=createStore({storage:null});await store.ready;
  const vortex={id:'v',spellId:'sp',spellName:'Vortex',casterId:'c',castExecutionId:'vx',appliedAtRound:1,expiresAtRound:9,
    roundEffect:{phase:'endOfCasterTurn',vortex:{damage:0,ignoreAp:true,sun:true}}};
  const caster=person('c',{zone:'active',initiative:20,caracs:{FM:40,E:40},extensions:{v5:{spellEffects:[vortex]}}});
  const target=person('t',{zone:'active',initiative:10,caracs:{FM:40,E:40},talents:[{id:'talent-strong-minded',status:'resolved',rank:1}]});
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:2,currentActorId:'c',order:['c','t'],orderMode:'manual',participants:[caster,target]},extensions:{v5:{}}});
  await store.startTalentSession();const engine=createCombatEngine(store),prefix='spell:v:vortex:';
  const options={inputs:{c:{[prefix+'Direction']:2,[prefix+'Distance']:4,[prefix+'Targets']:['t']},t:{[prefix+'SunTouched']:true,[prefix+'Calm']:35,[prefix+'Calm:preRollTalent']:'strong-minded'}}};
  const preview=engine.previewNextTurn(options);assert.equal(preview.ready,true,JSON.stringify(preview.requests));
  assert.equal((await engine.nextTurn(options)).status,'applied');assert.equal(store.getObstinateStatus('t').available,false);
  await store.undo();assert.equal(store.getObstinateStatus('t').available,true);
  const unused=randomVortexStep([caster,target],caster,vortex,{round:2,initial:{direction:'N',distance:4,targets:['t']},inputs:{t:{SunTouched:false,Calm:35,'Calm:preRollTalent':'strong-minded',ProtectionCalm:25,'ProtectionCalm:preRollTalent':'strong-minded'}}});
  assert.equal(unused.ready,true);assert.deepEqual(unused.performedTests,[], 'une ancienne saisie ne suffit pas à consommer');
});

test('Comète : un même guidage partagé entre deux cibles consomme une seule fois', async () => {
  const store=createStore({storage:null});await store.ready;
  const caster=person('c',{zone:'active',initiative:30,caracs:{FM:40,CT:40},talents:[{id:'talent-strong-minded',status:'resolved',rank:1}]});
  const guided=id=>person(id,{zone:'active',initiative:10,extensions:{v5:{spellEffects:[{id:'g-'+id,spellId:'comet',spellName:'Comète',casterId:'c',castExecutionId:'x',appliedAtRound:0,expiresAtRound:9,roundEffect:{phase:'endOfRound',guidance:true}}]}}});
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'u',order:['c','t','u'],orderMode:'manual',participants:[caster,guided('t'),guided('u')]},extensions:{v5:{}}});
  await store.startTalentSession();const engine=createCombatEngine(store),inputs={c:{'spell:x:guide:astronomy':false,'spell:x:guide:guidance':15,'spell:x:guide:guidance:preRollTalent':'strong-minded'}};
  const preview=engine.previewNextTurn({inputs});assert.equal(preview.ready,true,JSON.stringify(preview.requests));
  assert.equal(preview.performedTests.length,1,'les deux cibles partagent le même Test de guidage');
  assert.equal((await engine.nextTurn({inputs})).status,'applied');assert.equal(store.getObstinateStatus('c').available,false);
  await store.undo();assert.equal(store.getObstinateStatus('c').available,true);
  const unconscious={...caster,states:[{id:'i',key:'inconscient',name:'Inconscient',level:1}]};
  const automatic=roundSpellEffects([unconscious,guided('t')],'endOfRound',2,inputs);
  assert.deepEqual(automatic.performedTests,[],'un guidage raté d’office ne consomme pas un choix précédemment saisi');
});

test('mini-vortex : les Calme des frappes distinctes restent des Tests distincts', () => {
  const caster=person('c',{caracs:{FM:40,E:40}}),target=person('t',{caracs:{FM:40,E:40},extensions:{v5:{damageReductions:[{amount:1,filter:null,calmTest:true}]}}});
  const effect={id:'v',spellId:'v',spellName:'Vortex',casterId:'c',castExecutionId:'vx',appliedAtRound:1,expiresAtRound:9,roundEffect:{vortex:{damage:3,ignoreAp:true,miniCount:1}}};
  const out=randomVortexStep([caster,target],caster,effect,{round:2,initial:{direction:'N',distance:4,targets:['t']},inputs:{c:{mini1Direction:5,mini1Targets:['t']},t:{ProtectionCalm:25,'ProtectionCalm:preRollTalent':'strong-minded',mini1Location:35,mini1ProtectionCalm:25,'mini1ProtectionCalm:preRollTalent':'strong-minded'}}});
  assert.equal(out.ready,true,JSON.stringify(out.requests));
  assert.deepEqual(out.performedTests.map(row=>row.testKey),['ProtectionCalm:','mini1ProtectionCalm:']);
});

test('Thorsen : la collision demande son propre Calme et compte le choix Obstiné', () => {
  const caster=person('c',{caracs:{FM:40,E:40}}),target=person('t',{caracs:{FM:40,E:40},states:[{id:'s',key:'sonne',name:'Sonné',level:1}],talents:[{id:'talent-strong-minded',status:'resolved',rank:1}],extensions:{v5:{damageReductions:[{amount:1,filter:{any:['crush']},calmTest:true}]}}});
  const effect={id:'v',spellName:'Orage',roundEffect:{vortex:{damage:0,ignoreAp:true,throw:true}}};
  const inputs={t:{locationRoll:35,throwDirection:4,collision:true}};
  const run=()=>randomVortexStep([caster,target],caster,effect,{round:2,initial:{direction:'N',distance:4,targets:['t']},inputs});
  assert.equal(run().requests[0].field,'CollisionProtectionCalm');
  inputs.t.CollisionProtectionCalm=35;inputs.t['CollisionProtectionCalm:preRollTalent']='strong-minded';
  const resolved=run();assert.equal(resolved.ready,true,JSON.stringify(resolved.requests));
  assert.deepEqual(resolved.performedTests.map(row=>row.testKey),['CollisionProtectionCalm:']);
});

test('Thorsen : collision et Protections de nature propre, avec un ou plusieurs d10', () => {
  const caster=person('c',{caracs:{FM:40,E:40}});
  const layers=[{threshold:7,filter:{any:['crush']},casterId:'l',lileathRank:1},{threshold:8,filter:{any:['crush']},casterId:'l',lileathRank:1}];
  const effect={id:'v',spellName:'Orage',roundEffect:{vortex:{damage:0,ignoreAp:true,throw:true}}};
  for(const [wards,rolls] of [[[layers[0]],7],[layers,[3,8]]]){
    const target=person('t',{caracs:{FM:40,E:40},extensions:{v5:{wards}}});
    const inputs={t:{locationRoll:35,throwDirection:4,collision:true}};
    const run=()=>randomVortexStep([caster,target],caster,effect,{round:2,initial:{direction:'N',distance:4,targets:['t']},inputs});
    assert.equal(run().requests[0].field,'CollisionWard');
    inputs.t.collisionWardRoll=rolls;
    const out=run();assert.equal(out.ready,true,JSON.stringify(out.requests));assert.equal(out.participants.find(row=>row.id==='t').hp,11,'seule la première frappe inflige 1 Blessure');
  }
});
