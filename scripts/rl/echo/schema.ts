/** Echo/Zeus curriculum v1. Never changes the deployed, frozen model schema. */
import {observation as legacyObservation,slots as legacySlots} from '../../../src/lib/bots/rl-schema';
import type {StandardView} from '../../../standard-matrix/policy';
import {gameCards} from '../../../src/lib/game/cards';
import {activePlayer,canPlayAction,canPlayTreasure,definition,effectOptions,eligibleGains,purchaseReason,worshipReason,standings,type ActionCommand} from '../../../src/lib/game/actions';
import type {SetupState,CardInstance} from '../../../src/lib/game/setup';
export const leaders=['echo','thaleia','nereon','melia','doreios'];
export const cards=gameCards.filter(c=>!['Hermes','Nike','Hades'].includes(c.god));
export const deckIds=cards.filter(c=>!['Leader','Event'].includes(c.type)).map(c=>c.id);
export const eventIds=cards.filter(c=>c.type==='Event').map(c=>c.id);
type Slot={kind:string;ids:string[];opponent?:number};
export const slots:Slot[]=[...['play','buy','gain'].flatMap(kind=>deckIds.map(id=>({kind,ids:[id]}))),
 {kind:'select',ids:[]},...deckIds.map(id=>({kind:'select',ids:[id]})),
 ...deckIds.flatMap((id,i)=>deckIds.slice(i).map(other=>({kind:'select',ids:[id,other]}))),
 ...[0,1,2].flatMap(opponent=>[...deckIds,'deck'].map(id=>({kind:'echo',ids:[id],opponent}))),
 ...eventIds.map(id=>({kind:'worship',ids:[id]})),...['advance','end','all'].map(kind=>({kind,ids:[]}))];
