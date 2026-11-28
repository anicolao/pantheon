import {createInterface} from 'node:readline';
import {ExpansionEnvironment} from './environment';
import {deployQueueFeatures} from './deploy_schema';
const env=new ExpansionEnvironment(process.argv[2],process.argv[4]);
for await(const line of createInterface({input:process.stdin})){
 try{const q=JSON.parse(line);let answer;
  if(q.op==='reset')answer=env.reset(q.seed,q.training===true);
  else if(q.op==='step')answer=env.step(q.action);
  else if(q.op==='teacher'||q.op==='teacher-preview')answer=env.teacher();
  else if(q.op==='verify')answer=env.verify();
  else throw Error('Unknown operation');
  if(process.argv.includes('--deploy-queue') && answer && typeof answer==='object' && 'observation' in answer)
   answer={...answer,observation:[...answer.observation,...deployQueueFeatures(env.game.turn.deploy??[])]};
  if(process.argv.includes('--deploy-queue') && answer && typeof answer==='object' && 'done' in answer && answer.done){
   const own=env.events.filter(event=>event.actorUid===env.uid);
   answer={...answer,info:{...answer.info,
    nikeMarketActions:own.filter(event=>event.type==='action/played'&&['rallying-cry','myrmidon-vanguard','phalanx-advance'].some(id=>event.instanceId?.startsWith('supply-'+id+'-'))).length,
    nikeWorships:own.filter(event=>event.type==='god/worshipped'&&event.cardId==='march-of-victory').length}};
  }
  console.log(JSON.stringify(answer));
 }catch(e){console.error(e);process.exit(1);}
}
