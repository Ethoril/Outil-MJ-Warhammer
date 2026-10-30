import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock, advanceGameClock, deriveTurnPhasePlan, readCombatPosition, reconcileGameClockPosition, validateGameClock } from '../../../js/core/v5-game-time.js';
import * as divine from '../../../js/core/v5-divine-store.js';
import { getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { fixture, snap, priest, input, BATTLE } from '../../helpers/divin-b5-fixture.mjs';
import { createCombatEngine } from '../../../js/core/combat.js';
import { applySpellEffects } from '../../../js/core/v5-magic-effects.js';
import { applyBeastForm, BEAST_PROFILES } from '../../../js/core/v5-magic-arbitrations.js';
import { normalizeRemoteDocument } from '../../../js/core/sync-session.js';
import { validateSyncDocument } from '../../../js/core/sync-protocol.js';
import { migrateSnapshot } from '../../../js/core/migrations.js';
import { sanitizeMagicEnvelope } from '../../../js/core/sanitize.js';

describe('cibles superflues (A2)', () => {
// A2 (R22) : Hurlement du loup et Roi de la Nature, à cible implicite du prêtre (invocations), refusent toute cible
// superflue comme le font déjà Œil de l’aigle et Yeux de chat : seules « aucune cible » et « le prêtre seul » passent.
const clone = value => structuredClone(value);
const HOWL = 'divine:miracle:ulric:howl-of-the-wolf', KING = 'divine:miracle:taal:king-of-the-wild';
const EAGLE = 'divine:miracle:il-de-l-aigle', CAT = 'divine:miracle:ranald:cat-s-eyes';
const SPECIALIZATIONS = ['Ulric', 'Taal', 'Myrmidia', 'Morr', 'Sigmar', 'Ranald'];

const actor = (id, initiative, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: SPECIALIZATIONS.flatMap(specialization => ['talent-invoke', 'talent-bless'].map(id => ({ id, status: 'resolved', rank: 1, specialization }))),
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [{ id: 'ham-1', name: 'Marteau de guerre', kind: 'weapon', category: 'Marteau' }], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture() {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [actor('priest', 60), actor('ally', 30), actor('foe', 20, { camp: 'ennemi', traits: ['Mort-vivant'] })] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const allFacts = targetIds => ({ targets: Object.fromEntries(targetIds.map(id => [id, { withinRange: true, withinTouch: true, ally: true, undead: true, nonMyrmidian: true, lookingAtPriest: true }])) });
const ROUND6 = { phase: 'endOfTurn', round: 6, actorId: 'priest' };
const input = (targetIds, more = {}) => ({ actorId: 'priest', targetIds, roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry: ROUND6, ...more });
const withFacts = (targetIds, more = {}) => input(targetIds, { facts: allFacts(targetIds), ...more });
const KING_MORE = { summon: { beastKey: 'giant-spider', position: 'au pied du prêtre' }, expiry: undefined };

test('A2 : Hurlement du loup et Roi de la Nature refusent une cible superflue en plus du prêtre', async () => {
  const store = await fixture();
  for (const [id, more] of [[HOWL, {}], [KING, KING_MORE]]) {
    const preview = store.previewDivineExecution(id, withFacts(['priest', 'foe'], more));
    assert.equal(preview.ready, false, id);
    assert.equal(preview.error, 'La prière se cible elle-même; choisissez uniquement le prêtre auteur.', id);
    assert.ok(preview.needsInput.some(row => row.field === 'targetIds'), id);
  }
});

test('A2 : Hurlement du loup et Roi de la Nature refusent une cible autre que le prêtre', async () => {
  const store = await fixture();
  for (const [id, more] of [[HOWL, {}], [KING, KING_MORE]]) {
    const preview = store.previewDivineExecution(id, withFacts(['foe'], more));
    assert.equal(preview.ready, false, id);
    assert.equal(preview.error, 'La prière se cible elle-même; choisissez uniquement le prêtre auteur.', id);
    assert.ok(preview.needsInput.some(row => row.field === 'targetIds'), id);
  }
});

test('A2 : sans cible explicite ou avec le prêtre seul, Hurlement du loup et Roi de la Nature restent prêts', async () => {
  for (const [id, more] of [[HOWL, {}], [KING, KING_MORE]]) {
    for (const targetIds of [[], ['priest']]) {
      const store = await fixture();
      const preview = store.previewDivineExecution(id, withFacts(targetIds, more));
      assert.equal(preview.ready, true, `${id} ${JSON.stringify(targetIds)} ${preview.error} ${JSON.stringify(preview.needsInput)}`);
    }
  }
});

test('A2 : Œil de l’aigle et Yeux de chat refusent toujours une autre cible que le prêtre (inchangés)', async () => {
  const store = await fixture();
  for (const id of [EAGLE, CAT]) {
    const preview = store.previewDivineExecution(id, withFacts(['foe']));
    assert.equal(preview.ready, false, id);
    assert.equal(preview.error, 'La prière se cible elle-même; choisissez uniquement le prêtre auteur.', id);
  }
});
});

describe('calendrier — caractérisation B12', () => {
test('B12 caractérisation — avance calendaire exacte sans inventer un Tour, Undo/reload',async()=>{const{store,persistence}=await fixture();const round=snap(store).combat.round;const r=await store.advanceCampaignTime({seconds:86400,reason:'Une journée connue'});assert.equal(r.ok,true);assert.equal(snap(store).extensions.v5.gameClock.campaignSeconds,86400);assert.equal(snap(store).combat.round,round);await store.undo();assert.equal(snap(store).extensions.v5.gameClock.campaignSeconds,0);await store.redo();const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(snap(reload).extensions.v5.gameClock.campaignSeconds,86400);});
test('B12 caractérisation — événement calendaire rejoué est duplicate et ne réavance pas',async()=>{const{store}=await fixture();const clock=snap(store).extensions.v5.gameClock,input={seconds:60,reason:'Minute connue',clockBaseRevision:clock.revision,eventId:'clock-v1:'+clock.revision+':b12-characterization'};await store.advanceCampaignTime(input);const before=snap(store);const r=await store.advanceCampaignTime(input);assert.equal(r.status,'duplicate');assert.deepEqual(snap(store),before);});
test('B12 caractérisation — refus persistance et révision périmée préservent heure et fiche',async()=>{const{store,setRefuse}=await fixture(),before=snap(store);setRefuse(true);assert.equal((await store.advanceCampaignTime({seconds:60,reason:'Minute'})).ok,false);assert.deepEqual(snap(store),before);setRefuse(false);const revision=store.getLocalRevision();await store.advanceCampaignTime({seconds:60,reason:'Minute'});const current=snap(store);const r=await store.advanceCampaignTime({seconds:60,reason:'Minute suivante'},{baseRevision:revision});assert.equal(r.status,'stale');assert.deepEqual(snap(store),current);});
});

describe('matins du Courroux (B12)', () => {
const rows=s=>priest(s).extensions.v5.divineDailyBleeding||[],bleeding=s=>priest(s).states.filter(row=>row.key==='hemorragique').reduce((n,row)=>n+(row.level||1),0);
async function impose(s,extra={}){const p=s.previewDivineExecution(BATTLE,input(91,{executionId:'b12-trigger',wrathFirstMorningAt:10,...extra}));assert.equal(p.ready,true,p.error);await s.applyDivineExecution(BATTLE,{preview:p});return p;}
async function advance(s,seconds,all=false,extra={}){const state=snap(s),clock=state.extensions.v5.gameClock,command={seconds,reason:'Temps connu B12',eventId:'clock-v1:'+clock.revision+':b12-'+seconds,clockBaseRevision:clock.revision,...extra};if(all)divine.authorizeWrathMorningAdvance(state,{...command,confirmedAll:true});return s.advanceCampaignTime(command);}
async function penance(s,cult='Myrmidia'){await s.createDivinePenance('priest',{cult,text:'Mission B12',reason:'Choix MJ'});const id=priest(s).extensions.v5.divinePenances.at(-1).id;await s.completeDivinePenance('priest',id,{reason:'Mission accomplie'});return id;}
test('B12 — le premier matin est une donnée MJ future, sans heure implicite',async()=>{const{store}=await fixture(4);for(const at of [undefined,0,-1,1.5,Number.MAX_SAFE_INTEGER]){const p=store.previewDivineExecution(BATTLE,input(91,{wrathFirstMorningAt:at,wrathConsequences:'fait'}));assert.equal(p.ready,false);assert.ok(p.needsInput.some(row=>row.field==='wrathFirstMorningAt'));}assert.equal(rows(store).length,0);});
test('B12 — la pose ne saigne pas immédiatement, quantité avant décrément et échéance sourcées',async()=>{const{store}=await fixture(4),before=snap(store),p=store.previewDivineExecution(BATTLE,input(91,{wrathFirstMorningAt:10}));assert.equal(p.ready,true,p.error);assert.deepEqual(snap(store),before);await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(bleeding(store),0);assert.equal(rows(store)[0].quantity,5);assert.equal(rows(store)[0].nextMorningAt,10);assert.equal(priest(store).extensions.v5.divine.sin,3);});
test('B12 — franchissement exact du matin, une seule acquisition canonique et prochain jour',async()=>{const{store}=await fixture(4);await impose(store);await advance(store,9);assert.equal(bleeding(store),0);await advance(store,1);assert.equal(bleeding(store),5);assert.equal(rows(store)[0].nextMorningAt,86410);assert.equal(rows(store)[0].processedMornings,1);assert.equal(rows(store)[0].morningReceipts[0].at,10);});
test('B12 — plusieurs matins sautés : confirmation explicite obligatoire, puis tous les matins',async()=>{const{store}=await fixture(4);await impose(store);const before=snap(store),r=await advance(store,172810);assert.equal(r.ok,false);assert.deepEqual(snap(store),before);await advance(store,172810,true);assert.equal(bleeding(store),15);assert.equal(rows(store)[0].processedMornings,3);assert.deepEqual(rows(store)[0].morningReceipts.map(row=>row.at),[10,86410,172810]);});
test('B12 — rejeu du même événement ne produit pas un second saignement',async()=>{const{store}=await fixture(4);await impose(store);const clock=snap(store).extensions.v5.gameClock,command={seconds:10,reason:'Matin B12',clockBaseRevision:clock.revision,eventId:'clock-v1:'+clock.revision+':b12-duplicate'};await store.advanceCampaignTime(command);const before=snap(store);assert.equal((await store.advanceCampaignTime(command)).status,'duplicate');assert.deepEqual(snap(store),before);assert.equal(bleeding(store),5);});
test('B12 — retirer l’Hémorragique ordinaire ne termine pas la récurrence',async()=>{const{store}=await fixture(4);await impose(store);await advance(store,10);await store.updateParticipant('priest',{states:[]});assert.equal(rows(store)[0].status,'active');await advance(store,86400);assert.equal(bleeding(store),5);});
test('B12 — pénitence du même culte termine les matins futurs et conserve les États acquis',async()=>{const{store}=await fixture(4);await impose(store);await advance(store,10);const id=await penance(store);assert.equal(rows(store)[0].status,'completed');assert.equal(rows(store)[0].completedByPenanceId,id);assert.equal(bleeding(store),5);await advance(store,172800);assert.equal(bleeding(store),5);});
test('B12 — pénitence d’un autre culte ne termine pas le saignement de Myrmidia',async()=>{const{store}=await fixture(4);await impose(store);await penance(store,'Manann');assert.equal(rows(store)[0].status,'active');await advance(store,10);assert.equal(bleeding(store),5);});
test('B12 — refus persistance, Undo/Redo et reload réunissent heure, curseur et États',async()=>{const{store,persistence,setRefuse}=await fixture(4);await impose(store);const before=snap(store);setRefuse(true);assert.equal((await advance(store,10)).ok,false);assert.deepEqual(snap(store),before);setRefuse(false);await advance(store,10);await store.undo();assert.equal(bleeding(store),0);assert.equal(rows(store)[0].nextMorningAt,10);await store.redo();const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(bleeding(reload),5);assert.equal(rows(reload)[0].nextMorningAt,86410);});
test('B12 — édition/effacement du curseur et faux arrêt sans pénitence refusés',async()=>{const{store}=await fixture(4);await impose(store);for(const records of [[],rows(store).map(row=>({...row,nextMorningAt:86410,processedMornings:1})),rows(store).map(row=>({...row,status:'completed',completedByPenanceId:'faux'}))]){const a=priest(store);await assert.rejects(()=>store.updateParticipant('priest',{extensions:{...a.extensions,v5:{...a.extensions.v5,divineDailyBleeding:records}}}),/matin|Hémorrag|pénitence|récurr/i);}});
test('B12 — un vrai Round franchissant l’ancre acquiert les États sans faux matin quotidien',async()=>{const{store}=await fixture(4);await impose(store);const engine=createCombatEngine(store);for(let i=0;i<2;i++)await engine.nextTurn();assert.equal(snap(store).extensions.v5.gameClock.campaignSeconds,10);assert.equal(bleeding(store),5);});
test('B12 — la récupération B04 peut poser une récurrence avec Péchés avant décrément',async()=>{const{store}=await fixture(1);let p=store.previewDivineExecution(BATTLE,input(6));await store.applyDivineExecution(BATTLE,{preview:p});await store.setDivineSin('priest',4,{reason:'Nouvelle occurrence'});p=store.previewDivineWrathRecovery({actorId:'priest',stateId:priest(store).states[0].id,roll:99,canSpeak:true,wrathRoll:91,wrathFirstMorningAt:10});assert.equal(p.ready,true,p.error);await store.applyDivineWrathRecovery({preview:p});assert.equal(rows(store)[0].quantity,5);});
test('B12 — même clôture atomique : restitution B11 et arrêt de récurrence',async()=>{const{store}=await fixture(2);await store.updateParticipant('priest',{equipment:[{id:'sword',name:'Épée',kind:'weapon',baseId:'custom',keywords:[],locations:[],damage:4}]});let p=store.previewDivineExecution(BATTLE,input(91,{executionId:'b12-confiscation',wrathInventoryConfirmed:true,wrathMagicalItemIds:['sword'],wrathRetainedArmor:{head:0,body:0,rightArm:0,leftArm:0,rightLeg:0,leftLeg:0}}));await store.applyDivineExecution(BATTLE,{preview:p});await store.setDivineSin('priest',4,{reason:'Nouvelle occurrence'});await impose(store);await store.createDivinePenance('priest',{cult:'Myrmidia',text:'Mission commune',reason:'Choix MJ'});const a=priest(store);await store.completeDivinePenance('priest',a.extensions.v5.divinePenances[0].id,{reason:'Mission accomplie',confiscationId:a.extensions.v5.divineConfiscations[0].id,restoreItemId:'sword'});assert.equal(priest(store).equipment[0].id,'sword');assert.equal(rows(store)[0].status,'completed');});
for(const [field,sin,wrath,extra]of [['divineDailyBleeding',4,91,{wrathFirstMorningAt:10}],['divineEffects',3,91,{}],['divinePenances',1,null,{}],['divineConfiscations',2,91,{wrathInventoryConfirmed:true,wrathMagicalItemIds:[],wrathRetainedArmor:{head:0,body:0,rightArm:0,leftArm:0,rightLeg:0,leftLeg:0}}]])test('B12 garde commun — ne pas copier '+field+' sur un autre personnage',async()=>{const{store}=await fixture(sin);if(field==='divinePenances')await store.createDivinePenance('priest',{cult:'Myrmidia',text:'Mission source',reason:'MJ'});else{if(field==='divineConfiscations')await store.updateParticipant('priest',{equipment:[]});const p=store.previewDivineExecution(BATTLE,input(wrath,{executionId:'b12-subject-'+field,...extra}));assert.equal(p.ready,true,p.error);await store.applyDivineExecution(BATTLE,{preview:p});}const a=store.listParticipants().find(row=>row.id==='ally');await assert.rejects(()=>store.updateParticipant('ally',{extensions:{...a.extensions,v5:{...a.extensions.v5,[field]:structuredClone(priest(store).extensions.v5[field])}}}),/sujet|personnage|sourc|invalide/i);});
test('B12 — confirmation des matins liée au payload et à la révision courante',async()=>{for(const mode of ['payload','revision']){const{store}=await fixture(4);await impose(store);const state=snap(store),clock=state.extensions.v5.gameClock,command={seconds:172810,reason:'Matins confirmés',eventId:'clock-v1:'+clock.revision+':bound-'+mode,clockBaseRevision:clock.revision};assert.throws(()=>divine.authorizeWrathMorningAdvance(state,{...command,confirmedAll:false}),/Confirmez/);divine.authorizeWrathMorningAdvance(state,{...command,confirmedAll:true});if(mode==='revision')await store.updateParticipant('priest',{name:'Révision suivante'});else command.seconds--;const before=snap(store);assert.equal((await store.advanceCampaignTime(command)).ok,false);assert.deepEqual(snap(store),before);}});
test('B12 — une modification brute des secondes ne prouve aucun matin',async()=>{const{store}=await fixture(4);await impose(store);const before=snap(store);await assert.rejects(()=>store.executeCommand('fake-clock',draft=>{draft.extensions.v5.gameClock.campaignSeconds=10;return draft;}),/Matin|reçu|clock/i);assert.deepEqual(snap(store),before);});
test('B12 (B-C26) — aube de 6 h proposée par défaut pour le premier matin, la valeur du MJ reste libre',async()=>{const{defaultFirstMorningAt}=await import('../../../js/core/v5-game-time.js');assert.equal(defaultFirstMorningAt(0),21600);assert.equal(defaultFirstMorningAt(21599),21600);assert.equal(defaultFirstMorningAt(21600),108000);assert.equal(defaultFirstMorningAt(86400),108000);assert.equal(defaultFirstMorningAt(-1),null);const{store}=await fixture(4);const p=store.previewDivineExecution(BATTLE,input(91,{wrathFirstMorningAt:undefined,wrathConsequences:'fait'}));assert.equal(p.ready,false);assert.equal(p.wrathDailyBleedingPreview.proposedFirstMorningAt,defaultFirstMorningAt(snap(store).extensions.v5.gameClock.campaignSeconds));});
});

describe('temps de campagne — contrôle indépendant (E5)', () => {
// Contrôles possédés par l'agent indépendant. Aucun auteur runtime ne modifie ces attentes.
// Sources : conception E5, V5 p.161-163/186/266 ; D11/S02 calendrier, D12 phases combat.
const person = (id, extra = {}) => ({
  id, name: 'Même nom', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 40,
  hp: 12, maxHp: 20, caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 50, M: 4 },
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, talents: [], skills: [], states: [], traits: [], equipment: [],
  extensions: { v5: {} }, ...extra
});
const buffed = (id, duration = '2 minutes', extra = {}, round = 1) => applySpellEffects(person(id, extra), {
  id: `effect-${id}`, spellId: `spell-${id}`, spellName: 'Contrôle campagne',
  casterId: id, duration, statModifiers: { CC: 10 }
}, { round }).participant;
const stateOf = store => { const state = JSON.parse(store.getFullJSON()); delete state.exportedAt; return state; };
const clockOf = store => stateOf(store).extensions.v5.gameClock;
const participant = (store, id = 'a') => stateOf(store).combat.participants.find(row => row.id === id);
const effects = row => row.extensions?.v5?.spellEffects || [];
const remaining = row => effects(row)[0]?.remainingMinutes;

function memory() {
  let saved = null, saves = 0, refuse = false;
  return {
    async load() { return saved && structuredClone(saved); },
    async saveAtomic({ state }) { if (refuse) return { ok: false, error: 'independent persistence refusal' }; saved = structuredClone(state); saves++; return { ok: true }; },
    get saves() { return saves; },
    get saved() { return structuredClone(saved); },
    set refuse(value) { refuse = value; }
  };
}
async function fixture({ people = [buffed('a')], extra = {}, persistence = memory(), scene = false } = {}) {
  const store = createStore({ persistence, storage: null }); await store.ready;
  const combat = { round: 1, currentActorId: people[0]?.id || null, order: people.map(row => row.id), participants: people };
  const snapshot = { schemaVersion: 3, reserve: [], combat, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } }, ...extra };
  if (scene) snapshot.activeScene = { id: 'scene-independent', encounterId: 'enc-independent', title: 'Campagne', status: 'active', round: 1,
    currentActorId: combat.currentActorId, order: combat.order, participants: structuredClone(people), extensions: { v5: { turnIndex: 1 } } };
  await store.loadFromJSON(snapshot);
  assert.equal(typeof store.advanceCampaignTime, 'function', 'E5 avance de campagne API Store absente');
  return { store, persistence };
}
async function rejected(store, input, options, expectedStatus) {
  const before = stateOf(store);
  let result;
  try { result = await store.advanceCampaignTime(input, options); }
  catch (error) { if (expectedStatus) throw error; assert.ok(error instanceof TypeError || error.userFacing); }
  if (result !== undefined) {
    assert.equal(result.ok, false, `refus attendu : ${JSON.stringify(result)}`);
    if (expectedStatus) assert.equal(result.status, expectedStatus);
  }
  assert.deepEqual(stateOf(store), before, 'un refus ne modifie ni le snapshot, ni le journal, ni history');
  return result;
}
const step = (store, seconds = 30, extra = {}) => store.advanceCampaignTime({ seconds, reason: 'Avance MJ indépendante', ...extra });

test('E5 campagne indépendant — secondes exactes, motif, reçu CAS et zéro phase atomiques', async () => {
  const { store, persistence } = await fixture();
  const before = stateOf(store), saves = persistence.saves;
  const input = { seconds: 61, reason: '  Voyage décidé par le MJ  ', eventId: 'clock-v1:0:independent-exact', clockBaseRevision: 0 };
  const result = await store.advanceCampaignTime(input);
  assert.equal(result.ok, true); assert.equal(result.status, 'applied');
  const after = stateOf(store), clock = clockOf(store);
  assert.equal(clock.campaignSeconds, 61); assert.equal(clock.revision, 1);
  assert.deepEqual(clock.combat, before.extensions.v5.gameClock.combat, 'campagne ne déplace pas le combat');
  assert.deepEqual(clock.lastEvent.validatedPhases, [], 'aucun Tour/Round inventé');
  assert.equal(clock.lastEvent.kind, 'campaign-time-advance');
  const payload = JSON.parse(clock.lastEvent.payloadFingerprint);
  assert.equal(payload.seconds, 61); assert.equal(payload.reason.trim(), input.reason.trim());
  assert.equal(payload.id, input.eventId); assert.equal(payload.baseRevision, 0);
  assert.deepEqual(result.receipt, clock.lastEvent);
  assert.equal(after.localRevision, before.localRevision + 1);
  assert.equal(persistence.saves, saves + 1, 'clock, effets, journal et reçu dans une seule écriture');
  assert.deepEqual(persistence.saved.extensions.v5.gameClock, clock);
  assert.ok(Math.abs(remaining(participant(store)) - 59 / 60) < 1e-12);
});

for (const seconds of [0, -1, 0.5, '60', null, undefined, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
  test(`E5 campagne indépendant — secondes invalides refusées ${String(seconds)}`, async () => {
    const { store } = await fixture(); await rejected(store, { seconds, reason: 'Motif réel' });
  });
}
for (const reason of ['', '   ', null, 42]) {
  test(`E5 campagne indépendant — motif invalide refusé ${String(reason)}`, async () => {
    const { store } = await fixture(); await rejected(store, { seconds: 10, reason });
  });
}

test('E5 campagne indépendant — retry exact ne sauvegarde ni ne consomme une seconde fois', async () => {
  const { store, persistence } = await fixture();
  const localBase = store.getLocalRevision();
  const input = { seconds: 30, reason: 'Repos', eventId: 'clock-v1:0:independent-retry', clockBaseRevision: 0 };
  assert.equal((await store.advanceCampaignTime(input, { baseRevision: localBase })).status, 'applied');
  const before = stateOf(store), saves = persistence.saves;
  const retry = await store.advanceCampaignTime(input, { baseRevision: localBase });
  assert.equal(retry.ok, true); assert.equal(retry.status, 'duplicate');
  assert.deepEqual(stateOf(store), before); assert.equal(persistence.saves, saves);
  await rejected(store, { ...input, seconds: 31 }, {}, 'conflict');
  await rejected(store, { ...input, reason: 'Autre motif' }, {}, 'conflict');
});

test('E5 campagne indépendant — stale clock et stale local distincts sans mutation', async () => {
  const { store } = await fixture(); const localBase = store.getLocalRevision();
  assert.equal((await step(store)).status, 'applied');
  await rejected(store, { seconds: 30, reason: 'Base clock périmée', eventId: 'clock-v1:0:other', clockBaseRevision: 0 }, {}, 'stale');
  await rejected(store, { seconds: 30, reason: 'Base locale périmée' }, { baseRevision: localBase }, 'stale');
  assert.equal(clockOf(store).campaignSeconds, 30);
});

test('E5 campagne indépendant — retry ancien après reçu ultérieur et réemploi ID autre base refusés', async () => {
  const { store } = await fixture();
  const input = { seconds: 20, reason: 'Repos', eventId: 'clock-v1:0:old', clockBaseRevision: 0 };
  await store.advanceCampaignTime(input); await step(store, 20);
  await rejected(store, input, {}, 'stale');
  await rejected(store, { ...input, clockBaseRevision: clockOf(store).revision });
  assert.equal(clockOf(store).campaignSeconds, 40);
});

test('E5 campagne indépendant — deux avances concurrentes capturent une seule base CAS', async () => {
  const { store } = await fixture();
  const results = await Promise.all([step(store, 30), step(store, 60)]);
  assert.equal(results.filter(row => row.status === 'applied').length, 1);
  assert.equal(results.filter(row => row.status === 'stale' || row.status === 'conflict').length, 1);
  assert.equal(clockOf(store).campaignSeconds, 30);
  assert.equal(remaining(participant(store)), 1.5);
});

test('E5 campagne indépendant — échec de persistance conserve clock effets et history puis retry valide', async () => {
  const { store, persistence } = await fixture();
  const before = stateOf(store), saves = persistence.saves;
  const input = { seconds: 120, reason: 'Repos', eventId: 'clock-v1:0:failure', clockBaseRevision: 0 };
  persistence.refuse = true;
  const result = await store.advanceCampaignTime(input);
  assert.equal(result.ok, false); assert.notEqual(result.status, 'applied');
  assert.deepEqual(stateOf(store), before); assert.equal(persistence.saves, saves);
  persistence.refuse = false;
  assert.equal((await store.advanceCampaignTime(input)).status, 'applied');
  assert.equal(effects(participant(store)).length, 0); assert.equal(participant(store).caracs.CC, 40);
});

test('E5 campagne indépendant — snapshot persisté simulé, reload puis Undo/Redo rétablissent les familles ensemble', async () => {
  const marker = { id: 'talent-a', name: 'Talent temporaire', kind: 'talent-active', remainingMinutes: 1 };
  const { store, persistence } = await fixture({ people: [buffed('a', '1 minute', { states: [marker] })] });
  const before = stateOf(store);
  assert.equal((await step(store, 60)).status, 'applied');
  const after = stateOf(store);
  assert.equal(effects(participant(store)).length, 0); assert.equal(participant(store).states.length, 0);
  const reloaded = createStore({ persistence, storage: null }); await reloaded.ready;
  assert.deepEqual(clockOf(reloaded), after.extensions.v5.gameClock);
  assert.deepEqual(participant(reloaded), participant(store));
  await reloaded.undo();
  assert.deepEqual(clockOf(reloaded), before.extensions.v5.gameClock);
  assert.deepEqual(participant(reloaded), before.combat.participants[0]);
  await reloaded.redo();
  assert.deepEqual(clockOf(reloaded), after.extensions.v5.gameClock);
  assert.deepEqual(participant(reloaded), after.combat.participants[0]);
});

test('E5 campagne indépendant — secondes fractionnaires de minute cumulées sans arrondi prématuré', async () => {
  const { store } = await fixture({ people: [buffed('a', '1 minute')] });
  for (let i = 0; i < 59; i++) assert.equal((await step(store, 1)).status, 'applied');
  assert.equal(effects(participant(store)).length, 1, 'une seconde reste réellement');
  assert.ok(Math.abs(remaining(participant(store)) - 1 / 60) < 1e-12);
  await step(store, 1);
  assert.equal(effects(participant(store)).length, 0, 'soixante secondes atteignent exactement la minute');
  assert.equal(participant(store).caracs.CC, 40); assert.equal(clockOf(store).campaignSeconds, 60);
});

test('E5 campagne indépendant — façade minutes fractionnaires et non convertibles conserve contrat', async () => {
  const { store } = await fixture();
  await store.advanceTalentMinutes(1 / 6);
  assert.equal(clockOf(store).campaignSeconds, 10);
  assert.ok(Math.abs(remaining(participant(store)) - 11 / 6) < 1e-12);
  const before = stateOf(store);
  let failed = false;
  try { const result = await store.advanceTalentMinutes(1 / 7); failed = result?.ok === false; } catch { failed = true; }
  assert.equal(failed, true, 'ne jamais arrondir la fraction de seconde silencieusement');
  assert.deepEqual(stateOf(store), before);
});

test('E5 campagne indépendant — activeScene et combat miroir décrémentés exactement une fois', async () => {
  const { store } = await fixture({ scene: true });
  await step(store, 30);
  const state = stateOf(store);
  assert.equal(remaining(state.combat.participants[0]), 1.5);
  assert.equal(remaining(state.activeScene.participants[0]), 1.5);
  assert.equal(state.activeScene.currentActorId, 'a'); assert.equal(state.activeScene.round, 1);
});

test('E5 campagne indépendant — réserve persistants et suspendus avancent réellement dans transaction', async () => {
  const reserve = buffed('reserve'), persistent = buffed('persistent'), asleep = buffed('asleep', '2 minutes', {}, 5);
  const scene = { id: 'suspended-independent', encounterId: 'enc-suspended', title: 'Suspendue', status: 'suspended',
    round: 5, currentActorId: asleep.id, order: [asleep.id], participants: [asleep], extensions: { v5: { turnIndex: 12 } } };
  const { store, persistence } = await fixture({ extra: { reserve: [reserve], persistentCharacters: [persistent], suspendedScenes: [scene] } });
  const before = stateOf(store);
  assert.equal(effects(before.reserve[0]).length, 1); assert.equal(effects(before.persistentCharacters[0]).length, 1);
  const result = await step(store, 30);
  assert.equal(result.status, 'applied');
  const state = stateOf(store);
  for (const subject of [state.combat.participants[0], state.reserve[0], state.persistentCharacters[0], state.suspendedScenes[0].participants[0]]) {
    assert.equal(remaining(subject), 1.5, `le vrai sujet ${subject.id} a avancé`);
  }
  assert.equal(state.suspendedScenes[0].round, 5); assert.equal(state.suspendedScenes[0].currentActorId, asleep.id);
  assert.deepEqual(persistence.saved.suspendedScenes, state.suspendedScenes);
  const reloaded = createStore({ persistence, storage: null }); await reloaded.ready;
  const restored = stateOf(reloaded);
  assert.deepEqual(restored.reserve, state.reserve); assert.deepEqual(restored.persistentCharacters, state.persistentCharacters);
  assert.deepEqual(restored.suspendedScenes, state.suspendedScenes);
});

test('E5 campagne indépendant — mêmes noms et profileId ne fusionnent jamais deux copies de sujet', async () => {
  const a = buffed('a', '1 minute', { profileId: 'template-same' });
  const b = buffed('b', '2 minutes', { profileId: 'template-same' });
  const { store } = await fixture({ people: [a, b], extra: { reserve: [person('template-same')] } });
  await step(store, 60);
  assert.equal(effects(participant(store, 'a')).length, 0);
  assert.equal(remaining(participant(store, 'b')), 1);
  assert.equal(participant(store, 'a').caracs.CC, 40); assert.equal(participant(store, 'b').caracs.CC, 50);
  assert.equal(effects(stateOf(store).reserve[0]).length, 0, 'ne jamais recopier une couche vers son modèle par nom/profil');
});

test('E5 campagne indépendant — incident réel expire ses seuls États et conserve la cause indépendante', async () => {
  const { store } = await fixture({ people: [person('a', { states: [{ id: 'other-blind', name: 'Aveuglé' }] })] });
  const preview = store.previewMiscast({ severity: 'MAJOR', roll: 38, secondaryRolls: { duration: 1 } });
  assert.equal(preview.ready, true); await store.applyMiscast(preview, { actorId: 'a' });
  const incident = participant(store).extensions.v5.miscastEffects[0];
  assert.equal(incident.remainingMinutes, 60);
  await step(store, 3600);
  assert.deepEqual(participant(store).extensions.v5.miscastEffects, []);
  assert.deepEqual(participant(store).states.map(row => row.id), ['other-blind']);
  assert.equal(clockOf(store).campaignSeconds, 3600);
});

test('E5 campagne indépendant — durée calendrier sans ancre bloque tout sans faux avancement partiel', async () => {
  const broken = person('broken', { extensions: { v5: { spellEffects: [{ id: 'ambiguous-calendar', durationType: 'minutes', durationMinutes: 5 }] } } });
  const { store, persistence } = await fixture({ people: [buffed('a'), broken] });
  const saves = persistence.saves;
  const result = await rejected(store, { seconds: 30, reason: 'Horloge ambiguë' }, {}, 'requires-input');
  assert.ok(result.needsInput?.length > 0, 'l’ancre manquante doit être localisée pour arbitrage');
  assert.equal(persistence.saves, saves);
});

test('E5 campagne indépendant — échéance divine de phase conservée, aucune extension D12 par temps calendrier', async () => {
  const layer = { id: 'divine-pure-phase', actorId: 'author-removed', contractId: 'divine:blessing:myrmidia:battle',
    expiry: { phase: 'endOfTurn', round: 1, actorId: 'author-removed', moment: 'afterEffects' }, effect: 'fixture' };
  const base = person('a', { extensions: { v5: { divineEffects: [layer] } }, states: [{ id: 'phase-turn', name: 'Surpris', duration: 1 }] });
  const { store } = await fixture({ people: [base] }); const before = participant(store);
  const result = await step(store, 86400);
  assert.equal(result.status, 'applied');
  assert.deepEqual(participant(store).extensions.v5.divineEffects, before.extensions.v5.divineEffects);
  assert.deepEqual(participant(store).states, before.states, 'un État de Tour ne reçoit pas une fin de Tour inventée');
  assert.deepEqual(clockOf(store).lastEvent.validatedPhases, []);
  assert.equal(stateOf(store).combat.round, 1);
});

test('E5 campagne indépendant — dépassement sûr de campaignSeconds refuse sans perte de précision', async () => {
  const { store } = await fixture({ people: [person('a')] });
  assert.equal((await step(store, Number.MAX_SAFE_INTEGER)).status, 'applied');
  assert.equal(clockOf(store).campaignSeconds, Number.MAX_SAFE_INTEGER);
  await rejected(store, { seconds: 1, reason: 'Overflow' });
});

test('E5 campagne indépendant — temps PC au rechargement ne produit aucune avance implicite', async () => {
  const { store, persistence } = await fixture(); await step(store, 10);
  const before = stateOf(store), realNow = Date.now;
  try {
    Date.now = () => realNow() + 366 * 86400 * 1000;
    const reloaded = createStore({ persistence, storage: null }); await reloaded.ready;
    assert.deepEqual(clockOf(reloaded), before.extensions.v5.gameClock);
    assert.deepEqual(participant(reloaded), before.combat.participants[0]);
  } finally { Date.now = realNow; }
});

test('E5 campagne indépendant — cadence mixte seconde puis Round puis secondes conserve la minute exacte', async () => {
  const { store } = await fixture({ people: [buffed('a', '1 minute')] });
  await step(store, 1);
  await store.nextTurn();
  assert.equal(clockOf(store).campaignSeconds, 11, 'un seul Round réel ajoute dix secondes');
  assert.equal(effects(participant(store)).length, 1);
  const result = await step(store, 49);
  assert.equal(result.status, 'applied');
  assert.equal(clockOf(store).campaignSeconds, 60);
  assert.equal(effects(participant(store)).length, 0, 'une minute ne gagne pas 0,2 seconde à cause de remainingMinutes arrondi par le Round');
  assert.equal(participant(store).caracs.CC, 40);
});

test('E5 campagne indépendant — incident historique en Rounds traité ou bloqué sans fausse couverture', async () => {
  const subject = person('a', { extensions: { v5: { miscastEffects: [{ id: 'old-round-incident', type: 'fixture', expiresAtRound: 7, durationRounds: 6 }] } } });
  const { store } = await fixture({ people: [subject] });
  const before = stateOf(store), result = await step(store, 60);
  if (result.status === 'requires-input') {
    assert.equal(result.ok, false); assert.ok(result.needsInput?.length); assert.deepEqual(stateOf(store), before);
  } else {
    assert.equal(result.status, 'applied'); assert.equal(result.ok, true);
    assert.deepEqual(participant(store).extensions.v5.miscastEffects, [], 'ne pas annoncer avancé un incident resté intact');
  }
});

test('E5 campagne indépendant — divine avec deadline calendrier doit expirer réellement ou bloquer', async () => {
  const layer = { id: 'divine-calendar', actorId: 'removed', deadline: { kind: 'campaign-time', atSeconds: 60 }, effect: 'fixture' };
  const { store } = await fixture({ people: [person('a', { extensions: { v5: { divineEffects: [layer] } } })] });
  assert.equal(participant(store).extensions.v5.divineEffects.length, 1);
  const before = stateOf(store), result = await step(store, 60);
  if (result.status === 'requires-input') {
    assert.equal(result.ok, false); assert.ok(result.needsInput?.length); assert.deepEqual(stateOf(store), before);
  } else {
    assert.equal(result.status, 'applied'); assert.equal(result.ok, true);
    assert.deepEqual(participant(store).extensions.v5.divineEffects, [], 'la deadline est calendaire, pas une phase à conserver');
  }
});

test('E5 campagne indépendant — copies divergentes même identité durable bloquent plutôt que perdre une couche', async () => {
  const combatant = buffed('a', '2 minutes', { persistentCharacterId: 'pc-a' });
  const canonical = person('pc-a');
  const { store, persistence } = await fixture({ people: [combatant], extra: { persistentCharacters: [canonical] } });
  const saves = persistence.saves;
  const result = await rejected(store, { seconds: 30, reason: 'Même sujet durable divergent' }, {}, 'requires-input');
  assert.ok(result.needsInput?.length > 0);
  assert.equal(persistence.saves, saves);
});

test('E5 campagne indépendant — miroirs exacts même identité durable avancent sans doublon', async () => {
  const combatant = buffed('a', '2 minutes', { persistentCharacterId: 'pc-a' });
  const canonical = { ...structuredClone(combatant), id: 'pc-a' };
  const { store } = await fixture({ people: [combatant], extra: { persistentCharacters: [canonical] } });
  const result = await step(store, 30);
  assert.equal(result.status, 'applied');
  const state = stateOf(store);
  assert.equal(remaining(state.combat.participants[0]), 1.5);
  assert.equal(remaining(state.persistentCharacters[0]), 1.5, 'le miroir durable ne reçoit pas deux soustractions');
});

test('E5 campagne indépendant — talent expire aussi à 60 secondes fractionnées exactes', async () => {
  const marker = { id: 'talent-minute', name: 'Talent temporaire', kind: 'talent-active', remainingMinutes: 1 };
  const { store } = await fixture({ people: [person('a', { states: [marker] })] });
  assert.equal(participant(store).states.length, 1);
  for (let i = 0; i < 60; i++) assert.equal((await step(store, 1)).status, 'applied');
  assert.equal(participant(store).states.length, 0, 'le talent ne survit pas une seconde de plus par résidu flottant');
});

test('E5 campagne indépendant — incident réel expire aussi à 60 secondes fractionnées exactes', async () => {
  const { store } = await fixture({ people: [person('a')] });
  const preview = store.previewMiscast({ severity: 'MAJOR', roll: 18, secondaryRolls: { duration: 1 }, usedTalent: { id: 'talent-arcane-magic', lore: null } });
  assert.equal(preview.ready, true); await store.applyMiscast(preview, { actorId: 'a' });
  assert.equal(participant(store).extensions.v5.miscastEffects[0].remainingMinutes, 1);
  for (let i = 0; i < 60; i++) assert.equal((await step(store, 1)).status, 'applied');
  assert.deepEqual(participant(store).extensions.v5.miscastEffects, [], 'l’incident ne survit pas une seconde de plus par résidu flottant');
});

test('E5 campagne indépendant — Forme bestiale expire aussi à 60 secondes fractionnées exactes', async () => {
  const transformed = applyBeastForm(person('a'), BEAST_PROFILES.wolf, { round: 1, durationMinutes: 1 }).participant;
  const { store } = await fixture({ people: [transformed] });
  assert.equal(participant(store).extensions.v5.beastForm.remainingMinutes, 1);
  for (let i = 0; i < 60; i++) assert.equal((await step(store, 1)).status, 'applied');
  assert.equal(participant(store).extensions.v5.beastForm, undefined, 'la forme ne survit pas une seconde de plus par résidu flottant');
  assert.equal(participant(store).caracs.F, 30, 'le vrai profil initial doit revenir');
});

test('E5 campagne indépendant — deadline divine calendrier invalide ne disparaît pas du contrôle', async () => {
  const layer = { id: 'bad-divine-clock', deadline: { kind: 'campaign-time', atSeconds: 0.5 }, effect: 'fixture' };
  const { store } = await fixture({ people: [person('a', { extensions: { v5: { divineEffects: [layer] } } })] });
  assert.equal(participant(store).extensions.v5.divineEffects[0].deadline.atSeconds, 0.5);
  const result = await rejected(store, { seconds: 60, reason: 'Échéance invalide' }, {}, 'requires-input');
  assert.ok(result.needsInput?.length > 0);
});

test('E5 campagne indépendant — Forme historique sans restant traitée ou bloquée sans ancre inventée', async () => {
  const transformed = applyBeastForm(person('a'), BEAST_PROFILES.wolf, { round: 1, durationMinutes: 1 }).participant;
  delete transformed.extensions.v5.beastForm.remainingMinutes;
  const { store } = await fixture({ people: [transformed] });
  assert.equal(participant(store).extensions.v5.beastForm.remainingMinutes, undefined);
  const before = stateOf(store), result = await step(store, 60);
  if (result.status === 'requires-input') {
    assert.equal(result.ok, false); assert.ok(result.needsInput?.length); assert.deepEqual(stateOf(store), before);
  } else {
    assert.equal(result.status, 'applied'); assert.equal(result.ok, true);
    assert.equal(participant(store).extensions.v5.beastForm, undefined, 'ne pas annoncer traitée une forme calendaire ignorée');
    assert.equal(participant(store).caracs.F, 30);
  }
});

test('E5 campagne indépendant — burnout temporaire sans durée bloque avec besoin localisé', async () => {
  const { store } = await fixture({ people: [person('a', { extensions: { v5: { burnout: { active: true, permanent: false } } } })] });
  assert.equal(participant(store).extensions.v5.burnout.days, undefined);
  const result = await rejected(store, { seconds: 60, reason: 'Durée burnout absente' }, {}, 'requires-input');
  assert.ok(result.needsInput?.some(item => String(item.path).includes('burnout')));
});

test('E5 campagne indépendant — chaque réponse legacy conserve son reçu malgré une deuxième commande avant microtask', async () => {
  const store = createStore({ storage: null }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants: [] }, log: [], diceLines: [] });
  const firstId = 'clock-v1:0:legacy-receipt-first', secondId = 'clock-v1:1:legacy-receipt-second';
  const firstPromise = store.advanceCampaignTime({ seconds: 30, reason: 'Première commande', eventId: firstId, clockBaseRevision: 0 });
  const secondPromise = store.advanceCampaignTime({ seconds: 60, reason: 'Deuxième commande', eventId: secondId, clockBaseRevision: 1 });
  const [first, second] = await Promise.all([firstPromise, secondPromise]);
  assert.equal(first.status, 'applied'); assert.equal(second.status, 'applied');
  assert.equal(first.receipt.id, firstId, 'la première réponse ne doit pas lire lastEvent de la commande suivante');
  assert.equal(second.receipt.id, secondId);
  assert.equal(first.clock.revision, 1); assert.equal(first.clock.campaignSeconds, 30);
  assert.equal(second.clock.revision, 2); assert.equal(second.clock.campaignSeconds, 90);
});

test('E5 campagne indépendant — divergence durable en scène suspendue bloque aussi toute avance', async () => {
  const suspended = buffed('sleeping', '2 minutes', { persistentCharacterId: 'pc-sleeping' });
  const scene = { id: 'sleeping-durable', encounterId: 'enc-sleeping', title: 'Durable suspendu', status: 'suspended',
    round: 1, currentActorId: suspended.id, order: [suspended.id], participants: [suspended], extensions: { v5: { turnIndex: 1 } } };
  const { store } = await fixture({ extra: { persistentCharacters: [person('pc-sleeping')], suspendedScenes: [scene] } });
  assert.equal(stateOf(store).suspendedScenes[0].participants[0].persistentCharacterId, 'pc-sleeping');
  const result = await rejected(store, { seconds: 30, reason: 'Durable suspendu divergent' }, {}, 'requires-input');
  assert.ok(result.needsInput?.some(item => String(item.path).includes('suspendedScenes')));
});

for (const refuses of [false, true]) {
  test(`E5 campagne indépendant — backend localStorage non atomique bloque sans écritures (refus=${refuses})`, async () => {
    let writes = 0, deny = false;
    const storage = { getItem() { return null; }, setItem() { writes++; if (deny) throw new Error('QuotaExceededError controlled'); }, removeItem() { writes++; } };
    const store = createStore({ storage }); await store.ready;
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'a', order: ['a'], participants: [buffed('a')] }, log: [], diceLines: [] });
    const before = stateOf(store), writesBefore = writes; deny = refuses;
    const result = await store.advanceCampaignTime({ seconds: 30, reason: 'Contrôle backend legacy' });
    assert.equal(result.ok, false, 'ne pas prétendre atomique un backend multi-clefs');
    assert.equal(result.status, 'requires-input');
    assert.ok(result.needsInput?.some(item => /stock|persist|storage/i.test(String(item.path) + String(item.message))));
    assert.deepEqual(stateOf(store), before);
    assert.equal(writes, writesBefore, 'détecter la capacité avant toute écriture, même si setItem refuserait');
  });
}

