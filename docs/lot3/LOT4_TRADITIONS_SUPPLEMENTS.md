# Traditions des suppléments et runes naines

FAIT : 144 entrées de lancement manquantes (sorts, rituels et capacité de créature), 82 runes et 17 règles de système. Statuts : engine 0, assisted 0, reminder 0, absent 243. 21 questions ouvertes.

Comparaison aux 277 contrats de `js/data/v5-spell-contracts.json`, noms français et alias, pages et effets. Les ressemblances servent de pistes, jamais d’équivalence mécanique. Le JSON porte les portées, cibles, durées, dépendances et preuves. Les variantes d’une entrée existante restent signalées au lieu d’être dupliquées. Aucun texte de livre recopié, aucune implantation, aucun ajout au catalogue.

Les pages sont imprimées ; les passages ciblés ont été consultés après repérage lexical. Ce repérage ne certifie ni lecture intégrale du corpus ni absence de formulations sans CN. Le manifeste contient 17 livres, aucun L18. Sylvania ne fournit pas la liste Vampires attendue ; cette attente figure dans les questions.

## Lancements manquants

| ID | Source | Nom | Tradition / CN | Résumé | Statut / preuve |
| --- | --- | --- | --- | --- | --- |
| D0b-L01-001 | L01 p.32 | Bonecrusher | Great Maw / 5 | Projectile +4 ignorant l’armure, +20 sur le jet de gravité critique. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L01-002 | L01 p.32 | Bullgorger | Great Maw / 5 | +2 au Bonus de Force pour dégâts et efforts ; repas à la fin ou Exténué ; résistance de Calme à préciser. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L01-003 | L01 p.32 | Braingobbler | Great Maw / 5 | Peur 2 ; si l’ingrédient est la tête d’un proche de l’adversaire, celui-ci résiste avec −20. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L01-004 | L01 p.33 | Taste Death | Great Maw / 2 | Connaître la cause générale et l’ancienneté d’un décès en mangeant la chair ; pas l’identité du meurtrier. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L01-005 | L01 p.33 | Trollguts | Great Maw / 6 | Donne Régénération ; à chaque soin, un non-ogre risque une altération cosmétique après échec d’Endurance. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L01-006 | L01 p.33 | The Maw | Great Maw / 11 | Fosse à dégâts répétés ; Esquive détermine chute et dégâts, trois Enchevêtré Force 60 dans la fosse ; critique à la fermeture. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L01-007 | L01 p.33 | Feast of the Fallen | Great Maw / 9 | Accorde Vampirique à des bénéficiaires ; les dégâts de mêlée soignent. Non-ogres : risque de Sonné ; nourriture infectée : résistance pénalisée. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-001 | L02 p.62 | Dagger of the Art | Hedgecraft / 4 | Bâtonnet changé en dague magique ; BF+8 contre Éthéré ou Corrompu ; maintien par Focalisation à 0 chaque Round. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-002 | L02 p.62 | Fellstave | Hedgecraft / 9 | Calme ou Brisé à l’entrée ; Intuition après récupération pour reconnaître la source, avec formulation à confirmer. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-003 | L02 p.63 | Goodwill | Hedgecraft / 0 | +10 aux Tests de Sociabilité dans la zone ; Animosité et Haine sans effet. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-004 | L02 p.63 | Invigorate | Hedgecraft / 2 | Ignore Exténué pendant la durée, sans retirer les occurrences. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-005 | L02 p.63 | Lovelock | Hedgecraft / 10 | Le buveur s’éprend du premier individu qui pourrait lui plaire ; appréciation et réaction de scène MJ. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-006 | L02 p.63 | Mirkride | Hedgecraft / 0 | Esprit invisible et immatériel séparé du corps ; corps À terre, retour à échéance ou contact, esprit perdu si le corps meurt. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-007 | L02 p.63 | Nepenthe | Hedgecraft / 0 | Le buveur oublie un individu qu’il choisit. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-008 | L02 p.63 | Nostrum | Hedgecraft / 0 | Boire restaure BFM Blessures et guérit une maladie choisie, plus une par deux DR supplémentaires. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-009 | L02 p.63 | Part the Branches | Hedgecraft / 0 | Perçoit esprits, invisibles et démons. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-010 | L02 p.63 | Protection Pouch | Hedgecraft / 5 | +1 DR Calme contre effets surnaturels et +1 DR Endurance contre maladie ou empoisonnement. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-011 | L02 p.64 | Protective Charm | Hedgecraft / 0 | Donne Résistance à la Magie si le porteur ne la possède pas déjà. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-012 | L02 p.64 | Sightstep | Hedgecraft / 7 | Dissimule la nature magique et aide la discrétion contre esprits/démons/éthérés ; interdit lancement, dissipation et canalisation. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-013 | L02 p.64 | Silvertide | Hedgecraft / 4 | Trouve progressivement 1d10 sous ; reçu de butin plutôt que création immédiate d’argent. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-014 | L02 p.64 | The Ousting | Hedgecraft / 8 | Volonté ou perte de BFM Blessures ; à zéro, Éthéré/Démon banni pour la durée. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-015 | L02 p.64 | Wyrd Ward | Hedgecraft / 4 | Après opposition de Volonté gagnée, −2 DR aux lancements et canalisations des traditions sombres précisées. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L02-016 | L02 p.80 | Spirit-Bonding Ritual | Any Lore / 30 | Rituel d’attachement d’un familier : dressage et semaine d’accord préalables ; échec retire Dressé Magie ; CN doublé par familier existant. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-001 | L12 p.82 | Bilebrew | Great Maw / 6 | Haine envers la cible ou le groupe choisi par le boucher. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-002 | L12 p.82 | Bloodgruel | Great Maw / 5 | Endurance +40 : soigne un plus les DR ; échec contracte la Courante Galopante. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-003 | L12 p.82 | Get Some Guts | Great Maw / 6 | Les bénéficiaires ignorent Brisé pendant la durée sans le retirer. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-004 | L12 p.82 | Toothcracker | Great Maw / 8 | Endurance du boucher ou perte de dents ; +20 Calme/Endurance et un PA partout pour les bénéficiaires. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-001 | L09 p.64 | Arnzipal’s Black Horror | Dark Magic / 13 | Force −1 DR ou trois Blessures ; Maladresse : Destin ou disparition mortelle. Vortex déplacé de 1d10+5 yards par Round. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-002 | L09 p.64 | Arnzipal’s Dimensional Door | Dark Magic / 10 | Relie deux lieux par un portail ; incident remplace la table par une ouverture chaotique et un démon mineur. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-003 | L09 p.65 | Bladewind | Dark Magic / 9 | Projectile BFM+4 sur chaque cible ; mêlée −1 DR ou armure ignorée. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-004 | L09 p.65 | Chillwind | Dark Magic / 10 | Projectile +8 sans armure ; Endurance ou Exténué par Round, −3 DR aux tirs dans la zone. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-005 | L09 p.65 | Dark Hand of Destruction | Dark Magic / 7 | Projectile +12 ignorant et détruisant l’armure non magique de la localisation. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-006 | L09 p.65 | Darkstar Cloak | Dark Magic / 8 | Double les DR de canalisation Dhar ; toucher la cape expose autrui à la Corruption mineure. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-007 | L09 p.65 | Death Spasm | Dark Magic / 6 | Projectile +4 sans armure ; victime blessée frappe tous ceux à un yard avec sa CC brute et sans talent/trait. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-008 | L09 p.65 | Disturbing Voices | Dark Magic / 7 | Tirer trois corruptions mentales et appliquer leurs effets temporairement. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-009 | L09 p.65 | Dominion | Dark Magic / 10 | Début de Tour dans la zone : Calme −3 DR requis pour se déplacer, attaquer ou lancer sans permission de la sorcière. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-010 | L09 p.65 | Doombolt | Dark Magic / 7 | Projectile +8 ; Savoir Magie facultatif à 0 pour +4 dégâts, échec provoquant incident majeur. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-011 | L09 p.66 | Grasping Darkness | Dark Magic / 9 | Enchevêtré égal à BI−BF cible ; résistance opposée en début de Tour ; corps contrôlé tant qu’entravé, Tests physiques −2 DR. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-012 | L09 p.66 | Memory Leech | Dark Magic / 10 | Calme −1 DR ; chaque DR négatif retire un talent ou remet une compétence à sa base ; la sorcière peut accéder aux apprentissages volés. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-013 | L09 p.66 | Paralysing Nightmares | Dark Magic / 6 | Chaque réveil donne Exténué, −15 Volonté et Sociabilité, exposition mineure ; Calme avant sommeil pour cesser. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-014 | L09 p.66 | Poisoned Whispers | Dark Magic / 8 | Impose une Psychologie à la victime ou à ses proches ; résistance opposée de Calme. Durée en Rounds et récupération quotidienne discordantes. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-015 | L09 p.66 | Power of Darkness | Dark Magic / 8 | +10 Force/Initiative aux alliés ; +2 DR de canalisation Dhar à la sorcière ; exposition mineure à la fin. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-016 | L09 p.66 | Shroud of Despair | Dark Magic / 8 | Exténué selon les DR de lancement ; Calme à 0 ou un Brisé. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-017 | L09 p.67 | Skies Made Subservient | Dark Magic / 10 | Contrôle les conditions météo et le vent ; table Sea of Claws extérieure au corpus mentionnée. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-018 | L09 p.67 | Soul Stealer | Dark Magic / 9 | Projectile +0 sans Endurance ni armure ; par deux Blessures, transfère une Blessure maximale et soigne la sorcière. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-019 | L09 p.67 | Stricken Voices | Dark Magic / 9 | Projectile +0 sans armure ; les cibles suffoquent jusqu’à Endurance −1 DR en début de Tour. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-020 | L09 p.67 | Stolen Aspect | Dark Magic / 7 | Calme −3 DR ou Psychologies partagées ; Calme pour s’agresser ; accès du lanceur aux souvenirs. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-021 | L09 p.67 | Unravelling Will | Dark Magic / 7 | −4 DR aux Tests de Volonté. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-022 | L09 p.67 | Witch Flight | Dark Magic / 9 | Transport par tourbillon ; créatures de taille moyenne ou moindre proches du départ et de l’arrivée : Athlétisme ou À terre. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-023 | L09 p.67 | Withering Presence | Dark Magic / 8 | −5 DR de Sociabilité ; Calme −2 DR à chaque heure pour terminer. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L09-024 | L09 p.67 | Word of Pain | Dark Magic / 7 | Calme ou Endurance −1 DR, pénalisé des DR de lancement ; échec pénalise tous les Tests selon la marge. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L07-001 | L07 p.81 | Shroud of Fog | Shadows / 8 | Brouillard non magique, visibilité dix yards, non dissipable. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L07-002 | L07 p.128 | Uproot the Mountains | High Magic / 8 | Athlétisme −30 pour agir et bouger ; surincantation déplace le relief et permet une avalanche. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L07-003 | L07 p.129 | Earth Line | High Magic Slann / 10 | Endurance −20 ou dégâts 15 sans armure le long de la ligne ; variantes de pont et défrichage. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L07-004 | L07 p.129 | Ruination of Cities | High Magic Slann / 12 | Effondrement ; Esquive −20 ou dégâts 20 et ensevelissement/suffocation ; variantes structures fortifiées et crevasses. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L07-005 | L07 p.129 | Mental Blast | High Magic Slann / 7 | Dégâts BI+6 sans armure, encore +6 contre démons/morts-vivants ; Intelligence +20 ou Sonné. Variantes majeures d’Itza et sacrifice du Slann. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-001 | L08 p.102 | Artist’s Touch | Vaul / 0 | Objet non magique en fabrication : qualité Élégant. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-002 | L08 p.102 | Patience of Vaul | Vaul / 0 | Objet non magique en fabrication : total de DR requis divisé par quatre sans dégrader sa qualité. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-003 | L08 p.102 | Vaul’s Grace | Vaul / 7 | Arme ou armure non magique en fabrication : Légère ; les autres qualités restent déterminées normalement. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-004 | L08 p.102 | Vaul’s Rage | Vaul / 5 | Explosion : dégâts +6 sans armure, deux Enflammé, Esquive ou À terre/Sonné dans le premier rayon ; effets réduits au second, artisan/outils épargnés. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-005 | L08 p.102 | Divination of Flames | Vaul / 4 | Sacrifice d’objet ; observe les créatures près de la forge ; surincantations sous Yenlui clair pour invisibles ou ciblage sans vue. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-006 | L08 p.103 | Divination of Stones | Vaul / 6 | Sacrifice d’objet ; localisation et quantité de minéraux, aide à la fabrication ; option ithilmar sous Yenlui clair. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-007 | L08 p.103 | Fires of Perfection | Vaul / 9 | Sacrifice de vue ; ignore défauts et malédictions de fabrication ; option pour ajouter un autre sort de Vaul. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-008 | L08 p.103 | Wisdom of the Skysteel | Vaul / 11 | Sacrifice de vue ; permet fabriquer l’ithilmar avec réduction d’encombrement ; options magique ou fragilisation. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-009 | L08 p.103 | Fortress of Hotek | Vaul / 14 | Sacrifice de vue ; choisir barrière de feu, protection, fonte du métal ou renfort des portes ; défenses additionnelles par surincantation. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-010 | L08 p.106 | Fishbonding | High Elf Sea Magic / 0 | Améliore l’attitude d’un poisson non magique non prédateur ; monture possible selon compétence. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-011 | L08 p.106 | Stormsense | High Elf Sea Magic / 0 | Connaître direction, intensité, déplacement et caractère magique des tempêtes proches. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-012 | L08 p.106 | Ocean’s Fury | High Elf Sea Magic / 8 | Tempête non dissipable gagnant trois degrés successifs d’intensité. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-013 | L08 p.106 | Spirits of the Waves | High Elf Sea Magic / 5 | Élémental de vent : direction par concentration ou vortex aléatoire ; effets sur gréement, visibilité et vent ; nombre accru par trois DR. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-014 | L08 p.106 | Armour of Mathlann | High Elf Sea Magic / 10 | Sacrifice de deux Exténué ; armure de coque 2 ; options taille, armure 3 ou protection du gréement/équipage. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-015 | L08 p.106 | Call of the Seas | High Elf Sea Magic / 14 | Sacrifice Exténué/Blessures ; apparition retardée d’un Merwyrm non contrôlé ; options amitié et permanence modifiant Yenlui. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-016 | L08 p.107 | Cloak of Mathlann | High Elf Sea Magic / 11 | Sacrifice Exténué/Blessure ; −3 DR pour percevoir ou viser le navire, sillage repérable ; options de taille. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-017 | L08 p.107 | Mistress of the Deep | High Elf Sea Magic / 9 | Sacrifice Exténué/Blessure ; chant forçant Calme −10 chaque Round à vingt yards, sinon attiré et Sans défense ; profils alternatifs à choisir. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-018 | L08 p.107 | Waterlungs | High Elf Sea Magic / 7 | Sacrifice d’Exténué ; respiration aquatique, options sens aquatiques ou suffocation dans l’air. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-019 | L08 p.107 | Writhing Mists | High Elf Sea Magic / 6 | Sacrifice d’Exténué ; tirs ennemis −20, discrétion alliée +20 ; concentration ; variantes déplacement du nuage et Peur 1. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-020 | L08 p.110 | Divine Stylus | Hoeth / 0 | Écrit en lumière les langues connues ; lettres durant BFM heures, sans dessins. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-021 | L08 p.110 | Enlightenment | Hoeth / 0 | +20 Intelligence et Volonté ; retire Bestial/Craintif temporairement. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-022 | L08 p.110 | Arcane Insight | Hoeth / 8 | Révèle propriétés magiques et malédictions ; Intelligence pour sa création, recherche étendue pour les artefacts complexes. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-023 | L08 p.110 | Greater Spirit Bond | Hoeth / 4 | Étend télépathie et Traits de compagnon à Volonté miles ; aide au lancement exclue à cette distance. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-024 | L08 p.110 | Crucible of Light | Hoeth / 6 | Recherche étendue sacrifiée ; épée magique Rapide, options de qualités, talents et permanence en fabrication. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-025 | L08 p.110 | Mnemonic Control | Hoeth / 6 | Recherche étendue requise ; prochain Savoir/langue non magique réussi avec les DR du lancement si connaissance plausible ; options lancement ou effacement d’un souvenir. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-026 | L08 p.111 | Psychic Sending | Hoeth / 7 | Recherche étendue ; message d’une minute à une connaissance ; variantes image ou destinataire au nom connu. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-027 | L08 p.111 | Sacred Wards | Hoeth / 11 | Recherche étendue ; mot de passe et choix oubli, pureté, observation ou vérité ; une seule pose, renouvellement CN0, option semaines. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-028 | L08 p.111 | Soulcraft | Hoeth / 10 | Lie un esprit à une pierre ou ligne tellurique ; résistance de Calme augmentant le CN ; fenêtre d’une heure pour un mort récent. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L08-029 | L08 p.111 | The Primary Words | Hoeth / 15 | Recherche étendue ; langage primordial pour communication simple ; options espèces anciennes, esprits/élémentaux/démons. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L14-001 | L14 p.83 | Phoenix Reborn | Fire — capacité de créature / 2 | Action spéciale à la mort avec Langue Magique 50 ; réussite permet renaissance après le brasier, à Blessures aléatoires selon les DR. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-005 | L12 p.98 | Behave! | Little Waaagh / 2 | Squig, loup géant, araignée ou snotling suit les ordres comme un chien dressé. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-006 | L12 p.98 | Cunnin’ Words | Little Waaagh / 0 | Le destinataire comprend le chamane dans sa propre langue. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-007 | L12 p.98 | Curse of Da Bad Moon | Little Waaagh / 9 | Ennemis : un Exténué et dépenses de Chance interdites. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-008 | L12 p.98 | Gift of the Spider-God | Little Waaagh / 3 | Donne Venin à 0, ou à −10 si déjà présent. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-009 | L12 p.98 | Gork’ll Fix It | Little Waaagh / 5 | Un Exténué pendant la durée. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-010 | L12 p.98 | The Great Green Spite | Little Waaagh / 20 | Les touches des gobelins contre les ennemis dans la zone deviennent critiques ; hobgobelins si chamane hobgobelin. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-011 | L12 p.98 | Itchy Nuisance | Little Waaagh / 4 | −1 DR général, −2 si armure métallique. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-012 | L12 p.98 | Mork Wants Ya! | Little Waaagh / 9 | Force opposée à 80 ou dégâts 10 puis chute de 2d10 yards. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-013 | L12 p.99 | Night Shroud | Little Waaagh / 5 | Aveuglé et Perception ou À terre pour se déplacer ; Vision nocturne/noir exemptées. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-014 | L12 p.99 | Nikkit! | Little Waaagh / 3 | Vol distant avec Escamotage 55 ; Perception peut voir le butin revenir. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-015 | L12 p.99 | Sneaky Stabbin’ | Little Waaagh / 8 | Les frappes gagnent Empaleuse et Pénétrante. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-016 | L12 p.99 | Vindictive Glare | Little Waaagh / 7 | Projectile +4 ; cible blessée : Calme à 0 ou Sonné. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-017 | L12 p.100 | ‘Ard as Nails | Big Waaagh / 3 | Haine des ennemis, pénalités des États/maladies ignorées, +2 DR aux Tests d’Endurance. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-018 | L12 p.100 | Bash ‘Em Lads! | Big Waaagh / 6 | Répartit les Avantages selon les DR ; adaptation à l’Avantage de groupe et variante Lustria. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-019 | L12 p.100 | Brainbursta | Big Waaagh / 5 | À terre et Sonné selon DR ; si Sonné dépasse BE, Calme +20 ou critique tête. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-020 | L12 p.100 | ‘Eadbutt | Big Waaagh / 6 | Projectile à la tête +1, +6 si cible harmonisée/percevant la magie ; cartouche différent de Lustria. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-021 | L12 p.100 | ‘Ere We Go! | Big Waaagh / 7 | Deux Avantages réservés à la mêlée ; hobgobelins à la place si lanceur hobgobelin ; variante de groupe. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-022 | L12 p.100 | The Evil Sun | Big Waaagh / 12 | Dégâts 8+DR par Round ; Endurance ou Enflammé. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-023 | L12 p.100 | Fists of Gork | Big Waaagh / 2 | Abandonne objets tenus ; seules attaques des poings, mêlée bagarre 55 et dégâts +9. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-024 | L12 p.101 | Foot of Gork | Big Waaagh / 10 | À terre et dégâts 8 sans armure ; Esquive −10 réduit à 4. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-025 | L12 p.101 | Gaze of Mork | Big Waaagh / 5 | Projectile +4 sur les vivants de la ligne et bâtiments à Endurance limitée. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-026 | L12 p.101 | The Hand of Gork | Big Waaagh / 9 | Déplace un groupe dans la portée ; entrée immédiate en mêlée donne Avantage. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-027 | L12 p.101 | Mork Save Us! | Big Waaagh / 8 | Donne Protection 10 ou améliore la protection existante selon les DR ; limite différente de Lustria. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L12-028 | L12 p.101 | WAAAGH! | Big Waaagh / 12 | Avantage pour mêlée/tir, retrait de tous les Brisé, +2 DR Calme/Endurance ; alliés et ennemis concernés. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L16-001 | L16 p.86 | Rouse Idol of Gork (or Mork) | Waaagh Magic / 100 | Anime une idole Grande ; CN200 Énorme, CN400 Monstrueuse ; Endurance à chaque Round de canalisation ou perte définitive de Force/Endurance. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-001 | L17 p.26 | Belligerence of the Bloodmarsh | Arcane / 2 | Donne le Trait Frénésie si absent. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-002 | L17 p.26 | Collapse Construct | Arcane / 6 | Opposition Volonté/Endurance ; victoire rend la créature inerte. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-003 | L17 p.26 | Decipher Curse | Arcane / 4 | Identifie bienfait, malédiction et déclencheur ; Intelligence ou exposition modérée à la Corruption. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-004 | L17 p.26 | Disrupt Magic | Arcane / 8 | Avant achèvement d’une canalisation ou d’un rituel : Volonté opposée, puis échec du sort et incident mineur si victoire. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-005 | L17 p.26 | Fly-Infested Rotweed | Arcane / 4 | Donne Perturbant. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-006 | L17 p.26 | Lifebloom Silt | Arcane / 4 | Double les Blessures régénérées. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-007 | L17 p.27 | Silence | Arcane / 4 | Zone sans sons traversants ni internes ; lancement de sorts à −3 DR. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-008 | L17 p.27 | Succour Magical Servant | Arcane / 2 | Soigne BE Blessures, deux fois BE avec +3 DR. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-009 | L17 p.28 | Bind Monstrous Beast | Beasts / Blessures de la bête | Repaire à portée de Volonté ; sacrifices d’Endurance/Exténué à la canalisation puis Volonté opposée pour contrôler. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-010 | L17 p.28 | Bind Spirit Within Power Stone | Eight Winds / 32 | Lie un esprit mineur à une pierre ; CN divisé par deux à jonction ou fulcrum ; bénéfices selon l’esprit. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-011 | L17 p.28 | Carve Ogham Stone | Any / 50 | Prépare un granite gravé avec Langue Magique et Art ; propriété attraction, confinement ou atténuation ; fatigue possible par Round. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-012 | L17 p.28 | Create Power Stone | Eight Winds / 64 | Deux apprentis, 1d10 heures de préparation ; CN divisé par deux à jonction ou fulcrum ; crée une pierre du Vent. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-013 | L17 p.29 | Conjuration of the Bloody Hidesman | Beasts / 85 | Totem de huit grands animaux et forte saturation ; contrôle Volonté/Force, fatigue de canalisation, souffle de Ghur si échec. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-014 | L17 p.29 | Conjuration of the Incarnate Elemental of Death | Death / 90 | Sablier de poudre d’os royaux et saturation requise ; contrôle ; échec : dégâts directs/À terre autour du lanceur. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-015 | L17 p.30 | Conjuration of Jack O’ Cinders | Fire / 85 | Grand brasier et saturation requise ; contrôle ; échec donne quatre Enflammé aux personnes proches. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-016 | L17 p.30 | Corrupt Waystone | Dark Lore / 60 | Corrompt sa fonction et perturbe le flux des lignes ; fatigue de canalisation ; conséquences environnementales MJ. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-017 | L17 p.30 | Create Construct | Any / 60 | Forme matérielle préalable ; coût de CN modifié par Traits ; perte définitive de Force/Endurance possible à chaque Round. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-018 | L17 p.31 | Minor Elementals | Any / deux fois le CN de construction | Variante de construction sans coque, Taille Petit, Magique et Imprégnation du Vent ; contrôle opposé ; durée accrue sous saturation. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-019 | L17 p.31 | Create Familiar | Any / 45 | Sacrifice définitif d’une Blessure, Destin ou Résilience ; vaisseau et modificateurs de forme ; deuxième familier CN80 et sacrifice doublé. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-020 | L17 p.32 | Create Waystone Property | Any / 40 | Crée amplification, confinement, atténuation ou réfraction ; fatigue de canalisation et risque de perturber le réseau. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-021 | L17 p.32 | Cursecraft | Any / 50 ou 25 traditions sombres | Bienfait associé à une malédiction choisie avec MJ ; Blessure sacrifiée définitivement et exposition modérée. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-022 | L17 p.32 | Imbue Staff | Eight Winds / 35 | Chance ou Résolution sacrifiée ; transforme le bâton en bâton enchanté. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-023 | L17 p.32 | Invocate Daemon | Daemonology / Volonté du démon | Octagramme préalable, nom et sacrifices ; manifestation sans obéissance garantie ; coût corporel possible chaque Round. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-024 | L17 p.33 | Materialise the Living Swamp | Death/Life/Shadows/Hedgecraft/Witchcraft / 40 | Pierre-cœur et matière organique, saturation requise ; perte définitive possible par Round ; créature contrôlée et révocable. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-025 | L17 p.33 | Remove Curse | Any / 40 | Après identification, retire bienfaits et maléfices ; conserve arme magique ; Calme ou Corruption par Round. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-026 | L17 p.33 | The Crossed Scythes | Death / Volonté de l’entité | Gravure étendue puis rituel ; empêche la sortie du mort-vivant : Calme ou Exténué, Endurance et Blessures pour Construction. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-027 | L17 p.217 | A Bite of Midges | Mòna — Marsh Magic / 5 | Dégâts +2 en fin de Round aux sang-chauds ; Endurance +20 ou Aveuglé/Exténué. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-028 | L17 p.217 | Despondent Slough | Mòna — Marsh Magic / 6 | Enchevêtré Force Intelligence, accru par deux DR ; Calme +20 chaque Round entravé ou Exténué. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-029 | L17 p.217 | Inculcate Mizzle | Mòna — Marsh Magic / 9 | Pluie froide : Endurance +40 ou Exténué hors Fimir ; −2 DR Poudre noire, Feu et entrée en Frénésie. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-030 | L17 p.217 | Mystic Mist | Mòna — Marsh Magic / 4 | Même effet que Miasme mystifiant mais CN4 pour Mòna. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-031 | L17 p.217 | O Mere Be More | Mòna — Marsh Magic / 20 | En bordure de marais, étend celui-ci ; le texte le présente comme un travail encore imparfait. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-032 | L17 p.217 | Turned Around | Mòna — Marsh Magic / 4 | La cible ne doit pas savoir qu’elle est maudite ; −3 DR Navigation dans un marais. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |
| D0b-L17-033 | L17 p.218 | Skin of Bone and Bark | Life + Beasts / 1 Ghyran et 3 Ghur | Deux magisters contribuent dans le même Round ; +20 Endurance au bénéficiaire. | absent ; docs/lot3/LOT3_CADRAGE_MAGIE.md:18 |

