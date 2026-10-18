# Conception des registres E1 et du schéma E2

17 octobre 2026. Proposition principale v1 à faire contrôler avant développement. Ce document fixe les responsabilités et les API; il ne certifie ni lecture des 17 livres ni intégration de nouvelles mécaniques.

## Première tranche autorisée

E0 corrige uniquement la provenance des neuf miracles supplémentaires. E1 crée le relevé vérifiable de toutes les pages et les premières clauses relues. E2 établit un schéma de travail distinct des contrats exécutables existants. Les contrats runtime restent en schemaVersion 1 et leur statut ne change pas par une entrée d'audit. Les lots E3 à E11 restent ouverts.

## Nouveaux fichiers et responsabilités

| Fichier | Responsabilité et API |
| --- | --- |
| `tools/divine-audit-data.mjs` | Source éditable des dispositions de lecture, identités, associations, clauses et liens. Exporte `auditEvidence`; aucune lecture de PDF au runtime, aucun texte intégral. |
| `tools/build-divine-audit.mjs` | Générateur Node déterministe, garde cwd avant toute lecture/écriture, validation stricte, mode `--check`. Importe le manifeste corpus et `auditEvidence`; produit seulement les sorties ci-dessous. |
| `docs/divin/DIVIN_AUDIT_PAGES.json` | 2 694 dispositions initiales, une par page physique et livre; défaut `not-explored`. Lectures et vérifications visuelles effectives uniquement. Dénominateurs issus du manifeste, jamais constants recopiées sans validation. |
| `docs/divin/DIVIN_AUDIT_CLAUSES.json` | Identités, associations et clauses sourcées; axes source/développement/vérification/exécution séparés. Liste des dépendances manquantes et désaccords encore ouverts. |
| `docs/divin/DIVIN_AUDIT_SYNTHESE.md` | Synthèse française générée des comptes bruts par catégorie et limites. Aucun pourcentage global. |
| `tests/divin-v5-audit.test.js` | Tests de développement de validation et génération. |
| `tests/divin-v5-audit-independent.test.js` | Tests adversariaux possédés par le contrôleur, pas par l'auteur du générateur. |

Aucun nouveau module runtime n'est autorisé par cette tranche. Les propositions ci-dessous pour E3/E4/E5 doivent être contrôlées et confrontées aux sources avant leur implémentation.

## Entrées E1 et preuve de lecture

`auditEvidence` est un objet `{schemaVersion:1,readings:[],identities:[],associations:[],clauses:[],decisions:[],anomalies:[]}`. Le manifeste existant reste l'autorité des chemins, hash et pages. Les anciennes listes vides de `DIVIN_CORPUS_LIVRES.json` sont la capture historique du plan; la nouvelle vérité courante est produite par le générateur d'audit, clairement référencée dans l'état/passation.

Une lecture contient `{id,bookId,fileSha256,physicalPage,printedPage,reader,role,classification,reason,evidencePath,visualEvidencePath}`. `role` vaut `first` ou `independent`; `classification` vaut `religious-candidate`, `dependency`, `out-of-scope` ou `visual-pending`. Le motif est français et non vide, y compris pour une exclusion. Les deux rôles sur une même page ne peuvent partager le même lecteur. Les preuves pointent vers les notes présentes et lisibles, les rendus privés par chemin hors dépôt. Une extraction, un hash, un index automatique ou la seule création de la disposition ne créent jamais une lecture.

Page imprimée inconnue : `null` et explication dans le motif, jamais décalage présumé. Une page sans texte exige une preuve visuelle avant de compter comme explorée. Une page classée `visual-pending` reste à explorer. Deux classifications différentes créent un désaccord explicite et empêchent `verified`; elles ne se résolvent pas par écrasement du premier relevé. Une confrontation explicite sourcée par le principal sera nécessaire pour les fermer.

Le générateur refuse pages hors bornes, bookId inconnu, hash différent, rôle invalide, double identifiant de lecture, lecture dupliquée livre/page/rôle, motif vide, seconde lecture par le premier auteur et preuve de notes inexistante. Il trie par bookId et page, puis identifiant; aucune date système ne doit faire varier les sorties. Les dates de lecture sont des données source.

## Identités et clauses E2

Identité : `{id,bookId,canonicalName,frenchName,aliases,tradition,actorKinds,category,sourceRefs,status}`. `category` distingue blessing, miracle, talent, rite, ritual, rune, artifact, gift, pact, innate-power, common-rule et stricture. Un alias ne crée pas une seconde identité. Une bénédiction générique existe une fois; les 60 liens aux cultes sont `associations` avec id, cult, identityId et sourceRef. Un identifiant reste stable après correction d'orthographe.

`sourceRef` : `{bookId,fileSha256,physicalPage,printedPage,section}`; si une clause continue, plusieurs sourceRefs sont conservées. L'édition source n'est jamais remplacée par la cible V5. `adaptation` contient statut, écarts, décisions et preuve; une source V4 reste V4 même une fois adaptée.

Clause : `{id,identityId,kind,summaryFr,sourceRefs,sourceStatus,developmentStatus,verificationStatus,executionMode,trigger,acquisition,costs,usage,test,targets,facts,opposition,outcome,duration,stacking,recovery,failure,adaptation,contractId,integrationPoints,proofs,readers,developer,verifier,principalVerdict}`. Champs non applicables : `null` avec raison en français dans `notApplicable`, pas suppression silencieuse. Valeur encore inconnue : objet `{status:'unresolved',reason}` et anomalie liée; ce champ ne devient pas non applicable.

