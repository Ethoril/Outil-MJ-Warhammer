import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_KEYWORDS } from '../../../js/data/creature-keywords.js';
import { BASE_REFERENTIAL, buildReferential, normalizeKeywordText, resolveKeyword, keywordAncestors, keywordDescendants, keywordMatches, expandKeywords, proposeNewKeyword, referentialFromExtensions, participantKeywords, specializationMatches, specializationMigrationReport, traitTargets, traitTargetMatches } from '../../../js/core/creature-keywords.js';
import { createStore } from '../../../js/core/store.js';
import { Profile, Participant, normalizeKeywordList } from '../../../js/core/models.js';
import { parseProfileJson } from '../../../js/core/json-profile-import.js';
import { migrateSnapshot } from '../../../js/core/migrations.js';
import { isPsychologyImmune, previewGenericFearEncounter, previewPsychologySource } from '../../../js/core/v5-talent-psychology.js';
import { previewV5TalentTestModifiers } from '../../../js/core/v5-talent-tests.js';
import { isTargetUndead, isTargetDaemon, isTargetConstruct, isTargetEthereal, hasTargetNatureOrTrait, hasLivingMagicNature } from '../../../js/core/v5-magic-attributes.js';

describe('mots-clés', () => {
const id = text => resolveKeyword(text)?.id ?? null;

test('K1 : alias, casse, accents, pluriel et tirets mènent à une seule entrée', () => {
  const greenskins = id('Peaux-vertes');
  assert.ok(greenskins);
  for (const text of ['peau verte', 'PEAUX VERTES', 'greenskin', 'Greenskins', 'peaux  vertes', 'orques et gobelins']) assert.equal(id(text), greenskins, text);
  assert.equal(id('Mort-vivant'), id('morts vivants'));
  assert.equal(id('undead'), id('Mort vivant'));
  assert.equal(id('Elfe'), id('elves'));
  assert.equal(id('Nain'), id('dwarfs'));
  assert.equal(id('Nain'), id('Dwarves'));
  assert.equal(resolveKeyword('mot inconnu'), null);
  assert.equal(normalizeKeywordText('  Démon-de  Nurgle '), normalizeKeywordText('demon de nurgle'));
});

test('K1 : la hiérarchie est un graphe orienté sans cycle, plusieurs parents permis', () => {
  const nurgleDemon = BASE_REFERENTIAL.terms.get('demon-de-nurgle');
  assert.deepEqual([...nurgleDemon.parents].sort(), ['chaos', 'demon', 'nurgle']);
  const ancestors = keywordAncestors('demon-de-nurgle');
  for (const expected of ['demon-de-nurgle', 'demon', 'chaos', 'nurgle']) assert.ok(ancestors.has(expected), expected);
  assert.ok(!ancestors.has('slaanesh'));
  assert.deepEqual([...keywordAncestors('orque')].sort(), ['orque', 'peaux-vertes']);
  const descendants = keywordDescendants('peaux-vertes');
  for (const expected of ['orque', 'gobelin', 'snotling']) assert.ok(descendants.has(expected), expected);
  assert.ok(!descendants.has('nain'));
});

test('K1 : un effet « contre X » vise la cible porteuse de X ou d’un descendant', () => {
  assert.equal(keywordMatches(['orque'], 'peaux-vertes'), true);
  assert.equal(keywordMatches(['gobelin', 'humain'], 'peaux-vertes'), true);
  assert.equal(keywordMatches(['nain'], 'peaux-vertes'), false);
  assert.equal(keywordMatches(['demon-de-nurgle'], 'chaos'), true);
  assert.equal(keywordMatches(['demon-de-nurgle'], 'demon'), true);
  assert.equal(keywordMatches(['demon'], 'demon-de-nurgle'), false, 'la généralisation ne descend pas');
  assert.equal(keywordMatches([], 'peaux-vertes'), false);
  assert.equal(keywordMatches(['orque'], 'inconnu'), false);
  const expanded = expandKeywords(['squelette']);
  assert.ok(expanded.has('mort-vivant'));
});

test('K1 : le garde-fou refuse doublons et quasi-doublons et propose le terme existant', () => {
  const refuse = (input, reason, existingId) => {
    const result = proposeNewKeyword(input);
    assert.equal(result.ok, false, JSON.stringify(input));
    if (reason) assert.equal(result.reason, reason, JSON.stringify(input));
    if (existingId) assert.equal(result.existing.id, existingId, JSON.stringify(input));
  };
  refuse({ nameFr: 'Orque' }, 'identique', 'orque');
  refuse({ nameFr: 'ORQUE' }, 'identique', 'orque');
  refuse({ nameFr: 'Orques' }, 'identique', 'orque');
  refuse({ nameFr: 'Démon de Nurgle' }, 'identique', 'demon-de-nurgle');
  refuse({ nameFr: 'Peau verte' }, 'identique', 'peaux-vertes');
  refuse({ nameFr: 'Nouveau', aliases: ['greenskin'] }, 'alias', 'peaux-vertes');
  refuse({ nameFr: 'Gobelins' }, null, 'gobelin');
  refuse({ nameFr: 'Skavens' }, null, 'skaven');
  refuse({ nameFr: 'Squelettes' }, null, 'squelette');
  refuse({ nameFr: 'Zombi' }, 'proche', 'zombie');
  refuse({ nameFr: 'Halflings' }, null, 'halfling');
  assert.equal(proposeNewKeyword({ nameFr: '' }).reason, 'nom-vide');
  assert.equal(proposeNewKeyword({ nameFr: 'Gobelin', parents: ['inexistant'] }).ok, false);
  const accepted = proposeNewKeyword({ nameFr: 'Ulricain', nameEn: 'Ulricain', parents: [], aliases: ['fidèle d’Ulric'] });
  assert.equal(accepted.ok, true, JSON.stringify(accepted));
  assert.equal(accepted.term.id, 'ulricain');
  assert.deepEqual(accepted.term.aliases, ['fidèle d’Ulric']);
});

test('K1 : cohérence du référentiel de base (ids et libellés uniques, parents connus, aucun cycle)', () => {
  assert.ok(BASE_KEYWORDS.length >= 60);
  const ids = BASE_KEYWORDS.map(term => term.id);
  assert.equal(new Set(ids).size, ids.length);
  const labels = new Map();
  for (const term of BASE_KEYWORDS) for (const label of [term.nameFr, term.nameEn, ...(term.aliases || [])]) {
    const key = normalizeKeywordText(label);
    assert.ok(!labels.has(key) || labels.get(key) === term.id, `libellé en double : ${label}`);
    labels.set(key, term.id);
  }
  for (const term of BASE_KEYWORDS) for (const parent of term.parents || []) assert.ok(ids.includes(parent), `${term.id} → ${parent}`);
  for (const term of BASE_KEYWORDS) assert.ok(keywordAncestors(term.id).has(term.id));
  assert.throws(() => buildReferential([{ id: 'a', nameFr: 'A', nameEn: 'A', parents: ['b'] }, { id: 'b', nameFr: 'B', nameEn: 'B', parents: ['a'] }]), /cycle/i);
  assert.throws(() => buildReferential([{ id: 'orque', nameFr: 'Autre', nameEn: 'Other', parents: [] }]), /existe déjà/);
});

test('K1 : le référentiel étendu se construit sans muter la base', () => {
  const size = BASE_REFERENTIAL.terms.size;
  const extended = buildReferential([{ id: 'ulricain', nameFr: 'Ulricain', nameEn: 'Ulricain', parents: ['humain'], aliases: ['fidèle d’Ulric'] }]);
  assert.equal(extended.terms.size, size + 1);
  assert.equal(BASE_REFERENTIAL.terms.size, size);
  assert.equal(resolveKeyword('fidèle d’Ulric', extended).id, 'ulricain');
  assert.equal(resolveKeyword('fidèle d’Ulric'), null);
  assert.equal(keywordMatches(['ulricain'], 'humain', extended), true);
  assert.throws(() => { BASE_KEYWORDS.push({}); }, TypeError);
});
});

