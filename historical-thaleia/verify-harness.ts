import {runExperiment} from './source/scripts/balance/experiment';
import profiles from './profiles.json';
import {readFileSync,readdirSync} from 'node:fs';
import {deepStrictEqual} from 'node:assert';
let n=0;
for(const file of readdirSync(import.meta.dir+'/bridge-original').filter(x=>x.endsWith('.jsonl'))){
 for(const line of readFileSync(import.meta.dir+'/bridge-original/'+file,'utf8').trim().split('\n')){
  const expected=JSON.parse(line);
  const actual=runExperiment({seed:'leader-matrix-v1:'+expected.seed,block:0,lineup:expected.lineup,focal:0,profiles:expected.lineup.map((id:string)=>(profiles as any)['2/'+id+'/engine'])}).result;
  if(actual.status!=='completed')throw Error(actual.status);
  deepStrictEqual(actual.players.sort((a,b)=>a.position-b.position).map(p=>[p.score,p.turns,p.share]),expected.players.map((p:any)=>[p.score,p.turns,p.share]));
  n++;
 }
}
if(n!==300)throw Error('Expected 300 games, got '+n);
console.log('All 300 original-rule bridge outcomes match the untouched historical runner exactly.');
