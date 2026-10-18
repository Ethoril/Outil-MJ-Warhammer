# Complément au bilan divin : sources retrouvées et périmètre restant

> **État de reprise actualisé :** cette note conserve le contexte initial. La provenance des neuf miracles et le rappel de l’aigle sont désormais corrigés; consulter [le rapport de reprise](DIVIN_RAPPORT_REPRISE.md) et [la passation](DIVIN_PASSATION_FENETRE_SUIVANTE.md) pour le code, les compteurs et la recette actuels. Le périmètre exhaustif reste ouvert.

17 octobre 2026, après la recette initiale. Relecture demandée pour expliquer les arbitrages DIV-01 à DIV-08. Les huit sélecteurs ont reçu les réponses explicites du MJ; elles sont enregistrées dans `DIVIN_DECISIONS_MJ.md`. Aucune publication n’est autorisée par ces choix.

## Correction du constat « neuf sources non retrouvées »

Les neuf miracles supplémentaires du catalogue sont tous présents dans **Up in Arms, page imprimée 79 et page PDF 79**. Le parent et l’agent sources ont relu indépendamment la page rendue, son texte et les correspondances françaises. Le premier résultat de recherche était un faux négatif : les noms anglais présumés différaient des titres réels. La conclusion antérieure d’absence dans Up in Arms était erronée.

Source privée locale : `E:/Projet Warhammer Ennemi Intérieur/tmp/catalogue-bibliotheque/pdfs/Up in arms.pdf`, SHA-256 `0671b27d0e947c7c5387fd4b30cda0512f9182dc811cc0275a18acc96af5fa07`. Capture de contrôle hors dépôt : `C:/Users/arnot/.codex/visualizations/2026/10/17/01a14914-3101-7b82-acfd-286e9fe5a543/recherche-divin-sources/up-in-arms-myrmidia-79.png`.

| Catalogue français | Titre source, p.79 |
| --- | --- |
| Commander la Légion | Command the Legion |
| Effrayer l’Ennemi | Dismay Foe |
| En Bon Ordre | In Good Order |
| Connaître son Ennemi | Know Your Enemy |
| Sur un Terrain Mortel | On Deadly Ground |
| Attaque Rapide | Quick Strike |
| Dévotion de la Guerrière | Shieldmaiden’s Devotion |
| Compétence Martiale | Skill of Combat |
| Vindicte Vengeresse | Vengeful Wrath |

Le constat documentaire devient **15/15 miracles locaux avec source retrouvée** : six dans la base V5, neuf dans le supplément V4. Cela ne valide pas neuf adaptations V5. Les neuf contrats d’exécution restent bloqués dans le code actuel; le registre conserve encore le motif antérieur de source non retrouvée. Sa correction/régénération et les contrats d’adaptation appartiennent au prochain travail, après décision du MJ; ce complément ne modifie aucun JSON généré, CSV ni comportement.

## Adaptations et ambiguïtés effectivement présentes

- Commander la Légion donne un bonus à un Test de Commandement, pas un bonus à toute la caractéristique : conversion V4/V5 à établir.
- Plusieurs portées/zones sont basées sur **la Volonté entière**, alors que le catalogue emploie parfois son **Bonus**; ce n’est pas seulement une question yards/mètres. Connaître son Ennemi et En Bon Ordre doivent notamment être comparés sur ces valeurs.
- Sur un Terrain Mortel possède un défaut dans la source elle-même : `Range: Self`, `Target: You`, puis une zone indiquée à la ligne `Duration`. La durée numérique portée au catalogue ne peut pas être confirmée par cette page. Elle reste un arbitrage explicite, avec recherche d’errata à prévoir.
- Attaque Rapide réclame une séquence au début de Round, un Test d’Initiative et une attaque hors Tour; il faut définir leur résolution V5, la consommation unique et les protections contre double application.
- Terreur, Sans peur (ennemi), Brisé, les relances de Mêlée et les sorties de combat doivent employer les mécanismes V5 relus, avec faits MJ et provenance.
- Les nombres en yards et ceux affichés en mètres nécessitent la convention DIV-03; aucune conversion implicite n’est validée.

## Ce qui manque techniquement

Le moteur divin actuel prend en charge caractéristiques, PA, États et soins structurés; le registre Myrmidia n’utilise actuellement aucun miracle infligeant des Blessures. Un « raccordement » signifie connecter une clause à l’événement réel qui doit l’exécuter, puis éprouver calcul, aperçu, application, persistance, fin et Annuler.

Haine sacrée est une règle V5 connue (p.120) : faculté d’ajouter deux Blessures lorsqu’un miracle en inflige. Il manque la résolution de dégâts de miracle qui reconnaît cette provenance, l’acquisition du talent et le choix d’utilisation, puis applique le bonus au stade correct une seule fois. Soleil flamboyant inflige Aveuglé et ne déclenche donc pas ce talent. Aucun bonus global aux attaques n’est autorisé par cette règle.

Autres raccordements : Conscience/Protection vers le Test de Calme et le choix d’Action/cible; Chance vers le prochain Test raté et sa relance consommée; Droiture/Lance vers l’arme réellement tenue et ses propriétés temporaires; Appel à la Fureur vers Frénésie; Inspirant vers Drillé; Œil vers le profil de l’aigle et les Tests pertinents, avec la perception de scène arbitrée par le MJ. Les huit prières assistées et Haine sacrée demeurent assistés jusqu’à leurs recettes.

## Le périmètre du livre de base restant

La table V5 p.220 liste dix cultes : Manann, Morr, Myrmidia, Ranald, Rhya, Shallya, Sigmar, Taal, Ulric et Verena. Chaque culte a six bénédictions choisies parmi **19 effets génériques** décrits p.221 : cela fait 60 associations culte/bénédiction, pas 60 effets distincts. Le registre ne couvre actuellement que les six effets et les six associations de Myrmidia; treize effets génériques et 54 associations restent à inventorier/raccorder.

Les pages V5 222 à 229 contiennent **60 miracles** (six par culte), recensés ici par leurs en-têtes/paramètres, sans audit clause par clause des 54 hors Myrmidia. Seuls les six miracles Myrmidia du livre ont un contrat local. La source est disponible pour les autres; leur absence relève du périmètre non développé.

Les autres PDF disponibles (notamment Archives of the Empire, Lustria, suppléments elfes/nains et autres ouvrages) n’ont pas fait l’objet d’un inventaire divin exhaustif. Une recherche de termes n’équivaut pas à la lecture de toutes leurs règles, et la présence d’un supplément dans le corpus n’atteste pas qu’il contient des prières relevant de ce moteur. Les 19 bénédictions/60 miracles de base et les neuf miracles V4 de Myrmidia sont des ensembles distincts à suivre.

## État des décisions

DIV-01 porte désormais sur l’intégration/adaptation du supplément retrouvé. DIV-02/03/04/05/06 précisent accès, unités, Courroux, cumul et horloge. DIV-07 choisit une priorité de développement des Tests; DIV-08 choisit l’ordre d’extension du périmètre. Les huit réponses ont été effectivement envoyées et enregistrées dans `DIVIN_DECISIONS_MJ.md`; seuls les détails de règle indécidables restent ouverts. Les travaux restent locaux, sans commit, push, fusion ni publication.
