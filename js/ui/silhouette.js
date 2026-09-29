/**
 * Silhouette de localisation (Jouer). Le côté droit du personnage est dessiné
 * à gauche pour le lecteur, comme sur une fiche vue de face. La zone touchée
 * par l'aperçu de résolution s'allume ; chaque zone affiche ses PA.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

export const SILHOUETTE_TITLE = 'Tête 01–09 · Bras G 10–24 · Bras D 25–44 · Corps 45–79 · Jambe G 80–89 · Jambe D 90–00';

// Coordonnées dans un viewBox 0 0 120 160 ; `armor` est la clé de Participant.armor.
const ZONES = Object.freeze([
  { id: 'head', label: 'Tête', armor: 'head', shape: 'circle', cx: 60, cy: 18, r: 14 },
  { id: 'arm-right', label: 'Bras droit', armor: 'arms', shape: 'rect', x: 22, y: 36, width: 17, height: 52 },
  { id: 'body', label: 'Corps', armor: 'body', shape: 'rect', x: 42, y: 35, width: 36, height: 56 },
  { id: 'arm-left', label: 'Bras gauche', armor: 'arms', shape: 'rect', x: 81, y: 36, width: 17, height: 52 },
  { id: 'leg-right', label: 'Jambe droite', armor: 'legs', shape: 'rect', x: 42, y: 94, width: 17, height: 62 },
  { id: 'leg-left', label: 'Jambe gauche', armor: 'legs', shape: 'rect', x: 61, y: 94, width: 17, height: 62 }
]);

function svg(tag, attrs = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

/** Zone id for a resolution location (`{ key: 'ARM', side: 'right' }` → `arm-right`). */
export function locationZone(location) {
  if (!location?.key) return null;
  if (location.key === 'HEAD') return 'head';
  if (location.key === 'BODY') return 'body';
  const side = location.side === 'left' ? 'left' : 'right';
  if (location.key === 'ARM') return `arm-${side}`;
  if (location.key === 'LEG') return `leg-${side}`;
  return null;
}

function armorValue(armor, key) {
  const value = Number(armor?.[key]);
  return Number.isFinite(value) ? value : 0;
}

/**
 * @param {{ armor?: object, location?: object|null, name?: string }} options
 * @returns {HTMLElement} figure avec la silhouette et sa légende
 */
export function renderSilhouette({ armor = {}, location = null, name = '' } = {}) {
  const hitZone = locationZone(location);
  const figure = document.createElement('figure');
  figure.className = 'silhouette';

  const drawing = svg('svg', { viewBox: '0 0 120 160', role: 'img', focusable: 'false' });
  const title = svg('title');
  const hitZoneLabel = hitZone ? ZONES.find(zone => zone.id === hitZone)?.label : '';
  title.textContent = `Localisation${name ? ` de ${name}` : ''} : ${SILHOUETTE_TITLE}${hitZoneLabel ? `. Zone touchée : ${hitZoneLabel.toLocaleLowerCase()}` : ''}`;
  drawing.appendChild(title);

  ZONES.forEach(zone => {
    const group = svg('g', { class: `silhouette-zone${zone.id === hitZone ? ' is-hit' : ''}`, 'data-zone': zone.id });
    const shape = zone.shape === 'circle'
      ? svg('circle', { cx: zone.cx, cy: zone.cy, r: zone.r })
      : svg('rect', { x: zone.x, y: zone.y, width: zone.width, height: zone.height, rx: 6 });
    const cx = zone.shape === 'circle' ? zone.cx : zone.x + zone.width / 2;
    const cy = zone.shape === 'circle' ? zone.cy : zone.y + zone.height / 2;
    const text = svg('text', { x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    text.textContent = String(armorValue(armor, zone.armor));
    group.append(shape, text);
    drawing.appendChild(group);
  });
  figure.appendChild(drawing);

  const caption = document.createElement('figcaption');
  caption.className = 'silhouette-legend num';
  caption.textContent = hitZone && location?.roll !== undefined
    ? `${location.roll} → ${String(location.name || hitZoneLabel).toLocaleLowerCase()}`
    : 'PA par zone';
  figure.appendChild(caption);
  return figure;
}
