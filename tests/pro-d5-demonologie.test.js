import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,cast,inputFor,verifySpell} from './helpers/lot3-domain-fixture.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';

// L06 p. 258 : [nom FR, nom EN, NI, portée, cible, durée]
const SOURCE=[
 ['Destruction de Démon Mineur','Destroy Lesser Daemon',6,'Bonus de Force Mentale mètres','1 Démon de taille Moyenne ou inférieure','Bonus de Force Mentale Rounds'],
 ['Détection de démon','Detect Daemon',4,'Force Mentale mètres','Spécial','Instantané'],
 ['Manifestation de Démon Mineur','Manifest Lesser Daemon',8,'Bonus de Force Mentale mètres','Spécial','Bonus de Force Mentale Rounds'],
 ['Octogramme','Octagram',10,'Toucher','ZdE Bonus d’Intelligence mètres','Force Mentale minutes']
];
for(const [fr,en,cn,range,target,duration] of SOURCE)test(`Démonologie L06 p. 258 — ${fr} : paramètres relus, domaine, aucun attribut ni ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[258,cn,range,target,duration]);
 assert.equal(c.domain,'daemonology');assert.equal(c.type,'Domaine de la Démonologie');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const FACTS={'Manifestation de Démon Mineur':{daemonKind:'bloodletter',commandOutcome:'obeys'}};
for(const [fr] of SOURCE.filter(([n])=>n!=='Destruction de Démon Mineur'))test(`Démonologie — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{domainFactsExtra:FACTS[fr]||{},targetTests:{foe:{resistanceRoll:95,roll:95},mage:{roll:95}}});
});
test('Destruction de Démon Mineur — Démon seulement ; Endurance +4 DR opposée : victoire = destruction, défaite = rien',async()=>{
 const c=getSpellContract('Destruction de Démon Mineur');
 assert.equal(c.effects.opposedTest.targetSlModifier,4);assert.equal(c.effects.destroyOnOpposedWin,true);
 const run=async(actorRoll,foeRoll)=>{
  const {store}=await encounter({foe:{traits:['Démoniaque'],hp:20}});
  await cast(store,c,{domainFactsExtra:{opposedActorRoll:actorRoll},targetTests:{foe:{opponentRoll:foeRoll,resistanceRoll:foeRoll,roll:foeRoll}}});
  return subject(store,'foe');
 };
 const won=await run(5,95);assert.equal(won.hp,0);assert.equal(won.zone,'bench');assert.equal(won.extensions.v5.destroyed,true);
 const lost=await run(95,5);assert.equal(lost.hp,20);assert.ok(!lost.extensions?.v5?.destroyed);
 const {store}=await encounter({foe:{traits:[],hp:20}});
 const ordinary=store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{opposedActorRoll:5},targetTests:{foe:{opponentRoll:95,resistanceRoll:95,roll:95}}}));
 assert.equal(ordinary.targetResults?.[0]?.destroyed||false,false,'une cible non démoniaque n’est pas détruite');
 assert.match(c.reminders,/\+10 à la caractéristique choisie/);
});
test('Destruction de Démon Mineur — un Démon de grande taille est exempté même si l’opposition est gagnée',async()=>{
 const c=getSpellContract('Destruction de Démon Mineur');
 const {store}=await encounter({foe:{traits:['Démoniaque','Grande'],hp:20}});
 await cast(store,c,{domainFactsExtra:{opposedActorRoll:5},targetTests:{foe:{opponentRoll:95,resistanceRoll:95,roll:95}}});
 assert.equal(subject(store,'foe').hp,20);assert.ok(!subject(store,'foe').extensions?.v5?.destroyed);
});
test('Destruction de Démon Mineur — l’opposition exige deux dés explicites',async()=>{
 const c=getSpellContract('Destruction de Démon Mineur');const {store}=await encounter({foe:{traits:['Démoniaque'],hp:20}});
 assert.equal(store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{}})).ready,false);
});
test('Manifestation de Démon Mineur — profil imprimé créé à l’incantation (E-B3), un ordre puis disparition (rappel)',()=>{
 const c=getSpellContract('Manifestation de Démon Mineur');
 assert.equal(c.effects.type,'summon');assert.deepEqual(c.effects.summon.profiles,{bloodletter:'E0-P-107',daemonette:'E0-P-108'});assert.match(c.reminders,/un seul ordre/);assert.match(c.reminders,/disparaît quand même/);
 assert.deepEqual(c.effects.facts.find(f=>f.key==='daemonKind').options.map(o=>o[0]),['bloodletter','daemonette']);
});
test('Octogramme — barrière démoniaque rappelée, version V5 sans clause d’évasion',async()=>{
 const c=getSpellContract('Octogramme');
 assert.match(c.effects.specialState.assistedReminder,/ne peuvent ni entrer/);assert.match(c.reminders,/aucune clause d’évasion/);
 const {store}=await encounter();await cast(store,c);
 assert.ok(subject(store,'foe').extensions.v5.spellEffects.some(e=>e.spellId===c.id&&e.specialState?.assistedReminder));
});
