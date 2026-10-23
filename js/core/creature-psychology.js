// Psychologie des créatures (lot T6) : Peur, Terreur, Effrayé, Animosité, Préjugé, Haine, Belliqueux, Bestial, À Sang-froid, Féroce,
// Frénésie, Affamé, Stupide, Nerveux, Territorial, Immunité Psychologique, Rage.
// Module pur : lit les Traits (texte « Nom (précision) », noms anglais ou français) et rend un plan (états proposés, tests demandés,
// modificateurs, effets, points non résolus, rappels, reçu) sans rien écrire. Peur et Terreur passent par les services de Psychologie.

import { previewGenericFearEncounter, previewGenericTerrorEncounter, isPsychologyImmune } from './v5-talent-psychology.js';
import { traitTargets, traitTargetMatches } from './creature-keywords.js';
import { willpowerBase } from './creature-natures.js';

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const RULES = {
  fear: { fr: 'Peur', names: ['fear', 'peur'], note: 'Peur surnaturelle (indice un si omis) ; le Trait demande de dépasser l\'indice, contrairement au chapitre Psychologie.' },
  terror: { fr: 'Terreur', names: ['terror', 'terreur'], note: 'Premier contact : Psychologie ou Brisé égal à l\'indice plus chaque DR négatif ; Peur de même indice ensuite, quel que soit le résultat.' },
  afraid: { fr: 'Effrayé', names: ['afraid', 'effraye'], note: 'Peur de la cible nommée ; interdit de gagner de l\'Élan et l\'avantage de mêlée de la source jusqu\'au seuil.' },
  animosity: { fr: 'Animosité', names: ['animosity', 'animosite'], note: 'Calme pour se retenir, sinon opposition sociale ou physique à la cible ; +1 DR de Sociabilité contre elle.' },
  prejudice: { fr: 'Préjugé', names: ['prejudice', 'prejuge'], note: 'Aversion envers la cible, selon les règles sociales du socle V4 ; sans effet de règle propre ici.' },
  hatred: { fr: 'Haine', names: ['hatred', 'haine'], note: 'Calme pour se retenir, sinon attaque prioritaire du groupe ; +1 DR en mêlée et au tir contre lui ; immunité à sa Peur et à son Intimidation, pas à sa Terreur.' },
  belligerent: { fr: 'Belliqueux', names: ['belligerent', 'belliqueux'], note: 'Immunité à la Peur tant que la créature possède de l\'Élan (variante Temple of Spite : et aucun Élan adverse).' },
  bestial: { fr: 'Bestial', names: ['bestial'], note: 'Pas de langage rationnel, défense par Esquive ; un feu qui blesse donne Brisé ; sous la moitié des Blessures, fuite ou Frénésie.' },
  coldBlooded: { fr: 'À Sang-froid', names: ['cold-blooded', 'cold blooded', 'a sang-froid', 'a sang froid'], note: 'Avantage aux Tests de Calme ; la première fin normale de Surpris est ignorée.' },
  grim: { fr: 'Féroce', names: ['grim', 'feroce'], note: 'Fin de Tour sans Élan : la créature en gagne un (avec indice : début de Tour, jusqu\'à l\'indice).' },
  frenzy: { fr: 'Frénésie', names: ['frenzy', 'frenesie'], note: 'Volonté pour entrer ; immunité à la Psychologie, une attaque gratuite par Round et +1 dégât ; fin sans ennemi proche, Sonné ou Inconscient, puis Exténué.' },
  hungry: { fr: 'Affamé', names: ['hungry', 'affame'], note: 'Après la mort ou l\'incapacité d\'un vivant, ou un cadavre frais : Calme +2 DR, sinon repas qui consomme le prochain Mouvement et la prochaine Action.' },
  stupid: { fr: 'Stupide', names: ['stupid', 'stupide'], note: 'Guidé par un allié non Stupide ; sinon Intelligence +4 DR au début du Round, un échec prive du Mouvement et de l\'Action.' },
  skittish: { fr: 'Craintif', names: ['skittish', 'craintif', 'nerveux'], note: 'Magie spectaculaire visible ou bruit violent : trois Brisé ; un entraînement Magie ou Guerre apporte ses exceptions.' },
  territorial: { fr: 'Territorial', names: ['territorial'], note: 'Défend son territoire jusqu\'à la mort ; cesse normalement la poursuite à la frontière.' },
  immunePsychology: { fr: 'Immunité Psychologique', names: ['immune to psychology', 'immunite psychologique'], note: 'Ignore les règles de Psychologie ; ne garantit pas l\'immunité aux poisons à procédure similaire.' },
  fury: { fr: 'Rage', names: ['fury', 'rage'], note: 'Un Avantage : Haine des adversaires proches ; trois Avantages : Frénésie, puis perte de tout l\'Avantage.' }
};

