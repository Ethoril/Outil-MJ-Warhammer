// Domaine de la Grande Gueule (Ogres), sept sorts d'Archives of the Empire 2 (L01 pp. 32-33) et quatre de Tribes and Tribulations (L12 p. 82). Lot D12.
// Sources V4 converties en V5 : ±10 → ±1 DR, ±20 → ±2 DR, ±30 → ±3 DR ; « Difficult (+20) » (libellé contradictoire de la source) → Difficile −2 DR (arbitrage Q05).
// Aucun ingrédient exigé (le fait de manger est un rappel narratif). Noms français proposés (aucun nom officiel) : CHOIX_EXECUTANT_PHASE_D.md.
import {tradition,fact} from './helpers.mjs';
const DOMAINE='maw',TYPE='Domaine de la Grande Gueule',ED='Supplément V4 (Ogres), conversion V5';
const mk=(book,slug,name,canonical,page,cn,range,target,duration,description,effects,assisted,more={})=>tradition(slug,name,canonical,book,page,DOMAINE,TYPE,ED,cn,range,target,duration,description,effects,{assisted:[assisted],...more});
const L01=(...a)=>mk('L01',...a),L12=(...a)=>mk('L12',...a);
const optional=(key,label)=>fact(key,label,'boolean',{perTarget:true,optional:true});
const OGRE=optional('ogre','Cible : Ogre allié');
const OGRES={alliesOnly:true,requiredFact:'ogre'};
const ENEMY_MEAL='Pas de repas, pas d’ingrédient exigé : la préparation (os, tripes, sang) est un rappel narratif.';

