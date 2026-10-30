# Brief — corrections espèces et couverture des talents (petit lot, après T1 de F2)

À lancer **après** la clôture de T1 de F2 : `js/core/fiche-sync.js` est modifié par la branche `gpt/phase-f2`. Partir de cette branche (ou de main une fois T1 fusionnée), worktree dédié, LF, `npm ci`. Règles communes : `docs/plans-gpt/REGLES_COMMUNES_GPT.md`. Source : `tmp/gemini-verifs/RAPPORT_ESPECES_ET_COUVERTURE.md`.

## Décisions du MJ (26/10)

1. **Halfling : Mouvement 3** (L06 p.31 et p.319), au lieu de 4 — clés `halfelin` et `halfling`.
2. **Halfling : Blessures en V5** = BF + 2×BE + BFM (+ BE par rang de Dur à cuire) : retirer `halfelin`/`halfling` de `RACES_SANS_BF`. Ce choix ne touche que le calcul des Blessures du Halfling depuis la fiche ; le reste du « Petit » homebrew (Q04) n'est pas modifié par ce lot.
3. **Ogre : Blessures doublées** (Taille Grande, L06 p.361) : (BF + 2×BE + BFM + Dur à cuire) × 2.
4. **Espèces ajoutées** à la table de Mouvement et au calcul des Blessures : Gnome comme un Petit (M 3, Blessures 2×BE + BFM, L24 p.88), Elfe noir M 5 (L09 p.44), Elfe des mers M 5 (L08 p.57, « comme tout Elfe »), Skink M 6 (L07 p.160, Petit). **Une espèce inconnue n'est plus mise à 4 en silence** : l'outil le signale au MJ (valeur à saisir), sans bloquer le reste de l'import.

## Couverture des talents (documentation de données, sans changer de comportement)

Mettre à jour `js/data/v5-talent-coverage.json` et `js/data/v5-magic-talent-coverage.json` selon le rapport : Haine sacrée `magic:0` → automatique ; Béni / Invocation `magic:1` → refléter le moteur divin existant ; Maître à bord → assisté ; Dur à cuire, Grande taille, Petit : descriptions alignées sur les recalculs réels ; Seconde vue et Vision nocturne : effets codés documentés. Vérifier d'abord comment ces JSON sont produits : s'ils sont générés, modifier la source et régénérer, jamais à la main ; garder `--check` vert.

## Acceptation

Tests nouveaux (Halfling M 3 et Blessures avec BF ; Ogre ×2 avec et sans Dur à cuire ; Gnome, Elfe noir, Elfe des mers, Skink ; espèce inconnue signalée) ; aucun test existant modifié sauf ceux qui épinglent les anciennes valeurs Halfling, listés dans le commit ; suite complète verte ; `docs/VARIABLES_PERSISTANTES_PJ.md` inchangé (pas de nouvelle valeur durable). Signaler au MJ que le site des fiches calcule peut-être ces valeurs autrement (à aligner en phase H).

**À reporter dans le projet des fiches (ennemi-interieur-wfrp4)** : ces changements de calcul des Blessures et du Mouvement doivent être appliqués aussi au site des fiches (demande du MJ du 26/10).
