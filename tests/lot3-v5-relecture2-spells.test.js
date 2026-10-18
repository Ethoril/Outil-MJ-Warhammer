import test from 'node:test';import assert from 'node:assert/strict';
import {actor,setup,person} from './helpers/relecture2-fixture.js';
import {getSpellContract,previewSpellExecution} from '../js/core/v5-spell-contracts.js';
import {isTargetDaemon,previewLoreAttribute} from '../js/core/v5-magic-attributes.js';
import {previewHandOfGlory,previewVerdantApotheosis,applyBeastForm,revertBeastForm,BEAST_PROFILES,previewDaemonbane,applyDaemonbane} from '../js/core/v5-magic-arbitrations.js';
import {previewBurnout} from '../js/core/v5-magic-high.js';
import {acquireV5Conditions} from '../js/core/v5-effects.js';
test('R2-02 : réduction avant plafonnement aux B restants, puis Store/Undo',async()=>{
 const s=await setup(actor('mage',{extensions:{v5:{channelling:{type:'winds',sl:20}}}}),actor('target',{hp:5,extensions:{v5:{damageReduction:3}}}));
 const o={actorId:'mage',targetIds:['target'],roll:25,attributeActive:false};const p=s.previewSpellExecution('Arc de T’Essla',o);assert.equal(p.ready,true,p.error);assert.equal(p.targetResults[0].finalHp,0);await s.applySpellExecution('Arc de T’Essla',o);assert.equal(person(s,'target').hp,0);await s.undo();assert.equal(person(s,'target').hp,5);
});
test('R2-03 : Araignée garde Grimpeur/Toile après Store/reload, retour et Undo',async()=>{
 const s=await setup(actor('mage',{traits:['Trait du mage'],extensions:{traits:['Trait du mage'],v5:{channelling:{type:'winds',sl:20}}}}));
 await s.applySpellExecution('Forme bestiale',{actorId:'mage',targetIds:['mage'],roll:25,beastKey:'giant-spider',attributeActive:false});
 for(const t of ['Grimpeur','Toile 40','Vision nocturne'])assert.ok(person(s).traits.includes(t),t);
 const reloaded=await setup(person(s));for(const t of ['Grimpeur','Toile 40','Vision nocturne'])assert.ok(person(reloaded).traits.includes(t),t);
 await reloaded.revertBeastForm('mage');assert.deepEqual(person(reloaded).traits,['Trait du mage']);await reloaded.undo();assert.ok(person(reloaded).traits.some(t=>/Toile/.test(t)));
});
test('R2-10 : Ennemi Anticipé refuse Surpris à l’acquisition',()=>{
 const p=acquireV5Conditions(actor('mage',{extensions:{v5:{specialStates:{cannotBeSurprised:true}}}}),[{key:'surpris',name:'Surpris',level:1}]);assert.equal(p.participant.states.length,0);assert.match(p.reminders.join(' '),/Surpris/);
});
test('R2-12 : Démonologue reste vivant ; Démon sans E exige une donnée MJ ; Fléau sans cumul',()=>{
 assert.equal(isTargetDaemon(actor('target',{name:'Démonologue'})),false);
 const a=actor('target',{traits:['Démon'],caracs:{FM:20},maxHp:30});assert.throws(()=>previewDaemonbane({caster:actor(),target:a}),/Endurance| E /);
 const target=actor('target',{traits:['Démon'],caracs:{E:90},maxHp:30});const first=applyDaemonbane(target,previewDaemonbane({caster:actor(),target})).target;assert.equal(first.maxHp,15);const twice=applyDaemonbane(first,previewDaemonbane({caster:actor(),target:first})).target;assert.equal(twice.maxHp,15);
});
test('R2-13 et Mort : attribut par effets de protection et cibles vivantes',()=>{
 const p=previewLoreAttribute({lore:'shadow',caster:actor(),spell:{name:'Dôme',effects:{ward:6},duration:'5 Rounds'}});assert.ok(p.casterEffects?.testModifiers);
 const q=previewLoreAttribute({lore:'death',caster:actor(),targets:[actor('construct',{traits:['Artificiel']}),actor('ether',{traits:['Éthéré']}),actor('alive'),actor('dead',{hp:0})]});assert.deepEqual([...q.targetEffects.keys()],['alive']);
});
test('R2-14 : fait décapité par cible rend Apothéose Verdoyante inadmissible',async()=>{
 const s=await setup(actor(),actor('corpse',{hp:0}));const p=s.previewSpellExecution('Apothéose Verdoyante',{actorId:'mage',targetIds:['corpse'],sl:20,timeSinceDeathSec:20,attributeActive:false,targetTests:{corpse:{deathDelaySec:20,decapitated:true}}});assert.equal(p.ready,false);assert.match(p.error,/décapité/);
});
test('R2-15 : le jet spécifique de résistance prime sur roll générique',async()=>{
 const s=await setup(actor(),actor('target'));const p=s.previewSpellExecution('Toucher doré',{actorId:'mage',targetIds:['target'],sl:20,attributeActive:false,domainFacts:{durationDie:2},targetTests:{target:{roll:25,resistanceRoll:95}}});assert.equal(p.ready,true,p.error);assert.equal(p.targetResults[0].resistanceTest.roll,95);
});
test('R2-17 : Lumière aveuglante ne propose pas la surpuissance de zone',()=>{assert.equal(getSpellContract('Lumière aveuglante').overcast.options.includes('aoe'),false);});
test('R2-Main de Gloire : M interdit parmi les caractéristiques choisies',()=>{assert.throws(()=>previewHandOfGlory({chosenStats:['F','M'],roll3d10:12}),/Mouvement|M /);});
test('R2-Apothéose : 0 DR final rend 0 B',()=>{const p=previewVerdantApotheosis({caster:actor(),corpses:[actor('c',{hp:0,timeSinceDeathSec:20})],castingSl:0});assert.equal(p.results[0].healedHp,0);});
test('R2-Épuisement : FM manquante refusée, BFM zéro conservé',()=>{const a=actor('mage',{caracs:{Int:60}});assert.equal(previewBurnout({participant:a,overcastSpent:4,roll:90}).ready,false);assert.match(previewBurnout({participant:a,overcastSpent:4}).error,/FM|Force Mentale/);const p=previewBurnout({participant:actor('mage',{caracs:{FM:0}}),overcastSpent:4,roll:90});assert.equal(p.bfm,0);assert.equal(p.riskPercent,4);});
