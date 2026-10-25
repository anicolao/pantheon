import melia from './models/melia.json';
import nereon from './models/nereon.json';
import thaleia from './models/thaleia.json';
import doreios from './models/doreios.json';
import {commands,observation} from './rl-schema';
import type {StandardView} from '../../../standard-matrix/policy';

import {createActor,type Actor} from './rl-runtime';
const actors:Record<string,Actor>={melia,nereon,thaleia,doreios};
const runtime=new Map<string,ReturnType<typeof createActor>>();
function policy(leader:string){let model=runtime.get(leader);if(!model){const actor=actors[leader];if(!actor||actor.leader!==leader)throw Error(`No RL model for ${leader}`);model=createActor(actor);runtime.set(leader,model);}return model;}
export function rlCheckpointHash(leader:string){return policy(leader).checkpointSHA256;}
export function rlLogits(leader:string,values:readonly number[]){return policy(leader).logits(values);}
export function rlAction(leader:string,values:readonly number[],mask:readonly boolean[]){return policy(leader).action(values,mask);}
export function rlCommand(view:StandardView){
 const choices=commands(view);return choices[rlAction(view.leader,observation(view),choices.map(Boolean))]!;
}