## Runes : système séparé

Les runes permanentes sont apprises puis gravées sur un support physique par Test étendu hebdomadaire ou activité. Trois runes maximum ; cumul sur le même objet, meilleur ensemble entre objets. Les règles de Forme, Fierté et Jalousie limitent support, copies à proximité et runes de maître. Les runes de Destinée sont activées par Action sur une Enclume, avec un Test propre et dissipation possible. Les runes Cadai de Haute Magie ne prouvent pas ce système nain.

| ID | Source | Rune / type | DR de gravure | Effet | Statut |
| --- | --- | --- | --- | --- | --- |
| D0b-R-001 | L15 p.125 | Rune of Cleaving / arme | 10 | +1 dégât par rune. | absent |
| D0b-R-002 | L15 p.125 | Rune of Retribution / arme | 12 | +20 à la gravité critique par rune. | absent |
| D0b-R-003 | L15 p.125 | Rune of Cutting / arme | 10 | Ignore deux PA par rune à la touche. | absent |
| D0b-R-004 | L15 p.125 | Rune of Daunting / arme | 14 | Arme dégainée : Peur selon nombre de runes, ajout à l’indice préexistant. | absent |
| D0b-R-005 | L15 p.125 | Rune of Fire / arme | 16 | Lumière et Enflammé sur dégâts ; deux/trois runes permettent une attaque à distance de zone sans dégâts mais avec Enflammé. | absent |
| D0b-R-006 | L15 p.125 | Rune of Fury / arme | 15 | Rangs de Maniement de deux armes ; l’arme compte comme deux pour ses attaques. | absent |
| D0b-R-007 | L15 p.125 | Grudge Rune / arme | 10 | +10 pour toucher et +1 dégât par rune contre l’ennemi de rancune de sang nommé ; changement possible à fin d’aventure après sa mort. | absent |
| D0b-R-008 | L15 p.125 | Rune of Might / arme | 10 | +3 dégâts par rune contre une cible plus grande. | absent |
| D0b-R-009 | L15 p.125 | Rune of Speed / arme | 10 | +10 Initiative par rune tant que l’arme est portée au combat. | absent |
| D0b-R-010 | L15 p.125 | Rune of Striking / arme | 14 | +10 de mêlée spécialisée par rune, pour cette arme seulement. | absent |
| D0b-R-011 | L15 p.125 | Master Rune of Alaric the Mad / arme maître | 30 | Ignore PA et autres bénéfices de l’armure. | absent |
| D0b-R-012 | L15 p.125 | Master Rune of Breaking / arme maître | 20 | Attaque ou opposition de mêlée réussie détruit l’arme magique utilisée par l’adversaire dans son Test. | absent |
| D0b-R-013 | L15 p.126 | Master Rune of Flight / arme maître | 20 | Arme de jet portée 3×BF, Précise et retour en main après dégâts. | absent |
| D0b-R-014 | L15 p.126 | Master Rune of Skalf Blackhammer / arme maître | 28 | Toute attaque réussie compte comme critique. | absent |
| D0b-R-015 | L15 p.126 | Master Rune of the Slayer / arme maître | 20 | Contre le type choisi : inversion des jets d’attaque et de gravité critique. | absent |
| D0b-R-016 | L15 p.126 | Master Rune of Snorri Spangelhelm / arme maître | 22 | Échec de mêlée remplacé par réussite à zéro DR ; l’opposition peut encore gagner. | absent |
| D0b-R-017 | L15 p.126 | Master Rune of Haste / arme maître | 20 | Rapide avec −30 à l’opposition en mêlée. | absent |
| D0b-R-018 | L15 p.126 | Rune of Force / armure | 14 | Charge réussie : dégâts supplémentaires selon PA de la meilleure localisation, par rune ; le corps du texte nomme Impact. | absent |
| D0b-R-019 | L15 p.126 | Rune of Fortitude / armure | 14 | +10 Endurance par rune. | absent |
| D0b-R-020 | L15 p.126 | Rune of Iron / armure | 12 | +2 Blessures par rune ; retrait enlève ces Blessures et peut provoquer un critique. | absent |
| D0b-R-021 | L15 p.126 | Rune of Resistance / armure | 12 | +10 par rune pour opposer une attaque de mêlée. | absent |
| D0b-R-022 | L15 p.126 | Rune of Shielding / armure | 12 | Réduit de deux par rune les dégâts des tirs et sorts ; zéro ne cause pas de Blessure minimale. | absent |
| D0b-R-023 | L15 p.126 | Rune of Stone / armure | 10 | +1 PA par rune ; armure portant seulement ces runes exemptée de Fierté. | absent |
| D0b-R-024 | L15 p.126 | Master Rune of Adamant / armure maître | 22 | Inversion possible du jet de gravité critique reçu. | absent |
| D0b-R-025 | L15 p.126 | Master Rune of Gromril / armure maître | 20 | Supprime Faiblesses ; armure indestructible sauf défaut runique et résistante aux réductions de PA ; dégâts qui ignorent l’armure restent possibles. | absent |
| D0b-R-026 | L15 p.127 | Master Rune of Steel / armure maître | 20 | Dix Blessures perdues au maximum par instance de dégâts. | absent |
| D0b-R-027 | L15 p.127 | Rune of Clear Sight / talisman | 8 | À l’œil : ignore brumes ordinaires ; deux runes brumes magiques ; trois obscurité totale. | absent |
| D0b-R-028 | L15 p.127 | Rune of Truth / talisman | 8 | Au contact détecte contrefaçon ; deux détectent illusion, trois révèlent le procédé. | absent |
| D0b-R-029 | L15 p.127 | Rune of Far Sight / talisman | 10 | Vision à un, deux ou quatre miles selon nombre de runes. | absent |
| D0b-R-030 | L15 p.127 | Rune of the Furnace / talisman | 10 | Pas d’Enflammé ni exposition à chaleur ; réduction de quatre dégâts de feu par rune. | absent |
| D0b-R-031 | L15 p.127 | Rune of Luck / talisman | 10 | Chance au-delà du maximum par rune ; retrait enlève ces points et récupération à la séance suivante seulement. | absent |
| D0b-R-032 | L15 p.127 | Rune of Restoration / talisman | 10 | Après une nuit en le portant, soin égal à BE par rune. | absent |
| D0b-R-033 | L15 p.127 | Rune of Spellbreaking / talisman | 10 | Dissipation par opposition de Maîtrise des runes contre un lancement visible dans Volonté yards ; une activation par rune et combat. | absent |
| D0b-R-034 | L15 p.127 | Rune of Spelleating / talisman | 10 | Après dissipation par Bris de sort, interdit le même sort au lanceur pour BFM Rounds, heures ou semaines selon nombre de runes. | absent |
| D0b-R-035 | L15 p.127 | Rune of Warding / talisman | 15 | −10 par rune aux attaques et lancements ciblant le porteur. | absent |
| D0b-R-036 | L15 p.127 | Master Rune of Balance / talisman maître | 20 | Inverser lancement ennemi visible ou opposition runique dans sa portée. | absent |
| D0b-R-037 | L15 p.127 | Master Rune of Industry / talisman maître | 20 | Une activité supplémentaire entre aventures. | absent |
| D0b-R-038 | L15 p.128 | Master Rune of Kingship / talisman maître | 24 | Inverser Charme/Intimidation/Commandement visant un nain ou groupe majoritairement nain. | absent |
| D0b-R-039 | L15 p.128 | Master Rune of Passage / talisman maître | 20 | À la marche traverse solides immobiles ; pas animaux/morts-vivants, ni fin de déplacement dans un solide. | absent |
| D0b-R-040 | L15 p.128 | Master Rune of Spite / talisman maître | 24 | Après dégâts de mêlée reçus, agresseur subit 2d10 dégâts sur localisation aléatoire avec protections normales. | absent |
| D0b-R-041 | L15 p.128 | Rune of Alarm / protection | 8 | Détecte entrée d’une créature Petite ou supérieure ; son, phrase ou message télépathique selon nombre de runes. | absent |
| D0b-R-042 | L15 p.128 | Rune of Battle / protection | 18 | Un Avantage initial par rune aux alliés affectés. | absent |
| D0b-R-043 | L15 p.128 | Rune of Courage / protection | 14 | +10 de Psychologie par rune aux alliés affectés. | absent |
| D0b-R-044 | L15 p.128 | Rune of Discovery / protection | 8 | Lueur si matériau choisi présent dans la portée. | absent |
| D0b-R-045 | L15 p.128 | Rune of Enemy Detection / protection | 8 | Lueur si créature répondant à la description choisie entre dans la portée. | absent |
| D0b-R-046 | L15 p.128 | Rune of Locking / protection | 6 | Protège serrures contre crochetage/force ; deux contre magie, trois même contre la clé sauf créateur/descendant ; contourner porte reste possible. | absent |
| D0b-R-047 | L15 p.128 | Rune of Purification / protection | 10 | +20 par rune contre toxines de l’air ou de l’eau. | absent |
| D0b-R-048 | L15 p.128 | Rune of Retribution / protection | 8 | Un Enflammé par rune à qui profane les morts dans la zone. | absent |
| D0b-R-049 | L15 p.128 | Rune of Sanctuary / protection | 10 | −1 DR par rune aux sorts visant le porteur ou des alliés dans Volonté yards. | absent |
| D0b-R-050 | L15 p.129 | Rune of Slowness / protection | 12 | Réduit la course adverse pour engager un allié : quatre yards par rune, minimum marche. | absent |
| D0b-R-051 | L15 p.129 | Rune of Verminkill / protection | 10 | Rongeurs/skavens et apparentés perdent deux Blessures directes par rune à l’entrée ou au début du Tour. | absent |
| D0b-R-052 | L15 p.129 | Master Rune of Expel Chaos / protection maître | 20 | Inversion des résistances et tables de Corruption ; bonus d’Avantage virtuel contre Démon Instable. | absent |
| D0b-R-053 | L15 p.129 | Master Rune of Grimnir / protection maître | 22 | Inverser les tirs adverses contre alliés affectés. | absent |
| D0b-R-054 | L15 p.129 | Master Rune of Grungni / protection maître | 22 | Inverser les lancements adverses contre alliés affectés. | absent |
| D0b-R-055 | L15 p.129 | Master Rune of Stromni Redbeard / protection maître | 20 | Avantage initial allié ; portée douze yards, vingt-quatre sur bannière. | absent |
| D0b-R-056 | L15 p.129 | Master Rune of Valaya / protection maître | 22 | +1 Résistance magique ; Bris de sort étendu à la ligne de vue et aux sorts persistants. | absent |
| D0b-R-057 | L15 p.129 | Rune of Accuracy / ingénierie | 14 | +10 pour toucher par rune. | absent |
| D0b-R-058 | L15 p.129 | Rune of Burning / ingénierie | 16 | Un Enflammé par rune à la cible touchée. | absent |
| D0b-R-059 | L15 p.129 | Rune of Forging / ingénierie | 10 | Annule Maladresse ou incident de tir ; une activation par rune et aventure. | absent |
| D0b-R-060 | L15 p.129 | Rune of Penetrating / ingénierie | 14 | +2 dégâts par rune. | absent |
| D0b-R-061 | L15 p.129 | Rune of Reloading / ingénierie | 12 | Recharge réduite de deux par rune jusqu’à suppression ; minimum un pour Salve. | absent |
| D0b-R-062 | L15 p.129 | Rune of Seeking / ingénierie | 10 | +20 pour toucher une cible volante par rune. | absent |
| D0b-R-063 | L15 p.129 | Rune of the Stalwart / ingénierie | 14 | Avantage initial aux servants nains ; perdu en quittant la pièce ou en s’engageant. | absent |
| D0b-R-064 | L15 p.130 | Rune of the Valiant / ingénierie | 10 | +10 Volonté par rune aux servants nains. | absent |
| D0b-R-065 | L15 p.130 | Master Rune of Defence / ingénierie maître | 20 | Servants considérés à couvert solide, −30 aux tirs. | absent |
| D0b-R-066 | L15 p.130 | Master Rune of Disguise / ingénierie maître | 20 | Pièce invisible jusqu’à tirer ; servants visibles et déplacement bruyant. | absent |
| D0b-R-067 | L15 p.130 | Master Rune of Immolation / ingénierie maître | 20 | Action gratuite d’un servant nain détruit la pièce : quinze dégâts dans six yards et Enflammé aux survivants. | absent |
| D0b-R-068 | L15 p.130 | Master Rune of Skewering / ingénierie maître | 22 | Avant jet, une fois par aventure : tir considéré 01, critique et localisation choisie si touche. | absent |
| D0b-R-069 | L15 p.130 | Rune of Hearth and Home / destinée | non précisé | Nains dans vingt-cinq yards : jets de Calme considérés 01 jusqu’à fin du prochain Round. | absent |
| D0b-R-070 | L15 p.130 | Rune of Oath and Steel / destinée | non précisé | Nains dans vingt-cinq yards : armure portée +2 PA jusqu’à fin du prochain Round. | absent |
| D0b-R-071 | L15 p.130 | Rune of Wrath and Ruin / destinée | non précisé | Ennemis dans vingt-cinq yards : douze dégâts sur localisation aléatoire, protections normales. | absent |
| D0b-R-072 | L15 p.138 | Rune of Retribution — Gazul / funéraire | non précisé | Runes murales : profanation ou Dhar déclenche deux Enflammé ; distincte du barème de protection p.128. | absent |
| D0b-R-073 | L15 p.138 | Rune of Spirit Departure / funéraire | non précisé | Sur linceul : +2 CN aux sorts de Dhar visant les restes. | absent |
| D0b-R-074 | L16 p.7 | Rune of Preservation / armure relique | non précisé | Retire Faiblesses de l’armure. | absent |
| D0b-R-075 | L16 p.7 | Master Rune of Skaldour / armure maître relique | non précisé | Réduit les dégâts de quatre ; dégâts zéro ne blessent pas. | absent |
| D0b-R-076 | L16 p.7 | Giantbane Master Rune / arme maître relique | non précisé | Inversion de l’attaque et du critique contre les géants. | absent |
| D0b-R-077 | L16 p.11 | Master Rune of Dismay / talisman maître relique | non précisé | Cor une fois par jour : −10 à tous les Tests des ennemis non immunisés Psychologie dans deux fois Endurance yards pendant un Round. | absent |
| D0b-R-078 | L16 p.11 | Master Rune of Smiting / arme maître relique | non précisé | Une touche infligeant des dégâts produit deux fois les Blessures plus quatre. | absent |
| D0b-R-079 | L16 p.22 | Rune of Hiding / rune seulement mentionnée | non précisé | Dissimule des abris ; aucune procédure de gravure ou formule dans ce passage. | absent |
| D0b-R-080 | L16 p.33 | Master Rune of the Goblin Slayer / arme maître spécialisée | non précisé | Inversion des attaques et critiques contre les gobelins ; instance de la rune de Tueur. | absent |
| D0b-R-081 | L16 p.44 | Rune of Light / installation | non précisé | Cristaux lumineux ; mots de commande d’allumage/extinction explicités p.46, aucun coût de gravure fourni. | absent |
| D0b-R-082 | L16 p.46 | Rune of Opening / funéraire | non précisé | Permet aux prêtres de Gazul d’ouvrir les portes protégées pour l’inhumation ; barème absent. | absent |

