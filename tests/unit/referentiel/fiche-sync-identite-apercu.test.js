// Synchronisation fiche → outil (analyse du 08/11/2026, COMP-LIAISONS-05 et FICHES-03) :
// l'identité fait foi (jamais un rapprochement silencieux par le nom) et l'aperçu nomme exactement ce qu'applique applyFicheSync.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ficheSnapshot, planProfileSync, applyFicheSync, persistentSyncTargets, previewPersistentSync, ficheFingerprint } from '../../../js/core/fiche-sync.js';
import { creatureSizeOf } from '../../../js/core/creature-size.js';

const fixture = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const snapshot = ficheSnapshot('caelel', { ...fixture, peche: '2', corruption: '3', fortune: '2' });
const profile = extra => ({ id: 'pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, caracs: { F: 30, E: 40 }, diceLines: [], ...extra });

test('Rattachement — un persistant homonyme sans lien n’est pas touché', () => {
  const draft = { reserve: [profile()], persistentCharacters: [{ id: 'homonyme', name: 'Caelel', hp: 9, maxHp: 14, caracs: { F: 10 } }], encounters: [] };
  const next = applyFicheSync(draft, [{ charId: 'caelel', profileId: 'pj', snapshot }]);
  assert.deepEqual(next.persistentCharacters[0], draft.persistentCharacters[0], 'caractéristiques, PV et lien inchangés');
});

test('Rattachement — l’homonyme est proposé, et rattaché seulement si le MJ le coche', () => {
  const draft = { reserve: [profile()], persistentCharacters: [{ id: 'homonyme', name: 'Caelel', hp: 9, maxHp: 14 }, { id: 'autre', name: 'Wren', hp: 5 }], encounters: [] };
  assert.deepEqual(persistentSyncTargets(draft, draft.reserve[0], snapshot).proposed, [{ id: 'homonyme', name: 'Caelel' }]);
  const next = applyFicheSync(draft, [{ charId: 'caelel', profileId: 'pj', snapshot, adoptPersistents: ['homonyme'] }]);
  const adopted = next.persistentCharacters[0];
  assert.equal(adopted.profileId, 'pj'); assert.equal(adopted.extensions.ficheId, 'caelel');
  assert.equal(adopted.maxHp, snapshot.woundsMax); assert.equal(adopted.maxHp - adopted.hp, 5, 'blessures subies conservées');
  assert.deepEqual(next.persistentCharacters[1], draft.persistentCharacters[1]);
  // Une fois rattaché, il est lié par son profileId : plus de proposition.
  assert.deepEqual(persistentSyncTargets(next, next.reserve[0], snapshot).proposed, []);
});

test('Rattachement — un persistant déjà lié écarte toute proposition par le nom, et un id coché hors proposition est ignoré', () => {
  const draft = { reserve: [profile()], persistentCharacters: [{ id: 'lié', name: 'Autre nom', hp: 2 }, { id: 'homonyme', name: 'Caelel', hp: 2 }],
    encounters: [{ id: 'r', entries: [{ profileId: 'pj', persistentCharacterId: 'lié' }] }] };
  assert.deepEqual(persistentSyncTargets(draft, draft.reserve[0], snapshot).proposed, []);
  const next = applyFicheSync(draft, [{ charId: 'caelel', profileId: 'pj', snapshot, adoptPersistents: ['homonyme'] }]);
  assert.equal(next.persistentCharacters[0].maxHp, snapshot.woundsMax);
  assert.deepEqual(next.persistentCharacters[1], draft.persistentCharacters[1]);
});

test('Aperçu — le détail nommé correspond exactement au profil écrit par applyFicheSync', () => {
  const source = { ...snapshot, equipment: [{ id: 'corde', kind: 'trapping', name: 'Corde (10 m)' }, { id: 'lanterne', kind: 'trapping', name: 'Lanterne' }], coverage: { ...snapshot.coverage, equipment: 'present' } };
  const old = profile({ movement: 4, talents: [{ id: 'ancien', name: 'Talent retiré' }, ...snapshot.talents.slice(1)], equipment: [{ id: 'corde', kind: 'trapping', name: 'Corde (10 m)' }, { id: 'pelle', kind: 'trapping', name: 'Pelle' }],
    ficheSnapshot: { charId: 'caelel', resources: { fortune: 1 }, durables: { fate: 3, sin: 0, corruption: 1 } }, extensions: { ficheId: 'caelel', v5: { fate: 3, divine: { sin: 0 }, corruptionPoints: 1 } } });
  const plan = planProfileSync(source, old);
  const { details } = plan;
  const written = applyFicheSync({ reserve: [old] }, [{ charId: 'caelel', profileId: 'pj', snapshot: source }]).reserve[0];
  assert.equal(ficheFingerprint(written), ficheFingerprint(plan.updated), 'même calcul que l’application');
  // Diff indépendant entre l'ancien profil et le profil réellement écrit.
  assert.deepEqual(details.movement, { old: 4, new: written.movement });
  assert.equal(written.movement, 5, 'Elfe sylvain');
  const counters = Object.fromEntries(details.counters.map(row => [row.label, [row.old, row.new]]));
  assert.deepEqual(counters, { Destin: [3, written.extensions.v5.fate], Fortune: [1, written.ficheSnapshot.resources.fortune], Péché: [0, written.extensions.v5.divine.sin], Corruption: [1, written.extensions.v5.corruptionPoints], Résilience: [null, written.extensions.v5.resilience] });
  assert.deepEqual(counters.Péché, [0, 2]); assert.deepEqual(counters.Corruption, [1, 3]); assert.deepEqual(counters.Fortune, [1, 2]);
  const names = rows => (rows || []).map(row => row.name);
  const addedTalents = written.talents.filter(row => !old.talents.some(prev => prev.id === row.id && (prev.specialty || '') === (row.specialty || '')));
  assert.deepEqual(details.talents.removed, ['Talent retiré']);
  assert.equal(details.talents.added.length, addedTalents.length); assert.ok(details.talents.added.length >= 1);
  assert.deepEqual(details.equipment, { added: ['Lanterne'], removed: ['Pelle'] });
  assert.deepEqual(names(written.equipment), ['Corde (10 m)', 'Lanterne']);
});

test('Aperçu — rien d’annoncé quand la fiche ne change rien', () => {
  const first = applyFicheSync({ reserve: [profile()] }, [{ charId: 'caelel', profileId: 'pj', snapshot }]).reserve[0];
  const { details } = planProfileSync(snapshot, first);
  assert.deepEqual(details, { movement: null, counters: [], talents: { added: [], removed: [] }, equipment: { added: [], removed: [] } });
});

test('Aperçu — les persistants annoncés sont exactement ceux que l’application modifie', () => {
  const draft = { reserve: [profile()], encounters: [{ id: 'r', entries: [{ profileId: 'pj', persistentCharacterId: 'lié' }] }],
    persistentCharacters: [{ id: 'lié', name: 'Caelel (campagne)', hp: 8, maxHp: 14 }, { id: 'homonyme', name: 'Caelel', hp: 2 }, { id: 'tiers', name: 'Wren', hp: 3 }] };
  const entry = { charId: 'caelel', profileId: 'pj', snapshot };
  const preview = previewPersistentSync(draft, entry);
  const next = applyFicheSync(draft, [entry]);
  const actual = next.persistentCharacters.filter((row, index) => ficheFingerprint(row) !== ficheFingerprint(draft.persistentCharacters[index])).map(row => ({ id: row.id, name: row.name }));
  assert.deepEqual(preview.changed, actual);
  assert.deepEqual(preview.changed, [{ id: 'lié', name: 'Caelel (campagne)' }]);
  assert.deepEqual(preview.proposed, []);
  // Sans lien : l'homonyme n'est que proposé, puis annoncé comme modifié une fois coché.
  const unlinked = { ...draft, encounters: [] };
  assert.deepEqual(previewPersistentSync(unlinked, entry), { changed: [], proposed: [{ id: 'homonyme', name: 'Caelel' }], blocked: false });
  assert.deepEqual(previewPersistentSync(unlinked, { ...entry, adoptPersistents: ['homonyme'] }).changed, [{ id: 'homonyme', name: 'Caelel' }]);
});

test('Taille — un PJ Skink (et Skink caméléon) est Petit', () => {
  for (const race of ['skink', 'Skink', 'skink cameleon', 'Skink caméléon', 'skink-cameleon']) {
    const size = creatureSizeOf({ race });
    assert.equal(size.label, 'Petite', race); assert.equal(size.source, 'species');
  }
  const pj = applyFicheSync({ reserve: [profile()] }, [{ charId: 'caelel', profileId: 'pj', snapshot: ficheSnapshot('caelel', { ...fixture, race: 'skink' }) }]).reserve[0];
  assert.equal(creatureSizeOf(pj).label, 'Petite');
  assert.equal(creatureSizeOf({ race: 'haut-elfe' }).label, 'Moyenne');
});
