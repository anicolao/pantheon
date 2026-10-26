import {test,expect} from 'bun:test';
import {thinOverride} from '../../scripts/rl/thin_policy';
import type {StandardView} from '../../standard-matrix/policy';
const base={type:'choice/resolved' as const,choiceId:'choice',targets:[] as string[]};
const make=()=>({leader:'doreios',choice:{id:'choice',kind:'trash',source:'doreios'},hand:[{id:'obol1',cardId:'obol'}],owned:{obol:6,talent:2},resources:{coins:0},supply:{acropolis:5},finalRound:null}) as unknown as StandardView;
test('free Obol thinning respects economic floor, source, current purchase and ending',()=>{
 const rule={floor:8,protect:[8],stopSupply:2},v=make();
 expect(thinOverride(v,base,rule)).toEqual({...base,targets:['obol1']});
 expect(thinOverride({...v,owned:{obol:6,talent:1}},base,{...rule,floor:9})).toBe(base);
 expect(thinOverride({...v,resources:{...v.resources,coins:7}},base,rule)).toBe(base);
 expect(thinOverride({...v,supply:{acropolis:2}},base,rule)).toBe(base);
 expect(thinOverride({...v,choice:{...v.choice!,source:'seed-keeper'}},base,rule)).toBe(base);
 const chosen={...base,targets:['other']};expect(thinOverride(v,chosen,rule)).toBe(chosen);
 expect(thinOverride({...v,hand:[...v.hand,{id:'hamlet',cardId:'hamlet',copy:1}]},base,rule)).toBe(base);
});
