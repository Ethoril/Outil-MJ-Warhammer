import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { ficheSnapshot } from '../js/core/fiche-sync.js';
import { magicActionsFor } from '../js/core/creature-magic.js';
import { resolveCastingSkill, previewCasting } from '../js/core/v5-magic-casting.js';
import { resolveChannellingSkill } from '../js/core/v5-magic-channelling.js';
import { contemplationOutcome } from '../js/core/slann.js';
import { previewFamiliarHealing } from '../js/core/familiars.js';
import { buildSlannBlock, readSlannInputs } from '../js/ui/slann-block.js';

// B11c : corrections de la contre-vérification de B7-B11 (Lanceur de sorts de bestiaire, durables des fiches, soins et États de
// l'homoncule, Puissance totale, Contemplation, Élan, Vol de retour au livre de base, camp du familier délié).
const clone = value => structuredClone(value);
const library = JSON.parse(readFileSync('js/data/bestiary/L07.json', 'utf8')).profiles;
const fixture = JSON.parse(readFileSync(new URL('./fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const person = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 30, hp: 40, maxHp: 40, caracs: { CC: 60, CT: 50, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const bestiary = (profile, id, extra = {}) => ({ ...buildParticipantFromBestiary(profile, { library, zone: 'active' }), id, camp: 'ennemi', states: [], ...extra });
const get = (store, id) => store.getCombat().participants.get(id);

async function table(participants, reserve = []) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve, combat: { round: 1, currentActorId: participants[0].id, order: participants.map(item => item.id), participants }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b11c' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const homunculus = { system: 'homunculus', kind: 'power', wind: 'aqshy', resource: 'fate' };

test('B11c 1 : sans compétence imprimée, le Lanceur de sorts teste à la base de son Trait ; une compétence imprimée prime', async () => {
  const printed = bestiary('E0-P-256', 'printed');
  const bare = bestiary('E0-P-256', 'bare', { skills: [] });
  // Slann 5ᵉ génération (L07) : Focalisation et Langue (Magick) imprimées à 105, Trait à 95.
  assert.equal(resolveChannellingSkill(printed).score, 105);
  assert.equal(resolveCastingSkill(printed).score, 105);
  assert.equal(resolveChannellingSkill(bare).score, 95);
  assert.equal(resolveCastingSkill(bare).score, 95);
  // L'action affichée porte la valeur réellement employée.
  const shown = participant => Object.fromEntries(magicActionsFor(participant).map(action => [action.type, action.base]));
  assert.deepEqual(shown(printed), { channelling: 105, dispel: 105, cast: 105 });
  assert.deepEqual(shown(bare), { channelling: 95, dispel: 95, cast: 95 });
  // Sans le Trait, rien ne change : la caractéristique brute.
  const plain = person('plain', { skills: [], caracs: { Int: 40, FM: 50 } });
  assert.equal(resolveCastingSkill(plain).score, 40);
  assert.equal(resolveChannellingSkill(plain).score, 50);
  // Le Test d'incantation y emploie bien ce score.
  const store = await table([bare, person('hero', { camp: 'pj' })]);
  assert.equal(previewCasting(get(store, 'bare'), { name: 'Dard', cn: 2, wind: 'fire', type: 'lore' }, { roll: 40 }).score, 95);
});

test('B11c 2 : la première synchro après B10b n’écrase pas un Destin dépensé ; une fiche modifiée le remplace', async () => {
  const fiche = extra => ficheSnapshot('caelel', { ...fixture, ...extra });
  const old = fiche({ destin: '3', resilience: '2' });
  delete old.durables; // snapshot antérieur à B10b
  const profile = { id: 'pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, caracs: { F: 30, E: 40 }, diceLines: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, ficheSnapshot: old };
  const hero = person('hero', { profileId: 'pj', name: 'Caelel', kind: 'PJ', camp: 'pj', hp: 14, maxHp: 14, ficheSnapshot: old, extensions: { v5: { fate: 1, resilience: 0 } } });
  const store = await table([hero], [profile]);
  const sync = snapshot => store.applyFicheSync([{ charId: 'caelel', profileId: 'pj', snapshot, links: {}, convert: {} }]);
  await sync(fiche({ destin: '3', resilience: '2' }));
  assert.equal(get(store, 'hero').extensions.v5.fate, 1, 'Destin dépensé conservé');
  assert.equal(get(store, 'hero').extensions.v5.resilience, 0);
  assert.deepEqual(store.getFullJSON && JSON.parse(store.getFullJSON()).reserve[0].ficheSnapshot.durables, { fate: 3, resilience: 2 }, 'le snapshot garde la valeur de la fiche');
  await sync(fiche({ destin: '3', resilience: '2' }));
  assert.equal(get(store, 'hero').extensions.v5.fate, 1, 'fiche inchangée');
  await sync(fiche({ destin: '4', resilience: '2' }));
  assert.equal(get(store, 'hero').extensions.v5.fate, 4, 'fiche modifiée : valeur de la fiche');
  assert.equal(get(store, 'hero').extensions.v5.resilience, 0, 'Résilience inchangée dans la fiche');
});

test('B11c 3 : l’homoncule guérit par guérison naturelle ou par sort, rien d’autre', async () => {
  const store = await table([person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }), person('imp', { camp: 'neutre', hp: 3, maxHp: 10 })]);
  await store.createFamiliar('hero', 'imp', homunculus);
  const refused = await store.healWounds('imp', 2);
  assert.equal(refused.ok, false);
  assert.match(refused.message, /guérison naturelle ou par la magie/);
  assert.equal((await store.healWounds('imp', 2, { source: { kind: 'skill', name: 'Soin' } })).ok, false);
  assert.equal(get(store, 'imp').hp, 3);
  assert.equal((await store.healWounds('imp', 2, { source: { kind: 'natural' } })).ok, true);
  assert.equal(get(store, 'imp').hp, 5);
  assert.equal((await store.healWounds('imp', 2, { source: { kind: 'spell' } })).ok, true);
  assert.equal(get(store, 'imp').hp, 7);
  assert.equal(previewFamiliarHealing(get(store, 'imp'), { kind: 'miracle' }).ok, false);
  assert.equal(previewFamiliarHealing(get(store, 'hero'), {}).ok, true);
});

test('B11c 3 : Venin et États de critique ne touchent un homoncule que d’une source magique', async () => {
  const swarm = bestiary('E0-P-245', 'swarm');
  const magicalSwarm = { ...bestiary('E0-P-245', 'magic-swarm'), traits: [...swarm.traits, { name: 'Magical' }] };
  const store = await table([person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }), person('imp', { camp: 'neutre' }), swarm, magicalSwarm]);
  await store.createFamiliar('hero', 'imp', homunculus);
  const refused = await store.applyCreatureVenom('swarm', 'imp');
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'familiar-condition');
  assert.ok(!get(store, 'imp').states.some(state => state.key === 'empoisonne'));
  assert.equal((await store.applyCreatureVenom('magic-swarm', 'imp')).ok, true);
  assert.ok(get(store, 'imp').states.some(state => state.key === 'empoisonne'));
  // États issus d'un critique (Coupure mineure : Hémorragique) : écartés d'un attaquant non magique, posés par un attaquant magique.
  const strike = attackerId => ({ resolutionId: `b11c-crit-${attackerId}`, actorId: attackerId, targetId: 'imp', roll: 11, action: { type: 'attack', base: 70, attr: 'CC', damage: 5 }, defense: { base: 10, roll: 99, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, criticalRolls: { location: 5, effect: 17 } });
  const plainStore = await table([person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }), person('imp', { camp: 'neutre' }), person('foe'), person('demon', { traits: [{ name: 'Daemonic' }] })]);
  await plainStore.createFamiliar('hero', 'imp', homunculus);
  const bleedingOf = s => get(s, 'imp').states.filter(state => state.key === 'hemorragique').length;
  const first = plainStore.previewResolution(strike('foe'));
  // L'aperçu lui-même montre l'État refusé, avec la raison, et ne le promet plus.
  assert.ok(!first.targetConditionApplication.some(state => state.key === 'hemorragique'));
  assert.ok(!first.critical.application.states.some(state => state.key === 'hemorragique'));
  assert.equal(first.familiarConditionRefusals[0].state, 'Hémorragique');
  assert.match(first.familiarConditionRefusals[0].message, /source magique/);
  assert.ok(first.reminders.some(text => /Hémorragique refusé/.test(text)));
  const applied = await plainStore.applyResolution(first);
  assert.equal(applied.status, 'applied', applied.reason);
  assert.equal(bleedingOf(plainStore), 0);
  assert.equal(applied.resolution.familiarConditionRefusals[0].state, 'Hémorragique');
  assert.ok(get(plainStore, 'imp').hp < 40, 'les Blessures restent infligées');
  const entry = plainStore.getLog ? plainStore.getLog()[0] : JSON.parse(plainStore.getFullJSON()).log[0];
  assert.match(entry.text, /États refusés : imp \(Hémorragique\)/);
  assert.equal(entry.detail.familiarConditionRefusals[0].state, 'Hémorragique');
  // Attaquant au Trait Magique, Démoniaque ou Éthéré (décision du MJ du 25/10), arme enchantée ou nature déclarée par le MJ : l'État passe.
  for (const [id, declared] of [['demon', undefined], ['ghost', undefined], ['foe', { magical: true }]]) {
    const store = await table([person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }), person('imp', { camp: 'neutre' }), person('foe'), person('demon', { traits: [{ name: 'Daemonic' }] }), person('ghost', { traits: [{ name: 'Ethereal' }] })]);
    await store.createFamiliar('hero', 'imp', homunculus);
    const input = strike(id);
    if (declared) input.v5 = { ...input.v5, context: { attackNature: declared } };
    const preview = store.previewResolution(input);
    assert.ok(preview.targetConditionApplication.some(state => state.key === 'hemorragique'), id);
    assert.equal(preview.familiarConditionRefusals.length, 0);
    assert.equal((await store.applyResolution(preview)).status, 'applied');
    assert.equal(bleedingOf(store), 1, id);
  }
});

