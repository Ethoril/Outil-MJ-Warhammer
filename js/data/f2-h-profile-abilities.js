// F2-H: règles de créatures liées aux profils vérifiés sur les pages sources.
// Les identifiants E0-P empêchent qu'une règle soit appliquée à une autre créature.
export const F2_H_PROFILE_ABILITIES = Object.freeze([
  { key: 'taal-woods', profileId: 'E0-P-001', book: 'L11', source: 'p.10', label: 'Bois de Taal', attack: 'Antlers', qualities: ['Empaleuse', 'Perforante'] },
  { key: 'kurnous-woods', profileId: 'E0-P-002', book: 'L11', source: 'p.10', label: 'Bois de Kurnous', attack: 'Antlers', qualities: ['Rapide', 'Empaleuse', 'Perforante'] },
  { key: 'arachnarok-venom-webs', profileId: 'E0-P-004', book: 'L11', source: 'p.13', label: 'Toiles venimeuses', trigger: 'toile touche et Enchevêtré', state: 'Empoisonné' },
  { key: 'flying-death-skull-zero-wounds', profileId: 'E0-P-565', book: 'L18', source: 'p.107', label: 'Crâne inerte', trigger: 'Blessures à zéro', outcome: 'crâne ordinaire' },
  { key: 'gravelord-variants', profileName: 'Hans Grüber', book: 'L18', source: 'p.113', label: 'Seigneur des tombes', reminder: 'Options MJ si Grüber meurt : Destin, esprit vengeur ou possession. Aucune mort ni variante n’est déclenchée automatiquement.' },
  { key: 'cliff-spider-lasso', profileId: 'E0-P-744', book: 'L22', source: 'p.73', label: 'Araignée de falaise', senseRangeYards: 40, dodgeTest: 'Agilité +0', onFailure: 'Enchevêtré par niveau d’échec', canReelSameRound: true, cutSilk: 'attaque tranchante infligeant plus de 5 dégâts', bite: 'Venin' },
  { key: 'great-cat-deathblow', profileId: 'E0-P-792', book: 'L23', source: 'p.87 (PDF 89)', label: 'Coup mortel des grands félins', overrideTrait: 'Coup mortel', ignoresSize: true },
  { key: 'farmyard-beast-spit', profileId: 'E0-P-807', book: 'L23', source: 'p.106 (PDF 108)', label: 'Crachat des bêtes de ferme', attack: 'Crachat', rangeYards: 3, test: 'CT', opposedTest: 'Résistance +0', onFailure: 'Empoisonné' },
  { key: 'sea-elemental-reminder', profileId: 'E0-P-909', book: 'L25', source: 'p.142', label: 'Élémentaire de mer', reminder: 'Les capacités marines et sorts imprimés au profil restent ceux de sa fiche.' },
  { key: 'gargantuan-ship-reminder', profileId: 'E0-P-910', book: 'L25', source: 'p.143', label: 'Gargantuan', reminder: 'Constrictor de navire, tests étendus contre la coque et dégâts d’équipage : résolution navale non modélisée.' },
  { key: 'gargantuan-electric-discharge', profileId: 'E0-P-910', book: 'L25', source: 'p.143', label: 'Décharge électrique du Gargantuan', trigger: 'cible agrippée', damage: 10, ignoresArmour: 'métal non magique', test: 'Endurance Difficile (−10)', onFailure: 'Sonné', selfTest: 'Endurance Moyenne (+20)', selfFailure: 'Fatigué', fatiguedDamage: 6 },
  { key: 'merwyrm-fanged-maw-venom', profileId: 'E0-P-913', book: 'L25', source: 'p.145', label: 'Venin des crocs du Merwyrm', attack: 'Fanged Maw', trait: 'Venin (Difficile)' },
  { key: 'black-leviathan-ship-reminder', profileId: 'E0-P-916', book: 'L25', source: 'p.147', label: 'Léviathan noir', reminder: 'Collision de navire (CR 50) : résolution navale non modélisée.' },
  { key: 'black-leviathan-fire-reminder', profileId: 'E0-P-916', book: 'L25', source: 'p.147', label: 'Léviathan noir et feu', reminder: 'Seul un grand feu de joie peut l’effrayer; des torches ne suffisent pas. La peur reste une décision du MJ.' },
  { key: 'wulfrik-favoured-champion', profileId: 'E0-P-921', book: 'L25', source: 'p.155', label: 'Champion favori', test: ['Charme', 'Intimidation', 'Commandement'], target: 'adepte du Chaos', modifier: 10 },
  { key: 'wulfrik-head-taker', profileId: 'E0-P-921', book: 'L25', source: 'p.155', label: 'Preneur de têtes', trigger: 'Blessure Critique', location: 'tête', choiceByGm: true },
  { key: 'wulfrik-champion-slayer', profileId: 'E0-P-921', book: 'L25', source: 'p.155', label: 'Tueur de champions', trigger: 'chef ou champion adverse en duel singulier', momentum: 1, choiceByGm: true }
].map(entry => Object.freeze(entry)));
