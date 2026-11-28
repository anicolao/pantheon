import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {ExpansionEnvironment} from '../../scripts/rl/expansion/environment';
import {commands,observation,inventory} from '../../scripts/rl/expansion/schema';
import {activePlayer,actionEffects} from '../../src/lib/game/actions';
const variants=[{name:'baseline',phalanx:0,draw:0,until:0,play:false},{name:'play-only',phalanx:0,draw:0,until:0,play:true},...[1,2,3].flatMap(phalanx=>[false,true].map(play=>({name:'factorial-'+phalanx+'-'+play,phalanx,draw:phalanx===3?2:1,until:6,play})))];
if(!isMainThread){
 const env=new ExpansionEnvironment('achilles',workerData.field);
 parentPort!.on('message',({variant,index})=>{
  const v=variants[variant];let s=env.reset('weakest-achilles-limited-engine:'+index);
  while(!s.done){
   const g=env.game,options=commands(g);let action=env.actors.achilles.action(observation(g),options.map(Boolean));
   const chosen=options[action]!;
   if(variant && !g.turn.choice && ['card/bought','turn/ended'].includes(chosen.type) && (g.turn.turns[activePlayer(g)]??0)<v.until && g.supply.acropolis>3 && g.supply['council-of-sages']>0){
    const owned=inventory(g,activePlayer(g)),count=(id:string)=>owned.filter(c=>c.cardId===id).length;
    const cash=owned.reduce((n,c)=>n+({obol:1,drachma:2,talent:3}[c.cardId]??0),0);
    const priorities=['acropolis',...(cash<9?['talent']:[]),...(count('phalanx-advance')<v.phalanx?['phalanx-advance']:[]),...(count('council-of-sages')<v.draw?['council-of-sages']:[])];
    for(const id of priorities){const i=options.findIndex(c=>c?.type==='card/bought'&&c.cardId===id);if(i>=0){action=i;break;}}
   }
   if(variant && v.play && chosen.type==='action/played'){
    const priorities=options.map((c,i)=>{if(c?.type!=='action/played')return {i,value:-Infinity};const card=g.decks[activePlayer(g)].hand.find(x=>x.id===c.instanceId)!;let value=actionEffects(card.cardId).reduce((n,e)=>n+(e.kind==='draw'?e.amount*10:e.kind==='resource'&&e.resource==='actions'?e.amount*8:e.kind==='resource'&&e.resource==='coins'?e.amount*3:0),0);if(card.cardId==='phalanx-advance')value=100;if(card.cardId==='temple-of-nike')value=g.turn.deploy?0:110;return {i,value};});
    action=priorities.reduce((a,b)=>b.value>a.value?b:a).i;
   }
   s=env.step(action);
  }
  parentPort!.postMessage({variant,index,info:s.info,replay:gzipSync(JSON.stringify({info:s.info,events:env.events}))});
 });
}else{
 const field=process.argv[2],out=process.argv[3];mkdirSync(out,{recursive:true});
 const rows=variants.map(()=>[] as any[]);let next=0,doneCount=0;const games=448,total=games*variants.length;
 await Promise.all(Array.from({length:8},()=>new Promise<void>((resolve,reject)=>{
  const w=new Worker(import.meta.filename,{workerData:{field}});
  const send=()=>{if(next===total){void w.terminate();resolve();return;}const job=next++;w.postMessage({variant:Math.floor(job/games),index:job%games});};
  w.on('error',reject);w.on('message',({variant,index,info,replay})=>{
   rows[variant].push(info);const dir=out+'/'+variants[variant].name;mkdirSync(dir,{recursive:true});writeFileSync(dir+'/'+index+'.json.gz',replay);
   if(++doneCount%448===0)console.log(JSON.stringify({done:doneCount,total}));send();
  });send();
 })));
 const results=variants.map((v,i)=>({...v,games:rows[i].length,share:rows[i].reduce((n,r)=>n+r.share,0)/rows[i].length}));
 writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}
