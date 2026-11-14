/**
 * Livres WJDR V2 convertis en V5 par la règle maison du MJ (tools/lib/bestiary-v2.mjs, docs/specs/images-pions/conversion-v2-v5.md) :
 *   node tools/build-bestiary-v2-books.mjs L29 [L30]
 * Source : la transcription relue de chaque livre (tools/lib/bestiary-v2-l29.mjs…), noms et chiffres seulement. Écrit
 * js/data/bestiary/<livre>.json, son entrée d'index, ses entrées d'inventaire (`addedOn: "2026-11-14"`, identifiants stables) et ses lignes
 * de classement (tools/token-images-categories.csv, sans toucher aux lignes existantes).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { bonus, convertStats, v2Movement, v2Value, woundsV5, weaponAttack, naturalAttack, traitOf, skillsOf, SIZE_LABEL } from './lib/bestiary-v2.mjs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';
import { slug } from './build-token-images.mjs';

const BOOKS = {
  L29: { file: './lib/bestiary-v2-l29.mjs', title: 'Le Tome de la Corruption (WJDR V2, converti en V5)', sha256: '2e576d7a833d59c4acd6c4986f38319cf4ce37eb1ae96105795e3b02abee25df' },
  L30: { file: './lib/bestiary-v2-l30.mjs', title: 'Le Seigneur liche (WJDR V2, converti en V5)', sha256: '283c1f2bea4565d2269f9110b8b75853eb29fc0366280fc51eedf4c97ef9ca22' }
};
const ADDED_ON = '2026-11-14';
const fold = text => String(text).normalize('NFC').toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
const list = text => (text && !/^aucune?s?$/i.test(text.trim()) ? text.split(/,(?![^(]*\))/).map(item => item.trim()).filter(Boolean) : []);

const inventory = JSON.parse(readFileSync('docs/BESTIAIRE_INVENTAIRE.json', 'utf8'));
const traitRef = new Map(inventory.traits.filter(trait => /^trait/.test(trait.kind)).map(trait => [trait.name.replace(/\s*\(.*\)\s*$/, '').trim(), trait.id]).reverse());
const trait = (name, extra = {}) => ({ name, ...extra, ref: traitRef.get(name) });
const snapshot = JSON.parse(readFileSync('js/data/reference-snapshot.json', 'utf8'));
const singular = text => fold(text).split(' ').map(word => word.replace(/s$/, '')).join(' ');
const TALENTS = new Map(snapshot.talents.entries.filter(entry => entry.nom && entry.englishName).map(entry => [singular(entry.nom), entry.englishName]));
const DOMAINS = { nurgle: 'Domaine de Nurgle', slaanesh: 'Domaine de Slaanesh', tzeentch: 'Domaine de Tzeentch', 'nécromancie': 'Domaine de la Nécromancie' };
const spellsOf = type => snapshot.magic.spells.filter(spell => spell.type === type).map(spell => spell.nom);

/** Armes naturelles : n de la créature V5 la plus proche (liste à valider) ; un modificateur V2 imprimé « (BF–1) » s'y ajoute. */
const NATURAL = [
  [/morsure|dents|crocs|bec/, 3, 'Loup V5 (L06 p. 327) : morsure +6 à BF 3'],
  [/griffes|serres/, 3, 'Loup V5 (L06 p. 327) : griffes +6 à BF 3'],
  [/cornes|défenses|sabots/, 4, 'Sanglier V5 (L06 p. 325) : cornes +7 à BF 3'],
  [/pince/, 6, 'Démonette V5 (L06 p. 350) : griffes +9 à BF 3'],
  [/tentacule|pseudopode|langue|queue|dard|barbillon|aile|organe|poing|elle-même/, 3, 'par défaut, comme la morsure du Loup V5']
];
const PROPER = new Set(['khorne', 'nurgle', 'slaanesh', 'tzeentch', 'chaos', 'tchar', 'kurgan', 'marie', 'sanguinaire', 'herman', 'schmidt', 'knute', 'alsgaard', "zhthy'hl",
  'karitamen', 'scarabée', 'mort', 'artilli', 'levrellian', 'fatandira', 'mir', 'haflok', 'strykssen', 'ernst', 'helmuth', 'phrenesay']);
const displayFr = title => {
  const words = title.normalize('NFC').toLowerCase().split(' ');
  return words.map((word, index) => (index === 0 || PROPER.has(word.replace(/,$/, '')) ? word.charAt(0).toUpperCase() + word.slice(1) : word)).join(' ');
};

