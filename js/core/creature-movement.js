// Déplacement des créatures (lot T4) : Vol, Bond, Foulée, Grimpant, Amphibie, Arboricole, Limicole, Fouissage, Respiration aquatique,
// Créature marine et Aquatique.
// Module pur : lit les Traits (texte « Nom (précision) », noms anglais ou français) et rend un plan (modificateurs, déplacements,
// points non résolus, rappels, reçu) sans rien écrire. Ce que le moteur ne sait pas trancher reste en rappel.

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const RULES = {
  fly: { fr: 'Vol', names: ['fly', 'vol'], note: 'Mouvement aérien à l\'indice, peut charger, doit voler si commence en vol ; portée de tir décalée, tirs propres à −2 DR.' },
  bounce: { fr: 'Bond', names: ['bounce', 'bond'], note: 'Double Mouvement pour Charge, Saut ou Sprint ; franchit terrain et créatures intermédiaires.' },
  sprinter: { fr: 'Foulée', names: ['sprinter', 'stride', 'foulee'], note: 'Distance de course multipliée par un et demi.' },
  stridingGait: { fr: 'Foulée adaptée', names: ['striding gait', 'strider', 'foulee adaptee'], note: 'Ignore les pénalités du terrain nommé, +1 DR Athlétisme et Discrétion dans ce terrain.' },
  wallcrawler: { fr: 'Grimpant', names: ['wallcrawler', 'grimpant'], note: 'Plein Mouvement sur murs et plafonds ; Tests d\'Escalade réussis automatiquement.' },
  amphibious: { fr: 'Amphibie', names: ['amphibious', 'amphibie'], note: 'Natation : +1 DR aux Tests (V5) ou Bonus d\'Agilité (Zoo) ; déplacement aquatique au plein Mouvement.' },
  arboreal: { fr: 'Arboricole', names: ['arboreal', 'arboricole'], note: 'Ajoute le Bonus d\'Agilité aux DR d\'Escalade et de Discrétion.' },
  swampStrider: { fr: 'Limicole', names: ['swamp-strider', 'swamp strider', 'limicole'], note: 'Aucune pénalité de déplacement en terrain marécageux.' },
  burrow: { fr: 'Fouissage', names: ['burrow', 'fouissage'], note: 'Déplacement souterrain à l\'indice, franchit les obstacles, charge possible ; doit continuer si commence enfoui, portée de tir modifiée.' },
  waterBreathing: { fr: 'Respiration aquatique', names: ['crustacean', 'water born', 'respiration aquatique'], note: 'Respire sous l\'eau ; Mouvement huit dans l\'eau.' },
  marine: { fr: 'Créature marine', names: ['marine creature', 'creature marine'], note: 'Mouvement plein dans l\'eau ; hors de l\'eau M tombe à 1 et tous les Tests subissent −2 DR ; doit être arrosée régulièrement sous peine d\'asphyxie.' },
  aquatic: { fr: 'Aquatique', names: ['aquatic', 'aquatique'], note: 'Respire sous l\'eau et se déplace à pleine vitesse dans l\'eau, mais ne peut pas se déplacer sur terre.' }
};

const BY_NAME = new Map(Object.entries(RULES).flatMap(([key, rule]) => rule.names.map(name => [name, key])));

/** « Fly (100) » → `{ key: 'fly', name, detail: '100' }` ; `null` si ce n'est pas un Trait de déplacement. */
export function parseMovementTrait(trait) {
  const text = typeof trait === 'string' ? trait : trait?.name ?? trait?.nom ?? '';
  const match = /^\s*([^(]+?)\s*(?:\(\s*([^)]*)\s*\))?\s*$/.exec(String(text));
  if (!match) return null;
  const key = BY_NAME.get(fold(match[1]));
  const detail = (match[2] ?? (typeof trait === 'object' ? trait?.rating ?? trait?.param : '') ?? '').toString().trim();
  return key ? { key, name: match[1].trim(), detail } : null;
}

const traitsOf = participant => [
  ...(Array.isArray(participant?.traits) ? participant.traits : []),
  ...(Array.isArray(participant?.extensions?.traits) ? participant.extensions.traits : [])
].map(parseMovementTrait).filter(Boolean);

/** Traits de déplacement portés par un participant (un élément par clé). */
export function movementTraits(participant) {
  const seen = new Set();
  return traitsOf(participant).filter(trait => (seen.has(trait.key) ? false : seen.add(trait.key)));
}

const isZoo = participant => participant?.extensions?.v5?.bestiary?.book === 'L11';
const agilityBonus = participant => {
  const value = participant?.caracs?.Ag;
  return Number.isFinite(Number(value)) && value !== null && value !== '' ? Math.floor(Number(value) / 10) : null;
};
const rating = detail => (/^\d+$/.test(detail) ? Number(detail) : null);

/**
 * Plan d'un Trait de déplacement.
 * `options` : `inWater` (boolean), `startsInMedium` (commence en vol / enfoui), `action` ('charge', 'saut', 'sprint'),
 * `baseRun` (distance de course de base), `terrain` (texte).
 */