describe('mots-clés — caractérisation', () => {
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
const withKey = draft => ({ ...draft, extensions: { ...(draft.extensions || {}), v5: { ...(draft.extensions?.v5 || {}), carriedKey: { terms: [{ id: 'x' }] } } } });

test('K2 caractérisation : une clé de `extensions.v5` posée par une commande survit aux commandes suivantes, à l’export et à l’annulation', () => {
  const store = createStore({ storage: storage() });
  assert.equal(store.executeCommand('set-carried-key', withKey).ok, true);
  assert.deepEqual(JSON.parse(store.getFullJSON()).extensions.v5.carriedKey, { terms: [{ id: 'x' }] });
  assert.equal(store.executeCommand('add-profile', draft => ({ ...draft, reserve: [{ id: 'p1', name: 'Profil', hp: 5, initiative: 30 }] })).ok, true);
  assert.deepEqual(JSON.parse(store.getFullJSON()).extensions.v5.carriedKey, { terms: [{ id: 'x' }] }, 'une commande sans rapport la conserve');
  assert.equal(store.undo(), true);
  assert.deepEqual(JSON.parse(store.getFullJSON()).extensions.v5.carriedKey, { terms: [{ id: 'x' }] });
  assert.equal(store.undo(), true);
  assert.equal(JSON.parse(store.getFullJSON()).extensions?.v5?.carriedKey, undefined, 'l’annulation retire la clé');
  assert.equal(store.redo(), true);
  assert.deepEqual(JSON.parse(store.getFullJSON()).extensions.v5.carriedKey, { terms: [{ id: 'x' }] });
});

test('K2 caractérisation : la clé voyage avec l’export et se recharge dans un autre store', () => {
  const first = createStore({ storage: storage() });
  first.executeCommand('set-carried-key', withKey);
  const second = createStore({ storage: storage() });
  second.loadFromJSON(first.getFullJSON());
  assert.deepEqual(JSON.parse(second.getFullJSON()).extensions.v5.carriedKey, { terms: [{ id: 'x' }] });
});
});

