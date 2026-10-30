# Reprise du chantier préparé avec Gemini — Phase F0

État vérifié le 23 octobre 2026. Reprise sur la branche gpt/phase-f dans le worktree existant, HEAD 7590ed8ef4cda4abe7c50991735d8b2c361575fd. Les seize livres déjà traités restent conservés. Prochain livre : L01.

## Travail retrouvé

- L01 — Archives of the Empire 2.pdf : 95/95 pages extraites avec reçus et empreintes de texte vérifiés ; PDF actuel conforme au manifeste ; 50 images préparées.
- L02 — Archives of the Empire 3.pdf : 95/95 pages extraites avec reçus et empreintes de texte vérifiés ; PDF actuel conforme au manifeste ; 0 images préparées.
- L03 — Archives of the Empire Volume 1.pdf : 96/96 pages extraites avec reçus et empreintes de texte vérifiés ; PDF actuel conforme au manifeste ; 0 images préparées.
- L01 : repérage des couvertures existantes, recherches de règles, exploration du moteur concernant les Ogres, prompt de brouillon et script de lancement/contrôle retrouvés.
- L02 : inventaire des couvertures existantes préparé. L03 : fichier d’inventaire vide, à refaire.
- Conversation locale de reprise identifiée ; sa dernière étape signale une erreur de quota RESOURCE_EXHAUSTED/HTTP429 après création du runner. Ce constat est historique et ne décrit pas les quotas actuels.

## Ce qui reste à faire

- Aucun brouillon JSON ni contrôle JSON du runner retrouvé ; aucun ajout F-L01, F-L02 ou F-L03 dans AUDIT_REGLES.json.
- Le registre reste à 4013 entrées et 3216 sélecteurs. Aucun commit depuis L26 et aucune modification suivie héritée.
- Relire effectivement L01, contrôler les tableaux sur images, vérifier les couvertures dans le moteur et les renvois exacts. Les statuts assiste proposés dans system-draft.md sont des hypothèses, pas des résultats validés.
- Le prompt contient une consigne de renvoi vers E0-P pour une capacité spéciale : ne pas la suivre aveuglément. Un profil ne démontre pas la couverture de toute capacité ; appliquer le brief et vérifier la clause exacte.
- Préserver les reçus read:false : extraction et présence d’images ne prouvent pas une lecture. Ne pas déclarer L01 terminé depuis ces préparatifs.
- Après revue : source AUDIT_REGLES.json, génération des deux sorties, rapport/choix, suite complète et commit local par livre selon le brief. Aucun js/, test hérité, push, fusion ou publication.

## Conservation et prochain point de travail

Les scripts, prompts, recherches et inventaires utiles sont copiés sans modification sous tmp/audit/2026-10-23-reprise-gemini/ ; empreintes et état complet dans recovery-receipt.json. Les extractions et images originales restent à leur emplacement. La récupération ne lance aucun appel API et ne crée aucun commit.

Reprendre L01 — Archives of the Empire 2.pdf, avec vérification de l’édition et du foliotage dans le PDF ; traiter la création des Ogres, les signes astraux, les objets, l’hospice et les batailles dans la portée réellement lue. Puis suivre la succession et le nombre de livres confié par le MJ. Les pistes L02/L03 ne certifient pas leur lecture.
