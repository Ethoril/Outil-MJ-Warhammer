/**
 * Page d’Imperium Maledictum (lots I7a/I7b du chantier multi-jeux) : socle d’interface, écran Préparer
 * (réserve de profils, armes, composition de la rencontre), écran Jouer (rencontre, dés saisis par le MJ,
 * Supériorité, zones, engagements, états, Destin, journal), menu Fichiers et liaison avec RPG Map Display.
 *
 * Aucune règle n’est récodée ici : tout passe par les modules du moteur `imperium/` (`seance.js`,
 * `profils.js`, `regles.js`, `rencontre.js`, `saisie-des.js`, `projection-carte.js`). La séance, la
 * persistance et l’historique viennent de `seance.js` (lot I6) ; la coquille HTML/CSS est
 * `index.html` / `imperium.css`. Les dés attendus par une action sont prédits uniquement par
 * `sondeAction` (`saisie-des.js`) ; la saisie reste manuelle (case vide + bouton « Lancer », comme Cthulhu).
 *
 * Imports : uniquement `imperium/` et les modules communs du chapeau (liste gardée par
 * tests/unit/chapeau/modules-communs.test.mjs). Rien de Warhammer. Le nom de la base et le préfixe des
 * clés viennent du registre `js/core/jeux.js` : aucune base ni clé `wfrp*` ni `cthulhu.*` n’est lue,
 * écrite ni supprimée. Interface et messages en français ; yards = mètres, même valeur.
 */
import { participantCamp } from '../js/core/participant-camp.js';
import { initSelecteurJeu } from '../js/ui/selecteur-jeu.js';
import { initThemeManager } from '../js/ui/theme.js';
import { MAP_LINK_CHANNEL, MAP_LINK_PING_MS } from '../js/core/map-link-protocol.js';
import { renderMapLinkIndicator, renderMapLinkPending } from '../js/ui/map-link-indicator.js';
import { creerSeance, remplacerProfil, lireCompetences, ecrireCompetences } from './seance.js';
import {
  KINDS, CAMPS, TYPES_ARME, ajouterArme, modifierArme, supprimerArme,
  ajouterProfil, supprimerProfil, normaliserProfil, valeursDerivees, idDepuisNom, trouverProfil
} from './profils.js';
import { CARACS, PORTEES, VITESSES, TAILLES, ROLES_PNJ, ETATS, DIFFICULTES, COUVERT, LOCALISATIONS } from './regles.js';
import * as R from './rencontre.js';
import { validerEntier, tirerCase, fournisseurStrict, sondeAction } from './saisie-des.js';
import { creerLiaisonCarte } from './projection-carte.js';

/** Libellés français des localisations d'armure (p. 211, 316). */
const LIBELLE_LOCALISATION = Object.freeze({ tete: 'Tête', bras: 'Bras', brasG: 'Bras G', brasD: 'Bras D', corps: 'Corps', jambe: 'Jambes', jambeG: 'Jambe G', jambeD: 'Jambe D' });
/** Libellés français des localisations de touche (p. 211). */
const LIBELLE_TOUCHE = Object.freeze({ tete: 'Tête', 'bras-g': 'Bras gauche', 'bras-d': 'Bras droit', 'jambe-g': 'Jambe gauche', 'jambe-d': 'Jambe droite', corps: 'Corps' });

const LIBELLE_KIND = { PJ: 'Personnages-joueurs', PNJ: 'PNJ / Bestiaire' };
const LIBELLE_CAMP = { pj: 'PJ', ennemi: 'ennemi', neutre: 'neutre' };
const LIBELLE_ROLE = { troupe: 'Troupe', elite: 'Élite', chef: 'Chef' };
const LIBELLE_PORTEE = { immediate: 'Immédiate', courte: 'Courte', moyenne: 'Moyenne', longue: 'Longue', extreme: 'Extrême' };
const LIBELLE_TAILLE = { minuscule: 'Minuscule', petite: 'Petite', moyenne: 'Moyenne', grande: 'Grande', enorme: 'Énorme', monstrueuse: 'Monstrueuse' };
const LIBELLE_VITESSE = { lente: 'Lente', normale: 'Normale', rapide: 'Rapide' };
const LIBELLE_TYPE_ARME = { melee: 'Mêlée', tir: 'Tir' };
const LIBELLE_ETAT = Object.fromEntries(ETATS.map(e => [e.id, e.libelle]));
const LIBELLE_EFFET_DESTIN = {
  relancer: 'Relancer le dernier test (p. 220)', avantage: 'Avantage au prochain test (p. 220)',
  plus1DR: '+1 DR au dernier test (p. 220)', agirPremier: 'Agir en premier ce round (p. 220)',
  ignorerCritiques: 'Ignorer les critiques (p. 220)', retirerEtat: 'Retirer une condition (p. 220)'
};
const LIBELLE_EFFET_BRULE = {
  survie: 'Vivre un autre jour (p. 220)', eviterDegats: 'L’Empereur vous protège (p. 220)',
  pourEmpereur: 'Pour l’Empereur : résultat choisi (p. 220)', renverserCours: 'Renverser le cours : +1 Supériorité (p. 220)'
};
const LIBELLE_COUVERT = { leger: 'Léger (+2, p. 204)', moyen: 'Moyen (+4, p. 204)', lourd: 'Lourd (+6, p. 204)' };
const LIBELLE_DEFENSE_MELEE = { opposition: 'Opposition (Mêlée, p. 211)', esquive: 'Esquive (Réflexes, p. 211)', aucune: 'Aucune (p. 211)' };
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Traits d’arme saisis en texte (« burst, penetrating 2, inflict sonne ») -> `[{ id, valeur? }]`. */
function lireTraits(texte) {
  return String(texte ?? '').split(',').map(t => t.trim()).filter(Boolean).map(t => {
    const m = t.match(/^(\S+)(?:\s+(.+))?$/);
    const id = m[1].toLowerCase();
    const brut = m[2]?.trim();
    if (brut === undefined) return { id };
    return { id, valeur: /^-?\d+$/.test(brut) ? Number(brut) : brut };
  });
}
const ecrireTraits = traits => (traits ?? []).map(t => (t.valeur !== undefined ? `${t.id} ${t.valeur}` : t.id)).join(', ');

