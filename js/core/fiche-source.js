// Lecture des fiches de personnage dans l'autre projet Firebase (campagne-wrpg, Firestore).
// Seul module à toucher le réseau pour cette fonction : le reste reçoit une « source »
// ({ getUser, signIn, signOut, fetchAll }) et se teste avec une fausse.
// Les modules Firebase ne sont chargés qu'à l'ouverture de la fonction ; l'application
// Firebase est nommée pour ne pas interférer avec celle de la synchronisation (sync.js).
import { FICHE_CHAR_IDS } from './fiche-sync.js';

const FICHES_CONFIG = {
  apiKey: 'AIzaSyD5W5U2fyXkiPzUzOOgAGusoiXn2iZbp5U',
  authDomain: 'campagne-wrpg.firebaseapp.com',
  projectId: 'campagne-wrpg',
  storageBucket: 'campagne-wrpg.firebasestorage.app',
  messagingSenderId: '1097155283992',
  appId: '1:1097155283992:web:27976b947ea8bc5b87476d'
};
const RECAPTCHA_SITE_KEY = '6Lfx25YtAAAAAAkRJrYSQsH6rdE1buedQzw0xTXb';
// Même règle que le site des fiches : App Check n'est actif que sur le site publié.
const APP_CHECK_HOST = 'ethoril.github.io';
const APP_NAME = 'fiches';

export function createFicheSource() {
  let sdk = null;
  const load = async () => {
    if (sdk) return sdk;
    const [app, auth, firestore] = await Promise.all([
      import('../../vendor/firebase/firebase-app.js'),
      import('../../vendor/firebase/firebase-auth.js'),
      import('../../vendor/firebase/firebase-firestore.js')
    ]);
    const instance = app.getApps().find(item => item.name === APP_NAME) || app.initializeApp(FICHES_CONFIG, APP_NAME);
    if (globalThis.location?.hostname === APP_CHECK_HOST) {
      const appCheck = await import('../../vendor/firebase/firebase-app-check.js');
      try { appCheck.initializeAppCheck(instance, { provider: new appCheck.ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true }); }
      catch (error) { if (error?.code !== 'appCheck/already-initialized') throw error; }
    }
    sdk = { auth, firestore, instance, authInstance: auth.getAuth(instance), db: firestore.getFirestore(instance) };
    return sdk;
  };
  return {
    /** Compte Google connecté à l'application des fiches, ou null. */
    async getUser() {
      const { authInstance } = await load();
      await authInstance.authStateReady();
      return authInstance.currentUser ? { name: authInstance.currentUser.displayName || authInstance.currentUser.email || '' } : null;
    },
    async signIn() {
      const { auth, authInstance } = await load();
      const result = await auth.signInWithPopup(authInstance, new auth.GoogleAuthProvider());
      return { name: result.user.displayName || result.user.email || '' };
    },
    async signOut() {
      const { auth, authInstance } = await load();
      await auth.signOut(authInstance);
    },
    /** [{ charId, data | null }] — null quand le document n'existe pas. Une erreur de lecture est propagée. */
    async fetchAll() {
      const { firestore, db } = await load();
      return Promise.all(FICHE_CHAR_IDS.map(async charId => {
        const snapshot = await firestore.getDoc(firestore.doc(db, 'fiches', charId));
        return { charId, data: snapshot.exists() ? (snapshot.data()?.data ?? null) : null };
      }));
    }
  };
}
