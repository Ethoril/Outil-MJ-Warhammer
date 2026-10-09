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

Décision explicite du MJ le 9 octobre 2026 : aligner cette clause sur le livre, procédure p. 135, et préparer un document des écarts avec Aides de jeu en vue de correction. Le livre p. 127 reprend pourtant la même exemption de Coup ciblé qu’Aides de jeu : c’est une incohérence interne. La p. 135 fait autorité pour cet incrément.

Hors combat, cible ignorant le danger : Test opposé Corps à corps/Résistance avec Avantage de Frappe assommante, sans Coup ciblé. L’outil assiste le Test ; BF Blessures/Inconscient à la victoire, Sonné/alarme à la défaite restent manuels. Aucun critique ou gain d’Élan de combat automatique. Le contrat conserve le texte public épinglé et l’exception approuvée ; une correction publique future exige revalidation. [Audit et propositions](ECARTS_LIVRE_V5_AIDES_DE_JEU.md).