describe('référentiel des mots-clés', () => {
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
const revision = store => JSON.parse(store.getFullJSON()).localRevision;
const saved = store => JSON.parse(store.getFullJSON()).extensions?.v5?.keywordReferential?.terms || [];

test('K2 : le MJ ajoute un terme nouveau, annulable, conservé à l’export et au rechargement', () => {
  const store = createStore({ storage: storage() });
  const result = store.addCreatureKeyword({ nameFr: 'Ulricain', nameEn: 'Ulrican', parents: ['humain'], aliases: ['fidèle d’Ulric'] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.term.id, 'ulricain');
  assert.equal(saved(store).length, 1);
  assert.equal(saved(store)[0].addedByMj, true);
  const referential = store.getKeywordReferential();
  assert.equal(resolveKeyword('fidèle d’Ulric', referential).id, 'ulricain');
  assert.equal(keywordMatches(['ulricain'], 'humain', referential), true);
  const copy = createStore({ storage: storage() });
  copy.loadFromJSON(store.getFullJSON());
  assert.equal(resolveKeyword('Ulricain', copy.getKeywordReferential()).id, 'ulricain');
  assert.equal(store.undo(), true);
  assert.equal(saved(store).length, 0);
  assert.equal(resolveKeyword('Ulricain', store.getKeywordReferential()), null);
  assert.equal(store.redo(), true);
  assert.equal(saved(store).length, 1);
});

test('K2 : un doublon ou un quasi-doublon est refusé avec le terme existant, sans révision ni historique', () => {
  const store = createStore({ storage: storage() });
  const before = revision(store);
  for (const [input, existing] of [[{ nameFr: 'Orques' }, 'orque'], [{ nameFr: 'peau verte' }, 'peaux-vertes'], [{ nameFr: 'Zombi' }, 'zombie'], [{ nameFr: 'Nouveau', aliases: ['greenskin'] }, 'peaux-vertes']]) {
    const result = store.addCreatureKeyword(input);
    assert.equal(result.ok, false, JSON.stringify(input));
    assert.equal(result.existing.id, existing);
    assert.match(result.message, /utiliser/i);
  }
  assert.equal(revision(store), before);
  assert.equal(store.canUndo(), false);
  assert.equal(store.addCreatureKeyword({ nameFr: 'Ulricain', parents: ['inconnu'] }).ok, false);
});

test('K2 : les ajouts s’empilent sur le référentiel étendu (alias et quasi-doublons des termes du MJ aussi refusés)', () => {
  const store = createStore({ storage: storage() });
  assert.equal(store.addCreatureKeyword({ nameFr: 'Ulricain', parents: ['humain'], aliases: ['fidèle d’Ulric'] }).ok, true);
  const again = store.addCreatureKeyword({ nameFr: 'Ulricains' });
  assert.equal(again.ok, false);
  assert.equal(again.existing.id, 'ulricain');
  assert.equal(store.addCreatureKeyword({ nameFr: 'Autre', aliases: ['fidèle d’Ulric'] }).reason, 'alias');
  assert.equal(store.addCreatureKeyword({ nameFr: 'Taalite', parents: ['ulricain'] }).ok, true, 'un terme du MJ peut être parent');
  assert.equal(saved(store).length, 2);
});

test('K2 : aucun retrait ni renommage d’un terme ; une sauvegarde qui en usurpe un est ignorée proprement', () => {
  const store = createStore({ storage: storage() });
  assert.equal(store.removeCreatureKeyword, undefined);
  assert.equal(store.renameCreatureKeyword, undefined);
  const { referential, rejected } = referentialFromExtensions({ v5: { keywordReferential: { terms: [
    { id: 'orque', nameFr: 'Orque modifié', nameEn: 'Orc', parents: [] },
    { id: 'ulricain', nameFr: 'Ulricain', nameEn: 'Ulrican', parents: ['humain'], addedByMj: true },
    { id: 'orphelin', nameFr: 'Orphelin', nameEn: 'Orphan', parents: ['absent'], addedByMj: true }
  ] } } });
  assert.equal(resolveKeyword('Orque', referential).nameFr, 'Orque');
  assert.equal(resolveKeyword('Ulricain', referential).id, 'ulricain');
  assert.equal(resolveKeyword('Orphelin', referential), null);
  assert.deepEqual(rejected.map(item => item.id).sort(), ['orphelin', 'orque']);
});
});

describe('mots-clés portés', () => {
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
});

describe('spécialisations — caractérisation', () => {
const talent = (id, specialization) => ({ id, status: 'resolved', rank: 1, ...(specialization ? { specialization } : {}) });
const person = (...talents) => ({ id: 'p', name: 'P', talents, states: [], traits: [] });
const attack = { id: 'a', type: 'attack', base: 50, note: 'Épée', extensions: {} };

test('K4 caractérisation : Sans peur et Haine ne jouent que sur l’égalité de texte de la spécialisation', () => {
  assert.equal(isPsychologyImmune(person(talent('talent-fearless', 'Orques')), { kind: 'fear', enemyGroup: 'Orques' }), true);
  assert.equal(isPsychologyImmune(person(talent('talent-fearless', 'Orques')), { kind: 'fear', enemyGroup: 'Nains' }), false);
  assert.equal(isPsychologyImmune(person(talent('talent-fearless', 'Orques')), { kind: 'fear' }), false);
  assert.equal(isPsychologyImmune(person(talent('talent-fearless', 'Tout')), { kind: 'fear', enemyGroup: 'Nains' }), true);
  assert.equal(isPsychologyImmune(person(talent('talent-fearless')), { kind: 'fear', enemyGroup: 'Nains' }), true);
  assert.equal(isPsychologyImmune(person(talent('talent-hatred', 'Orques')), { kind: 'fear', enemyGroup: 'Orques' }), true);
  assert.equal(isPsychologyImmune(person(talent('talent-hatred', 'Orques')), { kind: 'fear', enemyGroup: 'Gobelins' }), false);
  assert.equal(isPsychologyImmune(person(talent('talent-fearless', 'Orques')), { kind: 'terror', enemyGroup: 'Orques' }), false, 'la Terreur n’est pas couverte par Sans peur');
});

test('K4 caractérisation : le +1 DR de la Haine exige le groupe en contexte et l’égalité avec la spécialisation', () => {
  const run = enemyGroup => previewV5TalentTestModifiers(person(talent('talent-hatred', 'Orques')), { action: attack, kind: 'melee', role: 'attacker', settings: { context: enemyGroup === undefined ? {} : { enemyGroup } } });
  assert.equal(run('Orques').slModifiers.length, 1);
  assert.equal(run('Orques').slModifiers[0].amount, 1);
  assert.equal(run('Nains').slModifiers.length, 0);
  const missing = run(undefined);
  assert.equal(missing.slModifiers.length, 0);
  assert.ok(missing.plan.unresolved.some(row => row.fields.includes('enemyGroup')), 'groupe manquant : saisie MJ demandée');
});
});

describe('spécialisations', () => {
const talent = (id, specialization) => ({ id, status: 'resolved', rank: 1, ...(specialization ? { specialization } : {}) });
const person = (extra = {}, ...talents) => ({ id: 'p', name: 'P', camp: 'a', talents, states: [], traits: [], ...extra });
const attack = { id: 'a', type: 'attack', base: 50, note: 'Épée', extensions: {} };
const orc = { id: 'o', name: 'Orque', camp: 'b', keywords: ['orque'], talents: [], states: [] };
const dwarf = { id: 'd', name: 'Nain', camp: 'b', keywords: ['nain'], talents: [], states: [] };

test('K4 : une spécialisation désigne un mot-clé ; la cible porteuse du terme ou d’un descendant est visée', () => {
  assert.equal(specializationMatches('Peaux-vertes', { enemyKeywords: ['orque'] }), true);
  assert.equal(specializationMatches('peau verte', { enemyKeywords: ['gobelin', 'humain'] }), true);
  assert.equal(specializationMatches('Orques', { enemyKeywords: ['gobelin'] }), false, 'un Gobelin n’est pas un Orque');
  assert.equal(specializationMatches('Orques', { enemyKeywords: ['peaux-vertes'] }), false, 'la généralisation ne descend pas');
  assert.equal(specializationMatches('Peaux-vertes', { enemyGroup: 'Orques' }), true, 'groupe saisi par le MJ, résolu par alias');
  assert.equal(specializationMatches('Peaux-vertes', { enemyGroup: 'Nains', enemyKeywords: ['orque'] }), false, 'la saisie explicite du MJ prime sur la déduction');
  assert.equal(specializationMatches('Peaux-vertes', { enemyGroup: 'Orques', enemyKeywords: ['nain'] }), true, 'et peut forcer l’effet');
  assert.equal(specializationMatches('Tout', { enemyKeywords: ['nain'] }), true);
  assert.equal(specializationMatches('Everything', { enemyGroup: 'Nains' }), true);
  assert.equal(specializationMatches('Gobelins des collines', { enemyGroup: 'Gobelins des collines' }), true, 'texte non résoluble : égalité conservée');
  assert.equal(specializationMatches('Gobelins des collines', { enemyKeywords: ['gobelin'] }), false, 'texte non résoluble : jamais deviné');
  assert.equal(specializationMatches('Orques', {}), false);
  assert.equal(specializationMatches(null, { enemyKeywords: ['orque'] }), false);
  const extended = buildReferential([{ id: 'ulricain', nameFr: 'Ulricain', nameEn: 'Ulrican', parents: ['humain'] }]);
  assert.equal(specializationMatches('Humain', { enemyKeywords: ['ulricain'] }, extended), true);
});

test('K4 : rapport de migration des spécialisations en texte libre, cas par cas', () => {
  const rows = [talent('talent-hatred', 'Peaux-vertes'), talent('talent-hatred', 'Orques'), talent('talent-fearless', 'Tout'), talent('talent-hatred', 'Gobelins des collines'), talent('talent-hatred', 'Associés au Chaos'), talent('talent-ancestral-grudge', 'Elfes noirs'), talent('talent-hatred')];
  const report = specializationMigrationReport(rows);
  assert.deepEqual(report.map(row => [row.specialization, row.status, row.keywordId ?? null]), [
    ['Peaux-vertes', 'resolu', 'peaux-vertes'], ['Orques', 'resolu', 'orque'], ['Tout', 'joker', null],
    ['Gobelins des collines', 'a-migrer', null], ['Associés au Chaos', 'resolu', 'chaos'], ['Elfes noirs', 'resolu', 'elfe-noir']
  ]);
});

test('K4 : Sans peur et Haine s’appliquent d’office quand l’ennemi porte le mot-clé ou un descendant', () => {
  const fearless = person({}, talent('talent-fearless', 'Peaux-vertes'));
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: orc }), true);
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: dwarf }), false);
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: { ...orc, keywordExclusions: ['orque'] } }), false, 'le MJ retire le mot-clé de l’ennemi');
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: dwarf, enemyGroup: 'Orques' }), true, 'saisie MJ prioritaire');
  assert.equal(isPsychologyImmune(fearless, { kind: 'terror', enemy: orc }), false);
  const hater = person({}, talent('talent-hatred', 'Skaven'));
  assert.equal(isPsychologyImmune(hater, { kind: 'fear', enemy: { keywords: ['skaven'] } }), true);
  assert.equal(isPsychologyImmune(hater, { kind: 'fear', enemy: { keywords: ['rat-ogre'] } }), true, 'le Rat-ogre est un Skaven');
  const raceDerived = { race: 'Gobelin', talents: [], states: [] };
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: raceDerived }), true, 'mot-clé déduit de la race');
});

