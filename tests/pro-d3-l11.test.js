import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L11.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D3 Imperial Zoo : 62 profils et 6 prétirés', () => {
  assert.equal(book.profiles.length, 68);
  assert.equal(book.profiles.filter(profile => profile.kind === 'pregenerated-character').length, 6);
  assert.equal(book.edition, 'V4');
  assert.ok(book.profiles.every(profile => profile.nameFr), 'chaque profil a un nom français (livre FR ou proposition)');
});

test('D3 : valeurs imprimées de l’Arachnarok, des Dragons des forêts et du Stirpike (pp. 13, 30, 36)', () => {
  const arachnarok = byId('E0-P-004');
  assert.deepEqual(arachnarok.stats, { M: 5, CC: 50, CT: 35, F: 55, E: 45, I: 20, Ag: 40, Dex: 30, Int: 35, FM: 45, Soc: 10 });
  assert.equal(arachnarok.wounds, 136);
  assert.deepEqual(arachnarok.armour, { ap: 3, printedTotal: 7 }, 'Armour 3 (7) : les deux chiffres imprimés');
  assert.deepEqual(arachnarok.attacks.map(a => [a.name, a.damage, a.trait]), [['Bite', 9, 'Bite'], ['Fangs', 9, 'Weapon']]);
  assert.deepEqual(arachnarok.specialRules, ['Vicious Webs']);
  const dragons = byId('E0-P-017');
  assert.deepEqual([dragons.wounds, dragons.size, dragons.armour.ap, dragons.armour.printedTotal], [104, 'enormous', 5, 11]);
  assert.deepEqual(dragons.traits.find(t => t.name === 'Fly'), { name: 'Fly', rating: '50', ref: 'E0-T-023' });
  const stirpike = byId('E0-P-021');
  assert.deepEqual([stirpike.wounds, stirpike.stats.M, stirpike.stats.Dex], [40, 8, null]);
  assert.deepEqual(stirpike.abilities, ['E0-T-112', 'E0-T-113'], 'capacités propres liées à l’inventaire');
});

test('D3 : les attaques glissées dans une liste de Traits gardent leur dégât (Grand loup, Griffon, Peau-loup)', () => {
  assert.deepEqual(byId('E0-P-007').attacks.map(a => [a.name, a.damage]), [['Fangs', 7]]);
  assert.deepEqual(byId('E0-P-011').attacks.map(a => [a.name, a.damage]), [['Hooked Beak', 9], ['Talons', 9]]);
  const skin = byId('E0-P-045');
  assert.deepEqual(skin.attacks.find(a => a.trait === 'Weapon').count, 2, '2x Weapon (Claws) +10');
});

test('D3 : une valeur suivie d’un astérisque est signalée sans changer la valeur imprimée', () => {
  const swarm = byId('E0-P-015');
  assert.deepEqual([swarm.stats.CC, swarm.wounds], [55, 60]);
  assert.deepEqual(swarm.starred, ['CC', 'wounds']);
});

test('D3 : prétirés — caractéristiques actuelles, Blessures, intitulés incohérents signalés sans correction', () => {
  const lyn = byId('E0-P-538');
  assert.deepEqual(lyn.stats, { M: 5, CC: 45, CT: 57, F: 36, E: 35, I: 55, Ag: 40, Dex: 57, Int: 41, FM: 38, Soc: 31 });
  assert.equal(lyn.wounds, 15);
  assert.equal(lyn.identity.titleMismatch, true, 'le formulaire dit « Kirsten Krank », le titre « Lynathryn Nightsong »');
  assert.equal(lyn.identity.formName, 'Kirsten Krank');
  assert.equal(lyn.name, 'Lynathryn Nightsong');
  assert.deepEqual(lyn.keywords, ['elfe-sylvain']);
  assert.equal(byId('E0-P-540').wounds, 19);
  assert.deepEqual(byId('E0-P-536').keywords, ['humain']);
  assert.ok(byId('E0-P-536').skillsPartial, 'compétences : seules les lignes recoupées par la fiche sont gardées');
  for (const record of book.profiles.filter(profile => profile.kind === 'pregenerated-character')) for (const skill of record.skills || []) assert.ok(skill.value >= 1, record.name);
});

test('D3 : mots-clés d’espèce et de nature', () => {
  assert.deepEqual(byId('E0-P-017').keywords, ['dragon']);
  assert.ok(byId('E0-P-054').keywords.includes('monstre-marin'));
  assert.ok(byId('E0-P-059').keywords.includes('fantome'));
  assert.ok(byId('E0-P-023').keywords.includes('skaven'));
});
