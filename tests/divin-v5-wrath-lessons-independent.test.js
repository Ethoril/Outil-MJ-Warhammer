import test from 'node:test';
import {imposeHistoricalWrath} from './fixtures/divine-wrath-history.mjs';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { getAllDivineContracts, expireDivineAtPhases } from '../js/core/v5-divine-store.js';
import * as prayerCaps from '../js/core/v5-divine-prayer-caps.js';
import { previewResolution } from '../js/core/resolution.js';
import { previewMagicMeditation } from '../js/core/v5-magic-talents.js';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };

// Source: L06 p.218, independently checked in extracted text and the rendered
// table. Duration is an explicit d10 plus Sin at Wrath resolution; no conversion
// to seconds or unreviewed Round-expiry convention is asserted here.
const BATTLE = 'divine:blessing:myrmidia:battle';
const PRAY_ID = 'skill-50_72_69_e8_72_65-base';
const clone = value => structuredClone(value);
const person = (id, extra = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: id === 'priest' ? 60 : 30,
  hp: 20, maxHp: 30,
  caracs: { CC:40, CT:40, F:30, E:30, I:40, Ag:40, Dex:40, Int:50, FM:50, Soc:60, M:4 },
  armor: { head:0, body:0, arms:0, legs:0 }, states: [], traits: [], equipment: [],
  skills: [{ id:PRAY_ID, name:'Prière', carac:'Soc', status:'resolved', total:60 }],
  talents: [{ id:'talent-bless', status:'resolved', rank:1, specialization:'Myrmidia' },
    { id:'talent-invoke', status:'resolved', rank:1, specialization:'Myrmidia' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name:row.catalogueName, status:'resolved' })),
  extensions: { v5: { divine: { sin:1 } } }, ...extra
});
const memory = () => {
  let saved = null;
  return {
    async load(){ return saved && clone(saved); },
    async saveAtomic({state}){ saved = clone(state); return {ok:true}; },
    get saved(){ return clone(saved); }
  };
};
async function fixture({sin=1,round=1,currentActorId='priest',scene=false,persistence=memory()}={}) {
  const store = createStore({persistence,storage:null}); await store.ready;
  const priest = person('priest',{extensions:{v5:{divine:{sin}}}}), ally = person('ally',{extensions:{v5:{divine:{sin:0}}}});
  const snapshot={schemaVersion:3,reserve:[],combat:{round,currentActorId,order:['priest','ally'],participants:[priest,ally]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}};
  if(scene){snapshot.activeScene={id:'lessons-scene',status:'active',round,currentActorId,order:['priest','ally'],participants:[clone(priest),clone(ally)],extensions:{v5:{turnIndex:1}}};snapshot.suspendedScenes=[];snapshot.encounters=[{id:'lessons-encounter',status:'active'}];}
  await store.loadFromJSON(snapshot);
  return {store,persistence};
}
const prayerInput = extra => ({
  actorId:'priest',targetIds:['ally'],roll:99,wrathRoll:1,executionId:'lessons-independent',
  canSpeak:true,choices:{range:0,targets:0,duration:0,effect:0},
  facts:{targets:{ally:{withinRange:true,ally:true}}},
  expiry:{phase:'endOfRound',round:6,moment:'afterEffects'},...extra
});
const stateOf = store => { const state=JSON.parse(store.getFullJSON()); delete state.exportedAt; return state; };
const actorOf = store => { const state=stateOf(store); return (state.activeScene?.participants||state.combat.participants).find(row=>row.id==='priest'); };
const layersOf = subject => subject?.extensions?.v5?.divineEffects || [];
async function applyLessons(store,{durationRoll=4,roll=99,wrathRoll=1,executionId='lessons-independent'}={}){
  const preview=store.previewDivineExecution(BATTLE,prayerInput({roll,wrathRoll,wrathDurationRoll:durationRoll,executionId}));
  assert.equal(preview.ready,true,preview.error);
  assert.equal(preview.wrathTableResult?.id,'wrath:11-15');
  const applied=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(applied.ok,true,applied.error);
  return {preview,applied,effect:layersOf(actorOf(store)).find(row=>row.ruleId==='wrath:11-15:pray-sl-modifier')};
}

test('Leçons divines indépendant —contrat source distinct du plafond hebdomadaire',()=>{
  const lesson = (registry.prayerSLRules||[]).find(row=>row.id==='wrath:11-15:pray-sl-modifier');
  assert.ok(lesson,'le générateur doit exposer une règle séparée pour 11–15');
  assert.equal(lesson.type,'prayer-sl-modifier');
  assert.equal(lesson.amount,-1);
  assert.notEqual(lesson.id,'wrath:6-10:pray-sl-cap');
});

