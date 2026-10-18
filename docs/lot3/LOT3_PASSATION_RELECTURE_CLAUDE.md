# Lot 3 — suivi pour la relecture complète de Claude

## Reprise courante — 14 octobre 2026, version 3.15.0

Reprendre la **seconde relecture indépendante complète sur une copie de l’arbre local corrigé**, après cette livraison. Source de la copie : C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer, branche codex/lot2-talents-v5, HEAD **fb0f280150cdbdab1af220163abfaa491e2156ee**. Tout le lot demeure non commité et plusieurs fichiers sont non suivis ; une copie du seul diff ou du HEAD perdrait le chantier. Main E:/Outil MJ Warhammer reste sur 08ce45d. Aucun commit, push, fusion ni déploiement autorisé.

Lire [rapport de clôture](LOT3_RAPPORT_CLOTURE.md), [recette complète 3.15](LOT3_RECETTE_3_15.md), [bilan courant](LOT3_FINALISATION_MAGIE.md), [suivi par clause](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [statuts du plan](LOT3_PLAN_CORRECTION_CLAUDE.md), puis cadrage, rapports et retours des lots 1 à 5B et du catalogue.

Points de contrôle sensibles : la vraie fin de Tour, recalcul des couches et base après reload/synchronisation, Protections multiples, consommation des ressources temporaires avant permanentes, source de chaque contrat, effets sous Puissance totale, absence de dés implicites et erreurs de sauvegarde. Vérifier le reçu et ses conséquences, pas seulement applied=true.

À la clôture, les trois clauses précédemment non vérifiées ont des preuves : Aqshy/Frénésie et les huit Vents, L’esprit sur le corps limité aux Tests étendus (Chance locale, reload, expiration et Undo), Résistance magique sous Puissance totale. Les statuts sont respectivement donnée MJ, donnée MJ, conforme ; voir LOT3_PREUVES_CLOTURE.json. L’audit initial et auditBeforeClosure restent dans le JSON.

La section 0 du brief est traitée. Les CSV publics capturés sont dans tmp/lot3/remote-csv, le miroir et le snapshot concordent. Lileath est sans « = » parasite, Petit sans clause de Frappes Mortelles. Les quatre autres cellules « = » sont identiques au téléchargement. Actualisation simulée depuis ces CSV : même contentVersion et Lileath actif. La feuille Google doit rester à jour avant livraison ; tout changement ultérieur est à recontrôler.

Le périmètre restant inclut la relecture C-06 et les contrôles exhaustifs non certifiés de C-03 (bestiaire complet / cas hors catalogue). Les profils nommés et Undo sont éprouvés ; géométrie et faits spatiaux restent MJ. Miracles, runes de maître, Chaos, Pacte de l’âme et techniques différées restent hors périmètre. Pas de PDF personnel dans la copie de livraison ni dans Git.

Format du retour : item/clause, statut conforme/anomalie/donnée MJ/rappel/hors périmètre/non vérifié, source et page, reproduction Store/UI réelle, attendu/observé, fichier et correction proposée. Distinguer ce qui est lu, exécuté et testé. Les instructions et nombres du 10 octobre ci-dessous sont historiques.

## Passation historique — 10 octobre 2026


10 octobre 2026. Mission : confronter les règles, les 277 sorts et les talents magiques au comportement réellement livré ; relever erreurs, clauses oubliées et automatismes annoncés mais absents. La recette passe sur les cas documentés ; la relecture doit élargir ce contrôle à chaque clause.

## Où reprendre

- Dossier : **C:\Users\arnot\.codex\worktrees\lot2-combat-v5\Outil MJ Warhammer**.
- Branche **codex/lot2-talents-v5**, HEAD **fb0f280**, application **3.14.0**. Le travail est non commité : le diff des fichiers suivis seul ne suffit pas, de nombreux modules et documents sont nouveaux/non suivis.
- Le dossier **E:\Outil MJ Warhammer** est le main antérieur, sur **08ce45d**. Préserver les changements du worktree. Aucun push, fusion, déploiement ou changement du catalogue public/des fiches.
- Lire [le bilan actuel](LOT3_FINALISATION_MAGIE.md), [la recette 3.5](LOT3_RECETTE_3_5.md), puis [le cadrage et les arbitrages](LOT3_CADRAGE_MAGIE.md). Les revues Gemini et la recette 3.13.0 sont historiques.

## Périmètre et sources

**277 sorts actifs** : 123 principalement calculables, 132 avec données/choix MJ, 22 principalement narratifs ; 31 suivis fiche transversaux. Ces nombres et les 277 contrats présents ne certifient pas toutes leurs clauses. Les 116 correspondances au livre V5 comprennent des doublons ; les autres familles exigent aussi le contrôle de leur adaptation.

Utiliser [l’audit par sort](LOT3_AUDIT_SORTS.md), son [JSON et ses notes](LOT3_AUDIT_SORTS.json), [la matrice](LOT3_MATRICE_CONTRATS_V5.md) et le catalogue public épinglé dans js/data/reference-snapshot.json. Les propositions et les affirmations de couverture doivent être vérifiées contre les sources et le code.

PDF personnels locaux dans **E:\Projet Warhammer Ennemi Intérieur\tmp\catalogue-bibliotheque\pdfs** : **Livre de base V5 EN v2.pdf** (magie pp. 235–255), **Supplément Elfe - High elf Players Guide v2.pdf** (pp. 80–89), **Winds Of Magic.pdf** (règles pp. 20–23 et profils cités dans l’audit). Vérifier la version et la page ; les règles communes V5 et les arbitrages du MJ priment sur une ancienne clause V4. Ne pas intégrer ces livres dans le dépôt ou le paquet public.

Les **28 talents initialement réservés au lot 3** ont maintenant un registre de traitement ; 19 ont leurs clauses classées moteur/fiche/rappel. Les 9 ayant encore une clause différée relèvent de périmètres distincts : **Béni, Invocation, Haine sacrée ; Magie des runes, Magie des Runes de Maître ; Danse des épées, Dons de Khaine ; Magie du Chaos, Pacte de l’âme**. Les **15 miracles sont seulement inventoriés**, hors de cette recette. Les runes des Cadai, elles, font partie de la Haute Magie livrée.

## Arbitrages à conserver

- **Aucun ingrédient**, stock, consommation ou atténuation d’incident, même si un ancien champ importé le demande.
- Une Focalisation commune aux huit Vents, une autre pour la Haute Magie ; une seule réserve remplie. Commencer l’autre type efface la précédente avant résultat. Réussite : **DR + BFM** cumulés ; critique : **DR + 2 × BFM**, sans incident du seul fait du critique.
- Langue (Magick) doit réussir, puis la réserve s’ajoute aux DR pour atteindre le NI. Toute tentative réelle vide la réserve ; aperçu/annulation préalable ne la consomment pas. Surpuissance plafonnée à **BI + BFM**, coûts V5 **1, 2, 3, 5, 8, 13, 18** ; interdite aux sorts mineurs et grimoires non mémorisés.
- Incidents et tables **V5** ; section Règles cohérente avec le moteur. Haute Magie : épuisement au-delà du BFM, runes des Cadai avec nouveaux dés, un seul attribut choisi.
- Main de Gloire +6 : quatre choix parmi CC/CT/F/E/I/Ag, même 3d10 pour les alliés, M +2, Bmax inchangé. Saphery : aucun plancher supplémentaire, Protection ≤1 automatique. Faux de Shyish : interdit l’Avantage V5 des Morts-vivants contre le porteur, conserve leur Élan.
- Jade : vrai doublon de Forme bestiale, avec Vent de Jade et attribut de Vie. Apothéose : 1 B par DR final avant surpuissance, limité aux Bmax ; morts de moins d’une minute, exclusions et Corruption conservées. Fléau : E ≤ Int bannit ; Int < E < 2 × Int divise Bmax par deux ; E ≥ 2 × Int sans effet principal.
- Effets temporaires dans l’outil, restauration à expiration ; progression, bonus permanents, apprentissage/PX et conséquences durables dans les fiches. Fiction en rappels. Aucun second calcul de valeurs déjà importées, notamment Dur à cuire.

## Carte du code

| À contrôler | Fichiers principaux |
| --- | --- |
| Contrats, source et générateur | js/data/v5-spell-contracts.json ; tools/build-v5-spell-contracts.mjs ; js/core/v5-spell-contracts.js. |
| Tests, réserve, lancement, incidents, dissipation | js/core/v5-magic-channelling.js, v5-magic-casting.js, v5-magic-miscasts.js, v5-magic-dispel.js. |
| Effets, attributs, exceptions, durées, combat | js/core/v5-magic-effects.js, v5-magic-attributes.js, v5-magic-arbitrations.js, v5-magic-time.js, v5-magic-combat.js, v5-magic-arcane-unforgiving.js ; resolution.js et v5-combat-rules.js. |
| Haute Magie et talents | js/core/v5-magic-high.js, v5-magic-talents.js ; js/data/v5-magic-talent-sources.json, v5-magic-talent-coverage.json, v5-talent-coverage.json. |
| Application, persistance, UI, Règles | js/core/store.js, sync-protocol.js ; js/ui/workspace-view.js, resolution-panel.js, v5-magic-controls.js ; js/data/rules.js, magic.js ; sw.js. |

## Méthode et points sensibles

Pour **chaque sort et chaque clause de talent concernée**, suivre : **source → contrat/options → saisie UI → aperçu → application → état réel après sauvegarde, expiration/dissipation et Undo**. Vérifier NI, unités, portée, cible, durée, coûts, seuils, restrictions, déclencheurs et suivi fiche. Un drapeau stocké ou un libellé affiché ne prouve pas que les attaques/Tests suivants l’utilisent.

Contrôler particulièrement :

1. Profils de transformation/invocation réellement conformes ; traits et propriétés Magique/Enflammée, immunités, effets périodiques, entretien et réactions conditionnelles. Les profils animaux proposés n’ont pas reçu une certification exhaustive du bestiaire.
2. Cibles multiples, camps mixtes dans une aire, plafonds et exclusions ; dés secondaires, résistance, Protection et Défiance propres à chaque cible ; Blessures réelles après absorption, absence de doublons d’attributs.
3. Surpuissance spécifique payée et effets dérivés uniquement des dépenses ; [Destruction des Arcanes](LOT3_CORRECTION_DESTRUCTION_ARCANES.md) : 1 DR/PA, +8 dégâts, +3 choix d’objet avec les Tests requis, dégradation physique conservée.
4. Bonus temporaires appliqués une seule fois aux compétences importées, caractéristiques directes et défenses ; cumul, couches du même lancer, retour de transformation avec dégâts/Critiques et horloges auteur/cible.
5. Dés manquants qui bloquent réellement, aucun tirage implicite ; sources/acquisitions canoniques, changement de source après aperçu ; clic répété, révision périmée, coûts/quotas, échec, Undo et rechargement.
6. Couverture honnête : toute clause mesurable sans traitement effectif doit être signalée comme omission ; distinguer les faits que le MJ fournit d’un automatisme manquant. Vérifier aussi les écarts restants entre les descriptions affichées et les paramètres V5 exécutés.

## Recette de départ et rapport attendu

Recette terminée : **1 058/1 058 tests Node**, parcours Edge magie/combat/références/démarrage, **10 scénarios cloud locaux**, paquet PWA **147 assets** vérifié sur bureau/téléphone et hors ligne. Commandes, prérequis et limites dans [la recette 3.5](LOT3_RECETTE_3_5.md) ; preuves dans tmp/lot3/finalization-receipt.json, les logs finalization-*.log, cloud-receipt.json et release-browser-receipt.json. Le cloud de recette utilise Auth/RTDB locaux, IndexedDB native et un pont REST ETag ; aucune validation de séance Google distante n’est revendiquée.

Rejouer les contrôles adaptés et ajouter des sondes indépendantes aux tests existants, notamment des cas limites et de vrais gestes UI. Un résultat vert existant ne clôt pas la relecture du catalogue. Les fixtures doivent rester synthétiques et les services cloud locaux.

Livrer un rapport avec **priorité, sort/talent/clause, source/page ou arbitrage, fichier/ligne, reproduction, attendu/observé et correction proposée**. Ajouter un suivi exhaustif des 277 identités et des clauses magiques, avec statut **conforme / anomalie / donnée MJ nécessaire / rappel / hors périmètre / non vérifié**. Distinguer ce qui a été lu de ce qui a été exécuté et testé ; indiquer exactement ce qui n’a pas pu être vérifié.
