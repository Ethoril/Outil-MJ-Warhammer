import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary, BESTIARY_FREE_ATTACK_KEY } from '../js/core/bestiary-profiles.js';
import { sanitizeParticipant } from '../js/core/sanitize.js';
import { participantKeywords } from '../js/core/creature-keywords.js';

const library = JSON.parse(readFileSync(new URL('../js/data/bestiary/L06.json', import.meta.url), 'utf8')).profiles;
const byName = name => library.find(profile => profile.name === name && profile.kind === 'profile');
const build = (name, options = {}) => buildParticipantFromBestiary(byName(name).id, { library, ...options });

test('B1 Zombie — valeurs imprimées, aucune recalculée', () => {
  const zombie = build('Zombie', { idFactory: () => 'p1' });
  assert.equal(zombie.id, 'p1');
  assert.equal(zombie.name, 'Zombie');
  assert.equal(zombie.hp, 12);
  assert.equal(zombie.maxHp, 12);
  assert.deepEqual(zombie.caracs, { M: 4, CC: 15, F: 30, E: 30, I: 5, Ag: 10, Dex: 10 });
  assert.equal(zombie.initiative, 5);
  assert.equal(zombie.extensions.v5.bestiary.armour.toughnessBonus, 3);
  assert.deepEqual(zombie.armor, { head: 0, body: 0, arms: 0, legs: 0 });
  assert.equal(zombie.camp, 'neutre');
  assert.equal(zombie.zone, 'bench');
});

test('B1 Zombie — attaques à dégâts fixes imprimés, Morsure gratuite marquée', () => {
  const zombie = build('Zombie');
  assert.deepEqual(zombie.actions.map(a => [a.note, a.base, a.damage]), [['Hand Weapon', 25, 7], ['Bite', 30, 6]]);
  assert.deepEqual(zombie.actions[0].qualities.map(q => q.id), ['magique']);
  const bite = zombie.actions[1];
  assert.equal(bite.extensions.v5[BESTIARY_FREE_ATTACK_KEY], 'momentum');
  assert.equal(zombie.actions[0].extensions.v5?.[BESTIARY_FREE_ATTACK_KEY], undefined);
});

test('B1 Zombie — Traits sous forme de textes, mots-clés conservés et déduits', () => {
  const zombie = build('Zombie');
  assert.ok(zombie.traits.every(t => typeof t === 'string'));
  assert.ok(zombie.traits.includes('Undead'));
  assert.deepEqual(zombie.keywords, ['zombie']);
  assert.ok(participantKeywords(zombie).ids.includes('mort-vivant'));
  assert.equal(zombie.extensions.v5.bestiary.traitRefs.Undead, 'E0-T-061');
});

test('B1 Traits à précision : « Nom (précision) », sans valeur inventée', () => {
  const traits = Object.fromEntries(library.filter(p => p.kind === 'profile').flatMap(p => (p.traits || []).filter(t => t.param || t.rating).map(t => [t.name, p.name])));
  const sample = library.find(p => p.kind === 'profile' && (p.traits || []).some(t => t.name === 'Size' && t.param));
  const built = buildParticipantFromBestiary(sample.id, { library });
  const size = sample.traits.find(t => t.name === 'Size');
  assert.ok(built.traits.includes(`Size (${size.param})`));
  assert.ok(Object.keys(traits).length > 0);
});

test('B1 armure imprimée : parts non facultatives par zone, jamais de BE ajouté', () => {
  const withParts = library.find(p => p.kind === 'profile' && p.armour?.parts?.some(x => !x.optional && x.locations === 'Arms and Body'));
  const built = buildParticipantFromBestiary(withParts.id, { library });
  assert.deepEqual(built.armor, { head: 0, body: 1, arms: 1, legs: 0 });
  const all = [];
  for (const file of ['L01']) all.push(...JSON.parse(readFileSync(new URL(`../js/data/bestiary/${file}.json`, import.meta.url), 'utf8')).profiles);
  const uniform = all.find(p => p.kind === 'profile' && Number.isInteger(p.armour?.ap) && p.armour.ap > 0);
  const ap = uniform.armour.ap;
  assert.deepEqual(buildParticipantFromBestiary(uniform.id, { library: all }).armor, { head: ap, body: ap, arms: ap, legs: ap });
});