export const schemaSignature=JSON.stringify({version:'echo-v1',leaders,deckIds,eventIds,slots,legacyPrefix:171,features:'own-hand;supply;four-public-inventories-discards-plays-leaders-counts;resources;choice;phase'});
export const counts=(zone:CardInstance[])=>deckIds.map(id=>zone.filter(c=>c.cardId===id).length/10);
export function opponents(g:SetupState,uid:string){const i=g.turnOrder.indexOf(uid);return g.turnOrder.slice(i+1).concat(g.turnOrder.slice(0,i));}
/** Card inventory is publicly reconstructible from starting decks, gains, trash and ownership transfers. No zone/order information from hidden cards enters these counts. */
export function inventory(g:SetupState,uid:string){return Object.entries(g.decks).flatMap(([holder,zones])=>Object.values(zones).flat().filter(c=>(c.ownerUid??holder)===uid));}
export function observation(g:SetupState,uid=activePlayer(g)){
 const own=g.decks[uid],choice=g.turn.choice,score=standings(g);
 // Compatibility prefix reads only the exact public fields consumed by the frozen feature encoder.
 const owned=Object.fromEntries(deckIds.map(id=>[id,inventory(g,uid).filter(c=>c.cardId===id).length]));
 const legacy=legacyObservation({hand:own.hand,play:own.play,discard:own.discard,owned,supply:g.supply,events:g.sharedEvents,phase:g.turn.phase,choice,
 resources:g.resources,myScore:score.find(r=>r.uid===uid)!.score,scores:score.filter(r=>r.uid!==uid).map(r=>r.score),myTurns:g.turn.turns[uid]??0,
 opposingTurns:opponents(g,uid).map(id=>g.turn.turns[id]??0),leaderUsed:g.turn.leaderUsed,finalRound:g.turn.finalRound,equalTurns:g.turn.equalTurns,
 playersAfter:g.turnOrder.length-1-g.turnOrder.indexOf(uid),drawPileCount:own.deck.length} as unknown as StandardView);
 return [...legacy,...counts(own.hand),...deckIds.map(id=>(g.supply[id]??0)/40),...eventIds.map(id=>Number(g.sharedEvents.includes(id))),
 ...[uid,...opponents(g,uid)].flatMap(id=>[...counts(inventory(g,id)),...counts(g.decks[id].discard),...counts(g.decks[id].play),
 ...leaders.map(l=>Number(g.leaders[id]===l)),g.decks[id].hand.length/30,g.decks[id].deck.length/30,(g.turn.turns[id]??0)/50,(score.find(x=>x.uid===id)?.score??0)/50]),
 ...['actions','treasures','buys'].map(p=>Number(g.turn.phase===p)),...['trash','discard','gain','echo'].map(k=>Number(choice?.kind===k)),
 ...cards.map(c=>Number(choice?.source===c.id)),g.resources.actions/10,g.resources.coins/20,g.resources.buys/5,g.resources.worship/5,
 Number(g.turn.leaderUsed),Number(!!g.turn.finalRound),(choice?.min??0)/2,(choice?.max??0)/2,(choice?.limit??0)/10,
 choice?.offering==='sum'?1:typeof choice?.offering==='number'?choice.offering/3:0,Number(!!choice?.forge),Number(!!choice?.actionOnly),Number(!!choice?.topdeck)];
}
export function commands(g:SetupState,uid=activePlayer(g)):(ActionCommand|undefined)[]{
 if(g.turn.phase==='finished')return slots.map(()=>undefined);
 const hand=g.decks[uid].hand,c=g.turn.choice,others=opponents(g,uid);
 const options=c?effectOptions(g,uid,c):[],gains=c?.kind==='gain'?new Set(eligibleGains(g,c.limit!,c.actionOnly).map(x=>x.id)):new Set<string>();
 return slots.map(s=>{
  const id=s.ids[0];
  if(c){
   if(s.kind==='select'&&!s.ids.length&&c.min===0)return {type:'choice/resolved',choiceId:c.id,targets:[]};
   if(c.kind==='gain')return s.kind==='gain'&&gains.has(id)?{type:'choice/resolved',choiceId:c.id,targets:[id]}:undefined;
   if(c.kind==='echo'){
    if(s.kind!=='echo')return;
    const option=options.find(o=>o.uid===others[s.opponent!]&&(id==='deck'?!o.card:o.card?.cardId===id));
    return option?{type:'choice/resolved',choiceId:c.id,targets:[option.id]}:undefined;
   }
   if(!['trash','discard'].includes(c.kind))throw Error('Unexpected house in Echo curriculum');
   if(s.kind!=='select'||s.ids.length<c.min||s.ids.length>c.max)return;
   const remaining=[...options],targets:string[]=[];
   for(const cardId of s.ids){const i=remaining.findIndex(o=>o.card?.cardId===cardId);if(i<0)return;targets.push(remaining.splice(i,1)[0].id);}
   return {type:'choice/resolved',choiceId:c.id,targets};
  }
  if(s.kind==='play'){
   const card=hand.find(c=>c.cardId===id);if(!card)return;
   if(canPlayAction(g,uid,card.id))return {type:'action/played',instanceId:card.id};
   if(canPlayTreasure(g,uid,card.id))return {type:'treasure/played',instanceId:card.id};
  }
  if(s.kind==='buy'&&!purchaseReason(g,uid,id))return {type:'card/bought',cardId:id};
  if(s.kind==='worship'&&!worshipReason(g,uid,id))return {type:'god/worshipped',cardId:id};
  if(s.kind==='advance'&&g.turn.phase!=='buys')return {type:'phase/advanced'};
  if(s.kind==='end'&&g.turn.phase!=='actions')return {type:'turn/ended'};
  if(s.kind==='all'&&hand.some(c=>canPlayTreasure(g,uid,c.id)))return {type:'treasures/played'};
 });
}

export const legacyActionMap=legacySlots.map(slot=>slots.findIndex(s=>JSON.stringify(s)===JSON.stringify(slot)));
