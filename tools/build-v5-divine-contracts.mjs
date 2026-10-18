import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imperialWeek, thinkOverYourDeeds, heedMyLessons } from '../docs/divin/sources/L06-calendar-readings.mjs';
import { wrathConditionReading, wrathConditionRules } from '../docs/divin/sources/L06-wrath-conditions-readings.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workingDirectory = resolve(process.cwd());
const sameDirectory = process.platform === 'win32'
 ? projectRoot.toLocaleLowerCase() === workingDirectory.toLocaleLowerCase()
 : projectRoot === workingDirectory;
if (!sameDirectory) {
 throw new Error(`Refusing to read or write outside the generator checkout. Run from project root: ${projectRoot} (cwd: ${workingDirectory})`);
}

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const snapshot = readJson('js/data/reference-snapshot.json');
const divineCorpus = readJson('docs/divin/DIVIN_CORPUS_LIVRES.json');
const csvPath = 'js/data/reference-source-csv/Miracles.csv';
const csvText = readFileSync(csvPath, 'utf8');
const csvHash = createHash('sha256').update(csvText, 'utf8').digest('hex');
const snapshotText = readFileSync('js/data/reference-snapshot.json', 'utf8');
const snapshotHash = createHash('sha256').update(snapshotText, 'utf8').digest('hex');
const V5 = { document: 'Livre de base V5 EN v2.pdf', fileSha256: '53e84b3d484782279df8d09f67cbaeaeCA58977285cff4c9230ebac28bd2d9de'.toLowerCase(), edition: 'V5 EN', sourceStatus: 'read-and-page-checked' };
const pdfRef = (printedPage, section, clauses = []) => ({ ...V5, printedPage, section, clauses });
const talentDescriptions = Object.fromEntries(['talent-bless', 'talent-invoke', 'talent-holy-hatred'].map(id => {
 const row = snapshot.talents.entries.find(item => item.id === id);
 if (!row?.description) throw new Error(`Talent description missing from reference snapshot: ${id}`);
 return [id, row.description];
}));
const talentRows = Object.fromEntries(['talent-bless', 'talent-invoke', 'talent-holy-hatred'].map(id => [id, snapshot.talents.entries.find(item => item.id === id)]));
const enc = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
if(V5.fileSha256.length!==64)throw new Error('V5 PDF SHA-256 must contain 64 hex characters');
const canonicalL06=divineCorpus.books?.find(book=>book.id==='L06');
if(!canonicalL06||canonicalL06.sha256!==V5.fileSha256||wrathConditionReading.sourceRefs.some(ref=>ref.fileSha256!==canonicalL06.sha256)||wrathConditionRules.some(rule=>rule.source.fileSha256!==canonicalL06.sha256))throw new Error('Courroux condition source hash differs from the canonical L06 corpus manifest.');
const csvRows = snapshot.magic.miracles;
if (!Array.isArray(csvRows) || csvRows.length !== 15) throw new Error(`Expected 15 catalogue miracles; got ${csvRows?.length}`);
const byName = new Map(csvRows.map(row => [row.nom, row]));
const sourceSix = new Map([
 ['Appel à la Fureur', { canonicalName:"Fury's Call", printedPage:224, summary:'Les alliés dans la zone gagnent Frénésie.', delta:'Écart : l’entrée catalogue décrit une Haine psychologique contre les ennemis qui engagent; V5 accorde Frénésie aux alliés dans la zone.', params:{range:{kind:'self'},targets:{kind:'area',characteristicBonus:'Soc',unit:'yards'},duration:{kind:'characteristic-bonus',characteristic:'Soc',unit:'rounds'}}, status:'manual', effect:null }],
 ['Bouclier de Myrmidia', { canonicalName:'Shield of Myrmidia', printedPage:224, summary:'Vous et les alliés à portée gagnent +1 PA à toutes les Localisations pendant le miracle.', delta:'Écart de paramètres : l’entrée catalogue utilise mètres et Bonus d’Intelligence; V5 utilise Sociabilité en yards et son Bonus pour les cibles.', params:{range:{kind:'characteristic',characteristic:'Soc',unit:'yards'},targets:{kind:'characteristic-bonus',characteristic:'Soc',unit:'allies'},duration:{kind:'characteristic-bonus',characteristic:'Soc',unit:'rounds'}}, status:'implemented', effect:{type:'armor-bonus',value:1,locations:'all',duration:{kind:'characteristic-bonus',characteristic:'Soc',unit:'rounds'}} }],
 ['Inspirant', { canonicalName:'Inspiring', printedPage:224, summary:'Les alliés dans la zone gagnent le talent Drillé.', delta:'Écart : le catalogue accorde Coude-à-coude; V5 accorde le talent Drillé.', params:{range:{kind:'self'},targets:{kind:'area',characteristicBonus:'Soc',unit:'yards'},duration:{kind:'characteristic-bonus',characteristic:'Soc',unit:'rounds'}}, status:'manual', effect:null }],
 ['Lance de Myrmidia', { canonicalName:'Spear of Myrmidia', printedPage:224, summary:'Votre lance gagne la qualité Dévastatrice et est considérée comme Magique.', delta:'Écart : le catalogue indique Percutante; V5 indique Dévastatrice.', params:{range:{kind:'self'},targets:{kind:'self'},duration:{kind:'characteristic-bonus',characteristic:'Soc',unit:'rounds'}}, status:'manual', effect:null }],
 ['Œil de l’aigle', { canonicalName:"Eagle's Eye", printedPage:224, summary:'Un aigle spectral d’apparence et aux capacités normales apparaît; intangible, il ne peut pas affecter physiquement le monde et il est invulnérable. Perception 55, Sens aiguisé (Vue), Vol 80. Vous utilisez ses capacités à la place des vôtres : vous contrôlez son vol et voyez par ses yeux, sans voir par les vôtres pendant cette utilisation, ce qui vous laisse potentiellement vulnérable.', delta:'Écart : le catalogue indique un aigle ordinaire sans profil détaillé; V5 précise un aigle spectral aux capacités normales, intangible, incapable d’affecter physiquement le monde et invulnérable, avec Perception 55, Sens aiguisé (Vue) et Vol 80. Le prêtre utilise les capacités de l’aigle à la place des siennes, contrôle son vol et voit par ses yeux, sans voir par les siens pendant l’utilisation, ce qui le laisse potentiellement vulnérable.', params:{range:{kind:'characteristic',characteristic:'Soc',unit:'yards'},targets:{kind:'self'},duration:{kind:'characteristic-bonus',characteristic:'Soc',unit:'rounds'}}, status:'manual', effect:null }],
 ['Soleil flamboyant', { canonicalName:'Blazing Sun', printedPage:224, summary:'Les créatures non-Myrmidiennes qui vous regardent gagnent Aveuglé, +1 état par tranche de +2 DR.', delta:'Écart de paramètres : l’entrée catalogue simplifie portée/cible en Vous et zone; V5 indique Special pour les deux.', params:{range:{kind:'special'},targets:{kind:'special'},duration:{kind:'instant'}}, status:'implemented', effect:{type:'condition',key:'Blinded',level:1,conditionRecovery:{event:'end-of-target-turn',unless:'lasting-source'},targetRules:['non-Myrmidian','looking-at-priest'],perSuccessLevels:{every:2,add:1}} }]
]);
const upInArmsSha256 = '0671b27d0e947c7c5387fd4b30cda0512f9182dc811cc0275a18acc96af5fa07';
const sourceUpInArmsNine = new Map([
 ['Commander la Légion', 'Command the Legion'],
 ["Effrayer l'Ennemi", 'Dismay Foe'],
 ['En Bon Ordre', 'In Good Order'],
 ['Connaître son Ennemi', 'Know Your Enemy'],
 ['Sur un Terrain Mortel', 'On Deadly Ground'],
 ['Attaque Rapide', 'Quick Strike'],
 ['Dévotion de la Guerrière', 'Shieldmaiden’s Devotion'],
 ['Compétence Martiale', 'Skill of Combat'],
 ['Vindicte Vengeresse', 'Vengeful Wrath']
].map(([catalogueName, canonicalName]) => [catalogueName, {
 canonicalName,
 source: { document: 'Up in arms.pdf', fileSha256: upInArmsSha256, edition: 'V4', sourceStatus: 'found-adaptation-blocked', printedPage: 79, section: canonicalName },
 sourceDelta: 'Source V4 retrouvée dans Up in Arms p.79; adaptation V4 vers V5 non réalisée et contrat maintenu bloqué.',
 status: 'blocked',
 params: { range: { kind: 'catalogue-only' }, targets: { kind: 'catalogue-only' }, duration: { kind: 'catalogue-only' } },
 effect: null
}]));
const commonPrayerRules = [
 { id: 'prayer-skill', text: 'Prière (Soc) est une compétence avancée. La formule d’un test de bénédiction ou miracle est Intermédiaire (+0 DR).', source: pdfRef(113, 'Compétence Prière'), mode: 'resolved' },
 { id: 'prayer-access', text: 'Béni permet les bénédictions du culte; Invocation permet les miracles du culte. Béni manifeste les six bénédictions listées pour le culte. Invocation donne un miracle appris, les suivants coûtent selon le nombre connu. Une identité de culte et la prière connue doivent être prouvées.', source: { ...V5, printedPage: [116, 121], section: 'Talents Béni et Invocation', clauses: ['talent-bless', 'talent-invoke'] }, mode: 'engine-gated' },
 { id: 'prayer-success', text: 'Succès: appliquer la prière; échec: aucun effet; maladresse: Colère des dieux.', source: pdfRef(217, 'Les Prières'), mode: 'engine-gated' },
 { id: 'prayer-voice', text: 'Le prêtre doit pouvoir parler; intonation faible ou sans conviction peut augmenter la difficulté à la discrétion du MJ.', source: pdfRef(217, 'Restrictions'), mode: 'manual' },
 { id: 'prayer-repeat', text: 'Une prière identique par personnage ne peut rester active qu’une fois; attendre sa fin avant de la relancer. Des lancements de la même prière par différentes personnes ne cumulent pas leurs bonus.', source: pdfRef(217, 'Restrictions'), mode: 'engine-gated' },
 { id: 'blessing-scaling', text: 'Par tranche de +2 DR, choisir portée +6 yards, +1 cible ou durée +6 rounds; options répétables; une durée instantanée ne peut pas être prolongée.', source: pdfRef(220, 'Degrés de réussite des bénédictions'), mode: 'engine-gated' },
 { id: 'miracle-scaling', text: 'Par tranche de +2 DR, ajouter à la portée, au nombre de cibles ou à la durée la valeur initiale correspondante. Si portée et cible sont toutes deux Vous, aucune hausse de portée ou cibles; une durée Instant ne peut pas augmenter. D’autres gains par DR ne sont appliqués que s’ils sont explicitement écrits dans le miracle.', source: pdfRef(222, 'Degrés de réussite des miracles'), mode: 'engine-gated' },
 { id: 'sin-points', text: 'Le MJ attribue un ou plusieurs Points de Péché en cas de violation des commandements; le total n’a pas de maximum. Déterminer le fait, le culte et la gravité reste MJ.', source: pdfRef(217, 'Points de Péché'), mode: 'manual' },
 { id: 'wrath-trigger', text: 'Chaque test de Prière déclenche la Colère si le chiffre des unités du jet est inférieur ou égal au total de Péché, même avec succès; une maladresse déclenche aussi la Colère.', source: pdfRef(218, 'Péché et Colère divine'), mode: 'engine-gated' },
 { id: 'wrath-resolution', text: 'Lancer d100 sur la table, ajouter +10 par Point de Péché, puis après application du résultat retirer 1 Point de Péché (minimum zéro). Les effets fictionnels/permanents et décisions MJ ne sont pas automatisés sans données et validation.', source: { ...V5, printedPage: [218, 219], section: 'Tableau de la Colère des dieux' }, mode: 'manual' },
 { id: 'divine-overuse', text: 'Le MJ peut attribuer typiquement 1 à 3 Points de Péché pour des usages répétés de bénédictions/miracles dans une même scène, sur la même blessure/cible ou situations similaires.', source: pdfRef(220, 'Option : Petits soucis'), mode: 'manual' }
];
const blessingSpecs = [
 {name:'Bataille', key:'battle', effect:{type:'characteristic-modifier',characteristic:'CC',value:10}, label:'La cible gagne +10 en Capacité de Combat.'},
 {name:'Conscience', key:'conscience', effect:null, label:'Pour rompre un commandement, test de Calme Accessible (+2 DR); en cas d’échec, honte et Action non effectuée.'},
 {name:'Courage', key:'courage', effect:{type:'characteristic-modifier',characteristic:'FM',value:10}, label:'La cible gagne +10 en Force Mentale.'},
 {name:'Chance', key:'fortune', effect:null, label:'La cible peut relancer son prochain Test échoué; le nouveau résultat tient.'},
 {name:'Protection', key:'protection', effect:null, label:'Pour attaquer la cible, chaque ennemi doit réussir un test de Calme Accessible (+2 DR); sinon il choisit une autre cible ou Action.'},
 {name:'Droiture', key:'righteousness', effect:null, label:'L’arme de la cible est considérée comme Magique.'}
];
const blessingAccess = { cult: 'Myrmidia', source: pdfRef(220, 'Bénédictions par culte'), requiredTalent: { id: 'talent-bless', catalogueTalentId: 'talent-42_e9_6e_69_20_28_4d_79_6d_69_64_69_61_29', name: 'Béni (Myrmidia)', specialization: 'Myrmidia' } };
const blessings = blessingSpecs.map(row => ({
 id:`divine:blessing:myrmidia:${row.key}`, type:'blessing', name:`Bénédiction de ${row.name}`, deity:'Myrmidia', catalogueName:`Bénédiction de ${row.name}`, status:row.effect?'implemented':'manual', source:pdfRef(221, `Bénédiction de ${row.name}`), sourceReceipt:{...pdfRef(221, `Bénédiction de ${row.name}`), accessSource:{...blessingAccess.source}, catalogueSnapshotSha256:snapshotHash}, requiredTalent:blessingAccess.requiredTalent, requiredKnownPrayer:false,
 params:{range:{kind:'fixed',value:6,unit:'yards'},targets:{kind:'count',value:1},duration:{kind:'fixed',value:6,unit:'rounds'}},
 extensions:[{everySuccessLevels:2,choices:[{range:{add:6,unit:'yards'}},{targets:{add:1}},{duration:{add:6,unit:'rounds'}}],repeatable:true,instantDurationCannotIncrease:true}],
 effects:row.effect?[{...row.effect,duration:{value:6,unit:'rounds'}}]:[], labels:{effect:row.label,access:'Béni (Myrmidia)'}, clauses:[{id:'pray-test',mode:'engine',sourceRef:'prayer-success'},{id:'effect',mode:row.effect?'engine':'manual',sourceRef:`blessing:${row.key}`}], needsInput:[]
}));
const miracleContracts = csvRows.map(entry => {
 const identified = sourceSix.get(entry.nom);
 const supplemental = sourceUpInArmsNine.get(entry.nom);
 const source = identified ? pdfRef(identified.printedPage, `Miracles de Myrmidia - ${identified.canonicalName}`) : supplemental ? supplemental.source : { ...V5, printedPage: null, section: 'Source d’origine non retrouvée dans le livre de base V5 EN v2; entrée du catalogue local seulement', sourceStatus: 'not-found' };
 const effect = identified?.effect ? (identified.canonicalName==='Blazing Sun' ? {...identified.effect} : {...identified.effect,duration:{value:null,sourceParameter:'params.duration',unit:'rounds',requiresResolvedExpiry:true}}) : null;
 const sourceFound = Boolean(identified || supplemental);
 const status = identified?.status ?? supplemental?.status ?? 'blocked';
 const sourceDelta = identified?.delta ?? supplemental?.sourceDelta ?? 'Source V5 EN non retrouvée dans les documents examinés; le texte catalogue reste à vérifier.';
 const params = identified?.params ?? supplemental?.params ?? {range:{kind:'catalogue-only',sourceText:entry.portee},targets:{kind:'catalogue-only',sourceText:entry.cible},duration:{kind:'catalogue-only',sourceText:entry.duree}};
 const canonicalName = identified?.canonicalName ?? supplemental?.canonicalName ?? null;
 const contractSourceHash = identified ? V5.fileSha256 : supplemental ? upInArmsSha256 : null;
 const clauses = [{id:'catalogue-entry',mode:sourceFound?'source-checked':'blocked',sourceRef:supplemental?'up-in-arms-p79':'local-catalogue'},{id:'effect',mode:identified?.status==='implemented'?'engine':identified?'manual':'blocked',sourceRef:identified?`v5-${enc(identified.canonicalName)}`:supplemental?`v4-${enc(supplemental.canonicalName)}`:'source-not-found'}];
 const needsInput = identified ? [] : supplemental ? ['v5-adaptation'] : ['original-source'];
 const extensions = identified?.canonicalName==='Blazing Sun'?[{everySuccessLevels:2,choices:[],targetRules:['non-Myrmidian','looking-at-priest'],automaticEffectProgression:true}]:identified?([{everySuccessLevels:2,choices:[{range:{addBaseValue:true}},{targets:{addBaseValue:true}},{duration:{addBaseValue:true}}],sourceRef:'miracle-scaling',repeatable:true,restrictions:{youAndYouCannotIncreaseRangeOrTargets:true,instantDurationCannotIncrease:true}}]):[];
 const labels = {canonicalName:canonicalName??entry.nom,effect:identified?.summary??entry.effet,sourceStatus:identified?'V5 base source checked':supplemental?'V4 source found; V5 adaptation blocked':'source not found'};
 return {
  id:`divine:miracle:${enc(entry.nom)}`, type:'miracle', name:entry.nom, catalogueName:entry.nom, canonicalName, deity:'Myrmidia', status, source,
  sourceReceipt:{catalogueCsvSha256:csvHash,referenceSnapshotSha256:snapshotHash,catalogueSnapshotVersion:snapshot.contentVersion,sourceBookSha256:contractSourceHash},
  catalogueEntry:{nom:entry.nom,portee:entry.portee,cible:entry.cible,duree:entry.duree,effet:entry.effet},
  requiredTalent:{id:'talent-invoke',catalogueTalentId:'talent-49_6e_76_6f_63_61_74_69_6f_6e_20_28_4d_79_72_6d_69_64_69_61_29',name:'Invocation (Myrmidia)',specialization:'Myrmidia'}, requiredKnownPrayer:true, sourceDelta,
  params,
  extensions,
  effects:effect?[effect]:[], targetRules:identified?.canonicalName==='Blazing Sun'?['non-Myrmidian','looking-at-priest']:[], labels, clauses, needsInput
 };
});
const hatred = {id:'divine:talent:holy-hatred',type:'talent',name:'Haine sacrée',catalogueName:'Haine sacrée',deity:null,status:'manual',source:{...V5,printedPage:120,section:'Haine sacrée'},sourceReceipt:{referenceSnapshotSha256:snapshotHash,talentId:'talent-holy-hatred',description:talentDescriptions['talent-holy-hatred']},requiredTalent:{id:'talent-holy-hatred'},params:{},extensions:[],effects:[{type:'damage-bonus',value:2,when:'miracle-inflicts-wounds'}],labels:{effect:talentDescriptions['talent-holy-hatred']},clauses:[{id:'miracle-damage-bonus',mode:'manual',sourceRef:'talent-holy-hatred'}],needsInput:['miracle-damage-hook']};
const wrathRanges=[
 [1,5,'Visions sacrées','Visions; test de Calme Accessible (+2 DR), échec: 1 Sonné.'],[6,10,'Pensez à vos actes','Les tests de Prière réussis plafonnent à +0 DR pendant une semaine.'],[11,15,'Leçons divines','-1 DR à Prière pendant 1d10 + Points de Péché rounds.'],[16,20,'Prouvez votre dévotion','À terre; cet état ne peut pas être retiré avant un succès de Prière Accessible (+2 DR).'],[21,25,'Patience épuisée','Aucun test de Prière pendant 1d10 rounds.'],[26,30,'Vous ne comprenez pas','-1 DR aux compétences associées au dieu (MJ) pendant 1d10 + Péché heures.'],[31,35,'Manque de foi','Aucun test de Prière pendant 1d10 + Péché rounds.'],[36,40,'Partagez ma douleur','1 + Péché Blessures ignorant BE/PA; Endurance Accessible (+2 DR) ou Sonné.'],[41,45,'Cause indigne','Alliés à terre; les bénédictions/miracles du dieu qui les ciblent échouent pendant 1d10 + Péché jours.'],[46,50,'Cessez vos babillages','Aucun test de Prière pendant 2d10 + Péché rounds.'],[51,55,'Ressentez ma colère','1d10 + Péché Blessures; Endurance Intermédiaire (+0 DR) ou Sonné.'],[56,60,'Je ne vous aiderai pas','-1 DR à une compétence associée au dieu (MJ) pendant 1d10 + Péché jours.'],[61,65,'Blessures divines','1 + Péché états Hémorragique.'],[66,70,'Frappé de cécité','À terre et 3 états Aveuglé; succès d’un test de Prière Intermédiaire (+0 DR) retire 1 + DR états Aveuglé.'],[71,75,'Que sacrifierez-vous ?','1d10 + Péché Blessures ignorant BE/PA; Endurance Difficile (-1 DR) ou Sonné.'],[76,80,'Vous avez péché','Prier devient l’Action pendant 1d10 + Péché rounds.'],[81,87,'Purifiez la chair','2d10 + Péché Blessures ignorant BE/PA; Endurance Difficile (-2 DR), échec: Sonné +1 par -1 DR.'],[88,88,'Interférence démoniaque','Un démon inférieur apparaît à 2d10 yards et attaque la cible la plus proche.'],[89,95,'Craignez ma colère','1 + Péché états Brisé.'],[96,100,'Faites pénitence','Une pénitence est requise.'],[101,105,'Châtiment','0 Blessures puis Inconscient; ne peut être retiré avant de récupérer au moins 1 Blessure.'],[106,110,'N’invoquez pas mon nom','Perte de Béni et Invocation pendant 1d10 + Péché jours.'],[111,115,'Vanités retirées','Tous les objets pris; chaque pénitence rend un objet magique pris, si applicable.'],[116,120,'Vous abusez de ma miséricorde','Perte de Béni et Invocation pendant 2d10 + Péché jours.'],[121,125,'Contemplez vos fautes','À la prochaine récupération de Chance, ne gagner qu’1 point.'],[126,130,'Foudre et flammes','0 Blessures puis Enflammé.'],[131,135,'Souffrez comme moi','1 + Péché états Hémorragique chaque matin jusqu’à pénitence.'],[136,140,'Excommunication','Les talents Béni et Invocation sont perdus pendant deux pénitences; la pénitence 1 restitue Béni, la pénitence 2 restitue Invocation. Le culte est averti; tests sociaux Très Difficiles (-3 DR), sans bonus positif.'],[141,145,'Prouvez votre valeur','Un Serviteur divin apparaît à 1d100 yards et agit selon le dieu.'],[146,150,'Je vous rejette','Perte permanente de Béni, Invocation et toutes les avances de Prière; culte averti, tests sociaux Très Difficiles (-3 DR), sans bonus positif.'],[151,null,'Rendez des comptes','Jugement divin; sans Point de Destin, ne revient jamais. En dépensant un Point de Destin, revient au choix du MJ et subit Je vous rejette.']
];
const wrathTable=wrathRanges.map(([min,max,label,reminder])=>({id:`wrath:${min}-${max??'plus'}`,min,max,label,reminder,source:{...V5,printedPage:min>100?219:218,section:'Colère des dieux'}}));
if(thinkOverYourDeeds.wrathRange.min!==6||thinkOverYourDeeds.wrathRange.max!==10||imperialWeek.value!==8||imperialWeek.unit!=='days'
 ||heedMyLessons.wrathRange.min!==11||heedMyLessons.wrathRange.max!==15||heedMyLessons.amount!==-1
 ||heedMyLessons.duration.die!=='1d10'||heedMyLessons.duration.additive!=='sin-points-before-decrement'
 ||heedMyLessons.duration.unit!=='rounds'||!heedMyLessons.roundPolicy.currentRoundCountsAsFirst
 ||heedMyLessons.roundPolicy.expiryPhase!=='endOfRound'||heedMyLessons.roundPolicy.expiryMoment!=='afterEffects')throw new Error('Source calendrier de Courroux incohérente.');
