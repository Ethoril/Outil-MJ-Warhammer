import {readFileSync, writeFileSync, realpathSync} from 'node:fs';
import {resolve, dirname, isAbsolute, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const text=(value,label)=>{if(typeof value!=='string'||!value.trim())throw Error(`${label}: texte requis`);return value;};
const object=(value,label)=>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error(`${label}: objet requis`);return value;};
const list=(value,label,nonempty=true)=>{if(!Array.isArray(value)||(nonempty&&!value.length))throw Error(`${label}: liste ${nonempty?'non vide ':''}requise`);return value;};
function keys(value,required,optional,label){object(value,label);for(const key of required)if(!Object.hasOwn(value,key))throw Error(`${label}: champ ${key} absent`);for(const key of Object.keys(value))if(!required.includes(key)&&!optional.includes(key))throw Error(`${label}: champ ${key} inconnu`);}
function distinct(values,label){if(new Set(values).size!==values.length)throw Error(`${label}: doublon`);}
function exact(actual,expected,label){if(JSON.stringify([...actual].sort())!==JSON.stringify([...expected].sort()))throw Error(`${label}: ensemble différent de E1`);}
const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
const unresolved=value=>Boolean(value&&typeof value==='object'&&(value.status==='unresolved'||Object.values(value).some(unresolved)));
function meaningful(value,label){
 if(typeof value==='string')return text(value,label);
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error(`${label}: nombre non fini`);return;}
 if(typeof value==='boolean')return;
 if(Array.isArray(value)){list(value,label);value.forEach((item,index)=>meaningful(item,`${label}[${index}]`));return;}
 object(value,label);if(!Object.keys(value).length)throw Error(`${label}: objet vide`);
 if(value.status==='unresolved'){keys(value,['status','reason'],[],label);text(value.reason,label);return;}
 for(const [key,item]of Object.entries(value)){if(item===null)throw Error(`${label}.${key}: null interne sans raison`);meaningful(item,`${label}.${key}`);}
}

