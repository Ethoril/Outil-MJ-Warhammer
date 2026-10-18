import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { applySpellEffects } from '../js/core/v5-magic-effects.js';
import { applyBeastForm, BEAST_PROFILES } from '../js/core/v5-magic-arbitrations.js';
import { advanceGameClock, createGameClock } from '../js/core/v5-game-time.js';
import { normalizeRemoteDocument } from '../js/core/sync-session.js';
import { validateSyncDocument } from '../js/core/sync-protocol.js';

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
