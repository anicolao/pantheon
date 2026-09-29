import { actionEffects, definition, type Choice } from '../../src/lib/game/actions';
import type { CardInstance } from '../../src/lib/game/setup';
import { cardFeatures, engineCapacity, startReliability, revealCoins } from './engine';
import { moneyEstimate } from './money';
import { publicHorizon, treasureValue, gainOutcome, endingShare, availableCoins } from './planning';
import type { View } from './strategy';

export type ThinObjective = 'treasure' | 'engine';
type Inventory = Record<string, number>;
const size = (owned: Inventory) => Object.values(owned).reduce((a,b)=>a+b,0);
const vp = (owned: Inventory) => Object.entries(owned).reduce((s,[id,n])=>s+n*(definition(id).vp??0),0);
const changed = (owned: Inventory, remove: string[], gain?: string) => {
 const next={...owned}; for(const id of remove)next[id]--;
 if(gain)next[gain]=(next[gain]??0)+1; return next;
};
const normal = (view: View, owned=view.owned): View => ({...view,owned,hand:[],play:[],phase:'actions',unseenCount:0,resources:{actions:1,coins:0,buys:0,worship:0}});
function tools(view: View, id: string) {
 const effects=definition(id).type==='Action'?actionEffects(id,view.variant):[];
 return {plain:effects.reduce((n,e)=>n+(e.kind==='trash'&&!e.forge&&!e.offering?e.amount:0),0),
   forge:effects.some(e=>e.kind==='trash'&&e.forge)};
}
export function isThinningTool(view: View,id: string): boolean {const t=tools(view,id);return !!(t.plain||t.forge);}
function gains(view: View, limit: number, actionOnly=false): string[] {
 return Object.keys(view.supply).filter(id=>view.supply[id]>0&&!view.bannedCards.includes(id)&&definition(id).cost!==null&&definition(id).cost!<=limit&&(!actionOnly||definition(id).type==='Action')).sort();
}
/** Engine payload safeguard: retain the existing ability to produce up to $8 per deck cycle.
 * Action income is discounted by terminal capacity; no hidden hand/order is inspected. */
function payload(view: View): number {
 const c=engineCapacity(view),share=Math.min(1,c.actionBudget/Math.max(1,c.terminalDemand));
 return Object.entries(view.owned).reduce((sum,[id,n])=>{
  const f=cardFeatures(id,view.variant);
  return sum+n*(treasureValue(id)+(f.coins+revealCoins(view,f.reveal))*(f.actions?1:share));
 },0);
}
export function thinningObjective(view: View, objective: ThinObjective, owned=view.owned): number {
 if(objective==='treasure')return moneyEstimate(view,owned).mean/5;
 const v=normal(view,owned),c=engineCapacity(v);
 // Same draw coverage, blocked draw and opening reliability terms as Engine acquisition,
 // expressed in units of one card of draw coverage.
 return -c.drawDeficit-c.strandedDraw/3+startReliability(v,owned)*4/3;
}
/** Joint removal/replacement. Money uses expected coins from five initial draws;
 * Engine uses executable whole-deck coverage. VP and this turn's lost money are costs. */
export function objectiveChange(view: View, objective: ThinObjective, remove: CardInstance[], gain?: string, currentTurn=true): number {
 const owned=changed(view.owned,remove.map(c=>c.cardId),gain);
 if(Object.values(owned).some(n=>n<0)||!size(owned))return -1000;
 const deltaVP=vp(owned)-vp(view.owned);
 const outcome=gain?gainOutcome(view,gain,remove.reduce((s,c)=>s+(definition(c.cardId).vp??0),0)):endingShare(view,deltaVP);
 if(outcome===0)return -1000;
 if(outcome!==null&&outcome>0)return 1000*outcome+deltaVP;
 const horizon=publicHorizon(view);
 if(deltaVP<0&&horizon<=1)return -100;
 const before=normal(view),after=normal(view,owned);
 if(objective==='engine'&&payload(after)+1e-9<Math.min(8,payload(before)))return -100;
 const scale=objective==='treasure'?5:1;
 let value=horizon*scale*(thinningObjective(view,objective,owned)-thinningObjective(view,objective))+deltaVP;
 if(objective==='engine')value+=0.1*horizon*(payload(after)-payload(before));
 if(currentTurn) {
  for(const id of new Set(remove.map(c=>c.cardId).filter(id=>isThinningTool(view,id)))) {
   if(!Object.entries(owned).some(([other,n])=>n>0&&isThinningTool(view,other)))value-=horizon*objectiveToolPremium({...view,owned},objective,id);
  }
  const lost=remove.reduce((s,c)=>s+treasureValue(c.cardId),0);
  value-=lost;
  // Losing an affordable top-tier scoring opportunity is more than a future-density gain.
  const top=Math.max(0,...Object.keys(view.supply).map(id=>definition(id).vp??0));
  if(Object.keys(view.supply).some(id=>view.supply[id]>0&&!view.bannedCards.includes(id)&&(definition(id).vp??0)===top&&top>0&&definition(id).cost!<=availableCoins(view)&&definition(id).cost!>availableCoins(view)-lost))value-=top;
 }
 return value;
}
function bestReplacement(view: View, objective: ThinObjective, remove: CardInstance[], choice: Choice): number {
 const limit=remove.reduce((s,c)=>s+definition(c.cardId).cost!,0)+(choice.forge?2:typeof choice.offering==='number'?choice.offering:0);
 const options=gains(view,limit);
 const values=options.map(id=>objectiveChange(view,objective,remove,id));
 const plain=objectiveChange(view,objective,remove);
 return choice.offering==='sum'?Math.max(plain,...values):values.length?Math.max(...values):plain;
}
export function objectiveTrashChoice(view: View, objective: ThinObjective, choice: Choice): {targets:string[];value:number} {
 const hand=[...view.hand].sort((a,b)=>a.id.localeCompare(b.id));
 let best={targets:[] as string[],value:choice.min?-Infinity:0};
 const visit=(start:number,remove:CardInstance[])=>{
  if(remove.length>=choice.min){
   const value=choice.forge||choice.offering ? (!remove.length&&choice.offering!=='sum'?0:bestReplacement(view,objective,remove,choice)) : objectiveChange(view,objective,remove);
   if(value>best.value+0.1)best={targets:remove.map(c=>c.id),value};
  }
  if(remove.length<choice.max)for(let i=start;i<hand.length;i++)visit(i+1,[...remove,hand[i]]);
 };
 visit(0,[]);return best;
}
/** Upgrade gains use the same before/after objective as the removal that enabled them. */
export function objectiveGain(view: View, objective: ThinObjective, choice: Choice): string | undefined {
 const ranked=gains(view,choice.limit!,choice.actionOnly).map(id=>({id,value:objectiveChange(view,objective,[],id)})).sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id));
 return ranked[0]&&(choice.min>0||ranked[0].value>0)?ranked[0].id:undefined;
}
const premiumCache=new Map<string,number>();
/** Delayed value of additional removal capacity, in parent income/coverage units per turn.
 * Existing tools cover work first. New tools incur their own deck/Action cost in the
 * parent's normal acquisition score. The work list is recomputed after each removal. */
