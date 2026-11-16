// Interface hors combat de la poursuite V5 (docs/specs/poursuite-v5, lot L6) : entrée de l'écran Jouer et formulaire de la modale. Le DOM
// est un faux arbre ; le Store est réel (rien de la règle n'est simulé). L'ouverture du <dialog> se vérifie en navigateur (lot L7).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { listEngagements } from '../../../js/core/engagements.js';
import { createScenePursuitForm, renderScenePursuitEntry } from '../../../js/ui/v5-pursuit-dialog.js';

class El {
  constructor(tag) { Object.assign(this, { tagName: tag, children: [], options: [], dataset: {}, attrs: {}, listeners: {}, className: '', value: '', checked: false, disabled: false, _text: '' }); }
  append(...items) { for (const item of items) if (item != null) (item.isOption ? this.options : this.children).push(item); }
  prepend(...items) { this.children.unshift(...items.filter(item => item != null)); }
  appendChild(item) { this.append(item); return item; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key]; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(' '); }
}
const withDom = async work => {
  const old = { document: globalThis.document, Option: globalThis.Option };
  globalThis.document = { createElement: tag => new El(tag) };
  globalThis.Option = class { constructor(text, value) { Object.assign(this, { isOption: true, text, value }); } };
  try { return await work(); } finally { Object.assign(globalThis, old); }
};
const all = (root, predicate, found = []) => { if (!root) return found; if (predicate(root)) found.push(root); for (const child of root.children || []) all(child, predicate, found); return found; };
const byData = (root, key, value) => all(root, el => key in el.dataset && (value === undefined || el.dataset[key] === value))[0] || null;
const textOf = root => (root ? root.textContent : '');

