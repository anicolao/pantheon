import {policy as oldPolicy,type Config as OldConfig,type Memory as OldMemory} from '../engine-opening-book/policy';
import {evaluateDiscards} from './discard';
export type Config=OldConfig & {lookaheadDiscard?:boolean};
export type Memory=OldMemory;
export function policy(p:Config){
 const base=oldPolicy(p);
 return (v:Parameters<typeof base>[0],m:Memory)=>{
  // Only Feast has a discard prompt in the tested base game. Its queue is empty
  // at this point; other sources/variants retain their original controller.
  if(p.lookaheadDiscard&&v.variant==='base-game'&&v.choice?.kind==='discard'&&v.choice.source==='harvest-feast'){
   const best=evaluateDiscards(v,m,p,base)[0];
   return {type:'choice/resolved' as const,choiceId:v.choice.id,targets:best.targets};
  }
  return base(v,m);
 };
}
