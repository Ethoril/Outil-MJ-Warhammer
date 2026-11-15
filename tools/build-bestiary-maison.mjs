/**
 * Livre L90 « Maison (MJ) » : profils de décision du MJ (13/11/2026, réponses Q2 à Q4 et Q6 de docs/specs/images-pions/questions-profils.md),
 * distincts des livres imprimés (T17).
 *   node tools/build-bestiary-maison.mjs
 * Chaque profil est la copie d'un profil imprimé du bestiaire (caractéristiques, Blessures, compétences, Traits inchangés) ; seules les armes
 * sont adaptées, chacune prise dans un livre du corpus. `page` = numéro de la fiche maison (le livre n'existe pas en papier) ; `houseProfile`
 * dit la décision, le profil copié et la source de l'arme. Réécrit js/data/bestiary/L90.json, son entrée d'index et ses entrées d'inventaire
 * (`addedOn: "2026-11-13"`, identifiants stables).
 * L90 et non un code de corpus : le validateur et les générateurs ne lisent que des livres « L » suivis de chiffres.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';
import { mountCountOf } from '../js/core/mounts.js';
import { slug } from './build-token-images.mjs';

const BOOK = 'L90';
const TITLE = 'Maison (MJ) — profils de décision du MJ';
const ADDED_ON = '2026-11-13';
const DECISION = 'Décision du MJ du 13/11/2026';
const DECISION_Q12 = 'Décision du MJ du 14/11/2026';
const DECISION_T18 = 'Décision du MJ du 15/11/2026';
const SOURCE_NOTE = 'L90 : profil maison, copie d’un profil imprimé du bestiaire avec armes adaptées (décision du MJ du 13/11/2026), hors corpus.';

// Profils copiables : tous les livres imprimés du bestiaire (L06, L28…), jamais L90 lui-même.
const printed = readdirSync('js/data/bestiary').filter(file => /^L\d+\.json$/.test(file) && file !== `${BOOK}.json`)
  .flatMap(file => JSON.parse(readFileSync(`js/data/bestiary/${file}`, 'utf8')).profiles);
const base = id => structuredClone(printed.find(profile => profile.id === id));

/** Fiches maison : profil copié, noms, adaptation des armes (source de chaque arme), question d'origine. */
// T18 (décision du MJ du 15/11/2026, appariement final des images) : un profil par personne pour les profils de groupe imprimés ; mêmes
// caractéristiques, compétences, Traits et armes que le profil de groupe, nom = celui que le CSV des images donne à la personne.
const INDIVIDUALS = [
  ['Hendrik Vogel — Clerc humain', 'E0-P-387'], ['Frère Rolf — Moine humain (Bronze 4)', 'E0-P-662'],
  ['Esmer — Sergent humain (Argent 1)', 'E0-P-686'], ['Jozef — Sergent humain (Argent 1)', 'E0-P-686'], ['Les Jumeaux — Jumeau 2', 'E0-P-806'],
  ['Hannes — Pilleur de tombes humain (Bronze 2)', 'E0-P-932'], ['Little Anders — Cocher (Argent 1)', 'E0-P-813'], ['Bertoldo — Cocher (Argent 1)', 'E0-P-813'],
  ['Ivan — Cocher (Argent 1)', 'E0-P-813'], ['Magda — Cocher (Argent 1)', 'E0-P-813'], ['Mikhail — Cocher (Argent 1)', 'E0-P-813'],
  ['Karl Dampfer — Matelot fluvial (Argent 1)', 'E0-P-925'], ['Hans Vollrat — Matelot fluvial (Argent 1)', 'E0-P-925'], ['Reiner — Espion (Argent 3)', 'E0-P-852'],
  ['Bart — Smuggler (Bronze 3)', 'E0-P-820'], ['Hans-Frederick — Smuggler (Bronze 3)', 'E0-P-820'], ['Larz — Voyou (Bronze 3)', 'E0-P-825'],
  ["'Curls' — Voyou (Bronze 3)", 'E0-P-825'], ['Elphoise — Slaanesh cultiste (Argent 1)', 'E0-P-827'], ['Helga — Slaanesh cultiste (Argent 1)', 'E0-P-827']
];

