/**
 * Options de surpuissance propres aux sorts (V5 p. 236 : « Spells may have additional options in their descriptions »),
 * lues par `build-v5-spell-contracts.mjs`. `cost` = DR par palier ; `repeat` = « pour chaque +N DR ».
 * Genres exécutés par le moteur : trait-rating, ward-improve, secondary-sl, damage-base ; `reminder` = rappel chiffré pour le MJ,
 * sans effet calculé. Sources : V5 pp. 243-253, HEPG pp. 86-89. `{pas}`, `{bfm}`, `{total}` : voir specificOvercastReminder.
 */
export const OVERCAST_SPECIFIC = {
 'Almanach':[{id:'week',cost:2,kind:'reminder',label:'Prévision à une semaine',reminder:'Prévision annuelle précisée à une semaine.'},{id:'day',cost:4,kind:'reminder',label:'Prévision au jour',reminder:'Prévision annuelle précisée au jour.'}],
 'Geyser':[{id:'stun',cost:2,repeat:true,kind:'contract-rule',label:'Un Sonné sur une cible choisie par palier'}],
 "Piège d'Abulla":[{id:'entangle',cost:1,repeat:true,kind:'contract-rule',label:'Un Enchevêtré supplémentaire'},{id:'height',cost:1,repeat:true,kind:'reminder',label:'Hauteur +2m, maximum10m',reminder:'Hauteur +2m par palier payé, maximum10m.'}],
 'Crevasse':[{id:'size',cost:2,repeat:true,kind:'reminder',label:'Longueur/profondeur +1m, profondeur maximum10m',reminder:'Longueur et profondeur +{pas}m, profondeur maximum10m.'}],
 'Sentier de Paranoth':[{id:'levels',cost:2,repeat:true,kind:'reminder',label:'Un niveau de Foulée si déjà connu',reminder:'Foulée déjà connue : +{pas} niveaux en plus du niveau initial.'},{id:'untraceable',cost:4,kind:'contract-rule',label:'Voyager sans trace'}],
 'Croissance Vitale':[{id:'double',cost:2,kind:'contract-rule',label:'Hauteur naturelle×2, un Round supplémentaire'},{id:'triple',cost:4,kind:'contract-rule',label:'Hauteur naturelle×3, deux Rounds supplémentaires'},{id:'quadruple',cost:6,kind:'contract-rule',label:'Hauteur naturelle×4, trois Rounds supplémentaires'}],
 'Ériger l’édifice':[{id:'length',cost:2,repeat:true,kind:'reminder',label:'Longueur+5m, un Round de plus par palier',reminder:'Longueur+5m et un Round de concentration par palier.'},{id:'height',cost:2,repeat:true,kind:'reminder',label:'Hauteur+1m/épaisseur+6pouces, un Round par palier',reminder:'Hauteur+1m, épaisseur+6pouces et un Round par palier.'},{id:'curve',cost:2,kind:'reminder',label:'Courbe ou angle',reminder:'Mur courbe ou coudé, selon terrain déclaré.'}],
 'Illuminer l’édifice':[{id:'manor',cost:2,kind:'reminder',label:'Tour ou grand manoir',reminder:'Lumière dans une tour ou un grand manoir.'},{id:'castle',cost:4,kind:'reminder',label:'Château',reminder:'Lumière dans un château.'}],
 'Amarante':[{id:'levels',cost:2,repeat:true,kind:'reminder',label:'Niveau des Résistances déjà connues+1',reminder:'+{pas} niveau(s) pour chaque Résistance déjà connue ; reçu de fiche.'}],
 'Destin de Bjuna':[{id:'suffocate',cost:2,repeat:true,kind:'contract-rule',label:'Une cible par palier : FM ou suffocation'}],
 'Révélation de Shyish':[{id:'questions',cost:2,repeat:true,kind:'reminder',label:'Une question au mort nommé',reminder:'{pas} question(s) au mort connu, réponse en coups.'}],
 'Marée des Âges':[{id:'enc',cost:2,repeat:true,kind:'reminder',label:'Encombrement+1',reminder:'Encombrement maximal augmenté de{pas}.'},{id:'living',cost:4,kind:'contract-rule',label:'Vivant : Calme+2 ou F/E−d10 permanents'}],
 'Horreurs Noires':[{id:'fear',cost:2,repeat:true,kind:'reminder',label:'Peur de l’ombre+1, maximum4',reminder:'Peur de l’ombre augmentée de{pas}, maximum4 ; jamais un trait de la victime.'}],
 'Poches Profondes':[{id:'enc',cost:2,repeat:true,kind:'reminder',label:'Encombrement+1',reminder:'Encombrement maximal augmenté de{pas}.'}],
 'Ailes Grises':[{id:'distance',cost:2,repeat:true,kind:'reminder',label:'Téléportation+100m',reminder:'Téléportation +100m par palier payé, depuis le départ.'}],
"Flamme Captivante":[{"id": "medium", "cost": 2, "repeat": false, "kind": "reminder", "label": "Feu moyen, deux observateurs aléatoires", "reminder": "Feu moyen, deux observateurs aléatoires ; Option payée."}, {"id": "large", "cost": 4, "repeat": false, "kind": "reminder", "label": "Grand feu, tous les observateurs", "reminder": "Grand feu, tous les observateurs ; Option payée."}],
"Colérique":[{"id": "animosity", "cost": 4, "repeat": false, "kind": "reminder", "label": "Animosité, BFM jours", "reminder": "Animosité, BFM jours ; Option payée."}, {"id": "hatred", "cost": 8, "repeat": false, "kind": "reminder", "label": "Haine, BFM semaines", "reminder": "Haine, BFM semaines ; Option payée."}],
"Tempête de Flammes":[{"id": "size", "cost": 2, "repeat": true, "kind": "reminder", "label": "Diamètre +1 mètre et hauteur +2 mètres", "reminder": "Diamètre +1 mètre et hauteur +2 mètres ; {pas} palier(s) payé(s)."}],
"Flamme Inextinguible":[{"id": "days", "cost": 2, "repeat": false, "kind": "reminder", "label": "Durée BFM jours", "reminder": "Durée BFM jours ; Option payée."}, {"id": "weeks", "cost": 4, "repeat": false, "kind": "reminder", "label": "Durée BFM semaines", "reminder": "Durée BFM semaines ; Option payée."}, {"id": "months", "cost": 6, "repeat": false, "kind": "reminder", "label": "Durée BFM mois", "reminder": "Durée BFM mois ; Option payée."}],
"Polir et Exalter":[{"id": "astronomy", "cost": 2, "repeat": false, "kind": "reminder", "label": "Astronomie +2 DR", "reminder": "Astronomie +2 DR ; Option payée."}, {"id": "secondSight", "cost": 4, "repeat": false, "kind": "reminder", "label": "Perception visuelle Seconde vue +2 DR", "reminder": "Perception visuelle Seconde vue +2 DR ; Option payée."}],
"Malédiction du Destin":[{"id": "doom", "cost": 6, "repeat": false, "kind": "reminder", "label": "Destin perdu ou prochain Critique 100, portée 1 mile", "reminder": "Destin perdu ou prochain Critique 100, portée 1 mile ; Option payée."}],
"Destin Illuminé":[{"id": "questions", "cost": 2, "repeat": true, "kind": "reminder", "label": "Une question de plus", "reminder": "Une question de plus ; {pas} palier(s) payé(s)."}],
"Que les Quatre Vents Soufflent !":[{"id": "push", "cost": 2, "repeat": true, "kind": "reminder", "label": "Projection +BFM mètres", "reminder": "Projection +BFM mètres ; {pas} palier(s) payé(s)."}],
"Inscription":[{"id": "rune", "cost": 2, "repeat": false, "kind": "reminder", "label": "Inscription en rune secrète", "reminder": "Inscription en rune secrète ; Option payée."}],
"Franchir l’inconnu":[{"id": "details", "cost": 2, "repeat": true, "kind": "reminder", "label": "Un détail caché supplémentaire", "reminder": "Un détail caché supplémentaire ; {pas} palier(s) payé(s)."}],
"Malédiction de rouille":[{"id": "enc", "cost": 2, "repeat": true, "kind": "reminder", "label": "Encombrement +1", "reminder": "Encombrement +1 ; {pas} palier(s) payé(s)."}, {"id": "brittle", "cost": 4, "repeat": false, "kind": "reminder", "label": "Non-métal fragile BFM minutes", "reminder": "Non-métal fragile BFM minutes ; Option payée."}],
"Défaut de Forme":[{"id": "magic", "cost": 4, "repeat": false, "kind": "reminder", "label": "Neutralise enchantements de l’arme magique", "reminder": "Neutralise enchantements de l’arme magique ; Option payée."}],
"Nœud défait":[{"id": "hints", "cost": 2, "repeat": true, "kind": "reminder", "label": "Un indice supplémentaire", "reminder": "Un indice supplémentaire ; {pas} palier(s) payé(s)."}],
"Réplique de Levorg":[{"id": "enc", "cost": 2, "repeat": true, "kind": "reminder", "label": "Encombrement +1", "reminder": "Encombrement +1 ; {pas} palier(s) payé(s)."}, {"id": "coins", "cost": 2, "repeat": true, "kind": "reminder", "label": "1d10 pièces d’or supplémentaires", "reminder": "1d10 pièces d’or supplémentaires ; {pas} palier(s) payé(s)."}],
"Essais et Erreurs":[{"id": "reroll", "cost": 2, "repeat": false, "kind": "reminder", "label": "Relance unique du prochain Test choisi", "reminder": "Relance unique du prochain Test choisi ; Option payée."}],
"Bête Indomptée":[{"id": "human", "cost": 4, "repeat": false, "kind": "reminder", "label": "Variante humain, FM −1 ou table d10 chaque Round", "reminder": "Variante humain, FM −1 ou table d10 chaque Round ; Option payée."}],
"Pulvérisation Musquée":[{"id": "days", "cost": 2, "repeat": true, "kind": "reminder", "label": "Durée +1 jour", "reminder": "Durée +1 jour ; {pas} palier(s) payé(s)."}],
"Passage Rapide":[{"id": "talents", "cost": 2, "repeat": true, "kind": "reminder", "label": "Niveau Escalade/Foulée supplémentaire si déjà possédé", "reminder": "Niveau Escalade/Foulée supplémentaire si déjà possédé ; {pas} palier(s) payé(s)."}],
  'Tempête Magmatique':[{id:'mini',label:'+2 DR : un mini-vortex si mouvement ≤8 m (maximum trois)',cost:2,repeat:true,kind:'contract-rule'}],
  'Cendres et Poussière':[{id:'sun',label:'+4 DR : Soleil Violet de Xereus, Peur (2), Calme ou mort au contact',cost:4,kind:'contract-rule'}],
  'Epées Sanguines':[{id:'swords',label:'+2 DR : une épée supplémentaire (maximum six)',cost:2,repeat:true,kind:'contract-rule'}],
  'Escalier en Spirale':[{id:'height',label:'+2 DR : hauteur +FM mètres (plafond 200)',cost:2,repeat:true,kind:'contract-rule'}],
  'Effrayant': [{ id: 'fear', label: 'Peur +1 pour chaque +3 DR', cost: 3, repeat: true, kind: 'trait-rating', trait: 'Peur', per: 1 }],
  'Terrifiant': [{ id: 'terror', label: 'Terreur +1 pour chaque +3 DR', cost: 3, repeat: true, kind: 'trait-rating', trait: 'Terreur', per: 1 }],
  'Voile Pourpre de Shyish': [{ id: 'fear', label: 'Peur +1 pour chaque +2 DR', cost: 2, repeat: true, kind: 'trait-rating', trait: 'Peur', per: 1 }],
  'Couronne de Flamme': [
    { id: 'fear', label: 'Peur +1 pour chaque +2 DR', cost: 2, repeat: true, kind: 'trait-rating', trait: 'Peur', per: 1 }
  ],
  'Arme enchantée': [{ id: 'quality', label: '1 Qualité d’arme ajoutée ou 1 Défaut retiré pour chaque +3 DR', cost: 3, repeat: true, kind: 'reminder', reminder: '{pas} Qualité(s) d’arme à ajouter ou Défaut(s) à retirer sur l’arme désignée, pendant le sort.' }],
  'Forge de Chamon': [{ id: 'quality', label: '1 Qualité ajoutée ou 1 Défaut retiré de plus pour chaque +2 DR', cost: 2, repeat: true, kind: 'reminder', reminder: '{pas} Qualité(s) ou Défaut(s) de plus à modifier sur l’objet en métal.' }],
  'Chute': [{ id: 'dexterity', label: '−1 DR au Test de Dextérité de la cible pour chaque +2 DR', cost: 2, repeat: true, kind: 'secondary-sl', per: -1 }],
  'Pont': [{ id: 'size', label: 'Longueur ou largeur +BFM mètres pour chaque +2 DR', cost: 2, repeat: true, kind: 'reminder', reminder: 'Longueur ou largeur du pont augmentée de {total} mètres ({pas} × BFM {bfm}).' }],
  'Déplacement d’objet': [{ id: 'distance', label: 'Distance +BFM mètres pour chaque +2 DR', cost: 2, repeat: true, kind: 'reminder', reminder: 'Distance de déplacement augmentée de {total} mètres ({pas} × BFM {bfm}).' }],
  'Attaques en chaine': [{ id: 'chain', label: '1 cible de plus dans la chaîne pour chaque +2 DR', cost: 2, repeat: true, kind: 'chain-limit', per:1 }],
  'Poussée': [{ id: 'push', label: 'Repoussé de BFM mètres de plus pour chaque +2 DR', cost: 2, repeat: true, kind: 'reminder', reminder: 'Repoussé de {total} mètres de plus ({pas} × BFM {bfm}).' }],
  'Extinction de l\'Âme': [
    { id: 'dust', label: '+3 DR : les corps tués tombent en poussière', cost: 3, kind: 'reminder', reminder: 'Les corps des cibles tuées tombent en poussière.' },
    { id: 'fury', label: '+7 DR : fureur de Khaine (portée et zone doublées, dégâts +11, Yenlui sombre)', cost: 7, kind: 'damage-base', value: 11, reminder: 'Portée et zone doublées ; le lanceur gagne Yenlui (sombre).' }
  ],
  'Bouclier de Saphery': [
    { id: 'ward', label: 'Protection améliorée de 1 pour chaque +3 DR', cost: 3, repeat: true, kind: 'ward-improve', per: 1 },
    { id: 'range', label: '+4 DR : portée réduite à la moitié de la Volonté en mètres', cost: 4, kind: 'reminder', reminder: 'La portée devient la moitié de la Volonté en mètres.' }
  ],
  'Bannissement Majeur': [
    { id: 'dispel', label: '+1 DR aux Tests de dissipation gratuits pour chaque +1 DR', cost: 1, repeat: true, kind: 'reminder', reminder: 'Bonus de +{pas} DR aux Tests de dissipation gratuits du sort ; familles de sorts désignées par le MJ.' },
    { id: 'items', label: '+4 DR : objets magiques maléfiques inactifs (Test de Sociabilité Accessible +2 DR)', cost: 4, kind: 'reminder', reminder: 'Objets maléfiques ou chaotiques inactifs pendant le sort si le Test de Sociabilité Accessible (+2 DR) est réussi.' },
    { id: 'damage', label: '+7 DR : dégâts +15 (ou +30 si Taille Grande ou plus), Yenlui lumineux', cost: 7, kind: 'reminder', reminder: 'Dégâts portés à +15 (ou +30 contre Taille Grande ou plus) ; le lanceur gagne Yenlui (lumineux).' }
  ],
  'Convocation Ardente': [
    { id: 'escalation', label: '+5 DR : dégâts +6 au 2e Round, puis +1 par Round, Yenlui sombre', cost: 5, kind: 'reminder', reminder: 'Dégâts +6 au 2e Round puis +1 à chaque Round suivant ; le lanceur gagne Yenlui (sombre).' },
    { id: 'exempt', label: '+8 DR : alliés exemptés (Test de Corps à corps Intermédiaire +0 DR)', cost: 8, kind: 'reminder', reminder: 'Test de Corps à corps Intermédiaire (+0 DR) : les alliés sont exemptés des effets.' }
  ],
  'Drain de Magie': [
    { id: 'wide', label: '+5 DR : zone portée à la Volonté en mètres, alliés exemptés (Test d’Intelligence Difficile −1 DR)', cost: 5, kind: 'reminder', reminder: 'Zone portée à la Volonté en mètres ; Test d’Intelligence Difficile (−1 DR) pour exempter les alliés.' },
    { id: 'blessings', label: '+7 DR : Bénédictions et Miracles persistants dissipés, Yenlui lumineux', cost: 7, kind: 'reminder', reminder: 'Bénédictions et Miracles persistants dissipés ; le lanceur gagne Yenlui (lumineux).' },
    { id: 'items', label: '+10 DR : objets magiques et Protections inertes, lanceurs privés de magie 24 h', cost: 10, kind: 'reminder', reminder: 'Les objets magiques perdent leurs pouvoirs, les Protections sont annulées ; les lanceurs qui ratent le Test de Focalisation Intermédiaire (+0 DR) perdent toute magie 24 h.' }
  ],
  'La Fortune est Capricieuse': [
    { id: 'actions', label: '+4 DR : doubles des actions non magiques = échec automatique', cost: 4, kind: 'reminder', reminder: 'Les actions non magiques de la cible échouent automatiquement sur un double.' },
    { id: 'major', label: '+6 DR : doubles magiques sur la table des incidents Majeurs, Yenlui sombre', cost: 6, kind: 'reminder', reminder: 'Les doubles magiques de la cible se lisent sur la table des incidents Majeurs ; le lanceur gagne Yenlui (sombre).' }
  ],
  'Glamour de Teclis': [
    { id: 'hours', label: '+3 DR : effet durant BI heures pour qui rate 3 Tests, Yenlui sombre', cost: 3, kind: 'reminder', reminder: 'Les cibles qui ratent trois Tests de Navigation restent affectées BI heures ; le lanceur gagne Yenlui (sombre).' },
    { id: 'exempt', label: '+6 DR : alliés exemptés (Test d’Agilité Intermédiaire +0 DR)', cost: 6, kind: 'reminder', reminder: 'Test d’Agilité Intermédiaire (+0 DR) : les alliés sont exemptés des effets.' }
  ],
  'Œil Invisible': [
    { id: 'senses', label: '+4 DR : l’œil gagne Sens de la magie, Seconde vue et Vision dans le noir', cost: 4, kind: 'reminder', reminder: 'L’œil gagne Perception de la Magie, Seconde vue et Vision dans le noir.' },
    { id: 'range', label: '+8 DR : portée portée à l’Intelligence en miles', cost: 8, kind: 'reminder', reminder: 'Portée portée à l’Intelligence en miles.' }
  ],
  'Tempête': [
    { id: 'cool', label: '+4 DR : Test de Calme pour bouger, chute des volants, CT −3 DR', cost: 4, kind: 'reminder', reminder: 'Test de Calme Intermédiaire (+0 DR) pour se déplacer ; les volants qui le ratent tombent de 50 m par Round ; Tests de CT à −3 DR.' },
    { id: 'machines', label: '+5 DR : projectile +15 par Round contre bâtiments et machines de guerre', cost: 5, kind: 'reminder', reminder: 'Chaque Round, projectile magique de dégâts +15 contre les bâtiments et machines de guerre de la zone.' },
    { id: 'exempt', label: '+8 DR : alliés exemptés (Test d’Initiative Intermédiaire +0 DR)', cost: 8, kind: 'reminder', reminder: 'Test d’Initiative Intermédiaire (+0 DR) : les alliés sont exemptés des effets.' }
  ],
  'Chemin entre les Mondes': [
    { id: 'duration', label: '+5 DR : durée portée à BI minutes (Test de Force Mentale Difficile −2 DR)', cost: 5, kind: 'reminder', reminder: 'Durée portée à BI minutes si le Test de Force Mentale Difficile (−2 DR) est réussi.' },
    { id: 'nexus', label: '+8 DR : traversée des Voies des Anciens d’un nexus à un autre', cost: 8, kind: 'reminder', reminder: 'Les cibles situées sur un nexus géomantique rejoignent le nexus choisi par le MJ, sans limite de distance.' }
  ],
  'Coruscation de Finreir': [
    {id:'rift',label:'+5 DR : faille instable dans BFM mètres, Yenlui −3',cost:5,kind:'reminder',reminder:'Faille dans BFM mètres (sol ou air), Influence maligne, Yenlui −3. Foyer : d10/2 arrondi supérieur (1–5 DR) relu à chaque Round pour les lanceurs déclarés dans BFM mètres ; terrain, proximité et couleur : MJ, pas de modèle spatial.'},
    {id:'portal',label:'+8 DR : portail dans un terrain solide, un Domaine et Haute Magie',cost:8,kind:'reminder',reminder:'Portail dans un terrain solide à BFM mètres, améliore un Domaine choisi et la Haute Magie. Foyer : d10/2 arrondi supérieur (1–5 DR) à chaque Round ; d10, destinataires et Domaine déclarés par le MJ, absence de modèle spatial.'}
  ],
  'Impasse': [
    { id: 'waystone', label: '+6 DR : bonus de Pierre-Vent, cercle ou jonction annulé, Yenlui lumineux', cost: 6, kind: 'reminder', reminder: 'Le bonus de Focalisation et d’incantation d’une Pierre-Vent, d’un cercle de pierres, d’une pierre-troupeau ou d’une jonction est annulé ; le lanceur gagne Yenlui (lumineux).' },
    { id: 'flux', label: '+9 DR : contrôle du Flux magique d’un Foyer arcanique annulé, Yenlui lumineux', cost: 9, kind: 'reminder', reminder: 'Le contrôle du Flux magique d’un Foyer arcanique est annulé ; le lanceur gagne Yenlui (lumineux).' }
  ],
  'Malédiction d\'Attraction des Flèches': [
    { id: 'shields', label: '+4 DR : les boucliers perdent leurs PA et Défensif contre les tirs', cost: 4, kind: 'reminder', reminder: 'Les boucliers des cibles perdent leurs PA et leur qualité Défensive contre les tirs.' },
    { id: 'locations', label: '+6 DR : localisation choisie par le tireur (Test de CT Intermédiaire +0 DR)', cost: 6, kind: 'reminder', reminder: 'Test de CT Intermédiaire (+0 DR) : le tireur choisit la localisation des projectiles touchant une cible maudite.' }
  ]
};
