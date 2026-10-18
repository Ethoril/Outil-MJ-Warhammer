# Divin V5 — décisions reçues du MJ

17 octobre 2026. Réponses explicites aux huit sélecteurs DIV-01 à DIV-08. Elles fixent la direction du chantier local. Leur enregistrement ne signifie pas que le code les applique déjà, ni que les adaptations de chaque clause sont contrôlées/validées. Aucun commit, push, merge, déploiement ou report public n’est autorisé par cette note.

| ID | Choix validé | Conséquence pour le prochain travail |
| --- | --- | --- |
| DIV-01 | Préparer l’adaptation V5 des neuf miracles retrouvés dans Up in Arms p.79, avec écarts documentés et contrôle avant validation. | Sourcer chaque clause V4 et sa correspondance V5; isoler les ambiguïtés, notamment la durée de Sur un Terrain Mortel. Ne pas débloquer en masse les contrats. |
| DIV-02 | Fiche prioritaire, avec dérogation MJ explicite et tracée. | Concevoir une commande locale d’exception avec acteur, culte, prière, motif et portée; l’aperçu et l’application la revalident. Pas de simple booléen d’accès libre ni de modification silencieuse de fiche externe. |
| DIV-03 | Convention de jeu : mêmes valeurs numériques, affichées en mètres. | 6 yards source sont présentés comme 6 mètres de jeu. Conserver la valeur/unité source dans la provenance et déclarer cette convention; aucune conversion métrique physique par 0,9144. Cette convention ne transforme jamais une caractéristique entière en son Bonus. |
| DIV-04 | Automatiser les effets de combat sûrs du Courroux; garder fiction et conséquences permanentes au MJ. | Contrats d’effets précis, dés/faits explicites, application atomique et Annuler. Pénitences, conséquences durables et fiction restent un traitement MJ tracé. |
| DIV-05 | Appliquer les règles établies et proposer un arbitrage MJ tracé pour les cas de cumul indécidables. | Rechercher les règles de cumul communes; les exceptions ont un choix explicite lié à l’aperçu, aux sources et à la situation courante. Aucun cumul implicite. |
| DIV-06 | Une horloge commune sourcée, avec choix MJ seulement pour les exceptions. | Relire les règles de durée et comparer le moteur magie existant; établir une seule transition pour aperçu, application, Tours réels, reload et Undo. Les exceptions restent explicites. |
| DIV-07 | Raccorder la chaîne complète des Tests, avec contrôles et relances. | Inclure pénalités d’États, Avantage/Désavantage et Chance selon règles V5 vérifiées; garantir consommation unique, second jet explicite et persistance/Undo. |
| DIV-08 | Couvrir le livre de base V5 : 19 bénédictions et dix cultes, puis les suppléments. | Inventorier les 19 effets, les 60 associations de bénédictions et les 60 miracles du livre; préparer les contrats/recettes par culte. L’adaptation des neuf miracles supplémentaires se prépare, mais son implémentation vient après la base. |

## Ordre de travail retenu

1. Corriger la provenance des neuf miracles dans le générateur, sans inventer les adaptations encore ambiguës; conserver leur blocage tant que nécessaire.
2. Établir le socle commun : Tests, horloge, unités choisies, droits/exception MJ, cumul et conséquences de Courroux déterministes.
3. Inventorier le livre de base complet et raccorder progressivement les effets des 19 bénédictions et des dix cultes. Les rappels restent identifiés jusqu’à preuve du comportement réel.
4. Compléter les adaptations de suppléments, à commencer par les neuf miracles Myrmidia d’Up in Arms. Chercher les errata/règles d’origine pour les paramètres ambigus.
5. Maintenir plusieurs passes de développement et de contrôle; l’agent principal conserve le contrôle final. Toute publication/fusion reste distincte et différée.

## Questions de détail qui restent ouvertes

- Durée exacte et paramètres de Sur un Terrain Mortel : la source a une ligne de durée erronée; la valeur portée au catalogue n’est pas attestée par cette page.
- Correspondance des bonus de Tests V4 avec la résolution V5 et application des traits/talents temporaires : à établir clause par clause, pas à déduire d’une conversion générale.
- Instant d’expiration commun et interactions de cumul dont la source resterait indécidable : présenter les cas concrets au MJ, conformément aux choix DIV-05/06.

