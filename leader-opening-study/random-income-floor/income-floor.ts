import {actionEffects,definition} from '../../src/lib/game/actions';
import type {CardInstance} from '../../src/lib/game/setup';
/** Whole-deck spendable income capacity, ignoring shuffle order.
 * Count all Treasures, all nonterminal Action coins, and only as many
 * terminal coin Actions as the deck can legally support in one turn.
 * Conditional reveal bonuses and future gains are not guaranteed income.
 */
export function incomeCapacity(owned:CardInstance[],leader:string):number{
 let coins=0,actions=1,nonterminalTrigger=false;
 const terminal:number[]=[];
 for(const c of owned){
  const d=definition(c.cardId);
  if(d.type==='Treasure'){coins+=({obol:1,drachma:2,talent:3} as Record<string,number>)[c.cardId]??0;continue;}
  if(d.type!=='Action')continue;
  const effects=actionEffects(c.cardId),a=effects.reduce((n,e)=>n+(e.kind==='resource'&&e.resource==='actions'?e.amount:0),0);
  const money=effects.reduce((n,e)=>n+(e.kind==='resource'&&e.resource==='coins'?e.amount:0),0);
  if(a>=1){actions+=a-1;coins+=money;if(d.god===definition(leader).god)nonterminalTrigger=true;}
  else terminal.push(money);
 }
 // Thaleia's nonterminal trigger makes one more terminal playable.
 // Her only terminal matching card, Council, consumes and refunds its own
 // Action; playing it does not create an extra slot for an income terminal.
 if(leader==='thaleia'&&nonterminalTrigger)actions++;
 return coins+terminal.sort((a,b)=>b-a).slice(0,actions).reduce((a,b)=>a+b,0);
}
export function safeTrash(owned:CardInstance[],leader:string,targets:string[]):boolean{
 if(!targets.length)return true;
 const ids=new Set(targets);
 return incomeCapacity(owned.filter(c=>!ids.has(c.id)),leader)>=3;
}
