import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
import {FourEnvironment} from './four_environment';
import {commands} from '../../src/lib/bots/rl-schema';
import {createResearchActor,actorObservation} from './research_actor';
import {ensembleAction} from './ensemble_policy';
const c=JSON.parse(readFileSync(process.argv[2],'utf8')),env=new FourEnvironment('doreios',c.opponentManifest);
const raw=readFileSync(c.secondaryActor.path);if(createHash('sha256').update(raw).digest('hex')!==c.secondaryActor.sha256)throw Error('Secondary actor drift');
const secondary=createResearchActor(JSON.parse(raw.toString()));
if(secondary.leader!=='doreios'||secondary.observationKind!==env.actors.doreios.observationKind)throw Error('Incompatible ensemble');
for await(const line of createInterface({input:process.stdin})){
 const job=JSON.parse(line),rows=[];let overrides=0;
 for(let i=0;i<job.games;i++){
  let state=env.reset(`${job.prefix}:${(job.start??0)+i}`,true);
  while(!state.done){
   const base=env.runtime();let chosen=base;
   if(job.rule){const v=env.tracker.view(env.game),actor=env.actors.doreios,obs=actorObservation(actor,env.game,env.tracker,v);chosen=ensembleAction(actor.logits(obs),secondary.logits(obs),commands(v).map(Boolean),job.rule);}
   if(chosen!==base)overrides++;state=env.step(chosen);
  }
  rows.push(state.info);
 }
 process.stdout.write(JSON.stringify({rows,overrides,searched:0})+'\n');
}
