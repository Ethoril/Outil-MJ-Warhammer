# Rapport GPT - Phase F2

## Reprises T1 BIS — 27/10/2026 : corrections terminées, arrêt avant T2

Source : `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_T1_BIS.md`. Les trois réponses du MJ du 26/10 après-midi sont recopiées en tête de `CHOIX_EXECUTANT_PHASE_F2.md` (commit `f85e113`). La priorité de spécialité exacte est confirmée ; Maniement de deux armes exige toujours une première attaque enregistrée dans l'outil, conformément au choix du MJ. La phrase « voies de Talents conservées » a été corrigée.

| Point | Correction et contrôle |
|---|---|
| 1 | Visée reconnaît aussi le libellé normalisé dans `action.note` ; le tir avec une arme déclarée par nom conserve +1 DR. Test après passage au Tour suivant. |
| 2 | La préparation d'initiative et le lancement d'une rencontre tout au banc sont autorisés ; seul le démarrage du combat exige un actif. Parcours réel de lancement vérifié en navigateur. |
| 3 | Les catégories d'Hast des suppléments sont reconnues à deux mains, dont Hallebarde et Lance longue Haut Elfe. |
| 4 | Jet, Fronde, Fouet, Lasso et explosifs du catalogue sont utilisables à une main sauf mention deux mains ; les autres armes à portée conservent leur garde. |
| 5 | `applyCombatInitialization` revérifie les actifs avant et dans la transaction de démarrage, y compris face à un aperçu altéré. |
| 6 | Arme aethyrique ancienne sans clé ou arme reliée à un contrat de conjuration sans profil : groupe à confirmer par le MJ. Le contrat permet de reconnaître l'arme même renommée ; le libellé aethyrique sert au raccord historique sans contrat. Le groupe n'est jamais déduit du nom. Dent et griffe reste hors du contrôle d'arme conjurée. |
| 7 | Refus de dissipation : motif `error` réutilisé et fallback lisible ; badge I/ordre conservé après édition ou annulation ; seule l'infobulle Initiative de `index.html` change, par exception autorisée pour ce point. |
| Décision ajout actif | Commande explicite « + Actif » depuis les profils : après initialisation au Round 0, préparation sans mutation, d10 PNJ automatique capturé une fois, d10 PJ saisi, BI et égalités par le mécanisme existant, puis insertion atomique annulable. L'ajout habituel au banc reste disponible. Les APIs d'ajout actif sans initiative refusent ce cas et orientent vers la préparation ; `previewCombatParticipantAddition` accepte un profil ou un participant direct. Avant initialisation et à partir du Round 1, insertion active/renfort conservée. |

### Validation finale T1 BIS

Correctifs de production et tests commités : `a2e520f`. Revue ciblée indépendante : verdict conforme, aucun bug bloquant trouvé sur les chemins couverts.

- Caractérisations/régressions Store initiales séparées : `89addd5`, avant code de production. Huit tests nouveaux au total dans `tests/f2-t1-bis-regressions.test.js`. La fixture Visée de ce nouveau fichier a été complétée pour exercer le tir au Tour suivant ; aucun test de caractérisation historique F2 ni test hérité Node n'a été modifié.
- Revue indépendante Luna ciblée : `tmp/gpt-phase-f2/REVUE_T1_BIS_LUNA.md` ; tests ciblés **29/29**, lecture des routes Store/UI et sondes sur arme renommée liée au contrat et dissipation réellement refusée après Défensive.
- Suite complète principale : `node --test --test-concurrency=4`, **4 825/4 825**, zéro échec, annulé ou ignoré, **126 887,6867 ms** ; `tmp/gpt-phase-f2/t1-bis-full-verified.log`. Reçu F0 préexistant utilisé uniquement pour le prérequis E0, aucune recette de fin de phase F2 revendiquée.
- Six parcours navigateur principaux verts : `f2-a-initiative-surprise`, `f2-b-combat-actions`, `f2-b-two-weapons`, `f2-c-ui`, `f2-c-workspace`, `f2-c-state` ; journaux `tmp/gpt-phase-f2/t1-bis-<runner>-browser.log`. A couvre aussi le nouvel ajout actif et le lancement tout au banc, le badge après validation/annulation. La première passe CUI a échoué sur une fixture nouvelle sans action, avant le rendu du résultat ; fixture complétée, puis les trois parcours C relancés et verts. Aucun code de production n'a changé après le gel de la suite complète.
- Adaptation de test navigateur existant : `f2-c-ui.browser.mjs` attend maintenant le sélecteur de groupe pour l'ancienne arme aethyrique sans clé, en accord avec le point 6 ; ajout d'un cas naturel distinct et du fallback dissipation. `f2-a-initiative-surprise.browser.mjs` reçoit uniquement des contrôles supplémentaires.
- Frontières : texte initial du plan identique, dix fichiers protégés intacts et `index.html` contrôlé séparément (seule infobulle autorisée), LF, aucun nouveau module runtime, `git diff --check` propre. Catalogue, version et précache intacts.

