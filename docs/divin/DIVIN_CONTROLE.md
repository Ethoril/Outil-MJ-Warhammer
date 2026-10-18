# Contrôle indépendant des prières divines V5

> **Correction documentaire du 17 octobre 2026 : les neuf sources ont été retrouvées dans Up in Arms p.79.** Elles demandent une adaptation V4/V5; les contrats restent bloqués, avec leur ancien motif dans le registre. Voir [le complément de sources](DIVIN_COMPLEMENT_SOURCES.md). Les nombres de tests ci-dessous décrivent la recette du code inchangé.

Cette recette vérifie le chemin V5 de prière sans assimiler une prière à un sort. Elle distingue la résolution du Pray Test, l’application calculable, le rappel MJ et les règles bloquées faute de source ou de contrat. Une extension persistée ou un reçu `applied` ne suffit pas à prouver qu’un effet agit réellement en combat.

## Base de règle relue

Livre de base V5 anglais, pages imprimées 113, 215, 217-224.

- p.113 : Pray (Fel) est la compétence pour invoquer/communier avec une divinité.
- p.215 : les prêtres elfes passent par Wizard/Lore et n’ont ni Blessings ni Miracles; les nains ne prennent pas les carrières Nun/Priest/Warrior Priest pour les Ancestor Gods.
- p.217 : Bless ouvre les bénédictions, Invoke ouvre les Miracles. Les deux utilisent Pray Challenging (+0 SL); succès manifeste, échec n’applique rien, Fumble appelle Courroux. Il faut pouvoir parler et intoner la prière. Une instance de chaque prière par personnage; pas de cumul du même effet entre utilisateurs.
- p.218 : Sin est attribué par le MJ pour des violations de strictures, sans maximum; dé des unités <= Sin déclenche Courroux même sur réussite; le Fumble aussi. Le jet de table ajoute +10 par Sin puis retire 1 Sin après application.
- p.220 : un abus répété dans la scène/sur cible ou blessure peut entraîner 1-3 Sin par décision MJ. Bénédiction: chaque +2 SL choisit +6 yd, +1 cible ou +6 rounds; Instant ne s’étend pas.
- p.222 : Miracle: chaque 2 SL ajoute à la portée, au nombre de cibles ou à la durée la valeur initiale; cible/portée You et Instant ne s’étendent pas. Toucher une cible réticente peut demander un test opposé.

Les décisions MJ restent explicites: attribution des Sin, interprétation des strictures, intonation/difficulté, forme du Courroux si aucun jet de table n’est fourni, faits de scène et clauses narratives.

## Contrôles adversariaux requis

1. Bless/Invoke indépendants, carrière/espèce et affiliation; le seul Pray ne donne pas accès. Source et talent associés à l’acteur revalidés au commit; un `sourceReceipt` modifié par l’appelant ne doit pas créer une autorisation.
2. Rejet de contrat absent, inconnu, périmé ou non V5. La résolution magique ne satisfait pas les prérequis de prière et inversement.
3. Pas de succès/dégâts inventés: Pray, dés, Sin, cible et faits d’effet exigés lorsqu’ils sont nécessaires; champ absent, invalide, hors domaine ou dé manquant => blocage/input requis sans mutation.
4. Test de Sin exact aux frontières `<`, `=`, `>`; l’égalité déclenche Courroux même si Pray réussit. Fumble déclenche également. Une seule résolution de Courroux; +10/Sin puis décrément une fois après résolution. Sans résultat de table choisi/jeté, conserver le cas comme rappel/choix MJ, sans inventer la conséquence.
5. Frontières de SL et choix de portée/cible/durée distincts selon Bénédiction/Miracle. Instant, You, AoE, cibles spéciales, cible illégale, portée hors limite et effets non cumulatifs. Une seule instance active d’une prière pour un acteur.
6. Aucun effet réel annoncé sur la seule base `applied=true`/`divineEffects`: lancer au moins un vrai test d’attaque/dégâts/defense/tour concerné. Pour les hooks absents, rester en rappel/manual.
7. Conservation des effets: PA/dégâts/soins/conditions utilisent les résolveurs existants et leurs règles de TB/armure/localisation; les traits déjà présents gardent leurs sources. Expiration et Undo ne retirent que les couches de la prière.
8. Cycle atomique: révision périmée, deux clics, échec de sauvegarde, reload, Undo, échéance de tour. Aucune double application, effet fantôme, perte d’état voisin ou quota oublié au reload.

