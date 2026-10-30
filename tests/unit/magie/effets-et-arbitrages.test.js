import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { actor, setup, person } from '../../helpers/relecture2-fixture.js';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { ficheSnapshot } from '../../../js/core/fiche-sync.js';
import { isTargetDaemon, isTargetUndead, previewLoreAttribute, applyLoreAttribute, LORE_ATTRIBUTES, normalizeLoreId, isTargetWearingMetalArmor, hasArcaneMagicLore } from '../../../js/core/v5-magic-attributes.js';
import { sanitizeParticipant, normalizeSearchText } from '../../../js/core/sanitize.js';
import { applyBeastForm, BEAST_PROFILES, previewVerdantApotheosis, applyVerdantApotheosis, daemonbaneReductions, previewBeastForm, revertBeastForm, previewDaemonbane, applyDaemonbane, previewHandOfGlory, applyHandOfGlory, calculateSapheryWard, testSapheryWard, applyScytheOfShyishRules } from '../../../js/core/v5-magic-arbitrations.js';
import { getAllSpellContracts, getSpellContract, getContractChoiceOptions, previewSpellExecution, NEGATIVE_CONDITIONS } from '../../../js/core/v5-spell-contracts.js';
import { effectiveSkillScore } from '../../../js/core/v5-magic-talents.js';
import { applyMiscastToParticipant } from '../../../js/core/v5-magic-miscasts.js';
import { processCombatTurnSpells } from '../../../js/core/v5-magic-turn.js';
import { previewBurnoutRecovery } from '../../../js/core/v5-magic-high.js';
import { applySpellEffects, expireSpellEffects, parseSpellDuration, rebaseMagicLayers, resolveTypedDuration, endBeastForm, resolveMagicMissile, calculateEffectiveStats, calculateEffectiveMagicAP, calculateEffectiveWard, resolveSpellDamage, resolveTouchOpposition, resolveSpellHealing } from '../../../js/core/v5-magic-effects.js';
import { commitV5Resources, getV5Fortune, formatV5Balance } from '../../../js/core/v5-resources.js';
import { fortuneDialogState } from '../../../js/ui/v5-fortune-dialog.js';
import { getArcaneWornArmor, previewArcaneUnforgiving } from '../../../js/core/v5-magic-arcane-unforgiving.js';
import { locationProtection } from '../../../js/core/equipment.js';
import { declaredAnswers, declared5BAnswers, declaredFacts, fixtureBlade } from '../../helpers/lot3-declared-answers.js';
import { attackNature, matchFilter, previewMagicProtection, natureTagLabel, spellAttackNature, targetNatureTags, weaponAttackNature, magicGrantedActions } from '../../../js/core/v5-magic-combat.js';
import { previewResolution } from '../../../js/core/resolution.js';
import { previewV5Turn } from '../../../js/core/v5-turn.js';
import { readFile } from 'node:fs/promises';
import { RULES } from '../../../js/data/rules.js';
import { APP_VERSION } from '../../../js/version.js';
import { sharedState } from '../../../js/core/sync-protocol.js';

describe('Audit — confrontation aux sources', () => {
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
});

describe('Audit — natures et import', () => {
const sources = label => [{traits:[label]}, {extensions:{traits:[{name:label}]}}, {tags:[label]}, {category:label}, {species:label}];
test('Audit A05 : une désignation complète est requise, quelle que soit la source de nature', () => {
 for (const label of ['Haine (Undead)', 'Hatred (Undead)', 'Chasseur de mort-vivants', 'Chasseur de démons', 'Pas un Mort-vivant']) {
  for (const extra of sources(label)) { assert.equal(isTargetUndead(actor('target',extra)),false,JSON.stringify(extra)); assert.equal(isTargetDaemon(actor('target',extra)),false,JSON.stringify(extra)); }
 }
 for (const label of ['Mort-vivant','Morts-vivants','Mort vivant','Undead','Undead Creature','Mort-vivant (9+)']) for(const extra of sources(label)) assert.equal(isTargetUndead(actor('target',extra)),true,JSON.stringify(extra));
 for (const label of ['Démon','Daemon','Daemonic','Démoniaque','Démon (9+)','Sanguinaire']) for(const extra of sources(label)) assert.equal(isTargetDaemon(actor('target',extra)),true,JSON.stringify(extra));
 assert.equal(isTargetUndead(actor('target',{name:'Undead'})),false); assert.equal(isTargetUndead(actor('target',{isUndead:true})),true);
});

test('Audit A02 : Vie et Mort partagent la nature vivante stricte',()=>{
 for(const label of ['Artificiel','Construct','Automate','Éthéré','Ethereal','Démon','Mort-vivant']) for(const extra of sources(label)) {
  const target=actor('target',extra),life=previewLoreAttribute({lore:'life',caster:actor(),targets:[target]}).targetEffects.get('target');
  assert.deepEqual(life.removeConditions,[],JSON.stringify(extra));
  assert.equal(previewLoreAttribute({lore:'death',caster:actor(),targets:[target]}).targetEffects.has('target'),false,JSON.stringify(extra));
 }
 for(const label of ['Chasseur de démons','Haine (Undead)','Chasseur d’Artificiels','Haine (Éthérés)']) {
  const target=actor('target',{traits:[label]});assert.deepEqual(previewLoreAttribute({lore:'life',caster:actor(),targets:[target]}).targetEffects.get('target').removeConditions,['hemorragique','extenue']);
  assert.equal(previewLoreAttribute({lore:'death',caster:actor(),targets:[target]}).targetEffects.has('target'),true);
 }
});

test('Audit A05 : attribut Vie réel conserve les B du vivant, recharge et Undo',async()=>{
 const s=await setup(actor(),actor('target',{hp:10,traits:['Hatred (Undead)'],states:[{name:'Exténué',key:'extenue',level:1}]}));
 const p=s.previewLoreAttribute({lore:'life',targetIds:['target']});await s.applyLoreAttribute(p,{casterId:'mage',targetIds:['target']});
 assert.equal(person(s,'target').hp,10);assert.equal(person(s,'target').states.length,0);const reloaded=await setup(person(s),person(s,'target'));assert.equal(person(reloaded,'target').hp,10);assert.equal(person(reloaded,'target').states.length,0);
 await s.undo();assert.equal(person(s,'target').hp,10);assert.equal(person(s,'target').states.length,1);
});

async function earthblood(extra){
 const s=await setup(actor(),actor('target',{hp:5,...extra}));await s.applySpellExecution('Sang de la Terre',{actorId:'mage',targetIds:['target'],sl:20,domainFacts:{directEarth:true},attributeActive:false});
 const effect=person(s,'target').extensions.v5.spellEffects.find(e=>e.roundEffect?.healing),engine=createCombatEngine(s);await engine.nextTurn();
 const inputs={target:{['spell:'+effect.id+':earth']:true,['spell:'+effect.id+':present']:true}};assert.equal(engine.previewNextTurn({inputs}).ready,true);await engine.nextTurn({inputs});
 const hp=person(s,'target').hp,reloaded=await setup(person(s),person(s,'target'));assert.equal(person(reloaded,'target').hp,hp);await s.undo();assert.equal(person(s,'target').hp,extra.hp ?? 5);return hp;
}
test('Audit A02 : Sang de la Terre, vrais Rounds, Artificiel non soigné et rôles vivants soignés',async()=>{
 for(const label of ['Artificiel','Construct','Éthéré','Démon','Mort-vivant'])assert.equal(await earthblood({traits:[label]}),5,label);
 for(const label of ['Chasseur de démons','Haine (Undead)','Humanoïde'])assert.equal(await earthblood({traits:[label]}),10,label);
 assert.equal(await earthblood({tags:['Artificiel']}),5);assert.equal(await earthblood({tags:['Chasseur de démons']}),10);
 assert.equal(await earthblood({hp:0,traits:['Humanoïde']}),5,'vivant à 0 B : soin conservé, pas de nouveau critère de nature');
});

const legacyForm=()=>({originalParticipant:{caracs:{F:30,E:30,FM:50,Dex:'–'},baseCaracs:{F:30,E:30,FM:50,Dex:'–'},hp:20,maxHp:30,M:4,traits:[]},initialBeastHp:14,durationMinutes:30,remainingMinutes:30});
test('Audit A06 : formes sans retour utilisable rejetées, pas seulement les nombres invalides',async()=>{
 const invalid=[{}, {beastProfile:{caracs:{F:30}}}, {originalParticipant:{}}, {originalParticipant:{caracs:{F:30},hp:10}}, {...legacyForm(),originalParticipant:{...legacyForm().originalParticipant,caracs:'inconnues'}}, {...legacyForm(),remainingMinutes:-1}];
 for(const form of invalid){const raw=actor('mage',{extensions:{v5:{beastForm:form}}});assert.equal(sanitizeParticipant(raw).extensions.v5.beastForm,undefined);const s=await setup(raw,actor('target'));assert.equal(person(s).extensions.v5.beastForm,undefined);const cast=s.previewSpellExecution('Carreau',{actorId:'mage',targetIds:['target'],sl:20,locationRoll:34,attributeActive:false});assert.equal(cast.ready,true,cast.error);}
});
test('Audit A06 : ancien retour valide sans métadonnées récentes conservé, Dex absente conservée',async()=>{
 const raw=actor('mage',{hp:11,maxHp:14,extensions:{v5:{beastForm:legacyForm()}}});const s=await setup(raw);assert.ok(person(s).extensions.v5.beastForm);const reloaded=await setup(person(s));assert.ok(person(reloaded).extensions.v5.beastForm);await reloaded.revertBeastForm('mage');assert.equal(person(reloaded).hp,17);assert.equal(person(reloaded).maxHp,30);await reloaded.undo();assert.ok(person(reloaded).extensions.v5.beastForm);
});
test('Audit A06 : les six formes normales conservent un retour après sanitisation/recharge',async()=>{
 for(const profile of Object.values(BEAST_PROFILES)){const transformed=applyBeastForm(actor(),profile).participant;const s=await setup(transformed);assert.ok(person(s).extensions.v5.beastForm,profile.name);await s.revertBeastForm('mage');assert.equal(person(s).maxHp,30,profile.name);assert.equal(person(s).hp,30,profile.name);}
});

test('Audit A02 : Sang de la Terre ne relève pas le mort déclaré par Mort rapide',async()=>{
 const s=await setup(actor(),actor('target',{hp:0,traits:['Humanoïde']}));
 await s.applySpellExecution('Mort rapide',{actorId:'mage',targetIds:['target'],sl:20,attributeActive:false});assert.equal(person(s,'target').extensions.v5.dead,true);
 await s.applySpellExecution('Sang de la Terre',{actorId:'mage',targetIds:['target'],sl:20,domainFacts:{directEarth:true},attributeActive:false});
 const effect=person(s,'target').extensions.v5.spellEffects.find(e=>e.roundEffect?.healing),engine=createCombatEngine(s);await engine.nextTurn();
 const inputs={target:{['spell:'+effect.id+':earth']:true,['spell:'+effect.id+':present']:true}},round=s.getCombat().round;assert.equal(engine.previewNextTurn({inputs}).ready,true);await engine.nextTurn({inputs});assert.equal(s.getCombat().round,round+1);
 assert.equal(person(s,'target').hp,0);assert.equal(person(s,'target').extensions.v5.dead,true);
 const {createStore}=await import('../../../js/core/store.js');const reloaded=createStore();await reloaded.ready;await reloaded.loadFromJSON(s.getFullJSON());assert.equal(person(reloaded,'target').hp,0);assert.equal(person(reloaded,'target').extensions.v5.dead,true);
 await s.undo();assert.equal(s.getCombat().round,round);assert.equal(person(s,'target').hp,0);assert.equal(person(s,'target').extensions.v5.dead,true);
});
});

describe('Livraison 2A — durées, effets et expirations', () => {
/**
 * Livraison 2a du lot 3 : S-02 (écoulement du temps), S-04 (durées), S-05 (couches et base), S-11 (ressources canoniques).
 */

const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 } } }, ...extra });
const snapshotOf = store => ({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: store.listParticipants()[0].id, order: store.listParticipants().map(p => p.id), participants: JSON.parse(JSON.stringify(store.listParticipants())) }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const caster = { caracs: { FM: 45, Int: 52, Soc: 31, E: 38, I: 41, Ag: 33, F: 36, Dex: 27 } };
const read = (raw, extra = {}) => parseSpellDuration(raw, { caster, ...extra });

test('S-04 — interpréteur : bonus, valeurs pleines, multiplicateurs, unités, abréviations (FM 45, Int 52, Soc 31)', () => {
  const timed = (raw, unit, amount) => assert.deepEqual(read(raw), { kind: 'timed', unit, amount }, raw);
  timed('(Bonus de Sociabilité) Rounds', 'rounds', 3);             // Miroir Mystique, Destin de Bjuna
  timed('(Bonus de Sociabilité) minutes', 'minutes', 3);           // Murmure de la Nature
  timed('Bonus de Sociabilité en minutes', 'minutes', 3);          // Voix de Fer
  timed('Bonus de Soc. rounds', 'rounds', 3);
  timed("Bonus d'Int. rounds", 'rounds', 5);                       // Glamour de Teclis
  timed('Bonus d’Intelligence heures', 'hours', 5);
  timed('2 × Bonus de Volonté rounds', 'rounds', 8);               // Capuche Vengeresse
  timed('FM minutes', 'minutes', 45);                              // valeur pleine, pas le bonus
  timed('(Force Mentale) minutes', 'minutes', 45);
  timed('Bonus de FM minutes', 'minutes', 4);
  timed('(Bonus de Force Mentale) Rounds +', 'rounds', 4);
  timed('BFM heures', 'hours', 4);
  timed('(Bonus d’Initiative) Rounds', 'rounds', 4);
  timed('Bonus de Force rounds', 'rounds', 3);
  timed('(Agilité) minutes', 'minutes', 33);
  timed('Endurance minutes', 'minutes', 38);
  timed('Bonus de Volonté jours', 'days', 4);
  timed('3 Rounds', 'rounds', 3);
  assert.deepEqual(read('Instantané'), { kind: 'instant' });
  assert.equal(parseSpellDuration('(Bonus d’Intelligence de la cible) Rounds', { caster, target: { caracs: { Int: 68 } } }).amount, 6, 'cible nommée : caractéristique de la cible');
  assert.equal(read('(Bonus d’Intelligence de la cible) Rounds').kind, 'unknown', 'cible absente : donnée MJ');
  for (const raw of ['Spécial', '1d10 heures', 'Bonus d’Endurance Rounds ou heures', /* V5 p. 243 : choix déclaré */ '(Force Mentale × 1d10) minutes', '(Bonus de Force Mentale) minutes ou jours', 'Jusqu’au lever du soleil', 'Bonus de Chance rounds']) {
    assert.equal(read(raw).kind, 'unknown', raw);
  }
  assert.equal(parseSpellDuration('(Bonus de Force Mentale) Rounds', { caster: { caracs: {} } }).kind, 'unknown', 'caractéristique absente : jamais de repli sur 3');
});

test('S-04 — les 277 contrats : seules les durées réellement narratives ou à choisir restent « donnée MJ »', () => {
  const probe = { caracs: { CC: 50, CT: 50, F: 40, E: 40, I: 50, Ag: 50, Dex: 50, Int: 60, FM: 60, Soc: 50, M: 4 } };
  const contracts = getAllSpellContracts().filter(c => !c.isTradition);
  assert.equal(contracts.length, 277);
  const unreadable = contracts.filter(c => parseSpellDuration(c.duration, { caster: probe, target: probe }).kind === 'unknown');
  const durations = [...new Set(unreadable.map(c => c.duration))].sort();
  assert.deepEqual(durations, [
    '1d10 heures', // WoM p.77 : dé secret fourni explicitement par le MJ
    'Bonus de Force Mentale minutes ou jours', // WoM p.124, paramètre canonique                // idem
    'Bonus d’Endurance Rounds ou heures', /* V5 p. 243 : choix déclaré */                                              // dé de durée (Réplique de Levorg)
    'Jusqu’au lever du soleil',                                 // échéance narrative
    'Jusqu’au prochain lever du soleil',                        // échéance narrative
    'Spécial'                                                   // durée propre au sort
  ].sort());
});

test('S-04 — Protection : palier de durée ×2 donne 8 Rounds au lieu de 4 ; durée MJ transmise jusqu’à l’application', async () => {
  const base = resolveTypedDuration({ duration: '(Bonus de Force Mentale) Rounds' }, caster, { caster, round: 1 });
  const doubled = resolveTypedDuration({ duration: '(Bonus de Force Mentale) Rounds' }, caster, { caster, round: 1, overcastDurationMultiplier: 2 });
  assert.equal(base.durationRounds, 4);
  assert.equal(doubled.durationRounds, 8);

  const store = await combat(wizard(), wizard('ally'));
  const input = { actorId: 'mage', targetIds: ['mage'], roll: 25, overcastChoices: { duration: 2 } };
  const preview = store.previewSpellExecution('Protection', input);
  assert.equal(preview.ready, true, preview.error);
  assert.ok(preview.overcast.durationMultiplier >= 2);
  await store.applySpellExecution('Protection', input);
  assert.equal(person(store, 'mage').extensions.v5.spellEffects[0].durationRounds, 4 * preview.overcast.durationMultiplier);

  const fresh = await combat(wizard());
  const special = { actorId: 'mage', targetIds: ['mage'], roll: 25 };
  const blocked = fresh.previewSpellExecution('Substance d’Ombre', special);
  assert.equal(blocked.ready, true); // Retours5A : préconditions spatiales assistées, sans calcul, facultatives.
  assert.equal(blocked.targetResults[0].temporaryEffect.duration, 'Spécial'); // WoM p.113 : fin en quittant l’ombre, pas durée MJ inventée.
  const given = fresh.previewSpellExecution('Substance d’Ombre', { ...special, domainFacts:{sourceShadow:true,visibleLight:true,totalDarkness:false} });
  assert.equal(given.ready, true, given.error);
  await fresh.applySpellExecution('Substance d’Ombre', { ...special, domainFacts:{sourceShadow:true,visibleLight:true,totalDarkness:false} });
  const effect = person(fresh, 'mage').extensions.v5.spellEffects[0];
  assert.equal(effect.durationType, 'special');
  assert.equal(effect.expiresAtRound, undefined);
});

test('S-02 — temps écoulé : les Rounds expirent (6 par minute), les minutes diminuent ; Undo atomique', async () => {
  const store = await combat(wizard());
  await store.applySpellEffects('mage', { id: 'short', spellId: 'short', casterId: 'mage', statModifiers: { CC: 10 }, duration: '(Bonus de Force Mentale) Rounds' });
  await store.applySpellEffects('mage', { id: 'long', spellId: 'long', casterId: 'mage', statModifiers: { F: 10 }, duration: 'FM minutes' });
  const [short, long] = person(store, 'mage').extensions.v5.spellEffects;
  assert.equal(short.durationRounds, 4);
  assert.equal(long.remainingMinutes, 45);
  assert.equal(long.expiresAtRound - long.appliedAtRound, 270);
  await store.advanceTalentMinutes(10);
  const after = person(store, 'mage');
  assert.deepEqual(after.extensions.v5.spellEffects.map(e => e.id), ['long']);
  assert.equal(after.extensions.v5.spellEffects[0].remainingMinutes, 35);
  assert.equal(after.caracs.CC, 40, 'le buff en Rounds est retiré');
  assert.equal(after.caracs.F, 40);
  await store.undo();
  assert.equal(person(store, 'mage').extensions.v5.spellEffects.length, 2);
  assert.equal(person(store, 'mage').caracs.CC, 50);
  await store.advanceTalentMinutes(45);
  assert.equal(person(store, 'mage').extensions.v5.spellEffects.length, 0);
  assert.equal(person(store, 'mage').caracs.F, 30);
});

test('S-02 — Rounds de combat : le temps restant en minutes suit l’horloge de Rounds', () => {
  let p = applySpellEffects(wizard(), { id: 'long', spellId: 'long', casterId: 'mage', statModifiers: { F: 10 }, duration: '10 minutes' }, { round: 1 }).participant;
  p = processCombatTurnSpells([p], 31, 'mage', { actorId: 'mage', round: 31 })[0];
  assert.equal(p.extensions.v5.spellEffects[0].remainingMinutes, 5, '10 min − 30 Rounds = 5 min');
  p = processCombatTurnSpells([p], 61, 'mage', { actorId: 'mage', round: 61 })[0];
  assert.equal(p.extensions.v5.spellEffects.length, 0);
});

test('S-05 — buff, synchronisation de fiche (nouvelle base), expiration : la valeur finale est la nouvelle base', () => {
  const buffed = applySpellEffects(wizard(), { id: 'b', spellId: 'b', casterId: 'mage', statModifiers: { CC: 10 }, duration: 3 }, { round: 1 }).participant;
  assert.equal(buffed.caracs.CC, 50);
  const synced = rebaseMagicLayers(buffed, { caracs: { CC: 45 } });
  assert.equal(synced.caracs.CC, 55, 'couche recalculée sur la nouvelle base');
  assert.equal(synced.extensions.v5.baseCaracs.CC, 45);
  const expired = expireSpellEffects(synced, { currentRound: 9 }).participant;
  assert.equal(expired.caracs.CC, 45);
  const idle = rebaseMagicLayers(expired, { caracs: { CC: 47 } });
  assert.equal(idle.caracs.CC, 47);
  assert.equal(applySpellEffects(idle, { id: 'c', spellId: 'c', statModifiers: { CC: 5 }, duration: 3 }, { round: 1 }).participant.caracs.CC, 52, 'base périmée jamais réutilisée');
});

test('S-05 — deux sorts sur la même cible : l’expiration de l’un laisse l’autre ; Mouvement et Protection recalculés', () => {
  let p = applySpellEffects(wizard(), { id: 'a', spellId: 'a', casterId: 'mage', statModifiers: { M: 2, F: 10 }, ward: 7, duration: 2 }, { round: 1 }).participant;
  p = applySpellEffects(p, { id: 'b', spellId: 'b', casterId: 'mage', statModifiers: { Int: 10 }, ward: 9, duration: 8 }, { round: 1 }).participant;
  assert.equal(p.M, 6); assert.equal(p.movement, 6); assert.equal(p.extensions.v5.ward, 7);
  p = expireSpellEffects(p, { effectId: 'a' }).participant;
  assert.equal(p.caracs.Int, 62); assert.equal(p.caracs.F, 30); assert.equal(p.M, 4); assert.equal(p.movement, 4); assert.equal(p.extensions.v5.ward, 9);
});

test('S-05 — Saphery et autre sort : le seuil reste dans la couche (3, pas 9)', () => {
  let p = applySpellEffects(wizard(), { id: 's', spellId: 'saphery', ward: 3, duration: 5 }, { round: 1 }).participant;
  p = applySpellEffects(p, { id: 'p', spellId: 'protection', ward: 9, duration: 5 }, { round: 1 }).participant;
  assert.equal(p.extensions.v5.ward, 3);
});

test('S-05 — Bouclier de Saphery : reçu « réussite automatique » et seuil porté par la couche', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 30 } } } }), wizard('ally'));
  const input = { actorId: 'mage', targetIds: ['ally'], roll: 25, otherHighSpellsCount: 8 };
  const preview = store.previewSpellExecution('Bouclier de Saphery', input);
  assert.equal(preview.ready, true, preview.error);
  const action = preview.targetResults[0].actions.find(a => a.kind === 'shield-of-saphery');
  assert.equal(action.automaticSuccess, true);
  await store.applySpellExecution('Bouclier de Saphery', input);
  const ally = person(store, 'ally');
  assert.equal(ally.extensions.v5.ward, 1);
  assert.equal(ally.extensions.v5.spellEffects[0].ward, 1);
});

