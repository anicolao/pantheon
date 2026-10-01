import {definition} from '../game/actions';
import {openingBooks,currentOpeningBooks,type OpeningBook} from './opening-books';
import {command as currentCommand,type StandardView,type StandardMemory} from '../../../standard-matrix/policy';
import {strategyCommand as historicalCommand} from '../../../historical-thaleia/source/scripts/balance/strategy';
import profiles from '../../../historical-thaleia/profiles.json';
export type BotKind='money'|'engine'|'classic-engine';
export const botLabels:Record<BotKind,string>={money:'Money',engine:'Engine (current)', 'classic-engine':'Engine (historical v4)'};
export type BotMemory=StandardMemory & {openingOverride?:OpeningBook|null;openingLog?:{turn:number;key:string;card:string|null}[]};
export function decide(view:StandardView,memory:BotMemory,kind:BotKind){
 if(kind==='classic-engine'){
  const action=historicalCommand(view as any,(profiles as any)['2/'+view.leader+'/engine']);
  if(memory.turn<=2&&!view.choice&&(action.type==='card/bought'||action.type==='turn/ended')&&!memory.openingLog?.some(x=>x.turn===memory.turn)){
   const key=memory.turn+':'+view.resources.coins,book=memory.openingOverride===undefined?openingBooks[view.leader]:memory.openingOverride;
   let card=action.type==='card/bought'?action.cardId:null;
   if(book&&Object.hasOwn(book,key)){
    const target=book[key];
    if(target===null){card=null;memory.openingLog??=[];memory.openingLog.push({turn:memory.turn,key,card});return {type:'turn/ended' as const};}
    if(view.resources.buys>0&&view.supply[target]>0&&!view.bannedCards.includes(target)&&definition(target).cost!==null&&definition(target).cost!<=view.resources.coins){
     card=target;memory.openingLog??=[];memory.openingLog.push({turn:memory.turn,key,card});return {type:'card/bought' as const,cardId:target};
    }
   }
   (memory.openingLog??=[]).push({turn:memory.turn,key,card});
  }
  return action;
 }
 if(kind==='engine'&&memory.turn<=2&&!view.choice&&view.phase!=='actions'&&!view.hand.some(c=>definition(c.cardId).type==='Treasure')&&!memory.openingLog?.some(x=>x.turn===memory.turn)){
  const key=memory.turn+':'+view.resources.coins,book=memory.openingOverride===undefined?currentOpeningBooks[view.leader]:memory.openingOverride;
  if(book&&Object.hasOwn(book,key)){
   const target=book[key];
   if(target===null||view.resources.buys>0&&view.supply[target]>0&&!view.bannedCards.includes(target)&&definition(target).cost!==null&&definition(target).cost!<=view.resources.coins){
    if(memory.turn===1&&view.leader==='thaleia')memory.openingFirstCoins??=view.resources.coins;
    (memory.bookTurns??=[]).push(memory.turn);
    (memory.openingActions??=[]).push({turn:memory.turn,coins:view.resources.coins,card:target});
    (memory.openingLog??=[]).push({turn:memory.turn,key,card:target});
    return target===null?{type:'turn/ended' as const}:{type:'card/bought' as const,cardId:target};
   }
  }
  const action=currentCommand(view,memory,kind);
  if(action.type==='card/bought'||action.type==='turn/ended')(memory.openingLog??=[]).push({turn:memory.turn,key,card:action.type==='card/bought'?action.cardId:null});
  return action;
 }
 return currentCommand(view,memory,kind);
}
