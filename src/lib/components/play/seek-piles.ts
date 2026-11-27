import type {CardInstance} from '$lib/game/setup';
import {definition} from '$lib/game/actions';

/** Group presentation only; the reducer retains every revealed physical card. */
export function seekPiles(cards:readonly CardInstance[]) {
  const piles=new Map<string,CardInstance[]>();
  for(const card of cards){const pile=piles.get(card.cardId)??[];pile.push(card);piles.set(card.cardId,pile);}
  return [...piles].map(([cardId,copies])=>({cardId,copies})).sort((a,b)=>(definition(a.cardId).cost??0)-(definition(b.cardId).cost??0)||definition(a.cardId).name.localeCompare(definition(b.cardId).name));
}