test('B11c 3 : un Hémorragique sur un participant ordinaire n’est jamais refusé', async () => {
  const store = await table([person('hero', { camp: 'pj' }), person('foe')]);
  const preview = store.previewResolution({ resolutionId: 'b11c-plain', actorId: 'hero', targetId: 'foe', roll: 11, action: { type: 'attack', base: 70, attr: 'CC', damage: 5 }, defense: { base: 10, roll: 99, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, criticalRolls: { location: 5, effect: 17 } });
  assert.ok(preview.targetConditionApplication.some(state => state.key === 'hemorragique'));
  assert.equal(preview.familiarConditionRefusals.length, 0);
});

test('B11c 4 bis : l’écart caractéristiques courantes / de base ne compte qu’une fois', () => {
  const bare = bestiary('E0-P-256', 'bare', { skills: [] });
  const boosted = { ...bare, caracs: { ...bare.caracs, Int: 50, FM: 50 }, extensions: { ...bare.extensions, v5: { ...bare.extensions.v5, baseCaracs: { ...bare.caracs, Int: 40, FM: 40 } } } };
  assert.equal(resolveCastingSkill(boosted).score, 60);
  assert.equal(resolveChannellingSkill(boosted).score, 60);
  assert.deepEqual(Object.fromEntries(magicActionsFor(boosted).map(action => [action.type, action.base])), { channelling: 60, dispel: 60, cast: 60 });
  // Sans baseCaracs : Trait sur les caractéristiques courantes (inchangé).
  assert.equal(resolveCastingSkill({ ...boosted, extensions: { ...boosted.extensions, v5: { ...boosted.extensions.v5, baseCaracs: undefined } } }).score, 60);
});

test('B11c 4 : Puissance totale lue sur le jet retenu, pas sur le jet initial', async () => {
  const store = await table([bestiary('E0-P-258', 'power'), person('hero', { camp: 'pj' })]);
  const power = get(store, 'power');
  const spell = { name: 'Dard', cn: 2, wind: 'fire', type: 'lore' };
  // 07 inversé de force en 70 (Désavantage) : unité 0 sur le jet retenu, lancement réussi → critique.
  const forced = previewCasting(power, spell, { roll: 7, disadvantageSources: [{ id: 'd', label: 'Désavantage' }] });
  assert.equal(forced.testSuccess, true);
  assert.equal(forced.critical, true);
  // 30 inversé en 03 (Avantage) : le jet retenu n'a plus d'unité 0, pas de critique.
  const kept = previewCasting(power, spell, { roll: 30, advantageSources: [{ id: 'a', label: 'Avantage' }], choice: 'reverse' });
  assert.equal(kept.testSuccess, true);
  assert.equal(kept.critical, false);
  assert.equal(previewCasting(power, spell, { roll: 30, advantageSources: [{ id: 'a', label: 'Avantage' }], choice: 'keep' }).critical, true);
});

test('B11c 5 : Contemplation, +0 réussi (Détaché) et −0 échec marginal (Brume de pensée) distingués', async () => {
  const master = bestiary('E0-P-257', 'master');
  const at = (sl, options) => contemplationOutcome(master, sl, options);
  assert.equal(at(1).outcome, 'detached');
  assert.equal(at(0, { success: true }).outcome, 'detached');
  assert.equal(at('+0').outcome, 'detached');
  assert.equal(at(0, { success: false }).outcome, 'fog');
  assert.equal(at('-0').outcome, 'fog');
  assert.equal(at('−0').outcome, 'fog');
  assert.equal(at(-0).outcome, 'fog');
  assert.equal(at(0).available, false);
  assert.match(at(0).unresolved[0], /\+0.*−0/);
  assert.equal(at(-3).outcome, 'fog');
  assert.equal(at(-4).outcome, 'lost');
  assert.equal(at(2).outcome, 'alive');
  assert.match(master.extensions.v5.bestiary && JSON.stringify(contemplationOutcome(master, 2).reminders), /Alerte/);
  // Par le Store : « −0 » pose les deux Exténué, « +0 » non.
  const store = await table([master, person('hero', { camp: 'pj' })]);
  const fatigue = () => get(store, 'master').states.filter(state => /extenu/i.test(state.key || state.name)).reduce((sum, state) => sum + (state.level || 1), 0);
  assert.equal((await store.applySlannContemplation('master', 0, { success: true })).outcome, 'detached');
  assert.equal(fatigue(), 0);
  assert.equal((await store.applySlannContemplation('master', 0)).ok, false);
  assert.equal((await store.applySlannContemplation('master', 0, { success: false })).outcome, 'fog');
  assert.equal(fatigue(), 2);
  // Saisie de la carte : « -0 » respecté, sinon la liste +0 / −0.
  const read = (sl, zero) => readSlannInputs({ querySelector: selector => ({ value: selector.includes('zero') ? zero : sl }) });
  assert.deepEqual(read('-0', ''), { sl: 0, success: false });
  assert.deepEqual(read('0', 'success'), { sl: 0, success: true });
  assert.deepEqual(read('0', 'failure'), { sl: 0, success: false });
  assert.deepEqual(read('0', ''), { sl: 0 });
  assert.deepEqual(read('2', 'success'), { sl: 2 });
  const made = [];
  const createElement = tag => { const el = { tag, children: [], dataset: {}, appendChild(child) { this.children.push(child); } }; made.push(el); return el; };
  buildSlannBlock(createElement, master);
  assert.ok(made.some(el => el.className === 'tiny slann-contemplation-zero'));
  assert.ok(made.some(el => /Difficile −1 DR/.test(el.title || '')));
});

test('B11c 6 : fin de Round de la Nuée et mort du familier retirent l’Élan comme les autres dégâts', async () => {
  const swarm = bestiary('E0-P-245', 'swarm');
  const hero = person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3, hasMomentum: true } } });
  const store = await table([swarm, hero, person('cat', { camp: 'neutre', hp: 4, maxHp: 4 })]);
  assert.equal(get(store, 'hero').extensions.v5.hasMomentum, true);
  await store.applySwarmEndOfRound('swarm', ['hero']);
  assert.equal(get(store, 'hero').hp, 39);
  assert.equal(get(store, 'hero').extensions.v5.hasMomentum, false);
  await store.updateParticipant('hero', { extensions: { ...get(store, 'hero').extensions, v5: { ...get(store, 'hero').extensions.v5, hasMomentum: true } } });
  assert.equal(get(store, 'hero').extensions.v5.hasMomentum, true);
  await store.createFamiliar('hero', 'cat', { system: 'animal', kind: 'power', species: 'cat', resource: 'fate' });
  await store.updateParticipant('hero', { extensions: { ...get(store, 'hero').extensions, v5: { ...get(store, 'hero').extensions.v5, hasMomentum: true } } });
  const done = await store.resolveFamiliarDeath('hero', 'cat', { calmFailed: true, rolls: [3, 4] });
  assert.equal(done.ok, true);
  assert.equal(get(store, 'hero').hp, 32);
  assert.equal(get(store, 'hero').extensions.v5.hasMomentum, false);
});

