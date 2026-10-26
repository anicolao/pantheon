import {maskedActorAction} from './masked_actor';
import {createActor,type Actor} from '../../src/lib/bots/rl-runtime';
import {observation,schemaSignature} from '../../src/lib/bots/rl-schema';
import type {SetupState} from '../../src/lib/game/setup';
import type {BotTracker} from '../../src/lib/bots/session';
import type {StandardView} from '../../standard-matrix/policy';
import {publicObservation,publicSchemaSignature,type PublicObservationKind} from './public_features';
export type ResearchActorData=Actor & {observationKind?:PublicObservationKind};
export function createResearchActor(data:ResearchActorData){
 const kind=data.observationKind;
 if(kind!==undefined&&!['public-v1','zero-public-v1'].includes(kind))throw Error('Unknown research observation');
 const expected=kind?publicSchemaSignature(kind):schemaSignature;
 return {...createActor(data,expected),maskedAction:maskedActorAction(data,expected),observationKind:kind};
}
export function actorObservation(actor:ReturnType<typeof createResearchActor>,game:SetupState,tracker:BotTracker,view:StandardView){
 return actor.observationKind?publicObservation(game,tracker,view,actor.observationKind):observation(view);
}
