import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { extractPages, parsePages } from '../tools/audit/extract-pages.mjs';
import { validateAudit, buildSelectors } from '../tools/audit/build-audit.mjs';

const root = resolve(import.meta.dirname, '..');
const row = overrides => ({ id:'F-L06-0001', book:'L06', page:130, chapter:'Tests', title:'Repeating Tests', titleFr:'Répéter un Test', summary:'Attendre un changement des circonstances avant de recommencer.', mechanic:'procedure', domain:'Tests', status:'absent', coveredBy:null, toolRef:[], v5Proposal:null, notes:'Recherche sans flux dédié.', ...overrides });

test('audit — extraction unitaire, page physique distincte du folio, empreinte vérifiée', () => {
  const base=mkdtempSync(join(tmpdir(),'audit-pages-'));
  try {
    const pdf=join(base,'source.pdf'); writeFileSync(pdf,'dummy PDF');
    const hash=createHash('sha256').update(readFileSync(pdf)).digest('hex');
    const book={id:'L06',path:pdf,sha256:hash,physicalPages:400};
    const calls=[];
    const receipts=extractPages({root:base,book,pages:[130,131],runner:(cmd,args)=>{calls.push(args);return {status:0,stdout:'Page cible\f',stderr:''};}});
    assert.equal(calls.length,2);
    assert.deepEqual(calls[0],['-layout','-enc','UTF-8','-f','130','-l','130',pdf,'-']);
    assert.equal(receipts[0].physicalPage,130);
    assert.equal(receipts[0].printedPage,null,'le folio ne se déduit pas du numéro physique');
    assert.equal(receipts[0].pdfSha256,hash);
    assert.equal(readFileSync(join(base,'tmp/audit/L06/p0130.txt'),'utf8'),'Page cible\f');
    assert.equal(receipts[0].read,false,'extraire ne certifie pas une lecture');
    assert.equal(receipts[0].visualChecked,false);
  } finally { rmSync(base,{recursive:true,force:true}); }
});

test('audit — page hors corpus, traversée et empreinte différente sont refusées avant Poppler', () => {
  const base=mkdtempSync(join(tmpdir(),'audit-guard-'));
  try {
    const pdf=join(base,'source.pdf');writeFileSync(pdf,'PDF');
    const book={id:'L06',path:pdf,sha256:'0'.repeat(64),physicalPages:10};
    const runner=()=>{throw Error('ne doit pas être appelé');};
    assert.throws(()=>extractPages({root:base,book,pages:[11],runner}),/page/i);
    assert.throws(()=>extractPages({root:base,book:{...book,id:'../../outside'},pages:[1],runner}),/livre/i);
    assert.throws(()=>extractPages({root:base,book,pages:[1],runner}),/empreinte/i);
    assert.throws(()=>parsePages('1-99999'),/plage/i);
    assert.deepEqual(parsePages('3,1-2,2'),[1,2,3]);
  } finally { rmSync(base,{recursive:true,force:true}); }
});

test('audit — erreur de lecture propagée, aucun faux reçu de lecture', () => {
  const base=mkdtempSync(join(tmpdir(),'audit-poppler-'));
  try {
    const pdf=join(base,'source.pdf');writeFileSync(pdf,'PDF');
    const book={id:'L06',path:pdf,sha256:createHash('sha256').update('PDF').digest('hex'),physicalPages:1};
    assert.throws(()=>extractPages({root:base,book,pages:[1],runner:()=>({status:1,stderr:'PDF illisible'})}),/PDF illisible/);
  } finally { rmSync(base,{recursive:true,force:true}); }
});

test('audit — rejette doublons, résumé long, domaine vide et statut inventé', () => {
  assert.throws(()=>validateAudit([row(),row()],root),/doublon/i);
  assert.throws(()=>validateAudit([row({summary:'x'.repeat(301)})],root),/300/);
  assert.throws(()=>validateAudit([row({domain:''})],root),/domain/);
  assert.throws(()=>validateAudit([row({status:'fini'})],root),/statut/i);
});

test('audit — couverture exige un chemin local existant et un symbole réel', () => {
  assert.throws(()=>validateAudit([row({status:'automatise',toolRef:[]})],root),/preuve/i);
  assert.throws(()=>validateAudit([row({status:'automatise',toolRef:['js/core/v5-roll.js#symboleInventé']})],root),/symbole/i);
  assert.throws(()=>validateAudit([row({status:'assiste',toolRef:['../outside.js#x']})],root),/locale/i);
  assert.doesNotThrow(()=>validateAudit([row({status:'automatise',toolRef:['js/core/v5-roll.js#previewV5Test']})],root));
});

test('audit — coveredBy doit identifier une entrée existante, pas seulement un fichier', () => {
  assert.throws(()=>validateAudit([row({coveredBy:'docs/COURAGE_BRISE_INVENTAIRE.json#absent-id'})],root),/coveredBy/i);
  assert.doesNotThrow(()=>validateAudit([row({coveredBy:'docs/COURAGE_BRISE_INVENTAIRE.json#C0-L06-001'})],root));
});

test('audit — sélecteurs exactement égaux aux lacunes jouables, format de la page et langage joueur', () => {
  const input=[row(),row({id:'F-L06-0002',status:'rappel',titleFr:'Aide collective'}),row({id:'F-L06-0003',status:'hors-granularite'}),row({id:'F-L06-0004',status:'automatise'})];
  const selectors=buildSelectors(input);
  assert.deepEqual(selectors.map(s=>s.id),['F-L06-0001','F-L06-0002']);
  assert.equal(selectors[0].source,'L06 p.130');
  assert.equal(selectors[0].choix,'Implanter, version complète');
  assert.deepEqual(selectors[0].alternatives,['Implanter, version adaptée (préciser)','Ne pas implanter']);
  assert.equal(selectors[0].statut,'ouvert');
  assert.equal(selectors[0].phase,'Tests');
  assert.doesNotMatch(selectors[0].question,/F-L06|js\/|preview/);
});
