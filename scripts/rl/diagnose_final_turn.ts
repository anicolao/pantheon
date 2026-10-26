/** Read-only audit: identify final-turn decisions that may leave points unused. */
import {writeFileSync} from 'node:fs';
import {FourEnvironment} from './four_environment';
import {commands} from '../../src/lib/bots/rl-schema';
import {definition} from '../../src/lib/game/actions';
const [manifest,out,count='256']=process.argv.slice(2);
const env=new FourEnvironment('doreios',manifest),counts:Record<string,number>={},examples:unknown[]=[];
let decisions=0;
for(let i=0;i<Number(count);i++){
 let state=env.reset(`doreios-final-turn-diagnostic:${i}`,true);
 while(!state.done){
  const v=env.tracker.view(env.game),index=env.runtime(),legal=commands(v),command=legal[index]!;
  decisions++;
  if(v.finalRound){
   const pointBuys=legal.filter(c=>c?.type==='card/bought'&&(definition(c.cardId).vp??0)>0);
   const tags=[];
   if(command.type==='card/bought'&&(definition(command.cardId).vp??0)===0&&pointBuys.length)tags.push('nonpoint-buy-with-points-available');
   if(command.type==='turn/ended'&&pointBuys.length)tags.push('end-with-points-available');
   if(v.choice?.kind==='gain'&&command.type==='choice/resolved'){
    const pointGains=legal.filter(c=>c?.type==='choice/resolved'&&c.targets.some(id=>(definition(id).vp??0)>0));
    if(command.targets.every(id=>(definition(id).vp??0)===0)&&pointGains.length)tags.push('nonpoint-gain-with-points-available');
   }
   for(const tag of tags)counts[tag]=(counts[tag]??0)+1;
   if(tags.length&&examples.length<40)examples.push({game:i,turn:v.myTurns,tags,command,phase:v.phase,choice:v.choice,resources:v.resources,hand:v.hand.map(c=>c.cardId),pointBuys});
  }
  state=env.step(index);
 }
 if(!state.info.replayVerified)throw Error('Replay missing');
}
const result={games:Number(count),decisions,counts,examples,note:'Read-only potential inefficiencies; worship, later draws, multiple buys and denial can justify these choices. No improvement claim.'};
writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({games:result.games,decisions,counts}));
