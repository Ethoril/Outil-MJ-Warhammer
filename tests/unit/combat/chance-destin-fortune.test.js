import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, KEY } from '../../../js/core/store.js';
import { openV5FateDialog } from '../../../js/ui/v5-fate-dialog.js';
import { renderResolutionPanel } from '../../../js/ui/resolution-panel.js';
import { previewResolution } from '../../../js/core/resolution.js';
import { previewV5ActionCosts, commitV5ActionCosts } from '../../../js/core/v5-action-costs.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { ficheSnapshot, applyFicheSync } from '../../../js/core/fiche-sync.js';
import { getV5Fortune, projectV5Resources, setV5Fortune, commitV5Resources, reconcileV5ResourceBindings } from '../../../js/core/v5-resources.js';
import { hasMomentum } from '../../../js/core/v5-combat-rules.js';
import { sharedState } from '../../../js/core/sync-protocol.js';
import { migrateSnapshot } from '../../../js/core/migrations.js';

describe('Revue F2-C (caractérisation)', () => {
const clone = value => structuredClone(value);

function memoryPersistence() {
  let saved = null;
  return {
    async load() { return saved && clone(saved); },
    async saveAtomic({ state }) { saved = clone(state); return { ok: true }; },
    read() { return saved && clone(saved); }
  };
}

function participant() {
  return {
    id: 'hero', name: 'Héros', kind: 'PJ', camp: 'pj', zone: 'active',
    hp: 12, maxHp: 20, states: [], equipment: [],
    baseCaracs: { CC: 54, CT: 41 }, caracs: { CC: 64, CT: 41 },
    skills: [
      { id: 'melee-base', name: 'Corps à corps (Base)', carac: 'CC', base: 54, advances: 1, total: 59 },
      { id: 'ranged-crossbow', name: 'Projectiles (Arbalète de poing)', carac: 'CT', base: 41, advances: 1, total: 46 }
    ],
    actions: [{ id: 'attack', type: 'attack', base: 75, attr: 'CC', note: 'Ajustée à la main' }],
    extensions: { v5: { baseCaracs: { CC: 54, CT: 41 }, characteristicEffects: [{ id: 'effect-cc', characteristic: 'CC', value: 10 }], mounted: false } }
  };
}

const combatState = (hero = participant()) => ({
  schemaVersion: 3, reserve: [],
  combat: { round: 1, currentActorId: 'hero', order: ['hero'], participants: [clone(hero)] },
  activeScene: { id: 'scene-1', encounterId: 'enc-1', status: 'active', round: 1,
    currentActorId: 'hero', order: ['hero'], participants: [clone(hero)] },
  encounters: [], suspendedScenes: [], persistentCharacters: [], log: [], diceLines: [],
  extensions: { v5: { turnIndex: 1 } }
});

test('Store F2-C characterization — les couches base/total, effets et saisie manuelle survivent à une édition participant', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON(combatState());

  const before = store.listParticipants().find(row => row.id === 'hero');
  assert.deepEqual(before.extensions.v5.baseCaracs, { CC: 54, CT: 41 });
  assert.deepEqual(before.caracs, { CC: 64, CT: 41 });
  assert.deepEqual(before.skills.map(({ base, advances, total }) => ({ base, advances, total })), [
    { base: 54, advances: 1, total: 59 }, { base: 41, advances: 1, total: 46 }
  ]);
  assert.equal(before.actions[0].base, 75);
  assert.equal(before.extensions.v5.characteristicEffects[0].value, 10);

  await store.updateParticipant('hero', { name: 'Héros corrigé' });
  const after = store.listParticipants().find(row => row.id === 'hero');
  assert.equal(after.name, 'Héros corrigé');
  assert.deepEqual(after.extensions.v5.baseCaracs, before.extensions.v5.baseCaracs);
  assert.deepEqual(after.caracs, before.caracs);
  assert.deepEqual(after.skills, before.skills);
  assert.equal(after.actions[0].base, 75, 'une modification du participant ne remplace pas le score d’action saisi');
  assert.deepEqual(after.extensions.v5.characteristicEffects, before.extensions.v5.characteristicEffects);
});

test('Store F2-C characterization — la valeur durable du participant suit combat et scène, sauvegarde, Undo et Redo', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON(combatState());

  await store.updateParticipant('hero', { extensions: { v5: { characteristicEffects: [{ id: 'effect-cc', characteristic: 'CC', value: 10 }], mounted: true } } });
  const current = store.listParticipants().find(row => row.id === 'hero');
  assert.equal(current.extensions.v5.mounted, true);
  assert.equal(store.getActiveScene().participants[0].extensions.v5.mounted, true);

  const reloaded = createStore({ persistence, storage: null });
  await reloaded.ready;
  assert.equal(reloaded.listParticipants().find(row => row.id === 'hero').extensions.v5.mounted, true);
  assert.equal(reloaded.getActiveScene().participants[0].extensions.v5.mounted, true);

  assert.equal(await reloaded.undo(), true);
  assert.equal(reloaded.listParticipants().find(row => row.id === 'hero').extensions.v5.mounted, false);
  assert.equal(reloaded.getActiveScene().participants[0].extensions.v5.mounted, false);
  assert.equal(await reloaded.redo(), true);
  assert.equal(reloaded.listParticipants().find(row => row.id === 'hero').extensions.v5.mounted, true);
  assert.equal(reloaded.getActiveScene().participants[0].extensions.v5.mounted, true);
});
});

describe('F2-L caractérisation', () => {
// F2-L characterization: contract tests for the existing Fortune path and
// the new Fate / legacy conversion / currency behavior before engine changes.

function participant(id, overrides = {}) {
  return { id, profileId: `${id}-profile`, name: id, kind: id === 'foe' ? 'PNJ' : 'PJ',
    camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', hp: 20, maxHp: 20,
    caracs: { CC: 60, CT: 60, F: 30, E: 30, FM: 60, I: 40, Ag: 40 },
    skills: [], states: [], equipment: [], extensions: { v5: {}, ...(overrides.extensions || {}) }, ...overrides };
}

async function combat({ actor = participant('hero'), target = participant('foe'), persistence } = {}) {
  const store = createStore({ storage: null, ...(persistence ? { persistence } : {}) });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: {
    round: 1, currentActorId: actor.id, order: [actor.id, target.id], participants: [actor, target]
  } });
  return store;
}

test('F2-L characterization — Fortune reroll charges one permanent point once and Undo/Redo/reload preserve the receipt', async () => {
  let saved;
  const persistence = { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } };
  const store = await combat({ persistence });
  await store.setFortune('hero', 2);
  const preview = store.previewResolution({ actorId: 'hero', targetId: 'foe', resolutionId: 'l-fortune-1', roll: 88,
    action: { type: 'test', attr: 'FM', base: 60 }, v5: { kind: 'test', fortuneReroll: true, fortuneRerollRoll: 24 } });
  assert.equal(preview.ready, true, preview.unresolved?.join('; '));
  assert.ok(preview.actionCosts.paid.some(row => row.resource === 'fortune' && row.amount === 1));
  assert.equal((await store.applyResolution(preview)).status, 'applied');
  assert.equal(store.getFortune('hero').balance, 1);
  assert.ok(['duplicate', 'already-applied'].includes((await store.applyResolution(preview)).status));
  assert.equal(store.getFortune('hero').balance, 1);
  assert.equal(await store.undo(), true);
  assert.equal(store.getFortune('hero').balance, 2);
  assert.equal(await store.redo(), true);
  assert.equal(store.getFortune('hero').balance, 1);
  const reloaded = createStore({ storage: null, persistence });
  await reloaded.ready;
  assert.equal(reloaded.getFortune('hero').balance, 1);
  assert.ok(reloaded.getLog().some(row => row.detail?.actionId === 'l-fortune-1' || row.detail?.resolutionId === 'l-fortune-1'));
});

test('F2-L characterization — Fate cancels a declared attack before damage and critical effects', async () => {
  const store = await combat({ actor: participant('hero'), target: participant('foe', { extensions: { v5: { fate: 1 } } }) });
  const preview = store.previewResolution({ actorId: 'hero', targetId: 'foe', resolutionId: 'l-fate-cancel', roll: 11,
    action: { type: 'attack', attr: 'CC', base: 90, damage: 12 }, defense: { base: 30, roll: 70, v5: { kind: 'melee' } }, attackContext: { ranged: false },
    v5: { kind: 'melee', context: { fateAction: 'cancel-attack' } } });
  assert.equal(preview.ready, true, preview.unresolved?.join('; '));
  assert.equal(preview.fateAction.action, 'cancel-attack');
  assert.equal(preview.fateAction.cancelled, true);
  assert.equal(preview.damage?.total ?? 0, 0);
  assert.equal(preview.critical, null);
  assert.equal((await store.applyResolution(preview)).status, 'applied');
  assert.equal(store.getFate('foe').balance, 0);
  assert.equal(store.listParticipants().find(row => row.id === 'foe').hp, 20);
});

test('F2-L characterization — V4 profile conversion is idempotent and maps the accepted V5 terms', async () => {
  const { convertLegacyV4Profile } = await import('../../../js/core/v5-legacy-conversion.js');
  const legacy = { id: 'old', extensions: { v4: { advantage: 2, resilience: 3, determination: 4, difficulty: 20, resolve: 1 } } };
  const once = convertLegacyV4Profile(legacy);
  const twice = convertLegacyV4Profile(once);
  assert.deepEqual(twice, once);
  assert.deepEqual(once.extensions.v5, { hasMomentum: true, fate: 3, resources: { fortune: 4 }, difficultySL: 2 });
  const {parseProfileJson}=await import('../../../js/core/json-profile-import.js');
  const imported=parseProfileJson(JSON.stringify({name:'Legacy',kind:'PJ',hp:10,extensions:{v4:{advantage:1,resilience:2,determination:3}}}));
  assert.deepEqual(imported.profiles[0].extensions.v5,{hasMomentum:true,fate:2,resources:{fortune:3}});
});

test('F2-L characterization — currency conversions use 1 crown = 20 pistoles = 240 sous and reject negatives', async () => {
  const { toSous, fromSous } = await import('../../../js/core/currency.js');
  assert.equal(toSous({ crowns: 1, pistoles: 0, sous: 0 }), 240);
  assert.equal(toSous({ crowns: 0, pistoles: 20, sous: 0 }), 240);
  assert.equal(toSous({ crowns: 0, pistoles: 0, sous: 240 }), 240);
  assert.deepEqual(fromSous(240), { crowns: 1, pistoles: 0, sous: 0 });
  assert.throws(() => toSous({ crowns: -1, pistoles: 0, sous: 0 }), /négatif|invalide/i);
  assert.throws(() => fromSous(-1), /négatif|invalide/i);
});
});

describe('Destin et Chance (caractérisation)', () => {
const person=(id,extra={})=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',hp:20,maxHp:20,fortune:3,fate:1,profileId:'profile-a',caracs:{CC:40,Ag:40,FM:50,E:30},skills:[],talents:[],states:[],equipment:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{fate:1}},...extra});
async function setup(){const s=createStore({storage:null});await s.ready;await s.loadFromJSON({schemaVersion:3,reserve:[person('profile-a')],combat:{round:1,currentActorId:'copy-a',order:['copy-a','copy-b','enemy'],participants:[person('copy-a'),person('copy-b'),person('enemy',{kind:'PNJ',camp:'ennemi',profileId:undefined})]},extensions:{v5:{turnIndex:1}}});await s.setFortune('copy-a',3);return s;}
const actor=s=>s.listParticipants().find(p=>p.id==='copy-a');
const attack={name:'Épreuve',type:'test',attr:'FM',base:50};
test('F2-L characterization: Chance buys Avantage before the initial roll',async()=>{const s=await setup();const declaration=await s.declareV5FortuneAdvantage('copy-a',{enabled:true,baseRevision:s.getLocalRevision()});const p=s.previewResolution({actor:actor(s),action:attack,roll:88,v5:{kind:'test',fortuneForAdvantage:true,fortuneAdvantageDeclarationId:declaration.declarationId}});assert.equal(p.test.advantage.advantage.length,1);await s.applyResolution(p);assert.equal(s.getFortune('copy-a').balance,2);});
test('F2-L characterization: successive Chance rerolls use the latest result and charge each time',async()=>{const s=await setup();const p=s.previewResolution({actor:actor(s),action:attack,roll:88,v5:{kind:'test',fortuneReroll:true,fortuneRerollRolls:[78,24]}});assert.deepEqual(p.fortuneReroll.rolls,[78,24]);assert.equal(p.test.roll,24);await s.applyResolution(p);assert.equal(s.getFortune('copy-a').balance,1);});
test('F2-L characterization: setting Fate on an anonymous PJ copy does not update its profile or sibling copies',async()=>{const s=await setup();await s.setFate('copy-a',2,{reason:'arbitrage MJ'});assert.equal(actor(s).extensions.v5.fate,2);assert.equal(s.listParticipants().find(p=>p.id==='copy-b').extensions.v5.fate,1);assert.equal(JSON.parse(s.getFullJSON()).reserve[0].extensions.v5.fate,1);});
});