test('Leçons divines indépendant —d10 de durée requis même si un texte MJ est fourni',async()=>{
  const {store}=await fixture();
  const before=stateOf(store);
  const preview=store.previewDivineExecution(BATTLE,prayerInput({wrathConsequences:'Le fidèle subit -1 DR à Prière.'}));
  assert.equal(preview.ready,false,'un rappel libre ne remplace pas le dé explicite requis par la durée');
  assert.ok(preview.needsInput?.some(row=>/wrathDurationRoll|d10|durée/i.test(`${row.field||row.path||''} ${row.message||''}`)));
  assert.deepEqual(stateOf(store),before,'un aperçu bloqué ne doit rien muter');
});

test('Leçons divines indépendant —d10 absent ou hors bornes ne produit aucune sanction',async()=>{
  for (const wrathDurationRoll of [undefined,0,11,2.5,'4',NaN]) {
    const {store}=await fixture();
    const extra=wrathDurationRoll===undefined?{}:{wrathDurationRoll};
    const preview=store.previewDivineExecution(BATTLE,prayerInput({...extra,wrathConsequences:'Texte libre ne satisfait pas le jet de durée.'}));
    assert.equal(preview.ready,false,`valeur d10 invalide acceptée: ${String(wrathDurationRoll)}`);
    assert.ok(preview.needsInput?.some(row=>/wrathDurationRoll|d10|durée/i.test(`${row.field||row.path||''} ${row.message||''}`)),`refus non attribué au d10 invalide: ${String(wrathDurationRoll)}`);
    assert.equal((actorOf(store).extensions?.v5?.divineEffects||[]).some(row=>row.ruleId==='wrath:11-15:pray-sl-modifier'),false);
  }
});

test('Leçons divines indépendant —dé de durée explicite et Sin avant décrément déterminent les rounds',async()=>{
  const {store}=await fixture({sin:1});
  const preview=store.previewDivineExecution(BATTLE,prayerInput({wrathDurationRoll:4}));
  assert.equal(preview.ready,true,preview.error);
  assert.equal(preview.wrathTableResult?.id,'wrath:11-15');
  const result=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(result.ok,true,result.error);
  assert.equal(result.receipt.prayer.success,false,'la règle ne réécrit pas le Test qui déclenche le Courroux');
  const effect=(actorOf(store).extensions?.v5?.divineEffects||[]).find(row=>row.ruleId==='wrath:11-15:pray-sl-modifier');
  assert.ok(effect,'11–15 doit créer un modificateur actif et sourcé');
  assert.equal(effect.amount,-1);
  assert.equal(effect.duration.roll,4);
  assert.equal(effect.duration.sinAtTrigger,1);
  assert.equal(effect.duration.rounds,5);
  assert.equal(actorOf(store).extensions.v5.divine.sin,0,'le Courroux décrémente ensuite le Péché sans changer la durée capturée');
});

test('Leçons divines indépendant —déclenchement sur réussite ne rétroagit pas sur le Test qui le crée',async()=>{
  const {store}=await fixture({sin:1});
  const preview=store.previewDivineExecution(BATTLE,prayerInput({roll:10,wrathRoll:1,wrathDurationRoll:2,executionId:'lessons-trigger-success'}));
  assert.equal(preview.ready,true,preview.error);
  assert.equal(preview.preview.prayer.success,true);
  assert.equal(preview.wrathTableResult?.id,'wrath:11-15');
  const result=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(result.ok,true,result.error);
  assert.equal(result.receipt.prayer.success,true);
  assert.equal(result.receipt.prayer.sl,preview.preview.prayer.sl,'le malus ne change pas le Test déjà résolu');
  assert.ok(layersOf(actorOf(store)).some(row=>row.ruleId==='wrath:11-15:pray-sl-modifier'));
});

test('Leçons divines indépendant —service renvoie le modificateur avant toute issue du Test',async()=>{
  const getPrayerSLModifiers=prayerCaps.getPrayerSLModifiers;
  assert.equal(typeof getPrayerSLModifiers,'function','API commune de modificateurs pré-Test manquante');
  const clean=person('clean',{extensions:{v5:{divine:{sin:0}}}});
  const empty=getPrayerSLModifiers(clean);
  assert.equal(empty.ok,true);
  assert.deepEqual(empty.modifiers,[]);
  const {store}=await fixture();await applyLessons(store);
  const active=actorOf(store);
  const result=getPrayerSLModifiers(active);
  assert.equal(result.ok,true);
  assert.equal(result.modifiers.length,1);
  assert.equal(result.modifiers[0].amount,-1);
});

