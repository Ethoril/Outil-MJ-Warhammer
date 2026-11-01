# Questions ouvertes — lot 3

- **C13** : un parcours synthétique conserve `true`, puis `false`, puis `undefined` dans le brouillon pour « Tir à bout portant ». Il ne reproduit pas le blocage. Quelle arme et quel texte de blocage étaient affichés ?
- **C17** : le lien du Test de Calme après Calculer ouvre et focalise correctement dans le parcours synthétique ; quelle raison était inerte à la table ? D’autres raisons ne disposent pas de cible explicite et restent à inventorier.
- **C19** : `applyResolution` refuse tout aperçu contenant une entrée `unresolved` ; Protection ajoute cette entrée si le Test de Calme manque. Filtrer uniquement les raisons affichées ne rend donc pas l’action applicable. Il faut décider d’un mécanisme explicite qui respecte la décision du MJ sans inventer une réussite ni modifier silencieusement la règle ; l’instruction du brief demande de signaler cette dépendance.
- **C15** : la sauvegarde fournie se charge ici ; si un autre fichier échoue, conserver celui-ci et le message exact pour reproduction.
- **C20** : le brief indique que les profils de prêtres contiennent `culte`/`cult`, mais aucune de ces clés n’est présente dans `docs/recette/profils-recette-complets.json` ni documentée dans `docs/IMPORT_PROFILS_JSON.md` à la base. Les talents spécialisés indiquent les cultes ; leur reprise dans les exemples et le modèle reste à réaliser et vérifier.