**Arrêt demandé après cette reprise. T2 n'est pas commencé.** Pas de fusion ni publication. T2 demeure conditionné à la mise à jour du catalogue par la feuille et le site, puis à l'instruction du MJ ; ne pas modifier `reference-snapshot.json` à la main. Les sections suivantes sont l'historique des validations antérieures.

## Reprise T1 après contre-vérification Claude — 26/10/2026

La contre-vérification `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_T1.md` sur `02b203b` remplace le verdict de clôture précédent : elle demande les corrections 1 à 20 avant T2. Le MJ autorise ces corrections, leur revue indépendante et une nouvelle suite complète, puis impose l'arrêt avant T2. Les trois nouvelles décisions du MJ sont recopiées en tête de `CHOIX_EXECUTANT_PHASE_F2.md` ; elles remplacent les choix historiques incompatibles, notamment A-EGALITES-01.

Les résultats historiques ci-dessous concernent les états antérieurs. Les corrections de cette reprise sont gelées ; les revues indépendantes et preuves finales sont décrites ci-dessous.

### Corrections de la contre-vérification T1

| Point Claude | Raccord demandé et contrôle |
|---|---|
| 1 | Dent et griffe et autres attaques naturelles ne sont pas assimilés à une arme conjurée sans clé/profil ; vrai contrat testé. |
| 2 | Les huit profils Siège/Embarquée à poudre acceptent les faits MJ de spécialité, augmentations et score ; voie Arc refusée. |
| 3 | Aucun lien absent ne peut sélectionner une compétence par `storageKey` absent ; spécialité exacte prioritaire, même à zéro, Base explicite reste disponible. |
| 4 | Bâtarde sans suffixe : défaut une main cohérent entre moteur et panneau. |
| 5 | Le panneau offre un choix de compétence pour corriger les liens périmés de mêlée et de tir. |
| 6 | Modificateur de DR porté par l'action conservé au cumul de maîtrise ; reçu Base à zéro sans étiquettes contradictoires. |
| 7 | Retour du banc d'un combattant déjà initialisé : rang de combat restauré en automatique, ordre manuel préservé. |
| 8 | Suspension : marqueur global d'initialisation retiré ; preuve de scène conservée pour la reprise. |
| 9 | Piste et carte distinguent le score de combat de l'Initiative historique ; champ de caractéristique étiqueté I. |
| 10 | Avertissement de remplacement d'un ordre manuel ; API d'initialisation sans combattant actif refusée. |
| 11 | Hauteur et terrain utilisent chacun une seule pénalité malgré les anciens champs. |
| 12 | Les suppressions de Talents reconnaissent les nouvelles clés hauteur/terrain ; Sapeur conserve uniquement les exemptions de son contrat. |
| 13 | Cible sans Trait de Taille = Moyenne pour les modificateurs de tir. |
| 14 | Seconde arme au tir admise ; contrôle des deux armes à une main, refus d'aperçu lisible ; Maniement de deux armes exige une première attaque enregistrée dans l'outil, conformément à la confirmation du MJ T1 BIS. Exemptions d'Élan, Parade et quota conservés. Raccord au vrai catalogue et au panneau commun mêlée/tir. |
| 15 | Une tentative de Croche-pied par touche, sans second État À Terre. |
| 16 | Paliers recalculés après ajustements, exposés pour le défenseur et copiés dans le journal. |
| 17 | Gardes Défensive/Viser et perte de Visée dans les transactions de Focalisation, Incantation, dissipation et Prière, y compris récupération du Courroux. |
| 18 | Changer de cible purge intention létale, option létale et confirmation de mort. |
| 19 | Lecture des États alignée sur niveau zéro et source inactive ; caractérisation supplémentaire hors B. |
| 20 | Réaction au premier niveau normalisée ; Défensive exige une compétence possédée ; difficulté extraordinaire non positive ; Visée liée à l'arme ; redémarrage avec portée de Tour neuve et état d'Actions purgé ; déviation déduite du groupe, demi-distance conservée ; variables documentées. |

Les corrections restent limitées à T1. La nouvelle contre-vérification Claude ciblée et le feu vert du MJ restent nécessaires avant T2.

### Revues et validation de la reprise

