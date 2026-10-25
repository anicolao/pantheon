import {createInterface} from 'node:readline';
import {RLEnvironment} from './environment';
const env=new RLEnvironment();
for await(const line of createInterface({input:process.stdin})){
 try{
  const q=JSON.parse(line);let answer:unknown;
  if(q.op==='reset')answer=env.reset(q.seed,q.first);
  else if(q.op==='step')answer=env.step(q.action);
  else if(q.op==='teacher')answer=env.teacher();
  else if(q.op==='verify'){
   const {PracticeSession}=await import('../../src/lib/bots/session');
   const replay=PracticeSession.restore(env.session.save());
   if(JSON.stringify(replay.game)!==JSON.stringify(env.session.game))throw Error('Replay mismatch');
   answer=true;
  }else throw Error('Unknown operation');
  console.log(JSON.stringify(answer));
 }catch(e){console.error(e);process.exit(1);}
}
