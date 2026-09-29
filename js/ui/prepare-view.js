import { createEncounter, normalizeEncounter, removeEncounterEntry, setEncounterEntry, duplicateEncounter, normalizeCamp, CAMP_LABELS } from '../core/encounters.js';
import { userMessage } from './messages.js';

const noop = () => {};
// Camp proposé selon le type du profil (Créature et types inconnus : ennemi).
const KIND_CAMPS = { PJ: 'pj', 'Créature': 'ennemi', PNJ: 'neutre' };

function makeField(label, value, type = 'text') {
  const wrapper = document.createElement('label'); wrapper.textContent = label;
  const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
  if (type !== 'textarea') input.type = type;
  input.value = value ?? ''; wrapper.appendChild(input); return { wrapper, input };
}

function makeSelect(label, options, value) {
  const wrapper = document.createElement('label'); wrapper.textContent = label;
  const input = document.createElement('select');
  options.forEach(([optionValue, text]) => input.append(new Option(text, optionValue)));
  input.value = value; wrapper.appendChild(input); return { wrapper, input };
}

/** E11 preparation view. All mutations leave through callbacks supplied by main. `hosted` : la fenêtre porte déjà le titre. */
export function initPrepareView({ mount, hosted = false, Store = null, encounter = null, persistentCharacters = [], callbacks = {} } = {}) {
  if (!mount || typeof mount.replaceChildren !== 'function') throw new TypeError('prepare-view nécessite un mount');
  const state = { draft: normalizeEncounter(encounter || createEncounter({ title: 'Nouvelle rencontre' })), error: '' };
  const onDraftChange = callbacks.onDraftChange || noop;
  const profiles = () => typeof callbacks.getProfiles === 'function' ? callbacks.getProfiles() : (typeof Store?.listProfiles === 'function' ? Store.listProfiles() : []);

  function fail(error, fallback = 'La rencontre n’a pas pu être modifiée : réessayez.') { state.error = userMessage(error, fallback); state.busy = false; render(); }
  // Titre ou notes tapés mais pas encore enregistrés : `change` n'arrive qu'à la sortie du champ.
  let typing = false;
  // Dernier enregistrement lancé : la fermeture l'attend s'il est encore en cours.
  let lastSave = Promise.resolve(true);
  // Chaque modification est enregistrée par main ; renvoie false si l'enregistrement a échoué.
  function emit() {
    typing = false;
    state.error = '';
    lastSave = (async () => {
      try { await onDraftChange(state.draft); return true; }
      catch (error) { fail(error); return false; }
    })();
    return lastSave;
  }

  function render() {
    mount.replaceChildren();
    const root = document.createElement('section'); root.className = 'prepare-view'; root.setAttribute('aria-label', 'Préparer une rencontre');
    if (!hosted) { const title = document.createElement('h2'); title.textContent = 'Préparer une rencontre'; root.appendChild(title); }
    if (state.error) { const error = document.createElement('p'); error.className = 'error'; error.setAttribute('role', 'alert'); error.textContent = state.error; root.appendChild(error); }
    const titleField = makeField('Titre', state.draft.title);
    const readTitle = () => { state.draft.title = titleField.input.value.trim() || 'Rencontre sans titre'; };
    titleField.input.addEventListener('input', () => { readTitle(); typing = true; });
    titleField.input.addEventListener('change', () => { readTitle(); void emit(); });
    const notesField = makeField('Notes', state.draft.notes, 'textarea');
    notesField.input.addEventListener('input', () => { state.draft.notes = notesField.input.value; typing = true; });
    notesField.input.addEventListener('change', () => { state.draft.notes = notesField.input.value; void emit(); });
    root.append(titleField.wrapper, notesField.wrapper);

    const add = document.createElement('div'); add.className = 'encounter-add-entry';
    const select = document.createElement('select'); select.setAttribute('aria-label', 'Profil');
    select.append(new Option('Ajouter un profil…', ''));
    profiles().forEach(profile => select.append(new Option(`${profile.name} (${profile.kind || 'Créature'})`, profile.id)));
    const quantity = makeField('Quantité', 1, 'number'); quantity.input.min = '1'; quantity.input.max = '99';
    const camp = makeSelect('Camp', Object.entries(CAMP_LABELS), 'neutre');
    const zone = makeSelect('Zone', [['bench', 'En attente'], ['active', 'Actif']], 'bench');
    // Le camp suit le type du profil choisi, sauf s'il a été choisi à la main.
    let campChosen = false;
    camp.input.addEventListener('change', () => { campChosen = true; });
    select.addEventListener('change', () => {
      const profile = profiles().find(candidate => candidate.id === select.value);
      if (profile && !campChosen) camp.input.value = KIND_CAMPS[profile.kind] || 'ennemi';
    });
    const addButton = document.createElement('button'); addButton.type = 'button'; addButton.textContent = 'Ajouter';
    addButton.addEventListener('click', () => {
      try { state.draft = setEncounterEntry(state.draft, select.value, { quantity: quantity.input.value, camp: camp.input.value, zone: zone.input.value }); void emit(); render(); }
      catch (error) { fail(error, select.value ? 'Profil non ajouté : réessayez.' : 'Choisissez un profil à ajouter.'); }
    });
    add.append(select, quantity.wrapper, camp.wrapper, zone.wrapper, addButton); root.appendChild(add);

    const list = document.createElement('ul'); list.className = 'encounter-composition';
    state.draft.entries.forEach(entry => {
      const item = document.createElement('li');
      const profile = profiles().find(candidate => candidate.id === entry.profileId);
      item.textContent = `${profile?.name || 'Profil supprimé'} ×${entry.quantity} · ${CAMP_LABELS[normalizeCamp(entry.camp, profile?.kind)]} · ${entry.zone === 'active' ? 'actif' : 'en attente'}`;
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Retirer'; remove.addEventListener('click', () => { state.draft = removeEncounterEntry(state.draft, entry.id); void emit(); render(); });
      item.append(' ', remove); list.appendChild(item);
    });
    root.appendChild(list);

    const characters = typeof Store?.listPersistentCharacters === 'function' ? Store.listPersistentCharacters() : persistentCharacters;
    const people = document.createElement('details'); people.className = 'prepare-persistent-characters';
    const peopleSummary = document.createElement('summary'); peopleSummary.textContent = `Personnages persistants (${characters.length})`; people.appendChild(peopleSummary);
    characters.forEach(character => {
      const row = document.createElement('div'); row.className = 'row';
      row.append(document.createTextNode(`${character.name || character.id} · PV ${character.hp ?? 0}`));
      if (typeof callbacks.onDeletePersistentCharacter === 'function') { const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger ghost small'; remove.textContent = 'Supprimer'; remove.addEventListener('click', async () => { remove.disabled = true; try { await callbacks.onDeletePersistentCharacter(character.id); render(); } catch (cause) { fail(cause, 'Personnage non supprimé : réessayez.'); } }); row.appendChild(remove); }
      people.appendChild(row);
    });
    if (typeof callbacks.onSavePersistentCharacter === 'function') {
      const personForm = document.createElement('form'); personForm.className = 'row';
      personForm.innerHTML = '<input name="name" placeholder="Nom du personnage" required><input name="hp" type="number" min="0" placeholder="PV" required><button type="submit" class="ghost small">Ajouter un personnage</button>';
      personForm.addEventListener('submit', async event => { event.preventDefault(); const submit = personForm.querySelector('button'); submit.disabled = true; try { await callbacks.onSavePersistentCharacter({ name: personForm.elements.name.value.trim(), hp: Number(personForm.elements.hp.value), states: [] }); render(); } catch (cause) { fail(cause, 'Personnage non ajouté : vérifiez le nom et les PV, puis réessayez.'); } });
      people.appendChild(personForm);
    }
    root.appendChild(people);

    const actions = document.createElement('div'); actions.className = 'actions';
    const action = (label, callbackName, handler, condition = true) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      const available = typeof callbacks[callbackName] === 'function';
      button.disabled = !available || !condition || Boolean(state.busy);
      if (!available) button.title = 'Action indisponible';
      button.addEventListener('click', async () => {
        if (!available || state.busy) return;
        state.busy = true; state.error = ''; render();
        try { await handler(state.draft); }
        catch (error) { fail(error); return; }
        state.busy = false;
        if (mount.firstChild) render();
      });
      actions.appendChild(button);
    };
    action('Dupliquer', 'onDuplicate', async draft => { state.draft = duplicateEncounter(draft); if (await emit()) callbacks.onDuplicate(state.draft); });
    action('Lancer la rencontre', 'onLaunch', draft => callbacks.onLaunch(normalizeEncounter(draft)));
    root.append(actions, Object.assign(document.createElement('p'), { className: 'muted', textContent: 'Modifications enregistrées automatiquement.' }));
    mount.appendChild(root);
  }

  return {
    render, getDraft: () => normalizeEncounter(state.draft), setDraft(next) { state.draft = normalizeEncounter(next); state.error = ''; render(); },
    // À la fermeture de la fenêtre (Échap ferme sans faire sortir du champ) : enregistre la saisie
    // en cours, ou attend l'enregistrement encore en vol.
    flush: () => (typing ? emit() : lastSave)
  };
}
