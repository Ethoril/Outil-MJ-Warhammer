import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';

// Parcours d'intégration sur l'application complète et son vrai Store. Les
// semences sont injectées dans le Store invité du contexte navigateur jetable.
const root=fileURLToPath(new URL('../',import.meta.url)),base='/Outil-MJ-Warhammer/';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);assert.ok(pathname.startsWith(base));const path=resolve(root,pathname.slice(base.length)||'index.html');assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404);res.end('Not found');}});
const catalogue=getReferenceCatalogue();
const catalogItem=name=>{const item=catalogue.items.find(row=>row.name===name);assert.ok(item,`profil catalogue disponible : ${name}`);return structuredClone(item);};
const weapon=(id,name,actionId,extra={})=>{const source=catalogItem(name),item={...source,id,extensions:{...(source.extensions||{}),...(extra.extensions||{})}};const action={id:actionId,note:name,type:'attack',attr:'CT',base:60,damage:item.damage,qualities:structuredClone(item.keywords||[]),extensions:{fiche:{equipmentId:id}}};return {item,action};};
const actorBase={id:'d-hero',name:'Tireuse D',kind:'PJ',camp:'pj',zone:'active',initiative:60,hp:20,maxHp:20,caracs:{CC:60,CT:60,F:40,E:30,BE:3,I:40,Ag:40,Dex:35,Int:30,FM:35,Soc:25},skills:[{id:'heal',name:'Guérison',status:'resolved',total:45,advances:2,carac:'Int'}],talents:[],traits:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}}};
const targetBase={id:'d-foe',name:'Garde D',kind:'PNJ',camp:'ennemi',zone:'active',initiative:30,hp:500,maxHp:500,caracs:{CC:35,CT:30,F:30,E:30,BE:3,I:30,Ag:30},skills:[{id:'dodge',name:'Esquive',status:'resolved',total:30,carac:'Ag'}],talents:[],traits:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}}};
const combat=(actor,target)=>({schemaVersion:3,reserve:[],diceLines:[],log:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id],participants:[actor,target]}});
const withWeapons=()=>{const cutter={item:{id:'d-cutter',kind:'weapon',name:'Arme Taille de test',category:'Bâtons',damage:'BF+4',hands:1,keywords:[{id:'taille'}],extensions:{}},action:{id:'d-cut',note:'Arme Taille de test',type:'attack',attr:'CC',base:60,damage:'BF+4',qualities:[{id:'taille'}],extensions:{fiche:{equipmentId:'d-cutter'}}}},bolas=weapon('d-bolas','Bolas','d-bolas-action'),bow={item:{id:'d-bow',kind:'weapon',name:'Arc Empaleuse de test',category:'Arc',damage:'BF+4',range:'50',hands:2,keywords:[{id:'empaleuse'}],extensions:{}},action:{id:'d-bow-action',note:'Arc Empaleuse de test',type:'attack',attr:'CT',base:60,damage:'BF+4',qualities:[{id:'empaleuse'}],extensions:{fiche:{equipmentId:'d-bow'}}}},pepper=weapon('d-pepper','Poivrière','d-pepper-action'),ratling=weapon('d-ratling','Mitrailleuse Ratling Skaven','d-ratling-action');
  // A deterministic status effect and the conditional Bolas quality are added
  // as catalogue-shaped quality entries; the real engine parses both.
  const stun={id:'inflige',parameter:'Sonné'};const hammer={id:'d-hammer',kind:'weapon',name:'Masse d’essai',category:'Bâtons',damage:'BF+4',range:'',hands:1,keywords:[stun],extensions:{}};
  const inflictAction={id:'d-inflict-action',note:hammer.name,type:'attack',attr:'CC',base:60,damage:'BF+4',qualities:[stun],extensions:{fiche:{equipmentId:hammer.id}}};
  const plain={item:{id:'d-plain',kind:'weapon',name:'Arme de bouclier test',category:'Bâtons',damage:'BF+1',hands:1,keywords:[],extensions:{}},action:{id:'d-plain-action',note:'Arme de bouclier test',type:'attack',attr:'CC',base:60,damage:'BF+1',qualities:[],extensions:{fiche:{equipmentId:'d-plain'}}}};
  const linked=[cutter,bolas,bow,pepper,ratling];const actor={...structuredClone(actorBase),equipment:[...linked.map(x=>x.item),hammer,plain.item],actions:[...linked.map(x=>x.action),inflictAction,plain.action]};
  return {actor,items:{cutter:cutter.item,bolas:bolas.item,bow:bow.item,pepper:pepper.item,ratling:ratling.item,hammer,plain:plain.item}};
};
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined)});
try{
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));
  const origin=`http://127.0.0.1:${server.address().port}${base}`;
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});await page.locator('#tab-combat').click();
  const load=async state=>page.evaluate(async value=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;await Store.loadFromJSON(value);},state);
  const read=async()=>page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;return JSON.parse(Store.getFullJSON());});
  const play=page.locator('#workspace-root');
  const chooseAction=async id=>{const button=play.locator(`[data-action-key="${id}"]`);await button.waitFor();await button.click();};
  const selectAttack=async id=>{await chooseAction(id);await play.getByLabel('Type d’action').selectOption('attack');if(id==='d-inflict-action')await play.getByLabel('Nature du Test').selectOption('melee');};
  const openProtection=async()=>{const summary=play.getByText('Protection et bouclier pour cette attaque');if(!(await summary.evaluate(el=>el.closest('details')?.open)))await summary.click();};
  const settleChoices=async()=>{const groups=play.locator('.workspace-v5-choice-group');for(let i=0;i<await groups.count();i++){const radio=groups.nth(i).locator('input[type="radio"]').first();if(await radio.isEnabled())await radio.check();}};
  const calculate=async()=>{await play.getByRole('button',{name:'Calculer',exact:true}).click();await play.locator('.workspace-result-live').waitFor();await settleChoices();};
  const enterRoll=async roll=>{const input=play.locator('[data-roll-input="attack"]');await input.fill(String(roll));const defense=play.locator('[data-roll-input="defense"]');if(await defense.count()&&await play.getByLabel('Nature du Test').inputValue()==='melee')await defense.fill('60');await calculate();};
  const enterAttackAndDefense=async(attackRoll,defenseRoll)=>{await play.locator('[data-roll-input="attack"]').fill(String(attackRoll));await play.locator('[data-roll-input="defense"]').fill(String(defenseRoll));await calculate();};
  const apply=async()=>{const button=play.locator('.workspace-result-live').getByRole('button',{name:/Appliquer|Enregistrer le résultat/});assert.equal(await button.isEnabled(),true,`${await play.locator('.workspace-result-live').innerText()}\nbutton title=${await button.getAttribute('title')}`);await button.click();};

  const {actor,items}=withWeapons(),target={...structuredClone(targetBase),equipment:[
    {id:'d-mail',kind:'armour',name:'Cotte de mailles de test',ap:2,layer:'mail',locations:['head','body','leftArm','rightArm','leftLeg','rightLeg'],keywords:[]},
    {id:'d-shield',kind:'shield',name:'Bouclier de test',ap:2,locations:[],keywords:[{id:'bouclier'}]}
  ]};
  await load(combat(actor,target));

  // Armure d’inventaire + Taille : localisation du Corps ciblée, baisse du PA
  // de la seule pièce nommée, avec le vrai calcul et l’application Store.
  await selectAttack('d-cut');await play.getByText('Protection et bouclier pour cette attaque').click();
  await play.getByLabel('Coup ciblé (−2 DR, hors modificateur saisi)').selectOption('true');await play.getByLabel('Localisation du coup ciblé').selectOption('body');
  await play.getByLabel('Taille : pièce d’armure ou bouclier frappé').selectOption('d-mail');
  await enterRoll(31);let preview=await play.locator('.workspace-result-live').innerText();assert.match(preview,/Touché · Corps/u);await apply();
  let state=await read(),foe=state.combat.participants.find(row=>row.id===target.id);assert.equal(foe.extensions.v5.armorDamageByItem?.['d-mail'],1,'Taille diminue de 1 PA la pièce d’inventaire touchée');

  // Bouclier attaché : l’interface réclame le côté non directeur et toutes les
  // localisations sont parcourues. Tête/Corps/bras non directeur sont couvertes;
  // bras directeur/jambes ne doivent pas recevoir le PA d’attache.
  for(const [location,side,covered] of [['head','left',true],['body','left',true],['leftArm','left',true],['rightArm','left',false],['leftLeg','left',false],['rightLeg','left',false]]){
    await selectAttack('d-plain-action');await openProtection();
    await play.getByLabel('Bouclier utilisé').selectOption('d-shield');await openProtection();await play.getByLabel('Bouclier attaché au bras ou en bandoulière').check();await openProtection();await play.getByLabel('Bras non directeur').selectOption(side);
    for(const label of ['Bouclier disponible ce tour','Défense opposée avec ce bouclier','Attaquant visible']){await openProtection();await play.getByLabel(label).selectOption('true');}
    await play.getByLabel('Coup ciblé (−2 DR, hors modificateur saisi)').selectOption('true');await play.getByLabel('Localisation du coup ciblé').selectOption(location);
    await enterRoll(31);preview=await play.locator('.workspace-result-live').innerText();assert.match(preview,/Touché/u,`localisation ${location}: aperçu d’attaque visible`);
    await play.getByText('Détail des calculs et règles').click();const calculations=await play.locator('.workspace-v5-calculations').innerText();assert.match(calculations,new RegExp(`Protection retenue : ${covered?3:1} PA`),`PA attachés sur ${location} (cotte dégradée à 1 PA)`);
    await apply();state=await read();foe=state.combat.participants.find(row=>row.id===target.id);assert.ok(foe,'cible conservée après attaque');
  }
  // Seuil V5 de 2 PA pour opposer un tir par Esquive : le bouclier attaché à
  // 2 PA autorise le jet, le même profil à 1 PA ne permet pas cette opposition.
  const checkShieldShot=async ap=>{const shieldTarget={...structuredClone(targetBase),equipment:[{id:'shot-shield',kind:'shield',name:'Bouclier seuil',ap,locations:[],keywords:[{id:'bouclier'}]}]};await load(combat(actor,shieldTarget));await selectAttack('d-bolas-action');await play.getByLabel(`Défense de ${shieldTarget.name} : caractéristique ou jet`).selectOption('Ag');await openProtection();await play.getByLabel('Bouclier utilisé').selectOption('shot-shield');await openProtection();await play.getByLabel('Bouclier attaché au bras ou en bandoulière').check();await openProtection();await play.getByLabel('Bras non directeur').selectOption('left');for(const label of ['Bouclier disponible ce tour','Défense opposée avec ce bouclier','Attaquant visible']){await openProtection();await play.getByLabel(label).selectOption('true');}await enterAttackAndDefense(31,20);return play.locator('.workspace-result-live').innerText();};
  const shieldTwoPa=await checkShieldShot(2);assert.doesNotMatch(shieldTwoPa,/Confirmer la règle autorisant cette défense contre un tir/u,'2 PA autorisent l’opposition à distance par Esquive');
  const shieldOnePa=await checkShieldShot(1);assert.match(shieldOnePa,/Confirmer la règle autorisant cette défense contre un tir/u,'1 PA ne permet pas l’opposition à distance par Esquive');
  // Filet à crochets : le Test de Force d’évasion exige l’opposition du filet,
  // impose le mouvement et débite les dégâts MJ armure ignorée après application.
  const netAction={id:'d-net-escape',note:'Sortir du filet',type:'test',attr:'F',base:50,damage:null,qualities:[]};
  const netActor={...structuredClone(actor),actions:[...actor.actions,netAction],states:[{id:'d-net-state',key:'enchevetre',name:'Empêtré',level:2,strength:35,source:{hookedNet:true,authorId:target.id,escapeStrength:35}}]};
  await load(combat(netActor,structuredClone(targetBase)));await chooseAction('d-net-escape');
  const actionType=play.getByLabel('Type d’action');assert.equal(await actionType.locator('option[value="test"]').count(),1,'le formulaire réel offre le type Test');await actionType.selectOption('test');
  const openCircumstances=async()=>{const summary=play.getByText('Circonstances des Tests');if(!(await summary.evaluate(el=>el.closest('details')?.open)))await summary.click();};
  await openCircumstances();await play.getByLabel('Sortie d’entrave : état Empêtré').selectOption('d-net-state');await openCircumstances();
  await enterRoll(20);let netPreview=await play.locator('.workspace-result-live').innerText();assert.match(netPreview,/Filet : saisir le jet d100 du Test opposé de Force de la source/u,'l’évasion ne s’applique pas sans le jet opposé du filet');
  assert.equal(await play.getByLabel('Le Test implique un mouvement').count(),0,'le mouvement est imposé par la sortie du filet');
  await openCircumstances();const netOpponent=play.getByLabel('Jet d100 opposé — Force 35');await netOpponent.fill('20');await netOpponent.press('Tab');await openCircumstances();
  const netDamage=play.getByLabel('Filet à crochets : dégâts MJ (armure ignorée)');await netDamage.fill('3');await netDamage.press('Tab');await enterRoll(20);
  netPreview=await play.locator('.workspace-result-live').innerText();assert.doesNotMatch(netPreview,/Filet : saisir le jet d100 du Test opposé de Force de la source/u);await apply();
  state=await read();let escaped=state.combat.participants.find(row=>row.id===actor.id);assert.equal(escaped.hp,17,'3 dégâts MJ de filet appliqués sans armure');assert.equal(escaped.states.some(row=>row.id==='d-net-state'),false,'opposition gagnée retire les états Empêtré dont le niveau est atteint');
  await load(combat(actor,structuredClone(targetBase)));
  await selectAttack('d-inflict-action');await enterRoll(31);await apply();state=await read();foe=state.combat.participants.find(row=>row.id===target.id);assert.equal(foe.states.some(row=>row.key==='sonne'),true,'Inflige Sonné appliqué après un coup réussi');

  // Bolas : un coup au Corps ne déclenche pas la condition « jambes seulement »;
  // un coup aux jambes ajoute Empêtré et À terre via la résolution appliquée.
  await selectAttack('d-bolas-action');await play.getByLabel('Coup ciblé (−2 DR, hors modificateur saisi)').selectOption('true');await play.getByLabel('Localisation du coup ciblé').selectOption('body');await enterRoll(31);await apply();
  state=await read();foe=state.combat.participants.find(row=>row.id===target.id);assert.equal(foe.states.some(row=>row.key==='enchevetre'),false,'Bolas au Corps : aucun Empêtré');assert.equal(foe.states.some(row=>row.key==='aterre'),false,'Bolas au Corps : aucun À terre');
  await selectAttack('d-bolas-action');await play.getByLabel('Coup ciblé (−2 DR, hors modificateur saisi)').selectOption('true');await play.getByLabel('Localisation du coup ciblé').selectOption('leftLeg');await enterRoll(31);await apply();
  state=await read();foe=state.combat.participants.find(row=>row.id===target.id);assert.equal(foe.states.some(row=>row.key==='enchevetre'),true,'Bolas aux jambes : Empêtré appliqué');assert.equal(foe.states.some(row=>row.key==='a-terre'),true,'Bolas aux jambes : À terre appliqué');

  // Empaleuse sur arc avec aucune munition suivie : chemin générique non bloqué,
  // la cible reçoit un projectile générique si le tir critique.
  await selectAttack('d-bow-action');await enterRoll(11);const crit=play.getByRole('spinbutton',{name:/Gravité/u});if(await crit.count()){await crit.fill('80');await crit.press('Tab');}
  preview=await play.locator('.workspace-result-live').innerText();
  if(/munitions? .*requise|bloqu/u.test(preview))throw new Error('Empaleuse sans munition suivie est bloquée: '+preview);
  if(await play.getByRole('button',{name:/Appliquer|Enregistrer le résultat/}).isEnabled()){
    await apply();state=await read();foe=state.combat.participants.find(row=>row.id===target.id);assert.ok((foe.extensions.v5.lodgedProjectiles||[]).length,'Empaleuse critique consigne le projectile générique');
  } else assert.match(preview,/munition|projectile|critique/iu,'la preview Empaleuse reste visible même si le résultat tiré ne produit pas de critique');

  // Recharge : la Ratling « Variable » exige un arbitrage positif avant d’avoir
  // un chargeur. La Poivrière réclame son fait de seconde main dans le panneau.
  await play.getByLabel('Capacité arbitrée — Mitrailleuse Ratling Skaven').fill('6');await play.getByRole('button',{name:'Enregistrer l’arbitrage'}).first().click();
  state=await read();let ratling=state.combat.participants.find(row=>row.id===actor.id).equipment.find(row=>row.id==='d-ratling');assert.equal(ratling.extensions.v5.reloadState.repeaterRating,6,'arbitrage Ratling persisté par le Store');
  await selectAttack('d-pepper-action');assert.equal(await play.getByLabel('Seconde main libre pour préparer le canon de la Poivrière').inputValue(),'','la Poivrière exige une réponse explicite');
  await play.getByLabel('Seconde main libre pour préparer le canon de la Poivrière').selectOption('false');await enterRoll(31);preview=await play.locator('.workspace-result-live').innerText();assert.match(preview,/Touché/u);await apply();
  state=await read();let pepper=state.combat.participants.find(row=>row.id===actor.id).equipment.find(row=>row.id==='d-pepper');assert.equal(pepper.extensions.v5.reloadState.requiresReload,true,'main occupée : le tir perd À répétition et impose une recharge complète (L13 p.103, T2 bis)');
  assert.ok(await play.getByLabel('Rechargement des armes').count(),'panneau Recharge visible dans l’application');

  // Cas négatifs : Ratling vide/non arbitré ne propose aucune capacité inventée;
  // les entrées incohérentes de recharge sont rejetées dans l’interface.
  const negativeActor=structuredClone(actor);negativeActor.equipment=negativeActor.equipment.map(row=>row.id==='d-ratling'?{...row,extensions:{}}:row);
  await load(combat(negativeActor,structuredClone(targetBase)));await play.getByLabel('Capacité arbitrée — Mitrailleuse Ratling Skaven').fill('0');await play.getByRole('button',{name:'Enregistrer l’arbitrage'}).click();
  const invalidText=await play.innerText();assert.match(invalidText,/Rechargement non enregistré\./u,'la demande de capacité invalide produit une erreur visible');
  const negativeState=await read(),negativeRatling=negativeState.combat.participants.find(row=>row.id===actor.id)?.equipment?.find(row=>row.id==='d-ratling');assert.ok(negativeRatling,JSON.stringify(negativeState.combat.participants.find(row=>row.id===actor.id)));assert.equal(negativeRatling.extensions?.v5?.reloadState,undefined,'aucun chargeur créé après saisie invalide');

  // Undo/Redo, rechargement de page et persistance IndexedDB réels.
  await load(combat(actor,target));await play.getByLabel('Capacité arbitrée — Mitrailleuse Ratling Skaven').fill('6');await play.getByRole('button',{name:'Enregistrer l’arbitrage'}).first().click();
  await page.locator('#btn-undo').click();assert.equal((await read()).combat.participants.find(row=>row.id===actor.id).equipment.find(row=>row.id==='d-ratling').extensions?.v5?.reloadState,undefined,'Undo retire l’arbitrage');
  await page.locator('#btn-menu').click();await page.locator('#btn-redo').click();assert.equal((await read()).combat.participants.find(row=>row.id===actor.id).equipment.find(row=>row.id==='d-ratling').extensions?.v5?.reloadState?.repeaterRating,6,'Redo restaure l’arbitrage');
  const beforeReload=await read();await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});state=await read();
  assert.equal(state.combat.participants.find(row=>row.id===actor.id).equipment.find(row=>row.id==='d-ratling').extensions?.v5?.reloadState?.repeaterRating,6,'Redo survit au rechargement navigateur et à la réhydratation IndexedDB');
  assert.deepEqual(errors,[],'aucune erreur JavaScript sur le parcours');
  console.log('F2-T2 bis D navigateur complet: armure inventaire/Taille, six localisations bouclier attaché, Inflige, Bolas Corps/jambes, Empaleuse sans munition suivie, Ratling Variable, Poivrière main occupée, saisie Ratling invalide, Undo/Redo/reload IndexedDB. Store de l’app complet, seed JSON de test seulement.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
