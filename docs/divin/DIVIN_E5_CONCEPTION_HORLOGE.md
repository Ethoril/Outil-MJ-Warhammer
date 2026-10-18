# E5 — conception d’une horloge commune de jeu

17 octobre 2026. Proposition de conception avant toute implémentation E5. L’objectif est de faire converger les durées magiques et divines, les phases de combat et le temps de campagne autour d’un seul registre versionné. Cette note ne ferme pas l’audit des règles du temps ni les exceptions propres à chaque effet.

## Sources lues et portée

Le fichier texte de référence est `E:/Projet Warhammer Ennemi Intérieur/tmp/catalogue-bibliotheque/text/Livre de base V5 EN v2.json`, tableau JSON de 379 chaînes. Les pages imprimées 161–163 correspondent aux indices physiques 160–162; vérification croisée faite dans le PDF de 379 pages et par rendu individuel des pages PDF 161–163. Les rendus privés sont dans `C:/Users/arnot/.codex/visualizations/2026/10/17/01a14afb-f993-7171-b422-c21e6f8aa1e2/e5-time/` et ne sont pas des ressources du dépôt.

- **Livre de base V5, p. 161** : un Round permet à tous les personnages de tenter un Test et de se placer; sa durée normale est « quelques secondes », et le MJ peut fixer la durée exacte si nécessaire. Chaque combattant a un Tour dans le Round, avec Action et Move, généralement dans l’ordre d’Initiative. Le résumé ordonne début du Round, Tours, fin du Round, puis répétition. Hors combat, on n’emploie pas normalement des Rounds; le MJ peut le faire quand le minutage importe, notamment pour un Test étendu.
- **p. 162** : un Tour commence par la description de la situation; Move et Action peuvent être pris dans l’un ou l’autre ordre et sont narrativement simultanés. À la fin du Tour, le personnage attend le Round suivant. Les Actions gratuites sont bornées par le bon sens du MJ. La défense choisie comme Action s’applique jusqu’au début du prochain Tour du personnage.
- **p. 163** : le déplacement est mesuré par Tour; sprint et Charge utilisent l’Action du Tour; l’engagement cesse après un Round entier sans attaque entre les deux adversaires. La table de déplacement est une table de Mouvement, pas une conversion de durée.
- **p. 131** : un Test étendu peut se répéter « par Round » ou « chaque jour »; le MJ fixe la fréquence, l’échéance et les conséquences du retard. La page ne définit pas d’unité universelle de durée des tâches.
- **p. 169** : retenir son souffle préparé vaut Bonus d’Endurance × 10 secondes; l’étouffement/drowning enlève 1 Blessure par Round; après l’Inconscience, la mort survient après Bonus d’Endurance Rounds.
- **p. 170** : exposition difficile toutes les 4 heures, extrême toutes les 2 heures; manque d’eau testé chaque jour, manque de nourriture tous les 2 jours; la mort par froid/chaleur se compte en heures, par manque d’eau en jours; récupération naturelle des Blessures au terme de chaque jour.
- **p. 184–187** : la durée habituelle d’un État est décrite avec l’État et peut être remplacée par la cause (sort ou critique). Les exemplaires d’un même État cumulent, les États distincts n’additionnent pas leurs pénalités. Plusieurs fins sont des phases de Round/Tour; Assourdi précise qu’une minute vaut six Rounds (p. 186). Inconscient dure généralement quelques heures, sauf si sa cause termine plus tôt. Ces règles ne définissent pas une échéance commune pour toutes les causes.
- **p. 266** : le Test étendu précise fréquence et limite de temps; si le temps exact n’est pas important, le MJ peut décider simplement de la durée. Cette source confirme que le temps de campagne n’est pas déduit du temps réel de l’ordinateur.

Les p. 161–163 ont été lues intégralement en texte et contrôlées visuellement. Les autres pages ci-dessus ont été lues intégralement dans l’extraction textuelle. Cette lecture ciblée n’est pas une seconde lecture indépendante ni la fermeture d’un chapitre ou d’un livre.

## Décisions et limites établies

DIV-06 demande une horloge commune sourcée et réserve le choix MJ aux exceptions. Le plan exhaustif demande que le temps de campagne progresse par commande explicite, jamais par `Date.now()`. DIV-05 conserve un arbitrage MJ traçable quand la source ne tranche pas un cumul ou une échéance.