const BY_NAME = new Map(Object.entries(RULES).flatMap(([key, rule]) => rule.names.map(name => [name, key])));

/** « Fear (2) » → `{ key: 'fear', name, detail: '2' }` ; `null` si ce n'est pas un Trait de Psychologie. */
export function parsePsychologyTrait(trait) {
  const text = typeof trait === 'string' ? trait : trait?.name ?? trait?.nom ?? '';
  const match = /^\s*([^(]+?)\s*(?:\(\s*([^)]*)\s*\))?\s*$/.exec(String(text));
  if (!match) return null;
  const key = BY_NAME.get(fold(match[1]));
  const detail = (match[2] ?? (typeof trait === 'object' ? trait?.param ?? trait?.rating : '') ?? '').toString().trim();
  return key ? { key, name: match[1].trim(), detail } : null;
}

const traitsOf = participant => [
  ...(Array.isArray(participant?.traits) ? participant.traits : []),
  ...(Array.isArray(participant?.extensions?.traits) ? participant.extensions.traits : [])
].map(parsePsychologyTrait).filter(Boolean);

/** Traits de Psychologie portés par un participant (un élément par clé). */
export function psychologyTraits(participant) {
  const seen = new Set();
  return traitsOf(participant).filter(trait => (seen.has(trait.key) ? false : seen.add(trait.key)));
}

const ratingOf = detail => {
  const value = Number.parseInt(String(detail), 10);
  return Number.isSafeInteger(value) && value >= 1 ? value : null;
};
/** Indice de Peur d'une créature redoutée : saisi par le MJ, sinon celui de son Trait Peur (un si omis) ; `null` sans Peur. */
function fearRatingOf(source, entered) {
  if (Number.isSafeInteger(entered) && entered >= 1) return entered;
  const fear = traitsOf(source).find(trait => trait.key === 'fear');
  return fear ? ratingOf(fear.detail) ?? 1 : null;
}
const bookOf = participant => participant?.extensions?.v5?.bestiary?.book ?? null;
const hasMomentum = participant => participant?.extensions?.v5?.hasMomentum === true;
const NAMES = { hatred: ['hatred', 'haine'], animosity: ['animosity', 'animosite'], prejudice: ['prejudice', 'prejuge'], afraid: ['afraid', 'effraye'] };

/**
 * Plan d'un Trait de Psychologie.
 * `options` : `target` (participant visé : Peur, Terreur, Haine, Animosité, Préjugé), `source` (participant redouté : Effrayé),
 * `enemyHasMomentum` (Belliqueux, variante Temple of Spite), `momentum` (nombre, Féroce), `blocked` (Féroce : entravé, Surpris, Inconscient),
 * `protecting` (Bestial), `trigger` (Affamé), `guidedByAlly` (Stupide), `encounterId`.
 */
