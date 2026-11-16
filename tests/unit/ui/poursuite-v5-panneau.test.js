// Interface en combat de la poursuite V5 (docs/specs/poursuite-v5, lot L5) : lancement depuis le panneau du Brisé, assistant des Tests,
// fin de poursuite, attaques gratuites de la fuite engagée. Le DOM est un faux arbre ; le Store est réel (rien de la règle n'est simulé).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { listEngagements } from '../../../js/core/engagements.js';
import { createV5PursuitPanel, defaultPursuitRoles, pursuitStartInput } from '../../../js/ui/v5-pursuit-panel.js';
import { createV5BrokenEscapePanel, brokenEscapeFacts } from '../../../js/ui/v5-broken-escape-panel.js';

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
// Ordre du Tour : runner (60, Brisé), foe1 (40), foe2 (30).
async function setup({ engaged = false, friend = false, score = 50, runner = {}, foe1 = {} } = {}) {
  const store = createStore({ storage: null, persistence: memoryPersistence() }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'combat-l5' } },
    combat: { round: 1, currentActorId: 'runner', order: ['runner', 'foe1', 'foe2', ...(friend ? ['friend'] : [])], participants: [
      fighter('runner', 'pj', { initiative: 60, skills: [athletics(score)], states: [{ id: 'b1', key: 'brise', name: 'Brisé', level: 1 }], ...runner }), fighter('foe1', 'ennemi', { initiative: 40, ...foe1 }), fighter('foe2', 'ennemi', { initiative: 30 }),
      ...(friend ? [fighter('friend', 'pj', { initiative: 20 })] : [])] } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  if (engaged) { await store.engageParticipants('runner', 'foe1'); await store.engageParticipants('runner', 'foe2'); }
  const played = [], view = { broken: null, pursuit: null };
  const pursuitPanel = createV5PursuitPanel({ Store: store, refresh: () => draw() });
  const brokenPanel = createV5BrokenEscapePanel({ Store: store, refresh: () => draw(), pursuitPanel, onPlayFreeAttack: (enemyId, brokenId) => played.push([enemyId, brokenId]) });
  const draw = () => { const people = store.listParticipants(); view.broken = brokenPanel.render(people); view.pursuit = pursuitPanel.render(people); };
  draw();
  const fire = async (el, type = 'click') => { await el.listeners[type](); await store.whenIdle(); };
  return { store, view, draw, played, fire };
}
const seeFleeing = async ({ view, fire }) => {
  const select = byData(view.broken, 'brokenEscapeVisibility');
  select.value = 'true';
  await fire(select, 'change');
};

test('faits de la fuite : les adversaires cochés « a dépensé son Élan » partent au moteur, ceux qui ne sont plus engagés non', () => {
  const draft = { before: true, after: true, engagement: 'selected', engaged: ['orc', 'gob'], mode: 'walk', engagedConfirmed: true, freeAttacksResolved: true, spentMomentum: ['orc', 'ogre'] };
  assert.deepEqual(brokenEscapeFacts(draft, 'flee').freeAttackSpentMomentumIds, ['orc']);
  assert.equal('freeAttackSpentMomentumIds' in brokenEscapeFacts({ ...draft, spentMomentum: [] }, 'flee'), false);
});

test('lancement : rôles proposés et entrée du Store, un Mouvement vide reste celui de l’outil', () => {
  const people = [fighter('runner', 'pj'), fighter('foe1', 'ennemi'), fighter('ally', 'pj')];
  assert.deepEqual(defaultPursuitRoles(people[0], people), { runner: 'prey', foe1: 'pursuer', ally: '' });
  const input = pursuitStartInput({ roles: { runner: 'prey', foe1: 'pursuer', foe2: 'pursuer', ally: '' }, movement: { foe1: '', foe2: '8' }, side: '', pair: { pursuerId: '', preyId: '' } });
  assert.deepEqual(input, { preyIds: ['runner'], pursuerIds: ['foe1', 'foe2'], movement: { foe2: 8 } });
  assert.deepEqual(pursuitStartInput({ roles: { a: 'prey', b: 'pursuer' }, movement: {}, side: 'pursuers', pair: { pursuerId: 'b', preyId: 'a' } }),
    { preyIds: ['a'], pursuerIds: ['b'], obstacleSide: 'pursuers', pair: { pursuerId: 'b', preyId: 'a' } });
});

