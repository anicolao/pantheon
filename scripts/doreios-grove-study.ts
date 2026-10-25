import {availableParallelism} from 'node:os';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PracticeSession} from '../src/lib/bots/session';
import {decide,type BotKind,type BotMemory} from '../src/lib/bots/policy';
import {doreiosGroveCommand,doreiosGroveVersion} from '../src/lib/bots/doreios-grove';
import {activePlayer,standings,definition} from '../src/lib/game/actions';
import type {StandardView} from '../standard-matrix/policy';
const output=process.env.GROVE_OUTPUT??`balance-results/doreios-grove-v${doreiosGroveVersion}`;
const smoke=process.env.GROVE_SMOKE==='true',games=smoke?8:100;
const candidates=smoke?['grove']:['grove','money','classic-engine'];
const choose=(v:StandardView,m:BotMemory,candidate:string)=>candidate==='grove'?doreiosGroveCommand(v):decide(v,m,candidate as BotKind);
const sha=(s:string|Uint8Array)=>createHash('sha256').update(s).digest('hex');
mkdirSync(output,{recursive:true});
function run(candidate:string,index:number){
 const seed=`doreios-grove-v1-${smoke?'grove-smoke':'evaluation'}:mm:melia:${index}`;
 const kind:BotKind=candidate==='grove'?'money':candidate as BotKind;
 const s=new PracticeSession({seed,humanLeader:'melia',botLeader:'doreios',humanFirst:index%2===0,bot:kind});
 let firstAcropolis:number|null=null,fullDeckTurns=0,lastFull=-1;
 const telemetry={buys:{} as Record<string,number>,worships:{} as Record<string,number>,trashed:{} as Record<string,number>};
 for(let step=0;s.game.turn.phase!=='finished';step++){
  if(step>=5000)throw Error(`Unfinished ${candidate}/${seed}`);
  const uid=activePlayer(s.game),v=s.tracker.view(s.game),turn=s.tracker.memories[uid].turn;
  const command=uid==='bot'?choose(v,s.tracker.memories[uid],candidate):decide(v,s.tracker.memories[uid],'mm');
  if(uid==='bot'){
   if(v.drawPileCount===0&&v.discard?.length===0&&lastFull!==turn){fullDeckTurns++;lastFull=turn;}
   if(command.type==='card/bought'){telemetry.buys[command.cardId]=(telemetry.buys[command.cardId]??0)+1;if(command.cardId==='acropolis')firstAcropolis??=turn;}
   if(command.type==='god/worshipped')telemetry.worships[command.cardId]=(telemetry.worships[command.cardId]??0)+1;
   if(command.type==='choice/resolved'&&v.choice?.kind==='trash')for(const id of command.targets){const card=v.hand.find(c=>c.id===id)!.cardId;telemetry.trashed[card]=(telemetry.trashed[card]??0)+1;}
  }
  s.apply(command);
 }
 const record=s.save(),restored=PracticeSession.restore(structuredClone(record));
 if(JSON.stringify(restored.game)!==JSON.stringify(s.game))throw Error(`Replay mismatch ${candidate}/${seed}`);
 const rows=standings(s.game),a=rows.find(r=>r.uid==='bot')!,b=rows.find(r=>r.uid==='human')!;
 const result={candidate,index,seed,doreiosFirst:!s.config.humanFirst,result:a.winner?(b.winner?'tie':'win'):'loss',doreiosVP:a.score,meliaVP:b.score,turns:a.turns,firstAcropolis,fullDeckTurns,commands:s.commands.length,telemetry,replayVerified:true};
 writeFileSync(`${output}/${candidate}-${index}.json.gz`,gzipSync(JSON.stringify({result,record})));
 return result;
}
if(process.argv[2]==='worker'){
 const candidate=process.argv[3],from=Number(process.argv[4]),to=Number(process.argv[5]);
 for(let i=from;i<to;i++){const path=`${output}/${candidate}-${i}.json.gz`;if(!existsSync(path))run(candidate,i);console.log(`${candidate} ${i+1}/${games}`);}
}else{
 const sourceFiles=execFileSync('git',['ls-files','src/lib/game','src/lib/bots','standard-matrix','historical-thaleia','balance-checkpoint'],{encoding:'utf8'}).trim().split('\n');
 if(!sourceFiles.includes('src/lib/bots/doreios-grove.ts'))sourceFiles.push('src/lib/bots/doreios-grove.ts');
 const h=createHash('sha256');for(const f of sourceFiles.sort())h.update(f).update(readFileSync(f));
 const protocol={version:doreiosGroveVersion,policySourceSHA256:h.digest('hex'),harnessSHA256:sha(readFileSync(import.meta.path)),baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),gamesPerCandidate:games,candidates,seedPattern:`doreios-grove-v1-${smoke?'grove-smoke':'evaluation'}:mm:melia:0..${games-1}`,equalTurns:true,seatBalance:'50 first / 50 second in evaluation; even indices MM first',opponent:'Unchanged MM v3 / Melia',validation:'All three policies use identical seeds and seats; all games replay to identical final states; no exclusions',tuning:'First policy frozen before evaluation; smoke namespace separate from evaluation',policy:'NDZUF Recruit/Grove engine; unlimited Feast gains; first Council after three Feasts if supported; two Talents, repeat Academy; free Hamlet/Obol thinning preserving purchases; selective Ares upgrades; refuse known-losing pile endings; no hidden opponent final-hand prediction'};
 if(existsSync(`${output}/protocol.json`)&&JSON.stringify(JSON.parse(readFileSync(`${output}/protocol.json`,'utf8')))!==JSON.stringify(protocol))throw Error('Refusing to resume changed protocol');
 writeFileSync(`${output}/protocol.json`,JSON.stringify(protocol,null,2));
 const jobs=candidates.flatMap(candidate=>Array.from({length:Math.ceil(games/5)},(_,i)=>({candidate,from:i*5,to:Math.min(games,i*5+5)})));
 let next=0;const workers=Math.min(availableParallelism(),jobs.length),children=new Set<ReturnType<typeof Bun.spawn>>(),start=Date.now();
 console.log(`Starting ${games*candidates.length} games on ${workers} workers`);
 try{await Promise.all(Array.from({length:workers},async()=>{while(next<jobs.length){const j=jobs[next++],child=Bun.spawn([process.execPath,import.meta.path,'worker',j.candidate,String(j.from),String(j.to)],{stdout:'inherit',stderr:'inherit'});children.add(child);const code=await child.exited;children.delete(child);if(code!==0)throw Error(`Failed ${JSON.stringify(j)}`);}}));}catch(e){next=jobs.length;for(const c of children)c.kill();throw e;}
 const records=candidates.flatMap(candidate=>Array.from({length:games},(_,i)=>JSON.parse(gunzipSync(readFileSync(`${output}/${candidate}-${i}.json.gz`)).toString())));
 const rows=records.map(r=>r.result);
 const credit=(r:any)=>r.result==='win'?1:r.result==='tie'?.5:0;
 function wilson(w:number,n:number){const z=1.959963984540054,p=w/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [c-h,c+h];}
 const summary=candidates.map(candidate=>{
  const r=rows.filter(x=>x.candidate===candidate),wins=r.filter(x=>x.result==='win').length,ties=r.filter(x=>x.result==='tie').length;
  if(r.length!==games||new Set(r.map(x=>x.index)).size!==games||r.filter(x=>x.doreiosFirst).length!==games/2)throw Error('Incomplete/unbalanced results');
  return {candidate,games,wins,ties,losses:games-wins-ties,winCI95:wilson(wins,games),winShare:r.reduce((n,x)=>n+credit(x),0)/games,meanVP:r.reduce((n,x)=>n+x.doreiosVP,0)/games,meanTurns:r.reduce((n,x)=>n+x.turns,0)/games,firstSeatWins:r.filter(x=>x.doreiosFirst&&x.result==='win').length,secondSeatWins:r.filter(x=>!x.doreiosFirst&&x.result==='win').length};
 });
 const grove=rows.filter(r=>r.candidate==='grove').sort((a,b)=>a.index-b.index);
 const comparisons=candidates.filter(c=>c!=='grove').map(candidate=>{
  const r=rows.filter(r=>r.candidate===candidate).sort((a,b)=>a.index-b.index);
  const d=r.map((x,i)=>credit(grove[i])-credit(x)),mean=d.reduce((a,b)=>a+b,0)/games,se=Math.sqrt(d.reduce((n,x)=>n+(x-mean)**2,0)/(games-1)/games);
  const newOnly=r.filter((x,i)=>grove[i].result==='win'&&x.result!=='win').length,oldOnly=r.filter((x,i)=>grove[i].result!=='win'&&x.result==='win').length,n=newOnly+oldOnly;
  let term=2**(-n),tail=term;for(let k=1;k<=Math.min(newOnly,oldOnly);k++){term*= (n-k+1)/k;tail+=term;}
  return {candidate,shareDelta:mean,pairedApprox95CI:[mean-1.984*se,mean+1.984*se],newOnlyWins:newOnly,oldOnlyWins:oldOnly,mcnemarExactP:Math.min(1,2*tail)};
 });
 const archive=gzipSync(JSON.stringify({protocol,records}));
 writeFileSync(`${output}/grove-replays.json.gz`,archive);writeFileSync(`${output}/grove-replays.sha256`,sha(archive)+'  grove-replays.json.gz\n');
 writeFileSync(`${output}/games.json`,JSON.stringify(rows,null,2));writeFileSync(`${output}/summary.json`,JSON.stringify({summary,comparisons},null,2));
 writeFileSync(`${output}/validation.json`,JSON.stringify({games:rows.length,replaysVerified:rows.filter(x=>x.replayVerified).length,workers,elapsedSeconds:(Date.now()-start)/1000},null,2));
 console.log(JSON.stringify({summary,comparisons},null,2));
}
