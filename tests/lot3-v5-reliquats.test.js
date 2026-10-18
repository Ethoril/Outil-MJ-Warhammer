import test from 'node:test';
import assert from 'node:assert/strict';
import snapshot from '../js/data/reference-snapshot.json' with {type:'json'};
import {sanitizeParticipant,sanitizeProfile} from '../js/core/sanitize.js';
import {actor,setup,person} from './helpers/relecture2-fixture.js';
import {isTargetDaemon} from '../js/core/v5-magic-attributes.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';

test('Reliquat 1 : trous RTDB et lignes non objets d’équipement filtrés, objet valide conservé',()=>{
 const item={id:'sword',kind:'weapon',name:'Épée',keywords:[]};
 const p=actor('mage',{equipment:[null,false,'',[],item]});
 assert.deepEqual(sanitizeParticipant(p).equipment,[item]);
 assert.deepEqual(sanitizeProfile(p).equipment,[item]);
});

test('Reliquat 1 : attaque Store avec ligne vide d’équipement, sauvegarde et rechargement',async()=>{
 const store=await setup(actor('mage',{equipment:[null]}),actor('target',{camp:'ennemi',equipment:[null]}));
 const options={actorId:'mage',targetId:'target',action:{id:'sword',type:'attack',attr:'CC',base:60,damage:4,qualities:[]},roll:25,defense:{base:30,roll:75,v5:{kind:'melee'}},v5:{kind:'melee'}};
 const preview=store.previewResolution(options);assert.equal(preview.success,true);
 const reloaded=await setup(person(store),person(store,'target'));
 assert.equal(reloaded.previewResolution(options).success,true);
 assert.deepEqual(person(reloaded).equipment,[]);
});

test('Reliquat 3 : Chasseur de démons ne qualifie aucune source comme Démon',async()=>{
 for(const label of ['Chasseur de démons','Démonologue','Pas un Démon','Démoniste']){
  for(const fields of [{traits:[label]},{extensions:{traits:[{name:label}]}},{tags:[label]},{species:label},{category:label}])assert.equal(isTargetDaemon(actor('target',fields)),false,JSON.stringify(fields));
 }
 for(const label of ['Démon','Daemon','Daemonic','Démoniaque','Démon (9+)','Sanguinaire'])assert.equal(isTargetDaemon(actor('target',{traits:[label]})),true,label);
 assert.equal(isTargetDaemon(actor('target',{isDaemon:true,traits:['Chasseur de démons']})),true);
 for(const fields of [{traits:['Chasseur de démons']},{tags:['Chasseur de démons']}]){
  const store=await setup(actor(),actor('target',fields));
  const preview=store.previewSpellExecution('Fléau des Démons',{actorId:'mage',targetIds:['target'],sl:20,attributeActive:false});
  assert.equal(preview.ready,false);assert.match(preview.error,/n’est pas un Démon|n'est pas un Démon/);
 }
});

for(const name of ['Drain de Magie','Blizzard enflammé de Ygethmor','Bannissement Majeur','Pulvérisation Musquée'])test('Reliquat 4 : difficulté V5 de '+name,()=>{
 const spell=snapshot.magic.spells.find(s=>s.nom===name);
 assert.doesNotMatch(spell.desc,/Difficile \(\+0(?: DR)?\)|Moyen \(\+2 DR\)/);
 assert.doesNotMatch(getSpellContract(name).reminders,/Difficile \(\+0(?: DR)?\)|Moyen \(\+2 DR\)/);
 assert.match(spell.desc,name==='Drain de Magie'||name==='Blizzard enflammé de Ygethmor'?/Intermédiaire \(\+0 DR\)/:/Accessible \(\+2 DR\)/);
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
