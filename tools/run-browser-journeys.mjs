/** Lance les parcours navigateur de tests/, chacun limité à 120 s, d'après l'index tests/parcours.json.
 * Familles de l'index : « general » (parcours généraux), « ticket » (tests de lot ou de ticket), « doublon » (doublons
 * probables, gardés tant que le MJ n'a pas tranché) et « hors-serie » (émulateurs Firebase, lanceurs, modules importés :
 * jamais lancés ici). Tout fichier tests/*.mjs doit figurer dans l'index, sinon le lanceur s'arrête.
 *
 * Usage : node tools/run-browser-journeys.mjs [--famille general|ticket|doublon] [--socle] [--jobs N] [filtre]
 *   sans option : toutes les familles lançables, un parcours à la fois ;
 *   --socle     : les parcours marqués « socle » (à lancer avant une publication) ;
 *   --jobs N    : N parcours en parallèle (un rouge sous charge se confirme en relançant le parcours seul) ;
 *   filtre      : sous-chaîne du nom de fichier.
 * Le navigateur est choisi par tests/helpers/browser.mjs. Les tests rapides restent dans « npm test ». */
import {spawn,spawnSync} from 'node:child_process';
import {readdirSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const TIMEOUT_MS=120000;
const RUNNABLE=['general','ticket','doublon'];
const args=process.argv.slice(2);
const option=name=>{const at=args.indexOf(name);if(at<0)return null;const value=args[at+1];args.splice(at,2);return value;};
const family=option('--famille');
const jobs=Math.max(1,Number(option('--jobs'))||1);
const coreOnly=args.includes('--socle');
if(coreOnly)args.splice(args.indexOf('--socle'),1);
const filter=args[0]||'';
if(family&&!RUNNABLE.includes(family)){console.error(`Famille inconnue ou non lançable : ${family} (attendu : ${RUNNABLE.join(', ')})`);process.exit(2);}

const index=JSON.parse(readFileSync(resolve(root,'tests/parcours.json'),'utf8')).parcours;
const files=readdirSync(resolve(root,'tests')).filter(name=>name.endsWith('.mjs')).sort();
const unclassified=files.filter(name=>!index[name]);
const missing=Object.keys(index).filter(name=>!files.includes(name));
if(unclassified.length||missing.length){
 if(unclassified.length)console.error(`Parcours absents de tests/parcours.json : ${unclassified.join(', ')}`);
 if(missing.length)console.error(`Entrées de tests/parcours.json sans fichier : ${missing.join(', ')}`);
 process.exit(2);
}
const journeys=files
 .filter(name=>family?index[name].famille===family:RUNNABLE.includes(index[name].famille))
 .filter(name=>!coreOnly||index[name].socle)
 .filter(name=>name.includes(filter));

function run(name){
 return new Promise(done=>{
  const started=Date.now();
  const child=spawn(process.execPath,[`tests/${name}`],{cwd:root,stdio:['ignore','pipe','pipe'],windowsHide:true});
  let output='',timedOut=false;
  child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
  // Sous Windows, tuer aussi le navigateur lancé par le parcours : child.kill() ne tue que node.
  const timer=setTimeout(()=>{timedOut=true;if(process.platform==='win32')spawnSync('taskkill',['/pid',String(child.pid),'/T','/F']);else child.kill('SIGKILL');},TIMEOUT_MS);
  child.on('close',code=>{clearTimeout(timer);done({name,passed:code===0&&!timedOut,timedOut,seconds:Math.round((Date.now()-started)/1000),output});});
 });
}

const failures=[];
const queue=[...journeys];
async function worker(){
 for(let name=queue.shift();name;name=queue.shift()){
  const result=await run(name);
  console.log(`${result.passed?'ok    ':'ÉCHEC '} ${name} (${result.seconds} s${result.timedOut?', délai de 120 s dépassé':''})`);
  if(!result.passed){failures.push(name);console.log(result.output.trim().split('\n').slice(-20).join('\n'));}
 }
}
await Promise.all(Array.from({length:Math.min(jobs,journeys.length)||1},worker));
console.log(`\n${journeys.length-failures.length}/${journeys.length} parcours verts`);
if(failures.length){console.log(`Échecs : ${failures.sort().join(', ')}`);process.exit(1);}
