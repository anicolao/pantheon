import {expect,test} from 'bun:test';
import {fourReward,validateFourReward} from '../../scripts/rl/four_reward';

test('round discounts reward earlier wins, split ties, and give every loss zero',()=>{
 for(const discount of [1,.99,.98]){
  const r=validateFourReward({kind:'round-discounted-win',discount})!;
  expect(fourReward(1,1,r)).toBe(1);
  expect(fourReward(1,10,r)).toBeCloseTo(discount**9,12);
  expect(fourReward(.5,10,r)).toBeCloseTo(discount**9/2,12);
  expect(fourReward(1/3,10,r)).toBeCloseTo(discount**9/3,12);
  expect(fourReward(.25,10,r)).toBeCloseTo(discount**9/4,12);
  expect(fourReward(0,1,r)).toBe(0);expect(fourReward(0,50,r)).toBe(0);
  if(discount<1)expect(fourReward(1,10,r)).toBeGreaterThan(fourReward(1,15,r));
 }
});
test('default reward remains compatible and invalid configurations fail',()=>{
 expect(fourReward(1,15)).toBe(1);expect(fourReward(.5,15)).toBe(0);expect(fourReward(0,15)).toBe(-1);
 expect(validateFourReward(undefined)).toBeUndefined();
 for(const discount of [0,-1,1.01,NaN,Infinity])expect(()=>validateFourReward({kind:'round-discounted-win',discount})).toThrow();
 expect(()=>validateFourReward({kind:'other',discount:.99})).toThrow();
 expect(()=>fourReward(1,0)).toThrow();
});

test('score-margin reward distinguishes close losses and remains terminal bounded',()=>{
 for(const winWeight of [0,.5,1]){
  const r=validateFourReward({kind:'score-margin',scale:8,winWeight})!;
  const close=fourReward(0,10,r,-1),far=fourReward(0,10,r,-20);
  if(winWeight<1)expect(close).toBeGreaterThan(far);
  expect(close).toBeGreaterThanOrEqual(0);expect(fourReward(1,10,r,20)).toBeLessThanOrEqual(1);
  expect(fourReward(.5,10,r,0)).toBe(.5);
  expect(fourReward(1,10,r,4)).toBe(fourReward(1,20,r,4));
 }
 expect(()=>fourReward(0,10,{kind:'score-margin',scale:8,winWeight:0})).toThrow();
 expect(()=>validateFourReward({kind:'score-margin',scale:0,winWeight:0})).toThrow();
 expect(()=>validateFourReward({kind:'score-margin',scale:8,winWeight:2})).toThrow();
});
