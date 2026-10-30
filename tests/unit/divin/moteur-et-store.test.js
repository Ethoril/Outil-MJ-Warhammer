import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts, setStoreDivineSin, previewStoreDivine, applyStoreDivine } from '../../../js/core/v5-divine-store.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { buildExpiry, buildDivineForm, emptyDivineForm, setFieldValue, toEngineInput } from '../../../js/ui/v5-divine-form-model.js';
import { previewDivineExecution, applyDivineExecution, expireDivineEffects } from '../../../js/core/v5-divine-engine.js';
import divineRegistry from '../../../js/data/v5-divine-contracts.json' with { type: 'json' };
import DIVINE_REGISTRY from '../../../js/data/v5-divine-contracts.json' with { type: 'json' };
import registry from '../../../js/data/v5-divine-contracts.json' with { type: 'json' };
import { previewResolution } from '../../../js/core/resolution.js';
import { magicSkillModifiers } from '../../../js/core/v5-magic-talents.js';
import { BATTLE, fixture, priest, snap, input, person } from '../../helpers/divin-b5-fixture.mjs';
import * as access from '../../../js/core/v5-divine-access.js';
import { calculateEffectiveMagicAP } from '../../../js/core/v5-magic-effects.js';
import { acquireV5Conditions } from '../../../js/core/v5-effects.js';
import { previewV5Turn } from '../../../js/core/v5-turn.js';
import { ficheSnapshot } from '../../../js/core/fiche-sync.js';
import { locationProtection } from '../../../js/core/equipment.js';
import { effectHandlers } from '../../../js/core/v5-divine-effect-handlers.js';

const clone = value => structuredClone(value);

describe('Sans peur', () => {
// A1 (R8) : le Talent talent-fearless s'affiche « Sans peur [Ennemi] » comme le catalogue des Talents,
// plus « Intrépide » (aucune étiquette ni effet de contrat divin ne contient l'ancien nom).
const registry = JSON.parse(readFileSync('js/data/v5-divine-contracts.json', 'utf8'));
const DEVOTION = 'divine:miracle:devotion-de-la-guerriere';

const actor = (id, initiative, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: ['Myrmidia'].map(specialization => ({ id: 'talent-invoke', status: 'resolved', rank: 1, specialization })),
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture() {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'],
    participants: [actor('priest', 60), actor('ally', 30)] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}

test('aucun contrat divin n’utilise l’ancien nom « Intrépide » (R8)', () => {
  assert.ok(registry.contracts.length > 50, 'contrats chargés');
  for (const contract of registry.contracts) {
    assert.doesNotMatch(JSON.stringify(contract.labels ?? {}), /Intrépide/i, `labels de ${contract.id}`);
    assert.doesNotMatch(JSON.stringify(contract.effects ?? []), /Intrépide/i, `effects de ${contract.id}`);
  }
});

test('Dévotion de la Guerrière : grant-talent talent-fearless étiqueté « Sans peur [Ennemi] »', async () => {
  const contract = getDivineContract(DEVOTION);
  assert.equal(contract.status, 'assisted');
  const effect = contract.effects.find(row => row.type === 'grant-talent');
  assert.equal(effect.specializationFrom, 'input');
  assert.deepEqual(effect.talents.map(row => [row.id, row.name, row.rank]), [['talent-fearless', 'Sans peur', 1]]);
  assert.match(contract.labels.effect, /Sans peur \[Ennemi\]/, 'résumé aligné sur le catalogue des Talents');
  assert.ok(contract.clauses.some(row => row.id === 'fearless-enemy' && /Sans peur \[Ennemi\]/.test(row.text)));

  const store = await fixture();
  const preview = store.previewDivineExecution(DEVOTION, { actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true,
    choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry: { phase: 'endOfTurn', round: 4, actorId: 'priest' },
    facts: { targets: { ally: { ally: true, withinRange: true } } }, talent: { specialization: 'Gobelins' } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  assert.deepEqual(preview.preview.effects[0].talents.map(row => [row.id, row.name, row.specialization]),
    [['talent-fearless', 'Sans peur', 'Gobelin']]);
  const result = await store.applyDivineExecution(DEVOTION, { preview });
  assert.equal(result.ready, true, result.error);
  const ally = store.listParticipants().find(row => row.id === 'ally');
  const granted = (ally.talents || []).filter(row => row.divineEffectId);
  assert.equal(granted.length, 1);
  assert.equal(granted[0].id, 'talent-fearless');
  assert.equal(granted[0].name, 'Sans peur', 'le Talent injecté porte le nom du catalogue');
  assert.equal(granted[0].specialization, 'Gobelin');
});
});

describe('Chance et opposition', () => {
// Bénédiction de Chance (V5 p.221) : une relance gratuite du prochain Test échoué, consommée à l'usage.

const CULTS = ['myrmidia', 'morr', 'ranald', 'verena', 'handrich'];
const contracts = CULTS.map(cult => getAllDivineContracts().find(row => row.id === `divine:blessing:${cult}:fortune`));
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  prayers: [], equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (s, id) => s.listParticipants().find(row => row.id === id);
const input = (more = {}) => ({ actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  facts: { targets: { ally: { withinRange: true, ally: true } } }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest', moment: 'afterEffects' }, ...more });
const id = 'divine:blessing:myrmidia:fortune';
async function fixture({ bless = true, fortune = 3 } = {}) {
  const s = createStore(); await s.ready;
  await s.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'ally', order: ['ally', 'priest', 'enemy'], participants: [actor('priest'), actor('ally', { initiative: 30 }), actor('enemy', { kind: 'PNJ', camp: 'ennemi' })] } });
  await s.setFortune('ally', fortune);
  if (bless) {
    const preview = s.previewDivineExecution(id, input());
    assert.equal(preview.ready, true, preview.error);
    const result = await s.applyDivineExecution(id, { preview });
    assert.equal(result.ready, true, result.error);
  }
  return s;
}

// Arbitrage D4 : la perte du Test oppose ouvre aussi la relance gratuite.
const cases=[
 {name:'reussite propre, opposition perdue',roll:34,defense:80,defRoll:25,winner:'defender',success:true,free:true,balance:3,remaining:0},
 {name:'reussite propre, opposition gagnee',roll:34,defense:20,defRoll:65,winner:'attacker',success:true,free:false,balance:2,remaining:1},
 {name:'echec propre sans opposition',roll:82,success:false,free:true,balance:3,remaining:0},
 {name:'reussite sans opposition',roll:34,success:true,free:false,balance:2,remaining:1},
 {name:'sans benediction, opposition perdue',roll:34,defense:80,defRoll:25,winner:'defender',success:true,bless:false,free:false,balance:2,remaining:0}
];
for(const c of cases)test('A10 D4 : '+c.name,async()=>{
 const s=await fixture({bless:c.bless!==false});const request={resolutionId:'a10',actorId:'ally',targetId:'enemy',roll:c.roll,action:{type:c.defense?'attack':'test',attr:'CC',base:50,damage:5},...(c.defense?{defense:{base:c.defense,roll:c.defRoll,v5:{kind:'melee'}}}:{}),v5:{kind:c.defense?'melee':'test'}};
 const original=s.previewResolution(request);assert.equal(original.success,c.success);if(c.winner)assert.equal(original.opposition.winner,c.winner);
 const p=s.previewResolution({...request,v5:{...request.v5,fortuneReroll:true,fortuneRerollRoll:24}});
 assert.equal(p.fortuneReroll.free===true,c.free);assert.equal((await s.applyResolution(p)).status,'applied');assert.equal(s.getFortune('ally').balance,c.balance);
 assert.equal((person(s,'ally').extensions.v5.divineEffects||[]).reduce((sum,l)=>sum+(l.freeReroll?.remaining||0),0),c.remaining);
 await s.undo();assert.equal(s.getFortune('ally').balance,3);
});
});

describe('caractérisation de l’ordre', () => {
const HOWL='divine:miracle:ulric:howl-of-the-wolf';
const person=(id,initiative)=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',initiative,hp:40,maxHp:40,caracs:{CC:50,CT:40,F:40,E:40,I:50,Ag:50,Dex:50,Int:60,FM:60,Soc:60,M:4},skills:[{name:'Prière',status:'resolved',total:60},{name:'Langue (Magick)',total:200}],talents:[{id:'talent-invoke',status:'resolved',rank:1,specialization:'Ulric'}],prayers:[{name:getDivineContract(HOWL).catalogueName,status:'resolved'}],states:[],equipment:[],traits:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}}});
async function fixture(mode='v5',middle=80){
 let saved;const persistence={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return {ok:true};}};
 const store=createStore({persistence,storage:null});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'A',order:['A','B','C'],participants:[person('A',100),person('B',middle),person('C',1)]},log:[],diceLines:[],extensions:{v5:{turnIndex:1,combatId:'a12'}}});
 const engine=createCombatEngine(store);const next=async()=>{if(mode==='v5'){const p=await engine.nextTurn();assert.equal(p.status,'applied',JSON.stringify(p));}else await store.nextTurn();return `${store.getCombat().round}:${store.getCombat().currentActorId}`;};
 await next();assert.equal(store.getCombat().currentActorId,'B');return {store,next,persistence};
}
async function add(store,kind){
 if(kind==='manual'){await store.addParticipant(person('N',50));return 'N';}
 if(kind==='magic'){
  const input={actorId:'B',targetIds:['B'],roll:22,miscastRoll:15,attributeActive:false,domainFacts:{minutesToDawn:1,sunlight:false}};
  const p=store.previewSpellExecution('Destrier d’Ombre',input);assert.equal(p.ready,true,p.error);await store.applySpellExecution('Destrier d’Ombre',input);
 }else{
  const contract=getDivineContract(HOWL),actor=store.listParticipants().find(p=>p.id==='B');
  const input={actorId:'B',targetIds:[],roll:45,canSpeak:true,choices:{range:0,targets:0,duration:0,effect:0},expiry:buildExpiry({contract,actor,choices:{},round:1,phase:'endOfTurn'})};
  const preview=store.previewDivineExecution(HOWL,input);assert.equal(preview.ready,true,JSON.stringify(preview.needsInput));assert.equal((await store.applyDivineExecution(HOWL,{preview})).ready,true);
 }
 const created=store.listParticipants().find(p=>!['A','B','C'].includes(p.id));assert.ok(created);assert.ok(created.initiative>1&&created.initiative<80);return created.id;
}
for(const mode of ['v5','legacy'])for(const kind of ['manual','magic','divine'])test(`A12 caracterisation : ${kind}, ${mode}`,async()=>{
 const {store,next}=await fixture(mode);const id=await add(store,kind);const seq=[];for(let i=0;i<3;i++)seq.push((await next()).replace(id,'N'));
 // Arbitrage R15 : les trois voies publiques inserent le nouveau participant a son rang.
 assert.deepEqual(seq,['1:N','1:C','2:A']);
});
for(const kind of ['manual','magic','divine'])test(`A12 : rang deja passe attend le prochain Round, ${kind}`,async()=>{
 const {store,next}=await fixture('v5',10);const id=await add(store,kind);const seq=[];for(let i=0;i<4;i++)seq.push((await next()).replace(id,'N'));
 assert.deepEqual(seq,['1:C','2:A','2:N','2:B']);
});
for(const [name,expected] of [['N',['1:N','1:C','2:A']],['Aa',['1:C','2:A','2:Aa']]])test('A12 : egalite Initiative, ordre des noms '+name,async()=>{
 const {store,next}=await fixture();await store.addParticipant(person(name,80));const seq=[];for(let i=0;i<3;i++)seq.push(await next());assert.deepEqual(seq,expected);
});
for(const kind of ['magic','divine'])test('A12 : ordre atomique, Annuler/Retablir et reload, '+kind,async()=>{
 const {store,persistence}=await fixture();const before=store.getCombat().order.slice();const id=await add(store,kind);const after=store.getCombat().order.slice();assert.deepEqual(after,['A','B',id,'C']);
 await store.undo();assert.deepEqual(store.getCombat().order,before);assert.ok(!store.listParticipants().some(p=>p.id===id));
 await store.redo();assert.deepEqual(store.getCombat().order,after);const reloaded=createStore({persistence,storage:null});await reloaded.ready;
 assert.deepEqual(reloaded.getCombat().order,after);assert.equal((await createCombatEngine(reloaded).nextTurn()).status,'applied');assert.equal(reloaded.getCombat().currentActorId,id);
});
});

describe('Dévotion', () => {
const contract=getDivineContract('divine:miracle:devotion-de-la-guerriere');
const person=(id,camp='pj',zone='active')=>({id,name:id,camp,zone,kind:'PJ',hp:20,maxHp:20,states:[],caracs:{Soc:60,FM:50,I:40,M:4},skills:[{name:'Prière',status:'resolved',total:60}],talents:[{id:'talent-invoke',status:'resolved',rank:1,specialization:'Myrmidia'}],prayers:[{name:contract.catalogueName,status:'resolved'}],extensions:{v5:{divine:{sin:0}}}});
test('A4 : les mots-clés des ennemis actifs sont suggérés en premier, la spécialisation se choisit dans le référentiel (plus de saisie libre)',async()=>{
 const withKeywords=(row,keywords)=>({...row,keywords});
 const participants=[person('priest'),person('ally'),withKeywords(person('Brigand','ennemi'),['humain']),withKeywords(person('Orque','ennemi'),['orque']),withKeywords(person('Réserve','ennemi','bench'),['nain'])];
 const actor=participants[0],form=emptyDivineForm();
 const model=buildDivineForm(contract,{actor,participants,targets:[participants[1]],form});
 const select=model.effectFields.find(f=>f.kind==='select'&&f.path.join('.')==='talent.specialization');
 assert.ok(select,'liste du référentiel');
 assert.deepEqual(select.options.slice(0,3),[['','Choisir un mot-clé'],['Humain','Humain (présent)'],['Orque','Orque (présent)']]);
 assert.ok(select.options.some(([value])=>value==='Peaux-vertes'),'le référentiel complet est proposé');
 assert.ok(!select.options.slice(0,3).some(([value])=>value==='Nain'),'un ennemi au banc n’est pas suggéré');
 assert.equal(model.effectFields.some(f=>f.kind==='text'&&f.path.join('.')==='talent.specialization'),false,'aucun champ de texte libre');
 const store=createStore({storage:null,persistence:{async load(){return null;},async saveAtomic(){return {ok:true};}}});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:participants.filter(p=>p.zone==='active').map(p=>p.id),participants},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
 const preview=()=>store.previewDivineExecution(contract.id,{actorId:'priest',targetIds:['ally'],roll:45,canSpeak:true,expiry:{phase:'endOfTurn',round:4,actorId:'priest'},...toEngineInput(form,{targetIds:['ally'],contract,actor}),facts:{targets:{ally:{ally:true,withinRange:true}}}});
 setFieldValue(form,select,'Orque');const chosen=preview();assert.equal(chosen.ready,true,JSON.stringify(chosen.needsInput));
 assert.equal(chosen.preview.effects[0].talents[0].specialization,'Orque');
 setFieldValue(form,select,'Gobelins des collines');const typed=preview();assert.equal(typed.ready,false);assert.match(JSON.stringify(typed.needsInput),/talent\.specialization/);
 setFieldValue(form,select,'peau verte');assert.equal(preview().preview.effects[0].talents[0].specialization,'Peaux-vertes','alias résolu en nom canonique');
});
});

