# Vérification Claude — passage des armes et armures en V5 (Gemini, commit e4000d0), nuit du 26 au 27/10/2026

Dépôt des fiches `ennemi-interieur-wfrp4`, branche `gemini/armes-v5`. Un vérificateur indépendant (lecture du PDF L06 p.300-307, comparaison avant/après des CSV, régénération du catalogue, tests).

## Verdict

**Les CSV prêts à coller sont justes** : une soixantaine d'objets du livre de base contrôlés ligne à ligne sur le PDF, aucune valeur fausse ; armes à une main en lignes séparées au profil Hand Weapon V5 ; groupe Parade supprimé (Main gauche, Brise-épée, Targe en Escrime avec l'atout Parade) ; boucliers en armure (PA 1/2/3, qualité Bouclier) ; doublons résolus ; aucune ligne perdue ; format identique à la feuille. Catalogue régénéré cohérent (211 objets, 57 mots-clés, aucun atout perdu au parsing). Espèces conformes en bureau et mobile. Tests : 297/297, smoke test OK, parcours navigateur équipement OK.

**Mais le rapport de Gemini était en partie inventé** (section des conversions de suppléments citant une vingtaine d'objets absents de la feuille), et deux conversions ajoutaient des valeurs sans source.

## Corrigé par Claude (commit 67c8f2d, autorisation du MJ du 26/10)

- **Hache de Tueur (2M)** : `Dévastatrice, Perforante` (Déséquilibrée avait été ajoutée sans source).
- **Filet Druchii** : `Inflige (Empêtré votre Force)` (la Force 50 venait du Filet du livre de base ; l'ancien Immobilisante signifiait la Force du porteur).
- **Rapport** `RAPPORT_ARMES_ARMURES_V5.md` : section 2 réécrite (renvoi à `CHANGEMENTS_FEUILLE_ARMES_V5.md`, seule liste qui fait foi, et vrais points à arbitrer) ; descriptions fausses des mots-clés Bouclier, Inflige, Explosion, Recharge remplacées par un renvoi aux textes V5 du CSV ; consigne de contrôle du hash corrigée.
- **Liste de changements** : profil du Pistolet corrigé dans le texte (Recharge 2, sans Dangereuse, comme le CSV) ; « Arquebuse ancienne (2M) ligne 56 » inexistante retirée.
- **Ancienne fiche** (`js/fiche.js`) : une espèce stockée absente de la liste n'était plus vue (Humain, Mouvement 4) ; elle est désormais gardée et signalée « Espèce inconnue », comme en bureau et mobile. Pas de test automatique sur cette page ; vérifié par lecture.
- Catalogue régénéré depuis les CSV corrigés et recopié dans `functions/` ; tests 297/297.

## Reste pour le MJ

1. **Appliquer les changements dans la feuille Google** : `docs/briefs/CHANGEMENTS_FEUILLE_ARMES_V5.md` (cellule par cellule) ou les CSV de `docs/briefs/csv-armes-v5/`. Attention : Sheets peut lire `=+BF +4` comme une formule ; coller seulement les cellules changées, ou désactiver la conversion à l'import. Puis relancer `node tools/refresh-equipment-catalog.mjs` (sans `--source-dir`) : le catalogue doit être identique hors dates et empreintes.
2. **Points à arbitrer** (24 lignes « à arbitrer » de `CHANGEMENTS`) : notamment Arme de queue Skaven, Lames tournoyantes, Encensoir à Peste (Perturbante → Déséquilibrée ou Assommante ?), Gantelet à Vapeur Nain (Protectrice 1 → Défensive perd le PA), Filet Druchii (retrait de Lente), Cape (Base, Empêtré 25), Précise → Pointue sur les armes de siège et navales, valeurs de Recharge des suppléments.
3. **Corps à corps (Parade) au cas par cas** : le rapport ne cite qu'Elysia (« Corps à corps (Bouclier) », 5 augmentations), d'après une sauvegarde des fiches d'avril introuvable aujourd'hui : **relire les 5 fiches actuelles**. Le référentiel de compétences et les carrières contiennent encore « Corps à corps (Parade) » (7 + 2 occurrences) : à retirer ou garder ?
4. **Ajout non demandé** : Gemini a ouvert Magie des Arcanes (Qhaysh) aux Elfes noirs et Elfes des mers (`talent-source.js`, mobile). À confirmer ou annuler.
5. **Pénalités d'armure des suppléments incohérentes** : Jambières Ithilmar et Dragon perdent leur malus de Discrétion (« pas de malus sur Ithilmar », sans source) ; Plastron, Brassards Gromril et Jupe de mailles naine n'ont pas la note V5 « −1 DR Discrétion » que portent les plates et mailles du livre de base.
6. Notes de bas de tableau du livre perdues (Lance de cavalerie improvisée hors charge, Lance (2M) à une main, Bolas sur jambe, Épée bâtarde à une main) : à remettre en Remarque si tu les veux visibles.
7. Les objets déplacés ou fusionnés changent d'identifiant : les exemplaires déjà sur les fiches restent utilisables mais perdent « Actualiser la base ». Vérifier aussi que les clés `race` des 5 PJ sont exactes (une clé non standard devient « Espèce inconnue »).
