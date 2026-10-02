import {expect,test} from 'bun:test';
import {TableBotDriver} from '../../src/lib/bots/table';
import {replaySetup,leaderIds,type SetupEvent} from '../../src/lib/game/setup';
import {activePlayer} from '../../src/lib/game/actions';
import {BotTracker} from '../../src/lib/bots/session';
import {decide} from '../../src/lib/bots/policy';
import type {BotKind} from '../../src/lib/game/bot-kind';
function start(count:2|3|4,allBots:boolean){
 const kinds:BotKind[]=['engine','classic-engine','money','engine'];
 const events:SetupEvent[]=[{schemaVersion:1,sequence:1,type:'game/created',actorUid:'host',name:'Host',playerCount:count}];
 if(allBots)events.push({...events[0],sequence:2,type:'player/automated',botKind:kinds[0]});
 for(let i=1;i<count;i++)events.push({schemaVersion:1,sequence:events.length+1,type:'player/joined',actorUid:'bot-'+i,name:'Bot '+i,botKind:kinds[i],playerCount:count});
 events.push({schemaVersion:1,sequence:events.length+1,type:'draft/started',actorUid:'host',name:'Host',playerCount:count,reducerVersion:1,commandId:'draft',seed:'mixed-table-'+count});
 return events;
}
for(const count of [2,3,4] as const)for(const allBots of [false,true])test(`${count} seats ${allBots?'all bots':'mixed human/bots'} draft, play, and resume from shared events`,()=>{
 const events=start(count,allBots);let driver=new TableBotDriver(),tracker:BotTracker|undefined;
 let steps=0;
 while(true){
  const g=replaySetup(events);if(g.turn.phase==='finished')break;
  const uid=g.phase==='draft'?g.draftOrder[Object.keys(g.leaders).length]:activePlayer(g);
  const proposal=driver.next(events,'host');
  expect(new TableBotDriver().next(events,'outsider')).toBeNull();
  if(steps===30){const restored=new TableBotDriver();expect(restored.next(events,'host')).toEqual(proposal);driver=restored;}
  let command;
  if(proposal){expect(proposal.actorUid).toBe(uid);expect(proposal.revision).toBe(events.length);command=proposal.command;}
  else{
   expect(uid).toBe('host');
   if(g.phase==='draft')command={type:'leader/chosen' as const,leaderId:leaderIds.find(id=>!Object.values(g.leaders).includes(id))!};
   else{tracker??=new BotTracker(g);command=decide(tracker.view(g),tracker.memories[uid],'classic-engine');}
  }
  const startMovement=g.movements.length;
  events.push({schemaVersion:1,reducerVersion:1,sequence:events.length+1,actorUid:uid,name:g.players.find(p=>p.uid===uid)!.name,playerCount:count,commandId:'move-'+events.length,...command});
  const next=replaySetup(events);
  if(next.phase==='playing'&&!tracker)tracker=new BotTracker(next);
  if(g.phase==='playing')tracker?.observe(next,uid,startMovement,command as any);
  if(++steps>2500)throw Error('Bots did not complete the game');
 }
 expect(new Set(Object.values(replaySetup(events).leaders)).size).toBe(count);
 expect(driver.next(events,'host')).toBeNull();
},120000);

test('random draft proposals are legal, repeatable and include every leader across seeds',()=>{
 const choices=new Set<string>();
 for(let i=0;i<40;i++){
  const events=start(2,true);events.at(-1)!.seed='draft-'+i;
  const driver=new TableBotDriver(),p=driver.next(events,'host')!;
  expect(driver.next(events,'host')).toEqual(p);
  expect(p.command.type).toBe('leader/chosen');choices.add((p.command as any).leaderId);
 }
 expect(choices.size).toBe(4);
});

test('human purchase Undo and host reload preserve the next bot decision',()=>{
 const events=start(2,false),driver=new TableBotDriver();
 const append=(command:any)=>{const g=replaySetup(events),uid=g.phase==='draft'?g.draftOrder[Object.keys(g.leaders).length]:activePlayer(g);events.push({schemaVersion:1,reducerVersion:1,sequence:events.length+1,actorUid:uid,name:g.players.find(p=>p.uid===uid)!.name,playerCount:2,commandId:'undo-test-'+events.length,...command});};
 for(let i=0;i<100;i++){
  const g=replaySetup(events);
  if(g.phase==='playing'&&activePlayer(g)==='host')break;
  const p=driver.next(events,'host');
  append(p?.command??{type:'leader/chosen',leaderId:leaderIds.find(l=>!Object.values(g.leaders).includes(l))});
 }
 append({type:'treasures/played'});append({type:'card/bought',cardId:'obol'});
 const g=replaySetup(events);append({type:'action/undone',targetSequence:g.undo!.sequence});
 append({type:'turn/ended'});
 expect(driver.next(events,'host')).toEqual(new TableBotDriver().next(events,'host'));
});
