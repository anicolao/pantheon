import {replaySetup,allLeaderIds,type SetupEvent,type SetupState} from '$lib/game/setup';
import {activePlayer,applyPlayCommand,canPlayAction,definition,effectOptions,eligibleGains,isExpansionChoice,type ActionCommand} from '$lib/game/actions';
import type {Fixture} from './scenarios';

const actionIds=['borrowed-voice','thunders-answer','chorus-of-olympus','ariadnes-thread','labyrinth-scout','wayfinder','rallying-cry','myrmidon-vanguard','phalanx-advance','polished-shield','gorgons-gaze','harpe-bearer'];
const worshipIds=['reverberation','open-the-hidden-way','march-of-victory','stillness-of-the-underworld'];
export const expansionScenarios=[
 ...actionIds.map(card=>({id:'expansion-'+card,name:definition(card).name,hint:definition(card).god==='Nike'?'Play this card, then play Sacred Academy from your hand with Deploy. Rallying Cry and Myrmidon Vanguard resolve it once; Phalanx Advance resolves it twice.':card==='borrowed-voice'?'Borrow Harbor Pilot from Nereon’s discard and resolve its effect. Echo’s leader ability then offers a separate Echo if another target is available. Borrowed cards return to their owner at cleanup.':card==='ariadnes-thread'?'Ariadne’s Thread: Seek 3 for a Treasure. After it resolves, Theseus’s first-Hermes-Action ability separately seeks 2 for an Action.':'Production engine and animations. Play the card, then choose its targets on the table.'})),
 ...worshipIds.map(card=>({id:'expansion-'+card,name:'Worship · '+definition(card).god,hint:card==='march-of-victory'?'Trigger favored Nike worship, then play Sacred Academy from your hand to resolve it three times.':'Favored worship, prepared by legal card plays. Use the real worship controls or Trigger.'})),
 ...['action','treasure','territory'].map(kind=>({id:'expansion-echo-'+kind,name:'Echo · '+kind,hint:kind==='action'?'Borrow a real Action from an opponent’s discard, then end the turn to see its return.':'Choose the opponent’s empty discard/deck option to reveal and resolve its top card.'})),
 {id:'expansion-deploy-forge',name:'Deploy 3 · separate Forge costs',hint:'Favored Nike worship grants Deploy 3. Play Forge of Heroes; each resolution pays its own trash cost.'},
 {id:'expansion-deploy-draw',name:'Deploy 3 · repeated draw',hint:'Favored Nike worship grants Deploy 3. Play Sacred Academy to resolve its effects three times.'}
];
const leaderFor=(id:string)=>({Zeus:'echo',Hermes:'theseus',Nike:'achilles',Hades:'perseus'}[definition(id).god as 'Zeus'|'Hermes'|'Nike'|'Hades']);
/** Every scenario is a legal event history. No zone patches or demo-only commands. */
export function expansionFixture(id:string,count:2|3|4,playerIds:string[]):Fixture {
 const subject=id.replace('expansion-','');
 const echo=subject.startsWith('echo-'),deploy=subject.startsWith('deploy-');
 const cardId=echo?'borrowed-voice':deploy?'march-of-victory':subject;
 const worship=definition(cardId).type==='Event';
 const nike=definition(cardId).god==='Nike';
 const deployTarget=subject==='deploy-forge'?'forge-of-heroes':'sacred-academy';
 const deployPrimer=subject==='deploy-forge'?'bronze-recruit':'council-of-sages';
 const actionBorrow=subject==='borrowed-voice'||subject==='echo-action';
 const opponentAction=subject==='borrowed-voice'?'harbor-pilot':'oracles-acolyte';
 const actor=playerIds[0],other=playerIds[1];
 const leader=leaderFor(cardId),opponent=nike?(subject==='deploy-forge'?'doreios':'thaleia'):echo?'thaleia':'nereon';
 const wanted=worship?[{Zeus:'borrowed-voice',Hermes:'ariadnes-thread',Nike:'rallying-cry',Hades:'polished-shield'}[definition(cardId).god as 'Zeus'|'Hermes'|'Nike'|'Hades'],...(nike?[deployPrimer,deployTarget]:[])]:[cardId,...(nike?[deployTarget]:[])];
 const leaders=[leader,opponent,...allLeaderIds.filter(value=>value!==leader&&value!==opponent)].slice(0,count);
 const names=leaders.map(value=>definition(value).name.split(',')[0]);
 const events:SetupEvent[]=playerIds.map((uid,i)=>({schemaVersion:1,sequence:i+1,actorUid:uid,name:names[i],playerCount:count,type:i?'player/joined':'game/created',...(i?{}:{equalTurns:true})}));
 let game=replaySetup(events);
 function append(command:ActionCommand|{type:'draft/started';seed:string}|{type:'leader/chosen';leaderId:string},uid=activePlayer(game)){
  const sequence=events.length+1;
  const event:SetupEvent={...command,schemaVersion:1,reducerVersion:1,commandId:'expansion-lab-'+sequence,sequence,actorUid:uid,name:names[playerIds.indexOf(uid)],playerCount:count};
  events.push(event);
  if(game.phase==='playing'){game.activity.push({sequence,message:applyPlayCommand(game,uid,command as ActionCommand,sequence)});}
  else game=replaySetup(events);
 }
 append({type:'draft/started',seed:'expansion-production-'+subject},actor);
 for(const uid of game.draftOrder)append({type:'leader/chosen',leaderId:leaders[playerIds.indexOf(uid)]},uid);
 function settle(){
  for(let safety=0;game.turn.choice;safety++){
   if(safety>100)throw Error('Fixture choice did not finish');
   const choice=game.turn.choice,uid=activePlayer(game);
   const targets=choice.kind==='gain'?eligibleGains(game,choice.limit!,choice.actionOnly).slice(-1).map(card=>card.id):isExpansionChoice(choice)?[]:effectOptions(game,uid,choice).slice(0,choice.min).map(option=>option.id);
   append({type:'choice/resolved',choiceId:choice.id,targets});
  }
 }
 function money(){
  if(game.decks[activePlayer(game)].hand.some(card=>definition(card.cardId).type==='Treasure'))append({type:'treasures/played'});
  // Deployed Treasures can leave Actions open even after playing all money.
  if(game.turn.phase==='actions')append({type:'phase/advanced'});
 }
 const owns=(uid:string,cardId:string)=>Object.values(game.decks[uid]).flat().some(card=>card.cardId===cardId);
 for(let turn=0;turn<700;turn++){
  const uid=activePlayer(game),hand=game.decks[uid].hand;
  if(uid===actor){
   const card=hand.find(card=>card.cardId===cardId),temple=hand.find(card=>definition(card.cardId).uniqueStartingCard);
   const echoReady=(!echo&&!actionBorrow) || (actionBorrow?game.decks[other].discard.some(card=>definition(card.cardId).type==='Action'):!game.decks[other].discard.length && definition(game.decks[other].deck[0]?.cardId??'obol').type===(subject==='echo-treasure'?'Treasure':'Territory') && game.decks[other].deck.length>0);
   if(card&&!worship&&echoReady&&(!nike||hand.some(card=>card.cardId===deployTarget)))return {events,actor,trigger:{type:'action/played',instanceId:card.id}};
   if(worship && nike){
    // Build favor and consume the earlier grants through real plays. Draws may
    // find the other preparation cards, so they need not all start in hand.
    for(let prep=0;prep<3;prep++){
     const next=['temple-of-nike','rallying-cry',deployPrimer].map(id=>game.decks[uid].hand.find(card=>card.cardId===id)).find(card=>card&&canPlayAction(game,uid,card.id));
     if(!next)break;
     append({type:'action/played',instanceId:next.id});settle();
    }
    money();
    if(game.resources.coins>=3 && !game.turn.deploy?.length && game.decks[uid].play.filter(card=>definition(card.cardId).god==='Nike').length>=2 && game.decks[uid].hand.some(card=>card.cardId===deployTarget))
     return {events,actor,trigger:{type:'god/worshipped',cardId}};
   }else if(worship && temple && wanted.every(id=>hand.some(card=>card.cardId===id))){
    append({type:'action/played',instanceId:temple.id});settle();
    const action=game.decks[uid].hand.find(card=>card.cardId===wanted[0])!;
    if(canPlayAction(game,uid,action.id)){append({type:'action/played',instanceId:action.id});settle();}
    money();
    if(game.resources.coins>=3 && game.decks[uid].play.filter(card=>definition(card.cardId).god===definition(cardId).god).length>=2)
     return {events,actor,trigger:{type:'god/worshipped',cardId}};
   }else if(temple){append({type:'action/played',instanceId:temple.id});settle();}
  }
  money();
  const next=uid===actor?wanted.find(id=>!owns(uid,id)):actionBorrow&&uid===other&&!owns(uid,opponentAction)?opponentAction:undefined;
  if(next && game.supply[next] && game.resources.coins>=definition(next).cost!)append({type:'card/bought',cardId:next});
  else if(uid===actor && game.resources.coins>=3 && Object.values(game.decks[uid]).flat().filter(card=>card.cardId==='drachma').length<3)append({type:'card/bought',cardId:'drachma'});
  append({type:'turn/ended'});
 }
 throw Error('Could not prepare legal expansion scenario '+id+' ('+count+' players)');
}
