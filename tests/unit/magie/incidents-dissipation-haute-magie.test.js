import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { listDispellablePersistentEffects, canDispelCasting, previewDispelCasting, applyDispelCasting, previewDispelPersistent, applyDispelPersistent, hasUsedDispelReaction, markDispelReactionUsed } from '../../../js/core/v5-magic-dispel.js';
import { getSpellContract } from '../../../js/core/v5-spell-contracts.js';
import { prepareMagicOptions, applyMagicAttempt, magicTalentRank, magicalSenseReceipts } from '../../../js/core/v5-magic-talents.js';
import * as high from '../../../js/core/v5-magic-high.js';
import { calculateBurnoutRisk, isD100Double, getBurnoutStatus, previewBurnout, applyBurnout, previewBurnoutRecovery, applyBurnoutRecovery, getCadaiRunes, deployCadaiRune, consumeCadaiRune } from '../../../js/core/v5-magic-high.js';
import * as miscasts from '../../../js/core/v5-magic-miscasts.js';
import { isMiscastConditionLocked, resolveMiscast, previewMiscast, applyMiscast, lookupMiscastEntry } from '../../../js/core/v5-magic-miscasts.js';
import { previewChannelling, calculateMagicArmorPenalty } from '../../../js/core/v5-magic-channelling.js';
import { previewV5Test, selectV5Test } from '../../../js/core/v5-roll.js';
import { recoverV5Condition, advanceV5Effects } from '../../../js/core/v5-effects.js';
import { expireSpellEffects } from '../../../js/core/v5-magic-effects.js';
import { commitV5Resources } from '../../../js/core/v5-resources.js';

describe('Dissipation — corrections', () => {
const wizard = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, zone: 'active',
  caracs: { Int: 55, FM: 50, E: 30, F: 30, Ag: 40, I: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 55 }], states: [], equipment: [], ...extra });
async function combat(extra = {}) {
  const store = createStore(); await store.ready;
  const people = [wizard('d', extra), wizard('c'), wizard('a'), wizard('b')];
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'd', order: people.map(p => p.id), participants: people }, log: [], diceLines: [] });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const effect = (store, id = 'a') => person(store, id).extensions.v5.spellEffects[0];
const facts = { dispellerId: 'd', distance: 10, visible: true, roll: 24 };
const casting = { testSl: 5, matchingReserve: 0, totalCastingSl: 5, cn: 4 };
async function persistent(store, extra = {}, owners = ['a']) {
  for (const id of owners) await store.applySpellEffects(id, { id: 'layer-' + id, spellId: 'test-spell', spellName: 'Sort de test', casterId: 'c', cn: 8, castExecutionId: 'cast-1', duration: '10 Rounds', statModifiers: { Ag: 10 }, ...extra });
}
function refused(preview, pattern) {
  assert.equal(preview.allowed, false);
  assert.match(preview.reason, pattern);
}

test('X-01 — opposition au Test seul, puis réserve ajoutée au DR net du lanceur', async () => {
  const store = await combat();
  const preview = store.previewDispelCasting(casting, facts);
  assert.equal(preview.dispelled, false);
  assert.equal(preview.casterSl, 5);
  assert.equal(preview.netSl, 2);
  assert.equal(preview.casterSlAfterDispel, 2);
  const withReserve = store.previewDispelCasting({ ...casting, testSl: 1, matchingReserve: 10, totalCastingSl: 11 }, { ...facts, roll: 14 });
  assert.equal(withReserve.dispelled, true);
  assert.equal(withReserve.casterSl, 1);
  assert.equal(withReserve.netSl, -3);
  assert.equal(withReserve.casterSlAfterDispel, 7);
});
test('X-01/D-02 — égalité gagnée par le lanceur, réserve conservée dans le résultat', async () => {
  const store = await combat();
  const preview = store.previewDispelCasting({ ...casting, testSl: 3, matchingReserve: 4, totalCastingSl: 7 }, facts);
  assert.equal(preview.dispelled, false);
  assert.equal(preview.netSl, 0);
  assert.equal(preview.casterSlAfterDispel, 4);
});

test('X-02 — Force irrésistible refusée en persistant et en réaction', async () => {
  const store = await combat(); await persistent(store, { unstoppableForce: true });
  refused(store.previewDispelPersistent(effect(store), facts), /Force irrésistible/i);
  refused(store.previewDispelCasting({ ...casting, criticalChoice: 'unstoppable-force' }, facts), /Force irrésistible/i);
});
test('X-03 — absence de Langue (Magick) refusée même avec un score saisi', async () => {
  const store = await combat({ skills: [] }); await persistent(store);
  for (const score of [undefined, 80]) {
    refused(store.previewDispelCasting(casting, { ...facts, score }), /Langue.*compétence avancée|compétence.*Langue/i);
    refused(store.previewDispelPersistent(effect(store), { ...facts, score }), /Langue.*compétence avancée|compétence.*Langue/i);
  }
});
for (const key of ['Inconscient', 'Surpris']) test('X-04 — ' + key + ' bloque les deux dissipations', async () => {
  const store = await combat({ states: [{ key, level: 1 }] }); await persistent(store);
  refused(store.previewDispelCasting(casting, facts), /Inconscient|Surpris/);
  refused(store.previewDispelPersistent(effect(store), facts), /Inconscient|Surpris/);
});
test('X-04 — Sonné et modificateurs de Langue s’appliquent aux deux Tests', async () => {
  const store = await combat({ states: [{ key: 'Sonné', level: 2 }], extensions: { v5: { testModifiers: { 'Langue (Magick)': 1 } } } }); await persistent(store);
  assert.equal(store.previewDispelCasting(casting, facts).dispellerSl, 2);
  assert.equal(store.previewDispelPersistent(effect(store), facts).earnedSl, 2);
});
test('X-04/D-22 — La Fortune est Capricieuse transforme le double en maladresse', async () => {
  const store = await combat({ extensions: { v5: { specialStates: { forceFumbleOnDoubles: true, forbidCrits: true } } } }); await persistent(store);
  const reaction = store.previewDispelCasting({ ...casting, testSl: 0 }, { ...facts, roll: 22 });
  assert.equal(reaction.dispelled, false);
  assert.equal(reaction.selectedTest.fumble, true);
  const extended = store.previewDispelPersistent(effect(store), { ...facts, roll: 22 });
  assert.equal(extended.earnedSl, -5);
  assert.equal(extended.attemptFailed, true);
});

test('X-05 — réussite marginale +1 et échec marginal -1 ; pas de plancher à zéro', async () => {
  const store = await combat(); await persistent(store);
  let preview = store.previewDispelPersistent(effect(store), { ...facts, roll: 52 });
  assert.equal(preview.earnedSl, 1); await store.applyDispelPersistent(preview);
  preview = store.previewDispelPersistent(effect(store), { ...facts, roll: 58 });
  assert.equal(preview.earnedSl, -1); assert.equal(preview.newProgress, 0); assert.equal(preview.attemptFailed, false);
  await store.applyDispelPersistent(preview);
  preview = store.previewDispelPersistent(effect(store), { ...facts, roll: 58 });
  assert.equal(preview.newProgress, -1); assert.equal(preview.attemptFailed, true);
  await store.applyDispelPersistent(preview);
  assert.equal(effect(store).dispelProgressByCast['cast-1'].d.failed, true);
  refused(store.previewDispelPersistent(effect(store), facts), /échoué|nouvelle tentative/i);
  const restart = store.previewDispelPersistent(effect(store), { ...facts, restartAttempt: true });
  assert.equal(restart.currentProgress, 0); assert.equal(restart.newProgress, 3);
});
for (const [roll, expected] of [[55, 5], [66, -5]]) test('X-05 — minimum sur double ' + roll, async () => {
  const store = await combat(); await persistent(store);
  assert.equal(store.previewDispelPersistent(effect(store), { ...facts, roll }).earnedSl, expected);
});
test('X-06 — progression par lancer partagée entre couches, séparée par dissipateur et persistée', async () => {
  const store = await combat(); await persistent(store, {}, ['a', 'b']);
  const preview = store.previewDispelPersistent(effect(store), facts); await store.applyDispelPersistent(preview);
  assert.equal(store.previewDispelPersistent(effect(store, 'b'), facts).currentProgress, 3);
  assert.equal(store.previewDispelPersistent(effect(store, 'b'), { ...facts, dispellerId: 'c' }).currentProgress, 0);
  const reloaded = await combat();
  await reloaded.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'd', order: ['d','c','a','b'], participants: store.listParticipants() }, diceLines: [], log: [] });
  assert.equal(reloaded.previewDispelPersistent(effect(reloaded, 'b'), facts).currentProgress, 3);
});
test('X-06 — ancien aperçu d’une autre couche refusé après une progression du même lancer', async () => {
  const store = await combat(); await persistent(store, {}, ['a', 'b']);
  const stale = store.previewDispelPersistent(effect(store, 'b'), facts);
  await store.applyDispelPersistent(store.previewDispelPersistent(effect(store), facts));
  const before = store.listParticipants();
  await assert.rejects(async () => store.applyDispelPersistent(stale), /recalcul|Progression/);
  assert.deepEqual(store.listParticipants(), before);
});

test('X-07/D-18 — distance et visibilité explicites exigées ; valeurs invalides refusées', async () => {
  const store = await combat(); await persistent(store);
  for (const options of [{ roll: 24 }, { roll: 24, visible: true }, { roll: 24, distance: 0 }, { ...facts, distance: null }, { ...facts, distance: '' }, { ...facts, distance: -1 }, { ...facts, distance: NaN }, { ...facts, visible: 'true' }, { ...facts, visible: false }]) {
    refused(store.previewDispelCasting(casting, options), /distance|visib|visible|portée/i);
    refused(store.previewDispelPersistent(effect(store), options), /distance|visib|visible|portée/i);
  }
  assert.equal(store.previewDispelCasting(casting, { ...facts, distance: 0 }).allowed, true);
});
test('X-07/D-19 — méditations et effets sans NI refusés', async () => {
  const store = await combat(); await persistent(store, { spellId: 'talent-eye-of-the-storm', magicTalentId: 'talent-eye-of-the-storm' });
  refused(store.previewDispelPersistent(effect(store), facts), /méditation|talent/i);
  const noCN = { ...effect(store), spellId: 'spell', magicTalentId: undefined, cn: undefined };
  refused(store.previewDispelPersistent(noCN, facts), /NI/i);
});

