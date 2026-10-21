# Variables persistantes de personnage (registre pour la synchronisation fiche ↔ outil)

But : préparer la phase H du plan de fin de projet (écriture en retour de l’outil vers la fiche, décision du MJ du 21/10/2026). Chaque lot qui introduit ou modifie une valeur **durable** d’un personnage (qui doit survivre d’une séance à l’autre) l’ajoute ici. Les valeurs propres à un combat (États temporaires, Élan, ordre d’Initiative) n’y figurent pas.

| Variable | Emplacement dans l’outil | Source sur la fiche aujourd’hui | Modifiée par | Lot / commit |
| --- | --- | --- | --- | --- |
| Points de Péché | `extensions.v5.divine.sin` | absente | prières, Courroux, absolution, saisie MJ | divin (P4), phase B |
| Points de Corruption | `extensions.v5.corruptionPoints` | absente | sorts, Courroux, Larmes de Shallya… | lot 3, phase B, phase D |
| Culte(s) | déduit des talents Béni / Invocation (spécialisation) | talents (importés) | — | divin |
| Points de Chance permanents | `extensions.v5.characterResources[].fortune`, clé `characterId` ; projection `extensions.v5.resources.fortune` | `chance` (initialisation explicite depuis le solde connu importé) | dépenses, corrections MJ, renouvellement explicite | existant ; B09 `af31809` |
| Pénitences en cours et accomplies | `extensions.v5.divinePenances[]` : identité, culte, texte, source, origine, statut et clôture MJ | absente | Courroux 96–100, création et clôture MJ | phase B B10 |
| Blessures Critiques (registre) | `extensions.v5.criticalWounds` | absente | combat, soins, Larmes de Shallya, bouton Guérir | phase A (A9, A11) |

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
| Possessions courantes | `equipment[]` des projections ; Actions liées dérivées | équipement importé et exemplaires locaux | retrait de Courroux et restitution unitaire MJ | B11 |
| Possessions retenues ou rendues | `extensions.v5.divineConfiscations[]` : snapshots, statut, source, identité de pénitence et empreinte | absente | Courroux 111–115, clôture MJ de pénitence | B11 |
| PA physiques hors possessions connus | `extensions.v5.divineConfiscations[].retainedArmor` | absente ; fait MJ explicite pour six localisations | pose de la confiscation, réutilisation au retour d’une armure | B11 |

| Variable B12 | Emplacement dans l’outil | Source sur la fiche aujourd’hui | Modifiée par | Lot / commit |
| --- | --- | --- | --- | --- |
| Cause durable d’Hémorragie quotidienne | `extensions.v5.divineDailyBleeding[]` : source, culte, quantité depuis Péchés avant décrément, premier/prochain matin, nombre de matins traités et reçus | absente | Courroux 131–135, véritables avances de l’horloge avec confirmation des matins sautés | B12 |
| Fin de l’Hémorragie quotidienne par pénitence | `extensions.v5.divineDailyBleeding[].status/completedByPenanceId` et `extensions.v5.divinePenances[].stoppedDailyBleedingIds` | absente | clôture MJ de pénitence du même culte, Undo/Redo | B12 |

Les Hémorragique acquis restent des États ordinaires et ne sont pas des variables de retour fiche dans ce registre. Leur cause et le curseur quotidien doivent survivre aux séances : ils sont donc recensés ici. La confirmation d’un saut de matins est transitoire, liée à une seule avance, et ne constitue pas une donnée durable du personnage. B12 renforce aussi l’identité des porteurs des registres B09–B11 ; le registre de phase H doit conserver ces identités et ne jamais copier une sanction entre PJ par nom.

| Variable B13 | Emplacement dans l’outil | Source sur la fiche aujourd’hui | Modifiée par | Lot / commit |
| --- | --- | --- | --- | --- |
| Excommunication ou rejet définitif du culte | `extensions.v5.divineRejections[]` : identité, sujet, culte, nature, source et preuve de Courroux | absente | Courroux 136–140/146–150, confirmation MJ pour la perte définitive | B13, caractérisation `26b60d3` |
| Progression des deux pénitences d’excommunication | `divineRejections[].stage/penanceIds` et `extensions.v5.divinePenances[].divineRejectionProgress` | absente | clôture MJ de deux nouvelles pénitences du même culte, Undo/Redo | B13 |
| Acquisitions Béni/Invocation du culte perdues définitivement | `talents[]`, avec snapshots `divineRejections[].removedTalents` | talents importés et leur spécialisation | rejet définitif confirmé ; les acquisitions des autres cultes restent présentes | B13 |
| Avances et score réel de la compétence commune Prière | `skills[].advances/total` ; provenance `divineRejections[].prayLoss` et `lossConfirmedBy` | compétences importées ; avances à confirmer explicitement si absentes | rejet définitif confirmé : avances mises à zéro, total diminué des avances connues | B13 |

Les restrictions d’accès et la sanction sociale se déduisent du registre durable, sans nouveau compteur de compétence par culte. La phase H devra synchroniser les acquisitions et avances réellement modifiées avec leur provenance : un réimport de fiche ne doit pas rétablir silencieusement une perte définitive. Les faits d’appartenance d’un interlocuteur sont ceux d’une résolution particulière ; ils ne constituent pas une nouvelle religion permanente du personnage.
