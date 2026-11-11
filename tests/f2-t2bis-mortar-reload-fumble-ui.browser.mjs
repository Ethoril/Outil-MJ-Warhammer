import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const server=createStaticServer({ root, pages: { '/blank': '<main></main>' } });
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await launchBrowser();
try{
  const page=await browser.newPage(),origin=`http://127.0.0.1:${server.address().port}`;
  await page.goto(`${origin}/blank`);
  const result=await page.evaluate(async origin=>{
    const {renderResolutionPanel}=await import(`${origin}/js/ui/resolution-panel.js`);
    const {previewResolution}=await import(`${origin}/js/core/resolution.js`);
    const actor={id:'shooter',name:'Tireur',camp:'hero',zone:'active',hp:20,caracs:{E:30,CT:40},equipment:[{id:'mortar',name:'Mortier à main',kind:'weapon',category:'Engineering',damage:7,damageMaximum:12,keywords:[{id:'recharge',parameter:'2'}]}],skills:[],states:[]};
    const target={id:'target',name:'Cible',camp:'enemy',zone:'active',hp:20,caracs:{E:30},equipment:[],skills:[],states:[]};
    const action={id:'reload',type:'test',name:'Recharger le mortier à main',note:'Mortier à main',attr:'CT',base:40,extensions:{fiche:{equipmentId:'mortar'}}};
    const preview=previewResolution({actor,target,action,roll:66,round:1,baseRevision:0,v5:{kind:'test',context:{reloading:true,fumbleRoll:1,weaponDamageMaximum:12,weaponExplosionArmSide:'right'}}});
    const calls=[],handlers=new Proxy({}, {get:()=> (...args)=>calls.push(args)});
    const panel=renderResolutionPanel({draft:{actorId:actor.id,actionKey:action.id,type:'test',attackRoll:66,preview,
      v5Context:{reloading:true,fumbleRoll:1,weaponDamageMaximum:12,weaponExplosionArmSide:'right'}},actor,target,participants:[actor,target],actions:[action],actionKey:action.id,type:'test',
      groups:{allies:[actor],adversaries:[target]},defense:{options:[],option:{value:'Ag',statLabel:'Ag',v5:{kind:'test',slModifier:0}}},canCalculate:false,canApply:false,handlers});
    document.body.replaceChildren(panel);
    const arm=panel.querySelector('[aria-label="Bras directeur touché : choix du MJ"]');
    arm.value='left';arm.dispatchEvent(new Event('change',{bubbles:true}));
    return {isFumble:Boolean(preview.fumble),unresolved:preview.unresolved,hasExplosion:preview.combatFailure.effects.some(row=>row.reason==='maladresse-au-rechargement-du-mortier-a-main'),
      hasDamageMaximum:panel.querySelector('[aria-label="Dégâts maximums du profil du mortier"]')!==null,armOptions:arm?[...arm.options].map(option=>option.value):null,selectedSide:calls.at(-1)?.[0]?.v5Context?.weaponExplosionArmSide};
  },origin);
  assert.equal(result.isFumble,true,'le test utilise une vraie maladresse de rechargement');
  assert.equal(result.unresolved.length,0,result.unresolved.join('; '));
  assert.equal(result.hasExplosion,true);
  assert.equal(result.hasDamageMaximum,false,'les dégâts du mortier viennent du profil (T2 bis) : plus de maximum à saisir');
  assert.deepEqual(result.armOptions,['','left','right'],'le champ bras directeur est rendu hors du bloc de table de maladresse');
  assert.equal(result.selectedSide,'left');
  console.log('PASS : parcours UI d’une maladresse réelle au rechargement du mortier.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
