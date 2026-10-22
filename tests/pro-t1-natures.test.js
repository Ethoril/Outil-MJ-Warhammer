import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { parseNatureTrait, natureProtection, willpowerBase, natureReminders } from '../js/core/creature-natures.js';
import { previewMagicProtection, attackNature, targetNatureTags } from '../js/core/v5-magic-combat.js';
import { fearAction } from '../js/core/v5-talent-psychology.js';

const library = JSON.parse(readFileSync(new URL('../js/data/bestiary/L06.json', import.meta.url), 'utf8')).profiles;
const build = id => buildParticipantFromBestiary(id, { library });
const mundane = attackNature({ ranged: false, magical: false });
const magic = attackNature({ ranged: false, magical: true, spell: true });
const synthetic = traits => ({ id: 'x', name: 'X', traits });

test('T1 lecture des Traits de nature : nom canonique anglais ou français, précision entre parenthèses', () => {
  assert.deepEqual(parseNatureTrait('Daemonic (8+)'), { key: 'daemonic', name: 'Daemonic', detail: '8+' });
  assert.equal(parseNatureTrait('Éthéré').key, 'ethereal');
  assert.equal(parseNatureTrait('Insensible à la douleur').key, 'painless');
  assert.equal(parseNatureTrait('Artificiel').key, 'construct');
  assert.equal(parseNatureTrait('Frenzy'), null);
});

test('T1 Éthéré (Fantôme E0-P-096) — une attaque non magique ne blesse pas, une attaque magique si', () => {
  const ghost = build('E0-P-096');
  assert.equal(previewMagicProtection(ghost, 6, { nature: mundane }).amount, 0);
  assert.equal(previewMagicProtection(ghost, 6, { nature: mundane }).immune, true);
  assert.equal(previewMagicProtection(ghost, 6, { nature: magic }).amount, 6);
  assert.deepEqual(targetNatureTags(ghost, { ranged: false }), ['magical']);
});

test('T1 Démoniaque (Sanguinaire E0-P-107, 8+) — d10 au seuil annule un coup non magique, pas un sort', () => {
  const daemon = build('E0-P-107');
  assert.equal(natureProtection(daemon).wards[0].threshold, 8);
  const missing = previewMagicProtection(daemon, 7, { nature: mundane });
  assert.equal(missing.ready, false);
  assert.match(missing.error, /8\+/);
  assert.equal(previewMagicProtection(daemon, 7, { nature: mundane, wardRoll: 8 }).amount, 0);
  assert.equal(previewMagicProtection(daemon, 7, { nature: mundane, wardRoll: 7 }).amount, 7);
  assert.equal(previewMagicProtection(daemon, 7, { nature: magic }).amount, 7);
});

test('T1 Protection (Ward) — toute attaque, indice du Trait', () => {
  const warded = synthetic(['Ward (9+)']);
  assert.equal(previewMagicProtection(warded, 5, { nature: magic, wardRoll: 9 }).wardSaved, true);
  assert.equal(previewMagicProtection(warded, 5, { nature: magic, wardRoll: 8 }).amount, 5);
  assert.equal(previewMagicProtection(synthetic(['Protection (3)']), 5, { nature: mundane, wardRoll: 3 }).amount, 0);
});

test('T1 Immunité — feu et froid automatisés ; type non géré laissé en rappel', () => {
  const fireproof = synthetic(['Immunity (Fire, Poison)']);
  assert.equal(previewMagicProtection(fireproof, 5, { nature: attackNature({ ranged: false, magical: false, fire: true }) }).amount, 0);
  assert.equal(previewMagicProtection(fireproof, 5, { nature: attackNature({ ranged: false, magical: false, fire: false }) }).amount, 5);
  assert.ok(natureProtection(fireproof).reminders.some(text => /Poison/i.test(text)));
});

test('T1 Artificiel — Endurance remplace Volonté quand Volonté manque ; Volonté imprimée jamais remplacée', () => {
  const skeleton = build('E0-P-093');
  assert.equal(skeleton.caracs.FM == null || skeleton.caracs.FM === 0, true);
  assert.deepEqual(willpowerBase(skeleton), { value: skeleton.caracs.E, replacedBy: 'E' });
  assert.equal(willpowerBase({ traits: ['Construct'], caracs: { FM: 25, E: 40 } }).value, 25);
  assert.equal(willpowerBase({ traits: [], caracs: { E: 40 } }).value, null);
  assert.equal(fearAction({ ...skeleton, states: [] }), null);
});

test('T1 rappels — besoins vitaux, Insensible à la douleur, Bouclier', () => {
  const reminders = natureReminders(synthetic(['Undead', 'Painless', 'Shield (2)']));
  assert.ok(reminders.some(text => /boire, manger/.test(text)));
  assert.ok(reminders.some(text => /douleur/.test(text)));
  assert.ok(reminders.some(text => /Bouclier/.test(text)));
  assert.deepEqual(natureReminders(synthetic(['Frenzy'])), []);
});
