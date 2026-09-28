import type {SetupState} from '../../src/lib/game/setup';
import {activePlayer,canPlayAction,definition,type ActionCommand} from '../../src/lib/game/actions';
export type MatchGoal='acropolis'|'actions';
export function matchCommand(game:SetupState,goal:MatchGoal,spender?:string):ActionCommand{
  const uid=activePlayer(game),zones=game.decks[uid];
  if(game.turn.choice)return {type:'choice/resolved',choiceId:game.turn.choice.id,targets:[]};
  if(game.turn.phase==='actions'){
    if(!spender||spender===uid)for(const id of [`temple-of-${definition(game.leaders[uid]).god.toLowerCase()}`,'oracles-acolyte','harbor-pilot','bronze-recruit']){
      const card=zones.hand.find(card=>card.cardId===id&&canPlayAction(game,uid,card.id));if(card)return {type:'action/played',instanceId:card.id};
    }
    return {type:'phase/advanced'};
  }
  if(!spender||spender===uid){
    if(game.turn.phase==='treasures'&&zones.hand.some(card=>definition(card.cardId).type==='Treasure'))return {type:'treasures/played'};
    const targets=goal==='acropolis'?['acropolis','talent','drachma']:['oracles-acolyte','harbor-pilot','bronze-recruit'];
    const id=targets.find(id=>game.supply[id]>0&&definition(id).cost!<=game.resources.coins);
    if(id&&game.resources.buys>0)return {type:'card/bought',cardId:id};
  }
  return {type:'turn/ended'};
}
