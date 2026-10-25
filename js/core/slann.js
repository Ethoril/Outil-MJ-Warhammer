// Capacités des Slann (lot S1, L07 pp.124-127) : assistées sur leurs seuls profils, jamais généralisées à d'autres mages.
// Module pur : chaque service renvoie un plan et un reçu, sans rien écrire ni tirer de dés ; les jets sont saisis.
// Un participant est un Slann si et seulement si ses références de capacités propres contiennent celles de ces profils.

const ID = {
  augur: 'E0-T-211', contemplation: 'E0-T-212', totalPower: 'E0-T-213', mishaps: 'E0-T-214', teleport: 'E0-T-215',
  relicPriest: 'E0-T-216', telepathy: 'E0-T-217', palanquin: 'E0-T-218', ground: 'E0-T-219'
};

/** Disposition des neuf capacités : `assisted` (service ci-dessous) ou `reminder` (rappel motivé). */
export const SLANN_ABILITIES = [
  { id: ID.augur, name: 'Augure slann', status: 'reminder', motive: 'Dépend des règles de Psychométrie et d\'Augure d\'autres suppléments, hors outil.', summaryFr: 'Psychométrie comme compétence de base ; exception à l\'incompatibilité avec la magie.' },
  { id: ID.contemplation, name: 'Contemplation slann', status: 'assisted', by: 'contemplationOutcome', summaryFr: 'Test de Perception (Difficile −1 DR) quand les alentours changent ; la table donne l\'état du Slann.' },
  { id: ID.totalPower, name: 'Puissance totale slann', status: 'assisted', by: 'totalPowerCritical', summaryFr: 'Lancement réussi critique aussi sur un double ou une unité 0 ; relance de perception des Vents en Lustrie (rappel).' },
  { id: ID.mishaps, name: 'Maître des incidents', status: 'assisted', by: 'mishapSeverity', summaryFr: 'Incident majeur devenu mineur, sauf lancement à travers un autre mage (Télépathie).' },
  { id: ID.teleport, name: 'Téléportation de secours', status: 'assisted', by: 'planEmergencyTeleportation', summaryFr: 'À 10 Blessures ou moins, ou Blessure Critique grave : action gratuite pour lancer Téléportation.' },
  { id: ID.relicPriest, name: 'Prêtre relique', status: 'reminder', motive: 'Lien esprit-momie, distance de Volonté en mètres et deux lancements : situations de scène, sans état modélisé.', summaryFr: 'Esprit lié à la momie ; détruire le corps détruit l\'esprit ; deux lancements possibles ; corps À terre en permanence.' },
  { id: ID.telepathy, name: 'Télépathie — réseau slann', status: 'reminder', motive: 'Le réseau (Volonté en mètres, flux géomantique) et le prêtre skink relais sont des choix de scène du MJ.', summaryFr: 'Action ou Mouvement avec Intelligence (Stimulant +0) : partager ou lancer à travers un prêtre skink, qui subit les incidents.' },
  { id: ID.palanquin, name: 'Palanquin', status: 'assisted', by: 'palanquinTraits', summaryFr: 'Vol 16, Protection 8+, couvert selon la direction du tir.' },
  { id: ID.ground, name: 'Slann au sol', status: 'assisted', by: 'groundCastModifier', summaryFr: 'Hors palanquin, −3 aux lancements et canalisations.' }
];

const BY_ID = new Map(SLANN_ABILITIES.map(entry => [entry.id, entry]));
const refsOf = participant => {
  const refs = participant?.extensions?.v5?.bestiary?.abilityRefs;
  return Array.isArray(refs) ? refs : [];
};
const has = (participant, id) => refsOf(participant).includes(id);

/** Vrai pour un profil de Slann (Palanquin ou Augure slann parmi ses capacités) ; jamais pour un autre mage. */
export function isSlann(participant) {
  return has(participant, ID.palanquin) || has(participant, ID.augur);
}

/** Capacités slann du participant (liste vide hors Slann). */
export function slannAbilities(participant) {
  return isSlann(participant) ? refsOf(participant).map(id => BY_ID.get(id)).filter(Boolean) : [];
}

const refused = (key, label, reason) => ({ key, label, available: false, effects: [], unresolved: [reason], reminders: [], receipt: { ability: label, blocked: [reason] } });
const notSlann = (key, label) => refused(key, label, `${label} : réservé aux profils de Slann.`);

