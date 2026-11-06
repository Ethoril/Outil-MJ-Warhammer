// U8 L6 : détail des modificateurs, un effet retenu (source + montant) et un effet écarté (barré, « non cumulé », règle).
import test from 'node:test';
import assert from 'node:assert/strict';
import { modifierLines, renderModifierLines } from '../../../js/ui/resolution-panel/modifiers.js';
import { buildCombatTest } from '../../../js/core/v5-combat-rules.js';

const kept = [{ id: 'conditions', label: 'Plus forte pénalité d’État', amount: -2 }, { id: 'talent:fast-shot', label: 'Tir rapide', amount: 1 }];
const dropped = [{ label: 'État extenue', amount: -1, rule: 'strongest', source: 'État' }];

test('effet retenu : libellé, source et montant ; effet écarté : barré, non cumulé, règle', () => {
  const lines = modifierLines(kept, dropped);
  assert.deepEqual(lines.map(l => l.text), ['Plus forte pénalité d’État (État) : −2 DR', 'Tir rapide (Talent) : +1 DR', 'État extenue (État) : −1 DR']);
  assert.deepEqual(lines.map(l => l.struck), [false, false, true]);
  assert.match(lines[2].note, /^non cumulé · règle : la plus forte pénalité$/);
});

test('rendu DOM : <s> + mention pour l’écarté, texte simple pour le retenu', () => {
  const make = tag => ({ tag, className: '', textContent: '', children: [], append(...c) { this.children.push(...c); }, appendChild(c) { this.children.push(c); } });
  globalThis.document = { createElement: make };
  try {
    const [keptRow, droppedRow] = renderModifierLines([kept[0]], dropped);
    assert.equal(keptRow.textContent, 'Plus forte pénalité d’État (État) : −2 DR');
    assert.equal(keptRow.children.length, 0);
    assert.equal(droppedRow.children[0].tag, 's');
    assert.equal(droppedRow.children[0].textContent, 'État extenue (État) : −1 DR');
    assert.match(droppedRow.children[1].textContent, /non cumulé · règle : la plus forte pénalité/);
  } finally { delete globalThis.document; }
});

test('le calcul de combat expose l’État écarté (Sonné 1 et Exténué 2 : seul le plus fort compte)', () => {
  const actor = { id: 'a', name: 'a', kind: 'PJ', camp: 'pj', zone: 'active', hp: 10, maxHp: 10, caracs: { CC: 40, F: 30, E: 30, I: 30, Ag: 30, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 },
    states: [{ key: 'sonne', name: 'Sonné', level: 1 }, { key: 'extenue', name: 'Exténué', level: 2 }], talents: [], skills: [], equipment: [], traits: [], extensions: { v5: {} } };
  const plan = buildCombatTest({ actor, target: null, roll: 30, action: { base: 40, attr: 'CC', label: 'Test', type: 'test', qualities: [], extensions: { v5: { kind: 'test', scoreIsCurrent: true } } },
    v5: { kind: 'test', context: { involvesMovement: false, requiresSight: false, reliesOnSight: false, usesFellowship: false, runningOrHiding: false } }, v5State: { participants: [actor] } });
  assert.equal(plan.penalty, 2);
  assert.deepEqual(plan.droppedModifiers.map(r => [r.label, r.amount, r.rule, r.source]), [['État Sonné', -1, 'strongest', 'État']]);
});