test('« Lancer la poursuite » : absent tant que le fuyard n’est pas visible, puis Mouvement corrigé et poursuite lancée (CA12)', () => withDom(async () => {
  const ctx = await setup();
  assert.equal(byData(ctx.view.broken, 'pursuitStart'), null, 'rien n’est deviné : pas de visibilité confirmée, pas de bouton');
  await seeFleeing(ctx);
  const start = byData(ctx.view.broken, 'pursuitStart', 'runner');
  assert.ok(start, 'visible d’au moins un ennemi : le bouton apparaît');
  assert.equal(textOf(start), 'Lancer la poursuite');
  const movement = byData(ctx.view.broken, 'pursuitLaunchMovement', 'foe2');
  movement.value = '8';
  await ctx.fire(movement, 'input');
  await ctx.fire(byData(ctx.view.broken, 'pursuitStart', 'runner'));
  const pursuit = ctx.store.getPursuit();
  assert.equal(pursuit.status, 'active');
  assert.deepEqual([pursuit.preyIds, pursuit.pursuerIds], [['runner'], ['foe1', 'foe2']]);
  assert.equal(pursuit.movement.foe2, 8);
  assert.equal(pursuit.pair.pursuerId, 'foe2', 'le plus rapide poursuivant est apparié au fuyard');
  assert.equal(byData(ctx.view.broken, 'pursuitStart'), null, 'plus de bouton une fois lancée');
  assert.ok(byData(ctx.view.pursuit, 'pursuitPanel'), 'l’assistant s’affiche');
}));

test('poursuite déjà en cours : plus de bouton de lancement', () => withDom(async () => {
  const ctx = await setup();
  await seeFleeing(ctx);
  await ctx.store.startPursuit({ preyIds: ['runner'], pursuerIds: ['foe1'], visibleToAnyEnemy: true });
  ctx.draw();
  assert.equal(byData(ctx.view.broken, 'pursuitStart'), null);
}));

test('assistant : le Test de poursuite du Tour se calcule puis s’applique, consomme l’Action, et le formulaire disparaît (CA13)', () => withDom(async () => {
  const ctx = await setup();
  await seeFleeing(ctx);
  await ctx.fire(byData(ctx.view.broken, 'pursuitStart', 'runner'));
  const form = byData(ctx.view.pursuit, 'pursuitTest', 'runner');
  assert.ok(form, 'runner a le Tour et fait partie de la paire');
  assert.equal(form.dataset.pursuitTestKind, 'pursuit');
  assert.equal(byData(form, 'pursuitTestApply').disabled, true, 'pas d’aperçu : Appliquer reste inactif');
  assert.deepEqual(byData(form, 'pursuitTestSkill').options.map(row => row.value), ['Athlétisme', 'Conduite', 'Chevaucher', 'Natation']);
  const roll = byData(form, 'pursuitTestRoll');
  roll.value = '30';
  await ctx.fire(roll, 'input');
  await ctx.fire(byData(ctx.view.pursuit, 'pursuitTestCalculate', 'runner'));
  const preview = byData(ctx.view.pursuit, 'pursuitTestPreview', 'runner');
  assert.match(textOf(preview), /Aperçu : aucun effet appliqué/);
  assert.match(textOf(preview), /Athlétisme 50 · jet 30 · \+2 DR/);
  assert.equal(ctx.store.getPursuit().opposed.prey, null, 'un aperçu n’écrit rien');
  await ctx.fire(byData(ctx.view.pursuit, 'pursuitTestApply', 'runner'));
  assert.equal(ctx.store.getPursuit().opposed.prey.sl, 2);
  assert.match(ctx.store.previewPursuitTest({ participantId: 'runner', skill: 'Athlétisme', roll: 30 }).error, /Test de poursuite déjà joué|Action/);
  assert.equal(byData(ctx.view.pursuit, 'pursuitTest', 'runner'), null);
  assert.match(textOf(ctx.view.pursuit), /runner \(fuyard\) : Test de Athlétisme, jet 30/);
  // Le Brisé fuyard qui a joué son Test peut finir son Tour (D20) : le panneau le dit.
  assert.match(textOf(ctx.view.broken), /vaut pour la fuite et le Sprint/);
}));