describe('Destin (contre-revue)', () => {
const profile = (id, extra = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', hp: 20, maxHp: 20, fortune: 3,
  extensions: { v5: { fate: 3 } }, caracs: { CC: 50, Ag: 40, E: 30, FM: 50 },
  skills: [], talents: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, ...extra
});

async function launched() {
  const store = createStore({ storage: null }); await store.ready;
  await store.addProfile(profile('named-pj'));
  await store.addProfile(profile('anonymous-template', { kind: 'PNJ', camp: 'ennemi' }));
  await store.setFortune('named-pj', 3);
  await store.setFortune('anonymous-template', 3);
  await store.savePersistentCharacter({ id: 'named-character', name: 'Named PJ', hp: 20, maxHp: 20, extensions: { v5: { fate: 3 } } });
  await store.saveEncounter({ id: 'fate-review', title: 'Reprise Destin', entries: [
    { id: 'named-entry', profileId: 'named-pj', persistentCharacterId: 'named-character', zone: 'active' },
    { id: 'anonymous-entry', profileId: 'anonymous-template', quantity: 2, zone: 'active' }
  ] });
  await store.launchEncounter('fate-review');
  const named = store.listParticipants().find(row => row.profileId === 'named-pj');
  const anonymous = store.listParticipants().find(row => row.profileId === 'anonymous-template');
  await store.setFortune(named.id, 3);
  await store.setFortune(anonymous.id, 3);
  return store;
}

test('counter-review: Destiny dialog exposes and submits the V4 permanent Resilience loss control', async () => {
  const originalDocument = globalThis.document;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.attributes = {}; this.style = {}; this.checked = false; this.value = ''; this.isConnected = true; }
    append(...items) { this.children.push(...items); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    remove() { this.isConnected = false; }
    focus() {}
    showModal() {}
    close() { this.listeners.close?.(); }
  }
  const body = new Element('body');
  globalThis.document = { activeElement: null, body, createElement: tag => new Element(tag) };
  try {
    let submitted;
    const promise = openV5FateDialog({
      participantName: 'Elyse', fate: { balance: 3, permanent: 3, legacyResilience: true, baseRevision: 7 },
      getCurrentRevision: () => 7, submit: async (amount, options) => { submitted = { amount, options }; return { ok: true }; }
    });
    const dialog = body.children[0], form = dialog.children[0];
    const checkbox = form.children.flatMap(child => child.children || []).find(child => child.tag === 'input' && child.type === 'checkbox');
    assert.ok(checkbox, 'the UI must render a checkbox for converted V4 profiles');
    checkbox.checked = true;
    const amount = form.children.flatMap(child => child.children || []).find(child => child.tag === 'input' && child.type === 'number');
    const reason = form.children.flatMap(child => child.children || []).find(child => child.tag === 'input' && child.type !== 'checkbox' && child.type !== 'number');
    amount.value = '1'; reason.value = 'Perte actée par le MJ';
    await form.listeners.submit({ preventDefault() {} });
    await promise;
    assert.equal(submitted.amount, 1);
    assert.equal(submitted.options.permanentResilienceLoss, true);
  } finally { globalThis.document = originalDocument; }
});

test('counter-review: named persistent and anonymous profile copies keep independent Chance and Destin', async () => {
  const store = await launched();
  const before = store.listParticipants();
    const named = before.find(row => row.persistentCharacterId === 'named-character'), anonymous = before.find(row => row.profileId === 'anonymous-template');
  assert.equal(named.persistentCharacterId, 'named-character');
  assert.equal(anonymous.persistentCharacterId, null);
  await store.setFate(named.id, 2, { reason: 'Correction MJ' });
  assert.equal(store.listParticipants().find(row => row.id === named.id).extensions.v5.fate, 2);
  assert.equal(store.listPersistentCharacters().find(row => row.id === 'named-character').extensions.v5.fate, 2);
  assert.equal(store.getProfile('named-pj').extensions.v5.fate, 3, 'the template remains a profile, not the persistent person');
  const namedDeclaration=await store.declareV5FortuneAdvantage(named.id,{enabled:true,baseRevision:store.getLocalRevision()});
  const namedAdvantage = store.previewResolution({ actorId: named.id, action: { type: 'test', attr: 'CC', base: 50 }, roll: 44, v5: { kind: 'test', fortuneForAdvantage: true,fortuneAdvantageDeclarationId:namedDeclaration.declarationId } });
  await store.applyResolution(namedAdvantage);
  assert.equal(store.getFortune(named.id).balance, 2);
  assert.equal(store.getFortune('named-character').balance, 2);
  assert.equal(store.getFortune('named-pj').balance, 3, 'a persistent PJ does not mutate its profile template');
  const anonymousSibling = store.listParticipants().find(row => row.id !== anonymous.id && row.profileId === 'anonymous-template');
  await store.setFate(anonymousSibling.id, 2, { reason: 'Destin propre à la copie' });
  assert.equal(store.listParticipants().find(row => row.id === anonymous.id).extensions.v5.fate, 3);
  assert.equal(store.getProfile('anonymous-template').extensions.v5.fate, 3);
  const anonymousFate = store.previewResolution({ actorId: anonymous.id, action: { type: 'test', attr: 'CC', base: 50 }, roll: 44, v5: { kind: 'test', context: { fateAction: 'automatic-success', fateChosenRoll: 44 } } });
  assert.equal(anonymousFate.ready, true, anonymousFate.unresolved?.join('; '));
  await store.applyResolution(anonymousFate);
  assert.equal(store.listParticipants().find(row => row.id === anonymous.id).extensions.v5.fate, 2);
  assert.equal(store.getProfile('anonymous-template').extensions.v5.fate, 3);
  const anonymousDeclaration=await store.declareV5FortuneAdvantage(anonymous.id,{enabled:true,baseRevision:store.getLocalRevision()});
  const spendChance = store.previewResolution({ actorId: anonymous.id, action: { type: 'test', attr: 'CC', base: 50 }, roll: 44, v5: { kind: 'test', fortuneForAdvantage: true,fortuneAdvantageDeclarationId:anonymousDeclaration.declarationId } });
  await store.applyResolution(spendChance);
  assert.equal(store.getFortune(anonymous.id).balance, 2);
  assert.equal(store.getFortune('anonymous-template').balance, 3);
});

test('counter-review UI: Chance → Avantage is locked after a d100 is entered or previewed', () => {
  const originalDocument = globalThis.document;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.attributes = {}; this.value = ''; this.classList = { add() {}, remove() {}, contains() { return false; } }; this.childNodes = this.children; }
    get lastChild() { return this.children.at(-1); }
    append(...items) { this.children.push(...items); }
    appendChild(item) { this.children.push(item); }
    prepend(...items) { this.children.unshift(...items); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
  }
  globalThis.document = { createElement: tag => new Element(tag) };
  globalThis.Option = class { constructor(text, value) { this.text = text; this.value = value; } };
  try {
    const actor = { id: 'actor', name: 'MJ', camp: 'pj', kind: 'PJ', zone: 'active', caracs: { CC: 50, E: 30, Ag: 40 }, extensions: { v5: {} } };
    const action = { id: 'test', type: 'test', attr: 'CC', base: 50 };
    const render = draft => renderResolutionPanel({ draft, actor, participants: [actor], actions: [action], actionKey: 'test', type: 'test', target: null, groups: { allies: [], adversaries: [] }, defense: { options: [], option: { value: 'CC', statLabel: 'CC' } }, canCalculate: true, canApply: true, handlers: { select() {}, input() {}, roll() {}, calculate() {}, compare() {}, choose() {}, apply() {}, cancel() {} } });
    const unrolled = render({ attackRoll: '' }), unrolledInputs = [];
    const visitUnrolled = item => { if (item?.tag === 'input') unrolledInputs.push(item); for (const child of item?.children || []) visitUnrolled(child); };
    visitUnrolled(unrolled);
    const available = unrolledInputs.find(input => input.attributes?.['aria-label']?.includes('Avantage avant le jet'));
    assert.ok(available); assert.equal(available.disabled, false, 'le MJ peut choisir Chance → Avantage avant de connaître le jet');
    const preview=previewResolution({actor,action,roll:44});
    for (const draft of [{ attackRoll: '44' }, { attackRoll: '44', preview }]) {
      const panel = render(draft), inputs = [];
      const visit = item => { if (item?.tag === 'input') inputs.push(item); for (const child of item?.children || []) visit(child); };
      visit(panel);
      const checkbox = inputs.find(input => input.attributes?.['aria-label']?.includes('Avantage avant le jet'));
      assert.ok(checkbox, 'the Chance → Avantage option stays visible with its state');
      assert.equal(checkbox.disabled, true);
    }
  } finally { globalThis.document = originalDocument; delete globalThis.Option; }
});
});

describe('Dépense de Destin', () => {
const p=(id,fate)=>({id,profileId:id,kind:id==='hero'?'PJ':'PNJ',zone:'active',hp:20,maxHp:20,caracs:{CC:60,CT:60,F:30,E:30,FM:60,I:40,Ag:40},skills:[],states:[],equipment:[],extensions:{v5:{fate}}});

test('F2-L: cancel and survive refuse non-attacks or missing targets',async()=>{
  const store=createStore({storage:null});await store.ready;await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'hero',order:['hero'],participants:[p('hero',1)]}});
  for(const fateAction of ['cancel-attack','survive']){
    assert.throws(()=>store.previewResolution({actorId:'hero',resolutionId:'invalid-'+fateAction,action:{type:'test',attr:'CC',base:50},roll:30,v5:{kind:'test',context:{fateAction}}}),/attaque et sa cible/);
    assert.throws(()=>store.previewResolution({actorId:'hero',resolutionId:'untargeted-'+fateAction,action:{type:'attack',attr:'CC',base:50},roll:30,v5:{kind:'melee',context:{fateAction}}}),/attaque et sa cible/);
  }
});

test('F2-L: attack costs stay with the attacker while cancellation Destin is paid by the target',()=>{
  const state={revision:0,round:1,currentActorId:'hero',participants:[p('hero',2),p('foe',1)],v5ActionLedger:{appliedActions:[],quotaUsage:[]}};
  const plan=previewV5ActionCosts({state,actionId:'split-payer',actorId:'hero',costs:[{id:'attack-fate',resource:'fate',amount:1},{id:'cancel-fate',resource:'fate',amount:1,actorId:'foe'}]});
  assert.equal(plan.ready,true);
  const committed=commitV5ActionCosts(plan,state,{resolveAction:paid=>({status:'applied',state:paid})});
  assert.equal(committed.status,'applied');
  assert.deepEqual(committed.state.participants.map(row=>row.extensions.v5.fate),[1,0]);
});

test('F2-L: manual Destin assignment records the MJ reason and can be undone',async()=>{
  const store=createStore({storage:null}); await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[p('hero',0)],log:[],diceLines:[],combat:{round:0,currentActorId:null,order:[],participants:[]}});
  await store.setFate('hero',3,{reason:'Attribution MJ après la séance'});
  assert.equal(store.getFate('hero').balance,3);
  assert.match(store.getLog()[0].detail.reason,/Attribution MJ/);
  assert.equal(await store.undo(),true);
  assert.equal(store.getFate('hero').balance,0);
});

test('F2-L-0899: a recorded permanent V4 Resilience loss reduces the converted Chance maximum',async()=>{
  const {convertLegacyV4Profile}=await import('../../../js/core/v5-legacy-conversion.js');
  const store=createStore({storage:null});await store.ready;const legacy=convertLegacyV4Profile({...p('legacy',0),kind:'PJ',extensions:{v4:{resilience:3,determination:4}}});
  await store.loadFromJSON({schemaVersion:3,reserve:[legacy],log:[],diceLines:[],combat:{round:0,currentActorId:null,order:[],participants:[]}});
  assert.equal(store.getFate('legacy').legacyResilience,true);assert.equal(store.getFortune('legacy').permanent,4);
  await store.setFate('legacy',1,{reason:'Perte définitive de Résilience',permanentResilienceLoss:true});
  assert.equal(store.getFate('legacy').permanent,1);assert.equal(store.getFortune('legacy').permanent,2);
  assert.equal(store.getLog()[0].detail.fortuneMaximumReducedBy,2);await store.undo();
  assert.equal(store.getFate('legacy').permanent,3);assert.equal(store.getFortune('legacy').permanent,4);
});