- Revue Luna C : `tmp/gpt-phase-f2/REVUE_T1_C_CORRECTIONS_LUNA.md`, **48/48** ciblés et navigateur C verts ; complément spécialité exacte à zéro, **48/48**, dans `REVUE_T1_C_COMPLEMENT_LUNA.md`.
- Revue Luna A : `tmp/gpt-phase-f2/REVUE_T1_A_CORRECTIONS_LUNA.md`, **51/51** ciblés et navigateur A verts, avec suspension/reprise et portée de combat redémarré.
- Revues Luna B : `tmp/gpt-phase-f2/REVUE_T1_B_CORRECTIONS_LUNA.md` et `REVUE_T1_B_COMPLEMENT_LUNA.md`, contrôle des livres, sondes Store/UI et des raccords catalogue, scope, Brisé/Prière. Les constats sur la récupération du Courroux et la liste UI des attaques précédentes ont été corrigés puis revérifiés ; **53/53** ciblés et **9/9** P5 au dernier complément.
- Principal : **11/11** sur les consommateurs de portée de Tour et Brisé (`t1-corrections-clock-consumers.log`), **30/30** sur les gardes d'erreurs/Actions (`t1-corrections-preview-error-regressions.log`), **7/7** Q35 (`t1-corrections-q35.log`). Les six parcours navigateur passent : cinq runners T1 existants et le nouveau `tests/f2-b-two-weapons.browser.mjs` (logs `t1-corrections-final-*-browser.log`). Le sixième utilise le vrai catalogue et contrôle aussi les trois confirmations létales après changement de cible.
- Première suite complète : **4 814/4 817**, trois échecs (`t1-corrections-full-final.log`). Deux provenaient d'une interception trop large des `TypeError` dans l'aperçu ; le correctif est limité aux erreurs de seconde arme et les refus historiques sont préservés, sans modifier leurs tests. Le troisième était l'attente historique de tir Q35, désormais affectée par le malus de Taille du point 13. Ce premier journal n'est pas la preuve finale.
- Suite complète finale : `node --test --test-concurrency=4`, **4 817/4 817**, zéro échec, annulé ou ignoré, 112 179 ms ; journal `tmp/gpt-phase-f2/t1-corrections-full-verified.log`. Les deux runners B ont aussi été rejoués après la restriction finale du `catch`, avec succès (`t1-corrections-verified-f2-b-combat-actions-browser.log` et `t1-corrections-verified-f2-b-two-weapons-browser.log`). TEMP/TMP = `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-runtime`. Reçu F0 préexistant conservé pour le seul prérequis E0 ; aucune recette F2 de fin de phase n'est revendiquée.
- Contrôle frontières : onze fichiers protégés inchangés, texte initial du plan conservé, LF, aucun nouveau module runtime, `git diff --check` propre. Extension de raccord documentée à la fin de l'appendice Exécution du plan, sans changer son texte initial.

### Adaptations explicites des tests existants

- `f2-a-initiative-surprise.test.js` et son runner navigateur : le tournoi de trois ex aequo est remplacé par le choix direct du MJ ; les oppositions à deux restent exercées. E25 garde ses attentes d'identité/date de scène et reçoit des assertions supplémentaires de portée/Undo.
- `f2-c-weapon-skills.test.js` : une spécialité exacte à zéro donne le repli CC par défaut, Base demeure un choix MJ ; Base à zéro n'est plus étiquetée comme entraînée. `f2-c-claude-regressions.test.js` : l'ancienne priorité automatique de Base entraînée sur la spécialité exacte à zéro est remplacée conformément à la nouvelle décision du MJ.
- `f2-c-ui.browser.mjs` : `materialized:true` seul ne représente plus une arme conjurée à renseigner ; de vrais contrats d'armes conjurées restent testés en parallèle.
- `f2-b-combat-actions.test.js` : compétence Esquive réellement possédée dans la fixture Défensive, arme du tir visé liée à l'action ; mauvais choix de seconde arme attendu non prêt au lieu d'une exception. Le cas seconde arme utilise maintenant Épée/Pistolet/Espadon du catalogue.
- `f2-b-combat-modifiers.test.js` : la demi-distance de 7 yards vaut 3,5 et non 3. `lot2-v5-remaining-talents.test.js` : la fixture du Talent à deux armes possède deux armes utilisables à une main et une première attaque réellement appliquée ; exemptions d'Élan, Parade et quota conservés.
- `pro-q35-taille-formule.test.js` : le tir du Stégadon contre la cible sans Trait reçoit désormais −1 DR ; le test vérifie ce facteur et les dégâts diminués d'un point, tout en conservant l'absence de bonus de dégâts de Taille au tir. Aucune règle n'est changée pour rétablir l'ancien total.

Les tests de caractérisation préalables F2-C/A/B ne sont pas modifiés. Les compléments hors B sont des assertions supplémentaires sur les États et les consommateurs d'identité de Tour. Les limites héritées hors de ces points restent celles consignées plus bas, notamment les qualités bloquantes de Baliste/Catapulte ; aucun lot T2 n'a été commencé.

Date : 25/10/2026. Worktree : `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree`, branche `gpt/phase-f2`, base `d737c5acc47e012039eb3bbf669c8a4df1c34eff` (main, version 3.26.0).

Au dernier contrôle, main a avancé extérieurement à `8ed9099` ; par rapport à la base F2, seuls `tests/browser-index.mjs` et `tests/browser-workspace.mjs` diffèrent. Ces changements n'ont pas été intégrés ici et ne sont pas revendiqués dans les résultats F2. Le code de production de base reste le même ; aucune fusion/rebase de ce worktree n'a été faite.

## Périmètre et état

