# Lot 3 — vérification contradictoire du 17 octobre 2026

**Verdict : six défauts fonctionnels ou de données P2 et deux écarts de présentation P3 restent confirmés après confrontation des deux auditeurs. Les six P2 sont à corriger avant de déclarer la livraison conforme.** Aucun nouveau P1 trouvé. Les reproductions graves d'origine et les cinq reliquats précédemment corrigés restent conformes dans les scénarios rejoués.

Les **2 231 tests sur 2 231 et les 21 commandes de la recette existante passent**. Sept nouveaux tests de contre-exemples échouent sur l'état audité, pour six causes fonctionnelles ; ils ont été reproduits par les deux auditeurs puis par le contrôleur principal. Ces résultats portent sur des scénarios différents et ne se contredisent pas.

## État audité et méthode

- Application **3.15.0**, branche **codex/lot2-talents-v5**, HEAD **fb0f280150cdbdab1af220163abfaa491e2156ee** ; modifications locales antérieures incluses dans l'état audité. Ce HEAD seul ne représente donc pas le contenu complet contrôlé.
- Worktree : [lot2-combat-v5](<C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer>). Deux copies de **514 fichiers identiques**, avec empreintes SHA-256 : [manifeste initial](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/freeze-manifest.json>) et [contrôle final](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/freeze-verification.json>).
- Exactement deux sous-agents : A, moteur/Store/cycle de vie ; B, catalogue/sources/interface. Chacun a figé son rapport INITIAL avant de consulter celui de l'autre. B a été informé de l'existence du cas Protection à 0 B avant sa seconde phase et ne le revendique pas comme découverte indépendante.
- Confrontation effective : B a rejoué les sept contre-exemples d'A et tenté de les réfuter avec témoins ; A a rejoué les gestes UI de B. Échange d'objections, contrôles renforcés puis décision explicite sur les huit sujets. Aucun désaccord restant et aucun constat retiré.
- Audit seulement : aucun correctif applicatif, aucune modification du classeur, aucun commit/push/merge/déploiement. Le présent rapport est le seul nouveau document ajouté au worktree ; les preuves et sondes restent dans le dossier d'audit externe.

Rapports complets : [INITIAL A](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/a/INITIAL.md>), [INITIAL B](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/b/INITIAL.md>), [CONFRONTATION A](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/a/CONFRONTATION.md>), [CONFRONTATION B](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/b/CONFRONTATION.md>).

## Six défauts fonctionnels confirmés

### A-01 — Protection et Critique à zéro Blessure — P2

**Reproduction :** cible active à 0 B, Protection réelle issue du contrat Protection ou Blindage de météorite ; Arc de T’Essla avec Critique d'incantation, choix de blessure critique, d10 de Protection = 10. Le Critique est appliqué et reste après rechargement, alors que la Protection doit l'annuler. À 1 B, le même dé annule correctement le Critique ; sans dé, le calcul bloque correctement. Annuler retire le Critique.

Cause : [js/core/v5-spell-contracts.js:2996](<C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer/js/core/v5-spell-contracts.js:2996>), condition woundsLost > 0 après plafonnement aux Blessures restantes. Les dégâts entrants et le Critique existent encore à 0 B. V5 p. 363 et arbitrage MJ : aucune exception de Protection à 0 B.

**Objection testée :** une Protection historique invalide, un filtre inapplicable ou une saisie UI manquante. Réfutée par les vrais contrats et par des gestes Calculer/Appliquer à **1440 et 390 px**, d10 visible, sans erreur de page. [contrôle A](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/a/phase2-controls.json>), [parcours UI B](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/b/ward-ui-cross.json>), [sonde du contrôleur](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/root-ward.json>).

### A-02 — Nature du vivant dans Sang de la Terre — P2

**Reproduction :** cible 5/30 B, présence et contact direct avec la terre renseignés, transition de Round réelle. **Artificiel reçoit 5 B de soins**, alors que Construct n'en reçoit pas. **Chasseur de démons ne reçoit aucun soin**, alors qu'Humanoïde en reçoit. Démon, Éthéré et Mort-vivant restent correctement exclus. Résultats conservés après rechargement ; Annuler fonctionne.

