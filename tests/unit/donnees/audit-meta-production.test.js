import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildSelectors, validateAudit, buildSummary } from '../../../tools/audit/build-audit.mjs';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { extractPages, parsePages } from '../../../tools/audit/extract-pages.mjs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { RULES } from '../../../js/data/rules.js';

describe('audit — sélecteurs couverts', () => {
const root=import.meta.dirname+'/../../..';
const row={id:'F-L06-9001',book:'L06',page:183,chapter:'Psychologie',title:'Fear',titleFr:'Peur',summary:'Renvoi au domaine déjà inventorié.',mechanic:'procedure',status:'absent',coveredBy:'docs/COURAGE_BRISE_INVENTAIRE.json#C0-L06-002',toolRef:[],v5Proposal:null,notes:'Référence antérieure.',domain:'Psychologie'};
test('audit — un renvoi déjà arbitré peut être exclu des nouvelles décisions avec sa raison explicite',()=>{
  const reference={...row,selectorEligible:false,selectorExclusionReason:'Décision et lots déjà portés par C0.'};
  assert.equal(buildSelectors([reference]).length,0);
  assert.equal(buildSelectors([row]).length,1,'un coveredBy seul ne masque pas une lacune nouvelle');
  assert.throws(()=>validateAudit([{...row,selectorEligible:false}],root),/exclusion/i);
  assert.throws(()=>validateAudit([{...reference,coveredBy:null}],root),/exclusion/i);
});
});

