import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildCombatTest } from '../../../js/core/v5-combat-rules.js';
import { sequelaEffectRows } from '../../../js/core/v5-sequela-effects.js';
import { creaturePrayerBase } from '../../../js/core/creature-magic-traits.js';
import { previewDivineExecution } from '../../../js/core/v5-divine-engine.js';
import registry from '../../../js/data/v5-divine-contracts.json' with { type: 'json' };
import { planMountedFall } from '../../../js/core/v5-mounted-combat.js';
import { planNaturalAttack } from '../../../js/core/creature-combat.js';
import { bondCellsOf, rangeCellsOf, tokenStateOf, tokenStatesOf } from '../../../js/core/map-link-state.js';
import { abilityDisposition, creatureAbilityReminders } from '../../../js/core/creature-abilities.js';
import { CREATURE_ABILITIES } from '../../../js/data/creature-abilities.js';

const modifiersOf = built => built.test.options[0].result.details.modifiers;
const slOf = built => built.test.options[0].result.sl;

describe('Insensible à la douleur (CA18)', () => {
  const TORN = { id: 'sq-torn', type: 'loc-dr', loc: 'arm:left', amount: -2, label: 'Déchirure musculaire (bras gauche)' };
  const FINGERS = { id: 'sq-fing', type: 'loc-dr', loc: 'arm:right', amount: -1, amputation: true, label: '1 doigt perdu (main droite)' };
  const actor = (traits, extra = {}) => ({ id: 'a', hp: 12, states: [], talents: [], traits, extensions: { v5: { sequelaEffects: { rows: [TORN, FINGERS] } } }, ...extra });
  const run = (who, context = {}) => buildCombatTest({ actor: who, target: { id: 'b', hp: 12, states: [], talents: [] }, roll: 47,
    action: { type: 'test', label: 'Athlétisme', base: 50 },
    v5: { kind: 'test', context: { 'sequelaUses:arm:left': true, 'sequelaUses:arm:right': true, ...context } } });

  test('sans le Trait : critique précisé et séquelles comptent', () => {
    const built = run(actor([]), { magicCriticalPenalty: -3 });
    assert.ok(modifiersOf(built).some(row => row.id === 'critical-wounds' && row.amount === -3));
    assert.ok(modifiersOf(built).some(row => row.id === 'sequela:sq-torn' && row.amount === -2));
  });

  test('avec le Trait : pénalités de critique ignorées, celle d\'une amputation conservée', () => {
    const built = run(actor(['Painless']), { magicCriticalPenalty: -3 });
    const rows = modifiersOf(built);
    assert.ok(!rows.some(row => row.id === 'critical-wounds' && row.amount !== 0));
    assert.ok(!rows.some(row => row.id === 'sequela:sq-torn' && row.amount !== 0), 'déchirure non due à une amputation : ignorée');
    assert.ok(rows.some(row => row.id === 'sequela:sq-fing' && row.amount === -1), 'amputation : conservée');
  });

  test('le nom français et hors Test étendu : même effet', () => {
    const built = run(actor(['Insensible à la douleur']), { magicCriticalPenalty: -3, extendedTest: false });
    assert.ok(!modifiersOf(built).some(row => row.id === 'critical-wounds' && row.amount !== 0));
  });

  test('un Trait temporaire (Contemplation) n\'ignore rien : la règle du talent reste la sienne', () => {
    const borrowed = actor(['Insensible à la douleur'], { extensions: { v5: { temporaryTraits: ['Insensible à la douleur'], sequelaEffects: { rows: [TORN] } } } });
    assert.ok(modifiersOf(run(borrowed, { magicCriticalPenalty: -3 })).some(row => row.id === 'critical-wounds' && row.amount === -3));
  });

  test('la pénalité d\'un État reste appliquée', () => {
    const stunned = [{ key: 'sonne', name: 'Sonné', level: 1 }];
    const withTrait = run(actor(['Painless'], { states: stunned }), {});
    const without = run(actor([], { states: stunned }), {});
    const stateRow = built => modifiersOf(built).filter(row => /Sonn|condition/i.test(`${row.id} ${row.label}`));
    assert.ok(stateRow(withTrait).length > 0, 'la pénalité d\'État est dans le calcul');
    assert.deepEqual(stateRow(withTrait), stateRow(without));
  });

  test('l\'étiquette d\'amputation est posée par les lignes de séquelles', () => {
    const state = { calendar: { currentDay: 0 }, sequelae: [
      { id: 's1', participantId: 'p', kind: 'loss', status: 'permanent', part: 'finger', side: 'left', count: 2 },
      { id: 's2', participantId: 'p', kind: 'torn-muscle', status: 'healing', severity: 'minor', part: 'arm', side: 'left', endDay: 5 }] };
    const rows = sequelaEffectRows(state, 'p');
    assert.ok(rows.filter(row => row.sourceId === 's1').every(row => row.amputation === true));
    assert.ok(rows.filter(row => row.sourceId === 's2').length > 0 && rows.filter(row => row.sourceId === 's2').every(row => row.amputation !== true));
  });
});