export function planPsychology(participant, key, options = {}) {
  const rule = RULES[key];
  const owned = rule && traitsOf(participant).find(trait => trait.key === key);
  const plan = { key, label: rule?.fr ?? key, available: false, states: [], tests: [], modifiers: [], effects: [], unresolved: [], reminders: [] };
  if (!owned) {
    plan.unresolved.push(`${plan.label} : Trait absent du participant.`);
    return { ...plan, receipt: receiptOf(plan) };
  }
  const target = options.target;
  const encounterId = options.encounterId ?? 'default-encounter';
  const book = bookOf(participant);
  if (key === 'fear' || key === 'terror') {
    const rating = ratingOf(owned.detail) ?? (key === 'fear' ? 1 : null);
    if (rating === null) plan.unresolved.push('Terreur : indice non imprimé, à saisir.');
    else if (target) {
      const preview = (key === 'fear' ? previewGenericFearEncounter : previewGenericTerrorEncounter)({ author: participant, target, rating, sourceKind: 'trait', sourceLabel: `${rule.fr} (${rating})`, encounterId, resolutionId: `${key}:${participant.id}:${target.id}` });
      plan.states.push(...preview.addedStates);
      plan.unresolved.push(...preview.unresolved);
      if (preview.exempt) plan.effects.push({ exempt: preview.reason });
    } else plan.effects.push({ [`${key}Rating`]: rating });
  } else if (key === 'afraid') {
    const source = options.source;
    if (!source) plan.unresolved.push('Effrayé : créature redoutée à désigner.');
    else if (!fearRatingOf(source, options.rating)) plan.unresolved.push('Effrayé : la créature redoutée n\'a pas de Peur imprimée, indice à saisir.');
    else {
      // Livre de base, Afraid : Peur de la cible, tant que les DR ne valent pas son indice de Peur.
      const rating = fearRatingOf(source, options.rating);
      const preview = previewGenericFearEncounter({ author: source, target: participant, rating, sourceKind: 'afraid', sourceLabel: `Effrayé (${source.name ?? source.id})`, encounterId, resolutionId: `afraid:${source.id}:${participant.id}` });
      plan.states.push(...preview.addedStates);
      plan.unresolved.push(...preview.unresolved);
    }
  } else if (key === 'hatred' || key === 'animosity' || key === 'prejudice') {
    const targets = traitTargets(participant, NAMES[key]);
    if (!targets.length) plan.unresolved.push(`${plan.label} : cible non imprimée, à saisir.`);
    else if (targets.some(entry => !entry.wildcard && !entry.keywordId)) plan.reminders.push(`${plan.label} : cible « ${targets.filter(entry => !entry.wildcard && !entry.keywordId).map(entry => entry.raw).join(', ')} » absente du référentiel de mots-clés.`);
    if (target && targets.length) {
      const aimed = traitTargetMatches(participant, NAMES[key], target);
      plan.effects.push({ aimedAtTarget: aimed });
      if (aimed && key === 'hatred') {
        plan.tests.push({ skill: 'Calme', attr: 'FM', base: willpowerBase(participant).value, reason: 'se retenir d\'attaquer' });
        plan.modifiers.push({ scope: 'mêlée et tir contre la cible', dr: 1 });
        plan.effects.push({ priorityTarget: true, immuneTo: ['Peur', 'Intimidation'] });
      } else if (aimed && key === 'animosity') {
        plan.tests.push({ skill: 'Calme', attr: 'FM', base: willpowerBase(participant).value, reason: 'se retenir' });
        plan.modifiers.push({ scope: 'Sociabilité contre la cible', dr: 1 });
      }
    }
  } else if (key === 'belligerent') {
    const variant = book === 'L09';
    if (variant && typeof options.enemyHasMomentum !== 'boolean') plan.unresolved.push('Belliqueux (Temple of Spite) : Élan adverse à préciser.');
    else plan.effects.push({ immuneToFear: hasMomentum(participant) && !(variant && options.enemyHasMomentum) });
  } else if (key === 'bestial') {
    plan.effects.push({ defenceSkill: 'Esquive', noRationalLanguage: true });
    plan.modifiers.push({ scope: 'feu qui blesse', condition: 'Brisé' });
    const maxHp = Number(participant?.maxHp);
    const hp = Number(participant?.hp);
    if (Number.isFinite(maxHp) && maxHp > 0 && Number.isFinite(hp) && hp < maxHp / 2) {
      // Livre de base, Bestial : fuite, sauf s'il protège ses petits, est acculé ou a le Trait Territorial : alors Frénésie.
      const territorial = traitsOf(participant).some(trait => trait.key === 'territorial');
      plan.effects.push({ reaction: territorial || options.protecting === true ? 'frenzy' : 'flee' });
      if (!territorial) plan.reminders.push('Bestial : la fuite devient Frénésie s\'il protège ses petits ou s\'il est acculé.');
    }
  } else if (key === 'coldBlooded') {
    if (book === 'L09') plan.unresolved.push('À Sang-froid (Temple of Spite) : inversion des Calme ratés, lecture à trancher par le MJ.');
    else {
      plan.modifiers.push({ scope: 'Calme', advantage: true });
      plan.effects.push({ ignoreFirstSurpriseEnd: true });
    }
  } else if (key === 'grim') {
    const rating = ratingOf(owned.detail);
    if (options.blocked === true) plan.effects.push({ gainMomentum: 0 });
    else if (!Number.isFinite(options.momentum)) plan.unresolved.push('Féroce : Élan actuel à préciser.');
    else if (rating) plan.effects.push({ setMomentum: Math.max(rating, options.momentum), timing: 'début de Tour' });
    else plan.effects.push({ gainMomentum: options.momentum === 0 ? 1 : 0, timing: 'fin de Tour' });
  } else if (key === 'frenzy') {
    const will = willpowerBase(participant);
    if (will.value === null) plan.unresolved.push('Frénésie : Volonté du participant inconnue.');
    else plan.tests.push({ skill: 'Volonté', attr: 'FM', base: will.value, reason: 'entrer en Frénésie', via: 'talent-frenzy' });
    plan.effects.push({ immuneToPsychology: true, freeAttackPerRound: 1, damageBonus: 1 });
  } else if (key === 'hungry') {
    if (typeof options.trigger !== 'boolean') plan.unresolved.push('Affamé : un vivant vient-il de tomber, ou un cadavre frais est-il rencontré ?');
    else if (options.trigger) plan.tests.push({ skill: 'Calme', attr: 'FM', base: willpowerBase(participant).value, dr: 2, reason: 'résister à la faim, sinon repas (prochain Mouvement et Action)' });
  } else if (key === 'stupid') {
    if (typeof options.guidedByAlly !== 'boolean') plan.unresolved.push('Stupide : un allié non Stupide le guide-t-il ?');
    else if (!options.guidedByAlly) {
      const base = Number(participant?.caracs?.Int);
      if (!Number.isFinite(base)) plan.unresolved.push('Stupide : Intelligence du participant inconnue.');
      else plan.tests.push({ skill: 'Intelligence', attr: 'Int', base, dr: 4, timing: 'début du Round', onFail: 'privé de Mouvement et d\'Action' });
    }
  } else if (key === 'skittish') {
    plan.effects.push({ trigger: 'magie spectaculaire visible ou bruit violent', conditions: [{ name: 'Brisé', level: 3 }] });
  } else if (key === 'territorial') {
    plan.effects.push({ defendsTerritory: true, stopsPursuitAtBorder: true });
  } else if (key === 'immunePsychology') {
    plan.effects.push({ immuneToPsychology: true });
  } else if (key === 'fury') {
    plan.effects.push({ advantageThresholds: [{ advantage: 1, becomes: 'hatred' }, { advantage: 3, becomes: 'frenzy', thenLosesAllAdvantage: true }] });
  }
  plan.reminders.push(rule.note);
  plan.available = plan.unresolved.length === 0;
  return { ...plan, receipt: receiptOf(plan) };
}

/** Immunité à la Peur d'un participant porteur de Traits (Immunité Psychologique, Belliqueux, Haine) : lit le service commun. */
export function fearImmunity(subject, enemy = null) {
  return isPsychologyImmune(subject, { kind: 'fear', enemy });
}

function receiptOf(plan) {
  return {
    ability: plan.label,
    states: plan.states.map(state => state.name),
    tests: plan.tests.map(test => `${test.skill} ${test.base ?? '?'}${test.dr ? ` (${test.dr > 0 ? '+' : ''}${test.dr} DR)` : ''}`),
    modifiers: plan.modifiers.map(modifier => `${modifier.scope}${modifier.dr ? ` ${modifier.dr > 0 ? '+' : ''}${modifier.dr} DR` : ''}`),
    blocked: plan.unresolved.slice()
  };
}

/** Rappels de Psychologie d'un participant, sans doublon (affichage de fiche). */
export function psychologyReminders(participant) {
  const out = [];
  for (const trait of psychologyTraits(participant)) {
    const text = `${RULES[trait.key].fr} : ${RULES[trait.key].note}`;
    if (!out.includes(text)) out.push(text);
  }
  return out;
}
