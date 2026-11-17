/**
 * Panneau « Traits optionnels » du profil de Réserve (chantier des Traits optionnels, lot L6) : une case par Trait, dressage, attaque et
 * pièce d'armure optionnels de la fiche du bestiaire, le bouton « Ajouter un Trait » (catalogue des Traits, D3), et les valeurs
 * imprimée → modifiée (CA9). Chaque changement est une commande annulable du Store (`setProfileOptionalChoices`, appelée avec `?.`).
 * Tout profil sauf les PJ (D25) ; sans fiche de bestiaire, seul « Ajouter un Trait » apparaît (CA2).
 */
import { CREATURE_TRAIT_CATALOGUE } from '../data/creature-trait-catalogue.js';
import { addFreeTrait, applyOptionalChoices, optionalCandidates, readOptionalChoices, toggleOptionalArmour, toggleOptionalAttack, toggleOptionalTrait } from '../core/optional-traits.js';
import { isMountCandidate } from '../core/mounts.js';
import { cloneValue } from '../core/models.js';
import { normalizeSearchText } from '../core/sanitize.js';
import { contextMessage, refusalError } from './messages.js';

const el = (tag, text, className = '') => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
const PARAM_HINT = Object.freeze({ rating: 'Indice (par exemple 2)', size: 'Taille (Petite, Moyenne, Grande, Énorme, Monstrueuse)', trained: 'Dressage (Guerre, Monture, Magie…)', hatred: 'Cible de la Haine (par exemple les Elfes)', text: 'Précision (facultative)' });
const MAX_RESULTS = 30;

/** Profils de Réserve proposables comme monture parce que le MJ a coché « Dressé (Monture) » (CA14, D24), filtrés par nom. */
export function reserveMountCandidates(profiles, { search = '', excludeId = null } = {}) {
  const wanted = normalizeSearchText(search || '');
  return (Array.isArray(profiles) ? profiles : []).filter(profile => profile && profile.kind !== 'PJ' && profile.id !== excludeId && !profile.extensions?.mountFor
    && isMountCandidate({ extensions: profile.extensions }) && (!wanted || normalizeSearchText(profile.name || '').includes(wanted)));
}

/** Profil type d'une monture prise dans la Réserve : copie du profil avec ses coches, sans identité ni lien de cavalier (D24). */
export function mountTemplateFromProfile(profile) {
  const { id, favorite, group, ...template } = cloneValue(profile);
  const { mountFor, ...extensions } = template.extensions || {};
  const { declaredMount, ownMountId, mountOf, mounted, mountId, ...v5 } = extensions.v5 || {};
  return { ...template, extensions: { ...extensions, v5 } };
}

// Fiche minimale d'un profil sans fiche de bestiaire : ses Traits imprimés servent à ne pas proposer un Trait en double (CA19, D18) ni
// Meneur sur une créature Bestial (D17, D26). Un profil rangé par le Store les porte dans `extensions.traits`.
const printedTraitsOf = profile => (Array.isArray(profile?.traits) ? profile.traits : Array.isArray(profile?.extensions?.traits) ? profile.extensions.traits : []);
const plainRecord = profile => ({ traits: printedTraitsOf(profile).map(trait => {
  const text = typeof trait === 'string' ? trait : trait?.name ?? '';
  const found = /^\s*([^(]+?)\s*(?:\(([^)]*)\))?\s*$/.exec(text);
  return found ? { name: found[1], param: found[2] || undefined } : { name: text };
}) });

/**
 * `loadRecord(profile)` rend la fiche du bestiaire du profil (ou null), de façon synchrone ou non. `setSubject(profile)` ouvre le panneau
 * pour un profil (null le masque) ; `refresh()` le redessine d'après le Store (annulation, rechargement).
 */
