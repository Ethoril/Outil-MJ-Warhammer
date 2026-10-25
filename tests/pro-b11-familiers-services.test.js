import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { companionTalents, withCompanionTalents } from '../js/core/familiars.js';
import { buildFamiliarBlock, readFamiliarDeathInputs } from '../js/ui/familiar-block.js';

// B11 : services restants des familiers branchés sur les commandes existantes : talents de compagnon dans les Tests du maître,
// refus d'États et de soins à l'homoncule, mort de l'animal (Calme + dégâts saisis), rappels, portée de l'animal.
const memoryPersistence = () => { let state = null; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } }; };
const person = (id, extra = {}) => ({ id, name: id, kind: 'Créature', camp: 'neutre', zone: 'active', initiative: 20, hp: 10, maxHp: 10, caracs: { Ag: 40, Soc: 40, FM: 40, Int: 30 }, traits: [], talents: [], states: [], extensions: { v5: {} }, ...extra });
const get = (store, id) => store.getCombat().participants.get(id);
const ALLEY_CAT_SKILL = 'skill-44_69_73_63_72_e9_74_69_6f_6e-55_72_62_61_69_6e_65';

async function table() {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addParticipant(person('hero', { name: 'Magda', kind: 'PJ', camp: 'pj', hp: 20, maxHp: 20, extensions: { v5: { fate: 3 } } }));
  await store.addParticipant(person('imp', { name: 'Homoncule' }));
  await store.addParticipant(person('cat', { name: 'Minou', hp: 4, maxHp: 4 }));
  await store.addParticipant(person('foe', { name: 'Brigand', camp: 'ennemi' }));
  return store;
}
const stealth = (store, exp = {}) => store.previewResolution({ resolutionId: 'b11-stealth', actorId: 'hero', targetId: 'foe', action: { type: 'test', attr: 'Ag', base: 50, label: 'Discrétion (Urbaine)', ...exp }, roll: 30, v5: { kind: 'test', context: { skillId: ALLEY_CAT_SKILL } } });

test('B11 : talent de compagnon (Chat de gouttière) effectif dans le Test du maître seulement quand l’animal est à portée', async () => {
  const store = await table();
  await store.createFamiliar('hero', 'cat', { system: 'animal', kind: 'power', species: 'cat', resource: 'fate' });
  // Le lien d'un animal n'agit qu'à portée : hors de portée, rien n'est donné.
  const away = stealth(store);
  assert.ok(!(away.test?.details?.advantages || away.actorTest?.details?.advantages || []).some(row => /Chat de gouttière|alley/i.test(row.label || row.id || '')));
  const link = get(store, 'hero').extensions.v5.familiarLinks[0];
  assert.equal(link.inRange, false);
  assert.equal(companionTalents(get(store, 'hero'), store.listParticipants()).granted.length, 0);
  await store.setFamiliarRange('hero', link.id, true);
  const granted = companionTalents(get(store, 'hero'), store.listParticipants()).granted.map(row => row.talentId);
  assert.deepEqual(granted, ['talent-alley-cat', null]);
  assert.ok(withCompanionTalents(get(store, 'hero'), store.listParticipants()).talents.some(row => row.id === 'talent-alley-cat' && row.source === 'companion'));
  assert.equal(get(store, 'hero').talents.length, 0, 'le participant stocké n’est jamais modifié');
  const near = stealth(store);
  const json = JSON.stringify(near);
  assert.match(json, /talent-alley-cat|Chat de gouttière/);
  assert.doesNotMatch(JSON.stringify(away), /talent-alley-cat/);
  const reminders = store.getParticipantReminders('hero').map(item => item.text).join('\n');
  assert.match(reminders, /Talent de compagnon : Chat de gouttière/);
  assert.match(reminders, /Vagabond \(Chat\) : talent à appliquer à la main/);
});

test('B11 : un talent déjà connu donne un rappel +1 DR au lieu d’un doublon', async () => {
  const store = await table();
  await store.updateParticipant('hero', { talents: [{ id: 'talent-alley-cat', status: 'resolved', rank: 1 }] });
  await store.createFamiliar('hero', 'cat', { system: 'animal', kind: 'power', species: 'cat', resource: 'fate' });
  await store.setFamiliarRange('hero', get(store, 'hero').extensions.v5.familiarLinks[0].id, true);
  const reminders = store.getParticipantReminders('hero').map(item => item.text).join('\n');
  assert.match(reminders, /Chat de gouttière déjà connu : \+1 DR/);
});