test('Mouvement nul : signalé près de son champ, au lancement comme dans l’assistant, la paire attend le MJ (D22)', () => withDom(async () => {
  const ctx = await setup({ foe1: { states: [{ id: 's1', key: 'surpris', name: 'Surpris', level: 1 }] } });
  await seeFleeing(ctx);
  assert.match(textOf(byData(ctx.view.broken, 'pursuitMovementIssue', 'foe1')), /Mouvement nul/);
  assert.equal(byData(ctx.view.broken, 'pursuitMovementIssue', 'foe2'), null);
  await ctx.fire(byData(ctx.view.broken, 'pursuitStart', 'runner'));
  assert.equal(ctx.store.getPursuit().status, 'active', 'la poursuite ne se clôt pas au lancement');
  assert.match(textOf(byData(ctx.view.pursuit, 'pursuitMovementIssue', 'foe1')), /Mouvement nul/);
  assert.match(textOf(ctx.view.pursuit), /paire en attente des Mouvements/);
  assert.equal(byData(ctx.view.pursuit, 'pursuitTest', 'runner'), null, 'pas de Test sans paire');
  // D21 : le fuyard Brisé d'une poursuite en cours n'a plus à fuir, Test fait ou non.
  assert.match(textOf(ctx.view.broken), /Test fait ou non/);
  const movement = byData(ctx.view.pursuit, 'pursuitMovement', 'foe1');
  movement.value = '4';
  await ctx.fire(movement, 'change');
  assert.equal(byData(ctx.view.pursuit, 'pursuitMovementIssue', 'foe1'), null);
  assert.ok(byData(ctx.view.pursuit, 'pursuitTest', 'runner'), 'paire établie : le Test du fuyard se joue');
}));

test('Bon marcheur : le Test de poursuite pose la question du terrain, la réponse donne le bonus (CA11)', () => withDom(async () => {
  const ctx = await setup({ runner: { talents: [{ id: 'talent-striding-gait', status: 'resolved', rank: 1, specialization: 'Forêt' }] } });
  await seeFleeing(ctx);
  await ctx.fire(byData(ctx.view.broken, 'pursuitStart', 'runner'));
  const roll = byData(ctx.view.pursuit, 'pursuitTestRoll', 'runner');
  roll.value = '30';
  await ctx.fire(roll, 'input');
  await ctx.fire(byData(ctx.view.pursuit, 'pursuitTestCalculate', 'runner'));
  const terrain = byData(ctx.view.pursuit, 'pursuitTestChoice', 'terrain');
  assert.ok(terrain, 'la question du terrain a son champ');
  assert.deepEqual(terrain.options.map(row => row.value), ['', 'Forêt', 'none']);
  terrain.value = 'Forêt';
  await ctx.fire(terrain, 'change');
  assert.match(textOf(byData(ctx.view.pursuit, 'pursuitTestPreview', 'runner')), /jet 30 · \+4 DR/);
  assert.equal(byData(ctx.view.pursuit, 'pursuitTestChoice', 'terrain').value, 'Forêt', 'la réponse reste corrigeable');
  const plain = await setup();
  await seeFleeing(plain);
  await plain.fire(byData(plain.view.broken, 'pursuitStart', 'runner'));
  await plain.fire(byData(plain.view.pursuit, 'pursuitTestCalculate', 'runner'));
  assert.equal(byData(plain.view.pursuit, 'pursuitTestChoice'), null, 'sans le talent, aucune question');
}));