test('S-05 — compétence importée comptée une seule fois, avant et après synchronisation', () => {
  const imported = wizard('mage', { skills: [{ name: 'Corps à corps (Base)', total: 60 }] });
  const buffed = applySpellEffects(imported, { id: 'cc', spellId: 'cc', statModifiers: { CC: 10 }, duration: 4 }, { round: 1 }).participant;
  assert.equal(effectiveSkillScore(buffed, 60, 'CC'), 70);
  const synced = rebaseMagicLayers({ ...buffed, skills: [{ name: 'Corps à corps (Base)', total: 65 }] }, { caracs: { CC: 45 } });
  assert.equal(effectiveSkillScore(synced, 65, 'CC'), 75);
  assert.equal(effectiveSkillScore(expireSpellEffects(synced, { currentRound: 9 }).participant, 65, 'CC'), 65);
});

test('S-05 — Undo et rechargement : couches cohérentes (store sérialisé puis rechargé)', async () => {
  const store = await combat(wizard());
  await store.applySpellEffects('mage', { id: 'b', spellId: 'b', casterId: 'mage', statModifiers: { CC: 10 }, duration: '(Bonus de Force Mentale) Rounds' });
  const reloaded = createStore(); await reloaded.ready; await reloaded.loadFromJSON(snapshotOf(store));
  assert.equal(person(reloaded, 'mage').caracs.CC, 50);
  await reloaded.expireSpellEffects('mage', { effectId: 'b' });
  assert.equal(person(reloaded, 'mage').caracs.CC, 40);
  await store.undo();
  assert.equal(person(store, 'mage').caracs.CC, 40);
  assert.equal((person(store, 'mage').extensions.v5.spellEffects || []).length, 0);
});

test('S-05 — identifiants d’effets d’incident uniques dans un même Round', () => {
  const miscast = { table: 'MINOR', name: 'Langue maladroite', finalRoll: 3, details: { type: 'penalty', duration: { value: 2, unit: 'rounds' }, slModifier: -1, targetSkillCategory: 'Langue', summary: 'x' } };
  let p = applyMiscastToParticipant(wizard(), miscast, { round: 2 }).participant;
  p = applyMiscastToParticipant(p, miscast, { round: 2 }).participant;
  const ids = p.extensions.v5.miscastEffects.map(e => e.id);
  assert.equal(ids.length, 2);
  assert.equal(new Set(ids).size, 2);
});

const withV5 = (extra = {}) => wizard('mage', { extensions: { v5: { hasMomentum: true, ...extra } } });

test('S-11 — épuisement temporaire : Chance seulement, compteur initialisé exigé, Undo rembourse', async () => {
  const store = await combat(withV5({ burnout: { active: true, permanent: false, days: 3 }, fate: 2 }));
  assert.equal(store.previewBurnoutRecovery({ actorId: 'mage' }).possible, false, 'compteur non initialisé : bloqué');
  assert.match(store.previewBurnoutRecovery({ actorId: 'mage' }).reason, /initialisé/);
  await store.setFortune('mage', 2);
  assert.equal(store.previewBurnoutRecovery({ actorId: 'mage', resource: 'fate' }).possible, false, 'le Destin ne lève pas un épuisement temporaire');
  const preview = store.previewBurnoutRecovery({ actorId: 'mage' });
  assert.equal(preview.possible, true);
  await store.applyBurnoutRecovery(preview, { actorId: 'mage' });
  assert.equal(person(store, 'mage').extensions.v5.burnout, null);
  assert.equal(store.getFortune('mage').balance, 1);
  assert.equal(person(store, 'mage').extensions.v5.fate, 2, 'Destin intact');
  await store.undo();
  assert.equal(store.getFortune('mage').balance, 2);
  assert.equal(person(store, 'mage').extensions.v5.burnout.active, true);
});

test('S-11 — épuisement permanent : Destin canonique (extensions.v5.fate), conservé au rechargement', async () => {
  const store = await combat(withV5({ burnout: { active: true, permanent: true, days: 1e9 }, fate: 2 }));
  await store.setFortune('mage', 2);
  assert.equal(store.previewBurnoutRecovery({ actorId: 'mage', resource: 'fortune' }).possible, false);
  await store.applyBurnoutRecovery(store.previewBurnoutRecovery({ actorId: 'mage' }), { actorId: 'mage' });
  assert.equal(person(store, 'mage').extensions.v5.fate, 1);
  assert.equal(person(store, 'mage').fate, 1);
  assert.equal(store.getFortune('mage').balance, 2, 'la Chance n’est pas touchée');
  const reloaded = createStore(); await reloaded.ready; await reloaded.loadFromJSON(snapshotOf(store));
  assert.equal(person(reloaded, 'mage').fate, 1);
  await store.undo();
  assert.equal(person(store, 'mage').extensions.v5.fate, 2);
  assert.equal(previewBurnoutRecovery({ extensions: { v5: { burnout: { active: true, permanent: true }, resources: { fortune: 1 } } } }).possible, false, 'Destin absent : bloqué');
});

test('S-11 — Défiance magique : compteur de Chance non initialisé bloque, jamais de levée gratuite', async () => {
  const defiance = wizard('ally', { talents: [{ id: 'talent-magic-defiance', status: 'resolved', rank: 1 }] });
  const store = await combat(wizard(), defiance);
  await store.startMagicAdventure();
  const input = { actorId: 'mage', targetIds: ['ally'], roll: 25, magicDefianceTargets: ['ally'] };
  const blocked = store.previewSpellExecution('Carreau', input);
  assert.equal(blocked.ready, false);
  assert.match(blocked.error, /Chance/);
  await store.setFortune('ally', 1);
  assert.equal(store.previewSpellExecution('Carreau', input).ready, true);
  await store.applySpellExecution('Carreau', input);
  assert.equal(store.getFortune('ally').balance, 0);
  await store.undo();
  assert.equal(store.getFortune('ally').balance, 1);
});

test('S-11 — Clairvoyance chaotique : Chance créditée par le registre, Corruption par Chance en reçu MJ, Undo', async () => {
  const preview = { ready: true, cancelled: false, table: 'MINOR', name: 'Clairvoyance chaotique', finalRoll: 50, details: { type: 'fortune-corruption', fortuneGained: 1, corruptionPerFortuneSpent: 1, summary: 'Chance gagnée' } };
  const store = await combat(wizard());
  await store.applyMiscast(preview, { actorId: 'mage' });
  assert.equal(store.getFortune('mage').balance ?? null, null, 'compteur non initialisé : rien d’écrit dans le registre');
  await store.setFortune('mage', 1);
  await store.applyMiscast(preview, { actorId: 'mage' });
  assert.equal(store.getFortune('mage').balance, 2);
  assert.equal(person(store, 'mage').extensions.v5.corruptionPerFortuneSpent, 1);
  await store.undo();
  assert.equal(store.getFortune('mage').balance, 1);
  const pure = applyMiscastToParticipant(wizard(), preview, { round: 1 });
  assert.ok(pure.reminders.some(r => /Corruption par Point de Chance/.test(r)));
  assert.ok(pure.reminders.some(r => /à créditer à la main/.test(r)));
});
});

describe('Livraison 2A — corrections', () => {
/**
 * Corrections de la livraison 2a (retours de vérification) : PA magiques, temps hors combat, Forme bestiale,
 * Mouvement, Chance/Destin temporaires, Protection de domaine.
 */

const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const armourItem = (id, layer, ap) => ({ id, baseId: id, catalogVersion: 'fixture', kind: 'armour', name: id, category: 'Armure', damage: '', reach: '', range: '', notes: '', source: '', custom: true,
  ap, layer, locations: ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'], keywords: [] });

const ROLLS = [9, 11, 33, 40, 55, 88]; // une localisation par jet (jet inversé)
const shoot = (store, roll) => store.previewResolution({ v5: { kind: 'ranged' }, actorId: 'archer', targetId: 'mage', action: { type: 'attack', base: 99, damage: 2 }, roll });
const missile = (store, roll) => resolveMagicMissile({ caster: person(store, 'archer'), target: person(store, 'mage'), spell: { damage: 4 }, roll });
/** PA lus par l’arme et par le projectile, par localisation touchée, pour un même jet. */
function protections(store) {
  const rows = {};
  for (const roll of ROLLS) rows[roll] = { weapon: shoot(store, roll).protection, missile: missile(store, roll).ap };
  return rows;
}

const VARIANTS = {
  'armor seul': { armor: { head: 1, body: 2, arms: 1, legs: 1 } },
  'armorLocations importé': { armor: { head: 0, body: 0, arms: 0, legs: 0 }, armorLocations: { head: 1, body: 2, rightArm: 1, leftArm: 1, rightLeg: 1, leftLeg: 1 } },
  'armure équipée': { equipment: [armourItem('cuir', 'leather', 1), armourItem('plate', 'rigid', 1)] }
};

for (const [name, extra] of Object.entries(VARIANTS)) {
  test(`PA magiques — ${name} : arme et projectile magique lisent la même protection, avant et après expiration`, async () => {
    const store = await combat(wizard('mage', extra), wizard('archer'));
    const before = protections(store);
    assert.equal(new Set(ROLLS.map(roll => before[roll].weapon.location)).size, 6, 'les six localisations sont couvertes');
    await store.applySpellExecution('Armure aethyrique', { actorId: 'mage', targetIds: ['mage'], roll: 25 });
    const buffed = protections(store);
    for (const roll of ROLLS) {
      assert.equal(buffed[roll].weapon.ap, before[roll].weapon.ap + 1 /* V5 p. 242 */, `arme, jet ${roll}`);
      assert.equal(buffed[roll].missile, buffed[roll].weapon.ap, `projectile = arme, jet ${roll}`);
    }
    await store.expireSpellEffects('mage', { currentRound: 99 });
    const after = protections(store);
    for (const roll of ROLLS) {
      assert.equal(after[roll].weapon.ap, before[roll].weapon.ap, `arme après expiration, jet ${roll}`);
      assert.equal(after[roll].missile, before[roll].missile, `projectile après expiration, jet ${roll}`);
    }
  });
}

test('PA magiques — PA détruits (Arcanes) soustraits une seule fois, avec PA magiques ajoutés', async () => {
  const store = await combat(wizard('mage', { equipment: [armourItem('cuir', 'leather', 3)], extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 }, armorDamage: { body: 2 } } } }), wizard('archer'));
  await store.applySpellExecution('Armure aethyrique', { actorId: 'mage', targetIds: ['mage'], roll: 25 });
  const rows = ROLLS.map(roll => ({ weapon: shoot(store, roll).protection, missile: missile(store, roll).ap }));
  for (const { weapon, missile: ap } of rows) {
    assert.equal(weapon.ap, weapon.location === 'body' ? 3 + 1 - 2 : 3 + 1 /* V5 p. 242 */);
    assert.equal(ap, weapon.ap);
  }
});

async function outOfCombat(...people) {
  const store = await combat(...people);
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  assert.equal(store.getCombat().round, 0);
  return store;
}
const buff = (id, duration) => ({ id, spellId: id, casterId: 'mage', statModifiers: { CC: 10 }, duration });

test('Temps hors combat — le Round courant est 1 partout : 6 Rounds + 1 minute, 12 Rounds + 2 × 1 minute, 1 Round + 0,2 minute expirent', async () => {
  const store = await outOfCombat(wizard());
  await store.applySpellEffects('mage', buff('six', '6 Rounds'));
  await store.advanceTalentMinutes(1);
  assert.equal(person(store, 'mage').extensions.v5.spellEffects.length, 0, '6 Rounds = 1 minute');
  assert.equal(person(store, 'mage').caracs.CC, 40);

  await store.applySpellEffects('mage', buff('douze', '12 Rounds'));
  await store.advanceTalentMinutes(1);
  assert.equal(person(store, 'mage').extensions.v5.spellEffects.length, 1, '1 minute sur 2 : actif');
  await store.advanceTalentMinutes(1);
  assert.equal(person(store, 'mage').extensions.v5.spellEffects.length, 0);

  await store.applySpellEffects('mage', buff('un', '1 Round'));
  await store.advanceTalentMinutes(0.2);
  assert.equal(person(store, 'mage').extensions.v5.spellEffects.length, 0, '1 Round = 10 s < 0,2 minute');
});

const wolf = { name: 'Loup', M: 9, hp: 12, caracs: { CC: 35, CT: 0, F: 35, E: 30, I: 40, Ag: 40, Dex: 0, Int: 14, FM: 20, Soc: 10 }, traits: ['Morsure'] };
function beastFormWithExpiredBuff() {
  let p = applySpellEffects(wizard(), { id: 'buff', spellId: 'buff', casterId: 'mage', statModifiers: { CC: 10, M: 2 }, duration: 3 }, { round: 1 }).participant;
  assert.equal(p.caracs.CC, 50); assert.equal(p.caracs.M, 6);
  p = applyBeastForm(p, wolf, { round: 1, durationMinutes: 30 }).participant;
  p = applySpellEffects(p, { id: 'marker', spellId: 'beast', casterId: 'mage', beastFormMarker: true, duration: '30 minutes' }, { round: 1 }).participant;
  return expireSpellEffects(p, { effectId: 'buff' }).participant;
}

test('Forme bestiale — retour manuel : couches recalculées sur la base d’origine, marqueur retiré', async () => {
  const sous = beastFormWithExpiredBuff();
  assert.equal(sous.caracs.F, 35, 'sous la forme : Force de la bête'); assert.equal(sous.caracs.CC, 40, 'CC du lanceur conservée (V5 p. 245), couche expirée retirée'); assert.equal(sous.caracs.M, 9);
  const store = await combat(sous);
  await store.revertBeastForm('mage');
  const back = person(store, 'mage');
  assert.equal(back.caracs.CC, 40); assert.equal(back.caracs.M, 4); assert.equal(back.movement, 4);
  assert.deepEqual((back.extensions.v5.spellEffects || []).filter(e => e.beastFormMarker), [], 'plus de marqueur orphelin');
  assert.equal(back.extensions.v5.beastForm, undefined);
});

test('Forme bestiale — même chemin au terme de la durée (Tour) : pas de marqueur ni de valeurs périmées', () => {
  const sous = beastFormWithExpiredBuff();
  const [back] = processCombatTurnSpells([sous], 999, 'mage', { actorId: 'mage', round: 999 });
  assert.equal(back.caracs.CC, 40); assert.equal(back.caracs.M, 4);
  assert.equal((back.extensions.v5.spellEffects || []).length, 0);
  assert.equal(back.extensions.v5.beastForm, undefined);
});

test('Forme bestiale — un buff encore actif au retour reste appliqué sur la base d’origine', () => {
  let p = applySpellEffects(wizard(), { id: 'long', spellId: 'long', casterId: 'mage', statModifiers: { CC: 10 }, duration: '60 minutes' }, { round: 1 }).participant;
  p = applyBeastForm(p, wolf, { round: 1, durationMinutes: 30 }).participant;
  const back = endBeastForm(p).participant;
  assert.equal(back.caracs.CC, 50);
});

const withoutMovement = () => { const p = wizard(); delete p.caracs.M; return p; };

test('Mouvement — jamais inventé : aperçu bloqué sans Mouvement connu, M non écrit par les autres sorts', async () => {
  const store = await combat(withoutMovement());
  const blocked = store.previewSpellExecution('Passage Rapide', { actorId: 'mage', targetIds: ['mage'], roll: 25 });
  assert.equal(blocked.ready, false);
  assert.match(blocked.error, /Mouvement du participant requis/);
  assert.deepEqual(blocked.missing, ['movement']);

  const other = applySpellEffects(withoutMovement(), { id: 'cc', spellId: 'cc', statModifiers: { CC: 10 }, duration: 3 }, { round: 1 }).participant;
  assert.equal(other.caracs.CC, 50);
  assert.equal(Object.hasOwn(other.caracs, 'M'), false);
  assert.equal(other.movement, undefined); assert.equal(other.M, undefined);

  const forced = applySpellEffects(withoutMovement(), { id: 'm', spellId: 'm', statModifiers: { M: 1 }, duration: 3 }, { round: 1 }).participant;
  assert.equal(Object.hasOwn(forced.caracs, 'M'), false, 'aucun 4 par défaut');

  const known = await combat(wizard());
  assert.equal(known.previewSpellExecution('Passage Rapide', { actorId: 'mage', targetIds: ['mage'], roll: 25 }).ready, true);
  const fiche = applySpellEffects({ ...withoutMovement(), movement: 5 }, { id: 'm', spellId: 'm', statModifiers: { M: 1 }, duration: 3 }, { round: 1 }).participant;
  assert.equal(fiche.caracs.M, 6, 'Mouvement de fiche pris comme base');
});

test('Durée — la surpuissance de durée s’applique aussi à Main de Gloire, à la Forme bestiale ; la durée saisie par le MJ est une durée de base', async () => {
  const input = (extra = {}) => ({ actorId: 'mage', targetIds: ['ally'], roll: 25, chosenStats: [], hogTier: 'movement', ...extra });
  const hog = async extra => {
    const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 30 } } } }), wizard('ally'));
    const preview = store.previewSpellExecution('Main de Gloire', input(extra));
    assert.equal(preview.ready, true, preview.error);
    await store.applySpellExecution('Main de Gloire', input(extra));
    return { effect: person(store, 'ally').extensions.v5.spellEffects[0], multiplier: preview.overcast.durationMultiplier };
  };
  const plain = await hog(), doubled = await hog({ overcastChoices: { duration: 2 } });
  assert.equal(plain.effect.durationRounds, 1);
  assert.ok(doubled.multiplier >= 2);
  assert.equal(doubled.effect.durationRounds, doubled.multiplier);

  const beast = async extra => {
    const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 20 } } } }));
    const options = { actorId: 'mage', targetIds: ['mage'], roll: 25, beastKey: 'wolf', attributeActive: false, ...extra };
    const preview = store.previewSpellExecution('Forme bestiale', options);
    assert.equal(preview.ready, true, preview.error);
    await store.applySpellExecution('Forme bestiale', options);
    const p = person(store, 'mage');
    return { form: p.extensions.v5.beastForm, marker: p.extensions.v5.spellEffects.find(e => e.beastFormMarker), multiplier: preview.overcast.durationMultiplier };
  };
  const bPlain = await beast(), bDoubled = await beast({ overcastChoices: { duration: 2 } });
  assert.equal(bPlain.form.durationMinutes, 30);
  assert.equal(bDoubled.form.durationMinutes, 30 * bDoubled.multiplier);
  assert.equal(bDoubled.marker.durationMinutes, bDoubled.form.durationMinutes);

  // Durée saisie par le MJ = durée de base, avant surpuissance : elle est multipliée comme une durée de contrat
  // (`effectDuration` la renvoie sous la forme « 3 minutes » avant résolution typée).
  const mj = resolveTypedDuration({ duration: '3 minutes' }, wizard(), { round: 1, overcastDurationMultiplier: 2 });
  assert.equal(mj.durationMinutes, 6);
  assert.equal(mj.durationRounds, 36);
});

test('Durée — attribut des Ombres : la durée du sort protégé suit le palier de durée (les Bêtes v3 ne portent plus de durée)', () => {
  const caster = wizard();
  const apply = (lore, multiplier) => {
    const preview = previewLoreAttribute({ caster, targets: [], lore, spell: { name: 'Protection', effects:{ward:7}, duration: '2 Rounds' } });
    const receipt = applyLoreAttribute({}, preview, { caster, round: 1, targets: [], overcastDurationMultiplier: multiplier });
    return receipt.updatedParticipants.get('mage').extensions.v5.spellEffects[0];
  };
  assert.equal(apply('shadow', 1).durationRounds, 2);
  assert.equal(apply('shadow', 2).durationRounds, 4);
});

