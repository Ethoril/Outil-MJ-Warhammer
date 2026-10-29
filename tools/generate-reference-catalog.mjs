import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const parseReferenceCSV = text => {
 const rows=[];let row=[],cell='',quoted=false;
 const input=String(text??'').replace(/^\uFEFF/u,'');
 for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(quoted&&input[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(cell);cell='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);if(row.some(value=>value.trim()))rows.push(row);row=[];cell='';}
  else cell+=c;}
 if(quoted)throw new Error('CSV incomplet : guillemet non fermé');row.push(cell);if(row.some(value=>value.trim()))rows.push(row);return rows;
};
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const replaceRequired = (source, before, after, label) => {
 const first=source.indexOf(before);
 if(first<0 || source.indexOf(before,first+before.length)>=0) throw new Error(`Motif générateur absent ou ambigu (${label})`);
 return source.slice(0,first)+after+source.slice(first+before.length);
};
const preserveAsteriskValidation = source => {
 if(!source.includes("Object.keys(word).some(key => !['id', 'parameter'].includes(key))"))return source;
 let value=replaceRequired(source,
  "Object.keys(word).some(key => !['id', 'parameter'].includes(key))",
  "Object.keys(word).some(key => !['id', 'parameter', 'asterisk'].includes(key))",'asterisk-schema');
 return replaceRequired(value,
  "invalid('Mot clé ou paramètre invalide');",
  "invalid('Mot clé ou paramètre invalide');\n        if (word.asterisk !== undefined && typeof word.asterisk !== 'boolean') invalid('Marqueur astérisque invalide');",'asterisk-type');
};
const preserveEquipmentKeywordDetails = body => {
 // Upstream changed its parser from regex-over-whole-string to comma-aware parts.
 // Keep that parser, retaining literal stars while matching normalized keywords.
 const matchParts = /const matches = parts\.map\(value => value\.trim\(\)\)\.map\(part => \(\{ part, match: fold\(part\)\.match\(pattern\) \}\)\)\.filter\(value => value\.match\);/gu;
 const foundParts = [...body.matchAll(matchParts)];
 if (foundParts.length) {
  if (foundParts.length !== 1) throw new Error('Motif générateur absent ou ambigu (keyword-parts)');
  let value = body.replace(matchParts,
   "const matches = parts.map(value => value.trim()).map(part => ({ part, asterisk: part.includes('*'), match: fold(part.replaceAll('*', '')).match(pattern) })).filter(value => value.match);");
  const result = /result\.push\(\{ id: entry\.id, parameter: \[\.\.\.new Set\(parameters\)\]\.join\(' ; '\) \}\);/gu;
  const resultMatches=[...value.matchAll(result)];
  if(resultMatches.length!==1)throw new Error('Motif générateur absent ou ambigu (keyword-result)');
  return value.replace(result,
   "result.push({ id: entry.id, parameter: [...new Set(parameters)].join(' ; '), ...(matches.some(({ asterisk }) => asterisk) ? { asterisk: true } : {}) });");
 }
 // Legacy parser used by older source exports.
 if(body.includes('/* Required source-shape markers exercised by the generator guard:')){
  const markers=[["const params = [];",'params'],["const regex = new RegExp(`(?:^|[,;]|\\\\bou\\\\s)\\\\s*${escaped}(?=$|[\\\\s.(,;])\\\\s*([+-]?\\\\d+|\\\\([^)]*\\\\))?`, 'gu');",'regex'],
   ['for (const match of folded.matchAll(regex)) {','match'],['const start = match.index + match[0].length - match[1].length;','parameter'],
   ["if (matched) result.push({ id: entry.id, parameter: entry.parameter ? params.join(', ') : '' });",'result']];
  for(const [marker,label] of markers)if(!body.includes(marker))throw new Error(`Motif générateur absent ou ambigu (${label})`);
  return body;
 }
 return [
  ["const params = [];", "const params = [];\n        let asterisk = false;", 'params'],
  ["const regex = new RegExp(`(?:^|[,;]|\\\\bou\\\\s)\\\\s*${escaped}(?=$|[\\\\s.(,;])\\\\s*([+-]?\\\\d+|\\\\([^)]*\\\\))?`, 'gu');",
   "const regex = new RegExp(`(?:^|[,;]|\\\\bou\\\\s)\\\\s*${escaped}(?=$|[\\\\s.(,;])\\\\s*([+-]?\\\\d+|\\\\([^)]*\\\\))?(\\\\*)?`, 'gu');", 'regex'],
  ["for (const match of folded.matchAll(regex)) {\n                matched = true;",
   "for (const match of folded.matchAll(regex)) {\n                matched = true;\n                asterisk ||= Boolean(match[2]);", 'match'],
  ["const start = match.index + match[0].length - match[1].length;",
   "const start = match.index + match[0].length - (match[2] ? 1 : 0) - match[1].length;", 'parameter'],
  ["if (matched) result.push({ id: entry.id, parameter: entry.parameter ? params.join(', ') : '' });",
   "if (matched) result.push({ id: entry.id, parameter: entry.parameter ? params.join(', ') : '', ...(asterisk ? { asterisk: true } : {}) });", 'result']
 ].reduce((value,[before,after,label])=>replaceRequired(value,before,after,label),body);
};
const source=resolve(process.argv.find(a=>a.startsWith('--source-dir='))?.slice(13)||'../ennemi-interieur-wfrp4');
const refreshMagicSourceManifest=async rows=>{
 const sheets=new Set(['Magie','Miracles']);
 // These modes use the checked-in mirrors; they must not claim a fresh fetch.
 return Promise.all((rows||[]).map(async row=>{
  if(!sheets.has(row.worksheet))return row;
  let csv;
  try{csv=await readFile(resolve(root,'js/data/reference-source-csv',`${row.worksheet}.csv`),'utf8');}
  catch(error){if(error?.code==='ENOENT')return row;throw error;}
  const hash=createHash('sha256').update(csv).digest('hex');
  const sheet=encodeURIComponent(row.worksheet);
  return {...row,url:`https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/gviz/tq?tqx=out:csv&headers=1&sheet=${sheet}`,sha256:hash,status:'local-v5-mirror'};
 }));
};
if(process.argv.includes('--talents-only')){
 const readSource=async path=>readFile(resolve(source,path),'utf8');
 const prior=JSON.parse(await readFile(resolve(root,'js/data/reference-snapshot.json'),'utf8'));
 const published=JSON.parse(await readSource('js/catalogue/referentiel-public.json'));
 const talents=JSON.parse(await readSource('js/catalogue/talents-sheet-snapshot.json'));
 const sourceFiles={...(prior.sourceFiles||{})};
 const hash=value=>createHash('sha256').update(value).digest('hex');
 for(const path of ['js/catalogue/referentiel-public.json','js/catalogue/talents-sheet-snapshot.json','js/catalogue/talent-resolver.js','js/catalogue/talent-source.js'])
  sourceFiles[path]={sha256:hash(await readSource(path))};
 for(const path of ['js/catalogue/talent-resolver.js','js/catalogue/talent-source.js']){
  const body=await readSource(path),destination=resolve(root,'js/data/shared',path.slice(3));
  await mkdir(dirname(destination),{recursive:true});await writeFile(destination,body);
 }
 const talentCsv=await readFile(resolve(root,'js/data/reference-source-csv/Talents.csv'),'utf8');
 const sourceManifest=await refreshMagicSourceManifest((prior.sourceManifest||[]).map(row=>row.worksheet==='Talents'
  ?{...row,url:'https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/gviz/tq?tqx=out:csv&headers=1&sheet=Talents',sha256:hash(talentCsv),fetchedAt:talents.fetchedAt,status:'local-v5-mirror'}
  :row));
 const next={...prior,published:{...prior.published,talents:published.talents},talents,sourceFiles,sourceManifest};
 const canonical=(key,value)=>['catalogVersion','contentVersion','version','descriptionSnapshotVersion','fetchedAt','publishedAt'].includes(key)?undefined:value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value;
 const useful={skills:next.published.skills,talentContract:next.published.talents,
  talents:{entries:next.talents.entries,legacyAliases:next.talents.legacyAliases,specializationTranslations:next.talents.specializationTranslations},
  equipment:{items:next.equipment.items,keywords:next.equipment.keywords},additionalSkills:next.additionalSkills,
  magic:{spells:next.magic.spells,miracles:next.magic.miracles}};
 next.contentVersion='references:'+hash(JSON.stringify(useful,canonical));
 await writeFile(resolve(root,'js/data/reference-snapshot.json'),JSON.stringify(next,null,2)+'\n');
 console.log(JSON.stringify({mode:'talents-only',contentVersion:next.contentVersion,talents:talents.entries.length,
  preserved:{equipment:next.equipment.items.length,spells:next.magic.spells.length,miracles:next.magic.miracles.length}}));
}else
if(process.argv.includes('--equipment-only')){
 const readSource=async path=>readFile(resolve(source,path),'utf8');
 const prior=JSON.parse(await readFile(resolve(root,'js/data/reference-snapshot.json'),'utf8'));
 const sourceEquipment=JSON.parse(await readSource('js/data/equipment-catalog.json'));
 const equipmentSource=await readSource('js/fiche/equipment.js');
 const localEquipmentSource=preserveAsteriskValidation(equipmentSource);
 const refreshSource=await readSource('tools/refresh-equipment-catalog.mjs');
 const hash=value=>createHash('sha256').update(value).digest('hex');
 const sourceFiles={...(prior.sourceFiles||{}),
  'js/fiche/equipment.js':{sha256:hash(localEquipmentSource)},
  'js/data/equipment-catalog.json':{sha256:hash(await readSource('js/data/equipment-catalog.json'))},
  'tools/refresh-equipment-catalog.mjs':{sha256:hash(refreshSource)}
 };
 const sourceRows=sourceEquipment.sources||{};
 const helpers=refreshSource.slice(refreshSource.indexOf('const fold ='),refreshSource.indexOf('const sources ='));
 const body=preserveEquipmentKeywordDetails(refreshSource.slice(refreshSource.indexOf('const keywordRows ='),refreshSource.indexOf('const catalogVersion =')).replaceAll('await sheet(', 'sheet('));
 const sheet=` const sheet=name=>{const table=tables[name];if(!table)throw new Error('Source absente : '+name);const [headers,...rows]=table;return rows.filter(row=>row[headers.indexOf('Nom')]?.trim()).map(row=>Object.fromEntries(headers.map((key,index)=>[key,row[index]?.trim()||'']).filter(([key])=>key))) };`;
 const builder='// Generated from fiches/tools/refresh-equipment-catalog.mjs. Regenerate; do not edit.\n'+helpers+'\nexport function buildEquipmentRows(tables) {\n'+sheet+'\n'+body+'\nreturn {items,keywords};\n}\n';
 await writeFile(resolve(root,'js/data/reference-equipment-builder.js'),builder);
 let equipment=sourceEquipment;
 const tables={};let mirrorAvailable=true;
 for(const worksheet of ['Mots Clés Armes et Armures','Armes Corps à Corps','Armes à Distance','Armures']){
  try{tables[worksheet]=parseReferenceCSV(await readFile(resolve(root,'js/data/reference-source-csv',`${worksheet}.csv`),'utf8'));}
  catch(error){if(Object.keys(sourceEquipment.sources||{}).length>=4)throw new Error(`Miroir CSV requis absent : ${worksheet}.csv`,{cause:error});mirrorAvailable=false;break;}
 }
 if(mirrorAvailable){
  const {buildEquipmentRows}=await import(new URL(`../js/data/reference-equipment-builder.js?${Date.now()}`,import.meta.url));
  const rebuilt=buildEquipmentRows(tables);
  const catalogVersion=`equipment:${hash(JSON.stringify(rebuilt))}`;
  equipment={...sourceEquipment,catalogVersion,items:rebuilt.items.map(item=>({...item,catalogVersion})),keywords:rebuilt.keywords,
   keywordHistory:{...(sourceEquipment.keywordHistory||{})}};
  if(prior.equipment?.catalogVersion&&prior.equipment.catalogVersion!==catalogVersion)
   equipment.keywordHistory[prior.equipment.catalogVersion]=prior.equipment.keywords;
 }
 const next={...prior,equipment,sourceFiles};
 next.sourceManifest=await refreshMagicSourceManifest((prior.sourceManifest||[]).map(row=>sourceRows[row.worksheet]
  ?{...row,...sourceRows[row.worksheet],status:'local-v5-mirror',fetchedAt:equipment.fetchedAt}
  :row));
 const canonical=(key,value)=>['catalogVersion','contentVersion','version','descriptionSnapshotVersion','fetchedAt','publishedAt'].includes(key)?undefined:value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value;
 const useful={skills:next.published.skills,talentContract:next.published.talents,
  talents:{entries:next.talents.entries,legacyAliases:next.talents.legacyAliases,specializationTranslations:next.talents.specializationTranslations},
  equipment:{items:next.equipment.items,keywords:next.equipment.keywords},additionalSkills:next.additionalSkills,
  magic:{spells:next.magic.spells,miracles:next.magic.miracles}};
 next.contentVersion='references:'+hash(JSON.stringify(useful,canonical));
 await writeFile(resolve(root,'js/data/shared/fiche/equipment.js'),localEquipmentSource);
 await writeFile(resolve(root,'js/data/reference-snapshot.json'),JSON.stringify(next,null,2)+'\n');
 console.log(JSON.stringify({mode:'equipment-only',contentVersion:next.contentVersion,items:equipment.items.length,keywords:equipment.keywords.length,
  preserved:{magic:next.magic.spells.length,talents:next.talents.entries.length}}));
}else{
const files=['js/fiche/equipment.js','js/fiche/skill-names.js','js/fiche/basic-skills.js','js/catalogue/skill-resolver.js','js/catalogue/talent-resolver.js','js/catalogue/talent-source.js'];
const sourceFiles={};
for(const path of files){const body=await readFile(resolve(source,path),'utf8');const dest=resolve(root,'js/data/shared',path.slice(3));await mkdir(dirname(dest),{recursive:true});await writeFile(dest,body);sourceFiles[path]={sha256:createHash('sha256').update(body).digest('hex')};}
const read=async path=>{const body=await readFile(resolve(source,path),'utf8');sourceFiles[path]={sha256:createHash('sha256').update(body).digest('hex')};return JSON.parse(body)};
const published=await read('js/catalogue/referentiel-public.json');
const talents=await read('js/catalogue/talents-sheet-snapshot.json');
const equipment=await read('js/data/equipment-catalog.json');
const skills=await read('js/data/skills.json');
const magic=await read('js/data/fiche-catalog.json');
const payload={published,talents,equipment,additionalSkills:skills.filter(s=>s.source==='Drive Carrières — Lustria'),magic};
const canonical=(key,value)=>['catalogVersion','contentVersion','version','descriptionSnapshotVersion','fetchedAt','publishedAt'].includes(key)?undefined:value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value;
const useful={skills:published.skills,talentContract:published.talents,talents:{entries:talents.entries,legacyAliases:talents.legacyAliases,specializationTranslations:talents.specializationTranslations},equipment:{items:equipment.items,keywords:equipment.keywords},additionalSkills:payload.additionalSkills,magic:{spells:magic.spells,miracles:magic.miracles}};
const contentVersion='references:'+createHash('sha256').update(JSON.stringify(useful,canonical)).digest('hex');
const snapshot={schemaVersion:1,contentVersion,fetchedAt:equipment.fetchedAt,sourceFiles,...payload};
await writeFile(resolve(root,'js/data/reference-snapshot.json'),JSON.stringify(snapshot,null,2)+'\n');
const original=await readFile(resolve(source,'tools/refresh-equipment-catalog.mjs'),'utf8');
sourceFiles['tools/refresh-equipment-catalog.mjs']={sha256:createHash('sha256').update(original).digest('hex')};
const helpers=original.slice(original.indexOf('const fold ='),original.indexOf('const sources ='));
const body=preserveEquipmentKeywordDetails(original.slice(original.indexOf('const keywordRows ='),original.indexOf('const catalogVersion =')).replaceAll('await sheet(', 'sheet('));
const sheet=` const sheet=name=>{const table=tables[name];if(!table)throw new Error('Source absente : '+name);const [headers,...rows]=table;return rows.filter(row=>row[headers.indexOf('Nom')]?.trim()).map(row=>Object.fromEntries(headers.map((key,index)=>[key,row[index]?.trim()||'']).filter(([key])=>key))) };`;
await writeFile(resolve(root,'js/data/reference-equipment-builder.js'), '// Generated from fiches/tools/refresh-equipment-catalog.mjs. Regenerate; do not edit.\n'+helpers+'\nexport function buildEquipmentRows(tables) {\n'+sheet+'\n'+body+'\nreturn {items,keywords};\n}\n');
await writeFile(resolve(root,'js/data/reference-snapshot.json'),JSON.stringify(snapshot,null,2)+'\n');
console.log(JSON.stringify({contentVersion,items:equipment.items.length,keywords:equipment.keywords.length,talents:talents.entries.length,skills:published.skills.entries.length}));
}