test('Undo — dissipation groupée restaure atomiquement couches, valeurs et progression', async () => {
  const store = await combat(); await persistent(store, { cn: 4 }, ['a', 'b']);
  await store.applyDispelPersistent(store.previewDispelPersistent(effect(store), facts));
  const before = store.listParticipants();
  const final = store.previewDispelPersistent(effect(store, 'b'), facts);
  assert.equal(final.dispelled, true); await store.applyDispelPersistent(final);
  for (const id of ['a','b']) { assert.equal(person(store,id).extensions.v5.spellEffects.length, 0); assert.equal(person(store,id).caracs.Ag, 40); }
  await store.undo(); assert.deepEqual(store.listParticipants(), before);
});
test('Undo — réaction annulable ; aperçu obsolète revérifié avant mutation', async () => {
  const store = await combat(); const before = store.listParticipants();
  const preview = store.previewDispelCasting(casting, facts); await store.applyDispelCasting(preview);
  assert.equal(person(store,'d').extensions.v5.dispelReactionRound, 1);
  await store.undo(); assert.deepEqual(store.listParticipants(), before);
  await store.applySpellEffects('d', { id:'stun', duration:'10 Rounds', conditions:[{key:'Surpris',level:1}] });
  const current = store.listParticipants();
  await assert.rejects(async () => store.applyDispelCasting(preview), /Surpris|recalcul/i);
  assert.deepEqual(store.listParticipants(), current);
});

test('X-07 — liste filtrée : méditations, Force irrésistible et NI absent exclus', async () => {
  const store = await combat(); await persistent(store);
  await store.applySpellEffects('b', { id:'meditation', magicTalentId:'talent-eye-of-the-storm', spellId:'talent-eye-of-the-storm', duration:'1 heure' });
  await store.applySpellEffects('b', { id:'force', spellId:'spell-force', cn:4, unstoppableForce:true, duration:'1 heure' });
  assert.deepEqual(listDispellablePersistentEffects(store.listParticipants()).map(e=>e.id), ['layer-a']);
});
test('X-06 — un autre lancer garde sa progression propre ; propre sort +1 DR', async () => {
  const store = await combat(); await persistent(store);
  await persistent(store, { castExecutionId:'cast-2', casterId:'d' }, ['b']);
  await store.applyDispelPersistent(store.previewDispelPersistent(effect(store), facts));
  const other = store.previewDispelPersistent(effect(store,'b'), facts);
  assert.equal(other.currentProgress, 0); assert.equal(other.earnedSl, 4);
});
test('X-04 — Désavantage impose l’inversion défavorable du d100', async () => {
  const store = await combat(); await persistent(store);
  const input = { ...facts, roll:19, disadvantageSources:[{id:'test-disadvantage',label:'Désavantage'}] };
  const preview = store.previewDispelPersistent(effect(store), input);
  assert.equal(preview.selectedTest.roll, 91); assert.equal(preview.earnedSl, -4);
});
test('X-05 — Undo restaure la tentative après un échec sous zéro', async () => {
  const store = await combat(); await persistent(store, {}, ['a','b']);
  const before = store.listParticipants();
  await store.applyDispelPersistent(store.previewDispelPersistent(effect(store), {...facts,roll:58}));
  assert.equal(effect(store,'b').dispelProgressByCast['cast-1'].d.failed,true);
  await store.undo(); assert.deepEqual(store.listParticipants(),before);
});
test('Atomicité — sauvegarde refusée sans suppression d’effets ni consommation de réaction', async () => {
  let fail = false, state;
  const store = createStore({ persistence:{load:async()=>state,saveAtomic:async({state:next})=>{
    if(fail) throw new Error('Écriture refusée');
    state=structuredClone(next);return {ok:true};
  }}}); await store.ready;
  const people=[wizard('d'),wizard('c'),wizard('a')];
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'d',order:people.map(p=>p.id),participants:people},log:[],diceLines:[]});
  await persistent(store,{cn:2});
  const before=store.listParticipants();fail=true;
  assert.equal((await store.applyDispelPersistent(store.previewDispelPersistent(effect(store),facts))).ok,false);
  assert.deepEqual(store.listParticipants(),before);
  assert.equal((await store.applyDispelCasting(store.previewDispelCasting(casting,facts))).ok,false);
  assert.deepEqual(store.listParticipants(),before);
});
});

describe('Dissipation — intégration', () => {
// X-01 / D-03 : la réaction de dissipation est consommée par previewSpellExecution / applySpellExecution via le Store.
const wizard = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 55 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 100 }, { name: 'Savoir (Magie)', total: 60 }],
  talents: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const mage = (sl = 0) => wizard('mage', sl ? { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl } } } } : {});
const enemy = () => wizard('enemy', { camp: 'ennemi' });
const reaction = roll => ({ dispellerId: 'enemy', roll, distance: 10, visible: true });
const base = (castRoll, dispelRoll, extra = {}) => ({ actorId: 'mage', targetIds: ['enemy'], roll: castRoll, dispelReaction: reaction(dispelRoll), ...extra });

test('Carreau NI4 : Test 5 DR contre dissipation 3 DR — opposition gagnée, 2 DR < NI, sort raté, cible intacte', async () => {
  const store = await combat(mage(), enemy());
  const input = base(7, 24);
  const p = store.previewSpellExecution('Carreau', input);
  assert.equal(p.ready, true, p.error);
  assert.equal(p.dispelReaction.netSl, 2);
  assert.equal(p.dispelReaction.dispelled, false);
  assert.equal(p.spellSuccess, false);
  assert.equal(p.castFailed, true);
  assert.equal(p.totalCastingSl, 2);
  await store.applySpellExecution('Carreau', input);
  assert.equal(person(store, 'enemy').hp, 30);
  assert.equal(person(store, 'enemy').extensions.v5.dispelReactionRound, 1);
});

test('Test 1 DR + réserve 10 contre dissipation 4 DR — dissipé, aucun effet malgré la réserve, réserve consommée', async () => {
  const store = await combat(mage(10), enemy());
  const input = base(49, 14);
  const p = store.previewSpellExecution('Carreau', input);
  assert.equal(p.ready, true, p.error);
  assert.equal(p.dispelReaction.dispelled, true);
  assert.equal(p.dispelReaction.netSl, -3);
  assert.equal(p.dispelReaction.casterSlAfterDispel, 7);
  assert.equal(p.spellSuccess, false);
  assert.deepEqual(p.targetResults, []);
  await store.applySpellExecution('Carreau', input);
  assert.equal(person(store, 'enemy').hp, 30);
  assert.equal(person(store, 'mage').extensions.v5.channelling.sl, 0);
  assert.equal(person(store, 'enemy').extensions.v5.dispelReactionRound, 1);
});

test('Égalité Test 3 / dissipateur 3 : le lanceur gagne, total net + réserve comparé au NI', async () => {
  const store = await combat(mage(4), enemy());
  const p = store.previewSpellExecution('Carreau', base(26, 24));
  assert.equal(p.ready, true, p.error);
  assert.equal(p.dispelReaction.netSl, 0);
  assert.equal(p.dispelReaction.dispelled, false);
  assert.equal(p.castingPreview.totalCastingSl, 4);
  assert.equal(p.spellSuccess, true);
});

test('Sort non dissipé encore ≥ NI : effets appliqués avec le DR après dissipation ; surpuissance revérifiée', async () => {
  const store = await combat(mage(), enemy());
  const input = base(7, 43);
  const p = store.previewSpellExecution('Carreau', input);
  assert.equal(p.ready, true, p.error);
  assert.equal(p.spellSuccess, true);
  assert.equal(p.castingPreview.testSl, 4);
  assert.equal(p.castingPreview.surplus, 0);
  // 1 DR de surpuissance était disponible avant l'opposition (5 − NI 4) ; plus après (4 − 4).
  assert.equal(store.previewSpellExecution('Carreau', { ...input, dispelReaction: undefined, overcastChoices: { damage: 1 } }).ready, true);
  const refused = store.previewSpellExecution('Carreau', { ...input, overcastChoices: { damage: 1 } });
  assert.equal(refused.ready, false);
  assert.match(refused.error, /dissipation/i);
  await store.applySpellExecution('Carreau', input);
  assert.ok(person(store, 'enemy').hp < 30);
});

test('Haute Magie : sort dissipé sans jet d’épuisement ; non dissipé, le jet reste exigé', async () => {
  const caster = wizard('mage', { caracs: { ...wizard('x').caracs, FM: 10, Int: 100 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 30 } } } });
  const store = await combat(caster, wizard('enemy', { camp: 'ennemi', skills: [{ name: 'Langue (Magick)', total: 100 }] }));
  const input = { actorId: 'mage', targetIds: ['enemy'], roll: 25, arcaneOptions: { enhancedDamage: true }, arcaneTargets: { enemy: { magicItemPresent: false } } };
  assert.equal(store.previewSpellExecution('Destruction des Arcanes', input).status, 'burnout-roll-required');
  const dispelled = { ...input, dispelReaction: reaction(10) };
  const p = store.previewSpellExecution('Destruction des Arcanes', dispelled);
  assert.equal(p.ready, true, p.error);
  assert.equal(p.dispelReaction.dispelled, true);
  assert.equal(p.burnout, null);
  await store.applySpellExecution('Destruction des Arcanes', dispelled);
  assert.ok(!person(store, 'mage').extensions.v5.burnout?.active);
  assert.equal(person(store, 'enemy').hp, 30);
});

