# Tri des 43 anciens échecs de tests navigateur (06/11)

Base : `dev/recette-plateau-04-11` (ee73011). Chaque test lancé seul sous `timeout 120`, jamais deux en parallèle. Le code de production n'a pas été modifié.
Bilan : **1 régression de code (a) qui explique 24 tests**, 12 tests obsolètes (b) mis à jour, 4 dépendances externes (c), 0 test à retirer (d).

## (a) Régression : la barre du haut déborde à 390 px — 24 tests

**Cause.** `4865cce` (05/11) ajoute le bloc `.topbar-tools` (Temps de campagne, Événements / Jauges, Rappels, `white-space: nowrap`) et `802df64` (05/11) le voyant `#map-link-indicator`. La règle mobile de `MJ.css` (`@media (max-width: 600px)`, grille à 4 colonnes) n'a pas été adaptée. À 390 px, `scrollWidth` vaut 611 au lieu de 390 ; les boutons Bibliothèque / Annuler sortent de l'écran. Mesuré : sans `.topbar-tools` le débordement tombe à 546, sans les deux il disparaît.

**Correctif proposé (non appliqué)** : 1 ligne dans `MJ.css`, patch dans le dossier de notes (`css-barre-haut-390.patch`) :

```css
@media (max-width: 600px) { .topbar-tools { grid-column: 1 / -1; flex-wrap: wrap; } .map-link-indicator { grid-column: 1 / -1; } }
```

Avec ce patch posé temporairement, ces tests passent : `divin-v5-b10`, `b11`, `b13`, `b14` à `b18`, `b2-elf-cults`, `b3-damage`, `b4-states`, `b5` à `b8`, `brise-flee-sprint`, `campaign-browser`, `p4c` (88 s), `t5`, `wrath-browser`, `wrath-conditions`, `wrath-lessons`, `fiches-pj-browser`, `lot3-v5-relecture2-history`. (Pour `p4c`, `t5`, `wrath-conditions`, `wrath-lessons`, vérifié avec une première variante qui masquait `.topbar-tools`, pas avec le patch final ; `b13`, `brise` et `fiches-pj` avaient en plus besoin des corrections (b) ci-dessous.)
**À décider par le MJ** : appliquer ce correctif (ou un autre agencement mobile de la barre). Sans lui, `b13`, `brise-flee-sprint` et `fiches-pj-browser` restent rouges même après mise à jour.

## (b) Tests obsolètes, mis à jour — 12 tests

| Test | Cause | Correction |
|---|---|---|
| `f2-n-grappling`, `lot2-v5-keyword-control`, `lot2-v5-remaining-talents`, `divin-v5-b13`, `brise-flee-sprint`, `fiches-pj-browser`, `f2-b-combat-actions`, `lot3-v5-magic-2b-ui` | `bc02876` (U6, 05/11) : le bloc Circonstances est un onglet du panneau latéral, hors de `.workspace-resolution` | sélecteurs élargis au tiroir (`.workspace-resolution, .workspace-resolution-drawer`), ou à `.workspace-play-grid` quand l'assertion lit le texte |
| `f2-c-state` | la ligne de détail s'écrit « imprecise (Qualité) : −1 DR » | regex tolérante |
| `browser-offline`, `lot1-pwa-sessions` | `d17639e` : `index.html` n'enregistre plus le service worker sur localhost / 127.0.0.1 (le test attendait indéfiniment un contrôleur) ; `browser-offline` dépassait donc 120 s | `addInitScript` qui enregistre `sw.js` à la place de la page, comme `browser-magic-v5-smoke` |
| `lot1-pwa-sessions` (2ᵉ cause) | `88a096c` ajoute le mot-clé Barrakul : 58 mots-clés de repli au lieu de 57 | 57 → 58 |
| `divin-v5-e3-e4-form` | le bloc « Accès à la prière » est déjà ouvert ; le clic sur son résumé le refermait | n'ouvre que s'il est fermé |

État après correction, sans le patch CSS : verts `browser-offline` (9 s), `f2-b` (12 s), `f2-c` (5 s), `f2-n` (23 s), `lot1-pwa` (5 s), `keyword-control` (20 s), `remaining-talents` (20 s), `e3-e4` (5 s), `magic-2b-ui` (103 s : proche de la limite de 120 s, à surveiller). Avec le patch CSS : `b13`, `brise`, `fiches-pj` verts aussi.
Limite : `.workspace-play-grid` couvre aussi le journal et les règles ; une assertion « n'affiche pas X » est donc plus stricte, une assertion « affiche X » un peu moins précise.

## (c) Dépendances externes — à signaler, non réparées

- `lot3-v5-35-cloud` : émulateur Firebase absent (`ECONNREFUSED 127.0.0.1:19000`). Se lance par `npm run test:magic-cloud`.
- `lot2-v5-25-release`, `lot3-v5-35-release` : lisent `tmp/lot2-25/release-path.json` / `tmp/lot3/release-path.json`, produits par `tools/build-lot2-local-release.mjs` et `build-lot3-local-release.mjs` (`npm run build:magic-local`). Absent d'un worktree neuf.
- `lot2-v5-25-browser-runner` : enchaîne dix tests, dont `lot2-v5-23-browser`, qui échoue pour la même raison U6 que le groupe (b) (hors de ma liste, non touché). Il passera quand le 23 sera mis à jour.

## (d) À retirer

Aucun.

## Reste à décider par le MJ

1. Appliquer le correctif de la barre du haut sur mobile (24 tests en dépendent).
2. Mettre à jour `lot2-v5-23-browser` (même cause U6) pour débloquer le runner `lot2-v5-25`.
3. Les tests (c) ne sont verts que sur une machine qui a les émulateurs et le `tmp/` généré : décider si on les sort de la suite par défaut.
