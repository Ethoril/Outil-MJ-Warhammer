/**
 * Extraction des blocs de profils (bestiaires, PNJ) depuis le texte « layout » d'un livre (`pdftotext -layout`, pages séparées par \f).
 * Module pur : aucune E/S. Le texte du livre n'est jamais conservé : seuls les chiffres imprimés et les NOMS de compétences, de
 * Traits et de talents sortent, les clauses de règle restant dans l'inventaire (résumés en français).
 *
 * Un bloc est repéré par sa ligne d'en-tête de caractéristiques ; ses chiffres sont lus par ALIGNEMENT sur les colonnes de l'en-tête
 * (un tiret perdu à l'extraction reste donc une case vide à sa place, jamais un décalage) ; son texte est la fenêtre de colonnes
 * sous l'en-tête, bornée à droite par un éventuel bloc voisin (profils côte à côte, colonne voisine).
 */

const HEADER = /\bM\s+WS\s+BS\s+S\s+T\s+I\s+Agi?\s+Dex\s+Int\s+W[Pp]\s+Fel(?:\s+W\b)?/g;
const CELL = /(?:[+\-−–—�]?\d+\*?|[-–—−�]+|\*)/g;
const DASH = /^[-–—−�]+$/;
const NEGATIVE = /^[\-−–—�]\d/;
const SECTION_START = /^(Traits|Attack Traits|Skills|Talents|Trappings|Spells|Mutations|Optional|Armour|Attacks|Petty Magic|Arcane Magic|Weapons?|Special)\b/;
const BARE_LABEL = /^(Attacks|Armour|Skills|Traits|Optional Traits|Talents|Trappings|Spells)$/;
export const STAT_KEYS = Object.freeze(['M', 'CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc', 'W']);

export const clean = text => text.replace(/[\t ]+/g, ' ').replace(/\s+([,.;:)])/g, '$1').trim();

const isTitleText = text => {
  const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length < 3 || text.length > 140) return false;
  return text.replace(/[^A-ZÀ-Þ]/g, '').length / letters.length >= 0.75;
};
const parenthesised = text => /^\(.*\)$/.test(text);
const padCells = tokens => [...tokens, ...Array(Math.max(0, 12 - tokens.length)).fill(null)];

