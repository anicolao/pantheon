/** Research-only transport for a field mixing legacy and queue-aware actors. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ExpansionEnvironment} from './environment';
import {createActor,type Actor} from '../../../src/lib/bots/rl-runtime';
import {activePlayer} from '../../../src/lib/game/actions';
import {commands,observation,schemaSignature} from './schema';
import {deployQueueFeatures,deployQueueSignature} from './deploy_schema';
export class LeagueEnvironment extends ExpansionEnvironment {
 queueActors=new Set<string>();
 constructor(leader:string,manifest:string,fixedOpponent?:string){
  const field=JSON.parse(readFileSync(manifest,'utf8'));
  super(leader,field.baseField,fixedOpponent);
  this.manifest=field;this.actors={};
  for(const [id,value] of Object.entries(field.actors)){
   const entry=value as {path:string;sha256:string},raw=readFileSync(entry.path);
   if(createHash('sha256').update(raw).digest('hex')!==entry.sha256)throw Error('Frozen actor drift');
   const actor=JSON.parse(raw.toString()) as Actor;
   if(actor.leader!==id)throw Error('Wrong leader');
   const queue=actor.schemaSignature===deployQueueSignature;
   if(queue)this.queueActors.add(id);
   this.actors[id]=createActor(actor,queue?deployQueueSignature:schemaSignature);
  }
 }
 opponents(){while(this.game.turn.phase!=='finished'&&activePlayer(this.game)!==this.uid){
  const uid=activePlayer(this.game),leader=this.game.leaders[uid],options=commands(this.game),base=observation(this.game);
  const obs=this.queueActors.has(leader)?[...base,...deployQueueFeatures(this.game.turn.deploy??[])]:base;
  const index=this.actors[leader].action(obs,options.map(Boolean));
  if(!options[index])throw Error('Illegal opponent action');this.apply(options[index]!);
 }}
}
