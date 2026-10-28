/** Offline documentation build from pinned PUBLIC texts, never a runtime rule parser. */
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const snapshot=read('js/data/reference-snapshot.json');
const inventory=read('docs/lot2/LOT2_INVENTAIRE_TALENTS.json');
const tri=read('docs/lot2/LOT2_TRI_TALENTS.json');
const registries=['v5-talent-contracts','v5-test-talent-contracts','v5-quality-talent-contracts','v5-additional-talent-contracts'].map(name=>read('js/data/'+name+'.json'));
const magicRegistry=read('js/data/v5-magic-talent-coverage.json');
const magicItems=new Map(magicRegistry.items.map(row=>[row.talentId,row]));
const contracts=new Map(registries.flatMap(row=>row.contracts).map(contract=>[contract.talentId,contract]));
const items=snapshot.talents.entries.map(source=>{
 const old=inventory.items.find(row=>row.talentId===source.id);if(!old)throw Error('Identité sans inventaire '+source.id);
 const effectHash='sha256:'+createHash('sha256').update(source.description,'utf8').digest('hex');
 const contract=contracts.get(source.id);if(contract&&contract.source.effectHash!==effectHash)throw Error('Contrat sans source exacte '+source.id);
 const clauses=[];
 const magicItem=magicItems.get(source.id);if(magicItem && magicItem.source.effectHash!==effectHash)throw Error('Source magique modifiée '+source.id);
 if(magicItem)clauses.push(...magicItem.clauses.map(({executionProbe,...clause})=>clause));
 const override=registries.map(row=>row.approvedOverrides?.[source.id]).find(Boolean);
 if(override)clauses.push({id:'approved-source-ruling',mode:'reminder',text:override.decision+' '+override.correctedDescription,reason:override.reference});
 if(contract) for(const clause of contract.clauses){
 const labels={grantAdvantage:'Accorde un Avantage au Test pertinent.',chooseSLUnits:'Choisir entre DR réussis et chiffre des unités du jet retenu (0 reste 0).',modifyDamage:'Bonus de Dégâts avant protections.',reduceConditionAcquisition:'Réduit les États proposés avant acquisition.',replaceDamage:'Remplace les Blessures et le critique après choix.',createActiveEffect:'Effet jusqu’à la fin du prochain Tour de l’auteur.',grantExtraAttack:'Propose une attaque supplémentaire explicite, avec coût et quota.',addQuality:'Ajoute une qualité à l’arme pour cette action.',suppressQuality:'Supprime un défaut pour cette action.',modifySL:'Modifie les DR du Test sous les conditions précisées.',multiplySL:'Multiplie les DR du Test réussi.',ignoreConditionPenalty:'Ignore des niveaux d’État pour leur pénalité, sans les retirer.',increaseConditionAcquisition:'Ajoute les États supplémentaires au déclenchement prévu.',suppressTestPenalty:'Supprime uniquement la pénalité de situation concernée.',limitTestPenalty:'Réduit la pénalité de situation concernée.',improveCover:'Renforce le couvert léger ou moyen.',reduceCover:'Abaisse d’un niveau le couvert avec Hack.',forceDefenseSkill:'Impose Intuition comme défense de Feinte.',grantMomentum:'Gagne l’Élan avant de défendre la Charge prévue.',incomingPenalty:'Pénalité d’attaque liée au Garde royal désigné.',suppressProneBonus:'Supprime l’Avantage adverse lié à À terre.',modifyQuantity:'Calcule la contribution, le Mouvement ou les Dégâts de matériel selon la situation.',divideQuantity:'Divise la durée de réparation par deux.',ignoreQuantityPenalty:'Ignore la pénalité de Mouvement du terrain acquis.',modifyHealing:'Ajoute 2 Blessures de récupération, avec plafonds et restrictions.',modifyQuality:'Modifie temporairement l’indice de la qualité concernée.',chooseCriticalRoll:'Deux gravités et choix explicite du joueur.',modifyCriticalRoll:'Bonus facultatif au d100 de gravité, plafonné à 100.',riposte:'Dégâts normaux de l’arme utilisée après victoire en défense de mêlée.',ignoreArmourFlaw:'Ignore les armures portant le défaut concerné.',activateTalent:'Activation ou choix temporaire explicite, avec son déclencheur et ses cibles.',forceTestSuccess:'Réussite automatique dans le contexte prévu.',ignoreNegativeModifiers:'Choix avant jet : retirer les modificateurs négatifs, une fois par séance.'};
 const implementedNote=tri.items.find(r=>r.talentId===source.id)?.implementationNotes;
 const role={actor:'Test',attacker:'Attaque',defender:'Défense'}[clause.role];
 clauses.push({id:clause.id,contractClauseId:clause.id,mode:clause.choice||clause.effects.some(e=>['chooseSLUnits','chooseCriticalRoll','activateTalent','forceTestSuccess','ignoreNegativeModifiers','modifyQuantity','divideQuantity','ignoreQuantityPenalty','modifyHealing'].includes(e.op))?'assisted':'automatic',text:(implementedNote&&clause.effects.some(e=>e.op==='activateTalent')?implementedNote+' ':role+' : ')+clause.effects.map(effect=>labels[effect.op]||'Effet soumis aux conditions du talent.').join(' ')});
 }
 const classified=tri.items.find(row=>row.talentId===source.id);
 if(!classified||classified.source.effectHash!==effectHash)throw Error('Tri sans source exacte '+source.id);
 for(const [index,clause]of classified.clauses.entries()){
   if(clause.scope==='engine'&&clause.status==='implemented' || clause.scope==='lot3' && magicItem)continue;
   const mode=clause.scope==='narrative'?'reminder':clause.scope==='lot3'?'deferred':clause.scope==='sheet'?clause.status==='excluded'?'excluded':'owned':clause.status==='manual-approved'?'reminder':'pending';
   const notes = {
     'talent-hardy': 'À la synchronisation, +BE par rang pour les espèces reconnues ; pour un Ogre, la somme est ensuite doublée. Les transformations recalculent également Dur à cuire.',
     'talent-large': 'La synchronisation double les Blessures de l’Ogre, Dur à cuire compris ; les transformations recalculent selon leur taille. La taille elle-même reste importée.',
     'talent-small': 'La synchronisation calcule 2×BE + BFM pour Gnome et Skink, avec Dur à cuire ; les transformations utilisent leur propre formule de taille. Le reste de Petit reste le homebrew local.',
     'talent-second-sight': 'Perception magique en rappel ; la perte temporaire par incident est suivie et certains sorts accordent ou modifient Seconde vue.',
     'talent-night-vision': 'Vision nocturne ajoutée aux portées sensorielles à 20 yards ; conditions de lumière à apprécier par le MJ.'
   };
   clauses.push({id:'tri:'+index,mode:source.id==='talent-master-and-commander'?'assisted':mode,text:notes[source.id] || clause.text,scope:clause.scope});
 }
 if(source.id==='talent-small')clauses.push({id:'homebrew-source',mode:'reminder',text:'Source d’une autre édition ou d’un supplément : adaptation V5 à vérifier. Petit est conservé comme homebrew validé par le MJ, raccordé selon les arbitrages locaux : multiplication avant BE/PA, Frappes Mortelles supprimées, aucune migration de fiche.',scope:'source'});
 if(!clauses.length)throw Error('Talent sans traitement '+source.id);
 return {talentId:source.id,name:source.nom,family:old.family,description:source.description,source:{effectHash,reference:source.source},clauses};
});
const result={schemaVersion:1,ruleVersion:'catalogue-utile-v5-2026-10-10.1',sourceCatalogueVersion:snapshot.contentVersion,policy:'Traitement explicite par clause. Les rappels ne sont pas des automatismes et les contrats actifs sont vérifiés séparément.',items};
const output=JSON.stringify(result,null,2)+'\n';
const path='js/data/v5-talent-coverage.json';
if(process.argv.includes('--check')) {
 if(readFileSync(path,'utf8')!==output) { console.error('Couverture des talents à régénérer.'); process.exitCode=1; }
} else writeFileSync(path,output);
console.log(JSON.stringify({identities:items.length,contracts:contracts.size,modes:items.flatMap(row=>row.clauses).reduce((counts,clause)=>(counts[clause.mode]=(counts[clause.mode]||0)+1,counts),{})}));
