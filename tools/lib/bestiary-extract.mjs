/**
 * Extraction des profils des livres du corpus (L01-L26) : texte « layout » des PDF -> blocs -> profils structurés.
 * Les PDF restent hors du dépôt (chemins du manifeste du corpus) ; les générateurs qui s'en servent se lancent en local.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pageBlocks, setLenient } from './bestiary-blocks.mjs';
import { parseBlock } from './bestiary-profile.mjs';
import { repairGlyphs } from './bestiary-glyphs.mjs';
import { CELL_OVERRIDES, BODY_OVERRIDES, BODY_LINE_FIXES, TRAITS_KEPT_AS_RULES } from './bestiary-overrides.mjs';
import { frenchPage, translateFrenchBody } from './bestiary-french.mjs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
// docs/BESTIAIRE_CORPUS_LIVRES.json : livres ajoutés pour le seul bestiaire (L28…), les manifestes divins étant scellés.
export const corpusBooks = () => [...read('docs/divin/DIVIN_CORPUS_LIVRES.json').books, ...read('docs/divin/DIVIN_CORPUS_LIVRES_COMPLEMENT.json').books, ...read('docs/BESTIAIRE_CORPUS_LIVRES.json').books];

/** Dictionnaires de noms (Traits de l'inventaire, talents du catalogue) servant à lire les listes « Nom : clause ». */
export function dictionaries() {
  const inventory = read('docs/BESTIAIRE_INVENTAIRE.json');
  return {
    // « Regenerate: » (V4, L09 p. 46) est la Régénération de l'inventaire.
    traitDictionary: new Set([...inventory.traits.filter(t => t.kind === 'trait').map(t => t.name.replace(/\s*\(.*\)\s*$/, '').trim()), 'Regenerate', ...TRAITS_KEPT_AS_RULES]),
    // « Trick Riding » : nom imprimé du talent Trick Rider (Forest Goblin L11, Scorath L09 p. 103), gardé tel qu'imprimé comme au lot Q26.
    talentDictionary: new Set([...read('js/data/reference-snapshot.json').talents.entries.map(t => t.englishName).filter(Boolean), 'Trick Riding', 'Resistance'])
  };
}

/** Texte layout d'un livre, une chaîne par page physique. */
export function bookPages(book) {
  // Livre français : sortie UTF-8 explicite (accents) ; les autres livres gardent la sortie par défaut, inchangée.
  const encoding = book.language === 'fr' ? ['-enc', 'UTF-8'] : [];
  return repairGlyphs(execFileSync('pdftotext', [...encoding, '-layout', book.path, '-'], { maxBuffer: 1 << 28 }).toString('utf8')).split('\f');
}

/** Profils des livres demandés : [{ key, book, physicalPage, index, zone, title, stats, … }] et lignes de valeurs à confirmer. */
export function extractProfiles(ids, { keepBody = false } = {}) {
  const dict = dictionaries();
  const profiles = [];
  const approximate = [];
  for (const book of corpusBooks().filter(item => ids.includes(item.id))) {
    setLenient(!['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L09', 'L10', 'L11', 'L12', 'L13', 'L14'].includes(book.id));
    // Livre français (L28) : page mise au format anglais à géométrie égale, noms des listes traduits après les corrections relues.
    const french = book.language === 'fr';
    bookPages(book).forEach((page, pageIndex) => {
      pageBlocks(french ? frenchPage(page) : page).forEach((block, index) => {
        const key = `${book.id}:${pageIndex + 1}:${index}`;
        const override = CELL_OVERRIDES[key];
        if (BODY_OVERRIDES[key]) { block.bodyLines = BODY_OVERRIDES[key]; block.body = BODY_OVERRIDES[key].join(' '); }
        // Corrections ponctuelles de lignes (mot du nom mangé par la colonne voisine) : [ligne lue, ligne relue sur la page].
        for (const [from, to] of BODY_LINE_FIXES[key] || []) {
          block.bodyLines = block.bodyLines.map(line => (line === from ? to : line));
          block.body = block.bodyLines.join(' ');
        }
        if (french) { block.bodyLines = translateFrenchBody(block.bodyLines); block.body = block.bodyLines.join(' '); }
        if (override) block.cells = override.cells.slice();
        else if (block.approximate) approximate.push({ key, title: block.title, tokens: block.tokens });
        const { profile } = parseBlock(block, dict);
        profiles.push({ key, zone: block.zone, book: book.id, physicalPage: pageIndex + 1, index, ...profile, ...(block.approximate && !override ? { approximate: true } : {}), ...(keepBody ? { _body: block.body } : {}) });
      });
    });
  }
  return { profiles, approximate };
}
