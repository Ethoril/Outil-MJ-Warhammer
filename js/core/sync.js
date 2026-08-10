import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

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

export function loginWithGoogle() {
  if (!auth || !provider) return Promise.reject(new Error('Firebase non initialisé'));
  return signInWithPopup(auth, provider)
    .then((result) => {
      console.log('✅ Connecté:', result.user.displayName);
      const loginScreen = document.getElementById('login-screen');
      const appContent = document.getElementById('app-content');
      if (loginScreen) loginScreen.style.display = 'none';
      if (appContent) appContent.style.display = 'block';
    })
    .catch((error) => {
      console.error('❌ Erreur connexion:', error);
      alert('Erreur de connexion: ' + error.message);
    });
}

export function logoutUser() {
  if (!auth) return Promise.resolve();
  return signOut(auth).then(() => {
    console.log('👋 Déconnecté');
    location.reload();
  });
}

export function initFirebaseSync(onUserConnected) {
  if (!auth) return null;

  const btnLogin = document.getElementById('btn-google-login');
  if (btnLogin) {
    btnLogin.addEventListener('click', () => loginWithGoogle());
  }

  onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById('login-screen');
    const appContent = document.getElementById('app-content');
    const userInfo = document.getElementById('user-info');

    if (user) {
      console.log('👤 Utilisateur:', user.displayName, '(' + user.uid + ')');
      if (loginScreen) loginScreen.style.display = 'none';
      if (appContent) appContent.style.display = 'block';

      if (userInfo) {
        userInfo.innerHTML = `👤 ${user.displayName} <button id="btn-logout" class="ghost" style="margin-left:10px;">Déconnexion</button>`;
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) btnLogout.addEventListener('click', () => logoutUser());
      }

      const path = `wfrp-sessions/${user.uid}/current`;
      const dbRef = ref(db, path);
      syncHandle = { dbRef, set, onValue };

      if (onUserConnected) onUserConnected(syncHandle);
    } else {
      console.log('❌ Non connecté');
      if (loginScreen) loginScreen.style.display = 'flex';
      if (appContent) appContent.style.display = 'none';
      syncHandle = null;
    }
  });

  return syncHandle;
}
