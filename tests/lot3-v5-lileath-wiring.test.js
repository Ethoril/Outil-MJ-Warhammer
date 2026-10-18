import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { applySpellEffects, expireSpellEffects, rebaseMagicLayers } from '../js/core/v5-magic-effects.js';

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
    await store.applySpellExecution('Écorce', { actorId: 'mage', targetIds: [id], roll: 11, attributeActive: false, miscastRoll: 50 });
    await store.updateParticipant('mage', { extensions: { v5: { ...find('mage').extensions.v5, channelling: { type: 'winds', sl: 10 }, magicAttemptTurn: undefined } } });
  }
  const own = find('plain').extensions.v5.spellEffects.find(effect => effect.spellName === 'Écorce');
  assert.equal(own.casterId, 'mage'); assert.equal(own.casterLileathRank, 2);
  assert.equal(find('plain').caracs.E, 50, '30 + 20 : le sort d’un autre lanceur (rang 0) ne profite pas du rang de mage');
  assert.equal(find('blessed').caracs.E, 50, 'le talent de la cible ne change rien');
});