const prayerSLRules=[{id:'wrath:6-10:pray-sl-cap',type:'prayer-sl-cap',ruleVersion:1,cap:0,
 source:{...V5,printedPage:thinkOverYourDeeds.sourceRef.printedPage,section:'Colère des dieux'},
 sourceReceipt:{ruleId:'wrath:6-10:pray-sl-cap',sourceRefs:[thinkOverYourDeeds.sourceRef,...imperialWeek.sourceRefs],
  rule:{wrathRange:{...thinkOverYourDeeds.wrathRange},successLevelsMaximum:thinkOverYourDeeds.successLevelsMaximum,application:thinkOverYourDeeds.application},
  duration:{sourceValue:thinkOverYourDeeds.duration.value,sourceUnit:thinkOverYourDeeds.duration.unit,days:imperialWeek.value,conversionPolicyId:'imperial-week-8-days',secondPolicyId:'campaign-day-86400s',seconds:imperialWeek.value*86400},
  evidencePath:'docs/divin/sources/DIVIN_L06_CALENDRIER_CONTROLE.md'}},
 {id:'wrath:11-15:pray-sl-modifier',type:'prayer-sl-modifier',ruleVersion:1,amount:heedMyLessons.amount,
  source:{...V5,printedPage:heedMyLessons.sourceRef.printedPage,section:'Colère des dieux'},
  roundPolicy:{...heedMyLessons.roundPolicy},
  sourceReceipt:{ruleId:'wrath:11-15:pray-sl-modifier',sourceRefs:[heedMyLessons.sourceRef,...heedMyLessons.mechanicsSourceRefs],
   rule:{wrathRange:{...heedMyLessons.wrathRange},skill:heedMyLessons.skill,amount:heedMyLessons.amount,application:heedMyLessons.application},
   duration:{die:heedMyLessons.duration.die,additive:heedMyLessons.duration.additive,unit:heedMyLessons.duration.unit},
   temporalLimits:heedMyLessons.temporalLimits,
   evidencePath:heedMyLessons.evidencePath}}];
