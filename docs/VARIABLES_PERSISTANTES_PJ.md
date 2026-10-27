# Variables persistantes de personnage (registre pour la synchronisation fiche ↔ outil)

But : préparer la phase H du plan de fin de projet (écriture en retour de l’outil vers la fiche, décision du MJ du 21/10/2026). Chaque lot qui introduit ou modifie une valeur **durable** d’un personnage (qui doit survivre d’une séance à l’autre) l’ajoute ici. Les valeurs propres à un combat (États temporaires, Élan, ordre d’Initiative) n’y figurent pas.

| Variable | Emplacement dans l’outil | Source sur la fiche aujourd’hui | Modifiée par | Lot / commit |
| --- | --- | --- | --- | --- |
| État monté du participant | `extensions.v5.mounted` (booléen ; absent = `false`) | absent | case à cocher du MJ dans « Modifier le participant » | F2-C |
| Mains utilisées pour une épée bâtarde | `extensions.v5.weaponHandsByEquipmentId[<equipmentId>]` (1 ou 2 ; absent = nom catalogue, notamment `(2M)`) | nom du catalogue et choix MJ | case à cocher par instance dans « Modifier le participant » | F2-C |
| Points de Péché | `extensions.v5.divine.sin` | absente | prières, Courroux, absolution, saisie MJ | divin (P4), phase B |
| Points de Corruption | `extensions.v5.corruptionPoints` | absente | sorts, Courroux, Larmes de Shallya… | lot 3, phase B, phase D |
| Culte(s) | déduit des talents Béni / Invocation (spécialisation) | talents (importés) | — | divin |
| Points de Chance permanents | `extensions.v5.characterResources[].fortune`, clé `characterId` ; projection `extensions.v5.resources.fortune` | `chance` (initialisation explicite depuis le solde connu importé) | dépenses, corrections MJ, renouvellement explicite | existant ; B09 `af31809` |
| Pénitences en cours et accomplies | `extensions.v5.divinePenances[]` : identité, culte, texte, source, origine, statut et clôture MJ | absente | Courroux 96–100, création et clôture MJ | phase B B10 `aa62ca0` |
| Blessures Critiques (registre) | `extensions.v5.criticalWounds` | absente | combat, soins, Larmes de Shallya, bouton Guérir | phase A (A9, A11) |
| Séquelles des Blessures Critiques V5 | `extensions.v5.criticalAftermath[]` : identité de table/ligne L06, localisation, source de résolution, états, blessures additionnelles, blessures permanentes et rappels de soins | absente | application d’une ligne critique V5 ; identifiant idempotent par résolution/personnage/critique | F2-I |
| Décompte de mort par Blessures Critiques | `extensions.v5.criticalDeath` : statut, échéance, BE et identifiants des critiques déclencheurs | absente | réconciliation lors de l’application d’un critique ; annulation si seuil ou Inconscient disparaît ; confirmation ou refus explicite du MJ à l’échéance | F2-I |
| Mort confirmée par le MJ | `extensions.v5.dead` (booléen) avec `hp = 0` | absente | moteurs de mort préexistants ; F2-B ajoute l’option létale de la table, le choix létal et la confirmation explicite du MJ contre une cible admissible sans défense | préexistant ; complément F2-B |

État de combat persistant à travers sauvegarde/rechargement (sans retour vers une fiche durable) : `extensions.v5.combatActions` appartient à l’enveloppe de séance. Il contient `byActorId` (Défensive ou Visée, compétence/arme/cible, horloge), `movementByActorId`, `trippedResolutionIds` (une tentative de Croche-pied par touche) et les reçus `receipts`. Il est restauré par Undo/Redo, expire au Tour approprié et est purgé au nouveau combat.

