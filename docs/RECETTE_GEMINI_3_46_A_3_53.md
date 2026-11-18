# Recette en conditions réelles, versions 3.46.0 à 3.53.0 (outil MJ) et Map Display depuis le 09/11/2026

Document destiné à un agent **Gemini CLI** qui l'exécute seul, sous Windows, sans connaître le projet. Il lance des serveurs locaux, pilote un navigateur avec Playwright (déjà installé dans les deux dépôts), lit les pages et remplit le rapport du §4. Il ne modifie aucun code.

Périmètre : `docs/SUIVI_EVOLUTION.md` sections 3.46.0 à 3.53.0 ; carte `E:/rpg-map-display`, commits depuis le 09/11/2026 (images des pions, `formImageUrl`, `bondCells`, palier Bond, test A13). Dernière recette de référence : `docs/RECETTE_UTILISATEUR.md` (09/11). Version attendue de l'outil : **3.53.0** (bouton « Version 3.53.0 » du menu ⋯).

---

## 1. Règles d'exécution (à lire en entier avant tout)

1. **Langue** : tout est écrit en français (rapport, commentaires, noms de captures). Interface de l'outil en français ; yards = mètres, même valeur, sans conversion (50 yards = 50 m). Une conversion ou un libellé « yards » affiché à la place de « m » dans un résultat se rapporte comme anomalie.
2. **Ne rien corriger.** Aucun fichier du code (`js/`, `tests/`, `tools/`, `data/`, `docs/` sauf ce plan en lecture, `index.html`, `sw.js`) n'est modifié, ni dans l'outil ni dans la carte. Pas de `git add`, `commit`, `push`, `stash`, `checkout`, `reset`. Aucun `npm install` / `pnpm install`.
3. **Verdict par scénario** : `réussi`, `échec` ou `bloqué`, avec la preuve (capture nommée ou extrait de journal/état). Un scénario marqué « à faire par le MJ » reçoit le verdict `à faire par le MJ` sans être tenté.
   - `réussi` : tous les « Attendu » sont observés.
   - `échec` : au moins un « Attendu » n'est pas observé. Décrire l'écart exact : **attendu / obtenu**, avec la valeur ou le texte copié tel quel.
   - `bloqué` : l'agent n'a pas pu exécuter l'étape (élément introuvable après deux tentatives, erreur de script, dépendance absente). Dire quelle étape, quel message, ce qui a été essayé. Un blocage n'est pas un échec de l'application.
4. **Ne jamais inventer un résultat.** Pas de capture = pas de preuve = pas de `réussi`. Ne pas déduire un résultat d'un test unitaire ou de la lecture du code : seul ce qui est observé dans le navigateur compte.
5. **Les règles de jeu ne se discutent pas.** Les valeurs de ce plan viennent des livres et des décisions du MJ. Si l'outil donne autre chose, on rapporte l'écart avec le plan, sans dire que la règle devrait être autre.
6. **Hasard interdit.** Aucun dé n'est tiré au hasard. Soit on saisit la valeur du dé dans la case prévue, soit on fige le dé de la page avant de cliquer un bouton « Lancer… » (voir `fixDie` au §2.4). Valeurs de dé fixées par ce plan : d100 = 1 à 100, d10 = 1 à 10. Rappel : sur un Test, 1 à 5 réussit toujours et 96 à 100 échoue toujours ; éviter les doublets (11, 22, 33…) sauf demande du scénario.
7. **Interdits absolus.**
   - Aucune connexion à Firebase, Firestore, Google ni à aucun hôte hors `localhost:8766` (le réseau externe est bloqué par la boîte à outils, §2.4).
   - Ne jamais cliquer « Envoyer aux fiches » (`#workspace-fiche-writeback`), ni « Connexion Google ».
   - Ne jamais écrire dans `E:/rpg-map-display/maps/tokens/` ni ailleurs dans le dépôt de la carte : aucun `maps:tool`, `maps:prepare`, `prepare-*`, `build:site`, `stamp`. Lecture seule.
   - Ne jamais lancer un générateur sans `--check` (`build-*.mjs`, `recopier-*.mjs`, `list-missing-token-images.mjs`, `bump-version.mjs`).
   - Ne jamais lancer `git` en écriture. Ne pas publier, ne pas déployer.
8. **Où écrire.** Tout ce que l'agent produit (scripts, captures, journaux, rapport) va dans `E:/Outil MJ Warhammer/tmp/recette-gemini/` (dossier non versionné). Captures : `tmp/recette-gemini/captures/R-xx-<sujet>.png`. Le rapport final : `tmp/recette-gemini/RAPPORT.md`.
9. **Un contexte navigateur neuf par scénario** (pas de profil persistant) : c'est l'« état propre » (§2.6). Les scénarios sont indépendants, sauf mention contraire.
10. **Timeout** : tout script Playwright se lance sous `timeout 120` (Git Bash) ou avec le délai équivalent ; en PowerShell, `Start-Process`/`Wait-Process -Timeout 120` puis arrêt forcé. Un script qui dépasse 120 s est `bloqué`.
11. **Libellés.** Les noms de boutons de ce plan sont ceux du code. Si un libellé diffère légèrement (casse, apostrophe typographique `’` / `'`), chercher d'abord par sous-chaîne ; si l'élément est vraiment introuvable, c'est `bloqué` (ou `échec` si le plan l'annonce comme nouveauté visible), avec le libellé trouvé à la place.
12. **Journal d'erreurs.** Dans chaque scénario, noter toute erreur JavaScript de la page (`pageerror`) et toute boîte native (`dialog`) : elles vont dans la liste des anomalies même si le scénario réussit. Les 404 d'images de pions absentes sont attendus **seulement** là où le plan le dit ; les avertissements Canvas2D `willReadFrequently` de la carte sont connus et ignorés.

---

## 2. Préparation

### 2.1 Pré-requis

- Node 24, Edge installé (Playwright pilote le canal `msedge`, voir `tests/helpers/browser.mjs`). Variable `PLAYWRIGHT_EXECUTABLE_PATH` si Edge est ailleurs.
- Dépôts : `E:/Outil MJ Warhammer` (branche `main`, arbre propre) et `E:/rpg-map-display` (branche `main`). Vérifier sans rien écrire :
  ```powershell
  git -C "E:/Outil MJ Warhammer" status --short
  git -C "E:/rpg-map-display" status --short
  git -C "E:/Outil MJ Warhammer" log --oneline -3
  git -C "E:/rpg-map-display" log --oneline -3
  ```
  Attendu : tête de l'outil `fe7a1d2` (« chore(release): 3.53.0 … ») ou plus récente, tête de la carte `4db1e46` ou plus récente. `node_modules` présent dans les deux dépôts ; sinon `bloqué` (ne rien installer, le signaler).
- Les images de pions (`E:/rpg-map-display/maps/tokens/…`) sont versionnées dans la carte (environ 1 000 fichiers) : les lire, jamais les écrire.

### 2.2 Lancer l'outil et la carte et les relier

Un seul serveur sert les deux dépôts sous une même origine, indispensable pour que le canal `BroadcastChannel('wfrp-map-link')` relie l'onglet de l'outil à `gm.html` (contrat de liaison §2.1).

```powershell
cd "E:/Outil MJ Warhammer"
node tools/serve-liaison.mjs --check            # doit sortir sans erreur (code 0) : la carte porte bien js/app/mjLink.js
New-Item -ItemType Directory -Force tmp/recette-gemini/captures | Out-Null
Start-Process -FilePath node -ArgumentList 'tools/serve-liaison.mjs','8766' -WindowStyle Hidden `
  -RedirectStandardOutput tmp/recette-gemini/serveur.log -RedirectStandardError tmp/recette-gemini/serveur.err
Start-Sleep 2
(Invoke-WebRequest http://localhost:8766/Outil-MJ-Warhammer/ -UseBasicParsing).StatusCode   # 200
(Invoke-WebRequest http://localhost:8766/rpg-map-display/gm.html -UseBasicParsing).StatusCode # 200
```

- Outil MJ : `http://localhost:8766/Outil-MJ-Warhammer/`
- Carte (vue MJ) : `http://localhost:8766/rpg-map-display/gm.html?session=<identifiant>`
- **Toujours `localhost`, jamais `127.0.0.1`** (deux origines distinctes ne se parlent pas, ni ne partagent leur stockage).
- Arrêt en fin de recette : repérer le processus (`Get-CimInstance Win32_Process | ? { $_.CommandLine -match 'serve-liaison' }`) et l'arrêter avec `Stop-Process -Id <pid>`.
- Si le port 8766 est pris, prendre 8767 et fixer `RECETTE_BASE=http://localhost:8767` dans l'environnement des scripts.

**Carte sans Firebase.** Sans configuration Firebase la carte annonce le mode local. La boîte à outils (§2.4) ouvre `gm.html` avec le **transport de test de la carte** (`E:/rpg-map-display/tests/browserTestTransport.mjs`, fonction `installBrowserTransport`) : il remplace Firebase par le seul `BroadcastChannel` du navigateur et fournit une campagne neuve (niveau 12 × 8 cases). C'est la méthode de la recette locale du 13/11 (`tmp/recette-images-pions/`). La liaison entre l'outil et la carte, elle, est la vraie (même canal, même contrat).

**Outil sans Firebase.** La boîte à outils neutralise la synchronisation du compte (module `js/core/sync.js` remplacé par un faux qui affiche l'application) et bloque tout hôte externe : aucune donnée de production n'est lue ni écrite.

### 2.3 Données de départ

Aucune base à préparer à la main : chaque scénario pose son état par `Store.loadFromJSON(...)` (même méthode que les parcours `tests/*-browser.mjs`), avec les fonctions `fighter` et `loadCombat` de la boîte à outils, ou par l'interface quand le scénario porte sur l'interface elle-même. Jeux de départ nommés :

| Jeu | Contenu | Où il est défini |
|---|---|---|
| `COMBAT_TRAITS` | héros, acide (Sang corrosif), instable, deux stupides, destrier (Bond), revenant (Increvable), sentinelle à Élan | R-39 |
| `COMBAT_POURSUITE` | Prêtresse (PJ, Mouvement 4, Brisée), Orc (Mouvement 5), Gobelin (Mouvement 4) | R-29 |
| `COMBAT_PRETRE` | prêtre (Prière 60, talents Bénédiction et Invocation du culte), allié, ennemi | §2.5 |
| `fiche-caelel.json` | fiche d'exemple d'un PJ (lecture seule) | `tests/fixtures/fiche-caelel.json` |
| `suivis-orphelins-v3.json` | sauvegarde schéma 3 pour la migration | `tests/fixtures/suivis-orphelins-v3.json` |
| Bestiaire | 935 profils environ, copiés par la Bibliothèque ; ids utilisés : `E0-P-078` Loup, `E0-P-077` Cheval, `E0-P-766` Cheval de guerre lourd, `E0-P-763` Cheval de trait lourd, `E0-P-963` Trolls des rivières, `E0-P-194` Ours, `E0-P-123` Isrogdal, `E0-P-988` Destrier, `E0-P-985` à `E0-P-991` livre L27 | `js/data/bestiary/` |

### 2.4 Boîte à outils : `tmp/recette-gemini/lib.mjs`

L'agent crée ce fichier tel quel (c'est un fichier de l'agent, hors dépôt versionné). Tous les scripts de scénario l'importent.

```js
// tmp/recette-gemini/lib.mjs : outils communs de la recette Gemini. Lancer les scripts sous timeout 120.
import { mkdirSync, appendFileSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchBrowser } from '../../tests/helpers/browser.mjs';

const MAP = 'E:/rpg-map-display';
const { installBrowserTransport, waitForApp } = await import(pathToFileURL(`${MAP}/tests/browserTestTransport.mjs`).href);
const { createCampaign, createLevel, createToken } = await import(pathToFileURL(`${MAP}/js/core/schema.js`).href);
export { createToken, createLevel, createCampaign };

export const BASE = process.env.RECETTE_BASE || 'http://localhost:8766';
export const TOOL = `${BASE}/Outil-MJ-Warhammer/`;
const MAIN = '/Outil-MJ-Warhammer/js/main.js';
export const OUT = fileURLToPath(new URL('./captures/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const LOG = fileURLToPath(new URL('./resultats.jsonl', import.meta.url));

const SYNC_STUB = `export function initFirebaseSync(onConnected) { document.querySelector('#login-screen')?.style.setProperty('display','none'); document.querySelector('#app-content')?.style.setProperty('display','block'); onConnected({ dbRef: 'isolated-recette', onValue() {}, update() { return Promise.resolve(); } }); }`;

/** Verdict d'un scénario : 'réussi' | 'échec' | 'bloqué' | 'à faire par le MJ'. */
export function record(id, verdict, detail, preuves = []) {
  const row = { at: new Date().toISOString(), id, verdict, detail, preuves };
  appendFileSync(LOG, JSON.stringify(row) + '\n');
  console.log(`[${verdict}] ${id} — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
}

/** Navigateur + contexte neuf (état propre). Seul localhost:8766 répond ; tout autre hôte http(s) est coupé. */
export async function startEnv({ colorScheme = 'light', viewport = { width: 1440, height: 900 } } = {}) {
  const browser = await launchBrowser();
  const context = await browser.newContext({ serviceWorkers: 'block', colorScheme, viewport, acceptDownloads: true });
  const origin = new URL(BASE).origin;
  const consoleLog = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!/^https?:$/.test(url.protocol) || url.origin === origin) return route.continue();
    consoleLog.push({ who: 'réseau', type: 'bloqué', text: route.request().url() });
    return route.abort();
  });
  // Routes déclarées après : elles passent avant la règle générale.
  await context.route('**/js/core/sync.js', route => route.fulfill({ contentType: 'text/javascript', body: SYNC_STUB }));
  const watch = (page, who) => {
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleLog.push({ who, type: m.type(), text: m.text() }); });
    page.on('pageerror', e => consoleLog.push({ who, type: 'pageerror', text: e.message }));
    page.on('dialog', d => { consoleLog.push({ who, type: 'boîte native', text: d.message() }); void d.dismiss(); });
    page.on('response', r => { if (r.status() >= 400) consoleLog.push({ who, type: 'http', text: `${r.status()} ${r.url()}` }); });
  };
  return { browser, context, consoleLog, watch };
}

