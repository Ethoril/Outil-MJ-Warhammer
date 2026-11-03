// Étape 1 de docs/PROPOSITION_MOTEUR_EFFETS_UNIFIE.md : cumul, sur un même Test de Résistance d'un même personnage, d'un talent
// (Résistant, Avantage), d'une prière (Rage de Rhya, +2 Résistance) et de sorts (Dur comme le roc, +2 aux Tests d'Endurance ; Brise-dents, +2 « Endurance » ; Démangeaison, -1 à tous les Tests).
// Règles (Livre de base V5 EN v3, pagination imprimée) :
//  R1 p.130 « Difficulty and Character Modifiers » : les bonus/pénalités de SL de la Difficulté et des modificateurs du personnage (Talents, équipement, Sorts, autres effets) se combinent.
//  R2 p.130 « Advantage and Disadvantage » : Avantage et Désavantage s'annulent un pour un ; chaque source d'Avantage après la première donne +1 SL (Désavantage : -1 SL).
//  R3 p.235 « Duration » : quand des Sorts donnent des bonus ou des pénalités, seuls le meilleur bonus et la pire pénalité s'appliquent à la cible ; ils ne se cumulent pas.
//  R4 p.217 « Prayers » : plusieurs invocations d'une même prière par des personnes différentes ne donnent pas de bonus cumulés.
//  Non couvert par le livre : cumul d'une prière et d'un sort sur la même cible de Test (le code le laisse « à arbitrer », DIV-05).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';
import { getSpellContract } from '../../../js/core/v5-spell-contracts.js';
import { fixtureBlade } from '../../helpers/lot3-declared-answers.js';

const RAGE = 'divine:miracle:rhya:rhya-s-rage'; // contrat réel : test-modifier { Corps à corps: 2, Résistance: 2 }
const skillId = name => getReferenceCatalogue().skills.find(row => row.nom === name).id;
const memory = () => { let saved = null; return { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }; };
const hero = (pid, extra = {}) => ({ id: pid, name: pid, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 30, maxHp: 30, fortune: 2,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Rhya' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Rhya' },
    { id: 'talent-resistant', name: 'talent-resistant', status: 'resolved', rank: 1, specialization: 'poison' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], states: [], actions: [fixtureBlade], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 }, hasMomentum: true } }, ...extra });
async function fixture() {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['hero', 'other'], participants: [hero('hero'), hero('other', { initiative: 30 })] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const person = (store, pid) => store.listParticipants().find(row => row.id === pid);
const mods = store => person(store, 'hero').extensions.v5.testModifiers ?? {};
const prayer = async store => {
  const preview = store.previewDivineExecution(RAGE, { actorId: 'hero', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'hero' } });
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(RAGE, { preview });
  assert.equal(result.ready, true, result.error);
};
// Couche de sort construite depuis le contrat réel et posée par la commande réelle du store (le lancement complet exige des faits propres au domaine).
const spell = (store, name, layerId, casterId = 'hero') => {
  const contract = getSpellContract(name);
  return store.applySpellEffects('hero', { id: layerId, spellId: contract.id, spellName: contract.name, casterId, testModifiers: structuredClone(contract.effects.testModifiers), duration: '10 Rounds' });
};
// Test de Résistance (score 50, jet 61 : -1 SL de base) ; le talent Résistant (Avantage) est actif contre le poison.
const resist = (store, v5 = {}) => store.previewResolution({ resolutionId: 'r' + Math.random(), actorId: 'hero',
  action: { id: 'resist', type: 'skill', attr: 'E', base: 50, extensions: { fiche: { skillId: skillId('Résistance') } } }, roll: 61,
  v5: { kind: 'test', choice: 'keep', context: { resistingThreat: true, threatId: 'poison' }, ...v5 } });
const dump = store => `modificateurs ${JSON.stringify(mods(store))}`;

test('R2 base : le talent seul = 1 Avantage, aucun modificateur de SL', async () => {
  const store = await fixture();
  const p = resist(store);
  assert.equal(p.test.advantage.net, 1);
  assert.equal(p.sl, -1);
});

test('R1 talent + prière : le +2 de la prière s\'ajoute au SL du Test', async () => {
  const store = await fixture();
  await prayer(store);
  assert.equal(mods(store).Résistance, 2);
  assert.equal(resist(store).sl, 1); // -1 + 2
});

test('R3 deux sorts identiques de deux lanceurs : un seul +2 (meilleur bonus), pas +4', async () => {
  const store = await fixture();
  await spell(store, 'Dur comme le roc', 's1', 'hero');
  await spell(store, 'Dur comme le roc', 's2', 'other');
  const sl = resist(store).sl;
  assert.equal(sl, 1, `Dur comme le roc x2 : attendu -1 + 2, obtenu ${sl} ; ${dump(store)}`);
});

test('R3 meilleur bonus + pire pénalité de sorts différents : +2, -1 et -1 donnent +1 (la pire pénalité seule)', async () => {
  const store = await fixture();
  await spell(store, 'Dur comme le roc', 's1');
  await spell(store, 'Démangeaison', 's2', 'other');
  await spell(store, 'Malédiction de malchance', 's3', 'other');
  const sl = resist(store).sl;
  assert.equal(sl, -1 + 2 - 1, `obtenu ${sl} ; ${dump(store)}`);
});

test('R1 + R3 talent + prière + sort sur le même Test : prière (+2) et sort (+2) sont de sources différentes, donc +4 (aucune règle du livre ne les fusionne)', async () => {
  const store = await fixture();
  await prayer(store);
  await spell(store, 'Dur comme le roc', 's1', 'other');
  const p = resist(store);
  assert.equal(p.test.advantage.net, 1);
  assert.equal(p.sl, -1 + 2 + 2, `obtenu ${p.sl} ; ${dump(store)}`);
});

test('R4 la même prière invoquée deux fois : pas de bonus cumulé', async () => {
  const store = await fixture();
  await prayer(store);
  try { await prayer(store); } catch { /* un refus est conforme */ }
  assert.equal(mods(store).Résistance, 2);
  assert.equal(resist(store).sl, 1);
});

test('R2 deux sources d\'Avantage : la première inverse le jet, la seconde donne +1 SL ; un Désavantage en annule une', async () => {
  const store = await fixture();
  const two = resist(store, { choice: 'reverse', advantageSources: [{ id: 'extra', label: 'Source d\'Avantage supplémentaire' }] });
  assert.equal(two.test.advantage.net, 2);
  assert.equal(two.roll, 16);
  assert.equal(two.sl, 4 + 1, 'jet inversé 16 : SL 4, plus 1 pour la seconde source');
  const cancelled = resist(store, { disadvantageSources: [{ id: 'dis', label: 'Désavantage' }] });
  assert.equal(cancelled.test.advantage.net, 0);
  assert.equal(cancelled.sl, -1);
});

// Contrôle de clé : le contrat de Brise-dents (source anglaise) écrit « Endurance » ; sur une fiche française le Test est « Résistance » (V5 p. 248, déjà reconnu par v5-spell-contracts.js).
test('R1 un sort dont la clé est « Endurance » s\'applique au Test de Résistance', async () => {
  const store = await fixture();
  await spell(store, 'Brise-dents', 's1');
  const sl = resist(store).sl;
  assert.equal(sl, -1 + 2, `obtenu ${sl} ; ${dump(store)}`);
});
