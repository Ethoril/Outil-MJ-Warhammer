import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import registry from '../js/data/v5-divine-contracts.json' with {type:'json'};

test('B00 — les contrats prennent en compte le manifeste L19-L26 actuellement acquis',()=>{
 const manifest=readFileSync('docs/divin/DIVIN_CORPUS_LIVRES_COMPLEMENT.json');
 assert.equal(JSON.parse(manifest).books.at(-1).id,'L26');
 assert.equal(registry.sourceManifest.complementCorpusSha256,createHash('sha256').update(manifest).digest('hex'));
});
