import assert from 'node:assert/strict';
import {createStore} from '../../js/core/store.js';
import {getAllSpellContracts} from '../../js/core/v5-spell-contracts.js';
import {encounter,subject,level,endTurn} from './lot3-domain-fixture.js';

// Attentes indépendantes du générateur : pages intégralement relues, V5 pp. 240–245.
// Canonique, page, NI, portée, cible, durée (chaînes françaises normalisées pour la comparaison).
export const sourceCases=[
 ['Aethyric Arms',242,3,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Aethyric Armour',242,2,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Arrow Shield',243,3,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Blast',243,4,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Instantané'],
 ['Bolt',243,4,'Force Mentale mètres','1','Instantané'],
 ['Breath',243,6,'Spécial','Spécial','Instantané'],
 ['Bridge',243,4,'Force Mentale mètres','Spécial','Bonus de Force Mentale Rounds'],
 ['Chain Attack',243,6,'Force Mentale mètres','Spécial','Instantané'],
 ['Corrosive Blood',243,2,'Vous','Vous','Bonus d’Endurance Rounds ou heures'],
 ['Dark Vision',243,1,'Vous','Vous','Bonus d’Initiative Rounds'],
 ['Distracting',244,4,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Dome',244,7,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Drop',244,1,'Force Mentale mètres','1','Instantané'],
 ['Entangle',244,3,'Bonus de Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['Fearsome',244,3,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Flight',244,8,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Magic Shield',244,4,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Move Object',244,4,'Force Mentale mètres','1','1 Round'],
 ['Mundane Aura',244,4,'Vous','Vous','Force Mentale minutes'],
 ['Push',245,6,'Vous','ZdE Bonus de Force Mentale mètres maximum','Instantané'],
 ['Teleport',245,3,'Vous','Vous','Instantané'],
 ['Terrifying',245,6,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Ward',245,6,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Animal Friend',240,0,'1 mètre','1','1 heure'],
 ['Bearings',240,0,'Vous','Vous','Instantané'],
 ['Careful Step',240,0,'Vous','Vous','Agilité minutes'],
 ['Conserve',240,0,'1 mètre','Spécial','Bonus de Force Mentale jours'],
 ['Dart',240,0,'Force Mentale mètres','1','Instantané'],
 ['Dazzle',240,0,'Contact','1','Bonus de Force Mentale Rounds'],
 ['Drain',240,0,'Contact','1','Instantané'],
 ['Eavesdrop',241,0,'Initiative mètres','1','Bonus de Force Mentale minutes'],
 ['Gust',241,0,'Force Mentale mètres','Spécial','Instantané'],
 ['Light',241,0,'Vous','Vous','Force Mentale minutes'],
 ['Magic Flame',241,0,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Marsh Lights',241,0,'Force Mentale mètres','Spécial','Force Mentale minutes'],
 ['Murmured Whisper',241,0,'Force Mentale mètres','Spécial','Bonus de Force Mentale Rounds'],
 ['Open Lock',241,0,'Contact','1','Instantané'],
 ['Produce Small Animal',241,0,'Contact','Spécial','Instantané'],
 ['Protection from Rain',241,0,'Vous','Vous','Bonus de Force Mentale heures'],
 ['Purify Water',241,0,'1 mètre','Spécial','Instantané'],
 ['Rot',242,0,'1 mètre','Spécial','Instantané'],
 ['Shock',242,0,'Contact','1','Instantané'],
 ['Sleep',242,0,'Contact','1','Bonus de Force Mentale Rounds'],
 ['Sly Hands',242,0,'Vous','Vous','Instantané'],
 ['Sounds',242,0,'Force Mentale mètres','Spécial','Bonus de Force Mentale Rounds'],
 ['Spring',242,0,'Contact','Spécial','Bonus de Force Mentale Rounds'],
 ['Twitch',242,0,'Moitié de la Force Mentale mètres','1','Instantané'],
 ['Warning',242,0,'1 mètre','1','Instantané']
];
export const arcaneCases=sourceCases.filter(([,page,cn])=>cn>0),pettyCases=sourceCases.filter(([,page,cn])=>cn===0);
export const contractFor=name=>getAllSpellContracts().find(c=>c.isBookV5&&c.canonicalName===name);
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
export function sourceParameters(c,row){
 assert.equal(c.page,row[1]);assert.equal(c.cn,row[2]);assert.equal(norm(c.range),norm(row[3]),c.name+' portée');
 if(row[4]==='1')assert.match(c.target,/^1\b/,c.name+' cible');else assert.equal(norm(c.target),norm(row[4]),c.name+' cible');
 assert.equal(norm(c.duration),norm(row[5]),c.name+' durée');
 assert.equal(c.overcast.allowed,row[2]>0,'surpuissance interdite pour tout mineur');
}
export async function fixture(row){
 const traits=row[0]==='Animal Friend'?['Bestial','Taille (Petite)']:[];
 return encounter({mage:{hp:10,maxHp:50,talents:[{id:'talent-arcane-magic',status:'resolved',specialization:'Feu',rank:1}],skills:[{name:'Langue (Magick)',total:90},{name:'Focalisation',total:90},{name:'Athlétisme',total:50}],extensions:{v5:{hasMomentum:false,channelling:{type:'winds',sl:5}}}},foe:{hp:40,maxHp:50,traits}});
}
export function spellInput(row,patch={}){
 return {actorId:'mage',targetIds:row[4]==='Vous'?['mage']:['foe'],roll:25,chosenLore:'fire',attributeActive:false,locationRoll:34,
  ctRoll:25,damageRoll:7,chosenWeapon:'sword',weaponSkillScore:50,mjDuration:{amount:4,unit:'rounds'},
  domainFacts:{weaponKey:'sword',weaponSkillScore:50,corrosiveMode:'rounds',flying:true,casterSize:4,objectSentient:false,objectDimension:1,localAnimalAvailable:true,animalDescription:'Un rat local',organic:true,rotMode:'leather',rotLocation:'BODY',nonMagicalLock:true,objectTiny:true,objectOnPerson:true,nearbyDeclared:true,collisionDeclared:true},
  targetTests:{foe:{objectId:'blade',targetSize:3,objectHeld:true,dodgeRoll:95,distance:10,fromPrimary:0,resistanceRoll:95,voluntaryTired:false,wardRoll:1},mage:{objectId:'blade'}},
  resistanceRoll:95,secondaryTargets:{engaged:[]},...patch};
}
export async function execute(store,row,patch={}){
 const c=contractFor(row[0]),input=spellInput(row,patch),p=store.previewSpellExecution(c.id,input);
 assert.equal(p.ready,true,c.name+' : '+p.error);const result=await store.applySpellExecution(c.id,input);assert.notEqual(result?.ok,false,result?.error);return p;
}
export function sourceEffects(row,p,store){
 const mage=subject(store,'mage'),foe=subject(store,'foe');
 switch(row[0]){
  case 'Aethyric Armour':assert.equal(mage.armor.body,3,'+1 PA (p. 242)');break;
  case 'Aethyric Arms':assert.ok(mage.actions.some(a=>a.id!=='blade'&&a.type==='attack'&&a.qualities.some(q=>(q.id||q)==='magique')),'arme choisie conjurée');break;
  case 'Arrow Shield':assert.equal(foe.extensions.v5.wards[0].threshold,1);break;
  case 'Bolt':assert.equal(p.targetResults[0].missile.rawDamage,10);break;
  case 'Blast':assert.equal(p.targetResults[0].missile.rawDamage,9);break;
  case 'Chain Attack':assert.equal(p.targetResults[0].missile.rawDamage,10);break;
  case 'Dome':assert.equal(foe.extensions.v5.ward,6);break;
  case 'Ward':assert.equal(mage.extensions.v5.ward,7);break;
  case 'Flight':assert.ok(mage.traits.includes('Vol (50)'),'Athlétisme, pas Mouvement 4');break;
  case 'Entangle':assert.equal(level(foe,'Enchevêtré'),1);assert.equal(foe.states.find(s=>s.name==='Enchevêtré').source.strength,60);break;
  case 'Shock':assert.equal(foe.hp,40,'aucun projectile ni Blessure');assert.equal(level(foe,'Sonné'),1);break;
  case 'Dazzle':assert.equal(level(foe,'Aveuglé'),1);break;
  case 'Drain':assert.equal(foe.hp,38);assert.equal(mage.hp,11,'le lanceur récupère exactement 1 B');break;
  case 'Sleep':assert.equal(level(foe,'À Terre'),1);assert.equal(level(foe,'Inconscient'),0,'debout : se réveille en tombant');break;
  case 'Eavesdrop':assert.equal(foe.extensions.v5.testModifiers?.['Perception (Écoute à distance)']||0,0,'aucun +2 inventé');break;
  case 'Twitch':assert.equal(foe.extensions.v5.testModifiers?.Dex||0,0,'aucun malus permanent');assert.equal(p.targetResults[0].resistanceTest?.targetScore,50);break;
  case 'Produce Small Animal':assert.equal(store.listParticipants().length,2,'aucun profil animal inventé');break;
  case 'Rot':assert.equal(foe.armor.body,1,'un seul PA de cuir perdu');break;
 }
}
export async function verifyArcanePetty(row){
 const c=contractFor(row[0]);assert.ok(c,row[0]);sourceParameters(c,row);
 const {store,engine,persistence}=await fixture(row);const before=store.listParticipants();
 const p=await execute(store,row);sourceEffects(row,p,store);
 const after=store.listParticipants(),reload=createStore({persistence});await reload.ready;assert.deepEqual(reload.listParticipants(),after);
 await store.undo();assert.deepEqual(store.listParticipants(),before);await execute(store,row);
 const effect=store.listParticipants().flatMap(p=>p.extensions.v5.spellEffects || []).find(e=>e.spellId===c.id);
 if(effect?.expiresAtRound>1){
  // Pour les longues durées, commande publique d'horloge : aucun combat.round forcé dans la fixture.
  if(effect.expiresAtRound>13)await store.advanceTalentMinutes((effect.expiresAtRound-store.getCombat().round-1)/6);
  for(let turns=0;store.listParticipants().some(p=>(p.extensions.v5.spellEffects || []).some(e=>e.spellId===c.id))&&turns<30;turns++)await endTurn(engine);
  assert.ok(!store.listParticipants().some(p=>(p.extensions.v5.spellEffects || []).some(e=>e.spellId===c.id)),'expiration par vraie fin de tour');
  await store.undo();assert.ok(store.listParticipants().some(p=>(p.extensions.v5.spellEffects || []).some(e=>e.spellId===c.id)),'Undo du Tour final');
 }
}
