import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getSpellContract } from '../../../js/core/v5-spell-contracts.js';
import { encounter, cast, subject } from '../../helpers/lot3-domain-fixture.js';
import { ficheSnapshot, applyFicheSync } from '../../../js/core/fiche-sync.js';
import { planFicheWriteback, applyConflictChoice } from '../../../js/core/fiche-writeback.js';
import { createSyncSession } from '../../../js/core/sync-session.js';
import { createStore } from '../../../js/core/store.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('Correctifs de l’annexe d’audit du 08/11 (v3.45.1)', () => {
  test('REGLES-05 : v5-spell-contracts lit la Taille des cibles via creatureSizeOf (champ size, espèce, trait Monstrueuse, sans faux positif)', async () => {
    const masterOfBeasts = getSpellContract('Maître des Bêtes');
    assert.deepEqual(masterOfBeasts.effects.targetRule.allowedSizes, ['small', 'average', 'large']);

    // 1. Créature Monstrueuse (Taille (Monstrueuse)) -> monstrous -> exclue de ['small', 'average', 'large']
    {
      const { store } = await encounter({ foe: { traits: ['Bestial', 'Taille (Monstrueuse)'], hp: 30 } });
      await cast(store, masterOfBeasts, { targetTests: { foe: { opponentRoll: 95, resistanceRoll: 95, roll: 95 } } });
      assert.equal((subject(store, 'foe').extensions?.v5?.spellEffects || []).length, 0);
    }

    // 2. Créature avec espèce Ogre (race: 'ogre' -> large via creatureSizeOf) sans trait textuel -> exclue de Destruction de Démon Mineur (['small', 'average'])
    const destroyDaemon = getSpellContract('Destruction de Démon Mineur');
    {
      const { store } = await encounter({ foe: { traits: ['Démoniaque'], race: 'ogre', hp: 20 } });
      await cast(store, destroyDaemon, {
        domainFactsExtra: { opposedActorRoll: 5, boostedStat: 'Ag' },
        targetTests: { foe: { opponentRoll: 95, resistanceRoll: 95, roll: 95 } }
      });
      assert.equal(subject(store, 'foe').hp, 20);
      assert.ok(!subject(store, 'foe').extensions?.v5?.destroyed);
    }

    // 3. Faux positif écarté : un trait contenant « monstr » hors Taille ne classe plus la cible en Énorme
    {
      const { store } = await encounter({ foe: { traits: ['Démoniaque', 'Apparence monstrueuse'], hp: 20 } });
      await cast(store, destroyDaemon, {
        domainFactsExtra: { opposedActorRoll: 5, boostedStat: 'Ag' },
        targetTests: { foe: { opponentRoll: 95, resistanceRoll: 95, roll: 95 } }
      });
      assert.equal(subject(store, 'foe').hp, 0);
      assert.equal(subject(store, 'foe').extensions?.v5?.destroyed, true);
    }
  });

  test('FICHES-01 / COMP-LIAISONS-01 & 10 : base de compteur ou de caractéristique non canonique signalée « à faire à la main » (jamais de conflit insoluble)', () => {
    const raw = {
      nom: 'Wren', race: 'Humain',
      destin: 3, // nombre au lieu de chaîne -> non canonique pour le serveur
      fortune: '2', peche: '1', corruption: '0',
      carac: { ag: { base: '32', adv: 4 } }, // chaîne au lieu d'entier -> non canonique pour le serveur
      talentsAcq: [], equipment: []
    };
    const snapshot = ficheSnapshot('wren', raw, { schemaVersion: 4, revision: 7 });
    const state = {
      schemaVersion: 3,
      reserve: [{
        id: 'prof-wren', name: 'Wren', kind: 'PJ', caracs: { ...snapshot.caracs }, hp: 10, maxHp: 12,
        extensions: { ficheId: 'wren', v5: { fate: 2, corruptionPoints: 0, divine: { sin: 1 } } },
        ficheSnapshot: structuredClone(snapshot)
      }],
      persistentCharacters: [],
      combat: { participants: [] },
      activeScene: null, suspendedScenes: [], log: [],
      extensions: {
        v5: {
          characterResources: [{ characterId: 'fiche:wren', fortune: 2 }],
          aftermathRegister: {
            schemaVersion: 1, revision: 1,
            calendar: { schemaVersion: 1, originDay: 0, currentDay: 0 },
            receipts: [], incidents: [],
            sequelae: [{
              id: 'characteristic-loss:ag', participantId: 'prof-wren', kind: 'characteristic-loss',
              label: 'Perte', status: 'permanent', carac: 'Ag', requested: 2, applied: 2, split: null, day: 0, history: []
            }]
          }
        }
      }
    };
    const rows = planFicheWriteback(state).fiches[0].rows;
    const fateRow = rows.find(r => r.key === 'counter:destin');
    assert.equal(fateRow.manual, true);
    assert.equal(fateRow.reason, 'base-unknown');
    assert.equal(fateRow.change, null);

    const agRow = rows.find(r => r.key === 'carac:ag');
    assert.equal(agRow.manual, true);
    assert.equal(agRow.reason, 'base-unknown');
    assert.equal(agRow.change, null);

    // COMP-LIAISONS-10 : booléen et entier négatif refusés par applyConflictChoice sur une caractéristique
    assert.throws(() => applyConflictChoice(state, 'wren', 'carac:ag', 'fiche', true), /illisible/i);
    assert.throws(() => applyConflictChoice(state, 'wren', 'carac:ag', 'fiche', -5), /illisible/i);
  });

  test('FICHES-06 / COMP-LIAISONS-04 & 07 : avertissement si race vide présente sur la fiche (absent ≠ vide) et suppression de ficheHealthWarning', () => {
    const emptyRace = ficheSnapshot('c1', { nom: 'A', race: '' });
    assert.equal(emptyRace.movement, null);
    assert.ok(emptyRace.warnings.some(w => w.field === 'movement' && w.code === 'race-missing'));

    const absentRace = ficheSnapshot('c2', { nom: 'B' });
    assert.equal(absentRace.movement, null);
    assert.ok(!absentRace.warnings.some(w => w.field === 'movement'));

    // COMP-LIAISONS-07 : ficheHealthWarning n'est plus écrit dans extensions et est nettoyé s'il existait
    const snap = ficheSnapshot('c3', {
      nom: 'C', race: 'Humain',
      carac: { f: { base: 30, adv: 0 }, e: { base: 40, adv: 0 }, fm: { base: 30, adv: 0 } },
      talentsAcq: []
    }, { schemaVersion: 4, revision: 2 });
    const prevState = {
      reserve: [{
        id: 'p-c3', name: 'C', kind: 'PJ', hp: 5, maxHp: 10, caracs: { F: 30, E: 30, FM: 30 },
        extensions: { ficheId: 'c3', ficheHealthWarning: 'stale-warning' },
        ficheSnapshot: ficheSnapshot('c3', { nom: 'C', race: 'Humain' }, { schemaVersion: 4, revision: 1 })
      }],
      combat: { participants: [] }
    };
    const synced = applyFicheSync(prevState, [{ profileId: 'p-c3', charId: 'c3', snapshot: snap }]);
    assert.equal(Object.hasOwn(synced.reserve[0].extensions, 'ficheHealthWarning'), false);
  });

  test('COMP-ZONESNON-04 & 05 : keywords-fallback.json supprimé et empreintes CSV de sourceManifest toutes à jour', () => {
    assert.equal(existsSync(resolve(root, 'js/data/keywords-fallback.json')), false);
    const sw = readFileSync(resolve(root, 'sw.js'), 'utf8');
    assert.equal(sw.includes('keywords-fallback.json'), false);

    const snapshot = JSON.parse(readFileSync(resolve(root, 'js/data/reference-snapshot.json'), 'utf8'));
    for (const entry of snapshot.sourceManifest) {
      const csvPath = resolve(root, 'js/data/reference-source-csv', `${entry.worksheet}.csv`);
      const actualSha = createHash('sha256').update(readFileSync(csvPath)).digest('hex');
      assert.equal(entry.sha256, actualSha, `sha256 de ${entry.worksheet}.csv`);
    }
    for (const [worksheet, source] of Object.entries(snapshot.equipment?.sources || {})) {
      const csvPath = resolve(root, 'js/data/reference-source-csv', `${worksheet}.csv`);
      const actualSha = createHash('sha256').update(readFileSync(csvPath)).digest('hex');
      assert.equal(source.sha256, actualSha, `equipment.sources[${worksheet}].sha256`);
    }
  });

  test('BOOT-03 & BOOT-04 : open() hors ligne conserve le statut offline et switchContext ferme l’ancienne persistance', async () => {
    const statuses = [];
    const session = createSyncSession({
      contextId: 'account:u1',
      deviceId: 'account:u1:d1',
      persistence: {
        async load() { return { reserve: [], combat: { participants: [] } }; },
        async readSession() { return { protocolVersion: 3, deviceId: 'account:u1:d1', sequence: 0, baseRevision: 0 }; },
        async listOutbox() { return []; },
        async saveAtomic() { return { ok: true }; }
      },
      transport: {
        async read() { throw new Error('Network unreachable'); },
        async transaction() { throw new Error('Network unreachable'); }
      },
      onStatus: s => statuses.push(s)
    });
    await session.open();
    assert.equal(statuses.at(-1), 'offline', 'le statut final de open() doit rester offline quand transport.read() échoue');

    const closedContexts = [];
    const makePersistence = ctx => ({
      contextId: ctx,
      async load() { return null; },
      async readSession() { return null; },
      async listOutbox() { return []; },
      async saveAtomic() { return { ok: true }; },
      close() { closedContexts.push(ctx); }
    });
    const store = createStore({
      storage: null,
      contextId: 'guest',
      persistence: makePersistence('guest'),
      persistenceFactory: makePersistence
    });
    await store.ready;
    await store.switchContext('account:u1');
    assert.deepEqual(closedContexts, ['guest']);
  });

  test('COMP-ACCESSIB-03, 06, 08, 09 & BOOT-06 : vérifications structurelles des correctifs UI et Service Worker', () => {
    const css = readFileSync(resolve(root, 'js/ui/workspace.css'), 'utf8');
    assert.match(css, /\.workspace-primary\s*\{[^}]*color:\s*var\(--button-text,\s*#fff\)/);

    const html = readFileSync(resolve(root, 'index.html'), 'utf8');
    assert.match(html, /id="btn-undo"[^>]*aria-keyshortcuts="Control\+Z Meta\+Z"/);
    assert.match(html, /id="btn-redo"[^>]*aria-keyshortcuts="Control\+Shift\+Z Meta\+Shift\+Z"/);

    const mainJs = readFileSync(resolve(root, 'js/main.js'), 'utf8');
    assert.match(mainJs, /e\.key === 'Home' \|\| e\.key === 'End'/);
    assert.match(mainJs, /horloge de campagne, suivis et rencontres/);

    const importTextJs = readFileSync(resolve(root, 'js/ui/import-text-view.js'), 'utf8');
    assert.match(importTextJs, /importButton\.disabled = importing \|\| count === 0 \|\| !fresh/);

    const dialogJs = readFileSync(resolve(root, 'js/ui/v5-campaign-time-dialog.js'), 'utf8');
    assert.match(dialogJs, /typeof returnFocus === 'string' \? document\.querySelector\(returnFocus\) : opener/);

    const sw = readFileSync(resolve(root, 'sw.js'), 'utf8');
    assert.match(sw, /event\.request\.mode === 'navigate'/);
  });
});
