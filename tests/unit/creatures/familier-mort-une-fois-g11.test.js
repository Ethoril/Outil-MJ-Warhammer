// Passe G, lot G11 (recette du 24/11, cas 22 de fonctions-jouer.md, ligne a-autres) : la mort d'un familier animal se
// résout une seule fois. Constat : la décision restait dans « À décider » après l'enregistrement, son bouton ne menait
// pas à la saisie, et une seconde saisie réappliquait les 2d10 (Nora 22 → 15 → 8 PV).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { collectDecisions } from '../../../js/ui/combat-decisions.js';
import { decisionRevealTarget } from '../../../js/ui/workspace/helpers.js';
import { buildFamiliarBlock } from '../../../js/ui/familiar-block.js';

const memoryPersistence = () => { let state = null; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } }; };
const person = (id, extra = {}) => ({ id, name: id, kind: 'Créature', camp: 'neutre', zone: 'active', initiative: 20, hp: 10, maxHp: 10, caracs: { Ag: 40, Soc: 40, FM: 40, Int: 30 }, traits: [], talents: [], states: [], extensions: { v5: {} }, ...extra });
const get = (store, id) => store.getCombat().participants.get(id);
const quietStore = { isSuddenDeathEnabled: () => false };

async function table() {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addParticipant(person('nora', { name: 'Nora', kind: 'PJ', camp: 'pj', hp: 22, maxHp: 22, extensions: { v5: { fate: 3 } } }));
  await store.addParticipant(person('corbeau', { name: 'Corbeau', hp: 4, maxHp: 4 }));
  await store.createFamiliar('nora', 'corbeau', { system: 'animal', kind: 'power', species: 'raven', resource: 'fate' });
  await store.updateParticipant('corbeau', { hp: 0 });
  return store;
}
const decisionsOf = store => {
  const participants = store.listParticipants();
  return collectDecisions({ participants, combat: { round: 1, currentActorId: 'nora' }, actor: participants.find(row => row.id === 'nora'), resolution: null }, quietStore)
    .filter(entry => entry.kind === 'familier');
};
const failed = { calmFailed: true, rolls: [3, 4] };

test('G11 · familier : la mort se résout une fois, une seconde saisie est refusée sans Blessure', async () => {
  const store = await table();
  assert.equal(decisionsOf(store).length, 1, 'précondition : la décision est ouverte');
  const first = await store.resolveFamiliarDeath('nora', 'corbeau', failed);
  assert.equal(first.ok, true);
  assert.equal(get(store, 'nora').hp, 15, '3 + 4 = 7 Blessures directes');
  const second = await store.resolveFamiliarDeath('nora', 'corbeau', failed);
  assert.equal(second.ok, false, 'déjà résolue');
  assert.equal(second.reason, 'already-resolved');
  assert.equal(get(store, 'nora').hp, 15, 'aucune Blessure de plus');
});

test('G11 · familier : la décision disparaît après l’enregistrement et revient après ↶', async () => {
  const store = await table();
  await store.resolveFamiliarDeath('nora', 'corbeau', { calmFailed: false });
  assert.equal(decisionsOf(store).length, 0, 'plus rien à décider');
  await store.undo();
  assert.equal(decisionsOf(store).length, 1, 'annuler rend la décision');
  const again = await store.resolveFamiliarDeath('nora', 'corbeau', failed);
  assert.equal(again.ok, true, 'après ↶, la mort peut de nouveau être résolue');
  assert.equal(get(store, 'nora').hp, 15);
});

test('G11 · familier : le bouton « Mort du familier » de la fiche est désactivé une fois la mort résolue', async () => {
  const store = await table();
  const block = () => {
    const made = [];
    const createElement = tag => { const el = { tag, children: [], dataset: {}, appendChild(child) { this.children.push(child); } }; made.push(el); return el; };
    buildFamiliarBlock(createElement, get(store, 'nora'), store.listParticipants());
    return made.find(el => el.className === 'tiny btn-familiar-death');
  };
  assert.notEqual(block().disabled, true, 'avant : bouton actif');
  await store.resolveFamiliarDeath('nora', 'corbeau', failed);
  const after = block();
  assert.equal(after.disabled, true, 'après : bouton désactivé');
  assert.match(after.title, /déjà/i, 'l’infobulle dit pourquoi');
});

test('G11 · familier : « Mort du familier » dans « À décider » ouvre la Fiche complète, où se trouve la saisie', () => {
  const target = decisionRevealTarget({ id: 'familier:nora:l1', kind: 'familier', participantId: 'nora', titre: 'Nora · Corbeau est mort : Test de Calme' });
  assert.equal(target.via, 'sheet', 'la saisie du Calme et des d10 vit dans la Fiche complète');
  assert.equal(target.selector, '.actor-familiar');
});