test('K4 : la rencontre de Peur est annulée d’office pour la cible sans peur de ce groupe', () => {
  const author = { ...orc, id: 'author' };
  const brave = person({ id: 'brave', camp: 'a' }, talent('talent-fearless', 'Peaux-vertes'));
  const timid = person({ id: 'timid', camp: 'a' });
  const immune = previewGenericFearEncounter({ author, target: brave, rating: 2, sourceKind: 'trait' });
  assert.equal(immune.exempt, true);
  assert.equal(immune.reason, 'psychology-immunity');
  const affected = previewGenericFearEncounter({ author, target: timid, rating: 2, sourceKind: 'trait' });
  assert.equal(affected.exempt, false);
  assert.deepEqual(affected.addedStates[0].enemyKeywords, ['orque']);
});

test('K4 : le +1 DR de la Haine se déduit de l’adversaire, avec correction possible du MJ', () => {
  const hater = person({}, talent('talent-hatred', 'Peaux-vertes'));
  const run = (opponent, context) => previewV5TalentTestModifiers(hater, { action: attack, kind: 'melee', role: 'attacker', opponent, settings: { context: context || {} } });
  assert.equal(run(orc).slModifiers.length, 1);
  assert.equal(run(orc).plan.unresolved.length, 0, 'plus de saisie demandée au MJ');
  assert.equal(run(dwarf).slModifiers.length, 0);
  assert.equal(run(dwarf).plan.unresolved.length, 0, 'un Nain n’est pas visé, sans question');
  assert.equal(run(orc, { enemyGroup: 'Nains' }).slModifiers.length, 0, 'correction MJ : retirer l’effet');
  assert.equal(run(dwarf, { enemyGroup: 'Orques' }).slModifiers.length, 1, 'correction MJ : forcer l’effet');
  const unknown = run({ id: 'x', name: 'Inconnu', talents: [], states: [] });
  assert.equal(unknown.slModifiers.length, 0);
  assert.ok(unknown.plan.unresolved.some(row => row.fields.includes('enemyGroup')), 'sans mot-clé connu : le MJ doit trancher comme avant');
  assert.equal(run(undefined).plan.unresolved.some(row => row.fields.includes('enemyGroup')), true);
});