describe('enjeux', () => {
// P5 — Fortune généreuse (Ranald) : les alliés ciblés peuvent inverser les dés de pourcentage à leur PROCHAIN Test (82 devient 28) ;
// faveur perdue si elle n’est pas utilisée dans la durée. Modèle : couche à usage unique, consommée quand l’allié demande l’inversion
// (`v5.reverseDice: true`). Critère d’acceptation écrit avant l’implémentation (doit échouer avant).
const BOUNTIFUL = 'divine:miracle:ranald:up-the-stakes';
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ranald' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ranald' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (s, id) => s.listParticipants().find(row => row.id === id);
async function fixture() {
  const s = createStore(); await s.ready;
  await s.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'enemy'], participants: [actor('priest'), actor('ally', { initiative: 30 }), actor('enemy', { kind: 'PNJ', camp: 'ennemi', initiative: 10 })] } });
  const preview = s.previewDivineExecution(BOUNTIFUL, { actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    facts: { targets: { ally: { withinRange: true, ally: true } } }, expiry: { phase: 'endOfTurn', round: 1, actorId: 'priest' } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await s.applyDivineExecution(BOUNTIFUL, { preview });
  assert.equal(result.ready, true, result.error);
  return { s, result };
}

const nextTest=(s,roll=34,base=50)=>s.previewResolution({actorId:'ally',action:{type:'test',attr:'FM',base},roll,v5:{kind:'test'}});
test('A7 : contrat implemente',()=>assert.equal(getDivineContract(BOUNTIFUL).status,'implemented'));
for(const [roll,base,before,after] of [[34,50,2,6],[61,50,-1,-6],[12,90,8,8]])test('A7 : DR '+before+' devient '+after,async()=>{
 const {s}=await fixture();const preview=nextTest(s,roll,base);assert.equal(preview.sl,after);assert.deepEqual(preview.slExtreme,{before,after});
 assert.equal(person(s,'ally').extensions.v5.divineEffects.find(l=>l.slExtreme)?.slExtreme.remaining,1);
});
test('A7 : consommation unique, application et Annuler',async()=>{
 const {s}=await fixture();const p=nextTest(s);assert.equal((await s.applyResolution(p)).status,'applied');
 assert.equal(nextTest(s).sl,2);assert.equal(nextTest(s).slExtreme,undefined);
 await s.undo();assert.equal(nextTest(s).sl,6);
});
test('A7 : opposition et degats utilisent les DR ajustes',async()=>{
 const {s}=await fixture();const request={actorId:'ally',targetId:'enemy',roll:34,action:{type:'attack',base:50,attr:'CC',damage:5},defense:{base:80,roll:35,v5:{kind:'melee'}},v5:{kind:'melee'}};
 const p=s.previewResolution(request);assert.equal(p.sl,6);assert.equal(p.opposition.attacker.sl,6);assert.equal(p.opposition.winner,'attacker');assert.equal(p.opposition.netSl,1);assert.ok(p.damage.finalDamage>0);
 assert.equal((await s.applyResolution(p)).status,'applied');assert.equal(person(s,'enemy').hp,20-p.damage.finalDamage);
});
test('A7 : sans la couche, aucun changement',async()=>{
 const {s,result}=await fixture();await s.endDivinePrayer(result.receipt.executionId,{reason:'fin'});assert.equal(nextTest(s).sl,2);assert.equal(nextTest(s).slExtreme,undefined);
});
});

describe('Péché et jets — caractérisation Q12', () => {
// Photographie initiale commitée en 6c495fb, attentes migrées sous Q12 explicite.
const contract=registry.contracts.find(row=>row.id==='divine:blessing:myrmidia:battle');
const priest=sin=>({id:'priest',caracs:{Soc:60},skills:[{name:'Prière',status:'resolved',total:60}],
 talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}],extensions:{v5:{divine:{sin}}}});
for(const [sin,roll,reason] of [[0,20,'sin-threshold'],[0,99,'fumble'],[1,21,'sin-threshold'],[1,99,'fumble']]){
 test(`B01 caractérisation Q12 — Péché ${sin}, jet ${roll}`,()=>{
  const actor=priest(sin);
  const result=previewDivineExecution(actor,contract,[actor],{canSpeak:true,roll,
   sourceFingerprint:registry.sourceFingerprint,facts:{targets:{priest:{withinRange:true,ally:true}}}});
  assert.equal(result.status,sin>0?'needs-wrath-resolution':roll===20?'needs-input':'ready');
  assert.equal(result.preview.wrath.triggered,sin>0);
  assert.equal(result.preview.wrath.reason,sin>0?reason:null);
  assert.equal(result.preview.wrath.sinAtTest,sin);
 });
}
});

describe('zéro Péché', () => {
const contract=registry.contracts.find(row=>row.id==='divine:blessing:myrmidia:battle');
const person=sin=>({id:'priest',hp:20,maxHp:20,caracs:{Soc:60,F:30,FM:40,M:4},states:[],
 skills:[{name:'Prière',status:'resolved',total:60}],
 talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}],extensions:{v5:{divine:{sin}}}});
const input=roll=>({actorId:'priest',targetIds:['priest'],canSpeak:true,roll,sourceFingerprint:registry.sourceFingerprint,
 facts:{targets:{priest:{withinRange:true,ally:true}}},expiry:{phase:'endOfRound',round:4},executionId:`b1:${roll}`});

test('B01 Q12 — les cent jets de Prière à zéro Péché ne déclenchent aucune table',()=>{
 const actor=person(0),before=structuredClone(actor);
 for(let roll=1;roll<=100;roll++){
  const result=previewDivineExecution(actor,contract,[actor],input(roll));
  assert.equal(result.preview?.wrath?.triggered,false,`jet ${roll}: ${result.error}`);
  assert.equal(result.preview.wrath.reason,null);
  assert.equal(result.preview.wrath.sinAfter,0);
 }
 assert.deepEqual(actor,before,'aperçus inertes');
});

test('B01 Q12 — une maladresse à zéro est applicable sans table ni décrément',()=>{
 const actor=person(0),state={combat:{round:1,currentActorId:'priest',participants:[actor]},extensions:{v5:{}}};
 const before=structuredClone(state),result=applyDivineExecution(state,contract,input(99));
 assert.equal(result.ready,true,result.error);
 assert.equal(result.receipt.prayer.fumble,true,'le Test reste une maladresse');
 assert.equal(result.receipt.wrathResolution,null);
 assert.equal(result.state.combat.participants[0].extensions.v5.divine.sin,0);
 assert.deepEqual(state,before);
});

test('B01 Q12 — à Péché positif maladresse et seuil conservent leur blocage',()=>{
 for(const roll of [20,21,99]){
  const actor=person(1),result=previewDivineExecution(actor,contract,[actor],input(roll));
  assert.equal(result.status,'needs-wrath-resolution');
  assert.equal(result.preview.wrath.triggered,true);
 }
});

test('B01 Q12 — les lignes 01–10 restent sourcées et explicitement inaccessibles',()=>{
 for(const row of registry.wrathTable.filter(row=>row.min<=10)){
  assert.equal(row.accessibility?.accessible,false);
  assert.equal(row.accessibility?.reason,'inaccessibles (arbitrage Q12)');
  assert.equal(row.source.printedPage,218);
 }
 assert.equal(registry.wrathTable.length,31);
});

async function fixture(){
 let saved=null;
 const persistence={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return {ok:true};}};
 const store=createStore({persistence,storage:null});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest'],participants:[{...person(0),kind:'PJ',camp:'pj',zone:'active'}]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
 return {store,persistence};
}
const snapshot=store=>{const value=JSON.parse(store.getFullJSON());delete value.exportedAt;return value;};

test('B01 Q12 — Store, dés clients ignorés, vrai apply, Undo/Redo et reload',async()=>{
 const {store,persistence}=await fixture(),before=snapshot(store);
 const preview=store.previewDivineExecution(contract.id,{...input(99),wrathRoll:100,wrathConsequences:'Rejet client forgé'});
 assert.equal(preview.ready,true,preview.error);
 assert.equal(preview.preview.wrath.triggered,false);
 assert.equal(preview.wrathTableResult,null);
 assert.deepEqual(snapshot(store),before);
 const applied=await store.applyDivineExecution(contract.id,{preview});
 assert.equal(applied.ok,true,applied.error);assert.equal(applied.receipt.wrathResolution,null);
 const committed=snapshot(store);
 assert.equal(committed.combat.participants[0].extensions.v5.divine.sin,0);
 await assert.rejects(()=>store.applyDivineExecution(contract.id,{preview}),/aperçu|calcul|recalculez|changé/i);
 assert.deepEqual(snapshot(store),committed);
 await store.undo();assert.deepEqual(snapshot(store).combat,before.combat);
 await store.redo();assert.deepEqual(snapshot(store).combat,committed.combat);
 const reloaded=createStore({persistence,storage:null});await reloaded.ready;
 assert.equal(snapshot(reloaded).extensions.v5.divineExecutions.at(-1).wrath.triggered,false);
 assert.deepEqual(snapshot(reloaded).combat,committed.combat);
});

test('B01 Q12 — un aperçu à zéro devenu périmé ne contourne pas un Péché nouveau',async()=>{
 const {store}=await fixture(),preview=store.previewDivineExecution(contract.id,input(99));
 assert.equal(preview.ready,true,preview.error);
 await store.setDivineSin('priest',1,{reason:'Infraction ultérieure'});const before=snapshot(store);
 await assert.rejects(()=>store.applyDivineExecution(contract.id,{preview}),/changé|recalculez|aperçu/i);
 assert.deepEqual(snapshot(store),before);
 assert.equal(store.previewDivineExecution(contract.id,input(99)).status,'needs-wrath-resolution');
});
});

