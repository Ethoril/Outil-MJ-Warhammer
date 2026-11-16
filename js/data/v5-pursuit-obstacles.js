// Table des Obstacles de poursuite (d10), Livre de base V5 p. 158-159, résumée en mots à nous (docs/specs/poursuite-v5/spec.md).
// Chaque compétence porte un préfixe replié (minuscules, sans accents) qui se raccorde au début du nom de la compétence
// du personnage (« corps a corps » couvre « Corps à corps (Base) »), et la manière de s'en servir.
const skill = (prefix, label, use = '') => Object.freeze({ prefix, label, use });

export const PURSUIT_OBSTACLES = Object.freeze([
  { id: 'chariot', label: 'Chariot renversé, marchandises en travers du chemin', skills: [skill('athletisme', 'Athlétisme', 'sauter'), skill('esquive', 'Esquive', 'contourner')] },
  { id: 'garde', label: 'Garde trop curieux qui veut vous arrêter', skills: [skill('charme', 'Charme'), skill('intimidation', 'Intimidation')] },
  { id: 'eau', label: 'Eau jusqu’à la poitrine : bassin, canal, ruisseau', skills: [skill('natation', 'Natation', 'plonger'), skill('athletisme', 'Athlétisme', 'sauter')] },
  { id: 'passant', label: 'Passant agressif ou animal affolé en travers', skills: [skill('esquive', 'Esquive'), skill('corps a corps', 'Corps à corps', 'repousser')] },
  { id: 'boue-foule', label: 'Sol boueux ou foule compacte', skills: [skill('athletisme', 'Athlétisme'), skill('resistance', 'Résistance', 'forcer'), skill('intimidation', 'Intimidation', 'ouvrir un passage')] },
  { id: 'decouvert', label: 'Terrain découvert : pure vitesse', skills: [skill('athletisme', 'Athlétisme'), skill('conduite', 'Conduite'), skill('chevaucher', 'Chevaucher')] },
  { id: 'ruelle-vegetation', label: 'Ruelle sombre ou végétation dense', skills: [skill('discretion', 'Discrétion', 'se cacher'), skill('pistage', 'Pistage', 'garder la trace')] },
  { id: 'trebuchement', label: 'Nid-de-poule ou racine : vous ou votre monture trébuchez', skills: [skill('resistance', 'Résistance', 'serrer les dents'), skill('emprise sur les animaux', 'Emprise sur les animaux', 'calmer la monture')] },
  { id: 'niveau', label: 'Changement de niveau : toits ou cimes des arbres', skills: [skill('athletisme', 'Athlétisme', 'sauter'), skill('escalade', 'Escalade')] },
  { id: 'dedale', label: 'Dédale de ruelles ou de canyons : l’autre camp est perdu de vue', skills: [skill('perception', 'Perception', 'le retrouver'), skill('orientation', 'Orientation', 'ne pas se perdre')] }
].map(row => Object.freeze({ ...row, skills: Object.freeze(row.skills) })));
