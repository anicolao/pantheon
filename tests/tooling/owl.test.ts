import {test,expect} from 'bun:test';
import {PracticeSession} from '../../src/lib/bots/session';
import {decide} from '../../src/lib/bots/policy';
import {activePlayer} from '../../src/lib/game/actions';
import {owlNeedsDraw} from '../../src/lib/bots/owl';
import type {StandardView} from '../../standard-matrix/policy';
function view(coins=0):StandardView{
 const s=new PracticeSession({seed:'owl-unit',humanLeader:'melia',botLeader:'thaleia',humanFirst:false,bot:'owl'});
 return {...s.tracker.view(s.game),phase:'treasures',hand:[],resources:{coins,actions:1,buys:1,worship:1}};
}
const choose=(v:StandardView)=>decide(v,{turn:1},'owl');
const played=['temple-of-athena','oracles-acolyte'].map((cardId,i)=>({cardId,id:'p'+i,copy:i}));
test('Owl bootstraps Athena devotion and buys draw and eleven coins of income',()=>{
 const v=view();v.resources.worship=0;
 for(const [coins,id] of [[3,'oracles-acolyte'],[4,'council-of-sages'],[5,'sacred-academy'],[6,'talent'],[8,'acropolis']] as const){v.resources.coins=coins;expect(choose(v)).toEqual({type:'card/bought',cardId:id});}
 v.owned={obol:6,talent:1,drachma:1,'temple-of-athena':1};v.resources.coins=6;
 expect(choose(v)).toEqual({type:'card/bought',cardId:'sacred-academy'});
});
test('favored worship grows Academy draw while reserving eight coins for Acropolis',()=>{
 const v=view(11);v.play=played;
 expect(choose(v)).toEqual({type:'god/worshipped',cardId:'counsel-of-olympus'});
 v.choice={id:'academy',kind:'gain',source:'counsel-of-olympus',min:1,max:1,limit:5,actionOnly:true};
 expect(choose(v)).toEqual({type:'choice/resolved',choiceId:'academy',targets:['sacred-academy']});
 v.choice=null;v.resources.coins=8;
 expect(choose(v)).toEqual({type:'card/bought',cardId:'acropolis'});
 v.resources.coins=10;expect(choose(v)).toEqual({type:'card/bought',cardId:'acropolis'});
});
test('worship needs actual favored devotion, an available pile and a remaining turn',()=>{
 const v=view(5);v.play=played.slice(0,1);
 expect(choose(v)).toEqual({type:'card/bought',cardId:'sacred-academy'});
 v.play=played;expect(choose(v).type).toBe('god/worshipped');
 v.supply['sacred-academy']=0;expect(choose(v).type).not.toBe('god/worshipped');
 v.supply['sacred-academy']=8;v.finalRound=true;expect(choose(v).type).not.toBe('god/worshipped');
});
test('draw demand grows as victory cards enter the deck',()=>{
 const v=view();v.owned={obol:6,hamlet:3,'temple-of-athena':1,'council-of-sages':1,'sacred-academy':5};
 expect(owlNeedsDraw(v)).toBe(false);v.owned.acropolis=2;expect(owlNeedsDraw(v)).toBe(true);
});
for(const first of [false,true])test('Owl plays a complete legal and replayable game, seat '+first,()=>{
 const s=new PracticeSession({seed:'owl-smoke-'+first,humanLeader:'melia',botLeader:'thaleia',humanFirst:first,bot:'owl'});
 for(let step=0;s.game.turn.phase!=='finished';step++){
  if(step>=5000)throw Error('Owl did not finish');
  const uid=activePlayer(s.game);s.apply(decide(s.tracker.view(s.game),s.tracker.memories[uid],uid==='bot'?'owl':'mm'));
 }
 expect(PracticeSession.restore(structuredClone(s.save())).game).toEqual(s.game);
},120000);
