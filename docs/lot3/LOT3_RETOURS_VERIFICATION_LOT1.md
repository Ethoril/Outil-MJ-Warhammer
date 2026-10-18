# Retours de vérification du lot 1 (Domaines V5) — à traiter avec le lot 2

12 octobre 2026. Vérification Claude sur une copie : `node --test` 1 451/1 451, cinq recettes navigateur vertes, deux générations identiques, matrice 110/145/22 confirmée, NI des 68 sorts corrects, valeurs du tableau « catalogue en contradiction » conformes au livre, 8 sorts « conformes » sondés à fond sans écart. Reste à corriger :

## Décisions du MJ du 12 octobre (voir [cadrage](LOT3_CADRAGE_MAGIE.md))

- **DR des effets** : tout effet « +DR » / « par DR » lit le DR final (Test + réserve consommée, avant surpuissance). Aujourd'hui la sonde prend le DR du Test seul (Cautérisation 1+DR, Purification +DR Enflammé…). À corriger pour tous les sorts concernés, tous lots confondus.
- **Catalogue** : les descriptions contredites seront remplacées par la V5 à la fin des lots ; continue à noter les contradictions dans ton rapport de lot (tableau), ne modifie pas le snapshot.
- **Clauses assistées** : reçus/rappels chiffrés, pas de compteurs dédiés.

## Problèmes confirmés

1. **(Haute) Bloc « Clause d'un sort actif » inutilisable sans aperçu préalable** (Mur de Feu, Miasme mystifiant, Doppelgänger, Linceul d'Invisibilité…) : `js/ui/v5-spell-options.js:92` appelle `handlers.input('magicInteraction', …)` et `js/ui/workspace-view.js:963` ne re-rend que si un aperçu, une comparaison ou une erreur existe ; « Traversée ou effet déclenché », localisation d100 et Protection d10 n'apparaissent qu'après « Calculer ». La recette `tests/lot3-v5-domaines-ui-browser.mjs` est un faux vert : son harnais re-rend à chaque saisie. Corriger (`handlers.select` pour effet, destinataire et clause, ou re-rendu pour `magicInteraction`) et faire passer la recette par la vraie `workspace-view`.
2. **(Moyenne) Caresse de Laniph** : cible non plafonnée (`target: "Spécial"`, `maxTargets` null ; p. 247 « 1 (maximum) ») ; deux cibles perdent chacune 12 B et 6 Bmax. Override `target` dans le générateur (~l.1811). Aperçu `targetNewMaxHp` (28) différent du reçu (34) : aligner.
3. **(Moyenne à basse) Portée/cible/durée différentes de la page** (générateur ~l.1800-1830, overrides manquants) : Maudit (portée Initiative yards, p. 249) ; Eau de la terre (portée FM yards, p. 250 : la surpuissance de portée doit être offerte) ; Lumière aveuglante (portée Vous, p. 251 : retirer la surpuissance de portée et la 2e cible acceptée) ; Arme enchantée (1 yard, p. 253 : surpuissance de portée possible) ; Vol du Destin (zone BFM yards, p. 246). Cosmétiques : Épée Enflammée « 1 épée », Grands Feux « 1 (maximum) + », Fléau « Démon ».
4. **(Moyenne) Objet désigné en texte libre** (Épée Enflammée de Rhuin, Arme enchantée, Creuset de Chamon) : `objectId` saisi dans un `<input type=text>`, non validé ; un id inexistant est accepté et le bonus ne s'applique jamais, sans message (`v5-spell-contracts.js:1993`, `v5-magic-combat.js:48`). Remplacer par un sélecteur des armes/objets de la cible et refuser un id absent.
5. **(Basse) Destrier d'Ombre** : cible « 1 » non plafonnée (deux cibles créent deux destriers) ; la monture est retirée au début du Round d'échéance (`v5-magic-turn.js:19`, `round >= summonedUntilRound`) alors que la couche expire à la fin du tour de l'auteur (D-12) : aligner sur D-12.
6. **(Basse) Lance d'Ambre** : `naturalArmorAp` non borné à l'armure de base ; avec armure 3 et couche magique +2, il ignore aussi la couche magique. **Bannissement** : « Instable » affiché deux fois pendant la couche instantanée.
7. **Clarté d'esprit** (`v5-combat-rules.js:157`, `v5-magic-talents.js:69`) neutralise aussi les pénalités de Critiques à la Tête, d'Exténué et de tout état sur les Tests Int/I/FM/Soc ; la page ne cite que Sonné, mutations mentales et psychologie : revenir au texte.

## Glissements vers « données MJ » à revoir

Le classement vient de `computeCoverageCategory` (`assistedClauses` ou `facts` non vides → données MJ). Pour 8 des 13 sorts, aucun fait ne bloque l'aperçu : c'est un rappel renommé. Un sort n'est « données MJ » que si un fait saisi par le MJ conditionne réellement le calcul ; sinon « calculable » (+ rappel affiché) ou « rappel ».

- **Bannissement** : injustifié, la clause E < FM est calculée → calculable.
- **Linceul d'Invisibilité** : l'attaque de la cible invisible est un événement que le moteur voit (aujourd'hui la couche reste active après une attaque) → mettre fin à l'effet automatiquement ; seul « bruit fort » reste au MJ.
- **Cœurs enflammés** : proposer le Test de Frénésie par allié (mécanisme), pas une donnée MJ.
- **Ironie du Destin, Maudit** : rappels (décision « clauses assistées »), pas données MJ.
- Revoir les quatre autres glissements non bloquants avec la même règle.

## Preuves

`LOT3_SUIVI_EXHAUSTIF_MAGIE.*` et `LOT3_PREUVES_CONTRATS_LOT1.json` n'ont pas de générateur versionné : ajoute dans `tools/` le script qui les produit (ou documente la commande), pour qu'ils soient reproductibles. Les tests par sort sont minces (`verifySpell` générique) et l'expiration se teste souvent en forçant `state.combat.round` : pour le lot 2, utilise la vraie fin de tour.

## Réponse locale du 12 octobre — intégrée avec le Lot 2

Les points ci-dessus restent le diagnostic daté du vérificateur. Ils ont été traités dans [le rapport Lot 2](LOT3_RAPPORT_CONTRATS_LOT2.md) et `tests/lot3-v5-retours-lot1.test.js` : DR final pour tous les lots, plafonds/paramètres, objets réels validés, monture liée à la couche, PA naturels bornés, Instable unique, Clarté restreinte, fin automatique de l’invisibilité sur attaques d’arme et magique, Frénésie facultative par allié et classement des rappels.

La recette Domaines emploie maintenant la vraie `initWorkspaceView` : cinq clauses actives et leurs contrôles apparaissent sans aperçu préalable. Les 48 contrats du Lot 2 ont une recette Store/persistance/Undo et de vrais Tours ; horloge publique avant le Tour final pour les longues durées, sans `combat.round` forcé. Reproduction versionnée : `node tools/build-lot3-contract-evidence.mjs`. Les limites de la recette historique Lot 1 restent signalées dans le suivi ; elles ne sont pas rebaptisées validation par des Tours successifs.
