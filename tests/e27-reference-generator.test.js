import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseReferenceCSV } from '../js/core/reference-catalog.js';
import { buildEquipmentRows } from '../js/data/reference-equipment-builder.js';
import snapshot from '../js/data/reference-snapshot.json' with { type: 'json' };

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const json=(path,value)=>{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(value,null,2)+'\n');};
const hash=value=>createHash('sha256').update(value).digest('hex');

test('CSV équipement : conserve l’astérisque et ignore le verbe « inflige » dans la note spéciale Blackbriar',()=>{
 const dir=join(repo,'js/data/reference-source-csv');
 const tables={};
 for(const name of ['Mots Clés Armes et Armures','Armes Corps à Corps','Armes à Distance','Armures'])
  tables[name]=parseReferenceCSV(readFileSync(join(dir,`${name}.csv`),'utf8'));
 const rebuilt=buildEquipmentRows(tables),items=rebuilt.items;
 assert.deepEqual(items.map(({catalogVersion,...item})=>item),snapshot.equipment.items.map(({catalogVersion,...item})=>item));
 assert.deepEqual(rebuilt.keywords,snapshot.equipment.keywords);
 const pepperbox=items.find(item=>item.name==='Poivrière');
 assert.ok(pepperbox.keywords.some(word=>word.id==='a-repetition'&&word.parameter==='4'&&word.asterisk===true));
 const repeater=items.find(item=>item.name==='Arquebuse à répétition (2M)');
 assert.ok(repeater.keywords.some(word=>word.id==='a-repetition'&&word.parameter==='4'&&!word.asterisk),'aucun astérisque n’est inventé si le CSV n’en porte pas');
 const blackbriar=items.find(item=>item.name==='Javelot Blackbriar elfe sylvain');
 assert.ok(blackbriar.keywords.some(word=>word.id==='empaleuse'));
 assert.ok(!blackbriar.keywords.some(word=>word.id==='inflige'),'le verbe de la note Spécial ne constitue pas la qualité V5 Inflige');
 assert.match(blackbriar.notes,/Spécial \(si a passé la nuit dans une terre fertile, inflige la condition Empoisonné 1/);
});

test('génération équipement-seul : préserve le snapshot non-équipement et les fichiers partagés',()=>{
 const temp=mkdtempSync(join(tmpdir(),'e27-reference-equipment-only-'));
 try{
  const root=join(temp,'tool'),source=join(temp,'fiches'),tools=join(root,'tools');
  mkdirSync(tools,{recursive:true});
  writeFileSync(join(tools,'generate-reference-catalog.mjs'),readFileSync(join(repo,'tools/generate-reference-catalog.mjs')));
  const equipmentSource='export const equipmentOnlyFixture = true;\n';
  const refreshSource=[
   'const fold = value => String(value).toLowerCase();',
   'const helper = true;',
   'const sources = [];',
   'const keywordRows = [];',
   '/* Required source-shape markers exercised by the generator guard:',
   'const params = [];',
   "const regex = new RegExp(`(?:^|[,;]|\\\\bou\\\\s)\\\\s*${escaped}(?=$|[\\\\s.(,;])\\\\s*([+-]?\\\\d+|\\\\([^)]*\\\\))?`, 'gu');",
   'for (const match of folded.matchAll(regex)) {',
   '                matched = true;',
   'const start = match.index + match[0].length - match[1].length;',
   "if (matched) result.push({ id: entry.id, parameter: entry.parameter ? params.join(', ') : '' });",
   '*/',
   'const items = [];',
   'const keywords = [];',
   "const catalogVersion = 'after';",
   ''
  ].join('\n');
  mkdirSync(join(source,'js/fiche'),{recursive:true});mkdirSync(join(source,'js/data'),{recursive:true});mkdirSync(join(source,'tools'),{recursive:true});
  writeFileSync(join(source,'js/fiche/equipment.js'),equipmentSource);
  const catalog={catalogVersion:'equipment:new',fetchedAt:'2026-10-27T12:00:00.000Z',items:[{id:'v5-item',catalogVersion:'equipment:new'}],keywords:[{id:'v5-keyword'}],sources:{'Armes Corps à Corps':{url:'new-url',sha256:'new-hash'}}};
  json(join(source,'js/data/equipment-catalog.json'),catalog);
  writeFileSync(join(source,'tools/refresh-equipment-catalog.mjs'),refreshSource);
  const previous={schemaVersion:1,contentVersion:'references:old',fetchedAt:'keep-top-date',localRevision:'keep-local-revision',
   published:{skills:{entries:[{id:'skill'}]},talents:{entries:[{id:'talent-contract'}]}},
   talents:{entries:[{id:'talent'}],legacyAliases:[{from:'old'}],specializationTranslations:{Sight:'Vue'}},
   equipment:{items:[{id:'old-item'}],keywords:[{id:'old-keyword'}]},additionalSkills:[{id:'extra-skill'}],
   magic:{spells:[{id:'spell'}],miracles:[{id:'miracle'}]},otherField:{keep:true},
   sourceFiles:{'js/fiche/equipment.js':{sha256:'old-equipment'},'js/data/equipment-catalog.json':{sha256:'old-catalog'},
    'tools/refresh-equipment-catalog.mjs':{sha256:'old-refresh'},'js/catalogue/talent-source.js':{sha256:'keep-talent'}},
   sourceManifest:[{worksheet:'Armes Corps à Corps',url:'old-url',sha256:'old-hash',status:'public-export',fetchedAt:'old-date'},
    {worksheet:'Magie',url:'magic-url',sha256:'keep-magic',status:'public-export',fetchedAt:'old-date'}]};
  json(join(root,'js/data/reference-snapshot.json'),previous);
  mkdirSync(join(root,'js/data/shared/catalogue'),{recursive:true});
  mkdirSync(join(root,'js/data/shared/fiche'),{recursive:true});
  writeFileSync(join(root,'js/data/shared/catalogue/talent-source.js'),'export const sentinel = "talents";\n');
  writeFileSync(join(root,'js/data/shared/fiche/equipment.js'),'export const sentinel = "old equipment";\n');

  const run=()=>execFileSync(process.execPath,[join(tools,'generate-reference-catalog.mjs'),'--equipment-only',`--source-dir=${source}`],{cwd:root,encoding:'utf8'});
  const output=run();
  assert.match(output,/"mode":"equipment-only"/);
  const after=JSON.parse(readFileSync(join(root,'js/data/reference-snapshot.json'),'utf8'));
  for(const key of ['schemaVersion','fetchedAt','localRevision','published','talents','additionalSkills','magic','otherField'])assert.deepEqual(after[key],previous[key],`${key} doit rester intact`);
  assert.deepEqual(after.equipment,catalog);
  assert.notEqual(after.contentVersion,previous.contentVersion);
  assert.deepEqual(after.sourceFiles['js/catalogue/talent-source.js'],previous.sourceFiles['js/catalogue/talent-source.js']);
  assert.equal(after.sourceFiles['js/fiche/equipment.js'].sha256,hash(equipmentSource));
  assert.equal(after.sourceFiles['js/data/equipment-catalog.json'].sha256,hash(readFileSync(join(source,'js/data/equipment-catalog.json'))));
  assert.equal(after.sourceFiles['tools/refresh-equipment-catalog.mjs'].sha256,hash(refreshSource));
  assert.deepEqual(after.sourceManifest,[
   {...previous.sourceManifest[0],...catalog.sources['Armes Corps à Corps'],status:'local-v5-mirror',fetchedAt:catalog.fetchedAt},
   previous.sourceManifest[1]
  ]);
  assert.equal(readFileSync(join(root,'js/data/shared/catalogue/talent-source.js'),'utf8'),'export const sentinel = "talents";\n');
  assert.equal(readFileSync(join(root,'js/data/shared/fiche/equipment.js'),'utf8'),equipmentSource);
  assert.match(readFileSync(join(root,'js/data/reference-equipment-builder.js'),'utf8'),/buildEquipmentRows/);

  const firstSnapshot=readFileSync(join(root,'js/data/reference-snapshot.json'));
  const firstBuilder=readFileSync(join(root,'js/data/reference-equipment-builder.js'));
  const refreshPath=join(source,'tools/refresh-equipment-catalog.mjs');
  writeFileSync(refreshPath,refreshSource.replace('const params = [];','// params marker removed'));
  let missingPatternError;
  try { run(); } catch (error) { missingPatternError=error; }
  assert.ok(missingPatternError,'une source sans motif doit faire échouer la génération');
  assert.match(String(missingPatternError.stderr),/Motif générateur absent ou ambigu \(params\)/);
  writeFileSync(refreshPath,refreshSource);
  run();
  assert.deepEqual(readFileSync(join(root,'js/data/reference-snapshot.json')),firstSnapshot,'le snapshot équipement seul est reproductible');
  assert.deepEqual(readFileSync(join(root,'js/data/reference-equipment-builder.js')),firstBuilder,'le générateur équipement est reproductible');
 }finally{rmSync(temp,{recursive:true,force:true});}
});
