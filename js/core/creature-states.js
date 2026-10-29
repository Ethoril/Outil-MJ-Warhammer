// États et dégâts continus des créatures (lot T3) : Venin, Infecté, Parasité, Maladie, Sang corrosif, Vampirique, Nuée, Instable,
// Increvable, Scission et déclencheurs de mort/reformation des capacités propres de profil.
// Module pur : lit les Traits (texte « Nom (précision) », noms anglais ou français) et rend un plan (effets proposés, soins, dégâts,
// tests demandés, points non résolus, rappels, reçu) sans rien écrire. Ce que le moteur ne sait pas trancher reste en rappel.

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const RULES = {
  venom: { fr: 'Venin', names: ['venom', 'venin'], note: 'Blesser donne Empoisonné ; la difficulté du Trait gouverne sa récupération.' },
  infected: { fr: 'Infecté', names: ['infected', 'infecte'], note: 'Victime vivante blessée : Endurance +4 DR ou Plaie Purulente.' },
  infestation: { fr: 'Parasité', names: ['infestation', 'parasite'], note: '−1 DR pour toucher la créature en mêlée.' },
  disease: { fr: 'Maladie', names: ['disease', 'maladie'], note: 'Porte la maladie indiquée ; contraction selon exposition, atteinte propre décidée par le MJ.' },
  corrosive: { fr: 'Sang corrosif', names: ['corrosive blood', 'sang corrosif'], note: 'Après blessure reçue, un seul d10 de dégâts partagé entre tous les engagés.' },
  vampiric: { fr: 'Vampirique', names: ['vampiric', 'vampirique'], note: 'Une Morsure sur proie admissible soigne autant que les Blessures infligées ; seule méthode de soin.' },
  swarm: { fr: 'Nuée', names: ['swarm', 'nuee'], note: 'Psychologie et Taille ignorées ; mouvement ignore l\'engagement ; Blessures quintuplées et CC accrue (valeurs du profil) ; chaque engagé perd 1 Blessure en fin de Round ; tir facilité de quatre DR.' },
  unstable: { fr: 'Instable', names: ['unstable', 'instable'], note: 'Fin de Round engagé contre Élan adverse sans le sien : deux Blessures ; à zéro, disparition ou destruction.' },
  diehard: { fr: 'Increvable', names: ['die hard', 'increvable'], note: 'À la mort si le corps est intact : Endurance étendue de six DR à chaque début de Round pendant BE Rounds ; une réussite revient avec une Blessure.' },
  split: { fr: 'Scission', names: ['split', 'scission'], note: 'Sur Blessure Critique ou à zéro Blessure, la créature se scinde en deux Horreurs bleues intactes.' }
};

const BY_NAME = new Map(Object.entries(RULES).flatMap(([key, rule]) => rule.names.map(name => [name, key])));

// Capacités propres de profil (références d'inventaire) qui se déclenchent à la mort ou à la destruction.
const DEATH_ABILITIES = {
  'E0-T-253': { label: 'Fin ignoble (Messy Demise)', area: 'tout engagé à trois mètres', test: 'Esquive (Intermédiaire, +0 DR)', onFail: { damage: '2d10', reducedBy: ['Endurance', 'armure'], minimum: 1 }, note: 'À la mort du Squig colossal : Esquive de tout engagé à trois mètres, sinon 2d10 Blessures réduites par Endurance et armure, minimum une.' },
  'E0-T-256': { label: 'Jardin de cadavres (Garden of Corpses)', spawn: { profile: 'Zombie', count: '3d10', hostileTo: 'tout être vivant proche' }, note: 'Le colosse vaincu libère 3d10 zombies qui attaquent tout être vivant proche.' },
  'E0-T-259': { label: 'Gardien éternel (Eternal Guardian)', reform: { delay: 'd10 jours' }, note: 'L\'Élémentaire gardien tué se reconstitue en d10 jours, sauf précautions adaptées (dressage, drainage magique, corruption de la source).' },
  'E0-T-286': { label: 'Reformation instable (Unstable Reformation)', reform: { delay: '8 heures', fullWounds: true, onlyIf: 'mort causée par Instable' }, note: 'Si Inta-Dapesht « meurt » à cause d\'Instable, il se reforme après 8 heures avec toutes ses Blessures.' }
};

/** « Venom (Difficult) » → `{ key: 'venom', name, detail: 'Difficult' }` ; `null` si ce n'est pas un Trait d'état continu. */
export function parseStateTrait(trait) {
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
].map(parseStateTrait).filter(Boolean);

/** États continus portés par un participant (un élément par Trait reconnu, sans doublon de clé). */
export function stateTraits(participant) {
  const seen = new Set();
  return traitsOf(participant).filter(trait => (seen.has(trait.key) ? false : seen.add(trait.key)));
}