const memoryPersistence = () => { let state; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: value }) { state = structuredClone(value); return { ok: true }; } }; };
const athletics = (total = 50) => ({ id: 'athletisme', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total });
const fighter = (id, camp, extra = {}) => ({ id, name: id, kind: camp === 'ennemi' ? 'PNJ' : 'PJ', camp, zone: 'active', initiative: 50, hp: 20, maxHp: 20,
  caracs: { CC: 50, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, skills: [athletics()], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
async function setup(rows = [fighter('runner', 'pj'), fighter('foe1', 'ennemi'), fighter('foe2', 'ennemi')]) {
  const store = createStore({ storage: null, persistence: memoryPersistence() }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: {} }, combat: { round: 1, currentActorId: null, order: rows.map(row => row.id), participants: rows } });
  const view = { form: null }, form = createScenePursuitForm({ Store: store, refresh: () => draw() });
  const draw = () => { view.form = form.render(); };
  draw();
  const fire = async (el, type = 'click') => { await el.listeners[type](); await store.whenIdle(); };
  const set = async (el, value, type = 'change') => { el.value = value; await fire(el, type); };
  return { store, view, draw, fire, set };
}
const choose = async ctx => { await ctx.set(byData(ctx.view.form, 'pursuitRole', 'runner'), 'prey'); await ctx.set(byData(ctx.view.form, 'pursuitRole', 'foe1'), 'pursuer'); };
// Un personnage peut avoir deux formulaires (Test de poursuite, Test d'Obstacle) : on désigne celui du type voulu.
const formOf = (ctx, kind, id) => all(ctx.view.form, el => el.dataset.pursuitTest === id && el.dataset.pursuitTestKind === kind)[0];
const roll = async (ctx, id, value, kind = 'pursuit') => ctx.set(byData(formOf(ctx, kind, id), 'pursuitTestRoll'), String(value), 'input');
const logTexts = store => store.getLog().map(row => row.text || row.message || JSON.stringify(row));

test('entrée de l’écran Jouer : grisée avec son motif sans participant, active avec deux (D17)', () => withDom(async () => {
  const empty = createStore({ storage: null, persistence: memoryPersistence() }); await empty.ready;
  const off = renderScenePursuitEntry({ Store: empty, onOpen: () => { throw Error('ne doit pas s’ouvrir'); } });
  const offButton = byData(off, 'pursuitSceneOpen');
  assert.equal(offButton.disabled, true);
  assert.match(textOf(off), /Aucun participant dans la rencontre en cours/);
  assert.equal(offButton.attrs['aria-describedby'], byData(off, 'pursuitSceneReason').attrs.id, 'le motif est lié au bouton');
  const { store } = await setup();
  let opened = 0;
  const on = renderScenePursuitEntry({ Store: store, onOpen: () => { opened += 1; } });
  const onButton = byData(on, 'pursuitSceneOpen');
  assert.equal(onButton.disabled, false);
  assert.equal(byData(on, 'pursuitSceneReason'), null, 'pas de motif quand l’entrée est ouverte');
  onButton.listeners.click();
  assert.equal(opened, 1);
}));

test('modale : seuls les participants actifs de la rencontre en cours sont proposés, valider reste inactif tant que rien n’est joué', () => withDom(async () => {
  const ctx = await setup([fighter('runner', 'pj'), fighter('foe1', 'ennemi'), fighter('attente', 'ennemi', { zone: 'waiting' })]);
  assert.ok(byData(ctx.view.form, 'pursuitRole', 'runner'));
  assert.equal(byData(ctx.view.form, 'pursuitRole', 'attente'), null);
  assert.deepEqual(byData(ctx.view.form, 'pursuitRole', 'runner').options.map(row => row.value), ['', 'prey', 'pursuer']);
  assert.equal(byData(ctx.view.form, 'pursuitSceneValidate').disabled, true);
  assert.equal(byData(ctx.view.form, 'pursuitTest'), null, 'pas de Test sans les deux camps');
}));

test('Test opposé à deux jets : l’aperçu s’affiche, rien n’est écrit, Valider écrit une entrée et une ligne, sans Action ni Round (CA19, CA20)', () => withDom(async () => {
  const ctx = await setup();
  await choose(ctx);
  assert.match(textOf(byData(ctx.view.form, 'pursuitTest', 'foe1')), /Test de poursuite de foe1/);
  assert.match(textOf(byData(ctx.view.form, 'pursuitTest', 'runner')), /Test de poursuite de runner/);
  const revision = ctx.store.getLocalRevision(), log = ctx.store.getLog().length, round = ctx.store.getCombat().round;
  await roll(ctx, 'foe1', 95);
  assert.equal(byData(ctx.view.form, 'pursuitSceneValidate').disabled, true, 'un seul jet : pas encore tranché');
  await roll(ctx, 'runner', 5);
  assert.match(textOf(byData(formOf(ctx, 'pursuit', 'runner'), 'pursuitTestPreview')), /Athlétisme 50 · jet 5 · \+5 DR/);
  assert.match(textOf(byData(ctx.view.form, 'pursuitOutcome')), /Fuyard échappé/);
  assert.equal(byData(ctx.view.form, 'pursuitEndApply'), null, 'pas de bouton de fin avant la validation');
  assert.equal(ctx.store.getLocalRevision(), revision, 'fermer sans valider n’écrit rien');
  assert.equal(ctx.store.getLog().length, log);
  await ctx.fire(byData(ctx.view.form, 'pursuitSceneValidate'));
  assert.equal(ctx.store.getLocalRevision(), revision + 1, 'une entrée d’historique');
  assert.equal(ctx.store.getLog().length, log + 1, 'une ligne de journal');
  assert.match(logTexts(ctx.store)[0], /Poursuite hors combat/);
  assert.equal(ctx.store.getCombat().round, round);
  assert.equal(ctx.store.getPursuit(), null, 'rien de conservé');
  assert.equal(byData(ctx.view.form, 'pursuitSceneValidate'), null, 'validé : le bloc ne se rejoue pas');
  assert.equal(byData(ctx.view.form, 'pursuitRole', 'runner').disabled, true, 'saisies verrouillées une fois validé');
}));

test('fuyard rattrapé : « Engager au plateau » après validation engage le fuyard avec ses poursuivants (D6)', () => withDom(async () => {
  const ctx = await setup();
  await choose(ctx);
  await roll(ctx, 'foe1', 5); await roll(ctx, 'runner', 95);
  assert.match(textOf(byData(ctx.view.form, 'pursuitOutcome')), /Fuyard rattrapé/);
  await ctx.fire(byData(ctx.view.form, 'pursuitSceneValidate'));
  const engage = byData(ctx.view.form, 'pursuitEndApply', 'engage');
  assert.ok(engage);
  assert.deepEqual(listEngagements({ participants: ctx.store.listParticipants() }), []);
  await ctx.fire(engage);
  assert.equal(listEngagements({ participants: ctx.store.listParticipants() }).length, 1);
  assert.equal(byData(ctx.view.form, 'pursuitEndApply', 'engage').disabled, true, 'déjà engagés');
}));

test('fuyard échappé : « Retirer de la rencontre » après validation retire le fuyard', () => withDom(async () => {
  const ctx = await setup();
  await choose(ctx);
  await roll(ctx, 'foe1', 95); await roll(ctx, 'runner', 5);
  await ctx.fire(byData(ctx.view.form, 'pursuitSceneValidate'));
  await ctx.fire(byData(ctx.view.form, 'pursuitEndApply', 'remove'));
  assert.ok(!ctx.store.listParticipants().some(row => row.id === 'runner'));
}));

test('écart faible : facteurs en trois cases (deux précochées, terrain au MJ), obstacle libre, Test d’Obstacle, issue (D13, D3)', () => withDom(async () => {
  const ctx = await setup();
  await choose(ctx);
  await roll(ctx, 'foe1', 30); await roll(ctx, 'runner', 50);
  assert.equal(byData(ctx.view.form, 'pursuitOutcome'), null, 'pas d’issue : il faut franchir un Obstacle');
  const factors = ctx.view.form && byData(ctx.view.form, 'pursuitFactors');
  assert.ok(factors);
  assert.deepEqual(all(factors, el => 'pursuitFactor' in el.dataset).map(el => el.dataset.pursuitFactor), ['won', 'speed', 'terrain']);
  assert.equal(byData(factors, 'pursuitFactor', 'won').checked, false, 'le fuyard a perdu le Test');
  const terrain = byData(ctx.view.form, 'pursuitFactor', 'terrain');
  terrain.checked = true; await ctx.fire(terrain, 'change');
  assert.equal(byData(ctx.view.form, 'pursuitFactor', 'terrain').checked, true, 'la case du MJ est conservée');
  const obstacle = () => byData(ctx.view.form, 'pursuitObstacle', 'runner');
  assert.ok(obstacle(), 'le camp du PJ franchit les Obstacles');
  assert.equal(byData(ctx.view.form, 'pursuitTest', 'runner').dataset.pursuitTestKind, 'pursuit', 'le Test opposé reste affiché');
  await ctx.set(byData(ctx.view.form, 'pursuitFreeLabel', 'runner'), 'Mur à escalader', 'input');
  await ctx.set(byData(ctx.view.form, 'pursuitFreeSkills', 'runner'), 'Athlétisme', 'input');
  await ctx.fire(byData(ctx.view.form, 'pursuitFreeApply', 'runner'));
  assert.match(textOf(obstacle()), /Mur à escalader \(obstacle libre du MJ\)/);
  const form = formOf(ctx, 'obstacle', 'runner');
  assert.ok(form, 'le Test d’Obstacle se saisit dans la modale');
  assert.deepEqual(byData(form, 'pursuitTestSkill').options.map(row => row.value), ['Athlétisme']);
  await roll(ctx, 'runner', 10, 'obstacle');
  assert.match(textOf(byData(formOf(ctx, 'obstacle', 'runner'), 'pursuitTestPreview')), /Athlétisme 50 · jet 10 · \+4 DR/);
  assert.match(textOf(byData(ctx.view.form, 'pursuitOutcome')), /Fuyard échappé/);
  assert.match(textOf(byData(ctx.view.form, 'pursuitOutcome')), /1 Obstacle\(s\) franchi\(s\) sur 1 exigé\(s\)/);
  assert.equal(byData(ctx.view.form, 'pursuitSceneValidate').disabled, false);
}));

test('Réussite éclatante : annoncée à l’écran avec le choix du bénéficiaire parmi les alliés (D19, D11)', () => withDom(async () => {
  const ctx = await setup([fighter('runner', 'pj'), fighter('ally', 'pj'), fighter('foe1', 'ennemi')]);
  await ctx.set(byData(ctx.view.form, 'pursuitRole', 'runner'), 'prey');
  await ctx.set(byData(ctx.view.form, 'pursuitRole', 'ally'), 'prey');
  await ctx.set(byData(ctx.view.form, 'pursuitRole', 'foe1'), 'pursuer');
  await roll(ctx, 'foe1', 30);
  const preyId = ['runner', 'ally'].find(id => byData(ctx.view.form, 'pursuitTest', id));
  await roll(ctx, preyId, 50);
  await ctx.set(byData(ctx.view.form, 'pursuitFreeLabel', 'runner'), 'Rivière', 'input');
  await ctx.set(byData(ctx.view.form, 'pursuitFreeSkills', 'runner'), 'Athlétisme', 'input');
  await ctx.fire(byData(ctx.view.form, 'pursuitFreeApply', 'runner'));
  await roll(ctx, 'runner', 1, 'obstacle');
  assert.match(textOf(byData(formOf(ctx, 'obstacle', 'runner'), 'pursuitTestPreview')), /Réussite éclatante \(\+5 DR\)/);
  const who = byData(ctx.view.form, 'pursuitBeneficiary', 'runner');
  assert.deepEqual(who.options.map(row => row.value), ['', 'ally']);
  await ctx.set(who, 'ally');
  assert.match(textOf(byData(ctx.view.form, 'pursuitObstacle', 'runner')), /Avantage à ally/);
}));

test('sans PJ : le MJ désigne le camp qui franchit les Obstacles (D12) ; le tirage au d10 pose un obstacle', () => withDom(async () => {
  const ctx = await setup([fighter('a', 'ennemi'), fighter('b', 'ennemi')]);
  await ctx.set(byData(ctx.view.form, 'pursuitRole', 'a'), 'prey');
  await ctx.set(byData(ctx.view.form, 'pursuitRole', 'b'), 'pursuer');
  const side = byData(ctx.view.form, 'pursuitSceneSide');
  assert.ok(side, 'aucun PJ : le camp est à désigner');
  assert.match(textOf(ctx.view.form), /Aucun PJ dans la poursuite/);
  await roll(ctx, 'b', 30); await roll(ctx, 'a', 50);
  assert.equal(byData(ctx.view.form, 'pursuitObstacle'), null, 'pas d’Obstacle tant que le camp n’est pas désigné');
  await ctx.set(side, 'prey');
  await ctx.fire(byData(ctx.view.form, 'pursuitDraw', 'a'));
  assert.match(textOf(byData(ctx.view.form, 'pursuitObstacle', 'a')), /d10 = \d+/);
}));

test('plusieurs poursuivants : la paire du Test opposé se corrige, les Mouvements aussi', () => withDom(async () => {
  const ctx = await setup();
  await choose(ctx);
  await ctx.set(byData(ctx.view.form, 'pursuitRole', 'foe2'), 'pursuer');
  assert.ok(byData(ctx.view.form, 'pursuitScenePairPursuer'));
  await ctx.set(byData(ctx.view.form, 'pursuitSceneMovement', 'foe2'), '9', 'input');
  assert.ok(byData(ctx.view.form, 'pursuitTest', 'foe2'), 'le plus rapide des poursuivants fait le Test');
  assert.equal(byData(ctx.view.form, 'pursuitTest', 'foe1'), null);
  await ctx.set(byData(ctx.view.form, 'pursuitScenePairPursuer'), 'foe1');
  await ctx.set(byData(ctx.view.form, 'pursuitScenePairPrey'), 'runner');
  assert.ok(byData(ctx.view.form, 'pursuitTest', 'foe1'), 'paire corrigée par le MJ');
}));

test('Mouvement inconnu : signalé près de son champ, aucune issue tant que le MJ ne l’a pas saisi (D22)', () => withDom(async () => {
  const unknown = fighter('foe1', 'ennemi', { caracs: { CC: 50, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40 } });
  const ctx = await setup([fighter('runner', 'pj'), unknown, fighter('foe2', 'ennemi')]);
  await choose(ctx);
  assert.match(textOf(byData(ctx.view.form, 'pursuitMovementIssue', 'foe1')), /Mouvement inconnu/);
  assert.equal(byData(ctx.view.form, 'pursuitTest'), null, 'pas de paire automatique, pas de Test');
  assert.match(textOf(byData(ctx.view.form, 'pursuitSceneStatus')), /foe1.*Mouvement inconnu/);
  await ctx.set(byData(ctx.view.form, 'pursuitSceneMovement', 'foe1'), '4', 'input');
  assert.equal(byData(ctx.view.form, 'pursuitMovementIssue', 'foe1'), null);
  assert.ok(byData(ctx.view.form, 'pursuitTest', 'foe1'));
}));

test('une validation refusée par le Store laisse la modale ouverte avec son motif', () => withDom(async () => {
  const ctx = await setup();
  await choose(ctx);
  await roll(ctx, 'foe1', 95); await roll(ctx, 'runner', 5);
  ctx.store.applyScenePursuit = () => Promise.reject(Object.assign(new Error('La partie a changé ; recalculez la poursuite.'), { userFacing: true }));
  await ctx.fire(byData(ctx.view.form, 'pursuitSceneValidate'));
  assert.match(textOf(byData(ctx.view.form, 'pursuitSceneError')), /recalculez/);
  assert.ok(byData(ctx.view.form, 'pursuitSceneValidate'), 'on peut recommencer');
}));