test('Undo — une seule commande restaure réserve, quota du dissipateur et PV', async () => {
  const store = await combat(mage(10), enemy());
  const before = store.listParticipants();
  await store.applySpellExecution('Carreau', base(49, 14));
  assert.notDeepEqual(store.listParticipants(), before);
  await store.undo();
  assert.deepEqual(store.listParticipants(), before);
});

test('Rune Cadai du dissipateur : refusée sur une dissipation de Carreau (HEPG p. 84), rien n’est consommé', async () => {
  const store = await combat(mage(), wizard('enemy', { camp: 'ennemi' }));
  await store.deployCadaiRune({ actorId: 'enemy', roll: 25, conditionsConfirmed: true });
  const before = store.getCadaiRunes('enemy').deployed;
  const participants = store.listParticipants();
  const input = base(7, 24);
  input.dispelReaction = { ...input.dispelReaction, useCadaiRune: true, cadaiAccessible: true, cadaiPurpose: 'test', cadaiRoll: 25 };
  assert.equal(store.previewSpellExecution('Carreau', input).ready, false);
  await assert.rejects(async () => store.applySpellExecution('Carreau', input));
  assert.equal(store.getCadaiRunes('enemy').deployed, before);
  assert.deepEqual(store.listParticipants(), participants);
});
});

describe('Haute Magie — corrections', () => {
const wizard = (extra = {}) => ({ id: 'mage', name: 'Mage', kind: 'PJ', camp: 'pj', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 60 }],
  talents: [], states: [], equipment: [], extensions: { v5: { channelling: { type: 'high', sl: 20 }, cadaiRunes: { deployed: 3, max: 5 } } }, ...extra });
async function combat(actor = wizard()) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: actor.id,
    order: [actor.id, 'enemy'], participants: [actor, { ...wizard(), id: 'enemy', name: 'Enemy', camp: 'ennemi' }] }, log: [], diceLines: [] });
  return store;
}

test('H-01 — HEPG p. 84 : Cadai refusé pour les Vents, Carreau, pause et interruption', async () => {
  const store = await combat();
  const rune = { actorId: 'mage', roll: 25, useCadaiRune: true, cadaiAccessible: true, cadaiRoll: 85 };
  assert.throws(() => store.previewChannelling(rune), /Haute Magie/);
  assert.throws(() => store.previewCasting(getSpellContract('Carreau'), rune), /Haute Magie/);
  for (const mode of ['pause', 'interruption']) assert.throws(() => store.previewChannelling({ ...rune, type: 'high', mode }), /Haute Magie/);
  assert.equal(store.previewChannelling({ ...rune, type: 'high' }).test.roll, 85);
});

test('H-01 — HEPG p. 84, D-05 : une rune par jet distinct, reçus et paiement exacts', () => {
  const actor = wizard();
  const input = { type: 'high', roll: 25, miscastRoll: 85, burnoutRoll: 2, cadaiAccessible: true,
    cadaiRerolls: [{ purpose: 'test', roll: 35 }, { purpose: 'miscast', roll: 50 }, { purpose: 'burnout', roll: 90 }] };
  const prepared = prepareMagicOptions(actor, 'casting', input, getSpellContract('Main de Gloire'));
  assert.equal(prepared.roll, 35); assert.equal(prepared.miscastRoll, 50); assert.equal(prepared.burnoutRoll, 90);
  assert.equal(prepared.cadaiReceipts.length, 3);
  const paid = applyMagicAttempt(actor, { actionType: 'casting', cadaiReceipts: prepared.cadaiReceipts });
  assert.equal(high.getCadaiRunes(paid).deployed, 0); assert.equal(high.getCadaiRunes(actor).deployed, 3);
  assert.throws(() => prepareMagicOptions(actor, 'casting', { ...input, cadaiRerolls: [{ purpose: 'test', roll: 35 }, { purpose: 'test', roll: 45 }] }, getSpellContract('Main de Gloire')), /une rune|même jet/i);
});

test('H-01 — HEPG p. 84 : relance de Corruption liée à une exécution de Haute Magie', () => {
  const input = { accessible: true, firstRoll: 85, reroll: 25, castExecutionId: 'high-cast', spell: getSpellContract('Main de Gloire') };
  const p = high.previewCadaiCorruptionReroll(wizard(), input);
  assert.equal(p.ready, true); assert.equal(p.test.roll, 25); assert.equal(p.castExecutionId, 'high-cast');
  assert.equal(high.previewCadaiCorruptionReroll(wizard(), { ...input, spell: getSpellContract('Carreau') }).ready, false);
  assert.equal(high.previewCadaiCorruptionReroll(wizard(), { ...input, castExecutionId: undefined }).ready, false);
});

test('H-02 — HEPG p. 84 : plafond Cadai suit le BFM courant, hausse et baisse', async () => {
  const store = await combat(wizard({ caracs: { ...wizard().caracs, FM: 70 } }));
  assert.equal(store.getCadaiRunes('mage').max, 7);
  await store.deployCadaiRune({ actorId: 'mage', roll: 25, conditionsConfirmed: true });
  assert.equal(store.getCadaiRunes('mage').deployed, 4);
  await store.updateParticipant('mage', { caracs: { FM: 20 } });
  assert.deepEqual(store.getCadaiRunes('mage'), { max: 2, deployed: 2 });
});

test('H-03 — HEPG pp. 85/86, V5 p. 237 : Focalisation secondaire des Arcanes pénalisée par armure et États', async () => {
  const armor = { id: 'plate', kind: 'armour', name: 'Plaques', layer: 'rigid', ap: 3, locations: ['body'] };
  const store = await combat(wizard({ equipment: [armor] }));
  const options = { actorId: 'mage', targetIds: ['enemy'], roll: 25, burnoutRoll: 50,
    arcaneTargets: { enemy: { magicItemPresent: true, focalisationRoll: 58, randomMagicItem: 'Anneau' } }, attributeActive: false };
  const p = store.previewSpellExecution('Destruction des Arcanes', options);
  assert.equal(p.ready, true, p.error);
  const secondary = p.targetResults[0].arcaneUnforgiving;
  assert.equal(secondary.focalisationTest.sl, -2); assert.equal(secondary.magicItemDestroyed, false);
  await store.updateParticipant('mage', { states: [{ name: 'Sonné', level: 2 }] });
  const q = store.previewSpellExecution('Destruction des Arcanes', { ...options, roll: 5 });
  assert.equal(q.targetResults[0].arcaneUnforgiving.focalisationTest.sl, -4);
});

test('H-04 — HEPG p. 105 : Exténué ignoré seulement en Focalisation et Incantation', async () => {
  const actor = wizard({ states: [{ name: 'Exténué', level: 2 }], extensions: { v5: { channelling: { type: 'high', sl: 20 },
    spellEffects: [{ id: 'eye', spellId: 'talent-eye-of-the-storm', magicTalentId: 'talent-eye-of-the-storm', magicTalentRank: 2 }] } } });
  const store = await combat(actor);
  assert.equal(store.previewChannelling({ actorId: 'mage', roll: 25 }).test.sl, 4);
  assert.equal(store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 25 }).test.sl, 4);
  assert.equal(store.previewChannelling({ actorId: 'mage', mode: 'pause', roll: 25 }).test.sl, 4, 'pause (v3 : Test de Focalisation Accessible +2 DR) : Exténué toujours appliqué');
  assert.equal(store.previewChannelling({ actorId: 'mage', mode: 'interruption', roll: 25 }).test.sl, -1);
});

test('H-01 — HEPG p. 84 : rune de Focalisation high consommée sur échec, Undo exact', async () => {
  const store = await combat();
  const p = store.previewChannelling({ actorId: 'mage', type: 'high', roll: 25, useCadaiRune: true, cadaiAccessible: true, cadaiRoll: 85 });
  await store.applyChannelling(p, { actorId: 'mage' });
  assert.equal(store.getCadaiRunes('mage').deployed, 2);
  await store.undo(); assert.equal(store.getCadaiRunes('mage').deployed, 3);
});

test('H-03 — HEPG pp. 83/86 : le Test secondaire tient compte de Lileath après réussite', async () => {
  const store = await combat(wizard({ talents: [{ id: 'talent-lileath-s-blessing', status: 'resolved', rank: 2 }] }));
  const p = store.previewSpellExecution('Destruction des Arcanes', { actorId: 'mage', targetIds: ['enemy'], roll: 25,
    arcaneTargets: { enemy: { magicItemPresent: true, focalisationRoll: 25, randomMagicItem: 'Anneau' } }, attributeActive: false });
  assert.equal(p.ready, true, p.error);
  assert.equal(p.targetResults[0].arcaneUnforgiving.focalisationTest.sl, 6);
});
});

describe('Haute Magie — branchement', () => {
// H-01 (HEPG p. 84) : raccordement des runes des Cadai à l'incantation et à l'exécution d'un sort de Haute Magie.
const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'mage' ? 'pj' : 'ennemi', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 60 }],
  talents: [], states: [], equipment: [], extensions: { v5: { channelling: { type: 'high', sl: 20 }, cadaiRunes: { deployed: 3, max: 5 } } }, ...extra });
async function combat(actor = wizard()) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: actor.id,
    order: [actor.id, 'enemy'], participants: [actor, wizard('enemy')] }, log: [], diceLines: [] });
  return store;
}
const rune = (extra = {}) => ({ actorId: 'mage', targetIds: ['enemy'], cadaiAccessible: true, ...extra });

