import test from 'node:test';import assert from 'node:assert/strict';
import {actor,setup,person} from './helpers/relecture2-fixture.js';
import {createStore} from '../js/core/store.js';import {createCombatEngine} from '../js/core/combat.js';
import {ficheSnapshot} from '../js/core/fiche-sync.js';

test('A-01 : Protection réussie à 0 B annule aussi le Critique (contrôle à 1 B)',async()=>{
 for(const hp of [1,0]){
  const s=await setup(actor('mage',{extensions:{v5:{channelling:{type:'winds',sl:20}}}}),actor('target',{hp,extensions:{v5:{ward:6}}}));
  const o={actorId:'mage',targetIds:['target'],roll:11,criticalChoice:'critical-wound',miscastRoll:15,attributeActive:false,targetTests:{target:{wardRoll:10}}};
  const p=s.previewSpellExecution('Arc de T’Essla',o);assert.equal(p.ready,true,p.error);await s.applySpellExecution('Arc de T’Essla',o);
  const reloaded=await setup(person(s),person(s,'target'));assert.equal(person(reloaded,'target').extensions.v5.criticalWounds?.length||0,0,'Critique persisté, hp initial='+hp);
  await s.undo();assert.equal(person(s,'target').hp,hp);
 }
});
async function earthblood(label){
 const s=await setup(actor(),actor('target',{hp:5,traits:[label],extensions:{traits:[label]}}));
 await s.applySpellExecution('Sang de la Terre',{actorId:'mage',targetIds:['target'],sl:20,domainFacts:{directEarth:true},attributeActive:false});
 const e=person(s,'target').extensions.v5.spellEffects.find(e=>e.roundEffect?.healing),engine=createCombatEngine(s);await engine.nextTurn();
 const inputs={target:{['spell:'+e.id+':earth']:true,['spell:'+e.id+':present']:true}};assert.equal(engine.previewNextTurn({inputs}).ready,true);await engine.nextTurn({inputs});
 const after=person(s,'target').hp,reloaded=await setup(person(s),person(s,'target'));assert.equal(person(reloaded,'target').hp,after);await s.undo();assert.equal(person(s,'target').hp,5);return after;
}
test('A-02a : Sang de la Terre ne soigne pas Artificiel',async()=>{assert.equal(await earthblood('Démon'),5);assert.equal(await earthblood('Artificiel'),5);});
test('A-02b : Sang de la Terre soigne Chasseur de démons, qui est vivant',async()=>{assert.equal(await earthblood('Chasseur de démons'),10);});
test('A-03 : Peau du Chasseur expirée pendant la forme ne retrouve pas ses traits au retour',async()=>{
 const normal=await setup(actor());await normal.applySpellExecution('Peau du Chasseur',{actorId:'mage',targetIds:['mage'],sl:20,attributeActive:false});await normal.advanceTalentMinutes(1);assert.deepEqual(person(normal).traits,[]);
 const s=await setup(actor());await s.applySpellExecution('Peau du Chasseur',{actorId:'mage',targetIds:['mage'],sl:20,attributeActive:false});await s.applySpellExecution('Forme bestiale',{actorId:'mage',targetIds:['mage'],sl:20,beastKey:'wolf',attributeActive:false});await s.advanceTalentMinutes(1);await s.revertBeastForm('mage');
 const p=person(s);assert.deepEqual(p.extensions.v5.spellEffects,[]);assert.equal(p.caracs.E,30);const reloaded=await setup(p);assert.deepEqual(person(reloaded).traits,[]);
});
test('A-04 : fiche FM seule sous forme animale conserve Mouvement 5 au retour',async()=>{
 const mage=actor('mage',{profileId:'profile',M:5,movement:5,caracs:{CC:40,CT:40,F:30,E:30,Int:60,FM:50,Ag:40,I:40,Dex:40,Soc:40,M:5}});
 const s=createStore();await s.ready;await s.loadFromJSON({schemaVersion:3,reserve:[{...mage,id:'profile',profileId:null,diceLines:[]}],combat:{round:1,currentActorId:'mage',order:['mage'],participants:[mage]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
 assert.equal(person(s).profileId,'profile');await s.applySpellExecution('Forme bestiale',{actorId:'mage',targetIds:['mage'],sl:20,beastKey:'wolf',attributeActive:false});const before=person(s).caracs.M;
 await s.applyFicheSync([{profileId:'profile',snapshot:ficheSnapshot('s',{nom:'mage',carac:{fm:{base:70,adv:0}}})}]);assert.equal(person(s).caracs.M,before);await s.revertBeastForm('mage');assert.equal(person(s).caracs.FM,70);assert.equal(person(s).caracs.M,5);
});
test('A-05 : Haine (Undead) ne transforme pas une cible vivante en mort-vivant',async()=>{
 const s=await setup(actor(),actor('target',{hp:10,traits:['Haine (Undead)'],extensions:{traits:['Haine (Undead)']},states:[{name:'Exténué',key:'extenue',level:1}]}));
 const p=s.previewLoreAttribute({lore:'life',targetIds:['target']});await s.applyLoreAttribute(p,{casterId:'mage',targetIds:['target']});assert.equal(person(s,'target').hp,10);assert.equal(person(s,'target').states.length,0);
});
test('A-06 : une forme importée vide est rejetée avant de bloquer le mage',async()=>{
 const s=await setup(actor('mage',{extensions:{v5:{beastForm:{}}}}));assert.equal(person(s).extensions.v5.beastForm,undefined);
});

test('A-01b : à 0 B, la Protection attend son dé ; un échec conserve le Critique',async()=>{
 const s=await setup(actor('mage',{extensions:{v5:{channelling:{type:'winds',sl:20}}}}),actor('target',{hp:0,extensions:{v5:{ward:6}}}));
 const o={actorId:'mage',targetIds:['target'],roll:11,criticalChoice:'critical-wound',miscastRoll:15,attributeActive:false};
 const missing=s.previewSpellExecution('Arc de T’Essla',o);assert.equal(missing.ready,false);assert.match(missing.error,/d10|Protection/);
 const failed={...o,targetTests:{target:{wardRoll:1}}};const p=s.previewSpellExecution('Arc de T’Essla',failed);assert.equal(p.ready,true,p.error);
 await s.applySpellExecution('Arc de T’Essla',failed);assert.equal(person(s,'target').extensions.v5.criticalWounds.length,1);
 await s.undo();assert.equal(person(s,'target').extensions.v5.criticalWounds?.length||0,0);
});

test('A-01c : un sort sans dégâts ne réclame pas de dé de Protection',async()=>{
 const s=await setup(actor(),actor('target',{hp:0,extensions:{v5:{ward:6}}}));
 const o={actorId:'mage',targetIds:['target'],sl:20,attributeActive:false};
 const p=s.previewSpellExecution('Choc',o);assert.equal(p.ready,true,p.error);assert.equal(p.targetResults[0].magicProtection,undefined);
 await s.applySpellExecution('Choc',o);assert.ok(person(s,'target').states.some(x=>/sonn/i.test(x.key || x.name)));
});

for(const automatic of [false,true])test('A-03b : traits permanents préservés, effets expirés retirés au retour '+(automatic?'automatique':'manuel'),async()=>{
 const s=await setup(actor('mage',{traits:['Amphibie'],extensions:{traits:['Amphibie'],v5:{hasMomentum:true}}}));
 await s.applySpellExecution('Peau du Chasseur',{actorId:'mage',targetIds:['mage'],sl:20,attributeActive:false});
 await s.applySpellExecution('Forme bestiale',{actorId:'mage',targetIds:['mage'],sl:20,beastKey:'wolf',attributeActive:false});
 await s.advanceTalentMinutes(automatic?person(s).extensions.v5.beastForm.remainingMinutes:1);if(!automatic)await s.revertBeastForm('mage');
 const reloaded=await setup(person(s));assert.deepEqual(person(reloaded).traits,['Amphibie']);assert.equal(person(reloaded).extensions.v5.beastForm,undefined);
 await s.undo();assert.ok(person(s).extensions.v5.beastForm);
});

test('A-03c : retour avant expiration conserve le buff, puis expiration ne retire que le buff',async()=>{
 const s=await setup(actor('mage',{traits:['Amphibie'],extensions:{traits:['Amphibie'],v5:{hasMomentum:true}}}));
 await s.applySpellExecution('Peau du Chasseur',{actorId:'mage',targetIds:['mage'],sl:20,attributeActive:false});
 const expected=[...person(s).traits].sort();
 await s.applySpellExecution('Forme bestiale',{actorId:'mage',targetIds:['mage'],sl:20,beastKey:'wolf',attributeActive:false});await s.revertBeastForm('mage');
 assert.deepEqual([...person(s).traits].sort(),expected);await s.advanceTalentMinutes(1);assert.deepEqual(person(s).traits,['Amphibie']);
 const reloaded=await setup(person(s));assert.deepEqual(person(reloaded).traits,['Amphibie']);
});

for(const [race,movement]of [['nain',3],['haut-elfe',5],['ogre',6]])test('A-04b : race connue '+race+', fiche partielle et recharge conservent M'+movement,async()=>{
 const mage=actor('mage',{profileId:'profile',race,M:movement,movement});mage.caracs.M=movement;
 const s=createStore();await s.ready;await s.loadFromJSON({schemaVersion:3,reserve:[{...mage,id:'profile',profileId:null,diceLines:[]}],combat:{round:1,currentActorId:'mage',order:['mage'],participants:[mage]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
 await s.applySpellExecution('Forme bestiale',{actorId:'mage',targetIds:['mage'],sl:20,beastKey:'wolf',attributeActive:false});
 const snapshot=ficheSnapshot('s',{nom:'mage',carac:{fm:{base:70,adv:0}}});assert.equal(snapshot.movement,null);
 await s.applyFicheSync([{profileId:'profile',snapshot}]);assert.equal(person(s).caracs.M,9);
 const reloaded=await setup(person(s));await reloaded.revertBeastForm('mage');assert.equal(person(reloaded).caracs.M,movement);assert.equal(person(reloaded).caracs.FM,70);assert.equal(person(reloaded).race,race);
 await reloaded.undo();assert.equal(person(reloaded).caracs.M,9);
});
