import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { renderFicheDetails } from '../../../js/ui/fiche-details.js';

// C40 (G-DIV-15) : le talent Sans peur posé par la Dévotion de la Guerrière porte la spécialisation choisie
// (Humain) ; la fiche du bénéficiaire doit la montrer, pas seulement « Sans peur · rang 1 ».
const DEVOTION = 'divine:miracle:devotion-de-la-guerriere';
const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const actor = (id, initiative, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: ['Myrmidia', 'Ranald'].map(specialization => ({ id: 'talent-invoke', status: 'resolved', rank: 1, specialization })),
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.className = ''; this.dataset = {}; this._text = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => typeof child === 'string' ? child : child.textContent).join(' '); }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); }
  setAttribute() {}
}

test('C40 la fiche du bénéficiaire de la Dévotion de la Guerrière montre la spécialisation (Humain) du talent Sans peur', async () => {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [actor('priest', 60), actor('ally', 30)] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  const preview = store.previewDivineExecution(DEVOTION, { actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    expiry: { phase: 'endOfTurn', round: 4, actorId: 'priest' }, facts: { targets: { ally: { ally: true, withinRange: true } } }, talent: { specialization: 'Humain' } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  assert.equal((await store.applyDivineExecution(DEVOTION, { preview })).ready, true);
  const ally = store.listParticipants().find(row => row.id === 'ally');
  const fearless = ally.talents.find(row => row.divineEffectId);
  assert.equal(fearless?.specialization, 'Humain', 'précondition : la donnée porte la spécialisation');
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: tag => new Element(tag) };
  try {
    const text = renderFicheDetails(ally).textContent;
    const row = text.match(/Sans peur · rang.{0,60}/)?.[0] || '';
    assert.match(row, /Humain/, `la ligne du talent doit citer la spécialisation. Ligne : ${JSON.stringify(row)}`);
  } finally { globalThis.document = originalDocument; }
});
