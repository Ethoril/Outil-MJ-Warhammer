// Bénédiction de Chance (V5 p.221) : une relance gratuite du prochain Test échoué, consommée à l'usage.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getAllDivineContracts } from '../js/core/v5-divine-store.js';

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