test('B11 : soin et États refusés à un homoncule sauf source magique ; l’animal et les autres ne sont pas touchés', async () => {
  const store = await table();
  await store.createFamiliar('hero', 'imp', { system: 'homunculus', kind: 'power', wind: 'aqshy', resource: 'fate' });
  await store.updateParticipant('imp', { hp: 3 });
  const history = store.getHistory().past.length;
  const refused = await store.healWounds('imp', 2);
  assert.equal(refused.ok, false);
  assert.match(refused.message, /ne guérit que par guérison naturelle ou par la magie/);
  assert.equal(get(store, 'imp').hp, 3);
  const healed = await store.healWounds('imp', 2, { source: { kind: 'spell' } });
  assert.equal(healed.ok, true);
  assert.equal(get(store, 'imp').hp, 5);
  const poison = await store.acquireConditions('imp', ['Empoisonné']);
  assert.equal(poison.ok, false);
  assert.match(poison.message, /Empoisonné refusé : un homoncule ne le subit que d’une source magique/);
  assert.equal(get(store, 'imp').states.length, 0);
  const magical = await store.acquireConditions('imp', ['Empoisonné'], { magical: true });
  assert.equal(magical.status, 'applied');
  assert.equal(get(store, 'imp').states.length, 1);
  // Un État non restreint passe, et un participant sans lien est soigné normalement.
  assert.equal((await store.acquireConditions('imp', ['Aveugle'])).status, 'applied');
  await store.updateParticipant('foe', { hp: 4 });
  assert.equal((await store.healWounds('foe', 3)).status, 'applied');
  assert.ok(store.getHistory().past.length > history);
  assert.match(store.getParticipantReminders('imp').map(item => item.text).join('\n'), /Encombrement doublé/);
});

test('B11 : mort de l’animal depuis le bloc de la carte, Calme réussi ou raté, deux d10 saisis ; Annuler rend les Blessures', async () => {
  const store = await table();
  await store.createFamiliar('hero', 'cat', { system: 'animal', kind: 'power', species: 'cat', resource: 'fate' });
  const made = [];
  const values = { '.familiar-death-d1': '4', '.familiar-death-d2': '7' };
  const createElement = tag => { const el = { tag, children: [], dataset: {}, checked: true, appendChild(child) { this.children.push(child); }, querySelector(selector) { return selector in values ? { value: values[selector] } : selector === '.familiar-calm-failed' ? { checked: true } : { value: '' }; } }; made.push(el); return el; };
  const block = buildFamiliarBlock(createElement, get(store, 'hero'), store.listParticipants());
  const death = made.find(el => el.className === 'tiny btn-familiar-death');
  assert.ok(death && made.some(el => el.className === 'tiny btn-familiar-range'));
  assert.equal(death.dataset.familiarId, 'cat');
  const inputs = readFamiliarDeathInputs(block);
  assert.deepEqual(inputs, { calmFailed: true, rolls: [4, 7] });
  const missing = await store.resolveFamiliarDeath('hero', 'cat', { calmFailed: true, rolls: [4, null] });
  assert.equal(missing.ok, false);
  assert.match(missing.message, /deux résultats de d10/);
  assert.equal(get(store, 'hero').hp, 20);
  const done = await store.resolveFamiliarDeath('hero', death.dataset.familiarId, inputs);
  assert.equal(done.ok, true);
  assert.equal(get(store, 'hero').hp, 9);
  assert.match(store.getLog()[0].text, /Mort du familier.*11 Blessure/);
  await store.undo();
  assert.equal(get(store, 'hero').hp, 20);
  const success = await store.resolveFamiliarDeath('hero', 'cat', { calmFailed: false });
  assert.equal(success.damage, 0);
  assert.equal(get(store, 'hero').hp, 20);
  assert.equal((await store.resolveFamiliarDeath('hero', 'foe', { calmFailed: false })).ok, false);
});
