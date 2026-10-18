/*
 * Source-only L06 commandment and non-human access identities.
 * French summaries are editorial paraphrases, not source text or runtime rules.
 * The 50 identities correspond one-to-one with the five source bullets in each
 * of the ten human cult sections (L06, printed pages 205-214).
 */
const bookId = 'L06';
const fileSha256 = '53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de';

const cults = [
  {
    cultId: 'manann', cult: 'Manann', page: 205, items: [
      { summaryFr: 'En mer ou sur un lieu consacré, s’abstenir de siffler et de jurer.', subClauses: ['Ne pas siffler en mer ou sur un sol sacré.', 'Ne pas jurer en mer ou sur un sol sacré.'] },
      { summaryFr: 'Ne pas porter atteinte aux albatros.', subClauses: ['Ne pas blesser un albatros.'] },
      { summaryFr: 'Consacrer à Manann la première prise.', subClauses: ['La première prise revient à Manann.'] },
      { summaryFr: 'Déposer une pièce d’argent et du poisson dans chaque temple ou sanctuaire de Manann rencontré.', subClauses: ['Une pièce d’argent est associée au don.', 'Du poisson est associé au don.', 'Le lieu mentionné est chaque temple ou sanctuaire de Manann approché.'] },
      { summaryFr: 'Poursuivre les serviteurs de Stromfels partout où ils se cachent.', subClauses: ['Rechercher les serviteurs de Stromfels.', 'La recherche s’étend aux lieux où ils se cachent.'] },
    ],
  },
  {
    cultId: 'morr', cult: 'Morr', page: 206, items: [
      { summaryFr: 'Respecter les morts et veiller à leur protection.', subClauses: ['Respecter les morts.', 'Protéger les morts.'] },
      { summaryFr: 'Traquer nécromanciens et morts-vivants là où ils se rassemblent.', subClauses: ['Traquer les nécromanciens.', 'Traquer les morts-vivants.', 'La consigne vise leurs rassemblements.'] },
      { summaryFr: 'Prêter attention à ses rêves.', subClauses: ['Tenir compte de ses rêves.'] },
      { summaryFr: 'Ne pas refuser de célébrer un service funéraire.', subClauses: ['Ne jamais refuser de conduire un service funéraire.'] },
      { summaryFr: 'Ne pas participer à un relèvement des morts, sauf autorisation de Morr.', subClauses: ['Ne pas prendre part au relèvement des morts.', 'Exception lorsque Morr l’autorise.'] },
    ],
  },
  {
    cultId: 'myrmidia', cult: 'Myrmidia', page: 207, items: [
      { summaryFr: 'Agir avec honneur et dignité en toute circonstance.', subClauses: ['Agir avec honneur.', 'Agir avec dignité.', 'La consigne vaut en toutes matières.'] },
      { summaryFr: 'Respecter les prisonniers de guerre et épargner tout ennemi qui se rend.', subClauses: ['Respecter les prisonniers de guerre.', 'Ne pas tuer un ennemi qui se rend.'] },
      { summaryFr: 'Ne montrer aucune clémence aux ennemis de l’Humanité qui refusent de se repentir.', subClauses: ['La cible est un ennemi de l’Humanité.', 'L’absence de clémence concerne ceux qui ne se repentent pas.'] },
      { summaryFr: 'Obéir aux ordres honorables.', subClauses: ['Suivre les ordres qualifiés d’honorables.'] },
      { summaryFr: 'Préserver les faibles des horreurs de la guerre.', subClauses: ['Protéger les faibles des horreurs de la guerre.'] },
    ],
  },
  {
    cultId: 'ranald', cult: 'Ranald', page: 208, items: [
      { summaryFr: 'Réserver à Ranald une pièce sur dix.', subClauses: ['Un dixième des pièces appartient à Ranald.'] },
      { summaryFr: 'Ne pas livrer autrui aux autorités; la dénonciation est présentée comme le pire des péchés.', subClauses: ['Ne pas trahir une autre personne auprès des autorités.', 'La source qualifie la dénonciation de faute particulièrement grave.'] },
      { summaryFr: 'S’abstenir de violence, sauf pour se défendre.', subClauses: ['La violence est interdite.', 'Exception en cas de défense de soi.'] },
      { summaryFr: 'Préférer mourir libre plutôt que vivre sous l’oppression.', subClauses: ['La liberté est préférée à une vie sous oppression.', 'La formule source oppose liberté et survie sous oppression.'] },
      { summaryFr: 'Reconnaître l’absence d’honneur entre voleurs tout en préservant un honneur propre aux fidèles de Ranald.', subClauses: ['La source nie un honneur commun entre voleurs.', 'Elle affirme un honneur entre Ranaldans.'] },
    ],
  },
  {
    cultId: 'rhya', cult: 'Rhya', page: 209, items: [
      { summaryFr: 'Défendre les familles, les enfants et les cultures contre tout dommage.', subClauses: ['Protéger les familles.', 'Protéger les enfants.', 'Protéger les cultures agricoles.'] },
      { summaryFr: 'Ne pas éprouver de honte pour le corps reçu de Rhya.', subClauses: ['Ne pas avoir honte de son corps.'] },
      { summaryFr: 'Tenir la vie pour sacrée et ne pas nuire, sauf pour protéger une autre vie déjà en danger.', subClauses: ['Ne pas faire de mal.', 'Nuire n’est admis que pour protéger une autre vie déjà en danger.'] },
      { summaryFr: 'Ne pas juger les amours d’autrui.', subClauses: ['Ne pas juger qui une autre personne aime.'] },
      { summaryFr: 'Interrompre l’œuvre du Prince de l’Excès partout où elle menace de se répandre.', subClauses: ['Intervenir contre l’œuvre du Prince de l’Excès.', 'La source étend cette consigne aux endroits où elle peut se manifester.'] },
    ],
  },
  {
    cultId: 'shallya', cult: 'Shallya', page: 210, items: [
      { summaryFr: 'Aider sans jugement, en se fondant uniquement sur le besoin de la personne.', subClauses: ['Prêter assistance sans jugement.', 'La décision d’aider se fonde sur le besoin.'] },
      { summaryFr: 'Ne pas tuer, sauf en légitime défense.', subClauses: ['Ne pas tuer.', 'Exception en cas de défense de soi.'] },
      { summaryFr: 'Combattre la pestilence et ceux qui la propagent.', subClauses: ['Ne pas laisser prospérer la pestilence.', 'S’opposer à ceux qui la répandent.'] },
      { summaryFr: 'Poursuivre le service de Shallya sans se tourner vers l’indulgence personnelle.', subClauses: ['Le travail de Shallya est continu.', 'Ne pas céder à l’indulgence personnelle.'] },
      { summaryFr: 'Ne pas prendre les armes; une canne et du courage suffisent.', subClauses: ['Ne pas s’armer.', 'La source cite canne et courage comme suffisants.'] },
    ],
  },
  {
    cultId: 'sigmar', cult: 'Sigmar', page: 211, items: [
      { summaryFr: 'Obéir aux ordres.', subClauses: ['Suivre les ordres reçus.'] },
      { summaryFr: 'Aider les nains et ne jamais leur nuire.', subClauses: ['Porter assistance aux nains.', 'Ne pas leur faire de mal.'] },
      { summaryFr: 'Promouvoir l’unité de l’Empire.', subClauses: ['Œuvrer à l’unité impériale.'] },
      { summaryFr: 'Rester loyal au trône impérial.', subClauses: ['Maintenir une allégeance fidèle au trône impérial.'] },
      { summaryFr: 'Éradiquer sans clémence les orques et gobelins, les adorateurs du Chaos et les sorciers malfaisants visés par la source.', subClauses: ['Cibler orques et gobelins.', 'Cibler les adorateurs du Chaos.', 'Cibler les “foul witches” de la source.', 'La source demande l’absence de clémence.'] },
    ],
  },
  {
    cultId: 'taal', cult: 'Taal', page: 212, items: [
      { summaryFr: 'Rendre grâce pour chaque animal prélevé.', subClauses: ['Une prière de remerciement est associée à chaque animal pris.'] },
      { summaryFr: 'Passer chaque année une semaine seul à communier avec la nature sauvage.', subClauses: ['La période dure une semaine.', 'Elle revient chaque année.', 'Le fidèle la passe seul dans la nature sauvage.'] },
      { summaryFr: 'Éviter l’armure métallique et se vêtir des peaux de Taal.', subClauses: ['Écarter l’armure de métal.', 'Porter les peaux de Taal.'] },
      { summaryFr: 'S’en remettre à sa propre compétence plutôt qu’aux progrès de la poudre à canon ou de la technologie froide.', subClauses: ['Se fier à sa compétence.', 'Ne pas se reposer sur les armes à poudre ou la technologie froide.'] },
      { summaryFr: 'Ne pas blesser un animal, sauf pour se défendre, se nourrir ou offrir un sacrifice.', subClauses: ['Ne pas faire de mal aux animaux.', 'Exceptions : défense de soi, nourriture ou sacrifice.'] },
    ],
  },
  {
    cultId: 'ulric', cult: 'Ulric', page: 213, items: [
      { summaryFr: 'Obéir à ses supérieurs.', subClauses: ['Suivre les personnes placées au-dessus de soi.'] },
      { summaryFr: 'Défendre son honneur et ne pas refuser un défi.', subClauses: ['Défendre son honneur.', 'Ne jamais refuser un défi.'] },
      { summaryFr: 'Rester honnête; hors embuscade, s’interdire ruse et tromperie.', subClauses: ['Se montrer honnête et droit.', 'L’embuscade est l’exception mentionnée.', 'Hors de cette exception, ruse et tromperie sont interdites.'] },
      { summaryFr: 'Ne porter que des peaux de loups tués avec des armes fabriquées de ses propres mains.', subClauses: ['Les peaux portées proviennent de loups tués.', 'Les armes utilisées pour les tuer ont été fabriquées par le fidèle.'] },
      { summaryFr: 'Ne pas considérer les armes à poudre noire comme convenant à un fidèle d’Ulric.', subClauses: ['Les armes à poudre noire sont déclarées impropres aux fidèles d’Ulric.'] },
    ],
  },
  {
    cultId: 'verena', cult: 'Verena', page: 214, items: [
      { summaryFr: 'Ne pas refuser l’arbitrage d’un différend lorsqu’on le demande.', subClauses: ['Accepter d’arbitrer lorsqu’une demande est faite.'] },
      { summaryFr: 'Dire la vérité sans crainte ni favoritisme.', subClauses: ['Dire la vérité.', 'Ne pas la retenir par peur ni la déformer par faveur.'] },
      { summaryFr: 'Protéger le savoir à tout prix.', subClauses: ['Préserver le savoir sans réserve.'] },
      { summaryFr: 'Ne combattre qu’en dernier recours, après épuisement des autres voies.', subClauses: ['Le combat est un dernier recours.', 'Les voies alternatives doivent être infructueuses.'] },
      { summaryFr: 'Ne pas devenir un instrument de l’injustice ou de l’hérésie.', subClauses: ['Ne pas servir l’injustice.', 'Ne pas servir l’hérésie.'] },
    ],
  },
];