/** Traits et couvert du Palanquin : Vol 16, Protection 8+ ; couvert dur par derrière ou sur les côtés, souple de face. */
export function palanquinTraits(participant, { aboard = true, shotFrom = null } = {}) {
  const label = 'Palanquin';
  if (!has(participant, ID.palanquin)) return notSlann('palanquin', label);
  if (!aboard) return refused('palanquin', label, 'Palanquin : le Slann n\'est plus à bord, pas de Vol ni de Protection.');
  const cover = { front: 'soft', back: 'hard', side: 'hard' }[shotFrom] ?? null;
  const traits = [{ name: 'Fly', value: 16 }, { name: 'Ward', value: 8 }];
  return {
    key: 'palanquin', label, available: true, effects: [], traits, cover,
    unresolved: shotFrom && !cover ? [`Palanquin : direction « ${shotFrom} » inconnue (front, back ou side).`] : [],
    reminders: [ID.palanquin].map(id => BY_ID.get(id).summaryFr),
    receipt: { ability: label, traits: traits.map(trait => `${trait.name} ${trait.value}`), cover, blocked: [] }
  };
}

/** Slann hors palanquin : −3 aux Tests de lancement et de canalisation (modificateur à appliquer par le MJ ou l'appelant). */
export function groundCastModifier(participant, { aboard = true } = {}) {
  const label = 'Slann au sol';
  if (!isSlann(participant)) return notSlann('slann-ground', label);
  const active = !aboard;
  return {
    key: 'slann-ground', label, available: true, effects: [], modifier: active ? -3 : 0, applies: ['Casting', 'Channelling'],
    unresolved: [], reminders: active ? [BY_ID.get(ID.ground).summaryFr] : [],
    receipt: { ability: label, modifier: active ? -3 : 0, blocked: [] }
  };
}

/** Maître des incidents : un incident majeur devient mineur, sauf lancement à travers un autre mage. */
export function mishapSeverity(participant, severity, { viaTelepathy = false } = {}) {
  const label = 'Maître des incidents';
  if (!has(participant, ID.mishaps)) return { ...notSlann('slann-mishaps', label), severity };
  const lowered = severity === 'major' && !viaTelepathy;
  return {
    key: 'slann-mishaps', label, available: true, effects: [], severity: lowered ? 'minor' : severity, lowered,
    unresolved: [], reminders: lowered ? [BY_ID.get(ID.mishaps).summaryFr] : [],
    receipt: { ability: label, from: severity, to: lowered ? 'minor' : severity, viaTelepathy: Boolean(viaTelepathy), blocked: [] }
  };
}

/** Puissance totale : un lancement réussi est critique aussi sur un double ou une unité 0 (jet d100 saisi). */
export function totalPowerCritical(participant, roll, { succeeded = true } = {}) {
  const label = 'Puissance totale slann';
  if (!has(participant, ID.totalPower)) return notSlann('slann-total-power', label);
  const value = Number(roll);
  if (!Number.isInteger(value) || value < 0 || value > 100) return refused('slann-total-power', label, `${label} : jet d100 à saisir (0 à 100).`);
  const digit = value === 100 ? 0 : value % 10;
  const tens = value === 100 ? 0 : Math.floor(value / 10);
  const double = value === 100 || value === 0 || tens === digit;
  const critical = Boolean(succeeded) && (double || digit === 0);
  return {
    key: 'slann-total-power', label, available: true, effects: [], critical,
    unresolved: [], reminders: [BY_ID.get(ID.totalPower).summaryFr],
    receipt: { ability: label, roll: value, double, unitZero: digit === 0, succeeded: Boolean(succeeded), critical, blocked: [] }
  };
}

/** Téléportation de secours : se déclenche à 10 Blessures ou moins, ou sur une Blessure Critique grave (os brisés, muscles déchirés, pire). */
export function planEmergencyTeleportation(participant, { wounds = null, graveCritical = false } = {}) {
  const label = 'Téléportation de secours';
  if (!has(participant, ID.teleport)) return notSlann('slann-teleport', label);
  const current = wounds ?? participant?.hp ?? null;
  const known = current !== null && Number.isFinite(Number(current));
  const low = known && Number(current) <= 10;
  const triggered = low || Boolean(graveCritical);
  return {
    key: 'slann-teleport', label, available: true, effects: [], triggered,
    unresolved: known || graveCritical ? [] : [`${label} : Blessures actuelles à saisir.`],
    reminders: triggered ? ['Action gratuite : lancer Téléportation (Arcane). Réussi, le Slann gagne la chambre stellaire du temple-cité le plus proche (ou voisin si elle n\'est pas sûre).'] : [],
    receipt: { ability: label, wounds: known ? Number(current) : null, lowWounds: low, graveCritical: Boolean(graveCritical), triggered, blocked: [] }
  };
}