Les décisions historiques du chantier magie sont toujours enregistrées dans `docs/lot3/LOT3_CADRAGE_MAGIE.md` et `docs/lot3/LOT3_PLAN_CORRECTION_CLAUDE.md` : **D-11** donne la convention de table 1 Round = 10 secondes, soit 6 Rounds par minute; **D-12** expire les effets en Rounds à la fin du Tour de leur auteur. Elles ne sont pas des citations textuelles de la p. 161 : celle-ci dit « quelques secondes » et permet au MJ de préciser. La p. 186 atteste en revanche explicitement 6 Rounds par minute pour Assourdi. Le service commun réutilise D-11/D-12 comme politiques déjà reçues pour la magie et doit afficher la politique effectivement appliquée avec chaque échéance calculée. Une prière n’hérite pas de ces politiques par défaut : son exception (par exemple Instantané ou fin du prochain Tour) doit rester contrôlée sur sa clause source et conserver sa propre provenance.

L’avancement d’un Round complet ajoute une seule durée de Round, pas une durée par combattant. Un Tour individuel est une frontière de phase, pas une minute ni un incrément indépendant de campagne. Les durées de Tours/Rounds hors combat et les échéances de fin de Tour restent des deadlines typées; aucune durée spéciale, « Instantané », attente de maintien, expiration de scène ou exception d’auteur ne se déduit d’un nombre seul.

La revue indépendante E0 confirme le cadrage comme proposition, sous réserves avant code. `state.combat` est la seule autorité de position; `gameClock.combat` ne peut être qu’une projection validée, et discordance au chargement/import doit bloquer ou reconstruire cette projection depuis le combat canonique sans inventer une transition. La clock doit valider les phases réellement produites par `v5-turn` contre `from`, `to` et leur ordre; une suite de phases plausible mais absente de la transition ne peut expirer d’effet. Les deadlines doivent spécifier comparateur et coordonnées complètes (scène, Round, phase, instant, Tour/acteur, politique), avec fallback D-12 limité aux sorts. `advance campaign` n’est valide que pour les magasins que la même commande peut réellement écrire; un magasin extérieur à la transaction bloque l’avance au lieu d’être réputé synchronisé.

## État actuel observé

`js/core/v5-magic-effects.js` centralise le parsing des durées de sort dans `parseSpellDuration` et `resolveTypedDuration`. Il reconnaît Rounds, minutes, heures, jours et semaines, interprète les caractéristiques du lanceur ou de la cible, puis stocke plusieurs représentations (`durationRounds`, `expiresAtRound`, `durationMinutes`, `remainingMinutes`). Il expose `currentMagicRound`, qui renvoie 1 quand aucun combat n’est actif. `expireSpellEffects` compare une échéance Round et ajuste aussi `remainingMinutes` lorsque des minutes passent; les chemins utilisent D-11 pour convertir ces valeurs. La règle D-12 est appliquée dans `expireSpellEffects`/`processCombatTurnSpells` : Tour de l’auteur lorsque celui-ci est présent, sinon échéance de Round. Cette conversion et cette expiration sont étroitement mêlées à la projection des couches magiques.

`js/core/v5-magic-time.js` n’est pas encore un service d’horloge commun. Il appelle `expireMiscastConsequences` avec `currentRound` et/ou `minutes`, et décrémente aussi les jours de burnout. `v5-magic-miscasts.js` porte à la fois `expiresAtRound` et `remainingMinutes`; l’expiration peut venir d’une phase de Round ou de l’avance de minutes. `v5-effects.js` conserve ses propres durées par Tours et expirations `v5Timing` (`phase`, Round, Tour, acteur, moment avant/après effets). Certains cas de récupération évaluent « une minute » par différence de six Rounds; les états magiques attachés à une couche peuvent être verrouillés jusqu’à la fin du sort.

`js/core/v5-divine-engine.js` exige, pour les couches divines temporaires, une expiration explicite par phase/Round/Tour/acteur/moment. `expireDivineEffects` ne compare que ces coordonnées et n’expire pas par minutes ou jours. Une échéance qui attend le Tour d’un auteur retiré peut donc ne plus être atteinte. L’expiration des couches détruit les états qu’elles possèdent uniquement lorsque ceux-ci ne sont référencés par aucune autre couche.