function campaignRemoteFixture() {
  const state = { schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants: [] } };
  const advanced = advanceGameClock(createGameClock(state), { id: 'clock-v1:0:remote-campaign-independent', baseRevision: 0,
    kind: 'campaign-time-advance', seconds: 30, reason: 'Avance distante contrôlée' });
  assert.equal(advanced.ok, true);
  state.extensions = { v5: { gameClock: advanced.clock } };
  return { canonical: { revision: 1, receipts: {}, state }, clock: structuredClone(advanced.clock) };
}

test('E5 campagne indépendant — codec RTDB rétablit seulement phases vides attestées du reçu campagne', () => {
  const { canonical, clock } = campaignRemoteFixture();
  const raw = structuredClone(canonical); delete raw.state.extensions.v5.gameClock.lastEvent.validatedPhases;
  assert.throws(() => validateSyncDocument(raw), /clock|reçu|phases/i, 'l’import/protocole local reste strict');
  const decoded = normalizeRemoteDocument(raw);
  assert.deepEqual(decoded.state.extensions.v5.gameClock, clock);
});

test('E5 campagne indépendant — codec ne répare pas un reçu campagne dont l’empreinte est invalide', () => {
  const { canonical } = campaignRemoteFixture();
  delete canonical.state.extensions.v5.gameClock.lastEvent.validatedPhases;
  canonical.state.extensions.v5.gameClock.lastEvent.payloadFingerprint = canonical.state.extensions.v5.gameClock.lastEvent.payloadFingerprint.replace('"seconds":30', '"seconds":0');
  assert.throws(() => normalizeRemoteDocument(canonical), /clock|reçu|phases|campagne/i);
});

