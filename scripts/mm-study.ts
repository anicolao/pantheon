import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {PracticeSession} from '../src/lib/bots/session';
import {decide,type BotKind} from '../src/lib/bots/policy';
import {mmVersion} from '../src/lib/bots/mm';
import {activePlayer,standings} from '../src/lib/game/actions';

const opponents=['engine','classic-engine','money'] as const;
const leaders=process.env.MM_NO_ARES==='1'?['thaleia','nereon']:['thaleia','nereon','doreios'];
const seedVersion=Number(process.env.MM_SEED_VERSION??mmVersion);
const output=process.env.MM_OUTPUT??`balance-results/mm-v${mmVersion}`;
const games=Number(process.env.MM_GAMES??100);
if(!Number.isSafeInteger(games)||games<2||games%2)throw Error('MM_GAMES must be a positive even number');
mkdirSync(output,{recursive:true});
export function wilson(wins:number,n:number,z=1.959963984540054):[number,number]{
 const p=wins/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;
 return [Math.max(0,c-h),Math.min(1,c+h)];
}
function run(kind:BotKind,leader:string,index:number){
 // Unique seed per game, including seat: no correlated mirrored games in the CI.
 const seed=`mm-v${seedVersion}-${games===100?'evaluation':'smoke'}:${kind}:${leader}:${index}`;
 const s=new PracticeSession({seed,humanLeader:leader,botLeader:'melia',humanFirst:index%2===0,bot:'mm'});
 const replayPath=`${output}/${kind}-${leader}-${index}.json.gz`;
 const saved=existsSync(replayPath)?JSON.parse(gunzipSync(readFileSync(replayPath)).toString()):null;
 if(saved&&JSON.stringify(saved.config)!==JSON.stringify(s.config))throw Error('Saved configuration mismatch: '+seed);
 const milestones:{firstAcropolis:number|null;thirtyVP:number|null}={firstAcropolis:null,thirtyVP:null};
 for(let step=0;s.game.turn.phase!=='finished';step++){
  if(step>=5000)throw Error(`Unfinished game: ${seed}`);
  const uid=activePlayer(s.game),v=s.tracker.view(s.game);
  // Use each opponent's production opening book, exactly as online/practice.
  const c=saved?saved.commands[step]:decide(v,s.tracker.memories[uid],uid==='bot'?'mm':kind);
  if(!c)throw Error('Truncated saved replay: '+seed);
  try{s.apply(c);}catch(e){throw Error(`${seed}, step ${step}, ${uid}, ${JSON.stringify(c)}: ${e}`);}
  if(uid==='bot'){
   const turn=s.tracker.memories.bot.turn;
   if((s.tracker.inventory.bot.acropolis??0)>0)milestones.firstAcropolis??=turn;
   if(standings(s.game).find(r=>r.uid==='bot')!.score>=30)milestones.thirtyVP??=turn;
  }
 }
 const rows=standings(s.game),mm=rows.find(r=>r.uid==='bot')!,op=rows.find(r=>r.uid==='human')!;
 if(saved&&saved.commands.length!==s.commands.length)throw Error('Trailing saved commands: '+seed);
 const record=saved??s.save();
 // Independent full replay validates that the resulting game really is reproducible.
 const replay=PracticeSession.restore(structuredClone(record));
 if(JSON.stringify(replay.game)!==JSON.stringify(s.game))throw Error('Replay mismatch: '+seed);
 if(!saved)writeFileSync(replayPath,gzipSync(JSON.stringify(record)));
 return {seed,index,mmFirst:!s.config.humanFirst,kind,leader,mmVP:mm.score,opponentVP:op.score,turns:mm.turns,
  result:mm.winner?(op.winner?'tie':'win'):'loss',...milestones,commands:s.commands.length};
}
if(process.argv[2]==='worker'){
 const kind=process.argv[3] as BotKind,leader=process.argv[4];
 const from=Number(process.argv[5]),to=Number(process.argv[6]);
 if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<0||to>games||from>=to)throw Error('Invalid worker range');
 const results=[];
 for(let i=from;i<to;i++){results.push(run(kind,leader,i));console.log(`${kind}/${leader}: ${i+1}/${games}`);}
 writeFileSync(`${output}/${kind}-${leader}-${from}-${to}.batch.json`,JSON.stringify(results));
}else if(import.meta.main){
 const files=execFileSync('git',['ls-files','src/lib/game','src/lib/bots','standard-matrix','historical-thaleia','balance-checkpoint'],{encoding:'utf8'}).trim().split('\n');
 if(!files.includes('src/lib/bots/mm.ts'))files.push('src/lib/bots/mm.ts');
 const hash=(paths:string[])=>{const h=createHash('sha256');for(const file of paths.sort())h.update(file).update(readFileSync(file));return h.digest('hex');};
 const policySourceSHA256=hash([...files]),sourceSHA256=hash([...files,'scripts/mm-study.ts']);
 const previous=existsSync(`${output}/protocol.json`)?JSON.parse(readFileSync(`${output}/protocol.json`,'utf8')):null;
 if(previous&&(previous.policySourceSHA256!==policySourceSHA256||previous.gamesPerCell!==games||previous.seedVersion!==seedVersion||JSON.stringify(previous.leaders)!==JSON.stringify(leaders)))throw Error('Refusing to resume results from another policy or study size');
 writeFileSync(`${output}/protocol.json`,JSON.stringify({mmVersion,seedVersion,gamesPerCell:games,total:games*opponents.length*leaders.length,sourceSHA256,policySourceSHA256,...(previous?{resumedFromSourceSHA256:previous.sourceSHA256}:{}),baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runtime:Bun.version,equalTurns:true,variant:'standard',leaders,opponents,seatBalance:'50/50 with independent seeds',interval:'95% Wilson score interval for outright win probability; ties are not wins; marginal, not family adjusted',missingGames:'Abort on any illegal action, timeout or replay mismatch; no exclusion',policyTuning:'Frozen before evaluation; smoke seeds are separate'},null,2));
 const cells=opponents.flatMap(kind=>leaders.map(leader=>({kind,leader})));
 const jobs=Array.from({length:Math.ceil(games/25)},(_,chunk)=>cells.map(cell=>({...cell,from:chunk*25,to:Math.min(games,(chunk+1)*25)}))).flat();
 let next=0;
 const children=new Set<ReturnType<typeof Bun.spawn>>();
 try{await Promise.all(Array.from({length:6},async()=>{
  while(next<jobs.length){const {kind,leader,from,to}=jobs[next++];const child=Bun.spawn([process.execPath,import.meta.path,'worker',kind,leader,String(from),String(to)],{stdout:'inherit',stderr:'inherit'});children.add(child);const status=await child.exited;children.delete(child);if(status!==0)throw Error(`Failed cell ${kind}/${leader}/${from}`);}
 }));}catch(error){next=jobs.length;for(const child of children)child.kill();throw error;}
 for(const {kind,leader} of cells){const rows=jobs.filter(j=>j.kind===kind&&j.leader===leader).flatMap(j=>JSON.parse(readFileSync(`${output}/${kind}-${leader}-${j.from}-${j.to}.batch.json`,'utf8')));if(rows.length!==games||new Set(rows.map(r=>r.index)).size!==games)throw Error('Incomplete cell');writeFileSync(`${output}/${kind}-${leader}.json`,JSON.stringify(rows,null,2));}
 const summary=cells.map(({kind,leader})=>{
  const rows=JSON.parse(readFileSync(`${output}/${kind}-${leader}.json`,'utf8')) as ReturnType<typeof run>[];
  const wins=rows.filter(r=>r.result==='win').length,ties=rows.filter(r=>r.result==='tie').length;
  const mean=(key:'mmVP'|'opponentVP'|'turns')=>rows.reduce((n,r)=>n+r[key],0)/rows.length;
  return {kind,leader,games:rows.length,wins,ties,losses:rows.length-wins-ties,winCI95:wilson(wins,rows.length),meanVP:mean('mmVP'),meanOpponentVP:mean('opponentVP'),meanTurns:mean('turns'),thirtyBy13:rows.filter(r=>r.thirtyVP!==null&&r.thirtyVP<=13).length,firstSeatWins:rows.filter(r=>r.mmFirst&&r.result==='win').length,secondSeatWins:rows.filter(r=>!r.mmFirst&&r.result==='win').length};
 });
 writeFileSync(`${output}/summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
}