test('H-01 — sort de Haute Magie : relance du Test par rune acceptée, payée une fois, Undo', async () => {
  const store = await combat();
  const input = rune({ roll: 95, cadaiRerolls: [{ purpose: 'test', roll: 25 }] });
  const p = store.previewSpellExecution('Apothéose', input);
  assert.equal(p.ready, true, p.error);
  assert.equal(p.castingPreview.roll, 25);
  assert.equal(p.castingPreview.cadaiReceipts.length, 1);
  await store.applySpellExecution('Apothéose', input);
  assert.equal(store.getCadaiRunes('mage').deployed, 2);
  await store.undo();
  assert.equal(store.getCadaiRunes('mage').deployed, 3);
});

test('H-01 — sort d’Arcane : relance par rune refusée, stock inchangé', async () => {
  const store = await combat();
  const input = rune({ roll: 95, targetIds: ['enemy'], cadaiRerolls: [{ purpose: 'test', roll: 25 }] });
  assert.throws(() => store.previewSpellExecution('Carreau', input), /Haute Magie/);
  await assert.rejects(async () => store.applySpellExecution('Carreau', input), /Haute Magie/);
  assert.equal(store.getCadaiRunes('mage').deployed, 3);
});

test('H-01 — rune d’incident ou d’épuisement non payée si le jet reste inutilisé', async () => {
  const store = await combat();
  const input = rune({ roll: 95, miscastRoll: 50, burnoutRoll: 50,
    cadaiRerolls: [{ purpose: 'test', roll: 25 }, { purpose: 'miscast', roll: 60 }, { purpose: 'burnout', roll: 90 }] });
  const p = store.previewSpellExecution('Apothéose', input);
  assert.equal(p.ready, true, p.error);
  assert.deepEqual(p.castingPreview.cadaiReceipts.map(r => r.purpose), ['test']);
  await store.applySpellExecution('Apothéose', input);
  assert.equal(store.getCadaiRunes('mage').deployed, 2);
});

test('H-01 — Test, incident et épuisement relancés : trois runes payées exactement une fois, Undo, doublon refusé', async () => {
  const store = await combat();
  const input = rune({ roll: 95, miscastRoll: 50, burnoutRoll: 50, overcastChoices: { duration: 8 },
    cadaiRerolls: [{ purpose: 'test', roll: 11 }, { purpose: 'miscast', roll: 60 }, { purpose: 'burnout', roll: 90 }] });
  const p = store.previewSpellExecution('Apothéose', input);
  assert.equal(p.ready, true, p.error);
  assert.deepEqual(p.castingPreview.cadaiReceipts.map(r => r.purpose), ['test', 'miscast', 'burnout']);
  assert.equal(p.burnout.roll, 90);
  await store.applySpellExecution('Apothéose', input);
  assert.equal(store.getCadaiRunes('mage').deployed, 0);
  await store.undo();
  assert.equal(store.getCadaiRunes('mage').deployed, 3);
  const twice = { ...input, cadaiRerolls: [{ purpose: 'test', roll: 11 }, { purpose: 'test', roll: 12 }] };
  assert.throws(() => store.previewSpellExecution('Apothéose', twice), /même jet/);
});

test('H-01 — aperçu d’incantation transmis tel que l’interface le fait : incident relancé accepté, reçu inventé refusé', async () => {
  const store = await combat();
  const { getSpellContract } = await import('../../../js/core/v5-spell-contracts.js');
  const spell = { ...getSpellContract('Apothéose'), type: 'high' };
  const input = { actorId: 'mage', roll: 95, miscastRoll: 50, cadaiAccessible: true,
    cadaiRerolls: [{ purpose: 'test', roll: 11 }, { purpose: 'miscast', roll: 60 }] };
  const castPreview = store.previewCasting(spell, input);
  assert.deepEqual(castPreview.cadaiReceipts.map(r => r.purpose), ['test', 'miscast']);
  const options = { ...input, targetIds: ['enemy'], castingPreview: castPreview, castResult: castPreview };
  const p = store.previewSpellExecution('Apothéose', options);
  assert.equal(p.ready, true, p.error);
  const forged = store.previewSpellExecution('Apothéose', { ...options, cadaiRerolls: [{ purpose: 'test', roll: 11 }] });
  assert.equal(forged.ready, false);
});

test('H-01 — relance de Corruption : liée à une exécution réelle de Haute Magie du lanceur, une fois par jet, Undo', async () => {
  const store = await combat();
  const reroll = (extra = {}) => ({ actorId: 'mage', castExecutionId: 'high-1', corruptionId: 'test-1', accessible: true, firstRoll: 85, reroll: 25, slModifier: -2, ...extra });
  assert.throws(() => store.rerollCorruptionWithCadai(reroll()), /exécution de Haute Magie/);
  await store.applySpellExecution('Apothéose', { actorId: 'mage', targetIds: ['enemy'], roll: 25, operationId: 'high-1' });
  await store.applySpellExecution('Carreau', { actorId: 'mage', targetIds: ['enemy'], roll: 25, operationId: 'arcane-1', reserveSl: 0 });
  assert.throws(() => store.rerollCorruptionWithCadai(reroll({ castExecutionId: 'arcane-1' })), /Haute Magie/);
  assert.throws(() => store.rerollCorruptionWithCadai(reroll({ actorId: 'enemy' })), /exécution de Haute Magie/);
  assert.equal(store.getCadaiRunes('mage').deployed, 3);
  await store.rerollCorruptionWithCadai(reroll());
  assert.equal(store.getCadaiRunes('mage').deployed, 2);
  const last = store.listParticipants().find(p => p.id === 'mage').extensions.v5.lastCadaiCorruption;
  assert.equal(last.castExecutionId, 'high-1'); assert.equal(last.corruptionId, 'test-1');
  assert.throws(() => store.rerollCorruptionWithCadai(reroll()), /au maximum pour ce jet/);
  await store.rerollCorruptionWithCadai(reroll({ corruptionId: 'test-2' }));
  assert.equal(store.getCadaiRunes('mage').deployed, 1);
  await store.undo(); await store.undo();
  assert.equal(store.getCadaiRunes('mage').deployed, 3);
  await store.rerollCorruptionWithCadai(reroll());
  assert.equal(store.getCadaiRunes('mage').deployed, 2, 'le marqueur a été restauré par Undo');
});
});

describe('Incidents — corrections', () => {
const talent = (id, rank = 1) => ({ id: 'talent-' + id, status: 'resolved', rank });
const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 60 }],
  talents: [], states: [], equipment: [], extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 10 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id,
    order: people.map(p => p.id), participants: people }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id = 'mage') => store.listParticipants().find(p => p.id === id);

test('L-03 — V5 p. 239, D-11 : Regard maudit dure en heures et suspend les talents sensoriels', async () => {
  const store = await combat(wizard('mage', { talents: [talent('magical-sense')] }));
  await store.applyMiscast(store.previewMiscast({ severity: 'MAJOR', roll: 38, secondaryRolls: { duration: 2 } }), { actorId: 'mage' });
  const actor = person(store), effect = actor.extensions.v5.miscastEffects?.find(e => e.unremovable);
  assert.ok(effect); assert.equal(effect.remainingMinutes, 120); assert.equal(effect.expiresAtRound, 721);
  const state = actor.states.find(s => s.key === 'aveugle');
  assert.equal(state.duration, null); assert.equal(state.source.miscastEffectId, effect.id);
  assert.equal(magicTalentRank(actor, 'magical-sense'), 0);
  assert.deepEqual(magicalSenseReceipts(wizard('caster'), [actor]), []);
  await store.undo(); assert.equal(magicTalentRank(person(store), 'magical-sense'), 1);
});

test('L-03/L-04 — V5 p. 239 : expiration pure retire seulement les occurrences de cet incident', async () => {
  const store = await combat(wizard('mage', { traits: ['Distracting'], states: [{ id: 'base-blind', name: 'Aveuglé' }] }));
  for (const roll of [8, 38]) await store.applyMiscast(store.previewMiscast({ severity: 'MAJOR', roll, secondaryRolls: { duration: 1 } }), { actorId: 'mage' });
  const actor = person(store); assert.ok(actor.extensions.v5.miscastEffects.some(e => e.type === 'trait'));
  assert.equal(miscasts.isMiscastConditionLocked(actor, actor.states.find(s => s.source?.kind === 'miscast')), true);
  const after = miscasts.expireMiscastConsequences(actor, { minutes: 60 });
  assert.equal(after.extensions.v5.miscastEffects.length, 0);
  assert.deepEqual(after.states.map(s => s.id), ['base-blind']);
  assert.deepEqual(after.traits, ['Distracting']); assert.deepEqual(after.extensions.v5.temporaryTraits, []);
  assert.equal(actor.extensions.v5.miscastEffects.length, 2, 'Fonction pure');
});

test('L-06 — V5 p. 239 : Drain de puissance bloque le Talent employé pour lancer (pas la Focalisation), puis expire', async () => {
  const store = await combat(wizard());
  await store.applyMiscast(store.previewMiscast({ severity: 'MAJOR', roll: 18, secondaryRolls: { duration: 1 }, usedTalent: { id: 'talent-arcane-magic', lore: null } }), { actorId: 'mage' });
  assert.throws(() => store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 25 }), /Drain|Talent.*inutilisable/i);
  assert.equal(store.previewChannelling({ actorId: 'mage', roll: 25 }).ready, true, 'la Focalisation n’emploie pas le Talent de lancement');
  await store.advanceTalentMinutes(1); assert.doesNotThrow(() => store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 25 }));
});

