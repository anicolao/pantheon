import {test,expect} from 'bun:test';
import {templeOrderOverride} from '../../scripts/rl/temple_order_policy';
import type {StandardView} from '../../standard-matrix/policy';
const card=(cardId:string)=>({id:cardId,cardId,copy:1});
const view={leader:'doreios',phase:'actions',resources:{actions:1,coins:0,buys:1,worship:1},hand:['temple-of-ares','council-of-sages','obol'].map(card)} as StandardView;
const council={type:'action/played' as const,instanceId:'council-of-sages'},temple={type:'action/played' as const,instanceId:'temple-of-ares'};
test('Temple order preserves the Action before Council and leaves choices untouched',()=>{
 expect(templeOrderOverride(view,council,{mode:'always'})).toEqual(temple);
 expect(templeOrderOverride(view,council,{mode:'last-action'})).toEqual(temple);
 expect(templeOrderOverride(view,council,{mode:'hamlet'})).toBe(council);
 expect(templeOrderOverride({...view,hand:[...view.hand,card('hamlet')]},council,{mode:'hamlet'})).toEqual(temple);
 expect(templeOrderOverride({...view,resources:{...view.resources,actions:2}},council,{mode:'last-action'})).toBe(council);
 const choice={type:'choice/resolved' as const,choiceId:'trash',targets:[]};
 expect(templeOrderOverride({...view,choice:{id:'trash',source:'doreios',kind:'trash',min:0,max:1}},choice,{mode:'always'})).toBe(choice);
 expect(templeOrderOverride({...view,phase:'buys'},council,{mode:'always'})).toBe(council);
 expect(templeOrderOverride({...view,resources:{...view.resources,actions:0}},council,{mode:'always'})).toBe(council);
 expect(templeOrderOverride(view,temple,{mode:'always'})).toBe(temple);
});