describe('cultes elfes', () => {
const MATH='divine:miracle:mathlann:waterlungs',HUMAN='divine:blessing:myrmidia:battle';
const clone=structuredClone;
const actor=(cult='Mathlann',sin=5)=>({id:'priest',name:'Prêtre',kind:'PJ',camp:'pj',zone:'active',initiative:60,
 hp:20,maxHp:20,caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},
 armor:{head:0,body:0,arms:0,legs:0},states:[],traits:[],equipment:[],
 skills:[{id:'pray',name:'Prière',carac:'Soc',status:'resolved',total:60}],
 talents:[{id:'talent-invoke',status:'resolved',rank:1,specialization:cult},{id:'talent-bless',status:'resolved',rank:1,specialization:cult}],
 prayers:[{name:getDivineContract(MATH).catalogueName,status:'resolved'}],extensions:{v5:{divine:{sin}}}});
const input=extra=>({actorId:'priest',targetIds:['priest'],canSpeak:true,roll:99,executionId:'b2-prayer',
 sourceFingerprint:registry.sourceFingerprint,facts:{targets:{priest:{withinRange:true,ally:true}}},
 choices:{range:0,targets:0,duration:0,effect:0},expiry:{phase:'endOfRound',round:5},...extra});
const stateOf=store=>{const state=JSON.parse(store.getFullJSON());delete state.exportedAt;return state;};
const personOf=store=>stateOf(store).combat.participants[0];
async function fixture(person=actor()){
 let saved=null,refuse=false;
 const persistence={async load(){return saved&&clone(saved);},async saveAtomic({state}){if(refuse)return {ok:false,error:'refus B02'};saved=clone(state);return {ok:true};}};
 const store=createStore({persistence,storage:null});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:person.id,order:[person.id],participants:[person]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
 return {store,persistence,setRefuse(value){refuse=value;}};
}

test('B02 — Mathlann ne déclenche aucun Courroux, même avec maladresse et Péchés hérités',()=>{
 for(const sin of [0,1,5,12]){
  const priest=actor('Mathlann',sin),before=clone(priest);
  for(const roll of [20,21,99,100]){
   const result=previewDivineExecution(priest,getDivineContract(MATH),[priest],input({roll}));
   assert.equal(result.preview?.wrath?.triggered,false,`${sin}/${roll}: ${result.error}`);
   assert.equal(result.preview.wrath.reason,null);
   assert.equal(result.preview.wrath.exempt,true);
   assert.equal(result.preview.wrath.sinAtTest,0);
   assert.equal(result.preview.wrath.exemption.source.printedPage,99);
  }
  assert.deepEqual(priest,before);
 }
});

test('B02 — un culte elfe n’exige pas un total de Péchés sur la fiche',()=>{
 const priest=actor();delete priest.extensions.v5.divine.sin;
 const result=previewDivineExecution(priest,getDivineContract(MATH),[priest],input());
 assert.equal(result.ready,true,result.error);
 assert.equal(result.preview.wrath.triggered,false);
 assert.equal(result.preview.prayer.fumble,true);
});

test('B02 — exemption par culte et pas par race ou saisie client',()=>{
 const priest=actor('Myrmidia',2);priest.species='Elfe';
 const result=previewDivineExecution(priest,getDivineContract(HUMAN),[priest],input({cult:'Mathlann',sinExempt:true}));
 assert.equal(result.preview.wrath.triggered,true);
 assert.equal(result.preview.wrath.sinAtTest,2);
 const missing=clone(priest);delete missing.extensions.v5.divine.sin;
 assert.equal(previewDivineExecution(missing,getDivineContract(HUMAN),[missing],input()).status,'needs-input');
});

test('B02 — attribution de Péchés refusée à Mathlann sans mutation',()=>{
 const priest=actor(),state={combat:{participants:[priest]},extensions:{v5:{}}},before=clone(state);
 assert.throws(()=>setStoreDivineSin(state,priest.id,6,{reason:'Infraction'}),/exempt|elf/i);
 assert.deepEqual(state,before);
});

test('B02 — culte mixte exige une sélection acquise et préserve les Péchés humains',()=>{
 const priest=actor();priest.talents.push({id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'});
 const state={combat:{participants:[priest]},extensions:{v5:{}}};
 assert.throws(()=>setStoreDivineSin(state,priest.id,6,{reason:'Infraction'}),/culte|plusieurs/i);
 assert.throws(()=>setStoreDivineSin(state,priest.id,6,{reason:'Infraction',cult:'Mathlann'}),/exempt|elf/i);
 assert.throws(()=>setStoreDivineSin(state,priest.id,6,{reason:'Infraction',cult:'Sigmar'}),/culte|acquis/i);
 const updated=setStoreDivineSin(state,priest.id,6,{reason:'Infraction',cult:'Myrmidia'});
 assert.equal(updated.combat.participants[0].extensions.v5.divine.sin,6);
 assert.equal(state.combat.participants[0].extensions.v5.divine.sin,5);
 assert.match(updated.log[0].text,/Myrmidia/);
});

test('B02 — vrais apply, Undo/Redo et reload conservent l’exemption et le total hérité',async()=>{
 const {store,persistence}=await fixture(),before=personOf(store);
 const preview=store.previewDivineExecution(MATH,input());
 assert.equal(preview.ready,true,preview.error);
 assert.deepEqual(personOf(store),before);
 const applied=await store.applyDivineExecution(MATH,{preview});
 assert.equal(applied.ok,true,applied.error);
 assert.equal(applied.receipt.wrathResolution,null);
 assert.equal(applied.receipt.wrath.exempt,true);
 assert.equal(personOf(store).extensions.v5.divine.sin,5);
 assert.equal(await store.undo(),true);
 assert.deepEqual(personOf(store),before);
 assert.equal(await store.redo(),true);
 const reloaded=createStore({persistence,storage:null});await reloaded.ready;
 assert.equal(personOf(reloaded).extensions.v5.divine.sin,5);
 assert.equal(stateOf(reloaded).extensions.v5.divineExecutions.at(-1).wrath.exempt,true);
});

test('B02 — refus de persistance et aperçu falsifié ne changent aucun champ',async()=>{
 const {store,setRefuse}=await fixture(),before=stateOf(store);
 const preview=store.previewDivineExecution(MATH,input());assert.equal(preview.ready,true,preview.error);
 const forged=clone(preview);forged.preview.wrath.exempt=false;
 await assert.rejects(()=>store.applyDivineExecution(MATH,{preview:forged}),/aperçu|calcul|recalculez/i);
 assert.deepEqual(stateOf(store),before);
 setRefuse(true);
 const refused=await store.applyDivineExecution(MATH,{preview});
 assert.equal(refused.ok,false);
 assert.match(refused.error,/refus B02|persistance|sauvegarde/i);
 assert.deepEqual(stateOf(store),before);
});
});

describe('compétences', () => {
const skills=store=>priest(store).extensions.v5.divineEffects?.filter(row=>row.type==='wrath-skill-penalty')||[];
const prayer=(roll,extra={})=>input(roll,{executionId:'b6:'+roll,wrathSkillIds:['cool'],wrathDurationRoll:2,...extra});
async function impose(store,roll=16,extra={}){const preview=store.previewDivineExecution(BATTLE,prayer(roll,extra));assert.equal(preview.ready,true,preview.error);const result=await store.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,true);return preview;}
for(const [roll,unit,seconds]of [[16,'hours',10800],[46,'days',259200]])test(`B06 — sélection MJ et échéance en ${unit}, Péchés avant décrément`,async()=>{const {store}=await fixture(),before=snap(store);const p=store.previewDivineExecution(BATTLE,prayer(roll));assert.equal(p.ready,true,p.error);assert.deepEqual(snap(store),before);assert.equal(p.wrathSkillPreview?.unit,unit);assert.equal(p.wrathSkillPreview.value,3);await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(skills(store)[0].deadline.atSeconds-before.extensions.v5.gameClock.campaignSeconds,seconds);assert.deepEqual(skills(store)[0].skillIds,['cool']);assert.equal(magicSkillModifiers(priest(store),'Calme')[0].amount,-1);assert.equal(magicSkillModifiers(priest(store),'Prière').length,0);assert.equal(priest(store).extensions.v5.divine.sin,0);});
test('B06 — choix et dé obligatoires, inconnus/vides/doublons refusés malgré note MJ',async()=>{for(const extra of [{wrathSkillIds:undefined},{wrathSkillIds:[]},{wrathSkillIds:['unknown']},{wrathSkillIds:['']},{wrathSkillIds:['cool','cool']},{wrathDurationRoll:undefined},{wrathDurationRoll:0},{wrathDurationRoll:11}]){const {store}=await fixture(),before=snap(store);assert.equal(store.previewDivineExecution(BATTLE,prayer(16,{...extra,wrathConsequences:'Choix déjà fait hors outil'})).ready,false);assert.deepEqual(snap(store),before);}});
test('B06 — heures autorisent plusieurs compétences, jours exactement une',async()=>{const a=await fixture();await impose(a.store,16,{wrathSkillIds:['cool','pray']});assert.equal(magicSkillModifiers(priest(a.store),'Calme')[0].amount,-1);assert.equal(magicSkillModifiers(priest(a.store),'Prière')[0].amount,-1);const b=await fixture();assert.equal(b.store.previewDivineExecution(BATTLE,prayer(46,{wrathSkillIds:['cool','pray']})).ready,false);});
test('B06 — le vrai Test générique et l’opposition lisent le malus avant succès/DR',async()=>{const {store}=await fixture();await impose(store);const actor=priest(store),action={id:'cool',type:'skill',base:50,attr:'FM',note:'Calme',extensions:{fiche:{skillId:'skill-43_61_6d_65-base'}}};const p=previewResolution({actor,action,roll:45,v5:{kind:'test',context:{isAction:false,involvesMovement:false,requiresSight:false,reliesOnSight:false}}});assert.equal(p.test.sl,0);assert.equal(p.test.success,true);const ally=snap(store).combat.participants[1],opposed=previewResolution({actor:ally,target:actor,action:{...action,id:'opponent'},roll:45,defense:{base:50,attr:'FM',label:'Calme',roll:45,extensions:action.extensions,v5:{kind:'test',context:{isAction:false,requiresSight:false,reliesOnSight:false}}},v5:{kind:'test',context:{isAction:false,requiresSight:false,reliesOnSight:false}}});assert.equal(opposed.defenderTest.sl,0);});
test('B06 — la Prière suivante et la récupération reçoivent aussi la compétence sélectionnée',async()=>{const {store}=await fixture();await impose(store,6,{executionId:'b6-prone',wrathSkillIds:undefined});await store.setDivineSin('priest',1,{reason:'Suite'});await impose(store,16,{wrathSkillIds:['pray']});const id=priest(store).states[0].id,p=store.previewDivineWrathRecovery({actorId:'priest',stateId:id,roll:75,canSpeak:true});assert.equal(p.ready,true,p.error);assert.equal(p.test.success,false,'+2 moins 1 : le jet75 ne réussit plus');});
test('B06 — expiration exacte via horloge commune, Undo/Redo et reload',async()=>{const {store,persistence}=await fixture();await impose(store);await store.advanceCampaignTime({seconds:10799,reason:'Juste avant'});assert.equal(skills(store).length,1);await store.advanceCampaignTime({seconds:1,reason:'Échéance'});assert.equal(skills(store).length,0);assert.equal(magicSkillModifiers(priest(store),'Calme').length,0);await store.undo();assert.equal(skills(store).length,1);await store.redo();const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(skills(reload).length,0);});
test('B06 — faux aperçu, changement de fiche et refus de sauvegarde restent atomiques',async()=>{const {store,setRefuse}=await fixture();let p=store.previewDivineExecution(BATTLE,prayer(16)),before=snap(store),forged=structuredClone(p);forged.wrathSkillPreview.value=900;await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview:forged}),/aperçu|modifié/i);assert.deepEqual(snap(store),before);setRefuse(true);assert.equal((await store.applyDivineExecution(BATTLE,{preview:p})).ok,false);assert.deepEqual(snap(store),before);setRefuse(false);await store.updateParticipant('priest',{skills:priest(store).skills.filter(row=>row.id!=='cool')});await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview:p}),/changé|recalculez/i);assert.equal(store.previewDivineExecution(BATTLE,prayer(16)).ready,false);});
test('B06 — sélection non résolue ou homonyme ambiguë demande une fiche résolue',async()=>{for(const data of [[{id:'cool',name:'Calme',status:'unresolved',carac:'FM',total:50}],[{id:'cool',name:'Calme',status:'resolved',carac:'FM',total:50},{id:'cool',name:'Calme',status:'resolved',carac:'FM',total:60}]]){const {store}=await fixture(1,{skills:[{id:'pray',name:'Prière',carac:'Soc',status:'resolved',total:60},...data]});assert.equal(store.previewDivineExecution(BATTLE,prayer(16)).ready,false);}});
test('B06 — un nouveau Courroux depuis récupération pose le même malus calendaire',async()=>{const {store}=await fixture();await impose(store,6,{executionId:'b6-state'});await store.setDivineSin('priest',1,{reason:'Nouveau'});const p=store.previewDivineWrathRecovery({actorId:'priest',stateId:priest(store).states[0].id,roll:99,canSpeak:true,wrathRoll:16,wrathDurationRoll:2,wrathSkillIds:['cool']});assert.equal(p.ready,true,p.error);await store.applyDivineWrathRecovery({preview:p});assert.equal(skills(store).length,1);assert.equal(magicSkillModifiers(priest(store),'Calme')[0].amount,-1);});
test('B06 — retrait générique du malus refusé et occurrences gardées sans cumul mécanique',async()=>{const {store}=await fixture();await impose(store);let actor=priest(store);await assert.rejects(()=>store.updateParticipant('priest',{extensions:{...actor.extensions,v5:{...actor.extensions.v5,divineEffects:[]}}}),/Courroux|expiration/i);await store.setDivineSin('priest',1,{reason:'Autre occurrence'});await impose(store,16,{executionId:'b6-second',wrathDurationRoll:4});assert.equal(skills(store).length,2);assert.equal(magicSkillModifiers(priest(store),'Calme')[0].amount,-1);await store.advanceCampaignTime({seconds:10800,reason:'Première échéance'});assert.equal(skills(store).length,1);assert.equal(magicSkillModifiers(priest(store),'Calme')[0].amount,-1);await store.advanceCampaignTime({seconds:7200,reason:'Seconde échéance'});assert.equal(skills(store).length,0);});
});

