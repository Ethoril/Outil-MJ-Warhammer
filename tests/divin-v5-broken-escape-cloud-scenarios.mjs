import assert from 'node:assert/strict';

const clone = value => structuredClone(value);
const withoutExportTime = state => {
  const copy = clone(state);
  delete copy.exportedAt;
  return copy;
};
const participant = (state, id) => state.combat.participants.find(row => row.id === id);
const receiptsFor = (state, action) => (state.extensions?.v5?.brokenEscape?.receipts || [])
  .filter(row => row.action === action);
const quotaRows = state => state.extensions?.v5?.actionLedger?.quotaUsage || [];
const semanticBrokenFacts = facts => {
  if(!facts)return undefined;
  const witness=facts.engagementConfirmation;
  const engagedEnemyIds=Array.isArray(facts.engagedEnemyIds)?facts.engagedEnemyIds
    :witness?.confirmed===true&&witness.enemyCount===0?[]:undefined;
  return {visibleToAnyEnemy:facts.visibleToAnyEnemy,visibleToAnyEnemyAfter:facts.visibleToAnyEnemyAfter,moveMode:facts.moveMode,
    ...(engagedEnemyIds?{engagedEnemyIds}:{}),...(witness?{engagementConfirmation:witness}:{})};
};
const semanticState = state => ({
  combat:{round:state.combat?.round,currentActorId:state.combat?.currentActorId,order:state.combat?.order || [],
    participants:(state.combat?.participants || []).map(row=>({id:row.id,hp:row.hp,states:(row.states || []).map(item=>({
      id:item.id,key:item.key,name:item.name,level:item.level
    })),skills:(row.skills || []).map(skill=>({name:skill.name,status:skill.status,total:skill.total})),
      movement:row.caracs?.M,athletics:row.caracs?.Ag,
      divineSin:row.extensions?.v5?.divine?.sin}))},
  brokenReceipts:(state.extensions?.v5?.brokenEscape?.receipts || []).map(row=>({
    id:row.id,actorId:row.actorId,action:row.action,turn:row.turn,
    facts:semanticBrokenFacts(row.facts),
    moveDistance:row.moveDistance,
    // Flee never performs a Sprint. RTDB may omit this optional null, so normalize
    // only that structurally absent Flee field; retain every measured Sprint distance.
    sprintDistance:row.action==='flee'?(row.sprintDistance??null):row.sprintDistance,
    totalDistance:row.totalDistance,
    test:row.test?{score:row.test.score,characteristic:row.test.characteristic,difficultySl:row.test.difficultySl,
      result:{roll:row.test.result?.roll,initialRoll:row.test.result?.initialRoll,sl:row.test.result?.sl,
        reversed:row.test.result?.reversed,success:row.test.result?.success}}:undefined,
    source:row.source?{document:row.source.document,fileSha256:row.source.fileSha256,
      ruleVersion:row.source.ruleVersion,printedPages:(row.source.readingRefs || []).map(ref=>ref.printedPage)}:undefined
  })),
  quotaUsage:quotaRows(state).map(row=>({actorId:row.actorId,quotaId:row.quotaId,scope:row.scope,scopeKey:row.scopeKey,used:row.used})),
  standardTurnActions:(state.extensions?.v5?.standardTurnActions||[]).map(row=>({actorId:row.actorId,actionId:row.actionId,encounterId:row.encounterId,round:row.round,turnId:row.turnId,kind:row.kind}))
});
const cleanFixture = ({currentActorId='hero', heroBroken=true}={}) => {
  const subject=(id,extra={})=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',init:id==='hero'?60:id==='ally'?50:40,hp:20,maxHp:30,
    caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},
    skills:id==='hero'?[{id:'skill-athletics',name:'Athlétisme',carac:'Ag',status:'resolved',total:60}]:[{name:'Prière',status:'resolved',carac:'Soc',total:60}],
    armor:{head:0,body:0,arms:0,legs:0},states:id==='hero'&&heroBroken?[{id:'cloud-broken',name:'Brisé',key:'brise',level:1}]:[],
    talents:id==='ally'?[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}]:[],prayers:[],
    extensions:{v5:{resourceCharacterId:'broken-cloud-'+id,divine:{sin:id==='ally'&&!heroBroken?1:0}}},...extra});
  return {schemaVersion:3,reserve:[],diceLines:[],log:[],extensions:{v5:{combatId:'qa-divine-broken',turnIndex:1}},
    combat:{round:1,currentActorId,order:['hero','ally','enemy'],participants:[subject('hero'),subject('ally'),subject('enemy')]}};
};
const countQuota = (state, quotaId, actorId, turnId) => {
  const rows = quotaRows(state);
  assert.ok(Array.isArray(rows), 'quotaUsage doit être une liste canonique');
  return rows.filter(row => {
    const text = JSON.stringify(row);
    return text.includes(quotaId) && text.includes(actorId) && text.includes(turnId);
  }).length;
};
const apply = async (page, action, facts, roll) => page.evaluate(async ({action, facts, roll}) => {
  const store = window.qa35.store;
  const preview = store.previewBrokenEscape({actorId:'hero', action, facts, ...(roll === undefined ? {} : {roll})});
  if (!preview.ready) throw Error(JSON.stringify(preview));
  const result = await store.applyBrokenEscape(preview);
  if (result?.ok === false || result?.status === 'blocked') throw Error(JSON.stringify(result));
  return {preview, result};
}, {action, facts, roll});

