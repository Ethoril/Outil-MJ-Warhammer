import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSelectors, validateAudit } from '../tools/audit/build-audit.mjs';
const root=import.meta.dirname+'/..';
const row={id:'F-L06-9001',book:'L06',page:183,chapter:'Psychologie',title:'Fear',titleFr:'Peur',summary:'Renvoi au domaine déjà inventorié.',mechanic:'procedure',status:'absent',coveredBy:'docs/COURAGE_BRISE_INVENTAIRE.json#C0-L06-002',toolRef:[],v5Proposal:null,notes:'Référence antérieure.',domain:'Psychologie'};
test('audit — un renvoi déjà arbitré peut être exclu des nouvelles décisions avec sa raison explicite',()=>{
  const reference={...row,selectorEligible:false,selectorExclusionReason:'Décision et lots déjà portés par C0.'};
  assert.equal(buildSelectors([reference]).length,0);
  assert.equal(buildSelectors([row]).length,1,'un coveredBy seul ne masque pas une lacune nouvelle');
  assert.throws(()=>validateAudit([{...row,selectorEligible:false}],root),/exclusion/i);
  assert.throws(()=>validateAudit([{...reference,coveredBy:null}],root),/exclusion/i);
});
