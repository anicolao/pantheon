/** Research environment with frozen planning opponents and an optional planning learner. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FourEnvironment} from './four_environment';
import {createResearchActor,actorObservation} from './research_actor';
import {rolloutDecision,type RolloutOptions} from './belief_rollout';
import {actionIndex} from '../../src/lib/bots/rl-schema';
type Spec={critic:{path:string;sha256:string};rule:RolloutOptions;useCurrentActor?:boolean};
export class PlanningEnvironment extends FourEnvironment{
 readonly worldActors:FourEnvironment['actors'];
 readonly planners:Record<string,{spec:Spec;critic:ReturnType<typeof createResearchActor>;signed:boolean}>={};
 counts:Record<string,{searched:number;overrides:number}>={};
 constructor(leader:string,manifestPath:string){
  super(leader,manifestPath);const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  if(!manifest.planning?.worldManifest)throw Error('Frozen planning world required');
  this.worldActors=new FourEnvironment(leader,manifest.planning.worldManifest).actors;
  for(const [name,spec] of Object.entries(manifest.planning.policies) as [string,Spec][]){
   const raw=readFileSync(spec.critic.path);if(createHash('sha256').update(raw).digest('hex')!==spec.critic.sha256)throw Error('Planning critic drift');
   const data=JSON.parse(raw.toString());if(data.purpose!=='research-value'||data.leader!==name||data.layers.at(-1).output!==1)throw Error('Wrong planning critic');
   const signed=data.reward.kind==='signed-split-win';
   if(signed?spec.rule.utility!=='win':data.reward.kind!=='score-margin'||data.reward.scale!==8||data.reward.winWeight!==0||spec.rule.utility!=='margin')throw Error('Critic utility mismatch');
   this.planners[name]={spec,critic:createResearchActor(data),signed};this.counts[name]={searched:0,overrides:0};
  }
 }
 override runtime(){
  const base=super.runtime(),view=this.tracker.view(this.game),p=this.planners[view.leader];if(!p)return base;
  // Updating the learner must not silently update the opponents' internal models.
  const models=p.spec.useCurrentActor?{...this.worldActors,[view.leader]:this.actors[view.leader]}:this.worldActors;
  const leaf=(game:typeof this.game,tracker:typeof this.tracker)=>{const value=p.critic.logits(actorObservation(p.critic,game,tracker,tracker.view(game)))[0];return p.signed?(value+1)/2:value;};
  const d=rolloutDecision(this.game,this.tracker,models,p.spec.rule,leaf),chosen=actionIndex(view,d.command);
  if(d.searched)this.counts[view.leader].searched++;if(chosen!==base)this.counts[view.leader].overrides++;return chosen;
 }
}
