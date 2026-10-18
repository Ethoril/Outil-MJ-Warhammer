import test from 'node:test';
import assert from 'node:assert/strict';
import snapshot from '../js/data/reference-snapshot.json' with {type:'json'};
import {sanitizeParticipant,sanitizeProfile} from '../js/core/sanitize.js';
import {actor,setup,person} from './helpers/relecture2-fixture.js';
import {isTargetDaemon} from '../js/core/v5-magic-attributes.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';

test('Reliquat 1 : trous RTDB et lignes non objets filtrés sur tous les tableaux de fiche et participant',async()=>{
 const item={id:'sword',kind:'weapon',name:'Épée',keywords:[null,{id:'rapide',parameter:''}],locations:[null,'rightArm']};
 const action={id:'sword',type:'attack',attr:'CC',base:60,note:'Coupe',damage:4,qualities:[null,'rapide']};
 const state={id:'s1',key:'sonne',name:'Sonné',level:1};
 const layer={id:'l1',spellId:'sp1',spellName:'Choc',duration:2};
 const raw=actor('mage',{
  equipment:[null,false,'',[],item],
  weapons:[null,false,'',[],{id:'w1',name:'Dague'}],
  armours:[null,false,'',[],{id:'a1',name:'Cuir',ap:1}],
  traits:[null,false,'',[],{},'Peur (1)'],
  states:[null,false,'',[],{},state],
  actions:[null,false,'',[],action],
  diceLines:[null,false,'',[],action],
  spells:[null,false,'',[],{id:'sp1',name:'Choc'}],
  talents:[null,false,'',[],{id:'talent-war-wizard',name:'Mage de guerre',rank:1,status:'resolved'}],
  skills:[null,false,'',[],{id:'sk1',name:'Focalisation',total:60}],
  prayers:[null,false,'',[],{id:'pr1',name:'Bénédiction'}],
  tags:[null,false,'',[],'Élite'],
  extensions:{
   traits:[null,false,'',[],{name:'Vision nocturne'}],
   v5:{
    baseTraits:[null,'Peur (1)'],
    temporaryTraits:[null,'Grimpeur'],
    spellEffects:[null,false,'',[],layer],
    wards:[null,{threshold:7}],
    suppressedSpellIds:[null,'','sp2']
   }
  }
 });
 const sp=sanitizeParticipant(raw),pr=sanitizeProfile(raw);
 assert.equal(sp.equipment.length,1);
 assert.deepEqual(sp.equipment[0].keywords,[{id:'rapide',parameter:''}]);
 assert.deepEqual(sp.equipment[0].locations,['rightArm']);
 assert.deepEqual(sp.traits,['Peur (1)']);
 assert.deepEqual(sp.extensions.traits,[{name:'Vision nocturne'}]);
 assert.deepEqual(sp.extensions.v5.baseTraits,['Peur (1)']);
 assert.deepEqual(sp.extensions.v5.temporaryTraits,['Grimpeur']);
 assert.deepEqual(sp.extensions.v5.suppressedSpellIds,['sp2']);
 assert.equal(sp.states.length,1);assert.equal(sp.states[0].key,'sonne');
 assert.equal(sp.actions.length,1);assert.equal(sp.actions[0].id,'sword');
 assert.equal(pr.diceLines.length,1);assert.equal(pr.diceLines[0].id,'sword');
 assert.equal(sp.spellEffects.length,1);assert.equal(sp.spellEffects[0].id,'l1');
});

test('Reliquat 1 : attaque Store avec ligne vide d’équipement, sauvegarde et rechargement',async()=>{
 const store=await setup(actor('mage',{equipment:[null]}),actor('target',{camp:'ennemi',equipment:[null]}));
 const options={actorId:'mage',targetId:'target',action:{id:'sword',type:'attack',attr:'CC',base:60,damage:4,qualities:[]},roll:25,defense:{base:30,roll:75,v5:{kind:'melee'}},v5:{kind:'melee'}};
 const preview=store.previewResolution(options);assert.equal(preview.success,true);
 const reloaded=await setup(person(store),person(store,'target'));
 assert.equal(reloaded.previewResolution(options).success,true);
 assert.deepEqual(person(reloaded).equipment,[]);
});

test('Reliquat 2 : Cor du Andar exige et expose le Test secondaire de Peur uniquement pour un ennemi',async()=>{
 const foe=actor('foe',{camp:'ennemi'}),ally=actor('ally',{camp:'pj'});
 const s=await setup(actor(),foe,ally);
 const blocked=s.previewSpellExecution('Cor du Andar',{actorId:'mage',targetIds:['foe'],sl:20,attributeActive:false});
 assert.equal(blocked.ready,false);
 const readyEnemy=s.previewSpellExecution('Cor du Andar',{actorId:'mage',targetIds:['foe'],sl:20,attributeActive:false,targetTests:{foe:{fearRoll:40}}});
 assert.equal(readyEnemy.ready,true,readyEnemy.error);
 const readyAlly=s.previewSpellExecution('Cor du Andar',{actorId:'mage',targetIds:['ally'],sl:20,attributeActive:false});
 assert.equal(readyAlly.ready,true,readyAlly.error);
});

