# Contrôle indépendant du raccordement 2.3

Contrôle du 9 octobre 2026, dans le worktree `lot2-combat-v5`, branche locale `codex/lot2-talents-v5`, reprise vérifiée depuis `a1af528`. Aucun push, fusion dans main ni déploiement. Les scénarios de recette et captures sont synthétiques.

## Contrôles acquis

`tests/lot2-v5-23-control.test.js` contient **21 tests indépendants réussis, zéro échec**. Ce contrôle porte sur les commandes Store réelles, et complète les suites pures et recettes des développeurs.

- L’attaque supplémentaire paie Élan avant de calculer l’inversion et les dégâts. Coup puissant reçoit +1 après cette dépense, +2 avec Avantage net, et +1 lorsque ses sources d’Avantage et Désavantage s’annulent. Un rang supérieur ne multiplie pas ces bonus fixes.
- Un Élan regagné par victoire ne permet pas un second paiement au même Tour, y compris après rechargement. Une exemption ne consomme pas le quota système de paiement, mais conserve le quota distinct du talent.
- Coût, quota, dégâts et révision sont confirmés par une commande durable unique. Une simulation ne dépense rien avant confirmation ; l’application répétée est refusée. L’annulation restaure ressources, usages, PV et Élan ensemble. Le journal local est volontairement conservé hors annulation, selon le contrat préexistant du Store.
- Un rejet du disque ou une révision périmée conserve toutes les données de partie et l’annulation. Le scénario du disque produit volontairement une erreur de sauvegarde dans la console du test.
- Fortune appartient à l’identité stable du personnage. Deux personnages de même nom restent distincts. Suspension, autre rencontre, suppression de la rencontre initiale, rechargement, export/import et sérialisation du document cloud conservent les soldes. Le solde reste inconnu malgré un cache de participant, un maximum ou Destin.
- La première association explicitement validée d’un profil PJ local vers sa fiche conserve la Fortune déjà dépensée, sa provenance et toutes ses copies dans les scènes active et suspendue. L’annulation rétablit l’identité locale ; un refresh de la fiche ne recharge pas le solde. Un remplacement par une autre fiche garde un personnage distinct et ne transfère pas ce solde par hypothèse.
- La purge d’une rencontre retire ses actions et quotas, y compris des copies d’historique, et ne touche pas au registre Fortune. Annuler la suppression ne ressuscite pas ces usages purgés.
- Mâchoires d’acier réduit Sonné 1 à 0, consomme son premier usage et conserve Élan si aucun autre motif ne le retire. Le niveau proposé 0 ne consomme pas cet usage. Les libellés Sonné et Stunned sont éprouvés ; annulation, rétablissement et rechargement conservent le quota.
- Une attaque payante qui déclenche Mâchoires d’acier conserve simultanément le quota du coût et celui de la cible. Le problème d’écrasement du registre par la composition des transactions a été corrigé, puis éprouvé par ce scénario.
- Battement supprime dégâts ordinaires, excédent et tout le critique remplacé, sans demander ses jets. Le critique défensif indépendant reste appliqué à l’attaquant. L’effet interdit une défense de Corps à corps, permet Esquive et accorde Avantage aux attaques de mêlée contre la cible.
- Battement manque de contexte lorsque ses tailles sont inconnues ; refuser la manœuvre conserve une action ordinaire sans exiger les tailles. Une cible plus grande ne reçoit pas l’effet. L’échéance expire à la fin du prochain Tour de l’auteur, distinct de la cible, après sauvegarde/rechargement ou suspension et progression d’une autre rencontre. Annuler l’expiration restaure l’effet.

Commande reproductible :

```text
node --test tests/lot2-v5-23-control.test.js
```

## Sources privées locales et priorités PJ

Aucun service externe ni navigateur distant n’a été consulté. Deux sources privées déjà présentes ont été lues en mémoire uniquement : sauvegarde chiffrée des cinq PJ du **5 octobre 2026 à 06:32:14 UTC**, puis audit local des fiches du **7 octobre 2026 à 12:15:28 UTC**. L’audit contient sept fiches ; le filtre des cinq identités autorisées par l’import de l’outil donne **52 acquisitions, 36 identités de talents et zéro référence non résolue**. L’ensemble des IDs concorde avec celui de la sauvegarde. Aucun PDF, export de fiche, nom de personnage ni solde individuel n’a été ajouté au dépôt.

Ces dates constituent une preuve locale réelle, plus large que la fixture Caelel. Elles ne prouvent pas l’état en ligne du 9 octobre ni une actualisation des snapshots de séance depuis cette date. Les priorités affichées par l’outil doivent toujours être calculées depuis les snapshots effectivement importés.

