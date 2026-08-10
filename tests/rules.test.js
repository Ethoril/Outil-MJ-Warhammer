import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../js/data/rules.js';

test('RULES — Intégrité des données', () => {
  assert.equal(RULES.length, 5); // 5 blocs principaux
  const ids = RULES.map(r => r.id);
  assert.deepEqual(ids, ['localisation', 'sante', 'magie', 'psychologie', 'corruption']);

  RULES.forEach(rule => {
    assert.ok(rule.id && typeof rule.id === 'string');
    assert.ok(rule.title && typeof rule.title === 'string');
    assert.ok(Array.isArray(rule.sections));
  });
});

test('RULES — Recherche de termes', () => {
  function searchRules(term) {
    const clean = term.toLowerCase();
    return RULES.filter(block => {
      let text = (block.title || '') + ' ' + (block.intro || '') + ' ';
      if (block.sections) {
        block.sections.forEach(sec => {
          text += (sec.h4 || '') + ' ' + (sec.p || '') + ' ' + (sec.example || '') + ' ' + (sec.pAfter || '') + ' ';
          if (sec.ul) text += sec.ul.join(' ') + ' ';
          if (sec.ol) text += sec.ol.join(' ') + ' ';
          if (sec.table) text += sec.table.map(r => r.jet + ' ' + r.loc).join(' ') + ' ';
          if (sec.subSections) {
            sec.subSections.forEach(sub => {
              text += (sub.title || '') + ' ' + (sub.p || '') + ' ';
              if (sub.ul) text += sub.ul.join(' ') + ' ';
            });
          }
        });
      }
      return text.toLowerCase().includes(clean);
    });
  }

  // Chercher 'Brisé' -> remonte Peur & Terreur
  const briseResults = searchRules('brisé').map(r => r.id);
  assert.ok(briseResults.includes('psychologie'));

  // Chercher 'Corruption' -> remonte corruption
  const corruptResults = searchRules('corruption').map(r => r.id);
  assert.ok(corruptResults.includes('corruption'));

  // Terme inconnu -> 0 résultat
  const emptyResults = searchRules('xyzunexistingterm123');
  assert.equal(emptyResults.length, 0);
});
