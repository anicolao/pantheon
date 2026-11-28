import {createInterface} from 'node:readline';
import {LeagueEnvironment} from './league_environment';
import {deployQueueFeatures} from './deploy_schema';
import {commands} from './schema';
const env=new LeagueEnvironment(process.argv[2],process.argv[4],process.argv[6]);
let territoryDeploys=0,territoryDeployDraws=0;
let treasureDeploys=0,treasureDeployResolutions=0,treasureDeployBonusCoins=0;
for await(const line of createInterface({input:process.stdin})){
 try{const q=JSON.parse(line);let answer;
  if(q.op==='reset'){territoryDeploys=0;territoryDeployDraws=0;treasureDeploys=0;treasureDeployResolutions=0;treasureDeployBonusCoins=0;answer=env.reset(q.seed,q.training===true);}
  else if(q.op==='step'){
   const movementStart=env.game.movements.length;let territory=false;
   if(process.argv.includes('--deploy-queue')){
    const command=commands(env.game)[q.action],grants=env.game.turn.deploy??[];
    if(command?.type==='territory/deployed'){territoryDeploys++;territory=true;}
    const count=command?.type==='treasure/played'?Math.min(1,grants.length):command?.type==='treasures/played'?Math.min(grants.length,env.game.decks[env.uid].hand.filter(c=>['obol','drachma','talent'].includes(c.cardId)).length):0;
    treasureDeploys+=count;treasureDeployResolutions+=grants.slice(0,count).reduce((sum,n)=>sum+n,0);
    const cards=env.game.decks[env.uid].hand.filter(c=>command?.type==='treasure/played'?c.id===command.instanceId:['obol','drachma','talent'].includes(c.cardId));
    treasureDeployBonusCoins+=cards.slice(0,count).reduce((sum,c,i)=>sum+(grants[i]-1)*({obol:1,drachma:2,talent:3}[c.cardId]??0),0);
   }
   answer=env.step(q.action);
   if(territory)territoryDeployDraws+=env.game.movements.slice(movementStart).filter(m=>m.uid===env.uid&&m.kind==='draw').length;
  }
  else if(q.op==='teacher'||q.op==='teacher-preview')answer=env.teacher();
  else if(q.op==='verify')answer=env.verify();
  else throw Error('Unknown operation');
  if(process.argv.includes('--deploy-queue') && answer && typeof answer==='object' && 'observation' in answer)
   answer={...answer,observation:[...answer.observation,...deployQueueFeatures(env.game.turn.deploy??[])]};
  if(process.argv.includes('--deploy-queue') && answer && typeof answer==='object' && 'done' in answer && answer.done){
   const own=env.events.filter(event=>event.actorUid===env.uid);
   answer={...answer,info:{...answer.info,territoryDeploys,territoryDeployDraws,treasureDeploys,treasureDeployResolutions,treasureDeployBonusCoins,
    nikeMarketActions:own.filter(event=>event.type==='action/played'&&['rallying-cry','myrmidon-vanguard','phalanx-advance'].some(id=>event.instanceId?.startsWith('supply-'+id+'-'))).length,
    nikeWorships:own.filter(event=>event.type==='god/worshipped'&&event.cardId==='march-of-victory').length}};
  }
  console.log(JSON.stringify(answer));
 }catch(e){console.error(e);process.exit(1);}
}
