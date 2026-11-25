/**
 * Page de L'Appel de Cthulhu 7e (lot C3 du chantier multi-jeux).
 *
 * Deux parties dans ce fichier :
 * 1. la séance (`creerSeance`) : état de jeu (réserve + rencontre), historique annuler / rétablir, sauvegarde dans la
 *    base du jeu, fichier d'export et d'import. Sans DOM : un test sous Node la joue sur `fake-indexeddb` ;
 * 2. l'interface, lancée seulement dans un navigateur (préparer, jouer, journal, fichiers).
 *
 * Imports : uniquement `cthulhu/` et les modules communs du chapeau (liste gardée par
 * tests/unit/chapeau/modules-communs.test.mjs). Rien de Warhammer. Le nom de la base et le préfixe des clés viennent du
 * registre `js/core/jeux.js` : aucune base ni clé `wfrp` n'est lue, écrite ni supprimée.
 */
import { createPersistence } from '../js/core/persistence.js';
import { safeLocalStorage } from '../js/core/safe-storage.js';
import { createCompactStateCommand, applyStateChanges } from '../js/core/commands.js';
import { createHistory, recordCommand, undo, redo, canUndo, canRedo } from '../js/core/history.js';
import { participantCamp } from '../js/core/participant-camp.js';
import { JEUX } from '../js/core/jeux.js';
import { MAP_LINK_CHANNEL, MAP_LINK_PING_MS } from '../js/core/map-link-protocol.js';
import { initSelecteurJeu } from '../js/ui/selecteur-jeu.js';
import { initThemeManager } from '../js/ui/theme.js';
import { renderMapLinkIndicator, renderMapLinkPending } from '../js/ui/map-link-indicator.js';
import { creerLiaisonCarte } from './projection-carte.js';
import { lancerD100, lancerExpression, LIBELLE_NIVEAU, LIBELLE_DIFFICULTE, seuils } from './regles.js';
import { validerEntier, fournisseurStrict, planResolution, evaluerJetConBlessure, planJetSan } from './saisie-des.js';
import {
  creerReserve, ajouterArme, modifierArme, supprimerArme, ajouterProfil, supprimerProfil, normaliserProfil, valeursDerivees,
  nouvelleJournee, idDepuisNom, trouverProfil, CARACS
} from './profils.js';
import * as R from './rencontre.js';
import { reserveDeDepart, CREATURES_DEPART } from './donnees-depart.js';