export function planMovement(participant, key, options = {}) {
  const rule = RULES[key];
  const owned = rule && traitsOf(participant).find(trait => trait.key === key);
  const plan = { key, label: rule?.fr ?? key, available: false, modifiers: [], movement: null, effects: [], unresolved: [], reminders: [] };
  if (!owned) {
    plan.unresolved.push(`${plan.label} : Trait absent du participant.`);
    return { ...plan, receipt: receiptOf(plan) };
  }
  if (key === 'fly' || key === 'burrow') {
    const value = rating(owned.detail);
    const medium = key === 'fly' ? 'vol' : 'sous terre';
    if (value === null) plan.unresolved.push(`${plan.label} : indice de déplacement absent du Trait, à saisir.`);
    else plan.movement = { mode: key, rating: value, medium };
    plan.effects.push({ charge: true });
    if (options.startsInMedium === true) plan.effects.push({ mustContinue: medium });
    if (key === 'fly') plan.modifiers.push({ scope: 'tir propre', dr: -2 });
  } else if (key === 'bounce') {
    const actions = ['charge', 'saut', 'sprint'];
    plan.effects.push({ crossesObstacles: true });
    if (options.action === undefined) plan.movement = { factor: 2, actions };
    else if (actions.includes(fold(options.action))) plan.movement = { factor: 2, actions: [fold(options.action)] };
    else plan.unresolved.push(`Bond : l'action ${options.action} ne double pas le Mouvement.`);
  } else if (key === 'sprinter') {
    plan.movement = { run: Number.isFinite(options.baseRun) ? Math.floor(options.baseRun * 1.5) : null, factor: 1.5 };
    if (plan.movement.run === null) plan.unresolved.push('Foulée : distance de course de base à saisir.');
    if (isZoo(participant)) plan.reminders.push('Foulée (Zoo, E0-T-084) : même règle de course que la version V5.');
  } else if (key === 'stridingGait') {
    if (!owned.detail) plan.unresolved.push('Foulée adaptée : terrain absent du Trait, à saisir.');
    else if (options.terrain !== undefined && fold(options.terrain) !== fold(owned.detail) && fold(owned.detail) !== 'any') {
      plan.unresolved.push(`Foulée adaptée : terrain ${options.terrain} différent de ${owned.detail}.`);
    } else {
      plan.effects.push({ ignoresTerrainPenalty: owned.detail });
      plan.modifiers.push({ scope: 'Athlétisme et Discrétion', terrain: owned.detail, dr: 1 });
    }
  } else if (key === 'wallcrawler') {
    plan.movement = { surfaces: ['murs', 'plafonds'], fullMovement: true };
    plan.effects.push({ autoSuccess: 'Escalade' });
  } else if (key === 'amphibious') {
    plan.movement = { medium: 'eau', fullMovement: true };
    if (isZoo(participant)) {
      const bonus = agilityBonus(participant);
      if (bonus === null) plan.unresolved.push('Amphibie (Zoo) : Agilité du participant inconnue, bonus à saisir.');
      else plan.modifiers.push({ scope: 'Natation', dr: bonus, source: 'Bonus d\'Agilité' });
    } else plan.modifiers.push({ scope: 'Natation', dr: 1 });
  } else if (key === 'arboreal') {
    const bonus = agilityBonus(participant);
    if (bonus === null) plan.unresolved.push('Arboricole : Agilité du participant inconnue, bonus à saisir.');
    else plan.modifiers.push({ scope: 'Escalade et Discrétion', dr: bonus, source: 'Bonus d\'Agilité' });
  } else if (key === 'swampStrider') {
    plan.effects.push({ ignoresTerrainPenalty: 'marécage' });
  } else if (key === 'waterBreathing') {
    plan.effects.push({ breathes: 'sous l\'eau' });
    plan.movement = { mode: 'eau', value: 8 };
  } else if (key === 'marine') {
    if (typeof options.inWater !== 'boolean') plan.unresolved.push('Créature marine : dans l\'eau ou non, à préciser.');
    else if (options.inWater) plan.movement = { medium: 'eau', fullMovement: true };
    else {
      plan.movement = { medium: 'terre', value: 1 };
      plan.modifiers.push({ scope: 'tous les Tests', dr: -2 });
      plan.effects.push({ asphyxiation: 'sans arrosage régulier', proposed: true });
    }
  } else if (key === 'aquatic') {
    plan.effects.push({ breathes: 'sous l\'eau' });
    if (typeof options.inWater !== 'boolean') plan.unresolved.push('Aquatique : dans l\'eau ou non, à préciser.');
    else if (options.inWater) plan.movement = { medium: 'eau', fullMovement: true };
    else plan.unresolved.push('Aquatique : ne peut pas se déplacer sur terre.');
  }
  plan.reminders.push(rule.note);
  plan.available = plan.unresolved.length === 0;
  return { ...plan, receipt: receiptOf(plan) };
}

function receiptOf(plan) {
  return {
    ability: plan.label,
    movement: plan.movement ? { ...plan.movement } : null,
    modifiers: plan.modifiers.map(modifier => `${modifier.scope} ${modifier.dr > 0 ? '+' : ''}${modifier.dr} DR`),
    blocked: plan.unresolved.slice()
  };
}

/** Rappels de déplacement d'un participant, sans doublon (affichage de fiche). */
export function movementReminders(participant) {
  const out = [];
  for (const trait of movementTraits(participant)) {
    const text = `${RULES[trait.key].fr} : ${RULES[trait.key].note}`;
    if (!out.includes(text)) out.push(text);
  }
  return out;
}