test('B11c 7 : Vol, −2 DR au tir du porteur en vol ; rien de chiffré contre lui', async () => {
  const roc = bestiary(library.find(profile => profile.nameFr === 'Roc plume-vive').id, 'roc');
  const store = await table([roc, person('h', { camp: 'pj' })]);
  const shot = (actorId, targetId, context) => ({ resolutionId: `b11c-shot-${actorId}-${JSON.stringify(context)}`, actorId, targetId, action: { type: 'attack', base: 50, attr: 'CT', damage: 4 }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'test' } }, v5: { kind: 'ranged', context } });
  const amount = preview => preview.test.details.modifiers.find(m => m.id === 'move:fly-ranged')?.amount;
  assert.equal(amount(store.previewResolution(shot('roc', 'h', { airborne: true }))), -2);
  assert.equal(amount(store.previewResolution(shot('roc', 'h', {}))), undefined);
  assert.equal(amount(store.previewResolution(shot('h', 'roc', { airborne: true, targetAirborne: true }))), undefined);
  assert.match(roc.traits.join(' ') + JSON.stringify(store.getParticipantReminders('roc')), /pour le viser, la portée est décalée d.un cran/);
});

test('B11c 8 : retirer le lien rend au familier le camp d’avant la création', async () => {
  const store = await table([person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }), person('imp', { camp: 'neutre' })]);
  assert.equal((await store.createFamiliar('hero', 'imp', homunculus)).ok, true);
  assert.equal(get(store, 'imp').camp, 'allie');
  const link = get(store, 'hero').extensions.v5.familiarLinks[0];
  assert.equal((await store.unlinkFamiliar('hero', link.id)).ok, true);
  assert.equal(get(store, 'imp').camp, 'neutre');
  assert.equal(get(store, 'imp').extensions.v5.familiarOf, undefined);
  await store.undo();
  assert.equal(get(store, 'imp').camp, 'allie');
});

