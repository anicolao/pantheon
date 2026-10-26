import {readFileSync} from 'node:fs';
import {FourEnvironment} from './four_environment';
import {commands,actionIndex} from '../../src/lib/bots/rl-schema';
import {openingOverride} from './opening_policy';
const root=process.argv[2],c=JSON.parse(readFileSync(root+'/config.json','utf8'));
for(const rule of [null,{card:'bronze-recruit',through:2,harbor:false,playAres:false,thin:null}]){
 const env=new FourEnvironment('doreios',c.opponentManifest),trace=[];let s=env.reset(c.prefix+':probe:0',true);
 while(!s.done){
  const v=env.tracker.view(env.game),base=commands(v)[env.runtime()]!,chosen=rule?openingOverride(v,base,rule):base;
  if(['card/bought','action/played','god/worshipped','choice/resolved'].includes(chosen.type))trace.push({turn:v.myTurns,coins:v.resources.coins,hand:v.hand.map(c=>c.cardId),source:v.choice?.source,command:chosen.type==='choice/resolved'?{...chosen,targets:chosen.targets.map(id=>v.hand.find(c=>c.id===id)?.cardId??id)}:chosen.type==='action/played'?{type:chosen.type,card:v.hand.find(c=>c.id===chosen.instanceId)?.cardId}:chosen});
  s=env.step(actionIndex(v,chosen));
 }
 console.log(JSON.stringify({rule,trace,result:s.info,owned:env.tracker.inventory[env.uid]}));
}
