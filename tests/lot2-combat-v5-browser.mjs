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
async function setup({ width = 1440, both = false, states = [], extraTarget = false, actorMomentum = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 980 }, serviceWorkers: 'block' });
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/blank`); await page.setContent('<main><div id="mount"></div><button id="test-undo">Annuler la dernière commande</button><div id="editor"></div><div id="dice-prep-results"></div><button id="test-quick-roll">Jet rapide V5</button><button id="test-next-turn">Terminer le tour de recette</button></main>');
  await page.addStyleTag({ path: join(root, 'MJ.css') }); await page.addStyleTag({ path: join(root, 'js/ui/workspace.css') });
  await page.evaluate(async ({ origin, both, states, extraTarget, actorMomentum }) => {
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
    const actor = { id: 'actor', name: 'Acteur de recette', kind: 'PJ', hp: 12, maxHp: 12, zone: 'active', camp: 'pj', states,
      caracs: { CC: 65, CT: 45, F: 30, E: 30, Ag: 35 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, actions: [attack, skill, legacy], extensions: { v5: { hasMomentum: actorMomentum } } };
    const target = { id: 'target', name: 'Défenseur de recette', kind: 'Créature', hp: 12, maxHp: 12, zone: 'active', camp: 'ennemi', states: [],
      caracs: { CC: 35, E: 30, Ag: 42 }, armor: { head: 0, body: 7, arms: 0, legs: 0 }, actions: [{ id: 'dodge', type: 'defense', note: 'Esquive', base: 42, damage: 0 }], extensions: { v5: { hasMomentum: both } } };
    const other = { ...structuredClone(target), id: 'other', name: 'Autre cible', caracs: { CC: 25, E: 30, Ag: 31 }, actions: [{ id: 'dodge', type: 'defense', note: 'Esquive', base: 31, damage: 0, mod: 10, extensions: { v5: { slModifier: -1 } } }] };
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'actor', order: ['actor', 'target', ...(extraTarget ? ['other'] : [])], participants: [actor, target, ...(extraTarget ? [other] : [])] }, diceLines: [], log: [] });
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
  }, { origin, both, states, extraTarget, actorMomentum });
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
  // The most damaging result can retain a worse test roll because hit location changes armour.
  const desktop = await setup(); const p = desktop.page;
  await defenseCC(p); await enterRolls(p, 61, 73);
  const actorCards = panel(p).locator('input[name="v5-choice-actor"]');
  await expect(actorCards).toHaveCount(2); await expect(actorCards.nth(0)).not.toBeChecked(); await expect(applyButton(p)).toBeDisabled();
  const choices = panel(p).locator('.workspace-v5-choice-group').first();
  await expect(choices).toContainText('Conserver 61'); await expect(choices).toContainText('5 Blessures perdues');
  await expect(choices).toContainText('Inverser en 16'); await expect(choices).toContainText('3 Blessures perdues');
  await expect(choices.locator('.workspace-v5-recommendation')).toHaveText('Conseil : Plus de Blessures');
  await expect(panel(p).locator('.workspace-v5-calculations')).not.toHaveAttribute('open');
  await p.screenshot({ path: join(root, 'tmp/lot2-ui/comparaison-desktop.png'), fullPage: true });
  await actorCards.nth(0).focus(); await p.keyboard.press('Space');
  await expect(panel(p).locator('input[name="v5-choice-actor"][value="keep"]')).toBeChecked();
  await expect(applyButton(p)).toBeEnabled(); assert.equal(await p.evaluate(() => window.randomDraws), 0, 'no new die when comparing or choosing');
  await panel(p).getByText('Détail des calculs et règles', { exact: true }).click(); await expect(panel(p).locator('.workspace-v5-calculations')).toHaveAttribute('open');
  await expect(panel(p).locator('.workspace-v5-calculations')).toContainText('jet initial 61, jet final 61');
  await applyButton(p).click(); await expect.poll(() => participantHP(p, 'target')).toBe(7);
  assert.equal(await p.evaluate(() => window.lot2UI.calls.filter(call => call.kind === 'apply').length), 1);
  const savedDetail = await p.evaluate(() => window.lot2UI.store.getLog().find(row => row.kind === 'resolution').detail);
  assert.equal(savedDetail.test.initialRoll, 61); assert.equal(savedDetail.test.optionId, 'keep'); assert.ok(savedDetail.ruleVersion.startsWith('v5-combat'));
  await p.getByRole('button', { name: 'Annuler la dernière commande' }).click(); await expect.poll(() => participantHP(p, 'target')).toBe(12);
  // Momentum toggle is a real command and loses no identifiers.
  const momentumButton = p.getByRole('button', { name: 'Modifier l’Élan de Acteur de recette' });
  await expect(momentumButton).toHaveAttribute('aria-pressed', 'true'); await momentumButton.click(); await expect(momentumButton).toHaveAttribute('aria-pressed', 'false');
  await p.getByRole('button', { name: 'Annuler la dernière commande' }).click(); await expect(momentumButton).toHaveAttribute('aria-pressed', 'true');
  await p.evaluate(async origin => {
    const { createActionEditor } = await import(`${origin}/js/ui/action-editor.js`);
    window.actionEditorTest = createActionEditor({ container: document.querySelector('#editor'), action: { type: 'skill', base: 50, mod: 10, note: 'Ancien', extensions: { custom: { preserved: true } } } });
  }, origin);
  await expect(p.locator('#editor').getByLabel('Modificateur V5 (DR)', { exact: true })).toHaveValue('');
  assert.equal(await p.evaluate(() => window.actionEditorTest.getValue().mod), 10, 'legacy threshold is retained until explicit DR input');
  await p.locator('#editor').getByLabel('Modificateur V5 (DR)', { exact: true }).fill('2'); await p.keyboard.press('Tab');
  const savedAction = await p.evaluate(() => window.actionEditorTest.getValue());
  assert.equal(savedAction.base, '50'); assert.equal(savedAction.mod, 0); assert.equal(savedAction.extensions.v5.slModifier, 2); assert.equal(savedAction.extensions.custom.preserved, true);
  await p.evaluate(async origin => {
    const { runDiceLine } = await import(`${origin}/js/ui/dice-line.js`);
    await window.lot2UI.store.addDiceLine({ id: 'quick', participantId: 'actor', note: 'Compétence de fiche liée', type: 'skill', base: 45, damage: 0, extensions: { ficheSkill: 'Perception' } });
    Math.random = () => { window.randomDraws += 1; return 0.215; };
    document.querySelector('#test-quick-roll').addEventListener('click', () => { window.quickResult = runDiceLine('quick', window.lot2UI.store); });
  }, origin);
  await p.getByRole('button', { name: 'Jet rapide V5' }).click();
  await expect(p.locator('#dice-prep-results')).toContainText('d100 22'); await expect(p.locator('#dice-prep-results')).toContainText('DR 5');
  await expect(p.locator('#dice-prep-results details')).not.toHaveAttribute('open');
  const quick = await p.evaluate(() => window.quickResult); assert.equal(quick.preview.test.kind, 'test'); assert.equal(quick.preview.location, null); assert.equal(quick.preview.damage, null); assert.equal(quick.preview.test.critical, true);
  await expect.poll(() => p.evaluate(() => window.lot2UI.store.getLog().find(row => row.kind === 'roll')?.detail.test.sl)).toBe(5);
  await desktop.context.close();

  // A quick generic roll that needs a choice resumes the same d100 in Jouer, including an ad hoc line beside existing actions.
  const quickResume=await setup({states:[{name:'À Terre',level:1}]});const quickPage=quickResume.page;
  await quickPage.evaluate(async origin=>{
    const {runDiceLine}=await import(`${origin}/js/ui/dice-line.js`);
    await window.lot2UI.store.addDiceLine({id:'quick-resume',participantId:'actor',note:'Test ponctuel à poursuivre',type:'skill',base:45,damage:0});
    window.randomDraws=0;Math.random=()=>{window.randomDraws+=1;return 0.615;};
    document.querySelector('#test-quick-roll').addEventListener('click',()=>{const result=runDiceLine('quick-resume',window.lot2UI.store);window.quickResult=result;if(result?.status==='requires-resolution')window.quickOpened=window.lot2UI.view.openResolution(window.lot2UI.store.getDiceLines().find(line=>line.id==='quick-resume'),{roll:result.initialRoll});});
  },origin);
  await quickPage.getByRole('button',{name:'Jet rapide V5'}).click();assert.equal(await quickPage.evaluate(()=>window.quickResult.status),'requires-resolution');assert.equal(await quickPage.evaluate(()=>window.quickOpened),true);await expect(panel(quickPage).locator('[data-roll-input="attack"]')).toHaveValue('62');assert.equal(await quickPage.evaluate(()=>window.randomDraws),1);
  await panel(quickPage).getByText('Circonstances des Tests',{exact:true}).click();await panel(quickPage).getByLabel('Le Test implique un mouvement',{exact:true}).selectOption('false');await panel(quickPage).getByLabel('Sources supplémentaires d’Avantage',{exact:true}).fill('1');await quickPage.keyboard.press('Tab');await panel(quickPage).getByRole('button',{name:'Calculer',exact:true}).click();await expect(panel(quickPage).locator('input[name="v5-choice-actor"]')).toHaveCount(2);await panel(quickPage).locator('input[name="v5-choice-actor"][value="reverse"]').check();await expect(panel(quickPage).locator('[data-roll-input="attack"]')).toHaveValue('62');assert.equal(await quickPage.evaluate(()=>window.randomDraws),1);assert.equal(await quickPage.evaluate(()=>window.lot2UI.view.getViewState().resolution.preview.roll),26);await quickResume.context.close();

  // Two players each select their own voluntary inversion. Defender advice minimizes received wounds.
  const dual = await setup({ both: true }); const q = dual.page;
  await defenseCC(q); await enterRolls(q, 61, 81);
  await expect(panel(q).locator('.workspace-v5-choice-group')).toHaveCount(2); await expect(applyButton(q)).toBeDisabled();
  await expect(panel(q).locator('.workspace-v5-recommendation')).toHaveCount(0);
  await panel(q).locator('input[name="v5-choice-actor"][value="keep"]').check();
  const defenseGroup = panel(q).locator('.workspace-v5-choice-group').nth(1);
  await expect(defenseGroup).toContainText('Blessures subies par le défenseur');
  await expect(defenseGroup.locator('.workspace-v5-recommendation')).toHaveText('Conseil : Moins de Blessures subies');
  await expect(defenseGroup.locator('.workspace-v5-choice').filter({ has: q.locator('input[value="reverse"]') })).toContainText('Conseil :');
  await expect(applyButton(q)).toBeDisabled(); await panel(q).locator('input[name="v5-choice-defender"][value="reverse"]').check(); await expect(applyButton(q)).toBeEnabled();
  assert.equal(await q.evaluate(() => window.randomDraws), 0);
  await dual.context.close();

  // A successful defensive double remains critical when that side loses the opposition.
  const critical = await setup({ actorMomentum: false }); const c = critical.page;
  await defenseCC(c); const defenseBase = panel(c).locator('[data-focus-key="defense-base"]'); await defenseBase.fill('70');
  await enterRolls(c, 23, 44); await expect(panel(c).getByText('Critique défensif sur l’attaquant', { exact: true })).toBeVisible(); await expect(applyButton(c)).toBeDisabled();
  await panel(c).locator('[data-roll-input="defender-critical-location"]').fill('21'); await c.keyboard.press('Enter');
  await expect(applyButton(c)).toBeDisabled(); await panel(c).locator('[data-roll-input="defender-critical-effect"]').fill('25'); await c.keyboard.press('Enter');
  await expect(applyButton(c)).toBeEnabled(); const beforeCriticalActorHP = await participantHP(c, 'actor'); await applyButton(c).click();
  await expect.poll(() => participantHP(c, 'actor')).toBeLessThan(beforeCriticalActorHP);
  await c.getByRole('button', { name: 'Annuler la dernière commande' }).click(); await expect.poll(() => participantHP(c, 'actor')).toBe(beforeCriticalActorHP);
  // An Esquive double is a generic critical success: no defensive hit or Momentum gained.
  await panel(c).locator('[data-focus-key="defense-stat"]').selectOption('jet:dodge'); await expect(panel(c).getByLabel('Nature de la défense', { exact: true })).toHaveValue('test');
  await enterRolls(c, 23, 22); await expect(panel(c).getByText('Critique défensif sur l’attaquant', { exact: true })).toHaveCount(0);
  // Defender invalid numbers cannot be rounded or silently treated as no sources.
  await panel(c).getByLabel('Avantages supplémentaires de défense', { exact: true }).fill('-1'); await c.keyboard.press('Tab'); await panel(c).getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(panel(c).getByRole('alert')).toContainText('entier entre 0 et 100'); await expect(applyButton(c)).toHaveCount(0);
  await panel(c).getByLabel('Avantages supplémentaires de défense', { exact: true }).fill('0'); await c.keyboard.press('Tab');
  // A non-double normal hit also demands the separate excess critical, using an uncapped +10 per lost wound beyond zero.
  await c.evaluate(async () => { await window.lot2UI.store.updateParticipant('target', { hp: 1 }); });
  await defenseCC(c); await enterRolls(c, 23, 71);
  await expect(panel(c)).toContainText('Critique d’excédent'); await expect(panel(c).locator('[data-roll-input="critical-location"]')).toHaveCount(0); await expect(applyButton(c)).toBeDisabled();
  await panel(c).locator('[data-roll-input="critical-second"]').fill('60'); await c.keyboard.press('Enter'); await expect(panel(c)).toContainText('140');
  await expect(panel(c)).toContainText('Mort instantanée'); await expect(applyButton(c)).toBeEnabled(); await applyButton(c).click(); await expect.poll(() => participantHP(c, 'target')).toBe(0);
  assert.equal(await c.evaluate(() => window.lot2UI.store.listParticipants().find(row => row.id === 'target').states.some(state => /terre/i.test(state.name))), false, 'zero wounds do not invent Prone');
  await c.getByRole('button', { name: 'Annuler la dernière commande' }).click(); await expect.poll(() => participantHP(c, 'target')).toBe(1);
  await critical.context.close();

  // Inoffensive defensive critical asks for a second severity and retains the lower value.
  const harmless = await setup({ actorMomentum: false }); const h = harmless.page;
  await h.evaluate(async () => { await window.lot2UI.store.updateParticipant('target', { actions: [{ id: 'parry', note: 'Parade inoffensive', type: 'defense', base: 70, damage: 0, qualities: [{ id: 'inoffensive' }] }] }); });
  await panel(h).locator('[data-focus-key="defense-stat"]').selectOption('jet:parry'); await enterRolls(h, 23, 44);
  await panel(h).locator('[data-roll-input="defender-critical-location"]').fill('01'); await h.keyboard.press('Enter');
  await panel(h).locator('[data-roll-input="defender-critical-effect"]').fill('80'); await h.keyboard.press('Enter'); await expect(applyButton(h)).toBeDisabled();
  await panel(h).locator('[data-roll-input="defender-critical-effect-alternative"]').fill('15'); await h.keyboard.press('Enter'); await expect(applyButton(h)).toBeEnabled();
  const harmlessPreview = await h.evaluate(() => window.lot2UI.view.getViewState().resolution.preview);
  assert.equal(harmlessPreview.defenderCritical.details.effectRoll, 15); assert.deepEqual(harmlessPreview.defenderCritical.details.effectRollCandidates, [80, 15]);
  await applyButton(h).click(); await expect.poll(() => participantHP(h, 'actor')).toBe(11); await harmless.context.close();

  // Conditions have fully accessible contextual selectors; legacy modifiers need a conscious DR choice.
  const contexts = await setup({ states: [{ name: 'Brisé', level: 1 }, { name: 'Enchevêtré', level: 1 }, { name: 'Aveuglé', level: 1 }] }); const x = contexts.page;
  await panel(x).locator('[data-action-key="search"]').click(); await enterRolls(x, 23);
  await expect(panel(x)).toContainText('Préciser si le Test implique un mouvement'); await expect(applyButton(x)).toBeDisabled();
  await panel(x).getByText('Circonstances des Tests', { exact: true }).click();
  for (const name of ['Le Test implique un mouvement','Le Test sert à fuir ou se cacher','Le Test est réalisable sans voir mais repose sur la vue']) {
    await panel(x).getByLabel(name, { exact: true }).selectOption('false');
    await panel(x).getByText('Circonstances des Tests', { exact: true }).click();
  }
  await enterRolls(x, 23); await expect(applyButton(x)).toBeEnabled();
  await panel(x).locator('[data-action-key="legacy"]').click();
  for (const name of ['Le Test implique un mouvement','Le Test sert à fuir ou se cacher','Le Test est réalisable sans voir mais repose sur la vue']) {
    await panel(x).getByText('Circonstances des Tests', { exact: true }).click();
    await panel(x).getByLabel(name, { exact: true }).selectOption('false');
  }
  await enterRolls(x, 23);
  await expect(panel(x)).toContainText('Ancien modificateur de seuil'); await expect(applyButton(x)).toBeDisabled();
  await panel(x).getByLabel('Modificateur V5 (DR)', { exact: true }).fill('1'); await x.keyboard.press('Tab'); await enterRolls(x, 23);
  await expect(applyButton(x)).toBeEnabled(); const legacyResult = await x.evaluate(() => window.lot2UI.view.getViewState().resolution.preview);
  assert.equal(legacyResult.test.score, 50); assert.equal(legacyResult.test.details.totalModifier, 0, '+1 DR difficulty and -1 strongest condition');
  await contexts.context.close();

  // Target changes reset typed defender difficulty, source count and nature; target comparison preserves exact source context.
  const comparisons = await setup({ extraTarget: true }); const t = comparisons.page;
  await panel(t).getByLabel('Modificateur V5 de défense (DR)', { exact: true }).fill('3'); await t.keyboard.press('Tab');
  await panel(t).getByLabel('Nature de la défense', { exact: true }).selectOption('melee');
  await panel(t).locator('[data-focus-key="target-other"]').click();
  await expect(panel(t).getByLabel('Modificateur V5 de défense (DR)', { exact: true })).toHaveValue('-1'); await expect(panel(t).getByLabel('Nature de la défense', { exact: true })).toHaveValue('test');
  await panel(t).locator('[data-focus-key="target-target"]').click(); await enterRolls(t, 61, 73);
  await panel(t).getByRole('button', { name: 'Comparer les cibles' }).click(); await panel(t).getByRole('button', { name: 'Choisir Autre cible', exact: true }).click();
  await expect(panel(t).getByLabel('Modificateur V5 de défense (DR)', { exact: true })).toHaveValue('-1');
  const comparedPreview = await t.evaluate(() => window.lot2UI.view.getViewState().resolution.preview); assert.equal(comparedPreview.input.defense.v5.slModifier, -1); assert.equal(comparedPreview.input.defense.v5.kind, 'test');
  await comparisons.context.close();

  // Phone layout, screen-reader labels, Rulebook critical rows >100, search within table effects.
  const phone = await setup({ width: 390 }); const m = phone.page;
  await defenseCC(m); await enterRolls(m, 61, 73); await expect(panel(m).locator('.workspace-v5-choice-cards')).toHaveCSS('grid-template-columns', /^\d/);
  assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'phone has no horizontal overflow');
  await m.screenshot({ path: join(root, 'tmp/lot2-ui/comparaison-mobile.png'), fullPage: true });
  await m.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await m.screenshot({ path: join(root, 'tmp/lot2-ui/comparaison-mobile-dark.png'), fullPage: true });
  await m.evaluate(() => window.lot2UI.view.openContext('rules'));
  const rules = m.locator('.workspace-side-panel:not([hidden])'); await rules.getByRole('button', { name: 'Critiques', exact: true }).click();
  await expect(rules.locator('[data-table-id="table-arm-crit"]')).toContainText('136 et plus'); await expect(rules.locator('[data-table-id="table-leg-crit"]')).toContainText('126 et plus');
  await rules.getByLabel('Rechercher dans les règles').fill('Hémorragique'); await expect(rules.locator('[data-table-id="table-head-crit"]')).toBeVisible();
  assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'rule tables do not overflow phone');
  await rules.locator('[data-table-id="table-head-crit"] tbody tr').first().scrollIntoViewIfNeeded();
  await m.screenshot({ path: join(root, 'tmp/lot2-ui/regles-mobile.png') });
  await phone.context.close();

  // End-of-Round fire: no guessed die, no mutation before complete input, one die reused for the later critical request.
  const effects = await setup({ states: [{name:'Enflammé',level:2}] }); const e=effects.page;
  await e.evaluate(async()=>{await window.lot2UI.store.updateParticipant('actor',{hp:3});await window.lot2UI.store.setRoundTurn(1,'target');});
  const startRevision=await e.evaluate(()=>window.lot2UI.store.getLocalRevision());
  await e.getByRole('button',{name:'Terminer le tour de recette'}).click();const effectDialog=e.getByRole('dialog',{name:'Terminer le tour : effets V5'});
  await expect(effectDialog).toBeVisible();await expect(effectDialog.getByRole('button',{name:/Lancer d10/})).toBeVisible();assert.equal(await participantHP(e,'actor'),3);assert.equal(await e.evaluate(()=>window.lot2UI.store.getLocalRevision()),startRevision);
  await effectDialog.getByRole('button',{name:'Annuler',exact:true}).click();await expect(effectDialog).toHaveCount(0);assert.equal(await participantHP(e,'actor'),3);assert.equal(await e.evaluate(()=>window.lot2UI.store.getLocalRevision()),startRevision);
  await e.getByRole('button',{name:'Terminer le tour de recette'}).click();await e.evaluate(()=>{Math.random=()=>{window.randomDraws+=1;return 0.85;};});
  await effectDialog.getByRole('button',{name:/Lancer d10/}).click();await expect(effectDialog.getByRole('button',{name:/Lancer d10/})).toBeDisabled();await effectDialog.getByRole('button',{name:'Confirmer les effets'}).click();
  await expect(effectDialog).toContainText('Résultats déjà renseignés');await expect(effectDialog).toContainText('9');await expect(effectDialog.getByLabel('Critique de feu au corps : jet de gravité d100',{exact:true})).toBeVisible();assert.equal(await participantHP(e,'actor'),3);
  await e.setViewportSize({width:390,height:980});assert.ok(await e.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'effects dialog fits phone');const effectBounds=await effectDialog.boundingBox();assert.ok(effectBounds.x>=0&&effectBounds.x+effectBounds.width<=390,'effect dialog stays within phone viewport');assert.ok(effectBounds.height<700,'effect dialog uses content height rather than filling screen');await e.screenshot({path:join(root,'tmp/lot2-ui/effets-mobile.png')});
  await effectDialog.getByLabel('Critique de feu au corps : jet de gravité d100',{exact:true}).fill('20');await effectDialog.getByRole('button',{name:'Confirmer les effets'}).click();await expect(effectDialog).toHaveCount(0);await expect.poll(()=>participantHP(e,'actor')).toBe(0);
  assert.equal(await e.evaluate(()=>window.randomDraws),1);assert.equal(await e.evaluate(()=>window.lot2UI.store.getCombat().round),2);
  await e.getByRole('button',{name:'Annuler la dernière commande'}).click();await expect.poll(()=>participantHP(e,'actor')).toBe(3);assert.equal(await e.evaluate(()=>window.lot2UI.store.getCombat().round),1);
  // A concurrent command invalidates the whole effects receipt without consuming its dice or ending the turn.
  await e.getByRole('button',{name:'Terminer le tour de recette'}).click();await effectDialog.getByRole('button',{name:/Lancer d10/}).click();
  await e.evaluate(()=>window.lot2UI.store.updateParticipant('target',{hp:11}));await effectDialog.getByRole('button',{name:'Confirmer les effets'}).click();await expect(effectDialog.getByRole('alert')).toContainText('La partie a changé');await expect(effectDialog.getByRole('button',{name:'Confirmer les effets'})).toBeDisabled();assert.equal(await participantHP(e,'actor'),3);
  await effectDialog.getByRole('button',{name:'Annuler',exact:true}).click();await effects.context.close();

  // Acquiring a timed Condition on another target uses the named author's end of Turn and acquires Fatigued when the last Stunned expires.
  const timing=await setup();const a=timing.page;
  await a.getByRole('button',{name:'Ajouter un état à Défenseur de recette',exact:true}).click();const stateForm=a.getByRole('group',{name:'Ajouter un état à Défenseur de recette',exact:true});
  await stateForm.getByLabel('État',{exact:true}).selectOption('Sonné');await stateForm.getByLabel('Phase d’expiration').selectOption('endOfTurn');await stateForm.getByLabel('Round d’expiration').fill('1');await stateForm.getByLabel('Acteur du Tour d’expiration').selectOption('actor');await a.setViewportSize({width:390,height:980});await stateForm.scrollIntoViewIfNeeded();assert.ok(await a.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'state expiry form fits phone');await a.screenshot({path:join(root,'tmp/lot2-ui/echeance-mobile.png')});await stateForm.getByRole('button',{name:'Ajouter',exact:true}).click();
  await expect.poll(()=>a.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').states.some(row=>row.name==='Sonné'))).toBe(true);
  const timedState=await a.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').states.find(row=>row.name==='Sonné'));assert.equal(timedState.v5Timing.expiry.actorId,'actor');assert.equal(timedState.authorId,'actor');assert.equal(timedState.targetId,'target');
  await a.getByRole('button',{name:'Terminer le tour de recette'}).click();await expect.poll(()=>a.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='target').states.some(row=>row.name==='Sonné'))).toBe(false);await expect(a.getByRole('button',{name:'Récupérer Exténué de Défenseur de recette'})).toBeVisible();
  await a.getByRole('button',{name:'Récupérer Exténué de Défenseur de recette'}).click();const methodDialog=a.getByRole('dialog',{name:/Récupérer Exténué/});await methodDialog.getByLabel('Méthode de récupération').selectOption('rest');await methodDialog.getByRole('button',{name:'Continuer'}).click();
  const recoveryDialog=a.getByRole('dialog',{name:'Récupérer un État'});await expect(recoveryDialog).toBeVisible();await a.screenshot({path:join(root,'tmp/lot2-ui/recuperation-mobile.png')});await recoveryDialog.getByLabel('Repos adapté à la cause confirmé par le MJ').selectOption('true');await recoveryDialog.getByRole('button',{name:'Confirmer les effets'}).click();await expect(recoveryDialog).toHaveCount(0);await expect(a.getByRole('button',{name:'Récupérer Exténué de Défenseur de recette'})).toHaveCount(0);
  await a.getByRole('button',{name:'Annuler la dernière commande'}).click();await expect(a.getByRole('button',{name:'Récupérer Exténué de Défenseur de recette'})).toBeVisible();await timing.context.close();

  // Unique acquisition never refreshes an existing Condition or removes newly regained Momentum; too much Stunned acquires Unconscious and clears Stunned.
  const acquisition=await setup();const n=acquisition.page;
  const addActorState=async(name,count='1')=>{await n.getByRole('button',{name:'Ajouter un état à Acteur de recette',exact:true}).click();const form=n.getByRole('group',{name:'Ajouter un état à Acteur de recette',exact:true});await form.getByLabel('État',{exact:true}).selectOption(name);await form.getByLabel('Niveau',{exact:true}).fill(count);await form.getByRole('button',{name:'Ajouter',exact:true}).click();};
  await addActorState('À Terre');await expect(n.getByRole('button',{name:'Modifier l’Élan de Acteur de recette'})).toHaveAttribute('aria-pressed','false');
  await n.getByRole('button',{name:'Modifier l’Élan de Acteur de recette'}).click();await expect(n.getByRole('button',{name:'Modifier l’Élan de Acteur de recette'})).toHaveAttribute('aria-pressed','true');await addActorState('À Terre','3');
  await expect.poll(()=>n.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='actor').states.filter(row=>row.name==='À Terre').length)).toBe(1);await expect(n.getByRole('button',{name:'Modifier l’Élan de Acteur de recette'})).toHaveAttribute('aria-pressed','true');
  await addActorState('Sonné','4');await expect.poll(()=>n.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='actor').states.some(row=>row.name==='Inconscient'))).toBe(true);assert.equal(await n.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='actor').states.some(row=>row.name==='Sonné')),false);
  await n.getByRole('button',{name:'Annuler la dernière commande'}).click();await expect(n.getByRole('button',{name:'Modifier l’Élan de Acteur de recette'})).toHaveAttribute('aria-pressed','true');await acquisition.context.close();

  // Fortune removes Unconscious after explicit payment, then its unresolved cause reacquires it at the actual end of Round.
  const fortune = await setup({states:[{name:'Inconscient',level:1,v5Recovery:{kind:'causeEnded'}}],actorMomentum:false});const f=fortune.page;await f.evaluate(()=>{const random=Math.random;window.fortuneDiceDraws=0;Math.random=()=>{const stack=new Error().stack;if(stack.includes('/dice.js')||stack.includes('/v5-effect-dialog.js'))window.fortuneDiceDraws+=1;return random();};});
  const outsideOptions=await f.evaluate(()=>window.lot2UI.recoveryOptionsFor({currentRound:3,outOfCombat:true}));assert.deepEqual(outsideOptions,{outOfCombat:true,transition:{round:3}},'explicit out-of-combat Round is retained without inventing a phase');
  await f.getByRole('button',{name:'Récupérer Inconscient de Acteur de recette'}).click();const fortuneMethod=f.getByRole('dialog',{name:/Récupérer Inconscient/});
  await expect(fortuneMethod.locator('option[value="fortune"]')).toHaveJSProperty('disabled',true);
  await fortuneMethod.getByRole('button',{name:'Initialiser Fortune'}).click();
  const fortuneInit=f.getByRole('dialog',{name:'Fortune — Acteur de recette'});await expect(fortuneInit).toBeVisible();
  await fortuneInit.getByRole('button',{name:'Annuler',exact:true}).click();
  assert.equal(await f.evaluate(()=>window.lot2UI.store.getFortune('actor').balance),null,'cancelling initialization preserves unknown balance');
  await fortuneMethod.getByRole('button',{name:'Initialiser Fortune'}).click();await fortuneInit.getByLabel('Points de Fortune disponibles').fill('2');await fortuneInit.getByRole('button',{name:'Initialiser Fortune',exact:true}).click();await expect(fortuneInit).toHaveCount(0);
  await expect(fortuneMethod.locator('option[value="fortune"]')).toHaveJSProperty('disabled',false);await expect(fortuneMethod).toContainText('Fortune disponible : 2');
  await fortuneMethod.getByLabel('Méthode de récupération').selectOption('fortune');await fortuneMethod.getByRole('button',{name:'Continuer'}).click();await expect(fortuneMethod).toHaveCount(0);await expect(f.getByRole('button',{name:'Récupérer Inconscient de Acteur de recette'})).toHaveCount(0);
  assert.equal(await f.evaluate(()=>window.lot2UI.store.getFortune('actor').balance),1,'recovery spends exactly one Fortune');
  await f.getByRole('button',{name:'Annuler la dernière commande'}).click();await expect(f.getByRole('button',{name:'Récupérer Inconscient de Acteur de recette'})).toBeVisible();assert.equal(await f.evaluate(()=>window.lot2UI.store.getFortune('actor').balance),2);
  await f.evaluate(()=>window.lot2UI.store.redo());await expect(f.getByRole('button',{name:'Récupérer Inconscient de Acteur de recette'})).toHaveCount(0);assert.equal(await f.evaluate(()=>window.lot2UI.store.getFortune('actor').balance),1);
  assert.deepEqual(await f.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='actor').extensions.v5.pendingConditionReacquisition),[{condition:'inconscient',round:1,reason:'fortune-cause-persists'}]);assert.equal(await f.evaluate(()=>window.fortuneDiceDraws),0);
  await f.getByRole('button',{name:'Terminer le tour de recette'}).click();await expect.poll(()=>f.evaluate(()=>window.lot2UI.store.getCombat().currentActorId)).toBe('target');await expect(f.getByRole('button',{name:'Récupérer Inconscient de Acteur de recette'})).toHaveCount(0);assert.equal(await f.evaluate(()=>window.lot2UI.store.getCombat().round),1);
  await f.getByRole('button',{name:'Terminer le tour de recette'}).click();await expect.poll(()=>f.evaluate(()=>window.lot2UI.store.getCombat().round)).toBe(2);await expect(f.getByRole('button',{name:'Récupérer Inconscient de Acteur de recette'})).toBeVisible();assert.deepEqual(await f.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='actor').extensions.v5.pendingConditionReacquisition),[]);assert.equal(await f.evaluate(()=>window.fortuneDiceDraws),0);await fortune.context.close();

  // Explicit medical attention can recover a medically locked Stunned condition without requesting an unrelated Endurance Test.
  const medical=await setup({states:[{name:'Sonné',level:1,v5Recovery:{kind:'medicalAttention'}}]});const medicalPage=medical.page;
  await medicalPage.getByRole('button',{name:'Récupérer Sonné de Acteur de recette'}).click();const medicalMethod=medicalPage.getByRole('dialog',{name:/Récupérer Sonné/});await medicalMethod.getByLabel('Méthode de récupération').selectOption('medical-attention');await medicalMethod.getByRole('button',{name:'Continuer'}).click();await expect(medicalMethod).toHaveCount(0);await expect(medicalPage.getByRole('button',{name:'Récupérer Sonné de Acteur de recette'})).toHaveCount(0);await expect(medicalPage.getByRole('button',{name:'Récupérer Exténué de Acteur de recette'})).toBeVisible();await expect(medicalPage.getByRole('dialog',{name:'Récupérer un État'})).toHaveCount(0);await medical.context.close();

  // Real HP controls heal with V5 rules, including actual Bleeding removal and the zero-Wounds poison lock.
  const healing=await setup({states:[{name:'Hémorragique',level:2}]});const b=healing.page;await b.evaluate(()=>window.lot2UI.store.updateParticipant('actor',{hp:4}));
  await b.getByRole('button',{name:'+1 PV pour Acteur de recette',exact:true}).click();await expect.poll(()=>participantHP(b,'actor')).toBe(5);assert.equal(await b.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='actor').states.filter(row=>row.name==='Hémorragique').reduce((sum,row)=>sum+row.level,0)),1);
  await b.getByRole('button',{name:'Annuler la dernière commande'}).click();await expect.poll(()=>participantHP(b,'actor')).toBe(4);assert.equal(await b.evaluate(()=>window.lot2UI.store.listParticipants().find(row=>row.id==='actor').states.filter(row=>row.name==='Hémorragique').reduce((sum,row)=>sum+row.level,0)),2);
  await b.evaluate(()=>window.lot2UI.store.updateParticipant('actor',{hp:0,states:[{name:'Empoisonné',level:1}]}));await b.evaluate(()=>{window.lastEffectResult=null;});await b.getByRole('button',{name:'+1 PV pour Acteur de recette',exact:true}).click();await expect.poll(()=>b.evaluate(()=>window.lastEffectResult?.status)).toBe('applied');assert.equal(await participantHP(b,'actor'),0);await healing.context.close();

  // An old decision cannot silently acquire the new combat revision when a radio, critical field, or apply is used.
  const staleChoice=await setup();const s=staleChoice.page;await defenseCC(s);await enterRolls(s,61,73);
  await s.evaluate(()=>window.lot2UI.store.updateParticipant('target',{hp:11}));await panel(s).locator('input[name="v5-choice-actor"][value="keep"]').click();await expect(panel(s).getByRole('alert')).toContainText('La partie a changé depuis la comparaison');await expect(applyButton(s)).toHaveCount(0);assert.equal(await participantHP(s,'target'),11);
  await panel(s).getByRole('button',{name:'Calculer',exact:true}).click();await panel(s).locator('input[name="v5-choice-actor"][value="keep"]').check();await expect(applyButton(s)).toBeEnabled();await staleChoice.context.close();

  assert.deepEqual(errors, [], 'No JS runtime error in any interaction');
  console.log('Lot 2.1/2.2 UI: desktop + phone, both participants, defensive critical, legacy DR, contexts, target comparison, atomic apply/undo, Momentum, V5 rule tables, explicit end-of-Round effects, reused dice, stale/cancel safety, authored expiry, recovery, medical attention, Fortune return and quick-roll resumption passed.');
} finally { await browser.close(); await new Promise(resolveClose => server.close(resolveClose)); }
