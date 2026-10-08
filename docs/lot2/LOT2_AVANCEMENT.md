# Avancement local du 9 octobre 2026

Le moteur reste dans la branche `codex/lot2-talents-v5`. Main et le site public ne sont pas modifiés. Le travail reprend le socle 3.12.3 ; il ne constitue pas une nouvelle version publiée.

## Étape 2.1 raccordée

Une chaîne commune V5 résout Tests, oppositions, inversion, dégâts, protections et critiques. Les aperçus des deux choix emploient les mêmes dés et le même résolveur que l'action appliquée. La localisation réelle et les PA peuvent faire préférer conserver 61 (5 Blessures) à inverser en 16 (3 Blessures), malgré les DR supérieurs de l'inversion. Les inconnues empêchent un conseil définitif.

Le choix du défenseur recommande la moindre perte de Blessures subies. Les succès doubles des perdants ou défenseurs peuvent infliger un critique. L'excédent provoque un autre critique à la localisation normale, avec gravité au-delà de 100 si nécessaire. Les PV sont bornés à zéro sans À Terre automatique. Les conditions et l'Élan sont appliqués avec la même commande révisée et annulable.

Les calculs sont repliés. Le journal est compact avec un reçu détaillé/versionné. L'ancien bouton d'attaque ouvre la résolution commune ; le jet rapide générique utilise également le résolveur V5. Les anciens modificateurs de seuil ne deviennent pas silencieusement des DR.

## Étape 2.2 raccordée

Le module d'États est pur et reçoit les jets explicitement. Acquisition, cumul, retrait, récupération et échéances conservent leurs métadonnées. Une occurrence temporaire peut expirer au Tour de son auteur, même portée par une autre cible. L'horloge appartient à la scène ; pause, autre rencontre et reprise ne décalent pas cette échéance.

Enflammé, Hémorragique et Empoisonné agissent à la fin du Round. Si un d10, un Test de survie ou la gravité d'un critique de feu manque, la transition entière attend. Les saisies restent dans la fenêtre entre deux demandes ; un changement concurrent bloque l'application. Les résultats, retraits, Blessures et passage de Tour sont enregistrés ensemble. Les acquisitions sensibles à une échéance reçoivent le Round réel ; une horloge absente reste une donnée requise. Pour un BE nul et le poison, l’échéance de survie doit être précisée plutôt qu’inventée. Un critique exigeant ce contexte par victime reste à arbitrer avant application automatique.

Les récupérations sont proposées selon la condition, avec méthode et contexte explicites. Guérir des Blessures retire autant d'instances Hémorragique réellement guéries ; Empoisonné à zéro peut empêcher la guérison. Sonné peut provoquer Inconscient selon le BE ; Inconscient retire Sonné. Les causes de critiques peuvent verrouiller une récupération. Une dépense de Fortune est confirmée à la table ; son compteur appartient au raccordement des ressources 2.3.

L'édition complète de fiche reste un arbitrage volontaire du MJ ; elle ne doit pas servir de preuve que toutes les récupérations sont automatiques. Les profils en attente d'entrée dans le combat ne reçoivent pas ses effets périodiques de Round. Les durées historiques numériques comptent les Tours de leur porteur jusqu'à modification explicite.

## Règles et source des talents

L'encart dispose de repères Jets, Élan, Critiques et États, d'une recherche des effets des critiques et de tableaux lisibles sur téléphone. Psychologie et Corruption ont aussi été reprises depuis le livre V5. Les aides magiques restantes sont identifiées comme hors de cette validation.

Le CSV Talents publié a été capturé ; 206 IDs conservés, 19 descriptions/empreintes différentes du snapshot précédent. CSV SHA-256 : `935a96f79688a798bb1cc2fc320db78bfe753974fc8263581152ecd1322abd4e`. Le snapshot applicatif et l'inventaire portable sont cohérents. Un vieux cache local ne remplace plus un référentiel livré plus récent. Cette actualisation n'active aucun talent par simple lecture de son texte.

## Validation reproductible

```sh
npm ci
npm test
npm run test:lot2-browser
npm run test:startup
npm run test:fiches-browser
```

Les scripts navigateur utilisent Edge sur Windows, ou `PLAYWRIGHT_EXECUTABLE_PATH` pour un autre Chromium installé. Ils créent des contextes isolés et des données fictives. Les captures locales sont dans `tmp/lot2-ui/` et `tmp/fiches-pj-receipt/`, hors Git. Le test de démarrage éprouve aussi le cache PWA réel et l'absence de perte de données locales après mise à jour.

Recette finale du 9 octobre : **619/619 tests Node réussis, zéro échec ni test ignoré**. Les trois recettes navigateur ci-dessus sont réussies : combat V5 sur ordinateur/téléphone et deux thèmes, démarrage/mise à jour PWA, fiches PJ et synchronisation. Le contrôle indépendant supplémentaire couvre aussi le socle 2.3 et les horloges d’acquisition.

## Suite du chantier

Le socle pur 2.3 est préparé et testé séparément : `LOT2_ETAPE_2_3_SOCLE.md`. Il reste à relier ses coûts, ressources, quotas, choix et échéances à l'action réelle, puis aux contrats source et à leur couverture visible. L'inventaire de 206 talents reste préparatoire ; la priorité des PJ actuels doit venir des snapshots de séance. Réactions, attaques supplémentaires et catalogue complet ne sont pas annoncés actifs.

Après 2.3 : catalogue utile 2.4, puis recette de livraison 2.5. Aucun push, fusion, déploiement ou migration de données privées n'a été effectué.
