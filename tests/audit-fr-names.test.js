import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAudit, buildSummary } from '../tools/audit/build-audit.mjs';
const root=import.meta.dirname+'/..';
const source={book:'L05',page:132,physicalPage:134,pdfSha256:'1ee2a2be032fe0a034b5670ac6ab5625ecc6804d25d7385a3f2614789a7d4f4a',label:'Ambidextre',scope:'Nom seulement.'};
const row={id:'F-L06-9001',book:'L06',page:114,chapter:'Talents',title:'Ambidextrous',titleFr:'Ambidextre',summary:'Ignore la pénalité de main secondaire.',mechanic:'modifier',status:'absent',coveredBy:null,toolRef:[],v5Proposal:null,notes:'Mécanique V5.',domain:'Talents',nameFrSource:source};
test('audit — le nom FR exige L05, son hash et le décalage de folio exact',()=>{
 assert.equal(validateAudit([row],root),true);
 for(const invalid of [{book:'L06'},{physicalPage:132},{pdfSha256:'0'.repeat(64)},{page:354,physicalPage:356},{label:''},{scope:''}])assert.throws(()=>validateAudit([{...row,nameFrSource:{...source,...invalid}}],root),/fran|français/i);
 assert.throws(()=>validateAudit([{...row,terminologyFr:[{...source,physicalPage:132}]}],root),/fran|français/i);
});
test('audit — la synthèse montre le renvoi de nom sans inventer une règle L05',()=>{
 const summary=buildSummary([row],[{id:'L05',file:'FR.pdf'},{id:'L06',file:'EN.pdf'}]);
 assert.match(summary,/L05 p\.132/);
 assert.match(summary,/noms français seulement/i);
 assert.match(summary,/L05 — FR.pdf \| 0/);
});