test('F2-L: V4 profile Chance conversion reaches the durable Fortune registry view',async()=>{
  const {convertLegacyV4Profile}=await import('../../../js/core/v5-legacy-conversion.js');
  const profile=convertLegacyV4Profile({id:'legacy-pj',kind:'PJ',extensions:{v4:{determination:4,resilience:2}}});
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[profile],log:[],diceLines:[],combat:{round:0,currentActorId:null,order:[],participants:[]}});
  assert.equal(store.getFortune('legacy-pj').balance,4);
  assert.equal(store.getFate('legacy-pj').balance,2);
});

test('F2-L: temporary Fate is spent before permanent Fate and permanent spend survives reload in the profile',async()=>{
  let saved;const persistence={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const store=createStore({storage:null,persistence});await store.ready;
  const actor=p('hero',0),profile={...p('foe-profile',1),kind:'PJ'};
  await store.loadFromJSON({schemaVersion:3,reserve:[profile],log:[],diceLines:[],combat:{round:1,currentActorId:'hero',order:['hero'],participants:[actor]}});
  await store.addProfilesToCombat(['foe-profile'],{zone:'active'});
  let foe=store.listParticipants().find(row=>row.profileId==='foe-profile');assert.ok(foe);
  await store.updateParticipant(foe.id,{extensions:{...foe.extensions,v5:{...foe.extensions.v5,spellEffects:[{id:'temporary-fate',remainingTempFate:1}]}}});
  const foeId=foe.id,attack=resolutionId=>store.previewResolution({actorId:'hero',targetId:foeId,resolutionId,roll:20,action:{type:'attack',attr:'CC',base:90,damage:10},defense:{base:30,roll:40,v5:{kind:'melee'}},v5:{kind:'melee',context:{fateAction:'cancel-attack'}}});
  let preview=attack('fate-temp-first');assert.equal(preview.ready,true,preview.unresolved?.join('; '));await store.applyResolution(preview);
  foe=store.listParticipants().find(row=>row.id===foeId);assert.equal(foe.extensions.v5.spellEffects[0].remainingTempFate,0);assert.equal(foe.extensions.v5.fate,1);assert.equal(store.getProfile('foe-profile').extensions.v5.fate,1);
  preview=attack('fate-permanent-second');assert.equal(preview.ready,true,preview.unresolved?.join('; '));await store.applyResolution(preview);
  const liveFoe=store.listParticipants().find(row=>row.id===foeId);assert.equal(liveFoe.extensions.v5.fate,0);assert.equal(store.getProfile('foe-profile').extensions.v5.fate,1,'une copie anonyme ne dépense pas le Destin du profil');
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(reload.getProfile('foe-profile').extensions.v5.fate,1);
});

test('F2-L: automatic Fate succeeds on an opposition and forces at least +1 DR',async()=>{
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'hero',order:['hero','foe'],participants:[p('hero',1),p('foe',0)]}});
  const preview=store.previewResolution({actorId:'hero',targetId:'foe',resolutionId:'fate-auto',action:{type:'opposition',attr:'F',base:10},defense:{attr:'F',base:90,roll:1,v5:{kind:'test',context:{opposedTest:true}}},v5:{kind:'test',context:{opposedTest:true,fateAction:'automatic-success',fateChosenRoll:99}}});
  assert.equal(preview.ready,true,preview.unresolved?.join('; '));
  assert.equal(preview.opposition.winner,'attacker');assert.ok(preview.opposition.netSl>=1);
  await store.applyResolution(preview);assert.equal(store.getFate('hero').balance,0);
});

test('F2-L: automatic Fate resolves a simple test using an MJ-chosen result without rolling dice',async()=>{
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'hero',order:['hero'],participants:[p('hero',1)]}});
  const preview=store.previewResolution({actorId:'hero',resolutionId:'fate-no-die',action:{type:'test',attr:'F',base:10},v5:{kind:'test',context:{fateAction:'automatic-success',fateChosenRoll:43}}});
  assert.equal(preview.ready,true,preview.unresolved?.join('; '));assert.equal(preview.success,true);assert.ok(preview.sl>=1);
  await store.applyResolution(preview);assert.equal(store.getFate('hero').balance,0);
});

test('F2-L: automatic Fate lets the MJ choose a critical hit location',async()=>{
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'hero',order:['hero','foe'],participants:[p('hero',1),p('foe',0)]}});
  const preview=store.previewResolution({actorId:'hero',targetId:'foe',resolutionId:'fate-critical-location',criticalRolls:{effect:1},action:{type:'attack',attr:'CC',base:90,damage:1},attackContext:{ranged:false},defense:{base:30,roll:67,v5:{kind:'melee'}},v5:{kind:'melee',context:{fateAction:'automatic-success',fateChosenRoll:11,fateCriticalLocation:'head'}}});
  assert.equal(preview.ready,true,preview.unresolved?.join('; '));
  assert.equal(preview.critical.details.location.name,'Tête');
});

test('F2-L: Survive requires a confirmed mortal result, not merely 0 Blessure',async()=>{
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'hero',order:['hero','foe'],participants:[{...p('hero',0),extensions:{v5:{}}},{...p('foe',1),hp:4}]}});
  const preview=store.previewResolution({actorId:'hero',targetId:'foe',resolutionId:'fate-survive',roll:20,action:{type:'attack',attr:'CC',base:90,damage:10},attackContext:{ranged:false},defense:{base:30,roll:40,v5:{kind:'melee'}},v5:{kind:'melee',context:{fateAction:'survive'}}});
  assert.equal(preview.ready,false);assert.equal(preview.fateSurvival,undefined);assert.match(preview.unresolved.join(' '),/mortel confirmé/);
  const fatal=store.previewResolution({actorId:'hero',targetId:'foe',resolutionId:'fate-survive-confirmed',roll:20,action:{type:'attack',attr:'CC',base:90,damage:1},attackContext:{ranged:false},defense:{base:30,roll:40,v5:{kind:'melee'}},v5:{kind:'melee',context:{fateAction:'survive',targetHelpless:true,lethalIntent:true,lethalTableEnabled:true,confirmLethalDeath:true}}});
  assert.equal(fatal.ready,true,fatal.unresolved?.join('; '));assert.ok(fatal.fateSurvival);await store.applyResolution(fatal);
  assert.equal(store.getFate('foe').balance,0);
  assert.equal(store.listParticipants().find(row=>row.id==='foe').zone,'bench');
  assert.equal(store.listParticipants().find(row=>row.id==='foe').hp,4);
});
});

describe('Fortune et ordre des avantages', () => {
const actor={id:'hero',name:'Héros',kind:'PJ',camp:'pj',zone:'active',hp:20,maxHp:20,fortune:3,caracs:{CC:50,FM:50,E:30,Ag:40},skills:[],talents:[],states:[],equipment:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{fate:1}}};
const action={id:'test',name:'Épreuve',type:'test',attr:'CC',base:50};
const input=extra=>({actorId:'hero',action,roll:44,resolutionId:'fortune-before-roll',v5:{kind:'test',fortuneForAdvantage:true,...extra}});

async function setup(){
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'hero',order:['hero'],participants:[actor]}});
  await store.setFortune('hero',3);
  return store;
}

test('F2-L counter-review: direct Chance → Avantage requires a prior Store declaration',async()=>{
  const store=await setup();
  assert.throws(()=>store.previewResolution(input()),/déclaration préalable.*avant le jet/i);
});

test('F2-L counter-review: a Store declaration authorizes one real roll and is consumed on apply',async()=>{
  const store=await setup();
  const declared=await store.declareV5FortuneAdvantage('hero',{enabled:true,baseRevision:store.getLocalRevision()});
  assert.equal(declared.status,'applied');assert.ok(declared.declarationId);
  const preview=store.previewResolution(input({fortuneAdvantageDeclarationId:declared.declarationId}));
  assert.equal(preview.test.advantage.advantage.length,1);
  await store.applyResolution(preview);
  assert.equal(store.getFortune('hero').balance,2);
  assert.throws(()=>store.previewResolution(input({fortuneAdvantageDeclarationId:declared.declarationId})),/déclaration préalable.*avant le jet/i);
});
});

describe('Fortune et liaison aux conditions (intégration)', () => {
function memory() {
  let state;
  return {
    load: async () => state && structuredClone(state),
    saveAtomic: async ({ state: next }) => { state = structuredClone(next); return { ok: true }; }
  };
}

test('F2-L integration — recoverCondition fortune retires one Sonné level and first PJ binding keeps the spent balance', async () => {
  const persistence = memory(), store = createStore({ persistence }); await store.ready;
  await store.addProfile({ id: 'recovery-binding-pj', name: 'PJ lié après dépense', kind: 'PJ', hp: 40, maxHp: 40,
    initiative: 60, caracs: { E: 30 } });
  for (const id of ['recovery-binding-a', 'recovery-binding-b']) {
    await store.saveEncounter({ id, title: id, entries: [{ id: `${id}:entry`, profileId: 'recovery-binding-pj', quantity: 1, zone: 'active' }] });
  }

  await store.launchEncounter('recovery-binding-a');
  const first = store.listParticipants()[0].id;
  await createCombatEngine(store).start();
  await store.setFortune(first, 3);
  const acquired = await store.acquireConditions(first, [{ name: 'Sonné', level: 2 }], { resolutionId: 'recovery-binding-stun' });
  assert.equal(acquired.status, 'applied');
  assert.equal(store.listParticipants().find(row => row.id === first).states.find(state => state.key === 'sonne')?.level, 2);

  const recovered = await store.recoverCondition(first, 'sonne', { method: 'fortune' });
  assert.equal(recovered.status, 'applied');
  assert.equal(recovered.removed.length, 1);
  assert.equal(store.listParticipants().find(row => row.id === first).states.find(state => state.key === 'sonne')?.level, 1);
  assert.equal(store.getFortune(first).balance, 2, 'real recovery spends exactly one of three Fortune points');

  await store.suspendActiveScene();
  await store.launchEncounter('recovery-binding-b');
  const second = store.listParticipants()[0].id;
  await store.applyFicheSync([{ profileId: 'recovery-binding-pj',
    snapshot: ficheSnapshot('recovery-binding-fiche', { nom: 'PJ lié après dépense', chance: '9' }) }]);
  assert.equal(store.getFortune(second).characterId, 'fiche:recovery-binding-fiche');
  assert.equal(store.getFortune(second).balance, 2, 'first explicit binding retains the Sonné recovery debit');
});
});

