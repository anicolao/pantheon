/** Doreios keeps its frozen planner; optionally add the same search budget to Thaleia. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
import {FourEnvironment} from './four_environment';
import {commands,actionIndex} from '../../src/lib/bots/rl-schema';
import {rolloutDecision} from './belief_rollout';
import {createResearchActor,actorObservation} from './research_actor';
const c=JSON.parse(readFileSync(process.argv[2],'utf8'));
function critic(entry:{path:string;sha256:string},leader:string,kind:string){
 const raw=readFileSync(entry.path);if(createHash('sha256').update(raw).digest('hex')!==entry.sha256)throw Error('Critic drift');
 const data=JSON.parse(raw.toString());if(data.leader!==leader||data.purpose!=='research-value'||data.reward.kind!==kind||data.layers.at(-1).output!==1)throw Error('Wrong critic');
 if(leader==='doreios'&&(data.reward.scale!==8||data.reward.winWeight!==0))throw Error('Wrong Doreios reward');
 return createResearchActor(data);
}
const dc=critic(c.doreiosCritic,'doreios','score-margin'),tc=critic(c.thaleiaCritic,'thaleia','signed-split-win');
class Table extends FourEnvironment{
 thaleiaPlanning=false;counts={doreios:{searched:0,overrides:0},thaleia:{searched:0,overrides:0}};
 leaf(actor:typeof dc,signed=false){return (game:typeof this.game,tracker:typeof this.tracker)=>{const v=actor.logits(actorObservation(actor,game,tracker,tracker.view(game)))[0];return signed?(v+1)/2:v;};}
 planned(leader:'doreios'|'thaleia',base:number){
  const view=this.tracker.view(this.game);if(view.leader!==leader)throw Error('Wrong planner perspective');
  const decision=rolloutDecision(this.game,this.tracker,this.actors,leader==='doreios'?c.doreiosRule:c.thaleiaRule,this.leaf(leader==='doreios'?dc:tc,leader==='thaleia'));
  const chosen=actionIndex(view,decision.command);if(decision.searched)this.counts[leader].searched++;if(chosen!==base)this.counts[leader].overrides++;return chosen;
 }
 override runtime(){const base=super.runtime();return this.thaleiaPlanning&&this.tracker.view(this.game).leader==='thaleia'?this.planned('thaleia',base):base;}
}
const env=new Table('doreios',c.opponentManifest);
for await(const line of createInterface({input:process.stdin})){
 const job=JSON.parse(line),rows=[],start=performance.now();env.thaleiaPlanning=job.thaleiaPlanner;env.counts={doreios:{searched:0,overrides:0},thaleia:{searched:0,overrides:0}};
 for(let i=0;i<job.games;i++){
  let state=env.reset(`${job.prefix}:${job.start+i}`,true);
  while(!state.done)state=env.step(env.planned('doreios',env.runtime()));
  rows.push(state.info);
 }
 process.stdout.write(JSON.stringify({rows,counts:env.counts,seconds:(performance.now()-start)/1000})+'\n');
}