const HOUSE = [
  {
    key: 'goblin-archer', name: 'Goblin Archer', nameFr: 'Gobelin archer', from: 'E0-P-089', question: 'Q2',
    // L'Arc court est imprimé au profil même du Gobelin (L06 p. 336), en option : il devient l'arme principale.
    weapon: 'Arc court et flèches du Gobelin (L06 p. 336), imprimé en option, rendu obligatoire',
    adapt: record => { record.attacks = record.attacks.map(attack => { const out = { ...attack }; delete out.optional; return out; }); }
  },
  {
    key: 'ogre-leadbelcher', name: 'Ogre Leadbelcher', nameFr: 'Ogre crache-plomb', from: 'E0-P-072', question: 'Q3',
    // Leadbelcher Gun (Archives of the Empire 2, L01 p. 29) : 2M, portée BF × 3, dégâts BF + 4, Empaleuse, Poudre noire.
    // Dégâts : BF + 4 imprimés = 4 + 4 = 8. Pas de bonus de Taille au tir (L06 p. 360 : les modificateurs de Taille ne s'appliquent pas aux attaques à distance). Portée : BF 4 × 3 = 12 mètres.
    // Valeur : CT 20, le profil n'imprimant pas de compétence de Projectiles.
    weapon: 'Leadbelcher Gun (L01 p. 29 : 2M, portée BF × 3, dégâts BF + 4, Empaleuse) ; dégâts 8 (BF 4 + 4, sans bonus de Taille au tir, L06 p. 360), portée 12, valeur = CT 20',
    adapt: record => { record.attacks.push({ name: 'Leadbelcher Gun', value: record.stats.CT, damage: Math.floor(record.stats.F / 10) + 4, rangeYards: 3 * Math.floor(record.stats.F / 10), qualities: ['Impale'] }); }
  },
  {
    key: 'orc-big-un', name: 'Orc Big ’Un', nameFr: 'Orc kostaud', from: 'E0-P-090', question: 'Q4',
    // Choppa : « Weapon (Choppa) +8 » de l'Orc de base de Tribes and Tribulations (L12 p. 10), même Force 35 que l'Orc de L06.
    weapon: 'Choppa (L12 p. 10, Orc de base, « Weapon (Choppa) +8 » à la même Force 35), valeur = Corps à corps (Base) 40, à la place de l’Arme à une main',
    adapt: record => { record.attacks = [{ name: 'Choppa', value: 40, damage: 8 }, ...record.attacks.filter(attack => attack.name !== 'Hand Weapon')]; }
  },
  { key: 'vampire-pirate-captain', name: 'Capitaine vampire pirate', nameFr: 'Capitaine vampire pirate', from: 'E0-P-099', question: 'Q6', weapon: null, adapt: () => {} },
  { key: 'zombie-buccaneer', name: 'Zombie flibustier', nameFr: 'Zombie flibustier', from: 'E0-P-094', question: 'Q6', weapon: null, adapt: () => {} },
  // Q12 (réponse du MJ du 14/11/2026) : les sept cultistes de la Main pourpre (L28 p. 28), un profil chacun, aux caractéristiques du bloc imprimé.
  // Du livre : caractéristiques, compétences, vêtement violet et tatouage caché de tous, répartition des armes (quatre arbalètes avec gourdin
  // ou hache, deux haches, une massue avec un filet barbelé). Du MJ (images de la bibliothèque) : prénom, signe distinctif, et quel cultiste
  // porte quelle arme (lue sur l'image ; Erich, dont l'arme ne se voit pas, est le quatrième arbalétrier).
  ...[
    ['erich', 'Erich', 'écharpe violette', 'crossbow'], ['franz', 'Franz', 'bourse mauve', 'crossbow'], ['hans', 'Hans', 'plume violette', 'crossbow'],
    ['karl', 'Karl', 'cape violette', 'axe'], ['kurt', 'Kurt', 'filets', 'net'], ['otto', 'Otto', 'gants pourpres', 'crossbow'],
    ['wilhelm', 'Wilhelm', 'ceinture lie-de-vin', 'axe']
  ].map(([key, first, sign, arm]) => ({
    key: `purple-hand-${key}`, name: `${first}, ${sign} — Cultiste de la Main pourpre`, nameFr: `${first}, ${sign} — Cultiste de la Main pourpre`, from: 'E0-P-997', question: 'Q12',
    nameByMJ: `prénom et signe distinctif (« ${sign} ») donnés par le MJ (image de la bibliothèque) ; le livre ne nomme pas les cultistes`,
    weapon: { crossbow: 'arbalète et gourdin ou hache (L28 p. 28 : quatre cultistes)', axe: 'hache (L28 p. 28 : deux cultistes)', net: 'massue et filet barbelé (L28 p. 28 : un cultiste)' }[arm],
    adapt: record => {
      const printed = Object.fromEntries(record.attacks.map(attack => [attack.name, attack]));
      record.attacks = {
        crossbow: [printed['Arbalète'], printed['Gourdin ou Hache']],
        axe: [{ ...printed['Gourdin ou Hache'], name: 'Hache' }],
        net: [printed['Filet'], { ...printed['Gourdin ou Hache'], name: 'Massue' }]
      }[arm];
      record.trappings = ['vêtement violet', 'tatouage de main violette caché sous les vêtements', ...{ crossbow: ['arbalète', 'gourdin ou hache'], axe: ['hache'], net: ['massue', 'filet barbelé'] }[arm], `${sign} (signe donné par le MJ)`];
    }
  })),
  ...INDIVIDUALS.map(([name, from]) => ({
    key: `individual-${name}`, name, nameFr: name, from, question: 'T18', decision: DECISION_T18, weapon: null,
    nameByMJ: 'pion individuel d’une personne du profil de groupe imprimé (un pion = un personnage), nom donné par la bibliothèque d’images du MJ',
    adapt: () => {}
  })),
  // T18 : le Roi des Tombes de Khemri est une copie de Karitamen (L30 p. 90) ; Karitamen garde son propre pion.
  { key: 'roi-des-tombes-khemri', name: 'Roi des Tombes de Khemri', nameFr: 'Roi des Tombes de Khemri', from: 'E0-P-1124', question: 'T18', decision: DECISION_T18, weapon: null, folder: 'ennemis/rois-des-tombes', adapt: () => {} }
];

