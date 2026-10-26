/** Research-only public-state preference adapter. Zero parameters preserve the actor exactly. */
import type {StandardView} from '../../standard-matrix/policy';
import {actionEffects,definition} from '../../src/lib/game/actions';
import {slots,commands} from '../../src/lib/bots/rl-schema';
export const preferenceFeatures=['constant','turn','coins','heldTreasureCash','ownedCash','ownedDraw','actionBalance','scoreGap','acropolisRemaining'];
const buys=['drachma','talent','council-of-sages','harbor-pilot','sacred-academy','sacred-grove','polis','acropolis'];
const worships=['counsel-of-olympus','tribute-of-the-tides','blessing-of-the-fields','trial-of-the-spear'];
const plays=['council-of-sages','harbor-pilot','sacred-academy','sacred-grove','bronze-recruit','harvest-feast'];
export const preferenceGenes=[...buys.flatMap(id=>preferenceFeatures.map(feature=>({kind:'buyGain',id,feature}))),...worships.flatMap(id=>preferenceFeatures.map(feature=>({kind:'worship',id,feature}))),...['hamlet','obol'].flatMap(id=>preferenceFeatures.map(feature=>({kind:'trash',id,feature}))),...plays.map(id=>({kind:'play',id,feature:'constant'}))];
const cardFacts=new Map<string,{cash:number;draw:number;actions:number}>();
function facts(id:string){
 let f=cardFacts.get(id);if(f)return f;
 const effects=definition(id).type==='Action'?actionEffects(id):[];
 f={cash:({obol:1,drachma:2,talent:3} as Record<string,number>)[id]??0,draw:0,actions:0};
 for(const e of effects){if(e.kind==='resource'&&e.resource==='coins')f.cash+=e.amount;if(e.kind==='resource'&&e.resource==='actions')f.actions+=e.amount;if(e.kind==='draw')f.draw+=e.amount;}
 cardFacts.set(id,f);return f;
}
export function preferenceVector(v:StandardView){
 let cash=0,draw=0,balance=1;
 for(const [id,n] of Object.entries(v.owned)){const f=facts(id);cash+=n*f.cash;draw+=n*f.draw;if(definition(id).type==='Action')balance+=n*(f.actions-1);}
 const values=[1,v.myTurns/12,(v.choice?.kind==='gain'?v.choice.limit??0:v.resources.coins)/10,v.hand.reduce((n,c)=>n+(({obol:1,drachma:2,talent:3} as Record<string,number>)[c.cardId]??0),0)/10,cash/16,draw/8,balance/4,(Math.max(...v.scores)-v.myScore)/20,(v.supply.acropolis??0)/12];
 if(values.some(x=>!Number.isFinite(x)))throw Error('Invalid preference features');
 return values.map(x=>Math.max(-2,Math.min(2,x)));
}
export function preferenceAction(v:StandardView,logits:ArrayLike<number>,parameters:number[]){
 if(parameters.length!==preferenceGenes.length||parameters.some(x=>!Number.isFinite(x)))throw Error('Invalid preference parameters');
 const features=preferenceVector(v),weights=new Map<string,number>();
 for(let j=0;j<preferenceGenes.length;j++){const g=preferenceGenes[j],key=g.kind+':'+g.id;weights.set(key,(weights.get(key)??0)+parameters[j]*features[preferenceFeatures.indexOf(g.feature)]);}
 const choices=commands(v);let best=-1,bestValue=-Infinity;
 for(let i=0;i<choices.length;i++){
  if(!choices[i])continue;const s=slots[i];let offset=0;
  if(s.kind==='buy'||s.kind==='gain')offset=weights.get('buyGain:'+s.ids[0])??0;
  else if(s.kind==='worship')offset=weights.get('worship:'+s.ids[0])??0;
  else if(s.kind==='play')offset=weights.get('play:'+s.ids[0])??0;
  else if(s.kind==='select'&&v.choice?.kind==='trash')for(const id of s.ids)offset+=weights.get('trash:'+id)??0;
  const value=logits[i]+offset;if(!Number.isFinite(value))throw Error('Nonfinite preference score');
  if(value>bestValue){best=i;bestValue=value;}
 }
 if(best<0)throw Error('No legal preference action');return best;
}
