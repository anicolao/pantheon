import {standings} from '../src/lib/game/actions';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {runExperiment,replayExperiment,type ExperimentOptions} from './balance/experiment';
import {candidates,type Family,type Profile} from './balance/strategy';
const task=JSON.parse(readFileSync(process.argv[2],'utf8'));const rows=[];
const profiles:Record<string,Profile>=task.profiles??Object.fromEntries((['treasure','engine'] as Family[]).map(family=>[family,{family,parameters:candidates[0]}]));
const keys=Object.keys(profiles),cells:[string,string][]=task.cells??keys.flatMap(a=>keys.map(b=>[a,b])),seed=task.seed??'base-game-v1:evaluation';
for(const block of task.blocks){
 for(const [first,second] of cells){
  const options:ExperimentOptions={seed:`${seed}:${block}`,block,lineup:['thaleia','nereon'],profiles:[profiles[first],profiles[second]],focal:0,variant:'base-game'};
  const {result,events}=runExperiment(options);
  if(result.status!=='completed')throw new Error(JSON.stringify(result));
  if(result.players.some(p=>p.telemetry.leaderTriggers||Object.keys(p.telemetry.worship).length))throw new Error('Forbidden leader/Worship effect');
  if(result.players.some(p=>options.profiles[p.position].thinning===false&&Object.keys(p.telemetry.trashes).length))throw new Error('Disabled thinning used');
  rows.push({first,second,result});
  if(task.progress)console.log(`Worker ${task.worker}: game ${rows.length}/${task.blocks.length*cells.length} ${first} vs ${second}`);
  if(block<(task.replayBlocks??10)){
   const replay=replayExperiment(events,options);if(replay.turn.phase!=='finished')throw new Error('Replay failed');
   const ranks=standings(replay),winners=ranks.filter(r=>r.winner).length;
   for(const p of result.players){
    const row=ranks.find(r=>r.uid===p.uid)!;
    if(row.score!==p.score||row.turns!==p.turns||(row.winner?1/winners:0)!==p.share)throw new Error('Replay standings differ');
    const deck=Object.values(replay.decks[p.uid]).flat();
    if(deck.length!==p.telemetry.finalDeckSize)throw new Error('Replay deck size');
   }
   writeFileSync(`${task.out}/replays/${block}-${first}-${second}.json.gz`,gzipSync(JSON.stringify({options,result,events})));
  }
 }
 if(rows.length%(cells.length*2)===0)console.log(`Worker ${task.worker}: ${rows.length}/${task.blocks.length*cells.length}`);
}
writeFileSync(`${task.out}/games-${task.worker}.jsonl.gz`,gzipSync(rows.map(r=>JSON.stringify(r)).join('\n')+'\n'));
console.log(`Worker ${task.worker} completed ${rows.length} games`);
