import {RLEnvironment,commands} from './environment';
const rows=await Bun.file(process.argv[2]).json();
const report=[];
for(const row of rows){
 const env=new RLEnvironment();env.reset(row.info.seed,row.info.first);
 const buys:Record<string,number>={},trashes:Record<string,number>={},worships:Record<string,number>={},gains:Record<string,number>={};
 const add=(map:Record<string,number>,id:string)=>map[id]=(map[id]??0)+1;
 let state:any;
 for(const a of row.actions){
  const v=env.session.tracker.view(env.session.game),c=commands(v)[a]!;
  if(c.type==='card/bought')add(buys,c.cardId);
  if(c.type==='god/worshipped')add(worships,c.cardId);
  if(c.type==='choice/resolved'&&v.choice?.kind==='trash')for(const id of c.targets)add(trashes,v.hand.find(x=>x.id===id)!.cardId);
  if(c.type==='choice/resolved'&&v.choice?.kind==='gain')for(const id of c.targets)add(gains,id);
  state=env.step(a);
 }
 if(!state.done||state.reward!==row.reward||state.info.score!==row.info.score)throw Error('Audit replay mismatch');
 report.push({info:row.info,reward:row.reward,buys,gains,worships,trashes,owned:env.session.tracker.inventory.bot});
}
await Bun.write(process.argv[3],JSON.stringify(report,null,2));
