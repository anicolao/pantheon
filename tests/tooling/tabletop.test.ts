import { describe, expect, test } from 'bun:test';
import { freshTable, occupy, begin, append, advanceEmptyActions, restoreTable, edges, seatUid, actor, type Edge } from '../../src/lib/tabletop/table';
import { leaderIds, replaySetup } from '../../src/lib/game/setup';
import { createPrng } from '../../src/lib/game/random';
import { TableBotDriver } from '../../src/lib/bots/table';

function seated(order: Edge[]) { let table=freshTable(); for(const edge of order)table=occupy(table,edge,'human'); return table; }
const orders: Edge[][] = [['south','north'],['east','west'],['north','south','east'],['west','east','north','south'],['south','north','west','east']];
describe('shared tabletop uses legal game events for both seating modes',()=>{
  for(const order of orders) for(let sample=0;sample<8;sample++) {
    test(`preset ${order.join('/')} seed ${sample}`,()=>{
      const table=begin(seated(order),`tabletop-${sample}`),game=replaySetup(table.events);
      expect(game.phase).toBe('playing');
      expect(game.turnOrder).toEqual([...order].reverse().map(seatUid));
      expect(game.draftOrder).toEqual(order.map(seatUid));
      for(const seat of table.seats.filter(seat=>seat.mode!=='empty')) {
        expect(game.leaders[seatUid(seat.edge)]).toBe(seat.leader);
        expect(game.decks[seatUid(seat.edge)].hand).toHaveLength(5);
      }
      expect(restoreTable(JSON.stringify(table))).toEqual(table);
    });
    test(`random ${order.join('/')} seed ${sample}`,()=>{
      const prepared={...seated(order),randomize:true};
      let table=begin(prepared,`tabletop-${sample}`),game=replaySetup(table.events);
      expect(game.phase).toBe('draft');expect(game.leaders).toEqual({});
      const occupied=edges.filter(edge=>order.includes(edge)).map(seatUid);
      const first=Math.floor(createPrng(`tabletop-${sample}:first-player`)()*occupied.length);
      expect(game.turnOrder).toEqual([...occupied.slice(first),...occupied.slice(0,first)]);
      expect(game.draftOrder).toEqual([...game.turnOrder].reverse());
      for(const [i,uid] of game.draftOrder.entries())table=append(table,uid,{type:'leader/chosen',leaderId:leaderIds[i]});
      expect(replaySetup(table.events).phase).toBe('playing');
    });
  }
});
test('leaving and rejoining changes priority; switching a joined seat to a bot does not',()=>{
  let table=seated(['south','west','north']);
  table=occupy(occupy(table,'west','empty'),'west','human');
  expect(replaySetup(begin(table,'priority').events).turnOrder[0]).toBe(seatUid('west'));
  const rank=table.seats[1].joined;table=occupy(table,'west','bot');expect(table.seats[1].joined).toBe(rank);
});
test('bots preserve preset human leaders and use the normal engine policy',()=>{
  let table=seated(['south','north']);table=occupy(table,'west','bot');table=occupy(table,'east','bot');
  table=advanceEmptyActions(begin(table,'bots-at-table'));
  const game=replaySetup(table.events);
  expect(game.leaders[seatUid('south')]).toBe('thaleia');expect(game.leaders[seatUid('north')]).toBe('melia');
  expect(new Set(Object.values(game.leaders)).size).toBe(4);
  const driver=new TableBotDriver();let moves=0;
  while(replaySetup(table.events).players.find(player=>player.uid===actor(replaySetup(table.events)))?.botKind && moves<30){
    const proposal=driver.next(table.events,game.players[0].uid)!;expect(proposal).not.toBeNull();
    table=advanceEmptyActions(append(table,proposal.actorUid,proposal.command));moves++;
  }
  expect(moves).toBeGreaterThan(1);expect(moves).toBeLessThan(30);
});
test('an all-bot randomized table drafts with ordinary bot proposals',()=>{
  let table=freshTable();for(const edge of edges)table=occupy(table,edge,'bot');
  table=begin({...table,randomize:true},'all-bots');const driver=new TableBotDriver();
  for(let i=0;i<4;i++){const proposal=driver.next(table.events,table.events[0].actorUid)!;expect(proposal.command.type).toBe('leader/chosen');table=append(table,proposal.actorUid,proposal.command);}
  expect(replaySetup(table.events).phase).toBe('playing');
});
test('rejects invalid seat counts, stale choices, and corrupt saved seating',()=>{
  expect(()=>begin(freshTable(),'empty')).toThrow();
  const table=begin(seated(['south','north']),'valid');
  expect(()=>occupy(table,'east','human')).toThrow();
  expect(()=>append(table,seatUid('south'),{type:'treasures/played'})).toThrow();
  const saved=JSON.parse(JSON.stringify(table));saved.seats[1].edge='south';
  expect(()=>restoreTable(JSON.stringify(saved))).toThrow();
});
