import {test,expect} from 'bun:test';
import {drawOverride} from '../../scripts/rl/draw_policy';
import type {StandardView} from '../../standard-matrix/policy';
const rule={cashFloor:10,through:6,drawCap:3,mode:'council' as const};
const base={type:'card/bought' as const,cardId:'drachma'};
function view(extra:Partial<StandardView>={}):StandardView{return {leader:'doreios',phase:'buys',myTurns:4,resources:{coins:5,buys:1,actions:0,worship:1},owned:{obol:6,drachma:2,'council-of-sages':1},supply:{acropolis:8,'council-of-sages':10,'harbor-pilot':10,'sacred-academy':10},hand:[],bannedCards:[],...extra} as StandardView;}
test('draw teacher buys action support, then draw, while preserving late points',()=>{
 expect(drawOverride(view(),base,rule)).toEqual({type:'card/bought',cardId:'harbor-pilot'});
 expect(drawOverride(view({owned:{obol:6,drachma:2,'council-of-sages':1,'harbor-pilot':1}}),base,rule)).toEqual({type:'card/bought',cardId:'council-of-sages'});
 expect(drawOverride(view(),base,{...rule,mode:'academy'})).toEqual({type:'card/bought',cardId:'sacred-academy'});
 expect(drawOverride(view({finalRound:true}),base,rule)).toEqual(base);
 expect(drawOverride(view({owned:{obol:6}}),base,rule)).toEqual(base);
});
test('draw teacher preserves money and resolves new cantrips before terminal cards',()=>{
 const hand=[{id:'hp',cardId:'harbor-pilot',copy:1},{id:'c',cardId:'council-of-sages',copy:1},{id:'o',cardId:'obol',copy:1}];
 expect(drawOverride(view({phase:'actions',hand,resources:{coins:0,buys:1,actions:1,worship:1}}),{type:'action/played',instanceId:'c'},rule)).toEqual({type:'action/played',instanceId:'hp'});
 expect(drawOverride(view({phase:'treasures',hand}),base,rule)).toEqual({type:'treasures/played'});
});