const caster = (extra = {}) => wizard('mage', { fortune: 2, ...extra });
const resourcesOf = (store, id) => person(store, id).extensions.v5.resources;

test('Chance temporaire — Signes d’Amul : le registre porte la composante temporaire, aucune écriture à plat, expiration et consommation cohérentes', async () => {
  const store = await combat(caster());
  await store.setFortune('mage', 2);
  await store.applySpellExecution('Le Second Signe d’Amul', { actorId: 'mage', targetIds: ['mage'], roll: 15, attributeActive: false });
  const fortune = store.getFortune('mage');
  assert.equal(fortune.permanent, 2); assert.equal(fortune.temporary, 3); assert.equal(fortune.balance, 5);
  assert.equal(resourcesOf(store, 'mage').fortune, 5, 'projection = registre');
  const mage = person(store, 'mage'), v5 = mage.extensions.v5;
  assert.equal(mage.fortune, 2, 'participant.fortune non réécrit'); assert.equal(mage.chance, undefined);
  for (const key of ['temporaryFortune', 'basePermanentFortune', 'fortune']) assert.equal(v5[key], undefined, `extensions.v5.${key} non écrit`);

  assert.equal(store.consumeTemporaryFortune('mage', 1).consumed, 1);
  assert.deepEqual([store.getFortune('mage').temporary, store.getFortune('mage').balance, resourcesOf(store, 'mage').fortune], [2, 4, 4]);

  await store.expireSpellEffects('mage', { currentRound: 10 });
  assert.deepEqual([store.getFortune('mage').temporary, store.getFortune('mage').balance, resourcesOf(store, 'mage').fortune], [0, 2, 2]);
  assert.equal(store.getFortune('mage').permanent, 2);
});

test('Chance temporaire — une action payante dépense d’abord la Chance temporaire, puis la permanente', async () => {
  const store = await combat(caster());
  await store.setFortune('mage', 2);
  await store.applySpellExecution('Le Premier Signe d’Amul', { actorId: 'mage', targetIds: ['mage'], roll: 15, attributeActive: false });
  const v5 = person(store, 'mage').extensions.v5;
  await store.updateParticipant('mage', { extensions: { ...person(store, 'mage').extensions, v5: { ...v5, burnout: { active: true, permanent: false, days: 3 } } } });
  assert.deepEqual([store.getFortune('mage').permanent, store.getFortune('mage').temporary], [2, 1]);
  const recovery = store.previewBurnoutRecovery({ actorId: 'mage' });
  assert.equal(recovery.possible, true);
  await store.applyBurnoutRecovery(recovery, { actorId: 'mage' });
  assert.deepEqual([store.getFortune('mage').permanent, store.getFortune('mage').temporary, store.getFortune('mage').balance], [2, 0, 2], 'le point temporaire est payé en premier');
  await store.undo();
  assert.deepEqual([store.getFortune('mage').permanent, store.getFortune('mage').temporary], [2, 1]);
});

test('Chance temporaire — aucune divergence registre/projection après nextTurn jusqu’à l’expiration', async () => {
  const store = await combat(caster());
  await store.setFortune('mage', 2);
  await store.applySpellExecution('Le Second Signe d’Amul', { actorId: 'mage', targetIds: ['mage'], roll: 15, attributeActive: false });
  const seen = [];
  for (let i = 0; i < 12; i++) {
    await store.nextTurn();
    assert.equal(resourcesOf(store, 'mage').fortune, store.getFortune('mage').balance, `tour ${i + 1}`);
    seen.push(store.getFortune('mage').temporary);
  }
  assert.equal(seen[0], 3); assert.equal(seen.at(-1), 0, 'expiré à la fin du Tour de l’auteur');
});

test('Destin temporaire — Troisième Signe d’Amul : composante temporaire du registre, expiration et consommation', async () => {
  const store = await combat(caster({ extensions: { v5: { hasMomentum: true, fate: 2, channelling: { type: 'winds', sl: 30 } } } }));
  await store.applySpellExecution('Le Troisième Signe d’Amul', { actorId: 'mage', targetIds: ['mage'], roll: 15, attributeActive: false });
  let fate = store.getFate('mage');
  assert.deepEqual([fate.permanent, fate.temporary, fate.balance], [2, 1, 3]);
  const v5 = person(store, 'mage').extensions.v5;
  assert.equal(v5.fate, 2, 'extensions.v5.fate reste le Destin permanent');
  for (const key of ['temporaryFate', 'basePermanentFate']) assert.equal(v5[key], undefined);
  assert.equal(person(store, 'mage').destin, undefined);
  assert.equal(store.consumeTemporaryFate('mage', 1).consumed, 1);
  fate = store.getFate('mage');
  assert.deepEqual([fate.permanent, fate.temporary, fate.balance], [2, 0, 2]);

  const reserve = person(store, 'mage').extensions;
  await store.updateParticipant('mage', { extensions: { ...reserve, v5: { ...reserve.v5, channelling: { type: 'winds', sl: 30 } } } }); // la réserve est consommée par chaque lancer
  await store.applySpellExecution('Le Troisième Signe d’Amul', { actorId: 'mage', targetIds: ['mage'], roll: 14, attributeActive: false });
  assert.equal(store.getFate('mage').temporary, 1);
  await store.expireSpellEffects('mage', { currentRound: 50 });
  assert.deepEqual([store.getFate('mage').temporary, store.getFate('mage').balance], [0, 2]);
});

test('Bouclier de Saphery — le seuil ne vit que dans la couche : rien d’orphelin à l’expiration', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 30 } } } }), wizard('ally'));
  await store.applySpellExecution('Bouclier de Saphery', { actorId: 'mage', targetIds: ['ally'], roll: 25, otherHighSpellsCount: 8 });
  assert.equal(person(store, 'ally').extensions.v5.ward, 1);
  assert.equal(person(store, 'ally').extensions.v5.sapheryWard, undefined, 'pas de copie à plat du seuil');
  await store.expireSpellEffects('ally', { currentRound: 99 });
  assert.equal(person(store, 'ally').extensions.v5.ward, undefined);
  assert.equal(person(store, 'ally').extensions.v5.sapheryWard, undefined);
});

test('Vision dans l’obscurité — durée du livre V5 (p. 243) : Bonus d’Initiative Rounds', () => {
  const contract = getSpellContract('Vision dans l’obscurité');
  assert.equal(contract.duration, '(Bonus d’Initiative) Rounds');
  assert.deepEqual(parseSpellDuration(contract.duration, { caster: { caracs: { I: 52, Int: 69, FM: 41 } } }), { kind: 'timed', unit: 'rounds', amount: 5 });
});
});

describe('Livraison 2A — clauses finales', () => {
/**
 * Derniers retours de la livraison 2a : boîte Fortune, Chance portée par un autre participant, API de consommation
 * en persistance, base d'armure, Mouvement (Chemin entre les Mondes, Chair de Pierre), Destin temporaire, affichage.
 */

const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 30 } } }, ...extra });
const world = (...people) => ({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
async function combat(...people) {
  const store = createStore(); await store.ready; await store.loadFromJSON(world(...people)); return store;
}
function memory() {
  let state = null;
  return { load: async () => state && structuredClone(state), saveAtomic: async ({ state: next }) => { state = structuredClone(next); return { ok: true }; } };
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const signe = (store, name = 'Le Second Signe d’Amul', roll = 15) => store.applySpellExecution(name, { actorId: 'mage', targetIds: ['mage'], roll, attributeActive: false });

test('Boîte Fortune — préremplit et édite le Permanent, le temporaire est seulement annoncé', async () => {
  const store = await combat(wizard());
  await store.setFortune('mage', 3);
  await signe(store);
  const fortune = store.getFortune('mage');
  assert.deepEqual([fortune.permanent, fortune.temporary, fortune.balance], [3, 3, 6]);
  const state = fortuneDialogState(fortune);
  assert.equal(state.amount, 3, 'valeur préremplie = permanent');
  assert.match(state.summary, /Solde courant : 6 \(dont 3 temporaires\)/);
  await store.setFortune('mage', state.amount); // valider sans changer
  assert.deepEqual([store.getFortune('mage').permanent, store.getFortune('mage').balance], [3, 6]);
  await store.expireSpellEffects('mage', { currentRound: 10 });
  assert.equal(store.getFortune('mage').balance, 3, 'après expiration : 3, pas 5');
  assert.equal(fortuneDialogState({ balance: null, permanent: null, temporary: 0 }).amount, '');
  assert.equal(fortuneDialogState({ balance: 3, permanent: 3, temporary: 0 }).summary, 'Solde courant : 3.');
});

test('Affichage — « N (dont T temporaire) » seulement quand T > 0', () => {
  assert.equal(formatV5Balance({ balance: 5, temporary: 0 }), '5');
  assert.equal(formatV5Balance({ balance: 5, temporary: 1 }), '5 (dont 1 temporaire)');
  assert.equal(formatV5Balance({ balance: 5, temporary: 3 }), '5 (dont 3 temporaires)');
  assert.equal(formatV5Balance({ balance: null, temporary: 0 }), '?');
});

const twin = (id, extra = {}) => ({ id, name: id, kind: 'PJ', hp: 10, maxHp: 10, zone: 'active', extensions: { ficheId: 'x', ...(extra.extensions || {}) }, ...extra, });
test('Chance temporaire — portée par un autre participant du même personnage : lue et consommée sur le porteur', () => {
  const a = twin('a'), b = twin('b', { extensions: { ficheId: 'x', v5: { spellEffects: [{ id: 'e', remainingTempFortune: 3 }] } } });
  const input = { localRevision: 1, reserve: [], persistentCharacters: [], combat: { participants: [a, b] }, log: [], diceLines: [],
    extensions: { v5: { characterResources: [{ characterId: 'fiche:x', fortune: 2, initializedFrom: 'mj' }] } } };
  assert.deepEqual([getV5Fortune(input, a).permanent, getV5Fortune(input, a).temporary, getV5Fortune(input, a).balance], [2, 3, 5]);
  const spent = structuredClone(a); spent.extensions.v5 = { resources: { fortune: 4 } };
  const out = commitV5Resources(input, [spent, b]);
  const after = getV5Fortune(out, out.combat.participants[0]);
  assert.deepEqual([after.permanent, after.temporary, after.balance], [2, 2, 4], 'la dépense est débitée sur le porteur');
  assert.equal(out.combat.participants[1].extensions.v5.spellEffects[0].remainingTempFortune, 2);
  // dépense au-delà du temporaire : temporaire à 0 puis permanent
  const more = structuredClone(a); more.extensions.v5 = { resources: { fortune: 1 } };
  const out2 = commitV5Resources(input, [more, b]);
  const after2 = getV5Fortune(out2, out2.combat.participants[0]);
  assert.deepEqual([after2.permanent, after2.temporary], [1, 0]);
});

test('Chance/Destin temporaires — l’API de consommation retourne le vrai compte en persistance', async () => {
  const persistence = memory(), store = createStore({ persistence }); await store.ready;
  await store.loadFromJSON(world(wizard('mage', { extensions: { v5: { hasMomentum: true, fate: 1, channelling: { type: 'winds', sl: 30 } } } })));
  await store.setFortune('mage', 2);
  await signe(store);
  const result = store.consumeTemporaryFortune('mage', 2);
  assert.equal(typeof result.then, 'function', 'promesse chaînée');
  assert.equal((await result).consumed, 2);
  assert.equal(store.getFortune('mage').temporary, 1);
  const ext = person(store, 'mage').extensions;
  await store.updateParticipant('mage', { extensions: { ...ext, v5: { ...ext.v5, channelling: { type: 'winds', sl: 30 } } } });
  await signe(store, 'Le Troisième Signe d’Amul', 14);
  assert.equal(store.getFate('mage').temporary, 1);
  assert.equal((await store.consumeTemporaryFate('mage', 1)).consumed, 1);
  assert.equal(store.getFate('mage').temporary, 0);
});

test('Base d’armure — armorLocations est la source : buff, Arcanes et expiration lisent la même base', async () => {
  const locs = { head: 3, body: 3, leftArm: 3, rightArm: 3, leftLeg: 3, rightLeg: 3 };
  const store = await combat(wizard('mage', { armorLocations: locs }));
  await store.applySpellExecution('Armure aethyrique', { actorId: 'mage', targetIds: ['mage'], roll: 25 });
  const buffed = person(store, 'mage');
  assert.equal(buffed.armor.body, 4, 'V5 p. 242 : base 3 + buff 1');
  assert.equal(locationProtection(buffed, { location: 'body' }).ap, 4);
  assert.equal(getArcaneWornArmor(buffed).body, 3, 'PA portés = 3, buff exclu');
  const preview = previewArcaneUnforgiving(wizard('mage'), buffed, { armorPoints: 1 }, { magicItemPresent: false, armorDamageLocations: ['body'] });
  assert.notEqual(preview.status, 'invalid-arcane-armor', preview.error);
  await store.expireSpellEffects('mage', { currentRound: 99 });
  assert.equal(person(store, 'mage').armor.body, 3, 'expiration : retour à 3, pas 0');
});

const high = (extra = {}) => wizard('mage', { ...extra, extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 30 } } } });
test('Mouvement — Chemin entre les Mondes lit le Mouvement connu, Chair de Pierre le réduit de moitié', async () => {
  const noMovement = high(); delete noMovement.caracs.M;
  const blocked = (await combat(noMovement)).previewSpellExecution('Chemin entre les Mondes', { actorId: 'mage', targetIds: ['mage'], roll: 5 });
  assert.equal(blocked.ready, false); assert.deepEqual(blocked.missing, ['movement'], 'jamais 4 par défaut');

  const sheet = high({ movement: 5 }); delete sheet.caracs.M;
  const store = await combat(sheet);
  await store.applySpellExecution('Chemin entre les Mondes', { actorId: 'mage', targetIds: ['mage'], roll: 5 });
  assert.equal(person(store, 'mage').caracs.M, 10, 'Mouvement de fiche 5 × 2');

  const stone = await combat(wizard('mage', { caracs: { ...wizard().caracs, M: 5 } }));
  await stone.applySpellExecution('Chair de Pierre', { actorId: 'mage', targetIds: ['mage'], roll: 25, targetTests:{mage:{unwilling:false}} }); // WoM p.87
  assert.equal(person(stone, 'mage').caracs.M, 2, '5 ÷ 2 arrondi à l’inférieur');
  const none = wizard(); delete none.caracs.M;
  assert.equal((await combat(none)).previewSpellExecution('Chair de Pierre', { actorId: 'mage', targetIds: ['mage'], roll: 25 }).ready, false);
});

test('Destin temporaire — dépensé en premier pour annuler un épuisement permanent', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, fate: 0, channelling: { type: 'winds', sl: 30 } } } }));
  await signe(store, 'Le Troisième Signe d’Amul', 14);
  const ext = person(store, 'mage').extensions;
  await store.updateParticipant('mage', { extensions: { ...ext, v5: { ...ext.v5, burnout: { active: true, permanent: true } } } });
  assert.deepEqual([store.getFate('mage').permanent, store.getFate('mage').temporary], [0, 1]);
  const recovery = store.previewBurnoutRecovery({ actorId: 'mage' });
  assert.equal(recovery.possible, true, recovery.reason);
  await store.applyBurnoutRecovery(recovery, { actorId: 'mage' });
  assert.deepEqual([store.getFate('mage').permanent, store.getFate('mage').temporary], [0, 0], 'le point temporaire est payé, le permanent reste 0');
  assert.equal(person(store, 'mage').extensions.v5.burnout, null);
});
});

describe('Livraison 2B — filtres, protections et arbitrages', () => {
/**
 * Livraison 2b du lot 3 : Protection typée et immunités (S-06), destinataire des états et des dégâts (S-07),
 * arbitrages D-13 (la Protection n'annule que les dégâts) et D-14 (Blessures directes d'attribut).
 */

const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [], actions:[fixtureBlade],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const cast = (store, name, extra = {}) => store.applySpellExecution(name, { actorId: 'mage', targetIds: ['mage'], roll: 25, ...declaredAnswers(['mage','enemy']), ...extra });
const hasState = (p, key) => (p.states || []).some(s => (s.key || s.name) === key);

/** Attaque d'arme réelle de `enemy` contre `mage` (jet 25 : touche ; jet de localisation inversé du jet). */
const MELEE_DEFENSE = { base: 40, roll: 85, v5: { kind: 'melee', choice: 'keep' } };
const swing = (store, { kind = 'melee', context = {}, qualities = [] } = {}) => store.previewResolution({
  actorId: 'enemy', targetId: 'mage', action: { type: 'attack', attr: kind === 'ranged' ? 'CT' : 'CC', base: 60, damageFormula: 'BF+4', qualities }, roll: 25,
  v5: { kind, choice: 'keep', context }, ...(kind === 'melee' ? { defense: MELEE_DEFENSE } : {})
});
const fighters = () => [wizard('mage'), wizard('enemy', { camp: 'ennemi', caracs: { CC: 40, CT: 40, F: 40, E: 30, Int: 30, FM: 30, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 } })];

test('Filtres : tri-état oui / non / à préciser, sans présumer une étiquette inconnue', () => {
  const dome = { any: ['magical', 'ranged'], all: ['external'] };
  assert.equal(matchFilter(dome, attackNature({ ranged: false })).match, 'no');
  assert.deepEqual(matchFilter(dome, attackNature({ ranged: true })), { match: 'unknown', unknown: ['external'] });
  assert.equal(matchFilter(dome, attackNature({ ranged: true, declared: { external: true } })).match, 'yes');
  assert.equal(matchFilter(dome, attackNature({ ranged: true, declared: { external: false } })).match, 'no');
  assert.equal(matchFilter(null, {}).match, 'yes');
});

test('Égide d’Aqshy : l’épée passe, le feu magique est bloqué, le feu non magique est sans effet', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Égide d’Aqshy');
  const v5 = person(store, 'mage').extensions.v5;
  assert.deepEqual(v5.wards.map(w => [w.threshold, w.filter]), [[7, { all: ['magical', 'fire'] }]]);
  const sword = swing(store);
  assert.ok(sword.damage.finalDamage > 0, 'une épée n’est pas bloquée par l’Égide');
  const struck = swing(store);
  await store.applyResolution(struck);
  assert.equal(person(store, 'mage').hp, 30 - struck.damage.finalDamage, 'les Blessures de l’épée sont bien retirées');
  assert.ok(!sword.unresolved.some(text => /d10|Protection/.test(text)), sword.unresolved.join(' | '));
  const torch = swing(store, { context: { attackNature: { fire: true } } });
  assert.equal(torch.damage.finalDamage, 0, 'feu non magique : immunité');
  assert.equal(torch.damage.magicProtection.immune, true);
  const magicFire = previewMagicProtection(person(store, 'mage'), 5, { nature: attackNature({ magical: true, fire: true }) });
  assert.equal(magicFire.ready, false);
  assert.match(magicFire.error, /d10/);
  assert.equal(previewMagicProtection(person(store, 'mage'), 5, { nature: attackNature({ magical: true, fire: true }), wardRoll: 7 }).amount, 0);
  assert.equal(previewMagicProtection(person(store, 'mage'), 5, { nature: attackNature({ magical: true, fire: false }) }).amount, 5, 'sort non feu : pas de Protection');
});

test('Égide d’Aqshy : les États Enflammé reçus sont ignorés', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Égide d’Aqshy');
  await store.applySpellEffects('mage', { spellId: 'brasier', duration: '2 Rounds', conditions: ['Enflammé'] });
  assert.ok(!hasState(person(store, 'mage'), 'enflamme'));
  await store.applySpellEffects('mage', { spellId: 'poison', duration: '2 Rounds', conditions: ['Sonné'] });
  assert.ok(hasState(person(store, 'mage'), 'sonne'), 'seul Enflammé est ignoré');
});

test('Dôme : seules les attaques magiques ou à distance venant de l’extérieur sont éprouvées', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Dôme');
  assert.deepEqual(person(store, 'mage').extensions.v5.wards[0].filter, { any: ['magical', 'ranged'], all: ['external'] });
  const sword = swing(store);
  assert.ok(sword.damage.finalDamage > 0);
  assert.ok(!sword.unresolved.some(text => /Protection|d10/.test(text)));
  const arrowUnknown = swing(store, { kind: 'ranged' });
  assert.ok(arrowUnknown.unresolved.some(text => /origine extérieure à la zone/.test(text)), arrowUnknown.unresolved.join(' | '));
  const inside = swing(store, { kind: 'ranged', context: { attackNature: { external: false } } });
  assert.ok(inside.damage.finalDamage > 0 && !inside.unresolved.some(text => /Protection/.test(text)));
  const outside = swing(store, { kind: 'ranged', context: { attackNature: { external: true } } });
  assert.ok(outside.unresolved.some(text => /d10/.test(text)));
  const blocked = swing(store, { kind: 'ranged', context: { attackNature: { external: true }, magicWardRoll: 6 } });
  assert.equal(blocked.damage.finalDamage, 0);
  const passed = swing(store, { kind: 'ranged', context: { attackNature: { external: true }, magicWardRoll: 5 } });
  assert.ok(passed.damage.finalDamage > 0);
});