test('E5 campagne indépendant — codec ne répare pas un reçu campagne d’une autre identité', () => {
  const { canonical } = campaignRemoteFixture();
  delete canonical.state.extensions.v5.gameClock.lastEvent.validatedPhases;
  canonical.state.extensions.v5.gameClock.lastEvent.id = 'clock-v1:0:forged-other';
  assert.throws(() => normalizeRemoteDocument(canonical), /clock|reçu|phases|empreinte/i);
});

test('E5 campagne indépendant — codec restaure phases vides et coordonnées null omises ensemble par RTDB', () => {
  const { canonical, clock } = campaignRemoteFixture();
  delete canonical.state.extensions.v5.gameClock.lastEvent.validatedPhases;
  delete canonical.state.extensions.v5.gameClock.combat.sceneId;
  delete canonical.state.extensions.v5.gameClock.combat.currentActorId;
  delete canonical.state.combat.currentActorId;
  assert.deepEqual(normalizeRemoteDocument(canonical).state.extensions.v5.gameClock, clock);
});

async function assertMixedMinute(store, isExpired, label) {
  await store.nextTurn();
  assert.equal(clockOf(store).campaignSeconds, 10, 'un vrai Round fait dix secondes de temps commun');
  const before = stateOf(store), result = await step(store, 50);
  if (result.status === 'requires-input') {
    assert.equal(result.ok, false); assert.ok(result.needsInput?.length > 0);
    assert.deepEqual(stateOf(store), before, `${label} : aucun faux avancement partiel`);
  } else {
    assert.equal(result.status, 'applied'); assert.equal(result.ok, true);
    assert.equal(clockOf(store).campaignSeconds, 60);
    assert.equal(isExpired(participant(store)), true, `${label} : le Round ne peut pas laisser dix secondes de plus au compteur`);
  }
}

