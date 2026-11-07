# Passation — chantier F1/F2, 27/10/2026 au soir

Pour la fenêtre suivante (Claude, orchestrateur et contre-vérificateur). Le MJ dit où en est GPT ; ce fichier dit tout le reste. Fichier non commité (copie de travail de `main`).

## Rôles

- **GPT** code F2 dans `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree`, branche `gpt/phase-f2`, avec des sous-agents Luna (code puis vérification), puis sa propre vérification finale, et **s'arrête à la fin de chaque tranche**.
- **Gemini** fait les petites tâches connexes (vérifications documentaires, dépôt des fiches).
- **Claude contre-vérifie chaque livraison** (arbre figé détaché, vérificateurs Sonnet code/régressions + règles relues sur les PDF), **fait lui-même les petites corrections** (test qui échoue sans la correction, suite verte, LF, commit local marqué « (Claude) »), écrit le fichier de contre-vérification que l'exécutant lit avant de continuer, et pose au MJ les vraies décisions. Jamais de push, de fusion ni de changement de version sans le feu vert du MJ.

## État au 27/10, 21 h

### Outil MJ (`gpt/phase-f2`)
- Base : `main` d737c5a (3.26.0) ; `main` a avancé depuis à 8ed9099 (recettes navigateur) : ne pas fusionner sans le MJ.
- **T1 (lots C, A, B) livrée et contre-vérifiée** : commits jusqu'à 9e9b77b (dont reprises T1 bis/ter et corrections Claude). Rapports : `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_T1*.md`.
- **F2-R (référentiel d'armes et armures V5) livré** : de1e553 ; **corrections Claude 5e9c46b** (audit pavois, Filet de mêlée, mains des exemplaires anciens, anciennes actions Parade) ; suite **4 834/4 834**. Rapport : `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_F2R.md` (le cas « synchro bloquée par un objet déplacé » est **abandonné** : le MJ retire ses objets de test).
- **T2 (lots D, E, N, I) en cours chez GPT** selon `tmp/gpt-phase-f2/BRIEF_T2.md` (caractérisations commitées : 8e4c036, c04149f, 36e6b55, 45baf45 ; code non commité au moment de la passation). Fin de T2 = rapport + **conception K2** (format des tables de mutations, sans saisie) + arrêt.
- **Ensuite** : contre-vérifier T2 comme les tranches précédentes (priorités : qualité Bouclier V5 dans `v5ShieldDefense` et Porte-bouclier ; Recharge en **succès** ; pénalités d'armure V5 ; maladresses et incidents de poudre ; empoignade ; critiques et séquelles persistantes, mort jamais sans confirmation du MJ ; rester V5 sur les critiques). Puis faire valider la conception K2 par le MJ, puis T3 (L, G, M, K), conception du module de séquelles (J, module neuf), puis T4 (F, H, J).
- Plan et règles : `docs/plans-gpt/f2/PLAN_F2_LOTS.md` (+ section Exécution de GPT), `F2_LOTS.json`, `docs/plans-gpt/CHOIX_EXECUTANT_PHASE_F2.md` (décisions du MJ en tête). **Arbitrages complets et à jour : `E:/Outil MJ Warhammer/tmp/f1-reperage/ARBITRAGES_25_10.md`** (prime sur le journal brut).
- Recette complète `node tools/run-divine-recipe.mjs` à exécuter en fin de phase ; nouveaux modules sous `js/` à ajouter au précache de `sw.js` à la publication (l'exécutant n'y touche pas).

### Petit lot en attente (outil)
- **Espèces** (`js/core/fiche-sync.js`) : Halfling Mouvement 3 et Blessures avec BF ; Ogre Blessures ×2 ; Gnome (Petit, M 3, sans BF), Elfe noir et Elfe des mers M 5, Skink M 6 ; espèce inconnue signalée. Brief : `tmp/gemini-verifs/BRIEF_CORRECTIONS_ESPECES_ET_COUVERTURE.md` (plus la mise à jour de la couverture des talents). Non fait dans l'outil (F2-R ne l'a pas inclus). Déjà fait côté fiches.

### Dépôt des fiches (`E:/Projet Warhammer Ennemi Intérieur/ennemi-interieur-wfrp4`, branche `gemini/armes-v5`)
- Passage des armes et armures en V5 + espèces : e4000d0 (Gemini), 67c8f2d, 3d0c8df, 1110f23 (Claude). Feuille Google « Aides de jeu » **mise à jour par le MJ** (incident : un import avait effacé tout le classeur, restauré par l'historique ; **ne jamais conseiller « Importer » sans mise en garde**). Catalogue relu identique.
- **Commits ultérieurs non vérifiés par Claude** : a1fdaa2 (actualiser les équipements depuis les aides de jeu), 3124be5 (actualiser les anciens boucliers), fb489c5 (merge « intégrer les fiches V5 et le catalogue de production »). À regarder si le MJ le demande.
- Restent pour le MJ (`tmp/gemini-verifs/VERIFICATION_ARMES_V5.md`) : 24 lignes « à arbitrer » sur les armes de suppléments ; Corps à corps (Parade) au cas par cas (relire les 5 fiches ; la compétence reste dans le référentiel et 2 carrières) ; Qhaysh ouvert aux Elfes noirs et Elfes des mers par Gemini (à confirmer) ; pénalités d'armure des suppléments incohérentes ; notes de bas de tableau du livre perdues.

### Page de choix F1 (`tmp/gpt-phase-f0b-worktree`, branche `gpt/phase-f0b`)
- Vue rapide du paquet et bouton de précochage ajoutés par Claude (`tools/audit/f1-preparation-*`), **non commités**. F1 est terminée (journal final `tmp/f1-reperage/F1-journal-final-25-10.json`).

## Décisions récentes du MJ (rappel, détail dans ARBITRAGES_25_10.md)

V5 partout (Petit homebrew : seul Halfling passé en V5 pour les Blessures) ; « ne pas implanter » ne retire jamais rien ; distances jamais suivies (aides affichées) ; mort au MJ ; armes et armures en V5 (groupe Parade supprimé, boucliers en armure, armes de suppléments et objets V4 conservés et adaptés, armes à une main en lignes séparées) ; spécialité exacte prioritaire ; tout personnage (y compris invoqué ou ajouté directement) a son initiative avant le Round 1 ; à 3 ex aequo, le MJ fixe l'ordre ; Surpris +2 DR en mêlée / +1 au tir ; attaquant À Terre = Désavantage et −1 DR ; malus cumulés ; état monté/démonté durable (futur échange avec RPG Map Display) ; Maniement de deux armes exige une première attaque enregistrée ; bouton « + Actif » gardé ; seuil de Corruption calculé par l'outil ; mutations L06 + L17 converties V5 ; séquelles hors combat = module neuf.

## À rappeler au MJ

- Les changements de calcul des PV et du Mouvement des espèces sont à reporter dans le projet des fiches (fait côté fiches dans `gemini/armes-v5`, à vérifier à la phase H).
- Mots-clés dans les fiches et écriture en retour vers la fiche : phase H. RPG Map Display n'est pas encore au plan (avec H).
- Après F2 : runes naines (conception validée, pas codées), passe de cohérence outil ↔ feuille, recette à la table (G), puis H.

## Message pour la nouvelle fenêtre

```text
Reprends le chantier F2 de l'Outil MJ Warhammer en orchestrateur et contre-vérificateur. Lis d'abord docs/PASSATION_F2_27_10.md (copie de travail de main, E:/Outil MJ Warhammer), puis tmp/f1-reperage/ARBITRAGES_25_10.md. GPT termine la tranche T2 dans tmp/gpt-phase-f2-worktree : dès qu'elle est livrée, contre-vérifie-la (arbre figé, vérificateurs Sonnet code + règles PDF), fais les petites corrections toi-même et écris tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_T2.md.
```
