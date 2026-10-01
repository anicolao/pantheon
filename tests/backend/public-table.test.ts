import {tablePurchases} from '../../src/lib/components/play/table-purchases';
import {expect,test} from 'bun:test';
import {replaySetup,type SetupEvent,type SetupState} from '../../src/lib/game/setup';
import {activePlayer,applyPlayCommand,type ActionCommand} from '../../src/lib/game/actions';
import {latestMoveIndex,publicCommandContext,describePublicCommand,publicPile,publicDeckCount,PublicMotionCursor,PublicReadingCursor,type PublicActivity} from '../../src/lib/game/public-table';

function openingEvents(){
  const events:SetupEvent[]=[
    {schemaVersion:1,sequence:1,actorUid:'a',name:'Ariadne',playerCount:2,type:'game/created'},
    {schemaVersion:1,sequence:2,actorUid:'b',name:'Theseus',playerCount:2,type:'player/joined'},
    {schemaVersion:1,reducerVersion:1,commandId:'start',sequence:3,actorUid:'a',name:'Ariadne',playerCount:2,type:'draft/started',seed:'public-table'}
  ];
  let game=replaySetup(events);
  for(const uid of game.draftOrder)events.push({schemaVersion:1,reducerVersion:1,commandId:uid,sequence:events.length+1,actorUid:uid,name:uid==='a'?'Ariadne':'Theseus',playerCount:2,type:'leader/chosen',leaderId:uid==='a'?'thaleia':'nereon'});
  return events;
}
function table(){const game=replaySetup(openingEvents());game.turn.index=game.turnOrder.indexOf('a');return game;}
function command(game:SetupState,command:ActionCommand){
  const uid=activePlayer(game),sequence=game.activity.length+1,before=publicCommandContext(game,uid);
  const event:SetupEvent={schemaVersion:1,reducerVersion:1,commandId:`step-${sequence}`,sequence,actorUid:uid,name:game.players.find(p=>p.uid===uid)!.name,playerCount:game.playerCount,...command};
  game.activity.push({sequence,message:applyPlayCommand(game,uid,command,sequence)});
  const snapshot=structuredClone(game),entry=describePublicCommand(before,game,event);expect(game).toEqual(snapshot);return entry;
}
function hand(game:SetupState,ids:string[]){game.decks.a.hand=ids.map((cardId,i)=>({id:`held-${i}`,cardId,copy:1}));}

test('public draws expose only backs while public play and leader effects keep their order',()=>{
  const game=table();hand(game,['oracles-acolyte']);
  game.decks.a.deck=[{id:'private-card-identity',cardId:'talent',copy:7}];
  const entry=command(game,{type:'action/played',instanceId:'held-0'});
  expect(entry.steps.map(step=>step.kind)).toEqual(['play','draw','leader']);
  expect(entry.actor.name).toBe('Ariadne');expect(entry.steps[0].card?.cardId).toBe('oracles-acolyte');
  expect(entry.steps[1]).toMatchObject({backs:true,from:{zone:'deck',uid:'a'},to:{zone:'hand',uid:'a'}});
  expect(JSON.stringify(entry)).not.toContain('private-card-identity');expect(JSON.stringify(entry)).not.toContain('talent');
  expect(entry.change).toEqual({actions:1,coins:0,buys:0,worship:0});
});

test('a public reveal retains the revealed face and its actual discard or topdeck destination',()=>{
  for(const cardId of ['hamlet','obol']){
    const game=table();hand(game,['victorious-procession']);game.decks.a.deck=[{id:'revealed',cardId,copy:1}];
    const entry=command(game,{type:'action/played',instanceId:'held-0'}),reveal=entry.steps.find(step=>step.kind==='reveal')!,destination=entry.steps.at(-1)!;
    expect(reveal.card?.cardId).toBe(cardId);expect(reveal.backs).toBe(false);
    expect(destination.from.zone).toBe('reveal');expect(destination.to.zone).toBe(cardId==='hamlet'?'discard':'deck');
    expect(entry.change?.coins).toBe(cardId==='hamlet'?4:2);
  }
});