test('assistant : un jet manquant bloque l’aperçu avec son motif', () => withDom(async () => {
  const ctx = await setup();
  await seeFleeing(ctx);
  await ctx.fire(byData(ctx.view.broken, 'pursuitStart', 'runner'));
  await ctx.fire(byData(ctx.view.pursuit, 'pursuitTestCalculate', 'runner'));
  assert.match(textOf(byData(ctx.view.pursuit, 'pursuitTestPreview', 'runner')), /jet d100/);
  assert.equal(byData(ctx.view.pursuit, 'pursuitTestApply', 'runner').disabled, true);
}));

test('fin « rattrapé » : « Engager au plateau » engage le fuyard avec ses poursuivants ; ne rien cliquer ne change rien (CA18)', () => withDom(async () => {
  const ctx = await setup();
  await seeFleeing(ctx);
  await ctx.fire(byData(ctx.view.broken, 'pursuitStart', 'runner'));
  await ctx.store.endPursuit({ reason: 'gm', kind: 'caught' });
  ctx.draw();
  const outcome = byData(ctx.view.pursuit, 'pursuitOutcome');
  assert.match(textOf(outcome), /Fuyard rattrapé/);
  assert.match(textOf(outcome), /Abandon du MJ/);
  assert.equal(byData(ctx.view.pursuit, 'pursuitEndApply', 'remove'), null, 'un fuyard rattrapé ne se retire pas');
  assert.deepEqual(listEngagements({ participants: ctx.store.listParticipants() }), [], 'rien n’est engagé tant qu’on ne clique pas');
  await ctx.fire(byData(ctx.view.pursuit, 'pursuitEndApply', 'engage'));
  assert.equal(listEngagements({ participants: ctx.store.listParticipants() }).length, 2);
  ctx.draw();
  assert.equal(byData(ctx.view.pursuit, 'pursuitEndApply', 'engage').disabled, true, 'déjà engagés');
}));

test('fin « échappé » : « Retirer de la rencontre » retire le fuyard', () => withDom(async () => {
  const ctx = await setup();
  await seeFleeing(ctx);
  await ctx.fire(byData(ctx.view.broken, 'pursuitStart', 'runner'));
  const abandon = byData(ctx.view.pursuit, 'pursuitAbandonKind');
  abandon.value = 'escaped';
  await ctx.fire(abandon, 'change');
  await ctx.fire(byData(ctx.view.pursuit, 'pursuitAbandon'));
  assert.equal(ctx.store.getPursuit().status, 'ended');
  const remove = byData(ctx.view.pursuit, 'pursuitEndApply', 'remove');
  assert.equal(textOf(remove), 'Retirer de la rencontre');
  assert.equal(byData(ctx.view.pursuit, 'pursuitEndApply', 'engage'), null);
  await ctx.fire(remove);
  assert.equal(ctx.store.listParticipants().some(row => row.id === 'runner'), false);
}));

test('abandon sans issue : aucun bouton de fin', () => withDom(async () => {
  const ctx = await setup();
  await seeFleeing(ctx);
  await ctx.fire(byData(ctx.view.broken, 'pursuitStart', 'runner'));
  await ctx.fire(byData(ctx.view.pursuit, 'pursuitAbandon'));
  assert.match(textOf(byData(ctx.view.pursuit, 'pursuitOutcome')), /sans issue/);
  assert.equal(byData(ctx.view.pursuit, 'pursuitEndApply'), null);
}));