test('Bouclier anti-flèches : détruit seulement les projectiles organiques entrant, sans jet ; l’épée passe', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Bouclier anti-flèches');
  const mage = person(store, 'mage');
  assert.deepEqual(mage.extensions.v5.wards.map(w => [w.threshold, w.filter]), [[1, { all: ['ranged', 'organicProjectile', 'external'] }]]);
  assert.equal(mage.extensions.v5.rangedOpponentPenaltySl, undefined, 'aucun malus aux tirs hors du texte');
  assert.ok(swing(store).damage.finalDamage > 0, 'épée');
  const wooden = swing(store, { kind: 'ranged', context: { attackNature: { organicProjectile: true, external: true } } });
  assert.equal(wooden.damage.finalDamage, 0);
  assert.equal(wooden.damage.magicProtection.automatic, true);
  const shot = swing(store, { kind: 'ranged', context: { attackNature: { organicProjectile: false } } });
  assert.ok(shot.damage.finalDamage > 0, 'balle ou couteau de lancer : inorganique');
  const unknown = swing(store, { kind: 'ranged' });
  assert.ok(unknown.unresolved.some(text => /projectile organique/.test(text)));
});

test('Protection générale et Bouclier de Saphery : sans filtre, ils éprouvent toutes les attaques', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Protection');
  assert.equal(person(store, 'mage').extensions.v5.wards[0].filter, null);
  assert.ok(swing(store).unresolved.some(text => /d10/.test(text)));
  assert.equal(getSpellContract('Bouclier de Saphery').effects.wardFilter, undefined);
  assert.equal(getSpellContract('Bouclier magique').effects.ward, undefined, 'Bouclier magique : +BFM en dissipation seulement');
});

test('Bouclier céruléen : +3 PA contre les armes en métal seulement, rappel de renvoi', async () => {
  const store = await combat(...fighters());
  const before = swing(store, { context: { attackNature: { metal: false } } }).damage.finalDamage;
  await cast(store, 'Bouclier céruléen');
  assert.equal(person(store, 'mage').extensions.v5.wards, undefined, 'plus de Protection 7+ générale');
  const unknown = swing(store);
  assert.ok(unknown.protection.manual.some(text => /arme en métal/.test(text)), unknown.protection.manual.join(' | '));
  const wood = swing(store, { context: { attackNature: { metal: false } } });
  assert.equal(wood.damage.finalDamage, before);
  const steel = swing(store, { context: { attackNature: { metal: true } } });
  assert.equal(steel.damage.finalDamage, Math.max(0, before - 3));
  assert.ok(steel.reminders.some(text => /6 Dégâts au bras/.test(text)));
  assert.ok(!wood.reminders.some(text => /6 Dégâts au bras/.test(text)));
});

test('Capuche Vengeresse et Chute des feuilles : réductions typées, Test de Calme demandé', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Capuche Vengeresse');
  const hood = person(store, 'mage').extensions.v5.damageReductions[0];
  assert.deepEqual([hood.amount, hood.filter, hood.calmTest], [4, { not: ['magical'] }, true]);
  const base = swing(store, { context: { reductionCalm: { success: false, sl: 0 } } }).damage.finalDamage;
  assert.ok(swing(store).unresolved.some(text => /Test de Calme/.test(text)));
  assert.equal(swing(store, { context: { reductionCalm: { success: true, sl: 2 } } }).damage.finalDamage, Math.max(0, base - 6));
  assert.equal(swing(store, { context: { reductionCalm: { success: true, sl: 2 }, attackNature: { magical: true } } }).damage.finalDamage, base, 'attaque magique : pas de réduction');

  const leaves = await combat(...fighters());
  await cast(leaves, 'Chute des feuilles');
  const layer = person(leaves, 'mage').extensions.v5.damageReductions[0];
  assert.deepEqual([layer.amount, layer.filter, layer.calmTest], [3, { any: ['blunt', 'fall', 'crush'] }, undefined]);
  const unknown = swing(leaves);
  assert.ok(unknown.unresolved.some(text => /arme contondante/.test(text)), unknown.unresolved.join(' | '));
  const blade = swing(leaves, { context: { attackNature: { blunt: false } } }).damage.finalDamage;
  assert.equal(swing(leaves, { context: { attackNature: { blunt: true } } }).damage.finalDamage, Math.max(0, blade - 3));
});

test('D-13 : une Protection réussie n’annule que les dégâts, les États du sort s’appliquent', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await store.applySpellEffects('enemy', { spellId: 'ward', duration: '3 Rounds', ward: 7 });
  const input = { actorId: 'mage', targetIds: ['enemy'], roll: 25, targetTests: { enemy: { wardRoll: 9 } }, attributeActive: false };
  const preview = store.previewSpellExecution('Grands Feux d’U’Zhul', input);
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.targetResults[0].magicProtection.wardSaved, true);
  assert.equal(preview.targetResults[0].woundsLost, 0);
  await store.applySpellExecution('Grands Feux d’U’Zhul', input);
  assert.equal(person(store, 'enemy').hp, 30);
  assert.ok(hasState(person(store, 'enemy'), 'enflamme'), 'l’état Enflammé du sort s’applique malgré la Protection');
});

test('Sort de feu contre l’Égide : le jet de Protection est demandé, le sort non feu passe', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await store.applySpellExecution('Égide d’Aqshy', { actorId: 'enemy', targetIds: ['enemy'], roll: 25 });
  const fire = store.previewSpellExecution('Grands Feux d’U’Zhul', { actorId: 'mage', targetIds: ['enemy'], roll: 25, attributeActive: false });
  assert.equal(fire.ready, false);
  assert.match(fire.error, /d10/);
  const saved = store.previewSpellExecution('Grands Feux d’U’Zhul', { actorId: 'mage', targetIds: ['enemy'], roll: 25, attributeActive: false, targetTests: { enemy: { wardRoll: 7 } } });
  assert.equal(saved.targetResults[0].woundsLost, 0);
  const cold = store.previewSpellExecution('Carreau', { actorId: 'mage', targetIds: ['enemy'], roll: 25, attributeActive: false });
  assert.equal(cold.ready, true, cold.error);
  assert.ok(cold.targetResults[0].woundsLost > 0, 'un projectile non feu n’est pas éprouvé par l’Égide');
});

test('Robe scintillante : le lanceur n’est jamais aveuglé ; l’ennemi engagé désigné l’est s’il échoue en Endurance', async () => {
  const people = [wizard('mage'), wizard('enemy', { camp: 'ennemi' }), wizard('bystander', { camp: 'ennemi' })];
  const store = await combat(...people);
  const none = store.previewSpellExecution('Robe scintillante', { actorId: 'mage', targetIds: ['mage'], roll: 25 });
  assert.equal(none.ready, true, none.error);
  assert.ok(!(none.targetResults[0].temporaryEffect.conditions || []).length);
  assert.ok(none.targetResults[0].actions.some(a => /aucun ennemi engagé/.test(a.summary)));
  const missingRoll = store.previewSpellExecution('Robe scintillante', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['enemy'] } });
  assert.equal(missingRoll.ready, false);
  assert.match(missingRoll.error, /Endurance/);
  await cast(store, 'Robe scintillante', { secondaryTargets: { engaged: ['enemy'] }, targetTests: { enemy: { roll: 80 } } });
  assert.ok(!hasState(person(store, 'mage'), 'aveugle'));
  assert.ok(hasState(person(store, 'enemy'), 'aveugle'));
  assert.ok(!hasState(person(store, 'bystander'), 'aveugle'), 'jamais déduit : seul le désigné est touché');
  await store.undo();
  await cast(store, 'Robe scintillante', { secondaryTargets: { engaged: ['enemy'] }, targetTests: { enemy: { roll: 10 } } });
  assert.ok(!hasState(person(store, 'enemy'), 'aveugle'), 'Endurance réussie');
});

test('Pas d’Ombre et Portail d’Ombre : Surpris pour les ennemis engagés désignés, jamais pour le lanceur', async () => {
  for (const name of ['Pas d’Ombre', 'Portail d’Ombre']) {
    const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }), wizard('far', { camp: 'ennemi' }));
    await cast(store, name, { secondaryTargets: { engaged: ['enemy'] } });
    assert.ok(!hasState(person(store, 'mage'), 'surpris'), name);
    assert.ok(hasState(person(store, 'enemy'), 'surpris'), name);
    assert.ok(!hasState(person(store, 'far'), 'surpris'), name);
  }
});

test('Épée enflammée de Rhuin : le porteur ne brûle pas, la créature touchée par la lame si', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await cast(store, 'Épée Enflammée de Rhuin');
  assert.ok(!hasState(person(store, 'mage'), 'enflamme'));
  const bonus = person(store, 'mage').extensions.v5.weaponBonuses[0];
  assert.deepEqual(bonus.hitConditions, ['Enflammé']);
  const hit = store.previewResolution({ actorId: 'mage', targetId: 'enemy', action: { id:'blade', type: 'attack', attr: 'CC', base: 60, damageFormula: 'BF+4', qualities: [] }, roll: 25, v5: { kind: 'melee', choice: 'keep' }, defense: MELEE_DEFENSE });
  assert.ok(hit.targetConditionApplication.some(row => row.name === 'Enflammé' && row.source.kind === 'magic-weapon'), JSON.stringify(hit.targetConditionApplication));
  await store.applyResolution(hit);
  assert.ok(hasState(person(store, 'enemy'), 'enflamme'), 'appliqué à la créature touchée');
  assert.ok(!hasState(person(store, 'mage'), 'enflamme'));
  assert.equal(person(store, 'enemy').states.filter(row => row.key === 'enflamme').length, 1, 'une seule occurrence');
});

test('Coruscation de Finreir : aucun projectile, Vol (Agilité) et 5 PA non cumulés avec l’armure', async () => {
  const contract = getSpellContract('Coruscation de Finreir');
  assert.equal(contract.effects.missile, undefined);
  const store = await combat(wizard('mage', { armor: { head: 3, body: 7, arms: 3, legs: 3 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 25 } } } }), wizard('enemy', { camp: 'ennemi' }));
  const preview = store.previewSpellExecution('Coruscation de Finreir', { actorId: 'mage', targetIds: ['mage'], roll: 25 });
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.targetResults[0].woundsLost, 0);
  await cast(store, 'Coruscation de Finreir');
  const mage = person(store, 'mage');
  assert.equal(mage.hp, 30, 'le lanceur ne perd rien');
  assert.ok(mage.traits.includes('Vol (Agilité)'));
  assert.deepEqual([mage.armor.head, mage.armor.body, mage.armor.leftArm, mage.armor.rightLeg], [5, 7, 5, 5], 'la plus haute valeur par localisation');
  const hit = swing(store);
  assert.equal(hit.protection.ap, mage.armor[hit.protection.location], 'l’arme lit la même valeur effective');
});

test('Lames Azurées : désignation sans coup au lancement (les coups viennent à chaque Tour), jamais le lanceur', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  const plain = store.previewSpellExecution('Lames Azurées', { actorId: 'mage', targetIds: ['mage'], roll: 25 });
  assert.equal(plain.ready, true, plain.error);
  assert.equal(plain.targetResults[0].woundsLost, 0);
  const designated = store.previewSpellExecution('Lames Azurées', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['enemy'] } });
  assert.equal(designated.ready, true, designated.error);
  assert.equal(designated.secondaryResults[0].recurring, 'opponent-turn');
  const self = store.previewSpellExecution('Lames Azurées', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['mage'] } });
  assert.equal(self.ready, false, 'le lanceur ne peut pas être désigné');
  await cast(store, 'Lames Azurées', { secondaryTargets: { engaged: ['enemy'] } });
  assert.equal(person(store, 'mage').hp, 30);
  assert.equal(person(store, 'enemy').hp, 30, 'aucun coup au lancement');
  assert.deepEqual(person(store, 'mage').extensions.v5.spellEffects.find(e => e.recurringHits).recurringHits, { formula: '8', hits: 3, targetIds: ['enemy'] });
});

test('Poussée : les créatures désignées tombent et subissent 1d10 ; pas le lanceur', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await cast(store, 'Poussée', { targetIds:['enemy'], damageRoll:9, domainFacts:{collisionDeclared:true} } /* V5 p. 245 : cibles dans la zone */);
  assert.equal(person(store, 'mage').hp, 30);
  assert.ok(!hasState(person(store, 'mage'), 'a-terre'));
  assert.equal(person(store, 'enemy').hp, 30 - (9 - 3));
  assert.ok(hasState(person(store, 'enemy'), 'a-terre'));
});

test('Esprit du Foyer : le lanceur subit 6 Dégâts moins son Bonus d’Endurance (clause selfHarm)', async () => {
  const store = await combat(wizard('mage'));
  assert.ok(getSpellContract('Esprit du Foyer').effects.selfHarm.clause);
  await cast(store, 'Esprit du Foyer');
  assert.equal(person(store, 'mage').hp, 30 - 3);
});

test('Attributs facultatifs : appliqués aux ennemis par défaut, jamais aux alliés sans choix explicite', async () => {
  const people = () => [wizard('mage'), wizard('ally', { hp: 10 }), wizard('enemy', { camp: 'ennemi' })];
  let store = await combat(...people());
  await store.applySpellExecution('Cautérisation', { actorId: 'mage', targetIds: ['ally'], roll: 25, enduranceRoll:25 });
  assert.ok(!hasState(person(store, 'ally'), 'enflamme'), 'Cautérisation n’enflamme pas l’allié');
  store = await combat(...people());
  await store.applySpellExecution('Cautérisation', { actorId: 'mage', targetIds: ['ally'], roll: 25, enduranceRoll:25, attributeTargets: { ally: true } });
  assert.ok(hasState(person(store, 'ally'), 'enflamme'), 'choix explicite');
  store = await combat(...people());
  await store.applySpellExecution('Lumière guérisseuse', { actorId: 'mage', targetIds: ['ally'], roll: 25, enduranceRoll:25 });
  assert.ok(!hasState(person(store, 'ally'), 'aveugle'), 'Lumière guérisseuse n’aveugle pas l’allié soigné');
  store = await combat(...people());
  await store.applySpellExecution('Cœurs Enflammés', { actorId: 'mage', targetIds: ['ally', 'enemy'], roll: 25 });
  assert.ok(!hasState(person(store, 'ally'), 'enflamme'), 'Cœurs Enflammés n’enflamme pas les alliés');
  // V5 p. 248 : Cœurs enflammés affecte uniquement les alliés.
  assert.ok(!hasState(person(store, 'enemy'), 'enflamme'), 'ennemi hors des destinataires du sort');
  store = await combat(...people());
  const off = store.previewSpellExecution('Cœurs Enflammés', { actorId: 'mage', targetIds: ['enemy'], roll: 25, attributeActive: false });
  assert.equal(off.attributeReceipts.length, 0, 'l’option globale reste honorée');
});

test('Garde-fou : aucun sort de cible « Vous » ne blesse ni n’afflige son lanceur sans clause selfHarm', () => {
  const caster = { id: 'probe-caster', name: 'Probe Caster', camp: 'pj', kind: 'PJ', hp: 15, maxHp: 15, fortune: 2, fate: 2,
    caracs: { CC: 50, CT: 50, F: 40, E: 40, I: 50, Ag: 50, Dex: 50, Int: 60, FM: 60, Soc: 50, M: 4 }, skills: [{ name: 'Langue (Magick)', total: 90 }],
    actions:[fixtureBlade],armor: { head: 2, body: 2, arms: 2, legs: 2 }, states: [], traits: [], extensions: { v5: { channelling: { sl: 4, wind: 'Aqshy' }, spellEffects: [] } } };
  const justified = [];
  const offenders = [];
  for (const contract of getAllSpellContracts()) {
    const effects = contract.effects || {};
    const selfTarget = /^vous$/i.test((contract.target || '').trim());
    const harmsData = Boolean(effects.missile || effects.damage || effects.casterSelfDamage || effects.type === 'magic-missile' || effects.type === 'damage'
      || (effects.conditions || []).some(name => NEGATIVE_CONDITIONS.has(name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase())));
    if (selfTarget && harmsData) (effects.selfHarm ? justified : offenders).push(contract.name);
    if (effects.casterSelfDamage) assert.ok(effects.selfHarm?.clause, `${contract.name} : casterSelfDamage sans clause selfHarm`);
    if (!selfTarget) continue;
    // WoM pp. 99, 137 : zone autour du lanceur, destinataires exclusifs hors lanceur.
    if(effects.excludeCaster || effects.targetRule?.enemiesOnly){const refused=previewSpellExecution(caster,contract,[caster],{...declaredAnswers([caster.id]),...(contract.isCatalogue && ['life','light','death','shadow'].includes(contract.domain)?declared5BAnswers([caster.id]):{}),sl:100,attributeActive:false});if(effects.excludeCaster)assert.equal(refused.ready,false);else {assert.equal(refused.ready,true);assert.ok(refused.targetResults.every(r=>r.actions.some(a=>a.kind==='excluded')));}continue;}
    const choice = getContractChoiceOptions(contract);
    const preview = previewSpellExecution(caster, contract, [caster], { ...declaredAnswers([caster.id]), ...(contract.isCatalogue && ['life','light','death','shadow'].includes(contract.domain)?declared5BAnswers([caster.id]):{}), chosenLore:contract.domain==='arcane'?'fire':undefined,
      sl: Math.max(6, (contract.cn || 0) + 2), totalCastingSl: (contract.cn || 0) + 6, attributeActive: false, fellowshipRoll: 20, enduranceRoll: 20,
      locationRoll: 34, beastKey: 'wolf', chosenStats: ['CC'], roll3d10: 15, direction: 'N', willpowerSuccess: true, distanceRoll: 10,
      ...(choice.length ? { mjChoice: choice[0] } : {}),
      ...(parseSpellDuration(contract.duration, { caster, target: caster }).kind === 'unknown' ? { mjDuration: { amount: 5, unit: 'minutes' } } : {})
    });
    assert.equal(preview.ready, true, `${contract.name} : ${preview.error}`);
    const harmedAtRuntime = (preview.targetResults || []).some(row => row.woundsLost > 0
      || (row.temporaryEffect?.conditions || []).some(name => NEGATIVE_CONDITIONS.has(name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase())));
    if (preview.casterSelfDamage || harmedAtRuntime) assert.ok(effects.selfHarm, `${contract.name} blesse ou afflige son lanceur sans clause`);
  }
  assert.deepEqual(offenders, [], `contrats de cible « Vous » qui blessent ou affligent leur lanceur sans clause : ${offenders.join(', ')}`);
  assert.deepEqual(justified, [], 'aucun contrat de cible « Vous » n’a besoin de selfHarm ; seul Esprit du Foyer (cible Spécial) en porte une');
});

test('Garde-fou d’exécution : un contrat « Vous » qui porterait des dégâts ou un état négatif ne touche pas le lanceur', () => {
  const contract = { ...structuredClone(getSpellContract('Carreau')), id: 'synthetic-self-harm', target: 'Vous', range: 'Vous', effects: { type: 'damage', damage: { formula: '8', raw: 8 }, conditions: ['Aveuglé', 'Hâte'], aoe: false } };
  const caster = { id: 'c', name: 'c', camp: 'pj', hp: 20, maxHp: 20, caracs: { FM: 50, E: 30, Int: 50, I: 40 }, states: [], extensions: { v5: {} } };
  const preview = previewSpellExecution(caster, contract, [caster], { ...declaredAnswers([caster.id]), ...(contract.isCatalogue && ['life','light','death','shadow'].includes(contract.domain)?declared5BAnswers([caster.id]):{}), chosenLore:contract.domain==='arcane'?'fire':undefined, roll: 25, sl: 8, attributeActive: false, locationRoll: 34 });
  assert.equal(preview.targetResults[0]?.woundsLost ?? 0, 0);
  assert.ok(!(preview.targetResults[0]?.temporaryEffect?.conditions || []).includes('Aveuglé'));
});
});