export function createOptionalTraitsPanel({ Store, loadRecord = () => null } = {}) {
  const element = el('div', null, 'optional-traits'); element.id = 'form-optional-traits'; element.hidden = true;
  const title = el('div', 'Traits optionnels (rencontres suivantes seulement)', 'muted');
  const cases = el('div', null, 'optional-traits-cases');
  const changes = el('div', null, 'optional-traits-changes');
  const message = el('p', '', 'optional-traits-message'); message.dataset.optionalMessage = ''; message.setAttribute('role', 'alert'); message.setAttribute('aria-live', 'assertive');
  const add = el('button', 'Ajouter un Trait', 'ghost tiny optional-traits-add'); add.type = 'button'; add.dataset.optionalAdd = '';
  const dialog = el('div', null, 'optional-traits-dialog'); dialog.dataset.optionalDialog = ''; dialog.hidden = true; dialog.setAttribute('role', 'group'); dialog.setAttribute('aria-label', 'Ajouter un Trait');
  const search = el('input'); search.type = 'search'; search.dataset.optionalSearch = ''; search.placeholder = 'Chercher un Trait (nom français ou anglais)'; search.setAttribute('aria-label', 'Chercher un Trait dans le catalogue');
  const results = el('div', null, 'optional-traits-results');
  const chosen = el('div', null, 'muted'); chosen.setAttribute('aria-live', 'polite');
  const param = el('input'); param.dataset.optionalParam = ''; param.hidden = true; param.setAttribute('aria-label', 'Valeur du Trait');
  const confirm = el('button', 'Ajouter', 'tiny'); confirm.type = 'button'; confirm.dataset.optionalConfirm = '';
  const close = el('button', 'Fermer', 'ghost tiny'); close.type = 'button'; close.dataset.optionalClose = '';
  const controls = el('div', null, 'row'); controls.append(confirm, close);
  dialog.append(search, results, chosen, param, controls);
  element.append(title, cases, changes, message, add, dialog);

  let subjectId = null, record = null, picked = null, token = 0;
  const say = text => { message.textContent = text || ''; message.hidden = !text; };
  const profileNow = () => (subjectId ? Store?.getProfile?.(subjectId) ?? null : null);
  const choicesNow = () => readOptionalChoices(profileNow());
  const recordNow = profile => record || plainRecord(profile);

  function closeDialog() { dialog.hidden = true; picked = null; param.hidden = true; param.value = ''; chosen.textContent = ''; search.value = ''; results.replaceChildren(); add.focus(); }

  // Enregistre les coches par la commande du Store ; une erreur ou un refus est dit en français et le panneau revient à l'état enregistré.
  async function commit(choices) {
    if (typeof Store?.setProfileOptionalChoices !== 'function') { say('Traits optionnels indisponibles dans cette version.'); await render(); return false; }
    try {
      const result = await Store.setProfileOptionalChoices?.(subjectId, choices, { expectedLocalRevision: Store.getLocalRevision?.() });
      if (result === false || result?.ok === false) throw refusalError(result, 'Traits optionnels');
      say('');
      await render();
      return true;
    } catch (error) {
      say(contextMessage('Traits optionnels non enregistrés', error, 'réessayez.'));
      await render();
      return false;
    }
  }

  async function toggle(entry) {
    const profile = profileNow(), choices = choicesNow(), source = recordNow(profile);
    const result = entry.kind === 'attack' ? toggleOptionalAttack(source, choices, entry.name)
      : entry.kind === 'armour' ? toggleOptionalArmour(source, choices, entry.name) : toggleOptionalTrait(source, choices, entry.key);
    if (!result.ok) { say(result.error); await render(); return; }
    await commit(result.choices);
  }

  function renderCases(profile) {
    const rows = optionalCandidates(recordNow(profile), choicesNow()).map(entry => {
      const box = el('input'); box.type = 'checkbox'; box.dataset.optionalKey = entry.key; box.checked = entry.checked; box.disabled = entry.disabled;
      box.addEventListener('change', () => toggle({ ...entry, checked: box.checked }));
      const label = el('label', null, 'optional-traits-case');
      const note = entry.disabled ? ` — ${entry.reason}` : entry.origin === 'free' ? ' (ajouté : décocher pour le retirer)' : '';
      label.append(box, ` ${entry.label}${note}`);
      return label;
    });
    cases.replaceChildren(...rows);
  }

  // Valeur imprimée → valeur modifiée de chaque champ changé (CA9) ; les points signalés par le moteur suivent.
  function renderChanges(profile) {
    const { changes: list, notes } = applyOptionalChoices(profile);
    const lines = list.map(change => {
      const line = el('div', `${change.field} : ${change.printed ?? '—'} → ${change.effective}${change.source ? ` (${change.source})` : ''}`, 'optional-traits-change');
      line.dataset.optionalChange = String(change.field);
      return line;
    });
    for (const note of notes) { const line = el('div', note, 'muted'); line.dataset.optionalNote = ''; lines.push(line); }
    changes.replaceChildren(...lines);
  }

  // Catalogue : nom français ou anglais ; un Trait déjà sur le profil ou refusé sur une créature Bestial n'est pas proposé (CA19, D17).
  function renderResults() {
    const wanted = normalizeSearchText(search.value || '');
    const profile = profileNow(), source = recordNow(profile), choices = choicesNow();
    const found = CREATURE_TRAIT_CATALOGUE.filter(entry => (!wanted || [entry.name, entry.nameFr].some(name => normalizeSearchText(name || '').includes(wanted)))
      && !(entry.param === 'none' && (() => { const probe = addFreeTrait(source, choices, entry.name, ''); return !probe.ok && /déjà sur ce profil|Bestial/.test(probe.error); })())).slice(0, MAX_RESULTS);
    results.replaceChildren(...(found.length ? found.map(entry => {
      const pick = el('button', entry.nameFr === entry.name ? entry.name : `${entry.nameFr} (${entry.name})`, 'ghost tiny'); pick.type = 'button'; pick.dataset.optionalPick = entry.name;
      pick.addEventListener('click', () => {
        picked = entry; say('');
        chosen.textContent = `Trait choisi : ${entry.nameFr || entry.name}`;
        param.hidden = entry.param === 'none'; param.value = ''; param.placeholder = PARAM_HINT[entry.param] || '';
        param.setAttribute('aria-label', `Valeur du Trait ${entry.nameFr || entry.name}`);
        if (!param.hidden) param.focus();
      });
      return pick;
    }) : [el('span', 'Aucun Trait à ajouter.', 'muted')]));
  }

  async function render() {
    const profile = profileNow();
    element.hidden = !profile || profile.kind === 'PJ';
    if (element.hidden) return;
    renderCases(profile);
    renderChanges(profile);
  }

  add.addEventListener('click', () => { dialog.hidden = false; say(''); renderResults(); search.focus(); });
  search.addEventListener('input', renderResults);
  // Le panneau est dans le formulaire du profil : Entrée ne doit pas l'enregistrer.
  for (const field of [search, param]) field.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); if (field === param) confirm.click(); } });
  close.addEventListener('click', closeDialog);
  confirm.addEventListener('click', async () => {
    if (!picked) { say('Choisissez d’abord un Trait dans la liste.'); return; }
    const result = addFreeTrait(recordNow(profileNow()), choicesNow(), picked.name, param.value);
    if (!result.ok) { say(result.error); return; }
    if (await commit(result.choices)) closeDialog();
  });

  return {
    element,
    async setSubject(profile) {
      const mine = ++token;
      subjectId = profile?.id || null;
      record = null; picked = null; dialog.hidden = true; say('');
      if (subjectId && profile.kind !== 'PJ') {
        try { const loaded = await loadRecord(profile); if (mine === token) record = loaded || null; } catch { if (mine === token) record = null; }
      }
      if (mine === token) await render();
    },
    refresh: render
  };
}
