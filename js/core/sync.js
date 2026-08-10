export function initFirebase() {
  const fb = window.__WFRP_FIREBASE__;
  if (!fb) {
    console.log('⚠️ Firebase non disponible (localStorage uniquement)');
    return null;
  }

  const userId = fb.userId;
  const path = `wfrp-sessions/${userId}/current`;
  const dbRef = fb.ref(fb.db, path);

  console.log(`🔥 Sync Firebase activé sur: ${path}`);

  return {
    dbRef,
    set: fb.set,
    onValue: fb.onValue
  };
}
