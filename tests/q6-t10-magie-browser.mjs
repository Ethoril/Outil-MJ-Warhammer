import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { clickU1Magic } from './helpers/u1-drawer.mjs';
import { chooseBoolean, confirmationValue } from './helpers/confirmation.mjs';

// Q6 T10 (docs/specs/tests-secondaires-agregateur/) : chaque question que le calcul commun pose au MJ a son champ de réponse
// dans le panneau de magie (lancer, Souffle, Tzeentch, méditation, rune des Cadai) et dans le panneau de Prière ; Obstiné est
// proposé avant le jet et le détail par source s'affiche. Un parcours par écran.
const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/harness') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><html lang="fr"><head><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"></head><body><main id="mount"></main></body></html>');
      return;
    }
    const file = resolve(root, '.' + decodeURIComponent(path));
    if (!file.startsWith(resolve(root) + sep) || !statSync(file).isFile()) throw new Error('missing');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
const results = [];
let failed = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}/harness`;

  // Monte un mage (et des adversaires) dans le panneau de jeu. `mage` : champs du mage ; `v5` : extensions v5 du mage ;
  // `sequela` : lignes de séquelle posées après le chargement (le chargement les recalcule à partir du registre).
  async function boot({ mage = {}, v5 = {}, sequela = null, foes = [{ id: 'foe' }], spells = [], extensions = {} } = {}) {
    await page.goto(url);
    await page.evaluate(async ({ mage, v5, sequela, foes, spells, extensions }) => {
      const { createStore } = await import('/js/core/store.js');
      const { initWorkspaceView } = await import('/js/ui/workspace-view.js');
      const { getAllSpellContracts } = await import('/js/core/v5-spell-contracts.js');
      const store = createStore({ storage: null });
      await store.ready;
      const person = (id, name, camp, extra = {}) => ({ id, name, kind: camp === 'ennemi' ? 'PNJ' : 'PJ', camp, zone: 'active', initiative: camp === 'ennemi' ? 30 : 60, hp: 14, maxHp: 14,
        caracs: { CC: 35, CT: 35, F: 30, E: 40, I: 45, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 35, M: 4 }, skills: [], talents: [], equipment: [], traits: [], states: [],
        armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
      const spellRows = spells.map(name => { const contract = getAllSpellContracts().find(row => row.name === name); if (!contract) throw new Error('sort inconnu : ' + name); return { id: contract.id, name }; });
      const wizard = person('mage', 'Mage', 'pj', { skills: [{ name: 'Focalisation', total: 50 }, { name: 'Langue (Magick)', total: 60 }, { name: 'Prière', total: 50 }, { name: 'Calme', total: 50 }],
        spells: spellRows, ...mage, extensions: { v5: { magic: { lore: 'fire' }, channelling: { sl: 6, type: 'winds' }, ...v5 } } });
      const enemies = foes.map(foe => person(foe.id, foe.name || foe.id, 'ennemi', foe.patch || {}));
      await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [],
        combat: { round: 1, currentActorId: 'mage', order: ['mage', ...enemies.map(row => row.id)], participants: [wizard, ...enemies] }, extensions });
      if (sequela) {
        const current = store.listParticipants().find(row => row.id === 'mage');
        await store.updateParticipant('mage', { extensions: { ...current.extensions, v5: { ...current.extensions.v5, sequelaEffects: { rows: sequela } } } });
      }
      window.__store = store;
      const view = initWorkspaceView({ Store: store, mount: document.querySelector('#mount'), showNavigation: false,
        actions: { renderRules() {}, renderLog() {}, applyResolution: preview => store.applyResolution(preview) } });
      window.__view = view;
      view.setSpace('play');
    }, { mage, v5, sequela, foes, spells, extensions });
    await page.locator('.workspace-resolution').first().waitFor({ timeout: 5000 });
  }
  const spellId = name => page.evaluate(async n => (await import('/js/core/v5-spell-contracts.js')).getAllSpellContracts().find(row => row.name === n).id, name);
  async function openCast(name) {
    await clickU1Magic(page, 'cast');
    await page.waitForSelector('[data-focus-key="magic-spell"]');
    await page.selectOption('[data-focus-key="magic-spell"]', await spellId(name));
  }
  const calculate = async () => { await page.click('[data-focus-key="calculate"]'); await page.waitForTimeout(300); };
  const applyButton = () => page.locator('[data-focus-key="apply"]');
  const resultText = () => page.locator('.workspace-magic-result').textContent();
  const roll = async value => { await page.fill('[data-roll-input="attack"]', String(value)); };
  const talent = id => ({ id: 'talent-' + id, status: 'resolved', rank: 1 });
  const sequelaArm = { id: 'sq-arm', type: 'loc-dr', loc: 'arm:left', amount: -1, label: 'Fracture mal soignée (bras gauche) : −1 DR aux Tests utilisant ce bras' };
  const sequelaSpeech = { id: 'sq-speech', type: 'speech-dr', amount: -1, label: 'Fracture mal soignée (tête) : −1 DR aux Tests de Langue parlée' };

  async function screen(name, body) {
    if (process.env.Q6_SCREEN && !name.startsWith(process.env.Q6_SCREEN)) return;
    try { await body(); results.push([name, true]); console.log('  ok   ' + name); }
    catch (error) { failed += 1; results.push([name, false]); console.log('  FAIL ' + name + '\n       ' + String(error.message).split('\n').join('\n       ')); }
  }

  // ÉCRAN 1a : lancer, séquelles à circonstance (CA29) : l'aperçu est refusé, les questions restent à l'écran, répondre résout le jet.
  await screen('1a lancer : question de séquelle (CA29), réponse par le champ, jet résolu', async () => {
    await boot({ spells: ['Carreau'], sequela: [sequelaArm, sequelaSpeech] });
    await openCast('Carreau');
    await roll(25);
    await calculate();
    const zone = page.getByLabel(/Séquelle : le Test utilise-t-il cette zone/);
    const speech = page.getByLabel('Séquelle : le Test de Langue demande-t-il de parler ?');
    assert.equal(await zone.count(), 1, 'la question de zone reste affichée après le refus');
    assert.equal(await speech.count(), 1, 'la question de parole reste affichée après le refus');
    assert.deepEqual(await speech.locator('option').allTextContents(), ['À préciser', 'Oui', 'Non']);
    assert.equal(await speech.inputValue(), '', 'aucune réponse supposée');
    assert.match(await resultText(), /Séquelle : répondre avant le jet/);
    assert.doesNotMatch(await resultText(), /Sort lancé/, 'aucun jet résolu sans réponse');
    assert.equal(await applyButton().isDisabled(), true, 'rien à appliquer tant que les questions sont ouvertes');
    // Réponse partielle : le jet reste refusé et la question restante est toujours là.
    await speech.selectOption('false');
    await page.waitForTimeout(300);
    assert.match(await resultText(), /Séquelle : répondre avant le jet/);
    assert.equal(await applyButton().isDisabled(), true);
    assert.equal(await page.getByLabel(/Séquelle : le Test utilise-t-il cette zone/).count(), 1);
    await page.getByLabel(/Séquelle : le Test utilise-t-il cette zone/).selectOption('true');
    await page.waitForTimeout(300);
    assert.match(await resultText(), /Sort lancé/, 'le jet se résout une fois tout répondu');
    assert.doesNotMatch(await resultText(), /répondre avant le jet/);
    assert.equal(await applyButton().isDisabled(), false);
    // La séquelle compte quand la zone sert ; la réponse reste modifiable.
    const detail = await page.locator('.workspace-source-detail').textContent();
    assert.match(detail, /Détail du Test \(par source\)/);
    assert.match(detail, /Fracture mal soignée/, 'la séquelle qui pèse figure au détail');
    await page.getByLabel(/Séquelle : le Test utilise-t-il cette zone/).selectOption('false');
    await page.waitForTimeout(300);
    assert.doesNotMatch(await page.locator('.workspace-source-detail').textContent().catch(() => ''), /Fracture mal soignée \(bras/, 'zone non utilisée : la séquelle ne pèse plus');
    assert.equal(await applyButton().isDisabled(), false);
  });

  // ÉCRAN 1b : mage en armure avec Obstiné (Focalisation : ligne de pénalité d’armure ; lancer : détail par source).
  const plastron = { id: 'plastron', name: 'Plastron de plates', kind: 'armour', ap: 2, locations: ['body'], layer: 'rigid', material: 'metal', keywords: [], extensions: {} };
  await screen('1b Focalisation : Obstiné retire la ligne « Pénalité d’armure portée », détail par source', async () => {
    await boot({ mage: { talents: [talent('strong-minded')], equipment: [plastron] } });
    await clickU1Magic(page, 'channelling');
    await roll(25);
    await calculate();
    assert.match(await resultText(), /Pénalité d’armure portée : −2 DR/, 'sans Obstiné la pénalité est affichée');
    const choice = page.getByLabel('Talent à choisir avant le jet');
    assert.deepEqual(await choice.locator('option').evaluateAll(list => list.map(o => o.value)), ['none', 'strong-minded']);
    await choice.selectOption('strong-minded');
    await page.waitForTimeout(300);
    assert.match(await resultText(), /Focalisation réussie/);
    assert.doesNotMatch(await resultText(), /Pénalité d’armure portée/, 'sous Obstiné la pénalité appliquée est 0 : plus de ligne');
    assert.match(await page.locator('.workspace-source-detail').textContent().catch(() => ''), /Détail du Test .par source./);
    await choice.selectOption('none');
    await page.waitForTimeout(300);
    assert.match(await resultText(), /Pénalité d’armure portée : −2 DR/, 'revenir sur Aucun rétablit la pénalité');
  });
  await screen('1c lancer : Obstiné retire l’armure du détail par source et ajoute 2 DR', async () => {
    await boot({ spells: ['Carreau'], mage: { talents: [talent('strong-minded')], equipment: [plastron] } });
    await openCast('Carreau');
    await roll(25);
    await calculate();
    const before = await page.locator('.workspace-source-detail').textContent();
    assert.match(before, /Détail du Test .par source./);
    assert.match(before, /Pénalité d’armure −2 DR/);
    assert.match(await resultText(), /Total 8 DR/);
    await page.getByLabel('Talent à choisir avant le jet').selectOption('strong-minded');
    await page.waitForTimeout(300);
    assert.match(await resultText(), /Sort lancé/);
    assert.doesNotMatch(await page.locator('.workspace-source-detail').textContent().catch(() => ''), /Pénalité d’armure −2 DR/, 'l’armure ne pèse plus (±0)');
    assert.match(await resultText(), /Total 10 DR/, 'le −2 d’armure ne pèse plus');
  });

  // ÉCRAN 2 : Souffle (CA24, CA34) : une cible Surprise ou Inconsciente n'esquive pas.
  const state = (key, name) => ({ id: key + '-1', key, name, level: 1 });
  await screen('2 Souffle : cible Surprise ou Inconsciente, pas d’Esquive demandée', async () => {
    await boot({ spells: ['Souffle'], foes: [{ id: 'surpris', name: 'Gobelin surpris', patch: { states: [state('surpris', 'Surpris')] } },
      { id: 'inconscient', name: 'Orc inconscient', patch: { states: [state('inconscient', 'Inconscient')] } }, { id: 'eveille', name: 'Troll éveillé' }] });
    await openCast('Souffle');
    const dodgeField = () => page.getByLabel(/Souffle : Esquive \(d100\)/);
    const note = id => page.locator('[data-breath-no-dodge="' + id + '"]');
    const pick = async id => { await page.click('[data-focus-key="target-' + id + '"]'); await page.waitForTimeout(300); };
    // Cible Surprise : note, pas de champ d'Esquive, ni de liste d'opposition.
    await pick('surpris');
    assert.match(await note('surpris').textContent(), /Gobelin surpris est Surprise : aucune Esquive possible/);
    assert.equal(await dodgeField().count(), 0);
    assert.equal(await page.getByLabel(/Souffle : opposition/).count(), 0);
    // Cible Inconsciente (CA34) : même traitement.
    await pick('inconscient');
    assert.equal(await note('surpris').count(), 0, 'la note suit la cible choisie');
    assert.match(await note('inconscient').textContent(), /Orc inconscient est Inconsciente : aucune Esquive possible/);
    assert.equal(await dodgeField().count(), 0);
    // Garde-fou : une cible éveillée, elle, doit esquiver (sinon le test ne prouverait rien).
    await pick('eveille');
    assert.equal(await note('eveille').count(), 0);
    assert.equal(await dodgeField().count(), 1, 'la cible éveillée a son champ d’Esquive');
    // Le Souffle sur la cible Inconsciente se résout sans Esquive saisie.
    await pick('inconscient');
    await page.selectOption('[data-focus-key="magicChosenLore"]', 'metal');
    await page.fill('[data-focus-key="magic-ct-roll"]', '25');
    await page.fill('[data-focus-key="magic-target-distance-inconscient"]', '5');
    await roll(25);
    await calculate();
    assert.match(await resultText(), /Sort lancé/, 'résolu sans d100 d’Esquive');
    assert.equal(await applyButton().isDisabled(), false);
    assert.equal(await dodgeField().count(), 0);
  });

  // ÉCRAN 3 : attribut de Tzeentch : la question d'État du Test de Corruption se pose dans « À préciser pour les Tests du sort ».
  await screen('3 Tzeentch : la question d’État de la cible À terre a son champ, sans nouveau d100', async () => {
    await boot({ v5: { channelling: { sl: 30, type: 'winds' } }, spells: ['Transformation de Tzeentch'], foes: [{ id: 'foe', name: 'Orc', patch: { skills: [{ name: 'Résistance', total: 40 }], states: [{ id: 'prone-1', key: 'aterre', name: 'À terre', level: 1 }] } }, { id: 'other', name: 'Gobelin' }] });
    await openCast('Transformation de Tzeentch');
    await page.click('[data-focus-key="target-foe"]');
    await roll(25);
    await calculate();
    assert.match(await resultText(), /d100 du Test de Corruption requis/);
    const corruption = page.getByLabel('d100 du Test de Corruption — Orc');
    await corruption.fill('40');
    await page.waitForTimeout(300);
    await calculate();
    assert.match(await resultText(), /précision d’État du Test de Corruption/);
    const question = page.getByLabel('Orc : Préciser si le Test implique un mouvement.');
    assert.equal(await question.count(), 1);
    assert.equal(await page.locator('.workspace-test-questions').first().getAttribute('role'), 'group');
    assert.match(await page.locator('.workspace-test-questions').first().textContent(), /À préciser pour les Tests du sort/);
    assert.equal(await page.getByLabel('d100 du Test de Corruption — Orc').count(), 0, 'le d100 déjà saisi n’est pas redemandé');
    assert.equal(await applyButton().isDisabled(), true, 'rien à appliquer avant la réponse');
    await chooseBoolean(question,'false');
    await page.waitForTimeout(400);
    let text = await resultText();
    assert.doesNotMatch(text, /précision d’État du Test de Corruption|d100 du Test de Corruption requis/, 'la question est levée');
    assert.match(text, /Test de Corruption (raté|réussi) [(]40[)]/, 'le Test de Corruption de la cible est résolu avec le d100 déjà saisi');
    assert.equal(await applyButton().isDisabled(), false);
    assert.equal(await question.count(), 1, 'la réponse reste visible après résolution');
    assert.equal(await question.inputValue(), 'false');
    await question.selectOption('true');
    await page.waitForTimeout(400);
    assert.equal(await question.inputValue(), 'true', 'le MJ peut corriger sa réponse');
    assert.equal(await applyButton().isDisabled(), false);
    await question.selectOption('false');
    await page.waitForTimeout(400);
    assert.equal(await question.inputValue(), 'false');
    await page.click('[data-focus-key="target-other"]');
    await calculate();
    assert.equal(await question.count(), 0, 'la réponse de l’ancienne cible ne réapparaît pas');
    await page.click('[data-focus-key="target-foe"]');
    await calculate();
    assert.equal(await question.count(), 1, 'la réponse conservée redevient corrigeable en revenant à la cible');
    assert.equal(await question.inputValue(), 'false');
    await page.selectOption('[data-focus-key="magic-spell"]', await spellId('Carreau'));
    await calculate();
    assert.equal(await question.count(), 0, 'la réponse de l’ancien sort ne réapparaît pas');
  });

  await screen('3b questions de sort : seules les cibles et options encore applicables restent corrigeables', async () => {
    const values = await page.evaluate(async () => {
      const { renderPreviewTestQuestions } = await import('/js/ui/resolution-panel.js');
      const rows = [
        { field: 'involvesMovement', label: 'Mouvement ?', participantId: 'a', answerAt: 'targetTests.a.conditionContext' },
        { field: 'involvesMovement', label: 'Mouvement ?', participantId: 'b', answerAt: 'targetTests.b.conditionContext' }
      ];
      const draft = { magicTargetTests: { a: { conditionContext: { involvesMovement: false } }, b: { conditionContext: { involvesMovement: true } } }, magicAnsweredTestQuestions: rows };
      const draw = applicableQuestions => renderPreviewTestQuestions({ v5MagicKind: 'cast', spellPreview: { applicableQuestions } }, draft, { select() {} }, [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]);
      const both = draw(rows), second = draw([rows[1]]), neither = draw([]);
      return { both: [...both.querySelectorAll('select')].map(el => [el.getAttribute('aria-label'), el.value]), second: [...second.querySelectorAll('select')].map(el => el.getAttribute('aria-label')), neither: neither === null };
    });
    assert.deepEqual(values.both, [['A : Mouvement ?', 'false'], ['B : Mouvement ?', 'true']]);
    assert.deepEqual(values.second, ['B : Mouvement ?'], 'une cible ou option retirée ne laisse pas sa question à l’écran');
    assert.equal(values.neither, true, 'aucune ancienne question sans Test applicable');
  });

  await screen('3c vortex initial : Calme de protection et question d’État restent accessibles', async () => {
    await boot({ v5: { channelling: { sl: 30, type: 'winds' } }, spells: ['Tempête Magmatique'], foes: [{ id: 'foe', name: 'Orc', patch: {
      talents:[talent('strong-minded')],states: [{ id: 'prone-1', key: 'aterre', name: 'À terre', level: 1 }],
      extensions: { v5: { damageReductions: [{ amount: 1, filter: null, calmTest: true }] } }
    } }] });
    await page.evaluate(()=>window.__store.startTalentSession());await openCast('Tempête Magmatique');
    await page.selectOption('[data-focus-key="magicVortexDirection"]','E');
    await page.selectOption('[data-focus-key="magicVortexWillpower"]','success');
    await page.fill('[data-focus-key="magicVortexDistance"]','10');
    await roll(25); await calculate();
    const calm=page.locator('input[aria-label*="vortex principal : Calme pour la réduction de dégâts"]').first();
    assert.equal(await calm.count(),1,'le d100 demandé par le vortex doit être affiché');
    const firstTalent=page.getByLabel(/Obstiné avant le jet — .*vortex principal : Calme pour la réduction/).first();
    await firstTalent.selectOption('strong-minded');
    await calm.fill('35'); await calculate();
    const question=page.getByLabel(/Préciser si le Test implique un mouvement/).last();
    assert.equal(await question.count(),1,'la question du Test de Calme doit être affichée');
    await chooseBoolean(question,'false');
    await page.waitForTimeout(300);
    assert.equal(await confirmationValue(question),'false','la réponse reste corrigeable');
    await chooseBoolean(question,'true');
    await page.waitForTimeout(300);
    assert.equal(await confirmationValue(question),'true');
    assert.equal(await calm.inputValue(),'35','le d100 reste lui aussi corrigeable');
    assert.equal(await applyButton().isDisabled(),false,'le vortex peut être appliqué après les réponses');
    await page.fill('[data-focus-key="magicVortexDistance"]','8');
    await page.fill('[data-focus-key="magic-specific-mini"]','1');
    await page.fill('[data-focus-key="wom-caster-mini1Direction"]','5');
    await page.selectOption('[data-focus-key="wom-mini1Targets"]',['foe']);
    await calculate();
    const miniCalm=page.locator('input[aria-label*="mini-vortex 1 : Calme pour la réduction"]').first();
    assert.equal(await miniCalm.count(),1,'la protection du mini-vortex a son propre Test');
    const miniTalent=page.getByLabel(/Obstiné avant le jet — .*mini-vortex 1 : Calme pour la réduction/).first();
    assert.equal(await miniTalent.locator('option[value="strong-minded"]').evaluate(node=>node.disabled),true,'un second Test du même personnage ne peut pas réserver Obstiné');
    assert.match(await miniTalent.locator('..').innerText(),/déjà choisi pour un autre Test/);
    await calm.fill('');await calm.blur();await page.waitForTimeout(300);
    await firstTalent.selectOption('none');
    assert.equal(await miniTalent.locator('option[value="strong-minded"]').evaluate(node=>node.disabled),false,'le choix est libéré si le premier jet est effacé et le talent retiré');
    await miniTalent.selectOption('strong-minded');
    await calm.fill('35');await calm.blur();await page.waitForTimeout(300);
    await miniCalm.fill('35');await miniCalm.blur();await page.waitForTimeout(300);
    const miniQuestion=page.getByLabel(/mini-vortex 1 : Calme.*Préciser si le Test implique un mouvement/).last();
    assert.equal(await miniQuestion.count(),1);await chooseBoolean(miniQuestion,'false');await page.waitForTimeout(300);
    assert.equal(await confirmationValue(miniQuestion),'false');
    assert.equal(await miniCalm.inputValue(),'35');
    assert.equal(await applyButton().isDisabled(),false);
    await calm.fill('');await calm.blur();await page.waitForTimeout(300);
    assert.equal(await firstTalent.locator('option[value="strong-minded"]').evaluate(node=>node.disabled),true,'le premier Test ne peut plus réserver le talent choisi pour le second');
    await calm.fill('35');await calm.blur();await page.waitForTimeout(300);
    await page.fill('[data-focus-key="magic-specific-mini"]','0');await calculate();
    assert.equal(await miniCalm.count(),0,'la suppression du mini-vortex masque ses champs');
    await calm.fill('');await calm.blur();await page.waitForTimeout(300);await firstTalent.selectOption('strong-minded');
    await calm.fill('35');await calm.blur();await page.waitForTimeout(300);
    await page.fill('[data-focus-key="magic-specific-mini"]','1');await calculate();
    assert.equal(await miniCalm.inputValue(),'35','un mini-vortex réactivé retrouve son jet');
    assert.equal(await confirmationValue(miniQuestion),'false','sa réponse reste corrigeable');
    assert.equal(await miniTalent.inputValue(),'none','le choix d’Obstiné du Test désactivé ne ressurgit pas');
    assert.equal(await miniTalent.locator('option[value="strong-minded"]').evaluate(node=>node.disabled),true);
    assert.equal(await applyButton().isDisabled(),false,'un seul Test réserve le quota après réactivation');
    await calm.fill('');await calm.blur();await page.waitForTimeout(300);await firstTalent.selectOption('none');
    await miniCalm.fill('');await miniCalm.blur();await page.waitForTimeout(300);await miniTalent.selectOption('strong-minded');
    await miniCalm.fill('35');await miniCalm.blur();await page.waitForTimeout(300);
    await page.fill('[data-focus-key="magicVortexDistance"]','');await calculate();
    await page.fill('[data-focus-key="magicVortexDistance"]','8');await calculate();
    assert.equal(await miniTalent.inputValue(),'none','la distance effacée retire le choix même si elle est aussitôt restaurée');
    assert.equal(await miniCalm.inputValue(),'35','effacer la distance ne modifie pas le dé déjà connu');
    await miniCalm.fill('');await miniCalm.blur();await page.waitForTimeout(300);await miniTalent.selectOption('strong-minded');
    await miniCalm.fill('35');await miniCalm.blur();await page.waitForTimeout(300);
    await page.fill('[data-focus-key="magicVortexDistance"]','');await calculate();
    await page.fill('[data-focus-key="magicVortexDistance"]','10');await calculate();
    await firstTalent.selectOption('strong-minded');await calm.fill('35');await calm.blur();await page.waitForTimeout(300);
    await page.fill('[data-focus-key="magicVortexDistance"]','8');await calculate();
    assert.equal(await miniTalent.inputValue(),'none','effacer la distance supprime la réservation du mini-vortex');
    assert.equal(await miniCalm.inputValue(),'35','le dé du mini-vortex est conservé');
    assert.equal(await applyButton().isDisabled(),false);
    await applyButton().click();
    await page.waitForFunction(()=>window.__store.getObstinateStatus('foe').available===false);
    await page.evaluate(()=>window.__store.undo());
    assert.equal(await page.evaluate(()=>window.__store.getObstinateStatus('foe').available),true,'annuler rend le quota');
  });

  await screen('3d Soleil Violet : Obstiné proposé avant le premier aperçu', async () => {
    await boot({ v5: { channelling: { sl: 30, type: 'winds' } }, spells: ['Cendres et Poussière'], foes: [{id:'foe',name:'Orc',patch:{talents:[talent('strong-minded')]}}] });
    await page.evaluate(()=>window.__store.startTalentSession());
    await openCast('Cendres et Poussière');
    await page.selectOption('[data-focus-key="magicVortexDirection"]','E');
    await page.selectOption('[data-focus-key="magicVortexWillpower"]','success');
    await page.fill('[data-focus-key="magicVortexDistance"]','10');
    await page.fill('[data-focus-key="magic-specific-sun"]','1');
    await chooseBoolean(page.getByLabel('Soleil Violet : contact avec la sphère — Orc'),'true');
    const talentChoice=page.getByLabel('Obstiné avant le jet — Soleil Violet de Orc');
    assert.equal(await talentChoice.count(),1,'le choix est disponible avant tout calcul');
    await talentChoice.selectOption('strong-minded');
    await page.getByLabel('Soleil Violet : Calme contre la mort (d100) — Orc').fill('35');
    assert.equal(await talentChoice.isDisabled(),true,'le talent est verrouillé dès la saisie du d100');
    await page.getByLabel('Soleil Violet : Calme contre la mort (d100) — Orc').fill('');
    assert.equal(await talentChoice.isDisabled(),false,'effacer le d100 permet de corriger le choix');
    await page.getByLabel('Soleil Violet : Calme contre la mort (d100) — Orc').fill('35');
    await chooseBoolean(page.getByLabel('Cendres : encore dans le nuage après le déplacement — Orc'),'false');
    await roll(25);await calculate();
    assert.equal(await talentChoice.count(),1,'aucun doublon après calcul');
    assert.equal(await talentChoice.inputValue(),'strong-minded');
    await chooseBoolean(page.getByLabel('Soleil Violet : contact avec la sphère — Orc'),'false');await calculate();
    await chooseBoolean(page.getByLabel('Soleil Violet : contact avec la sphère — Orc'),'true');await calculate();
    assert.equal(await talentChoice.inputValue(),'none','le choix lié au contact annulé ne ressurgit pas');
    assert.equal(await page.getByLabel('Soleil Violet : Calme contre la mort (d100) — Orc').inputValue(),'35');
  });

  await screen('3e Thorsen : collision, Calme et Protections à un ou plusieurs dés', async () => {
    for (const multiple of [false,true]) {
      const wards=[{threshold:7,filter:{any:['crush']},casterId:'l',lileathRank:1},...(multiple?[{threshold:8,filter:{any:['crush']},casterId:'l',lileathRank:1}]:[])];
      await boot({v5:{channelling:{sl:30,type:'winds'}},spells:['Orage de Thorsen'],foes:[{id:'foe',name:'Orc',patch:{talents:[talent('strong-minded')],states:[{id:'prone',key:'aterre',name:'À terre',level:1}],extensions:{v5:{wards,damageReductions:[{amount:1,filter:{any:['crush']},calmTest:true}]}}}}]});
      await page.evaluate(()=>window.__store.startTalentSession());await openCast('Orage de Thorsen');
      await page.selectOption('[data-focus-key="magicVortexDirection"]','E');
      await page.selectOption('[data-focus-key="magicVortexWillpower"]','success');
      await page.fill('[data-focus-key="magicVortexDistance"]','10');
      await page.fill('[data-focus-key="wom-foe-throwDirection"]','4');
      await chooseBoolean(page.getByLabel('Thorsen : collision solide ou créature — Orc'),'true');
      await page.getByLabel('Thorsen : d10 des Protections contre collision — Orc').fill(multiple?'3 8':'7');
      await roll(25);await calculate();
      const choice=page.getByLabel(/Obstiné avant le jet — .*Calme pour la collision/).first();
      assert.equal(await choice.count(),1);await choice.selectOption('strong-minded');
      const calm=page.locator('input[aria-label*="Calme pour la collision"]').first();
      await calm.fill('35');assert.equal(await choice.isDisabled(),true,'le choix est verrouillé avant recalcul');await calm.blur();await page.waitForTimeout(300);
      assert.equal(await choice.isDisabled(),true,'le choix reste verrouillé après recalcul');
      const question=page.getByLabel(/Calme pour la collision : Préciser si le Test implique un mouvement/).last();
      assert.equal(await question.count(),1);await chooseBoolean(question,'false');await page.waitForTimeout(300);
      assert.equal(await confirmationValue(question),'false');
      assert.equal(await applyButton().isDisabled(),false,`collision résolue avec ${multiple?'deux dés':'un dé'}`);
      assert.deepEqual(await page.evaluate(()=>window.__store && document.querySelector('[data-focus-key="wom-foe-collisionWardRoll"]')?.value),multiple?'3 8':'7');
      await chooseBoolean(page.getByLabel('Thorsen : collision solide ou créature — Orc'),'false');await calculate();
      await chooseBoolean(page.getByLabel('Thorsen : collision solide ou créature — Orc'),'true');await calculate();
      assert.equal(await choice.inputValue(),'none','un choix lié à une collision annulée ne ressurgit pas');
      assert.equal(await calm.inputValue(),'35','le d100 reste conservé');
    }
  });

  await screen('3f le lanceur touché par son mini-vortex ne réserve pas deux fois Obstiné', async () => {
    await boot({mage:{talents:[talent('strong-minded')]},v5:{channelling:{sl:30,type:'winds'},damageReductions:[{amount:1,filter:null,calmTest:true}]},spells:['Tempête Magmatique']});
    await page.evaluate(()=>window.__store.startTalentSession());await openCast('Tempête Magmatique');
    await page.selectOption('[data-focus-key="magicVortexDirection"]','E');await page.selectOption('[data-focus-key="magicVortexWillpower"]','success');
    await page.fill('[data-focus-key="magicVortexDistance"]','8');await page.fill('[data-focus-key="magic-specific-mini"]','1');
    await page.fill('[data-focus-key="wom-caster-mini1Direction"]','5');await page.selectOption('[data-focus-key="wom-mini1Targets"]',['mage']);
    await roll(25);await calculate();
    const secondary=page.getByLabel(/Obstiné avant le jet — .*mini-vortex 1 : Calme pour la réduction/).first();
    assert.equal(await secondary.count(),1);await secondary.selectOption('strong-minded');
    const casting=page.locator('[data-focus-key="magic-pre-roll-talent"]');
    assert.equal(await casting.locator('option[value="strong-minded"]').evaluate(node=>node.disabled),true,'le Test de lancement ne peut pas utiliser le talent déjà choisi pour le mini-vortex');
  });

  // ÉCRAN 4 : méditation et runes des Cadai : après un refus, la question apparaît près du bouton, la commande passe une fois répondu.
  const prone = { id: 'prone-1', key: 'aterre', name: 'À terre', level: 1 };
  await screen('4a méditation : question d’État près du bouton, puis la commande passe', async () => {
    await boot({ mage: { talents: [talent('cadai-meditation')], states: [prone] } });
    await clickU1Magic(page, 'channelling');
    await page.selectOption('[data-focus-key="magicMeditationId"]', 'talent-cadai-meditation');
    await page.fill('[data-focus-key="magicMeditationMinutes"]', '60');
    await page.fill('[data-focus-key="magicMeditationRoll"]', '25');
    const button = page.getByRole('button', { name: 'Résoudre la méditation' });
    await button.click();
    await page.waitForTimeout(400);
    const before = await page.evaluate(() => JSON.stringify(window.__store.listParticipants().find(p => p.id === 'mage').extensions.v5));
    const questions = page.locator('.workspace-v5-context-details .workspace-test-questions');
    assert.match(await questions.textContent(), /À préciser avant le Test/);
    assert.equal(await page.getByLabel('Préciser si le Test implique un mouvement.').count(), 1);
        await chooseBoolean(page.getByLabel('Préciser si le Test implique un mouvement.'), 'false');
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => JSON.stringify(window.__store.listParticipants().find(p => p.id === 'mage').extensions.v5)), before, 'répondre ne résout rien tout seul');
    await page.getByRole('button', { name: 'Résoudre la méditation' }).click();
    await page.waitForTimeout(500);
    assert.equal(await questions.count(), 0, 'Test résolu : la question et sa réponse ne valent plus');
    assert.equal(await page.locator('.workspace-field-error').filter({ hasText: /mouvement/ }).count(), 0);
    assert.notEqual(await page.evaluate(() => JSON.stringify(window.__store.listParticipants().find(p => p.id === 'mage').extensions.v5)), before, 'la méditation est appliquée au mage');
  });

  await screen('4b rune des Cadai : question d’État près du bouton, puis le déploiement passe', async () => {
    await boot({ mage: { states: [prone], skills: [{ name: 'Focalisation', total: 50 }, { name: 'Langue (Magick)', total: 60 }, { name: 'Savoir (Magie)', total: 50 }] }, v5: { cadaiRunes: { deployed: 1, max: 4 } } });
    await clickU1Magic(page, 'channelling');
    await page.fill('[data-focus-key="magicRuneKnowledgeRoll"]', '25');
    await page.locator('[data-focus-key="magicRuneMaterials"]').check();
    await page.getByRole('button', { name: 'Déployer une rune (1 Round)' }).click();
    await page.waitForTimeout(400);
    const deployed = () => page.evaluate(() => window.__store.listParticipants().find(p => p.id === 'mage').extensions.v5.cadaiRunes.deployed);
    assert.equal(await deployed(), 1, 'refusé : aucune rune déployée');
    const questions = page.locator('.workspace-v5-context-details .workspace-test-questions');
    assert.match(await questions.textContent(), /Préciser si le Test implique un mouvement/);
    await chooseBoolean(page.getByLabel('Préciser si le Test implique un mouvement.'), 'false');
    await page.waitForTimeout(300);
    assert.equal(await deployed(), 1, 'répondre ne déploie rien tout seul');
    await page.getByRole('button', { name: 'Déployer une rune (1 Round)' }).click();
    await page.waitForTimeout(500);
    assert.equal(await deployed(), 2, 'une rune de plus après la réponse');
    assert.equal(await questions.count(), 0);
  });

  await screen('4c relance Cadai de la Corruption : question d’État près du bouton, puis la relance passe', async () => {
    const execution = { id: 'exec-haute-magie-1', actorId: 'mage', spellId: await spellId('Apothéose'), rerolledCorruption: [] };
    await boot({ mage: { states: [prone], skills: [{ name: 'Focalisation', total: 50 }, { name: 'Langue (Magick)', total: 60 }, { name: 'Calme', total: 50 }] }, v5: { cadaiRunes: { deployed: 2, max: 4 } },
      extensions: { v5: { highMagicExecutions: [execution] } } });
    await clickU1Magic(page, 'channelling');
    await page.locator('[data-focus-key="magicUseCadaiRune"]').check();
    await page.locator('[data-focus-key="magicCadaiAccessible"]').check();
    await page.selectOption('[data-focus-key="magicCorruptionExecutionId"]', execution.id);
    await page.fill('[data-focus-key="magicCorruptionInitialRoll"]', '90');
    await page.fill('[data-focus-key="magicCadaiCorruptionRoll"]', '30');
    await page.getByRole('button', { name: 'Résoudre la relance de Corruption' }).click();
    await page.waitForTimeout(400);
    const read = () => page.evaluate(() => { const v5 = window.__store.listParticipants().find(p => p.id === 'mage').extensions.v5; return { runes: v5.cadaiRunes.deployed, last: v5.lastCadaiCorruption || null }; });
    assert.deepEqual(await read(), { runes: 2, last: null }, 'refusée : aucune rune consommée');
    const questions = page.locator('.workspace-v5-context-details .workspace-test-questions');
    assert.match(await questions.textContent(), /Préciser si le Test implique un mouvement/);
    await chooseBoolean(page.getByLabel('Préciser si le Test implique un mouvement.'), 'false');
    await page.waitForTimeout(300);
    assert.equal((await read()).runes, 2, 'répondre ne consomme rien tout seul');
    await page.getByRole('button', { name: 'Résoudre la relance de Corruption' }).click();
    await page.waitForTimeout(500);
    const done = await read();
    assert.equal(done.runes, 1, 'une rune consommée après la réponse');
    assert.equal(done.last?.firstRoll, 90);
    assert.equal(done.last?.reroll, 30);
    assert.equal(await questions.count(), 0);
  });

  // ÉCRAN 5 : clause d'un sort actif (Anraheir : calmer la monture, Test de Chevaucher du destinataire).
  await screen('5 clause d’un sort actif : question d’État du destinataire, réponse, clause résolue', async () => {
    const id = await spellId('Malédiction d’Anraheir');
    const effect = { id: 'eff-anraheir', spellId: id, spellName: 'Malédiction d’Anraheir', casterId: 'mage', appliedAtRound: 1, expiresAtRound: 5, specialState: { mountFleeing: true } };
    await boot({ spells: ['Malédiction d’Anraheir'], foes: [{ id: 'foe', name: 'Cavalier', patch: { states: [prone], skills: [{ name: 'Chevaucher', total: 50 }], extensions: { v5: { spellEffects: [effect] } } } }] });
    await openCast('Malédiction d’Anraheir');
    await page.selectOption('[data-focus-key="magic-clause-effectId"]', effect.id);
    await page.selectOption('[data-focus-key="magic-clause-targetId"]', 'foe');
    await page.selectOption('[data-focus-key="magic-clause-kind"]', 'calm-mount');
    const clause = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Clause d’un sort actif' }) }).last();
    await clause.getByLabel('Clause : jet secondaire d100').fill('30');
    const flee = () => page.evaluate(() => window.__store.listParticipants().find(p => p.id === 'foe').extensions.v5.spellEffects[0].specialState.mountFleeing);
    await clause.getByRole('button', { name: 'Résoudre la clause du sort' }).click();
    await page.waitForTimeout(500);
    const box = clause.locator('.workspace-test-questions');
    assert.match(await box.textContent(), /À préciser avant de résoudre la clause/);
    assert.equal(await flee(), true, 'refusée : la monture n’est pas calmée');
    await chooseBoolean(clause.getByLabel('Cavalier : Préciser si le Test implique un mouvement.'), 'false');
    await page.waitForTimeout(300);
    assert.equal(await flee(), true, 'répondre ne résout rien tout seul');
    await clause.getByRole('button', { name: 'Résoudre la clause du sort' }).click();
    await page.waitForTimeout(500);
    assert.equal(await clause.locator('.workspace-test-questions').count(), 0, 'clause résolue : plus de question');
    assert.equal(await flee(), false, 'Chevaucher réussi (30 contre 50) : la monture est calmée');
  });

  // ÉCRAN 6 : Prière : choix d'Obstiné et détail du Test de Prière par source.
  await screen('6 Prière : Obstiné proposé, détail du Test de Prière par source (Sonné écarté sous Obstiné)', async () => {
    const shield = (await page.evaluate(async () => (await import('/js/data/v5-divine-contracts.json', { with: { type: 'json' } })).default.contracts.find(c => c.canonicalName === 'Shield of Myrmidia'))) ;
    await boot({ mage: { talents: [{ id: shield.requiredTalent.catalogueTalentId, status: 'resolved', specialization: 'Myrmidia', rank: 1 }, talent('strong-minded')],
      skills: [{ id: 'pray', name: 'Pray', status: 'resolved', total: 80 }], prayers: [{ nom: shield.catalogueName }], states: [{ id: 'stun-1', key: 'sonne', name: 'Sonné', level: 1 }],
      caracs: { CC: 35, CT: 35, F: 30, E: 40, I: 45, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 80, M: 4 } }, v5: { divine: { sin: 0 }, baseCaracs: { Soc: 80 } } });
    const panel = page.locator('[data-divine-panel]');
    await panel.locator('summary').first().click();
    const prayerId = await page.locator('[aria-label="Prière divine"] option').evaluateAll(options => options.find(option => option.textContent.includes('Bouclier de Myrmidia'))?.value);
    assert.ok(prayerId, 'Bouclier de Myrmidia proposé');
    await page.locator('[aria-label="Prière divine"]').selectOption(prayerId);
    await page.waitForTimeout(300);
    await panel.locator('[aria-label="Destinataire Mage"]').check();
    await chooseBoolean(panel.locator('[aria-label="Mage · Portée / zone confirmée"]'), 'true');
    await chooseBoolean(panel.locator('[aria-label="Le personnage peut prononcer la prière"]'), 'true');
    await panel.locator('[aria-label="Fin de l’effet (choix du MJ)"]').selectOption('endOfRound');
    await panel.locator('[aria-label="Jet de Prière (d100)"]').fill('23');
    await panel.locator('[data-divine-action="calculate"]').click();
    await page.waitForSelector('.workspace-divine-preview');
    const preview = page.locator('.workspace-divine-preview');
    assert.match(await preview.innerText(), /Prière réussie · 5 DR/, 'Sonné −1 pèse sur le Test de Prière');
    const detail = panel.locator('.workspace-source-detail');
    assert.match(await detail.textContent(), /Détail du Test de Prière .par source./);
    assert.match(await detail.textContent(), /Sonné/);
    assert.equal(await detail.locator('s').count(), 0, 'aucune ligne barrée avant Obstiné');
    const choice = panel.getByLabel('Talent à choisir avant le jet');
    assert.deepEqual(await choice.locator('option').evaluateAll(list => list.map(o => o.value)), ['none', 'strong-minded']);
    await choice.selectOption('strong-minded');
    await page.waitForTimeout(400);
    assert.equal(await preview.count(), 0, 'changer le choix invalide l’aperçu périmé');
    await panel.locator('[data-divine-action="calculate"]').click();
    await preview.waitFor({ timeout: 5000 });
    assert.match(await preview.innerText(), /Prière réussie · 6 DR/, 'Obstiné écarte le malus de Sonné');
    assert.ok(await panel.locator('.workspace-source-detail s').count() >= 1, 'le malus écarté est barré au détail');
    assert.match(await panel.locator('.workspace-source-detail s').first().textContent(), /Sonné|pénalité d’État/);
    assert.match(await panel.locator('.workspace-source-detail').textContent(), /écarté : Obstiné/);
    await panel.getByLabel('Talent à choisir avant le jet').selectOption('none');
    await page.waitForTimeout(400);
    assert.equal(await preview.count(), 0, 'changer le choix invalide l’aperçu périmé');
    await panel.locator('[data-divine-action="calculate"]').click();
    await preview.waitFor({ timeout: 5000 });
    assert.match(await preview.innerText(), /Prière réussie · 5 DR/, 'revenir sur Aucun rétablit la pénalité');
  });

  // Un malus d'État unique ne doit pas être listé deux fois au détail (sinon le MJ lit −2 DR alors que le Test pèse −1).
  await screen('6b Prière : le malus de Sonné (−1 DR) n’apparaît qu’une fois au détail', async () => {
    const shield = (await page.evaluate(async () => (await import('/js/data/v5-divine-contracts.json', { with: { type: 'json' } })).default.contracts.find(c => c.canonicalName === 'Shield of Myrmidia'))) ;
    await boot({ mage: { talents: [{ id: shield.requiredTalent.catalogueTalentId, status: 'resolved', specialization: 'Myrmidia', rank: 1 }, talent('strong-minded')],
      skills: [{ id: 'pray', name: 'Pray', status: 'resolved', total: 80 }], prayers: [{ nom: shield.catalogueName }], states: [{ id: 'stun-1', key: 'sonne', name: 'Sonné', level: 1 }],
      caracs: { CC: 35, CT: 35, F: 30, E: 40, I: 45, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 80, M: 4 } }, v5: { divine: { sin: 0 }, baseCaracs: { Soc: 80 } } });
    const panel = page.locator('[data-divine-panel]');
    await panel.locator('summary').first().click();
    const prayerId = await page.locator('[aria-label="Prière divine"] option').evaluateAll(options => options.find(option => option.textContent.includes('Bouclier de Myrmidia'))?.value);
    assert.ok(prayerId, 'Bouclier de Myrmidia proposé');
    await page.locator('[aria-label="Prière divine"]').selectOption(prayerId);
    await page.waitForTimeout(300);
    await panel.locator('[aria-label="Destinataire Mage"]').check();
    await chooseBoolean(panel.locator('[aria-label="Mage · Portée / zone confirmée"]'), 'true');
    await chooseBoolean(panel.locator('[aria-label="Le personnage peut prononcer la prière"]'), 'true');
    await panel.locator('[aria-label="Fin de l’effet (choix du MJ)"]').selectOption('endOfRound');
    await panel.locator('[aria-label="Jet de Prière (d100)"]').fill('23');
    await panel.locator('[data-divine-action="calculate"]').click();
    await page.waitForSelector('.workspace-divine-preview');
    const preview = page.locator('.workspace-divine-preview');
    assert.match(await preview.innerText(), /Prière réussie · 5 DR/, 'Sonné −1 pèse sur le Test de Prière');
    const lines = await panel.locator('.workspace-source-detail p.workspace-formula-notes').allTextContents();
    const stateLines = lines.filter(line => /Sonné|pénalité d’État/i.test(line));
    assert.equal(stateLines.length, 1, 'lignes : ' + JSON.stringify(lines));
  });

  console.log(`${results.length - failed}/${results.length} parcours passent`);
  assert.equal(errors.length, 0, 'pageerror : ' + errors.join(' | '));
  assert.equal(failed, 0, `${failed} parcours en échec`);
  console.log('q6-t10-magie-browser: OK');
} finally { await browser.close(); server.close(); }