`js/core/v5-turn.js` produit l’ordre de phases pour un vrai passage au Tour suivant : fin du Tour courant, effets de fin de Tour et échéance, fin de Round si le nouvel acteur ouvre un Round suivant, début de Round et début du prochain Tour. Il intègre l’expiration divine avant/après les effets d’États et le traitement des sorts. `js/core/combat.js` prévisualise ce passage puis le commit dans `executeCommand('end-turn-v5', ...)`. `Store.nextTurn` maintient aussi un chemin de compatibilité basé sur `turn-order.js` et `processCombatTurnSpells`; ce chemin et le passage V5 doivent être traités comme deux appels possibles au même service, jamais comme deux horloges concurrentes.

`Store.advanceTalentMinutes(minutes)` est une commande explicite persistée, mais elle ne touche qu’aux participants du combat courant : elle enlève des minutes aux marqueurs de talent, fait avancer/expirer les effets de sort, Forme bestiale et incidents. Elle n’avance pas de registre de campagne, ne traite pas les couches divines ni les personnages persistants/de réserve et ne parcourt pas les participants des scènes suspendues. La suspension déplace une scène dans `suspendedScenes` et remet le combat actif à Round 0; reprendre la scène réinstalle son contenu. Le retrait d’un participant le retire du combat; supprimer une rencontre purge ses scènes actives/suspendues et participants. Les couches portent des identifiants auteur/cible, mais un sujet durable unique commun aux couches n’est pas encore garanti.

Le Store possède déjà la bonne frontière de mutation : `executeCommand` valide puis canonicalise le snapshot, écrit les changements et la commande sync, ensuite publie l’état vivant. L’historique conserve `before`/`after` pour Undo/Redo. L’horloge doit donc être une extension versionnée de l’état partagé et chaque avance du temps doit modifier la clock, les échéances/effets et le reçu dans la même commande atomique. Un rechargement ne fait qu’hydrater la valeur persistée; il ne mesure aucune durée écoulée sur le PC.

## API commune proposée

Le nom de module déjà proposé dans `DIVIN_CONCEPTION_E1_E2.md` est conservé : `js/core/v5-game-time.js`. L’unique état autoritaire est `state.extensions.v5.gameClock`, versionné et inclus dans les snapshots/exports/synchronisations :

```js
{
  schemaVersion: 1,
  revision: 0,
  campaignSeconds: 0,
  combat: { sceneId: null, round: 0, turnIndex: 0, currentActorId: null },
  lastEvent: { id: null, baseRevision: null, resultRevision: null, payloadFingerprint: null }
}
```

`state.combat` reste l’unique autorité de position; `gameClock.combat` est une projection/cache validé, jamais une seconde position pouvant gagner au conflit. Au chargement, une discordance bloque les avances et la projection est reconstruite depuis le combat canonique sans ajouter de phase ni incrément de temps. `campaignSeconds` est un curseur de temps de jeu, pas une horloge système. Pour un état antérieur sans clock, la migration crée un curseur initial local sans temps écoulé implicite; chaque couche/durée héritée doit être convertie depuis ses coordonnées persistées et sa règle d’expiration existante, ou rester explicitement à résoudre si les ancres ne suffisent pas. Les champs `remainingMinutes`, `expiresAtRound` et le repli D-12 existants gardent priorité/conversion documentée; une ancre ambiguë n’est jamais réinitialisée à “maintenant”. Le service ne réécrit pas silencieusement les vieux champs inconnus.

API pure demandée :

```js
advanceGameClock(clock, event)
// { ok, status, clock, validatedPhases, elapsedSeconds, dueAt, needsInput, receipt }
```

`event` est l’un des deux événements persistables suivants :

```js
{
  id, baseRevision,
  kind: 'combat-transition',
  sceneId,
  from: { round, turnIndex, actorId },
  to: { round, turnIndex, actorId },
  phases: [{ phase, round, turnIndex, actorId, moment }]
}
{
  id, baseRevision,
  kind: 'campaign-time-advance',
  seconds, reason
}
```