**Reprise du 25/10 après contre-vérification Claude : C n'est pas livrable dans l'état `1034dc9`.** Le rapport `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_F2-C.md` invalide le verdict favorable précédent : six régressions bloquantes et décisions MJ nouvelles, dont l'extension aux armes conjurées. Les résultats historiques ci-dessous prouvent seulement les vérifications alors effectuées. Correction en cours selon `BRIEF_F2_C_CORRECTIONS_CLAUDE.md`, décisions MJ recopiées et commitées `bbe726b`; caractérisations Store avant correction `5e60fdd`. Nouvelle revue Luna requise avant A puis B. La demande directe du MJ autorise cet enchaînement et impose l'arrêt à la fin de T1.

Le brief F2 autorise les commits locaux et impose un arrêt à la fin de chaque tranche. La tranche autorisée en premier est T1 : C, A, B. Aucune fusion ni publication n'est autorisée. Les 194 règles du JSON restent la liste de référence ; le complément d'exécution du plan décrit les clauses déjà couvertes et les clauses restantes sans changer les décisions du MJ.

| Étape / lot | État | Preuve |
|---|---|---|
| Préparation | FAIT | Worktree neuf depuis main ; aucun changement hérité ; réglages LF ; `npm ci` : 3 paquets, audit npm sans vulnérabilité signalée. |
| Repérage des 194 règles | FAIT, documentaire, `7c576e2` | Audits Luna séparés T1, T2 et T3 ; corrections après revue du principal et contrôle croisé Luna. 45 + 69 + 80 identifiants, sans omission ni doublon. Section Exécution ajoutée au plan sans changer son texte initial. |
| F2-C | CORRIGÉ ET REVÉRIFIÉ LOCALEMENT | `734a3e2`, remplace le verdict initial invalidé par Claude; décisions MJ appliquées, nouvelle revue Luna et validation principale. Limites exactes ci-dessous. |
| F2-A | FAIT `f135c65` | Initialisation et surprise, vrais parcours, revue Luna, 4 757/4 757 et navigateur verts. |
| F2-B | FAIT `a0ebca7` | Modificateurs et actions de combat (16 règles), caractérisations `efcb63e` (6/6), choix `6a2c4c1`, 4 787/4 787 et 5 runners navigateur T1 verts. **Tranche T1 terminée.** |
| F2-D | EN ATTENTE T2 | Fin de T1 atteinte ; contre-vérification Claude et feu vert MJ requis avant T2. |
| F2-E | EN ATTENTE T2 | Après D ; aucun code commencé. |
| F2-N | EN ATTENTE T2 | Aucun code commencé. |
| F2-I | EN ATTENTE T2 | Aucun code commencé. |
| F2-L | EN ATTENTE T3 | Fin de T2 et feu vert ; aucun code commencé. |
| F2-G | EN ATTENTE T3 | Aucun code commencé. |
| F2-M | EN ATTENTE T3 | Aucun code commencé. |
| F2-K | EN ATTENTE T3 | K1 puis K2 ; conception du format K2 à soumettre en fin de T2. |
| F2-F | EN ATTENTE T4 | Fin de T3 et feu vert ; dépend notamment de D et K. |
| F2-H | EN ATTENTE T4 | Aucun code commencé. |
| F2-J | EN ATTENTE T4 | Conception des séquelles à soumettre en fin de T3 ; J1/J2 non commencés. |

## Correction C après Claude — état courant

Code `734a3e2`, caractérisations préalables `5e60fdd` intactes. Les sept décisions du MJ sont recopiées en tête du fichier de choix (`bbe726b`). Les six défauts bloquants Claude sont corrigés : delta CC/CT appliqué une seule fois; ancien lien de mauvaise spécialité résolu par voie licite/repli CC; Siège/Embarquée et alias accessibles aux compétences réelles; score manuel conservé puis effets appliqués; meilleures voies entraînées prises par défaut, y compris spécialité exacte présente à zéro; état monté durable et mains de bâtarde selon catalogue/checkbox. Les armes conjurées comprennent le générateur aethyrique et la Faux de Shyish; les anciennes instances récupèrent leurs données par lien vers la couche/contrat. Le score imposé des Poings de Gork reste prioritaire.

- Principal, code gelé final : `node --test --test-concurrency=4` **4 723/4 723**, zéro échec/ignoré, 107 862 ms; `tmp/gpt-phase-f2/c-claude-principal-verified.log`.
- Acceptation dédiée du codeur : **93/93**, `c-claude-targeted-legal-fallback.log`; remplacement final de la fixture Parade par la vraie compétence Bouclier du catalogue : régressions **14/14**, `c-claude-regressions-real-parade.log`.
- Principal : trois runners navigateur verts après dernier gel, journaux `c-claude-principal-verified-ui.log`, `c-claude-principal-verified-workspace.log`, `c-claude-principal-verified-state.log`. Vraie page index/main : monté/mains, édition concurrente préservée, Undo/Redo/reload, Canon Nain appliqué avec perte de PV puis annulation. Baliste : choix MJ générique et reçu de maîtrise contrôlés, sans application certifiée.
- Nouvelle Luna indépendante à contexte neuf : sources relues, contre-exemples du rapport et de la prérevue rejoués; suites ciblées finales **41/41**. Aucun bloquant vérifié après gel 3; `tmp/gpt-phase-f2/REVUE_C_CORRECTIONS_LUNA.md`.
- Revue du principal : diff de production lu, garde des onze fichiers protégés, texte initial du plan identique octet pour octet, LF, aucune création de module runtime et `git diff --check` verts (`tmp/gpt-phase-f2/check-boundaries.mjs`).

