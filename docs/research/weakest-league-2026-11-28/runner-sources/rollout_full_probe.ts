import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {ExpansionEnvironment} from '../../scripts/rl/expansion/environment';
import {commands,observation,schemaSignature} from '../../scripts/rl/expansion/schema';
import {activePlayer,applyPlayCommand,standings} from '../../src/lib/game/actions';
import {shuffle} from '../../src/lib/game/random';
import {createActor} from '../../src/lib/bots/rl-runtime';
if(!isMainThread){
 const env=new ExpansionEnvironment('achilles',workerData.field),critic=createActor(JSON.parse(readFileSync(workerData.critic,'utf8')),schemaSignature);
 parentPort!.on('message',({variant,index})=>{
  let s=env.reset('weakest-rollout-probe-v1:'+index),lastTurn=-1,searched=0,changed=0;
  while(!s.done){
   const g=env.game,options=commands(g),logits=env.actors.achilles.logits(observation(g));let action=env.actors.achilles.action(observation(g),options.map(Boolean));
   const types=['card/bought','god/worshipped','turn/ended'];
   if(variant&&lastTurn!==g.turn.number&&types.includes(options[action]!.type)){
    lastTurn=g.turn.number;const candidates=[...new Set([action,...options.map((c,i)=>({c,i})).filter(x=>x.c&&types.includes(x.c.type)).sort((a,b)=>logits[b.i]-logits[a.i]).slice(0,4).map(x=>x.i)])];
    if(candidates.length>1){
     searched++;const scores=candidates.map(candidate=>{
      let total=0;
      for(let world=0;world<4;world++){
       const clone=structuredClone(g),uid=env.uid,seed=`belief:${index}:${g.turn.number}:${world}`;clone.seed=seed;
       for(const [id,z] of Object.entries(clone.decks)){
        if(id===uid)z.deck=shuffle(z.deck,seed+':own');
        else{const n=z.hand.length,unseen=shuffle([...z.hand,...z.deck],seed+':'+id);z.hand=unseen.slice(0,n);z.deck=unseen.slice(n);}
       }
       let seq=env.events.length+1;applyPlayCommand(clone,uid,options[candidate]!,seq++);
       let starts=0,previous=uid,steps=0;
       while(clone.turn.phase!=='finished'){
        const acting=activePlayer(clone);previous=acting;
        if(++steps>5000)throw Error('Rollout guard exceeded; no game excluded');
        const legal=commands(clone),chosen=env.actors[clone.leaders[acting]].action(observation(clone),legal.map(Boolean));applyPlayCommand(clone,acting,legal[chosen]!,seq++);
       }
       if(clone.turn.phase==='finished'){
        const rows=standings(clone),me=rows.find(r=>r.uid===uid)!,share=me.winner?1/rows.filter(r=>r.winner).length:0;
        total+=2*share-1+.5*Math.max(-1,Math.min(1,(me.score-Math.max(...rows.filter(r=>r.uid!==uid).map(r=>r.score)))/30));
       }else{if(activePlayer(clone)!==uid)throw Error('Wrong critic perspective');total+=Math.max(-1.5,Math.min(1.5,critic.logits(observation(clone))[0]));}
      }
      return total/4;
     });
     const best=scores.reduce((a,x,i)=>x>scores[a]?i:a,0);if(candidates[best]!==action)changed++;action=candidates[best];
    }
   }
   s=env.step(action);
  }
  parentPort!.postMessage({variant,index,info:s.info,searched,changed,replay:gzipSync(JSON.stringify({info:s.info,events:env.events}))});
 });
}else{
 const out='balance-diagnostics/weakest-eight-house-20261128/rollout-full-probe';let next=0,done=0;const games=112,rows=[[],[]] as any[][];const counts=[{searched:0,changed:0},{searched:0,changed:0}];
 await Promise.all(Array.from({length:8},()=>new Promise<void>((resolve,reject)=>{
  const w=new Worker(import.meta.filename,{workerData:{field:out+'/field.json',critic:out+'/critic.json'}});
  const send=()=>{if(next===games*2){void w.terminate();resolve();return;}const job=next++;w.postMessage({variant:Math.floor(job/games),index:job%games});};
  w.on('error',reject);w.on('message',({variant,index,info,searched,changed,replay})=>{rows[variant].push(info);counts[variant].searched+=searched;counts[variant].changed+=changed;const dir=out+'/'+variant;mkdirSync(dir,{recursive:true});writeFileSync(dir+'/'+index+'.json.gz',replay);if(++done%28===0)console.log(JSON.stringify({done,total:games*2}));send();});send();
 })));
 rows.forEach((rs,i)=>writeFileSync(out+'/'+i+'/results.json',JSON.stringify(rs)));const result=rows.map((rs,i)=>({variant:i,games:rs.length,share:rs.reduce((s,r)=>s+r.share,0)/rs.length,...counts[i]}));writeFileSync(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
