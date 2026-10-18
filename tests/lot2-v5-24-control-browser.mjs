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
mkdirSync(join(root, 'tmp/lot2-24-control-ui'), { recursive: true });
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
      applyResolution: async preview => { calls.push({ kind: 'apply', preview: structuredClone(preview) }); const result = await store.applyResolution(preview); applyResults.push(result); return result; }
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
try{
 const publicSpeaker=await setup({actorMomentum:false,actorTalents:[owned('talent-public-speaker')]});const p=publicSpeaker.page;
 await p.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));await customAction(p);
 await expect(panel(p).getByLabel('Compétence de ce Test pour les talents',{exact:true})).toBeDisabled();
 await enterRolls(p,61);await expect(applyButton(p)).toBeDisabled();await expect(panel(p)).toContainText('Orateur : Le Test sert à influencer un groupe — à préciser.');
 await panel(p).getByLabel('Le Test sert à influencer un groupe',{exact:true}).selectOption('true');await enterRolls(p,61);
 await expect(panel(p).locator('input[name="v5-choice-actor"]')).toHaveCount(2);await panel(p).locator('input[name="v5-choice-actor"][value="reverse"]').check();
 const chosen=await preview(p);assert.equal(chosen.roll,16);assert.equal(chosen.sl,4);await expect(applyButton(p)).toBeEnabled();const rev=await p.evaluate(()=>window.lot2UI.store.getLocalRevision());
 await applyButton(p).click();await expect.poll(()=>p.evaluate(()=>window.lot2UI.applyResults.at(-1)?.status)).toBe('applied');assert.equal(await p.evaluate(()=>window.lot2UI.store.getLocalRevision()),rev+1);
 await p.getByRole('button',{name:'Annuler la dernière commande'}).click();await expect.poll(()=>p.evaluate(()=>window.lot2UI.store.getLocalRevision())).toBe(rev+2);
 await p.screenshot({path:join(root,'tmp/lot2-24-control-ui/orateur-desktop-dark.png'),fullPage:true});await publicSpeaker.context.close();

 const master=await setup({width:390,actorMomentum:false,actorTalents:[owned('talent-master-of-disguise')]});const m=master.page;
 await m.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));await customAction(m,{name:'Divertissement (Interprétation)'});await enterRolls(m,28);await expect(applyButton(m)).toBeDisabled();
 const sl=m.getByLabel('Maître en déguisement : DR ou unités (acteur, jet conservé)',{exact:true});await expect(sl).toBeVisible();await sl.selectOption('true');await expect.poll(async()=>(await preview(m)).sl).toBe(8);await expect(applyButton(m)).toBeEnabled();
 await sl.selectOption('false');await expect.poll(async()=>(await preview(m)).sl).toBe(3);await enterRolls(m,20);await sl.selectOption('true');await expect.poll(async()=>(await preview(m)).sl).toBe(0);assert.equal((await preview(m)).success,true);assert.equal((await preview(m)).test.zeroOutcome,'marginalSuccess');
 await sl.selectOption('false');await expect.poll(async()=>(await preview(m)).sl).toBe(3);await sl.selectOption('true');await expect.poll(async()=>(await preview(m)).sl).toBe(0);await expect(applyButton(m)).toBeEnabled();await noOverflow(m);await m.screenshot({path:join(root,'tmp/lot2-24-control-ui/unites-mobile-parchment.png'),fullPage:true});
 const zeroResolution=(await preview(m)).resolutionId;const zeroRevision=await m.evaluate(()=>window.lot2UI.store.getLocalRevision());await applyButton(m).click();await expect.poll(()=>m.evaluate(()=>window.lot2UI.applyResults.at(-1)?.status)).toBe('applied');const zeroDetail=await m.evaluate(()=>window.lot2UI.store.getLog()[0].detail);assert.equal(zeroDetail.sl,0);assert.equal(zeroDetail.test.success,true);assert.equal(zeroDetail.test.zeroOutcome,'marginalSuccess');
 await m.getByRole('button',{name:'Annuler la dernière commande'}).click();await expect.poll(()=>m.evaluate(()=>window.lot2UI.store.getLocalRevision())).toBe(zeroRevision+2);assert.equal(await m.evaluate(id=>Boolean(JSON.parse(window.lot2UI.store.getFullJSON()).appliedResolutionIds?.includes(id)),zeroResolution),false);await master.context.close();

 const strike=await setup({width:390,actorMomentum:false,actorTalents:[owned('talent-strike-to-stun')]});const s=strike.page;
 await s.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));await s.evaluate(async()=>{await window.lot2UI.store.updateParticipant('target',{hp:40,maxHp:40,caracs:{CC:60,E:30,Ag:40},armor:{head:0,body:0,arms:0,legs:0}});});
 await customAction(s,{name:'Corps à corps (Bagarre)',type:'attack',base:60,damage:3});await defenseCC(s);
 await s.getByLabel('Arme improvisée (Frappe assommante)',{exact:true}).selectOption('true');await s.getByLabel('Test de neutralisation silencieuse (page 135)',{exact:true}).selectOption('false');await s.getByLabel('Coup ciblé (−2 DR, hors modificateur saisi)',{exact:true}).selectOption('false');
 await enterRolls(s,10,40);const stunPreview=await preview(s);assert.equal(stunPreview.damage.finalDamage,3);assert.equal(stunPreview.weaponConditions.applied[0].level,1);await expect(applyButton(s)).toBeEnabled();
 await applyButton(s).click();await expect.poll(()=>s.evaluate(()=>window.lot2UI.applyResults.at(-1)?.status)).toBe('applied');assert.equal(await s.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').states.find(row=>row.key==='sonne').level),1);
 await s.getByRole('button',{name:'Annuler la dernière commande'}).click();await expect.poll(()=>s.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').hp)).toBe(40);assert.equal(await s.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').states.length),0);
 await noOverflow(s);await s.screenshot({path:join(root,'tmp/lot2-24-control-ui/frappe-mobile-dark.png'),fullPage:true});await strike.context.close();

 const silent=await setup({width:390,actorMomentum:false,actorTalents:[owned('talent-strike-to-stun')]});const q=silent.page;
 await customAction(q,{name:'Corps à corps (Bagarre)',type:'opposition',base:60});await panel(q).getByRole('button',{name:'Défenseur de recette',exact:true}).click();
 await q.getByLabel('Nature du Test',{exact:true}).selectOption('melee');await q.getByLabel('Test de neutralisation silencieuse (page 135)',{exact:true}).selectOption('true');
 await q.getByLabel('Procédure hors combat',{exact:true}).selectOption('true');await q.getByLabel('Cible ignorant le danger',{exact:true}).selectOption('true');
 await panel(q).locator('[data-focus-key="defense-stat"]').selectOption('E');await expect(q.getByLabel('Nature de la défense',{exact:true})).toHaveValue('test');await enterRolls(q,61,22);
 await expect(panel(q).locator('input[name="v5-choice-actor"]')).toHaveCount(2);await panel(q).locator('input[name="v5-choice-actor"][value="reverse"]').check();const qp=await preview(q);assert.equal(qp.roll,16);assert.equal(qp.damage,null);assert.equal(qp.critical,null);assert.equal(qp.defenderCritical,null);assert.deepEqual(qp.unresolved,[]);await expect(panel(q).locator('[data-roll-input*="critical"]')).toHaveCount(0);assert.ok(qp.reminders.some(row=>/Inconscient/.test(row)));
 await expect(applyButton(q)).toBeEnabled();await applyButton(q).click();await expect.poll(()=>q.evaluate(()=>window.lot2UI.applyResults.at(-1)?.status)).toBe('applied');assert.equal(await participantHP(q,'target'),12);assert.equal(await q.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').states.length),0);assert.equal(await q.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='actor').extensions.v5.hasMomentum),false);assert.equal(await participantHP(q,'actor'),12);assert.equal(await q.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='actor').states.length),0);assert.equal(await q.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').extensions.v5.hasMomentum),false);
 await noOverflow(q);await q.screenshot({path:join(root,'tmp/lot2-24-control-ui/silent-mobile-parchment.png'),fullPage:true});await silent.context.close();
 const rules=await setup({width:390,actorMomentum:false});const r=rules.page;
 await r.evaluate(async()=>{const{renderReferenceTables}=await import('/js/ui/rules-view.js');document.querySelector('main').innerHTML='<div id="catalogue-control"></div>';const subject={kind:'PJ',ficheSnapshot:{charId:'synthetic-import',source:{fingerprint:'synthetic-print'},coverage:{talents:'present'},talents:[{id:'talent-public-speaker',status:'resolved',rank:1}]}};renderReferenceTables('Orateur',document.querySelector('#catalogue-control'),{getEnvelope:()=>({reserve:[subject]})});});
 await expect(r.locator('#catalogue-control')).toContainText('1 fiche(s) réellement importée(s)');await expect(r.locator('#catalogue-control')).toContainText('Automatique');await expect(r.locator('#catalogue-control')).toContainText('Rappel MJ');
 await r.getByRole('button',{name:'Priorités des PJ importés',exact:true}).click();await expect(r.locator('#catalogue-control')).toContainText('Talents (1)');await expect(r.locator('#catalogue-control')).toContainText('PJ importés : 1');
 await r.evaluate(async()=>{const{renderReferenceTables}=await import('/js/ui/rules-view.js');renderReferenceTables('Orateur',document.querySelector('#catalogue-control'),{getEnvelope:()=>({})});});await expect(r.locator('#catalogue-control')).toContainText('0 fiche(s) réellement importée(s)');await r.getByRole('button',{name:'Priorités des PJ importés',exact:true}).click();await expect(r.getByRole('button',{name:'Afficher tout le catalogue',exact:true})).toBeVisible();await r.getByRole('button',{name:'Afficher tout le catalogue',exact:true}).click();await expect(r.locator('#catalogue-control')).toContainText('Talents (2)');await noOverflow(r);await r.screenshot({path:join(root,'tmp/lot2-24-control-ui/catalogue-mobile-parchment.png'),fullPage:true});
 await r.evaluate(async()=>{const{renderReferenceTables}=await import('/js/ui/rules-view.js');renderReferenceTables('Petit',document.querySelector('#catalogue-control'),{getEnvelope:()=>({})});});const smallRow=r.locator('tr').filter({has:r.getByText('Petit',{exact:true})});await expect(smallRow).toContainText('coût 1 Momentum');await expect(smallRow).toContainText('Assisté par un choix :');await expect(smallRow).not.toContainText('Mécanique à raccorder');await expect(smallRow).toContainText('Règle homebrew de Taille');await expect(smallRow).not.toContainText('Automatique :');await noOverflow(r);await rules.context.close();

 assert.deepEqual(errors,[]);console.log('Contrôle UI 2.4 : Orateur contexte/inversion, choix DR/unités, Frappe/Sonné/annulation, opposition silencieuse, catalogue mixte, priorités importées/vides et Petit maison raccordé réussis.');
}finally{await browser.close();await new Promise(resolveClose=>server.close(resolveClose));}