Identité de l'occurrence de combat : `extensions.v5.combatScopeId` (enveloppe et `activeScene.extensions.v5.combatScopeId` pour une scène). L'initialisation d'un nouveau combat et le redémarrage la renouvellent ; la reprise conserve celle de la scène. Quotas, Actions, Prière et Brisé partagent cette identité de Tour, avec compatibilité des anciennes sauvegardes sans ce champ. L'identité et la date de création de la scène restent conservées au redémarrage. Cette donnée de séance n'est pas destinée au retour vers la fiche.

## Complément phase B — reprise gpt/phase-b4

Consigne du MJ appliquée rétroactivement aux lots B00–B09 et au lot B10. Ce registre prépare la phase H ; il ne réalise pas l’écriture vers les fiches. Les chemins ci-dessous sont ceux du personnage et de ses projections dans combat.participants, activeScene.participants, suspendedScenes[].participants, persistentCharacters ou reserve selon leur présence. L’identité de fiche/personnage reste déterminante ; aucun rapprochement par nom.

| Variable | Emplacement dans l’outil | Source sur la fiche aujourd’hui | Modifiée par | Lot / commit |
| --- | --- | --- | --- | --- |
| Blessures courantes du personnage | `hp` et `maxHp` de la projection ; différence signée `maxHp - hp` conservée lors de la synchronisation | maximum calculé depuis les caractéristiques/talents importés ; solde courant non importé par ce flux | dégâts directs de Courroux, soins et commandes de Blessures | B03/B04 ; modèle commun de santé |
| Plafond durable des Tests de Prière jusqu’au terme des huit jours impériaux | `extensions.v5.divineEffects[]`, type `prayer-sl-cap` : source, ancre et échéance de campagne | absente | Courroux 06–10 historique ; vraie expiration calendaire | socle P4/E5, conservé par B01/B05 |
| Malus de compétences pour plusieurs heures ou jours | `extensions.v5.divineEffects[]`, type `wrath-skill-penalty` : identifiants de compétences, source, durée et échéance | absente | Courroux 26–30/56–60, choix MJ, horloge de campagne | B06 `97c1839` |
| Réprobation des prières d’un dieu visant le personnage | `extensions.v5.divineEffects[]`, type `wrath-deity-rejection` : culte, source et échéance | absente | Courroux 41–45, destinataires confirmés MJ, expiration | B07 `cbc552e` |
| Suspension calendaire de Béni et Invocation d’un culte | `extensions.v5.divineEffects[]`, type `divine-access-suspension` : `suspendedTalentIds`, culte, source, durée et échéance | absente ; acquisitions permanentes dans talents importés, conservées | Courroux 106–110/116–120, expiration | B08 `ab59a17` |
| Provenance de la valeur connue de Corruption | `extensions.v5.corruptionEntry` : valeur, motif MJ et règle source ; compteur `corruptionPoints` ci-dessus | absente | saisie MJ de pureté de Solkan, avec révision attendue | B08 `ab59a17` |
| Prochain renouvellement normal de Chance limité à un point | `extensions.v5.divineEffects[]`, type `wrath-fortune-refresh` : identité de l’occurrence, source et limite 1 | absente | Courroux 121–125 ; consommation par renouvellement explicite uniquement | B09 `af31809` |
| Reçus de renouvellement de Chance | `extensions.v5.fortuneRefreshReceipts[]` : personnage, pool normal, montant donné, occurrences consommées et motif | absente ; métadonnées d’audit, pas un deuxième compteur à synchroniser | renouvellement MJ, Undo/Redo | B09 `af31809` |

B00 n’introduit pas de variable de personnage. B01 change le déclenchement à zéro Péché et B02 l’exemption par culte, sans nouveau compteur. B03 modifie les Blessures courantes (champ canonique hp de la projection), à raccorder au compteur de Blessures de la fiche en phase H avec le modèle commun des soins/dégâts. B04 suit des États de combat et leurs causes de récupération ; ils sont exclus ici selon la règle du registre. B05 ajoute des interdictions/obligations en Rounds et des quotas de Tour, également exclus. Les seuils Solkan/Stromfels de B08 sont déduits des compteurs Péché/Corruption et du culte : aucune variable dérivée supplémentaire à écrire. Les couches calendaires peuvent dépasser une séance et sont donc recensées malgré leur échéance future. Les points de Chance temporaires restent dans leurs couches d’effets, séparés du solde permanent.

