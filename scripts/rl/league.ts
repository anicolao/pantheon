import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createActor,type Actor} from '../../src/lib/bots/rl-runtime';
import {commands,observation} from '../../src/lib/bots/rl-schema';
import {decide,type BotMemory} from '../../src/lib/bots/policy';
import {owlCommand} from './teachers/owl-v2';
import {nereonFleetCommand} from '../../src/lib/bots/nereon-fleet';
import {doreiosGroveCommand} from '../../src/lib/bots/doreios-grove';
import type {StandardView} from '../../standard-matrix/policy';
export type LeagueEntry={id:string;leader:string;group:'current'|'historical'|'heuristic';weight:number;actor?:string;actorSHA256?:string;checkpointSHA256?:string;policy?:'mm'|'money'|'engine'|'classic-engine'|'owl'|'fleet'|'grove'};
export const sha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
export function loadLeague(path:string){
 const raw=readFileSync(path,'utf8'),manifest=JSON.parse(raw) as {version:number;learners:Record<string,LeagueEntry[]>};
 if(manifest.version!==1)throw Error('Unsupported league manifest');
 const policies=new Map<string,ReturnType<typeof createActor>>();
 for(const [leader,entries] of Object.entries(manifest.learners)){
  if(!entries.length||new Set(entries.map(e=>e.id)).size!==entries.length)throw Error('Empty or duplicate league entries');
  for(const entry of entries){
   if(entry.leader===leader||!['melia','nereon','thaleia','doreios'].includes(entry.leader)||!Number.isInteger(entry.weight)||entry.weight<1)throw Error('Invalid league opponent');
   if(entry.actor){
    const bytes=readFileSync(entry.actor);if(sha(bytes)!==entry.actorSHA256)throw Error(`Actor drift: ${entry.id}`);
    const actor=JSON.parse(bytes.toString()) as Actor;if(actor.leader!==entry.leader||actor.checkpointSHA256!==entry.checkpointSHA256||entry.policy)throw Error('Actor identity mismatch');
    policies.set(entry.id,createActor(actor));
   }else if(!entry.policy||!['mm','money','engine','classic-engine','owl','fleet','grove'].includes(entry.policy))throw Error('Unknown heuristic');
  }
 }
 return {hash:sha(raw),manifest,select(leader:string,index:number){
  const entries=manifest.learners[leader];if(!entries)throw Error('Missing learner schedule');
  const slots=entries.flatMap(e=>Array.from({length:e.weight},()=>e));return slots[Math.floor(index/2)%slots.length];
 },command(entry:LeagueEntry,view:StandardView,memory:BotMemory){
  if(view.leader!==entry.leader)throw Error('Wrong opponent leader');
  const actor=policies.get(entry.id);if(actor){const choices=commands(view);return choices[actor.action(observation(view),choices.map(Boolean))]!;}
  switch(entry.policy){case 'owl':return owlCommand(view);case 'fleet':return nereonFleetCommand(view);case 'grove':return doreiosGroveCommand(view);default:return decide(view,memory,entry.policy!);}
 }};
}
