// Lot D3 : sorts complémentaires de la Magie naturelle d'AOTE3 (L02 pp. 62-64, V4) convertis en V5.
// Conversions : ±10 -> ±1 DR, Challenging (+0) -> Intermédiaire +0 DR, Exténué (-10 par état) -> -1 DR par état, yards -> mètres, SL -> DR.
// Noms français proposés (aucun nom officiel) ; écarts avec les propositions de Gemini : CHOIX_EXECUTANT_PHASE_D.md.
import {tradition} from './helpers.mjs';
const DOMAINE='hedgecraft',TYPE='Domaine de la Magie naturelle',AOTE3='Supplément V4 (AOTE3), conversion V5';
const L02=(slug,name,canonical,page,cn,range,target,duration,description,effects,assisted,more={})=>tradition(slug,name,canonical,'L02',page,DOMAINE,TYPE,AOTE3,cn,range,target,duration,description,effects,{assisted:[assisted],...more});
const SENS_DEMONIAQUES=['ethere','ethereal','demoniaque','daemonic','demon','daemon'];
export const MAGIE_NATURELLE_AOTE3=[
 L02('dague-de-l-art','Dague de l’Art','Dagger of the Art',62,4,'Vous','Vous','Bonus de Force Mentale Rounds',
  'Une brindille de moins de vingt centimètres devient une dague Magique ; contre un adversaire Éthéré ou Corrompu, elle inflige BF + 8.',
  {type:'special',conjureWeapon:true,conjureWeaponKey:'dagger',extraConjuredActions:[{id:'ethere-corruption',note:'Dague de l’Art contre Éthéré ou Corruption',damage:8,damageFormula:'BF+8'}],
   facts:[{key:'weaponSkillScore',label:'Dague de l’Art : valeur du Corps à corps utilisé (si absent de la fiche)',type:'number',min:0,max:300,optionalFromWeaponSkill:true}]},
  'Deux attaques sont créées : la dague ordinaire (BF + 2) et la variante BF + 8 à employer contre une cible portant le Trait Éthéré ou Corruption (tout degré). Maintien après la durée : Test de Focalisation Intermédiaire (+0 DR) à chaque Round suivant, saisi par le MJ. Le bâtonnet est un rappel narratif, jamais une exigence.'),
 L02('borne-sinistre','Borne sinistre','Fellstave',62,9,'Spécial','Spécial','1 mois',
  'Un pieu de bois gravé, planté en terre, repousse pendant un mois un type de créature choisi à l’apprentissage du sort.',
  {type:'narrative',receiptFormulas:{rayonMetres:100},facts:[{key:'creatureType',label:'Borne sinistre : type de créature choisi à l’apprentissage',type:'select',options:[['beastmen','Hommes-bêtes (Minotaures et Centigors compris, pas les Skavens)'],['daemons','Démons'],['greenskins','Orques et Gobelins'],['ogres','Ogres'],['fimir','Fimirs'],['trolls','Trolls'],['undead','Morts-vivants'],['gm','Autre type validé par le MJ']]}]},
  'Toute créature du type choisi qui s’approche à moins de 100 mètres fait un Test de Calme Intermédiaire (+0 DR) ou gagne un état Brisé ; le MJ désigne les créatures et les approches (aucune position n’est suivie). Le sort peut être appris plusieurs fois, un type par apprentissage. Lecture littérale de la source pour la suite : celui qui sort de l’état Brisé fait un Test d’Intuition Intermédiaire (+0 DR) ; sur un échec il comprend que le pieu a causé cette panique magique. Pieu : rappel narratif.'),
 L02('revigorer','Revigorer','Invigorate',63,2,'Toucher','1','Bonus de Force Mentale Rounds',
  'La cible ignore tous les effets de ses états Exténué pendant la durée.',
  {type:'special',specialState:{ignoreFatiguePenalties:true}},
  'Les états Exténué restent comptés ; leur pénalité (−1 DR par état en V5) est ignorée pendant la durée puis reprend. Version V5 distincte de Bonne santé (Sorcellerie), qui retire un état.'),
 L02('philtre-d-amour','Philtre d’amour','Lovelock',63,10,'Toucher','Spécial','Jusqu’à minuit',
  'Du miel enchanté dans une coupe : qui boit le philtre s’éprend, jusqu’à minuit, de la première personne qu’il pourrait trouver attirante.',
  {type:'narrative',facts:[{key:'minutesToMidnight',label:'Philtre d’amour : minutes avant minuit',type:'number',min:1,max:1440}],durationFact:{quantityFact:'minutesToMidnight',unit:'minutes'}},
  'Engouement narratif : appréciation et réactions de scène par le MJ, aucun jet de résistance ni bonus chiffré dans la source. Coupe : rappel narratif.'),
 L02('sachet-de-protection','Sachet de protection','Protection Pouch',63,5,'Toucher','Spécial','1 semaine + 1 semaine par DR',
  'Un sachet d’herbes pourpres porté au cou : +1 DR en Calme contre les effets surnaturels (Peur et Terreur des Morts-vivants et des démons comprises) et +1 DR en Résistance contre maladies et empoisonnement.',
  {type:'special',receiptFormulas:{calmeEffetsSurnaturelsDR:1,resistanceMaladiesEtPoisonsDR:1}},
  'Durée : une semaine plus une par DR du Test d’incantation (donnée saisie par le MJ). Le sachet de peau de petit animal est un rappel narratif.'),
 L02('pas-imperceptible','Pas imperceptible','Sightstep',64,7,'Vous','Vous','Bonus de Force Mentale minutes',
  'Votre nature magique est voilée à ceux qui sentent les Vents, et vous gagnez +2 DR en Discrétion contre démons, esprits et créatures éthérées ; vous ne pouvez ni lancer, ni dissiper, ni canaliser.',
  {type:'special',receiptFormulas:{discretionContreDemonsEspritsEtheresDR:2},specialState:{magicAuraHidden:true,cannotCast:true,cannotChannel:true,cannotDispel:true}},
  'Invisible à Seconde vue et à Sens de la magie (le « Magical Sight » de la source est lu comme ces deux talents). Incantation, Focalisation et dissipation interdites pendant la durée ; le lanceur peut mettre fin au sort à son Tour.'),
 L02('maree-d-argent','Marée d’argent','Silvertide',64,4,'Vous','Vous','1d10 heures',
  'Un charme de chance : au fil des heures vous trouvez des pièces égarées, 1d10 sous de cuivre au total à la fin du sort.',
  {type:'narrative'},
  'Gain de 1d10 sous de cuivre à l’échéance, reçu de bourse à reporter par le MJ ; durée tirée aux dés saisie par le MJ.'),
 L02('l-expulsion','L’Expulsion','The Ousting',64,8,'Bonus de Force Mentale mètres','1','1d10 ans',
  'Une créature Éthérée ou Démoniaque doit réussir un Test de Force Mentale Intermédiaire (+0 DR) ou perdre un nombre de Blessures égal à votre Bonus de Force Mentale ; réduite à 0, elle est bannie du monde matériel.',
  {type:'damage',damage:{formula:'BFM',raw:0,directWounds:true,ignoreAp:true},targetRule:{requiredAnyTrait:SENS_DEMONIAQUES},
   secondaryTest:{actor:'target',mandatory:true,skill:'Force Mentale',stat:'FM',modifierSl:0,rollField:'resistanceRoll'}},
  'Blessures directes (ni Bonus d’Endurance ni armure). À 0 Blessure ou moins, la créature est bannie pour 1d10 ans (durée saisie par le MJ). Test de Volonté fixe de la cible (+0 DR), non opposé : lecture fidèle de la source.'),
 L02('protection-contre-le-wyrd','Protection contre le wyrd','Wyrd Ward',64,4,'Toucher','1','Bonus de Force Mentale heures',
  'Si vous remportez l’opposition de Force Mentale, la cible subit −2 DR à ses Tests de Langue (Magick) et de Focalisation pour lancer ou canaliser les Domaines de la Sorcellerie, de la Nécromancie, de la Démonologie et du Chaos.',
  {type:'special',opposedTest:{casterStat:'FM',targetStat:'FM',targetSkill:'Force Mentale',resistOnLoss:true,casterWinsTies:true},receiptFormulas:{langueMagickEtFocalisationDR:-2}},
  'Opposition de Force Mentale après l’incantation, deux dés explicites ; victoire du lanceur : −2 DR à Langue (Magick) et Focalisation de la cible pour lancer ou canaliser Sorcellerie, Nécromancie, Démonologie ou un Domaine du Chaos (le malus est rappelé au MJ, non appliqué aux autres Domaines).')
];
