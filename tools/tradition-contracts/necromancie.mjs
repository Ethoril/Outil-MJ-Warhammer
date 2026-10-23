// Domaine de la Nécromancie (Necromancy), livre de base V5 pp. 258-259. Lot D6.
// Aucun attribut de Domaine ; règle d'ingrédients neutralisée. Profils des Squelettes et Zombies : phase E (participants génériques en attendant).
import {tradition,fact} from './helpers.mjs';
const DOMAINE='necromancy',TYPE='Domaine de la Nécromancie',V5='Tradition V5 (livre de base)';
const L06=(slug,name,canonical,page,cn,range,target,duration,description,effects,assisted,more={})=>tradition(slug,name,canonical,'L06',page,DOMAINE,TYPE,V5,cn,range,target,duration,description,effects,{assisted:[assisted],...more});
const MORTS_VIVANTS=['mort-vivant','undead'];
const dawn=fact('minutesToDawn','Mort-vivant : minutes jusqu’au lever du soleil','number',{min:1,max:1440});
const DAWN={durationFact:{quantityFact:'minutesToDawn',unit:'minutes'}};
const ENDS='Le sort prend fin, et les morts-vivants invoqués s’effondrent, si le lanceur meurt ou devient Inconscient : le MJ déclare l’événement « lanceur à terre » sur la couche.';

export const NECROMANCIE=[
 L06('relever-les-morts','Relever les morts','Raise Dead',258,7,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Jusqu’au lever du soleil',
  'Un flot de Dhar sur la terre nue fait surgir 1 + DR Squelettes, À Terre, à la fin du Round ; ils obéissent à des ordres simples. Un squelette de plus par +2 DR.',
  {type:'summon',summon:{profile:'E0-P-093',name:'Squelette',addDr:true,count:1,max:60,states:['À Terre'],traits:['Mort-vivant']},
   specialState:{controlledByCaster:true,endsOnEvents:['caster-down'],assistedReminder:'Les Squelettes agissent à la fin du Round de l’invocation, À Terre ; ils exécutent des ordres simples. '+ENDS},
   optionRules:{extra:{summonCountPerStep:1}},facts:[dawn],...DAWN},
  'Profil des Squelettes : profil imprimé du bestiaire (L06 p. 339), valeurs non recalculées ; sort refusé si le profil manque (décision du MJ du 22/10). Terre nue : rappel narratif, aucun refus. +2 DR : un Squelette de plus.',
  {overcastSpecific:[{id:'extra',label:'+2 DR : un Squelette supplémentaire',cost:2,repeat:true,kind:'contract-rule'}]}),
 L06('reanimation','Réanimation','Reanimate',258,8,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Jusqu’au lever du soleil',
  'Un Dhar visqueux s’enfonce dans des cadavres : BFM + DR corps se relèvent en Zombies ou en Squelettes, À Terre, sous votre contrôle. Un mort de plus par +2 DR.',
  {type:'summon',summon:{name:'Mort réanimé',nameFact:'undeadKind',names:{zombies:'Zombie',skeletons:'Squelette'},profiles:{zombies:'E0-P-094',skeletons:'E0-P-093'},baseFormula:'BFM',addDr:true,count:1,max:60,states:['À Terre'],traits:['Mort-vivant']},
   specialState:{controlledByCaster:true,endsOnEvents:['caster-down'],assistedReminder:'Les morts relevés commencent À Terre et exécutent des ordres simples. '+ENDS},
   optionRules:{extra:{summonCountPerStep:1}},facts:[fact('undeadKind','Réanimation : sorte de mort-vivant relevé','select',{options:[['zombies','Zombies'],['skeletons','Squelettes']]}),dawn],...DAWN},
  'Cadavres présents : à déclarer par le MJ. Profils des Zombies et des Squelettes : profils imprimés du bestiaire (L06), valeurs non recalculées ; sort refusé si un profil manque (décision du MJ du 22/10). +2 DR : un mort de plus.',
  {overcastSpecific:[{id:'extra',label:'+2 DR : un mort-vivant supplémentaire',cost:2,repeat:true,kind:'contract-rule'}]}),
 L06('crane-hurlant','Crâne hurlant','Screaming Skull',259,8,'Force Mentale mètres','Spécial','Instantané',
  'Un crâne noir cerclé de flammes verdâtres file en ligne droite sur toute la portée, à travers les obstacles : projectile magique (Dégâts +5) qui épargne les Morts-vivants. Qui perd des Blessures teste Calme ou devient Brisé.',
  {type:'magic-missile',missile:{damage:5},targetRule:{exceptAnyTrait:MORTS_VIVANTS},
   secondaryTest:{actor:'target',mandatory:true,skill:'Calme',stat:'FM',modifierSl:0,rollField:'resistanceRoll',failCondition:'Brisé',failOnlyIfWounded:true}},
  'Trajectoire en ligne droite sur la portée, en suivant le relief et en traversant les obstacles ; cibles choisies par le MJ sur la ligne. Les Morts-vivants ne sont pas affectés. Test de Calme Intermédiaire (+0 DR) seulement pour qui subit des Blessures, sinon rien ; échec : Brisé.'),
 L06('l-appel-de-vanhel','L’appel de Vanhel','Vanhel’s Call',259,6,'Force Mentale mètres','Spécial','Instantané',
  'Des flux de Dhar remplissent vos cibles Mortes-vivantes d’une énergie démesurée : chacune gagne aussitôt un Mouvement ou une Action gratuite.',
  {type:'special',targetRule:{requiredAnyTrait:MORTS_VIVANTS},
   facts:[fact('freeKind','L’appel de Vanhel : gain commun à toutes les cibles','select',{options:[['move','Un Mouvement gratuit'],['action','Une Action gratuite']]})],
   specialState:{assistedReminder:'Jusqu’à Bonus d’Intelligence cibles Mortes-vivantes gagnent, au moment du lancement, le même gain : un Mouvement ou une Action gratuite (au choix du lanceur, un seul choix pour toutes). +2 DR : Bonus d’Intelligence cibles de plus.'}},
  'Le gain est joué par le MJ à l’instant du lancement ; aucun suivi de Mouvement ou d’Action n’est automatisé.',
  {overcastSpecific:[{id:'targets',label:'+2 DR : Bonus d’Intelligence cibles de plus',cost:2,repeat:true,kind:'reminder',reminder:'Bonus d’Intelligence cibles Mortes-vivantes supplémentaires.'}]})
];
