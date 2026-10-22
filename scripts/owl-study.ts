import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PracticeSession} from '../src/lib/bots/session';
import {decide,type BotKind} from '../src/lib/bots/policy';
import {activePlayer,standings,definition} from '../src/lib/game/actions';
import {owlVersion} from '../src/lib/bots/owl';
const output=process.env.OWL_OUTPUT??`balance-results/owl-v${owlVersion}`;
const games=Number(process.env.OWL_GAMES??100);
if(!Number.isSafeInteger(games)||games<2||games%2)throw Error('Even game count required');
const candidates:BotKind[]=process.env.OWL_ONLY==='1'?['owl']:['owl','money','classic-engine'];
const seedVersion=Number(process.env.OWL_SEED_VERSION??owlVersion);
const opponents=(['engine','classic-engine','money'] as const).flatMap(kind=>['melia','nereon','doreios'].map(leader=>({kind:kind as BotKind,leader}))).concat([{kind:'mm',leader:'melia'}]).filter(op=>process.env.OWL_MELIA_ONLY!=='1'||op.leader==='melia');
const cells=candidates.flatMap(candidate=>opponents.map(op=>({candidate,...op})));
mkdirSync(output,{recursive:true});
const sha=(data:string|Uint8Array)=>createHash('sha256').update(data).digest('hex');
function wilson(w:number,n:number){const z=1.959963984540054,p=w/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [Math.max(0,c-h),Math.min(1,c+h)];}
function run(candidate:BotKind,kind:BotKind,leader:string,index:number){
 const seed=`owl-v${seedVersion}-${games===100?'evaluation':'smoke'}:${kind}:${leader}:${index}`;
 const path=`${output}/${candidate}-${kind}-${leader}-${index}.json.gz`;
 const s=new PracticeSession({seed,humanLeader:leader,botLeader:'thaleia',humanFirst:index%2===0,bot:candidate});
 const saved=existsSync(path)?JSON.parse(gunzipSync(readFileSync(path)).toString()):null;
 if(saved&&JSON.stringify(saved.config)!==JSON.stringify(s.config))throw Error('Config mismatch');
 let firstCombo:number|null=null,combos=0,firstAcropolis:number|null=null,thirtyVP:number|null=null,fullDeckTurns=0,lastFull=-1;
 let worshipTurn=-1,lastCombo=-1;
 for(let step=0;s.game.turn.phase!=='finished';step++){
  if(step>=5000)throw Error(`Unfinished ${candidate}/${seed}`);
  const uid=activePlayer(s.game),v=s.tracker.view(s.game),turn=s.tracker.memories.bot?.turn??0;
  const command=saved?saved.commands[step]:decide(v,s.tracker.memories[uid],uid==='bot'?candidate:kind);
  if(!command)throw Error('Truncated replay');
  if(uid==='bot'){
   if(v.drawPileCount===0&&(v.discard?.length??0)===0&&lastFull!==turn){fullDeckTurns++;lastFull=turn;}
   if(command.type==='god/worshipped'&&command.cardId==='counsel-of-olympus'&&v.play.filter(c=>definition(c.cardId).type==='Action'&&definition(c.cardId).god==='Athena').length>=2)worshipTurn=turn;
   if(command.type==='card/bought'&&command.cardId==='acropolis'){
    firstAcropolis??=turn;
    if(worshipTurn===turn&&lastCombo!==turn){combos++;firstCombo??=turn;lastCombo=turn;}
   }
  }
  try{s.apply(command);}catch(error){throw Error(`${candidate}/${seed}, step ${step}, ${JSON.stringify(command)}: ${error}`);}
  if(uid==='bot'&&standings(s.game).find(r=>r.uid==='bot')!.score>=30)thirtyVP??=turn;
 }
 if(saved&&saved.commands.length!==s.commands.length)throw Error('Trailing replay commands');
 const record=saved??s.save();
 if(JSON.stringify(PracticeSession.restore(structuredClone(record)).game)!==JSON.stringify(s.game))throw Error('Replay mismatch');
 if(!saved)writeFileSync(path,gzipSync(JSON.stringify(record)));
 const rows=standings(s.game),a=rows.find(r=>r.uid==='bot')!,b=rows.find(r=>r.uid==='human')!;
 return {seed,index,candidate,kind,leader,mmFirst:!s.config.humanFirst,result:a.winner?(b.winner?'tie':'win'):'loss',mmVP:a.score,opponentVP:b.score,turns:a.turns,firstAcropolis,thirtyVP,firstCombo,combos,fullDeckTurns,commands:s.commands.length};
}
if(process.argv[2]==='worker'){
 const [candidate,kind,leader]=process.argv.slice(3,6),from=Number(process.argv[6]),to=Number(process.argv[7]);
 const rows=[];for(let i=from;i<to;i++){rows.push(run(candidate as BotKind,kind as BotKind,leader,i));console.log(`${candidate}/${kind}/${leader}: ${i+1}/${games}`);}
 writeFileSync(`${output}/${candidate}-${kind}-${leader}-${from}-${to}.batch.json`,JSON.stringify(rows));
}else{
 const files=execFileSync('git',['ls-files','src/lib/game','src/lib/bots','standard-matrix','historical-thaleia','balance-checkpoint'],{encoding:'utf8'}).trim().split('\n');if(!files.includes('src/lib/bots/owl.ts'))files.push('src/lib/bots/owl.ts');
 const h=createHash('sha256');for(const file of files.sort())h.update(file).update(readFileSync(file));
 const policySourceSHA256=h.digest('hex');
 const previous=existsSync(`${output}/protocol.json`)?JSON.parse(readFileSync(`${output}/protocol.json`,'utf8')):null;
 if(previous&&(previous.policySourceSHA256!==policySourceSHA256||previous.gamesPerCell!==games||previous.seedVersion!==seedVersion||JSON.stringify(previous.candidates)!==JSON.stringify(candidates)||JSON.stringify(previous.opponents)!==JSON.stringify(opponents)))throw Error('Policy changed; refusing resume');
 const protocol={...(previous?{resumedFromHarnessSHA256:previous.harnessSHA256}:{}),owlVersion,seedVersion,gamesPerCell:games,total:cells.length*games,candidates,opponents,policySourceSHA256,harnessSHA256:sha(readFileSync(import.meta.path)),baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runtime:Bun.version,equalTurns:true,variant:'standard',seatBalance:'50/50; same seeds and seats across candidate policies',failedGames:'Abort, never omit',mmPolicy:'Restored v3 (Sacred Grove first)',interval:'Marginal 95% Wilson intervals for outright wins, ties not wins',tuning:'Policy frozen before evaluation; smoke uses separate seed namespace'};
 writeFileSync(`${output}/protocol.json`,JSON.stringify(protocol,null,2));
 const jobs=Array.from({length:Math.ceil(games/10)},(_,chunk)=>cells.map(cell=>({...cell,from:chunk*10,to:Math.min(games,(chunk+1)*10)}))).flat();
 let next=0;const children=new Set<ReturnType<typeof Bun.spawn>>();
 try{await Promise.all(Array.from({length:12},async()=>{while(next<jobs.length){const j=jobs[next++];const child=Bun.spawn([process.execPath,import.meta.path,'worker',j.candidate,j.kind,j.leader,String(j.from),String(j.to)],{stdout:'inherit',stderr:'inherit'});children.add(child);const status=await child.exited;children.delete(child);if(status!==0)throw Error('Failed '+JSON.stringify(j));}}));}catch(error){next=jobs.length;for(const child of children)child.kill();throw error;}
 const summary=cells.map(cell=>{
  const rows=jobs.filter(j=>j.candidate===cell.candidate&&j.kind===cell.kind&&j.leader===cell.leader).flatMap(j=>JSON.parse(readFileSync(`${output}/${j.candidate}-${j.kind}-${j.leader}-${j.from}-${j.to}.batch.json`,'utf8')));
  if(rows.length!==games||new Set(rows.map(r=>r.index)).size!==games||rows.filter(r=>r.mmFirst).length!==games/2)throw Error('Incomplete/unbalanced cell');
  writeFileSync(`${output}/${cell.candidate}-${cell.kind}-${cell.leader}.json`,JSON.stringify(rows,null,2));
  const wins=rows.filter(r=>r.result==='win').length,ties=rows.filter(r=>r.result==='tie').length;
  return {...cell,games,wins,ties,losses:games-wins-ties,winCI95:wilson(wins,games),meanVP:rows.reduce((n,r)=>n+r.mmVP,0)/games,meanTurns:rows.reduce((n,r)=>n+r.turns,0)/games,thirtyBy13:rows.filter(r=>r.thirtyVP!==null&&r.thirtyVP<=13).length,gamesWithCombo:rows.filter(r=>r.combos>0).length,comboTurns:rows.reduce((n,r)=>n+r.combos,0),fullDeckTurns:rows.reduce((n,r)=>n+r.fullDeckTurns,0)};
 });
 writeFileSync(`${output}/summary.json`,JSON.stringify(summary,null,2));
 const records=[];
 for(const cell of cells)for(let i=0;i<games;i++){const file=`${cell.candidate}-${cell.kind}-${cell.leader}-${i}.json.gz`,raw=gunzipSync(readFileSync(`${output}/${file}`));records.push({file,sha256:sha(raw),record:JSON.parse(raw.toString())});}
 const archive=gzipSync(JSON.stringify({version:1,protocol,records})),restored=JSON.parse(gunzipSync(archive).toString());
 if(restored.records.length!==protocol.total||restored.records.some((r:any)=>sha(JSON.stringify(r.record))!==r.sha256))throw Error('Archive verification failed');
 writeFileSync(`${output}/replays.json.gz`,archive);writeFileSync(`${output}/replays.sha256`,`${sha(archive)}  replays.json.gz\n`);
 console.log(JSON.stringify(summary,null,2));
}
