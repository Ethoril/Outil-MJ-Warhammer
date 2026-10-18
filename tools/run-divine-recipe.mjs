/** Recette locale reproductible ; chaque reçu conserve le code de sortie et son log. */
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const workingDirectory=resolve(process.cwd());
const sameDirectory=process.platform==='win32'
 ? projectRoot.toLocaleLowerCase()===workingDirectory.toLocaleLowerCase()
 : projectRoot===workingDirectory;
if(!sameDirectory)throw new Error(`Refusing to read or write outside the recipe checkout. Run from project root: ${projectRoot} (cwd: ${workingDirectory})`);
const root=projectRoot,output=resolve(root,'tmp/divin'),node=process.execPath;
mkdirSync(output,{recursive:true});
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const environment={...process.env,PLAYWRIGHT_EXECUTABLE_PATH:process.env.PLAYWRIGHT_EXECUTABLE_PATH||(existsSync(edge)?edge:'')};
delete environment.PSModulePath;
const commands=[
 ['generation',node,['tools/build-v5-divine-contracts.mjs','--check']],
 ['audit-check',node,['tools/build-divine-audit.mjs','--check']],
 ['clauses-check',node,['tools/build-divine-clauses.mjs','--check']],
 ['node',node,['--test']],
 ['divine-ui',node,['tests/divin-v5-browser.mjs']],
 ['source-ui',node,['tests/divin-v5-source-browser-independent.mjs']],
 ['form-ui',node,['tests/divin-v5-e3-e4-form-independent.mjs']],
 ['prayer-form-ui',node,['tests/divin-v5-t5-browser.mjs']],
 ['time-ui',node,['tests/divin-v5-e5-browser-independent.mjs']],
 ['campaign-ui',node,['tests/divin-v5-campaign-browser.mjs']],
 ['campaign-ui-independent',node,['tests/divin-v5-campaign-ui-independent.mjs']],
 ['wrath-ui',node,['tests/divin-v5-wrath-browser.mjs']],
 ['lessons-ui',node,['tests/divin-v5-wrath-lessons-browser-independent.mjs']],
 ['conditions-ui',node,['tests/divin-v5-wrath-conditions-browser-independent.mjs']],
 ['broken-escape-ui',node,['tests/divin-v5-brise-flee-sprint-browser-independent.mjs']],
 ['smoke',node,['tests/browser-smoke.mjs']],
 ['startup',node,['tests/browser-startup.mjs']],
 ['magic-ui',node,['tests/browser-magic-v5-smoke.mjs']],
 ['combat-ui',node,['tests/lot2-combat-v5-browser.mjs']],
 ['divine-cloud','powershell',['-NoProfile','-ExecutionPolicy','Bypass','-File','tests/run-lot2-v5-25-emulators.ps1','-TestScript','tests/divin-v5-cloud-browser.mjs','-DatabasePort','19110','-AuthPort','19119','-HubPort','14410','-LoggingPort','14510']],
 ['build-offline',node,['tools/build-lot3-local-release.mjs']],
 ['offline',node,['tests/lot3-v5-35-release-browser.mjs']],
 ['diff','git',['-c','core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol','diff','--check']]
];
const receipt={startedAt:new Date().toISOString(),appVersion:JSON.parse(readFileSync('package.json','utf8')).version,root,passed:false,commands:[]};
const save=()=>writeFileSync(resolve(output,'recipe-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
save();
for(const [name,command,args]of commands){
 console.log('EN COURS — '+name);const started=Date.now();
 const result=spawnSync(command,args,{cwd:root,env:environment,encoding:'utf8',windowsHide:true,timeout:name==='divine-cloud'?240000:180000,maxBuffer:32*1024*1024});
 const log='tmp/divin/final-'+name+'.log';writeFileSync(resolve(root,log),(result.stdout||'')+(result.stderr||'')+(result.error?'\n'+result.error.stack:''));
 const entry={name,command:[command,...args],exitCode:result.status,signal:result.signal,durationMs:Date.now()-started,log};
 if(name==='node'){
  const text=(result.stdout||'')+(result.stderr||'');const count=text.match(/(?:ℹ\s*tests\s+|# tests\s+)(\d+)/);if(count)entry.tests=Number(count[1]);
 }
 receipt.commands.push(entry);save();console.log((result.status===0?'VERT':'ÉCHEC')+' — '+name+' ('+entry.durationMs+' ms)');
 if(result.status!==0){receipt.completedAt=new Date().toISOString();save();console.error('Recette interrompue : '+log);process.exit(1);}
}
receipt.sourceFingerprint=JSON.parse(readFileSync('js/data/v5-divine-contracts.json','utf8')).sourceFingerprint;
const protectedFiles=['js/data/reference-snapshot.json','js/data/reference-source-csv/Miracles.csv','js/data/reference-source-csv/Magie.csv','js/data/reference-source-csv/Talents.csv'];
const baseline=JSON.parse(readFileSync('tmp/divin/base-manifest.json','utf8'));
receipt.protectedFiles=protectedFiles.map(file=>{const sha256=createHash('sha256').update(readFileSync(file)).digest('hex');return {file,sha256,unchangedFromBase:sha256===baseline.files[file]};});
receipt.passed=receipt.protectedFiles.every(row=>row.unchangedFromBase);receipt.completedAt=new Date().toISOString();save();
if(!receipt.passed)throw Error('Une source protégée a été modifiée.');
console.log('RECETTE DIVINE VERTE — '+receipt.commands.length+' commandes');