describe('Fortune et première liaison (caractérisation)', () => {
function memory() {
  let state;
  return {
    load: async () => state && structuredClone(state),
    saveAtomic: async ({ state: next }) => { state = structuredClone(next); return { ok: true }; },
    snapshot: () => structuredClone(state)
  };
}

test('F2-L characterization — anonymous PJ scene balances stay separate until MJ resolves first fiche binding', async () => {
  const persistence = memory(), store = createStore({ persistence }); await store.ready;
  await store.addProfile({ id: 'binding-pj', name: 'PJ sans fiche', kind: 'PJ', hp: 20, maxHp: 20 });
  await store.addProfile({ id: 'binding-npc', name: 'Modèle PNJ', kind: 'PNJ', hp: 20, maxHp: 20 });
  for (const id of ['binding-scene-a', 'binding-scene-b']) {
    await store.saveEncounter({ id, title: id, entries: [
      { id: `${id}:pj`, profileId: 'binding-pj', zone: 'active' },
      { id: `${id}:npc`, profileId: 'binding-npc', zone: 'active' }
    ] });
  }

  await store.launchEncounter('binding-scene-a');
  const firstPj = store.listParticipants().find(row => row.profileId === 'binding-pj');
  const firstNpc = store.listParticipants().find(row => row.profileId === 'binding-npc');
  await store.setFortune(firstPj.id, 3);
  await store.setFortune(firstNpc.id, 3);
  const spend = store.previewResolution({ resolutionId: 'binding-spend', actorId: firstPj.id,
    action: { type: 'test', attr: 'CC', base: 50 }, roll: 61,
    v5: { kind: 'test', costs: [{ id: 'binding-spent-fortune', resource: 'fortune', amount: 1 }] } });
  assert.equal((await store.applyResolution(spend)).status, 'applied');
  await store.setFortune(firstNpc.id, 2);
  assert.equal(store.getFortune(firstPj.id).balance, 2, 'the suspended PJ pool must contain the spent point before binding');
  const firstPjIdentity = store.getFortune(firstPj.id).characterId;
  const firstNpcIdentity = store.getFortune(firstNpc.id).characterId;

  await store.suspendActiveScene();
  await store.launchEncounter('binding-scene-b');
  const secondPj = store.listParticipants().find(row => row.profileId === 'binding-pj');
  const secondNpc = store.listParticipants().find(row => row.profileId === 'binding-npc');
  await store.setFortune(secondPj.id, 4);
  assert.notEqual(firstPjIdentity, store.getFortune(secondPj.id).characterId,
    'PJ scene copies without a persistent identity are still independent before explicit binding');
  assert.notEqual(firstNpcIdentity, store.getFortune(secondNpc.id).characterId,
    'anonymous PNJ scene copies remain independent');
  assert.equal(store.getFortune(secondPj.id).balance, 4);
  assert.equal(store.getFortune(secondNpc.id).balance, null);

  const firstBinding = [{ profileId: 'binding-pj', snapshot: ficheSnapshot('binding-fiche', { nom: 'PJ sans fiche', chance: '9' }) }];
  await assert.rejects(store.applyFicheSync(firstBinding), /copies de ce PJ ont des soldes de Chance différents/,
    'different independent scene balances require an explicit MJ choice');
  assert.match(store.getFortune(secondPj.id).characterId, /^copy:/,
    'the rejected association leaves the second copy anonymous and its balance intact');
  assert.equal(store.getFortune(secondPj.id).balance, 4);
  await store.setFortune(secondPj.id, 2);
  await store.applyFicheSync(firstBinding);
  assert.equal(store.getFortune(secondPj.id).characterId, 'fiche:binding-fiche');
  assert.equal(store.getFortune(secondPj.id).balance, 2,
    'after the MJ equalizes the scene copies, the explicit PJ binding preserves their spent balance');
  assert.equal(store.getFortune('binding-pj').balance, 2);
  const envelope = JSON.parse(store.getFullJSON());
  const suspendedNpc = envelope.suspendedScenes[0].participants.find(row => row.id === firstNpc.id);
  assert.equal(getV5Fortune(envelope, suspendedNpc).balance, 2);
  assert.equal(store.getFortune(secondNpc.id).balance, null,
    'binding a PJ does not join anonymous PNJ copies to its resource pool');
  assert.equal(envelope.extensions.v5.characterResources.length, 2,
    'one PJ pool and the independently spent anonymous PNJ pool remain registered');
});
});

describe('Contrôle lot 2 V5-23', () => {
const envelope = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };
function memory() {
  let state, reject = false;
  return {load: async () => state && structuredClone(state), saveAtomic: async ({state: next}) => { if (reject) throw new Error('Disque de contrôle indisponible'); state = structuredClone(next); return {ok: true}; }, snapshot: () => structuredClone(state), reject: value => {reject = value;}};
}
async function setup({actorTalents = [], targetTalents = []} = {}) {
  const persistence = memory(), store = createStore({persistence}); await store.ready;
  await store.addProfile({id:'control-profile-a',name:'Même nom de contrôle',kind:'PJ',hp:40,maxHp:40,initiative:60,caracs:{CC:60,E:30,F:30},size:3,talents:actorTalents,armor:{head:0,body:0,arms:0,legs:0},extensions:{ficheId:'synthetic-a'}});
  await store.addProfile({id:'control-profile-t',name:'Même nom de contrôle',kind:'PJ',hp:40,maxHp:40,initiative:30,caracs:{CC:30,E:30,F:30},size:3,talents:targetTalents,armor:{head:0,body:0,arms:0,legs:0},extensions:{ficheId:'synthetic-t'}});
  for (const id of ['control-enc-a','control-enc-b']) await store.saveEncounter({id,title:'Même titre de contrôle',entries:[{id:id+':a',profileId:'control-profile-a',quantity:1,zone:'active'},{id:id+':t',profileId:'control-profile-t',quantity:1,zone:'active'}]});
  await store.launchEncounter('control-enc-a'); const engine=createCombatEngine(store); await engine.start();
  const [actor,target]=store.listParticipants(); return {store,engine,persistence,actorId:actor.id,targetId:target.id};
}
const attack = (ctx, resolutionId, v5 = {}) => ctx.store.previewResolution({resolutionId,actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:4},roll:61,defense:{kind:'melee',base:20,roll:81},v5:{kind:'melee',...v5}});
const subject = (ctx,id) => ctx.store.listParticipants().find(row => row.id===id);
const ledger = store => envelope(store).extensions?.v5?.actionLedger;

test('Contrôle raccordement 2.3 — Élan payé avant inversion, registre et dégâts atomiques, regain ne contourne pas quota', async () => {
  const ctx=await setup(); await ctx.store.updateParticipant(ctx.actorId,{extensions:{...subject(ctx,ctx.actorId).extensions,v5:{hasMomentum:true}}});
  const preview=attack(ctx,'control-paid',{extraAttack:true});
  assert.equal(preview.choiceRequired,false); assert.equal(preview.roll,61); assert.equal(hasMomentum(preview.input.actor),false); assert.equal(preview.actionCosts.ready,true);
  const beforeRevision=ctx.store.getLocalRevision(), beforeHp=subject(ctx,ctx.targetId).hp;
  assert.equal((await ctx.store.applyResolution(preview)).status,'applied');
  assert.equal(ctx.store.getLocalRevision(),beforeRevision+1); assert.ok(subject(ctx,ctx.targetId).hp<beforeHp);
  assert.equal(ledger(ctx.store).quotaUsage.find(row=>row.quotaId==='system:paid-momentum-extra-attack').used,1);
  assert.equal(hasMomentum(subject(ctx,ctx.actorId)),true,'Win regains Momentum, quota must remain consumed');
  const reloaded=createStore({persistence:ctx.persistence}); await reloaded.ready; const repeated=attack({...ctx,store:reloaded},'control-paid-again',{extraAttack:true});
  assert.equal(repeated.actionCosts.ready,false); assert.ok(repeated.unresolved.some(reason=>/Quota/.test(reason)));
  assert.equal((await reloaded.applyResolution(repeated)).status,'manual');
  assert.equal((await reloaded.applyResolution(preview)).status,'duplicate');
});

test('Contrôle raccordement 2.3 — annulation restaure coût, usage et résultat ensemble, reçu local conservé', async () => {
  const ctx=await setup(); await ctx.store.setFortune(ctx.actorId,2); const before=envelope(ctx.store), beforeHistory=ctx.store.getHistory();
  const preview=attack(ctx,'control-fortune-attack',{costs:[{id:'fortune-control',resource:'fortune',amount:1}],quotas:[{id:'control-talent',scope:'encounter',maximum:1}]});
  assert.equal(preview.actionCosts.ready,true); assert.equal((await ctx.store.applyResolution(preview)).status,'applied'); assert.equal(ctx.store.getFortune(ctx.actorId).balance,1);
  await ctx.store.undo(); assert.equal(ctx.store.getFortune(ctx.actorId).balance,2); assert.equal(subject(ctx,ctx.targetId).hp,before.combat.participants.find(row=>row.id===ctx.targetId).hp);
  assert.deepEqual(ledger(ctx.store),before.extensions?.v5?.actionLedger); assert.equal(ctx.store.getLog().filter(row=>row.detail?.resolutionId===preview.resolutionId).length,1);
  assert.equal(ctx.store.getHistory().past.length,beforeHistory.past.length);
});

test('Contrôle raccordement 2.3 — rejet disque et aperçu périmé préservent Fortune, quota, blessures et annulation', async () => {
  const ctx=await setup(); await ctx.store.setFortune(ctx.actorId,2);
  const preview=attack(ctx,'control-disk',{costs:[{id:'fortune-control',resource:'fortune',amount:1}],quotas:[{id:'control-talent',scope:'turn',maximum:1}]});
  const before={durable:ctx.persistence.snapshot(),log:ctx.store.getLog(),history:ctx.store.getHistory(),participants:ctx.store.listParticipants(),fortune:ctx.store.getFortune(ctx.actorId)};
  ctx.persistence.reject(true); assert.equal((await ctx.store.applyResolution(preview)).status,'error');
  assert.deepEqual(ctx.persistence.snapshot(),before.durable); assert.deepEqual(ctx.store.getLog(),before.log); assert.deepEqual(ctx.store.getHistory(),before.history); assert.deepEqual(ctx.store.listParticipants(),before.participants); assert.deepEqual(ctx.store.getFortune(ctx.actorId),before.fortune);
  ctx.persistence.reject(false); await ctx.store.setFortune(ctx.actorId,3); assert.equal((await ctx.store.applyResolution(preview)).status,'stale'); assert.equal(ctx.store.getFortune(ctx.actorId).balance,3); assert.deepEqual(ledger(ctx.store),before.durable.extensions?.v5?.actionLedger);
});

test('Contrôle raccordement 2.3 — exemption conserve quota talent, acteur suivant et Tour suivant indépendants', async () => {
  const ctx=await setup();
  const options={extraAttack:true,costs:[{id:'waived-momentum',resource:'momentum',amount:1}],exemptions:[{costId:'waived-momentum',sourceId:'control-free-attack'}],quotas:[{id:'control-free-talent',scope:'turn',maximum:1}]};
  const first=attack(ctx,'control-free-first',options); assert.equal(first.actionCosts.ready,true); assert.equal(first.actionCosts.paid.length,0); assert.equal((await ctx.store.applyResolution(first)).status,'applied');
  const repeat=attack(ctx,'control-free-repeat',options); assert.equal(repeat.actionCosts.ready,false); assert.ok(repeat.unresolved.some(reason=>/Quota/.test(reason)));
  assert.ok(!ledger(ctx.store).quotaUsage.some(row=>row.quotaId==='system:paid-momentum-extra-attack'));
  await ctx.engine.nextTurn(); await ctx.engine.nextTurn(); const next=attack(ctx,'control-free-next',options); assert.equal(next.actionCosts.ready,true);
});

test('Contrôle raccordement 2.3 — Fortune unknown reste inconnue malgré cache participant, maximum et destin', () => {
  const actor={id:'control-a',kind:'PJ',extensions:{ficheId:'synthetic-a',v5:{resources:{fortune:5}}},ficheSnapshot:{charId:'synthetic-a',resources:{fortuneMax:5},destin:3}};
  const state={combat:{participants:[actor]},reserve:[],extensions:{v5:{}}};
  assert.equal(getV5Fortune(state,actor).balance,null); assert.equal(getV5Fortune(state,actor).sourceBalance,null); assert.equal(Object.hasOwn(projectV5Resources(state,[actor])[0].extensions.v5.resources,'fortune'),false);
});

const owned = id => ({id,name:id,rank:1,status:'resolved'});
test('Contrôle raccordement 2.3 — Fortune par identité et pas par nom, suspendre/supprimer/recharger/exporter/cloud conserve le solde', async () => {
  const ctx=await setup(); await ctx.store.setFortune(ctx.actorId,2); await ctx.store.setFortune(ctx.targetId,5);
  const preview=attack(ctx,'control-between-encounters',{costs:[{id:'fortune-control',resource:'fortune',amount:1}],quotas:[{id:'control-per-encounter',scope:'encounter',maximum:1}]});
  assert.equal((await ctx.store.applyResolution(preview)).status,'applied'); await ctx.store.suspendActiveScene(); await ctx.store.launchEncounter('control-enc-b'); await ctx.engine.start();
  const [actor,target]=ctx.store.listParticipants(); assert.notEqual(actor.id,ctx.actorId); assert.equal(ctx.store.getFortune(actor.id).balance,1); assert.equal(ctx.store.getFortune(target.id).balance,5);
  await ctx.store.deleteEncounter('control-enc-a'); assert.equal(ctx.store.getFortune(actor.id).balance,1); assert.ok(!ledger(ctx.store).appliedActions.some(row=>row.encounterId==='control-enc-a')); assert.ok(!ledger(ctx.store).quotaUsage.some(row=>JSON.parse(row.scopeKey)[0]==='control-enc-a'));
  for (const command of ctx.persistence.snapshot().history.past) for (const state of [command.result?.state,command.inverse?.state].filter(Boolean)) assert.ok(!(state.extensions?.v5?.actionLedger?.quotaUsage||[]).some(row=>JSON.parse(row.scopeKey)[0]==='control-enc-a'));
  await ctx.store.undo(); assert.equal(ctx.store.getFortune(actor.id).balance,1); assert.ok(!ledger(ctx.store).quotaUsage.some(row=>JSON.parse(row.scopeKey)[0]==='control-enc-a'));
  const reloaded=createStore({persistence:ctx.persistence}); await reloaded.ready; assert.equal(reloaded.getFortune(actor.id).balance,1);
  const imported=createStore({persistence:memory()}); await imported.ready; await imported.loadFromJSON(reloaded.getFullJSON()); assert.equal(imported.getFortune(actor.id).balance,1);
  const {createSyncDocument,validateSyncDocument}=await import('../../../js/core/sync-protocol.js'); const cloud=validateSyncDocument(JSON.parse(JSON.stringify(createSyncDocument(envelope(reloaded),{revision:15})))); assert.deepEqual(cloud.state.extensions.v5.characterResources,envelope(reloaded).extensions.v5.characterResources); assert.deepEqual(cloud.state.extensions.v5.actionLedger,ledger(reloaded));
});

