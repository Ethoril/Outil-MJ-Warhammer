import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { source as prayerSource } from '../docs/divin/sources/L06-prayers.mjs';
import { imperialWeek, thinkOverYourDeeds, heedMyLessons } from '../docs/divin/sources/L06-calendar-readings.mjs';
import { wrathConditionReading, wrathConditionRules } from '../docs/divin/sources/L06-wrath-conditions-readings.mjs';
import { paramKinds, paramUnits, supplementCults, targetRuleFacts } from '../js/core/v5-divine-grammar.js';
import { validateEffect } from '../js/core/v5-divine-effect-handlers.js';

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
// Livres ajoutés après la fermeture du corpus de 17 PDF : ils n'entrent ni dans son décompte ni dans l'audit page à page.
const complementText = readFileSync('docs/divin/DIVIN_CORPUS_LIVRES_COMPLEMENT.json', 'utf8');
const complementHash = createHash('sha256').update(complementText, 'utf8').digest('hex');
const knownBooks = [...divineCorpus.books, ...JSON.parse(complementText).books];
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
 ['Appel à la Fureur', { canonicalName:"Fury's Call", printedPage:224, summary:'Les alliés dans la zone reçoivent le Trait de créature Frénésie (p.358).', delta:'Écart : l’entrée catalogue décrit une Haine psychologique contre les ennemis qui engagent; V5 accorde aux alliés dans la zone le Trait de créature Frénésie (p.358), non le Talent. Le moteur pose le Talent Frénésie, de règle équivalente (Test de Force Mentale pour entrer en Frénésie).', params:{range:{kind:'self'},targets:{kind:'area',characteristicBonus:'Soc',unit:'yards'},duration:{kind:'characteristic-bonus',characteristic:'Soc',unit:'rounds'}}, status:'assisted', effect:{type:'grant-talent',talents:[{id:'talent-frenzy',name:'Frénésie',rank:1}]} }],
 ['Bouclier de Myrmidia', { canonicalName:'Shield of Myrmidia', printedPage:224, summary:'Vous et les alliés à portée gagnent +1 PA à toutes les Localisations pendant le miracle.', delta:'Écart de paramètres : l’entrée catalogue utilise mètres et Bonus d’Intelligence; V5 utilise Sociabilité en yards et son Bonus pour les cibles.', params:{range:{kind:'characteristic',characteristic:'Soc',unit:'yards'},targets:{kind:'characteristic-bonus',characteristic:'Soc',unit:'allies'},duration:{kind:'characteristic-bonus',characteristic:'Soc',unit:'rounds'}}, status:'implemented', effect:{type:'armor-bonus',value:1,locations:'all',duration:{kind:'characteristic-bonus',characteristic:'Soc',unit:'rounds'}} }],
 ['Inspirant', { canonicalName:'Inspiring', printedPage:224, summary:'Les alliés dans la zone gagnent le talent Drillé.', delta:'Écart : le catalogue accorde Coude-à-coude; V5 accorde le talent Drillé.', params:{range:{kind:'self'},targets:{kind:'area',characteristicBonus:'Soc',unit:'yards'},duration:{kind:'characteristic-bonus',characteristic:'Soc',unit:'rounds'}}, status:'assisted', effect:{type:'grant-talent',talents:[{id:'talent-drilled',name:'Coude-à-coude',rank:1}]} }],
 ['Lance de Myrmidia', { canonicalName:'Spear of Myrmidia', printedPage:224, summary:'Votre lance gagne la qualité Dévastatrice et est considérée comme Magique.', delta:'Écart : le catalogue indique Percutante; V5 indique Dévastatrice.', params:{range:{kind:'self'},targets:{kind:'self'},duration:{kind:'characteristic-bonus',characteristic:'Soc',unit:'rounds'}}, status:'assisted', effect:{type:'weapon-bonus',magical:true,qualities:['devastatrice'],designatedWeapon:true,weaponClass:'lance'} }],
 ['Œil de l’aigle', { canonicalName:"Eagle's Eye", printedPage:224, summary:'Un aigle spectral d’apparence et aux capacités normales apparaît; intangible, il ne peut pas affecter physiquement le monde et il est invulnérable. Perception 55, Sens aiguisé (Vue), Vol 80. Vous utilisez ses capacités à la place des vôtres : vous contrôlez son vol et voyez par ses yeux, sans voir par les vôtres pendant cette utilisation, ce qui vous laisse potentiellement vulnérable.', delta:'Écart : le catalogue indique un aigle ordinaire sans profil détaillé; V5 précise un aigle spectral aux capacités normales, intangible, incapable d’affecter physiquement le monde et invulnérable, avec Perception 55, Sens aiguisé (Vue) et Vol 80. Le prêtre utilise les capacités de l’aigle à la place des siennes, contrôle son vol et voit par ses yeux, sans voir par les siens pendant l’utilisation, ce qui le laisse potentiellement vulnérable.', params:{range:{kind:'characteristic',characteristic:'Soc',unit:'yards'},targets:{kind:'self'},duration:{kind:'characteristic-bonus',characteristic:'Soc',unit:'rounds'}}, status:'assisted', effect:{type:'summon-creature',appliesTo:'caster',kind:'sensor',name:'Aigle spectral',traits:['Perception 55','Sens aiguisé (Vue)','Vol (80)','Intangible','Invulnérable']},
  clauses:[{id:'summon-eagle',mode:'engine',text:'Le moteur crée l’aigle spectral comme simple capteur : aucun participant dans l’ordre du combat, ni initiative ni action, invulnérable, avec Perception 55, Sens aiguisé (Vue), Vol 80 et intangible (arbitrage MJ).'},{id:'eagle-control',mode:'manual',text:'Le prêtre contrôle le vol de l’aigle : le MJ suit ses instructions de déplacement.'},{id:'eagle-sight',mode:'manual',text:'Rappel : le prêtre voit par les yeux de l’aigle et utilise ses capacités à la place des siennes, sans voir par les siens pendant l’utilisation, ce qui le laisse potentiellement vulnérable.'},{id:'eagle-intangible',mode:'manual',text:'L’aigle est intangible : il ne peut pas affecter physiquement le monde.'},{id:'end',mode:'engine',text:'L’aigle disparaît à la fin de la durée (Bonus de Sociabilité rounds), à l’expiration ou à la fin de la prière, ou à la mort du prêtre.'}] }],
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
const cults = Object.keys(prayerSource.blessingsByCult);
// Cultes acceptés pour les miracles de module : les dix cultes du livre de base et les cultes de supplément.
const miracleCults = [...cults, ...supplementCults];
const catalogueTalentId = name => `talent-${[...name].map(char => char.charCodeAt(0).toString(16)).join('_')}`;
// The published Béni (Myrmidia) alias reads "Mymidia" (missing "r"); kept verbatim because the six Myrmidia blessings must not change.
const publishedBlessedMyrmidiaAlias = 'talent-42_e9_6e_69_20_28_4d_79_6d_69_64_69_61_29';
const cultTalent = (talent, cult) => { const name = `${talent} (${cult})`; return { id: talent === 'Béni' ? 'talent-bless' : 'talent-invoke', catalogueTalentId: talent === 'Béni' && cult === 'Myrmidia' ? publishedBlessedMyrmidiaAlias : catalogueTalentId(name), name, specialization: cult }; };
if (cultTalent('Invocation', 'Myrmidia').catalogueTalentId !== 'talent-49_6e_76_6f_63_61_74_69_6f_6e_20_28_4d_79_72_6d_69_64_69_61_29') throw new Error('Talent alias derivation differs from the published Myrmidia alias.');
const statBlessing = (characteristic, label) => ({ effect: { type: 'characteristic-modifier', characteristic, value: 10 }, label: `La cible gagne +10 en ${label}.` });
const blessingLibrary = {
 battle: { name: 'Bataille', ...statBlessing('CC', 'Capacité de Combat') },
 breath: { name: 'Souffle', effect: null, label: 'La cible n’a plus besoin de respirer et ignore les règles d’Étouffement.' },
 charisma: { name: 'Charisme', ...statBlessing('Soc', 'Sociabilité') },
 conscience: { name: 'Conscience', effect: null, label: 'Pour rompre un commandement, test de Calme Accessible (+2 DR); en cas d’échec, honte et Action non effectuée.' },
 courage: { name: 'Courage', ...statBlessing('FM', 'Force Mentale') },
 finesse: { name: 'Finesse', ...statBlessing('Dex', 'Dextérité') },
 fortune: { name: 'Chance', effect: { type: 'free-reroll' }, label: 'La cible peut relancer gratuitement (sans Point de Chance) son prochain Test échoué; le nouveau résultat tient. Relance offerte seulement si le Test d’origine est un échec, une seule fois pendant la durée.' },
 grace: { name: 'Grâce', ...statBlessing('Ag', 'Agilité') },
 hardiness: { name: 'Vigueur', ...statBlessing('E', 'Endurance') },
 healing: { name: 'Guérison', effect: { type: 'wound-heal', value: 1 }, label: 'La cible regagne 1 Blessure.', touch: true, instant: true },
 hunt: { name: 'La Chasse', ...statBlessing('CT', 'Capacité de Tir') },
 might: { name: 'Puissance', ...statBlessing('F', 'Force') },
 protection: { name: 'Protection', effect: null, label: 'Pour attaquer la cible, chaque ennemi doit réussir un test de Calme Accessible (+2 DR); sinon il choisit une autre cible ou Action.' },
 recuperation: { name: 'Convalescence', effect: null, label: 'La cible réduit d’un jour la durée d’une maladie; une seule tentative par maladie et par personne.', touch: true, instant: true },
 righteousness: { name: 'Droiture', effect: { type: 'weapon-bonus', magical: true, designatedWeapon: true, weaponOwner: 'target' }, label: 'L’arme de la cible est considérée comme Magique.' },
 savagery: { name: 'Sauvagerie', effect: { type: 'grant-talent', talents: [{ id: 'talent-strike-to-injure', rank: 1 }], consumeOn: 'critical' }, label: 'Au prochain Coup Critique infligé par la cible, lancer deux fois et garder le meilleur résultat.' },
 tenacity: { name: 'Ténacité', effect: { type: 'remove-condition', chosen: true, amount: 1, excludeKeys: ['souille'] }, label: 'La cible retire 1 État choisi (sauf Souillé et les États verrouillés).', instant: true },
 wisdom: { name: 'Sagesse', ...statBlessing('Int', 'Intelligence') },
 wit: { name: 'Vivacité', ...statBlessing('I', 'Initiative') }
};
const blessingKey = english => english === 'The Hunt' ? 'hunt' : english.toLowerCase();
const blessingAccess = { source: pdfRef(220, 'Bénédictions par culte') };
// Livre de supplément : document, empreinte et pagination viennent du manifeste (corpus de 17 livres ou complément).
// Le document et l'empreinte identifient le livre; `bookId` d'un module est une étiquette libre (ex. « AotE3 »), vérifiée seulement si elle égale un identifiant du manifeste.
const findBook = ({ bookId, fileSha256, document }) => knownBooks.find(book => (fileSha256 === undefined || book.sha256 === String(fileSha256).toLowerCase()) && (document === undefined || book.file === document) && (fileSha256 !== undefined || document !== undefined) && (!knownBooks.some(other => other.id === bookId) || book.id === bookId));
const supplementRef = (book, edition, sourceStatus = 'read-and-page-checked') => ({ document: book.file, fileSha256: book.sha256, edition, sourceStatus });
const archivesOfTheEmpire3 = knownBooks.find(book => book.id === 'L02');
const archivesOfTheEmpire3Edition = 'V4 EN (crédits p.3 : Warhammer Fantasy Roleplay 4th Edition, © Games Workshop 2023)';
if (archivesOfTheEmpire3?.file !== 'Archives of the Empire 3.pdf') throw new Error('Archives of the Empire 3 est absent du manifeste de corpus.');
// Règles propres à un culte, reprises en rappel (`reminders`) et en clause manuelle de chaque prière du culte.
const cultRules = {
 Solkan: { id: 'solkan-purity', sourceRef: 'archives-of-the-empire-3-p55', text: 'Solkan n’accepte aucune Bénédiction ni aucun Miracle d’un prêtre qui a des Points de Péché ou de Corruption (Archives of the Empire 3, p. 55) : le MJ vérifie les deux avant la Prière.' }
};
const withCultRule = contract => {
 const rule = cultRules[contract.deity];
 return rule ? { ...contract, reminders: [rule.text], clauses: [...contract.clauses, { id: rule.id, mode: 'manual', text: rule.text, sourceRef: rule.sourceRef }] } : contract;
};
const blessingContract = (cult, key, origin = null) => {
 const row = blessingLibrary[key];
 if (!row) throw new Error(`Bénédiction inconnue dans la bibliothèque du générateur : ${key}`);
 const instant = row.instant === true;
 const requiredTalent = cultTalent('Béni', cult);
 // Livre de base : p.221 (effet) et p.220 (accès). Supplément : page du culte (accès et liste) ; l'effet reste celui de la p.221 V5.
 const section = `Bénédiction de ${row.name}`;
 const effectSource = pdfRef(221, section);
 const source = origin ? { ...origin.ref, printedPage: origin.printedPage, section: `${section} (${cult})`, clauses: [] } : effectSource;
 const sourceReceipt = origin
  ? { ...source, accessSource: { ...origin.ref, printedPage: origin.printedPage, section: `Bénédictions de ${cult}`, clauses: [] }, effectSource, catalogueSnapshotSha256: snapshotHash }
  : { ...effectSource, accessSource: { ...blessingAccess.source }, catalogueSnapshotSha256: snapshotHash };
 const choices = instant
  ? [...(row.touch ? [] : [{range:{add:6,unit:'yards'}}]), {targets:{add:1}}]
  : [{range:{add:6,unit:'yards'}},{targets:{add:1}},{duration:{add:6,unit:'rounds'}}];
 return {
  id:`divine:blessing:${enc(cult)}:${key}`, type:'blessing', name:`Bénédiction de ${row.name}`, deity:cult, catalogueName:`Bénédiction de ${row.name}`, status:row.effect?'implemented':'manual', source, sourceReceipt, requiredTalent, requiredKnownPrayer:false,
  params:{range:row.touch?{kind:'special',sourceText:'Touch'}:{kind:'fixed',value:6,unit:'yards'},targets:{kind:'count',value:1},duration:instant?{kind:'instant'}:{kind:'fixed',value:6,unit:'rounds'}},
  extensions:[{everySuccessLevels:2,choices,repeatable:true,instantDurationCannotIncrease:true}],
  effects:row.effect?[{...row.effect,duration:instant?{unit:'instant'}:{value:6,unit:'rounds'}}]:[], labels:{effect:row.label,access:requiredTalent.name}, clauses:[{id:'pray-test',mode:'engine',sourceRef:'prayer-success'},{id:'effect',mode:row.effect?'engine':'manual',sourceRef:`blessing:${key}`}], needsInput:[]
 };
};
// Myrmidia first: its six contracts keep their historical position in the registry.
const blessings = [...cults.filter(cult => cult === 'Myrmidia'), ...cults.filter(cult => cult !== 'Myrmidia')]
 .flatMap(cult => prayerSource.blessingsByCult[cult].map(english => blessingContract(cult, blessingKey(english))));