describe('Livraison 2B — vérification', () => {
/**
 * Livraison 2b du lot 3, retours de vérification : Protections filtrées sans blocage parasite (chute, écrasement, projectile
 * organique), nature de l'arme dans les protections défensives, Lumière aveuglante, Épée enflammée, Test d'Endurance par
 * compétence, Lames Azurées à chaque Tour de l'adversaire, étiquettes magiques et de feu déclarables.
 */

const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [], actions:[fixtureBlade],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const cast = (store, name, extra = {}) => store.applySpellExecution(name, { actorId: 'mage', targetIds: ['mage'], roll: 25, ...declaredAnswers(['mage','enemy']), ...extra });
const hasState = (p, key) => (p.states || []).some(s => (s.key || s.name) === key);
const MELEE_DEFENSE = { base: 40, roll: 85, v5: { kind: 'melee', choice: 'keep' } };
const swing = (store, { kind = 'melee', context = {}, qualities = [] } = {}) => store.previewResolution({
  actorId: 'enemy', targetId: 'mage', action: { type: 'attack', attr: kind === 'ranged' ? 'CT' : 'CC', base: 60, damageFormula: 'BF+4', qualities }, roll: 25,
  v5: { kind, choice: 'keep', context }, ...(kind === 'melee' ? { defense: MELEE_DEFENSE } : {}) });
const fighters = () => [wizard('mage'), wizard('enemy', { camp: 'ennemi', caracs: { CC: 40, CT: 40, F: 40, E: 30, Int: 30, FM: 30, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 } })];

test('P1 : une attaque d’arme ou un sort ordinaire n’est ni une chute ni un écrasement, déclarables sinon', () => {
  const weapon = attackNature({ ranged: false });
  assert.equal(weapon.fall, false);
  assert.equal(weapon.crush, false);
  assert.equal(attackNature({ ranged: false, declared: { fall: true } }).fall, true);
  const leaves = { any: ['blunt', 'fall', 'crush'] };
  assert.deepEqual(matchFilter(leaves, weapon), { match: 'unknown', unknown: ['blunt'] }, 'seule l’arme contondante est demandée');
  assert.equal(matchFilter(leaves, attackNature({ ranged: false, declared: { fall: true } })).match, 'yes');
  assert.equal(matchFilter(leaves, spellAttackNature(getSpellContract('Carreau'))).match, 'no', 'un sort n’est pas une arme contondante');
});

test('P1 : Chute des feuilles ne bloque pas toute attaque et ne présente aucun libellé brut', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Chute des feuilles');
  const unknown = swing(store);
  assert.deepEqual(unknown.unresolved.filter(text => /préciser/.test(text)).length, 1, unknown.unresolved.join(' | '));
  assert.ok(unknown.unresolved.every(text => !/\bfall\b|\bcrush\b|\?/.test(text)), unknown.unresolved.join(' | '));
  assert.ok(swing(store, { context: { attackNature: { blunt: false } } }).unresolved.every(text => !/Protection/.test(text)));
  assert.equal(natureTagLabel('fall'), 'chute');
  assert.equal(natureTagLabel('crush'), 'écrasement');
  assert.match(natureTagLabel('inconnu'), /condition/, 'libellé de repli en français');
});

test('P5 : le Bouclier anti-flèches ne bloque ni l’épée ni un sort, même sans réponse du MJ', async () => {
  const people = fighters();
  const store = await combat(...people);
  await cast(store, 'Bouclier anti-flèches');
  const mage = person(store, 'mage');
  assert.deepEqual(mage.extensions.v5.wards[0].filter, { all: ['ranged', 'organicProjectile', 'external'] });
  const sword = swing(store);
  assert.ok(sword.unresolved.every(text => !/projectile|origine/.test(text)), sword.unresolved.join(' | '));
  assert.ok(sword.damage.finalDamage > 0);
  const bolt = previewSpellExecution(person(store, 'enemy'), 'Carreau', [mage], { participants: store.listParticipants(), roll: 25, reserveSl: 8 });
  assert.ok(!/projectile organique|origine extérieure/.test(bolt.error || ''), bolt.error);
  assert.equal(spellAttackNature(getSpellContract('Carreau')).organicProjectile, false);
  assert.equal(attackNature({ ranged: true }).organicProjectile, undefined, 'un tir reste à préciser');
  assert.equal(attackNature({ ranged: false }).organicProjectile, false);
});

test('P7 : critique défensif et Riposte transmettent la nature de l’arme qui frappe', () => {
  const attacker = { id: 'a', name: 'Attaquant', hp: 20, caracs: { E: 30 }, states: [], armor: { head: 0, body: 2, arms: 0, legs: 0 },
    extensions: { v5: { conditionalAp: [{ ap: 3, filter: { all: ['metal'] } }] } } };
  const input = context => ({ actor: attacker, target: { id: 't', name: 'Défenseur', hp: 20, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [] },
    action: { id: 'sword', type: 'attack', base: 60, damage: 4 }, roll: 22, baseRevision: 2,
    defense: { base: 50, roll: 33, v5: { kind: 'melee', context }, qualities: [] }, criticalRolls: { location: 57, effect: 65 }, defenderCriticalRolls: { location: 4, effect: 20 } });
  const asked = previewResolution(input({}));
  assert.ok(asked.unresolved.some(text => /critique défensif.*arme en métal/.test(text)), asked.unresolved.join(' | '));
  const answered = previewResolution(input({ attackNature: { metal: false } }));
  assert.ok(answered.unresolved.every(text => !/critique défensif.*arme en métal/.test(text)), answered.unresolved.join(' | '));
});

test('Lumière aveuglante : les créatures dotées de la Magie des Arcanes (Lumière) y sont immunisées', async () => {
  const arcane = wizard('enemy', { camp: 'ennemi', talents: [{ id: 'talent-arcane-magic', status: 'resolved', rank: 1, specialization: 'Hysh' }] });
  const store = await combat(wizard('mage'), arcane, wizard('brute', { camp: 'ennemi' }));
  const preview = store.previewSpellExecution('Lumière aveuglante', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['enemy', 'brute'] } });
  assert.equal(preview.ready, true, preview.error);
  const rows = Object.fromEntries(preview.secondaryResults.map(r => [r.targetId, r]));
  assert.ok(rows.enemy.immune);
  assert.deepEqual(rows.enemy.conditions, []);
  assert.deepEqual(rows.brute.conditions, ['Aveuglé', 'Aveuglé', 'Aveuglé']);
  await store.applySpellExecution('Lumière aveuglante', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['enemy', 'brute'] } });
  assert.ok(!hasState(person(store, 'enemy'), 'aveugle'));
  assert.ok(hasState(person(store, 'brute'), 'aveugle'));
});

test('Épée enflammée : maladresse du porteur sans Magie des Arcanes (Feu) = Enflammé ; attaque magique', async () => {
  // A natural 99 on a combat attack is a fumble; provide its explicit d10 table roll.
  const strike = (store, actorId, roll = 99) => store.previewResolution({ actorId, targetId: 'enemy', action: { id:'blade', type: 'attack', attr: 'CC', base: 40, damageFormula: 'BF+4', qualities: [] }, roll,
    v5: { kind: 'melee', choice: 'keep', context: { fumbleRoll: 8 } }, defense: MELEE_DEFENSE });
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await cast(store, 'Épée Enflammée de Rhuin');
  const fumble = strike(store, 'mage');
  assert.ok(fumble.actorConditionApplication.some(row => row.name === 'Enflammé' && row.source.kind === 'magic-weapon'), JSON.stringify(fumble.actorConditionApplication));
  await store.applyResolution(fumble);
  assert.ok(hasState(person(store, 'mage'), 'enflamme'));
  const plainMiss = strike(store, 'mage', 70);
  assert.ok(!plainMiss.actorConditionApplication.some(row => row.name === 'Enflammé'), 'un simple échec ne brûle pas');
  const fire = await combat(wizard('mage', { talents: [{ id: 'talent-arcane-magic', status: 'resolved', rank: 1, specialization: 'Aqshy' }] }), wizard('enemy', { camp: 'ennemi' }));
  await cast(fire, 'Épée Enflammée de Rhuin');
  assert.ok(!strike(fire, 'mage').actorConditionApplication.some(row => row.name === 'Enflammé'), 'Magie des Arcanes (Feu) : exempté');
  const bonus = person(store, 'mage');
  assert.equal(weaponAttackNature({ actor: bonus, action: { id:'blade', type: 'attack', qualities: [] }, kind: 'melee' }).magical, true);
  assert.equal(weaponAttackNature({ actor: bonus, action: { id:'blade', type: 'attack', qualities: [] }, kind: 'melee' }).fire, true);
});

test('Robe scintillante : le Test d’Endurance utilise la compétence Endurance quand le personnage l’a', async () => {
  const skilled = wizard('enemy', { camp: 'ennemi', skills: [{ name: 'Endurance', total: 55 }] });
  const store = await combat(wizard('mage'), skilled);
  const roll = value => store.previewSpellExecution('Robe scintillante', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['enemy'] }, targetTests: { enemy: { roll: value } } });
  const passed = roll(50).secondaryResults[0].test;
  assert.deepEqual([passed.score, passed.passed], [55, true], 'compétence 55, pas la caractéristique E 30');
  assert.equal(roll(60).secondaryResults[0].test.passed, false);
  const noSkill = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  const plain = noSkill.previewSpellExecution('Robe scintillante', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['enemy'] }, targetTests: { enemy: { roll: 50 } } });
  assert.deepEqual([plain.secondaryResults[0].test.score, plain.secondaryResults[0].test.passed], [30, false], 'sans compétence : caractéristique E');
});

test('Lames Azurées : 3 coups de 8 à chaque Tour de l’adversaire désigné, jets de localisation demandés', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }), wizard('other', { camp: 'ennemi' }));
  await cast(store, 'Lames Azurées', { secondaryTargets: { engaged: ['other'] } });
  const state = JSON.parse(store.getFullJSON());
  const first = previewV5Turn(state);
  assert.equal(first.status, 'requires-input');
  assert.deepEqual(first.requests.map(r => [r.participantId, r.kind]), [['other', 'd100'], ['other', 'd100'], ['other', 'd100']]);
  assert.match(first.requests[0].label, /Lames Azurées.*Localisation du coup 1/);
  const inputs = { other: Object.fromEntries(first.requests.map((r, i) => [r.field, [22, 45, 77][i]])) };
  const second = previewV5Turn(state, { inputs });
  assert.equal(second.status, 'ready', JSON.stringify(second.requests));
  const struck = second.state.combat.participants.find(p => p.id === 'other');
  assert.equal(struck.hp, 30 - 3 * (8 - 3), '3 coups de 8 − BE 3, sans armure');
  assert.ok(second.state.log.some(row => /Lames Azurées/.test(row.text) && /Très Longues/.test(row.text)));
  // Un adversaire non désigné n'est jamais touché, et chaque nouveau Tour de l'adversaire redemande les coups.
  const next = previewV5Turn(second.state, {});
  assert.equal(next.status, 'ready', 'Tour de l’ennemi non désigné : aucune demande');
  assert.equal(next.state.combat.participants.find(p => p.id === 'enemy').hp, 30);
  const round2 = previewV5Turn(next.state, {});
  assert.equal(round2.status, 'ready', 'Tour du lanceur');
  const again = previewV5Turn(round2.state, {});
  assert.equal(again.status, 'requires-input', 'Round suivant, Tour de l’adversaire désigné : nouveaux coups à localiser');
  assert.equal(again.requests.length, 3);
});

test('Étiquettes magique et feu : déclarables seulement quand une Protection active en dépend', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Égide d’Aqshy');
  const aegis = person(store, 'mage');
  const melee = weaponAttackNature({ actor: person(store, 'enemy'), action: { id:'blade', type: 'attack', qualities: [] }, kind: 'melee' });
  assert.deepEqual(targetNatureTags(aegis, melee), ['fire'], 'le feu non magique peut être déclaré ; pas « magique » en contact');
  const ranged = weaponAttackNature({ actor: person(store, 'enemy'), action: { id:'blade', type: 'attack', qualities: [] }, kind: 'ranged' });
  assert.ok(targetNatureTags(aegis, ranged).includes('fire'));
  const plain = person(store, 'enemy');
  assert.deepEqual(targetNatureTags(plain, melee), [], 'aucune Protection : aucune question');
  // Un tir de feu sans qualité Enflammée est déclaré par le MJ : l'Égide le traite comme du feu non magique.
  const undeclared = swing(store, { kind: 'ranged', context: { attackNature: { external: true } } });
  const declared = swing(store, { kind: 'ranged', context: { attackNature: { fire: true } } });
  assert.ok(declared.damage.finalDamage < undeclared.damage.finalDamage || declared.damage.finalDamage === 0, 'le feu déclaré est neutralisé par l’Égide');
});

test('Dôme : aucune question d’origine pour une attaque de contact', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Dôme');
  const dome = person(store, 'mage');
  const melee = weaponAttackNature({ actor: person(store, 'enemy'), action: { id:'blade', type: 'attack', qualities: [] }, kind: 'melee' });
  assert.deepEqual(targetNatureTags(dome, melee), []);
  const ranged = weaponAttackNature({ actor: person(store, 'enemy'), action: { id:'blade', type: 'attack', qualities: [] }, kind: 'ranged' });
  assert.deepEqual(targetNatureTags(dome, ranged), ['external'], 'un tir est déjà éprouvé : seule l’origine reste à préciser');
});
});

describe('Livraison 2C — sorts à arbitrage', () => {
/**
 * Livraison 2c du lot 3 : arbitrages annoncés comme livrés mais non fonctionnels (phase 6, A-01 à A-07) et
 * Protections magiques rejouées sur les coups récurrents de Lames Azurées.
 */

const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 } } }, ...extra });
/** Lanceur de Haute Magie assez puissant pour payer les options de surpuissance (BI + BFM = 16). */
const archmage = (id = 'mage', extra = {}) => wizard(id, { caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 80, FM: 80, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 30 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const stateKeys = p => (p.states || []).map(s => s.key || s.name);
const bmax = (extra = {}) => ({ hp: 10, maxHp: 30, ...extra });

// ---------------------------------------------------------------------------------------------------------------------
// A-01 Main de Gloire
// ---------------------------------------------------------------------------------------------------------------------
const hog = (extra = {}) => ({ actorId: 'mage', targetIds: ['a1', 'a2'], sl: 12, chosenStats: ['F'], roll3d10: 17, ...extra });

test('A-01 Main de Gloire — le même 3d10 s’applique à tous les alliés ciblés, Bmax inchangé malgré l’Endurance', async () => {
  const store = await combat(archmage(), wizard('a1'), wizard('a2', { caracs: { CC: 30, CT: 30, F: 40, E: 35, Int: 30, FM: 30, Ag: 30, I: 30, Dex: 30, Soc: 30, M: 5 } }));
  await store.applySpellExecution('Main de Gloire', hog({ chosenStats: ['E'], roll3d10: 21 }));
  assert.equal(person(store, 'a1').caracs.E, 51);
  assert.equal(person(store, 'a2').caracs.E, 56);
  assert.equal(person(store, 'a1').maxHp, 30);
  assert.equal(person(store, 'a2').maxHp, 30);
});

test('A-01 Main de Gloire — palier +6 : quatre caractéristiques distinctes exigées (doublons, cinq choix ou M refusés)', async () => {
  const store = await combat(archmage(), wizard('a1'), wizard('a2'));
  const tier6 = chosenStats => store.previewSpellExecution('Main de Gloire', hog({ tier: 'overcast6', chosenStats, overcastChoices: { special: 6 }, burnoutRoll: 50 }));
  assert.equal(tier6(['CC', 'CC', 'F', 'E']).ready, false, 'trois caractéristiques distinctes seulement');
  assert.equal(tier6(['CC', 'F', 'E', 'Ag', 'I']).ready, false, 'cinq caractéristiques');
  assert.equal(tier6(['CC', 'F', 'E', 'M']).ready, false, 'M n’est pas une caractéristique à 3d10');
  assert.equal(tier6(['CC', 'F', 'E', 'Ag']).ready, true);
});

test('A-01 Main de Gloire — option +3 : retire les états Brisé des alliés ; sans l’option, la dépense de 3 DR est refusée', async () => {
  const brisé = { key: 'brise', name: 'Brisé', level: 1 };
  const store = await combat(archmage(), wizard('a1', { states: [brisé] }), wizard('a2', { states: [brisé, { key: 'extenue', name: 'Exténué', level: 1 }] }));
  const unpaid = store.previewSpellExecution('Main de Gloire', hog({ overcastChoices: { special: 3 } }));
  assert.equal(unpaid.ready, false, 'une dépense de 3 DR sans l’option correspondante est payée sans effet');
  await store.applySpellExecution('Main de Gloire', hog({ hogOptions: { removeBroken: true } }));
  assert.deepEqual(stateKeys(person(store, 'a1')), []);
  assert.deepEqual(stateKeys(person(store, 'a2')), ['extenue'], 'seul Brisé est retiré');
  assert.equal(person(store, 'a1').caracs.F, 47, 'le 3d10 reste appliqué');
});

test('A-01 Main de Gloire — option +8 : retire Brisé et Extenué, soigne 1d10 saisi, Immunité (Psychologie) le temps du sort', async () => {
  const states = [{ key: 'brise', name: 'Brisé', level: 2 }, { key: 'extenue', name: 'Exténué', level: 1 }];
  const store = await combat(archmage(), wizard('a1', bmax({ states })), wizard('a2', bmax()));
  const noDie = store.previewSpellExecution('Main de Gloire', hog({ hogOptions: { purify: true } }));
  assert.equal(noDie.ready, false);
  assert.ok(noDie.missing?.includes('healRoll'), 'le 1d10 de soin est une saisie explicite');
  await store.applySpellExecution('Main de Gloire', hog({ hogOptions: { purify: true }, healRoll: 7 }));
  const a1 = person(store, 'a1');
  assert.deepEqual(stateKeys(a1), []);
  assert.equal(a1.hp, 17);
  assert.equal(person(store, 'a2').hp, 17, 'même soin pour chaque allié');
  assert.ok(a1.traits.includes('Immunité (Psychologie)'));
  await store.expireSpellEffects('a1', { currentRound: 99 });
  assert.ok(!person(store, 'a1').traits.includes('Immunité (Psychologie)'));
  assert.equal(person(store, 'a1').maxHp, 30);
});

// ---------------------------------------------------------------------------------------------------------------------
// A-02 Faux de Shyish
// ---------------------------------------------------------------------------------------------------------------------
const zombieAttack = (store, { actorId = 'zombie', targetId = 'mage' } = {}) => store.previewResolution({ actorId, targetId,
  action: { type: 'attack', attr: 'CC', base: 60, damageFormula: 'BF+4' }, roll: 25, v5: { kind: 'melee', choice: 'keep' },
  defense: { base: 40, roll: 85, v5: { kind: 'melee', choice: 'keep' } } });
const withUndead = () => [wizard('mage'), wizard('zombie', { camp: 'ennemi', tags: ['Mort-vivant'] }), wizard('brigand', { camp: 'ennemi' })];

test('A-02 Faux de Shyish (v3) — drapeau porté par un effet de sort qui expire ; Mort-vivant engagé ne gagne pas d’Élan, garde Avantage et Élan déjà acquis', async () => {
  const noMomentum = id => wizard(id, { camp: 'ennemi', tags: ['Mort-vivant'], extensions: { v5: { hasMomentum: false } } });
  const store = await combat(wizard('mage'), noMomentum('zombie'), wizard('brigand', { camp: 'ennemi', extensions: { v5: { hasMomentum: false } } }));
  const gain = (id, targetId = 'mage') => zombieAttack(store, { actorId: id, targetId }).momentum.find(row => row.participantId === id)?.after;
  assert.equal(gain('zombie'), true, 'sans Faux : le Mort-vivant gagne l’Élan en gagnant l’opposition');
  await store.applySpellExecution('La Faux de Shyish', { actorId: 'mage', targetIds: ['mage'], sl: 12 });
  const mage = person(store, 'mage');
  const effect = mage.extensions.v5.spellEffects.find(e => e.spellName === 'La Faux de Shyish');
  assert.ok(effect, 'effet de sort créé');
  assert.equal(effect.expiresAtRound, 1 + 4, 'BFM Rounds');
  assert.equal(mage.extensions.v5.scytheOfShyishActive, undefined, 'plus de drapeau à plat jamais relu');
  assert.equal(gain('zombie'), false, 'le Mort-vivant engagé ne gagne pas d’Élan');
  assert.equal(gain('brigand'), true, 'un vivant gagne l’Élan');
  assert.equal(gain('mage', 'zombie'), true, 'le porteur gagne l’Élan');
  const defence = store.previewResolution({ actorId: 'mage', targetId: 'zombie', action: { type: 'attack', attr: 'CC', base: 60, damageFormula: 'BF+4' }, roll: 85, v5: { kind: 'melee', choice: 'keep' },
    defense: { base: 40, roll: 25, v5: { kind: 'melee', choice: 'keep' } } });
  assert.equal(defence.momentum.find(row => row.participantId === 'zombie').after, false, 'le Mort-vivant qui défend avec succès ne gagne pas non plus d’Élan');
  const armed = await combat(wizard('mage'), wizard('zombie', { camp: 'ennemi', tags: ['Mort-vivant'] }));
  await armed.applySpellExecution('La Faux de Shyish', { actorId: 'mage', targetIds: ['mage'], sl: 12 });
  const kept = zombieAttack(armed);
  assert.equal(kept.test.advantage.advantage.length, 1, 'l’Avantage lié à l’Élan déjà possédé n’est plus supprimé');
  assert.equal(person(armed, 'zombie').extensions.v5.hasMomentum, true, 'Élan déjà acquis conservé');
  await armed.expireSpellEffects('mage', { currentRound: 99 });
  assert.equal(zombieAttack(armed).momentum.find(row => row.participantId === 'zombie').after, true);
});

test('A-02 Faux de Shyish — hallebarde Magique BF + BFM + 4 conférée, retirée à l’expiration', async () => {
  const store = await combat(...withUndead());
  assert.deepEqual(magicGrantedActions(person(store, 'mage')), []);
  await store.applySpellExecution('La Faux de Shyish', { actorId: 'mage', targetIds: ['mage'], sl: 12 });
  const [scythe] = magicGrantedActions(person(store, 'mage'));
  assert.ok(scythe, 'arme conférée');
  assert.equal(scythe.type, 'attack');
  assert.equal(scythe.damageFormula, 'BF+8', 'BF du porteur + BFM (4) + 4');
  assert.ok(scythe.qualities.some(q => (q.id || q) === 'magique'), 'qualité Magique');
  const hit = store.previewResolution({ actorId: 'mage', targetId: 'brigand', action: scythe, roll: 25, v5: { kind: 'melee', choice: 'keep' }, defense: { base: 40, roll: 85, v5: { kind: 'melee', choice: 'keep' } } });
  assert.equal(hit.damage.weaponDamage, 3 + 4 + 4, 'dégâts de l’arme : BF 3 + BFM 4 + 4');
  assert.ok(hit.damage.activeQualities.some(q => q.id === 'magique'), 'arme Magique');
  await store.expireSpellEffects('mage', { currentRound: 99 });
  assert.deepEqual(magicGrantedActions(person(store, 'mage')), []);
});

// ---------------------------------------------------------------------------------------------------------------------
// A-04 Apothéose Verdoyante et Apothéose
// ---------------------------------------------------------------------------------------------------------------------
const verdant = (extra = {}) => ({ actorId: 'mage', sl: 10, ...extra });
const lifeMage = (id = 'mage') => wizard(id, { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 } } } });
const corpse = (id, extra = {}) => wizard(id, { hp: 0, maxHp: 30, extensions: { v5: { hasMomentum: true, dead: true } }, ...extra });