test('Contrôle raccordement 2.3 — Mâchoires direct Sonné1 évité0 consomme quota, conserve Élan, undo et reload exacts', async () => {
  const ctx=await setup({targetTalents:[owned('talent-iron-jaw')]}); await ctx.store.updateParticipant(ctx.targetId,{extensions:{...subject(ctx,ctx.targetId).extensions,v5:{hasMomentum:true}}});
  assert.equal((await ctx.store.acquireConditions(ctx.targetId,[{name:'Stunned',level:0}],{resolutionId:'control-stun-zero'})).status,'applied'); assert.ok(!(ledger(ctx.store)?.quotaUsage||[]).some(row=>row.quotaId==='talent-iron-jaw:first-stunned'));
  assert.equal((await ctx.store.acquireConditions(ctx.targetId,[{name:'Sonné',level:1}],{resolutionId:'control-first-stun'})).status,'applied'); assert.equal(subject(ctx,ctx.targetId).states.length,0); assert.equal(hasMomentum(subject(ctx,ctx.targetId)),true);
  assert.equal(ledger(ctx.store).quotaUsage.find(row=>row.quotaId==='talent-iron-jaw:first-stunned').used,1);
  await ctx.store.undo(); assert.ok(!(ledger(ctx.store)?.quotaUsage||[]).some(row=>row.quotaId==='talent-iron-jaw:first-stunned')); assert.equal(hasMomentum(subject(ctx,ctx.targetId)),true);
  await ctx.store.redo(); const reload=createStore({persistence:ctx.persistence}); await reload.ready; assert.equal((await reload.acquireConditions(ctx.targetId,[{name:'Stunned',level:1}],{resolutionId:'control-second-stun'})).status,'applied'); assert.equal(reload.listParticipants().find(row=>row.id===ctx.targetId).states.find(row=>row.key==='sonne').level,1); assert.equal(hasMomentum(reload.listParticipants().find(row=>row.id===ctx.targetId)),false);
});

test('Contrôle raccordement 2.3 — attaque payante critique et Mâchoires gardent leurs deux quotas dans la même commande', async () => {
  const ctx=await setup({targetTalents:[owned('talent-iron-jaw')]}); await ctx.store.setFortune(ctx.actorId,2);
  const preview=ctx.store.previewResolution({resolutionId:'control-paid-iron',actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:4},roll:22,defense:{base:20,roll:81},criticalRolls:{location:2,effect:20},v5:{kind:'melee',costs:[{id:'fortune-control',resource:'fortune',amount:1}],quotas:[{id:'control-outer-cost-quota',scope:'turn',maximum:1}]}});
  assert.equal(preview.critical.application.states.length,0); assert.equal(preview.talentUsageRequests.length,1); assert.equal((await ctx.store.applyResolution(preview)).status,'applied'); assert.equal(ctx.store.getFortune(ctx.actorId).balance,1);
  assert.equal(ledger(ctx.store).quotaUsage.find(row=>row.quotaId==='control-outer-cost-quota').used,1); assert.equal(ledger(ctx.store).quotaUsage.find(row=>row.quotaId==='talent-iron-jaw:first-stunned').used,1);
  assert.equal((await ctx.store.acquireConditions(ctx.targetId,[{name:'Sonné',level:1}],{resolutionId:'control-paid-iron-later'})).status,'applied'); assert.equal(subject(ctx,ctx.targetId).states.find(row=>row.key==='sonne').level,1);
});

test('Contrôle raccordement 2.3 — Battement efface toutes Blessures/critique cible et garde critique défenseur indépendant', async () => {
  const ctx=await setup({actorTalents:[owned('talent-beat-blade')]}); await ctx.store.updateParticipant(ctx.targetId,{hp:1});
  const preview=ctx.store.previewResolution({resolutionId:'control-beat-both-criticals',actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:40},roll:22,defense:{base:70,roll:44},defenderCriticalRolls:{location:2,effect:20},v5:{kind:'melee',actorSize:3,targetSize:3,talentChoices:{'talent-beat-blade:replace-damage':true}}});
  assert.equal(preview.unresolved.length,0); assert.equal(preview.damage,null); assert.equal(preview.critical,null); assert.ok(preview.defenderCritical); assert.equal(preview.activeEffects.length,1); assert.equal(preview.activeEffects[0].v5Timing.expiry.actorId,ctx.actorId);
  assert.equal((await ctx.store.applyResolution(preview)).status,'applied'); assert.equal(subject(ctx,ctx.targetId).hp,1); assert.equal(subject(ctx,ctx.targetId).states.length,1); assert.equal(subject(ctx,ctx.targetId).states[0].kind,'talent-active'); assert.equal(subject(ctx,ctx.targetId).states[0].source.talentId,'talent-beat-blade'); assert.ok(subject(ctx,ctx.actorId).hp<40); assert.ok(subject(ctx,ctx.actorId).states.some(row=>row.key==='sonne'));
  await ctx.store.undo(); assert.equal(subject(ctx,ctx.targetId).states.length,0); assert.equal(subject(ctx,ctx.actorId).hp,40);
});

test('Contrôle raccordement 2.3 — Battement interdit Melee, autorise Esquive et expire fin prochain Tour auteur après reload', async () => {
  const ctx=await setup({actorTalents:[owned('talent-beat-blade')]});
  const input={actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:4},roll:23,defense:{base:20,roll:81},v5:{kind:'melee',actorSize:3,targetSize:3,talentChoices:{'talent-beat-blade:replace-damage':true}}};
  const first=ctx.store.previewResolution({...input,resolutionId:'control-beat-clock'}); assert.equal((await ctx.store.applyResolution(first)).status,'applied');
  const later={...input,v5:{...input.v5,choice:'keep',talentChoices:{'talent-beat-blade:replace-damage':false}}};
  const melee=ctx.store.previewResolution({...later,resolutionId:'control-beat-restrict'}); assert.ok(melee.unresolved.some(row=>/Battement.*Corps à corps/.test(row))); assert.equal((await ctx.store.applyResolution(melee)).status,'manual');
  const dodge=ctx.store.previewResolution({...later,resolutionId:'control-beat-dodge',defense:{label:'Esquive',base:20,roll:81,v5:{kind:'test'}}}); assert.ok(!dodge.unresolved.some(row=>/Battement.*Corps à corps/.test(row))); assert.ok(dodge.test.advantage.advantage.some(row=>row.id==='talent-beat-blade'));
  await ctx.engine.nextTurn(); assert.ok(subject(ctx,ctx.targetId).states.some(row=>row.kind==='talent-active' && row.source?.talentId==='talent-beat-blade')); await ctx.engine.nextTurn(); assert.ok(subject(ctx,ctx.targetId).states.some(row=>row.kind==='talent-active' && row.source?.talentId==='talent-beat-blade'));
  const reload=createStore({persistence:ctx.persistence}); await reload.ready; const resumed=createCombatEngine(reload); await resumed.nextTurn(); assert.ok(!reload.listParticipants().find(row=>row.id===ctx.targetId).states.some(row=>row.kind==='talent-active' && row.source?.talentId==='talent-beat-blade')); await reload.undo(); assert.ok(reload.listParticipants().find(row=>row.id===ctx.targetId).states.some(row=>row.kind==='talent-active' && row.source?.talentId==='talent-beat-blade'));
});

test('Contrôle raccordement 2.3 — Coup puissant utilise Avantage net après paiement et annulation, sans multiplier rang', async () => {
  const ctx=await setup({actorTalents:[{...owned('talent-strike-mighty-blow'),rank:3}]}); await ctx.store.updateParticipant(ctx.actorId,{extensions:{...subject(ctx,ctx.actorId).extensions,v5:{hasMomentum:true}}});
  const normal=attack(ctx,'control-mighty-normal',{choice:'keep'}), paid=attack(ctx,'control-mighty-paid',{extraAttack:true});
  const bonus = preview => preview.talentPlans.flatMap(plan=>plan.proposals).find(row=>row.op==='modifyDamage')?.amount;
  assert.equal(bonus(normal),2); assert.equal(bonus(paid),1); assert.equal(paid.test.advantage.net,0); assert.equal(normal.damage.finalDamage-paid.damage.finalDamage,1);
  const cancelled=attack(ctx,'control-mighty-cancelled',{disadvantageSources:[{id:'control-disadvantage',label:'Désavantage synthétique'}]}); assert.equal(cancelled.test.advantage.net,0); assert.equal(bonus(cancelled),1);
  assert.equal((await ctx.store.applyResolution(paid)).status,'applied'); assert.equal(ctx.store.getLog()[0].detail.talentPlans.flatMap(plan=>plan.proposals).find(row=>row.op==='modifyDamage').amount,1);
});

test('Contrôle raccordement 2.3 — simulation ne dépense rien puis confirme coût et résultat une seule fois', async () => {
  const ctx=await setup(); await ctx.store.setFortune(ctx.actorId,2); await ctx.store.updateParticipant(ctx.actorId,{extensions:{...subject(ctx,ctx.actorId).extensions,v5:{hasMomentum:true}}});
  const beforeHp=subject(ctx,ctx.targetId).hp, beforeRevision=ctx.store.getLocalRevision();
  const simulation=ctx.store.simulateAction({resolutionId:'control-simulation-paid',actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:4},roll:61,defense:{base:20,roll:81},v5:{kind:'melee',extraAttack:true,costs:[{id:'fortune-control',resource:'fortune',amount:1}]}});
  assert.equal(ctx.store.getFortune(ctx.actorId).balance,2); assert.equal(hasMomentum(subject(ctx,ctx.actorId)),true); assert.equal(subject(ctx,ctx.targetId).hp,beforeHp); assert.equal(ctx.store.getLocalRevision(),beforeRevision); assert.equal(simulation.preview.roll,61);
  assert.equal((await ctx.store.applySimulation(simulation)).status,'applied'); assert.equal(ctx.store.getFortune(ctx.actorId).balance,1); assert.equal(ctx.store.getLocalRevision(),beforeRevision+1); assert.equal(ledger(ctx.store).appliedActions.filter(row=>row.actionId==='control-simulation-paid').length,1);
  assert.equal((await ctx.store.applySimulation(simulation)).status,'duplicate'); await ctx.store.undo(); assert.equal(ctx.store.getFortune(ctx.actorId).balance,2); assert.equal(subject(ctx,ctx.targetId).hp,beforeHp); assert.equal(hasMomentum(subject(ctx,ctx.actorId)),true);
});

test('Contrôle raccordement 2.3 — Battement choix/tailles inconnus bloquent, refus reste action ordinaire sans tailles', async () => {
  const ctx=await setup({actorTalents:[owned('talent-beat-blade')]});
  const input={actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:4},roll:23,defense:{base:20,roll:81}};
  const missing=ctx.store.previewResolution({...input,resolutionId:'control-beat-missing',v5:{kind:'melee',talentChoices:{'talent-beat-blade:replace-damage':true}}}); assert.ok(missing.unresolved.some(row=>row.includes('size'))); assert.equal((await ctx.store.applyResolution(missing)).status,'manual');
  const ordinary=ctx.store.previewResolution({...input,resolutionId:'control-beat-declined',v5:{kind:'melee',talentChoices:{'talent-beat-blade:replace-damage':false}}}); assert.equal(ordinary.unresolved.length,0); assert.ok(ordinary.damage); assert.equal(ordinary.activeEffects.length,0);
  const larger=ctx.store.previewResolution({...input,resolutionId:'control-beat-larger',v5:{kind:'melee',actorSize:3,targetSize:4,talentChoices:{'talent-beat-blade:replace-damage':true}}}); assert.ok(larger.damage); assert.equal(larger.activeEffects.length,0);
});

