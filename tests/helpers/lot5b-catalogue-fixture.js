import assert from 'node:assert/strict';
import {createStore} from '../../js/core/store.js';
import {fixture,contractFor,subject,level,endTurn} from './lot3-catalogue-fixture.js';
export {fixture,contractFor,subject,level,endTurn};
const FM='Force Mentale mètres',BFM='Bonus de Force Mentale Rounds',AOE='ZdE Bonus de Force Mentale mètres',half='Moitié de la Force Mentale mètres';
// Paramètres relevés directement dans les pages, indépendamment du générateur.
export const sourceCases=[
 ['Habitants d’en bas',86,13,FM,AOE,'Instantané','life'],
 ['Cri de Guerre du Jardinier',87,9,FM,'ZdE Force Mentale mètres','Instantané','life'],
 ['Almanach',86,4,'Vous','Vous','1 jour','life'],
 ['Chair de Pierre',87,9,'Bonus de Force Mentale mètres','1','Force Mentale minutes','life'],
 ['Forme bestiale - Jade',245,5,'Vous','Vous','Endurance minutes','life'],
 ['Geyser',87,8,FM,AOE,'Instantané','life'],
 ['Chant vivifiant',87,6,'2 × Bonus de Sociabilité mètres','ZdE Bonus de Sociabilité mètres',BFM,'life'],
 ['Cercueil de Jade',87,6,FM,'1','Bonus de Force Mentale heures','life'],
 ['Chute des feuilles',88,6,'Vous','Vous','Bonus de Force Mentale minutes','life'],
 ['Traque des lignes telluriques',88,5,'Bonus d’Initiative miles','Vous','Bonus de Force Mentale heures','life'],
 ['Murmure de la Nature',88,8,'Vous','Vous','Bonus de Sociabilité minutes','life'],
 ['Sentier de Paranoth',88,4,AOE,'Vous','Force Mentale minutes','life'],
 ['Croissance Vitale',89,7,'Bonus de Force Mentale mètres','1','Instantané','life'],
 ['Forme de Bois',89,8,'Contact','1','Bonus de Force Mentale heures','life'],
 ['Mains de Karkora',64,8,FM,AOE,BFM,'light'],
 ['Crevasse',62,8,FM,'Spécial',BFM,'light'],
 ["Piège d'Abulla",62,5,'Initiative mètres','1',BFM,'light'],
 ['Assaut de pierre',62,12,FM,'Spécial','Instantané','light'],
 ['Éclat éblouissant',63,5,FM,AOE,'Instantané','light'],
 ['Volonté inébranlable',63,4,'Contact','1','Bonus de Force Mentale heures','light'],
 ['Ériger l’édifice',63,9,'Bonus de Force Mentale mètres','Spécial','Spécial','light'],
 ['Yeux de Volans',63,6,'Vous','Vous',BFM,'light'],
 ['Illuminer l’édifice',64,4,'Contact','1 (maximum)','Bonus de Force Mentale heures','light'],
 ['Lumière de pureté',64,6,'Spécial','1 (maximum)','Spécial','light'],
 ['Bibliothécaire instantané de Meissner',64,2,'ZdE Intelligence mètres','Vous','Instantané','light'],
 ['Orbe de Hysh',64,5,FM,'1',BFM,'light'],
 ['Compréhension parfaite',65,5,'Vous','Vous','Bonus de Force Mentale minutes','light'],
 ['Percer le Voile',65,4,'Vous','Vous','Bonus de Force Mentale minutes','light'],
 ['Cape chatoyante',65,9,'Vous','Vous','Bonus de Force Mentale minutes','light'],
 ['Dérèglement temporel',65,11,'Vous','ZdE Force Mentale mètres','Instantané','light'],
 ['Acceptation du Destin',122,6,'ZdE 2 × Bonus de Force Mentale mètres','Vous',BFM,'death'],
 ['Amarante',122,7,'Vous','Vous','Bonus de Force Mentale minutes','death'],
 ['Âme Emprisonnée',122,12,'Contact','1','Spécial','death'],
 ['Cendres et Poussière',122,9,'Vortex aléatoire','ZdE 2 × Bonus de Force Mentale mètres',BFM,'death'],
 ['Contrainte des Esprits',123,6,'Bonus de Force Mentale mètres',AOE,'Jusqu’au lever du soleil','death'],
 ['Labyrinthe de Cristal',123,13,FM,AOE,'Instantané','death'],
 ['Délivrance de la Mort',123,5,'Moitié de l’Initiative mètres','1','3 Rounds','death'],
 ['Destin de Bjuna',123,8,half,AOE,'Bonus de Sociabilité Rounds','death'],
 ['Flétrissement des Membres',124,5,FM,'1','Bonus de Force Mentale minutes ou jours','death'],
 ['Révélation de Shyish',124,4,AOE,'Vous','Bonus d’Initiative minutes','death'],
 ['Vitesse de Lykos',124,3,'Moitié de l’Initiative mètres','1','1 Round','death'],
 ['Goût de la Mort',125,7,half,'1 + ZdE Spécial','Instantané','death'],
 ['Télépathie',125,1,'100 mètres','1','Instantané','death'],
 ['Marée des Âges',125,3,'Bonus de Force Mentale mètres','1','Instantané','death'],
 ['Danse du Désespoir',110,13,'ZdE Force Mentale mètres','Vous',BFM,'shadow'],
 ['Égarer',110,5,FM,'1',BFM,'shadow'],
 ['Horreurs Noires',110,6,FM,AOE,'Bonus de Force Mentale heures','shadow'],
 ['Pont d’Ombres',110,6,FM,AOE,'1 Round','shadow'],
 ['Poches Profondes',111,5,'Contact','Spécial','Bonus de Force Mentale heures','shadow'],
 ['Grande Illusion',111,14,FM,'ZdE Bonus d’Initiative mètres','Force Mentale minutes','shadow'],
 ['Ailes Grises',111,6,FM,'1 (maximum)','Instantané','shadow'],
 ['Silence',111,3,FM,'1 avec ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale minutes','shadow'],
 ['Gouffre de Tarnus',112,8,FM,AOE,BFM,'shadow'],
 ['Illusion rétroactive de Ribauld',112,11,FM,'Spécial','Instantané','shadow'],
 ['Bosquet d’ombres',112,5,FM,'ZdE Initiative mètres','Bonus de Force Mentale heures','shadow'],
 ['Substance d’Ombre',113,9,'Contact','1','Spécial','shadow'],
 ['Traître de Tarn',113,12,FM,'1','Force Mentale minutes','shadow'],
 ['Ombre Vagabonde',113,4,'Vous','Vous','Bonus de Force Mentale minutes','shadow']
];
export const declaredFacts={mode:'normal',useMount:false,automaticFall:false,unwilling:false,plantCreature:true,dormant:false,directEarth:true,patchEarth:true,corpseAgeSeconds:30,dead:true,riverOrTree:true,objectId:'blade',objectEncumbrance:1,objectMagical:false,objectDurable:false,days:5,lightRange:20,lightHours:2,minutesToDawn:5,opposedActorRoll:25,sourceShadow:true,visibleLight:true,totalDarkness:false,observersDeclared:true,pathDeclared:true,distance:10,obstacleHeight:2,requestedBook:'Rituels',topicWords:1,illusionDescription:'Pont illusoire décrit',light:true,behaviourRoll:9,traitorMode:'enemy',direction:4,griefDeclared:false,living:true,detected:false,soulVessel:'Fiole',limb:'leftArm',primary:true,delayHoursDie:5,mjAdmissible:true,grappleMode:'damage'};
export function input(name,patch={}){
 const c=contractFor(name),self=/^Vous$/.test(c.target)&&!c.effects.aoe&& !/^ZdE/.test(c.range);
 return {actorId:'mage',targetIds:[self?'mage':'foe'],sl:12,attributeActive:false,locationRoll:34,beastKey:'wolf',direction:'E',directionRoll:4,distanceRoll:10,willpowerSuccess:true,resistanceRoll:95,mjChoice:'Projet explicitement déclaré',mjDuration:{amount:5,unit:'minutes'},domainFacts:{...declaredFacts},targetTests:Object.fromEntries(['mage','foe','second'].map(id=>[id,{...declaredFacts,resistanceRoll:95,dodgeRoll:95,opponentRoll:95,roll:95,wardRoll:1,damageF:3,damageE:7,calmRoll:95,despairRoll:95,intuitionRoll:95,intelligenceRoll:95,inside:true,sunTouched:false}])),...patch};
}
export async function scenario(name){const c=contractFor(name);const allied=['Chant vivifiant','Sentier de Paranoth','Acceptation du Destin','Dérèglement temporel'].includes(name);const traits=name==='Chant vivifiant'?['Créature végétale']:['Contrainte des Esprits','Délivrance de la Mort'].includes(name)?['Mort-vivant','Éthéré']:[];return fixture({foe:{camp:allied?'pj':'ennemi',traits,...(name==='Goût de la Mort'?{caracs:{CC:50,CT:50,F:40,E:40,I:50,Ag:50,Dex:50,Int:60,FM:20,Soc:50,M:4}}:{}),...(name==='Cercueil de Jade'?{hp:0,extensions:{v5:{dead:true}}}:{})}});}
export async function execute(store,name,patch={}){const i=input(name,patch),before=store.listParticipants(),p=store.previewSpellExecution(contractFor(name).id,i);assert.deepEqual(store.listParticipants(),before,'aperçu pur');assert.equal(p.ready,true,name+': '+p.error);const result=await store.applySpellExecution(contractFor(name).id,i);assert.notEqual(result?.ok,false,result?.error);return p;}
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
export async function verifySource(row){const c=contractFor(row[0]);for(const [key,value] of [['page',row[1]],['cn',row[2]],['range',row[3]],['target',row[4]],['duration',row[5]]])assert.equal(typeof value==='string'?norm(c[key]):c[key],typeof value==='string'?norm(value):value,row[0]+' '+key);const {store,engine,persistence}=await scenario(row[0]),before=store.listParticipants();const p=await execute(store,row[0]);assertEffects(row[0],p,store);const reload=createStore({persistence});await reload.ready;assert.deepEqual(reload.listParticipants(),store.listParticipants(),'persistance sémantique');await store.undo();assert.deepEqual(store.listParticipants(),before,'Undo atomique');await execute(store,row[0]);const layers=store.listParticipants().flatMap(p=>p.extensions?.v5?.spellEffects||[]).filter(e=>e.spellId===c.id&&e.expiresAtRound>1);if(layers.length){const snapshot=JSON.parse(store.getFullJSON());snapshot.combat.round=Math.max(...layers.map(e=>e.expiresAtRound));snapshot.combat.currentActorId='mage';await store.loadFromJSON(snapshot);await endTurn(engine);assert.ok(!store.listParticipants().some(p=>(p.extensions?.v5?.spellEffects||[]).some(e=>layers.some(l=>l.id===e.id))),'expiration par vraie fin de Tour');await store.undo();assert.ok(store.listParticipants().some(p=>(p.extensions?.v5?.spellEffects||[]).some(e=>e.spellId===c.id)),'Undo fin de Tour');}}
export function assertEffects(name,p,store){const r=p.targetResults[0],who=subject(store,r.targetId),v=who.extensions.v5,s=v.specialStates||{},q=r.quantifiedReminder||{};
 switch(name){
 case 'Habitants d’en bas':assert.equal(r.resistanceTest.skill,'Force');assert.equal(q.heuresPerdues,5);assert.equal(who.hp,200);break;
 case 'Cri de Guerre du Jardinier':assert.equal(r.damage.rawDamage,10);assert.equal(level(who,'Hémorragique'),1);break;
 case 'Almanach':assert.equal(q.anneesPrevues,1);break;
 case 'Chair de Pierre':assert.equal(who.caracs.F,70);assert.equal(who.caracs.E,70);assert.equal(who.caracs.M,2);assert.equal(who.armor.body,6);assert.equal(s.cannotSpeak,true);break;
 case 'Forme bestiale - Jade':assert.ok(v.beastForm);assert.equal(v.beastForm.isJade,true);break;
 case 'Geyser':assert.equal(r.missile.rawDamage,10);assert.equal(q.projection,6);assert.equal(level(who,'À Terre'),1);break;
 case 'Chant vivifiant':assert.equal(who.hp,242);assert.equal(v.testModifiers['Tous les Tests'],42);break;
 case 'Cercueil de Jade':assert.equal(who.hp,300);assert.equal(s.cannotSpeak,true);assert.equal(store.listParticipants().length,2);break;
 case 'Chute des feuilles':assert.equal(v.damageReduction,3);assert.equal(v.rangedOpponentPenaltySl,-2);break;
 case 'Traque des lignes telluriques':assert.equal(v.testModifiers['Navigation (Lignes telluriques)'],2);break;
 case 'Murmure de la Nature':assert.equal(q.memoireRiviereHeures,24);assert.equal(q.reponseArbreMinutes,5);break;
 case 'Sentier de Paranoth':assert.ok(v.spellEffects.some(e=>e.talents?.includes('Foulée (Forêts)')));break;
 case 'Croissance Vitale':assert.equal(q.multipleHauteur,1);assert.equal(q.concentrationRounds,0);break;
 case 'Forme de Bois':assert.equal(s.cannotMove,true);assert.equal(who.hp,200);break;
 case 'Mains de Karkora':assert.equal(r.resistanceTest.skill,'Esquive');assert.equal(s.grappleStrength,60);assert.equal(who.hp,200);break;
 case 'Crevasse':case 'Gouffre de Tarnus':assert.equal(who.hp,200,'écrasement seulement à fermeture');assert.equal(q.ecrasementDegats,20);break;
 case "Piège d'Abulla":assert.equal(level(who,'Enchevêtré'),2);assert.equal(q.hauteur,2);assert.equal(s.entangledStrength,60);break;
 case 'Assaut de pierre':assert.equal(r.damage.rawDamage,20);assert.equal(r.resistanceTest.skill,'Esquive');break;
 case 'Éclat éblouissant':assert.equal(level(who,'Aveuglé'),1);break;
 case 'Volonté inébranlable':assert.equal(v.testModifiers['Résister à Charme/Intimidation'],2);assert.equal(v.testModifiers['Charme (Vérité)']||0,0);break;
 case 'Ériger l’édifice':assert.deepEqual(q,{longueur:5,hauteur:1,epaisseurPouces:6,effondrementJours:48,ouverturesPasMetres:2,concentrationRounds:0});break;
 case 'Yeux de Volans':assert.equal(v.testModifiers['Perception (Seconde vue)'],2);assert.equal(v.testModifiers['Perception (Vue normale)'],-2);break;
 case 'Illuminer l’édifice':assert.equal(who.hp,200,'aucune Blessure sur l’édifice ou son occupant au lancement');break;
 case 'Lumière de pureté':assert.equal(v.testModifiers['Dissipation (Magie Noire/Chaos)'],42);break;
 case 'Bibliothécaire instantané de Meissner':assert.deepEqual(q,{progressionRecherche:43,livresLumineuxRounds:48});assert.equal(v.testModifiers?.Recherche||0,0);break;
 case 'Orbe de Hysh':assert.deepEqual(q,{encombrementMax:48,vitesse:6,corruptionNiveauxRetires:1});break;
 case 'Compréhension parfaite':assert.equal(s.understandLanguages,true);break;
 case 'Percer le Voile':assert.equal(s.seeThroughObscurity,true);break;
 case 'Cape chatoyante':assert.equal(v.damageCapToSlOnly,true);assert.equal(s.cannotHide,true);break;
 case 'Dérèglement temporel':assert.equal(q.actionsBonus,1);assert.equal(q.mouvementsBonus,0);assert.equal(who.caracs.M,4);break;
 case 'Acceptation du Destin':assert.equal(s.fearImmune,true);assert.equal(s.terrorAsFear,true);break;
 case 'Amarante':assert.ok(v.spellEffects.some(e=>e.talents?.includes('Résistance (Poison)')));assert.equal(q.critiqueRecuModificateur,-10);break;
 case 'Âme Emprisonnée':assert.equal(s.coma,true);assert.equal(level(who,'Inconscient'),1);break;
 case 'Cendres et Poussière':assert.ok(p.vortexMovement);assert.equal(r.woundsLost,4);break;
 case 'Contrainte des Esprits':assert.equal(s.controlledBy,'mage');assert.ok(r.opposedTest.won);break;
 case 'Labyrinthe de Cristal':assert.equal(s.cannotMove,true);assert.equal(who.hp,200);break;
 case 'Délivrance de la Mort':assert.equal(who.hp,200);assert.equal(level(who,'Sonné'),0,'Test au Round futur');break;
 case 'Destin de Bjuna':assert.equal(who.hp,200,'dégâts périodiques, pas instantanés');break;
 case 'Flétrissement des Membres':assert.equal(s.disabledLimb,'leftArm');break;
 case 'Révélation de Shyish':assert.deepEqual(q,{moisReveles:43,questions:0});break;
 case 'Vitesse de Lykos':assert.equal(who.caracs.M,4,'aucun M+4 inventé');assert.deepEqual(q,{deplacementProchainRound:100,actionEnMourant:1});break;
 case 'Goût de la Mort':assert.equal(level(who,'Inconscient'),1);assert.equal(level(who,'Sonné'),0);assert.equal(level(who,'Exténué'),1);break;
 case 'Télépathie':assert.equal(who.hp,200);assert.equal(r.resistanceTest.skill,'Intuition');break;
 case 'Marée des Âges':assert.equal(q.encombrementMax,2);assert.equal(who.caracs.F,40);break;
 case 'Danse du Désespoir':assert.equal(who.hp,200);assert.equal(s.danceRequired,true);assert.equal(level(who,'Exténué'),0,'Exténué seulement à la fin');break;
 case 'Égarer':assert.equal(level(who,'À Terre'),1);assert.equal(s.helpless,true);break;
 case 'Horreurs Noires':assert.equal(q.peur,1);assert.ok(!who.traits.some(t=>/^Peur/.test(t)),'Peur de l’ombre, pas trait de victime');break;
 case 'Pont d’Ombres':assert.deepEqual(q,{distanceMax:60,hauteurObstacleMax:60});break;
 case 'Poches Profondes':assert.equal(q.encombrementMax,1);break;
 case 'Grande Illusion':assert.equal(s.grandIllusion,undefined,'scène sensorielle assistée, aucun marqueur moteur');assert.equal(who.hp,200);assert.deepEqual(v.testModifiers||{},{});assert.match(contractFor(name).reminders,/illusion/i);break;
 case 'Ailes Grises':assert.equal(q.teleportation,100);assert.equal(r.resistanceTest,undefined,'pas d’Esquive consentante');break;
 case 'Silence':assert.equal(s.silenceMode,'out');break;
 case 'Illusion rétroactive de Ribauld':assert.equal(q.teleportation,60);break;
 case 'Bosquet d’ombres':assert.equal(v.testModifiers['Attaque contre cible révélée']||0,0,'malus aux attaquants déclarés, pas victime');assert.equal(q.attaqueContreReveleDR,-1);break;
 case 'Substance d’Ombre':assert.equal(s.invisible,true);assert.equal(s.immaterial,true);break;
 case 'Traître de Tarn':assert.equal(s.controlledBy,'mage');break;
 case 'Ombre Vagabonde':assert.deepEqual(q,{mouvement:4,distanceMaxLumiere:48,peur:1});assert.equal(store.listParticipants().length,2);break;
 default:throw Error('Attente source absente : '+name);
 }
}
export async function verifyVariants(row){
 const name=row[0],c=contractFor(name);
 const run=async patch=>{const {store}=await scenario(name),before=store.listParticipants(),p=await execute(store,name,patch);await store.undo();assert.deepEqual(store.listParticipants(),before,'Undo variante');return p;};
 for(const kind of c.overcast.options.filter(k=>k!=='special')){const amount=kind==='targets'?1:kind==='aoe'?3:2,p=await run({sl:100,overcastChoices:{[kind]:amount}});assert.equal(p.castingPreview.overcast.totalSpent,amount);if(['range','duration','aoe'].includes(kind))assert.equal(p.overcast[kind+'Multiplier'],2);}
 for(const option of c.overcast.specific || []){
  const i=input(name);i.sl=100;i.overcastSpecific={[option.id]:1};
  i.domainFacts['optionTargets_'+option.id]=i.targetIds;
  i.targetTests.foe.optionResistanceRoll=95;i.targetTests.mage.optionResistanceRoll=95;
  if(name==='Marée des Âges'&&option.id==='living')i.domainFacts.mode='living';
  if(name==='Transformation de Kadon')continue;
  const p=await run(i),receipt=p.overcastSpecific.find(e=>e.id===option.id);assert.equal(receipt.spent,option.cost);assert.ok(receipt.applied || receipt.reminder,'option exécutée ou reçu explicite');
 }
 for(const field of c.effects.facts || []){if(field.optional)continue;
  const {store}=await scenario(name),i=input(name);
  if(field.requiredWhen && (field.perTarget?i.targetTests[i.targetIds[0]][field.requiredWhen.key]:i.domainFacts[field.requiredWhen.key])!==field.requiredWhen.value)continue;
  if(field.requiredIfOvercast)continue;
  if(field.optionalForSelf && i.targetIds[0]==='mage')continue;
  if(field.perTarget)for(const id of i.targetIds)delete i.targetTests[id][field.key];else delete i.domainFacts[field.key];
  assert.equal(store.previewSpellExecution(c.id,i).ready,false,'fait manquant '+field.key);
 }
 for(const field of (c.effects.facts || []).filter(f=>f.type==='select'&&!f.requiredWhen&&!f.requiredIfOvercast))for(const [value] of field.options){
  const i=input(name);if(field.perTarget)i.targetTests[i.targetIds[0]][field.key]=value;else i.domainFacts[field.key]=value;
  if(name==='Volonté inébranlable'&&value==='truth')i.targetIds=['mage'];
  if(name==='Marée des Âges'&&value==='living')i.overcastSpecific={living:1};
  if(name==='Flétrissement des Membres'&&value==='grave')i.domainFacts.limb='leftArm';
  if(name==='Acceptation du Destin'&&value==='enemies'){const {store}=await fixture();await execute(store,name,i);continue;}
  await run(i);
 }
 const spec=c.effects.secondaryTest;
 if(spec?.actor==='target'){
  for(const die of [5,95]){const i=input(name);for(const id of i.targetIds){i.targetTests[id].roll=die;i.targetTests[id][spec.rollField || 'resistanceRoll']=die;if(spec.whenFact)i.targetTests[id][spec.whenFact]=true;}await run(i);}
  const {store}=await scenario(name),i=input(name);for(const id of i.targetIds){delete i.targetTests[id].roll;delete i.targetTests[id][spec.rollField || 'resistanceRoll'];if(spec.whenFact)i.targetTests[id][spec.whenFact]=true;}delete i.resistanceRoll;delete i[spec.rollField || 'resistanceRoll'];assert.equal(store.previewSpellExecution(c.id,i).ready,false,'Test secondaire sans dé');
 }
 if(c.effects.opposedTest){for(const die of [5,95]){const i=input(name);i.domainFacts.opposedActorRoll=95;for(const id of i.targetIds){i.targetTests[id].opponentRoll=die;if(c.effects.opposedTest.whenFact)i.targetTests[id][c.effects.opposedTest.whenFact]=true;}await run(i);}}
}
export async function verifyMultipleAndProtection(row){
 const name=row[0],c=contractFor(name),{store}=await scenario(name),snapshot=JSON.parse(store.getFullJSON());
 if(input(name).targetIds[0]==='foe' && !(c.effects.maxTargets===1 || /maximum/.test(c.target) || ['Cercueil de Jade'].includes(name))){
  const second={...structuredClone(snapshot.combat.participants.find(p=>p.id==='foe')),id:'second',name:'Second'};snapshot.combat.participants.push(second);snapshot.combat.order.push('second');await store.loadFromJSON(snapshot);
  const i=input(name,{targetIds:['foe','second']});if(c.overcast.options.includes('targets'))i.overcastChoices={targets:1};
  const p=store.previewSpellExecution(c.id,i);if(p.ready){const before=store.listParticipants();await store.applySpellExecution(c.id,i);assert.ok(p.targetResults.some(r=>r.targetId==='second'));await store.undo();assert.deepEqual(store.listParticipants(),before);}
  else assert.match(p.error,/cible|maximum|limite|destinataire/i);
 }
 const i=input(name),base=store.previewSpellExecution(c.id,i);assert.equal(base.ready,true,name+': '+base.error);
 if(base.targetResults.some(r=>r.damage || r.missile || r.vortexParticipant)){
  await store.applySpellEffects(i.targetIds[0],{ward:7,durationRounds:10,casterId:'mage'});const before=store.listParticipants();
  for(const id of i.targetIds){delete i.targetTests[id].wardRoll;}
  assert.equal(store.previewSpellExecution(c.id,i).ready,false,'Protection sans d10 bloque');
  i.targetTests[i.targetIds[0]].wardRoll=10;const p=await execute(store,name,i);assert.equal(p.targetResults.find(r=>r.targetId===i.targetIds[0]).woundsLost,0,'Protection réussie');await store.undo();assert.deepEqual(store.listParticipants(),before);
 }
}
