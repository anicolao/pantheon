import {run} from '../standard-matrix/runner';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {strictEqual} from 'node:assert';
const dir=import.meta.dir+'/../standard-matrix/full';
for(const opponent of ['nereon','melia','doreios']){
 const file=readdirSync(dir).find(f=>f===`thaleia-${opponent}-engine-money-0.jsonl`)!;
 const row=JSON.parse(readFileSync(dir+'/'+file,'utf8').split('\n')[0]);
 const {trace}=run(row.seed,[{name:'engine',openingBook:null},{name:'money'}],['thaleia',opponent]);
 strictEqual(createHash('sha256').update(JSON.stringify(trace)).digest('hex'),row.replaySHA256);
 const custom=run(row.seed,[{name:'engine',openingBook:{'5/1':['merchant-fleet',null],'4/2':['harvest-feast','seed-keeper'],'3/3':['drachma','seed-keeper']}},{name:'money'}],['thaleia',opponent]);
 strictEqual(createHash('sha256').update(JSON.stringify(custom.trace)).digest('hex'),row.replaySHA256);
}
console.log('Three baseline games and three equivalent custom-book games match archived command-replay hashes exactly');