describe('alliés', () => {
const actor=(store,id)=>snap(store).combat.participants.find(row=>row.id===id);
const layer=(store,id='ally')=>actor(store,id).extensions.v5.divineEffects?.find(row=>row.type==='wrath-deity-rejection');
const wrath=(extra={})=>input(31,{executionId:'b7-trigger',wrathAllyIds:['ally'],wrathAlliesConfirmed:true,wrathDurationRoll:2,...extra});
const later=(extra={})=>({actorId:'priest',targetIds:['ally'],roll:60,canSpeak:true,executionId:'b7-later',facts:{targets:{ally:{withinRange:true,ally:true},third:{withinRange:true,ally:true}}},expiry:{phase:'endOfRound',round:6,moment:'afterEffects'},...extra});
async function impose(store,extra={}){const p=store.previewDivineExecution(BATTLE,wrath(extra));assert.equal(p.ready,true,p.error);assert.equal((await store.applyDivineExecution(BATTLE,{preview:p})).ok,true);return p;}
test('B07 — proposition du même camp, choix MJ confirmé et À Terre canonique sur les seuls confirmés',async()=>{const {store}=await fixture();await store.executeCommand('third',draft=>{draft.combat.participants.push({...person('third',0),camp:'ennemi'});return draft;});const before=snap(store),missing=store.previewDivineExecution(BATTLE,wrath({wrathAlliesConfirmed:false}));assert.equal(missing.ready,false);assert.deepEqual(missing.wrathAlliesPreview?.proposedIds,['ally']);const p=await impose(store);assert.deepEqual(p.wrathAlliesPreview.selectedIds,['ally']);assert.equal(actor(store,'ally').states.some(row=>row.key==='a-terre'),true);assert.equal(priest(store).states.length,0);assert.equal(actor(store,'third').states.length,0);assert.equal(layer(store).duration.value,3);assert.equal(layer(store).deadline.atSeconds-before.extensions.v5.gameClock.campaignSeconds,259200);assert.equal(priest(store).extensions.v5.divine.sin,0);});
test('B07 — liste corrigeable vers un autre camp, immunité et À Terre déjà présent respectés',async()=>{const {store}=await fixture();await store.executeCommand('third',draft=>{draft.combat.participants.push({...person('third',0),camp:'ennemi',states:[{id:'old-prone',name:'À Terre'}]});return draft;});await impose(store,{wrathAllyIds:['third']});assert.equal(actor(store,'third').states.filter(row=>row.key==='a-terre').length,1);assert.equal(actor(store,'third').states[0].id,'old-prone');assert.equal(layer(store),undefined);assert.ok(layer(store,'third'));});
test('B07 — liste vide explicitement confirmée acceptée ; dés, confirmation, inconnus et doublons refusés',async()=>{for(const extra of [{wrathAllyIds:undefined},{wrathAllyIds:[] ,wrathAlliesConfirmed:false},{wrathAllyIds:['unknown']},{wrathAllyIds:['ally','ally']},{wrathDurationRoll:undefined},{wrathDurationRoll:0}]){const {store}=await fixture(),before=snap(store);assert.equal(store.previewDivineExecution(BATTLE,wrath(extra)).ready,false);assert.deepEqual(snap(store),before);}const {store}=await fixture();const p=await impose(store,{wrathAllyIds:[]});assert.deepEqual(p.wrathAlliesPreview.selectedIds,[]);assert.equal(layer(store),undefined);assert.equal(priest(store).extensions.v5.divine.sin,0);});
test('B07 — vrai Test réussi mais prière du même dieu rejetée, aucun effet produit',async()=>{const {store}=await fixture();await impose(store);const before=snap(store),p=store.previewDivineExecution(BATTLE,later());assert.equal(p.ready,true,p.error);assert.equal(p.preview.prayer.success,true);assert.equal(p.preview.success,false);assert.deepEqual(p.preview.targetRejections.map(row=>row.targetId),['ally']);assert.equal(p.preview.effects.length,0);assert.deepEqual(snap(store),before);const applied=await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(actor(store,'ally').caracs.CC,40);assert.equal(applied.receipt.effectiveSuccess,false);assert.equal(applied.receipt.prayer.success,true);});
test('B07 — un autre dieu et une autre cible conservent leur règle normale',async()=>{const {store}=await fixture();await store.executeCommand('third',draft=>{draft.combat.participants.push(person('third',0));draft.combat.participants[0].talents.push({id:'talent-bless',rank:1,status:'resolved',specialization:'Manann'});return draft;});await impose(store);const other=store.previewDivineExecution('divine:blessing:manann:battle',later({executionId:'b7-other-god'}));assert.equal(other.ready,true,other.error);assert.equal(other.preview.success,true);const target=store.previewDivineExecution(BATTLE,later({targetIds:['third'],executionId:'b7-other-target'}));assert.equal(target.ready,true,target.error);assert.equal(target.preview.success,true);});
test('B07 — le moteur pur lit les couches sources des cibles, sans indicateur client de succès',async()=>{const {store}=await fixture();await impose(store);const p=previewDivineExecution(priest(store),getDivineContract(BATTLE),[actor(store,'ally')],{...later(),round:1,sourceFingerprint:getDivineContract(BATTLE).sourceFingerprint,forceSuccess:true});assert.equal(p.ready,true,p.error);assert.equal(p.preview.success,false);assert.equal(p.preview.prayer.success,true);});
test('B07 (B-C15) — plusieurs cibles dont une réprouvée : échec pour elle seule, la prière agit sur les autres',async()=>{const {store}=await fixture();await store.executeCommand('third',draft=>{draft.combat.participants.push(person('third',0));return draft;});const id='divine:miracle:bouclier-de-myrmidia',contract=getDivineContract(id),pr=priest(store);await store.updateParticipant('priest',{talents:[...pr.talents,{id:'talent-invoke',rank:1,status:'resolved',specialization:'Myrmidia'}],prayers:[{name:contract.catalogueName,status:'resolved'}]});await impose(store);
  const p=store.previewDivineExecution(id,later({targetIds:['ally','third'],executionId:'b7-partial',roll:20,expiry:{phase:'endOfRound',round:6}}));assert.equal(p.ready,true,p.error);assert.equal(p.preview.success,true);assert.deepEqual(p.preview.rejectedTargetIds,['ally']);assert.deepEqual(p.preview.targetRejections.map(row=>row.targetId),['ally']);assert.ok(p.preview.effects.length>0);
  const applied=await store.applyDivineExecution(id,{preview:p});assert.equal(applied.ok,true,applied.error);const bonus=who=>(actor(store,who).extensions.v5.divineEffects||[]).some(row=>row.type==='armor-bonus');assert.equal(bonus('ally'),false);assert.equal(bonus('third'),true);assert.equal(applied.receipt.effectiveSuccess,true);});
test('B07 — rejet persistant après lever À Terre, expiration exacte puis Undo/Redo/reload',async()=>{const {store,persistence}=await fixture();await impose(store);await store.recoverCondition('ally','À Terre',{method:'stand-up'});assert.equal(actor(store,'ally').states.length,0);assert.equal(store.previewDivineExecution(BATTLE,later()).preview.success,false);await store.advanceCampaignTime({seconds:259199,reason:'Avant échéance'});assert.ok(layer(store));await store.advanceCampaignTime({seconds:1,reason:'Échéance'});assert.equal(layer(store),undefined);assert.equal(store.previewDivineExecution(BATTLE,later()).preview.success,true);await store.undo();assert.ok(layer(store));await store.redo();const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(layer(reload),undefined);});
test('B07 — aperçu falsifié, cible disparue et refus persistance sans acquisition partielle',async()=>{const {store,setRefuse}=await fixture(),p=store.previewDivineExecution(BATTLE,wrath()),before=snap(store),forged=structuredClone(p);forged.wrathAlliesPreview.selectedIds=[];await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview:forged}),/aperçu|modifié/i);setRefuse(true);assert.equal((await store.applyDivineExecution(BATTLE,{preview:p})).ok,false);assert.deepEqual(snap(store),before);setRefuse(false);await store.executeCommand('gone',draft=>{draft.combat.participants=draft.combat.participants.filter(row=>row.id!=='ally');return draft;});await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview:p}),/changé|recalculez/i);assert.equal(store.previewDivineExecution(BATTLE,wrath({targetIds:[]})).ready,false);});
test('B07 — retrait brut de la sanction refusé, les autres origines d’effets restent intactes',async()=>{const {store}=await fixture();await impose(store);const ally=actor(store,'ally');await assert.rejects(()=>store.updateParticipant('ally',{extensions:{...ally.extensions,v5:{...ally.extensions.v5,divineEffects:[]}}}),/Courroux|expiration/i);assert.ok(layer(store));});
test('B07 — récupération B04 peut condamner une liste confirmée sans perdre sa propre transaction',async()=>{const {store}=await fixture();let p=store.previewDivineExecution(BATTLE,input(6,{executionId:'b7-prone'}));await store.applyDivineExecution(BATTLE,{preview:p});await store.setDivineSin('priest',1,{reason:'Nouveau'});p=store.previewDivineWrathRecovery({actorId:'priest',stateId:priest(store).states[0].id,roll:99,canSpeak:true,wrathRoll:31,wrathDurationRoll:2,wrathAllyIds:['ally'],wrathAlliesConfirmed:true});assert.equal(p.ready,true,p.error);await store.applyDivineWrathRecovery({preview:p});assert.ok(layer(store));assert.equal(priest(store).states.some(row=>row.key==='a-terre'),true);});
test('B07 — un Miracle visant soi implicitement respecte aussi le rejet',async()=>{const {store}=await fixture(),id='divine:miracle:effrayer-l-ennemi',contract=getDivineContract(id),actor=priest(store);await store.updateParticipant('priest',{talents:[...actor.talents,{id:'talent-invoke',rank:1,status:'resolved',specialization:'Myrmidia'}],prayers:[{name:contract.catalogueName,status:'resolved'}]});await impose(store,{wrathAllyIds:['priest']});const p=store.previewDivineExecution(id,{actorId:'priest',targetIds:[],roll:60,canSpeak:true,executionId:'b7-self'});assert.equal(p.ready,true,p.error);assert.equal(p.preview.prayer.success,true);assert.equal(p.preview.success,false);assert.equal(p.preview.effects.length,0);});
test('B07 — tout prêtre du même culte est concerné ; Test réussi rejeté peut encore déclencher Courroux',async()=>{const {store}=await fixture();await store.executeCommand('other-priest',draft=>{draft.combat.participants.push(person('third',0));return draft;});await impose(store);const other=store.previewDivineExecution(BATTLE,later({actorId:'third',executionId:'b7-third'}));assert.equal(other.preview.success,false);await store.setDivineSin('priest',1,{reason:'Risque du rejet'});const p=store.previewDivineExecution(BATTLE,later({roll:20,wrathRoll:6,executionId:'b7-rejected-wrath'}));assert.equal(p.ready,true,p.error);assert.equal(p.preview.prayer.success,true);assert.equal(p.preview.success,false);assert.equal(p.preview.wrath.triggered,true);await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(priest(store).extensions.v5.divine.sin,0);assert.equal(priest(store).states.some(row=>row.key==='a-terre'),true);assert.equal(actor(store,'ally').caracs.CC,40);});
test('B07 — la sanction vise les prières suivantes, conserve l’effet de la Prière déclencheuse',async()=>{const {store}=await fixture();const p=await impose(store,{roll:20,expiry:{phase:'endOfRound',round:6,moment:'afterEffects'}});assert.equal(p.preview.prayer.success,true);assert.equal(p.preview.success,true);assert.equal(actor(store,'ally').caracs.CC,50);assert.ok(layer(store));});
test('B07 — immunité canonique à À Terre sans exemption du rejet des prières',async()=>{const {store}=await fixture();const ally=actor(store,'ally');await store.updateParticipant('ally',{extensions:{...ally.extensions,v5:{...ally.extensions.v5,immunities:{conditions:['À Terre']}}}});await impose(store);assert.equal(actor(store,'ally').states.some(row=>row.key==='a-terre'),false);assert.ok(layer(store));});
test('B07 — dupliquer une couche du même identifiant est refusé à la lecture et à l’édition',async()=>{const {store}=await fixture();await impose(store);const ally=actor(store,'ally'),forged=structuredClone(ally);forged.extensions.v5.divineEffects.push(structuredClone(layer(store)));const {wrathDeityRejections}=await import('../../../js/core/v5-divine-engine.js');assert.equal(wrathDeityRejections(forged).ok,false);await assert.rejects(()=>store.updateParticipant('ally',{extensions:forged.extensions}),/Courroux|invalide/i);});
});

describe('accès et sanctions', () => {
const suspension=store=>priest(store).extensions.v5.divineEffects?.find(row=>row.type==='divine-access-suspension');
async function impose(store,extra={}){const p=store.previewDivineExecution(BATTLE,input(96,{executionId:'b8-trigger',wrathDurationRoll:2,...extra}));assert.equal(p.ready,true,p.error);assert.equal((await store.applyDivineExecution(BATTLE,{preview:p})).ok,true);return p;}
for(const [sin,result,days]of [[1,'wrath:106-110',3],[2,'wrath:116-120',4]])test(`B08 — ${result} suspend Béni/Invocation et préserve les acquisitions`,async()=>{const {store}=await fixture(sin),talents=priest(store).talents,before=snap(store),p=store.previewDivineExecution(BATTLE,input(96,{wrathDurationRoll:2}));assert.equal(p.ready,true,p.error);assert.deepEqual(snap(store),before);assert.equal(p.wrathAccessPreview?.value,days);await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(suspension(store).resultId,result);assert.equal(suspension(store).deadline.atSeconds,days*86400);assert.deepEqual(priest(store).talents,talents);assert.equal(store.resolveDivineAccess('priest',BATTLE).allowed,false);assert.equal(store.previewDivineExecution(BATTLE,input(11,{roll:98,executionId:'b8-next'})).ready,false);});
test('B08 — dés et somme 2d10 explicites, aucune note libre ne suspend un talent',async()=>{for(const [sin,roll]of [[1,undefined],[1,0],[1,11],[2,1],[2,21]]){const {store}=await fixture(sin),before=snap(store);assert.equal(store.previewDivineExecution(BATTLE,input(96,{wrathDurationRoll:roll,wrathConsequences:'fait'})).ready,false);assert.deepEqual(snap(store),before);}});
test('B08 — une dérogation MJ ne contourne pas une sanction active',async()=>{const {store}=await fixture();await impose(store);await store.grantDivineAccess('priest',BATTLE,{scope:'durable',reason:'Dérogation antérieure'});assert.equal(store.resolveDivineAccess('priest',BATTLE).allowed,false);});
test('B08 — expiration rend accès aux talents, Undo/Redo et reload conservent échéance',async()=>{const {store,persistence}=await fixture();await impose(store);await store.advanceCampaignTime({seconds:259199,reason:'Avant'});assert.equal(store.resolveDivineAccess('priest',BATTLE).allowed,false);await store.advanceCampaignTime({seconds:1,reason:'Échéance'});assert.equal(store.resolveDivineAccess('priest',BATTLE).allowed,true);await store.undo();assert.equal(store.resolveDivineAccess('priest',BATTLE).allowed,false);await store.redo();const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(reload.resolveDivineAccess('priest',BATTLE).allowed,true);});
test('B08 — un autre culte reste accessible et Prière de récupération n’exige pas Béni',async()=>{const {store}=await fixture();const actor=priest(store);await store.updateParticipant('priest',{talents:[...actor.talents,{id:'talent-bless',rank:1,status:'resolved',specialization:'Manann'}]});let p=store.previewDivineExecution(BATTLE,input(6,{executionId:'b8-state'}));await store.applyDivineExecution(BATTLE,{preview:p});await store.setDivineSin('priest',1,{reason:'Nouvelle occurrence'});await impose(store);assert.equal(store.resolveDivineAccess('priest','divine:blessing:manann:battle').allowed,true);p=store.previewDivineWrathRecovery({actorId:'priest',stateId:priest(store).states[0].id,roll:34,canSpeak:true});assert.equal(p.ready,true,p.error);});
const solkan='divine:blessing:solkan:battle';
async function solkanFixture(sin=0,corruption){const {store}=await fixture(sin);const actor=priest(store);await store.updateParticipant('priest',{talents:[{id:'talent-bless',rank:1,status:'resolved',specialization:'Solkan'}],extensions:{...actor.extensions,v5:{...actor.extensions.v5,...(corruption===undefined?{}:{corruptionPoints:corruption})}}});return store;}
test('B08 — Solkan refuse Corruption inconnue, sans lui attribuer zéro',async()=>{const store=await solkanFixture(),before=snap(store),p=store.previewDivineExecution(solkan,input(11,{roll:98}));assert.equal(p.ready,false);assert.ok(p.needsInput.some(row=>/corruption/i.test(row.field||row.path)));assert.deepEqual(snap(store),before);});
for(const [sin,corruption,allowed]of [[0,0,true],[1,0,false],[0,1,false],[1,1,false],[0,-1,false],[0,'0',false]])test(`B08 — Solkan Péché${sin} Corruption${corruption} : ${allowed}`,async()=>{const store=await solkanFixture(sin,corruption),p=store.previewDivineExecution(solkan,input(11,{roll:98}));assert.equal(p.ready,allowed,p.error);assert.equal(store.resolveDivineAccess('priest',solkan).allowed,allowed);});
test('B08 — six Bénédictions de Stromfels sourcées L25 p.91, effets V5 identiques à Manann',()=>{const rows=getAllDivineContracts().filter(row=>row.type==='blessing'&&row.deity==='Stromfels');assert.equal(rows.length,6);assert.deepEqual(rows.map(row=>row.id.split(':').at(-1)).sort(),['battle','breath','courage','hardiness','savagery','tenacity']);for(const row of rows){assert.equal(row.source.printedPage,91);assert.equal(row.source.fileSha256,'60f5b8856c94c3969e56b4747522bbb78030f5a067a5265a744c48cd8148b4dc');assert.deepEqual(row.effects,getDivineContract(row.id.replace(':stromfels:',':manann:')).effects);}});
for(const [sin,bless,invoke]of [[0,true,true],[1,true,true],[2,true,false],[4,true,false],[5,false,false],[6,false,false]])test(`B08 — Stromfels seuils ${sin}, talents conservés`,async()=>{assert.equal(typeof access.resolveDivineTalentRestriction,'function');const {store}=await fixture(sin),actor=priest(store),talents=[{id:'talent-bless',rank:1,status:'resolved',specialization:'Stromfels'},{id:'talent-invoke',rank:1,status:'resolved',specialization:'Stromfels'}];await store.updateParticipant('priest',{talents});for(const [talentId,expected]of [['talent-bless',bless],['talent-invoke',invoke]])assert.equal(access.resolveDivineTalentRestriction(priest(store),{cult:'Stromfels',talentId}).allowed,expected);const preview=store.previewDivineExecution('divine:blessing:stromfels:battle',input(11,{roll:98}));assert.equal(preview.ready,bless,preview.error);assert.deepEqual(priest(store).talents,talents);});
test('B08 — suspension depuis récupération et refus de retrait brut',async()=>{const {store}=await fixture();let p=store.previewDivineExecution(BATTLE,input(6,{executionId:'b8-prone'}));await store.applyDivineExecution(BATTLE,{preview:p});await store.setDivineSin('priest',1,{reason:'Nouveau'});p=store.previewDivineWrathRecovery({actorId:'priest',stateId:priest(store).states[0].id,roll:99,canSpeak:true,wrathRoll:96,wrathDurationRoll:2});assert.equal(p.ready,true,p.error);await store.applyDivineWrathRecovery({preview:p});const actor=priest(store);assert.ok(suspension(store));await assert.rejects(()=>store.updateParticipant('priest',{extensions:{...actor.extensions,v5:{...actor.extensions.v5,divineEffects:[]}}}),/Courroux|expiration/i);});
});

