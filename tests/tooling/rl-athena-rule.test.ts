import {test,expect} from 'bun:test';
import {athenaOverride} from '../../scripts/rl/athena_policy';
import type {StandardView} from '../../standard-matrix/policy';
const rule={cashFloor:8,academyCap:3,through:7,oracleAtThree:true};
const buy={type:'card/bought' as const,cardId:'drachma'};
const card=(cardId:string)=>({id:cardId,cardId,copy:1});
function view(extra:Partial<StandardView>={}):StandardView{return {leader:'doreios',phase:'buys',myTurns:3,resources:{coins:5,buys:1,actions:0,worship:1},owned:{obol:6,drachma:1,'council-of-sages':1},supply:{acropolis:8,'sacred-academy':10,'oracles-acolyte':10,'council-of-sages':10},hand:[],play:[card('oracles-acolyte'),card('council-of-sages')],events:['counsel-of-olympus'],bannedCards:[],bannedEvents:[],...extra} as StandardView;}
test('Athena teacher uses favored topdeck draw without sacrificing an Acropolis',()=>{
 expect(athenaOverride(view(),buy,rule)).toEqual({type:'god/worshipped',cardId:'counsel-of-olympus'});
 expect(athenaOverride(view({resources:{coins:8,buys:1,actions:0,worship:1}}),{type:'card/bought',cardId:'acropolis'},rule)).toEqual({type:'card/bought',cardId:'acropolis'});
 expect(athenaOverride(view({resources:{coins:11,buys:1,actions:0,worship:1}}),buy,rule)).toEqual({type:'god/worshipped',cardId:'counsel-of-olympus'});
 expect(athenaOverride(view({play:[card('council-of-sages')]}),buy,rule)).toEqual(buy);
 expect(athenaOverride(view({choice:{id:'choice',kind:'gain',source:'counsel-of-olympus',min:1,max:1,limit:5,actionOnly:true,topdeck:true}}),buy,rule)).toEqual({type:'choice/resolved',choiceId:'choice',targets:['sacred-academy']});
});
test('Athena teacher buys one bridge cantrip and plays it before Council',()=>{
 expect(athenaOverride(view({play:[],resources:{coins:2,buys:1,actions:0,worship:1}}),buy,rule)).toEqual({type:'card/bought',cardId:'oracles-acolyte'});
 expect(athenaOverride(view({play:[],resources:{coins:3,buys:1,actions:0,worship:1}}),buy,rule)).toEqual({type:'card/bought',cardId:'oracles-acolyte'});
 expect(athenaOverride(view({phase:'actions',hand:[card('oracles-acolyte'),card('council-of-sages')],resources:{coins:0,buys:1,actions:1,worship:1}}),{type:'action/played',instanceId:'council-of-sages'},rule)).toEqual({type:'action/played',instanceId:'oracles-acolyte'});
});
test('explicit opening variant can replace Poseidon, using the whole spendable budget',()=>{
 const base={type:'god/worshipped' as const,cardId:'tribute-of-the-tides'},v=view({play:[],phase:'treasures',resources:{coins:2,buys:1,actions:0,worship:1}});
 expect(athenaOverride(v,base,rule)).toEqual(base);
 expect(athenaOverride(v,base,{...rule,replaceWorship:true})).toEqual({type:'card/bought',cardId:'oracles-acolyte'});
 expect(athenaOverride({...v,hand:[card('obol')]},base,{...rule,replaceWorship:true})).toEqual({type:'treasures/played'});
 expect(athenaOverride({...v,hand:[card('obol'),{...card('obol'),id:'o2'}]},base,{...rule,replaceWorship:true})).toEqual(base);
 expect(athenaOverride({...v,resources:{...v.resources,buys:0}},base,{...rule,replaceWorship:true})).toEqual(base);
});
