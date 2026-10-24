import {expect,test} from 'bun:test';
import {botLeaderPreference,resolveBotKind,type BotKind} from '../../src/lib/game/bot-kind';
import {PracticeSession} from '../../src/lib/bots/session';
import {decide} from '../../src/lib/bots/policy';
import {activePlayer} from '../../src/lib/game/actions';

for(const [leader,policy] of Object.entries({melia:'mm',thaleia:'classic-engine',nereon:'money',doreios:'classic-engine'}) as [typeof botLeaderPreference[number],Exclude<BotKind,'bot'>][]) {
 test(`Bot as ${leader} matches ${policy} throughout a game, including opening and reload`,()=>{
  expect(resolveBotKind('bot',leader)).toBe(policy);
  const config={seed:'adaptive-'+leader,humanLeader:leader==='melia'?'thaleia':'melia',botLeader:leader,humanFirst:false};
  let adaptive=new PracticeSession({...config,bot:'bot'}),explicit=new PracticeSession({...config,bot:policy});
  let steps=0;
  while(adaptive.game.turn.phase!=='finished'){
   expect(++steps).toBeLessThan(2500);
   const uid=activePlayer(adaptive.game);
   const a=decide(adaptive.tracker.view(adaptive.game),adaptive.tracker.memories[uid],uid==='bot'?'bot':'money');
   const b=decide(explicit.tracker.view(explicit.game),explicit.tracker.memories[uid],uid==='bot'?policy:'money');
   expect(a).toEqual(b);
   adaptive.apply(a);explicit.apply(b);
   if(steps===40){adaptive=PracticeSession.restore(adaptive.save());explicit=PracticeSession.restore(explicit.save());}
  }
  expect(adaptive.game.turn).toEqual(explicit.game.turn);
 },120000);
}
