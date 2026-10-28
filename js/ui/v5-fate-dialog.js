import { userMessage, userError } from './messages.js';
const el=(tag,text,className='')=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;if(className)node.className=className;return node;};

/** Attribution manuelle du Destin par le MJ, avec motif enregistré dans le reçu. */
export function openV5FateDialog({participantName,fate,submit,getCurrentRevision}={}){
 if(!fate||typeof submit!=='function')throw new TypeError('Compteur de Destin requis');
 return new Promise(resolve=>{
  const opener=document.activeElement,dialog=el('dialog',null,'tool-sheet v5-effect-dialog'),form=el('form');
  Object.assign(dialog.style,{inset:'0',margin:'auto',transform:'none',width:'min(560px, calc(100vw - 32px))',maxWidth:'calc(100vw - 32px)',maxHeight:'calc(100dvh - 32px)',overflow:'auto',display:'block'});
  const heading=el('h2','Destin — '+participantName),summary=el('p',fate.balance===null?'Solde courant inconnu.':'Solde courant : '+fate.balance+' point(s).');
  const amountLabel=el('label','Nouveau solde permanent de Destin'),amount=el('input');amount.type='number';amount.min='0';amount.step='1';amount.required=true;amount.value=fate.permanent??'';amount.setAttribute('aria-label','Nouveau solde permanent de Destin');amountLabel.append(amount);
  const reasonLabel=el('label','Motif MJ'),reason=el('input');reason.required=true;reason.maxLength=300;reason.setAttribute('aria-label','Motif MJ');reasonLabel.append(reason);
  const error=el('p','', 'v5-effect-error');error.setAttribute('role','alert');error.hidden=true;
  const controls=el('div',null,'row'),save=el('button','Enregistrer Destin'),cancel=el('button','Annuler','ghost');save.type='submit';cancel.type='button';controls.append(save,cancel);
  form.append(heading,summary,amountLabel,reasonLabel,el('p','Ce champ fixe le solde permanent; les points temporaires restent séparés. Le changement est enregistré avec son motif MJ.','workspace-muted'),error,controls);dialog.append(form);document.body.append(dialog);
  let busy=false,outcome=null;
  form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;try{const value=Number(amount.value);if(amount.value.trim()===''||!Number.isSafeInteger(value)||value<0)throw userError('Saisissez un entier positif ou nul.');if(!reason.value.trim())throw userError('Le motif MJ est requis.');if(typeof getCurrentRevision==='function'&&getCurrentRevision()!==fate.baseRevision)throw userError('La partie a changé. Relisez le solde de Destin.');busy=true;save.disabled=true;cancel.disabled=true;outcome=await submit(value,{reason:reason.value.trim(),baseRevision:fate.baseRevision,...(resilienceLoss?.checked?{permanentResilienceLoss:true}:{})});if(outcome===false||outcome?.ok===false)throw outcome?.error||userError('Le Destin n’a pas été enregistré.');dialog.close();}catch(cause){busy=false;save.disabled=false;cancel.disabled=false;error.textContent=userMessage(cause,'Le Destin n’a pas été enregistré.');error.hidden=false;}});
  cancel.addEventListener('click',()=>dialog.close());dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});dialog.addEventListener('close',()=>{dialog.remove();if(opener?.isConnected)opener.focus();resolve(outcome);},{once:true});dialog.showModal();amount.focus();
 });
}
