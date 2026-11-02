import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupLogByTurn } from '../../../js/ui/journal-turns.js';

// C46 (recette 3.34.0, G-U1-5) : le journal est antichronologique ; les actions d'un Tour doivent
// s'afficher sous l'en-tête « ▶ Tour de X » de leur Tour, pas au-dessus (où elles semblent appartenir au Tour suivant).
const header = name => ({ kind: 'management', text: `▶ Tour de ${name}` });
const action = text => ({ kind: 'resolution', text });

test('C46 les actions d’un Tour suivent l’en-tête de leur Tour (journal du plus récent au plus ancien)', () => {
  // Ordre du Store : le plus récent d'abord.
  const stored = [action('Y2'), action('Y1'), header('Y'), action('X2'), action('X1'), header('X'), action('avant')];
  assert.deepEqual(groupLogByTurn(stored).map(row => row.text), ['▶ Tour de Y', 'Y2', 'Y1', '▶ Tour de X', 'X2', 'X1', 'avant']);
});

test('C46 sans en-tête de Tour, l’ordre est inchangé', () => {
  const stored = [action('b'), action('a')];
  assert.deepEqual(groupLogByTurn(stored), stored);
});
