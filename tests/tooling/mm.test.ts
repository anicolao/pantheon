import {test,expect} from 'bun:test';
import {PracticeSession} from '../../src/lib/bots/session';
import {decide} from '../../src/lib/bots/policy';
import {activePlayer,standings} from '../../src/lib/game/actions';
import type {StandardView} from '../../standard-matrix/policy';
function view(ids:string[],coins=0):StandardView{
 const s=new PracticeSession({seed:'mm-unit',humanLeader:'doreios',botLeader:'melia',humanFirst:false,bot:'mm'});
 return {...s.tracker.view(s.game),phase:'treasures',hand:ids.map((cardId,i)=>({cardId,id:'test-'+i,copy:i})),resources:{coins,actions:1,buys:1,worship:1}};
}
const choose=(v:StandardView)=>decide(v,{turn:1},'mm');
test('MM pays three coins, worships Demeter, and trashes two Hamlets',()=>{
 let v=view(['hamlet','hamlet'],3);
 expect(choose(v)).toEqual({type:'god/worshipped',cardId:'blessing-of-the-fields'});
 v={...v,choice:{id:'trash',kind:'trash',source:'blessing-of-the-fields',min:0,max:2}};
 expect(choose(v)).toEqual({type:'choice/resolved',choiceId:'trash',targets:['test-0','test-1']});
});
test('MM waits for the fourth coin before upgrading its Hamlet with Ares',()=>{
 const v=view(['hamlet','obol'],3);
 expect(choose(v)).toEqual({type:'treasure/played',instanceId:'test-1'});
 expect(choose({...v,hand:v.hand.slice(0,1),resources:{...v.resources,coins:4}})).toEqual({type:'god/worshipped',cardId:'trial-of-the-spear'});
 expect(choose({...v,choice:{id:'gain',kind:'gain',source:'trial-of-the-spear',min:1,max:1,limit:3}})).toEqual({type:'choice/resolved',choiceId:'gain',targets:['drachma']});
});
test('MM adapts to an absent Ares instead of issuing unavailable worship',()=>{
 const v=view(['hamlet'],4);v.events=v.events.filter(id=>id!=='trial-of-the-spear');
 expect(choose(v)).toEqual({type:'god/worshipped',cardId:'blessing-of-the-fields'});
});
test('MM keeps two Obols in hand for thinning without destroying its coin floor',()=>{
 const v=view(['obol','obol'],3);v.owned={obol:6,drachma:1,talent:1};
 expect(choose(v)).toEqual({type:'god/worshipped',cardId:'blessing-of-the-fields'});
 v.choice={id:'thin',kind:'trash',source:'blessing-of-the-fields',min:0,max:2};
 expect((choose(v) as any).targets).toHaveLength(2);
 v.owned={obol:6};expect((choose(v) as any).targets).toHaveLength(0);
});
test('MM follows the engine budget ladder and then buys Acropolis',()=>{
 const v=view([]);v.resources.worship=0;
 for(const [coins,cardId] of [[4,'harvest-feast'],[5,'sacred-grove'],[6,'talent'],[8,'acropolis']] as const){
  expect(choose({...v,resources:{...v.resources,coins}})).toEqual({type:'card/bought',cardId});
 }
 v.owned={'sacred-grove':1,'harvest-feast':1,talent:1,drachma:1,obol:4};v.resources.coins=5;
 expect(choose(v)).toEqual({type:'card/bought',cardId:'sacred-academy'});
});
test('MM does not thin away points in the final round',()=>{
 const v=view(['hamlet'],4);v.finalRound=true;
 v.choice={id:'late',kind:'trash',source:'blessing-of-the-fields',min:0,max:2};
 expect((choose(v) as any).targets).toEqual([]);
});
for(const first of [false,true])test('MM completes legal play and resumes exactly, seat '+first,()=>{
 const s=new PracticeSession({seed:'mm-smoke-'+first,humanLeader:'doreios',botLeader:'melia',humanFirst:first,bot:'mm'});
 for(let i=0;s.game.turn.phase!=='finished';i++){
  if(i>3000)throw Error('MM did not finish');
  const uid=activePlayer(s.game),v=s.tracker.view(s.game);
  s.apply(decide(v,s.tracker.memories[uid],uid==='bot'?'mm':'money'));
  if(i===60){const restored=PracticeSession.restore(structuredClone(s.save()));expect(restored.game).toEqual(s.game);const u=activePlayer(s.game);expect(decide(restored.tracker.view(restored.game),restored.tracker.memories[u],'mm')).toEqual(decide(s.tracker.view(s.game),s.tracker.memories[u],'mm'));}
 }
 expect(new Set(standings(s.game).map(r=>r.turns)).size).toBe(1);
},120000);

test('MM does not hold its Temple when it cannot pay to trash the intended pair',()=>{
 const v=view(['temple-of-demeter','obol','drachma']);v.phase='actions';
 v.owned={obol:6,drachma:1,talent:1,'temple-of-demeter':1,'sacred-grove':1,'harvest-feast':1};
 expect(choose(v)).toEqual({type:'action/played',instanceId:'test-0'});
});
test('a compulsory Grove gain does not add arbitrary terminal Actions once the engine is built',()=>{
 const v=view([]);v.owned={obol:4,drachma:1,talent:1,'sacred-grove':1,'harvest-feast':1,'sacred-academy':1};
 v.choice={id:'grove',source:'sacred-grove',kind:'gain',min:1,max:1,limit:4};
 expect(choose(v)).toEqual({type:'choice/resolved',choiceId:'grove',targets:['drachma']});
});

test('MM rebuilds its unfinished engine when the smaller point piles are gone',()=>{
 const v=view([],5);v.supply={...v.supply,acropolis:1,polis:0,hamlet:0};
 v.owned={obol:4,drachma:1,talent:1,'harvest-feast':1,acropolis:3,hamlet:4,polis:3};
 expect(choose(v)).toEqual({type:'card/bought',cardId:'sacred-grove'});
 v.owned['sacred-grove']=1;
 expect(choose(v)).toEqual({type:'card/bought',cardId:'sacred-academy'});
 v.finalRound=true;expect(choose(v)).toEqual({type:'turn/ended'});
});
test('MM takes a winning third-pile finish while respecting every possible equal-turn VP reply',()=>{
 const v=view([],5);v.equalTurns=true;v.playersAfter=1;v.myScore=31;v.scores=[12];
 v.supply={...v.supply,acropolis:1,polis:0,hamlet:0,'sacred-academy':1};
 v.owned={obol:4,drachma:4,talent:1,'harvest-feast':1,'sacred-grove':1,'sacred-academy':1};
 expect(choose(v)).toEqual({type:'card/bought',cardId:'sacred-academy'});
 v.scores=[29];expect(choose(v)).toEqual({type:'turn/ended'});
 v.playersAfter=0;expect(choose(v)).toEqual({type:'card/bought',cardId:'sacred-academy'});
});
