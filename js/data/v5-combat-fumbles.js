// V5 core book, p. 165 (English source): combat Oops and Misfire tables.
// The MJ selected these tables for this F2 lot; supplemental L13 rules are
// recorded separately because their source is V4 and needs an explicit V5
// conversion at the point of use.
export const V5_COMBAT_FUMBLE_TABLE = Object.freeze([
  { min: 1, max: 2, id: 'minor-injury', label: 'Perdez 1 Blessure, sans réduire par l’Endurance ni l’Armure.' },
  { min: 3, max: 4, id: 'weapon-damaged', label: 'L’arme subit 1 dégât ; vous agirez en dernier au prochain Round.' },
  { min: 5, max: 6, id: 'next-action-minus-one-dr', label: '−1 DR à votre prochaine Action.' },
  { min: 7, max: 7, id: 'lose-next-move', label: 'Perdez votre prochain Mouvement.' },
  { min: 8, max: 8, id: 'lose-next-action', label: 'Perdez votre prochaine Action.' },
  { min: 9, max: 9, id: 'twisted-ankle', label: 'Une jambe subit −1 DR pendant 1d10 Rounds (blessure critique temporaire).' },
  { min: 10, max: 10, id: 'hit-ally-or-stunned', label: 'Touchez un allié au hasard à portée ; sinon, gagnez Sonné.' }
]);

export const V5_BLACKPOWDER_INCIDENT_TABLE = Object.freeze([
  { min: 1, max: 8, id: 'misfire', label: 'L’arme ne tire pas ; une arme à feu doit être rechargée, un explosif est un raté.' },
  { min: 9, max: 10, id: 'catastrophe', label: 'L’arme explose : dégâts maximum au bras principal, à +0 DR.' }
]);

export const V5_FUMBLE_TABLE_VERSION = 'v5-oops-165-v1';
export const V5_MISFIRE_TABLE_VERSION = 'v5-misfire-165-v1';
