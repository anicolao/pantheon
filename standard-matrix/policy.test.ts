import {test,expect} from 'bun:test';
import {setupExperiment} from '../balance-checkpoint/equal-turns/source/scripts/balance/experiment';
import {strategyView,type View} from '../balance-checkpoint/equal-turns/source/scripts/balance/strategy';
import {applyPlayCommand,activePlayer,definition,leaderEffects} from '../balance-checkpoint/equal-turns/source/src/lib/game/actions';
import {base,command,continuation,stateFromView,specialChoice,type StandardView} from './policy';
import {evaluateDiscards} from './discard';
import {selectedConfig} from '../balance-checkpoint/accepted-engine/selected-policy';
function fixture(leader='thaleia',favored=false):StandardView{
 const other=leader==='nereon'?'thaleia':'nereon';
 const {game}=setupExperiment('worship-fixture',[leader,other],'standard'),uid=activePlayer(game);
 const god=definition(leader).god.toLowerCase(),temple='temple-of-'+god;
 const inst=(id:string,i:number)=>({id:id+'-'+i,cardId:id,copy:i});
 game.decks[uid]={hand:['hamlet','hamlet','seed-keeper','drachma'].map(inst),play:Array(favored?2:1).fill(temple).map(inst),deck:['obol','talent','sacred-academy'].map(inst),discard:[]};
 game.turn.phase='buys';game.turn.equalTurns=true;
 game.resources={actions:0,coins:8,buys:1,worship:1};
 game.sharedEvents=['counsel-of-olympus','tribute-of-the-tides','blessing-of-the-fields','trial-of-the-spear'];
 const inventory=Object.fromEntries(game.players.map(({uid})=>[uid,Object.values(game.decks[uid]).flat().reduce((a,c)=>(a[c.cardId]=(a[c.cardId]??0)+1,a),{} as Record<string,number>)]));
 return {...strategyView(game,uid,inventory,undefined,'standard'),effectQueue:[]};
}
test('all event standard/favored branches and both policies finish legal reducer continuations',()=>{
 for(const leader of ['thaleia','nereon','melia','doreios'])for(const favored of [false,true])for(const name of ['money','engine'] as const){
  const v=fixture(leader,favored);
  for(const id of v.events)expect(Number.isFinite(continuation(v,{turn:5},name,{type:'god/worshipped',cardId:id}))).toBe(true);
 }
},60000);
test('both policies consider cross-god events without access to hidden order',()=>{
 const v=fixture('nereon');v.events=['counsel-of-olympus'];
 for(const name of ['money','engine'] as const){
  const first=command(v,{turn:5},name);
  const reordered={...v,owned:Object.fromEntries(Object.entries(v.owned).reverse())};
  expect(command(reordered,{turn:5},name)).toEqual(first);
  expect(Number.isFinite(continuation(v,{turn:5},name,{type:'god/worshipped',cardId:'counsel-of-olympus'}))).toBe(true);
 }
});
test('observed opening budgets do not assume a six-coin total',()=>{
 const m={turn:1};const v=fixture('nereon');
 v.hand=[];v.resources.coins=4;
 expect(base(v,m,'engine')).toEqual({type:'card/bought',cardId:'harvest-feast'});
 m.turn=2;v.resources.coins=3;
 expect(base(v,m,'engine')).toEqual({type:'card/bought',cardId:'drachma'});
 expect(base(v,m,'engine')).toEqual({type:'turn/ended'});
});
test('unaffordable or banned events are never selected',()=>{
 const v=fixture();v.resources.coins=0;v.bannedEvents=[...v.events];
 for(const name of ['money','engine'] as const)expect(command(v,{turn:5},name).type).not.toBe('god/worshipped');
});
test('Feast continuation retains Doreios pending trigger and standard variant',()=>{
 const v=fixture('doreios');v.phase='actions';v.resources.actions=1;
 v.choice={id:'test',kind:'discard',source:'harvest-feast',min:1,max:1};
 v.effectQueue=leaderEffects('doreios','standard');v.leaderUsed=true;
 const rows=evaluateDiscards(v,{turn:5},selectedConfig,(next,m)=>base(next,m,'engine'));
 expect(rows.length).toBe(3);
 expect(rows.some(r=>r.details.some(d=>d.commands.some((c:any)=>c.type==='choice/resolved'&&c.choiceId!=='test')))).toBe(true);
});