/** Source decomposition only. No source record grants runtime integration or certification. */
export function buildDivineClauses(corpus,e1,pages,source,runtime,{root=process.cwd()}={}){
 keys(source,['schemaVersion','scope','bookId','fileSha256','readers','review','commonClauses','blessings','associations','openQuestions'],[],'source');
 if(source.schemaVersion!==1||source.scope!=='L06-base-blessings'||source.bookId!=='L06')throw Error('Version ou périmètre E2 inconnu');
 const book=corpus.books?.find(row=>row.id===source.bookId);
 if(!book||source.fileSha256.toLowerCase()!==book.sha256.toLowerCase())throw Error('Empreinte source différente du corpus');
 const pageMap=new Map(pages.pages.map(page=>[`${page.bookId}:${page.physicalPage}`,page]));
 const evidence=path=>{
  text(path,'evidencePath');if(isAbsolute(path)||/^[a-z]:|^[/\\]/i.test(path))throw Error(`Preuve hors checkout: chemin relatif requis (${path})`);
  const inside=absolute=>{const rel=relative(realpathSync(root),absolute);return rel!==''&&!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel);};
  if(!inside(resolve(root,path)))throw Error(`Preuve hors racine du checkout: ${path}`);
  let content;try{const actual=realpathSync(resolve(root,path));if(!inside(actual))throw Error('outside');content=readFileSync(actual,'utf8');}catch(error){if(error.message==='outside')throw Error(`Preuve hors checkout par lien: ${path}`);throw Error(`Preuve illisible: ${path}`);}
  if(!content.trim()||content.includes('\uFFFD'))throw Error(`Preuve UTF-8 vide/invalide: ${path}`);
 };
 const readers=list(source.readers,'readers');distinct(readers.map(row=>row.reader),'lecteurs');distinct(readers.map(row=>row.role),'rôles');
 for(const reader of readers){keys(reader,['reader','role','evidencePath'],[],'reader');text(reader.reader,'reader');if(!['first','independent'].includes(reader.role))throw Error('Rôle lecteur inconnu');evidence(reader.evidencePath);}
 keys(source.review,['status','reviewer','evidencePath'],[],'review');
 if(!['draft','reviewed'].includes(source.review.status))throw Error('Statut review inconnu');
 if(source.review.status==='reviewed'){
  const independent=readers.find(row=>row.role==='independent');
  if(!independent||!readers.some(row=>row.role==='first')||source.review.reviewer!==independent.reader)throw Error('Revue exige deux lecteurs distincts et le contrôleur indépendant');
  evidence(source.review.evidencePath);
 }else if(source.review.reviewer!==null||source.review.evidencePath!==null)throw Error('Une ébauche ne peut porter un verdict de revue');
 const sourceRefs=(refs,label)=>{for(const ref of list(refs,label)){
  keys(ref,['bookId','fileSha256','physicalPage','printedPage','section'],[],label);
  if(ref.bookId!==book.id||String(ref.fileSha256).toLowerCase()!==book.sha256.toLowerCase())throw Error(`${label}: livre/empreinte invalide`);
  if(!Number.isInteger(ref.physicalPage)||ref.physicalPage<1||ref.physicalPage>book.physicalPages)throw Error(`${label}: page invalide`);
  text(ref.section,`${label}.section`);const page=pageMap.get(`${ref.bookId}:${ref.physicalPage}`);
  if(!page||page.firstReading?.status==='not-explored'||page.firstReading?.classification==='visual-pending')throw Error(`${label}: source sans lecture E1 effective`);
  if(ref.printedPage!==page.printedPage||!Number.isInteger(ref.printedPage))throw Error(`${label}: folio non attesté`);
  if(source.review.status==='reviewed'&&!page.verified)throw Error(`${label}: revue indépendante E1 non close`);
 }};
 const semantic=['trigger','preconditions','inputs','operation','failure','duration','stacking','limitations','dependencies'];
 const allClauses=[],clauseIds=new Set();
 const validateClause=(clause,owner)=>{
  keys(clause,['id','kind','summaryFr','sourceRefs',...semantic,'notApplicable'],[],`clause ${owner}`);
  text(clause.id,'clause.id');if(clauseIds.has(clause.id))throw Error(`Clause dupliquée: ${clause.id}`);clauseIds.add(clause.id);
  if(!['mechanical','narrative'].includes(clause.kind))throw Error(`Clause ${clause.id}: kind inconnu`);
  text(clause.summaryFr,'summaryFr');sourceRefs(clause.sourceRefs,'clause.sourceRefs');object(clause.notApplicable,'notApplicable');
  for(const key of Object.keys(clause.notApplicable))if(!semantic.includes(key)||clause[key]!==null)throw Error(`Clause ${clause.id}: faux non-applicable ${key}`);
  for(const field of semantic)if(clause[field]===null)text(clause.notApplicable[field],`Clause ${clause.id}.${field}: motif non-applicable`);else meaningful(clause[field],`Clause ${clause.id}.${field}`);
  allClauses.push({...structuredClone(clause),identityId:owner,sourceStatus:source.review.status==='reviewed'?'independently-checked':'read',developmentStatus:'not-started',verificationStatus:'not-run'});
 };
 list(source.openQuestions,'openQuestions',false).forEach((q,i)=>meaningful(q,`openQuestions[${i}]`));
 list(source.commonClauses,'commonClauses').forEach(clause=>validateClause(clause,'L06:common:blessings'));
 const commonIds=source.commonClauses.map(row=>row.id);
 const expected=e1.identities.filter(row=>row.category==='blessing'&&row.bookId===book.id);
 const blessings=list(source.blessings,'blessings');exact(blessings.map(row=>row.id),expected.map(row=>row.id),'19 identités bénédictions');distinct(blessings.map(row=>row.id),'identités');
 const identities=blessings.map(blessing=>{
  keys(blessing,['id','canonicalName','frenchName','sourceRefs','commonClauseIds','parameters','clauses','openQuestions'],[],`blessing ${blessing.id}`);
  if(blessing.canonicalName!==expected.find(row=>row.id===blessing.id).canonicalName)throw Error('Nom canonique différent de E1');
  text(blessing.frenchName,'frenchName');sourceRefs(blessing.sourceRefs,'blessing.sourceRefs');
  exact(list(blessing.commonClauseIds,'commonClauseIds'),commonIds,'Clauses communes requises');distinct(blessing.commonClauseIds,'commonClauseIds');
  keys(blessing.parameters,['range','targets','duration'],[],'parameters');for(const field of ['range','targets','duration'])meaningful(blessing.parameters[field],`parameters.${field}`);
  list(blessing.openQuestions,'blessing.openQuestions',false).forEach((q,i)=>meaningful(q,`openQuestions[${i}]`));
  list(blessing.clauses,'blessing.clauses').forEach(clause=>validateClause(clause,blessing.id));
  const pending=unresolved(blessing)||unresolved(source.commonClauses)||source.openQuestions.length>0||blessing.openQuestions.length>0;
  const refs=(runtime.contracts||[]).filter(row=>row.type==='blessing'&&(row.canonicalName===blessing.canonicalName||row.canonicalName===`Blessing of ${blessing.canonicalName}`)).map(row=>({contractId:row.id,status:row.status,clauseValidation:'not-verified'}));
  return {...structuredClone(blessing),clauses:allClauses.filter(row=>row.identityId===blessing.id),clauseIds:blessing.clauses.map(row=>row.id).sort(),sourceDecomposition:pending?'open-questions':source.review.status==='reviewed'?'independently-reviewed':'draft',runtimeCoverage:{validatedClauses:0,existingContractReferences:refs}};
 });
 const associations=list(source.associations,'associations');const expectedAssociations=e1.associations.filter(row=>expected.some(identity=>identity.id===row.identityId));
 exact(associations.map(row=>row.id),expectedAssociations.map(row=>row.id),'60 associations');distinct(associations.map(row=>row.id),'associations');
 for(const row of associations){const expectedRow=expectedAssociations.find(item=>item.id===row.id);if(JSON.stringify(ordered(row))!==JSON.stringify(ordered(expectedRow)))throw Error(`Association ${row.id} différente de E1`);sourceRefs([row.sourceRef],'association.sourceRef');}
 const sorted=rows=>rows.sort((a,b)=>a.id.localeCompare(b.id,'en'));
 const counts={blessings:identities.length,associations:associations.length,commonClauses:source.commonClauses.length,effectClauses:allClauses.length-source.commonClauses.length,mechanicalClauses:allClauses.filter(row=>row.kind==='mechanical').length,narrativeClauses:allClauses.filter(row=>row.kind==='narrative').length,independentlyReviewedIdentities:identities.filter(row=>row.sourceDecomposition==='independently-reviewed').length,runtimeValidatedClauses:0};
 const output={schemaVersion:1,scope:source.scope,warning:'Décomposition source uniquement; ne ferme aucun livre ni les lots E1/E2/E7. Les dépendances restent à développer et valider.',bookId:book.id,fileSha256:book.sha256,readers:source.readers,review:source.review,counts,identities:sorted(identities),commonClauses:sorted(allClauses.filter(row=>row.identityId==='L06:common:blessings')),clauses:sorted(allClauses.filter(row=>row.identityId!=='L06:common:blessings')),associations:sorted(structuredClone(associations)),openQuestions:source.openQuestions};
 const escape=value=>String(value).replaceAll('|','\\|').replaceAll('\n',' ');
 const markdown=['# E2 — clauses des bénédictions du livre de base V5','',output.warning,'',`Lecture : ${source.review.status}. ${counts.blessings} bénédictions; ${counts.associations} associations; ${counts.commonClauses} clauses communes et ${counts.effectClauses} clauses propres. ${counts.runtimeValidatedClauses} clause validée en exécution.`,'','| Bénédiction | Clauses propres | Décomposition source | Contrats existants à recontrôler |','| --- | ---: | --- | --- |',...output.identities.map(row=>`| ${escape(row.frenchName)} | ${row.clauses.length} | ${row.sourceDecomposition} | ${row.runtimeCoverage.existingContractReferences.map(ref=>escape(ref.contractId+' ('+ref.status+')')).join(', ')||'Aucun'} |`),'','## Clauses communes','',...output.commonClauses.map(row=>`- ${row.id} : ${row.summaryFr}`),'','## Clauses propres','',...output.clauses.map(row=>`- ${row.id} : ${row.summaryFr} Dépendances : ${escape(JSON.stringify(row.dependencies))}.`),''].join('\n');
 return {json:JSON.stringify(output,null,2)+'\n',markdown,counts};
}

