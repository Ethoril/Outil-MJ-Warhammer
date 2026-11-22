// Refonte de l'interface, lot E4b (CA15a, CA15b) : circonstances lisibles.
// CA15a : plus d'onglet « Circonstances » ; le panneau « autres… » ne propose, pour l'action en cours, que les circonstances qui
// s'appliquent (au plus 12), chacune avec un libellé qui dit son effet.
// CA15b : ce que l'outil sait déjà (plateau, carte, positions, scène, faits du Tour, arme) sort en puces déduites, actives, qu'un
// clic retire ou rend ; aucune case ne le redemande.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_PERTINENT, actionKindOf, circumstanceCatalog, deducedCircumstances, pertinentCircumstances } from '../../../js/ui/resolution-panel/circonstances.js';

const KINDS = { melee: { type: 'attack', kind: 'melee' }, tir: { type: 'attack', kind: 'ranged' }, sort: { type: 'cast' }, priere: { type: 'prayer' }, test: { type: 'skill' } };
// Un libellé « en clair » dit ce que la circonstance change : DR, Avantage, Élan, Chance, dégâts, défense, dispersion…
const EFFECT = /(?:[+−-]\d+ DR|Avantage|Désavantage|Élan|Chance|dégâts|défense|dispersion|Pistolet)/i;
const target = { id: 'b', name: 'Cible' };

test('CA15a · l’onglet « Circonstances » a disparu du panneau du bas', () => {
  const view = readFileSync(new URL('../../../js/ui/workspace-view.js', import.meta.url), 'utf8');
  assert.doesNotMatch(view, /id: 'circumstances', label: 'Circonstances'/);
  assert.doesNotMatch(view, /workspace-side-panel-\$\{CIRC_TAB\}/);
});

test('famille de circonstances de chaque type d’action', () => {
  assert.equal(actionKindOf(KINDS.melee), 'melee');
  assert.equal(actionKindOf(KINDS.tir), 'tir');
  for (const type of ['cast', 'channelling', 'dispel']) assert.equal(actionKindOf({ type }), 'sort');
  assert.equal(actionKindOf(KINDS.priere), 'priere');
  for (const type of ['skill', 'opposition', 'defense']) assert.equal(actionKindOf({ type }), 'test');
});

test('CA15a · au plus 12 circonstances, toutes applicables à l’action, chacune avec son effet en clair', () => {
  for (const [name, facts] of Object.entries(KINDS)) {
    // Faits les plus larges : cible présente, talent Tir précis, rien de déduit.
    const list = pertinentCircumstances({ ...facts, draft: {}, target, accurateShot: true });
    assert.ok(list.length <= MAX_PERTINENT, `${name} : ${list.length} circonstances`);
    const catalog = new Map(circumstanceCatalog().map(row => [row.id, row]));
    for (const row of list) {
      assert.ok(catalog.get(row.id).kinds.includes(name), `${name} : « ${row.label} » ne s’applique pas à cette action`);
      assert.match(row.label, EFFECT, `${name} : « ${row.label} » ne dit pas son effet`);
    }
    assert.equal(new Set(list.map(row => row.id)).size, list.length, `${name} : pas de doublon`);
  }
  assert.ok(pertinentCircumstances({ ...KINDS.melee, draft: {}, target }).some(row => row.id === 'charge'), 'la Charge est proposée en mêlée');
  assert.ok(!pertinentCircumstances({ ...KINDS.tir, draft: {}, target }).some(row => row.id === 'charge'), 'pas de Charge au tir');
  assert.ok(!pertinentCircumstances({ ...KINDS.melee, draft: {}, target }).some(row => row.id === 'couvert'), 'pas de couvert en mêlée');
  assert.ok(!pertinentCircumstances({ ...KINDS.tir, draft: {}, target, accurateShot: false }).some(row => row.id === 'vise'), 'Tir précis seulement avec le talent');
  assert.ok(!pertinentCircumstances({ ...KINDS.melee, draft: {}, target: null }).some(row => row.id === 'sans-defense'), 'sans cible, pas de « cible sans défense »');
});

