/** Capture public observations and planner labels without changing its decisions. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {FourEnvironment} from './four_environment';
import {commands,actionIndex} from '../../src/lib/bots/rl-schema';
import {rolloutDecision} from './belief_rollout';
import {createResearchActor,actorObservation} from './research_actor';

const [configPath,jobPath,outputPath]=process.argv.slice(2);
if(existsSync(outputPath))throw Error('Refusing to overwrite demonstrations');
const config=JSON.parse(readFileSync(configPath,'utf8')),job=JSON.parse(readFileSync(jobPath,'utf8'));
if(!Number.isInteger(job.games)||job.games<4||job.games%4||!Number.isInteger(job.start)||job.start<0||job.start%4)throw Error('Complete seed blocks required');
const env=new FourEnvironment('doreios',config.opponentManifest);
const data=JSON.parse(readFileSync(config.critic,'utf8'));
if(data.purpose!=='research-value'||data.reward.kind!=='score-margin'||data.reward.scale!==8||data.reward.winWeight!==0||data.layers.at(-1).output!==1)throw Error('Unsupported leaf critic');
const critic=createResearchActor(data);
const leafValue=(game:typeof env.game,tracker:typeof env.tracker)=>critic.logits(actorObservation(critic,game,tracker,tracker.view(game)))[0];
const observations:number[][]=[],masks:boolean[][]=[],labels:number[]=[],baseLabels:number[]=[],rows:unknown[]=[];
let overrides=0,searched=0;
for(let i=0;i<job.games;i++){
 let state=env.reset(`${job.prefix}:${job.start+i}`,true);
 while(!state.done){
  const view=env.tracker.view(env.game),baseIndex=env.runtime(),base=commands(view)[baseIndex]!;
  const decision=job.rule?rolloutDecision(env.game,env.tracker,env.actors,job.rule,leafValue):{command:base,searched:false};
  const index=actionIndex(view,decision.command);
  if(!state.mask![index]||state.observation!.some(x=>!Number.isFinite(x)))throw Error('Invalid demonstration');
  observations.push([...state.observation!]);masks.push([...state.mask!]);labels.push(index);baseLabels.push(baseIndex);
  if(index!==baseIndex)overrides++;
  if(decision.searched)searched++;
  state=env.step(index);
 }
 if(!state.info!.replayVerified)throw Error('Missing actual-game replay verification');
 rows.push(state.info);
}
const result={job,observations,masks,labels,baseLabels,rows,overrides,searched,
 configSHA256:createHash('sha256').update(readFileSync(configPath)).digest('hex'),
 note:'Research demonstrations only. Public observations, legal planner choices, actual production reducers and exact full replay verification. No production changes.'};
writeFileSync(outputPath,gzipSync(JSON.stringify(result)),{flag:'wx'});
console.log(JSON.stringify({games:rows.length,decisions:labels.length,overrides,searched,outputPath}));