const isZoo = participant => participant?.extensions?.v5?.bestiary?.book === 'L11';
const bonusOf = value => (Number.isFinite(Number(value)) && value !== null && value !== '' ? Math.floor(Number(value) / 10) : null);
const endurance = participant => bonusOf(participant?.caracs?.E);

function emptyPlan(participant, key) {
  const rule = RULES[key];
  const owned = rule && traitsOf(participant).find(trait => trait.key === key);
  const plan = { key, label: rule?.fr ?? key, available: false, effects: [], heal: null, damage: null, tests: [], unresolved: [], reminders: [] };
  if (!rule || !owned) plan.unresolved.push(`${plan.label} : Trait absent du participant.`);
  return { plan, rule, owned };
}

function finish(plan, rule) {
  if (rule) plan.reminders.push(rule.note);
  plan.available = plan.unresolved.length === 0;
  return { ...plan, receipt: receiptOf(plan) };
}

/**
 * Plan d'un Trait d'état à la blessure : Venin, Infecté, Parasité, Maladie, Sang corrosif.
 * `options` : `living` (la victime est vivante, pour Infecté).
 */
export function planStateOnWound(participant, key, options = {}) {
  const { plan, rule, owned } = emptyPlan(participant, key);
  if (!owned) return { ...plan, receipt: receiptOf(plan) };
  if (key === 'venom') {
    plan.effects.push({ state: 'Empoisonné', trigger: 'blessure infligée', ...(owned.detail ? { recoveryDifficulty: owned.detail } : {}) });
    if (!owned.detail) plan.unresolved.push('Venin : difficulté de récupération absente du Trait, à saisir.');
  } else if (key === 'infected') {
    if (options.living === false) plan.unresolved.push('Infecté : la victime doit être vivante.');
    plan.tests.push({ test: 'Endurance', modifier: '+4 DR', onFail: 'Plaie Purulente' });
    plan.effects.push({ state: 'Plaie Purulente', trigger: 'Endurance +4 DR ratée', proposed: true });
  } else if (key === 'infestation') {
    plan.targetedModifier = { scope: 'mêlée', dr: -1 };
  } else if (key === 'disease') {
    plan.effects.push({ disease: owned.detail || null, trigger: 'exposition', decidedBy: 'MJ' });
    if (!owned.detail) plan.unresolved.push('Maladie : type de la maladie absent du Trait, à saisir.');
  } else if (key === 'corrosive') {
    plan.damage = { formula: '1d10', shared: true, targets: 'tous les engagés', trigger: 'blessure reçue', singleRoll: true };
  } else plan.unresolved.push(`${plan.label} : pas un Trait à la blessure.`);
  return finish(plan, rule);
}

/**
 * Soin Vampirique : égal aux Blessures infligées par une Morsure sur une proie admissible, sinon aucun soin.
 * `options` : `wounds` (Blessures infligées, entier), `viaBite`, `preyAdmissible`.
 */
export function planVampiricHeal(participant, options = {}) {
  const { plan, rule, owned } = emptyPlan(participant, 'vampiric');
  if (!owned) return { ...plan, receipt: receiptOf(plan) };
  const wounds = options.wounds;
  if (!Number.isInteger(wounds) || wounds < 0) plan.unresolved.push('Vampirique : Blessures infligées à saisir.');
  else if (options.viaBite !== true) plan.unresolved.push('Vampirique : seule une Morsure soigne.');
  else if (options.preyAdmissible !== true) plan.unresolved.push('Vampirique : la proie doit être admissible (à confirmer par le MJ).');
  else plan.heal = { amount: wounds, cause: 'Morsure' };
  return finish(plan, rule);
}

/** Effets de Nuée sur les calculs de la scène : ce que le moteur peut lire, le reste en rappel. */
export function planSwarm(participant) {
  const { plan, rule, owned } = emptyPlan(participant, 'swarm');
  if (!owned) return { ...plan, receipt: receiptOf(plan) };
  plan.ignores = { psychology: true, size: true, engagementForMovement: true };
  plan.rangedAgainst = { dr: -4, note: 'tir facilité de quatre DR' };
  // Livre de base, Traits de créature (Swarm) : « All opponents Engaged with a Swarm automatically lose 1 Wound at the end of every Round ».
  plan.endOfRound = { damage: 'Blessure directe', amount: 1, targets: 'engagés', amountPrinted: true };
  return finish(plan, rule);
}

/**
 * Instable en fin de Round. `options` : `engaged` (engagé), `enemyMomentum` / `ownMomentum` (Élan, nombres).
 * Deux Blessures quand engagé contre un Élan adverse sans le sien ; à zéro Blessure : disparition. Variante du Zoo : rappel seul.
 */
