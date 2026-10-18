# Divin V5 — bilan local du premier incrément

> **État de reprise actualisé :** cette note conserve le contexte initial. La provenance des neuf miracles et le rappel de l’aigle sont désormais corrigés; consulter [le rapport de reprise](DIVIN_RAPPORT_REPRISE.md) et [la passation](DIVIN_PASSATION_FENETRE_SUIVANTE.md) pour le code, les compteurs et la recette actuels. Le périmètre exhaustif reste ouvert.

> **Les huit choix de politique ont été reçus du MJ le 17 octobre 2026.** Voir [les décisions et leur ordre de mise en œuvre](DIVIN_DECISIONS_MJ.md). Les lignes ci-dessous décrivent le point de départ et les détails de règles; l’enregistrement des choix ne change pas encore le code.

> **Correction documentaire du 17 octobre 2026 : les neuf sources ont été retrouvées dans Up in Arms p.79.** Elles demandent une adaptation V4/V5; les contrats restaient alors bloqués avec leur ancien motif dans le registre; ce motif a depuis été corrigé par E0, sans débloquer les adaptations. Voir [le complément de sources](DIVIN_COMPLEMENT_SOURCES.md). Les nombres de tests ci-dessous décrivent la recette du code inchangé.

17 octobre 2026. Branche `codex/divin-v5`, worktree `C:/Users/arnot/.codex/worktrees/divin-v5/Outil MJ Warhammer`. Version applicative 3.15.0 conservée. Aucun commit, push, merge, déploiement ou report dans les feuilles publiques.

## Résultat et couverture

Le divin possède désormais un chemin intégré dans Jouer : choisir une prière, renseigner jet et faits, calculer sans mutation, appliquer par commande durable, consulter les prières actives et les terminer avec motif MJ. Péchés, historique, rechargement, Undo/Redo et échéances de combat sont raccordés. Le premier périmètre concerne Myrmidia; il ne termine pas l’ensemble du divin.

| Inventaire | Calcul appliqué | Assisté / rappel | Contrats bloqués pour reprise V4 |
| --- | ---: | ---: | ---: |
| 6 bénédictions | 2 : Bataille, Courage | 4 : Conscience, Chance, Protection, Droiture | 0 |
| 15 miracles locaux | 2 : Bouclier de Myrmidia, Soleil flamboyant | 4 : Appel à la Fureur, Inspirant, Lance de Myrmidia, Œil de l’aigle | 9 |
| 1 talent inventorié | 0 | 1 : Haine sacrée | 0 |
| **22 identités** | **4** | **9, dont 8 prières** | **9** |

Béni et Invocation ne sont pas ajoutés à ce total comme effets : leurs descriptions sont épinglées et leurs acquisitions spécialisées sont vérifiées pour l’accès. Le test emploie la vraie forme `ficheSnapshot`, y compris la compétence Prière `carac:'soc'` et les prières apprises brutes. Une modification temporaire de Soc ajuste le score courant sans altérer la fiche ou son socle.

Les quatre effets calculés modifient réellement CC, FM, PA de toutes les localisations ou l’état Aveuglé. Ils conservent la provenance; expiration/retrait enlèvent leur propre contribution, préservent les dégâts et les autres sources. Le Soleil est instantané : récupération normale d’Aveuglé, sans couche de prière à durée inventée. Les prières assistées enregistrent jet, rappel et suivi temporel quand applicable; leurs talents, traits, relances ou contraintes narratives ne sont pas appliqués automatiquement.

## Sources et règles vérifiées

Le livre V5 anglais a été relu pour les règles communes, la table de Courroux, les bénédictions et les six miracles de base de Myrmidia; tables et paramètres ont été contrôlés visuellement. Le livre FR fourni est V4. Les six écarts locaux sont consignés dans `DIVIN_ECARTS_CATALOGUE.md`; neuf autres miracles ont une source V4 retrouvée dans Up in Arms p.79 et restent bloqués pour adaptation, avec leurs lignes originales conservées. Le catalogue de consultation et les CSV restent inchangés; l’interface signale la divergence lorsqu’elle existe.

Le générateur est l’unique source des contrats et de l’inventaire. L’empreinte couvre tout le payload du registre, notamment règles communes, table et pins des talents : `sha256:51811fd31b02a3acb1d2c1acd1dbc49730c9364cbcb0ad8ef468d6e6538f987a`. Une référence locale rafraîchie qui diverge du pin bloque la prière concernée. Les dés ne sont jamais inventés; le Courroux demande son d100, la ligne canonique calculée et une note du MJ avant le retrait atomique d’un Péché.

## Contrôles et corrections

Trois sous-agents Luna ont développé les sources/contrats, le moteur et les contrôles indépendants. L’agent principal a réalisé le Store, les projections, l’interface, la recette cloud locale et le contrôle final. Plusieurs confrontations ont notamment corrigé :

- des valeurs V4 reprises dans la table V5 et plusieurs effets/paramètres des miracles;
- la lecture des prières réellement importées et de `soc`/`Soc`, les nombres vides/invalides et les cibles manquantes des prières manuelles;
- les aperçus périmés après une modification legacy sans révision, les doubles applications et le refus de sauvegarde; la confirmation est aussi liée au jet, aux choix, aux faits, aux cibles et au résultat effectivement affichés. Une capture modifiée, inconnue ou portant une méthode `toJSON` cliente est refusée; le clone inchangé et la reprise après refus de sauvegarde restent valides;
- la suppression ciblée des états associés à une couche, avec conservation d’un état partagé jusqu’à sa dernière référence;
- la mise en page des faits sur 390 px et la perte de clic causée par le rerendu au blur d’un champ.

