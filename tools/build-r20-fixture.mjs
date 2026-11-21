/**
 * Génère tests/fixtures/rencontre-r20.json : la rencontre de référence R20 de la refonte de l'interface
 * (docs/specs/refonte-interface/spec.md §3), sauvegarde chargeable par « Charger un fichier ».
 * 20 combattants actifs, combat pas encore commencé (round 0), tous tirés du bestiaire par le même chemin que l'outil
 * (createBestiaryLoader, que js/core/bestiary-loader.js partage dans l'application, puis buildParticipantFromBestiary).
 * Aucune valeur de jeu n'est saisie ici : seuls le camp, la nature PJ/PNJ, le lien cavalier-monture et un numéro
 * pour les profils répétés sont posés. La source (livre, page) de chaque combattant est citée dans `notes`.
 *
 * Usage : node tools/build-r20-fixture.mjs [--check]
 *   --check : échoue si le fichier écrit diffère de ce que le générateur produit (fixture à jour).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildParticipantFromBestiary, createBestiaryLoader } from '../js/core/bestiary-profiles.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'tests/fixtures/rencontre-r20.json');
const readJson = path => JSON.parse(readFileSync(resolve(root, path.replace(/^\.\//, '')), 'utf8'));

// Composition (spec §3) : la rencontre d'essai de l'inventaire, complétée à 20 combattants actifs.
// [identifiant du bestiaire, camp, nature, nombre]
const ROSTER = [
  ['E0-P-536', 'pj', 'PJ', 1],      // Erich Massenbach, pré-tiré
  ['E0-P-537', 'pj', 'PJ', 1],      // Jorunn Gromsdottir, pré-tirée
  ['E0-P-538', 'pj', 'PJ', 1],      // Lynathryn Nightsong, pré-tirée, montée
  ['E0-P-539', 'pj', 'PJ', 1],      // Theodosius Schreiber, pré-tiré
  ['E0-P-458', 'pj', 'Créature', 1], // Cheval de selle, monture de Lynathryn
  ['E0-P-173', 'allie', 'PNJ', 1],  // Père Pedragar, prêtre de Taal
  ['E0-P-121', 'ennemi', 'Créature', 1], // Swilegrakk, chamane-bray
  ['E0-P-119', 'ennemi', 'Créature', 1], // Skrakk, bestigor
  ['E0-P-120', 'ennemi', 'Créature', 1], // Ungrakk, seigneur-bête gor
  ['E0-P-122', 'ennemi', 'Créature', 1], // Guzgog, tirailleur ungor (arc court)
  ['E0-P-101', 'ennemi', 'Créature', 5], // Gor
  ['E0-P-102', 'ennemi', 'Créature', 5]  // Ungor
];
const RIDER = 'E0-P-538';
const MOUNT = 'E0-P-458';

export async function buildR20() {
  const loader = createBestiaryLoader(async path => readJson(path));
  const books = await loader.index();
  const titles = new Map(books.map(book => [book.book, book.title]));
  const library = await loader.load(books.map(book => book.book));
  const participants = [];
  const byBestiary = new Map();
  for (const [bestiaryId, camp, kind, count] of ROSTER) {
    const record = library.find(profile => profile.id === bestiaryId);
    if (!record) throw new Error(`profil absent du bestiaire : ${bestiaryId}`);
    for (let n = 1; n <= count; n += 1) {
      const slug = `r20-${bestiaryId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}${count > 1 ? `-${n}` : ''}`;
      const participant = buildParticipantFromBestiary(bestiaryId, { library, camp, zone: 'active', index: count > 1 ? n : null, idFactory: () => slug });
      participant.kind = kind;
      const source = `Source : ${titles.get(record.book) || record.book} (${record.book}), p. ${record.page} — profil ${bestiaryId}.`;
      participant.notes = participant.notes ? `${source} ${participant.notes}` : source;
      participant.states = [];
      // Identifiants d'actions stables (ceux du constructeur sont aléatoires) : la fixture se régénère à l'identique.
      (participant.actions || []).forEach((action, at) => { action.id = `${slug}-action-${at + 1}`; });
      participants.push(participant);
      if (!byBestiary.has(bestiaryId)) byBestiary.set(bestiaryId, participant);
    }
  }
  // Lien durable cavalier → monture et état « monté » (js/core/mounts.js).
  const rider = byBestiary.get(RIDER), mount = byBestiary.get(MOUNT);
  rider.extensions.v5 = { ...rider.extensions.v5, ownMountId: mount.id, mounted: true, mountId: mount.id };
  mount.extensions.v5 = { ...mount.extensions.v5, mountOf: rider.id };
  if (participants.length !== 20) throw new Error(`R20 doit compter 20 combattants (${participants.length})`);
  return {
    schemaVersion: 3,
    reserve: [],
    combat: { round: 0, currentActorId: null, order: [], orderMode: 'automatic', participants },
    activeScene: null, encounters: [], suspendedScenes: [], persistentCharacters: [],
    log: [], diceLines: [],
    extensions: { v5: { turnIndex: 1 } }
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = `${JSON.stringify(await buildR20(), null, 1)}\n`;
  if (process.argv.includes('--check')) {
    let current = '';
    try { current = readFileSync(out, 'utf8').replace(/\r\n/g, '\n'); } catch { /* absent */ }
    if (current !== text) { console.error('tests/fixtures/rencontre-r20.json n’est pas à jour : node tools/build-r20-fixture.mjs'); process.exit(1); }
    console.log('rencontre-r20.json à jour');
  } else {
    writeFileSync(out, text);
    console.log(`rencontre-r20.json écrit (20 combattants)`);
  }
}
