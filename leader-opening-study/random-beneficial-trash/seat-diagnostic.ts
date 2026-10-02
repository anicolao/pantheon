import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {applyPlayCommand,standings} from '../../src/lib/game/actions';
const rows=[];
for(const name of readdirSync(import.meta.dir+'/games').filter(n=>n.endsWith('.replay.json'))){
 const {initial:g,commands}=JSON.parse(readFileSync(import.meta.dir+'/games/'+name,'utf8'));
 let before:any=null;
 for(const [i,{uid,command}] of commands.entries()){
  if(g.turn.finalRound&&!before)before=standings(g);
  const message=applyPlayCommand(g,uid,command,i+1,'standard');g.activity.push({sequence:i+1,message});
 }
 const final=standings(g),p2=g.turnOrder[1];
 const score=(ps:any[],uid:string)=>ps.find(p=>p.uid===uid).score;
 rows.push({lineup:g.turnOrder.map((uid:string)=>g.leaders[uid]),triggerSeat:g.turnOrder.indexOf(g.turn.endTriggeredBy)+1,
 end:g.supply.acropolis===0?'acropolis':'three-piles',
 finalResponseScore:before?score(final,p2)-score(before,p2):null,
 responseChangedOutcome:before?Math.sign(score(final,p2)-score(final,g.turnOrder[0]))!==Math.sign(score(before,p2)-score(before,g.turnOrder[0])):false});
}
writeFileSync(import.meta.dir+'/seat-diagnostic.json',JSON.stringify(rows));
for(const opp of ['thaleia','melia','doreios'])for(const seat of [0,1]){
 const rs=rows.filter(r=>r.lineup[seat]==='nereon'&&r.lineup[1-seat]===opp);
 console.log({opp,seat:seat+1,threePileEnds:rs.filter(r=>r.end==='three-piles').length,p1Triggered:rs.filter(r=>r.triggerSeat===1).length,responseChangedOutcome:rs.filter(r=>r.responseChangedOutcome).length});
}
