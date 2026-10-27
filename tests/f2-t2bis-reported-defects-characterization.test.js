import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCombatTest, v5ShieldDefense } from '../js/core/v5-combat-rules.js';
import { locationProtection } from '../js/core/equipment.js';
import { createStore } from '../js/core/store.js';

test('T2 bis characterization — Perdez votre prochaine Action ne bloque pas un Test hors Action', () => {
  const actor={id:'a',states:[],skills:[],extensions:{v5:{combatEffects:[{id:'fumble',kind:'lose-next-action'}]}}};
  const result=buildCombatTest({actor,action:{type:'test',label:'Endurance',base:40},roll:25,v5:{kind:'test',context:{isAction:false}},round:1});
  assert.equal(result.restrictions.some(row=>row.includes('cette Action est perdue')),false);
});

for(const label of ['Ag','Escrime','Bagarre']) test(`T2 bis characterization — Bouclier reconnaît ${label} par libellé`, () => {
  const target={equipment:[{id:'shield',kind:'shield',ap:2,keywords:[{id:'bouclier'}]}],extensions:{v5:{}}};
  const result=v5ShieldDefense({target,defense:{label},protectionContext:{shieldId:'shield',shieldAvailable:true,opposedWithShield:true},attackContext:{ranged:false}});
  assert.equal(result.v5Bonus,true,`${label} doit être une défense recevable avec un bouclier`);
  assert.equal(result.rating,2);
});

test('T2 bis characterization — PA du bouclier attaché ne couvrent que Tête, Corps et bras non directeur', () => {
  const shield={id:'shield',kind:'shield',name:'Pavois',ap:2,locations:['head','body','leftArm','rightArm','leftLeg','rightLeg'],keywords:[{id:'bouclier'}]};
  const target={equipment:[shield],extensions:{v5:{}}};
  const common={shieldId:'shield',shieldAvailable:true,defenseProvided:true,opposedWithShield:true,ranged:false,shieldAttached:true,nonDominantArmSide:'left'};
  for(const location of ['head','body','leftArm']) {
    assert.equal(locationProtection(target,{...common,location}).shieldAp,2,`${location} couvert`);
  }
  for(const location of ['rightArm','leftLeg','rightLeg']) {
    assert.equal(locationProtection(target,{...common,location}).shieldAp,0,`${location} non couvert`);
  }
});

test('T2 bis characterization — PA de défense du bouclier tiennent compte des dégâts d’équipement', () => {
  const shield={id:'shield',kind:'shield',ap:2,keywords:[{id:'bouclier'}]};
  const target={equipment:[shield],extensions:{v5:{armorDamageByItem:{shield:1}}}};
  const result=v5ShieldDefense({target,defense:{label:'Esquive'},protectionContext:{shieldId:'shield',shieldAvailable:true,opposedWithShield:true},attackContext:{ranged:false}});
  assert.equal(result.rating,1);
});

test('T2 bis characterization — décide la mort au Round courant du Store, même si options.round est fourni', async () => {
  let saved;
  const persistence={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const store=createStore({persistence,storage:null}); await store.ready;
  const participant={id:'p',name:'P',kind:'PJ',zone:'active',hp:0,maxHp:10,caracs:{BE:0},states:[{id:'u',key:'inconscient',name:'Inconscient'}],extensions:{v5:{criticalDeath:{status:'awaiting-mj',dueRound:3,toughnessBonus:0,criticalIds:['c']},criticalWounds:[{id:'c'}]}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:2,currentActorId:'p',order:['p'],participants:[participant]},extensions:{v5:{}}});
  const result=await store.decideCriticalDeath('p','confirm',{round:3});
  assert.notEqual(result?.ok,false,'Round 2 du Store doit prévaloir sur options.round=3');
  assert.equal(store.listParticipants().find(row=>row.id==='p').extensions.v5.dead,undefined);
});
