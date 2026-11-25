/**
 * Page d’Imperium Maledictum (lot I7a du chantier multi-jeux) : socle d’interface, écran Préparer
 * (réserve de profils, armes, composition de la rencontre), menu Fichiers, et un récapitulatif
 * minimal de l’onglet Jouer (l’écran de jeu complet arrive en I7b).
 *
 * Aucune règle n’est récodée ici : tout passe par les modules du moteur `imperium/` (`seance.js`,
 * `profils.js`, `regles.js`, `rencontre.js`). La séance, la persistance et l’historique viennent de
 * `seance.js` (lot I6) ; la coquille HTML/CSS est `index.html` / `imperium.css`.
 *
 * Imports : uniquement `imperium/` et les modules communs du chapeau (liste gardée par
 * tests/unit/chapeau/modules-communs.test.mjs). Rien de Warhammer. Le nom de la base et le préfixe des
 * clés viennent du registre `js/core/jeux.js` : aucune base ni clé `wfrp*` ni `cthulhu.*` n’est lue,
 * écrite ni supprimée. Interface et messages en français ; yards = mètres, même valeur.
 */
import { participantCamp } from '../js/core/participant-camp.js';
import { initSelecteurJeu } from '../js/ui/selecteur-jeu.js';
import { initThemeManager } from '../js/ui/theme.js';
import { creerSeance, remplacerProfil, lireCompetences, ecrireCompetences } from './seance.js';
import {
  KINDS, CAMPS, TYPES_ARME, ajouterArme, modifierArme, supprimerArme,
  ajouterProfil, supprimerProfil, normaliserProfil, valeursDerivees, idDepuisNom, trouverProfil
} from './profils.js';
import { CARACS, PORTEES, VITESSES, TAILLES, ROLES_PNJ, ETATS } from './regles.js';
import { composerRencontre, reporterSurReserve } from './rencontre.js';

/** Libellés français des localisations d'armure (p. 211, 316). */
const LIBELLE_LOCALISATION = Object.freeze({ tete: 'Tête', bras: 'Bras', brasG: 'Bras G', brasD: 'Bras D', corps: 'Corps', jambe: 'Jambes', jambeG: 'Jambe G', jambeD: 'Jambe D' });

