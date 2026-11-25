// Cthulhu 7e (lot C3) : sauvegarde séparée de celle de Warhammer (CA15 à CA17). Une séance complète sur fake-indexeddb
// et un faux localStorage : aucune base ni clé « wfrp » n'est lue, écrite ni supprimée, une base Warhammer préexistante
// reste identique, et un fichier d'un jeu est refusé par l'autre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { createPersistence } from '../../../js/core/persistence.js';
import { migrateSnapshot } from '../../../js/core/migrations.js';
import { JEUX } from '../../../js/core/jeux.js';
import {
  creerSeance, jeuDuFichier, remplacerProfil, lireCompetences, ecrireCompetences, FORMAT_FICHIER, JEU
} from '../../../cthulhu/app.js';
import { ajouterProfil, trouverProfil } from '../../../cthulhu/profils.js';
import * as R from '../../../cthulhu/rencontre.js';

const HARVEY = { nom: 'Harvey Walters', kind: 'PJ', carac: { FOR: 60, CON: 60, TAI: 60, DEX: 55, APP: 50, INT: 70, POU: 60, EDU: 60 }, chance: 50,
  competences: { 'Corps à corps': 40, Esquive: 50, Bibliothèque: 60 }, armeMelee: 'gourdin-grand' };

/** Dés constants : tout d100 vaut 30, toute expression de dés vaut 3. */
const des = { d100: () => ({ jet: 30, candidats: [30] }), lancer: e => (/^[+-]?\d+$/.test(String(e).trim()) ? Number(e) : 3) };

/** Fabrique de bases IndexedDB espionnée : noms ouverts, et accès au vrai contenu pour comparer avant et après. */
function monde() {
  const idb = new IDBFactory();
  const ouvertes = [];
  const espion = {
    open: (nom, version) => { ouvertes.push(nom); return idb.open(nom, version); },
    deleteDatabase: nom => { ouvertes.push(`suppression:${nom}`); return idb.deleteDatabase(nom); },
    databases: () => idb.databases()
  };
  return { idb, espion, ouvertes };
}

/** Faux localStorage qui note chaque clé touchée. */
function faussStockage(initial = {}) {
  const valeurs = new Map(Object.entries(initial));
  const acces = [];
  return {
    acces,
    getItem: cle => { acces.push(cle); return valeurs.has(cle) ? valeurs.get(cle) : null; },
    setItem: (cle, valeur) => { acces.push(cle); valeurs.set(cle, String(valeur)); },
    removeItem: cle => { acces.push(cle); valeurs.delete(cle); },
    contenu: () => Object.fromEntries(valeurs)
  };
}

