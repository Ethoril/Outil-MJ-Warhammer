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
async function noOverflow(page){if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)){console.log(await page.evaluate(()=>Array.from(document.querySelectorAll('main *')).filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(-15).map(el=>({tag:el.tagName,cls:el.className,text:el.textContent.slice(0,100),width:el.getBoundingClientRect().width,right:el.getBoundingClientRect().right}))));await page.screenshot({path:join(root,'tmp/small-overflow.png'),fullPage:true});}assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'Mobile page must not overflow');}
try{
 const injure=await setup({width:390,actorMomentum:false,actorTalents:[owned('talent-strike-to-injure')]});const i=injure.page;
 await i.evaluate(async()=>{const s=window.lot2UI.store,t=s.listParticipants().find(p=>p.id==='target');await s.updateParticipant('target',{hp:40,maxHp:40,armor:{head:0,body:0,arms:0,legs:0}});document.documentElement.setAttribute('data-theme','light');});
 await customAction(i,{name:'Corps à corps (Base)',type:'attack',base:65,damage:4});await defenseCC(i);await enterRolls(i,22,82);await expect(applyButton(i)).toBeDisabled();
 await panel(i).locator('[data-roll-input="critical-location"]').fill('2');await panel(i).locator('[data-roll-input="critical-location"]').press('Enter');
 await panel(i).locator('[data-roll-input="critical-effect"]').fill('80');await panel(i).locator('[data-roll-input="critical-effect"]').press('Enter');
 await i.getByLabel('Frappe blessante : deuxième gravité au choix',{exact:true}).fill('20');await i.getByLabel('Frappe blessante : deuxième gravité au choix',{exact:true}).press('Enter');
 await i.getByLabel('Frappe blessante : gravité retenue (first)',{exact:true}).selectOption('true');assert.equal((await preview(i)).critical.details.effectRollBase,20);assert.equal((await preview(i)).roll,22);await expect(applyButton(i)).toBeEnabled();
 await i.getByLabel('Frappe blessante : gravité retenue (first)',{exact:true}).selectOption('false');assert.equal((await preview(i)).critical.details.effectRollBase,80);assert.equal((await preview(i)).roll,22);
 await noOverflow(i);await i.screenshot({path:join(root,'tmp/lot2-24-control-ui/injure-choice-mobile.png'),fullPage:true});await injure.context.close();
 const resistant=await setup({actorMomentum:false,actorTalents:[{...owned('talent-resistant'),specialization:'Poison'}]});const r=resistant.page;
 await customAction(r,{name:'Résistance',base:50});await r.getByLabel('Talent à choisir avant le jet',{exact:true}).selectOption('resistant');await r.getByLabel('Le Test sert à résister à une menace',{exact:true}).selectOption('true');await r.getByLabel('Menace correspondant à la spécialité acquise',{exact:true}).selectOption('Poison');
 await r.getByRole('button',{name:'Commencer une nouvelle séance',exact:true}).click();await panel(r).getByRole('button',{name:'Calculer',exact:true}).click();await expect(applyButton(r)).toBeEnabled();await expect(panel(r)).toContainText('Réussite automatique, sans jet.');assert.equal((await preview(r)).test.automatic,true);assert.equal((await preview(r)).sl,0);
 await applyButton(r).click();await expect.poll(()=>r.evaluate(()=>window.lot2UI.applyResults.at(-1)?.status)).toBe('applied');await panel(r).getByRole('button',{name:'Calculer',exact:true}).click();await expect(applyButton(r)).toBeDisabled();await resistant.context.close();
 const initiative=await setup({width:390,actorMomentum:false,actorTalents:[owned('talent-combat-reflexes')]});const n=initiative.page;
 await n.evaluate(async()=>{const p=window.lot2UI.store.listParticipants().find(p=>p.id==='actor');await window.lot2UI.store.updateParticipant('actor',{caracs:{...p.caracs,I:43}});});
 await n.locator('[data-action-key="activate:combat-reflexes"]').click();await n.getByLabel('Début du combat',{exact:true}).selectOption('true');await n.getByLabel('Premier d10 d’Initiative',{exact:true}).fill('9');await n.getByLabel('Premier d10 d’Initiative',{exact:true}).press('Tab');await n.getByLabel('Deuxième d10 d’Initiative',{exact:true}).fill('2');await n.getByLabel('Deuxième d10 d’Initiative',{exact:true}).press('Tab');await n.getByLabel('Résultat d’Initiative choisi',{exact:true}).selectOption('second');
 await expect(panel(n).locator('[data-roll-input="attack"]')).toHaveCount(0);await panel(n).getByRole('button',{name:'Calculer',exact:true}).click();await expect(applyButton(n)).toBeEnabled();assert.equal((await preview(n)).talentActionChanges[0].patch.initiative,6);await applyButton(n).click();await expect.poll(()=>n.evaluate(()=>window.lot2UI.store.listParticipants().find(p=>p.id==='actor').initiative)).toBe(6);await n.getByRole('button',{name:'Annuler la dernière commande'}).click();await expect.poll(()=>n.evaluate(()=>window.lot2UI.store.listParticipants().find(p=>p.id==='actor').initiative)).toBe(0);await noOverflow(n);await initiative.context.close();
 const measures=await setup({width:390,actorMomentum:false,actorTalents:[owned('talent-tinker')]});const m=measures.page;
 await m.getByText('Calculs de situation des talents',{exact:true}).click();await m.getByLabel('Durée normale de la réparation',{exact:true}).fill('5');await m.getByLabel('Durée normale de la réparation',{exact:true}).press('Tab');await m.getByLabel('Au moins une Augmentation du Métier',{exact:true}).selectOption('true');await expect(panel(m)).toContainText('2.5 unités de temps');await noOverflow(m);await measures.context.close();
 const crew=await setup({actorMomentum:false,actorTalents:[owned('talent-crew-commander')]});const c=crew.page;
 await c.evaluate(async()=>{const s=window.lot2UI.store,a=s.listParticipants().find(p=>p.id==='actor');await s.updateParticipant('actor',{hp:40,maxHp:40,caracs:{...a.caracs,Soc:60,FM:40}});await s.updateParticipant('target',{camp:'pj',hp:40,maxHp:40,actions:[{id:'crew-shot',note:'Canon de recette',type:'attack',attr:'CT',base:30,damage:4,qualities:[{id:'equipage',parameter:2}]}]});});
 await c.locator('[data-action-key="activate:crew-commander"]').click();await panel(c).getByRole('button',{name:'Défenseur de recette',exact:true}).click();await c.getByLabel('Arme à équipage à portée de voix',{exact:true}).selectOption('true');await c.getByLabel('Compétence de tir du commandant',{exact:true}).fill('77');await c.getByLabel('Compétence de tir du commandant',{exact:true}).press('Tab');await enterRolls(c,20);await expect(applyButton(c)).toBeEnabled();await applyButton(c).click();await expect.poll(()=>c.evaluate(()=>window.lot2UI.store.listParticipants().find(p=>p.id==='target').states.some(s=>s.key==='crew-next-shot'))).toBe(true);
 await c.locator('[data-focus-key="select-target"]').click();await c.locator('[data-action-key="crew-shot"]').click();await c.getByLabel('Nature du Test',{exact:true}).selectOption('ranged');await panel(c).locator('[data-roll-input="defense"]').fill('');await enterRolls(c,98);assert.equal((await preview(c)).score.base,77);await expect(applyButton(c)).toBeEnabled();await applyButton(c).click();await expect.poll(()=>c.evaluate(()=>window.lot2UI.store.listParticipants().find(p=>p.id==='target').states.some(s=>s.key==='crew-next-shot'))).toBe(false);await crew.context.close();
 const frenzy=await setup({width:390,actorMomentum:false,actorTalents:[owned('talent-frenzy')]});const f=frenzy.page;
 await f.evaluate(async()=>{const s=window.lot2UI.store,a=s.listParticipants().find(p=>p.id==='actor');await s.updateParticipant('actor',{caracs:{...a.caracs,FM:50}});await s.updateParticipant('target',{hp:40,maxHp:40,armor:{head:0,body:0,arms:0,legs:0}});});
 await f.locator('[data-action-key="activate:frenzy"]').click();await enterRolls(f,20);await expect(applyButton(f)).toBeEnabled();await applyButton(f).click();await f.locator('[data-action-key="blade"]').click();await defenseCC(f);await f.getByLabel('Ennemi le plus proche',{exact:true}).selectOption('target');await f.getByLabel('Attaque gratuite de Frénésie',{exact:true}).check();await enterRolls(f,24,82);await expect(applyButton(f)).toBeEnabled();assert.ok((await preview(f)).actionCosts.waived.length);await applyButton(f).click();await panel(f).locator('[data-roll-input="attack"]').fill('25');await panel(f).getByRole('button',{name:'Calculer',exact:true}).click();assert.ok(!(await preview(f))?.actionCosts?.ready);assert.equal(await applyButton(f).count()?await applyButton(f).isEnabled():false,false);await noOverflow(f);await frenzy.context.close();
 const spin=await setup({width:390,extraTarget:true,actorMomentum:false,actorTalents:[owned('talent-whirlwind-of-death'),owned('talent-strike-to-injure')]});const w=spin.page;
 await w.evaluate(async()=>{const s=window.lot2UI.store;await s.setFortune('actor',2);await s.updateParticipant('target',{hp:40,maxHp:40,armor:{head:0,body:0,arms:0,legs:0}});await s.updateParticipant('other',{hp:1,maxHp:40,armor:{head:0,body:0,arms:0,legs:0}});});
 await w.locator('[data-action-key="blade"]').click();await panel(w).getByRole('button',{name:'Défenseur de recette',exact:true}).click();await defenseCC(w);await w.getByLabel('Choix de remplacement des dégâts',{exact:true}).selectOption('whirlwind-of-death');await w.getByLabel('Créature engagée (alliés compris) : Défenseur de recette',{exact:true}).check();await w.getByLabel('Créature engagée (alliés compris) : Autre cible',{exact:true}).check();await w.getByLabel('Toutes les créatures engagées sont incluses',{exact:true}).selectOption('true');await enterRolls(w,24,82);await expect(applyButton(w)).toBeDisabled();
 await w.getByLabel('Gravité du critique : Autre cible',{exact:true}).fill('80');await w.getByLabel('Gravité du critique : Autre cible',{exact:true}).press('Enter');await w.getByLabel('Autre gravité Frappe blessante : Autre cible',{exact:true}).fill('20');await w.getByLabel('Autre gravité Frappe blessante : Autre cible',{exact:true}).press('Enter');await w.getByLabel('Frappe blessante : gravité à retenir pour Autre cible',{exact:true}).selectOption('true');assert.equal((await preview(w)).roll,24);assert.equal((await preview(w)).secondaryTargets[0].critical.second.effectRollBase,20);await expect(applyButton(w)).toBeEnabled();await applyButton(w).click();await expect.poll(()=>w.evaluate(()=>window.lot2UI.store.getFortune('actor').balance)).toBe(1);await w.getByRole('button',{name:'Annuler la dernière commande'}).click();await expect.poll(()=>w.evaluate(()=>window.lot2UI.store.getFortune('actor').balance)).toBe(2);assert.equal(await participantHP(w,'other'),1);await noOverflow(w);await spin.context.close();
 const social=await setup({width:390,actorMomentum:false,actorTalents:[owned('talent-blather')]});const b=social.page;
 await b.evaluate(async()=>{const s=window.lot2UI.store,a=s.listParticipants().find(p=>p.id==='actor'),t=s.listParticipants().find(p=>p.id==='target');await s.updateParticipant('actor',{caracs:{...a.caracs,Soc:60}});await s.updateParticipant('target',{caracs:{...t.caracs,FM:60}});});
 await b.locator('[data-action-key="activate:blather"]').click();await panel(b).locator('[data-focus-key="defense-stat"]').selectOption('calm');await b.getByLabel('Pris en faute',{exact:true}).selectOption('true');await b.getByLabel('Unité de durée de conviction',{exact:true}).selectOption('minute');await enterRolls(b,50,90);await expect(applyButton(b)).toBeEnabled();await applyButton(b).click();await expect.poll(()=>b.evaluate(()=>window.lot2UI.store.listParticipants().find(p=>p.id==='target').states.find(s=>s.key==='conviction')?.remainingMinutes)).toBe(1);await noOverflow(b);await social.context.close();
 const small=await setup({width:390,targetTalents:[owned('talent-small')]});const sm=small.page;
 await sm.evaluate(async()=>{const s=window.lot2UI.store;await s.updateParticipant('target',{hp:200,maxHp:200});});
 await sm.locator('[data-action-key="blade"]').click();await defenseCC(sm);await sm.getByLabel('Taille de l’auteur',{exact:true}).selectOption('4');await sm.getByLabel('Taille de la cible',{exact:true}).selectOption('2');await enterRolls(sm,24,82);await expect(applyButton(sm)).toBeEnabled();const smallHit=await preview(sm);assert.equal(smallHit.damage.damageMultiplier,2);assert.equal(smallHit.damage.preProtectionDamage-smallHit.damage.absorption,smallHit.damage.finalDamage);assert.equal(smallHit.critical,null);await expect(panel(sm)).toContainText('Petit ×2');await applyButton(sm).click();await expect.poll(()=>participantHP(sm,'target')).toBe(200-smallHit.damage.finalDamage);await sm.getByRole('button',{name:'Annuler la dernière commande'}).click();await expect.poll(()=>participantHP(sm,'target')).toBe(200);
 await sm.getByLabel('Actions de taille de Petit',{exact:true}).selectOption('stomp');await enterRolls(sm,24,82);await expect(applyButton(sm)).toBeEnabled();const stomp=await preview(sm);assert.equal(stomp.score.base,65);assert.equal(stomp.damage.weaponDamage,3);assert.equal(stomp.damage.damageMultiplier,undefined);assert.equal(stomp.actionCosts.paid[0].resource,'momentum');await applyButton(sm).click();await noOverflow(sm);await small.context.close();
 const little=await setup({width:390,actorMomentum:false,actorTalents:[owned('talent-small')]});const lt=little.page;
 await lt.evaluate(async()=>{const s=window.lot2UI.store,a=s.listParticipants().find(p=>p.id==='actor');await s.updateParticipant('actor',{caracs:{...a.caracs,FM:40}});});
 await lt.locator('[data-action-key="blade"]').click();await defenseCC(lt);await lt.getByLabel('Taille de l’auteur',{exact:true}).selectOption('2');await lt.getByLabel('Taille de la cible',{exact:true}).selectOption('4');await enterRolls(lt,24,82);assert.equal((await preview(lt)).score.base,75);
 await lt.locator('[data-action-key="activate:small-psychology"]').click();await panel(lt).getByRole('button',{name:'Défenseur de recette',exact:true}).click();await lt.getByLabel('Taille de l’auteur',{exact:true}).selectOption('2');await lt.getByLabel('Taille de la cible',{exact:true}).selectOption('4');await lt.getByLabel('La créature plus grande est agressive',{exact:true}).selectOption('true');assert.equal(await panel(lt).locator('[data-roll-input="attack"]').count(),0);await panel(lt).getByRole('button',{name:'Calculer',exact:true}).click();await expect(applyButton(lt)).toBeEnabled();await applyButton(lt).click();await expect.poll(()=>lt.evaluate(()=>window.lot2UI.store.listParticipants().find(p=>p.id==='actor').states.some(s=>s.key==='terror-of-talent'))).toBe(true);
 await lt.locator('[data-action-key="activate:overcome-terror"]').click();const terrorId=await lt.evaluate(()=>window.lot2UI.store.listParticipants().find(p=>p.id==='actor').states.find(s=>s.key==='terror-of-talent').id);await lt.getByLabel('Terreur à résoudre',{exact:true}).selectOption(terrorId);await enterRolls(lt,95);await expect(applyButton(lt)).toBeEnabled();await applyButton(lt).click();await expect.poll(()=>lt.evaluate(()=>window.lot2UI.store.listParticipants().find(p=>p.id==='actor').states.find(s=>s.key==='brise')?.level)).toBe(6);assert.equal(await participantHP(lt,'actor'),12);await lt.getByRole('button',{name:'Annuler la dernière commande'}).click();await expect.poll(()=>lt.evaluate(()=>window.lot2UI.store.listParticipants().find(p=>p.id==='actor').states.some(s=>s.key==='terror-of-talent'))).toBe(true);await noOverflow(lt);await little.context.close();
 const sizeSpin=await setup({width:390,extraTarget:true,actorMomentum:false,actorTalents:[owned('talent-whirlwind-of-death')]});const sp=sizeSpin.page;
 await sp.evaluate(async()=>{const s=window.lot2UI.store;await s.setFortune('actor',1);await s.updateParticipant('target',{hp:200,maxHp:200});await s.updateParticipant('other',{hp:200,maxHp:200,talents:[{id:'talent-small',status:'resolved',rank:1}]});});
 await sp.locator('[data-action-key="blade"]').click();await panel(sp).getByRole('button',{name:'Défenseur de recette',exact:true}).click();await defenseCC(sp);await sp.getByLabel('Choix de remplacement des dégâts',{exact:true}).selectOption('whirlwind-of-death');await sp.getByLabel('Créature engagée (alliés compris) : Défenseur de recette',{exact:true}).check();await sp.getByLabel('Créature engagée (alliés compris) : Autre cible',{exact:true}).check();await sp.getByLabel('Toutes les créatures engagées sont incluses',{exact:true}).selectOption('true');await sp.getByLabel('Taille de l’auteur',{exact:true}).selectOption('4');await sp.getByLabel('Taille pour Petit : Autre cible',{exact:true}).selectOption('2');await enterRolls(sp,24,82);await expect(applyButton(sp)).toBeEnabled();assert.equal((await preview(sp)).secondaryTargets[0].damage.damageMultiplier,2);await applyButton(sp).click();await noOverflow(sp);await sizeSpin.context.close();
 assert.deepEqual(errors,[]);console.log('Talents restants UI : choix de gravité conserve les dés, Résistance sans jet et quota, Initiative au choix sans jet fictif, réparation divisée par deux, prochain tir d’équipage, quota Frénésie, Tourbillon multi-cibles et Fortune undo, Baratiner, Petit dans les deux sens, multiplication avant protections, Terreur/annulation et Piétinement empruntés, Tourbillon avec Petit secondaire, mobile et annulation réussis.');
}finally{await browser.close();await new Promise(resolveClose=>server.close(resolveClose));}