test('Obstacles : facteurs cochés par l’outil et modifiables, obstacle tiré ou libre, Test d’Obstacle du Tour (CA10, D13)', () => withDom(async () => {
  const ctx = await setup();
  await seeFleeing(ctx);
  await ctx.fire(byData(ctx.view.broken, 'pursuitStart', 'runner'));
  // Test de poursuite de la paire : le fuyard à son Tour, le poursuivant (foe1) au sien ; l'écart de 3 DR ne tranche pas.
  await ctx.store.applyPursuitTest(ctx.store.previewPursuitTest({ participantId: 'runner', skill: 'Athlétisme', roll: 30 }));
  await ctx.store.nextTurn();
  await ctx.store.applyPursuitTest(ctx.store.previewPursuitTest({ participantId: 'foe1', skill: 'Athlétisme', roll: 60 }));
  ctx.draw();
  const factors = ['won', 'speed', 'terrain'].map(key => byData(ctx.view.pursuit, 'pursuitFactor', key));
  assert.ok(factors.every(Boolean), 'trois cases');
  const checked = factors.map(el => el.checked);
  assert.equal(checked[2], false, 'le terrain reste au MJ');
  factors[2].checked = true;
  await ctx.fire(factors[2], 'change');
  assert.equal(ctx.store.getPursuit().factors.terrain, true);
  const draw = byData(ctx.view.pursuit, 'pursuitDraw', 'runner');
  assert.ok(draw, 'le PJ fuyard rencontre un Obstacle');
  const free = byData(ctx.view.pursuit, 'pursuitFreeLabel', 'runner');
  free.value = 'Un mur de tonneaux';
  await ctx.fire(free, 'input');
  const skills = byData(ctx.view.pursuit, 'pursuitFreeSkills', 'runner');
  skills.value = 'Athlétisme, Esquive';
  await ctx.fire(skills, 'input');
  await ctx.fire(byData(ctx.view.pursuit, 'pursuitFreeApply', 'runner'));
  const row = ctx.store.getPursuit().obstacles.find(item => item.participantId === 'runner');
  assert.equal(row.obstacle.free, true);
  assert.deepEqual(row.obstacle.skills.map(skill => skill.label), ['Athlétisme', 'Esquive']);
  assert.match(textOf(byData(ctx.view.pursuit, 'pursuitObstacle', 'runner')), /Un mur de tonneaux/);
}));

test('attaques gratuites : une ligne par adversaire engagé, jouer ouvre son attaque, passer la clôt, la case se coche seule (CA21-CA23)', () => withDom(async () => {
  const ctx = await setup({ engaged: true });
  const rows = ['foe1', 'foe2'].map(id => byData(ctx.view.broken, 'brokenEscapeFreeAttack', id));
  assert.ok(rows.every(Boolean));
  assert.equal(textOf(rows[0]), 'Jouer l’attaque gratuite');
  await ctx.fire(rows[0]);
  assert.deepEqual(ctx.played, [['foe1', 'runner']], 'le panneau demande d’ouvrir l’attaque de foe1 contre le Brisé');
  const resolved = () => byData(ctx.view.broken, 'brokenEscapeConfirm', 'freeAttacksResolved');
  assert.equal(resolved().checked, false);
  await ctx.fire(byData(ctx.view.broken, 'brokenEscapeFreeAttackPass', 'foe1'));
  assert.equal(resolved().checked, false, 'une seule attaque passée : pas encore complet');
  await ctx.fire(byData(ctx.view.broken, 'brokenEscapeFreeAttackPass', 'foe2'));
  assert.equal(ctx.store.getFleeFreeAttacks('runner', ['foe1', 'foe2']).complete, true);
  assert.equal(resolved().checked, true, 'cochée seule quand tous ont joué ou passé');
  assert.match(textOf(byData(ctx.view.broken, 'brokenEscapeFreeAttacks', 'runner')), /passée/);
  resolved().checked = false;
  await ctx.fire(resolved(), 'change');
  assert.equal(resolved().checked, false, 'le MJ peut la décocher');
}));