export async function openTool(env, { path = '' } = {}) {
  const page = await env.context.newPage();
  env.watch(page, 'outil');
  await page.goto(TOOL + path, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', null, { timeout: 30000 });
  await page.evaluate(async main => { const { Store } = await import(main); await Store.ready; }, MAIN);
  return page;
}

/** Ouvre gm.html sur une campagne neuve 12 × 8, avec en option des pions déjà posés (voir createToken du dépôt de la carte). */
export async function openMap(env, sid, { tokens = [] } = {}) {
  const level = createLevel({ id: 'a', pxPerCell: 100, widthCells: 12, heightCells: 8 });
  const snapshot = { campaign: createCampaign({ campaignId: sid, levels: [level], tokens }), activeLevelId: 'a' };
  const gm = await env.context.newPage();
  env.watch(gm, 'carte');
  await installBrowserTransport(gm, sid, snapshot);
  await gm.goto(`${BASE}/rpg-map-display/gm.html?session=${sid}`);
  await waitForApp(gm);
  return gm;
}

/** État complet de l'outil (JSON de Store.getFullJSON), après stabilisation. */
export const state = page => page.evaluate(async main => { const { Store } = await import(main); await Store.whenIdle(); return JSON.parse(Store.getFullJSON()); }, MAIN);
export const person = (full, id) => full.combat.participants.find(row => row.id === id);
export const logText = full => (full.log || []).map(row => row.text || row.message || '').join('\n');
export async function until(page, check, what, timeout = 10000) {
  const end = Date.now() + timeout;
  for (;;) { const value = await state(page); if (check(value)) return value; if (Date.now() > end) throw new Error(`attendu : ${what}`); await page.waitForTimeout(150); }
}

/** Fige le hasard de la page : d10 = floor(r*10)+1, d100 = floor(r*100)+1. Utiliser dieR(n, 10|100). */
export const dieR = (n, faces) => (n - 0.5) / faces;
export const fixDie = (page, r) => page.evaluate(next => { window.__realRandom ||= Math.random; Math.random = () => next; }, r);
export const freeDie = page => page.evaluate(() => { if (window.__realRandom) Math.random = window.__realRandom; });

/** Participant de test (mêmes valeurs que les parcours du dépôt). */
export const fighter = (id, name, camp, initiative, traits = [], v5 = {}, extra = {}) => ({ id, name, kind: camp === 'pj' ? 'PJ' : 'PNJ', camp, zone: 'active', initiative, hp: 20, maxHp: 20,
  caracs: { CC: 45, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [], traits, equipment: [], talents: [], prayers: [],
  skills: [], actions: [{ id: 'blade', type: 'attack', base: 45, damage: 3 }], extensions: { v5 }, ...extra });

/** Pose une rencontre en cours (Round 1) puis les engagements [[a,b],…]. */
export async function loadCombat(page, participants, { order, currentActorId, engage = [], combatId = 'recette', reserve = [] } = {}) {
  await page.evaluate(async ({ main, participants, order, currentActorId, engage, combatId, reserve }) => {
    const { Store } = await import(main);
    await Store.loadFromJSON({ schemaVersion: 3, reserve, diceLines: [], log: [], extensions: { v5: { turnIndex: 1, combatId } },
      combat: { round: 1, currentActorId: currentActorId || participants[0].id, order: order || participants.map(p => p.id), participants } });
    for (const [a, b] of engage) await Store.engageParticipants(a, b);
  }, { main: MAIN, participants, order, currentActorId, engage, combatId, reserve });
}

export const tab = (page, name) => page.getByRole('tab', { name, exact: true }).click();
/** Referme le tiroir latéral du panneau de résolution s'il est ouvert (sinon le panneau principal est masqué sur petit écran). */
export async function closeDrawer(page) { const d = page.locator('.workspace-resolution-drawer'); if (await d.isVisible()) await d.getByRole('button', { name: 'Fermer', exact: true }).click(); }
export async function shot(page, name, options = {}) { await page.screenshot({ path: `${OUT}${name}.png`, ...options }); return `captures/${name}.png`; }
export function dumpConsole(env, name) { const f = fileURLToPath(new URL(`./console-${name}.json`, import.meta.url)); writeFileSync(f, JSON.stringify(env.consoleLog, null, 1)); return env.consoleLog; }

/** Pion lié (posé ou en réserve de la carte) pour une référence 'pj:<id>' ou 'p:<participantId>'. */
export const mapToken = (gm, ref) => gm.evaluate(async r => {
  const c = (await import('/rpg-map-display/js/state/store.js')).getCampaign();
  const t = [...(c?.tokens || []), ...(c?.reserve || [])].find(x => x.link?.ref === r);
  return t ? JSON.parse(JSON.stringify(t)) : null;
}, ref);
export async function waitMapToken(gm, ref, predicate = t => Boolean(t), timeout = 10000) {
  const end = Date.now() + timeout; let last = null;
  while (Date.now() < end) { last = await mapToken(gm, ref); if (last && predicate(last)) return last; await gm.waitForTimeout(200); }
  return last;
}
/** Pose sur la carte un pion lié resté en réserve (équivaut au geste « Poser » puis clic sur la case). */
export const place = (gm, ref, cell) => gm.evaluate(async ({ r, cell }) => {
  const s = await import('/rpg-map-display/js/state/store.js');
  const t = (s.getCampaign()?.reserve || []).find(x => x.link?.ref === r);
  if (t) s.placeTokenFromReserve(t.id, 'a', cell);
  return Boolean(t);
}, { r: ref, cell });
/** Images de la bibliothèque réellement chargées par une page (chemin, statut HTTP). */
export const loadedImages = page => page.evaluate(() => performance.getEntriesByType('resource').filter(e => e.name.includes('/maps/tokens/'))
  .map(e => ({ url: decodeURIComponent(new URL(e.name).pathname), status: e.responseStatus })));

/** Faux modules Firebase pour « Mettre à jour les PJ » : la fiche est lue dans window.fiches[<id>] (aucun réseau). */
export async function fakeFiches(context) {
  const FAKE = {
    'firebase-app.js': 'export const getApps = () => []; export const initializeApp = () => ({});',
    'firebase-auth.js': 'export const getAuth = () => ({ authStateReady: async () => {}, currentUser: { displayName: "MJ simulé" } }); export class GoogleAuthProvider {} export const signInWithPopup = async () => ({ user: { displayName: "MJ simulé" } }); export const signOut = async () => {};',
    'firebase-firestore.js': 'export const getFirestore = () => ({}); export const doc = (db, collection, id) => ({ id }); export const getDocFromServer = async ref => { const fiche = window.fiches?.[ref.id]; return { exists: () => Boolean(fiche), data: () => ({ data: structuredClone(fiche), schemaVersion: 4, revision: window.ficheRevision }) }; };'
  };
  for (const [file, body] of Object.entries(FAKE)) await context.route(`**/vendor/firebase/${file}`, route => route.fulfill({ contentType: 'text/javascript', body }));
}
export const ficheCaelel = () => JSON.parse(readFileSync('E:/Outil MJ Warhammer/tests/fixtures/fiche-caelel.json', 'utf8'));
```

Mode d'emploi d'un script de scénario :

```js
import { startEnv, openTool, loadCombat, fighter, state, person, shot, record, dumpConsole } from './lib.mjs';
const env = await startEnv();
try {
  const mj = await openTool(env);
  // … étapes du scénario …
  record('R-xx', 'réussi', 'résumé', ['captures/R-xx-….png']);
} catch (e) { record('R-xx', 'bloqué', String(e.message).slice(0, 300)); }
finally { dumpConsole(env, 'R-xx'); await env.browser.close(); }
```

Convention de dés : `fixDie(page, dieR(10, 10))` fait tirer 10 au prochain d10 ; `fixDie(page, dieR(100, 100))` fait tirer 100 au d100. Penser à `freeDie(page)` (sans importance si le contexte est jeté après).

### 2.5 Jeu `COMBAT_PRETRE` (miracles, R-49 à R-62)

```js
const prayers = await mj.evaluate(async () => (await import('/Outil-MJ-Warhammer/js/core/v5-divine-store.js')).getAllDivineContracts()
  .filter(r => r.type === 'miracle').map(r => ({ name: r.catalogueName, status: 'resolved' })));
const priest = (cult, extra = {}) => fighter('priest', 'Prêtre', 'pj', 60, [], { divine: { sin: 0 } }, {
  kind: 'PJ', caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 40, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers, ...extra });
// allié : fighter('ally','Allié','pj',40) ; ennemi : fighter('foe','Ennemi','ennemi',30)
```

`cult` = culte du miracle essayé (« Ulric », « Ranald », « Shallya », « Taal », « Morr », « Solkan », « Verena », « Myrmidia », « Sigmar », « Handrich », « Manann »).

**Lancer un miracle par l'interface** (méthode commune aux scénarios R-49 à R-62) :

1. Onglet **Jouer** (`#tab-combat`), fermer le tiroir (`closeDrawer`). Le Tour courant est celui du prêtre.
2. Dans le panneau **Résolution**, bouton **Sort, prière, Corruption…** puis **Prière** : le panneau divin s'ouvre (`[data-divine-panel]` ; cliquer son premier `summary` s'il est replié).
3. Liste **Prière divine** (`[aria-label="Prière divine"]`) : choisir l'option dont le texte contient le nom français du miracle.
4. Cocher les destinataires (`[aria-label="Destinataire <Nom>"]`). Répondre « Oui » aux questions de portée, de visibilité, d'allié admissible et à « Le personnage peut prononcer la prière » (champs `Portée / zone confirmée`, etc. ; menus à `Oui` / `Non`).
5. `Jet de Prière (d100)` : saisir **45** (réussite, sans doublet). Choisir la durée proposée la plus courte ; pour « Fin de l'effet (choix du MJ) », prendre `endOfRound` si on veut tester l'expiration.
6. Bouton **Calculer** (`[data-divine-action="calculate"]`), lire l'aperçu (« Prière réussie »), puis **Appliquer** (`[data-divine-action="apply"]`).
7. **Repli autorisé** si un champ du panneau reste inatteignable : appeler directement les mêmes commandes que les boutons, puis vérifier le résultat **dans l'interface** (journal, fiche du participant) :
   ```js
   const castInput = (targetIds, more = {}) => ({ actorId: 'priest', targetIds, roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
     facts: { targets: Object.fromEntries(targetIds.map(id => [id, { withinRange: true, seesPriest: true, withinTouch: true, ally: true }])) },
     expiry: { phase: 'endOfRound', round: 4 }, ...more });
   await mj.evaluate(async ({ id, input }) => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
     const preview = Store.previewDivineExecution(id, input); if (!preview.ready) throw new Error(JSON.stringify(preview.needsInput) + preview.error);
     const r = await Store.applyDivineExecution(id, { preview }); if (!r.ready) throw new Error(r.error); }, { id: 'divine:miracle:ranald:bamboozle', input: castInput(['foe']) });
   ```
   Noter dans le rapport quelle méthode (interface ou repli) a servi à chaque scénario.

### 2.6 Repartir d'un état propre

- Chaque script ouvre un contexte neuf (`startEnv`) : stockage local, IndexedDB et `localStorage` vides. Rien n'est partagé entre scénarios.
- Pour rejouer un scénario : relancer son script. Pour repartir de zéro en cours de scénario : `await Store.loadFromJSON({schemaVersion:3,reserve:[],diceLines:[],log:[],combat:{round:1,participants:[],order:[]}})` (rencontre vide), ou recharger la page dans un contexte neuf.
- Ne jamais réutiliser le profil de navigateur de l'utilisateur ; ne pas ouvrir l'outil dans son Edge habituel.

### 2.7 R-00 · Contrôle de l'environnement (à faire avant tout)

- **Objectif** : l'outil et la carte tournent, la liaison fonctionne, rien ne sort du poste.
- **Étapes** : (1) démarrer le serveur (§2.2) ; (2) `openTool` : menu **⋯** (`#btn-menu`), lire `#btn-version` ; (3) `openMap` avec `sid = 'r00-'+Date.now()` ; (4) `gm.bringToFront()` puis lire `#map-link-indicator` côté outil (attribut `data-state`) ; (5) lister `env.consoleLog`.
- **Attendu** : bouton « Version 3.53.0 » ; indicateur de l'outil `data-state="connected"` avec le libellé « Carte connectée » dans les 15 s ; aucune erreur `pageerror` ; aucune requête hors `localhost:8766` n'aboutit (les lignes `bloqué` du journal réseau sont normales).
- **Preuves** : `R-00-outil-connecte.png` (capture de la barre du haut de l'outil), `R-00-carte.png`.
- Si R-00 échoue, **s'arrêter** et rédiger le rapport : tous les autres scénarios seraient `bloqué`.

---

## 3. Scénarios

Légende des preuves : capture = `captures/R-xx-<sujet>.png` ; extrait = copie de la ligne de journal ou de l'état lu (`state()`), à coller dans le rapport.

### Partie A · Version 3.46.0 (11/11/2026)

#### R-01 · Livre L27 : montures du Bestiaire du Vieux Monde et Rapace
- **Objectif** : les six montures et le Rapace du livre L27 existent, avec les Blessures V5 attendues.
- **Préconditions** : outil neuf. Un profil PJ créé par `Store.addProfile(new Profile({ id:'pj1', name:'Aline', kind:'PJ', hp:14, maxHp:14, initiative:40 }))` (`Profile` vient de `/Outil-MJ-Warhammer/js/core/models.js`).
- **Étapes** :
  1. Onglet **Bibliothèque**, ouvrir **Bibliothèque de bestiaire** (`#bestiary-library`). Champ « Nom du profil » : saisir `Rapace`, lire la ligne trouvée, cliquer **Copier dans la réserve**.
  2. Répéter pour `Cheval de guerre`, `Cheval de selle`, `Coursier elfique`, `Destrier du Chaos`, `Poney`.
  3. Onglet **Préparer** : **Modifier** Aline (`.workspace-profile-card[data-profile-id="pj1"]`), champ « Chercher une monture dans le bestiaire » : saisir `Coursier elfique`, cliquer le résultat (`.form-mount-pick-reserve` ou le bouton de la liste).
- **Attendu** : les sept profils sont en réserve, noms français (« Rapace », « Cheval de guerre », « Cheval de selle », « Coursier elfique », « Destrier du Chaos », « Poney »). Blessures lues sur la carte de chaque profil : Cheval de guerre 26, Cheval de selle 20, Coursier elfique 26, Destrier 26, Destrier du Chaos 26, Poney 10, Rapace 2. Aline porte une monture déclarée « Coursier elfique » (`Store.getProfile('pj1').extensions.v5.declaredMount.name`).
- **Preuves** : `R-01-reserve-l27.png`, extrait des `hp` des profils.

#### R-02 · Forme bestiale élargie (Ours, Pigeon, Serpent)
- **Préconditions** : participant PJ `wren` en combat (`loadCombat`, un seul participant PJ, M 4).
- **Étapes** : par `Store.applyBeastForm(id, REIKLAND_BEASTS[clé], { isJade: false })` pour `bear`, `pigeon`, `snake` (`REIKLAND_BEASTS` vient de `/Outil-MJ-Warhammer/js/data/v5-transformation-bestiary.js`), puis `Store.revertBeastForm(id)` entre chaque. Après chaque transformation, ouvrir la fiche du participant (onglet **Jouer**, clic sur son nom dans la piste de gauche).
- **Attendu** : les neuf clés `REIKLAND_BEASTS` existent (`boar, dog, giant-rat, giant-spider, horse, wolf, bear, pigeon, snake`) ; chaque forme s'applique sans erreur et la fiche montre la bête (nom, Blessures de la bête) ; le retour rend le profil d'origine. (Règle maison : l'Ours, le Pigeon et le Serpent ne valent que pour le sort ; les invocations divines gardent six bêtes. Ce second point est à faire par le MJ s'il faut le voir dans un dialogue d'invocation : le signaler.)
- **Preuves** : `R-02-forme-ours.png`, `R-02-forme-pigeon.png`, `R-02-forme-serpent.png`.

#### R-03 · Plateau des mêlées : cartouches côte à côte, pas de débordement à 390 px
- **Préconditions** : `COMBAT_PRETRE`-like : quatre participants (deux PJ, deux ennemis) tous engagés entre eux (`engage` : `['a','c'],['a','d'],['b','c'],['b','d']`), l'un des PJ avec le talent **Petit** (`talents:[{id:'talent-petit', name:'Petit', status:'resolved', rank:1}]`) pour avoir un libellé de défense long.
- **Étapes** : onglet **Jouer**, ouvrir le plateau des mêlées. Capture en 1440 × 900. Puis `page.setViewportSize({ width: 390, height: 844 })`, rouvrir la résolution d'une attaque contre le PJ Petit et ouvrir le menu de défense. Mesurer `document.documentElement.scrollWidth <= window.innerWidth`.
- **Attendu** : à 1440 px les cartouches d'une même zone sont rangés côte à côte sur la largeur ; à 390 px aucun défilement horizontal de la page, menu de défense lisible.
- **Preuves** : `R-03-plateau-1440.png`, `R-03-plateau-390.png`, valeurs de `scrollWidth` / `innerWidth`.

#### R-04 · Sauvegarde dans un fichier sans historique d'annulation
- **Préconditions** : partie jouée : `loadCombat` de deux participants, puis une modification de PV par l'interface (bouton `−` de la fiche, `.btn-hp-minus`) pour créer un historique ; `#btn-undo` actif.
- **Étapes** : menu **⋯** → **Sauvegarder dans un fichier** (`#workspace-save`), intercepter le téléchargement (`page.waitForEvent('download')`) et l'enregistrer dans `tmp/recette-gemini/sauvegarde-R-04.json` (téléchargement produit par l'application elle-même, dans le dossier de l'agent). Lire le JSON. Vérifier que `#btn-undo` est encore actif. Recharger la page, menu **⋯** → **Charger un fichier** (`#workspace-load`), choisir ce fichier (`setInputFiles` sur le champ de fichier), confirmer le remplacement après l'aperçu.
- **Attendu** : le fichier n'a **pas** de clé `history` ; il porte `combat`, `reserve`, `log`. Après le chargement, les participants et leurs PV sont ceux d'avant la sauvegarde ; l'historique d'annulation repart vide (`#btn-undo` inactif) sans message d'erreur.
- **Preuves** : extrait des clés racine du fichier, `R-04-apres-chargement.png`.

#### R-05 · Liaison : refus d'un dossier de carte sans liaison ; icônes d'installation
- **Étapes** : (1) `node tools/serve-liaison.mjs --check 8799 "E:/Outil MJ Warhammer/tmp"` (dossier sans `js/app/mjLink.js`) ; (2) lire les quatre icônes du manifeste : `GET /Outil-MJ-Warhammer/assets/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, et `GET /Outil-MJ-Warhammer/manifest.webmanifest` (champs `id`, `scope`, `lang`).
- **Attendu** : (1) code de sortie 1 et message « Liaison impossible : … est absent … » (aucun port ouvert) ; (2) trois PNG en 200, manifeste avec `id`, `scope`, `lang`.
- **Preuves** : sortie console de (1), statuts HTTP de (2).

#### R-06 · Démarrage sans stockage local, « Compte indisponible », bouton « Réessayer la connexion » (BOOT-02, 07, 09)
- **Verdict attendu : `à faire par le MJ`.** Il faut un vrai compte, un stockage local interdit et une panne de Firebase, que la recette isole volontairement. Ne pas tenter.

### Partie B · Versions 3.47.0, 3.47.1, 3.47.2 (13/11/2026)

#### R-07 · Fin de combat : « Garder ou archiver », un seul ↶
- **Préconditions** : reprendre exactement le jeu de `tests/soins-hors-rencontre-browser.mjs` (lignes 17 à 32 : Hilda PJ avec fiche `fiche-hilda` à 6 PV, Otto PJ sans fiche à 19 PV, Gobelin 2/9 PV, trois incidents ouverts). Le copier dans le script.
- **Étapes** : onglet **Jouer**, bouton **Terminer le combat** (`#workspace-end-combat`) → fenêtre « Terminer le combat : garder ou archiver ». (1) La lire, puis **Annuler**. (2) La rouvrir, cocher « Garder « Otto » », **Terminer le combat**. (3) Cliquer **Annuler** dans le toast.
- **Attendu** : (1) deux cases seulement (`input[name=keep]` : Otto et Gobelin), Hilda absente (suivie d'office) ; Annuler laisse les 3 participants. (2) toast « Combat terminé » ; `persistentCharacters` = Hilda (6 PV) et Otto (19 PV) ; incidents `['open','open','archived']`. (3) un seul ↶ rend les 3 participants, 0 personnage suivi et les trois incidents `open`.
- **Preuves** : `R-07-fenetre-garder.png`, extrait de l'état après (2) et (3).

#### R-08 · Campagne : personnages suivis hors rencontre, soin, maladie
- **Préconditions** : suite de R-07 (étape 2 rejouée, combat terminé, Otto gardé).
- **Étapes** : onglet **Campagne** (`#tab-campaign`), bouton **Tous**, cliquer Hilda. Déplier « Guérison » : soigneur « Otto (hors rencontre) », `d100` = 20, case « Fournitures médicales disponibles », **Enregistrer le Test de soin**. Puis déplier les maladies : « Maladie » = `Fièvre des marais`, durée restante 3, **Enregistrer la maladie** ; sur la carte de la maladie : soigneur « Soigneur extérieur… », nom `Barbier de Wurtbad`, score de Guérison 55, Bonus d'Intelligence 4, `d100` 30, **Enregistrer les soins du jour**. Recharger la page.
- **Attendu** : liste de deux personnes avec « 6 / 20 PV » + « Hors rencontre » pour Hilda et « 19 / 20 PV » pour Otto ; aucun des anciens libellés « Suivi hors rencontre » ni « Participant absent ». Après le soin : « Enregistré » et « 9 Blessure(s) rendue(s) », Hilda « 15 / 20 PV ». Maladie : « soigneur : Barbier de Wurtbad (extérieur) », durée restante 2. Après rechargement, tout est conservé.
- **Preuves** : `R-08-campagne-suivis.png`, `R-08-soin-9.png`.

#### R-09 · Migration de sauvegarde schéma 3 → 4
- **Étapes** : dans un outil neuf, `Store.loadFromJSON(JSON.parse(fichier tests/fixtures/suivis-orphelins-v3.json))` (lecture du fichier par le script Node, injection dans la page). Lire l'état et le journal.
- **Attendu** : `schemaVersion` à 4 dans l'état exporté ; journal contenant exactement la ligne « Mise à jour des suivis : 4 suivi(s) rattaché(s) à leur personnage, 3 suivi(s) sans propriétaire archivé(s). » ; `persistentCharacters` : Wren (7/12 PV) et Hilda (14/14). Recharger : la ligne n'est pas rejouée (pas de doublon dans le journal).
- **Preuves** : extrait du journal, nombre de lignes avant/après rechargement.

#### R-10 · Chant vivifiant et Acceptation du Destin : refus par le moteur (REGLES-10)
- **Préconditions** : `loadCombat` : `mage` (PJ, initiative 60) et `foe` (camp `pj`, initiative 20) avec, sur `foe`, `extensions.v5.specialStates = { cannotActUntilNextRound: true }` (éveil de Chant vivifiant). Second jeu : `foe` ennemi Brisé et engagé, avec `specialStates = { cannotFlee: true }`.
- **Étapes** : (A) onglet **Jouer**, sélectionner `foe`, ouvrir une attaque contre `mage`. (B) second jeu : panneau « Brisé · fuite obligatoire » de `foe`, tenter la fuite.
- **Attendu** : (A) l'action est refusée, le texte contient « s’éveille et perd son prochain Tour » ; l'aperçu ne propose pas d'« Appliquer ». (B) refus contenant « ne peut pas fuir le combat tant que le sort est actif » ; le **Désengagement** reste proposé.
- **Preuves** : `R-10-eveil-refus.png`, `R-10-fuite-refus.png`.

#### R-11 · Précise se lit comme Pointue ; référentiel d'équipement (3.47.1 et 3.48.1)
- **Étapes** : onglet **Bibliothèque**, **Règles et mots-clés**, rechercher `Précise`, puis `Pointue`.
- **Attendu** : « Précise » existe et son effet est « +1 DR à tout Test réussi pour attaquer » (même effet que Pointue, un seul +1 DR si l'arme porte les deux). Aucun « +10 » n'est mentionné pour Précise.
- **Preuves** : `R-11-precise.png`, `R-11-pointue.png`.

#### R-12 · Accessibilité : quatre espaces, 390 px et 1440 px (COMP-ACCESSIB-10)
- **Étapes** : pour chaque espace (**Préparer**, **Jouer**, **Campagne**, **Bibliothèque**) et chaque largeur (390 × 844, 1440 × 900), thème clair puis sombre (`startEnv({ colorScheme })`), mesurer `scrollWidth <= innerWidth`, lister les `button` sans nom accessible (`aria-label` ou texte vide), puis le focus après ouverture/fermeture de **Temps de campagne**. Touches `1` à `4` : changent d'espace ; `Home` et `End` sur les onglets : premier et dernier.
- **Attendu** : aucun débordement horizontal, aucun bouton sans nom, focus restitué sur le bouton « Avancer le temps » (`[data-campaign-focus="advance"]`) après fermeture de la fenêtre, raccourcis `1` à `4` actifs.
- **Preuves** : tableau espace × largeur × thème, une capture par espace en 390 px.

#### R-13 · Garde-fous de génération (lecture seule)
- **Étapes** : depuis `E:/Outil MJ Warhammer`, lancer **chacune** de ces commandes (toutes en `--check`, elles n'écrivent rien) :
  `node tools/recopier-donnees-communes.mjs --check` ; `node tools/build-token-images.mjs --check` ; `node tools/build-fiche-keywords.mjs --check` ; `node tools/build-fiche-mounts.mjs --check` ; `node tools/build-bestiary-folders.mjs --check`.
- **Attendu** : code de sortie 0 pour les cinq. (`tools/build-bestiary-profiles.mjs --check` exige Bash et le `pdftotext` 4.00 de Git : **à faire par le MJ**, ne pas le lancer.)
- **Preuves** : cinq lignes `commande => code`.

#### R-14 · Synchronisation du compte en schéma 4 sur un vrai compte
- **Verdict attendu : `à faire par le MJ`** (connexion Google réelle, Realtime Database de production). Ne pas tenter.

### Partie C · Version 3.48.0 : images des pions, bestiaire en dossiers, livres (15/11/2026)

Convention de ces scénarios : outil + carte reliés (`openMap` puis `openTool`, **même contexte**, même `sid`). Les chemins d'images sont relatifs au dépôt de la carte (`maps/tokens/…`). Chaque pion lié apparaît en réserve de la carte avec `link.ref = 'p:<idParticipant>'`, puis `place(gm, ref, { a, b })` le pose.

#### R-15 · Image automatique : Loup du bestiaire, profil ancien, profil non apparié
- **Étapes** : (1) dans l'outil, **Bibliothèque** → Bibliothèque de bestiaire → rechercher `Loup` (nom « Wolf » ou « Loup », id `E0-P-078`) → **Copier dans la réserve**. (2) Dans la réserve, `Store.addProfile(new Profile({ id:'ancien', name:'Loup ancien', hp:10, extensions:{ v5:{ bestiary:{ id:'E0-P-078' } } } }))` (profil « copié avant le chantier »). (3) Copier aussi `Isrogdal` (`E0-P-123`, non apparié). (4) Les trois en combat : `Store.addProfilesToCombat([ids], { zone:'active' })`. (5) Sur la carte : lire `mapToken` des trois, les poser (`place`), capture, `loadedImages(gm)`.
- **Attendu** : Loup et Loup ancien : `imageUrl = 'maps/tokens/bestiaire/loup.webp'`, image chargée avec statut 200. Isrogdal : `imageUrl` vide ou nul, pion dessiné sans image (initiales). Dans l'outil, la liste de la réserve montre une vignette et la mention « image automatique » pour les deux loups.
- **Preuves** : `R-15-carte-loups.png`, `R-15-reserve-vignettes.png`, extrait `imageUrl` des trois pions.

#### R-16 · Image choisie dans la bibliothèque (> 24 Kio), exclusivité, retrait, sauvegarde
- **Préconditions** : profil `loup-auto` (comme R-15 étape 2) ; PNJ libre `Black Jens` sans bestiaire.
- **Étapes** :
  1. **Préparer** → **Modifier Loup auto**. Champ « Chercher une image dans la bibliothèque de la carte » (searchbox) : `squelette`, choisir **Squelette**. Lire `#token-image-source`. Enregistrer (`#btn-submit-form`).
  2. Rouvrir, importer une petite image (`#token-image-file`, PNG 400 × 200 rouge généré par canvas) : lire `#token-image-source`, puis rechoisir « Squelette » : relire.
  3. Rouvrir, **Retirer l'image** (`#token-image-remove`), enregistrer.
  4. Sur Black Jens : chercher `black jens`, choisir l'image (supérieure à 24 Kio), mettre en combat, lire le pion sur la carte, puis menu **⋯** → **Sauvegarder dans un fichier**, lire le fichier.
- **Attendu** : (1) source « Squelette (bibliothèque, choix du MJ) », profil `tokenLibraryImage = 'maps/tokens/ennemis/morts-vivants/squelette.webp'` ; carte : `imageUrl` identique. (2) l'import remplace le choix (« Image importée (choix du MJ) »), puis le choix de Squelette retire l'image importée. (3) retour à « Loup (bibliothèque, automatique) », le champ `tokenLibraryImage` disparaît du profil, la carte repasse à `loup.webp`. (4) l'image s'affiche sur la carte ; le fichier de sauvegarde **de la carte** (`Store` de la carte, `getCampaign()` sérialisé) ne contient que le chemin, aucun `data:image`.
- **Preuves** : `R-16-selecteur.png`, `R-16-carte-squelette.png`, extraits de `#token-image-source` à chaque étape.

#### R-17 · Vignettes, image introuvable, bibliothèque injoignable
- **Étapes** : (1) R-15 chargé, lister `img.token-thumb` visibles de la réserve. (2) Intercepter `**/rpg-map-display/maps/tokens/**` pour répondre 404 (`page.route`) puis recharger : lire la réserve et l'édition d'un profil. (3) Dans l'édition, taper `destrier de bohemond` dans la recherche : cliquer le résultat. (4) 390 px : `setViewportSize({width:390,height:844})` et mesurer le débordement du sélecteur.
- **Attendu** : (1) vignettes visibles avec la mention « image automatique » ou « image du MJ ». (2) pas d'icône cassée (aucun `img` visible avec `naturalWidth === 0`), la vignette est absente, des 404 sont normaux **ici seulement**. (3) la recherche et le choix marchent par les noms, sans vignette, et l'enregistrement du profil réussit. (4) aucun débordement horizontal.
- **Preuves** : `R-17-hors-ligne.png`, valeur de `scrollWidth`.

#### R-18 · Monture : image automatique (Destrier) puis destrier nommé
- **Étapes** : comme `tmp/recette-images-pions/s5-monture.mjs` : profil `Chevalier` (PNJ, 12 PV, mouvement 4) ; `Store.setProfileMount('chev', { template:{ name:'Destrier', hp:20, movement:8, extensions:{ v5:{ bestiary:{ id:'E0-P-988' } } } }, bestiaryId:'E0-P-988', name:'Destrier' })` ; `Store.addProfilesToCombat(['chev'], { zone:'active' })` ; mettre la monture en zone `active` ; `Store.setMounted(idCavalier, true)` ; poser le pion fusionné sur la carte. Puis **Modifier Chevalier** → champ « Chercher une image de la monture dans la bibliothèque de la carte » → `destrier de bohemond` → bouton **Destrier de Bohémond**.
- **Attendu** : pion fusionné `mounted = true`, `rider.imageUrl = 'maps/tokens/bestiaire/destrier.webp'` (statut 200) ; après le choix, `rider.imageUrl = 'maps/tokens/destriers/destrier-bohemond.webp'` (statut 200) ; le texte « Image de la monture : … (bibliothèque, choix du MJ) » est affiché dans l'édition.
- **Preuves** : `R-18-destrier-auto.png`, `R-18-destrier-bohemond.png`.

#### R-19 · Forme bestiale et Transformation de Kadon : image du pion, retour, pas de sang
- **Préconditions** : carte avec un pion PJ lié (`createToken({ id:'pj-token', levelId:'a', kind:'pc', cell:{a:1,b:1}, label:'Wren', imageUrl:'maps/tokens/caelel.webp', link:{ source:'outil-mj', ref:'pj:pc-recette' } })`) ; outil : profil `Wren` PJ 14 PV, personnage persistant `pc-recette` (`Store.savePersistentCharacter({ id:'pc-recette', name:'Wren', kind:'PJ', profileId:'<profil>' })`), participant lié (`persistentCharacterId:'pc-recette'`). Pose : `s6-s7-pj-forme.mjs` du 13/11 fait foi.
- **Étapes** : `applyBeastForm(id, REIKLAND_BEASTS.wolf, { isJade:false })`, attendre le pion, capture ; `revertBeastForm` ; idem avec `{ isJade:true }` ; puis `applyBeastForm(id, KADON_MONSTERS.dragon, { kind:'kadon', durationRounds:3 })` puis retour. Lire `mapToken` à chaque étape.
- **Attendu** : Vent des Bêtes : `formImageUrl = 'maps/tokens/bestiaire/forme-bestiale/loup-bete.webp'` ; Vent de Jade : `…/loup-vie.webp` ; Kadon : `maps/tokens/monstres/transformation-kadon/dragon.webp` ; à chaque retour `formImageUrl` vide et `imageUrl` toujours `maps/tokens/caelel.webp`. Images chargées en 200. **Aucune gerbe de sang** dessinée sur le pion à la prise ni au retour de forme (la perte de PV de la forme n'est pas une blessure), `hp` envoyé cohérent avec l'outil.
- **Preuves** : `R-19-loup-bete.png`, `R-19-loup-vie.png`, `R-19-kadon-dragon.png`, `R-19-retour.png`, zoom 200 × 200 sur le pion.

#### R-20 · Bibliothèque de bestiaire par dossiers
- **Étapes** : onglet **Bibliothèque** → **Bibliothèque de bestiaire**. (1) Lire la racine. (2) Ouvrir **Ennemis** puis **Morts-vivants** au clavier (Tab, Entrée). (3) Lire le fil d'Ariane (région « Fil d’Ariane du bestiaire »), remonter. (4) Rechercher `Rat` dans Ennemis, puis depuis la racine. (5) Copier un profil en réserve depuis le dossier **Bestiaire**. (6) 390 px et thème sombre : débordement.
- **Attendu** : sept dossiers racine : Bestiaire, Monstres, Ennemis, Peuples, PNJ nommés, PJ prétirés, Gabarits, avec leurs compteurs (Bestiaire 96, Monstres 91, Ennemis des sous-dossiers : Démons 34, Gobelins 19, Morts-vivants 45, Skavens 30… ; ces nombres peuvent bouger : consigner ceux lus). Le focus suit le dossier courant ; la recherche est bornée au dossier ouvert puis élargie depuis la racine ; le profil copié porte son **nom français** quand il existe, la recherche trouve aussi le nom anglais. Aucun débordement à 390 px.
- **Preuves** : `R-20-racine.png`, `R-20-morts-vivants.png`, `R-20-390-sombre.png`.

#### R-21 · Nouveaux livres et profils
- **Étapes** : dans la Bibliothèque de bestiaire, ouvrir **PNJ nommés** : lire les entrées « L28 — Le Pouvoir derrière le Trône », « L29 — Le Tome de la Corruption », « L30 — Le Seigneur liche » et leurs compteurs ; rechercher `Ours`, `Pigeon`, `Vampires lahmianes`, `Roi des Tombes`. Copier un profil de L28 et un de L29 en réserve.
- **Attendu** : les trois livres sont listés (L28 environ 64 profils, L29 et L30 convertis « WJDR V2, converti en V5 ») ; Ours, Pigeon, Vampires lahmianes et le Roi des Tombes se trouvent ; un profil copié de L29 conserve la mention de sa source V2 (livre, page) dans sa fiche ou ses notes. Consigner les compteurs lus.
- **Preuves** : `R-21-livres.png`, extrait des compteurs.

#### R-22 · Rendu à l'œil des illustrations (jugement esthétique)
- **Verdict attendu : `à faire par le MJ`** pour la qualité artistique et la lisibilité des images à la table (tablette, TV). L'agent se contente de fournir, dans R-15 à R-19, les captures du pion, sans juger leur style.

#### R-23 · Liste des images manquantes, garde-fou de publication
- **Étapes** : lire `E:/Outil MJ Warhammer/docs/specs/images-pions/illustrations-a-creer.md` (en lecture) et, côté carte, vérifier que chaque `path` de `js/data/token-images.js` existe sur le disque : script Node en lecture seule (`fs.existsSync('E:/rpg-map-display/' + path)`).
- **Attendu** : aucun chemin de la table n'est absent du disque (zéro manquant) ; le fichier de liste est lisible. Rapporter le nombre de chemins vérifiés.
- **Preuves** : résultat du script (nombre total, nombre absent).

### Partie D · Version 3.48.1 (15/11/2026)

#### R-24 · Fuite d'un Brisé engagé : les deux confirmations
- **Préconditions** : jeu `COMBAT_POURSUITE` de R-29 (Prêtresse Brisée engagée avec Orc et Gobelin).
- **Étapes** : onglet **Jouer**, panneau « Brisé · fuite obligatoire » (`[data-broken-escape-actor="priest"]`). Sans rien cocher, tenter « Appliquer Move (Flee) ». Puis régler comme dans R-29 (visibilité, déplacement `walk`, cases) et cocher « Fuite engagée confirmée avec Orc, Gobelin » et « Attaques gratuites résolues pour Orc, Gobelin ».
- **Attendu** : tant que les confirmations manquent, la fuite est refusée avec un motif clair ; **plus** de message « Fuite engagée non raccordée ». Avec les deux cases, « Calculer l'aperçu » puis « Appliquer Move (Flee) » aboutissent et la Prêtresse n'est plus engagée.
- **Preuves** : `R-24-fuite-refus.png`, `R-24-fuite-ok.png`.

#### R-25 · Relecture d'un état de compte (listes vides retirées)
- **Étapes** : poser, par `Store.loadFromJSON`, un état dont les registres n'ont **pas** leurs listes vides (cas d'une relecture de la base temps réel) : `extensions.v5.aftermathRegister = { schemaVersion:1, revision:1, calendar:{schemaVersion:1,originDay:0,currentDay:0} }` (sans `incidents`, `diseases`, `sequelae`, `receipts`), `extensions.v5.actionLedger = { schemaVersion:1 }` sans `quotaUsage`, et une réaction `extensions.v5.reactions` absente. Onglet **Campagne** : ouvrir un personnage et enregistrer un soin ; onglet **Jouer** : faire une attaque simple.
- **Attendu** : aucun message « registre de convalescence invalide », « Registre des usages invalide » ni « Opportunité de réaction invalide » ; le soin et l'attaque s'enregistrent. Les vraies erreurs restent refusées : un registre avec `incidents: 'x'` (chaîne) est refusé avec un message.
- **Preuves** : extrait des messages, `R-25-campagne.png`.

### Partie E · Version 3.49.0 : monture d'un PJ déclarée sur sa fiche (16/11/2026)

Aucun accès à Firestore : fiches simulées par `fakeFiches(env.context)` ; `window.fiches = { caelel: <fiche> }` et `window.ficheRevision = 'rN'` posés avant chaque ouverture. Le menu est **⋯** → **Mettre à jour les PJ** (`#workspace-fiche-sync`) ; la vue est `.fiche-sync-view` ; bouton « Appliquer (1 fiche) ».

#### R-26 · Déclaration, renommage, nom gardé
- **Préconditions** : `Store.addProfile({ id:'pj', name:'Caelel', kind:'PJ', hp:14, maxHp:14, initiative:55, armor:{head:0,body:0,arms:0,legs:0}, caracs:{F:30}, diceLines:[] })` ; fiche = `ficheCaelel()` avec le champ `monture`.
- **Étapes** : (1) `monture: { espece:'E0-P-077', nom:'Tonnerre' }` → ouvrir, lire la ligne `[data-key="monture:caelel"]`, **Appliquer (1 fiche)**. (2) Poser un marqueur `Store.updateProfile('monture-pj', { notes:'marqueur-2' })`, passer la fiche à `nom:'Éclair'`, rouvrir, appliquer. (3) Renommer dans l'outil (`Store.setProfileMount('pj', { template: Store.getProfile('monture-pj'), bestiaryId:'E0-P-077', name:'Foudre' })`), fiche inchangée, rouvrir.
- **Attendu** : (1) ligne contenant « Tonnerre » et « déclarée par la fiche » ; après application, `declaredMount = { profileId:'monture-pj', name:'Tonnerre', bestiaryId:'E0-P-077' }`, profil `monture-pj` créé depuis le Cheval du Livre de base (F, CC et `maxHp` égaux à ceux du Cheval `E0-P-077`). (2) ligne « renommée » avec « Tonnerre » et « Éclair » ; le marqueur `marqueur-2` est conservé (profil non reconstruit). (3) pas de mention « renommée » : le nom de l'outil (Foudre) est gardé.
- **Preuves** : `R-26-apercu-declaration.png`, `R-26-apercu-renommee.png`, extrait de `declaredMount`.

#### R-27 · Retrait, clé inconnue, ↶
- **Étapes** : (1) `monture: null` → ouvrir, appliquer. (2) `monture: { espece:'E0-P-INCONNUE', nom:'Fantôme' }` → ouvrir, ne rien appliquer si le bouton est inactif. (3) Supprimer le profil monture (`Store.removeProfile('monture-pj')`), redéclarer `Tonnerre` (E0-P-077), appliquer, puis cliquer **↶** (`#btn-undo`).
- **Attendu** : (1) ligne « retirée du profil », `declaredMount = null`, le profil `monture-pj` reste en réserve. (2) l'aperçu cite `E0-P-INCONNUE` dans un avertissement (« fiche plus récente ? »), aucune ligne de monture, rien de modifié. (3) après ↶ : `declaredMount = null` et le profil `monture-pj` n'existe plus.
- **Preuves** : `R-27-retiree.png`, `R-27-inconnue.png`.

#### R-28 · Fiche réelle et carte « Monture » du bureau des fiches
- **Verdict attendu : `à faire par le MJ`** (Firestore réel, fonction `executeFicheCommand` déployée, carte « Monture » du bureau des fiches non vérifiée dans un navigateur).

### Partie F · Version 3.50.0 : poursuite selon le Livre de base V5, image du pion des PJ (17/11/2026)

#### R-29 · Poursuite en combat : attaques gratuites, lancement, Tests, Obstacle, fin
- **Préconditions** (`COMBAT_POURSUITE`) : `loadCombat` de `priest` (PJ, initiative 60, M 4, État **Brisé** : `states:[{ id:'qa-broken', key:'brise', name:'Brisé', level:1, source:{ type:'browser-fixture' } }]`, compétence `{ id:'skill-athletics', name:'Athlétisme', carac:'Ag', status:'resolved', total:60 }`), `orc` (ennemi, initiative 50, M 5), `gob` (ennemi, initiative 30, M 4), hp 20/30, ordre `priest, orc, gob`, engagements `priest–orc` et `priest–gob`. Onglet **Jouer**, `closeDrawer`.
- **Étapes** (même séquence que `tests/poursuite-v5-browser.mjs`, valeurs identiques) :
  1. Panneau du Brisé : « Visibilité par rapport aux ennemis » = `false` → aucun bouton de lancement ; `true` → bouton de lancement présent.
  2. **Jouer l'attaque gratuite** de l'Orc (`[data-broken-escape-free-attack="orc"]`) : saisir attaque `30`, défense `90`, **Calculer**, **Appliquer**. **Passer** celle du Gobelin (`[data-broken-escape-free-attack-pass="gob"]`).
  3. Déplacement Flee = `walk`, visibilité après l'étape = `true`, cocher « Orc a dépensé son Élan » et « Fuite engagée confirmée avec Orc, Gobelin », **Calculer l'aperçu**, **Appliquer Move (Flee)**.
  4. Lancement (`[data-pursuit-launch="priest"]`) : rôles Prêtresse = `prey`, Orc et Gobelin = `pursuer` ; **lancer** (`[data-pursuit-start="priest"]`).
  5. Tour de la Prêtresse : « Compétence du Test » = `Athlétisme`, jet `30`, **Calculer**, vérifier l'aperçu, **Appliquer**. **Tour suivant** (`.combat-banner-primary`).
  6. Tour de l'Orc : jet `40`, **Calculer**, **Appliquer**. Cocher « Terrain dense ou bondé ». Tirage de l'Obstacle de la Prêtresse avec d10 figé à 6 (`fixDie(page, dieR(6,10))`, bouton `[data-pursuit-draw="priest"]`). Passer le Tour de l'Orc puis du Gobelin (« Aucun Test à jouer pendant le Tour de Gobelin. »).
  7. Round 2, Tour de la Prêtresse : recharger la page (l'état doit survivre), rouvrir **Jouer**, Test d'Obstacle : `Athlétisme`, jet `99`, répondre `Oui` à « Préciser si le Test sert à fuir ou se cacher. », **Calculer**, **Appliquer**.
  8. Cliquer **↶**, vérifier, **Rétablir** (menu ⋯, `#btn-redo`). Puis **Engager au plateau** (`[data-pursuit-end-apply="engage"]`).
- **Attendu** : (1) lancement absent hors de vue de tous les ennemis, présent sinon. (2) « Orc : jouée », « Gobelin : passée », la case « Attaques gratuites résolues » se coche d'elle-même, l'Action de l'Orc n'est pas consommée. (3) la Prêtresse n'est plus engagée. (4) paire : poursuivant `orc`, fuyard `priest` ; ligne de journal « Poursuite lancée : Prêtresse poursuivi(s) par Orc, Gobelin ; Test opposé de Orc contre Prêtresse ». Le message « Fuyard d’une poursuite en cours : la poursuite vaut pour la fuite et le Sprint, le Tour peut se terminer, Test fait ou non. » est affiché. (5) aperçu « Athlétisme 60 · jet 30 · +3 DR · réussite ». (6) aperçu de l'Orc « jet 40 · +2 DR · réussite » ; Test opposé : écart −1 DR, gagnant fuyard, poursuite toujours `active`, facteurs `{ won:true, speed:false, terrain:false }`, puis journal « facteurs favorables : Test gagné, terrain (2/3) » ; obstacle « Terrain découvert (d10 = 6) », compétences possibles : Athlétisme. (7) la poursuite survit au rechargement ; aperçu « jet 99 … échec » ; issue « Fuyard rattrapé », motif « Fin de poursuite : fuyard rattrapé (0 Obstacle(s) franchi(s) sur 1 exigé(s)) ». (8) ↶ rend la poursuite en cours et l'Action du Tour ; ↷ la réapplique ; « Engager au plateau » engage la Prêtresse avec Gobelin et Orc (ligne « Poursuite · Prêtresse engagé(s) avec Orc, Gobelin (MJ) »), puis le bouton est grisé (« on n'engage pas deux fois »).
- **Preuves** : `R-29-attaques-gratuites.png`, `R-29-lancement.png`, `R-29-obstacle.png`, `R-29-issue.png`, extraits du journal.

#### R-30 · Poursuite de scène hors combat : fuyard échappé à 6 DR
- **Préconditions** : même jeu que R-29, **sans** Brisé ni engagement.
- **Étapes** : onglet **Jouer**, bouton **Poursuite de scène** (`[data-pursuit-scene-open]`). (a) Avec 0 puis 1 participant : bouton grisé, motif affiché. (b) Avec 3 : ouvrir la modale (`dialog[data-pursuit-dialog]`), « Rôle de Prêtresse » = `prey`, « Rôle de Orc » = `pursuer`, jet de poursuite de la Prêtresse `5`, de l'Orc `95` ; ne **pas** valider, **Fermer sans valider**. (c) Rouvrir, mêmes saisies, **Valider** ; cliquer **Retirer de la rencontre** (`[data-pursuit-end-apply="remove"]`) ; fermer ; **↶** puis **Rétablir**.
- **Attendu** : (a) motifs « Aucun participant dans la rencontre en cours. » et « Un seul participant dans la rencontre en cours : il en faut deux pour une poursuite. ». (b) après le premier jet seul : « Test de poursuite des deux côtés à saisir. » et « Valider » grisé ; avec les deux : « Test opposé : les fuyards l’emportent (-9 DR). », issue « Fuyard échappé », motif « Écart de 9 DR en faveur des fuyards. », aucun facteur ni Obstacle ; **Fermer sans valider** n'écrit rien (révision, journal et rencontre inchangés), le focus revient sur le bouton d'entrée. (c) « Poursuite validée : une entrée au journal, annulable par ↶. Les boutons ci-dessus agissent sur le plateau. » ; une seule ligne de journal « Poursuite hors combat : Prêtresse poursuivi(s) par Orc. Test opposé : -9 DR. Issue : fuyard échappé (Écart de 9 DR en faveur des fuyards). » ; aucun Round ni Action consommée ; le fuyard est retiré de la rencontre ; ↶ le rend, ↷ le retire de nouveau.
- **Preuves** : `R-30-entree-grisee.png`, `R-30-echappe.png`, extrait du journal.

#### R-31 · Poursuite de scène : passage par les Obstacles, fuyard rattrapé
- **Étapes** : rencontre neuve (3 participants), modale, `prey` Prêtresse, `pursuer` Orc, jets `30` (Prêtresse) et `40` (Orc). Constater les facteurs, cocher « Terrain dense ou bondé », tirer l'Obstacle (d10 = 6), jet d'Obstacle `99`, **Valider**, puis **Engager au plateau**.
- **Attendu** : « Test opposé : les fuyards l’emportent (-1 DR). » ; facteurs affichés après le Test seulement, « Test de poursuite gagné » coché d'office, le terrain décoché ; texte « 1/3 facteur(s) : 1 Obstacle(s) à franchir sur 1 personnage(s). » puis « 2/3 » ; « Valider » inactif tant qu'aucun Obstacle n'est tenté ; « Terrain découvert (d10 = 6) », compétence Athlétisme ; issue « Fuyard rattrapé », motif « 0 Obstacle(s) franchi(s) sur 1 exigé(s). » ; une seule ligne de journal et une seule entrée d'historique ; « Engager au plateau » engage `priest` avec `orc` (ligne « Poursuite · Prêtresse engagé(s) avec Orc (MJ) »).
- **Preuves** : `R-31-facteurs.png`, `R-31-rattrape.png`.

#### R-32 · Fin d'office au Mouvement double
- **Préconditions** : participants `priest` (M 4) et `orc` à M 8 (puis M 7).
- **Étapes** : modale de scène, `prey` Prêtresse, `pursuer` Orc, jets quelconques (`30` et `40`).
- **Attendu** : avec M 8 contre M 4 (double juste) la poursuite se termine d'office avec le **motif** (mention du double de Mouvement) sans facteurs ni Obstacles ; avec M 7 contre M 4 elle ne se termine pas d'office (facteurs demandés). Noter le texte exact du motif.
- **Preuves** : `R-32-double.png`, `R-32-pas-double.png`.

#### R-33 · Cas limites de la poursuite
- **Étapes** : (a) participant au Mouvement nul (`caracs.M = 0`) ou absent ; (b) participant sans compétence Athlétisme (la poursuite repli sur sa caractéristique) ; (c) un participant retiré de la rencontre pendant une poursuite en combat.
- **Attendu** : (a) la règle du double et la paire automatique attendent une saisie du MJ (champs de correction du Mouvement), pas de blocage silencieux ; (b) le Test se fait avec la caractéristique ; (c) le participant sort du compte de son camp. Si un cas n'est pas atteignable par l'interface, `bloqué` en le disant.
- **Preuves** : captures nommées par cas.

#### R-34 · Image du pion d'un PJ envoyée à la carte
- **Préconditions** : outil + carte reliés ; carte : pion PJ lié à `pj:pc-recette` avec `imageUrl:'maps/tokens/caelel.webp'` ; outil : profil PJ `Wren` + personnage persistant + participant lié (comme R-19).
- **Étapes** : (1) sans image choisie dans l'outil : lire `mapToken`. (2) **Préparer** → **Modifier Wren** : le sélecteur d'image est présent pour un PJ ; choisir `squelette`, enregistrer. Lire `mapToken`. (3) Retirer l'image dans l'outil, enregistrer, relire.
- **Attendu** : (1) `imageUrl` toujours `maps/tokens/caelel.webp` (la carte garde la sienne ; l'outil envoie `imageUrl: null`). (2) `imageUrl = 'maps/tokens/ennemis/morts-vivants/squelette.webp'`. (3) `imageUrl` envoyé de nouveau nul ; **la carte ne restaure pas** l'ancienne image (limite connue de la 3.50.0) : consigner ce qu'on lit réellement.
- **Preuves** : `R-34-pj-avant.png`, `R-34-pj-choisie.png`, `R-34-pj-retrait.png`.

### Partie G · Version 3.51.0 : Traits optionnels (17/11/2026)

Tous ces scénarios partent d'un outil neuf, sans carte. Copie d'un profil du bestiaire : **Bibliothèque** → Bibliothèque de bestiaire → champ « Nom du profil » = nom anglais → **Copier dans la réserve**. Édition : **Bibliothèque** → carte du profil → **Modifier** ; le panneau est `#form-optional-traits`, ses cases `[data-optional-key="…"]`.

#### R-35 · Cases, « imprimé → modifié », Ajouter un Trait
- **Étapes** : copier `Heavy Warhorse` (« Cheval de guerre lourd », `E0-P-766`). Ouvrir l'édition. (1) Lire les cases. (2) Cocher **Tough**. (3) Cocher **Hardy**. (4) **Ajouter un Trait** : rechercher `Fear`, choisir, confirmer **sans** paramètre ; puis avec le paramètre `2`. (5) **↶** ; décocher Tough puis **↶**.
- **Attendu** : (1) six cases exactement : Champion, Clever, Elite, Hardy, Rear, Tough ; aucune ligne « imprimé → modifié ». (2) la ligne `E` montre « 50 → 60 », `FM` « 10 → 20 ». (3) une ligne Blessures « 32 → N » avec N > 32. (4) refus avec un message (paramètre exigé pour Peur), aucune case Peur ; avec `2` : case Peur cochée avec « 2 ». (5) ↶ retire l'ajout de Peur, Tough et Hardy restent cochées ; décocher Tough puis ↶ remet la coche et la ligne `E`.
- **Preuves** : `R-35-tough.png`, `R-35-peur-refus.png`, `R-35-peur-2.png`.

#### R-36 · Case grisée, attaque et armure, Taille, profil sans option
- **Étapes** : copier `River Trolls` (« Trolls des rivières », `E0-P-963`), `Human` (`E0-P-063`), `Bear` (`E0-P-194`) et `Isrogdal` (`E0-P-123`) ; ouvrir chacun.
- **Attendu** : Trolls : case Tough **grisée** avec « déjà compté ». Humain : une case « attaque » et une case « armure » (cocher les deux, les deux sont enregistrées dans `extensions.v5.optionalChoices`). Ours : cocher la case de **Taille** ; ligne Blessures « 28 → N » avec N > 28 (Blessures recalculées par différence). Isrogdal : aucune case, seul « Ajouter un Trait » apparaît.
- **Preuves** : `R-36-trolls.png`, `R-36-ours.png`.

#### R-37 · Entrée en rencontre, rechargement, export puis import JSON
- **Étapes** : sur le Cheval de guerre lourd de R-35 (Tough, Hardy, Peur 2 cochés) : (1) **Jouer** → onglet latéral **Profils** → champ « Rechercher un profil à ajouter » = `Cheval de guerre` → bouton « Ajouter Cheval de guerre lourd au combat ». (2) Recharger la page, rouvrir l'édition. (3) Générer le JSON du profil (`exportProfilesJson` de `/Outil-MJ-Warhammer/js/core/json-profile-export.js`), changer `nom` en `Cheval importé`, **Préparer** → **Nouveau profil** → **Créer depuis un JSON** → champ « JSON du profil » → **Vérifier le JSON** → **Créer 1 profil**.
- **Attendu** : (1) le participant porte Peur et `E = 60`. (2) les trois coches sont toujours là, ligne `E` « 50 → 60 ». (3) le JSON contient la clé `traitsOptionnels` ; le profil importé a les coches `Fear`, `Hardy`, `Tough`.
- **Preuves** : extrait du JSON (clés), `R-37-importe.png`.

#### R-38 · Monture d'un PJ prise dans la Réserve (Dressé (Monture))
- **Étapes** : copier `Heavy Draught Horse` (« Cheval de trait lourd », `E0-P-763`), cocher la case « Dressé (Monture) » ; créer le PJ `Aline PJ` ; **Modifier** Aline : le panneau « Traits optionnels » est **absent** pour un PJ ; champ « Chercher une monture dans le bestiaire » = `Cheval de trait` ; choisir le résultat de la **Réserve**. Ouvrir ensuite le profil `monture-<id du PJ>`.
- **Attendu** : le PJ n'a pas de panneau de Traits optionnels ; la monture déclarée est « Cheval de trait lourd » et le profil `monture-<id>` garde la coche Dressé (Monture) ; ce profil s'ouvre avec le même panneau et la coche présente.
- **Preuves** : `R-38-monture-pj.png`.

### Partie H · Version 3.52.0 : calculs des Traits de créature et Bond (17/11/2026)

#### R-39 · Jeu `COMBAT_TRAITS` : Sang corrosif sur une blessure
- **Préconditions** : `loadCombat` avec, dans cet ordre, `hero` (PJ, initiative 60), `acid` (ennemi 50, Traits `[{name:'Sang corrosif'}]`), `inst` (ennemi 40, `[{name:'Instable'}]`), `stup` (30, `[{name:'Stupide'}]`), `stup2` (20, `[{name:'Stupide'}]`), `horse` (PJ 10, `[{name:'Bond'}]`, caracs M 6, F 40, E 40, Int 14), `undying` (ennemi 5, `[{name:'Increvable'}]`, `hp 0`, `extensions.v5 = { dead:true, dieHard:{ total:2, roundsLeft:3, bodyIntact:true, startRound:1, lastRound:1, ended:null } }`), `sent` (PJ 1, `extensions.v5.hasMomentum = true`). Tous PV 20/20 sauf `undying`. Engagements : `hero–acid`, `hero–inst`, `sent–inst`. Onglet **Jouer**, `closeDrawer`.
- **Étapes** : dans le groupe « Adversaires » du panneau Résolution, cliquer **Acide** ; attaque (`[data-roll-input="attack"]`) = `20`, défense (`[data-roll-input="defense"]`) = `90`, Entrée. Constater la demande, figer le dé à 10 (`fixDie(page, dieR(10,10))`), cliquer **Lancer d10**, puis **Appliquer 10 dégâts à Acide** (bouton `Appliquer N dégâts à Acide`).
- **Attendu** : une **seule** demande de d10 (`.workspace-trait-request`) même avec deux engagés ; après le dé : texte « Sang corrosif (d10 10) » dans le résultat ; l'Acide perd 7 (20 → 13) et le Héros engagé perd 10 − BE 3 = 7 (20 → 13) ; ligne de journal « Sang corrosif (d10 10) ».
- **Preuves** : `R-39-demande-d10.png`, `R-39-apres-blessure.png`.

#### R-40 · Fin de Round : Instable, Stupide guidé ou non, Increvable ; marqueur « tour perdu »
- **Préconditions** : suite de R-39.
- **Étapes** : cliquer **Tour suivant** (`.combat-banner-primary`) sept fois (Acide, Instable, Stupide, Stupide bis, Destrier, Revenant, Sentinelle), puis une huitième fois : la fenêtre « Terminer le tour : effets V5 » s'ouvre. Pour « Stupide · Stupide : un allié non Stupide le guide-t-il ? » répondre `Non` ; pour « Stupide bis · … » `Oui`. Figer le dé à 15 (`dieR(15,100)`), **Lancer d100 : Revenant · Increvable…** ; **Confirmer les effets**. Puis figer à 100 (`dieR(100,100)`), **Lancer d100 : Stupide · Intelligence…**, **Confirmer les effets**. Ouvrir la fiche de `stup` et de `undying`.
- **Attendu** : la question « guidé ? » n'est pas reposée (pas de boucle) ; pas de Test d'Intelligence pour Stupide bis ; Round 2 commencé ; Instable 20 → 18 avec la ligne « Instable, fin de Round : 2 Blessures directes » ; ligne « Stupide : Intelligence ratée » ; fiche de `stup` : marqueur **« Tour perdu »** avec avertissement ; fiche de `undying` : « Increvable … x / 6 DR » avec x entre 3 et 5 ; le Héros n'est pas touché par la fin de Round.
- **Preuves** : `R-40-fin-de-round.png`, `R-40-tour-perdu.png`, `R-40-increvable.png`.

#### R-41 · Bond : pastille sur la fiche
- **Étapes** : suite de R-40, ouvrir la fiche du `Destrier`.
- **Attendu** : pastille « Bond : Charge, Saut, Sprint à 2 × Course » (portée doublée). La Course affichée n'est pas modifiée par le Trait.
- **Preuves** : `R-41-pastille-bond.png`.

#### R-42 · Bond sur la carte : `bondCells` et palier violet quadrillé
- **Préconditions** : outil + carte reliés ; le `Destrier` de R-39 seul (un participant `horse`, PJ, M 6, Trait `{name:'Bond'}`, couleur éventuelle).
- **Étapes** : (1) lire `mapToken(gm,'p:horse')` : `speedCells`, `runCells`, `bondCells`. (2) `place(gm,'p:horse',{a:2,b:3})`. (3) Sélectionner le pion : `gm.evaluate(async id => (await import('/rpg-map-display/js/state/store.js')).setSelection(id), token.id)`, attendre 1 s, capture plein cadre. (4) Lire la zone : `bondZoneFor(token, level)` (`/rpg-map-display/js/state/selection.js`) et `getReachableCells()`. (5) Retirer le Trait côté outil (`Store.updateParticipant('horse', { traits: [] })`) et relire.
- **Attendu** : (1) avec M 6 : `speedCells 6`, `runCells 12`, `bondCells 24` (= 2 × `runCells`) ; `speedCells` et `runCells` inchangés par le Bond. (3) autour de la zone Marche/Course, un anneau **violet, quadrillé en croix** au-delà de la Course, sans quoi la zone Marche/Course est celle d'avant ; (4) la zone de Bond contient des cases hors de la zone atteignable ; elle est un **affichage seul** (cliquer dans l'anneau violet ne prépare aucun déplacement). (5) `bondCells` absent ou nul, l'anneau violet disparaît.
- **Preuves** : `R-42-carte-bond.png`, `R-42-sans-bond.png`, extrait de `mapToken`.

#### R-43 · Bond d'un cavalier monté, retrait à la descente
- **Préconditions** : comme R-18 mais la monture a le Trait Bond (si `template.traits` n'est pas pris en compte, `Store.updateParticipant(mountId, { traits:[{name:'Bond'}] })` après l'entrée en rencontre).
- **Étapes** : cavalier monté posé sur la carte, relever `bondCells` du pion fusionné ; `Store.setMounted(riderId,false)` (descente), relire.
- **Attendu** : monté, le pion reçoit le `bondCells` de **sa monture** (jamais le sien) ; à la descente, le prochain `token.state` n'a plus de `bondCells` : la carte **retire** le palier Bond du pion lié (commit `8e42f42`).
- **Preuves** : `R-43-monte.png`, `R-43-descendu.png`.

#### R-44 · Infecté : Test d'Endurance de la victime
- **Préconditions** : `biter` (ennemi, Traits `[{name:'Infecté'}]` ; si non reconnu, essayer `Infected` et le noter) ; `victim` (PJ, E 35, hp 20). Engagés.
- **Étapes** : attaque `biter` contre `victim` qui blesse (attaque `20`, défense `90`), **Appliquer**.
- **Attendu** : la demande « Test d'Endurance (+4 DR) » apparaît pour `victim` (score 35, ou le total de sa compétence Résistance si elle en a une) ; si le Test est **raté** (d100 `98`) : une ligne de journal contenant « Plaie purulente », aucun État ajouté ; si réussi (d100 `10`) : rien. Aucune demande si la victime est Mort-vivant ou Fabrication.
- **Preuves** : `R-44-demande.png`, extrait du journal.

#### R-45 · Bestial : fuite sous la moitié des Blessures
- **Préconditions** : `bete` (ennemi, `[{name:'Bestial'}]`, hp 20/20), un PJ adverse.
- **Étapes** : amener `bete` à 10 PV puis à 9 (deux attaques, ou `-` de la fiche), puis la soigner à 12 et la blesser de nouveau sous 10.
- **Attendu** : au franchissement de la moitié (10 → 9), une ligne « fuite » au journal, **une seule** fois par franchissement ; après un soin puis un nouveau franchissement, une nouvelle ligne ; cases « protège ses petits » et « acculé » dans le bloc « Rencontre » : cochées, elles remplacent la fuite par une Frénésie.
- **Preuves** : extrait du journal.

#### R-46 · Inflammable en défense
- **Préconditions** : `inflam` (PJ, Traits `[{name:'Inflammable'}]`, sinon `Flammable`), attaquant ennemi avec une arme qui inflige Enflammé (talent ou arme enchantée de la fixture : action `{ id:'torch', type:'attack', base:45, damage:3, inflicts:'Enflammé' }` ; si l'interface ne reconnaît pas ce champ, `bloqué`).
- **Étapes** : attaque de l'ennemi contre `inflam`, saisir attaque `20` et défense `30` (jet d'Esquive du défenseur).
- **Attendu** : le détail du Test de défense de `inflam` montre un modificateur de **−2 DR** « Inflammable » ; sans défense possible, pas de Test ; jamais appliqué au retrait d'Enflammé par Athlétisme.
- **Preuves** : `R-46-detail-defense.png`.

#### R-47 · Bloc « Rencontre » : Effrayé, Animosité, Vampirique, Se cabrer
- **Préconditions** : un participant avec Traits `Effrayé`/`Animosité`, un autre avec `Vampirique`, une monture dressée (Trait Dressé ou `extensions.v5.mountOf`), plus un adversaire.
- **Étapes** : onglet **Jouer**, fiche du participant : bloc « Rencontre » ; liste « Créature rencontrée » → l'adversaire ; boutons **Effrayé**, **Animosité** ; pour Vampirique : champ « Blessures infligées par la Morsure » = `4`, cocher « Morsure » et « proie admissible », **Soigner** ; pour la monture : liste « Cible piétinée en se cabrant » puis **Se cabrer**. Un seul **↶** après chacun.
- **Attendu** : **Effrayé** pose Peur (2) venant de l'adversaire (annulable) ; **Animosité** ouvre la demande de Test de Calme ; **Soigner** rend 4 Blessures sans dépasser le maximum ; **Se cabrer** remplace le déplacement (Piétinement) contre une créature plus petite ; chaque effet s'annule d'un seul ↶.
- **Preuves** : `R-47-bloc-rencontre.png`.

#### R-48 · ↶ / ↷ et rechargement des Traits
- **Étapes** : suite de R-39 et R-40 : ↶ répété jusqu'à retrouver Acide 20/20 ; puis ↷ répété ; recharger ; relire l'état.
- **Attendu** : un seul ↶ défait chaque effet complet (le ↶ qui rend l'Acide rend aussi les 7 Blessures du Héros) ; les ↶ des Tours sans effet ne touchent pas aux Blessures ; le tour perdu de `stup` est levé par ↶ ; le total d'Increvable repasse à 2 ; ↷ rejoue dans l'ordre ; après rechargement : Round 2, Instable 18 PV, Héros 13 PV, `stup` avec « Tour perdu », Increvable avancé ; le journal garde ses lignes (volontairement hors du ↶/↷).
- **Preuves** : valeurs lues avant/après chaque étape.

### Partie I · Version 3.53.0 : miracles narratifs et mots-clés des fiches (18/11/2026)

Tous ces scénarios utilisent `COMBAT_PRETRE` (§2.5) et la méthode de lancement du §2.5. La règle du MJ : l'outil sert au combat ; un miracle sans usage en combat reste un rappel. Pour chaque scénario noter **la méthode** (interface ou repli Store).

#### R-49 · Rappel enrichi, « durée non attestée par le livre »
- **Étapes** : culte quelconque ; lancer « Sur un Terrain Mortel » (`divine:miracle:sur-un-terrain-mortel`, en jetant 45), destinataire un allié, durée courte.
- **Attendu** : au résultat, le rappel affiche un libellé court (« Alliés protégés du Brisé »), la portée, les cibles, l'échéance, et la mention **« Attention : durée non attestée par le livre »**. Un allié avec l'État Brisé à poser n'est plus sujet à l'État tant que le miracle dure (le prêtre compte parmi les alliés).
- **Preuves** : `R-49-rappel.png`.

#### R-50 · Bonus et immunités : Muscles givrés, Cœur du loup, Fureur du soleil vertueux
- **Étapes** : (a) Ulric : « Muscles givrés » sur l'allié. (b) Ulric : « Cœur du loup » sur l'allié. (c) Solkan : « Fureur du soleil vertueux » sur le prêtre, puis une attaque du prêtre contre `foe` (armure 2 à toutes les zones ; attaque `20`, défense `90`).
- **Attendu** : (a) « Immunité au froid » listée sur le bénéficiaire. (b) Terreur ignorée (une demande de Test de Terreur à l'allié ne s'ouvre plus). (c) les Dégâts de l'attaque comptent **+2**, réduits comme d'habitude par le Bonus d'Endurance de la cible **et** par les PA : comparer avec la même attaque avant le miracle (écart exact : +2).
- **Preuves** : `R-50-muscles.png`, `R-50-fureur-avant.png`, `R-50-fureur-apres.png`.

#### R-51 · Test imposé : Embobiner
- **Étapes** : Ranald, « Embobiner » sur `foe` ; dans le panneau divin, bouton **Test imposé : Embobiner**, sujet `Ennemi`, `d100` = `98` (échec), valider ; refaire sur un contexte neuf avec `d100` = `3` (réussite).
- **Attendu** : Test de **Calme −2 DR** annoncé ; journal « Ennemi · Embobiner … : raté (n DR) » avec l'échec, la cible obéit au prêtre (couche portée par la cible) ; réussite : « réussi (n DR) », aucune issue appliquée. Aucun dé tiré par l'outil. Un seul ↶ défait l'issue.
- **Preuves** : `R-51-echec.png`, `R-51-reussite.png`.

#### R-52 · Test imposé : Effrayer l'Ennemi (Myrmidia)
- **Étapes** : « Effrayer l'Ennemi » sur `foe`, **Test imposé** avec `d100` = `98`, puis refaire avec `3`.
- **Attendu** : échec : l'ennemi reçoit **Brisé** puis **Peur (1)** ; réussite : Peur sans Brisé ; le même ennemi ne teste qu'une fois ; un allié est refusé comme sujet ; un seul ↶.
- **Preuves** : `R-52-echec.png`, `R-52-reussite.png`.

#### R-53 · Test imposé : Engourdissement, marqueur « Actions défensives seulement »
- **Étapes** : Ulric, « Engourdissement » sur `foe`, `d100` = `98` (échec d'un Test d'Endurance +0), puis ↶, puis `3`.
- **Attendu** : échec : la fiche de `foe` montre un marqueur « Actions défensives seulement » (lié au Tour perdu, cause divine), levé à la fin du Tour suivant de la cible ; ↶ l'efface ; réussite : aucun marqueur.
- **Preuves** : `R-53-marqueur.png`.

#### R-54 · Zone : Paix de Taal (présence désignée par le MJ)
- **Étapes** : Taal, « Paix de Taal » (zone). Dans le panneau divin, la zone apparaît avec « présence désignée par le MJ » ; cocher `Ennemi` puis **Enregistrer la présence : Paix de Taal** ; décocher et réenregistrer ; ↶.
- **Attendu** : la présence enregistrée est affichée sur la fiche de l'ennemi ; la décocher la retire ; ↶ annule chaque enregistrement. Le texte de la zone indique son rayon en **m** (yards = mètres).
- **Preuves** : `R-54-zone.png`.

#### R-55 · Zone : Frisson du givre (« Froid de la gelée blanche ») : perte d'Élan en début de Round
- **Préconditions** : `foe` avec `hasMomentum = true` ; prêtre d'Ulric avec Élan.
- **Étapes** : Ulric, « Frisson du givre » (contrat `divine:miracle:ulric:hoarfrost-s-chill`), présence : `Ennemi` **et** le prêtre. Terminer le Round (huit **Tour suivant** puis fenêtre de fin de Round, **Confirmer les effets**).
- **Attendu** : au début du Round 2, `foe` **perd son Élan** ; le prêtre ne le perd pas (exclu même s'il est coché) ; ligne de journal ; ↶ du changement de Round rend l'Élan.
- **Preuves** : `R-55-elan.png`, états avant/après.

#### R-56 · Transfert de Dégâts : Martyr
- **Préconditions** : prêtre de Shallya E 30, Soc 40 (BE 3, BSoc 4), hp 20 ; allié `ward` (PJ, hp 20) ; `foe` CC 60. Avec une attaque de mêlée de `foe` sur `ward` : attaque (base 60) jet `25`, défense (base 30) jet `80`, arme à 5 Dégâts. Référence sans miracle : noter les Dégâts bruts D de l'aperçu ; `ward` perdrait D − 3.
- **Étapes** : « Martyr » sur `ward` (durée 4 Rounds), puis la même attaque.
- **Attendu** : `ward` ne perd **aucune** Blessure (20/20) ; le prêtre perd `D − 7` (BE 3 + BSoc 4, **sans PA**) ; journal nommant le Martyr et les deux ; ↶ unique rend les deux ; prêtre à 0 : Blessures plafonnées à 0, pas de mort posée et rappel du Critique. Après l'échéance, le coup frappe de nouveau `ward`.
- **Preuves** : `R-56-martyr.png`, extrait du journal.

#### R-57 · Transfert : Retour à l'envoyeur
- **Étapes** : Ranald, « Retour à l'envoyeur » entre `ward` (plus faible) et `foe` (plus fort), comparés sur CC, F, E. `foe` frappe `ward` ; ensuite `ward` frappe `foe` et le blesse.
- **Attendu** : les Blessures de l'attaque du plus fort sont **ajoutées d'office** à la prochaine attaque du plus faible qui blesse le plus fort ; ligne de journal ; ↶ annule.
- **Preuves** : `R-57-echo.png`.

#### R-58 · Épée de justice : PA ignorés, Inconscient verrouillé
- **Étapes** : Verena, « Épée de justice » sur le prêtre ; `foe` armure 3 à toutes les zones (`armor:{head:3,body:3,arms:3,legs:3}`), attaque du prêtre (`20` contre `90`). Comparer les Dégâts appliqués avec et sans le miracle (même attaque, même état). Si l'issue pose Inconscient : lire la durée « BSoc Rounds » puis terminer la prière.
- **Attendu** : armure **et bouclier** ignorés sur la cible principale : écart **exactement égal à la protection** (3) ; Inconscient posé avec durée BSoc Rounds et verrouillé ; le verrou tombe quand le MJ termine la prière. Rappel du Péché attribué à la main.
- **Preuves** : `R-58-avec.png`, `R-58-sans.png`.

#### R-59 · Vindicte vengeresse : relance gratuite d'un Test de Mêlée raté
- **Étapes** : Myrmidia, « Vindicte vengeresse » sur le prêtre. (a) Attaque de mêlée **ratée** : attaque `90` ; (b) attaque de mêlée **réussie** : `20` ; (c) un Test à distance raté (action `type:'attack'` CT) ; (d) une opposition de mêlée **perdue** par le prêtre en défense.
- **Attendu** : (a) l'interface propose une **relance gratuite** (libellé contenant « relance ») ; (b) rien ; (c) rien (mêlée seulement) ; (d) relance proposée pour l'opposition perdue. La relance est consommée à l'usage ; ↶ la rend.
- **Preuves** : `R-59-relance.png`.

#### R-60 · Compteur : Vaincre les impies (Haine +2, le prêtre compte parmi les alliés)
- **Étapes** : Sigmar, « Vaincre les impies » ; un allié (ou le prêtre) tue un ennemi visé ; consulter le compteur.
- **Attendu** : après la mort d'un ennemi visé, un bénéfice de **+2** de Haine est compté ; le prêtre compte parmi les alliés ; l'état s'affiche sur le participant concerné ; ↶ rend le compteur. (Compteurs voisins : « Revirement de fortune » Handrich, « Forcer la main du hasard » Ranald : boutons « Dépenser : … » et « Jet de 1d10 : … » du panneau, avec d10 saisi.)
- **Preuves** : `R-60-compteur.png`.

#### R-61 · Temps suspendu : Lumière de stase
- **Étapes** : Solkan, « Lumière de stase » sur `foe` portant des États à expiration (Hémorragique, Sonné) ; avancer d'un Round.
- **Attendu** : tant que dure le miracle, les États, pertes et expirations de `foe` sont **figés** (aucune expiration, aucune perte au Round) ; ils reprennent à la fin ; ↶ annule.
- **Preuves** : états de `foe` avant/après le Round.

#### R-62 · En bon ordre : dispense du Test de Désengagement ; Apaisez les vents
- **Étapes** : (a) Myrmidia, « En Bon Ordre » (`divine:miracle:en-bon-ordre`) sur l'allié engagé avec `foe` ; tenter le **Désengagement** de l'allié. (b) Solkan, « Apaisez les vents » (zone), présence = `foe` lanceur de sorts ; tenter une Incantation puis une Focalisation de `foe` ; sortir `foe` de la zone.
- **Attendu** : (a) le Désengagement est **dispensé de Test** (pas de demande de jet) ; le rappel mentionne la dispense. (b) Incantation et Focalisation **échouent** dans la zone ; ses sorts en cours sont suspendus ; rétablis à la sortie de la zone ou à la fin de la prière.
- **Preuves** : `R-62-bon-ordre.png`, `R-62-vents.png`.

#### R-63 · Mots-clés des fiches : types inconnus et cibles inconnues
- **Préconditions** : `fakeFiches` ; PJ `Caelel` comme en R-26 ; fiche = `ficheCaelel()` avec `motsCles`.
- **Étapes** : trois fiches successives, à chaque fois **⋯** → **Mettre à jour les PJ** : (1) `motsCles:[{ id:'haine', cible:'Orcs' }]` ; (2) `motsCles:[{ id:'type-inconnu', cible:'Orcs' }]` ; (3) `motsCles:[{ id:'haine', cible:'ZZZ-inconnu' }]`.
- **Attendu** : (1) aucun avertissement de mot-clé, le type « Haine » est lu ; (2) avertissement « Type de mot-clé « type-inconnu » inconnu de l’outil (fiche plus récente ?) : ligne ignorée. » ; (3) avertissement « Cible de mot-clé « ZZZ-inconnu » inconnue de l’outil (fiche plus récente ?) : gardée, sans effet tant qu’elle n’est pas reconnue. ». Types valides : `haine`, `animosite`, `prejuge`, `sans-peur`. L'absence de `motsCles` sur une fiche ne bloque rien.
- **Preuves** : `R-63-avertissement-type.png`, `R-63-avertissement-cible.png`.

### Partie J · Map Display depuis le 09/11 (hors scénarios déjà couverts)

#### R-64 · Pion lié : contrôles grisés, liaison à un PJ, à poser / posé
- **Étapes** : carte avec un pion PJ libre (`createToken({ id:'pj-token', levelId:'a', kind:'pc', cell:{a:1,b:1}, label:'Wren' })`, sans `link`) ; outil avec le personnage persistant `pc-recette`. Sur `gm.html` : onglet **Pions**, sélectionner le pion (`setSelection`), section « Pion sélectionné », liste « Lier à un PJ de l’outil MJ » (`#token-mj-link`) : choisir `Wren`. Puis, côté outil, ajouter un PNJ au combat : l'indicateur de l'outil (`#map-link-pending`) passe à « À poser (1) » ; le poser sur la carte (`place`).
- **Attendu** : après la liaison, les contrôles des champs gérés par l'outil (nom, type, taille, vitesse…) sont **grisés** avec la mention « géré par l'outil MJ » ; PV, états et image viennent de l'outil ; « À poser (1) » apparaît dans l'outil puis disparaît une fois le pion posé ; la **position** reste gérée par la carte (l'outil ne la déplace jamais).
- **Preuves** : `R-64-lien.png`, `R-64-a-poser.png`.

#### R-65 · Rechargement de la carte pendant la liaison (test A13)
- **Étapes** : outil + carte reliés avec trois pions posés ; **recharger** `gm.html` (`gm.reload()`), puis attendre ; relire l'indicateur de l'outil ; relire les pions. Répéter le rechargement deux fois de suite rapidement. Fermer l'onglet de la carte pendant 20 s (indicateur à « Carte déconnectée » après environ 15 s), le rouvrir.
- **Attendu** : à chaque rechargement la carte réémet son salut, l'outil répond avec l'instantané complet ; les pions retrouvent PV, image et états ; aucune erreur de contexte détruit ; indicateur « Carte connectée » → « Carte déconnectée » (après 15 s sans battement) → « Carte connectée » à la réouverture ; les effets manqués ne sont pas rejoués (voulu).
- **Preuves** : `R-65-reconnexion.png`, relevé des états de l'indicateur.

#### R-66 · Tablette et projection (Galaxy Tab, TV)
- **Verdict attendu : `à faire par le MJ`** (rendu sur la tablette castée, fluidité, lisibilité du palier Bond violet à distance, aucun drag de pion côté joueurs).

### Partie K · Parcours de combat complet, de bout en bout

#### R-67 · Combat enchaînant Traits, miracle, carte, retours arrière
- **Objectif** : un combat court passe par la carte, un miracle de zone, des Traits calculés, la mort d'Increvable, les ↶ et un rechargement, sans incohérence entre l'outil et la carte.
- **Préconditions** :
  - Carte : `sid = 'r67-'+Date.now()`, niveau 12 × 8.
  - Outil : `loadCombat` avec, dans l'ordre d'Initiative, `hilda` (PJ, initiative 70, prêtresse d'Ulric : fiche de `priest('Ulric')` du §2.5, E 30, Soc 40, 20/20 PV, **Élan**), `acid` (ennemi 50, `[{name:'Sang corrosif'}]`, `hasMomentum:true`), `inst` (ennemi 40, `[{name:'Instable'}]`), `stup` (ennemi 30, `[{name:'Stupide'}]`), `horse` (PJ 10, M 6, `[{name:'Bond'}]`), `sent` (PJ 1, `hasMomentum:true`). Engagements `hilda–acid`, `hilda–inst`, `sent–inst`. Id `p:<id>` pour chaque participant.
- **Étapes** :
  1. **Carte** : attendre « À poser (6) » côté outil ; poser les six pions (`place`, cases `{a:1..6,b:2}`) ; capture de la carte et de l'outil. Contrôler `hp` des pions (20/20, `health = 'unharmed'`).
  2. **Bond** : sélectionner `horse` sur la carte (`setSelection`), capture du palier violet, `bondCells = 24`.
  3. **Miracle** : au Tour de `hilda`, lancer « Frisson du givre » (méthode §2.5) avec présence `acid` et `stup` (pas le prêtre). Journal et fiches.
  4. **Blessure et Traits** : `hilda` attaque `acid` (attaque `20`, défense `90`), figer d10 à 10, **Lancer d10**, **Appliquer** : Acide 13, Hilda 13. Observer la carte : barre de santé / PV de `hilda` et `acid` mis à jour, `health = 'wounded'`.
  5. **Fin de Round** : sept **Tour suivant**, puis fenêtre de fin : `stup` « guidé ? » = `Non`, d100 figé à 100 sur « Stupide · Intelligence », **Confirmer les effets**. Attendre le Round 2.
  6. **Vérifications Round 2** : `inst` 18 PV (Instable), `stup` « Tour perdu », `acid` et `stup` ont **perdu leur Élan** (Frisson du givre), `hilda` garde le sien ; la carte montre les PV de `inst` et de `hilda` à jour.
  7. **Retours arrière** : **↶** répété jusqu'à Round 1 et PV 20/20 partout, un seul ↶ pour le bloc blessure + Sang corrosif ; vérifier la carte à chaque palier (PV remis, `health = 'unharmed'` quand 20/20). Puis **↷** jusqu'au Round 2. 
  8. **Rechargement** : recharger l'outil puis la carte ; l'état, l'indicateur et les pions se retrouvent.
  9. **Fin** : menu **⋯** → **Terminer le combat** : la fenêtre « garder ou archiver » ne propose pas Hilda si elle est liée à une fiche ; **Annuler**.
- **Attendu** : chaque étape conforme à son scénario source (R-39, R-40, R-42, R-55, R-65) ; à chaque instant les PV de la carte égalent ceux de l'outil ; aucun pion fantôme ; aucune erreur JavaScript ; aucun hôte externe.
- **Preuves** : une capture **outil** et une capture **carte** par étape (`R-67-e1-outil.png`, `R-67-e1-carte.png`, …), extrait `hp` outil/carte à chaque étape.

#### R-68 · Parcours de retours arrière systématique (↶ / ↷)
- **Objectif** : chaque nouveauté qui écrit une donnée s'annule d'un seul geste.
- **Étapes** : pour chacun des cas suivants, noter la révision locale (`Store.getLocalRevision()`), faire l'action, un clic **↶**, vérifier le retour à l'état d'avant (valeur lue), **↷** (menu **⋯** → **Rétablir**) et vérifier le rejeu : ajout d'un Trait optionnel (R-35) ; déclaration d'une monture par la fiche (R-26) ; validation de la poursuite de scène (R-30) ; Test de poursuite en combat (R-29) ; demande de Sang corrosif (R-39) ; bouton **Effrayé** (R-47) ; miracle appliqué (R-51) ; Test imposé (R-53).
- **Attendu** : un clic ↶ par action annulée ; aucun effet partiel ; le journal garde ses lignes (volontairement hors ↶/↷) ; ↷ rejoue le même résultat.
- **Preuves** : tableau action × (avant, après ↶, après ↷).

---

## 4. Gabarit du rapport (`tmp/recette-gemini/RAPPORT.md`)

À remplir par l'agent, en français. Ne pas modifier les identifiants.

```markdown
# Rapport de recette Gemini : outil MJ 3.46.0 à 3.53.0 et Map Display

- Date et heure de début / fin :
- Agent / modèle :
- Outil MJ : version lue (`#btn-version`), commit (`git log -1 --oneline`) :
- Map Display : commit :
- Serveur : `node tools/serve-liaison.mjs 8766` ; port utilisé :
- Navigateur : Edge, version Playwright :
- Réseau externe : aucune requête hors localhost:8766 aboutie (oui / non, détail) :
- Fichiers de l'outil ou de la carte modifiés (doit être « aucun », `git status --short` des deux dépôts) :

## Synthèse
| Verdict | Nombre |
|---|---|
| réussi | |
| échec | |
| bloqué | |
| à faire par le MJ | |

## Résultats par scénario
| ID | Titre | Verdict | Preuve (capture / extrait) | Écart : attendu / obtenu | Méthode (interface / repli Store) | Remarques |
|---|---|---|---|---|---|---|
| R-00 | Contrôle de l'environnement | | | | | |
| R-01 | Livre L27 : montures et Rapace | | | | | |
| … une ligne par scénario jusqu'à R-68 … | | | | | | |

## Anomalies constatées
Une ligne par anomalie, y compris celles observées dans un scénario `réussi` (erreurs JavaScript, 404 inattendus, boîtes natives, libellés différents, débordements).
| N° | Scénario | Gravité (bloquante / majeure / mineure / cosmétique) | Description exacte | Attendu | Obtenu | Reproduction (script ou étapes) | Preuve |
|---|---|---|---|---|---|---|---|

## Scénarios bloqués
| ID | Étape bloquante | Message ou symptôme | Ce qui a été essayé |
|---|---|---|---|

## À faire par le MJ
Rappel des scénarios non tentés (R-06, R-14, R-22, R-28, R-66, plus tout point que l'agent n'a pas pu trancher) et ce qu'il faut regarder.

## Journal technique
Chemin de `resultats.jsonl`, des `console-*.json`, des captures ; commandes lancées.
```

**Fin de recette.** Arrêter le serveur, vérifier `git status --short` dans les deux dépôts (aucun fichier modifié, `tmp/` n'étant pas versionné dans l'outil ; dans la carte, `git status` ne doit rien montrer), puis remettre le rapport.
