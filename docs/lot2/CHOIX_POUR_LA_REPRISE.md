# Arbitrages validés par le MJ

Décisions choisies dans le sélecteur le 9 octobre 2026. Elles font autorité pour la suite du chantier ; ne pas les redemander.

## États donnant des types de pénalité différents

Le MJ choisit par action entre la pénalité de DR et le Désavantage. L’outil présente les possibilités et conserve la décision dans le reçu. Ne pas comparer automatiquement les deux variantes ni additionner implicitement ces pénalités.

Ce comportement est déjà raccordé dans l’étape 2.1.

## Battement et critiques

Battement supprime toutes les Blessures et les conséquences du critique ; seuls ses propres effets s’appliquent. Le raccordement doit donc supprimer les dégâts ordinaires, les Blessures supplémentaires, les États et les autres conséquences du critique remplacé.

Implémenté et éprouvé dans le raccordement local 2.3 : aperçu et application suppriment tout le critique attaquant remplacé, sans demander ses jets. Le critique défensif indépendant reste appliqué. Choix/tailles explicites, échéance à la fin du prochain Tour de l’auteur et annulation sont contrôlés ; voir [le rapport](LOT2_RACCORDEMENT_2_3.md).

## Ressources de Fortune

Le compteur courant appartient à l’outil, par personnage, et est conservé entre les rencontres. Il est initialisé depuis la fiche lorsque le solde courant est connu, ou renseigné par le MJ. Les dépenses sont annulables, sans écriture automatique dans la fiche.

Le raccordement 2.3 emploie l’identité stable du personnage, conserve ressources et usages dans les sauvegardes et la synchronisation de l’outil, et applique dépense et résultat dans une commande atomique. Le lancement, la reprise ou la suppression d’une rencontre ne réinitialisent pas ce solde. Un maximum ou une donnée absente ne constituent pas un solde courant connu.

Implémenté dans le raccordement local 2.3 : compteur depuis la fiche de séance, initialisation explicite, récupération et dépense atomiques, annulation/rechargement/export et document cloud contrôlés. La première association locale PJ explicitement validée et univoque conserve le solde outil déjà dépensé. Un remplacement de fiche ne transfère pas ce solde par hypothèse. Aucune écriture dans la fiche source.

## Frappe assommante : neutralisation silencieuse

Décision explicite du MJ le 9 octobre 2026 : aligner cette clause sur le livre, procédure p. 135, et préparer un document des écarts avec Aides de jeu en vue de correction. Après relecture, le signalement de contradiction est retiré : les deux talents sont distincts et l’Avantage p. 135 n’est pas incompatible avec une exemption de pénalité. Le renvoi au Coup ciblé p. 127 est à clarifier. La procédure p. 135 reste l’autorité retenue pour cet incrément.

Hors combat, cible ignorant le danger : Test opposé Corps à corps/Résistance avec Avantage de Frappe assommante, sans Coup ciblé. L’outil assiste le Test ; BF Blessures/Inconscient à la victoire, Sonné/alarme à la défaite restent manuels. Aucun critique ou gain d’Élan de combat automatique. Le contrat conserve le texte public épinglé et l’exception approuvée ; une correction publique future exige revalidation. [Audit et propositions](ECARTS_LIVRE_V5_AIDES_DE_JEU.md).

## Choix DR ou chiffre des unités

Décision explicite du MJ après le premier audit, le 9 octobre 2026 : lecture littérale du chiffre des unités du jet retenu, **0 reste 0**, sans nouveau tirage. 20 permet donc de retenir 0 DR. Une réussite initiale reste une réussite marginale +0 ; un échec ne devient pas une réussite. Choix séparés pour options conservée et inversée. Cette décision remplace la recommandation antérieure 0→10.

## Petit conservé en homebrew

Toutes les clauses de Petit sont conservées pour la table. Seule modification : le Piétinement coûte **un Élan/Momentum au lieu d’un Avantage V4**. Ne pas migrer les Blessures, la Taille ou les fiches des PJ. Rappel manuel tant que les mécaniques concernées ne sont pas raccordées et éprouvées.

## Corrections de source et signalements retirés

Le MJ a corrigé Ferveur ardente, Saut carpé, Effraction, Attirant et Acrobaties équestres ; Résistance précise les autres Tests avec Avantage « durant la session ». Les sept modifications, Petit compris, ont été relues dans le CSV public. Le quota de réussite automatique de Résistance par séance reste distinct et manuel.

Seigneur de guerre suit la Peur psychologique définie par le livre ; aucun problème de formulation n’est retenu. Les deux frappes ne se contredisent pas. Ces signalements sont retirés du document d’écarts.