test('purchases and Worship distinguish their source, payment and gain destination',()=>{
  const game=table();game.turn.phase='buys';game.resources.coins=8;
  const purchase=command(game,{type:'card/bought',cardId:'polis'});
  expect(purchase.command).toBe('card/bought');expect(purchase.steps[0].from).toEqual({zone:'supply',cardId:'polis'});expect(purchase.steps[0].to).toEqual({zone:'discard',uid:'a'});expect(purchase.change?.coins).toBe(-5);expect(purchase.change?.buys).toBe(-1);
  const worship=command(game,{type:'god/worshipped',cardId:'counsel-of-olympus'});
  expect(worship.steps[0].from).toEqual({zone:'altar',cardId:'counsel-of-olympus'});expect(worship.change?.worship).toBe(-1);expect(worship.change?.buys).toBe(0);
  const gain=command(game,{type:'choice/resolved',choiceId:game.turn.choice!.id,targets:['oracles-acolyte']});
  expect(gain.steps[0].from).toEqual({zone:'supply',cardId:'oracles-acolyte'});expect(gain.steps[0].to).toEqual({zone:'deck',uid:'a'});
});

test('cleanup precedes shuffle and private draws; next-player reset is never presented as a reward',()=>{
  const game=table();game.turn.phase='treasures';game.decks.a.deck=[];game.decks.a.play=[game.decks.a.hand.pop()!];
  const entry=command(game,{type:'turn/ended'});
  expect(entry.steps.slice(0,3).map(step=>step.kind)).toEqual(['cleanup','cleanup','shuffle']);
  expect(entry.steps.filter(step=>step.kind==='draw')).toHaveLength(5);
  expect(entry.steps.every(step=>step.backs&&!step.card)).toBe(true);expect(entry.change).toBeNull();expect(entry.resources.uid).toBe('b');
  expect(entry.steps.every(step=>step.effect==='Cleanup')).toBe(true);
});

test('trash and discard choices name their public card and distinct destinations',()=>{
  for(const [action,kind] of [['seed-keeper','trash'],['harvest-feast','discard']] as const){
    const game=table();hand(game,[action,'hamlet']);
    command(game,{type:'action/played',instanceId:'held-0'});
    const entry=command(game,{type:'choice/resolved',choiceId:game.turn.choice!.id,targets:['held-1']});
    expect(entry.steps[0]).toMatchObject({kind,from:{zone:'hand',uid:'a'},to:kind==='trash'?{zone:'trash'}:{zone:'discard',uid:'a'},card:{cardId:'hamlet'},backs:false});
  }
});

test('pile snapshots survive incoming changes and hidden decks remain count-only',()=>{
  const game=table();game.decks.a.discard=[...game.decks.a.hand];
  const snapshot=publicPile(game,'a','discard'),first={...snapshot[0]};
  game.decks.a.discard.reverse();game.decks.a.discard[0].copy=99;game.decks.a.discard=[];
  expect(snapshot[0]).toEqual(first);expect(snapshot).toHaveLength(5);expect(publicPile(game,'a','discard')).toEqual([]);
  expect(publicDeckCount(game,'a')).toBe(5);expect(()=>publicPile(game,'a','deck' as 'discard')).toThrow();expect(()=>publicDeckCount(game,'unknown')).toThrow();
});

