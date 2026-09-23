import { APP_VERSION } from './version.js';
import { Bus } from './ui/bus.js';
import { DOM, qs, on } from './ui/dom.js';
import { createStore } from './core/store.js';
import { Profile, uid } from './core/models.js';
import { createPersistence } from './core/persistence.js';
import { createCombatEngine } from './core/combat.js';
import { d100 } from './core/dice.js';
import { initReserveUI } from './ui/reserve.js';
import { initImportModalUI } from './ui/import-modal.js';
import { initCardUI } from './ui/card.js';
import { initCombatViewUI } from './ui/combat-view.js';
import { runDiceLine } from './ui/dice-line.js';
import { renderReferenceTables } from './ui/rules-view.js';
import { renderLog, initLogViewUI } from './ui/log-view.js';
import { showToast } from './ui/toast.js';
import { initKeyboardShortcuts } from './ui/keyboard.js';
import { initThemeManager } from './ui/theme.js';
import { initWorkspaceView } from './ui/workspace-view.js';
import { initPrepareView } from './ui/prepare-view.js';
import { initClosureView } from './ui/closure-view.js';
import { initSimulationView } from './ui/simulation-view.js';
import { initTextImportView } from './ui/import-text-view.js';
import { createActionEditor } from './ui/action-editor.js';
import { createEncounter, normalizeEncounter } from './core/encounters.js';
import { deriveReminders, pendingReminders, resolveReminder, REMINDER_DECISIONS } from './core/reminders.js';
import { createScene, proposeSceneEvent } from './core/scene-events.js';
import { normalizeEffects, normalizeState } from './core/effects.js';
import { compareSimulationTargets } from './core/simulation.js';

function updateLocalStatus(status) {
  const el = qs('#local-status');
  const labels = {
    loading: 'Local : vérification…',
    saving: 'Local : sauvegarde…',
    unavailable: 'Local : indisponible',
    saved: 'Local : enregistré',
    error: 'Local : erreur de sauvegarde'
  };
  if (el) {
    el.textContent = labels[status] || status;
    el.dataset.status = status;
  }
}

function updateSyncStatus(status) {
  const el = qs('#sync-status');
  const labels = {
    connecting: 'Connexion…',
    pending: 'En attente d’envoi',
    sending: 'Synchronisation…',
    synced: 'Synchronisé',
    connected: 'Connecté',
    ready: 'Session prête',
    transition: 'Migration de la file…',
    conflict: 'Conflit à résoudre',
    signedOut: 'Mode invité — local uniquement',
    offline: 'Hors ligne — synchronisation suspendue',
    error: 'Erreur distante — nouvelle tentative'
  };
  if (el) {
    el.textContent = labels[status] || status;
    el.dataset.status = status;
  }
}

let appPersistence = null;
const persistenceFactory = contextId => createPersistence({ contextId });
try {
  if (typeof indexedDB !== 'undefined') {
    appPersistence = persistenceFactory('guest');
  }
} catch (error) {
  console.warn('⚠️ Persistance IndexedDB indisponible:', error);
}

// Init Store & Engine
export const Store = createStore({
  storage: typeof localStorage !== 'undefined' ? localStorage : null,
  sync: null, // Sera injecté lors de la connexion Firebase
  persistence: appPersistence,
  persistenceFactory: typeof indexedDB !== 'undefined' ? persistenceFactory : null,
  contextId: 'guest',
  appVersion: APP_VERSION,
  bus: Bus,
  onSyncStatus: updateSyncStatus,
  onLocalStatus: updateLocalStatus
});

// Ne rendre les commandes actives qu’après réhydratation complète. Cela évite
// qu’un Store vide en mémoire n’écrase une sauvegarde IndexedDB asynchrone.
const storeReady = await Store.ready;
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const refreshHistoryButtons = () => {
  if (btnUndo) btnUndo.disabled = !Store.canUndo();
  if (btnRedo) btnRedo.disabled = !Store.canRedo?.();
};
btnUndo?.addEventListener('click', () => { if (Store.undo()) refreshHistoryButtons(); });
btnRedo?.addEventListener('click', () => { if (Store.redo?.()) refreshHistoryButtons(); });

// L’espace de travail local est disponible immédiatement. L’adaptateur distant
// est chargé ensuite afin qu’un SDK lent ou indisponible ne bloque pas l’interface.
const loginScreen = document.getElementById('login-screen');
const appContent = document.getElementById('app-content');
if (loginScreen) loginScreen.style.display = 'none';
if (appContent) appContent.style.display = 'block';
if (!appPersistence) updateLocalStatus('unavailable');
if (storeReady?.ok === false) {
  if (appContent) appContent.dataset.recovery = 'true';
  showToast('Lecture locale impossible : exportez ce qui reste en mémoire ou réessayez après correction du stockage.', 'error', {
    label: 'Réessayer',
    onClick: async () => {
      updateLocalStatus('loading');
      const retry = await Store.retryHydration();
      if (retry?.ok) {
        if (appContent) delete appContent.dataset.recovery;
        updateLocalStatus('saved');
        showToast('Lecture locale rétablie.', 'success');
        Bus.emit('reserve'); Bus.emit('combat'); Bus.emit('log');
      } else {
        updateLocalStatus('error');
        showToast('Le stockage local reste indisponible.', 'error');
      }
    }
  });
}
updateSyncStatus('signedOut');

if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
  let updateToastShown = false;
  const notifyUpdateAvailable = () => {
    if (updateToastShown) return;
    updateToastShown = true;
    // Cette notification doit rester visible jusqu'à une décision explicite.
    showToast('Une mise à jour est prête.', 'info', {
      label: 'Actualiser',
      onClick: () => {
        if (qs('#local-status')?.dataset.status !== 'saved') {
          updateToastShown = false;
          showToast('Mise à jour reportée : la sauvegarde locale n’est pas confirmée.', 'warning');
          notifyUpdateAvailable();
          return;
        }
        navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
        navigator.serviceWorker.ready.then(registration => {
          registration.waiting?.postMessage({ type: 'wfrp-activate-update' });
        });
      }
    }, 0);
  };
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type !== 'wfrp-update-ready') return;
    notifyUpdateAvailable();
  });
  navigator.serviceWorker.ready.then(registration => {
    let observedInstalling = null;
    const watchInstallation = () => {
      const installing = registration.installing;
      if (!installing || installing === observedInstalling) return;
      observedInstalling = installing;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && registration.waiting) notifyUpdateAvailable();
      });
    };
    // The worker may already be installing when `ready` resolves; observe it
    // immediately as well as workers announced by later updatefound events.
    watchInstallation();
    registration.addEventListener('updatefound', watchInstallation);
    if (registration.waiting) notifyUpdateAvailable();
  });
}

let remoteAdapterStarting = false;
let remoteAdapterLoaded = false;
let remoteAdapterAttempt = 0;
function startRemoteAdapter() {
  if (remoteAdapterStarting || remoteAdapterLoaded) return;
  remoteAdapterStarting = true;
  const retryQuery = remoteAdapterAttempt === 0 ? '' : `?retry=${remoteAdapterAttempt}`;
  remoteAdapterAttempt++;
  updateSyncStatus('connecting');
  import(`./core/sync.js${retryQuery}`).then(({ initFirebaseSync }) => {
    initFirebaseSync(
      syncHandle => Store.attachSync(syncHandle),
      updateSyncStatus,
      () => {
        Store.detachSync();
        if (Store.switchContext) Store.switchContext('guest').catch(error => console.warn('Retour au contexte invité impossible:', error));
      }
    );
    remoteAdapterLoaded = true;
  }).catch(error => {
    console.warn('⚠️ Adaptateur Firebase indisponible — mode local conservé:', error);
    updateSyncStatus('offline');
  }).finally(() => { remoteAdapterStarting = false; });
}
if (typeof window !== 'undefined') window.addEventListener('online', startRemoteAdapter);

export const Combat = createCombatEngine(Store);

// Theme Manager (Lot 11.2)
initThemeManager();

// Version (Lot 10.6 : v3.5 court dans le bouton, titre complet au survol)
if (DOM.btnVersion) {
  DOM.btnVersion.textContent = `v${APP_VERSION}`;
  DOM.btnVersion.title = `Version ${APP_VERSION} - WFRP 4e Outil MJ`;
  DOM.btnVersion.addEventListener('click', () => {
    Store.log(`ℹ️ Application en version ${APP_VERSION}`);
    showToast(`Version ${APP_VERSION} active`, 'info');
  });
}

// Navigation par onglets ARIA (Lot 11.3)
function switchTab(tabName, workspaceSpace = null) {
  DOM.tabs.forEach(x => {
    const active = x.dataset.tab === tabName && (!workspaceSpace || x.dataset.workspaceSpace === workspaceSpace);
    x.classList.toggle('is-active', active);
    x.setAttribute('aria-selected', String(active));
    x.setAttribute('tabindex', active ? '0' : '-1');
  });
  Object.entries(DOM.panels).forEach(([key, panel]) => {
    if (panel) {
      panel.classList.toggle('is-active', key === tabName);
      panel.hidden = key !== tabName;
    }
  });
}

