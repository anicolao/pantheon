import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { matrixReport, matrixSchedule, type MatrixGame } from '../../scripts/balance/matrix';
import { digest, getProfile } from '../../scripts/balance/study';
import { families, candidates } from '../../scripts/balance/strategy';
import { leaderIds } from '../../src/lib/game/setup';
import { standings } from '../../src/lib/game/actions';
import { replayExperiment, runExperiment } from '../../scripts/balance/experiment';
const dir=process.argv[2];
const read=(name:string)=>JSON.parse(readFileSync(`${dir}/${name}`,'utf8'));
const check=(ok:boolean,message:string)=>{if(!ok)throw new Error(message);};
const m=read('manifest.json'),p=read('profiles.json');
check(m.status==='completed'&&!m.dirty&&m.failures===0,'Completion');
check(p.policyVersion===5&&m.policyVersion===5&&p.variant===m.variant&&digest(p)===m.profilesHash,'Policy/profile provenance');
check(JSON.stringify(p.trainingSeeds)===JSON.stringify(m.trainingSeeds),'Training seeds');
check(new Set([...m.trainingSeeds,...m.evaluationSeeds]).size===m.trainingBlocks+m.blocks,'Seed separation');
check(p.training.reduce((n:number,r:any)=>n+r.games,0)===m.plannedTrainingGames&&m.trainingGames===m.plannedTrainingGames,'Training count');
for(const leader of leaderIds)for(const family of families){
 const rows=p.training.filter((r:any)=>r.key===`2/${leader}/${family}`).sort((a:any,b:any)=>b.share-a.share||a.candidate-b.candidate);
 if(family!=='treasure')check(rows.length===3&&new Set(rows.map((r:any)=>r.candidate)).size===3&&rows.every((r:any)=>r.games===m.trainingBlocks*30),'Candidate budgets');
 check(JSON.stringify(getProfile(p,2,leader,family).parameters)===JSON.stringify(candidates[family==='treasure'?0:rows[0].candidate]),'Frozen selection');
}
const games:MatrixGame[]=Array.from({length:m.workers},(_,w)=>gunzipSync(readFileSync(`${dir}/games-${w}.jsonl.gz`)).toString().trim().split('\n').filter(Boolean).map(s=>JSON.parse(s))).flat();
check(games.length===m.plannedEvaluationGames&&games.length===m.evaluationGames,'Evaluation count');
const byKey=new Map<string,MatrixGame>();
for(const row of games){
 const r=row.result,key=`${r.block}/${row.a}/${row.b}/${row.familyA}/${row.familyB}/${row.seat}`;
 check(!byKey.has(key),'Duplicate game');byKey.set(key,row);
 check(r.seed===m.evaluationSeeds[r.block]&&r.status==='completed'&&r.count===2&&!r.restriction&&(r.variant??'standard')===m.variant,'Game metadata');
 check(r.focal===row.seat&&r.lineup[row.seat]===row.a&&r.lineup[1-row.seat]===row.b,'Seat balance');
 for(const player of r.players){const f=player.leader===row.a?row.familyA:row.familyB;check(JSON.stringify(r.profiles[player.position])===JSON.stringify(getProfile(p,2,player.leader,f)),'Game profile');}
 const top=Math.max(...r.players.map(p=>p.score)),turns=Math.min(...r.players.filter(p=>p.score===top).map(p=>p.turns));
 const winners=r.players.filter(p=>p.score===top&&p.turns===turns);
 for(const player of r.players)check(player.share===(winners.includes(player)?1/winners.length:0),'Victory share');
}
for(let block=0;block<m.blocks;block++)for(const cell of matrixSchedule(block,m.evaluationSeeds[block],p,m.variant))check(byKey.has(`${block}/${cell.a}/${cell.b}/${cell.familyA}/${cell.familyB}/${cell.seat}`),'Complete schedule');
const report=matrixReport(games,m.blocks);
check(report.markdown===readFileSync(`${dir}/report.md`,'utf8'),'Report regeneration');
for(const key of ['estimates','cells','league'] as const)check(JSON.stringify(report[key])===JSON.stringify(read(`${key}.json`)),`${key} regeneration`);
let replays=0;
for(const file of readdirSync(`${dir}/replays`)){
 const trace=JSON.parse(gunzipSync(readFileSync(`${dir}/replays/${file}`)).toString());
 const [a,b,fa,fb,seat]=file.replace('.json.gz','').split('-');
 const expected=byKey.get(`${trace.result.block}/${a}/${b}/${fa}/${fb}/${seat}`);
 check(trace.result.block===0&&!!expected&&JSON.stringify(trace.result)===JSON.stringify(expected.result),'Replay matches archived row');
 const game=replayExperiment(trace.events,trace.options);
 check(JSON.stringify(standings(game).map(r=>[r.uid,r.score,r.turns]))===JSON.stringify(trace.result.players.map((r:any)=>[r.uid,r.score,r.turns])),'Replay');
 check(JSON.stringify(runExperiment(trace.options).result)===JSON.stringify(trace.result),'Deterministic first-block rerun');
 replays++;
}
check(replays===300,'Replay coverage');
console.log(`${m.trainingGames} training games, ${games.length} evaluation games, all profiles/cells/seats, reports and ${replays} exact replays/reruns verified`);