test('live animation delivery is ordered, once-only, and never replays a reconnect backlog',()=>{
  const game=table(),entry=command(game,{type:'phase/advanced'});
  const at=(sequence:number):PublicActivity=>({...entry,sequence});
  const cursor=new PublicMotionCursor(5);
  expect(cursor.take([at(7),at(6),at(6)],true).map(e=>e.sequence)).toEqual([6,7]);
  expect(cursor.take([at(6),at(7)],true)).toEqual([]);
  expect(cursor.take([at(8)],false)).toEqual([]);expect(cursor.take([at(8),at(9)],true)).toEqual([]);
  expect(cursor.take([at(10)],true,false)).toEqual([]);expect(cursor.take([at(10),at(11)],true).map(e=>e.sequence)).toEqual([11]);
  const reader=new PublicReadingCursor(7);expect(reader.unseen([at(6),at(7),at(8),at(9)])).toBe(2);expect(reader.through).toBe(7);reader.acknowledge(9);reader.acknowledge(8);expect(reader.through).toBe(9);
});

test('committed replay retains public history in order without private draws or mutable references', () => {
  const events = openingEvents();
  expect(replaySetup(events).publicActivity).toEqual([]);
  const append = (command: ActionCommand) => {
    const game = replaySetup(events);
    const actor = game.players.find(player => player.uid === activePlayer(game))!;
    events.push({ schemaVersion: 1, reducerVersion: 1, sequence: events.length + 1,
      commandId: `public-${events.length + 1}`, actorUid: actor.uid, name: actor.name,
      playerCount: game.playerCount, ...command });
  };
  append({ type: 'phase/advanced' });
  append({ type: 'treasures/played' });
  append({ type: 'card/bought', cardId: 'obol' });
  append({ type: 'turn/ended' });
  const game = replaySetup(events);
  expect(replaySetup([...events].reverse())).toEqual(game);
  expect(game.publicActivity.map(entry => entry.sequence)).toEqual([6, 7, 8, 9]);
  expect(game.publicActivity.map(entry => entry.command)).toEqual([
    'phase/advanced', 'treasures/played', 'card/bought', 'turn/ended'
  ]);
  const purchase = game.publicActivity[2];
  expect(purchase.change?.buys).toBe(-1);
  const cleanup = game.publicActivity[3];
  expect(cleanup.resources.uid).toBe(activePlayer(game));
  expect(cleanup.change).toBeNull();
  expect(cleanup.steps.filter(step => step.kind === 'draw')).toHaveLength(5);
  expect(cleanup.steps.every(step => step.backs && !step.card)).toBe(true);
  const snapshot = structuredClone(game.publicActivity);
  game.players[0].name = 'Changed';
  game.resources.coins = 99;
  for (const move of game.movements) if (move.card) move.card.copy = 99;
  expect(game.publicActivity).toEqual(snapshot);
});


test('automatic phase bookkeeping preserves the last card result without removing history',()=>{
  const game=table();hand(game,['victorious-procession']);
  game.publicActivity.push(command(game,{type:'action/played',instanceId:'held-0'}));
  const played=game.activity.length-1;
  game.publicActivity.push(command(game,{type:'phase/advanced'}));
  expect(latestMoveIndex(game)).toBe(played);
  expect(game.publicActivity.at(-1)?.command).toBe('phase/advanced');
  game.publicActivity.push(command(game,{type:'card/bought',cardId:'obol'}));
  expect(latestMoveIndex(game)).toBe(game.activity.length-1);
});

test('purchases stage in order until cleanup without entering the engine play zone',()=>{
  const game=table();game.resources.coins=2;game.resources.buys=2;
  game.publicActivity.push(command(game,{type:'card/bought',cardId:'oracles-acolyte'}));
  game.publicActivity.push(command(game,{type:'card/bought',cardId:'obol'}));
  const before=structuredClone(game),purchases=tablePurchases(game,'a');
  expect(purchases.map(card=>card.cardId)).toEqual(['oracles-acolyte','obol']);
  expect(game.decks.a.play).toEqual([]);
  expect(game.decks.a.discard).toEqual(purchases);
  expect(game).toEqual(before);
  game.publicActivity.push(command(game,{type:'turn/ended'}));
  expect(tablePurchases(game,'a')).toEqual([]);
  expect(game.decks.a.discard).toEqual(expect.arrayContaining(purchases));
});