Le Store dérive `from`, `to` et les phases de la transition de combat réelle et de l’ordre d’Initiative; il ne les reçoit jamais du formulaire. Le service compare les phases dérivées aux transitions effectivement produites par `v5-turn`, vérifie chacune contre `from`/`to` et rejette toute phase absente ou mal ordonnée. Les phases couvrent, selon le passage réel, les frontières d’effets (`endOfCasterTurn`, `attackAttempt`) et les moments avant/après effets; aucune expiration ne peut venir d’une phase déclarée librement. Pour un combat historique sans scène active, `sceneId: null` est accepté mais ancré au combat canonique et aux indices de Tour/Round; démarrer ou reprendre une scène ne fait pas sauter le temps. Pour l’événement de campagne, l’UI peut proposer minutes/heures/jours, mais le Store soumet au service un nombre positif entier de secondes et un motif MJ. Il n’y a ni timer mural ni rattrapage automatique au reload.

Chaque nouvelle position de Round avance `campaignSeconds` de 10 secondes selon D-11; passer d’un Tour à un autre dans le même Round ne l’avance pas. Une avance explicite de campagne ajoute exactement les secondes confirmées. Une clock `revision` monotone et `baseRevision` empêchent les doubles transitions et les replays périmés; `lastEvent` conserve une empreinte canonique de tout le payload accepté. Le même ID/payload ne peut réussir qu’au dernier CAS exact; après qu’une révision ultérieure a remplacé `lastEvent`, son retry retourne stale/conflict, jamais une nouvelle avance. Un même ID portant un contenu différent est toujours rejeté. Les conflits distants suivent le protocole de commande Store et ne consomment pas deux échéances.

Les effets conservent un `deadline` typé construit à la pose depuis la durée déjà résolue par le module compétent, sans dupliquer `parseSpellDuration` :

```js
{ kind: 'campaign-time', atSeconds }
{ kind: 'combat-phase', sceneId, round, phase, moment, turnIndex, actorId, policyId }
```

Le même service compare ces deadlines au curseur et aux phases validées. Les politiques D-11/D-12, ou une exception explicitement sourcée, déterminent quels points de cette deadline sont pertinents. Les effets magiques, divins, incidents et États restent propriétaires de l’expiration de leurs couches et de leurs reçus : le service leur remet les phases/temps validés, puis leurs transformations s’appliquent dans la commande Store unique. Il n’existe ni décrément parallèle dans chaque sous-moteur ni second compte à rebours.

Avant d’accepter une couche temporaire, `resolveTypedDuration` ou le résolveur de contrat fournit une durée chiffrée et son unité; le service l’ancre à la clock capturée. Les valeurs spéciales, instantanées, mixtes ou non résolues gardent leur statut propre. À durée connue mais frontière de fin indécidable, le preview demande l’exception appropriée au lieu d’inventer une phase.

## Migration et intégration sans perte

1. Ajouter la clock sous `extensions.v5` via la migration/sanitation existante; conserver les extensions inconnues. Son absence devient un état initial sans temps avancé. La migration associe chaque durée héritée à son ancre actuelle (Round, phase, sujet stable, minutes restantes) et documente les champs convertis; les conversions D-11/D-12 restent explicites. Une donnée corrompue ou un ancrage contradictoire bloque l’effet concerné et signale le champ, elle ne transforme pas un effet en durée permanente ou instantanée.
2. Faire de la vraie commande `end-turn-v5` la seule avance combat : elle construit et valide l’événement clock, exécute les mêmes phases actuelles, traite les échéances à leur phase, puis stocke le nouveau `combat` projeté, la clock, les couches recalculées et le journal en une transaction. `Store.nextTurn`/saut manuel doivent appeler ce même service et ne pas double-décrémenter un Tour. Un changement manuel de Round ou d’ordre ne constitue pas à lui seul une fin de Tour; ses phases doivent être explicites et valides.
3. Garder `Store.advanceTalentMinutes` en façade d’une commande de temps campagne. Avant de couvrir les sujets de combat actif, réserve, `persistentCharacters`, scène active et scènes suspendues, vérifier que leurs stockages sont effectivement lus et écrits dans le même snapshot transactionnel Store; si une fiche persistante ou un autre stockage échappe à cette transaction, cette avance doit être bloquée pour ce sujet, jamais rapportée comme synchronisée. Aucun temps n’avance pendant le repos du programme.
4. À la création d’effet, conserver la provenance, l’ID d’exécution, l’identité stable du sujet et de l’auteur, l’ancre clock, la durée source, l’unité et la politique de fin. Quand un sujet passe de combat à réserve ou scène suspendue, la couche se rattache à la même identité; elle n’est ni copiée comme deuxième effet ni perdue avec la projection combat. Quand l’auteur est retiré, son identifiant reste une provenance, mais une politique d’échéance applicable doit permettre à l’effet de terminer. D-12 couvre déjà le cas auteur absent pour les sorts; ne l’étendre aux prières qu’après comparaison de leurs clauses/échéances. Supprimer un sujet ou sa rencontre reste une commande explicite et auditable; ne pas transférer un effet vers une nouvelle copie de modèle par nom/profil.
5. Revalider les captures Preview à l’application sur `localRevision`, clock canonicale, scène active, sujet/auteur stable, contrat/source et faits. Une horloge périmée rend le preview stale; aucun effet ne se consomme au calcul ou au conflit. La commande synchronisée inclut clock et effets dans le même snapshot/outbox. Undo remet ensemble l’heure de jeu, les couches expirées et les conséquences; Redo les réapplique sans mesurer un délai réel.

