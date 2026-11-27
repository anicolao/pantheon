import {createInterface} from 'node:readline';
import {EchoEnvironment} from './environment';
const env=new EchoEnvironment(process.argv[2],process.argv[4]);
for await(const line of createInterface({input:process.stdin})){
 try{const q=JSON.parse(line);let answer;
  if(q.op==='reset')answer=env.reset(q.seed,q.first);
  else if(q.op==='step')answer=env.step(q.action);
  else if(q.op==='teacher'||q.op==='teacher-preview')answer=env.teacher();
  else if(q.op==='verify')answer=env.verify();
  else throw Error('Unknown operation');
  console.log(JSON.stringify(answer));
 }catch(e){console.error(e);process.exit(1);}
}