// Table de Contemplation (L07 p.125) : « +2 ou plus », « 0 à +1 », « −0 à −3 », « −4 ou moins ». Le zéro se lit selon le Test :
// +0 est une réussite (Détaché), −0 un échec marginal (Brume de pensée).
const CONTEMPLATION = {
  alive: { key: 'alive', label: 'Alerte (Alive to the Moment)', text: 'Le Slann réagit à son entourage sans pénalité.' },
  detached: { key: 'detached', label: 'Détaché (Detached)', text: 'Stupide pour le reste de la rencontre, puis alerte ou retour à la méditation selon les circonstances.' },
  fog: { key: 'fog', label: 'Brume de pensée (Thought Fog)', text: 'Deux États Exténué ; à son tour, Mouvement ou Action, pas les deux.' },
  lost: { key: 'lost', label: 'Perdu dans ses pensées (Lost in Thought)', text: 'Aucune conscience de son entourage, aucune réaction.' }
};

/**
 * DR du Test de Perception de Contemplation : entier, ou chaîne signée (« +0 », « -0 »). Un zéro non signé demande `success`
 * (réussite ou échec du Test) ; `-0` numérique ou chaîne vaut échec marginal. `null` si la saisie est invalide.
 */
function readContemplationSl(sl, success) {
  const text = typeof sl === 'string' ? sl.trim().replace(/[−–]/g, '-') : null;
  if (sl === null || sl === undefined || text === '') return null;
  const value = Number(text ?? sl);
  if (!Number.isInteger(value)) return null;
  if (value !== 0) return { value, zero: null };
  if (text?.startsWith('-') || Object.is(sl, -0)) return { value, zero: 'failure' };
  if (text?.startsWith('+')) return { value, zero: 'success' };
  if (success === true) return { value, zero: 'success' };
  if (success === false) return { value, zero: 'failure' };
  return { value, zero: 'unknown' };
}

/** Table de Contemplation selon les DR du Test de Perception saisi (Difficile −1 DR ; Stimuli bruyants : Stimulant +0 ; attaque : Facile +4 DR). */
export function contemplationOutcome(participant, sl, { success } = {}) {
  const label = 'Contemplation slann';
  if (!has(participant, ID.contemplation)) return notSlann('slann-contemplation', label);
  const read = readContemplationSl(sl, success);
  if (!read) return refused('slann-contemplation', label, `${label} : DR du Test de Perception à saisir (entier).`);
  if (read.zero === 'unknown') return refused('slann-contemplation', label, `${label} : 0 DR, préciser +0 (Test réussi) ou −0 (échec marginal).`);
  const { value, zero } = read;
  const key = value >= 2 ? 'alive' : value === 1 || zero === 'success' ? 'detached' : value >= -3 ? 'fog' : 'lost';
  const row = CONTEMPLATION[key];
  const conditions = row.key === 'fog' ? [{ name: 'Fatigued', count: 2 }] : row.key === 'detached' ? [{ name: 'Stupid', scope: 'rencontre' }] : [];
  return {
    key: 'slann-contemplation', label, available: true, effects: [], outcome: row.key, conditions,
    unresolved: [], reminders: [`${row.label} : ${row.text}`],
    receipt: { ability: label, sl: value, zero, outcome: row.key, conditions, blocked: [] }
  };
}

/** Vrai tant que le Slann est à bord de son palanquin (état posé par `Store.setSlannAboard`, à bord par défaut). */
export const slannAboard = participant => participant?.extensions?.v5?.slann?.aboard !== false;

/** Rappels affichés sur la carte : capacités, Slann au sol (−3 appliqué aux Tests magiques) et Téléportation de secours à 10 Blessures ou moins. */
export function slannTraitReminders(participant) {
  if (!isSlann(participant)) return [];
  const rows = slannReminders(participant);
  if (has(participant, ID.ground) || has(participant, ID.palanquin)) {
    const ground = groundCastModifier(participant, { aboard: slannAboard(participant) });
    if (ground.modifier) rows.push(`Au sol : ${ground.modifier} aux Tests d'incantation et de Focalisation (appliqué par l'outil). Remonter à bord depuis la carte.`);
  }
  if (has(participant, ID.teleport)) rows.push(...planEmergencyTeleportation(participant).reminders);
  return rows;
}

/** Rappels de fiche d'un participant : une ligne par capacité slann, assistée (service nommé) ou rappel motivé. */
export function slannReminders(participant) {
  return slannAbilities(participant).map(entry => entry.status === 'assisted'
    ? `${entry.name} (${entry.by}) : ${entry.summaryFr}`
    : `Rappel — ${entry.name} : ${entry.summaryFr}`);
}
