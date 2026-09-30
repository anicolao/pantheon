
import {policy as basePolicy,type Config as BaseConfig,type Memory as BaseMemory} from '../equal-turns-engine-v3/policy';
import {definition,type ActionCommand} from '../equal-turns/source/src/lib/game/actions';
import type {View} from '../equal-turns/source/scripts/balance/strategy';
export type Opening= {split:'5/1'|'4/2'|'3/3';cards:[string|null,string|null]};
export type Book=Partial<Record<Opening['split'],Opening>>;
export type Config=BaseConfig & {openingBook?:Book};
export type Memory=BaseMemory & {openingFirstCoins?:number;openingActions?:{turn:number;coins:number;card:string|null}[]};
export function policy(p:Config){
 const base=basePolicy(p);
 return (v:View,m:Memory):ActionCommand=>{
  if(!p.openingBook||m.turn>2||v.choice||v.phase==='actions')return base(v,m);
  if(v.phase==='treasures'&&v.hand.some(c=>definition(c.cardId).type==='Treasure'))return base(v,m);
  if(v.resources.buys<=0)return {type:'turn/ended'};
  if(m.turn===1)m.openingFirstCoins??=v.resources.coins;
  const first=m.openingFirstCoins;
  if(first===undefined)return base(v,m);
  const high=Math.max(first,6-first),split=(high===5?'5/1':high===4?'4/2':'3/3') as Opening['split'];
  const opening=p.openingBook[split];
  if(!opening)return base(v,m);
  const index=split==='3/3'?m.turn-1:v.resources.coins===high?0:1;
  const card=opening.cards[index];
  if(card!==null&&(v.supply[card]<=0||v.bannedCards.includes(card)||definition(card).cost===null||definition(card).cost!>v.resources.coins))throw Error('Illegal opening-book purchase: '+card);
  (m.openingActions??=[]).push({turn:m.turn,coins:v.resources.coins,card});
  return card===null?{type:'turn/ended'}:{type:'card/bought',cardId:card};
 };
}
