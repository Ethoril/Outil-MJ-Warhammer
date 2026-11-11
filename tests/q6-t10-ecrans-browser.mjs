import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';
import { chooseConfirmation } from './helpers/confirmation.mjs';
import { openU1TurnActions, openU1Settings, openU1Types } from './helpers/u1-drawer.mjs';

// Q6 T10 (docs/specs/tests-secondaires-agregateur/) : chaque question du calcul commun d'un Test a son champ de réponse à l'écran.
// Un parcours par écran : amener l'acteur dans le cas qui pose la question, répondre via le champ, vérifier que le Test se résout.
// Application complète (vrai Store, seed JSON) ; à lancer sous `timeout 120 node tests/q6-t10-ecrans-browser.mjs`.
const root = fileURLToPath(new URL('../', import.meta.url)), base = '/Outil-MJ-Warhammer/';
const server = createStaticServer({ root, base, headers: { 'Cache-Control': 'no-store' } });

const ATHLETICS = 'skill-41_74_68_6c_e9_74_69_73_6d_65-base';
const fighter = (id, name, camp, extra = {}) => ({ id, name, kind: camp === 'ennemi' ? 'PNJ' : 'PJ', camp, zone: 'active', initiative: id === 'b' ? 35 : 60, hp: 30, maxHp: 30,
  caracs: { CC: 60, CT: 50, F: 45, E: 40, I: 50, Ag: 45, Dex: 45, Int: 45, FM: 40, Soc: 35, M: 4 },
  skills: [], actions: [], equipment: [], traits: [], talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const RESISTANCE = 'skill-52_e9_73_69_73_74_61_6e_63_65-base', CALM = 'skill-43_61_6c_6d_65-base';
const withSkills = (extra = {}) => ({ species: 'Human', size: 'average', ...extra, skills: [{ id: RESISTANCE, name: 'Résistance', carac: 'E', status: 'resolved', total: 50 }, { id: CALM, name: 'Calme', carac: 'FM', status: 'resolved', total: 50 }, ...(extra.skills || [])] });
const PRONE = { id: 'prone-1', key: 'aterre', name: 'À terre', level: 1 };
const OBSTINATE = { id: 'talent-strong-minded', name: 'Obstiné', status: 'resolved', rank: 1 };
const seed = (participants, extra = {}) => ({ schemaVersion: 3, reserve: [], diceLines: [], log: [], extensions: { v5: { combatId: 'q6-t10', turnIndex: 1 } },
  combat: { round: 1, currentActorId: participants[0].id, order: participants.map(row => row.id), participants }, ...extra });

// Les effets de séquelle sont une projection du registre de convalescence (`aftermathRegister`) : on charge un vrai registre.
const tornLeg = participantId => ({ id: `tear-${participantId}`, participantId, incidentId: 'inc', key: 'tear', label: 'Déchirure musculaire', kind: 'torn-muscle', status: 'open', severity: 'minor', part: 'leg', side: 'left', startDay: 0, endDay: 30, toughnessBonus: 3, reducedDays: 0, history: [] });
const registerWith = sequelae => ({ extensions: { v5: { combatId: 'q6-t10', turnIndex: 1, aftermathRegister: { schemaVersion: 1, revision: 0, calendar: { schemaVersion: 1, originDay: 0, currentDay: 0 }, incidents: [], diseases: [], sequelae, receipts: [] } } } });
const results = [];
let browser, page;
const errors = [];
const load = state => page.evaluate(async value => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready; await Store.loadFromJSON(value); }, state);
const parcours = async (name, body) => {
  const before = errors.length;
  try { await body(); assert.equal(errors.length, before, `pageerror : ${errors.slice(before).join(' | ')}`); results.push([name, true]); console.log(`OK    ${name}`); }
  catch (error) { results.push([name, false, error]); console.log(`ECHEC ${name}\n${String(error.stack || error).split('\n').slice(0, 14).join('\n')}`); }
};

try {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  browser = await launchBrowser();
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}${base}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });
  await page.locator('#tab-combat').click();
  const combat = page.locator('#workspace-root');

  // Écran 1 : panneau de résolution, Croche-pied sur une cible montée Brisée.
  await parcours('1. Croche-pied monté : question de la chute posée dans « À préciser pour les Tests secondaires »', async () => {
    const whip = { id: 'whip', kind: 'weapon', name: 'Fouet', category: 'Base', reach: 'Très longue', hands: 1, keywords: [{ id: 'croche-pied' }] };
    const skill = 'skill-43_6f_72_70_73_20_e0_20_63_6f_72_70_73-42_61_73_65';
    await load(seed([
      fighter('a', 'Aline', 'pj', { extensions: { v5: { hasMomentum: false } }, skills: [{ id: skill, name: 'Corps à corps (Base)', status: 'resolved', total: 65, advances: 5, carac: 'CC' }],
        equipment: [whip], actions: [{ id: 'whip-strike', note: 'Coup de fouet', type: 'attack', attr: 'CC', base: 65, damage: 4, qualities: [{ id: 'croche-pied' }], extensions: { fiche: { equipmentId: 'whip', skillId: skill }, v5: { kind: 'melee' } } }] }),
      fighter('b', 'Garde', 'ennemi', { caracs: { CC: 45, CT: 40, F: 40, E: 20, I: 35, Ag: 35, Dex: 35, Int: 30, FM: 35, Soc: 25, M: 4 },
        skills: [{ id: ATHLETICS, name: 'Athlétisme', status: 'resolved', total: 35, carac: 'Ag' }], extensions: { v5: { hasMomentum: false, mounted: true } } })]));
    await combat.locator('[data-workspace-select="a"]').click();
    await combat.getByRole('textbox', { name: 'Attaque (CC 65)' }).fill('20');
    await combat.getByRole('textbox', { name: /Jet de défense/ }).fill('80');
    await combat.getByRole('button', { name: 'Calculer', exact: true }).click();
    await combat.locator('.workspace-resolution-footer').getByRole('button', { name: /Appliquer .* à Garde/ }).click();
    await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.getCombat().participants.get('b')?.hp < 30; });
    // La cible, Brisée, doit préciser si elle fuit ou se cache avant le Test d'Endurance de la chute.
    await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.updateParticipant('b', { states: [{ id: 'broken-1', key: 'brise', name: 'Brisé', level: 1 }] }); });
    await openU1TurnActions(combat);
    await combat.getByRole('combobox', { name: 'Attaque réussie déjà appliquée ce Tour' }).selectOption({ index: 1 });
    await combat.getByRole('combobox', { name: 'Athlétisme de Garde' }).selectOption(ATHLETICS);
    await combat.getByRole('button', { name: 'Préparer le Croche-pied' }).click();
    const endurance = combat.getByRole('spinbutton', { name: 'Test d’Endurance de Garde (d100, si perte après protection > BE)' });
    await endurance.fill('10'); await endurance.press('Tab');
    await combat.getByRole('textbox', { name: 'Attaque (CC 65)' }).fill('15');
    await combat.getByRole('textbox', { name: /Jet de défense/ }).fill('85');
    await combat.getByRole('button', { name: 'Calculer', exact: true }).click();
    const live = combat.locator('.workspace-result-live');
    await live.waitFor();
    const block = combat.locator('.workspace-test-questions').filter({ hasText: 'À préciser pour les Tests secondaires' });
    await block.waitFor();
    assert.match(await live.innerText(), /Endurance : à préciser/, 'la question bloque d’abord le résultat');
    const select = block.locator('select').first();
    assert.equal(await select.inputValue(), '', 'aucune réponse présumée');
    assert.deepEqual(await select.locator('option').allTextContents(), ['À préciser', 'Oui', 'Non']);
    await select.selectOption('false');
    await page.waitForFunction(() => !document.querySelector('.workspace-result-live')?.innerText.includes('Endurance : à préciser'));
    assert.equal(await combat.locator('.workspace-test-questions').filter({ hasText: 'À préciser pour les Tests secondaires' }).count(), 0, 'plus de question une fois répondue');
    assert.match(await live.innerText(), /Chute verticale de 2 m/);
    await openU1Settings(combat);
    // La défense de la Brisée pose sa propre question (écran existant des circonstances), distincte de celle de la chute.
    await chooseConfirmation(page.getByRole('group', { name: 'Le Test sert à fuir ou se cacher (défense)' }), 'false');
    if (await combat.getByRole('button', { name: 'Calculer', exact: true }).count()) await combat.getByRole('button', { name: 'Calculer', exact: true }).click();
    await combat.locator('.workspace-resolution-footer').getByRole('button', { name: /Enregistrer le résultat/ }).click();
    await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); const t = Store.getCombat().participants.get('b'); return t?.extensions?.v5?.mounted === false && (t.states || []).some(s => s.key === 'aterre'); });
  });

  // Écran 2 : Filet, Test de Force pour s'échapper d'un Empêtré dont la source participante est Inconsciente ou À terre.
  const netScene = (sourceStates, kind = 'wielder') => seed([
    fighter('v', 'Victime', 'pj', { caracs: { CC: 40, CT: 40, F: 40, E: 30, I: 40, Ag: 40, Dex: 35, Int: 30, FM: 35, Soc: 25, M: 4 },
      states: [{ id: 'net-state', key: 'enchevetre', name: 'Empêtré', level: 2, strength: 35, source: { kind: 'quality', entanglementKind: kind, hookedNet: true, authorId: 's', escapeStrength: 35 } }],
      actions: [{ id: 'net-escape', note: 'Sortir du filet', type: 'test', attr: 'F', base: 50, damage: null, qualities: [] }] }),
    fighter('s', 'Fileur', 'ennemi', { caracs: { CC: 35, CT: 30, F: 30, E: 30, I: 30, Ag: 30, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 }, states: sourceStates })]);
  const openNetEscape = async () => {
    await combat.locator('[data-workspace-select="v"]').click();
    await combat.locator('[data-action-key="net-escape"]').click();
    await openU1Types(combat);
    await combat.getByLabel('Type d’action').selectOption('test');
    await openU1Settings(combat);
    const summary = combat.getByText('Circonstances des Tests');
    if (!(await summary.evaluate(el => el.closest('details')?.open))) await summary.click();
    await combat.getByLabel('Sortie d’entrave : état Empêtré').selectOption('net-state');
    await combat.locator('[data-roll-input="attack"]').fill('20');
  };
  await parcours('2a. Filet : la source Inconsciente lâche prise, pas de d100 opposé', async () => {
    await load(netScene([{ id: 'ko', key: 'inconscient', name: 'Inconscient', level: 1 }]));
    await openNetEscape();
    const note = combat.locator('[data-net-source-let-go="s"]');
    await note.waitFor();
    assert.match(await note.innerText(), /Fileur est Inconsciente : elle lâche prise/);
    assert.match(await note.innerText(), /Filet à crochets ne fait pas de dégâts/);
    assert.equal(await combat.getByLabel(/Jet d100 opposé/).count(), 0, 'aucun champ de jet opposé');
    assert.equal(await combat.getByLabel('Filet à crochets : dégâts MJ (armure ignorée)').count(), 0, 'pas de dégâts à saisir');
    await combat.getByRole('button', { name: 'Calculer', exact: true }).click();
    const live = combat.locator('.workspace-result-live');
    await live.waitFor();
    assert.doesNotMatch(await live.innerText(), /Filet : saisir|à préciser/i, 'rien ne bloque le Test');
    await combat.locator('.workspace-resolution-footer').getByRole('button', { name: /Appliquer|Enregistrer le résultat/ }).click();
    await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return (Store.listParticipants().find(row => row.id === 'v').states.find(row => row.id === 'net-state')?.level ?? 0) === 0; });
    assert.equal(await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.listParticipants().find(row => row.id === 'v').hp; }), 30, 'le Filet à crochets ne fait pas de dégâts');
  });
  await parcours('2b. Filet : la source consciente garde son d100 opposé, pas de note « lâche prise »', async () => {
    await load(netScene([]));
    await openNetEscape();
    await combat.getByLabel(/Jet d100 opposé/).waitFor();
    assert.equal(await combat.locator('[data-net-source-let-go]').count(), 0);
  });
  await parcours('2c. Filet : la source À terre pose la question de sa Force, répondue par son champ', async () => {
    await load(netScene([{ id: 'prone-1', key: 'aterre', name: 'À terre', level: 1 }]));
    await openNetEscape();
    await combat.getByLabel(/Jet d100 opposé/).fill('20');
    await combat.getByLabel(/Jet d100 opposé/).press('Tab');
    await combat.getByLabel('Filet à crochets : dégâts MJ (armure ignorée)').fill('0');
    await combat.getByLabel('Filet à crochets : dégâts MJ (armure ignorée)').press('Tab');
    await combat.getByRole('button', { name: 'Calculer', exact: true }).click();
    const live = combat.locator('.workspace-result-live');
    await live.waitFor();
    const block = combat.locator('.workspace-test-questions').filter({ hasText: 'À préciser pour les Tests secondaires' });
    await block.waitFor();
    assert.match(await block.innerText(), /Fileur/, 'la question dit quelle source est interrogée');
    await block.locator('select').first().selectOption('false');
    await page.waitForFunction(() => document.querySelectorAll('.workspace-test-questions select').length === 0
      || ![...document.querySelectorAll('.workspace-test-questions select')].some(select => select.value === ''));
    assert.match(await live.innerText(), /Sortie de filet/);
  });

  // Écran 3 : Corruption, exposition de fin de séance d'un personnage À terre.
  await parcours('3. Corruption : l’exposition d’un personnage À terre pose sa question, puis s’enregistre', async () => {
    await load(seed([fighter('hero', 'Héros', 'pj', withSkills({ states: [PRONE], extensions: { v5: { corruptionPoints: 0 } } }))]));
    await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.startTalentSession(); });
    await combat.locator('[data-workspace-select="hero"]').click();
    const details = combat.locator('details[data-secondary-panel="corruption"]');
    await details.waitFor();
    if (!(await details.evaluate(el => el.open))) await details.locator(':scope > summary').click();
    await details.getByLabel('Sources d’exposition déclarées (une par ligne)').fill('Artefact souillé');
    await details.getByLabel('Influence corruptrice').selectOption('moderate');
    await details.getByLabel('Jet du Test de Corruption (d100)').fill('35');
    await details.getByRole('button', { name: 'Calculer l’exposition', exact: true }).click();
    const box = details.locator('.workspace-test-questions');
    await box.waitFor();
    assert.match(await box.innerText(), /À préciser avant le Test de Corruption/);
    assert.equal(await details.getByRole('button', { name: 'Enregistrer l’exposition', exact: true }).count(), 0, 'pas d’enregistrement tant que la question est ouverte');
    const select = box.locator('select');
    assert.equal(await select.count(), 1);
    assert.equal(await select.inputValue(), '');
    await select.selectOption('false');
    await details.getByRole('button', { name: 'Enregistrer l’exposition', exact: true }).waitFor();
    const text = await details.innerText();
    assert.doesNotMatch(text, /sequelaUses:|involvesMovement|runningOrHiding|reliesOnSight/, 'aucun nom technique à l’écran');
    await details.getByRole('button', { name: 'Enregistrer l’exposition', exact: true }).click();
    await details.getByText(/Exposition enregistrée/).waitFor();
    assert.equal(await details.locator('.workspace-test-questions').count(), 0, 'la réponse ne survit pas à l’enregistrement');
  });

  // Écran 4 : extraction de projectile, soigneur À terre.
  await parcours('4. Extraction de projectile : le soigneur À terre répond à la question de son Test de Guérison', async () => {
    const heal = { id: 'heal', name: 'Guérison', carac: 'Int', status: 'resolved', total: 50 };
    await load(seed([fighter('hero', 'Héros', 'pj', withSkills({ states: [PRONE], skills: [heal], extensions: { v5: { lodgedProjectiles: [{ id: 'arrow', ammunitionId: 'fleche', removal: 'heal-test' }] } } }))]));
    await combat.locator('[data-workspace-select="hero"]').click();
    const chip = combat.locator('.workspace-equipment-chip').filter({ hasText: 'Projectiles fichés' });
    await chip.waitFor();
    if (!(await chip.evaluate(el => el.open))) await chip.locator(':scope > summary').click();
    const panel = chip.locator('.workspace-impaled-projectiles');
    await panel.getByLabel('Compétence Guérison — Héros').selectOption('heal');
    await panel.getByLabel('d100 du Test de Guérison — Héros').fill('35');
    assert.equal(await panel.getByLabel('Talent à choisir avant le jet').count(), 0, 'pas d’Obstiné sans le talent');
    assert.equal(await panel.locator('.workspace-test-questions').count(), 0, 'rien n’est demandé avant le premier clic');
    await panel.getByRole('button', { name: 'Enregistrer le retrait' }).click();
    const box = panel.locator('.workspace-test-questions');
    await box.waitFor();
    assert.match(await box.innerText(), /À préciser avant le Test de Guérison/);
    assert.equal(await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.listParticipants().find(row => row.id === 'hero').extensions.v5.lodgedProjectiles[0].removed === true; }), false, 'rien n’est retiré sans réponse');
    await box.locator('select').selectOption('false');
    await panel.getByRole('button', { name: 'Enregistrer le retrait' }).click();
    await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.listParticipants().find(row => row.id === 'hero').extensions.v5.lodgedProjectiles.every(row => row.removed === true); });
  });

  // Écran 5 : embuscade, dialogue d'initiative (main.js), cavalier Surpris dont le Test de Chevaucher pose une question.
  await parcours('5. Embuscade : le cavalier Brisé répond à la question de son Test de Chevaucher dans le dialogue d’initiative', async () => {
    const ride = { id: 'skill-ride', name: 'Chevaucher', carac: 'Ag', status: 'resolved', total: 55 };
    const rider = fighter('rider', 'Cavalier', 'ambush', { kind: 'PJ', initiative: 50, skills: [ride], states: [{ id: 'broken-1', key: 'brise', name: 'Brisé', level: 1 }], extensions: { v5: { mounted: true, mountId: 'horse' } } });
    const horse = { id: 'horse', name: 'Destrier', kind: 'Créature', camp: 'ambush', zone: 'active', initiative: 30, hp: 30, maxHp: 30, size: 'large', caracs: { F: 50, I: 30 }, traits: [], states: [], skills: [], equipment: [], extensions: { v5: {} } };
    const foe = fighter('foe', 'Brigand', 'heroes', { initiative: 40, caracs: { CC: 40, I: 40, Ag: 40, F: 40, E: 40 } });
    const state = seed([rider, horse, foe]);
    state.combat.round = 0; state.combat.currentActorId = null;
    await load(state);
    await page.locator('#combat-banner .combat-banner-primary').click();
    const dialog = page.locator('dialog.tool-sheet');
    await dialog.waitFor({ state: 'visible' });
    for (const [id, die] of [['rider', 5], ['horse', 4], ['foe', 3]]) {
      const characteristic = dialog.locator(`input[name="characteristic:${id}"]`);
      if (await characteristic.count() && await characteristic.isEditable() && await characteristic.inputValue() === '') await characteristic.fill('40');
      const dieInput = dialog.locator(`input[name="die:${id}"]`);
      if (await dieInput.isEditable()) await dieInput.fill(String(die));
    }
    await dialog.locator('select[name="surprisedCamp"]').selectOption('ambush');
    await dialog.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
    const roll = dialog.locator('[data-mounted-rider="rider"][data-field="roll"]');
    await roll.waitFor();
    await roll.fill('40');
    await dialog.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
    const question = dialog.locator('select[data-ride-condition]');
    await question.waitFor();
    assert.equal(await question.getAttribute('data-ride-condition'), 'rideCondition:rider:runningOrHiding');
    assert.match(await question.getAttribute('aria-label'), /fuir ou se cacher/);
    assert.deepEqual(await question.locator('option').allTextContents(), ['À préciser', 'Oui', 'Non']);
    assert.equal(await dialog.getByRole('button', { name: 'Confirmer et appliquer' }).isHidden(), true, 'le calcul n’est pas prêt tant que la question est ouverte');
    await question.selectOption('false');
    await dialog.getByRole('button', { name: 'Confirmer et appliquer' }).waitFor({ state: 'visible' });
    assert.match(await dialog.innerText(), /Cavalier : Chevaucher 40/, 'le Test de Chevaucher est calculé');
    assert.equal(await dialog.locator('select[data-ride-condition]').count(), 0, 'la question répondue ne bloque plus');
    await dialog.getByRole('button', { name: 'Confirmer et appliquer' }).click();
    await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.getCombat().round === 1; });
  });

  // Écran 6 : fuite de Brisé, Sprint avec une séquelle de jambe.
  await parcours('6. Sprint de Brisé : la question de zone (jambe gauche) se répond, l’aperçu est prêt', async () => {
    const athletics = { id: 'skill-athletics', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total: 60 };
    const priest = fighter('priest', 'Prêtresse', 'pj', { initiative: 60, hp: 20, skills: [athletics], states: [{ id: 'qa-broken', key: 'brise', name: 'Brisé', level: 1 }] });
    await load(seed([priest, fighter('enemy', 'Adversaire', 'ennemi', { initiative: 30 })], registerWith([tornLeg('priest')])));
    const actor = page.locator('[data-broken-escape-actor="priest"]');
    await actor.waitFor();
    // Étape 1 : Move (Flee), requis avant le Sprint.
    await actor.getByLabel('Visibilité par rapport aux ennemis', { exact: true }).selectOption('true');
    await actor.getByLabel('Ennemis engagés avec ce personnage', { exact: true }).selectOption('none');
    await actor.getByLabel('Déplacement Flee', { exact: true }).selectOption('walk');
    await actor.getByLabel('Visibilité après cette étape', { exact: true }).selectOption('true');
    await actor.getByRole('button', { name: 'Calculer l’aperçu', exact: true }).click();
    await actor.getByRole('button', { name: 'Appliquer Move (Flee)', exact: true }).click();
    await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.whenIdle(); return (JSON.parse(Store.getFullJSON()).extensions?.v5?.brokenEscape?.receipts || []).some(row => row.actorId === 'priest' && row.action === 'flee'); });
    // Étape 2 : Sprint.
    await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.whenIdle(); });
    await page.waitForTimeout(300);
    await actor.getByLabel('Visibilité par rapport aux ennemis', { exact: true }).selectOption('true');
    await actor.getByLabel('Visibilité après cette étape', { exact: true }).selectOption('false');
    await actor.getByLabel('Jet d’Athlétisme pour Sprint', { exact: true }).fill('23');
    await actor.getByRole('button', { name: 'Calculer l’aperçu', exact: true }).click();
    const box = actor.locator('.workspace-test-questions');
    await box.waitFor({ timeout: 2500 }).catch(async () => assert.fail(`la question de zone n’est pas posée ; le panneau dit : « ${(await actor.locator('.workspace-error, [role="alert"], .workspace-muted').allInnerTexts()).join(' / ')} »`));
    assert.match(await box.innerText(), /À préciser avant le Test d’Athlétisme/);
    assert.match(await box.innerText(), /jambe gauche/, 'la zone est lisible');
    assert.doesNotMatch(await actor.innerText(), /sequelaUses:|leg:left/, 'aucun nom technique');
    assert.equal(await actor.getByRole('button', { name: 'Appliquer Action (Sprint)', exact: true }).isDisabled(), true, 'pas d’application tant que la zone n’est pas précisée');
    // « Oui » (la jambe blessée sert) coûte 1 DR de plus que « Non » : les deux réponses donnent un aperçu prêt et différent.
    const sl = async answer => {
      await actor.locator('.workspace-test-questions select').first().selectOption(answer);
      await actor.getByRole('button', { name: 'Appliquer Action (Sprint)', exact: true }).waitFor();
      return actor.locator('[data-broken-escape-preview="priest"]').innerText();
    };
    const spared = await sl('false');
    assert.match(spared, /Aperçu : aucun effet appliqué/);
    const uses = await sl('true');
    assert.notEqual(uses, spared, 'la réponse change le calcul');
    const drs = text => Number(/(-?\d+) DR/.exec(text.replace('−', '-'))?.[1]);
    assert.equal(drs(uses), drs(spared) - 1, `la jambe blessée pèse 1 DR quand elle sert : ${drs(spared)} puis ${drs(uses)}`);
    await actor.getByRole('button', { name: 'Appliquer Action (Sprint)', exact: true }).click();
    await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.whenIdle(); return (JSON.parse(Store.getFullJSON()).extensions?.v5?.brokenEscape?.receipts || []).some(row => row.actorId === 'priest' && row.action === 'sprint'); });
  });

  // Écran 7 : convalescence, deux patients À terre avec une blessure ouverte, avance d'un jour.
  await parcours('7. Convalescence : une question par patient, nommé, puis l’avance est enregistrée', async () => {
    const patient = (id, name, extra = {}) => fighter(id, name, 'pj', withSkills({ hp: 5, maxHp: 20, states: [PRONE], ...extra }));
    await load(seed([patient('a', 'Alma'), patient('b', 'Bruno', { talents: [OBSTINATE] })]));
    for (const id of ['a', 'b']) {
      const receipt = await page.evaluate(async id => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return (await Store.registerAftermathIncident({ operationId: `reg-${id}`, participantId: id, cause: 'combat' })).receipt.status; }, id);
      assert.equal(receipt, 'applied');
    }
    const suites = combat.locator('details.workspace-aftermath');
    await suites.waitFor();
    if (!(await suites.evaluate(el => el.open))) await suites.locator(':scope > summary').click();
    const panel = suites.locator('[aria-label="Suivi des séquelles et convalescence"]');
    const status = panel.locator('.workspace-aftermath-status');
    // Obstiné : proposé au patient qui a le talent, et à lui seul.
    assert.equal(await panel.getByLabel('Obstiné avant le jet — Bruno').count(), 1);
    assert.equal(await panel.getByLabel('Obstiné avant le jet — Alma').count(), 0);
    await panel.getByLabel('Jours à avancer').fill('1');
    await panel.getByRole('button', { name: 'Aperçu des échéances' }).click();
    await panel.getByLabel('d100 du jour 0 pour Alma').fill('30');
    await panel.getByLabel('d100 du jour 0 pour Bruno').fill('30');
    const confirm = panel.getByRole('button', { name: 'Confirmer l’avancement' });
    await confirm.click();
    // Premier refus : la question de la seule Alma, nommée.
    const box = panel.locator('.workspace-test-questions');
    await box.waitFor();
    assert.match(await status.innerText(), /exige une précision/);
    assert.equal(await box.locator('select').count(), 1);
    assert.match(await box.innerText(), /Alma/);
    assert.doesNotMatch(await box.innerText(), /Bruno/);
    assert.equal(await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.getAftermathState().calendar.currentDay; }), 0, 'le calendrier n’avance pas sans réponse');
    await box.locator('select').selectOption('false');
    await confirm.click();
    // Deuxième refus : Alma a répondu, c’est au tour de Bruno, qui n’hérite pas de la réponse d’Alma.
    await page.waitForFunction(() => /Bruno/.test(document.querySelector('.workspace-aftermath .workspace-test-questions')?.textContent || ''));
    const second = panel.locator('.workspace-test-questions');
    assert.match(await second.innerText(), /Bruno/);
    const selects = second.locator('select');
    const values = await selects.evaluateAll(list => list.map(select => [select.getAttribute('aria-label'), select.value]));
    const bruno = values.find(([label]) => /Bruno/.test(label));
    assert.ok(bruno, JSON.stringify(values));
    assert.equal(bruno[1], '', 'la réponse d’Alma ne vaut pas pour Bruno');
    const alma = values.find(([label]) => /Alma/.test(label));
    if (alma) assert.equal(alma[1], 'false', 'la réponse d’Alma reste visible et corrigeable');
    await second.getByLabel(/Bruno/).selectOption('true');
    await confirm.click();
    await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.getAftermathState().calendar.currentDay === 1; });
    assert.equal(await panel.locator('.workspace-test-questions').count(), 0, 'plus de question une fois l’avance enregistrée');
  });

  // Écran 8 : plateau, désengagement d'un acteur qui a Obstiné.
  await parcours('8. Désengagement : Obstiné proposé avant le jet, le malus ramené à 0 reste visible dans le détail', async () => {
    const stunned = { id: 'stun-1', key: 'sonne', name: 'Sonné', level: 1 };
    await load(seed([
      fighter('gunther', 'Gunther', 'pj', { initiative: 60, states: [stunned], talents: [OBSTINATE] }),
      fighter('orc', 'Orc', 'ennemi', { initiative: 50, skills: [{ name: 'Corps à corps (Base)', total: 55 }] })]));
    await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.engageParticipants('gunther', 'orc'); });
    await combat.locator('[data-workspace-select="gunther"]').click();
    await combat.locator('.workspace-action-bar').getByRole('button', { name: /^Se désengager/ }).click();
    const form = combat.locator('.workspace-disengage');
    await form.locator('.workspace-disengage-detail').waitFor();
    const struck = () => form.locator('.workspace-disengage-detail s').allInnerTexts();
    const obstinate = form.getByLabel('Obstiné avant le jet — Gunther');
    assert.equal(await obstinate.count(), 1, 'Obstiné est proposé à l’acteur qui a le talent');
    assert.equal(await form.getByLabel('Obstiné avant le jet — Orc').count(), 0, 'et pas à l’Orc, qui ne l’a pas');
    assert.equal(await obstinate.inputValue(), 'none', 'aucun choix présumé');
    assert.deepEqual(await struck(), [], 'sans Obstiné, aucun malus n’est barré');
    assert.match(await form.locator('.workspace-disengage-detail').innerText(), /Gunther · Plus forte pénalité d’État \(État\) : −1 DR/);
    await obstinate.selectOption('strong-minded');
    await page.waitForFunction(() => document.querySelector('[aria-label="Obstiné avant le jet — Gunther"]')?.value === 'strong-minded');
    assert.equal(await form.getByLabel('Obstiné avant le jet — Gunther').inputValue(), 'strong-minded', 'le choix reste affiché');
    // Acceptation T10 : « malus ramené à 0 et visible ». Le malus de Sonné reste lisible dans le détail, barré ou à 0 DR.
    const detail = form.locator('.workspace-disengage-detail');
    const visible = (await detail.count()) ? await detail.innerText() : '';
    const line = visible.split('\n').find(text => /Gunther · .*pénalité d’État/.test(text));
    assert.ok(line, `Obstiné doit laisser le malus visible dans le détail (barré ou à 0 DR) ; détail obtenu : « ${visible} »`);
    assert.ok((await struck()).some(text => /Gunther · .*pénalité d’État/.test(text)) || /[−-]?0 DR|±0|écarté/.test(line), `malus ni barré ni à 0 : « ${line} »`);
    // Revenir sur le choix rend le malus.
    await form.getByLabel('Obstiné avant le jet — Gunther').selectOption('none');
    await page.waitForFunction(() => /Plus forte pénalité d’État \(État\) : −1 DR/.test(document.querySelector('.workspace-disengage-detail')?.textContent || ''));
  });

  console.log(`${results.filter(row => row[1]).length}/${results.length} parcours passent`);
  if (results.some(row => !row[1])) process.exitCode = 1;
} finally { await browser?.close(); await new Promise(done => server.close(done)); }
