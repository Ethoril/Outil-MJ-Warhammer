/** V5 core pp. 173–176, concise French receipts. Historic tables remain unchanged. */
export const V5_CRITICAL_TABLE_VERSION = 'v5-critical-2026-10-09.1';
// max, name, wounds, unconditional conditions, manual follow-up. null max is unbounded.
const row = ([max, name, wounds, conditions = {}, reminder = '']) => ({ max: max ?? Number.MAX_SAFE_INTEGER, name,
  eff: `${wounds ? `+${wounds} Blessures. ` : ''}${reminder}`, parsed: { extraWounds: wounds,
    states: Object.entries(conditions).map(([name, value]) => ({ name, ...(typeof value === 'object' ? value : { level: value }),
      key: ({ Hémorragique:'hemorragique', Sonné:'sonne', Aveuglé:'aveugle', Assourdi:'assourdi', Exténué:'extenue', 'À Terre':'a-terre' })[name] })),
    reminders: reminder ? [reminder] : [], death: false } });
const death = name => ({ max: Number.MAX_SAFE_INTEGER, name, eff: 'Mort instantanée.', parsed: { extraWounds:0, states:[], reminders:[], death:true } });
export const V5_CRIT_DATA = {
  HEAD: [
    [3,'Blessure spectaculaire',0,{Hémorragique:1},'Après guérison : cicatrice, bonus social unique +1 DR.'],
    [9,'Coup à l’oreille',1,{Assourdi:1}], [12,'Coup à l’œil',1,{Aveuglé:1}], [17,'Coupure mineure',1,{Hémorragique:1}],
    [20,'Coup percutant',1,{Sonné:1}], [25,'Œil au beurre noir',2,{Aveuglé:2}], [30,'Oreille tranchée',2,{Hémorragique:1,Assourdi:2}],
    [35,'En plein front',2,{Hémorragique:2,Aveuglé:{level:1,v5Recovery:{kind:'noBleeding'}}},'Aveuglé persiste jusqu’à la disparition d’Hémorragique.'],
    [40,'Mâchoire fracturée',2,{Sonné:1},'Fracture mineure.'],
    [45,'Nez cassé',3,{Hémorragique:1},'Résistance +0 DR ; échec : Sonné 1.'],
    [50,'Blessure majeure à l’œil',3,{Hémorragique:1,Aveuglé:{level:1,v5Recovery:{kind:'medicalAttention'}}},'Aveuglé persiste jusqu’aux soins médicaux.'],
    [55,'Mâchoire cassée',3,{Sonné:2},'Fracture majeure.'],
    [60,'Blessure majeure à l’oreille',3,{Assourdi:4},'Audition définitivement perdue dans cette oreille ; une seconde occurrence rend complètement sourd.'],
    [65,'Commotion cérébrale',4,{Assourdi:1},'Tirer 1d10 Sonné ; Exténué 1 durant 1d10 jours.'],
    [75,'Dents brisées',4,{Hémorragique:2},'Perte de 1d10 dents ; amputation facile +4 DR.'],
    [80,'Oreille mutilée',4,{Hémorragique:2,Assourdi:3},'Oreille perdue ; amputation moyenne +2 DR.'],
    [85,'Œil crevé',5,{Hémorragique:2,Sonné:1},'Œil perdu ; amputation difficile −1 DR.'],
    [94,'Coup défigurant',5,{Hémorragique:3,Sonné:2},'Œil et nez perdus ; amputation ardue −2 DR.'],
    [99,'Mâchoire mutilée',5,{Hémorragique:4,Sonné:3},'Fracture majeure, langue et 1d10 dents perdues ; amputation ardue −2 DR.']
  ].map(row).concat(death('Crâne fracassé')),
  ARM: [
    [10,'Choc au poignet',0,{},'Lâcher l’objet tenu.'], [20,'Choc au bras',0,{},'Lâcher l’objet ; main inutilisable 1d10−BE Rounds (minimum 1).'],
    [25,'Coupure mineure',1,{Hémorragique:1}], [30,'Main ensanglantée',1,{Hémorragique:1},'Tant que cette Hémorragie persiste, avant une action avec cette main : Dextérité +2 DR ; échec : lâcher l’objet.'],
    [45,'Torsion',1,{},'Déchirure musculaire mineure.'], [50,'Déchirure musculaire',1,{Hémorragique:1},'Déchirure mineure.'],
    [55,'Clef de bras',2,{},'Lâcher l’objet ; bras inutilisable 1d10 Rounds.'],
    [60,'Blessure béante',2,{Hémorragique:2},'Sans chirurgie, chaque nouvelle perte de Blessures au bras ajoute Hémorragique 1.'],
    [65,'Ligament rompu',2,{},'Lâcher l’objet ; déchirure majeure.'],
    [80,'Cassure nette',2,{},'Lâcher l’objet ; fracture mineure ; Résistance −1 DR, échec : Sonné 1.'],
    [85,'Coupure profonde',3,{Hémorragique:2,Sonné:1},'Déchirure mineure.'],
    [90,'Coude fracassé',3,{},'Lâcher l’objet ; fracture majeure.'], [95,'Artère endommagée',3,{Hémorragique:4}],
    [109,'Épaule luxée',4,{},'Bras inutilisable ; Guérison étendue +2 DR, 6 DR pour remettre l’épaule ; −1 DR au bras durant 1d10 jours après.'],
    [115,'Doigt sectionné',4,{Hémorragique:1},'Doigt perdu ; amputation moyenne +2 DR.'],
    [120,'Main ouverte',4,{Hémorragique:2,Sonné:1},'Perdre un doigt puis un autre par Round sans soins ; amputation difficile −1 DR.'],
    [125,'Biceps déchiqueté',5,{Hémorragique:2,Sonné:1},'Lâcher l’objet ; déchirure majeure.'],
    [130,'Main mutilée',5,{Hémorragique:2},'Main perdue ; amputation ardue −2 DR.'],
    [135,'Tendons coupés',5,{Hémorragique:3,Sonné:1},'Bras inutilisable ; amputation très ardue −3 DR.']
  ].map(row).concat(death('Démembrement brutal')),
  BODY: [
    [10,'Souffle coupé',0,{},'Suffocation durant 1 Round.'],
    [15,'Coup au ventre',1,{},'Résistance +2 DR ; échec : vomir, Sonné 1 pendant 1 Round et Souillé.'],
    [25,'Blessure superficielle',1,{Hémorragique:1}], [30,'Coup bas',1,{Sonné:1}],
    [35,'Torsion du dos',1,{},'Déchirure mineure.'], [50,'Bleus aux côtes',2,{},'−1 DR aux Tests d’Agilité durant 1d10 jours.'],
    [55,'Clavicule tordue',2,{},'Tirer un bras ; lâcher l’objet ; bras inutilisable 1d10 Rounds.'],
    [60,'Chairs déchirées',2,{Hémorragique:2}], [65,'Côtes fracturées',2,{Sonné:1},'Fracture mineure.'],
    [70,'Blessure béante',3,{Hémorragique:3},'Sans chirurgie, toute nouvelle perte de Blessures au corps ajoute Hémorragique 1.'],
    [75,'Entaille douloureuse',3,{Hémorragique:2,Sonné:1},'Résistance −2 DR ; échec : crier ; échec à −6 DR ou moins : Inconscient.'],
    [80,'Dos froissé',3,{Sonné:1},'Déchirure majeure.'],
    [85,'Dégâts artériels',3,{Hémorragique:4},'Sans chirurgie, chaque nouveau dégât au corps ajoute Hémorragique 2.'],
    [90,'Blessure au ventre',4,{Hémorragique:2},'Blessure purulente.'],
    [95,'Hanche fracturée',4,{Sonné:1},'Fracture mineure ; Résistance +0 DR, échec : À Terre.'],
    [100,'Blessure majeure à la poitrine',4,{Hémorragique:4},'Sans chirurgie, toute nouvelle perte de Blessures au corps ajoute Hémorragique 2.'],
    [105,'Cage thoracique fracassée',5,{Sonné:{level:1,v5Recovery:{kind:'medicalAttention'}},Hémorragique:1},'Sonné persiste jusqu’aux soins médicaux ; fracture majeure.'],
    [110,'Moelle épinière lésée',5,{Sonné:3},'Fracture majeure ; jambes perdues fonctionnellement ; amputation très ardue −3 DR.'],
    [115,'Hémorragie interne',5,{Hémorragique:{level:1,v5Recovery:{kind:'surgery'}}},'Hémorragique persiste jusqu’à chirurgie ; pourriture du sang.']
  ].map(row).concat(death('Corps déchiré')),
  LEG: [
    [10,'Orteil contusionné',0,{},'Résistance +2 DR ; échec : Désavantage en Agilité jusqu’à la fin du Tour.'],
    [20,'Perte d’appui',0,{},'Athlétisme +0 DR ; échec : À Terre.'],
    [25,'Cheville tordue',1,{},'Désavantage aux Tests utilisant la jambe durant 1d10−BE Rounds (minimum 1).'],
    [40,'Coupure mineure',1,{Hémorragique:1}], [45,'Coup à la cuisse',1,{Hémorragique:1},'Résistance +2 DR ; échec : À Terre.'],
    [50,'Cheville foulée',1,{},'Déchirure mineure.'], [55,'Genou tordu',2,{},'Désavantage aux Tests utilisant la jambe durant 1d10 Rounds.'],
    [60,'Coupure profonde',2,{Hémorragique:2},'Résistance +0 DR ; échec : À Terre.'],
    [65,'Genou gravement tordu',2,{},'Déchirure majeure.'],
    [70,'Orteil entaillé',2,{Hémorragique:1},'Après la rencontre : Résistance +0 DR ; échec : orteil perdu, amputation moyenne +2 DR.'],
    [75,'Tendon rompu',3,{Sonné:1,'À Terre':1},'Résistance −2 DR ; échec : Inconscient ; déchirure majeure.'],
    [80,'Cuisse déchirée',3,{Hémorragique:3},'Sans chirurgie, toute nouvelle perte de Blessures à la jambe ajoute Hémorragique 1.'],
    [85,'Jambe tailladée',3,{Hémorragique:2,Sonné:1,'À Terre':1},'Fracture mineure.'],
    [95,'Genou luxé',4,{'À Terre':1},'Jambe inutilisable ; Guérison étendue +2 DR, 6 DR, un Test par Round ; ensuite Mouvement divisé par 2 durant 1d10 jours.'],
    [100,'Tibia fracturé',4,{Sonné:1,'À Terre':1},'Fracture mineure et déchirure majeure.'],
    [105,'Genou brisé',4,{Hémorragique:1,Sonné:1,'À Terre':1},'Fracture majeure.'],
    [115,'Pied écrasé',4,{Hémorragique:2},'Résistance +2 DR ; échec : À Terre et perte d’orteils selon DR négatifs ; chirurgie avant BE jours pour sauver le pied.'],
    [120,'Pied sectionné',5,{Hémorragique:3,Sonné:2,'À Terre':1},'Pied perdu ; amputation ardue −2 DR.'],
    [125,'Tendon sectionné',5,{Hémorragique:2,Sonné:2,'À Terre':1},'Jambe définitivement inutilisable ; amputation très ardue −3 DR.']
  ].map(row).concat(death('Bassin fracassé'))
};

