# Retours de vérification du catalogue V5 et du lot 5b

14 octobre 2026. Vérification Claude sur une copie : `node --test` 2 156/2 156, dix recettes vertes, aucun test fantôme dans `tmp/`. Miroir `Magie.csv` = snapshot (277 × 7, 0 écart) ; le fichier à coller = différence exacte ancien/nouveau miroir (154 sorts, 232 cellules) ; le classeur `Magie_V5.xlsx` du MJ = miroir, 0 écart. Versions et caches justes ; talents inchangés. Tous les NI justes. Retours 5b corrigés pour l'essentiel ; mutations tuées.

**Après les corrections ci-dessous, régénère le classeur Excel `Magie_V5.xlsx`** (même format que la version actuelle) et le fichier à coller : le MJ reportera la feuille une seule fois, après cette passe.

## À corriger (catalogue et contrats ensemble)

1. **« + » parasite dans la durée** : « (Bonus de Force Mentale) Rounds + » pour Arme aethyrique et Armure aethyrique (V5 p. 242), Bouclier anti-flèches et Pont (p. 243), Envol (p. 244). Le livre V5 dit « Willpower Bonus Rounds », sans « + ». Corriger dans le générateur des contrats et dans le catalogue ; vérifier qu'aucune autre durée ou portée ne porte ce « + ».
2. **Masque de l'Esprit** (HEPG p. 82) : la description garde « Très Difficile (-30) » pour les sorts de lecture : −3 DR, comme le contrat.
3. **« empête »** (HEPG p. 89) : « malus de –30 » aux Tests de Capacité de Tir non converti : −3 DR. Le nom (sans T) reste la clé, inchangé.
4. **Tempête de Flammes** (WoM p. 135) : la durée passe de « Instantané » à « Spécial » sans que la description explique pourquoi ; ajouter « dure jusqu'à dissipation ou jusqu'à l'aube » (ou rétablir Instantané si le terrain ne dure pas : relis la page).
5. **Réplique de Levorg** (WoM p. 77) : durée « 1d10 heures » devenue « Spécial » : rétablir 1d10 heures (champ et description).
6. **Yeux de Volans** (WoM p. 63) : « sauf celles cachées par des vêtements » durcit le « peut encore échapper » de la source ; le Trait Corrompu est omis : aligner sur la page.
7. **Terminologie** : Piège d'Abulla mêle « Empêtré » et « Enchevêtré » (un seul terme : Enchevêtré) ; Ver Grouillant dit « Immobilisé » alors que le contrat applique Enchevêtré ; Colérique et Flamme Inextinguible n'affichent que « heures » comme durée (donner la valeur).
8. **Cosmétique** : « metres » sans accent (Chute, Bouclier anti-flèches) ; « m » abrégé (Destrier d'Ombre) ; abréviations BFM, BI, FM : garder le style des autres descriptions (écrire « Bonus de Force Mentale » etc. si c'est l'usage du catalogue).
9. **Écaille d'acier** : son rappel dit encore « WoM p. 75 : Robe scintillante » ; l'audit et le rapport 5A parlent d'un « possible alias » : sorts distincts (décision du 13 octobre), retirer ces mentions.
10. Notations collées restantes dans les libellés d'options et de faits (~25 contrats : « Calme+0 », « maximum10m », « de{pas} », « Peur1 », « zone2×BFM », « 6pouces », « TerritoireBFM ») : espacer ; étendre le test des mots collés à ces libellés.

## Moteur et tests

11. **Recette cloud rouge** : `tests/lot3-v5-35-cloud-browser.mjs` (l.42) applique Carreau avec `useCadaiRune`, désormais refusé hors Haute Magie (`js/core/v5-magic-high.js:376-381`, H-01). Mettre à jour le test (rune sur un sort de Haute Magie, ou refus attendu) et lancer la recette avec les émulateurs (`tests/run-lot2-v5-25-emulators.ps1`).
12. **Sonde de classement aveugle aux effets de fin de Round** : `measuredSpellState` exclut `spellEffects` ; Blizzard enflammé de Ygethmor (8 + DR, Athlétisme, À Terre chaque fin de Round), Destin de Bjuna, Délivrance de la Mort sont « Rappel » alors que le moteur les applique ; probablement aussi Comète de Cassandora, Bannissement Majeur, « empête ». Mesurer aussi l'état après une vraie fin de Tour. Sang de la Terre : fait de précondition, soins périodiques calculés → revoir.
13. Suivi : « [Texte périmé…] » ligne ~301 ; tableau du rapport 5B (146/60/71) à aligner sur la matrice actuelle.

## Livraison

Tant que la feuille Google n'est pas mise à jour, « Actualiser » dans l'outil réinstalle l'ancien catalogue (version `264062…`). La feuille doit être mise à jour avant la livraison, ou en même temps. Le MJ le fera avec le classeur régénéré.
