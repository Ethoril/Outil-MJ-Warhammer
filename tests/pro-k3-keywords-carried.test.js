import test from 'node:test';
import assert from 'node:assert/strict';
import { Profile, Participant, normalizeKeywordList } from '../js/core/models.js';
import { participantKeywords, keywordMatches, buildReferential } from '../js/core/creature-keywords.js';
import { createStore } from '../js/core/store.js';
import { parseProfileJson } from '../js/core/json-profile-import.js';
import { migrateSnapshot } from '../js/core/migrations.js';

const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};

test('K3 : profils et participants portent `keywords` et `keywordExclusions` (identifiants nettoyés, jamais filtrés par la base)', () => {
  assert.deepEqual(normalizeKeywordList([' orque ', 'orque', '', 4, null, 'ulricain']), ['orque', 'ulricain']);
  assert.deepEqual(normalizeKeywordList('orque'), []);
  const profile = new Profile({ name: 'Gobelin', keywords: ['gobelin', 'gobelin', 'ulricain'], keywordExclusions: ['peaux-vertes'] });
  assert.deepEqual(profile.keywords, ['gobelin', 'ulricain']);
  assert.deepEqual(profile.keywordExclusions, ['peaux-vertes']);
  const participant = new Participant({ name: 'Gobelin', keywords: ['gobelin'] });
  assert.deepEqual(participant.keywords, ['gobelin']);
  assert.equal(new Profile({ name: 'Sans' }).keywords, undefined, 'un profil sans mots-clés reste inchangé');
});

test('K3 : les mots-clés traversent réserve → combat et la migration de sauvegarde', () => {
  const store = createStore({ storage: storage() });
  store.executeCommand('add-profile', draft => ({ ...draft, reserve: [new Profile({ id: 'g1', name: 'Gobelin', hp: 9, initiative: 30, keywords: ['gobelin'], keywordExclusions: ['snotling'] })] }));
  assert.deepEqual(store.getProfile('g1').keywords, ['gobelin']);
  store.importFromReserve(['g1']);
  const participant = JSON.parse(store.getFullJSON()).combat.participants[0];
  assert.deepEqual(participant.keywords, ['gobelin']);
  assert.deepEqual(participant.keywordExclusions, ['snotling']);
  const migrated = migrateSnapshot(JSON.parse(store.getFullJSON())).data;
  assert.deepEqual(migrated.reserve[0].keywords, ['gobelin']);
  assert.deepEqual(migrated.combat.participants[0].keywords, ['gobelin']);
});

test('K3 : dérivation d’office depuis la race du PJ, les Traits de nature et les anciens tags, sans écraser le choix du MJ', () => {
  const pj = participantKeywords({ race: 'Haut Elfe' });
  assert.deepEqual(pj.ids, ['haut-elfe']);
  assert.equal(pj.derived[0].from, 'race');
  assert.deepEqual(participantKeywords({ race: 'Nain' }).ids, ['nain']);
  const zombie = participantKeywords({ traits: ['Mort-vivant', 'Stupide', { name: 'Démoniaque (9+)' }], tags: ['gobelin', 'texte libre', 'Peaux-Vertes'] });
  assert.deepEqual(zombie.ids.sort(), ['demon', 'gobelin', 'mort-vivant', 'peaux-vertes']);
  assert.deepEqual(zombie.unknown, ['texte libre']);
  assert.equal(participantKeywords({ isConstruct: true }).ids[0], 'artificiel');
  assert.deepEqual(participantKeywords({ traits: ['Undead'], keywords: ['squelette'] }).ids.sort(), ['mort-vivant', 'squelette']);
  assert.deepEqual(participantKeywords({ traits: ['Mort-vivant'], keywords: ['squelette'], keywordExclusions: ['mort-vivant'] }).ids, ['squelette'], 'le MJ retire un mot-clé dérivé');
  assert.deepEqual(participantKeywords({ keywords: ['orque'], keywordExclusions: ['orque'] }).ids, []);
  assert.deepEqual(participantKeywords({ keywords: ['inconnu'] }).ids, []);
  assert.deepEqual(participantKeywords({ keywords: ['inconnu'] }).unknown, ['inconnu']);
});

test('K3 : un identifiant ajouté par le MJ est reconnu avec le référentiel étendu, et se hérite', () => {
  const extended = buildReferential([{ id: 'ulricain', nameFr: 'Ulricain', nameEn: 'Ulrican', parents: ['humain'] }]);
  const result = participantKeywords({ keywords: ['ulricain'] }, extended);
  assert.deepEqual(result.ids, ['ulricain']);
  assert.equal(keywordMatches(result.ids, 'humain', extended), true);
  assert.deepEqual(participantKeywords({ keywords: ['ulricain'] }).ids, [], 'la base seule ne le connaît pas');
});

test('K3 : l’import JSON résout les alias en identifiants et signale l’inconnu « à vérifier »', () => {
  const result = parseProfileJson(JSON.stringify({ nom: 'Boss', pv: 12, keywords: ['Peau verte', 'Orc', 'orque', 'Dwarves'] }));
  assert.deepEqual(result.profiles[0].keywords, ['peaux-vertes', 'orque', 'nain']);
  assert.equal(result.status, 'ready');
  const bad = parseProfileJson(JSON.stringify({ nom: 'Boss', pv: 12, keywords: ['Orc', 'Zorglub'] }));
  assert.equal(bad.status, 'needs-review');
  assert.ok(bad.errors.some(error => error.reason === 'mot-cle-inconnu' && /Zorglub/.test(error.value)));
  assert.deepEqual(bad.profiles[0].keywords, ['orque']);
  const extended = buildReferential([{ id: 'zorglub', nameFr: 'Zorglub', nameEn: 'Zorglub', parents: [] }]);
  assert.deepEqual(parseProfileJson(JSON.stringify({ nom: 'Boss', pv: 12, keywords: ['Zorglub'] }), { referential: extended }).profiles[0].keywords, ['zorglub']);
});
