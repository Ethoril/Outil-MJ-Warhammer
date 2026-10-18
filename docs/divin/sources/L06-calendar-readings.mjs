const fileSha256 = "53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de";
const evidencePath = "docs/divin/sources/DIVIN_L06_CALENDRIER_CONTROLE.md";

const ref177 = { bookId: "L06", fileSha256, physicalPage: 177, printedPage: 177, section: "Healing Times and Downtime" };
const ref218 = { bookId: "L06", fileSha256, physicalPage: 218, printedPage: 218, section: "Wrath of the Gods — Think Over Your Deeds (06–10)" };
const ref130 = { bookId: "L06", fileSha256, physicalPage: 130, printedPage: 130, section: "Tests — Success and Failure" };
const ref131 = { bookId: "L06", fileSha256, physicalPage: 131, printedPage: 131, section: "Tests — Modifiers" };
const ref289 = { bookId: "L06", fileSha256, physicalPage: 289, printedPage: 289, section: "The Imperial Calendar — Imperial week" };

export const imperialWeek = { value: 8, unit: "days", sourceRefs: [ref177, ref289] };
export const thinkOverYourDeeds = {
  sourceRef: ref218,
  wrathRange: { min: 6, max: 10 },
  successLevelsMaximum: 0,
  duration: { value: 1, unit: "imperial-week" },
  application: "after-wrath-resolution",
  occurrences: "independent-identical-caps",
};

// Ciblage complémentaire du Courroux 11–15, p. 218. La durée se résout avec
// un d10 explicite et les Péchés capturés avant la réduction du Courroux.
export const heedMyLessons = {
  sourceRef: { ...ref218, section: "Wrath of the Gods — Heed My Lessons (11–15)" },
  wrathRange: { min: 11, max: 15 },
  skill: "Pray",
  amount: -1,
  application: "future-tests-before-outcome",
  duration: { die: "1d10", additive: "sin-points-before-decrement", unit: "rounds" },
  roundPolicy: {
    currentRoundCountsAsFirst: true, expiryPhase: "endOfRound", expiryMoment: "afterEffects",
    decisionId: "DIV-TIME-LESSONS-01",
    decisionProvenance: {
      kind: "user-arbitration",
      statement: "Fin du Nᵉ Round, en comptant le Round actuel comme premier Round",
      example: { anchorRound: 4, durationRoll: 3, sinAtTrigger: 1, rounds: 4, expiryRound: 7 },
    },
  },
  mechanicsSourceRefs: [ref130, ref131],
  evidencePath: "docs/divin/sources/DIVIN_L06_LECONS_LECTURE.md",
  temporalLimits: "No conversion to seconds or campaign time; off-combat duration requires an actual current combat Round.",
};

// Registre riche; section est documentaire. L'export audit ci-dessous l'omet.
export const calendarReadings = [
  {
    id: "L06-p177-first-calendar", bookId: "L06", fileSha256,
    physicalPage: 177, printedPage: 177, section: ref177.section,
    reader: "/root", role: "first", classification: "dependency",
    reason: "Rétablissement des blessures et temps de Downtime : dépendance pour interpréter la semaine comme durée de jeu.",
    evidencePath, visualEvidencePath: "C:/Users/arnot/.codex/visualizations/2026/10/18/01a14da8-877d-7ea0-a2d5-38e6a9590721/L06-p177-177.png",
  },
  {
    id: "L06-p177-independent-calendar", bookId: "L06", fileSha256,
    physicalPage: 177, printedPage: 177, section: ref177.section,
    reader: "/root/e1_strictures_control", role: "independent", classification: "dependency",
    reason: "Rétablissement des blessures et temps de Downtime : dépendance pour interpréter la semaine comme durée de jeu.",
    evidencePath, visualEvidencePath: "C:/Users/arnot/.codex/visualizations/2026/10/18/01a14da8-877d-7ea0-a2d5-38e6a9590721/L06-p177-177.png",
  },
  {
    id: "L06-p289-first-calendar", bookId: "L06", fileSha256,
    physicalPage: 289, printedPage: 289, section: ref289.section,
    reader: "/root", role: "first", classification: "religious-candidate",
    reason: "La semaine impériale compte huit jours; la page évoque aussi temples et lieux sacrés de Sigmar, le Rat Cornu, Manann, Morr, les lunes et fêtes religieuses.",
    evidencePath, visualEvidencePath: "C:/Users/arnot/.codex/visualizations/2026/10/18/01a14da8-877d-7ea0-a2d5-38e6a9590721/L06-p289-289.png",
  },
  {
    id: "L06-p289-independent-calendar", bookId: "L06", fileSha256,
    physicalPage: 289, printedPage: 289, section: ref289.section,
    reader: "/root/e1_strictures_control", role: "independent", classification: "dependency",
    reason: "La semaine impériale de huit jours fournit la conversion calendaire; les éléments religieux voisins n’établissent pas ici une règle divine candidate.",
    evidencePath, visualEvidencePath: "C:/Users/arnot/.codex/visualizations/2026/10/18/01a14da8-877d-7ea0-a2d5-38e6a9590721/L06-p289-289.png",
  },
];

const auditReadingFields = [
  "id", "bookId", "fileSha256", "physicalPage", "printedPage",
  "reader", "role", "classification", "reason", "evidencePath", "visualEvidencePath",
];
export const auditCalendarReadings = calendarReadings.map((reading) =>
  Object.fromEntries(auditReadingFields.map((field) => [field, reading[field]])),
);
export const sourceRefs = { ref177, ref218, ref289 };
