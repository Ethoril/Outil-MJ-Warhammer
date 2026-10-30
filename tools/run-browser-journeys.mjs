/** Lance un par un les parcours navigateur de tests/ (hors scénarios cloud qui demandent les émulateurs Firebase).
 * Usage : node tools/run-browser-journeys.mjs [filtre]   (filtre = sous-chaîne du nom de fichier)
 * Les tests rapides restent dans « npm test » (node --test) ; la recette complète est tools/run-divine-recipe.mjs. */
import {spawnSync} from 'node:child_process';
import {readdirSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const environment={...process.env,PLAYWRIGHT_EXECUTABLE_PATH:process.env.PLAYWRIGHT_EXECUTABLE_PATH||(existsSync(edge)?edge:'')};
const independentJourneys=['divin-v5-campaign-ui-independent.mjs','divin-v5-e3-e4-form-independent.mjs'];
const filter=process.argv[2]||'';
const journeys=readdirSync(resolve(root,'tests'))
 .filter(name=>name.endsWith('.mjs'))
 .filter(name=>(name.includes('browser')&&!name.includes('cloud'))||independentJourneys.includes(name))
 .filter(name=>name.includes(filter))
 .sort();

const failures=[];
for(const name of journeys){
 const started=Date.now();
 const result=spawnSync(process.execPath,[`tests/${name}`],{cwd:root,env:environment,encoding:'utf8',maxBuffer:64*1024*1024});
 const seconds=Math.round((Date.now()-started)/1000);
 const passed=result.status===0;
 console.log(`${passed?'ok    ':'ÉCHEC '} ${name} (${seconds} s)`);
 if(!passed){
  failures.push(name);
  console.log(`${result.stdout||''}${result.stderr||''}`.trim().split('\n').slice(-20).join('\n'));
 }
}
console.log(`\n${journeys.length-failures.length}/${journeys.length} parcours verts`);
if(failures.length){console.log(`Échecs : ${failures.join(', ')}`);process.exit(1);}
