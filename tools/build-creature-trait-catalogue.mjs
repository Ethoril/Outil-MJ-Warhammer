#!/usr/bin/env node
// Génère js/data/creature-trait-catalogue.js : catalogue des Traits de créature (chantier des Traits optionnels, lot L1).
// Un Trait par nom anglais du bestiaire (traits et traits facultatifs de js/data/bestiary/*.json), plus « Stubborn » (L23 p. 22, D15).
// Sources : docs/BESTIAIRE_INVENTAIRE.json (nom français, texte d'effet, livre, page) et les profils du bestiaire (nature du paramètre).
//
//   node tools/build-creature-trait-catalogue.mjs            écrit le module
//   node tools/build-creature-trait-catalogue.mjs --check    n'écrit rien ; code 1 si le module manque ou a dérivé
//
// Nature du paramètre (D12) : none (aucun), rating (indice ou valeur chiffrée : Peur 2, Morsure +9), text (précision en texte),
// size (une Taille), trained (un ou plusieurs dressages), hatred (Haine de…). Le module généré n'importe rien.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const OUT = 'js/data/creature-trait-catalogue.js';
const COMMAND = 'node tools/build-creature-trait-catalogue.mjs';
const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Noms français du Livre de base français (V4, L05 pp. 338-341) : l'inventaire inverse Hardy et Tough (valeurs-traits.md, question 6). */
const FR_LIVRE_DE_BASE = {
  Big: 'Grand', Brute: 'Brutal', Clever: 'Intelligent', Cunning: 'Rusé', Elite: 'Élite', Fast: 'Rapide', Leader: 'Meneur',
  Tough: 'Coriace', Hardy: 'Endurant', Trained: 'Dressé'
};
/** Noms français proposés quand l'inventaire n'en donne pas ; `nameFrSource` vaut alors « proposition ». */
const FR_PROPOSES = {
  'Stationary Attacker': 'Attaquant statique', Burrow: 'Fouissage', Engulf: 'Engloutissement', Disruption: 'Perturbation', Stubborn: 'Têtu'
};
/** Nom français retouché : l'inventaire ajoute des mentions de travail ou un suffixe propre à un profil. */
const FR_RETOUCHES = {
  Sprinter: 'Foulée (Sprinter)', Fearless: 'Sans peur', Afraid: 'Effrayé', Shield: 'Bouclier', Shapeshifter: 'Métamorphe',
  'Creature Weapons': 'Armes naturelles', 'Companion Trait': 'Trait de compagnon'
};
/** Trait absent de l'inventaire : texte d'effet rédigé pour l'outil (L23 p. 22), paraphrase courte. */
const HORS_INVENTAIRE = {
  Stubborn: { ref: null, book: 'L23', page: 22, summaryFr: 'Volonté +20 ; mener la bête exige un test opposé (Monte ou Conduite contre Volonté) ; en cas d\'échec elle s\'arrête net, puis n\'avance qu\'à la moitié de l\'allure de marche.' }
};
/** Nature du paramètre quand la lecture des profils ne suffit pas. */
const PARAM_FORCE = { Size: 'size', Trained: 'trained', Hatred: 'hatred', Hardy: 'none', Stubborn: 'none', Stride: 'none',
  // Le paramètre lu sur les profils est une note de profil (déclencheur, exemple), pas une précision à saisir : aucun paramètre.
  'Dark Vision': 'none', Stupid: 'none', Distracting: 'none', Swarm: 'none', Unstable: 'none', 'Creature Weapons': 'rating', Breath: 'rating' };

const retouche = text => String(text).replace(/\s*\((traduction de travail|alias à valider|alias V5 à valider|nom V5 à valider)\)\s*$/u, '').trim();