test('E5 campagne indépendant — cadence mixte incident une minute compte le vrai Round ou bloque', async () => {
  const { store } = await fixture({ people: [person('a')] });
  const preview = store.previewMiscast({ severity: 'MAJOR', roll: 18, secondaryRolls: { duration: 1 }, usedTalent: { id: 'talent-arcane-magic', lore: null } });
  assert.equal(preview.ready, true); await store.applyMiscast(preview, { actorId: 'a' });
  const effect = participant(store).extensions.v5.miscastEffects[0];
  assert.equal(effect.remainingMinutes, 1); assert.equal(effect.expiresAtRound, 7);
  await assertMixedMinute(store, row => row.extensions.v5.miscastEffects.length === 0, 'Incident');
});

test('E5 campagne indépendant — cadence mixte Forme une minute compte le vrai Round ou bloque', async () => {
  const transformed = applyBeastForm(person('a'), BEAST_PROFILES.wolf, { round: 1, durationMinutes: 1 }).participant;
  const { store } = await fixture({ people: [transformed] });
  assert.equal(participant(store).extensions.v5.beastForm.expiresAtRound, 7);
  await assertMixedMinute(store, row => row.extensions.v5.beastForm === undefined && row.caracs.F === 30, 'Forme');
});

test('E5 campagne indépendant — cadence mixte talent sans ancre compte le Round ou bloque clairement', async () => {
  const marker = { id: 'talent-mixed-minute', name: 'Talent temporaire', kind: 'talent-active', remainingMinutes: 1 };
  const { store } = await fixture({ people: [person('a', { states: [marker] })] });
  assert.equal(participant(store).states.length, 1);
  await assertMixedMinute(store, row => row.states.length === 0, 'Talent');
});

