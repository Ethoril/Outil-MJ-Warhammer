# Rapport Claude Pro — lot correctif des décisions du MJ du 22/10

Brief : `docs/plans-gpt/BRIEF_PRO_CORRECTIFS_22_10.md`. Branche `pro/correctifs-22-10`.

| Sous-lot | Statut |
|---|---|
| K1 — Courroux (phase B), points 1 à 7 | FAIT (commit « K1 », voir `git log`) |
| K2 — Brisé (phase C), points 1 à 3 | FAIT (commit « K2 », voir `git log`) |
| K3 — Magie (phase D), points 1 à 6 + Fellstave (K4) | FAIT (commit « K3 », voir `git log`) |
| Runes et familiers (conception) | À FAIRE |

## K1 — ce qui change

1. **B-C45** : Altdorf raté (sans maladresse) ne pose plus d'État Exténué ; le reçu garde `absolution.fatigued: true`, lu comme rappel « Exténué au premier jour de l'aventure suivante » (journal et panneau).
2. **B-C15** : `rejectedTargetIds` dans l'aperçu ; la prière échoue pour la cible réprouvée seule, les effets vont aux autres cibles. Échec complet seulement si toutes les cibles (y compris le prêtre pour un effet « caster ») sont rejetées.
3. **B-C10** : politique de Round fixe `current` (le Round en cours compte comme le premier) ; `wrathRoundPolicy` n'est plus demandé ni lu ; le sélecteur du panneau est remplacé par une mention.
4. **B-C11** : décision d'Action fixe : `count-trigger` si le quota d'Action du Tour est libre, `next-turn` s'il est déjà consommé ; plus de question. Aucune Action bonus.
5. **B-C50** : malus de relique appliqué au total `d100 + 10 × Péché − malus` ; le d100 saisi reste la preuve 1–100. Total ≤ 0 : Courroux évité. Les validateurs de preuve acceptent un écart de 0, 10, 20 ou 30 entre `roll + 10 × Péchés` et `modifiedRoll`.
6. **B-C26** : `defaultFirstMorningAt` (`js/core/v5-game-time.js`) propose la prochaine aube (6 h, seconde 0 lue comme minuit) ; préremplie dans le panneau, exposée dans l'aperçu (`proposedFirstMorningAt`), modifiable. Le premier matin reste une valeur explicite pour la pose.
7. **B-C20** : texte de pénitence facultatif sur 96-100 ; sans texte, la note libre des conséquences suffit et aucun registre n'est créé ; avec texte, suivi complet (Q8 intact). Pas de contradiction avec Q8 : le suivi complet reste disponible pour toutes les pénitences.

## Assertions de tests modifiées (anciens comportements épinglés)

- `tests/divin-v5-b18-supplements.test.js` : « la réduction décale la ligne » (`roll` vaut 16, plus 6) ; « résultat positif non représentable refusé » remplacé par deux tests B-C50 (total accepté ; total ≤ 0 évité).
- `tests/divin-v5-b16-absolution.test.js` : Altdorf raté = rappel sans État (plus un Exténué).
- `tests/divin-v5-b5-prayer-bans.test.js` : choix de politique de Round supprimé (nouveau test B-C10, boucle `current` seulement) ; décision d'Action déduite (76-80 libre → `count-trigger`, Action consommée → `next-turn`).
- `tests/divin-v5-b10-penance.test.js` : 96-100 sans texte accepté avec note libre ; test du suivi structuré conservé.
- Ajouts : B-C15 (`b7-allies`, Bouclier de Myrmidia sur deux cibles) ; B-C26 (`b12-mornings`).

## Choix d'interprétation

