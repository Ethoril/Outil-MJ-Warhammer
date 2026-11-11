# Spec · Soins hors rencontre (CAMP-10)

Cadrage du 11/11/2026, sur `7d636b6` (prod 3.45.1). Origine : constat CAMP-10 de l'audit du 08/11 (`docs/RAPPORT_ANALYSE_08_11_2026_ANNEXE.md`) ; le MJ a choisi d'ouvrir les soins partout plutôt que de s'en tenir à un libellé stable.

**Pourquoi.** L'espace Campagne ne soigne que les combattants de la rencontre en cours. Dès que le combat est terminé, les blessures, maladies et séquelles restent au registre mais n'ont plus de patient : elles s'affichent sous « Suivi hors rencontre N » (numéro qui change d'un affichage à l'autre) et ne peuvent plus qu'être archivées. Le MJ veut soigner et suivre un personnage entre deux rencontres, depuis Campagne.

## Décisions du MJ (11/11/2026)

| # | Question | Décision |
|---|---|---|
| Q1 | Qui peut être suivi hors rencontre | **PJ d'office, PNJ gardés.** Un PJ lié à une fiche ou à un personnage persistant est suivi automatiquement. Un PNJ ou une créature ne l'est que si le MJ choisit de le garder ; sinon ses suivis sont archivés. |
| Q2 | PJ sans fiche liée ni personnage persistant | **Proposer de le garder**, comme un PNJ. Rien n'est créé d'office. |
| Q3 | Copies multiples d'un même profil | **Jamais de rapprochement d'office.** Chaque copie gardée devient un personnage à part, nommé à ce moment. Elle ne revient en rencontre que si le MJ la choisit dans Préparer. |
| Q4 | Suivis déjà orphelins dans les sauvegardes | **Tout archiver d'office** à la mise à jour : tout suivi sans propriétaire connu est archivé. |
| Q5 | Qui soigne hors rencontre | **Personnages suivis + soigneur extérieur** dont le MJ saisit le nom et le score. |
| Q6 | Tests quotidiens d'une blessure non bandée | **Oui, comme en rencontre** : l'avance du temps demande les jets des personnages suivis, présents ou non. |
| Q7 | Ouvrir un nouveau suivi hors rencontre | **Oui** : Campagne liste tous les personnages suivis, même sans suivi en cours. |
| Q8 | Nom enregistré à l'ouverture d'un suivi | **Nom du participant + titre de la rencontre** (« Gobelin 2 — Embuscade du pont »). |

## Constats dans le code

- Chaque ligne du registre (blessure, maladie, séquelle) porte l'identifiant d'un **participant de combat**. Cet identifiant est tiré au sort à chaque lancement de rencontre (`js/core/encounters.js:40`) : il ne désigne jamais deux fois le même personnage.
- Toutes les commandes de soin cherchent le patient **et le soigneur** dans le combat en cours (`js/core/store/api-aftermath.js`, `aftermathHealerOf` dans `js/core/store.js:1346`) : PV, États, Résistance, compétence.
- La fiche d'une Blessure Critique (ce qui exige une chirurgie, les séquelles prévues) vit sur le participant. « Terminer le combat » vide les participants sans rien reporter ; « Exporter vers la réserve » ne reporte que PV et États, et seulement vers un personnage persistant lié sans ambiguïté.
- Une ligne de rencontre à plusieurs exemplaires liée à un personnage persistant donne ce lien à **tous** ses exemplaires ; seul le premier reçoit ses PV (`js/core/encounters.js:42` et `:137`).
- L'outil a déjà trois notions de continuité : les **personnages persistants** (Préparer ; PV et États gardés d'une rencontre à l'autre), la trace `ficheWriteback.owners` du chantier H (participants ayant porté un suivi, par fiche) et `v5ResourceIdentity` (propriétaire de la Chance).

### `v5ResourceIdentity` convient-elle ?

**Sa règle, oui ; sa clé, non.**

- Sa règle de prudence est la bonne et la spec la reprend : fiche d'abord, personnage persistant ensuite, **jamais** un nom, un profil ou une copie comme preuve d'identité.
- Elle ne peut pas servir de clé enregistrée sur un suivi :
  1. elle se calcule à partir d'un sujet vivant ; un absent n'en a plus ;
  2. pour un PNJ, une copie ou un PJ sans fiche, elle rend une identité de scène (`copy:<rencontre>:<ligne>:<rang>` ou `copy:<participant>`) : relancer la même rencontre donnerait la blessure de l'ancien « Gobelin 2 » au nouveau ;
  3. sa clé change quand un personnage persistant est lié à une fiche pour la première fois (`persistent:` devient `fiche:`), sans renommage prévu pour ce cas ;
  4. elle désigne le propriétaire d'un solde, pas un corps : rien n'y porte les PV, les États et les Blessures Critiques entre deux rencontres.
- Elle garde un rôle de contrôle : un participant et son personnage suivi doivent avoir la même identité de ressource, pour que Chance et suivis désignent toujours le même personnage.

