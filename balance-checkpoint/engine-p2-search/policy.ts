import {policy as basePolicy,type Config as BaseConfig,type Memory} from '../engine-discard/policy';
import type {View} from '../equal-turns/source/scripts/balance/strategy';
export type {Memory};
export type Config=BaseConfig & {p2Patch?:Partial<BaseConfig>};
export function policy(p:Config){
 const base=basePolicy(p),adjusted=basePolicy({...p,...p.p2Patch});
 return (v:View,m:Memory)=>p.p2Patch&&m.turn>2&&v.playerCount===2&&v.equalTurns&&v.playersAfter===0?adjusted(v,m):base(v,m);
}
