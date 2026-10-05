/**
 * Vue de séance E09.
 *
 * Le composant ne persiste aucun état d'interface et ne modifie jamais le Store
 * directement. `actions` sert de frontière avec main.js : le composant affiche
 * les données du Store, puis délègue les commandes au contrôleur applicatif.
 * Seul l'aperçu de résolution (lecture seule) est demandé directement au Store.
 */
import { d100 } from '../core/dice.js';
import { inferActionType, previewHpLoss, ResolutionError } from '../core/resolution.js';
import { userMessage } from './messages.js';
import { normalizeEffects } from '../core/effects.js';
import { CAMP_LABELS, normalizeCamp, encounterDisplayStatus, encounterSummary, sortEncountersForDisplay } from '../core/encounters.js';
import { uid } from '../core/models.js';
import { renderSilhouette } from './silhouette.js';
import { renderResolutionPanel, actionKey, minusSigned, defenseOptions, defaultDefenseValue } from './resolution-panel.js';
import { initSidePanel } from './side-panel.js';

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

function readEncounters(Store) {
  return typeof Store?.listEncounters === 'function' ? Store.listEncounters() : [];
}

function readScenes(Store) {
  return {
    activeScene: typeof Store?.getActiveScene === 'function' ? Store.getActiveScene() : null,
    suspendedScenes: typeof Store?.listSuspendedScenes === 'function' ? Store.listSuspendedScenes() : []
  };
}

function readParticipants(Store) {
  return typeof Store?.listParticipants === 'function' ? Store.listParticipants() : [];
}

function readCombat(Store) {
  return typeof Store?.getCombat === 'function'
    ? Store.getCombat()
    : { round: 0, currentActorId: null, participants: new Map() };
}

// Clé du tour en cours : change au tour suivant, au début du combat ou s'il est recommencé.
const turnKey = combat => `${Number(combat.round) || 0}:${combat.currentActorId || ''}`;

export const STATE_NAMES = Object.freeze(['Blessé', 'À Terre', 'Sonné', 'Inconscient', 'Aveuglé', 'Assourdi', 'Exténué', 'Hémorragique', 'Surpris', 'Enchevêtré', 'Enflammé', 'Brisé']);
// Level matters for these every turn, so it stays visible even at 1.
const LEVELLED_STATES = new Set(['hemorragique', 'enflamme']);

function stateLabel(state) {
  const level = state.level > 1 || LEVELLED_STATES.has(state.key) ? ` ${state.level}` : '';
  return `${state.name || 'État'}${level}${state.duration ? ` · ${state.duration} t` : ''}`;
}

const toughnessBonus = participant => Math.floor((Number(participant?.caracs?.E) || 0) / 10);

// PA non nuls : Tête, Corps, Bras, Jambes.
function armorSummary(armor = {}) {
  const parts = [['T', 'head'], ['C', 'body'], ['B', 'arms'], ['J', 'legs']]
    .filter(([, key]) => Number(armor?.[key]) > 0)
    .map(([letter, key]) => `${letter}${Number(armor[key])}`);
  return parts.length ? parts.join(' ') : '—';
}

const hpText = participant => `${minusSigned(participant.hp)}/${participant.maxHp ?? participant.hp}`;

function hpTone(hp, maxHp) {
  const ratio = maxHp > 0 ? hp / maxHp : (hp > 0 ? 1 : 0);
  return ratio <= 0.25 ? 'crit' : ratio <= 0.5 ? 'warn' : 'ok';
}

function hpBar(participant) {
  const hp = Number(participant.hp) || 0;
  const max = Number(participant.maxHp ?? participant.hp) || 0;
  const bar = node('span', `workspace-hp-bar is-${hpTone(hp, max)}`);
  bar.setAttribute('aria-hidden', 'true');
  const fill = node('span', 'workspace-hp-fill');
  fill.style.width = `${Math.max(0, Math.min(100, max > 0 ? (hp / max) * 100 : 0))}%`;
  bar.appendChild(fill);
  return bar;
}

// Clé du brouillon → nom du jet attendu par le moteur (criticalRolls).
const CRITICAL_ERROR_FIELDS = Object.freeze({ criticalLocationRoll: 'location', criticalEffectRoll: 'effect', criticalSecondRoll: 'secondEffect' });
const criticalRollError = () => userMessage(new ResolutionError('Jet invalide', 'INVALID_ROLL'), 'Jet invalide.');

function validRoll(value) {
  const text = String(value ?? '').trim();
  const roll = Number(text);
  return text === '00' || (Number.isInteger(roll) && roll >= 1 && roll <= 100);
}

