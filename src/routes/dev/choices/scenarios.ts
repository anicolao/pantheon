import {replaySetup,type SetupEvent} from '../../../lib/game/setup';
import {activePlayer,definition,type ActionCommand} from '../../../lib/game/actions';

/** Legal recorded histories for the local interaction preview; no fabricated hands. */
export function choiceScenarios(){
const fixtures:Record<string,SetupEvent[]>={};
for(const subject of ['harvest-feast','seed-keeper','forge-of-heroes','sacred-grove','bronze-recruit']){
 const leader=['bronze-recruit','forge-of-heroes'].includes(subject)?'doreios':'nereon';
 const events:SetupEvent[]=[{schemaVersion:1,sequence:1,actorUid:'a',name:'Ariadne',playerCount:2,type:'game/created'},
 {schemaVersion:1,sequence:2,actorUid:'b',name:'Theseus',playerCount:2,type:'player/joined'},
 {schemaVersion:1,reducerVersion:1,commandId:'start',sequence:3,actorUid:'a',name:'Ariadne',playerCount:2,type:'draft/started',seed:'inline-choices'}];
 let game=replaySetup(events);
 for(const uid of game.draftOrder)events.push({schemaVersion:1,reducerVersion:1,commandId:'leader-'+uid,sequence:events.length+1,actorUid:uid,name:uid==='a'?'Ariadne':'Theseus',playerCount:2,type:'leader/chosen',leaderId:uid==='a'?leader:'thaleia'});
 game=replaySetup(events);
 function append(command:ActionCommand){const uid=activePlayer(game),sequence=events.length+1;events.push({schemaVersion:1,reducerVersion:1,commandId:'cmd-'+sequence,sequence,actorUid:uid,name:uid==='a'?'Ariadne':'Theseus',playerCount:2,...command});game=replaySetup(events);}
 let bought=false;
 for(let turn=0;turn<100;turn++){
  const uid=activePlayer(game),zones=game.decks[uid];
  if(uid==='a'&&zones.hand.some(card=>card.cardId===subject))break;
  if(uid==='a'){
   const temple=zones.hand.find(card=>definition(card.cardId).uniqueStartingCard);
   if(temple){append({type:'action/played',instanceId:temple.id});if(game.turn.choice)append({type:'choice/resolved',choiceId:game.turn.choice.id,targets:[]});}
  }
  append({type:'treasures/played'});
  if(uid==='a'&&!bought&&game.resources.coins>=definition(subject).cost!){append({type:'card/bought',cardId:subject});bought=true;}
  else if(uid==='a'&&!bought&&game.resources.coins>=3)append({type:'card/bought',cardId:'drachma'});
  append({type:'turn/ended'});
 }
 if(!game.decks.a.hand.some(card=>card.cardId===subject))throw Error('No '+subject);
 fixtures[subject]=events;
}
return fixtures;
}
