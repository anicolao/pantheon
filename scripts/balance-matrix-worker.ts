import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { leaderIds } from '../src/lib/game/setup';
import { families, candidates } from './balance/strategy';
import { runExperiment } from './balance/experiment';
import { matrixSchedule, type MatrixGame } from './balance/matrix';
const task = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const write = (path: string, data: unknown) => writeFileSync(resolve(task.out,path),JSON.stringify(data,null,2)+'\n');
if (task.phase === 'training') {
  const scores: any[] = [];
  for (const key of task.keys) {
    const [leader,family] = key.split('/');
    for (const [candidate,parameters] of candidates.entries()) {
      let sum=0, games=0;
      for (const [block,seed] of task.seeds.entries()) for (const rival of leaderIds.filter(l=>l!==leader)) for (const seat of [0,1]) for (const opponent of families) {
        const lineup = seat===0 ? [leader,rival] : [rival,leader];
        const profiles = lineup.map(l=>({ family: l===leader?family:opponent, parameters: l===leader?parameters:candidates[0] }));
        const { result } = runExperiment({ seed,block,lineup,profiles,focal:seat,variant:task.variant });
        if (result.status!=='completed') throw new Error(JSON.stringify(result));
        sum+=result.players.find(p=>p.leader===leader)!.share!; games++;
      }
      scores.push({ key:`2/${key}`,candidate,share:sum/games,games });
    }
    console.log(`Training worker ${task.worker}: ${key} completed`);
    write(`training-${task.worker}.json`,scores);
  }
} else {
  const profiles=JSON.parse(readFileSync(resolve(task.out,'profiles.json'),'utf8'));
  const rows: MatrixGame[]=[];
  for (const block of task.blocks) {
    for (const scheduled of matrixSchedule(block,task.seeds[block],profiles,task.variant)) {
      const { result,events }=runExperiment(scheduled.options);
      if (result.status!=='completed') { write(`failure-${task.worker}.json`,{result,events,options:scheduled.options}); throw new Error(`Evaluation failure: ${result.status}`); }
      const { options, ...cell }=scheduled;
      rows.push({...cell,result});
      if (block===0) writeFileSync(resolve(task.out,'replays',`${cell.a}-${cell.b}-${cell.familyA}-${cell.familyB}-${cell.seat}.json.gz`),gzipSync(JSON.stringify({options,events,result})));
    }
    if ((block+1)%20===0) console.log(`Evaluation worker ${task.worker}: block ${block+1}/${task.seeds.length}`);
  }
  writeFileSync(resolve(task.out,`games-${task.worker}.jsonl.gz`),gzipSync(rows.map(r=>JSON.stringify(r)).join('\n')+'\n'));
}
