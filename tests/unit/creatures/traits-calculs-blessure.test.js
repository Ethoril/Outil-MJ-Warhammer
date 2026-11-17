import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { collectWoundTraitEffects, applyTraitPatches } from '../../../js/core/trait-effects.js';

const person = (id, extra = {}) => ({ id, name: id.toUpperCase(), camp: 'monstres', zone: 'active', hp: 10, maxHp: 10, caracs: { E: 30, Int: 30, FM: 40 }, traits: [], extensions: { v5: {} }, ...extra });
const deepFreeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };
const wound = (args) => collectWoundTraitEffects({ resolutionId: 'res1', round: 1, turnIndex: 2, hpBefore: 10, hpAfter: 6, ...args });

describe('Sang corrosif (CA1)', () => {
  const carrier = person('c', { traits: ['Corrosive Blood'] });
  const e1 = person('e1', { camp: 'pj', caracs: { E: 30 }, armorLocations: { head: 1, body: 1, rightArm: 1, leftArm: 1, rightLeg: 1, leftLeg: 1 } });
  const e2 = person('e2', { camp: 'pj', caracs: { E: 40 } });

  test('une seule demande de d10, même avec plusieurs engagés', () => {
    const out = wound({ target: carrier, participants: [carrier, e1, e2], engagedIds: ['e1', 'e2'] });
    assert.equal(out.requests.length, 1);
    assert.equal(out.requests[0].kind, 'd10');
    assert.equal(out.requests[0].participantId, 'c');
    assert.match(out.requests[0].label, /d10/);
    assert.deepEqual(out.patches, []);
  });

  test('le d10 s\'applique à chaque engagé, réduit par BE et PA, minimum 1', () => {
    const participants = deepFreeze([carrier, e1, e2]);
    const out = wound({ target: carrier, participants, engagedIds: ['e1', 'e2'], traitInputs: { c: { corrosiveBlood: 8 } } });
    assert.equal(out.requests.length, 0);
    const byId = Object.fromEntries(out.patches.map(patch => [patch.participantId, patch.amount]));
    assert.equal(byId.e1, 4, '8 − BE 3 − PA 1');
    assert.equal(byId.e2, 4, '8 − BE 4 − PA 0');
    const low = wound({ target: carrier, participants, engagedIds: ['e1', 'e2'], traitInputs: { c: { corrosiveBlood: 2 } } });
    assert.deepEqual(low.patches.map(patch => patch.amount), [1, 1], 'minimum 1');
    assert.equal(applyTraitPatches(participants, out.patches)[1].hp, 6);
    assert.equal(out.logs.length, 1);
  });

  test('sans engagé, rien ; porteur non blessé, rien', () => {
    assert.deepEqual(wound({ target: carrier, participants: [carrier, e1], engagedIds: [] }).requests, []);
    assert.deepEqual(wound({ target: carrier, participants: [carrier, e1], engagedIds: ['e1'], hpAfter: 10 }).requests, []);
    const down = person('e3', { hp: 0 });
    assert.deepEqual(wound({ target: carrier, participants: [carrier, down], engagedIds: ['e3'] }).requests, [], 'un engagé à 0 Blessure ne compte pas');
  });
});

describe('Infecté (CA2)', () => {
  const biter = person('b', { traits: ['Infected'] });
  const victim = person('v', { camp: 'pj', hp: 6, caracs: { E: 35 } });

  test('Test d\'Endurance +4 DR demandé à la victime', () => {
    const out = wound({ actor: biter, target: victim, participants: [biter, victim] });
    assert.equal(out.requests.length, 1);
    const [request] = out.requests;
    assert.equal(request.kind, 'test');
    assert.equal(request.participantId, 'v');
    assert.equal(request.testTarget.score, 35);
    assert.ok(request.testTarget.slModifiers.some(row => row.amount === 4));
  });

  test('Mort-vivant ou Fabrication : aucune demande', () => {
    for (const nature of ['Undead', 'Construct']) {
      const other = person('v', { traits: [nature], caracs: { E: 35 } });
      const out = wound({ actor: biter, target: other, participants: [biter, other] });
      assert.deepEqual(out.requests, [], nature);
    }
  });

  test('échec saisi : ligne « Plaie purulente », aucun état, aucun patch ; réussite : rien', () => {
    const failed = wound({ actor: biter, target: victim, participants: [biter, victim], traitInputs: { v: { infectedEndurance: { success: false, sl: -2 } } } });
    assert.equal(failed.requests.length, 0);
    assert.equal(failed.logs.length, 1);
    assert.match(failed.logs[0].text, /Plaie purulente/);
    assert.deepEqual(failed.patches, []);
    const ok = wound({ actor: biter, target: victim, participants: [biter, victim], traitInputs: { v: { infectedEndurance: { success: true, sl: 1 } } } });
    assert.deepEqual(ok.logs, []);
  });

  test('aucune blessure infligée : rien', () => {
    assert.deepEqual(wound({ actor: biter, target: victim, participants: [biter, victim], hpAfter: 10 }).requests, []);
  });
});

