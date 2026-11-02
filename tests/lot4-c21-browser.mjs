import assert from 'node:assert/strict';
import { startApp, openNewProfileForm } from './helpers/lot4-ca-app.mjs';

// C21 (G-BASE-1) : les anciens champs « Bras » / « Jambes » ne doivent pas rester visibles,
// et les PA par membre saisis doivent survivre à la création du profil.
const app = await startApp();
try {
  const { page } = app;
  const form = await openNewProfileForm(page);
  assert.equal(await form.locator('[name=armor_arms]').isVisible(), false, 'champ résumé « Bras » masqué (hidden annulé par label { display:flex } ?)');
  assert.equal(await form.locator('[name=armor_legs]').isVisible(), false, 'champ résumé « Jambes » masqué');
  assert.equal(await form.locator('[name=armor_rightArm]').isVisible(), true);
  await form.locator('[name=name]').fill('Recette PA membres');
  await form.locator('[name=armor_rightArm]').fill('3');
  await form.locator('[name=armor_rightLeg]').fill('4');
  await form.locator('#btn-submit-form').click();
  await page.locator('#reserve-list').getByText('Recette PA membres').waitFor();
  const stored = await page.evaluate(async () => {
    const { Store } = await import('/js/main.js');
    const p = Store.listProfiles().find(item => item.name === 'Recette PA membres');
    return { armor: p.armor, extArmor: p.extensions?.armorLocations ?? p.extensions?.v5?.armorLocations ?? null };
  });
  assert.equal(stored.armor.arms, 3, 'PA Bras conservés');
  assert.equal(stored.armor.legs, 4, 'PA Jambes conservés');
  assert.deepEqual(app.errors, []);
  console.log('lot4-c21-browser: OK');
} finally { await app.close(); }