test('A-04 Apothéose Verdoyante — une cible vivante est refusée et jamais blessée (25/30 ne tombe plus à 16)', async () => {
  const store = await combat(lifeMage(), wizard('ally', { hp: 25 }));
  const opts = verdant({ targetIds: ['ally'], targetTests: { ally: { deathDelaySec: 10 } } });
  const preview = store.previewSpellExecution('Apothéose Verdoyante', opts);
  assert.equal(preview.ready, false);
  assert.match(preview.error, /vivant|morte?/i);
  await assert.rejects(async () => store.applySpellExecution('Apothéose Verdoyante', opts));
  assert.equal(person(store, 'ally').hp, 25);
});

test('A-04 Apothéose Verdoyante — cible morte : délai de mort saisi exigé, moins d’une minute, puis 1 B par DR final', async () => {
  const store = await combat(lifeMage(), corpse('dead'));
  const base = verdant({ targetIds: ['dead'] });
  const missing = store.previewSpellExecution('Apothéose Verdoyante', base);
  assert.equal(missing.ready, false);
  assert.ok(missing.missing?.includes('deathDelaySec'), 'délai non saisi : bloqué, pas de 0 par défaut');
  const late = store.previewSpellExecution('Apothéose Verdoyante', { ...base, targetTests: { dead: { deathDelaySec: 60 } } });
  assert.equal(late.ready, false, 'une minute révolue : trop tard');
  await store.applySpellExecution('Apothéose Verdoyante', { ...base, targetTests: { dead: { deathDelaySec: 45 } } });
  const revived = person(store, 'dead');
  assert.equal(revived.hp, 18, '10 DR + 8 de réserve');
  assert.equal(revived.extensions.v5.dead, false);
  assert.ok(revived.extensions.v5.corruptionExposures.length > 0);
});

test('A-04 Apothéose Verdoyante — cadavre décapité refusé ; fonctions pures : vivant ou sans délai non admissibles', () => {
  const alive = { id: 'v', name: 'Vivant', hp: 25, maxHp: 30, timeSinceDeathSec: 10 };
  const unknown = { id: 'u', name: 'Sans délai', hp: 0, maxHp: 30, dead: true };
  const ok = { id: 'o', name: 'Mort', hp: 0, maxHp: 30, dead: true, timeSinceDeathSec: 20 };
  const preview = previewVerdantApotheosis({ corpses: [alive, unknown, ok], castingSl: 4, reserveSl: 6 });
  assert.deepEqual(preview.results.map(r => r.admissible), [false, false, true]);
  const applied = applyVerdantApotheosis([alive, unknown, ok], preview).updatedCorpses;
  assert.equal(applied[0].hp, 25, 'le vivant n’est pas touché');
  assert.equal(applied[1].hp, 0);
  assert.equal(applied[2].hp, 10);
});

test('A-04 Apothéose (HEPG p. 86) — confère Peur (1) au lieu de retirer Peur et Terreur ; contrat régénéré', async () => {
  const contract = getSpellContract('Apothéose');
  assert.deepEqual(contract.effects.traits, ['Peur (1)']);
  assert.equal(contract.effects.removeConditions, undefined);
  assert.ok(contract.overcast.options.includes('special'));
  const store = await combat(archmage(), wizard('ally', bmax({ states: [{ key: 'peur', name: 'Peur', level: 1 }] })));
  await store.applySpellExecution('Apothéose', { actorId: 'mage', targetIds: ['ally'], sl: 10 });
  const ally = person(store, 'ally');
  assert.equal(ally.hp, 18, 'BFM 8 de soin');
  assert.ok(ally.traits.includes('Peur (1)'));
  assert.ok(stateKeys(ally).includes('peur'), 'l’état Peur subi n’est plus retiré');
});

test('A-04 Apothéose — options +3 (Blessures supplémentaires), +6 (Blessure Critique, test saisi), +10 (relever un mort)', async () => {
  const store = await combat(archmage(), wizard('ally', bmax({ maxHp: 60, states: [{ key: 'bras-brise', name: 'Bras brisé', level: 1, source: { kind: 'critical' } }] })), corpse('dead'));
  const mismatch = store.previewSpellExecution('Apothéose', { actorId: 'mage', targetIds: ['ally'], sl: 12, overcastChoices: { special: 3 } });
  assert.equal(mismatch.ready, false, '3 DR dépensés sans option choisie');
  await store.applySpellExecution('Apothéose', { actorId: 'mage', targetIds: ['ally'], sl: 14, apotheoseOptions: { extraHealSteps: 2 } });
  assert.equal(person(store, 'ally').hp, 10 + 8 * 3, 'BFM × (1 + 2 paliers de +3)');
  const noTest = store.previewSpellExecution('Apothéose', { actorId: 'mage', targetIds: ['ally'], sl: 12, apotheoseOptions: { criticalHeal: true } });
  assert.equal(noTest.ready, false);
  assert.ok(noTest.missing?.includes('criticalHealTest'));
  await store.applySpellExecution('Apothéose', { actorId: 'mage', targetIds: ['ally'], sl: 12, apotheoseOptions: { criticalHeal: true }, criticalHealTest: true });
  assert.deepEqual(stateKeys(person(store, 'ally')), [], 'Blessure Critique guérie');
  const living = store.previewSpellExecution('Apothéose', { actorId: 'mage', targetIds: ['ally'], sl: 16, apotheoseOptions: { raiseDead: true }, burnoutRoll: 50 });
  assert.equal(living.ready, false, 'relever un vivant : refusé');
  await store.applySpellExecution('Apothéose', { actorId: 'mage', targetIds: ['dead'], sl: 16, apotheoseOptions: { raiseDead: true }, burnoutRoll: 50 });
  const raised = person(store, 'dead');
  assert.equal(raised.hp, 30, 'toutes ses Blessures');
  await store.expireSpellEffects('dead', { currentRound: 999, advanceMinutes: 60 });
  const gone = person(store, 'dead');
  assert.equal(gone.hp, 0, 'meurt au terme des BFM minutes');
  assert.equal(gone.extensions.v5.cannotBeRevived, true);
});

// ---------------------------------------------------------------------------------------------------------------------
// A-05 Forme bestiale / Jade
// ---------------------------------------------------------------------------------------------------------------------
test('A-05 Forme bestiale — seuls M, F, E, Ag et Dex sont remplacés (Dex « – » absente) ; traits standard sauf Bestial et Craintif, ceux du lanceur conservés ; Blessures V5', () => {
  const caster = wizard('mage', { traits: ['Chevaucheur'] });
  const { participant } = applyBeastForm(caster, BEAST_PROFILES.wolf, { round: 1, durationMinutes: 30 });
  for (const key of ['CC', 'CT', 'I', 'Int', 'FM', 'Soc']) assert.equal(participant.caracs[key], caster.caracs[key], key + ' conservée');
  assert.deepEqual(['F', 'E', 'Ag', 'M'].map(k => participant.caracs[k]), [35, 30, 30, 9]);
  assert.equal(Object.hasOwn(participant.caracs, 'Dex'), false, 'Dex « – » : absente, jamais 0');
  assert.equal(participant.movement, 9);
  assert.deepEqual(participant.traits.sort(), ['Chevaucheur', 'Vision nocturne'].sort());
  assert.equal(participant.hp, 13, 'Loup (Taille Moyenne) : BF 3 + 2 × BE 3 + BFM 4 du lanceur (FM 45)');
  assert.equal(participant.maxHp, 13);
});

test('A-05 Forme bestiale — impossible de lancer, dissiper ou se focaliser sous forme animale ; Jade identique à Forme bestiale', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await store.applySpellExecution('Forme bestiale', { actorId: 'mage', targetIds: ['mage'], sl: 8, beastKey: 'boar' });
  assert.ok(person(store, 'mage').extensions.v5.beastForm);
  const cast = store.previewSpellExecution('Carreau', { actorId: 'mage', targetIds: ['enemy'], sl: 8, locationRoll: 50 });
  assert.equal(cast.ready, false);
  assert.match(cast.error, /forme (animale|bestiale)/i);
  const channel = store.previewChannelling({ actorId: 'mage', roll: 20, mode: 'channel', type: 'winds', lore: 'beasts' });
  assert.equal(channel.ready, false);
  assert.match(channel.error || channel.summary || '', /forme (animale|bestiale)/i);
  const dispel = store.previewDispelPersistent({ id: 'x', cn: 2, casterId: 'enemy' }, { dispellerId: 'mage', roll: 20 });
  assert.equal(dispel.allowed, false);
  assert.match(dispel.reason, /forme (animale|bestiale)/i);

  const base = getSpellContract('Forme bestiale'), jade = getSpellContract('Forme bestiale - Jade');
  for (const key of ['cn', 'range', 'target', 'duration', 'overcast', 'effects']) assert.deepEqual(jade[key], base[key], key);
  assert.deepEqual([jade.wind, jade.domain, jade.isJadeVariant], ['Ghyran', 'life', true]);
});

// ---------------------------------------------------------------------------------------------------------------------
// A-06 Transformation de Kadon
// ---------------------------------------------------------------------------------------------------------------------
const dragon = { name: 'Dragon', M: 6, hp: 60, caracs: { CC: 70, CT: 0, F: 90, E: 80, I: 40, Ag: 30, Dex: 0, Int: 20, FM: 30, Soc: 15 }, traits: ['Vol (9)', 'Taille (Énorme)', 'Bestial'] };
const kadon = (extra = {}) => ({ actorId: 'mage', targetIds: ['mage'], sl: 12, ...extra });
const kadonMage = () => wizard('mage', { caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 14 } } } });

test('A-06 Transformation de Kadon — le monstre choisi est appliqué (jamais un Loup), Int et FM conservées, BFM Rounds', async () => {
  const store = await combat(kadonMage());
  const noProfile = store.previewSpellExecution('Transformation de Kadon', kadon({ mjChoice: 'Dragon' }));
  assert.equal(noProfile.ready, false);
  assert.ok(noProfile.missing?.includes('monsterProfile'), 'pas de profil connu : le MJ le saisit');
  await store.applySpellExecution('Transformation de Kadon', kadon({ mjChoice: 'Dragon', monsterProfile: dragon }));
  const mage = person(store, 'mage');
  assert.equal(mage.caracs.F, 90);
  assert.equal(mage.caracs.CC, 70, 'toutes les autres caractéristiques sont celles du monstre');
  assert.equal(mage.caracs.Int, 52);
  assert.equal(mage.caracs.FM, 45);
  assert.equal(mage.hp, 60);
  assert.ok(mage.traits.includes('Vol (9)'), 'traits du monstre ajoutés');
  assert.equal(mage.extensions.v5.beastForm.name, 'Dragon');
  const marker = mage.extensions.v5.spellEffects.find(e => e.beastFormMarker);
  assert.equal(marker.durationRounds, 4, 'BFM Rounds, pas 40 minutes');
  assert.equal(mage.extensions.v5.beastForm.expiresAtRound, 1 + 4);
  const cast = store.previewSpellExecution('Carreau', { actorId: 'mage', targetIds: ['mage'], sl: 8, locationRoll: 50 });
  assert.equal(cast.ready, false, 'aucun sort sous cette forme');
  await store.expireSpellEffects('mage', { currentRound: 99 });
  const back = person(store, 'mage');
  assert.equal(back.caracs.F, 30);
  assert.equal(back.extensions.v5.beastForm, undefined);
});

// ---------------------------------------------------------------------------------------------------------------------
// A-07 Fléau des Démons
// ---------------------------------------------------------------------------------------------------------------------
const daemon = (id, E, extra = {}) => wizard(id, { camp: 'ennemi', hp: 20, maxHp: 20, tags: ['Démon'], caracs: { CC: 45, CT: 0, F: 45, E, Int: 30, FM: 40, Ag: 40, I: 40, Dex: 30, Soc: 15, M: 4 }, ...extra });

test('A-07 Fléau des Démons — Bmax divisées, restaurées en fin de rencontre par une action MJ annulable, rappel tant qu’elles le sont', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 } } } }), daemon('d1', 60), daemon('d2', 60, { hp: 6 }));
  assert.deepEqual(daemonbaneReductions(store.listParticipants()), []);
  await store.applySpellExecution('Fléau des Démons', { actorId: 'mage', targetIds: ['d1', 'd2'], sl: 12, overcastChoices: { targets: 1 } });
  assert.equal(person(store, 'd1').maxHp, 10);
  assert.equal(person(store, 'd1').hp, 10);
  const reductions = daemonbaneReductions(store.listParticipants());
  assert.deepEqual(reductions.map(r => [r.id, r.originalMaxHp, r.maxHp]), [['d1', 20, 10], ['d2', 20, 10]]);
  await store.restoreDaemonbaneMaxHp();
  assert.equal(person(store, 'd1').maxHp, 20);
  assert.equal(person(store, 'd1').hp, 10, 'les Blessures ne remontent pas');
  assert.deepEqual(daemonbaneReductions(store.listParticipants()), []);
  await store.undo();
  assert.equal(person(store, 'd1').maxHp, 10, 'restauration annulable');
});

// ---------------------------------------------------------------------------------------------------------------------
// Lames Azurées : Protections magiques de la cible rejouées sur les coups récurrents
// ---------------------------------------------------------------------------------------------------------------------
test('Lames Azurées — les Protections de la cible (d10 saisi par coup, réduction de dégâts) sont rejouées à chaque coup', async () => {
  const warded = wizard('other', { camp: 'ennemi', extensions: { v5: { hasMomentum: true, wards: [{ effectId: 'e', spellName: 'Dôme', threshold: 7, filter: null }], ward: 7 } } });
  const store = await combat(wizard('mage'), warded);
  await store.applySpellExecution('Lames Azurées', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['other'] } });
  const state = JSON.parse(store.getFullJSON());
  const first = previewV5Turn(state);
  const locations = Object.fromEntries(first.requests.filter(r => /Localisation/.test(r.label)).map((r, i) => [r.field, [22, 45, 77][i]]));
  const second = previewV5Turn(state, { inputs: { other: locations } });
  assert.equal(second.status, 'requires-input', 'les d10 de Protection sont demandés, pas devinés');
  const wardRequests = second.requests.filter(r => r.kind === 'd10');
  assert.equal(wardRequests.length, 3, 'un d10 par coup');
  const rolls = [7, 3, 9];
  const inputs = { other: { ...locations, ...Object.fromEntries(wardRequests.map((r, i) => [r.field, rolls[i]])) } };
  const done = previewV5Turn(state, { inputs });
  assert.equal(done.status, 'ready', JSON.stringify(done.requests));
  assert.equal(done.state.combat.participants.find(p => p.id === 'other').hp, 30 - (8 - 3), 'seul le coup au d10 de 3 passe, 8 − BE 3');
  const text = done.state.log.find(row => /Lames Azurées/.test(row.text)).text;
  assert.match(text, /Protection/);
});
});

describe('Intégration — commandes du Store', () => {
const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 60 }],
  states: [], talents: [], equipment: [], extensions: { v5: { channelling: { type: 'high', sl: 20 }, cadaiRunes: { deployed: 3, max: 5 } } }, ...extra });
const snapshot = people => ({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'mage', order: people.map(p => p.id), participants: people }, log: [], diceLines: [] });
async function combat(options = {}, extra = {}) {
  const store = createStore(options); await store.ready;
  await store.loadFromJSON({ ...snapshot([wizard(), wizard('enemy', { camp: 'ennemi' })]), ...extra });
  return store;
}
const person = (store, id = 'mage') => store.listParticipants().find(p => p.id === id);
const envelope = store => JSON.parse(store.getFullJSON());

test('U-04 — un refus de persistance du sort reste un échec, sans effet ni historique', async () => {
  let saved = null, refuse = false;
  const store = await combat({ persistence: { async load() { return saved; }, async saveAtomic({ state }) { if (refuse) return { ok: false, error: 'Écriture locale refusée' }; saved = structuredClone(state); return { ok: true }; } } });
  const before = envelope(store), input = { actorId: 'mage', targetIds: ['enemy'], roll: 25, operationId: 'failed-cast' };
  refuse = true;
  const result = await store.applySpellExecution('Apothéose', input);
  assert.equal(result.ok, false);
  assert.match(result.error, /refusée/);
  assert.equal(person(store).extensions.v5.channelling.sl, 20);
  assert.deepEqual(envelope(store).history, before.history);
  refuse = false;
  assert.ok(await store.applySpellExecution('Apothéose', input));
});

for (const kind of ['LoreAttribute', 'HandOfGlory', 'BeastForm', 'Daemonbane', 'VerdantApotheosis']) {
  test(`U-05 — ${kind} refuse un aperçu périmé sans mutation`, async () => {
    const store = await combat(), rev = store.getLocalRevision();
    const beast = Object.values(BEAST_PROFILES)[0];
    const previews = {
      LoreAttribute: () => store.previewLoreAttribute({ casterId: 'mage', targetIds: ['enemy'], lore: 'fire', chosenTargetIds: ['enemy'] }),
      HandOfGlory: () => store.previewHandOfGlory(['mage'], { casterId: 'mage', chosenStats: ['CC'], roll3d10: 15 }),
      BeastForm: () => store.previewBeastForm(beast, { casterId: 'mage' }),
      Daemonbane: () => store.previewDaemonbane('enemy', { casterId: 'mage' }),
      VerdantApotheosis: () => store.previewVerdantApotheosis({ casterId: 'mage', corpseIds: ['enemy'], finalSl: 10 })
    };
    const preview = { ...previews[kind](), baseRevision: rev };
    await store.executeCommand('test-edit', draft => ({ ...draft, combat: { ...draft.combat, participants: draft.combat.participants.map(p => p.id === 'mage' ? { ...p, hp: 29 } : p) } }));
    assert.notEqual(store.getLocalRevision(), rev);
    const before = envelope(store);
    const apply = {
      LoreAttribute: () => store.applyLoreAttribute(preview, { casterId: 'mage', targetIds: ['enemy'] }),
      HandOfGlory: () => store.applyHandOfGlory(['mage'], preview),
      BeastForm: () => store.applyBeastForm('mage', beast, { baseRevision: preview.baseRevision }),
      Daemonbane: () => store.applyDaemonbane('enemy', preview),
      VerdantApotheosis: () => store.applyVerdantApotheosis(preview)
    };
    await assert.rejects(async () => apply[kind](), /aperçu|modifié|changé|recalcul/i);
    assert.deepEqual(envelope(store).combat, before.combat);
    assert.deepEqual(envelope(store).history, before.history);
  });
}

test('U-01 — deux déploiements mis en file depuis la même révision ne déploient qu’une rune', async () => {
  let saved = null;
  const store = await combat({ persistence: { async load() { return saved; }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } } });
  const input = { actorId: 'mage', baseRevision: store.getLocalRevision(), roll: 25, conditionsConfirmed: true };
  const results = await Promise.allSettled([store.deployCadaiRune(input), store.deployCadaiRune(input)]);
  assert.deepEqual(results.map(r => r.status), ['fulfilled', 'rejected']);
  assert.equal(store.getCadaiRunes('mage').deployed, 4);
  await store.undo(); assert.equal(store.getCadaiRunes('mage').deployed, 3);
});

test('V-A — exécutions de Haute Magie accessibles par acteur, copies isolées, Corruption et Undo', async () => {
  const store = await combat();
  await store.applySpellExecution('Apothéose', { actorId: 'mage', targetIds: ['enemy'], roll: 25, operationId: 'high-integration' });
  const executions = store.getHighMagicExecutions('mage');
  assert.equal(executions.length, 1); assert.equal(executions[0].id, 'high-integration');
  assert.deepEqual(store.getHighMagicExecutions('enemy'), []);
  executions[0].rerolledCorruption.push('invented');
  assert.deepEqual(store.getHighMagicExecutions('mage')[0].rerolledCorruption, []);
  await store.rerollCorruptionWithCadai({ actorId: 'mage', castExecutionId: 'high-integration', corruptionId: 'exposure-1', accessible: true, firstRoll: 85, reroll: 25, baseRevision: store.getLocalRevision() });
  assert.equal(store.getCadaiRunes('mage').deployed, 2);
  await store.undo(); assert.equal(store.getCadaiRunes('mage').deployed, 3);
  assert.deepEqual(store.getHighMagicExecutions('mage')[0].rerolledCorruption, []);
});

for (const level of [0, -1, 0.5]) {
  test(`V-B — Regard maudit refuse le niveau ${level}, même si la source est effacée`, async () => {
    const store = await combat();
    await store.applyMiscast(store.previewMiscast({ actorId: 'mage', severity: 'MAJOR', roll: 38, secondaryRolls: { duration: 2 } }), { actorId: 'mage' });
    const actor = person(store), locked = actor.states.find(s => s.source?.miscastEffectId);
    assert.ok(locked);
    await assert.rejects(async () => store.updateParticipant('mage', { states: actor.states.map(s => s.id === locked.id ? { ...s, level, source: null } : s), extensions: {} }), /Regard|incident|niveau/i);
    assert.equal(person(store).states.find(s => s.id === locked.id).level, locked.level);
  });
}

test('V-C — nouvelle séance nettoie toutes les projections, scène suspendue reprise et Undo', async () => {
  const marked = id => wizard(id, { extensions: { v5: { corruptionPerFortuneSpent: 1, corruptionPoints: 7 } } });
  const store = await combat({}, { reserve: [marked('profile')], persistentCharacters: [marked('persistent')],
    suspendedScenes: [{ id: 'suspended', status: 'suspended', round: 1, order: ['old'], currentActorId: 'old', participants: [marked('old')] }] });
  await store.updateParticipant('mage', { extensions: { v5: { corruptionPerFortuneSpent: 1 } } });
  await store.startTalentSession();
  const env = envelope(store);
  for (const p of [...env.reserve, ...env.combat.participants, ...env.persistentCharacters, ...env.suspendedScenes[0].participants]) assert.equal(p.extensions?.v5?.corruptionPerFortuneSpent, undefined);
  assert.equal(env.persistentCharacters[0].extensions.v5.corruptionPoints, 7);
  await store.undo(); assert.equal(envelope(store).suspendedScenes[0].participants[0].extensions.v5.corruptionPerFortuneSpent, 1);
  await store.startTalentSession(); await store.resumeScene('suspended');
  assert.equal(person(store, 'old').extensions.v5.corruptionPerFortuneSpent, undefined);
});

