import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { expect } from 'playwright/test';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = createStaticServer({ root, pages: { '/blank': '<!doctype html><title>Test Campagne</title>', '/favicon.ico': { status: 204 } }, headers: { 'Access-Control-Allow-Origin': '*' } });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('/blank')) console.error(`HTTP ${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => console.error(`Request failed ${request.url()}: ${request.failure()?.errorText}`));
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
  await page.goto(`${origin}/blank`);
  await page.setContent('<main id="mount"></main>');
  await page.addStyleTag({ url: `${origin}/MJ.css` });
  await page.addStyleTag({ url: `${origin}/js/ui/workspace.css` });
  await page.addStyleTag({ url: `${origin}/js/ui/campaign-workspace.css` });
  await page.evaluate(async ({ origin }) => {
    const { mountCampaignWorkspace } = await import(`${origin}/js/ui/campaign-workspace.js`);
    // Formes conformes à assertState et à la projection listAftermathSequelae du Store.
    const incident = (id, participantId, cause) => ({ id, participantId, source: { kind: 'wounds-lost', cause }, injuryDay: 0,
      status: 'open', bandaged: false, requiresSurgery: false, surgeryCompleted: false, subjectKind: 'person', infection: false, dailyChecks: [], treatments: [] });
    const state = { schemaVersion: 1, revision: 0, calendar: { schemaVersion: 1, originDay: 0, currentDay: 3 },
      incidents: [incident('w1', 'p1', 'Coup de lance'), incident('w2', 'absent', 'Chute')],
      diseases: [{ id: 'd1', participantId: 'p1', label: 'Fièvre', remainingDays: 2, status: 'active', careLog: [] }],
      sequelae: [{ id: 's1', participantId: 'p1', kind: 'broken-bone', status: 'open', label: 'Fracture', phase: 'awaiting-test' }], receipts: [] };
    const pending = [{ sequelaId: 's1', participantId: 'p1', kind: 'fracture-final-test', label: 'Fracture' }];
    const participants = [{ id: 'p1', name: 'Agnès', hp: 6, maxHp: 12 }, { id: 'p2', name: 'Bertin', hp: 10, maxHp: 10 }];
    const data = { state, pending, participants, calls: 0, seconds: 90061 };
    const Store = {
      getCampaignSeconds: () => data.seconds,
      getAftermathState: () => structuredClone(data.state),
      listAftermathSequelae: () => ({ day: data.state.calendar.currentDay, sequelae: structuredClone(data.state.sequelae), pending: structuredClone(data.pending), incidents: [], characteristics: {} }),
      listAftermathProposals: () => [{ participantId: 'p1', effectName: 'Entaille critique', criticalId: 'c1' }],
      listAftermathSubjects: () => structuredClone(data.participants),
      listFollowedCharacterConflicts: () => [],
      getAftermathRowLabel: () => '',
      getAftermathSubjectPlace: () => 'aucun'
    };
    window.campaignTest = { data, view: mountCampaignWorkspace({ root: document.querySelector('#mount'), Store, onAdvanceTime: () => { data.calls++; } }) };
  }, { origin });

  const mount = page.locator('#mount');
  await expect(mount.getByRole('heading', { name: 'Campagne', exact: true })).toBeVisible();
  await expect(mount).toContainText('1 j 1 h 1 min 1 s');
  await expect(mount).toContainText('Convalescence : jour 3');
  await expect(mount).toContainText('Test de fin de guérison');
  await expect(mount).toContainText('Entaille critique');
  await expect(mount).toContainText('Coup de lance');
  await expect(mount).toContainText('Fièvre');
  await expect(mount).toContainText('Fracture');
  const absent = mount.getByRole('button', { name: /Ancien suivi/ });
  await absent.click();
  await expect(mount.getByLabel('Détail du suivi')).toContainText('Chute');
  await expect(mount.getByLabel('Détail du suivi')).toContainText('Ancien suivi sans personnage');
  await mount.getByRole('button', { name: 'Avec suivi' }).click();
  await expect(mount.getByRole('button', { name: /Bertin/ })).toHaveCount(0);
  await expect(absent).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => window.campaignTest.view.render());
  await expect(mount.getByRole('button', { name: 'Avec suivi' })).toBeFocused();
  await expect(mount.getByRole('button', { name: 'Avec suivi' })).toHaveAttribute('aria-pressed', 'true');
  await absent.click();
  await page.evaluate(() => window.campaignTest.view.render());
  await expect(absent).toBeFocused();
  await expect(absent).toHaveAttribute('aria-pressed', 'true');
  await mount.getByRole('button', { name: 'Avancer le temps…' }).click();
  assert.equal(await page.evaluate(() => window.campaignTest.data.calls), 1);
  for (const width of [1440, 900, 520]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `débordement horizontal à ${width}px`);
  }

  // Un registre et une rencontre vides ne doivent pas être représentés comme un suivi fictif.
  await page.evaluate(async ({ origin }) => {
    const { createAftermathState } = await import(`${origin}/js/core/v5-aftermath.js`);
    const { mountCampaignWorkspace } = await import(`${origin}/js/ui/campaign-workspace.js`);
    window.campaignTest.view.destroy();
    const Store = { getCampaignSeconds: () => null, getAftermathState: () => createAftermathState(), listAftermathSubjects: () => [], listFollowedCharacterConflicts: () => [], getAftermathRowLabel: () => '', getAftermathSubjectPlace: () => 'aucun', listAftermathSequelae: () => ({ sequelae: [], pending: [] }), listAftermathProposals: () => [] };
    window.campaignTest.empty = mountCampaignWorkspace({ root: document.querySelector('#mount'), Store });
  }, { origin });
  await expect(mount).toContainText('Aucun participant ni personnage suivi');
  await expect(mount).toContainText('Aucun personnage sélectionné');
  await expect(mount).not.toContainText('Campagne indisponible');
  assert.deepEqual(errors, []);
  console.log('Campagne : données, sélection, filtre, focus, temps et état vide : OK.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
