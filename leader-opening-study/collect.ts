import {run} from './runner';
import {readFileSync,writeFileSync} from 'node:fs';
const j=JSON.parse(readFileSync(process.argv[2],'utf8')),samples:Record<string,number[]>={},cards:Record<string,Record<string,number>>={};
for(let i=0;i<800;i++){
 const seed=j.start+i,books=j.lineup.map((_:string,k:number)=>k===j.seat?j.book:undefined);
 const {result}=run(seed,j.lineup,j.kinds,books,{seat:j.seat,turn:j.turn});
 const entry=result.players[j.seat].opening.find((x:any)=>x.turn===j.turn);
 if(entry){const key=entry.key;(samples[key]??=[]);if(samples[key].length<10)samples[key].push(seed);const map=cards[key]??={};map[entry.card??'pass']=(map[entry.card??'pass']??0)+1;}
 if(i>=199&&Object.values(samples).every(xs=>xs.length>=10))break;
}
writeFileSync(j.output,JSON.stringify({samples,cards}));console.log(j.id);