test('E5 campagne indépendant — cadence mixte garde cohérents les miroirs durables exacts après réconciliation', async () => {
  const { store } = await fixture({ people: [person('a')] });
  const preview = store.previewMiscast({ severity: 'MAJOR', roll: 18, secondaryRolls: { duration: 1 }, usedTalent: { id: 'talent-arcane-magic', lore: null } });
  await store.applyMiscast(preview, { actorId: 'a' });
  await store.executeCommand('independent-fixture-durable-mirror', draft => {
    draft.combat.participants[0].persistentCharacterId = 'pc-a';
    draft.persistentCharacters = [{ ...structuredClone(draft.combat.participants[0]), id: 'pc-a' }];
    return draft;
  });
  await store.nextTurn();
  const before = stateOf(store), result = await step(store, 50);
  if (result.status === 'requires-input') {
    assert.equal(result.ok, false); assert.ok(result.needsInput?.length); assert.deepEqual(stateOf(store), before);
  } else {
    assert.equal(result.status, 'applied');
    assert.equal(participant(store).extensions.v5.miscastEffects.length, 0);
    assert.equal(stateOf(store).persistentCharacters[0].extensions.v5.miscastEffects.length, 0,
      'une réconciliation combat ne doit pas produire un miroir durable divergent');
  }
});

test('E5 campagne indépendant — Round du combat actif ne fait pas expirer les durées des sujets hors scène', async () => {
  const offScene = id => person(id, { extensions: { v5: { miscastEffects: [{ id: 'off-scene-' + id, appliedAtRound: 1, expiresAtRound: 13, remainingMinutes: 2 }] } } });
  const active = person('a');
  const { store } = await fixture({ people: [active], extra: {
    combat: { round: 100, currentActorId: 'a', order: ['a'], participants: [active] },
    reserve: [offScene('reserve-off-scene')], persistentCharacters: [offScene('persistent-off-scene')]
  } });
  const before = stateOf(store), result = await step(store, 30);
  if (result.status === 'requires-input') {
    assert.equal(result.ok, false); assert.ok(result.needsInput?.length); assert.deepEqual(stateOf(store), before);
  } else {
    assert.equal(result.status, 'applied');
    for (const row of [stateOf(store).reserve[0], stateOf(store).persistentCharacters[0]]) {
      assert.equal(row.extensions.v5.miscastEffects.length, 1, 'le Round d’un autre contexte ne constitue pas une échéance du sujet hors scène');
      assert.equal(row.extensions.v5.miscastEffects[0].remainingMinutes, 1.5);
    }
  }
});

test('E5 campagne indépendant — incident réconcilié ne recompte pas le même Round à la seconde avance', async () => {
  const { store } = await fixture({ people: [person('a')] });
  const preview = store.previewMiscast({ severity: 'MAJOR', roll: 18, secondaryRolls: { duration: 2 }, usedTalent: { id: 'talent-arcane-magic', lore: null } });
  await store.applyMiscast(preview, { actorId: 'a' });
  await store.nextTurn();
  assert.equal((await step(store, 30)).status, 'applied');
  assert.ok(Math.abs(participant(store).extensions.v5.miscastEffects[0].remainingMinutes - 80 / 60) < 1e-12);
  const result = await step(store, 30);
  assert.equal(result.status, 'applied', 'la première commande a déjà imputé le Round, pas d’ambiguïté créée par la seconde');
  assert.ok(Math.abs(participant(store).extensions.v5.miscastEffects[0].remainingMinutes - 50 / 60) < 1e-12);
  assert.equal(clockOf(store).campaignSeconds, 70);
});

for (const manualRound of [2, 100]) {
test(`E5 campagne indépendant — changement manuel de Round ${manualRound} ne devient pas du temps imputé aux incidents`, async () => {
  const { store } = await fixture({ people: [person('a')] });
  const preview = store.previewMiscast({ severity: 'MAJOR', roll: 18, secondaryRolls: { duration: 2 }, usedTalent: { id: 'talent-arcane-magic', lore: null } });
  await store.applyMiscast(preview, { actorId: 'a' });
  await store.setRoundTurn(manualRound, 'a');
  assert.equal(clockOf(store).campaignSeconds, 0, 'une mutation de gestion est temporellement neutre');
  assert.equal(participant(store).extensions.v5.miscastEffects.length, 1, 'changer la position manuellement ne supprime pas un incident');
  assert.equal(participant(store).extensions.v5.miscastEffects[0].remainingMinutes, 2);
  const before = stateOf(store), result = await step(store, 30);
  if (result.status === 'requires-input') {
    assert.equal(result.ok, false); assert.ok(result.needsInput?.length); assert.deepEqual(stateOf(store), before);
  } else {
    assert.equal(result.status, 'applied');
    assert.equal(participant(store).extensions.v5.miscastEffects.length, 1, 'ne pas convertir les Rounds de gestion en durée écoulée');
    assert.equal(participant(store).extensions.v5.miscastEffects[0].remainingMinutes, 1.5);
    assert.equal(clockOf(store).campaignSeconds, 30);
  }
});

}

test('E5 campagne indépendant — reçu actif ne prouve pas le changement de Round d’une scène suspendue', async () => {
  const sleeping = person('sleeper', { extensions: { v5: { miscastEffects: [{ id: 'suspended-unattested', appliedAtRound: 1, expiresAtRound: 13, remainingMinutes: 2 }] } } });
  const scene = { id: 'scene-sleeping-other', encounterId: 'enc-sleeping-other', title: 'Autre contexte', status: 'suspended',
    round: 2, currentActorId: sleeping.id, order: [sleeping.id], participants: [sleeping], extensions: { v5: { turnIndex: 3 } } };
  const { store } = await fixture({ people: [person('a')], extra: { suspendedScenes: [scene] } });
  await store.nextTurn();
  assert.equal(clockOf(store).campaignSeconds, 10);
  assert.equal(clockOf(store).combat.round, 2, 'seul le contexte actif a réellement traversé ce Round');
  const before = stateOf(store), result = await step(store, 30);
  if (result.status === 'requires-input') {
    assert.equal(result.ok, false); assert.ok(result.needsInput?.length); assert.deepEqual(stateOf(store), before);
  } else {
    assert.equal(result.status, 'applied');
    assert.equal(stateOf(store).suspendedScenes[0].participants[0].extensions.v5.miscastEffects[0].remainingMinutes, 1.5,
      'un reçu actif de même numéro ne prouve pas la durée du contexte suspendu');
  }
});

test('E5 campagne indépendant — setter mémoire neutre, réponse clock exacte et rejet stale sans expiration', async () => {
  const store = createStore({ storage: null }); await store.ready;
  const hero = person('a', { states: [{ id: 'phase-memory', name: 'Surpris', duration: 1 }] });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'a', order: ['a'], participants: [hero] }, log: [], diceLines: [] });
  const initial = clockOf(store), statesBefore = participant(store).states;
  await store.setRoundTurn(2, 'a');
  assert.equal(clockOf(store).combat.round, 2);
  assert.equal(clockOf(store).campaignSeconds, initial.campaignSeconds);
  assert.equal(clockOf(store).revision, initial.revision);
  assert.deepEqual(participant(store).states, statesBefore);
  const applied = await step(store, 30);
  assert.equal(applied.status, 'applied');
  assert.deepEqual(applied.clock, clockOf(store), 'la clock renvoyée est bien celle de la commande après le setter mémoire');
  assert.deepEqual(applied.receipt, clockOf(store).lastEvent);
  assert.deepEqual(participant(store).states, statesBefore);
  await rejected(store, { seconds: 30, reason: 'Ancienne base mémoire', eventId: 'clock-v1:0:memory-stale', clockBaseRevision: 0 }, {}, 'stale');
});
});

describe('horloge et Rounds — contrôle indépendant (E5)', () => {
const BATTLE = 'divine:blessing:myrmidia:battle';
const contracts = getAllDivineContracts();
const actor = (id, extra = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: id === 'priest' ? 60 : 30,
  hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [
    { id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' },
    { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Myrmidia' }
  ],
  prayers: contracts.filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 }, channelling: { type: 'winds', sl: 17 } } },
  ...extra
});

function memoryPersistence({ failSaves = false } = {}) {
  let saved = null;
  let refuse = false;
  return {
    async load() { return saved && structuredClone(saved); },
    setRefuse(value) { refuse = value; },
    async saveAtomic({ state }) {
      if (failSaves || refuse) return { ok: false, error: 'refus de test' };
      saved = structuredClone(state);
      return { ok: true };
    }
  };
}

