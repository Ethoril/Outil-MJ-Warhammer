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
import { renderLog, initLogViewUI } from './ui/journal-view.js';
import { showToast } from './ui/toast.js';
import { initKeyboardShortcuts } from './ui/keyboard.js';
import { initThemeManager } from './ui/theme.js';
import { initWorkspaceView } from './ui/workspace-view.js';
import { initPrepareView } from './ui/prepare-view.js';
import { initTextImportView } from './ui/import-text-view.js';
import { initFicheSyncView } from './ui/fiche-sync-view.js';
import { parseProfileJson, parseProfileInput, PROFILE_JSON_EXAMPLE } from './core/json-profile-import.js';
import { createActionEditor } from './ui/action-editor.js';
import { createEncounter, normalizeEncounter, normalizeCamp, CAMP_LABELS } from './core/encounters.js';
import { userError, userMessage, contextMessage } from './ui/messages.js';
import { deriveReminders, pendingReminders, resolveReminder, REMINDER_DECISIONS } from './core/reminders.js';
import { createScene, proposeSceneEvent } from './core/scene-events.js';
import { normalizeEffects, normalizeState } from './core/effects.js';
import { previewHpLoss, inferActionType } from './core/resolution.js';
import { initCombatBanner } from './ui/combat-banner.js';

// Indicateur unique de la barre du haut : il résume les deux statuts détaillés
// (#local-status, #sync-status), qui restent lisibles dans la section « État » du menu.
const SYNC_BUSY = ['sending', 'pending', 'connecting', 'transition'];
const SYNC_OK = ['synced', 'connected', 'ready'];
function statusSummary(local, sync) {
  if (sync === 'conflict') return { label: 'Conflit à résoudre', tone: 'danger' };
  if (local === 'error' || local === 'unavailable') return { label: 'Enregistrement local en échec', tone: 'danger' };
  if (sync === 'error') return { label: 'Erreur de synchronisation', tone: 'warn' };
  if (sync === 'offline') return { label: 'Hors ligne', tone: 'warn' };
  if (SYNC_BUSY.includes(sync)) return { label: 'Synchronisation…', tone: 'neutral' };
  if (local === 'saving') return { label: 'Enregistrement…', tone: 'neutral' };
  if (SYNC_OK.includes(sync)) return { label: 'Synchronisé', tone: 'ok' };
  if (sync === 'signedOut' && local === 'saved') return { label: 'Enregistré sur cet appareil', tone: 'ok' };
  return { label: 'Vérification…', tone: 'neutral' };
}