const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const invoked=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const same=process.platform==='win32'?projectRoot.toLowerCase()===resolve(process.cwd()).toLowerCase():projectRoot===resolve(process.cwd());
 if(!same)throw Error(`Refusing outside clause checkout. Run from ${projectRoot}`);
 const args=process.argv.slice(2);if(args.some(arg=>arg!=='--check')||args.length>1)throw Error('Usage: node tools/build-divine-clauses.mjs [--check]');
 const read=path=>JSON.parse(readFileSync(resolve(projectRoot,path),'utf8'));
 const {blessingClauseSource}=await import('../docs/divin/sources/L06-blessing-clauses.mjs');
 const result=buildDivineClauses(read('docs/divin/DIVIN_CORPUS_LIVRES.json'),read('docs/divin/DIVIN_AUDIT_CLAUSES.json'),read('docs/divin/DIVIN_AUDIT_PAGES.json'),blessingClauseSource,read('js/data/v5-divine-contracts.json'),{root:projectRoot});
 for(const [path,content]of [['docs/divin/DIVIN_CLAUSES_BENEDICTIONS.json',result.json],['docs/divin/DIVIN_CLAUSES_BENEDICTIONS.md',result.markdown]]){
  if(args.includes('--check')){if(readFileSync(resolve(projectRoot,path),'utf8')!==content)throw Error(`Sortie périmée: ${path}`);}else writeFileSync(resolve(projectRoot,path),content);
 }
 console.log(JSON.stringify(result.counts));
}
