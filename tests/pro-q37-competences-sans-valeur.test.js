import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary, buildReserveProfileFromBestiary, unvaluedSkillNames } from '../js/core/bestiary-profiles.js';

const load = id => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${id}.json`, import.meta.url), 'utf8')).profiles;
const library = ['L03', 'L14'].flatMap(load);

// Faux DOM minimal : assez pour lire le texte rendu.
class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.className = ''; }
  set textContent(value) { this.text = String(value); }
  get textContent() { return (this.text ?? '') + this.children.map(child => child.textContent).join(' '); }
  append(...nodes) { this.children.push(...nodes); }
}

test('Q37 lecture : seules les chaînes non vides sont gardées', () => {
  assert.deepEqual(unvaluedSkillNames(['Leadership', '', null, 'Lore (Geology)']), ['Leadership', 'Lore (Geology)']);
  assert.deepEqual(unvaluedSkillNames(undefined), []);
});

test('Q37 participant et Réserve : Gurniksson porte ses compétences sans valeur, hors de skills', () => {
  const participant = buildParticipantFromBestiary('E0-P-161', { library });
  assert.deepEqual(participant.extensions.v5.bestiary.unvaluedSkills, ['Leadership', 'Lore (Geology)', 'Stealth (Underground)']);
  assert.ok(!participant.skills.some(skill => /Leadership/.test(skill.name)));
  const reserve = buildReserveProfileFromBestiary('E0-P-161', { library });
  assert.equal(reserve.extensions.v5.bestiary.unvaluedSkills.length, 3);
});

test('Q37 rendu : fiche de la bibliothèque et fiche du participant affichent les compétences sans valeur', async () => {
  const previous = globalThis.document;
  globalThis.document = { createElement: tag => new Node(tag) };
  try {
    const { renderBestiarySheet } = await import('../js/ui/bestiary-library.js');
    const record = library.find(profile => profile.id === 'E0-P-161');
    const sheet = renderBestiarySheet(record, { terms: new Map() });
    assert.match(sheet.textContent, /Compétences sans valeur imprimée : Leadership, Lore \(Geology\), Stealth \(Underground\)/);
    const { renderFicheDetails } = await import('../js/ui/fiche-details.js');
    const details = renderFicheDetails(buildParticipantFromBestiary('E0-P-161', { library }));
    assert.match(details.textContent, /Compétences sans valeur imprimée \(bestiaire\) \(3\)/);
    assert.match(details.textContent, /Lore \(Geology\)/);
    const other = library.find(profile => profile.kind !== 'template' && !profile.unvaluedSkills && profile.stats);
    const plain = renderFicheDetails(buildParticipantFromBestiary(other.id, { library }));
    assert.match(plain.textContent, /Compétences sans valeur imprimée \(bestiaire\) \(0\)/);
  } finally {
    if (previous === undefined) delete globalThis.document; else globalThis.document = previous;
  }
});

test('Q37 livre L14 : un profil à Language (Elthárin) sans valeur le montre aussi', () => {
  const withUnvalued = load('L14').find(profile => (profile.unvaluedSkills || []).some(name => /Elth/.test(name)));
  assert.ok(withUnvalued);
  const participant = buildParticipantFromBestiary(withUnvalued.id, { library });
  assert.ok(participant.extensions.v5.bestiary.unvaluedSkills.some(name => /Elth/.test(name)));
});