test('L-07 — V5 p. 238 : deux jets explicites, 91–100 relancés, sans modificateurs', async () => {
  const store = await combat(wizard());
  const base = { actorId: 'mage', severity: 'MINOR', roll: 93 };
  assert.equal(store.previewMiscast(base).ready, false);
  assert.equal(store.previewMiscast({ ...base, secondaryRolls: { additionalRolls: [92, 85] } }).ready, false);
  const p = store.previewMiscast({ ...base, modifier: 1, secondaryRolls: { additionalRolls: [70, 85] } });
  assert.equal(p.ready, true); assert.equal(p.details.results.length, 2);
  assert.deepEqual(p.details.results.map(r => r.modifier), [0, 0]);
  await store.applyMiscast(p, { actorId: 'mage' });
  assert.ok(person(store).states.some(s => s.key === 'hemorragique'));
  assert.equal(person(store).extensions.v5.corruptionPoints, 1);
  await store.undo(); assert.deepEqual(person(store).states, []);
});

test('L-07 — V5 p. 238 : les dés de durée de chaque sous-incident sont indépendants', async () => {
  const store = await combat(wizard());
  const input = { severity: 'MINOR', roll: 93, secondaryRolls: { additionalRolls: [3, 48] } };
  assert.equal(store.previewMiscast(input).ready, false);
  const p = store.previewMiscast({ ...input, secondaryRolls: { additionalRolls: [3, 48], additionalSecondaryRolls: [{ duration: 2 }, { duration: 4 }] } });
  assert.equal(p.ready, true); assert.deepEqual(p.details.results.map(r => r.details.duration.value), [2, 4]);
});

test('L-08/L-09 — V5 p. 236/p. 128 : pause exacte, journal correct, Mage de guerre disponible', async () => {
  const store = await combat(wizard('mage', { talents: [talent('war-wizard')], skills: [
    { name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 20 }, { name: 'Focalisation (Haute Magie)', total: 60 }, { name: 'Résistance', total: 90 }
  ] }), wizard('enemy', { camp: 'ennemi' }));
  const p = store.previewChannelling({ actorId: 'mage', mode: 'pause', roll: 55 });
  assert.equal(p.score, 20); assert.equal(p.success, false);
  await store.applyChannelling(p, { actorId: 'mage' });
  assert.equal(person(store).extensions.v5.magicAttemptTurn, undefined);
  assert.match(JSON.parse(store.getFullJSON()).log[0].text, /Pause.*réserve/i);
  assert.doesNotMatch(JSON.parse(store.getFullJSON()).log[0].text, /undefined/);
  assert.equal(store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 25, warWizard: true }).ready, true);
});

test('L-09 — V5 p. 236 : interruption appliquée via Store ne compte pas comme tentative magique', async () => {
  const store = await combat(wizard());
  const p = store.previewChannelling({ actorId: 'mage', mode: 'interruption', roll: 25 });
  await store.applyChannelling(p, { actorId: 'mage' });
  assert.equal(person(store).extensions.v5.magicAttemptTurn, undefined);
  assert.match(JSON.parse(store.getFullJSON()).log[0].text, /Interruption.*réserve/i);
  assert.doesNotMatch(JSON.parse(store.getFullJSON()).log[0].text, /undefined/);
});

test('L-10 — V5 p. 130 : choix keep périmé remplacé par l’unique inversion forcée', async () => {
  const store = await combat(wizard());
  const p = store.previewChannelling({ actorId: 'mage', roll: 19, choice: 'keep', disadvantageSources: [{ id: 'fixture' }] });
  assert.equal(p.test.roll, 91); assert.equal(p.test.optionId, 'reverse');
});

test('L-04 — V5 p. 239 : un trait d’incident disparaît au terme, une autre source reste active', async () => {
  const store = await combat(wizard());
  for (const duration of [1, 2]) await store.applyMiscast(store.previewMiscast({ severity: 'MAJOR', roll: 8, secondaryRolls: { duration } }), { actorId: 'mage' });
  const first = miscasts.expireMiscastConsequences(person(store), { minutes: 60 });
  assert.equal(first.traits.includes('Distracting'), true);
  assert.equal(first.extensions.v5.miscastEffects.length, 1);
  const second = miscasts.expireMiscastConsequences(first, { minutes: 60 });
  assert.deepEqual(second.traits, []); assert.deepEqual(second.extensions.v5.temporaryTraits, []);
});

test('L-11 — V5 pp. 114/121 : aperçu d’incident avec l’acteur du Store, acquisition canonique et interdiction prioritaire', async () => {
  const store = await combat(wizard());
  const input = { actorId: 'mage', severity: 'MINOR', roll: 15, instinctiveDiction: true, attunementRank: 2 };
  assert.equal(store.previewMiscast(input).cancelled, false);
  await store.updateParticipant('mage', { talents: [talent('instinctive-diction'), talent('aethyric-attunement')] });
  assert.equal(store.previewMiscast(input).ready, false);
  assert.equal(store.previewMiscast({ ...input, miscastRoll2: 50, miscastChoice: 'first' }).cancelled, true);
  await store.updateParticipant('mage', { extensions: { v5: { ...person(store).extensions.v5, specialStates: { forbidMitigation: true } } } });
  assert.equal(store.previewMiscast(input).cancelled, false);
});

test('L-13 — V5 p. 236, D-09 : critique = DR réels + 2 BFM, plancher conservé aux autres Tests', async () => {
  const store = await combat(wizard());
  const p = store.previewChannelling({ actorId: 'mage', roll: 55 });
  assert.equal(p.critical, true); assert.equal(p.sl, 1); assert.equal(p.gain, 11);
  assert.equal(selectV5Test(previewV5Test({ score: 60, roll: 55 }), 'keep').sl, 5);
});

test('L-13 — V5 p. 236, D-10 : alias coloré de la Focalisation unique reconnu pour les huit Vents', async () => {
  const store = await combat(wizard('mage', { skills: [{ name: 'Focalisation (Aqshy)', total: 80 }] }));
  assert.equal(store.previewChannelling({ actorId: 'mage', wind: 'Aqshy', roll: 25 }).score, 80);
  assert.equal(store.previewChannelling({ actorId: 'mage', wind: 'Hysh', roll: 25 }).score, 80);
  assert.equal(store.previewChannelling({ actorId: 'mage', type: 'high', roll: 25 }).score, 50);
});

test('L-14 — V5 p. 237, D-20 : equipped:false exclut l’armure de la pénalité magique', async () => {
  const armor = { id: 'plate', kind: 'armour', name: 'Plaques', layer: 'rigid', ap: 3, locations: ['body'], equipped: false };
  const store = await combat(wizard('mage', { equipment: [armor] }));
  assert.equal(store.previewChannelling({ actorId: 'mage', roll: 25 }).armorPenalty, 0);
  assert.equal(calculateMagicArmorPenalty(wizard('mage', { equipment: [{ ...armor, equipped: true }] })).penalty, -3);
});
});

describe('Incidents — branchement', () => {
// Raccordements Lot 3 (incidents) : horloge, verrou unremovable, traits, Chance/Corruption, casting.
const talent = (id, rank = 1) => ({ id: 'talent-' + id, status: 'resolved', rank });
const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 60 }],
  talents: [], states: [], equipment: [], extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 10 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id,
    order: people.map(p => p.id), participants: people }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id = 'mage') => store.listParticipants().find(p => p.id === id);
const miscast = (store, roll, duration, severity = 'MAJOR') => store.applyMiscast(store.previewMiscast({ severity, roll, secondaryRolls: { duration } }), { actorId: 'mage' });
const cursedState = actor => actor.states.find(s => s.key === 'aveugle' && s.source?.miscastEffectId);

test('L-03/L-04 — horloge unique : le temps écoulé retire l’État, rétablit le talent et le trait', async () => {
  const store = await combat(wizard('mage', { talents: [talent('magical-sense')] }));
  await miscast(store, 38, 2); await miscast(store, 8, 1);
  assert.equal(magicTalentRank(person(store), 'magical-sense'), 0);
  assert.ok(person(store).traits.includes('Distracting'));
  await store.advanceTalentMinutes(60);
  assert.equal(person(store).traits.includes('Distracting'), false);
  assert.ok(cursedState(person(store)), 'Regard maudit : encore 60 minutes');
  await store.advanceTalentMinutes(60);
  assert.equal(cursedState(person(store)), undefined);
  assert.equal(magicTalentRank(person(store), 'magical-sense'), 1);
});

test('L-03 — l’échéance en Rounds suit une avance en minutes (une seule horloge)', async () => {
  const store = await combat(wizard());
  await miscast(store, 38, 2);
  const before = person(store).extensions.v5.miscastEffects[0].expiresAtRound;
  await store.advanceTalentMinutes(30);
  assert.equal(person(store).extensions.v5.miscastEffects[0].expiresAtRound, before - 180);
});

test('L-03 — Regard maudit : ni Fortune, ni récupération, ni retrait automatique d’Aveuglé', async () => {
  const store = await combat(wizard());
  await miscast(store, 38, 2);
  const actor = person(store), state = cursedState(actor);
  assert.equal(isMiscastConditionLocked(actor, state), true);
  for (const options of [{ method: 'fortune' }, { method: 'cause-ended', causeEnded: true }, { method: 'medical-attention', medicalAttention: true }]) {
    assert.ok(cursedState(recoverV5Condition(actor, state.id, options).participant), options.method);
  }
  const advanced = advanceV5Effects(actor, { phase: 'endOfTurn', round: 2, actorId: 'mage' });
  assert.ok(cursedState(advanced.participant));
});

test('L-03 — Regard maudit : retrait manuel refusé par le Store, y compris par modification brute de states', async () => {
  const store = await combat(wizard());
  await miscast(store, 38, 2);
  const actor = person(store), state = cursedState(actor);
  await assert.rejects(async () => store.updateParticipant('mage', { states: actor.states.filter(s => s.id !== state.id) }), /Regard|incident|retir/i);
  assert.ok(cursedState(person(store)));
  await store.updateParticipant('mage', { hp: 20 });
  assert.equal(person(store).hp, 20);
});