describe('contrôle indépendant du moteur', () => {
const contract = divineRegistry.contracts.find(row => row.canonicalName === 'Shield of Myrmidia');
const source = contract.source;
const makeActor = ({ sin = 0, pray = 50, talents = null } = {}) => ({
  id: 'priest-1', name: 'Priest', zone: 'active', skills: [{ id: 'skill-pray', name: 'Pray', status: 'resolved', total: pray }],
  caracs: { Soc: pray }, talents: talents || [{ id: contract.requiredTalent.catalogueTalentId, status: 'resolved', specialization: 'Myrmidia', rank: 1 }],
  prayers: [{ nom: contract.catalogueName }],
  extensions: { v5: { divine: { sin } } }
});
const stateFor = actor => ({ combat: { currentActorId: actor.id, participants: [structuredClone(actor)] }, extensions: { v5: { divineExecutions: [] } } });
const wrathResult = { resultId: 'wrath:1-5', source: { document: 'Livre de base V5 EN v2.pdf', pdfPage: 218 } };
const targetsFor = actor => [structuredClone(actor)];
const factsFor = actor => ({ targets: { [actor.id]: { withinRange: true, ally: true } } });

// The test is independent of the application code: it supplies only explicit rolls and sourced choices.
test('Contrôle indépendant — le score Pray et Sin proviennent de la fiche, les overrides du client sont ignorés', () => {
  const actor = makeActor({ sin: 0, pray: 50 });
  const normal = previewDivineExecution(actor, contract, targetsFor(actor), { canSpeak: true, roll: 59, facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint });
  const forged = previewDivineExecution(actor, contract, targetsFor(actor), { canSpeak: true, roll: 59, facts: factsFor(actor), skillScore: 99, sinPoints: 9, sourceFingerprint: divineRegistry.sourceFingerprint });
  assert.equal(normal.preview.skillScore, 50);
  assert.equal(forged.preview.skillScore, 50);
  assert.equal(normal.preview.sinAtTest, 0);
  assert.equal(forged.preview.sinAtTest, 0);
  assert.equal(forged.preview.wrath.triggered, false, 'un champ libre sinPoints ne doit pas déclencher le Courroux');
});

test('Contrôle indépendant — Pray utilise Sociabilité (Soc), avec son ajustement courant, jamais FM', () => {
  const actor = makeActor({ sin: 0, pray: 50 });
  actor.skills[0].carac = 'soc';
  actor.extensions.v5.baseCaracs = { Soc: 50 };
  actor.caracs = { Soc: 65, FM: 99 };
  const result = previewDivineExecution(actor, contract, targetsFor(actor), {
    canSpeak: true, roll: 64, facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint
  });
  assert.equal(result.preview.skillScore, 65, 'Pray 50 + 15 d’ajustement actuel de Sociabilité');
  assert.equal(result.preview.prayer.success, true);
  assert.match(divineRegistry.commonPrayerRules.find(row => row.id === 'prayer-skill').text, /Prière \(Soc\)/);
  assert.doesNotMatch(divineRegistry.commonPrayerRules.find(row => row.id === 'prayer-skill').text, /FM/);
});

test('Contrôle indépendant — une prière brute issue de la fiche-sync est admise, un statut explicitement non résolu est refusé', () => {
  const actor = makeActor({ sin: 0, pray: 60 });
  assert.equal(Object.hasOwn(actor.prayers[0], 'status'), false, 'la fiche-sync fournit les noms bruts sans statut');
  const accepted = previewDivineExecution(actor, contract, targetsFor(actor), { canSpeak: true, roll: 45, facts: factsFor(actor), expiry: { phase: 'endOfRound', round: 6 }, sourceFingerprint: divineRegistry.sourceFingerprint });
  assert.ok(accepted.ready, accepted.error);
  actor.prayers[0].status = 'unresolved';
  const unresolved = previewDivineExecution(actor, contract, targetsFor(actor), { canSpeak: true, roll: 45, facts: factsFor(actor), expiry: { phase: 'endOfRound', round: 6 }, sourceFingerprint: divineRegistry.sourceFingerprint });
  assert.equal(unresolved.ready, false);
  assert.equal(unresolved.status, 'blocked');
});

test('Contrôle indépendant — rang ou spécialisation absents ne créent pas Invocation de Myrmidia', () => {
  const base = makeActor({ sin: 0, pray: 60 });
  const withoutRank = structuredClone(base);withoutRank.talents[0].rank = 0;
  const unranked = previewDivineExecution(withoutRank, contract, targetsFor(withoutRank), { canSpeak: true, roll: 45, facts: factsFor(withoutRank), sourceFingerprint: divineRegistry.sourceFingerprint });
  assert.equal(unranked.status, 'blocked');
  const wrongCult = structuredClone(base);wrongCult.talents[0].specialization = 'Sigmar';
  const crossCult = previewDivineExecution(wrongCult, contract, targetsFor(wrongCult), { canSpeak: true, roll: 45, facts: factsFor(wrongCult), sourceFingerprint: divineRegistry.sourceFingerprint });
  assert.equal(crossCult.status, 'blocked');
});

test('Contrôle indépendant — unités égales au Sin déclenchent le Courroux même avec un Pray réussi', () => {
  const actor = makeActor({ sin: 3, pray: 80 });
  const result = previewDivineExecution(actor, contract, targetsFor(actor), {
    canSpeak: true, roll: 23, wrathRoll: 10, wrathConsequences: 'MJ a traité le résultat', facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint, expiry: { phase: 'endOfRound', round: 8 }
  });
  assert.equal(result.ready, true, result.error);
  assert.equal(result.preview.prayer.success, true);
  assert.equal(result.preview.unit, 3);
  assert.equal(result.preview.wrath.triggered, true);
  assert.equal(result.preview.wrath.reason, 'sin-threshold');
  assert.equal(result.preview.wrath.modifiedRoll, 40, 'le jet de Courroux ajoute 10 par Sin courant');
  assert.equal(result.preview.wrath.outcome.id, 'wrath:36-40');
  assert.equal(result.preview.wrath.sinAfter, 2, 'le Sin baisse d’un seul point après résolution du Courroux');
});

test('Contrôle indépendant — une prière avec Courroux en attente ne se commit pas et ne change aucun champ', () => {
  const actor = makeActor({ sin: 4, pray: 80 });
  const state = stateFor(actor);
  const before = structuredClone(state);
  const result = applyDivineExecution(state, contract, { actorId: actor.id, targetIds: [actor.id], facts: factsFor(actor), actorId: actor.id, canSpeak: true, roll: 23, executionId: 'pending-wrath', sourceFingerprint: divineRegistry.sourceFingerprint });
  assert.equal(result.ready, false);
  assert.equal(result.status, 'needs-wrath-resolution');
  assert.deepEqual(result.state, before);
  assert.equal(result.receipt, null);
});

test('Contrôle indépendant — le résultat du Courroux résolu est journalisé, décrémente Sin une fois et résiste au double-clic', () => {
  const actor = makeActor({ sin: 4, pray: 80 });
  const state = stateFor(actor);
  const input = { actorId: actor.id, targetIds: [actor.id], canSpeak: true, roll: 23, wrathRoll: 10, wrathConsequences: 'MJ a traité le résultat', facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint, expiry: { phase: 'endOfRound', round: 8 }, executionId: 'wrath-commit-1' };
  const applied = applyDivineExecution(state, contract, input);
  assert.equal(applied.ready, true, applied.error);
  assert.equal(applied.state.combat.participants[0].extensions.v5.divine.sin, 3);
  assert.equal(applied.receipt.wrathResolution.result.id, 'wrath:46-50');
  const repeated = applyDivineExecution(applied.state, contract, input);
  assert.equal(repeated.status, 'duplicate');
  assert.equal(repeated.state.combat.participants[0].extensions.v5.divine.sin, 3);
});

test('Contrôle indépendant — le Bouclier V5 augmente vraiment les PA effectives après application', () => {
  const actor = makeActor({ sin: 0, pray: 80 });
  const state = stateFor(actor);
  const applied = applyDivineExecution(state, contract, { actorId: actor.id, canSpeak: true, roll: 23,
    executionId: 'shield-ap-hook', targetIds: [actor.id], facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint,
    expiry: { phase: 'endOfRound', round: 8 } });
  assert.equal(applied.ready, true, applied.error);
  const layers = applied.state.combat.participants[0].extensions.v5.divineEffects;
  const effective = calculateEffectiveMagicAP({ head: 0, body: 0, arms: 0, legs: 0 }, layers);
  assert.equal(effective.head, 1);
  assert.equal(effective.body, 1);
  assert.equal(effective.leftArm, 1);
  assert.equal(effective.rightArm, 1);
  assert.equal(effective.leftLeg, 1);
  assert.equal(effective.rightLeg, 1);
});

test('Contrôle indépendant — reçu de source contradictoire bloque avant toute résolution', () => {
  const stale = structuredClone(contract);
  stale.sourceReceipt.sourceTextHash = 'sha256:other-source';
  const result = previewDivineExecution(makeActor(), stale, [], { canSpeak: true, roll: 23, sourceFingerprint: divineRegistry.sourceFingerprint });
  assert.equal(result.ready, false);
  assert.match(result.error, /source|reçu/i);
});

test('Contrôle indépendant — un reçu forgé en tandem ne suffit pas à autoriser une source non V5', () => {
  const forged = structuredClone(contract);
  forged.source = { document: 'Miracles.csv (FR V4)', pdfPage: 0, printedPages: 'V4', section: 'import', sourceTextHash: 'sha256:invented' };
  forged.sourceReceipt = structuredClone(forged.source);
  forged.status = 'implemented';
  forged.sourceFingerprint = 'forged-fingerprint';
  forged.effects = [{ type: 'condition', key: 'aveugle', level: 1 }];
  const result = previewDivineExecution(makeActor(), forged, [], { canSpeak: true, roll: 23, sourceFingerprint: forged.sourceFingerprint });
  assert.equal(result.ready, false, 'un objet contrat auto-signé depuis le CSV V4 ne prouve pas la source EN V5');
  assert.equal(result.status, 'blocked');
});

test('Contrôle indépendant — une prière temporaire bloque le doublon jusqu’à son échéance', () => {
  const actor = makeActor({ sin: 0, pray: 80 });
  const state = stateFor(actor);
  const first = applyDivineExecution(state, contract, {
    actorId: actor.id, canSpeak: true, roll: 23, executionId: 'shield-first', targetIds: [actor.id], facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint,
    expiry: { phase: 'endOfRound', round: 8 }
  });
  assert.equal(first.ready, true, first.error);
  assert.ok(first.state.combat.participants[0].extensions.v5.divineEffects.some(layer => layer.prayerId === contract.id));
  const duplicatePrayer = applyDivineExecution(first.state, contract, {
    actorId: actor.id, canSpeak: true, roll: 24, executionId: 'shield-second', targetIds: [actor.id], facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint,
    targetIds: [actor.id], facts: factsFor(actor), expiry: { phase: 'endOfRound', round: 8 }
  });
  assert.equal(duplicatePrayer.ready, false);
  assert.equal(duplicatePrayer.status, 'blocked');
  assert.deepEqual(duplicatePrayer.state, first.state);
  const expired = expireDivineEffects(first.state.combat.participants[0], {
    phase: 'endOfRound', round: 8
  });
  assert.equal(expired.status, 'expired');
  const afterExpiry = structuredClone(first.state);
  afterExpiry.combat.participants[0] = expired.participant;
  const retried = applyDivineExecution(afterExpiry, contract, {
    actorId: actor.id, canSpeak: true, roll: 24, executionId: 'shield-after-expiry', targetIds: [actor.id], facts: factsFor(actor), sourceFingerprint: divineRegistry.sourceFingerprint,
    expiry: { phase: 'endOfRound', round: 8 }
  });
  assert.equal(retried.ready, true, retried.error);
});

test('Contrôle indépendant — six miracles Myrmidia utilisent les effets V5 EN, jamais les effets CSV V4', () => {
  const rows = getAllDivineContracts();
  const byEnglish = new Map(rows.filter(row => row.type === 'miracle').map(row => [row.canonicalName, row]));
  const fury = byEnglish.get("Fury's Call");
  const shield = byEnglish.get('Shield of Myrmidia');
  const inspiring = byEnglish.get('Inspiring');
  const spear = byEnglish.get('Spear of Myrmidia');
  const eagle = byEnglish.get("Eagle's Eye");
  const sun = byEnglish.get('Blazing Sun');
  for (const row of [fury, shield, inspiring, spear, eagle, sun]) {
    assert.ok(row, 'les six entrées Myrmidia V5 doivent être présentes');
    assert.equal(row.source.edition, 'V5 EN');
    assert.equal(row.source.printedPage, 224);
    assert.equal(row.labels.sourceStatus, 'V5 base source checked');
  }
  assert.match(fury.labels.effect, /Frénésie/);
  assert.equal(shield.params.range.kind, 'characteristic', 'la portée est la Sociabilité entière, pas le Bonus de Sociabilité');
  assert.equal(shield.params.range.characteristic, 'Soc');
  assert.equal(shield.params.range.unit, 'yards');
  assert.equal(shield.params.targets.characteristic, 'Soc');
  assert.equal(shield.params.targets.kind, 'characteristic-bonus');
  const shieldActor = makeActor({ sin: 0, pray: 80 });
  const shieldPreview = previewDivineExecution(shieldActor, shield, targetsFor(shieldActor), {
    canSpeak: true, roll: 23, facts: factsFor(shieldActor), sourceFingerprint: divineRegistry.sourceFingerprint,
    expiry: { phase: 'endOfRound', round: 8 }
  });
  assert.equal(shieldPreview.preview.resolvedParams.range.value, 80, 'Soc 80 donne 80 yards de portée');
  assert.equal(shieldPreview.preview.resolvedParams.targets.value, 8, 'Soc 80 donne 8 alliés admissibles');
  assert.match(shield.labels.effect, /\+1 PA à toutes les Localisations/i);
  if (shield.status === 'implemented') assert.ok(shield.effects.some(effect => effect.type === 'armor-bonus' && effect.value === 1 && effect.locations === 'all'));
  assert.match(inspiring.labels.effect, /Drillé/);
  assert.match(spear.labels.effect, /Dévastatrice/i);
  assert.doesNotMatch(spear.labels.effect, /Percutante/);
  assert.match(eagle.labels.effect, /Perception 55.*Sens aiguisé.*Vol 80/i);
  assert.equal(sun.params.range.kind, 'special');
  assert.equal(sun.params.targets.kind, 'special');
  assert.deepEqual(sun.effects[0].targetRules, ['non-Myrmidian', 'looking-at-priest']);
  assert.deepEqual(sun.effects[0].perSuccessLevels, { every: 2, add: 1 });
  if (sun.status === 'implemented') assert.ok(sun.effects.some(effect => effect.type === 'condition' && effect.key === 'Blinded'));
});
test('Contrôle — neuf sources Up in Arms raccordées au module Myrmidia, plus aucun contrat bloqué', () => {
  const rows = getAllDivineContracts();
  const supplemental = rows.filter(row => row.type === 'miracle' && row.source.document === 'Up in arms.pdf');
  assert.equal(supplemental.length, 9);
  assert.equal(rows.some(row => row.status === 'blocked'), false);
  for (const row of supplemental) {
    assert.ok(['assisted', 'manual'].includes(row.status), row.name);
    assert.equal(row.source.edition, 'V4 EN', row.name);
    assert.equal(row.source.printedPage, 79, row.name);
    assert.equal(row.needsInput.some(item => item === 'v5-adaptation'), false, row.name);
    assert.ok(row.catalogueEntry, row.name);
  }
});

test('Contrôle indépendant — la preuve de la compétence Pray cite sa page imprimée exacte', () => {
  const prayerSkill = divineRegistry.commonPrayerRules.find(row => row.id === 'prayer-skill');
  assert.ok(prayerSkill);
  assert.equal(prayerSkill.source.document, 'Livre de base V5 EN v2.pdf');
  assert.equal(prayerSkill.source.printedPage, 113, 'Pray (Fel) est imprimé p.113; p.129 est Darkness and Tests');
});

test('Contrôle indépendant — la table de Courroux respecte les lignes V5 exactes et les bornes', () => {
  const rows = divineRegistry.wrathTable;
  const expected = [
    [1,5,'Visions sacrées',/Calme Accessible \(\+2 DR\)/],
    [11,15,'Leçons divines',/-1 DR à Prière/],
    [26,30,'Vous ne comprenez pas',/-1 DR aux compétences/],
    [56,60,'Je ne vous aiderai pas',/-1 DR à une compétence/],
    [71,75,'Que sacrifierez-vous ?',/Difficile \(-1 DR\)/],
    [81,87,'Purifiez la chair',/Difficile \(-2 DR\)/],
    [88,88,'Interférence démoniaque',/2d10 m/],
    [151,null,'Rendez des comptes',/Point de Destin/]
  ];
  for (const [min,max,label,reminder] of expected) {
    const row = rows.find(item => item.min === min && item.max === max);
    assert.ok(row, `ligne V5 ${min}-${max} absente`);
    assert.equal(row.label, label);
    assert.match(row.reminder, reminder);
    assert.equal(row.source.document, 'Livre de base V5 EN v2.pdf');
    assert.equal(row.source.printedPage, min <= 100 ? 218 : 219);
  }
  assert.doesNotMatch(rows.find(row => row.min === 1).reminder, /Résistance \+20/);
  assert.doesNotMatch(rows.find(row => row.min === 71).reminder, /-20/);
  assert.doesNotMatch(rows.find(row => row.min === 81).reminder, /-20/);
  assert.deepEqual([100,101,150,151].map(value => rows.find(row => value >= row.min && (row.max === null || value <= row.max))?.id),
    ['wrath:96-100','wrath:101-105','wrath:146-150','wrath:151-plus']);
});

test('Contrôle indépendant — adapter Store choisit la ligne à partir du d100 + 10 par Péché, pas du champ résultat client', () => {
  const shield = getAllDivineContracts().find(row => row.canonicalName === 'Shield of Myrmidia');
  const actor = makeActor({ sin: 1, pray: 80 });
  const state = stateFor(actor);
  const run = (prayRoll, wrathRoll, sin, note='MJ confirme le traitement', extra={}) => {
    const current = structuredClone(state);
    current.combat.participants[0].extensions.v5.divine.sin = sin;
    return previewStoreDivine(current, shield.id, { actorId: actor.id, targetIds: [actor.id], facts: factsFor(actor), canSpeak: true, roll: prayRoll, wrathRoll,
      wrathConsequences: note, wrathResult: { resultId: 'forged:151-plus' }, ...extra, expiry: { phase: 'endOfRound', round: 1 } });
  };
  for (const [prayRoll,wrathRoll,sin,expected,extra] of [[99,90,1,'wrath:96-100'],[99,91,1,'wrath:101-105'],[99,100,5,'wrath:146-150'],[99,91,6,'wrath:151-plus'],[99,78,1,'wrath:88-88',{ wrathSummonProfile: { name: 'Démon mineur', wounds: 10, initiative: 30 }, wrathSummonDistanceRoll: 8, wrathSummonPosition: 'Au fond de la salle', wrathSummonTargetId: actor.id }],[99,77,1,'wrath:81-87']]) {
    const result = run(prayRoll,wrathRoll,sin,'MJ confirme le traitement',extra);
    assert.ok(result.preview?.wrath?.triggered, `Courroux manquant pour ${wrathRoll}+10x${sin}: ${result.error}`);
    assert.equal(result.wrathTableResult?.id, expected);
    assert.equal(result.input.wrathResult.resultId, expected, 'le résultat imposé par le formulaire est ignoré');
  }
  const noNote = run(99,77,1,'');
  assert.equal(noNote.status, 'requires-input');
  assert.ok(noNote.needsInput.some(row=>row.field==='wrathDamageRoll'));
  assert.equal(noNote.ready, false);
  assert.equal(noNote.wrathTableResult.id, 'wrath:81-87');
});
});

