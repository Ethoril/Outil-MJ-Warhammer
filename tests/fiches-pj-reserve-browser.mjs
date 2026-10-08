import assert from 'node:assert/strict';
import { expect } from 'playwright/test';

/** Browser contract invoked by the normal app smoke, with Firebase mocked only at its module boundary. */
export async function testFicheReserveEditor(page, openWorkspaceProfileEditor) {
    // A linked PJ keeps its source baseline, asymmetric PA and action identity through a real save.
    await page.evaluate(async () => {
      const { Store } = await import('/js/main.js');
      const { getReferenceCatalogue } = await import('/js/core/reference-catalog.js');
      const weapon = { ...structuredClone(getReferenceCatalogue().items.find(row => row.kind === 'weapon')), id: 'browser-weapon', custom: true };
      await Store.addProfile({ id: 'browser-linked-pj', name: 'PJ lié recette', kind: 'PJ', hp: 8, maxHp: 14, initiative: 51,
        caracs: { CC: 57, F: 40, E: 43 }, extensions: { ficheId: 'caelel' }, equipment: [weapon],
        armorLocations: { head: 0, body: 2, rightArm: 3, leftArm: 1, rightLeg: 2, leftLeg: 0 },
        diceLines: [{ id: 'browser-source-action', type: 'attack', note: 'Arme de fiche', base: '', damage: 'BF+4',
          extensions: { fiche: { charId: 'caelel', equipmentId: 'browser-weapon', role: 'attack', bindingVersion: 1, requiresLink: true } } },
          { id: 'browser-local-action', type: 'skill', note: 'Action locale', base: 42, extensions: { kept: 'local' } }] });
    });
    const linked = await openWorkspaceProfileEditor(page, 'PJ lié recette');
    await expect(linked.form.locator('#fiche-source-notice')).toBeVisible();
    for (const name of ['hp', 'initiative', 'CC', 'F', 'E', 'armor_rightArm', 'armor_leftArm']) {
      await expect(linked.form.locator(`[name=${name}]`)).toHaveJSProperty('readOnly', true);
    }
    const sourceRow = linked.form.locator('#form-dice-list .row').first();
    await expect(sourceRow.locator('.pf-dice-base')).toBeDisabled();
    await expect(sourceRow.locator('.pf-dice-note')).toBeDisabled();
    await sourceRow.locator('.pf-dice-mod').fill('5');
    await linked.form.locator('[name=notes]').fill('Note locale conservée');
    await linked.form.locator('#btn-submit-form').click();
    const savedLinked = await page.evaluate(async () => {
      const { Store } = await import('/js/main.js'); return JSON.parse(JSON.stringify(Store.getProfile('browser-linked-pj')));
    });
    assert.equal(savedLinked.hp, 8); assert.equal(savedLinked.maxHp, 14);
    assert.equal(savedLinked.armorLocations.rightArm, 3); assert.equal(savedLinked.armorLocations.leftArm, 1);
    assert.equal(savedLinked.diceLines.length, 2);
    assert.equal(savedLinked.diceLines[0].id, 'browser-source-action');
    assert.equal(savedLinked.diceLines[0].base, ''); assert.equal(savedLinked.diceLines[0].mod, 5);
    assert.equal(savedLinked.diceLines[0].extensions.fiche.equipmentId, 'browser-weapon');
    assert.equal(savedLinked.diceLines[1].id, 'browser-local-action');
    assert.equal(savedLinked.diceLines[1].extensions.kept, 'local');
    assert.equal(savedLinked.notes, 'Note locale conservée');

}
