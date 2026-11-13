# Ménage des parcours navigateur — 11/11/2026

Fusionné dans `main` et publié en 3.46.0 (branche archivée en tag `archive/epic-goodall-210a79`). Constats traités : CAMP-08, COMP-ARBITRAG-03, TESTS-07, TESTS-09, TESTS-10, HYG-12 (partie dépendances). Ont changé : `tests/`, `tools/`, `package.json`, `package-lock.json` et, sur accord du MJ, neuf lignes de `js/ui/workspace.css`.

## État à la fin

- Suite unitaire : verte, 6097 tests `.test.js` et 148 tests `.test.mjs`, 0 échec.
- Parcours navigateur : **160 verts sur 160** lançables, chacun sous 120 s (`node tools/run-browser-journeys.mjs --jobs 4`).
- Plus aucun rouge. Le dernier était un débordement réel de l'interface en mobile, corrigé dans `js/ui/workspace.css` : ce correctif est publié en 3.46.0 (commit 65d3808).

## Ce qui est fait

1. **Parcours de release** (`lot3-v5-35-release-browser` (celui du lot 2.5 a été retiré le 13/11)) : chacun construit son export avant de le vérifier ; l'outil de construction ne garde qu'un export (13 Mo) à la fois. Ils sont maintenant dans la série du lanceur.
2. **Dépendances** : Playwright 1.65.0, fake-indexeddb 6.2.8. Playwright 1.65 refuse de choisir une option désactivée ; cela a révélé que `q6-t10-ecrans` et `q6-t10-magie` choisissaient Obstiné sans séance ouverte (option désactivée depuis 287ad8b, que 1.63 forçait). Leurs états de départ ouvrent maintenant une séance.
3. **Helper partagé** `tests/helpers/static-server.mjs` : serveur statique (`createStaticServer`, `startStaticServer`), table MIME, blocage du réseau externe (`blockExternalNetwork`), évitement des ports que Chromium refuse. 151 parcours et le helper `lot4-ca-app` l'utilisent ; environ 1 950 lignes recopiées retirées. Le blocage réseau est désormais le même partout : seul le serveur local répond (29 parcours ne bloquaient que `https`).
4. **Classement** : `tests/parcours.json` range les 180 fichiers en quatre familles — 32 généraux (dont un socle de 15 à lancer avant publication), 124 tests de lot ou de ticket, 4 doublons probables (arbitrés depuis, voir plus bas), 20 hors série (émulateurs Firebase, lanceur, module importé). Le lanceur lit cet index, refuse un fichier non classé, et un test unitaire (`tests/unit/outillage/index-parcours.test.js`) le vérifie en CI.
   - `npm run test:browser-socle` : les parcours du socle (15 au 11/11, 16 depuis le parcours d'accessibilité du 13/11).
   - `npm run test:browser-general` : les 32 parcours généraux.
   - `npm run test:browser-all` : tout ce qui est lançable ; options `--famille`, `--socle`, `--jobs N`, filtre par nom.
5. **Temporisations** : 10 attentes fixes remplacées par une attente sur condition (engagements-plateau ×4, lot4-c24, lot6-a, lot6-c, pro-q31, pro-q42) ; `fiche-writeback-browser` écoute sur un port libre (plus de conflit avec la recette sur 8766).
6. **En passant** : `lot3-v5-magic-2b-ui` réparé (la liste attendue de Forme bestiale ignorait le libellé « livre V4 » ajouté par ed1d1fd) ; `lot3-v5-wom-ui` réparé (le parcours ne répondait pas à la question d'État ajoutée par Q6 : la cible du Ver Grouillant est Empêtrée, « Résoudre la clause du sort » demande d'abord si le Test implique un mouvement ; la question n'apparaît qu'après un premier clic sur « Résoudre »).

## Ce qui reste

**Correctif d'interface (publié en 3.46.0)**
- `lot2-v5-remaining-talents-browser` signalait un vrai défaut : à 390 px, quand la cible a le talent Petit, le panneau de résolution dépassait la fenêtre de 32 px. Le menu de défense prenait la largeur de son libellé le plus long (294 px) et la grille de `.workspace-resolution-step`, sans colonne déclarée, s'étirait avec lui.
- Corrigé dans `js/ui/workspace.css` : piste `minmax(0, 1fr)` sur `.workspace-resolution-step` et `.workspace-defense`, et `min-width: 0; flex: 0 1 auto` sur le menu d'une ligne de jet. Mesuré après correctif : à 390 px le menu fait 223 px et la page ne défile plus ; à 1440 px il garde ses 294 px, rendu inchangé.

**Parcours restés hors du helper (9)** : serveurs à logique propre — `browser-startup` (sert une ancienne révision par git), `e04-idb-browser`, `lot1-pwa-sessions-browser`, `sw-update-fresh-cache-browser`, `divin-v5-source-browser-independent` — et quatre parcours cloud non relançables sans émulateurs (`divin-v5-cloud-browser`, `divin-v5-p4c-cloud`, `lot2-v5-25-cloud-browser`, `lot3-v5-35-cloud-browser`).

**Attentes fixes non mécaniques (136 appels dans 23 fichiers)**
- `lot3-v5-magic-2b-ui-browser` (63) et `q6-t10-magie-browser` (46) : attentes après chaque geste du panneau de magie. Il faudrait un signal « rendu terminé » exposé par l'interface.
- Vérifications négatives (« rien ne doit se passer ») : `browser-index` ×4, `browser-smoke`, `browser-offline`, `browser-startup`, `u2-preserve-view`, `u6-circonstances-onglet`, `lot3-v5-relecture2-history`, `lot2-v5-keyword-control`, `lot4-c25`. Aucune condition à attendre par nature.
- Délai du produit à laisser passer : `browser-index` (recalcul différé de 200 ms).
- Rendu sans signal observable : `engagements-plateau` ×2, `lot6-a`, `lot4-c43` (focus et défilement), `q6-t10-ecrans`, `divin-v5-brise-flee-sprint`, `lot3-v5-domaines`, `v3-b-combat` ×2.
- Déjà des boucles sur condition (rien à faire) : `divin-v5-p4c`, `divin-v5-t5`, `recette-g-c17`, `recette-g-c20`, `lot1-pwa-sessions`.

**Non traité** : dépendance à l'horloge (`Date.now()` dans une trentaine de parcours), ports fixes des émulateurs, scripts npm de lots clos : retirés le 13/11 (`test:lot2-*`, `test:magic-*`, sauf `build:magic-local`).

## Doublons arbitrés (13/11/2026)

| Parcours | Décision |
|---|---|
| `lot2-v5-25-release-browser` | Retiré (couvert par `lot3-v5-35-release-browser`, vérifié vert). |
| `f2-j-review-browser` | Retiré (couvert par `campaign-crossflow-browser`, vérifié vert). |
| `recette-g-c20-browser` | Gardé, famille `ticket`. |
| `lot2-v5-23-control-browser` | Gardé, famille `ticket`. |

La famille `doublon` de l’index reste disponible, vide.

Écartés après lecture (structure commune, vérifications différentes) : `f2-j` / `f2-j2`, `f2-c-ui` / `f2-c-workspace`, `lot3-v5-relecture2-ui` / `-history` (hypothèses de l'audit), `recette-g-c11` / `c16`, la série `divin-v5-b4` à `b18`.

## Variables d’environnement de `browser-startup` et `boot-client-block-browser`

Ces deux parcours rejouent l’ancienne révision publiée par `git show <révision>:<fichier>`.
- `STARTUP_PREVIOUS_REVISION` : révision de référence (défaut `682d0af`). Elle doit exister dans l’historique local ; sinon le parcours échoue d’emblée avec « Révision de référence introuvable ».
- `GIT_DIR` : lue par git lui-même ; à définir seulement si le dépôt n’est pas celui du dossier courant. Un clone superficiel ou un `GIT_DIR` erroné provoque le même message.

## Parcours d'accessibilité (13/11/2026, COMP-ACCESSIB-10)

`tests/accessibilite-browser.mjs`, famille « general », dans le socle (environ 5 s). Il ouvre l'application réelle à 390 px puis à 1366 px et vérifie, sur Préparer, Jouer (rencontre lancée, panneau de résolution d'une attaque ouvert), le menu ⋯, Campagne et Bibliothèque :
- aucun débordement horizontal : la page ne défile pas en largeur, et aucun élément visible (fixe compris) ne sort de l'écran sans être rogné par un ancêtre ;
- un nom accessible pour chaque bouton, lien, champ, menu, onglet et résumé visible, lu dans l'arbre d'accessibilité de Chromium ;
- pour les fenêtres « Nouvelle rencontre », menu ⋯, « Rappels », « Événements / Jauges », « Temps de campagne », « Terminer le combat » et « Avancer le temps » : le focus entre à l'ouverture et revient à l'élément d'ouverture à la fermeture ; les trois dernières doivent rester modales et Tab n'en sort pas. Les fenêtres d'outil restent non modales (COMP-ACCESSIB-04).

Hors périmètre, par décision du MJ : cibles tactiles de 44 px et raccourcis 1/2/3 sous une fenêtre. Un échec nomme l'écran, la largeur et l'élément. Un défaut connu non corrigé s'inscrit dans `EXCEPTIONS` en tête du fichier, liste qui ne peut que rétrécir (une exception devenue inutile fait échouer le parcours) ; elle est vide à la création.