## Cas de règles à garder distincts

- **Durée Round vs fin du Tour auteur** : D-12 s’applique à la magie, tandis que les prières peuvent demander une expiration explicitement choisie par l’auteur et certains effets ont une échéance « prochain Tour ». Une durée numérique en Rounds ne suffit pas à identifier la frontière de chaque famille.
- **Temps de campagne en scène suspendue** : le curseur mondial continue uniquement quand le MJ commande une avance explicite. Les scènes suspendues ne prennent pas de Tours de combat. Les effets en temps calendaire peuvent atteindre leur échéance pendant cette avance; les échéances de phase ne sont traitées qu’aux phases permises. Le raccordement doit tenir compte des effets déjà stockés dans ces scènes.
- **Retrait de l’auteur ou du sujet** : l’auteur absent n’efface pas l’échéance de provenance. La politique magique D-12 a un repli de Round; aucune généralisation aux effets divins ou aux couches permanentes ne doit être postulée. Le sujet retiré doit garder une identité locale stable si son effet est censé persister; une suppression complète doit purger les deux ensemble, avec reçu.
- **États à cause persistante et maintien** : certains états ne peuvent pas récupérer avant la fin de leur sort/incident ou cause. Échéance de la couche, effet périodique, délai de récupération et révocation sont des événements distincts; la clock ne les fusionne pas.
- **Échéances ambiguës** : une page qui donne seulement « 6 Rounds », un effet de prière avec fin de prochain Tour, une frontière d’expiration hors combat non précisée, ou un effet divin dont l’auteur quitte une scène avant l’échéance exige d’abord la clause source et la politique enregistrée. Le MJ voit un cas précis et ses effets; l’outil ne choisit pas silencieusement un Round, un Tour, un jour ou une fin de scène.

Cette conception définit le raccordement candidat pour E5, pas une certification des durées de tous les sorts, prières, objets, talents, maladies ou critiques des 17 livres. Les lectures de temps des autres livres et de tous les effets restent à faire selon le plan exhaustif.

## Tranche verticale proposée après gel E3/E4

Première tranche : ajouter `js/core/v5-game-time.js` comme service pur pour l’état/révision de clock, l’empreinte complète des événements, le passage de Round et la comparaison des deadlines typées. `end-turn-v5` (`js/core/combat.js`/`js/core/v5-turn.js`) et legacy `Store.nextTurn` (`js/core/store.js`/`js/core/turn-order.js`) partageront un plan de phases validé et la même mutation atomique de clock, sans devenir le même calcul d’effets. Le legacy n’applique actuellement pas toutes les mécaniques ni demandes de dés de `previewV5Turn`; lui faire appeler cette prévisualisation directement risquerait d’ajouter des règles V5 à ses consommateurs historiques/V4. Chaque adaptateur conserve donc son processeur et contrat existants, mais transmet les phases réellement traversées au service commun. Le plan vérifie coordonnées et ordre contre la transition effective, maintient `state.combat` comme autorité et met à jour la projection clock sans saut. Ne pas avancer le temps depuis la finalisation générique de commandes. Les parseurs restent dans leurs modules; les processeurs magiques/divins/États reçoivent seulement les phases validées et s’exécutent dans la même commande que combat, clock et reçu, pour que sync, reload, Undo et Redo restent atomiques.