async function fixture({ scene = false, persistence = memoryPersistence() } = {}) {
  const priest = actor('priest'), ally = actor('ally');
  const combat = { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [priest, ally] };
  const snapshot = {
    schemaVersion: 3, reserve: [], combat, log: [], diceLines: [],
    extensions: { v5: { turnIndex: 1 } }
  };
  if (scene) {
    snapshot.activeScene = {
      id: 'scene-e5', encounterId: 'encounter-e5', title: 'Scène E5', status: 'active',
      round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [priest, ally],
      extensions: { v5: { turnIndex: 1 } }
    };
    snapshot.suspendedScenes = [];
    snapshot.encounters = [{ id: 'encounter-e5', status: 'active' }];
  }
  const store = createStore({ persistence });
  await store.ready;
  await store.loadFromJSON(snapshot);
  const prayerInput = {
    actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true,
    choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    facts: { targets: { ally: { withinRange: true, ally: true } } },
    expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest', moment: 'afterEffects' }
  };
  const preview = store.previewDivineExecution(BATTLE, prayerInput);
  assert.equal(preview.ready, true, preview.error);
  await store.applyDivineExecution(BATTLE, { preview });
  // The fixture keeps an otherwise source-valid layer while pinning its phase deadline
  // to Round 1 so the forbidden synthetic phase is observable in this one-command test.
  const target = store.listParticipants().find(row => row.id === 'ally');
  const v5 = target.extensions.v5;
  await store.updateParticipant('ally', {
    extensions: { ...target.extensions, v5: {
      ...v5,
      divineEffects: v5.divineEffects.map(layer => ({ ...layer, expiry: {
        phase: 'endOfTurn', round: 1, actorId: 'priest', moment: 'afterEffects'
      } }))
    } }
  });
  return store;
}

const activeDivineLayers = store => {
  const state = JSON.parse(store.getFullJSON());
  const participants = [
    ...(state.combat?.participants || []),
    ...(state.activeScene?.participants || []),
    ...(state.suspendedScenes || []).flatMap(scene => scene.participants || [])
  ];
  return participants.flatMap(row => row.extensions?.v5?.divineEffects || []);
};

test('E5 indépendant — changer manuellement Round/acteur ne simule pas la fin du Tour précédent', async () => {
  const store = await fixture();
  assert.equal(activeDivineLayers(store).length, 1);
  await store.setRoundTurn(2, 'ally');
  assert.equal(activeDivineLayers(store).length, 1,
    'setRoundTurn est une mutation de position; il ne doit pas fabriquer endOfTurn Round 1');
});

test('E5 indépendant — retirer l’acteur courant ne simule pas une phase de fin de Tour', async () => {
  const store = await fixture();
  await store.removeParticipant('priest');
  assert.equal(activeDivineLayers(store).length, 1,
    'le retrait de combat ne doit pas appeler expireDivineEffects sur un endOfTurn inféré');
});

test('E5 indépendant — suspendre une scène ne fabrique pas de phase temporelle', async () => {
  const store = await fixture({ scene: true });
  await store.suspendActiveScene();
  assert.equal(activeDivineLayers(store).length, 1,
    'la suspension déplace la scène; elle n’est ni un Tour ni une expiration');
  assert.equal(store.listSuspendedScenes().length, 1);
});

test('E5 indépendant — suspendre/reprendre réconcilie la projection sans créer un Tour ni du temps', async () => {
  const store = await fixture({ scene: true });
  const before = JSON.parse(store.getFullJSON()).extensions.v5.gameClock;
  await store.suspendActiveScene();
  const suspended = JSON.parse(store.getFullJSON());
  assert.equal(suspended.extensions.v5.gameClock.campaignSeconds, before.campaignSeconds);
  assert.equal(suspended.extensions.v5.gameClock.revision, before.revision);
  assert.equal(store.listSuspendedScenes()[0].participants.find(row => row.id === 'ally').extensions.v5.divineEffects.length,
    1, 'suspendre conserve la couche en attente de la reprise');

  const scene = store.listSuspendedScenes()[0];
  await store.resumeScene(scene.id);
  const resumed = JSON.parse(store.getFullJSON());
  const projectedPosition = readCombatPosition(resumed);
  assert.deepEqual(resumed.extensions.v5.gameClock.combat, projectedPosition,
    'la position canonique est réconciliée après reprise sans exiger une transition temporelle');
  assert.equal(resumed.extensions.v5.gameClock.campaignSeconds, before.campaignSeconds,
    'une reprise ne fabrique pas de temps de campagne');
  assert.equal(resumed.extensions.v5.gameClock.revision, before.revision,
    'une reprise ne fabrique pas de révision d’horloge');
  assert.equal(store.getActiveScene().participants.find(row => row.id === 'ally').extensions.v5.divineEffects.length, 1);
  await store.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'ally', 'une vraie commande suivante fonctionne après la reprise');
  assert.equal(store.getActiveScene().participants.find(row => row.id === 'ally').extensions.v5.divineEffects.length, 0,
    'la vraie transition expire la couche seulement à son échéance validée');
});

test('E5 indépendant — modifier la piste d’ordre sans transition conserve les échéances', async () => {
  const store = await fixture();
  const beforeClock = JSON.parse(store.getFullJSON()).extensions.v5.gameClock;
  await store.moveInOrder('ally', 'priest');
  await store.setOrderMode('manual');
  assert.equal(activeDivineLayers(store).length, 1,
    'l’ordre de la piste ne produit pas de phases end/start de Tour');
  assert.deepEqual(JSON.parse(store.getFullJSON()).extensions.v5.gameClock, beforeClock,
    'le réordonnancement ne révisionne pas ni n’avance l’horloge');
});

test('E5 indépendant — une vraie transition legacy nextTurn traverse les phases et expire au moment dû', async () => {
  const store = await fixture();
  await store.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'ally');
  assert.equal(activeDivineLayers(store).length, 0,
    'la même échéance endOfTurn est traitée par la vraie commande nextTurn');
});

test('E5 indépendant — le chemin end-turn-v5 compare la coordonnée explicite expiry.turn', async () => {
  const store = await fixture();
  const target = store.listParticipants().find(row => row.id === 'ally');
  const v5 = target.extensions.v5;
  await store.updateParticipant('ally', {
    extensions: { ...target.extensions, v5: {
      ...v5,
      divineEffects: v5.divineEffects.map(layer => ({ ...layer, expiry: {
        phase: 'endOfTurn', round: 1, actorId: 'priest', turn: 1, moment: 'afterEffects'
      } }))
    } }
  });
  const preview = createCombatEngine(store).previewNextTurn();
  assert.equal(preview.ready, true, preview.error);
  const projectedLayers = preview.state.combat.participants.flatMap(row => row.extensions?.v5?.divineEffects || []);
  assert.equal(projectedLayers.length, 0,
    'le vrai plan V5 doit transmettre `turn` depuis turnIndex aux expirations divines');
});

test('E5 indépendant — le chemin Store legacy conserve ses effets et ne demande ni dé ni mécanique V5', async () => {
  const store = await fixture();
  await store.setRoundTurn(1, 'ally');
  await store.updateParticipant('priest', { states: [{ name: 'Enflammé', level: 1 }], hp: 20 });
  const before = JSON.parse(store.getFullJSON());
  const result = await store.nextTurn();
  assert.notEqual(result?.ok, false, 'la transition legacy reste utilisable sans fournir un d10 V5');
  const after = JSON.parse(store.getFullJSON());
  assert.equal(after.combat.round, 2, 'la transition réellement passée ouvre le Round suivant');
  assert.equal(after.combat.currentActorId, 'priest');
  assert.deepEqual(after.combat.participants.find(row => row.id === 'priest').states,
    before.combat.participants.find(row => row.id === 'priest').states,
    'le legacy ne déclenche pas le dommage de Feu ni les acquisitions de previewV5Turn');
  assert.equal(after.combat.participants.find(row => row.id === 'priest').hp, 20);
  assert.deepEqual(after.diceLines, before.diceLines,
    'l’horloge commune n’injecte pas les demandes de dés du moteur V5 dans Store.nextTurn');
});

test('E5 indépendant — les sorts sans auteur expirent au premier Round d’arrivée et Undo restaure une seule transition', async () => {
  const mage = actor('mage', { talents: [{ id: 'talent-mind-over-body', status: 'resolved', rank: 3 }] });
  const enemy = actor('enemy');
  const store = createStore();
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: {
    round: 1, currentActorId: 'mage', order: ['mage', 'enemy'], participants: [mage, enemy]
  }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  await store.setFortune('mage', 2);
  await store.applyMagicMeditation({ actorId: 'mage', talentId: 'talent-mind-over-body',
    name: 'L’esprit sur le corps', minutes: 20, roll: 50, durationRolls: [1, 1] });
  await store.activateMindOverBody('mage');
  const effectBefore = store.listParticipants().find(row => row.id === 'mage').extensions.v5.spellEffects
    .find(row => row.magicTalentId === 'talent-mind-over-body');
  assert.equal(effectBefore.casterId, undefined, 'la fixture utilise bien le chemin historique sans auteur');
  await store.advanceTalentMinutes(119 + 5 / 6);
  const beforeTurn = JSON.parse(store.getFullJSON());
  assert.ok(beforeTurn.combat.participants.find(row => row.id === 'mage').extensions.v5.spellEffects
    .some(row => row.magicTalentId === 'talent-mind-over-body'));

  await store.nextTurn();
  const expired = JSON.parse(store.getFullJSON());
  assert.equal(expired.combat.round, 2, 'le Tour passe réellement au premier Round d’arrivée');
  assert.equal(expired.extensions.v5.gameClock.revision, beforeTurn.extensions.v5.gameClock.revision + 1);
  assert.equal(expired.extensions.v5.gameClock.campaignSeconds, beforeTurn.extensions.v5.gameClock.campaignSeconds + 10);
  assert.equal(expired.combat.participants.find(row => row.id === 'mage').extensions.v5.spellEffects
    .some(row => row.magicTalentId === 'talent-mind-over-body'), false,
  'l’effet sans auteur suit l’échéance du premier Round d’arrivée, pas un Tour supplémentaire');
  assert.equal(store.getFortune('mage').balance, 1);

  await store.undo();
  const restored = JSON.parse(store.getFullJSON());
  assert.ok(restored.combat.participants.find(row => row.id === 'mage').extensions.v5.spellEffects
    .some(row => row.magicTalentId === 'talent-mind-over-body' && row.ignoreCriticalPenalties));
  assert.deepEqual(restored.extensions.v5.gameClock, beforeTurn.extensions.v5.gameClock,
    'Undo annule ensemble l’expiration et le reçu/position d’horloge de cette transition');
  assert.equal(store.getFortune('mage').balance, 1, 'annuler la transition ne rembourse pas la Chance dépensée antérieurement');
});

test('E5 indépendant — un auteur divin absent ne reçoit pas le repli D-12 réservé aux sorts', async () => {
  const store = await fixture();
  const target = store.listParticipants().find(row => row.id === 'ally');
  const v5 = target.extensions.v5;
  await store.updateParticipant('ally', {
    extensions: { ...target.extensions, v5: {
      ...v5,
      divineEffects: v5.divineEffects.map(layer => ({ ...layer, expiry: {
        phase: 'endOfTurn', round: 1, actorId: 'removed-author', moment: 'afterEffects'
      } }))
    } }
  });
  await store.nextTurn();
  assert.equal(activeDivineLayers(store).length, 1,
    'un Tour réel d’un autre personnage ne satisfait pas silencieusement l’échéance d’auteur d’une prière');
});

test('E5 indépendant — un CAS n’accepte que le plan canonique exact, sans phases injectées', () => {
  const initial = createGameClock({ combat: { round: 1, currentActorId: 'a' }, extensions: { v5: { turnIndex: 3 } } });
  const from = initial.combat;
  const to = { ...from, currentActorId: 'b', turnIndex: 4 };
  const phases = deriveTurnPhasePlan({ from, to });
  const event = { id: 'clock-v1:0:independent-turn', baseRevision: 0, kind: 'combat-transition', sceneId: null, from, to, phases };
  const accepted = advanceGameClock(initial, event);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.clock.campaignSeconds, 0, 'un changement de Tour dans le même Round n’ajoute aucune seconde');

  const forged = [
    { ...event, phases: [...phases].reverse() },
    { ...event, phases: [...phases, { index: phases.length, phase: 'attackAttempt' }] },
    { ...event, id: 'independent:turn:1' },
    { ...event, id: 'clock-v1:1:wrong-base-encoded' },
    { ...event, sceneId: 'different-scene' },
    { ...event, from: { ...from, currentActorId: 'intruder' } },
    { ...event, to: { ...to, round: 3 } }
  ];
  for (const attempt of forged) {
    const result = advanceGameClock(initial, attempt);
    assert.equal(result.ok, false, 'ID non versionné, base intégrée divergente, phase absente ou transition forgée rejetés');
    assert.deepEqual(result.clock, initial, 'un rejet ne modifie pas la clock de départ');
  }
  assert.throws(() => validateGameClock({ ...accepted.clock, lastEvent: null }), /reçu de clock requis/i,
    'une clock de révision non initiale ne peut pas supprimer son reçu de dernière transition');
  assert.equal(advanceGameClock(accepted.clock, { ...event, to: { ...to, currentActorId: 'c' } }).status, 'conflict',
    'réutiliser l’ID avec un payload différent n’avance jamais une seconde fois');
});

