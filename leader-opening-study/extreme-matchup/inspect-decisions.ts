import {readFileSync} from 'node:fs';
import {BotTracker} from '../../src/lib/bots/session';
import {activePlayer,applyPlayCommand,definition} from '../../src/lib/game/actions';
import {cardValue} from '../../historical-thaleia/source/scripts/balance/strategy';
import {publicHorizon} from '../../historical-thaleia/source/scripts/balance/planning';
import profiles from '../../historical-thaleia/profiles.json';
const t=JSON.parse(readFileSync(import.meta.dir+'/../matrix/doreios-melia-classic-engine-money-0.jsonl.replay.json','utf8'));
const g=structuredClone(t.initial),tracker=new BotTracker(g),profile=profiles['2/doreios/engine'];
for(const [i,{uid,command}] of t.commands.entries()){
 const v=tracker.view(g),seat=g.turnOrder.indexOf(uid),m=tracker.memories[uid];
 if(seat===0&&(command.type==='card/bought'||command.type==='god/worshipped')&&g.resources.coins>=5)
  console.log(JSON.stringify({turn:m.turn,coins:g.resources.coins,command,horizon:publicHorizon(v),values:Object.fromEntries(['acropolis','polis','talent','sacred-academy','merchant-fleet','victorious-procession'].map(id=>[id,cardValue(v as any,profile as any,id)]))}));
 const start=g.movements.length;const message=applyPlayCommand(g,uid,command,i+1);g.activity.push({sequence:i+1,message});tracker.observe(g,uid,start,command);
}
