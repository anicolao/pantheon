import {test,expect} from 'bun:test';
import {ensembleAction} from '../../scripts/rl/ensemble_policy';
test('ensemble endpoints preserve legal actor argmax and deterministic ties',()=>{
 const a=[2,9,1,2],b=[1,8,4,0],mask=[true,false,true,true];
 for(const normalize of [false,true]){
  expect(ensembleAction(a,b,mask,{weight:0,normalize})).toBe(0);
  expect(ensembleAction(a,b,mask,{weight:1,normalize})).toBe(2);
  expect(ensembleAction([0,0],[0,0],[true,true],{weight:.5,normalize})).toBe(0);
 }
 expect(()=>ensembleAction(a,b,[false,false,false,false],{weight:.5,normalize:false})).toThrow();
 expect(()=>ensembleAction([NaN],[0],[true],{weight:.5,normalize:false})).toThrow();
 expect(()=>ensembleAction(a,b,mask,{weight:2,normalize:false})).toThrow();
});
test('normalized combination is invariant to positive affine scale on either actor',()=>{
 const a=[3,0,1],b=[0,3,1],mask=[true,true,true],rule={weight:.6,normalize:true};
 expect(ensembleAction(a,b,mask,rule)).toBe(1);
 expect(ensembleAction(a.map(x=>10*x+100),b.map(x=>3*x-20),mask,rule)).toBe(1);
});
