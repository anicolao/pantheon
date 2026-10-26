/** Research teacher: preserve the free Ares Temple action before exhausting actions. */
import type {StandardView} from '../../standard-matrix/policy';
import {actionEffects,type ActionCommand} from '../../src/lib/game/actions';
export type TempleOrderRule={mode:'always'|'hamlet'|'last-action'};
export function templeOrderOverride(v:StandardView,base:ActionCommand,r:TempleOrderRule):ActionCommand{
 if(v.leader!=='doreios'||v.choice||v.phase!=='actions'||v.resources.actions<1)return base;
 const temple=v.hand.find(c=>c.cardId==='temple-of-ares');if(!temple||base.type==='action/played'&&base.instanceId===temple.id)return base;
 if(r.mode==='hamlet'&&!v.hand.some(c=>c.cardId==='hamlet'))return base;
 if(r.mode==='last-action'){
  if(v.resources.actions!==1||base.type!=='action/played')return base;
  const id=v.hand.find(c=>c.id===base.instanceId)!.cardId;
  if(actionEffects(id).some(e=>e.kind==='resource'&&e.resource==='actions'&&e.amount>0))return base;
 }
 return {type:'action/played',instanceId:temple.id};
}