describe('Bestial (CA4)', () => {
  const beast = (extra = {}) => person('t', { traits: ['Bestial'], hp: 10, maxHp: 10, ...extra });

  test('sous la moitié : ligne « fuite », une seule fois par franchissement', () => {
    const target = beast();
    const crossing = wound({ target, participants: [target], hpBefore: 6, hpAfter: 4 });
    assert.equal(crossing.logs.length, 1);
    assert.match(crossing.logs[0].text, /fuite/);
    assert.deepEqual(crossing.patches, []);
    const already = wound({ target, participants: [target], hpBefore: 4, hpAfter: 2 });
    assert.deepEqual(already.logs, [], 'déjà sous le seuil');
    const above = wound({ target, participants: [target], hpBefore: 10, hpAfter: 7 });
    assert.deepEqual(above.logs, []);
  });

  test('seuil franchi deux fois (soigné puis blessé de nouveau) : une ligne à chaque franchissement', () => {
    const target = beast();
    const first = wound({ target, participants: [target], hpBefore: 6, hpAfter: 3 });
    const second = wound({ target, participants: [target], hpBefore: 8, hpAfter: 4, resolutionId: 'res2' });
    assert.equal(first.logs.length + second.logs.length, 2);
    assert.notEqual(first.logs[0].id, second.logs[0].id);
  });

  test('Territorial, « protège ses petits » ou « acculé » : Frénésie', () => {
    const territorial = beast({ traits: ['Bestial', 'Territorial'] });
    assert.match(wound({ target: territorial, participants: [territorial], hpBefore: 6, hpAfter: 4 }).logs[0].text, /Frénésie/);
    const young = beast({ extensions: { v5: { flags: { protectsYoung: true } } } });
    assert.match(wound({ target: young, participants: [young], hpBefore: 6, hpAfter: 4 }).logs[0].text, /Frénésie/);
    const cornered = beast({ extensions: { v5: { flags: { cornered: true } } } });
    assert.match(wound({ target: cornered, participants: [cornered], hpBefore: 6, hpAfter: 4 }).logs[0].text, /Frénésie/);
  });
});

describe('Affamé (CA5)', () => {
  const eater = person('h', { traits: ['Hungry'], caracs: { E: 30, FM: 40 } });
  const prey = person('p', { camp: 'pj', hp: 0 });

  test('met un vivant à 0 Blessure : Test de Calme +2 DR demandé au porteur', () => {
    const out = wound({ actor: eater, target: prey, participants: [eater, prey], hpBefore: 3, hpAfter: 0, killed: true });
    assert.equal(out.requests.length, 1);
    const [request] = out.requests;
    assert.equal(request.participantId, 'h');
    assert.equal(request.kind, 'test');
    assert.ok(request.testTarget.slModifiers.some(row => row.amount === 2));
  });

  test('échec saisi : tour perdu ; réussite : rien', () => {
    const failed = wound({ actor: eater, target: prey, participants: [eater, prey], hpBefore: 3, hpAfter: 0, killed: true, traitInputs: { h: { hungryCalm: { success: false, sl: -1 } } } });
    assert.equal(failed.patches.length, 1);
    assert.equal(failed.patches[0].type, 'lost-turn');
    assert.equal(failed.patches[0].participantId, 'h');
    assert.deepEqual(failed.patches[0].since, { round: 1, turnIndex: 2 });
    assert.ok(applyTraitPatches([eater, prey], failed.patches)[0].extensions.v5.lostTurn);
    const ok = wound({ actor: eater, target: prey, participants: [eater, prey], hpBefore: 3, hpAfter: 0, killed: true, traitInputs: { h: { hungryCalm: { success: true, sl: 2 } } } });
    assert.deepEqual(ok.patches, []);
  });

  test('blessure qui ne tue pas, ou victime non vivante : aucune demande', () => {
    assert.deepEqual(wound({ actor: eater, target: person('p', { hp: 2 }), participants: [eater], hpBefore: 6, hpAfter: 2 }).requests, []);
    const undead = person('p', { traits: ['Undead'], hp: 0 });
    assert.deepEqual(wound({ actor: eater, target: undead, participants: [eater, undead], hpBefore: 3, hpAfter: 0, killed: true }).requests, []);
  });
});

describe('sans Trait', () => {
  test('un participant sans ces Traits ne produit rien', () => {
    const a = person('a');
    const b = person('b');
    const out = wound({ actor: a, target: b, participants: [a, b], engagedIds: ['a'] });
    assert.deepEqual(out, { plans: [], requests: [], patches: [], logs: [], unresolved: [] });
  });
});
