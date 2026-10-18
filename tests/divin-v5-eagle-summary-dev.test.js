import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const generated = JSON.parse(readFileSync(resolve(root, 'js/data/v5-divine-contracts.json'), 'utf8'));
const sourceAuthor = readFileSync(resolve(root, 'docs/divin/sources/DIVIN_L06_P217_229_LECTEUR.md'), 'utf8');
const sourcePrincipal = readFileSync(resolve(root, 'docs/divin/sources/DIVIN_L06_P217_229_CONTROLE_PRINCIPAL.md'), 'utf8');

test('Œil de l’aigle — résumé et delta correspondent aux lectures V5 p.224', () => {
  assert.match(sourceAuthor, /Eagle’s Eye.*aigle spectral.*invulnérable.*incapable d’effet physique/s);
  assert.match(sourcePrincipal, /L'Œil de l'aigle est intangible et invulnérable.*sa propre Perception 55.*cesse de voir par ses propres yeux/s);

  const eagle = generated.contracts.find(row => row.canonicalName === "Eagle's Eye");
  assert.ok(eagle);
  for (const [label, text] of [['summary', eagle.labels.effect], ['delta', eagle.sourceDelta]]) {
    assert.match(text, /aigle spectral/i, `${label}: aigle spectral`);
    assert.match(text, /intangible/i, `${label}: intangible`);
    assert.match(text, /(?:ne peut pas affecter|incapable d’affecter) physiquement le monde/i, `${label}: impossibilité physique`);
    assert.match(text, /invulnérable/i, `${label}: invulnérable`);
    assert.match(text, /Perception 55/i, `${label}: Perception 55`);
    assert.match(text, /Sens aiguisé \(Vue\)/i, `${label}: Sens aiguisé (Vue)`);
    assert.match(text, /Vol 80/i, `${label}: Vol 80`);
    assert.match(text, /contr[oô]le(?:z)? son vol/i, `${label}: contrôle`);
    assert.match(text, /capacit[eé]s .*à la place des v[oô]tres|capacit[eé]s de l’aigle à la place des siennes/i, `${label}: capacités utilisées en remplacement des siennes`);
    assert.match(text, /(?:voyez|voit) par ses yeux/i, `${label}: vision par les yeux de l’aigle`);
    assert.match(text, /(?:ne pouvez pas voir par les v[oô]tres|sans voir par les v[oô]tres|sans voir par les siens)/i, `${label}: perte de la vue propre`);
    assert.match(text, /potentiellement vuln[eé]rable/i, `${label}: vulnérabilité pendant l’utilisation`);
    assert.doesNotMatch(text, /sans acc[eè]der [àa] ses autres sens/i, `${label}: aucune confusion avec Yeux du chat`);
  }

  assert.equal(eagle.status, 'assisted');
  assert.deepEqual(eagle.params, {
    range: { kind: 'characteristic', characteristic: 'Soc', unit: 'yards' },
    targets: { kind: 'self' },
    duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' },
  });
  assert.deepEqual(eagle.effects.map(effect => [effect.type, effect.kind]), [['summon-creature', 'sensor']]);
});
