# Avancement local du 9 octobre 2026

Branche `codex/lot2-talents-v5`, après `a1af528` et `09df6c2`. Main et le site public inchangés ; version applicative 3.12.3. Aucun push, fusion ni déploiement.

## État courant

2.1/2.2 et cinq contrats représentatifs 2.3 restent raccordés : choix V5, Élan binaire, critiques indépendants du gagnant, États/échéances, Fortune stable par personnage et quotas/réactions dans la commande durable. [Raccordement 2.3](LOT2_RACCORDEMENT_2_3.md) et [contrôle 2.3](LOT2_CONTROLE_2_3.md) conservent leur portée historique.

La **première vague 2.4 est réalisée localement** : 35 contrats de Tests et Frappe assommante ajoutés, soit **41 contrats parfois partiels**. Les **206 talents** exposent leur traitement par clause dans les Règles/fiches/actions ; les autres effets restent en rappels explicites. Les priorités viennent exclusivement des PJ effectivement importés, sans liste privée ni lecture de leur compte en ligne. Dix bonus intégrés aux fiches sont exclus et Dur à cuire non doublé ; magie/prières restent au lot 3.

Frappe assommante et Assommante gèrent Sonné sur la perte réelle de Blessures à la tête, avec Mâchoires/Battement. La neutralisation silencieuse suit la décision MJ p. 135, Test opposé hors combat sans Coup ciblé ; dégâts/états spéciaux restent manuels, aucun critique ou gain d’Élan de combat. Orateur et les autres Tests emploient compétences canoniques et contextes explicites. Maître en déguisement/Loup de mer/Numismate offrent un choix après réussite DR/unités, sans relance ; 0 reste 0.

[Le rapport 2.4](LOT2_RACCORDEMENT_2_4.md) décrit mécanique/API/limites ; [le contrôle indépendant](LOT2_CONTROLE_2_4.md) consigne les défauts détectés puis corrigés. L’application relit toutes les empreintes contributrices contre la source courante, y compris après actualisation survenue depuis l’aperçu. Version mécanique `v5-combat-2026-10-09.24.2`.

## Validation reproductible

```text
npm ci
npm test
npm run test:lot2-browser
npm run test:lot2-23-browser
node tests/lot2-v5-23-control-browser.mjs
npm run test:lot2-24-browser
npm run test:startup
npm run test:fiches-browser
npm run test:references-browser
node tools/build-v5-talent-coverage.mjs
git diff --check
```

Recette finale : **769/769 tests Node réussis**, zéro échec, annulation ou test ignoré. Les **97 nouveaux tests 2.4** comprennent 46 Tests contextuels/choix, 19 qualités/neutralisation et 32 contrôles Store indépendants, inclus dans le total.

La première vague ef073c3 avait réussi les sept recettes Edge ci-dessus. Après les décisions MJ et la source corrigée, **cinq recettes Edge pertinentes sont repassées séparément** : 2.3 développement, 2.4 indépendant, démarrage, fiches et références. Elles éprouvent gestes ordinateur/téléphone, sombre/parchemin, vrais choix et boutons d’application, annulation, cache et imports. La recette 2.4 inclut doubles réussis des deux côtés en neutralisation, avec PV/états/Élan préservés. Le démarrage éprouve le cache réel 3.12.0 → 3.12.3 et IndexedDB préservée. Le générateur produit à nouveau exactement le même catalogue ; diff conforme.

Node/npm et dépendances déjà installés. Les navigateurs utilisent Edge Windows ou PLAYWRIGHT_EXECUTABLE_PATH. Fixtures synthétiques, réseau externe bloqué et captures/logs dans tmp/ ignoré. Le test d’erreur de disque provoque volontairement une erreur console. Les contrôles cloud restent locaux (enveloppes/outbox/sérialisation), sans compte distant réel. Ces régressions locales ne constituent pas la recette globale 2.5.

## Sources et audit demandé

Le CSV Talents épinglé conserve 206 IDs ; SHA-256 `4ef3ee500c6d4da8b26dbb30fbb751995954be66e822a7dc306acde379229d8f`. Cet incrément ne modifie pas le Google Sheet. [Le document d’écarts](ECARTS_LIVRE_V5_AIDES_DE_JEU.md) compare les 166 talents du livre V5, distingue erreurs/ambiguïtés/clarification du renvoi 127–135 et propose des corrections françaises. Les 39 talents de suppléments sont à vérifier avec leur source ; Petit/V4 est étudié séparément. Cette relecture de Talents ne certifie ni l’état des PJ en ligne ni toutes les mécaniques du catalogue.

Les cinq snapshots privés locaux relus précédemment (5/7 octobre, 52 acquisitions, 36 IDs) restent des preuves datées. Ils ne prouvent pas l’état en ligne du 9 octobre et ne sont pas incorporés aux fixtures, Git ou ZIP.

## Suite

Poursuivre les vagues mécaniques 2.4 encore manuelles, notamment Riposte/Frappe réactive et autres clauses utiles, avec incrément moteur et recette avant activation. La couverture 206 et les 41 contrats ne certifient pas tous les effets. La recette de livraison 2.5 et toute publication demandent une étape ultérieure.

[La passation](PASSATION_PROCHAINE_FENETRE.md) décrit la reprise locale. Le ZIP/checksums ont été actualisés : documentation/maquette seulement, sans code, PDF ou export privé. Transférer aussi l’état Git local pour changer de machine.

## Retour MJ intégré et éprouvé

Sept descriptions corrigées sont relues dans le CSV public, 206 IDs conservés. Résistance est le seul contrat actif dont l’empreinte source a changé ; sa précision « durant la session » est revalidée sans activer le quota de réussite automatique. Les trois contrats de choix DR/unités portent une nouvelle version de règle pour la lecture littérale 0=0. Le choix peut donner 0 DR en conservant la réussite marginale ; les DR initiaux restent disponibles. Aucun échec n’est converti en réussite.

Le contrôle indépendant comprend 32 tests et les gestes Edge 0 DR/apply/undo plus Petit en rappel homebrew. Toutes les clauses de Petit sont conservées manuellement, sauf coût Piétinement 1 Élan/Momentum ; aucun recalcul de Taille ou Blessures importées. Les signalements Seigneur de guerre et contradiction des frappes sont retirés après relecture. [L’audit](ECARTS_LIVRE_V5_AIDES_DE_JEU.md) est actualisé.
