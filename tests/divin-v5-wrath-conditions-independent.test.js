import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { previewResolution } from '../js/core/resolution.js';
import { recoverV5Condition } from '../js/core/v5-effects.js';
import { getAllDivineContracts } from '../js/core/v5-divine-store.js';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };

// Contrôle indépendant des entrées de table L06 p.218. Le lecteur source
// distinct doit joindre son reçu avant la clôture de ce contrôle.
const BATTLE = 'divine:blessing:myrmidia:battle';
const PRAY_ID = 'skill-50_72_69_e8_72_65-base';
const clone = value => structuredClone(value);
const person = (id, extra = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: id === 'priest' ? 60 : 30,
  hp: 20, maxHp: 30,
  caracs: { CC:40, CT:40, F:30, E:30, I:40, Ag:40, Dex:40, Int:50, FM:50, Soc:60, M:4 },
  armor: { head:0, body:0, arms:0, legs:0 }, states: [], traits: [], equipment: [],
  skills: [{ id:PRAY_ID, name:'Prière', carac:'Soc', status:'resolved', total:60 }],
  talents: [{ id:'talent-bless', status:'resolved', rank:1, specialization:'Myrmidia' },
    { id:'talent-invoke', status:'resolved', rank:1, specialization:'Myrmidia' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name:row.catalogueName, status:'resolved' })),
  extensions: { v5: { divine: { sin:1 } } }, ...extra
});
const persistence = () => {
  let saved = null, refuse=false;
  return { async load(){ return saved && clone(saved); }, async saveAtomic({state}){ if(refuse)return {ok:false,error:'Refus de persistance indépendant'}; saved=clone(state); return {ok:true}; },
    get saved(){ return clone(saved); }, set refuse(value){refuse=value;} };
};
async function fixture({sin=1,states=[],actorKind='PJ',actorExtensions={}}={}) {
  const persist=persistence(), store=createStore({persistence:persist,storage:null}); await store.ready;
  const v5=clone(actorExtensions.v5||{});
  const priest=person('priest',{kind:actorKind,extensions:{v5:{...v5,divine:{...v5.divine,sin}}},states:clone(states)});
  const ally=person('ally',{extensions:{v5:{divine:{sin:0}}}});
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[priest,ally]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
  return {store,persist};
}
const input = extra => ({actorId:'priest',targetIds:['ally'],roll:1,wrathRoll:51,executionId:'wrath-condition-independent',canSpeak:true,
  choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true,ally:true}}},expiry:{phase:'endOfRound',round:6,moment:'afterEffects'},...extra});
const stateOf = store => { const state=JSON.parse(store.getFullJSON()); delete state.exportedAt; return state; };
const priestOf = store => stateOf(store).combat.participants.find(row=>row.id==='priest');
const level = (actor,name) => (actor.states||[]).filter(row=>row.name===name||row.key===name.toLocaleLowerCase('fr')).reduce((n,row)=>n+(row.level||1),0);
const safeApply = async (store,preview) => { try{return await store.applyDivineExecution(BATTLE,{preview});}catch(error){return {ok:false,error:error.message};} };

test('Courroux états indépendant — table source rattache 61–65 et 89–95 aux États canoniques',()=>{
  const bleeding=registry.wrathTable.find(row=>row.id==='wrath:61-65');
  const broken=registry.wrathTable.find(row=>row.id==='wrath:89-95');
  assert.equal(bleeding?.label,'Blessures divines');
  assert.equal(broken?.label,'Craignez ma colère');
  assert.equal(bleeding?.source?.printedPage,218);
  assert.equal(broken?.source?.printedPage,218);
  const bleedingRule=registry.wrathConditionRules?.find(row=>row.id==='wrath:61-65:conditions');
  const brokenRule=registry.wrathConditionRules?.find(row=>row.id==='wrath:89-95:conditions');
  assert.deepEqual(bleedingRule?.conditions,[{name:'Hémorragique',base:1,perSin:1}]);
  assert.deepEqual(brokenRule?.conditions,[{name:'Brisé',base:1,perSin:1}]);
  assert.equal(bleedingRule?.source?.printedPage,218);
  assert.equal(brokenRule?.source?.printedPage,218);
  assert.notEqual(bleedingRule?.id,'wrath:6-10:pray-sl-cap');
});

