/**
 * Transcription K2 des tables L06 de mutations. Données uniquement : aucun effet
 * n'est appliqué ici. Chaque résumé est rédigé en français, sans phrase source.
 */
const source = (table, range) => ({
  book: 'L06', edition: 'V5', printedPage: 189, pdfPage: 189,
  referenceF2: 'F-L06-0500', location: `${table}, plage ${range}`
});
const deepFreeze = value => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
};
const entry = (table, index, low, high, range, name, summary, effects, questionsMJ = []) => ({
  id: `L06-${table === 'physical' ? 'PHY' : 'MEN'}-${String(index).padStart(2, '0')}`,
  selection: { min: low, max: high, printed: range }, name, summary,
  source: source(table === 'physical' ? 'Physical Corruption Table' : 'Mental Corruption Table', range),
  conversion: { status: 'not-required', editionSource: 'V5', note: 'Entrée déjà publiée en V5.' },
  effects, mechanicStatus: questionsMJ.length ? 'assiste' : 'structure', questionsMJ,
  verification: { status: 'transcrit-sur-page', pdfPage: 189, independentReview: { status: 'relue-indépendamment', reviewer: 'review_k1', date: '2026-10-28', pdfPage: 189 } }
});

const physical = [
  entry('physical', 1, 1, 5, '01–05', 'Animalistic Legs', 'Jambes animales : le Mouvement augmente de 1.', [{ kind: 'characteristic-modifier', characteristic: 'M', amount: 1 }]),
  entry('physical', 2, 6, 10, '06–10', 'Corpulent', 'Corpulence : Force et Endurance +5, Mouvement −1.', [{ kind: 'characteristic-modifier', characteristic: 'F', amount: 5 }, { kind: 'characteristic-modifier', characteristic: 'E', amount: 5 }, { kind: 'characteristic-modifier', characteristic: 'M', amount: -1 }]),
  entry('physical', 3, 11, 15, '11–15', 'Distended Digits', 'Doigts distendus : Dextérité +10.', [{ kind: 'characteristic-modifier', characteristic: 'Dex', amount: 10 }]),
  entry('physical', 4, 16, 20, '16–20', 'Emaciated', 'Émacié : Agilité +5, Force −10.', [{ kind: 'characteristic-modifier', characteristic: 'Ag', amount: 5 }, { kind: 'characteristic-modifier', characteristic: 'F', amount: -10 }]),
  entry('physical', 5, 21, 25, '21–25', 'Enormous Eye', 'Œil énorme : acquiert Sens aiguisé (vue).', [{ kind: 'gain-talent', talentId: 'talent-acute-sense', sourceTalentName: 'Acute Sense', specializationSource: 'Sight', specialization: 'Vue' }]),
  entry('physical', 6, 26, 30, '26–30', 'Extra Leg Joints', 'Articulations supplémentaires : Agilité +5.', [{ kind: 'characteristic-modifier', characteristic: 'Ag', amount: 5 }]),
  entry('physical', 7, 31, 35, '31–35', 'Extra Mouth', 'Bouche supplémentaire : localisez-la avec la table des Touches.', [{ kind: 'hit-location-roll', table: 'hit-locations', count: 1 }]),
  entry('physical', 8, 36, 40, '36–40', 'Fleshy Tentacle', 'Tentacule charnu : acquiert le Trait Tentacules (1).', [{ kind: 'gain-creature-trait', name: 'Tentacles', rating: 1, reference: { printedPage: 362 } }]),
  entry('physical', 9, 41, 45, '41–45', 'Glowing Skin', 'Peau lumineuse : diffuse une lumière équivalente à une bougie.', [], ['Le rayon et les autres propriétés de la lumière ne sont pas précisés.']),
  entry('physical', 10, 46, 50, '46–50', 'Inhuman Beauty', 'Beauté inhumaine : Sociabilité +10 et absence de cicatrices.', [{ kind: 'characteristic-modifier', characteristic: 'Soc', amount: 10 }], ['Préciser si les cicatrices existantes disparaissent ou si seules les nouvelles sont empêchées.']),
  entry('physical', 11, 51, 55, '51–55', 'Inverted Face', 'Visage inversé : Sociabilité −20.', [{ kind: 'characteristic-modifier', characteristic: 'Soc', amount: -20 }]),
  entry('physical', 12, 56, 60, '56–60', 'Iron Skin', 'Peau de fer : +2 PA à toutes les localisations.', [{ kind: 'armour-points', locations: 'all', amount: 2 }]),
  entry('physical', 13, 61, 65, '61–65', 'Lolling Tongue', 'Langue pendante : −10 aux Tests de Langue parlés.', [{ kind: 'test-modifier', skill: 'Language', amount: -10, condition: 'speaking' }]),
  entry('physical', 14, 66, 70, '66–70', 'Patchy Feathers', 'Plumes éparses : déterminez deux localisations avec la table des Touches.', [{ kind: 'hit-location-roll', table: 'hit-locations', count: 2 }]),
  entry('physical', 15, 71, 75, '71–75', 'Short Legs', 'Jambes courtes : le Mouvement diminue de 1.', [{ kind: 'characteristic-modifier', characteristic: 'M', amount: -1 }]),
  entry('physical', 16, 76, 80, '76–80', 'Spiny Protrusions', 'Protubérances épineuses : localisez-les avec la table des Touches.', [{ kind: 'hit-location-roll', table: 'hit-locations', count: 1 }]),
  entry('physical', 17, 81, 85, '81–85', 'Thorny Scales', 'Écailles épineuses : +1 PA à toutes les localisations.', [{ kind: 'armour-points', locations: 'all', amount: 1 }]),
  entry('physical', 18, 86, 90, '86–90', 'Uneven Horns', 'Cornes inégales : +1 PA à la tête et Trait Cornes.', [{ kind: 'armour-points', locations: ['head'], amount: 1 }, { kind: 'gain-creature-trait', name: 'Horns', reference: { printedPage: 358 } }]),
  entry('physical', 19, 91, 95, '91–95', 'Webbed Feet', 'Pieds palmés : acquiert Foulée assurée (marécages).', [{ kind: 'gain-talent', talentId: 'talent-striding-gait', sourceTalentName: 'Striding Gait', specializationSource: 'Wetland', specialization: 'Marécages' }]),
  entry('physical', 20, 96, 100, '96–00', 'Whiskered Snout', 'Museau moustachu : Sens aiguisé (odorat) et +2 DR en Pistage.', [{ kind: 'gain-talent', talentId: 'talent-acute-sense', sourceTalentName: 'Acute Sense', specializationSource: 'Smell', specialization: 'Odorat' }, { kind: 'test-modifier', skill: 'Track', amount: 2, unit: 'SL' }])
];