export function objectiveToolPremium(view: View, objective: ThinObjective, id: string): number {
 const tool=tools(view,id),horizon=publicHorizon(view);
 if((!tool.plain&&!tool.forge)||horizon<=1)return 0;
 const inventory=Object.entries(view.owned).filter(([,n])=>n>0).sort(([a],[b])=>a.localeCompare(b));
 const key=JSON.stringify([view.variant,objective,id,inventory,view.leader,view.leaderBonus,view.supply,view.bannedCards,horizon]);
 const cached=premiumCache.get(key);if(cached!==undefined)return cached;
 let work=normal(view,changed(view.owned,[],id));
 const capacity=engineCapacity(work),reach=Math.min(1,5/Math.max(5,capacity.size-capacity.playableDraw));
 const slot=Math.min(1,capacity.actionBudget/Math.max(1,capacity.terminalDemand));
 const cycles=(horizon-1)*reach*slot;
 const existing=Object.entries(view.owned).reduce((s,[card,n])=>{const t=tools(view,card);return s+n*(tool.forge?Number(t.forge):t.plain);},0);
 const skip=Math.floor(existing*cycles),budget=cycles*(tool.forge?1:tool.plain);
 let total=0;
 const maxWork=Math.min(size(work.owned)-1,skip+Math.ceil(budget));
 for(let i=0;i<maxWork;i++){
  let best:{card:CardInstance;gain?:string;value:number}|undefined;
  for(const [target,n]of Object.entries(work.owned).sort(([a],[b])=>a.localeCompare(b))){
   if(n<=0||isThinningTool(work,target))continue;
   const card={id:'projected-'+target,cardId:target,copy:0};
   const options:(string|undefined)[]=tool.forge?gains(work,definition(target).cost!+2):[undefined];
   for(const gain of options){
    const value=objectiveChange(work,objective,[card],gain,false);
    if(value>0.1&&(!best||value>best.value+1e-9))best={card,gain,value};
   }
  }
  if(!best)break;
  if(i>=skip)total+=best.value*Math.min(1,Math.max(0,budget-(i-skip)));
  const owned=changed(work.owned,[best.card.cardId],best.gain);
  work={...work,owned,myScore:vp(owned),supply:best.gain?{...work.supply,[best.gain]:work.supply[best.gain]-1}:work.supply};
 }
 const result=total/Math.max(1,horizon);
 if(premiumCache.size>10000)premiumCache.clear();premiumCache.set(key,result);
 return result;
}
/** Value only legal work in the remaining hand after paying the played Action's cost. */
export function objectivePlayBonus(view: View, objective: ThinObjective, card: CardInstance): number {
 const f=cardFeatures(card.cardId,view.variant),trigger=!view.leaderUsed&&definition(card.cardId).god===definition(view.leader).god;
 const b=trigger?view.leaderBonus:{actions:0,coins:0,buys:0,trash:0};
 const tool=tools(view,card.cardId),capacity=tool.plain+b.trash;
 if(!capacity&&!tool.forge)return 0;
 const after={...view,hand:view.hand.filter(c=>c.id!==card.id),leaderUsed:view.leaderUsed||trigger,resources:{...view.resources,actions:view.resources.actions-1+f.actions+b.actions,coins:view.resources.coins+f.coins+b.coins,buys:view.resources.buys+f.buys+b.buys}};
 const choice:Choice={id:'forecast',kind:'trash',source:card.cardId,min:0,max:capacity};
 const plain=capacity?objectiveTrashChoice(after,objective,choice).value:0;
 const upgrade=tool.forge?objectiveTrashChoice(after,objective,{...choice,max:1,forge:true}).value:0;
 return Math.max(0,plain,upgrade)*(objective==='engine'?6/Math.max(1,publicHorizon(view)):1);
}
