/**
 * Prétirés (fiches de personnage de The Imperial Zoo, pp. 122-132) : identité, caractéristiques actuelles, Blessures, Mouvement,
 * compétences (total imprimé) et talents. Les intitulés incohérents de la fiche sont signalés, les caractéristiques jamais corrigées.
 */
const CARAC_ORDER = ['CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'];
const CHAR_LABELS = '(?:WS|BS|S|T|I|Agi?|Dex|Int|WP|Fel)';

/** `raw` : texte brut de la page ; `layout` : texte layout de la même page ; `talentDictionary` : noms anglais de talents. */
export function parsePregenerated(raw, layout, talentDictionary) {
  const flat = raw.replace(/\s+/g, ' ');
  const identity = /Name: (.+?) Career: (.+?) Age:/.exec(flat) || [];
  const species = /Species: (.+?) Career Path: (.+?) Status: (\w+ \d)/.exec(flat) || [];
  const current = /Current ((?:\d+ ){9}\d+)/.exec(flat);
  const stats = { M: null, CC: null, CT: null, F: null, E: null, I: null, Ag: null, Dex: null, Int: null, FM: null, Soc: null };
  if (current) current[1].split(' ').forEach((value, index) => { stats[CARAC_ORDER[index]] = Number(value); });
  const walk = /(\d+) Walk/.exec(flat);
  if (walk) stats.M = Number(walk[1]);
  // Cadre « WOUNDS » : SB, TBx2, WPB, parfois Hardy, puis le total (dernier nombre).
  const woundsRow = /WOUNDS((?: \d+)+)/.exec(flat);
  const wounds = woundsRow ? [null, woundsRow[1].trim().split(' ').pop()] : /Wounds (\d+)/.exec(flat);
  // Compétences : la mise en page décale parfois les noms des chiffres ; une ligne n'est gardée que si elle se recoupe (caractéristique
  // imprimée = caractéristique actuelle de la fiche, et total = caractéristique + progression).
  const STAT_OF = { WS: 'CC', BS: 'CT', S: 'F', T: 'E', I: 'I', Ag: 'Ag', Agi: 'Ag', Dex: 'Dex', Int: 'Int', WP: 'FM', Fel: 'Soc' };
  const skills = [];
  for (const line of layout.split('\n')) {
    for (const part of [line.slice(0, 56), line.slice(56)]) {
      const found = new RegExp(`^\\s*([A-Z][A-Za-z()' ]+?)\\s+(${CHAR_LABELS})\\s+(\\d+)(?:\\s+(\\d+))?\\s+(\\d+)\\s*$`).exec(part);
      if (!found) continue;
      const [, name, label, characteristic, advance, total] = found;
      const expected = Number(characteristic) + (advance ? Number(advance) : 0);
      if (stats[STAT_OF[label]] === Number(characteristic) && expected === Number(total)) skills.push({ name: name.trim(), value: Number(total) });
    }
  }
  const region = layout.slice(layout.indexOf('Talent Name'), layout.indexOf('ARMOUR') > 0 ? layout.indexOf('ARMOUR') : undefined);
  const talents = [...talentDictionary].filter(name => new RegExp(`(?:^|[^A-Za-z])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`).test(region)).map(name => {
    const spec = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(([^)]+)\\)`).exec(region);
    return spec ? { name: `${name} (${spec[1].trim()})` } : { name };
  });
  const warnings = [];
  if (!current) warnings.push('caractéristiques actuelles introuvables');
  if (!wounds) warnings.push('Blessures introuvables');
  return {
    identity: { name: identity[1]?.trim() || null, career: identity[2]?.trim() || null, species: species[1]?.trim() || null, careerPath: species[2]?.trim() || null, status: species[3] || null },
    stats, wounds: wounds ? Number(wounds[1]) : null, skills, talents, warnings
  };
}
