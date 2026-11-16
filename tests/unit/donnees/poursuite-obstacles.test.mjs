import test from 'node:test';
import assert from 'node:assert/strict';
import { PURSUIT_OBSTACLES } from '../../../js/data/v5-pursuit-obstacles.js';
import { FICHE_BASIC_SKILLS, normalizeName } from '../../../js/core/fiche-sync.js';

// Table d10 des Obstacles (Livre de base V5 p. 158-159), spec docs/specs/poursuite-v5.
// Natation et Pistage ne sont pas des compétences de base de la fiche : ce sont des compétences avancées, à la saisie du MJ.
const ADVANCED_SKILLS = ['Natation', 'Pistage'];
const knownNames = [...FICHE_BASIC_SKILLS.map(row => row.name), ...ADVANCED_SKILLS].map(normalizeName);

test('dix entrées figées, identifiants uniques', () => {
  assert.equal(PURSUIT_OBSTACLES.length, 10);
  assert.equal(new Set(PURSUIT_OBSTACLES.map(row => row.id)).size, 10);
  assert.ok(Object.isFrozen(PURSUIT_OBSTACLES) && Object.isFrozen(PURSUIT_OBSTACLES[0]) && Object.isFrozen(PURSUIT_OBSTACLES[0].skills));
  for (const row of PURSUIT_OBSTACLES) assert.ok(row.label.trim() && row.skills.length >= 2, row.id);
});

test('chaque compétence porte un préfixe replié qui se raccorde à un nom de fiche connu', () => {
  for (const row of PURSUIT_OBSTACLES) {
    for (const skill of row.skills) {
      assert.equal(skill.prefix, normalizeName(skill.prefix), `${row.id} : préfixe non replié`);
      assert.ok(knownNames.some(name => name.startsWith(skill.prefix)), `${row.id} : ${skill.label} absente des noms de fiche`);
    }
  }
});
