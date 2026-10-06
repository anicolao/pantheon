import {expect,test} from 'bun:test';
import {sortHand,treasuresRightToLeft} from '../../src/lib/components/play/hand-order';

test('hand groups increase toward the right and sorting preserves engine order',()=>{
  const hand=['talent','hamlet','harbor-pilot','drachma','temple-of-athena','council-of-sages','obol','acropolis','oracles-acolyte'].map((cardId,index)=>({id:`card-${index}`,cardId,copy:1}));
  const before=structuredClone(hand);
  expect(sortHand(hand).map(card=>card.cardId)).toEqual(['hamlet','acropolis','obol','drachma','talent','council-of-sages','temple-of-athena','oracles-acolyte','harbor-pilot']);
  expect(hand).toEqual(before);
});


test('Play all departs from the right edge of the sorted fan, including repeated denominations',()=>{
  const hand=['drachma','talent','obol','hamlet','drachma','oracles-acolyte'].map((cardId,index)=>({id:`card-${index}`,cardId,copy:index+1}));
  const before=structuredClone(hand);
  expect(treasuresRightToLeft(hand).map(card=>card.id)).toEqual(['card-1','card-4','card-0','card-2']);
  expect(hand).toEqual(before);
});