test('B11c 3 ter : qualité Magique d’un attaquant ordinaire (l’État passe) ; sans elle, refus', async () => {
  const build = async () => {
    const store = await table([person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }), person('imp', { camp: 'neutre' }), person('foe')]);
    await store.createFamiliar('hero', 'imp', homunculus);
    return store;
  };
  const strike = (extra = {}) => ({ resolutionId: 'b11c-quality', actorId: 'foe', targetId: 'imp', roll: 11, action: { type: 'attack', base: 70, attr: 'CC', damage: 5, ...extra }, defense: { base: 10, roll: 99, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, criticalRolls: { location: 5, effect: 17 } });
  const plain = (await build()).previewResolution(strike());
  assert.equal(plain.familiarConditionRefusals.length, 1);
  const magical = (await build()).previewResolution(strike({ qualities: [{ id: 'magique' }] }));
  assert.equal(magical.familiarConditionRefusals.length, 0);
  assert.ok(magical.targetConditionApplication.some(state => state.key === 'hemorragique'));
  const store = await build();
  assert.equal((await store.applyResolution(store.previewResolution(strike({ qualities: [{ id: 'magique' }] })))).status, 'applied');
  assert.equal(get(store, 'imp').states.filter(state => state.key === 'hemorragique').length, 1);
});