Preuve de périmètre des runes : `docs/lot3/LOT3_CADRAGE_MAGIE.md:159`. Aucun moteur de gravure n’est identifié ; les mécanismes analogues de bonus, dissipation ou État ne suffisent pas.

## Procédures à raccorder

- L01 p.31 — **Accès à la gastromancie** : Ogres : Grande Gueule, Cieux, Mort ou Bêtes, Feu pour les Cracheurs de feu ; langue de lancement basée sur Endurance ; viande et ingrédients conditionnent coûts et risques. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L01 p.32 — **Attribut de la Grande Gueule** : Après sort réussi, 1d10 : dix ou résultat au moins égal au CN soigne le CN en Blessures. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L12 p.82 — **Ingrédients et incidents de gastromancie** : Ingrédients obligatoires selon ce livre, sans atténuation d’incident ; table propre p.83, +20 pour incident majeur. Divergence avec L01 à arbitrer. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L09 p.64 — **Attribut et pactes de magie noire** : Après dégâts et DR au-delà du CN, dépenser trois DR pour un effet de pacte ; les associations de colonnes sont à confirmer avant adaptation. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L15 p.80 — **Apprentissage des runes** : Un achat apprend une rune admissible ; rune de maître distincte, enseigne aussi les trois runes de Destinée ; listes limitées selon spécialisation. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L15 p.123 — **Gravure permanente** : Objet physique, outils et atelier ; un Test étendu par semaine ou activité, difficulté 0 ordinaire ou −20 maître ; seuil propre à la rune ; objet ensuite magique. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L15 p.123 — **Règle des trois et cumul** : Trois runes maximum ; répétitions ordinaires possibles ; répétitions sur même objet cumulées, sur objets différents seulement meilleur ensemble. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L15 p.124 — **Forme** : Matériaux durables, supports adaptés ; pas d’autre objet magique sauf magie runique naine ; dérogations sous difficulté MJ. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L15 p.124 — **Fierté et Jalousie** : À cent yards, seul le plus ancien objet de même combinaison fonctionne ; une seule rune de maître par objet et seule la plus ancienne instance d’une même maître fonctionne à proximité. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L15 p.124 — **Défauts runiques** : Choix de +5 DR de progression contre défaut ; à première activation, détermine extinction, destruction, dégradation de l’objet ou coût de Chance. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L15 p.128 — **Supports de protection** : Installation commune, portée de base six yards pour alliés nains ; extension à l’appréciation MJ, exceptions spécifiques conservées. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L15 p.130 — **Runes de Destinée** : Uniquement sur Enclume du Destin ; Action avec Maîtrise des runes −20 au lieu de gravure étendue ; effet dissipable comme un sort. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L15 p.136 — **Accès des cultes ancestraux** : Listes de runes propres à chaque culte ; détails pp.134–140, ne pas assimiler automatiquement à toute liste de Runesmith. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L16 p.63 — **Circonstances favorables** : Événement de temps mort 92–94 : inversion des Tests de gravure de l’activité en cours. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L17 p.27 — **Rituels** : Tradition, ingrédients obligatoires, conditions de site, sacrifices et conséquences propres ; grimoire multiplie le CN par quatre, deux mains libres. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L08 p.102 — **Magie de Vaul** : Une seule amélioration par sort de Vaul et par objet sauf exception ; certaines options exigent Yenlui clair et sacrifice de vue. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.
- L08 p.110 — **Magie de Hoeth** : Certains rites exigent un Test étendu de Recherche comme sacrifice ; prérequis et surincantation Yenlui propres à chaque rite. Statut absent, preuve docs/lot3/LOT3_CADRAGE_MAGIE.md:159.