const inventory = JSON.parse(readFileSync('docs/BESTIAIRE_INVENTAIRE.json', 'utf8'));
const previous = new Map(inventory.profiles.filter(row => row.book === BOOK).map(row => [row.blockKey, row.id]));
inventory.profiles = inventory.profiles.filter(row => row.book !== BOOK);
inventory.coverage = inventory.coverage.filter(row => row.book !== BOOK);
// Les identifiants déjà donnés à L90 restent réservés : une fiche ajoutée prend le suivant de tout l'inventaire.
let next = Math.max(...inventory.profiles.map(row => Number(row.id.slice(5))), ...[...previous.values()].map(id => Number(id.slice(5)))) + 1;

const profiles = HOUSE.map((entry, index) => {
  const source = base(entry.from);
  const page = index + 1;
  const blockKey = `${BOOK}:${page}:0`;
  const record = {
    ...source, id: previous.get(blockKey) || `E0-P-${String(next++).padStart(3, '0')}`, book: BOOK, page, physicalPage: page, blockKey,
    name: entry.name, nameFr: entry.nameFr, nameFrSource: 'proposition'
  };
  entry.adapt(record);
  record.houseProfile = { decision: entry.decision || (entry.question === 'Q12' ? DECISION_Q12 : DECISION), question: entry.question, basedOn: { id: source.id, book: source.book, page: source.page, name: source.name }, ...(entry.weapon ? { weapon: entry.weapon } : {}), ...(entry.nameByMJ ? { nameByMJ: entry.nameByMJ } : {}) };
  record.notes = [...(source.notes || []), `Profil maison (${record.houseProfile.decision}, ${entry.question}) : copie de ${source.nameFr} (${source.book} p. ${source.page})${entry.weapon ? ` ; arme : ${entry.weapon}` : ''}${entry.nameByMJ ? ` ; ${entry.nameByMJ}` : ''}.`];
  const problems = validateBestiaryRecord(record);
  if (problems.length) throw new Error(`${record.id} ${record.name} : ${problems.join(' ; ')}`);
  return record;
});

