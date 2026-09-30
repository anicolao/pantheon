import {readFileSync,readdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deepStrictEqual} from 'node:assert';
import {runExperiment,replayExperiment} from './source/scripts/balance/experiment';
import {standings} from './source/src/lib/game/actions';
const dir=import.meta.dir+'/../balance-results/all-leaders-v4/replays';
let n=0;
for(const file of readdirSync(dir).filter(x=>/^thaleia-.*-engine-engine-[01]\.json.gz$/.test(x))){
 const t=JSON.parse(gunzipSync(readFileSync(dir+'/'+file)).toString());
 const actual=runExperiment(t.options);
 deepStrictEqual(actual.result,t.result);deepStrictEqual(actual.events,t.events);
 deepStrictEqual(standings(replayExperiment(t.events,t.options)).map(r=>[r.uid,r.score,r.turns]),t.result.players.map((r:any)=>[r.uid,r.score,r.turns]));
 n++;
}
if(n!==6)throw Error('Expected six historical replays');
console.log('Six historical Engine/Engine games exactly reproduced, full results and command traces, both seats.');
