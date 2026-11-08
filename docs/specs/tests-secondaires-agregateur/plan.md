# Q6 · Plan

Lire d'abord `spec.md` et `inventaire.md`.

## Approche

Q19 demande « un seul calcul, celui du combat ». Aujourd'hui, le calcul complet n'existe que dans `buildCombatTest`, et deux copies partielles circulent (`resolveV5ConditionTestContext`, `prepareMagicOptions`). On ne réécrit donc pas un quatrième assembleur. On **extrait** de `buildCombatTest` la partie États + talents + couches dans une fonction unique, `buildCombatTest` l'appelle, puis chaque famille de Tests secondaires l'appelle à son tour.

```
resolveV5TestModifiers(actor, test, context) → {
  slModifiers, advantageSources, disadvantageSources,   // prêts pour previewV5Test
  rows,                                                 // détail affiché : source, montant, écarté (Q9)
  needsInput, restrictions                              // précisions à demander au MJ (CA8)
}
// test = { characteristic, skill?, kind, role?, opponent? }
```

- Les règles de cumul ne changent pas : la fonction appelle les briques existantes (`conditionTestRules`, `conditionPenaltyEffects`, `conditionDisadvantageRows`, `previewV5TalentTestModifiers`, `magicTestModifiers` → `collectTestEffects`, `magicAdverseModifiers`).
- Les modificateurs propres au combat (armure, familier, séquelles, plafond `ignoreNegative`, Tourbillon) restent dans `buildCombatTest`. L0 dit, preuve à l'appui, lesquels relèvent du calcul commun.
- `resolveV5ConditionTestContext` et `prepareMagicOptions` gardent leur signature, mais délèguent leur partie États (et couches pour la magie) à la fonction commune. Les tests de `moteur/etats-tous-les-tests.test.js` servent de filet.
- Un Test opposé appelle la fonction pour chaque camp (CA3). Un opposant qui n'est pas un participant (créature de sort, source d'un Filet sans fiche) n'a ni États ni couches : il garde son score.
- Les modificateurs déjà saisis par le MJ ou propres au Test (infériorité numérique, Élan, `slModifiers` d'un sort) sont ajoutés **en plus** (CA4, Q12).
- `needsInput` : on réutilise le mécanisme par lequel le panneau de résolution demande aujourd'hui une précision pour le Test principal (L0 le localise). Un Test lancé par l'outil qui reçoit un `needsInput` non vide n'est pas résolu : il reste en attente avec la question (CA8).
- Les scores saisis (CA12) passent par la même fonction ; seul le libellé du champ change.

## Fichiers

- Créé : `js/core/v5-test-modifiers.js` (la fonction commune), `tests/unit/moteur/tests-secondaires-agregateur.test.js` (équivalence avec le pivot, une section par famille).
- Touchés, par lot : voir `tasks.md`. Principaux : `v5-combat-rules.js`, `v5-test-context.js`, `v5-magic-talents.js`, `engagements.js`, `resolution.js`, `store.js`, `v5-broken-escape.js`, `v5-aftermath.js`, `v5-combat-fumbles.js`, `v5-supplemental-equipment.js`, `v5-talent-replacements.js`, `v5-magic-*.js`, `v5-divine-*.js`, `v5-spell-contracts.js`, `js/ui/resolution-panel.js` (libellés, détail).

## Vérification des critères

| CA | Comment |
|---|---|
| CA1 | Test d'équivalence par famille : même acteur (À terre + Sonné, un talent de compétence, un sort et une prière actifs), même compétence ; les `slModifiers` et sources du Test secondaire égalent ceux de `buildCombatTest` pour un Test de compétence du plateau. |
| CA2 | Mêmes cas avec Endurance de l'anachorète, Revigorer, Clarté d'esprit : pénalité ôtée dans les deux calculs. |
| CA3 | Désengagement et oppositions de sorts : États posés sur l'adversaire, son score baisse. |
| CA4 | Désengagement avec infériorité numérique + Élan + un État : tout se somme. |
| CA5 | Test par famille sur `rows` (source, montant, écarté) ; un parcours navigateur (`tests/engagements-plateau-browser.mjs` ou équivalent) contrôle l'affichage pour le désengagement. |
| CA6, CA7 | Relecture des pages par le `verifier` de chaque lot ; dispense = commentaire avec page + ligne dans `inventaire.md`. |
| CA8 | Test : séquelle lancée pour un acteur À terre sans précision de mouvement → non résolue, question rendue. |
| CA9 | Test par famille : acteur sans État ni effet → même résultat qu'avant (valeurs figées avant le lot). |
| CA10 | Tests listés dans `inventaire.md` verts ; diffs de valeurs attendues justifiés dans le message de commit. |
| CA11 | Rechargement d'une sauvegarde de `tests/fixtures` existante dans le test du store. |
| CA12 | Test : score saisi 40 + Sonné → Test à 40 avec la pénalité affichée ; libellé vérifié dans le test d'interface du lot. |

## Principes du projet

- Règles du livre jamais pliées aux tests ; toute dispense ou tout cas de cumul inconnu est posé au MJ (mémoire, CA7).
- Tests ciblés par lot, suite complète une seule fois à la fusion ; tests navigateur sous `timeout 120`.
- Contre-vérification code + règles avant publication : chaque lot finit par un `verifier` (code) et une relecture des pages citées.
- Pas de push sans feu vert du MJ. Chaque lot dans sa propre fenêtre (session), pas en sous-agent.

## Complexité justifiée

- **Un module nouveau** (`v5-test-modifiers.js`) : le calcul commun n'a pas de propriétaire. Le mettre dans `v5-combat-rules.js` ferait importer le combat par la magie, la prière et le store, et grossirait le cycle d'imports (ARCH-03). Le module n'importe que les briques feuilles (`condition-effects.js`, `v5-talent-tests.js`, `v5-magic-talents.js`) ; L0 vérifie qu'il n'entre pas dans le cycle.
- **Extraction depuis `buildCombatTest`** plutôt qu'une fonction écrite à côté : c'est la seule façon d'avoir réellement « un seul calcul » (Q19) sans qu'une copie dérive.