const LIBELLE_KIND = { PJ: 'Personnages-joueurs', PNJ: 'PNJ / Bestiaire' };
const LIBELLE_CAMP = { pj: 'PJ', ennemi: 'ennemi', neutre: 'neutre' };
const LIBELLE_ROLE = { troupe: 'Troupe', elite: 'Élite', chef: 'Chef' };
const LIBELLE_PORTEE = { immediate: 'Immédiate', courte: 'Courte', moyenne: 'Moyenne', longue: 'Longue', extreme: 'Extrême' };
const LIBELLE_TAILLE = { minuscule: 'Minuscule', petite: 'Petite', moyenne: 'Moyenne', grande: 'Grande', enorme: 'Énorme', monstrueuse: 'Monstrueuse' };
const LIBELLE_VITESSE = { lente: 'Lente', normale: 'Normale', rapide: 'Rapide' };
const LIBELLE_TYPE_ARME = { melee: 'Mêlée', tir: 'Tir' };
const LIBELLE_ETAT = Object.fromEntries(ETATS.map(e => [e.id, e.libelle]));
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
  const ui = { onglet: 'preparer', edition: null, compo: {}, zones: null, surprise: '', versions: false };
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

  // --- Actions --------------------------------------------------------------------------------------------------------

  const rencontre = () => seance.etat.rencontre;

  /** Toute modification d'état passe par `seance.agir` (historique + sauvegarde) ; l'erreur éventuelle s'affiche. */
  function agir(type, fn) {
    const r = seance.agir(type, fn, null);
    if (r.erreur) message(`Impossible : ${r.erreur.message}`, 'erreur');
    rendre();
    return r;
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
    return `<form id="form-arme" class="formulaire" aria-label="${a ? `Modifier ${esc(a.nom)}` : 'Nouvelle arme'}">
      <h3>${a ? `Modifier ${esc(a.nom)}` : 'Nouvelle arme'}</h3>
      <div class="champs">
        <label>Nom <input type="text" name="nom" required value="${esc(a?.nom)}"></label>
        <label>Type <select name="type">${TYPES_ARME.map(t => `<option value="${t}"${(a?.type ?? 'melee') === t ? ' selected' : ''}>${LIBELLE_TYPE_ARME[t]}</option>`).join('')}</select></label>
        <label>Spécialisation <input type="text" name="specialisation" value="${esc(a?.specialisation)}" placeholder="Mêlée (Une main), Tir (Pistolet)…"></label>
        <label>Dégâts de base <input type="number" min="0" name="degatsBase" value="${a?.degatsBase ?? 0}"></label>
        <label><input type="checkbox" name="ajouteBF"${a?.ajouteBF ? ' checked' : ''}> ajoute le bonus de F (p. 128)</label>
        <label>Portée <select name="portee">${PORTEES.map(p => `<option value="${p}"${(a?.portee ?? 'moyenne') === p ? ' selected' : ''}>${LIBELLE_PORTEE[p]}</option>`).join('')}</select></label>
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
    const r = agir('composition', etat => ({ ...etat, rencontre: composerRencontre(etat.reserve, entrees, { zones, superioriteInitiale, surprise }) }));
    if (r.change) { ui.onglet = 'jouer'; rendre(); message('Rencontre composée.'); }
  }

  // --- Rendu : jouer (récapitulatif minimal en I7a ; écran complet en I7b) -------------------------------------------

  function rendreJouer() {
    const panneau = $('#panneau-jouer');
    const r = rencontre();
    if (!r) {
      panneau.innerHTML = `<section class="carte"><h2>Aucune rencontre en cours</h2>
        <p>Composez une rencontre depuis la réserve, dans l’onglet Préparer.</p>
        <p><button type="button" class="principal" data-onglet="preparer">Aller à Préparer</button></p></section>`;
      return;
    }
    const zones = r.zones.map(z => `<span class="zone">${esc(z.nom)}${(z.traits ?? []).length ? `<span class="traits">${esc(z.traits.join(', '))}</span>` : ''}</span>`).join(' ');
    const zoneDe = id => r.zones.find(z => z.id === id)?.nom ?? id;
    const lignes = r.participants.map(p => `<tr class="camp-${participantCamp({ camp: p.camp, kind: p.kind })}">
      <td><strong>${esc(p.nom)}</strong></td>
      <td><small>${p.kind === 'PJ' ? 'PJ' : LIBELLE_ROLE[p.role] ?? 'PNJ'} · ${LIBELLE_CAMP[p.camp] ?? p.camp} · zone ${esc(zoneDe(p.zoneId))} · Init ${p.initiative} · Blessures ${p.blessures}/${p.blessuresMax}</small></td>
    </tr>`).join('');
    panneau.innerHTML = `<section class="carte" aria-labelledby="t-rencontre"><h2 id="t-rencontre">Rencontre composée</h2>
      <p>Round ${r.round}${r.roundSurprise ? ' (surprise, p. 199)' : ''} · <span class="badge superiorite">Supériorité : ${r.superiorite}</span></p>
      <div class="zones">${zones}</div>
      <table><thead><tr><th>Participant</th><th>Détail</th></tr></thead><tbody>${lignes}</tbody></table>
      <p class="barre fin"><button type="button" data-action="terminer-rencontre" title="Reporte blessures, critiques, Destin et états des PJ sur la réserve (p. 214-215, 220)">Terminer la rencontre</button>
      <button type="button" data-action="abandonner-rencontre" title="Sans rien reporter sur la réserve">Abandonner la rencontre</button></p></section>`;
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

  /** Liaison avec RPG Map Display : point d’attente d’I7b, aucun lien en I7a. */
  function brancherCarte() {
    return null;
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

  // --- Événements -----------------------------------------------------------------------------------------------------

  document.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.onglet) { ui.onglet = b.dataset.onglet; return rendre(); }
    const id = b.dataset.id;
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
      case 'terminer-rencontre': return agir('fin-rencontre', etat => ({ reserve: reporterSurReserve(etat.reserve, etat.rencontre), rencontre: null }));
      case 'abandonner-rencontre': return confirmer(b, 'Confirmer : rien n’est reporté', () => { ui.onglet = 'preparer'; agir('abandon-rencontre', etat => ({ ...etat, rencontre: null })); });
      case 'annuler': if (seance.annuler()) rendre(); return;
      case 'retablir': if (seance.retablir()) rendre(); return;
      case 'exporter': return exporter();
      case 'versions': ui.versions = !ui.versions; rendre(); if (ui.versions) rendreVersions(); return;
      case 'restaurer': return seance.restaurer(id).then(() => { ui.versions = false; rendre(); message('Version précédente restaurée.'); }, e => message(e.message, 'erreur'));
      case 'effacer': return confirmer(b, 'Confirmer : repartir de la réserve de départ', async () => {
        await seance.effacer(); ui.edition = null; ui.compo = {}; ui.zones = null; ui.onglet = 'preparer'; rendre();
        message('Séance effacée. L’ancienne reste dans « Versions précédentes ».'); });
      case 'importer': return $('#fichier-import').click();
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
    } else if (el.id === 'superiorite-initiale') {
      ui.superiorite = el.value; // le plafonnement 0-3 est celui du moteur (p. 196)
    } else if (el.id === 'surprise') {
      ui.surprise = el.value;
    } else if (el.id === 'fichier-import') importerFichier(el);
  });
  document.addEventListener('input', ev => {
    if (ev.target.closest?.('#form-profil')) return majDerives();
  });
  document.addEventListener('submit', ev => {
    ev.preventDefault();
    if (ev.target.id === 'form-profil') enregistrerProfil(ev.target);
    else if (ev.target.id === 'form-arme') enregistrerArme(ev.target);
  });

  // --- Menu Fichiers --------------------------------------------------------------------------------------------------

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
        ui.edition = null; ui.compo = {}; ui.zones = null; rendre();
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

if (typeof document !== 'undefined' && document.getElementById('imperium-app')) lancerInterface();
