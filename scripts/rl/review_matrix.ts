/** Frozen old/new actors against one another and the complete prior heuristic roster. */
import {mkdirSync,readFileSync,writeFileSync,existsSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createInterface} from 'node:readline';
import {Readable} from 'node:stream';
import {availableParallelism} from 'node:os';
import {PracticeSession} from '../../src/lib/bots/session';
import {createActor,type Actor} from '../../src/lib/bots/rl-runtime';
import {commands,observation} from '../../src/lib/bots/rl-schema';
import {decide,type BotMemory} from '../../src/lib/bots/policy';
import {createMinhPolicy} from '../../src/lib/bots/mm';
import {nereonFleetCommand as fleetCurrent} from '../../src/lib/bots/nereon-fleet';
import {nereonFleetCommand as fleetOriginal} from './teachers/nereon-fleet-v1';
import {doreiosGroveCommand} from '../../src/lib/bots/doreios-grove';
import {owlCommand} from './teachers/owl-v2';
import {activePlayer,standings} from '../../src/lib/game/actions';
import type {StandardView} from '../../standard-matrix/policy';

type Leader='melia'|'nereon'|'thaleia'|'doreios';
type Heuristic='mm'|'money'|'engine'|'classic-engine'|'owl'|'mn'|'fleet-v1'|'fleet-v6'|'grove';
type Entry={id:string;leader:Leader;generation?:'old'|'new';policy?:Heuristic;actor?:string;actorSHA256?:string;checkpointSHA256?:string};
type Config={output:string;seeds:string[];workers:number;entries:Entry[]};
type Match={key:string;a:Entry;b:Entry};
type Task={key:string;index:number};
const config:Config=JSON.parse(readFileSync(process.argv[2],'utf8'));
const sha=(bytes:string|Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const leaders:Leader[]=['melia','nereon','thaleia','doreios'];
if(config.seeds.length%2||new Set(config.seeds).size!==config.seeds.length)throw Error('Require distinct, even-numbered seeds');
if(new Set(config.entries.map(e=>e.id)).size!==config.entries.length)throw Error('Duplicate competitor identity');
const actors=new Map<string,ReturnType<typeof createActor>>();
for(const e of config.entries){
 if(e.actor){
  const bytes=readFileSync(e.actor);if(sha(bytes)!==e.actorSHA256)throw Error(`Actor drift: ${e.id}`);
  const actor=JSON.parse(bytes.toString()) as Actor;
  if(actor.leader!==e.leader||actor.checkpointSHA256!==e.checkpointSHA256||e.policy)throw Error('Invalid actor identity');
  actors.set(e.id,createActor(actor));
 }else if(!e.policy||!['mm','money','engine','classic-engine','owl','mn','fleet-v1','fleet-v6','grove'].includes(e.policy))throw Error('Invalid heuristic');
}
const matches:Match[]=[];
for(let i=0;i<config.entries.length;i++)for(const other of config.entries.slice(i+1)){
 const entry=config.entries[i];if(entry.leader===other.leader||(!entry.actor&&!other.actor))continue;
 // Fix each leader's physical UID across old/new and heuristic comparisons.
 const [a,b]=[entry,other].sort((x,y)=>leaders.indexOf(x.leader)-leaders.indexOf(y.leader));
 matches.push({key:`${a.id}--${b.id}`,a,b});
}
const mn=createMinhPolicy('nereon');
function command(e:Entry,view:StandardView,memory:BotMemory){
 if(view.leader!==e.leader)throw Error('Wrong competitor leader');
 const actor=actors.get(e.id);
 if(actor){const choices=commands(view);return choices[actor.action(observation(view),choices.map(Boolean))]!;}
 switch(e.policy){
  case 'mn':return mn(view);
  case 'owl':return owlCommand(view);
  case 'fleet-v1':return fleetOriginal(view);
  case 'fleet-v6':return fleetCurrent(view);
  case 'grove':return doreiosGroveCommand(view);
  default:return decide(view,memory,e.policy!);
 }
}
function run(match:Match,index:number){
 const session=new PracticeSession({seed:config.seeds[index],humanLeader:match.a.leader,botLeader:match.b.leader,humanFirst:index%2===0,bot:'bot'});
 for(let step=0;session.game.turn.phase!=='finished';step++){
  if(step>=5000)throw Error(`Unfinished ${match.key}/${index}`);
  const uid=activePlayer(session.game);session.apply(command(uid==='human'?match.a:match.b,session.tracker.view(session.game),session.tracker.memories[uid]));
 }
 const record=session.save(),restored=PracticeSession.restore(record);
 if(JSON.stringify(restored.game)!==JSON.stringify(session.game))throw Error('Replay mismatch');
 const scores=standings(session.game),a=scores.find(s=>s.uid==='human')!,b=scores.find(s=>s.uid==='bot')!;
 return {result:{key:match.key,index,seed:config.seeds[index],a:match.a.id,b:match.b.id,aFirst:index%2===0,
  aShare:a.winner?(b.winner?.5:1):0,aScore:a.score,bScore:b.score,turns:a.turns,commands:record.commands.length,replayVerified:true},record};
}
const file=(t:Task)=>`${config.output}/replays/${t.key}/${t.index}.json.gz`;
if(process.argv[3]==='worker'){
 for await(const line of createInterface({input:process.stdin})){
  const task:Task=JSON.parse(line),match=matches.find(m=>m.key===task.key);
  if(!match||!Number.isInteger(task.index)||task.index<0||task.index>=config.seeds.length)throw Error('Invalid task');
  const path=file(task);if(existsSync(path))throw Error('Refusing to overwrite completed game');
  const result=run(match,task.index);writeFileSync(path+'.tmp',gzipSync(JSON.stringify(result)));renameSync(path+'.tmp',path);
  console.log(JSON.stringify(task));
 }
}else{
 mkdirSync(config.output,{recursive:true});for(const m of matches)mkdirSync(`${config.output}/replays/${m.key}`,{recursive:true});
 const protocol={...config,matches,runnerSHA256:sha(readFileSync(import.meta.path)),
  pairing:'Same 100 seeds across every matchup; leader order fixes physical UIDs; even indices first canonical leader starts, odd indices second starts.',
  scope:'All old/new RL pairings and all RL/heuristic pairings. Same-leader and heuristic/heuristic games excluded. Mirror matrix cells reuse the same game with reversed outcome.',
  specialists:'MM, Owl, MN also assigned outside their intended leaders, matching the prior roster. Fleet variants require Nereon; Grove requires Doreios.',
  validation:'Every game completes and replays to identical full state. No exclusions or heuristic approximations.'};
 const protocolPath=`${config.output}/protocol.json`;
 if(existsSync(protocolPath)&&JSON.stringify(JSON.parse(readFileSync(protocolPath,'utf8')))!==JSON.stringify(protocol))throw Error('Benchmark drift on resume');
 writeFileSync(protocolPath,JSON.stringify(protocol,null,2)+'\n');
 const cost=(m:Match)=>[m.a.policy,m.b.policy].includes('money')?0:[m.a.policy,m.b.policy].includes('engine')?1:2;
 const schedule=[...matches].sort((a,b)=>cost(a)-cost(b));
 const tasks=schedule.flatMap(m=>config.seeds.map((_,index)=>({key:m.key,index}))).filter(t=>!existsSync(file(t)));
 let next=0,completed=0;const children=new Set<ReturnType<typeof Bun.spawn>>(),started=Date.now();
 console.log(JSON.stringify({matches:matches.length,games:matches.length*config.seeds.length,remaining:tasks.length}));
 try{await Promise.all(Array.from({length:Math.min(config.workers,availableParallelism(),tasks.length)},async()=>{
  const child=Bun.spawn([process.execPath,import.meta.path,process.argv[2],'worker'],{stdin:'pipe',stdout:'pipe',stderr:'inherit'});children.add(child);
  let expected:Task|undefined;
  const send=()=>{expected=tasks[next++];if(expected)child.stdin.write(JSON.stringify(expected)+'\n');else child.stdin.end();};send();
  for await(const line of createInterface({input:Readable.fromWeb(child.stdout as any)})){
   if(line!==JSON.stringify(expected))throw Error(`Unexpected worker response: ${line}`);
   if(!existsSync(file(expected!)))throw Error('Missing completed replay');
   completed++;if(completed%100===0)console.log(JSON.stringify({completed,remaining:tasks.length-completed,elapsedSeconds:(Date.now()-started)/1000}));send();
  }
  if(await child.exited!==0||expected)throw Error('Worker failed; no game excluded');children.delete(child);
 }));}catch(error){next=tasks.length;for(const child of children)child.kill();throw error;}
 const rows=matches.flatMap(m=>config.seeds.map((seed,index)=>{
  const r=JSON.parse(gunzipSync(readFileSync(file({key:m.key,index}))).toString()).result;
  if(r.key!==m.key||r.index!==index||r.seed!==seed||r.a!==m.a.id||r.b!==m.b.id||r.aFirst!==(index%2===0)||!r.replayVerified)throw Error('Invalid completed game');return r;
 }));
 writeFileSync(`${config.output}/games.json`,JSON.stringify(rows));
 writeFileSync(`${config.output}/completion.json`,JSON.stringify({games:rows.length,matches:matches.length,replayVerified:true,elapsedSeconds:(Date.now()-started)/1000,runnerSHA256:protocol.runnerSHA256},null,2)+'\n');
 console.log(JSON.stringify({complete:true,games:rows.length}));
}