describe('audit — page vide', () => {
test('audit — une page sans texte est signalée sans certifier sa lecture ni interrompre les suivantes',()=>{
 const root=mkdtempSync(join(tmpdir(),'audit-empty-'));try{
 const path=join(root,'source.pdf');writeFileSync(path,'PDF');let calls=0;
 const rows=extractPages({root,book:{id:'L06',path,sha256:createHash('sha256').update('PDF').digest('hex'),physicalPages:2},pages:[1,2],runner:()=>({status:0,stdout:++calls===1?'\f':'Texte\f',stderr:''})});
 assert.equal(rows.length,2);assert.equal(rows[0].textEmpty,true);assert.equal(rows[0].read,false);assert.match(rows[0].inspectionRequired,/visuelle/);assert.equal(rows[1].textEmpty,false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
});

describe('audit — noms français', () => {
const root=import.meta.dirname+'/../../..';
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
});

describe('audit — extraction de pages et validation', () => {
const root = resolve(import.meta.dirname, '../../..');
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
});

describe('résumé d\'évaluation GLM', () => {
const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../tools/glm-eval-summary.mjs');

function runSummaryWithLog(logData) {
  const dir = mkdtempSync(join(tmpdir(), 'glm-eval-test-'));
  try {
    const logPath = join(dir, 'fake-eval.json');
    writeFileSync(logPath, JSON.stringify(logData, null, 2), 'utf8');
    return execFileSync(process.execPath, [scriptPath, '--log', logPath], { encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('glm-eval-summary : coût estimé b2_cout_usd * 0.92 / 7, moyenne hebdo Sonnet avec nombre de tâches mesurées, et coût réel cumulé connu', () => {
  const fakeLog = {
    abonnement: {
      valeur_1pct_hebdo_eur: 0.1,
      seuil_rentabilite: 0.5
    },
    reference_sonnet_b2: [
      { tache: 'ref-1', tokens: 100000, duree_s: 300 }
    ],
    cout_reel_note_20_10_soir: '17,03 EUR cumulés (console Mistral)',
    taches: [
      {
        id: 'glm-estime',
        voie: 'glm',
        famille: 'module-effets',
        b2_cout_usd: 0.7, // 0.7 * 0.92 / 7 = 0.092 EUR (estimé)
        b2_cout_reel_eur: null,
        duree_bout_en_bout_s: 60,
        reussite_premier_essai: true,
        code_correct_premier_essai: true,
        iterations: 0,
        lignes_livrees: 20,
        lignes_retouchees_par_claude: 0,
        reprise: false,
        verdict_qualite: '5'
      },
      {
        id: 'sonnet-1',
        voie: 'sonnet',
        famille: 'module-effets',
        b2_tokens: 50000,
        usage_hebdo_avant_apres: [10, 10], // 0 pt
        duree_bout_en_bout_s: 50,
        reussite_premier_essai: true,
        code_correct_premier_essai: true,
        iterations: 0,
        lignes_livrees: 10,
        lignes_retouchees_par_claude: 0,
        reprise: false,
        verdict_qualite: '5'
      },
      {
        id: 'sonnet-2',
        voie: 'sonnet',
        famille: 'module-effets',
        b2_tokens: 60000,
        usage_hebdo_avant_apres: [10, 10], // 0 pt
        duree_bout_en_bout_s: 55,
        reussite_premier_essai: true,
        code_correct_premier_essai: true,
        iterations: 0,
        lignes_livrees: 12,
        lignes_retouchees_par_claude: 0,
        reprise: false,
        verdict_qualite: '5'
      },
      {
        id: 'sonnet-3',
        voie: 'sonnet',
        famille: 'module-effets',
        b2_tokens: 140000,
        usage_hebdo_avant_apres: [10, 16], // 6 pt -> médiane serait 0, mais moyenne = (0+0+6)/3 = 2 pt
        duree_bout_en_bout_s: 120,
        reussite_premier_essai: true,
        code_correct_premier_essai: true,
        iterations: 0,
        lignes_livrees: 40,
        lignes_retouchees_par_claude: 0,
        reprise: false,
        verdict_qualite: '5'
      },
      {
        id: 'sonnet-non-mesuree',
        voie: 'sonnet',
        famille: 'autre',
        b2_tokens: null,
        usage_hebdo_avant_apres: [null, null],
        duree_bout_en_bout_s: null,
        reussite_premier_essai: false,
        code_correct_premier_essai: true,
        iterations: 0,
        lignes_livrees: 5,
        lignes_retouchees_par_claude: 0,
        reprise: true,
        verdict_qualite: '4'
      }
    ]
  };

  const out = runSummaryWithLog(fakeLog);

  // 1. Coût réel cumulé connu (champ de note) à côté du plafond cumulé
  assert.match(out, /B2 coût plafond cumulé : 0\.70 USD.*17,03 EUR cumulés \(console Mistral\)/);

  // 2. Coût réel estimé d'une tâche GLM via b2_cout_usd * 0.92 / 7 (= 0.092 -> 0.09 €) affiché comme estimation
  assert.match(out, /GLM médian 0\.09 € \(estimation\)/);

  // 3. Moyenne des points hebdomadaires Sonnet ((0 + 0 + 6) / 3 = 2 pt sur 3 tâches mesurées) et non médiane (0 pt)
  assert.match(out, /2 pt de % hebdo.*3 tâche\(s\) mesurée\(s\)/);
  assert.match(out, /\bRENTABLE\b/);
  assert.doesNotMatch(out, /NON RENTABLE/);
});

test('glm-eval-summary : privilégie b2_cout_reel_eur quand il est renseigné', () => {
  const fakeLog = {
    abonnement: {
      valeur_1pct_hebdo_eur: 0.1,
      seuil_rentabilite: 0.5
    },
    reference_sonnet_b2: [
      { tache: 'ref-1', tokens: 100000, duree_s: 300 }
    ],
    cout_reel_note_20_10_soir: '0,25 EUR cumulés',
    taches: [
      {
        id: 'glm-reel',
        voie: 'glm',
        famille: 'module-effets',
        b2_cout_usd: 3.5, // fallback donnerait 0.46 €, mais b2_cout_reel_eur = 0.25 € doit primer
        b2_cout_reel_eur: 0.25,
        duree_bout_en_bout_s: 60,
        reussite_premier_essai: true,
        code_correct_premier_essai: true,
        iterations: 0,
        lignes_livrees: 15,
        lignes_retouchees_par_claude: 0,
        reprise: false,
        verdict_qualite: '5'
      },
      {
        id: 'sonnet-1',
        voie: 'sonnet',
        famille: 'module-effets',
        b2_tokens: 50000,
        usage_hebdo_avant_apres: [20, 22], // 2 pt sur 1 tâche mesurée
        duree_bout_en_bout_s: 50,
        reussite_premier_essai: true,
        code_correct_premier_essai: true,
        iterations: 0,
        lignes_livrees: 10,
        lignes_retouchees_par_claude: 0,
        reprise: false,
        verdict_qualite: '5'
      }
    ]
  };

  const out = runSummaryWithLog(fakeLog);
  assert.match(out, /GLM médian 0\.25 € contre/);
  assert.doesNotMatch(out, /0\.25 € \(estimation\)/);
  assert.match(out, /2 pt de % hebdo.*1 tâche\(s\) mesurée\(s\)/);
  assert.match(out, /NON RENTABLE/);
});
});

describe('règles Firebase de production', () => {
const rules = JSON.parse(readFileSync(new URL('../../../firebase.database.rules.json', import.meta.url), 'utf8')).rules;

test('règles de production isolent v1 et v2 en lecture seule, v3 par UID et schéma', () => {
  const v1 = rules['wfrp-sessions'].$uid;
  assert.match(v1['.read'], /auth != null && auth\.uid === \$uid/);
  assert.equal(v1['.write'], false);

  const v2 = rules['wfrp-sessions-v2'].$uid.current;
  assert.match(v2['.read'], /auth != null && auth\.uid === \$uid/);
  assert.equal(v2['.write'], false);
  const v3 = rules['wfrp-sessions-v3'].$uid.current;
  assert.match(v3['.write'], /auth != null && auth\.uid === \$uid/);
  assert.match(v3['.write'], /newData\.hasChildren\(\['revision', 'state'\]\)/);
  assert.match(v3['.write'], /newData\.child\('revision'\)\.isNumber\(\)/);
  assert.match(v3['.write'], /newData\.child\('revision'\)\.val\(\) >= data\.child\('revision'\)\.val\(\)/);
  assert.equal(rules['.read'], undefined);
  assert.equal(rules['.write'], undefined);
});
});

describe('règles du jeu (RULES)', () => {
test('RULES — Intégrité des données', () => {
  assert.equal(RULES.length, 5); // 5 blocs principaux
  const ids = RULES.map(r => r.id);
  assert.deepEqual(ids, ['localisation', 'sante', 'magie', 'psychologie', 'corruption']);

  RULES.forEach(rule => {
    assert.ok(rule.id && typeof rule.id === 'string');
    assert.ok(rule.title && typeof rule.title === 'string');
    assert.ok(Array.isArray(rule.sections));
  });
});

test('RULES — Recherche de termes', () => {
  function searchRules(term) {
    const clean = term.toLowerCase();
    return RULES.filter(block => {
      let text = (block.title || '') + ' ' + (block.intro || '') + ' ';
      if (block.sections) {
        block.sections.forEach(sec => {
          text += (sec.h4 || '') + ' ' + (sec.p || '') + ' ' + (sec.example || '') + ' ' + (sec.pAfter || '') + ' ';
          if (sec.ul) text += sec.ul.join(' ') + ' ';
          if (sec.ol) text += sec.ol.join(' ') + ' ';
          if (sec.table) text += sec.table.map(r => r.jet + ' ' + r.loc).join(' ') + ' ';
          if (sec.subSections) {
            sec.subSections.forEach(sub => {
              text += (sub.title || '') + ' ' + (sub.p || '') + ' ';
              if (sub.ul) text += sub.ul.join(' ') + ' ';
            });
          }
        });
      }
      return text.toLowerCase().includes(clean);
    });
  }

  // Chercher 'Brisé' -> remonte Peur & Terreur
  const briseResults = searchRules('brisé').map(r => r.id);
  assert.ok(briseResults.includes('psychologie'));

  // Chercher 'Corruption' -> remonte corruption
  const corruptResults = searchRules('corruption').map(r => r.id);
  assert.ok(corruptResults.includes('corruption'));

  // Terme inconnu -> 0 résultat
  const emptyResults = searchRules('xyzunexistingterm123');
  assert.equal(emptyResults.length, 0);
});
});

describe('service worker — liste de précache', () => {
// Le service worker liste à la main les fichiers de la coquille applicative.
// cache.addAll() rejette EN BLOC si un seul chemin est faux : l'installation échoue,
// le worker ne s'active jamais, et il n'y a plus aucun mode hors-ligne — sans erreur
// visible, puisque register() réussit malgré tout.
// Ce test vérifie que la liste et l'arborescence réelle concordent, dans les deux sens.

const racine = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const sw = readFileSync(join(racine, 'sw.js'), 'utf8');

const listés = [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);

// .json compris : le lot 13 ajoutera un instantané de mots-clés sous js/data/,
// qui doit être mis en cache comme le reste de la coquille.
function modulesDuDisque(rel) {
  const abs = join(racine, rel);
  return readdirSync(abs).flatMap(nom => {
    const chemin = join(abs, nom);
    if (statSync(chemin).isDirectory()) return modulesDuDisque(`${rel}/${nom}`);
    return /\.(js|json)$/.test(nom) ? [`${rel}/${nom}`] : [];
  });
}

test('sw.js — tous les fichiers listés existent réellement', () => {
  const absents = listés.filter(f => !existsSync(join(racine, f)));
  assert.deepEqual(absents, [],
    `cache.addAll() rejetterait en bloc et le service worker ne s'activerait pas : ${absents.join(', ')}`);
});

test('sw.js — tous les modules de js/ sont mis en cache', () => {
  const oubliés = modulesDuDisque('js').filter(f => !listés.includes(f));
  assert.deepEqual(oubliés, [],
    `ces modules ne seraient pas disponibles hors ligne à froid : ${oubliés.join(', ')}`);
});

test('sw.js — le cache est versionné et purgé à l\'activation', () => {
  assert.match(sw, /CACHE_NAME\s*=\s*['"][^'"]*\d+\.\d+/, 'le nom du cache doit porter une version');
  assert.match(sw, /caches\.keys\(\)/, 'les anciens caches doivent être énumérés');
  assert.match(sw, /caches\.delete\(/, 'et supprimés à l\'activation');
});

test('sw.js — Firebase et gstatic ne sont jamais servis depuis le cache en priorité', () => {
  // Le §13.2 l'exige : la couche localStorage gère déjà la persistance, un doublon
  // de cache produirait des incohérences pénibles à diagnostiquer.
  const bloc = sw.slice(sw.indexOf("addEventListener('fetch'"));
  const posReseau = bloc.search(/hostname\.includes\(['"]firebase/);
  const posCache = bloc.search(/caches\.match/);
  assert.ok(posReseau > -1, 'un traitement dédié à Firebase doit exister');
  assert.ok(posReseau < posCache, 'et passer avant la stratégie cache-first');
});

test('index.html — la coquille référencée est bien mise en cache', () => {
  const html = readFileSync(join(racine, 'index.html'), 'utf8');
  const locales = [...html.matchAll(/(?:href|src)="(?!https?:|data:|#)([^"]+)"/g)]
    .map(m => m[1].replace(/^\.\//, ''))
    .filter(f => /\.(css|js|svg|webmanifest)$/.test(f));
  const oubliées = locales.filter(f => !listés.includes(f) && f !== 'sw.js');
  assert.deepEqual(oubliées, [], `référencées par index.html mais hors cache : ${oubliées.join(', ')}`);
});
});
