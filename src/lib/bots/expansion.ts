import echo from './models/expansion/echo.json';
import thaleia from './models/expansion/thaleia.json';
import nereon from './models/expansion/nereon.json';
import melia from './models/expansion/melia.json';
import doreios from './models/expansion/doreios.json';
import theseus from './models/expansion/theseus.json';
import achilles from './models/expansion/achilles.json';
import perseus from './models/expansion/perseus.json';
import {createActor,type Actor} from './rl-runtime';
import {commands,observation,schemaSignature} from './expansion-schema';
import {activePlayer} from '../game/actions';
import type {SetupState} from '../game/setup';
const data:Record<string,Actor>={echo,thaleia,nereon,melia,doreios,theseus,achilles,perseus};
const policies=new Map<string,ReturnType<typeof createActor>>();
export function expansionPolicy(leader:string){
 let policy=policies.get(leader);
 if(!policy){const actor=data[leader];if(!actor||actor.leader!==leader)throw Error('No trained expansion model for '+leader);policy=createActor(actor,schemaSignature);policies.set(leader,policy);}
 return policy;
}
/** Exact deterministic policy evaluated in the 28,000-game matrix. */
export function expansionCommand(game:SetupState){
 const choices=commands(game),policy=expansionPolicy(game.leaders[activePlayer(game)]);
 return choices[policy.action(observation(game),choices.map(Boolean))]!;
}