test('K4 : Haine, Animosité, Préjugé (Traits à cible) se lisent dans le référentiel, forme texte ou structurée', () => {
  const dwarf = { traits: ['Haine (Peaux-vertes)', { name: 'Animosity', param: 'Elves' }, { name: 'Prejudice (Strangers)' }, 'Hatred (Orcs and Goblins)', 'Animosity (Everything)', 'Hatred (Sigmarites des collines)'] };
  assert.deepEqual(traitTargets(dwarf, ['hatred', 'haine']).map(row => row.keywordId ?? row.raw), ['peaux-vertes', 'peaux-vertes', 'Sigmarites des collines']);
  assert.deepEqual(traitTargets(dwarf, ['animosity', 'animosite']).map(row => row.keywordId ?? row.wildcard), ['elfe', true]);
  assert.deepEqual(traitTargets(dwarf, ['prejudice', 'prejuge']).map(row => row.keywordId), ['etranger']);
  assert.equal(traitTargetMatches(dwarf, ['animosity'], { keywords: ['elfe-noir'] }), true, 'un Elfe noir est un Elfe');
  assert.equal(traitTargetMatches(dwarf, ['animosity'], { keywords: ['nain'] }), true, 'Animosité (Tout)');
  assert.equal(traitTargetMatches(dwarf, ['prejudice'], { keywords: ['humain'] }), false, 'Étranger est posé par le MJ, jamais déduit');
  assert.equal(traitTargetMatches(dwarf, ['prejudice'], { keywords: ['humain', 'etranger'] }), true);
  assert.equal(traitTargetMatches(dwarf, ['hatred'], { keywords: ['sigmarite'] }), false, 'texte non résoluble : jamais deviné');
});