## Sources : consultations, repérages et exclusions

- L01 : passages/pages 31, 32, 33 ; 7 sorts Grande Gueule manquants ; objets magiques hors catalogue de sorts.
- L02 : passages/pages 62, 63, 64, 80, 87, 88 ; 15 sorts Hedgecraft et 1 rituel manquants ; manœuvres de canalisation pp.87–88 sont des procédures, non nouveaux sorts.
- L03 : passages/pages 2 ; Repérage CN : aucune nouvelle entrée isolée ; récits et profils ne créent pas de sort.
- L04 : passages/pages 3, 25, 88 ; Miracles déjà dans le chantier divin, pas de CN isolé ; hors ajout de sorts D0b.
- L05 : passages/pages 168 ; Référence française seulement ; pas de nouvelle tradition par traduction.
- L06 : passages/pages 230, 240, 241, 242, 243, 244, 245 ; Socle de comparaison des contrats, pas un supplément à ajouter ici.
- L07 : passages/pages 81, 128, 129, 183 ; 5 sorts nouveaux ; variantes des contrats Haute Magie et Waaagh! conservées explicitement.
- L08 : passages/pages 80, 81, 82, 86, 87, 88, 89, 102, 103, 106, 107, 110, 111 ; 29 entrées Vaul/mer/Hoeth nouvelles ; 30 mineurs/arcanes/Haute Magie déjà catalogués non dupliqués.
- L09 : passages/pages 64, 65, 66, 67 ; 24 sorts de magie noire manquants ; pactes à confirmer.
- L10 : passages/pages 3, 9, 15, 50, 51, 68, 74, 83 ; Guide Sylvania : aucun nouveau cartouche de sort trouvé par repérage CN ; attente de la source Vampires.
- L11 : passages/pages 135, 136, 137 ; Bestiaire et alchimie, pas de nouveau cartouche CN identifié.
- L12 : passages/pages 82, 83, 98, 99, 100, 101 ; 4 Grande Gueule et 24 Waaagh!, avec variantes L07.
- L13 : passages/pages 79 ; Miracles distincts déjà dans le catalogue divin ; pas de nouveau CN de sort identifié.
- L14 : passages/pages 83 ; 1 lancement propre au phénix, croisé avec E0.
- L15 : passages/pages 80, 95, 123, 124, 125, 126, 127, 128, 129, 130, 136, 137, 138, 139, 140 ; 73 runes, supports et règles séparés ; listes d’accès cultuelles à vérifier au raccordement.
- L16 : passages/pages 7, 11, 22, 32, 33, 44, 45, 46, 63, 86 ; 9 runes de reliques ou usages et 1 rituel d’idole.
- L17 : passages/pages 26, 27, 28, 29, 30, 31, 32, 33, 62, 63, 64, 65, 74, 75, 76, 77, 86, 87, 88, 89, 98, 99, 100, 101, 110, 111, 112, 113, 122, 123, 124, 125, 134, 135, 136, 137, 146, 147, 148, 149, 217, 218 ; 8 arcanes, 18 rituels, 6 marais, 1 sort conjoint manquants ; titres des huit domaines rapprochés des noms français et pages, sans confondre les variantes V5.

