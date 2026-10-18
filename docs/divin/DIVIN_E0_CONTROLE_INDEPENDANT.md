# Contrôle indépendant E0 — provenance Up in Arms

17 octobre 2026. Contrôle Luna indépendant du générateur et de ses tests d’auteur. Ce contrôle couvre seulement E0 et une revue de conception E1/E2; il ne certifie pas l’audit exhaustif du corpus.

## Résultat E0

Les neuf miracles supplémentaires sont visibles sur la page imprimée/PDF 79 de *Up in Arms*. J’ai contrôlé l’image rendue hors dépôt `C:/Users/arnot/.codex/visualizations/2026/10/17/01a14914-3101-7b82-acfd-286e9fe5a543/recherche-divin-sources/up-in-arms-myrmidia-79.png`. Elle contient les neuf titres anglais associés dans le registre, de **Command the Legion** à **Vengeful Wrath**. Cette vérification indépendante confirme la source V4 retrouvée, pas l’adaptation des effets en V5.

La ligne `Duration` de **On Deadly Ground** porte un texte de zone « alliés dans l’aire autour de la Volonté »; elle n’établit pas de durée numérique. L’anomalie reste ouverte et aucune durée catalogue ne peut être déduite de cette page.

Le test indépendant fixe pour les neuf lignes le nom canonique, le livre `Up in arms.pdf`, l’empreinte SHA-256 `0671b27d0e947c7c5387fd4b30cda0512f9182dc811cc0275a18acc96af5fa07`, l’édition V4, la page 79 et le titre de section. Il exige le statut `found-adaptation-blocked`, un contrat toujours `blocked`, zéro effet, la clause d’effet bloquée et le besoin d’adaptation V5. Les six autres miracles restent sourcés dans le livre V5. Le registre doit compter 15/15 sources trouvées, dont six V5 et neuf V4 à adapter.

Une confirmation fournie par l’appelant (`confirmed`, `adaptationConfirmed`, `clientConfirmation` ou `force`) ne rend pas les neuf contrats exécutables. Une copie locale qui change leur statut en `implemented` est également rejetée par le moteur. Ce contrôle confirme que l’autorisation politique DIV-01 ne vaut pas adaptation de règle ni contournement du contrat canonique.

## Preuves exécutées

- Rouge historique avant la correction : `node --test tests/divin-v5-e0-independent.test.js` a échoué sur `canonicalName = null` pour Commander la Légion et sur l’absence de l’entrée Effrayer l’Ennemi; le contrôle du cwd externe passait (1/3). Le test E0 provenance déjà présent a également échoué sur `canonicalName = null`.
- Après la régénération par l’auteur : `node --test tests/divin-v5-e0-independent.test.js` passe 3/3. Il contrôle les 15 sources, les blocages, les tentatives de confirmation client, la garde de répertoire et le mode `--check` du générateur.
- `node --test tests/divin-v5-e0-provenance.test.js` passe 1/1.
- Le `--check` et la garde cwd externe ont aussi été exécutés comme deux assertions du test indépendant; le processus lancé avec un cwd externe a refusé d’opérer.
- Après ajout du garde au runner de recette, `tests/divin-v5-e0-independent.test.js` passe désormais 4/4. Le test lance le runner depuis un répertoire temporaire vide, vérifie le refus avant production de reçu, l’absence de fichiers dans ce cwd et l’empreinte du reçu existant inchangée.

Le test indépendant est dans `tests/divin-v5-e0-independent.test.js`; il n’a pas été confié à l’auteur du générateur. Je n’ai pas lancé la recette globale de 2 308 tests, la suite complète, les tests navigateur/émulateur ni une validation de publication. Ils restent au principal après intégration des corrections E0, comme prévu par la passation.

## Revue de conception E1/E2

Avis favorable à la création des dispositions E1 et au schéma E2 comme registre documentaire séparé du runtime, sous les précisions de validation suivantes avant de considérer son générateur fiable :

1. Les 2 694 dispositions doivent être dérivées du manifeste et comparées à l’ensemble exact des couples livre/page physique. Un test doit échouer si une page manque, apparaît deux fois ou si un livre/hash/pagination diverge. Les nouveaux enregistrements commencent tous à `not-explored`; la création des lignes n’est pas une lecture.
2. Une lecture n’est effective qu’avec une preuve référencée lisible. `evidencePath` et `visualEvidencePath` doivent être vérifiés, les pages sans texte extrait ne peuvent être validées sans preuve visuelle, et les preuves externes ne doivent pas copier de PDF ou de texte privé dans le dépôt.
3. Le rôle indépendant exige un lecteur distinct de celui de la première lecture pour chaque livre/page; les divergences restent persistantes et bloquent l’état vérifié jusqu’à une confrontation explicite.
4. Les champs de clause, décisions, références et statuts ont besoin d’énumérations contrôlées et de liens validés (identité, livre/hash/page, preuve, contractId et anomalie). Les champs `null`, `unresolved` et `notApplicable` ne doivent pas se substituer les uns aux autres.
5. Le terme `verificationStatus: executed` est ambigu. Le distinguer de l’exécution réelle d’une mécanique, par exemple avec une valeur non ambiguë telle que `runtime-exercised`, afin que « lu », « exécuté » et « testé » ne soient pas confondus dans les comptes.
6. `principalVerdict` doit être produit par une étape de contrôle explicite et lié à des preuves, pas inféré d’un compteur ou rempli par défaut par le générateur.

Ces réserves n’empêchent pas E1 de créer dès maintenant les dispositions vides ni E2 d’établir le schéma et les premières sources effectivement relues. Elles interdisent de présenter les 2 694 lignes générées comme des pages lues ou de promouvoir une clause non auditée. Aucun nouveau module runtime ne doit être développé sur la seule base de ces dispositions.

## Limites du contrôle

La page 79 a été contrôlée visuellement; les 17 livres et 2 694 pages ne l’ont pas été. Je n’ai pas vérifié l’existence d’errata d’Up in Arms ni interprété en V5 les neuf miracles. Je n’ai pas audité l’intégration moteur/UI/persistance. Le principal doit relancer la recette globale après correction du test historique de contrôle qui attend encore à tort neuf sources `not-found`.
