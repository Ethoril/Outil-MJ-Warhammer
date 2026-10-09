# Raccordement local 2.3 — talents, ressources et réactions

État du 9 octobre 2026 sur la branche locale `codex/lot2-talents-v5`, repris depuis `a1af528`. Le commit contenant ce dossier inclut ce raccordement et ses tests. Main et le site public restent inchangés ; aucun push, fusion ou déploiement.

## Résultat jouable dans le worktree

L’aperçu, la comparaison des jets, la simulation et la confirmation Store utilisent la même transaction V5. Les coûts sont préparés avant les calculs : une attaque supplémentaire qui paie Élan perd son Avantage avant l’inversion et avant Coup puissant. Préparer ou quitter le formulaire ne dépense rien et ne tire aucun dé. La confirmation durable enregistre ensemble résultat, ressources, usages et révision. Annuler/rétablir restaure ces données ensemble. Un aperçu périmé, une donnée requise ou un échec du disque conserve l’état précédent.

Les quotas distinguent personnage, Tour, Round et rencontre. Le quota système d’un paiement d’Élan pour attaque supplémentaire au même Tour reste consommé après regain d’Élan. Une exemption de coût conserve les quotas propres au talent. Les transactions imbriquées conservent les usages du payeur et de la cible ; elles ne remplacent pas le registre l’une par l’autre. Les commandes capturent leurs entrées avant la file asynchrone et refusent les événements déjà appliqués.

## Cinq contrats actifs

| Talent | Traitement raccordé | Contexte et limite |
| --- | --- | --- |
| Tir précis | +1 Dégât, ou +2 avec visée | Touche à distance ; choix de visée explicite ; bonus fixe, sans multiplication par rang |
| Coup puissant | +2 Dégât avec Avantage net, +1 sinon | Touche avec arme de mêlée ; coûts et annulation Avantage/Désavantage déjà appliqués |
| Mâchoires d’acier | Un Sonné proposé en moins à la première acquisition | Quota par rencontre, consommé même si Sonné 1 devient 0 ; réduction avant acquisition et perte d’Élan |
| Battement | Remplacement complet des dégâts et du critique attaquant par ses effets | Choix explicite, tailles connues et cible de taille au plus égale ; activation en attaque de mêlée |
| Assaut féroce | Offre d’attaque supplémentaire après une touche en Corps à corps | Nouvelle action explicite, même adversaire et arme ; Élan payé avant le jet ; une fois par Round et quota de paiement par Tour |

Les acquisitions normalisées et les IDs stables font autorité, jamais un nom seul. Chaque contrat vérifie la description publique et son empreinte. Une source absente/modifiée, un contrat brouillon ou un talent exclu reste visible comme non automatisé. La couverture distingue ces cas des cinq contrats actifs.

Battement supprime les Blessures ordinaires, l’excédent, les Blessures/États/décès/rappels du critique qu’il remplace ; ses jets ne sont pas demandés. Le critique défensif indépendant reste applicable. La cible ne peut plus s’opposer par Corps à corps, peut Esquiver et donne Avantage aux attaques de mêlée contre elle. L’effet expire à la fin du prochain Tour de l’auteur, distinct de la cible. L’horloge reste celle de la scène, y compris après suspension, autre rencontre et rechargement.

Assaut féroce conserve une offre durable liée au résultat source, au talent et à sa source publique. L’interface ouvre un formulaire distinct avec jets vides. Elle ne joue pas la réaction automatiquement. Une offre expirée, une source inconnue/modifiée, un talent retiré, un autre auteur, adversaire ou arme sont refusés. Le coût et les quotas client sont remplacés par ceux de l’offre. Rechargement, sauvegarde et document cloud préservent son origine.

## Fortune propre au personnage

Le registre courant vit dans les extensions de l’outil et est projeté sur toutes les copies du personnage. L’identité vient de la fiche associée ou d’une identité locale stable ; deux personnages de même nom restent distincts. La réserve, une scène suspendue, une nouvelle rencontre ou la suppression d’une rencontre ne rechargent pas le solde.