// Jet de critique tapé mais absent de l'aperçu affiché (ou invalide) : il faut recalculer avant d'appliquer.
function criticalRollsChanged(draft) {
  const shown = draft.preview?.input?.criticalRolls || {};
  return Object.entries(CRITICAL_ERROR_FIELDS).some(([key, name]) => {
    const raw = String(draft[key] ?? '').trim();
    if (raw && !validRoll(raw)) return true;
    const typed = raw ? (raw === '00' ? 100 : Number(raw)) : null;
    return typed !== (shown[name] ?? null);
  });
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
  const profileName = profile.name || 'Sans-nom';
  const edit = button('Modifier', 'workspace-secondary', { 'aria-label': `Modifier ${profileName}`, 'data-focus-key': `edit-profile-${profile.id}` });
  edit.dataset.workspaceAction = 'edit-profile';
  edit.dataset.profileId = profile.id;
  edit.disabled = !canEdit;
  if (!canEdit) edit.title = 'Action indisponible';
  if (onEdit) edit.addEventListener('click', event => { event.stopPropagation(); onEdit(profile.id); });
  // The controller may omit editing when the current Store is read-only.
  actions.appendChild(edit);
  if (canDuplicate) {
    const duplicate = button('Dupliquer', 'workspace-secondary', { 'aria-label': `Dupliquer ${profileName}`, 'data-focus-key': `duplicate-profile-${profile.id}` });
    duplicate.dataset.workspaceAction = 'duplicate-profile';
    duplicate.dataset.profileId = profile.id;
    if (onDuplicate) duplicate.addEventListener('click', event => { event.stopPropagation(); onDuplicate(profile.id); });
    actions.appendChild(duplicate);
  }
  if (canRemove) {
    const remove = button('Supprimer', 'workspace-secondary', { 'aria-label': `Supprimer ${profileName}`, 'data-focus-key': `remove-profile-${profile.id}` });
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
    // Explicit target for the current actor: null = default, 'none' or an id.
    targetChoice: null,
    // Personnage actif choisi dans la piste : null = celui du tour, sinon { id, turn } (valable pour ce tour seulement).
    actorChoice: null,
    libraryQuery: '',
    librarySection: 'profiles',
    sideQuery: '',
    lastFocus: null,
    lastFocusSpace: null,
    lastFocusAction: null,
    actionBusy: false,
    hpAmounts: {},
    stateForm: null,
    // Résolution draft: survives every Bus re-render (no keystroke lost).
    resolution: emptyResolution(null)
  };
  function emptyResolution(actorId) {
    return {
      actorId, actionKey: null, type: null, attackRoll: '', defenseStat: null, defenseBase: null, defenseSource: null, defenseRoll: '',
      // Critique : jets saisis, effets décochés et erreurs de saisie par champ (l'aperçu reste affiché).
      criticalLocationRoll: '', criticalEffectRoll: '', criticalSecondRoll: '', criticalDeclined: [], criticalErrors: {},
      preview: null, comparison: null, error: null, busy: false
    };
  }
  // Un nouvel aperçu (autre action, type, cible ou jet) repart de zéro côté critique.
  function resetCritical(draft) {
    Object.assign(draft, { criticalLocationRoll: '', criticalEffectRoll: '', criticalSecondRoll: '', criticalDeclined: [], criticalErrors: {} });
  }
  // Autre jet de critique : ses effets repartent cochés (les cases décochées visaient l'ancien tirage).
  // La localisation change aussi les dégâts, donc l'existence du second critique.
  function forgetDeclined(draft, field) {
    const prefixes = field === 'criticalLocationRoll' ? ['first-', 'second-'] : field === 'criticalEffectRoll' ? ['first-'] : ['second-'];
    draft.criticalDeclined = draft.criticalDeclined.filter(id => !prefixes.some(prefix => id.startsWith(prefix)));
  }
  function recalculateCritical() {
    const draft = state.resolution;
    if (draft.preview && !draft.busy) resolutionHandlers.calculate();
  }
  // Appui en cours (souris ou doigt) : le recalcul qui suit la sortie d'un champ de critique attend
  // le relâchement, pour que le clic atteigne le bouton visé avant qu'il soit reconstruit.
  const press = { active: false, waiting: false };
  const pressDocument = mount.ownerDocument || document;
  const release = () => {
    press.active = false;
    if (!press.waiting) return;
    press.waiting = false;
    setTimeout(recalculateCritical);
  };
  pressDocument.addEventListener('pointerdown', () => { press.active = true; }, true);
  pressDocument.addEventListener('pointerup', release, true);
  pressDocument.addEventListener('pointercancel', release, true);
  const callbacks = {
    beginEncounter: typeof actions.beginEncounter === 'function' ? actions.beginEncounter : null,
    editEncounter: typeof actions.editEncounter === 'function' ? actions.editEncounter : null,
    launchEncounter: typeof actions.launchEncounter === 'function' ? actions.launchEncounter : null,
    deleteEncounter: typeof actions.deleteEncounter === 'function' ? actions.deleteEncounter : null,
    resumeScene: typeof actions.resumeScene === 'function' ? actions.resumeScene : null,
    suspendScene: typeof actions.suspendScene === 'function' ? actions.suspendScene : null,
    restartCombat: typeof actions.restartCombat === 'function' ? actions.restartCombat : null,
    showPlay: typeof actions.showPlay === 'function' ? actions.showPlay : null,
    createProfile: typeof actions.createProfile === 'function' ? actions.createProfile : null,
    duplicateProfile: typeof actions.duplicateProfile === 'function' ? actions.duplicateProfile : null,
    removeProfile: typeof actions.removeProfile === 'function' ? actions.removeProfile : null,
    editProfile: typeof actions.editProfile === 'function' ? actions.editProfile : null,
    editParticipant: typeof actions.editParticipant === 'function' ? actions.editParticipant : null,
    removeParticipant: typeof actions.removeParticipant === 'function' ? actions.removeParticipant : null,
    renderRules: actions.renderRules || null,
    renderOverview: typeof actions.renderOverview === 'function' ? actions.renderOverview : null,
    renderLog: actions.renderLog || null,
    selectLibrarySection: actions.selectLibrarySection || noop,
    adjustHp: typeof actions.adjustHp === 'function' ? actions.adjustHp : null,
    enterParticipant: typeof actions.enterParticipant === 'function' ? actions.enterParticipant : null,
    setStates: typeof actions.setStates === 'function' ? actions.setStates : null,
    applyResolution: typeof actions.applyResolution === 'function' ? actions.applyResolution : null,
    addProfileToCombat: typeof actions.addProfileToCombat === 'function' ? actions.addProfileToCombat : null
  };

  function actorActions(participant) {
    if (!participant) return [];
    if ((participant.actions || []).length) return participant.actions;
    return typeof Store.getDiceLines === 'function'
      ? Store.getDiceLines().filter(line => line.participantId === participant.id)
      : [];
  }

  // Everything Jouer derives from the Store for one render: actor, target,
  // selected action and type. The draft is reset when the acting turn changes.
  function playContext() {
    const participants = readParticipants(Store);
    const combat = readCombat(Store);
    const byId = new Map(participants.map(participant => [participant.id, participant]));
    const orderIds = typeof Store.getEffectiveOrder === 'function' ? Store.getEffectiveOrder() : participants.map(participant => participant.id);
    const active = orderIds.map(id => byId.get(id)).filter(participant => participant?.zone === 'active');
    participants.forEach(participant => { if (participant.zone === 'active' && !active.includes(participant)) active.push(participant); });
    const bench = participants.filter(participant => participant.zone !== 'active');
    // Le choix de la piste ne vaut que pour le tour où il a été fait.
    const turn = turnKey(combat);
    if (state.actorChoice && state.actorChoice.turn !== turn) state.actorChoice = null;
    const turnActor = active.find(participant => participant.id === combat.currentActorId) || null;
    const chosen = state.actorChoice ? active.find(participant => participant.id === state.actorChoice.id) : null;
    if (state.actorChoice && !chosen) state.actorChoice = null;
    const actor = chosen || turnActor || active[0] || null;
    const started = Number(combat.round) > 0 && Boolean(turnActor);

    if (state.resolution.actorId !== (actor?.id || null)) {
      state.resolution = emptyResolution(actor?.id || null);
      state.targetChoice = null;
    }
    const draft = state.resolution;
    const actions = actorActions(actor);
    const keys = actions.map(actionKey);
    if (!keys.includes(draft.actionKey)) draft.actionKey = keys[0] || null;
    const action = actions[keys.indexOf(draft.actionKey)] || null;
    const type = draft.type || (action ? inferActionType(action) : null);

    const camp = participant => normalizeCamp(participant?.camp, participant?.kind);
    const others = active.filter(participant => participant.id !== actor?.id);
    const groups = {
      adversaries: others.filter(participant => camp(participant) !== camp(actor)),
      allies: others.filter(participant => camp(participant) === camp(actor))
    };
    let target = null;
    if (state.targetChoice && state.targetChoice !== 'none') target = others.find(participant => participant.id === state.targetChoice) || null;
    if (!target && state.targetChoice !== 'none' && type !== 'skill') target = groups.adversaries[0] || others[0] || null;
    if (draft.preview && draft.preview.targetId !== (target?.id || null)) { draft.preview = null; resetCritical(draft); }
    const defense = type === 'attack' && target ? defenseChoice(target) : null;
    if (defense) {
      // Valeur pré-remplie pour une cible, une option et sa valeur : une autre combinaison (jet disparu,
      // autre cible, CC modifiée) repart de sa propre valeur, une saisie à la main sur la même reste. « Autre » garde la saisie.
      const source = defense.option.value === 'Autre' ? 'Autre' : `${target.id}|${defense.option.value}|${defense.option.base}`;
      if (draft.defenseSource !== source) {
        draft.defenseSource = source;
        if (source !== 'Autre') draft.defenseBase = null;
      }
      if (draft.defenseBase === null && source !== 'Autre') draft.defenseBase = defense.option.base === null ? null : String(defense.option.base);
    }
    return { participants, combat, active, bench, actor, turnActor, started, actions, action, type, target, groups, defense, camp };
  }

  // Options de défense d'une cible et choix effectif : celui du brouillon s'il existe chez elle, sinon son défaut.
  function defenseChoice(target) {
    const options = defenseOptions(target, actorActions(target));
    const wanted = state.resolution.defenseStat;
    const option = options.find(item => item.value === wanted) || options.find(item => item.value === defaultDefenseValue(options));
    return { options, value: option.value, option };
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
    const launch = button('Nouvelle rencontre', 'workspace-primary', { 'data-focus-key': 'new-encounter' });
    launch.dataset.workspaceAction = 'begin-encounter';
    launch.disabled = state.actionBusy || !callbacks.beginEncounter;
    if (!callbacks.beginEncounter) launch.title = 'Action indisponible';
    header.appendChild(launch);
    refs.prepare.appendChild(header);

    refs.prepare.appendChild(rubric('Rencontres'));
    const encounters = encounterList({ compact: false });
    if (encounters.note) refs.prepare.appendChild(encounters.note);
    if (encounters.list) refs.prepare.appendChild(encounters.list);
    else refs.prepare.appendChild(node('p', 'workspace-muted', 'Aucune rencontre préparée : « Nouvelle rencontre » pour en composer une à l’avance.'));

    refs.prepare.appendChild(rubric('Profils'));
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

  // Cartes des rencontres enregistrées. `compact` (Jouer, sans combat) : titre,
  // statut, composition et le seul bouton principal, sans les rencontres en cours.
  function encounterList({ compact }) {
    const scenes = readScenes(Store);
    const profiles = readProfiles(Store);
    const running = scenes.activeScene?.status === 'active';
    let encounters = sortEncountersForDisplay(readEncounters(Store), scenes);
    if (compact) encounters = encounters.filter(encounter => encounterDisplayStatus(encounter, scenes).key !== 'active');
    // Aussi sans carte : le combat en cours peut venir d'une rencontre supprimée depuis.
    const note = !compact && running
      ? node('p', 'workspace-muted workspace-encounter-note', `Combat en cours : « ${scenes.activeScene.title || 'Séance'} ». Suspendez-le ou supprimez la rencontre pour en lancer une autre.`)
      : null;
    if (!encounters.length) return { list: null, note };
    const list = node('div', 'workspace-encounter-list');
    encounters.forEach(encounter => list.appendChild(encounterCard(encounter, {
      status: encounterDisplayStatus(encounter, scenes), summary: encounterSummary(encounter, profiles), running, compact
    })));
    return { list, note };
  }

  function encounterCard(encounter, { status, summary, running, compact }) {
    const name = encounter.title || 'Rencontre sans titre';
    const card = node('article', `workspace-encounter-card${compact ? ' is-compact' : ''}`);
    card.dataset.encounterId = encounter.id;
    const head = node('div', 'workspace-encounter-head');
    head.append(node(compact ? 'h4' : 'h3', '', name), node('span', `workspace-encounter-status is-${status.key}`, status.label));
    card.appendChild(head);
    card.appendChild(node('p', 'workspace-encounter-meta', `${summary.count} combattant${summary.count > 1 ? 's' : ''}${summary.text ? ` · ${summary.text}` : ''}`));
    const firstNote = (encounter.notes || '').split('\n').map(line => line.trim()).find(Boolean);
    if (firstNote && !compact) card.appendChild(node('p', 'workspace-encounter-notes', firstNote));
    const command = (label, className, action, callback, { disabled = false, title = '', scene = false } = {}) => {
      const element = button(label, className, { 'aria-label': `${label} « ${name} »`, 'data-focus-key': `${action}-${encounter.id}` });
      element.dataset.workspaceAction = action;
      element.dataset.encounterId = encounter.id;
      if (scene) element.dataset.sceneId = status.sceneId;
      element.disabled = state.actionBusy || !callback || disabled;
      if (!callback) element.title = 'Action indisponible';
      else if (disabled) element.title = title;
      return element;
    };
    const busyTitle = 'Un combat est en cours : suspendez-le ou supprimez sa rencontre d’abord';
    const actions = node('div', 'workspace-inline-actions');
    if (status.key === 'active') {
      actions.appendChild(command('Revenir au combat', 'workspace-primary', 'show-play', callbacks.showPlay));
      if (!compact) actions.appendChild(command('Suspendre', 'workspace-secondary', 'suspend-scene', callbacks.suspendScene));
      if (!compact) actions.appendChild(command('Recommencer', 'workspace-secondary', 'restart-combat', callbacks.restartCombat));
    } else if (status.key === 'suspended') {
      actions.appendChild(command('Reprendre', 'workspace-primary', 'resume-scene', callbacks.resumeScene, { disabled: running, title: busyTitle, scene: true }));
    } else {
      actions.appendChild(command('Lancer', 'workspace-primary', 'launch-encounter', callbacks.launchEncounter, { disabled: running || summary.count === 0, title: running ? busyTitle : 'Ajoutez au moins un combattant' }));
    }
    if (!compact) {
      actions.appendChild(command('Modifier', 'workspace-secondary', 'edit-encounter', callbacks.editEncounter));
      actions.appendChild(command('Supprimer', 'workspace-secondary', 'delete-encounter', callbacks.deleteEncounter));
    }
    card.appendChild(actions);
    return card;
  }

  function rubric(text, tag = 'h3') {
    return node(tag, 'workspace-rubric', text);
  }

  function campChip(participant, camp) {
    const value = camp(participant);
    return node('span', `workspace-camp is-${value}`, CAMP_LABELS[value]);
  }

  function renderTrack(context) {
    const column = play.track;
    column.replaceChildren(rubric('Piste des tours'));
    const track = node('div', 'workspace-track');
    track.setAttribute('aria-label', 'Piste des tours');
    if (!context.active.length) track.appendChild(node('p', 'workspace-muted', 'Aucun combattant en jeu.'));
    context.active.forEach(participant => {
      const isActor = participant.id === context.actor?.id;
      const isCurrent = participant.id === context.combat.currentActorId;
      const isTurn = context.started && isCurrent;
      const isTarget = participant.id === context.target?.id;
      // Pas d'aria-label : le contenu (nom, PV, BE, PA, états) forme le nom accessible.
      const item = button('', `workspace-track-item is-camp-${context.camp(participant)}`, {
        'aria-pressed': String(isActor),
        'data-focus-key': `select-${participant.id}`
      });
      item.dataset.workspaceSelect = participant.id;
      item.classList.toggle('is-actor', isActor);
      item.classList.toggle('is-turn', isTurn);
      item.classList.toggle('is-target', isTarget);
      // Comme le ▶ : pas de « tour » annoncé tant que le combat n'a pas commencé.
      if (isTurn) item.setAttribute('aria-current', 'step');
      const top = node('span', 'workspace-track-top');
      top.append(node('span', 'workspace-track-marker', isTurn ? '▶' : ''), node('strong', 'workspace-track-name combatant-name', participant.name));
      if (isTarget) top.appendChild(node('span', 'workspace-track-role', 'cible'));
      const hp = node('span', 'workspace-track-hp num', hpText(participant));
      hp.prepend(node('span', 'workspace-sr', 'PV '));
      top.appendChild(hp);
      item.append(top, hpBar(participant),
        node('span', 'workspace-track-meta num', `BE ${toughnessBonus(participant)} · PA ${armorSummary(participant.armor)}`));
      const states = normalizeEffects(participant.states);
      if (states.length) {
        const list = node('span', 'workspace-track-states');
        states.forEach(item => list.appendChild(node('span', 'workspace-state-chip', stateLabel(item))));
        item.appendChild(list);
      }
      const remove = defeatedParticipantButton(participant, `track-remove-${participant.id}`);
      if (remove) {
        const entry = node('div', `workspace-track-entry is-camp-${context.camp(participant)}`);
        entry.append(item, remove);
        track.appendChild(entry);
      } else track.appendChild(item);
    });
    column.appendChild(track);

    if (context.bench.length) {
      const bench = node('section', 'workspace-bench');
      bench.setAttribute('aria-label', 'En attente');
      bench.appendChild(rubric(`En attente (${context.bench.length})`));
      context.bench.forEach(participant => {
        const row = node('div', 'workspace-bench-item');
        const label = node('span', 'workspace-bench-label');
        label.append(node('span', 'combatant-name', participant.name), ' ', node('span', 'num workspace-muted', `PV ${hpText(participant)}`));
        const enter = button('Faire entrer', 'workspace-secondary', { 'aria-label': `Faire entrer ${participant.name}`, 'data-focus-key': `enter-${participant.id}` });
        enter.dataset.workspaceAction = 'enter-participant';
        enter.dataset.actorId = participant.id;
        enter.disabled = !callbacks.enterParticipant;
        if (!callbacks.enterParticipant) enter.title = 'Action indisponible';
        row.append(label, enter);
        const remove = defeatedParticipantButton(participant, `bench-remove-${participant.id}`);
        if (remove) row.appendChild(remove);
        bench.appendChild(row);
      });
      column.appendChild(bench);
    }
  }

  function renderStateForm(participant) {
    const form = node('div', 'workspace-state-form');
    form.setAttribute('role', 'group');
    form.setAttribute('aria-label', `Ajouter un état à ${participant.name}`);
    const draft = state.stateForm;
    const name = document.createElement('select');
    name.setAttribute('aria-label', 'État');
    name.dataset.focusKey = 'state-form-name';
    STATE_NAMES.forEach(value => name.appendChild(new Option(value, value)));
    name.value = draft.name;
    name.addEventListener('change', () => { draft.name = name.value; });
    const level = document.createElement('input');
    level.type = 'number'; level.min = '1'; level.value = draft.level;
    level.setAttribute('aria-label', 'Niveau');
    level.dataset.focusKey = 'state-form-level';
    level.addEventListener('input', () => { draft.level = level.value; });
    const duration = document.createElement('input');
    duration.type = 'number'; duration.min = '1'; duration.value = draft.duration; duration.placeholder = 'Permanent';
    duration.setAttribute('aria-label', 'Durée en tours (vide = permanent)');
    duration.dataset.focusKey = 'state-form-duration';
    duration.addEventListener('input', () => { draft.duration = duration.value; });
    const add = button('Ajouter', 'workspace-secondary', { 'data-focus-key': 'state-form-add' });
    add.dataset.workspaceAction = 'add-state';
    add.dataset.actorId = participant.id;
    const cancel = button('Annuler', 'workspace-ghost', { 'aria-label': 'Annuler l’ajout d’état', 'data-focus-key': 'state-form-cancel' });
    cancel.dataset.workspaceAction = 'cancel-state';
    if (draft.error) {
      const alert = node('p', 'workspace-field-error', draft.error);
      alert.setAttribute('role', 'alert');
      form.appendChild(alert);
    }
    form.append(name, level, duration, add, cancel);
    return form;
  }

  function canRemoveDefeated(participant) {
    return participant && Number(participant.hp) <= 0 && participant.kind !== 'PJ' && normalizeCamp(participant.camp, participant.kind) !== 'pj';
  }

  function defeatedParticipantButton(participant, focusKey) {
    if (!canRemoveDefeated(participant)) return null;
    const remove = button('Retirer du combat', 'workspace-secondary danger', { 'aria-label': `Retirer ${participant.name} du combat`, 'data-focus-key': focusKey });
    remove.dataset.workspaceAction = 'remove-participant';
    remove.dataset.actorId = participant.id;
    remove.disabled = !callbacks.removeParticipant;
    return remove;
  }

  function renderSheet(participant, role, context) {
    const isTarget = role === 'target';
    const sheet = node('article', `workspace-actor-sheet workspace-card workspace-sheet-${role}`);
    sheet.dataset.sheetRole = role;
    const heading = node('div', 'workspace-sheet-heading');
    const actorLabel = !context.started ? 'Personnage actif' : participant?.id === context.turnActor?.id ? 'Au tour de' : 'Agit hors tour';
    const roleLabel = rubric(isTarget ? 'Cible' : actorLabel, 'p');
    if (!participant) {
      sheet.classList.add('is-empty');
      sheet.append(roleLabel, node('p', 'workspace-muted', isTarget
        ? 'Aucune cible : choisissez-la sous « Cible » dans Résolution.'
        : 'Aucun combattant en jeu.'));
      return sheet;
    }
    sheet.dataset.actorId = participant.id;
    const preview = state.resolution.preview;
    const hit = isTarget && preview && preview.targetId === participant.id ? preview : null;

    const identity = node('div', 'workspace-sheet-identity');
    identity.append(roleLabel);
    const nameRow = node('div', 'workspace-sheet-name-row');
    nameRow.append(node('h2', 'workspace-sheet-name combatant-name', participant.name), campChip(participant, context.camp));
    identity.appendChild(nameRow);
    const hp = node('p', 'workspace-sheet-hp num');
    hp.append(node('span', 'workspace-sheet-hp-label', 'PV'), ' ', hpText(participant));
    if (hit?.damage || hit?.critical?.application?.extraWounds) hp.appendChild(node('span', 'workspace-sheet-hp-after', ` → ${minusSigned((Number(participant.hp) || 0) - previewHpLoss(hit))}`));
    heading.append(identity, hp);
    sheet.append(heading, hpBar(participant));

    const amount = state.hpAmounts[participant.id] ?? '1';
    const hpControls = node('div', 'workspace-hp-controls');
    const minus = button('−', 'workspace-secondary', { 'data-focus-key': `hp-minus-${participant.id}` });
    const plus = button('+', 'workspace-secondary', { 'data-focus-key': `hp-plus-${participant.id}` });
    const quantity = document.createElement('input');
    quantity.type = 'number'; quantity.min = '1'; quantity.value = amount;
    quantity.className = 'workspace-hp-amount';
    quantity.setAttribute('aria-label', `Quantité de PV pour ${participant.name}`);
    quantity.dataset.focusKey = `hp-amount-${participant.id}`;
    const labelControls = () => {
      const value = Math.max(1, Math.floor(Number(state.hpAmounts[participant.id] ?? '1')) || 1);
      minus.setAttribute('aria-label', `−${value} PV pour ${participant.name}`);
      plus.setAttribute('aria-label', `+${value} PV pour ${participant.name}`);
      minus.dataset.hpDelta = String(-value);
      plus.dataset.hpDelta = String(value);
    };
    quantity.addEventListener('input', () => { state.hpAmounts[participant.id] = quantity.value; labelControls(); });
    [minus, plus].forEach(control => {
      control.dataset.workspaceAction = 'adjust-hp';
      control.dataset.actorId = participant.id;
      control.disabled = state.actionBusy || !callbacks.adjustHp;
      if (!callbacks.adjustHp) control.title = 'Contrôle indisponible sans callback applicatif';
    });
    labelControls();
    hpControls.append(minus, quantity, plus);
    sheet.appendChild(hpControls);

    const caracs = participant.caracs || {};
    const value = key => (Number.isFinite(Number(caracs[key])) && caracs[key] !== null && caracs[key] !== '' ? Number(caracs[key]) : null);
    const bonus = (key, bonusKey) => value(bonusKey) ?? (value(key) === null ? null : Math.floor(value(key) / 10));
    const pair = (key, bonusKey) => (value(key) === null ? '—' : `${value(key)} · ${bonus(key, bonusKey)}`);
    // Sans caractéristique I, l'initiative du combattant en tient lieu.
    const initiative = participant.initiative !== null && participant.initiative !== '' && Number.isFinite(Number(participant.initiative)) ? Number(participant.initiative) : '—';
    const grid = node('dl', 'workspace-caracs');
    [['CC', value('CC') ?? '—'], ['CT', value('CT') ?? '—'], ['F · BF', pair('F', 'BF')], ['E · BE', pair('E', 'BE')], ['I', value('I') ?? initiative], ['Ag', value('Ag') ?? '—']]
      .forEach(([label, content]) => {
        const cell = node('div', `workspace-carac${label === 'E · BE' ? ' is-key' : ''}`);
        cell.append(node('dt', '', label), node('dd', 'num', String(content)));
        grid.appendChild(cell);
      });
    sheet.appendChild(grid);

    const body = node('div', 'workspace-sheet-body');
    body.appendChild(renderSilhouette({ armor: participant.armor, location: hit?.location || null, name: participant.name }));
    const states = node('div', 'workspace-sheet-states');
    states.appendChild(rubric('États', 'p'));
    const list = node('div', 'workspace-state-list');
    normalizeEffects(participant.states).forEach((item, index) => {
      const entry = node('span', 'workspace-state-chip');
      entry.appendChild(node('span', '', stateLabel(item)));
      const remove = button('×', 'workspace-state-remove', {
        'aria-label': `Retirer ${item.name} de ${participant.name}`,
        'data-focus-key': `state-remove-${participant.id}-${index}`
      });
      remove.dataset.workspaceAction = 'remove-state';
      remove.dataset.actorId = participant.id;
      remove.dataset.stateIndex = String(index);
      remove.disabled = !callbacks.setStates;
      entry.appendChild(remove);
      list.appendChild(entry);
    });
    const formOpen = state.stateForm?.participantId === participant.id;
    const add = button('+ état', 'workspace-state-add', {
      'aria-label': `Ajouter un état à ${participant.name}`,
      'aria-expanded': String(formOpen),
      'data-focus-key': `state-add-${participant.id}`
    });
    add.dataset.workspaceAction = 'open-state-form';
    add.dataset.actorId = participant.id;
    add.disabled = !callbacks.setStates;
    list.appendChild(add);
    states.appendChild(list);
    if (formOpen) states.appendChild(renderStateForm(participant));
    body.appendChild(states);
    sheet.appendChild(body);

    const actionsRow = node('div', 'workspace-inline-actions');
    const edit = button('Modifier', 'workspace-secondary', { 'aria-label': `Modifier ${participant.name}`, 'data-focus-key': `edit-${participant.id}` });
    edit.dataset.workspaceAction = 'edit-participant';
    edit.dataset.actorId = participant.id;
    edit.disabled = state.actionBusy || !callbacks.editParticipant;
    if (!callbacks.editParticipant) edit.title = 'Action indisponible';
    actionsRow.appendChild(edit);
    const remove = defeatedParticipantButton(participant, `remove-${participant.id}`);
    if (remove) actionsRow.appendChild(remove);
    sheet.appendChild(actionsRow);
    return sheet;
  }

  function calculationError(error) {
    const field = error instanceof ResolutionError || error?.name === 'ResolutionError'
      ? (validRoll(state.resolution.attackRoll) ? 'defense' : 'attack') : 'general';
    return { field, message: userMessage(error, 'Calcul impossible : vérifiez l’action et les jets saisis.') };
  }

  const resolutionHandlers = {
    select(patch) {
      const draft = state.resolution;
      if ('targetId' in patch) {
        state.targetChoice = patch.targetId;
        draft.defenseBase = null;
      }
      if ('actionKey' in patch && patch.actionKey !== draft.actionKey) { draft.actionKey = patch.actionKey; draft.type = null; }
      if ('type' in patch) draft.type = patch.type;
      if ('defenseStat' in patch) { draft.defenseStat = patch.defenseStat; draft.defenseBase = null; }
      resetCritical(draft);
      draft.preview = null;
      draft.comparison = null;
      draft.error = null;
      render();
    },
    input(field, value) {
      const draft = state.resolution;
      draft[field] = value;
      // Only the first keystroke after a result re-renders; the others just
      // feed the draft, so no character can be lost.
      if (draft.preview || draft.comparison || draft.error) {
        resetCritical(draft);
        draft.preview = null;
        draft.comparison = null;
        draft.error = null;
        render();
      }
    },
    roll(field) {
      const draft = state.resolution;
      draft[field === 'attack' ? 'attackRoll' : 'defenseRoll'] = String(d100());
      resetCritical(draft);
      draft.preview = null;
      draft.comparison = null;
      draft.error = null;
      render();
    },
    // Saisie d'un jet de critique : alimente le brouillon sans vider l'aperçu ni re-rendre
    // (aucune frappe perdue) ; seule une erreur affichée sous le champ est retirée.
    criticalInput(field, value) {
      const draft = state.resolution;
      if (draft[field] !== value) forgetDeclined(draft, field);
      draft[field] = value;
      const name = CRITICAL_ERROR_FIELDS[field];
      if (draft.criticalErrors[name]) {
        delete draft.criticalErrors[name];
        render();
      }
    },
    criticalRoll(field) {
      forgetDeclined(state.resolution, field);
      state.resolution[field] = String(d100());
      resolutionHandlers.calculate();
    },
    // Sortie d'un champ : recalcul différé, pour ne pas remplacer le bouton visé pendant le clic ;
    // un appui encore en cours (clic long) fait attendre le relâchement.
    criticalChange() {
      setTimeout(() => {
        if (press.active) press.waiting = true;
        else recalculateCritical();
      }, 200);
    },
    criticalToggle(id, checked) {
      const draft = state.resolution;
      draft.criticalDeclined = draft.criticalDeclined.filter(item => item !== id);
      if (!checked) draft.criticalDeclined.push(id);
      resolutionHandlers.calculate(`critical-item-${id}`);
    },
    calculate(focusKey = null) {
      const context = playContext();
      const draft = state.resolution;
      if (!context.actor || !context.action || typeof Store.previewResolution !== 'function' || draft.busy) return;
      const input = {
        actor: context.actor,
        action: { ...context.action, type: context.type },
        targetId: context.target?.id || null,
        roll: String(draft.attackRoll).trim()
      };
      if (context.type === 'attack' && context.target && String(draft.defenseRoll).trim()) {
        input.defense = { roll: String(draft.defenseRoll).trim(), base: draft.defenseBase ?? 0, label: context.defense.option.statLabel };
      }
      // Seuls les jets de critique valides partent au moteur ; les autres montrent l'erreur sous leur champ.
      const criticalRolls = {};
      draft.criticalErrors = {};
      Object.entries(CRITICAL_ERROR_FIELDS).forEach(([key, name]) => {
        const raw = String(draft[key]).trim();
        if (!raw) return;
        if (validRoll(raw)) criticalRolls[name] = raw;
        else draft.criticalErrors[name] = criticalRollError();
      });
      if (Object.keys(criticalRolls).length) input.criticalRolls = criticalRolls;
      if (draft.criticalDeclined.length) input.criticalDeclined = [...draft.criticalDeclined];
      draft.error = null;
      draft.comparison = null;
      try {
        draft.preview = Store.previewResolution(input);
      } catch (error) {
        draft.preview = null;
        draft.error = calculationError(error);
      }
      render(draft.error && draft.error.field !== 'general' ? `roll-${draft.error.field}` : focusKey);
    },
    // Mêmes jets pour chaque cible possible (adversaires puis alliés), sans rien
    // appliquer. Le jet de défense, s'il est saisi, est opposé à la valeur de
    // défense propre à chaque cible.
    compare() {
      const context = playContext();
      const draft = state.resolution;
      if (!context.actor || !context.action || typeof Store.previewResolution !== 'function' || draft.busy) return;
      const roll = String(draft.attackRoll).trim();
      const defenseRoll = String(draft.defenseRoll).trim();
      draft.preview = null;
      // Les jets de critique visaient l'aperçu remplacé par la comparaison.
      resetCritical(draft);
      draft.error = null;
      try {
        draft.comparison = [...context.groups.adversaries, ...context.groups.allies].map(target => {
          const input = { actor: context.actor, action: { ...context.action, type: context.type }, targetId: target.id, roll };
          if (context.type === 'attack' && defenseRoll) {
            // Même choix que pour la cible courante s'il existe chez elle, sinon son défaut ; la cible
            // courante garde la valeur affichée (saisie à la main comprise), comme pour « Calculer ».
            const { option } = defenseChoice(target);
            const shown = option.value === 'Autre' || target.id === context.target?.id ? draft.defenseBase : null;
            input.defense = { roll: defenseRoll, base: (shown ?? option.base) ?? 0, label: option.statLabel };
          }
          return { targetId: target.id, name: target.name, hp: target.hp, preview: Store.previewResolution(input) };
        });
      } catch (error) {
        draft.comparison = null;
        draft.error = calculationError(error);
      }
      render(draft.error && draft.error.field !== 'general' ? `roll-${draft.error.field}` : 'compare');
    },
    choose(targetId) {
      const draft = state.resolution;
      const entry = draft.comparison?.find(item => item.targetId === targetId);
      if (!entry || draft.busy) return;
      state.targetChoice = targetId;
      // playContext relit la valeur de défense de la nouvelle cible ; « Autre » garde la saisie.
      if (draft.defenseStat !== 'Autre') draft.defenseBase = null;
      draft.preview = entry.preview;
      draft.comparison = null;
      render('apply');
    },
    async apply() {
      const draft = state.resolution;
      if (!draft.preview || !callbacks.applyResolution || draft.busy) return;
      // Clic direct sur « Appliquer » après avoir tapé un jet de critique : l'aperçu est
      // d'abord recalculé et montré, rien n'est appliqué avec l'ancien.
      if (criticalRollsChanged(draft)) { resolutionHandlers.calculate('apply'); return; }
      draft.busy = true;
      render();
      let focusKey = 'apply';
      try {
        const result = await callbacks.applyResolution(draft.preview);
        if (result?.status === 'stale') {
          draft.error = { field: 'general', message: 'La partie a changé depuis le calcul : recalculez.' };
          focusKey = 'calculate';
        } else {
          draft.attackRoll = '';
          draft.defenseRoll = '';
          focusKey = 'roll-attack';
        }
        draft.preview = null;
        if (result?.status !== 'stale') resetCritical(draft);
      } catch (error) {
        draft.error = { field: 'apply', message: userMessage(error, 'Résultat non appliqué : recalculez, puis réessayez.') };
      } finally {
        draft.busy = false;
        render(focusKey);
      }
    },
    cancel() {
      resetCritical(state.resolution);
      state.resolution.preview = null;
      state.resolution.comparison = null;
      state.resolution.error = null;
      render('calculate');
    }
  };

  function renderCenter(context) {
    const center = play.center;
    center.replaceChildren();
    if (!context.participants.length) {
      const empty = node('div', 'workspace-empty workspace-card workspace-play-empty');
      empty.appendChild(node('h2', '', 'Aucune rencontre en cours'));
      const prepare = button('Préparer une rencontre', 'workspace-primary', { 'data-focus-key': 'begin-encounter' });
      prepare.dataset.workspaceAction = 'begin-encounter';
      prepare.disabled = !callbacks.beginEncounter;
      if (!callbacks.beginEncounter) prepare.title = 'Action indisponible';
      empty.append(prepare, node('p', 'workspace-muted', 'ou ajoutez un profil depuis le panneau Profils'));
      center.appendChild(empty);
      const prepared = encounterList({ compact: true });
      if (prepared.list) center.append(rubric('Rencontres préparées'), prepared.list);
      return;
    }
    const duel = node('div', 'workspace-duel');
    duel.append(renderSheet(context.actor, 'actor', context), renderSheet(context.target, 'target', context));
    center.appendChild(duel);

    const draft = state.resolution;
    center.appendChild(renderResolutionPanel({
      draft,
      actor: context.actor,
      actions: context.actions,
      actionKey: draft.actionKey,
      type: context.type,
      target: context.target,
      groups: context.groups,
      defense: context.defense,
      canCalculate: typeof Store.previewResolution === 'function',
      canApply: Boolean(callbacks.applyResolution),
      handlers: resolutionHandlers
    }));

    if (callbacks.renderOverview) {
      const content = node('div', 'workspace-pending-content');
      const rendered = callbacks.renderOverview(content);
      if (rendered instanceof Node) content.appendChild(rendered);
      else if (typeof rendered === 'string' && rendered) content.textContent = rendered;
      if (content.childNodes.length) {
        const pending = node('section', 'workspace-pending workspace-card');
        pending.setAttribute('aria-label', 'À traiter');
        pending.append(rubric('À traiter'), content);
        center.appendChild(pending);
      }
    }
  }

  function renderProfilesTab(content) {
    let list = content.querySelector('.workspace-side-profiles');
    if (!list) {
      const search = document.createElement('input');
      search.type = 'search';
      search.className = 'workspace-search workspace-side-search';
      search.placeholder = 'Rechercher un profil…';
      search.setAttribute('aria-label', 'Rechercher un profil à ajouter');
      search.value = state.sideQuery;
      list = node('ul', 'workspace-side-profiles');
      search.addEventListener('input', () => { state.sideQuery = search.value; renderProfilesTab(content); });
      content.replaceChildren(search, list);
    }
    list.replaceChildren();
    const term = profileSearchText({ name: state.sideQuery });
    const profiles = readProfiles(Store).filter(profile => profileSearchText(profile).includes(term));
    if (!profiles.length) list.appendChild(node('li', 'workspace-muted', 'Aucun profil correspondant.'));
    profiles.forEach(profile => {
      const item = node('li', 'workspace-side-profile');
      const text = node('div', 'workspace-side-profile-text');
      text.append(
        node('span', 'combatant-name', profile.name || 'Sans-nom'),
        node('span', 'workspace-muted num', `${profile.kind || 'Créature'} · Init\u00a0${profile.initiative ?? 0} · PV\u00a0${profile.hp ?? 0} · BE\u00a0${toughnessBonus(profile)}`)
      );
      const add = button('+ Au combat', 'workspace-secondary', { 'aria-label': `Ajouter ${profile.name} au combat` });
      add.dataset.workspaceAction = 'add-profile-to-combat';
      add.dataset.profileId = profile.id;
      add.disabled = !callbacks.addProfileToCombat;
      if (!callbacks.addProfileToCombat) add.title = 'Action indisponible';
      item.append(text, add);
      list.appendChild(item);
    });
  }

  function renderRenderer(renderer, content, fallback) {
    if (!renderer) {
      content.replaceChildren(node('p', 'workspace-muted', fallback));
      return;
    }
    const rendered = renderer(content);
    if (rendered instanceof Node) content.appendChild(rendered);
    else if (typeof rendered === 'string') content.textContent = rendered;
  }

  // The play layout is built once: the side panel keeps its DOM (search,
  // filters, focus) while the track and the centre are re-rendered.
  const play = (() => {
    const grid = node('div', 'workspace-play-grid');
    const track = node('aside', 'workspace-track-column');
    track.setAttribute('aria-label', 'Piste des tours');
    const center = node('div', 'workspace-center');
    const side = initSidePanel({
      tabs: [
        { id: 'rules', label: 'Règles', render: content => renderRenderer(callbacks.renderRules, content, 'Les règles et mots-clés restent consultables sans modifier la séance.') },
        { id: 'profiles', label: 'Profils', render: renderProfilesTab },
        { id: 'log', label: 'Journal', render: content => renderRenderer(callbacks.renderLog, content, 'Aucun événement récent.') }
      ],
      onToggle: collapsed => grid.classList.toggle('is-side-collapsed', collapsed)
    });
    grid.append(track, center, side.element);
    refs.play.appendChild(grid);
    return { grid, track, center, side };
  })();

  function renderPlay() {
    const context = playContext();
    renderTrack(context);
    renderCenter(context);
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

  // The whole view is rebuilt on every Bus event: the focused control is found
  // again through its data-focus-key, with its caret position.
  function captureFocus() {
    const active = document.activeElement;
    if (!active || !refs.root.contains(active) || !active.dataset?.focusKey) return null;
    let start = null;
    let end = null;
    try { start = active.selectionStart ?? null; end = active.selectionEnd ?? null; } catch { /* champ sans sélection */ }
    return { key: active.dataset.focusKey, start, end };
  }

  function restoreFocusKey(saved) {
    if (!saved) return;
    const element = refs.root.querySelector(`[data-focus-key="${CSS.escape(saved.key)}"]`);
    if (!element || element.disabled || element === document.activeElement) return;
    element.focus({ preventScroll: true });
    if (saved.start !== null && typeof element.setSelectionRange === 'function') {
      try { element.setSelectionRange(saved.start, saved.end); } catch { /* type sans sélection */ }
    }
  }

  function render(focusKey = null) {
    const saved = focusKey ? { key: focusKey, start: null, end: null } : captureFocus();
    renderTabs();
    refs.prepare.hidden = state.space !== 'prepare';
    refs.play.hidden = state.space !== 'play';
    refs.library.hidden = state.space !== 'library';
    renderPrepare();
    renderPlay();
    renderLibrary();
    restoreFocusKey(saved);
  }

  function selectActor(id) {
    state.actorChoice = { id, turn: turnKey(readCombat(Store)) };
    render();
  }

  function rememberFocus(target) {
    state.lastFocus = target;
    state.lastFocusSpace = target?.dataset.workspaceSpace || null;
    state.lastFocusAction = target?.dataset.workspaceAction || null;
  }

  function updateStates(participantId, next, focusKey) {
    return Promise.resolve(callbacks.setStates(participantId, next))
      .then(() => { state.stateForm = null; render(focusKey); })
      .catch(error => {
        if (state.stateForm) state.stateForm.error = userMessage(error, 'État non enregistré : réessayez.');
        render();
      });
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
      // Une ligne de la piste désigne le personnage actif (fiche de gauche, actions) ; la cible se choisit dans Résolution.
      state.space = 'play';
      selectActor(target.dataset.workspaceSelect);
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
    const participantId = target.dataset.actorId;
    const participant = participantId ? readParticipants(Store).find(item => item.id === participantId) : null;
    switch (action) {
      case 'begin-encounter': callbacks.beginEncounter(); break;
      case 'edit-encounter': callbacks.editEncounter?.(target.dataset.encounterId); break;
      case 'launch-encounter': callbacks.launchEncounter?.(target.dataset.encounterId); break;
      case 'delete-encounter':
        // Le bouton cliqué disparaît avec la carte : le focus revient à « Nouvelle rencontre ».
        Promise.resolve(callbacks.deleteEncounter?.(target.dataset.encounterId)).then(done => { if (done) render('new-encounter'); }, noop);
        break;
      case 'resume-scene': callbacks.resumeScene?.(target.dataset.sceneId); break;
      case 'suspend-scene': {
        // « Suspendre » laisse place à « Reprendre » sur la même carte.
        const id = target.dataset.encounterId;
        Promise.resolve(callbacks.suspendScene?.()).then(done => { if (done) render(`resume-scene-${id}`); }, noop);
        break;
      }
      case 'restart-combat':
        Promise.resolve(callbacks.restartCombat?.()).then(done => { if (done) render(`restart-combat-${target.dataset.encounterId}`); }, noop);
        break;
      case 'show-play': callbacks.showPlay?.(); break;
      case 'create-profile': callbacks.createProfile?.(); break;
      case 'edit-profile': callbacks.editProfile(target.dataset.profileId); break;
      case 'duplicate-profile': callbacks.duplicateProfile?.(target.dataset.profileId); break;
      case 'remove-profile': callbacks.removeProfile?.(target.dataset.profileId); break;
      case 'edit-participant': callbacks.editParticipant(participantId); break;
      case 'remove-participant':
        if (canRemoveDefeated(participant)) {
          target.disabled = true;
          Promise.resolve(callbacks.removeParticipant?.(participantId)).then(() => render(), () => { target.disabled = false; });
        }
        break;
      case 'adjust-hp': callbacks.adjustHp?.({ participantId, delta: Number(target.dataset.hpDelta) }); break;
      case 'enter-participant': callbacks.enterParticipant?.(participantId); break;
      case 'add-profile-to-combat': callbacks.addProfileToCombat?.(target.dataset.profileId); break;
      case 'open-state-form':
        state.stateForm = state.stateForm?.participantId === participantId
          ? null
          : { participantId, name: STATE_NAMES[0], level: '1', duration: '', error: '' };
        render(state.stateForm ? 'state-form-name' : null);
        break;
      case 'cancel-state': {
        const id = state.stateForm?.participantId;
        state.stateForm = null;
        render(id ? `state-add-${id}` : null);
        break;
      }
      case 'add-state': {
        if (!participant || !state.stateForm) break;
        const form = state.stateForm;
        const added = { id: `state-${uid()}`, name: form.name, level: Number(form.level) || 1, duration: form.duration === '' ? null : Number(form.duration), source: { kind: 'manual' } };
        updateStates(participantId, [...normalizeEffects(participant.states), added], `state-add-${participantId}`);
        break;
      }
      case 'remove-state': {
        if (!participant) break;
        const index = Number(target.dataset.stateIndex);
        updateStates(participantId, normalizeEffects(participant.states).filter((_, position) => position !== index), `state-add-${participantId}`);
        break;
      }
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
    if (event.key === 'Escape' && state.stateForm && event.target.closest('.workspace-state-form')) {
      event.preventDefault();
      event.stopPropagation();
      const id = state.stateForm.participantId;
      state.stateForm = null;
      render(`state-add-${id}`);
    }
  });

  const rerender = () => {
    render();
    play.side.refresh('profiles');
    play.side.refresh('log');
  };
  ['reserve', 'combat', 'combat:update', 'log'].forEach(event => Bus?.on?.(event, rerender));
  render();

  return Object.freeze({
    render,
    setSpace(space) {
      if (!WORKSPACE_SPACES.includes(space)) throw new RangeError(`Espace inconnu : ${space}`);
      state.space = space;
      render();
    },
    selectActor,
    selectTarget(id) {
      state.targetChoice = id || 'none';
      state.resolution.defenseBase = null;
      resetCritical(state.resolution);
      state.resolution.preview = null;
      render();
    },
    openContext(kind) {
      if (!['rules', 'log', 'profiles'].includes(kind)) throw new RangeError(`Panneau inconnu : ${kind}`);
      play.side.open(kind);
    },
    closeContext() {
      play.side.collapse();
    },
    getViewState() {
      return { ...state, sidePanel: play.side.getState() };
    }
  });
}