B11 : les possessions et leur retenue sont durables. L’inventaire courant reste `equipment[]` de la projection, importé depuis l’équipement de fiche ; le Courroux retire les objets et la pénitence restitue un exemplaire choisi. `extensions.v5.divineConfiscations[]` conserve les snapshots identifiés, la désignation magique MJ, le statut retenu/rendu, l’identité de pénitence qui a rendu l’objet, la source et l’empreinte de l’inventaire attendu. `retainedArmor` y porte les six PA physiques hors possessions explicitement connus. Les Actions liées sont des dérivés locaux conservés pour restitution, pas un deuxième inventaire à écrire sur la fiche. La phase H doit respecter la retenue, sans recréer un objet à partir d’un ancien import ; les gardes actuels refusent cette réinjection. Source fiche du registre de retenue/PA hors possessions : absente. Modifications : Courroux 111–115 et clôture MJ B11.

| Variable B11 | Emplacement dans l’outil | Source sur la fiche aujourd’hui | Modifiée par | Lot / commit |
| --- | --- | --- | --- | --- |
| Possessions courantes | `equipment[]` des projections ; Actions liées dérivées | équipement importé et exemplaires locaux | retrait de Courroux et restitution unitaire MJ | B11 `ee9ef18` |
| Possessions retenues ou rendues | `extensions.v5.divineConfiscations[]` : snapshots, statut, source, identité de pénitence et empreinte | absente | Courroux 111–115, clôture MJ de pénitence | B11 `ee9ef18` |
| PA physiques hors possessions connus | `extensions.v5.divineConfiscations[].retainedArmor` | absente ; fait MJ explicite pour six localisations | pose de la confiscation, réutilisation au retour d’une armure | B11 `ee9ef18` |

| Variable B12 | Emplacement dans l’outil | Source sur la fiche aujourd’hui | Modifiée par | Lot / commit |
| --- | --- | --- | --- | --- |
| Cause durable d’Hémorragie quotidienne | `extensions.v5.divineDailyBleeding[]` : source, culte, quantité depuis Péchés avant décrément, premier/prochain matin, nombre de matins traités et reçus | absente | Courroux 131–135, véritables avances de l’horloge avec confirmation des matins sautés | B12 `ac61364` |
| Fin de l’Hémorragie quotidienne par pénitence | `extensions.v5.divineDailyBleeding[].status/completedByPenanceId` et `extensions.v5.divinePenances[].stoppedDailyBleedingIds` | absente | clôture MJ de pénitence du même culte, Undo/Redo | B12 `ac61364` |

Les Hémorragique acquis restent des États ordinaires et ne sont pas des variables de retour fiche dans ce registre. Leur cause et le curseur quotidien doivent survivre aux séances : ils sont donc recensés ici. La confirmation d’un saut de matins est transitoire, liée à une seule avance, et ne constitue pas une donnée durable du personnage. B12 renforce aussi l’identité des porteurs des registres B09–B11 ; le registre de phase H doit conserver ces identités et ne jamais copier une sanction entre PJ par nom.

