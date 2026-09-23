/**
 * Vue de séance E09.
 *
 * Le composant ne persiste aucun état d'interface et ne modifie jamais le Store
 * directement. `actions` sert de frontière avec main.js : le composant affiche
 * les données du Store, puis délègue les commandes au contrôleur applicatif.
 */
export const WORKSPACE_SPACES = Object.freeze(['prepare', 'play', 'library']);

const SPACE_LABELS = Object.freeze({
  prepare: 'Préparer',
  play: 'Jouer',
  library: 'Bibliothèque'
});

const noop = () => {};

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function button(label, className = '', attrs = {}) {
  const element = node('button', className, label);
  element.type = 'button';
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function readProfiles(Store) {
  return typeof Store?.listProfiles === 'function' ? Store.listProfiles() : [];
}

function readParticipants(Store) {
  return typeof Store?.listParticipants === 'function' ? Store.listParticipants() : [];
}

function readCombat(Store) {
  return typeof Store?.getCombat === 'function'
    ? Store.getCombat()
    : { round: 0, currentActorId: null, participants: new Map() };
}

function participantIdSet(participants) {
  return new Set(participants.map(participant => participant.id));
}

function formatStates(states = []) {
  if (!states.length) return 'Aucun état';
  return states.map(state => {
    if (typeof state === 'string') {
      const [name, duration] = state.split('|');
      return duration ? `${name} · ${duration} tours` : name;
    }
    if (state && typeof state === 'object') {
      const name = state.name || state.key || 'État';
      return state.duration == null ? name : `${name} · ${state.duration} tours`;
    }
    return String(state);
  }).join(' · ');
}

function profileSearchText(profile = {}) {
  const actions = (profile.diceLines || profile.actions || []).flatMap(action => [
    action?.name, action?.note, action?.attr, action?.base,
    ...(action?.qualities || []).flatMap(quality => [quality?.name, quality?.id, quality])
  ]);
  return [profile.name, profile.group, profile.kind, profile.notes, ...(profile.tags || []), ...actions]
    .filter(value => value !== undefined && value !== null)
    .join(' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function createShell(mount, { showNavigation = true } = {}) {
  const root = node('section', 'workspace-view');
  root.setAttribute('aria-label', 'Espace de séance');

  const nav = showNavigation ? node('nav', 'workspace-nav') : null;
  if (nav) {
    nav.setAttribute('aria-label', 'Espaces de séance');
    nav.setAttribute('role', 'tablist');
    WORKSPACE_SPACES.forEach(space => {
      const tab = button(SPACE_LABELS[space], 'workspace-tab', {
        'data-workspace-space': space,
        'role': 'tab',
        'aria-controls': `workspace-${space}`
      });
      nav.appendChild(tab);
    });
    root.appendChild(nav);
  }

  const prepare = node('section', 'workspace-space workspace-space-prepare');
  prepare.id = 'workspace-prepare';
  prepare.setAttribute('role', 'tabpanel');
  prepare.setAttribute('aria-labelledby', 'workspace-tab-prepare');
  root.appendChild(prepare);

  const play = node('section', 'workspace-space workspace-space-play');
  play.id = 'workspace-play';
  play.setAttribute('role', 'tabpanel');
  play.setAttribute('aria-labelledby', 'workspace-tab-play');
  root.appendChild(play);

  const library = node('section', 'workspace-space workspace-space-library');
  library.id = 'workspace-library';
  library.setAttribute('role', 'tabpanel');
  library.setAttribute('aria-labelledby', 'workspace-tab-library');
  root.appendChild(library);

  mount.replaceChildren(root);
  return { root, nav, prepare, play, library };
}

function profileSummary(profile, {
  canEdit = true,
  canDuplicate = false,
  canRemove = false,
  onEdit = null,
  onDuplicate = null,
  onRemove = null
} = {}) {
  const card = node('article', 'workspace-profile-card');
  card.dataset.profileId = profile.id;
  const title = node('h3', '', profile.name || 'Sans-nom');
  const meta = node('p', 'workspace-muted', `${profile.kind || 'Créature'} · Init ${profile.initiative ?? 0} · PV ${profile.hp ?? 0}${profile.favorite ? ' · ★ Favori' : ''}`);
  const group = profile.group ? node('p', 'workspace-tag', profile.group) : null;
  const actions = node('div', 'workspace-inline-actions');
  const edit = button('Modifier', 'workspace-secondary');
  edit.dataset.workspaceAction = 'edit-profile';
  edit.dataset.profileId = profile.id;
  edit.disabled = !canEdit;
  if (!canEdit) edit.title = 'Action indisponible';
  if (onEdit) edit.addEventListener('click', event => { event.stopPropagation(); onEdit(profile.id); });
  // The controller may omit editing when the current Store is read-only.
  actions.appendChild(edit);
  if (canDuplicate) {
    const duplicate = button('Dupliquer', 'workspace-secondary');
    duplicate.dataset.workspaceAction = 'duplicate-profile';
    duplicate.dataset.profileId = profile.id;
    if (onDuplicate) duplicate.addEventListener('click', event => { event.stopPropagation(); onDuplicate(profile.id); });
    actions.appendChild(duplicate);
  }
  if (canRemove) {
    const remove = button('Supprimer', 'workspace-secondary');
    remove.dataset.workspaceAction = 'remove-profile';
    remove.dataset.profileId = profile.id;
    if (onRemove) remove.addEventListener('click', event => { event.stopPropagation(); onRemove(profile.id); });
    actions.appendChild(remove);
  }
  card.append(title, meta);
  if (group) card.appendChild(group);
  if (profile.tags?.length) card.appendChild(node('p', 'workspace-muted', profile.tags.join(' · ')));
  card.appendChild(actions);
  return card;
}

/**
 * @param {{Store: object, Combat?: object, Bus?: object, mount?: Element, actions?: object}} options
 */
export function initWorkspaceView({ Store, Combat = {}, Bus = null, mount, actions = {}, showNavigation = true } = {}) {
  if (!mount || typeof mount.replaceChildren !== 'function') {
    throw new TypeError('workspace-view nécessite un élément mount');
  }
  if (!Store) throw new TypeError('workspace-view nécessite Store');

  const refs = createShell(mount, { showNavigation });
  const state = {
    space: 'prepare',
    selectedActorId: null,
    pinnedActorId: null,
    contextPanel: null,
    libraryQuery: '',
    librarySection: 'profiles',
    lastFocus: null,
    lastFocusSpace: null,
    lastFocusAction: null,
    benchOpen: false,
    selectionManual: false,
    actionBusy: false,
    actionError: ''
  };
  const callbacks = {
    beginEncounter: typeof actions.beginEncounter === 'function' ? actions.beginEncounter : null,
    createProfile: typeof actions.createProfile === 'function' ? actions.createProfile : null,
    duplicateProfile: typeof actions.duplicateProfile === 'function' ? actions.duplicateProfile : null,
    removeProfile: typeof actions.removeProfile === 'function' ? actions.removeProfile : null,
    startCombat: actions.startCombat || (() => Combat.start?.()),
    endTurn: actions.endTurn || (() => Combat.nextTurn?.()),
    undo: actions.undo || (() => Store.undo?.()),
    editProfile: typeof actions.editProfile === 'function' ? actions.editProfile : null,
    editParticipant: typeof actions.editParticipant === 'function' ? actions.editParticipant : null,
    openRules: typeof actions.openRules === 'function' ? actions.openRules : null,
    openLog: typeof actions.openLog === 'function' ? actions.openLog : null,
    renderRules: actions.renderRules || null,
    renderOverview: typeof actions.renderOverview === 'function' ? actions.renderOverview : null,
    renderLog: actions.renderLog || null,
    selectLibrarySection: actions.selectLibrarySection || noop,
    renderActionPanel: typeof actions.renderActionPanel === 'function' ? actions.renderActionPanel : null,
    runAction: typeof actions.runAction === 'function' ? actions.runAction : null,
    adjustHp: typeof actions.adjustHp === 'function' ? actions.adjustHp : null
  };

  function currentActorId() {
    return readCombat(Store).currentActorId || null;
  }

  function ensureSelection(participants) {
    const ids = participantIdSet(participants);
    if (state.pinnedActorId && ids.has(state.pinnedActorId)) {
      state.selectedActorId = state.pinnedActorId;
      return;
    }
    if (state.pinnedActorId && !ids.has(state.pinnedActorId)) state.pinnedActorId = null;
    if (!state.pinnedActorId && (!state.selectionManual || !state.selectedActorId || !ids.has(state.selectedActorId))) {
      const current = currentActorId();
      if (current && ids.has(current)) state.selectedActorId = current;
    }
    if (!state.selectedActorId || !ids.has(state.selectedActorId)) {
      state.selectedActorId = participants[0]?.id || null;
    }
  }

  function renderTabs() {
    if (!refs.nav) return;
    refs.nav.querySelectorAll('[data-workspace-space]').forEach(tab => {
      const active = tab.dataset.workspaceSpace === state.space;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.setAttribute('tabindex', active ? '0' : '-1');
      tab.id = `workspace-tab-${tab.dataset.workspaceSpace}`;
    });
  }

  function renderPrepare() {
    refs.prepare.replaceChildren();
    const header = node('div', 'workspace-section-heading');
    const title = node('div');
    title.appendChild(node('h2', '', 'Préparer'));
    header.appendChild(title);
    const create = button('Nouveau profil', 'workspace-secondary');
    create.dataset.workspaceAction = 'create-profile';
    create.disabled = state.actionBusy || !callbacks.createProfile;
    if (!callbacks.createProfile) create.title = 'Action indisponible';
    header.appendChild(create);
    const launch = button('Lancer la rencontre', 'workspace-primary');
    launch.dataset.workspaceAction = 'begin-encounter';
    launch.disabled = state.actionBusy || !callbacks.beginEncounter;
    if (!callbacks.beginEncounter) launch.title = 'Action indisponible';
    header.appendChild(launch);
    refs.prepare.appendChild(header);

    const profiles = readProfiles(Store);
    if (!profiles.length) {
      const empty = node('div', 'workspace-empty workspace-card');
      empty.append(node('h3', '', 'Aucun profil préparé'), node('p', '', 'Créez un profil ou chargez une sauvegarde pour préparer la séance.'));
      const library = button('Ouvrir la bibliothèque', 'workspace-secondary');
      library.dataset.workspaceSpace = 'library';
      empty.appendChild(library);
      refs.prepare.appendChild(empty);
      return;
    }
    const list = node('div', 'workspace-profile-grid');
    profiles.forEach(profile => list.appendChild(profileSummary(profile, {
      canEdit: Boolean(callbacks.editProfile),
      canDuplicate: Boolean(callbacks.duplicateProfile),
      canRemove: Boolean(callbacks.removeProfile),
      onEdit: callbacks.editProfile,
      onDuplicate: callbacks.duplicateProfile,
      onRemove: callbacks.removeProfile
    })));
    refs.prepare.appendChild(list);
  }

  function renderTrack(participants, combat) {
    const track = node('div', 'workspace-track');
    track.setAttribute('aria-label', 'Piste des tours');
    const active = participants.filter(participant => participant.zone === 'active');
    if (!active.length) {
      track.appendChild(node('p', 'workspace-muted', 'Aucun combattant actif dans la piste.'));
    } else {
      active.forEach(participant => {
        const item = button('', 'workspace-track-item');
        item.dataset.workspaceSelect = participant.id;
        item.setAttribute('aria-label', `Consulter ${participant.name}`);
        item.classList.toggle('is-current', participant.id === combat.currentActorId);
        item.classList.toggle('is-selected', participant.id === state.selectedActorId);
        if (participant.id === combat.currentActorId) item.setAttribute('aria-current', 'step');
        item.append(
          node('strong', 'workspace-track-name', participant.name),
          node('span', 'workspace-track-meta', `PV ${participant.hp}/${participant.maxHp ?? participant.hp}`),
          node('span', 'workspace-track-states', formatStates(participant.states))
        );
        track.appendChild(item);
      });
    }
    return track;
  }

  function renderActorSheet(participant) {
    const sheet = node('article', 'workspace-actor-sheet workspace-card');
    if (!participant) {
      sheet.append(node('h2', '', 'Aucun combattant sélectionné'), node('p', 'workspace-muted', 'Ajoutez un profil à la rencontre pour afficher sa fiche.'));
      return sheet;
    }
    sheet.dataset.actorId = participant.id;
    const heading = node('div', 'workspace-section-heading');
    heading.append(node('h2', '', participant.name));
    const pin = button(state.pinnedActorId === participant.id ? 'Suivre le tour' : 'Épingler la fiche', 'workspace-secondary');
    pin.dataset.workspaceAction = state.pinnedActorId === participant.id ? 'follow-current' : 'pin-actor';
    pin.dataset.actorId = participant.id;
    heading.appendChild(pin);
    sheet.appendChild(heading);

    const facts = node('div', 'workspace-facts');
    facts.append(
      node('span', 'workspace-pill', `PV ${participant.hp}/${participant.maxHp ?? participant.hp}`),
      node('span', 'workspace-pill', `Init ${participant.initiative ?? 0}`),
      node('span', 'workspace-pill', participant.kind || 'Créature')
    );
    sheet.appendChild(facts);
    sheet.appendChild(node('p', 'workspace-states', formatStates(participant.states)));

    const actionsRow = node('div', 'workspace-inline-actions');
    const edit = button('Modifier la fiche', 'workspace-secondary');
    edit.dataset.workspaceAction = 'edit-participant';
    edit.dataset.actorId = participant.id;
    edit.disabled = state.actionBusy || !callbacks.editParticipant;
    if (!callbacks.editParticipant) edit.title = 'Action indisponible';
    actionsRow.appendChild(edit);
    sheet.appendChild(actionsRow);

    const diceLines = (participant.actions || []).length
      ? participant.actions
      : (typeof Store.getDiceLines === 'function'
        ? Store.getDiceLines().filter(line => line.participantId === participant.id)
        : []);
    const prepared = node('div', 'workspace-prepared-actions');
    prepared.appendChild(node('h3', '', 'Actions préparées'));
    if (!diceLines.length) prepared.appendChild(node('p', 'workspace-muted', 'Aucune action préparée.'));
    else if (callbacks.renderActionPanel) {
      const rendered = callbacks.renderActionPanel(participant, prepared);
      if (rendered instanceof Node) {
        // Keep the visible command label tied to the normalized action name
        // even when the application callback only renders the command shell.
        rendered.querySelectorAll('[data-workspace-action="run-action"]').forEach((run, index) => {
          const action = diceLines[index];
          if (!action) return;
          const label = action.name || action.note || action.attr || 'Action';
          run.textContent = `${label} · ${action.base ?? '—'}`;
        });
        prepared.appendChild(rendered);
      }
      else if (typeof rendered === 'string') prepared.insertAdjacentHTML('beforeend', rendered);
    } else {
      const list = node('ul', 'workspace-action-list');
      diceLines.forEach(line => {
        const item = node('li');
        const run = button(`${line.note || line.attr || 'Lancer le jet'} · ${line.base || '—'}`, 'workspace-secondary');
        run.dataset.workspaceAction = 'run-action';
        run.dataset.participantId = participant.id;
        run.dataset.diceLineId = line.id || '';
        if (!callbacks.runAction) {
          run.disabled = true;
          run.title = 'Action indisponible sans callback applicatif';
        }
        run.disabled = run.disabled || state.actionBusy;
        item.appendChild(run);
        list.appendChild(item);
      });
      prepared.appendChild(list);
    }
    sheet.appendChild(prepared);

    const quick = node('div', 'workspace-quick-controls');
    quick.appendChild(node('h3', '', 'Contrôles rapides'));
    [-1, 1].forEach(delta => {
      const label = delta < 0 ? `${delta} PV` : `+${delta} PV`;
      const control = button(label, 'workspace-secondary', { 'aria-label': `${label} pour ${participant.name}` });
      control.dataset.workspaceAction = 'adjust-hp';
      control.dataset.actorId = participant.id;
      control.dataset.hpDelta = String(delta);
      if (!callbacks.adjustHp) {
        control.disabled = true;
        control.title = 'Contrôle indisponible sans callback applicatif';
      }
      control.disabled = control.disabled || state.actionBusy;
      quick.appendChild(control);
    });
    sheet.appendChild(quick);
    return sheet;
  }

  function renderContextPanel() {
    const aside = node('aside', 'workspace-context workspace-card');
    aside.setAttribute('aria-label', 'Panneau contextuel');
    if (!state.contextPanel) {
      aside.classList.add('is-empty');
      if (callbacks.renderOverview) {
        const content = node('div', 'workspace-context-content');
        const rendered = callbacks.renderOverview(content);
        if (rendered instanceof Node) content.appendChild(rendered);
        else if (typeof rendered === 'string') content.textContent = rendered;
        aside.appendChild(content);
      } else aside.appendChild(node('p', 'workspace-muted', 'Rappels et événements apparaîtront ici.'));
      return aside;
    }
    const heading = node('div', 'workspace-section-heading');
    heading.appendChild(node('h2', '', state.contextPanel === 'rules' ? 'Règles utiles' : 'Derniers événements'));
    const close = button('Fermer', 'workspace-secondary', { 'aria-label': 'Fermer le panneau contextuel' });
    close.dataset.workspaceAction = 'close-context';
    heading.appendChild(close);
    aside.appendChild(heading);
    const content = node('div', 'workspace-context-content');
    const renderer = state.contextPanel === 'rules' ? callbacks.renderRules : callbacks.renderLog;
    if (renderer) {
      const rendered = renderer(content);
      if (rendered instanceof Node) content.appendChild(rendered);
      else if (typeof rendered === 'string') content.textContent = rendered;
    } else {
      content.appendChild(node('p', 'workspace-muted', state.contextPanel === 'rules'
        ? 'Ouvrez une règle depuis l’action en cours.'
        : 'Aucun événement récent.'));
    }
    aside.appendChild(content);
    return aside;
  }

  function renderPlay() {
    const participants = readParticipants(Store);
    const combat = readCombat(Store);
    ensureSelection(participants);
    refs.play.replaceChildren();

    const header = node('div', 'workspace-session-heading');
    const current = participants.find(participant => participant.id === combat.currentActorId);
    header.append(
      (() => {
        const title = node('div');
        title.appendChild(node('h2', '', 'Jouer'));
        return title;
      })(),
      node('p', 'workspace-round', `Round ${combat.round || 0} · tour de ${current?.name || '—'}`)
    );
    const commands = node('div', 'workspace-inline-actions');
    const undo = button('Annuler', 'workspace-secondary');
    undo.dataset.workspaceAction = 'undo';
    if (!combat.currentActorId || !(combat.round > 0)) {
      const start = button('Démarrer', 'workspace-primary');
      start.dataset.workspaceAction = 'start-combat';
      start.disabled = state.actionBusy || !callbacks.startCombat;
      if (!callbacks.startCombat) start.title = 'Action indisponible';
      commands.append(start);
    }
    const endTurn = button('Terminer le tour', 'workspace-primary');
    endTurn.dataset.workspaceAction = 'end-turn';
    endTurn.disabled = state.actionBusy || (!combat.currentActorId && !(combat.round > 0));
    commands.append(undo, endTurn);
    header.appendChild(commands);
    refs.play.appendChild(header);

    const layout = node('div', 'workspace-play-grid');
    const trackColumn = node('div', 'workspace-track-column');
    trackColumn.append(node('h3', '', 'Piste des tours'), renderTrack(participants, combat));
    const bench = node('details', 'workspace-bench');
    bench.open = state.benchOpen;
    bench.addEventListener('toggle', () => { state.benchOpen = bench.open; });
    const summary = node('summary', '', `Renforts / en attente (${participants.filter(p => p.zone !== 'active').length})`);
    bench.appendChild(summary);
    participants.filter(participant => participant.zone !== 'active').forEach(participant => {
      const item = button(`${participant.name} · PV ${participant.hp}/${participant.maxHp ?? participant.hp}`, 'workspace-bench-item');
      item.dataset.workspaceSelect = participant.id;
      bench.appendChild(item);
    });
    trackColumn.appendChild(bench);
    layout.appendChild(trackColumn);

    const selected = participants.find(participant => participant.id === state.selectedActorId);
    layout.appendChild(renderActorSheet(selected));
    const context = renderContextPanel();
    const contextActions = node('div', 'workspace-inline-actions workspace-context-actions');
    const rules = button('Règles', 'workspace-secondary');
    rules.dataset.workspaceAction = 'open-rules';
    const log = button('Journal', 'workspace-secondary');
    log.dataset.workspaceAction = 'open-log';
    contextActions.append(rules, log);
    context.appendChild(contextActions);
    layout.appendChild(context);
    refs.play.appendChild(layout);
  }

  function renderLibrary() {
    refs.library.replaceChildren();
    const heading = node('div', 'workspace-section-heading');
    heading.appendChild(node('h2', '', 'Bibliothèque'));
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'workspace-search';
    search.placeholder = 'Rechercher un profil…';
    search.setAttribute('aria-label', 'Rechercher dans la bibliothèque');
    search.value = state.libraryQuery;
    search.addEventListener('input', event => {
      state.libraryQuery = event.target.value;
      renderLibrary();
      refs.library.querySelector('.workspace-search')?.focus();
    });
    heading.appendChild(search);
    refs.library.appendChild(heading);

    const subnav = node('div', 'workspace-subnav');
    ['profiles', 'rules', 'favorites'].forEach(section => {
      const label = { profiles: 'Profils', rules: 'Règles et mots-clés', favorites: 'Favoris' }[section];
      const tab = button(label, 'workspace-secondary');
      tab.dataset.librarySection = section;
      tab.setAttribute('aria-pressed', String(state.librarySection === section));
      subnav.appendChild(tab);
    });
    refs.library.appendChild(subnav);

    const content = node('div', 'workspace-library-content');
    if (state.librarySection === 'profiles') {
      const term = profileSearchText({ name: state.libraryQuery });
      const profiles = readProfiles(Store).filter(profile => profileSearchText(profile).includes(term));
      if (!profiles.length) content.appendChild(node('p', 'workspace-muted', 'Aucun profil correspondant.'));
      else {
        const list = node('div', 'workspace-profile-grid');
        profiles.forEach(profile => list.appendChild(profileSummary(profile, {
          canEdit: Boolean(callbacks.editProfile),
          canDuplicate: Boolean(callbacks.duplicateProfile),
          canRemove: Boolean(callbacks.removeProfile),
          onEdit: callbacks.editProfile,
          onDuplicate: callbacks.duplicateProfile,
          onRemove: callbacks.removeProfile
        })));
        content.appendChild(list);
      }
    } else if (state.librarySection === 'rules') {
      const renderer = callbacks.renderRules;
      if (renderer) {
        const rendered = renderer(content);
        if (rendered instanceof Node) content.appendChild(rendered);
        else if (typeof rendered === 'string') content.textContent = rendered;
      } else {
        content.appendChild(node('p', 'workspace-muted', 'Les règles et mots-clés restent consultables sans modifier la séance.'));
      }
    } else {
      const profiles = readProfiles(Store).filter(profile => profile.favorite);
      if (!profiles.length) content.appendChild(node('p', 'workspace-muted', 'Aucun favori enregistré.'));
      else {
        const list = node('div', 'workspace-profile-grid');
        profiles.forEach(profile => list.appendChild(profileSummary(profile, {
          canEdit: Boolean(callbacks.editProfile),
          onEdit: callbacks.editProfile
        })));
        content.appendChild(list);
      }
    }
    refs.library.appendChild(content);
  }

  function render() {
    renderTabs();
    refs.prepare.hidden = state.space !== 'prepare';
    refs.play.hidden = state.space !== 'play';
    refs.library.hidden = state.space !== 'library';
    renderPrepare();
    renderPlay();
    renderLibrary();
  }

  function rememberFocus(target) {
    state.lastFocus = target;
    state.lastFocusSpace = target?.dataset.workspaceSpace || null;
    state.lastFocusAction = target?.dataset.workspaceAction || null;
  }

  function restoreFocus() {
    if (state.lastFocusSpace) {
      refs.nav?.querySelector(`[data-workspace-space="${state.lastFocusSpace}"]`)?.focus();
    } else if (state.lastFocusAction) {
      refs.root.querySelector(`[data-workspace-action="${state.lastFocusAction}"]`)?.focus();
    } else {
      state.lastFocus?.focus?.();
    }
  }

  refs.root.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target || !refs.root.contains(target)) return;
    if (target.dataset.workspaceSpace) {
      rememberFocus(target);
      state.space = target.dataset.workspaceSpace;
      render();
      return;
    }
    if (target.dataset.workspaceSelect) {
      state.selectedActorId = target.dataset.workspaceSelect;
      state.selectionManual = true;
      state.space = 'play';
      render();
      return;
    }
    if (target.dataset.librarySection) {
      state.librarySection = target.dataset.librarySection;
      callbacks.selectLibrarySection(state.librarySection);
      renderLibrary();
      return;
    }
    const action = target.dataset.workspaceAction;
    if (!action) return;
    switch (action) {
      case 'begin-encounter': callbacks.beginEncounter(); break;
      case 'create-profile': callbacks.createProfile?.(); break;
      case 'start-combat': callbacks.startCombat?.(); break;
      case 'end-turn': callbacks.endTurn(); break;
      case 'undo': callbacks.undo(); break;
      case 'edit-profile': callbacks.editProfile(target.dataset.profileId); break;
      case 'duplicate-profile': callbacks.duplicateProfile?.(target.dataset.profileId); break;
      case 'remove-profile': callbacks.removeProfile?.(target.dataset.profileId); break;
      case 'edit-participant': callbacks.editParticipant(target.dataset.actorId); break;
      case 'run-action': callbacks.runAction?.({ participantId: target.dataset.participantId, diceLineId: target.dataset.diceLineId || null }); break;
      case 'adjust-hp': callbacks.adjustHp?.({ participantId: target.dataset.actorId, delta: Number(target.dataset.hpDelta) }); break;
      case 'pin-actor': state.pinnedActorId = target.dataset.actorId; state.selectedActorId = target.dataset.actorId; render(); break;
      case 'follow-current': state.pinnedActorId = null; state.selectedActorId = currentActorId(); state.selectionManual = false; render(); break;
      case 'open-rules':
        rememberFocus(target);
        state.contextPanel = 'rules';
        callbacks.openRules();
        render();
        refs.root.querySelector('[data-workspace-action="close-context"]')?.focus();
        break;
      case 'open-log':
        rememberFocus(target);
        state.contextPanel = 'log';
        callbacks.openLog();
        render();
        refs.root.querySelector('[data-workspace-action="close-context"]')?.focus();
        break;
      case 'close-context': state.contextPanel = null; render(); restoreFocus(); break;
      default: break;
    }
  });

  refs.root.addEventListener('keydown', event => {
    // A focused command button must keep native activation semantics. The
    // global keyboard handler must not interpret its Space key as next turn.
    if (event.code === 'Space' && event.target.closest('button')) {
      event.stopPropagation();
      return;
    }
    if (event.key !== 'Escape' || !state.contextPanel) return;
    event.preventDefault();
    state.contextPanel = null;
    render();
    restoreFocus();
  });

  const rerender = () => render();
  ['reserve', 'combat', 'combat:update', 'log'].forEach(event => Bus?.on?.(event, rerender));
  render();

  return Object.freeze({
    render,
    setSpace(space) {
      if (!WORKSPACE_SPACES.includes(space)) throw new RangeError(`Espace inconnu : ${space}`);
      state.space = space;
      render();
    },
    selectActor(id, { pinned = false } = {}) {
      state.selectedActorId = id;
      state.pinnedActorId = pinned ? id : null;
      render();
    },
    followCurrent() {
      state.pinnedActorId = null;
      state.selectedActorId = currentActorId();
      render();
    },
    openContext(kind) {
      if (!['rules', 'log'].includes(kind)) throw new RangeError(`Panneau inconnu : ${kind}`);
      state.contextPanel = kind;
      render();
    },
    closeContext() {
      state.contextPanel = null;
      render();
    },
    getViewState() {
      return { ...state };
    }
  });
}
