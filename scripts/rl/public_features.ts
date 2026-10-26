/** Versioned research observation. Opponent inventories come ONLY from public gains/trashes. */
import {cards} from '../../src/lib/game/cards';
import {activePlayer,definition,devotionCards,worshipReason} from '../../src/lib/game/actions';
import type {SetupState} from '../../src/lib/game/setup';
import type {BotTracker} from '../../src/lib/bots/session';
import type {StandardView} from '../../standard-matrix/policy';
import {deckIds,eventIds,observation,schemaSignature} from '../../src/lib/bots/rl-schema';

export type PublicObservationKind='public-v1'|'zero-public-v1';
const leaders=['melia','nereon','thaleia','doreios'];
const kinds=['resource','draw','trash','discard','gain','reveal'];
const resources=['actions','coins','buys','worship'];
const sourceIds=cards.map(c=>c.id);
export const maxPublicQueue=5;
export const extraFeatureNames=[
 'playerCount',...leaders.map(l=>`self.leader.${l}`),...[0,1,2,3].map(i=>`self.turnPosition.${i}`),
 ...[1,2,3].flatMap(i=>[
  `opponent${i}.present`,...leaders.map(l=>`opponent${i}.leader.${l}`),...[0,1,2,3].map(p=>`opponent${i}.turnPosition.${p}`),
  ...['alreadyPlayedThisRound','turns','score','handCount','drawPileCount','discardCount'].map(k=>`opponent${i}.${k}`),
  ...deckIds.map(id=>`opponent${i}.publicInventory.${id}`),
 ]),
 ...Array.from({length:maxPublicQueue},(_,i)=>[
  `queue${i}.present`,...kinds.map(k=>`queue${i}.kind.${k}`),...resources.map(k=>`queue${i}.resource.${k}`),
  ...sourceIds.map(id=>`queue${i}.source.${id}`),...deckIds.map(id=>`queue${i}.fixedGain.${id}`),
  ...['amount','limit','forge','offeringSum','offeringAmount','actionOnly','topdeck','optional'].map(k=>`queue${i}.${k}`),
 ]).flat(),
 ...eventIds.flatMap(id=>['present','devotion','favored','affordable','worshipAvailable','executable'].map(k=>`worship.${id}.${k}`)),
];
export const publicObservationSize=171+extraFeatureNames.length;
export const publicSchemaSignature=(kind:PublicObservationKind)=>JSON.stringify({base:schemaSignature,kind,extraFeatureNames,opponentOrder:'cyclic future turn order from current player',inventory:'starting inventory plus public acquisitions minus public trashes',normalizationVersion:1});

export function publicObservation(game:SetupState,tracker:BotTracker,view:StandardView,kind:PublicObservationKind):number[]{
 const base=observation(view);
 if(kind==='zero-public-v1')return [...base,...extraFeatureNames.map(()=>0)];
 const uid=activePlayer(game),position=game.turnOrder.indexOf(uid),order=game.turnOrder;
 const extra:number[]=[game.playerCount/4,...leaders.map(l=>Number(game.leaders[uid]===l)),...[0,1,2,3].map(i=>Number(position===i))];
 for(let distance=1;distance<=3;distance++){
  const other=distance<order.length?order[(position+distance)%order.length]:undefined;
  const index=other?order.indexOf(other):-1,inventory=other?tracker.inventory[other]:{};
  const score=Object.entries(inventory).reduce((n,[id,count])=>n+count*(definition(id).vp??0),0);
  // Only lengths of private zones are read. No card identity or ordering crosses this boundary.
  extra.push(Number(!!other),...leaders.map(l=>Number(!!other&&game.leaders[other]===l)),...[0,1,2,3].map(i=>Number(index===i)),
   Number(!!other&&index<position),other?(game.turn.turns[other]??0)/50:0,score/50,
   other?game.decks[other].hand.length/20:0,other?game.decks[other].deck.length/30:0,other?game.decks[other].discard.length/30:0,
   ...deckIds.map(id=>(inventory[id]??0)/10));
 }
 if(game.turn.queue.length>maxPublicQueue)throw Error('Public observation queue exceeds versioned schema');
 for(let i=0;i<maxPublicQueue;i++){
  const e=game.turn.queue[i];
  extra.push(Number(!!e),...kinds.map(k=>Number(e?.kind===k)),...resources.map(k=>Number(e?.kind==='resource'&&e.resource===k)),
   ...sourceIds.map(id=>Number(e?.source===id)),...deckIds.map(id=>Number(e?.kind==='gain'&&e.cardId===id)),
   e&&'amount'in e?e.amount/10:0,e?.kind==='gain'?e.limit/10:0,
   Number(!!e&&'forge'in e&&e.forge),Number(!!e&&'offering'in e&&e.offering==='sum'),e&&'offering'in e&&typeof e.offering==='number'?e.offering/3:0,
   Number(e?.kind==='gain'&&!!e.actionOnly),Number(e?.kind==='gain'&&!!e.topdeck),Number(e?.kind==='gain'&&!!e.optional));
 }
 for(const id of eventIds){
  const devotion=devotionCards(game,uid,id).length;
  extra.push(Number(game.sharedEvents.includes(id)),devotion/4,Number(devotion>=2),Number(game.resources.coins>=definition(id).cost!),Number(game.resources.worship>0),Number(worshipReason(game,uid,id)===''));
 }
 if(extra.length!==extraFeatureNames.length||extra.some(n=>!Number.isFinite(n)))throw Error('Invalid public feature vector');
 return [...base,...extra];
}