Cause : lecteur local par sous-chaîne dans [js/core/v5-magic-turn.js:10](<C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer/js/core/v5-magic-turn.js:10>), utilisé [js/core/v5-magic-turn.js:329](<C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer/js/core/v5-magic-turn.js:329>). Il omet Artificiel et prend une mention de rôle pour une nature. V5 p. 250 relue dans le PDF d'origine : Earthblood concerne le vivant et exclut Construct/Daemonic/Ethereal/Undead.

**Objection testée :** Artificiel serait un cas distinct, ou le chasseur serait démoniaque. Les contrôles de synonymes et de nature ne soutiennent pas cette interprétation. Le détecteur strict de Fléau des Démons est corrigé ; ce défaut est dans un autre lecteur. [cycle de vie A](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/a/probe-lifecycle.json>), [contrôles B](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/b/phase2-adversarial.json>).

### A-03 — Traits d'un effet expiré restaurés après transformation — P2

**Reproduction :** Peau du Chasseur, puis Forme bestiale Loup ; avancer d'une minute, la Peau expire pendant que la forme reste active ; revenir à la forme initiale, manuellement ou à expiration. Vision dans le noir et Peur 1 restent, y compris après rechargement, alors que la couche a disparu et l'Endurance revient correctement.

Cause : traits effectifs inclus au plan [js/core/v5-magic-arbitrations.js:113](<C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer/js/core/v5-magic-arbitrations.js:113>), mémorisés [js/core/v5-magic-arbitrations.js:239](<C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer/js/core/v5-magic-arbitrations.js:239>), puis restaurés [js/core/v5-magic-arbitrations.js:329](<C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer/js/core/v5-magic-arbitrations.js:329>) sans tenir compte de l'expiration de leur source.

**Objection testée :** restaurer le snapshot préserverait légitimement les traits. Les témoins isolent le défaut : Amphibie permanent reste ; Peau expirée sans forme laisse seulement Amphibie ; Peau expirée pendant la forme restaure aussi les deux traits temporaires. La correction devra préserver les traits permanents et les effets encore valides. [témoins A](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/a/phase2-controls.json>), [témoins B](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/b/phase2-adversarial.json>).

### A-04 — Mouvement écrasé après synchronisation partielle — P2, portée bornée

**Reproduction :** profil lié de race connue Nain/M3, transformé en Loup/M9 ; synchroniser une fiche partielle ne fournissant que FM70, sans race ni M. La forme reste correctement à M9, mais le retour donne **M4**, avec race toujours Nain. Une fiche fournissant explicitement race=nain conserve M3. Le contrôleur reproduit aussi Haut Elfe M5→4 et Ogre M6→4 ; les données absentes HP/compétences sont conservées.

Cause : défaut Humain/M4 fabriqué malgré l'absence de donnée dans [js/core/fiche-sync.js:133](<C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer/js/core/fiche-sync.js:133>), puis copié au profil d'origine [js/core/fiche-sync.js:477](<C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer/js/core/fiche-sync.js:477>).

**Objection testée :** sans race entrante, M4 serait un défaut légitime. La race de destination est déjà connue et conservée ; seule l'absence de la valeur dans la fiche déclenche la perte. Défaut limité aux mises à jour partielles sans race/M ; les fiches complètes contrôlées passent. [contrôle B](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/b/phase2-adversarial.json>), [trois races, contrôleur](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/root-partial-movement.json>).

### A-05 — Faux Mort-vivant depuis Haine ou un rôle — P2, portée bornée

**Reproduction :** cible vivante à 10 B avec Exténué, trait ou étiquette importé/personnalisé **Haine(Undead)** ou **Hatred(Undead)**. L'attribut Vie inflige 5 B et conserve Exténué, au lieu de traiter la cible comme vivante. Chasseur de mort-vivants au singulier déclenche aussi le défaut. **Haine(Morts-vivants) au pluriel passe** ; les vrais Undead/Mort-vivant restent correctement reconnus. Le nom du personnage n'est pas en cause.

