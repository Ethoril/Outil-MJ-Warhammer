import test from 'node:test';
import assert from 'node:assert/strict';
import {actor,setup,person} from './helpers/relecture2-fixture.js';
import {prepareMagicOptions} from '../js/core/v5-magic-talents.js';
import {resolveChannellingSkill,calculateMagicArmorPenalty,previewChannellingPause} from '../js/core/v5-magic-channelling.js';

test('R2-01 : une réaction ne consomme ni rune ni tour magique du dissipateur, Store/Undo',async()=>{
 const s=await setup(actor('mage',{extensions:{v5:{channelling:{type:'high',sl:20},cadaiRunes:{deployed:3,max:5}}}}),actor('other'));
 const o={actorId:'mage',targetIds:['mage'],roll:95,cadaiAccessible:true,cadaiRerolls:[{purpose:'test',roll:25}],dispelReaction:{dispellerId:'other',roll:95,distance:1,visible:true}};
 const p=s.previewSpellExecution('Apothéose',o);assert.equal(p.ready,true,p.error);
 const r=await s.applySpellExecution('Apothéose',o);assert.notEqual(r?.ok,false,r?.error);
 assert.equal(s.getCadaiRunes('mage').deployed,2);assert.equal(s.getCadaiRunes('other').deployed,0);
 assert.equal(person(s,'other').extensions.v5.magicAttemptTurn,undefined);await s.undo();assert.equal(s.getCadaiRunes('mage').deployed,3);
});
test('R2-04 : Mage de guerre du tour précédent autorise une réaction dans le tour courant',async()=>{
 const s=await setup(actor(),actor('other',{extensions:{v5:{warWizardTurn:'1:1'}}}));
 const p=s.previewDispelCasting({testSl:5,totalCastingSl:5},{dispellerId:'other',roll:25,distance:1,visible:true});assert.equal(p.allowed,true,p.reason);assert.equal(p.turnKey,'1:2');
});
test('R2-05 : aucune pénalité d’armure en dissipation',async()=>{
 const s=await setup(actor('mage',{equipment:[{id:'ap',kind:'armour',name:'Plate',layer:'rigid',ap:4,locations:['body'],equipped:true}]}));
 const p=s.previewDispelCasting({testSl:9,totalCastingSl:9},{roll:25,distance:1,visible:true});assert.equal(p.armorPenalty,0);assert.equal(p.selectedTest.sl,4);
});
test('R2-06 : Pause et Interruption restent possibles si muet, Surpris ou Inconscient',()=>{
 for(const key of ['surpris','inconscient'])for(const kind of ['pause','interruption'])assert.doesNotThrow(()=>prepareMagicOptions(actor('mage',{states:[{key,level:1}],extensions:{v5:{specialStates:{cannotSpeak:true},warWizardTurn:'1:1'}}}),kind,{turnKey:'1:1',roll:25}));
 assert.throws(()=>prepareMagicOptions(actor('mage',{states:[{key:'surpris',level:1}]}),'casting',{roll:25}),/Surpris/);
});
test('R2-07 : Focalisation Haute Magie sans incident ne paie pas de rune d’incident',async()=>{
 const s=await setup(actor('mage',{extensions:{v5:{cadaiRunes:{deployed:3,max:5}}}}));
 const o={actorId:'mage',type:'high',roll:25,miscastRoll:50,cadaiAccessible:true,cadaiRerolls:[{purpose:'miscast',roll:60}]};
 const p=s.previewChannelling(o);assert.equal(p.miscast,null);assert.equal(p.cadaiReceipt,null);await s.applyChannelling(p,{actorId:'mage'});assert.equal(s.getCadaiRunes('mage').deployed,3);
});
test('R2-08 : Couronne de Flamme donne +1 DR à la Focalisation avec wind UI',()=>{
 const a=actor('mage',{extensions:{v5:{spellEffects:[{id:'crown',spellName:'Couronne de Flamme',loreTestBonus:{lore:'fire',amount:1}}]}}});
 assert.equal(prepareMagicOptions(a,'channelling',{wind:'Aqshy',roll:25}).slModifiers.find(m=>m.id==='spell-lore-bonus')?.amount,1);
});
test('R2-09 : La Fortune est Capricieuse ne transforme pas une Pause en maladresse',()=>{
 const p=previewChannellingPause(actor('mage',{extensions:{v5:{channelling:{type:'winds',sl:5},specialStates:{forceFumbleOnDoubles:true}}}}),{roll:22});assert.equal(p.success,true);assert.equal(p.reserveLost,false);
});
test('R2-16 : le nom du cuir ne dispense pas une armure de métal de la pénalité de Ghur',()=>{
 const a=actor('mage',{equipment:[{id:'ap',kind:'armour',name:'Cuir trompeur',material:'metal',layer:'rigid',ap:3,locations:['body'],equipped:true}]});assert.equal(calculateMagicArmorPenalty(a,{wind:'Ghur'}).penalty,-3);
 a.equipment[0].material='leather';a.equipment[0].name='Armure sans nom';assert.equal(calculateMagicArmorPenalty(a,{wind:'Ghur'}).penalty,0);
});
test('R2-D10 : une Focalisation colorée vaut pour les huit Vents ; conflit de scores signalé',()=>{
 const a=actor('mage',{skills:[{name:'Focalisation (Aqshy)',total:60}]});for(const wind of ['Ulgu','Azyr','Ghur','Aqshy'])assert.equal(resolveChannellingSkill(a,{wind}).score,60);
 a.skills.push({name:'Focalisation',total:50});const p=resolveChannellingSkill(a,{wind:'Aqshy'});assert.equal(p.score,50);assert.match(p.warning,/anomalie.*Focalisation/i);
});
