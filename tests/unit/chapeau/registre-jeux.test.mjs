// Registre des jeux (multi-jeux, lot L2) : CA12 (liste des jeux et liens), CA13 (sélecteur absent tant qu'un seul jeu est publié),
// CA5 (la page de Warhammer reste ./index.html), noms de stockage uniques et séparés (plan §2, §4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JEUX, jeuxPublies, jeuDeLaPage, adresseDuJeu } from '../../../js/core/jeux.js';

const RACINE = 'https://ethoril.github.io/WFRP-Outil-MJ/';

test('CA12 — chaque jeu a un id, un nom, une page, une base et un préfixe ; le tout est figé', () => {
  assert.ok(Object.isFrozen(JEUX));
  assert.deepEqual(JEUX.map(jeu => jeu.id), ['warhammer', 'cthulhu']);
  for (const jeu of JEUX) {
    assert.ok(Object.isFrozen(jeu), `${jeu.id} figé`);
    for (const champ of ['id', 'nom', 'page', 'base', 'prefixe']) assert.equal(typeof jeu[champ], 'string', `${jeu.id}.${champ}`);
    assert.equal(typeof jeu.publie, 'boolean');
    assert.ok(jeu.page.startsWith('./'), `${jeu.id} : page relative à la racine de l’outil`);
  }
});

test('CA12 — ids, bases, préfixes et pages sont uniques ; chaque nouveau jeu a sa base préfixée « outil-mj- »', () => {
  for (const champ of ['id', 'base', 'prefixe', 'page']) {
    assert.equal(new Set(JEUX.map(jeu => jeu[champ])).size, JEUX.length, `${champ} unique`);
  }
  for (const jeu of JEUX.filter(item => item.id !== 'warhammer')) {
    assert.match(jeu.base, /^outil-mj-/, `${jeu.id} : base préfixée`);
    assert.doesNotMatch(jeu.prefixe, /^wfrp/, `${jeu.id} : aucun préfixe de Warhammer`);
  }
  assert.ok(JEUX.every(jeu => jeu.prefixe.endsWith('.')));
});

test('CA5 — Warhammer reste à son adresse ; son entrée reprend sa base et son préfixe d’aujourd’hui', () => {
  const warhammer = JEUX.find(jeu => jeu.id === 'warhammer');
  assert.equal(warhammer.page, './index.html');
  assert.equal(warhammer.base, 'wfrp-persistence-v2');
  assert.equal(warhammer.prefixe, 'wfrp.');
  assert.equal(warhammer.publie, true);
});

test('CA13 — jeuxPublies() ne rend que les jeux publiés : sans Cthulhu tant qu’il ne l’est pas, donc pas de sélecteur', () => {
  const cthulhu = JEUX.find(jeu => jeu.id === 'cthulhu');
  assert.equal(cthulhu.publie, false);
  assert.deepEqual(jeuxPublies().map(jeu => jeu.id), ['warhammer']);
  assert.deepEqual(jeuxPublies(), JEUX.filter(jeu => jeu.publie));
});

test('jeuDeLaPage — reconnaît le jeu d’après l’adresse de la page, null si l’adresse est inutilisable', () => {
  for (const adresse of [RACINE, `${RACINE}index.html`, `${RACINE}index.html?x=1#haut`, 'http://localhost:8766/', 'http://localhost:8766/index.html']) {
    assert.equal(jeuDeLaPage(adresse)?.id, 'warhammer', adresse);
  }
  for (const adresse of [`${RACINE}cthulhu/`, `${RACINE}cthulhu/index.html`, 'http://localhost:8766/cthulhu/']) {
    assert.equal(jeuDeLaPage(adresse)?.id, 'cthulhu', adresse);
  }
  assert.equal(jeuDeLaPage('pas une adresse'), null);
  assert.equal(jeuDeLaPage(''), null);
  assert.equal(jeuDeLaPage(null), null);
});

test('adresseDuJeu — lien vers un jeu depuis la page courante, dans les deux sens', () => {
  assert.equal(adresseDuJeu('cthulhu', `${RACINE}index.html`), `${RACINE}cthulhu/`);
  assert.equal(adresseDuJeu('cthulhu', RACINE), `${RACINE}cthulhu/`);
  assert.equal(adresseDuJeu('warhammer', `${RACINE}cthulhu/`), `${RACINE}index.html`);
  assert.equal(adresseDuJeu('warhammer', 'http://localhost:8766/cthulhu/index.html'), 'http://localhost:8766/index.html');
  assert.equal(adresseDuJeu('inconnu', RACINE), null);
});
