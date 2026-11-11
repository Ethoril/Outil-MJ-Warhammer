/**
 * Livre L27 : Bestiaire du Vieux Monde (WJDR V2, FR), règle maison du MJ du 11/11/2026.
 *   node tools/build-bestiary-l27.mjs
 * Le PDF est un scan sans texte : les profils V2 sont transcrits à la main ci-dessous (pages 117-120 imprimées, +2 en page physique)
 * puis convertis en V5. Écrit js/data/bestiary/L27.json, l'entrée de l'index et les entrées `addedOn: 2026-11-11` de
 * docs/BESTIAIRE_INVENTAIRE.json (idempotent).
 *
 * Conversion V2 → V5 (arbitrages du MJ du 11/11/2026, étalonnée sur Cheval, Sanglier et Loup, présents dans les deux éditions) :
 * - M et caractéristiques du profil principal repris tels quels (même échelle) ; CT 0 % → absente ; Dex absente (pas de Dex en V2) ;
 *   Soc 0 % → 10 comme le Cheval V5 ; Initiative : 15 pour les chevaux (Cheval V5), sinon égale à l'Agilité.
 * - Blessures : formule V5 selon la Taille (Livre de base V5 p. 360), jamais le B du V2.
 * - Attaques : A 0 → aucune ; A 1 → sabots à la CC, dégâts BF + 8 et Assommante comme le Cheval V5 ; A 2 → seconde attaque gratuite
 *   en perdant l'Élan. Le Rapace (BF 1) prend les dégâts BF + 2 de l'Araignée géante V5 (Petite).
 * - Compétences : Perception sur l'Initiative V5 + le bonus V2 ; Esquive sur l'Agilité ; Natation non reprise (pas de compétence V5).
 * - Montures : Trait Dressé (Monture), ce qui les rend déclarables comme montures. Cauchemar et Monture démoniaque écartés
 *   (animaux seulement).
 * - Vol du Rapace : M 2 au sol, Vol (100) comme le Pigeon de Forme bestiale.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const BOOK = 'L27';
const ADDED_ON = '2026-11-11';
const PAGE_OFFSET = 2;
const TITLE = 'Bestiaire du Vieux Monde (WJDR V2, converti en V5)';
const SHA256 = 'c4fc6266d9ac35bcd8c1ffceb23e41fb04f0a119674974227924e5704f5706ef';
const SOURCE_NOTE = 'L27 : scan sans texte, profil V2 transcrit à la main puis converti en V5 (règle maison du MJ, 11/11/2026).';

const T = Object.freeze({
  bestial: { name: 'Bestial', ref: 'E0-T-005' }, fly: rating => ({ name: 'Fly', rating, ref: 'E0-T-023' }),
  mutation: { name: 'Mutation', ref: 'E0-T-040' }, size: param => ({ name: 'Size', param, ref: 'E0-T-045' }),
  skittish: { name: 'Skittish', ref: 'E0-T-047' }, trained: param => ({ name: 'Trained', param, ref: 'E0-T-060' })
});
const BARDING = [{ name: 'Light Armour', ap: 1, optional: true }, { name: 'Medium Armour', ap: 3, optional: true }];
const bonus = value => Math.floor(value / 10);
const SIZE_FACTOR = { average: 1, large: 2 };
const woundsV5 = (stats, size) => size === 'small' ? 2 * bonus(stats.E)
  : (bonus(stats.F) + 2 * bonus(stats.E) + bonus(stats.FM ?? 0)) * SIZE_FACTOR[size];

/** Profils V2 du livre : CC, CT, F, E, Ag, Int, FM, Soc ; A, M ; bonus V2 de Perception (+10 % → 10). */
const V2 = [
  { key: 'warhorse', name: 'Warhorse', nameFr: 'Cheval de guerre', page: 117, v2: [30, 0, 40, 40, 30, 10, 10, 0], A: 1, M: 8, perception: 10,
    horse: true, size: 'large', trained: 'Mount, War', skittish: false, barding: true },
  { key: 'riding-horse', name: 'Riding Horse', nameFr: 'Cheval de selle', page: 118, v2: [25, 0, 38, 38, 30, 10, 10, 0], A: 0, M: 8, perception: 10,
    horse: true, size: 'large', trained: 'Mount', skittish: true, barding: true },
  { key: 'elven-steed', name: 'Elven Steed', nameFr: 'Coursier elfique', page: 118, v2: [36, 0, 43, 41, 42, 10, 10, 20], A: 1, M: 9, perception: 20,
    horse: true, size: 'large', trained: 'Mount', skittish: true, barding: true, dodge: true },
  { key: 'destrier', name: 'Destrier', nameFr: 'Destrier', page: 118, v2: [30, 0, 45, 45, 30, 10, 10, 0], A: 1, M: 8, perception: 10,
    horse: true, size: 'large', trained: 'Mount, War', skittish: false, barding: true },
  { key: 'chaos-steed', name: 'Chaos Steed', nameFr: 'Destrier du Chaos', page: 118, v2: [38, 0, 49, 45, 30, 10, 16, 0], A: 1, M: 8, perception: 10,
    horse: true, size: 'large', trained: 'Mount, War', skittish: false, barding: true, extraTraits: [T.mutation] },
  { key: 'pony', name: 'Pony', nameFr: 'Poney', page: 119, v2: [25, 0, 35, 35, 35, 10, 10, 0], A: 0, M: 6, perception: 0,
    horse: true, size: 'average', trained: 'Mount', skittish: true, barding: false },
  { key: 'raptor', name: 'Small Raptor', nameFr: 'Rapace', page: 120, v2: [36, 0, 10, 10, 35, 11, 20, 0], A: 2, M: 2, perception: 20,
    horse: false, size: 'small', fly: '100' }
];