test('Leçons divines indépendant —le malus entre avant l’issue de chaque Test de Prière',async()=>{
  const getPrayerSLModifiers=prayerCaps.getPrayerSLModifiers;
  assert.equal(typeof getPrayerSLModifiers,'function','API commune de modificateurs pré-Test manquante');
  const {store}=await fixture();await applyLessons(store);
  const active=actorOf(store);
  const skill={id:PRAY_ID,name:'Prière',carac:'Soc',status:'resolved',total:60};
  const direct=previewResolution({actor:active,action:{id:'skill-action',type:'skill',base:60,attr:'Soc',note:'Prière',extensions:{fiche:{skillId:PRAY_ID}}},roll:23,v5:{kind:'test',context:{skillId:PRAY_ID}}});
  assert.equal(direct.test.sl,3,'23 contre 60 donne +4 DR; le modificateur doit entrer avant évaluation');
  assert.equal(direct.test.success,true);
  const ally=store.listParticipants().find(row=>row.id==='ally');
  const opposing=previewResolution({actor:ally,target:active,action:{id:'opposed-calm',type:'opposition',base:60,attr:'FM',note:'Calme',extensions:{fiche:{skillId:'skill-43_61_6c_6d_65-base'}}},roll:45,
    defense:{base:60,attr:'Soc',label:'Prière',roll:23,extensions:{fiche:{skillId:PRAY_ID}},v5:{kind:'test',context:{skillId:PRAY_ID,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:true}}},
    v5:{kind:'test',context:{involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
  assert.equal(opposing.opposition.defender.sl,3,'le même service pré-Test doit couvrir le défenseur en opposition');
  const otherActor=clone(active);otherActor.talents.push({id:'talent-mind-over-body',status:'resolved',rank:1});
  const missingDuration=previewMagicMeditation(otherActor,{talentId:'talent-mind-over-body',minutes:20,roll:23,durationRolls:[2,2,2]});
  assert.equal(missingDuration.ready,false,'3d10 ne satisfont pas le nombre de dés calculé après malus de -1 DR');
  const meditation=previewMagicMeditation(otherActor,{talentId:'talent-mind-over-body',minutes:20,roll:23,durationRolls:[2,2,2,2]});
  assert.equal(meditation.ready,true,meditation.error);
  assert.equal(meditation.test.sl,3);
  assert.equal(meditation.effect.duration,'8 heures','la durée de méditation utilise les4d10 requis pour3 DR');
  const divine=store.previewDivineExecution(BATTLE,prayerInput({roll:23,wrathRoll:undefined,executionId:'lessons-follow-up'}));
  assert.equal(divine.ready,true,divine.error);
  assert.equal(divine.preview.prayer.sl,3,'le consommateur Prière divine doit également appliquer le malus préissue');
});

test('Leçons divines indépendant —échéance N inclus au Round courant et vraie phase endOfRound',async()=>{
  const {store}=await fixture({round:1});
  const {effect}=await applyLessons(store,{durationRoll:3});
  assert.equal(effect.duration.rounds,4,'3 au d10 + 1 Péché au déclenchement');
  assert.deepEqual(effect.roundAnchor,{sceneId:null,round:1});
  assert.deepEqual(effect.expiry,{round:4,phase:'endOfRound',moment:'afterEffects'});
  for(let i=0;i<7;i++)await store.nextTurn();
  assert.ok(layersOf(actorOf(store)).some(row=>row.id===effect.id),'le malus reste actif jusqu’aux effets de fin du Round 4');
  await store.nextTurn();
  assert.equal(layersOf(actorOf(store)).some(row=>row.id===effect.id),false,'il expire après les effets du Round 4');
});

test('Leçons divines indépendant —temps de campagne et Round manuel ne simulent pas une phase',async()=>{
  const {store}=await fixture({round:1});
  const {effect}=await applyLessons(store,{durationRoll:2,roll:99,wrathRoll:1});
  const before=stateOf(store);
  await store.advanceCampaignTime({seconds:864000,reason:'Contrôle indépendant de durée en rounds'});
  assert.ok(layersOf(actorOf(store)).some(row=>row.id===effect.id),'un grand saut de secondes n’expire pas une durée en Rounds');
  await store.setRoundTurn(100,'priest');
  assert.ok(layersOf(actorOf(store)).some(row=>row.id===effect.id),'le Round réglé manuellement ne fabrique pas les phases manquantes');
  assert.ok(JSON.parse(store.getFullJSON()).extensions.v5.gameClock.campaignSeconds>before.extensions.v5.gameClock.campaignSeconds);
});

test('Leçons divines indépendant —expireDivineAtPhases seul ne peut pas retirer une échéance non attestée',async()=>{
  const {store}=await fixture();
  const {effect}=await applyLessons(store,{durationRoll:1,executionId:'lessons-forged-phase'});
  const before=stateOf(store),candidate=clone(before);
  const projected=expireDivineAtPhases(candidate,[{phase:'endOfRound',round:999,sceneId:null,moment:'afterEffects'}]);
  assert.ok(layersOf(projected.combat.participants.find(row=>row.id==='priest')).some(row=>row.id===effect.id),
    'un plan de phase non rattaché à un reçu Store ne doit pas expirer le malus');
});

test('Leçons divines indépendant —seconde occurrence non sourcée bloque sans cumul ni remplacement',async()=>{
  const {store}=await fixture();
  const first=await applyLessons(store,{executionId:'lessons-first'});
  assert.equal(actorOf(store).extensions.v5.divine.sin,0,'la première résolution retire le Péché avant le second Courroux');
  await store.setDivineSin('priest',1,{reason:'Fixture Q12 : nouvelle infraction avant la seconde occurrence'});
  const before=stateOf(store);
  const second=store.previewDivineExecution(BATTLE,prayerInput({roll:99,wrathRoll:1,wrathDurationRoll:4,executionId:'lessons-second'}));
  assert.equal(second.ready,false,'la source ne définit pas si une seconde occurrence s’additionne, remplace ou renouvelle');
  assert.ok(second.status==='blocked'||second.status==='requires-input');
  assert.deepEqual(stateOf(store),before,'arbitrage absent: aucune mutation ni remplacement silencieux');
  assert.ok(layersOf(actorOf(store)).some(row=>row.id===first.effect.id));
});

test('Leçons divines indépendant —hors combat sans Round courant bloque explicitement',async()=>{
  const {store}=await fixture({round:0,currentActorId:null});
  const before=stateOf(store);
  const preview=store.previewDivineExecution(BATTLE,prayerInput({wrathDurationRoll:4}));
  assert.equal(preview.ready,false,'aucune conversion en secondes ou Round inventé hors combat');
  assert.ok(preview.needsInput?.length||preview.status==='blocked');
  assert.deepEqual(stateOf(store),before);
});

test('Leçons divines indépendant —RTDB restaure uniquement sceneId null attesté par la scène canonique',async()=>{
  const {store}=await fixture({round:1});await applyLessons(store,{durationRoll:3});
  const {validateSyncDocument}=await import('../js/core/sync-protocol.js');
  const {normalizeRemoteDocument}=await import('../js/core/sync-session.js');
  const canonical=validateSyncDocument({revision:0,state:stateOf(store)}),wire=clone(canonical);
  const layer=wire.state.combat.participants.find(row=>row.id==='priest').extensions.v5.divineEffects.find(row=>row.ruleId==='wrath:11-15:pray-sl-modifier');
  assert.deepEqual(layer.roundAnchor,{sceneId:null,round:1});
  delete layer.roundAnchor.sceneId;
  const before=clone(wire),decoded=normalizeRemoteDocument(wire);
  const restored=decoded.state.combat.participants.find(row=>row.id==='priest').extensions.v5.divineEffects.find(row=>row.ruleId==='wrath:11-15:pray-sl-modifier');
  assert.equal(restored.roundAnchor.sceneId,null,'le transport RTDB peut omettre ce null attesté par le combat canonique');
  assert.deepEqual(wire,before,'le décodeur ne modifie pas le payload reçu');
});

test('Leçons divines indépendant —import local avec roundAnchor.sceneId absent reste invalide',async()=>{
  const {store}=await fixture({round:1});await applyLessons(store,{durationRoll:3});
  const state=stateOf(store),actor=state.combat.participants.find(row=>row.id==='priest');
  const layer=actor.extensions.v5.divineEffects.find(row=>row.ruleId==='wrath:11-15:pray-sl-modifier');delete layer.roundAnchor.sceneId;
  const {sanitizeMagicEnvelope}=await import('../js/core/sanitize.js');
  const {getPrayerSLModifiers}=await import('../js/core/v5-divine-prayer-caps.js');
  const local=sanitizeMagicEnvelope(state),localActor=local.combat.participants.find(row=>row.id==='priest');
  const localLayer=localActor.extensions.v5.divineEffects.find(row=>row.ruleId==='wrath:11-15:pray-sl-modifier');
  assert.equal(Object.hasOwn(localLayer.roundAnchor,'sceneId'),false,'la sanitisation/import locale ne fabrique pas un null');
  assert.equal(getPrayerSLModifiers(localActor,{sceneId:null,round:1}).ok,false,'une couche locale incomplète ne s’active pas');
});

test('Leçons divines indépendant —le −1 DR fait basculer la frontière de résultat pré-Test dans les quatre voies',async()=>{
  const {store}=await fixture();await applyLessons(store);
  const setPrayerScore=async targetStore=>{
    const actor=actorOf(targetStore),skills=actor.skills.map(skill=>skill.id===PRAY_ID?{...skill,total:69}:skill);
    await targetStore.updateParticipant(actor.id,{caracs:{...actor.caracs,Soc:69},skills});
  };
  await setPrayerScore(store);
  const active=actorOf(store),baseline=clone(active);
  baseline.extensions.v5.divineEffects=(baseline.extensions.v5.divineEffects||[]).filter(row=>row.ruleId!=='wrath:11-15:pray-sl-modifier');
  const skillAction={id:'skill-action',type:'skill',base:60,attr:'Soc',note:'Prière',extensions:{fiche:{skillId:PRAY_ID}}};
  skillAction.base=69;
  const plain=previewResolution({actor:baseline,action:skillAction,roll:65,v5:{kind:'test',context:{skillId:PRAY_ID}}});
  const penalized=previewResolution({actor:active,action:skillAction,roll:65,v5:{kind:'test',context:{skillId:PRAY_ID}}});
  assert.equal(plain.test.success,true,'à 65 contre 69, le résultat de base est une réussite marginale');
  assert.equal(penalized.test.success,false,'le −1 DR préissue transforme la réussite marginale en échec');
  assert.equal(penalized.test.sl,-1);

  const opposition=inputActor=>previewResolution({actor:person('ally'),target:inputActor,
    action:{id:'opposed',type:'opposition',base:60,attr:'FM',note:'Calme'},roll:50,
    defense:{base:69,attr:'Soc',label:'Prière',roll:65,extensions:{fiche:{skillId:PRAY_ID}},v5:{kind:'test',context:{skillId:PRAY_ID}}},
    v5:{kind:'test',context:{involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
  assert.equal(opposition(baseline).opposition.defender.success,true);
  assert.equal(opposition(active).opposition.defender.success,false,'le même seuil bascule pour le Test opposé défenseur');

  const meditator=inputActor=>previewMagicMeditation({...clone(inputActor),talents:[...inputActor.talents,{id:'talent-mind-over-body',status:'resolved',rank:1}]},
    {talentId:'talent-mind-over-body',minutes:20,roll:65,durationRolls:[2]});
  const meditationBase=meditator(baseline),meditationPenalty=meditator(active);
  assert.equal(meditationBase.test.success,true);
  assert.equal(meditationPenalty.test.success,false,'la méditation applique le malus avant son seuil de réussite');

  const {store:baseStore}=await fixture({sin:0});await setPrayerScore(baseStore);
  const divineBase=baseStore.previewDivineExecution(BATTLE,prayerInput({roll:65,wrathRoll:undefined,executionId:'lessons-prayer-boundary-base'}));
  const divinePenalty=store.previewDivineExecution(BATTLE,prayerInput({roll:65,wrathRoll:undefined,executionId:'lessons-prayer-boundary-penalty'}));
  assert.equal(divineBase.ready,true,JSON.stringify(divineBase));assert.equal(divineBase.preview.prayer.success,true);
  assert.equal(divinePenalty.ready,true,divinePenalty.error);
  assert.equal(divinePenalty.preview.prayer.success,false,'le malus transforme aussi la réussite marginale de Prière divine en échec');
});

test('Leçons divines indépendant —le plafond6–10 et le malus11–15 coexistent sans fusion',async()=>{
  const {store}=await fixture();const first=await applyLessons(store,{executionId:'lesson-before-cap'});
  const {preview:capPreview,result:capResult}=await imposeHistoricalWrath(store,{executionId:'cap-alongside-lesson'});
  assert.equal(capPreview.ready,true,capPreview.error);
  assert.equal(capPreview.wrathTableResult?.id,'wrath:6-10');
  assert.equal(capResult.ok,true,capResult.error);
  const active=actorOf(store),layers=layersOf(active);
  assert.ok(layers.some(layer=>layer.id===first.effect.id&&layer.ruleId==='wrath:11-15:pray-sl-modifier'));
  assert.ok(layers.some(layer=>layer.type==='prayer-sl-cap'&&layer.ruleId==='wrath:6-10:pray-sl-cap'));
  const modifiers=prayerCaps.getPrayerSLModifiers(active,{sceneId:null,round:1});
  assert.equal(modifiers.ok,true);assert.equal(modifiers.modifiers.length,1);assert.equal(modifiers.modifiers[0].amount,-1);
  const capped=prayerCaps.applyPrayerSLCaps(active,{success:true,sl:3});
  assert.equal(capped.ok,true);assert.equal(capped.test.sl,0,'le plafond transforme une réussite positive en +0 DR après son issue');
  const uncappedFailure=prayerCaps.applyPrayerSLCaps(active,{success:false,sl:-1});
  assert.equal(uncappedFailure.test.sl,-1,'le plafond ne transforme pas l’échec ni le malus en une sanction fusionnée');
});

test('Leçons divines indépendant —refus de persistance et Annuler ne laissent aucune sanction',async()=>{
  const base=memory();let refuse=false;
  const persistence={load:()=>base.load(),saveAtomic:args=>refuse?Promise.resolve({ok:false,error:'Refus de persistance indépendant'}):base.saveAtomic(args)};
  const {store}=await fixture({persistence});const preview=store.previewDivineExecution(BATTLE,prayerInput({wrathDurationRoll:4}));
  assert.equal(preview.ready,true,preview.error);const before=stateOf(store);refuse=true;
  const failed=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(failed.ok,false,'une écriture persistante refusée n’est pas déclarée comme sanction appliquée');
  assert.deepEqual(stateOf(store),before,'l’échec d’écriture laisse intact l’état en mémoire');
  refuse=false;const good=store.previewDivineExecution(BATTLE,prayerInput({wrathDurationRoll:4,executionId:'lessons-undo'}));
  assert.equal(good.ready,true,good.error);const applied=await store.applyDivineExecution(BATTLE,{preview:good});assert.equal(applied.ok,true,applied.error);
  assert.ok(layersOf(actorOf(store)).some(row=>row.ruleId==='wrath:11-15:pray-sl-modifier'));
  assert.equal(store.canUndo(),true);await store.undo();
  assert.equal(layersOf(actorOf(store)).some(row=>row.ruleId==='wrath:11-15:pray-sl-modifier'),false,'Annuler retire aussi la couche sauvegardée');
  assert.equal((base.saved?.combat?.participants||[]).some(row=>layersOf(row).some(layer=>layer.ruleId==='wrath:11-15:pray-sl-modifier')),false);
});

test('Leçons divines indépendant —aperçu périmé après changement de Round ne pose pas la sanction',async()=>{
  const {store}=await fixture({round:4});
  const preview=store.previewDivineExecution(BATTLE,prayerInput({wrathDurationRoll:3,executionId:'lessons-stale-round'}));
  assert.equal(preview.ready,true,preview.error);
  await store.setRoundTurn(5,'priest');
  const beforeApply=stateOf(store);
  await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview}),/horloge a changé|recalculez la prière/i,
    'un aperçu ancré au Round 4 ne peut pas s’appliquer au Round 5');
  assert.deepEqual(stateOf(store),beforeApply,'le refus périmé ne pose ni couche ni décrément de Péché');
  assert.equal(layersOf(actorOf(store)).some(row=>row.ruleId==='wrath:11-15:pray-sl-modifier'),false);
});

test('Leçons divines indépendant —une preuve de Courroux falsifiée bloque le modificateur',async()=>{
  const {store}=await fixture();await applyLessons(store);
  const actor=actorOf(store),forged=clone(actor),layer=layersOf(forged).find(row=>row.ruleId==='wrath:11-15:pray-sl-modifier');
  layer.wrathProof.wrath.modifiedRoll+=10;
  const result=prayerCaps.getPrayerSLModifiers(forged,{sceneId:null,round:1});
  assert.equal(result.ok,false,'une preuve qui ne correspond plus au jet modifié ne produit pas −1 DR');
  assert.deepEqual(result.modifiers,[]);
});
