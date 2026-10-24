// Sens et discrétion des créatures (lot T5) : Infravision, Vision nocturne, Furtif, Pisteur, Perturbant, Caméléon, Sens vibratoires.
// Module pur : lit les Traits (texte « Nom (précision) », noms anglais ou français) et rend un plan (valeurs de compétence, portées,
// modificateurs, effets, points non résolus, rappels, reçu) sans rien écrire. Ce que le moteur ne sait pas trancher reste en rappel.

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const RULES = {
  darkVision: { fr: 'Infravision', names: ['dark vision', 'infravision'], note: 'Voit l\'obscurité comme en plein jour.' },
  nightVision: { fr: 'Vision nocturne', names: ['night vision', 'vision nocturne'], note: 'Vision naturelle à vingt yards ; la lumière utile est prolongée d\'autant.' },
  stealthy: { fr: 'Furtif', names: ['stealthy', 'furtif'], note: 'Discrétion rurale à Agilité+10, ajustable par le MJ ; pas le bonus de DR de la V4.' },
  tracker: { fr: 'Pisteur', names: ['tracker', 'pisteur'], note: 'Compétence Pistage à Intelligence+10, augmentable par le MJ.' },
  distracting: { fr: 'Perturbant', names: ['distracting', 'perturbant'], note: 'Les vivants à BE yards subissent −2 DR généraux, une seule fois quelle que soit la multiplicité des sources.' },
  chameleon: { fr: 'Caméléon', names: ['chameleon', 'cameleon'], note: 'Perception −4 DR pour le voir (−2 s\'il bouge) ; tirs contre lui −2 DR.' },
  vibrational: { fr: 'Sens vibratoires', names: ['vibrational senses', 'sens vibratoires'], note: 'Détecte les corps physiques dans quatre BI yards et ne peut pas être Surpris.' }
};

const BY_NAME = new Map(Object.entries(RULES).flatMap(([key, rule]) => rule.names.map(name => [name, key])));

/** « Distracting (Smell) » → `{ key: 'distracting', name, detail: 'Smell' }` ; `null` si ce n'est pas un Trait de sens. */
export function parseSenseTrait(trait) {
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
].map(parseSenseTrait).filter(Boolean);

/** Traits de sens portés par un participant (un élément par clé). */
export function senseTraits(participant) {
  const seen = new Set();
  return traitsOf(participant).filter(trait => (seen.has(trait.key) ? false : seen.add(trait.key)));
}

const carac = (participant, key) => {
  const value = participant?.caracs?.[key];
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
};
const bonus = (participant, key) => (carac(participant, key) === null ? null : Math.floor(carac(participant, key) / 10));

/**
 * Plan d'un Trait de sens.
 * `options` : `moving` (boolean, Caméléon).
 */
export function planSense(participant, key, options = {}) {
  const rule = RULES[key];
  const owned = rule && traitsOf(participant).find(trait => trait.key === key);
  const plan = { key, label: rule?.fr ?? key, available: false, skills: [], ranges: [], modifiers: [], effects: [], unresolved: [], reminders: [] };
  if (!owned) {
    plan.unresolved.push(`${plan.label} : Trait absent du participant.`);
    return { ...plan, receipt: receiptOf(plan) };
  }
  if (key === 'darkVision') {
    plan.effects.push({ seesInDarkness: true });
    if (owned.detail) plan.reminders.push(`Infravision (${owned.detail}) : précision imprimée, non calculée.`);
  } else if (key === 'nightVision') {
    plan.ranges.push({ scope: 'vision nocturne', yards: 20 });
    plan.effects.push({ extendsUsefulLight: 20 });
  } else if (key === 'stealthy' || key === 'tracker') {
    const source = key === 'stealthy' ? 'Ag' : 'Int';
    const label = key === 'stealthy' ? 'Discrétion (rurale)' : 'Pistage';
    const base = carac(participant, source);
    if (base === null) plan.unresolved.push(`${plan.label} : ${source === 'Ag' ? 'Agilité' : 'Intelligence'} du participant inconnue, valeur à saisir.`);
    else plan.skills.push({ skill: label, value: base + 10, source: `${source}+10`, adjustableByGM: true });
  } else if (key === 'distracting') {
    const be = bonus(participant, 'E');
    if (be === null) plan.unresolved.push('Perturbant : Endurance du participant inconnue, portée à saisir.');
    else plan.ranges.push({ scope: 'vivants', yards: be, source: 'Bonus d\'Endurance' });
    plan.modifiers.push({ scope: 'tous les Tests des vivants à portée', dr: -2, onceOnly: true });
    if (owned.detail) plan.reminders.push(`Perturbant (${owned.detail}) : source imprimée, sans effet de règle propre.`);
  } else if (key === 'chameleon') {
    if (typeof options.moving !== 'boolean') plan.unresolved.push('Caméléon : en mouvement ou non, à préciser.');
    else plan.modifiers.push({ scope: 'Perception pour le voir', dr: options.moving ? -2 : -4 });
    plan.modifiers.push({ scope: 'tirs contre lui', dr: -2 });
  } else if (key === 'vibrational') {
    const bi = bonus(participant, 'I');
    if (bi === null) plan.unresolved.push('Sens vibratoires : Initiative du participant inconnue, portée à saisir.');
    else plan.ranges.push({ scope: 'corps physiques', yards: bi * 4, source: 'quatre BI' });
    plan.effects.push({ immuneToSurprise: true });
  }
  plan.reminders.push(rule.note);
  plan.available = plan.unresolved.length === 0;
  return { ...plan, receipt: receiptOf(plan) };
}

