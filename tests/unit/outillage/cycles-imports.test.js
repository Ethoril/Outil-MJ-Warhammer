// ARCH-03 : garde-fou contre les cycles d'imports statiques dans js/.
// Parcourt les `import … from '…'`, `import '…'` et `export … from '…'` relatifs,
// calcule les composantes fortement connexes (Tarjan) et échoue en nommant
// chaque cycle non listé dans EXCEPTIONS. Les imports dynamiques `import()`
// ne sont pas comptés : ils ne participent pas à l'ordre d'évaluation.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const JS_DIR = path.join(ROOT, 'js');

// Cycles tolérés, nommés par la liste triée de leurs modules (chemins relatifs à js/).
// Cette liste ne peut que rétrécir : on n'y ajoute jamais de cycle.
const EXCEPTIONS = [];

function listJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsFiles(full));
    else if (/\.m?js$/.test(entry.name)) out.push(full);
  }
  return out;
}

function stripComments(source) {
  // Retire les commentaires bloc et ligne sans toucher aux chaînes simples.
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

function staticSpecifiers(source) {
  const code = stripComments(source);
  const specs = [];
  const re = /(?:^|[;\n}])\s*(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(code))) specs.push(m[1]);
  return specs;
}

function rel(file) {
  return path.relative(JS_DIR, file).split(path.sep).join('/');
}

function buildGraph() {
  const files = listJsFiles(JS_DIR);
  const graph = new Map();
  for (const file of files) {
    const deps = new Set();
    for (const spec of staticSpecifiers(fs.readFileSync(file, 'utf8'))) {
      if (!spec.startsWith('.')) continue;
      const target = path.resolve(path.dirname(file), spec.split('?')[0]);
      if (target.startsWith(JS_DIR + path.sep) && fs.existsSync(target)) deps.add(rel(target));
    }
    graph.set(rel(file), [...deps].sort());
  }
  return graph;
}

function stronglyConnected(graph) {
  let index = 0;
  const idx = new Map(), low = new Map(), onStack = new Set(), stack = [], comps = [];
  function visit(v) {
    idx.set(v, index); low.set(v, index); index++;
    stack.push(v); onStack.add(v);
    for (const w of graph.get(v) || []) {
      if (!idx.has(w)) { visit(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (onStack.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
    }
    if (low.get(v) === idx.get(v)) {
      const comp = [];
      let w;
      do { w = stack.pop(); onStack.delete(w); comp.push(w); } while (w !== v);
      const selfLoop = (graph.get(v) || []).includes(v);
      if (comp.length > 1 || selfLoop) comps.push(comp.sort());
    }
  }
  for (const v of [...graph.keys()].sort()) if (!idx.has(v)) visit(v);
  return comps;
}

// Un exemple de boucle concrète dans la composante, pour le message d'échec.
function exampleLoop(graph, comp) {
  const inComp = new Set(comp);
  const start = comp[0];
  const prev = new Map([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const v = queue.shift();
    for (const w of graph.get(v) || []) {
      if (!inComp.has(w)) continue;
      if (w === start) {
        const loop = [start];
        for (let x = v; x !== start; x = prev.get(x)) loop.splice(1, 0, x);
        return [...loop, start].join(' → ');
      }
      if (!prev.has(w)) { prev.set(w, v); queue.push(w); }
    }
  }
  return comp.join(', ');
}

test('ARCH-03 : aucun cycle d\'imports statiques dans js/ hors exceptions nommées', () => {
  const graph = buildGraph();
  const comps = stronglyConnected(graph);
  const known = new Set(EXCEPTIONS.map((e) => [...e.modules].sort().join('|')));
  const unexpected = comps.filter((c) => !known.has(c.join('|')));
  const message = unexpected
    .map((c) => `Cycle de ${c.length} modules : ${c.join(', ')}\n  ex. ${exampleLoop(graph, c)}`)
    .join('\n');
  assert.equal(unexpected.length, 0, `Cycles d'imports :\n${message}`);
});

test('ARCH-03 : les exceptions existent encore (la liste ne fait que rétrécir)', () => {
  const comps = stronglyConnected(buildGraph()).map((c) => c.join('|'));
  for (const e of EXCEPTIONS) {
    assert.ok(comps.includes([...e.modules].sort().join('|')),
      `Exception « ${e.nom} » périmée : le cycle a changé ou disparu, retirez-la ou réduisez-la.`);
  }
});

test('ARCH-03 : le lecteur d\'imports voit les formes multi-lignes et les ré-exports', () => {
  const src = "import {\n  a,\n  b\n} from './x.js';\nexport { c } from \"./y.js\";\nimport './z.js';\n// import './commente.js';\nconst d = import('./dyn.js');";
  assert.deepEqual(staticSpecifiers(src), ['./x.js', './y.js', './z.js']);
});