- **B-C45** : le brief parle d'un pèlerinage « réussi » ; le code ne posait l'Exténué qu'à l'échec ordinaire (sans maladresse). Seule cette ligne est devenue un rappel. Alternative : rappel aussi sur réussite.
- **B-C11** : « occupe l'Action du Tour » lu comme : la Prière déclencheuse compte si l'Action était libre, sinon l'obligation commence au Tour suivant (ex-choix MJ rendu automatique).
- **B-C26** : la seconde 0 de campagne est lue comme minuit (l'horloge n'a pas d'heure du jour).
- **B-C20** : « note libre conservée » lu comme suivi structuré facultatif (voir ci-dessus).

## K2 — ce qui change

1. **C0-L06-019** : `previewCombatIntimidation` exige `authorTest.sl > defenceTest.sl` ; l'égalité est un échec de l'intimidateur (aucun état posé).
2. **C0-L25-003** : `MASTER_AND_COMMANDER_TALENT` (`talent-master-and-commander`, L25 p.63) ; `leadershipRallySlModifiers({participant, onBoardVessel})` lit le rang du Talent (lignes résolues, ou lignes de fiche reconnues par leur nom) ; `masterAndCommanderRank` en saisie n'est plus lu ; « à bord » reste un fait MJ.
3. **C0-L13-013** : `effectiveSizeAgainstFear({rider, …})` lit `talent-roughrider` sur le cavalier ; `accomplishedRider` n'est plus lu.

Assertions modifiées : `phase-c-c04-intimidation-traits` (égalité = aucun état ; Cavalier accompli par Talent), `phase-c-c03-rally-mount` (Master and Commander par Talent du participant).

Choix d'interprétation : le catalogue des 206 Talents est un instantané épinglé de la feuille source (décomptes et empreintes testés dans six fichiers) ; y ajouter une entrée aurait cassé ces invariants hors périmètre. Le Talent est donc déclaré comme supplément (constante exportée de `js/core/v5-effects.js`), hors du catalogue de 206. Si le MJ veut l'entrée dans le catalogue lui-même, c'est un lot distinct (instantané, contrats, couverture).

## K3 — ce qui change

1. **D-C22** : Revigorer retire un niveau d'Exténué (`removeConditionLevels`) ; plus de pénalité ignorée (Clarté d'Esprit garde le drapeau).
2. **D-C30** : nouveau mécanisme `casterBoostOnDestroy` (contrat) → `casterBoost` dans l'aperçu → couche +10 sur le lanceur pour la durée, seulement si la cible est détruite. Nouveau fait requis `boostedStat` (liste des 10 caractéristiques).
3. **D-C32** : rappel changé : ordre inachevé = démon présent et hostile.
4. **D-C40** : les profils Squelette (p.339) et Zombie (p.340) existent dans le bestiaire de la phase E : branchés (`UNDEAD_SUMMON_PROFILES`, dans `js/data/v5-transformation-bestiary.js` pour ne pas toucher `sw.js`), à la place de `summon.generic` ; sort refusé (`profile-missing`) si le profil manque (interrupteur de test `setUndeadProfilesAvailable`). Armures facultatives non comptées.
5. **D-C51** : `resolution.js` ajoute au résultat d'une résolution le rappel « proposer au MJ de jouer le Test de Blessure Suppurée » quand la cible porte la couche de Nurgle et subit des Blessures (rappel additif, rien d'appliqué).
6. **D-C122** : `healing.onTarget` lit le Bonus d'Endurance du serviteur ; Endurance inconnue = sort refusé avec message.
7. **Fellstave (D-C15)** : texte inversé (réussite d'Intuition = compréhension), en rappel.

Assertions modifiées : `pro-d3` (Revigorer : retire un niveau), `pro-d5` (fait `boostedStat` ajouté aux lancers de Destruction ; Manifestation : rappel « reste et devient hostile »), `tests/helpers/lot3-declared-answers.js` (`boostedStat`). Ajouts : D-C30, D-C40 (×2), D-C51, D-C122.

Choix d'interprétation : D-C40 lu comme « brancher dès que les profils existent » puisqu'ils existent ; D-C22 : un seul niveau retiré (comme Bonne santé) ; D-C51 : rappel dans la résolution plutôt qu'un bouton. `resolution.js` (code partagé à risque) reçoit un ajout de rappel isolé, couvert par un test et la suite complète. `docs/lot3/LOT3_MATRICE_CONTRATS_V5.md` non régénéré (le générateur la dégrade ; contrats JSON régénérés).

## Vérifications

- `node --test --test-concurrency=4` : verte (le test E0 dépend du reçu de la recette) ; K3 : 4053/4053.
- `node tools/run-divine-recipe.mjs` : **RECETTE DIVINE VERTE — 26 commandes** (`tmp/divin/base-manifest.json` recréé depuis les fichiers protégés de HEAD).
- Aucune variable persistante nouvelle.