La fiche de séance ouvre le compteur. Le MJ initialise explicitement depuis le champ courant Chance de la fiche importée lorsqu’il est connu, ou saisit un solde. Un maximum, Destin, une valeur vide ou un cache de participant ne valent pas solde courant. Modifier ou rafraîchir la fiche ne recharge pas un compteur initialisé. Une récupération par Fortune paie un point uniquement si un effet est réellement retiré, dans la même commande que la récupération ; solde inconnu ou nul bloque la dépense. Initialisation, modification et dépense sont annulables. Aucune commande n’écrit dans la fiche source.

Lors de la première association explicite et univoque d’un profil PJ local à sa fiche, son solde outil déjà dépensé et sa provenance suivent cette identité dans toutes les scènes. L’opération est annulable. Un remplacement de fiche, une association ambiguë ou un registre déjà présent pour la destination ne provoque aucun transfert supposé.

## Persistance et architecture

- `v5-store-action.js` adapte `localRevision/combat.participants` au moteur pur `revision/participants`, prépare l’état payé, fournit l’horloge, compose coûts et usages, puis remet le résultat dans l’enveloppe durable.
- `v5-talents.js` applique les contrats vérifiés, réduit les acquisitions d’États et propose les réactions depuis le résultat final.
- `v5-resources.js` tient le registre Fortune commun aux rencontres et la première association explicite.
- `v5-reactions.js` conserve, valide et expire les opportunités d’attaque.
- Store, journal et interface enregistrent les choix, plans, coûts et reçus. Les nouveaux modules et la fenêtre Fortune sont dans le précache PWA.

Les registres et offres sont conservés dans IndexedDB, export/import et document de synchronisation. Le chemin de stockage local historique conserve aussi les extensions. Supprimer une rencontre purge ses actions, quotas, offres et copies dans l’annulation ; son solde Fortune reste disponible. Annuler peut restaurer la rencontre sans ressusciter les traces purgées. La synchronisation a été éprouvée par sérialisation/commandes locales ; aucune migration ni recette sur un compte cloud réel n’a été effectuée.

## Validation finale

**672/672 tests Node réussis, zéro échec, annulation ou test ignoré.** Le contrôle indépendant ajoute 21 scénarios Store, inclus dans cette suite ; son [rapport](LOT2_CONTROLE_2_3.md) décrit les preuves et limites.

Commandes reproductibles, recettes navigateur exécutées séparément :

```text
npm test
npm run test:lot2-browser
npm run test:lot2-23-browser
node tests/lot2-v5-23-control-browser.mjs
npm run test:startup
npm run test:fiches-browser
```

Les cinq recettes Edge réussissent. Elles couvrent ordinateur/téléphone, thèmes sombre/parchemin, paiement, quotas, Fortune, annulation, Battement, réaction, fiches et démarrage. Le démarrage éprouve le cache réel 3.12.0 → 3.12.3 avec IndexedDB préservée. Captures synthétiques inspectées dans `tmp/`, ignoré par Git. `git diff --check` est conforme. La version applicative reste 3.12.3 : ce chantier est local.

## Suite : catalogue utile 2.4

Le raccordement représentatif 2.3 est réalisé. Cela ne certifie pas tous les effets des 206 talents. Riposte, Frappe réactive, Frappe assommante, tests conditionnels et autres clauses doivent encore être contractualisés et éprouvés avant activation. Toute nouvelle famille mécanique exige son incrément moteur et sa recette.

La priorité vient des snapshots effectivement importés des PJ. Le contrôle indépendant a relu cinq snapshots privés locaux datés des 5 et 7 octobre, avec 52 acquisitions et 36 IDs ; il ne prétend pas vérifier leur état en ligne du 9 octobre. Tir précis et Coup puissant y sont confirmés ; Frappe assommante, Orateur et les tests contextuels figurent dans la suite prioritaire. Mâchoires d’acier/Battement sont éprouvés sur des représentants synthétiques. Les dix bonus de caractéristiques intégrés aux fiches restent exclus ; Dur à cuire ne doit pas être ajouté deux fois. Magie/prières restent au lot 3.

Lire [REPRISE_AGENT.md](REPRISE_AGENT.md) et [PASSATION_PROCHAINE_FENETRE.md](PASSATION_PROCHAINE_FENETRE.md) pour poursuivre. La recette de livraison 2.5 et toute publication nécessitent une étape ultérieure. Aucun PDF ni export privé n’est dans Git ou le ZIP documentaire.