function record(entry, id, index) {
  const [CC, CT, F, E, Ag, Int, FM, Soc] = entry.v2;
  const I = entry.horse ? 15 : Ag;
  const stats = { M: entry.M, CC, CT: CT || null, F, E, I, Ag, Dex: null, Int, FM, Soc: Soc || 10 };
  const sizeLabel = { small: 'Small', average: 'Average', large: 'Large' }[entry.size];
  const attacks = [];
  if (entry.horse && entry.A >= 1) attacks.push({ name: 'Hooves', value: CC, damage: bonus(F) + 8, qualities: ['Pummel'] });
  if (!entry.horse) {
    attacks.push({ name: 'Talons', value: CC, damage: bonus(F) + 2 });
    if (entry.A >= 2) attacks.push({ name: 'Beak', value: CC, damage: bonus(F) + 2, free: 'momentum' });
  }
  const skills = [{ name: 'Perception', nameFr: 'Perception', value: I + entry.perception }];
  if (entry.dodge) skills.unshift({ name: 'Dodge', nameFr: 'Esquive', value: Ag });
  const traits = [T.bestial, ...(entry.fly ? [T.fly(entry.fly)] : []), T.size(sizeLabel), ...(entry.skittish ? [T.skittish] : []),
    ...(entry.trained ? [T.trained(entry.trained)] : []), ...(entry.extraTraits || [])];
  return {
    id, book: BOOK, page: entry.page, physicalPage: entry.page + PAGE_OFFSET, kind: 'profile', blockKey: `${BOOK}:${entry.page}:${index}`,
    name: entry.name, nameFr: entry.nameFr, stats, wounds: woundsV5(stats, entry.size), size: entry.size,
    armour: { toughnessBonus: bonus(E), ...(entry.barding ? { parts: BARDING } : {}) },
    attacks, skills, traits, optionalTraits: [],
    ...(entry.key === 'chaos-steed' ? { specialRules: ['Mutations du Chaos : 1d10, 1-5 = 1 mutation, 6-10 = 2 (table des mutations avancées)'] } : {}),
    keywords: [entry.horse ? 'cheval' : 'bete'], nameFrSource: `${BOOK} p.${entry.page}`, sourceEdition: 'V2'
  };
}

const inventory = JSON.parse(readFileSync('docs/BESTIAIRE_INVENTAIRE.json', 'utf8'));
const previous = new Map(inventory.profiles.filter(row => row.book === BOOK).map(row => [row.name, row.id]));
inventory.profiles = inventory.profiles.filter(row => row.book !== BOOK);
inventory.coverage = inventory.coverage.filter(row => row.book !== BOOK);
let next = Math.max(...inventory.profiles.map(row => Number(row.id.slice(5)))) + 1;
const perPage = new Map();
const profiles = V2.map(entry => {
  const id = previous.get(entry.name.toUpperCase()) ?? `E0-P-${String(next++).padStart(3, '0')}`;
  const index = perPage.get(entry.page) ?? 0;
  perPage.set(entry.page, index + 1);
  return record(entry, id, index);
});
for (const profile of profiles) {
  const traitsUsed = profile.traits.map(trait => trait.name);
  inventory.profiles.push({ name: profile.name.toUpperCase(), book: BOOK, page: profile.page, physicalPage: profile.physicalPage, kind: 'profile',
    traitsUsed, count: traitsUsed.length, abilityRefs: [], sourceNote: SOURCE_NOTE, id: profile.id, blockKey: profile.blockKey, addedOn: ADDED_ON });
}
inventory.coverage.push({ book: BOOK, profilePagesPhysical: [...new Set(profiles.map(p => p.physicalPage))], rulePagesPrinted: [], entries: profiles.length,
  profiles: profiles.length, templates: 0, pregeneratedCharacters: 0,
  method: 'Scan sans texte : profils V2 relus sur l’image et transcrits à la main, puis convertis en V5 (tools/build-bestiary-l27.mjs).', addedOn: ADDED_ON });
writeFileSync('docs/BESTIAIRE_INVENTAIRE.json', `${JSON.stringify(inventory, null, 2)}\n`);

const book = { schemaVersion: 1, book: BOOK, title: TITLE, edition: 'V5', sourceEdition: 'V2',
  source: { corpusId: BOOK, sha256: SHA256 }, conversionNote: SOURCE_NOTE, profiles };
writeFileSync(`js/data/bestiary/${BOOK}.json`, `${JSON.stringify(book, null, 1)}\n`);

const index = JSON.parse(readFileSync('js/data/bestiary/index.json', 'utf8'));
index.books = index.books.filter(row => row.book !== BOOK);
index.books.push({ book: BOOK, file: `${BOOK}.json`, title: TITLE, edition: 'V5', counts: { profiles: profiles.length, templates: 0, pregenerated: 0 } });
writeFileSync('js/data/bestiary/index.json', `${JSON.stringify(index, null, 1)}\n`);
console.log(profiles.map(p => `${p.id} ${p.nameFr} M${p.stats.M} B${p.wounds} ${p.attacks.map(a => `${a.name} ${a.value}/${a.damage}`).join(', ')}`).join('\n'));
