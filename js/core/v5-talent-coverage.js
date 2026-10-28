import magicCoverage from '../data/v5-magic-talent-coverage.json' with {type:'json'};
/** Coverage describes clauses; it never grants mechanics or consults private services. */
import coverage from '../data/v5-talent-coverage.json' with { type: 'json' };
import { getReferenceCatalogue } from './reference-catalog.js';
import { V5_TALENT_CONTRACTS } from './v5-talents.js';
export const V5_TALENT_TREATMENT_LABELS = Object.freeze({automatic:'Automatique',assisted:'Assisté par un choix',reminder:'Rappel MJ',excluded:'Déjà intégré à la fiche',deferred:'Autre périmètre',owned:'Géré par la fiche',pending:'Mécanique à raccorder'});
export function v5TalentCoverage(talentId, catalogue = getReferenceCatalogue()) {
  const item = coverage.items.find(row => row.talentId === talentId);
  const source = catalogue?.talents?.find(row => row.id === talentId);
  if (!item) return {talentId,status:'unknown',clauses:[{id:'unknown',mode:'reminder',text:'Identité absente du catalogue de couverture ; à vérifier par le MJ.'}]};
  const status = !source ? 'sourceUnavailable' : source.description !== item.description ? 'sourceChanged' : 'verified';
  const contracts = new Map(V5_TALENT_CONTRACTS.map(contract => [contract.talentId,contract]));
  const clauses = item.clauses.map(clause => {
    if (!['automatic','assisted'].includes(clause.mode)) return {...clause};
    const contract = contracts.get(item.talentId);
    const magic=magicCoverage.items.find(row=>row.talentId===item.talentId);
    const magicActive=clause.magicRegistry && status==='verified' && magic?.status==='validated' && magic.source.effectHash===item.source.effectHash && magic.clauses.some(row=>row.id===clause.id && ['automatic','assisted'].includes(row.mode));
    // Maître à bord est raccordé directement à leadershipRallySlModifiers, hors registre des contrats.
    const directActive = status === 'verified' && item.talentId === 'talent-master-and-commander' && clause.id === 'tri:0';
    const active = magicActive || directActive || status === 'verified' && contract?.status === 'validated' && contract.source.effectHash === item.source.effectHash
      && contract.clauses.some(row => row.id === clause.contractClauseId);
    return active ? {...clause} : {...clause,mode:'reminder',text:clause.text + ' Effet suspendu : source ou contrat à revalider.'};
  });
  return {...item,status,clauses};
}
export function acquiredV5TalentCoverage(subject, catalogue = getReferenceCatalogue()) {
  return (subject?.talents || []).filter(row => row && typeof row === 'object' && !Array.isArray(row)).map(row => row.status === 'resolved' && row.id && Number.isSafeInteger(row.rank) && row.rank > 0
    ? {...v5TalentCoverage(row.id,catalogue),rank:row.rank,specialization:row.specialization || row.specialty || null}
    : {talentId:row.id || null,name:row.name || row.nom || 'Talent inconnu',status:'acquisitionUnresolved',clauses:[{id:'unresolved',mode:'reminder',text:'Acquisition non résolue : préciser identité, rang et spécialité avant tout effet.'}]});
}
/** Only actually imported snapshots, deduplicated by stable character and fingerprint. No fixed list of PJ IDs. */
export function importedPjTalentPriorities(envelope = {}) {
  const subjects = [...(envelope.reserve || []),...(envelope.persistentCharacters || []),...(envelope.combat?.participants || []),
    ...(envelope.suspendedScenes || []).flatMap(scene => scene.combat?.participants || scene.participants || [])];
  const characters = new Map();
  for (const subject of subjects) {
    if(subject?.kind !== 'PJ')continue;
    const snapshot = subject.ficheSnapshot;
    if (!snapshot?.charId || !snapshot.source?.fingerprint || snapshot.coverage?.talents !== 'present') continue;
    const known = characters.get(snapshot.charId);
    if (!known) characters.set(snapshot.charId,{snapshots:new Map()});
    characters.get(snapshot.charId).snapshots.set(snapshot.source.fingerprint,snapshot);
  }
  const priorities = new Map(); let ambiguousCharacters = 0, unresolvedAcquisitions = 0, acquisitions = 0;
  for (const entry of characters.values()) {
    const snapshots = [...entry.snapshots.values()];
    // Divergent scene snapshots do not silently union ranks or invent a newest online state.
    const talentSignatures = new Set(snapshots.map(snapshot => JSON.stringify((snapshot.talents || []).filter(row => row && typeof row === 'object' && !Array.isArray(row)).map(row => [row.id,row.status,row.rank,row.specialization || row.specialty || null]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))))));
    if (talentSignatures.size > 1) {ambiguousCharacters++;continue;}
    const owned = new Map();
    for (const row of (snapshots[0].talents || []).filter(r => r && typeof r === 'object' && !Array.isArray(r))) {
      if(row.status !== 'resolved' || !row.id || !Number.isSafeInteger(row.rank) || row.rank < 1){unresolvedAcquisitions++;continue;}
      const key=JSON.stringify([row.id,row.specialization || row.specialty || null]);
      if(!owned.has(key))owned.set(key,row);
    }
    const characterRanks=new Map();
    for (const row of owned.values()) {acquisitions+=row.rank;characterRanks.set(row.id,(characterRanks.get(row.id)||0)+row.rank);}
    for(const [talentId,rank] of characterRanks){const item=priorities.get(talentId)||{talentId,characters:0,acquisitions:0};item.characters++;item.acquisitions+=rank;priorities.set(talentId,item);}
  }
  return {characters:characters.size,ambiguousCharacters,unresolvedAcquisitions,acquisitions,items:[...priorities.values()].sort((a,b)=>b.characters-a.characters||b.acquisitions-a.acquisitions||a.talentId.localeCompare(b.talentId))};
}
