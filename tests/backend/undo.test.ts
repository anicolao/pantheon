import { expect, test } from 'bun:test';
import { UndoHistory, canUndo } from '../../src/lib/game/undo';
import { activePlayer, type ActionCommand } from '../../src/lib/game/actions';
import { replaySetup, type SetupEvent, type SetupState } from '../../src/lib/game/setup';
import { publicCommandContext, describePublicCommand } from '../../src/lib/game/public-table';
import { tablePurchases } from '../../src/lib/components/play/table-purchases';

function opening(): SetupEvent[] {
  const events: SetupEvent[] = [
    {schemaVersion:1,sequence:1,actorUid:'a',name:'Ariadne',playerCount:2,type:'game/created'},
    {schemaVersion:1,sequence:2,actorUid:'b',name:'Theseus',playerCount:2,type:'player/joined'},
    {schemaVersion:1,sequence:3,actorUid:'a',name:'Ariadne',playerCount:2,type:'draft/started',seed:'undo',reducerVersion:1,commandId:'start'}
  ];
  replaySetup(events).draftOrder.forEach((uid,index)=>events.push({schemaVersion:1,sequence:events.length+1,actorUid:uid,name:uid==='a'?'Ariadne':'Theseus',playerCount:2,type:'leader/chosen',leaderId:index?'nereon':'thaleia',reducerVersion:1,commandId:`leader-${uid}`}));
  return events;
}
const cards=(ids:string[],prefix:string)=>ids.map((cardId,index)=>({id:`${prefix}-${index}`,cardId,copy:index+1}));
function table(hand=['obol','hamlet'],deck=['obol','hamlet'],leader='nereon') {
  const game=replaySetup(opening());game.turn.index=game.turnOrder.indexOf('a');game.leaders.a=leader;
  game.decks.a={hand:cards(hand,'h'),deck:cards(deck,'d'),discard:[],play:[]};
  const history=new UndoHistory();
  const run=(command:ActionCommand,uid='a')=>{
    const sequence=game.activity.length+1;
    const event:SetupEvent={schemaVersion:1,reducerVersion:1,commandId:`command-${sequence}`,sequence,actorUid:uid,name:uid==='a'?'Ariadne':'Theseus',playerCount:2,...command};
    const before=publicCommandContext(game,uid);
    const message=history.apply(game,uid,command,sequence);
    game.activity.push({sequence,message});game.publicActivity.push(describePublicCommand(before,game,event));
  };
  return {game,run,undo:()=>run({type:'action/undone',targetSequence:game.undo?.sequence??-1})};
}
const position=(game:SetupState)=>structuredClone({turn:game.turn,decks:game.decks,supply:game.supply,trash:game.trash,resources:game.resources});

test('market browsing preserves the gameplay Undo target and restored gain view',()=>{
  const {game,run,undo}=table(['sacred-grove']);
  const before=position(game);
  run({type:'action/played',instanceId:'h-0'});
  const choiceId=game.turn.choice!.id, target=game.undo!.sequence;
  run({type:'choice/browsed',choiceId,cardId:'drachma'});
  expect(game.undo!.sequence).toBe(target);
  run({type:'choice/resolved',choiceId,targets:['drachma']});
  undo();expect(game.turn.choice?.browsedCardId).toBe('drachma');
  expect(game.undo!.sequence).toBe(target);
  undo();expect(position(game)).toEqual(before);
});

test('undo restores card order, phase and resources; repeated undo stops at the beginning of the turn',()=>{
  const {game,run,undo}=table(['obol','drachma','hamlet']);
  const initial=position(game);
  run({type:'treasure/played',instanceId:'h-0'});const one=position(game);
  run({type:'treasures/played'});expect(game.resources.coins).toBe(3);
  undo();expect(position(game)).toEqual(one);
  undo();expect(position(game)).toEqual(initial);expect(canUndo(game,'a')).toBe(false);
  expect(()=>undo()).toThrow('no longer');
});

test('buy, undo, and repurchase restore supply and Buys without duplicate staged purchases',()=>{
  const {game,run,undo}=table();game.resources.coins=8;game.resources.buys=2;
  const initial=position(game);
  run({type:'card/bought',cardId:'hamlet'});const first=game.undo!.sequence;
  expect(tablePurchases(game,'a')).toHaveLength(1);
  undo();expect(position(game)).toEqual(initial);expect(tablePurchases(game,'a')).toHaveLength(0);
  expect(game.publicActivity.at(-1)?.undoneSequence).toBe(first);
  run({type:'card/bought',cardId:'hamlet'});expect(tablePurchases(game,'a')).toHaveLength(1);
  run({type:'card/bought',cardId:'obol'});expect(tablePurchases(game,'a')).toHaveLength(2);
  undo();undo();expect(position(game)).toEqual(initial);
});

test('automatic Treasure progression is included in undoing the preceding Action',()=>{
  const {game,run,undo}=table(['bronze-recruit','obol']);const initial=position(game);
  run({type:'action/played',instanceId:'h-0'});const target=game.undo!.sequence;
  run({type:'phase/advanced',automatic:true});expect(game.turn.phase).toBe('treasures');expect(game.undo!.sequence).toBe(target);
  undo();expect(position(game)).toEqual(initial);
  expect(()=>run({type:'phase/advanced',automatic:true})).toThrow('playable');
});

test('initial automatic progression is not an undoable player action',()=>{
  const {game,run}=table();run({type:'phase/advanced',automatic:true});expect(game.undo).toBeNull();
});

