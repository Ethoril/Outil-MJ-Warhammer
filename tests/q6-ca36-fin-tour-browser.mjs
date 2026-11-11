import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = createStaticServer({ root, pages: { '/harness': '<!doctype html><html><body></body></html>' } });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/harness`);
  await page.evaluate(async () => {
    const { openV5EffectInputDialog } = await import('/js/ui/v5-effect-dialog.js');
    const req = (field, label, participantId='p') => ({ participantId, participantName: 'Alice', field, label, kind: 'd100', testTalentField: field + ':preRollTalent' });
    window.calls = [];
    window.result = openV5EffectInputDialog({ pending: { status: 'requires-input', baseRevision: 1, requests: [req('test1', 'Test 1')] },
      getCurrentRevision: () => 1, getObstinateStatus: id => id==='carrier'?{available:false,reason:'Talent Obstiné non acquis.'}:{available:true,reason:null}, getObstinateIdentity: id => ['p','copy'].includes(id)?'fiche:alice':'fiche:'+id,
      submit: async inputs => { window.calls.push(inputs); return window.calls.length === 1
        ? { status: 'requires-input', baseRevision: 1, requests: [{...req('test2', 'Test 2', 'carrier'),testTalentParticipantId:'copy'}] } : { status: 'applied' }; } });
  });
  const first = page.getByLabel('Obstiné avant le jet — Test 1');
  await first.selectOption('strong-minded');
  await page.getByLabel('Lancer d100 : Test 1').click();
  assert.equal(await first.isDisabled(), true, 'le choix est verrouillé dès le lancer');
  await page.getByRole('button', { name: 'Confirmer les effets' }).click();
  await page.getByLabel('Obstiné avant le jet — Test 2').waitFor();
  assert.match(await page.locator('.v5-effect-prior').innerText(), /Obstiné avant Test 1 : strong-minded/);
  const second = page.getByLabel('Obstiné avant le jet — Test 2');
  assert.equal(await second.inputValue(), 'none');
  assert.equal(await second.locator('option[value="strong-minded"]').evaluate(node => node.disabled), true, 'une autre copie du même personnage ne peut pas réserver le quota deux fois');
  assert.match(await second.locator('..').locator('..').innerText(), /déjà choisi.*autre Test/i);
  await page.getByLabel('Test 2', { exact: true }).fill('42');
  assert.equal(await second.isDisabled(), true, 'la saisie manuelle verrouille aussi le choix');
  await page.getByRole('button', { name: 'Confirmer les effets' }).click();
  const calls = await page.evaluate(() => window.calls);
  assert.equal(calls[1].p['test1:preRollTalent'], 'strong-minded');
  assert.equal(calls[1].carrier['test2:preRollTalent'], 'none');
  assert.equal(calls[1].carrier.test2, 42);
  await page.evaluate(async () => {
    const { openV5EffectInputDialog } = await import('/js/ui/v5-effect-dialog.js');
    const req = (participantId, label) => ({participantId,participantName:participantId,field:label,kind:'d100',label,testTalentField:label+':preRollTalent'});
    window.result2=openV5EffectInputDialog({pending:{status:'requires-input',requests:[req('p','Un'),{...req('carrier','Deux'),testTalentParticipantId:'copy'},req('other','Trois')]},
      getObstinateStatus:id=>id==='carrier'?{available:false,reason:'Talent Obstiné non acquis.'}:{available:true},getObstinateIdentity:id=>['p','copy'].includes(id)?'fiche:alice':'fiche:'+id,submit:async()=>({status:'applied'})});
  });
  const choice1=page.getByLabel('Obstiné avant le jet — Un'),choice2=page.getByLabel('Obstiné avant le jet — Deux'),choice3=page.getByLabel('Obstiné avant le jet — Trois');
  await choice1.selectOption('strong-minded');
  assert.equal(await choice2.locator('option[value="strong-minded"]').evaluate(node=>node.disabled),true);
  assert.equal(await choice3.locator('option[value="strong-minded"]').evaluate(node=>node.disabled),false,'un autre personnage conserve son choix');
  await choice1.selectOption('none');
  assert.equal(await choice2.locator('option[value="strong-minded"]').evaluate(node=>node.disabled),false,'le choix est rendu si le premier est retiré avant le jet');
  await page.getByRole('button',{name:'Annuler'}).click();
  await page.evaluate(async () => {
    const { openV5EffectInputDialog } = await import('/js/ui/v5-effect-dialog.js');
    window.result3=openV5EffectInputDialog({pending:{status:'requires-input',performedTests:[],inputs:{p:{'ancien:preRollTalent':'strong-minded'}},requests:[{participantId:'p',participantName:'Alice',field:'nouveau',kind:'d100',label:'Nouveau',testTalentField:'nouveau:preRollTalent'}]},
      getObstinateStatus:()=>({available:true}),getObstinateIdentity:()=> 'fiche:alice',submit:async()=>({status:'applied'})});
  });
  assert.equal(await page.getByLabel('Obstiné avant le jet — Nouveau').locator('option[value="strong-minded"]').evaluate(node=>node.disabled),false,'un Test devenu automatique ne réserve plus le quota');
  await page.getByRole('button',{name:'Annuler'}).click();
  await page.evaluate(async () => {
    const { openV5EffectInputDialog } = await import('/js/ui/v5-effect-dialog.js');
    const req=field=>({participantId:'p',participantName:'Alice',field,kind:'d100',label:field,testTalentField:field+':preRollTalent'});
    window.revivalCalls=[];
    window.result4=openV5EffectInputDialog({pending:{status:'requires-input',baseRevision:1,requests:[req('ancien')]},getCurrentRevision:()=>1,
      getObstinateStatus:()=>({available:true}),getObstinateIdentity:()=> 'fiche:alice',submit:async inputs=>{window.revivalCalls.push(inputs);return window.revivalCalls.length===1?
        {status:'requires-input',baseRevision:1,performedTests:[],requests:[req('nouveau')]}:{status:'applied'};}});
  });
  await page.getByLabel('Obstiné avant le jet — ancien').selectOption('strong-minded');
  await page.getByLabel('ancien',{exact:true}).fill('35');await page.getByRole('button',{name:'Confirmer les effets'}).click();
  await page.getByLabel('Obstiné avant le jet — nouveau').selectOption('strong-minded');
  await page.getByLabel('nouveau',{exact:true}).fill('42');await page.getByRole('button',{name:'Confirmer les effets'}).click();
  const revived=await page.evaluate(()=>window.revivalCalls[1].p);
  assert.equal(revived.ancien,35,'le jet initial reste conservé');
  assert.equal(revived['ancien:preRollTalent'],undefined,'le choix du Test devenu automatique ne ressurgit pas');
  assert.equal(revived['nouveau:preRollTalent'],'strong-minded');
  console.log('Fin de Tour : choix par Test conservés et verrouillés après les jets.');
} finally { await browser.close(); await new Promise(done => server.close(done)); }