const unresolved = reason => ({ status: 'unresolved', reason });

export const strictureIdentities = cults.flatMap(({ cultId, cult, page, items }) =>
  items.map((item, index) => ({
    id: `L06:stricture:${cultId}:${String(index + 1).padStart(2, '0')}`,
    bookId,
    canonicalName: `${cult} stricture ${String(index + 1).padStart(2, '0')}`,
    frenchName: unresolved('Le numéro de commandement est un repère éditorial local; la source ne donne pas de nom propre à chaque puce.'),
    aliases: unresolved('Aucun alias propre à cette puce n’est établi dans cette tranche.'),
    tradition: cult,
    actorKinds: unresolved('Les détenteurs, exceptions par type d’acteur et conséquences d’une violation nécessitent d’autres règles ou décisions.'),
    category: 'stricture',
    sourceRefs: [{ bookId, fileSha256, physicalPage: page, printedPage: page, section: `The Cult of ${cult} — Strictures, item ${index + 1}` }],
    status: 'source-read',
    recordCompleteness: 'partial-e1',
    unresolvedFields: ['frenchName', 'aliases', 'actorKinds', 'violation-consequence', 'development', 'execution'],
    summaryFr: item.summaryFr,
    subClauses: item.subClauses.map((summaryFr, subIndex) => ({ id: `part-${subIndex + 1}`, summaryFr })),
    notRuntimeRule: true,
  }))
);