// Classement (tools/token-images-categories.csv) : un profil individuel de T18 va dans pnj/<livre d'origine>, le Roi des Tombes dans son dossier.
const categoriesPath = 'tools/token-images-categories.csv';
const [categoriesHead, ...categoryRows] = readFileSync(categoriesPath, 'utf8').split('\n').filter(Boolean);
const categoryKeys = new Set(categoryRows.map(row => row.split(';')[0]));
profiles.forEach((profile, index) => {
  if (HOUSE[index].question !== 'T18' || categoryKeys.has(slug(profile.nameFr))) return;
  const folder = HOUSE[index].folder || `pnj/${profile.houseProfile.basedOn.book.toLowerCase()}`;
  categoryRows.push([slug(profile.nameFr), folder, folder.startsWith('pnj/') ? 'oui' : 'non', ''].join(';'));
});
const rowKey = row => row.split(';')[0];
writeFileSync(categoriesPath, `${[categoriesHead, ...categoryRows.sort((a, b) => (rowKey(a) < rowKey(b) ? -1 : rowKey(a) > rowKey(b) ? 1 : 0))].join('\n')}\n`);

for (const profile of profiles) {
  const traitsUsed = (profile.traits || []).map(trait => trait.name);
  inventory.profiles.push({ name: profile.name, book: BOOK, page: profile.page, physicalPage: profile.physicalPage, kind: 'profile', traitsUsed, count: traitsUsed.length,
    abilityRefs: [], sourceNote: SOURCE_NOTE, id: profile.id, blockKey: profile.blockKey, addedOn: ADDED_ON });
}
inventory.coverage.push({ book: BOOK, profilePagesPhysical: profiles.map(profile => profile.physicalPage), rulePagesPrinted: [], entries: profiles.length, profiles: profiles.length,
  templates: 0, pregeneratedCharacters: 0, method: 'Profils maison : copies de profils imprimés, armes adaptées par décision du MJ (tools/build-bestiary-maison.mjs).', addedOn: ADDED_ON });
writeFileSync('docs/BESTIAIRE_INVENTAIRE.json', `${JSON.stringify(inventory, null, 2)}\n`);

writeFileSync(`js/data/bestiary/${BOOK}.json`, `${JSON.stringify({ schemaVersion: 1, book: BOOK, title: TITLE, edition: 'V5', house: true, source: { corpusId: null, sha256: null }, conversionNote: SOURCE_NOTE, profiles }, null, 1)}\n`);
const index = JSON.parse(readFileSync('js/data/bestiary/index.json', 'utf8'));
index.books = [...index.books.filter(row => row.book !== BOOK), { book: BOOK, file: `${BOOK}.json`, title: TITLE, edition: 'V5', counts: { profiles: profiles.length, templates: 0, pregenerated: 0, mounts: mountCountOf(profiles) } }]
  .sort((a, b) => a.book.localeCompare(b.book));
writeFileSync('js/data/bestiary/index.json', `${JSON.stringify(index, null, 1)}\n`);
console.log(profiles.map(profile => `${profile.id} ${profile.nameFr} ← ${profile.houseProfile.basedOn.id} ; ${profile.attacks.map(attack => `${attack.name} ${attack.value}/+${attack.damage}`).join(', ')}`).join('\n'));
