// Combat naturel des créatures (lot T2) : Morsure, Cornes, Attaque caudale, Piétinement, Tentacules, Langue, Constricteur, Toile,
// Étreinte glaciale, Souffle, Vomissement, Hurlement fantomatique, Regard pétrifiant, armes naturelles V4.
// Module pur : lit les Traits (texte « Nom (précision) », noms anglais ou français) et rend un plan (coût en Élan, quota, conditions,
// dégâts, effets proposés) sans rien écrire. Les effets que le moteur ne calcule pas restent en rappel, jamais présentés comme faits.

import { strengthBonusOf } from './damage.js';

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const MOMENTUM = Object.freeze({ resource: 'momentum', amount: 1 });

// `bf` : supplément de dégâts (BF + n) ; `rating` : les dégâts sont la Valeur du Trait (BF inclus, « Bite (7) » ou « Bite (Strength Bonus + 1) »),
// à défaut de valeur le chiffre imprimé de l'attaque du profil est la Valeur V5.
const RULES = {
  bite: { fr: 'Morsure', names: ['bite', 'morsure'], cost: MOMENTUM, rating: true, test: 'CC', note: 'Livre de base V5 p.356 : les dégâts valent la Valeur du Trait, Bonus de Force déjà inclus.' },
  horns: { fr: 'Cornes', names: ['horns', 'cornes'], requires: 'charge', bf: 4, test: 'CC', note: 'Une Charge permet une attaque gratuite des cornes (BF+4).' },
  tail: { fr: 'Attaque caudale', names: ['tail', 'attaque caudale'], cost: MOMENTUM, bf: 2, test: 'CC', smallerEffect: 'À terre', note: 'Une cible plus petite blessée devient À terre.' },
  stomp: { fr: 'Piétinement', names: ['stomp', 'pietinement'], cost: MOMENTUM, bf: 0, test: 'CC', skill: 'Corps à corps (Bagarre)', smallerOnly: true, note: 'Attaque de Bagarre contre une créature plus petite.' },
  tentacles: { fr: 'Tentacules', names: ['tentacles', 'tentacules'], bf: 0, test: 'CC', perDetail: true, effect: 'Enchevêtré', note: 'Une attaque gratuite par tentacule ; les dégâts peuvent donner Enchevêtré puis une empoignade.' },
  tongue: { fr: 'Langue préhensile', names: ['tongue', 'langue', 'langue prehensile'], cost: MOMENTUM, bf: 0, test: 'CT', ranged: true, pullsSmaller: true, onHit: 'Enchevêtré', note: 'Si l\'attaque touche : un Enchevêtré, et la cible plus petite est attirée au contact ; choix : libérer, attaque supplémentaire ou empoignade.' },
  constrictor: { fr: 'Constricteur', names: ['constrictor', 'constricteur'], onHit: 'Enchevêtré', note: 'Toute touche donne Enchevêtré, puis une empoignade est possible.' },
  web: { fr: 'Toile', names: ['web', 'toile'], onHit: 'Enchevêtré', entangleFromDetail: true, note: 'Une touche donne un Enchevêtré dont la Force est la valeur du Trait.' },
  chill: { fr: 'Étreinte glaciale', names: ['chill grasp', 'etreinte glaciale'], cost: MOMENTUM, test: 'CC', opposed: 'Esquive ou Corps à corps', direct: '1d10+DR', magical: true, note: 'CC opposée ; 1d10 + DR Blessures directes ; attaque magique.' },
  breath: { fr: 'Souffle', names: ['breath', 'souffle'], area: true, test: 'CT', fallbackTest: 30, opposed: 'Esquive', magical: true, note: 'Attaque gratuite de zone, portée 20 + BE ; CT (ou 30 si absente) ; Esquive par cible ; l\'émetteur résiste à son propre souffle.' },
  vomit: { fr: 'Vomissement', names: ['vomit', 'vomissement'], area: true, test: 'CT', opposed: 'Esquive', costsAction: true, note: 'Consomme Mouvement et Action s\'il commence engagé ; CT +4 DR contre l\'Esquive de chaque cible à deux yards ; dégâts BE+4, Sonné, objets dégradés ; délai de douze heures.' },
  howl: { fr: 'Hurlement fantomatique', names: ['ghostly howl', 'hurlement fantomatique'], cost: MOMENTUM, oncePerTurn: true, area: true, note: 'Vivants à portée : trois Assourdi, d10 Blessures directes, Calme +2 DR ou Brisé ; critiques à la tête.' },
  gaze: { fr: 'Regard pétrifiant', names: ['petrifying gaze', 'regard petrifiant'], cost: MOMENTUM, test: 'CT', opposed: 'Initiative', note: 'CT opposée à l\'Initiative (ou Langue Magique du mage) ; Sonné selon la marge, pétrification à six DR.' }
};