test('B11c 2 bis : Tourbillon, l’État refusé disparaît aussi de la cible secondaire homoncule, pas d’un participant ordinaire', async () => {
  const whirl = { id: 'talent-whirlwind-of-death', status: 'resolved', rank: 1 };
  const store = await table([
    person('a', { camp: 'pj', kind: 'PJ', talents: [whirl], extensions: { v5: { resourceCharacterId: 'test-a', hasMomentum: false } } }),
    person('b'), person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }),
    person('imp', { camp: 'neutre', hp: 1, maxHp: 1 }), person('ord', { hp: 1, maxHp: 1 })]);
  await store.createFamiliar('hero', 'imp', homunculus);
  await store.setFortune('a', 2);
  const raw = { resolutionId: 'b11c-whirl', actorId: 'a', targetId: 'b', action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll: 22, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
    v5: { kind: 'melee', context: { specialAttack: 'whirlwind-of-death', engagedIds: ['b', 'imp', 'ord'], allEngagedIncluded: true, whirlwindRolls: { imp: { secondEffect: 1 }, ord: { secondEffect: 1 } } } } };
  const preview = store.previewResolution(raw);
  const row = id => preview.secondaryTargets.find(item => item.participantId === id);
  const bleeds = id => (row(id).critical?.application.states || []).some(state => state.key === 'hemorragique');
  assert.ok(row('imp').critical && row('ord').critical, JSON.stringify(preview.unresolved));
  assert.ok(bleeds('ord'), 'le participant ordinaire garde l’État');
  assert.ok(!bleeds('imp'), 'l’homoncule ne le garde pas');
  assert.ok(!row('imp').participant.states.some(state => state.key === 'hemorragique'));
  assert.ok(row('ord').participant.states.some(state => state.key === 'hemorragique'));
  assert.ok(preview.familiarConditionRefusals.some(refusal => refusal.participantId === 'imp'));
});

