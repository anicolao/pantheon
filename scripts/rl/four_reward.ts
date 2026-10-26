/** Research reward only; never changes game rules or reported win shares. */
export type FourReward={kind:'round-discounted-win';discount:number}|{kind:'score-margin';scale:number;winWeight:number};
export function validateFourReward(value:unknown):FourReward|undefined{
 if(value===undefined)return undefined;
 const v=value as FourReward;
 if(v?.kind==='round-discounted-win'&&Number.isFinite(v.discount)&&v.discount>0&&v.discount<=1)return {kind:v.kind,discount:v.discount};
 if(v?.kind==='score-margin'&&Number.isFinite(v.scale)&&v.scale>0&&Number.isFinite(v.winWeight)&&v.winWeight>=0&&v.winWeight<=1)return {kind:v.kind,scale:v.scale,winWeight:v.winWeight};
 throw Error('Invalid four-player reward');
}
export function fourReward(share:number,rounds:number,reward?:FourReward,margin?:number){
 if(!Number.isFinite(share)||share<0||share>1||!Number.isInteger(rounds)||rounds<1)throw Error('Invalid terminal reward inputs');
 if(reward?.kind==='score-margin'){
  if(!Number.isFinite(margin))throw Error('Score-margin reward needs terminal score margin');
  return reward.winWeight*share+(1-reward.winWeight)*(.5+.5*Math.tanh(margin!/reward.scale));
 }
 return reward?share*Math.pow(reward.discount,rounds-1):2*share-1;
}
