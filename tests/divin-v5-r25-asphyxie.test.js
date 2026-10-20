import test from 'node:test';
import assert from 'node:assert/strict';
import { contracts, encounter, cast, subject, level, endTurn } from './helpers/lot3-domain-fixture.js';

// R25 — Ombres Étouffantes : une cible tombée à 0 Blessure dans le nuage meurt après BE Rounds d'étouffement à 0 (compteur
// `suffocationZeroRounds` de v5-magic-turn.js). Défaut : les cibles à 0 Blessure étaient sautées avant le compteur, la mort
// n'arrivait jamais. Critère d'acceptation écrit avant le correctif (doit échouer avant).
const SHADOWS = () => contracts.find(c => c.canonicalName === 'Choking Shadows');
const dead = store => subject(store, 'foe').extensions?.v5?.dead === true;
async function fixture(E = 30) {
  const { store, engine } = await encounter({ foe: { hp: 1, caracs: { CC: 50, CT: 50, F: 40, E, I: 50, Ag: 50, Dex: 50, Int: 60, FM: 60, Soc: 50, M: 4 } } });
  await cast(store, SHADOWS());
  return { store, engine };
}
const rounds = async (engine, count) => { for (let i = 0; i < count * 2; i++) await endTurn(engine); };

test('R25 : à 0 Blessure dans le nuage, la cible (BE 3) meurt après 3 Rounds d’étouffement, pas avant ; Undo la ramène', async () => {
  const { store, engine } = await fixture(30);
  await rounds(engine, 1);
  assert.equal(subject(store, 'foe').hp, 0);
  assert.equal(level(subject(store, 'foe'), 'Inconscient'), 1);
  assert.equal(dead(store), false, 'pas morte en tombant à 0');
  await rounds(engine, 2);
  assert.equal(dead(store), false, 'pas morte après 2 Rounds à 0');
  await rounds(engine, 1);
  assert.equal(dead(store), true, 'morte d’asphyxie au 3e Round à 0');
  await store.undo();
  assert.equal(dead(store), false, 'Undo annule la mort');
});

test('R25 : BE 1, la mort arrive au premier Round passé à 0', async () => {
  const { store, engine } = await fixture(10);
  await rounds(engine, 1);
  assert.equal(dead(store), false);
  await rounds(engine, 1);
  assert.equal(dead(store), true, 'morte au 1er Round à 0');
});
