import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

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
import { listDispellablePersistentEffects } from '../js/core/v5-magic-dispel.js';

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