const accessRules = [
  {
    id: 'L06:common-rule:access:dwarf-ancestor-gods',
    canonicalName: 'Dwarf ancestor-god priest access',
    frenchSummary: 'Pour un nain voué aux dieux ancêtres, la source écarte les carrières Nun, Priest et Warrior Priest pour cette relation; elle recommande de choisir une carrière appropriée qui imite le dieu. Grimnir est illustré par Slayer/Cult of the Slayer ou Soldier.',
    section: 'Dwarf Priests',
  },
  {
    id: 'L06:common-rule:access:elven-priests',
    canonicalName: 'Elven priest access',
    frenchSummary: 'Les hauts elfes et elfes sylvains ont des prêtres, mais pas de Blessings ni de Miracles; la représentation proposée passe par la carrière Wizard et un Lore adapté au dieu, avec plusieurs exemples dans la source.',
    section: 'Elven Priests',
  },
  {
    id: 'L06:common-rule:access:halfling-priests',
    canonicalName: 'Halfling priest access',
    frenchSummary: 'La source dit que les halflings n’ont pas vraiment de prêtres ni de temples et qu’ils n’en font pas une carrière consacrée à un seul dieu; lorsqu’une divinité doit être apaisée, un ancien local peut agir pour la communauté après consultation.',
    section: 'Halfling Priests',
  },
];