Cause : expression non ancrée [js/core/v5-magic-attributes.js:106](<C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer/js/core/v5-magic-attributes.js:106>). **Objection testée :** ce serait un problème universel aux libellés français, ou une entrée rejetée par le modèle. Les témoins réfutent la première généralisation ; les libellés anglais importés sont admis et conservés. L'impact en Blessures justifie P2, limité aux mentions correspondant à cette expression. [contrôles B](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/b/phase2-adversarial.json>), [tests A](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/a/counterexamples.test.mjs>).

### A-06 — Forme importée vide puis retour impossible — P2, import mal formé seulement

**Reproduction :** importer extensions.v5.beastForm = {}. La structure est conservée ; Carreau est interdit au motif que le mage est transformé ; le retour lève une erreur de lecture de caracs sur une valeur absente.

Cause : structure minimale non exigée dans [js/core/sanitize.js:77](<C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer/js/core/sanitize.js:77>) ; profil original lu sans garde dans [js/core/v5-magic-arbitrations.js:289](<C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer/js/core/v5-magic-arbitrations.js:289>).

**Objection testée :** l'objet vide serait un format historique de migration valide, ou le refus serait sans conséquence. Aucune convention de ce type trouvée ; le blocage et l'exception sont reproduits sur les deux copies. Les formes créées normalement restent conformes. Il faut rejeter la structure invalide ou permettre une récupération sûre. [contrôle B](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/b/phase2-adversarial.json>), [sept attentes rouges](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/b/peer-counterexamples-red.log>).

## Deux écarts de présentation confirmés

| Référence | Observation et effet réel | Localisation | Objection écartée |
|---|---|---|---|
| B-01 — P3 | Avec une Protection limitée au feu magique sur la cible, Choc affiche un d10 sans utilité. Calculer et Appliquer sans ce dé réussissent, Sonné est présent. | [js/ui/v5-magic-controls.js:70](<C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer/js/ui/v5-magic-controls.js:70>) | Ce dé pourrait être nécessaire ou bloquant : aucun blocage ni effet métier erroné dans le cas prouvé. |
| B-02 — P3 | Surpuissance dégâts = -1 sur Carreau affiche la clé anglaise damage. L'application est correctement interdite ; ressaisir 0 réactive Appliquer. | [js/core/v5-spell-contracts.js:1081](<C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer/js/core/v5-spell-contracts.js:1081>) | Le budget négatif pourrait être accepté : le refus et la reprise après correction fonctionnent. |

Vrais gestes rejoués indépendamment par A et B, **1440/390 px × sombre/parchemin** : 64 assertions par parcours, 56 conformes et 8 écarts, soit les deux défauts répétés sur quatre configurations. Zéro erreur de page et pas de débordement constaté. [résultats B](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/b/ui-initial.json>), [reproduction A](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/a/ui-initial.json>).

## Vérifications positives et reçus

| Contrôle | Résultat actuel | Preuve |
|---|---|---|
| Recette complète existante | 21 commandes, toutes à zéro ; 2 231/2 231 tests Node | [synthèse centrale](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/central/validation-summary.json>) et [reçu des commandes](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/central/recipe-receipt.json>) |
| Générations | Deux passes identiques, 13 fichiers générés ; 277 contrats | [reçu de génération](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/central/cloture-generation-receipt.json>) |
| Navigateur et historique | Recettes UI existantes et vraie persistance index/IndexedDB/rechargement/Annuler à 1440/390 | [historique isolé B](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/b/history/relecture2-history-receipt.json>) et reçu central |
| Cloud de démonstration local | Parcours Firebase Auth/RTDB de la recette centralisée verts | [reçu cloud local](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/central/cloud-receipt.json>) |
| Paquet exporté hors ligne | Service Worker/IndexedDB et recettes bureau/mobile verts | [reçu navigateur du paquet](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/central/release-browser-receipt.json>) |
| Tests ciblés R2 + reliquats | 56/56 rejoués séparément par chaque auditeur | [log A](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/a/targeted-tests.log>), [log B](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/b/targeted-tests.log>) |
| Nouvelles attentes fonctionnelles | 7/7 rouges sur six causes, reproduites A/B/contrôleur | [log A](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/a/counterexamples-red.log>), [log B](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/b/peer-counterexamples-red.log>), [log contrôleur](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/root-counterexamples.log>) |
| Intégrité de l'état audité | 514/514 empreintes identiques dans le worktree et chacune des deux copies | [contrôle final](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/freeze-verification.json>) |