// Souffle par type (livre de base p.357) : dégâts = Bonus de Force (F) ou d'Endurance (E) + `add`, état donné aux cibles perdantes.
const BREATH_TYPES = {
  acid: { fr: 'Acide', names: ['acid', 'acide'], stat: 'E', add: 4, reminder: 'Armes et armures portées par les cibles perdantes : 1 dégât.' },
  cold: { fr: 'Froid', names: ['cold', 'froid'], stat: 'F', add: 2, state: 'Fatigué', reminder: 'Fatigué : les cibles frappent en dernier au Round, et leurs adversaires ont +1 DR pour se défendre contre elles.' },
  electricity: { fr: 'Électricité', names: ['electricity', 'electricite', 'foudre'], stat: 'F', add: 2, state: 'Sonné', reminder: 'Les dégâts ignorent l\'armure de métal.' },
  fire: { fr: 'Feu', names: ['fire', 'feu'], stat: 'F', add: 3, state: 'Enflammé' },
  poison: { fr: 'Poison', names: ['poison'], stat: 'E', add: 2, state: 'Empoisonné' },
  smoke: { fr: 'Fumée', names: ['smoke', 'fumee'], reminder: 'Pas de dégâts : la zone se remplit de fumée, bloque la ligne de vue et cause l\'Asphyxie pendant BE Rounds.' }
};
const BREATH_BY_NAME = new Map(Object.entries(BREATH_TYPES).flatMap(([key, type]) => type.names.map(name => [name, key])));
const bonusOf = value => (Number.isFinite(Number(value)) && value !== null && value !== '' ? Math.floor(Number(value) / 10) : null);

const BY_NAME = new Map(Object.entries(RULES).flatMap(([key, rule]) => rule.names.map(name => [name, key])));

// Armes naturelles V4 (« Claws +6 », « Beak +8 », « Slam +n », « Tongue Attack +3 ») : dégâts imprimés déjà complets.
const V4_NATURAL = /^(claws?|beak|slam|tongue attack)\s*([+-]\s*\d+)?$/;

/** « Tentacles (4) » → `{ key: 'tentacles', detail: '4' }` ; `null` si ce n'est pas un Trait de combat naturel. */
export function parseNaturalTrait(trait) {
  const text = typeof trait === 'string' ? trait : trait?.name ?? trait?.nom ?? '';
  const match = /^\s*([^(]+?)\s*(?:\(\s*([^)]*)\s*\))?\s*$/.exec(String(text));
  if (!match) return null;
  const name = fold(match[1]);
  const detail = (match[2] ?? (typeof trait === 'object' ? trait?.param ?? trait?.rating : '') ?? '').toString().trim();
  const key = BY_NAME.get(name);
  if (key) return { key, name: match[1].trim(), detail };
  return V4_NATURAL.test(name) ? { key: 'v4-weapon', name: match[1].trim(), detail } : null;
}

const traitsOf = participant => [
  ...(Array.isArray(participant?.traits) ? participant.traits : []),
  ...(Array.isArray(participant?.extensions?.traits) ? participant.extensions.traits : [])
].map(parseNaturalTrait).filter(Boolean);

/** Combat naturel porté par un participant (un élément par Trait reconnu, sans doublon de clé). */
export function naturalCombatTraits(participant) {
  const seen = new Set();
  return traitsOf(participant).filter(trait => (seen.has(trait.key) ? false : seen.add(trait.key)));
}

/** Vrai si un effet de l'attaque naturelle dépend de la Taille de l'auteur et de la cible (Attaque caudale, Piétinement, Langue). */
export function naturalAttackNeedsSize(key) {
  const rule = RULES[key];
  return Boolean(rule && (rule.smallerEffect || rule.smallerOnly || rule.pullsSmaller));
}

/**
 * Décision du MJ du 23/10 : une attaque ordinaire du profil qui porte le nom d'un Trait d'attaque naturelle que le participant possède
 * (« Bite », « Tail 2 », « Tentacules 3 »…) prend la formule V5 du Trait. Rend la clé du Trait, ou `null` (arme, Trait absent).
 */
export function inferNaturalAttackKey(participant, action) {
  const key = BY_NAME.get(fold(action?.name).replace(/\s*\d+$/, ''));
  if (!key || !['bite', 'horns', 'tail', 'stomp', 'tentacles'].includes(key)) return null;
  return traitsOf(participant).some(trait => trait.key === key) ? key : null;
}