| Priorité de raccordement mécanique | Preuve agrégée par ID |
| --- | --- |
| Bonus de dégâts | `talent-accurate-shot` et `talent-strike-mighty-blow`, chacun acquis par un PJ avec deux acquisitions historiques |
| Qualité d’arme | `talent-strike-to-stun`, un PJ ; contexte et contrat encore à contractualiser dans le catalogue utile |
| Effet contextuel d’action | `talent-public-speaker`, un PJ |
| Tests conditionnels | `talent-alley-cat`, `talent-cat-tongued`, `talent-fast-hands`, `talent-linguistics`, `talent-master-of-disguise`, `talent-resistant`, `talent-rover`, `talent-scale-sheer-surface`, `talent-strong-minded`, chacun un PJ |
| Valeurs permanentes | `talent-hardy`, `talent-small`, `talent-sturdy`, chacun un PJ ; ne pas ajouter une seconde fois Dur à cuire déjà intégré au maximum de Blessures |
| Aides fréquentes | `talent-read-write` : cinq PJ ; `talent-night-vision` : quatre ; `talent-acute-sense` : trois ; `talent-shadow` : deux |

Les bonus de caractéristiques déjà intégrés aux fiches restent exclus. Les effets de magie/prière restent au lot 3. Mâchoires d’acier et Battement sont des représentants de familles testés sur des fixtures synthétiques ; leur acquisition n’est pas démontrée dans ces cinq snapshots. Le raccordement de quelques contrats ne certifie pas l’automatisation des 206 talents.

La sauvegarde possède cinq champs `chance` sous forme de chaînes numériques non négatives. C’est la sérialisation normale du champ de fiche (`getVal` puis `setVal`), distinct de `destin`. Ces soldes datés ne sont pas copiés dans le dépôt ni initialisés automatiquement à partir de cette sauvegarde ; le raccordement offre une initialisation explicite depuis un solde courant connu de la fiche importée.

## Réaction Assaut féroce

L’opportunité est créée après la confirmation durable d’une touche en Corps à corps. Elle conserve l’ID du résultat source, l’auteur, la cible, l’action et son origine publique. L’interface prépare une action distincte, sans tirer de nouveau dé. Préparer puis quitter cette action ne consomme rien. La commande confirme le coût d’Élan avant de calculer le nouveau jet et consomme simultanément le quota du talent par Round et le quota système de paiement d’attaque supplémentaire par Tour.

Les scénarios Store indépendants refusent une source inconnue, un autre auteur ou adversaire, une arme ou des dégâts modifiés, une horloge expirée, un talent retiré et une empreinte source manquante ou modifiée. Les coûts et quotas client sont remplacés par ceux de l’offre durable. Le regain d’Élan ne permet pas un autre usage du talent au même Round. Une erreur de disque conserve l’offre, les Blessures et le registre ; l’annulation restaure l’opportunité et les quotas. Rechargement, export et document cloud conservent le lien même sans appliedResolutionIds local. Supprimer la rencontre purge ses offres et leurs copies d’historique ; annuler ne les ressuscite pas.

L’acquisition directe d’un État utilise également un identifiant d’événement : le second appel du même événement Sonné est refusé comme doublon, même après consommation de Mâchoires d’acier. Modifier un objet aperçu ou simulation juste après confirmation ne modifie pas la commande déjà capturée.

## Recette indépendante Edge

`tests/lot2-v5-23-control-browser.mjs` a réussi le 9 octobre 2026 en **3,0 secondes**, séparément des autres recettes Edge. Réseau externe bloqué, serveur local et contextes isolés.

- Attaque supplémentaire : cocher le paiement, saisir les jets, constater absence d’inversion liée à Élan et Coup puissant +1, appliquer puis annuler.
- Battement sur téléphone de 390 px : choix et tailles explicites, critique du jet remplacé sans demander ses jets, zéro Blessure appliquée, effet temporaire sur la bonne cible et aucune largeur débordante. La capture synthétique `tmp/lot2-control-ui/battement-mobile.png` a été inspectée visuellement en thème parchemin.
- Fortune : ouvrir le compteur depuis la fiche de séance et initialiser explicitement un solde synthétique. Le défaut de reprise des callbacks Fortune dans la vue a été corrigé avant cette recette.
- Assaut féroce : utiliser l’offre, constater un nouveau formulaire vide avec la même action et la même cible sans nouveau dé ; quitter la préparation sans commande ni dépense ; reprendre, saisir les nouveaux jets et confirmer les quotas de Round et Tour.

Commande reproductible :

```text
node tests/lot2-v5-23-control-browser.mjs
```

## Portée du verdict

Aucun défaut bloquant ne reste dans les scénarios contrôlés ci-dessus. Cette preuve de raccordement concerne les cinq contrats représentatifs et les ressources/usages communs. Elle ne certifie pas encore le catalogue utile complet, les autres réactions, tous les contextes des talents PJ ou la recette de livraison 2.5. Les suites complètes et autres recettes sont consignées séparément par le coordinateur.
