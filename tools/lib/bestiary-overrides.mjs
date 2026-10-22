/**
 * Cases de valeurs relues sur l'IMAGE de la page (pdftoppm) pour les lignes que le texte extrait ne permet pas d'aligner (gabarits
 * à cases vides, tiret illisible). Clé : « livre:page physique:rang du bloc sur la page ». Notation : `Clé=valeur` pour chaque case
 * remplie (M WS BS S T I Ag Dex Int WP Fel W), `-` pour un tiret imprimé ; toute autre case est vide (aucun modificateur).
 */
const COLUMNS = ['M', 'WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel', 'W'];
const row = text => ({
  cells: COLUMNS.map(column => {
    const found = new RegExp(`(?:^|\\s)${column}=(\\S+)`).exec(text);
    return found ? found[1] : null;
  })
});

export const CELL_OVERRIDES = Object.freeze({
  // Temple of Spite (L09) : gabarits de Druchii, pages 53 à 56.
  'L09:53:0': row('WS=+25 BS=+20 S=+10 I=+20 Ag=+10 WP=+15 Fel=+20'),
  'L09:53:1': row('WS=+10 BS=+10 S=+5 I=+5 Ag=+10 WP=+10'),
  'L09:53:2': row('WS=+20 BS=+20 S=+10 I=+20 Ag=+20 WP=+15 Fel=+20'),
  'L09:53:3': row('WS=+15 BS=+10 S=+15 I=+20 Ag=+10 WP=+15'),
  'L09:54:0': row('WS=+10 BS=+5 S=+5 I=+10 Ag=+10 WP=+10'),
  'L09:54:1': row('WS=+10 BS=+20 S=+10 I=+15 Ag=+20 WP=+15 Fel=+10'),
  'L09:54:2': row('BS=+15 I=+10 Ag=+15 WP=+10'),
  'L09:54:3': row('WS=+30 BS=+20 S=+10 I=+20 Ag=+20 Dex=+10 Int=+20 WP=+20 Fel=+10'),
  'L09:55:0': row('WS=+5 I=+20 Ag=+10 Dex=+10 Int=+30 WP=+30 Fel=+20'),
  'L09:55:1': row('I=+10 Int=+15 WP=+15 Fel=+10'),
  'L09:55:2': row('WS=+10 S=+10 I=+10 Ag=+10 WP=+10'),
  'L09:56:0': row('WS=+20 S=+10 I=+20 Ag=+20 Int=+10 WP=+20 Fel=+10'),
  'L09:56:1': row('WS=+10 BS=+5 I=+10 Ag=+5 Dex=+5 Int=+10 Fel=+15'),
  'L09:56:2': row('WS=+5 BS=+10 I=+5 Ag=+5 Int=+5 WP=+5'),
  'L09:56:3': row('WS=+5 S=+5 T=+5 I=+15 Ag=+10 Dex=+5 Int=+5 Fel=+15'),
  // Sylvania (L10) : trois PNJ dont la ligne de valeurs est mal alignée par l'extraction.
  'L10:81:0': row('M=4 WS=37 BS=42 S=29 T=36 I=34 Ag=25 Dex=26 Int=25 WP=36 Fel=35 W=11'),
  'L10:91:0': row('M=4 WS=31 BS=24 S=38 T=37 I=32 Ag=37 Dex=26 Int=38 WP=31 Fel=32 W=12'),
  'L10:93:0': row('M=4 WS=46 BS=22 S=46 T=47 I=36 Ag=36 Dex=32 Int=27 WP=26 Fel=40 W=16'),
  // Tribes and Tribulations (L12) : gabarits des Orques, Gobelins et Trolls.
  'L12:16:0': row('WS=+5 S=+5 T=+5 I=+10 WP=+5'),
  'L12:16:1': row('BS=+5 I=+10 Ag=+10 WP=+5'),
  'L12:16:3': row('WS=+10 S=+10 T=+10 I=+20 Ag=+10 WP=+15'),
  'L12:17:0': row('WS=+25 BS=+10 S=+15 T=+15 I=+25 Ag=+20 Int=+10 WP=+25 Fel=+10'),
  'L12:17:1': row('T=+5 I=+15 Dex=+10 Int=+15 WP=+15'),
  'L12:17:2': row('WS=+10 S=+5 T=+15 I=+20 Ag=+15 Dex=+20 Int=+35 WP=+30 Fel=+10'),
  'L12:17:3': row('WS=+35 BS=+10 S=+25 T=+30 I=+30 Ag=+25 Int=+15 WP=+35 Fel=+15'),
  'L12:88:0': row('I=+5'),
  'L12:88:1': row('WS=+10 S=+5 I=+5 WP=+10'),
  'L12:88:2': row('WS=-10 T=+10 I=+5 WP=+10'),
  'L12:88:3': row('T=+5'),
  'L12:89:0': row('M=-1 WS=+10 S=+10 T=+10 I=-5 WP=+5'),
  'L12:89:1': row('M=+1 WS=+10 I=+10 Ag=+5 Int=-5 WP=-10'),
  'L12:89:2': row('S=+10 T=+10 I=+5 Int=+30 WP=+20'),
  'L12:89:3': row('M=-1 S=+5 T=+5 I=-3 Ag=-5'),
  // The Horned Rat Companion (L22) : le rat à deux têtes (BS, Dex et Fel absents).
  'L22:14:1': row('M=5 WS=35 BS=- S=40 T=35 I=25 Ag=25 Dex=- Int=17 WP=15 Fel=- W=11')
});

/**
 * Entrées que l'inventaire E0 classe « profile » alors que le livre imprime des modificateurs (cases vides, aucune Blessures) : ce sont
 * des gabarits. Le genre de la fiche est corrigé, le genre de l'inventaire est conservé dans `inventoryKind` (voir E-D16).
 */
export const TEMPLATE_IDS = Object.freeze(new Set([
  'E0-P-326', 'E0-P-327', 'E0-P-328', 'E0-P-329', 'E0-P-330', 'E0-P-331', 'E0-P-332', 'E0-P-333', 'E0-P-334', 'E0-P-335', 'E0-P-336', 'E0-P-337', 'E0-P-338', 'E0-P-339', 'E0-P-340'
]));
