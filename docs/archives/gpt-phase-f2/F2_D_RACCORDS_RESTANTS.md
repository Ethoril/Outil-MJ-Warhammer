# F2-D — raccords restant après la reprise

Ce mémo décrit les écarts entre les calculateurs purs de `js/core/v5-weapon-qualities.js` et les points d’application actuels. Il sert de transfert pendant que `resolution.js`, Store et UI restent partagés avec E/N/I.

## Déjà raccordé ou exposé au flux

- Recharge : tir/révision de l’exemplaire dans `resolution.js`; UI et transactions Undo/Redo/reload via Store; synchronisation du legacy E `reload-progress` vers `reloadState` ajoutée dans mon hunk `resolution.js`.
- Empaleuse : critique projectile + fiche persistée dans résolution; perte de Blessures bloquée par `v5-effects.js`; extraction chirurgicale confirmée ou Test de Guérison validé par Store. Tests couvrent Undo/reload.
- Inflige : état proposé au plan de résolution, affiché/appliqué par le flux de condition.
- À enroulement : opposition de mêlée pénalisée dans `v5-combat-rules.js`.
- Pistolet au contact : le calcul du Test d’attaque omet le Désavantage « cible engagée » si la qualité Pistolet est active; la validation de résolution autorise une opposition Corps à corps explicitement choisie. Elle ne choisit pas automatiquement le Test du défenseur.
- Bouclier : opposition et protection déjà raccordées par le code existant; suite `f2-d-shield-defense` couvre bonus, Défensive, PA et frontières à 2 PA.
- Épée de sport : exception Inoffensive appliquée au calcul des qualités d’arme.

## Calculateurs purs sans raccord complet établi

À confirmer au moment du branchement, sans changer le statut de couverture prématurément : Explosion (cibles MJ et dégâts secondaires atomiques), Rapide (initiative de l’attaque), Taille (PA de l’objet frappé), Parade (deuxième attaque et main secondaire), Piège-lame/Incassable (désarmement, choix de casser, prise), Entaille (dépense d’Élan et Hémorragique), Dispersion, couteau conditionnel, munition Poudre noire, pénalités d’armure, armes naturelles par défaut, et filets (Force/bonus typés, verrou d’arme, sortie cumulant les DR, Filet à crochets dont le dégât reste un input MJ).

## Ordre de raccord proposé

1. Empiler `Rapide`, `Pistolet`, Parade et couteau conditionnel dans le plan d’attaque avant calcul du jet/opposition; tracer quelles qualités ont déjà été retirées par maîtrise C.
2. `Taille` doit obtenir l’identifiant de la pièce d’armure effectivement touchée et persister sa perte de PA dans le reçu atomique de résolution; sans identification exacte, rester unresolved.
3. Explosion/Dispersion doivent consommer seulement les cibles explicitement choisies par le MJ et appliquer toutes les cibles en une mutation Undo-able; aucun calcul de distance.
4. Piège-lame doit être une branche de critique défensif avec choix explicite désarmer/casser/prendre, vérification de taille et Incassable, plus Force Très difficile et DR cumulés pour briser.
5. Filets nécessitent une mutation durable `entangled` et une API de Test de sortie persistante; `previewV5Inflict` seul n’attache pas l’état à une arme ni ne gère les DR consécutifs.
6. Armure et arme naturelle nécessitent provenance d’objets typés; ne pas déduire la catégorie depuis leur nom.

Tests de pure functions ne constituent pas une preuve de couverture système. Ajouter pour chaque raccord un test de résolution, apply, Undo et rechargement de persistance, puis ajuster le registre de mots-clés seulement après validation des frontières.
