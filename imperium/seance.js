/**
 * Séance d’Imperium Maledictum (lot I6 du chantier multi-jeux) : état de jeu (réserve + rencontre),
 * historique annuler / rétablir, sauvegarde dans la base du jeu, fichier d’export et d’import.
 * Module pur, sans DOM : un test sous Node le joue sur `fake-indexeddb` ; l’interface (`app.js`) arrive dans un lot suivant.
 *
 * Imports : uniquement `imperium/` et les modules communs du chapeau (liste gardée par
 * tests/unit/chapeau/modules-communs.test.mjs). Rien de Warhammer. Le nom de la base et le préfixe des clés
 * viennent du registre `js/core/jeux.js` : aucune base ni clé `wfrp*` ni `cthulhu.*` n’est lue, écrite ni supprimée.
 */
import { createPersistence } from '../js/core/persistence.js';
import { safeLocalStorage } from '../js/core/safe-storage.js';
import { createCompactStateCommand, applyStateChanges } from '../js/core/commands.js';
import { createHistory, recordCommand, undo, redo, canUndo, canRedo } from '../js/core/history.js';
import { JEUX } from '../js/core/jeux.js';
import { creerReserve, ajouterArme, ajouterProfil, supprimerProfil } from './profils.js';
import * as R from './rencontre.js';
import { reserveDeDepart } from './donnees-depart.js';

export const JEU = JEUX.find(jeu => jeu.id === 'imperium');
export const FORMAT_FICHIER = 'outil-mj-sauvegarde';
export const VERSION_FICHIER = 1;
export const VERSION_ETAT = 1;
const CONTEXTE = 'local';

// ---------------------------------------------------------------------------
// État de départ, lecture d'une sauvegarde ou d'un fichier
// ---------------------------------------------------------------------------

export const etatDeDepart = () => ({ reserve: reserveDeDepart(), rencontre: null });

/** Réserve relue pièce à pièce par les fonctions de `profils.js` : tout ce qui est invalide est refusé en français. */
export function reconstruireReserve(brute) {
  if (!brute || typeof brute !== 'object' || !Array.isArray(brute.profils) || !brute.armes || typeof brute.armes !== 'object') {
    throw new RangeError('La réserve de ce fichier est illisible.');
  }
  let reserve = creerReserve();
  for (const arme of Object.values(brute.armes)) reserve = ajouterArme(reserve, arme);
  for (const profil of brute.profils) reserve = ajouterProfil(reserve, profil);
  return reserve;
}

export function verifierRencontre(rencontre) {
  if (rencontre === null || rencontre === undefined) return null;
  if (typeof rencontre !== 'object' || rencontre.version !== R.VERSION_RENCONTRE || !Array.isArray(rencontre.participants)
    || !Array.isArray(rencontre.ordre) || !Array.isArray(rencontre.journal) || !Array.isArray(rencontre.zones)
    || !Array.isArray(rencontre.engages) || !rencontre.armes || typeof rencontre.armes !== 'object') {
    throw new RangeError('La rencontre de ce fichier est illisible.');
  }
  return rencontre;
}

/** Le jeu d'où vient un fichier : un fichier de l'outil nomme son jeu ; une sauvegarde de Warhammer d'avant le chapeau n'en nomme aucun. */
export function jeuDuFichier(donnees) {
  if (!donnees || typeof donnees !== 'object' || Array.isArray(donnees)) return null;
  if (donnees.format === FORMAT_FICHIER && typeof donnees.jeu === 'string') {
    return JEUX.find(jeu => jeu.id === donnees.jeu) ?? { id: donnees.jeu, nom: donnees.nomJeu || donnees.jeu };
  }
  if ('combat' in donnees && 'reserve' in donnees) return JEUX.find(jeu => jeu.id === 'warhammer');
  return null;
}