## Contrat d'identité

- **Personnage suivi** : un personnage qui existe entre deux rencontres, avec ses PV, ses États et ses Blessures Critiques. C'est le personnage persistant de l'outil. Un PJ lié à une fiche en a un d'office ; un PNJ, une créature ou un PJ sans fiche en reçoit un quand le MJ le garde.
- **Un suivi appartient au même personnage** d'une rencontre à l'autre si, et seulement si, il est rattaché au même personnage suivi. Ce rattachement est enregistré sur le suivi ; il ne se déduit jamais d'un nom, d'un profil ou d'un rang dans la rencontre.
- **Invariant** : tout suivi est dans un seul de ces états : rattaché à un participant présent dans une scène (active ou suspendue), rattaché à un personnage suivi, ou archivé. Il n'existe plus de suivi orphelin.
- Un participant de combat représente un personnage suivi quand la rencontre le désigne ; **un seul** exemplaire par personnage suivi et par rencontre.

## Scénarios et critères d'acceptation

### S1 · Un nom qui ne change pas
- **CA1** · À l'ouverture d'un suivi, l'outil enregistre le nom du participant et le titre de la rencontre (« Gobelin 2 — Embuscade du pont ») ; sans rencontre, le nom seul.
- **CA2** · Ce nom s'affiche à l'identique à chaque rendu de Campagne, quels que soient les autres suivis ouverts, résolus ou archivés entre-temps.
- **CA3** · Un suivi rattaché à un personnage suivi s'affiche sous le nom actuel de ce personnage.
- **CA4** · Un ancien suivi sans nom enregistré porte un libellé de repli construit seulement à partir de ses propres données (jour d'ouverture, cause) ; ses données ne sont pas réécrites.
- **CA5** · Le texte « Suivi hors rencontre N » n'apparaît plus nulle part.

### S2 · Fin de rencontre : garder ou archiver
- **CA6** · Quand le MJ termine le combat, les PV, États et Blessures Critiques de chaque personnage suivi sont conservés sans autre action.
- **CA7** · Un PJ lié à une fiche qui a un suivi ouvert, ou des PV perdus, devient personnage suivi sans question.
- **CA8** · Pour chaque autre participant qui a un suivi ouvert (PNJ, créature, PJ sans fiche), l'outil demande « Garder » ou non, dans une fenêtre de l'outil (pas une boîte native du navigateur). Gardé, il devient un personnage suivi nommé selon CA1 ; sinon ses suivis sont archivés.
- **CA9** · Sans aucun participant concerné par CA8, le combat se termine sans fenêtre de plus.
- **CA10** · Retirer un participant du combat en cours applique les mêmes règles à ce participant.
- **CA11** · Un seul ↶ annule la fin du combat avec ses gardes et ses archivages.
- **CA12** · Trois copies d'un même profil, dont deux gardées, donnent deux personnages suivis distincts ; aucun n'est confondu avec la troisième copie ni avec le profil.
- **CA13** · Suspendre une scène ne pose aucune question : les suivis restent rattachés aux participants de la scène suspendue, en consultation seule, avec le message « Reprenez la scène pour soigner ».

### S3 · Soigner depuis Campagne
- **CA14** · Campagne liste les participants de la rencontre en cours, puis les personnages suivis qui n'y sont pas, avec leurs PV. La pastille « Hors rencontre » ne retire aucune opération.
- **CA15** · Pour un personnage suivi hors rencontre, « Soins et décisions disponibles » propose les mêmes opérations que pour un participant présent : soin et bandage, infection, chirurgie, clôture, séquelles, maladies, pertes de caractéristique, cicatrices.
- **CA16** · À faits égaux (score, jet, PV, États), une opération donne le même résultat hors rencontre qu'en rencontre : même reçu, mêmes PV, mêmes États retirés.
- **CA17** · Une Blessure Critique reçue en rencontre peut, hors rencontre, être opérée, voir ses séquelles ouvertes et son suivi clos.
- **CA18** · Chaque opération hors rencontre s'annule par ↶ et survit à un rechargement, à l'export et à l'import d'une sauvegarde.
- **CA19** · Les messages « Les opérations de soin restent liées aux participants présents dans la rencontre » et « Participant absent » disparaissent.

### S4 · Qui soigne
- **CA20** · Le choix du soigneur propose les participants de la rencontre en cours, les personnages suivis, et « Soigneur extérieur ».
- **CA21** · Un personnage suivi soigne avec la compétence lue sur sa fiche ou son profil, sans saisie de score, États et modificateurs compris.
- **CA22** · Pour un soigneur extérieur, le MJ saisit le nom, le score de Guérison (ou de Soins aux animaux), le Bonus d'Intelligence et s'il a le talent Chirurgie ; le reçu porte ce nom et la mention « extérieur ».
- **CA23** · Sans le talent Chirurgie déclaré, un soigneur extérieur est refusé pour une chirurgie, comme un personnage.

### S5 · Retour en rencontre
- **CA24** · Un PJ lié à une fiche, composé dans une rencontre, y entre avec les PV, États, Blessures Critiques et suivis de son personnage suivi, sans choix dans Préparer.
- **CA25** · Un PNJ gardé n'entre dans une rencontre que si le MJ le choisit dans Préparer ; lancer une rencontre qui utilise son profil ne le reprend pas.
- **CA26** · Sur une ligne à plusieurs exemplaires, seul le premier représente le personnage suivi ; les autres sont de simples copies, sans ses suivis ni sa Chance.
- **CA27** · Les soins faits pendant la rencontre s'appliquent au même suivi que ceux faits avant, et restent au personnage après la fin du combat.

### S6 · Le temps avance
- **CA28** · Avancer le temps demande les Tests quotidiens de Résistance d'une blessure non bandée pour tout personnage suivi, en rencontre ou non.
- **CA29** · Le score proposé pour ces Tests vient de la fiche ou du profil du personnage suivi.
- **CA30** · La ligne « Patient(s) hors du combat, aucun Test attendu » ne peut plus viser un personnage suivi.

### S7 · Ouvrir un suivi hors rencontre
- **CA31** · Avec le filtre « Tous », Campagne montre tous les personnages suivis, même sans suivi en cours.
- **CA32** · Le MJ peut ouvrir une maladie pour un personnage suivi hors rencontre.
- **CA33** · Le MJ peut ouvrir un suivi de Blessures perdues pour un personnage suivi hors rencontre qui a perdu des PV ; il est refusé s'il n'en a perdu aucun.

### S8 · Sauvegardes existantes
- **CA34** · À la première ouverture après la mise à jour, un ancien suivi d'un PJ lié à une fiche, dont l'outil a gardé la trace, est rattaché au personnage suivi de ce PJ.
- **CA35** · Tout autre ancien suivi sans propriétaire est archivé ; une ligne du journal en donne le nombre.
- **CA36** · L'aperçu de « Envoyer aux fiches » est le même avant et après la mise à jour : aucune séquelle permanente déjà attribuée à un PJ n'est perdue ni envoyée deux fois.
- **CA37** · Rouvrir la sauvegarde ne rejoue pas la transformation.

### S9 · Garde-fous
- **CA38** · Deux personnages suivis liés à la même fiche : l'outil ne choisit pas ; il le signale et demande au MJ lequel garder.
- **CA39** · Supprimer un personnage suivi qui a des suivis ouverts demande confirmation et archive ces suivis.
- **CA40** · Lier pour la première fois un personnage suivi à une fiche ne détache aucun de ses suivis.
- **CA41** · Un participant et son personnage suivi ont la même identité de ressource (`v5ResourceIdentity`).
- **CA42** · Les soins d'un participant présent dans la rencontre, depuis « Suites de combat » comme depuis Campagne, donnent les mêmes résultats qu'en 3.45.1.

## Dépendances

- **ARCH-10 (version des données de sauvegarde)** : S8 transforme des sauvegardes existantes, une seule fois. Elle a besoin de l'étape de version décidée le même jour dans un autre chantier ; elle ne se livre pas avant et n'invente pas son propre mécanisme. En attendant, les anciens suivis s'affichent sous le libellé de repli (CA4) et restent archivables à la main, comme aujourd'hui.
- S1 à S7 et S9 n'en dépendent pas : les champs nouveaux d'un suivi, absents d'une ancienne sauvegarde, se lisent comme vides.

## Hors périmètre

- Écrire les Blessures courantes sur la fiche du site (décision Q4 du chantier H : outil seul).
- Un bouton « Rattacher à… » pour les anciens suivis (écarté par Q4).
- Soigner hors rencontre depuis « Suites de combat » : ce panneau reste celui des participants présents.
- Guérison naturelle, repos et soins magiques hors rencontre : aucune règle nouvelle ; seules les opérations existantes s'ouvrent.
- Synchronisation entre onglets ou appareils (un seul utilisateur, un seul endroit).
- CAMP-11 (échappement des sélecteurs de focus) et CAMP-12 (tests unitaires de Campagne au-delà de ce chantier).

## Choix de Claude à confirmer à la relecture

Ils découlent des décisions ci-dessus mais n'ont pas été posés en question :

1. Un PJ lié à une fiche reçoit son personnage suivi d'office (CA7), même s'il n'en avait pas dans Préparer.
2. Retirer un participant en cours de combat pose la même question que la fin du combat (CA10).
3. Scène suspendue : consultation seule (CA13).
4. Ligne à plusieurs exemplaires : seul le premier porte le personnage (CA26) ; aujourd'hui tous reçoivent le lien.
5. « Tout archiver d'office » épargne les PJ à fiche dont la trace existe (CA34), pour ne pas casser « Envoyer aux fiches ».
6. Soigneur extérieur : nom, score, Bonus d'Intelligence et talent Chirurgie saisis (CA22), parce que le calcul du soin en a besoin.