/** Tout le contenu d'une base : tables, clés, valeurs. */
async function contenuDeLaBase(idb, nom) {
  const db = await new Promise((resolve, reject) => { const r = idb.open(nom); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const tables = [...db.objectStoreNames];
  const out = {};
  for (const table of tables) {
    out[table] = await new Promise((resolve, reject) => { const r = db.transaction(table).objectStore(table).getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  }
  db.close();
  return JSON.parse(JSON.stringify(out));
}

async function ecrireBaseWarhammer(idb) {
  const p = createPersistence({ indexedDB: idb, dbName: 'wfrp-persistence-v2', contextId: 'guest' });
  await p.saveAtomic({ state: { schemaVersion: 4, reserve: [{ id: 'gobelin' }], combat: { participants: [] } },
    operations: [{ operationId: 'op-1', sequence: 1 }], restore: { id: 'r1', reason: 'manual', createdAt: 1000 } });
  p.close();
}

const horloge = () => { let t = 1_700_000_000_000; return () => (t += 1000); };
const jouer = (seance, type, fn) => seance.agir(type, (etat, d) => { const r = fn(etat.rencontre, d); return r === etat.rencontre ? etat : { ...etat, rencontre: r }; }, des);

test('CA15, CA16 : une séance complète (créer, jouer, annuler, recharger, nouvelle rencontre, effacer) ne touche aucun nom de Warhammer', async () => {
  const { idb, espion, ouvertes } = monde();
  await ecrireBaseWarhammer(idb);
  const wfrpAvant = await contenuDeLaBase(idb, 'wfrp-persistence-v2');
  const stockage = faussStockage({ 'wfrp.schema': '4', 'wfrp.theme': 'sombre', 'wfrp.sidePanel': 'ferme' });
  const wfrpStockageAvant = { ...stockage.contenu() };
  stockage.acces.length = 0;

  const s = creerSeance({ indexedDB: espion, stockage, maintenant: horloge() });
  assert.equal(await s.demarrer(), 'neuve');
  assert.equal(JEU.base, 'outil-mj-cthulhu-v1');
  assert.ok(trouverProfil(s.etat.reserve, 'goule'), 'la réserve de départ contient les créatures des livres');
  s.definirPreference('jets-saisis', '1');
  assert.equal(s.preference('jets-saisis'), '1');

  // Créer, composer, jouer.
  assert.equal(s.agir('profil-cree', etat => ({ ...etat, reserve: ajouterProfil(etat.reserve, HARVEY) })).change, true);
  assert.equal(s.agir('composition', etat => ({ ...etat, rencontre: R.composerRencontre(etat.reserve, ['harvey-walters', { id: 'goule', cachee: false }]) })).change, true);
  jouer(s, 'round', r => R.commencerRound(r));
  jouer(s, 'tour', r => R.passerTour(r));
  const journalApresTour = s.etat.rencontre.journal.length;
  assert.ok(journalApresTour > 0);

  // Annuler, rétablir.
  assert.equal(s.annuler(), true);
  assert.ok(s.etat.rencontre.journal.length <= journalApresTour);
  assert.equal(s.retablir(), true);
  assert.equal(s.etat.rencontre.journal.length, journalApresTour);
  await s.attendre();

  // Recharger : un deuxième démarrage reprend la séance, historique compris.
  const instantane = JSON.parse(JSON.stringify(s.etat));
  const s2 = creerSeance({ indexedDB: espion, stockage, maintenant: horloge() });
  assert.equal(await s2.demarrer(), 'reprise');
  assert.deepEqual(JSON.parse(JSON.stringify(s2.etat)), instantane);
  assert.equal(s2.peutAnnuler(), true);
  assert.equal(s2.annuler(), true);
  assert.equal(s2.retablir(), true);

  // Nouvelle rencontre : fin et report sur l'investigateur, puis une autre rencontre.
  s2.agir('fin-rencontre', etat => ({ reserve: R.reporterSurReserve(etat.reserve, etat.rencontre), rencontre: null }));
  assert.equal(s2.etat.rencontre, null);
  assert.notEqual(trouverProfil(s2.etat.reserve, 'harvey-walters').suivi, null);
  s2.agir('composition', etat => ({ ...etat, rencontre: R.composerRencontre(etat.reserve, ['harvey-walters', 'ghast']) }));
  assert.equal(s2.etat.rencontre.participants.length, 2);

  // Effacer : retour à la réserve de départ, l'ancienne séance reste dans les versions précédentes.
  await s2.effacer();
  assert.equal(s2.etat.rencontre, null);
  assert.equal(trouverProfil(s2.etat.reserve, 'harvey-walters'), null);
  assert.equal(s2.peutAnnuler(), false);
  const versions = await s2.versions();
  assert.deepEqual(versions.map(v => v.reason), ['avant-effacement']);
  await s2.restaurer(versions[0].id);
  assert.ok(trouverProfil(s2.etat.reserve, 'harvey-walters'), 'la version précédente rend l’investigateur');
  assert.equal(s2.etat.rencontre.participants.length, 2);
  await s2.attendre();

  // Rien de Warhammer : bases ouvertes, bases existantes, contenu de la base Warhammer, clés du stockage.
  assert.ok(ouvertes.length > 0);
  assert.deepEqual([...new Set(ouvertes)], ['outil-mj-cthulhu-v1']);
  assert.deepEqual((await idb.databases()).map(d => d.name).sort(), ['outil-mj-cthulhu-v1', 'wfrp-persistence-v2']);
  assert.deepEqual(await contenuDeLaBase(idb, 'wfrp-persistence-v2'), wfrpAvant);
  assert.ok(stockage.acces.length > 0);
  assert.deepEqual([...new Set(stockage.acces)].filter(cle => !cle.startsWith('cthulhu.')), [], 'seules des clés « cthulhu. » sont touchées');
  assert.deepEqual(Object.fromEntries(Object.entries(stockage.contenu()).filter(([cle]) => cle.startsWith('wfrp'))), wfrpStockageAvant);
  s.fermer(); s2.fermer();
});

test('CA16 : la base Cthulhu garde sa séance quand la base Warhammer est écrite ou vidée, et inversement', async () => {
  const { idb, espion } = monde();
  const s = creerSeance({ indexedDB: espion, stockage: faussStockage(), maintenant: horloge() });
  await s.demarrer();
  s.agir('profil-cree', etat => ({ ...etat, reserve: ajouterProfil(etat.reserve, HARVEY) }));
  await s.attendre();
  const cthulhuAvant = await contenuDeLaBase(idb, 'outil-mj-cthulhu-v1');
  await ecrireBaseWarhammer(idb);
  const wm = createPersistence({ indexedDB: idb, dbName: 'wfrp-persistence-v2', contextId: 'guest' });
  await wm.clearContext();
  wm.close();
  assert.deepEqual(await contenuDeLaBase(idb, 'outil-mj-cthulhu-v1'), cthulhuAvant, 'effacer Warhammer ne touche pas Cthulhu');
  await ecrireBaseWarhammer(idb);
  const wfrpAvant = await contenuDeLaBase(idb, 'wfrp-persistence-v2');
  await s.effacer();
  assert.deepEqual(await contenuDeLaBase(idb, 'wfrp-persistence-v2'), wfrpAvant, 'effacer Cthulhu ne touche pas Warhammer');
  s.fermer();
});

test('CA17 : export et import de Cthulhu ; un fichier de Warhammer est refusé en nommant le jeu', async () => {
  const { espion } = monde();
  const s = creerSeance({ indexedDB: espion, stockage: null, maintenant: horloge() });
  await s.demarrer();
  s.agir('profil-cree', etat => ({ ...etat, reserve: ajouterProfil(etat.reserve, HARVEY) }));
  s.agir('composition', etat => ({ ...etat, rencontre: R.composerRencontre(etat.reserve, ['harvey-walters', 'goule']) }));
  const fichier = s.exporter();
  assert.equal(fichier.format, FORMAT_FICHIER);
  assert.equal(fichier.jeu, 'cthulhu');
  assert.equal(fichier.nomJeu, 'L’Appel de Cthulhu');
  assert.ok(!('reserve' in fichier) && !('combat' in fichier) && !('schemaVersion' in fichier), 'rien qui ressemble à une sauvegarde de Warhammer');
  const texte = JSON.stringify(fichier);

  // Aller-retour dans une séance neuve.
  const { espion: autre } = monde();
  const s2 = creerSeance({ indexedDB: autre, stockage: null, maintenant: horloge() });
  await s2.demarrer();
  const bilan = await s2.importer(texte);
  assert.equal(bilan.rencontre, true);
  assert.deepEqual(JSON.parse(JSON.stringify(s2.etat)), JSON.parse(JSON.stringify(s.etat)));
  assert.deepEqual((await s2.versions()).map(v => v.reason), ['avant-import']);

  // Refus d'un fichier de Warhammer (avec ou sans nom de jeu) : le message nomme Warhammer, rien ne change.
  const avant = JSON.stringify(s2.etat);
  const warhammer = JSON.stringify({ schemaVersion: 4, reserve: [], combat: { participants: [] } });
  await assert.rejects(s2.importer(warhammer), /sauvegarde de Warhammer, pas de L’Appel de Cthulhu : ouvrez-le depuis Warhammer/);
  await assert.rejects(s2.importer(JSON.stringify({ format: FORMAT_FICHIER, formatVersion: 1, jeu: 'warhammer', nomJeu: 'Warhammer', contenu: {} })), /sauvegarde de Warhammer/);
  // Autres refus, en français : ni JSON, ni sauvegarde de l'outil, version trop récente, contenu illisible.
  await assert.rejects(s2.importer('pas du json'), /JSON invalide/);
  await assert.rejects(s2.importer(JSON.stringify({ au: 'hasard' })), /n’est pas une sauvegarde de l’Outil MJ/);
  await assert.rejects(s2.importer(JSON.stringify({ ...fichier, formatVersion: 99 })), /version plus récente/);
  await assert.rejects(s2.importer(JSON.stringify({ ...fichier, contenu: { reserve: { profils: [{ nom: '' }], armes: {} }, rencontre: null } })), /obligatoire/);
  assert.equal(JSON.stringify(s2.etat), avant, 'un refus ne change rien');

  // Dans l'autre sens : Warhammer refuse un fichier de Cthulhu (sa lecture exige `reserve` et `combat`).
  assert.throws(() => migrateSnapshot(JSON.parse(texte)), /incomplète|invalide/);
  s.fermer(); s2.fermer();
});

test('jeuDuFichier : reconnaît Cthulhu, Warhammer (avec ou sans nom de jeu) et refuse le reste', () => {
  assert.equal(jeuDuFichier({ format: FORMAT_FICHIER, jeu: 'cthulhu' }).id, 'cthulhu');
  assert.equal(jeuDuFichier({ format: FORMAT_FICHIER, jeu: 'imperium', nomJeu: 'Imperium Maledictum' }).nom, 'Imperium Maledictum');
  assert.equal(jeuDuFichier({ schemaVersion: 4, reserve: [], combat: {} }).id, 'warhammer');
  for (const v of [null, [], 'texte', 12, {}, { reserve: [] }]) assert.equal(jeuDuFichier(v), null);
  assert.ok(JEUX.some(j => j.id === 'cthulhu' && j.base === JEU.base && j.prefixe === 'cthulhu.'));
});

test('sauvegarde illisible : gardée en version précédente, la séance repart de la réserve de départ', async () => {
  const { idb, espion } = monde();
  const p = createPersistence({ indexedDB: idb, dbName: JEU.base, contextId: 'local' });
  await p.saveAtomic({ state: { version: 1, reserve: { profils: 'cassé' }, rencontre: null } });
  p.close();
  const s = creerSeance({ indexedDB: espion, stockage: null, maintenant: horloge() });
  assert.equal(await s.demarrer(), 'illisible');
  assert.ok(trouverProfil(s.etat.reserve, 'goule'));
  assert.deepEqual((await s.versions()).map(v => v.reason), ['illisible']);
  s.fermer();
});

test('un état qui échoue (profil invalide) laisse la séance intacte et l’historique inchangé', async () => {
  const { espion } = monde();
  const s = creerSeance({ indexedDB: espion, stockage: null, maintenant: horloge() });
  await s.demarrer();
  const avant = JSON.stringify(s.etat);
  const r = s.agir('profil-cree', etat => ({ ...etat, reserve: ajouterProfil(etat.reserve, { nom: '', kind: 'PJ' }) }));
  assert.equal(r.change, false);
  assert.match(r.erreur.message, /nom est obligatoire/);
  assert.equal(JSON.stringify(s.etat), avant);
  assert.equal(s.peutAnnuler(), false);
  s.fermer();
});

test('modifier un profil : une compétence retirée disparaît, le rang et le suivi sont gardés ; compétences saisies en lignes', () => {
  let reserve = ajouterProfil(ajouterProfil((creerSeance({ indexedDB: new IDBFactory(), stockage: null }).etat.reserve), HARVEY), { ...HARVEY, nom: 'Alice' });
  reserve = { ...reserve, profils: reserve.profils.map(p => (p.id === 'harvey-walters' ? { ...p, suivi: { pv: 3, blessureGrave: false, etat: 'actif', san: 40, journeeSan: { sanDebut: 60, perteJour: 20, persistanteDeclenchee: false }, folie: null, chance: 20 } } : p)) };
  const rang = reserve.profils.findIndex(p => p.id === 'harvey-walters');
  const modifie = remplacerProfil(reserve, 'harvey-walters', { ...HARVEY, nom: 'Harvey W.', competences: lireCompetences('Esquive 45\nCorps à corps : 35 %') });
  assert.equal(modifie.profils.findIndex(p => p.id === 'harvey-walters'), rang);
  const h = trouverProfil(modifie, 'harvey-walters');
  assert.equal(h.nom, 'Harvey W.');
  assert.deepEqual(h.competences, { Esquive: 45, 'Corps à corps': 35 });
  assert.equal(h.suivi.chance, 20);
  assert.equal(trouverProfil(reserve, 'harvey-walters').nom, 'Harvey Walters', 'la réserve d’origine est intacte');
  assert.throws(() => remplacerProfil(reserve, 'absent', HARVEY), /introuvable/);
  assert.throws(() => remplacerProfil(reserve, 'harvey-walters', { ...HARVEY, nom: '' }), /nom est obligatoire/);
  assert.throws(() => lireCompetences('Esquive beaucoup'), /illisible/);
  assert.equal(ecrireCompetences({ Esquive: 45, 'Corps à corps': 35 }), 'Esquive : 45\nCorps à corps : 35');
});

test('CA17, sens inverse : Warhammer refuse un fichier exporté par Cthulhu en nommant le jeu, sans rien changer', async () => {
  const { createStore } = await import('../../../js/core/store.js');
  const { userMessage } = await import('../../../js/ui/messages.js');
  const { espion } = monde();
  const s = creerSeance({ indexedDB: espion, stockage: null, maintenant: horloge() });
  await s.demarrer();
  s.agir('profil-cree', etat => ({ ...etat, reserve: ajouterProfil(etat.reserve, HARVEY) }));
  const texte = JSON.stringify(s.exporter());
  s.fermer();

  let ecritures = 0;
  const persistence = {
    async load() { return null; },
    async saveAtomic() { ecritures++; return { ok: true }; }
  };
  const store = createStore({ persistence });
  await store.ready;
  await store.addProfile({ id: 'garde', name: 'Garde', hp: 12 });
  const avant = ecritures;
  for (const entree of [texte, JSON.parse(texte)]) {
    assert.throws(() => store.previewImport(entree), erreur => /vient de L’Appel de Cthulhu/.test(userMessage(erreur)),
      'le message nomme le jeu du fichier');
    assert.throws(() => store.loadFromJSON(entree), erreur => /vient de L’Appel de Cthulhu/.test(userMessage(erreur)));
  }
  assert.equal(ecritures, avant, 'le refus n’écrit rien');
  assert.deepEqual([...JSON.parse(store.getFullJSON({ includeHistory: false })).reserve.map(p => p.id)], ['garde']);
});