/** Remplace un profil sans changer son rang ni son suivi : les compétences retirées du formulaire disparaissent. */
export function remplacerProfil(reserve, id, donnees) {
  const rang = reserve.profils.findIndex(profil => profil.id === id);
  if (rang < 0) throw new RangeError(`Profil introuvable : ${id}.`);
  const ancien = reserve.profils[rang];
  const avec = ajouterProfil(supprimerProfil(reserve, id), { ...donnees, id, suivi: ancien.suivi });
  const profils = avec.profils.slice(0, -1);
  profils.splice(rang, 0, avec.profils.at(-1));
  return { ...avec, profils };
}

/** « Mêlée 40 » ou « Mêlée : 40 », une compétence par ligne. */
export function lireCompetences(texte) {
  const competences = {};
  for (const ligne of String(texte ?? '').split(/\r?\n/)) {
    const t = ligne.trim();
    if (!t) continue;
    const m = t.match(/^(.+?)\s*[:=]?\s*(\d{1,3})\s*%?$/);
    if (!m) throw new RangeError(`Compétence illisible : « ${t} » (forme attendue : Mêlée 40).`);
    competences[m[1].trim()] = Number(m[2]);
  }
  return competences;
}
export const ecrireCompetences = competences => Object.entries(competences ?? {})
  .filter(([, valeur]) => valeur !== null && valeur !== undefined).map(([nom, valeur]) => `${nom} : ${valeur}`).join('\n');

// ---------------------------------------------------------------------------
// Séance : état, historique, sauvegarde, fichiers
// ---------------------------------------------------------------------------

/**
 * `indexedDB` et `stockage` sont injectables (tests). `surSauvegarde(erreur | null)` est appelé après chaque écriture.
 * L'état est `{ reserve, rencontre }` ; chaque changement passe par `agir` et se retrouve dans l'historique.
 */
