# Sources et règles divines V5

> **Correction documentaire du 17 octobre 2026 : les neuf sources ont été retrouvées dans Up in Arms p.79.** Elles demandent une adaptation V4/V5; les contrats restent bloqués, avec leur ancien motif dans le registre. Voir [le complément de sources](DIVIN_COMPLEMENT_SOURCES.md). Les nombres de tests ci-dessous décrivent la recette du code inchangé.

## Autorité et preuve

L’autorité retenue est *Livre de base V5 EN v2.pdf*, édition V5 anglaise, SHA-256 `53e84b3d484782279df8d09f67cbaeaeCA58977285cff4c9230ebac28bd2d9de` (64 caractères, normalisé en minuscules dans le contrat). Les pages ci-dessous sont les pages imprimées. Les pages de prières et les tables citées ont été rendues en images et contrôlées visuellement; compétence et talents ont aussi été lus par extraction texte. Les descriptions et contrats sont des résumés français, pas une transcription du livre.

Le livre de base FR fourni est V4; il ne fait pas autorité pour ce chantier V5. Les six entrées du catalogue local correspondant à des miracles V4 ont été comparées à V5 p.224. Le CSV et son snapshot sont épinglés et recopiés dans les contrats comme données de référence locales, sans modification.

## Règles sûres pour le moteur

- **Prière (p.113)** : compétence avancée Prière (Soc). Le test de bénédiction ou de miracle est Intermédiaire (+0 DR). Succès : effet; échec : aucun effet; maladresse : Colère des dieux (p.217). Le prêtre doit pouvoir parler; une intonation faible/sans conviction peut laisser le MJ augmenter la difficulté (p.217).
- **Accès (p.116, 121)** : Béni (Myrmidia) donne accès aux bénédictions du culte; Invocation (Myrmidia) aux miracles du culte. Les miracles doivent être connus. Les contrats réclament une preuve de talent spécialisé et, pour un miracle, une entrée de prière apprise; aucune case booléenne fournie par l’appelant ne vaut preuve.
- **Réussite (p.217)** : une même prière ne peut être active plus d’une fois sur le même personnage; des lancements de cette prière par plusieurs personnes ne cumulent pas leurs bonus.
- **Bénédictions (p.220)** : par tranche de +2 DR, choisir portée +6 yards, +1 cible ou durée +6 rounds; choix répétables. Une durée Instant ne peut pas augmenter. Six bénédictions de Myrmidia sont décrites p.221.
- **Miracles (p.222)** : par tranche de +2 DR, ajouter une fois la valeur initiale de portée, de cibles ou de durée; portée et cible Vous ne peuvent pas être augmentées; durée Instant ne peut pas être augmentée. Les effets supplémentaires par DR ne s’appliquent que s’ils sont explicitement écrits.
- **Péché (p.217–218)** : le MJ détermine les manquements et attribue les Points de Péché; aucun maximum. La Colère se déclenche si le chiffre des unités du jet de Prière est inférieur ou égal au total de Péché, même sur une réussite, ou sur une maladresse. Lancer le d100, ajouter +10 par Péché, appliquer le résultat, puis retirer 1 Péché, minimum zéro (p.218–219). La table du contrat fournit la plage et un rappel français; les sanctions narratives, pénitences et décisions MJ restent un reçu/traitement manuel.
- **Béni / Invocation (p.116, 121)** : incompatibilités et conditions de désapprentissage sont gardées textuellement dans `sourceTalentDescriptions`; les PX et la gestion complète du registre de prières ne sont pas automatisés ici. **Haine sacrée (p.120)** est un rappel manuel : +2 Blessures quand un miracle en inflige, en attente d’un hook de dégâts.

## Bénédictions de Myrmidia (p.221)

Bataille : +10 CC; Conscience : la cible doit réussir un test de Calme Accessible (+2 DR) pour enfreindre un commandement; en cas d’échec, honte et Action non effectuée; Courage : +10 FM; Chance : relancer le prochain test échoué et garder le nouveau jet; Protection : chaque assaillant doit réussir un test de Calme Accessible (+2 DR) pour attaquer la cible, sinon choisir une autre cible/action; Droiture : l’arme est Magique. Les quatre dernières clauses sont actuellement des rappels MJ, car relance, protection et propriété d’arme n’ont pas de hook sûr. Les six bénédictions ont chacune portée 6 yards, cible 1, durée 6 rounds (p.221). Les stat-modifiers sont les seuls effets automatiques parmi ces six.

## Miracles Myrmidia (p.224) et écarts du catalogue

Les six entrées sont Appel à la Fureur (V5 : Frénésie, alors que le CSV V4 indique Haine psychologique), Bouclier de Myrmidia (+1 PA à toutes les localisations; portée Sociabilité en yards, cibles Bonus de Sociabilité — CSV : mètres/Bonus d’Intelligence), Inspirant (Talent Drilled; CSV : Coude-à-coude), Lance de Myrmidia (Damaging et Magique; CSV : Percutante et Magique), Œil de l’aigle (aigle Perception 55, Sens aiguisé (Vue), Vol 80, contrôle/vue du prêtre sans sens/talents propres; CSV décrit un aigle ordinaire), Soleil flamboyant (portée et cible Special; non-Myrmidiens regardant le prêtre reçoivent Aveuglé, +1 par tranche de +2 DR; CSV simplifie en Vous/zone). Aucun CSV ou snapshot n’a été corrigé.

