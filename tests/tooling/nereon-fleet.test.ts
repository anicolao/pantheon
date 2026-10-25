import {expect,test} from 'bun:test';
import {PracticeSession} from '../../src/lib/bots/session';
import {nereonFleetCommand as choose} from '../../src/lib/bots/nereon-fleet';
import type {StandardView} from '../../standard-matrix/policy';
function view(coins:number,hand:string[]=[]):StandardView{
 const s=new PracticeSession({seed:'fleet-unit',humanLeader:'melia',botLeader:'nereon',humanFirst:false,bot:'money'});
 return {...s.tracker.view(s.game),phase:'treasures',hand:hand.map((cardId,i)=>({cardId,id:'hand-'+i,copy:i})),resources:{coins,actions:1,buys:1,worship:2}};
}
test('opening buys Acolyte for two and Fleet for five',()=>{
 expect(choose(view(2))).toEqual({type:'card/bought',cardId:'oracles-acolyte'});
 expect(choose(view(5))).toEqual({type:'card/bought',cardId:'merchant-fleet'});
});
test('Demeter removes two Hamlets or the last Hamlet with one opening Obol',()=>{
 expect(choose(view(3,['hamlet','hamlet']))).toEqual({type:'god/worshipped',cardId:'blessing-of-the-fields'});
 const v=view(0,['hamlet','obol']);v.choice={id:'thin',kind:'trash',source:'blessing-of-the-fields',min:0,max:2};
 expect(choose(v)).toEqual({type:'choice/resolved',choiceId:'thin',targets:['hand-0','hand-1']});
 v.owned.obol=5;expect((choose(v) as any).targets).toEqual(['hand-0']);
});
test('favored Poseidon gains money but preserves eight-coin purchases',()=>{
 const v=view(6);v.owned['merchant-fleet']=1;v.play=['temple-of-poseidon','merchant-fleet'].map((cardId,i)=>({cardId,id:'play-'+i,copy:i}));
 expect(choose(v)).toEqual({type:'god/worshipped',cardId:'tribute-of-the-tides'});
 v.resources.coins=8;expect(choose(v)).toEqual({type:'card/bought',cardId:'acropolis'});
 v.resources.coins=5;v.bannedEvents=['tribute-of-the-tides'];expect(choose(v)).toEqual({type:'card/bought',cardId:'sacred-academy'});
});
test('keeps buying draw and denser money even with one Acropolis left',()=>{
 const v=view(5);v.owned={'merchant-fleet':1,'sacred-academy':2,obol:5,drachma:5,acropolis:2};v.supply.acropolis=1;
 expect(choose(v)).toEqual({type:'card/bought',cardId:'sacred-academy'});
 v.resources.coins=6;expect(choose(v)).toEqual({type:'card/bought',cardId:'talent'});
 v.finalRound=true;expect(choose(v)).toEqual({type:'card/bought',cardId:'polis'});
});
