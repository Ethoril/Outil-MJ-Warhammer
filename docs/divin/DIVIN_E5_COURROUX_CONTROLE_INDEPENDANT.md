# E5 — Contrôle indépendant du Courroux calendaire6–10

18 octobre2026. **Contrôle ciblé vert, acceptable pour la recette principale. E5 reste ouvert.** Travail limité au worktree `codex/divin-v5`, sans modification du runtime par le contrôleur, sans commit ni publication.

## Source et portée

Le Courroux **6–10, p.218** plafonne les Tests de Prière réussis à+0DR pendant une semaine. Le contrôle source distinct a confirmé en texte et en rendu PDF la semaine impériale de **huit jours**, p.177 et289. Le [module de source](sources/L06-calendar-readings.mjs) sépare cette preuve de la convention outil de86400secondes par jour. Le contrôleur runtime a relu conception, module, générateur et code; il ne revendique aucune nouvelle lecture PDF ni promotion des compteurs E1.

Cette tranche ne convertit aucune bénédiction, Bouclier ou Soleil en durée calendaire et ne raccorde aucun autre résultat du Courroux.

## Résultats vérifiés

| Preuve | Résultat | Portée |
| --- | --- | --- |
| [Node indépendant final](../../tmp/divin/wrath-independent-final-node.log) | **181/181** |71contrôles Courroux et110régressions héritées inchangées. Reload Node simulé. |
| [Cloud indépendant final](../../tmp/divin/wrath-cloud-independent-green.log) | **25/25**, zéro erreur navigateur | Deux contextes isolés, IndexedDB natif, Auth/RTDB localhost; Store/session/protocole réels et pont REST ETag. |
| Interface principale |4contrôles annoncés verts dans [son reçu](../../tmp/divin/wrath-browser/receipt.json) | Application réelle, formulaires, reload et Undo/Redo; quatre captures1440/390 sombre/parchemin inspectées indépendamment. |
| Générateur | `--check` vert | Registre et inventaire conformes au générateur; aucune édition manuelle du JSON. |

La pose sur l’auteur après résolution fonctionne même si la Prière a échoué. La sanction garde son origine, sa preuve autonome, ses politiques et sa clock de pose; terminer la prière déclencheuse ne la supprime pas. Les réussites restent réussies, les jets et critiques/maladresses restent conservés. Le plafond intervient avant extensions, progression de Soleil, durée de méditation et comparaison d’opposition. La trace utilise les DR de l’option réellement choisie.

Les vrais Tours V5/legacy et l’avance de campagne partagent l’expireur divin, sans second décrément des autres familles. La pose et le retrait gardent les miroirs attestés cohérents; une divergence, un porteur étranger, une ancre future ou une échéance incompatible bloque la commande vérifiée.

Le cloud exerce une **vraie première sanction à clock0**, puis sept jours sans expiration et le huitième jour exact. Il contrôle les feuilles null supprimées par RTDB, reload/Undo/Redo et le conflit entre expirationA et nouvelle sanctionB hors ligne : les deux branches sont exportables, puis seuls clock, reçu et couches gagnants restent après résolution et reload. Les20attentes antérieures sont conservées.

## Défauts reproduits puis corrigés

Les preuves rouges couvrent clock périmée à révision locale identique, ordre des clés JSON, champs mécaniques étrangers, fausse propriété du sujet, miroir vide, ancre future, contradiction durée/identifiant/preuve de maladresse, contournement par phase legacy/V5, Prière de méditation reconnue par nom, défenseur d’opposition et trace du choix inversé. Le [reçu détaillé](../../tmp/divin/wrath-independent-receipt.json) conserve leurs logs et les empreintes.

Deux rouges cloud distincts ont précédé les réparations : source canonique refusée après réordonnancement RTDB; puis `lastEventId:null` perdu sur une ancre initiale après avance de la clock courante. La réparation distante reste limitée à cette ancre initiale attestée. Source forgée, ancre positive incomplète et import local incomplet ne bénéficient pas de cette réparation.

Le certificat temporel exige désormais révision0, seconde0 et ID nul ensemble; une ancre positive exige un ID non vide. Quatre contre-exemples ont été [reproduits rouges](../../tmp/divin/wrath-clock-certificate-red.log) avant correction. Deux autres [rouges du défenseur](../../tmp/divin/wrath-defender-clock-red.log) ont montré le garde absent sur une Prière en opposition avec échéance déjà atteinte ou ancre future. Le Store refuse maintenant ces aperçus et leur application sans mutation.

## Limites et méthode

- Les deadlines divines arbitraires, les autres familles calendaires et les conséquences hors snapshot ne sont pas certifiées. Aucune identité n’est déduite d’un nom ou d’un modèle de PNJ.
- La semaine magique historique reste à10080minutes, soit sept jours : incohérence distincte à contrôler et migrer, sans recalcul silencieux dans cette tranche.
- Le contrôleur n’a pas rejoué séparément les gestes UI du principal. Il a inspecté les quatre rendus : trace4→0 et huit jours lisibles, sans débordement horizontal observé. Aucun téléphone physique ni service de production testé.
- Les premiers rouges de nombreux cas s’arrêtaient à l’absence de pose; leurs assertions profondes non atteintes ne sont pas présentées comme reproduites à ce stade.
- Un nouveau test employait le mot bas niveau `initiator`; seul ce libellé a été corrigé en `attacker`, contrat public historique de `previewResolution`. L’attente0DR, le net2 et les jets/issues n’ont pas changé; [preuve conservée](../../tmp/divin/wrath-opposition-after-fix.log).
- Aucune attente mécanique héritée n’a été abaissée et aucun auteur runtime n’a modifié les contrôles indépendants. La recette globale et les autres nouveaux lots restent soumis au verdict principal.
