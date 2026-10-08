// Firebase est embarqué avec la même version que celle auditée. Le graphe local
// permet au mode invité de démarrer même si le CDN est indisponible ; le réseau
// reste nécessaire uniquement pour l’authentification et la base distante.
import { initializeApp } from '../../vendor/firebase/firebase-app.js';
import { getDatabase, ref, get, runTransaction, onValue, set, update } from '../../vendor/firebase/firebase-database.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from '../../vendor/firebase/firebase-auth.js';
import { transactionUpdate } from './sync-protocol.js';
import { createSyncSession } from './sync-session.js';
import { migrateV2SyncDocument, initializeV3Root } from './sync-migration.js';
import { googleAuthErrorCode, googleAuthErrorMessage } from './auth-errors.js';

const firebaseConfig = {
  apiKey: "AIzaSyD5f_ngBZ3OCXJCjT5M45BqbhkzI_QObLc",
  authDomain: "outil-mj-warhammer.firebaseapp.com",
  databaseURL: "https://outil-mj-warhammer-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "outil-mj-warhammer",
  storageBucket: "outil-mj-warhammer.firebasestorage.app",
  messagingSenderId: "830494961787",
  appId: "1:830494961787:web:99a9da41da23dd32dc72de"
};

let app = null;
let db = null;
let auth = null;
let provider = null;
let syncHandle = null;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  auth = getAuth(app);
  provider = new GoogleAuthProvider();
  console.log('✅ Firebase initialisé');
} catch (e) {
  console.warn('⚠️ Impossible d\'initialiser Firebase:', e);
}

export async function loginWithGoogle() {
  try {
    if (!auth || !provider) throw Object.assign(new Error('Firebase non initialisé'), { code: 'auth/not-initialized' });
    // Keep the SDK call in the click gesture, before the first await.
    const result = await signInWithPopup(auth, provider);
    console.log('✅ Connecté:', result.user.displayName);
    const loginScreen = document.getElementById('login-screen');
    const appContent = document.getElementById('app-content');
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContent) appContent.style.display = 'block';
  } catch (error) {
    console.error('❌ Erreur connexion:', googleAuthErrorCode(error));
    alert(googleAuthErrorMessage(error, { online: navigator.onLine !== false }));
  }
}

export function logoutUser() {
  if (!auth) return Promise.resolve();
  return signOut(auth).then(() => {
    console.log('👋 Déconnecté');
    location.reload();
  });
}

export function initFirebaseSync(onUserConnected, onStatus = () => {}, onUserDisconnected = () => {}) {
  let initialized = false;

  function showOfflineBanner() {
    if (document.getElementById('offline-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.style.cssText = 'position:fixed; bottom:0; left:0; right:0; background:#9c5a28; color:#fff; text-align:center; padding:6px 12px; font-size:0.85em; font-weight:bold; z-index:9999; box-shadow:0 -2px 6px rgba(0,0,0,0.3);';
    banner.textContent = '📡 Hors-ligne — la synchronisation reprendra à la reconnexion ; l’état local est indiqué séparément.';
    document.body.appendChild(banner);
  }

  function startAuth() {
    if (initialized || !auth) {
      if (!auth) {
        onStatus('offline');
        showOfflineBanner();
      }
      return;
    }
    // Restore Firebase's persisted identity even when no network is available.
    // The matching local account stays usable; a new login still needs the network.
    if (!navigator.onLine) { onStatus('offline'); showOfflineBanner(); }
    else onStatus('connecting');
    document.querySelectorAll('[data-google-login]').forEach(btn => {
      if (btn.dataset.firebaseBound === 'true') return;
      btn.dataset.firebaseBound = 'true';
      btn.addEventListener('click', () => loginWithGoogle());
    });

    const handleAuthState = (user) => {
    const loginScreen = document.getElementById('login-screen');
    const appContent = document.getElementById('app-content');
    const userInfo = document.getElementById('user-info');

    if (user) {
      console.log('👤 Utilisateur:', user.displayName, '(' + user.uid + ')');
      if (loginScreen) loginScreen.style.display = 'none';
      if (appContent) appContent.style.display = 'block';
      onStatus(navigator.onLine ? 'connected' : 'offline');

      if (userInfo) {
        userInfo.innerHTML = `👤 ${user.displayName} · Compte <button id="btn-logout" class="ghost" style="margin-left:10px;">Déconnexion</button>`;
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) btnLogout.addEventListener('click', () => logoutUser());
      }

      // v3 isolates new data from old clients. v2 initializes this namespace once;
      // v1 remains available only through the explicit historical import.
      const path = `wfrp-sessions-v3/${user.uid}/current`;
      const dbRef = ref(db, path);
      const previousDbRef = ref(db, `wfrp-sessions-v2/${user.uid}/current`);
      const legacyDbRef = ref(db, `wfrp-sessions/${user.uid}/current`);
      const transport = {
        async read() {
          const snapshot = await get(dbRef);
          if (snapshot.val() != null) return snapshot.val();
          const previous = (await get(previousDbRef)).val();
          if (previous == null) return null;
          const migrated = migrateV2SyncDocument(previous);
          const result = await runTransaction(dbRef, current => initializeV3Root(current, migrated), { applyLocally: false });
          return result.snapshot?.val?.() ?? (await get(dbRef)).val();
        },
        async transaction(operation) {
          const result = await runTransaction(dbRef, current => transactionUpdate(current, operation), { applyLocally: false });
          return {
            status: result.committed ? 'committed' : 'aborted',
            root: result.snapshot?.val?.() ?? null
          };
        },
        subscribe(callback) {
          return onValue(dbRef, snapshot => callback(snapshot.val()));
        },
        async readLegacy() {
          const snapshot = await get(legacyDbRef);
          return snapshot.val();
        }
      };
      syncHandle = {
        dbRef, legacyDbRef, set, update, onValue, contextId: `account:${user.uid}`,
        legacyMigration: () => transport.readLegacy(),
        createSession: options => createSyncSession({ ...options, transport, contextId: `account:${user.uid}` })
      };

      if (onUserConnected) onUserConnected(syncHandle);
    } else {
      console.log('❌ Non connecté');
      if (loginScreen) loginScreen.style.display = 'none';
      if (appContent) appContent.style.display = 'block';
      onStatus('signedOut');
      if (userInfo) userInfo.textContent = '👤 Invité';
      syncHandle = null;
      onUserDisconnected();
    }
    };
    try {
      const registration = onAuthStateChanged(auth, handleAuthState);
      initialized = true;
      if (registration && typeof registration.catch === 'function') {
        registration.catch((error) => {
          initialized = false;
          console.warn('⚠️ Initialisation Firebase Auth échouée:', error);
          onStatus('offline');
          showOfflineBanner();
        });
      }
    } catch (error) {
      initialized = false;
      console.warn('⚠️ Initialisation Firebase Auth échouée:', error);
      onStatus('offline');
      showOfflineBanner();
    }
  }

  // Détection des événements réseau globaux. Le retour en ligne relance
  // l'initialisation si le SDK était prêt mais que le premier accès était hors-ligne.
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      console.log('🌐 Réseau rétabli');
      const banner = document.getElementById('offline-banner');
      if (banner) banner.remove();
      if (initialized) onStatus(syncHandle ? 'connected' : 'signedOut');
      else startAuth();
    }, { once: false });
    window.addEventListener('offline', () => {
      console.warn('📡 Mode hors-ligne détecté');
      onStatus('offline');
      showOfflineBanner();
    });
  }

  startAuth();

  return syncHandle;
}
