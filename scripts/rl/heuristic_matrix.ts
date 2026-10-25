import {mkdirSync,readFileSync,writeFileSync,existsSync,renameSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {availableParallelism} from 'node:os';
import {PracticeSession} from '../../src/lib/bots/session';
import {decide,type BotKind,type BotMemory} from '../../src/lib/bots/policy';
import {rlCommand,rlCheckpointHash} from '../../src/lib/bots/rl';
import {createMinhPolicy} from '../../src/lib/bots/mm';
import {nereonFleetCommand as fleetCurrent} from '../../src/lib/bots/nereon-fleet';
import {nereonFleetCommand as fleetOriginal} from './teachers/nereon-fleet-v1';
import {doreiosGroveCommand} from '../../src/lib/bots/doreios-grove';
import {owlCommand} from './teachers/owl-v2';
import {activePlayer,standings} from '../../src/lib/game/actions';
import type {StandardView} from '../../standard-matrix/policy';

type Leader='melia'|'nereon'|'thaleia'|'doreios';
type Policy='mm'|'money'|'engine'|'classic-engine'|'owl'|'mn'|'fleet-v1'|'fleet-v6'|'grove';
type Match={learner:Leader;opponent:Leader;policy:Policy;key:string};
type Config={output:string;prefix:string;games:number;workers:number;leaders:Leader[]};
const config:Config=JSON.parse(readFileSync(process.argv[2],'utf8'));
const leaders:Leader[]=['melia','nereon','thaleia','doreios'];
const policies:{policy:Policy;leaders:Leader[]}[]=[
 ...(['mm','money','engine','classic-engine','owl','mn'] as Policy[]).map(policy=>({policy,leaders})),
 {policy:'fleet-v1',leaders:['nereon']},{policy:'fleet-v6',leaders:['nereon']},{policy:'grove',leaders:['doreios']}
];
const matches:Match[]=config.leaders.flatMap(learner=>policies.flatMap(({policy,leaders})=>leaders.filter(opponent=>opponent!==learner).map(opponent=>({learner,opponent,policy,key:`${learner}--${policy}--${opponent}`}))));
const mn=createMinhPolicy('nereon');
function heuristic(view:StandardView,memory:BotMemory,policy:Policy){
 switch(policy){
  case 'mn':return mn(view);
  case 'owl':return owlCommand(view);
  case 'fleet-v1':return fleetOriginal(view);
  case 'fleet-v6':return fleetCurrent(view);
  case 'grove':return doreiosGroveCommand(view);
  default:return decide(view,memory,policy as BotKind);
 }
}
function run(match:Match,index:number){
 const seed=`${config.prefix}:${match.learner}:${match.opponent}:${index}`;
 const session=new PracticeSession({seed,humanLeader:match.opponent,botLeader:match.learner,humanFirst:index%2!==0,bot:'bot'});
 for(let step=0;session.game.turn.phase!=='finished';step++){
  if(step>=5000)throw Error(`Unfinished game: ${match.key}/${index}`);
  const uid=activePlayer(session.game),view=session.tracker.view(session.game);
  session.apply(uid==='bot'?rlCommand(view):heuristic(view,session.tracker.memories[uid],match.policy));
 }
 const record=session.save(),restored=PracticeSession.restore(record);
 if(JSON.stringify(restored.game)!==JSON.stringify(session.game))throw Error(`Replay mismatch: ${match.key}/${index}`);
 const scores=standings(session.game),me=scores.find(s=>s.uid==='bot')!,other=scores.find(s=>s.uid==='human')!;
 return {result:{...match,index,seed,first:index%2===0,outcome:me.winner?(other.winner?'tie':'win'):'loss',score:me.score,opponentScore:other.score,turns:me.turns,commands:record.commands.length,replayVerified:true},record};
}
function wilson(w:number,n:number){const z=1.959963984540054,p=w/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [c-h,c+h];}
function summary(rows:any[]){
 const n=rows.length,w=rows.filter(r=>r.outcome==='win').length,t=rows.filter(r=>r.outcome==='tie').length;
 return {games:n,wins:w,ties:t,losses:n-w-t,winRate:w/n,share:(w+t*.5)/n,winCI95:wilson(w,n),meanVP:rows.reduce((n,r)=>n+r.score,0)/n,meanOpponentVP:rows.reduce((n,r)=>n+r.opponentScore,0)/n};
}
// Policies share seeds, so aggregate uncertainty clusters all outcomes for a seed.
function clustered(rows:any[]){
 const result=summary(rows),groups=new Map<string,{wins:number;n:number}>();
 for(const row of rows){const group=groups.get(row.seed)??{wins:0,n:0};group.n++;group.wins+=Number(row.outcome==='win');groups.set(row.seed,group);}
 const g=groups.size,variance=g/(g-1)*[...groups.values()].reduce((n,x)=>n+(x.wins-result.winRate*x.n)**2,0)/(rows.length**2),h=1.96*Math.sqrt(variance);
 return {...result,winCI95:[Math.max(0,result.winRate-h),Math.min(1,result.winRate+h)],ciMethod:'approximate 95% clustered by shared game seed',seedClusters:g};
}
const out=config.output;
if(process.argv[3]==='worker'){
 const match=matches.find(m=>m.key===process.argv[4])!,from=Number(process.argv[5]),to=Number(process.argv[6]);
 if(!match)throw Error('Unknown matchup');
 const records=[];for(let i=from;i<to;i++)records.push(run(match,i));
 const path=`${out}/replays/${match.key}-${from}.json.gz`;
 if(existsSync(path))throw Error('Refusing to overwrite completed shard');
 writeFileSync(path+'.tmp',gzipSync(JSON.stringify(records)));renameSync(path+'.tmp',path);console.log(`${match.key}: ${to}/${config.games}`);
}else{
 if(config.games%2)throw Error('An even number of games is required');
 mkdirSync(`${out}/replays`,{recursive:true});
 const protocol={...config,matches,checkpointSHA256:Object.fromEntries(config.leaders.map(l=>[l,rlCheckpointHash(l)])),runnerSHA256:createHash('sha256').update(readFileSync(import.meta.path)).digest('hex'),seatBalance:'even indices RL first; odd indices heuristic first',seedPairing:'Same learner/opponent/index seeds across heuristic policies; no same-leader matches',validation:'Every game completes and replays to identical full state; no exclusions',specialists:'Owl and MN also evaluated outside their intended leaders because their historical policies accept those assignments; intended leaders are Thaleia and Nereon respectively. Fleet requires Nereon; Grove requires Doreios.'};
 const protocolPath=`${out}/protocol.json`;
 if(existsSync(protocolPath)&&JSON.stringify(JSON.parse(readFileSync(protocolPath,'utf8')))!==JSON.stringify(protocol))throw Error('Cannot resume a changed benchmark');
 writeFileSync(protocolPath,JSON.stringify(protocol,null,2));
 const tasks=matches.flatMap(match=>Array.from({length:Math.ceil(config.games/5)},(_,i)=>({match,from:i*5,to:Math.min(config.games,(i+1)*5)}))).filter(t=>!existsSync(`${out}/replays/${t.match.key}-${t.from}.json.gz`));
 let next=0;const children=new Set<ReturnType<typeof Bun.spawn>>(),started=Date.now();
 const workers=Math.min(config.workers,availableParallelism(),tasks.length);
 console.log(`Running ${matches.length} matchups, ${config.games} games each, ${workers} workers`);
 try{await Promise.all(Array.from({length:workers},async()=>{
  while(next<tasks.length){const t=tasks[next++],child=Bun.spawn([process.execPath,import.meta.path,process.argv[2],'worker',t.match.key,String(t.from),String(t.to)],{stdout:'inherit',stderr:'inherit'});children.add(child);const code=await child.exited;children.delete(child);if(code!==0)throw Error(`Failed ${t.match.key}/${t.from}`);}
 }));}catch(error){next=tasks.length;for(const child of children)child.kill();throw error;}
 const rows=matches.flatMap(match=>Array.from({length:Math.ceil(config.games/5)},(_,i)=>JSON.parse(gunzipSync(readFileSync(`${out}/replays/${match.key}-${i*5}.json.gz`)).toString()).map((record:any)=>record.result)).flat());
 for(const match of matches){const group=rows.filter(r=>r.key===match.key);if(group.length!==config.games||new Set(group.map(r=>r.index)).size!==config.games||group.filter(r=>r.first).length!==config.games/2||!group.every(r=>r.replayVerified))throw Error(`Incomplete ${match.key}`);}
 writeFileSync(`${out}/games.json`,JSON.stringify(rows));
 const results={elapsedSeconds:(Date.now()-started)/1000,totalGames:rows.length,matchups:matches.map(match=>({...match,...summary(rows.filter(r=>r.key===match.key))})),byLearner:config.leaders.map(leader=>({leader,...clustered(rows.filter(r=>r.learner===leader))})),generalPoliciesOnly:config.leaders.map(leader=>({leader,...clustered(rows.filter(r=>r.learner===leader&&['mm','money','engine','classic-engine','owl','mn'].includes(r.policy)))})),byPolicy:config.leaders.flatMap(leader=>policies.filter(p=>rows.some(r=>r.learner===leader&&r.policy===p.policy)).map(p=>({leader,policy:p.policy,...summary(rows.filter(r=>r.learner===leader&&r.policy===p.policy))})))};
 writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify({totalGames:rows.length,elapsedSeconds:results.elapsedSeconds,byLearner:results.byLearner}));
}