/** Fin d'un mot ou d'une phrase de la colonne voisine, collée au bord gauche de la fenêtre (« rotect  Melee (Basic) 45 ») : retirée. */
function stripBleed(raw) {
  const found = /^\s*(?:[a-zà-ÿ’',.;:()\-]+\s+){0,3}[a-zà-ÿ’',.;:()\-]+\s{2,}(?=[A-Z0-9])/.exec(raw);
  return found ? raw.slice(found[0].length) : raw;
}

/** Gouttière interne d'une fiche (lignes brutes de sa fenêtre) : colonne libre de texte avec du texte de part et d'autre, sinon null. */
function innerGutter(rawLines) {
  const filled = rawLines.filter(line => line.trim());
  if (filled.length < 8) return null;
  const width = Math.max(...filled.map(line => line.length));
  let best = null;
  for (let x = 14; x < width - 14; x += 1) {
    if (filled.some(line => line[x] && line[x] !== ' ')) continue;
    const leftCount = filled.filter(line => line.slice(0, x).trim()).length;
    const rightCount = filled.filter(line => line.slice(x + 1).trim()).length;
    if (leftCount < 4 || rightCount < 4) continue;
    const score = Math.min(leftCount, rightCount) * 100 - Math.abs(x - width / 2);
    if (!best || score > best.score) best = { x, score };
  }
  return best ? best.x : null;
}

/** Colonne de gouttière d'une page à deux colonnes de texte : aucune ligne ne la traverse (hors titres pleine largeur). */
function findGutter(lines) {
  const filled = lines.filter(line => line.trim());
  if (filled.length < 16) return null;
  const width = Math.min(220, Math.max(...filled.map(line => line.length)));
  let best = null;
  for (let x = 25; x < width - 25; x += 1) {
    let crossing = 0;
    let rightOfIt = 0;
    let leftOfIt = 0;
    for (const line of filled) {
      if (line[x] && line[x] !== ' ') crossing += 1;
      if (line.slice(x + 1).trim()) rightOfIt += 1;
      if (line.slice(0, x).trim()) leftOfIt += 1;
    }
    if (rightOfIt < 8 || leftOfIt < 8) continue;
    // Une gouttière n'est jamais coupée par du texte courant : tolérance de quelques titres pleine largeur.
    const clear = line => !line[x] || line[x] === ' ';
    const wide = filled.filter(line => line.length > x + 3 && line.slice(x - 2, x + 3).trim()).length;
    if (crossing <= Math.max(2, Math.floor(filled.length * 0.04)) && wide <= Math.max(3, Math.floor(filled.length * 0.08)) && filled.every(clear) === false) {
      const score = crossing * 1000 + Math.abs(x - width / 2);
      if (!best || score < best.score) best = { x, score };
    }
  }
  return best ? best.x : null;
}

/** Cases d'une ligne de valeurs, attribuées à la colonne d'en-tête la plus proche : { cells: [12 × texte|null], extra } */
function alignRow(line, columns) {
  const cells = Array(12).fill(null);
  let extra = 0;
  for (const match of line.matchAll(CELL)) {
    const middle = match.index + match[0].length / 2;
    let best = 0;
    columns.forEach((column, index) => { if (Math.abs(column - middle) < Math.abs(columns[best] - middle)) best = index; });
    if (Math.abs(columns[best] - middle) > 5) { extra += 1; continue; }
    // Deux jetons sur la même colonne (« 11 » puis « * ») : le second complète, jamais n'écrase un nombre.
    cells[best] = cells[best] && /\d/.test(cells[best]) ? `${cells[best]}${match[0]}` : match[0];
  }
  return { cells, extra };
}

/**
 * Blocs d'une page : { title, cells (12 textes ou null), extra, body, bodyLines, header, row }.
 * `cells` : valeur imprimée de chaque colonne (M WS BS S T I Ag Dex Int WP Fel W), null si la case est vide.
 */
export function pageBlocks(pageText) {
  const lines = pageText.split('\n').map(line => line.replace(/\s+$/, ''));
  const heads = [];
  lines.forEach((line, i) => {
    for (const match of line.matchAll(HEADER)) heads.push({ line: i, start: match.index, end: match.index + match[0].length, text: match[0] });
  });
  const blocks = [];
  const gutter = heads.length ? findGutter(lines) : null;
  for (const head of heads) {
    const columns = [...head.text.matchAll(/\S+/g)].map(label => head.start + label.index + label[0].length / 2);
    // Bord droit : prochain bloc à droite sur la page (profils côte à côte, colonne voisine), sinon le bord de la page.
    const neighbour = heads.filter(other => other !== head && other.start > head.start + 20).sort((x, y) => x.start - y.start)[0];
    let right = neighbour ? Math.max(head.end + 1, neighbour.start - 4) : Infinity;
    if (gutter && head.start < gutter - 5) right = Math.min(right, gutter);
    const left = Math.max(gutter && head.start > gutter ? gutter + 1 : 0, head.start - 3);
    const windowOf = line => (line || '').slice(left, right === Infinity ? undefined : right);
    const rightLimit = right === Infinity ? 1e9 : right;
    // Titre : texte avant l'en-tête sur la même ligne, sinon lignes juste au-dessus (majuscules, ou intitulé entre parenthèses).
    const inline = clean(lines[head.line].slice(Math.max(0, head.start - 45), head.start)).replace(/^.*\s{2,}/, '');
    const titleParts = [];
    if (inline && isTitleText(inline)) titleParts.push(inline);
    else if (!inline) {
      for (let k = head.line - 1; k >= Math.max(0, head.line - 4); k -= 1) {
        const above = clean(windowOf(lines[k]));
        if (!above) { if (titleParts.length) break; continue; }
        if (isTitleText(above) || (titleParts.length === 0 && parenthesised(above)) || (titleParts.length && parenthesised(titleParts[0]) && above.length < 40)) titleParts.unshift(above); else break;
      }
    }
    // Ligne des valeurs : première ligne sous l'en-tête, dans la fenêtre, faite de seuls nombres et tirets (ou Base/Adv./Total).
    // Les chiffres sont les jetons numériques en tête de ligne (le texte de la colonne voisine peut suivre sur la même ligne).
    const rowPrefix = line => {
      // La marge gauche élargie peut ramasser la fin d'un mot voisin : on réessaie avec les marges plus étroites.
      for (const margin of [0, 2, 4, 6, 8]) {
        const found = rowPrefixAt(line, left + margin);
        if (found) return found;
      }
      return null;
    };
    const rowPrefixAt = (line, from) => {
      const slice = (line || '').slice(from, right === Infinity ? undefined : right);
      const found =/^\s*(?:(?:Total|Base)\s+)?(?:(?:[+\-−–—�]?\d+\*?|[-–—−�]+|\*)(?=\s|$)\s*)+/.exec(slice);
      return found && (found[0].match(CELL) || []).length >= 3 ? found[0].replace(/^\s*(Total|Base)\b/, label => ' '.repeat(label.length)) : null;
    };
    let rowAt = -1;
    for (let k = head.line + 1; k < Math.min(lines.length, head.line + 6); k += 1) if (rowPrefix(lines[k])) { rowAt = k; break; }
    let rowLine = rowAt >= 0 ? lines[rowAt] : '';
    if (rowAt >= 0 && /^\s*Base\b/.test(windowOf(rowLine))) {
      for (let k = rowAt; k < Math.min(lines.length, rowAt + 4); k += 1) if (/\bTotal\b/.test(windowOf(lines[k]))) { rowLine = lines[k]; rowAt = k; break; }
    }
    let aligned = { cells: Array(12).fill(null), extra: 0, approximate: true, tokens: [] };
    if (rowAt >= 0) {
      let rowText = rowPrefix(rowLine) || '';
      let tokens = [...rowText.matchAll(CELL)].map(match => match[0]);
      // La Vitesse (M), à gauche de l'étiquette sur certaines pages, peut déborder de la fenêtre : un seul jeton manquant la précède.
      if (tokens.length === columns.length - 1) {
        const before = /(?:^|\s)((?:[+\-−–—�]?\d+\*?)|[-–—−�])\s*$/.exec(rowLine.slice(Math.max(0, left - 8), left));
        if (before) { tokens = [before[1], ...tokens]; rowText = ` ${before[1]} ${rowText}`; }
      }
      // Douze jetons : l'ordre suffit. Sinon (cases vides, tiret perdu) : alignement approché, à confirmer par la géométrie du PDF.
      aligned = tokens.length === columns.length ? { cells: padCells(tokens), extra: 0 } : { ...alignRow(rowText, columns.map(column => column - left)), approximate: true, tokens };
    } else {
      // Valeurs sur la ligne de l'en-tête (« M WS … W 5 55 30 … ») : l'ordre seul fait foi.
      const afterHeader = lines[head.line].slice(head.end, right === Infinity ? undefined : right);
      const tokens = [...afterHeader.matchAll(CELL)].map(match => match[0]);
      if (tokens.length >= 3) { rowAt = head.line; aligned = tokens.length === columns.length ? { cells: padCells(tokens), extra: 0 } : { cells: Array(12).fill(null), extra: 0, approximate: true, tokens }; }
      else rowAt = head.line;
    }
    // Corps : fenêtre de lignes sous la ligne des valeurs.
    const body = [];
    const rawBody = [];
    let blank = 0;
    for (let k = rowAt + 1; k < lines.length; k += 1) {
      const text = clean(stripBleed(windowOf(lines[k])));
      if (heads.some(other => other !== head && other.line === k && other.start < rightLimit && other.end > left)) break;
      // Bloc au format V5 (étiquettes seules sur leur ligne, lignes souvent doublées) : les blancs ne séparent pas le bloc du texte voisin ;
      // il se termine sur un titre en majuscules, trois blancs d'affilée ou le bloc suivant ; les marques de blanc ('') servent à couper
      // la dernière section à son premier paragraphe.
      const v5Block = /^(Attacks|Armour|Skills|Traits)(\s|$)/.test(body.find(line => line) || '');
      if (!text) { blank += 1; if (blank > (v5Block ? 3 : 2)) break; if (v5Block && body.length && body[body.length - 1] !== '') { body.push(''); rawBody.push(''); } continue; }
      if (v5Block && isTitleText(text) && !SECTION_START.test(text)) break;
      // Format V4 : après un blanc, seule une étiquette de section (ou le contenu d'une étiquette seule sur sa ligne) prolonge le bloc.
      if (!v5Block && blank && !SECTION_START.test(text) && !(BARE_LABEL.test(body[body.length - 1] || '') && blank <= 2)) break;
      // Titre d'un bloc suivant (dans la même fenêtre) : fin du corps.
      if (isTitleText(text) && lines.slice(k + 1, k + 4).some((_, d) => heads.some(other => other.line === k + 1 + d && other.start >= left - 8 && other.start < rightLimit))) break;
      blank = 0;
      body.push(text);
      rawBody.push(windowOf(lines[k]));
      if (body.length > 45) break;
    }
    // Fiche à deux colonnes internes (Vampire…) : la colonne de gauche d'abord, puis celle de droite.
    const inner = innerGutter(rawBody);
    const ordered = inner === null ? body : [...rawBody.map(line => clean(line.slice(0, inner))), ...rawBody.map(line => clean(line.slice(inner)))].filter((line, index, all) => line || (index > 0 && all[index - 1]));
    // Zone du titre : texte de la fenêtre juste au-dessus de l'en-tête (pour rapprocher un bloc d'un nom connu).
    const zone = clean([...Array(6).keys()].reverse().map(back => (back === 0 ? lines[head.line].slice(Math.max(0, head.start - 60), head.start) : windowOf(lines[head.line - back]))).join(' '));
    blocks.push({ title: clean(titleParts.join(' ')), zone, cells: aligned.cells, extra: aligned.extra, approximate: Boolean(aligned.approximate), tokens: aligned.tokens || aligned.cells, body: clean(ordered.join(' ')), bodyLines: ordered, row: rowAt, header: head.line });
  }
  return blocks;
}

// V4 : « Traits: … Skills: … » (étiquette suivie de deux-points, n'importe où dans le texte). V5 : étiquette seule en début de ligne.
const V4_LABELS = ['Attack Traits', 'Optional Traits', 'Traits', 'Skills', 'Talents', 'Trappings', 'Spells', 'Mutations', 'Optional', 'Petty Magic', 'Arcane Magic'];
const V4_LABEL_RE = new RegExp(`(?:^|\\s)(${V4_LABELS.join('|')}):`, 'g');
const V5_LABEL_RE = /^(Attacks|Armour|Skills|Traits|Optional Traits|Talents|Trappings|Spells)(?=\s|$)/;

/** Sections étiquetées du corps, sous forme { étiquette: texte } ; `lead` : texte avant la première étiquette. */
export function splitSections(bodyLines) {
  const lines = Array.isArray(bodyLines) ? bodyLines : [bodyLines];
  const joined = clean(lines.join(' '));
  const sections = {};
  const put = (label, text) => { sections[label] = sections[label] ? `${sections[label]} ${text}` : text; };
  const startsV5 = lines.some(line => line && V5_LABEL_RE.test(line) && !/:/.test(line.slice(0, 12)));
  if (!startsV5 && [...joined.matchAll(V4_LABEL_RE)].length) {
    const marks = [...joined.matchAll(V4_LABEL_RE)].map(found => ({ label: found[1], start: found.index + found[0].length, at: found.index }));
    marks.forEach((mark, index) => put(mark.label, clean(joined.slice(mark.start, index + 1 < marks.length ? marks[index + 1].at : joined.length))));
    return { sections, lead: clean(joined.slice(0, marks[0].at)), mode: 'v4' };
  }
  let current = null;
  const lead = [];
  const chunks = new Map();
  for (const line of lines) {
    const found = V5_LABEL_RE.exec(line);
    if (found) { current = found[1]; chunks.set(current, [clean(line.slice(found[0].length))]); } else if (current) chunks.get(current).push(line); else if (line) lead.push(line);
  }
  const last = [...chunks.keys()].pop();
  for (const [label, parts] of chunks) {
    let kept = parts;
    if (label === last) {
      // Dernière section : son premier paragraphe seulement (le texte qui suit est un encadré voisin) ; une ligne qui se prolonge
      // (virgule finale ou suite en minuscule) reste dans le paragraphe.
      kept = [];
      let seen = false;
      for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i];
        if (part === '') {
          const next = parts.slice(i + 1).find(line => line !== '');
          const previous = kept.filter(Boolean).pop() || '';
          if (seen && !(/,$/.test(previous) || (next && /^[a-zà-ÿ(]/.test(next)))) break;
          continue;
        }
        kept.push(part); if (part) seen = true;
      }
    }
    sections[label] = clean(kept.filter(Boolean).join(' '));
  }
  return { sections, lead: clean(lead.join(' ')), mode: 'v5' };
}

/** Éléments d'une liste séparés par des virgules hors parenthèses. */
export function splitList(text) {
  const items = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if (char === '(' || char === '[') depth += 1;
    if (char === ')' || char === ']') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) { items.push(current); current = ''; } else current += char;
  }
  items.push(current);
  return items.map(item => clean(item)).filter(Boolean);
}

/** Valeur numérique d'une case : null pour un tiret ou une case vide. */
export const cellValue = cell => {
  if (cell == null || DASH.test(cell) || cell === '*') return null;
  const text = String(cell).replace('*', '');
  return NEGATIVE.test(text) ? -Number(text.slice(1)) : Number(text);
};
