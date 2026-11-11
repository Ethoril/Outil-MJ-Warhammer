// Lot 4 · C29 (G-EMP-2, G-EMP-1) : Immobiliser avec une action « Force » de l'attaquant et la Force adverse choisie
// dans la liste des défenses (option « F · 35 ») doit être reconnu comme deux Tests opposés de Force.
// Phase de reproduction : échoue aujourd'hui (js/core/resolution.js:309-313 ne lit que le nom de compétence ou le libellé).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { defenseOptions } from '../../../js/ui/resolution-panel.js';

const clone = structuredClone;
const memory = () => { let saved; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const fighter = (id, bagarre, force) => ({ id, name: id, kind: 'PJ', camp: id === 'holder' ? 'pj' : 'npc', zone: 'active', hp: 20, maxHp: 20,
  caracs: { CC: 50, F: 35, E: 30, Ag: 30 }, states: [], skills: [{ id: bagarre, name: 'Bagarre', total: 50 }, { id: force, name: 'Force', total: 40 }],
  equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } } });
const grabInput = { actorId: 'holder', targetId: 'held',
  action: { id: 'act-bh', type: 'attack', attr: 'CC', base: 50, damage: 4, extensions: { fiche: { skillId: 'bh' } } }, roll: 25,
  defense: { type: 'skill', attr: 'CC', base: 50, roll: 70, label: 'Bagarre', v5: { kind: 'melee', choice: 'keep', context: { skillId: 'bt' } } },
  v5: { kind: 'melee', choice: 'keep', context: { skillId: 'bh', grappleDeclared: true } } };

async function grappledFixture() {
  const store = createStore({ storage: null, persistence: memory() });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [],
    combat: { round: 1, currentActorId: 'holder', order: ['holder', 'held'], participants: [fighter('holder', 'bh', 'fh'), fighter('held', 'bt', 'ft')] } });
  const grab = store.previewResolution(grabInput);
  assert.equal(grab.grapple.status, 'grappled');
  assert.equal((await store.applyResolution(grab)).status, 'applied');
  await store.setRoundTurn(2, 'holder');
  return store;
}
const immobilize = (store, { action, defense }) => store.previewResolution({ actorId: 'holder', targetId: 'held', action, roll: 25, defense,
  v5: { kind: 'test', choice: 'keep', context: { grappleAction: 'immobilize' } } });

describe('C29 Empoignade : Test de Force saisi à la main', () => {
  test('action « Force » 40 (Opposition, sans compétence liée) contre la Force adverse choisie dans les défenses (F · 35), jets 25 contre 65', async () => {
    const store = await grappledFixture();
    const held = store.listParticipants().find(row => row.id === 'held');
    const option = defenseOptions(held, []).find(row => row.value === 'F');
    assert.ok(option, 'la Force adverse est proposée');
    assert.equal(option.label, 'F · 35');
    const preview = immobilize(store, {
      action: { id: 'force-manual', type: 'opposition', name: 'Force', attr: 'F', base: 40 },
      defense: { type: option.type || 'skill', attr: option.attr, base: option.base, roll: 65, label: option.label, extensions: option.extensions, v5: { kind: 'test', choice: 'keep' } }
    });
    assert.deepEqual(preview.unresolved.filter(row => /Empoignade/.test(row)), [], 'les deux jets de Force sont reconnus');
    assert.equal(preview.grapple.status, 'ready', JSON.stringify(preview.grapple));
  });

  test('référence : avec les compétences Force enregistrées des deux côtés, Immobiliser est prêt (comportement attendu identique)', async () => {
    const store = await grappledFixture();
    const preview = immobilize(store, {
      action: { id: 'force-skill', type: 'test', attr: 'F', base: 40, extensions: { fiche: { skillId: 'fh' } } },
      defense: { type: 'skill', attr: 'F', base: 40, roll: 65, label: 'Force', v5: { kind: 'test', choice: 'keep', context: { skillId: 'ft' } } }
    });
    assert.equal(preview.grapple.status, 'ready', JSON.stringify(preview.grapple));
  });

  test('un test qui n’est pas de Force (Bagarre contre Bagarre) reste refusé', async () => {
    const store = await grappledFixture();
    const preview = immobilize(store, {
      action: { id: 'bag', type: 'attack', attr: 'CC', base: 50, damage: 4, extensions: { fiche: { skillId: 'bh' } } },
      defense: { type: 'skill', attr: 'CC', base: 50, roll: 65, label: 'Bagarre', v5: { kind: 'melee', choice: 'keep', context: { skillId: 'bt' } } }
    });
    assert.ok(preview.unresolved.some(row => /deux Tests opposés de Force/.test(row)));
  });

});
