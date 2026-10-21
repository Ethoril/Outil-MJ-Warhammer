import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { acquireV5Conditions } from '../js/core/v5-effects.js';
import { PSYCHOLOGY_SOURCES, PSYCHOLOGY_SOURCE_IDS, previewPsychologySource } from '../js/core/v5-talent-psychology.js';

const person = (id, extra = {}) => ({
  id, name: id, camp: id.startsWith('e') ? 'ennemi' : 'pj', hp: 20, maxHp: 20,
  caracs: { E: 30, FM: 40 }, states: [], traits: [], extensions: { v5: { hasMomentum: false } }, ...extra
});
const levelOf = (p, key) => (p.states || []).filter((s) => s.key === key).reduce((n, s) => n + (s.level || 1), 0);
const broken = (id, level) => acquireV5Conditions(person(id), [{ name: 'Brisé', level }]).participant;

test('C05 — chaque clause C05 du plan est raccordée au catalogue de sources', () => {
  const plan = readFileSync(new URL('../docs/plans-gpt/PLAN_GPT_PHASE_C.md', import.meta.url), 'utf8');
  const block = plan.match(/### C05[\s\S]*?### C06/)[0];
  const ids = [...new Set(block.match(/C0-L\d+-\d+/g))];
  const missing = ids.filter((id) => !PSYCHOLOGY_SOURCE_IDS.includes(id));
  assert.deepEqual(missing, []);
  for (const entry of PSYCHOLOGY_SOURCES) assert.ok(entry.name && (entry.steps || entry.variants), entry.name);
});

test('C05 — Effrayant/Terrifiant : sorts, indice 1 + floor(surincantation / 3), cible hostile', () => {
  const caster = person('a');
  const t = person('e1');
  const fear = previewPsychologySource('C0-L06-060', { author: caster, targets: [t], overcast: 7 });
  assert.equal(fear.ready, true);
  assert.equal(fear.addedStates[0].rating, 3);
  assert.equal(fear.participants[0].states[0].key, 'fear-of-talent');
  const terror = previewPsychologySource('C0-L06-061', { author: caster, targets: [t], overcast: 2 });
  assert.equal(terror.addedStates[0].key, 'terror-of-talent');
  assert.equal(terror.addedStates[0].rating, 1);
  assert.equal(previewPsychologySource('C0-L06-060', { author: caster, targets: [t], overcast: -1 }).ready, false);
  assert.equal(previewPsychologySource('C0-L06-060', { author: caster, targets: [t] }).addedStates[0].rating, 1);
});

test('C05 — indice non chiffré : saisie MJ (Q13) ; Peur par runes et Sword of Fear', () => {
  const author = person('a');
  const t = person('e1');
  const noRating = previewPsychologySource('C0-L11-019', { author, targets: [t] });
  assert.equal(noRating.addedStates[0].rating, 2);
  const flambeau = previewPsychologySource('C0-L06-054', { author, targets: [broken('a2', 2)] });
  assert.equal(flambeau.ready, false);
  assert.ok(flambeau.needsInput.some((n) => n.field === 'rating'));
  const withRating = previewPsychologySource('C0-L06-054', { author, targets: [broken('a2', 2)], facts: { rating: 1 } });
  assert.equal(levelOf(withRating.participants[0], 'brise'), 0);
  const sword = previewPsychologySource('C0-L19-001', { author, targets: [t] });
  assert.equal(sword.addedStates[0].rating, 2);
  const daunting = previewPsychologySource('C0-L15-004', { author, targets: [t], facts: { runeCount: 3 } });
  assert.equal(daunting.addedStates[0].rating, 3);
});

test('C05 — Laurels of Victory : Peur 2 seulement dès le Round 2', () => {
  const author = person('a');
  const t = person('e1');
  assert.equal(previewPsychologySource('C0-L20-001', { author, targets: [t], round: 1 }).addedStates.length, 0);
  assert.equal(previewPsychologySource('C0-L20-001', { author, targets: [t], round: 2 }).addedStates[0].rating, 2);
});

test('C05 — Poisoned Whispers (Q12) : BFM Rounds et rappel du Test quotidien ; Fellstave (Q14) : Calme sinon Brisé, Intuition au rétablissement', () => {
  const pw = previewPsychologySource('C0-L09-005', { author: person('a'), targets: [person('e1')] });
  assert.equal(pw.grants[0].duration, 'BFM Rounds');
  assert.ok(pw.reminders.some((r) => /quotidien/.test(r)));
  const fs = previewPsychologySource('C0-L02-001', { author: person('a'), targets: [person('e1'), person('e2')], tests: { calm: { e1: { success: false, sl: -1 }, e2: { success: true, sl: 0 } } } });
  assert.equal(fs.ready, true);
  assert.equal(levelOf(fs.participants[0], 'brise'), 1);
  assert.equal(levelOf(fs.participants[1], 'brise'), 0);
  assert.ok(fs.reminders.some((r) => /Intuition \(\+0\).*échec/.test(r)));
  const noTest = previewPsychologySource('C0-L02-001', { author: person('a'), targets: [person('e1')] });
  assert.equal(noTest.ready, false);
});

test('C05 — Howl of the Great Beast : 1 Élan, 3 Assourdi, Calme −1 DR sinon 3 Brisé', () => {
  const author = person('a', { extensions: { v5: { hasMomentum: true } } });
  const targets = [person('e1'), person('e2')];
  const tests = { calm: { e1: { success: false, sl: -2 }, e2: { success: true, sl: 1 } } };
  const r = previewPsychologySource('C0-L17-010', { author, targets, tests });
  assert.equal(r.ready, true);
  assert.equal(r.author.extensions.v5.hasMomentum, false);
  assert.equal(levelOf(r.participants[0], 'assourdi'), 3);
  assert.equal(levelOf(r.participants[0], 'brise'), 3);
  assert.equal(levelOf(r.participants[1], 'assourdi'), 3);
  assert.equal(levelOf(r.participants[1], 'brise'), 0);
  assert.ok(r.modifiers.some((m) => m.amount === -1));
  const noMomentum = previewPsychologySource('C0-L19-002', { author: person('a'), targets, tests });
  assert.equal(noMomentum.ready, false);
});

test('C05 — Breath of Nightmares : Terreur 2 malgré l’immunité à la Psychologie ; Gastromancie, WAAAGH! et Cœur du loup', () => {
  const immune = person('e1', { traits: ['Immunité à la Psychologie'] });
  const r = previewPsychologySource('C0-L11-009', { author: person('a'), targets: [immune] });
  assert.equal(r.addedStates[0].key, 'terror-of-talent');
  const gast = previewPsychologySource('C0-L12-001', { author: person('a'), targets: [broken('a2', 2)] });
  assert.equal(levelOf(gast.participants[0], 'brise'), 2);
  assert.equal(gast.grants[0].duration, 'BFM Rounds');
  const waaagh = previewPsychologySource('C0-L12-006', { author: person('a'), targets: [broken('o1', 3), broken('o2', 1)] });
  assert.equal(waaagh.participants.reduce((n, p) => n + levelOf(p, 'brise'), 0), 0);
  const heart = previewPsychologySource('C0-L18-006', { author: person('a'), targets: [broken('a2', 4)], bfm: 3, round: 1 });
  assert.equal(levelOf(heart.participants[0], 'brise'), 0);
  assert.ok(heart.participants[0].states.some((s) => s.key === 'brise-immunity'));
  assert.equal(previewPsychologySource('C0-L18-006', { author: person('a'), targets: [broken('a2', 4)] }).ready, false);
});

test('C05 — conversions V4 → V5 (Q17) et variantes explicites', () => {
  const fervent = previewPsychologySource('C0-L02-004', { author: person('a'), targets: [broken('a2', 3)] });
  assert.equal(levelOf(fervent.participants[0], 'brise'), 2);
  const claustro = previewPsychologySource('C0-L17-005', { author: person('a'), targets: [person('a2')], tests: { calm: { a2: { success: false, sl: -1 } } } });
  assert.equal(claustro.modifiers[0].amount, 4);
  assert.equal(levelOf(claustro.participants[0], 'brise'), 1);
  const horror = previewPsychologySource('C0-L17-001', { author: person('a'), targets: [person('a2')], tests: { calm: { a2: { success: true, sl: 0 } } } });
  assert.equal(horror.modifiers[0].amount, -2);
  const rune = previewPsychologySource('C0-L15-005', {});
  assert.equal(rune.modifiers[0].amount, 1);
  const noVariant = previewPsychologySource('C0-L01-003', { author: person('a'), targets: [person('e1')] });
  assert.equal(noVariant.ready, false);
  const dolorous = previewPsychologySource('C0-L01-003', { author: person('a'), targets: [person('e1')], variant: 'dolorous' });
  assert.equal(dolorous.addedStates[0].rating, 1);
  assert.equal(previewPsychologySource('INCONNU').ready, false);
});