Les résultats ciblés ne s'ajoutent pas au total des 2 231 tests. Les sept attentes rouges sont de nouveaux tests externes à la suite existante ; les huit écarts UI représentent deux défauts, pas huit causes supplémentaires.

## Catalogue, Excel et sources

B a exécuté **23 contrôles indépendants, tous conformes**, en lecture seule : [reçu catalogue](<C:\Users\arnot\.codex\visualizations\2026\10\14\01a13aa2-6c43-7220-ad8f-709480ea094d\audit-confrontation-20261017/b/catalogue-receipt.json>). Les **1 946 valeurs** du classeur Magie sont égales au CSV ; les 277 NI sont numériques ; styles, colonnes, tableau, gel B2 et absence de formules/erreurs sont conservés. Les différences sont exactement **25 cellules** depuis le classeur avant R2 et **5 cellules** depuis celui avant les reliquats : G25, G75, G80, G84, G107. La correction du miracle est dans Miracles!E13 du CSV ; aucun onglet Miracles n'a été inventé dans ce classeur.

Les 277 identifiants/noms, en-têtes de contrats et rappels concordent avec les données actuelles, avec normalisations typographiques explicitement contrôlées. Les empreintes Magie/Miracles du manifeste et les versions ont été recalculées :

- contentVersion : **references:3755f725aedded0b38face136e08c2214af15e9c299412702185c67740ff56ac**
- catalogVersion : **sha256:267a5ba2a20c19f5b5ae6b5576f8932ca9e88393fd5df6a718fe9448e6f8077c**
- localRevision : **2026-10-17-catalogue-v5-reliquats**

La matrice actuelle compte 147 principalement calculables, 49 nécessitant des données MJ, 81 rappels, 0 non créés. **La présence et la parité de 277 contrats ne certifient pas chaque clause des livres.**

Sources ciblées relues dans cette passe : V5 pp. 236–237, 242–243, 245–246, 248–251, 254, 363 ; WoM pp. 135–136, 146, 149 ; HEPG pp. 86–89. La suffocation p. 169 s'appuie sur l'extraction déjà disponible, sans nouvelle lecture intégrale du PDF. Les descriptions des 277 sorts n'ont pas toutes été relues clause par clause contre chaque page originale ; aucune validation visuelle exhaustive des pages PDF n'est revendiquée.

## Portée et suites nécessaires

Les grilles détaillées **26 points du brief + 10 règles MJ + 5 reliquats** sont dans les deux INITIAL. Elles distinguent lu, exécuté, testé et non vérifié ; les CONFRONTATION complètent les cas nouvellement exécutés. Les corrections Rune du dissipateur, réduction avant plafonnement, traits de forme d'origine, Annuler après recharge, Focalisation unique/anomalie, Tempête et les cinq reliquats ne sont pas invalidées par les nouveaux constats.

Restent hors certification : chaque monstre Kadon et trait optionnel, toutes les cascades d'incidents, chaque lecteur de drapeau, toutes les sauvegardes historiques possibles, chaque geste UI d'incapacité/Pause/Interruption et toutes les clauses des 277 sources. Les miracles restent hors mécanisation conformément au périmètre. Les campagnes et comptes utilisateur réels ainsi que la production n'ont pas servi à ces essais. Ces limites ne sont pas comptées comme défauts.

Suite recommandée : corriger les six P2 en conservant leurs témoins négatifs, rendre vertes les sept nouvelles attentes, rejouer les gestes Protection à 0/1 B et la recette complète après modification. Les deux P3 peuvent être différés par décision explicite du MJ. **Aucun de ces huit sujets n'a été corrigé durant cet audit.**
