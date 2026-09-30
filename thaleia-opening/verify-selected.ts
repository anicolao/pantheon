import {run} from '../standard-matrix/runner';
import {readFileSync} from 'node:fs';
import {strictEqual} from 'node:assert';
import {createHash} from 'node:crypto';
for(const opponent of ['nereon','melia','doreios']){
 const row=JSON.parse(readFileSync(import.meta.dir+`/validation/selected-book-${opponent}-0.jsonl`,'utf8').split('\n')[0]);
 const {trace}=run(240000,[{name:'engine'},{name:'money'}],['thaleia',opponent]);
 strictEqual(createHash('sha256').update(JSON.stringify(trace)).digest('hex'),row.replaySHA256);
}
console.log('Registered Thaleia default exactly matches all three selected-book validation traces');
