const integer = value => Number.isSafeInteger(value) && value >= 0;

/** Convert Warhammer money values to brass sous; 12 sous = 1 pistole, 20 pistoles = 1 crown. */
export function toSous({ crowns = 0, pistoles = 0, sous = 0 } = {}) {
  if (![crowns, pistoles, sous].every(integer)) throw new TypeError('Montant monétaire invalide ou négatif');
  const total = crowns * 240 + pistoles * 12 + sous;
  if (!Number.isSafeInteger(total)) throw new TypeError('Montant monétaire invalide');
  return total;
}

export function fromSous(total) {
  if (!integer(total)) throw new TypeError('Montant monétaire invalide ou négatif');
  const crowns = Math.floor(total / 240), rest = total % 240;
  const pistoles = Math.floor(rest / 12), sous = rest % 12;
  return { crowns, pistoles, sous };
}

export function formatCurrency(value) {
  const money = fromSous(typeof value === 'number' ? value : toSous(value));
  return `${money.crowns} couronne(s), ${money.pistoles} pistole(s), ${money.sous} sou(s)`;
}
