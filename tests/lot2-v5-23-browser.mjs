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
mkdirSync(join(root, 'tmp/lot2-ui'), { recursive: true });
const errors = [];
async function setup({ width = 1440, both = false, states = [], extraTarget = false, actorMomentum = true, talentNames = [], ranged = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 980 }, serviceWorkers: 'block' });
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/blank`); await page.setContent('<main><div id="mount"></div><button id="test-undo">Annuler la dernière commande</button><div id="editor"></div><div id="dice-prep-results"></div><button id="test-quick-roll">Jet rapide V5</button><button id="test-next-turn">Terminer le tour de recette</button></main>');
  await page.addStyleTag({ path: join(root, 'MJ.css') }); await page.addStyleTag({ path: join(root, 'js/ui/workspace.css') });
  await page.evaluate(async ({ origin, both, states, extraTarget, actorMomentum, talentNames, ranged }) => {
    const [{ initWorkspaceView }, { createStore }, { renderReferenceTables }, { withMomentum }, { createCombatEngine }, { aggregateTalents }, { openV5EffectInputDialog, chooseV5RecoveryMethod, recoveryOptionsFor }, { openV5FortuneDialog }] = await Promise.all([
      import(`${origin}/js/ui/workspace-view.js`), import(`${origin}/js/core/store.js`), import(`${origin}/js/ui/rules-view.js`), import(`${origin}/js/core/v5-combat-rules.js`), import(`${origin}/js/core/combat.js`), import(`${origin}/js/core/reference-catalog.js`), import(`${origin}/js/ui/v5-effect-dialog.js`), import(`${origin}/js/ui/v5-fortune-dialog.js`)
    ]);
    let saved = null;
    const listeners = new Map();
    const bus = { on(event, fn) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); }, emit(event, ...args) { for (const fn of listeners.get(event) || []) fn(...args); } };
    const store = createStore({ bus, persistence: { async load() { return structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } } });
    await store.ready;
    const attack = { id: 'blade', note: 'Épée de recette', base: 65, type: 'attack', attr: ranged ? 'CT' : 'CC', damage: 4, qualities: [] };
    const skill = { id: 'search', note: 'Perception de recette', base: 45, type: 'skill', attr: 'I', damage: 0, qualities: [] };
    const legacy = { id: 'legacy', note: 'Action ancienne', base: 50, type: 'skill', mod: 10, damage: 0 };
    const actor = { id: 'actor', name: 'Acteur de recette', kind: 'PJ', hp: 12, maxHp: 12, zone: 'active', camp: 'pj', states,
      talents: aggregateTalents(talentNames.map(nom => ({nom}))).items, caracs: { CC: 65, CT: 45, F: 30, E: 30, Ag: 35 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, actions: [attack, skill, legacy], extensions: { v5: { hasMomentum: actorMomentum } } };
    const target = { id: 'target', name: 'Défenseur de recette', kind: 'Créature', hp: 12, maxHp: 12, zone: 'active', camp: 'ennemi', states: [],
      caracs: { CC: 35, E: 30, Ag: 42 }, armor: { head: 0, body: 7, arms: 0, legs: 0 }, actions: [{ id: 'dodge', type: 'defense', note: 'Esquive', base: 42, damage: 0 }], extensions: { v5: { hasMomentum: both } } };
    const other = { ...structuredClone(target), id: 'other', name: 'Autre cible', caracs: { CC: 25, E: 30, Ag: 31 }, actions: [{ id: 'dodge', type: 'defense', note: 'Esquive', base: 31, damage: 0, mod: 10, extensions: { v5: { slModifier: -1 } } }] };
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], extensions: {v5:{combatId:'browser-23-synthetic',turnIndex:1}}, combat: { round: 1, currentActorId: 'actor', order: ['actor', 'target', ...(extraTarget ? ['other'] : [])], participants: [actor, target, ...(extraTarget ? [other] : [])] }, diceLines: [], log: [] });
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
  }, { origin, both, states, extraTarget, actorMomentum, talentNames, ranged });
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


try {
  const extra = await setup({talentNames:['Coup puissant']});const p=extra.page;
  await defenseCC(p);
  await panel(p).getByRole('checkbox',{name:'Attaque supplémentaire : payer 1 Élan (une fois par Tour)',exact:true}).check();
  await enterRolls(p,61,73);
  await expect(panel(p).locator('input[name="v5-choice-actor"]')).toHaveCount(0);
  await expect(panel(p)).toContainText('Coût proposé avant le jet : 1 Élan');
  await expect(applyButton(p)).toBeEnabled();
  const before=await p.evaluate(()=>window.lot2UI.store.getLocalRevision());
  assert.equal(await participantHP(p,'target'),12,'preview never applies resources/wounds');
  await applyButton(p).click();await expect.poll(()=>participantHP(p,'target')).toBe(6);
  const receipt=await p.evaluate(()=>window.lot2UI.applyResults.at(-1));
  assert.equal(receipt.status,'applied');assert.equal(receipt.resolution.damage.talentDamage,1);assert.equal(receipt.resolution.test.advantage.net,0);
  assert.equal(await p.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='actor').extensions.v5.hasMomentum),true);
  await panel(p).getByRole('checkbox',{name:'Attaque supplémentaire : payer 1 Élan (une fois par Tour)',exact:true}).check();
  await enterRolls(p,61,73);await expect(panel(p)).toContainText('Quota épuisé');await expect(applyButton(p)).toBeDisabled();
  assert.equal(await p.evaluate(()=>window.lot2UI.store.getLocalRevision()),before+1);
  await p.getByRole('button',{name:'Annuler la dernière commande'}).click();await expect.poll(()=>participantHP(p,'target')).toBe(12);
  assert.equal(await p.evaluate(()=>JSON.parse(window.lot2UI.store.getFullJSON()).extensions.v5.actionLedger?.quotaUsage.length||0),0);
  await extra.context.close();

  const aim=await setup({talentNames:['Tir précis','Tir précis'],ranged:true,actorMomentum:false});const q=aim.page;
  await enterRolls(q,23);await expect(panel(q)).toContainText('6 Blessures proposées');
  await panel(q).getByRole('checkbox',{name:'Visée effectuée : Tir précis donne +2 Dégâts',exact:true}).check();
  await panel(q).getByRole('button',{name:'Calculer',exact:true}).click();await expect(panel(q)).toContainText('7 Blessures proposées');
  await expect(applyButton(q)).toBeEnabled();await applyButton(q).click();await expect.poll(()=>participantHP(q,'target')).toBe(5);
  assert.equal(await q.evaluate(()=>window.lot2UI.applyResults.at(-1).resolution.damage.talentDamage),2);
  await q.getByRole('button',{name:'Annuler la dernière commande'}).click();await expect.poll(()=>participantHP(q,'target')).toBe(12);
  await aim.context.close();

  const battement=await setup({talentNames:['Battement'],actorMomentum:false,width:390});const b=battement.page;
  await defenseCC(b);
  await panel(b).getByRole('checkbox',{name:'Battement : remplacer toutes les Blessures et conséquences du critique',exact:true}).check();
  await panel(b).getByLabel('Taille de l’auteur',{exact:true}).selectOption('3');
  await enterRolls(b,22,73);await expect(applyButton(b)).toBeDisabled();
  await panel(b).getByLabel('Taille de la cible',{exact:true}).selectOption('3');
  await panel(b).getByRole('button',{name:'Calculer',exact:true}).click();
  await expect(panel(b)).toContainText('Battement : 0 Blessure');await expect(applyButton(b)).toBeEnabled();
  await expect(panel(b).locator('[data-critical-input]')).toHaveCount(0);
  assert.ok(await b.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Battement controls fit phone');
  await b.screenshot({path:join(root,'tmp/lot2-ui/battement-mobile-parchment.png'),fullPage:true});
  await b.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
  await b.screenshot({path:join(root,'tmp/lot2-ui/battement-mobile-dark.png'),fullPage:true});
  await applyButton(b).click();await expect.poll(()=>b.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').states.some(row=>row.kind==='talent-active'))).toBe(true);
  assert.equal(await participantHP(b,'target'),12);
  const effect=await b.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').states.find(row=>row.kind==='talent-active'));
  assert.equal(effect.v5Timing.authorId,'actor');assert.equal(effect.v5Timing.targetId,'target');assert.equal(effect.v5Timing.expiry.actorId,'actor');assert.equal(effect.v5Timing.expiry.turn,3);
  await enterRolls(b,61,73);await panel(b).locator('input[name="v5-choice-actor"][value="keep"]').check();
  await expect(panel(b)).toContainText('Battement : la cible ne peut pas opposer Corps à corps');await expect(applyButton(b)).toBeDisabled();
  await panel(b).getByLabel('Nature de la défense',{exact:true}).selectOption('test');
  await panel(b).getByRole('button',{name:'Calculer',exact:true}).click();await panel(b).locator('input[name="v5-choice-actor"][value="keep"]').check();await expect(applyButton(b)).toBeEnabled();
  await b.getByRole('button',{name:'Terminer le tour de recette'}).click();
  assert.equal(await b.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').states.some(row=>row.kind==='talent-active')),true,'current author turn does not expire');
  await b.getByRole('button',{name:'Terminer le tour de recette'}).click();
  assert.equal(await b.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').states.some(row=>row.kind==='talent-active')),true,'target turn does not expire');
  await b.getByRole('button',{name:'Terminer le tour de recette'}).click();
  await expect.poll(()=>b.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').states.some(row=>row.kind==='talent-active'))).toBe(false);
  await b.getByRole('button',{name:'Annuler la dernière commande'}).click();
  await expect.poll(()=>b.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').states.some(row=>row.kind==='talent-active'))).toBe(true);
  await battement.context.close();

  const reaction=await setup({talentNames:['Assaut féroce'],actorMomentum:false,width:390});const r=reaction.page;
  await r.evaluate(()=>window.lot2UI.store.updateParticipant('target',{hp:50,maxHp:50}));
  await defenseCC(r);await enterRolls(r,23,73);await expect(applyButton(r)).toBeEnabled();await applyButton(r).click();
  const use=r.getByRole('button',{name:'Utiliser Assaut féroce de Acteur de recette',exact:true});await expect(use).toBeVisible();
  const unchanged=await r.evaluate(()=>({revision:window.lot2UI.store.getLocalRevision(),random:window.randomDraws}));
  await use.click();
  await expect(panel(r)).toContainText('Assaut féroce : nouvelle attaque avec la même arme contre le même adversaire.');
  await expect(panel(r).locator('[data-roll-input="attack"]')).toHaveValue('');
  assert.deepEqual(await r.evaluate(()=>({revision:window.lot2UI.store.getLocalRevision(),random:window.randomDraws})),unchanged,'opening reaction spends nothing and draws no die');
  await defenseCC(r);await enterRolls(r,61,73);await expect(panel(r).locator('input[name="v5-choice-actor"]')).toHaveCount(0);
  await expect(panel(r)).toContainText('Coût proposé avant le jet : 1 Élan');await expect(applyButton(r)).toBeEnabled();
  await r.screenshot({path:join(root,'tmp/lot2-ui/assaut-feroce-mobile.png'),fullPage:true});
  await applyButton(r).click();await expect.poll(()=>participantHP(r,'target')).toBe(36);
  const response=await r.evaluate(()=>window.lot2UI.applyResults.at(-1));
  assert.equal(response.actionCostReceipt.paid[0].resource,'momentum');assert.equal(response.resolution.test.advantage.net,0);
  const ledger=await r.evaluate(()=>JSON.parse(window.lot2UI.store.getFullJSON()).extensions.v5.actionLedger);
  assert.ok(ledger.quotaUsage.some(row=>row.quotaId==='talent-furious-assault:round'&&row.used===1));
  await expect(use).toHaveCount(0);
  await r.getByRole('button',{name:'Annuler la dernière commande'}).click();await expect.poll(()=>participantHP(r,'target')).toBe(41);
  await expect(use).toBeVisible();await reaction.context.close();

  assert.deepEqual(errors,[],'No runtime error in 2.3 interactions');
  console.log('Lot2.3 UI: paid Momentum before comparison, quotas/undo, normalized talents/aim, Battement full critical replacement, author expiry, Melee/Dodge, desktop/mobile/two themes and durable Assaut féroce reaction/new die/payment/undo passed.');
} finally { await browser.close();await new Promise(resolveClose=>server.close(resolveClose)); }
