import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {allLeaderIds,replaySetup} from '../../src/lib/game/setup';
import {activePlayer} from '../../src/lib/game/actions';
import {expansionTable} from '../../src/lib/bots/expansion-session';
import {expansionCommand,expansionPolicy} from '../../src/lib/bots/expansion';
import {TableBotDriver} from '../../src/lib/bots/table';
import {append,restoreTable,seatUid,begin} from '../../src/lib/tabletop/table';
import provenance from '../../src/lib/bots/models/expansion/provenance.json';
test('shipped actors match their recorded audited checkpoint hashes',()=>{
 for(const id of allLeaderIds){
  const data=readFileSync(`src/lib/bots/models/expansion/${id}.json`);
  expect(createHash('sha256').update(data).digest('hex')).toBe(provenance.field.actors[id].sha256);
  expect(expansionPolicy(id).checkpointSHA256).toBe(JSON.parse(data.toString()).checkpointSHA256);
 }
});
test('web setup preserves chosen leaders, both starting orders, and reload',()=>{
 for(const first of [true,false]){
  const table=expansionTable(['echo','perseus','theseus','achilles'],first,'playable-seats');const g=replaySetup(table.events);
  expect(g.leaders[seatUid('south')]).toBe('echo');expect(g.leaders[seatUid('west')]).toBe('perseus');
  expect(g.turnOrder[0]).toBe(seatUid(first?'south':'west'));expect(g.players.filter(p=>p.botKind==='expansion-rl')).toHaveLength(3);
  expect(restoreTable(JSON.stringify(table))).toEqual(table);
  expect(begin({...table,events:[],randomize:true},'random-draft').events.at(-1)?.type).toBe('draft/started');
 }
});
test('each shipped leader completes a game through the production bot driver, including multi-player play',()=>{
 for(let i=0;i<allLeaderIds.length;i++){
  const n=i>=6?i-3:2,ids=Array.from({length:n},(_,j)=>allLeaderIds[(i+j)%8]);
  let table=expansionTable(ids,false,`playable-${i}`),g=replaySetup(table.events),steps=0;
  const driver=new TableBotDriver();
  while(g.turn.phase!=='finished'){
   if(++steps>3000)throw Error('Game did not finish');
   const uid=activePlayer(g),bot=g.players.find(p=>p.uid===uid)?.botKind;
   const command=expansionCommand(g);
   if(bot){const proposal=driver.next(table.events,g.players[0].uid);expect(proposal?.command).toEqual(command);expect(proposal?.revision).toBe(table.events.length);}
   table=append(table,uid,command);g=replaySetup(table.events);
  }
  expect(replaySetup(restoreTable(JSON.stringify(table)).events)).toEqual(g);
 }
},120000);
