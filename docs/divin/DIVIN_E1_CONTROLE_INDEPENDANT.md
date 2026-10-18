# Contrôle indépendant E1 — dispositions et lectures visuelles

17 octobre 2026. Tests adversariaux possédés par le contrôleur, séparés du générateur et de ses tests de développement. Le contrôle porte sur les dispositions, preuves et comptes E1; il ne certifie pas l’exhaustivité des livres ni des mécaniques runtime.

## Résultat sur l’arbre final

Le registre contient exactement les **2 694 pages physiques de 17 livres**, sans doublon, avec les chemins, hash et états d’extraction du manifeste. Les relevés comportent 39 premières lectures et 39 lectures indépendantes, sur les mêmes 39 pages : les 13 pages L06/217–229 et les 26 pages sans extraction. Les rôles utilisent des lecteurs différents et des notes lisibles; chaque page sans texte porte une preuve image valide pour chacun des deux rôles.

Les 26 classements `auditClassification` et folios `printedPage` du premier lecteur sont consignés explicitement dans `docs/divin/sources/blank-pages.mjs`. Le registre les recopie exactement; aucun classement n’est déduit d’une expression régulière sur le texte descriptif. Les pages L01/93–94 gardent le désaccord de catégorie : première lecture `out-of-scope`, lecture indépendante `dependency`. L03/43 est `dependency` pour les deux rôles et son folio est `null` pour les deux. La nouvelle vérification du rendu confirme que le « 40 » visible désigne l’extrémité de l’échelle en miles, pas un folio 43.

Comptes courants : 39 pages doublement classées, 37 accords de catégorie et deux désaccords, 39 folios concordants et aucun désaccord de folio. Les 26 pages sans texte ont une preuve visuelle par rôle et par les deux rôles; seules 24 sont `verified`, car les deux désaccords L01 demeurent ouverts. Aucun livre n’est fermé. Les 79 identités (19 bénédictions, 60 miracles) sont partielles E1, les 60 associations ne forment pas des clauses, il y a zéro clause complète ou mécaniquement intégrée et huit anomalies ouvertes.

## Contrôles adversariaux et rouges observés

La suite indépendante comporte 23 tests. Elle couvre notamment l’ensemble exact des pages, les liens/hash/numéros, les preuves visuelles, l’indépendance des lecteurs, les pages malformées, les clauses partielles, les statuts et associations falsifiés, le non-déblocage du runtime, le cwd, le déterminisme et la non-mutation de `--check`.

Les rouges de cette intégration ont révélé que les 26 catégories de première lecture n’étaient pas explicites et que le générateur les inférait des descriptions, et que les compteurs de couverture visuelle acceptaient `visual-pending` dès qu’un PNG existait. Après correction, un test indépendant exige les champs explicites et leur recopie exacte; un autre déclasse une vraie lecture visuelle en `visual-pending` tout en gardant son image et vérifie la baisse des compteurs first/both et de `verified`. Un test distinct injecte un folio divergent sur L03/43 et exige que la classification reste concordante mais que `printedPageAgreed` et `verified` passent à faux.

La relecture ciblée de L03/43 a corrigé une donnée d’entrée non étayée (`43`) en `null` avec motif; la valeur était tirée à tort de l’identifiant de page physique, alors que le « 40 » affiché appartient à l’échelle. Le test final vérifie le folio `null/null`, ainsi que le comportement adverse si une divergence est injectée. L01/93–94 restent les deux désaccords de catégorie documentés.

Résultats finaux : `node --test tests/divin-v5-audit-independent.test.js` passe 23/23; `node --test tests/divin-v5-audit.test.js` passe 11/11; `node tools/build-divine-audit.mjs --check` passe. Le test indépendant E0 p.224/provenance passe 5/5 et les tests catalogue 6/6. Les vérifications de génération et `--check` sont séparées de la recette globale.

## Limites

Les 39 pages relues ne sont pas les 2 694 pages : 2 655 restent non explorées. Les 24 pages visuellement couvertes et vérifiées ne résolvent pas les deux désaccords L01; aucun livre ne ferme. Les notes de 26 pages ne constituent ni une décomposition en clauses ni un contrat complet E2. Les huit anomalies restent ouvertes. La recette globale du dépôt, les tests navigateur/émulateur et toute publication ne sont pas inclus; ils restent à exécuter par le principal sur cet arbre final.
