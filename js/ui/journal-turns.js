const isTurnHeader = entry => Boolean(entry) && typeof entry === 'object' && entry.kind === 'management' && typeof entry.text === 'string' && entry.text.startsWith('▶ ');

/** Le Store range le plus récent d'abord : l'en-tête « ▶ Tour de X » passe devant les actions de son Tour (dans l'ordre antichronologique). */
export function groupLogByTurn(entries) {
  const grouped = [];
  let pending = [];
  for (const entry of entries) {
    if (isTurnHeader(entry)) { grouped.push(entry, ...pending); pending = []; }
    else pending.push(entry);
  }
  return [...grouped, ...pending];
}