test('Courroux états indépendant — aperçu automatique ignore le texte MJ libre sans muter',async()=>{
  for (const [wrathRoll,resultId] of [[51,'wrath:61-65'],[79,'wrath:89-95']]) {
    const {store}=await fixture(); const before=stateOf(store);
    const preview=store.previewDivineExecution(BATTLE,input({wrathRoll,wrathConsequences:'Ajoute arbitrairement les États indiqués.'}));
    assert.equal(preview.ready,true,`${resultId}: la règle source complète résout la mécanique sans texte MJ`);
    assert.equal(preview.wrathTableResult?.id,resultId);
    assert.ok(preview.wrathConditionPreview,'projection explicite demandée avant application');
    assert.notEqual(preview.preview.wrath.consequences,'Ajoute arbitrairement les États indiqués.', 'le texte libre ne devient pas la preuve d’acquisition');
    assert.ok(!(preview.preview.reminders||[]).some(text=>/reste à résoudre/i.test(text)),'pas de rappel générique après résolution automatique');
    assert.deepEqual(stateOf(store),before,'l’aperçu reste sans mutation, y compris Péché et États');
  }
});

test('Courroux états indépendant — les bornes exactes après +10 par Péché sont déterministes',async()=>{
  const cases=[[51,'wrath:61-65'],[55,'wrath:61-65'],[56,'wrath:66-70'],[79,'wrath:89-95'],[85,'wrath:89-95'],[86,'wrath:96-100']];
  for (const [wrathRoll,expected] of cases) {
    const {store}=await fixture();
    const preview=store.previewDivineExecution(BATTLE,input({wrathRoll}));
    assert.equal(preview.wrathTableResult?.id,expected,`jet ${wrathRoll} + 10 (1 Péché)`);
  }
});

test('Courroux états indépendant — falsification, retry et double application ne dupliquent rien',async()=>{
  const {store}=await fixture();
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
  assert.equal(preview.ready,true,'une règle entièrement sourcée ne demande ni arbitrage ni texte libre');
  const before=stateOf(store);
  const forged=clone(preview); forged.input.wrathConsequences='Hémorragique';
  await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview:forged}),/aperçu|calcul|recalculez/i);
  assert.deepEqual(stateOf(store),before,'un aperçu falsifié ne change ni état ni Péché');
  const result=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(result.ok,true,result.error);
  const committed=stateOf(store);
  await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview}),/aperçu|calcul|déjà|recalculez/i,'le même aperçu est à usage unique');
  assert.deepEqual(stateOf(store),committed,'le retry ne duplique pas les états');
  assert.notDeepEqual(committed,before);
});

test('Courroux états indépendant — succès et échec appliquent 1 + Péchés à la prêtresse seulement',async()=>{
  for (const [roll,success] of [[10,true],[99,false]]) {
    const {store}=await fixture({sin:2});
    const preview=store.previewDivineExecution(BATTLE,input({roll,wrathRoll:41}));
    assert.equal(preview.ready,true,preview.error);
    assert.equal(preview.preview.prayer.success,success);
    assert.equal(preview.wrathTableResult?.id,'wrath:61-65');
    assert.equal(preview.wrathConditionPreview?.requested?.count,3);
    assert.equal(preview.wrathConditionPreview?.requested?.condition,'hemorragique');
    assert.equal(preview.wrathConditionPreview?.targetId,'priest');
    const applied=await store.applyDivineExecution(BATTLE,{preview});
    assert.equal(applied.ok,true,applied.error);
    const actor=priestOf(store),ally=stateOf(store).combat.participants.find(row=>row.id==='ally');
    assert.equal(level(actor,'Hémorragique'),3);
    const acquired=actor.states.find(row=>row.divineWrathExecutionId===preview.executionId);
    assert.equal(acquired?.source?.kind,'divine-wrath');
    assert.equal(acquired?.source?.source?.printedPage,218);
    assert.equal(acquired?.v5Timing?.expiry,undefined,'l’État n’hérite pas de l’échéance de la Bénédiction');
    assert.equal(level(ally,'Hémorragique'),0,'la victime de la bénédiction n’est pas la cible du Courroux');
    assert.equal(applied.receipt.conditionReceipt?.proof?.sinAtTest,2);
    assert.ok(applied.receipt.conditionReceipt?.sourceReceipt?.sourceRefs?.some(row=>row.printedPage===218));
    assert.equal(actor.extensions.v5.divine.sin,1,'le nombre appliqué utilise le Péché avant décrément');
  }
});

