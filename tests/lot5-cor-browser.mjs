import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Lot 5 · G-COR-3 : les familles de mutations autres que L06 s'affichaient sans nom de livre (« Mutations physiques ·  p.66 »).
// Lot 5 · G-COR-2 : « Le choix MJ ou le délai secret requis n'est pas complet » doit nommer le champ manquant.
const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const mime = { '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8' };
const server = createServer((req, res) => { try { const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); const file = resolve(root, `.${pathname}`); assert.ok(file.startsWith(root + sep)); assert.ok(statSync(file).isFile()); res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file)); } catch { res.writeHead(404); res.end('Not found'); } });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
const origin = `http://127.0.0.1:${server.address().port}`;
let failures = 0;
const check = async (name, fn) => { try { await fn(); console.log('ok  -', name); } catch (error) { failures++; console.log('FAIL -', name, '\n   ', error.message.split('\n').slice(0, 3).join('\n    ')); } };
try {
  const page = await (await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 900 } })).newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(`${origin}/__cor__.html`, route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html lang="fr"><body><div id="mount"></div><script type="module">
import { createV5CorruptionPanel } from '/js/ui/v5-corruption-panel.js';
import { V5_CORRUPTION_MUTATION_CATALOG } from '/js/core/v5-corruption-mutation-catalog.js';
import { launchBrowser } from './helpers/browser.mjs';
const scenario = { missing: ['gmChosenDomain'], status: {} };
const Store = new Proxy({
  getCorruptionStatus: () => ({ baseRevision: 1, pointsKnown: true, mutations: [], corruptionPoints: 10, threshold: 5, corruptionSessionId: 's1', pendingThresholdTest: { id: 't' }, pendingMutation: null, ...scenario.status }),
  getCorruptionMutationCatalog: () => V5_CORRUPTION_MUTATION_CATALOG,
  previewCorruptionThresholdTest: () => ({ status: 'needs-input', missing: scenario.missing })
}, { get: (target, key) => key in target ? target[key] : () => ({}) });
const mount = document.getElementById('mount'), actor = { id: 'a', name: 'Test', equipment: [], actions: [] };
const panel = createV5CorruptionPanel({ Store, refresh: () => draw() });
const draw = () => mount.replaceChildren(panel.render(actor));
draw();
window.__scenario = scenario; window.__draw = draw;
</script></body></html>` }));
  await page.goto(`${origin}/__cor__.html`);
  await page.waitForSelector('.workspace-corruption-panel');

  await check('G-COR-3 : chaque table du catalogue nomme son livre', async () => {
    const labels = await page.locator('select[aria-label="Table source"] option').allTextContents();
    assert.ok(labels.length >= 4, `catalogue lu : ${labels.length} tables`);
    for (const label of labels) assert.match(label, /· L\d+\b.* p\.\d+/, `table sans livre : « ${label} »`);
    assert.ok(labels.some(label => /L17/.test(label)) && labels.some(label => /L23/.test(label)) && labels.some(label => /L06/.test(label)), labels.join(' | '));
  });

  const calculate = async missing => {
    await page.evaluate(value => { window.__scenario.missing = value; }, missing);
    await page.getByLabel('Jet de Résistance (d100)').fill('50');
    await page.getByRole('button', { name: 'Calculer le Test de seuil' }).click();
    await page.waitForFunction(() => /requis|manquant|Complétez/.test(document.querySelector('.workspace-corruption-panel').textContent));
    return page.locator('.workspace-corruption-panel .workspace-field-error').allTextContents();
  };
  await check('G-COR-2 : le choix MJ manquant est nommé', async () => {
    const text = (await calculate(['gmChosenDomain'])).join(' ');
    assert.match(text, /Choix MJ si espèce hors table/);
  });
  await check('G-COR-2 : le délai secret manquant nomme les d10 vides', async () => {
    await page.getByLabel('Délai secret · d10 1').fill('4');
    const text = (await calculate(['manifestationDice'])).join(' ');
    assert.match(text, /Délai secret · d10 2/);
    assert.match(text, /Délai secret · d10 3/);
    assert.doesNotMatch(text, /d10 1\b/);
  });
  await check('G-COR-2 : le jet de domaine manquant est nommé', async () => {
    const text = (await calculate(['mutationDomainRoll'])).join(' ');
    assert.match(text, /Jet d100 de mutation physique \/ mentale/);
  });
  const setStatus = async status => { await page.evaluate(value => { window.__scenario.status = value; window.__draw(); }, status); };
  await check('C53 : les boutons de perte de personnage s’activent à la saisie du motif', async () => {
    await setStatus({ pendingThresholdTest: null, pendingCharacterLoss: { id: 'l' } });
    const confirm = page.getByRole('button', { name: 'Confirmer le personnage perdu au Chaos' }), refuse = page.getByRole('button', { name: 'Refuser la perte' });
    assert.equal(await confirm.isDisabled(), true);
    await page.getByLabel('Motif de la décision MJ').fill('Chaos');
    assert.equal(await confirm.isEnabled(), true, 'Confirmer reste grisé');
    assert.equal(await refuse.isEnabled(), true, 'Refuser reste grisé');
  });
  await check('C53 : « Confirmer cette mutation » s’active à la saisie de la description', async () => {
    await setStatus({ pendingThresholdTest: null, pendingMutation: { domain: 'physical', manifestation: { days: 3 } } });
    const confirm = page.getByRole('button', { name: 'Confirmer cette mutation' });
    assert.equal(await confirm.isDisabled(), true);
    await page.getByLabel('Description ou référence choisie par le MJ').fill('Corne');
    assert.equal(await confirm.isEnabled(), true, 'Confirmer reste grisé');
  });
  assert.deepEqual(errors, []);
} finally { await browser.close(); server.close(); }
if (failures) { console.log(`${failures} cas en échec`); process.exit(1); }
console.log('tous les cas passent');