test('B1 attaques facultatives écartées par défaut, incluses sur demande', () => {
  const halfling = byName('Halfling');
  assert.deepEqual(build('Halfling').actions.map(a => a.note), ['Hand Weapon']);
  const all = build('Halfling', { includeOptional: true });
  assert.deepEqual(all.actions.map(a => a.note), ['Hand Weapon', 'Sling and Bullets']);
  assert.equal(all.actions[1].rangeYards, 60);
  assert.equal(all.actions[1].type, 'attack');
  assert.equal(all.actions[1].attr, 'CT');
  assert.equal(all.actions[0].attr, 'CC');
  assert.equal(halfling.attacks[1].optional, true);
});

test('B1 Blessures absentes : null conservé, jamais 0 ; case vide de caractéristique absente', () => {
  const absent = library.find(p => p.woundsAbsent === true) || null;
  if (absent) {
    const built = buildParticipantFromBestiary(absent.id, { library });
    assert.equal(built.hp, null);
    assert.equal(built.maxHp, null);
  }
  const zombie = build('Zombie');
  assert.equal(Object.hasOwn(zombie.caracs, 'CT'), false);
});

test('B1 options : nom français, camp, zone, rang d’exemplaire, suffixe', () => {
  const built = build('Zombie', { nameFr: true, camp: 'ennemi', zone: 'active', index: 2 });
  assert.equal(built.name, 'Zombie 2');
  assert.equal(built.camp, 'ennemi');
  assert.equal(built.zone, 'active');
  assert.equal(built.extensions.v5.bestiary.id, byName('Zombie').id);
});

test('B1 un participant passe sanitizeParticipant sans perte', () => {
  const zombie = build('Zombie');
  const clean = sanitizeParticipant(zombie);
  assert.equal(clean.hp, 12);
  assert.deepEqual(clean.keywords, ['zombie']);
  assert.equal(clean.actions.length, 2);
  assert.equal(clean.actions[1].extensions.v5[BESTIARY_FREE_ATTACK_KEY], 'momentum');
  assert.equal(clean.extensions.v5.bestiary.book, 'L06');
});

test('B1 refus : identifiant inconnu, gabarit, profil incohérent', () => {
  assert.throws(() => buildParticipantFromBestiary('E0-P-999', { library }), /inconnu/);
  const template = library.find(p => p.kind === 'template');
  assert.throws(() => buildParticipantFromBestiary(template.id, { library }), /gabarit/);
  assert.throws(() => buildParticipantFromBestiary(byName('Zombie').id, {}), /bibliothèque/);
});

test('B1 deux exemplaires : identifiants distincts, sans partage d’objets', () => {
  const a = build('Zombie');
  const b = build('Zombie');
  assert.notEqual(a.id, b.id);
  a.actions[0].damage = 99;
  a.extensions.v5.bestiary.armour.toughnessBonus = 99;
  assert.equal(b.actions[0].damage, 7);
  assert.equal(byName('Zombie').attacks[0].damage, 7);
  assert.equal(b.extensions.v5.bestiary.armour.toughnessBonus, 3);
});

test('B1 tous les profils de tous les livres (hors gabarits) se construisent', async () => {
  const { readdirSync } = await import('node:fs');
  let built = 0;
  for (const file of readdirSync(new URL('../js/data/bestiary/', import.meta.url)).filter(name => /^L\d\d\.json$/.test(name))) {
    const profiles = JSON.parse(readFileSync(new URL(`../js/data/bestiary/${file}`, import.meta.url), 'utf8')).profiles;
    for (const profile of profiles.filter(item => item.kind !== 'template')) {
      const participant = buildParticipantFromBestiary(profile.id, { library: profiles, includeOptional: true });
      assert.equal(participant.actions.length, (profile.attacks || []).length, profile.id);
      assert.equal(participant.maxHp, profile.woundsAbsent ? null : profile.wounds, profile.id);
      built += 1;
    }
  }
  assert.equal(built, 882);
});