test('Courroux états indépendant — acquisition cumulative préserve les instances existantes et le buff allié',async()=>{
  const {store}=await fixture({states:[{id:'old-bleed',key:'hemorragique',name:'Hémorragique',level:2}]});
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
  assert.equal(preview.ready,true,preview.error);
  assert.equal(preview.wrathConditionPreview?.projection?.acquiredCount,2);
  const result=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(result.ok,true,result.error);
  const actor=priestOf(store),ally=stateOf(store).combat.participants.find(row=>row.id==='ally');
  assert.equal(actor.states.find(row=>row.id==='old-bleed')?.level,2,'l’instance préexistante reste intacte');
  assert.equal(level(actor,'Hémorragique'),4,'la nouvelle occurrence s’ajoute au cumul canonique');
  assert.equal(ally.caracs.CC,50,'la bénédiction conserve son effet sur l’allié');
  assert.equal((ally.states||[]).some(row=>row.name==='Hémorragique'),false,'Courroux cible uniquement la prêtresse');
  assert.ok((result.receipt.conditionReceipt?.stateIds||[]).every(id=>id!=='old-bleed'));
});

test('Courroux états indépendant — le malus de Brisé atteint les Tests concernés sans consommer son état',async()=>{
  const {store}=await fixture();
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:79}));
  assert.equal(preview.ready,true,preview.error);
  await store.applyDivineExecution(BATTLE,{preview});
  const actor=priestOf(store),before=clone(actor.states);
  const action={id:'calm-test',type:'skill',base:60,attr:'Soc',note:'Prière',extensions:{fiche:{skillId:PRAY_ID}}};
  const test=previewResolution({actor,action,roll:23,v5:{kind:'test',context:{runningOrHiding:false}}});
  assert.equal(test.test.sl,2,'Brisé 2 applique son malus au Test calme concerné');
  assert.deepEqual(priestOf(store).states,before,'le Test ne consomme pas Brisé');
});

test('Courroux états indépendant — le vrai Store exécute Hémorragique en fin de Round, puis expire séparément la Bénédiction',async()=>{
  const {store}=await fixture();
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
  assert.equal(preview.ready,true,preview.error);
  await store.applyDivineExecution(BATTLE,{preview});
  const afterApply=stateOf(store),priest=afterApply.combat.participants.find(row=>row.id==='priest'),ally=afterApply.combat.participants.find(row=>row.id==='ally');
  assert.equal(level(priest,'Hémorragique'),2);
  assert.equal(ally.caracs.CC,50,'la Bénédiction affecte le destinataire pendant sa durée propre');
  assert.equal((priest.extensions.v5.divineEffects||[]).length,0,'la Condition est un État canonique, pas une couche de durée divine inventée');
  const engine=createCombatEngine(store);await engine.start();
  const first=await engine.nextTurn();assert.equal(first.status,'applied',first.error);
  assert.equal(store.listParticipants().find(row=>row.id==='priest').hp,20,'Hémorragique ne se résout pas à chaque fin de Tour');
  const crossing=await engine.nextTurn();assert.equal(crossing.status,'applied',crossing.error);
  assert.equal(store.listParticipants().find(row=>row.id==='priest').hp,18,'2 états causent 2 Blessures à la fin du Round');
  assert.equal(level(store.listParticipants().find(row=>row.id==='priest'),'Hémorragique'),2,'fin de Round ne retire pas la Condition');
  for(let i=0;i<10;i++){const transition=await engine.nextTurn();assert.equal(transition.status,'applied',transition.error);}
  assert.equal(store.listParticipants().find(row=>row.id==='ally').caracs.CC,40,'la Bénédiction expire à son échéance de Round 6');
  assert.equal(level(store.listParticipants().find(row=>row.id==='priest'),'Hémorragique'),2,'l’État autonome survit à l’expiration du sort');
});