test('L-04 — l’expiration d’un sort portant le même trait laisse Puanteur infernale active', async () => {
  const store = await combat(wizard());
  await miscast(store, 8, 1);
  const actor = structuredClone(person(store));
  actor.extensions.v5.spellEffects = [{ id: 'spell-trait', spellId: 'x', spellName: 'X', traits: ['Distracting'] }];
  const after = expireSpellEffects(actor, { effectId: 'spell-trait' }).participant;
  assert.ok(after.traits.includes('Distracting'));
  assert.ok(after.extensions.v5.temporaryTraits.includes('Distracting'));
});

test('L-10 — incantation : l’unique inversion forcée remplace un ancien choix keep', async () => {
  const store = await combat(wizard());
  const p = store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 19, choice: 'keep', disadvantageSources: [{ id: 'fixture' }] });
  assert.equal(p.test.roll, 91); assert.equal(p.test.optionId, 'reverse');
});

test('L-11 — Store.previewMiscast utilise l’acteur du Store, pas un acteur fourni par l’appelant', async () => {
  const bare = wizard();
  const store = await combat(bare);
  const forged = { ...bare, talents: [talent('instinctive-diction'), talent('aethyric-attunement')] };
  const input = { actorId: 'mage', severity: 'MINOR', roll: 15, instinctiveDiction: true, attunementRank: 2, participant: forged };
  assert.equal(store.previewMiscast(input).cancelled, false, 'talents du client ignorés');
  await store.updateParticipant('mage', { talents: forged.talents });
  assert.equal(store.previewMiscast({ ...input, participant: bare }).ready, false, 'talents du Store pris en compte : second jet requis');
});

// L-05 — V5 p. 239, Clairvoyance chaotique : 1 Corruption par Point de Chance dépensé, par identité canonique.
const pc = (id, extra = {}) => ({ id, name: id, kind: 'PJ', extensions: { ficheId: 'c1', v5: { corruptionPerFortuneSpent: 1, corruptionPoints: 1, ...extra } } });
const envelope = (participants, fortune = 5) => ({ reserve: [], persistentCharacters: [], combat: { participants },
  extensions: { v5: { characterResources: [{ characterId: 'fiche:c1', fortune, initializedFrom: 'mj' }] } } });
const withFortune = (participant, value) => ({ ...participant, extensions: { ...participant.extensions, v5: { ...participant.extensions.v5, resources: { fortune: value } } } });
const corruption = participant => participant.extensions.v5.corruptionPoints;

test('L-05 — dépense de 2 Points de Chance : +2 Corruption', () => {
  const mage = pc('a'), env = envelope([mage]);
  const paid = commitV5Resources(env, [withFortune(mage, 3)]);
  assert.equal(corruption(paid.combat.participants[0]), 3);
  assert.equal(paid.extensions.v5.characterResources[0].fortune, 3);
});

test('L-05 — la Chance temporaire dépensée compte aussi', () => {
  const mage = pc('a', { spellEffects: [{ id: 'e', remainingTempFortune: 2 }] }), env = envelope([mage], 3);
  const paid = commitV5Resources(env, [withFortune(mage, 3)]);
  assert.equal(corruption(paid.combat.participants[0]), 3);
});

test('L-05 — plusieurs projections du même personnage : un seul crédit, reflété sur chacune', () => {
  const first = pc('a'), second = pc('b', { corruptionPerFortuneSpent: undefined });
  const env = envelope([first, second]);
  const paid = commitV5Resources(env, [withFortune(first, 3), withFortune(second, 3)]);
  assert.deepEqual(paid.combat.participants.map(corruption), [3, 3]);
});

test('L-05 — aucun crédit pour une initialisation, une augmentation ou sans Clairvoyance', () => {
  const mage = pc('a'), env = envelope([mage]);
  assert.equal(corruption(commitV5Resources(env, [withFortune(mage, 8)]).combat.participants[0]), 1);
  assert.equal(corruption(commitV5Resources({ ...env, extensions: { v5: { characterResources: [] } } }, [withFortune(mage, 4)]).combat.participants[0]), 1);
  const plain = pc('a', { corruptionPerFortuneSpent: undefined });
  assert.equal(corruption(commitV5Resources(envelope([plain]), [withFortune(plain, 3)]).combat.participants[0]), 1);
});

test('L-05 — dépense par le Store (Fortune de récupération) créditée et annulée par Undo', async () => {
  const store = await combat(wizard('mage', { kind: 'PJ', states: [{ name: 'Brisé' }], extensions: { v5: { corruptionPerFortuneSpent: 1, corruptionPoints: 0 } } }));
  await store.setFortune('mage', 2);
  const state = person(store).states[0];
  await store.recoverCondition('mage', state.id, { method: 'fortune' });
  assert.equal(store.getFortune('mage').balance, 1);
  assert.equal(corruption(person(store)), 1);
  await store.undo();
  assert.equal(corruption(person(store)), 0);
});

test('L-05 — Chance temporaire consommée par le Store : Corruption créditée', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { corruptionPerFortuneSpent: 1, corruptionPoints: 0,
    spellEffects: [{ id: 'e', spellId: 's', remainingTempFortune: 2 }] } } }));
  await store.consumeTemporaryFortune('mage', 2);
  assert.equal(corruption(person(store)), 2);
});

test('L-05 — V5 p. 239 : la nouvelle séance lève Clairvoyance chaotique', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { corruptionPerFortuneSpent: 1 } } }));
  await store.startTalentSession();
  assert.equal(person(store).extensions.v5.corruptionPerFortuneSpent, undefined);
});

test('L-07 — incantation critique, incident 91-95 : jets supplémentaires nommés puis appliqués par l’exécution du sort', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 10 } } } }), wizard('enemy', { camp: 'ennemi' }));
  const input = { actorId: 'mage', targetIds: ['enemy'], roll: 11, miscastRoll: 93, attributeActive: false };
  const missing = store.previewSpellExecution('Carreau', input);
  assert.equal(missing.ready, false);
  assert.match(missing.error, /jet supplémentaire n° 1.*jet supplémentaire n° 2/);
  const full = { ...input, secondaryRolls: { additionalRolls: [50, 85], additionalSecondaryRolls: [{ duration: 2 }, { duration: 4 }] } };
  const p = store.previewSpellExecution('Carreau', full);
  assert.equal(p.ready, true, p.error);
  assert.equal(p.castingPreview.miscast.details.results.length, 2);
  await store.applySpellExecution('Carreau', full);
  await store.undo();
  assert.deepEqual(person(store).states, []);
});
});

