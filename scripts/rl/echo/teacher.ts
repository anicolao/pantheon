/** Explicit bootstrap baseline, not a claim of expert Echo strategy. */
import {actionEffects,definition,effectOptions,activePlayer} from '../../../src/lib/game/actions';
import type {SetupState} from '../../../src/lib/game/setup';
import {commands,inventory} from './schema';
export function teacher(g:SetupState){
 const uid=activePlayer(g),hand=g.decks[uid].hand,owned=inventory(g,uid),choice=g.turn.choice;
 const count=(id:string)=>owned.filter(c=>c.cardId===id).length;
 const cash=owned.reduce((n,c)=>n+({obol:1,drachma:2,talent:3}[c.cardId]??0),0);
 const actionValue=(id:string)=>actionEffects(id).reduce((n,e)=>n+(e.kind==='draw'?e.amount*3:e.kind==='resource'?e.amount*(e.resource==='actions'?4:e.resource==='coins'?2:1):e.kind==='echo'?e.amount*4:0),0);
 const gainValue=(id:string)=>{
  const d=definition(id);
  if(id==='acropolis')return 40;
  if(id==='polis')return g.turn.number>=13||g.supply.acropolis<=3?20:0;
  if(id==='hamlet'||id==='obol')return -20;
  if(id==='talent'||id==='drachma')return (cash<11?16:4)+(id==='talent'?3:0);
  if(d.type==='Action')return actionValue(id)+5-2*count(id);
  return 0;
 };
 const scored=commands(g).map((command,index)=>{
  if(!command)return {index,value:-Infinity};let value=-50;
  if(command.type==='action/played'){const id=hand.find(c=>c.id===command.instanceId)!.cardId;value=100+actionValue(id);}
  else if(command.type==='treasures/played')value=70;
  else if(command.type==='treasure/played')value=60;
  else if(command.type==='card/bought')value=gainValue(command.cardId);
  else if(command.type==='phase/advanced')value=-15;
  else if(command.type==='turn/ended')value=-10;
  else if(command.type==='god/worshipped'){
   if(command.cardId==='reverberation')value=effectOptions(g,uid,{id:'teacher',kind:'echo',source:command.cardId,min:0,max:1}).length?12:-30;
   else if(command.cardId==='blessing-of-the-fields')value=hand.some(c=>c.cardId==='hamlet'||(c.cardId==='obol'&&cash>8))?25:-30;
   else if(command.cardId==='counsel-of-olympus')value=g.resources.coins<5?10:-5;
   else if(command.cardId==='tribute-of-the-tides')value=cash<11?14:-20;
   else value=hand.some(c=>c.cardId==='hamlet')?20:-20;
  }else if(command.type==='choice/resolved'){
   if(choice?.kind==='echo'){const o=effectOptions(g,uid).find(o=>o.id===command.targets[0]);value=o?(o.card?actionValue(o.card.cardId):5):0;}
   else if(choice?.kind==='gain')value=command.targets.length?gainValue(command.targets[0]):0;
   else value=command.targets.reduce((n,id)=>{const card=hand.find(c=>c.id===id)!;return n+(card.cardId==='hamlet'?10:card.cardId==='obol'?(choice?.kind==='discard'||cash>8?5:-3):choice?.offering||choice?.forge?definition(card.cardId).cost!-2:-20);},0);
  }
  return {index,value};
 });
 return scored.reduce((best,x)=>x.value>best.value?x:best).index;
}
