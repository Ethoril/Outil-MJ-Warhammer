import assert from 'node:assert/strict';
import {createStore} from '../../js/core/store.js';
import {getAllSpellContracts} from '../../js/core/v5-spell-contracts.js';
import {encounter,subject,level,endTurn} from './lot3-domain-fixture.js';
// WoM : transcription indépendante des paramètres, après lecture des pages complètes.
const FM='Force Mentale mètres',BFM='Bonus de Force Mentale Rounds',half='Moitié de la Force Mentale mètres',aoe='ZdE Bonus de Force Mentale mètres';
export const sourceCases=[
 ['Corps de Feu',134,5,'Vous','Vous','Bonus d’Endurance minutes','fire'],
 ['Tête Brûlante',134,6,FM,'Spécial','Instantané','fire'],
 ['Flamme Captivante',134,3,half,'1 feu',BFM,'fire'],
 ['Colérique',135,2,'Moitié de l’Initiative mètres','1','Bonus de Force Mentale heures','fire'],
 ['Tempête de Flammes',135,8,FM,'Spécial','Spécial','fire'],
 ['Forge de Tarnus',136,6,'Contact','1 forge','Bonus de Force Mentale heures','fire'],
 ['Ignition',136,3,FM,'1','Instantané','fire'],
 ['Flamme Inextinguible',136,3,'Moitié de l’Initiative mètres','1 feu','Bonus de Force Mentale heures','fire'],
 ['Flamme Attisée',136,2,FM,aoe,'1 Round','fire'],
 ['Esprit du Foyer',136,4,'Contact','Spécial',BFM,'fire'],
 ['Tempête Magmatique',136,13,'Vortex aléatoire','ZdE 2 × Bonus de Force Mentale mètres',BFM,'fire'],
 ['Goût de Feu',137,2,'Bonus de Force Mentale mètres','1 pot, cruche ou flacon','Instantané','fire'],
 ['Chaleur Desséchante',137,6,'ZdE Force Mentale mètres','Vous',BFM,'fire'],
 ['Arc de T’Essla',101,7,FM,'1','Instantané','heavens'],
 ['Orage de Thorsen',101,11,'Vortex aléatoire','ZdE 2 × Bonus de Force Mentale mètres',BFM,'heavens'],
 ['Polir et Exalter',100,1,'Contact','1 objet','Bonus d’Initiative minutes','heavens'],
 ['Projection Spirituelle',100,7,'Vous','Vous','Bonus d’Endurance heures','heavens'],
 ['Arche de Saphir',100,6,half,'Spécial','1 Round','heavens'],
 ['Lames Azurées',98,6,'Vous','Vous',BFM,'heavens'],
 ['Malédiction du Destin',99,8,half,'1','1 jour','heavens'],
 ['Divination',99,3,'Vous','Vous','Instantané','heavens'],
 ['Ennemi Anticipé',99,4,'Vous','Vous','Bonus de Force Mentale minutes','heavens'],
 ['Prémonition Fantastique',99,7,'ZdE Force Mentale mètres','Vous','1 Round','heavens'],
 ['Destin Illuminé',99,5,'Moitié de l’Intelligence mètres ou Contact','1','Instantané','heavens'],
 ['Lentille du Ciel',100,3,'Vous','Vous','Bonus d’Initiative minutes','heavens'],
 ['Que les Quatre Vents Soufflent !',100,9,FM,'4 × ZdE Bonus de Force Mentale mètres','Instantané','heavens'],
 ['Mistral de la Stratosphère',100,7,'Bonus de Force Mentale mètres',aoe,BFM,'heavens'],
 ['Miroir Mystique',100,7,'Force Mentale miles','1 (maximum)','Bonus de Sociabilité Rounds','heavens'],
 ['Éclat Stellaire',101,8,'ZdE Force Mentale mètres','Vous','Bonus de Force Mentale minutes','heavens'],
 ['Tempête de Shemtek',101,11,half,'2 × Bonus d’Initiative ou Bonus d’Initiative','Instantané','heavens'],
 ['Écaille d’acier',75,5,'Vous','Vous','Bonus d’Endurance Rounds','metal'],
 ['Inscription',76,2,'1 mètre','Spécial','Spécial','metal'],
 ['Métal restauré',76,4,'Contact','1 objet','Instantané','metal'],
 ['Armure d’étain',74,4,FM,aoe,BFM,'metal'],
 ['Franchir l’inconnu',74,4,'Initiative mètres','1','Instantané','metal'],
 ['Malédiction de rouille',74,4,FM,'1 objet d’Encombrement 1','Instantané','metal'],
 ['Défaut de Forme',75,2,FM,'1 arme','Bonus d’Initiative Rounds','metal'],
 ['Globe doré de Gehenna',75,13,'Vortex aléatoire','ZdE 2 × Bonus de Force Mentale mètres',BFM,'metal'],
 ['Cage dorée',75,9,FM,aoe,'Bonus de Force Mentale heures','metal'],
 ['Toucher doré',75,7,'Contact','Spécial','Spécial','metal'],
 ['Blindage d’oracier',76,10,'Bonus de Force Mentale mètres',aoe,'Force Mentale minutes','metal'],
 ['Nœud défait',76,5,'Vous','Vous',BFM,'metal'],
 ['Blindage de météorite',76,7,FM,aoe,'1 Round','metal'],
 ['Réfraction prismatique de Habermas',77,5,'ZdE Force Mentale mètres','Vous','1 Round','metal'],
 ['Boussole d’Argent de Puchta',77,2,'ZdE Force Mentale mètres','1 boussole','Force Mentale minutes','metal'],
 ['Réplique de Levorg',77,6,'Vous','Spécial','1d10 heures','metal'],
 ['Essais et Erreurs',77,3,'Intelligence mètres','1','Bonus de Force Mentale minutes','metal'],
 ['Bête Indomptée',147,4,'Contact','1','Instantané','beasts'],
 ['Régiment Monstrueux de Merciw',148,13,FM,aoe,'Bonus de Force Rounds','beasts'],
 ['Pulvérisation Musquée',148,2,'Bonus de Force Mentale mètres','1','Instantané','beasts'],
 ['Passage Rapide',148,4,'Vous','Vous','Bonus de Force Mentale minutes','beasts'],
 ['Invocation de Monture',148,6,'Vous','Vous','Bonus de Force Mentale heures','beasts'],
 ['Transformation de Kadon',149,14,'Vous ou Contact','Vous ou 1 (maximum)',BFM,'beasts'],
 ['Capuche Vengeresse',149,7,'Vous','Vous','2 × Bonus de Force Mentale Rounds','beasts'],
 ['Manteau d’Hiver',149,2,'Vous','Vous','Bonus de Force Mentale heures','beasts']
];
export const contractFor=name=>getAllSpellContracts().find(c=>c.name===name);
export async function fixture(extra={}) {return encounter({mage:{hp:200,maxHp:300,...extra.mage},foe:{hp:200,maxHp:300,...extra.foe}});}
// Faits entièrement synthétiques, jamais des valeurs de repli de l'application.
export const declaredFacts={catalogueMode:'normal',mode:'normal',minutesToDawn:5,monthsDays:180,objectId:'blade',objectMetal:true,objectMagical:false,objectFraction:0.8,objectEncumbrance:1,friend:false,ireSubject:'Rival déclaré',flammable:true,skill:'Athlétisme',durationDie:5,inscriptionWords:24,location:'BODY',waterPints:0,fireSize:'torch',nonMetal:false,glassLens:true,observersDeclared:true,pathDeclared:true,sourceFire:true,action:'none',nativeAnimal:'Cerf déclaré',terrain:'Forêt déclarée',reflection:true,knownTarget:true,chosenWind:'fire',goldCoinsDie:5,opposedActorRoll:25,unwilling:false,mount:false,inside:true,cover:false};
export function input(name,patch={}) {const c=contractFor(name);return {actorId:'mage',targetIds:[name==='Esprit du Foyer'?'mage':c.effects.targetRule?.enemiesOnly || c.effects.excludeCaster?'foe':/^Vous/.test(c.target)||/^ZdE/.test(c.range)?'mage':'foe'],sl:12,attributeActive:false,locationRoll:34,resistanceRoll:95,enduranceRoll:95,direction:'E',directionRoll:4,distanceRoll:10,willpowerSuccess:true,monsterKey:'griffon',domainFacts:{...declaredFacts},mjDuration:{amount:5,unit:'minutes'},mjChoice:'Projet déclaré',targetTests:{foe:{roll:95,resistanceRoll:95,dodgeRoll:95,wardRoll:1,opponentRoll:95,friend:false,flammable:true,throwDirection:4,metalAp_head:0,metalAp_body:2,metalAp_arms:0,metalAp_legs:0,unwilling:false,mount:false,inside:true,collision:false,metalAp:2},mage:{roll:95,resistanceRoll:95,wardRoll:1,friend:false,flammable:true,throwDirection:4,metalAp_head:0,metalAp_body:2,metalAp_arms:0,metalAp_legs:0,unwilling:false,mount:false,inside:true,collision:false,metalAp:0}},...patch};}
export async function execute(store,name,patch={}) {const c=contractFor(name),i=input(name,patch),before=store.listParticipants(),p=store.previewSpellExecution(c.id,i);assert.deepEqual(store.listParticipants(),before,'aperçu pur');assert.equal(p.ready,true,name+': '+p.error);const r=await store.applySpellExecution(c.id,i);assert.notEqual(r?.ok,false,r?.error);return p;}
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
export async function verifySource(row){const c=contractFor(row[0]);assert.ok(c);for(const [key,value] of [['page',row[1]],['cn',row[2]],['range',row[3]],['target',row[4]],['duration',row[5]]])assert.equal(typeof value==='string'?norm(c[key]):c[key],typeof value==='string'?norm(value):value,row[0]+' '+key);
 const {store,engine,persistence}=await fixture({foe:{camp:['Régiment Monstrueux de Merciw','Prémonition Fantastique','Essais et Erreurs'].includes(row[0])?'pj':'ennemi'}}),before=store.listParticipants();const result=await execute(store,row[0]);assertSourceEffects(row[0],result,store);const applied=store.listParticipants(),reload=createStore({persistence});await reload.ready;assert.deepEqual(reload.listParticipants(),applied,'persistance');await store.undo();assert.deepEqual(store.listParticipants(),before,'Undo atomique');await execute(store,row[0]);
 const timed=store.listParticipants().flatMap(p=>p.extensions?.v5?.spellEffects||[]).filter(e=>e.spellId===c.id&&e.expiresAtRound>1);if(timed.length){const snapshot=JSON.parse(store.getFullJSON());snapshot.combat.round=Math.max(...timed.map(e=>e.expiresAtRound));snapshot.combat.currentActorId='mage';await store.loadFromJSON(snapshot);await endTurn(engine);assert.ok(!store.listParticipants().some(p=>(p.extensions?.v5?.spellEffects||[]).some(e=>e.spellId===c.id)),'expiration par vraie fin de tour');await store.undo();assert.ok(store.listParticipants().some(p=>(p.extensions?.v5?.spellEffects||[]).some(e=>e.spellId===c.id)));}
}
export {subject,level,endTurn};

