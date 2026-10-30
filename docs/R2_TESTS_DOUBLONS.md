# Tests retirés comme doublons (R2)

Une assertion n'est retirée que si une assertion équivalente (même entrée, même valeur attendue, même chemin de code) subsiste après fusion.

## R2-1 — données et outils

Aucun doublon retiré (5 471 tests avant, 5 471 après).

## R2-2 — créatures

Aucun doublon retiré (5 471 tests avant, 5 471 après).

## R2-3 — magie A

Aucun doublon retiré (5 471 tests avant, 5 471 après).

## R2-4 — magie B

Aucun doublon retiré (5 471 tests avant, 5 471 après).

## R2-5 — divin A

Aucun doublon retiré (suite : 5 471 tests avant, 5 471 après ; les 63 originaux : 466 tests, les 5 cibles : 466). Les candidats du plan (codec / codec-independent, access / access-independent, e0-independent / eagle-summary-dev) ont des entrées ou des valeurs attendues différentes (chemin Store réel, formes malformées, contrôle indépendant des sources) : conservés.

## R2-6 — divin B

Aucun doublon retiré (suite : 5 471 tests avant, 5 471 après ; les 30 originaux : 367 tests, les 4 cibles : 367). Les candidats du plan (e4-runtime / e4-context et leurs -independent, wrath-conditions -dev / -independent, brise-flee-sprint / broken-escape-dev, simulation-independent) ont des entrées ou des valeurs attendues différentes (données d’états, assertions supplémentaires, chemins Store ou moteur distincts) : conservés.

## R2-7 — divin C

Un doublon d'exécution retiré : `lot3-especes-divin-coverage` (fusionné en R2-5 dans `tests/unit/divin/prieres-benedictions.test.js`) importait `divin-v5-p4a-damage.test.js`, ce qui exécutait ses 12 tests une seconde fois dans la suite. L'import est supprimé ; les 12 tests ne s'exécutent plus qu'une fois, dans le describe « P4a — dégâts directs » de `tests/unit/divin/effets-degats-conditions.test.js` (dont « Haine sacrée : +2 Blessures si le prêtre a le talent, rien sans lui », ancre de l'`executionProbe`). Aucune assertion perdue : ce sont les mêmes 12 tests, exécutés une fois au lieu de deux. Suite : 5 471 tests avant, 5 459 après.

Autres candidats du plan (p4b-damage / p4b-damage-real, p4b-gear / p4b-gear-real, p4b-conditions / -real, p4b-tests / -real) : entrées ou valeurs attendues différentes (contrats génériques d'essai contre miracles réels, Peur (1) contre Peur (2)) ; conservés, les 366 tests des 34 originaux sont repris (65 + 51 + 68 + 41 + 141).

## R2-8 — combat A

Aucun doublon retiré (les 55 originaux : 483 tests, les 7 cibles : 483 ; la suite complète garde donc le même total qu'avant l'étape).

## R2-9 — combat B

Aucun doublon retiré (les 16 originaux : 187 tests, les 2 cibles : 187 ; la suite complète garde donc le même total qu'avant l'étape).
