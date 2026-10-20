import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';

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