const isZoo =participant => participant?.extensions?.v5?.bestiary?.book === 'L11';

/**
 * Plan d'une capacité de combat naturel. `options` : `charged` (Charge faite), `actorSize` / `targetSize` (rangs de Taille 0-6),
 * `momentum` (le MJ confirme qu'il reste de l'Élan), `used` (nombre d'utilisations déjà faites ce Tour).
 * Rend `{ available, costs, quota, damageFormula, effects, unresolved, reminders, receipt }`.
 */
export function planNaturalAttack(participant, key, options = {}) {
  const rule = RULES[key];
  const owned = rule && traitsOf(participant).find(trait => trait.key === key);
  const plan = { key, label: rule?.fr ?? key, available: false, costs: [], quota: null, damageFormula: null, effects: [], unresolved: [], reminders: [] };
  if (!rule || !owned) { plan.unresolved.push(`${plan.label} : Trait absent du participant.`); return { ...plan, receipt: receiptOf(plan) }; }
  if (isZoo(participant) && ['howl', 'vomit'].includes(key)) plan.reminders.push(`${rule.fr} (Imperial Zoo) : coût en Avantages et résolution propres au Zoo, à appliquer à la main (E0-T-${key === 'howl' ? '090' : '095'}).`);

  const bonus = strengthBonusOf(participant?.caracs);
  if (rule.rating) {
    const detail = String(owned.detail ?? '').trim();
    const plus = /^(?:strength bonus|bonus de force|bf)\s*\+\s*(\d+)$/i.exec(detail);
    if (/^\d+$/.test(detail)) plan.damageFormula = detail;
    else if (plus && bonus !== null) plan.damageFormula = `${bonus + Number(plus[1])}`;
    else plan.damageFormula = 'imprimé';
  } else if (Number.isInteger(rule.bf)) {
    if (bonus === null) plan.unresolved.push(`${rule.fr} : Force du participant inconnue, dégâts BF${rule.bf ? `+${rule.bf}` : ''} à saisir.`);
    else plan.damageFormula = `${bonus + rule.bf}`;
  }
  if (key === 'breath') {
    const printedType = fold(owned.detail);
    const type = BREATH_TYPES[BREATH_BY_NAME.get(printedType) ?? BREATH_BY_NAME.get(printedType.split(/[\s-]+/)[0])];
    if (!type) plan.unresolved.push(`Souffle${owned.detail ? ` (${owned.detail})` : ''} : type absent des cas du livre de base (p.357), dégâts et états à arbitrer à la main.`);
    else if (!type.names.includes(printedType)) plan.reminders.push(`Précision du profil : ${owned.detail}.`);
    plan.reminders.push('Zone : la cible vue à 20 + BE yards et toutes les créatures à BF yards autour d\'elle ; un seul jet de l\'attaquant, opposé à chaque cible.');
    if (type) {
      plan.reminders.push(`Souffle de ${type.fr}${type.add === undefined ? '' : ` : dégâts B${type.stat === 'F' ? 'F' : 'E'}+${type.add}`}.`);
      if (type.reminder) plan.reminders.push(type.reminder);
      if (!type.stat) plan.noDamage = true;
      if (type.stat) {
        const base = type.stat === 'F' ? bonus : bonusOf(participant?.caracs?.E);
        if (base === null) plan.unresolved.push(`Souffle de ${type.fr} : ${type.stat === 'F' ? 'Force' : 'Endurance'} du participant inconnue, dégâts à saisir.`);
        else plan.damageFormula = `${base + type.add}`;
      }
      if (type.state) plan.effects.push({ state: type.state, trigger: 'cible perdante' });
    }
  }
  if (rule.cost) plan.costs.push({ ...rule.cost });
  if (rule.costs) plan.costs.push(...rule.costs);
  if (rule.requires === 'charge' && options.charged !== true) plan.unresolved.push(`${rule.fr} : une Charge est requise.`);
  if (rule.pullsSmaller) {
    // Livre de base p.362 : l'Enchevêtré s'applique quelle que soit la Taille ; seule une cible plus petite est attirée au contact.
    const { actorSize, targetSize } = options;
    if (Number.isInteger(actorSize) && Number.isInteger(targetSize)) plan.reminders.push(actorSize > targetSize ? 'Langue : la cible, plus petite, est attirée au contact.' : 'Langue : la cible n\'est pas plus petite, elle n\'est pas attirée.');
    else plan.reminders.push('Langue : seule une cible plus petite est attirée au contact (Tailles non précisées).');
  }
  if (rule.smallerOnly) {
    const { actorSize, targetSize } = options;
    if (!Number.isInteger(actorSize) || !Number.isInteger(targetSize)) plan.unresolved.push(`${rule.fr} : Tailles de l'auteur et de la cible à préciser.`);
    else if (actorSize <= targetSize) plan.unresolved.push(`${rule.fr} : la cible doit être plus petite que l'auteur.`);
  }
  if (rule.costs?.length || rule.cost) {
    if (options.momentum === false) plan.unresolved.push(`${rule.fr} : plus d'Élan à perdre.`);
  }
  if (rule.oncePerTurn) {
    plan.quota = { id: `creature:${key}`, scope: 'turn', maximum: 1 };
    if ((options.used ?? 0) >= 1) plan.unresolved.push(`${rule.fr} : déjà utilisé ce Tour.`);
  }
  if (rule.perDetail) {
    // « 8 × +9 » (nombre imprimé × valeur) ou « 4 » ; un chiffre signé (« +9 ») est la valeur d'attaque, pas le nombre de tentacules.
    // Sans nombre imprimé (ancien participant « Tentacles (+9) ») : autant d'attaques que d'actions de tentacule du participant.
    const actionCount = (participant?.actions || []).filter(action => BY_NAME.get(fold(action?.name).replace(/\s*\d+$/, '')) === 'tentacles').length;
    const count = /^\d+/.test(owned.detail) ? Number.parseInt(owned.detail, 10) : actionCount || NaN;
    if (!Number.isInteger(count) || count < 1) plan.unresolved.push(`${rule.fr} : nombre de tentacules illisible.`);
    else {
      plan.quota = { id: `creature:${key}`, scope: 'turn', maximum: count };
      if ((options.used ?? 0) >= count) plan.unresolved.push(`${rule.fr} : les ${count} attaques gratuites sont déjà faites ce Tour.`);
    }
  }
  if (rule.onHit) {
    const strength = rule.entangleFromDetail ? Number.parseInt(owned.detail, 10) : null;
    plan.effects.push({ state: rule.onHit, trigger: 'touche', ...(Number.isInteger(strength) ? { strength } : {}) });
    if (rule.entangleFromDetail && !Number.isInteger(strength)) plan.unresolved.push(`${rule.fr} : Force de l'Enchevêtré illisible.`);
  }
  if (rule.smallerEffect) plan.effects.push({ state: rule.smallerEffect, trigger: 'cible plus petite blessée' });
  if (rule.effect) plan.effects.push({ state: rule.effect, trigger: 'dégâts' });
  if (rule.direct) plan.effects.push({ damage: rule.direct, direct: true, trigger: 'touche' });
  if (rule.area) plan.reminders.push('Zone : une opposition par cible (Esquive), à résoudre cible par cible.');
  if (rule.costsAction) plan.reminders.push('Vomissement : consomme Mouvement et Action.');
  if (rule.magical) plan.reminders.push('Attaque magique.');
  plan.reminders.push(rule.note);
  plan.test = rule.test ?? null;
  plan.opposed = rule.opposed ?? null;
  plan.available = plan.unresolved.length === 0;
  return { ...plan, receipt: receiptOf(plan) };
}

