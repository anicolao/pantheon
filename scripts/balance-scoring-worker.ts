import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { runExperiment, replayExperiment, type ExperimentOptions } from './balance/experiment';
import type { MatrixGame } from './balance/matrix';
const task=JSON.parse(readFileSync(process.argv[2],'utf8'));
const rows:MatrixGame[]=JSON.parse(gunzipSync(readFileSync(task.input)).toString());
const output:MatrixGame[]=[];let checks=0,replays=0;
for(const row of rows){
 const r=row.result;
 const options:ExperimentOptions={seed:r.seed,block:r.block,lineup:r.lineup,profiles:r.profiles,focal:r.focal,variant:r.variant};
 const {result,events}=runExperiment(options);
 if(result.status!=='completed')throw new Error(JSON.stringify({options,result}));
 if(row.familyA!=='treasure'&&row.familyB!=='treasure'){
  if(JSON.stringify(result)!==JSON.stringify(r))throw new Error('Non-Treasure drift');checks++;
 }else{
  output.push({...row,result});
  if(r.block===0){
   const game=replayExperiment(events,options);
   if(game.turn.phase!=='finished')throw new Error('Replay incomplete');
   writeFileSync(`${task.out}/replays/${row.a}-${row.b}-${row.familyA}-${row.familyB}-${row.seat}.json.gz`,gzipSync(JSON.stringify({options,events,result})));replays++;
  }
 }
 if((output.length+checks)%100===0)console.log(`Worker ${task.worker}: ${output.length+checks}/${rows.length}`);
}
writeFileSync(`${task.out}/games-${task.worker}.jsonl.gz`,gzipSync(output.map(r=>JSON.stringify(r)).join('\n')+'\n'));
writeFileSync(`${task.out}/checks-${task.worker}.json`,JSON.stringify({checks,replays,games:output.length}));