const tabArray = Array.from(DOM.tabs);
const activateWorkspaceTab = tab => {
  switchTab(tab.dataset.tab || 'workspace', tab.dataset.workspaceSpace || null);
  if (tab.dataset.workspaceSpace) workspaceView?.setSpace(tab.dataset.workspaceSpace);
  setWorkspaceToolsVisibility(tab.dataset.workspaceSpace || 'prepare');
  renderLaunchpad(tab.dataset.workspaceSpace || 'prepare');
};
tabArray.forEach((t, idx) => {
  t.addEventListener('click', () => activateWorkspaceTab(t));
  t.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const nextIdx = (idx + dir + tabArray.length) % tabArray.length;
      const nextTab = tabArray[nextIdx];
      if (nextTab && nextTab.dataset.tab) {
        activateWorkspaceTab(nextTab);
        nextTab.focus();
      }
    }
  });
});
switchTab('workspace', 'prepare');

// Init Sub-modules UI
let profileSavedHandler = null;
const reserveUI = initReserveUI(Store, { onSaved: payload => {
  if (!profileSavedHandler || profileSavedHandler.token !== payload?.editorToken) return;
  profileSavedHandler.fn(payload);
} });
const importModalUI = initImportModalUI(Store);
const cardUI = initCardUI(Store, Combat);
const combatViewUI = initCombatViewUI(Store, Combat, cardUI, (id) => runDiceLine(id, Store));

initLogViewUI(Store);
initKeyboardShortcuts(Store, Combat, switchTab);

// E09–E17 workspace integration. The pure modules remain behind callbacks so
// Store stays the only owner of live combat and reserve mutations.
let currentEncounter = Store.listEncounters?.()[0] || createEncounter({ title: 'Nouvelle rencontre' });

function requireStoreApi(name) {
  if (typeof Store[name] !== 'function') throw new Error(`Fonction Store indisponible : ${name}`);
  return Store[name].bind(Store);
}

async function awaitStore(operation, label = 'Opération locale') {
  const result = await operation;
  if (result?.ok === false) throw result.error || new Error(`${label} impossible.`);
  if (result === false) throw new Error(`${label} impossible.`);
  return result;
}

