# Contrôle des corrections Gemini — 10 octobre 2026

**Corrections réelles, validation globale toujours refusée.** Contrôle ciblé des cinq blocages de la revue précédente, sans modification du code de Gemini. Les **91 tests ciblés** passent ainsi que `tests/browser-magic-v5-smoke.mjs`. La suite globale de 1 007 tests n’a pas été relancée pour cette seconde revue.

## Points désormais vérifiés

- Le panneau de résolution utilise les nouvelles fonctions magiques. La recette clique dans les vrais composants du workspace, vérifie aperçu sans mutation, Focalisation, Carreau, consommation, annulation unique, transformation Jade, temps écoulé et Service Worker hors ligne. La capture mobile est lisible et sans débordement horizontal. Le scénario utilise toutefois une fixture du workspace, pas une campagne réelle.
- Robe scintillante : **NI6, BFM Rounds**. Forme bestiale et Jade : **Endurance minutes**, transformation effective et retour vérifiés par le scénario navigateur. Ces valeurs ne prouvent pas que les 116 profils V5 sont tous corrigés.
- Apothéose Verdoyante : **3 DR de Test + 15 DR de réserve → 18 B** sur un mort admissible. L’expiration de Pensée rapide retire maintenant le bonus et restitue Intelligence 60 au lieu de 80.
- La réserve est consommée avec les effets dans le parcours utilisateur, et une annulation restitue réserve et Blessures. Un aperçu du store devenu périmé après passage de la révision 0 à 1 est refusé, sans dégâts sur la cible.

## Trois blocages restants

### 1. P1 — La preuve d’incantation ne vérifie pas sa réussite

`js/core/v5-spell-contracts.js:953` accepte la présence d’un jet, de DR ou d’un aperçu comme preuve. Le résultat du Test, le NI et la validité de la surpuissance ne sont pas contrôlés par cette preuve. Le résultat transmis par l’interface sous `castResult` n’est pas exploité pour autoriser ou interdire l’application.

Reproduction : caster avec Langue (Magick) 60 et réserve 15, Carreau NI4, jet **99**. `previewCasting` annonce `spellSuccess: false`. Passer ce résultat à `applySpellExecution` avec le jet 99 fait pourtant passer la cible de **30 à 25 B**, sans erreur. La condition de réussite de l’interface évite ce cas dans son scénario courant ; l’API de la commande reste incorrecte.

Attendu : recalculer ou valider un résultat d’incantation lié au lanceur, sort, jet, réserve et révision courante. Un échec consomme la réserve et traite l’incident, mais n’applique aucun effet principal du sort. Vérifier aussi le NI, les dépenses de surpuissance et les critiques ; la simple présence d’un champ ne constitue pas une réussite. Ajouter une reproduction via le store, pas uniquement via un contrôle UI préalable.

### 2. P1 — Les incidents sont perdus dans le lancement réussi

Le parcours de `js/ui/workspace-view.js:1163` envoie `castResult` à `applySpellExecution`. Cette fonction consomme la réserve et applique les effets du contrat, mais n’applique pas l’incident calculé par l’incantation. La fonction séparée de résolution des incidents ne suffit pas à valider ce parcours.

Reproduction selon les mêmes paramètres transmis par l’UI : **jet 22 réussi**, choix Puissance totale, jet d’incident Mineur **15**. `previewCasting` retourne **Distraction**, avec `conditionsGained: ['Surpris']`. Après l’application du contrat, les états du lanceur sont toujours **[]**. Le sort inflige bien ses dégâts, mais sa conséquence magique manque.

Attendu : traiter dans la même commande l’incantation, son incident et les effets critiques choisis, en conservant tous les dés. Les résultats narratifs doivent produire des rappels ; les conséquences calculables doivent être appliquées. Tester le parcours réussi et raté, l’atténuation, les jets secondaires et une annulation complète.

### 3. P1 — Le changement de typage ne complète pas les contrats

`tools/build-v5-spell-contracts.mjs:791` conserve une déduction d’effets depuis les mots du plan. Exemples des lignes 810–848 : « armure » donne +2 PA ; un texte contenant « dégâts », « blessure », « attaque » ou « tempête » donne la formule générique BFM+4 ; des mots de caractéristiques donnent des modificateurs vides. Ce mécanisme contredit l’exigence de contrats explicites, sans parsing automatique de prose.

Reproduction : **Forge de Tarnus** est maintenant annoncé `stat-modifiers`, mais son contrat contient `statModifiers: {}`. L’aperçu est `ready: true`, annonce « Effets appliqués » et ne produit pas le bonus mécanique attendu. L’éventuel attribut de Domaine est une conséquence distincte et ne constitue pas l’implémentation de ce sort. Le catalogue comporte encore **12 entrées `engine-effect`** et **35 `mj-assisted`** ; leur présence ne prouve pas un calcul ou une saisie MJ opérationnels.

Attendu : compléter chaque effet prévu à partir de sa règle contrôlée, avec ses paramètres, conditions, résistances, choix et durées. Pour une entrée non implémentée, annoncer explicitement ce statut et empêcher une application trompeuse. Une saisie MJ doit fournir réellement les données nécessaires. La matrice doit distinguer « effet calculé », « saisie effectivement raccordée », « rappel » et « contrat restant à réaliser », et ne pas qualifier un simple conteneur de moteur complet.

## Nouvelle recette demandée

Ajouter ces trois reproductions aux tests du store et au parcours utilisateur pertinent. Vérifier ensuite les critiques/incidents, le NI, la surpuissance et un échantillon de contrats venant de chaque branche du générateur, puis relancer la suite complète. Les 91 tests et le scénario navigateur actuellement verts n’exercent pas ces défauts.

Aucun code de Gemini n’a été corrigé pendant cette revue. Aucun push ni déploiement. Le rapport précédent est conservé pour suivre les corrections.