| Variable B13 | Emplacement dans l’outil | Source sur la fiche aujourd’hui | Modifiée par | Lot / commit |
| --- | --- | --- | --- | --- |
| Excommunication ou rejet définitif du culte | `extensions.v5.divineRejections[]` : identité, sujet, culte, nature, source et preuve de Courroux | absente | Courroux 136–140/146–150, confirmation MJ pour la perte définitive | B13 `e6e4b89`, caractérisation `26b60d3` |
| Progression des deux pénitences d’excommunication | `divineRejections[].stage/penanceIds` et `extensions.v5.divinePenances[].divineRejectionProgress` | absente | clôture MJ de deux nouvelles pénitences du même culte, Undo/Redo | B13 `e6e4b89` |
| Acquisitions Béni/Invocation du culte perdues définitivement | `talents[]`, avec snapshots `divineRejections[].removedTalents` | talents importés et leur spécialisation | rejet définitif confirmé ; les acquisitions des autres cultes restent présentes | B13 `e6e4b89` |
| Avances et score réel de la compétence commune Prière | `skills[].advances/total` ; provenance `divineRejections[].prayLoss` et `lossConfirmedBy` | compétences importées ; avances à confirmer explicitement si absentes | rejet définitif confirmé : avances mises à zéro, total diminué des avances connues | B13 `e6e4b89` |

Les restrictions d’accès et la sanction sociale se déduisent du registre durable, sans nouveau compteur de compétence par culte. La phase H devra synchroniser les acquisitions et avances réellement modifiées avec leur provenance : un réimport de fiche ne doit pas rétablir silencieusement une perte définitive. Les faits d’appartenance d’un interlocuteur sont ceux d’une résolution particulière ; ils ne constituent pas une nouvelle religion permanente du personnage.

| Variable B15 | Emplacement dans l’outil | Source sur la fiche aujourd’hui | Modifiée par | Lot / commit |
| --- | --- | --- | --- | --- |
| Jugement dernier (départ, retour par Destin, décision du rejet) | `extensions.v5.divineJudgments[]` : culte, source, preuve de Courroux, statut (`departed`, `returned`, `returned-without-rejection`, `rejected`), point de retour, Destin dépensé, proposition de rejet | absente | Courroux 151+, commandes MJ de retour et de décision | B15 |
| Points de Destin permanents | `extensions.v5.fate` (miroir `fate`) ; part temporaire dans les couches (`remainingTempFate`) | `destin` (compétence/ressources importées) | débité une seule fois au retour du Jugement dernier (temporaire d’abord) ; sinon dépenses existantes | existant ; B15 |

Le rejet confirmé après un Jugement dernier réutilise `extensions.v5.divineRejections[]` (B13), avec `judgmentId` et une preuve rattachée au 151+. La phase H ne doit jamais rétablir un personnage « parti » ni rembourser le Destin par réimport.

| Variable B16 | Emplacement dans l’outil | Source sur la fiche aujourd’hui | Modifiée par | Lot / commit |
| --- | --- | --- | --- | --- |
| Points de Péché retirés par absolution ou pénitence d’Altdorf | `extensions.v5.divine.sin` (compteur existant) ; reçu d’audit `extensions.v5.divineWrathRecoveries[].absolution` (type, culte, retrait, motif) | absente | commandes MJ d’absolution (Test de Prière), Courroux consécutif | B16 |

Un Exténué d’Altdorf est un État de combat ordinaire, exclu du registre. Le reçu d’absolution est une métadonnée d’audit, pas un second compteur.

| Variable B17 | Emplacement dans l’outil | Source sur la fiche aujourd’hui | Modifiée par | Lot / commit |
| --- | --- | --- | --- | --- |
| Journal des événements de Péché (reçus d’audit) | `extensions.v5.divineSinEvents[]` : événement, culte, fait, Péchés avant/après, source, décision MJ (300 derniers) | absente ; audit, pas un compteur | commande MJ d’événement sourcé | B17 |
| Points de Péché (attribution/retrait sourcés) | `extensions.v5.divine.sin` (compteur existant) | absente | événements B17, absolution B16, Courroux | B17 |

