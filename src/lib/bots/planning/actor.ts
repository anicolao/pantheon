import {maskedActorAction} from './masked-actor';
import {createActor,type Actor} from '../rl-runtime';
import {observation,schemaSignature} from '../rl-schema';
import type {SetupState} from '../../game/setup';
import type {BotTracker} from '../session';
import type {StandardView} from '../../../../standard-matrix/policy';
import {publicObservation,publicSchemaSignature,type PublicObservationKind} from './public-features';
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