test('Contrôle raccordement 2.3 — Battement suspendu ne prend pas Tours autre rencontre avant reprise', async () => {
  const ctx=await setup({actorTalents:[owned('talent-beat-blade')]});
  const preview=ctx.store.previewResolution({resolutionId:'control-beat-paused',actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:4},roll:23,defense:{base:20,roll:81},v5:{kind:'melee',actorSize:3,targetSize:3,talentChoices:{'talent-beat-blade:replace-damage':true}}}); assert.equal((await ctx.store.applyResolution(preview)).status,'applied');
  await ctx.engine.nextTurn(); const scene=ctx.store.getActiveScene(); await ctx.store.suspendActiveScene(); await ctx.store.launchEncounter('control-enc-b'); await ctx.engine.start(); for(let i=0;i<6;i++)await ctx.engine.nextTurn();
  await ctx.store.suspendActiveScene(); await ctx.store.resumeScene(scene.id); assert.ok(subject(ctx,ctx.targetId).states.some(row=>row.kind==='talent-active'&&row.source?.talentId==='talent-beat-blade'));
  await ctx.engine.nextTurn(); assert.ok(subject(ctx,ctx.targetId).states.some(row=>row.kind==='talent-active'&&row.source?.talentId==='talent-beat-blade')); await ctx.engine.nextTurn(); assert.ok(!subject(ctx,ctx.targetId).states.some(row=>row.kind==='talent-active'&&row.source?.talentId==='talent-beat-blade'));
});

test('Contrôle raccordement 2.3 — modifier aperçu ou simulation après confirmation ne change pas la commande capturée', async () => {
  const ctx=await setup(); await ctx.store.setFortune(ctx.actorId,2);
  const preview=attack(ctx,'control-captured-queue',{costs:[{id:'fortune-control',resource:'fortune',amount:1}]}); const damage=preview.damage.finalDamage, hp=subject(ctx,ctx.targetId).hp;
  const committing=ctx.store.applyResolution(preview); preview.input.actor.hp=1; preview.damage.finalDamage=99; preview.actionCostPlan.request.costs[0].amount=2; preview.resolutionId='control-tampered';
  assert.equal((await committing).status,'applied'); assert.equal(ctx.store.getFortune(ctx.actorId).balance,1); assert.equal(subject(ctx,ctx.targetId).hp,hp-damage); assert.equal(ctx.store.getLog()[0].detail.resolutionId,'control-captured-queue');
  await ctx.store.undo();
  const sim=ctx.store.simulateAction({resolutionId:'control-captured-simulation',actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'attack',attr:'CC',base:60,damage:4},roll:61,defense:{base:20,roll:81},v5:{kind:'melee',costs:[{id:'fortune-control',resource:'fortune',amount:1}]}}); const simDamage=sim.preview.damage.finalDamage;
  const simCommit=ctx.store.applySimulation(sim); sim.preview.input.actor.hp=1; sim.preview.damage.finalDamage=99; sim.preview.actionCostPlan.request.costs[0].amount=2; sim.preview.resolutionId='control-tampered-sim';
  assert.equal((await simCommit).status,'applied'); assert.equal(ctx.store.getFortune(ctx.actorId).balance,1); assert.equal(subject(ctx,ctx.targetId).hp,hp-simDamage); assert.equal(ctx.store.getLog()[0].detail.resolutionId,'control-captured-simulation');
});

const sourceAttack = (ctx,id) => ctx.store.previewResolution({resolutionId:id,actorId:ctx.actorId,targetId:ctx.targetId,action:{id:'control-blade',type:'attack',attr:'CC',base:60,damage:4},roll:23,defense:{base:20,roll:81},v5:{kind:'melee'}});
const reactionAttack = (ctx,offer,id,overrides={}) => ctx.store.previewResolution({resolutionId:id,actorId:ctx.actorId,targetId:ctx.targetId,action:structuredClone(offer.action),roll:61,defense:{base:20,roll:81},v5:{kind:'melee',reactionId:offer.id,costs:[],quotas:[],reactionSourceResolutionId:'forged-client-source'},...overrides});

test('Contrôle raccordement 2.3 — Assaut offre après touche, Élan avant calcul, confirmation atomique Round/Tour et undo', async () => {
  const ctx=await setup({actorTalents:[owned('talent-furious-assault'),owned('talent-strike-mighty-blow')]}); const source=sourceAttack(ctx,'control-furious-source'); assert.equal((await ctx.store.applyResolution(source)).status,'applied');
  const offer=ctx.store.getReactionOpportunities(ctx.actorId)[0]; assert.ok(offer); assert.equal(offer.sourceResolutionId,source.resolutionId); assert.equal(offer.actorId,ctx.actorId); assert.equal(offer.targetId,ctx.targetId); assert.equal((ledger(ctx.store).quotaUsage||[]).length,0);
  const durable=ctx.persistence.snapshot(), hp=subject(ctx,ctx.targetId).hp; const preview=reactionAttack(ctx,offer,'control-furious-result'); assert.equal(ctx.store.getLocalRevision(),durable.localRevision); assert.equal(preview.roll,61); assert.equal(preview.choiceRequired,false); assert.equal(preview.input.actor.extensions.v5.hasMomentum,false); assert.equal(preview.input.v5.reactionSourceResolutionId,source.resolutionId); assert.equal(preview.talentPlans.flatMap(plan=>plan.proposals).find(row=>row.op==='modifyDamage').amount,1);
  assert.deepEqual(ctx.persistence.snapshot(),durable,'Preparing opportunity must not consume or persist anything'); ctx.persistence.reject(true); assert.equal((await ctx.store.applyResolution(preview)).status,'error'); assert.deepEqual(ctx.persistence.snapshot(),durable); assert.equal(ctx.store.getReactionOpportunities(ctx.actorId).length,1); assert.equal(subject(ctx,ctx.targetId).hp,hp);
  ctx.persistence.reject(false); assert.equal((await ctx.store.applyResolution(preview)).status,'applied'); assert.equal(ctx.store.getReactionOpportunities(ctx.actorId).length,0); assert.equal(ledger(ctx.store).quotaUsage.find(row=>row.quotaId==='talent-furious-assault:round').used,1); assert.equal(ledger(ctx.store).quotaUsage.find(row=>row.quotaId==='system:paid-momentum-extra-attack').used,1); assert.equal(hasMomentum(subject(ctx,ctx.actorId)),true);
  const repeat=sourceAttack(ctx,'control-furious-repeat'); repeat.input.v5.choice='keep'; const rebuilt=ctx.store.previewResolution({...repeat.input,resolutionId:'control-furious-repeat',v5:{...repeat.input.v5,choice:'keep'}}); assert.equal((await ctx.store.applyResolution(rebuilt)).status,'applied'); assert.equal(ctx.store.getReactionOpportunities(ctx.actorId).length,0,'Round usage blocks another opportunity despite regained Momentum'); await ctx.store.undo(); await ctx.store.undo(); assert.equal(ctx.store.getReactionOpportunities(ctx.actorId).length,1); assert.equal(ledger(ctx.store).quotaUsage.length,0); assert.equal(subject(ctx,ctx.targetId).hp,hp);
});

test('Contrôle raccordement 2.3 — Assaut refuse source inconnue, auteur/cible/arme changés et horloge expirée', async () => {
  const ctx=await setup({actorTalents:[owned('talent-furious-assault')]}); assert.equal((await ctx.store.applyResolution(sourceAttack(ctx,'control-furious-invalid-source'))).status,'applied'); const offer=ctx.store.getReactionOpportunities(ctx.actorId)[0];
  for(const [name,override] of [['unknown',{v5:{kind:'melee',reactionId:'no-such-source'}}],['target',{targetId:ctx.actorId}],['actor',{actorId:ctx.targetId}],['weapon',{action:{...offer.action,id:'control-other-weapon'}}],['damage',{action:{...offer.action,damage:100}}]]){
    const preview=reactionAttack(ctx,offer,'control-invalid-'+name,override); assert.ok(preview.unresolved.length>0,name); assert.notEqual((await ctx.store.applyResolution(preview)).status,'applied',name); assert.equal(ctx.store.getReactionOpportunities(ctx.actorId).length,1);
  }
  await ctx.engine.nextTurn(); assert.equal(ctx.store.getReactionOpportunities(ctx.actorId).length,0); const expired=reactionAttack(ctx,offer,'control-furious-expired'); assert.ok(expired.unresolved.length>0); assert.notEqual((await ctx.store.applyResolution(expired)).status,'applied');
});

test('Contrôle raccordement 2.3 — Assaut rechargé/exporté/cloud conserve lien, purge rencontre nettoie offres et historique', async () => {
  const ctx=await setup({actorTalents:[owned('talent-furious-assault')]}); assert.equal((await ctx.store.applyResolution(sourceAttack(ctx,'control-furious-durable-source'))).status,'applied'); const offer=ctx.store.getReactionOpportunities(ctx.actorId)[0];
  const reload=createStore({persistence:ctx.persistence}); await reload.ready; assert.equal(reload.getReactionOpportunities(ctx.actorId)[0].sourceResolutionId,offer.sourceResolutionId); assert.equal(reactionAttack({...ctx,store:reload},offer,'control-reloaded-reaction').actionCosts.ready,true);
  const {createSyncDocument}=await import('../../../js/core/sync-protocol.js'); const cloud=createSyncDocument(envelope(reload)); assert.equal(cloud.state.extensions.v5.reactionOpportunities[0].sourceResolutionId,offer.sourceResolutionId); assert.equal(Object.hasOwn(cloud.state,'appliedResolutionIds'),false); const imported=createStore({persistence:memory()}); await imported.ready; await imported.loadFromJSON(cloud.state); assert.equal(imported.getReactionOpportunities(ctx.actorId)[0].sourceResolutionId,offer.sourceResolutionId);
  await reload.deleteEncounter('control-enc-a'); assert.equal((envelope(reload).extensions.v5.reactionOpportunities||[]).length,0); for(const command of ctx.persistence.snapshot().history.past)for(const state of [command.result?.state,command.inverse?.state].filter(Boolean))assert.ok(!(state.extensions?.v5?.reactionOpportunities||[]).some(row=>row.encounterId==='control-enc-a')); await reload.undo(); assert.equal(reload.getReactionOpportunities(ctx.actorId).length,0);
});

test('Contrôle raccordement 2.3 — événement Sonné identifié est appliqué une fois même après quota Mâchoires épuisé', async () => {
  const ctx=await setup({targetTalents:[owned('talent-iron-jaw')]}); assert.equal((await ctx.store.acquireConditions(ctx.targetId,[{name:'Sonné',level:1}],{resolutionId:'control-direct-id'})).status,'applied'); const before=ctx.persistence.snapshot(); assert.equal((await ctx.store.acquireConditions(ctx.targetId,[{name:'Sonné',level:1}],{resolutionId:'control-direct-id'})).status,'duplicate'); assert.deepEqual(ctx.persistence.snapshot(),before); assert.equal(subject(ctx,ctx.targetId).states.length,0);
});

test('Contrôle raccordement 2.3 — Assaut refuse talent retiré ou empreinte source durable inconnue/modifiée', async () => {
  const missing=await setup({actorTalents:[owned('talent-furious-assault')]}); assert.equal((await missing.store.applyResolution(sourceAttack(missing,'control-furious-talent-source'))).status,'applied'); const offer=missing.store.getReactionOpportunities(missing.actorId)[0]; await missing.store.updateParticipant(missing.actorId,{talents:[]}); const removed=reactionAttack(missing,offer,'control-furious-talent-removed'); assert.ok(removed.unresolved.length>0); assert.notEqual((await missing.store.applyResolution(removed)).status,'applied');
  for(const hash of [null,'sha256:'+'0'.repeat(64)]) {
    const ctx=await setup({actorTalents:[owned('talent-furious-assault')]}); assert.equal((await ctx.store.applyResolution(sourceAttack(ctx,'control-furious-source-pin'))).status,'applied'); const offer=ctx.store.getReactionOpportunities(ctx.actorId)[0];
    await ctx.store.executeCommand('control-change-public-origin',draft=>({...draft,extensions:{...draft.extensions,v5:{...draft.extensions.v5,reactionOpportunities:draft.extensions.v5.reactionOpportunities.map(row=>({...row,source:hash?{...row.source,effectHash:hash}:null}))}}}));
    const changed=reactionAttack(ctx,offer,'control-furious-source-blocked'); assert.ok(changed.unresolved.length>0); assert.notEqual((await ctx.store.applyResolution(changed)).status,'applied');
  }
});

