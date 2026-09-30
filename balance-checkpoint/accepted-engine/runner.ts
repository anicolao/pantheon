import {run,type Spec} from '../engine-p2-search/runner';
import {selectedConfig} from './selected-policy';
export {run,type Spec};
export function runAgainstMoney(seed:number,seat:0|1){
 const engine:Spec={name:'engine',config:selectedConfig},money:Spec={name:'money'};
 return run(seed,seat?[money,engine]:[engine,money]);
}
