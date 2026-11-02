import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildParticipantFromBestiary } from '../../../js/core/bestiary-profiles.js';
import l07 from '../../../js/data/bestiary/L07.json' with { type: 'json' };

// C38 (G-DEC-3) : les attaques naturelles importées du bestiaire L07 doivent avoir un score (CC / CT du profil),
// comme celles de L06 ; aujourd'hui « base » reste vide parce que les attaques L07 n'ont pas de « value ».
const library = l07.profiles;
const build = id => buildParticipantFromBestiary(id, { library, zone: 'bench', idFactory: () => 'c38' });

test('C38 Jaguar L07 : Bite et Claws héritent du score CC 55 de la carte', () => {
  const jaguar = build('E0-P-294');
  assert.equal(jaguar.caracs.CC, 55);
  const attacks = jaguar.actions.filter(action => action.type === 'attack');
  assert.deepEqual(attacks.map(action => action.name), ['Bite', 'Claws']);
  for (const action of attacks) assert.equal(action.base, 55, `${action.name} : score attendu 55, obtenu ${JSON.stringify(action.base)}`);
});

test('C38 L07 : aucune attaque importée n’a un score vide quand la caractéristique existe sur le profil', () => {
  const empty = [];
  for (const record of library) {
    if (!record.attacks?.length) continue;
    const participant = build(record.id);
    for (const action of participant.actions.filter(item => item.type === 'attack')) {
      const stat = participant.caracs[action.attr];
      if (Number.isFinite(stat) && (action.base === '' || action.base == null)) empty.push(`${record.name} · ${action.name} (${action.attr} ${stat})`);
    }
  }
  assert.deepEqual(empty.slice(0, 5), [], `${empty.length} attaques sans score`);
});