Avant ce patch, contrôler les transitions `combat.js`, `v5-turn.js`, `turn-order.js`, les appels `Store.nextTurn`/`executeCommand`, les lectures/écritures `currentMagicRound`, `expiresAtRound`, `remainingMinutes` dans `v5-magic-effects.js`, `v5-magic-time.js`, `v5-magic-turn.js`, `v5-magic-miscasts.js`, et l’expiration par phases dans `v5-divine-engine.js`/`v5-effects.js`. Vérifier aussi les points de persistance et normalisation dans `store.js`, `sanitize.js`, `sync-session.js`, `sync.js` et `sync-protocol.js` : un import local incomplet reste strict; seul le décodeur distant étroit peut réhydrater des `null` ou listes vides supprimés par RTDB.

La recette développeur de cette tranche doit couvrir : mêmes points d’expiration temporelle pour les deux chemins tout en préservant les demandes d’effets/dés legacy; aucun effet d’État supplémentaire sur `Store.nextTurn`; aucun avancement sur les commandes non temporelles; payload différent sous même ID, retry exact et retry après révision ultérieure; baseRevision périmée; phases mal ordonnées ou non issues du plan partagé; combat sans scène, départ/reprise et changement manuel d’index sans fausse fin de Tour; échéance D-12 avec auteur absent limitée aux sorts; reload, Undo/Redo, synchronisation, scénarios de migration réserve/personnages persistants/scènes suspendues avec blocage lorsque l’écriture ne peut être atomique. E0 ajoute ses tests indépendants après gel du checkpoint E3/E4. L’avance explicite de campagne (seconds/minutes/heures/jours) est une tranche suivante, une fois le routage atomique des deadlines Round et leur migration éprouvés.

## Livraison technique de la première tranche

Le service `js/core/v5-game-time.js` et les raccordements de `js/core/v5-turn.js`, `js/core/store.js` et `js/core/sync-session.js` appliquent le plan partagé aux transitions V5 et legacy, synchronisent la projection neutre après la position canonique finale, valident les reçus CAS versionnés et réparent à la frontière RTDB uniquement les champs `null` attestés. L’adaptateur legacy conserve son traitement d’effets séparé. L’expiration d’un effet sans auteur suit le Round d’arrivée; l’Undo doit annuler la transition qui a réellement expiré cette couche.

Le rejeu ciblé communiqué par le principal couvre 78/78 tests E5 et les quatre suites héritées concernées; ce résultat valide seulement cette tranche et ces scénarios. La recette globale de 16 commandes reste à exécuter et à rapporter séparément. L’avance de campagne commandée depuis l’interface, la conversion générale des durées héritées, les autres magasins hors transaction et la certification exhaustive des échéances restent hors de cette tranche.

## Raffinement contrôlé de l’identité CAS

La confrontation principale et technique a reproduit deux contre-exemples : effacer lastEvent à révision positive était accepté; réemployer un ancien ID en changeant baseRevision pouvait former une nouvelle avance après remplacement du dernier reçu. La première tranche adopte donc le format interne `clock-v1:<baseRevision>:<nonce producteur>`. Le suffixe producteur est non vide et distingue les adaptateurs Store et V5; l’identifiant entier inclut sa base immuable. Le preview V5 construit un suffixe déterministe à partir de sa révision locale et de la transition : deux previews identiques ont volontairement le même identifiant. Ce suffixe ne constitue pas un identifiant unique de client; les conflits entre commandes restent soumis au protocole de synchronisation. Tous les validateurs d’événement, de fingerprint et de reçu vérifient ce format et la correspondance exacte de la base encodée. Un ancien identifiant ne peut jamais être accepté à une autre base, sans registre infini d’identifiants.

À révision0, lastEvent est null; à révision positive, un reçu strict est obligatoire et son resultRevision égale la révision de l’horloge. Une réconciliation neutre garde ce reçu historique même si elle modifie la projection de position; elle ne fabrique ni événement ni révision de temps. Les adaptateurs Store et V5 construisent leurs identifiants avec cette base et leur marqueur d’adaptateur; Store ajoute son identifiant client, V5 conserve une construction pure et déterministe. Les tests changent seulement leurs identifiants de fixture pour respecter ce contrat contrôlé; les attentes de rejet, conservation, duplication et ancien retry restent inchangées.
