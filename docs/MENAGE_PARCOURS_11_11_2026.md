# Ménage des parcours navigateur — 11/11/2026

Fusionné dans `main` et publié en 3.46.0 (branche archivée en tag `archive/epic-goodall-210a79`). Constats traités : CAMP-08, COMP-ARBITRAG-03, TESTS-07, TESTS-09, TESTS-10, HYG-12 (partie dépendances). Ont changé : `tests/`, `tools/`, `package.json`, `package-lock.json` et, sur accord du MJ, neuf lignes de `js/ui/workspace.css`.

## État à la fin

- Suite unitaire : verte, 6097 tests `.test.js` et 148 tests `.test.mjs`, 0 échec.
- Parcours navigateur : **160 verts sur 160** lançables, chacun sous 120 s (`node tools/run-browser-journeys.mjs --jobs 4`).
- Plus aucun rouge. Le dernier était un débordement réel de l'interface en mobile, corrigé dans `js/ui/workspace.css` : ce correctif est publié en 3.46.0 (commit 65d3808).

## Ce qui est fait

1. **Parcours de release** (`lot2-v5-25-release-browser`, `lot3-v5-35-release-browser`) : chacun construit son export avant de le vérifier ; l'outil de construction ne garde qu'un export (13 Mo) à la fois. Ils sont maintenant dans la série du lanceur.
2. **Dépendances** : Playwright 1.65.0, fake-indexeddb 6.2.8. Playwright 1.65 refuse de choisir une option désactivée ; cela a révélé que `q6-t10-ecrans` et `q6-t10-magie` choisissaient Obstiné sans séance ouverte (option désactivée depuis 287ad8b, que 1.63 forçait). Leurs états de départ ouvrent maintenant une séance.
3. **Helper partagé** `tests/helpers/static-server.mjs` : serveur statique (`createStaticServer`, `startStaticServer`), table MIME, blocage du réseau externe (`blockExternalNetwork`), évitement des ports que Chromium refuse. 151 parcours et le helper `lot4-ca-app` l'utilisent ; environ 1 950 lignes recopiées retirées. Le blocage réseau est désormais le même partout : seul le serveur local répond (29 parcours ne bloquaient que `https`).
4. **Classement** : `tests/parcours.json` range les 180 fichiers en quatre familles — 32 généraux (dont un socle de 15 à lancer avant publication), 124 tests de lot ou de ticket, 4 doublons probables, 20 hors série (émulateurs Firebase, lanceur, module importé). Le lanceur lit cet index, refuse un fichier non classé, et un test unitaire (`tests/unit/outillage/index-parcours.test.js`) le vérifie en CI.
   - `npm run test:browser-socle` : les 15 parcours du socle.
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

**Non traité** : dépendance à l'horloge (`Date.now()` dans une trentaine de parcours), ports fixes des émulateurs, scripts npm de lots clos (`test:lot2-*`, `test:magic-*`).

## Doublons à arbitrer (aucun supprimé)

| Parcours marqué doublon | Couvert par | Indice |
|---|---|---|
| `lot2-v5-25-release-browser` | `lot3-v5-35-release-browser` | Mêmes vérifications, ligne pour ligne ; lot3 ajoute la magie. Le plus sûr des quatre. |
| `f2-j-review-browser` | `campaign-crossflow-browser` | Même en-tête, même scénario (critique, suivi lié, soin, saut de jours) ; campaign-crossflow passe en plus par l'onglet Campagne. |
| `recette-g-c20-browser` | `recette-g-c17-browser` | Deux copies du squelette de `divin-v5-t5-browser`, une vingtaine de lignes d'écart. À vérifier : l'une des deux, ou les deux, sont peut-être déjà couvertes par T5. |
| `lot2-v5-23-control-browser` | `lot2-v5-23-browser` | Contrôle du même lot 2.3 ; recouvrement partiel, le moins sûr. |

Pour en retirer un : supprimer le fichier et sa ligne dans `tests/parcours.json`. Pour le garder : passer sa famille à `ticket`.

Écartés après lecture (structure commune, vérifications différentes) : `f2-j` / `f2-j2`, `f2-c-ui` / `f2-c-workspace`, `lot3-v5-relecture2-ui` / `-history` (hypothèses de l'audit), `recette-g-c11` / `c16`, la série `divin-v5-b4` à `b18`.