describe('Incidents, dissipation et Haute Magie — moteur', () => {
const memory = () => {
  let state;
  return {
    load: async () => state && structuredClone(state),
    saveAtomic: async ({ state: next }) => {
      state = structuredClone(next);
      return { ok: true };
    }
  };
};

function createWizardParticipant(overrides = {}) {
  return {
    id: 'wizard-1',
    name: 'Teclis Junior',
    caracs: { Int: 54, FM: 52, E: 38 }, // BI = 5, BFM = 5, BE = 3
    skills: [
      { name: 'Focalisation', total: 60, advances: 8 },
      { name: 'Focalisation (Haute Magie)', total: 55, advances: 3 },
      { name: 'Langue (Magick)', total: 65, advances: 11 },
      { name: 'Résistance', total: 45, advances: 7 },
      { name: 'Calme', total: 60, advances: 8 }
    ],
    fortune: 2,
    fate: 1,
    equipment: [],
    states: [],
    ...overrides
  };
}

function createDispellerParticipant(overrides = {}) {
  return {
    id: 'dispeller-1',
    name: 'Volkmar le Purificateur',
    caracs: { Int: 40, FM: 48, E: 45 }, // FM = 48 -> BFM = 4, Portée 48 yards
    skills: [
      { name: 'Langue (Magick)', total: 55, advances: 7 }
    ],
    equipment: [],
    states: [],
    ...overrides
  };
}

// ============================================================================
// 1. INCIDENTS MAGIQUES V5 (MISCASTS)
// ============================================================================

test('Incidents V5 — Couverture des bornes des tables Mineure et Majeure', () => {
  // Table Mineure : 20 entrées
  const minorMin = lookupMiscastEntry('MINOR', 1);
  assert.equal(minorMin.name, 'Langue maladroite');
  assert.equal(minorMin.max, 5);

  const minorMid = lookupMiscastEntry('MINOR', 68);
  assert.equal(minorMid.name, 'Rupture');
  assert.equal(minorMid.max, 70);

  const minorMax = lookupMiscastEntry('MINOR', 100);
  assert.equal(minorMax.name, 'Chaos en cascade');
  assert.equal(minorMax.max, 100);

  // Table Majeure : 20 entrées, dernière entrée 96 et plus
  const majorMin = lookupMiscastEntry('MAJOR', 1);
  assert.equal(majorMin.name, 'Propos ésotériques');
  assert.equal(majorMin.max, 5);

  const major96 = lookupMiscastEntry('MAJOR', 96);
  assert.equal(major96.name, 'Contre-réaction aethyrique');

  const major120 = lookupMiscastEntry('MAJOR', 120);
  assert.equal(major120.name, 'Contre-réaction aethyrique');
});

test('Incidents V5 — Diction instinctive (-20 sur jet Mineur, <= 0 aucun effet, inactif sur Majeur)', () => {
  // 1. Jet Mineur 15 avec Diction instinctive : 15 - 20 = -5 <= 0 -> aucun effet / annulé
  const cancelledMinor = resolveMiscast({
    severity: 'MINOR',
    roll: 15,
    instinctiveDiction: true
  });
  assert.equal(cancelledMinor.cancelled, true);
  assert.equal(cancelledMinor.effectiveSeverity, 'NONE');
  assert.match(cancelledMinor.cancelReason, /diction instinctive/i);

  // 2. Jet Mineur 45 avec Diction instinctive : 45 - 20 = 25 -> Rébellion intestinale en v3 (max 25)
  const reducedMinor = resolveMiscast({
    severity: 'MINOR',
    roll: 45,
    instinctiveDiction: true
  });
  assert.equal(reducedMinor.cancelled, false);
  assert.equal(reducedMinor.finalRoll, 25);
  assert.equal(reducedMinor.name, 'Rébellion intestinale');

  // 3. Jet Majeur avec Diction instinctive : aucun effet réducteur sur table Majeure
  const majorNoEffect = resolveMiscast({
    severity: 'MAJOR',
    roll: 20,
    instinctiveDiction: true
  });
  assert.equal(majorNoEffect.cancelled, false);
  assert.equal(majorNoEffect.finalRoll, 20);
  assert.equal(majorNoEffect.name, 'Drain de puissance');
});

test('Règle de table — les anciennes options d’ingrédient ne réduisent aucun incident',()=>{
 for(const severity of ['MINOR','MAJOR'])for(const roll of [1,30,50,95,100])assert.deepEqual(resolveMiscast({severity,roll,hasIngredient:true}),resolveMiscast({severity,roll}));
});

test('Incidents V5 — Influence corruptrice (convertit Mineur en Majeur)', () => {
  const corrupted = resolveMiscast({
    severity: 'MINOR',
    roll: 15,
    corruptingInfluence: true
  });
  assert.equal(corrupted.table, 'MAJOR');
  assert.equal(corrupted.name, 'Poupée de chiffon'); // max 15 sur MAJOR
});

test('Incidents V5 — Débordement Mineur > 100 répercuté sur jet Majeur avec excédent', () => {
  // Jet Mineur initial 85 avec modificateur +30 = 115. Excédent = 15.
  // 2e dé pour le jet Majeur fourni = 20 -> jet Majeur = 20 + 15 = 35 -> Secousse du Chaos (max 35)
  const overflowMiscast = resolveMiscast({
    severity: 'MINOR',
    roll: 85,
    modifier: 30,
    secondaryRolls: { majorRoll: 20 }
  });
  assert.equal(overflowMiscast.table, 'MAJOR');
  assert.equal(overflowMiscast.overflow, 15);
  assert.equal(overflowMiscast.finalRoll, 35);
  assert.equal(overflowMiscast.name, 'Secousse du Chaos');
});

test('Incidents V5 — Conservation des dés secondaires tirés et détails structurés', () => {
  // Poupée de chiffon (MAJOR max 15) : 1d10 distance, 1d10 dégâts
  const ragdoll = resolveMiscast({
    severity: 'MAJOR',
    roll: 12,
    secondaryRolls: { distance: 7, damage: 8 }
  });
  assert.equal(ragdoll.name, 'Poupée de chiffon');
  assert.equal(ragdoll.details.distanceYards, 7);
  assert.equal(ragdoll.details.rawDamage, 8);
  assert.equal(ragdoll.details.armorIgnored, true);
  assert.equal(ragdoll.details.reducedByBE, true);
  assert.deepEqual(ragdoll.details.conditionsGained, ['À Terre']);

  // Choc aethyrique (MAJOR max 30) : 1d10 blessures directes
  const shock = resolveMiscast({
    severity: 'MAJOR',
    roll: 28,
    secondaryRolls: { damage: 6 }
  });
  assert.equal(shock.name, 'Choc aethyrique');
  assert.equal(shock.details.woundsLost, 6);
  assert.equal(shock.details.ignoresBEAndPA, true);

  // Haute Magie : Marque de la magie (Mineur max 90) devient 1d10 jours d'épuisement magique
  const highMagicMark = resolveMiscast({
    severity: 'MINOR',
    roll: 88,
    isHighMagic: true,
    secondaryRolls: { duration: 4 }
  });
  assert.equal(highMagicMark.name, 'Marqué par la magie');
  assert.equal(highMagicMark.details.type, 'burnout');
  assert.equal(highMagicMark.details.burnout.days, 4);
  assert.equal(highMagicMark.details.burnout.permanent, false);
});

// ============================================================================
// 2. HAUTE MAGIE V5 & ÉPUISEMENT MAGIQUE (BURNOUT) & RUNES DES CADAI
// ============================================================================

test('Épuisement magique V5 — Calcul du risque : excédent DR au-delà du BFM', () => {
  // BFM = 5
  // DR dépensés en surpuissance = 3 -> aucun risque (3 <= 5)
  const safe = calculateBurnoutRisk({ overcastSpent: 3, bfm: 5 });
  assert.equal(safe.triggered, false);
  assert.equal(safe.riskPercent, 0);

  // DR dépensés = 5 -> aucun risque (5 <= 5)
  const limit = calculateBurnoutRisk({ overcastSpent: 5, bfm: 5 });
  assert.equal(limit.triggered, false);
  assert.equal(limit.riskPercent, 0);

  // DR dépensés = 8 -> Risque = 8 - 5 = 3%
  const risk3 = calculateBurnoutRisk({ overcastSpent: 8, bfm: 5 });
  assert.equal(risk3.triggered, true);
  assert.equal(risk3.riskPercent, 3);

  // DR dépensés = 18 -> Risque = 18 - 5 = 13%
  const risk13 = calculateBurnoutRisk({ overcastSpent: 18, bfm: 5 });
  assert.equal(risk13.triggered, true);
  assert.equal(risk13.riskPercent, 13);
});

test('Épuisement magique V5 — Résolution du jet, durée en jours et permanence sur double', () => {
  const wizard = createWizardParticipant(); // BFM = 5

  // 1. Risque 10% (15 DR dépensés, 15 - 5 = 10%)
  // Jet = 15 > 10% -> burnout évité
  const avoided = previewBurnout({ participant: wizard, overcastSpent: 15, roll: 15 });
  assert.equal(avoided.burnedOut, false);
  assert.equal(avoided.durationDays, 0);

  // 2. Jet = 7 <= 10% (non-double) -> burnout temporaire pour 7 jours
  const tempBurnout = previewBurnout({ participant: wizard, overcastSpent: 15, roll: 7 });
  assert.equal(tempBurnout.burnedOut, true);
  assert.equal(tempBurnout.permanent, false);
  assert.equal(tempBurnout.durationDays, 7);

  // 3. Risque 15% (20 DR dépensés, 20 - 5 = 15%)
  // Jet = 11 <= 15% (DOUBLE) -> burnout PERMANENT !
  const permBurnout = previewBurnout({ participant: wizard, overcastSpent: 20, roll: 11 });
  assert.equal(permBurnout.burnedOut, true);
  assert.equal(permBurnout.permanent, true);
  assert.equal(permBurnout.durationDays, Infinity);
});

test('Épuisement magique V5 — Annulation via Points de Chance (temporaire) ou Destin (permanent)', () => {
  const wizard = createWizardParticipant();

  // 1. Épuisement temporaire : annulable avec Fortune (Chance)
  // S-11 : Chance lue dans le registre V5 (resources.fortune), Destin dans extensions.v5.fate.
  const tempState = structuredClone(wizard);
  tempState.extensions = { v5: { burnout: { active: true, permanent: false, days: 5 }, resources: { fortune: 1 }, fate: 1 } };
  const tempCheck = previewBurnoutRecovery(tempState, { resource: 'fortune' });
  assert.equal(tempCheck.possible, true);
  assert.equal(tempCheck.requiredResource, 'fortune');

  // Épuisement temporaire : le Destin ne le lève pas (S-11) ; compteur de Chance non initialisé : bloqué
  assert.equal(previewBurnoutRecovery(tempState, { resource: 'fate' }).possible, false);
  assert.equal(previewBurnoutRecovery({ ...tempState, extensions: { v5: { burnout: tempState.extensions.v5.burnout } } }, { resource: 'fortune' }).possible, false);
  // Refus si on tente sans ressource appropriée
  const invalidTemp = previewBurnoutRecovery(tempState, { resource: 'other' });
  assert.equal(invalidTemp.possible, false);

  // 2. Épuisement permanent : annulable UNIQUEMENT avec Destin (Fate)
  const permState = structuredClone(wizard);
  permState.extensions = { v5: { burnout: { active: true, permanent: true, days: Infinity }, resources: { fortune: 1 }, fate: 1 } };

  // Refus avec Fortune
  const rejectFortune = previewBurnoutRecovery(permState, { resource: 'fortune' });
  assert.equal(rejectFortune.possible, false);

  // Succès avec Destin
  const acceptFate = previewBurnoutRecovery(permState, { resource: 'fate' });
  assert.equal(acceptFate.possible, true);
  assert.equal(acceptFate.requiredResource, 'fate');
});

test('Runes des Cadai V5 — Déploiement plafonné à BFM et consommation pour relance', () => {
  const wizard = createWizardParticipant(); // BFM = 5

  // Initialement 0 runes
  assert.deepEqual(getCadaiRunes(wizard), { deployed: 0, max: 5 });

  // Déploiement de 3 runes
  const step1 = deployCadaiRune(wizard, { count: 3 });
  assert.deepEqual(getCadaiRunes(step1), { deployed: 3, max: 5 });

  // Déploiement de 4 runes supplémentaires -> plafonné à BFM (5)
  const step2 = deployCadaiRune(step1, { count: 4 });
  assert.deepEqual(getCadaiRunes(step2), { deployed: 5, max: 5 });

  // Consommation d'une rune pour relancer un test
  const consume1 = consumeCadaiRune(step2, { purpose: 'relance focalisation' });
  assert.equal(consume1.success, true);
  assert.equal(consume1.remaining, 4);

  // Consommation de toutes les runes restantes
  let current = consume1.participant;
  for (let i = 0; i < 4; i++) {
    current = consumeCadaiRune(current).participant;
  }
  assert.equal(getCadaiRunes(current).deployed, 0);

  // Tentative quand stock vide -> échec
  const failEmpty = consumeCadaiRune(current);
  assert.equal(failEmpty.success, false);
  assert.match(failEmpty.reason, /aucune rune/i);
});

// ============================================================================
// 3. DISSIPATION V5 (RÉACTION & SORT PERSISTANT)
// ============================================================================

test('Dissipation V5 (réaction) — Quota 1/round, portée FM yards et opposition', () => {
  const dispeller = createDispellerParticipant(); // FM = 48 -> Portée max 48 yards
  const castingPreview = {
    testSl: 3, // D-02 : opposition au Test seul
    matchingReserve: 0,
    totalCastingSl: 3,
    spell: { name: 'Comète de Cassandora', cn: 6 },
    criticalChoice: 'critical-wound'
  };

  // 1. Contrôle de portée : distance 55 yards > 48 yards -> interdit
  const outOfRange = previewDispelCasting(dispeller, castingPreview, {
    round: 1,
    distance: 55,
    visible: true, // D-18 : visibilité saisie
    roll: 20
  });
  assert.equal(outOfRange.allowed, false);
  assert.match(outOfRange.reason, /portée/i);

  // 2. À portée (30 yards <= 48 yards) :
  // Dissipateur : Langue (Magick) score 55. Jet 25 -> DR = 5 - 2 = +3.
  // Lanceur DR = 3.
  // Net SL = 3 - 3 = 0 (pas > 0) -> échec de la dissipation
  const tieDispel = previewDispelCasting(dispeller, castingPreview, {
    round: 1,
    distance: 30,
    visible: true, // D-18 : visibilité saisie
    roll: 25
  });
  assert.equal(tieDispel.allowed, true);
  assert.equal(tieDispel.dispellerSl, 3);
  assert.equal(tieDispel.casterSl, 3);
  assert.equal(tieDispel.netSl, 0);
  assert.equal(tieDispel.dispelled, false);

  // 3. Réussite nette : jet 12 -> DR = 5 - 1 = +4. Net = 3 - 4 = -1 < 0 -> DISSIPÉ !
  const successDispel = previewDispelCasting(dispeller, castingPreview, {
    round: 1,
    distance: 30,
    visible: true, // D-18 : visibilité saisie
    roll: 12
  });
  assert.equal(successDispel.dispelled, true);
  assert.equal(successDispel.netSl, -1); // X-01 : netSl = DR du lanceur − DR du dissipateur

  // 4. Quota 1 tentative par round : après marquage, seconde tentative dans le même round rejetée
  const usedDispeller = markDispelReactionUsed(dispeller, 1);
  assert.equal(hasUsedDispelReaction(usedDispeller, 1), true);

  const blockedDispel = previewDispelCasting(usedDispeller, castingPreview, {
    round: 1,
    distance: 30,
    visible: true, // D-18 : visibilité saisie
    roll: 10
  });
  assert.equal(blockedDispel.allowed, false);
  assert.match(blockedDispel.reason, /déjà utilisé/i);

  // Mais autorisée au Round 2 !
  const round2Dispel = previewDispelCasting(usedDispeller, castingPreview, {
    round: 2,
    distance: 30,
    visible: true, // D-18 : visibilité saisie
    roll: 10
  });
  assert.equal(round2Dispel.allowed, true);
});

test('Dissipation V5 (réaction) — Exception absolue : Force irrésistible interdit toute dissipation', () => {
  const dispeller = createDispellerParticipant();
  const unstoppableCast = {
    totalCastingSl: 5,
    spell: { name: 'Lance d’Ambre', cn: 10 },
    criticalChoice: 'unstoppable-force' // Force irrésistible !
  };

  const attempt = previewDispelCasting(dispeller, unstoppableCast, { round: 1, roll: 5 });
  assert.equal(attempt.allowed, false);
  assert.match(attempt.reason, /force irrésistible/i);
});

test('Dissipation V5 (persistant) — Test étendu NI, cumul, et bonus +1 DR sur propre sort', () => {
  const dispeller = createDispellerParticipant(); // Langue 55
  const persistentSpell = {
    id: 'active-robe-scintillante-1',
    name: 'Robe scintillante',
    cn: 6,
    casterId: 'other-wizard',
    progressByDispeller: {}
  };

  // 1. Tour 1 : jet 35 -> DR = 5 - 3 = +2 DR. Progression 2/6.
  const round1 = previewDispelPersistent(dispeller, persistentSpell, { roll: 35, distance: 10, visible: true });
  assert.equal(round1.earnedSl, 2);
  assert.equal(round1.newProgress, 2);
  assert.equal(round1.dispelled, false);

  // Mise à jour de la progression
  const updatedEffect = {
    ...persistentSpell,
    progressByDispeller: { [dispeller.id]: 2 }
  };

  // 2. Tour 2 : jet 23 -> DR = 5 - 2 = +3 DR. Progression 2 + 3 = 5/6. Toujours actif.
  const round2 = previewDispelPersistent(dispeller, updatedEffect, { roll: 23, distance: 10, visible: true });
  assert.equal(round2.earnedSl, 3);
  assert.equal(round2.newProgress, 5);
  assert.equal(round2.dispelled, false);

  const updatedEffect2 = {
    ...persistentSpell,
    progressByDispeller: { [dispeller.id]: 5 }
  };

  // 3. Tour 3 : jet 40 -> DR = 5 - 4 = +1 DR. Progression 5 + 1 = 6/6 >= 6 -> DISSIPÉ !
  const round3 = previewDispelPersistent(dispeller, updatedEffect2, { roll: 40, distance: 10, visible: true });
  assert.equal(round3.earnedSl, 1);
  assert.equal(round3.newProgress, 6);
  assert.equal(round3.dispelled, true);

  // 4. Bonus de dissiper son propre sort : +1 DR
  const ownSpell = {
    id: 'active-own-spell-1',
    name: 'Mon Bouclier',
    cn: 4,
    casterId: dispeller.id, // propre sort !
    progressByDispeller: {}
  };
  const ownCheck = previewDispelPersistent(dispeller, ownSpell, { roll: 35, distance: 10, visible: true });
  // Score 55, roll 35 -> base DR 2. Avec bonus propre sort (+1 DR) -> 3 DR !
  assert.equal(ownCheck.isOwnSpell, true);
  assert.equal(ownCheck.earnedSl, 3);
});

// ============================================================================
// 4. INTÉGRATION STORE & TRANSACTIONS RÉVERSIBLES SOUS UNDO()
// ============================================================================

test('Store V5 — Runes des Cadai, Burnout et Dissipations réversibles sous store.undo()', async () => {
  const store = createStore({ persistence: memory() });
  await store.ready;

  const wizard = createWizardParticipant();
  const dispeller = createDispellerParticipant();

  await store.executeCommand('init-combat', draft => {
    draft.combat = {
      round: 1,
      currentActorId: wizard.id,
      participants: [wizard, dispeller]
    };
    return draft;
  });

  // 1. Déploiement de runes des Cadai
  for(let i=0;i<3;i++)await store.deployCadaiRune({ actorId: wizard.id, roll:25, conditionsConfirmed:true });
  assert.equal(store.getCadaiRunes(wizard.id).deployed, 3);

  // Annulation déploiement
  await store.undo();
  assert.equal(store.getCadaiRunes(wizard.id).deployed, 2);

  // Rétablissement (redéploiement)
  await store.deployCadaiRune({ actorId: wizard.id, reset:true });
  for(let i=0;i<2;i++)await store.deployCadaiRune({ actorId: wizard.id, roll:25, conditionsConfirmed:true });
  assert.equal(store.getCadaiRunes(wizard.id).deployed, 2);

  // Consommation d'une rune
  await store.consumeCadaiRune({ actorId: wizard.id, purpose: 'relance test' });
  assert.equal(store.getCadaiRunes(wizard.id).deployed, 1);

  // Annulation consommation
  await store.undo();
  assert.equal(store.getCadaiRunes(wizard.id).deployed, 2);

  // 2. Application d'épuisement magique
  const burnoutPreview = store.previewBurnout({
    actorId: wizard.id,
    overcastSpent: 15, // 15 - 5 = 10%
    roll: 8 // <= 10% -> 8 jours
  });
  assert.equal(burnoutPreview.burnedOut, true);
  assert.equal(burnoutPreview.durationDays, 8);

  await store.applyBurnout(burnoutPreview, { actorId: wizard.id });
  const [wAfterBurnout] = store.listParticipants();
  assert.equal(getBurnoutStatus(wAfterBurnout).active, true);
  assert.equal(getBurnoutStatus(wAfterBurnout).days, 8);

  // Annulation burnout
  await store.undo();
  const [wAfterUndoBurnout] = store.listParticipants();
  assert.equal(getBurnoutStatus(wAfterUndoBurnout).active, false);

  // 3. Réaction de dissipation enregistrée dans le combat
  const castingPreview = {
    testSl: 2,
    matchingReserve: 0,
    totalCastingSl: 2,
    spell: { name: 'Flèche Aethyrique', cn: 4 }
  };
  const dispelPreview = store.previewDispelCasting(castingPreview, {
    dispellerId: dispeller.id,
    round: 1,
    distance: 10,
    visible: true,
    roll: 15 // Langue 55 -> DR = 4 vs 2 -> Gagné !
  });
  assert.equal(dispelPreview.dispelled, true);

  await store.applyDispelCasting(dispelPreview, { dispellerId: dispeller.id });
  const participantsAfterDispel = store.listParticipants();
  const dAfter = participantsAfterDispel.find(p => p.id === dispeller.id);
  assert.equal(hasUsedDispelReaction(dAfter, 1), true);

  // Annulation de la dissipation : la réaction redevient disponible !
  await store.undo();
  const participantsAfterUndo = store.listParticipants();
  const dAfterUndo = participantsAfterUndo.find(p => p.id === dispeller.id);
  assert.equal(hasUsedDispelReaction(dAfterUndo, 1), false);
});
});
