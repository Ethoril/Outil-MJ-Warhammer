# Contrôle des mots-clés après raccordement des talents

Contrôle local du 9 octobre 2026, après `f659eec`, sur `codex/lot2-talents-v5`. Développement et contrôle indépendants autorisés par le MJ. Version mécanique finale : `v5-combat-2026-10-09.24.4` ; version applicative 3.12.3. Aucune publication.

## Résultat et périmètre

Aucune régression inattendue détectée sur les effets déjà pris en charge. Les 55 descriptions de mots-clés et les profils d’équipement du snapshot sont identiques aux états `6871764` (avant raccordement 2.3) et `09df6c2` (avant 2.4). Ce contrôle porte sur le référentiel local et des fixtures synthétiques ; il ne certifie ni les effets encore manuels ni une nouvelle lecture en ligne d’Aides de jeu.

La comparaison automatisée comporte **5 740 résolutions** : 55 mots-clés individuels et huit combinaisons, 15 jets, trois seuils, plus sept configurations défensives, contre les deux états antérieurs. Elle compare seuil, réussite, DR, opposition, localisation, dégâts, protection, critiques, maladresses, Élan et refus. Seules les métadonnées d’origine `source.kind=critical` et de traçabilité `evaluatedKeywords` sont neutralisées.

**Zéro écart inattendu.** 36 écarts proviennent de Sonné par Assommante, ajouté en 2.4, sans changement des dégâts. 22 écarts proviennent de la décision explicite du MJ prise pendant ce contrôle : Dévastatrice lit désormais le chiffre littéral des unités, **0=0**. La matrice sans talent éprouve le socle ; les recettes indépendantes ci-dessous éprouvent les acquisitions et interactions réelles.

## Corrections réalisées

Deux lacunes précèdent le raccordement des talents ; elles ont été reproduites dans les états antérieurs avant correction.

- **Source actualisée après aperçu.** La confirmation relit les qualités contractuelles de l’attaque, de la défense, du bouclier actif et des protections effectivement consultées, y compris une pièce Partielle écartée par parité et un critique supprimé par Impénétrable. Texte, édition, référence et version mécanique doivent toujours correspondre. Refus sans changement de PV, États, Élan, quota, journal, révision, persistance ou historique.
- **Protectrice modifiée avant aperçu.** Le bouclier ne donne plus automatiquement +1 DR ou permission d’Esquive contre un tir quand son texte/édition n’est plus couvert. Le refus subsiste quand la défense gagne et qu’aucun dégât n’appelle la protection.

La collecte distingue les qualités évaluées des objets inutilisés : une pièce inférieure déjà exclue de sa couche, un bouclier indisponible et un mot-clé sans rapport ne bloquent pas un ancien aperçu. Des PA explicitement arbitrés ne dépendent plus de Partielle ; Impénétrable reste vérifiée si sa règle décide du critique. Le refus connu de source est traduit en phrase publique, avec jets et aperçu conservés.

**Dévastatrice : décision MJ.** Les dégâts utilisent `max(DR de dégâts, chiffre des unités du jet retenu)`, avec unités de 0 à 9. Un jet de 20 ne fournit plus 10 ; un DR négatif peut être porté à 0. Les unités sont lues après inversion. Inoffensive continue d’annuler Dévastatrice ; Tir précis et Coup puissant restent ajoutés avant protection. Le helper historique Percutante/Impact n’a pas été converti ; ces effets V4 restent bloqués dans la résolution V5. Les anciens aperçus doivent être recalculés avec la version .24.4.

## Recettes indépendantes

**32 tests nouveaux** dans `tests/lot2-v5-keyword-talents.test.js`, inclus dans les **801/801 tests Node** réussis, sans échec, annulation ni test ignoré.

| Famille | Points éprouvés |
| --- | --- |
| Arme et munitions | Compatibilité, union/dédoublonnage Empaleuse, paramètres et provenance, équipements immuables après aperçu/application |
| Attaque et défense | Pointue/Imprécise, Défensive/Déséquilibrée, bouclier sans cumul Défensive, seuils conservés, critique défensif indépendant |
| Dégâts | Dévastatrice unités 0 et non nulles, inversion finale, Inoffensive/PA doublés/plancher, Tir précis visé ou non, Coup puissant avec ou sans Avantage |
| Protections | Six zones et côtés exacts, couches Flexible/rigide, doublon de couche, Partielle paire/impaire, Points faibles/Empaleuse, Impénétrable sur critique indépendant |
| Talents de qualité | Assommante déjà présente non doublée, Frappe temporaire, Mâchoires une acquisition, Battement remplace les conséquences attaquant et conserve le critique défensif |
| Confirmation | Sources changées attaque/défense/protection/critique supprimé, contre-tests objets inutilisés, rechargement/annulation et enveloppe/historique inchangés sur refus |

Quatre recettes Edge sont suivies séparément : mots-clés indépendante, 2.4 indépendante, fiches et références. Le contrôle mots-clés manipule les vrais champs, défenses, munitions, choix d’inversion, Visée, jets de critique, Appliquer et Annuler, sur ordinateur/téléphone et sombre/parchemin. Il éprouve aussi le refus après actualisation de source avec l’aperçu déjà stabilisé ; réseau externe bloqué, captures/logs dans `tmp/` ignoré.

## Limites maintenues

- **Coup ciblé + Partielle :** la localisation est choisie sans jet de localisation ; aucune parité n’est inventée. PA à arbitrer explicitement, application bloquée jusqu’à cette précision. Cette combinaison ajoutée en 2.4 n’est pas entièrement automatique.
- Les qualités sans moteur restent des rappels visibles. Une qualité inconnue d’arme n’active aucun effet et conserve le calcul ordinaire, selon la politique antérieure ; une armure à PA inconnus ne devient jamais une armure à 0.
- Précise/Percutante V4 restent bloquées dans la résolution V5. Protectrice conserve son contrat contextuel historique couvert ; ne pas annoncer que tout libellé bibliographique V4 est désactivé.
- Les projectiles fichés et les soins d’Empaleuse restent manuels. Les 55 libellés ne sont pas 55 familles automatiques.
- La couverture historique vérifie texte et édition. Une référence bibliographique seule modifiée avant calcul n’active pas une nouvelle formule ; une référence contributrice changée après aperçu impose désormais le recalcul.

## Rejouer

```text
npm test
node tests/lot2-v5-keyword-control-browser.mjs
npm run test:lot2-24-browser
npm run test:fiches-browser
npm run test:references-browser
git diff --check
```

Les recettes Edge sont exécutées séquentiellement. Les scripts de comparaison des anciens commits et leurs résultats sont dans `tmp/` ignoré ; les recettes pérennes sont dans `tests/`. Aucun PDF, extrait privé du livre, export de PJ ou code applicatif dans le ZIP documentaire. Livraison 2.5 et publication restent des étapes ultérieures.
