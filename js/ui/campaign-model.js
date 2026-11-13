// Modèle de l'écran Campagne (CAMP-12, 13/11) : fonctions pures, sans DOM ni Store, reprises telles quelles de
// campaign-workspace.js pour être testées unitairement. L'écran les appelle ; elles ne changent pas son rendu.

export const countText = (count, singular, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;
export const activeIncident = row => row.status === 'open';
export const activeDisease = row => row.status === 'active';
export const visibleSequela = row => ['open', 'needs-facts', 'permanent'].includes(row.status);

export const PLACE_TEXT = { suspendue: 'Scène suspendue', aucun: 'Ancien suivi' };
export const PLACE_NOTICE = {
  suspendue: 'Ce suivi appartient à un participant d’une scène suspendue : consultation seule. Reprenez la scène pour soigner.',
  aucun: 'Ancien suivi sans personnage : consultation seule. Il peut être archivé.'
};

export function formatElapsed(seconds) {
  if (!Number.isSafeInteger(seconds) || seconds < 0) return 'Horloge non initialisée';
  let left = seconds;
  const parts = [];
  for (const [unit, short] of [[86400, 'j'], [3600, 'h'], [60, 'min'], [1, 's']]) {
    const amount = Math.floor(left / unit);
    if (amount) parts.push(`${amount} ${short}`);
    left %= unit;
  }
  return parts.join(' ') || '0 s';
}

/** Résumé lisible des suivis actifs d'un personnage. */
export function humanSummary(incidents, diseases, sequelae) {
  const pieces = [];
  if (incidents.length) pieces.push(countText(incidents.length, 'blessure suivie', 'blessures suivies'));
  if (diseases.length) pieces.push(countText(diseases.length, 'maladie suivie', 'maladies suivies'));
  if (sequelae.length) pieces.push(countText(sequelae.length, 'séquelle suivie', 'séquelles suivies'));
  return pieces.join(' · ') || 'Aucun suivi actif';
}

/** Sous-titre de la ligne d'un personnage : critiques à suivre en tête, puis le résumé. */
export function personSubtitle({ incidents, diseases, sequelae, proposals }) {
  return proposals.length
    ? `${countText(proposals.length, 'critique à suivre', 'critiques à suivre')} · ${humanSummary(incidents, diseases, sequelae)}`
    : humanSummary(incidents, diseases, sequelae);
}

export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Statut d'un personnage (texte et couleur de pastille) d'après ses suivis actifs. */
export function getPersonStatus(entry, ownIncidents, ownDiseases, ownSequelae, ownProposals) {
  if (entry.absent) return { text: PLACE_TEXT[entry.place] || PLACE_TEXT.aucun, color: 'blue' };
  if (ownProposals.length || ownIncidents.some(i => !i.bandaged || i.infection || (i.requiresSurgery && !i.surgeryCompleted))) {
    return { text: 'À traiter', color: 'red' };
  }
  if (ownIncidents.length || ownDiseases.length || ownSequelae.length) {
    return { text: 'À surveiller', color: 'amber' };
  }
  return { text: 'Rien à traiter', color: 'green' };
}

/** Suivis actifs d'un personnage, dans les formes que lisent la ligne et le détail. */
export function followupsOf(id, { incidents, diseases, sequelae, proposals }) {
  return {
    incidents: incidents.filter(row => row.participantId === id && activeIncident(row)),
    diseases: diseases.filter(row => row.participantId === id && activeDisease(row)),
    sequelae: sequelae.filter(row => row.participantId === id && visibleSequela(row)),
    proposals: proposals.filter(row => row.participantId === id)
  };
}

/**
 * Personnes de l'écran : participants de la rencontre et personnages suivis hors rencontre (dans l'ordre reçu), puis
 * un suivi sans sujet par identifiant absent (scène suspendue, ancien suivi), sous le nom enregistré à son ouverture
 * (CA2 à CA4). `rowLabel(row)` et `subjectPlace(id)` sont les lectures du Store.
 */
export function buildCampaignPeople({ participants, incidents, diseases, sequelae, pending = [], proposals, rowLabel, subjectPlace }) {
  const byId = new Map(participants.map(person => [person.id, person]));
  const activeIds = new Set([
    ...incidents.filter(activeIncident),
    ...diseases.filter(activeDisease),
    ...sequelae.filter(visibleSequela),
    ...pending,
    ...proposals
  ].map(row => row.participantId));
  const absentIds = [...activeIds].filter(id => !byId.has(id));
  const people = participants.map(person => ({ id: person.id, person, name: person.name || 'Personnage sans nom', absent: false, off: person.offEncounter === true }));
  const rowsOf = id => [...incidents, ...diseases, ...sequelae, ...pending].filter(row => row.participantId === id);
  for (const id of absentIds) {
    const row = rowsOf(id)[0];
    people.push({ id, person: null, absent: true, off: false,
      name: (row ? rowLabel(row) : '') || 'Ancien suivi',
      place: subjectPlace(id) });
  }
  return { people, activeIds, absentIds };
}

/** Texte des PV d'une personne ; `absentText` pour un suivi en consultation. */
export function hpText(entry, absentText) {
  return entry.person && Number.isFinite(Number(entry.person.hp)) && Number.isFinite(Number(entry.person.maxHp))
    ? `${entry.person.hp} / ${entry.person.maxHp} PV`
    : (entry.absent ? absentText : 'PV indisponibles');
}