function lancerInterface() {
  const $ = sel => document.querySelector(sel);
  const ui = { onglet: 'preparer', edition: null, compo: {}, zones: null, surprise: '', superiorite: 0, filtreRound: 0, versions: false };
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

  // --- Dés : saisis par le MJ dans chaque action, avec un bouton « Lancer » à côté de chaque case ---------------------
  // Même convention que Cthulhu (cthulhu/app.js ajouterBoutonsLancer, repris de js/ui/dice-buttons.js) : chaque
  // case de dé `input[data-champ-des]` (attribut `data-des="<expr>"`) est vide par défaut ; le bouton « Lancer »
  // juste à côté écrit la valeur tirée par `tirerCase` puis déclenche `input` + `change`, sans jamais valider
  // l'action. Aucune bascule saisie/hasard, aucun tirage automatique sur case vide.

  function ajouterBoutonsLancer(root) {
    for (const input of root?.querySelectorAll?.('input[data-champ-des]') || []) {
      if (input.dataset.boutonLancer) continue;
      const des = input.dataset.des || (input.dataset.champDes === 'd100' ? 'd100' : '');
      if (!des) continue;
      input.dataset.boutonLancer = '1';
      const libelle = (input.getAttribute('aria-label') || input.closest('label')?.textContent || input.placeholder || '').trim();
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'bouton-lancer';
      bouton.textContent = 'Lancer';
      bouton.disabled = input.disabled;
      bouton.setAttribute('aria-label', `Lancer (${des})`);
      bouton.title = libelle;
      bouton.addEventListener('click', () => {
        input.value = String(tirerCase(des));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      input.insertAdjacentElement('afterend', bouton);
    }
  }

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

  /** Les champs identifiés d'une zone gardent leur valeur d'un rendu à l'autre (cible, mode, dés saisis…). */
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

  // --- Actions --------------------------------------------------------------------------------------------------------

  const rencontre = () => seance.etat.rencontre;

  /** Toute modification d'état passe par `seance.agir` (historique + sauvegarde) ; l'erreur éventuelle s'affiche. */
  function agir(type, fn, opts = {}) {
    const r = seance.agir(type, fn, opts.des ?? null);
    if (r.erreur) message(`Impossible : ${r.erreur.message}`, 'erreur');
    if (opts.avantRendre) opts.avantRendre(r);
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
   * Action du moteur avec les dés saisis. `champs` est lu et validé avant tout appel à `seance.agir` (case vide ou
   * invalide → refus, aucune action, aucun tirage) puis joué avec un `fournisseurStrict` : si le moteur demande un dé
   * qui n'a pas été saisi, il lève et le message d'erreur français s'affiche, sans tirer au hasard. Les champs
   * consommés sont vidés au rendu suivant si l'action réussit.
   */
  function jouerSaisi(type, fn, champs, opts = {}) {
    const lu = lireChamps(champs);
    if (!lu.ok) { bloquerSaisie(lu.el, lu.message); return { change: false, erreur: null }; }
    const des = fournisseurStrict({ d100: lu.d100, lancers: lu.lancers });
    return jouer(type, fn, des, {
      ...opts,
      avantRendre: r => { if (r.change) for (const c of champs) if (c.id) champsAVider.add(c.id); }
    });
  }

  /** Double-clic de confirmation (comme cthulhu/app.js) : le premier clic arme le bouton, le second exécute. */
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

  /** Zones configurées pour la rencontre (défaut : une seule zone). */
  const zonesActuelles = () => ui.zones ?? [{ id: 'zone-1', nom: 'Zone 1', traits: [] }];

  /** Suivi d'un PJ dans la liste : Blessures, Critiques, Destin et états (p. 88, 214-215, 220, 356-357). */
  function etatDuSuivi(p, d) {
    const s = p.suivi;
    if (!s) return '<small>neuf</small>';
    const etats = (s.etats ?? []).map(e => `${LIBELLE_ETAT[e.id] ?? e.id}${e.niveau === 'majeur' ? ' (majeur)' : ''}`).join(', ');
    return `<small>Blessures ${s.blessures ?? 0}/${d.blessuresMax} · Critiques ${(s.critiques ?? []).length}/${d.critiquesMax} · Destin ${s.destin ?? 0}/${s.destinBrule ?? 0}${etats ? ` · ${esc(etats)}` : ''}</small>`;
  }

  function ligneProfil(p) {
    const d = valeursDerivees(p);
    const c = ui.compo[p.id] ?? { n: 0, zoneId: null };
    const zones = zonesActuelles();
    const zoneSel = `<label>Zone <select data-compo-zone="${esc(p.id)}" aria-label="Zone initiale de ${esc(p.nom)}">${zones.map(z => `<option value="${esc(z.id)}"${(c.zoneId ?? zones[0].id) === z.id ? ' selected' : ''}>${esc(z.nom)}</option>`).join('')}</select></label>`;
    const compo = p.kind === 'PJ'
      ? `<label><input type="checkbox" data-compo="${esc(p.id)}"${c.n ? ' checked' : ''}> dans la rencontre</label>${zoneSel}`
      : `<label>× <input type="number" min="0" max="9" value="${c.n}" data-compo="${esc(p.id)}" aria-label="Nombre de ${esc(p.nom)} dans la rencontre"></label>${zoneSel}`;
    const role = p.role ? LIBELLE_ROLE[p.role] : '';
    const profil = `<strong>${esc(p.nom)}</strong>${p.source ? `<br><small>${esc(p.source)}</small>` : ''}<br><small>${[role, LIBELLE_TAILLE[p.taille] ?? p.taille, LIBELLE_VITESSE[p.vitesse] ?? p.vitesse].filter(Boolean).join(' · ')}</small>${p.kind === 'PJ' ? `<br>${etatDuSuivi(p, d)}` : ''}`;
    const armure = typeof d.armure === 'number' ? String(d.armure) : Object.entries(d.armure ?? {}).map(([k, v]) => `${LIBELLE_LOCALISATION[k] ?? k} ${v}`).join(', ');
    const armes = (p.armes ?? []).map(id => seance.etat.reserve.armes[id]?.nom ?? id).join(', ');
    const valeurs = `<small>Blessures ${d.blessuresMax} · Critiques ${d.critiquesMax} · Init ${d.initiative} · Armure ${esc(armure)}${p.resolution !== null && p.resolution !== undefined ? ` · Résolution ${p.resolution}` : ''}${armes ? ` · ${esc(armes)}` : ''}</small>`;
    return `<tr class="camp-${participantCamp({ camp: p.camp, kind: p.kind })}" data-profil="${esc(p.id)}">
      <td class="compo">${compo}</td>
      <td>${profil}</td>
      <td>${valeurs}</td>
      <td class="actions"><button type="button" data-action="modifier-profil" data-id="${esc(p.id)}">Modifier</button>
        <button type="button" data-action="supprimer-profil" data-id="${esc(p.id)}">Supprimer</button></td>
    </tr>`;
  }

  function formulaireProfil(reserve) {
    const p = ui.edition.id ? trouverProfil(reserve, ui.edition.id) : null;
    const nombre = (nom, valeur) => `<label>${nom} <input type="number" min="0" max="999" name="carac-${nom}" value="${valeur ?? ''}"></label>`;
    const options = (liste, choisi, libelles) => liste.map(v => `<option value="${esc(v)}"${choisi === v ? ' selected' : ''}>${libelles[v] ?? v}</option>`).join('');
    const armureGlobale = typeof p?.armure === 'number' ? p.armure : '';
    const loc = typeof p?.armure === 'object' && p.armure !== null ? p.armure : {};
    const locChamp = cle => `<label>${LIBELLE_LOCALISATION[cle] ?? cle} <input type="number" min="0" name="armure-${cle}" value="${loc[cle] ?? ''}"></label>`;
    const armesCases = Object.values(reserve.armes).map(a => `<label><input type="checkbox" name="armes" value="${esc(a.id)}"${p?.armes?.includes(a.id) ? ' checked' : ''}> ${esc(a.nom)}</label>`).join('');
    return `<form id="form-profil" class="formulaire" aria-label="${p ? `Modifier ${esc(p.nom)}` : 'Nouveau profil'}">
      <h3>${p ? `Modifier ${esc(p.nom)}` : 'Nouveau profil'}</h3>
      <div class="champs">
        <label>Nom <input type="text" name="nom" required value="${esc(p?.nom)}"></label>
        <label>Type <select name="kind">${KINDS.map(k => `<option value="${k}"${(p?.kind ?? 'PJ') === k ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
        <label>Rôle <select name="role"><option value="">aucun</option>${ROLES_PNJ.map(r => `<option value="${r}"${p?.role === r ? ' selected' : ''}>${LIBELLE_ROLE[r]}</option>`).join('')}</select></label>
        <label>Camp <select name="camp">${CAMPS.map(k => `<option value="${k}"${(p?.camp ?? 'pj') === k ? ' selected' : ''}>${LIBELLE_CAMP[k]}</option>`).join('')}</select></label>
        <label>Taille <select name="taille">${options(TAILLES, p?.taille ?? 'moyenne', LIBELLE_TAILLE)}</select></label>
        <label>Vitesse <select name="vitesse">${options(VITESSES, p?.vitesse ?? 'normale', LIBELLE_VITESSE)}</select></label>
      </div>
      <fieldset><legend>Caractéristiques (p. 50)</legend>${CARACS.map(c => nombre(c, p ? p.carac[c] : '')).join('')}</fieldset>
      <p id="derives" class="derives" aria-live="polite"></p>
      <label class="large">Compétences, une par ligne (« Mêlée 40 »)<textarea name="competences" rows="5">${esc(ecrireCompetences(p?.competences))}</textarea></label>
      <div class="champs">
        <label>Armure globale <input type="number" min="0" name="armure" value="${armureGlobale}"></label>
      </div>
      <fieldset><legend>Armure par localisation (optionnel, p. 211, 316)</legend>
        ${['tete', 'brasG', 'brasD', 'corps', 'jambeG', 'jambeD'].map(locChamp).join('')}
      </fieldset>
      <fieldset><legend>Armes équipées</legend>${armesCases || '<small>Aucune arme dans la réserve.</small>'}</fieldset>
      <div class="champs">
        <label>Résolution <input type="number" min="0" name="resolution" value="${p?.resolution ?? ''}"></label>
        <label>Destin max <input type="number" min="0" name="destinMax" value="${p?.destinMax ?? ''}"></label>
        <label>Blessures max fixe <input type="number" min="0" name="blessuresMaxFixe" value="${p?.blessuresMaxFixe ?? ''}"></label>
        <label>Critiques max fixes <input type="number" min="0" name="critiquesMaxFixe" value="${p?.critiquesMaxFixe ?? ''}"></label>
        <label>Initiative fixe <input type="number" min="0" name="initiativeFixe" value="${p?.initiativeFixe ?? ''}"></label>
        <label>Image (maps/tokens/…) <input type="text" name="image" value="${esc(p?.image)}"></label>
      </div>
      <label class="large">Traits <textarea name="traitsTexte" rows="2">${esc(p?.traitsTexte)}</textarea></label>
      <label class="large">Notes <textarea name="notes" rows="2">${esc(p?.notes)}</textarea></label>
      <label>Source <input type="text" name="source" value="${esc(p?.source)}" placeholder="Livre de base p. …"></label>
      <p><button type="submit" class="principal">${p ? 'Enregistrer' : 'Créer le profil'}</button> <button type="button" data-action="fermer-formulaire">Annuler</button></p>
    </form>`;
  }

  /** L'armure saisie : objet localisé si au moins une localisation est renseignée, sinon le nombre global. */
  function lireArmure(f) {
    const loc = {};
    for (const cle of ['tete', 'brasG', 'brasD', 'corps', 'jambeG', 'jambeD']) {
      const v = String(f.get(`armure-${cle}`) ?? '').trim();
      if (v !== '') loc[cle] = v;
    }
    if (Object.keys(loc).length) return loc;
    const globale = String(f.get('armure') ?? '').trim();
    return globale === '' ? 0 : Number(globale); // nombre, sinon profils.js efface l'armure globale
  }

  function lireFormulaireProfil(form) {
    const f = new FormData(form);
    const texte = k => String(f.get(k) ?? '').trim();
    return {
      nom: texte('nom'), kind: texte('kind'), role: texte('role') || null, camp: texte('camp'),
      taille: texte('taille'), vitesse: texte('vitesse'),
      carac: Object.fromEntries(CARACS.map(c => [c, f.get(`carac-${c}`)])),
      competences: lireCompetences(f.get('competences')),
      armure: lireArmure(f),
      armes: f.getAll('armes').map(String),
      resolution: f.get('resolution'), destinMax: f.get('destinMax'),
      blessuresMaxFixe: f.get('blessuresMaxFixe'), critiquesMaxFixe: f.get('critiquesMaxFixe'), initiativeFixe: f.get('initiativeFixe'),
      image: texte('image') || null, traitsTexte: texte('traitsTexte'), notes: texte('notes'), source: texte('source')
    };
  }

  function majDerives() {
    const form = $('#form-profil');
    const cible = $('#derives');
    if (!form || !cible) return;
    try {
      const p = normaliserProfil(lireFormulaireProfil(form));
      if (!CARACS.every(c => Number.isFinite(p.carac[c]))) { cible.textContent = 'Renseignez les neuf caractéristiques pour voir les valeurs dérivées.'; return; }
      const d = valeursDerivees(p);
      cible.textContent = `Dérivées : Blessures max ${d.blessuresMax} · Critiques max ${d.critiquesMax} · Initiative ${d.initiative} (p. 88).`;
    } catch { cible.textContent = ''; }
  }

  function enregistrerProfil(form) {
    let donnees;
    try { donnees = lireFormulaireProfil(form); } catch (erreur) { return message(erreur.message, 'erreur'); }
    const id = ui.edition.id;
    const r = agir(id ? 'profil-modifie' : 'profil-cree', etat => ({ ...etat,
      reserve: id ? remplacerProfil(etat.reserve, id, donnees) : ajouterProfil(etat.reserve, donnees) }));
    if (r.change) { ui.edition = null; rendre(); message(id ? 'Profil enregistré.' : 'Profil créé.'); }
  }

  function formulaireArme() {
    const a = ui.edition.id ? seance.etat.reserve.armes[ui.edition.id] : null;
    // Une arme de mêlée neuve a une portée Immédiate (contact, p. 201-202) ; une arme de tir neuve, Moyenne.
    const porteeDefaut = a?.portee ?? (a?.type === 'tir' ? 'moyenne' : 'immediate');
    return `<form id="form-arme" class="formulaire" aria-label="${a ? `Modifier ${esc(a.nom)}` : 'Nouvelle arme'}">
      <h3>${a ? `Modifier ${esc(a.nom)}` : 'Nouvelle arme'}</h3>
      <div class="champs">
        <label>Nom <input type="text" name="nom" required value="${esc(a?.nom)}"></label>
        <label>Type <select name="type">${TYPES_ARME.map(t => `<option value="${t}"${(a?.type ?? 'melee') === t ? ' selected' : ''}>${LIBELLE_TYPE_ARME[t]}</option>`).join('')}</select></label>
        <label>Spécialisation <input type="text" name="specialisation" value="${esc(a?.specialisation)}" placeholder="Mêlée (Une main), Tir (Pistolet)…"></label>
        <label>Dégâts de base <input type="number" min="0" name="degatsBase" value="${a?.degatsBase ?? 0}"></label>
        <label><input type="checkbox" name="ajouteBF"${a?.ajouteBF ? ' checked' : ''}> ajoute le bonus de F (p. 128)</label>
        <label>Portée <select name="portee">${PORTEES.map(p => `<option value="${p}"${porteeDefaut === p ? ' selected' : ''}>${LIBELLE_PORTEE[p]}</option>`).join('')}</select></label>
        <label>Chargeur <input type="number" min="1" name="chargeur" value="${a?.chargeur ?? ''}" placeholder="aucun"></label>
      </div>
      <label class="large">Traits, séparés par des virgules (« burst, penetrating 2, inflict sonne »)<textarea name="traits" rows="2">${esc(ecrireTraits(a?.traits))}</textarea></label>
      <label>Source <input type="text" name="source" value="${esc(a?.source)}" placeholder="Livre de base p. …"></label>
      <p><button type="submit" class="principal">${a ? 'Enregistrer' : 'Créer l’arme'}</button> <button type="button" data-action="fermer-formulaire">Annuler</button></p>
    </form>`;
  }

  function ligneArme(a) {
    return `<tr><td><strong>${esc(a.nom)}</strong></td>
      <td><small>${LIBELLE_TYPE_ARME[a.type] ?? a.type}${a.specialisation ? ` · ${esc(a.specialisation)}` : ''} · dégâts ${a.degatsBase}${a.ajouteBF ? ' +BF' : ''} (p. 128) · portée ${LIBELLE_PORTEE[a.portee] ?? a.portee}${a.chargeur !== null ? ` · chargeur ${a.chargeur}` : ''}${a.traits?.length ? ` · ${esc(ecrireTraits(a.traits))}` : ''}${a.source ? ` · ${esc(a.source)}` : ''}</small></td>
      <td class="actions"><button type="button" data-action="modifier-arme" data-id="${esc(a.id)}">Modifier</button>
        <button type="button" data-action="supprimer-arme" data-id="${esc(a.id)}">Supprimer</button></td></tr>`;
  }

  function enregistrerArme(form) {
    const f = new FormData(form);
    const texte = k => String(f.get(k) ?? '').trim();
    const donnees = {
      nom: texte('nom'), type: texte('type'), specialisation: texte('specialisation'),
      degatsBase: f.get('degatsBase'), ajouteBF: f.get('ajouteBF') === 'on',
      portee: texte('portee'), chargeur: f.get('chargeur'), traits: lireTraits(f.get('traits')), source: texte('source')
    };
    const id = ui.edition.id;
    const r = agir(id ? 'arme-modifiee' : 'arme-creee', etat => ({ ...etat,
      reserve: id ? modifierArme(etat.reserve, id, donnees) : ajouterArme(etat.reserve, { ...donnees, id: idDepuisNom(donnees.nom, Object.keys(etat.reserve.armes)) }) }));
    if (r.change) { ui.edition = null; rendre(); message(id ? 'Arme enregistrée.' : 'Arme créée.'); }
  }

  /** Zones initiales éditables (minimum 1), Supériorité initiale (p. 196) et Surprise (p. 199). */
  function optionsRencontre(enCours) {
    const zones = zonesActuelles();
    return `<fieldset><legend>Options de la rencontre</legend>
      <div id="liste-zones">${zones.map(z => `<p><label>Nom de la zone <input type="text" data-zone-nom="${esc(z.id)}" value="${esc(z.nom)}"></label>
        <button type="button" data-action="supprimer-zone" data-id="${esc(z.id)}"${zones.length <= 1 ? ' disabled' : ''} title="${zones.length <= 1 ? 'Au moins une zone est conservée' : 'Retirer cette zone'}">Retirer</button></p>`).join('')}</div>
      <p><button type="button" data-action="ajouter-zone">Ajouter une zone</button></p>
      <div class="champs">
        <label>Supériorité initiale (0-3, p. 196) <input type="number" min="0" max="3" id="superiorite-initiale" value="${ui.superiorite ?? 0}"></label>
        <label>Surprise (p. 199) <select id="surprise">
          <option value=""${ui.surprise === '' ? ' selected' : ''}>aucune</option>
          <option value="pj"${ui.surprise === 'pj' ? ' selected' : ''}>Les PJ surprennent</option>
          <option value="ennemi"${ui.surprise === 'ennemi' ? ' selected' : ''}>L’ennemi surprend</option>
        </select></label>
      </div>
      <p class="barre">
        <button type="button" id="composer" class="principal" data-action="composer"${enCours ? ' disabled' : ''}>Composer la rencontre</button>
        <button type="button" data-action="nouveau-profil">Nouveau profil</button>
      </p>
    </fieldset>`;
  }

  function rendrePreparer() {
    const { reserve, rencontre: r } = seance.etat;
    const groupe = kind => {
      const lignes = reserve.profils.filter(p => p.kind === kind).map(ligneProfil).join('');
      return lignes ? `<tbody><tr class="groupe"><th colspan="4">${LIBELLE_KIND[kind]}</th></tr>${lignes}</tbody>` : '';
    };
    const armes = Object.values(reserve.armes).map(ligneArme).join('');
    const enCours = r !== null;
    $('#panneau-preparer').innerHTML = `
      <section class="carte" aria-labelledby="t-reserve">
        <h2 id="t-reserve">Réserve de profils</h2>
        ${enCours ? '<p class="avis">Une rencontre est en cours : terminez-la ou abandonnez-la dans l’onglet Jouer avant d’en composer une autre.</p>' : ''}
        <table><thead><tr><th>Rencontre</th><th>Profil</th><th>Valeurs</th><th><span class="sr-only">Actions</span></th></tr></thead>
          ${groupe('PJ')}${groupe('PNJ')}</table>
        ${reserve.profils.length ? '' : '<p>La réserve est vide : créez un profil.</p>'}
        ${optionsRencontre(enCours)}
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

  function composer() {
    const zones = zonesActuelles();
    const superioriteInitiale = Number($('#superiorite-initiale').value) || 0; // plafonnée par le moteur (p. 196)
    const surpriseBrute = $('#surprise').value;
    const surprise = surpriseBrute === 'pj' || surpriseBrute === 'ennemi' ? surpriseBrute : null; // p. 199
    const entrees = [];
    for (const p of seance.etat.reserve.profils) {
      const c = ui.compo[p.id] ?? { n: 0, zoneId: null };
      const zoneId = c.zoneId || zones[0].id;
      if (p.kind === 'PJ') { if (c.n) entrees.push({ id: p.id, zoneId }); continue; }
      for (let i = 0; i < c.n; i++) entrees.push({ id: p.id, zoneId });
    }
    const r = agir('composition', etat => ({ ...etat, rencontre: R.composerRencontre(etat.reserve, entrees, { zones, superioriteInitiale, surprise }) }));
    if (r.change) { ui.onglet = 'jouer'; rendre(); message('Rencontre composée.'); }
  }

  // ---- Onglet Jouer ----

  function nb(sel, def) {
    const el = $(sel);
    const n = el ? parseInt(el.value, 10) : NaN;
    return Number.isFinite(n) ? n : def;
  }
  function avantagesDe(n) { return Array.from({ length: Math.max(0, n) }, () => 'manuel'); }
  function enJeuListe(r) { return r.participants.filter(p => R.enJeu(p)); }

  function paramsMelee() {
    const acteur = R.acteurCourant(rencontre());
    return {
      id: acteur.id,
      cibleId: $('#melee-cible').value,
      armeId: $('#melee-arme').value,
      modeDefense: $('#melee-defense').value || 'opposition',
      cibleLocalisation: $('#melee-localisation').value || null,
      utiliserSuperiorite: !!$('#melee-superiorite') && $('#melee-superiorite').checked,
      charge: $('#melee-charge').checked,
      retenirCoups: $('#melee-retenir').checked,
      avantages: avantagesDe(nb('#melee-avantages', 0)),
      desavantages: avantagesDe(nb('#melee-desavantages', 0)),
    };
  }
  function paramsTir() {
    const acteur = R.acteurCourant(rencontre());
    return {
      id: acteur.id,
      cibleId: $('#tir-cible').value,
      armeId: $('#tir-arme').value,
      mode: $('#tir-mode').value || 'normal',
      modeDefense: $('#tir-defense').value || 'esquive',
      cibleLocalisation: $('#tir-localisation').value || null,
      utiliserSuperiorite: !!$('#tir-superiorite') && $('#tir-superiorite').checked,
      retenirCoups: $('#tir-retenir').checked,
      avantages: avantagesDe(nb('#tir-avantages', 0)),
      desavantages: avantagesDe(nb('#tir-desavantages', 0)),
    };
  }
  function paramsSoins() {
    const acteur = R.acteurCourant(rencontre());
    return { id: acteur.id, cibleId: $('#soins-cible').value, mode: $('#soins-mode').value || 'soin', competence: $('#soins-competence').value };
  }
  function paramsLibre() {
    return {
      id: $('#libre-qui').value,
      competence: $('#libre-competence').value,
      difficulte: $('#libre-difficulte').value || 'intermediaire',
      avantages: avantagesDe(nb('#libre-avantages', 0)),
      desavantages: avantagesDe(nb('#libre-desavantages', 0)),
      bonusDR: 0,
      utiliserSuperiorite: !!$('#libre-superiorite') && $('#libre-superiorite').checked,
      kind: 'test',
    };
  }
  function paramsOppose() {
    return {
      idA: $('#oppose-a').value,
      competenceA: $('#oppose-a-comp').value,
      idB: $('#oppose-b').value,
      competenceB: $('#oppose-b-comp').value,
      difficulte: $('#oppose-difficulte').value || 'intermediaire',
      bonusDRA: nb('#oppose-a-dr', 0),
      bonusDRB: nb('#oppose-b-dr', 0),
    };
  }
  function paramsDestin(pid) {
    const effet = $('#destin-effet-' + pid).value;
    if (effet === 'retirerEtat') return { etat: $('#destin-etat-' + pid).value, cibleId: pid };
    return {};
  }

  function requeteDeZone(kind, zone) {
    switch (kind) {
      case 'commencer': return { action: 'commencerRound', params: {} };
      case 'egalite-init': return { action: 'resoudreEgaliteInitiative', gagnantId: zone.dataset.gagnant };
      case 'inversion': return { action: 'choisirInversion', optionId: zone.dataset.optionId, params: rencontre().enAttente?.params ?? {} };
      case 'egalite': return { action: 'trancherEgalite', decision: zone.dataset.decision || 'relancer' };
      case 'melee': return { action: 'attaquerMelee', params: paramsMelee() };
      case 'tir': return { action: 'attaquerDistance', params: paramsTir() };
      case 'tour': return { action: 'passerTour', params: {} };
      case 'soins': return { action: 'premiersSoins', params: paramsSoins() };
      case 'libre': return { action: 'testLibre', params: paramsLibre() };
      case 'oppose': return { action: 'testOppose', params: paramsOppose() };
      case 'destin': return { action: 'depenserDestin', id: zone.dataset.destinPid, effet: $('#destin-effet-' + zone.dataset.destinPid).value, params: paramsDestin(zone.dataset.destinPid) };
      default: return null;
    }
  }

  function cleZone(zone) {
    return zone.id || [zone.dataset.zoneDes, zone.dataset.optionId || zone.dataset.gagnant || zone.dataset.decision || zone.dataset.destinPid || ''].join('|');
  }
  function idChampDe(zone, cle) {
    return (zone.id || 'zone') + '--' + String(cle).replace(/[^a-z0-9_-]/gi, '-');
  }
  function champHtml(zone, champ, valeur) {
    const id = idChampDe(zone, champ.cle);
    const max = champ.type === 'd100' ? 100 : null;
    return '<label>' + esc(champ.libelle) +
      ' <input type="number" class="' + (champ.type === 'd100' ? 'd100-inline' : 'case-des') + '"' +
      ' id="' + esc(id) + '" data-champ-des="' + esc(champ.type) + '" data-des="' + esc(champ.des) + '" data-cle="' + esc(champ.cle) + '"' +
      (max ? ' min="1" max="' + max + '"' : '') +
      ' value="' + esc(valeur ?? '') + '" aria-label="' + esc(champ.libelle) + '"></label>';
  }

  function sondeZone(zone, presetsZone) {
    const requete = requeteDeZone(zone.dataset.zoneDes, zone);
    if (!requete) return null;
    const d100 = [];
    const lancers = [];
    zone.querySelectorAll('input[data-champ-des]').forEach(el => {
      const brut = el.value.trim();
      if (brut === '') return;
      const v = parseInt(brut, 10);
      if (!Number.isFinite(v)) return;
      if (el.dataset.champDes === 'd100') d100.push(v); else lancers.push(v);
    });
    (presetsZone ? Array.from(presetsZone.entries()) : []).forEach(([cle, brut]) => {
      if (brut === '' || zone.querySelector('input[data-cle="' + cle + '"]')) return;
      const v = parseInt(brut, 10);
      if (!Number.isFinite(v)) return;
      const m = /^([^:]+(?:#[0-9]+)?):/.exec(cle);
      if (!m) return;
      if (/^d100/.test(m[1])) d100.push(v); else lancers.push(v);
    });
    const plan = sondeAction(rencontre(), requete, { d100, lancers });
    if (plan && plan.champs && presetsZone) {
      plan.champs.forEach(champ => {
        if (champ.valeurSaisie != null) return;
        const brut = presetsZone.get(champ.cle);
        if (brut !== undefined && brut !== '') {
          const v = parseInt(brut, 10);
          if (Number.isFinite(v)) champ.valeurSaisie = v;
        }
      });
    }
    return plan;
  }

  function champsDeZone(zone) {
    const plan = zone._plan;
    if (!plan || !plan.champs) return [];
    return plan.champs.map(c => ({ sel: '#' + CSS.escape(idChampDe(zone, c.cle)), id: idChampDe(zone, c.cle), type: c.type, libelle: c.libelle }));
  }

  function majDesZones(presets) {
    const panneau = $('#panneau-jouer');
    if (!panneau) return;
    panneau.querySelectorAll('[data-zone-des]').forEach(zone => {
      const cleZ = cleZone(zone);
      const plan = sondeZone(zone, presets ? presets.get(cleZ) : null);
      if (!plan) return;
      zone._plan = plan;
      const signature = JSON.stringify({ champs: plan.champs, erreur: plan.erreur || null });
      if (zone._signature === signature) return;
      zone._signature = signature;
      const valeurs = {};
      let focusCle = null;
      const actif = document.activeElement;
      zone.querySelectorAll('input[data-champ-des]').forEach(el => {
        valeurs[el.dataset.cle] = el.value;
        if (el === actif) focusCle = el.dataset.cle;
      });
      let html = '';
      if (plan.erreur) html += '<p class="avis" role="alert">' + esc(plan.erreur) + '</p>';
      plan.champs.forEach(champ => {
        const preset = presets ? presets.get(cleZ) : null;
        const brut = preset && preset.get(champ.cle) !== undefined ? preset.get(champ.cle) : valeurs[champ.cle];
        const valeur = champ.valeurSaisie != null ? String(champ.valeurSaisie) : (brut ?? '');
        html += champHtml(zone, champ, valeur);
      });
      zone.innerHTML = html;
      if (focusCle) {
        const el = zone.querySelector('input[data-cle="' + focusCle + '"]');
        if (el) el.focus();
      }
      ajouterBoutonsLancer(zone);
    });
  }

  function modesTirOptions(arme) {
    const opts = [{ id: 'normal', libelle: 'Normal' }];
    if (!arme) return opts;
    const ids = new Set((arme.traits || []).map(t => t.id));
    if (ids.has('burst') || ids.has('rapid-fire')) opts.push({ id: 'rafale', libelle: 'Rafale' });
    if (ids.has('rapid-fire')) {
      opts.push({ id: 'rapide-spread', libelle: 'Tir rapide (dispersion)' });
      opts.push({ id: 'rapide-degats', libelle: 'Tir rapide (dégâts)' });
    }
    if (ids.has('supercharge')) opts.push({ id: 'surcharger', libelle: 'Surcharge' });
    return opts;
  }
  function majModesTir() {
    const sel = $('#tir-mode');
    if (!sel) return;
    const courant = sel.value;
    const r = rencontre();
    const acteur = r && r.ordre.length ? R.acteurCourant(r) : null;
    const armes = acteur ? acteur.armes.map(id => r.armes[id] || Object.values(r.armes).find(a => a.id === id)).filter(Boolean).filter(a => a.type === 'tir') : [];
    const arme = armes.find(a => a.id === $('#tir-arme').value) || armes[0] || null;
    const opts = modesTirOptions(arme);
    sel.innerHTML = opts.map(o => '<option value="' + esc(o.id) + '">' + esc(o.libelle) + '</option>').join('');
    if (opts.some(o => o.id === courant)) sel.value = courant;
  }

  function optionsCompetences(p) {
    const comps = Object.keys((p && p.competences) || {}).sort((a, b) => a.localeCompare(b, 'fr'));
    return comps.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('') +
      '<optgroup label="Caractéristiques">' + CARACS.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('') + '</optgroup>';
  }
  function majCompetences(selQui, selComp) {
    const qui = $(selQui);
    const comp = $(selComp);
    if (!qui || !comp) return;
    const courant = comp.value;
    const r = rencontre();
    const p = r ? (r.participants.find(x => x.id === qui.value) || null) : null;
    comp.innerHTML = optionsCompetences(p);
    if (p && Object.prototype.hasOwnProperty.call(p.competences || {}, courant)) comp.value = courant;
  }

  function rendreSuperiorite(r) {
    return '<div class="superiorite-outils">' +
      '<span class="badge superiorite">Supériorité : ' + r.superiorite + '</span>' +
      '<button type="button" data-action="superiorite-moins" aria-label="Retirer un point de supériorité">-</button>' +
      '<button type="button" data-action="superiorite-plus" aria-label="Ajouter un point de supériorité">+</button>' +
      '</div>';
  }

  function rendreZones(r) {
    let html = '<div class="zones">';
    r.zones.forEach(z => {
      const courante = r.participants.some(p => p.etat === 'actif' && p.zoneId === z.id && r.ordre[r.indexTour] === p.id);
      html += '<span class="zone' + (courante ? ' courante' : '') + '" data-zone-id="' + esc(z.id) + '">' + esc(z.nom) +
        ' <input type="text" class="traits" id="traits-zone-' + esc(z.id) + '" data-traits-zone="' + esc(z.id) + '" value="' + esc(ecrireTraits(z.traits || [])) + '" aria-label="Traits de ' + esc(z.nom) + '"></span>';
    });
    html += '</div>';
    html += '<div class="engagements">';
    (r.engages || []).forEach(paire => {
      const a = Array.isArray(paire) ? paire[0] : paire.a;
      const b = Array.isArray(paire) ? paire[1] : paire.b;
      const pa = r.participants.find(p => p.id === a);
      const pb = r.participants.find(p => p.id === b);
      if (!pa || !pb) return;
      html += '<span class="badge etat">' + esc(pa.nom) + ' engagé avec ' + esc(pb.nom) +
        ' <button type="button" data-action="desengager" data-a="' + esc(a) + '" data-b="' + esc(b) + '" aria-label="Se désengager de ' + esc(pb.nom) + '">✕</button></span>';
    });
    const enJeu = enJeuListe(r);
    html += '<label>Engager <select id="engager-a">' + enJeu.map(p => '<option value="' + esc(p.id) + '">' + esc(p.nom) + '</option>').join('') + '</select>' +
      ' <select id="engager-b">' + enJeu.map(p => '<option value="' + esc(p.id) + '">' + esc(p.nom) + '</option>').join('') + '</select>' +
      ' <button type="button" data-action="engager">Engager</button></label>';
    html += '</div>';
    return html;
  }

  function rendreParticipants(r) {
    const rang = {};
    r.ordre.forEach((id, i) => { rang[id] = i + 1; });
    const lignes = r.participants.slice().sort((a, b) => (rang[a.id] || 999) - (rang[b.id] || 999) || a.nom.localeCompare(b.nom, 'fr'));
    let html = '<table id="participants"><thead><tr>' +
      '<th>Rang</th><th>Nom</th><th>Zone</th><th>Blessures</th><th>Critiques</th><th>États</th><th>Destin</th><th>Munitions</th>' +
      '</tr></thead><tbody>';
    lignes.forEach(p => {
      const courant = r.ordre[r.indexTour] === p.id;
      const mort = p.etat === 'mort' || p.etat === 'vaincu';
      let cls = 'camp-' + (p.camp === 'pj' ? 'pj' : p.camp === 'ennemi' ? 'ennemi' : 'neutre');
      if (courant) cls += ' courant';
      if (mort) cls += ' etat-mort';
      html += '<tr class="' + cls + '" data-participant="' + esc(p.id) + '">';
      html += '<td>' + (rang[p.id] || '—') + '</td>';
      html += '<td><strong>' + esc(p.nom) + '</strong><br><small>' + esc(LIBELLE_KIND[p.kind] || p.kind || '') + (p.role ? ' · ' + esc(LIBELLE_ROLE[p.role] || p.role) : '') + ' · ' + esc(LIBELLE_CAMP[p.camp] || p.camp) + '</small>' +
        (p.resolution != null ? '<br><small>Résolution ' + p.resolution + '</small>' : '') +
        (p.initiative != null ? '<br><small>Init ' + p.initiative + '</small>' : '') + '</td>';
      html += '<td><select id="zone-p-' + esc(p.id) + '" data-zone-p="' + esc(p.id) + '">' +
        r.zones.map(z => '<option value="' + esc(z.id) + '"' + (p.zoneId === z.id ? ' selected' : '') + '>' + esc(z.nom) + '</option>').join('') +
        '</select></td>';
      html += '<td>' + p.blessures + '/' + p.blessuresMax + '</td>';
      const nonTraitees = (p.critiques || []).filter(c => c.traitementRequis && !c.traitee).length;
      html += '<td>' + (p.critiques || []).map(c => '<span class="badge critique" title="' + esc(c.nom + (c.page ? ' (p. ' + c.page + ')' : '')) + '">' + esc(c.localisation) + '</span>').join('') +
        ' <small>' + (p.critiques || []).length + '/' + p.critiquesMax + '</small>' +
        (nonTraitees > 0 ? ' <button type="button" data-action="traiter-critique" data-id="' + esc(p.id) + '">Traiter</button>' : '') + '</td>';
      let etats = (p.etats || []).map(e => {
        const def = ETATS.find(x => x.id === e.id);
        const lib = def ? def.libelle : e.id;
        const niv = e.niveau ? ' (' + e.niveau + ')' : '';
        const desespere = e.id === 'desespere' ? ' desespere' : '';
        return '<button type="button" class="badge etat' + desespere + '" data-action="retirer-etat" data-id="' + esc(p.id) + '" data-etat="' + esc(e.id) + '" title="Retirer ' + esc(lib) + '">' + esc(lib + niv) + ' ✕</button>';
      }).join('');
      const optsEtats = ETATS.map(e => '<option value="' + esc(e.id) + '">' + esc(e.libelle) + '</option>').join('');
      etats += '<select id="etat-add-' + esc(p.id) + '" data-etat-add="' + esc(p.id) + '" aria-label="Ajouter un état à ' + esc(p.nom) + '">' + optsEtats + '</select>' +
        '<select id="etat-niveau-' + esc(p.id) + '" class="cachee" hidden><option value="mineur">mineur</option><option value="majeur">majeur</option></select>' +
        '<button type="button" data-action="ajouter-etat" data-id="' + esc(p.id) + '">Ajouter</button>';
      html += '<td>' + etats + '</td>';
      if (p.camp === 'pj') {
        html += '<td><span class="badge destin">Destin ' + p.destin + '/' + p.destinMax + '</span>' +
          (p.destinBrule > 0 ? ' <span class="badge destin">brûlé ' + p.destinBrule + '</span>' : '') +
          '<br><label>Effet <select id="destin-effet-' + esc(p.id) + '" data-destin-effet="' + esc(p.id) + '">' +
          Object.entries(LIBELLE_EFFET_DESTIN).map(([id, lib]) => '<option value="' + esc(id) + '">' + esc(lib) + '</option>').join('') +
          '</select></label>' +
          '<select id="destin-etat-' + esc(p.id) + '" class="cachee" hidden>' + optsEtats + '</select>' +
          '<span class="saisie-des" id="des-destin-' + esc(p.id) + '" data-zone-des="destin" data-destin-pid="' + esc(p.id) + '"></span>' +
          ' <button type="button" data-action="depenser-destin" data-id="' + esc(p.id) + '">Dépenser</button>' +
          '<br><label>Brûler <select id="destin-brule-' + esc(p.id) + '" data-destin-brule="' + esc(p.id) + '">' +
          Object.entries(LIBELLE_EFFET_BRULE).map(([id, lib]) => '<option value="' + esc(id) + '">' + esc(lib) + '</option>').join('') +
          '</select></label>' +
          '<input type="number" min="1" max="100" id="destin-jet-' + esc(p.id) + '" class="cachee" hidden aria-label="Jet de dé pour l’Empereur">' +
          ' <button type="button" data-action="bruler-destin" data-id="' + esc(p.id) + '">Brûler</button></td>';
      } else {
        html += '<td>—</td>';
      }
      const armesMun = p.armes.map(id => r.armes[id]).filter(a => a && a.chargeur).map(a => {
        const m = p.munitionsParArme && p.munitionsParArme[a.id] != null ? p.munitionsParArme[a.id] : a.chargeur;
        return esc(a.nom) + ' ' + m + '/' + a.chargeur;
      }).join('<br>');
      html += '<td>' + (armesMun || '—') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function rendreEgaliteInit(r, e) {
    const nomDe = id => { const p = r.participants.find(x => x.id === id); return p ? p.nom : id; };
    let html = '<div class="egalite" id="egalite-init" role="alert">';
    html += '<p>Égalité d’initiative entre ' + esc(nomDe(e.a)) + ' et ' + esc(nomDe(e.b)) + ' : qui agit en premier ? (p. 198)</p>';
    [e.a, e.b].forEach(id => {
      html += '<div><button type="button" data-egalite-init="' + esc(id) + '">' + esc(nomDe(id)) + ' agit en premier</button>' +
        '<span class="saisie-des" id="des-egalite-init-' + esc(id) + '" data-zone-des="egalite-init" data-gagnant="' + esc(id) + '"></span></div>';
    });
    html += '</div>';
    return html;
  }

  function rendreInversion(r, e) {
    const libCote = { attaque: 'Côté attaquant', defense: 'Côté défenseur', a: 'Côté premier', b: 'Côté second', test: 'Côté test' };
    let html = '<div class="inversion" id="inversion" role="alert">';
    html += '<p>Jet double : choisissez le résultat (p. 189).</p>';
    e.inversions.forEach(inv => {
      html += '<fieldset><legend>' + esc(libCote[inv.cote] || inv.cote) + '</legend>';
      inv.apercu.options.forEach(opt => {
        const oid = e.inversions.length > 1 ? inv.cote + ':' + opt.id : opt.id;
        const drSigne = (opt.dr >= 0 ? '+' : '') + opt.dr;
        html += '<div><button type="button" data-inversion="' + esc(oid) + '">' +
          esc(opt.id === 'keep' ? 'Garder' : 'Inverser en ' + opt.jet) + ' (jet ' + opt.jet + ', DR ' + drSigne + (opt.palier ? ', ' + esc(opt.palier.libelle) : '') + ')</button>' +
          '<span class="saisie-des" data-zone-des="inversion" data-option-id="' + esc(oid) + '"></span></div>';
      });
      html += '</fieldset>';
    });
    html += '</div>';
    return html;
  }

  function rendreEgalite(r, e) {
    let html = '<div class="egalite" id="egalite" role="alert">';
    html += '<p>Égalité parfaite : tranchez (p. 190).</p>';
    html += '<button type="button" data-egalite="a">Le premier l’emporte</button>' +
      '<button type="button" data-egalite="b">Le second l’emporte</button>' +
      '<button type="button" data-egalite="relancer">Relancer les dés</button>' +
      '<span class="saisie-des" id="des-egalite" data-zone-des="egalite" data-decision="relancer"></span>';
    html += '</div>';
    return html;
  }

  function optionsParticipants(r, filtre) {
    return enJeuListe(r).filter(filtre || (() => true)).map(p => '<option value="' + esc(p.id) + '">' + esc(p.nom) + '</option>').join('');
  }
  function optionsArmes(r, acteur, type) {
    if (!acteur) return '';
    return acteur.armes.map(id => r.armes[id]).filter(a => a && a.type === type)
      .map(a => '<option value="' + esc(a.id) + '">' + esc(a.nom) + '</option>').join('');
  }

  function rendreAction(r) {
    const e = r.enAttente;
    if (!r.round && !r.ordre.length) {
      return '<h3>Rencontre composée</h3>' +
        '<p class="avis">Aucun round commencé. Lancez le round 1 (une surprise éventuelle se jouera en round 0).</p>' +
        '<span class="saisie-des" id="des-commencer" data-zone-des="commencer"></span>' +
        '<button type="button" id="commencer" class="principal">Commencer le round 1</button>';
    }
    let html = '';
    if (e) {
      if (e.type === 'egalite-init') html += rendreEgaliteInit(r, e);
      else if (e.type === 'inversion') html += rendreInversion(r, e);
      else if (e.type === 'egalite') html += rendreEgalite(r, e);
    }
    const acteur = R.acteurCourant(r);
    if (!acteur) return html || '<h3>—</h3>';
    html += '<h3>Au tour de ' + esc(acteur.nom) + '</h3>';
    const optsLoc = '<option value="">Aléatoire</option>' + LOCALISATIONS.map(l => '<option value="' + esc(l) + '">' + esc(LIBELLE_TOUCHE[l] || l) + '</option>').join('');
    const optsSup = (r.superiorite > 0 && !acteur.superioriteUtiliseeCeTour) ? '<label><input type="checkbox" id="%s"> Utiliser la supériorité</label>' : '';

    html += '<fieldset class="action-melee"><legend>Attaque de mêlée</legend>' +
      '<label>Arme <select id="melee-arme">' + optionsArmes(r, acteur, 'melee') + '</select></label>' +
      '<label>Cible <select id="melee-cible">' + optionsParticipants(r, p => p.camp !== acteur.camp) + '</select></label>' +
      '<label>Défense <select id="melee-defense">' + Object.entries(LIBELLE_DEFENSE_MELEE).map(([id, lib]) => '<option value="' + esc(id) + '">' + esc(lib) + '</option>').join('') + '</select></label>' +
      '<label>Localisation <select id="melee-localisation">' + optsLoc + '</select></label>' +
      '<label><input type="checkbox" id="melee-charge"> Charge</label>' +
      '<label><input type="checkbox" id="melee-retenir"> Retenir les coups</label>' +
      (optsSup ? optsSup.replace('%s', 'melee-superiorite') : '') +
      '<label>Avantages <input type="number" min="0" max="5" id="melee-avantages" value="0"></label>' +
      '<label>Désavantages <input type="number" min="0" max="5" id="melee-desavantages" value="0"></label>' +
      '<span class="saisie-des" id="des-melee" data-zone-des="melee"></span>' +
      '<button type="button" id="attaquer" class="principal">Attaquer</button></fieldset>';

    html += '<fieldset class="action-tir"><legend>Attaque à distance</legend>' +
      '<label>Arme <select id="tir-arme">' + optionsArmes(r, acteur, 'tir') + '</select></label>' +
      '<label>Mode <select id="tir-mode"></select></label>' +
      '<label>Cible <select id="tir-cible">' + optionsParticipants(r, p => p.camp !== acteur.camp) + '</select></label>' +
      '<label>Défense <select id="tir-defense"><option value="esquive">Esquive</option><option value="aucune">Aucune</option></select></label>' +
      '<label>Localisation <select id="tir-localisation">' + optsLoc + '</select></label>' +
      '<label><input type="checkbox" id="tir-retenir"> Retenir les coups</label>' +
      (optsSup ? optsSup.replace('%s', 'tir-superiorite') : '') +
      '<label>Avantages <input type="number" min="0" max="5" id="tir-avantages" value="0"></label>' +
      '<label>Désavantages <input type="number" min="0" max="5" id="tir-desavantages" value="0"></label>' +
      '<span class="saisie-des" id="des-tir" data-zone-des="tir"></span>' +
      '<button type="button" id="tirer" class="principal">Tirer</button></fieldset>';

    html += '<fieldset class="action-tactiques"><legend>Actions tactiques</legend>' +
      '<button type="button" data-action="viser">Viser</button>' +
      '<button type="button" data-action="esquiver">Esquiver</button>' +
      '<label>Couvert <select id="tactique-couvert">' + Object.entries(LIBELLE_COUVERT).map(([id, lib]) => '<option value="' + esc(id) + '">' + esc(lib) + '</option>').join('') + '</select></label>' +
      '<button type="button" data-action="se-couvrir">Se mettre à couvert</button>' +
      '<button type="button" data-action="se-desengager">Se désengager</button>' +
      '<button type="button" data-action="prendre-initiative">Prendre l’initiative</button>' +
      '<label>Recharger <select id="tactique-recharger">' + acteur.armes.map(id => r.armes[id]).filter(a => a && a.type === 'tir' && a.chargeur).map(a => '<option value="' + esc(a.id) + '">' + esc(a.nom) + '</option>').join('') + '</select></label>' +
      '<button type="button" data-action="recharger">Recharger</button>' +
      '<label>Aider <select id="tactique-aider">' + optionsParticipants(r, p => p.camp === acteur.camp && p.id !== acteur.id) + '</select></label>' +
      '<button type="button" data-action="aider">Aider</button>' +
      '<button type="button" data-action="fuir">Fuir</button></fieldset>';

    html += '<fieldset class="action-soins"><legend>Premiers soins</legend>' +
      '<label>Cible <select id="soins-cible">' + optionsParticipants(r) + '</select></label>' +
      '<label>Mode <select id="soins-mode"><option value="soin">Soin</option><option value="critique">Traiter une critique</option></select></label>' +
      '<label>Compétence <select id="soins-competence">' + optionsCompetences(acteur) + '</select></label>' +
      '<span class="saisie-des" id="des-soins" data-zone-des="soins"></span>' +
      '<button type="button" id="soigner" class="principal">Soigner</button></fieldset>';

    html += '<fieldset class="action-fin"><legend>Fin de tour</legend>' +
      '<span class="saisie-des" id="des-tour" data-zone-des="tour"></span>' +
      '<button type="button" id="fin-tour" class="principal">Passer le tour</button></fieldset>';
    return html;
  }

  function rendreOutils(r) {
    const quiOpts = enJeuListe(r).map(p => '<option value="' + esc(p.id) + '">' + esc(p.nom) + '</option>').join('');
    const diffOpts = Object.values(DIFFICULTES).map(d => '<option value="' + esc(d.id) + '"' + (d.id === 'intermediaire' ? ' selected' : '') + '>' + esc(d.libelle) + '</option>').join('');
    let html = '<fieldset class="outil-libre"><legend>Test libre</legend>' +
      '<label>Qui <select id="libre-qui">' + quiOpts + '</select></label>' +
      '<label>Compétence <select id="libre-competence"></select></label>' +
      '<label>Difficulté <select id="libre-difficulte">' + diffOpts + '</select></label>' +
      '<label>Avantages <input type="number" min="0" max="5" id="libre-avantages" value="0"></label>' +
      '<label>Désavantages <input type="number" min="0" max="5" id="libre-desavantages" value="0"></label>' +
      (r.superiorite > 0 ? '<label><input type="checkbox" id="libre-superiorite"> Utiliser la supériorité</label>' : '') +
      '<span class="saisie-des" id="des-libre" data-zone-des="libre"></span>' +
      '<button type="button" id="libre-lancer" class="principal">Lancer le test</button></fieldset>';
    html += '<fieldset class="outil-oppose"><legend>Test opposé</legend>' +
      '<label>A <select id="oppose-a">' + quiOpts + '</select></label>' +
      '<label>Compétence A <select id="oppose-a-comp"></select></label>' +
      '<label>DR A <input type="number" min="-5" max="5" id="oppose-a-dr" value="0"></label>' +
      '<label>B <select id="oppose-b">' + quiOpts + '</select></label>' +
      '<label>Compétence B <select id="oppose-b-comp"></select></label>' +
      '<label>DR B <input type="number" min="-5" max="5" id="oppose-b-dr" value="0"></label>' +
      '<label>Difficulté <select id="oppose-difficulte">' + diffOpts + '</select></label>' +
      '<span class="saisie-des" id="des-oppose" data-zone-des="oppose"></span>' +
      '<button type="button" id="oppose-lancer" class="principal">Lancer le test opposé</button></fieldset>';
    return html;
  }

  function rendreJournal() {
    const r = rencontre();
    const ol = $('#journal');
    if (!ol || !r) return;
    const filtre = ui.filtreRound;
    ol.innerHTML = r.journal.map((l, i) => {
      if (filtre !== 0 && l.round !== filtre) return '';
      return '<li class="j-' + esc(l.type || 'action') + '" data-i="' + i + '"><span class="r">R' + l.round + '</span> ' + esc(l.texte) + '</li>';
    }).join('');
    ol.scrollTop = ol.scrollHeight;
  }

  // --- Rendu : jouer ----------------------------------------------------------------------------------------------------

  function rendreJouer() {
    const panneau = $('#panneau-jouer');
    const r = rencontre();
    if (!r) {
      panneau.innerHTML = `<section class="carte"><h2>Aucune rencontre en cours</h2>
        <p>Composez une rencontre depuis la réserve, dans l’onglet Préparer.</p>
        <p><button type="button" class="principal" data-onglet="preparer">Aller à Préparer</button></p></section>`;
      return;
    }
    // On mémorise les dés saisis (hors champs consommés par la dernière action) avant de tout re-rendre.
    const presets = new Map();
    panneau.querySelectorAll('[data-zone-des]').forEach(zone => {
      const m = new Map();
      zone.querySelectorAll('input[data-champ-des]').forEach(el => {
        if (el.value.trim() !== '' && !champsAVider.has(el.id)) m.set(el.dataset.cle, el.value.trim());
      });
      presets.set(cleZone(zone), m);
    });
    const gardees = garderChamps(panneau);
    for (const id of champsAVider) gardees.delete(id);
    champsAVider.clear();

    const optionsFiltre = ['<option value="0"' + (ui.filtreRound === 0 ? ' selected' : '') + '>Tous les rounds</option>',
      '<option value="-1"' + (ui.filtreRound === -1 ? ' selected' : '') + '>Avant le combat</option>'];
    for (let n = 1; n <= r.round; n++) optionsFiltre.push('<option value="' + n + '"' + (ui.filtreRound === n ? ' selected' : '') + '>Round ' + n + '</option>');

    panneau.innerHTML = `
      <section class="carte" id="carte-etat" aria-labelledby="t-etat">
        <h2 id="t-etat">État de la rencontre</h2>
        ${rendreSuperiorite(r)}
        ${rendreZones(r)}
        ${rendreParticipants(r)}
      </section>
      <section class="carte" id="carte-action" aria-labelledby="t-action">
        <h2 id="t-action">Action</h2>
        <div id="action">${rendreAction(r)}</div>
        <p class="barre fin"><button type="button" data-action="terminer-rencontre" title="Reporte blessures, critiques, Destin et états des PJ sur la réserve (p. 214-215, 220)">Terminer la rencontre</button>
        <button type="button" data-action="abandonner-rencontre" title="Sans rien reporter sur la réserve">Abandonner la rencontre</button></p>
        <hr>
        <div class="outils">${rendreOutils(r)}</div>
      </section>
      <section class="carte" id="carte-journal" aria-labelledby="t-journal">
        <h2 id="t-journal">Journal</h2>
        <label>Afficher <select id="filtre-round">${optionsFiltre.join('')}</select></label>
        <ol id="journal"></ol>
      </section>`;

    for (const id of ['libre-qui', 'oppose-a', 'oppose-b']) {
      const v = gardees.get(id);
      const el = panneau.querySelector('#' + CSS.escape(id));
      if (v !== undefined && el && [...el.options].some(o => o.value === v)) el.value = v;
    }
    majCompetences('#libre-qui', '#libre-competence');
    majCompetences('#oppose-a', '#oppose-a-comp');
    majCompetences('#oppose-b', '#oppose-b-comp');
    rendreChamps(panneau, gardees);
    majModesTir();
    majDesZones(presets);
    ajouterBoutonsLancer(panneau);
    rendreJournal();
    if (r.enAttente) {
      panneau.querySelectorAll('button').forEach(b => {
        if (!b.closest('.inversion') && !b.closest('.egalite')) b.disabled = true;
      });
    }
  }

  // --- Rendu : en-tête, onglets, fichiers -------------------------------------------------------------------------------

  const rendreFichiers = () => { $('#versions').hidden = !ui.versions; };

  async function rendreVersions() {
    const liste = await seance.versions();
    const libelles = { 'avant-import': 'avant un import', 'avant-effacement': 'avant un effacement', 'avant-restauration': 'avant une restauration', illisible: 'sauvegarde illisible' };
    $('#versions').innerHTML = liste.length
      ? `<ul>${liste.map(v => `<li>${new Date(v.createdAt).toLocaleString('fr-FR')} — ${esc(libelles[v.reason] ?? v.reason)}
          <button type="button" data-action="restaurer" data-id="${esc(v.id)}">Restaurer</button></li>`).join('')}</ul>`
      : '<p>Aucune version précédente.</p>';
  }

  // --- Liaison avec RPG Map Display -------------------------------------------------------------------------------------
  // Même canal et même protocole que Warhammer/Cthulhu (js/core/map-link-protocol.js) ; la projection des pions est
  // celle d'Imperium (projection-carte.js, lot I5). L'indicateur et le compte « À poser » sont créés ici, à côté de
  // l'état de la sauvegarde.

  function indicateurCarte() {
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
    carte?.refresh?.();
    const r = rencontre();
    $('#round').textContent = !r ? 'Aucune rencontre'
      : (r.round === 0 && !r.ordre.length) ? 'Avant le combat'
      : r.roundSurprise ? 'Round 0 (surprise)'
      : `Round ${r.round}`;
    $('#superiorite-entete').textContent = `Supériorité : ${r ? r.superiorite : 0}`;
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

  // --- Événements -------------------------------------------------------------------------------------------------------

  /** Action tactique sans dé : on joue tout de suite pour l'acteur courant. */
  const tactique = (type, fn) => jouer(type, s => fn(s, R.acteurCourant(s)?.id));

  document.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.onglet) { ui.onglet = b.dataset.onglet; return rendre(); }
    const id = b.dataset.id;
    if (b.dataset.egaliteInit) {
      const gagnant = b.dataset.egaliteInit;
      return jouerSaisi('egalite-init', (s, d) => R.resoudreEgaliteInitiative(s, gagnant, d), champsDeZone($('#des-egalite-init-' + gagnant)));
    }
    if (b.dataset.inversion) {
      const oid = b.dataset.inversion;
      const zone = b.parentElement?.querySelector('.saisie-des');
      return jouerSaisi('inversion', (s, d) => R.choisirInversion(s, oid, d), zone ? champsDeZone(zone) : []);
    }
    if (b.dataset.egalite) {
      const decision = b.dataset.egalite;
      const champs = decision === 'relancer' ? champsDeZone($('#des-egalite')) : [];
      return jouerSaisi('egalite', (s, d) => R.trancherEgalite(s, decision, d), champs);
    }
    switch (b.dataset.action ?? b.id) {
      case 'composer': return composer();
      case 'nouveau-profil': ui.edition = { cible: 'profil', id: null }; return rendre();
      case 'modifier-profil': ui.edition = { cible: 'profil', id }; return rendre();
      case 'nouvelle-arme': ui.edition = { cible: 'arme', id: null }; return rendre();
      case 'modifier-arme': ui.edition = { cible: 'arme', id }; return rendre();
      case 'fermer-formulaire': ui.edition = null; return rendre();
      case 'supprimer-profil': return confirmer(b, 'Confirmer la suppression', () => agir('profil-supprime', etat => ({ ...etat, reserve: supprimerProfil(etat.reserve, id) })));
      case 'supprimer-arme': return agir('arme-supprimee', etat => ({ ...etat, reserve: supprimerArme(etat.reserve, id) }));
      case 'ajouter-zone': {
        const zones = zonesActuelles();
        let n = zones.length + 1;
        while (zones.some(z => z.id === `zone-${n}`)) n++;
        ui.zones = [...zones, { id: `zone-${n}`, nom: `Zone ${n}`, traits: [] }];
        return rendre();
      }
      case 'supprimer-zone': {
        const zones = zonesActuelles();
        if (zones.length <= 1) return;
        ui.zones = zones.filter(z => z.id !== id);
        for (const [pid, c] of Object.entries(ui.compo)) if (c.zoneId === id) ui.compo[pid] = { ...c, zoneId: null };
        return rendre();
      }
      case 'terminer-rencontre': return agir('fin-rencontre', etat => ({ reserve: R.reporterSurReserve(etat.reserve, etat.rencontre), rencontre: null }));
      case 'abandonner-rencontre': return confirmer(b, 'Confirmer : rien n’est reporté', () => { ui.onglet = 'preparer'; agir('abandon-rencontre', etat => ({ ...etat, rencontre: null })); });
      case 'annuler': if (seance.annuler()) rendre(); return;
      case 'retablir': if (seance.retablir()) rendre(); return;
      case 'exporter': return exporter();
      case 'versions': ui.versions = !ui.versions; rendre(); if (ui.versions) rendreVersions(); return;
      case 'restaurer': return seance.restaurer(id).then(() => { ui.versions = false; rendre(); message('Version précédente restaurée.'); }, e => message(e.message, 'erreur'));
      case 'effacer': return confirmer(b, 'Confirmer : repartir de la réserve de départ', async () => {
        await seance.effacer(); ui.edition = null; ui.compo = {}; ui.zones = null; ui.onglet = 'preparer';
        ui.superiorite = 0; ui.surprise = ''; ui.filtreRound = 0;
        rendre();
        message('Séance effacée. L’ancienne reste dans « Versions précédentes ».'); });
      case 'importer': return $('#fichier-import').click();
      // --- Onglet Jouer ---
      case 'superiorite-moins': return jouer('superiorite', s => R.ajusterSuperiorite(s, -1, 'ajustement MJ'));
      case 'superiorite-plus': return jouer('superiorite', s => R.ajusterSuperiorite(s, 1, 'ajustement MJ'));
      case 'engager': return jouer('engagement', s => R.engager(s, $('#engager-a').value, $('#engager-b').value));
      case 'desengager': return jouer('desengagement', s => R.desengager(s, b.dataset.a, b.dataset.b));
      case 'ajouter-etat': {
        const selNiv = $('#etat-niveau-' + id);
        const niveau = selNiv && !selNiv.hidden ? selNiv.value : 'mineur';
        return jouer('etat', s => R.appliquerEtat(s, { id, etat: $('#etat-add-' + id).value, niveau }));
      }
      case 'retirer-etat': return jouer('etat', s => R.retirerEtat(s, { id, etat: b.dataset.etat }));
      case 'traiter-critique': {
        const cible = $('#soins-cible');
        if (cible) cible.value = id;
        const mode = $('#soins-mode');
        if (mode) mode.value = 'critique';
        majDesZones();
        return jouerSaisi('soins', (s, d) => R.traiterCritique(s, { id: R.acteurCourant(s)?.id, cibleId: id }, d), champsDeZone($('#des-soins')));
      }
      case 'depenser-destin':
        return jouerSaisi('destin', (s, d) => R.depenserDestin(s, id, $('#destin-effet-' + id).value, paramsDestin(id), d), champsDeZone($('#des-destin-' + id)));
      case 'bruler-destin': {
        const effet = $('#destin-brule-' + id).value;
        let params = {};
        if (effet === 'pourEmpereur') {
          const r = validerEntier($('#destin-jet-' + id).value, { min: 1, max: 100, libelle: 'Jet de dé pour l’Empereur' });
          if (!r.ok) return bloquerSaisie($('#destin-jet-' + id), r.message);
          params = { jet: r.valeur };
        }
        return jouer('destin-brule', s => R.brulerDestin(s, id, effet, params));
      }
      case 'commencer': return jouerSaisi('commencer', (s, d) => R.commencerRound(s, { des: d }), champsDeZone($('#des-commencer')));
      case 'attaquer': return jouerSaisi('attaque-melee', (s, d) => R.attaquerMelee(s, paramsMelee(), d), champsDeZone($('#des-melee')));
      case 'tirer': return jouerSaisi('attaque-distance', (s, d) => R.attaquerDistance(s, paramsTir(), d), champsDeZone($('#des-tir')));
      case 'fin-tour': return jouerSaisi('tour', (s, d) => R.passerTour(s, d), champsDeZone($('#des-tour')));
      case 'soigner': return jouerSaisi('soins', (s, d) => R.premiersSoins(s, paramsSoins(), d), champsDeZone($('#des-soins')));
      case 'libre-lancer': return jouerSaisi('test-libre', (s, d) => R.testLibre(s, paramsLibre(), d), champsDeZone($('#des-libre')));
      case 'oppose-lancer': return jouerSaisi('test-oppose', (s, d) => R.testOppose(s, paramsOppose(), d), champsDeZone($('#des-oppose')));
      case 'viser': return tactique('viser', (s, acteurId) => R.viser(s, { id: acteurId }));
      case 'esquiver': return tactique('esquiver', (s, acteurId) => R.esquiver(s, { id: acteurId }));
      case 'se-couvrir': return tactique('couvert', (s, acteurId) => R.seMettreACouvert(s, { id: acteurId, couvert: $('#tactique-couvert').value }));
      case 'se-desengager': return tactique('desengagement', (s, acteurId) => R.seDesengager(s, { id: acteurId, cibleId: null }));
      case 'prendre-initiative': return tactique('initiative', (s, acteurId) => R.prendreInitiative(s, { id: acteurId }));
      case 'recharger': return tactique('recharger', (s, acteurId) => R.recharger(s, { id: acteurId, armeId: $('#tactique-recharger').value }));
      case 'aider': return tactique('aider', (s, acteurId) => R.aider(s, { id: acteurId, cibleId: $('#tactique-aider').value }));
      case 'fuir': return confirmer(b, 'Confirmer la fuite', () => tactique('fuir', (s, acteurId) => R.fuir(s, { id: acteurId })));
      default:
    }
  });

  document.addEventListener('change', ev => {
    const el = ev.target;
    if (el.dataset?.compo) {
      const courant = ui.compo[el.dataset.compo] ?? { n: 0, zoneId: null };
      ui.compo[el.dataset.compo] = { ...courant, n: el.type === 'checkbox' ? Number(el.checked) : Math.max(0, Math.min(9, Number(el.value) || 0)) };
    } else if (el.dataset?.compoZone) {
      const courant = ui.compo[el.dataset.compoZone] ?? { n: 0, zoneId: null };
      ui.compo[el.dataset.compoZone] = { ...courant, zoneId: el.value || null };
    } else if (el.dataset?.zoneNom) {
      ui.zones = zonesActuelles().map(z => (z.id === el.dataset.zoneNom ? { ...z, nom: el.value } : z));
      return rendre(); // les sélecteurs de zone doivent reflèter le nouveau nom
    } else if (el.id === 'superiorite-initiale') {
      ui.superiorite = el.value; // le plafonnement 0-3 est celui du moteur (p. 196)
    } else if (el.id === 'surprise') {
      ui.surprise = el.value;
    } else if (el.id === 'fichier-import') { importerFichier(el); return;
    } else if (el.id === 'filtre-round') {
      ui.filtreRound = Number(el.value) || 0;
      return rendreJournal();
    } else if (el.dataset?.zoneP) {
      return jouer('deplacer-zone', s => R.deplacerZone(s, el.dataset.zoneP, el.value));
    } else if (el.dataset?.traitsZone) {
      return jouer('traits-zone', s => R.definirTraitsZone(s, el.dataset.traitsZone, lireTraits(el.value)));
    } else if (el.id === 'tir-arme') {
      majModesTir(); majDesZones(); return;
    } else if (el.dataset?.destinBrule) {
      const jet = $('#destin-jet-' + el.dataset.destinBrule);
      if (jet) jet.hidden = el.value !== 'pourEmpereur';
      return;
    } else if (el.dataset?.destinEffet) {
      const sel = $('#destin-etat-' + el.dataset.destinEffet);
      if (sel) sel.hidden = el.value !== 'retirerEtat';
      majDesZones(); return;
    } else if (el.dataset?.etatAdd) {
      const def = ETATS.find(e => e.id === el.value);
      const niv = $('#etat-niveau-' + el.dataset.etatAdd);
      if (niv) niv.hidden = !(def && def.niveaux);
      return;
    } else if (['libre-qui', 'oppose-a', 'oppose-b'].includes(el.id)) {
      majCompetences('#' + el.id, '#' + el.id + '-comp');
      majDesZones(); return;
    } else if (el.closest?.('#panneau-jouer')) {
      majDesZones(); return;
    }
  });
  document.addEventListener('input', ev => {
    if (ev.target.closest?.('#form-profil')) return majDerives();
    if (ev.target.closest?.('#panneau-jouer')) majDesZones();
  });
  document.addEventListener('submit', ev => {
    ev.preventDefault();
    if (ev.target.id === 'form-profil') enregistrerProfil(ev.target);
    else if (ev.target.id === 'form-arme') enregistrerArme(ev.target);
  });

  // --- Menu Fichiers ----------------------------------------------------------------------------------------------------

  function exporter() {
    const blob = new Blob([JSON.stringify(seance.exporter(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imperium-sauvegarde-${new Date().toISOString().split('T')[0]}.json`;
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
        ui.edition = null; ui.compo = {}; ui.zones = null;
        ui.superiorite = 0; ui.surprise = ''; ui.filtreRound = 0;
        rendre();
        message(`Sauvegarde chargée : ${bilan.profils} profil(s), ${bilan.armes} arme(s)${bilan.rencontre ? ', rencontre en cours' : ''}. La séance précédente reste dans « Versions précédentes ».`);
      } catch (erreur) { message(`Sauvegarde non chargée : ${erreur.message}`, 'erreur'); }
    };
    lecteur.readAsText(fichier);
    input.value = '';
  }

  // --- Démarrage --------------------------------------------------------------------------------------------------------

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

if (typeof document !== 'undefined' && document.getElementById('imperium-app')) lancerInterface();