test('E5 indépendant — seul un Round réellement franchi ajoute une fois dix secondes, et un ancien retry reste stale', () => {
  const initial = createGameClock({ combat: { round: 4, currentActorId: 'b' }, extensions: { v5: { turnIndex: 10 } } });
  const from = initial.combat;
  const to = { ...from, round: 5, turnIndex: 11, currentActorId: 'a' };
  const event = { id: 'clock-v1:0:independent-round', baseRevision: 0, kind: 'combat-transition', sceneId: null, from, to,
    phases: deriveTurnPhasePlan({ from, to }) };
  const advanced = advanceGameClock(initial, event);
  assert.equal(advanced.elapsedSeconds, 10);
  assert.equal(advanced.clock.campaignSeconds, 10,
    'un Round complet ajoute dix secondes, pas une durée par combattant');
  const later = advanceGameClock(advanced.clock, {
    id: 'clock-v1:1:independent-campaign', baseRevision: 1, kind: 'campaign-time-advance', seconds: 60, reason: 'Avance confirmée par le MJ'
  });
  assert.equal(later.clock.campaignSeconds, 70);
  assert.equal(advanceGameClock(later.clock, event).status, 'stale',
    'un replay d’une commande antérieure après une révision nouvelle est périmé');
});

test('E5 indépendant — migration initialise une horloge zéro sans réécrire les couches héritées ni extensions inconnues', () => {
  const legacyLayer = { id: 'legacy-effect', remainingMinutes: 12, expiresAtRound: 9,
    extensionField: { preserve: true } };
  const source = {
    schemaVersion: 3, reserve: [], combat: { round: 3, currentActorId: 'actor', order: ['actor'], participants: [{
      id: 'actor', name: 'A', zone: 'active', states: [],
      extensions: { v5: { spellEffects: [structuredClone(legacyLayer)], unknownFeature: { keep: 'yes' } } }
    }] },
    extensions: { v5: { turnIndex: 7, unknownClockNeighbour: { keep: 'yes' } } }
  };
  const before = structuredClone(source);
  const migrated = migrateSnapshot(source).data;
  assert.deepEqual(source, before, 'migration ne mutile pas le snapshot reçu');
  assert.equal(migrated.extensions.v5.gameClock.campaignSeconds, 0,
    'l’absence historique de clock n’importe aucun temps réel écoulé');
  assert.deepEqual(migrated.extensions.v5.gameClock.combat,
    { sceneId: null, round: 3, turnIndex: 7, currentActorId: 'actor' });
  const participant = migrated.combat.participants[0];
  assert.deepEqual(participant.extensions.v5.spellEffects[0], legacyLayer,
    'les anciennes représentations de durée restent intactes pendant cette initialisation');
  assert.deepEqual(participant.extensions.v5.unknownFeature, { keep: 'yes' });
  assert.deepEqual(migrated.extensions.v5.unknownClockNeighbour, { keep: 'yes' });
  assert.equal(sanitizeMagicEnvelope({ reserve: [], combat: { participants: [] } }).extensions, undefined,
    'la sanitation générique ne crée pas de clock sur une enveloppe protocole vide');
  assert.throws(() => validateGameClock({ ...migrated.extensions.v5.gameClock, campaignSeconds: -1 }), /clock/i);
});

test('E5 indépendant — réconcilier une scène reprise ou un index manuel ne crée ni phase ni durée', () => {
  const original = createGameClock({ combat: { round: 1, currentActorId: 'a' }, extensions: { v5: { turnIndex: 2 } } });
  const resumed = reconcileGameClockPosition(original, { sceneId: 'resumed-scene', round: 0, turnIndex: 2, currentActorId: null });
  assert.equal(resumed.changed, true);
  assert.equal(resumed.clock.campaignSeconds, 0);
  assert.equal(resumed.clock.revision, 0);
  assert.equal(resumed.clock.lastEvent, null);
  assert.deepEqual(resumed.clock.combat, { sceneId: 'resumed-scene', round: 0, turnIndex: 2, currentActorId: null });
  const editedIndex = reconcileGameClockPosition(resumed.clock,
    { ...resumed.clock.combat, turnIndex: 15, currentActorId: 'a' });
  assert.equal(editedIndex.clock.campaignSeconds, 0);
  assert.equal(editedIndex.clock.revision, 0);
  assert.deepEqual(readCombatPosition({ activeScene: { id: 'held', status: 'suspended', extensions: { v5: { turnIndex: 42 } } },
    combat: { round: 0, currentActorId: null }, extensions: { v5: { turnIndex: 4 } } }),
  { sceneId: null, round: 0, turnIndex: 4, currentActorId: null }, 'une scène suspendue ne devient pas la position active');
});

test('E5 indépendant — prévisualiser une transition est pure et ne consomme ni clock ni couche', async () => {
  const store = await fixture();
  const before = JSON.parse(store.getFullJSON());
  const preview = createCombatEngine(store).previewNextTurn();
  assert.equal(preview.ready, true, preview.error);
  const after = JSON.parse(store.getFullJSON());
  assert.deepEqual(after.extensions?.v5?.gameClock, before.extensions?.v5?.gameClock);
  assert.deepEqual(after.combat, before.combat);
  assert.deepEqual(after.combat.participants.find(row => row.id === 'ally').extensions?.v5?.divineEffects,
    before.combat.participants.find(row => row.id === 'ally').extensions?.v5?.divineEffects);
});

test('E5 indépendant — suspendre puis reprendre une scène ne fabrique aucune durée ou révision', async () => {
  const store = await fixture({ scene: true });
  const before = JSON.parse(store.getFullJSON()).extensions.v5.gameClock;
  const sceneId = store.getActiveScene().id;
  await store.suspendActiveScene();
  const suspended = JSON.parse(store.getFullJSON()).extensions.v5.gameClock;
  assert.equal(suspended.campaignSeconds, before.campaignSeconds);
  assert.equal(suspended.revision, before.revision);
  assert.equal(suspended.lastEvent, before.lastEvent);
  assert.equal(suspended.combat.sceneId, null, 'le cache clock suit la projection active sans sauter le temps');
  await store.resumeScene(sceneId);
  const resumed = JSON.parse(store.getFullJSON()).extensions.v5.gameClock;
  assert.equal(resumed.campaignSeconds, before.campaignSeconds);
  assert.equal(resumed.revision, before.revision);
  assert.equal(resumed.lastEvent, before.lastEvent);
  assert.equal(resumed.combat.sceneId, sceneId);
});

test('E5 indépendant — nextTurn committe position, horloge et phases comme une commande réversible atomiquement', async () => {
  const store = await fixture();
  const before = JSON.parse(store.getFullJSON());
  const beforeClock = before.extensions?.v5?.gameClock;
  assert.ok(beforeClock, 'la migration réelle du snapshot Store initialise une clock versionnée');
  await store.nextTurn();
  const after = JSON.parse(store.getFullJSON());
  const afterClock = after.extensions?.v5?.gameClock;
  assert.equal(afterClock.revision, beforeClock.revision + 1);
  assert.equal(afterClock.campaignSeconds, beforeClock.campaignSeconds,
    'changer de Tour dans le même Round ne fait pas passer dix secondes');
  assert.deepEqual(afterClock.combat, {
    sceneId: null, round: after.combat.round,
    turnIndex: after.extensions?.v5?.turnIndex,
    currentActorId: after.combat.currentActorId
  }, 'le snapshot clock suit la position canonique du Store');
  assert.equal(after.combat.currentActorId, 'ally');

  await store.undo();
  const undone = JSON.parse(store.getFullJSON());
  assert.deepEqual(undone.extensions?.v5?.gameClock, beforeClock,
    'Undo restitue la clock avec la position et les couches antérieures');
  assert.deepEqual(undone.combat, before.combat);
  await store.redo();
  const redone = JSON.parse(store.getFullJSON());
  assert.deepEqual(redone.extensions?.v5?.gameClock, afterClock,
    'Redo réapplique le reçu persistant sans lire l’horloge système');
  assert.deepEqual(redone.combat, after.combat);
});

test('E5 indépendant — un refus IDB ne publie pas une clock avancée sans la transition de combat', async () => {
  const persistence = memoryPersistence();
  const store = await fixture({ persistence });
  const before = JSON.parse(store.getFullJSON());
  const canUndoBefore = store.canUndo();
  persistence.setRefuse(true);
  const result = await store.nextTurn();
  assert.equal(result?.ok, false, 'la persistance atomique peut refuser la transition');
  const after = JSON.parse(store.getFullJSON());
  assert.deepEqual(after.extensions?.v5?.gameClock, before.extensions?.v5?.gameClock);
  assert.deepEqual(after.combat, before.combat);
  assert.equal(store.canUndo(), canUndoBefore, 'un commit refusé ne modifie pas l’historique Undo');
});
});

describe('synchronisation de l’horloge — contrôle technique (E5)', () => {
const canonicalClock = () => ({
  schemaVersion: 1,
  revision: 0,
  campaignSeconds: 0,
  combat: { sceneId: null, round: 0, turnIndex: 1, currentActorId: null },
  lastEvent: null,
});

const documentFor = (state) => ({ revision: 0, receipts: {}, state });

test('E5 contrôle technique — RTDB peut restaurer les nulls retirés quand la racine canonique confirme leur absence', () => {
  const gameClock = canonicalClock();
  delete gameClock.lastEvent;
  delete gameClock.combat.sceneId;
  delete gameClock.combat.currentActorId;
  const raw = documentFor({
    schemaVersion: 3,
    combat: { round: 0, currentActorId: null, order: [], participants: [] },
    extensions: { v5: { gameClock } },
  });

  const decoded = normalizeRemoteDocument(raw);
  assert.deepEqual(decoded.state.extensions.v5.gameClock, canonicalClock());
  assert.throws(() => validateSyncDocument(raw), /clock|projection/i,
    'les imports/protocol locaux restent stricts et ne passent pas par le décodeur RTDB');
});

test('E5 contrôle technique — une clock RTDB tronquée ne remplace pas un acteur actif par null', () => {
  const state = {
    schemaVersion: 3,
    combat: { round: 1, currentActorId: 'priest', order: ['priest'], participants: [] },
    extensions: { v5: { gameClock: { ...canonicalClock(), combat: { round: 1, turnIndex: 1 } } } },
  };
  assert.throws(() => normalizeRemoteDocument(documentFor(state)), /clock|projection|combat/i);
});

test('E5 contrôle technique — une clock RTDB tronquée ne remplace pas la scène active par null', () => {
  const state = {
    schemaVersion: 3,
    combat: { round: 1, currentActorId: 'priest', order: ['priest'], participants: [] },
    activeScene: { id: 'scene-active', status: 'active', participants: [] },
    extensions: { v5: { gameClock: { ...canonicalClock(), combat: { round: 1, turnIndex: 1, currentActorId: 'priest' } } } },
  };
  assert.throws(() => normalizeRemoteDocument(documentFor(state)), /clock|projection|combat|scene/i);
});

test('E5 contrôle technique — lastEvent omis après une révision non initiale ne se répare pas', () => {
  const clock = { ...canonicalClock(), revision: 1 };
  delete clock.lastEvent;
  const raw = documentFor({
    schemaVersion: 3,
    combat: { round: 0, currentActorId: null, order: [], participants: [] },
    extensions: { v5: { gameClock: clock } },
  });
  assert.throws(() => normalizeRemoteDocument(raw), /clock|reçu/i);
});

const dropNullLeaves = (value) => {
  if (Array.isArray(value)) return value.map(dropNullLeaves);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([, child]) => child !== null)
    .map(([key, child]) => [key, dropNullLeaves(child)]));
};

