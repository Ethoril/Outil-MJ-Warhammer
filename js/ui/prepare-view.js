import { createEncounter, normalizeEncounter, removeEncounterEntry, setEncounterEntry, duplicateEncounter } from '../core/encounters.js';

const noop = () => {};

function makeField(label, value, type = 'text') {
  const wrapper = document.createElement('label'); wrapper.textContent = label;
  const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
  if (type !== 'textarea') input.type = type;
  input.value = value ?? ''; wrapper.appendChild(input); return { wrapper, input };
}

/** E11 preparation view. All mutations leave through callbacks supplied by main. */
export function initPrepareView({ mount, Store = null, encounter = null, savedEncounters = [], persistentCharacters = [], callbacks = {} } = {}) {
  if (!mount || typeof mount.replaceChildren !== 'function') throw new TypeError('prepare-view nécessite un mount');
  const state = { draft: normalizeEncounter(encounter || createEncounter({ title: 'Nouvelle rencontre' })), error: '' };
  const onDraftChange = callbacks.onDraftChange || noop;
  const profiles = () => typeof callbacks.getProfiles === 'function' ? callbacks.getProfiles() : (typeof Store?.listProfiles === 'function' ? Store.listProfiles() : []);

  function fail(error) { state.error = error?.message || String(error); state.busy = false; render(); }
  async function emit() {
    state.error = '';
    try { await onDraftChange(state.draft); }
    catch (error) { fail(error); }
  }

  function render() {
    mount.replaceChildren();
    const root = document.createElement('section'); root.className = 'prepare-view'; root.setAttribute('aria-label', 'Préparer une rencontre');
    const title = document.createElement('h2'); title.textContent = 'Préparer une rencontre'; root.appendChild(title);
    if (state.error) { const error = document.createElement('p'); error.className = 'error'; error.setAttribute('role', 'alert'); error.textContent = state.error; root.appendChild(error); }
    const saved = typeof Store?.listEncounters === 'function' ? Store.listEncounters() : savedEncounters;
    const savedBox = document.createElement('details'); savedBox.className = 'prepare-saved-encounters'; savedBox.open = saved.length > 0;
    const savedSummary = document.createElement('summary'); savedSummary.textContent = `Rencontres enregistrées (${saved.length})`; savedBox.appendChild(savedSummary);
    if (!saved.length) savedBox.appendChild(document.createTextNode('Aucune rencontre enregistrée.'));
    saved.forEach(item => {
      const row = document.createElement('div'); row.className = 'row';
      const label = document.createElement('span'); label.textContent = `${item.title} · ${item.entries?.length || 0} composition(s) · ${item.status || 'préparée'}`;
      const select = document.createElement('button'); select.type = 'button'; select.className = 'ghost small'; select.textContent = 'Charger';
      select.addEventListener('click', () => callbacks.onSelectEncounter?.(item));
      row.append(label, select);
      if (typeof callbacks.onDeleteEncounter === 'function') {
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger ghost small'; remove.textContent = 'Supprimer';
        remove.addEventListener('click', async () => { remove.disabled = true; try { await callbacks.onDeleteEncounter(item.id); render(); } catch (cause) { fail(cause); } }); row.appendChild(remove);
      }
      savedBox.appendChild(row);
    });
    root.appendChild(savedBox);
    const titleField = makeField('Titre', state.draft.title); titleField.input.addEventListener('change', () => { state.draft.title = titleField.input.value.trim() || 'Rencontre sans titre'; void emit(); });
    const notesField = makeField('Notes', state.draft.notes, 'textarea'); notesField.input.addEventListener('change', () => { state.draft.notes = notesField.input.value; void emit(); });
    root.append(titleField.wrapper, notesField.wrapper);

    const add = document.createElement('div'); add.className = 'encounter-add-entry';
    const select = document.createElement('select'); select.setAttribute('aria-label', 'Profil');
    select.append(new Option('Ajouter un profil…', ''));
    profiles().forEach(profile => select.append(new Option(`${profile.name} (${profile.kind || 'Créature'})`, profile.id)));
    const quantity = makeField('Quantité', 1, 'number'); quantity.input.min = '1'; quantity.input.max = '99';
    const camp = makeField('Camp', 'neutre'); const zone = document.createElement('select'); zone.append(new Option('Banc', 'bench'), new Option('Actif', 'active'));
    const addButton = document.createElement('button'); addButton.type = 'button'; addButton.textContent = 'Ajouter';
    addButton.addEventListener('click', () => {
      try { state.draft = setEncounterEntry(state.draft, select.value, { quantity: quantity.input.value, camp: camp.input.value, zone: zone.value }); void emit(); render(); }
      catch (error) { fail(error); }
    });
    add.append(select, quantity.wrapper, camp.wrapper, zone, addButton); root.appendChild(add);

    const list = document.createElement('ul'); list.className = 'encounter-composition';
    state.draft.entries.forEach(entry => {
      const item = document.createElement('li');
      const profile = profiles().find(candidate => candidate.id === entry.profileId);
      item.textContent = `${profile?.name || entry.profileId || 'Profil supprimé'} ×${entry.quantity} · ${entry.camp} · ${entry.zone === 'active' ? 'actif' : 'banc'}`;
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
      if (typeof callbacks.onDeletePersistentCharacter === 'function') { const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger ghost small'; remove.textContent = 'Supprimer'; remove.addEventListener('click', async () => { remove.disabled = true; try { await callbacks.onDeletePersistentCharacter(character.id); render(); } catch (cause) { fail(cause); } }); row.appendChild(remove); }
      people.appendChild(row);
    });
    if (typeof callbacks.onSavePersistentCharacter === 'function') {
      const personForm = document.createElement('form'); personForm.className = 'row';
      personForm.innerHTML = '<input name="name" placeholder="Nom du personnage" required><input name="hp" type="number" min="0" placeholder="PV" required><button type="submit" class="ghost small">Ajouter un personnage</button>';
      personForm.addEventListener('submit', async event => { event.preventDefault(); const submit = personForm.querySelector('button'); submit.disabled = true; try { await callbacks.onSavePersistentCharacter({ name: personForm.elements.name.value.trim(), hp: Number(personForm.elements.hp.value), states: [] }); render(); } catch (cause) { fail(cause); } });
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
    action('Enregistrer', 'onSave', draft => callbacks.onSave(normalizeEncounter(draft)));
    action('Dupliquer', 'onDuplicate', async draft => { state.draft = duplicateEncounter(draft); await emit(); callbacks.onDuplicate(state.draft); });
    action('Lancer la rencontre', 'onLaunch', draft => callbacks.onLaunch(normalizeEncounter(draft)));
    const suspended = typeof Store?.listSuspendedScenes === 'function' ? Store.listSuspendedScenes() : [];
    const activeScene = typeof Store?.getActiveScene === 'function' ? Store.getActiveScene() : null;
    action('Reprendre', 'onResume', () => callbacks.onResume(suspended[0]?.id), suspended.length > 0);
    action('Suspendre', 'onSuspend', () => callbacks.onSuspend(), Boolean(activeScene));
    root.appendChild(actions);
    mount.appendChild(root);
  }

  return { render, getDraft: () => normalizeEncounter(state.draft), setDraft(next) { state.draft = normalizeEncounter(next); state.error = ''; render(); } };
}