describe('moteur divin', () => {
const baseContract = DIVINE_REGISTRY.contracts.find(row => row.id === 'divine:blessing:myrmidia:battle');
const fingerprint = DIVINE_REGISTRY.sourceFingerprint;
const actor = {
  id: 'priest-1', name: 'Priest', skills: [{ id: 'skill-pray', name: 'Prière', carac: 'Soc', status: 'resolved', total: 50 }],
  talents: [{ id: baseContract.requiredTalent.catalogueTalentId, status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  extensions: { v5: { divine: { sin: 0 } } }
};

test('prayer preview requires an explicit d100 and leaves state untouched', () => {
  const before = structuredClone(actor);
  const result = previewDivineExecution(actor, baseContract, [actor], { canSpeak: true, sourceFingerprint: fingerprint,
    facts: { targets: { [actor.id]: { withinRange: true } } } });
  assert.equal(result.ready, false);
  assert.ok(result.needsInput.some(item => item.field === 'roll'));
  assert.deepEqual(actor, before);
});

test('a resolved prayer records fumble as Wrath trigger without inventing Wrath outcome', () => {
  const sinner={...actor,extensions:{v5:{divine:{sin:1}}}};
  const result = previewDivineExecution(sinner, baseContract, [sinner], {
    canSpeak: true, roll: 99, sourceFingerprint: fingerprint, facts: { targets: { [actor.id]: { withinRange: true } } }
  });
  assert.equal(result.ready, false);
  assert.equal(result.status, 'needs-wrath-resolution');
  assert.ok(result.preview);
  assert.equal(result.preview.prayer.success, false);
  assert.equal(result.preview.wrath.triggered, true);
  assert.equal(result.preview.wrath.outcome, null);
  assert.ok(result.preview.reminders.some(item => /Courroux|Wrath/i.test(item)));
});

test('Sin threshold can trigger Wrath on a successful prayer without changing Sin before the Wrath resolves', () => {
  const sinner = { ...actor, extensions: { v5: { divine: { sin: 4 } } } };
  const result = previewDivineExecution(sinner, baseContract, [sinner], {
    canSpeak: true, roll: 23, sourceFingerprint: fingerprint, facts: { targets: { [sinner.id]: { withinRange: true } } }
  });
  assert.equal(result.ready, false);
  assert.equal(result.status, 'needs-wrath-resolution');
  assert.equal(result.preview.prayer.success, true);
  assert.equal(result.preview.wrath.triggered, true);
  assert.equal(result.preview.wrath.sinAtTest, 4);
  assert.equal(result.preview.wrath.sinAfter, 4);
});

test('apply records a resolved prayer once per execution id and rejects reuse', () => {
  const input = { canSpeak: true, roll: 99, wrathRoll: 25, wrathConsequences: 'Résultat de Courroux traité par le MJ.',
    sourceFingerprint: fingerprint, actorId: actor.id, targetIds: [actor.id],
    facts: { targets: { [actor.id]: { withinRange: true } } }, executionId: 'pray-1' };
  const state = { combat: { participants: [actor] }, extensions: { v5: { divineExecutions: [] } } };
  const first = applyDivineExecution(state, baseContract, input);
  assert.equal(first.ready, true, JSON.stringify(first));
  assert.equal(first.receipt.executionId, 'pray-1');
  const repeated = applyDivineExecution(first.state, baseContract, input);
  assert.equal(repeated.ready, false);
  assert.equal(repeated.status, 'duplicate');
  assert.equal(repeated.state.extensions.v5.divineExecutions.length, 1);
});

test('a forged V4 source cannot pass even when its supplied fingerprint matches', () => {
  const forged = structuredClone(baseContract);
  forged.source.document = 'Livre FR V4.pdf';
  const result = previewDivineExecution(actor, forged, [actor], {
    canSpeak: true, roll: 22, sourceFingerprint: fingerprint
  });
  assert.equal(result.ready, false);
  assert.equal(result.status, 'blocked');
});

test('sourced duration extensions change both the layer and its required absolute deadline', () => {
  const target = { ...actor, caracs: { Soc: 50 } };
  const expiry = { phase: 'endOfRound', round: 12 };
  const input = { canSpeak: true, roll: 23, sourceFingerprint: fingerprint, round: 1,
    choices: { duration: 1 }, expiry, actorId: actor.id, targetIds: [target.id], executionId: 'extended-duration',
    facts: { targets: { [target.id]: { withinRange: true } } } };
  const state = { combat: { participants: [target] } };
  const result = applyDivineExecution(state, baseContract, input);
  assert.equal(result.ready, true, result.error);
  assert.equal(result.state.combat.participants[0].extensions.v5.divineEffects[0].duration.value, 12);
  const shortDeadline = previewDivineExecution(target, baseContract, [target], { ...input, expiry: { ...expiry, round: 6 } });
  assert.equal(shortDeadline.ready, false);
  assert.match(shortDeadline.error, /durée sourcée/i);
});

test('a multi-level Blinded condition recovers one level at each target turn', () => {
  const target = { id: 'target', hp: 5, maxHp: 10, states: [], caracs: { E: 40 }, extensions: { v5: {} } };
  const acquired = acquireV5Conditions(target, [{ name: 'Blinded', level: 2 }], { round: 1 });
  assert.equal(acquired.ready, true);
  let state = { combat: { round: 1, currentActorId: 'priest', order: ['priest', target.id], orderMode: 'manual', participants: [
    { id: 'priest', name: 'Priest', zone: 'active', hp: 5, maxHp: 10, states: [], caracs: { E: 40 }, extensions: { v5: {} } },
    { ...acquired.participant, name: 'Target', zone: 'active' }
  ] }, extensions: { v5: { turnIndex: 1 } } };
  const levels = () => state.combat.participants.find(row => row.id === target.id).states
    .filter(row => row.key === 'aveugle').reduce((sum, row) => sum + row.level, 0);
  let turn = previewV5Turn(state); assert.equal(turn.ready, true); state = turn.state; // enters target turn; no recovery yet
  assert.equal(levels(), 2);
  turn = previewV5Turn(state); assert.equal(turn.ready, true); state = turn.state; // target's turn ends: one level recovers
  assert.equal(levels(), 1);
  turn = previewV5Turn(state); assert.equal(turn.ready, true); state = turn.state; // other character's turn does not recover it
  assert.equal(levels(), 1);
  turn = previewV5Turn(state); assert.equal(turn.ready, true); state = turn.state; // target's next turn ends: remaining level recovers
  assert.equal(levels(), 0);
});

test('two synthetic layers sharing a condition state expire without orphaning it', () => {
  const stateId = 'condition:shared-synthetic';
  const participant = { id: 'target-1', states: [{ id: stateId, name: 'État temporaire' }],
    extensions: { v5: { divineEffects: [
      { id: 'layer-first', conditionStateIds: [stateId], expiry: { phase: 'endOfRound', round: 1 } },
      { id: 'layer-second', conditionStateIds: [stateId], expiry: { phase: 'endOfRound', round: 2 } }
    ] } } };
  const first = expireDivineEffects(participant, { phase: 'endOfRound', round: 1 });
  assert.deepEqual(first.removed, ['layer-first']);
  assert.deepEqual(first.participant.extensions.v5.divineEffects.map(layer => layer.id), ['layer-second']);
  assert.equal(first.participant.states.some(state => state.id === stateId), true, 'l’état reste référencé par la seconde couche');

  const second = expireDivineEffects(first.participant, { phase: 'endOfRound', round: 2 });
  assert.deepEqual(second.removed, ['layer-second']);
  assert.deepEqual(second.participant.extensions.v5.divineEffects, []);
  assert.equal(second.participant.states.some(state => state.id === stateId), false, 'l’état disparaît avec sa dernière référence');
});

test('missing, empty, boolean, infinite, composite or non-integer skill totals cannot supply the Pray test score', () => {
  for (const total of [null, '', false, Infinity, 0.5, -1, [], {}]) {
    const invalid = { ...actor, skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', total }] };
    const result = previewDivineExecution(invalid, baseContract, [invalid], { canSpeak: true, roll: 23, sourceFingerprint: fingerprint });
    assert.equal(result.ready, false);
    assert.match(result.error, /Compétence Prière/i);
  }

  const numericString = { ...actor, skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', total: '50' }] };
  const accepted = previewDivineExecution(numericString, baseContract, [numericString], { canSpeak: true, roll: 23,
    sourceFingerprint: fingerprint, round: 1, expiry: { phase: 'endOfRound', round: 6 },
    facts: { targets: { [numericString.id]: { withinRange: true } } } });
  assert.equal(accepted.ready, true, accepted.error);
  assert.equal(accepted.preview.skillScore, 50);
});

test('null, boolean, infinite and composite extension choices are rejected instead of coerced', () => {
  for (const choices of [null, '', false, Infinity, [], {}]) {
    if (choices && typeof choices === 'object' && !Array.isArray(choices)) continue;
    const malformed = previewDivineExecution(actor, baseContract, [actor], { canSpeak: true, roll: 23,
      sourceFingerprint: fingerprint, choices, facts: { targets: { [actor.id]: { withinRange: true } } } });
    assert.equal(malformed.ready, false);
    assert.match(malformed.error, /choix d’extension/i);
  }
  for (const range of [null, '', false, Infinity, [], {}]) {
    const result = previewDivineExecution(actor, baseContract, [actor], { canSpeak: true, roll: 23,
      sourceFingerprint: fingerprint, choices: { range }, facts: { targets: { [actor.id]: { withinRange: true } } } });
    assert.equal(result.ready, false, `range=${String(range)} ne doit pas devenir un choix implicite`);
    assert.match(result.error, /choix d’extension|nombres entiers/i);
  }
});

test('contradictory duplicate Pray rows and invalid characteristic values stop the preview', () => {
  const duplicate = { ...actor, skills: [
    { id: 'skill-pray', name: 'Prière', status: 'resolved', total: 50 },
    { id: 'skill-pray', name: 'Pray', status: 'resolved', total: 51 }
  ] };
  const duplicateResult = previewDivineExecution(duplicate, baseContract, [duplicate], { canSpeak: true, roll: 23, sourceFingerprint: fingerprint });
  assert.equal(duplicateResult.ready, false);
  assert.match(duplicateResult.error, /Compétence Prière/i);

  const shield = DIVINE_REGISTRY.contracts.find(row => row.canonicalName === 'Shield of Myrmidia');
  for (const Soc of [null, '', false, Infinity, 40.5, -1, 101, [], {}]) {
    const invalid = { ...actor, caracs: { Soc }, skills: [{ name: 'Pray', status: 'resolved', total: 50 }],
      talents: [{ id: shield.requiredTalent.catalogueTalentId, status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
      prayers: [{ nom: shield.catalogueName }] };
    const result = previewDivineExecution(invalid, shield, [invalid], { canSpeak: true, roll: 23, sourceFingerprint: fingerprint });
    assert.equal(result.ready, false, `Soc=${String(Soc)} ne doit pas devenir une valeur numérique implicite`);
    assert.match(result.error, /Compétence Prière|valeur de base range/i);
  }
  const ambiguousCaracs = { ...actor, caracs: { Soc: 80, soc: 90 },
    extensions: { v5: { divine: { sin: 0 }, baseCaracs: { Soc: 80 } } } };
  const ambiguous = previewDivineExecution(ambiguousCaracs, baseContract, [ambiguousCaracs], {
    canSpeak: true, roll: 23, sourceFingerprint: fingerprint, round: 1,
    expiry: { phase: 'endOfRound', round: 6 }, facts: { targets: { [ambiguousCaracs.id]: { withinRange: true } } }
  });
  assert.equal(ambiguous.ready, false, 'des clés de même carac avec valeurs divergentes doivent bloquer');
  assert.match(ambiguous.error, /Compétence Prière/i);
});

test('E4 — un État de Prière résolu contribue au Test; les modificateurs de fiche restent explicites', () => {
  const stunned = { ...actor, states: [{ key: 'sonne', level: 1 }] };
  const resolved = previewDivineExecution(stunned, baseContract, [stunned], { canSpeak: true, roll: 23, sourceFingerprint: fingerprint,
    round: 1, expiry: { phase: 'endOfRound', round: 6 }, facts: { targets: { [stunned.id]: { withinRange: true } } } });
  assert.equal(resolved.ready, true, resolved.error);
  assert.deepEqual(resolved.preview.conditionTestContext.slModifiers.map(row => row.amount), [-1]);
  assert.equal(resolved.preview.prayer.sl, resolved.preview.prayer.details.baseSl - 1);

  const modified = { ...actor, extensions: { v5: { divine: { sin: 0 }, testModifiers: { Prière: -1 } } } };
  const withModifier = previewDivineExecution(modified, baseContract, [modified], { canSpeak: true, roll: 23,
    sourceFingerprint: fingerprint, round: 1, expiry: { phase: 'endOfRound', round: 6 },
    facts: { targets: { [modified.id]: { withinRange: true } } } });
  assert.equal(withModifier.ready, true, withModifier.error);
  assert.equal(withModifier.preview.slModifiers[0].amount, -1);
  assert.equal(withModifier.preview.prayer.sl, withModifier.preview.prayer.details.baseSl - 1);
});

test('self/self miracles still enforce canonical targets and their sourced duration', () => {
  const spear = DIVINE_REGISTRY.contracts.find(row => row.canonicalName === 'Spear of Myrmidia');
  const priest = { ...actor, caracs: { Soc: 50 }, skills: [{ name: 'Pray', status: 'resolved', total: 50 }],
    talents: [{ id: spear.requiredTalent.id, status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
    prayers: [{ nom: spear.catalogueName }] };
  const foe = { id: 'foe-1', name: 'Opponent' };
  const wrongTarget = previewDivineExecution(priest, spear, [foe], { canSpeak: true, roll: 23,
    sourceFingerprint: fingerprint, round: 1, expiry: { phase: 'endOfRound', round: 5 } });
  assert.equal(wrongTarget.ready, false);
  assert.match(wrongTarget.error, /se cible elle-même/i);

  const self = previewDivineExecution(priest, spear, [priest], { canSpeak: true, roll: 23,
    sourceFingerprint: fingerprint, round: 1, expiry: { phase: 'endOfRound', round: 5 }, facts: { weapon: { equipmentId: 'spear' } } });
  assert.equal(self.ready, true, self.error);
  assert.equal(self.status, 'ready');
  assert.equal(self.preview.resolvedParams.targets.unit, 'self');
});

test('raw prayer rows from fiche-sync establish a catalog-pinned learned miracle', () => {
  const shield = DIVINE_REGISTRY.contracts.find(row => row.canonicalName === 'Shield of Myrmidia');
  const snapshot = ficheSnapshot('priest-1', { nom: 'Priest', race: 'humain', carac: { soc: { base: 80 } },
    skillsAdvanced: [{ nom: 'Prière', adv: 0 }],
    talentsAcq: [{ nom: 'Invocation (Myrmidia)' }], prieres: [{ nom: shield.catalogueName }] });
  const priest = { ...snapshot, id: actor.id, zone: 'active', extensions: { v5: { divine: { sin: 0 } } } };
  const result = previewDivineExecution(priest, shield, [priest], { canSpeak: true, roll: 23,
    sourceFingerprint: fingerprint, round: 1, expiry: { phase: 'endOfRound', round: 8 },
    facts: { targets: { [priest.id]: { withinRange: true, ally: true } } } });
  assert.equal(result.ready, true, result.error);
  assert.equal(result.preview.resolvedParams.duration.value, 8);

  const importedWithModifier = { ...priest, caracs: { ...priest.caracs, Soc: 90 },
    talents: actor.talents, extensions: { v5: { divine: { sin: 0 }, baseCaracs: { Soc: 80 } } } };
  const baseBefore = importedWithModifier.extensions.v5.baseCaracs.Soc;
  const blessing = previewDivineExecution(importedWithModifier, baseContract, [importedWithModifier], {
    canSpeak: true, roll: 23, sourceFingerprint: fingerprint, round: 1,
    expiry: { phase: 'endOfRound', round: 6 },
    facts: { targets: { [importedWithModifier.id]: { withinRange: true } } }
  });
  assert.equal(blessing.ready, true, blessing.error);
  assert.equal(blessing.preview.skillScore, 90, 'le carac soc importé doit trouver Soc courant et son +10 temporaire');
  assert.equal(importedWithModifier.extensions.v5.baseCaracs.Soc, baseBefore, 'le calcul ne modifie pas le socle');
  assert.equal(snapshot.caracs.Soc, 80, 'la fiche source reste inchangée');
});
});

describe('Store divin', () => {
const contracts=getAllDivineContracts();
const BATTLE='divine:blessing:myrmidia:battle',SHIELD='divine:miracle:bouclier-de-myrmidia',SUN='divine:miracle:soleil-flamboyant';
const actor=(id,extra={})=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',initiative:60,hp:20,maxHp:30,caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},
 skills:[{id:'skill-50_72_69_e8_72_65-base',name:'Prière',status:'resolved',carac:'Soc',total:60}],
 talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'},{id:'talent-invoke',status:'resolved',rank:1,specialization:'Myrmidia'}],
 prayers:contracts.filter(c=>c.type==='miracle').map(c=>({name:c.catalogueName,status:'resolved'})),equipment:[],traits:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{divine:{sin:0},channelling:{type:'winds',sl:17}}},...extra});
const envelope=s=>{const value=JSON.parse(s.getFullJSON());delete value.exportedAt;return value;};
const person=(s,id)=>s.listParticipants().find(p=>p.id===id);
async function fixture(options={}){const s=createStore(options);await s.ready;await s.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[actor('priest'),actor('ally',{initiative:30})]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});return s;}
const input=(more={})=>({actorId:'priest',targetIds:['ally'],roll:45,canSpeak:true,choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true,ally:true}}},expiry:{phase:'endOfTurn',round:6,actorId:'priest',moment:'afterEffects'},...more});

test('bénédiction appliquée : valeur effective, réserve magique préservée, rechargement, Undo et Redo',async()=>{
 const s=await fixture();const preview=s.previewDivineExecution(BATTLE,input());assert.equal(preview.ready,true,preview.error);
 const result=await s.applyDivineExecution(BATTLE,{preview});assert.equal(result.ready,true,result.error);
 assert.equal(person(s,'ally').caracs.CC,50);assert.equal(person(s,'priest').extensions.v5.channelling.sl,17);
 const loaded=createStore();await loaded.ready;await loaded.loadFromJSON(envelope(s));assert.equal(person(loaded,'ally').caracs.CC,50);
 await s.undo();assert.equal(person(s,'ally').caracs.CC,40);await s.redo();assert.equal(person(s,'ally').caracs.CC,50);
});

test('une révision périmée et un double clic sont refusés sans seconde couche',async()=>{
 const s=await fixture(),p=s.previewDivineExecution(BATTLE,input());assert.equal(p.ready,true,p.error);
 await s.updateParticipant('ally',{hp:19});const before=envelope(s);
 await assert.rejects(async()=>s.applyDivineExecution(BATTLE,{preview:p}),/changé/);assert.deepEqual(envelope(s),before);
 const fresh=s.previewDivineExecution(BATTLE,input());await s.applyDivineExecution(BATTLE,{preview:fresh});const after=envelope(s);
 await assert.rejects(async()=>s.applyDivineExecution(BATTLE,{preview:fresh}),/changé|déjà/);assert.deepEqual(envelope(s),after);
});

test('une sauvegarde refusée laisse l’état, l’historique et le jet récupérables',async()=>{
 let refuse=false;const persistence={load:async()=>null,saveAtomic:async()=>refuse?{ok:false,error:'Sauvegarde refusée'}:{ok:true}};
 const s=await fixture({persistence});const preview=s.previewDivineExecution(BATTLE,input());assert.equal(preview.ready,true,preview.error);const before=envelope(s);
 refuse=true;const result=await s.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,false);assert.deepEqual(envelope(s),before);assert.equal(preview.input.roll,45);
 refuse=false;assert.equal((await s.applyDivineExecution(BATTLE,{preview})).ready,true);
});

test('le jet, les faits, les cibles et le résultat confirmés restent ceux de l’aperçu émis',async()=>{
 const s=await fixture();const preview=s.previewDivineExecution(BATTLE,input());assert.equal(preview.ready,true,preview.error);
 const before=envelope(s);
 for(const mutate of [
  p=>{p.input.roll=81;},p=>{p.input.targetIds=['priest'];},
  p=>{p.input.choices.duration=1;},p=>{p.input.facts.targets.ally.withinRange=false;},
  p=>{p.preview.prayer.sl=20;},p=>{p.executionId='divine:invented';}
 ]){
  const modified=structuredClone(preview);mutate(modified);
  await assert.rejects(async()=>s.applyDivineExecution(BATTLE,{preview:modified}),/aperçu.*modifié|recalculez/);
  assert.deepEqual(envelope(s),before);
 }
 const applied=await s.applyDivineExecution(BATTLE,{preview:structuredClone(preview)});
 assert.equal(applied.receipt.prayer.roll,45);assert.equal(applied.receipt.prayer.success,true);
});

test('une méthode toJSON cliente ne peut pas masquer une altération de l’aperçu',async()=>{
 const s=await fixture(),preview=s.previewDivineExecution(BATTLE,input()),original=structuredClone(preview);
 preview.input.roll=81;preview.toJSON=()=>original;const before=envelope(s);
 assert.throws(()=>applyStoreDivine(before,BATTLE,{preview}),/aperçu.*modifié|recalculez/);
 assert.deepEqual(envelope(s),before);
});

test('l’expiration réelle retire uniquement la bénédiction et conserve les Blessures subies',async()=>{
 const s=await fixture(),preview=s.previewDivineExecution(BATTLE,input());await s.applyDivineExecution(BATTLE,{preview});await s.updateParticipant('ally',{hp:11});
 for(let i=0;i<12;i++)await s.nextTurn();
 assert.equal(person(s,'ally').caracs.CC,40);assert.equal(person(s,'ally').hp,11);assert.equal(person(s,'ally').extensions.v5.divineEffects.length,0);
});

test('le Bouclier modifie les PA lus par le combat avec armure de fiche',async()=>{
 const s=await fixture();await s.updateParticipant('ally',{armorLocations:{head:2,body:2,leftArm:2,rightArm:2,leftLeg:2,rightLeg:2}});
 const preview=s.previewDivineExecution(SHIELD,input({expiry:{phase:'endOfTurn',round:6,actorId:'priest'}}));assert.equal(preview.ready,true,preview.error);
 await s.applyDivineExecution(SHIELD,{preview});
 assert.equal(locationProtection(person(s,'ally'),{location:'body'}).ap,3);assert.equal(person(s,'ally').extensions.v5.divineEffects[0].apModifiers.all,1);
});

test('Soleil : faits requis, États réels, paliers et absence de couche à échéance inventée',async()=>{
 const s=await fixture();let p=s.previewDivineExecution(SUN,input({expiry:undefined}));assert.equal(p.ready,false);
 p=s.previewDivineExecution(SUN,input({expiry:undefined,facts:{targets:{ally:{withinRange:true,nonMyrmidian:true,lookingAtPriest:true}}}}));assert.equal(p.ready,true,p.error);
 await s.applyDivineExecution(SUN,{preview:p});assert.equal(person(s,'ally').states.filter(row=>row.key==='aveugle').reduce((n,row)=>n+row.level,0),2);
});

test('Courroux : d100 et durée explicite requis, ligne canonique puis Péchés décrémentés une fois',async()=>{
 const s=await fixture();await s.setDivineSin('priest',2,{reason:'Préparation du scénario'});
 const basic=input({roll:22});const missing=s.previewDivineExecution(BATTLE,basic);assert.equal(missing.ready,false);assert.equal(person(s,'priest').extensions.v5.divine.sin,2);
 const preview=s.previewDivineExecution(BATTLE,{...basic,wrathRoll:3,wrathDurationRoll:2,wrathRoundPolicy:'current'});assert.equal(preview.ready,true,preview.error);assert.ok(preview.wrathTableResult);
 assert.equal(preview.wrathTableResult.min,21);assert.equal(preview.wrathTableResult.max,25);
 await s.applyDivineExecution(BATTLE,{preview});assert.equal(person(s,'priest').extensions.v5.divine.sin,1);
});

test('previewStoreDivine avec Courroux et une cible distincte ne mutate pas le prêtre',async()=>{
 const s=await fixture();await s.setDivineSin('priest',1,{reason:'Préparation pureté du preview'});
 const before=envelope(s);
 const preview=s.previewDivineExecution(SUN,input({roll:21,wrathRoll:78,
  wrathSummonProfile:{name:'Démon mineur',wounds:10,initiative:30},wrathSummonDistanceRoll:8,wrathSummonPosition:'Au fond de la salle',wrathSummonTargetId:'ally',
  facts:{targets:{ally:{withinRange:true,nonMyrmidian:true,lookingAtPriest:true}}}}));
 assert.equal(preview.ready,true,preview.error);
 assert.equal(preview.preview.wrath.sinAfter,0);
 assert.deepEqual(envelope(s),before,'Calculer un Courroux ciblant un allié ne modifie ni la fiche ni le snapshot du prêtre');
});

test('les paramètres d’un contrat fourni par le client ne remplacent jamais le registre',async()=>{
 const s=await fixture(),contract=s.getDivineContract(BATTLE);contract.effects=[{type:'characteristic-modifier',characteristic:'CC',value:999}];
 const p=s.previewDivineExecution(contract,input());assert.equal(p.ready,false);assert.match(p.error,/inconnue/);
});

test('un second prêtre peut utiliser la même bénédiction sans cumuler le bonus sur une cible',async()=>{
 const s=await fixture();await s.applyDivineExecution(BATTLE,{preview:s.previewDivineExecution(BATTLE,input())});
 const p=s.previewDivineExecution(BATTLE,input({actorId:'ally',targetIds:['ally'],expiry:{phase:'endOfTurn',round:6,actorId:'ally'}}));assert.equal(p.ready,true,p.error);
 await s.applyDivineExecution(BATTLE,{preview:p});assert.equal(person(s,'ally').caracs.CC,50);
});

test('terminer une prière via le Store retire sa couche et Annuler la restitue',async()=>{
 const s=await fixture({persistence:{load:async()=>null,saveAtomic:async()=>({ok:true})}});
 const p=s.previewDivineExecution(SHIELD,input());assert.equal(p.ready,true,p.error);await s.applyDivineExecution(SHIELD,{preview:p});
 assert.equal(person(s,'ally').armor.body,1);
 await s.endDivinePrayer(p.executionId,{reason:'Fin anticipée déclarée',baseRevision:s.getLocalRevision()});
 assert.equal(person(s,'ally').extensions.v5.divineEffects?.length||0,0);assert.equal(person(s,'ally').armor.body,0);
 await s.undo();assert.equal(person(s,'ally').extensions.v5.divineEffects.length,1);assert.equal(person(s,'ally').armor.body,1);
});
});

