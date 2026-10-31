import type {StandardView} from '../../../../standard-matrix/policy';
import type {ActionCommand} from '../../game/actions';
export type ThinRule={floor:number;protect:number[];stopSupply:number};
/** Candidate teacher override: use an otherwise skipped Doreios free trash. */
export function thinOverride(view:StandardView,base:ActionCommand,rule:ThinRule):ActionCommand{
 if(view.leader!=='doreios'||view.choice?.kind!=='trash'||view.choice.source!=='doreios'||base.type!=='choice/resolved'||base.targets.length||view.finalRound||view.supply.acropolis<=rule.stopSupply)return base;
 const obol=view.hand.find(c=>c.cardId==='obol');
 if(!obol||view.hand.some(c=>c.cardId==='hamlet'))return base;
 const money=(view.owned.obol??0)+2*(view.owned.drachma??0)+3*(view.owned.talent??0);
 if(money-1<rule.floor)return base;
 const cash=view.resources.coins+view.hand.reduce((s,c)=>s+(c.cardId==='obol'?1:c.cardId==='drachma'?2:c.cardId==='talent'?3:0),0);
 if(rule.protect.includes(cash))return base;
 return {type:'choice/resolved',choiceId:view.choice.id,targets:[obol.id]};
}
