/**
 * Glyphes que pdftotext rend en U+FFFD (police sans table Unicode). Chaque règle nomme le mot imprimé et le glyphe lu sur la page du PDF
 * (rendu en image, 23/10/2026) : « Elthárin » (L07, L10, L14), « Drakenhöhenzug » (L10), « Zweihänder » (L12, L24), « Phâ's Protection » (L17 p. 61),
 * « Mòna » (accent grave, L17 p. 215-217 ; relu sur la page 216), « Bögen » (L26 p. 35), « 11/– » (L18 p. 74), « (Chaos – Tzeentch) » (L21 p. 85), « d10 × 30 » (L26 p. 109),
 * puces de Lord Skrolk (L07 p. 62). Un glyphe qui n'est dans aucune règle reste U+FFFD : jamais deviné.
 */
const RULES = [
  [/Elth�rin/g, 'Elthárin'],
  [/Drakenh�henzug/g, 'Drakenhöhenzug'],
  [/Zweih�nder/g, 'Zweihänder'],
  [/Ph�(?='s Protection)/g, 'Phâ'],
  [/M�na/g, 'Mòna'],
  [/M�NA/g, 'MÒNA'],
  [/B�gen/g, 'Bögen'],
  [/(\b\d+\/)�/g, '$1–'],
  [/(\(Chaos )�( Tzeentch\))/g, '$1–$2'],
  [/(\bd10 )�( \d+ Gold Crown)/g, '$1×$2'],
  [/�(?= (?:Petty Magic|The Lore of|The Skaven Lore))/g, '•']
];

export const repairGlyphs = text => RULES.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