// Noms imprimés et folios du livre V5 anglais, contrôlés sur les pages physiques
// 173–176 de « Livre de base V5 EN v2.pdf ». Les états et Blessures restent les
// valeurs de table ci-dessus ; cette couche ajoute les séquelles durables/F2-J.
const SOURCE_ROWS = {
  HEAD: ['Dramatic Injury','Ear Bash','Poked Eye','Minor Cut','Rattling Blow','Black Eye','Sliced Ear','Struck Forehead','Fractured Jaw','Broken Nose','Major Eye Wound','Broken Jaw','Major Ear Wound','Concussive Blow','Smashed Teeth','Mangled Ear','Devastated Eye','Disfiguring Blow','Mangled Jaw','Shattered Skull'],
  ARM: ['Jolted Wrist','Jarred Arm','Minor Cut','Bleeding Hand','Sprain','Torn Muscles','Wrenched Arm','Gaping Wound','Ruptured Ligament','Clean Break','Deep Cut','Crushed Elbow','Damaged Artery','Dislocated Shoulder','Severed Finger','Cleft Hand','Mauled Bicep','Mangled Hand','Sliced Tendons','Brutal Dismemberment'],
  BODY: ['Winded','Gut Blow','Flesh Wound','Low Blow!','Twisted Back','Bruised Ribs','Wrenched Collar Bone','Ragged Wound','Cracked Ribs','Gaping Wound','Painful Cut','Pulled Back','Arterial Damage','Gut Wound','Fractured Hip','Major Chest Wound','Smashed Rib Cage','Spinal Cord Damage','Internal Bleeding','Torn Apart'],
  LEG: ['Jabbed Toe','Lost Footing','Twisted Ankle','Minor Cut','Thigh Strike','Sprained Ankle','Twisted Knee','Bad Cut','Badly Twisted Knee','Badly Cut Toe','Ruptured Tendon','Torn Thigh','Hacked Leg','Dislocated Knee','Cracked Shin','Broken Knee','Crushed Foot','Severed Foot','Cut Tendon','Shattered Pelvis']
};
const lasting = rows => Object.fromEntries(rows.map(([name, effects]) => [name, effects]));
const LASTING_OUTCOMES = {
  HEAD: lasting([
    ['Dramatic Injury',[{kind:'scar',part:'cheek',socialBonusSL:1,once:true}]],
    ['Fractured Jaw',[{kind:'injury',name:'Broken Bone',severity:'minor',part:'head'}]],
    ['Broken Nose',[{kind:'test',skill:'Endurance',difficultySL:0,onFailure:'sonne:1'}]],
    ['Major Eye Wound',[{kind:'medical-attention-required',condition:'aveugle'}]],
    ['Broken Jaw',[{kind:'injury',name:'Broken Bone',severity:'major',part:'head'}]],
    ['Major Ear Wound',[{kind:'permanent-sensory-loss',part:'one-ear',sense:'hearing',secondOccurrence:'hearing-loss-both-ears'}]],
    ['Concussive Blow',[{kind:'random-condition-count',condition:'sonne',dice:'1d10'},{kind:'duration',condition:'extenue',dice:'1d10',unit:'days'}]],
    ['Smashed Teeth',[{kind:'amputation',part:'teeth',dice:'1d10',difficultySL:4}]],
    ['Mangled Ear',[{kind:'amputation',part:'ear',difficultySL:2}]],
    ['Devastated Eye',[{kind:'amputation',part:'eye',difficultySL:-1}]],
    ['Disfiguring Blow',[{kind:'amputation',part:'eye-and-nose',difficultySL:-2}]],
    ['Mangled Jaw',[{kind:'injury',name:'Broken Bone',severity:'major',part:'head'},{kind:'amputation',part:'tongue-and-teeth',dice:'1d10',difficultySL:-2}]]
  ]),
  ARM: lasting([
    ['Jolted Wrist',[{kind:'drop-held-item',part:'hand'}]],
    ['Jarred Arm',[{kind:'drop-held-item',part:'hand'},{kind:'temporary-limb-loss',part:'hand',duration:'1d10-TB Rounds',minimum:1}]],
    ['Bleeding Hand',[{kind:'conditional-test',skill:'Dexterity',difficultySL:2,condition:'bleeding',onFailure:'drop-held-item'}]],
    ['Sprain',[{kind:'injury',name:'Torn Muscle',severity:'minor',part:'arm'}]],
    ['Torn Muscles',[{kind:'injury',name:'Torn Muscle',severity:'minor',part:'arm'}]],
    ['Wrenched Arm',[{kind:'drop-held-item',part:'hand'},{kind:'temporary-limb-loss',part:'arm',duration:'1d10 Rounds'}]],
    ['Gaping Wound',[{kind:'surgery-required',effect:'each-new-wound-to-arm-adds-bleeding:1'}]],
    ['Ruptured Ligament',[{kind:'drop-held-item',part:'hand'},{kind:'injury',name:'Torn Muscle',severity:'major',part:'arm'}]],
    ['Clean Break',[{kind:'drop-held-item',part:'hand'},{kind:'injury',name:'Broken Bone',severity:'minor',part:'arm'},{kind:'test',skill:'Endurance',difficultySL:-1,onFailure:'sonne:1'}]],
    ['Deep Cut',[{kind:'injury',name:'Torn Muscle',severity:'minor',part:'arm'}]],
    ['Crushed Elbow',[{kind:'drop-held-item',part:'hand'},{kind:'injury',name:'Broken Bone',severity:'major',part:'arm'}]],
    ['Dislocated Shoulder',[{kind:'reset-limb',part:'shoulder',extendedHealSL:6,difficultySL:2},{kind:'duration',effect:'arm-tests:-1SL',dice:'1d10',unit:'days'}]],
    ['Severed Finger',[{kind:'amputation',part:'finger',difficultySL:2}]],
    ['Cleft Hand',[{kind:'amputation',part:'finger',difficultySL:-1,recurrence:'one-finger-per-round-without-medical-attention',eventualPart:'hand'},{kind:'amputation',part:'hand',difficultySL:-1,conditional:true,trigger:'all-fingers-lost'}]],
    ['Mauled Bicep',[{kind:'drop-held-item',part:'hand'},{kind:'injury',name:'Torn Muscle',severity:'major',part:'arm'}]],
    ['Mangled Hand',[{kind:'amputation',part:'hand',difficultySL:-2}]],
    ['Sliced Tendons',[{kind:'amputation',part:'arm-function',difficultySL:-3}]]
  ]),
  BODY: lasting([
    ['Winded',[{kind:'duration',effect:'suffocation',rounds:1}]],
    ['Gut Blow',[{kind:'test',skill:'Endurance',difficultySL:2,onFailure:{kind:'compound',effects:[
      {kind:'event',event:'vomit'},
      {kind:'condition',name:'Sonné',key:'sonne',level:1,durationRounds:1},
      {kind:'condition',name:'Souillé',key:'souille',level:1}
    ]}}]],
    ['Twisted Back',[{kind:'injury',name:'Torn Muscle',severity:'minor',part:'body'}]],
    ['Bruised Ribs',[{kind:'duration',effect:'Ag-tests:-1SL',dice:'1d10',unit:'days'}]],
    ['Wrenched Collar Bone',[{kind:'random-select-and-apply',part:'arm',effects:[{kind:'drop-held-item',part:'hand'},{kind:'temporary-limb-loss',part:'arm',duration:'1d10 Rounds'}]}]],
    ['Cracked Ribs',[{kind:'injury',name:'Broken Bone',severity:'minor',part:'body'}]],
    ['Gaping Wound',[{kind:'surgery-required',effect:'each-new-wound-to-body-adds-bleeding:1'}]],
    ['Painful Cut',[{kind:'test',skill:'Endurance',difficultySL:-2,onFailure:'scream',onFailureAtOrBelow:-6,addCondition:'inconscient'}]],
    ['Pulled Back',[{kind:'injury',name:'Torn Muscle',severity:'major',part:'body'}]],
    ['Arterial Damage',[{kind:'surgery-required',effect:'each-new-body-hit-adds-bleeding:2'}]],
    ['Gut Wound',[{kind:'disease',name:'Festering Wound'}]],
    ['Fractured Hip',[{kind:'injury',name:'Broken Bone',severity:'minor',part:'body'},{kind:'test',skill:'Endurance',difficultySL:0,onFailure:'a-terre'}]],
    ['Major Chest Wound',[{kind:'surgery-required',effect:'each-new-wound-to-body-adds-bleeding:2'}]],
    ['Smashed Rib Cage',[{kind:'injury',name:'Broken Bone',severity:'major',part:'body'},{kind:'medical-attention-required',condition:'sonne'}]],
    ['Spinal Cord Damage',[{kind:'injury',name:'Broken Bone',severity:'major',part:'body'},{kind:'permanent-functional-loss',part:'legs',difficultySL:-3,amputation:true}]],
    ['Internal Bleeding',[{kind:'surgery-required',effect:'hemorragique-until-surgery'},{kind:'disease',name:'Blood Rot'}]]
  ]),
  LEG: lasting([
    ['Twisted Ankle',[{kind:'duration',effect:'leg-tests-disadvantage',dice:'1d10-TB',unit:'Rounds',minimum:1}]],
    ['Jabbed Toe',[{kind:'test',skill:'Endurance',difficultySL:2,onFailure:'Ag-tests-disadvantage-until-end-of-turn'}]],
    ['Lost Footing',[{kind:'test',skill:'Athletics',difficultySL:0,onFailure:'a-terre'}]],
    ['Thigh Strike',[{kind:'test',skill:'Endurance',difficultySL:2,onFailure:'a-terre'}]],
    ['Sprained Ankle',[{kind:'injury',name:'Torn Muscle',severity:'minor',part:'leg'}]],
    ['Twisted Knee',[{kind:'duration',effect:'leg-tests-disadvantage',dice:'1d10',unit:'Rounds'}]],
    ['Bad Cut',[{kind:'test',skill:'Endurance',difficultySL:0,onFailure:'a-terre'}]],
    ['Badly Twisted Knee',[{kind:'injury',name:'Torn Muscle',severity:'major',part:'leg'}]],
    ['Badly Cut Toe',[{kind:'post-encounter-test',skill:'Endurance',difficultySL:0,onFailure:{kind:'amputation',part:'toe',difficultySL:2}}]],
    ['Ruptured Tendon',[{kind:'test',skill:'Endurance',difficultySL:-2,onFailure:'inconscient'},{kind:'injury',name:'Torn Muscle',severity:'major',part:'leg'}]],
    ['Torn Thigh',[{kind:'surgery-required',effect:'each-new-leg-wound-adds-bleeding:1'}]],
    ['Hacked Leg',[{kind:'injury',name:'Broken Bone',severity:'minor',part:'leg'}]],
    ['Dislocated Knee',[{kind:'reset-limb',part:'knee',extendedHealSL:6,difficultySL:2,testsPerRound:1},{kind:'duration',effect:'movement-halved',dice:'1d10',unit:'days'}]],
    ['Cracked Shin',[{kind:'injury',name:'Broken Bone',severity:'minor',part:'leg'},{kind:'injury',name:'Torn Muscle',severity:'major',part:'leg'}]],
    ['Broken Knee',[{kind:'injury',name:'Broken Bone',severity:'major',part:'leg'}]],
    ['Crushed Foot',[{kind:'test',skill:'Endurance',difficultySL:2,onFailure:{kind:'compound',effects:['a-terre',{kind:'amputation',part:'toes',count:1,plusOnePerNegativeSL:true,difficultySL:2}]}},{kind:'surgery-deadline',days:'TB',effect:'lose-foot-if-surgery-not-received'}]],
    ['Severed Foot',[{kind:'amputation',part:'foot',difficultySL:-2}]],
    ['Cut Tendon',[{kind:'permanent-functional-loss',part:'leg',difficultySL:-3,amputation:true}]]
  ])
};
const SOURCE_PAGE = { HEAD:173, ARM:174, BODY:175, LEG:176 };
for(const [table,entries] of Object.entries(V5_CRIT_DATA)){
  const names=SOURCE_ROWS[table];
  if(!names||names.length!==entries.length)throw new Error(`Critical V5 ${table}: provenance PDF incomplète.`);
  entries.forEach((entry,index)=>{
    entry.source={book:'L06',printedPage:SOURCE_PAGE[table],printedName:names[index]};
    const outcomes=(LASTING_OUTCOMES[table][names[index]]||[]).map(effect=>({...effect}));
    entry.parsed={...entry.parsed,injuries:outcomes.filter(effect=>effect.kind==='injury'),durableEffects:outcomes.filter(effect=>effect.kind!=='injury'),source:entry.source};
  });
}
export function getV5CriticalEffect(key, roll) { return V5_CRIT_DATA[key]?.find(entry => roll <= entry.max) || null; }