const mental = [
  entry('mental', 1, 1, 5, '01–05', 'Awful Cravings', 'Envies terribles : Force Mentale −5 et Sociabilité −5.', [{ kind: 'characteristic-modifier', characteristic: 'FM', amount: -5 }, { kind: 'characteristic-modifier', characteristic: 'Soc', amount: -5 }]),
  entry('mental', 2, 6, 10, '06–10', 'Beast Within', 'Bête intérieure : Force Mentale +10, Intelligence et Sociabilité −5.', [{ kind: 'characteristic-modifier', characteristic: 'FM', amount: 10 }, { kind: 'characteristic-modifier', characteristic: 'Int', amount: -5 }, { kind: 'characteristic-modifier', characteristic: 'Soc', amount: -5 }]),
  entry('mental', 3, 11, 15, '11–15', 'Chaotic Dreams', 'Rêves chaotiques : Exténué pendant les deux premières heures quotidiennes.', [{ kind: 'condition-schedule', condition: 'Fatigued', duration: 2, unit: 'hours', recurrence: 'daily' }]),
  entry('mental', 4, 16, 20, '16–20', 'Crawling Skin', 'Peau rampante : Initiative et Dextérité −5.', [{ kind: 'characteristic-modifier', characteristic: 'I', amount: -5 }, { kind: 'characteristic-modifier', characteristic: 'Dex', amount: -5 }]),
  entry('mental', 5, 21, 25, '21–25', 'Erratic Fantasist', 'Fantasiste erratique : Initiative et Force Mentale −5.', [{ kind: 'characteristic-modifier', characteristic: 'I', amount: -5 }, { kind: 'characteristic-modifier', characteristic: 'FM', amount: -5 }]),
  entry('mental', 6, 26, 30, '26–30', 'Fearful Concern', 'Inquiétude craintive : Force Mentale −10.', [{ kind: 'characteristic-modifier', characteristic: 'FM', amount: -10 }]),
  entry('mental', 7, 31, 35, '31–35', 'Hateful Impulses', 'Impulsions haineuses : Animosité envers toute autre espèce.', [{ kind: 'animosity', target: 'all-other-species', reference: { printedPage: 183 } }]),
  entry('mental', 8, 36, 40, '36–40', 'Hollow Heart', 'Cœur vide : Force Mentale +10 et Sociabilité −10.', [{ kind: 'characteristic-modifier', characteristic: 'FM', amount: 10 }, { kind: 'characteristic-modifier', characteristic: 'Soc', amount: -10 }]),
  entry('mental', 9, 41, 45, '41–45', 'Jealous Thoughts', 'Pensées jalouses : Sociabilité −10.', [{ kind: 'characteristic-modifier', characteristic: 'Soc', amount: -10 }]),
  entry('mental', 10, 46, 50, '46–50', 'Lonely Spirit', 'Esprit solitaire : −10 à tout Test effectué seul.', [{ kind: 'test-modifier', scope: 'any', amount: -10, condition: 'alone' }]),
  entry('mental', 11, 51, 55, '51–55', 'Mental Blocks', 'Blocages mentaux : Intelligence −10.', [{ kind: 'characteristic-modifier', characteristic: 'Int', amount: -10 }]),
  entry('mental', 12, 56, 60, '56–60', 'Profane Urgency', 'Urgence profane : Agilité +10 et Force Mentale −10.', [{ kind: 'characteristic-modifier', characteristic: 'Ag', amount: 10 }, { kind: 'characteristic-modifier', characteristic: 'FM', amount: -10 }]),
  entry('mental', 13, 61, 65, '61–65', 'Shaky Morale', 'Moral vacillant : Brisé en cas d’échec au Test de Peur.', [{ kind: 'condition-on-test-failure', condition: 'Broken', test: 'Fear' }]),
  entry('mental', 14, 66, 70, '66–70', 'Suspicious Mind', 'Esprit soupçonneux : Initiative et Intelligence −5.', [{ kind: 'characteristic-modifier', characteristic: 'I', amount: -5 }, { kind: 'characteristic-modifier', characteristic: 'Int', amount: -5 }]),
  entry('mental', 15, 71, 75, '71–75', 'Thrill Hunter', 'Chasseur de sensations : Force Mentale +10 et Initiative −10.', [{ kind: 'characteristic-modifier', characteristic: 'FM', amount: 10 }, { kind: 'characteristic-modifier', characteristic: 'I', amount: -10 }]),
  entry('mental', 16, 76, 80, '76–80', 'Tortured Visions', 'Visions tourmentées : Initiative −10.', [{ kind: 'characteristic-modifier', characteristic: 'I', amount: -10 }]),
  entry('mental', 17, 81, 85, '81–85', 'Totally Unhinged', 'Complètement dément : Force Mentale +10 et Sociabilité −20.', [{ kind: 'characteristic-modifier', characteristic: 'FM', amount: 10 }, { kind: 'characteristic-modifier', characteristic: 'Soc', amount: -20 }]),
  entry('mental', 18, 86, 90, '86–90', 'Unending Malice', 'Malveillance constante : ±1 DR selon que le Test blesse autrui.', [{ kind: 'test-modifier', scope: 'any', amount: 1, unit: 'SL', condition: 'test-to-hurt-another' }, { kind: 'test-modifier', scope: 'any', amount: -1, unit: 'SL', condition: 'test-not-to-hurt-another' }]),
  entry('mental', 19, 91, 95, '91–95', 'Unholy Rage', 'Rage impie : Corps à corps +10 et Frénésie.', [{ kind: 'characteristic-modifier', characteristic: 'CC', amount: 10 }, { kind: 'condition', condition: 'Frenzy', reference: { printedPage: 184 } }]),
  entry('mental', 20, 96, 100, '96–00', 'Worried Jitters', 'Nervosité inquiète : Agilité +5 et Sociabilité −5.', [{ kind: 'characteristic-modifier', characteristic: 'Ag', amount: 5 }, { kind: 'characteristic-modifier', characteristic: 'Soc', amount: -5 }])
];

export const L06_CORRUPTION_MUTATION_TABLES = deepFreeze({
  schemaVersion: 1,
  edition: 'V5',
  countExpectedFromBrief: 39,
  countObservedOnSourcePage: 40,
  countDiscrepancy: 'PDF p.189 visibly prints 20 physical and 20 mental rows; none omitted or merged.',
  countVerification: { reviewer: 'review_k1', date: '2026-10-28', pdfPage: 189, rowsVerified: 40, rowsExpectedFromBrief: 39, observation: 'Les 40 plages imprimées ont été contrôlées; écart conservé sans suppression.' },
  tables: Object.freeze([
    Object.freeze({ id: 'L06-corruption-physical', family: 'physical', selection: { type: 'd100-inclusive-range', min: 1, max: 100 }, entries: Object.freeze(physical) }),
    Object.freeze({ id: 'L06-corruption-mental', family: 'mental', selection: { type: 'd100-inclusive-range', min: 1, max: 100 }, entries: Object.freeze(mental) })
  ])
});
