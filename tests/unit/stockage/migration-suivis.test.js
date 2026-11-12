// T12 · CA34, CA35, CA37 : étape 3 → 4 de SCHEMA_MIGRATIONS (CAMP-10), jouée sur une sauvegarde figée.
// Les anciens suivis sans participant sont rattachés au personnage suivi du PJ (trace des fiches) ou archivés.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CURRENT_SCHEMA_VERSION, SCHEMA_MIGRATIONS, applySchemaMigrations, migrateSnapshot } from '../../../js/core/migrations.js';
import { createStore } from '../../../js/core/store.js';
import { validateSyncDocument, SYNC_PROTOCOL_VERSION } from '../../../js/core/sync-protocol.js';
import { normalizeRemoteDocument } from '../../../js/core/sync-session.js';

const frozen = () => JSON.parse(readFileSync(new URL('../../fixtures/suivis-orphelins-v3.json', import.meta.url), 'utf8'));
const registerOf = data => data.extensions.v5.aftermathRegister;
const rowsOf = data => { const r = registerOf(data); return [...r.incidents, ...r.diseases, ...r.sequelae]; };
const facts = data => Object.fromEntries(rowsOf(data).map(row => [row.id, [row.participantId, row.ownerId ?? null, row.status]]));

test('la chaîne couvre le schéma 4 et le protocole de synchronisation le suit', () => {
  assert.equal(CURRENT_SCHEMA_VERSION, 4);
  assert.equal(SYNC_PROTOCOL_VERSION, 4);
  assert.deepEqual([SCHEMA_MIGRATIONS.at(-1).from, SCHEMA_MIGRATIONS.at(-1).to], [3, 4]);
});

test('CA34 — un ancien suivi d’un PJ à fiche, dont la trace existe, est rattaché à son personnage suivi', () => {
  const source = frozen(), before = structuredClone(source);
  const { data, applied } = applySchemaMigrations(source);
  assert.deepEqual(source, before, 'la lecture ne réécrit pas la sauvegarde');
  assert.deepEqual(applied, [{ from: 3, to: 4 }]);
  assert.equal(data.schemaVersion, 4);
  const after = facts(data);
  // Wren a déjà son personnage ; celui de Hilda est créé depuis son profil, sous un identifiant déterministe.
  assert.deepEqual(after['i-wren'], ['suivi:pc-wren', 'pc-wren', 'open']);
  assert.deepEqual(after['i-hilda-1'], ['suivi:fiche:fiche-hilda', 'fiche:fiche-hilda', 'open']);
  assert.deepEqual(after['i-hilda-2'], ['suivi:fiche:fiche-hilda', 'fiche:fiche-hilda', 'open'], 'deux anciens participants du même PJ : un seul personnage');
  assert.deepEqual(after['characteristic-loss:op-hilda'], ['suivi:fiche:fiche-hilda', 'fiche:fiche-hilda', 'permanent'], 'la séquelle permanente reste permanente');
  assert.deepEqual(data.persistentCharacters.map(row => [row.id, row.name, row.kind ?? null, row.profileId, row.hp, row.maxHp, row.extensions.ficheId]),
    [['pc-wren', 'Wren', null, 'profil-wren', 7, 12, 'fiche-wren'], ['fiche:fiche-hilda', 'Hilda', 'PJ', 'profil-hilda', 14, 14, 'fiche-hilda']]);
  assert.deepEqual(data.extensions.v5.ficheWriteback.owners, before.extensions.v5.ficheWriteback.owners, 'la trace du chantier H est conservée');
});

test('CA35 — tout autre ancien suivi sans propriétaire est archivé ; une ligne du journal en donne le nombre', () => {
  const { data } = applySchemaMigrations(frozen());
  const after = facts(data);
  assert.deepEqual(after['i-gobelin'], ['vieux-gobelin', null, 'archived']);
  assert.deepEqual(after['d-gobelin'], ['vieux-gobelin', null, 'archived']);
  assert.deepEqual(after['scars:vieux-gobelin'], ['vieux-gobelin', null, 'archived']);
  assert.equal(registerOf(data).sequelae.find(row => row.id === 'scars:vieux-gobelin').archivedFrom, 'permanent');
  // Aucun autre état ne change : suivi clos, maladie finie, participant présent, scène suspendue, fiche sans personnage.
  assert.deepEqual(after['i-gobelin-clos'], ['vieux-gobelin', null, 'closed']);
  assert.deepEqual(after['d-hilda-finie'], ['suivi:fiche:fiche-hilda', 'fiche:fiche-hilda', 'ended'], 'l’historique terminé suit le personnage, sans changer d’état');
  assert.deepEqual(after['i-present'], ['p-present', null, 'open']);
  assert.deepEqual(after['i-suspendu'], ['p-suspendu', null, 'open']);
  assert.deepEqual(after['i-perdu'], ['vieux-perdu', null, 'open'], 'trace vers une fiche sans profil ni personnage : laissé tel quel');
  assert.deepEqual(data.log.map(row => row.text), ['Mise à jour des suivis : 4 suivi(s) rattaché(s) à leur personnage, 3 suivi(s) sans propriétaire archivé(s).', 'Combat terminé.']);
  const { report } = migrateSnapshot(frozen());
  assert.deepEqual(report.migrated.find(row => row.reason === 'suivis-sans-proprietaire'), { path: 'extensions.v5.aftermathRegister', reason: 'suivis-sans-proprietaire', attached: 4, archived: 3, createdCharacters: ['fiche:fiche-hilda'] });
  assert.deepEqual(report.warnings.filter(row => row.reason === 'suivi-de-fiche-sans-personnage-unique').map(row => row.participantId), ['vieux-perdu']);
});

