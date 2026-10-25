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

test('Obol-only thinning checks the owned coin floor after each removal',()=>{
 const v=view(3,['obol']);v.owned={obol:5,drachma:2,'merchant-fleet':1};
 expect(choose(v)).toEqual({type:'god/worshipped',cardId:'blessing-of-the-fields'});
 v.resources.coins=0;v.choice={id:'thin',kind:'trash',source:'blessing-of-the-fields',min:0,max:2};
 expect((choose(v) as any).targets).toEqual(['hand-0']); // $9 -> $8, then stop.
 v.hand.push({cardId:'obol',id:'hand-1',copy:1});v.choice.source='seed-keeper';
 v.owned={obol:4,talent:2};expect((choose(v) as any).targets).toEqual(['hand-0','hand-1']); // $10 -> $8.
 v.owned={obol:5,drachma:1};expect((choose(v) as any).targets).toEqual([]);
 v.owned={obol:6};expect((choose(v) as any).targets).toEqual(['hand-0']); // Count exception remains.
 v.owned={obol:7};expect((choose(v) as any).targets).toEqual(['hand-0','hand-1']);
 v.owned={obol:4,talent:2,acropolis:1};expect((choose(v) as any).targets).toEqual([]);
 v.owned={obol:4,talent:2};v.finalRound=true;expect((choose(v) as any).targets).toEqual([]);
});
test('Hamlets retain first priority, with richer decks allowed an accompanying Obol',()=>{
 const v=view(0,['obol','hamlet']);v.owned={obol:5,drachma:2,hamlet:1};
 v.choice={id:'thin',kind:'trash',source:'blessing-of-the-fields',min:0,max:2};
 expect((choose(v) as any).targets).toEqual(['hand-1','hand-0']);
 v.hand.push({cardId:'hamlet',id:'hand-2',copy:2});
 expect((choose(v) as any).targets).toEqual(['hand-1','hand-2']);
});

test('three generated coins excludes retained Obols and survives paying Demeter',()=>{
 const v=view(3,['obol']);v.owned={obol:5,drachma:2,'merchant-fleet':1};
 expect(choose(v)).toEqual({type:'god/worshipped',cardId:'blessing-of-the-fields'});
 v.resources.coins=4;expect(choose(v)).toEqual({type:'treasure/played',instanceId:'hand-0'}); // Four generated coins: no Obol thinning.
 v.resources.coins=0;v.choice={id:'paid',kind:'trash',source:'blessing-of-the-fields',min:0,max:2};
 expect((choose(v) as any).targets).toEqual(['hand-0']); // Restore the $3 already paid; retained Obol is excluded.
 v.resources.coins=1;expect((choose(v) as any).targets).toEqual([]); // Four generated coins before payment.
 v.hand.push({cardId:'hamlet',id:'hamlet',copy:1});
 expect((choose(v) as any).targets).toEqual(['hamlet']); // Hamlet thinning unchanged.
});
test('Obol selection keeps original hand order rather than sorting instance IDs',()=>{
 const v=view(0,[]);v.owned={obol:6};
 v.hand=[{cardId:'obol',id:'z-first',copy:6},{cardId:'obol',id:'a-second',copy:1}];
 v.choice={id:'thin',kind:'trash',source:'seed-keeper',min:0,max:2};
 expect((choose(v) as any).targets).toEqual(['z-first']);
});

test('four coins buys Council with zero spare Actions, replenishing Pilot support as needed',()=>{
 const v=view(4);v.owned={'merchant-fleet':1,'harbor-pilot':0};
 expect(choose(v)).toEqual({type:'card/bought',cardId:'council-of-sages'});
 v.owned['council-of-sages']=1;expect(choose(v)).toEqual({type:'card/bought',cardId:'harbor-pilot'});
 v.resources.coins=3;expect(choose(v)).toEqual({type:'card/bought',cardId:'harbor-pilot'});
 v.resources.coins=4;v.owned['harbor-pilot']=1;expect(choose(v)).toEqual({type:'card/bought',cardId:'council-of-sages'});
 v.owned['bronze-recruit']=1;expect(choose(v)).toEqual({type:'card/bought',cardId:'harbor-pilot'});
});

test('the four-coin Action purchase takes priority over worship, but not final-round VP',()=>{
 const v=view(4);v.owned={'merchant-fleet':1,'harbor-pilot':2};
 v.play=['merchant-fleet','temple-of-poseidon'].map((cardId,i)=>({cardId,id:'play-'+i,copy:i}));
 expect(choose(v)).toEqual({type:'card/bought',cardId:'council-of-sages'});
 v.finalRound=true;expect(choose(v)).toEqual({type:'card/bought',cardId:'hamlet'});
});

test('three generated coins can thin two retained Obols without a Hamlet',()=>{
 const v=view(3,['obol','obol']);v.owned={obol:4,talent:2,'merchant-fleet':1};
 expect(choose(v)).toEqual({type:'god/worshipped',cardId:'blessing-of-the-fields'});
 v.resources.coins=0;v.choice={id:'paid',kind:'trash',source:'blessing-of-the-fields',min:0,max:2};
 expect((choose(v) as any).targets).toEqual(['hand-0','hand-1']);
});