| Variable B18 | Emplacement dans l’outil | Source sur la fiche aujourd’hui | Modifiée par | Lot / commit |
| --- | --- | --- | --- | --- |
| Reliques d’un dieu (bonus de Prière 1–3 DR, réduction de la table de Courroux 10/20/30) | `extensions.v5.divineRelics[]` : dieu, nom, valeurs, source L21 p.7, motif | absente ; équipement/objets de la fiche non reliés | commande MJ de pose et de retrait | B18 |
| Suivi quotidien du livre sacré perdu | `extensions.v5.divineDailyWraths[]` : culte, nom, début (secondes de campagne), jours joués, jours écartés, statut | absente | commandes MJ (ouverture, jour joué par le Courroux MJ, jour écarté à zéro Péché, clôture) | B18 |
| Terres sanctifiées (lieux de la campagne, seuil MJ) | `extensions.v5.sanctifiedGrounds[]` au niveau de la partie (pas du personnage) | absente | commandes MJ ; l’Enflammé acquis est un État de combat exclu du registre | B18 |
| Faits navals de Manann et Stromfels (audit) | `extensions.v5.divineNavalEvents[]` : navire, dés, humeur calculée, jet modifié (300 derniers) | absente ; l’humeur du navire n’est pas suivie (aucun sous-système naval) | commande MJ ; seul le Péché de la surutilisation (+1) est un compteur durable | B18 |

## Phase E — mots-clés de créature (demande du MJ du 22/10)

| Variable | Emplacement dans l’outil | Source sur la fiche aujourd’hui | Modifiée par | Lot / commit |
| --- | --- | --- | --- | --- |
| Mots-clés posés sur un personnage, une créature ou un PNJ | `keywords[]` (identifiants du référentiel) du profil, du participant et de la fiche PJ ; conservés par réserve → combat → scène | absente ; la race de la fiche (`race`) en fait déduire un (non écrit) | sélecteur du formulaire de profil, import JSON, corrections MJ | phase E K3 |
| Mots-clés déduits écartés par le MJ | `keywordExclusions[]` des mêmes projections | absente | bouton « Écarter » du sélecteur, « Rétablir » | phase E K3 |
| Ajouts du MJ au référentiel de mots-clés (donnée de campagne, pas de fiche) | `extensions.v5.keywordReferential.terms[]` : id, noms, parents, alias, `addedByMj` ; jamais de retrait ni de renommage | absente | commande `add-creature-keyword` (annulable) | phase E K2 |
| Liens maître-familier, côté maître | `extensions.v5.familiarLinks[]` : id, system (homoncule/animal), familiarId, kind, wind, species, rank, inRange (animal, posé par le MJ), createdAt, source | absente | commandes `link-familiar`, `unlink-familiar`, `set-familiar-range` (annulables) | phase E F2 |
| Création de familier (reçu du sacrifice) | `extensions.v5.familiarLinks[].creation` : ressource (`fate`/`resilience`), avant, cédés, après, points à répartir, solde saisi par le MJ | absente | commande `create-familiar` (annulable : Annuler rend le point) | branchement B10 |
| Points de Destin permanents (débit de création) | `extensions.v5.fate` (miroir `fate`) | `destin` de la fiche, importé à la synchronisation si l’outil n’a pas la valeur ou si la fiche a changé (B10b) ; saisie du MJ si inconnu | `create-familiar` : 1 + points supplémentaires | branchement B10, B10b ; **à réécrire côté fiche en phase H** (débit) |
| Points de Résilience | `extensions.v5.resilience` | `resilience` de la fiche, importé comme le Destin (B10b) ; saisie du MJ si la fiche n’en porte pas | `create-familiar` (solde débité) | branchement B10, B10b ; **à réécrire côté fiche en phase H** (débit) |
| Camp du familier d’un PJ | `camp` du participant familier (`allie`) | absente | `create-familiar` | branchement B10 |
| Lien maître-familier, côté familier | `extensions.v5.familiarOf` : masterId, linkId, system, kind, wind, species | absente | mêmes commandes (posé et retiré avec le lien du maître) | phase E F2 |