const reminderTransitionLabels = { endTurn: 'Fin de tour', startTurn: 'Début de tour' };
const reminderStatusLabels = { pending: 'À traiter', resolve: 'Résolu', ignore: 'Ignoré', snooze: 'Reporté', snoozed: 'Reporté' };
const reminderKindLabels = { endTurn: 'Fin de tour', startTurn: 'Début de tour', 'effect-expiring': 'État qui expire', 'automatic-announced': 'Effet automatique', consequence: 'Conséquence', reinforcement: 'Renfort' };
function readableReminder(item) {
  const transition = reminderTransitionLabels[item?.payload?.transitionType || item?.transitionType] || '';
  const kind = reminderKindLabels[item?.kind] || item?.kind || 'Rappel';
  const status = reminderStatusLabels[item?.status] || 'À traiter';
  return `${item?.text || 'Rappel'} · ${kind}${transition && transition !== kind ? ` · ${transition}` : ''} · ${status}`;
}
const sceneConditionLabels = { manual: 'À la demande', roundAtLeast: 'À partir du round', hpBelow: 'Quand les PV passent sous le seuil', participantDown: 'Quand le participant tombe à 0 PV', previousResolved: 'Après résolution d’un événement' };
const sceneConsequenceLabels = { note: 'annoncer une note', addState: 'ajouter un état', reinforcement: 'faire entrer un renfort', advanceClock: 'avancer une jauge' };
function readableSceneEvent(event, scene = {}) {
  const condition = event?.condition || {}; const consequence = event?.consequence || {};
  const participantName = id => (scene.participants || []).find(item => item.id === id)?.name || 'le participant sélectionné';
  const conditionText = condition.type === 'roundAtLeast' ? `${sceneConditionLabels.roundAtLeast} ${condition.round}`
    : condition.type === 'hpBelow' ? `${sceneConditionLabels.hpBelow} (${participantName(condition.participantId)}, ${condition.hp} PV)`
      : condition.type === 'participantDown' ? `${sceneConditionLabels.participantDown} (${participantName(condition.participantId)})`
        : condition.type === 'previousResolved' ? sceneConditionLabels.previousResolved : (sceneConditionLabels[condition.type] || 'Condition structurée');
  const consequenceText = consequence.type === 'addState' ? `${sceneConsequenceLabels.addState} « ${consequence.name || 'état'} » à ${participantName(consequence.participantId)}`
    : consequence.type === 'reinforcement' ? `${sceneConsequenceLabels.reinforcement} (${participantName(consequence.participantId)})`
      : consequence.type === 'advanceClock' ? `${sceneConsequenceLabels.advanceClock} « ${consequence.clockId || 'jauge'} »`
        : consequence.type === 'note' ? `${sceneConsequenceLabels.note} « ${consequence.text || ''} »` : 'appliquer une conséquence';
  return `${conditionText} : ${consequenceText}`;
}
const restoreReasonLabels = { 'restore-before': 'Avant restauration', 'import-before': 'Avant import', 'import-replace': 'Import remplacé', manual: 'Sauvegarde manuelle' };
const readableRestoreReason = reason => restoreReasonLabels[reason] || 'Point de restauration';
const restoreSourceLabels = { 'legacy-localStorage': 'Ancienne sauvegarde locale', 'snapshot-v2': 'Sauvegarde courante' };
const readableRestoreSource = source => restoreSourceLabels[source] || 'Sauvegarde locale';
function readableRestoreDate(value) {
  const date = value instanceof Date ? value : new Date(typeof value === 'number' ? value : String(value || ''));
  return Number.isNaN(date.getTime()) ? 'Date inconnue' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function storedScene() {
  return requireStoreApi('getActiveScene')();
}

function openOverlay(title, build) {
  const dialog = document.createElement('dialog');
  dialog.className = 'card';
  dialog.style.cssText = 'max-width:min(1100px,94vw); width:94vw; max-height:90vh; overflow:auto;';
  const heading = document.createElement('div'); heading.className = 'row';
  const label = document.createElement('h2'); label.textContent = title;
  const close = document.createElement('button'); close.type = 'button'; close.className = 'ghost'; close.textContent = 'Fermer';
  heading.append(label, close); dialog.appendChild(heading);
  const mount = document.createElement('div'); dialog.appendChild(mount);
  close.addEventListener('click', () => dialog.close());
  document.body.appendChild(dialog);
  build(mount, dialog);
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  return dialog;
}

function persistentCharacters() {
  return requireStoreApi('listPersistentCharacters')();
}

function openPrepareView() {
  return openOverlay('Préparer une rencontre', (mount, dialog) => {
    const view = initPrepareView({
      mount, Store, encounter: currentEncounter,
      savedEncounters: Store.listEncounters?.() || [],
      persistentCharacters: persistentCharacters(),
      callbacks: {
        getProfiles: () => Store.listProfiles(),
        onDraftChange: draft => { currentEncounter = normalizeEncounter(draft); },
        onSelectEncounter: encounter => { currentEncounter = normalizeEncounter(encounter); view.setDraft(currentEncounter); },
        onSave: async draft => { currentEncounter = normalizeEncounter(draft); await awaitStore(requireStoreApi('saveEncounter')(currentEncounter), 'Rencontre'); showToast('Rencontre enregistrée.', 'success'); },
        onDuplicate: async draft => { await awaitStore(requireStoreApi('saveEncounter')(normalizeEncounter(draft)), 'Rencontre'); currentEncounter = normalizeEncounter(draft); showToast('Rencontre dupliquée.', 'success'); },
        onDeleteEncounter: async id => { await awaitStore(requireStoreApi('deleteEncounter')(id), 'Suppression'); showToast('Rencontre supprimée.', 'success'); },
        onSavePersistentCharacter: async character => { await awaitStore(requireStoreApi('savePersistentCharacter')(character), 'Personnage'); showToast('Personnage persistant enregistré.', 'success'); },
        onDeletePersistentCharacter: async id => { await awaitStore(requireStoreApi('deletePersistentCharacter')(id), 'Suppression'); showToast('Personnage persistant supprimé.', 'success'); },
        onLaunch: async draft => {
          if (!draft.entries.length) throw new Error('Ajoutez au moins un profil à la composition avant de lancer.');
          await awaitStore(requireStoreApi('saveEncounter')(normalizeEncounter(draft)), 'Rencontre');
          await awaitStore(requireStoreApi('launchEncounter')(normalizeEncounter(draft)), 'Lancement');
          currentEncounter = normalizeEncounter(draft);
          dialog.close();
          switchTab('workspace', 'play'); workspaceView?.setSpace('play');
          showToast('Rencontre lancée dans la piste de séance.', 'success');
        },
        onResume: async id => { await awaitStore(requireStoreApi('resumeScene')(id), 'Reprise'); showToast('Séance reprise.', 'info'); },
        onSuspend: async () => { await awaitStore(requireStoreApi('suspendActiveScene')(), 'Suspension'); showToast('Séance suspendue.', 'info'); }
      }
    });
    view.render();
  });
}

function openCreateProfileView() {
  return openOverlay('Nouveau profil', (mount, dialog) => {
    const form = DOM.reserve.form;
    if (!form) throw new Error('Éditeur de profil indisponible.');
    const placeholder = document.createComment('form-add-placeholder');
    form.replaceWith(placeholder);
    reserveUI.resetForm?.();
    const editorToken = uid(); form.dataset.editorToken = editorToken;
    form.classList.add('card'); mount.appendChild(form);
    profileSavedHandler = { token: editorToken, fn: () => dialog.close() };
    const finish = () => { if (profileSavedHandler?.token === editorToken) profileSavedHandler = null; delete form.dataset.editorToken; if (placeholder.parentNode) placeholder.replaceWith(form); form.classList.remove('card'); reserveUI.resetForm?.(); };
    dialog.addEventListener('close', finish, { once: true });
    form.querySelector('[name=name]')?.focus();
  });
}

function renderLaunchpad(space = 'prepare') {
  const mount = qs('#workspace-launchpad');
  if (!mount) return;
  mount.replaceChildren(); mount.hidden = space !== 'prepare';
  if (mount.hidden) return;
  const title = document.createElement('strong'); title.textContent = 'Séance'; mount.appendChild(title);
  const newProfile = document.createElement('button'); newProfile.type = 'button'; newProfile.className = 'small'; newProfile.textContent = 'Nouveau profil'; newProfile.addEventListener('click', openCreateProfileView); mount.appendChild(newProfile);
  const active = Store.getActiveScene?.(); const suspended = Store.listSuspendedScenes?.() || []; const encounters = Store.listEncounters?.() || [];
  if (active) { const status = document.createElement('span'); status.className = 'muted'; status.textContent = `Scène active : ${active.title}`; mount.appendChild(status); }
  suspended.forEach(scene => { const resume = document.createElement('button'); resume.type = 'button'; resume.className = 'ghost small'; resume.textContent = `Reprendre ${scene.title}`; resume.disabled = Boolean(active); resume.addEventListener('click', async () => { resume.disabled = true; try { await awaitStore(requireStoreApi('resumeScene')(scene.id), 'Reprise'); workspaceView?.setSpace('play'); switchTab('workspace', 'play'); setWorkspaceToolsVisibility('play'); renderLaunchpad('play'); } catch (error) { resume.disabled = false; showToast(error.message, 'error'); } }); mount.appendChild(resume); });
  encounters.forEach(encounter => { const row = document.createElement('span'); row.className = 'workspace-launchpad-item'; row.textContent = `${encounter.title} · ${encounter.status || 'préparée'}`; const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'ghost small'; edit.textContent = 'Préparer'; edit.addEventListener('click', () => { currentEncounter = normalizeEncounter(encounter); openPrepareView(); }); const launch = document.createElement('button'); launch.type = 'button'; launch.className = 'small'; launch.textContent = 'Lancer'; launch.disabled = Boolean(active || encounter.status === 'active'); launch.addEventListener('click', async () => { launch.disabled = true; try { await awaitStore(requireStoreApi('launchEncounter')(encounter.id), 'Lancement'); workspaceView?.setSpace('play'); switchTab('workspace', 'play'); setWorkspaceToolsVisibility('play'); } catch (error) { launch.disabled = false; showToast(error.message, 'error'); } }); row.append(edit, launch); mount.appendChild(row); });
  const load = document.createElement('button'); load.type = 'button'; load.className = 'ghost small'; load.textContent = 'Charger une sauvegarde'; load.addEventListener('click', () => DOM.combat.btnLoadFile?.click()); mount.appendChild(load);
}

function setWorkspaceToolsVisibility(space) {
  const tools = qs('#workspace-tools'); if (!tools) return;
  const play = space === 'play'; const scene = Store.getActiveScene?.(); tools.hidden = false;
  ['workspace-simulate', 'workspace-reminders', 'workspace-events', 'workspace-archives'].forEach(id => { const button = qs(`#${id}`); if (button) button.hidden = !play; });
  const close = qs('#workspace-close-scene'); if (close) close.hidden = !play || !scene;
  const importer = qs('#workspace-import-text'); if (importer) importer.hidden = play;
}

function sceneFromStore() {
  return storedScene();
}

function downloadText(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

function openClosureView() {
  const scene = sceneFromStore();
  const characters = persistentCharacters();
  return openOverlay('Clôturer la séance', (mount, dialog) => {
    const view = initClosureView({
      mount, scene, persistentCharacters: characters,
      callbacks: {
        onPreview: preview => { if (!preview.ready) showToast('Choisissez une autorité pour chaque doublon.', 'warning'); },
        onApply: async (preview, options = {}) => {
          const result = await awaitStore(requireStoreApi('closeScene')({ preview, selections: options.selections, authorities: options.authorities }), 'Clôture');
          if (result?.status === 'stale') throw new Error('La scène a changé : prévisualisez à nouveau le report.');
          if (result?.status === 'conflict') throw new Error('Le report contient une ambiguïté non résolue.');
          dialog.close();
          showToast('Séance clôturée et report archivé localement.', 'success');
        },
        onCancel: () => dialog.close(),
        onExport: text => downloadText(`wfrp-seance-${new Date().toISOString().slice(0, 10)}.md`, text, 'text/markdown;charset=utf-8')
      }
    });
    view.render();
  });
}

function openSimulationView() {
  const combat = Store.getCombat();
  const participants = Store.listParticipants();
  const actor = participants.find(item => item.id === combat.currentActorId) || participants[0];
  if (!actor) throw new Error('Aucun acteur disponible pour la simulation.');
  const state = { revision: requireStoreApi('getLocalRevision')(), participants, appliedResolutionIds: [] };
  const actions = actor.actions || Store.getDiceLines().filter(line => line.participantId === actor.id);
  const targets = participants.filter(participant => participant.id !== actor.id);
  return openOverlay('Mode « et si… »', (mount, dialog) => {
    const view = initSimulationView({
      mount, state, actor, actions, targets,
      callbacks: {
        onPreview: () => {},
        onCompare: async ({ actor: compareActor, action, targets: compareTargets, roll }) => {
          const input = { actor: compareActor, action, roll, baseRevision: state.revision };
          if (typeof Store.compareSimulationTargets === 'function') return await Store.compareSimulationTargets({ ...input, targets: compareTargets }, compareTargets);
          return compareSimulationTargets({ revision: state.revision, participants }, input, compareTargets);
        },
        onApply: async simulation => {
          const result = await awaitStore(requireStoreApi('applySimulation')(simulation), 'Simulation');
          if (!result || result.status !== 'applied') return result;
          dialog.close(); showToast('Résultat de simulation appliqué.', 'success');
          return result;
        },
        onDiscard: () => dialog.close()
      }
    });
    view.render();
  });
}

function openResolutionView(participantId, actionId) {
  const actor = Store.getCombat().participants.get(participantId);
  const action = actor?.actions?.find(item => item.id === actionId) || Store.getDiceLines().find(item => item.id === actionId);
  if (!actor || !action) throw new Error('Action introuvable.');
  const targets = Store.listParticipants().filter(item => item.id !== actor.id);
  return openOverlay(`Résoudre : ${action.note || 'Action'}`, (mount, dialog) => {
    const form = document.createElement('form'); form.className = 'card';
    form.innerHTML = '<label>Type d’action<select name="type" required><option value="">Choisir…</option><option value="attack">Attaque</option><option value="skill">Compétence</option><option value="defense">Défense / esquive</option><option value="opposition">Opposition</option></select></label><label>Cible<select name="target"><option value="">Aucune cible</option></select></label><label>Jet d100<input name="roll" inputmode="numeric" placeholder="01–00" required></label><button type="submit">Prévisualiser</button><button type="button" class="ghost" name="virtual">Lancer d100</button>';
    const target = form.elements.target; targets.forEach(item => target.append(new Option(item.name, item.id)));
    const type = form.elements.type; if (['attack', 'skill', 'defense', 'opposition'].includes(action.type)) type.value = action.type;
    const virtual = form.elements.virtual; virtual.addEventListener('click', () => { form.elements.roll.value = String(d100()); form.requestSubmit(); });
    const previewBox = document.createElement('div'); mount.append(form, previewBox);
    let preview = null;
    form.addEventListener('submit', event => {
      event.preventDefault();
      try {
        if (!type.value) throw new Error('Choisissez le type d’action.');
        preview = requireStoreApi('previewResolution')({ actor, action: { ...action, type: type.value }, targetId: target.value || null, roll: form.elements.roll.value });
        previewBox.replaceChildren();
        const result = document.createElement('div'); result.className = 'card';
        const targetValue = preview.input?.target; const damage = preview.damage;
        result.textContent = [`${preview.success ? 'Réussite' : 'Échec'} · Jet ${preview.roll} · DR ${preview.sl}`, `Score : ${preview.score?.base ?? '—'} ${Number(preview.score?.mod || 0) >= 0 ? '+' : ''}${preview.score?.mod || 0} − ${preview.score?.statePenalty || 0} = ${preview.score?.target ?? '—'}`, targetValue ? `Cible : ${targetValue.name} · PV ${targetValue.hp}${damage ? ` → ${targetValue.hp - damage.finalDamage}` : ''}` : 'Aucune cible', preview.location ? `Localisation : ${preview.location.name}` : '', damage ? `Dégâts : ${damage.finalDamage}` : '', preview.critical?.kind || preview.fumble ? (preview.critical?.kind || 'Maladresse') : ''].filter(Boolean).join('\n');
        const details = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'Détails de la formule'; const raw = document.createElement('pre'); raw.textContent = JSON.stringify(preview, null, 2); details.append(summary, raw); result.appendChild(details);
        const apply = document.createElement('button'); apply.type = 'button'; apply.textContent = 'Appliquer les conséquences'; apply.addEventListener('click', async () => { apply.disabled = true; try { const applied = await awaitStore(requireStoreApi('applyResolution')(preview), 'Résolution'); if (!applied || !['applied', 'duplicate'].includes(applied.status)) throw new Error(applied?.status === 'stale' ? 'La partie a changé : prévisualisez à nouveau.' : 'Résolution non appliquée.'); dialog.close(); showToast(applied.status === 'duplicate' ? 'Résultat déjà appliqué.' : 'Conséquences appliquées.', 'success'); } catch (error) { apply.disabled = false; showToast(error.message, 'error'); } }); result.appendChild(apply); previewBox.appendChild(result);
      } catch (error) { previewBox.textContent = error.message; }
    });
  });
}

function openTextImportView() {
  return openOverlay('Importer des profils depuis du texte', (mount, dialog) => {
    const view = initTextImportView({
      mount,
      callbacks: {
        onImport: async (parsed, { confirmed = false } = {}) => {
          if (parsed.status !== 'ready' && !confirmed) throw new Error('Confirmez les champs absents ou ambigus avant import.');
          await awaitStore(requireStoreApi('importParsedProfiles')(parsed.profiles), 'Import');
          dialog.close(); showToast(`${parsed.profiles.length} profil(s) importé(s).`, 'success');
        },
        onCancel: () => dialog.close()
      }
    });
    view.render();
  });
}

function openArchivesView() {
  return openOverlay('Archives de séances', (mount, dialog) => {
    const render = () => {
      mount.replaceChildren();
      const archives = requireStoreApi('listArchives')();
      if (!archives.length) { const empty = document.createElement('p'); empty.textContent = 'Aucune séance archivée.'; mount.appendChild(empty); return; }
      archives.slice().reverse().forEach(archive => {
        const row = document.createElement('article'); row.className = 'card';
        const title = document.createElement('h3'); title.textContent = archive.title || 'Séance';
        const meta = document.createElement('p'); meta.textContent = `${archive.createdAt || 'Date inconnue'} · Round ${archive.round ?? 0} · ${archive.reports?.length || 0} report(s)`;
        const markdown = document.createElement('button'); markdown.type = 'button'; markdown.className = 'ghost small'; markdown.textContent = 'Exporter Markdown';
        markdown.addEventListener('click', () => downloadText(`wfrp-archive-${archive.id}.md`, requireStoreApi('exportArchive')(archive.id, 'markdown'), 'text/markdown;charset=utf-8'));
        const json = document.createElement('button'); json.type = 'button'; json.className = 'ghost small'; json.textContent = 'Exporter JSON';
        json.addEventListener('click', () => downloadText(`wfrp-archive-${archive.id}.json`, requireStoreApi('exportArchive')(archive.id, 'json'), 'application/json'));
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger ghost small'; remove.textContent = 'Supprimer';
        remove.addEventListener('click', async () => { remove.disabled = true; try { await awaitStore(requireStoreApi('deleteArchive')(archive.id), 'Suppression'); render(); } catch (error) { remove.disabled = false; showToast(`Archive non supprimée : ${error.message}`, 'error'); } });
        row.append(title, meta, markdown, json, remove); mount.appendChild(row);
      });
    };
    render();
  });
}

function openRestoresView() {
  return openOverlay('Points de restauration', (mount, dialog) => {
    const status = document.createElement('p'); status.className = 'muted'; status.textContent = 'Chargement…'; mount.appendChild(status);
    const list = document.createElement('div'); mount.appendChild(list);
    const render = async () => {
      list.replaceChildren();
      try {
        const points = await requireStoreApi('listRestorePoints')();
        status.textContent = points.length ? `${points.length} point(s) disponible(s).` : 'Aucun point de restauration disponible.';
        for (const point of points) {
          const row = document.createElement('article'); row.className = 'card';
          const heading = document.createElement('h3'); heading.textContent = `${readableRestoreReason(point.reason)} · ${readableRestoreDate(point.createdAt)}`;
          const meta = document.createElement('p'); meta.className = 'muted'; meta.textContent = `${readableRestoreSource(point.sourceFormat || 'snapshot-v2')} · révision ${point.localRevision ?? '—'}`;
          const actions = document.createElement('div'); actions.className = 'row';
          const previewButton = document.createElement('button'); previewButton.type = 'button'; previewButton.className = 'ghost small'; previewButton.textContent = 'Prévisualiser';
          const restoreButton = document.createElement('button'); restoreButton.type = 'button'; restoreButton.className = 'danger ghost small'; restoreButton.textContent = 'Restaurer';
          const details = document.createElement('div'); details.className = 'muted';
          let preview = null; let previewRevision = Store.getLocalRevision?.();
          previewButton.addEventListener('click', async () => {
            previewButton.disabled = true;
            try {
              previewRevision = Store.getLocalRevision?.();
              preview = await requireStoreApi('previewRestorePoint')(point.id);
              details.textContent = `${preview.counts?.profiles || 0} profil(s), ${preview.counts?.participants || 0} participant(s), ${preview.counts?.rejected || 0} rejet(s) · source ${readableRestoreSource(preview.sourceFormat || point.sourceFormat || 'snapshot-v2')}`;
              restoreButton.disabled = false;
            } catch (error) { details.textContent = `Aperçu impossible : ${error.message}`; }
            finally { previewButton.disabled = false; }
          });
          restoreButton.disabled = true;
          restoreButton.addEventListener('click', async () => {
            if (!preview) { details.textContent = 'Prévisualisez ce point avant restauration.'; return; }
            if (!window.confirm(`Restaurer le point « ${readableRestoreReason(point.reason)} » ? La partie courante sera remplacée.`)) return;
            restoreButton.disabled = true;
            try {
              const result = await awaitStore(requireStoreApi('restorePoint')(point.id, { expectedRevision: previewRevision, expectedPointRevision: preview.data?.localRevision }), 'Restauration');
              if (result?.status !== 'restored') throw new Error(result?.status === 'stale' ? 'La partie a changé : prévisualisez à nouveau.' : 'Restauration non appliquée.');
              showToast('Point de restauration chargé.', 'success'); dialog.close();
            } catch (error) { restoreButton.disabled = false; details.textContent = `Restauration impossible : ${error.message}`; }
          });
          actions.append(previewButton, restoreButton); row.append(heading, meta, actions, details); list.appendChild(row);
        }
      } catch (error) { status.textContent = `Points indisponibles : ${error.message}`; }
    };
    void render();
  });
}

function openRemindersView() {
  const scene = storedScene();
  const combat = Store.getCombat();
  const actor = combat.currentActorId ? combat.participants.get(combat.currentActorId) : null;
  const transition = { id: `round-${combat.round || 0}`, type: 'endTurn', actorId: actor?.id || null, round: combat.round || 0 };
  let reminders = requireStoreApi('getReminders')(transition);
  return openOverlay('Rappels de séance', (mount, dialog) => {
    const render = () => {
      mount.replaceChildren();
      const intro = document.createElement('p'); intro.textContent = reminders.length ? `${pendingReminders(reminders).length} rappel(s) en attente.` : 'Aucun rappel à examiner.'; mount.appendChild(intro);
      reminders.forEach(item => {
        const row = document.createElement('div'); row.className = 'card row';
        const text = document.createElement('span'); text.textContent = readableReminder(item);
        row.appendChild(text);
        if (item.status === 'pending') [REMINDER_DECISIONS.RESOLVE, REMINDER_DECISIONS.IGNORE, REMINDER_DECISIONS.SNOOZE].forEach(decision => {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'ghost small'; button.textContent = decision === 'resolve' ? 'Résoudre' : decision === 'ignore' ? 'Ignorer' : 'Reporter';
          button.addEventListener('click', async () => {
            button.disabled = true;
            try {
              await awaitStore(requireStoreApi('resolveReminder')(item.id, decision), 'Rappel'); reminders = requireStoreApi('getReminders')(transition); render();
            } catch (error) { button.disabled = false; showToast(`Rappel non enregistré : ${error.message}`, 'error'); }
          }); row.appendChild(button);
        });
        mount.appendChild(row);
      });
    };
    render();
  });
}

function renderWorkspaceOverview(content) {
  if (!content) return;
  content.replaceChildren();
  const scene = Store.getActiveScene?.();
  if (!scene) { content.textContent = 'Aucune séance active.'; return; }
  const combat = Store.getCombat(); const actor = combat.currentActorId ? combat.participants.get(combat.currentActorId) : null;
  const transition = { id: `round-${combat.round || 0}`, type: 'endTurn', actorId: actor?.id || null, round: combat.round || 0 };
  const reminders = Store.getReminders?.(transition) || [];
  const heading = document.createElement('h3'); heading.textContent = 'Rappels courants'; content.appendChild(heading);
  if (!reminders.length) content.appendChild(document.createElement('p')).textContent = 'Aucun rappel en attente.';
  reminders.forEach(item => {
    const row = document.createElement('div'); row.className = 'card'; const label = document.createElement('span'); label.textContent = readableReminder(item); row.appendChild(label);
    if (item.status === 'pending') ['resolve', 'ignore', 'snooze'].forEach(decision => { const button = document.createElement('button'); button.type = 'button'; button.className = 'ghost small'; button.textContent = decision === 'resolve' ? 'Résoudre' : decision === 'ignore' ? 'Ignorer' : 'Reporter'; button.addEventListener('click', async () => { button.disabled = true; try { await awaitStore(Store.resolveReminder(item.id, decision), 'Rappel'); renderWorkspaceOverview(content); } catch (error) { button.disabled = false; showToast(`Rappel non enregistré : ${error.message}`, 'error'); } }); row.appendChild(button); });
    content.appendChild(row);
  });
  const events = Array.isArray(scene.events) ? scene.events : []; const eventHeading = document.createElement('h3'); eventHeading.textContent = 'Événements proposés'; content.appendChild(eventHeading);
  if (!events.length) { const emptyEvents = document.createElement('p'); emptyEvents.className = 'muted'; emptyEvents.textContent = 'Aucun événement structuré dans cette séance.'; content.appendChild(emptyEvents); }
  events.forEach(event => { const proposal = Store.previewSceneEvent?.(event, { manual: true }) || Store.proposeSceneEvent?.(event, { manual: true }); if (proposal?.status !== 'proposed') return; const row = document.createElement('div'); row.className = 'card'; const label = document.createElement('span'); label.textContent = `${event.id} · ${readableSceneEvent(event, scene)}`; const previewButton = document.createElement('button'); previewButton.type = 'button'; previewButton.className = 'ghost small'; previewButton.textContent = 'Prévisualiser'; previewButton.addEventListener('click', async () => { previewButton.disabled = true; try { const preview = Store.previewSceneEvent ? await Store.previewSceneEvent(event, { manual: true }) : proposal; const summary = document.createElement('p'); summary.className = 'muted'; summary.textContent = `${readableSceneEvent(event, scene)} · aperçu proposé, aucune conséquence appliquée.`; const apply = document.createElement('button'); apply.type = 'button'; apply.className = 'ghost small'; apply.textContent = 'Appliquer la conséquence'; apply.addEventListener('click', async () => { apply.disabled = true; try { const result = await awaitStore(Store.applySceneEvent(event, { baseRevision: preview.baseRevision, sceneRevision: preview.sceneRevision, confirmed: true }), 'Événement'); if (result?.status !== 'applied') throw new Error(result?.reason || 'Conséquence non appliquée.'); renderWorkspaceOverview(content); } catch (error) { apply.disabled = false; showToast(`Événement non appliqué : ${error.message}`, 'error'); } }); row.replaceChildren(label, summary, apply); } catch (error) { showToast(`Aperçu impossible : ${error.message}`, 'error'); } finally { previewButton.disabled = false; } }); row.append(label, previewButton); content.appendChild(row); });
  if (scene.intentions?.length) { const intentionHeading = document.createElement('h3'); intentionHeading.textContent = 'Intentions'; content.appendChild(intentionHeading); scene.intentions.forEach(intention => { const row = document.createElement('p'); row.textContent = `${intention.id} : ${intention.objective || intention.motivation || 'À arbitrer'}`; content.appendChild(row); }); }
}

function openEventsView() {
  const source = sceneFromStore();
  const scene = { ...createScene({ id: source.id, round: Number(source.round) || 0, participants: Store.listParticipants(), events: source.events || [], clocks: source.clocks || [] }), resolvedOccurrences: source.resolvedOccurrences || [] };
  return openOverlay('Événements structurés', (mount, dialog) => {
    const form = document.createElement('form'); form.className = 'card';
    form.innerHTML = `<strong>Créer un événement structuré</strong>
      <label>ID<input name="id" required></label>
      <label>Condition<select name="condition"><option value="manual">Manuelle</option><option value="roundAtLeast">À partir du round</option><option value="hpBelow">PV sous le seuil</option><option value="participantDown">Participant à 0 PV</option><option value="previousResolved">Après un événement résolu</option></select></label>
      <label>Participant / événement<select name="value"></select></label>
      <label>Round<input name="round" type="number" min="0" hidden></label>
      <label>Seuil PV<input name="hp" type="number" min="0" hidden></label>
      <label>Conséquence<select name="consequence"><option value="note">Note à annoncer</option><option value="addState">Ajouter un état</option><option value="reinforcement">Faire entrer un renfort</option><option value="advanceClock">Avancer une jauge</option></select></label>
      <label>Cible de la conséquence<select name="target"></select></label>
      <label>Texte / état / jauge<input name="text" placeholder="Contenu structuré"></label>
      <label>Niveau / quantité<input name="amount" type="number" value="1"></label>
      <label>Durée de l’état<input name="duration" type="number" min="1" placeholder="Vide = permanent"></label>
      <label>Récurrent <input name="recurring" type="checkbox"></label>
      <button type="submit">Enregistrer et prévisualiser</button>`;
    const participantChoices = Store.listParticipants();
    const valueInput = form.elements.value;
    const roundInput = form.elements.round;
    const targetSelect = form.elements.target;
    const conditionSelect = form.elements.condition;
    const hpInput = form.elements.hp;
    const consequenceSelect = form.elements.consequence;
    const textInput = form.elements.text;
    const amountInput = form.elements.amount;
    const durationInput = form.elements.duration;
    const refreshFields = () => {
      hpInput.hidden = conditionSelect.value !== 'hpBelow';
      hpInput.required = conditionSelect.value === 'hpBelow';
      valueInput.required = conditionSelect.value !== 'manual';
      valueInput.hidden = conditionSelect.value === 'roundAtLeast'; roundInput.hidden = conditionSelect.value !== 'roundAtLeast';
      valueInput.required = conditionSelect.value !== 'manual' && conditionSelect.value !== 'roundAtLeast';
      textInput.placeholder = consequenceSelect.value === 'note' ? 'Note à annoncer' : consequenceSelect.value === 'addState' ? 'Nom de l’état' : consequenceSelect.value === 'advanceClock' ? 'Identifiant de jauge' : 'Identifiant du renfort';
      durationInput.hidden = consequenceSelect.value !== 'addState';
      amountInput.hidden = consequenceSelect.value === 'note';
      targetSelect.replaceChildren(new Option(consequenceSelect.value === 'advanceClock' ? 'Choisir une jauge…' : 'Choisir une cible…', ''));
      (consequenceSelect.value === 'advanceClock' ? scene.clocks : participantChoices).forEach(item => targetSelect.appendChild(new Option(item.name || item.label || item.id, item.id)));
    };
    conditionSelect.addEventListener('change', refreshFields); consequenceSelect.addEventListener('change', refreshFields); refreshFields();
    valueInput.replaceChildren(new Option(conditionSelect.value === 'previousResolved' ? 'Choisir un événement…' : 'Choisir un participant…', ''));
    participantChoices.forEach(item => valueInput.appendChild(new Option(item.name, item.id)));
    if (scene.events.length) scene.events.forEach(item => valueInput.appendChild(new Option(`Événement : ${item.id}`, item.id)));
    const chooser = document.createElement('p'); chooser.className = 'muted'; chooser.textContent = 'Les listes affichent les noms ; les identifiants restent internes.'; form.appendChild(chooser);
    const previewMount = document.createElement('div'); previewMount.className = 'scene-event-preview';
    const showPreview = (eventModel, preview) => {
      previewMount.replaceChildren();
      const box = document.createElement('div'); box.className = 'card';
      box.appendChild(Object.assign(document.createElement('strong'), { textContent: `${eventModel.id} · ${preview.status === 'proposed' ? 'conséquence proposée' : preview.status}` }));
      const summary = document.createElement('p'); summary.textContent = readableSceneEvent(eventModel, scene); box.appendChild(summary);
      const details = document.createElement('details'); const caption = document.createElement('summary'); caption.textContent = 'Détails de l’aperçu'; const raw = document.createElement('pre'); raw.textContent = JSON.stringify(preview, null, 2); details.append(caption, raw); box.appendChild(details);
      if (preview.status === 'proposed') {
        const apply = document.createElement('button'); apply.type = 'button'; apply.textContent = 'Appliquer la conséquence';
        apply.addEventListener('click', async () => { apply.disabled = true; try { const result = await awaitStore(requireStoreApi('applySceneEvent')(eventModel, { baseRevision: preview.baseRevision, sceneRevision: preview.sceneRevision, confirmed: true }), 'Événement'); if (result?.status !== 'applied') throw new Error(result?.reason || 'Conséquence non appliquée.'); showToast('Conséquence appliquée.', 'success'); previewMount.replaceChildren(); } catch (error) { apply.disabled = false; showToast(error.message, 'error'); } }); box.appendChild(apply);
      }
      previewMount.appendChild(box);
    };
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const conditionType = form.elements.condition.value;
      const rawValue = valueInput.value.trim();
      const condition = conditionType === 'manual' ? { type: 'manual' } : conditionType === 'roundAtLeast' ? { type: conditionType, round: Number(roundInput.value) } : conditionType === 'hpBelow' ? { type: conditionType, participantId: rawValue, hp: Number(hpInput.value) } : conditionType === 'previousResolved' ? { type: conditionType, occurrenceId: `${scene.id}:${rawValue}:once` } : { type: conditionType, participantId: rawValue };
      const consequenceType = consequenceSelect.value;
      const consequence = consequenceType === 'note' ? { type: 'note', text: textInput.value.trim() } : consequenceType === 'addState' ? { type: 'addState', participantId: targetSelect.value, name: textInput.value.trim(), level: Number(amountInput.value) || 1, duration: durationInput.value ? Number(durationInput.value) : null } : consequenceType === 'reinforcement' ? { type: 'reinforcement', participantId: targetSelect.value } : { type: 'advanceClock', clockId: targetSelect.value || textInput.value.trim(), amount: Number(amountInput.value) || 1 };
      const payload = { id: form.elements.id.value.trim(), condition, consequence, recurring: form.elements.recurring.checked };
      const submit = form.querySelector('button[type=submit]'); submit.disabled = true;
      try {
        const eventModel = requireStoreApi('createSceneEvent')(payload);
        const saved = typeof Store.saveSceneEvent === 'function'
          ? awaitStore(Store.saveSceneEvent(eventModel), 'Événement')
          : awaitStore(requireStoreApi('executeCommand')('create-scene-event', draft => ({ ...draft, activeScene: { ...draft.activeScene, events: [...(draft.activeScene?.events || []), eventModel] } })), 'Événement');
        await saved;
        const preview = await requireStoreApi('previewSceneEvent')(eventModel, { manual: true });
        showPreview(eventModel, preview); showToast('Événement enregistré : examinez l’aperçu avant application.', 'info');
      } catch (error) { showToast(`Événement non enregistré : ${error.message}`, 'error'); } finally { submit.disabled = false; }
    });
    mount.append(form, previewMount);
    const intentionForm = document.createElement('form'); intentionForm.className = 'card';
    intentionForm.innerHTML = '<strong>Ajouter une intention</strong><label>Identifiant<input name="id" required></label><label>Participant<select name="participant"><option value="">Scène</option></select></label><label>Motivation<input name="motivation"></label><label>Objectif<input name="objective"></label><label>Condition de repli<input name="retreat"></label><button type="submit">Enregistrer l’intention</button>';
    const participantSelect = intentionForm.elements.participant; Store.listParticipants().forEach(participant => participantSelect.append(new Option(participant.name, participant.id)));
    intentionForm.addEventListener('submit', async event => {
      event.preventDefault(); const submit = intentionForm.querySelector('button'); submit.disabled = true;
      try { await awaitStore(requireStoreApi('createIntention')({ id: intentionForm.elements.id.value.trim(), participantId: participantSelect.value || null, motivation: intentionForm.elements.motivation.value, objective: intentionForm.elements.objective.value, retreatCondition: intentionForm.elements.retreat.value }), 'Intention'); showToast('Intention enregistrée.', 'success'); intentionForm.reset(); }
      catch (error) { submit.disabled = false; showToast(`Intention non enregistrée : ${error.message}`, 'error'); }
    });
    mount.appendChild(intentionForm);
    const clockForm = document.createElement('form'); clockForm.className = 'card';
    clockForm.innerHTML = '<strong>Jauge manuelle</strong><label>Identifiant<input name="id" required></label><label>Valeur<input name="value" type="number" value="0"></label><label>Maximum<input name="max" type="number" min="1" value="6"></label><button type="submit">Créer la jauge</button>';
    clockForm.addEventListener('submit', async event => {
      event.preventDefault(); const submit = clockForm.querySelector('button'); submit.disabled = true;
      try { await awaitStore(requireStoreApi('executeCommand')('create-scene-clock', draft => ({ ...draft, activeScene: { ...draft.activeScene, clocks: [...(draft.activeScene?.clocks || []), { id: clockForm.elements.id.value.trim(), value: Number(clockForm.elements.value.value) || 0, max: Number(clockForm.elements.max.value) || null }] } })), 'Jauge'); showToast('Jauge créée.', 'success'); }
      catch (error) { submit.disabled = false; showToast(`Jauge non créée : ${error.message}`, 'error'); }
    });
    mount.appendChild(clockForm);
    (scene.clocks || []).forEach(clock => {
      const row = document.createElement('div'); row.className = 'card row'; row.append(document.createTextNode(`${clock.id} · ${clock.value}/${clock.max ?? '∞'}`));
      const advance = document.createElement('button'); advance.type = 'button'; advance.className = 'ghost small'; advance.textContent = '+1';
      advance.addEventListener('click', async () => { advance.disabled = true; try { await awaitStore(requireStoreApi('advanceSceneClock')(clock.id, 1), 'Jauge'); showToast(`Jauge ${clock.id} avancée.`, 'success'); } catch (error) { advance.disabled = false; showToast(`Jauge non avancée : ${error.message}`, 'error'); } }); row.appendChild(advance); mount.appendChild(row);
    });
    if (!scene.events.length) { const empty = document.createElement('p'); empty.textContent = 'Aucun événement structuré dans cette séance.'; mount.appendChild(empty); return; }
    scene.events.forEach(event => {
      const proposal = proposeSceneEvent(scene, event, { manual: event.condition?.type === 'manual' });
      const row = document.createElement('div'); row.className = 'card';
      const label = document.createElement('p'); label.textContent = `${event.id} · ${proposal.status}`; row.appendChild(label);
      if (proposal.status === 'proposed') { const resolve = document.createElement('button'); resolve.type = 'button'; resolve.textContent = 'Prévisualiser la conséquence'; resolve.addEventListener('click', async () => { resolve.disabled = true; try { const preview = await requireStoreApi('previewSceneEvent')(event, { manual: true }); showPreview(event, preview); } catch (error) { showToast(`Aperçu impossible : ${error.message}`, 'error'); } finally { resolve.disabled = false; } }); row.appendChild(resolve); }
      mount.appendChild(row);
    });
  });
}