if (blessings.length !== 60 || new Set(blessings.map(row => row.id)).size !== 60) throw new Error('Expected 60 distinct cult blessing associations.');
if (new Set(blessings.map(row => row.id.split(':').pop())).size !== 19) throw new Error('Expected 19 distinct blessing effects.');
// Archives of the Empire 3 : Handrich (p.47) et Solkan (p.55) accèdent à six bénédictions du livre de base (effets identiques, p.221 V5).
const supplementBlessingCults = [
 { cult: 'Handrich', printedPage: 47, english: ['Charisma', 'Fortune', 'Hardiness', 'Protection', 'Wisdom', 'Wit'] },
 { cult: 'Solkan', printedPage: 55, english: ['Battle', 'Conscience', 'Courage', 'Hardiness', 'Might', 'Tenacity'] }
];
const supplementBlessings = supplementBlessingCults.flatMap(({ cult, printedPage, english }) => english.map(name => withCultRule(blessingContract(cult, blessingKey(name), { ref: supplementRef(archivesOfTheEmpire3, archivesOfTheEmpire3Edition), printedPage }))));
if (supplementBlessings.length !== 12 || new Set([...blessings, ...supplementBlessings].map(row => row.id)).size !== 72) throw new Error('Expected 12 distinct supplement blessing associations.');
const catalogueMiracleContracts = csvRows.map(entry => {
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
 const clauses = [{id:'catalogue-entry',mode:sourceFound?'source-checked':'blocked',sourceRef:supplemental?'up-in-arms-p79':'local-catalogue'},{id:'effect',mode:identified?.status==='implemented'?'engine':identified?.status==='assisted'?'assisted':identified?'manual':'blocked',sourceRef:identified?`v5-${enc(identified.canonicalName)}`:supplemental?`v4-${enc(supplemental.canonicalName)}`:'source-not-found'},...(identified?.clauses??[]).map(row=>({...row,sourceRef:`v5-${enc(identified.canonicalName)}`}))];
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
// Miracle modules : docs/divin/sources/miracles/*.mjs, chacun exportant `cult` et `miracles`.
const moduleOverride = process.argv.find(arg => arg.startsWith('--miracle-modules='));
const moduleDirectory = resolve(moduleOverride ? moduleOverride.slice('--miracle-modules='.length) : 'docs/divin/sources/miracles');
// Grammaire (kinds, unités, types d'effet, faits de cible) : js/core/v5-divine-grammar.js, partagée avec le moteur et les tests.
// Seules les règles de targetRuleFacts ont un fait de cible dans le moteur ; tout autre texte de targetRules devient une note (targetNotes), non appliquée.
const moduleStatuses = new Set(['implemented', 'assisted', 'manual', 'blocked']);
const clauseModes = new Set(['engine', 'assisted', 'manual']);
const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const moduleFiles = existsSync(moduleDirectory) ? readdirSync(moduleDirectory).filter(name => name.endsWith('.mjs')).sort() : [];
const loadMiracleModules = async () => {
 const loaded = [];
 for (const file of moduleFiles) loaded.push({ file, ...(await import(pathToFileURL(resolve(moduleDirectory, file)).href)) });
 return loaded;
};
const moduleMiracleContracts = (modules => {
 const fromModules = [];
 const origins = new Map();
 for (const { file, cult, miracles, source: declaredSource, aspect } of modules) {
  const at = (miracle, message) => new Error(`Module miracle ${file} (${miracle?.canonicalName ?? miracle?.name ?? '?'}) : ${message}`);
  if (typeof cult !== 'string' || !miracleCults.includes(cult)) throw new Error(`Module miracle ${file} : \`cult\` doit être l’un de ${miracleCults.join(', ')} (reçu : ${String(cult)}).`);
  if (!Array.isArray(miracles)) throw new Error(`Module miracle ${file} : \`miracles\` doit être un tableau.`);
  if (aspect !== undefined && (typeof aspect !== 'string' || !aspect.trim())) throw new Error(`Module miracle ${file} : \`aspect\` doit être un texte non vide.`);
  // Source facultative : par défaut le livre de base V5 EN v2 (contrats inchangés). Sinon un livre du manifeste (corpus ou complément).
  let book = null, edition = null, sourceStatus = null;
  if (declaredSource !== undefined) {
   const sourceError = message => new Error(`Module miracle ${file} : \`source\` ${message}`);
   if (!isRecord(declaredSource)) throw sourceError('doit être un objet { bookId, document, fileSha256, edition }.');
   const { bookId, document, fileSha256, edition: declaredEdition, sourceStatus: declaredStatus } = declaredSource;
   for (const [key, value] of Object.entries({ bookId, document, fileSha256 })) if (value !== undefined && (typeof value !== 'string' || !value.trim())) throw sourceError(`${key} doit être un texte non vide.`);
   if (document === undefined && fileSha256 === undefined) throw sourceError('doit identifier le livre (document ou fileSha256).');
   book = findBook({ bookId, document, fileSha256 });
   if (!book) throw sourceError(`désigne un livre absent des manifestes DIVIN_CORPUS_LIVRES*.json (${[bookId, document, fileSha256].filter(Boolean).join(' / ')}) ou dont document, empreinte et bookId se contredisent.`);
   if (typeof declaredEdition !== 'string' || !declaredEdition.trim()) throw sourceError('edition est requise (ex. « V4 EN »).');
   if (declaredStatus !== undefined && (typeof declaredStatus !== 'string' || !declaredStatus.trim())) throw sourceError('sourceStatus doit être un texte non vide.');
   if (book.sha256 === V5.fileSha256) { if (declaredEdition !== V5.edition) throw sourceError(`désigne le livre de base : edition doit valoir ${V5.edition}.`); book = null; }
   else { edition = declaredEdition; sourceStatus = declaredStatus ?? 'read-and-page-checked'; }
  }
  const moduleSource = book ? supplementRef(book, edition, sourceStatus) : null;
  for (const miracle of miracles) {
   if (!isRecord(miracle)) throw at(miracle, 'chaque miracle doit être un objet.');
   for (const key of ['name', 'canonicalName', 'summary']) if (typeof miracle[key] !== 'string' || !miracle[key].trim()) throw at(miracle, `${key} doit être un texte non vide.`);
   if (!Number.isSafeInteger(miracle.printedPage) || miracle.printedPage < 1) throw at(miracle, 'printedPage doit être un entier positif.');
   if (!moduleStatuses.has(miracle.status)) throw at(miracle, `status doit être l’un de ${[...moduleStatuses].join(', ')}.`);
   if (!isRecord(miracle.params)) throw at(miracle, 'params est requis.');
   for (const key of ['range', 'targets', 'duration']) {
    const param = miracle.params[key];
    if (!isRecord(param) || !paramKinds.has(param.kind)) throw at(miracle, `params.${key}.kind doit être l’un de ${[...paramKinds].join(', ')}.`);
    if (['fixed', 'count'].includes(param.kind) && !Number.isSafeInteger(param.value)) throw at(miracle, `params.${key}.value doit être un entier.`);
    if (['characteristic', 'characteristic-bonus'].includes(param.kind) && typeof param.characteristic !== 'string') throw at(miracle, `params.${key}.characteristic est requis.`);
    if (param.kind === 'area' && (typeof param.characteristicBonus === 'string') === (typeof param.characteristic === 'string')) throw at(miracle, `params.${key}.characteristicBonus (Bonus) ou characteristic (valeur entière) est requis, pas les deux.`);
    if (param.kind === 'touch' && key !== 'range') throw at(miracle, `params.${key}.kind touch est réservé à la portée.`);
    if (param.unit !== undefined && !paramUnits.has(param.unit)) throw at(miracle, `params.${key}.unit doit être l’un de ${[...paramUnits].join(', ')}.`);
   }
   if (miracle.effect != null && miracle.effects != null) throw at(miracle, 'effect et effects sont exclusifs.');
   const declared = miracle.effects ?? (miracle.effect ? [miracle.effect] : []);
   if (!Array.isArray(declared)) throw at(miracle, 'effects doit être un tableau.');
   if (['implemented', 'assisted'].includes(miracle.status) && !declared.length) throw at(miracle, `status ${miracle.status} exige au moins un effet.`);
   // Un miracle manual/blocked peut porter un effet structuré : le moteur ne l’applique que si status vaut implemented ou assisted.
   for (const effect of declared) {
    const effectProblem = validateEffect(effect);
    if (effectProblem) throw at(miracle, effectProblem);
   }
   const targetRules = miracle.targetRules ?? [];
   if (!Array.isArray(targetRules) || targetRules.some(rule => typeof rule !== 'string' || !rule.trim())) throw at(miracle, 'targetRules doit être un tableau de textes.');
   const needsInput = miracle.needsInput ?? [];
   if (!Array.isArray(needsInput) || needsInput.some(row => !isRecord(row) || typeof row.id !== 'string' || typeof row.text !== 'string')) throw at(miracle, 'needsInput doit être un tableau de { id, text }.');
   const clauses = miracle.clauses ?? [];
   if (!Array.isArray(clauses) || clauses.some(row => !isRecord(row) || typeof row.id !== 'string' || !clauseModes.has(row.mode) || typeof row.text !== 'string')) throw at(miracle, `clauses doit être un tableau de { id, mode (${[...clauseModes].join('|')}), text }.`);
   if (miracle.sourceDelta !== undefined && typeof miracle.sourceDelta !== 'string') throw at(miracle, 'sourceDelta doit être un texte.');
   if (miracle.extensions !== undefined && !Array.isArray(miracle.extensions)) throw at(miracle, 'extensions doit être un tableau.');
   if (cult === 'Myrmidia' && [...sourceSix.values()].some(row => row.canonicalName === miracle.canonicalName)) throw at(miracle, 'déjà défini par le livre de base Myrmidia du générateur.');
   const id = `divine:miracle:${enc(cult)}:${enc(miracle.canonicalName)}`;
   const previous = origins.get(id);
   if (previous) throw at(miracle, `identifiant dupliqué ${id}` + (previous.file === file ? '.' : previous.base !== !book
    ? ` : ce miracle est déjà présent dans ${previous.base ? 'le livre de base' : 'un supplément'} (module ${previous.file}).`
    : ` (déjà défini par le module ${previous.file}).`));
   origins.set(id, { file, base: !book });
   const duration = miracle.params.duration;
   const defaultDuration = duration.kind === 'instant' ? { unit: 'instant' } : { value: null, sourceParameter: 'params.duration', unit: duration.unit ?? 'rounds', requiresResolvedExpiry: true };
   const section = `Miracles de ${cult} - ${miracle.canonicalName}`;
   fromModules.push(withCultRule({
    id, type: 'miracle', name: miracle.name, catalogueName: miracle.name, canonicalName: miracle.canonicalName, deity: cult, ...(aspect === undefined ? {} : { aspect: aspect.trim() }), status: miracle.status,
    source: book ? { ...moduleSource, printedPage: miracle.printedPage, section, clauses: [] } : pdfRef(miracle.printedPage, section),
    sourceReceipt: { referenceSnapshotSha256: snapshotHash, catalogueSnapshotVersion: snapshot.contentVersion, sourceBookSha256: book ? book.sha256 : V5.fileSha256, ...(book ? { sourceBookId: book.id, sourceDocument: book.file, sourceEdition: edition } : {}) },
    requiredTalent: cultTalent('Invocation', cult), requiredKnownPrayer: true, sourceDelta: miracle.sourceDelta ?? null,
    params: structuredClone(miracle.params),
    extensions: miracle.extensions ? structuredClone(miracle.extensions) : [{ everySuccessLevels: 2, choices: [{ range: { addBaseValue: true } }, { targets: { addBaseValue: true } }, { duration: { addBaseValue: true } }], sourceRef: 'miracle-scaling', repeatable: true, restrictions: { youAndYouCannotIncreaseRangeOrTargets: true, instantDurationCannotIncrease: true } }],
    effects: declared.map(effect => ({ ...structuredClone(effect), duration: effect.duration ? structuredClone(effect.duration) : defaultDuration })),
    targetRules: targetRules.filter(rule => targetRuleFacts.has(rule)), ...(targetRules.some(rule => !targetRuleFacts.has(rule)) ? { targetNotes: targetRules.filter(rule => !targetRuleFacts.has(rule)) } : {}), labels: { canonicalName: miracle.canonicalName, effect: miracle.summary, sourceStatus: book ? `${edition} supplement ${book.id} source checked` : 'V5 base source checked' },
    clauses: clauses.map(row => ({ id: row.id, mode: row.mode, text: row.text, sourceRef: `v5-${enc(miracle.canonicalName)}` })),
    needsInput: needsInput.map(row => ({ field: row.id, label: row.text }))
   }));
  }
 }
 return fromModules;
})(await loadMiracleModules());
// Les neuf miracles d'Up in Arms (sourceUpInArmsNine) : un module Myrmidia de même canonicalName REMPLACE le contrat bloqué du catalogue,
// avec le même id, la même entrée de catalogue et le même reçu (compatibilité), sans doublon ; sans module, le contrat reste bloqué.
const upInArmsModules = new Map(moduleMiracleContracts.filter(row => row.deity === 'Myrmidia' && row.source.fileSha256 === upInArmsSha256 && [...sourceUpInArmsNine.values()].some(entry => entry.canonicalName === row.canonicalName)).map(row => [row.canonicalName, row]));
const miracleContracts = catalogueMiracleContracts.map(row => {
 const module = sourceUpInArmsNine.has(row.catalogueName) ? upInArmsModules.get(row.canonicalName) : null;
 if (!module) return row;
 return { ...module, id: row.id, name: row.name, catalogueName: row.catalogueName, sourceReceipt: row.sourceReceipt, catalogueEntry: row.catalogueEntry, clauses: [{ id: 'catalogue-entry', mode: 'source-checked', sourceRef: 'up-in-arms-p79' }, ...module.clauses] };
});
const standaloneModuleContracts = moduleMiracleContracts.filter(row => !upInArmsModules.has(row.canonicalName) || upInArmsModules.get(row.canonicalName) !== row);
const hatred = {id:'divine:talent:holy-hatred',type:'talent',name:'Haine sacrée',catalogueName:'Haine sacrée',deity:null,status:'implemented',source:{...V5,printedPage:120,section:'Haine sacrée'},sourceReceipt:{referenceSnapshotSha256:snapshotHash,talentId:'talent-holy-hatred',description:talentDescriptions['talent-holy-hatred']},requiredTalent:{id:'talent-holy-hatred'},params:{},extensions:[],effects:[{type:'damage-bonus',value:2,when:'miracle-inflicts-wounds'}],labels:{effect:talentDescriptions['talent-holy-hatred']},clauses:[{id:'miracle-damage-bonus',mode:'engine',sourceRef:'talent-holy-hatred'}],needsInput:[]};
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
// Livres de supplément réellement cités par un contrat (bénédictions de culte, modules de miracles) : le moteur n'accepte que ceux-là hors livre de base.
const bySource=(rows,key)=>Object.fromEntries([...rows.reduce((map,row)=>map.set(key(row),(map.get(key(row))||0)+1),new Map())].sort(([a],[b])=>a<b?-1:a>b?1:0));
const bookOf=row=>knownBooks.find(book=>book.sha256===row.source.fileSha256);
const supplementBooks=[...new Map([...supplementBlessings,...miracleContracts,...standaloneModuleContracts].filter(row=>row.source.fileSha256!==V5.fileSha256).map(row=>[bookOf(row).id,{bookId:bookOf(row).id,document:row.source.document,fileSha256:row.source.fileSha256}])).values()].sort((a,b)=>a.bookId<b.bookId?-1:1);
const contracts=[...blessings,...supplementBlessings,...miracleContracts,...standaloneModuleContracts,hatred];
const catalogueDeltas=[...miracleContracts.filter(row=>sourceSix.has(row.catalogueName)||upInArmsModules.has(row.canonicalName)),...standaloneModuleContracts.filter(row=>row.sourceDelta)].map(row=>({id:row.id,catalogueEntry:row.catalogueEntry??null,v5Summary:row.sourceDelta,status:row.status,source:row.source}));
const payload={schemaVersion:1,generatorVersion:'divine-contracts-0.4.0',catalogueSnapshotVersion:snapshot.contentVersion,sourceManifest:{referenceSnapshotSha256:snapshotHash,miraclesCsvSha256:csvHash,v5EnglishBaseSha256:V5.fileSha256,authoritativeEdition:'V5 EN',complementCorpusSha256:complementHash,supplementBooks},sourceTalentDescriptions:talentDescriptions,sourceTalentRecords:talentRows,commonPrayerRules,wrathTable,prayerSLRules,wrathConditionRules:wrathConditionContracts,catalogueDeltas,contracts};
const sourceFingerprint = createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex');
const result={...payload,sourceFingerprint:`sha256:${sourceFingerprint}`};
const registryText=JSON.stringify(result,null,2)+'\n';
const miraclesSupplementSourceFound = miracleContracts.filter(row => sourceUpInArmsNine.has(row.catalogueName)).length;
const miraclesSourceFound = sourceSix.size + miraclesSupplementSourceFound;
const moduleBook=row=>row.source.fileSha256===V5.fileSha256?'L06':bookOf(row).id;
const inventory={schemaVersion:1,sourceFingerprint:result.sourceFingerprint,counts:{blessings:blessings.length,miracles:miracleContracts.length,moduleMiracles:standaloneModuleContracts.length,miraclesSourceFound,miraclesSourceNotFound:miracleContracts.length-miraclesSourceFound,miraclesV5SourceFound:sourceSix.size,miraclesSupplementSourceFound,miraclesV4AdaptationBlocked:miracleContracts.filter(row=>sourceUpInArmsNine.has(row.catalogueName)&&row.status==='blocked').length,talents:1},
 // Compteurs par livre/culte/aspect : hors de `counts`, dont les clés sont figées par les tests existants.
 sourceCounts:{
  blessingsSupplement:supplementBlessings.length,blessingsTotal:blessings.length+supplementBlessings.length,blessingsByBook:bySource([...blessings,...supplementBlessings],row=>moduleBook(row)),blessingsByCult:bySource([...blessings,...supplementBlessings],row=>row.deity),
  moduleMiraclesByBook:bySource(standaloneModuleContracts,moduleBook),moduleMiraclesByCult:bySource(standaloneModuleContracts,row=>row.deity),moduleMiraclesByAspect:bySource(standaloneModuleContracts.filter(row=>row.aspect),row=>row.aspect),
  miraclesUpInArmsConnected:upInArmsModules.size,upInArmsByStatus:bySource(miracleContracts.filter(row=>sourceUpInArmsNine.has(row.catalogueName)),row=>row.status)},
 notes:[{id:'old-faith-bless',source:{...supplementRef(archivesOfTheEmpire3,archivesOfTheEmpire3Edition),printedPage:58,section:'Priests of the Old Faith'},text:'Bless (Old Faith) ne donne pas six bénédictions fixes : le personnage en choisit six librement; Invoke (Old Faith) n’apprend aucun miracle mais une bénédiction de plus, aux mêmes coûts en PX que les miracles supplémentaires. Aucun contrat généré : choix à la charge du MJ, simple note d’inventaire.'}],
 items:contracts.map(({id,type,name,deity,aspect,status,source,sourceReceipt,catalogueEntry,requiredTalent,params,extensions,effects,labels,clauses,reminders,needsInput})=>({id,type,name,deity,aspect,status,source,sourceReceipt,catalogueEntry,requiredTalent,params,extensions,effects,labels,clauses,reminders,needsInput}))};
const inventoryText=JSON.stringify(inventory,null,2)+'\n';
if(process.argv.includes('--check')){
 for(const [path,expected] of [['js/data/v5-divine-contracts.json',registryText],['docs/divin/DIVIN_INVENTAIRE.json',inventoryText]]){
  const actual=readFileSync(path,'utf8');
  if(actual!==expected)throw new Error(`Generated output is stale: ${path}`);
 }
 console.log('Divin registry and inventory are current.');
}else if(process.argv.includes('--dry-run')){
 console.log(JSON.stringify({counts:inventory.counts,moduleContracts:moduleMiracleContracts}));
}else{
 writeFileSync('js/data/v5-divine-contracts.json',registryText);
 writeFileSync('docs/divin/DIVIN_INVENTAIRE.json',inventoryText);
 console.log(JSON.stringify(inventory.counts));
}
