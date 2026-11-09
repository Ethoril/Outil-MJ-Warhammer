// Les points de Chance s'affichent « Chance », jamais « Fortune » (décision du MJ du 09/11/2026, docs/RENOMMAGE_CHANCE_FORTUNE.md).
// Les identifiants internes (`fortune`, `counter:fortune`, `temporaryFortune`…) ne sont pas concernés : seul le texte des
// chaînes JS (et des données affichées) est lu. Les noms propres où « Fortune » ne désigne pas les points restent permis.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
// Noms propres : sort de Haute Magie, miracles de Ranald et de Handrich, bénédiction, malédiction, compétence ; citation anglaise du livre (L17).
const NOMS_PROPRES = /A Fortune reroll|La Fortune est Capricieuse|Fortune généreuse|Bountiful Fortune|Twist of Fortune|Ill[- ]Fortune|Fortune[- ][Tt]elling|Fate and Fortune|Bénédiction de Fortune/g;
// En attente : libellés d'un fichier réservé à une autre session, à corriger par elle (vide : v5-magic-high.js corrigé par Q6 T3).
const EN_ATTENTE = new Set();

const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(entry => {
  const rel = `${dir}/${entry.name}`;
  if (entry.isDirectory()) return walk(rel);
  return /\.(m?js|html)$/.test(entry.name) ? [rel] : [];
});

/** Chaînes littérales d'un source JS, commentaires exclus (lecture simple, suffisante pour ce dépôt). */
function stringLiterals(src) {
  const out = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const end = src.indexOf('*/', i + 2); i = end < 0 ? src.length : end + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') { s += src[j + 1]; j += 2; continue; } if (c !== '`' && src[j] === '\n') break; s += src[j]; j++; }
      out.push(s); i = j + 1; continue;
    }
    i++;
  }
  return out;
}

const offenders = (rel, texts) => texts
  .filter(text => /\bFortune\b/.test(text.replace(NOMS_PROPRES, '')))
  .filter(text => !EN_ATTENTE.has(`${rel}|${text}`))
  .map(text => `${rel} : « ${text.slice(0, 120)} »`);

test('interface : aucun libellé « Fortune » pour les points de Chance dans js/ et index.html', () => {
  const files = [...walk('js').filter(rel => !rel.endsWith('.json')), 'index.html'];
  const found = files.flatMap(rel => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    return offenders(rel, rel.endsWith('.html') ? src.split('\n') : stringLiterals(src));
  });
  assert.deepEqual(found, []);
});

test('données affichées : aucun « point(s) de Fortune » dans les registres JSON de js/data', () => {
  const files = fs.readdirSync(path.join(ROOT, 'js/data')).filter(name => name.endsWith('.json')).map(name => `js/data/${name}`);
  const found = files.flatMap(rel => {
    const values = [];
    const visit = value => { if (typeof value === 'string') values.push(value); else if (value && typeof value === 'object') Object.values(value).forEach(visit); };
    visit(JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')));
    return offenders(rel, values.filter(text => /\b(points?|Points?|Point\(s\)|maximum|relance gratuite|[0-9]+) de Fortune\b|\b[0-9]+ Fortune\b/.test(text.replace(NOMS_PROPRES, ''))));
  });
  assert.deepEqual(found, []);
});

test('le filtre accepte les noms propres et refuse un libellé de points', () => {
  assert.deepEqual(offenders('x.js', ['La Fortune est Capricieuse', 'Fortune généreuse : plus d’inversion', 'Chance : 2']), []);
  assert.equal(offenders('x.js', ['Points de Fortune disponibles']).length, 1);
  assert.equal(offenders('x.js', ['Fortune : 2']).length, 1);
});
