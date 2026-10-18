import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { BEAST_PROFILES } from '../js/core/v5-magic-arbitrations.js';

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
