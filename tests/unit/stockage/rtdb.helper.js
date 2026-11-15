// Imitation de la base temps réel de Firebase (RTDB), partagée par les tests de relecture du compte.

/** Ce que RTDB rend d'une valeur écrite : tableaux vides, objets vides et propriétés null ou undefined retirés, récursivement. */
export function rtdb(value) {
  if (Array.isArray(value)) {
    const items = value.map(rtdb).filter(item => item !== undefined);
    return items.length ? items : undefined;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, item]) => [key, rtdb(item)]).filter(([, item]) => item !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value === null ? undefined : value;
}
