# U8 · Spec : moteur d'effets unifié

Cadrage du 05/11/2026, sans code. Point de départ : `docs/PROPOSITION_MOTEUR_EFFETS_UNIFIE.md` (02/11) et `etat-du-code.md` (relevé du code).

## Pourquoi

D'autres suppléments arrivent, *Sea of Claws* d'abord. Aujourd'hui, un talent, une prière et un sort qui font la même chose (« +2 DR à tel Test ») s'écrivent dans trois vocabulaires, et les Traits, qualités, États et montures dans du code dédié. Ajouter un élément de supplément demande donc souvent du JS, et le cumul entre familles dépend du chemin pris. Le relevé du 05/11 a reproduit un écart : deux sorts différents visant le même Test par des clés différentes se cumulent, contrairement à la règle du meilleur bonus (p. 235).

## Ce que le MJ doit constater

### S1 · Les effets se cumulent selon les règles du livre, quelle que soit leur famille
- **CA1** Étant donné deux sorts différents qui donnent chacun +2 au même Test par des clés différentes (« Dur comme le roc » `carac:e`, « Brise-dents » `Endurance`), quand le personnage fait un Test de Résistance, alors seul le meilleur bonus s'applique (+2, pas +4) (R3, p. 235).
- **CA2** Même chose pour les pénalités de sorts : seule la pire s'applique, quelle que soit la clé qui vise le Test (R3).
- **CA3** Les 9 cas de `tests/unit/moteur/cumul-effets.test.js` restent verts sans modification de leurs valeurs attendues.
- **CA4** Un talent, une prière, un sort, un État, une qualité d'arme, une monture et le surnombre appliqués au même Test donnent le résultat fixé par une table de cas validée par le MJ (`questions-mj.md`, Q1 à Q5). Chaque cas de la table est un test.
- **CA5** Un cas de cumul que le livre ne tranche pas et que le MJ n'a pas arbitré est **signalé** au MJ (comme DIV-05 aujourd'hui) ; il n'est jamais additionné ni écarté en silence.

### S2 · Le MJ voit d'où vient chaque modificateur
- **CA6** Dans le détail d'un Test, chaque modificateur affiche sa source (talent, prière, sort, État, qualité, Trait, monture, surnombre, saisie du MJ) et son montant.
- **CA7** [À CLARIFIER : Q9] Un modificateur écarté par une règle de cumul reste visible, barré ou marqué « non cumulé », avec la règle qui l'écarte.

### S3 · Un élément de supplément s'ajoute sans JS s'il n'utilise que des briques connues
- **CA8** Étant donné un talent, une prière et un sort de supplément décrits uniquement avec des briques existantes, quand on les ajoute aux données avec leur test, alors aucun fichier `.js` n'est modifié et leurs tests passent.
- **CA9** Une brique inconnue ou un champ mal formé est refusé au chargement des données avec un message qui nomme l'élément et le champ (comme le validateur des talents aujourd'hui).
- **CA10** La liste des briques disponibles (opérations, événements, conditions, règles de cumul) est documentée en un seul endroit, lisible par un exécutant délégué.

### S4 · Rien ne régresse pendant la transition
- **CA11** Une partie sauvegardée avant le chantier (couches de sorts et de prières en cours, États, montures) se recharge et donne les mêmes résultats de Test, hors cas corrigés par CA1-CA2.
- **CA12** Les talents, prières et sorts existants restent lisibles dans leur format actuel tant qu'ils n'ont pas été migrés.
- **CA13** Chaque lot fusionné laisse verte la suite complète (lancée à la fusion de la vague, règle du 05/11), hors échecs préexistants listés dans la passation.

## Hors périmètre

- Migration complète des sorts : seuls les drapeaux `specialState` partagés par plusieurs sorts deviennent des briques ; les ~76 drapeaux propres à un sort restent du code dédié.
- Effets réellement uniques (Tourbillon, Terreur, Frénésie, psychologie, Petit) : restent du code dédié.
- Performances : aucun gain visé.
- Contenu de *Sea of Claws* lui-même : chantier suivant, qui utilisera ce schéma.
- Interface au-delà du détail des modificateurs d'un Test (S2).
- Le dépôt des fiches (`ennemi-interieur-wfrp4`).
