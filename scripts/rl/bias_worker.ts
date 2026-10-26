/** Research-only black-box preference search. Every episode replays through real reducers. */
import {readFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {FourEnvironment} from './four_environment';
import {createResearchActor,type ResearchActorData} from './research_actor';
import {slots,deckIds,eventIds} from '../../src/lib/bots/rl-schema';
export const biasNames=[...deckIds.map(id=>'card:'+id),...deckIds.map(id=>'select:'+id),...eventIds.map(id=>'worship:'+id),'select:skip'];
export function biasVector(parameters:number[]):number[]{
 if(parameters.length!==biasNames.length||parameters.some(x=>!Number.isFinite(x)))throw Error('Bad preference vector');
 const m=Object.fromEntries(biasNames.map((name,i)=>[name,parameters[i]]));
 return slots.map(s=>Math.fround(s.kind==='buy'||s.kind==='gain'?m['card:'+s.ids[0]]:s.kind==='select'?(s.ids.length?s.ids.reduce((n,id)=>n+m['select:'+id],0):m['select:skip']):s.kind==='worship'?m['worship:'+s.ids[0]]:0));
}
export function withBias(actor:ResearchActorData,parameters:number[]):ResearchActorData{
 const layers=actor.layers.map(l=>({...l})),last=layers.at(-1)!,bytes=Buffer.from(last.bias,'base64'),vector=biasVector(parameters);
 if(bytes.length!==vector.length*4)throw Error('Wrong output size');
 for(let i=0;i<vector.length;i++)bytes.writeFloatLE(Math.fround(bytes.readFloatLE(i*4)+vector[i]),i*4);
 last.bias=bytes.toString('base64');return {...actor,layers};
}
if(import.meta.main){
 const c=JSON.parse(readFileSync(process.argv[2],'utf8')),base=JSON.parse(readFileSync(c.actor,'utf8')) as ResearchActorData;
 const env=new FourEnvironment('doreios',c.opponentManifest);
 for await(const line of createInterface({input:process.stdin})){
  const job=JSON.parse(line);env.actors.doreios=createResearchActor(withBias(base,job.parameters));const rows=[];
  for(let i=0;i<job.games;i++){
   let state=env.reset(`${job.prefix}:${i}`,true);
   while(!state.done)state=env.step(env.runtime());
   rows.push(state.info);
  }
  process.stdout.write(JSON.stringify({rows,vector:biasVector(job.parameters)})+'\n');
 }
}
