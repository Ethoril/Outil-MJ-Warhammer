import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { advanceV5Effects } from '../js/core/v5-effects.js';
import { familiarSkillSupport } from '../js/core/v5-magic-talents.js';
import {
  validateFamiliarLink, linkedFamiliars, familiarSupport, companionTalents, withCompanionTalents, previewFamiliarCondition,
  previewFamiliarHealing, planFamiliarDeath, familiarDeathDamage, senseSharingRange, familiarIgnoresAblaze, familiarReminders, COMPANION_TRAITS
} from '../js/core/familiars.js';

const talent = (id, rank = 1) => ({ id: 'talent-' + id, status: 'resolved', rank });
const person = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 20, maxHp: 20, fortune: 2, zone: 'active', init: 40, caracs: { E: 30, FM: 40 }, skills: [{ name: 'Focalisation', total: 50 }], talents: [], states: [], equipment: [], ...extra });
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
async function combat(...people) {
  const store = createStore({ storage: storage() }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const get = (store, id) => store.listParticipants().find(p => p.id === id);
const homunculus = { system: 'homunculus', kind: 'power', wind: 'aqshy' };

test('F2 : homoncule de Puissance lié, +2 DR à Focalisation, sans lien 0, aucun cumul avec une autre assistance', async () => {
  const store = await combat(person('mage'), person('famil', { talents: [talent('magical-assistant'), talent('animal-assistant')] }));
  assert.equal((await store.linkFamiliar('mage', 'famil', homunculus)).ok, true);
  const people = store.listParticipants();
  const support = familiarSupport(get(store, 'mage'), people, 'Focalisation');
  assert.deepEqual(support.modifiers.map(m => m.amount), [2]);
  assert.equal(support.advantages.length, 0);
  assert.deepEqual(familiarSupport(person('seul'), people, 'Focalisation'), { modifiers: [], advantages: [] });
});

test('F2 : lien d’animal, talents de compagnon seulement à portée, +1 DR si déjà connu, cumul de plusieurs animaux', async () => {
  const store = await combat(person('mage'), person('blaireau'), person('renard'), person('hibou'));
  const badger = (await store.linkFamiliar('mage', 'blaireau', { system: 'animal', kind: 'power', species: 'badger' })).link;
  assert.equal(badger.inRange, false);
  assert.deepEqual(companionTalents(get(store, 'mage'), store.listParticipants()).granted, []);
  await store.setFamiliarRange('mage', badger.id, true);
  let result = companionTalents(get(store, 'mage'), store.listParticipants());
  assert.deepEqual(result.granted.map(t => t.name), ['Robuste', 'Tenace']);
  assert.equal(withCompanionTalents(get(store, 'mage'), store.listParticipants()).talents.some(t => t.id === 'talent-robust'), true);
  assert.equal(get(store, 'mage').talents.length, 0);
  const known = { ...get(store, 'mage'), talents: [talent('robust')] };
  result = companionTalents(known, store.listParticipants());
  assert.deepEqual(result.bonuses.map(b => [b.name, b.amount]), [['Robuste', 1]]);
  assert.deepEqual(result.granted.map(t => t.name), ['Tenace']);
  for (const [id, species] of [['renard', 'fox'], ['hibou', 'owl']]) {
    const link = (await store.linkFamiliar('mage', id, { system: 'animal', kind: 'power', species, inRange: true })).link;
    assert.equal(link.inRange, true);
  }
  const all = companionTalents(get(store, 'mage'), store.listParticipants());
  assert.equal(all.granted.length, 6);
  assert.ok(all.granted.some(t => t.name === 'Baratiner') && all.granted.some(t => t.name === 'Visions divines') && all.granted.some(t => t.name === 'Intrigant'));
  assert.ok(all.reminders.some(text => /Visions divines/.test(text)));
});

test('F2 : l’assistance d’un animal ne joue qu’à portée', async () => {
  const store = await combat(person('mage'), person('chat', { talents: [talent('animal-assistant')] }));
  const link = (await store.linkFamiliar('mage', 'chat', { system: 'animal', kind: 'power', species: 'cat' })).link;
  assert.equal(familiarSupport(get(store, 'mage'), store.listParticipants(), 'Focalisation').advantages.length, 0);
  await store.setFamiliarRange('mage', link.id, true);
  assert.equal(familiarSupport(get(store, 'mage'), store.listParticipants(), 'Focalisation').advantages.length, 1);
});

test('F2 : refus (autre maître, soi-même, Combat pour un animal, Vent, espèce, doublon) sans révision ni historique', async () => {
  const store = await combat(person('mage'), person('autre'), person('bete'));
  await store.linkFamiliar('autre', 'bete', { system: 'animal', kind: 'power', species: 'cat' });
  const rev = () => JSON.parse(store.getFullJSON()).localRevision;
  const before = rev();
  const refusals = [
    [['mage', 'bete', { system: 'animal', kind: 'power', species: 'fox' }], 'already-linked'],
    [['mage', 'mage', homunculus], 'self-link'],
    [['mage', 'autre', { system: 'animal', kind: 'combat', species: 'fox' }], 'animal-kind'],
    [['mage', 'autre', { system: 'homunculus', kind: 'combat', wind: 'noir' }], 'unknown-wind'],
    [['mage', 'autre', { system: 'homunculus', kind: 'tank', wind: 'ghur' }], 'unknown-kind'],
    [['mage', 'autre', { system: 'animal', kind: 'power', species: 'dragon' }], 'unknown-species'],
    [['mage', 'inconnu', homunculus], 'unknown-participant']
  ];
  for (const [args, reason] of refusals) {
    const result = store.linkFamiliar(...args);
    assert.equal(result.ok, false, reason);
    assert.equal(result.reason, reason);
  }
  assert.equal(rev(), before);
  assert.equal(validateFamiliarLink(person('a'), person('b'), { system: 'nope' }).reason, 'unknown-system');
});

test('F2 : création et retrait annulables des deux côtés, identité par id, aucune ligne résiduelle', async () => {
  const store = await combat(person('mage'), person('famil'));
  const { link } = await store.linkFamiliar('mage', 'famil', homunculus);
  assert.equal(get(store, 'mage').extensions.v5.familiarLinks.length, 1);
  assert.deepEqual(get(store, 'famil').extensions.v5.familiarOf, { masterId: 'mage', linkId: link.id, system: 'homunculus', kind: 'power', wind: 'aqshy', species: null });
  assert.equal(linkedFamiliars(get(store, 'mage'), store.listParticipants())[0].familiar.id, 'famil');
  assert.equal(store.undo(), true);
  assert.equal(get(store, 'mage').extensions?.v5?.familiarLinks, undefined);
  assert.equal(get(store, 'famil').extensions?.v5?.familiarOf, undefined);
  assert.equal(store.redo(), true);
  assert.equal((await store.unlinkFamiliar('mage', link.id)).ok, true);
  assert.deepEqual(get(store, 'mage').extensions.v5.familiarLinks, []);
  assert.equal(get(store, 'famil').extensions.v5.familiarOf, undefined);
  assert.equal(store.unlinkFamiliar('mage', 'x').ok, false);
  assert.equal(store.undo(), true);
  assert.equal(get(store, 'famil').extensions.v5.familiarOf.linkId, link.id);
});

test('F2 : États et soins non magiques refusés à un homoncule, avec reçu ; magiques acceptés', () => {
  const famil = person('famil', { extensions: { v5: { familiarOf: { masterId: 'm', linkId: 'l', system: 'homunculus', wind: 'ghur' } } } });
  const refused = previewFamiliarCondition(famil, 'Hémorragique', { magical: false });
  assert.equal(refused.ok, false);
  assert.match(refused.receipt.message, /source magique/);
  assert.equal(previewFamiliarCondition(famil, 'Hémorragique', { magical: true }).ok, true);
  assert.equal(previewFamiliarCondition(famil, 'À Terre', {}).ok, true);
  assert.equal(previewFamiliarHealing(famil, { kind: 'skill', name: 'Soin' }).ok, false);
  assert.equal(previewFamiliarHealing(famil, { kind: 'spell' }).ok, true);
  assert.equal(previewFamiliarCondition(person('libre'), 'Hémorragique', {}).ok, true);
});

test('F2 : homoncule d’Aqshy sans dégâts d’Embrasé ; autres Vents inchangés', () => {
  const burning = wind => person('f', { caracs: { E: 30 }, armor: {}, states: [{ name: 'Enflammé', level: 1 }], extensions: { v5: { familiarOf: { masterId: 'm', linkId: 'l', system: 'homunculus', wind } } } });
  const endRound = { phase: 'endOfRound', round: 1, actorId: 'other', turn: 8 };
  assert.equal(familiarIgnoresAblaze(burning('aqshy')), true);
  const aqshy = advanceV5Effects(burning('aqshy'), endRound, { fireRoll: 9 });
  assert.equal(aqshy.participant.hp, 20);
  assert.ok(aqshy.reminders.some(text => /Aqshy/.test(text)));
  const ghur = advanceV5Effects(burning('ghur'), endRound, { fireRoll: 9, fireArmour: 0 });
  assert.equal(ghur.participant.hp, 14);
});

test('F2 : mort d’un animal lié, reçu avec Calme −2 DR (0 pour un elfe), rien appliqué', async () => {
  const store = await combat(person('mage'), person('elfe', { keywords: ['elfe'] }), person('chat'), person('corbeau'));
  await store.linkFamiliar('mage', 'chat', { system: 'animal', kind: 'power', species: 'cat' });
  await store.linkFamiliar('elfe', 'corbeau', { system: 'animal', kind: 'power', species: 'raven' });
  const plan = planFamiliarDeath(get(store, 'mage'), get(store, 'chat'));
  assert.equal(plan.calmTest.modifier, -2);
  assert.equal(plan.applied, false);
  assert.equal(plan.onFailure.ignoresToughnessBonus && plan.onFailure.ignoresArmour, true);
  assert.equal(planFamiliarDeath(get(store, 'elfe'), get(store, 'corbeau')).calmTest.modifier, 0);
  assert.equal(get(store, 'chat').hp, 20);
  assert.equal(familiarDeathDamage([3]).ok, false);
  assert.equal(familiarDeathDamage([3, 7]).damage, 10);
  assert.equal(planFamiliarDeath(get(store, 'mage'), get(store, 'corbeau')).applicable, false);
});

test('F2 : persistance des liens des deux côtés à l’export ; aucun lien créé pour un participant sans lien', async () => {
  const store = await combat(person('mage'), person('famil'), person('seul'));
  await store.linkFamiliar('mage', 'famil', homunculus);
  const copy = createStore({ storage: storage() }); await copy.ready;
  await copy.loadFromJSON(store.getFullJSON());
  assert.equal(get(copy, 'mage').extensions.v5.familiarLinks[0].familiarId, 'famil');
  assert.equal(get(copy, 'famil').extensions.v5.familiarOf.masterId, 'mage');
  assert.equal(get(copy, 'seul').extensions?.v5?.familiarLinks, undefined);
  assert.equal(get(copy, 'seul').extensions?.v5?.familiarOf, undefined);
});

test('F2 : partage sensoriel (plus faible Volonté en miles), rappels, table des compagnons', () => {
  assert.deepEqual(senseSharingRange(person('a', { caracs: { FM: 45 } }), person('b', { caracs: { FM: 30 } })), { ok: true, miles: 30 });
  assert.equal(senseSharingRange(person('a'), person('b', { caracs: {} })).ok, false);
  const spell = person('s', { extensions: { v5: { familiarOf: { system: 'homunculus', kind: 'spell' } } } });
  assert.ok(familiarReminders(spell).some(text => /4 sorts/.test(text)));
  assert.deepEqual(familiarReminders(person('x')), []);
  assert.equal(Object.keys(COMPANION_TRAITS).length, 7);
});

test('F2 : les cases manuelles du jet restent valides pour un familier non lié', () => {
  const support = familiarSkillSupport(person('mage'), person('f', { talents: [talent('magical-assistant')] }), 'Focalisation', { magicAssistantLinked: true });
  assert.deepEqual(support.modifiers.map(m => m.amount), [2]);
});
