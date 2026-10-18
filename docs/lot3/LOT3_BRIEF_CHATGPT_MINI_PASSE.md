# Brief pour ChatGPT — mini-passe finale (reliquats de la contre-vérification)

18 octobre 2026. Dernière petite passe avant livraison de la 3.15.0. Règles générales de [ton premier brief](LOT3_BRIEF_CHATGPT_DISSIPATION_ET_FICHES.md) : aucun commit, push, fusion ni déploiement ; aucune commande git destructive ; personne d'autre n'écrit dans le dépôt ; test rouge avant chaque correctif ; aucune sauvegarde de tests dans `tmp/`. Contexte : [rapport des corrections de la seconde relecture](LOT3_RAPPORT_CORRECTIONS_RELECTURE_2.md), contre-vérifié par Claude : livrable, sans régression, avec les cinq reliquats ci-dessous.

**Important pour la feuille** : le MJ n'a **pas encore** reporté les 21 cellules de [LOT3_A_REPORTER_DANS_LA_FEUILLE_RELECTURE_2.md](LOT3_A_REPORTER_DANS_LA_FEUILLE_RELECTURE_2.md). Il reportera tout en une fois après cette passe.

## Reliquats à corriger

1. **Ligne `null` dans l'équipement** : `equipment:[null,{…}]` est conservé par le Store, puis `previewResolution` d'une attaque lève « Cannot read properties of null (reading 'id') ». Même défaut que le point 19 (sorts, talents, compétences) sur un champ voisin : filtrer les lignes non-objets de l'équipement à l'import et à la sanitisation, et vérifier tous les autres tableaux d'une fiche ou d'un participant (armes, armures, traits, états, actions, `spellEffects`…) avec un état hostile issu de la RTDB (trous de tableau = `null`).
2. **« Test secondaire de <cible> (1d100) » affiché pour tous les sorts** (`js/ui/v5-magic-controls.js:68-69`, boucle sans condition) : ne l'afficher que si le contrat du sort prévoit un Test secondaire pour cette cible.
3. **`isTargetDaemon`** (`js/core/v5-magic-attributes.js`) : regex non ancrée `/demon|daemon|…/` sur traits, étiquettes et catégorie ; un trait « Démonologue » ou « Chasseur de démons » est reconnu comme Démon. Reconnaître seulement un trait/étiquette/catégorie exactement « Démon » / « Daemon » (avec ou sans précision entre parenthèses) et `isDaemon`. Même vérification pour la détection Mort-vivant, Artificiel, Éthéré.
4. **Libellés de difficulté non harmonisés** : « Difficile (+0) » reste dans Drain de Magie (HEPG), Blizzard enflammé de Ygethmor (WoM) et le miracle Attaque Rapide ; « Moyen (+2 DR) » reste dans Bannissement Majeur (HEPG) et Pulvérisation Musquée (WoM). Harmoniser avec le reste du catalogue (« Intermédiaire (+0) », « Accessible (+2 DR) ») ; chercher toute autre occurrence dans les onglets Magie et Miracles et dans les libellés des contrats. Le miracle relève de l'onglet Miracles : même méthode (snapshot, miroir CSV, versions).
5. **Apothéose** (HEPG p. 86) : la description oublie le gain de Yenlui (Sombre) à +10 DR ; l'ajouter (relis la page).

## Catalogue et feuille

Après correction : snapshot, miroirs CSV (Magie et, si touché, Miracles) et versions recalculés ; **régénère `Magie_V5.xlsx`** au même emplacement ; si l'onglet Miracles change, produis aussi un petit classeur ou un fichier de cellules pour lui. Remplace le fichier à reporter par un **fichier unique** `docs/lot3/LOT3_A_REPORTER_DANS_LA_FEUILLE_FINAL.md` listant **toutes** les cellules à reporter depuis le report du 14 octobre (les 21 précédentes + les nouvelles), onglet par onglet, avec la cellule (colonne/ligne) et la valeur exacte.

## Validation

Rejoue `node --test`, `tools/check-lot3-generation.mjs`, `browser-magic-v5-smoke`, `lot3-v5-magic-2b-ui-browser`, `lot3-v5-relecture2-ui-browser`, `lot3-v5-relecture2-history-browser`, `lot2-combat-v5-browser`, `browser-references-smoke`, le cloud local et le paquet de livraison hors ligne. Rapport court `docs/lot3/LOT3_RAPPORT_MINI_PASSE.md` : chaque reliquat (fait, test, rouge vu ou non), versions du catalogue, résultat des commandes, nombre de cellules à reporter par onglet.
