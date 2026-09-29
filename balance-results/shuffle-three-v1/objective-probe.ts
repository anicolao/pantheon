import {setupExperiment} from '../../scripts/balance/experiment';
import {strategyView,inventoryAtSetup} from '../../scripts/balance/strategy';
import {baseProfiles} from '../../scripts/balance/base-profiles';
import {rolloutEstimate,sampledAfter} from '../../scripts/balance/sampled';
import {activePlayer,definition} from '../../src/lib/game/actions';
const {game}=setupExperiment('shuffle-probe',['thaleia','nereon'],'base-game');
const v=strategyView(game,activePlayer(game),inventoryAtSetup(game,'base-game'),undefined,'base-game');
v.phase='buys';v.resources={actions:0,coins:4,buys:1,worship:0};v.endGamePolicy='turn-2';
const rows=[];
for(const added of [undefined,'council-of-sages','harbor-pilot']){
 const view={...v,owned:{...v.owned,...(added?{[added]:1}:{})}};
 rows.push({owned:view.owned,baseline:rolloutEstimate(view),candidates:Object.keys(v.supply).filter(id=>definition(id).cost!==null&&definition(id).cost!<=6).map(id=>({id,cost:definition(id).cost,coins:sampledAfter(view,baseProfiles.treasure,id),draws:sampledAfter(view,baseProfiles.engine,id)}))});
}
console.log(JSON.stringify(rows,null,2));
