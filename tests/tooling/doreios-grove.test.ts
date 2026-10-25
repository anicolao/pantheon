import {expect,test} from 'bun:test';
import {PracticeSession} from '../../src/lib/bots/session';
import {doreiosGroveCommand as choose} from '../../src/lib/bots/doreios-grove';
import type {StandardView} from '../../standard-matrix/policy';
function view(coins:number,hand:string[]=[]):StandardView{
 const s=new PracticeSession({seed:'grove-unit',humanLeader:'melia',botLeader:'doreios',humanFirst:false,bot:'money'});
 return {...s.tracker.view(s.game),phase:'treasures',hand:hand.map((cardId,i)=>({cardId,id:'h'+i,copy:i})),resources:{coins,actions:1,buys:1,worship:2}};
}
test('Recruit opening, Grove then Academy, two Talents',()=>{
 const v=view(3);expect(choose(v)).toEqual({type:'card/bought',cardId:'bronze-recruit'});
 v.resources.coins=5;expect(choose(v)).toEqual({type:'card/bought',cardId:'sacred-grove'});
 v.owned['sacred-grove']=1;expect(choose(v)).toEqual({type:'card/bought',cardId:'sacred-academy'});
 v.resources.coins=6;expect(choose(v)).toEqual({type:'card/bought',cardId:'talent'});
 v.owned.talent=2;expect(choose(v)).toEqual({type:'card/bought',cardId:'sacred-academy'});
});
test('Grove has no Harvest Feast quantity cap',()=>{
 const v=view(0);v.choice={id:'gain',kind:'gain',source:'sacred-grove',min:1,max:1,limit:4};
 v.owned={'harvest-feast':12,'council-of-sages':1,'harbor-pilot':1};
 expect(choose(v)).toEqual({type:'choice/resolved',choiceId:'gain',targets:['harvest-feast']});
});
test('Council needs support for Recruit; insufficient support gains Pilot',()=>{
 const v=view(0);v.choice={id:'gain',kind:'gain',source:'sacred-grove',min:1,max:1,limit:4};
 v.owned={'harvest-feast':3,'bronze-recruit':1};
 expect((choose(v) as any).targets).toEqual(['harvest-feast']);
 v.owned['harbor-pilot']=1;expect((choose(v) as any).targets).toEqual(['council-of-sages']);
 v.owned['council-of-sages']=1;delete v.owned['harbor-pilot'];
 expect((choose(v) as any).targets).toEqual(['harbor-pilot']);
});
test('free thinning preserves a key purchase and never sacrifices the Temple',()=>{
 const v=view(0,['obol','obol','obol','temple-of-ares']);
 v.choice={id:'trash',kind:'trash',source:'doreios',min:0,max:1};
 expect((choose(v) as any).targets).toEqual([]);
 v.hand.push({cardId:'hamlet',id:'hamlet',copy:0});
 expect((choose(v) as any).targets).toEqual(['hamlet']);
});
test('opening Demeter thins two Hamlets; favored Ares retains Obol to upgrade',()=>{
 const v=view(3,['hamlet','hamlet']);
 expect(choose(v)).toEqual({type:'god/worshipped',cardId:'blessing-of-the-fields'});
 v.resources.coins=4;v.hand=[{cardId:'obol',id:'obol',copy:0}];
 v.play=['temple-of-ares','bronze-recruit'].map((cardId,i)=>({cardId,id:'p'+i,copy:i}));
 expect(choose(v)).toEqual({type:'god/worshipped',cardId:'trial-of-the-spear'});
 v.resources.coins=0;v.hand=[{cardId:'obol',id:'obol',copy:0}];
 v.choice={id:'upgrade',kind:'trash',source:'trial-of-the-spear',min:0,max:1,offering:3};
 expect((choose(v) as any).targets).toEqual(['obol']);
});
test('do not take last Acropolis while behind; allow it when ahead',()=>{
 const v=view(8);v.supply.acropolis=1;v.myScore=12;v.scores=[22];
 expect(choose(v)).toEqual({type:'card/bought',cardId:'polis'});
 v.myScore=24;v.scores=[27];expect(choose(v)).toEqual({type:'card/bought',cardId:'acropolis'});
});
test('late Ares converts Feast to Polis when combined points beat buying alone',()=>{
 const v=view(7,['harvest-feast']);v.supply.acropolis=1;v.myScore=20;v.scores=[27];
 expect(choose(v)).toEqual({type:'god/worshipped',cardId:'trial-of-the-spear'});
 v.resources.coins=3;v.choice={id:'upgrade',kind:'trash',source:'trial-of-the-spear',min:0,max:1,offering:1};
 expect((choose(v) as any).targets).toEqual(['h0']);
});
