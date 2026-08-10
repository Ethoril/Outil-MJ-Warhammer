import { CRIT_DATA } from '../data/crits.js';

export const d100 = () => Math.floor(Math.random() * 100) + 1;

export const isDouble = (n) => n === 100 || (n <= 99 && n % 11 === 0);

export const SL = (target, roll) => Math.floor((target || 0) / 10) - Math.floor(roll / 10);

export const getReverseRoll = (roll) => {
  if (roll === 100) return 100;
  const s = roll.toString().padStart(2, '0');
  const revS = s.split('').reverse().join('');
  let val = parseInt(revS);
  if (val === 0) val = 100;
  return val;
};

export const getLocationName = (roll) => {
  if (roll <= 9) return { name: 'Tête', key: 'HEAD' };
  if (roll <= 24) return { name: 'Bras Gauche', key: 'ARM' };
  if (roll <= 44) return { name: 'Bras Droit', key: 'ARM' };
  if (roll <= 79) return { name: 'Corps', key: 'BODY' };
  if (roll <= 89) return { name: 'Jambe Gauche', key: 'LEG' };
  return { name: 'Jambe Droite', key: 'LEG' };
};

export const getCritEffect = (key, roll) => {
  const table = CRIT_DATA[key];
  if (!table) return null;
  return table.find(e => roll <= e.max);
};
