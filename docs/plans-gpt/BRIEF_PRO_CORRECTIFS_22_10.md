# Brief Claude Pro — lot correctif des décisions du MJ du 22/10

Lis d'abord `docs/plans-gpt/REGLES_COMMUNES_GPT.md`, puis `docs/ARBITRAGES_MJ_21_10.md` (sections « Choix des exécutants revus le 22/10 » et « Mots-clés de participants ») et `docs/DECISIONS_MJ_CHOIX_EXECUTANTS_22_10.md`. Ces décisions modifient un comportement livré : les assertions de tests qui épinglent l'ancien comportement **de ces seuls points** peuvent être mises à jour, chacune listée dans le commit et le rapport. Tests d'abord, un commit par sous-lot, messages terminés par « (Claude Pro) », rapport `docs/plans-gpt/RAPPORT_PRO_CORRECTIFS_22_10.md`.

## K1 — Courroux (phase B)

1. B-C45 : pèlerinage d'Altdorf réussi, l'Exténué « au premier jour de l'aventure suivante » devient un **rappel** (aucun état posé).
2. B-C15 : prière visant plusieurs cibles dont un allié réprouvé : **échec pour le réprouvé seul**, la prière s'applique aux autres.
3. B-C10 : interdictions de Courroux « pendant N Rounds » (21-25, 31-35, 46-50) : **le Round en cours compte comme le premier**, règle fixe, plus de question au MJ.
4. B-C11 : prière due à chaque Tour (76-80) : **elle occupe l'Action du Tour**, règle fixe.
5. B-C50 : relique « −10 à −30 sur la table de Courroux » : malus appliqué **au total** (d100 + 10 × Péché), plus au d100.
6. B-C26 : Hémorragie « au premier matin » : **aube (6 h) proposée par défaut**, modifiable.
7. B-C20 : suivi d'une pénitence en cours (96-100) : **note libre** conservée (retirer ou rendre facultatif le suivi structuré propre à cette ligne ; garder ce qu'exige l'arbitrage Q8 pour les pénitences en général — en cas de contradiction, arrêt BLOCKED documenté et question au MJ).

## K2 — Brisé (phase C)

1. C0-L06-019 : égalité Intimidation / Calme = **échec de l'intimidateur**.
2. C0-L25-003 : Master and Commander devient **un Talent du catalogue** (identifiant, source L25 p.63), le rang vient du Talent ; « à bord » reste un fait MJ.
3. C0-L13-013 : « Cavalier accompli » **lié au Talent Cavalier émérite** (`talent-roughrider` ou l'identifiant réel du catalogue).

## K3 — Magie (phase D)

1. D-C22 : Revigorer **retire un état Exténué** (au lieu d'ignorer la pénalité).
2. D-C30 : Destruction de Démon Mineur : le +10 (converti V5) à une caractéristique s'applique **au lanceur** (nouveau mécanisme, à consigner).
3. D-C32 : Manifestation de Démon Mineur, ordre inachevé à la fin de la durée : **le démon reste et devient hostile**.
4. D-C40 : Relever les morts **refusé tant que les profils Squelettes / Zombies n'existent pas** (phase E les fournira ; brancher dès qu'ils existent).
5. D-C51 : Nurgle, Blessures Suppurées : le moteur **n'applique rien seul mais propose au MJ de jouer le Test** de Blessure Suppurée (bouton ou rappel actionnable).
6. D-C122 : secours au serviteur magique : le soin compte le **Bonus d'Endurance du serviteur**.

## K4 — Réponses du MJ aux deux questions (22/10, 16 h 50)

- D-C15 Fellstave (« Borne sinistre », L02 p.62) : **réussite du Test d'Intuition = la créature comprend que sa panique était magique** (coquille présumée du texte corrigée), en rappel seul. Inverser le choix livré.
- D-C50 : choix livré **confirmé** (sort instantané d'un Domaine du Chaos : aucun effet suivi, simple rappel dans le compte rendu). Rien à coder.

## Runes et familiers (conception, avant tout code)

Mettre à jour `docs/plans-gpt/CONCEPTION_RUNES.md` et `CONCEPTION_FAMILIERS.md` avec les décisions : runes = résultat de gravure saisi (pas d'artisanat), huit runes à dés inversés adaptées au moteur d'inversion (lecture précise à soumettre au MJ avant code), liste de runes **propre à chaque culte** (pp.134-140, à relever) ; familiers = création par un événement unique débitant 1 Destin ou 1 Résilience, familier de joueur représenté comme **PNJ allié**, noms proposés à valider. Le code des familiers (D11) reste bloqué sur les profils de la phase E.