test('U-06 — registres bornés au rechargement, après un sort, anti-doublon et Undo conservés', async () => {
  const ids = Array.from({ length: 200 }, (_, i) => 'operation-' + i);
  const store = await combat({}, { extensions: { v5: { appliedSpellExecutions: ids, highMagicExecutions: ids.map(id => ({ id, actorId: 'mage', spellId: 'x', rerolledCorruption: [] })) } } });
  assert.equal(envelope(store).extensions.v5.appliedSpellExecutions.length, 100);
  assert.equal(envelope(store).extensions.v5.highMagicExecutions.length, 50);
  const input = { actorId: 'mage', targetIds: ['enemy'], roll: 25, operationId: 'new-operation' };
  await store.applySpellExecution('Apothéose', input);
  assert.equal(envelope(store).extensions.v5.appliedSpellExecutions.length, 100);
  await assert.rejects(async () => store.applySpellExecution('Apothéose', input), /déjà|double/i);
  await store.undo(); assert.equal(envelope(store).extensions.v5.appliedSpellExecutions.includes('new-operation'), false);
  await store.applySpellExecution('Apothéose', input);
});

for (const kind of ['corruption', 'meditation', 'mind-over-body', 'adventure', 'reset-runes']) {
  test(`U-01 — action secondaire ${kind} refuse une révision périmée`, async () => {
    const store = await combat(), baseRevision = store.getLocalRevision();
    await store.setFortune('mage', 2);
    const actions = {
      corruption: () => store.rerollCorruptionWithCadai({ actorId: 'mage', baseRevision }),
      meditation: () => store.applyMagicMeditation({ actorId: 'mage', baseRevision }),
      'mind-over-body': () => store.activateMindOverBody('mage', { baseRevision }),
      adventure: () => store.startMagicAdventure({ baseRevision }),
      'reset-runes': () => store.deployCadaiRune({ actorId: 'mage', baseRevision, reset: true })
    };
    const before = envelope(store);
    await assert.rejects(async () => actions[kind](), /changé|recalcul/i);
    assert.deepEqual(envelope(store).combat, before.combat);
  });
}
test('U-01/U-05 — récupération refuse l’aperçu périmé, attribut courant reste applicable', async () => {
  const actor = wizard(); actor.extensions.v5.burnout = { active: true, permanent: false, days: 2 };
  const store = await combat({}, snapshot([actor, wizard('enemy')])); await store.setFortune('mage', 2);
  const preview = store.previewBurnoutRecovery({ actorId: 'mage' }); assert.equal(preview.possible, true);
  await store.setFortune('mage', 3);
  await assert.rejects(async () => store.applyBurnoutRecovery(preview, { actorId: 'mage' }), /changé|recalcul/i);
  assert.equal(store.getFortune('mage').balance, 3); assert.equal(person(store).extensions.v5.burnout.active, true);
  const lore = store.previewLoreAttribute({ casterId: 'mage', targetIds: ['enemy'], lore: 'fire' });
  await store.applyLoreAttribute(lore, { casterId: 'mage', targetIds: ['enemy'] });
  assert.ok(person(store, 'enemy').states.some(s => /Enflammé/.test(s.name)));
});
});

describe('Intégration — page des règles', () => {
test('U-09 — les arbitrages du 10 et 11 octobre sont consultables dans les règles MJ', () => {
  const magic = JSON.stringify(RULES.find(block => block.id === 'magie'));
  assert.doesNotMatch(magic, /raccordement.*prévu/);
  const text = normalizeSearchText(magic);
  for (const term of ['reels', 'bagarre', 'dex', '10 secondes', 'fin du tour de son auteur', 'chaque protection', 'sans cible', '0 dr', 'silence', 'coruscating arc', 'seconde vue', 'puissance totale', 'lanceur', 'enorme', 'nuee', 'kadon', 'par action du mj', 'elan']) assert.ok(text.includes(term), term);
});
test('U-10 — version HTML initiale alignée sur js/version.js', async () => {
  const html = await readFile(new URL('../../../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes(`Version ${APP_VERSION}</button>`));
});
});

describe('Intégration — assainissement', () => {
const hostile = () => ({ id: 'hostile', name: 'Hostile', kind: 'PJ', hp: 12, maxHp: 12, caracs: { FM: 50, Int: 60 },
  extensions: { custom: { keep: 'inconnu' }, v5: { channelling: { type: 'winds', sl: 1e100 }, cadaiRunes: { max: 1e100, deployed: 1e100 },
    baseCaracs: { FM: 1e100, Dex: '–', E: 'oops' }, magicAp: { body: 1e100, head: -30 }, ward: 'oops', fate: -100,
    spellEffects: [{ id: 'layer', spellId: 'spell', statModifiers: { FM: 1e100, E: -1e100, Ag: {}, Dex: '–' },
      testModifiers: { Focalisation: 'oops' }, ward: -1e100, remainingTempFate: 1e100, remainingTempFortune: -1 }],
    daemonbaneMaxHp: { originalMaxHp: -500 }, beastForm: { originalParticipant: { caracs: { FM: 1e100, Dex: '–' }, hp: -100, maxHp: 1e100 }, initialBeastHp: 1e100, remainingMinutes: -100 },
    defense: { wards: [{ threshold: 'oops' }, { threshold: -1e100 }], magicApFloor: { all: 1e100 } } } } });
async function load(subject) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [subject], persistentCharacters: [subject], combat: { participants: [subject], order: [subject.id] }, suspendedScenes: [{ id: 's', participants: [subject] }], log: [], diceLines: [] });
  return store;
}
test('U-07 — rechargement hostile : types et bornes sur chaque projection magique', async () => {
  const store = await load(hostile()), env = JSON.parse(store.getFullJSON());
  for (const p of [env.reserve[0], env.persistentCharacters[0], env.combat.participants[0], env.suspendedScenes[0].participants[0]]) {
    const v5 = p.extensions.v5;
    assert.equal(v5.channelling.sl, 10000); assert.equal(v5.cadaiRunes.max, 1000); assert.equal(v5.cadaiRunes.deployed, 1000);
    assert.equal(v5.baseCaracs.FM, 1000); assert.equal(v5.baseCaracs.Dex, '–'); assert.equal(v5.baseCaracs.E, undefined);
    assert.equal(v5.magicAp.body, 1000); assert.equal(v5.magicAp.head, 0); assert.equal(v5.ward, undefined);
    assert.equal(v5.fate, 0); assert.equal(v5.spellEffects[0].remainingTempFate, 1000); assert.equal(v5.spellEffects[0].remainingTempFortune, 0);
    assert.equal(v5.spellEffects[0].statModifiers.FM, 1000); assert.equal(v5.spellEffects[0].statModifiers.E, -1000); assert.equal(v5.spellEffects[0].statModifiers.Ag, undefined);
    assert.equal(v5.daemonbaneMaxHp.originalMaxHp, 0); assert.equal(v5.beastForm, undefined, 'Forme invalide rejetée (durée négative)');
    assert.equal(v5.defense.wards.length, 1); assert.equal(v5.defense.wards[0].threshold, -1000);
    assert.equal(p.extensions.custom.keep, 'inconnu');
  }
});
test('U-07 — valeurs valides et seuil automatique de Protection conservés après recharge', async () => {
  const p = hostile(); p.extensions.v5 = { channelling: { type: 'high', sl: 200 }, cadaiRunes: { max: 5, deployed: 3 },
    baseCaracs: { FM: 145, Dex: '–' }, magicAp: { body: 4 }, ward: -3, fate: 2,
    spellEffects: [{ id: 'valid', statModifiers: { FM: 20, E: -30 }, remainingTempFate: 2, remainingTempFortune: 0, ward: -3, durationMinutes: 120, custom: 'gardé' }] };
  const store = await load(p), v5 = JSON.parse(store.getFullJSON()).combat.participants[0].extensions.v5;
  assert.deepEqual(v5.channelling, p.extensions.v5.channelling);
  assert.deepEqual(v5.spellEffects, p.extensions.v5.spellEffects);
  assert.equal(v5.ward, -3); assert.equal(v5.baseCaracs.Dex, '–');
});
test('U-06/U-07 — publication cloud bornée sans modifier son entrée', () => {
  const ids = Array.from({ length: 300 }, (_, i) => String(i));
  const input = { schemaVersion: 3, reserve: [], combat: { participants: [hostile()] }, extensions: { v5: { appliedSpellExecutions: ids } } };
  const before = structuredClone(input), shared = sharedState(input);
  assert.equal(shared.extensions.v5.appliedSpellExecutions.length, 100);
  assert.equal(shared.combat.participants[0].extensions.v5.channelling.sl, 10000);
  assert.deepEqual(input, before);
});
test('U-07 — réserve historique, attaques de forme et bonus magiques récents bornés', async () => {
  const p = hostile();
  p.extensions.v5 = { magic: { reserve: { type: 'high', sl: 1e12 } }, burnout: { active: 'false', permanent: [] },
    weaponBonuses: [{ damage: 1e12, ap: -1e12 }], conditionalAp: [{ ap: 1e12 }],
    beastForm: { originalParticipant: { caracs: { FM: 50 }, hp: 10, maxHp: 20, M: 4, traits: [] }, initialBeastHp: 14, beastProfile: { F: 1e12, Dex: '–' }, attacks: [{ value: 1e12, damageBonus: 1e12, count: 1e12 }] } };
  const store = await load(p), v5 = JSON.parse(store.getFullJSON()).combat.participants[0].extensions.v5;
  assert.equal(v5.magic.reserve.sl, 10000);
  assert.equal(v5.burnout.active, undefined); assert.equal(v5.burnout.permanent, undefined);
  assert.equal(v5.weaponBonuses[0].damage, 1000); assert.equal(v5.weaponBonuses[0].ap, 0);
  assert.equal(v5.conditionalAp[0].ap, 1000);
  assert.equal(v5.beastForm.beastProfile.F, 1000); assert.equal(v5.beastForm.beastProfile.Dex, '–');
  assert.equal(v5.beastForm.attacks[0].value, 1000); assert.equal(v5.beastForm.attacks[0].damageBonus, 1000); assert.equal(v5.beastForm.attacks[0].count, 1000);
});
});

describe('Bénédiction de Lileath — cumul des couches', () => {
// H-05 (HEPG p. 83, D-06) : le cumul de Bénédiction de Lileath se lit sur le talent du lanceur, d'après la provenance des couches.
const talent = (id, rank = 1) => ({ id: 'talent-' + id, status: 'resolved', rank });
const person = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'mage' ? 'pj' : 'ennemi', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }],
  talents: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true } }, ...extra });
const lileath = rank => person('caster', { talents: [talent('lileath-s-blessing', rank)] });
const layer = (id, casterId, statModifiers, extra = {}) => ({ id, spellId: id, spellName: id, casterId, statModifiers, duration: '10 Rounds', ...extra });
const cast = (target, caster, def) => applySpellEffects(target, def, { round: 1, caster }).participant;

test('H-05 — lanceur rang 2, cible sans talent : trois sources de FM cumulées (50 → 90)', () => {
  let target = person('target'); const caster = lileath(2);
  for (const [id, fm] of [['a', 10], ['b', 20], ['c', 10]]) target = cast(target, caster, layer(id, 'caster', { FM: fm }));
  assert.equal(target.caracs.FM, 90, 'FM = 50 + 20 + 10 + 10 avec rang 2 (3 sources)');
});

test('H-05 — cas inverse : cible rang 2, lanceur sans talent : seul le meilleur bonus compte', () => {
  let target = person('target', { talents: [talent('lileath-s-blessing', 2)] }); const caster = person('caster');
  for (const [id, fm] of [['a', 10], ['b', 20]]) target = cast(target, caster, layer(id, 'caster', { FM: fm }));
  assert.equal(target.caracs.FM, 70);
});

test('H-05 — lanceurs de rangs différents : le rang d’un lanceur n’est pas attribué aux sorts d’un autre', () => {
  const rich = lileath(1), plain = person('plain');
  let target = person('target');
  target = cast(target, plain, layer('p20', 'plain', { FM: 20 }));
  target = cast(target, plain, layer('p15', 'plain', { FM: 15 }));
  assert.equal(target.caracs.FM, 70, 'lanceur sans rang : meilleur bonus seul');
  target = cast(target, rich, layer('r10', 'caster', { FM: 10 }));
  target = cast(target, rich, layer('r5', 'caster', { FM: 5 }));
  assert.equal(target.caracs.FM, 80, '20 (meilleur) + 10 (une source supplémentaire du lanceur de rang 1)');
  const after = expireSpellEffects(target, { effectId: 'p20' }).participant;
  assert.equal(after.caracs.FM, 75, 'à l’expiration : 15 (meilleur) + 10 (source supplémentaire du lanceur de rang 1)');
});

test('H-05 — PA, Tests et rebase suivent la même provenance', () => {
  let target = person('target'); const caster = lileath(1);
  for (const [id, ap, test] of [['a', 2, 2], ['b', 1, 1]]) target = cast(target, caster, { id, spellId: id, spellName: id, casterId: 'caster', apModifiers: { body: ap }, testModifiers: { Athlétisme: test }, duration: '10 Rounds' });
  assert.equal(target.extensions.v5.magicAp.body, 3);
  assert.equal(target.extensions.v5.testModifiers['Athlétisme'], 3);
  let plain = person('target');
  for (const [id, ap, test] of [['a', 2, 2], ['b', 1, 1]]) plain = cast(plain, person('caster'), { id, spellId: id, spellName: id, casterId: 'caster', apModifiers: { body: ap }, testModifiers: { Athlétisme: test }, duration: '10 Rounds' });
  assert.equal(plain.extensions.v5.magicAp.body, 2);
  const rebased = rebaseMagicLayers(target, { caracs: { FM: 60 } });
  assert.equal(rebased.extensions.v5.testModifiers['Athlétisme'], 3);
});

test('H-05 — Store : lanceur sans talent sur cible rang 2 ; lanceur rang 2 sur cible sans talent', async () => {
  const store = createStore(); await store.ready;
  const caster = lileath(2), plainCaster = person('mage');
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'mage', order: ['mage', 'caster', 'target', 'blessed'],
    participants: [plainCaster, caster, person('target'), person('blessed', { talents: [talent('lileath-s-blessing', 2)] })] }, log: [], diceLines: [] });
  for (const [id, fm] of [['a', 10], ['b', 20]]) {
    await store.applySpellEffects('target', layer(id, 'caster', { FM: fm }), { caster });
    await store.applySpellEffects('blessed', layer(id, 'mage', { FM: fm }), { caster: plainCaster });
  }
  const find = id => store.listParticipants().find(p => p.id === id);
  assert.equal(find('target').caracs.FM, 80);
  assert.equal(find('blessed').caracs.FM, 70);
});

test('H-05 — exécution réelle d’Écorce : le rang du lanceur est enregistré sur la couche, pas lu sur la cible', async () => {
  const store = createStore(); await store.ready;
  const mage = person('mage', { talents: [talent('lileath-s-blessing', 2)], extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 10 } } } });
  const blessed = person('blessed', { talents: [talent('lileath-s-blessing', 2)] });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'mage', order: ['mage', 'blessed', 'plain'],
    participants: [mage, blessed, person('plain')] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  const find = id => store.listParticipants().find(p => p.id === id);
  for (const id of ['blessed', 'plain']) await store.applySpellEffects(id, layer('old-' + id, 'someone', { E: 10 }), { caster: person('someone') });
  for (const id of ['blessed', 'plain']) {
    await store.applySpellExecution('Écorce', { actorId: 'mage', targetIds: [id], roll: 11, attributeActive: false, miscastRoll: 70 });
    await store.updateParticipant('mage', { extensions: { v5: { ...find('mage').extensions.v5, channelling: { type: 'winds', sl: 10 }, magicAttemptTurn: undefined } } });
  }
  const own = find('plain').extensions.v5.spellEffects.find(effect => effect.spellName === 'Écorce');
  assert.equal(own.casterId, 'mage'); assert.equal(own.casterLileathRank, 2);
  assert.equal(find('plain').caracs.E, 50, '30 + 20 : le sort d’un autre lanceur (rang 0) ne profite pas du rang de mage');
  assert.equal(find('blessed').caracs.E, 50, 'le talent de la cible ne change rien');
});
});