export const nonHumanAccessIdentities = accessRules.map(rule => ({
  id: rule.id,
  bookId,
  canonicalName: rule.canonicalName,
  frenchName: unresolved('Le nom anglais est un intitulé éditorial de registre, pas un nom propre donné par la source.'),
  aliases: unresolved('Aucun alias n’est établi dans cette tranche.'),
  tradition: 'non-human',
  actorKinds: rule.id.endsWith('dwarf-ancestor-gods') ? ['dwarf']
    : rule.id.endsWith('elven-priests') ? ['high-elf', 'wood-elf'] : ['halfling'],
  category: 'common-rule',
  sourceRefs: [{ bookId, fileSha256, physicalPage: 215, printedPage: 215, section: rule.section }],
  status: 'source-read',
  recordCompleteness: 'partial-e1',
  unresolvedFields: ['frenchName', 'aliases', 'access-resolution', 'development', 'execution'],
  summaryFr: rule.frenchSummary,
  relatedIdentityIds: ['L06:common-rule:little-prayers'],
  relationshipNote: 'Lien de contexte pour la représentation des prêtres; il ne confère ni ne retire d’autre accès que les formulations explicites résumées ici.',
  notRuntimeRule: true,
}));

// This is the shape consumed by the E1 audit identity pipeline. It remains a
// source inventory; none of these records is a runtime contract or certification.
const auditIdentityKeys = ['id', 'bookId', 'canonicalName', 'frenchName', 'aliases', 'tradition', 'actorKinds', 'category', 'sourceRefs', 'status', 'recordCompleteness', 'unresolvedFields'];
export const auditIdentities = [...strictureIdentities, ...nonHumanAccessIdentities]
  .map(identity => Object.fromEntries(auditIdentityKeys.map(key => [key, identity[key]])));

export const sourceMeta = {
  bookId,
  fileSha256,
  sourceTitle: 'Livre de base V5 EN v2',
  sourceFile: 'Livre de base V5 EN v2.pdf',
  sourcePages: 'printed pages 203 and 205-216',
  readingEvidence: 'DIVIN_L06_COMMANDEMENTS_LECTEUR.md',
  counts: { strictureIdentities: strictureIdentities.length, nonHumanAccessIdentities: nonHumanAccessIdentities.length },
  exclusions: [
    'Page 204: table of primary cults and offerings; not a stricture or an automatic cost rule.',
    'Page 216: comparative offering table; no mandatory price, debit, or universal prayer cost is inferred.',
    'Page 215 halfling passage: no blanket prohibition on all divine effects is inferred.',
    'Little Prayers p.203: existing identity L06:common-rule:little-prayers is referenced, not duplicated or expanded here.',
    'No violation penalty, automatic test, timer, or runtime effect is created from these pages.',
  ],
};
