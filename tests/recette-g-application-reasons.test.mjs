import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { applicationBlockingReasons } from '../js/ui/resolution-panel.js';

test('application blocking reasons preserve the existing disable conditions', () => {
  const cases = [
    [{}, {}, true, false],
    [{ unresolved: ['Saisir le Test de Calme'] }, {}, true, true],
    [{ choiceRequired: true }, {}, true, true],
    [{ critical: { details: { pending: true } } }, {}, true, true],
    [{ defenderCritical: { details: { needsAlternative: true } } }, {}, true, true],
    [{ attack: true }, {}, true, true],
    [{ protection: { ap: null } }, {}, true, true],
    [{ mechanicalWarnings: ['Préciser le fait'] }, {}, true, true],
    [{}, { busy: true }, true, true],
    [{}, {}, false, true],
    [{ v5MagicKind: 'cast', ready: false }, {}, true, true],
    [{ v5MagicKind: 'cast', spellPreview: { valid: false } }, {}, true, true]
  ];
  for (const [preview, draft, canApply, blocked] of cases) {
    assert.equal(applicationBlockingReasons(preview, draft, canApply).length > 0, blocked);
  }
  assert.ok(applicationBlockingReasons({ unresolved: ['Saisir le Test de Calme'] }, {}, true).some(reason => reason.text === 'Saisir le Test de Calme'));
});

test('each original blocking condition is equivalent for physical and magic previews', () => {
  const physical = [
    { choiceRequired: true }, { unresolved: ['x'] },
    { critical: { details: { pending: true } } }, { critical: { second: { pending: true } } },
    { defenderCritical: { details: { pending: true } } },
    { critical: { details: { needsAlternative: true } } }, { critical: { second: { needsAlternative: true } } },
    { defenderCritical: { details: { needsAlternative: true } } },
    { critical: { details: { needsLocation: true } } }, { defenderCritical: { details: { needsLocation: true } } },
    { attack: true }, { protection: { ap: null } }, { critical: { second: { protection: { manual: ['x'] } } } },
    { mechanicalWarnings: [{ keywordId: 'foo', reason: 'bar' }] }
  ];
  for (const preview of physical) assert.ok(applicationBlockingReasons(preview, {}, true).length, JSON.stringify(preview));
  assert.ok(applicationBlockingReasons({}, { criticalErrors: { location: 'bad' } }, true).length);
  for (const preview of [
    { v5MagicKind: 'cast', spellPreview: { fingerprintCheck: { valid: false } } },
    { v5MagicKind: 'cast', spellPreview: { valid: false } },
    { v5MagicKind: 'cast', castPreview: { spellSuccess: true }, spellPreview: { ready: false } },
    { v5MagicKind: 'dispel', ready: false }
  ]) assert.ok(applicationBlockingReasons(preview, {}, true).length, JSON.stringify(preview));
  assert.equal(applicationBlockingReasons({ v5MagicKind: 'cast', castPreview: { spellSuccess: false }, spellPreview: { ready: false } }, {}, true).length, 0);
  assert.match(applicationBlockingReasons({ mechanicalWarnings: [{ keywordId: 'foo', reason: 'bar' }] }, {}, true)[0].text, /foo.*bar/);
});