function attacksOf(entry, stats, rules) {
  const attacks = [];
  for (const part of list(entry.weapons).flatMap(item => item.split(/\s+(?:et|ou)\s+(?![^(]*\))/))) {
    const text = part.replace(/\s*\((?:dégâts[^)]*)\)/, '');
    let attack = weaponAttack(text, { stats, size: entry.size });
    for (let words = text.split(' '); !attack && words.length > 1; words = words.slice(0, -1)) attack = weaponAttack(words.slice(0, -1).join(' '), { stats, size: entry.size });
    if (attack) { attacks.push(attack); continue; }
    const natural = NATURAL.find(([pattern]) => pattern.test(fold(text)));
    if (natural && !/bouclier/.test(fold(text))) {
      const modifier = /\(BF\s*[–-]\s*(\d)\)/.exec(text);
      const name = text.replace(/\s*\(.*\)\s*$/, '').trim();
      // Sans CC (Vers fouettards : 0 %), l'arme naturelle frappe à la CT imprimée.
      attacks.push(naturalAttack(name.charAt(0).toUpperCase() + name.slice(1), { stats, size: entry.size, naturalBonus: natural[1] - Number(modifier?.[1] || 0), melee: stats.CC ?? stats.CT }));
      continue;
    }
    rules.push(`Arme V2 : ${part}`);
  }
  return attacks;
}

function record(entry, id, blockKey, book) {
  const movement = v2Movement(entry.secondary[4]);
  const stats = convertStats(entry.main.map(v2Value), { M: movement.M, animal: Boolean(entry.animal) });
  const rules = [];
  const traits = [];
  const talents = [];
  const spells = {};
  for (const item of list(entry.talents)) {
    const base = item.replace(/\*+$/, '').replace(/\s*\(.*\)\s*$/, '').trim();
    // « Armes naturelles » : déjà rendues par les attaques (griffes, morsure…).
    if (fold(base) === 'armes naturelles') continue;
    const spec = /\(([^)]*)\)/.exec(item)?.[1];
    const traitName = traitOf(base);
    if (traitName === 'Fly') { traits.push(trait('Fly', { rating: String(entry.fly ?? movement.fly ?? '') || undefined })); continue; }
    if (traitName) { traits.push(trait(traitName)); continue; }
    const lore = fold(base) === 'sombre savoir' && DOMAINS[fold(spec || '')];
    if (lore) { traits.push(trait('Spellcaster', { param: spec })); spells[lore] = spellsOf(lore); continue; }
    const talent = TALENTS.get(singular(base));
    if (talent) talents.push({ name: spec ? `${talent} (${spec})` : talent });
    else rules.push(item.replace(/\*+$/, ''));
  }
  for (const title of entry.rules.filter(rule => !/^Perspective d.Éradication/i.test(rule))) {
    const traitName = traitOf(title);
    if (traitName && !traits.some(item => item.name === traitName)) traits.push(trait(traitName));
    else if (!traitName) rules.push(title);
  }
  traits.push(trait('Size', { param: SIZE_LABEL[entry.size] }));
  const skills = new Map();
  for (const item of list(entry.skills)) {
    const found = skillsOf(item, stats);
    if (!found.length) rules.push(`Compétence V2 : ${item}`);
    for (const skill of found) if (!skills.has(skill.name) || skills.get(skill.name).value < skill.value) skills.set(skill.name, skill);
  }
  const ap = [...String(entry.armourPoints || '').matchAll(/(\d+)/g)].map(found => Number(found[1]));
  const armour = { toughnessBonus: bonus(stats.E), ...(ap.length && ap.some(value => value > 0) ? (new Set(ap).size === 1 ? { ap: ap[0] } : { detail: entry.armourPoints }) : {}) };
  const attacks = attacksOf(entry, stats, rules);
  const fate = v2Value(entry.secondary[7]);
  const nameFr = displayFr(entry.printedTitle);
  const out = {
    id, book, page: entry.page, physicalPage: entry.physicalPage, kind: 'profile', blockKey, name: nameFr, nameFr, stats, wounds: woundsV5(stats, entry.size), size: entry.size,
    armour, attacks, skills: [...skills.values()], traits: traits.map(item => Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined))), optionalTraits: [],
    ...(talents.length ? { talents } : {}), ...(rules.length ? { specialRules: [...new Set(rules)] } : {}), ...(Object.keys(spells).length ? { spells } : {}),
    ...(fate ? { fatePoints: fate } : {}), keywords: entry.keywords, nameFrSource: `${book} p.${entry.page}`, sourceEdition: 'V2',
    conversion: { size: entry.size, animal: Boolean(entry.animal), ...(entry.ref ? { reference: entry.ref } : {}) }
  };
  const problems = validateBestiaryRecord(out);
  if (problems.length) throw new Error(`${id} ${nameFr} : ${problems.join(' ; ')}`);
  return out;
}