Les deux premières suites principales de correction ont passé 4 722/4 722, avant deux derniers contre-exemples (CC nulle au générateur, voie entraînée masquée par spécialité à zéro). Elles ne prouvent pas le code final. Les journaux distincts sont conservés; le reçu final est `c-claude-principal-verified.log`.

Assertions antérieures F2 modifiées : `tests/f2-c-weapon-skills.test.js` (1) Escrime zéro avec Base entraînée attend désormais le score réel de Base, conformément au défaut Claude n°5, en conservant retrait des Qualités et Défauts; (2) monté absent attend démonté et absence de question récurrente, conformément à la décision MJ. Le nom du premier test et le runner UI reflètent ces comportements. Aucun test de caractérisation pré-code ni test antérieur au chantier F2 n'a été modifié. Les tests nouveaux couvrent application Store, Undo/reload et les vraies générations de sorts; les premiers rouges utiles de la correction sont distingués des erreurs de fixture/import, jamais présentés comme preuve de chaque clause.

Limites actuelles : le contrôle C filtre les attaques, pas les défenses/parades (limite mineure permise à consigner par Claude). Une catégorie générique sans association source reste un choix de compétence MJ, pas un mapping canonique certifié. Baliste/Catapulte peuvent rester bloquées par `precise`/`percutante`, qualités V4 déjà non validées dans la base, hors C; aucun contournement ni moteur de qualité ajouté. Ingénierie personnalisée sans portée/provenance demande sa nature au MJ. Une conjurée dépourvue de toute provenance exploitable réclame les données MJ; elle n'est pas déclarée maîtrisée à partir de son nom. Recette complète de phase non exécutée; **T1 reste à terminer par A puis B**.

## Livraison A — état courant

Production `f135c65`, caractérisations préalables `b25d1ac` intactes. Initiative de combat distincte de l'I historique, d10 PNJ capturé une fois, saisie PJ, BI ajouté une fois; Combat instinctif conserve deux d10 et le choix explicite, préparation legacy reprise avec provenance puis consommée. I modifiée après préparation : nouvelle paire requise, champ historique restauré; I inconnue demandée au MJ. Les égalités utilisent le vrai pipeline de Tests V5, les effets d'État et de magie, puis le choix du vainqueur; tournoi n−1 pour 3+ selon A-EGALITES-01. Surprise par camp et service canonique. Lancement/restart préparés sans mutation puis une commande annulable; reprise/reload conservent les jets. Ordre automatique résolu conservé avec renforts, retour manuel→auto et Souffle froid.

- Principal après gel final : `node --test --test-concurrency=4`, **4 757/4 757**, zéro échec/ignoré, 140 174 ms; `tmp/gpt-phase-f2/a-principal-verified.log`.
- Acceptation dédiée codeur : **148/148**; revue indépendante Luna, sources PDF et repros ciblés : aucun défaut restant vérifié, `tmp/gpt-phase-f2/REVUE_A_LUNA.md`.
- Vrai index/main : `node tests/f2-a-initiative-surprise.browser.mjs`, sortie **0** après gel, `tmp/gpt-phase-f2/a-browser-verified.log`; bandeau/N, rencontre par deux routes, restart/reprise, égalités 2/3 et preuves, Undo/Redo/reload, retour automatique, PJ/PNJ Combat instinctif.
- Principal : diff complet de production relu, frontières/LF/diff-check verts; aucun test hérité ni caractérisation pré-code modifié. Les deux nouveaux fichiers sont les acceptations Node et le runner navigateur.

La première suite A a échoué sur un test hérité de reprise de scène (clés A false/null ajoutées à une scène ancienne); code corrigé sans modifier le test. La passe 4 755/4 755 précède les derniers raccords Combat instinctif et n'est pas la preuve finale. Le reçu courant est 4 757/4 757 ci-dessus. Limites précises : ancien `#btn-start` masqué testé par clic DOM sur son listener; démarrage visible testé par bandeau/N. Aucun exemple source concret d'Avantage au Test d'I trouvé pour éprouver de bout en bout la branche générique d'inversion; Fatigue et modificateur magique d'I réellement testés. Données d'initiative transitoires du combat, aucune nouvelle valeur durable de fiche PJ.

## Livraison B et clôture de la Tranche T1 — état courant