Une entrée `mixed` n'est pas une clause finale : décomposer les éléments mécanique et narratif. `executionMode` : `automatic`, `mj-fact-then-executed`, `narrative-reminder`, `material-confirmation` ou `blocked`. Une clause mécanique ne peut être `narrative-reminder`. Une confirmation de coût matériel doit être séparée de la conséquence mécanique.

Axes autorisés : source `to-explore/read/independently-checked/v5-explicit/v4-adaptation-required/adaptation-decided/open-contradiction`; développement `not-started/developed/wired/correcting/integrated`; vérification `not-run/executed/developer-tested/independently-tested/principal-validated`. La source V5 explicite n'implique pas intégration. Une mécanique intégrée exige contractId, integrationPoints, preuves et contrôleur distinct. La validation principale ne peut être fabriquée par le nombre de tests.

Les neuf miracles Up in Arms gardent `v4-adaptation-required`, `blocked`, développement non commencé; aucun contrat V5 actif ne découle de leur inventaire. Sur un Terrain Mortel conserve l'anomalie de durée ouverte.

## Comptes et conformité

Sorties séparées : total pages, première lecture effective, contrôle indépendant effectif, pages doublement classifiées et sans désaccord, visuels requis/contrôlés, livres fermés, identités par catégorie, associations, clauses mécaniques/narratives, faits MJ, coûts matériels, mécaniques développées/raccordées/validées et anomalies. Une page doublée compte une seule fois. Les ensembles d'indices sont conservés pour reproduire les comptes. Un livre ne peut être fermé sans toutes ses pages doublement couvertes, visuels requis et désaccords résolus.

Le générateur ne modifie ni `DIVIN_ETAT_PLAN.json`, ni la passation, ni les reçus historiques; leur mise à jour est une commande de fin d'incrément explicite. `--check` ne crée aucun dossier/fichier. Aucun PDF/texte intégral n'est copié dans ces sorties, le paquet ou le SW. Les noms source courts et les synthèses françaises suffisent.

## Contrats d'intégration à contrôler avant E3/E4/E5

- Accès E3 : futur `js/core/v5-divine-access.js`, API pure `resolveDivineAccess(actor,contract,{sceneId,grants})`, puis commandes Store de création/révocation motivées et consommation uniquement à la commande pertinente. Autorisation locale `{id,actorId,tradition,prayerId,scope:'once'|'scene'|'durable',sceneId,reason,revokedAt,consumedBy}`. La fiche reste prioritaire. Le grant ne fournit jamais une adaptation manquante.
- Tests E4 : réutiliser `previewV5Test`/`selectV5Test` de `v5-roll.js`. Futur `js/core/v5-test-context.js` résout uniquement les scores courants, compétences, États, modificateurs et ressources; il ne recopie aucune mathématique de jet. L'opposition reste `resolveV5Opposition`. Source/page exigée pour chaque pénalité et événement d'utilisation de ressource.
- Temps E5 : futur `js/core/v5-game-time.js`, API pure `advanceGameClock(clock,event)` avec événements de combat existants et avance explicite des minutes de campagne, jamais `Date.now()`. Échéances typées et phases sourcées. Migration des couches magie/divin, pas second calcul de durée parallèle. Aucun choix par défaut non sourcé de fin de Round.
- Conséquences locales E6 : futures données `state.extensions.v5.divineSubjects` et `localConsequences` référencées par identifiant stable, séparées du socle importé, présentes hors combat, migrées/sanitisées sans effacer les extensions légitimes. Le schéma exact attend le contrôle E2 et les premières clauses.
- Aperçus : étendre la capture existante, inclure scène/horloge/sujets/grants et versions; revalider contrat, sources, faits et état courant à l'application atomique. Aucun effet ou coût lors du calcul. Conserver refus des captures forgées/toJSON, idempotence et réessai après sauvegarde refusée.
- UI : contrat de formulaire décrit les vrais dés, choix, faits et confirmations. Les libellés restent français; statut assisté clairement visible tant que le vrai hook n'est pas prouvé. Toute nouvelle ressource runtime va dans le précache SW et le paquet.

## Contrôle requis

Le contrôleur examine la frontière audit/runtime, les faux comptes de lecture, l'indépendance, les clauses mixtes, les entrées invalides, les pages sans texte, le mauvais cwd et le mode sans mutation. Les tests doivent montrer le rouge avant la correction et le vert final sur le même arbre. La recette globale du code est relancée après les corrections E0, indépendamment de cette conception documentaire.

## Précisions acceptées après revue indépendante

Les six réserves de `DIVIN_E0_CONTROLE_INDEPENDANT.md` sont acceptées. La tranche E1 peut être développée avec comparaison exacte de l'ensemble livre/page, validation effective des chemins de preuve, lecteurs distincts, liens/enums fermés et verdict principal jamais inféré. Pour lever l'ambiguïté, le schéma de registre emploie `runtime-exercised` à la place de `executed` dans l'axe de vérification; le plan conserve le sens général « exécuté » et les reçus de commandes restent un champ distinct. La valeur `principal-validated` exige un verdict explicite `{reviewer,evidencePath,reason}` et l'auteur ne peut se déclarer contrôleur indépendant.

Déploiement de la tranche : commencer par les dispositions de pages et les sources effectivement lues; les identités/associations/synthèses partielles E1 ne sont pas des contrats complets E2. Une synthèse de miracle n'est pas encore une décomposition intégrale en clauses. Le générateur doit afficher cette distinction et refuser de compter un contrat mécanisé/intégré sans toutes les preuves. Aucun total d'identités ne ferme E1 ou E2.
