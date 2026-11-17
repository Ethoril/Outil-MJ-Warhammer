import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const lire = (chemin) => JSON.parse(readFileSync(resolve(chemin), 'utf8'));
const { contracts: tousContrats } = lire('js/data/v5-divine-contracts.json');
const table = lire('tests/fixtures/miracles-narratifs-familles.json');

const compter = (valeurs) => valeurs.reduce((acc, f) => {
  acc[f] = (acc[f] || 0) + 1;
  return acc;
}, {});

const manuels = tousContrats.filter((c) => c.status === 'manual');
const assistes = tousContrats.filter((c) => c.status === 'assisted');
const clausesManuelles = assistes.flatMap((c) => c.clauses
  .filter((cl) => cl.mode === 'manual')
  .map((cl) => `${c.id}#${cl.id}`));

// Verrou d'inventaire des miracles narratifs (CA2) : tout écart se dit en français.
describe('Inventaire des miracles narratifs : prières en rappel', () => {
  test('57 contrats manual : 48 miracles et 9 bénédictions', () => {
    assert.equal(manuels.length, 57, `Nombre de contrats « manual » : ${manuels.length} au lieu de 57`);
    assert.equal(manuels.filter((c) => c.type === 'miracle').length, 48, 'Il devrait y avoir 48 miracles en rappel');
    assert.equal(manuels.filter((c) => c.type === 'blessing').length, 9, 'Il devrait y avoir 9 bénédictions en rappel');
  });

  test('chaque contrat manual est dans la table, avec sa famille', () => {
    for (const c of manuels) {
      assert.ok(table.contracts[c.id], `Contrat « manual » absent de la table des familles : ${c.id}`);
    }
  });

  test('chaque contrat de la table est toujours manual', () => {
    const ids = new Set(manuels.map((c) => c.id));
    for (const id of Object.keys(table.contracts)) {
      assert.ok(ids.has(id), `Contrat de la table qui n'est plus « manual » (ou disparu) : ${id}`);
    }
  });

  test('comptes par famille : F1 9, F2 4, F3 3, F4 4, F5 2, F6 28, F7 7', () => {
    assert.deepEqual(compter(Object.values(table.contracts)), { F1: 9, F2: 4, F3: 3, F4: 4, F5: 2, F6: 28, F7: 7 });
  });
});