const wrathConditionContracts=wrathConditionRules.map(rule=>({
 ...rule,source:{...V5,printedPage:218,section:'Colère des dieux'},
 sourceReceipt:{ruleId:rule.id,sourceRefs:[{...rule.source},...wrathConditionReading.sourceRefs.map(ref=>({...ref}))],
  resultId:rule.resultId,conditions:rule.conditions,application:{sinTiming:'before-decrement',order:'apply-then-decrement'},
  evidencePath:'docs/divin/sources/L06-wrath-conditions-readings.mjs'}
}));
const contracts=[...blessings,...miracleContracts,hatred];
const catalogueDeltas=miracleContracts.filter(row=>sourceSix.has(row.catalogueName)).map(row=>({id:row.id,catalogueEntry:row.catalogueEntry,v5Summary:row.sourceDelta,status:row.status,source:row.source}));
const payload={schemaVersion:1,generatorVersion:'divine-contracts-0.1.0',catalogueSnapshotVersion:snapshot.contentVersion,sourceManifest:{referenceSnapshotSha256:snapshotHash,miraclesCsvSha256:csvHash,v5EnglishBaseSha256:V5.fileSha256,authoritativeEdition:'V5 EN'},sourceTalentDescriptions:talentDescriptions,sourceTalentRecords:talentRows,commonPrayerRules,wrathTable,prayerSLRules,wrathConditionRules:wrathConditionContracts,catalogueDeltas,contracts};
const sourceFingerprint = createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex');
const result={...payload,sourceFingerprint:`sha256:${sourceFingerprint}`};
const registryText=JSON.stringify(result,null,2)+'\n';
const miraclesSupplementSourceFound = miracleContracts.filter(row => sourceUpInArmsNine.has(row.catalogueName)).length;
const miraclesSourceFound = sourceSix.size + miraclesSupplementSourceFound;
const inventory={schemaVersion:1,sourceFingerprint:result.sourceFingerprint,counts:{blessings:blessings.length,miracles:miracleContracts.length,miraclesSourceFound,miraclesSourceNotFound:miracleContracts.length-miraclesSourceFound,miraclesV5SourceFound:sourceSix.size,miraclesSupplementSourceFound,miraclesV4AdaptationBlocked:miraclesSupplementSourceFound,talents:1},items:contracts.map(({id,type,name,deity,status,source,sourceReceipt,catalogueEntry,requiredTalent,params,extensions,effects,labels,clauses,needsInput})=>({id,type,name,deity,status,source,sourceReceipt,catalogueEntry,requiredTalent,params,extensions,effects,labels,clauses,needsInput}))};
const inventoryText=JSON.stringify(inventory,null,2)+'\n';
if(process.argv.includes('--check')){
 for(const [path,expected] of [['js/data/v5-divine-contracts.json',registryText],['docs/divin/DIVIN_INVENTAIRE.json',inventoryText]]){
  const actual=readFileSync(path,'utf8');
  if(actual!==expected)throw new Error(`Generated output is stale: ${path}`);
 }
 console.log('Divin registry and inventory are current.');
}else{
 writeFileSync('js/data/v5-divine-contracts.json',registryText);
 writeFileSync('docs/divin/DIVIN_INVENTAIRE.json',inventoryText);
 console.log(JSON.stringify(inventory.counts));
}
