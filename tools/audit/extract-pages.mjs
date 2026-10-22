/** F0: targeted Poppler extraction. Raw text/receipts stay untracked in tmp/audit. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const hash = value => createHash('sha256').update(value).digest('hex');
export function parsePages(input) {
  if(typeof input!=='string'||!input)throw Error('Pages explicites requises');
  const result=new Set();
  for(const part of input.split(',')) {
    if(!/^\d+(?:-\d+)?$/.test(part))throw Error('Plage de pages invalide');
    const [a,b=a]=part.split('-').map(Number);
    if(a<1||b<a||b>5000||b-a>1000)throw Error('Plage de pages invalide');
    for(let n=a;n<=b;n++)result.add(n);
  }
  return [...result].sort((a,b)=>a-b);
}
export function extractPages({root,book,pages,pdftotext=process.env.PDFTOTEXT||'C:/Program Files/Git/mingw64/bin/pdftotext.exe',runner=spawnSync}) {
  if(!/^L\d{2}$/.test(book?.id))throw Error('Identité de livre invalide');
  if(!Array.isArray(pages)||!pages.length||pages.some(p=>!Number.isInteger(p)||p<1||p>book.physicalPages))throw Error('Page hors corpus');
  const pdfSha256=hash(readFileSync(book.path));
  if(pdfSha256!==book.sha256.toLowerCase())throw Error('Empreinte PDF différente du manifeste : '+book.id);
  const output=join(resolve(root),'tmp','audit',book.id);mkdirSync(output,{recursive:true});
  return [...new Set(pages)].map(physicalPage=>{
    const result=runner(pdftotext,['-layout','-enc','UTF-8','-f',String(physicalPage),'-l',String(physicalPage),book.path,'-'],{encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});
    if(result.status!==0||result.error)throw Error('Extraction '+book.id+' p.phys.'+physicalPage+' : '+(result.error?.message||result.stderr||'échec Poppler'));
    const text=result.stdout||'';
    const textEmpty=!text.trim();
    const stem='p'+String(physicalPage).padStart(4,'0');
    const receipt={book:book.id,pdfSha256,physicalPage,printedPage:null,textSha256:hash(text),textEmpty,inspectionRequired:textEmpty?'vérification visuelle requise':null,read:false,visualChecked:false,warnings:result.stderr||'',command:['pdftotext','-layout','-enc','UTF-8','-f',physicalPage,'-l',physicalPage,book.path,'-']};
    writeFileSync(join(output,stem+'.txt'),text,'utf8');
    writeFileSync(join(output,stem+'.json'),JSON.stringify(receipt,null,2)+'\n');
    return receipt;
  });
}
const root=resolve(import.meta.dirname,'../..');
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(resolve(process.cwd())!==root)throw Error('Exécuter depuis le checkout de l’audit');
  const value=flag=>process.argv[process.argv.indexOf(flag)+1];
  if(!process.argv.includes('--book')||!process.argv.includes('--pages'))throw Error('Usage : --book Lxx --pages 129-133,266');
  const books=['DIVIN_CORPUS_LIVRES.json','DIVIN_CORPUS_LIVRES_COMPLEMENT.json'].flatMap(file=>JSON.parse(readFileSync(join(root,'docs/divin',file),'utf8')).books);
  const book=books.find(b=>b.id===value('--book'));if(!book)throw Error('Livre hors corpus');
  const receipts=extractPages({root,book,pages:parsePages(value('--pages'))});
  console.log(JSON.stringify({book:book.id,pdfSha256:receipts[0].pdfSha256,pagesExtracted:receipts.map(p=>p.physicalPage),read:false}));
}