function renderStatusIndicator() {
  const indicator = qs('#status-indicator');
  if (!indicator) return;
  const localEl = qs('#local-status');
  const syncEl = qs('#sync-status');
  const { label, tone } = statusSummary(localEl?.dataset.status, syncEl?.dataset.status);
  const labelEl = indicator.querySelector('.status-label');
  if (labelEl && labelEl.textContent !== label) labelEl.textContent = label;
  indicator.dataset.tone = tone;
  indicator.title = `${localEl?.textContent || 'Local : —'} · Distant : ${syncEl?.textContent || '—'}`;
}

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
  renderStatusIndicator();
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
  renderStatusIndicator();
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
        showToast('Lecture locale rétablie', 'success');
        Bus.emit('reserve'); Bus.emit('combat'); Bus.emit('log');
      } else {
        updateLocalStatus('error');
        showToast('Le stockage local reste indisponible : exportez ce qui reste en mémoire', 'error');
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

// Version (Lot 10.6 : numéro dans le menu, titre complet au survol)
if (DOM.btnVersion) {
  DOM.btnVersion.textContent = `Version ${APP_VERSION}`;
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
let combatBanner = null;
// Seul point d'entrée pour changer d'espace : onglet actif, panneau, vue de
// travail et bandeau de combat restent ainsi toujours d'accord.
function goToSpace(space) {
  switchTab('workspace', space);
  workspaceView?.setSpace(space);
  combatBanner?.render(space);
}
const activeSpace = () => document.querySelector('.tab.is-active')?.dataset.workspaceSpace || 'prepare';
tabArray.forEach((t, idx) => {
  t.addEventListener('click', () => goToSpace(t.dataset.workspaceSpace || 'prepare'));
  t.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const nextIdx = (idx + dir + tabArray.length) % tabArray.length;
      const nextTab = tabArray[nextIdx];
      if (nextTab && nextTab.dataset.tab) {
        goToSpace(nextTab.dataset.workspaceSpace || 'prepare');
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
const combatViewUI = initCombatViewUI(Store, Combat, cardUI, id => {
  const line = Store.getDiceLines().find(item => item.id === id);
  if (line && inferActionType(line) === 'attack') {
    const actor = Store.getCombat().participants.get(line.participantId);
    if (!actor || actor.zone !== 'active') { showToast('Faites entrer ce combattant en jeu pour résoudre son attaque.', 'info'); return; }
    goToSpace('play');
    if (!workspaceView?.openResolution(line)) showToast('Cette action a changé : choisissez son attaque dans Jouer.', 'info');
    return;
  }
  runDiceLine(id, Store);
});

initLogViewUI(Store);

// Avance d'un tour, ou démarre le combat s'il n'a pas commencé. Partagé par le
// bandeau, le raccourci N / Espace et la commande « Terminer le tour » de Jouer.
function advanceTurn() {
  const combat = Store.getCombat();
  return combat.round > 0 ? Combat.nextTurn() : Combat.start();
}

initKeyboardShortcuts(Store, Combat, goToSpace, {
  advanceTurn,
  isCombatVisible: () => Boolean(combatBanner?.isVisible())
});

// E09–E17 workspace integration. The pure modules remain behind callbacks so
// Store stays the only owner of live combat and reserve mutations.
// Fenêtre « Préparer une rencontre » ouverte : sa boîte et la rencontre qu'elle édite (null tant que le brouillon neuf n'est pas enregistré).
let prepareWindow = null;
let launchingEncounter = false;
const deletingEncounters = new Set();

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
const sceneStatusLabels = { proposed: 'Conséquence proposée', 'not-eligible': 'Condition non remplie', 'already-resolved': 'Déjà résolu', duplicate: 'Déjà appliqué', applied: 'Appliqué', error: 'Erreur' };
function readableSceneEvent(event, scene = {}) {
  const { conditionText, consequenceText } = sceneEventParts(event, scene);
  return `${conditionText} : ${consequenceText}`;
}
function sceneEventParts(event, scene = {}) {
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
  return { conditionText, consequenceText };
}
const restoreReasonLabels = { 'restore-before': 'Avant restauration', 'import-before': 'Avant import', 'import-replace': 'Import remplacé', manual: 'Sauvegarde manuelle' };
const readableRestoreReason = reason => restoreReasonLabels[reason] || 'Version précédente';
const restoreSourceLabels = { 'legacy-localStorage': 'Ancienne sauvegarde locale', 'snapshot-v2': 'Sauvegarde courante' };
const readableRestoreSource = source => restoreSourceLabels[source] || 'Sauvegarde locale';
function readableRestoreDate(value) {
  const date = value instanceof Date ? value : new Date(typeof value === 'number' ? value : String(value || ''));
  return Number.isNaN(date.getTime()) ? 'Date inconnue' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function storedScene() {
  return requireStoreApi('getActiveScene')();
}

// Fenêtres d'outils : panneau docké à droite, non modal (onglets, bandeau et
// piste restent utilisables), une seule à la fois. `close()` émet `close` de
// façon synchrone, pour qu'une fenêtre remplacée rende ses éléments empruntés
// (formulaire de profil) avant que la suivante ne les prenne.
const FOCUSABLE = 'input:not([type=hidden]), select, textarea, button, summary, [href], [tabindex]:not([tabindex="-1"])';
let openSheet = null;
const topbar = qs('.topbar');
if (topbar && typeof ResizeObserver === 'function') {
  new ResizeObserver(() => document.documentElement.style.setProperty('--header-h', `${Math.round(topbar.getBoundingClientRect().height)}px`)).observe(topbar);
}

// Le bouton d'origine est souvent recréé par un re-rendu pendant que la fenêtre est
// ouverte : on le retrouve par sa clé de focus ou son id, à défaut par le titre de
// la zone qui le contenait.
function focusMemo(element) {
  if (!element || element === document.body) return null;
  const ancestors = [];
  for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) ancestors.push(parent);
  return { element, key: element.dataset?.focusKey || null, id: element.id || null, ancestors };
}

function focusFromMemo(memo) {
  if (!memo) return;
  const visible = item => item && item.isConnected && !item.disabled && item.checkVisibility?.();
  if (memo.element.closest?.('#app-menu')) { qs('#btn-menu')?.focus(); return; }
  const found = [memo.element,
    ...(memo.key ? Array.from(document.querySelectorAll(`[data-focus-key="${CSS.escape(memo.key)}"]`)) : []),
    memo.id ? document.getElementById(memo.id) : null].find(visible);
  if (found) { found.focus(); return; }
  const zone = memo.ancestors.find(item => item.isConnected && item.checkVisibility?.());
  const heading = Array.from(zone?.querySelectorAll('h1, h2, h3') || []).find(visible);
  if (!heading) return;
  if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
  heading.focus();
}

function openOverlay(title, build) {
  const previous = openSheet;
  const active = document.activeElement;
  const opener = previous && (!active || previous.contains(active)) ? previous.returnFocus : focusMemo(active);
  previous?.close({ restoreFocus: false });

  const dialog = document.createElement('dialog');
  dialog.className = 'tool-sheet';
  dialog.setAttribute('aria-labelledby', `tool-sheet-title-${uid()}`);
  const heading = document.createElement('div'); heading.className = 'tool-sheet-header';
  const label = document.createElement('h2'); label.id = dialog.getAttribute('aria-labelledby'); label.textContent = title;
  const close = document.createElement('button'); close.type = 'button'; close.className = 'ghost'; close.textContent = 'Fermer';
  heading.append(label, close); dialog.appendChild(heading);
  const mount = document.createElement('div'); mount.className = 'tool-sheet-body'; dialog.appendChild(mount);
  dialog.returnFocus = opener;

  let closed = false;
  let restoreFocus = true;
  // Le `close` natif (mis en file par le navigateur) arrive après le nôtre : il est ignoré.
  dialog.addEventListener('close', event => { if (event.isTrusted) event.stopImmediatePropagation(); }, { capture: true });
  dialog.close = ({ restoreFocus: restore = true } = {}) => {
    if (closed) return;
    closed = true; restoreFocus = restore;
    HTMLDialogElement.prototype.close.call(dialog);
    dialog.dispatchEvent(new Event('close'));
  };
  close.addEventListener('click', () => dialog.close());
  document.body.appendChild(dialog);
  openSheet = dialog;
  try { build(mount, dialog); } catch (error) { dialog.remove(); openSheet = null; throw error; }
  dialog.show();
  (mount.querySelector('[autofocus]') || Array.from(mount.querySelectorAll(FOCUSABLE)).find(item => !item.disabled && item.checkVisibility()) || close).focus();
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (openSheet === dialog) openSheet = null;
    if (!restoreFocus) return;
    // Une commande du menu ⋯ n'est plus visible : le focus revient au bouton du menu.
    focusFromMemo(opener);
  }, { once: true });
  return dialog;
}

function persistentCharacters() {
  return requireStoreApi('listPersistentCharacters')();
}

// Enregistrement silencieux de la préparation.
async function persistEncounter(draft) {
  const model = normalizeEncounter(draft);
  const stored = Store.listEncounters?.().find(item => item.id === model.id);
  model.status = stored?.status || 'prepared';
  if (prepareWindow) prepareWindow.encounterId = model.id;
  await awaitStore(requireStoreApi('saveEncounter')(model), 'Rencontre');
  return model;
}

function openPrepareView(encounterId = null) {
  const saved = encounterId ? Store.listEncounters?.().find(item => item.id === encounterId) : null;
  if (encounterId && !saved) throw new Error('Rencontre introuvable.');
  const encounter = saved ? normalizeEncounter(saved) : createEncounter({ title: 'Nouvelle rencontre' });
  return openOverlay(saved ? `Modifier « ${saved.title} »` : 'Préparer une rencontre', (mount, dialog) => {
    const view = initPrepareView({
      mount, hosted: true, Store, encounter,
      persistentCharacters: persistentCharacters(),
      callbacks: {
        getProfiles: () => Store.listProfiles(),
        onDraftChange: draft => persistEncounter(draft),
        onDuplicate: () => { showToast('Rencontre dupliquée', 'success'); },
        onSavePersistentCharacter: async character => { await awaitStore(requireStoreApi('savePersistentCharacter')(character), 'Personnage'); showToast('Personnage persistant ajouté', 'success'); },
        onDeletePersistentCharacter: async id => { await awaitStore(requireStoreApi('deletePersistentCharacter')(id), 'Suppression'); showToast('Personnage persistant supprimé', 'success'); },
        onLaunch: async draft => {
          if (!draft.entries.length) throw userError('Ajoutez au moins un profil à la composition avant de lancer.');
          const model = await persistEncounter(draft);
          await awaitStore(requireStoreApi('launchEncounter')(model), 'Lancement');
          dialog.close();
          goToSpace('play');
          showToast('Rencontre lancée', 'success');
        }
      }
    });
    const windowState = { dialog, encounterId: saved?.id || null, saving: Promise.resolve(true) };
    prepareWindow = windowState;
    // Toute fermeture (Fermer, Échap, autre fenêtre, lancement) enregistre la saisie en cours.
    dialog.addEventListener('close', () => {
      windowState.saving = view.flush();
      windowState.saving.then(done => { if (!done) showToast('Rencontre : la dernière modification n’a pas été enregistrée.', 'error'); });
      if (prepareWindow === windowState) prepareWindow = null;
    }, { once: true });
    view.render();
  });
}

// Recommence le combat (scène active : retour au lancement ; sinon PV et états remis à zéro). Confirmation d'abord : l'action efface des saisies.
async function restartCombat() {
  const scene = Store.getActiveScene?.();
  const running = scene?.status === 'active';
  const extra = running && ((scene.events || []).length || (scene.clocks || []).length || (scene.intentions || []).length)
    ? '\nLes événements, jauges et intentions créés pendant la séance seront effacés.' : '';
  const message = running
    ? `Recommencer « ${scene.title || 'Séance'} » depuis son lancement ?\nPV, états, tours et combattants reviennent à la composition de la rencontre ; les ajouts faits pendant le combat sont retirés.${extra}`
    : 'Recommencer le combat ?\nPV remis au maximum, états retirés, round remis à zéro.';
  if (!window.confirm(message)) return false;
  try {
    await awaitStore(requireStoreApi('restartCombat')(), 'Recommencer');
    showToast('Combat recommencé', 'success', { label: 'Annuler', onClick: () => Store.undo() });
    return true;
  } catch (error) { showToast(contextMessage('Combat non recommencé', error, 'réessayez.'), 'error'); return false; }
}

// Actions de la liste des rencontres (espaces Préparer et Jouer) : chacune montre ses erreurs en toast
// et renvoie true si elle a abouti (la vue déplace alors le focus).
const encounterListActions = {
  beginEncounter: () => { try { openPrepareView(); } catch (error) { showToast(contextMessage('Préparation impossible', error, 'réessayez.'), 'error'); } },
  editEncounter: id => { try { openPrepareView(id); } catch (error) { showToast(contextMessage('Rencontre non ouverte', error, 'réessayez.'), 'error'); } },
  launchEncounter: async id => {
    if (launchingEncounter) return false;
    launchingEncounter = true;
    try {
      // La fenêtre qui édite cette rencontre se ferme d'abord : sa saisie en cours est enregistrée avant le lancement.
      const editing = prepareWindow?.encounterId === id ? prepareWindow : null;
      // Échec signalé par la fermeture : ne pas lancer une composition périmée.
      if (editing) { editing.dialog.close(); if (!(await editing.saving)) return false; }
      const encounter = Store.listEncounters?.().find(item => item.id === id);
      if (!encounter) throw new Error('Rencontre introuvable.');
      if (!encounter.entries.length) throw userError('Ajoutez au moins un profil à la composition avant de lancer.');
      await awaitStore(requireStoreApi('launchEncounter')(id), 'Lancement');
      prepareWindow?.dialog.close();
      goToSpace('play');
      showToast('Rencontre lancée', 'success');
      return true;
    } catch (error) { showToast(contextMessage('Rencontre non lancée', error, 'réessayez.'), 'error'); return false; }
    finally { launchingEncounter = false; }
  },
  deleteEncounter: async id => {
    // Double clic : la rencontre est déjà supprimée, ou en train de l'être.
    if (deletingEncounters.has(id) || !Store.listEncounters?.().some(item => item.id === id)) return false;
    deletingEncounters.add(id);
    try {
      // La fenêtre qui l'édite se ferme d'abord : sa saisie en cours est enregistrée avant la suppression, pas après.
      const editing = prepareWindow?.encounterId === id ? prepareWindow : null;
      if (editing) { editing.dialog.close(); await editing.saving; }
      const encounter = Store.listEncounters().find(item => item.id === id);
      if (!encounter) return false;
      await awaitStore(requireStoreApi('deleteEncounter')(id), 'Suppression');
      // La suppression et son annulation incluent le combat associé.
      const deletionRevision = Store.getLocalRevision();
      const restore = async () => {
        if (Store.getLocalRevision() !== deletionRevision) {
          showToast('Utilisez Annuler dans la barre pour revenir sur les actions suivantes, puis sur la suppression.', 'info');
          return;
        }
        try { await awaitStore(Store.undo(), 'Annulation'); showToast(`Rencontre « ${encounter.title} » rétablie`, 'success'); }
        catch (error) { showToast(contextMessage('Rencontre non rétablie', error, 'réessayez.'), 'error'); }
      };
      showToast(`Rencontre « ${encounter.title} » supprimée`, 'success', { label: 'Annuler', onClick: restore });
      return true;
    } catch (error) { showToast(contextMessage('Rencontre non supprimée', error, 'réessayez.'), 'error'); return false; }
    finally { deletingEncounters.delete(id); }
  },
  resumeScene: async sceneId => {
    try {
      await awaitStore(requireStoreApi('resumeScene')(sceneId), 'Reprise');
      goToSpace('play');
      showToast('Séance reprise', 'info');
      return true;
    } catch (error) { showToast(contextMessage('Séance non reprise', error, 'réessayez.'), 'error'); return false; }
  },
  suspendScene: async () => {
    try {
      await awaitStore(requireStoreApi('suspendActiveScene')(), 'Suspension');
      showToast('Séance suspendue', 'info');
      return true;
    } catch (error) { showToast(contextMessage('Séance non suspendue', error, 'réessayez.'), 'error'); return false; }
  },
  restartCombat: () => restartCombat(),
  showPlay: () => goToSpace('play')
};

function openCreateProfileView() {
  return openOverlay('Nouveau profil', (mount, dialog) => {
    const form = DOM.reserve.form;
    if (!form) throw new Error('Éditeur de profil indisponible.');
    // Création par collage de JSON : repliée, au-dessus du formulaire manuel. Construite avant
    // d'emprunter le formulaire, pour qu'une erreur ici ne le laisse pas hors de la page.
    const jsonImport = document.createElement('details'); jsonImport.className = 'card';
    const jsonSummary = document.createElement('summary'); jsonSummary.textContent = 'Créer depuis un JSON';
    const jsonMount = document.createElement('div'); jsonImport.append(jsonSummary, jsonMount);
    const jsonView = initTextImportView({
      mount: jsonMount, hosted: true, parser: parseProfileJson,
      texts: {
        title: 'Créer des profils depuis du JSON', help: 'Collez un profil JSON, ou une liste de profils.', inputLabel: 'JSON du profil',
        previewLabel: 'Vérifier le JSON', example: PROFILE_JSON_EXAMPLE, importLabel: count => `Créer ${count} profil${count > 1 ? 's' : ''}`,
        fallback: 'JSON illisible : vérifiez les virgules, guillemets et accolades.',
        stale: 'JSON modifié depuis la vérification : vérifiez-le à nouveau avant de créer.'
      },
      callbacks: {
        onImport: async (parsed, { confirmed = false } = {}) => {
          const count = await storeParsedProfiles(parsed, confirmed);
          dialog.close(); showToast(count > 1 ? `${count} profils créés` : 'Profil créé', 'success');
        },
        // L'aperçu se referme ; le JSON collé reste là pour être corrigé.
        onCancel: () => jsonView.resetPreview()
      }
    });
    jsonView.render();
    const placeholder = document.createComment('form-add-placeholder');
    form.replaceWith(placeholder);
    reserveUI.resetForm?.();
    const editorToken = uid(); form.dataset.editorToken = editorToken;
    form.classList.add('card');
    mount.append(jsonImport, form);
    // `openOverlay` focalise [autofocus] d'abord : sans lui, le résumé ci-dessus prendrait le focus.
    const nameField = form.querySelector('[name=name]'); nameField?.setAttribute('autofocus', '');
    profileSavedHandler = { token: editorToken, fn: () => dialog.close() };
    const finish = () => { nameField?.removeAttribute('autofocus'); if (profileSavedHandler?.token === editorToken) profileSavedHandler = null; delete form.dataset.editorToken; if (placeholder.parentNode) placeholder.replaceWith(form); form.classList.remove('card'); reserveUI.resetForm?.(); };
    dialog.addEventListener('close', finish, { once: true });
    nameField?.focus();
  });
}

// Menu ⋯ : les commandes de séance suivent la scène active et les scènes suspendues.
function renderAppMenu() {
  const active = Store.getActiveScene?.();
  const running = active?.status === 'active';
  ['workspace-reminders', 'workspace-events'].forEach(id => { const button = qs(`#${id}`); if (button) button.disabled = !running; });
  const restart = qs('#workspace-restart-combat'); if (restart) restart.hidden = !(running || Store.getCombat?.().participants?.size > 0);
  const mount = qs('#app-menu-resume'); if (!mount) return;
  mount.replaceChildren();
  (Store.listSuspendedScenes?.() || []).forEach(scene => {
    const resume = document.createElement('button'); resume.type = 'button';
    resume.textContent = `Reprendre « ${scene.title || 'Séance'} »`; resume.disabled = Boolean(active);
    resume.addEventListener('click', async () => { resume.disabled = true; try { await awaitStore(requireStoreApi('resumeScene')(scene.id), 'Reprise'); goToSpace('play'); } catch (error) { resume.disabled = false; showToast(contextMessage('Séance non reprise', error, 'réessayez.'), 'error'); } });
    mount.appendChild(resume);
  });
}

// Panneau non modal (role="dialog", boutons ordinaires : il contient aussi l'état
// et le compte, qui ne sont pas des commandes). Échap et clic extérieur sont gérés par le navigateur
// (popover="auto") ; on ajoute le placement, le focus et la navigation ↑/↓.
function initAppMenu() {
  const menu = qs('#app-menu'); const trigger = qs('#btn-menu');
  if (!menu || !trigger || typeof menu.showPopover !== 'function') return;
  const items = () => Array.from(menu.querySelectorAll('button')).filter(button => !button.disabled && button.checkVisibility());
  const place = () => {
    const rect = trigger.getBoundingClientRect();
    menu.style.top = `${Math.round(rect.bottom + 6)}px`;
    menu.style.right = `${Math.max(8, Math.round(document.documentElement.clientWidth - rect.right))}px`;
  };
  menu.addEventListener('beforetoggle', event => { if (event.newState === 'open') { renderAppMenu(); place(); } });
  menu.addEventListener('toggle', event => {
    const open = event.newState === 'open';
    trigger.setAttribute('aria-expanded', String(open));
    if (open) { items()[0]?.focus(); return; }
    const focused = document.activeElement;
    if (!focused || focused === document.body || menu.contains(focused)) trigger.focus();
  });
  menu.addEventListener('click', event => {
    const item = event.target.closest('button');
    if (!item || item.hasAttribute('data-keep-open')) return;
    if (menu.matches(':popover-open')) menu.hidePopover();
  });
  menu.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const list = items(); if (!list.length) return;
    event.preventDefault();
    const index = list.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? list.length - 1
        : event.key === 'ArrowDown' ? (index + 1) % list.length : (index - 1 + list.length) % list.length;
    list[next].focus();
  });
  window.addEventListener('resize', () => { if (menu.matches(':popover-open')) place(); });
}

function sceneFromStore() {
  return storedScene();
}

function downloadText(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

// Import de profils analysés (texte ou JSON) : refusé tant que les points à vérifier ne sont pas confirmés.
async function storeParsedProfiles(parsed, confirmed) {
  if (parsed.status !== 'ready' && !confirmed) throw userError('Confirmez les champs absents ou ambigus avant import.');
  await awaitStore(requireStoreApi('importParsedProfiles')(parsed.profiles), 'Import');
  return parsed.profiles.length;
}

function openTextImportView() {
  return openOverlay('Importer des profils depuis du texte', (mount, dialog) => {
    const view = initTextImportView({
      mount, hosted: true, parser: parseProfileInput,
      texts: { help: 'Texte : un bloc par profil, séparés par une ligne ---. JSON : un profil ou une liste de profils.' },
      callbacks: {
        onImport: async (parsed, { confirmed = false } = {}) => {
          const count = await storeParsedProfiles(parsed, confirmed);
          dialog.close(); showToast(count > 1 ? `${count} profils importés` : `${count} profil importé`, 'success');
        },
        onCancel: () => dialog.close()
      }
    });
    view.render();
  });
}

// Fiches de personnage : les modules Firebase (Firestore, App Check) ne sont chargés qu'à l'ouverture.
async function openFicheSyncView() {
  const { createFicheSource } = await import('./core/fiche-source.js');
  const source = createFicheSource();
  return openOverlay('Mettre à jour les PJ', (mount, dialog) => {
    const view = initFicheSyncView({
      mount, hosted: true, source,
      getContext: () => ({ profiles: Store.listProfiles(), participants: [...Store.listParticipants(), ...(Store.listSuspendedScenes?.() || []).flatMap(scene => (scene.participants || []).map(row => ({...row,name:`${row.name} — ${scene.title || 'scène suspendue'}`})))], revision: Store.getLocalRevision?.() }),
      callbacks: {
        onApply: async (entries, options) => {
          const result = await awaitStore(requireStoreApi('applyFicheSync')(entries, options), 'Mise à jour des PJ');
          dialog.close();
          if (result?.changed === false) { showToast('Aucun changement : les PJ sont déjà à jour', 'info'); return; }
          showToast(entries.length > 1 ? `${entries.length} PJ mis à jour depuis les fiches` : 'PJ mis à jour depuis la fiche', 'success', { label: 'Annuler', onClick: () => Store.undo() });
        },
        onCancel: () => dialog.close()
      }
    });
    view.start();
  });
}

function openRestoresView() {
  return openOverlay('Versions précédentes', (mount, dialog) => {
    const status = document.createElement('p'); status.className = 'muted'; status.textContent = 'Chargement…'; mount.appendChild(status);
    const list = document.createElement('div'); mount.appendChild(list);
    const render = async () => {
      list.replaceChildren();
      try {
        const points = await requireStoreApi('listRestorePoints')();
        status.textContent = points.length ? `${points.length} version${points.length > 1 ? 's' : ''} disponible${points.length > 1 ? 's' : ''}` : 'Aucune version précédente disponible.';
        for (const point of points) {
          const row = document.createElement('article'); row.className = 'card';
          const heading = document.createElement('h3'); heading.textContent = `${readableRestoreReason(point.reason)} · ${readableRestoreDate(point.createdAt)}`;
          const meta = document.createElement('p'); meta.className = 'muted'; meta.textContent = `${readableRestoreSource(point.sourceFormat || 'snapshot-v2')} · révision ${point.localRevision ?? '—'}`;
          const actions = document.createElement('div'); actions.className = 'row';
          const previewButton = document.createElement('button'); previewButton.type = 'button'; previewButton.className = 'ghost small'; previewButton.textContent = 'Voir le contenu';
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
            } catch (error) { details.textContent = contextMessage('Contenu illisible', error, 'cette version ne peut pas être restaurée.'); }
            finally { previewButton.disabled = false; }
          });
          restoreButton.disabled = true;
          restoreButton.addEventListener('click', async () => {
            if (!preview) { details.textContent = 'Affichez le contenu de cette version avant de la restaurer.'; return; }
            if (!window.confirm(`Restaurer la version « ${readableRestoreReason(point.reason)} » ? La partie courante sera remplacée.`)) return;
            restoreButton.disabled = true;
            try {
              const result = await awaitStore(requireStoreApi('restorePoint')(point.id, { expectedRevision: previewRevision, expectedPointRevision: preview.data?.localRevision }), 'Restauration');
              if (result?.status !== 'restored') throw result?.status === 'stale' ? userError('La partie a changé : affichez à nouveau le contenu de cette version.') : new Error('Restauration non appliquée.');
              showToast('Version précédente restaurée', 'success'); dialog.close();
            } catch (error) { restoreButton.disabled = false; details.textContent = contextMessage('Restauration impossible', error, 'réessayez, ou chargez une sauvegarde depuis un fichier.'); }
          });
          actions.append(previewButton, restoreButton); row.append(heading, meta, actions, details); list.appendChild(row);
        }
      } catch (error) { status.textContent = contextMessage('Versions précédentes indisponibles', error, 'le stockage local ne les conserve pas sur cet appareil.'); }
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
            } catch (error) { button.disabled = false; showToast(contextMessage('Rappel non enregistré', error, 'réessayez.'), 'error'); }
          }); row.appendChild(button);
        });
        mount.appendChild(row);
      });
    };
    render();
  });
}

