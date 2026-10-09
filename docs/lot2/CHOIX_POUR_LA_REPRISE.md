# Trois arbitrages validés par le MJ

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
