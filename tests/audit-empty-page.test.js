import test from 'node:test';
import assert from 'node:assert/strict';
import{mkdtempSync,writeFileSync,rmSync}from'node:fs';
import{tmpdir}from'node:os';import{join}from'node:path';import{createHash}from'node:crypto';
import{extractPages}from'../tools/audit/extract-pages.mjs';
test('audit — une page sans texte est signalée sans certifier sa lecture ni interrompre les suivantes',()=>{
 const root=mkdtempSync(join(tmpdir(),'audit-empty-'));try{
 const path=join(root,'source.pdf');writeFileSync(path,'PDF');let calls=0;
 const rows=extractPages({root,book:{id:'L06',path,sha256:createHash('sha256').update('PDF').digest('hex'),physicalPages:2},pages:[1,2],runner:()=>({status:0,stdout:++calls===1?'\f':'Texte\f',stderr:''})});
 assert.equal(rows.length,2);assert.equal(rows[0].textEmpty,true);assert.equal(rows[0].read,false);assert.match(rows[0].inspectionRequired,/visuelle/);assert.equal(rows[1].textEmpty,false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