// « À traiter » de Jouer : rappels en attente et événements proposés, rien sinon.
// L'aperçu d'un événement survit aux re-rendus de la vue (clé : id de l'événement).
const sceneEventPreviews = new Map();
const TURN_REMINDER_KINDS = ['endTurn', 'startTurn'];
function renderWorkspaceOverview(content) {
  if (!content) return;
  content.replaceChildren();
  const scene = Store.getActiveScene?.();
  if (!scene) return;
  const combat = Store.getCombat(); const actor = combat.currentActorId ? combat.participants.get(combat.currentActorId) : null;
  const transition = { id: `round-${combat.round || 0}`, type: 'endTurn', actorId: actor?.id || null, round: combat.round || 0 };
  // Pas de rappel de tour tant que personne n'a la main (combat pas commencé).
  const reminders = (Store.getReminders?.(transition) || []).filter(item => item.status === 'pending' && (actor || !TURN_REMINDER_KINDS.includes(item.kind)));
  const smallButton = (label, onClick) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'ghost small'; button.textContent = label;
    button.addEventListener('click', async () => { button.disabled = true; try { await onClick(); } catch (error) { button.disabled = false; showToast(userMessage(error, 'Action non enregistrée : réessayez.'), 'error'); } });
    return button;
  };
  reminders.forEach(item => {
    const row = document.createElement('div'); row.className = 'workspace-pending-row';
    const label = document.createElement('span'); label.textContent = `${item.text || 'Rappel'} · ${reminderStatusLabels[item.status] || 'À traiter'}`;
    row.appendChild(label);
    [['resolve', 'Résoudre'], ['ignore', 'Ignorer'], ['snooze', 'Reporter']].forEach(([decision, text]) => row.appendChild(smallButton(text, async () => {
      try { await awaitStore(Store.resolveReminder(item.id, decision), 'Rappel'); } catch (error) { throw userError(contextMessage('Rappel non enregistré', error, 'réessayez.')); }
      renderWorkspaceOverview(content);
    })));
    content.appendChild(row);
  });
  const events = Array.isArray(scene.events) ? scene.events : [];
  events.forEach(event => {
    const proposal = Store.previewSceneEvent?.(event, { manual: true });
    if (proposal?.status !== 'proposed') return;
    const row = document.createElement('div'); row.className = 'workspace-pending-row';
    const label = document.createElement('span'); label.textContent = readableSceneEvent(event, scene); row.appendChild(label);
    const preview = sceneEventPreviews.get(event.id);
    if (!preview) {
      row.appendChild(smallButton('Voir la conséquence', async () => {
        sceneEventPreviews.set(event.id, await Store.previewSceneEvent(event, { manual: true }));
        renderWorkspaceOverview(content);
      }));
    } else {
      const summary = document.createElement('p'); summary.className = 'muted';
      summary.textContent = `Conséquence proposée : ${readableSceneEvent(event, scene).split(' : ').slice(1).join(' : ') || 'appliquer une conséquence'}. Rien n’est appliqué avant confirmation.`;
      row.append(summary, smallButton('Appliquer la conséquence', async () => {
        let result;
        try { result = await awaitStore(Store.applySceneEvent(event, { baseRevision: preview.baseRevision, sceneRevision: preview.sceneRevision, confirmed: true }), 'Événement'); }
        catch (error) { sceneEventPreviews.delete(event.id); renderWorkspaceOverview(content); throw userError(contextMessage('Événement non appliqué', error, 'affichez à nouveau la conséquence.')); }
        sceneEventPreviews.delete(event.id);
        if (result?.status !== 'applied') throw userError('Événement non appliqué : la condition n’est plus remplie.');
        showToast('Conséquence appliquée', 'success');
        renderWorkspaceOverview(content);
      }));
    }
    content.appendChild(row);
  });
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
      box.appendChild(Object.assign(document.createElement('strong'), { textContent: eventModel.id }));
      const { conditionText, consequenceText } = sceneEventParts(eventModel, scene);
      const summary = document.createElement('dl'); summary.className = 'scene-event-summary';
      [['Condition', conditionText], ['Conséquence', consequenceText], ['Statut', sceneStatusLabels[preview.status] || 'À vérifier']].forEach(([term, text]) => summary.append(Object.assign(document.createElement('dt'), { textContent: term }), Object.assign(document.createElement('dd'), { textContent: text })));
      box.appendChild(summary);
      if (preview.status === 'proposed') {
        const apply = document.createElement('button'); apply.type = 'button'; apply.textContent = 'Appliquer la conséquence';
        apply.addEventListener('click', async () => { apply.disabled = true; try { const result = await awaitStore(requireStoreApi('applySceneEvent')(eventModel, { baseRevision: preview.baseRevision, sceneRevision: preview.sceneRevision, confirmed: true }), 'Événement'); if (result?.status !== 'applied') throw new Error(result?.reason || 'Conséquence non appliquée.'); showToast('Conséquence appliquée', 'success'); previewMount.replaceChildren(); } catch (error) { apply.disabled = false; showToast(contextMessage('Conséquence non appliquée', error, 'enregistrez et prévisualisez à nouveau l’événement.'), 'error'); } }); box.appendChild(apply);
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
        showPreview(eventModel, preview); showToast('Événement enregistré : vérifiez l’aperçu avant de l’appliquer', 'info');
      } catch (error) { showToast(contextMessage('Événement non enregistré', error, 'vérifiez l’identifiant, la condition et la cible.'), 'error'); } finally { submit.disabled = false; }
    });
    mount.append(form, previewMount);
    const intentionForm = document.createElement('form'); intentionForm.className = 'card';
    intentionForm.innerHTML = '<strong>Ajouter une intention</strong><label>Identifiant<input name="id" required></label><label>Participant<select name="participant"><option value="">Scène</option></select></label><label>Motivation<input name="motivation"></label><label>Objectif<input name="objective"></label><label>Condition de repli<input name="retreat"></label><button type="submit">Enregistrer l’intention</button>';
    const participantSelect = intentionForm.elements.participant; Store.listParticipants().forEach(participant => participantSelect.append(new Option(participant.name, participant.id)));
    intentionForm.addEventListener('submit', async event => {
      event.preventDefault(); const submit = intentionForm.querySelector('button'); submit.disabled = true;
      try { await awaitStore(requireStoreApi('createIntention')({ id: intentionForm.elements.id.value.trim(), participantId: participantSelect.value || null, motivation: intentionForm.elements.motivation.value, objective: intentionForm.elements.objective.value, retreatCondition: intentionForm.elements.retreat.value }), 'Intention'); showToast('Intention enregistrée', 'success'); intentionForm.reset(); }
      catch (error) { submit.disabled = false; showToast(contextMessage('Intention non enregistrée', error, 'vérifiez l’identifiant, puis réessayez.'), 'error'); }
    });
    mount.appendChild(intentionForm);
    const clockForm = document.createElement('form'); clockForm.className = 'card';
    clockForm.innerHTML = '<strong>Jauge manuelle</strong><label>Identifiant<input name="id" required></label><label>Valeur<input name="value" type="number" value="0"></label><label>Maximum<input name="max" type="number" min="1" value="6"></label><button type="submit">Créer la jauge</button>';
    clockForm.addEventListener('submit', async event => {
      event.preventDefault(); const submit = clockForm.querySelector('button'); submit.disabled = true;
      try { await awaitStore(requireStoreApi('executeCommand')('create-scene-clock', draft => ({ ...draft, activeScene: { ...draft.activeScene, clocks: [...(draft.activeScene?.clocks || []), { id: clockForm.elements.id.value.trim(), value: Number(clockForm.elements.value.value) || 0, max: Number(clockForm.elements.max.value) || null }] } })), 'Jauge'); showToast('Jauge créée', 'success'); }
      catch (error) { submit.disabled = false; showToast(contextMessage('Jauge non créée', error, 'vérifiez l’identifiant et le maximum.'), 'error'); }
    });
    mount.appendChild(clockForm);
    (scene.clocks || []).forEach(clock => {
      const row = document.createElement('div'); row.className = 'card row'; row.append(document.createTextNode(`${clock.id} · ${clock.value}/${clock.max ?? '∞'}`));
      const advance = document.createElement('button'); advance.type = 'button'; advance.className = 'ghost small'; advance.textContent = '+1';
      advance.addEventListener('click', async () => { advance.disabled = true; try { await awaitStore(requireStoreApi('advanceSceneClock')(clock.id, 1), 'Jauge'); showToast(`Jauge ${clock.id} avancée`, 'success'); } catch (error) { advance.disabled = false; showToast(contextMessage('Jauge non avancée', error, 'réessayez.'), 'error'); } }); row.appendChild(advance); mount.appendChild(row);
    });
    if (!scene.events.length) { const empty = document.createElement('p'); empty.textContent = 'Aucun événement structuré dans cette séance.'; mount.appendChild(empty); return; }
    scene.events.forEach(event => {
      const proposal = proposeSceneEvent(scene, event, { manual: event.condition?.type === 'manual' });
      const row = document.createElement('div'); row.className = 'card';
      const label = document.createElement('p'); label.textContent = `${event.id} · ${sceneStatusLabels[proposal.status] || 'À vérifier'}`; row.appendChild(label);
      if (proposal.status === 'proposed') { const resolve = document.createElement('button'); resolve.type = 'button'; resolve.textContent = 'Voir la conséquence'; resolve.addEventListener('click', async () => { resolve.disabled = true; try { const preview = await requireStoreApi('previewSceneEvent')(event, { manual: true }); showPreview(event, preview); } catch (error) { showToast(contextMessage('Aperçu impossible', error, 'réessayez.'), 'error'); } finally { resolve.disabled = false; } }); row.appendChild(resolve); }
      mount.appendChild(row);
    });
  });
}

