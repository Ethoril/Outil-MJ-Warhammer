/**
 * Complément d'inventaire du bestiaire (phase E, 21/10/2026) : livres L18-L26 ajoutés au corpus après l'inventaire E0.
 *   node tools/build-bestiary-complement.mjs
 * Réécrit les entrées marquées `addedOn: "2026-10-21"` de docs/BESTIAIRE_INVENTAIRE.json (idempotent) : références de profils lues sur les
 * PDF (noms, pages, Traits employés), Traits et capacités propres à un profil, couverture par livre, questions ouvertes. Les résumés sont en
 * français, dans mes mots. Les PDF restent hors du dépôt : l'outil se lance en local.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { extractProfiles } from './lib/bestiary-extract.mjs';
import { NEW_ABILITIES, TRAIT_ALIASES } from './lib/bestiary-complement-data.mjs';

const ADDED_ON = '2026-10-21';
const BOOKS = ['L18', 'L19', 'L20', 'L21', 'L22', 'L23', 'L24', 'L25', 'L26'];
// Décalage « page physique − page imprimée » de chaque livre (relevé sur les numéros de bas de page).
const PAGE_OFFSET = { L23: 2, L24: 1 };
const SOURCE_NOTE = 'Complément L18-L26 : nom déduit du titre imprimé ; noms des Traits reconnus seulement, sans valeurs ni bloc de caractéristiques ; talents séparés exclus.';

const inventory = JSON.parse(readFileSync('docs/BESTIAIRE_INVENTAIRE.json', 'utf8'));
inventory.traits = inventory.traits.filter(entry => entry.addedOn !== ADDED_ON);
inventory.profiles = inventory.profiles.filter(entry => entry.addedOn !== ADDED_ON);
inventory.coverage = inventory.coverage.filter(entry => entry.addedOn !== ADDED_ON);
inventory.openQuestions = inventory.openQuestions.filter(entry => entry.addedOn !== ADDED_ON);

// Nouveaux Traits et capacités.
let nextTrait = Math.max(...inventory.traits.map(entry => Number(entry.id.slice(5)))) + 1;
const abilityIds = new Map();
for (const ability of NEW_ABILITIES) {
  const id = `E0-T-${String(nextTrait).padStart(3, '0')}`;
  nextTrait += 1;
  abilityIds.set(ability.name, id);
  inventory.traits.push({
    id, name: ability.name, nameFr: ability.nameFr ?? null, book: ability.book, page: ability.page, kind: ability.kind,
    summaryFr: ability.summaryFr, mechanic: ability.mechanic, currentStatus: 'absent', evidence: ['js/core/v5-magic-reminder-flags.js:33'],
    limit: 'Aucun lecteur spécifique identifié ; un effet analogue ou le service d’États ne prouve pas cette règle.', addedOn: ADDED_ON,
    ...(ability.alias ? { alias: ability.alias } : {})
  });
}

// Noms de Traits canoniques (sans précision entre parenthèses ni suffixe de variante).
const baseName = name => name.replace(/\s*\(.*\)\s*$/, '').replace(/\s+—.*$/, '').trim();
const canonical = new Map(inventory.traits.map(entry => [baseName(entry.name).toLowerCase(), baseName(entry.name)]));
const aliasOf = name => {
  const key = baseName(name).toLowerCase();
  return canonical.get(key) || canonical.get((TRAIT_ALIASES[key] || '').toLowerCase()) || null;
};

const titleCase = text => text.toLowerCase().replace(/(^|[\s(\-'`])([a-zà-ÿ])/g, (_, before, letter) => before + letter.toUpperCase())
  .replace(/\b(Of|The|Von|Van|De|La|Der|Zu|Zum|Und|And|At|In)\b/g, word => word.toLowerCase()).replace(/^./, letter => letter.toUpperCase());
const SPECIES = 'HUMAN|DWARF|HALFLING|OGRE|HIGH ELF|WOOD ELF|DARK ELF|ELF|GNOME|SKAVEN|ORC|GOBLIN|BEASTMAN|ZOMBIE|SKELETON|TROLL|GHOUL|WITCH|VAMPIRE';

/** Nom imprimé d'un bloc : titre repéré, sinon fin majuscule de la zone au-dessus de l'en-tête. */
function printedName(profile) {
  let text = (profile.title || '').trim();
  const zone = profile.zone;
  const status = [...zone.matchAll(/([A-Z][A-Z'`.,\-’� ]{3,}?(?:\s(?:--|�|—)\s[A-Z][A-Z'`.,\-� ]+?)?\s*\((?:BRASS|SILVER|GOLD)[^)]*\)\)?)/g)].pop();
  if (status) text = status[1];
  else if (!text) {
    const run = [...zone.matchAll(/(?:^|\s)((?:[A-Z][A-Z'`\-’]{1,}(?:\s+|$)){2,}|[A-Z][A-Z'`\-’]{4,})/g)].map(found => found[1].trim()).filter(found => !/^(M WS|WS BS|S T|I AGI|DEX INT|WP FEL)/.test(found)).pop();
    if (run) text = run;
  }
  text = text.replace(/\s+\d[\d\s—\-]*$/, '');
  if (!text) {
    const tokens = profile.zone.replace(/\bM WS BS S T I Agi? Dex Int W[Pp] Fel( W)?\s*$/, '').replace(/\b(I Agi? Dex Int W[Pp] Fel W|Ag Dex Int WP Fel W|Fel W|W)\s*$/, '').trim().split(/\s+/);
    const tail = [];
    for (let at = tokens.length - 1; at >= 0; at -= 1) {
      const token = tokens[at];
      if (/[a-zà-ÿ]/.test(token.replace(/^[`'(*]+/, '').replace(/s$/, '').replace(/[.,;:]+$/, '')) && !/^(--|–|—)$/.test(token)) break;
      tail.unshift(token);
    }
    text = tail.join(' ');
  }
  return text.replace(/^[.,;:*\s]+/, '').replace(/\*+$/, '').replace(/�/g, '—').replace(/\s+/g, ' ').trim();
}

/** « NOM ESPÈCE CARRIÈRE (STATUT) » -> « Nom — Espèce carrière (statut) ». */
function displayName(printed) {
  if (!printed) return null;
  printed = printed.replace(/^(?:[IVXL]{1,5}\s+(?=[A-Z]{2}))/, '').replace(/^BESTIARY\s+[IVXL]+\s+/, '').replace(/^A ROUGH NIGHT AT THE THREE FEATHERS\s+/, '');
  const separated = printed.split(/\s+(?:--|—|–)\s+/);
  if (separated.length > 1) return `${titleCase(separated[0])} — ${titleCase(separated.slice(1).join(' — '))}`;
  const found = new RegExp(`^(.+?\\S)\\s+((?:${SPECIES})\\b.*)$`).exec(printed);
  if (found && found[1].split(' ').length >= 2) return `${titleCase(found[1])} — ${titleCase(found[2])}`;
  return titleCase(printed);
}

const { profiles } = extractProfiles(BOOKS, { keepBody: true });
let nextProfile = Math.max(...inventory.profiles.map(entry => Number(entry.id.slice(5)))) + 1;
const perBook = new Map();
for (const profile of profiles) {
  const offset = PAGE_OFFSET[profile.book] || 0;
  const used = new Set();
  for (const list of [profile.traits, profile.attackTraits, profile.optional]) for (const trait of list || []) {
    if (trait.name.length > 40) continue;
    const name = aliasOf(trait.name);
    if (name) used.add(name);
  }
  const refs = NEW_ABILITIES.filter(ability => ability.appearsIn?.includes(profile.key) || (ability.names || []).some(name => (profile._body || '').includes(name)) && ability.book === profile.book).map(ability => abilityIds.get(ability.name));
  const entry = {
    name: displayName(printedName(profile)) || `Profil sans titre (${profile.book} p. ${profile.physicalPage - offset})`,
    book: profile.book, page: profile.physicalPage - offset, physicalPage: profile.physicalPage, kind: 'profile',
    traitsUsed: [...used].sort(), count: used.size, abilityRefs: [...new Set(refs)], sourceNote: SOURCE_NOTE,
    id: `E0-P-${String(nextProfile).padStart(3, '0')}`, blockKey: profile.key, addedOn: ADDED_ON
  };
  nextProfile += 1;
  inventory.profiles.push(entry);
  perBook.set(profile.book, [...(perBook.get(profile.book) || []), entry]);
}

for (const book of BOOKS) {
  const entries = perBook.get(book) || [];
  inventory.coverage.push({
    book, profilePagesPhysical: [...new Set(entries.map(entry => entry.physicalPage))], rulePagesPrinted: [...new Set(NEW_ABILITIES.filter(ability => ability.book === book).map(ability => ability.page))],
    entries: entries.length, profiles: entries.length, templates: 0, pregeneratedCharacters: 0,
    method: 'Repérage des en-têtes de caractéristiques par colonnes (texte layout) ; chiffres lus par alignement sur l’en-tête, cases vides relues sur l’image ; capacités propres relues dans le texte.', addedOn: ADDED_ON
  });
}

const baseQuestions = inventory.openQuestions.length;
const questions = [
  'Les livres L18-L26 emploient les noms de Traits V4 (Flight, Regenerate, Tail Attack, Corrupted, Armoured…) : rapprochés des Traits V5 par la table d’alias de `tools/lib/bestiary-complement-data.mjs`, sans changer leur règle.',
  'Les attaques naturelles V4 (Claws, Claw, Beak, Slam, Tongue Attack, Tail Attack, Bite) portent un bonus de dégâts imprimé : traitées comme les autres « Weapon +n » (dégâts imprimés tels quels, aucun second ajout de BF).',
  'Le Test de Stimulant/Endurance et les seuils en pourcentage des suppléments V4 sont convertis en V5 au lot concerné (±10 → ±1 DR, Avantage → Élan), la conversion étant consignée.',
  'Les profils de L18-L26 sont des PNJ nommés et des créatures d’aventure : tous sont importés (arbitrage « les 508 profils ») ; ceux qui renvoient à un livre ignoré (Ubersreik, Salzenmund, Starter Set, Gamemaster’s Guide) sont signalés, jamais inventés.'
];
questions.forEach((question, index) => inventory.openQuestions.push({ id: `E0-Q${String(baseQuestions + index + 1).padStart(2, '0')}`, question, addedOn: ADDED_ON }));

inventory.counts.complement = { books: BOOKS, profiles: inventory.profiles.filter(entry => entry.addedOn === ADDED_ON).length, traits: NEW_ABILITIES.length, openQuestions: questions.length, addedOn: ADDED_ON };
inventory.counts.openQuestions = inventory.openQuestions.length;
writeFileSync('docs/BESTIAIRE_INVENTAIRE.json', `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`${inventory.profiles.filter(entry => entry.addedOn === ADDED_ON).length} profils, ${NEW_ABILITIES.length} Traits et capacités ajoutés`);

// Rapport lisible : section ajoutée en fin de docs/BESTIAIRE_INVENTAIRE.md (remplacée à chaque exécution).
const MARK = '## Complément du 21/10/2026 (livres L18 à L26)';
const md = readFileSync('docs/BESTIAIRE_INVENTAIRE.md', 'utf8');
const base = md.includes(MARK) ? md.slice(0, md.indexOf(MARK)).trimEnd() : md.trimEnd();
const rows = list => list.map(entry => `| ${entry.id} | ${entry.book} p.${entry.page} | ${entry.name.replace(/\|/g, '/')} | ${entry.traitsUsed.join(', ') || '—'} | ${(entry.abilityRefs || []).join(', ') || '—'} |`).join('\n');
const abilityRows = inventory.traits.filter(entry => entry.addedOn === ADDED_ON).map(entry => `| ${entry.id} | ${entry.book} p.${entry.page} | ${entry.name} / ${entry.nameFr ?? '—'} | ${entry.kind} | ${entry.summaryFr} |`).join('\n');
const section = [
  MARK, '',
  `AJOUT : ${inventory.profiles.filter(entry => entry.addedOn === ADDED_ON).length} références de profils et ${NEW_ABILITIES.length} Traits ou capacités, tous marqués \`addedOn: "${ADDED_ON}"\`. L18 (Power Behind the Throne Companion) était déjà autorisé (arbitrage Q05), sans avoir été inventorié ici ; L19 à L26 ont été ajoutés au corpus le 21/10. Les noms de profils sont déduits du titre imprimé (provisoires, relus à l’import) ; les noms de Traits V4 sont rapprochés des Traits V5 par une table d’alias (\`tools/lib/bestiary-complement-data.mjs\`), sans changer leur règle.`, '',
  '### Traits et capacités ajoutés', '', '| ID | Source | Nom / nom français | Genre | Résumé |', '| --- | --- | --- | --- | --- |', abilityRows, '',
  '### Profils ajoutés', '', '| ID | Source | Nom | Traits reconnus | Capacités |', '| --- | --- | --- | --- | --- |', rows(inventory.profiles.filter(entry => entry.addedOn === ADDED_ON)), ''
].join('\n');
writeFileSync('docs/BESTIAIRE_INVENTAIRE.md', `${base}\n\n${section}`);
