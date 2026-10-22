import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,level,cast,inputFor,verifySpell} from './helpers/lot3-domain-fixture.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';
import {UNDEAD_SUMMON_PROFILES,setUndeadProfilesAvailable} from '../js/data/v5-transformation-bestiary.js';

// L06 pp. 258-259 : [nom FR, nom EN, page, NI, portée, cible, durée]
const SOURCE=[
 ['Relever les morts','Raise Dead',258,7,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Jusqu’au lever du soleil'],
 ['Réanimation','Reanimate',258,8,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Jusqu’au lever du soleil'],
 ['Crâne hurlant','Screaming Skull',259,8,'Force Mentale mètres','Spécial','Instantané'],
 ['L’appel de Vanhel','Vanhel’s Call',259,6,'Force Mentale mètres','Spécial','Instantané']
];
for(const [fr,en,page,cn,range,target,duration] of SOURCE)test(`Nécromancie L06 p. ${page} — ${fr} : paramètres relus, domaine, aucun attribut ni ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'necromancy');assert.equal(c.type,'Domaine de la Nécromancie');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const FACTS={'Relever les morts':{minutesToDawn:5},'Réanimation':{minutesToDawn:5,undeadKind:'zombies'},'L’appel de Vanhel':{freeKind:'move'}};
for(const [fr] of SOURCE)test(`Nécromancie — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{domainFactsExtra:FACTS[fr]||{},targetTests:{foe:{resistanceRoll:95,roll:95,objectId:'blade'},mage:{roll:95}}});
});
const dead=(store,prefix)=>store.listParticipants().filter(p=>p.id.startsWith(prefix));
test('Relever les morts — 1 + DR Squelettes À Terre, contrôlés, +1 par +2 DR, fin au lever du soleil',async()=>{
 const c=getSpellContract('Relever les morts');
 const {store}=await encounter();const before=store.listParticipants().length;
 const dr=(await cast(store,c,{sl:3,domainFactsExtra:{minutesToDawn:5}})).castingPreview.totalCastingSl;
 const raised=dead(store,'aux-'+c.id);
 assert.equal(raised.length,1+dr,'1 + DR');
 for(const s of raised){assert.equal(level(s,'À Terre'),1);assert.equal(s.extensions.v5.summonOwnerId,'mage');assert.ok(s.traits.includes('Mort-vivant'));}
 assert.equal(store.listParticipants().length,before+1+dr);
 await store.undo();assert.equal(store.listParticipants().length,before,'Undo retire les squelettes');
 assert.equal(c.overcast.specific[0].cost,2);
});
test('Relever les morts — surpuissance : un Squelette par palier de +2 DR',async()=>{
 const c=getSpellContract('Relever les morts');
 const {store}=await encounter();
 const input={...inputFor(c,{sl:6,domainFactsExtra:{minutesToDawn:5}}),overcastSpecific:{extra:1}};
 const p=store.previewSpellExecution(c.id,input);assert.equal(p.ready,true,p.error);
 await store.applySpellExecution(c.id,input);
 assert.equal(dead(store,'aux-'+c.id).length,1+p.castingPreview.totalCastingSl+1);
});
test('Relever les morts / Réanimation — D-C40 : profils Squelette (p.339) et Zombie (p.340) du bestiaire, À Terre, contrôlés',async()=>{
 const sk=UNDEAD_SUMMON_PROFILES.skeleton,zo=UNDEAD_SUMMON_PROFILES.zombie;
 assert.deepEqual([sk.page,sk.wounds,sk.caracs.CC,sk.caracs.F],[339,12,25,30]);assert.deepEqual([zo.page,zo.wounds,zo.caracs.CC,zo.caracs.I],[340,12,15,5]);
 const {store}=await encounter();const c=getSpellContract('Relever les morts');
 await cast(store,c,{sl:1,domainFactsExtra:{minutesToDawn:5}});
 const raised=dead(store,'aux-'+c.id);assert.ok(raised.length>=2);
 for(const s of raised){
  assert.equal(s.hp,12);assert.equal(s.maxHp,12);assert.equal(s.caracs.CC,25);assert.equal(s.caracs.M,4);assert.equal(level(s,'À Terre'),1);
  assert.ok(s.traits.includes('Mort-vivant')&&s.traits.includes('Instable'));assert.equal(s.actions.length,1);assert.equal(s.actions[0].base,30);assert.equal(s.actions[0].damageFormula,'BF+4');
 }
 const {store:s2}=await encounter();const r=getSpellContract('Réanimation');
 await cast(s2,r,{sl:1,domainFactsExtra:{minutesToDawn:5,undeadKind:'zombies'}});
 const z=dead(s2,'aux-'+r.id)[0];assert.equal(z.caracs.CC,15);assert.equal(z.actions.length,2);assert.equal(z.actions[1].damageFormula,'BF+3');
});
test('Relever les morts — D-C40 : refusé quand le profil n’est pas disponible',async()=>{
 const {store}=await encounter();const c=getSpellContract('Relever les morts');
 const saved=UNDEAD_SUMMON_PROFILES.skeleton;
 try{
  setUndeadProfilesAvailable(false);
  const p=store.previewSpellExecution(c.id,inputFor(c,{sl:1,domainFactsExtra:{minutesToDawn:5}}));
  assert.equal(p.ready,false);assert.match(p.error,/profil/i);
 }finally{setUndeadProfilesAvailable(true);}
 assert.ok(saved);
});
test('Réanimation — BFM + DR morts relevés, Zombies ou Squelettes selon le choix',async()=>{
 const c=getSpellContract('Réanimation');
 for(const [kind,name] of [['zombies','Zombie'],['skeletons','Squelette']]){
  const {store}=await encounter();
  const dr=(await cast(store,c,{sl:2,domainFactsExtra:{minutesToDawn:5,undeadKind:kind}})).castingPreview.totalCastingSl;
  const raised=dead(store,'aux-'+c.id);
  const bfm=Math.floor(subject(store,'mage').caracs.FM/10);
  assert.equal(raised.length,bfm+dr,'BFM + DR');assert.ok(raised.every(p=>p.name.startsWith(name+' ')),kind);
  assert.ok(raised.every(p=>level(p,'À Terre')===1));
 }
});
test('Relever les morts — fin sur mort ou inconscience du lanceur (événement déclaré), les morts-vivants s’effondrent',async()=>{
 const c=getSpellContract('Relever les morts');
 assert.deepEqual(subjectLayerEnds(c),['caster-down']);
 const {store}=await encounter();await cast(store,c,{sl:1,domainFactsExtra:{minutesToDawn:5}});
 const owner=store.listParticipants().find(p=>(p.extensions?.v5?.spellEffects||[]).some(e=>e.spellId===c.id));
 assert.ok(owner,'une couche porte la fin d’effet');
 const effect=owner.extensions.v5.spellEffects.find(e=>e.spellId===c.id);
 const input={effectId:effect.id,targetId:owner.id,kind:'event',controlValue:'caster-down'};
 const p=store.previewSpellInteraction(input);assert.equal(p.ready,true,p.error);
 await store.applySpellInteraction(input);
 assert.equal(dead(store,'aux-'+c.id).length,0,'les morts-vivants invoqués sont retirés');
});
function subjectLayerEnds(c){return c.effects.specialState.endsOnEvents;}
test('Crâne hurlant — projectile +5, Morts-vivants exclus, Calme +0 : Brisé seulement après Blessure',async()=>{
 const c=getSpellContract('Crâne hurlant');
 assert.equal(c.effects.missile.damage,5);
 const wounded=async roll=>{const {store}=await encounter({foe:{hp:30,traits:[]}});await cast(store,c,{targetTests:{foe:{resistanceRoll:roll,roll:98,wardRoll:1}}});return subject(store,'foe');};
 const failed=await wounded(95);assert.ok(failed.hp<30,'Blessures subies');assert.equal(level(failed,'Brisé'),1);
 const passed=await wounded(10);assert.ok(passed.hp<30);assert.equal(level(passed,'Brisé'),0);
 const undead=await encounter({foe:{hp:30,traits:['Mort-vivant']}});
 const preview=undead.store.previewSpellExecution(c.id,inputFor(c,{targetTests:{foe:{resistanceRoll:95,roll:98,wardRoll:1}}}));
 assert.equal(preview.targetResults?.[0]?.resisted,true,'les Morts-vivants ne sont pas affectés');
 assert.equal(c.effects.secondaryTest.failOnlyIfWounded,true);
});
test('L’appel de Vanhel — cibles Mortes-vivantes seulement, gain commun rappelé',async()=>{
 const c=getSpellContract('L’appel de Vanhel');
 const living=await encounter({foe:{traits:[]}});
 const p=living.store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{freeKind:'move'}}));
 assert.equal(p.targetResults?.[0]?.resisted,true,'cible vivante exemptée');
 const undead=await encounter({foe:{traits:['Mort-vivant']}});
 const q=undead.store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{freeKind:'action'}}));
 assert.equal(q.ready,true,q.error);assert.notEqual(q.targetResults?.[0]?.resisted,true);
 assert.match(c.reminders,/Mouvement ou une Action gratuite/);assert.equal(c.overcast.specific[0].cost,2);
});