test('Contrôle raccordement 2.3 — première association PJ conserve Fortune dépensée dans scènes active/suspendue, undo/refresh et autre fiche distincts', async () => {
  const persistence=memory(), store=createStore({persistence}); await store.ready; await store.addProfile({id:'control-unbound-pj',name:'Même nom',kind:'PJ',hp:40,maxHp:40,initiative:60,caracs:{E:30}});
  for(const id of ['control-binding-a','control-binding-b'])await store.saveEncounter({id,title:'Même titre',entries:[{id:id+':entry',profileId:'control-unbound-pj',quantity:1,zone:'active'}]});
  await store.launchEncounter('control-binding-a'); const first=store.listParticipants()[0].id; await createCombatEngine(store).start(); await store.setFortune(first,3); await store.acquireConditions(first,[{name:'Sonné',level:2}],{resolutionId:'control-binding-stun'}); await store.recoverCondition(first,'sonne',{method:'fortune'}); assert.equal(store.getFortune(first).balance,2);
  await store.suspendActiveScene(); await store.launchEncounter('control-binding-b'); const second=store.listParticipants()[0].id;
  const {ficheSnapshot}=await import('../../../js/core/fiche-sync.js'); const snapshot=ficheSnapshot('synthetic-first-bind',{nom:'Même nom',chance:'9',destin:'99'}); await store.applyFicheSync([{profileId:'control-unbound-pj',snapshot}]);
  assert.equal(store.getFortune(second).characterId,'fiche:synthetic-first-bind'); assert.equal(store.getFortune(second).balance,2); assert.equal(store.getFortune('control-unbound-pj').balance,2); assert.equal(store.getFortune(second).initializedFrom,'mj'); assert.equal(store.listSuspendedScenes()[0].participants.find(row=>row.id===first).extensions.v5.resources.fortune,2); assert.equal(envelope(store).extensions.v5.characterResources.length,1);
  await store.undo(); assert.equal(store.getFortune(second).characterId,'copy:control-binding-b:control-binding-b:entry:0'); assert.equal(store.getFortune(second).balance,null); const undone=envelope(store),suspendedFirst=undone.suspendedScenes[0].participants.find(row=>row.id===first); assert.equal(getV5Fortune(undone,suspendedFirst).balance,2,'Undo restores the spent pool only to the original anonymous scene copy'); await store.redo(); assert.equal(store.getFortune(second).balance,2);
  await store.applyFicheSync([{profileId:'control-unbound-pj',snapshot:ficheSnapshot('synthetic-first-bind',{nom:'Même nom',chance:'8'})}]); assert.equal(store.getFortune(second).balance,2);
  const reload=createStore({persistence}); await reload.ready; assert.equal(reload.getFortune(second).balance,2); await reload.applyFicheSync([{profileId:'control-unbound-pj',replaceAssociation:true,snapshot:ficheSnapshot('synthetic-other-bind',{nom:'Même nom',chance:'5'})}]); assert.equal(reload.getFortune(second).balance,null); assert.equal(reload.getFortune(second).characterId,'fiche:synthetic-other-bind');
});
});

describe('Ressources lot 2 V5', () => {
function memory() {
  let state = null, reject = false;
  return { load: async () => state && structuredClone(state), saveAtomic: async ({ state: next }) => {
    if (reject) throw new Error('Disque indisponible');
    state = structuredClone(next); return { ok: true };
  }, snapshot: () => structuredClone(state), reject: value => { reject = value; } };
}
async function live() { const persistence = memory(), store = createStore({ persistence }); await store.ready; return { persistence, store }; }
const actor = (id, extra = {}) => ({ id, name: 'Même nom', kind: 'PJ', hp: 10, maxHp: 10, states: [{ name: 'À Terre', level: 1 }], zone: 'active', ...extra });
const envelope = participants => ({ localRevision: 1, reserve: [], persistentCharacters: [], combat: { participants }, extensions: {}, log: [], diceLines: [] });

test('Fortune V5 — fiche current Chance strict, maximum Destin absent/current vide jamais solde zéro', () => {
  for (const chance of ['2', 2, '0', 0]) assert.equal(ficheSnapshot('synthetic', { chance, destin: 8 }).resources.fortune, Number(chance));
  for (const chance of ['', ' ', '1e3', '1.5', -1, null, true, undefined]) assert.equal(ficheSnapshot('synthetic', { chance, destin: 8 }).resources, undefined);
  assert.equal(ficheSnapshot('synthetic', { destin: 8 }).resources, undefined);
  const subject = actor('a', { extensions: { ficheId: 'synthetic' }, ficheSnapshot: ficheSnapshot('synthetic', { chance: '2', destin: 8 }) });
  const input = envelope([subject]), before = structuredClone(input);
  assert.deepEqual(getV5Fortune(input, subject), { characterId: 'fiche:synthetic', balance: null, permanent: null, temporary: 0, sourceBalance: 2, initializedFrom: null });
  const initialized = setV5Fortune(input, subject, 2, { source: 'fiche' });
  assert.equal(getV5Fortune(initialized, subject).balance, 2);
  assert.throws(() => setV5Fortune(initialized, subject, 2, { source: 'fiche' }), /initialisation/);
  assert.deepEqual(input, before);
});

test('Fortune V5 — noms et templates PNJ identiques ne fusionnent pas les soldes', async () => {
  const { store } = await live();
  await store.addParticipant(actor('a', { kind: 'PNJ', profileId: 'template' }));
  await store.addParticipant(actor('b', { kind: 'PNJ', profileId: 'template' }));
  await store.setFortune('a', 2); await store.setFortune('b', 4);
  assert.notEqual(store.getFortune('a').characterId, store.getFortune('b').characterId);
  await store.recoverCondition('a', 'a-terre', { method: 'fortune' });
  assert.equal(store.getFortune('a').balance, 1); assert.equal(store.getFortune('b').balance, 4);
});

test('Fortune V5 — action payée répercute le solde unique sur toutes les copies du personnage', () => {
  const a = actor('a', { extensions: { ficheId: 'same' } }), b = actor('b', { extensions: { ficheId: 'same' } });
  let input = envelope([a, b]); input.activeScene = { participants: [a, b] }; input.suspendedScenes = [{ participants: [actor('c', { extensions: { ficheId: 'same' } })] }];
  input = setV5Fortune(input, a, 3);
  const paid = projectV5Resources(input, input.combat.participants); paid[0].extensions.v5.resources.fortune = 2;
  const next = commitV5Resources(input, paid);
  assert.equal(getV5Fortune(next, a).balance, 2);
  for (const row of [...next.combat.participants, ...next.activeScene.participants, ...next.suspendedScenes[0].participants]) assert.equal(row.extensions.v5.resources.fortune, 2);
  assert.equal(getV5Fortune(input, a).balance, 3);
});

test('Fortune V5 — ancien cache participant ou maximum ne devient pas solde courant', () => {
  const subject = actor('a', { extensions: { v5: { resources: { fortune: 5, focus: 2 } } }, ficheSnapshot: { charId: 'same', resources: { fortuneMax: 5 } } });
  const input = envelope([subject]);
  assert.equal(getV5Fortune(input, subject).balance, null);
  assert.deepEqual(projectV5Resources(input, [subject])[0].extensions.v5.resources, { focus: 2 });
});

test('Fortune V5 — récupération, reçu et dépense atomiques, annuler/redo/source fiche intacte', async () => {
  const { store, persistence } = await live();
  const snapshot = ficheSnapshot('synthetic', { chance: '3', destin: 5 });
  await store.addParticipant(actor('a', { extensions: { ficheId: 'synthetic' }, ficheSnapshot: snapshot }));
  await store.setFortune('a', 3, { source: 'fiche' });
  const before = persistence.snapshot(), result = await store.recoverCondition('a', 'a-terre', { method: 'fortune' });
  assert.equal(result.status, 'applied'); assert.equal(store.getFortune('a').balance, 2);
  assert.equal(store.listParticipants()[0].states.length, 0);
  assert.equal(store.getLog()[0].detail.resourceCost.after, 2);
  assert.deepEqual(store.listParticipants()[0].ficheSnapshot, snapshot);
  await store.undo(); assert.equal(store.getFortune('a').balance, 3); assert.equal(store.listParticipants()[0].states.length, 1);
  await store.redo(); assert.equal(store.getFortune('a').balance, 2); assert.equal(store.listParticipants()[0].states.length, 0);
  assert.deepEqual(before.combat.participants[0].ficheSnapshot, snapshot);
});

test('Fortune V5 — unknown, épuisée, révision périmée ou disque refusé ne changent pas état/journal', async () => {
  const { store, persistence } = await live(); await store.addParticipant(actor('a'));
  const before = persistence.snapshot();
  await assert.rejects(store.recoverCondition('a', 'a-terre', { method: 'fortune' }), error => error.code === 'V5_FORTUNE_UNKNOWN');
  assert.deepEqual(persistence.snapshot(), before);
  await store.setFortune('a', 0);
  const depleted = persistence.snapshot();
  await assert.rejects(store.recoverCondition('a', 'a-terre', { method: 'fortune' }), error => error.code === 'V5_FORTUNE_INSUFFICIENT');
  assert.deepEqual(persistence.snapshot(), depleted);
  const revision = store.getLocalRevision(); await store.setFortune('a', 2);
  assert.equal((await store.recoverCondition('a', 'a-terre', { method: 'fortune', baseRevision: revision })).status, 'stale');
  const ready = persistence.snapshot(); persistence.reject(true);
  assert.equal((await store.recoverCondition('a', 'a-terre', { method: 'fortune' })).ok, false);
  assert.deepEqual(persistence.snapshot(), ready);
  assert.equal(store.getFortune('a').balance, 2); assert.equal(store.listParticipants()[0].states.length, 1);
});

test('Fortune V5 — donnée de récupération manquante et État déjà absent ne paient pas', async () => {
  const { store } = await live();
  await store.addParticipant(actor('a', { states: [{ name: 'Inconscient', level: 1 }] }));
  await store.setFortune('a', 2);
  const pending = await store.recoverCondition('a', 'inconscient', { method: 'fortune' });
  assert.equal(pending.status, 'requires-input'); assert.equal(store.getFortune('a').balance, 2);
  assert.equal(store.listParticipants()[0].states.length, 1);
  await store.recoverCondition('a', 'inconscient', { method: 'fortune', causeEnded: true });
  assert.equal(store.getFortune('a').balance, 1);
  await store.recoverCondition('a', 'inconscient', { method: 'fortune', causeEnded: true });
  assert.equal(store.getFortune('a').balance, 1);
});

test('Fortune V5 — copies anonymes gardent leur solde propre entre rencontres', async () => {
  const { store, persistence } = await live();
  await store.addProfile({ id: 'pj', kind: 'PJ', name: 'Même nom', hp: 10 });
  for (const id of ['a', 'b']) await store.saveEncounter({ id, entries: [{ id: id + ':entry', profileId: 'pj', zone: 'active' }] });
  await store.launchEncounter('a'); const first = store.listParticipants()[0].id; await store.setFortune(first, 3);
  await store.suspendActiveScene(); const suspended = store.listSuspendedScenes()[0].id;
  await store.launchEncounter('b'); const second = store.listParticipants()[0].id;
  assert.notEqual(first, second); assert.equal(store.getFortune(second).balance, null, 'une copie anonyme ne récupère pas le solde d’une autre copie du profil');
  await store.setFortune(second, 1); await store.restartCombat();
  assert.equal(store.getFortune(store.listParticipants()[0].id).balance, 1);
  await store.deleteEncounter('b'); await store.resumeScene(suspended);
  assert.equal(store.getFortune(first).balance, 3);
  assert.equal(store.listParticipants()[0].extensions.v5.resources.fortune, 3);
  const reloaded = createStore({ persistence }); await reloaded.ready;
  assert.equal(reloaded.getFortune(first).balance, 3);
  await reloaded.deleteEncounter('a');
  await reloaded.saveEncounter({ id: 'c', entries: [{ id: 'c:entry', profileId: 'pj', zone: 'active' }] }); await reloaded.launchEncounter('c');
  assert.equal(reloaded.getFortune(reloaded.listParticipants()[0].id).balance, null);
});

test('Fortune V5 — export/import, migration et document cloud conservent registre stable', async () => {
  const { store } = await live(); await store.addParticipant(actor('a', { extensions: { ficheId: 'same' } })); await store.setFortune('a', 2);
  await store.recoverCondition('a', 'a-terre', { method: 'fortune' });
  const exported = store.getFullJSON(), state = JSON.parse(exported);
  assert.deepEqual(migrateSnapshot(state).data.extensions.v5.characterResources, state.extensions.v5.characterResources);
  const cloud = sharedState(state);
  assert.deepEqual(cloud.extensions.v5.characterResources, state.extensions.v5.characterResources);
  assert.equal(cloud.history, undefined);
  const copy = await live(); await copy.store.loadFromJSON(exported); assert.equal(copy.store.getFortune('a').balance, 1);
});

test('Fortune V5 — synchroniser la fiche ne réinitialise pas le solde du registre', async () => {
  const { store } = await live(); const snapshot = ficheSnapshot('synthetic', { nom: 'Même nom', chance: '3' });
  await store.addProfile({ id: 'profile', kind: 'PJ', name: 'Même nom', extensions: { ficheId: 'synthetic' }, ficheSnapshot: snapshot });
  await store.addParticipant(actor('a', { profileId: 'profile', extensions: { ficheId: 'synthetic' }, ficheSnapshot: snapshot }));
  await store.setFortune('a', 1);
  const input = JSON.parse(store.getFullJSON()), updated = applyFicheSync(input, [{ profileId: 'profile', snapshot: ficheSnapshot('synthetic', { nom: 'Même nom', chance: '3' }) }]);
  await store.loadFromJSON(updated);
  assert.equal(store.getFortune('a').balance, 1); assert.equal(store.listParticipants()[0].extensions.v5.resources.fortune, 1);
});

test('Fortune V5 — ancienne façade localStorage conserve registre et annulation', async () => {
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)) };
  const store = createStore({ storage }); await store.addParticipant(actor('a')); await store.setFortune('a', 2);
  await store.recoverCondition('a', 'a-terre', { method: 'fortune' });
  assert.ok(data.has(KEY.EXTENSIONS));
  const reloaded = createStore({ storage }); assert.equal(reloaded.getFortune('a').balance, 1);
  await store.undo(); assert.equal(store.getFortune('a').balance, 2); assert.equal(store.listParticipants()[0].states.length, 1);
});