describe('Béni et Miracles (CA17)', () => {
  test('base de Prière = Sociabilité + 10 pour un porteur sans compétence Prière', () => {
    assert.equal(creaturePrayerBase({ traits: ['Blessed (Sigmar)'], caracs: { Soc: 35 } }), 45);
    assert.equal(creaturePrayerBase({ traits: ['Miracles (Sigmar)'], caracs: { Soc: 20 } }), 30);
  });
  test('rien sans le Trait, ni sans Sociabilité, ni avec la compétence de la fiche', () => {
    assert.equal(creaturePrayerBase({ traits: [], caracs: { Soc: 35 } }), null);
    assert.equal(creaturePrayerBase({ traits: ['Blessed (Sigmar)'], caracs: {} }), null);
    assert.equal(creaturePrayerBase({ traits: ['Blessed (Sigmar)'], caracs: { Soc: 35 }, skills: [{ name: 'Prière', status: 'resolved', total: 60 }] }), null);
  });
  test('le moteur de prières n\'exige plus la compétence Prière pour un porteur', () => {
    const contract = registry.contracts.find(row => row.id === 'divine:blessing:myrmidia:battle');
    const talents = [{ id: contract.requiredTalent.id, status: 'resolved', rank: 1, specialization: contract.requiredTalent.specialization }];
    const base = { id: 'a', kind: 'PNJ', talents, prayers: [], skills: [], caracs: { Soc: 35 }, states: [], extensions: { v5: { divine: { sin: 0 } } } };
    const needs = who => (previewDivineExecution(who, contract, [], { canSpeak: true, sourceFingerprint: registry.sourceFingerprint }).needsInput || []).map(row => row.path ?? row.field ?? row.id ?? JSON.stringify(row));
    assert.ok(needs(base).some(path => /skills\.Pray/.test(path)), 'sans le Trait : compétence demandée');
    assert.ok(!needs({ ...base, traits: ['Blessed (Myrmidia)'] }).some(path => /skills\.Pray/.test(path)), 'avec le Trait : base Soc + 10');
  });
});

describe('Dressé et monture Craintif (CA20)', () => {
  const skittish = { name: 'Skittish' };
  const trained = detail => ({ name: 'Trained', param: detail });
  const ride = (cause, traits) => planMountedFall({ event: 'mount-surprised', mountTraits: traits, ...(cause ? { cause } : {}) }).requiredTest;
  test('sans cause : Test de Chevaucher comme avant', () => {
    assert.equal(ride(undefined, [skittish, trained('War')]).modifier, 4);
    assert.equal(ride(undefined, [skittish]).modifier, 4);
  });
  test('bruit fort et Dressé (Guerre) : aucun Test ; magie et Dressé (Magie) : idem', () => {
    assert.equal(ride('loud-noise', [skittish, trained('War')]), null);
    assert.equal(ride('magic', [skittish, trained('Magic')]), null);
    assert.equal(planMountedFall({ event: 'mount-entangled', mountTraits: [skittish, trained('Guerre')], cause: 'loud-noise' }).requiredTest, null);
  });
  test('autre combinaison : Test comme aujourd\'hui', () => {
    assert.equal(ride('magic', [skittish, trained('War')]).modifier, 4);
    assert.equal(ride('loud-noise', [skittish, trained('Magic')]).modifier, 4);
    assert.equal(ride('loud-noise', [skittish]).modifier, 4);
    assert.equal(ride('loud-noise', [trained('War')]), null, 'sans Craintif, aucun Test dans tous les cas');
  });
});

