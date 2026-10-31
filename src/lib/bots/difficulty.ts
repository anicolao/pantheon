import type {SetupState} from '../game/setup';
import {activePlayer} from '../game/actions';
import {seatBotKind,type BotKind} from '../game/bot-kind';
import type {BotTracker} from './session';
import {decide,type BotMemory} from './policy';
import {commands} from './rl-schema';
import {createResearchActor,actorObservation,type ResearchActorData} from './planning/actor';
import {rolloutDecision,type RolloutOptions} from './planning/rollout';
import melia from './models/hard/melia.json';
import nereon from './models/hard/nereon.json';
import thaleia from './models/hard/thaleia.json';
import doreios from './models/hard/doreios.json';
import worldMelia from './models/world/melia.json';
import worldNereon from './models/world/nereon.json';
import worldThaleia from './models/world/thaleia.json';
import worldDoreios from './models/world/doreios.json';
import meliaCritic from './models/critics/melia.json';
import thaleiaCritic from './models/critics/thaleia.json';
import doreiosCritic from './models/critics/doreios.json';
import provenance from './models/difficulty-provenance.json';
const load=(data:unknown)=>createResearchActor(data as ResearchActorData);
const actors={melia:load(melia),nereon:load(nereon),thaleia:load(thaleia),doreios:load(doreios)};
const world={melia:load(worldMelia),nereon:load(worldNereon),thaleia:load(worldThaleia),doreios:load(worldDoreios)};
const critics={melia:load(meliaCritic),thaleia:load(thaleiaCritic),doreios:load(doreiosCritic)};
/** Full table context is used only through public observations and sampled beliefs. */
export function tableDecision(game:SetupState,tracker:BotTracker,memory:BotMemory,requested:BotKind){
 const kind=requested==='easy'?seatBotKind(requested,game.seed!,activePlayer(game)):requested,view=tracker.view(game);
 if(kind!=='hard'&&kind!=='expert')return decide(view,memory,kind);
 const actor=actors[view.leader as keyof typeof actors],choices=commands(view);
 const base=()=>choices[actor.action(actorObservation(actor,game,tracker,view),choices.map(Boolean))]!;
 if(kind==='hard'||view.leader==='nereon')return base();
 const leader=view.leader as keyof typeof critics,critic=critics[leader],spec=provenance.expert[leader];
 const models=spec.useCurrentActor?{...world,[leader]:actor}:world;
 const leaf=(g:SetupState,t:BotTracker)=>{
  const value=critic.logits(actorObservation(critic,g,t,t.view(g)))[0];
  return leader==='doreios'?value:(value+1)/2;
 };
 return rolloutDecision(game,tracker,models,spec.rule as RolloutOptions,leaf).command;
}
