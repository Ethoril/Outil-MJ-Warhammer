// Contre-vérification T2 bis (Claude) : armure d'inventaire des dégâts incidents,
// Discrétion par catégorie marquée, Empaleuse des armes de jet et de siège, Bolas « ; »,
// recharge de l'arquebuse à salve, cible absente, créatures en mort subite, report de la main fendue.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { previewResolution, applyResolution } from '../js/core/resolution.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { calculateV5ArmorPenalty, parseV5Inflict, previewV5ImpaleProjectile } from '../js/core/v5-weapon-qualities.js';
import { createCriticalAftermathRecord, previewSuddenDeath } from '../js/core/v5-critical-aftermath.js';
import { getV5CriticalEffect } from '../js/data/v5-crits.js';
import { createGameClock } from '../js/core/v5-game-time.js';

const catalogue = getReferenceCatalogue();
const item = id => structuredClone(catalogue.items.find(row => row.id === id || row.baseId === id));
const byName = name => structuredClone(catalogue.items.find(row => row.name === name));
const memory = () => { let saved; return { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }; };
const mk = (id, equipment = [], extra = {}) => ({ id, name: id, hp: 30, maxHp: 30, zone: 'active', camp: 'x',
  caracs: { CC: 50, CT: 50, F: 40, E: 30, Ag: 40, I: 30 }, armor: {}, states: [], skills: [], talents: [],
  equipment, extensions: { v5: {} }, ...extra });

test('Claude T2 bis — l’allié touché par maladresse garde les PA de plates (Points faibles) et de mailles', () => {
  const hpAfter = armour => {
    const actor = mk('shooter', [], { hp: 12 });
    const ally = mk('ally', armour.map(row => ({ ...row, worn: true })), { hp: 20 });
    const foe = { ...mk('foe'), camp: 'foes' };
    const participants = [actor, ally, foe];
    const preview = previewResolution({ actor, target: foe, action: { type: 'attack', attr: 'CT', base: 10, damage: 'BF+2' }, roll: 99,
      baseRevision: 0, round: 1, v5State: { participants }, attackContext: { ranged: true },
      v5: { kind: 'ranged', context: { fumbleRoll: 10, allyCandidates: ['ally'], fumbleAllySelectionRoll: 50, fumbleAllyUnitsRoll: 3 } } });
    assert.deepEqual(preview.unresolved, []);
    return applyResolution(preview, { revision: 0, round: 1, participants }).state.participants.find(row => row.id === 'ally').hp;
  };
  const bare = hpAfter([]);
  assert.equal(hpAfter([item('armour-armures-mailles-cotte-de-mailles')]), bare + 2);
  assert.equal(hpAfter([item('armour-armures-plates-plastron')]), bare + 2);
});

test('Claude T2 bis — Discrétion : une pénalité par catégorie marquée au catalogue', () => {
  const worn = names => names.map(name => ({ ...byName(name), worn: true }));
  assert.equal(calculateV5ArmorPenalty({ worn: worn(['Cotte de mailles', 'Brassards']) }).stealthDr, -2);
  assert.equal(calculateV5ArmorPenalty({ worn: worn(['Brassards', 'Jambières d’acier']) }).stealthDr, -1);
  assert.equal(calculateV5ArmorPenalty({ worn: [] }).stealthDr, 0);
});

test('Claude T2 bis — Empaleuse : projectile générique pour les armes de jet et de siège du catalogue', () => {
  for (const name of ['Javelot', 'Javelot Blackbriar elfe sylvain', 'Canon Pivotant (avec balles) Nain', 'Baliste navale']) {
    const weapon = byName(name);
    const lodged = previewV5ImpaleProjectile({ qualities: ['empaleuse'], ranged: true, critical: true, participantId: 'b',
      weaponId: weapon.id, weaponName: weapon.name, weaponCategory: weapon.category });
    assert.equal(lodged.ready, true, `${name} : ${JSON.stringify(lodged.unresolved)}`);
  }
});

