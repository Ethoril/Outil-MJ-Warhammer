# Q6 · Inventaire des appels à `previewV5Test` (08/11/2026)

Relevé en lecture seule sur `main` à `5db1628` (3.43.0). O = oui, N = non, P = partiel. Les lignes peuvent bouger : se fier à la fonction englobante.

## Le pivot n'existe pas encore en une seule fonction

Trois assembleurs recopient la même logique :

1. **Combat**, `buildCombatTest` (`js/core/v5-combat-rules.js`, ~193-433), seul chemin complet :
   - talents : `previewV5TalentTestModifiers` (`v5-talent-tests.js`) ;
   - États : `conditionTestRules`, `conditionPenaltyEffects` (avec `ignoreConditionPenalties`, `ignoreFatiguePenalties`, `clarityOfThought`, `talentIgnores`), `conditionDisadvantageRows` (`condition-effects.js`) ;
   - couches de sorts et de prières : `magicTestModifiers` → `collectTestEffects` → `layerTestEffects` + `combineEffects`, plus `miscastEffects` ;
   - clés « … adverse » : `magicAdverseModifiers` ;
   - puis armure, familier, séquelles, plafond `ignoreNegative`, et enfin `previewV5Test`.
2. **Hors combat**, `resolveV5ConditionTestContext` (`v5-test-context.js`) : États seulement (mêmes exceptions), avec `needsInput` et `restrictions`. Ni talents ni couches.
3. **Magie**, `prepareMagicOptions` (`v5-magic-talents.js`, ~58-104) : États recopiés en ligne + couches par `magicSkillModifiers`, sans les talents génériques. Utilisé par le lancer, la Focalisation, la Dissipation et l'aperçu du panneau magique.

`effectiveSkillScore` n'ajoute **aucun** État : il corrige seulement l'écart entre caractéristique courante et de base.

## Tableau

| Où | Test | États | Talents | Couches | Remarque |
|---|---|---|---|---|---|
| `v5-combat-rules.js` `buildCombatTest` (433, 436) | attaque, défense, Test du plateau | O | O | O | pivot |
| `v5-combat-rules.js:203` | « sans Test » automatique | — | — | — | factice, hors périmètre |
| `resolution.js:257`, `:454` | plafond social, Test dérivé | O | O | O | rejouent le pivot |
| `resolution.js:505` | Endurance après Croche-pied monté | N | N | N | Endurance brute |
| `resolution.js:642` | échappée de Filet (Force opposée de la source) | N | N | N | Force brute |
| `resolution.js:1223`, `1242-1243` ; `store.js:2060`, `:2876`, `:5198` | Chevaucher, Désarçonnement, Surpris à cheval, Force opposée | N | N | N | `store.js:2060` double `resolution.js:1223` |
| `store.js:853` `resolvedCorruptionTest` | Test de Corruption | N | N | N | |
| `store.js:4579` | déploiement de rune Cadai | N | N | N | |
| `store/api-v5-combat-actions.js:48` | Guérison : extraction d'un projectile | N | N | N | |
| `engagements.js:216-217` `previewDisengage` | désengagement (opposé) | N | N | N | seuls infériorité numérique et Élan |
| `v5-broken-escape.js:85`, `:102` | fuite du Brisé | O | N | N | |
| `v5-broken-escape.js:146` | poursuite | N | N | N | |
| `v5-aftermath.js:86` | séquelles de convalescence | N | N | N | « score de fiche + d100 saisi » |
| `v5-combat-fumbles.js:146` ; `resolution-panel.js:2845` (aperçu) | recul de l'arquebuse à salve | N | N | N | score saisi à la main |
| `v5-supplemental-equipment.js:88`, `:145` | Warp Blade | N | N | N | score saisi à la main |
| `v5-talent-replacements.js:37` | Déterminé (Calme) | P | N | N | recalcul manuel partiel |
| `v5-divine-engine.js:526` ; `v5-divine-store.js:90`, `:1099` | Prière, Résistance au Courroux | O | N | O | |
| `v5-magic-talents.js:229` | méditation | N | N | P | |
| `v5-magic-casting.js:333`, `v5-magic-channelling.js:290`, `:471` | lancer, Focalisation, pause | O | P | O | talents magiques seulement |
| `v5-magic-channelling.js:548` | interruption de Focalisation (Calme) | P | N | P | perd Avantages et Désavantages |
| `v5-magic-dispel.js:77` | Dissipation | O | P | P | clé `Dissipation` lue en brut |
| `v5-magic-high.js:416` | relance Cadai de Corruption | N | N | N | |
| `v5-magic-arcane-unforgiving.js:38` | Dextérité contre Arcanes impitoyables | N | N | N | |
| `v5-magic-attributes.js:381` | Endurance de Corruption (savoir de Tzeentch) | N | N | N | |
| `v5-magic-turn.js` (~19 appels : 85, 120, 132, 147-148, 153, 158, 174, 181-182, 204, 217, 285, 298, 373, 389, 408, 436, 524) | Tests de sorts au fil des tours, dont Calme contre la mort (285, 298, 436, 524) | N | N | N | `effectiveSkillScore` ou brut |
| `v5-spell-contracts.js` (~11 appels : 1256, 1775, 1787, 1792, 1870, 2162, 2176, 2190, 2220, 2266, 2630) | oppositions lanceur/cible, Souffle, résistances, Cor (Peur), Calme | N | N/P | N | |

## Familles à brancher

- **F1 Désengagement**, seul Test de combat sans États.
- **F2 Monture et chutes** : Chevaucher, Désarçonnement, Surpris à cheval, Croche-pied monté, échappée de Filet (+ suppression du doublon `store.js:2060`).
- **F3 Hors combat** : Corruption, poursuite, séquelles de convalescence, extraction de projectile, rune Cadai, relance Cadai.
- **F4 Magie principale** : ajouter les talents génériques au lancer, à la Focalisation et à la Dissipation ; brancher l'interruption de Focalisation et la méditation.
- **F5 Prière** : ajouter les talents génériques.
- **F6 Tests de sorts au fil des tours et contrats** (~30 appels).
- **F7 Tests à score saisi à la main** : arquebuse à salve, Warp Blade.
- **F8 Déterminé** : remplacer le recalcul manuel par le calcul commun.

## Tests existants

- États pour tous les Tests (Q19) : `tests/unit/moteur/etats-tous-les-tests.test.js`.
- Cumul : `moteur/cumul-familles.test.js`, `moteur/cumul-effets.test.js`, `moteur/effect-engine.test.js`.
- Désengagement : `combat/engagements.test.js`, `combat/engagements-store.test.js`.
- Monture : `combat/empoignade-et-monture.test.js`, `moteur/adaptateurs-montures.test.js`.
- Magie : `magie/lancement-focalisation.test.js`, `magie/incidents-dissipation-haute-magie.test.js`, `magie/traditions-et-invocations.test.js`, `magie/contrats-*.test.js`, `combat/liaison-cause-mort.test.js`.
- Prière : `divin/etats-et-contexte.test.js`, `divin/courroux.test.js`, `divin/brise-et-fuite.test.js`.
- Séquelles : `sequelles/sequelles-mort-critiques.test.js`. Corruption : `corruption/corruption-mutations.test.js`.
- Arquebuse, Warp Blade : `combat/poudre-et-rechargement.test.js`, `combat/equipement-et-supplements.test.js`.
- Déterminé : aucun test.