test('K4 : le Trait Haine (cible) protège de la Peur et de l’Intimidation du groupe, pas de la Terreur', () => {
  const dwarf = person({ traits: ['Haine (Peaux-vertes)'] });
  assert.equal(isPsychologyImmune(dwarf, { kind: 'fear', enemy: orc }), true);
  assert.equal(isPsychologyImmune(dwarf, { kind: 'intimidate', enemy: orc }), true);
  assert.equal(isPsychologyImmune(dwarf, { kind: 'terror', enemy: orc }), false);
  assert.equal(isPsychologyImmune(dwarf, { kind: 'fear', enemy: { keywords: ['skaven'] } }), false);
  assert.equal(isPsychologyImmune(person({ traits: [{ name: 'Hatred', param: 'Greenskins' }] }), { kind: 'fear', enemy: orc }), true);
});

test('K4 : un mot-clé ajouté par le MJ sert aussitôt aux effets (référentiel actif posé par le Store)', async () => {
  const { createStore } = await import('../../../js/core/store.js');
  const values = new Map();
  const store = createStore({ storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) } });
  const ulrican = { id: 'u', name: 'Ulricain', camp: 'b', keywords: ['ulricain'], talents: [], states: [] };
  const fearless = person({}, talent('talent-fearless', 'Humain'));
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: ulrican }), false, 'terme encore inconnu');
  assert.equal(store.addCreatureKeyword({ nameFr: 'Ulricain', parents: ['humain'] }).ok, true);
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: ulrican }), true, 'un Ulricain est un Humain');
  assert.equal(store.undo(), true);
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: ulrican }), false, 'annulé : retiré du référentiel actif');
});
});