describe('Moteur des effets magiques communs', () => {
function createParticipant(id, name, overrides = {}) {
  return {
    id,
    name,
    caracs: { CC: 40, CT: 30, F: 35, E: 42, I: 35, Ag: 32, Dex: 30, Int: 54, FM: 52, Soc: 30, M: 4 },
    hp: 14,
    maxHp: 14,
    armor: { head: 1, body: 2, arms: 1, legs: 1 },
    states: [],
    traits: [],
    talents: [],
    equipment: [],
    fortune: 2,
    ...overrides
  };
}

// ============================================================================
// 1. MOTEUR DES EFFETS MAGIQUES COMMUNS (v5-magic-effects.js)
// ============================================================================

test('Effets V5 — Règle de non-cumul : meilleur bonus et pire malus par caractéristique', () => {
  const baseStats = { CC: 40, F: 30, E: 35 };

  const effects = [
    { statModifiers: { F: 10, CC: -10 } },
    { statModifiers: { F: 20, CC: -20 } }, // F: max(10, 20) = +20 ; CC: min(-10, -20) = -20
    { statModifiers: { F: -5, E: 15 } }    // F: min(-5) = -5 ; net F = +20 - 5 = +15 ; E: +15
  ];

  const effective = calculateEffectiveStats(baseStats, effects);

  assert.equal(effective.F, 45, 'F = 30 + 20 (meilleur bonus) - 5 (pire malus) = 45');
  assert.equal(effective.CC, 20, 'CC = 40 + 0 (pas de bonus) - 20 (pire malus) = 20');
  assert.equal(effective.E, 50, 'E = 35 + 15 = 50');
});

test('Effets V5 — Non-cumul : exception explicite stackable (Bénédiction de Lileath)', () => {
  const baseStats = { FM: 50 };

  const effects = [
    { statModifiers: { FM: 10 } },
    { statModifiers: { FM: 20 } }, // meilleur bonus normal = +20
    { statModifiers: { FM: 10 }, stackable: true, spellId: 'benediction-de-lileath' } // s'additionne
  ];

  const effective = calculateEffectiveStats(baseStats, effects);
  assert.equal(effective.FM, 80, 'FM = 50 + 20 (meilleur non-cumulable) + 10 (stackable) = 80');
});

test('Effets V5 — Application et Expiration sans restaurer un vieux snapshot ni guérir les PV', () => {
  const wizard = createParticipant('wiz-1', 'Elfe', { hp: 14, maxHp: 14 });

  // 1. Appliquer un sort conférant +20 F et +2 PA magiques
  const applied = applySpellEffects(wizard, {
    spellId: 'wyssan-might',
    spellName: 'Force Sauvage de Wyssan',
    duration: 3,
    statModifiers: { F: 20 },
    apModifiers: { all: 2 },
    ward: 7
  }, { round: 1 });

  assert.equal(applied.participant.caracs.F, 55, 'F passe de 35 à 55');
  assert.equal(applied.participant.armor.body, 4, 'PA corps passe de 2 à 4');
  assert.equal(applied.participant.extensions.v5.ward, 7, 'Protection 7+ active');

  // 2. Le personnage subit 8 points de dégâts pendant que le sort est actif
  applied.participant.hp = 6;

  // 3. Expiration du sort au round 4
  const expired = expireSpellEffects(applied.participant, { spellId: 'wyssan-might', currentRound: 4 });

  assert.equal(expired.participant.caracs.F, 35, 'F restaurée à 35');
  assert.equal(expired.participant.armor.body, 2, 'PA corps restaurés à 2');
  assert.equal(expired.participant.extensions.v5.ward, undefined, 'Protection retirée');
  assert.equal(expired.participant.hp, 6, 'PV restent à 6 : l’expiration ne restaure PAS les PV perdus !');
});

test('Effets V5 — Projectiles magiques : BFM + dégâts du sort, DR de lancer NON ajoutés, localisation inversée', () => {
  const caster = createParticipant('caster-1', 'Sorcier Flamboyant', {
    caracs: { FM: 55, Int: 50, E: 40 } // BFM = 5
  });

  const target = createParticipant('target-1', 'Guerrier Orque', {
    caracs: { E: 45 }, // BE = 4
    armor: { head: 2, body: 3, arms: 1, legs: 1 },
    hp: 18
  });

  // Sort : Flèche Écarlate (damage: 4)
  // Jet d'incantation = 32 -> Inversion = 23 -> Bras gauche (loc: ARM, ap: 1)
  // DR de lancer = 4 DR (ne doivent PAS s'ajouter aux dégâts !)
  const missile = resolveMagicMissile({
    caster,
    target,
    spell: { name: 'Flèche Écarlate', damage: 4 },
    roll: 32,
    castingSl: 4,
    overcastDamage: 0
  });

  assert.equal(missile.bfm, 5);
  assert.equal(missile.spellDamage, 4);
  assert.equal(missile.rawDamage, 9, 'Dégâts bruts = BFM (5) + Sort (4) = 9 (les 4 DR de lancer ne sont pas ajoutés)');
  assert.equal(missile.reversedRoll, 23);
  assert.equal(missile.locationKey, 'ARM');
  assert.equal(missile.be, 4);
  assert.equal(missile.ap, 1);
  assert.equal(missile.absorption, 5, 'Absorption = BE (4) + PA bras (1) = 5');
  assert.equal(missile.finalDamage, 4, 'Dégâts finaux = 9 - 5 = 4');
  assert.equal(missile.targetNewHp, 14, 'PV cible passent de 18 à 14');
});

test('Effets V5 — Formules explicites (8 + DR) : respectent leur propre formule sans second ajout de BFM', () => {
  const caster = createParticipant('caster-1', 'Sorcier', { caracs: { FM: 52 } }); // BFM = 5
  const target = createParticipant('target-1', 'Cible', { caracs: { E: 30 }, armor: { body: 1 }, hp: 12 }); // BE = 3, PA = 1 -> absorption = 4

  const res = resolveSpellDamage({
    caster,
    target,
    formula: '8 + DR',
    sl: 3,
    roll: 55 // loc: BODY
  });

  assert.equal(res.rawDamage, 11, 'Formule 8 + DR avec DR=3 donne 11, sans ajouter BFM 5');
  assert.equal(res.absorption, 4, 'Absorption BE (3) + PA (1) = 4');
  assert.equal(res.finalDamage, 7, 'Dégâts nets = 11 - 4 = 7');
});

test('Effets V5 — Sorts de contact : jet d’opposition de contact sans dégâts d’arme', () => {
  const caster = createParticipant('caster-1', 'Sorcier');
  const target = createParticipant('target-1', 'Ennemi');

  // Contact réussi : Lanceur fait 25 sous 50 (2 DR), Défenseur fait 42 sous 40 (-1 DR)
  const opposition = resolveTouchOpposition({
    caster,
    target,
    casterSkillScore: 50,
    casterRoll: 25,
    defenderSkillScore: 40,
    defenderRoll: 42
  });

  assert.equal(opposition.hit, true, 'Le contact réussit');
  assert.equal(opposition.reversedRoll, 52, 'Jet inversé 25 -> 52');
  assert.equal(opposition.locationKey, 'BODY');
});

test('Effets V5 — Soins magiques : dans la limite de Bmax et réduction d’états Hémorragique', () => {
  const target = createParticipant('target-1', 'Blessé', {
    hp: 5,
    maxHp: 12,
    states: [{ key: 'hemorragique', name: 'Hémorragique', level: 3 }]
  });

  const res = resolveSpellHealing({ target, amount: 5 });

  assert.equal(res.participant.hp, 10, 'PV passent de 5 à 10 (limite 12)');
  assert.equal(res.participant.states.find(s => s.key === 'hemorragique')?.level ?? 0, 0, 'Les 5 B soignées retirent les 3 Hémorragique');
});

// ============================================================================
// 2. LES 8 ATTRIBUTS DE DOMAINE V5 + HAUTE MAGIE (v5-magic-attributes.js)
// ============================================================================

test('Attributs V5 — Bêtes (Ghur) v3 p.245 : le lanceur gagne l’Élan, les ennemis vivants le perdent', () => {
  const caster = createParticipant('caster-1', 'Chaman', { caracs: { FM: 58 } });
  const preview = previewLoreAttribute({ lore: 'beasts', caster, spell: { cn: 6 } });

  assert.equal(preview.casterEffects.grantMomentum, true);
  assert.equal(preview.casterEffects.enemiesLoseMomentum, true);
  assert.equal(preview.casterEffects.radius, 6);
  assert.equal(preview.casterEffects.trait, undefined, 'plus de Peur (1)');
});

test('Attributs V5 — Mort (Shyish) : 1 état Exténué sur cible vivante (max 1)', () => {
  const caster = createParticipant('caster-1', 'Nécromancien');
  const livingTarget = createParticipant('target-1', 'Humain');
  const undeadTarget = createParticipant('target-2', 'Squelette', { isUndead: true });

  const preview = previewLoreAttribute({
    lore: 'death',
    caster,
    targets: [livingTarget, undeadTarget]
  });

  assert.ok(preview.targetEffects.has('target-1'), 'Cible vivante affectée');
  assert.equal(preview.targetEffects.get('target-1').addCondition.name, 'Exténué');
  assert.ok(!preview.targetEffects.has('target-2'), 'Mort-vivant non affecté par l’état Exténué de Mort');
});

test('Attributs V5 — Feu (Aqshy) : 1 état Enflammé sauf si Arcane Magic (Fire)', () => {
  const caster = createParticipant('caster-1', 'Pyromancien');
  const normalTarget = createParticipant('target-1', 'Guerrier');
  const fireWizard = createParticipant('target-2', 'Mage de Feu', {
    talents: [{ id:'talent-arcane-magic',status:'resolved',rank:1,specialization:'Aqshy' }]
  });

  const preview = previewLoreAttribute({
    lore: 'fire',
    caster,
    targets: [normalTarget, fireWizard]
  });

  assert.ok(preview.targetEffects.has('target-1'), 'Cible normale enflammée');
  assert.ok(!preview.targetEffects.has('target-2'), 'Mage de Feu immunisé à l’attribut de Feu');
});

test('Attributs V5 — Cieux (Azyr) : ignore PA de métal et +1 Point de Chance jusqu’au prochain Tour', () => {
  const caster = createParticipant('caster-1', 'Astramancien', { fortune: 2 });
  const preview = previewLoreAttribute({ lore: 'heavens', caster });

  assert.equal(preview.damageRules.ignoreMetalAp, true, 'Ignore PA métal');
  assert.equal(preview.casterEffects.gainFortune, 1, '+1 Fortune temporaire');
  assert.equal(preview.casterEffects.expiry, 'startOfNextTurn');
});

test('Attributs V5 — Vie (Ghyran) : retire Hémorragique/Exténué et BFM Blessures directes vs Morts-vivants', () => {
  const caster = createParticipant('caster-1', 'Druide Jade', { caracs: { FM: 54 } }); // BFM = 5
  const ally = createParticipant('ally-1', 'Allié', {
    states: [{ key: 'hemorragique', name: 'Hémorragique', level: 2 }, { key: 'extenue', name: 'Exténué', level: 1 }]
  });
  const zombie = createParticipant('zombie-1', 'Zombie', { isUndead: true });

  const preview = previewLoreAttribute({
    lore: 'life',
    caster,
    targets: [ally, zombie]
  });

  assert.deepEqual(preview.targetEffects.get('ally-1').removeConditions, ['hemorragique', 'extenue']);
  assert.equal(preview.damageRules.extraDirectWoundsPerTarget.get('zombie-1'), 5, 'Mort-vivant subit BFM (5) Blessures directes');
});

test('Attributs V5 — Lumière (Hysh) : Aveuglé (sauf Arcane Light) et BI Blessures directes vs Démons/Morts-vivants', () => {
  const caster = createParticipant('caster-1', 'Hiérophante', { caracs: { Int: 62 } }); // BI = 6
  const daemon = createParticipant('daemon-1', 'Démon Mineur', { isDaemon: true });

  const preview = previewLoreAttribute({
    lore: 'light',
    caster,
    targets: [daemon]
  });

  assert.equal(preview.targetEffects.get('daemon-1').addCondition.name, 'Aveuglé');
  assert.equal(preview.damageRules.extraDirectWoundsPerTarget.get('daemon-1'), 6, 'Démon subit BI (6) Blessures directes');
});

test('Attributs V5 — Métal (Chamon) : ignore les PA de métal et les ajoute aux dégâts (p. 252), plus de +BE', () => {
  const caster = createParticipant('caster-1', 'Alchimiste');
  const knight = createParticipant('knight-1', 'Chevalier en plates', {
    caracs: { E: 45 }, // BE = 4
    equipment: [{ kind: 'armour', name: 'Armure de plates', layer: 'rigid', ap: 3, locations: ['body'] }]
  });

  const preview = previewLoreAttribute({
    lore: 'metal',
    caster,
    targets: [knight]
  });

  assert.equal(preview.damageRules.ignoreMetalAp, true);
  assert.equal(preview.damageRules.metalDamageBonus, true, 'les PA métalliques de la localisation touchée s’ajoutent');
  assert.equal(preview.damageRules.extraDamagePerTarget.has('knight-1'), false, 'aucun bonus de BE');
});

test('Attributs V5 — Ombres (Ulgu) : sort de protection confère +2 DR en Discrétion', () => {
  const caster = createParticipant('caster-1', 'Illusionniste');
  const preview = previewLoreAttribute({
    lore: 'shadow',
    caster,
    spell: { name: 'Manteau d’Ombre', isProtection: true, duration: 'FM Rounds' }
  });

  assert.equal(preview.casterEffects.testModifiers[0].sl, 2);
  assert.equal(preview.casterEffects.testModifiers[0].skill, 'Discrétion');
});

test('Attributs V5 — Haute Magie (Qhaysh) : choix d’un attribut parmi les 8 Domaines', () => {
  const caster = createParticipant('teclis', 'Haut Mage');
  const knight = createParticipant('knight-1', 'Chevalier', {
    caracs: { E: 40 },
    hasMetalArmor: true
  });

  const preview = previewLoreAttribute({
    lore: 'high',
    chosenLore: 'metal',
    caster,
    targets: [knight]
  });

  assert.equal(preview.lore, 'metal', 'Attribut Métal sélectionné via Haute Magie');
  assert.equal(preview.damageRules.ignoreMetalAp, true);
  assert.equal(preview.damageRules.metalDamageBonus, true);
});

// ============================================================================
// 3. ARBITRAGES DE SORTS ET CAS PARTICULIERS (v5-magic-arbitrations.js)
// ============================================================================

test('Arbitrages V5 — Forme bestiale (et Jade) : remplacement profil, conservation des dégâts et critiques au retour', () => {
  const caster = createParticipant('druid-1', 'Druide', {
    caracs: { CC: 30, F: 30, E: 40, FM: 36, M: 4 }, // E = 40 -> durée 40 min
    hp: 12,
    maxHp: 12
  });

  const boar = BEAST_PROFILES.boar; // Sanglier (p. 325) : M 7, F 35, E 40, Taille Moyenne ; Blessures 3 + 2 × 4 + BFM 3 = 14

  // 1. Transformation en Sanglier (Forme bestiale Jade)
  const transformed = applyBeastForm(caster, boar, { isJade: true });
  assert.equal(transformed.participant.caracs.F, 35);
  assert.equal(transformed.participant.hp, 14);
  assert.equal(transformed.preview.wind, 'Ghyran');
  assert.equal(transformed.preview.lore, 'life');
  assert.equal(transformed.preview.durationMinutes, 40);

  // 2. Le Sanglier subit 6 Blessures et 1 Blessure Critique (ex: Griffe arrachée)
  transformed.participant.hp = 8;
  transformed.participant.extensions.v5.beastForm.criticalWoundsSuffered.push({ name: 'Griffe arrachée', severity: 2 });

  // 3. Retour à la forme normale
  const reverted = revertBeastForm(transformed.participant);

  assert.equal(reverted.participant.caracs.F, 30, 'Force normale restaurée');
  assert.equal(reverted.participant.hp, 6, 'PV normaux = 12 - 6 dégâts subis sous forme de sanglier = 6');
  assert.equal(reverted.woundsCarriedOver, 6);
  assert.equal(reverted.participant.criticals.length, 1, 'Le critique subi sous forme de sanglier est reporté');
  assert.equal(reverted.participant.criticals[0].name, 'Griffe arrachée');
});

test('Arbitrages V5 — Apothéose Verdoyante : 1 B par DR final (test + réserve avant surpuissance), plafonné à Bmax, exclusions', () => {
  const corpses = [
    createParticipant('c1', 'Soldat Fauché', { maxHp: 12, hp: 0, timeSinceDeathSec: 30, decapitated: false }),
    createParticipant('c2', 'Héros Tué', { maxHp: 20, hp: 0, timeSinceDeathSec: 45, decapitated: false }),
    createParticipant('c3', 'Décapité', { maxHp: 14, hp: 0, timeSinceDeathSec: 10, decapitated: true }),
    createParticipant('c4', 'Mort Ancien', { maxHp: 12, hp: 0, timeSinceDeathSec: 120, decapitated: false })
  ];

  // Incantation : Test réussi à 3 DR + 15 DR de réserve = 18 DR finaux (avant 5 DR dépensés en surpuissance)
  const preview = previewVerdantApotheosis({
    corpses,
    castingSl: 3,
    reserveSl: 15,
    overcastSpent: 5
  });

  assert.equal(preview.finalSl, 18, 'DR final = 3 + 15 = 18 (surpuissance non retranchée)');
  assert.equal(preview.admissibleCount, 2);
  assert.equal(preview.rejectedCount, 2);

  const applied = applyVerdantApotheosis(corpses, preview);
  const updated = applied.updatedCorpses;

  // C1 : Bmax 12 < 18 -> revient avec 12 B
  const c1 = updated.find(c => c.id === 'c1');
  assert.equal(c1.hp, 12, 'Plafonné à Bmax 12');
  assert.equal(c1.isDead, false);
  assert.equal(c1.extensions.v5.needsCorruptionTest, true);

  // C2 : Bmax 20 > 18 -> revient avec 18 B
  const c2 = updated.find(c => c.id === 'c2');
  assert.equal(c2.hp, 18, 'Revient avec 18 Blessures');
  assert.equal(c2.isDead, false);

  // C3 décapité -> reste mort
  const c3 = updated.find(c => c.id === 'c3');
  assert.equal(c3.hp, 0);

  // C4 mort depuis > 1 min -> reste mort
  const c4 = updated.find(c => c.id === 'c4');
  assert.equal(c4.hp, 0);
});

test('Arbitrages V5 — Fléau des Démons : E <= Int, Int < E < 2*Int, et E >= 2*Int', () => {
  const caster = createParticipant('wiz', 'Mage', { caracs: { Int: 40 } });

  // Cas 1 : E = 35 <= 40 -> Bannissement
  const demonWeak = createParticipant('d1', 'Démon Faible', { caracs: { E: 35 }, maxHp: 16 });
  const p1 = previewDaemonbane({ caster, target: demonWeak });
  assert.equal(p1.effect, 'banished');
  const a1 = applyDaemonbane(demonWeak, p1);
  assert.equal(a1.target.banished, true);
  assert.equal(a1.target.hp, 0);

  // Cas 1 bis : E = 40 (E exactement égal à Int) -> Bannissement
  const demonEqual = createParticipant('de', 'Démon Égal', { caracs: { E: 40 }, maxHp: 16 });
  const pe = previewDaemonbane({ caster, target: demonEqual });
  assert.equal(pe.effect, 'banished', 'E = Int entraîne le bannissement');

  // Cas 2 : 40 < E (60) < 80 (2*Int) -> Bmax divisées par deux
  const demonMid = createParticipant('d2', 'Démon Majeur Moyen', { caracs: { E: 60 }, maxHp: 20, hp: 20 });
  const p2 = previewDaemonbane({ caster, target: demonMid });
  assert.equal(p2.effect, 'halved-max-hp');
  assert.equal(p2.newMaxHp, 10);
  const a2 = applyDaemonbane(demonMid, p2);
  assert.equal(a2.target.maxHp, 10);
  assert.equal(a2.target.hp, 10);

  // Cas 3 : E = 80 (E exactement égal à 2*Int) -> Aucun effet principal
  const demonExactDouble = createParticipant('d3', 'Grand Démon Seuil', { caracs: { E: 80 }, maxHp: 30 });
  const p3 = previewDaemonbane({ caster, target: demonExactDouble });
  assert.equal(p3.effect, 'no-effect');

  // Cas 3 bis : E = 90 (> 2*Int) -> Aucun effet principal
  const demonHigh = createParticipant('d4', 'Grand Démon', { caracs: { E: 90 }, maxHp: 30 });
  const p4 = previewDaemonbane({ caster, target: demonHigh });
  assert.equal(p4.effect, 'no-effect');
});

test('Arbitrages V5 — Main de Gloire (+6 DR) : 4 caractéristiques, 3d10 partagé, M +2, Bmax inchangé', () => {
  const ally1 = createParticipant('a1', 'Allié 1', { caracs: { CC: 40, CT: 30, F: 35, E: 30, M: 4 }, maxHp: 12 });
  const ally2 = createParticipant('a2', 'Allié 2', { caracs: { CC: 35, CT: 40, F: 40, E: 35, M: 4 }, maxHp: 14 });

  // 4 caractéristiques choisies : CC, F, E, Ag
  // Jet 3d10 partagé = 18
  const preview = previewHandOfGlory({
    targets: [ally1, ally2],
    chosenStats: ['CC', 'F', 'E', 'Ag'],
    roll3d10: 18
  });

  assert.equal(preview.roll3d10, 18);
  assert.equal(preview.statModifiers.CC, 18);
  assert.equal(preview.statModifiers.F, 18);
  assert.equal(preview.statModifiers.E, 18);
  assert.equal(preview.statModifiers.M, 2);

  const applied = applyHandOfGlory([ally1, ally2], preview);
  const res1 = applied.updatedTargets[0];
  const res2 = applied.updatedTargets[1];

  assert.equal(res1.caracs.CC, 58);
  assert.equal(res1.caracs.E, 48);
  assert.equal(res1.caracs.M, 6);
  assert.equal(res1.maxHp, 12, 'Bmax reste STRICTEMENT inchangé à 12 malgré Endurance +18');

  assert.equal(res2.caracs.CC, 53);
  assert.equal(res2.caracs.E, 53);
  assert.equal(res2.caracs.M, 6);
  assert.equal(res2.maxHp, 14, 'Bmax reste STRICTEMENT inchangé à 14');
});

test('Arbitrages V5 — Bouclier de Saphery : pas de plancher, seuil <= 1 réussit automatiquement', () => {
  // 0 autre sort : Protection 9+
  const w0 = calculateSapheryWard(0);
  assert.equal(w0.threshold, 9);
  assert.equal(w0.automaticSuccess, false);
  assert.equal(testSapheryWard(8, w0).protected, false);
  assert.equal(testSapheryWard(9, w0).protected, true);

  // 7 autres sorts : Protection 2+
  const w7 = calculateSapheryWard(7);
  assert.equal(w7.threshold, 2);
  assert.equal(w7.automaticSuccess, false);

  // 8 autres sorts : seuil 1+ -> réussite automatique
  const w8 = calculateSapheryWard(8);
  assert.equal(w8.threshold, 1);
  assert.equal(w8.automaticSuccess, true);
  assert.equal(testSapheryWard(1, w8).protected, true, 'Réussite automatique sur n’importe quel jet');

  // 9 autres sorts : seuil 0 -> réussite automatique
  const w9 = calculateSapheryWard(9);
  assert.equal(w9.threshold, 0);
  assert.equal(w9.automaticSuccess, true);
});

test('Arbitrages V5 — Faux de Shyish (v3) : Morts-vivants engagés ne gagnent pas d’Élan, Avantage non supprimé', () => {
  const undeadEngaged = applyScytheOfShyishRules({
    isUndead: true,
    isEngagedWithWielder: true,
    advantageSources: [{ id: 'adv-1' }, { id: 'adv-2' }],
    hasMomentum: true
  });

  assert.equal(undeadEngaged.momentumGainBlocked, true, 'aucun gain d’Élan');
  assert.equal(undeadEngaged.advantageSuppressed, false, 'l’Avantage n’est plus supprimé (v2)');
  assert.deepEqual(undeadEngaged.allowedAdvantages, [{ id: 'adv-1' }, { id: 'adv-2' }]);
  assert.equal(undeadEngaged.momentumPreserved, true, 'l’Élan déjà acquis reste');

  const livingEngaged = applyScytheOfShyishRules({
    isUndead: false,
    isEngagedWithWielder: true,
    advantageSources: [{ id: 'adv-1' }],
    hasMomentum: true
  });

  assert.equal(livingEngaged.momentumGainBlocked, false, 'Cible vivante gagne l’Élan');
});

// ============================================================================
// 4. TRANSACTIONNALITÉ DU STORE ET HISTORIQUE (store.undo / store.redo)
// ============================================================================

test('Store V5 — Application et annulation exacte (undo) des effets magiques', async () => {
  let savedState = null;
  const store = createStore({
    persistence: {
      load: async () => savedState && structuredClone(savedState),
      saveAtomic: async ({ state }) => {
        savedState = structuredClone(state);
        return { ok: true };
      }
    }
  });
  await store.ready;

  // Créer un combat avec 2 participants
  const wizard = createParticipant('wiz-1', 'Archimage');
  const target = createParticipant('tgt-1', 'Cible', { maxHp: 12, hp: 12 });

  await store.executeCommand('init-combat', draft => {
    draft.combat = {
      round: 1,
      currentActorId: 'wiz-1',
      order: ['wiz-1', 'tgt-1'],
      participants: [wizard, target]
    };
    return draft;
  });

  // 1. Appliquer un sort via store.applySpellEffects
  await store.applySpellEffects('tgt-1', {
    spellId: 'spell-buff',
    spellName: 'Bénédiction Magique',
    statModifiers: { F: 20 },
    apModifiers: { body: 2 }
  });

  const modified = store.getCombat().participants.get('tgt-1');
  assert.equal(modified.caracs.F, 55, 'F = 35 + 20 = 55');
  assert.equal(modified.armor.body, 4, 'PA body = 2 + 2 = 4');

  // 2. Annulation exacte via store.undo()
  await store.undo();

  const restored = store.getCombat().participants.get('tgt-1');
  assert.equal(restored.caracs.F, 35, 'F restaurée à 35 après undo');
  assert.equal(restored.armor.body, 2, 'PA body restaurés à 2 après undo');
});
});