describe('Inventaire des miracles narratifs : clauses des miracles assistés', () => {
  // L10 : 21 clauses requalifiées en engine (88 → 67 ; 50 → 42 contrats portant encore une clause manual).
  // L1c : seule Rage de Rhya est branchée (force-test) : 67 → 66 clauses manual ; Grâce de Ranald et A Deal's a Deal restent en rappel.
  // L2 : Muscles givrés passe assisted (69 → 68 manual, 60 → 61 assisted) ; missile, unarmed-damaging, terror-and-skills requalifiées,
  // plus deux rappels F6 (climate, intimidation) : 66 → 65 clauses manual, 42 → 41 contrats portant encore une clause manual.
  // L3 : Embobiner et Baume passent assisted (68 → 66 manual, 61 → 63 assisted) ; deux clauses F2 requalifiées (terror-test,
  // endurance-test ; athletics, prone-each-round et free-frenzy restent manual, figées par des tests existants, CA7), quatre rappels F6
  // neufs (next-round, immune-types, remove-psychology, sleep) : 65 → 67 clauses manual, 41 contrats portant encore une clause manual.
  // L3b (décision du MJ, ces prières servent en combat) : athletics (Mer déchaînée), prone-each-round (Vent sauvage), free-frenzy
  // (Fureur d'Ulric) branchées en Tests imposés, remove-psychology (Baume) en drapeau : 67 → 63 clauses manual, 41 → 39 contrats
  // portant encore une clause manual (Mer déchaînée et Fureur d'Ulric n'en ont plus).
  // L4 : Paix de Taal et Seuil du Portail passent assisted (66 → 64 manual, 63 → 65 assisted) ; no-ranged (Vent sauvage), calm (Paix de
  // Taal) et undead-cool (Seuil du Portail) requalifiées ; cinq rappels F6 neufs (chaos-immune, broken-by-attack, line-length,
  // construct-undead-blocked, expiry) : 63 → 67 clauses manual, 39 → 41 contrats portant encore une clause manual.
  // L6 : Revirement de fortune (borrow-fortune, contest), Forcer la main du hasard (base-bonus, push-your-luck, bust) et Vaincre les impies
  // (hatred-kill) branchés (type miracle-counter) : Revirement et Forcer la main passent assisted (64 → 62 manual, 65 → 67 assisted) ;
  // quatre rappels F6 neufs sur Revirement (backfire, restore, after-test, profit-sin), hatred-kill retirée : 67 → 70 clauses manual,
  // Vaincre les impies n'en a plus : 41 contrats portant encore une clause manual (Revirement s'ajoute).
  // L5 : Lumière de stase (special-state stasis) et Apaisez les vents (divine-zone suppressMagic) passent assisted (62 → 60 manual,
  // 67 → 69 assisted) ; time-paused, dispel et auto-fail branchées ; trois rappels F6 (stasis, magic-items, second-sight) : 70 → 73
  // clauses manual, 41 → 43 contrats portant encore une clause manual.
  // L7 : Martyr (damage-transfer) et Retour à l'envoyeur (wound-echo) passent assisted (60 → 58 manual, 69 → 71 assisted) ; damage-transfer,
  // toughness-add, weaker-stronger et echo-wounds branchées ; deux rappels F6 (other-damage, echo-optional) : 73 → 75 clauses manual,
  // 43 → 45 contrats portant encore une clause manual ; puis redirect-stunned branchée (Sonné sur le prêtre) : 74 clauses, 44 contrats.
  // L11 : Vindicte vengeresse passe assisted (58 → 57 manual, 71 → 72 assisted) ; flee-exemption, broken-from-fleeing (En bon ordre),
  // momentum-loss (Froid de la gelée blanche), remove-bleeding (Morsure de l'hiver), ignore-ap et unconscious-duration (Épée de justice)
  // branchées ; trois rappels F6 neufs sur Vindicte (charge-and-attack, unrepentant, no-frenzy-bonus) : 74 → 71 clauses manual,
  // 44 → 43 contrats portant encore une clause manual (En bon ordre et Froid de la gelée blanche n'en ont plus, Vindicte s'ajoute).
  test('72 contrats assisted, tous des miracles, 43 avec une clause manual', () => {
    assert.equal(assistes.length, 72, `Nombre de contrats « assisted » : ${assistes.length} au lieu de 72`);
    assert.ok(assistes.every((c) => c.type === 'miracle'), 'Un contrat « assisted » n\'est pas un miracle');
    const avec = assistes.filter((c) => c.clauses.some((cl) => cl.mode === 'manual'));
    assert.equal(avec.length, 43, `Contrats assistés avec clause manuelle : ${avec.length} au lieu de 43`);
  });

  test('71 clauses manual, chacune dans la table', () => {
    assert.equal(clausesManuelles.length, 71, `Clauses « manual » des assistés : ${clausesManuelles.length} au lieu de 71`);
    for (const cle of clausesManuelles) {
      assert.ok(table.clauses[cle], `Clause « manual » absente de la table des familles : ${cle}`);
    }
  });

  test('chaque clause de la table est toujours manual', () => {
    const cles = new Set(clausesManuelles);
    for (const cle of Object.keys(table.clauses)) {
      assert.ok(cles.has(cle), `Clause de la table qui n'est plus « manual » (ou disparue) : ${cle}`);
    }
  });

  test('comptes par famille : F1 1, F4 1, F6 68, F8 1 (plus aucune clause F2, F3 ni F5)', () => {
    assert.deepEqual(compter(Object.values(table.clauses)), { F1: 1, F4: 1, F6: 68, F8: 1 });
  });
});