## Recette navigateur

Exécuter l’interface avec le harness local Playwright et le Store de test; aucun Firebase/service distant. Parcours à couvrir à 1440×900 et 390×844, en thème sombre et parchemin: ouvrir la section Jouer, choisir l’acteur, ouvrir Prières divines, entrer les champs, calculer puis examiner l’aperçu/reçu et l’état réel. Capturer les erreurs console, assertions de débordement horizontal et captures d’écran. Tester gestes souris et clavier; à 390 px, aucune commande essentielle ne doit être hors écran ou recouverte. Refaire après reload et Undo.

Le navigateur testé doit appeler le chemin Store/UI réel, pas seulement l’API pure. En particulier, vérifier un effet qui devrait agir sur un jet/état réel; sinon documenter explicitement qu’il reste rappel MJ.

## Résultats

Contrôle local du 17 octobre 2026 sur `codex/divin-v5`; aucun commit, push ou déploiement effectué par ce contrôle.

- `node --test tests/divin-v5-control.test.js` : 16/16 réussis. Ces assertions indépendantes couvrent les prérequis Invocation/spécialisation/rang, les lignes et bornes de Courroux V5, les sources EN contre V4, le rejet d’un reçu forgé, l’entrée brute des prières de fiche, le calcul Pray (Soc, avec ajustement courant; FM ignorée), l’égalité unité/Sin, le résultat de Courroux choisi par la table plutôt que par le client, l’idempotence, le Bouclier et le blocage du doublon jusqu’à expiration.
- `node tests/divin-v5-browser.mjs` : réussi sur l’interface Jouer et le Store local persistant. À 1440×900 et 390×844, en sombre et parchemin, `scrollWidth` égale la largeur disponible. À 390 px, le groupe de faits cible et chacun de ses deux champs font 320 px; le libellé Prières actives, le bouton Terminer, le bouton Appliquer désactivé et le jet effacé sont visibles après application.
- Le parcours souris réel applique le Bouclier à un allié : le résolveur de PA renvoie 1 à toutes les localisations (corps = 1). Le clic souris sur Terminer appelle une seule fois la commande Store avec le motif MJ; la couche est retirée, les PA reviennent à 0 et les prières déjà apprises restent dans la fiche. Un jet saisi puis Calculer immédiatement produit bien un aperçu appliquable. Après rechargement, la couche persiste; Undo la retire.
- Le rendu est également vérifié dans la vraie fiche de cible : après application, la silhouette affiche six « 1 » et la piste « PA T1 C1 BD1 BG1 JD1 JG1 »; après Terminer, six « 0 » et « PA — ». Les valeurs viennent du calcul `locationProtection` du combat et n’écrasent pas l’armure physique de la fiche. Avec Soc 80, l’aperçu du Bouclier affiche 80 yards de portée et 8 alliés admissibles.
- Le premier contrôle a reproduit un clic Terminer perdu au blur du champ de raison: un refresh remplaçait le bouton entre le relâchement de souris et l’événement click. Après le correctif UI, le même scénario souris est passé; l’assertion vérifie l’appel unique au Store et la suppression réelle de la couche.
- Le cas Soleil flamboyant prouve que le Store demande le fait non-Myrmidien manquant, puis que `78 + 10 × 1` sélectionne la ligne isolée 88 et retire un Sin après résolution MJ. Ce scénario emploie directement l’adaptateur Store dans le navigateur, pas un geste de formulaire pour Soleil.
- Captures et reçu structuré : `C:\Users\arnot\.codex\visualizations\2026\10\17\01a14914-3101-7b82-acfd-286e9fe5a543\recherche-divin-controle\` et `tmp/divin/ui-receipt.json`.

Cette passe ne certifie pas l’ensemble des clauses ou cultes, ni la sauvegarde en échec, tous les scénarios de conflit/révision périmée, ni l’usage sur téléphone physique. Les neuf miracles ont désormais une source V4 retrouvée dans Up in Arms p.79; leur adaptation et leurs métadonnées de registre restent à reprendre. Fury’s Call, Inspiring, Spear of Myrmidia et Eagle’s Eye demeurent assistés par le MJ; leur acquisition de traits n’est pas automatisée. Aucun contrôle de cette passe ne prouve la préservation d’autres sources lors de l’acquisition d’un trait, l’application de dégâts ou la clôture complète d’un tour. La recette ciblée ne remplace pas la suite complète.

## Divergences vérifiées — six Miracles de Myrmidia

Comparaison directe au CSV français `js/data/reference-source-csv/Miracles.csv` et au Livre de base EN V5 p.224: les six entrées Myrmidia du CSV décrivent des effets V4 et ne peuvent pas servir de contrat V5.

| Miracle V5 (p.224) | Règle EN V5 à contrôler | CSV FR à ne pas reprendre |
|---|---|---|
| Fury’s Call | Alliés dans AoE (Bonus de Fellowship yards) reçoivent le Trait Frenzy. | Haine contre ceux qui les engagent en combat. |
| Shield of Myrmidia | Portée Sociabilité entière en yards; cibles = Bonus de Sociabilité; +1 PA toutes localisations. | Portée Sociabilité mètres; cibles Bonus d’Intelligence. |
| Inspiring | Alliés dans la zone gagnent Talent Drilled. | Talent Coude-à-coude. |
| Spear of Myrmidia | Si lance tenue: qualité Damaging et arme magique. | Qualité Percutante. |
| Eagle’s Eye | Serviteur: Perception 55, Acute Sense (Sight), Fly 80; perception par ses sens, pas ceux du priant. | Aigle normal et capacités non détaillées. |
| Blazing Sun | Portée Special, cible Special; non-Myrmidiens regardant le priant sont Aveuglés; +1 Aveuglé par +2 SL. | Portée Vous, cible Zone d’effet. |

Ces six lignes sont des **Miracles**, pas six bénédictions. Les colonnes FR sont conservées uniquement comme preuve de divergence locale. La source EN V5 autorise un contrat local calculable lorsque ses paramètres et ses hooks sont complets; la divergence du CSV ne force pas le mode manuel et ne justifie pas de recopier les valeurs V4. Aucune correction du CSV/snapshot/catalogue public n’est incluse dans cette recette.

## Contrôle indépendant de la table de Courroux

Vérification visuelle directe des pages imprimées 218–219 (Livre de base V5 EN v2, images rendues):

- 01–05: test de Calme Accessible (+2 DR), échec = 1 Sonné; aucune Résistance +20.
- 11–15, 26–30, 56–60: les pénalités de compétence sont toutes -1 DR.
- 71–75: Endurance Difficile (-1 DR).
- 81–87: Endurance Difficile (-2 DR); en cas d’échec, Sonné et +1 Sonné par -1 DR.
- 88 est une entrée isolée; démon inférieur à 2d10 yards, qui attaque la cible la plus proche.
- Les résultats 100, 101, 150 et 151 appartiennent respectivement aux lignes 96–100, 101–105, 146–150 et 151+.

Le Store doit dériver la ligne de la valeur du d100 de Courroux + 10 × Péché courant. Le `resultId` arbitraire reçu du formulaire ne choisit pas la conséquence. Sans jet ou note explicite du MJ, la prière reste sans commit et sans décrément de Péché. Même une conséquence résolue par le MJ est un reçu/rappel, pas l’application automatique des effets permanents ou fictionnels de la table.

## Risques additionnels à vérifier dans le protocole de résolution

- Si Courroux est dû mais son résultat reste en attente (d100/table/choix MJ absent), l’acteur ne peut pas démarrer une seconde prière qui contourne cette conséquence. L’état pending doit être explicite et être résolu ou annulé sans double commit.
- L’attribution des Sin préalable à la prière est une décision MJ séparée; aucun `sinPoints` libre du client ne doit être persisté comme fait de règle sans commande explicite et reçu. La valeur réellement utilisée pour détecter le seuil et calculer +10 doit être celle confirmée dans le Store à l’application.
- Un `skillScore` envoyé par formulaire ne doit pas supplanter la compétence Pray réelle de l’acteur. Le preview/commit doit revalider la provenance et les valeurs de l’acteur, et refuser une révision périmée.