const workspaceView = DOM.panels.workspace && qs('#workspace-root') ? initWorkspaceView({
  Store, Combat, Bus, mount: qs('#workspace-root'), showNavigation: false,
  actions: {
    beginEncounter: openPrepareView,
    createProfile: openCreateProfileView,
    duplicateProfile: id => awaitStore(Store.duplicateProfile(id), 'Duplication'),
    removeProfile: id => awaitStore(Store.removeProfile(id), 'Suppression'),
    endTurn: () => {
      const combat = Store.getCombat();
      return combat.round > 0 ? Combat.nextTurn() : Combat.start();
    },
    undo: () => Store.undo(),
    editProfile: id => {
      const profile = Store.getProfile(id);
      if (!profile) throw new Error('Profil introuvable.');
      openOverlay(`Modifier ${profile.name}`, (mount, dialog) => {
        const form = DOM.reserve.form; if (!form) throw new Error('Éditeur de profil indisponible.');
        const placeholder = document.createComment('form-add-placeholder'); form.replaceWith(placeholder); reserveUI.loadProfileIntoForm?.(profile); form.classList.add('card'); mount.appendChild(form);
        const editorToken = uid(); form.dataset.editorToken = editorToken;
        const linked = Store.listParticipants().filter(participant => participant.profileId === id);
        const preview = document.createElement('p'); preview.className = 'muted';
        const updatePreview = () => {
          const optedIn = Boolean(form.querySelector('[name=propagate]')?.checked);
          preview.textContent = linked.length
            ? (optedIn
              ? `${linked.length} exemplaire(s) seront mis à jour pour la fiche, le PV max et les actions ; PV actuels, états et cibles restent inchangés.`
              : `${linked.length} exemplaire(s) en cours. Cochez l’option de mise à jour pour proposer leur actualisation.`)
            : 'Aucun exemplaire en cours.';
        };
        form.prepend(preview); form.querySelector('[name=propagate]')?.addEventListener('change', updatePreview); updatePreview();
        profileSavedHandler = { token: editorToken, fn: () => dialog.close() };
        const restore = () => { if (profileSavedHandler?.token === editorToken) profileSavedHandler = null; delete form.dataset.editorToken; if (placeholder.parentNode) placeholder.replaceWith(form); form.classList.remove('card'); reserveUI.resetForm?.(); };
        dialog.addEventListener('close', restore, { once: true });
      });
    },
    editParticipant: id => {
      const participant = Store.getCombat().participants.get(id);
      if (!participant) return;
      openOverlay(`Modifier ${participant.name}`, mount => {
        const form = document.createElement('form'); form.className = 'card';
        form.dataset.participantEditor = id;
        form.innerHTML = `
          <div class="grid-2">
            <label>Nom<input name="name" required></label>
            <label>PV actuels<input name="hp" type="number"></label>
            <label>Initiative<input name="initiative" type="number" step="1"></label>
            <label>Zone
              <select name="zone"><option value="active">Actif</option><option value="bench">Banc / en attente</option></select>
            </label>
          </div>
          <section class="participant-state-edit card">
            <div class="row"><h3>États</h3><button type="button" class="ghost small" data-add-state>Ajouter un état</button></div>
            <div class="participant-state-list"></div>
          </section>
          <section class="participant-action-edit card"><div class="row"><h3>Actions préparées</h3><button type="button" class="ghost small" data-add-action>Ajouter une action</button></div><div class="participant-action-list"></div></section>
          <div class="row participant-order-actions">
            <button type="button" class="ghost small" data-order="up">Monter</button>
            <button type="button" class="ghost small" data-order="down">Descendre</button>
            <button type="button" class="ghost small" data-order="initiative">Trier par initiative</button>
          </div>
          <div class="row"><button type="button" class="danger ghost" data-remove-participant>Retirer du combat</button><span class="spacer"></span><button type="submit">Enregistrer</button></div>`;
        form.elements.name.value = participant.name; form.elements.hp.value = participant.hp;
        form.elements.initiative.value = Number(participant.initiative) || 0;
        form.elements.zone.value = participant.zone === 'active' ? 'active' : 'bench';

        const alertError = message => {
          form.querySelector('[role="alert"]')?.remove();
          const alert = document.createElement('p'); alert.setAttribute('role', 'alert'); alert.textContent = message; form.prepend(alert);
        };
        const setBusy = busy => form.querySelectorAll('button').forEach(button => { button.disabled = busy; });

        const stateValues = normalizeEffects(participant.states || []).map(state => ({ ...state }));
        const stateMount = form.querySelector('.participant-state-list');
        const stateNames = ['Blessé', 'À Terre', 'Sonné', 'Inconscient', 'Aveuglé', 'Assourdi', 'Exténué', 'Hémorragique', 'Surpris', 'Enchevêtré', 'Enflammé', 'Brisé'];
        const renderStates = () => {
          stateMount.replaceChildren();
          if (!stateValues.length) { const empty = document.createElement('p'); empty.className = 'muted'; empty.textContent = 'Aucun état.'; stateMount.appendChild(empty); }
          stateValues.forEach((state, index) => {
            const row = document.createElement('div'); row.className = 'row state-edit-row';
            const name = document.createElement('input'); name.className = 'state-name'; name.value = state.name || ''; name.placeholder = 'État'; name.setAttribute('list', 'participant-state-names');
            const level = document.createElement('input'); level.className = 'state-level'; level.type = 'number'; level.min = '1'; level.value = state.level || 1; level.title = 'Niveau'; level.style.width = '5rem';
            const duration = document.createElement('input'); duration.className = 'state-duration'; duration.type = 'number'; duration.min = '1'; duration.value = state.duration ?? ''; duration.placeholder = '∞'; duration.title = 'Tours restants (vide = permanent)'; duration.style.width = '6rem';
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger ghost small'; remove.textContent = 'Supprimer';
            const sync = () => { stateValues[index] = normalizeState({ ...stateValues[index], name: name.value, level: level.value, duration: duration.value }, index); };
            name.addEventListener('change', sync); level.addEventListener('change', sync); duration.addEventListener('change', sync);
            remove.addEventListener('click', () => { stateValues.splice(index, 1); renderStates(); });
            row.append(name, level, duration, remove); stateMount.appendChild(row);
          });
          let datalist = form.querySelector('#participant-state-names');
          if (!datalist) { datalist = document.createElement('datalist'); datalist.id = 'participant-state-names'; stateNames.forEach(value => datalist.appendChild(new Option(value))); form.appendChild(datalist); }
        };
        renderStates();
        form.querySelector('[data-add-state]').addEventListener('click', () => { stateValues.push(normalizeState({ name: 'Sonné', level: 1, duration: null, source: { kind: 'manual' } }, stateValues.length)); renderStates(); stateMount.querySelector('.state-edit-row:last-child .state-name')?.focus(); });

        const actionMount = form.querySelector('.participant-action-list');
        const actionValues = (participant.actions || []).map(action => ({ ...action }));
        const renderActions = () => {
          actionMount.replaceChildren();
          if (!actionValues.length) { const empty = document.createElement('p'); empty.className = 'muted'; empty.textContent = 'Aucune action préparée. Ajoutez une action improvisée ou préparée.'; actionMount.appendChild(empty); }
          actionValues.forEach((action, index) => {
            const container = document.createElement('div'); container.className = 'card';
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger ghost small'; remove.textContent = 'Retirer cette action'; remove.addEventListener('click', () => { actionValues.splice(index, 1); renderActions(); });
            const header = document.createElement('div'); header.className = 'row'; header.append(document.createElement('strong'), remove); header.firstChild.textContent = action.note || `Action ${index + 1}`;
            container.appendChild(header);
            createActionEditor({ container, action, onChange: next => { actionValues[index] = { ...next, id: action.id }; header.firstChild.textContent = next.note || `Action ${index + 1}`; } });
            actionMount.appendChild(container);
          });
        };
        renderActions();
        form.querySelector('[data-add-action]').addEventListener('click', () => { actionValues.push({ id: uid(), type: '', base: '', mod: 0, note: 'Action improvisée', damage: 0, qualities: [] }); renderActions(); actionMount.lastElementChild?.querySelector('.action-note')?.focus(); });

        const reorder = async direction => {
          try {
            const order = (Store.getEffectiveOrder?.() || Store.getCombat().order || []).filter(Boolean);
            const index = order.indexOf(id); if (index < 0) throw new Error('Le participant doit être actif pour être réordonné.');
            const beforeId = direction === 'up' ? order[index - 1] || null : direction === 'down' ? (order[index + 2] || null) : null;
            await awaitStore(direction === 'initiative' ? Store.rebuildOrder() : Store.moveInOrder(id, beforeId), 'Ordre');
          } catch (error) { alertError(error.message); }
        };
        form.querySelectorAll('[data-order]').forEach(button => button.addEventListener('click', () => reorder(button.dataset.order)));
        form.querySelector('[data-remove-participant]').addEventListener('click', async () => {
          setBusy(true); try { await awaitStore(Store.removeParticipant(id), 'Retrait'); form.closest('dialog')?.close(); } catch (error) { setBusy(false); alertError(error.message); }
        });
        form.addEventListener('submit', async event => {
          event.preventDefault(); const save = form.querySelector('button[type="submit"]'); setBusy(true);
          try {
            const zone = form.elements.zone.value === 'active' ? 'active' : 'bench';
            await awaitStore(Store.updateParticipant(id, { name: form.elements.name.value.trim() || participant.name, hp: Number(form.elements.hp.value) || 0, initiative: Number(form.elements.initiative.value) || 0, states: normalizeEffects(stateValues), actions: actionValues }), 'Participant');
            if (zone !== participant.zone) await awaitStore(Store.moveParticipant(id, zone), 'Zone');
            form.closest('dialog')?.close();
          } catch (error) { setBusy(false); alertError(error.message); }
        });
        mount.appendChild(form);
      });
    },
    openRules: () => { workspaceView?.openContext('rules'); },
    openLog: () => { switchTab('workspace', 'play'); workspaceView?.setSpace('play'); workspaceView?.openContext('log'); renderLog(Store); },
    renderRules: content => { renderReferenceTables('', content); },
    renderOverview: renderWorkspaceOverview,
    renderLog: content => { renderLog(Store, content, { contextual: true }); },
    runAction: ({ participantId, diceLineId }) => { if (!diceLineId) throw new Error('Cette action ne possède pas de jet enregistré.'); openResolutionView(participantId, diceLineId); },
    renderActionPanel: participant => {
      const box = document.createElement('div');
      const actions = (participant.actions || []).length ? participant.actions : Store.getDiceLines().filter(line => line.participantId === participant.id);
      if (!actions.length) { box.textContent = 'Aucune action préparée.'; return box; }
      actions.forEach(action => { const run = document.createElement('button'); run.type = 'button'; run.className = 'workspace-secondary'; run.textContent = `${action.note || action.attr || 'Action'} · ${action.base ?? '—'}`; run.dataset.workspaceAction = 'run-action'; run.dataset.participantId = participant.id; run.dataset.diceLineId = action.id; box.appendChild(run); });
      return box;
    },
    adjustHp: ({ participantId, delta }) => {
      if (typeof Store.executeCommand === 'function') {
        return awaitStore(Store.executeCommand('adjust-hp', draft => {
          const participants = (draft.combat?.participants || []).map(participant => participant.id === participantId
            ? { ...participant, hp: (Number(participant.hp) || 0) + Number(delta || 0) }
            : participant);
          const changed = participants.find(participant => participant.id === participantId);
          return { ...draft, combat: { ...draft.combat, participants }, log: [{ ts: Date.now(), kind: 'damage', actorId: participantId, text: `${changed?.name || 'Participant'} : PV ajustés` }, ...(draft.log || [])].slice(0, 300) };
        }), 'PV');
      }
      const participant = Store.getCombat().participants.get(participantId);
      return participant ? awaitStore(Store.updateParticipant(participantId, { hp: participant.hp + delta }), 'PV') : Promise.resolve(false);
    }
  }
}) : null;

