/** Diagnostic only: native Money as Doreios against frozen four-player actors. */
import {readFileSync,writeFileSync} from 'node:fs';
import {FourEnvironment} from './four_environment';
import {decide} from '../../src/lib/bots/policy';
import {actionIndex} from '../../src/lib/bots/rl-schema';
const root=process.argv[2],c=JSON.parse(readFileSync(`${root}/config.json`,'utf8'));
if(process.argv[3]==='worker'){
 const index=Number(process.argv[4]),env=new FourEnvironment('doreios',c.opponent.slice(5));
 let state=env.reset(`${c.prefix}:screen:${index}`,true);
 while(!state.done){const v=env.tracker.view(env.game);state=env.step(actionIndex(v,decide(v,env.tracker.memories[env.uid],'money')));}
 console.log(JSON.stringify(state.info));
}else{
 const rows:any[]=[];let next=0;
 await Promise.all(Array.from({length:8},async()=>{
  while(next<c.screenGames){
   const index=next++,child=Bun.spawn([process.execPath,import.meta.path,root,'worker',String(index)],{stdout:'pipe',stderr:'inherit'});
   const output=await new Response(child.stdout).text();if(await child.exited!==0)throw Error(`Money game ${index} failed`);
   rows[index]=JSON.parse(output);
  }
 }));
 writeFileSync(`${root}/money-screen.json`,JSON.stringify(rows)+'\n');
 console.log(JSON.stringify({games:rows.length,share:rows.reduce((n,r)=>n+r.share,0)/rows.length,meanVP:rows.reduce((n,r)=>n+r.score,0)/rows.length}));
}