describe('cibles', () => {
const person = (id, extra = {}) => ({ id, name: id, camp: 'b', hp: 10, maxHp: 10, states: [], traits: [], talents: [], ...extra });

test('K5 : les natures lisent aussi les mots-clés (un descendant suffit), sans perdre les Traits et étiquettes', () => {
  assert.equal(isTargetUndead(person('s', { keywords: ['squelette'] })), true, 'Squelette est un Mort-vivant');
  assert.equal(isTargetUndead(person('z', { tags: ['Zombie'] })), true, 'ancien tag résolu par alias');
  assert.equal(isTargetUndead(person('t', { traits: ['Mort-vivant'] })), true, 'Trait conservé');
  assert.equal(isTargetUndead(person('n', { keywords: ['nain'] })), false);
  assert.equal(isTargetUndead(person('c', { name: 'Chasseur de morts-vivants', keywords: ['humain'] })), false, 'un rôle ne vaut pas une nature');
  assert.equal(isTargetDaemon(person('d', { keywords: ['demon-de-nurgle'] })), true);
  assert.equal(isTargetDaemon(person('k', { keywords: ['chaos'] })), false, 'Chaos n’est pas Démon : seuls les descendants de Démon');
  assert.equal(isTargetConstruct(person('a', { keywords: ['artificiel'] })), true);
  assert.equal(isTargetEthereal(person('f', { keywords: ['fantome'] })), true, 'le Fantôme est Éthéré');
  assert.equal(isTargetUndead(person('f', { keywords: ['fantome'] })), true, 'et Mort-vivant');
  assert.equal(hasLivingMagicNature(person('v', { keywords: ['squelette'] })), false, 'la nature vivante suit les mêmes mots-clés');
  assert.equal(hasLivingMagicNature(person('v2', { keywords: ['humain'] })), true);
  const excluded = person('x', { traits: ['Mort-vivant'], keywordExclusions: ['mort-vivant'] });
  assert.equal(isTargetUndead(excluded), true, 'le Trait explicite reste décisif : l’exclusion écarte seulement une déduction');
});

test('K5 : « contre les X » d’un contrat (Trait ou nature demandé) accepte un mot-clé, un alias ou un ancêtre', () => {
  const orc = person('o', { keywords: ['orque'] });
  for (const key of ['Peaux-vertes', 'peau verte', 'Orque', 'greenskins']) assert.equal(hasTargetNatureOrTrait(orc, key), true, key);
  assert.equal(hasTargetNatureOrTrait(orc, 'Gobelin'), false);
  assert.equal(hasTargetNatureOrTrait(person('d', { keywords: ['nain'] }), 'Peaux-vertes'), false);
  assert.equal(hasTargetNatureOrTrait(person('m', { traits: ['Mutation (Griffes)'] }), 'mutation'), true, 'repli sur les Traits');
  assert.equal(hasTargetNatureOrTrait(person('r', { race: 'Haut Elfe' }), 'Elfe'), true, 'race de PJ déduite');
  assert.equal(hasTargetNatureOrTrait(person('w', { name: 'Chasseur de démons' }), 'demon'), false);
});

test('K5 : une source de Psychologie « contre les Peaux-vertes » ne touche que les porteurs du mot-clé ou d’un descendant', () => {
  const broken = (id, keywords) => ({ ...person(id, keywords ? { keywords } : {}), states: [{ key: 'brise', name: 'Brisé', level: 2 }] });
  const level = (result, id) => (result.participants.find(p => p.id === id).states || []).filter(s => s.key === 'brise').reduce((n, s) => n + (s.level || 1), 0);
  const waaagh = previewPsychologySource('C0-L12-006', { author: person('a'), targets: [broken('orc', ['orque']), broken('gob', ['gobelin']), broken('nain', ['nain']), broken('inconnu')] });
  assert.equal(level(waaagh, 'orc'), 0, 'Orque : Brisé retiré');
  assert.equal(level(waaagh, 'gob'), 0);
  assert.equal(level(waaagh, 'nain'), 2, 'Nain : inchangé');
  assert.equal(level(waaagh, 'inconnu'), 0, 'sans mot-clé connu : comportement d’avant, avec rappel');
  assert.ok(waaagh.reminders.some(text => /inconnu/.test(text) && /Peaux-vertes/.test(text)), 'rappel pour le participant sans mot-clé');
  assert.ok(waaagh.reminders.some(text => /nain/i.test(text) && /Peaux-vertes/.test(text)), 'rappel : cible écartée, correction possible');
  const forced = previewPsychologySource('C0-L12-006', { author: person('a'), targets: [broken('nain', ['nain'])], facts: { keywordTargets: { nain: true } } });
  assert.equal(level(forced, 'nain'), 0, 'correction MJ : forcer l’effet');
  const removed = previewPsychologySource('C0-L12-006', { author: person('a'), targets: [broken('orc', ['orque'])], facts: { keywordTargets: { orc: false } } });
  assert.equal(level(removed, 'orc'), 2, 'correction MJ : retirer l’effet');
});
});
