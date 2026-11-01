import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { V5_RULES, V5_RULE_SHORTCUTS } from '../js/data/v5-rules.js';
test('every V5 shortcut identifies a matching existing rule', () => {
  for (const [label, id] of Object.entries(V5_RULE_SHORTCUTS)) {
    const rule = V5_RULES.find(item => item.id === id);
    assert.ok(rule, label);
    assert.match(rule.title.toLocaleLowerCase(), new RegExp(label.toLocaleLowerCase()));
  }
});