for (const book of process.argv.slice(2)) {
  const meta = BOOKS[book];
  if (!meta) throw new Error(`Livre V2 inconnu : ${book}`);
  const { PROFILES } = await import(meta.file);
  const previous = new Map(inventory.profiles.filter(row => row.book === book).map(row => [row.blockKey, row.id]));
  inventory.profiles = inventory.profiles.filter(row => row.book !== book);
  inventory.coverage = inventory.coverage.filter(row => row.book !== book);
  let next = Math.max(...inventory.profiles.map(row => Number(row.id.slice(5))), ...[...previous.values()].map(value => Number(value.slice(5)))) + 1;
  const perPage = new Map();
  const profiles = PROFILES.map(entry => {
    const index = perPage.get(entry.physicalPage) ?? 0;
    perPage.set(entry.physicalPage, index + 1);
    const blockKey = `${book}:${entry.physicalPage}:${index}`;
    return record(entry, previous.get(blockKey) || `E0-P-${String(next++).padStart(3, '0')}`, blockKey, book);
  });
  const note = `${book} : profils V2 transcrits (noms et chiffres) puis convertis en V5 par la règle maison du MJ (tools/lib/bestiary-v2.mjs, 14/11/2026).`;
  for (const profile of profiles) {
    const traitsUsed = profile.traits.map(item => item.name);
    inventory.profiles.push({ name: profile.name, book, page: profile.page, physicalPage: profile.physicalPage, kind: 'profile', traitsUsed, count: traitsUsed.length,
      abilityRefs: [], sourceNote: note, id: profile.id, blockKey: profile.blockKey, addedOn: ADDED_ON });
  }
  inventory.coverage.push({ book, profilePagesPhysical: [...new Set(profiles.map(profile => profile.physicalPage))], rulePagesPrinted: [], entries: profiles.length,
    profiles: profiles.length, templates: 0, pregeneratedCharacters: 0, method: 'Profils V2 transcrits et contrôlés contre la couche texte du PDF, convertis par tools/build-bestiary-v2-books.mjs.', addedOn: ADDED_ON });
  writeFileSync(`js/data/bestiary/${book}.json`, `${JSON.stringify({ schemaVersion: 1, book, title: meta.title, edition: 'V5', sourceEdition: 'V2', source: { corpusId: book, sha256: meta.sha256 }, conversionNote: note, profiles }, null, 1)}\n`);
  const index = JSON.parse(readFileSync('js/data/bestiary/index.json', 'utf8'));
  index.books = [...index.books.filter(row => row.book !== book), { book, file: `${book}.json`, title: meta.title, edition: 'V5', counts: { profiles: profiles.length, templates: 0, pregenerated: 0 } }]
    .sort((a, b) => a.book.localeCompare(b.book));
  writeFileSync('js/data/bestiary/index.json', `${JSON.stringify(index, null, 1)}\n`);
  // Classement : une ligne par créature absente du fichier (dossier choisi par créature), lignes existantes intactes.
  const csvPath = 'tools/token-images-categories.csv';
  const [head, ...rows] = readFileSync(csvPath, 'utf8').split('\n').filter(Boolean);
  const keys = new Set(rows.map(row => row.split(';')[0]));
  for (const [i, profile] of profiles.entries()) {
    const key = slug(profile.nameFr);
    if (!keys.has(key)) { rows.push([key, PROFILES[i].folder, PROFILES[i].folder.startsWith('pnj/') ? 'oui' : 'non', ''].join(';')); keys.add(key); }
  }
  const k = row => row.split(';')[0];
  writeFileSync(csvPath, `${[head, ...rows.sort((a, b) => (k(a) < k(b) ? -1 : k(a) > k(b) ? 1 : 0))].join('\n')}\n`);
  console.log(`${book} : ${profiles.length} profils (${profiles[0].id} à ${profiles[profiles.length - 1].id})`);
}
writeFileSync('docs/BESTIAIRE_INVENTAIRE.json', `${JSON.stringify(inventory, null, 2)}\n`);
