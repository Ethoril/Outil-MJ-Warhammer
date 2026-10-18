# Contrôle source L06 — calendrier et durée de « Think Over Your Deeds »

## Périmètre et provenance

Relevé documentaire préparé pour la tranche E5, sans modification du runtime ni d’un générateur. Les lectures intégrales texte et visuelles des pages imprimées/physiques 177, 218 et 289 ont été effectuées indépendamment par /root et /root/e1_strictures_control. La page 218 appartenait déjà aux pages lues; seules 177 et 289 sont de nouvelles lectures pour le registre E1. Aucun compteur ne doit donc augmenter au titre de la page 218.

Source : Livre de base V5, L06, SHA-256 53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de. Références imprimées/physiques : p. 177, « Healing Times and Downtime »; p. 218, « Wrath of the Gods — Think Over Your Deeds (06–10) »; p. 289, « The Imperial Calendar — Imperial week ». Contrôle visuel : L06-p177-177.png, L06-p218-218.png, L06-p289-289.png (rendus de travail dans le dossier visualization; hors paquet public).

Les quatre entrées riches calendarReadings gardent leur section documentaire. auditCalendarReadings retire ce seul champ et projette les champs admis par validateReading; l’intégration E1 doit utiliser cette projection, sans modifier le validateur.

## Constat source

- P. 289 établit une semaine impériale de huit jours. P. 177 donne les durées de rétablissement et situe le Downtime à l’échelle d’environ une semaine; la règle d’une semaine de p. 218 peut donc être représentée comme huit jours impériaux en s’appuyant aussi sur p. 289.
- P. 218 : sur un résultat de Courroux 06–10, « Think Over Your Deeds » plafonne à +0 les SL de tout test de Pray réussi pendant la semaine suivante. La durée source est une semaine impériale; imperialWeek encode la longueur source de huit jours justifiée par les p. 177 et 289.
- La représentation temporelle ne vient pas du texte source : l’ancrage après résolution complète du Courroux et la conservation d’échéances indépendantes pour des déclenchements distincts sont des choix de modélisation proposés. La limite +0 reste identique pour chaque occurrence; les occurrences ne s’additionnent pas en une pénalité plus forte.
- Le moteur d’horloge de campagne hors combat est désormais livré et testé. Cela ne fournit pas encore le contrat calendaire divin source, ni la pose et l’expiration d’une échéance divine. Cette préparation ne crée aucune deadline exécutable et n’implémente ni effet ni expireur.
- Convention de représentation seulement : l’application d’une semaine impériale utilise huit jours; la conversion interne d’un jour en secondes relève de l’horloge, et n’est pas une durée exprimée en secondes par la source.

## Lectures et divergence conservée

P. 177 : les deux lectures classent la page comme dependency, pour les durées de récupération/Downtime utiles à l’interprétation temporelle.

P. 289 : /root classe la page religious-candidate, en raison des références voisines aux temples/lieux sacrés de Sigmar, au Rat Cornu, à Manann et Morr, aux lunes et aux fêtes. /root/e1_strictures_control la classe dependency : le passage calendaire établit la semaine de huit jours, mais les mentions religieuses voisines ne constituent pas à elles seules une règle divine candidate dans ce relevé. La divergence de classification est conservée; les deux lecteurs s’accordent sur la semaine de huit jours. Elle ne doit pas être résolue en effaçant l’accord factuel.

La page 218 avait déjà été lue et comptée; elle est référencée comme source de la règle, sans nouvelle entrée de lecture ici. Le relevé préparatoire de onze candidats miracles reste hors de ce compteur et n’ajoute aucune lecture.

## Compteurs E1 si ces deux nouvelles pages sont intégrées

Projection attendue seulement, après intégration des quatre lignes de lecture p. 177 et 289 : 133 identités, 75 pages lues, 72 accords, 3 divergences, 2 619 pages non explorées, 0 livre clos. Tant que le principal n’a pas intégré ces fichiers, les compteurs du registre courant restent inchangés.

## Fichiers de staging

- L06-calendar-readings.mjs : données riches, références et projection stricte auditCalendarReadings.
- DIVIN_L06_CALENDRIER_CONTROLE.md : présent relevé.

Aucune source privée n’est copiée dans le paquet; aucune sortie générée n’est modifiée manuellement.

## Repères courts et limites de cette intégration

P.177 : « Each Downtime […] 8 days by the Imperial calendar ». P.289 : « There are eight days in the Imperial week ». Aucun délai de 7 jours n’est sourcé par ces passages. La conversion seconde/jour appartient à la clock et ne vient pas de ces lignes. Ce relevé n’atteste aucun nouvel effet runtime et se garde sans ancre murale; les dates de lecture n’avancent pas le temps de jeu.

## Erratum après raccordement E1 — 18 octobre 2026

Les quatre lectures p.177 et p.289 ont été intégrées à l’audit au moyen de `auditCalendarReadings`, sans nouvelle identité. L’état généré courant compte 75 lectures de premier rôle, 75 lectures indépendantes, 75 pages doublement classées, 72 accords, 3 divergences, 2619 pages non explorées, 133 identités, 60 associations et 0 livre clos. La p.177 est concordante `dependency`; la p.289 conserve le désaccord `/root` `religious-candidate` / `/root/e1_strictures_control` `dependency`. La p.218 demeure une lecture antérieure et ne s’ajoute pas au compte.

Les paragraphes intitulés « Compteurs E1 si ces deux nouvelles pages sont intégrées » et « Tant que le principal n’a pas intégré ces fichiers » sont conservés comme constat pré-intégration; leurs valeurs conditionnelles sont maintenant l’état courant. La nouvelle suite indépendante source et les suites d’audit/commandements passent 44/44; `node tools/build-divine-audit.mjs --check` confirme les sorties générées. Cela ne clôt pas E1 et n’atteste aucune mécanique runtime nouvelle.