export const JEU = JEUX.find(jeu => jeu.id === 'cthulhu');
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
    || !Array.isArray(rencontre.ordre) || !Array.isArray(rencontre.journal) || !rencontre.armes || typeof rencontre.armes !== 'object') {
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

/** « Esquive 40 » ou « Esquive : 40 », une compétence par ligne. */
export function lireCompetences(texte) {
  const competences = {};
  for (const ligne of String(texte ?? '').split(/\r?\n/)) {
    const t = ligne.trim();
    if (!t) continue;
    const m = t.match(/^(.+?)\s*[:=]?\s*(\d{1,3})\s*%?$/);
    if (!m) throw new RangeError(`Compétence illisible : « ${t} » (forme attendue : Esquive 40).`);
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

// ---------------------------------------------------------------------------
// Interface (navigateur seulement)
// ---------------------------------------------------------------------------

const SOURCES = Object.fromEntries(CREATURES_DEPART.map(c => [c.id, c.source]));
const ETAT = { actif: 'actif', inconscient: 'inconscient', mourant: 'mourant', mort: 'mort' };
const LIBELLE_KIND = { PJ: 'Investigateurs', PNJ: 'PNJ', CREATURE: 'Créatures' };
const LIBELLE_CAMP = { pj: 'investigateurs', ennemi: 'adversaires', neutre: 'neutre' };
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function lancerInterface() {
  const $ = sel => document.querySelector(sel);
  const ui = { onglet: 'preparer', edition: null, compo: {}, versions: false };
  let seance = null;
  let carte = null;
  let delaiMessage = null;

  // --- Messages -------------------------------------------------------------------------------------------------------

  function message(texte, type = 'info') {
    const el = $('#message');
    el.textContent = texte;
    el.dataset.type = type;
    el.hidden = false;
    clearTimeout(delaiMessage);
    delaiMessage = setTimeout(() => { el.hidden = true; }, type === 'erreur' ? 9000 : 5000);
  }

  // --- Dés : saisis par le MJ dans chaque action, ou tirés au hasard ---------------------------------------------------------------------

  /** Mode saisi : la case « Jets saisis par le MJ » en haut de la carte Action (préférence `cthulhu.jets-saisis`). */
  const saisis = () => seance.preference('jets-saisis') === '1';

  /** Mode hasard (case décochée) : le moteur tire lui-même, comme avant. */
  function fournisseurHasard() {
    return {
      d100(net) { return lancerD100({ net }); },
      lancer(expression) { return lancerExpression(expression); }
    };
  }

  /** Plan de la résolution en attente affiché dans la fenêtre « Résoudre » (mis à jour à chaque rendu). */
  let planRes = null;
  /** Ids des champs de dés consommés par la dernière action réussie : vidés au rendu suivant. */
  const champsAVider = new Set();

  /**
   * Lit et valide une liste de champs de saisie. `champs` : `[{ sel, id, type: 'd100' | 'lancer', libelle }]` ;
   * `type` dit dans quelle file va la valeur (les d100 d'abord, dans l'ordre des champs, comme le moteur les
   * demande). Toute case vide ou invalide bloque l'action : `{ ok: false, el, message }`, message en français.
   */
  function lireChamps(champs) {
    const d100 = [], lancers = [];
    for (const c of champs) {
      const el = document.querySelector(c.sel);
      if (!el) return { ok: false, el: null, message: `${c.libelle} : champ de saisie introuvable.` };
      const r = validerEntier(el.value, c.type === 'd100'
        ? { min: 1, max: 100, libelle: c.libelle }
        : { min: 0, max: Infinity, libelle: c.libelle });
      if (!r.ok) return { ok: false, el, message: r.message };
      (c.type === 'd100' ? d100 : lancers).push(r.valeur);
    }
    return { ok: true, d100, lancers };
  }

  /** Refus de validation : message en français, `aria-invalid` et focus sur le premier champ en défaut, aucun tirage. */
  function bloquerSaisie(el, texte) {
    for (const e of document.querySelectorAll('[aria-invalid="true"]')) e.removeAttribute('aria-invalid');
    if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); }
    message(texte, 'erreur');
  }

  /**
   * Champs d'un jet de SAN pour un investigateur : d100 SAN, puis la perte (si la branche prédite par
   * `planJetSan` contient des dés), puis le d100 INT (si la perte vaut ≥ 5). Le coût invalide laisse le moteur
   * seul juge (il refusera l'action avec son message).
   */
  function champsJetSan(pj, cout, sels) {
    const base = [{ sel: sels.san, id: sels.idSan ?? null, type: 'd100', libelle: `d100 SAN (${pj.nom})` }];
    const lu = lireChamps(base);
    if (!lu.ok) return lu;
    const jet = lu.d100[0];
    const champs = [...base];
    let plan;
    try { plan = planJetSan(pj, cout, { jetSan: jet }); } catch { return { ok: true, champs }; }
    if (plan.champPerte) {
      const perte = { sel: sels.perte, id: sels.idPerte ?? null, type: 'lancer', libelle: `Perte (${plan.champPerte.expression}) — ${pj.nom}` };
      const luPerte = lireChamps([perte]);
      if (!luPerte.ok) return luPerte;
      champs.push(perte);
      try { plan = planJetSan(pj, cout, { jetSan: jet, perte: luPerte.lancers[0] }); } catch { /* le moteur tranchera */ }
    }
    if (plan.jetIntRequis) champs.push({ sel: sels.int, id: sels.idInt ?? null, type: 'd100', libelle: `d100 INT (${pj.nom})` });
    return { ok: true, champs };
  }

  // --- Actions --------------------------------------------------------------------------------------------------------

  const rencontre = () => seance.etat.rencontre;

  function agir(type, fn, { avecDes = true, des = null, avantRendre = null } = {}) {
    const r = seance.agir(type, fn, avecDes ? (des ?? fournisseurHasard()) : null);
    if (r.erreur) message(`Impossible : ${r.erreur.message}`, 'erreur');
    if (avantRendre) avantRendre(r);
    rendre();
    return r;
  }

  /** Action sur la rencontre en cours ; une ligne d'erreur ajoutée au journal par le moteur s'affiche aussi en message. */
  function jouer(type, fn, des = null, opts = {}) {
    const avant = rencontre().journal.length;
    const r = agir(type, (etat, d) => {
      const suivante = fn(etat.rencontre, d);
      return suivante === etat.rencontre ? etat : { ...etat, rencontre: suivante };
    }, { ...opts, des });
    const derniere = rencontre().journal.at(-1);
    if (r.change && derniere?.type === 'erreur' && rencontre().journal.length > avant) message(derniere.texte, 'erreur');
    return r;
  }

  /**
   * Action du moteur avec les dés saisis. En mode saisi, `champs` est lu et validé avant tout appel à
   * `seance.agir` (case vide ou invalide → refus, aucune action, aucun tirage) puis joué avec un
   * `fournisseurStrict` : si le moteur demande un dé qui n'a pas été saisi, il lève et le message d'erreur
   * français s'affiche, sans tirer au hasard. Les champs consommés sont vidés au rendu suivant si l'action réussit.
   */
  function jouerSaisi(type, fn, champs, opts = {}) {
    if (!saisis()) return jouer(type, fn, null, opts);
    const lu = lireChamps(champs);
    if (!lu.ok) { bloquerSaisie(lu.el, lu.message); return { change: false, erreur: null }; }
    const des = fournisseurStrict({ d100: lu.d100, lancers: lu.lancers });
    return jouer(type, fn, des, {
      ...opts,
      avantRendre: r => { if (r.change) for (const c of champs) if (c.id) champsAVider.add(c.id); }
    });
  }

  const confirmer = (bouton, texte, action) => {
    if (bouton.dataset.confirmer !== '1') {
      bouton.dataset.confirmer = '1';
      bouton.dataset.libelle = bouton.textContent;
      bouton.textContent = texte;
      return;
    }
    bouton.dataset.confirmer = '';
    bouton.textContent = bouton.dataset.libelle;
    action();
  };

  // --- Rendu : préparer -----------------------------------------------------------------------------------------------

  function etatDuSuivi(p) {
    const s = p.suivi;
    if (!s) return '<small>neuf</small>';
    const d = valeursDerivees(p);
    return `<small>PV ${s.pv}/${d.pvMax}${s.blessureGrave ? ' (blessure grave)' : ''} · SAN ${s.san} · Chance ${s.chance}${s.folie ? ` · folie ${esc(s.folie)}` : ''}${s.etat !== 'actif' ? ` · ${ETAT[s.etat]}` : ''}</small>`;
  }

  function ligneProfil(p) {
    const d = valeursDerivees(p);
    const c = ui.compo[p.id] ?? { n: 0, cachee: p.cachee };
    const source = SOURCES[p.id];
    const compo = p.kind === 'PJ'
      ? `<label><input type="checkbox" data-compo="${esc(p.id)}"${c.n ? ' checked' : ''}> dans la rencontre</label>`
      : `<label>× <input type="number" min="0" max="9" value="${c.n}" data-compo="${esc(p.id)}" aria-label="Nombre de ${esc(p.nom)} dans la rencontre"></label>
         <label><input type="checkbox" data-cachee="${esc(p.id)}"${c.cachee ? ' checked' : ''}> cachée au départ</label>`;
    const valeurs = `PV ${d.pvMax} · DEX ${p.carac.DEX} · MVT ${d.mvt}${p.armure ? ` · armure ${p.armure}` : ''}${p.attaquesParRound > 1 ? ` · ${p.attaquesParRound} attaques/round` : ''}${p.coutSan ? ` · SAN ${esc(p.coutSan)}` : ''}`;
    return `<tr class="camp-${participantCamp({ camp: p.camp, kind: p.kind })}" data-profil="${esc(p.id)}">
      <td class="compo">${compo}</td>
      <td><strong>${esc(p.nom)}</strong>${source ? `<br><small>${esc(source.livre)} p. ${esc(source.pages.at(-1))}</small>` : ''}${p.kind === 'PJ' ? `<br>${etatDuSuivi(p)}` : ''}</td>
      <td><small>${valeurs}</small></td>
      <td class="actions"><button type="button" data-action="modifier-profil" data-id="${esc(p.id)}">Modifier</button>
        <button type="button" data-action="supprimer-profil" data-id="${esc(p.id)}">Supprimer</button></td>
    </tr>`;
  }

  const optionsArmes = (reserve, type, choisie, vide) => `<option value="">${vide}</option>`
    + Object.values(reserve.armes).filter(a => a.type === type)
      .map(a => `<option value="${esc(a.id)}"${a.id === choisie ? ' selected' : ''}>${esc(a.nom)}</option>`).join('');

  function formulaireProfil(reserve) {
    const p = ui.edition.id ? trouverProfil(reserve, ui.edition.id) : null;
    const nombre = (nom, valeur, extra = '') => `<label>${nom} <input type="number" min="0" max="999" name="carac-${nom}" value="${valeur ?? ''}" ${extra}></label>`;
    return `<form id="form-profil" class="formulaire" aria-label="${p ? `Modifier ${esc(p.nom)}` : 'Nouveau profil'}">
      <h3>${p ? `Modifier ${esc(p.nom)}` : 'Nouveau profil'}</h3>
      <div class="champs">
        <label>Nom <input type="text" name="nom" required value="${esc(p?.nom)}"></label>
        <label>Type <select name="kind">${['PJ', 'PNJ', 'CREATURE'].map(k => `<option value="${k}"${(p?.kind ?? 'PJ') === k ? ' selected' : ''}>${{ PJ: 'Investigateur', PNJ: 'PNJ', CREATURE: 'Créature' }[k]}</option>`).join('')}</select></label>
        <label>Camp <select name="camp">${['pj', 'ennemi', 'neutre'].map(k => `<option value="${k}"${(p?.camp ?? 'pj') === k ? ' selected' : ''}>${LIBELLE_CAMP[k]}</option>`).join('')}</select></label>
      </div>
      <fieldset><legend>Caractéristiques</legend>${CARACS.map(c => nombre(c, p ? p.carac[c] : '')).join('')}
        <label>Chance (investigateur) <input type="number" min="0" max="999" name="chance" value="${p?.chance ?? ''}"></label></fieldset>
      <p id="derives" class="derives" aria-live="polite"></p>
      <label class="large">Compétences, une par ligne (« Esquive 40 »)<textarea name="competences" rows="5">${esc(ecrireCompetences(p?.competences))}</textarea></label>
      <div class="champs">
        <label>Arme de mêlée <select name="armeMelee">${optionsArmes(reserve, 'melee', p ? p.armeMelee : 'poing', 'aucune')}</select></label>
        <label>Arme à feu <select name="armeTir">${optionsArmes(reserve, 'feu', p?.armeTir, 'aucune')}</select></label>
        <label>Attaques par round <input type="number" min="1" max="20" name="attaquesParRound" value="${p?.attaquesParRound ?? 1}"></label>
        <label>Armure <input type="number" min="0" max="99" name="armure" value="${p?.armure ?? 0}"></label>
        <label>Coût de SAN (1/1D6) <input type="text" name="coutSan" value="${esc(p?.coutSan)}" placeholder="aucun"></label>
        <label>MVT (sinon calculé) <input type="number" min="0" max="99" name="mvt" value="${p?.mvt ?? ''}"></label>
        <label>Image (maps/tokens/…) <input type="text" name="image" value="${esc(p?.image)}"></label>
      </div>
      <div class="champs">
        <label><input type="checkbox" name="reductionFeu"${p?.reductionFeu ? ' checked' : ''}> moitié des dégâts des armes à feu</label>
        <label><input type="checkbox" name="armeFeuPrete"${p?.armeFeuPrete ? ' checked' : ''}> arme à feu déjà en main</label>
        <label><input type="checkbox" name="cachee"${p?.cachee ? ' checked' : ''}> cachée au départ</label>
      </div>
      <label class="large">Notes <textarea name="notes" rows="2">${esc(p?.notes)}</textarea></label>
      <p><button type="submit" class="principal">${p ? 'Enregistrer' : 'Créer le profil'}</button> <button type="button" data-action="fermer-formulaire">Annuler</button></p>
    </form>`;
  }

  function formulaireArme() {
    const reserve = seance.etat.reserve;
    const a = ui.edition.id ? reserve.armes[ui.edition.id] : null;
    return `<form id="form-arme" class="formulaire" aria-label="${a ? `Modifier ${esc(a.nom)}` : 'Nouvelle arme'}">
      <h3>${a ? `Modifier ${esc(a.nom)}` : 'Nouvelle arme'}</h3>
      <div class="champs">
        <label>Nom <input type="text" name="nom" required value="${esc(a?.nom)}"></label>
        <label>Compétence <input type="text" name="competence" required value="${esc(a?.competence ?? 'Corps à corps')}"></label>
        <label>Dégâts (1D6+2) <input type="text" name="des" required value="${esc(a?.des)}"></label>
        <label>Type <select name="type"><option value="melee"${(a?.type ?? 'melee') === 'melee' ? ' selected' : ''}>mêlée</option><option value="feu"${a?.type === 'feu' ? ' selected' : ''}>arme à feu</option></select></label>
        <label>Portée de base (m, arme à feu) <input type="number" min="0" step="0.5" name="portee" value="${a?.portee ?? ''}"></label>
        <label>Capacité (coups, arme à feu) <input type="number" min="0" name="capacite" value="${a?.capacite ?? ''}"></label>
      </div>
      <div class="champs">
        <label><input type="checkbox" name="empalante"${a?.empalante ? ' checked' : ''}> empalante</label>
        <label><input type="checkbox" name="aImpact"${a?.aImpact ? ' checked' : ''}> ajoute l’Impact</label>
      </div>
      <p><button type="submit" class="principal">${a ? 'Enregistrer' : 'Créer l’arme'}</button> <button type="button" data-action="fermer-formulaire">Annuler</button></p>
    </form>`;
  }

  function rendrePreparer() {
    const { reserve, rencontre: r } = seance.etat;
    const groupe = kind => {
      const lignes = reserve.profils.filter(p => p.kind === kind).map(ligneProfil).join('');
      return lignes ? `<tbody><tr class="groupe"><th colspan="4">${LIBELLE_KIND[kind]}</th></tr>${lignes}</tbody>` : '';
    };
    const armes = Object.values(reserve.armes).map(a => `<tr><td><strong>${esc(a.nom)}</strong></td>
      <td><small>${esc(a.competence)} · ${esc(a.des)}${a.aImpact ? ' + Impact' : ''}${a.empalante ? ' · empalante' : ''}${a.type === 'feu' ? ` · portée ${a.portee} m · ${a.capacite} coups` : ''}</small></td>
      <td class="actions"><button type="button" data-action="modifier-arme" data-id="${esc(a.id)}">Modifier</button>
        <button type="button" data-action="supprimer-arme" data-id="${esc(a.id)}">Supprimer</button></td></tr>`).join('');
    const enCours = r !== null;
    $('#panneau-preparer').innerHTML = `
      <section class="carte" aria-labelledby="t-reserve">
        <h2 id="t-reserve">Réserve de profils</h2>
        ${enCours ? '<p class="avis">Une rencontre est en cours : terminez-la ou abandonnez-la dans l’onglet Jouer avant d’en composer une autre.</p>' : ''}
        <table><thead><tr><th>Rencontre</th><th>Profil</th><th>Valeurs</th><th><span class="sr-only">Actions</span></th></tr></thead>
          ${groupe('PJ')}${groupe('PNJ')}${groupe('CREATURE')}</table>
        ${reserve.profils.length ? '' : '<p>La réserve est vide : créez un profil.</p>'}
        <p class="barre">
          <button type="button" id="composer" class="principal" data-action="composer"${enCours ? ' disabled' : ''}>Composer la rencontre</button>
          <button type="button" data-action="nouveau-profil">Nouveau profil</button>
          <button type="button" data-action="nouvelle-journee"${enCours ? ' disabled' : ''} title="Le cumul des pertes de SAN du jour repart de la SAN actuelle de chaque investigateur">Nouvelle journée</button>
        </p>
        ${ui.edition?.cible === 'profil' ? formulaireProfil(reserve) : ''}
      </section>
      <section class="carte" aria-labelledby="t-armes">
        <h2 id="t-armes">Armes</h2>
        <table><tbody>${armes}</tbody></table>
        <p class="barre"><button type="button" data-action="nouvelle-arme">Nouvelle arme</button></p>
        ${ui.edition?.cible === 'arme' ? formulaireArme() : ''}
      </section>`;
    majDerives();
  }

  function lireFormulaireProfil(form) {
    const f = new FormData(form);
    const texte = k => String(f.get(k) ?? '').trim();
    const kind = texte('kind');
    return {
      nom: texte('nom'), kind, camp: texte('camp'),
      carac: Object.fromEntries(CARACS.map(c => [c, f.get(`carac-${c}`)])),
      chance: kind === 'PJ' ? f.get('chance') : null,
      competences: lireCompetences(f.get('competences')),
      armeMelee: texte('armeMelee') || null, armeTir: texte('armeTir') || null,
      attaquesParRound: f.get('attaquesParRound'), armure: f.get('armure'),
      coutSan: texte('coutSan') || null, mvt: f.get('mvt'), image: texte('image') || null,
      reductionFeu: f.get('reductionFeu') ? 'moitie' : null, armeFeuPrete: f.get('armeFeuPrete') === 'on', cachee: f.get('cachee') === 'on',
      notes: texte('notes')
    };
  }

  function majDerives() {
    const form = $('#form-profil');
    const cible = $('#derives');
    if (!form || !cible) return;
    try {
      const donnees = lireFormulaireProfil(form);
      const p = normaliserProfil(donnees);
      if (!['FOR', 'CON', 'TAI', 'DEX', 'POU'].every(c => Number.isFinite(p.carac[c]))) { cible.textContent = 'Renseignez FOR, CON, TAI, DEX et POU pour voir les valeurs dérivées.'; return; }
      const d = valeursDerivees(p);
      cible.textContent = `Dérivées : PV max ${d.pvMax} · Impact ${d.impact} · Carrure ${d.carrure} · MVT ${d.mvt} · PM ${d.pm}${p.kind === 'PJ' ? ` · SAN de départ ${d.sanDepart}` : ''}`;
    } catch { cible.textContent = ''; }
  }

  function enregistrerProfil(form) {
    let donnees;
    try { donnees = lireFormulaireProfil(form); } catch (erreur) { return message(erreur.message, 'erreur'); }
    const id = ui.edition.id;
    const r = agir(id ? 'profil-modifie' : 'profil-cree', etat => ({ ...etat,
      reserve: id ? remplacerProfil(etat.reserve, id, donnees) : ajouterProfil(etat.reserve, donnees) }), { avecDes: false });
    if (r.change) { ui.edition = null; rendre(); message(id ? 'Profil enregistré.' : 'Profil créé.'); }
  }

  function enregistrerArme(form) {
    const f = new FormData(form);
    const texte = k => String(f.get(k) ?? '').trim();
    const donnees = { nom: texte('nom'), competence: texte('competence'), des: texte('des'), type: texte('type'),
      portee: f.get('portee'), capacite: f.get('capacite'), empalante: f.get('empalante') === 'on', aImpact: f.get('aImpact') === 'on' };
    const id = ui.edition.id;
    const r = agir(id ? 'arme-modifiee' : 'arme-creee', etat => ({ ...etat,
      reserve: id ? modifierArme(etat.reserve, id, donnees) : ajouterArme(etat.reserve, { ...donnees, id: idDepuisNom(donnees.nom, Object.keys(etat.reserve.armes)) }) }), { avecDes: false });
    if (r.change) { ui.edition = null; rendre(); message(id ? 'Arme enregistrée.' : 'Arme créée.'); }
  }

  function composer() {
    const entrees = [];
    for (const p of seance.etat.reserve.profils) {
      const c = ui.compo[p.id] ?? { n: 0, cachee: p.cachee };
      if (p.kind === 'PJ') { if (c.n) entrees.push(p.id); continue; }
      for (let i = 0; i < c.n; i++) entrees.push({ id: p.id, cachee: c.cachee });
    }
    const r = agir('composition', etat => ({ ...etat, rencontre: R.composerRencontre(etat.reserve, entrees) }), { avecDes: false });
    if (r.change) { ui.onglet = 'jouer'; rendre(); }
  }

  // --- Rendu : jouer --------------------------------------------------------------------------------------------------

  const options = (liste, choisi) => liste.map(p => `<option value="${esc(p.id)}"${p.id === choisi ? ' selected' : ''}>${esc(p.nom)}</option>`).join('');

  function rendreTest(t, titre) {
    if (!t) return '';
    return `<div class="test"><span>${esc(titre)}</span> <strong>${String(t.jet).padStart(2, '0')}</strong> / ${t.valeur}
      ${t.difficulte !== 'ordinaire' ? `(${LIBELLE_DIFFICULTE[t.difficulte]}, seuil ${seuils(t.valeur)[t.difficulte]})` : ''}
      → <span class="niveau n${t.niveau}">${LIBELLE_NIVEAU[t.niveau]}</span>${t.chanceDepensee ? ` <small>(Chance −${t.chanceDepensee})</small>` : ''}</div>`;
  }

  function boutonsChance(r, role) {
    const e = r.enAttente;
    const qui = R.participant(r, role === 'attaque' ? e.attaquantId : e.cibleId);
    if (!e[role] || qui.kind !== 'PJ') return '';
    const boutons = ['ordinaire', 'majeure', 'extreme'].map(niveau => {
      const cout = R.coutChance(r, role, niveau);
      return cout ? `<button type="button" data-chance="${role}" data-niveau="${niveau}">Chance −${cout} → ${LIBELLE_DIFFICULTE[niveau]}</button>` : '';
    }).join('');
    return boutons ? `<div class="chance">${esc(qui.nom)} (Chance ${qui.chance}) : ${boutons}</div>` : '';
  }

  // --- Mises à jour en place des zones de saisie (sans re-rendre le panneau, pour garder le focus) -------------------

  /** Champ d100 CON de la fenêtre « Résoudre » : affiché dès que les dégâts (saisis ou fixes) déclenchent une blessure grave. */
  function resConHtml(plan, valeurs = {}) {
    if (!plan || plan.touche !== true) return '';
    const ev = evaluerJetConBlessure(plan, valeurs);
    return ev.jetCON
      ? `<label>d100 CON (blessure grave) <input type="number" min="1" max="100" id="res-con-d100" data-champ-des="d100" class="d100-inline" aria-label="d100 CON, blessure grave"></label>`
      : '';
  }

  function majResCon() {
    const zone = $('#res-con-zone');
    if (!zone || !planRes || planRes.touche !== true) return;
    const valeurs = {};
    for (const c of planRes.champsDegats) {
      const brut = $(`#res-degats-${c.cle}`)?.value;
      if (brut !== undefined && String(brut).trim() !== '') valeurs[c.cle] = Number(brut);
    }
    const avant = $('#res-con-d100')?.value;
    const html = resConHtml(planRes, valeurs);
    if (zone.innerHTML !== html) zone.innerHTML = html;
    if (avant !== undefined && $('#res-con-d100')) $('#res-con-d100').value = avant;
  }

  /** Sous-zone du jet de SAN libre : la perte (si la branche prédite contient des dés), puis le d100 INT (perte ≥ 5). */
  function majSanSuite() {
    const zone = $('#san-suite-zone');
    if (!zone) return;
    const r = rencontre();
    const pj = R.participant(r, $('#san-qui')?.value);
    const cout = ($('#san-cout')?.value ?? '').trim();
    const perteAvant = $('#san-perte')?.value;
    const intAvant = $('#san-int-d100')?.value;
    let html = '';
    if (pj && cout) {
      const jet = validerEntier($('#san-d100')?.value, { min: 1, max: 100, libelle: 'd100 SAN' });
      if (jet.ok) {
        try {
          let plan = planJetSan(pj, cout, { jetSan: jet.valeur });
          if (plan.champPerte) {
            html += `<label>Perte (${esc(plan.champPerte.expression)}) <input type="number" min="0" id="san-perte" data-champ-des="lancer" class="d100-inline" aria-label="Perte de SAN saisie"></label>`;
            const pv = validerEntier(perteAvant ?? '', { min: 0, max: Infinity, libelle: 'Perte de SAN' });
            if (pv.ok) plan = planJetSan(pj, cout, { jetSan: jet.valeur, perte: pv.valeur });
          }
          if (plan.jetIntRequis) html += `<label>d100 INT <input type="number" min="1" max="100" id="san-int-d100" data-champ-des="d100" class="d100-inline" aria-label="d100 INT contre la folie"></label>`;
        } catch { html = ''; }
      }
    }
    zone.innerHTML = html;
    if (perteAvant !== undefined && $('#san-perte')) $('#san-perte').value = perteAvant;
    if (intAvant !== undefined && $('#san-int-d100')) $('#san-int-d100').value = intAvant;
  }

  /** Lignes de « Elle surgit » : un d100 SAN par investigateur conscient qui n'a pas encore vu la créature choisie. */
  function lignesReveler(r) {
    const qui = $('#reveler-qui')?.value || r.participants.find(p => p.cachee)?.id;
    const monstre = R.participant(r, qui);
    if (!monstre) return '';
    if (!monstre.coutSan) return '<p><small>Coût de SAN inconnu pour cette créature : aucun jet saisi.</small></p>';
    const lignes = r.participants.filter(p => p.kind === 'PJ' && p.etat === 'actif' && !p.aVu[monstre.id]).map(p =>
      `<p class="ligne-saisie"><label>${esc(p.nom)} — d100 SAN <input type="number" min="1" max="100" id="reveler-san-${esc(p.id)}" data-champ-des="d100" data-reveler-san="${esc(p.id)}" class="d100-inline"></label> <span id="reveler-suite-${esc(p.id)}"></span></p>`).join('');
    return lignes || '<p><small>Chaque investigateur conscient l’a déjà vue : aucun jet.</small></p>';
  }

  function majRevelerZone() {
    const zone = $('#reveler-des-zone');
    if (zone) zone.innerHTML = lignesReveler(rencontre());
  }

  /** Sous-zone d'une ligne « Elle surgit » : la perte puis le d100 INT, selon le d100 SAN saisi sur la ligne. */
  function majRevelerSuite(pid) {
    const span = document.querySelector(`#reveler-suite-${CSS.escape(pid)}`);
    if (!span) return;
    const r = rencontre();
    const monstre = R.participant(r, $('#reveler-qui')?.value || r.participants.find(p => p.cachee)?.id);
    const pj = R.participant(r, pid);
    const perteAvant = span.querySelector('[data-reveler-perte]')?.value;
    const intAvant = span.querySelector('[data-reveler-int]')?.value;
    let html = '';
    if (monstre?.coutSan && pj) {
      const jet = validerEntier(document.querySelector(`[data-reveler-san="${CSS.escape(pid)}"]`)?.value, { min: 1, max: 100, libelle: `d100 SAN (${pj.nom})` });
      if (jet.ok) {
        try {
          let plan = planJetSan(pj, monstre.coutSan, { jetSan: jet.valeur });
          if (plan.champPerte) {
            html += `<label>Perte (${esc(plan.champPerte.expression)}) <input type="number" min="0" id="reveler-perte-${esc(pid)}" data-champ-des="lancer" data-reveler-perte="${esc(pid)}" class="d100-inline" aria-label="Perte de SAN saisie pour ${esc(pj.nom)}"></label>`;
            const pv = validerEntier(perteAvant ?? '', { min: 0, max: Infinity, libelle: 'Perte de SAN' });
            if (pv.ok) plan = planJetSan(pj, monstre.coutSan, { jetSan: jet.valeur, perte: pv.valeur });
          }
          if (plan.jetIntRequis) html += `<label>d100 INT <input type="number" min="1" max="100" id="reveler-int-${esc(pid)}" data-champ-des="d100" data-reveler-int="${esc(pid)}" class="d100-inline" aria-label="d100 INT pour ${esc(pj.nom)}"></label>`;
        } catch { html = ''; }
      }
    }
    span.innerHTML = html;
    const perteEl = span.querySelector('[data-reveler-perte]');
    if (perteAvant !== undefined && perteEl) perteEl.value = perteAvant;
    const intEl = span.querySelector('[data-reveler-int]');
    if (intAvant !== undefined && intEl) intEl.value = intAvant;
  }

  /** Libellé de la case d100 de défense selon le mode choisi (conteneur vidé si « aucune »). */
  function defenseZoneHtml() {
    const mode = $('#melee-mode')?.value ?? 'esquiver';
    if (mode === 'aucune') return '';
    const libelle = mode === 'esquiver' ? 'd100 Esquive' : 'd100 Rendre les coups';
    return `<label>${libelle} <input type="number" min="1" max="100" id="melee-defense-d100" data-champ-des="d100" class="d100-inline"></label>`;
  }

  function majMeleeDefense() {
    const zone = $('#melee-defense-zone');
    if (!zone) return;
    const avant = $('#melee-defense-d100')?.value;
    zone.innerHTML = defenseZoneHtml();
    if (avant !== undefined && avant !== '' && $('#melee-defense-d100')) $('#melee-defense-d100').value = avant;
  }

  function rendreParticipants(r) {
    const acteur = R.acteurCourant(r);
    const ordre = new Map(r.ordre.map((o, i) => [o.id, { ...o, rang: i + 1 }]));
    const lignes = [...r.participants].sort((a, b) => (ordre.get(a.id)?.rang ?? 99) - (ordre.get(b.id)?.rang ?? 99)).map(p => {
      const o = ordre.get(p.id);
      const arme = r.armes[p.armeTir];
      const boutonsEtat = (p.etat === 'mourant' ? ` <button type="button" data-action="jet-mourant" data-id="${esc(p.id)}" title="Jet de CON en fin de round tant qu’il est mourant (échec : mort, réussite : survit) — Gardien p. 107-108">Jet CON mourant</button>` : '')
        + (p.etat === 'mourant' || (p.etat !== 'mort' && p.pv < p.pvMax) ? ` <button type="button" data-action="premiers-soins" data-id="${esc(p.id)}" title="Premiers soins réussis : stabilise un mourant (1 PV, inconscient), sinon +1 PV">Premiers soins</button>` : '');
      const boutonRecharger = arme && p.etat !== 'mort' && p.munitions < arme.capacite
        ? ` <button type="button" data-action="recharger" data-id="${esc(p.id)}" title="Recharger : 1 round pour deux balles — Gardien p. 100">Recharger</button>` : '';
      const champMourant = saisis() && p.etat === 'mourant'
        ? ` <input type="number" min="1" max="100" id="mourant-d100-${esc(p.id)}" data-mourant-d100="${esc(p.id)}" data-champ-des="d100" placeholder="d100" class="d100-inline" aria-label="d100 CON mourant pour ${esc(p.nom)}">` : '';
      return `<tr class="camp-${participantCamp({ camp: p.camp, kind: p.kind })} ${acteur?.id === p.id ? 'courant' : ''} etat-${p.etat}${p.cachee ? ' cachee' : ''}"${acteur?.id === p.id ? ' aria-current="true"' : ''}>
        <td>${o ? o.rang : '—'}</td>
        <td><strong>${esc(p.nom)}</strong>${p.cachee ? ' <em>(cachée)</em>' : ''}<br><small>DEX ${p.carac.DEX}${o ? ` → ${o.dex}` : ''} · Impact ${esc(p.impact)}</small></td>
        <td>${p.pv}/${p.pvMax}${p.blessureGrave ? ' <span class="badge grave">grave</span>' : ''}</td>
        <td>${p.kind === 'PJ' ? `${p.san}${p.folie ? ` <span class="badge folie">${esc(p.folie)}</span>` : ''}` : '—'}</td>
        <td>${p.kind === 'PJ' ? p.chance : '—'}</td>
        <td>${ETAT[p.etat]}${boutonsEtat}${champMourant}</td>
        <td>${arme && p.etat === 'mort' ? `${p.munitions}/${arme.capacite}` : arme ? `${p.munitions}/${arme.capacite} <button type="button" data-arme="${esc(p.id)}">${p.armeFeuPrete ? 'Rengainer' : 'Dégainer'}</button>${boutonRecharger}` : '—'}</td>
      </tr>`;
    }).join('');
    return `<table id="participants"><thead><tr><th>#</th><th>Personnage</th><th>PV</th><th>SAN</th><th>Chance</th><th>État</th><th>Arme à feu</th></tr></thead><tbody>${lignes}</tbody></table>
      <p><small>+50 DEX pour une arme à feu prête.</small></p>`;
  }

  function rendreDecisionEgalite(r, decision) {
    const nom = id => R.participant(r, id).nom;
    const libelles = { nul: 'Match nul', relance: 'Relancer' };
    return `<div class="egalite" role="alert"><h3>Égalité parfaite</h3>
      <p>${esc(nom(decision.a.id))} et ${esc(nom(decision.b.id))} font exactement le même résultat (même niveau, même valeur) : le livre laisse au Gardien le choix. La rencontre attend votre décision.</p>
      ${rendreTest(decision.a, `${nom(decision.a.id)} — ${decision.a.competence}`)}${rendreTest(decision.b, `${nom(decision.b.id)} — ${decision.b.competence}`)}
      <p>${decision.issues.map((issue, i) => `<button type="button" data-egalite="${esc(issue.id)}"${i === 0 ? ' class="principal"' : ''} title="${esc(issue.libelle)}">${esc(libelles[issue.id] ?? issue.libelle)}</button>`).join(' ')}</p>
      ${saisis() ? `<p class="saisie-des"><label>d100 ${esc(nom(decision.a.id))} <input type="number" min="1" max="100" id="egalite-a-d100" data-champ-des="d100" class="d100-inline"></label>
        <label>d100 ${esc(nom(decision.b.id))} <input type="number" min="1" max="100" id="egalite-b-d100" data-champ-des="d100" class="d100-inline"></label></p>` : ''}
      <p><small>Relancer : les deux camps relancent les dés (saisissez-les ici si vous jouez avec vos dés). Match nul n’en demande aucun.</small></p></div>`;
  }

  function rendreAction(r) {
    const acteur = R.acteurCourant(r);
    const decision = R.decisionEgalite(r);
    planRes = null;
    if (decision) return rendreDecisionEgalite(r, decision);
    const personneNePeutAgir = !r.participants.some(R.peutAgir);
    if (!r.round) {
      return personneNePeutAgir ? '<p>Plus aucun participant ne peut agir : terminez la rencontre.</p>'
        : '<p>Les participants sont en place. Les créatures cachées entrent dans l’ordre quand elles surgissent.</p><button type="button" id="commencer" class="principal">Commencer le round 1</button>';
    }
    const e = r.enAttente;
    if (e) {
      const a = R.participant(r, e.attaquantId), c = R.participant(r, e.cibleId);
      planRes = saisis() ? planResolution(r) : null;
      let blocDegats = '';
      if (planRes) {
        blocDegats = planRes.touche
          ? `<div class="saisie-des">${planRes.champsDegats.map(ch => `<label>${esc(ch.libelle)} <input type="number" min="0" id="res-degats-${ch.cle}" data-champ-des="lancer" class="d100-inline" inputmode="numeric"></label>`).join('')}<span id="res-con-zone">${resConHtml(planRes)}</span></div>`
          : '<p class="saisie-des"><small>Le coup ne touche pas : aucun dé de dégâts à saisir.</small></p>';
      }
      return `<h3>${e.type === 'tir' ? 'Tir' : 'Mêlée'} : ${esc(a.nom)} → ${esc(c.nom)}</h3>
        ${rendreTest(e.attaque, e.attaque.competence)}
        ${rendreTest(e.defense, e.mode === 'rendre' ? 'Rendre les coups' : 'Esquive')}
        ${boutonsChance(r, 'attaque')}${boutonsChance(r, 'defense')}
        ${blocDegats}
        <p><button type="button" id="resoudre" class="principal">Résoudre (dégâts)</button> <button type="button" id="abandonner">Abandonner</button></p>`;
    }
    if (!acteur || personneNePeutAgir) return '<h3>Plus personne ne peut agir</h3><p>Tous les participants sont inconscients, mourants ou morts. Terminez la rencontre ou annulez le dernier geste.</p>';
    const adversaires = r.participants.filter(p => R.enJeu(p) && p.id !== acteur.id);
    adversaires.sort((x, y) => Number((x.camp === 'pj') === (acteur.camp === 'pj')) - Number((y.camp === 'pj') === (acteur.camp === 'pj')));
    const cibles = adversaires.map(p => `<option value="${esc(p.id)}">${esc(p.nom)}${(p.camp === 'pj') === (acteur.camp === 'pj') ? ' (même camp)' : ''}</option>`).join('');
    if (!adversaires.length) return `<h3>Plus aucune cible</h3><p>Personne d’autre n’est en jeu.</p><p><button type="button" id="fin-tour">Fin du tour</button></p>`;
    const melee = r.armes[acteur.armeMelee], tir = r.armes[acteur.armeTir];
    return `<h3>Au tour de ${esc(acteur.nom)}</h3>
      ${melee ? `<fieldset><legend>Mêlée (${esc(melee.nom)}, ${esc(melee.competence)} ${acteur.competences[melee.competence] ?? '?'} %)</legend>
        <label>Cible <select id="melee-cible">${cibles}</select></label>
        <label>Défense <select id="melee-mode"><option value="esquiver">Esquiver</option><option value="rendre">Rendre les coups</option><option value="aucune">Aucune (surprise)</option></select></label>
        <label>Dés bonus <input id="melee-bonus" type="number" min="0" max="2" value="0"></label>
        <label>Dés malus <input id="melee-malus" type="number" min="0" max="2" value="0"></label>
        ${saisis() ? `<label>d100 attaque <input type="number" min="1" max="100" id="melee-attaque-d100" data-champ-des="d100" class="d100-inline"></label> <span id="melee-defense-zone">${defenseZoneHtml()}</span>` : ''}
        <button type="button" id="attaquer">Attaquer</button></fieldset>` : '<p><small>Pas d’arme de mêlée.</small></p>'}
      ${tir ? `<fieldset><legend>Tir (${esc(tir.nom)}, ${acteur.competences[tir.competence] ?? '?'} %, portée ${tir.portee} m, ${acteur.munitions} coups)</legend>
        <label>Cible <select id="tir-cible">${cibles}</select></label>
        <label>Distance (m) <input id="tir-distance" type="number" min="0" step="0.5" value="8"></label>
        <label><input id="tir-couvert" type="checkbox"> cible à couvert</label>
        <label><input id="tir-melee" type="checkbox"> tir dans la mêlée</label>
        ${saisis() ? '<label>d100 tir <input type="number" min="1" max="100" id="tir-d100" data-champ-des="d100" class="d100-inline"></label>' : ''}
        <button type="button" id="tirer">Tirer</button></fieldset>` : ''}
      <p><button type="button" id="fin-tour" class="principal">Fin du tour</button></p>`;
  }

  function rendreOutils(r) {
    const cachees = r.participants.filter(p => p.cachee);
    const jets = r.participants.filter(p => p.kind === 'PJ' && p.etat === 'actif');
    const tous = r.participants;
    const qui = ($('#libre-qui')?.value) || tous[0]?.id;
    const nomsDe = id => { const p = R.participant(r, id); return p ? [...Object.keys(p.competences), ...Object.keys(p.carac)] : []; };
    const optionsComp = id => nomsDe(id).map(n => `<option>${esc(n)}</option>`).join('');
    const etats = R.etatsDernierTest(r);
    const d = r.dernierTest;
    return `<h2>Horreur</h2>
      <p><label>Créature <select id="reveler-qui">${cachees.length ? options(cachees) : '<option value="">aucune créature cachée</option>'}</select></label>
        <button type="button" id="reveler"${cachees.length ? '' : ' disabled'}>Elle surgit (jets de SAN)</button></p>
      ${saisis() ? `<div id="reveler-des-zone" class="saisie-des">${lignesReveler(r)}</div>` : ''}
      <p><label>Investigateur <select id="san-qui">${jets.length ? options(jets) : '<option value="">aucun investigateur conscient</option>'}</select></label>
        <label>Perte (1/1D6) <input type="text" id="san-cout" size="7" value="1/1D6"></label>
        ${saisis() ? '<label>d100 SAN <input type="number" min="1" max="100" id="san-d100" data-champ-des="d100" class="d100-inline"></label>' : ''}
        <button type="button" id="jet-san"${jets.length ? '' : ' disabled'}>Jet de SAN</button></p>
      ${saisis() ? '<div id="san-suite-zone" class="saisie-des"></div>' : ''}
      <h2>Test hors combat</h2>
      <p><label>Qui <select id="libre-qui">${options(tous, qui)}</select></label>
        <label>Compétence <select id="libre-competence">${optionsComp(qui)}</select></label>
        <label>Difficulté <select id="libre-difficulte"><option value="ordinaire">ordinaire</option><option value="majeure">majeure</option><option value="extreme">extrême</option></select></label>
        ${saisis() ? '<label>d100 <input type="number" min="1" max="100" id="libre-d100" data-champ-des="d100" class="d100-inline"></label>' : ''}
        <button type="button" id="libre-lancer">Lancer</button></p>
      <div id="libre-resultat">${d ? rendreTest(d, `${esc(R.participant(r, d.id).nom)} — ${esc(d.competence)}${d.redouble ? ' (redoublé)' : ''}`) : ''}</div>
      <p><button type="button" id="redoubler"${etats?.redoubler.autorise ? '' : ' disabled'} title="${esc(etats?.redoubler.raison ?? '')}">Redoubler le test</button>
        ${saisis() && etats?.redoubler.autorise ? '<label>d100 <input type="number" min="1" max="100" id="redoubler-d100" data-champ-des="d100" class="d100-inline" aria-label="d100 du test redoublé"></label>' : ''}
        <button type="button" id="chance-libre"${etats?.chance.autorise ? '' : ' disabled'} title="${esc(etats?.chance.raison ?? '')}">${etats?.chance.autorise ? `Dépenser ${etats.chance.cout} Chance` : 'Dépenser la Chance'}</button></p>
      <h2>Test opposé</h2>
      <p><label>Camp A <select id="oppose-a">${options(tous, tous[0]?.id)}</select></label>
        <label>Compétence A <select id="oppose-a-comp">${optionsComp(tous[0]?.id)}</select></label>
        <label>Dés A (+bonus, −malus) <input type="number" id="oppose-a-des" min="-2" max="2" value="0"></label>
        ${saisis() ? '<label>d100 A <input type="number" min="1" max="100" id="oppose-a-d100" data-champ-des="d100" class="d100-inline"></label>' : ''}</p>
      <p><label>Camp B <select id="oppose-b">${options(tous, (tous[1] ?? tous[0])?.id)}</select></label>
        <label>Compétence B <select id="oppose-b-comp">${optionsComp((tous[1] ?? tous[0])?.id)}</select></label>
        <label>Dés B (+bonus, −malus) <input type="number" id="oppose-b-des" min="-2" max="2" value="0"></label>
        ${saisis() ? '<label>d100 B <input type="number" min="1" max="100" id="oppose-b-d100" data-champ-des="d100" class="d100-inline"></label>' : ''}</p>
      <p><button type="button" id="oppose-lancer">Lancer le test opposé</button></p>`;
  }

  /** Les champs identifiés d'une zone gardent leur valeur d'un rendu à l'autre (cible, distance, dés saisis…). */
  function garderChamps(zone) {
    const valeurs = new Map();
    for (const el of zone.querySelectorAll('[id]')) {
      if (el.matches('input[type=checkbox]')) valeurs.set(el.id, el.checked);
      else if (el.matches('input, select, textarea')) valeurs.set(el.id, el.value);
    }
    return valeurs;
  }
  function rendreChamps(zone, valeurs) {
    for (const [id, valeur] of valeurs) {
      const el = zone.querySelector(`#${CSS.escape(id)}`);
      if (!el) continue;
      if (el.matches('input[type=checkbox]')) el.checked = valeur;
      else if (el.matches('select')) { if ([...el.options].some(o => o.value === valeur || o.text === valeur)) el.value = valeur; }
      else el.value = valeur;
    }
  }

  function rendreJouer() {
    const panneau = $('#panneau-jouer');
    const r = rencontre();
    if (!r) {
      panneau.innerHTML = `<section class="carte"><h2>Aucune rencontre en cours</h2>
        <p>Composez une rencontre depuis la réserve, dans l’onglet Préparer.</p>
        <p><button type="button" class="principal" data-onglet="preparer">Aller à Préparer</button></p></section>`;
      return;
    }
    const gardees = garderChamps(panneau);
    // Les champs de dés consommés par l’action qui vient de réussir ne sont pas recopiés : un jet joué ne reste pas prérempli.
    for (const id of champsAVider) gardees.delete(id);
    champsAVider.clear();
    const attente = R.decisionEgalite(r) !== null;
    panneau.innerHTML = `
      <section class="carte" aria-labelledby="t-ordre"><h2 id="t-ordre">Ordre du round (DEX)</h2><div id="zone-ordre">${rendreParticipants(r)}</div></section>
      <section class="carte" aria-labelledby="t-action"><h2 id="t-action">Action</h2>
        <p class="mode-des"><label><input type="checkbox" id="jets-saisis"${seance.preference('jets-saisis') === '1' ? ' checked' : ''}> Jets saisis par le MJ (sinon tirés au hasard)</label></p>
        <div id="action">${rendreAction(r)}</div>
        <p class="barre fin"><button type="button" data-action="terminer-rencontre" title="Reporte PV, SAN, Chance et folies sur les investigateurs de la réserve">Terminer la rencontre</button>
        <button type="button" data-action="abandonner-rencontre" title="Sans rien reporter sur les investigateurs">Abandonner la rencontre</button></p>
        <hr><div class="outils">${rendreOutils(r)}</div></section>
      <section class="carte" aria-labelledby="t-journal"><h2 id="t-journal">Journal</h2>
        <ol id="journal">${r.journal.map(l => `<li class="j-${esc(l.type)}">${l.round ? `<span class="r">R${l.round}</span> ` : ''}${esc(l.texte)}</li>`).join('')}</ol></section>`;
    // Les sélecteurs de personnage d’abord : `majCompetences` peuple leurs listes de compétences, puis les autres
    // champs (dont #libre-competence, #oppose-a-comp, #oppose-b-comp) sont restaurés dans ces nouvelles options.
    const selecteursQui = ['libre-qui', 'oppose-a', 'oppose-b'];
    const quiGardes = new Map(selecteursQui.map(id => [id, gardees.get(id)]).filter(([, v]) => v !== undefined));
    for (const id of selecteursQui) gardees.delete(id);
    rendreChamps(panneau, quiGardes);
    majCompetences('#libre-qui', '#libre-competence');
    majCompetences('#oppose-a', '#oppose-a-comp');
    majCompetences('#oppose-b', '#oppose-b-comp');
    rendreChamps(panneau, gardees);
    // Zones de saisie dynamiques remises en place après le rendu (valeurs conservées) : CON de la résolution, suite du jet de SAN, « Elle surgit ».
    majResCon();
    majSanSuite();
    for (const p of r.participants) if (p.kind === 'PJ') majRevelerSuite(p.id);
    const journal = $('#journal');
    journal.scrollTop = journal.scrollHeight;
    if (attente) for (const b of panneau.querySelectorAll('button')) if (!b.closest('.egalite')) b.disabled = true;
  }

  /** Les compétences proposées suivent le participant choisi. */
  function majCompetences(selQui, selComp) {
    const r = rencontre();
    const qui = $(selQui), comp = $(selComp);
    if (!r || !qui || !comp) return;
    const p = R.participant(r, qui.value);
    const avant = comp.value;
    const noms = p ? [...Object.keys(p.competences), ...Object.keys(p.carac)] : [];
    comp.innerHTML = noms.map(n => `<option${n === avant ? ' selected' : ''}>${esc(n)}</option>`).join('');
  }

  const rendreFichiers = () => { $('#versions').hidden = !ui.versions; };

  async function rendreVersions() {
    const liste = await seance.versions();
    const libelles = { 'avant-import': 'avant un import', 'avant-effacement': 'avant un effacement', 'avant-restauration': 'avant une restauration', illisible: 'sauvegarde illisible' };
    $('#versions').innerHTML = liste.length
      ? `<ul>${liste.map(v => `<li>${new Date(v.createdAt).toLocaleString('fr-FR')} — ${esc(libelles[v.reason] ?? v.reason)}
          <button type="button" data-action="restaurer" data-id="${esc(v.id)}">Restaurer</button></li>`).join('')}</ul>`
      : '<p>Aucune version précédente.</p>';
  }

  // --- Liaison avec RPG Map Display (lot C4) ----------------------------------------------------------------------------
  // Même canal et même protocole que Warhammer (js/core/map-link-protocol.js) ; la projection des pions est celle de Cthulhu
  // (projection-carte.js). L'indicateur « Carte connectée » et le compte « À poser (N) » sont créés ici, à côté de l'état de la sauvegarde.

  function indicateurCarte() {
    // Les styles de l’indicateur et du compte « À poser » sont dans js/ui/chapeau-theme.css (chargé par la page).
    const indicateur = document.createElement('span');
    indicateur.id = 'map-link-indicator';
    indicateur.className = 'map-link-indicator';
    indicateur.setAttribute('role', 'status');
    indicateur.setAttribute('aria-live', 'polite');
    indicateur.title = 'Liaison avec RPG Map Display';
    indicateur.innerHTML = '<span class="status-dot" aria-hidden="true"></span><span class="map-link-label"></span>';
    const aPoser = document.createElement('span');
    aPoser.id = 'map-link-pending';
    aPoser.className = 'map-link-pending';
    aPoser.hidden = true;
    $('#statut-sauvegarde').after(indicateur, aPoser);
    renderMapLinkIndicator(indicateur, 'disconnected');
    return { indicateur, aPoser };
  }

  /** Branche la séance sur la carte ; rien si le navigateur n'a pas de BroadcastChannel. */
  function brancherCarte() {
    if (typeof BroadcastChannel !== 'function') return null;
    const { indicateur, aPoser } = indicateurCarte();
    const lien = creerLiaisonCarte({
      channel: new BroadcastChannel(MAP_LINK_CHANNEL),
      getEtat: () => seance.etat,
      onStatus: statut => { if (renderMapLinkIndicator(indicateur, statut) && statut === 'disconnected') message('Carte déconnectée.'); }
    });
    lien.on('placement', vue => renderMapLinkPending(aPoser, vue));
    setInterval(lien.tick, MAP_LINK_PING_MS);
    return lien;
  }

  function rendre() {
    carte?.refresh();
    const r = rencontre();
    $('#round').textContent = r ? (r.round ? `Round ${r.round}` : 'Avant le combat') : 'Aucune rencontre';
    $('#annuler').disabled = !seance.peutAnnuler();
    $('#retablir').disabled = !seance.peutRetablir();
    for (const onglet of document.querySelectorAll('[role=tab]')) {
      const actif = onglet.dataset.onglet === ui.onglet;
      onglet.setAttribute('aria-selected', String(actif));
      $(`#panneau-${onglet.dataset.onglet}`).hidden = !actif;
    }
    rendrePreparer();
    rendreJouer();
    rendreFichiers();
  }

  // --- Événements -----------------------------------------------------------------------------------------------------

  const nombre = id => Number($(id).value) || 0;

  document.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.onglet) { ui.onglet = b.dataset.onglet; return rendre(); }
    if (b.dataset.egalite) {
      const decision = R.decisionEgalite(rencontre());
      const nomA = decision ? R.participant(rencontre(), decision.a.id).nom : 'A';
      const nomB = decision ? R.participant(rencontre(), decision.b.id).nom : 'B';
      const champs = saisis() && b.dataset.egalite === 'relance'
        ? [
            { sel: '#egalite-a-d100', id: 'egalite-a-d100', type: 'd100', libelle: `d100 relance (${nomA})` },
            { sel: '#egalite-b-d100', id: 'egalite-b-d100', type: 'd100', libelle: `d100 relance (${nomB})` }
          ]
        : [];
      return jouerSaisi('egalite', (s, des) => R.trancherEgalite(s, { issue: b.dataset.egalite }, des), champs);
    }
    if (b.dataset.arme) return jouerSaisi('arme', s => R.basculerArmePrete(s, b.dataset.arme), []);
    if (b.dataset.chance) return jouerSaisi('chance', s => R.depenserChanceEnAttente(s, { role: b.dataset.chance, niveauVise: b.dataset.niveau }), []);
    const id = b.dataset.id;
    switch (b.dataset.action ?? b.id) {
      case 'composer': return composer();
      case 'nouveau-profil': ui.edition = { cible: 'profil', id: null }; return rendre();
      case 'modifier-profil': ui.edition = { cible: 'profil', id }; return rendre();
      case 'nouvelle-arme': ui.edition = { cible: 'arme', id: null }; return rendre();
      case 'modifier-arme': ui.edition = { cible: 'arme', id }; return rendre();
      case 'fermer-formulaire': ui.edition = null; return rendre();
      case 'supprimer-profil': return confirmer(b, 'Confirmer la suppression', () => agir('profil-supprime', etat => ({ ...etat, reserve: supprimerProfil(etat.reserve, id) }), { avecDes: false }));
      case 'supprimer-arme': return agir('arme-supprimee', etat => ({ ...etat, reserve: supprimerArme(etat.reserve, id) }), { avecDes: false });
      case 'nouvelle-journee': return agir('journee', etat => ({ ...etat, reserve: nouvelleJournee(etat.reserve) }), { avecDes: false });
      case 'terminer-rencontre': return agir('fin-rencontre', etat => ({ reserve: R.reporterSurReserve(etat.reserve, etat.rencontre), rencontre: null }), { avecDes: false });
      case 'abandonner-rencontre': return confirmer(b, 'Confirmer : rien n’est reporté', () => { ui.onglet = 'preparer'; agir('abandon-rencontre', etat => ({ ...etat, rencontre: null }), { avecDes: false }); });
      case 'commencer': return jouerSaisi('round', s => R.commencerRound(s), []);
      case 'fin-tour': return jouerSaisi('tour', s => R.passerTour(s), []);
      case 'jet-mourant': return jouerSaisi('mourant', (s, des) => R.jetMourant(s, { id }, des), [
        { sel: `[data-mourant-d100="${id}"]`, id: `mourant-d100-${id}`, type: 'd100', libelle: `d100 CON mourant (${R.participant(rencontre(), id)?.nom ?? id})` }
      ]);
      case 'premiers-soins': return jouerSaisi('soins', s => R.premiersSoins(s, { id }), []);
      case 'recharger': return jouerSaisi('recharger', s => R.recharger(s, { id }), []);
      case 'attaquer': { const acteur = R.acteurCourant(rencontre());
        const mode = $('#melee-mode').value;
        const champs = [{ sel: '#melee-attaque-d100', id: 'melee-attaque-d100', type: 'd100', libelle: 'd100 attaque' }];
        if (mode !== 'aucune') champs.push({ sel: '#melee-defense-d100', id: 'melee-defense-d100', type: 'd100', libelle: mode === 'esquiver' ? 'd100 Esquive' : 'd100 Rendre les coups' });
        return jouerSaisi('melee', (s, des) => R.attaquerMelee(s, { attaquantId: acteur.id, cibleId: $('#melee-cible').value, mode,
          bonus: nombre('#melee-bonus'), malus: nombre('#melee-malus') }, des), champs); }
      case 'tirer': { const acteur = R.acteurCourant(rencontre());
        return jouerSaisi('tir', (s, des) => R.tirer(s, { tireurId: acteur.id, cibleId: $('#tir-cible').value, distance: nombre('#tir-distance'),
          couvert: $('#tir-couvert').checked, dansMelee: $('#tir-melee').checked }, des),
          [{ sel: '#tir-d100', id: 'tir-d100', type: 'd100', libelle: 'd100 tir' }]); }
      case 'resoudre': {
        const plan = planRes ?? planResolution(rencontre());
        const champs = plan.touche ? plan.champsDegats.map(c => ({ sel: `#res-degats-${c.cle}`, id: `res-degats-${c.cle}`, type: 'lancer', libelle: c.libelle })) : [];
        if (saisis() && plan.touche) {
          const lu = lireChamps(champs);
          if (!lu.ok) return bloquerSaisie(lu.el, lu.message);
          const valeurs = {};
          plan.champsDegats.forEach((c, i) => { valeurs[c.cle] = lu.lancers[i]; });
          if (evaluerJetConBlessure(plan, valeurs).jetCON) champs.push({ sel: '#res-con-d100', id: 'res-con-d100', type: 'd100', libelle: 'd100 CON (blessure grave)' });
        }
        return jouerSaisi('resolution', (s, des) => R.resoudreEnAttente(s, des), champs);
      }
      case 'abandonner': return jouerSaisi('abandon', s => R.annulerEnAttente(s), []);
      case 'reveler': {
        const r = rencontre();
        const quiMonstre = $('#reveler-qui').value || r.participants.find(p => p.cachee)?.id;
        const monstre = R.participant(r, quiMonstre);
        const champs = [];
        if (saisis() && monstre?.coutSan) {
          for (const p of r.participants.filter(p => p.kind === 'PJ' && p.etat === 'actif' && !p.aVu[monstre.id])) {
            const res = champsJetSan(p, monstre.coutSan, {
              san: `[data-reveler-san="${p.id}"]`, idSan: `reveler-san-${p.id}`,
              perte: `[data-reveler-perte="${p.id}"]`, idPerte: `reveler-perte-${p.id}`,
              int: `[data-reveler-int="${p.id}"]`, idInt: `reveler-int-${p.id}`
            });
            if (!res.ok) return bloquerSaisie(res.el, res.message);
            champs.push(...res.champs);
          }
        }
        return jouerSaisi('san', (s, des) => R.revelerCreature(s, { id: quiMonstre }, des), champs);
      }
      case 'jet-san': {
        const r = rencontre();
        const pj = R.participant(r, $('#san-qui').value);
        if (!pj) return jouerSaisi('san', (s, des) => R.jetSan(s, { id: $('#san-qui').value, cout: $('#san-cout').value.trim() }, des), []);
        const res = champsJetSan(pj, $('#san-cout').value.trim(), { san: '#san-d100', idSan: 'san-d100', perte: '#san-perte', idPerte: 'san-perte', int: '#san-int-d100', idInt: 'san-int-d100' });
        if (!res.ok) return bloquerSaisie(res.el, res.message);
        return jouerSaisi('san', (s, des) => R.jetSan(s, { id: $('#san-qui').value, cout: $('#san-cout').value.trim() }, des), res.champs);
      }
      case 'libre-lancer': return jouerSaisi('test', (s, des) => R.testLibre(s, { id: $('#libre-qui').value, competence: $('#libre-competence').value, difficulte: $('#libre-difficulte').value }, des),
        [{ sel: '#libre-d100', id: 'libre-d100', type: 'd100', libelle: 'd100 test' }]);
      case 'redoubler': return jouerSaisi('redoublement', (s, des) => R.redoublerDernierTest(s, des),
        [{ sel: '#redoubler-d100', id: 'redoubler-d100', type: 'd100', libelle: 'd100 redoublement' }]);
      case 'chance-libre': return jouerSaisi('chance', s => R.chanceSurDernierTest(s), []);
      case 'oppose-lancer': {
        const des = id => nombre(id);
        const bornes = v => ({ bonus: Math.max(0, v), malus: Math.max(0, -v) });
        const a = bornes(des('#oppose-a-des')), bb = bornes(des('#oppose-b-des'));
        const r = rencontre();
        const nomA = R.participant(r, $('#oppose-a').value)?.nom ?? 'A';
        const nomB = R.participant(r, $('#oppose-b').value)?.nom ?? 'B';
        return jouerSaisi('oppose', (s, d) => R.testOppose(s, { aId: $('#oppose-a').value, aCompetence: $('#oppose-a-comp').value, bId: $('#oppose-b').value,
          bCompetence: $('#oppose-b-comp').value, bonusA: a.bonus, malusA: a.malus, bonusB: bb.bonus, malusB: bb.malus }, d), [
            { sel: '#oppose-a-d100', id: 'oppose-a-d100', type: 'd100', libelle: `d100 A (${nomA})` },
            { sel: '#oppose-b-d100', id: 'oppose-b-d100', type: 'd100', libelle: `d100 B (${nomB})` }
          ]);
      }
      case 'annuler': if (seance.annuler()) rendre(); return;
      case 'retablir': if (seance.retablir()) rendre(); return;
      case 'exporter': return exporter();
      case 'versions': ui.versions = !ui.versions; rendre(); if (ui.versions) rendreVersions(); return;
      case 'restaurer': return seance.restaurer(id).then(() => { ui.versions = false; rendre(); message('Version précédente restaurée.'); }, e => message(e.message, 'erreur'));
      case 'effacer': return confirmer(b, 'Confirmer : repartir de la réserve de départ', async () => {
        await seance.effacer(); ui.edition = null; ui.compo = {}; ui.onglet = 'preparer'; rendre();
        message('Séance effacée. L’ancienne reste dans « Versions précédentes ».'); });
      case 'importer': return $('#fichier-import').click();
      default:
    }
  });

  document.addEventListener('change', ev => {
    const el = ev.target;
    if (el.dataset?.compo) {
      const courant = ui.compo[el.dataset.compo] ?? { n: 0, cachee: trouverProfil(seance.etat.reserve, el.dataset.compo)?.cachee === true };
      ui.compo[el.dataset.compo] = { ...courant, n: el.type === 'checkbox' ? Number(el.checked) : Math.max(0, Math.min(9, Number(el.value) || 0)) };
    } else if (el.dataset?.cachee) {
      const courant = ui.compo[el.dataset.cachee] ?? { n: 0 };
      ui.compo[el.dataset.cachee] = { ...courant, cachee: el.checked };
    } else if (el.id === 'jets-saisis') { seance.definirPreference('jets-saisis', el.checked ? '1' : '0'); rendre(); }
    else if (el.id === 'melee-mode') majMeleeDefense();
    else if (el.id === 'reveler-qui') majRevelerZone();
    else if (el.id === 'san-qui' || el.id === 'san-cout') majSanSuite();
    else if (['libre-qui', 'oppose-a', 'oppose-b'].includes(el.id)) {
      majCompetences('#libre-qui', '#libre-competence'); majCompetences('#oppose-a', '#oppose-a-comp'); majCompetences('#oppose-b', '#oppose-b-comp');
    } else if (el.id === 'fichier-import') importerFichier(el);
  });
  document.addEventListener('input', ev => {
    const el = ev.target;
    if (el.closest?.('#form-profil')) return majDerives();
    if (el.id === 'res-degats-arme' || el.id === 'res-degats-impact' || el.id === 'res-degats-empalement') return majResCon();
    if (el.id === 'san-d100' || el.id === 'san-perte') return majSanSuite();
    if (el.dataset?.revelerSan || el.dataset?.revelerPerte) return majRevelerSuite(el.dataset.revelerSan ?? el.dataset.revelerPerte);
  });
  document.addEventListener('submit', ev => {
    ev.preventDefault();
    if (ev.target.id === 'form-profil') enregistrerProfil(ev.target);
    else if (ev.target.id === 'form-arme') enregistrerArme(ev.target);
  });

  function exporter() {
    const blob = new Blob([JSON.stringify(seance.exporter(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cthulhu-sauvegarde-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message('Fichier de sauvegarde téléchargé.');
  }

  function importerFichier(input) {
    const fichier = input.files[0];
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = async () => {
      try {
        const bilan = await seance.importer(String(lecteur.result));
        ui.edition = null; ui.compo = {}; rendre();
        message(`Sauvegarde chargée : ${bilan.profils} profil(s), ${bilan.armes} arme(s)${bilan.rencontre ? ', rencontre en cours' : ''}. La séance précédente reste dans « Versions précédentes ».`);
      } catch (erreur) { message(`Sauvegarde non chargée : ${erreur.message}`, 'erreur'); }
    };
    lecteur.readAsText(fichier);
    input.value = '';
  }

  // --- Démarrage ------------------------------------------------------------------------------------------------------

  async function demarrer() {
    seance = creerSeance({
      surSauvegarde: erreur => { $('#statut-sauvegarde').textContent = erreur ? `Sauvegarde impossible : ${erreur.message}` : `Sauvegardé à ${new Date().toLocaleTimeString('fr-FR')}`; }
    });
    initSelecteurJeu();
    initThemeManager();
    let issue;
    try { issue = await seance.demarrer(); } catch (erreur) {
      issue = 'sans';
      $('#statut-sauvegarde').textContent = `Sans sauvegarde : ${erreur.message}`;
    }
    if (issue === 'illisible') message('La sauvegarde était illisible : repartie de la réserve de départ (l’ancienne reste dans « Versions précédentes »).', 'erreur');
    $('#statut-sauvegarde').textContent ||= issue === 'reprise' ? 'Séance reprise depuis la sauvegarde' : 'Nouvelle séance';
    ui.onglet = rencontre() ? 'jouer' : 'preparer';
    carte = brancherCarte();
    rendre();
    document.body.dataset.pret = '1';
  }
  demarrer();
}

if (typeof document !== 'undefined' && document.getElementById('cthulhu-app')) lancerInterface();
