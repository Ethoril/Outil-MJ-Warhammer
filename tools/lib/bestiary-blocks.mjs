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
const SECTION_START = /^(Lore of [A-Z][a-z]+(?=:)|Magic of [A-Z][a-z]+(?=:)|High Magic(?=:)|Yenlui State|Obsession|Traits and Talents|Traits|Attack Traits|Skills|Talents|Trappings|Possessions|Spells|SPELLS|Petty(?=:)|(?:Beasts|Death|Fire|Heavens|Life|Light|Metal|Shadows|Hedgecraft|Necromancy|Daemonology|Witchcraft|Tzeentch|Nurgle|Slaanesh|Khorne)(?=:)|Arcane(?: and Lore)?(?=:)|(?:Arcane|Petty Magic) Spells(?=:)|(?:Lore of [A-Z][a-z]+|Petty|Witchcraft|Daemonology|Necromancy|Hedgecraft|Chaos) Spells(?=:)|Mutations|Optional|Options|Armour|Attacks|Petty Magic|Arcane Magic|Weapons?|Special|Fate Points?|Miracles)\b/;
const BARE_LABEL = /^(Attacks|Armour|Skills|Traits and Talents|Traits|Optional Traits|Talents|Trappings|Spells)$/;
/** Lecture élargie (étiquettes décalées, interligne double, « Options: ») : réservée aux livres importés depuis L16, pour ne pas bouger les livres déjà relus. */
let lenient = false;
export const setLenient = value => { lenient = Boolean(value); };

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
    // En-tête à cheval sur la gouttière (L10 p. 81 : valeurs en bas de la colonne de gauche, corps dans celle de droite) : la gouttière ne le borne pas.
    const straddle = gutter !== null && head.start < gutter - 5 && head.end > gutter + 2;
    if (gutter && head.start < gutter - 5 && !straddle) right = Math.min(right, gutter);
    let left = Math.max(gutter && head.start > gutter ? gutter + 1 : 0, head.start - (lenient ? 6 : 3));
    const atGutter = gutter !== null && right === gutter;
    const windowOf = line => {
      const text = line || '';
      if (!atGutter) return text.slice(left, right === Infinity ? undefined : right);
      // Gouttière tombée dans un mot de la colonne de gauche (« Stone », « 56, ») : le mot est gardé entier (3 caractères au plus).
      const spill = /^\S{1,3}(?=\s|$)/.exec(text.slice(right));
      const cut = text[right - 1] && text[right - 1] !== ' ' && spill ? right + spill[0].length : right;
      return text.slice(left, cut);
    };
    // Voisin plus bas que ce bloc (L10 p. 68 : Crypt Horror sous Crypt Ghast) : un libellé de section centré (« Traits ») qui dépasse à droite
    // de la fenêtre, au-dessus du titre du voisin, appartient à ce bloc. Seul un libellé seul sur sa part de ligne est repris.
    const centredLabel = k => {
      if (!neighbour || neighbour.line <= head.line || k >= neighbour.line - 3 || right === Infinity) return '';
      const whole = clean((lines[k] || '').slice(left));
      return BARE_LABEL.test(whole) && whole !== clean(windowOf(lines[k])) ? whole : '';
    };
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
    // Les étiquettes Base/Adv./Total précèdent parfois l'en-tête (L01 p. 26) : fenêtre élargie à gauche pour elles seules.
    const labelWindow = line => (line || '').slice(Math.max(gutter && head.start > gutter ? gutter + 1 : 0, head.start - 12), right === Infinity ? undefined : right);
    if (rowAt >= 0 && /^\s*Base\b/.test(labelWindow(rowLine))) {
      for (let k = rowAt; k < Math.min(lines.length, rowAt + 4); k += 1) if (/\bTotal\b/.test(labelWindow(lines[k]))) { rowLine = lines[k]; rowAt = k; break; }
      // Les étiquettes de section (« Skills: ») démarrent à la marge des étiquettes Base/Total : le corps est lu depuis cette marge.
      left = Math.max(gutter && head.start > gutter ? gutter + 1 : 0, head.start - 12);
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
    // Étiquette de section décalée à gauche de l'en-tête (L03 p. 23 : « Skills: » quatre colonnes avant « M WS ») : la fenêtre s'y aligne,
    // à condition que seuls des blancs la précèdent (le texte de la colonne voisine n'est jamais ramassé).
    const floor = Math.max(gutter && head.start > gutter ? gutter + 1 : 0, head.start - 12);
    // (borné aux 25 lignes du corps ; l'étiquette la plus à gauche fixe la marge, « Trappings: » étant parfois décalée de deux colonnes seulement)
    let labelLeft = left;
    for (let k = rowAt + 1; k < Math.min(lines.length, rowAt + 26); k += 1) {
      const found = /^( *)(?:Skills|Traits\*?|Talents|Trappings|Attacks|Armour|Spells)(?::|\s*$)/.exec((lines[k] || '').slice(floor, right === Infinity ? undefined : right));
      if (found && floor + found[1].length < labelLeft) labelLeft = floor + found[1].length;
    }
    left = straddle ? gutter + 1 : labelLeft;
    // Corps : fenêtre de lignes sous la ligne des valeurs.
    const body = [];
    const rawBody = [];
    let blank = 0;
    for (let k = rowAt + 1; k < lines.length; k += 1) {
      let text = centredLabel(k) || clean(stripBleed(windowOf(lines[k])));
      // Une étiquette « Traits: » peut commencer quelques colonnes avant l'en-tête (L16 p. 30, 45) : fenêtre élargie à gauche pour elle seule.
      if (lenient && !SECTION_START.test(text)) {
        const wider = clean((lines[k] || '').slice(Math.max(gutter && head.start > gutter ? gutter + 1 : 0, left - 8), right === Infinity ? undefined : right)).replace(/^\S*\s+(?=(?:Attack Traits|Optional Traits|Traits|Skills|Talents|Trappings):)/, '');
        if (/^(?:Attack Traits|Optional Traits|Traits|Skills|Talents|Trappings):/.test(wider)) text = wider;
      }
      if (heads.some(other => other !== head && other.line === k && other.start < rightLimit && other.end > left)) break;
      // Bloc au format V5 (étiquettes seules sur leur ligne, lignes souvent doublées) : les blancs ne séparent pas le bloc du texte voisin ;
      // il se termine sur un titre en majuscules, trois blancs d'affilée ou le bloc suivant ; les marques de blanc ('') servent à couper
      // la dernière section à son premier paragraphe.
      const v5Block = /^(Attacks|Armour|Skills|Traits)(\s|$)/.test(body.find(line => line) || '');
      // Colonnes imbriquées (L01 p. 14) : le titre ou l'en-tête du profil voisin laisse des lignes vides AVANT le premier mot du corps ; elles ne le terminent pas.
      if (!text && !body.length && k - rowAt <= 6) continue;
      if (!text) { blank += 1; if (blank > (v5Block ? 3 : 2)) break; if (v5Block && body.length && body[body.length - 1] !== '') { body.push(''); rawBody.push(''); } continue; }
      if (v5Block && isTitleText(text) && !SECTION_START.test(text)) break;
      // Format V4 : après un blanc, seule une étiquette de section (ou le contenu d'une étiquette seule sur sa ligne) prolonge le bloc.
      // Mise en page à interligne double (L16 p. 28) : un seul blanc, suivi d'une suite en minuscule ou entre parenthèses d'une liste commencée, prolonge le bloc.
      const spaced = lenient && blank === 1 && /^[a-zà-ÿ(]/.test(text) && body.some(line => /^(?:Attack Traits|Optional Traits|Traits|Skills|Talents|Trappings):/.test(line)) && body.length > 0 && !/[.]$/.test(body[body.length - 1] || '');
      // L14 (Sea Wardens) : une ligne de richesse (« Gold 3 ») précédée d'un blanc ouvre le corps, sans quoi il reste vide.
      // Même livre : « Trappings: … items to hand: » est suivi, après un blanc, de la liste elle-même.
      const trappingsList = blank === 1 && /(?:to hand|following items|equipped with):$/.test(body[body.length - 1] || '') && body.some(line => /^Trappings:/.test(line));
      const wealthOpening = !body.length && /^(?:Gold|Silver|Brass)\s+\d+\s*$/.test(text);
      // Note à astérisque d'un bloc V4 (« *These Traits only come into play… ») : prolonge le bloc après un blanc.
      const starNote = blank === 1 && /^\*[A-Za-z]/.test(text) && body.some(line => /^Traits\*:/.test(line));
      // Un blanc isolé au milieu des Compétences (L12 p. 48 : « Melee (Basic) » puis « 90, Perception 70 ») : la valeur qui suit prolonge la liste.
      const lastLabel = [...body].reverse().find(line => /^(?:Attack Traits|Optional Traits|Traits|Skills|Talents|Trappings):/.test(line));
      const skillsTail = blank === 1 && /^\d+,\s/.test(text) && /^Skills:/.test(lastLabel || '');
      // Règle spéciale d'un Trait (« A Fool's End � Soporific Breath… », L11 p. 30) : son paragraphe, après un blanc, précède encore les Compétences du bloc.
      const ruleStart = blank === 1 && /^[A-Z][A-Za-z' !,&-]{2,40}\s[�–—]\s/.test(text) && body.some(line => /^(?:Attack Traits|Traits):/.test(line)) && !body.some(line => /^(?:Skills|Talents|Trappings):/.test(line));
      if (!v5Block && blank && !SECTION_START.test(text) && !spaced && !skillsTail && !ruleStart && !starNote &&!wealthOpening && !trappingsList && !(BARE_LABEL.test(body[body.length - 1] || '') && blank <= 2)) break;
      // Titre d'un bloc suivant (dans la même fenêtre) : fin du corps.
      if (isTitleText(text) && lines.slice(k + 1, k + 4).some((_, d) => heads.some(other => other.line === k + 1 + d && other.start >= left - 8 && other.start < rightLimit))) break;
      blank = 0;
      body.push(text);
      rawBody.push(centredLabel(k) || windowOf(lines[k]));
      if (body.length > (v5Block ? 80 : 45)) break;
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
const V4_LABELS_BASE = ['Yenlui State', 'Obsession', 'Attack Traits', 'Optional Traits', 'Traits', 'Skills', 'Talents', 'Trappings', 'Possessions', 'Spells', 'Petty', 'Arcane(?: Magic)? and Lore(?: Spells)?', 'Arcane', '(?:Arcane|Petty Magic) Spells', '[^\\s:]+ Marsh Magic', 'Little Waaagh!', 'Lore of the Big Waaagh!', 'Lore of [A-Z][a-z]+ Spells', '(?:Petty|Witchcraft|Daemonology|Necromancy|Hedgecraft|Chaos) Spells','Mutations', 'Optional', 'Petty Magic', 'Arcane Magic', 'Fate Points?', 'Miracles', 'Armour by Location', 'Special Rules'];
const LORE_PATTERNS = ['Lore of [A-Z][a-z]+', 'Magic of [A-Z][a-z]+', 'High Magic'];
// « Traits*: » (L01 p. 79) : Traits conditionnels, la note à astérisque suit ; l'astérisque est retiré de l'étiquette.
const labelRe = wide => new RegExp(`(?:^|\\s)(${[...(wide ? [...V4_LABELS_BASE, 'Options'] : [...V4_LABELS_BASE, ...LORE_PATTERNS])].join('|')})\\*?:`, 'g');
const V5_LABEL_RE = /^(Attacks|Armour(?!\s+by\s+Location)|Skills|Traits and Talents|Traits|Optional Traits|Talents|Trappings|Spells)(?=\s|$)/;

/** Sections étiquetées du corps, sous forme { étiquette: texte } ; `lead` : texte avant la première étiquette. */
export function splitSections(bodyLines) {
  const lines = Array.isArray(bodyLines) ? bodyLines : [bodyLines];
  // Intitulé « SPELLS » centré (sans deux-points) : même rôle que « Spells: ».
  const joined = clean(lines.join(' ')).replace(/(^|\s)SPELLS(?=\s)/g, '$1Spells:');
  const sections = {};
  const put = (label, text) => { sections[label] = sections[label] ? `${sections[label]} ${text}` : text; };
  // Un bloc V5 commence par une étiquette seule ; une ligne « Armour of … » du texte voisin, plus bas, ne le rend pas V5 (L16 p. 7).
  const firstLine = lines.find(line => line) || '';
  // Un bloc qui s'ouvre sur une étiquette V4 (« Traits: ») n'est jamais V5 : sa ligne « Armour 3 (9), Infected… » est un Trait, pas la rubrique Armour (L12 p. 36).
  const opensV4 = /^(?:Attack Traits|Optional Traits|Traits|Skills|Talents|Trappings|Spells)\*?:/.test(firstLine);
  const startsV5 = lenient ? V5_LABEL_RE.test(firstLine) && !/:/.test(firstLine.slice(0, 12)) : !opensV4 && lines.some(line => line && V5_LABEL_RE.test(line) && !/:/.test(line.slice(0, 12)));
  const V4_LABEL_RE = labelRe(lenient);
  if (!startsV5 && [...joined.matchAll(V4_LABEL_RE)].length) {
    const marks = [...joined.matchAll(V4_LABEL_RE)].map(found => ({ label: found[1], start: found.index + found[0].length, at: found.index }));
    marks.forEach((mark, index) => {
      const text = clean(joined.slice(mark.start, index + 1 < marks.length ? marks[index + 1].at : joined.length));
      put(mark.label, mark.label === 'Traits' ? text.replace(/\s\*[A-Za-z].*$/, '') : text);
    });
    return { sections, lead: clean(joined.slice(0, marks[0].at)), mode: 'v4' };
  }
  let current = null;
  const lead = [];
  const chunks = new Map();
  for (const line of lines) {
    const found = V5_LABEL_RE.exec(line);
    // Bloc V5 de L10 : « Armour +3 AP All, Night Vision… » ouvre la liste des Traits ; ce n'est pas la rubrique Armour (L10 p. 51).
    if (found && found[1] === 'Armour' && current === 'Traits' && /^Armour\s+\+\d+\s+AP\b/.test(line)) { chunks.get(current).push(line); continue; }
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
          // Les Traits décrits (V5) se suivent en paragraphes « Nom : clause » : un paragraphe qui s'ouvre ainsi prolonge la rubrique (L09 p. 46).
          const nextTrait = (label === 'Traits' || label === 'Optional Traits') && next && /^[A-Z][A-Za-z'’ -]+(?: \([^)]*\))?(?: [+\d]\d*)?:\s/.test(next);
          if (seen && !(/,$/.test(previous) || nextTrait || (next && /^[a-zà-ÿ(]/.test(next)))) break;
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