test('Claude T2 bis — Bolas : « ; » sépare aussi les deux états de l’Inflige', () => {
  assert.equal(parseV5Inflict('Empêtré 35 ; À terre', 40).ready, true);
});

test('Claude T2 bis — l’arquebuse à salve recharge de 1 + DR positifs (décision du MJ)', () => {
  const base = item('weapon-armes-a-distance-arbalete-baliste-faucheuse-reaper-bolt-thrower-druchii');
  const volley = { ...base, id: 'volley', name: 'Arquebuse à salve', damage: '+10', reload: 4, category: 'Poudre Noire',
    keywords: [{ id: 'a-poudre-noire', parameter: '' }, { id: 'salve', parameter: '4' }, { id: 'recharge', parameter: '4' }] };
  const preview = previewResolution({ actor: mk('a', [volley]), target: mk('b'), roll: 10, baseRevision: 0, round: 1,
    action: { type: 'test', attr: 'CT', base: 60, extensions: { fiche: { equipmentId: 'volley' } } },
    v5: { kind: 'test', context: { reloading: true, crewCount: 2, weaponReload: 4 } } });
  const progress = preview.combatFailure.effects.find(row => row.type === 'reload-progress');
  assert.equal(progress.successes, 6, 'réussite à +5 DR');
});

test('Claude T2 bis — une cible qui a quitté la rencontre est refusée sans planter', async () => {
  const store = createStore({ storage: null, persistence: memory() }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'a', order: ['a'], participants: [{ ...mk('a'), kind: 'PJ' }] },
    extensions: { v5: { combatId: 'cv', turnIndex: 1 } }, log: [], diceLines: [] });
  const preview = store.previewResolution({ actorId: 'a', targetId: 'ghost', roll: 40,
    action: { id: 'x', type: 'attack', attr: 'CC', base: 50, damage: 4 },
    defense: { type: 'skill', attr: 'CC', base: 50, roll: 70, label: 'Corps à corps', v5: { kind: 'melee', choice: 'keep' } },
    v5: { kind: 'melee', choice: 'keep', context: {} } });
  assert.equal(preview.ready, false);
  assert.equal(preview.code, 'TARGET_NOT_FOUND');
});

test('Claude T2 bis — mort subite : une créature confirmée figurant est éligible, jamais un PJ', () => {
  const at0 = kind => ({ id: kind, name: kind, kind, hp: 0, talents: [], extensions: { v5: {} } });
  const options = { tableOptionEnabled: true, secondaryNpcConfirmed: true };
  assert.equal(previewSuddenDeath(at0('Créature'), options).status, 'choice-required');
  assert.equal(previewSuddenDeath(at0('PJ'), options).status, 'ineligible');
});

test('Claude T2 bis — main fendue : « Non » à la perte de tous les doigts se reporte au Round suivant', async () => {
  const person = id => ({ ...mk(id), kind: 'PJ', camp: 'pj', hp: 20, maxHp: 20 });
  const effectRoll = Array.from({ length: 200 }, (_, i) => i + 1).find(roll => getV5CriticalEffect('ARM', roll)?.source?.printedName === 'Cleft Hand');
  const source = createCriticalAftermathRecord(person('hero'), { table: 'ARM', effectRoll, resolutionId: 'sh', round: 1 });
  const store = createStore({ storage: null, persistence: memory() }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['hero', 'foe'], participants: [source.participant, person('foe')] },
    log: [], diceLines: [], extensions: { v5: { combatId: 'x', turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  const id = source.record.id;
  const finger = store.previewAmputationShock({ participantId: 'hero', criticalId: id, amputationOccurred: true, difficultyDR: -1, test: { success: true, sl: 0 } });
  await store.applyAmputationShock(finger);
  const pending = store.previewAmputationShock({ participantId: 'hero', criticalId: id });
  // Same part the workspace view now derives when the preview carries no shockPart.
  const part = pending.shockPart || pending.requirements[0]?.part;
  assert.equal(part, 'hand');
  await store.deferAmputationShock('hero', id, part);
  assert.equal(store.previewAmputationShock({ participantId: 'hero', criticalId: id }).status, 'deferred');
});