test('attaques gratuites : « a dépensé son Élan » alimente freeAttackSpentMomentumIds de l’aperçu de la fuite (CA22)', () => withDom(async () => {
  const ctx = await setup({ engaged: true });
  await ctx.fire(byData(ctx.view.broken, 'brokenEscapeFreeAttackPass', 'foe1'));
  await ctx.fire(byData(ctx.view.broken, 'brokenEscapeFreeAttackPass', 'foe2'));
  const spent = byData(ctx.view.broken, 'brokenEscapeSpentMomentum', 'foe2');
  assert.ok(spent);
  spent.checked = true;
  await ctx.fire(spent, 'change');
  const choose = async (key, value) => { const select = all(ctx.view.broken, el => el.dataset.brokenEscapeField === key || el.dataset.brokenEscapeVisibility === key)[0]; select.value = value; await ctx.fire(select, 'change'); };
  await choose('broken-escape', 'true');
  await choose('move-mode', 'walk');
  await choose('visible-after', 'true');
  const confirm = byData(ctx.view.broken, 'brokenEscapeConfirm', 'engagedConfirmed');
  confirm.checked = true;
  await ctx.fire(confirm, 'change');
  const calls = [], original = ctx.store.previewBrokenEscape;
  ctx.store.previewBrokenEscape = input => { calls.push(input); return original.call(ctx.store, input); };
  await ctx.fire(byData(ctx.view.broken, 'brokenEscapeCalculate', 'runner'));
  assert.deepEqual(calls[0].facts.freeAttackSpentMomentumIds, ['foe2']);
  assert.equal(calls[0].facts.freeAttacksResolved, true);
  assert.deepEqual(calls[0].facts.engagedEnemyIds, ['foe1', 'foe2']);
}));

test('Réussite éclatante à un Obstacle : le MJ choisit le bénéficiaire de l’Avantage parmi les alliés, et le Test d’Obstacle s’applique (D11, D19)', () => withDom(async () => {
  const ctx = await setup({ friend: true, score: 70 });
  await seeFleeing(ctx);
  const role = byData(ctx.view.broken, 'pursuitRole', 'friend');
  role.value = 'prey';
  await ctx.fire(role, 'change');
  await ctx.fire(byData(ctx.view.broken, 'pursuitStart', 'runner'));
  await ctx.store.applyPursuitTest(ctx.store.previewPursuitTest({ participantId: 'runner', skill: 'Athlétisme', roll: 30 }));
  await ctx.store.nextTurn();
  await ctx.store.applyPursuitTest(ctx.store.previewPursuitTest({ participantId: 'foe1', skill: 'Athlétisme', roll: 60 }));
  await ctx.store.setPursuitObstacle('runner', { label: 'Mur de tonneaux', skills: ['Athlétisme'] });
  for (let turn = 0; turn < 3; turn += 1) await ctx.store.nextTurn();
  ctx.draw();
  const form = byData(ctx.view.pursuit, 'pursuitTest', 'runner');
  assert.equal(form.dataset.pursuitTestKind, 'obstacle');
  assert.match(textOf(form), /Mur de tonneaux/);
  const roll = byData(form, 'pursuitTestRoll');
  roll.value = '5';
  await ctx.fire(roll, 'input');
  await ctx.fire(byData(ctx.view.pursuit, 'pursuitTestCalculate', 'runner'));
  // Brisé : le calcul commun demande si le Test sert à fuir ; la question s'affiche et la réponse relance l'aperçu.
  const question = all(ctx.view.pursuit, el => el.tagName === 'select' && /fuir ou se cacher/.test(el.attrs['aria-label'] || ''))[0];
  assert.ok(question, 'la question d’État a son champ');
  question.value = 'false';
  await ctx.fire(question, 'change');
  assert.match(textOf(byData(ctx.view.pursuit, 'pursuitTestPreview', 'runner')), /Réussite éclatante \(\+5 DR\)/);
  const who = byData(ctx.view.pursuit, 'pursuitBeneficiary', 'runner');
  assert.deepEqual(who.options.map(row => row.value), ['', 'friend']);
  who.value = 'friend';
  await ctx.fire(who, 'change');
  await ctx.fire(byData(ctx.view.pursuit, 'pursuitTestApply', 'runner'));
  const pursuit = ctx.store.getPursuit();
  assert.equal(pursuit.obstacles[0].beneficiaryId, 'friend');
  assert.equal(pursuit.status, 'ended');
  assert.equal(pursuit.outcome.kind, 'escaped');
  assert.deepEqual(['runner', 'friend'].map(id => textOf(byData(ctx.view.pursuit, 'pursuitEndPrey', id))), ['Retirer de la rencontre : runner', 'Retirer de la rencontre : friend']);
}));
