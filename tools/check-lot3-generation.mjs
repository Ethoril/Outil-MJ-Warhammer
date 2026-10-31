import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const commands=['tools/build-v5-spell-contracts.mjs','tools/build-lot3-contract-evidence.mjs','tools/build-lot3-wom-evidence.mjs','tools/build-lot3-catalogue-evidence.mjs','tools/build-lot3-catalogue-5b-evidence.mjs','tools/build-lot3-catalogue-followup-evidence.mjs','tools/build-lot3-closure-evidence.mjs','tools/build-v5-talent-coverage.mjs'];
const files=['js/data/v5-spell-contracts.json','js/data/v5-talent-coverage.json','docs/lot3/LOT3_MATRICE_CONTRATS_V5.md','docs/lot3/LOT3_SUIVI_EXHAUSTIF_MAGIE.json','docs/lot3/LOT3_SUIVI_EXHAUSTIF_MAGIE.md','docs/lot3/LOT3_RAPPORT_CONTRATS_LOT5B.md',...fs.readdirSync('docs/lot3').filter(n=>/^LOT3_PREUVES_(CONTRATS_LOT|CLOTURE)/.test(n)&&n.endsWith('.json')).map(n=>'docs/lot3/'+n)];
const hashes=()=>Object.fromEntries(files.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
fs.mkdirSync('tmp/lot3',{recursive:true});const runs=[];
for(let pass=1;pass<=2;pass++){for(const file of commands){console.log('GENERATION '+pass+' '+file);const out=execFileSync(process.execPath,[file],{encoding:'utf8',maxBuffer:20*1024*1024,timeout:180000});fs.writeFileSync('tmp/lot3/cloture-generation-'+pass+'-'+file.split('/').at(-1)+'.log',out);}runs.push(hashes());}
assert.deepEqual(runs[1],runs[0],'Deux générations doivent être identiques octet à octet');
assert.equal(JSON.parse(fs.readFileSync('js/data/v5-spell-contracts.json')).length,400);
fs.writeFileSync('tmp/lot3/cloture-generation-receipt.json',JSON.stringify({passed:true,passes:2,commands,files:runs[1],contracts:400},null,2)+'\n');console.log('Deux générations identiques : '+files.length+' fichiers, 400 contrats.');
