// Lot 4 · C33 (décision MJ du 02/11 ; G-ARM-3, 5, 7, G-ATT-4, 5) : une arme d'action non reliée à un exemplaire d'inventaire
// ne bloque plus : l'outil demande les valeurs manquantes en saisie manuelle (chargeur, pièce frappée, bande de portée, cibles),
// chaque saisie manquante étant une ligne cliquable de « À saisir avant d'appliquer » (data-blocking-field, C17).
// Précise hérité de la V4 se résout avec la mécanique V5 « Pointue » (+1 DR sur une réussite, livre p. 305).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution, applyResolution } from '../../../js/core/resolution.js';
import { initialV5ReloadState } from '../../../js/core/v5-reloading.js';
import { applicationBlockingReasons } from '../../../js/ui/resolution-panel.js';
import { createStore } from '../../../js/core/store.js';

const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'armurier' ? 'pj' : 'ennemi', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 55, CT: 55, F: 30, E: 30, I: 40, Ag: 30 }, skills: [], states: [], equipment: [], armor: { head: 2, body: 2, arms: 2, legs: 2 },
  extensions: { v5: { hasMomentum: true } }, ...extra });
const q = (id, parameter) => ({ id, ...(parameter ? { parameter } : {}) });
// Action de profil : aucune liaison `extensions.fiche.equipmentId`, donc aucun exemplaire durable.
const shoot = (qualities, { kind = 'ranged', context = {}, roll = 35 } = {}) => previewResolution({ actor: fighter('armurier'), target: fighter('cible'), round: 1, baseRevision: 0, roll,
  action: { type: 'attack', attr: kind === 'ranged' ? 'CT' : 'CC', base: 55, damage: 6, qualities },
  v5: { kind, context }, v5State: { participants: [fighter('armurier'), fighter('cible')] } });
const apply = preview => applyResolution(preview, { revision: 0, round: 1, participants: [fighter('armurier'), fighter('cible')] });
const focusOf = preview => applicationBlockingReasons(preview, {}, true).filter(row => row.focus).map(row => row.focus);