export function assertSourceEffects(name,p,store){
 const mage=subject(store,'mage'),foe=subject(store,'foe'),r=p.targetResults[0],who=r.targetId==='mage'?mage:foe,q=r.quantifiedReminder||{},v=who.extensions.v5,s=v.specialStates || {};
 switch(name){
 case 'Corps de Feu':assert.equal(mage.caracs.F,40);assert.equal(mage.caracs.E,40);assert.equal(s.bodyFire.castingSl,42);break;
 case 'Tête Brûlante':assert.equal(r.missile.rawDamage,10);assert.equal(level(foe,'Enflammé'),1);assert.equal(r.resistanceTest.modifierSl,0);assert.deepEqual(r.fearOfCaster,{casterId:'mage',rating:1});assert.ok(!foe.traits.some(t=>t.includes('Peur')));break;
 case 'Flamme Captivante':assert.equal(level(foe,'Sonné'),3);assert.equal(r.resistanceTest.modifierSl,0);break;
 case 'Colérique':assert.ok(foe.traits.includes('Préjugé (personne déclarée)'));assert.equal(v.testModifiers?.Calme || 0,0);assert.equal(v.testModifiers?.Sociabilité || 0,0);break;
 case 'Tempête de Flammes':assert.equal(r.missile.rawDamage,14);assert.equal(level(foe,'Enflammé'),3);assert.equal(level(foe,'À Terre'),1);assert.deepEqual(q,{diametre:2,hauteur:2});break;
 case 'Forge de Tarnus':assert.equal(v.testModifiers['Métier (Forgeron)'],1);assert.equal(who.caracs.Int,60);break;
 case 'Ignition':assert.equal(level(foe,'Enflammé'),2);break;
 case 'Flamme Inextinguible':assert.equal(who.hp,200);assert.match(s.assistedReminder,/Aucun autre sort ni dissipation/);break;
 case 'Flamme Attisée':assert.deepEqual(q,{degatsFeuBonus:42,enflammeSupplementaire:1});assert.equal(who.hp,200);break;
 case 'Esprit du Foyer':assert.equal(mage.hp,198);{const aux=store.listParticipants().find(p=>p.extensions?.isAuxiliary);assert.ok(aux);assert.equal(aux.caracs.CC,60);assert.equal(aux.caracs.M,3);assert.equal(aux.extensions.damage,6);}break;
 case 'Tempête Magmatique':assert.ok(p.vortexMovement);assert.equal(level(foe,'Enflammé'),2);break;
 case 'Goût de Feu':assert.equal(v.testModifiers?.Endurance || 0,0);assert.equal(v.testModifiers?.Résistance || 0,0);assert.equal(who.hp,200);break;
 case 'Chaleur Desséchante':assert.equal(foe.hp,200);assert.equal(level(foe,'Exténué'),0);assert.equal(q.degatsFeuBonus,42);break;
 case 'Arc de T’Essla':assert.equal(r.missile.rawDamage,16);assert.equal(level(foe,'Aveuglé'),1);break;
 case 'Orage de Thorsen':assert.ok(p.vortexMovement);assert.equal(level(foe,'À Terre'),1);break;
 case 'Polir et Exalter':assert.equal(v.testModifiers?.['Savoir (Astronomie)'] || 0,0);assert.equal(v.testModifiers?.['Perception (Seconde vue visuelle)'] || 0,0);break;
 case 'Projection Spirituelle':assert.equal(s.cannotCast,true);assert.equal(s.cannotSpeak,true);break;
 case 'Arche de Saphir':assert.deepEqual(q,{largeur:4,hauteur:3});assert.equal(store.listParticipants().length,2);break;
 case 'Lames Azurées':assert.equal(mage.hp,200);assert.equal(v.spellEffects.find(e=>e.spellId===contractFor(name).id).recurringHits.hits,3);break;
 case 'Malédiction du Destin':assert.equal(v.testModifiers['Tous les Tests'],-1);break;
 case 'Divination':assert.equal(v.testModifiers?.['Jet futur désigné'] || 0,0);assert.equal(who.hp,200);break;
 case 'Ennemi Anticipé':assert.equal(q.alerteRounds,5);break;
 case 'Prémonition Fantastique':assert.equal(foe.hp,200);assert.equal(r.targetId,'foe');break;
 case 'Destin Illuminé':assert.equal(q.questions,1);break;
 case 'Lentille du Ciel':assert.equal(v.testModifiers['Perception (Longue distance)'],2);assert.deepEqual(q,{visionMiles:3,navigationProchainTest:2});break;
 case 'Que les Quatre Vents Soufflent !':assert.equal(foe.hp,200,'pas de dégâts sans collision');assert.equal(level(foe,'À Terre'),1);assert.deepEqual(q,{groupes:4,projection:6});break;
 case 'Mistral de la Stratosphère':assert.equal(r.damage.rawDamage,12);assert.equal(r.woundsLost,8);assert.equal(r.resistanceTest.modifierSl,-2);assert.deepEqual(q,{gelPoucesParRound:1,recuperationCaracsParHeure:10});break;
 case 'Miroir Mystique':assert.equal(store.listParticipants().length,2);assert.equal(who.hp,200);break;
 case 'Éclat Stellaire':assert.equal(q.rayon,60);assert.equal(level(who,'Aveuglé'),0);break;
 case 'Tempête de Shemtek':assert.equal(r.missile.rawDamage,12);assert.equal(q.eclairs,10);assert.equal(level(mage,'Sonné'),1);break;
 case 'Écaille d’acier':assert.equal(v.ward,9);break;
 case 'Inscription':assert.equal(foe.hp,200);assert.equal(foe.armor.body,2);assert.deepEqual(q,{motsParRound:12,delaiCorrosionRounds:10,corrosionPA:1});break;
 case 'Métal restauré':assert.equal(foe.armor.body,2);assert.equal(v.testModifiers?.['Métier (Forgeron)'] || 0,0);break;
 case 'Armure d’étain':assert.equal(foe.armor.body,0);assert.equal(foe.armor.head,2,'PA non métalliques conservés');break;
 case 'Franchir l’inconnu':assert.equal(q.details,1);break;
 case 'Malédiction de rouille':assert.equal(q.encombrementMax,1);assert.equal(foe.hp,200);break;
 case 'Défaut de Forme':assert.deepEqual(q,{attaqueDR:-1,defenseContreLenteDR:2,multiplicateurRecharge:2});break;
 case 'Globe doré de Gehenna':assert.equal(q.zone,12);assert.equal(level(foe,'Sonné'),0,'pas de faux Sonné à la place de pétrification');assert.equal(foe.hp,200);break;
 case 'Cage dorée':assert.deepEqual(q,{barreDemiPouce:0.5,ecartPouces:6,forceEvasionDR:-2});break;
 case 'Toucher doré':assert.equal(q.bonusEnduranceStatue,10);assert.equal(r.resistanceTest.modifierSl,0);assert.equal(v.spellEffects.find(e=>e.spellId===contractFor(name).id).expiresAtRound,1801,'FM60 × d10=5 minutes, six Rounds/minute');break;
 case 'Blindage d’oracier':assert.deepEqual(q,{surfacePA:4,corruptionNiveauxRetires:2,dissipationDR:1});assert.equal(foe.armor.body,2,'surface distincte de personne');break;
 case 'Nœud défait':assert.equal(q.indices,1);assert.equal(v.testModifiers['Savoir (Déduction)'],2);break;
 case 'Blindage de météorite':assert.equal(v.ward,4);break;
 case 'Réfraction prismatique de Habermas':assert.equal(v.testModifiers.Focalisation,-1);assert.equal(v.testModifiers['Langue (Magick)'],-1);assert.deepEqual(q,{fluideProchaineIncantationDR:1,fluideEvaporationRounds:2});break;
 case 'Boussole d’Argent de Puchta':assert.equal(q.navigationMagiqueDR,2);break;
 case 'Réplique de Levorg':assert.equal(q.encombrementMax,4);assert.equal(v.spellEffects.find(e=>e.spellId===contractFor(name).id).expiresAtRound,1801,'cinq heures');break;
 case 'Essais et Erreurs':assert.equal(q.prochainTestDR,2);assert.equal(v.testModifiers?.['Compétence choisie'] || 0,0);break;
 case 'Bête Indomptée':assert.equal(q.chevaucherDR,-2);assert.equal(foe.hp,200);break;
 case 'Régiment Monstrueux de Merciw':assert.equal(foe.caracs.F,70);assert.equal(foe.caracs.E,70);assert.equal(mage.caracs.F,40);assert.equal(foe.maxHp,300);break;
 case 'Pulvérisation Musquée':assert.deepEqual(q,{dureeJours:1,localisationDR:2,territoire:6,calmeDR:2});break;
 case 'Passage Rapide':assert.equal(mage.caracs.M,5);assert.equal(v.testModifiers['Éviter Enchevêtré'],1);assert.ok(v.spellEffects.find(e=>e.spellId===contractFor(name).id).talents.includes('Escalade'));break;
 case 'Invocation de Monture':assert.equal(store.listParticipants().length,2,'pas de monture au profil inventé');assert.equal(q.heures,6);break;
 case 'Transformation de Kadon':assert.equal(mage.caracs.Int,60);assert.equal(mage.caracs.FM,60);assert.ok(v.beastForm || v.specialStates?.cannotCast || mage.traits.length);break;
 case 'Capuche Vengeresse':assert.equal(v.damageReduction,6);assert.equal(v.damageReductions[0].calmTest,true);assert.deepEqual(v.damageReductions[0].filter,{not:['magical']});break;
 case 'Manteau d’Hiver':assert.equal(mage.caracs.Ag,40);assert.equal(mage.caracs.Soc,40);assert.equal(q.critiqueRecuModificateur,-10);break;
 default:throw Error('Attente source absente : '+name);
 }
 assert.ok((p.targetResults || []).some(r=>r.actions.some(a=>a.kind==='mj-input' || a.kind==='narrative')) || p.vortexMovement,'clauses assistées visibles dans le reçu');
}
export async function verifyVariants(row){
 const name=row[0],c=contractFor(name);
 for(const option of c.overcast.options.filter(o=>o!=='special')){
  const {store}=await fixture({foe:{camp:['Régiment Monstrueux de Merciw','Prémonition Fantastique','Essais et Erreurs'].includes(name)?'pj':'ennemi'}}),before=store.listParticipants(),amount=option==='aoe'?3:option==='damage'?1:2,p=await execute(store,name,{sl:100,overcastChoices:{[option]:amount},...(name==='Inscription'&&option==='damage'?{domainFacts:{...declaredFacts,catalogueMode:'acid'}}:{})});
  assert.equal(p.castingPreview.overcast.totalSpent,amount);await store.undo();assert.deepEqual(store.listParticipants(),before);
 }
 for(const option of c.overcast.specific || []){
  const {store}=await fixture({foe:{camp:['Régiment Monstrueux de Merciw','Prémonition Fantastique','Essais et Erreurs'].includes(name)?'pj':'ennemi'}}),p=await execute(store,name,{sl:100,overcastSpecific:{[option.id]:1}});assert.equal(p.overcastSpecific.find(o=>o.id===option.id).spent,option.cost);assert.ok(p.overcastSpecific.find(o=>o.id===option.id).applied || p.overcastSpecific.find(o=>o.id===option.id).reminder);
 }
 for(const spec of c.effects.facts || []){if(spec.optional)continue;
  const {store}=await fixture(),i=input(name),target=i.targetIds[0];if(spec.optionalForSelf){i.targetIds=['foe'];i.kadonOtherTarget=true;}if(spec.requiredIfOvercast)i.overcastSpecific={[spec.requiredIfOvercast]:1};if(spec.perTarget)delete i.targetTests[i.targetIds[0]][spec.key];else delete i.domainFacts[spec.key];assert.equal(store.previewSpellExecution(c.id,i).ready,false,name+' : absence du fait '+spec.key);
 }
 if(c.effects.secondaryTest){for(const die of [25,95]){
  const {store}=await fixture(),i=input(name);for(const t of Object.values(i.targetTests)){t.roll=die;t[c.effects.secondaryTest.rollField]=die;t.friend=true;}const p=await execute(store,name,i);assert.equal(p.targetResults[0].resistanceTest.resisted,die===25);
 }}
}