export function planUnstableEndOfRound(participant, options = {}) {
  const { plan, rule, owned } = emptyPlan(participant, 'unstable');
  if (!owned) return { ...plan, receipt: receiptOf(plan) };
  if (isZoo(participant)) {
    plan.unresolved.push('Instable (Imperial Zoo) : Blessures en fin de Round selon l\'écart d\'Avantage (E0-T-092), pas les deux Blessures fixes ; à appliquer à la main.');
    return finish(plan, rule);
  }
  if (typeof options.engaged !== 'boolean' || !Number.isFinite(options.enemyMomentum) || !Number.isFinite(options.ownMomentum)) {
    plan.unresolved.push('Instable : engagement et Élan adverse/propre à préciser.');
    return finish(plan, rule);
  }
  if (options.engaged && options.enemyMomentum > 0 && options.ownMomentum <= 0) {
    plan.damage = { amount: 2, direct: true, trigger: 'fin de Round' };
    const hp = Number.isFinite(participant?.hp) ? participant.hp : null;
    if (hp !== null && hp - 2 <= 0) plan.effects.push({ state: 'Disparition', trigger: 'Blessures à zéro', cause: 'unstable' });
  }
  plan.reminders.push('Disruption (E0-T-147) : Avantage traité comme diminué de deux contre les adversaires de l\'Instable, sans perte réelle.');
  return finish(plan, rule);
}

/** Increvable à la mort : test étendu à chaque début de Round pendant BE Rounds, si le corps est intact (`bodyIntact`). */
export function planDieHard(participant, options = {}) {
  const { plan, rule, owned } = emptyPlan(participant, 'diehard');
  if (!owned) return { ...plan, receipt: receiptOf(plan) };
  const rounds = endurance(participant);
  if (rounds === null) plan.unresolved.push('Increvable : Endurance du participant inconnue, durée (BE Rounds) à saisir.');
  if (options.bodyIntact !== true) plan.unresolved.push('Increvable : le corps doit être intact (à confirmer par le MJ).');
  plan.tests.push({ test: 'Endurance étendue', modifier: '6 DR', frequency: 'début de Round', rounds });
  plan.effects.push({ revive: true, wounds: 1, trigger: 'réussite du test étendu', proposed: true });
  return finish(plan, rule);
}

/** Scission : à la Blessure Critique ou à zéro Blessure. Les deux copies sont des Horreurs bleues intactes (profil à ajouter par le MJ). */
export function planSplit(participant, options = {}) {
  const { plan, rule, owned } = emptyPlan(participant, 'split');
  if (!owned) return { ...plan, receipt: receiptOf(plan) };
  if (options.critical !== true && !(Number.isFinite(options.hp) && options.hp <= 0)) plan.unresolved.push('Scission : ni Blessure Critique ni zéro Blessure.');
  plan.effects.push({ spawn: { profile: 'Horreur bleue', count: 2, intact: true }, trigger: 'Blessure Critique ou zéro Blessure', proposed: true });
  return finish(plan, rule);
}

/** Déclencheurs de mort et de reformation (capacités propres de profil) portés par les `abilityRefs` du participant. */
export function planDeathTriggers(participant, options = {}) {
  const refs = participant?.extensions?.v5?.bestiary?.abilityRefs;
  const plans = [];
  for (const ref of Array.isArray(refs) ? refs : []) {
    const rule = DEATH_ABILITIES[ref];
    if (!rule) continue;
    const plan = { key: ref, label: rule.label, available: true, effects: [], unresolved: [], reminders: [rule.note] };
    if (rule.area) plan.effects.push({ area: rule.area, test: rule.test, onFail: rule.onFail, trigger: 'mort' });
    if (rule.spawn) plan.effects.push({ spawn: rule.spawn, trigger: 'mort', proposed: true });
    if (rule.reform) {
      plan.effects.push({ reform: rule.reform, trigger: 'mort' });
      if (rule.reform.onlyIf && options.causeUnstable !== true) { plan.available = false; plan.unresolved.push(`${rule.label} : seulement si la mort vient d'Instable.`); }
    }
    plans.push({ ...plan, receipt: receiptOf(plan) });
  }
  return plans;
}

function receiptOf(plan) {
  return {
    ability: plan.label,
    effects: plan.effects.map(effect => effect.state ?? effect.disease ?? (effect.spawn ? 'invocation' : effect.reform ? 'reformation' : effect.revive ? 'retour' : 'zone')),
    damage: plan.damage?.formula ?? (plan.damage?.amount ?? null),
    heal: plan.heal?.amount ?? null,
    blocked: plan.unresolved.slice()
  };
}

/** Rappels d'états continus d'un participant, sans doublon (affichage de fiche). */
export function stateReminders(participant) {
  const out = [];
  for (const trait of stateTraits(participant)) {
    const text = `${RULES[trait.key].fr} : ${RULES[trait.key].note}`;
    if (!out.includes(text)) out.push(text);
  }
  return out;
}