test('CA15b · ce que l’outil sait déjà sort en puces actives et n’est plus redemandé en case', () => {
  const melee = { ...KINDS.melee, draft: {}, target,
    plateau: { outnumberAttackerIds: ['x'], outnumberDefenderIds: [], surrounded: true },
    scene: { height: 'attacker', difficultTerrain: true, narrowSpace: true } };
  const chips = deducedCircumstances(melee);
  assert.deepEqual(chips.map(row => row.id), ['surnombre', 'encercle', 'hauteur', 'terrain', 'exigu']);
  assert.ok(chips.every(row => row.active && !row.forced), 'déduites = actives');
  assert.equal(chips[0].label, 'Surnombre 2 contre 1 (plateau)');
  const options = pertinentCircumstances(melee).map(row => row.id);
  for (const id of ['plus-haut', 'plus-bas', 'terrain', 'exigu']) assert.ok(!options.includes(id), `« ${id} » est déduit : pas de case`);

  const shot = { ...KINDS.tir, draft: {}, target,
    plateau: { targetEngaged: true, engagedWithShooter: false, engagedTargetIds: ['b', 'c'], shooterEngagedElsewhere: true },
    scene: { cover: true, weather: 'rain-wind', lighting: 'dim' }, turnFacts: { moved: true }, knownThrowing: true };
  assert.deepEqual(deducedCircumstances(shot).map(row => row.id), ['engage-tiers', 'tireur-engage', 'couvert', 'meteo', 'lumiere', 'deplace', 'arme-de-jet']);
  const shotOptions = pertinentCircumstances(shot).map(row => row.id);
  for (const id of ['couvert', 'deplace', 'arme-de-jet', 'pluie', 'penombre']) assert.ok(!shotOptions.includes(id), `« ${id} » est déduit : pas de case`);
  // Rien de déduit : les mêmes faits redeviennent des cases.
  const bare = pertinentCircumstances({ ...KINDS.tir, draft: {}, target }).map(row => row.id);
  for (const id of ['couvert', 'deplace', 'arme-de-jet', 'pluie', 'penombre']) assert.ok(bare.includes(id), `« ${id} » proposé quand rien ne le déduit`);
});

test('CA15b · un clic retire une puce déduite (valeur forcée par le MJ), un second clic rend la déduction', () => {
  const facts = { ...KINDS.melee, target, draft: { v5Context: { weaponReachBand: 'short' } }, scene: { difficultTerrain: true } };
  const [terrain] = deducedCircumstances(facts);
  assert.deepEqual(terrain.toggle, { v5Context: { weaponReachBand: 'short', difficultTerrain: false } });
  const forced = deducedCircumstances({ ...facts, draft: { v5Context: terrain.toggle.v5Context } })[0];
  assert.equal(forced.active, false);
  assert.equal(forced.forced, true);
  assert.deepEqual(forced.toggle, { v5Context: { weaponReachBand: 'short' } }, 'retour à la scène');
  // Engagements : « laisser au récit » puis « revenir au plateau », comme les boutons de la 3.56.0.
  const engaged = { ...KINDS.tir, target, draft: { v5Context: { shotRange: 'short' } }, plateau: { targetEngaged: true, engagedTargetIds: ['b', 'c'] } };
  const chip = deducedCircumstances(engaged)[0];
  assert.deepEqual(chip.toggle.v5Context, { shotRange: 'short', targetEngaged: false, engagedWithShooter: false, engagedTargetIds: [], shooterEngagedElsewhere: false, engagementForced: 'recit' });
  const story = deducedCircumstances({ ...engaged, draft: chip.toggle })[0];
  assert.equal(story.active, false);
  assert.deepEqual(story.toggle, { v5Context: { shotRange: 'short' } });
});

test('les cases écrivent les mêmes champs du brouillon que la 3.56.0', () => {
  const pick = (facts, id) => pertinentCircumstances(facts).find(row => row.id === id);
  const melee = { ...KINDS.melee, target, draft: { v5Context: { penalties: { other: -1 } } } };
  assert.deepEqual(pick(melee, 'charge').set(true), { charging: true });
  assert.deepEqual(pick(melee, 'main-secondaire').set(true), { v5Context: { penalties: { other: -1, offHand: -2 } } });
  assert.deepEqual(pick(melee, 'main-secondaire').set(false), { v5Context: { penalties: { other: -1 } } });
  assert.deepEqual(pick(melee, 'plus-haut').set(true), { v5Context: { penalties: { other: -1 }, height: 'attacker' } });
  const shot = { ...KINDS.tir, target, draft: { v5Context: { penalties: { targetProne: -1 } } } };
  assert.equal(pick(shot, 'couvert').checked, true, 'un ancien « À Terre » se lit comme la case cochée');
  assert.deepEqual(pick(shot, 'couvert').set(true), { v5Context: { penalties: { cover: -1 } } });
  assert.deepEqual(pick(shot, 'deplace').set(true), { v5Context: { penalties: { targetProne: -1 }, movedBeforeRangedAttack: true } });
  assert.equal(pick({ ...KINDS.test, draft: { attackRoll: '45' } }, 'chance-avantage').disabled, true, 'Chance → Avantage avant le jet seulement');
});