async function makeRoundAdvanceDocument() {
  const { createGameClock, deriveTurnPhasePlan, advanceGameClock } = await import('../../../js/core/v5-game-time.js');
  const initialState = {
    combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [] },
  };
  const clock = createGameClock(initialState);
  const from = clock.combat;
  const to = { ...from, round: 2, turnIndex: from.turnIndex + 1, currentActorId: 'ally' };
  const phases = deriveTurnPhasePlan({ from, to });
  const advanced = advanceGameClock(clock, {
    id: 'clock-v1:0:technical-round-advance-1', baseRevision: clock.revision, kind: 'combat-transition',
    sceneId: from.sceneId, from, to, phases,
  });
  assert.equal(advanced.ok, true);
  assert.ok(phases.some(row => row.phase === 'startOfRound' && row.sceneId === null && row.actorId === null));
  const canonical = documentFor({
    schemaVersion: 3,
    combat: { round: 2, currentActorId: 'ally', order: ['priest', 'ally'], participants: [] },
    extensions: { v5: { gameClock: advanced.clock } },
  });
  return { advanced, canonical };
}

test('E5 contrôle technique — RTDB récursif restaure uniquement les nulls des phases attestés par un vrai reçu', async () => {
  const { advanced, canonical } = await makeRoundAdvanceDocument();
  const raw = dropNullLeaves(canonical);
  assert.ok(raw.state.extensions.v5.gameClock.lastEvent.validatedPhases
    .some(row => row.phase === 'startOfRound' && !Object.hasOwn(row, 'sceneId') && !Object.hasOwn(row, 'actorId')));

  const decoded = normalizeRemoteDocument(raw);
  assert.deepEqual(decoded.state.extensions.v5.gameClock, advanced.clock,
    'le payload fingerprint conserve les valeurs null canoniques supprimées par RTDB');
});

test('E5 contrôle technique — un acteur non nul attesté par le reçu ne se répare pas en null ou omission', async () => {
  const { canonical } = await makeRoundAdvanceDocument();
  for (const mutate of [
    row => { delete row.actorId; },
    row => { row.actorId = 'forged-actor'; },
  ]) {
    const raw = dropNullLeaves(canonical);
    const startOfTurn = raw.state.extensions.v5.gameClock.lastEvent.validatedPhases
      .find(row => row.phase === 'startOfTurn');
    assert.equal(startOfTurn.actorId, 'ally');
    mutate(startOfTurn);

    assert.throws(() => normalizeRemoteDocument(raw), /clock|reçu|phase|transition/i,
      'un champ non nul absent ou modifié malgré le payload fingerprint doit rester une erreur de cohérence');
  }
});

test('E5 contrôle technique — un ID versionné ne peut pas être rejoué à une autre base de clock', async () => {
  const { createGameClock, deriveTurnPhasePlan, advanceGameClock } = await import('../../../js/core/v5-game-time.js');
  const clockAtStart = createGameClock({
    combat: { round: 1, currentActorId: 'a', order: ['a', 'b', 'c', 'd'], participants: [] },
  });
  const makeEvent = (clock, id, actorId) => {
    const from = clock.combat;
    const to = { ...from, turnIndex: from.turnIndex + 1, currentActorId: actorId };
    return { id, baseRevision: clock.revision, kind: 'combat-transition', sceneId: from.sceneId,
      from, to, phases: deriveTurnPhasePlan({ from, to }) };
  };
  const firstEvent = makeEvent(clockAtStart, 'clock-v1:0:first', 'b');
  const first = advanceGameClock(clockAtStart, firstEvent);
  assert.equal(first.status, 'applied');
  const secondEvent = makeEvent(first.clock, 'clock-v1:1:second', 'c');
  const second = advanceGameClock(first.clock, secondEvent);
  assert.equal(second.status, 'applied');

  const reusedIdAtNewBase = makeEvent(second.clock, firstEvent.id, 'd');
  assert.equal(reusedIdAtNewBase.baseRevision, 2);
  assert.notEqual(advanceGameClock(second.clock, reusedIdAtNewBase).status, 'applied',
    'le nonce historique de base 0 ne doit pas réussir à la révision 2');
});

test('E5 contrôle technique — une clock avancée doit conserver son reçu de dernière révision', async () => {
  const { createGameClock, deriveTurnPhasePlan, advanceGameClock, validateGameClock } = await import('../../../js/core/v5-game-time.js');
  const initial = createGameClock({
    combat: { round: 1, currentActorId: 'a', order: ['a', 'b', 'c'], participants: [] },
  });
  const advance = (clock, actorId, nonce) => {
    const from = clock.combat;
    const to = { ...from, turnIndex: from.turnIndex + 1, currentActorId: actorId };
    return advanceGameClock(clock, { id: `clock-v1:${clock.revision}:${nonce}`, baseRevision: clock.revision,
      kind: 'combat-transition', sceneId: from.sceneId, from, to, phases: deriveTurnPhasePlan({ from, to }) });
  };
  const one = advance(initial, 'b', 'one');
  const two = advance(one.clock, 'c', 'two');
  assert.equal(two.clock.revision, 2);
  assert.throws(() => validateGameClock({ ...two.clock, lastEvent: null }), /clock|reçu|revision/i,
    'une clock revision>0 sans son reçu CAS final ne doit pas être canonique');
});
});

describe('horloge de jeu', () => {
const state = (overrides = {}) => ({
  combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [] },
  extensions: { v5: { turnIndex: 3 } },
  ...overrides
});

const position = (round, turnIndex, currentActorId, sceneId = null) => ({ sceneId, round, turnIndex, currentActorId });

 test('position canonique et migration initialisent sans temps écoulé', () => {
  const input = state({ activeScene: { id: 'scene-1', status: 'active', extensions: { v5: { turnIndex: 8 } } } });
  assert.deepEqual(readCombatPosition(input), position(1, 8, 'a', 'scene-1'));
  assert.deepEqual(createGameClock(input), {
    schemaVersion: 1, revision: 0, campaignSeconds: 0,
    combat: position(1, 8, 'a', 'scene-1'),
    lastEvent: null
  });
  const migrated = migrateSnapshot({ reserve: [], combat: { round: 1, currentActorId: 'a', order: ['a'], participants: [] } }).data;
  assert.equal(migrated.extensions.v5.gameClock.campaignSeconds, 0);
  assert.equal(migrated.extensions.v5.gameClock.combat.round, 1);
  assert.equal(sanitizeMagicEnvelope({ reserve: [], combat: { participants: [] } }).extensions, undefined,
    'la sanitation seule ne crée aucune branche clock');
});

test('la clock valide strictement et une réconciliation neutre ne produit aucune phase', () => {
  const clock = createGameClock(state());
  assert.throws(() => validateGameClock({ ...clock, revision: -1 }), /clock|révision/i);
  const result = reconcileGameClockPosition(clock, position(2, 3, 'b'));
  assert.equal(result.changed, true);
  assert.equal(result.clock.combat.round, 2);
  assert.equal(result.clock.campaignSeconds, 0);
  assert.equal(result.clock.revision, 0);
  assert.equal(result.clock.lastEvent, null);
  assert.equal(reconcileGameClockPosition(result.clock, result.clock.combat).changed, false);
});

test('le plan de phases ne contient que la transition de Tour réellement calculée', () => {
  const phases = deriveTurnPhasePlan({ from: position(1, 3, 'a'), to: position(1, 4, 'b') });
  assert.deepEqual(phases.map(item => item.phase), [
    'endOfTurn', 'endOfTurn', 'expiry', 'endOfCasterTurn', 'startOfTurn', 'startOfTurn'
  ]);
  assert.deepEqual(phases.filter(item => item.phase === 'endOfTurn').map(item => item.moment), ['beforeEffects', 'afterEffects']);
  assert.throws(() => deriveTurnPhasePlan({ from: position(1, 3, 'a'), to: position(3, 4, 'b') }), /Round|transition/i);
  const roundPhases = deriveTurnPhasePlan({ from: position(1, 5, 'b'), to: position(2, 6, 'a') });
  assert.deepEqual(roundPhases.map(item => item.phase), [
    'endOfTurn', 'endOfTurn', 'expiry', 'endOfCasterTurn',
    'endOfRound', 'endOfRound', 'startOfRound', 'startOfTurn', 'startOfTurn'
  ]);
  assert.ok(!roundPhases.some(item => item.phase === 'attackAttempt'));
});

test('CAS clock : incrément uniquement au Round suivant, retry final idempotent, ID réutilisé/refus ancien stales', () => {
  const clock = createGameClock(state());
  const from = clock.combat;
  const to = position(1, 4, 'b');
  const event = { id: 'clock-v1:0:dev-device-turn-1', baseRevision: 0, kind: 'combat-transition', sceneId: null, from, to,
    phases: deriveTurnPhasePlan({ from, to }) };
  const oneTurn = advanceGameClock(clock, event);
  assert.equal(oneTurn.ok, true);
  assert.equal(oneTurn.status, 'applied');
  assert.equal(oneTurn.clock.campaignSeconds, 0);
  assert.equal(oneTurn.clock.revision, 1);
  assert.equal(oneTurn.clock.lastEvent.payloadFingerprint.length > 0, true);
  assert.equal(advanceGameClock(oneTurn.clock, event).status, 'duplicate');
  const changedTo = position(1, 4, 'c');
  const changedPayload = { ...event, to: changedTo, phases: deriveTurnPhasePlan({ from, to: changedTo }) };
  assert.equal(advanceGameClock(oneTurn.clock, changedPayload).status, 'conflict');
  assert.equal(advanceGameClock(clock, { ...event, phases: [...event.phases, { phase: 'attackAttempt' }] }).status, 'invalid');
  const roundTo = position(2, 5, 'a');
  const nextEvent = { id: 'clock-v1:1:dev-device-turn-2', baseRevision: 1, kind: 'combat-transition', sceneId: null,
    from: oneTurn.clock.combat, to: roundTo, phases: deriveTurnPhasePlan({ from: oneTurn.clock.combat, to: roundTo }) };
  const next = advanceGameClock(oneTurn.clock, nextEvent);
  assert.equal(next.clock.campaignSeconds, 10);
  assert.equal(advanceGameClock(next.clock, event).status, 'stale');
  const rest = { id: 'clock-v1:2:dev-device-time-3', baseRevision: 2, kind: 'campaign-time-advance', seconds: 60, reason: 'Repos décidé par MJ' };
  assert.equal(advanceGameClock(next.clock, rest).clock.campaignSeconds, 70);
});

test('validation RTDB restaure les nulls d’un reçu ultérieur sans contourner la révision CAS stricte', () => {
  const clock0 = createGameClock(state());
  const advance = (clock, round, turnIndex, actor, nonce) => {
    const from = clock.combat;
    const to = position(round, turnIndex, actor);
    return advanceGameClock(clock, { id: `clock-v1:${clock.revision}:${nonce}`, baseRevision: clock.revision,
      kind: 'combat-transition', sceneId: from.sceneId, from, to, phases: deriveTurnPhasePlan({ from, to }) });
  };
  const first = advance(clock0, 1, 4, 'b', 'dev-first');
  const second = advance(first.clock, 2, 5, 'a', 'dev-second');
  assert.equal(second.ok, true);
  const dropNulls = value => Array.isArray(value) ? value.map(dropNulls)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value)
      .filter(([, child]) => child !== null).map(([key, child]) => [key, dropNulls(child)])) : value;
  const raw = dropNulls({ revision: 0, receipts: {}, state: {
    schemaVersion: 3,
    combat: { round: 2, currentActorId: 'a', order: ['a', 'b'], participants: [] },
    extensions: { v5: { gameClock: second.clock } }
  } });
  const rawStartOfRound = raw.state.extensions.v5.gameClock.lastEvent.validatedPhases
    .find(row => row.phase === 'startOfRound');
  assert.equal(Object.hasOwn(rawStartOfRound, 'actorId'), false);
  const remote = normalizeRemoteDocument(raw);
  assert.deepEqual(remote.state.extensions.v5.gameClock, second.clock);
});
});
