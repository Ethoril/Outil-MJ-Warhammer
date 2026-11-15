import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brokenEscapeFacts, missingEngagedConfirmations } from '../../../js/ui/v5-broken-escape-panel.js';
import { previewV5BrokenEscape } from '../../../js/core/v5-broken-escape.js';

// Faits envoyés par le panneau « Brisé · fuite obligatoire » : les deux confirmations de la fuite engagée ne partent que cochées.
const draft = extra => ({ before: true, after: true, engagement: 'selected', engaged: ['orc'], mode: 'walk', engagedConfirmed: false, freeAttacksResolved: false, ...extra });

test('fuite engagée : sans cases cochées, aucune confirmation n’est envoyée et le panneau dit quoi cocher', () => {
  const facts = brokenEscapeFacts(draft(), 'flee');
  assert.deepEqual(facts, { visibleToAnyEnemy: true, visibleToAnyEnemyAfter: true, engagedEnemyIds: ['orc'], moveMode: 'walk' });
  assert.equal(missingEngagedConfirmations(draft()).length, 2);
  assert.equal(missingEngagedConfirmations(draft({ engagedConfirmed: true })).length, 1);
});

test('fuite engagée : les deux cases cochées envoient les deux faits que le moteur exige', () => {
  const d = draft({ engagedConfirmed: true, freeAttacksResolved: true });
  const facts = brokenEscapeFacts(d, 'flee');
  assert.equal(facts.engagedEscapeConfirmed, true);
  assert.equal(facts.freeAttacksResolved, true);
  assert.deepEqual(missingEngagedConfirmations(d), []);
  const actor = { id: 'p', caracs: { M: 4 }, states: [{ key: 'brise', level: 1 }], talents: [], extensions: {} };
  const preview = previewV5BrokenEscape({ actor, action: 'flee', facts, turn: { encounterId: 'e', turnId: 't', round: 1 } });
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.engagedEscapeEffects.addedBrokenCount, 1);
});

test('cas non engagé : aucune confirmation, faits inchangés', () => {
  const d = draft({ engagement: 'none', engaged: [], engagedConfirmed: true, freeAttacksResolved: true });
  assert.deepEqual(brokenEscapeFacts(d, 'flee'), { visibleToAnyEnemy: true, visibleToAnyEnemyAfter: true, engagedEnemyIds: [], moveMode: 'walk' });
  assert.deepEqual(missingEngagedConfirmations(d), []);
  assert.deepEqual(brokenEscapeFacts(draft({ engagedConfirmed: true }), 'sprint'), { visibleToAnyEnemy: true, visibleToAnyEnemyAfter: true });
});