describe('Up in Arms', () => {
// Up in Arms p.79 : les neuf miracles de Myrmidia raccordés au module docs/divin/sources/miracles/myrmidia-up-in-arms.mjs,
// contre les vrais contrats générés (à lancer après `node tools/build-v5-divine-contracts.mjs`).
const inventory = JSON.parse(readFileSync('docs/divin/DIVIN_INVENTAIRE.json', 'utf8'));
const SHA = '0671b27d0e947c7c5387fd4b30cda0512f9182dc811cc0275a18acc96af5fa07';
const nine = [
  ['Commander la Légion', 'Command the Legion', 'commander-la-legion', 'assisted'],
  ["Effrayer l'Ennemi", 'Dismay Foe', 'effrayer-l-ennemi', 'assisted'],
  ['En Bon Ordre', 'In Good Order', 'en-bon-ordre', 'assisted'],
  ['Connaître son Ennemi', 'Know Your Enemy', 'connaitre-son-ennemi', 'manual'],
  ['Sur un Terrain Mortel', 'On Deadly Ground', 'sur-un-terrain-mortel', 'assisted'],
  ['Attaque Rapide', 'Quick Strike', 'attaque-rapide', 'assisted'],
  ['Dévotion de la Guerrière', 'Shieldmaiden’s Devotion', 'devotion-de-la-guerriere', 'assisted'],
  ['Compétence Martiale', 'Skill of Combat', 'competence-martiale', 'assisted'],
  ['Vindicte Vengeresse', 'Vengeful Wrath', 'vindicte-vengeresse', 'manual']
];
const byName = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.catalogueName === name);
const LEGION = 'divine:miracle:commander-la-legion', DISMAY = 'divine:miracle:effrayer-l-ennemi', SKILL = 'divine:miracle:competence-martiale';
const BATTLE = 'divine:blessing:myrmidia:battle';

test('provenance : les neuf contrats gardent leur id et leur entrée de catalogue, sans doublon de module', () => {
  const rows = registry.contracts.filter(row => row.type === 'miracle' && row.source.document === 'Up in arms.pdf');
  assert.equal(rows.length, 9);
  assert.equal(registry.contracts.filter(row => row.id.startsWith('divine:miracle:myrmidia:')).length, 0, 'aucun id de module Myrmidia en doublon');
  assert.equal(new Set(registry.contracts.map(row => row.id)).size, registry.contracts.length);
  for (const [name, canonical, slug, status] of nine) {
    const row = byName(name);
    assert.equal(row.id, `divine:miracle:${slug}`);
    assert.equal(row.canonicalName, canonical);
    assert.equal(row.status, status, name);
    assert.deepEqual(Object.keys(row.catalogueEntry), ['nom', 'portee', 'cible', 'duree', 'effet']);
    assert.equal(row.catalogueEntry.nom, name);
    assert.deepEqual(Object.keys(row.sourceReceipt), ['catalogueCsvSha256', 'referenceSnapshotSha256', 'catalogueSnapshotVersion', 'sourceBookSha256']);
    assert.equal(row.sourceReceipt.sourceBookSha256, SHA);
    assert.equal(row.source.fileSha256, SHA);
    assert.equal(row.source.printedPage, 79);
    assert.equal(row.source.edition, 'V4 EN');
    assert.equal(row.clauses[0].id, 'catalogue-entry');
    assert.ok(row.clauses.some(clause => clause.mode === 'manual'), `${name} garde au moins un rappel manuel`);
    assert.ok(row.effects.every(effect => effectHandlers[effect.type]), name);
  }
  assert.ok(registry.sourceManifest.supplementBooks.some(book => book.bookId === 'L13' && book.document === 'Up in arms.pdf' && book.fileSha256 === SHA));
});

test('inventaire : plus aucun miracle bloqué, neuf miracles Up in Arms connectés', () => {
  assert.equal(inventory.counts.miracles, 15);
  assert.equal(inventory.counts.miraclesSupplementSourceFound, 9);
  assert.equal(inventory.counts.miraclesV4AdaptationBlocked, 0);
  assert.equal(inventory.sourceCounts.miraclesUpInArmsConnected, 9);
  assert.deepEqual(inventory.sourceCounts.upInArmsByStatus, { assisted: 7, manual: 2 });
  assert.equal(registry.contracts.some(row => row.status === 'blocked'), false);
  assert.equal(inventory.items.filter(row => row.type === 'miracle' && row.source.document === 'Up in arms.pdf').length, 9);
});

test('paramètres : portées, durées et zones arbitrées par le MJ', () => {
  const params = name => byName(name).params;
  assert.deepEqual(params('Commander la Légion'), { range: { kind: 'special' }, targets: { kind: 'special' }, duration: { kind: 'fixed', value: 1, unit: 'rounds' } });
  assert.deepEqual(params('Effrayer l\'Ennemi').duration, { kind: 'fixed', value: 1, unit: 'rounds' });
  // Q4 : zones en Bonus de Volonté, portée de Connaître son Ennemi en caractéristique entière.
  assert.deepEqual(params('En Bon Ordre').targets, { kind: 'area', characteristicBonus: 'FM', unit: 'yards' });
  assert.deepEqual(params('Connaître son Ennemi').range, { kind: 'characteristic', characteristic: 'FM', unit: 'yards' });
  assert.deepEqual(params('Connaître son Ennemi').duration, { kind: 'instant' });
  // Q6 : durée de Sur un Terrain Mortel non imprimée, Bonus de Volonté en Rounds, signalée comme non attestée.
  assert.deepEqual(params('Sur un Terrain Mortel').duration, { kind: 'characteristic-bonus', characteristic: 'FM', unit: 'rounds' });
  assert.ok(byName('Sur un Terrain Mortel').clauses.some(clause => clause.id === 'duration-unattested' && /NON ATTESTÉE/.test(clause.text)));
  assert.match(byName('Sur un Terrain Mortel').sourceDelta, /Durée non attestée/);
  assert.deepEqual(params('Attaque Rapide').duration, { kind: 'fixed', value: 3, unit: 'rounds' });
  assert.deepEqual(params('Dévotion de la Guerrière').range, { kind: 'fixed', value: 36, unit: 'yards' });
  assert.deepEqual(params('Dévotion de la Guerrière').duration, { kind: 'fixed', value: 4, unit: 'rounds' });
  assert.deepEqual(params('Compétence Martiale').range, { kind: 'fixed', value: 24, unit: 'yards' });
  assert.deepEqual(params('Compétence Martiale').duration, { kind: 'fixed', value: 4, unit: 'rounds' });
  assert.deepEqual(params('Vindicte Vengeresse').duration, { kind: 'fixed', value: 6, unit: 'rounds' });
});

const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture() {
  const persistence = memory();
  const store = createStore({ persistence, storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [actor('priest'), actor('ally', { initiative: 30 })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  store.persistence = persistence;
  return store;
}
const input = (more = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, ...more });
async function cast(store, contractId, more) {
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const mods = (store, id) => person(store, id).extensions.v5.testModifiers ?? {};
const allyFacts = { targetIds: ['ally'], facts: { targets: { ally: { ally: true, withinRange: true } } } };

test('Commander la Légion : +1 DR aux Tests de Commandement du prêtre, rien pour l’allié, retiré à l’échéance', async () => {
  const contract = getDivineContract(LEGION);
  assert.deepEqual(contract.effects.map(effect => [effect.type, effect.modifiers, effect.appliesTo]), [['test-modifier', { Commandement: 1 }, 'caster']]);
  const store = await fixture();
  const { preview } = await cast(store, LEGION, { targetIds: ['ally'], expiry: { phase: 'endOfTurn', round: 1, actorId: 'priest' } });
  assert.deepEqual(preview.preview.effects[0].modifiers, { Commandement: 1 });
  assert.deepEqual(mods(store, 'priest'), { Commandement: 1 });
  assert.deepEqual(mods(store, 'ally'), {});
  await store.undo();
  assert.deepEqual(mods(store, 'priest'), {});
  await store.redo();
  for (let i = 0; i < 12; i++) await store.nextTurn();
  assert.deepEqual(mods(store, 'priest'), {});
  assert.equal((person(store, 'priest').extensions.v5.divineEffects || []).length, 0);
});

test('Effrayer l’Ennemi : Trait Terreur (1) sur le prêtre pendant la durée, puis retiré', async () => {
  const store = await fixture();
  await cast(store, DISMAY, { expiry: { phase: 'endOfTurn', round: 1, actorId: 'priest' } });
  assert.ok(person(store, 'priest').traits.includes('Terreur (1)'));
  assert.ok(!person(store, 'ally').traits.includes('Terreur (1)'));
  for (let i = 0; i < 12; i++) await store.nextTurn();
  assert.ok(!person(store, 'priest').traits.includes('Terreur (1)'));
});

test('Compétence Martiale : +10 CC et +10 CT à l’allié désigné, retiré à l’échéance', async () => {
  const store = await fixture();
  const before = { CC: person(store, 'ally').caracs.CC, CT: person(store, 'ally').caracs.CT };
  const preview = store.previewDivineExecution(SKILL, input({ ...allyFacts, expiry: { phase: 'endOfTurn', round: 4, actorId: 'priest' } }));
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  assert.equal(person(store, 'ally').caracs.CC, before.CC, 'l’aperçu ne modifie rien');
  const result = await store.applyDivineExecution(SKILL, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(person(store, 'ally').caracs.CC, before.CC + 10);
  assert.equal(person(store, 'ally').caracs.CT, before.CT + 10);
  assert.equal(person(store, 'priest').caracs.CC, 40, 'le prêtre n’est pas désigné');
  await store.undo();
  assert.equal(person(store, 'ally').caracs.CC, before.CC);
  await store.redo();
  for (let i = 0; i < 12; i++) await store.nextTurn();
  assert.equal(person(store, 'ally').caracs.CC, before.CC);
  assert.equal(person(store, 'ally').caracs.CT, before.CT);
  assert.equal((person(store, 'ally').extensions.v5.divineEffects || []).length, 0);
});

test('Compétence Martiale : non-cumul des +10 CC avec la Bénédiction de Bataille (règle établie), +10 CT conservé', async () => {
  const store = await fixture();
  await cast(store, BATTLE, allyFacts);
  assert.equal(person(store, 'ally').caracs.CC, 50);
  // Deux prières distinctes ne s'excluent pas (la p.217 n'interdit que la même prière), mais le bonus de caractéristique ne s'additionne pas : le meilleur seul vaut.
  const { result } = await cast(store, SKILL, { ...allyFacts, expiry: { phase: 'endOfTurn', round: 4, actorId: 'priest' } });
  assert.equal(person(store, 'ally').caracs.CC, 50, 'les deux +10 CC ne se cumulent pas');
  assert.equal(person(store, 'ally').caracs.CT, 50, 'le +10 CT de Compétence Martiale s’applique');
  assert.ok(result.ready);
  await store.undo();
  assert.equal(person(store, 'ally').caracs.CC, 50);
  assert.equal(person(store, 'ally').caracs.CT, 40);
  // Relancer la même prière tant qu'elle est active reste interdit.
  assert.equal(store.previewDivineExecution(BATTLE, input(allyFacts)).ready, false);
});

test('statuts honnêtes : un contrat manuel ne porte aucun effet appliqué, les clauses restantes sont des rappels', () => {
  for (const [name, , , status] of nine) {
    const row = byName(name);
    if (status === 'manual') {
      assert.deepEqual(row.effects, [], name);
      assert.ok(row.clauses.filter(clause => clause.id !== 'catalogue-entry').every(clause => clause.mode === 'manual'), name);
    }
  }
  // Dévotion de la Guerrière : assistée, l'ennemi est saisi au lancement (un Sans peur [Ennemi] sans spécialisation ne s'applique à aucun ennemi : fait manquant talent.specialization).
  assert.equal(byName('Dévotion de la Guerrière').status, 'assisted');
  assert.match(byName('Dévotion de la Guerrière').sourceDelta, /talent.specialization/);
  assert.ok(byName('En Bon Ordre').clauses.some(clause => clause.id === 'broken-from-fleeing'));
  assert.ok(byName('Vindicte Vengeresse').clauses.some(clause => clause.id === 'unrepentant'));
  assert.ok(byName('Attaque Rapide').clauses.some(clause => clause.id === 'free-attack'));
});

test('un contrat manuel Up in Arms ne produit aucun effet via le Store (rappels seulement)', async () => {
  const store = await fixture();
  const row = byName('Vindicte Vengeresse');
  const preview = store.previewDivineExecution(row.id, input());
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  assert.deepEqual(preview.preview.effects, []);
  const before = clone(person(store, 'priest').caracs);
  await store.applyDivineExecution(row.id, { preview });
  assert.deepEqual(mods(store, 'priest'), {});
  assert.deepEqual(person(store, 'priest').caracs, before);
  // Seule une couche de rappel manuel est posée : aucune donnée de jeu (modificateur, Trait, caractéristique).
  const layers = person(store, 'priest').extensions.v5.divineEffects || [];
  assert.ok(layers.every(layer => layer.id.endsWith(':manual-prayer-reminder') && !layer.testModifiers && !layer.traits && !layer.characteristics));
});
});
