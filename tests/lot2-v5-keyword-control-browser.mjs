import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync, mkdirSync } from 'node:fs';
import { join, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const mime = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(resolve(root) + sep) || !statSync(file).isFile()) throw new Error('not found');
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
mkdirSync(join(root, 'tmp/lot2-keyword-control-ui'), { recursive: true });
const errors = [];
async function setup({ width = 1440, both = false, states = [], extraTarget = false, actorMomentum = true, actorTalents = [], targetTalents = [] } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 980 }, serviceWorkers: 'block' });
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/blank`); await page.setContent('<main><div id="mount"></div><button id="test-undo">Annuler la dernière commande</button><div id="editor"></div><div id="dice-prep-results"></div><button id="test-quick-roll">Jet rapide V5</button><button id="test-next-turn">Terminer le tour de recette</button></main>');
  await page.addStyleTag({ path: join(root, 'MJ.css') }); await page.addStyleTag({ path: join(root, 'js/ui/workspace.css') });
  await page.evaluate(async ({ origin, both, states, extraTarget, actorMomentum, actorTalents, targetTalents }) => {
    const [{ initWorkspaceView }, { createStore }, { renderReferenceTables }, { withMomentum }, { createCombatEngine }, { openV5EffectInputDialog, chooseV5RecoveryMethod, recoveryOptionsFor }, { openV5FortuneDialog }] = await Promise.all([
      import(`${origin}/js/ui/workspace-view.js`), import(`${origin}/js/core/store.js`), import(`${origin}/js/ui/rules-view.js`), import(`${origin}/js/core/v5-combat-rules.js`), import(`${origin}/js/core/combat.js`), import(`${origin}/js/ui/v5-effect-dialog.js`), import(`${origin}/js/ui/v5-fortune-dialog.js`)
    ]);
    let saved = null;
    const listeners = new Map();
    const bus = { on(event, fn) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); }, emit(event, ...args) { for (const fn of listeners.get(event) || []) fn(...args); } };
    const store = createStore({ bus, persistence: { async load() { return structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } } });
    await store.ready;
    const attack = { id: 'blade', note: 'Épée de recette', base: 65, type: 'attack', attr: 'CC', damage: 4, qualities: [] };
    const skill = { id: 'search', note: 'Perception de recette', base: 45, type: 'skill', attr: 'I', damage: 0, qualities: [] };
    const legacy = { id: 'legacy', note: 'Action ancienne', base: 50, type: 'skill', mod: 10, damage: 0 };
    const actor = { id: 'actor', name: 'Acteur de recette', kind: 'PJ', hp: 12, maxHp: 12, zone: 'active', camp: 'pj', states, talents: actorTalents,
      caracs: { CC: 65, CT: 45, F: 30, E: 30, Ag: 35 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, actions: [attack, skill, legacy], extensions: { v5: { hasMomentum: actorMomentum } } };
    const target = { id: 'target', name: 'Défenseur de recette', kind: 'Créature', hp: 12, maxHp: 12, zone: 'active', camp: 'ennemi', states: [], talents: targetTalents,
      caracs: { CC: 35, E: 30, Ag: 42 }, armor: { head: 0, body: 7, arms: 0, legs: 0 }, actions: [{ id: 'dodge', type: 'defense', note: 'Esquive', base: 42, damage: 0 }], extensions: { v5: { hasMomentum: both } } };
    const other = { ...structuredClone(target), id: 'other', name: 'Autre cible', caracs: { CC: 25, E: 30, Ag: 31 }, actions: [{ id: 'dodge', type: 'defense', note: 'Esquive', base: 31, damage: 0, mod: 10, extensions: { v5: { slModifier: -1 } } }] };
    await store.loadFromJSON({ schemaVersion: 3, extensions: {v5:{combatId:'control-ui',turnIndex:1}}, reserve: [], combat: { round: 1, currentActorId: 'actor', order: ['actor', 'target', ...(extraTarget ? ['other'] : [])], participants: [actor, target, ...(extraTarget ? [other] : [])] }, diceLines: [], log: [] });
    const calls = []; const applyResults = []; const turnResults = []; const combatEngine = createCombatEngine(store);
    const collect = async (operation, title) => {
      let result = await operation({}, store.getLocalRevision());
      if (result?.status === 'requires-input') result = await openV5EffectInputDialog({ pending: result, submit: operation, getCurrentRevision: () => store.getLocalRevision(), title });
      window.lastEffectResult=result;return result;
    };
    document.querySelector('#test-next-turn').addEventListener('click', async () => {
      let result = await combatEngine.nextTurn();
      if (result?.status === 'requires-input') result = await openV5EffectInputDialog({ pending: result, submit: (inputs,baseRevision) => combatEngine.nextTurn({inputs,baseRevision}), getCurrentRevision: () => store.getLocalRevision(), title:'Terminer le tour : effets V5' });
      turnResults.push(result);
    });
    const editFortune = id => openV5FortuneDialog({ participantName: store.listParticipants().find(row => row.id === id).name, fortune: store.getFortune(id), getCurrentRevision: () => store.getLocalRevision(), submit: (amount, options) => store.setFortune(id, amount, options) });
    const view = initWorkspaceView({ Store: store, Bus: bus, mount: document.querySelector('#mount'), actions: {
      renderRules: content => renderReferenceTables('', content), renderLog: content => { content.textContent = store.getLog().map(row => row.text).join('\n'); },
      getFortune: id => store.getFortune(id), editFortune,
      setMomentum: (id, value) => { calls.push({ kind: 'momentum', id, value }); const participant = store.listParticipants().find(row => row.id === id); return store.updateParticipant(id, withMomentum(participant, value)); },
      adjustHp: ({participantId,delta}) => delta>0 ? collect((inputs,baseRevision)=>store.healWounds(participantId,delta,{baseRevision}), 'Récupérer des Blessures') : store.updateParticipant(participantId,{hp:Math.max(0,store.listParticipants().find(row=>row.id===participantId).hp+delta)}),
      setStates: (id, next) => store.updateParticipant(id, { states: next }),
      acquireStates: (id, next) => collect((inputs,baseRevision) => store.acquireConditions(id,next,{...(inputs[id]||{}),baseRevision,round:store.getCombat().round,authorId:store.getCombat().currentActorId,targetId:id}), 'Ajouter un État V5'),
      recoverState: async(id,state) => {
        const method=await chooseV5RecoveryMethod({participantName:store.listParticipants().find(row=>row.id===id).name,condition:state,getFortune:()=>store.getFortune(id),editFortune:()=>editFortune(id)});if(!method)return {status:'cancelled'};
        return collect((inputs,baseRevision)=>{ const options={method,...(method==='medical-attention'?{medicalAttention:true}:method==='surgery'?{surgery:true}:{}),...recoveryOptionsFor(inputs[id],store.getCombat().round),baseRevision};return store.recoverCondition(id,state.id||state.key||state.name,options); },'Récupérer un État');
      },
      applyResolution: async preview => { calls.push({ kind: 'apply', preview: structuredClone(preview) }); const result = await store.applyResolution(preview); applyResults.push(result); if(!['applied','duplicate','stale'].includes(result?.status))throw new Error(result?.reason || 'Résolution non appliquée.'); return result; }
    } });
    document.querySelector('#test-undo').addEventListener('click', () => store.undo());
    view.setSpace('play'); window.lot2UI = { store, view, calls, applyResults, turnResults, combatEngine, bus, recoveryOptionsFor, getSaved: () => structuredClone(saved) };
    window.randomDraws = 0; const originalRandom = Math.random; Math.random = () => { window.randomDraws += 1; return originalRandom(); };
  }, { origin, both, states, extraTarget, actorMomentum, actorTalents, targetTalents });
  return { page, context };
}
const panel = page => page.locator('.workspace-resolution');
const applyButton = page => panel(page).locator('[data-focus-key="apply"]');
async function enterRolls(page, attack, defense) {
  await panel(page).locator('[data-roll-input="attack"]').fill(String(attack));
  if (defense != null) await panel(page).locator('[data-roll-input="defense"]').fill(String(defense));
  await panel(page).getByRole('button', { name: 'Calculer', exact: true }).click();
}
async function defenseCC(page) {
  await panel(page).locator('[data-focus-key="defense-stat"]').selectOption('CC');
}
async function participantHP(page, id) { return page.evaluate(id => window.lot2UI.store.listParticipants().find(row => row.id === id).hp, id); }

const owned = id => ({id,name:id,rank:1,status:'resolved'});

async function customAction(page,{name='Charme',type='skill',base=50,damage=0,qualities=[]}={}){
 await page.evaluate(async({name,type,base,damage,qualities})=>{
  const {getReferenceCatalogue}=await import('/js/core/reference-catalog.js');const id=getReferenceCatalogue().skills.find(row=>row.nom===name).id;
  await window.lot2UI.store.updateParticipant('actor',{actions:[{id:'control24-action',type,base,damage,attr:type==='attack'||name.startsWith('Corps à corps')?'CC':'Soc',note:'Test de recette '+name,qualities,extensions:{fiche:{skillId:id}}}]});
 },{name,type,base,damage,qualities});
 await page.locator('[data-action-key="control24-action"]').click();
}
const preview=page=>page.evaluate(()=>window.lot2UI.view.getViewState().resolution.preview);
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'Mobile page must not overflow');}

function gear(id,patch={}){return {id,baseId:'synthetic-'+id,catalogVersion:'synthetic-keyword-control',kind:'weapon',name:id,category:'Base',damage:'4',reach:'Moyenne',range:'',ap:null,locations:[],layer:'none',keywords:[],notes:'',source:'Fixture synthétique indépendante',custom:true,...patch};}
const words=(...ids)=>ids.map(id=>({id,parameter:''}));
const allLocations=['head','body','leftArm','rightArm','leftLeg','rightLeg'];
function layeredArmor(){return [gear('leather',{kind:'armour',name:'Cuir témoin',category:'Armure',damage:'',reach:'',ap:1,layer:'leather',locations:allLocations}),gear('mail',{kind:'armour',name:'Maille souple',category:'Armure',damage:'',reach:'',ap:2,layer:'flexible',locations:['body','leftArm'],keywords:words('flexible')}),gear('mail-copy',{kind:'armour',name:'Maille moindre même couche',category:'Armure',damage:'',reach:'',ap:1,layer:'flexible',locations:['body'],keywords:words('flexible')}),gear('plates',{kind:'armour',name:'Plaques conditionnelles',category:'Armure',damage:'',reach:'',ap:3,layer:'rigid',locations:['body'],keywords:words('partielle','points-faibles','impenetrable')}),gear('right-arm',{kind:'armour',name:'Brassard droit',category:'Armure',damage:'',reach:'',ap:4,layer:'rigid',locations:['rightArm']})];}
function linkedAction(id,item,{base=60,attr='CC',type='attack'}={}){return {id,type,note:item.name,base,attr,damage:type==='defense'?0:Number(item.damage)||0,qualities:item.keywords,extensions:{equipment:item,fiche:{equipmentId:item.id}}};}
async function configure(page,{actor,target,actionId}){
 await page.evaluate(async({actor,target})=>{
  const {getReferenceCatalogue}=await import('/js/core/reference-catalog.js');
  for(const patch of [actor,target])for(const action of patch?.actions||[]){const name=action.attr==='CT'?'Projectiles (Arc)':'Corps à corps (Base)';const entry=getReferenceCatalogue().skills.find(row=>row.nom===name);if(!entry)throw new Error('Compétence canonique absente '+name);action.extensions.fiche.skillId=entry.id;}
  if(actor)await window.lot2UI.store.updateParticipant('actor',actor);if(target)await window.lot2UI.store.updateParticipant('target',target);
 },{actor,target});
 if(actionId)await page.locator('[data-action-key="'+actionId+'"]').click();
}
async function criticalInput(page,field,value){await panel(page).locator('[data-roll-input="'+field+'"]').fill(String(value));await panel(page).getByRole('button',{name:'Calculer',exact:true}).click();}
async function protectionChoice(page,label,value){const details=panel(page).locator('details').filter({has:page.getByText('Protection et bouclier pour cette attaque',{exact:true})});if(await details.getAttribute('open')===null)await details.locator('summary').click();await panel(page).getByLabel(label,{exact:true}).selectOption(value);}
async function capture(page,name){await noOverflow(page);await page.screenshot({path:join(root,'tmp/lot2-keyword-control-ui/'+name),fullPage:true});}
async function undo(page){await page.getByRole('button',{name:'Annuler la dernière commande',exact:true}).click();}
async function apply(page){await expect(applyButton(page)).toBeEnabled();await applyButton(page).click();await expect.poll(()=>page.evaluate(()=>window.lot2UI.applyResults.at(-1)?.status)).toBe('applied');}
try{
 // Real Munition and Visée gestures combine a normalized talent, ranged weapon, projectile and critical-only armour.
 const ranged=await setup({width:390,actorMomentum:false,actorTalents:[owned('talent-accurate-shot')]});const p=ranged.page;await p.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
 const bow=gear('keyword-bow',{name:'Arc témoin',category:'Arc',range:'50',damage:'3'}),arrow=gear('keyword-arrow',{kind:'ammunition',name:'Flèche empaleuse',category:'Arc',range:'',damage:'+0',reach:'',keywords:words('empaleuse')}),foam=gear('keyword-foam',{kind:'ammunition',name:'Flèche inoffensive',category:'Arc',range:'',damage:'+0',reach:'',keywords:words('empaleuse','inoffensive')});
 await configure(p,{actor:{equipment:[bow,arrow,foam],actions:[linkedAction('ranged-control',bow,{attr:'CT'})]},target:{hp:100,maxHp:100,caracs:{CC:30,E:30,Ag:42},equipment:layeredArmor(),armorLocations:{head:1,body:6,leftArm:3,rightArm:5,leftLeg:1,rightLeg:1}},actionId:'ranged-control'});
 await expect(p.getByLabel('Munition',{exact:true})).toBeVisible();await p.getByLabel('Munition',{exact:true}).selectOption(arrow.id);await enterRolls(p,30);let shot=await preview(p);assert.equal(shot.test.kind,'ranged');assert.equal(shot.test.score,60);assert.equal(shot.protection.ap,1);assert.equal(shot.damage.finalDamage,3);assert.ok(shot.critical?.details?.pending);await expect(applyButton(p)).toBeDisabled();
 await p.getByLabel('Visée effectuée : Tir précis donne +2 Dégâts',{exact:true}).check();await enterRolls(p,30);shot=await preview(p);assert.equal(shot.damage.finalDamage,4);assert.ok((shot.talentPlans||[]).flatMap(row=>row.proposals||[]).some(row=>row.origins?.some(origin=>origin.talentId==='talent-accurate-shot')));assert.ok(shot.input.ammunitionSources.some(row=>row.kind==='ammunition'&&row.keywordId==='empaleuse'));assert.equal(await participantHP(p,'target'),100);
 await criticalInput(p,'critical-location',55);shot=await preview(p);assert.equal(shot.critical.details.protection.ap,3);assert.ok(shot.critical.details.protection.ignored.some(row=>row.item.id==='plates'&&/Points faibles/.test(row.reason)));assert.equal(shot.protection.ap,1);await criticalInput(p,'critical-effect',20);await expect(applyButton(p)).toBeEnabled();assert.ok((await preview(p)).mechanics.find(row=>row.id==='empaleuse').limitations.some(row=>/manuellement/.test(row)));
 // Changing the actual ammunition carries Inoffensive into damage and its two-gravity requirement.
 await p.getByLabel('Munition',{exact:true}).selectOption(foam.id);await enterRolls(p,30);await criticalInput(p,'critical-location',55);await criticalInput(p,'critical-effect',60);await expect(panel(p).locator('[data-roll-input="critical-effect-alternative"]')).toBeVisible();await expect(applyButton(p)).toBeDisabled();assert.equal((await preview(p)).damage.finalDamage,3);assert.equal(await participantHP(p,'target'),100);
 await criticalInput(p,'critical-effect-alternative',20);const complete=await preview(p);assert.deepEqual(complete.critical.details.effectRollCandidates,[60,20]);assert.equal(complete.critical.details.effectRollBase,20);assert.equal(complete.critical.details.effectRoll,20);await expect(applyButton(p)).toBeEnabled();await capture(p,'munition-talents-inoffensive-mobile-dark.png');await apply(p);
 const frozen=await p.evaluate(()=>window.lot2UI.store.getLog()[0].detail);assert.equal(frozen.ammunitionId,foam.id);assert.deepEqual(frozen.critical.details.effectRollCandidates,[60,20]);assert.ok(frozen.ammunitionSources.some(row=>row.keywordId==='inoffensive'));assert.equal(await participantHP(p,'target'),100-3-complete.critical.application.extraWounds);await undo(p);await expect.poll(()=>participantHP(p,'target')).toBe(100);await ranged.context.close();

 // Independent location values: flexible+rigid stack, copies of a layer do not, Partial alternates by hit-location parity.
 const armour=await setup({width:390,actorMomentum:false});const a=armour.page;await a.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));const sword=gear('keyword-sword',{name:'Épée témoin'});
 await configure(a,{actor:{equipment:[sword],actions:[linkedAction('armour-control',sword)]},target:{hp:100,maxHp:100,caracs:{CC:30,E:0,Ag:42},equipment:layeredArmor(),armorLocations:{head:1,body:6,leftArm:3,rightArm:5,leftLeg:1,rightLeg:1}},actionId:'armour-control'});await defenseCC(a);
 for(const [roll,location,ap] of [[15,'Corps',6],[25,'Corps',3],[12,'Bras gauche',3],[13,'Bras droit',5]]){await enterRolls(a,roll,81);const value=await preview(a);assert.equal(value.location.name.toLocaleLowerCase('fr'),location.toLocaleLowerCase('fr'));assert.equal(value.protection.ap,ap);assert.deepEqual(value.protection.manual,[]);if(roll===15){assert.equal(value.damage.finalDamage,8);assert.ok(value.protection.ignored.some(row=>row.item.id==='mail-copy'));await apply(a);await expect.poll(()=>participantHP(a,'target')).toBe(92);await undo(a);await expect.poll(()=>participantHP(a,'target')).toBe(100);}}
 await capture(a,'localisations-flexible-partielle-mobile-parchment.png');
 // Impenetrable ignores the ordinary double's critical only for odd attack rolls, independently of the new critical location.
 await enterRolls(a,33,81);await criticalInput(a,'critical-location',55);let guarded=await preview(a);assert.equal(guarded.critical,null);assert.equal(guarded.protection.ap,5);await expect(panel(a).locator('[data-roll-input="critical-effect"]')).toHaveCount(0);await expect(applyButton(a)).toBeEnabled();await apply(a);assert.equal(await a.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').states.length),0);await undo(a);await expect.poll(()=>participantHP(a,'target')).toBe(100);
 await enterRolls(a,44,81);await criticalInput(a,'critical-location',55);guarded=await preview(a);assert.ok(guarded.critical);assert.equal(guarded.critical.details.protection.ap,6);await expect(applyButton(a)).toBeDisabled();await criticalInput(a,'critical-effect',20);await expect(applyButton(a)).toBeEnabled();await capture(a,'impenetrable-even-critical-mobile-parchment.png');await armour.context.close();

 // Real defensive action and shield choices preserve thresholds and the Defensive/Unbalanced precedence.
 const defenses=await setup({actorMomentum:false});const d=defenses.page;await d.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));const balanced=gear('keyword-parry',{name:'Parade défensive',keywords:words('defensive')}),unbalanced=gear('keyword-unbalanced',{name:'Parade déséquilibrée',keywords:words('defensive','desequilibree')}),shield=gear('keyword-shield',{kind:'shield',name:'Bouclier témoin',category:'Bouclier',damage:'',ap:2,keywords:[{id:'protectrice',parameter:'2'}]});
 await configure(d,{actor:{equipment:[sword],actions:[linkedAction('defense-control',sword)]},target:{equipment:[balanced,unbalanced,shield],armorLocations:{head:0,body:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0},caracs:{CC:40,E:30,Ag:42},actions:[linkedAction('balanced-parry',balanced,{type:'defense',base:40}),linkedAction('unbalanced-parry',unbalanced,{type:'defense',base:40})]},actionId:'defense-control'});
 await panel(d).locator('[data-focus-key="defense-stat"]').selectOption('jet:balanced-parry');await enterRolls(d,23,47);let defense=await preview(d);assert.equal(defense.defenderTest.score,40);assert.equal(defense.defenderTest.sl,1);assert.equal(defense.defenderTest.success,true);assert.equal(defense.test.score,60);
 await panel(d).locator('[data-focus-key="defense-stat"]').selectOption('jet:unbalanced-parry');await enterRolls(d,23,47);defense=await preview(d);assert.equal(defense.defenderTest.sl,-1);assert.equal(defense.defenderTest.success,false);
 await panel(d).locator('[data-focus-key="defense-stat"]').selectOption('jet:balanced-parry');await protectionChoice(d,'Bouclier utilisé',shield.id);await protectionChoice(d,'Bouclier disponible ce tour','true');await protectionChoice(d,'Défense opposée avec ce bouclier','true');await enterRolls(d,23,47);defense=await preview(d);assert.equal(defense.defenderTest.sl,1);assert.equal(defense.protection.shieldAp,2);assert.deepEqual(defense.unresolved,[]);
 await panel(d).locator('[data-focus-key="defense-stat"]').selectOption('jet:unbalanced-parry');assert.deepEqual(await d.evaluate(()=>window.lot2UI.view.getViewState().resolution.protectionContext),{});await protectionChoice(d,'Bouclier utilisé',shield.id);await protectionChoice(d,'Bouclier disponible ce tour','true');await protectionChoice(d,'Défense opposée avec ce bouclier','true');await enterRolls(d,23,47);defense=await preview(d);assert.equal(defense.defenderTest.sl,0);assert.equal(defense.protection.shieldAp,2);await capture(d,'defensive-unbalanced-shield-desktop-dark.png');await defenses.context.close();

 // V4 Précise stays blocked for V5 instead of silently adding a threshold bonus.
 const legacy=await setup({width:390,actorMomentum:false});const l=legacy.page;await l.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));const precise=gear('keyword-legacy',{name:'Arme Précise héritée V4',keywords:words('precise')});await configure(l,{actor:{equipment:[precise],actions:[linkedAction('legacy-control',precise)]},target:{hp:100,maxHp:100,caracs:{CC:30,E:0,Ag:42},armorLocations:{head:0,body:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0}},actionId:'legacy-control'});await defenseCC(l);await enterRolls(l,15,81);const old=await preview(l);assert.equal(old.test.score,60);assert.ok(old.mechanicalWarnings.some(row=>row.keywordId==='precise'));await expect(applyButton(l)).toBeDisabled();await expect(panel(l)).toContainText('Effets non validés V5 : precise');assert.equal(await participantHP(l,'target'),100);await capture(l,'precise-v4-manual-mobile-parchment.png');await legacy.context.close();
 // MJ ruling: Devastating uses the literal units digit 0, while Harmless cancels its damage replacement.
 const devastation=await setup({width:390,actorMomentum:false});const z=devastation.page;await z.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));const devastating=gear('keyword-devastating',{name:'Arc Dévastateur témoin',category:'Arc',range:'50',damage:'4',keywords:words('devastatrice')}),harmless=gear('keyword-harmless',{kind:'ammunition',name:'Munition Inoffensive témoin',category:'Arc',damage:'+0',reach:'',keywords:words('inoffensive')});await configure(z,{actor:{equipment:[devastating,harmless],actions:[linkedAction('devastating-control',devastating,{attr:'CT'})]},target:{hp:100,maxHp:100,caracs:{CC:30,E:0,Ag:42},armorLocations:{head:0,body:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0}},actionId:'devastating-control'});
 await enterRolls(z,20);let devastatingResult=await preview(z);assert.equal(devastatingResult.roll,20);assert.equal(devastatingResult.sl,4);assert.equal(devastatingResult.damage.sl,4);assert.equal(devastatingResult.damage.finalDamage,8);await capture(z,'devastating-zero-mobile-dark.png');await apply(z);await expect.poll(()=>participantHP(z,'target')).toBe(92);await undo(z);await expect.poll(()=>participantHP(z,'target')).toBe(100);
 await enterRolls(z,28);devastatingResult=await preview(z);assert.equal(devastatingResult.sl,4);assert.equal(devastatingResult.damage.sl,8);assert.equal(devastatingResult.damage.finalDamage,12);await z.getByLabel('Munition',{exact:true}).selectOption(harmless.id);await enterRolls(z,28);devastatingResult=await preview(z);assert.equal(devastatingResult.damage.sl,4);assert.equal(devastatingResult.damage.finalDamage,8);assert.equal(devastatingResult.damage.isInoffensive,true);await capture(z,'devastating-harmless-mobile-dark.png');
 await z.getByLabel('Munition',{exact:true}).selectOption('');await z.getByLabel('Sources de Désavantage',{exact:true}).fill('1');await z.keyboard.press('Tab');await enterRolls(z,2);devastatingResult=await preview(z);assert.equal(devastatingResult.roll,20);assert.equal(devastatingResult.test.reversed,true);assert.equal(devastatingResult.success,true);assert.equal(devastatingResult.sl,4);assert.equal(devastatingResult.damage.sl,4);assert.equal(devastatingResult.damage.finalDamage,8);await capture(z,'devastating-forced-inversion-mobile-dark.png');await devastation.context.close();
 // A removed critical still depends on its armour source: refresh that source, then click the real old confirmation.
 const race=await setup({width:390,actorMomentum:false});const s=race.page;await s.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));await configure(s,{actor:{equipment:[sword],actions:[linkedAction('source-control',sword)]},target:{hp:100,maxHp:100,caracs:{CC:30,E:0,Ag:42},equipment:layeredArmor(),armorLocations:{head:1,body:6,leftArm:3,rightArm:5,leftLeg:1,rightLeg:1}},actionId:'source-control'});await defenseCC(s);await enterRolls(s,33,81);await criticalInput(s,'critical-location',55);await s.waitForTimeout(250);assert.equal((await preview(s)).critical,null);await expect(applyButton(s)).toBeEnabled();const sourcePreviewId=(await preview(s)).resolutionId;const beforeSource=await s.evaluate(()=>{const data=JSON.parse(window.lot2UI.store.getFullJSON());delete data.exportedAt;return {data,revision:window.lot2UI.store.getLocalRevision(),history:window.lot2UI.store.getHistory()};});
 await s.evaluate(async()=>{const {refreshReferences,resolveKeyword}=await import('/js/core/reference-catalog.js');const effect=resolveKeyword('impenetrable').effect;const result=await refreshReferences({forceRefresh:true,storage:null,fetchImpl:async url=>{const sheet=new URL(url).searchParams.get('sheet');const response=await fetch('/js/data/reference-source-csv/'+encodeURIComponent(sheet)+'.csv');if(!response.ok)throw new Error('CSV local absent '+sheet);let csv=await response.text();if(sheet==='Mots Clés Armes et Armures'){if(!csv.includes(effect))throw new Error('Effet Impénétrable introuvable dans CSV');csv=csv.replace(effect,'Description synthétique nouvelle, volontairement non couverte.');}return {ok:true,text:async()=>csv};}});if(!result.ok)throw new Error('Actualisation locale échouée '+result.status?.error);});
 assert.equal(await s.evaluate(()=>window.lot2UI.store.getLocalRevision()),beforeSource.revision);await applyButton(s).click();await expect.poll(()=>s.evaluate(()=>window.lot2UI.applyResults.at(-1)?.status)).toBe('manual');await expect(panel(s).getByRole('alert')).toHaveText('La source d’un talent ou d’un mot-clé a changé depuis le calcul : recalculez l’action.');assert.equal((await preview(s)).resolutionId,sourcePreviewId);await expect(panel(s).locator('[data-roll-input="attack"]')).toHaveValue('33');await expect(panel(s).locator('[data-roll-input="defense"]')).toHaveValue('81');const afterSource=await s.evaluate(()=>{const data=JSON.parse(window.lot2UI.store.getFullJSON());delete data.exportedAt;return {data,revision:window.lot2UI.store.getLocalRevision(),history:window.lot2UI.store.getHistory()};});assert.deepEqual(afterSource,beforeSource);await capture(s,'impenetrable-source-refresh-mobile-dark.png');await race.context.close();
 assert.deepEqual(errors,[]);console.log('Contrôle UI mots-clés : munition/visée/Tir précis/Empaleuse/Points faibles/Inoffensive, couches et localisations/Flexible/Partielle/Impénétrable, Défensive/Déséquilibrée/bouclier, Précise V4 manuel, Dévastatrice unités0/Inoffensive/inversion et source Impénétrable modifiée avant confirmation réussis. Projectiles fichés et soins demeurent manuels.');
}finally{await browser.close();await new Promise(resolveClose=>server.close(resolveClose));}
