import {expect,test} from 'bun:test';
import {sortHand} from '../../src/lib/components/play/hand-order';

test('hand groups increase toward the right and sorting preserves engine order',()=>{
  const hand=['talent','hamlet','harbor-pilot','drachma','temple-of-athena','council-of-sages','obol','acropolis','oracles-acolyte'].map((cardId,index)=>({id:`card-${index}`,cardId,copy:1}));
  const before=structuredClone(hand);
  expect(sortHand(hand).map(card=>card.cardId)).toEqual(['hamlet','acropolis','obol','drachma','talent','council-of-sages','temple-of-athena','oracles-acolyte','harbor-pilot']);
  expect(hand).toEqual(before);
});