export async function verifyTargetsAndProtection(row){
 const name=row[0],c=contractFor(name),allied=['Régiment Monstrueux de Merciw','Prémonition Fantastique','Essais et Erreurs'].includes(name);
 const {store}=await fixture({foe:{camp:allied?'pj':'ennemi'}}),s=JSON.parse(store.getFullJSON()),second={...structuredClone(subject(store,'foe')),id:'second',name:'Seconde cible'};s.combat.participants.push(second);s.combat.order.push('second');delete s.activeScene;await store.loadFromJSON(s);
 const i=input(name),allowsMultiple=c.effects.aoe || /zde|sp[eé]cial/i.test(c.target) || c.overcast.options.includes('targets');
 i.targetIds=['foe','second'];i.targetTests.second={...i.targetTests.foe};i.sl=100;
 if(!c.effects.aoe && !/zde|sp[eé]cial/i.test(c.target) && c.overcast.options.includes('targets'))i.overcastChoices={targets:1};
 const before=store.listParticipants(),p=store.previewSpellExecution(c.id,i);
 if(!allowsMultiple || c.effects.special==='transformation-of-kadon'){
  assert.equal(p.ready,false,name+' : limite réelle de destinataires');
 }else{
  assert.equal(p.ready,true,name+': '+p.error);await store.applySpellExecution(c.id,i);assert.ok(p.targetResults.some(r=>r.targetId==='second'));await store.undo();assert.deepEqual(store.listParticipants(),before);
 }
 const j=input(name);if(name==='Inscription')j.domainFacts.catalogueMode='acid';if(name==='Que les Quatre Vents Soufflent !')j.targetTests.foe.collision=true;
 const base=store.previewSpellExecution(c.id,j);assert.equal(base.ready,true,name+': '+base.error);
 if(base.targetResults.some(r=>r.missile || r.damage) || c.effects.vortex){
  await store.applySpellEffects(j.targetIds[0],{ward:7,durationRounds:10});const protectedBefore=store.listParticipants();delete j.targetTests[j.targetIds[0]].wardRoll;assert.equal(store.previewSpellExecution(c.id,j).ready,false,'d10 de Protection manquant');
  j.targetTests[j.targetIds[0]].wardRoll=10;const defended=store.previewSpellExecution(c.id,j);assert.equal(defended.ready,true,name+': '+defended.error);assert.equal(defended.targetResults.find(r=>r.targetId===j.targetIds[0]).woundsLost,0,'Protection réussie annule les Blessures');await store.applySpellExecution(c.id,j);await store.undo();assert.deepEqual(store.listParticipants(),protectedBefore,'Undo incluant Protection et couches');
 }
}