describe('C33 arme non reliée : saisie manuelle au lieu du blocage', () => {
  for (const quality of [q('recharge', '2'), q('a-repetition', '2')]) {
    test(`${quality.id} : ne réclame plus d’exemplaire durable ; demande les munitions du chargeur, ligne cliquable`, () => {
      const preview = shoot([quality]);
      assert.deepEqual(preview.unresolved.filter(row => /exemplaire durable/.test(row)), []);
      assert.deepEqual(preview.unresolved, ['Recharge : saisir les munitions restantes dans le chargeur de l’arme (saisie manuelle).']);
      assert.deepEqual(focusOf(preview), ['reload-ammo']);
    });

    test(`${quality.id} : avec un chargeur saisi, le tir se résout et s’applique`, () => {
      const preview = shoot([quality], { context: { manualShotsRemaining: 2 } });
      assert.deepEqual(preview.unresolved, []);
      assert.equal(preview.hit, true);
      assert.ok(preview.damage);
      assert.equal(apply(preview).status, 'applied');
    });

    test(`${quality.id} : chargeur vide saisi, l’arme doit être rechargée`, () => {
      const preview = shoot([quality], { context: { manualShotsRemaining: 0 } });
      assert.deepEqual(preview.unresolved, [`${quality.id === 'recharge' ? 'Recharge' : 'À répétition'} : l’arme doit être rechargée avant un nouveau tir.`]);
    });
  }

  test('Précise (identifiant V4 hérité) : mécanique V5 « Pointue », +1 DR sur la réussite, plus d’avertissement ni d’application manuelle', () => {
    const plain = shoot([]), precise = shoot([q('precise')]);
    assert.deepEqual(precise.mechanicalWarnings, []);
    assert.equal(precise.sl, plain.sl + 1);
    assert.ok(precise.damage);
    assert.equal(apply(precise).status, 'applied');
    const imprecise = shoot([q('precise'), q('imprecise')]);
    assert.equal(imprecise.sl, plain.sl - 1, 'Imprécise l’emporte sur Précise');
  });

  test('Taille sans pièce identifiable : le MJ nomme la pièce frappée (ligne cliquable), 1 PA retiré, plus d’avertissement', () => {
    const blocked = shoot([q('taille')], { kind: 'melee' });
    assert.deepEqual(blocked.mechanicalWarnings, []);
    assert.ok(blocked.unresolved.includes('Taille : saisir la pièce d’armure ou le bouclier frappé (aucune pièce identifiable sur la fiche).'), JSON.stringify(blocked.unresolved));
    assert.ok(focusOf(blocked).includes('hack-piece'));
    const plain = shoot([], { kind: 'melee' });
    const named = shoot([q('taille')], { kind: 'melee', context: { struckPieceManual: 'Cotte de mailles' } });
    assert.equal(named.unresolved.some(row => /Taille/.test(row)), false);
    assert.equal(named.hack.manual, true);
    assert.equal(named.hack.struckItemName, 'Cotte de mailles');
    assert.equal(named.protection.ap, plain.protection.ap - 1);
  });

  test('Dispersion sans bande ni cibles : demandées en saisie, lignes cliquables vers la bande puis les cibles', () => {
    const preview = shoot([q('dispersion', '3')]);
    assert.ok(preview.unresolved.includes('Dispersion : bande de portée MJ requise.'), JSON.stringify(preview.unresolved));
    assert.deepEqual(focusOf(preview), ['spread-band']);
    const banded = shoot([q('dispersion', '3')], { context: { spreadRangeBand: 'short' } });
    assert.ok(banded.unresolved.includes('Dispersion : cibles désignées par le MJ requises.'));
    assert.deepEqual(focusOf(banded), ['spread-targets']);
    const ready = shoot([q('dispersion', '3')], { context: { spreadRangeBand: 'point-blank', spreadTargetIds: ['cible'] } });
    assert.deepEqual(ready.unresolved, []);
  });

  test('Explosion sans cibles : demandées en saisie, ligne cliquable', () => {
    const preview = shoot([q('explosion', '3')]);
    assert.ok(preview.unresolved.includes('Explosion : cibles désignées par le MJ requises.'), JSON.stringify(preview.unresolved));
    assert.deepEqual(focusOf(preview), ['explosion-targets']);
  });

  test('Rechargement d’un exemplaire d’inventaire dont la qualité porte { rating } : chargeur initialisé (C32)', () => {
    const state = initialV5ReloadState({ id: 'arbalete', kind: 'weapon', keywords: [{ id: 'recharge', name: 'Recharge', rating: 2 }], extensions: {} });
    assert.equal(state.ready, true);
    assert.equal(initialV5ReloadState({ id: 'arbalete', kind: 'weapon', keywords: [{ id: 'recharge' }], extensions: {} }).ready, false, 'sans valeur, le chargeur reste non initialisé');
  });

  test('Rechargement via le Store avec une qualité { rating } : valeurs interprétées', async () => {
    let saved = null;
    const persistence = { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } };
    const store = createStore({ storage: null, persistence }); await store.ready;
    const arbalete = { id: 'arbalete', kind: 'weapon', name: 'Arbalète (2M)', category: 'Arbalète', damage: '+9', keywords: [{ id: 'recharge', name: 'Recharge', rating: 1 }], extensions: {} };
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [],
      combat: { round: 1, currentActorId: 'armurier', order: ['armurier'], participants: [fighter('armurier', { equipment: [arbalete] })] } });
    const plan = store.previewV5WeaponReload({ actorId: 'armurier', equipmentId: 'arbalete', operation: 'begin' });
    assert.notEqual(plan.error, 'Valeurs À répétition/Recharge non interprétables; arbitrage MJ requis.', 'la valeur { rating } est lue (le refus restant : arme pas encore tirée)');
  });
});