test('drawing clears earlier checkpoints, including shuffles and a previously known top card',()=>{
  for(const shuffle of [false,true]){
    const {game,run,undo}=table(['temple-of-athena','oracles-acolyte'],shuffle?[]:['obol']);
    if(shuffle)game.decks.a.discard=cards(['hamlet'],'discard');
    run({type:'action/played',instanceId:'h-0'});const old=game.undo!.sequence;
    run({type:'action/played',instanceId:'h-1'});
    expect(game.movements.some(move=>move.kind==='draw')).toBe(true);expect(game.undo).toBeNull();
    expect(()=>run({type:'action/undone',targetSequence:old})).toThrow('no longer');
    if(!shuffle){run({type:'treasure/played',instanceId:'d-0'});undo();expect(game.undo).toBeNull();}
  }
});

test('revealing a card blocks undo even when the deck returns to the identical order',()=>{
  const {game,run}=table(['victorious-procession'],['obol']);const deck=structuredClone(game.decks.a.deck);
  run({type:'action/played',instanceId:'h-0'});expect(game.decks.a.deck).toEqual(deck);
  expect(game.movements.some(move=>move.kind==='reveal')).toBe(true);expect(game.undo).toBeNull();
});

test('an empty draw or reveal that exposes no information remains undoable',()=>{
  for(const card of ['oracles-acolyte','victorious-procession']){
    const {game,run,undo}=table([card],[]);const initial=position(game);
    run({type:'action/played',instanceId:'h-0'});expect(canUndo(game,'a')).toBe(true);undo();expect(position(game)).toEqual(initial);
  }
});

test('pending leader choices can be undone, but a leader-triggered draw seals their history',()=>{
  const {game,run,undo}=table(['seed-keeper','hamlet'],['obol'],'melia');const initial=position(game);
  run({type:'action/played',instanceId:'h-0'});expect(game.turn.choice).not.toBeNull();expect(game.turn.leaderUsed).toBe(true);
  undo();expect(position(game)).toEqual(initial);
  run({type:'action/played',instanceId:'h-0'});run({type:'choice/resolved',choiceId:game.turn.choice!.id,targets:[]});
  expect(game.decks.a.hand.some(card=>card.id==='d-0')).toBe(true);expect(game.undo).toBeNull();
});

test('a safe choice after a draw can be undone without undoing the information-revealing Action',()=>{
  const {game,run,undo}=table(['harvest-feast'],['obol','hamlet']);
  run({type:'action/played',instanceId:'h-0'});const pending=position(game);expect(game.undo).toBeNull();
  run({type:'choice/resolved',choiceId:game.turn.choice!.id,targets:['d-1']});undo();
  expect(position(game)).toEqual(pending);expect(game.undo).toBeNull();
});

test('worship and chained trash/gain choices restore payment, pending choices, and exact zones',()=>{
  const {game,run,undo}=table(['hamlet','obol']);game.sharedEvents=['trial-of-the-spear'];game.resources.coins=5;
  const initial=position(game);run({type:'god/worshipped',cardId:'trial-of-the-spear'});const paid=position(game);
  run({type:'choice/resolved',choiceId:game.turn.choice!.id,targets:['h-0']});const trashed=position(game);
  run({type:'choice/resolved',choiceId:game.turn.choice!.id,targets:['obol']});
  undo();expect(position(game)).toEqual(trashed);undo();expect(position(game)).toEqual(paid);undo();expect(position(game)).toEqual(initial);
});

test('known supply topdeck gains are reversible; drawing that card is not',()=>{
  const {game,run,undo}=table(['oracles-acolyte']);game.sharedEvents=['counsel-of-olympus'];game.resources.coins=3;
  run({type:'god/worshipped',cardId:'counsel-of-olympus'});const pending=position(game);
  run({type:'choice/resolved',choiceId:game.turn.choice!.id,targets:['oracles-acolyte']});undo();expect(position(game)).toEqual(pending);
  run({type:'choice/resolved',choiceId:game.turn.choice!.id,targets:['oracles-acolyte']});
  run({type:'action/played',instanceId:'h-0'});expect(game.undo).toBeNull();
});

test('stale targets, other players, and the turn boundary cannot undo state',()=>{
  const {game,run,undo}=table(['obol','drachma']);run({type:'treasure/played',instanceId:'h-0'});const old=game.undo!.sequence;
  run({type:'treasure/played',instanceId:'h-1'});const before=structuredClone(game);
  expect(()=>run({type:'action/undone',targetSequence:old})).toThrow();expect(game).toEqual(before);
  expect(()=>run({type:'action/undone',targetSequence:game.undo!.sequence},'b')).toThrow();expect(game).toEqual(before);
  run({type:'turn/ended'});expect(game.undo).toBeNull();expect(()=>undo()).toThrow();
});

test('recorded undo replays identically after refresh without deleting or rewriting events',()=>{
  const events=opening();let game=replaySetup(events);const uid=activePlayer(game),name=game.players.find(player=>player.uid===uid)!.name;
  const append=(command:ActionCommand)=>{events.push({schemaVersion:1,reducerVersion:1,commandId:`event-${events.length+1}`,sequence:events.length+1,actorUid:uid,name,playerCount:2,...command});game=replaySetup(events);};
  const initial=position(game);append({type:'treasures/played'});const targetSequence=game.undo!.sequence;
  append({type:'action/undone',targetSequence});expect(position(game)).toEqual(initial);
  expect(replaySetup([...events].reverse())).toEqual(game);expect(game.activity).toHaveLength(events.length);
  expect(game.activity.at(-1)?.message).toContain('undid playing all Treasures');
  expect(()=>append({type:'action/undone',targetSequence})).toThrow('no longer');
});