test('étape pure et rejouable : la même sauvegarde rend deux fois le même résultat', () => {
  assert.deepEqual(applySchemaMigrations(frozen()).data, applySchemaMigrations(frozen()).data);
  assert.deepEqual(migrateSnapshot(frozen(), { exportedAt: 'x' }).data, migrateSnapshot(frozen(), { exportedAt: 'x' }).data);
});

test('CA37 — rouvrir la sauvegarde ne rejoue pas la transformation', async () => {
  const once = applySchemaMigrations(frozen()).data;
  const again = applySchemaMigrations(once);
  assert.deepEqual(again.applied, [], 'une sauvegarde en version 4 ne repasse plus par l’étape');
  assert.deepEqual(again.data, once);
  // Une sauvegarde déjà en version 4 n'est pas transformée, même si un suivi y est sans sujet.
  const current = { ...frozen(), schemaVersion: 4 };
  assert.deepEqual(facts(applySchemaMigrations(current).data), facts(current));
  // Par le Store : chargée, enregistrée, rouverte.
  let saved = null;
  const persistence = { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ storage: null, persistence });
  await store.ready;
  await store.loadFromJSON(frozen());
  const first = store.getAftermathState();
  assert.equal(JSON.parse(store.getFullJSON()).schemaVersion, 4);
  assert.equal(saved.schemaVersion, 4, 'la sauvegarde réécrite porte le nouveau numéro');
  const reopened = createStore({ storage: null, persistence });
  await reopened.ready;
  assert.deepEqual(reopened.getAftermathState(), first);
  assert.equal(JSON.parse(reopened.getFullJSON()).log.filter(row => row.id === 'migration-4-suivis').length, 1, 'une seule ligne de journal');
  // Les suivis rattachés sont soignables tout de suite, hors rencontre (CA34 de bout en bout).
  assert.deepEqual(reopened.listAftermathSubjects().filter(row => row.offEncounter).map(row => [row.id, row.name, row.hp]).sort(),
    [['suivi:fiche:fiche-hilda', 'Hilda', 14], ['suivi:pc-wren', 'Wren', 7]]);
  assert.equal(reopened.getAftermathRowLabel(first.incidents.find(row => row.id === 'i-hilda-1')), 'Hilda');
  assert.equal(reopened.getAftermathRowLabel(first.incidents.find(row => row.id === 'i-perdu')), 'Ancien suivi du jour 5 (combat)', 'CA4 : libellé de repli');
});

test('sauvegarde sans registre, ou sans suivi orphelin : rien ne change hors du numéro', () => {
  const plain = { schemaVersion: 3, reserve: [{ id: 'p', name: 'Garde' }], combat: { participants: [] }, log: [] };
  assert.deepEqual(applySchemaMigrations(plain).data, { ...plain, schemaVersion: 4 });
  const source = frozen();
  const r = source.extensions.v5.aftermathRegister;
  r.incidents = r.incidents.filter(row => ['i-present', 'i-suspendu', 'i-gobelin-clos'].includes(row.id)); r.diseases = []; r.sequelae = [];
  assert.deepEqual(applySchemaMigrations(source).data, { ...source, schemaVersion: 4 });
});

test('synchronisation : un document distant en version 3 est relu par la chaîne ; une version future reste refusée', () => {
  const { log, appVersion, contextId, ...shared } = frozen();
  const remote = normalizeRemoteDocument({ revision: 5, state: shared, receipts: { appareil: 2 } });
  assert.equal(remote.state.schemaVersion, 4);
  assert.equal(remote.revision, 5);
  assert.deepEqual(facts(remote.state)['i-gobelin'], ['vieux-gobelin', null, 'archived']);
  assert.equal(remote.state.log, undefined, 'le journal reste local');
  assert.doesNotThrow(() => validateSyncDocument({ revision: 1, state: { schemaVersion: 3, reserve: [], combat: {} } }));
  assert.throws(() => validateSyncDocument({ revision: 1, state: { schemaVersion: 5, reserve: [], combat: {} } }), { code: 'SCHEMA_INCOMPATIBLE' });
  assert.throws(() => validateSyncDocument({ revision: 1, state: { schemaVersion: 2, reserve: [], combat: {} } }), { code: 'SCHEMA_INCOMPATIBLE' });
  const rules = readFileSync(new URL('../../../firebase.database.rules.json', import.meta.url), 'utf8');
  assert.ok(rules.includes("val() === 3 || newData.child('state/schemaVersion').val() === 4"), 'la règle Firebase accepte les schémas 3 et 4');
});
