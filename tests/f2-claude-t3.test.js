// Contre-vérification T3 (Claude) : monture envoyée au banc par déplacement, espèces écrites
// par les fiches dans la table de manifestation, page des Fixations L23.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { mutationDomainForSpecies } from '../js/core/v5-corruption.js';
import { V5_L23_MUTATION_TABLES } from '../js/data/v5-corruption-mutations-l23.js';

const memory = () => { let saved; return { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }; };
const actor = id => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', size: 'average', hp: 20, maxHp: 20,
  caracs: { CC: 60, F: 40, E: 40, I: 40, Ag: 40, FM: 30 }, skills: [], talents: [], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
const horse = id => ({ ...actor(id), kind: 'Créature', size: 'large', caracs: { F: 50, E: 40, CC: 40, Ag: 30 } });

for (const persisted of [true, false]) {
  test(`Claude T3 — une monture déplacée au banc libère son cavalier (${persisted ? 'avec' : 'sans'} persistance)`, async () => {
    const store = createStore({ storage: null, ...(persisted ? { persistence: memory() } : {}) }); await store.ready;
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'x', turnIndex: 1 } },
      combat: { round: 1, currentActorId: 'rider', order: ['rider', 'horse'], participants: [actor('rider'), horse('horse')] } });
    await store.setMountedState('rider', { mounted: true, mountId: 'horse' });
    await store.moveParticipant('horse', 'bench');
    const rider = store.listParticipants().find(row => row.id === 'rider');
    assert.notEqual(rider.extensions.v5.mounted, true);
    assert.equal(rider.extensions.v5.mountId, undefined);
  });
}

test('Claude T3 — les espèces écrites par les fiches suivent la table de manifestation (L06 p.188)', () => {
  assert.equal(mutationDomainForSpecies({ species: 'halfelin', roll: 5 }).domain, 'physical');
  assert.equal(mutationDomainForSpecies({ species: 'elfe-sylvain', roll: 5 }).domain, 'mental');
  assert.equal(mutationDomainForSpecies({ species: 'haut-elfe', roll: 5 }).domain, 'mental');
  assert.notEqual(mutationDomainForSpecies({ species: 'elfe-sylvain', roll: 5 }).needsGmChoice, true);
});

test('Claude T3 — les Fixations L23 sont page 69 imprimée (PDF 71), comme les Têtes bestiales', () => {
  const fixations = V5_L23_MUTATION_TABLES.find(table => table.id === 'l23-fixations');
  assert.equal(fixations.source.pageImprimee, 69);
  assert.equal(fixations.source.pagePdf, 71);
  for (const entry of fixations.entrees) assert.equal(entry.verification.pagePdf, 71, entry.id);
});
