// Lot 4 · C33 (décision MJ du 02/11 ; G-ARM-3, 5, 7, G-ATT-4, 5) : une arme d'action non reliée à un exemplaire d'inventaire
// ne doit plus bloquer : l'outil doit demander les valeurs manquantes en saisie manuelle.
// CARACTÉRISATION de l'état actuel (ces tests PASSENT aujourd'hui) : chaque assertion fige le blocage existant,
// son code et l'endroit où il est produit. La correction devra les inverser (valeurs demandées en saisie manuelle,
// plus de blocage tant que la saisie n'a pas été refusée).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution, applyResolution } from '../../../js/core/resolution.js';
import { initialV5ReloadState } from '../../../js/core/v5-reloading.js';
import { createStore } from '../../../js/core/store.js';

const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'armurier' ? 'pj' : 'ennemi', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 55, CT: 55, F: 30, E: 30, I: 40, Ag: 30 }, skills: [], states: [], equipment: [], armor: { head: 2, body: 2, arms: 2, legs: 2 },
  extensions: { v5: { hasMomentum: true } }, ...extra });
const q = (id, parameter) => ({ id, ...(parameter ? { parameter } : {}) });
// Action de profil : aucune liaison `extensions.fiche.equipmentId`, donc aucun exemplaire durable.
const shoot = (qualities, { kind = 'ranged', context = {}, roll = 35 } = {}) => {
  const preview = previewResolution({ actor: fighter('armurier'), target: fighter('cible'), round: 1, baseRevision: 0, roll,
    action: { type: 'attack', attr: kind === 'ranged' ? 'CT' : 'CC', base: 55, damage: 6, qualities },
    v5: { kind, context } });
  return preview;
};
const apply = preview => applyResolution(preview, { revision: 0, round: 1, participants: [fighter('armurier'), fighter('cible')] });

describe('C33 blocages actuels d’une arme non reliée', () => {
  test('Recharge : « l’arme doit être reliée à un exemplaire durable » (resolution.js:663)', () => {
    const preview = shoot([q('recharge', '2')]);
    assert.ok(preview.unresolved.some(row => /^Recharge : l’arme doit être reliée à un exemplaire durable de l’inventaire/.test(row)), JSON.stringify(preview.unresolved));
  });

  test('À répétition : même blocage que Recharge (resolution.js:663, reloadQuality ligne 553)', () => {
    const preview = shoot([q('a-repetition', '2')]);
    assert.ok(preview.unresolved.some(row => /^Recharge : l’arme doit être reliée à un exemplaire durable/.test(row)), JSON.stringify(preview.unresolved));
  });

  test('Précise : avertissement mécanique « precise : description-mecanique-v5-requise » (resolution.js:736-738), dégâts non calculés, application manuelle', () => {
    const preview = shoot([q('precise')]);
    assert.deepEqual(preview.mechanicalWarnings, [{ keywordId: 'precise', reason: 'description-mecanique-v5-requise' }]);
    assert.equal(preview.damage, null);
    const applied = apply(preview);
    assert.equal(applied.status, 'manual');
    assert.equal(applied.reason, 'version-effet-non-couverte', 'resolution.js:1688-1690');
  });

  test('Taille sans pièce identifiable : avertissement « taille-aucune-piece-identifiable » (resolution.js:800), application manuelle', () => {
    const preview = shoot([q('taille')], { kind: 'melee' });
    assert.ok(preview.mechanicalWarnings.some(row => row.keywordId === 'taille' && row.reason === 'taille-aucune-piece-identifiable'), JSON.stringify(preview.mechanicalWarnings));
  });

  test('Dispersion sans bande ni cibles : « bande de portée MJ requise » (v5-weapon-qualities.js:207), sans champ de saisie dans l’aperçu', () => {
    const preview = shoot([q('dispersion', '3')]);
    assert.ok(preview.unresolved.includes('Dispersion : bande de portée MJ requise.'), JSON.stringify(preview.unresolved));
    assert.equal(apply(preview).status === 'applied', false);
  });

  test('Explosion sans cibles : « cibles désignées par le MJ requises » (v5-weapon-qualities.js:30)', () => {
    const preview = shoot([q('explosion', '3')]);
    assert.ok(preview.unresolved.includes('Explosion : cibles désignées par le MJ requises.'), JSON.stringify(preview.unresolved));
  });

  test('Rechargement d’un exemplaire d’inventaire sans valeur lisible : chargeur non initialisé (v5-reloading.js:17-21, 36), cause « indices et révision entiers valides requis »', () => {
    // Même forme que les qualités de profil importées { id, name, rating } (json-profile-import.js:199) : seul `parameter` est lu.
    for (const keywords of [[{ id: 'recharge', name: 'Recharge', rating: 2 }], [{ id: 'recharge' }]]) {
      const state = initialV5ReloadState({ id: 'arbalete', kind: 'weapon', keywords, extensions: {} });
      assert.equal(state.ready, false);
      assert.deepEqual(state.unresolved, ['Rechargement : indices et révision entiers valides requis.']);
    }
    assert.equal(initialV5ReloadState({ id: 'arbalete', kind: 'weapon', keywords: [{ id: 'recharge', parameter: '2' }], extensions: {} }).ready, true, 'contrôle : avec parameter la valeur est lue');
  });

  test('Rechargement via le Store : « Valeurs À répétition/Recharge non interprétables; arbitrage MJ requis » (api-v5-combat-actions.js:114), origine du « Rechargement non enregistré » (workspace-view.js:2069-2071)', async () => {
    let saved = null;
    const persistence = { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } };
    const store = createStore({ storage: null, persistence }); await store.ready;
    const arbalete = { id: 'arbalete', kind: 'weapon', name: 'Arbalète (2M)', category: 'Arbalète', damage: '+9', keywords: [{ id: 'recharge', name: 'Recharge', rating: 1 }], extensions: {} };
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [],
      combat: { round: 1, currentActorId: 'armurier', order: ['armurier'], participants: [fighter('armurier', { equipment: [arbalete] })] } });
    const plan = store.previewV5WeaponReload({ actorId: 'armurier', equipmentId: 'arbalete', operation: 'begin' });
    assert.equal(plan.ready, false);
    assert.equal(plan.error, 'Valeurs À répétition/Recharge non interprétables; arbitrage MJ requis.');
    const blocked = await store.applyV5WeaponReload(plan);
    assert.equal(blocked.status, 'blocked');
    assert.equal(blocked.reason, 'Recalculer le rechargement avant application.');
  });
});
