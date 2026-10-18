import{availableV5TalentMeasures,previewV5TalentMeasure}from'../core/v5-talent-measures.js';
import{acquiredV5Talents}from'../core/v5-talents.js';
/** Calculations are visible assistance: only confirmed resolutions change the combat. */
export function renderV5TalentMeasures(actor){
 const choices=availableV5TalentMeasures(actor);if(!choices.length)return null;
 const block=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Calculs de situation des talents';block.append(summary);
 const select=document.createElement('select');select.setAttribute('aria-label','Calcul de talent');choices.forEach(row=>select.append(new Option(row.name,row.id)));block.append(select);
 const form=document.createElement('div'),result=document.createElement('p');result.setAttribute('aria-live','polite');block.append(form,result);
 function show(){form.replaceChildren();const spec=choices.find(row=>row.id===select.value),request={situation:spec.id};
  const calculate=()=>{try{const preview=previewV5TalentMeasure(actor,request);result.textContent=preview.ready?preview.value+' '+spec.unit:preview.unresolved.join(' ');}catch(e){result.textContent=e.message;}};
  function field(key,label,type='number',options=[]){const wrap=document.createElement('label');wrap.className='workspace-type';wrap.textContent=label;let input;
   if(type==='select'){input=document.createElement('select');input.append(new Option('À préciser',''));options.forEach(row=>input.append(new Option(row.label,String(row.value))));}
   else{input=document.createElement('input');input.type='number';input.min='0';input.step='any';}
   input.setAttribute('aria-label',label);input.addEventListener('change',()=>{request[key]=input.value===''?undefined:type==='number'?Number(input.value):type==='boolean'?input.value==='true':input.value;calculate();});wrap.append(input);form.append(wrap);return input;
  }
  if(spec.base==null)field('base',spec.key==='duration'?'Durée normale de la réparation':spec.key==='materialDamage'?'Dégâts de Hack avant le talent':'Mouvement avant les talents');
  if(spec.id==='repair'){const input=field('hasSkillAdvance','Au moins une Augmentation du Métier','select',[{value:'true',label:'Oui'},{value:'false',label:'Non'}]);input.addEventListener('change',()=>{request.hasSkillAdvance=input.value===''?undefined:input.value==='true';calculate();});}
  if(spec.id==='movement'){field('terrain','Terrain','select',acquiredV5Talents(actor).filter(t=>t.talentId===spec.talentId).map(t=>({value:t.specialization,label:t.specialization})));field('terrainPenalty','Pénalité normale de Mouvement du terrain');}
  calculate();
 }
 select.addEventListener('change',show);show();return block;
}
