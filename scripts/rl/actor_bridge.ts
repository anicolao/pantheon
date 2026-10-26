/** Research-only access to the production inference implementation for frozen actors. */
import {readFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {createResearchActor} from './research_actor';

const actor=createResearchActor(JSON.parse(readFileSync(process.argv[2], 'utf8')));
if(actor.leader!==process.argv[3])throw Error('Actor leader mismatch');
for await(const line of createInterface({input:process.stdin})){
 const input=JSON.parse(line);
 console.log(JSON.stringify(actor.action(input.observation,input.mask)));
}