/** Catalogue à partir de l'inventaire et des livres du bestiaire. */
export function buildCatalogue({ inventory, books }) {
  const byId = new Map(inventory.traits.map(trait => [trait.id, trait]));
  const seen = new Map();
  for (const book of books) {
    for (const profile of book.profiles) {
      for (const trait of [...(profile.traits || []), ...(profile.optionalTraits || [])]) {
        const row = seen.get(trait.name) || { ref: null, count: 0, withRating: 0, withParam: 0 };
        row.count += 1;
        if (trait.ref && !row.ref) row.ref = trait.ref;
        if (trait.rating !== undefined && trait.rating !== null && trait.rating !== '') row.withRating += 1;
        if (trait.param !== undefined && trait.param !== null && trait.param !== '') row.withParam += 1;
        seen.set(trait.name, row);
      }
    }
  }
  for (const name of Object.keys(HORS_INVENTAIRE)) if (!seen.has(name)) seen.set(name, { ref: null, count: 0, withRating: 0, withParam: 0 });
  const entries = [];
  for (const [name, row] of seen) {
    const extra = HORS_INVENTAIRE[name];
    const item = row.ref ? byId.get(row.ref) : null;
    if (!item && !extra) throw new Error(`Trait « ${name} » sans entrée d'inventaire ni texte propre`);
    let nameFr = FR_LIVRE_DE_BASE[name] || FR_RETOUCHES[name] || (item?.nameFr ? retouche(item.nameFr) : null);
    let nameFrSource;
    if (FR_LIVRE_DE_BASE[name] && name !== 'Trained') nameFrSource = { book: 'L05', page: { Brute: 338, Tough: 338, Big: 339, Elite: 339, Hardy: 339, Clever: 340, Leader: 340, Cunning: 341, Fast: 341 }[name] };
    else if (name === 'Trained') nameFrSource = { book: 'L05', page: 339 };
    else if (item?.nameFrSource && typeof item.nameFrSource === 'object' && nameFr) nameFrSource = item.nameFrSource;
    else nameFrSource = 'proposition';
    if (!nameFr) { nameFr = FR_PROPOSES[name]; nameFrSource = 'proposition'; }
    else if (FR_PROPOSES[name] && !item?.nameFr) nameFrSource = 'proposition';
    if (!nameFr) throw new Error(`Trait « ${name} » sans nom français`);
    let param = PARAM_FORCE[name];
    if (!param) param = row.count && row.withRating === row.count ? 'rating' : row.count && row.withParam === row.count ? 'text' : row.withRating ? 'rating' : row.withParam ? 'text' : 'none';
    entries.push({
      name, nameFr, nameFrSource, ref: row.ref || null, summaryFr: (extra?.summaryFr ?? item.summaryFr).trim(),
      book: extra?.book ?? item.book, page: extra?.page ?? item.page, param
    });
  }
  return entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Texte du module (LF, déterministe, sans import). */
export function renderModule(entries) {
  return [
    `// Fichier généré par ${COMMAND} : ne pas modifier à la main, régénérer par ${COMMAND}.`,
    '// Catalogue des Traits de créature (chantier des Traits optionnels) : un Trait par nom anglais du bestiaire, plus Stubborn (L23 p. 22).',
    '// `param` : none | rating | text | size | trained | hatred (D12). `nameFrSource` : livre et page du nom français, ou « proposition ». Aucun import.',
    `export const CREATURE_TRAIT_CATALOGUE = Object.freeze(${JSON.stringify(entries, null, 2)}.map(entry => Object.freeze(entry)));`,
    '',
    '/** Entrée du catalogue pour un nom (anglais exact, puis anglais ou français sans accent ni casse), ou null. */',
    'export function catalogueTraitOf(name) {',
    '  const text = String(name ?? \'\').trim();',
    '  if (!text) return null;',
    '  const exact = CREATURE_TRAIT_CATALOGUE.find(entry => entry.name === text);',
    '  if (exact) return exact;',
    '  const fold = value => String(value).normalize(\'NFD\').replace(/[\\u0300-\\u036f]/g, \'\').toLowerCase().trim();',
    '  const key = fold(text);',
    '  return CREATURE_TRAIT_CATALOGUE.find(entry => fold(entry.name) === key || fold(entry.nameFr) === key) || null;',
    '}',
    ''
  ].join('\n');
}

/** Module à partir des fichiers du dépôt. */
export function generate(base = racine) {
  const inventory = JSON.parse(readFileSync(join(base, 'docs/BESTIAIRE_INVENTAIRE.json'), 'utf8'));
  const dir = join(base, 'js/data/bestiary');
  const books = readdirSync(dir).filter(file => /^L\d+\.json$/.test(file)).sort().map(file => JSON.parse(readFileSync(join(dir, file), 'utf8')));
  const entries = buildCatalogue({ inventory, books });
  return { entries, text: renderModule(entries) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outPath = join(racine, OUT);
  try {
    const { entries, text } = generate();
    const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : null;
    if (current === text) console.log(`catalogue des Traits à jour (${entries.length} Traits)`);
    else if (process.argv.includes('--check')) {
      console.error(`catalogue des Traits ${current === null ? 'absent' : 'différent des données'} (${outPath}) : lancer ${COMMAND}`);
      process.exitCode = 1;
    } else {
      writeFileSync(outPath, text);
      console.log(`catalogue des Traits écrit (${entries.length} Traits)`);
    }
  } catch (error) {
    console.error(`catalogue des Traits : ${error.message}`);
    process.exitCode = 1;
  }
}
