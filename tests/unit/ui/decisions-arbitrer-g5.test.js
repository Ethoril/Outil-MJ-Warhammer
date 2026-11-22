// G5-c (R2, recette du 22/11) : « Arbitrer » et tout bouton d'ouverture de la case « À décider » mènent à un contrôle visible.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DECISION_KINDS } from '../../../js/ui/combat-decisions.js';
import { decisionRevealTarget, matchingReasonIndex } from '../../../js/ui/workspace/helpers.js';

test('chaque type de décision a une cible à montrer (champ, panneau, raison ou la carte de décision)', () => {
  for (const { kind } of DECISION_KINDS) {
    const target = decisionRevealTarget({ id: `${kind}:x`, kind, participantId: 'x', titre: 'Titre', detail: 'Détail' });
    assert.ok(target && typeof target.selector === 'string' && target.selector, `${kind} sans cible`);
    assert.ok(typeof target.fallback === 'string' && target.fallback, `${kind} sans repli visible`);
  }
});

test('les décisions de la résolution visent la raison correspondante, jamais une autre', () => {
  const entry = { id: 'equipement:a', kind: 'equipement', detail: 'Appendice : saisissez les PA de l’appendice atteint.' };
  assert.equal(decisionRevealTarget(entry).via, 'resolution');
  const reasons = ['Saisissez le jet d’attaque', 'Appendice : saisissez les PA de l’appendice atteint.'];
  assert.equal(matchingReasonIndex(reasons, entry.detail), 1);
  assert.equal(matchingReasonIndex(['Saisissez le jet d’attaque'], entry.detail), -1, 'pas de repli sur la première raison venue');
  assert.equal(matchingReasonIndex(['Complétez la protection'], 'Complétez la protection'), 0);
});

test('une entrée sans type connu se montre elle-même dans la case', () => {
  const target = decisionRevealTarget({ id: 'inconnu:1', kind: 'inconnu' });
  assert.match(target.selector, /data-decision-id/);
});