export function creerSeance({ indexedDB = globalThis.indexedDB, stockage = safeLocalStorage(), maintenant = () => Date.now(), surSauvegarde = () => {} } = {}) {
  let etat = etatDeDepart();
  let historique = createHistory();
  let persistance = null;
  let file = Promise.resolve();
  let compteur = 0;

  const instantane = (avecHistorique = true) => ({ version: VERSION_ETAT, reserve: etat.reserve, rencontre: etat.rencontre,
    ...(avecHistorique ? { historique } : {}) });

  function ecrire(options = {}) {
    if (!persistance) return file;
    const donnees = { state: instantane(), ...options };
    file = file.then(() => persistance.saveAtomic(donnees)).then(() => surSauvegarde(null), erreur => surSauvegarde(erreur));
    return file;
  }

  function lireInstantane(brut) {
    if (!brut || typeof brut !== 'object' || brut.version !== VERSION_ETAT) throw new RangeError('La sauvegarde est d’une version inconnue.');
    return { reserve: reconstruireReserve(brut.reserve), rencontre: verifierRencontre(brut.rencontre) };
  }

  const seance = {
    get etat() { return etat; },
    get historique() { return historique; },
    peutAnnuler: () => canUndo(historique),
    peutRetablir: () => canRedo(historique),
    attendre: () => file,

    /** Ouvre la base du jeu et reprend la séance sauvegardée. Rend 'reprise', 'neuve' ou 'illisible' (la sauvegarde illisible est gardée en version précédente). */
    async demarrer() {
      persistance = createPersistence({ indexedDB, dbName: JEU.base, contextId: CONTEXTE });
      const brut = await persistance.load();
      if (!brut) { await ecrire(); return 'neuve'; }
      try {
        etat = lireInstantane(brut);
        historique = brut.historique && typeof brut.historique === 'object' ? brut.historique : createHistory();
        return 'reprise';
      } catch {
        await persistance.saveAtomic({ restore: { reason: 'illisible', state: brut } });
        etat = etatDeDepart();
        historique = createHistory();
        await ecrire();
        return 'illisible';
      }
    },

    /**
     * Applique `fn(etat, des)` (qui rend le nouvel état, ou le même s'il n'y a rien à faire), l'enregistre dans l'historique
     * et le sauvegarde. Rend `{ change, erreur }` ; une exception de `fn` laisse tout intact.
     */
    agir(type, fn, des = null) {
      const avant = etat;
      let apres;
      try { apres = fn(avant, des); } catch (erreur) { return { change: false, erreur }; }
      if (apres === avant || (apres.reserve === avant.reserve && apres.rencontre === avant.rencontre)) return { change: false, erreur: null };
      historique = recordCommand(historique, createCompactStateCommand({ id: `c${maintenant()}-${++compteur}`, type, before: avant, after: apres }));
      etat = apres;
      ecrire();
      return { change: true, erreur: null };
    },

    annuler() {
      const r = undo(historique);
      if (!r.command) return false;
      historique = r.history;
      etat = applyStateChanges(etat, r.command.inverse.changes);
      ecrire();
      return true;
    },
    retablir() {
      const r = redo(historique);
      if (!r.command) return false;
      historique = r.history;
      etat = applyStateChanges(etat, r.command.result.changes);
      ecrire();
      return true;
    },

    /** Fichier d'export : il nomme son jeu, pour que l'autre jeu le refuse en le nommant. Aucune clé de premier niveau `reserve` ni `combat` (Warhammer le refuse). */
    exporter() {
      return { format: FORMAT_FICHIER, formatVersion: VERSION_FICHIER, jeu: JEU.id, nomJeu: JEU.nom,
        exporteLe: new Date(maintenant()).toISOString(), contenu: { reserve: etat.reserve, rencontre: etat.rencontre } };
    },

    /** Remplace la séance par le contenu d'un fichier (la séance précédente reste dans les versions précédentes). */
    async importer(texte) {
      let donnees;
      try { donnees = JSON.parse(texte); } catch { throw new RangeError('Ce fichier n’est pas une sauvegarde lisible (JSON invalide).'); }
      const jeu = jeuDuFichier(donnees);
      if (!jeu) throw new RangeError('Ce fichier n’est pas une sauvegarde de l’Outil MJ.');
      if (jeu.id !== JEU.id) throw new RangeError(`Ce fichier est une sauvegarde de ${jeu.nom}, pas de ${JEU.nom} : ouvrez-le depuis ${jeu.nom}.`);
      if (!Number.isInteger(donnees.formatVersion) || donnees.formatVersion < 1) throw new RangeError('Ce fichier n’est pas une sauvegarde lisible (version absente).');
      if (donnees.formatVersion > VERSION_FICHIER) throw new RangeError('Ce fichier vient d’une version plus récente de l’outil : mettez l’outil à jour pour le lire.');
      const suivant = lireInstantane({ version: VERSION_ETAT, ...donnees.contenu });
      const ancien = instantane(false);
      etat = suivant;
      historique = createHistory();
      await ecrire({ restore: { reason: 'avant-import', state: ancien } });
      return { profils: etat.reserve.profils.length, armes: Object.keys(etat.reserve.armes).length, rencontre: etat.rencontre !== null };
    },

    /** Repart de la réserve de départ ; la séance effacée reste dans les versions précédentes. */
    async effacer() {
      const ancien = instantane(false);
      etat = etatDeDepart();
      historique = createHistory();
      await ecrire({ restore: { reason: 'avant-effacement', state: ancien } });
    },

    async versions() {
      return persistance ? (await persistance.listRestorePoints()).map(({ id, createdAt, reason }) => ({ id, createdAt, reason })) : [];
    },

    async restaurer(id) {
      const point = (await persistance.listRestorePoints()).find(p => p.id === id);
      if (!point) throw new RangeError('Cette version précédente n’existe plus.');
      const suivant = lireInstantane(point.state);
      const ancien = instantane(false);
      etat = suivant;
      historique = createHistory();
      await ecrire({ restore: { reason: 'avant-restauration', state: ancien } });
    },

    /** Préférences de l'écran : clés préfixées par celui du jeu, jamais d'autres. */
    preference(nom) {
      try { return stockage?.getItem(`${JEU.prefixe}${nom}`) ?? null; } catch { return null; }
    },
    definirPreference(nom, valeur) {
      try { stockage?.setItem(`${JEU.prefixe}${nom}`, String(valeur)); } catch { /* stockage refusé : la préférence ne sera pas gardée */ }
    },

    fermer() { persistance?.close(); }
  };
  return seance;
}