Les choix de politique ci-dessus sont clos; seules leurs déclinaisons de règle encore indécidables restent en arbitrage. Code et catalogue sont inchangés pendant l’explication et l’enregistrement de ces décisions.

## DIV-BROKEN-MIDTURN-01 — Brisé acquis après l’Action du Tour

18 octobre 2026, Europe/Paris. Question présentée : lorsqu’un Courroux donne Brisé après une Prière qui a déjà consommé l’Action du Tour, la source impose fuite/Sprint mais ne précise pas cette acquisition en cours de Tour.

Réponse humaine explicite : « Bloquer ce cas pour une décision MJ explicite à chaque occurrence. »

Conséquence : aucune seconde Action ni report automatique. La situation reste bloquée avec un besoin de décision MJ propre à cette occurrence. Une attestation de visibilité ne vaut pas autorisation d’Action supplémentaire. L’interface et le reçu distinguent cette décision des faits spatiaux et de la simple acquisition de l’État. Cet arbitrage ne clôt pas les autres cas de Brisé ni E6.

## Up in Arms p.79 — arbitrages du 18 octobre 2026

Source des options : [DIVIN_UP_IN_ARMS_ADAPTATIONS.md](DIVIN_UP_IN_ARMS_ADAPTATIONS.md) §6. Les 13 questions sont tranchées par le MJ (option recommandée du document dans chaque cas) :

| Question | Réponse |
| --- | --- |
| 1. Commander la Légion, forme du +10 | +1 DR aux Tests de Commandement (équivalence V5 du +10 V4, tableau de difficulté p.131). |
| 2. Commander la Légion, Tests concernés | Tous les Tests de Commandement du Round liés à un combat armé ; le MJ veille à la pertinence. |
| 3. Effrayer l’Ennemi, qui teste | Tout ennemi qui voit le prêtre au lancement, une fois pendant la durée. |
| 4. Willpower entière ou Bonus | Convention V5 du livre de base : portée en caractéristique entière, zones en Bonus (écart V4 documenté). |
| 5. En Bon Ordre, étendue de l’exemption | Fuite seulement : pas d’Élan ni d’attaque gratuite pour l’adversaire ; le fuyard gagne quand même ses Brisé. |
| 6. Sur un Terrain Mortel, durée non imprimée | Bonus de Volonté en Rounds, marqué « non attesté » dans le contrat. |
| 7. Sur un Terrain Mortel, prêtre et Brisé acquis | Le prêtre est bénéficiaire ; les Brisé déjà acquis restent (seule l’acquisition est empêchée). |
| 8. Attaque Rapide, attaque gratuite | Attaque de Mêlée ordinaire opposée, une fois par Round, Élan normal. |
| 9. Dévotion de la Guerrière, choix de l’ennemi | Un seul ennemi choisi par le prêtre au lancement, pour tous les bénéficiaires. |
| 10. Compétence Martiale, forme du bonus | +10 CC et +10 CT. |
| 11. Vindicte Vengeresse, relance | Chaque Test de Mêlée relançable une fois, le nouveau résultat tient. |
| 12. Vindicte Vengeresse, ennemi impénitent | Le MJ désigne l’ennemi impénitent à chaque scène ; la contrainte s’arrête si aucun n’est en vue ou si le prêtre est Étourdi ou Inconscient. |
| 13. Connaître son Ennemi, informations | Caractéristiques, Traits, compétences, Talents ; les secrets restent gardés par le MJ. |

Les neuf contrats sont raccordés par `docs/divin/sources/miracles/myrmidia-up-in-arms.mjs` (ids du catalogue conservés). Contrôle indépendant des valeurs relues sur la page 79 (18 octobre, lecteur distinct) : aucun écart de valeur, de portée, de cible, de durée ni de page ; deux notes de traçabilité (décision 1 consignée ci-dessus, justification de Dévotion de la Guerrière à reformuler).
