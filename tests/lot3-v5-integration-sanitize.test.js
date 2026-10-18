import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { sharedState } from '../js/core/sync-protocol.js';

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
