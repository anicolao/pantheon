import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {runExperiment,replayExperiment,type ExperimentOptions} from './balance/experiment';
import {candidates,type Family} from './balance/strategy';
const task=JSON.parse(readFileSync(process.argv[2],'utf8'));const rows=[];
for(const block of task.blocks){
 for(const first of ['treasure','engine'] as Family[])for(const second of ['treasure','engine'] as Family[]){
  const options:ExperimentOptions={seed:`base-game-v1:evaluation:${block}`,block,lineup:['thaleia','nereon'],profiles:[first,second].map(family=>({family,parameters:candidates[0]})),focal:0,variant:'base-game'};
  const {result,events}=runExperiment(options);
  if(result.status!=='completed')throw new Error(JSON.stringify(result));
  if(result.players.some(p=>p.telemetry.leaderTriggers||Object.keys(p.telemetry.worship).length))throw new Error('Forbidden leader/Worship effect');
  rows.push({first,second,result});
  if(block<10){
   const replay=replayExperiment(events,options);if(replay.turn.phase!=='finished')throw new Error('Replay failed');
   for(const p of result.players){
    const deck=Object.values(replay.decks[p.uid]).flat();
    if(deck.length!==p.telemetry.finalDeckSize)throw new Error('Replay deck size');
   }
   writeFileSync(`${task.out}/replays/${block}-${first}-${second}.json.gz`,gzipSync(JSON.stringify({options,result,events})));
  }
 }
 if(rows.length%100===0)console.log(`Worker ${task.worker}: ${rows.length}/${task.blocks.length*4}`);
}
writeFileSync(`${task.out}/games-${task.worker}.jsonl.gz`,gzipSync(rows.map(r=>JSON.stringify(r)).join('\n')+'\n'));
console.log(`Worker ${task.worker} completed ${rows.length} games`);