setWorkspaceToolsVisibility('prepare');
renderLaunchpad('prepare');

const safeOpen = operation => { try { operation(); } catch (error) { showToast(error.message, 'error'); } };
on(qs('#workspace-simulate'), 'click', () => safeOpen(openSimulationView));
on(qs('#workspace-reminders'), 'click', () => safeOpen(openRemindersView));
on(qs('#workspace-events'), 'click', () => safeOpen(openEventsView));
on(qs('#workspace-archives'), 'click', () => safeOpen(openArchivesView));
on(qs('#workspace-import-text'), 'click', () => safeOpen(openTextImportView));
on(qs('#workspace-close-scene'), 'click', () => safeOpen(openClosureView));
on(qs('#workspace-save'), 'click', () => DOM.combat.btnSaveFile?.click());
on(qs('#workspace-load'), 'click', () => DOM.combat.btnLoadFile?.click());
on(qs('#workspace-restores'), 'click', () => safeOpen(openRestoresView));

// Boutons de combat globaux
on(DOM.combat.btnImport, 'click', () => {
  const fi = qs('#import-filter'); if (fi) fi.value = '';
  importModalUI.renderImportModal();
  DOM.importModal.dialog.showModal();
});
on(qs('#import-filter'), 'input', () => importModalUI.renderImportModal());
on(DOM.importModal.confirm, 'click', async (e) => {
  e.preventDefault();
  const ids = importModalUI.getSelectedIds?.() || [];
  DOM.importModal.confirm.disabled = true;
  try { await awaitStore(Store.importFromReserve(ids), 'Import'); importModalUI.clearSelection?.(); DOM.importModal.dialog.close(); showToast(`${ids.length} profil(s) importé(s) en combat`, 'success'); }
  catch (error) { showToast(`Import impossible : ${error.message}`, 'error'); }
  finally { DOM.importModal.confirm.disabled = false; }
});
on(DOM.combat.btnExport, 'click', async () => {
  if (confirm('Appliquer PV aux profils correspondants ?')) {
    try { await awaitStore(Store.exportToReserve(), 'Export'); showToast('Profils de la réserve mis à jour', 'success'); }
    catch (error) { showToast(`Export impossible : ${error.message}`, 'error'); }
  }
});
on(DOM.combat.btnSaveFile, 'click', () => {
  const json = Store.getFullJSON();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wfrp-save-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('💾 Fichier de sauvegarde téléchargé', 'success');
});
on(DOM.combat.btnLoadFile, 'click', () => { if (DOM.combat.fileInput) DOM.combat.fileInput.click(); });
on(DOM.combat.fileInput, 'change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const preview = Store.previewImport(ev.target.result);
      const { profiles, participants, rejected, repaired, replacedProfiles, replacedParticipants } = preview.counts;
      const summary = `Importer ${profiles} profil(s) et ${participants} participant(s) ?\n` +
        `${replacedProfiles + replacedParticipants} élément(s) remplacé(s), ${repaired} réparé(s), ${rejected} rejeté(s).`;
      showToast(summary.replace('\n', ' — '), 'info');
      if (!confirm(summary)) return;
      await awaitStore(Store.loadFromJSON(ev.target.result), 'Chargement');
      showToast('📂 Sauvegarde chargée avec succès', 'success', { label: 'Annuler', onClick: () => Store.undo() });
    } catch (err) {
      showToast('Erreur de chargement: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});
on(DOM.combat.btnStart, 'click', () => Combat.start());
on(DOM.combat.btnNextTurn, 'click', () => Combat.nextTurn());
on(DOM.combat.btnReset, 'click', () => { DOM.combat.results.replaceChildren(); });
if (DOM.combat.btnEndCombat) {
  on(DOM.combat.btnEndCombat, 'click', () => {
    const scene = Store.getActiveScene?.();
    if (scene?.status === 'active' || scene?.status === 'suspended') {
      openClosureView();
      return;
    }
    if (confirm('Retirer tous les combattants et remettre le round à zéro ?')) {
      Store.resetCombat();
      DOM.combat.results?.replaceChildren();
      showToast('Combat réinitialisé', 'warning', { label: 'Annuler', onClick: () => Store.undo() });
    }
  });
}
on(DOM.combat.btnD100, 'click', () => {
  const roll = d100();
  Store.log({ kind: 'roll', text: `🎲 Jet de d100 simple → ${roll}`, detail: { Jet: roll } });
  showToast(`🎲 d100 = ${roll}`, 'info');
});

// Abonnements Bus
Bus.on('reserve', reserveUI.renderReserve);
Bus.on('combat', combatViewUI.renderCombat);
Bus.on('combat', () => { const space = document.querySelector('.tab.is-active')?.dataset.workspaceSpace || 'prepare'; setWorkspaceToolsVisibility(space); renderLaunchpad(space); });
Bus.on('combat:update', ({ id, patch }) => {
  if (!cardUI.updateCardUI(id, patch)) {
    combatViewUI.renderCombat();
  }
});
Bus.on('log', () => renderLog(Store));
Bus.on('reserve', refreshHistoryButtons);
Bus.on('combat', refreshHistoryButtons);
Bus.on('log', refreshHistoryButtons);
Bus.on('sync:conflict', () => {
  const resolve = (operation, message) => Promise.resolve(operation())
    .then(() => {
      reserveUI.renderReserve();
      combatViewUI.renderCombat();
      renderLog(Store);
      showToast(message, 'success');
    })
    .catch(error => showToast(`Résolution impossible : ${error.message}`, 'error'));

  const exportBoth = () => {
    let json;
    try { json = Store.exportSyncConflict?.() || Store.getFullJSON(); }
    catch (error) { showToast(`Aperçu impossible : ${error.message}`, 'error'); return; }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wfrp-conflit-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Les versions locale et distante ont été exportées.', 'info');
  };

  const preview = () => {
    let json;
    try { json = Store.exportSyncConflict?.() || Store.getFullJSON(); }
    catch (error) { showToast(`Aperçu impossible : ${error.message}`, 'error'); return; }
    let previewData;
    try { previewData = JSON.parse(json); } catch { previewData = { export: json }; }
    const modal = document.createElement('div');
    modal.className = 'card';
    modal.style.cssText = 'position:fixed; inset:8vh 8vw; z-index:10000; display:flex; flex-direction:column; gap:10px; padding:16px; background:#201b19; border:1px solid #a98752; box-shadow:0 8px 30px #000;';
    const heading = document.createElement('strong');
    heading.textContent = 'Aperçu du conflit (local et distant)';
    modal.appendChild(heading);
    const pre = document.createElement('pre');
    pre.style.cssText = 'overflow:auto; flex:1; white-space:pre-wrap; font-size:.8em;';
    pre.textContent = JSON.stringify(previewData, null, 2);
    modal.appendChild(pre);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:8px; justify-content:flex-end;';
    const download = document.createElement('button');
    download.type = 'button'; download.className = 'ghost'; download.textContent = 'Télécharger les deux';
    download.addEventListener('click', exportBoth);
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'ghost'; close.textContent = 'Fermer';
    close.addEventListener('click', () => modal.remove());
    row.append(download, close); modal.appendChild(row); document.body.appendChild(modal);
  };

  showToast('Conflit distant : choisissez une version avant de reprendre l’envoi.', 'warning', {
    actions: [
      { label: 'Garder local', onClick: () => resolve(() => Store.resolveSyncLocal(), 'Version locale conservée et renvoyée.') },
      { label: 'Prendre distant', onClick: () => resolve(() => Store.resolveSyncRemote(), 'Version distante appliquée localement.') },
      { label: 'Aperçu / exporter', onClick: preview },
      { label: 'Sauvegarder les deux', onClick: exportBoth }
    ]
  }, 0);
});
Bus.on('sync:guest-import-available', ({ snapshot, contextId, kind } = {}) => {
  const source = kind === 'legacy' ? 'Ancienne sauvegarde distante' : 'Données invitées';
  showToast(`${source} disponible pour ${contextId || 'ce compte'} (non importée automatiquement).`, 'info', {
    label: 'Importer explicitement',
    onClick: () => Promise.resolve(Store.importGuestSnapshot(snapshot))
      .then(result => { if (result?.ok === false) throw result.error || new Error('Import impossible.'); return result; })
      .then(() => showToast(`${source} importée dans le compte.`, 'success'))
      .catch(error => showToast(`Import invité impossible : ${error.message}`, 'error'))
  }, 0);
});

// Rendu initial
reserveUI.renderReserve();
combatViewUI.renderCombat();
renderReferenceTables();
renderLog(Store);
startRemoteAdapter();