export const GRANDE_GUEULE=[
 L01('brise-os','Brise-os','Bonecrusher',32,5,'Force Mentale mètres','1','Instantané',
  'Vous broyez bruyamment des os en maudissant un adversaire : projectile magique (Dégâts +4) qui ignore les Points d’Armure mais pas le Bonus d’Endurance.',
  {type:'magic-missile',missile:{damage:4,ignoreAp:true}},
  'Sur Blessure Critique, ajoutez +20 au jet sur la table de Blessures Critiques correspondante (rappel au MJ : c’est un jet de table, pas un Test). '+ENEMY_MEAL),
 L01('gloutonneur','Gloutonneur','Bullgorger',32,5,'Bonus de Force Mentale mètres','1','Bonus de Force Mentale Rounds',
  'Vous dévorez le cœur d’une bête puissante pour projeter sa force sur une créature proche : +2 Bonus de Force pour les dégâts qu’elle inflige et les exploits de force ; à la fin, repas copieux ou Exténué.',
  {type:'special',statModifiers:{F:20},facts:[optional('rejectsGift','Gloutonneur : la cible refuse le don')],
   secondaryTest:{actor:'target',mandatory:true,skill:'Calme',stat:'FM',modifierSl:-2,rollField:'resistanceRoll',whenFact:'rejectsGift'},
   expiryEffect:{askFact:{key:'meal',label:'repas copieux pris à la fin du sort ?',skipWhen:true},conditions:['Exténué']}},
  '+2 Bonus de Force = +20 Force pendant la durée (Tests de Force compris). Refus du don : Test de Calme Difficile (−2 DR, lecture V5 du « Difficult (+20) » de la source), réussi : aucun effet. À la fin du sort, sans repas copieux la cible gagne un Exténué.'),
 L01('devore-cervelle','Dévore-cervelle','Braingobbler',32,5,'Vous','Vous','Bonus de Force Mentale Rounds',
  'Vous dévorez une tête entière : votre ventre en tire l’essence des cauchemars, qui se répand en une vague d’horreur nauséabonde : vous gagnez Peur (2).',
  {type:'traits',traits:['Peur (2)']},
  'Si le défunt était proche d’une créature affectée par votre Peur, elle subit −2 DR à ses Tests de Calme pour y résister (rappel : relation jugée par le MJ).'),
 L01('gout-de-la-mort','Goût de la mort','Taste Death',33,2,'Vous','Vous','Instantané',
  'En consommant une part de cadavre, vous apprenez quand et comment la créature est morte : arme, poison, magie, mort naturelle, de façon générale.',
  {type:'narrative'},
  'Information générale seulement (jamais le coupable ni les détails de l’arme). Mort « propre » (ni poison ni maladie) : il est convenable de consommer le reste du corps.'),
 L01('tripes-de-troll','Tripes de troll','Trollguts',33,6,'Bonus d’Endurance mètres','1','Bonus d’Endurance Rounds',
  'Vous avalez un peu de bile de troll : la cible gagne la capacité de Régénération pour la durée ; les Ogres n’en subissent aucun effet secondaire.',
  {type:'traits',traits:['Régénération'],roundEffect:{phase:'startOfRound',regeneration:true}},
  'Régénération : jets de Régénération du Round saisis par le MJ (Blessures et Critiques causés par le feu exclus). Un non-Ogre qui récupère des Blessures par ce sort fait un Test d’Endurance Accessible (+2 DR) ; échec : chair verdâtre ou bleutée, que les témoins prennent pour une mutation (rappel narratif, ce n’en est pas une).'),
 L01('la-gueule','La Gueule','The Maw',33,11,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds',
  'Vous dévorez une grosse bête et faites surgir un éclat de la Grande Gueule : le sol s’ouvre sur mille dents ; chaque occupant fait un Test d’Esquive Intermédiaire (+0 DR), réussi : dégâts +8 réduits de 1 par DR, raté : dégâts +10, trois Enchevêtré.',
  {type:'damage',aoe:true,damage:{formula:'10'},failConditions:['Enchevêtré','Enchevêtré','Enchevêtré'],
   secondaryTest:{actor:'target',mandatory:true,skill:'Esquive',stat:'Ag',modifierSl:0,rollField:'dodgeRoll',conditionsOnly:true,damageOnSuccess:8,damageOnSuccessMinusSl:true}},
  'Localisation tirée au hasard. Raté : seule la Force 60 de la Gueule est opposée aux tentatives de se dégager ; tant qu’une victime y reste elle subit chaque fin de ses Tours un autre coup à Dégâts +10 (à jouer par le MJ). À la fin du sort la Gueule disparaît : une victime encore dedans subit une Blessure Critique à une localisation tirée au hasard.'),
 L01('festin-des-tombes','Festin des tombés','Feast of the Fallen',33,9,'Vous','Spécial','Bonus de Force Mentale Rounds',
  'Vous baignez votre lame dans le sang d’un ennemi tombé : les créatures de votre choix dans la zone gagnent Vampirisme pour la durée, en blessant simplement au corps à corps ; à la fin, les non-Ogres qui ont blessé un adversaire testent Calme ou sont Sonnés.',
  {type:'traits',traits:['Vampirique'],facts:[optional('resistsFeast','Festin : la cible résiste au sort')],
   secondaryTest:{actor:'target',mandatory:true,skill:'Endurance',stat:'E',modifierSl:-2,rollField:'resistanceRoll',whenFact:'resistsFeast'},
   expiryEffect:{askFact:{key:'woundedInMelee',label:'non-Ogre ayant blessé un adversaire au corps à corps ?',skipWhen:false},test:{skill:'Calme',stat:'FM',modifierSl:0},failConditions:['Sonné']}},
  'Zone et cibles désignées par le MJ (la source ne chiffre pas la zone). Résistance volontaire : Test d’Endurance Difficile (−2 DR). Fin du sort : un non-Ogre qui a blessé un adversaire au corps à corps fait un Test de Calme Intermédiaire (+0 DR), échec : Sonné. Si l’adversaire blessé était Infecté ou Malade, le Test pour éviter ses effets subit −3 DR (rappel).'),
 L12('brasse-bile','Brasse-bile','Bilebrew',82,6,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds',
  'Le Boucher avale un mélange âcre de rate et de bile : lui et les Ogres amis de la zone développent la Haine d’une cible, ou d’un groupe de cibles, de son choix.',
  {type:'traits',aoe:true,traits:['Haine'],targetRule:OGRES,facts:[OGRE,fact('hatredTarget','Brasse-bile : cible ou groupe haï','text')]},
  'Seuls le Boucher et les Ogres amis de la zone sont touchés (fait « Ogre allié » à saisir). Cible de la Haine : texte libre. '+ENEMY_MEAL),
 L12('bouillie-de-sang','Bouillie de sang','Bloodgruel',82,5,'Vous','Vous','Instantané',
  'Le Boucher suce le sang et la moelle d’un membre détaché : Test d’Endurance Accessible (+4 DR) ; réussi, il soigne 1 Blessure plus 1 par DR du Test ; raté, il contracte le Flux sanglant.',
  {type:'healing',healing:{amountFact:'bloodgruelHeal'},facts:[fact('bloodgruelHeal','Bouillie de sang : Blessures soignées (1 + DR du Test d’Endurance réussi ; 0 si le Test est raté)','number',{min:0,max:21})]},
  'Test d’Endurance +4 DR joué par le MJ ; échec (saisie 0) : Flux sanglant (maladie suivie par le MJ, aucun suivi automatique). '+ENEMY_MEAL),
 L12('du-coeur-au-ventre','Du cœur au ventre','Get Some Guts',82,6,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds',
  'Le Boucher consomme le gros intestin d’un Mournfang mâle : pendant la durée, les cibles ignorent les états Brisé.',
  {type:'special',aoe:true,targetRule:OGRES,facts:[OGRE],specialState:{assistedReminder:'Les cibles ignorent leurs états Brisé pendant la durée (leur effet est suspendu, pas retiré) ; le MJ applique la suspension.'}},
  'Ogres de la zone seulement (fait « Ogre allié » à saisir). '+ENEMY_MEAL),
 L12('brise-dents','Brise-dents','Toothcracker',82,8,'Vous','ZdE Force Mentale mètres','Bonus de Force Mentale Rounds',
  'Le Boucher broie un morceau de roc : Test d’Endurance Intermédiaire (+0 DR), une dent perdue par DR négatif ; si le sort réussit, lui et les Ogres amis de la zone gagnent +2 DR aux Tests d’Endurance et de Calme et +1 PA à toutes les localisations.',
  {type:'test-modifiers',aoe:true,targetRule:OGRES,facts:[OGRE],testModifiers:{Endurance:2,Calme:2},apModifiers:{all:1}},
  'Test d’Endurance du Boucher joué par le MJ (dents perdues : rappel narratif). Ogres de la zone seulement (fait « Ogre allié » à saisir). '+ENEMY_MEAL)
];
