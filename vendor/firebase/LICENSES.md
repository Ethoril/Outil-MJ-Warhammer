# Firebase Web SDK embarqué

Les fichiers JavaScript de ce dossier proviennent de `firebase@11.0.0`, sous
licence Apache 2.0. Ils sont utilisés uniquement pour fournir les modules
Firebase App, Auth, Realtime Database, Firestore et App Check au site statique
sans dépendance CDN au démarrage. Firestore et App Check ne servent qu'à la
mise à jour des PJ depuis les fiches, et ne sont chargés qu'à l'ouverture de
cette fonction.

Firestore et App Check ont été téléchargés depuis
`https://www.gstatic.com/firebasejs/11.0.0/` comme les autres ; leur import de
`firebase-app.js` (URL absolue) a été réécrit en `./firebase-app.js`.

Texte de la licence : https://www.apache.org/licenses/LICENSE-2.0
