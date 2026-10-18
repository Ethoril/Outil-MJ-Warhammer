/** Concise V5 reference: core pp. 130–131, 163–176 and 183–189. */
// Consultation data, independent of combat automation. A failed Test is handled
// separately from its signed SL; a marginal failure still counts as a failure.
export const V5_CORRUPTION_BANDS = Object.freeze({
  minor: { failurePoints: 1, success: [{ maxSL: null, points: 0 }] },
  moderate: { failurePoints: 2, success: [{ maxSL: 0, points: 1 }, { maxSL: null, points: 0 }] },
  major: { failurePoints: 3, success: [{ maxSL: 0, points: 2 }, { maxSL: 3, points: 1 }, { maxSL: null, points: 0 }] }
});
const corruptionOutcomes = key => {
  const { failurePoints, success } = V5_CORRUPTION_BANDS[key];
  let minimum = 0;
  return [`Échec, même marginal : ${failurePoints} point${failurePoints > 1 ? 's' : ''} de Corruption.`, ...success.map(band => {
    const label = band.maxSL === null ? `${minimum > 0 ? '+' + minimum : '0'} DR et plus`
      : minimum === band.maxSL ? `${minimum > 0 ? '+' : ''}${minimum} DR`
      : `+${minimum} à +${band.maxSL} DR`;
    if (band.maxSL !== null) minimum = band.maxSL + 1;
    return `Réussite à ${label} : ${band.points} point${band.points > 1 ? 's' : ''} de Corruption.`;
  })];
};
export const V5_RULES = [
  { title:'Jets et opposition V5', source:'Livre de base V5 EN, p. 130–131', sections:[
    { h4:'Résoudre un Test', ol:['Comparer le d100 au score de la compétence ou caractéristique.', 'DR de base : dizaine du score moins dizaine du jet.', 'Ajouter les modificateurs de DR de difficulté, d’équipement et d’États. Un DR positif réussit ; un DR négatif échoue.', 'À 0 DR : réussite marginale (+0) si le jet est inférieur ou égal au score, sinon échec marginal (−0).'], pAfter:'01–05 réussissent toujours ; 96–100 échouent toujours, avec au moins un résultat marginal.' },
    { h4:'Avantage et Désavantage', p:'Annuler les sources 1 pour 1. Un Avantage restant permet d’inverser les chiffres pour améliorer le jet ; un Désavantage restant impose l’inversion si elle le dégrade. Chaque source restante après la première ajoute +1 ou −1 DR.', example:'3 Avantages et 1 Désavantage : inversion favorable facultative et +1 DR. Sur 44, le double reste inchangé et le +1 DR s’applique.' },
    { h4:'Opposition', p:'Le plus haut DR gagne, même si les deux Tests ont échoué. Le DR net est la différence. À égalité, l’initiateur gagne ; en combat, l’attaquant.' },
    { h4:'Doubles', p:'Sur un Test général : une réussite double vaut au moins +5 DR, un échec double au plus −5 DR. En mêlée ou au tir, le double donne un Coup critique ou une Maladresse sans remplacer les DR de combat.' }
  ] },
  { title:'Combat et Élan V5', source:'Livre de base V5 EN, p. 163–168 ; précisions du MJ', sections:[
    { h4:'Attaquer et défendre', p:'Une attaque de mêlée oppose les Tests. Un tir réussit sur son propre Test. Un tir ne peut normalement pas être opposé par Corps à corps ; les exceptions concernent le bout portant (Esquive) ou un adversaire engagé.' },
    { h4:'Élan', p:'État binaire, commun aux PJ et PNJ. Une victoire opposée en Corps à corps, en attaque ou défense, donne Élan. Une Charge remplissant ses conditions le donne avant le Test. Élan accorde Avantage aux Tests de Corps à corps.' },
    { h4:'Perdre ou dépenser Élan', p:'Échec en Corps à corps, opposition perdue, Blessures effectivement perdues, acquisition effective d’un État, pause ou fin de combat font perdre Élan. Une seule dépense d’Élan pour une attaque supplémentaire par Tour, même si Élan est regagné. Exemptions et quotas propres aux talents se vérifient séparément.' }
  ] },
  { title:'Localisation, Blessures et critiques V5', source:'Livre de base V5 EN, p. 164–176', sections:[
    { h4:'Localisation de la touche', p:'Inverser le jet final après Avantage ou Désavantage. La localisation des dégâts ordinaires reste distincte de celle d’un critique.', table:[{jet:'01–09',loc:'Tête'},{jet:'10–24',loc:'Bras gauche'},{jet:'25–44',loc:'Bras droit'},{jet:'45–79',loc:'Corps'},{jet:'80–89',loc:'Jambe gauche'},{jet:'90–00',loc:'Jambe droite'}] },
    { h4:'Dégâts et Blessures', p:'Dégâts = arme + DR ; en mêlée, utiliser le DR net de l’opposition. Retirer le Bonus d’Endurance et les PA de la zone. Une touche inflige au moins 1 Blessure, sauf règle particulière comme Inoffensive. Les Blessures courantes ne descendent jamais sous 0.' },
    { h4:'Critique du jet', p:'Un Test de Corps à corps ou de Tir réussi avec un double inflige un critique, y compris en défense et même si l’opposition est perdue. Tirer une nouvelle localisation au d100, puis la gravité au d100 sur sa table. Résoudre aussi l’attaque normalement.' },
    { h4:'Critique d’excédent', p:'Si les Blessures perdues dépassent celles qui restent, infliger un critique à la localisation des dégâts ordinaires. Ajouter +10 à la gravité pour chaque Blessure excédentaire. Certaines tables dépassent 100 : aucun plafond général. Un critique du jet et un critique d’excédent peuvent coexister. Les Blessures supplémentaires des critiques ne déclenchent pas d’autres critiques.' },
    { h4:'Effets à traiter', p:'Les états chiffrés inconditionnels et les Blessures sont proposés ensemble. Les tests de résistance, tirages supplémentaires, blessures durables, soins et morts restent des décisions explicites du MJ. Voir la récupération de chaque État.' }
  ], tablesHeader:'Tables de Blessures critiques V5', nestedTables:[
    {id:'table-head-crit',title:'Critiques à la Tête',type:'crit',key:'HEAD'}, {id:'table-arm-crit',title:'Critiques au Bras',type:'crit',key:'ARM'},
    {id:'table-body-crit',title:'Critiques au Corps',type:'crit',key:'BODY'}, {id:'table-leg-crit',title:'Critiques à la Jambe',type:'crit',key:'LEG'}
  ] },
  { title:'États V5 : effets, cumul et récupération', source:'Livre de base V5 EN, p. 184–187', sections:[
    {h4:'Cumuler les pénalités',p:'Les occurrences d’un même État cumulent leur pénalité. Entre États différents, retenir la plus forte pénalité applicable. L’acquisition d’un État fait perdre Élan ; être déjà affecté n’interdit pas d’en regagner, sauf règle particulière.'},
    {h4:'Sonné, Exténué, Empoisonné',ul:['Chaque occurrence impose −1 DR à tous les Tests.','Sonné : à la fin du Round, Résistance +0 DR pour retirer une occurrence et une autre par DR au-delà du premier ; après retrait complet, Exténué si absent. Au-delà du BE en occurrences, devenir Inconscient.','Exténué : repos selon sa cause ; quelques minutes pour reprendre son souffle, une nuit pour un effort long, ou disparition de la circonstance.','Empoisonné : perte de 1 Blessure par occurrence en fin de Round ; récupération par Résistance selon le poison. Après disparition, Exténué 1. À 0 Blessure, guérison impossible tant que le poison persiste.']},
    {h4:'Aveuglé et Assourdi',ul:['Aveuglé : aucun tir ni tâche nécessitant de voir ; Désavantage en mêlée et aux tâches reposant sur la vue. Les attaques de mêlée contre vous ont Avantage, sauf adversaire également Aveuglé. Normalement retirer une occurrence à la fin de votre Tour ; blessure ou poison peuvent prolonger.','Assourdi : paroles incompréhensibles sans Lire sur les lèvres ; Résistance +0 DR toutes les minutes (6 Rounds), pas chaque Tour.']},
    {h4:'Hémorragique et Enflammé',ul:['Hémorragique : perdre 1 Blessure par occurrence en fin de Round. À 0, faire Résistance pour éviter Inconscient. Inconscient et à 0 : contrôle de décès au d10 en fin de Round. Soins et bandages retirent les occurrences selon leurs règles.','Enflammé : 1d10 Dégâts en fin de Round, +1 par occurrence après la première ; déduire BE et l’armure la plus faible. À 0 Blessure, critique au corps. Athlétisme permet l’extinction.']},
    {h4:'À terre, Surpris et Inconscient',ul:['À terre : non cumulable ; Désavantage aux Tests de mouvement ; attaques de mêlée contre vous avec Avantage. Se relever retire l’État.','Surpris : non cumulable ; aucune action, mouvement ou défense opposée ; +2 DR aux attaquants en mêlée. Retirer en fin de Round ou après la première tentative d’attaque.','Inconscient : non cumulable ; incapable d’agir, sans perception ; retirer Sonné lors de l’acquisition. Réveil selon la cause.']},
    {h4:'Brisé, Enchevêtré et Souillé',ul:['Brisé : fuir et sprinter ; −1 DR par occurrence aux Tests ne servant pas à fuir ou se cacher. Récupération au calme, hors engagement, selon la règle.','Enchevêtré : aucun déplacement ; −1 DR par occurrence aux actions impliquant un mouvement. Se libérer oppose la Force à celle de la source.','Souillé (Besmirched) : non cumulable ; Désavantage aux Tests de Sociabilité jusqu’au nettoyage.']}
  ] }
,
  { id:'psychologie', title:'Psychologie V5 : Peur, Terreur et autres traits', source:'Livre de base V5 EN, p. 183–184', sections:[
    {h4:'Tests de Psychologie',p:'Utiliser Calme, avec la difficulté fixée par le MJ. Une réussite protège normalement jusqu’à la fin de la rencontre ; un changement de circonstances peut imposer un nouveau Test.'},
    {h4:'Peur (indice)',ul:[
      'Face à des créatures causant Peur, sauf alliés connus, effectuer un Test étendu de Psychologie : un jet par Round et un total de DR égal à l’indice de Peur.',
      'En présence de plusieurs sources, retenir l’indice le plus élevé. Réussir protège contre les sources d’indice égal ou inférieur.',
      'Tant que la Peur persiste, aucun gain d’Élan. Les attaques de mêlée faites contre vous par sa source bénéficient d’Avantage.'
    ]},
    {h4:'Terreur (indice)',ul:[
      'À la première rencontre avec une source de Terreur, sauf allié connu, effectuer un Test de Psychologie. Réussir protège contre Terreur pour cette rencontre.',
      'En cas d’échec, gagner autant de Brisé que l’indice de Terreur, plus une occurrence par DR négatif après le premier. Exemple : Terreur 2 et échec à −3 DR donnent Brisé 4 ; à −1 DR, Brisé 2.',
      'Après ce Test, la source cause Peur avec le même indice. Pour plusieurs sources de Terreur, tester contre l’indice le plus élevé.'
    ]},
    {h4:'Animosité et Haine',ul:[
      'Animosité : Désavantage aux Tests de Sociabilité envers le groupe visé. À sa rencontre, un échec en Psychologie oblige à l’insulter, le rabaisser ou l’attaquer. Peur et Terreur prennent le dessus.',
      'Haine : impossible d’interagir paisiblement avec le groupe visé. Un échec en Psychologie pousse à le détruire au plus vite ; un nouveau Test peut contenir cette impulsion à la fin des Rounds suivants.',
      'Contre la cible de Haine, conserver +1 DR aux Tests de Corps à corps et de Tir, ainsi que l’immunité à son Intimidation et sa Peur, même après un Test de contrôle réussi. Sa Terreur reste applicable.'
    ]},
    {h4:'Frénésie',ul:[
      'Durant votre Tour, un Test de Force Mentale réussi permet d’entrer en Frénésie.',
      'Immunité aux autres effets de Psychologie ; une attaque de mêlée supplémentaire comme action gratuite par Round et +1 Dégât aux attaques de mêlée.',
      'Consacrer déplacement et action à rejoindre et attaquer l’ennemi le plus proche. Frénésie cesse lorsque tous les ennemis proches sont vaincus, ou en devenant Sonné ou Inconscient ; gagner alors Exténué 1.'
    ]},
    {h4:'Application dans l’outil',p:'Ces traits sont consultables ici. Leurs sources et circonstances doivent être vérifiées par le MJ ; tant que leur automatisation n’est pas raccordée, déclarer les Avantages et DR applicables et gérer l’Élan concerné.'}
  ]},
  { id:'corruption', title:'Corruption et mutations V5', source:'Livre de base V5 EN, p. 187–189', corruptionBands:V5_CORRUPTION_BANDS, sections:[
    {h4:'Quand tester',ul:[
      'À la fin de la séance, le MJ retient la plus forte exposition. Des expositions répétées peuvent augmenter difficulté ou Corruption, ou changer la caractéristique testée.',
      'Faire un Test de Résistance ou de Calme selon la nature physique ou spirituelle de l’exposition. La gravité détermine combien de DR sont nécessaires pour éviter toute Corruption.',
      'Une exposition correspond normalement à un contact physique d’au moins un Tour ou une présence à proximité d’au moins une heure. Une exposition prolongée correspond à un contact d’au moins une heure ou une proximité d’au moins six heures.',
      'Lancer ou recevoir un sort ne cause pas de Corruption par défaut, même pour un Domaine du Chaos : une règle doit l’indiquer expressément.'
    ]},
    {h4:'Influence mineure',ul:corruptionOutcomes('minor'),pAfter:'Exemples : exposition à une créature Corruption (mineure), malepierre raffinée ou objet profane ; exposition prolongée à des adorateurs du Chaos, temples ou repaires contaminés.'},
    {h4:'Influence modérée',ul:corruptionOutcomes('moderate'),pAfter:'Exemples : exposition à une créature Corruption (modérée) ou à de la malepierre ; exposition prolongée à une relique profane.'},
    {h4:'Influence majeure',ul:corruptionOutcomes('major'),pAfter:'Exemples : exposition à une créature Corruption (majeure), exposition prolongée à de la malepierre, pacte avec un démon ou ingestion de malepierre raffinée.'},
    {h4:'Seuil et apparition d’une mutation',ul:[
      'Si les points dépassent BE + BFM, faire immédiatement Résistance +0 DR. Réussir reporte la mutation ; tester de nouveau lors du prochain gain de Corruption.',
      'En cas d’échec, perdre autant de points de Corruption que le BFM, puis déterminer si la mutation affecte le corps ou l’esprit.',
      'Humain : 01–50 corps, 51–100 esprit. Nain : 01–05 corps, 06–100 esprit. Halfling : 01–10 corps, 11–100 esprit. Elfe : toujours esprit.',
      'Le MJ tire secrètement 3d10 jours avant manifestation. Les conséquences sociales dépendent de la mutation et de sa visibilité.'
    ]},
    {h4:'Absolution et perte du personnage',ul:[
      'Une absolution peut passer par un pèlerinage béni, la destruction d’un artefact profane, la purification d’un temple ou l’entrée dans un ordre religieux ; le MJ fixe les conditions.',
      'Plus de mutations physiques que le BE, ou plus de mutations mentales que le BFM : le personnage tombe définitivement sous le contrôle du MJ.'
    ]}
  ]}
];
