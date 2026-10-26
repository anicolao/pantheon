/** Descriptive audit of potentially wasteful sequencing in the frozen policy. */
import {writeFileSync} from 'node:fs';
import {FourEnvironment} from './four_environment';
import {commands} from '../../src/lib/bots/rl-schema';
import {actionEffects,definition} from '../../src/lib/game/actions';
const [manifest,out,count='400']=process.argv.slice(2),env=new FourEnvironment('doreios',manifest),counts:Record<string,number>={},examples:unknown[]=[];let decisions=0;
const plus=(id:string)=>definition(id).type==='Action'?actionEffects(id).reduce((n,e)=>n+(e.kind==='resource'&&e.resource==='actions'?e.amount:0),0):0;
for(let i=0;i<Number(count);i++){
 let state=env.reset(`doreios-order-diagnostic:${i}`,true);
 while(!state.done){
  const v=env.tracker.view(env.game),index=env.runtime(),command=commands(v)[index]!;decisions++;
  if(!v.choice&&v.phase==='actions'&&v.resources.actions>0){
   const cantrips=v.hand.filter(c=>plus(c.cardId)>0),temple=cantrips.find(c=>c.cardId==='temple-of-ares');
   const played=command.type==='action/played'?v.hand.find(c=>c.id===command.instanceId)!.cardId:null;
   const tags=[];
   if(cantrips.length&&played&&plus(played)===0&&v.resources.actions===1)tags.push('last-action-terminal-before-cantrip');
   if(temple&&played&&plus(played)===0&&v.resources.actions===1)tags.push('last-action-terminal-before-ares-temple');
   if(cantrips.length&&['treasure/played','treasures/played','phase/advanced','turn/ended','card/bought'].includes(command.type))tags.push('leaving-actions-with-cantrip');
   if(temple&&['treasure/played','treasures/played','phase/advanced','turn/ended','card/bought'].includes(command.type))tags.push('leaving-actions-with-ares-temple');
   for(const tag of tags)counts[tag]=(counts[tag]??0)+1;
   if(tags.length&&examples.length<30)examples.push({game:i,turn:v.myTurns,tags,command,played,hand:v.hand.map(c=>c.cardId),resources:v.resources,leaderUsed:v.leaderUsed});
  }
  state=env.step(index);
 }
 if(!state.info.replayVerified)throw Error('Replay missing');
}
const result={games:Number(count),decisions,counts,examples,note:'Descriptive counts only; these are potential inefficiencies, not proof that overriding them improves wins.'};writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({games:result.games,decisions,counts}));
