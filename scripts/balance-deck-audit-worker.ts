import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {auditDeck,type DeckInput} from './balance/deck-audit';
const [out,worker]=process.argv.slice(2);
const inputs:DeckInput[]=JSON.parse(gunzipSync(readFileSync(`${out}/input-${worker}.json.gz`)).toString());
const results=[];
for(const [i,input] of inputs.entries()){
 results.push(auditDeck(input));
 if((i+1)%1000===0)console.log(`Audit worker ${worker}: ${i+1}/${inputs.length} decks`);
}
writeFileSync(`${out}/decks-${worker}.jsonl.gz`,gzipSync(results.map(r=>JSON.stringify(r)).join('\n')+'\n'));
console.log(`Audit worker ${worker}: complete (${inputs.length*100} hands)`);