## openQuestions

- **D0b-Q01** : Le manifeste compte L01–L17, aucun L18. Fournir une éventuelle dix-huitième source avant de l’inclure.
- **D0b-Q02** : L10 Sylvania est un guide régional V5 : table des matières p.III et repérage CN sans nouvelle liste de sorts. Quel ouvrage contient le domaine des Vampires attendu ? Ne pas le fabriquer depuis les profils.
- **D0b-Q03** : Les renvois vers Sea of Claws, Death on the Reik Companion et certains suppléments de campagne ne sont pas tous dans ces dix-sept PDF. Profils, météo et navires dépendants restent à sourcer.
- **D0b-Q04** : Grande Gueule : L01 p.31 permet le lancement sans certains ingrédients contre blessures ; L12 p.82 les rend indispensables et leur retire l’atténuation d’incident. Quelle priorité ?
- **D0b-Q05** : Bullgorger L01 p.32 écrit une difficulté nommée Difficile avec +20. Déterminer la résistance exacte avant conversion.
- **D0b-Q06** : Poisoned Whispers L09 p.66 oppose des durées de BSoc Rounds à une fin sur Test quotidien. Choisir la durée.
- **D0b-Q07** : Le tableau des pactes L09 p.64 sort avec des colonnes désalignées. Confirmer visuellement dieu/pacte/effet ; les effets ne sont pas attribués arbitrairement.
- **D0b-Q08** : ‘Eadbutt : L12 p.100 annonce Vous et BFM Rounds, mais décrit un projectile ; L07 p.183 annonce une cible et instantané. Quel cartouche retenir ?
- **D0b-Q09** : Bash ‘Em Lads! emploie 1+DR dans L07 p.183 et DR dans L12 p.100 ; Mork Save Us! peut atteindre Protection 7+ dans L07, mais pas dans L12 p.101.
- **D0b-Q10** : Les runes sont chiffrées en pourcentages V4 et Avantage. Définir leur adaptation Élan/Avantage V5, leur interaction avec les dés inversés et les talents déjà présents.
- **D0b-Q11** : Rune of Force p.126 nomme ensuite Rune of Impact ; Clear Sight devient Clear Seeing, Truth devient Disclosure, Far Sight devient Farseeing p.127. Confirmer ces identités sans créer des doublons.
- **D0b-Q12** : Rune of Retribution existe en arme p.125, protection p.128 et rite funéraire p.138 avec barèmes distincts. Les conserver séparées ; décider si la version funéraire est une variante.
- **D0b-Q13** : Les runes de reliques L16 n’ont pas de seuil de gravure publié dans les passages lus ; Rune of Hiding, Light et Opening sont surtout des usages narratifs. Ne pas inventer les seuils manquants.
- **D0b-Q14** : Magie de Vaul/Hoeth/mer : définir statut de rite ou sort, accès des prêtres, sacrifices de vue/Recherche et changements de Yenlui avant raccordement.
- **D0b-Q15** : Silence arcane L17 p.27 CN4 diffère du sort d’Ombres p.111 CN3 nommé Silence au catalogue. Il faut une identité séparée malgré la collision de noms.
- **D0b-Q16** : Feast of the Fallen L01 p.33 ne chiffre pas clairement la zone des bénéficiaires ; The Maw, les portails et les modifications de terrain nécessitent aussi des faits spatiaux MJ.
- **D0b-Q17** : Les variantes Slann des sorts déjà catalogués (L07 p.128) doivent rester des extensions explicites, sans remplacer les contrats elfiques ; méditations p.129 ne sont ni sorts ni rituels.
- **D0b-Q18** : Rituels : temps, apprentissage, sacrifices permanents et conséquences de rupture nécessitent un système distinct ; les schémas ci-présents inventorient les dépendances, pas un contrat exécutable complet.
- **D0b-Q19** : Les nouvelles règles sans durée chiffrée restent nulles ou décrites comme non précisées ; notamment les installations runiques et certaines créations permanentes.
- **D0b-Q20** : O Mere Be More L17 p.217 est présenté comme expérimental ; autoriser ou réserver cette magie de PNJ. Skin of Bone and Bark p.218 exige deux lanceurs le même Round.
- **D0b-Q21** : La liste d’accès des cultes p.134–140 est mentionnée, mais ne doit pas être généralisée depuis un exemple de prêtre : vérifier le culte choisi au futur chantier.

## Validation documentaire

Identités uniques, champs requis et références de code contrôlés. Les schémas sont des inventaires, pas des contrats de jeu. Aucun code, test, PDF ou contrat généré n’est modifié. Les nombres de tests de la phase A ne valident aucune règle nouvelle de cet inventaire.
