import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,level,verifySpell,inputFor,cast} from './helpers/lot3-domain-fixture.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';

// L02 pp. 62-64 : [nom FR, nom EN, page, NI, portée, cible, durée]
const SOURCE=[
 ['Dague de l’Art','Dagger of the Art',62,4,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Borne sinistre','Fellstave',62,9,'Spécial','Spécial','1 mois'],
 ['Revigorer','Invigorate',63,2,'Toucher','1','Bonus de Force Mentale Rounds'],
 ['Philtre d’amour','Lovelock',63,10,'Toucher','Spécial','Jusqu’à minuit'],
 ['Sachet de protection','Protection Pouch',63,5,'Toucher','Spécial','1 semaine + 1 semaine par DR'],
 ['Pas imperceptible','Sightstep',64,7,'Vous','Vous','Bonus de Force Mentale minutes'],
 ['Marée d’argent','Silvertide',64,4,'Vous','Vous','1d10 heures'],
 ['L’Expulsion','The Ousting',64,8,'Bonus de Force Mentale mètres','1','1d10 ans'],
 ['Protection contre le wyrd','Wyrd Ward',64,4,'Toucher','1','Bonus de Force Mentale heures']
];
for(const [fr,en,page,cn,range,target,duration] of SOURCE){
 test(`Magie naturelle AOTE3 p. ${page} — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
  const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
  assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
  assert.equal(c.domain,'hedgecraft');assert.equal(c.sourceBook,'L02');assert.match(c.edition,/AOTE3/);
  assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
 });
}
// Les contrats à dés explicites (opposition, Test fixe) ont leurs propres patchs ci-dessous.
const PATCHES={'Borne sinistre':{domainFactsExtra:{creatureType:'undead'}},'Philtre d’amour':{domainFactsExtra:{minutesToMidnight:90}}};
for(const fr of ['Borne sinistre','Revigorer','Philtre d’amour','Sachet de protection','Pas imperceptible','Marée d’argent'])
 test(`Magie naturelle AOTE3 — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{await verifySpell(getSpellContract(fr),PATCHES[fr]||{});});


test('Dague de l’Art — deux attaques Magiques : BF + 2, et BF + 8 contre Éthéré ou Corruption ; bâtonnet sans effet de règle',async()=>{
 const {store}=await encounter();const c=getSpellContract('Dague de l’Art');
 const before=store.listParticipants();
 await cast(store,c);
 const attacks=subject(store,'mage').actions.filter(a=>a.id.startsWith('spell-weapon-'));
 assert.equal(attacks.length,2);
 assert.deepEqual(attacks.map(a=>a.damageFormula),['BF+2','BF+8']);
 assert.ok(attacks.every(a=>a.qualities.some(q=>q.id==='magique')));
 assert.match(attacks[1].note,/Éthéré ou Corruption/);
 assert.match(c.reminders,/Focalisation Intermédiaire \(\+0 DR\)/);
 assert.equal(c.overcast.options.includes('targets'),false);
 assert.equal(subject(store,'mage').actions.length,3);
 await store.undo();assert.deepEqual(store.listParticipants(),before,'Undo atomique');
});
test('Revigorer — deux Exténué : la pénalité de −2 DR disparaît pendant la durée, le compteur reste, retour à l’échéance',async()=>{
 const {store,engine}=await encounter({mage:{states:[{id:'f',name:'Exténué',level:2}]}});
 const action={type:'skill',attr:'Ag',label:'Athlétisme',base:50};
 const mod=()=>store.previewResolution({actorId:'mage',action,roll:45,v5:{kind:'test',choice:'keep'}}).test;
 const before=mod();
 await cast(store,getSpellContract('Revigorer'),{targetIds:['mage']});
 const during=mod();
 assert.equal(level(subject(store,'mage'),'Exténué'),2,'compteur conservé');
 assert.ok(during.sl>before.sl,'la pénalité d’Exténué n’est plus appliquée : '+before.sl+' -> '+during.sl);
 assert.equal(during.sl-before.sl,2);
});
test('Pas imperceptible — aura masquée, aucun lancer, aucune Focalisation, aucune dissipation, +2 DR Discrétion en reçu',async()=>{
 const {store}=await encounter();const c=getSpellContract('Pas imperceptible');
 await cast(store,c);
 const flags=subject(store,'mage').extensions.v5.specialStates;
 assert.equal(flags.magicAuraHidden,true);assert.equal(flags.cannotCast,true);assert.equal(flags.cannotChannel,true);assert.equal(flags.cannotDispel,true);
 assert.equal(c.effects.receiptFormulas.discretionContreDemonsEspritsEtheresDR,2);
 const other=getSpellContract('Revigorer');
 const p=store.previewSpellExecution(other.id,inputFor(other,{targetIds:['mage']}));
 assert.equal(p.ready,false);
});
test('L’Expulsion — Éthéré ou Démoniaque seulement ; Volonté +0 : réussie, rien ; ratée, BFM Blessures directes',async()=>{
 for(const [roll,hp] of [[10,20],[95,14]]){
  const {store}=await encounter({foe:{traits:['Éthéré'],hp:20}});
  const c=getSpellContract('L’Expulsion');
  await cast(store,c,{targetTests:{foe:{resistanceRoll:roll,roll}}});
  assert.equal(subject(store,'foe').hp,hp,'jet '+roll);
 }
 const {store}=await encounter({foe:{traits:[],hp:20}});const c=getSpellContract('L’Expulsion');
 const ordinary=store.previewSpellExecution(c.id,inputFor(c,{targetTests:{foe:{resistanceRoll:95,roll:95}}}));
 assert.equal(ordinary.targetResults[0].resisted,true,'une cible ordinaire est exemptée');assert.equal(ordinary.targetResults[0].woundsLost||0,0);
 const daemon=await encounter({foe:{traits:['Démoniaque']}});
 assert.equal(daemon.store.previewSpellExecution(c.id,inputFor(c,{targetTests:{foe:{resistanceRoll:95,roll:95}}})).ready,true);
});
test('Protection contre le wyrd — opposition de Force Mentale à deux dés, malus rappelé pour les seules traditions sombres',async()=>{
 const c=getSpellContract('Protection contre le wyrd');
 assert.equal(c.effects.receiptFormulas.langueMagickEtFocalisationDR,-2);
 assert.match(c.reminders,/Sorcellerie, Nécromancie, Démonologie ou un Domaine du Chaos/);
 const {store}=await encounter();
 const missing=store.previewSpellExecution(c.id,inputFor(c));
 assert.equal(missing.ready,false,'sans dés explicites l’opposition est refusée');
 for(const [actorRoll,foeRoll] of [[25,95],[95,25]]){
  const {store:s}=await encounter();
  const input=inputFor(c,{domainFacts:{opposedActorRoll:actorRoll},targetTests:{foe:{opponentRoll:foeRoll,roll:foeRoll,resistanceRoll:foeRoll}}});
  const p=s.previewSpellExecution(c.id,input);
  assert.equal(p.ready,true,p.error);
 }
});
test('Magie naturelle AOTE3 — le lancement ne réclame jamais d’ingrédient',async()=>{
 const {store}=await encounter({foe:{traits:['Éthéré']}});
 for(const [fr] of SOURCE.filter(([n])=>!['Protection contre le wyrd'].includes(n))){
  const c=getSpellContract(fr);
  const p=store.previewSpellExecution(c.id,inputFor(c,{...(PATCHES[fr]||{}),targetTests:{foe:{resistanceRoll:95,roll:95}}}));
  assert.equal(p.ready,true,fr+' : '+p.error);
 }
});