test('B11c 1 bis : un refus { ok:false, message } du Store montre sa raison (awaitStore, refusalError)', async () => {
  const main = readFileSync('js/main.js', 'utf8');
  assert.match(main, /result\.message\.trim\(\) \? refusalError\(\{ message: result\.message \}, label\)/);
  const { refusalError, userMessage } = await import('../js/ui/messages.js');
  const store = await table([person('hero', { camp: 'pj', kind: 'PJ', extensions: { v5: { fate: 3 } } }), person('imp', { camp: 'neutre', hp: 3 })]);
  await store.createFamiliar('hero', 'imp', homunculus);
  const heal = await store.healWounds('imp', 2);
  const poison = await store.acquireConditions('imp', ['Hémorragique']);
  for (const refused of [heal, poison]) {
    assert.equal(refused.ok, false);
    const shown = refusalError({ message: refused.message });
    assert.equal(userMessage(shown, 'repli'), refused.message);
    assert.notEqual(userMessage(shown, 'repli'), 'repli');
  }
  assert.match(poison.message, /Hémorragique refusé/);
  const view = readFileSync('js/ui/workspace-view.js', 'utf8');
  assert.match(view, /adjustHp\?\.\(.*\.catch\(error => import\('\.\/toast\.js'\)\.then\(\(\{ showToast \}\) => showToast\(userMessage\(error/s);
  assert.match(view, /state\.stateForm\.error = userMessage\(error/);
});
