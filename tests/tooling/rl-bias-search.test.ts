import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {biasNames,biasVector,withBias} from '../../scripts/rl/bias_worker';
import {createResearchActor} from '../../scripts/rl/research_actor';
import {slots} from '../../src/lib/bots/rl-schema';

test('preference search changes only intended output biases and preserves zero initialization',()=>{
 const data=JSON.parse(readFileSync('src/lib/bots/models/doreios.json','utf8'));
 const original=JSON.stringify(data),zero=biasNames.map(()=>0),obs=Array(data.layers[0].input).fill(0);
 expect(createResearchActor(withBias(data,zero)).logits(obs)).toEqual(createResearchActor(data).logits(obs));
 const params=[...zero];params[biasNames.indexOf('card:talent')]=3;params[biasNames.indexOf('select:obol')]=-2;
 const vector=biasVector(params);
 for(let i=0;i<slots.length;i++){
  const slot=slots[i];const expected=(slot.kind==='buy'||slot.kind==='gain')&&slot.ids[0]==='talent'?3:slot.kind==='select'?-2*slot.ids.filter(id=>id==='obol').length:0;
  expect(vector[i]).toBe(expected===0?0:expected);
 }
 const before=createResearchActor(data).logits(obs),after=createResearchActor(withBias(data,params)).logits(obs);
 for(let i=0;i<before.length;i++)expect(after[i]-before[i]).toBeCloseTo(vector[i],5);
 expect(JSON.stringify(data)).toBe(original);
 expect(()=>biasVector([1])).toThrow();
});
