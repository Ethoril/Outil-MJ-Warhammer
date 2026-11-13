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
import { readFileSync, writeFileSync } from 'node:fs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';

const BOOK = 'L90';
const TITLE = 'Maison (MJ) — profils de décision du MJ';
const ADDED_ON = '2026-11-13';
const DECISION = 'Décision du MJ du 13/11/2026';
const SOURCE_NOTE = 'L90 : profil maison, copie d’un profil imprimé du bestiaire avec armes adaptées (décision du MJ du 13/11/2026), hors corpus.';

const l06 = JSON.parse(readFileSync('js/data/bestiary/L06.json', 'utf8'));
const base = id => structuredClone(l06.profiles.find(profile => profile.id === id));

/** Fiches maison : profil copié, noms, adaptation des armes (source de chaque arme), question d'origine. */
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
    // Dégâts : même formule que l'Arme à une main du même profil (BF + 4), imprimée 12 (L06 p. 324). Portée : BF 4 × 3 = 12 mètres.
    // Valeur : CT 20, le profil n'imprimant pas de compétence de Projectiles.
    weapon: 'Leadbelcher Gun (L01 p. 29 : 2M, portée BF × 3, dégâts BF + 4, Empaleuse) ; dégâts 12 comme l’Arme à une main du profil (BF + 4), portée 12, valeur = CT 20',
    adapt: record => { record.attacks.push({ name: 'Leadbelcher Gun', value: record.stats.CT, damage: 12, rangeYards: 3 * Math.floor(record.stats.F / 10), qualities: ['Impale'] }); }
  },
  {
    key: 'orc-big-un', name: 'Orc Big ’Un', nameFr: 'Orc kostaud', from: 'E0-P-090', question: 'Q4',
    // Choppa : « Weapon (Choppa) +8 » de l'Orc de base de Tribes and Tribulations (L12 p. 10), même Force 35 que l'Orc de L06.
    weapon: 'Choppa (L12 p. 10, Orc de base, « Weapon (Choppa) +8 » à la même Force 35), valeur = Corps à corps (Base) 40, à la place de l’Arme à une main',
    adapt: record => { record.attacks = [{ name: 'Choppa', value: 40, damage: 8 }, ...record.attacks.filter(attack => attack.name !== 'Hand Weapon')]; }
  },
  { key: 'vampire-pirate-captain', name: 'Capitaine vampire pirate', nameFr: 'Capitaine vampire pirate', from: 'E0-P-099', question: 'Q6', weapon: null, adapt: () => {} },
  { key: 'zombie-buccaneer', name: 'Zombie flibustier', nameFr: 'Zombie flibustier', from: 'E0-P-094', question: 'Q6', weapon: null, adapt: () => {} }
];

const inventory = JSON.parse(readFileSync('docs/BESTIAIRE_INVENTAIRE.json', 'utf8'));
const previous = new Map(inventory.profiles.filter(row => row.book === BOOK).map(row => [row.blockKey, row.id]));
inventory.profiles = inventory.profiles.filter(row => row.book !== BOOK);
inventory.coverage = inventory.coverage.filter(row => row.book !== BOOK);
let next = Math.max(...inventory.profiles.map(row => Number(row.id.slice(5)))) + 1;

const profiles = HOUSE.map((entry, index) => {
  const source = base(entry.from);
  const page = index + 1;
  const blockKey = `${BOOK}:${page}:0`;
  const record = {
    ...source, id: previous.get(blockKey) || `E0-P-${String(next++).padStart(3, '0')}`, book: BOOK, page, physicalPage: page, blockKey,
    name: entry.name, nameFr: entry.nameFr, nameFrSource: 'proposition'
  };
  entry.adapt(record);
  record.houseProfile = { decision: DECISION, question: entry.question, basedOn: { id: source.id, book: source.book, page: source.page, name: source.name }, ...(entry.weapon ? { weapon: entry.weapon } : {}) };
  record.notes = [...(source.notes || []), `Profil maison (${DECISION}, ${entry.question}) : copie de ${source.nameFr} (${source.book} p. ${source.page})${entry.weapon ? ` ; arme : ${entry.weapon}` : ''}.`];
  const problems = validateBestiaryRecord(record);
  if (problems.length) throw new Error(`${record.id} ${record.name} : ${problems.join(' ; ')}`);
  return record;
});

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
index.books = [...index.books.filter(row => row.book !== BOOK), { book: BOOK, file: `${BOOK}.json`, title: TITLE, edition: 'V5', counts: { profiles: profiles.length, templates: 0, pregenerated: 0 } }]
  .sort((a, b) => a.book.localeCompare(b.book));
writeFileSync('js/data/bestiary/index.json', `${JSON.stringify(index, null, 1)}\n`);
console.log(profiles.map(profile => `${profile.id} ${profile.nameFr} ← ${profile.houseProfile.basedOn.id} ; ${profile.attacks.map(attack => `${attack.name} ${attack.value}/+${attack.damage}`).join(', ')}`).join('\n'));
