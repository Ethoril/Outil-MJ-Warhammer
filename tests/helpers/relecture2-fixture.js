import {createStore} from '../../js/core/store.js';
export const actor=(id='mage',extra={})=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',hp:30,maxHp:30,caracs:{CC:40,CT:40,F:30,E:30,Int:60,FM:50,Ag:40,I:40,Dex:40,Soc:40,M:4},skills:[{name:'Langue (Magick)',total:60},{name:'Focalisation',total:60},{name:'Focalisation (Haute Magie)',total:60}],talents:[],states:[],equipment:[],extensions:{v5:{hasMomentum:true}},...extra});
export async function setup(...people){const s=createStore();await s.ready;await s.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:people[0].id,order:people.map(p=>p.id),participants:people},log:[],diceLines:[],extensions:{v5:{turnIndex:2}}});return s;}
export const person=(s,id='mage')=>s.listParticipants().find(p=>p.id===id);