describe('Se cabrer (CA21)', () => {
  const horse = { id: 'h', name: 'H', traits: [], caracs: { F: 50 } };
  const rear = options => planNaturalAttack(horse, 'stomp', { via: 'rear', actorSize: 4, targetSize: 3, ...options });
  test('mêmes dégâts que le Piétinement, coût en déplacement, pas d\'Élan', () => {
    const stomp = planNaturalAttack({ ...horse, traits: ['Stomp'] }, 'stomp', { actorSize: 4, targetSize: 3 });
    const plan = rear();
    assert.equal(plan.available, true, JSON.stringify(plan.unresolved));
    assert.equal(plan.damageFormula, stomp.damageFormula);
    assert.ok(stomp.costs.some(cost => cost.resource === 'momentum'));
    assert.ok(!plan.costs.some(cost => cost.resource === 'momentum'));
    assert.deepEqual(plan.costs.map(cost => cost.resource), ['movement']);
  });
  test('refusé contre une cible non plus petite, ou de Taille inconnue', () => {
    assert.equal(rear({ targetSize: 4 }).available, false);
    assert.match(rear({ targetSize: 5 }).unresolved.join(' '), /plus petite/);
    assert.equal(rear({ targetSize: undefined }).available, false);
  });
  test('le Piétinement ordinaire garde son coût en Élan', () => {
    assert.deepEqual(planNaturalAttack({ ...horse, traits: ['Stomp'] }, 'stomp', { actorSize: 4, targetSize: 3 }).costs, [{ resource: 'momentum', amount: 1 }]);
  });
});

describe('Bond (CA19)', () => {
  const bounder = (extra = {}) => ({ id: 'b', name: 'B', kind: 'PNJ', camp: 'ennemi', hp: 10, maxHp: 10, caracs: { M: 4 }, traits: ['Bounce'], states: [], extensions: { v5: {} }, ...extra });
  test('bondCells = 2 × Course pour un porteur ; speedCells et runCells inchangés', () => {
    assert.equal(bondCellsOf(bounder()), 16);
    assert.deepEqual(rangeCellsOf(bounder()), { speedCells: 4, runCells: 8 });
  });
  test('la Course effective compte (Sonné) ; Enchevêtré = 0', () => {
    assert.equal(bondCellsOf(bounder({ states: [{ name: 'Sonné', level: 1 }] })), 8);
    assert.equal(bondCellsOf(bounder({ states: [{ name: 'Enchevêtré', level: 1 }] })), 0);
  });
  test('aucun Bond, aucune valeur : null', () => {
    assert.equal(bondCellsOf(bounder({ traits: [] })), null);
    assert.equal(bondCellsOf(bounder({ caracs: {} })), null);
  });
  test('tokenStateOf ajoute bondCells seulement pour un porteur de Bond', () => {
    assert.equal(tokenStateOf(bounder()).bondCells, 16);
    assert.ok(!('bondCells' in tokenStateOf(bounder({ traits: [] }))));
  });
  test('un cavalier monté reçoit le Bond de sa monture, pas le sien', () => {
    const mount = bounder({ id: 'm' });
    const rider = bounder({ id: 'r', traits: ['Bounce'], extensions: { v5: { mounted: true, mountId: 'm' } } });
    assert.equal(tokenStatesOf([rider, mount])['p:r'].bondCells, 16);
    const plainMount = bounder({ id: 'm', traits: [] });
    assert.ok(!('bondCells' in tokenStatesOf([rider, plainMount])['p:r']));
  });
});

describe('Disruption et Creature Weapons (CA23)', () => {
  for (const id of ['E0-T-147', 'E0-T-288']) {
    test(`${id} est un rappel motivé, visible sur la fiche`, () => {
      const entry = abilityDisposition(id);
      assert.equal(entry.status, 'reminder');
      assert.ok(entry.motive.length > 20);
      assert.ok(!entry.by);
      const lines = creatureAbilityReminders({ extensions: { v5: { bestiary: { abilityRefs: [id] } } } });
      assert.equal(lines.length, 1);
      assert.match(lines[0], /^Rappel/);
    });
  }
  test('le reste du périmètre ne bouge pas', () => {
    assert.equal(CREATURE_ABILITIES.length, 138);
    assert.equal(abilityDisposition('E0-T-287').by, 'T1 Bouclier');
  });
});