Paramètres contrôlés visuellement p.224 : Bouclier, portée Soc yards / cibles Bonus de Soc / durée Bonus de Soc rounds; Œil, portée Soc yards / cible Vous / durée Bonus de Soc rounds; Appel à la Fureur et Inspirant, portée Vous / zone dans Bonus de Soc yards / durée Bonus de Soc rounds; Lance, Vous/Vous/durée Bonus de Soc rounds; Soleil flamboyant, Special/Special/Instant. Bouclier +1 PA à toutes localisations est encodé; Soleil applique l’état Aveuglé, dont le retrait normal suit la règle de l’état p.185 (un niveau retiré à la fin du tour, sauf cause durable). Les effets narratifs/traits restent manuels.

Les neuf autres lignes des 15 entrées Myrmidia ont leur source V4 retrouvée dans Up in Arms p.79, comme le détaille `DIVIN_COMPLEMENT_SOURCES.md`. Elles restent `blocked` dans le code en attendant l’adaptation; leur statut de provenance historique doit être corrigé par le générateur. Le programme exhaustif et ses 17 livres sont désormais définis dans `DIVIN_PLAN_EXHAUSTIF.md`.

## Périmètre ultérieur

La page V5 p.221 contient 19 bénédictions génériques et les cultes proposent leurs noms propres pour des effets équivalents. Ce premier contrat couvre uniquement les six bénédictions de Myrmidia; l’extension ultérieure aux 19 entrées et aux dix cultes doit avoir une recette et une vérification des noms/effets par culte. Elle ne doit pas être déduite automatiquement du périmètre Myrmidia ni mécanisée sans contrôle source.

## Table de Colère et correction d’audit

Les 31 plages du contrat proviennent des pages V5 p.218–219. Une première rédaction a repris à tort certaines valeurs de la table V4; la comparaison visuelle V5 a corrigé les rangs 01–05, 11–15, 16–20, 26–30, 36–40, 56–60, 71–75 et 81–87. Valeurs déterminantes : 01–05 test de Calme Accessible (+2 DR); 11–15 -1 DR Prière; 16–20 Prière Accessible (+2 DR); 26–30 -1 DR aux compétences associées; 36–40 Endurance Accessible (+2 DR); 56–60 -1 DR à une compétence associée; 71–75 Endurance Difficile (-1 DR); 81–87 Endurance Difficile (-2 DR), échec : Sonné +1 par DR négatif. Relecture visuelle de toute la tranche p.219, 101–151+ : pour 136–140, Béni et Invocation restent perdus jusqu’à deux pénitences, la première restitue Béni, la seconde Invocation. Aucun modificateur V4 ±10/±20 n’est repris.

## État de vérification

- **Lu et contrôlé visuellement** : livre de base V5 anglais, pages imprimées 217–224, notamment tables p.218–219, bénédictions p.221 et miracles p.224; effet de récupération Aveuglé p.185.
- **Lu par extraction texte** : compétence p.113; talents Béni p.116, Haine sacrée p.120, Invocation p.121. Les descriptions exactes des talents locales sont épinglées depuis le snapshot.
- **Généré** : `js/data/v5-divine-contracts.json`; générateur déterministe `tools/build-v5-divine-contracts.mjs`; inventaire `docs/divin/DIVIN_INVENTAIRE.json`. Fingerprint actuel : `sha256:51811fd31b02a3acb1d2c1acd1dbc49730c9364cbcb0ad8ef468d6e6538f987a`. Il est calculé sur tout le payload du registre hors champ `sourceFingerprint` lui-même : manifeste, pins de talents, règles communes de prière, table de Courroux, deltas catalogue et contrats.
- **Exécuté/testé le 17 octobre 2026** : suite ciblée catalogue + crosscheck sources + contrôle indépendant + Store + moteur, 49/49; générateur `--check` deux fois sans réécriture; `git diff --check` sur les fichiers du lot. Le contrôle utilise une fiche réelle avec la clé de caractéristique `soc` en minuscules et vérifie score 90 depuis la valeur courante de la fiche, sans mutation de la base/snapshot. Les anciennes erreurs de fixture (cible absente du Bouclier, échéance absente) ont été corrigées avant cette suite; elles ne sont plus le verdict actuel.
- **Non exécuté ici** : intégration UI/Store en navigateur, résolutions de faits de cible hors tests unitaires, et vérification visuelle d’usage. Relance, protection et qualités d’arme restent des rappels; les règles narratives non structurées ne sont pas appliquées par le moteur.
- **Non vérifié exhaustivement** : suppléments autres qu’Up in Arms, adaptation V5 des neuf miracles Up in Arms, exactitude V5 des autres lignes historiques locales.

## Complément du contrôle final principal

Après les passes de cette note, la recette complète du 2026-10-17T09:48:50.368Z passe à 2308 tests Node, dont 54 tests divins (catalogue 6, sources 6, moteur 14, contrôle 16, Store 12), et 11 commandes vertes. Les nouvelles preuves couvrent aussi les états partagés à l’expiration, le garde de répertoire du générateur et la liaison de l’aperçu confirmé. Les recettes UI, cloud local et hors ligne sont détaillées dans `DIVIN_RAPPORT.md`; le scénario Soleil en navigateur reste un appel Store, pas une recette complète de formulaire. Le résultat 49/49 ci-dessus décrit la passe historique de l’agent sources.
