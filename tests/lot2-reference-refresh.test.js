import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import snapshot from '../js/data/reference-snapshot.json' with { type: 'json' };

for (const [date, expected] of [['2026-10-07T10:00:00.000Z', 'instantané local (dépôt)'], ['2099-10-07T10:00:00.000Z', 'localStorage']]) {
  test(`Lot2 références — cache ${date} comparé au référentiel livré`, async () => {
    const original = globalThis.localStorage;
    const data = structuredClone(snapshot); data.fetchedAt = date;
    data.contentVersion = 'references:fixture-cache'; data.talents.entries[0].description = 'Description fictive du cache de recette.';
    globalThis.localStorage = { getItem: () => JSON.stringify({ data, updatedAt: date }) };
    try {
      const refs = await import(`../js/core/reference-catalog.js?cache-receipt=${date}`);
      assert.equal(refs.getReferenceStatus().source, expected);
      assert.equal(refs.getReferenceSnapshot().talents.entries[0].description, expected === 'localStorage' ? data.talents.entries[0].description : snapshot.talents.entries[0].description);
    } finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
  });
}

test('Lot2 références — 206 identités et empreintes de descriptions actualisées dans l’inventaire portable', async () => {
  const inventory = JSON.parse(await readFile(new URL('../docs/lot2/LOT2_INVENTAIRE_TALENTS.json', import.meta.url), 'utf8'));
  assert.equal(snapshot.talents.entries.length, 206);
  assert.equal(inventory.items.length, 206);
  const byId = new Map(snapshot.talents.entries.map(item => [item.id, item]));
  for (const item of inventory.items) {
    assert.ok(byId.has(item.talentId));
    assert.equal(item.sourceEffectSha256, createHash('sha256').update(byId.get(item.talentId).description).digest('hex'), item.talentId);
  }
  const csv = await readFile(new URL('../js/data/reference-source-csv/Talents.csv', import.meta.url));
  assert.equal(createHash('sha256').update(csv).digest('hex'), inventory.sourceNormalization.publicCsvSha256);
  assert.equal(inventory.sourceCatalogueVersion, snapshot.talents.catalogVersion);
});
