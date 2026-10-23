import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,cast,level} from './helpers/lot3-domain-fixture.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';
import L06 from '../js/data/bestiary/L06.json' with {type:'json'};

const printed=id=>L06.profiles.find(p=>p.id===id);
const raised=(store,c)=>store.listParticipants().filter(p=>p.id.startsWith('aux-'+c.id));

test('B3 Relever les morts — Squelettes aux valeurs imprimées, À Terre, contrôlés, plus de participant générique',async()=>{
 const c=getSpellContract('Relever les morts');
 const {store}=await encounter();
 await cast(store,c,{sl:2,domainFactsExtra:{minutesToDawn:5}});
 const list=raised(store,c),skeleton=printed('E0-P-093');
 assert.ok(list.length>=2);
 for(const s of list){
  assert.equal(s.hp,skeleton.wounds);assert.equal(s.maxHp,skeleton.wounds);assert.equal(s.caracs.CC,skeleton.stats.CC);assert.equal(s.caracs.F,skeleton.stats.F);
  assert.equal(s.actions.length,skeleton.attacks.filter(a=>!a.optional).length);assert.ok(s.actions.length>0);
  assert.equal(s.extensions.v5.bestiary.id,'E0-P-093');assert.ok(!s.extensions.v5.genericSummon);
  assert.equal(level(s,'À Terre'),1);assert.ok(s.traits.includes('Mort-vivant'));assert.equal(s.extensions.v5.summonOwnerId,'mage');
 }
});

test('B3 Réanimation — Zombies ou Squelettes d’après le choix, profil imprimé de chacun',async()=>{
 const c=getSpellContract('Réanimation');
 for(const [kind,id] of [['zombies','E0-P-094'],['skeletons','E0-P-093']]){
  const {store}=await encounter();
  await cast(store,c,{sl:1,domainFactsExtra:{minutesToDawn:5,undeadKind:kind}});
  const list=raised(store,c);assert.ok(list.length>1,kind);
  assert.ok(list.every(p=>p.extensions.v5.bestiary.id===id&&p.hp===printed(id).wounds&&level(p,'À Terre')===1),kind);
 }
});

test('B3 Manifestation de Démon Mineur — Sanguinaire de Khorne ou Démonette de Slaanesh ; camp ennemi si le démon l’emporte',async()=>{
 const c=getSpellContract('Manifestation de Démon Mineur');
 for(const [kind,outcome,id,name,camp] of [['bloodletter','obeys','E0-P-107','Sanguinaire de Khorne','pj'],['daemonette','attacks','E0-P-108','Démonette de Slaanesh','ennemi']]){
  const {store}=await encounter();
  await cast(store,c,{sl:1,domainFactsExtra:{daemonKind:kind,commandOutcome:outcome}});
  const list=raised(store,c);assert.equal(list.length,1,kind);
  const [d]=list;assert.equal(d.name,name);assert.equal(d.hp,printed(id).wounds);assert.equal(d.extensions.v5.bestiary.id,id);
  assert.equal(d.camp,camp===  'pj'?store.listParticipants().find(p=>p.id==='mage').camp:camp);
 }
});
