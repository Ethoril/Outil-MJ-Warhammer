/**
 * Extraction des profils des livres du corpus (L01-L26) : texte « layout » des PDF -> blocs -> profils structurés.
 * Les PDF restent hors du dépôt (chemins du manifeste du corpus) ; les générateurs qui s'en servent se lancent en local.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pageBlocks, setLenient } from './bestiary-blocks.mjs';
import { parseBlock } from './bestiary-profile.mjs';
import { repairGlyphs } from './bestiary-glyphs.mjs';
import { CELL_OVERRIDES, BODY_OVERRIDES } from './bestiary-overrides.mjs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
export const corpusBooks = () => [...read('docs/divin/DIVIN_CORPUS_LIVRES.json').books, ...read('docs/divin/DIVIN_CORPUS_LIVRES_COMPLEMENT.json').books];

/** Dictionnaires de noms (Traits de l'inventaire, talents du catalogue) servant à lire les listes « Nom : clause ». */
export function dictionaries() {
  const inventory = read('docs/BESTIAIRE_INVENTAIRE.json');
  return {
    // « Regenerate: » (V4, L09 p. 46) est la Régénération de l'inventaire.
    traitDictionary: new Set([...inventory.traits.filter(t => t.kind === 'trait').map(t => t.name.replace(/\s*\(.*\)\s*$/, '').trim()), 'Regenerate']),
    talentDictionary: new Set(read('js/data/reference-snapshot.json').talents.entries.map(t => t.englishName).filter(Boolean))
  };
}

/** Texte layout d'un livre, une chaîne par page physique. */
export function bookPages(book) {
  return repairGlyphs(execFileSync('pdftotext', ['-layout', book.path, '-'], { maxBuffer: 1 << 28 }).toString('utf8')).split('\f');
}

/** Profils des livres demandés : [{ key, book, physicalPage, index, zone, title, stats, … }] et lignes de valeurs à confirmer. */
export function extractProfiles(ids, { keepBody = false } = {}) {
  const dict = dictionaries();
  const profiles = [];
  const approximate = [];
  for (const book of corpusBooks().filter(item => ids.includes(item.id))) {
    setLenient(!['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L09', 'L10', 'L11', 'L12', 'L13', 'L14'].includes(book.id));
    bookPages(book).forEach((page, pageIndex) => {
      pageBlocks(page).forEach((block, index) => {
        const key = `${book.id}:${pageIndex + 1}:${index}`;
        const override = CELL_OVERRIDES[key];
        if (BODY_OVERRIDES[key]) { block.bodyLines = BODY_OVERRIDES[key]; block.body = BODY_OVERRIDES[key].join(' '); }
        if (override) block.cells = override.cells.slice();
        else if (block.approximate) approximate.push({ key, title: block.title, tokens: block.tokens });
        const { profile } = parseBlock(block, dict);
        profiles.push({ key, zone: block.zone, book: book.id, physicalPage: pageIndex + 1, index, ...profile, ...(block.approximate && !override ? { approximate: true } : {}), ...(keepBody ? { _body: block.body } : {}) });
      });
    });
  }
  return { profiles, approximate };
}
