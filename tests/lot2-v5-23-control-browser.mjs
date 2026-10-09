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
mkdirSync(join(root, 'tmp/lot2-control-ui'), { recursive: true });
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
try {
  const extra=await setup({actorTalents:[owned('talent-strike-mighty-blow')]}); const p=extra.page;
  await defenseCC(p); await panel(p).getByText('Circonstances des Tests',{exact:true}).click();
  await panel(p).getByLabel('Attaque supplémentaire : payer 1 Élan (une fois par Tour)',{exact:true}).check(); await enterRolls(p,61,81);
  await expect(panel(p).locator('input[name="v5-choice-actor"]')).toHaveCount(0); await expect(applyButton(p)).toBeEnabled();
  const paid=await p.evaluate(()=>window.lot2UI.view.getViewState().resolution.preview); assert.equal(paid.roll,61); assert.equal(paid.input.actor.extensions.v5.hasMomentum,false); assert.equal(paid.talentPlans.flatMap(plan=>plan.proposals).find(row=>row.op==='modifyDamage').amount,1);
  await applyButton(p).click(); await expect.poll(()=>p.evaluate(()=>window.lot2UI.applyResults.at(-1)?.status)).toBe('applied'); await p.getByRole('button',{name:'Annuler la dernière commande'}).click(); await expect.poll(()=>participantHP(p,'target')).toBe(12); await extra.context.close();

  const beat=await setup({width:390,actorMomentum:false,actorTalents:[owned('talent-beat-blade')]}); const b=beat.page;
  await defenseCC(b); await panel(b).getByText('Circonstances des Tests',{exact:true}).click();
  await panel(b).getByLabel('Battement : remplacer toutes les Blessures et conséquences du critique',{exact:true}).check();
  await panel(b).getByLabel('Taille de l’auteur',{exact:true}).selectOption('3'); await panel(b).getByLabel('Taille de la cible',{exact:true}).selectOption('3'); await enterRolls(b,22,81);
  await expect(panel(b)).toContainText('Battement : 0 Blessure'); await expect(panel(b).locator('[data-roll-input="critical-location"]')).toHaveCount(0); await expect(applyButton(b)).toBeEnabled();
  await applyButton(b).click(); await expect.poll(()=>b.evaluate(()=>window.lot2UI.applyResults.at(-1)?.status)).toBe('applied'); assert.equal(await participantHP(b,'target'),12); assert.equal(await b.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').states[0].kind),'talent-active');
  assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'Mobile page must not overflow horizontally'); await b.screenshot({path:join(root,'tmp/lot2-control-ui/battement-mobile.png'),fullPage:true}); await beat.context.close();

  const fortune=await setup({actorMomentum:false}); const f=fortune.page;
  await f.getByRole('button',{name:'Modifier la Fortune de Acteur de recette',exact:true}).click(); const dialog=f.getByRole('dialog',{name:'Fortune — Acteur de recette'});
  await dialog.getByLabel('Points de Fortune disponibles',{exact:true}).fill('2'); await dialog.getByRole('button',{name:'Initialiser Fortune',exact:true}).click(); await expect(dialog).toHaveCount(0); assert.equal(await f.evaluate(()=>window.lot2UI.store.getFortune('actor').balance),2); await fortune.context.close();
  const reaction=await setup({actorMomentum:false,actorTalents:[owned('talent-furious-assault')]}); const r=reaction.page;
  await r.evaluate(async()=>{await window.lot2UI.store.updateParticipant('target',{hp:40,maxHp:40});}); await defenseCC(r); await enterRolls(r,23,81); await expect(applyButton(r)).toBeEnabled(); await applyButton(r).click();
  const use=r.getByRole('button',{name:'Utiliser Assaut féroce de Acteur de recette',exact:true}); await expect(use).toBeVisible(); const before=await r.evaluate(()=>({revision:window.lot2UI.store.getLocalRevision(),draws:window.randomDraws,momentum:window.lot2UI.store.listParticipants().find(row=>row.id==='actor').extensions.v5.hasMomentum}));
  await use.click(); await expect(panel(r).locator('[data-roll-input="attack"]')).toHaveValue(''); assert.equal(await r.evaluate(()=>window.randomDraws),before.draws); assert.equal(await r.evaluate(()=>window.lot2UI.store.getLocalRevision()),before.revision);
  await panel(r).getByText('Circonstances des Tests',{exact:true}).click(); await panel(r).getByRole('button',{name:'Quitter la préparation d’Assaut féroce',exact:true}).click(); assert.equal(await r.evaluate(()=>window.lot2UI.store.getLocalRevision()),before.revision); assert.equal(await r.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='actor').extensions.v5.hasMomentum),true);
  await use.click(); await enterRolls(r,61,81); await expect(panel(r).locator('input[name="v5-choice-actor"]')).toHaveCount(0); await expect(applyButton(r)).toBeEnabled(); await applyButton(r).click(); await expect.poll(()=>r.evaluate(()=>window.lot2UI.applyResults.at(-1)?.status)).toBe('applied'); await expect(use).toHaveCount(0);
  const reactionLedger=await r.evaluate(()=>JSON.parse(window.lot2UI.store.getFullJSON()).extensions.v5.actionLedger); assert.ok(reactionLedger.quotaUsage.some(row=>row.quotaId==='talent-furious-assault:round')); assert.ok(reactionLedger.quotaUsage.some(row=>row.quotaId==='system:paid-momentum-extra-attack')); await reaction.context.close();
  assert.deepEqual(errors,[]); console.log('Contrôle UI 2.3 : gestes Élan payé/Coup puissant, Battement mobile, Fortune et Assaut féroce réussis.');
} finally {await browser.close();await new Promise(resolveClose=>server.close(resolveClose));}