test('Reliquat 3 : Chasseur de démons et Démonologue ne qualifient aucune source comme Démon, Mort-vivant, Artificiel ou Éthéré',async()=>{
 const {isTargetUndead,isTargetConstruct,isTargetEthereal,hasLivingMagicNature}=await import('../js/core/v5-magic-attributes.js');
 const {resolveSpellDamage}=await import('../js/core/v5-magic-effects.js');
 for(const label of ['Chasseur de démons','Démonologue','Pas un Démon','Démoniste','Chasseur de morts-vivants','Chasseur d’Artificiels','Haine (Éthérés)']){
  for(const fields of [{traits:[label]},{extensions:{traits:[{name:label}]}},{tags:[label]},{species:label},{category:label}]){
   const t=actor('target',fields);
   assert.equal(isTargetDaemon(t),false,JSON.stringify(fields));
   assert.equal(isTargetUndead(t),false,JSON.stringify(fields));
   assert.equal(isTargetConstruct(t),false,JSON.stringify(fields));
   assert.equal(isTargetEthereal(t),false,JSON.stringify(fields));
   assert.equal(hasLivingMagicNature(t),true,JSON.stringify(fields));
  }
 }
 for(const label of ['Démon','Daemon','Daemonic','Démoniaque','Démon (9+)','Sanguinaire'])assert.equal(isTargetDaemon(actor('target',{traits:[label]})),true,label);
 assert.equal(isTargetDaemon(actor('target',{isDaemon:true,traits:['Chasseur de démons']})),true);
 assert.equal(isTargetConstruct(actor('target',{isConstruct:true})),true);
 assert.equal(isTargetEthereal(actor('target',{isEthereal:true})),true);
 const hunter=actor('target',{traits:['Démonologue','Chasseur de démons','Chasseur de morts-vivants']});
 assert.equal(resolveSpellDamage({caster:actor(),target:hunter,formula:'4',roll:24,spell:{daemonBonus:5,undeadBonus:5,ignoreAp:true}}).rawDamage,4);
 for(const fields of [{camp:'ennemi',traits:['Chasseur de démons']},{camp:'ennemi',tags:['Chasseur de démons']}]){
  const store=await setup(actor(),actor('target',fields));
  const preview=store.previewSpellExecution('Fléau des Démons',{actorId:'mage',targetIds:['target'],sl:20,attributeActive:false});
  assert.equal(preview.ready,false);assert.match(preview.error,/n’est pas un Démon|n'est pas un Démon/);
  const banish=store.previewSpellExecution('Bannissement Majeur',{actorId:'mage',targetIds:['target'],sl:20,attributeActive:false});
  assert.equal(banish.targetResults[0].resisted,true);
  const taste=store.previewSpellExecution('Goût de la Mort',{actorId:'mage',targetIds:['target'],sl:20,attributeActive:false,targetTests:{target:{resistanceRoll:95,despairRoll:95}}});
  assert.equal(taste.ready,true,taste.error);
  assert.equal(Boolean(taste.targetResults[0].resisted),false);
 }
});

for(const name of ['Drain de Magie','Blizzard enflammé de Ygethmor','Bannissement Majeur','Pulvérisation Musquée'])test('Reliquat 4 : difficulté V5 de '+name,()=>{
 const spell=snapshot.magic.spells.find(s=>s.nom===name);
 assert.doesNotMatch(spell.desc,/Difficile \(\+0(?: DR)?\)|Moyen \(\+2 DR\)/);
 assert.doesNotMatch(getSpellContract(name).reminders,/Difficile \(\+0(?: DR)?\)|Moyen \(\+2 DR\)/);
 assert.match(spell.desc,name==='Drain de Magie'||name==='Blizzard enflammé de Ygethmor'?/Intermédiaire \(\+0 DR\)/:/Accessible \(\+2 DR\)/);
});

test('Reliquat 4 : libellés des options de surpuissance des contrats harmonisés en DR V5',async()=>{
 const {getAllSpellContracts}=await import('../js/core/v5-spell-contracts.js');
 for(const c of getAllSpellContracts()){
  for(const opt of c.overcast?.specific || []){
   const text=(opt.label || '')+' '+(opt.reminder || '');
   assert.doesNotMatch(text,/\([+−-](?:10|20|30)\)|Difficile\s*[−-](?:10|20)|Test d’Intelligence\s*[−-]10/,c.name+' : '+text);
  }
 }
});

test('Reliquat 4 : Attaque Rapide, libellé du miracle sans mécanisation ajoutée',()=>{
 const miracle=snapshot.magic.miracles.find(s=>s.nom==='Attaque Rapide');
 assert.match(miracle.effet,/Intermédiaire \(\+0 DR\)/);
 assert.doesNotMatch(miracle.effet,/Difficile \(\+0/);
});

test('Reliquat 5 : Apothéose +10 DR rappelle Yenlui Sombre (HEPG p.86)',()=>{
 const spell=snapshot.magic.spells.find(s=>s.nom==='Apothéose');
 assert.match(spell.desc,/\+10 DR[^]*Yenlui \(Sombre\)/);
 assert.match(getSpellContract('Apothéose').reminders,/\+10 DR[^]*Yenlui \(Sombre\)/);
});