Production `a0ebca7`, caractérisations préalables `efcb63e` intactes (6/6), choix d'exécutant `B-VISIBILITE-01` commité en `6a2c4c1`. Les 16 règles du lot F2-B sont raccordées au moteur, au Store et à l'interface de résolution :
- **Circonstances de Tir (L06 p.166)** : taille relative de la cible explicite (+1 plus grande, +2 Monstrueuse seule selon `B-SIZE-01`, −1 plus petite), bandes de portée (bout portant +2, courte +1, moyenne 0, longue −1, extrême −2) et aides de bandes dérivées de la portée imprimée (y compris formules `BF × n`), cible Surprise (+1), Visée contre la cible désignée (+1), couvert ou cible À Terre (−1 une seule fois, supprimé par Tireur d'élite acquis et actif), météo/lumière au niveau le plus sévère (−1 brouillard/faible lumière, −2 pluie/vent, −3 extrême/obscurité totale selon `B-VISIBILITE-01`), déplacement avant le tir (−1).
- **Circonstances de Mêlée (L06 p.166)** : surnombre (+1) et encerclement (+2) via B12 sans doublon, cible Surprise (+2), avantage/désavantage de hauteur (+1/−1), cible Enchevêtrée (+1), terrain difficile (−1), espace exigu selon allonge déclarée (moyenne −1, supérieure −2, supprimé par Combattant en espace clos), attaquant À Terre (cumul Désavantage d'État ET −1 DR), main secondaire (−2, supprimé par Ambidextre). Aucun modificateur d'attaque ne déborde sur le Test défensif. Aides d'allonge Très longue (4 yards) et Massive (6 yards).
- **Actions spéciales de combat (`extensions.v5.combatActions`)** :
  - **Action Défensive** : consomme le créneau d'Action du Tour, accorde +2 DR aux seules défenses de la compétence choisie pendant les Tours adverses et expire au début du prochain Tour propre de l'acteur. Bloque une seconde Action ordinaire (attaque, magie, Prière) tout en préservant les attaques gratuites/supplémentaires légitimes (ex. Attaque Rapide de Myrmidia).
  - **Viser** : consomme l'Action contre une cible avec une arme à distance tenue confirmée, accorde +1 DR au prochain tir admissible contre cette cible, et s'annule après tir, défense réellement appliquée par le viseur, déclaration de déplacement (`declareV5CombatMovement`) ou autre Action. Le drapeau `aimed` du Talent Tir précis reste distinct.
- **Deux armes** : accessible sans exiger le Talent Maniement de deux armes après une première attaque (même ratée) appliquée dans ce Tour avec une autre arme utilisable à une main ; consomme 1 Élan (exonéré par Maniement de deux armes) et le quota `combat:base-second-weapon` (une fois par Tour même si l'Élan est regagné), avec pénalité de main secondaire (−2) sauf exemption de Talent.
- **Tir sur cible engagée** : applique un Désavantage au tir ; uniquement si l'inversion forcée transforme une touche potentielle en échec, sélectionne aléatoirement (d100 capturé une fois) parmi les combattants engagés désignés par le MJ (cible initiale et alliés compris) et applique les vraies Blessures/conséquences à la cible retenue.
- **Cible sans défense et option létale** : en mêlée ou à bout portant, touche automatique avec jet choisi librement (pouvant déclencher un Critique et sa localisation choisie). L'option létale de table est désactivée par défaut et requiert l'activation de l'option de table, l'intention létale et la confirmation explicite du MJ pour poser `hp: 0` et `extensions.v5.dead: true` (documenté dans `docs/VARIABLES_PERSISTANTES_PJ.md`).
- **Déviation des armes de jet (L06 p.168)** : sur tir raté d'une arme de jet, capture d10 (directions 1–8 relatives à T, 9 pieds du tireur, 10 pieds de la cible) et 2d10 yards plafonnés à la moitié de la distance déclarée par le MJ, consignés au reçu sans déplacement automatique.
- **Tir extraordinaire (Tireur d'élite)** : exige le Talent acquis et actif, une description MJ et une difficulté entière en DR, appliquées au Test et consignées au reçu.
- **Croche-pied (`B-TRIP-01`, L06 p.300 & p.169, L13 p.89)** : après une touche appliquée dans ce Tour avec une arme portant effectivement l'atout `croche-pied` (après filtrage de maîtrise F2-C), dépense 1 Élan et résout l'opposition Force / Athlétisme. Si le défenseur gagne, l'Élan reste dépensé sans chute ni À Terre. Si l'attaquant gagne, la cible passe À Terre ; si elle était montée (`extensions.v5.mounted === true`), elle est démontée et subit une chute verticale de 2 yards (`max(0, 6 − BE)` Blessures sans Armure ; si perte > BE, Test d'Endurance +0 requis avec Critique Jambe sur échec et second Critique sur échec éclatant via le moteur Critique V5 existant).
- **Huit paliers de DR (L06 p.131)** : affichés aux bornes exactes en distinguant réussite marginale (`+0`) et échec marginal (`−0`) par le booléen `success`.

Preuves et vérifications finales de B et T1 :
- **Suite complète Node** (`node --test --test-concurrency=4`) : **4 787/4 787**, zéro échec, zéro ignoré, 110 967 ms ; `tmp/gpt-phase-f2/b-principal-verified.log`.
- **Acceptation ciblée B + régressions E12/E05/Q21/Q35** : **51/51** (dont **30/30** tests F2-B : 6 caractérisations `f2-b-characterization.test.js`, 10 tests `f2-b-combat-modifiers.test.js`, 14 tests `f2-b-combat-actions.test.js`). Aucun test de caractérisation ni test antérieur à F2 n'a été modifié.
- **Parcours navigateur T1 complets** : sortie **0** sur les 5 runners navigateur :
  - `node tests/f2-b-combat-actions.browser.mjs` (`tmp/gpt-phase-f2/b-browser-verified.log`) : Visée, déplacement déclaré, Action défensive et expiration au Tour propre suivant, tir modifié avec application Store et Undo/Redo/reload (Redo ouvert via le menu `#btn-menu`), option létale inactive par défaut puis confirmée (`hp: 0`, `dead: true`) et annulée, Tir extraordinaire, déviation d'arme de jet, tir engagé redirigé vers un allié, allonge Très longue, Croche-pied contre cible montée (démontage + chute E30 + À Terre) et attaque de seconde arme avec dépense d'Élan.
  - `node tests/f2-a-initiative-surprise.browser.mjs` : vert.
  - `node tests/f2-c-ui.browser.mjs`, `node tests/f2-c-workspace.browser.mjs`, `node tests/f2-c-state.browser.mjs` : verts.
- **Contrôle des frontières** (`node tmp/gpt-phase-f2/check-boundaries.mjs`) : `planOriginalPreserved: true`, `protectedFiles: 11`, `lfFilesChecked: 42`, `newRuntimeModules: 0`, `diffCheck: true`.

**Tranche T1 (C, A, B) terminée.** Conformément aux règles communes et aux instructions du MJ, arrêt complet à la fin de T1 : **T2 n'est pas commencé**, aucune fusion ni publication n'est effectuée, en attente de la contre-vérification Claude et du feu vert du MJ.

## Validation historique de la première livraison (supersédée)

**État final du code `1034dc9` :**

- `node --test --test-concurrency=4` exécuté par le principal : **4 707/4 707**, zéro échec, zéro ignoré, 122 123 ms ; `tmp/gpt-phase-f2/principal-final-tests.log`.
- Acceptation ciblée F2 + fiches et régressions de combat : **218/218**, `tmp/gpt-phase-f2/targeted-final.log`. Les deux fichiers Node F2 comptent 29 tests, dont les deux caractérisations et un contrôle de correspondance documentaire ; ce dernier lit le JSON réel et n'est pas une preuve mécanique.
- `node tests/f2-c-ui.browser.mjs` exécuté par le principal : vert ; formulaire isolé, données manquantes, nature Ingénierie, score vide, nom ASCII, contrôle de protection. Journal : `tmp/gpt-phase-f2/principal-ui.log`.
- `node tests/f2-c-workspace.browser.mjs` exécuté par le principal : vert ; vrai workspace et Store, choix MJ sans skillId (Ingénierie tir, score et augmentations), constructeur `v5Input`, nature reçue par le moteur, retour à un Test générique sans ancien groupe parasite. Journal : `tmp/gpt-phase-f2/principal-workspace.log`.
- Vérificateur indépendant : sources ciblées relues et contre-exemples rejoués, verdict favorable ; vraie fiche importée puis Store aperçu/application d'une lance de cavalerie à pied/une main : profil improvisé, BF+1, Défauts conservés, application réussie et cible de 20 à 12 PV. Aucun fichier modifié par le vérificateur.
- `git diff --check`, fins de ligne LF et garde des fichiers protégés : verts. Texte initial du plan, JSON F2, arbitrages, catalogue et fichiers de version intacts.

La suite de référence `node --test --test-concurrency=4`, après préparation des préconditions, est verte : **4 678/4 678 tests**, zéro ignoré, 134 090 ms (`tmp/gpt-phase-f2/baseline-ready-tests.log`). Aucun code modifié au moment de cette référence.

Le premier essai avait 4 669 réussites sur 4 672 tests annoncés, avec trois échecs de préparation : import de dépendance avant la fin de `npm ci`, garde E2 dont le répertoire temporaire doit être extérieur au checkout, test E0 exigeant un reçu préexistant. Correction : dépendances installées, `TEMP`/`TMP` = `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-runtime` (extérieur sur E:), copie authentique du reçu F0 depuis `tmp/gpt-phase-f-worktree/tmp/divin/recipe-receipt.json`, SHA-256 source et copie `d9f7e2e4430fc6eef4dce5287b16b03c0b46b9bd674caf53def16faeeabfcfa9`. Cette copie est uniquement une précondition E0 ; **aucune recette F2 exécutée** à ce stade. Aucun test adapté pour résoudre ces échecs.

Assertions de tests existants modifiées : aucune.

Précision de la caractérisation nouvelle F2-C : `f4da4a9` ajoute uniquement `advances: 1` et `basic` aux deux entrées de compétences de la première fixture, sans changer les assertions ni les résultats attendus. La fixture initiale avait omis ce fait et représentait donc des données d'entraînement inconnues. Avant acceptation de cette correction, les deux mêmes tests avec ces seuls ajouts ont été exécutés en important le moteur **main intact** (`../../js/` depuis la racine du worktree F2) : 2/2 verts. Le cas des données réellement inconnues est couvert séparément par les nouveaux tests métier et doit bloquer avec reçu MJ.

La première trace TDD C (`tmp/gpt-phase-f2/f2-c-step2-red.log`) contient 4 tests, dont 3 rouges : l'un reproduit directement les Qualités conservées à tort ; les autres exposent les gardes de lien existantes à raccorder. Les tests des autres règles ont ensuite été ajoutés pendant la construction du lot. Ne pas présenter cette première trace comme la preuve d'un rouge préalable de chacune des 26 clauses.

Les contre-exemples de relecture ont donné lieu aux corrections et tests : gardes de tir/emplacements ouverts, voies manuelles historiques, familles de compétences homonymes, valeurs nulles, Ingénierie mêlée/tir, Hast avec apostrophe, spécialisations personnalisées, Escrime/Base à zéro, défauts de bâtarde non maîtrisée, compétence Cavalerie conservée à pied, qualités source filtrées avant préambule/talents, dégâts improvisés issus du catalogue et raccord du constructeur UI. Le premier passage global pendant la construction avait neuf échecs ; le journal `full-suite.log` a ensuite été remplacé par les passes corrigées et ne sert pas de reçu de cette passe ancienne. Les résultats finaux de référence sont ceux du principal indiqués ci-dessus.

## Portée de la première livraison (historique remplacé par la correction C ci-dessus)

- Les conséquences de maîtrise sont calculées dans le vrai flux d'équipement de fiche et pour les faits MJ explicitement renseignés. Les données nécessaires absentes bloquent avec reçu ; zéro augmentation et donnée absente sont distincts. Les anciennes actions manuelles sans contrat ni faits d'entraînement restent assistées par le MJ, sans maîtrise inventée (C-MANUEL-01).
- **Armes conjurées / attaques matérialisées des sorts : chemin existant conservé.** Le générateur reprend une compétence, un score MJ ou un score fixé par le sort ; il ne vérifie pas les augmentations. Le traitement nouveau de C n'y réapplique pas la garde générale des compétences avancées. C'est une limite réelle du périmètre d'exécution retenu, à relire avec le MJ, pas une preuve que la règle est déjà couverte sur ces attaques. Ni les sorts ni ce chemin ne sont certifiés exhaustifs par cette livraison. Voir C-MATERIALISEES-01 et la succession avant toute extension ; ne pas attribuer cette exclusion à un arbitrage explicite du MJ.
- `suggestSkill` et les aménagements de choix existants sont conservés ; pas de nouveau contrôle de carrière. F-L06-0847 est conservé selon l'arbitrage, pas réimplémenté.
- A et B ne sont pas commencés : **T1 n'est pas livrée**. L'arrêt de session se fait après le code C validé et ses commits, selon la clause de volume des règles communes. La portée matérialisée ci-dessus reste une réserve à lever si la clôture attendue de C doit l'inclure.
- Recette complète `node tools/run-divine-recipe.mjs` : **non exécutée en F2**. La suite Node et les deux parcours ciblés ne remplacent pas cette recette, requise en fin de phase. Aucun feu vert T2 ni contre-vérification Claude de T1 n'est revendiqué.

## Organisation et sources

Le repérage a été confié à trois sous-agents Luna. C a été codé par un Luna puis relu par un autre à contexte neuf, avec corrections renvoyées au codeur jusqu'au verdict favorable dans le périmètre contrôlé. La revue finale du diff et les dernières exécutions ont été faites par le principal. Même organisation à conserver pour les lots suivants.

Les pages PDF de T1 ont été extraites depuis les PDF du corpus dans `tmp/gpt-phase-f2/sources/` pour lecture ciblée. L'extraction seule ne vaut pas contrôle visuel d'un tableau. Les arbitrages du 25/10 priment sur les choix bruts du journal.

Contrôles du repérage : base du plan conservée octet pour octet ; les 194 identifiants du JSON apparaissent exactement une fois dans les tableaux ; `git diff --check` propre ; aucun fichier suivi en CRLF ; aucun changement de code ni des arbitrages ou du JSON de référence. Les pages sources seront relues pour le code puis lors de la vérification indépendante de chaque lot ; ce repérage ne certifie pas une nouvelle lecture exhaustive des PDF.