const workspaceView = DOM.panels.workspace && qs('#workspace-root') ? initWorkspaceView({
  Store, Combat, Bus, mount: qs('#workspace-root'), showNavigation: false,
  actions: {
    ...encounterListActions,
    createProfile: openCreateProfileView,
    duplicateProfile: id => awaitStore(Store.duplicateProfile(id), 'Duplication'),
    removeProfile: id => awaitStore(Store.removeProfile(id), 'Suppression'),
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
        const restore = () => { preview.remove(); form.querySelector('[name=propagate]')?.removeEventListener('change', updatePreview); if (profileSavedHandler?.token === editorToken) profileSavedHandler = null; delete form.dataset.editorToken; if (placeholder.parentNode) placeholder.replaceWith(form); form.classList.remove('card'); reserveUI.resetForm?.(); };
        dialog.addEventListener('close', restore, { once: true });
      });
    },
    removeParticipant: async id => {
      try {
        await awaitStore(Store.removeParticipant(id), 'Retrait');
        showToast('Combattant retiré du combat', 'success');
      } catch (error) {
        showToast(contextMessage('Combattant non retiré', error, 'réessayez.'), 'error');
        throw error;
      }
    },
    editParticipant: id => {
      const participant = Store.getCombat().participants.get(id);
      if (!participant) return;
      openOverlay(`Modifier ${participant.name}`, (mount, dialog) => {
        const form = document.createElement('form'); form.className = 'card';
        form.dataset.participantEditor = id;
        form.innerHTML = `
          <div class="grid-2">
            <label>Nom<input name="name" required></label>
            <label>PV actuels<input name="hp" type="number"></label>
            <label>Initiative<input name="initiative" type="number" step="1"></label>
            <label>Zone
              <select name="zone"><option value="active">Actif</option><option value="bench">En attente</option></select>
            </label>
            <label>Camp
              <select name="camp">${Object.entries(CAMP_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select>
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
        form.elements.initiative.readOnly = Boolean(participant.extensions?.ficheId);
        form.elements.zone.value = participant.zone === 'active' ? 'active' : 'bench';
        form.elements.camp.value = normalizeCamp(participant.camp, participant.kind);
        // Fenêtre non modale : seuls les champs modifiés ici sont envoyés, pour ne pas
        // écraser les PV ou les états changés entre-temps par la fiche ou le tour suivant.
        const fields = ['name', 'hp', 'initiative', 'zone', 'camp'];
        const baseline = Object.fromEntries(fields.map(field => [field, form.elements[field].value]));
        const fieldChanged = field => form.elements[field].value !== baseline[field];
        let actionsTouched = false;

        const alertError = message => {
          form.querySelector('[role="alert"]')?.remove();
          const alert = document.createElement('p'); alert.setAttribute('role', 'alert'); alert.textContent = message; form.prepend(alert);
        };
        const setBusy = busy => form.querySelectorAll('button').forEach(button => { button.disabled = busy || button.dataset.sourceReadonly === 'true'; });

        const stateValues = normalizeEffects(participant.states || []).map(state => ({ ...state }));
        baseline.states = JSON.stringify(normalizeEffects(stateValues));
        const statesChanged = () => JSON.stringify(normalizeEffects(stateValues)) !== baseline.states;
        const stateMount = form.querySelector('.participant-state-list');
        const stateNames = ['Blessé', 'À Terre', 'Sonné', 'Inconscient', 'Aveuglé', 'Assourdi', 'Exténué', 'Hémorragique', 'Surpris', 'Enchevêtré', 'Enflammé', 'Brisé'];
        const renderStates = () => {
          stateMount.replaceChildren();
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
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger ghost small'; remove.textContent = 'Retirer cette action'; remove.addEventListener('click', () => { actionsTouched = true; actionValues.splice(index, 1); renderActions(); });
            const header = document.createElement('div'); header.className = 'row'; header.append(document.createElement('strong'), remove); header.firstChild.textContent = action.note || `Action ${index + 1}`;
            container.appendChild(header);
            const sourceObject = Boolean(action.extensions?.fiche?.equipmentId);
            const sourceSkill = Boolean(action.extensions?.ficheSkill);
            const editor = createActionEditor({ container, action, caracs: participant.caracs, onChange: next => {
              actionsTouched = true;
              actionValues[index] = sourceObject ? { ...action, mod: next.mod } : sourceSkill ? { ...next, id: action.id, base: action.base } : { ...next, id: action.id };
              header.firstChild.textContent = actionValues[index].note || `Action ${index + 1}`;
            } });
            if (sourceObject) {
              remove.disabled = true; remove.dataset.sourceReadonly = 'true'; remove.title = 'Action provenant de la fiche ; actualisez les PJ pour la retirer.';
              for (const field of editor.element.querySelectorAll('input,select,button')) if (!field.classList.contains('action-mod')) { field.disabled = true; field.dataset.sourceReadonly = 'true'; }
            } else if (sourceSkill) editor.element.querySelector('.action-base').readOnly = true;
            actionMount.appendChild(container);
          });
        };
        renderActions();
        form.querySelector('[data-add-action]').addEventListener('click', () => { actionsTouched = true; actionValues.push({ id: uid(), type: '', base: '', mod: 0, note: 'Action improvisée', damage: 0, qualities: [] }); renderActions(); actionMount.lastElementChild?.querySelector('.action-note')?.focus(); });

        const reorder = async direction => {
          try {
            const order = (Store.getEffectiveOrder?.() || Store.getCombat().order || []).filter(Boolean);
            const index = order.indexOf(id); if (index < 0) throw userError('Faites entrer ce combattant en jeu avant de changer sa place.');
            const beforeId = direction === 'up' ? order[index - 1] || null : direction === 'down' ? (order[index + 2] || null) : null;
            await awaitStore(direction === 'initiative' ? Store.rebuildOrder() : Store.moveInOrder(id, beforeId), 'Ordre');
          } catch (error) { alertError(contextMessage('Ordre non modifié', error, 'réessayez.')); }
        };
        form.querySelectorAll('[data-order]').forEach(button => button.addEventListener('click', () => reorder(button.dataset.order)));
        form.querySelector('[data-remove-participant]').addEventListener('click', async () => {
          setBusy(true); try { await awaitStore(Store.removeParticipant(id), 'Retrait'); form.closest('dialog')?.close(); } catch (error) { setBusy(false); alertError(contextMessage('Combattant non retiré', error, 'réessayez.')); }
        });
        form.addEventListener('submit', async event => {
          event.preventDefault(); const save = form.querySelector('button[type="submit"]'); setBusy(true);
          try {
            const zone = form.elements.zone.value === 'active' ? 'active' : 'bench';
            const patch = {};
            if (fieldChanged('name')) patch.name = form.elements.name.value.trim() || participant.name;
            if (fieldChanged('hp')) patch.hp = Number(form.elements.hp.value) || 0;
            if (!participant.extensions?.ficheId && fieldChanged('initiative')) patch.initiative = Number(form.elements.initiative.value) || 0;
            if (fieldChanged('camp')) patch.camp = form.elements.camp.value;
            if (statesChanged()) patch.states = normalizeEffects(stateValues);
            if (actionsTouched) {
              const liveActions = Store.getCombat().participants.get(id)?.actions || [];
              // An open editor must also retain source changes applied while it was open.
              patch.actions = actionValues.flatMap(action => {
                const live = liveActions.find(item => item.id === action.id);
                if (live?.extensions?.fiche?.equipmentId) return [{ ...live, mod: action.mod }];
                if (action.extensions?.fiche?.equipmentId) return [];
                return [live?.extensions?.ficheSkill ? { ...action, base: live.base, extensions: { ...action.extensions, ...live.extensions } } : action];
              });
              for (const live of liveActions) if (live.extensions?.fiche?.equipmentId && !patch.actions.some(action => action.id === live.id)) patch.actions.push(live);
            }
            if (Object.keys(patch).length) await awaitStore(Store.updateParticipant(id, patch, { expectedLocalRevision: Store.getLocalRevision() }), 'Participant');
            if (fieldChanged('zone') && zone !== Store.getCombat().participants.get(id)?.zone) await awaitStore(Store.moveParticipant(id, zone), 'Zone');
            form.closest('dialog')?.close();
          } catch (error) { setBusy(false); alertError(contextMessage('Combattant non enregistré', error, 'vérifiez les champs, puis réessayez.')); }
        });
        // PV et états non touchés ici suivent la partie ; un champ en cours d'édition n'est jamais écrasé.
        const refreshLive = () => {
          const live = Store.getCombat().participants.get(id);
          if (!live) return;
          const hpInput = form.elements.hp;
          if (!fieldChanged('hp') && document.activeElement !== hpInput) {
            hpInput.value = live.hp; baseline.hp = hpInput.value;
          }
          if (!statesChanged() && !stateMount.contains(document.activeElement)) {
            const fresh = normalizeEffects(live.states || []).map(state => ({ ...state }));
            stateValues.splice(0, stateValues.length, ...fresh);
            baseline.states = JSON.stringify(normalizeEffects(stateValues));
            renderStates();
          }
        };
        ['combat', 'combat:update'].forEach(event => Bus.on(event, refreshLive));
        dialog.addEventListener('close', () => ['combat', 'combat:update'].forEach(event => Bus.off(event, refreshLive)), { once: true });
        mount.appendChild(form);
      });
    },
    enterParticipant: id => awaitStore(Store.moveParticipant(id, 'active'), 'Entrée en jeu').catch(error => showToast(contextMessage('Entrée en jeu impossible', error, 'réessayez.'), 'error')),
    setStates: (id, states) => awaitStore(Store.updateParticipant(id, { states: normalizeEffects(states) }), 'États'),
    addProfileToCombat: async id => {
      try {
        await awaitStore(Store.addProfilesToCombat([id]), 'Ajout au combat');
        showToast(`${Store.getProfile(id)?.name || 'Profil'} ajouté en attente`, 'success');
      } catch (error) { showToast(contextMessage('Profil non ajouté au combat', error, 'réessayez.'), 'error'); }
    },
    applyResolution: async preview => {
      const result = await awaitStore(requireStoreApi('applyResolution')(preview), 'Résolution');
      const target = preview.input?.target;
      // Perte de PV réelle : dégâts de l'arme + Blessures du critique cochées.
      const critical = preview.critical?.application;
      const criticalApplied = Boolean(critical?.extraWounds || critical?.states?.length);
      const manual = preview.weapon?.status === 'manual';
      if (result?.status === 'applied') showToast(preview.damage && target ? `${previewHpLoss(preview)} dégâts appliqués à ${target.name}`
        : target && criticalApplied ? `Critique appliqué à ${target.name}${manual ? ' — dégâts de l’arme à arbitrer' : ''}`
          : manual ? 'Résultat enregistré — dégâts à arbitrer' : 'Résultat enregistré', 'success');
      else if (result?.status === 'duplicate') showToast('Résultat déjà appliqué', 'info');
      else if (result?.status !== 'stale') throw new Error(result?.reason || 'Résolution non appliquée.');
      return result;
    },
    renderRules: content => { renderReferenceTables('', content); },
    renderOverview: renderWorkspaceOverview,
    renderLog: content => { renderLog(Store, content, { contextual: true }); },
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

combatBanner = initCombatBanner({ Store, mount: qs('#combat-banner'), onAdvance: advanceTurn, onGoToPlay: () => goToSpace('play') });
combatBanner.render(activeSpace());
initAppMenu();
renderAppMenu();

const safeOpen = operation => { try { operation(); } catch (error) { showToast(userMessage(error, 'Cette fenêtre n’a pas pu s’ouvrir : rechargez la page.'), 'error'); } };
on(qs('#workspace-reminders'), 'click', () => safeOpen(openRemindersView));
on(qs('#workspace-events'), 'click', () => safeOpen(openEventsView));
on(qs('#workspace-import-text'), 'click', () => safeOpen(openTextImportView));
on(qs('#workspace-fiche-sync'), 'click', () => { openFicheSyncView().catch(error => showToast(contextMessage('Fiches indisponibles', error, 'vérifiez votre connexion, puis réessayez.'), 'error')); });
on(qs('#workspace-restart-combat'), 'click', () => { restartCombat(); });
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
  try { await awaitStore(Store.importFromReserve(ids), 'Import'); importModalUI.clearSelection?.(); DOM.importModal.dialog.close(); showToast(ids.length > 1 ? `${ids.length} profils importés en combat` : `${ids.length} profil importé en combat`, 'success'); }
  catch (error) { showToast(contextMessage('Import impossible', error, 'réessayez.'), 'error'); }
  finally { DOM.importModal.confirm.disabled = false; }
});
on(DOM.combat.btnExport, 'click', async () => {
  if (confirm('Appliquer PV aux profils correspondants ?')) {
    try { const result = await awaitStore(Store.exportToReserve(), 'Export'); showToast(result?.warnings?.length ? result.warnings.join(' ') : 'Profils de la réserve mis à jour', result?.warnings?.length ? 'warning' : 'success'); }
    catch (error) { showToast(contextMessage('Export impossible', error, 'réessayez.'), 'error'); }
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
      showToast(contextMessage('Sauvegarde non chargée', err, 'Ce fichier n’est pas une sauvegarde de l’outil MJ.'), 'error');
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
Bus.on('combat', renderAppMenu);
['combat', 'combat:update', 'reserve'].forEach(event => Bus.on(event, () => combatBanner?.render(activeSpace())));
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
    .catch(error => showToast(contextMessage('Conflit non résolu', error, 'exportez les deux versions, puis réessayez.'), 'error'));

  const exportBoth = () => {
    let json;
    try { json = Store.exportSyncConflict?.() || Store.getFullJSON(); }
    catch (error) { showToast(contextMessage('Export impossible', error, 'réessayez.'), 'error'); return; }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wfrp-conflit-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Versions locale et distante exportées', 'info');
  };

  const preview = () => {
    let json;
    try { json = Store.exportSyncConflict?.() || Store.getFullJSON(); }
    catch (error) { showToast(contextMessage('Aperçu impossible', error, 'réessayez.'), 'error'); return; }
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
      { label: 'Garder local', onClick: () => resolve(() => Store.resolveSyncLocal(), 'Version locale conservée et renvoyée') },
      { label: 'Prendre distant', onClick: () => resolve(() => Store.resolveSyncRemote(), 'Version distante appliquée') },
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
      .then(() => showToast(`${source} importée dans le compte`, 'success'))
      .catch(error => showToast(contextMessage('Import impossible', error, 'réessayez.'), 'error'))
  }, 0);
});

// Rendu initial
reserveUI.renderReserve();
combatViewUI.renderCombat();
renderReferenceTables();
renderLog(Store);
startRemoteAdapter();