export async function runBrokenEscapeCloudScenarios({A, B, settled, pull, envelope, check, boot}) {
  assert.equal(typeof boot, 'function', 'le scénario cloud doit recevoir le boot IndexedDB existant');
  assert.equal(typeof A.reload, 'function');
  // Reset this isolated scenario to a clean, canonical domain fixture. The prior cloud suite
  // may have already consumed an Action; no earlier operation may leak into this Tour.
  await A.evaluate(initial => window.qa35.store.loadFromJSON(initial), cleanFixture());
  await settled(A);
  await pull(B);
  let state = await envelope(A);
  assert.equal(state.combat.currentActorId, 'hero');
  assert.ok(participant(state, 'hero').states.some(row => row.key === 'brise' || row.name === 'Brisé'));
  assert.ok(participant(state, 'hero').skills.some(row => row.name === 'Athlétisme' && row.total === 60));
  check('Brisé cloud : fixture explicite M4/Athlétisme 60, acteur courant, avant Action');

  const fleeFacts = {
    visibleToAnyEnemy:true,
    engagedEnemyIds:[],
    moveMode:'run',
    visibleToAnyEnemyAfter:true
  };
  const flee = await apply(A, 'flee', fleeFacts);
  assert.equal(flee.preview.action, 'flee');
  assert.equal(flee.preview.moveDistance, 16, 'Run Move/Flee = 4 × M pour M4');
  await settled(A);
  await pull(B);
  state = await envelope(A);
  assert.equal(receiptsFor(state, 'flee').length, 1);
  assert.equal(receiptsFor(state, 'flee')[0].facts.visibleToAnyEnemy,true,'le reçu conserve la visibilité constatée');
  assert.equal(receiptsFor(state, 'flee')[0].facts.visibleToAnyEnemyAfter,true,'le reçu conserve la visibilité après déplacement');
  assert.equal(receiptsFor(state, 'flee')[0].facts.moveMode,'run','le reçu conserve le mode Run');
  assert.deepEqual(receiptsFor(state, 'flee')[0].facts.engagementConfirmation,{confirmed:true,enemyCount:0},
    'le reçu prouve que le MJ a explicitement confirmé une liste vide malgré l’omission possible de [] par RTDB');
  assert.ok(receiptsFor(state, 'flee')[0].source?.fileSha256, 'le reçu Flee conserve la source vérifiable');
  const committedFleeReceipt = receiptsFor(state, 'flee')[0];
  assert.deepEqual(semanticState(await envelope(B)), semanticState(state));
  assert.deepEqual(semanticState(await envelope(B)).brokenReceipts.find(row=>row.action==='flee').facts.engagedEnemyIds,[],
    'la projection ne restaure une liste vide qu’à partir du témoin MJ explicite du reçu');
  assert.equal(countQuota(state, 'system:turn-move', 'hero', flee.preview.turn.turnId), 1);
  check('Move(Flee) Run : 16 yd et reçu/quota du Tour synchronisés de A vers B');

  await A.reload();
  await boot(A, 'A');
  await settled(A);
  await pull(B);
  state = await envelope(A);
  assert.equal(receiptsFor(state, 'flee').length, 1, 'reload ne duplique pas le reçu Flee');
  assert.deepEqual(receiptsFor(state, 'flee')[0], committedFleeReceipt, 'reload conserve le même reçu source/distance');
  assert.deepEqual(receiptsFor(state, 'flee')[0].facts.engagementConfirmation,{confirmed:true,enemyCount:0},
    'la preuve de liste vide explicitement confirmée survit au reload');
  assert.deepEqual(semanticState(await envelope(B)), semanticState(state));
  assert.deepEqual(semanticState(await envelope(B)).brokenReceipts.find(row=>row.action==='flee').facts.engagedEnemyIds,[],
    'la preuve d’absence d’engagement survit au reload et au pull sans défaut implicite');
  assert.equal(countQuota(state, 'system:turn-move', 'hero', flee.preview.turn.turnId), 1);
  assert.equal(await A.evaluate(() => window.qa35.store.canUndo()), true);
  await A.evaluate(async () => window.qa35.store.undo());
  await settled(A);
  await pull(B);
  assert.equal(receiptsFor(await envelope(A), 'flee').length, 0, 'Undo retire mouvement et reçu ensemble');
  assert.equal(receiptsFor(await envelope(B), 'flee').length, 0);
  await A.evaluate(async () => window.qa35.store.redo());
  await settled(A);
  await pull(B);
  state = await envelope(A);
  assert.equal(receiptsFor(state, 'flee').length, 1, 'Redo restaure le même mouvement');
  assert.equal(countQuota(state, 'system:turn-move', 'hero', flee.preview.turn.turnId), 1);
  check('Flee : IndexedDB, reload, Undo/Redo restaurent ensemble mouvement, reçu et quota');

  // Sprint is the required following Action. Use an explicit d100 and let the shared V5
  // Test implementation determine SL; the scenario checks its source-derived distance identity.
  const sprint = await apply(A, 'sprint', {
    visibleToAnyEnemy:true,
    visibleToAnyEnemyAfter:false
  }, 50);
  assert.ok(sprint.preview.test, 'Sprint doit conserver le Test Athlétisme V5 partagé');
  assert.equal(sprint.preview.test.score, 60);
  assert.equal(sprint.preview.test.result.sl, 3, 'Athlétisme 60, jet 50, difficulté Average +2 donnent 3 SL');
  assert.equal(sprint.preview.sprintDistance, 16 + sprint.preview.test.result.sl,
    'contribution Sprint = Run (4 × M) + SL');
  assert.equal(sprint.preview.moveDistance, 16, 'la contribution de Move/Flee reste distincte du Sprint');
  assert.equal(sprint.preview.totalDistance, 35, 'M4 Run/Flee 16 yd + Sprint Run 16 yd + 3 SL = 35 yd');
  await settled(A);
  await pull(B);
  state = await envelope(A);
  const sprintReceipt = receiptsFor(state, 'sprint');
  assert.equal(sprintReceipt.length, 1);
  assert.deepEqual(sprintReceipt[0].facts, {visibleToAnyEnemy:true,visibleToAnyEnemyAfter:false}, 'le reçu Sprint conserve les faits de visibilité');
  assert.deepEqual(sprintReceipt[0].test, sprint.preview.test, 'le reçu persiste le d100, le choix, les SL et le contexte du Test partagé');
  assert.ok(sprintReceipt[0].source?.fileSha256, 'le reçu Sprint conserve la source vérifiable');
  assert.deepEqual(semanticState(await envelope(B)), semanticState(state));
  assert.equal(countQuota(state, 'system:turn-action', 'hero', sprint.preview.turn.turnId), 1);
  check('Sprint : Test Athlétisme partagé +2 SL, contribution Run+SL et reçu d’Action synchronisés');

  // Reload, Undo and Redo must preserve the exact audited Sprint result and exactly one quota.
  const committedSprintReceipt = sprintReceipt[0];
  await A.reload();
  await boot(A, 'A');
  await settled(A);
  await pull(B);
  assert.deepEqual(receiptsFor(await envelope(A), 'sprint')[0], committedSprintReceipt);
  assert.deepEqual(semanticState(await envelope(B)), semanticState(await envelope(A)));
  await A.evaluate(async () => window.qa35.store.undo());
  await settled(A);
  await pull(B);
  assert.equal(receiptsFor(await envelope(A), 'sprint').length, 0);
  assert.equal(countQuota(await envelope(A), 'system:turn-action', 'hero', sprint.preview.turn.turnId), 0);
  assert.equal(receiptsFor(await envelope(B), 'sprint').length, 0);
  await A.evaluate(async () => window.qa35.store.redo());
  await settled(A);
  await pull(B);
  assert.deepEqual(receiptsFor(await envelope(A), 'sprint')[0], committedSprintReceipt);
  assert.deepEqual(semanticState(await envelope(B)), semanticState(await envelope(A)));
  assert.equal(countQuota(await envelope(A), 'system:turn-action', 'hero', sprint.preview.turn.turnId), 1);
  check('Sprint reload/Undo/Redo : résultat d100, faits, source et quota restaurés atomiquement');

  // Create two genuinely divergent offline Sprint branches from the same Flee-only base.
  // Conflict resolution must keep one branch and one Action quota.
  await A.evaluate(async () => window.qa35.store.undo());
  await settled(A);
  await pull(B);
  assert.equal(receiptsFor(await envelope(B), 'sprint').length, 0);
  await A.evaluate(() => { window.qa35.control.offline = true; });
  await B.evaluate(() => { window.qa35.control.offline = true; });
  const branchBase = await envelope(A);
  assert.deepEqual(semanticState(await envelope(B)), semanticState(branchBase));
  const branchA = await apply(A, 'sprint', {visibleToAnyEnemy:true, visibleToAnyEnemyAfter:false}, 50);
  const branchB = await B.evaluate(async () => {
    const store = window.qa35.store;
    const preview = store.previewBrokenEscape({actorId:'hero', action:'sprint',
      facts:{visibleToAnyEnemy:true, visibleToAnyEnemyAfter:false}, roll:51});
    if (!preview.ready) throw Error(JSON.stringify(preview));
    const result = await store.applyBrokenEscape(preview);
    if (result?.ok === false || result?.status === 'blocked') throw Error(JSON.stringify(result));
    return preview;
  });
  await A.evaluate(() => window.qa35.session.idle());
  await B.evaluate(() => window.qa35.session.idle());
  const localA = await envelope(A), localB = await envelope(B);
  assert.equal(receiptsFor(localA, 'sprint').length, 1);
  assert.equal(receiptsFor(localB, 'sprint').length, 1);
  assert.notDeepEqual(receiptsFor(localA, 'sprint'), receiptsFor(localB, 'sprint'), 'les branches représentent deux jets distincts');
  await A.evaluate(() => { window.qa35.control.offline = false; });
  await settled(A);
  await B.evaluate(() => { window.qa35.control.offline = false; });
  assert.equal((await pull(B)).status, 'conflict', 'deux actions divergentes du même Tour demandent résolution');
  const conflict = JSON.parse(await B.evaluate(() => window.qa35.store.exportSyncConflict()));
  assert.equal(receiptsFor(conflict.local.state, 'sprint').length, 1);
  assert.equal(receiptsFor(conflict.remote.state, 'sprint').length, 1);
  await B.evaluate(() => window.qa35.store.resolveSyncRemote());
  await settled(B);
  await pull(A);
  state = await envelope(A);
  assert.equal(receiptsFor(state, 'flee').length, 1);
  assert.equal(receiptsFor(state, 'sprint').length, 1, 'la résolution retient exactement une branche');
  const chosenSprintReceipt = receiptsFor(state, 'sprint')[0];
  assert.equal(countQuota(state, 'system:turn-move', 'hero', flee.preview.turn.turnId), 1);
  assert.equal(countQuota(state, 'system:turn-action', 'hero', branchA.preview.turn.turnId), 1,
    'résoudre ne crédite pas une seconde Action du Tour');
  assert.deepEqual(semanticState(await envelope(B)), semanticState(state));
  await A.reload();
  await boot(A, 'A');
  await settled(A);
  await pull(B);
  state = await envelope(A);
  assert.equal(receiptsFor(state, 'sprint').length, 1, 'reload après conflit ne duplique pas le reçu');
  assert.deepEqual(receiptsFor(state, 'sprint')[0], chosenSprintReceipt, 'la branche gagnante et son jet/source survivent à reload');
  assert.equal(countQuota(state, 'system:turn-action', 'hero', branchA.preview.turn.turnId), 1);
  check('Conflit Sprint hors ligne : conflit explicite, branche distante unique, quotas sans double compte après reload');

  // Rebase to a distinct clean fixture for the adjudicated mid-Turn limit. No earlier
  // actionLedger entry may make this reproduction pass or fail spuriously.
  await A.evaluate(initial => window.qa35.store.loadFromJSON(initial), cleanFixture({currentActorId:'ally',heroBroken:false}));
  await settled(A);
  await pull(B);
  // A self-targeted prayer consumes the current actor’s Action and Wrath 89–95 makes that
  // same actor Brisé. No auto-report or extra Sprint is allowed.
  const prayerId = 'divine:blessing:myrmidia:battle';
  await A.evaluate(async prayerId => {
    const store = window.qa35.store;
    const actorId = store.getCombat().currentActorId;
    if (actorId !== 'ally') throw Error('Le scénario exige le PJ allié comme acteur courant');
    const input = {actorId, targetIds:[actorId], roll:99, wrathRoll:79, canSpeak:true,
      choices:{range:0,targets:0,duration:0,effect:0},
      facts:{targets:{[actorId]:{withinRange:true,ally:true}}}};
    const preview = store.previewDivineExecution(prayerId, input);
    if (!preview.ready) throw Error(JSON.stringify(preview));
    const result = await store.applyDivineExecution(prayerId, {preview});
    if (result?.ok === false) throw Error(JSON.stringify(result));
  }, prayerId);
  await settled(A);
  await pull(B);
  state = await envelope(A);
  const ally = participant(state, 'ally');
  const prayerActionRows=(state.extensions?.v5?.standardTurnActions||[]).filter(row=>row.actorId==='ally'&&row.kind==='action');
  assert.equal(prayerActionRows.length, 1, 'la Prière est tracée dans le registre canonique des Actions du Tour');
  assert.equal(prayerActionRows[0].turnId, 'qa-divine-broken:1:ally',
    'la consommation porte le Tour canonique du prêtre courant');
  assert.equal(quotaRows(state).filter(row=>row.actorId==='ally'&&row.quotaId==='system:turn-action'&&row.used===1).length, 0,
    'une Prière n’ajoute pas de quota talent system:turn-action');
  assert.ok(ally.states.some(row => row.key === 'brise' || row.name === 'Brisé'),
    'Courroux 89–95 confère Brisé au prêtre ciblé');
  const midturnBefore = withoutExportTime(state);
  const midturnPreview = await A.evaluate(() => {
    const store = window.qa35.store;
    return store.previewBrokenEscape({actorId:'ally', action:'flee', facts:{
      visibleToAnyEnemy:true, engagedEnemyIds:[], moveMode:'run', visibleToAnyEnemyAfter:true
    }});
  });
  assert.equal(midturnPreview.ready, false);
  assert.equal(midturnPreview.status, 'blocked');
  assert.match(midturnPreview.error, /DIV-BROKEN-MIDTURN-01/, 'le refus doit exposer la décision MJ spécifique');
  assert.deepEqual(withoutExportTime(await envelope(A)), midturnBefore,
    'l’aperçu de blocage ne produit ni Flee, ni Sprint, ni report automatique');
  const blockedAttestation=await A.evaluate(()=>window.qa35.store.confirmBrokenEscapeVisibility({actorId:'ally',visibleToAnyEnemy:false}));
  assert.equal(blockedAttestation.status,'blocked','une attestation hors de vue ne contourne pas la décision MIDTURN');
  assert.equal(blockedAttestation.code,'DIV-BROKEN-MIDTURN-01');
  assert.deepEqual(withoutExportTime(await envelope(A)),midturnBefore,'le blocage de l’attestation ne mute ni registre ni séquence');
  assert.equal(receiptsFor(await envelope(A), 'sprint').length, 0, 'aucun Sprint supplémentaire ne naît de Brisé acquis après l’Action');
  await settled(A);
  await pull(B);
  assert.deepEqual(semanticState(await envelope(B)), semanticState(await envelope(A)));
  check('Prière + Courroux 89–95 en milieu de Tour : DIV-BROKEN-MIDTURN-01 bloque sans mutation ni Sprint reporté');

  return {scenarios:7, fleeReceiptId:receiptsFor(await envelope(A), 'flee')[0]?.executionId,
    sprintReceiptIds:receiptsFor(await envelope(A), 'sprint').map(row => row.executionId)};
}