test('Courroux états indépendant — immunité canonique donne une projection et un reçu acquis nul',async()=>{
  for (const [wrathRoll,name] of [[51,'Hémorragique'],[79,'Brisé']]) {
    const {store}=await fixture({actorExtensions:{v5:{immunities:{conditions:[name]}}}});
    const before=stateOf(store),preview=store.previewDivineExecution(BATTLE,input({wrathRoll}));
    assert.equal(preview.ready,true,preview.error);
    assert.equal(preview.wrathConditionPreview?.projection?.immunized,true);
    assert.equal(preview.wrathConditionPreview?.projection?.acquiredCount,0);
    assert.ok(preview.wrathConditionPreview?.projection?.reminders?.length);
    assert.deepEqual(stateOf(store),before,'projection de l’immunité pure');
    const applied=await store.applyDivineExecution(BATTLE,{preview});
    assert.equal(applied.ok,true,applied.error);
    assert.equal(level(priestOf(store),name),0,'l’immunité interdit la pose canonique');
    assert.equal(applied.receipt.conditionReceipt?.acquiredCount,0);
    assert.equal(priestOf(store).extensions.v5.divine.sin,0,'le Courroux résolu décrémente aussi sous immunité');
  }
});

test('Courroux états indépendant — l’aperçu projette la perte de Momentum et l’application suit le service V5',async()=>{
  const {store}=await fixture({actorExtensions:{v5:{hasMomentum:true}}});
  const before=stateOf(store),preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
  assert.equal(preview.ready,true,preview.error);
  assert.equal(preview.wrathConditionPreview?.projection?.momentumBefore,true);
  assert.equal(preview.wrathConditionPreview?.projection?.momentumAfter,false);
  assert.deepEqual(stateOf(store),before,'le Momentum ne change pas au calcul');
  const applied=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(applied.ok,true,applied.error);
  assert.equal(priestOf(store).extensions.v5.hasMomentum,false,'acquireV5Conditions applique la règle réelle de Momentum');
  assert.deepEqual(applied.receipt.conditionReceipt?.momentum,{before:true,after:false});
});

test('Courroux états indépendant — refus de persistance laisse état et aperçu récupérables',async()=>{
  const {store,persist}=await fixture();
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
  assert.equal(preview.ready,true,preview.error);
  const before=stateOf(store);persist.refuse=true;
  const refused=await safeApply(store,preview);
  assert.equal(refused.ok,false,'refus atomique remonté');
  assert.deepEqual(stateOf(store),before,'aucun État ni Péché en mémoire');
  assert.ok(preview.wrathConditionPreview,'le même aperçu reste disponible');
  persist.refuse=false;
  const applied=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(applied.ok,true,applied.error);
  assert.equal(level(priestOf(store),'Hémorragique'),2,'le retry réussi ne pose qu’une occurrence');
});

