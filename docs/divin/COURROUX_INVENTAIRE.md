# Inventaire du Courroux des dieux — phase B0

20 octobre 2026, worktree `glm/inv-B0`. Rapport d'inventaire sans code ni test : il recense chaque règle de Péché, de la table de la Colère des dieux, des leçons et des pénitences dans le corpus fermé (`docs/divin/DIVIN_CORPUS_LIVRES.json`, L01-L17, plus L18 du manifeste complémentaire), puis la compare à l'implémentation courante. Données structurées : `docs/divin/COURROUX_INVENTAIRE.json` (69 entrées, mêmes identifiants).

Méthode : pages ciblées extraites par `pdftotext -layout -f <p> -l <p>` après repérage par mot-clé sur le livre entier ; pages imprimées recoupées avec le numéro de pied de page. Preuves d'implémentation par `grep` sur `js/` et `tests/` (fichier:ligne ou nom de test). Les résumés sont des paraphrases ; les extraits sources cités ne dépassent pas douze mots.

## Statuts et décompte

| Statut | Définition | Total |
| --- | --- | --- |
| engine | conséquence mécanique appliquée par le moteur, avec tests | 8 |
| assisted | résolution assistée (déclencheur, jet, ligne de table et décrément automatisés ; conséquences laissées au MJ via texte libre) | 28 |
| reminder | présent uniquement en rappel (règle typée manuelle du registre, clause de contrat ou donnée source d'audit, sans flux) | 10 |
| absent | aucune trace dans l'implémentation | 23 |

Le socle déjà câblé : déclencheurs (maladresse, unités <= Péché), +10 par Péché, ligne de table, décrément de 1 Péché, blocage tant que le Courroux n'est pas résolu. Lignes pleinement mécanisées : 06-10 (plafond calendaire), 11-15 (leçons), 61-65 (Hémorragique), 89-95 (Brisé).

## Système de Péché et règles communes (L06)

| ID | Source (p.) | Règle | Statut | Preuve clé | Risque |
| --- | --- | --- | --- | --- | --- |
| l06-217-sin-award | L06 217 | Le MJ attribue 1+ Péchés par commandement enfreint, sans plafond. | assisted | `js/ui/v5-divine-panel.js:104-106`, `js/core/v5-divine-store.js:444-451` | Saisie manuelle oubliable |
| l06-217-fumble-wrath | L06 217 | Maladresse au Test de Prière → jet sur la table. | engine | `js/core/v5-divine-engine.js:445` | Faible |
| l06-218-sin-trigger | L06 218 | Unités du d100 <= Péchés → Colère, même si succès. | engine | `js/core/v5-divine-engine.js:443-445`, `tests/divin-v5-control.test.js` | Littéral : Péché 0 fait déclencher tout jet finissant par 0 |
| l06-218-wrath-roll-plus10 | L06 218 | +10 au jet de table par Point de Péché. | engine | `js/core/v5-divine-engine.js:469` | Faible |
| l06-218-sin-decrement | L06 218 | Après application du résultat, -1 Péché (minimum 0). | engine | `js/core/v5-divine-engine.js:485` | Décrément avant la fin des effets différés (conforme source) |
| l06-218-gm-discretionary | L06 218 | Le MJ peut lancer/piocher sur la table après une insulte aux dieux. | absent | aucun chemin hors Test de Prière (`js/core/v5-divine-engine.js:444-445`) | Faible |
| l06-217-cult-commandements | L06 205-214 | Commandements des dix cultes, base de l'attribution des Péchés. | reminder | `docs/divin/sources/L06-strictures.mjs`, `tools/divine-audit-data.mjs:3` | Attribution arbitraire sans rappel |
| l06-220-petty-concerns | L06 220 | Usage répété de prières : 1 à 3 Péchés à la discrétion du MJ. | reminder | règle `divine-overuse` (manuelle) du registre | Faible |
| l06-219-absolution | L06 219 | Test de Prière d'imploration pour retirer 1+ Péchés (risque la table). | absent | grep `absolution` dans `js/` : rien | Moyen : contournement manuel sans risque |
| l06-219-penance-definition | L06 219 | Définition et suivi des pénitences exigées par la table. | absent | grep `pénitence` dans `js/` : rien | Élevé : pivot de quatre lignes |
| l06-219-cult-penances | L06 205-214 | Exemples de pénitences par culte. | absent | aucune donnée | Faible |
| l06-219-divine-servants | L06 219 | Construction des Serviteurs divins (consommés par 141-145). | absent | invocations limitées aux bêtes (`js/data/divine-summon-profiles.js`) | Moyen |

## Table de la Colère des dieux (L06 p.218-219)

Les 31 lignes sont dans le registre source-validé (`js/data/v5-divine-contracts.json`, `wrathTable`) ; la sélection, le rappel affiché et les conséquences en texte libre sont communs (`js/core/v5-divine-engine.js:470-500`, `js/core/v5-divine-store.js:279-296`, `tests/divin-v5-control.test.js:266-281`).

| Ligne | ID | Effet (paraphrase) | Statut | Automatisation proposée | Risque |
| --- | --- | --- | --- | --- | --- |
| 01-05 | l06-218-wrath-01-05 | Visions ; Test de Calme +2 DR, échec : 1 Sonné. | assisted | Aperçu du test + pose assistée de Sonné | Faible |
| 06-10 | l06-218-wrath-06-10 | Prières réussies plafonnées à +0 DR, huit jours. | engine | déjà résolue sans texte libre | Faible |
| 11-15 | l06-218-wrath-11-15 | -1 DR à Prière pendant 1d10 + Péchés Rounds. | engine | déjà résolue (d10 explicite) | Moyen (hors combat) |
| 16-20 | l06-218-wrath-16-20 | À terre jusqu'à réussite de Prière +2 DR. | assisted | Pose d'état avec retrait conditionné | Moyen |
| 21-25 | l06-218-wrath-21-25 | Interdiction de prier 1d10 Rounds. | assisted | Couche typée bloquante | Élevé (rien n'empêche de prier) |
| 26-30 | l06-218-wrath-26-30 | -1 DR aux compétences du dieu, 1d10 + Péchés heures. | assisted | Sélecteur de compétences + couche calendaire | Moyen |
| 31-35 | l06-218-wrath-31-35 | Interdiction de prier 1d10 + Péchés Rounds. | assisted | Couche typée bloquante | Élevé |
| 36-40 | l06-218-wrath-36-40 | 1 + Péchés Blessures (sans BE/PA) ; Résistance +2 DR sinon Sonné. | assisted | Dégâts + test assisté | Moyen |
| 41-45 | l06-218-wrath-41-45 | Alliés À terre ; prières du dieu les visant échouent 1d10 + Péchés jours. | assisted | Marqueur « réprouvé » lu par le moteur | Élevé |
| 46-50 | l06-218-wrath-46-50 | Interdiction de prier 2d10 + Péchés Rounds. | assisted | Couche typée bloquante | Élevé |
| 51-55 | l06-218-wrath-51-55 | 1d10 + Péchés Blessures ; Résistance +0 DR sinon Sonné. | assisted | Dégâts + test assisté | Moyen |
| 56-60 | l06-218-wrath-56-60 | -1 DR à une compétence du dieu, 1d10 + Péchés jours. | assisted | Sélecteur + couche calendaire | Moyen |
| 61-65 | l06-218-wrath-61-65 | 1 + Péchés états Hémorragique. | engine | déjà résolue (`wrathConditionRules`) | Faible |
| 66-70 | l06-218-wrath-66-70 | À terre + 3 Aveuglé ; retrait par Prière +0 DR (1 + DR). | assisted | Pose d'états + retrait conditionné ; sélecteur quantité | Moyen (divergence V4 FR) |
| 71-75 | l06-218-wrath-71-75 | 1d10 + Péchés Blessures (sans BE/PA) ; Résistance -1 DR sinon Sonné. | assisted | Dégâts + test assisté | Moyen |
| 76-80 | l06-218-wrath-76-80 | Prière imposée comme Action, 1d10 + Péchés Rounds. | assisted | Rappel de début de Round | Moyen |
| 81-87 | l06-218-wrath-81-87 | 2d10 + Péchés Blessures ; Résistance -2 DR, échec aggravé en Sonnés. | assisted | Dégâts + test assisté ; sélecteur | Moyen (divergence V4 FR) |
| 88 | l06-218-wrath-88 | Un démon inférieur apparaît à 2d10 yards et attaque. | assisted | Participant hostile au choix MJ ; sélecteur nombre | Moyen (divergence V4 FR) |
| 89-95 | l06-218-wrath-89-95 | 1 + Péchés états Brisé. | engine | déjà résolue (fuite/Sprint manuels, E6) | Faible |
| 96-100 | l06-218-wrath-96-100 | Pénitence imposée. | assisted | Objet « pénitence » sur l'acteur | Élevé (sans suivi) |
| 101-105 | l06-219-wrath-101-105 | 0 Blessure + Inconscient jusqu'à récupération d'1 Blessure. | assisted | Application Blessures + état marqué | Moyen |
| 106-110 | l06-219-wrath-106-110 | Perte de Béni/Invocation 1d10 + Péchés jours. | assisted | Couche « talents suspendus » lue par l'accès | Élevé |
| 111-115 | l06-219-wrath-111-115 | Possessions confisquées ; restitution par pénitence. | assisted | Liste de retrait + compteur de pénitences | Moyen |
| 116-120 | l06-219-wrath-116-120 | Perte de Béni/Invocation 2d10 + Péchés jours. | assisted | Couche « talents suspendus » | Élevé |
| 121-125 | l06-219-wrath-121-125 | Prochain renouvellement de Chance limité à 1 point. | assisted | Marqueur lu au renouvellement ; sélecteur | Moyen (divergence V4 FR) |
| 126-130 | l06-219-wrath-126-130 | 0 Blessure + Enflammé. | assisted | Application Blessures + état | Moyen |
| 131-135 | l06-219-wrath-131-135 | Hémorragique chaque matin jusqu'à pénitence. | assisted | Couche quotidienne adossée à l'horloge | Élevé |
| 136-140 | l06-219-wrath-136-140 | Excommunication : talents rendus par 2 pénitences ; malus social -3 DR. | assisted | Couche pilotée par le compteur de pénitences | Élevé |
| 141-145 | l06-219-wrath-141-145 | Serviteur divin à 1d100 yards, agit selon le dieu. | assisted | Participant serviteur au choix MJ | Moyen |
| 146-150 | l06-219-wrath-146-150 | Rejet définitif : perte permanente Béni, Invocation, avances de Prière ; malus social. | assisted | Commande annulable de mutation de fiche | Élevé |
| 151+ | l06-219-wrath-151-plus | Jugement dernier ; Point de Destin pour revenir, puis subit Je vous rejette. | assisted | Dépense de Destin depuis le registre de ressources | Moyen |

## Prières du livre de base portant sur le Péché (L06)

| ID | Source (p.) | Règle | Statut | Preuve clé |
| --- | --- | --- | --- | --- |
| l06-229-shackles-of-truth | L06 229 | Accusation fausse sous « Entraves à la vérité » → jet immédiat sur la table. | reminder | clause manuelle `false-accusation-wrath` du contrat |
| l06-229-sword-of-justice | L06 229 | Crime sur un adversaire inconscient → +1 Péché par crime. | reminder | clause manuelle `sin` du contrat |
| l06-195-ranalds-wrath-event | L06 195 | Événement « Colère de Ranald » : -1 Chance max une aventure ; nom porteur, sans Péché ni table. | absent | aucune donnée d'événements dans `js/` |

## Comparaison avec la traduction française V4 (L05)

Le manifeste déclare l'édition V5 EN autoritaire (`authoritativeEdition`) ; le registre est construit sur L06. L05 sert de référence de nomenclature. Divergences relevées ligne à ligne (statut « absent » = la variante V4 FR n'est pas implémentée) :

| ID | Ligne | L05 (V4 FR) | L06 (V5 EN, implémenté) |
| --- | --- | --- | --- |
| l05-218-table-v4fr | table | même architecture, p.218-219 | rappel : pas de double registre |
| l05-218-div-notation | 11-15, 26-30, 56-60 | malus notés -10 | -1 DR |
| l05-218-div-01-05 | 01-05 | Test de Résistance Accessible | Test de Calme Accessible (+2 DR) |
| l05-218-div-66-70 | 66-70 | 1 + Péchés états Aveuglé | 3 états Aveuglé |
| l05-218-div-81-87 | 81-87 | échec <= -4 DR : Inconscient (1d10 Rounds min.) | +1 Sonné par tranche de -1 DR |
| l05-218-div-88 | 88 | 1d10 démons inférieurs | un démon inférieur |
| l05-219-div-121-125 | 121-125 | trait psychologique personnalisé (p.190 V4) | prochain renouvellement de Chance : 1 point |

## Suppléments du corpus

| ID | Source (p.) | Règle | Statut | Preuve clé |
| --- | --- | --- | --- | --- |
| l01-069-hospice-sin | L01 69 | Grand Hospice de Shallya : manquements graves → Péchés, voire jet sur la table (renvoi explicite aux p.218-219 du socle). | absent | aucune trace dans `js/` |
| l02-018-temple-event | L02 18 | Événement de temple : endosser la faute d'un fidèle = 1 Péché (branche bonus social). | absent | aucune donnée d'événements |
| l02-046-handrich-profit-sin | L02 46 | Miracle d'Handrich sans profit pour le prêtre → +1 Péché (les six Miracles). | reminder | clauses `profit-sin` des contrats Handrich |
| l02-047-shake-on-it-break-sin | L02 47 | « Tope là » : rompre l'accord → +1 Péché. | reminder | clauses du contrat `handrich:shake-on-it` |
| l02-051-khaine-strictures-penances | L02 51 | Commandements et pénitences de Khaine (culte interdit). | absent | aucun contrat Khaine dans le registre |
| l02-053-solkan-strictures-penances | L02 53 | Commandements et pénitences de Solkan ; conseil MJ d'exploiter la pente des Péchés. | absent | contrats Solkan sans données de commandements |
| l02-055-solkan-purity-gate | L02 55 | Solkan refuse toute prière d'un prête ayant Péché ou Corruption. | reminder | rappel `solkan-purity` sur les 12 contrats ; pas de blocage moteur |
| l04-018-lose-the-loot | L04 18 | « Perdez le lot » : sans Péché, le receleur traite au minimum. | reminder | clause `fence-attitude` du contrat Ranald |
| l08-099-elf-priests-exempt | L08 99 | Prêtres hauts elfes : Péchés et commandements sans effet ; tenets et bonus MJ à la place. | absent | aucune exemption dans le moteur |
| l10-020-shrine-sin-removal | L10 20 | Sanctuaire routier : prier sur place retire 1 Péché (Taal, Ulric, Sigmar). | absent | aucune trace |
| l13-070-myrmidia-strictures | L13 70 | Lecture nuancée des commandements de Myrmidia (souffrance inutile = colère ; ordres contestables). | absent | aucune donnée de commandements L13 |
| l13-079-vindicte-vengeresse | L13 79 | Miracle « Vindicte Vengeresse » : charger l'ennemi impénitent, relances de CC ; nom porteur sans lien Courroux. | reminder | contrat `divine:miracle:vindicte-vengeresse` (manual) |
| l17-negative-sweep | L17 — | Balayage négatif : aucune règle Courroux/Péché dans Winds of Magic. | absent | grep plein texte : 0 occurrence |
| l18-028-taal-sin-award | L18 28 | Ours tuée dans la rencontre : Taal peut infliger des Péchés (MJ, non-prêtres inclus). | absent | aucune trace |
| l18-049-ulric-omens | L18 49 | Présages d'Ulric comme rappel amical de réduire ses Péchés. | absent | aucune trace |
| corpus-negative-sweep | L03, L07, L11, L12, L14, L15, L16 | Balayage négatif : rien à implémenter (L03 p.88 : rumeur « Forest's Wrath », nom seul). | absent | grep plein texte : 0 occurrence mécanique |

## Questions ouvertes (sélecteurs MJ à créer)

1. **01-05, caractéristique du test** : Calme (V5 EN, implémenté dans le rappel) ou Résistance (trad. FR V4). Sélecteur par table.
2. **66-70, quantité d'Aveuglé** : 3 (V5) ou 1 + Péchés (V4 FR). Défaut proposé : V5.
3. **81-87, échec aggravé** : +1 Sonné par -1 DR (V5) ou Inconscient à -4 DR et moins (V4 FR). Défaut proposé : V5.
4. **88, nombre de démons** : 1 (V5) ou 1d10 (V4 FR). Défaut proposé : V5.
5. **121-125, nature de l'effet** : Chance limitée à 1 point (V5) ou trait psychologique personnalisé (V4 FR). Défaut proposé : V5 ; le trait reste un texte MJ.
6. **26-30 et 56-60, compétences associées au dieu** : aucune liste par culte n'existe ; faut-il un référentiel MJ par culte (éditable) avant toute automatisation ?
7. **41-45, périmètre des « cibles alliées »** : qui compte comme allié, et comment désigner les réprouvés pour l'échec automatique des prières du dieu ?
8. **Suivi de pénitences (96-100, 111-115, 131-135, 136-140)** : objet « pénitence » avec état en cours/accompli, compteur pour la restitution des objets et des talents ? Qui clôt une pénitence (MJ seul) ?
9. **Absolution (L06 p.219)** : faut-il un flux dédié « demande d'absolution » (Test de Prière risquant la table) plutôt que la seule saisie manuelle du total de Péchés ?
10. **Prêtres elfes (L08 p.99)** : exemption du système Péché/Colère à activer par personnage ou par culte, ou à ignorer tant qu'aucun prêtre elfe n'est joué ?
11. **151+ et Points de Destin** : la dépense de Destin existe dans le registre de ressources (`js/core/store.js:2702`) ; arbitrer si le retour du personnage doit enchaîner automatiquement vers « Je vous rejette » (146-150) ou attendre le MJ.
12. **Déclencheur littéral à Péché 0** : tout jet finissant par 0 déclenche la table quand le total de Péché est 0 (lecture littérale de la source, implémentée ainsi). Confirmer ce comportement en sélecteur si des tables l'adoucissent.

## Notes et limites

- Les pages imprimées L06 coïncident avec les pages physiques ; L05 est décalée de deux pages (imprimée 218-219 = physiques 220-221) ; L01, L02, L13 et L18 coïncident ; L03 (p.88), L08 (p.99) et L10 (p.20) vérifiées par pied de page.
- Les deux pages sans texte extractible du corpus (L01 p.93-94, etc. per `DIVIN_CORPUS_LIVRES.json`) ne portent aucune règle Courroux identifiée.
- Cet inventaire ne modifie ni le registre généré (`js/data/v5-divine-contracts.json`) ni l'inventaire des contrats ; les numéros de ligne cités correspondent à l'état du worktree au 20 octobre 2026 et bougeront avec le code.
- Negative sweeps effectués le 20 octobre 2026 sur les 17 PDF du corpus + L18 par `pdftotext -layout` puis grep insensible à la casse (`wrath of the gods`, `sin point`) ; seuls L01, L02, L04, L05, L06, L08, L10, L13, L18 contiennent des règles ou mentions Courroux/Péché.


## Complément GPT du 21 octobre 2026 (L19-L26)

20 entrées ajoutées, marquées `addedOn: "2026-10-21"` dans le JSON : 89 entrées au total. Les 69 statuts historiques restent la photographie B0 ; les ajouts sont tous classés absent avant implantation (aucune preuve moteur inventée). Les lots de réalisation sont dans `docs/plans-gpt/PLAN_GPT_PHASE_B.md`.

Méthode : balayage textuel livre par livre avec pypdf 6.10.0, recherche de sin point(s), wrath of the gods, penance, absolution et strictures, puis lecture des pages positives. Le binaire `pdftotext` demandé est absent (`Get-Command pdftotext` échoue) ; remplacement sans nouvelle dépendance par le runtime PDF fourni. Journaux et extractions locales sous `tmp/gpt-phase-b/`. Ce repérage ciblé ne certifie pas une lecture exhaustive de chaque page ; images sans texte et alias inconnus peuvent échapper au balayage. Aucun rôle de lecteur indépendant revendiqué.

| Livre | Pages physiques consultées après repérage | Résultat |
| --- | --- | --- |
| L19 Middenheim | 21, 22, 23, 73, 81, 112 | Commandements ulricains et exemple de pénitence. |
| L20 Altdorf | 27, 217, 219 | Contexte des cultes et activité de pénitence chiffrée. |
| L21 Empire in Ruins Companion | 6, 7, 13 | Relique réduisant le Courroux, fragment retirant les Péchés et profanation. |
| L22 Horned Rat Companion | 39, 70, 71 | Livre perdu : Courroux quotidien ; lieu sanctifié à seuil MJ. P.70 : pénitence narrative. |
| L23 Enemy in Shadows Companion | 64 | Fidèle de Ranald : narration uniquement, aucun nouveau calcul repéré. |
| L24 Rough Nights & Hard Days | 91 (imprimée 90) | Trois cultes gnomes ; système religieux commun. Tableau et pied de page vérifiés visuellement. |
| L25 Sea of Claws | 83, 87, 89, 91 | Abus de bénédictions navales, Péché dans deux miracles et restrictions de Stromfels. |
| L26 Death on the Reik Companion | 45, 119 | Code séculier écarté ; retrait de Péché lors d’une procession funéraire. |

La table L06 p.218-219 a été relue visuellement (rendu Poppler). 01-05 : Calme +2 ; 66-70 : trois Aveuglé ; 81-87 : dégâts sans BE/PA puis un Sonné et un par DR négatif ; 88 : un démon ; 121-125 : prochain renouvellement de Chance limité à un. Aucun retour aux variantes V4 FR. La ligne 51-55 n’explicite pas le contournement BE/PA : choix à consigner au lot dégâts après lecture des services existants.

### Entrées ajoutées

| ID | Source imprimée | Résumé | Lot |
| --- | --- | --- | --- |
| l19-021-ulric-strictures | L19 21, 22, 23, 73, 81 | Commandements ulricains, vœux et usages locaux : éléments de contexte soumis au MJ. | B17 |
| l19-112-ulric-penance | L19 112 | Un Ulricain pénitent peut réhabiliter la fréquentation de la chapelle du palais. | B10 |
| l20-027-cult-strictures | L20 27, 217 | Pratiques locales de Ranald et commandements sévères de Solkan. | B17 |
| l20-219-penance-endeavour | L20 219 | Après pèlerinage, Prière à +2 DR : retirer un Péché, deux dès +4 DR ; échec : Exténué le premier jour suivant ; maladresse : Courroux. | B16 |
| l21-006-shrine-pilgrimage | L21 6 | Le sanctuaire commun de Sigmar et Ulric offre un motif de pèlerinage aux pécheurs. | B10 |
| l21-007-relic-wrath-modifier | L21 7 | Une relique peut donner de un à trois DR à Prière et réduire le Courroux de dix à trente ; total nul ou négatif : évité. | B18 |
| l21-007-shining-rock-sin | L21 7 | Restituer le fragment sacré peut effacer les Péchés du dévot de Sigmar ou Ulric ; sans Péché, accès à Béni dans la carrière. | B17 |
| l21-013-shrine-desecration | L21 13 | Les fanatiques profanant le sanctuaire accumulent des Péchés ; leurs prières peuvent provoquer le Courroux. | B17 |
| l22-039-daily-wrath-tome | L22 39 | La perte du livre sacré skaven impose un Courroux quotidien jusqu’à récupération et réparation rituelle. | B18 |
| l22-071-sanctified-ground | L22 71 | Un lieu sanctifié repousse certains pécheurs ou les blesse comme Enflammé ; repos et soins améliorés. | B18 |
| l23-064-ranald-npc | L23 64 | Le comportement d’un fidèle de Ranald illustre ses commandements. | exclu-narratif |
| l24-090-gnome-strictures | L24 90 | Les prêtres gnomes suivent le système religieux commun et les commandements d’Evawn, Mabyn ou Ringil. | B17 |
| l25-083-manann-strictures | L25 83 | Les commandements de Manann comprennent des usages régionaux décidés par le MJ. | B17 |
| l25-087-manann-overuse | L25 87 | Au-delà de trois navires bénis entre pleines lunes, chaque échec de Prière ajoute un Péché et dégrade l’humeur divine de 1d10. | B18 |
| l25-087-blessed-voyage-sin | L25 87 | Voyage béni améliore l’humeur de Manann de 2d10 diminués du total de Péchés. | B18 |
| l25-089-stromfels-penances | L25 89 | Commandements et exemples de pénitences de Stromfels ; les combattants jugés trop faibles accumulent des Péchés. | B10 |
| l25-091-stromfels-access | L25 91 | Stromfels refuse Invocation dès deux Péchés et Béni dès cinq. | B08 |
| l25-091-stromfels-mood-sin | L25 91 | Le miracle de Stromfels ignorant l’humeur de Manann ajoute le total de Péchés à son jet de table. | B18 |
| l26-045-secular-code | L26 45 | Le code de conduite des bateliers emploie un terme ressemblant aux commandements religieux. | exclu-narratif |
| l26-119-funeral-sin | L26 119 | Le MJ peut retirer un Péché aux fidèles éligibles aidant à porter un défunt au temple. | B17 |