/** Plan d'une arme naturelle V4 : dégâts imprimés, attaque ordinaire du profil. */
export function planV4NaturalWeapon(participant) {
  const owned = traitsOf(participant).find(trait => trait.key === 'v4-weapon');
  const plan = { key: 'v4-weapon', label: owned?.name ?? 'Arme naturelle', available: Boolean(owned), costs: [], damageFormula: 'imprimé', effects: [], unresolved: owned ? [] : ['Arme naturelle V4 : Trait absent.'], reminders: ['Arme naturelle V4 : dégâts imprimés complets, traitée comme les autres armes de créature.'] };
  return { ...plan, receipt: receiptOf(plan) };
}

function receiptOf(plan) {
  return {
    ability: plan.label,
    costs: plan.costs.map(cost => `${cost.amount} ${cost.resource === 'momentum' ? 'Élan' : cost.resource}`),
    damage: plan.damageFormula,
    effects: plan.effects.map(effect => effect.state ?? effect.damage),
    blocked: plan.unresolved.slice()
  };
}

/** Rappels de combat naturel d'un participant, sans doublon (affichage de fiche). */
export function naturalCombatReminders(participant) {
  const out = [];
  for (const trait of naturalCombatTraits(participant)) {
    const text = trait.key === 'v4-weapon' ? 'Arme naturelle V4 : dégâts imprimés complets.' : `${RULES[trait.key].fr} : ${RULES[trait.key].note}`;
    if (!out.includes(text)) out.push(text);
  }
  return out;
}
