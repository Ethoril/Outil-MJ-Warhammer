/** Lance un par un les parcours navigateur de tests/, chacun limité à 120 s. Hors série : les scénarios cloud (émulateurs
 * Firebase : npm run test:magic-cloud) et les tests « release » (version générée dans tmp/ : npm run build:magic-local).
 * Le navigateur est choisi par tests/helpers/browser.mjs (PLAYWRIGHT_EXECUTABLE_PATH, sinon Chrome sur Mac, Edge ailleurs).
 * Usage : node tools/run-browser-journeys.mjs [filtre]   (filtre = sous-chaîne du nom de fichier)
 * Les tests rapides restent dans « npm test » (node --test) ; la recette complète est tools/run-divine-recipe.mjs. */
import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const TIMEOUT_MS=120000;
const independentJourneys=['divin-v5-campaign-ui-independent.mjs','divin-v5-e3-e4-form-independent.mjs'];
const filter=process.argv[2]||'';
const journeys=readdirSync(resolve(root,'tests'))
 .filter(name=>name.endsWith('.mjs'))
 .filter(name=>(name.includes('browser')&&!name.includes('cloud')&&!name.includes('release'))||independentJourneys.includes(name))
 .filter(name=>name.includes(filter))
 .sort();

const failures=[];
for(const name of journeys){
 const started=Date.now();
 const result=spawnSync(process.execPath,[`tests/${name}`],{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024,timeout:TIMEOUT_MS,killSignal:'SIGKILL'});
 const seconds=Math.round((Date.now()-started)/1000);
 const passed=result.status===0;
 console.log(`${passed?'ok    ':'ÉCHEC '} ${name} (${seconds} s${result.error?.code==='ETIMEDOUT'?', délai de 120 s dépassé':''})`);
 if(!passed){
  failures.push(name);
  console.log(`${result.stdout||''}${result.stderr||''}`.trim().split('\n').slice(-20).join('\n'));
 }
}
console.log(`\n${journeys.length-failures.length}/${journeys.length} parcours verts`);
if(failures.length){console.log(`Échecs : ${failures.join(', ')}`);process.exit(1);}
