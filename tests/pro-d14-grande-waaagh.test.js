import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,level,cast,inputFor,verifySpell,endTurn} from './helpers/lot3-domain-fixture.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';
import {normalizeLoreId,LORE_ATTRIBUTES,previewLoreAttribute} from '../js/core/v5-magic-attributes.js';

// L12 pp. 100-101 : [nom FR, nom EN, page, NI, portée, cible, durée]
const SOURCE=[
 ['Dur comme le roc','‘Ard as Nails',100,3,'Bonus de Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['Frappez-les, les gars !','Bash ‘Em Lads!',100,6,'Bonus de Force Mentale mètres','Spécial','Instantané'],
 ['Éclate-cervelle','Brainbursta',100,5,'Bonus de Force Mentale mètres','1','Instantané'],
 ['Coup de boule','‘Eadbutt',100,6,'Bonus de Force Mentale mètres','1','Instantané'],
 ['Allons-y !','‘Ere We Go!',100,7,'Vous','ZdE Bonus de Force Mentale mètres (Orques)','Bonus de Force Mentale Rounds'],
 ['Le Soleil mauvais','The Evil Sun',101,12,'Bonus de Force Mentale mètres','ZdE Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Poings de Gork','Fists of Gork',101,2,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Pied de Gork','Foot of Gork',101,10,'Bonus de Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Instantané'],
 ['Regard de Mork','Gaze of Mork',101,5,'Force Mentale mètres','Spécial','Instantané'],
 ['La Main de Gork','The Hand of Gork',101,9,'Force Mentale mètres','Spécial','Bonus de Force Mentale Rounds'],
 ['Mork nous protège !','Mork Save Us!',101,8,'Bonus de Force Mentale mètres','Spécial','Bonus de Force Mentale Rounds'],
 ['WAAAGH !','WAAAGH!',101,12,'Vous','ZdE Force Mentale mètres (tous les Orques, Gobelins et assimilés, alliés ou non)','Bonus de Force Mentale Rounds']
];
for(const [fr,en,page,cn,range,target,duration] of SOURCE)test(`Grande Waaagh L12 p. ${page} — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'big-waaagh');assert.equal(c.type,'Domaine de la Grande Waaagh');assert.equal(c.sourceBook,'L12');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const GS={foe:{greenskin:true,roll:98,resistanceRoll:95,dodgeRoll:95,objectId:'blade',wardRoll:1},mage:{roll:98}};
for(const [fr] of SOURCE)test(`Grande Waaagh — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{targetTests:GS});
});
test('Attribut de la Grande Waaagh — Domaine reconnu, rappel : états Brisé retirés par le MJ',()=>{
 assert.equal(normalizeLoreId('big-waaagh'),'big-waaagh');assert.equal(LORE_ATTRIBUTES['big-waaagh'].name,'Domaine de la Grande Waaagh');
 const p=previewLoreAttribute({lore:'big-waaagh',caster:{id:'c',caracs:{FM:50}},targets:[]});
 assert.match(p.casterEffects.summary,/états Brisé/);assert.equal(p.casterEffects.reminderOnly,true);
});
const elan=(store,id)=>subject(store,id).extensions.v5.hasMomentum;
test('Élan accordé — Frappez-les, Allons-y !, WAAAGH ! : Élan aux seuls Orques/Gobelins désignés (fait), Brisé retiré par WAAAGH !',async()=>{
 for(const [fr,extra] of [['Frappez-les, les gars !',{}],['Allons-y !',{}],['WAAAGH !',{states:[{id:'state-9-brise',name:'Brisé',level:1}]}]]){
  const c=getSpellContract(fr);
  const {store}=await encounter({foe:{camp:fr==='WAAAGH !'?'ennemi':'pj',extensions:{v5:{hasMomentum:false}},...extra}});
  assert.equal(elan(store,'foe'),false);
  await cast(store,c,{targetTests:{foe:{greenskin:true,roll:98}}});
  assert.equal(elan(store,'foe'),true,fr);
  if(fr==='WAAAGH !')assert.equal(level(subject(store,'foe'),'Brisé'),0,'Brisé retiré');
  await store.undo();assert.equal(elan(store,'foe'),false,'Undo : '+fr);
  const stranger=await encounter({foe:{camp:fr==='WAAAGH !'?'ennemi':'pj'}});
  assert.equal(stranger.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true,fr+' : sans le fait, exclu');
 }
 assert.match(getSpellContract('Frappez-les, les gars !').reminders,/Élan/);
 assert.deepEqual(getSpellContract('WAAAGH !').effects.testModifiers,{Calme:2,Endurance:2});
});
test('Dur comme le roc — Haine de tous les ennemis, +2 DR aux Tests d’Endurance, effets d’états ignorés (rappel)',async()=>{
 const c=getSpellContract('Dur comme le roc');
 const {store}=await encounter();await cast(store,c);
 const foe=subject(store,'foe');assert.equal(foe.extensions.v5.testModifiers['carac:e'],2);
 assert.ok(foe.traits.includes('Haine (tous les ennemis)')||JSON.stringify(foe.extensions.v5.spellEffects).includes('Haine'));
 assert.match(c.reminders,/ignore les effets négatifs/);
});
test('Éclate-cervelle — À Terre, Sonné + un Sonné par DR, Critique à la tête en rappel',async()=>{
 const c=getSpellContract('Éclate-cervelle');
 const {store}=await encounter({foe:{caracs:{CC:50,CT:50,F:40,E:300,I:50,Ag:50,Dex:50,Int:60,FM:60,Soc:50,M:4}}});const p=await cast(store,c);
 const foe=subject(store,'foe');assert.equal(level(foe,'À Terre'),1);
 assert.equal(level(foe,'Sonné'),1+Math.min(20,p.castingPreview.totalCastingSl),'Sonné + 1 par DR (plafonné à 20)');
 assert.match(c.reminders,/Calme Accessible \(\+2 DR\)/);
});
test('Coup de boule — projectile +1 à la tête, +6 contre Attirance aethyrique ou Seconde vue ; cartouche de Lustria consigné',async()=>{
 const c=getSpellContract('Coup de boule');
 assert.equal(c.effects.missile.damage,1);assert.equal(c.effects.missile.fixedLocation,'HEAD');assert.deepEqual(c.effects.missile.talentDamage,{talents:['aethyric-attunement','second-sight'],damage:6});
 const lost=async talents=>{const {store}=await encounter({foe:{hp:200,maxHp:200,armor:{head:0,body:0,arms:0,legs:0},talents}});
  await cast(store,c,{targetTests:{foe:{roll:98,wardRoll:1}}});const foe=subject(store,'foe');return 200-foe.hp;};
 const plain=await lost([]),sensitive=await lost([{id:'talent-second-sight',rank:1,status:'resolved'}]);
 assert.ok(sensitive>plain,'+6 contre les sensibles à la magie ('+plain+' → '+sensitive+')');
});
test('Le Soleil mauvais — 8 + DR de dégâts à chaque Round, Enflammé sur Endurance ratée (clause de fin de Round)',async()=>{
 const c=getSpellContract('Le Soleil mauvais');
 assert.equal(c.effects.roundEffect.damage.formula,'8 + DR');assert.equal(c.effects.roundEffect.phase,'endOfRound');assert.equal(c.effects.roundEffect.failConditions[0],'Enflammé');
 const {store}=await encounter({foe:{hp:400,maxHp:400}});await cast(store,c);
 const layer=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===c.id);assert.ok(layer?.roundEffect);
});
test('Poings de Gork — attaque créée : Corps à corps (Bagarre) 55, dégâts BF + 9',async()=>{
 const c=getSpellContract('Poings de Gork');
 const {store}=await encounter();await cast(store,c);
 const mage=subject(store,'mage');
 const fists=(mage.actions||[]).find(a=>/Poings de Gork/.test(a.note||''));
 assert.ok(fists,'action créée');assert.equal(fists.base,55);assert.equal(fists.damageFormula,'BF+9');
});
test('Pied de Gork — À Terre dans tous les cas, 8 ignorant les PA, 4 si Esquive Difficile (−1 DR) réussie',async()=>{
 const c=getSpellContract('Pied de Gork');
 const run=async dodge=>{const {store}=await encounter({foe:{hp:60,maxHp:60,armor:{head:3,body:3,arms:3,legs:3}}});
  await cast(store,c,{targetTests:{foe:{dodgeRoll:dodge,resistanceRoll:dodge,roll:98,wardRoll:1}}});return subject(store,'foe');};
 const failed=await run(95),passed=await run(5);
 assert.equal(level(failed,'À Terre'),1);assert.equal(level(passed,'À Terre'),1);
 assert.ok(failed.hp<passed.hp,'plus de dégâts si l’Esquive est ratée');
 assert.equal(c.effects.secondaryTest.modifierSl,-1);
});
test('Regard de Mork — Dégâts +4, créatures vivantes seulement ; La Main de Gork — rappel 1d10 cibles ; Mork nous protège ! — Protection 10+',async()=>{
 const gaze=getSpellContract('Regard de Mork');assert.equal(gaze.effects.missile.damage,4);
 const dead=await encounter({foe:{traits:['Mort-vivant']}});
 assert.equal(dead.store.previewSpellExecution(gaze.id,inputFor(gaze)).targetResults?.[0]?.resisted,true,'non vivant exempté');
 assert.match(getSpellContract('La Main de Gork').reminders,/1d10/);
 const save=getSpellContract('Mork nous protège !');assert.equal(save.effects.ward,10);assert.match(save.reminders,/7\+/);
 const {store}=await encounter({foe:{camp:'pj'}});await cast(store,save,{targetTests:{foe:{greenskin:true,roll:98}}});
 assert.equal(subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===save.id).ward,10);
});
test('Frappez-les et Mork nous protège — écarts L07/L12 consignés (le plus récent fait foi)',()=>{
 assert.match(getSpellContract('Frappez-les, les gars !').reminders,/Lustria/);
 assert.match(getSpellContract('Mork nous protège !').reminders,/Lustria/);
 assert.match(getSpellContract('Coup de boule').reminders,/Lustria/);
});