Les anciennes preuves rouges sont historiques; les reçus finaux ci-dessous déterminent le verdict actuel. Les tests d’états partagés emploient des couches synthétiques et protègent le mécanisme général; ils ne transforment pas le Soleil Instant en effet temporaire.

## Recette finale

**Recette complète verte au 2026-10-17T09:48:50.368Z : 2 308 / 2 308 tests Node, aucun échec, saut ou test annulé; 11 commandes sur 11.** Commande reproductible depuis le worktree : `npm run test:divine`. Le reçu `tmp/divin/recipe-receipt.json` contient chaque commande, son code de sortie, sa durée et son log.

| Contrôle final | Résultat |
| --- | --- |
| Générateur / tests | `--check` et suite complète; 54 tests divins nouveaux inclus dans le total |
| Interface divine | Quatre configurations, gestes souris Calculer/Appliquer/Terminer, six PA visibles et effectifs; reload puis Undo |
| Régressions navigateur | Smoke, démarrage/migration/cache, magie, combat |
| Cloud local | 7 scénarios à deux clients, IndexedDB natif et émulateurs localhost |
| Paquet hors ligne | 157 fichiers applicatifs et empreintes vérifiés; démarrage bureau/mobile, PWA hors ligne, IndexedDB natif |
| Intégrité | Diff sans erreur de whitespace, sources protégées identiques au socle; manifeste du delta et main propre |

Les scénarios navigateur divins couvrent de vrais clics sur le panneau Jouer pour le Bouclier, les six PA affichés et effectifs, le retrait avec motif, le rechargement/Undo et 1440/390 px en sombre/parchemin. Le scénario Soleil/Courroux en navigateur appelle le Store directement; son formulaire complet n’a pas été éprouvé par gestes. Le reçu est `tmp/divin/ui-receipt.json`. Les captures sont des fixtures synthétiques, sans PJ de campagne.

La recette cloud utilise deux contextes Edge indépendants, IndexedDB natif et les émulateurs Auth/Realtime Database sur localhost, avec transport REST/ETag. Elle couvre propagation, rechargement puis Undo, Redo, conflit hors ligne, expiration reçue par le second client, accusé perdu et refus de double application. Reçu : `tmp/divin/cloud-divine-receipt.json`. Aucun accès à un compte ou une base de production n’est revendiqué.

## Limites et suite

- Huit prières restent manuelles/assistées et Haine sacrée attend son raccordement aux dégâts de miracle. Les neuf sources V4 ont été retrouvées dans Up in Arms p.79; leurs contrats restent bloqués en attente d’adaptation, les métadonnées de provenance ont depuis été corrigées par E0, sans réaliser les adaptations.
- Les décisions DIV-01 à DIV-08 sont dans `DIVIN_ARBITRAGES.md` : unités, horloge d’expiration, cumul divin/magie, conséquences durables du Courroux, conditions d’accès étendues et hooks manquants.
- Sonné, Exténué et Empoisonné suspendent le calcul faute de pénalités raccordées. Avantage/Désavantage et dépense de Chance ne sont pas automatisés. La portée, la visibilité et les conditions de cible sont des faits confirmés par le MJ.
- Les 19 bénédictions génériques et dix cultes ne sont pas tous inventoriés/implémentés. Les autres suppléments n’ont pas été vérifiés exhaustivement.
- La recette mobile utilise une fenêtre de 390 px. Téléphone physique, campagne réelle, cloud de production, mise à jour d’une PWA publiée et fusion restent non vérifiés/non réalisés.
- La copie initiale contient le socle magie non commité. Deux corrections finales de l’autre fenêtre ont ensuite été reprises sans conflit. Le manifeste `tmp/divin/change-manifest.json` distingue le delta divin de cet héritage; une future fusion doit comparer ces fichiers, sans réappliquer aveuglément tout le diff Git du worktree.

## Intégrité et incident local résolu

Le delta divin contient 30 fichiers nouveaux/modifiés, séparés de deux mises à jour finales de la fenêtre magie. Le manifeste conserve leurs SHA-256 et ceux du socle. Le HEAD principal reste `08ce45d24faa1727a8155716ade5f5dcba09efd4`; son statut final est propre.

Un premier appel du générateur depuis le mauvais répertoire a créé un JSON non suivi sur main. L’audit du journal a établi sa provenance; ce seul fichier a été sauvegardé hors du dépôt, son empreinte vérifiée, puis retiré par chemin exact. La copie est `C:/Users/arnot/.codex/visualizations/2026/10/17/01a14914-3101-7b82-acfd-286e9fe5a543/main-generated-divine-recovery.json`. Le générateur refuse désormais tout répertoire courant différent de son propre checkout avant lecture ou écriture; un test négatif couvre ce cas. Aucun fichier suivi de main n’a été modifié.

Pour reprendre : lire `DIVIN_PLAN.md`, ce rapport, les arbitrages, puis relancer la recette après toute modification du code. Aucun automatisme bloqué ne doit être débloqué par un simple booléen de confirmation client.