test('Fortune V5 — premier lien PJ explicite conserve le solde outil, undo et refresh sans refill', async () => {
  const { store } = await live();
  await store.addProfile({ id: 'local-pj', kind: 'PJ', name: 'Même nom', hp: 10 });
  await store.addParticipant(actor('bound-copy', { profileId: 'local-pj' }));
  await store.setFortune('local-pj', 1);
  const source = ficheSnapshot('synthetic-first-link', { chance: '9', destin: 12 });
  await store.applyFicheSync([{ profileId: 'local-pj', snapshot: source }]);
  assert.equal(store.getFortune('local-pj').characterId, 'fiche:synthetic-first-link');
  assert.equal(store.getFortune('local-pj').balance, 1);
  assert.equal(store.getFortune('bound-copy').balance, 1);
  await store.undo(); assert.equal(store.getFortune('local-pj').characterId, 'profile:local-pj'); assert.equal(store.getFortune('local-pj').balance, 1);
  await store.redo(); assert.equal(store.getFortune('local-pj').balance, 1);
  await store.applyFicheSync([{ profileId: 'local-pj', snapshot: ficheSnapshot('synthetic-first-link', { chance: '8' }) }]);
  assert.equal(store.getFortune('local-pj').balance, 1);
  await store.applyFicheSync([{ profileId: 'local-pj', replaceAssociation: true, snapshot: ficheSnapshot('synthetic-other-character', { chance: '5' }) }]);
  assert.equal(store.getFortune('local-pj').characterId, 'fiche:synthetic-other-character'); assert.equal(store.getFortune('local-pj').balance, null);
});

test('Fortune V5 — destination connue ou association ambiguë ne transfère aucun solde par hypothèse', () => {
  const profile = { id: 'local', kind: 'PJ' }, other = { id: 'other', kind: 'PJ', extensions: { ficheId: 'existing' } };
  const before = { reserve: [profile, other], combat: { participants: [] }, persistentCharacters: [], extensions: { v5: { characterResources: [{ characterId: 'profile:local', fortune: 1, initializedFrom: 'mj' }, { characterId: 'fiche:existing', fortune: 4, initializedFrom: 'mj' }] } } };
  const next = { ...structuredClone(before), reserve: [{ ...profile, extensions: { ficheId: 'existing' } }, other] };
  const bound = reconcileV5ResourceBindings(before, next, [{ profileId: 'local', snapshot: { charId: 'existing' } }]);
  assert.deepEqual(bound.extensions.v5.characterResources, before.extensions.v5.characterResources);
  const ambiguous = reconcileV5ResourceBindings(before, { ...next, reserve: [{ ...profile, extensions: { ficheId: 'new' } }, other] }, [{ profileId: 'local', snapshot: { charId: 'new' } }, { profileId: 'other', snapshot: { charId: 'new' } }]);
  assert.deepEqual(ambiguous.extensions.v5.characterResources, before.extensions.v5.characterResources);
});
});

describe('Fortune et relance (caractérisation)', () => {
// Tests de caractérisation : chemin « Relance par la Chance » (V5).
// Ces tests figent le comportement ACTUEL du Store pour qu'une refacturation
// ne puisse pas le casser silencieusement. Ils ne testent pas la règle du livre,
// seulement ce que le code fait aujourd'hui.

const MESSAGE_JET_MANQUANT = 'Relance de Fortune : saisir le nouveau jet d100 (1 à 100).';

function mageDeBase() {
  return {
    id: 'mage',
    profileId: 'mage-profile',
    name: 'Mage',
    kind: 'PJ',
    camp: 'pj',
    zone: 'active',
    hp: 20,
    maxHp: 20,
    caracs: { CC: 30, CT: 30, F: 30, E: 30, Int: 60, FM: 50, I: 40, Ag: 40, Soc: 35 },
    skills: [{ name: 'Langue (Magick)', total: 90 }],
    states: []
  };
}

// Montage identique au test de bout en bout du Lot 3 (P1 #3) : un combat avec
// le mage comme acteur courant, plus un allié et un ennemi.
async function monterCombat() {
  const store = createStore();
  await store.ready;
  const base = mageDeBase();
  await store.loadFromJSON({
    schemaVersion: 3,
    reserve: [],
    combat: {
      round: 1,
      currentActorId: 'mage',
      order: ['mage', 'ally', 'enemy'],
      participants: [
        { ...structuredClone(base), actions: [{ name: 'Coup de bâton', type: 'attack', attr: 'CC', base: 50, damage: 'BF+2' }] },
        { ...structuredClone(base), id: 'ally', profileId: 'ally-profile', name: 'Allié' },
        { ...structuredClone(base), id: 'enemy', profileId: 'enemy-profile', name: 'Ennemi', kind: 'PNJ', camp: 'ennemi' }
      ]
    },
    diceLines: [],
    log: []
  });
  return store;
}

// Test de FM (score 50) raté d'office avec un 88, éventuellement accompagné
// d'une demande de relance par la Chance avec le nouveau jet fourni.
function previsualiserRelance(store, options = {}) {
  const mageParticipant = store.listParticipants().find(p => p.id === 'mage');
  const v5 = { kind: 'test', fortuneReroll: true };
  if ('fortuneRerollRoll' in options) v5.fortuneRerollRoll = options.fortuneRerollRoll;
  return store.previewResolution({
    actor: mageParticipant,
    action: { name: 'Concentration', type: 'test', attr: 'FM', base: 50 },
    targetId: 'enemy',
    roll: '88',
    v5
  });
}

test('Relance par la Chance — un test raté (88) devient une réussite (24) et la prévisualisation le reflète', async () => {
  const store = await monterCombat();
  await store.setFortune('mage', 3);
  assert.equal(store.getFortune('mage').balance, 3);

  const sansRelance = store.previewResolution({
    actor: store.listParticipants().find(p => p.id === 'mage'),
    action: { name: 'Concentration', type: 'test', attr: 'FM', base: 50 },
    targetId: 'enemy',
    roll: '88',
    v5: { kind: 'test' }
  });
  assert.equal(sansRelance.success, false, 'Un 88 sur score 50 est un échec sans relance');

  const apercu = previsualiserRelance(store, { fortuneRerollRoll: 24 });
  assert.equal(apercu.success, true, 'Le nouveau jet d100 (24) remplace le 88 et transforme l’échec en réussite');
  assert.equal(apercu.fortuneReroll.active, true);
  assert.equal(apercu.fortuneReroll.used, true, 'La prévisualisation signale que la relance est utilisée');
  assert.equal(apercu.fortuneReroll.rerollRoll, 24);
  assert.equal(apercu.fortuneReroll.initialRoll, 88, 'Le jet initial d’avant relance est conservé dans la prévisualisation');
  assert.ok(apercu.actionCosts.paid.some(c => c.resource === 'fortune' && c.amount === 1),
    'La prévisualisation prévoit un coût d’exactement 1 Point de Chance');
});

test('Relance par la Chance — l’application débite exactement 1 Point de Chance permanent (sans Chance temporaire)', async () => {
  const store = await monterCombat();
  await store.setFortune('mage', 3);
  assert.equal(store.getFortune('mage').balance, 3);
  assert.equal(store.getFortune('mage').temporary, 0);

  const apercu = previsualiserRelance(store, { fortuneRerollRoll: 24 });
  await store.applyResolution(apercu);

  const fortune = store.getFortune('mage');
  assert.equal(fortune.balance, 2, 'Exactement 1 Point de Chance est débité (3 -> 2)');
  assert.equal(fortune.permanent, 2);
  assert.equal(fortune.temporary, 0);
});

test('Relance par la Chance — la Chance temporaire est dépensée avant la Chance permanente', async () => {
  const store = await monterCombat();
  await store.setFortune('mage', 2);

  // « Le Second Signe d’Amul » octroie 3 Points de Chance temporaires (même montage que le Lot 3, P1 #3).
  await store.applySpellExecution('Le Second Signe d’Amul', {
    actorId: 'mage',
    targetIds: ['mage'],
    roll: 12,
    attributeActive: false
  });
  assert.equal(store.getFortune('mage').balance, 5, '2 permanents + 3 temporaires');
  assert.equal(store.getFortune('mage').permanent, 2);
  assert.equal(store.getFortune('mage').temporary, 3);

  const apercu = previsualiserRelance(store, { fortuneRerollRoll: 24 });
  await store.applyResolution(apercu);

  const fortune = store.getFortune('mage');
  assert.equal(fortune.temporary, 2, 'Le point dépensé vient de la composante temporaire (3 -> 2)');
  assert.equal(fortune.permanent, 2, 'Le solde permanent est inchangé');
  assert.equal(fortune.balance, 4);
});

test('Relance par la Chance — sans nouveau jet d100, un besoin est signalé et la relance n’est pas utilisée', async () => {
  const store = await monterCombat();
  await store.setFortune('mage', 3);

  const apercu = previsualiserRelance(store);
  assert.ok((apercu.unresolved || []).includes(MESSAGE_JET_MANQUANT),
    'La prévisualisation signale qu’il faut saisir le nouveau jet d100');
  assert.equal(apercu.fortuneReroll.active, true);
  assert.equal(apercu.fortuneReroll.used, false, 'Sans jet de relance, la relance n’est pas marquée utilisée');
  assert.equal(apercu.fortuneReroll.rerollRoll, null);
  assert.equal(apercu.success, false, 'Le 88 initial reste un échec tant que le nouveau jet n’est pas fourni');
  assert.equal(apercu.ready, false);
});

test('Relance par la Chance — l’annulation (Undo) restaure le solde de Chance', async () => {
  const store = await monterCombat();
  await store.setFortune('mage', 3);

  const apercu = previsualiserRelance(store, { fortuneRerollRoll: 24 });
  await store.applyResolution(apercu);
  assert.equal(store.getFortune('mage').balance, 2);

  await store.undo();
  const fortune = store.getFortune('mage');
  assert.equal(fortune.balance, 3, 'Undo rétablit le solde d’avant la relance');
  assert.equal(fortune.permanent, 3);
  assert.equal(fortune.temporary, 0);
});
});
