import assert from 'node:assert/strict';
import {getAllSpellContracts} from '../../js/core/v5-spell-contracts.js';
import {createStore} from '../../js/core/store.js';
import {encounter,subject,level,endTurn} from './lot3-domain-fixture.js';
// Paramètres transcrits depuis les pages complètes HEPG ; aucune attente dérivée du générateur.
export const sourceCases=[
 ['Apothéose',86,4,'Moitié de la Force Mentale mètres','1','1 Round'],
 ['Destruction des Arcanes',86,9,'Force Mentale mètres','1','Instantané'],
 ['Coruscation de Finreir',86,11,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ["Malédiction d'Attraction des Flèches",86,5,'Force Mentale mètres','ZdE Bonus de CT mètres','Bonus de Force Mentale Rounds'],
 ['Impasse',87,5,'Moitié de l’Endurance mètres','1 lanceur, sort ou objet','Bonus de Force Mentale minutes'],
 ['Drain de Magie',87,6,'Moitié de la Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Instantané'],
 ['Convocation Ardente',87,10,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['La Fortune est Capricieuse',87,6,'Sociabilité mètres','1','Bonus de Sociabilité Rounds'],
 ['Glamour de Teclis',88,7,'Force Mentale mètres','ZdE Bonus d’Intelligence mètres','Bonus d’Intelligence Rounds'],
 ['Bannissement Majeur',88,14,'Vous','ZdE Moitié de la Force Mentale mètres','1 Round'],
 ['Main de Gloire',88,4,'Vous','ZdE Bonus de Sociabilité mètres','1 Round'],
 ['Œil Invisible',88,4,'Bonus d’Intelligence mètres','Spécial','Bonus d’Intelligence heures'],
 ['Bouclier de Saphery',89,4,'Vous','ZdE Bonus de Force Mentale mètres','1 Round'],
 ["Extinction de l'Âme",89,7,'Moitié de la Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Instantané'],
 ['Tempête',89,8,'Force Mentale mètres','ZdE 2 × Bonus de Force Mentale mètres','1 Round'],
 ['Chemin entre les Mondes',89,7,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','1 Round'],
 ['Enchantement Végétal (Ghyran & Chamon)',81,4,'Contact','1 plante','Instantané'],
 ['Bannissement Mineur (Hysh & Shyish)',81,4,'Force Mentale mètres','1','Instantané'],
 ['Alarme Magique (Azyr & Ulgu)',82,5,'Bonus de Force Mentale mètres','ZdE Bonus d’Initiative mètres','Bonus de Force Mentale heures'],
 ["Masque de l'Esprit (Shyish & Ulgu)",82,4,'Vous','Vous','Bonus de Force Mentale heures'],
 ['Purification du Corps (Ghyran & Hysh)',82,6,'Contact','1','Instantané'],
 ['Parler avec un Animal (Azyr & Ghur)',82,3,'Bonus de Force Mentale mètres','1 animal','Intelligence minutes'],
 ['Voix de Fer (Aqshy & Chamon)',82,4,'Vous','Vous','Sociabilité minutes'],
 ['Zone de Confort (Aqshy & Ghur)',82,2,'Vous','Vous','Bonus de Force Mentale heures'],
 ['Flèche Bénie',80,0,'Contact','1 flèche','Bonus de Force Mentale Rounds'],
 ['Calme',80,0,'Contact','1','Instantané'],
 ['Doigt Vert',80,0,'Contact','ZdE Bonus de Force Mentale mètres','Instantané'],
 ['Identifier une Maladie',81,0,'Contact','1','Instantané'],
 ['Enlever la Saleté',81,0,'Contact','1 ou ZdE Bonus de Force Mentale mètres','Instantané'],
 ['Révéler la Magie',81,0,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds']
];
export const contractFor=name=>getAllSpellContracts().find(c=>c.name===name);
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
export async function fixture(row,extras={}){
 const c=contractFor(row[0]),high=c.domain==='high';
 const {store,engine,persistence}=await encounter({mage:{hp:10,maxHp:50,skills:[{name:'Langue (Magick)',total:90},{name:'Focalisation',total:90},{name:'Focalisation (Qhaysh)',total:90},{name:'Athlétisme',total:50},{name:'Commandement',total:50}],talents:[{id:'talent-high-magic',status:'resolved',rank:1},{id:'talent-arcane-magic',status:'resolved',specialization:'Feu',rank:1}],extensions:{v5:{hasMomentum:true,channelling:{type:high?'high':'winds',sl:30}}}},foe:{hp:200,maxHp:300,traits:row[0].startsWith('Bannissement')?['Mort-vivant']:row[0].startsWith('Parler')?['Bestial']:[],actions:[{id:'blade',type:'attack',attr:'CC',base:50,damage:3,qualities:[]},{id:'arrow',type:'attack',attr:'CT',base:50,damage:3,qualities:[]}]}});
 if(row[0]==='Impasse')await store.applySpellEffects('foe',{spellId:'test-existing-spell',spellName:'Effet existant',casterId:'mage',cn:2,durationRounds:12,apModifiers:{all:1}});
 if(extras.foe){const state=JSON.parse(store.getFullJSON());state.combat.participants=state.combat.participants.map(p=>p.id==='foe'?{...p,...extras.foe,extensions:{...p.extensions,...extras.foe.extensions,v5:{...p.extensions?.v5,...extras.foe.extensions?.v5}}}:p);await store.loadFromJSON(state);}
 return {store,engine,persistence};
}
export function spellInput(row,store,patch={}){
 const c=contractFor(row[0]),self=row[4]==='Vous'||['Main de Gloire','Bouclier de Saphery','Chemin entre les Mondes','Œil Invisible'].includes(row[0]);
 return {actorId:'mage',targetIds:[self?'mage':'foe'],roll:25,attributeActive:false,burnoutRoll:50,locationRoll:34,fellowshipRoll:25,enduranceRoll:25,roll3d10:15,chosenStats:['CC'],chosenCharacteristic:'CC',hogTier:'base',directionRoll:4,distanceRoll:10,arcaneTargets:{foe:{magicItemPresent:false}},
 domainFacts:{optionRoll_locations:25,optionRoll_wide:25,optionRoll_exempt:25,optionRoll_items:25,optionRoll_duration:25,objectId:'blade',arrowNonMagical:true,plantNonMagical:true,plantUnenchanted:true,plantProperty:'hardy',lesserEntity:true,opposedActorRoll:25,deadlockMode:'effect',spellKnown:true,suppressedSpellId:'spell-audit-57c2fake',affliction:'poison',afflictionName:'Poison déclaré',magicNature:true},
 targetTests:{foe:{objectId:row[0]==='Flèche Bénie'?'arrow':'blade',targetSize:3,opponentRoll:95,magicNature:true,suppressedEffectId:subject(store,'foe').extensions.v5.spellEffects?.[0]?.id},mage:{targetSize:3,magicNature:false}},...patch};
}
export async function execute(store,row,patch={}){const c=contractFor(row[0]),input=spellInput(row,store,patch),before=store.listParticipants(),p=store.previewSpellExecution(c.id,input);assert.deepEqual(store.listParticipants(),before,'aperçu pur');assert.equal(p.ready,true,c.name+' : '+p.error);const result=await store.applySpellExecution(c.id,input);assert.notEqual(result?.ok,false,result?.error);return p;}
export function sourceEffects(row,p,store){const mage=subject(store,'mage'),foe=subject(store,'foe'),r=p.targetResults[0];switch(row[0]){
 case 'Apothéose':assert.equal(foe.hp,206);assert.ok(foe.traits.includes('Peur (1)'));break;
 case 'Coruscation de Finreir':assert.equal(mage.armor.body,5);assert.ok(mage.traits.includes('Vol (Agilité)'));assert.equal(mage.extensions.v5.specialStates.flying,true,'HEPG p. 86 : le pilier élève le lanceur');break;
 case "Malédiction d'Attraction des Flèches":assert.equal(foe.extensions.v5.testModifiers?.['Défense contre Tir'] || 0,0);assert.equal(foe.extensions.v5.specialStates.incomingRangedBonusSl,undefined);assert.equal(foe.extensions.v5.specialStates.missileMissReroll,true);break;
 case 'Convocation Ardente':assert.equal(r.damage?.rawDamage||r.missile?.rawDamage,11);assert.equal(level(foe,'Enflammé'),1);break;
 case 'Glamour de Teclis':assert.equal(foe.extensions.v5.testModifiers?.['Perception adverse']||0,0);assert.equal(foe.extensions.v5.testModifiers?.['Intuition adverse']||0,0);break;
 case 'Bannissement Majeur':assert.equal(foe.hp,200,'le hit périodique est en fin de Round, pas une formule 14+DR au lancer');break;
 case 'Main de Gloire':assert.equal(mage.caracs.CC,65);assert.equal(mage.maxHp,50);break;
 case 'Bouclier de Saphery':assert.equal(mage.extensions.v5.ward,9);break;
 case "Extinction de l'Âme":assert.equal(r.missile.rawDamage,15);break;
 case 'Chemin entre les Mondes':assert.equal(mage.caracs.M,8);assert.ok(mage.traits.includes('Éthéré'));break;
 case 'Tempête':assert.equal(foe.caracs.CC,50,'pénalité seulement après Test d’Athlétisme raté');break;
 case 'Bannissement Mineur (Hysh & Shyish)':assert.equal(foe.hp,200,'aucune Blessure du bannissement');assert.equal(foe.zone,'bench');break;
 case 'Alarme Magique (Azyr & Ulgu)':assert.equal(mage.extensions.v5.testModifiers?.Perception || 0,0);assert.equal(foe.extensions.v5.testModifiers?.Perception || 0,0);break;
 case 'Parler avec un Animal (Azyr & Ghur)':assert.equal(foe.extensions.v5.testModifiers?.Dressage || 0,0);assert.equal(foe.extensions.v5.testModifiers?.['Charme Animal'] || 0,0);break;
 case 'Voix de Fer (Aqshy & Chamon)':assert.equal(mage.caracs.Soc,50);assert.ok(!mage.traits.some(t=>/^Peur/.test(t)));assert.equal(mage.extensions.v5.testModifiers.Commandement,1);break;
 case 'Zone de Confort (Aqshy & Ghur)':assert.equal(mage.extensions.v5.damageReduction,1);assert.equal(mage.extensions.v5.testModifiers?.['Résistance (Intempéries)'] || 0,0);break;
 case 'Purification du Corps (Ghyran & Hysh)':assert.equal(level(foe,'Sonné'),0);break;
 case 'Flèche Bénie':assert.equal(foe.extensions.v5.weaponBonuses?.length || 0,0,'pas de bonus à tous les tirs du porteur');break;
 case 'Révéler la Magie':assert.ok(!(foe.talents || []).includes('Seconde vue'));assert.equal(foe.extensions.v5.testModifiers?.['Seconde vue'] || 0,0);break;
}}
export async function verifyElven(row){
 const c=contractFor(row[0]);assert.ok(c);assert.equal(c.page,row[1]);assert.equal(c.cn,row[2]);for(const [key,value] of [['range',row[3]],['target',row[4]],['duration',row[5]]])assert.equal(norm(c[key]),norm(value),c.name+' '+key);assert.equal(c.overcast.allowed,row[2]>0);
 const {store,engine,persistence}=await fixture(row),before=store.listParticipants(),p=await execute(store,row);sourceEffects(row,p,store);const after=store.listParticipants(),reload=createStore({persistence});await reload.ready;assert.deepEqual(reload.listParticipants(),after);await store.undo();assert.deepEqual(store.listParticipants(),before);await execute(store,row);
 const timed=store.listParticipants().flatMap(p=>p.extensions?.v5?.spellEffects || []).filter(e=>e.spellId===c.id&&e.expiresAtRound>1);if(timed.length){const deadline=Math.max(...timed.map(e=>e.expiresAtRound));if(deadline>13)await store.advanceTalentMinutes((deadline-store.getCombat().round-1)/6);for(let i=0;i<32&&store.listParticipants().some(p=>(p.extensions?.v5?.spellEffects || []).some(e=>e.spellId===c.id));i++)await endTurn(engine);assert.ok(!store.listParticipants().some(p=>(p.extensions?.v5?.spellEffects || []).some(e=>e.spellId===c.id)));await store.undo();assert.ok(store.listParticipants().some(p=>(p.extensions?.v5?.spellEffects || []).some(e=>e.spellId===c.id)));}
}

// HEPG pp. 80–89 : variantes payées sur le Store, dés/faits synthétiques explicites.
export async function verifyElvenOptions(row){
 const c=contractFor(row[0]);
 if(!c.overcast.allowed){const {store}=await fixture(row);const p=store.previewSpellExecution(c.id,spellInput(row,store,{overcastChoices:{range:2}}));assert.equal(p.ready,false,'HEPG pp. 80–81 : surpuissance mineure interdite');return;}
 for(const option of (c.overcast.options || []).filter(k=>k!=='special')){
  const {store}=await fixture(row),steps=option==='aoe'?3:option==='damage'?1:2;
  const p=await execute(store,row,{overcastChoices:{[option]:steps}});assert.equal(p.castingPreview.overcast.totalSpent,steps);
 }
 for(const option of c.overcast.specific || []){
  const {store}=await fixture(row),p=await execute(store,row,{overcastSpecific:{[option.id]:1}});
  assert.equal(p.castingPreview.overcast.totalSpent,option.cost);
  const rule=c.effects.optionRules?.[option.id];if(rule?.test){
   const {store:missingStore}=await fixture(row),facts={...spellInput(row,missingStore).domainFacts,['optionRoll_'+option.id]:undefined};
   const missing=missingStore.previewSpellExecution(c.id,spellInput(row,missingStore,{domainFacts:facts,overcastSpecific:{[option.id]:1}}));assert.equal(missing.ready,false,'dé secondaire manquant bloque');assert.match(missing.error,/d100|saisie MJ/);
   const {store:failStore}=await fixture(row),failed=await execute(failStore,row,{domainFacts:{...spellInput(row,failStore).domainFacts,['optionRoll_'+option.id]:95},overcastSpecific:{[option.id]:1}});
   assert.equal(failed.targetResults.flatMap(r=>r.actions).find(a=>a.kind==='option-tests').tests.find(t=>t.id===option.id).test.success,false);
  }
 }
}