/**
 * Perturbant : le malus de −2 DR ne s'applique qu'une fois, quel que soit le nombre de sources à portée.
 * `distances` : distances (yards) entre la cible et chaque source ; `sources` : participants porteurs.
 */
export function distractingPenalty(sources, distances) {
  const list = Array.isArray(sources) ? sources : [];
  const reach = list.map((source, index) => {
    const plan = planSense(source, 'distracting');
    const yards = plan.ranges[0]?.yards;
    return plan.available && Number.isFinite(distances?.[index]) && distances[index] <= yards;
  });
  const unknown = list.some((source, index) => !planSense(source, 'distracting').available && senseTraits(source).some(trait => trait.key === 'distracting') && distances?.[index] !== undefined);
  return { dr: reach.some(Boolean) ? -2 : 0, sources: reach.filter(Boolean).length, unresolved: unknown };
}

const has = (participant, key) => traitsOf(participant).some(trait => trait.key === key);

/**
 * Effets des Traits de sens sur un Test, quand le contexte les détermine (rien d'inventé sinon : le rappel de la carte reste).
 * `actor` passe le Test contre `opponent` ; `participants` : toute la scène ; `context` : `targetMoving` (Caméléon), `distractingInRange` (Perturbant).
 * Rend `{ modifiers: [{ id, label, amount }], base: { score, label } | null }` ; `base` = valeur de compétence du Trait (Furtif, Pisteur) si elle dépasse `currentBase`.
 */
export function senseTestRules({ actor, opponent, participants = [], skillLabel = '', kind, defending = false, context = {}, currentBase = 0 }) {
  const modifiers = [];
  const label = fold(skillLabel);
  if (has(opponent, 'chameleon')) {
    if (kind === 'ranged' && !defending) modifiers.push({ id: 'sense:chameleon-ranged', label: 'Tir contre un Caméléon', amount: -2 });
    if (/perception/.test(label) && typeof context.targetMoving === 'boolean') modifiers.push({ id: 'sense:chameleon-sight', label: `Voir un Caméléon ${context.targetMoving ? 'qui bouge' : 'immobile'}`, amount: context.targetMoving ? -2 : -4 });
  }
  if (context.distractingInRange === true && (participants || []).some(person => person?.id !== actor?.id && has(person, 'distracting'))) {
    modifiers.push({ id: 'sense:distracting', label: 'Perturbant à portée (une seule fois)', amount: -2 });
  }
  let base = null;
  const skillKey = /discretion/.test(label) ? 'stealthy' : /pistage|tracking|track/.test(label) ? 'tracker' : null;
  if (skillKey && has(actor, skillKey)) {
    const skill = planSense(actor, skillKey).skills[0];
    if (skill && skill.value > currentBase) base = { score: skill.value, label: `${RULES[skillKey].fr} : ${skill.skill} ${skill.value} (${skill.source})` };
  }
  return { modifiers, base };
}

/** Participants de la scène qui portent un Trait de sens donné (le panneau n'affiche une question que s'il en existe). */
export const carriesSense = (participant, key) => has(participant, key);

function receiptOf(plan) {
  return {
    ability: plan.label,
    skills: plan.skills.map(skill => `${skill.skill} ${skill.value}`),
    ranges: plan.ranges.map(range => `${range.scope} ${range.yards} yards`),
    modifiers: plan.modifiers.map(modifier => `${modifier.scope} ${modifier.dr > 0 ? '+' : ''}${modifier.dr} DR`),
    blocked: plan.unresolved.slice()
  };
}

/** Rappels de sens d'un participant, sans doublon (affichage de fiche). */
export function senseReminders(participant) {
  const out = [];
  for (const trait of senseTraits(participant)) {
    const text = `${RULES[trait.key].fr} : ${RULES[trait.key].note}`;
    if (!out.includes(text)) out.push(text);
  }
  return out;
}