test('Courroux états indépendant — rechargement, Undo et Redo gardent états et preuve au même commit',async()=>{
  const {store,persist}=await fixture();
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
  assert.equal(preview.ready,true,preview.error);
  const applied=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(applied.ok,true,applied.error);
  const receipt=stateOf(store).extensions.v5.divineExecutions.at(-1);
  assert.equal(receipt.conditionReceipt?.proof?.modifiedRoll,61);
  const loaded=createStore({persistence:persist,storage:null}); await loaded.ready;
  const loadedPriest=loaded.listParticipants().find(row=>row.id==='priest');
  assert.equal(level(loadedPriest,'Hémorragique'),2);
  const receiptIds=JSON.parse(loaded.getFullJSON()).extensions.v5.divineExecutions.at(-1).conditionReceipt?.stateIds||[];
  assert.ok(receiptIds.length>0);
  assert.equal(receiptIds.reduce((sum,id)=>sum+(loadedPriest.states.find(row=>row.id===id)?.level||0),0),2,'IDs sourcés du reçu désignent bien les niveaux persistés');
  await store.undo();
  assert.equal(level(priestOf(store),'Hémorragique'),0,'Annuler enlève les États du commit');
  assert.equal((stateOf(store).extensions.v5.divineExecutions||[]).length,0,'Annuler retire aussi le reçu');
  await store.redo();
  assert.equal(level(priestOf(store),'Hémorragique'),2,'Rétablir les États une seule fois');
  assert.equal(stateOf(store).extensions.v5.divineExecutions.at(-1).conditionReceipt?.proof?.sinAtTest,1);
});

test('Courroux états indépendant — preview périmé refuse État et décrément après une autre mutation',async()=>{
  const {store}=await fixture();
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
  assert.equal(preview.ready,true,preview.error);
  await store.updateParticipant('ally',{hp:19});
  const before=stateOf(store);
  await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview}),/changé|recalculez/i);
  assert.deepEqual(stateOf(store),before);
  assert.equal(level(priestOf(store),'Hémorragique'),0);
  assert.equal(priestOf(store).extensions.v5.divine.sin,1);
});

test('Courroux états indépendant — la récupération de Brisé exige ses faits et ne retire que les occurrences prouvées',async()=>{
  const {store}=await fixture();
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:79}));
  assert.equal(preview.ready,true,preview.error);
  await store.applyDivineExecution(BATTLE,{preview});
  const participant=priestOf(store),transition={phase:'endOfRound',round:1,actorId:'priest'};
  const unconfirmed=recoverV5Condition(participant,'brise',{method:'cool',test:{success:true,sl:1},transition});
  assert.equal(unconfirmed.ready,false,'un engagement inconnu ne devient pas une récupération implicite');
  assert.ok(unconfirmed.needsInput.some(row=>row.field==='engaged'));
  assert.equal(level(priestOf(store),'Brisé'),2,'aperçu incomplet sans mutation');
  const cooled=recoverV5Condition(participant,'brise',{method:'cool',test:{success:true,sl:1},engaged:false,transition});
  assert.equal(cooled.ready,true,cooled.error);
  assert.equal(level(cooled.participant,'Brisé'),1,'1 DR retiré enlève une occurrence');
  const hidden=recoverV5Condition(cooled.participant,'brise',{method:'hiding',engaged:false,fullRoundHidden:true});
  assert.equal(hidden.ready,true,hidden.error);
  assert.equal(level(hidden.participant,'Brisé'),0,'Round entier caché explicitement confirmé retire le dernier état');
});

test('Courroux états indépendant — un executionId réutilisé reste refusé après éviction du journal',async()=>{
  const executionId='wrath-id-reuse-after-eviction';
  const {store}=await fixture();
  const first=store.previewDivineExecution(BATTLE,input({roll:99,wrathRoll:51,executionId}));
  assert.equal(first.ready,true,first.error);
  assert.equal((await store.applyDivineExecution(BATTLE,{preview:first})).ok,true);
  const snapshot=stateOf(store);
  snapshot.extensions.v5.divineExecutions=[]; // simule l’éviction légitime après rétention bornée
  const prior= snapshot.combat.participants.find(row=>row.id==='priest').states.find(row=>row.divineWrathExecutionId===executionId);
  assert.ok(prior,'la Condition conserve son identité de déclenchement hors journal');
  snapshot.combat.participants.find(row=>row.id==='priest').extensions.v5.divine.sin=1;
  await store.loadFromJSON(snapshot);
  const replay=store.previewDivineExecution(BATTLE,input({roll:99,wrathRoll:51,executionId}));
  assert.equal(replay.ready,false,'l’identité ne peut pas être réutilisée au-delà de la rétention du reçu');
  assert.ok(replay.needsInput?.length||/execution|identité|déjà|réutilis/i.test(replay.error||''));
});
