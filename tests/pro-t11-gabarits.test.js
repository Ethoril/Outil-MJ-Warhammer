import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyBestiaryTemplates, buildParticipantFromTemplatedBestiary } from '../js/core/bestiary-templates.js';

const book = id => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${id}.json`, import.meta.url), 'utf8')).profiles;
const L12 = book('L12');
const L06 = book('L06');
const byId = (library, id) => library.find(profile => profile.id === id);

test('T11 Massif troll sur le Troll commun de base : modificateurs signés, Taille remplacée, sans recalcul', () => {
  const base = byId(L12, 'E0-P-403');
  const { record, errors } = applyBestiaryTemplates(base, byId(L12, 'E0-P-448'));
  assert.deepEqual(errors, []);
  assert.equal(record.stats.M, base.stats.M - 1);
  assert.equal(record.stats.F, 60);
  assert.equal(record.stats.E, 50);
  assert.equal(record.stats.I, base.stats.I - 3);
  assert.equal(record.stats.Ag, 10);
  assert.equal(record.stats.CC, base.stats.CC);
  assert.equal(record.wounds, base.wounds);
  assert.equal(record.size, 'enormous');
  const sizes = record.traits.filter(trait => trait.name === 'Size');
  assert.equal(sizes.length, 1);
  assert.equal(sizes[0].param, 'Enormous');
  assert.deepEqual(record.appliedTemplates, ['E0-P-448']);
  assert.match(record.name, /\(Hulking Troll\)$/);
  assert.equal(base.stats.F, 55, 'le profil de base n’est pas modifié');
});

test('T11 gabarit de Troll de Chaos : Trait ajouté, mot-clé fusionné, deux gabarits cumulés', () => {
  const base = byId(L12, 'E0-P-403');
  const { record } = applyBestiaryTemplates(base, [byId(L12, 'E0-P-444'), byId(L12, 'E0-P-448')]);
  assert.ok(record.traits.some(trait => trait.name === 'Corruption'));
  assert.ok(record.keywords.includes('chaos') || record.keywords.length >= base.keywords.length);
  assert.equal(record.stats.CC, base.stats.CC + 10);
  assert.equal(record.stats.F, base.stats.F + 10);
  assert.deepEqual(record.appliedTemplates, ['E0-P-444', 'E0-P-448']);
});

test('T11 gabarit de compétences : bonus ajouté à une compétence tenue, sinon ajouté et signalé', () => {
  const soldier = byId(L06, 'E0-P-112');
  const base = L06.find(profile => profile.kind === 'profile' && (profile.skills || []).some(skill => (soldier.skills || []).some(s => s.name === skill.name)));
  assert.ok(base, 'un profil du livre de base partage une compétence avec le gabarit Soldat');
  const shared = soldier.skills.find(skill => base.skills.some(s => s.name === skill.name));
  const before = base.skills.find(skill => skill.name === shared.name).value;
  const { record, reminders } = applyBestiaryTemplates(base, soldier);
  assert.equal(record.skills.find(skill => skill.name === shared.name).value, before + shared.value);
  assert.equal(base.skills.find(skill => skill.name === shared.name).value, before);
  assert.ok(Array.isArray(reminders));
});

test('T11 refus : gabarit sur gabarit, profil à la place du gabarit, caractéristique vide, résultat négatif borné', () => {
  const template = byId(L12, 'E0-P-448');
  assert.ok(applyBestiaryTemplates(template, template).errors.length);
  assert.ok(applyBestiaryTemplates(byId(L12, 'E0-P-403'), byId(L12, 'E0-P-403')).errors.length);
  const base = structuredClone(byId(L12, 'E0-P-403'));
  base.stats.Ag = null;
  const refused = applyBestiaryTemplates(base, template);
  assert.equal(refused.record, null);
  assert.match(refused.errors.join(' '), /Ag absente/);
  const weak = structuredClone(byId(L12, 'E0-P-403'));
  weak.stats.I = 2;
  assert.equal(applyBestiaryTemplates(weak, template).record.stats.I, 0);
});

test('T11 modificateur de Blessures (Enfant d’Ulric, L19) et participant final', () => {
  const L19 = book('L19');
  const ulric = byId(L19, 'E0-P-598');
  const base = L19.find(profile => profile.kind === 'profile' && profile.stats.Soc !== null && profile.stats.Soc >= 20 && profile.stats.Dex !== null && profile.stats.Int !== null);
  const { record, errors } = applyBestiaryTemplates(base, ulric);
  assert.deepEqual(errors, []);
  assert.equal(record.wounds, base.wounds + 4);
  assert.equal(record.stats.Soc, base.stats.Soc - 20);
  const participant = buildParticipantFromTemplatedBestiary(base.id, [ulric.id], { library: L19 });
  assert.equal(participant.maxHp, base.wounds + 4);
  assert.equal(participant.caracs.F, base.stats.F + 10);
  assert.deepEqual(participant.extensions.v5.bestiary.appliedTemplates, [ulric.id]);
  assert.throws(() => buildParticipantFromTemplatedBestiary(base.id, ['E0-P-000'], { library: L19 }), /gabarit/);
});
