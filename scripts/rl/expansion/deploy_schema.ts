/** Research-only learner features; frozen opponents keep their original schema. */
import {schemaSignature as baseSignature} from './schema';
export const deployQueueKeys=[...Array.from({length:32},(_,i)=>`deploy-queue:${i}`),'deploy-queue:length',...['1','2','3'].map(n=>`deploy-queue:count:${n}`),'deploy-queue:resolutions'];
export function deployQueueFeatures(queue:readonly number[]){
 return [...Array.from({length:32},(_,i)=>(queue[i]??0)/4),queue.length/16,...[1,2,3].map(n=>queue.filter(value=>value===n).length/16),queue.reduce((sum,n)=>sum+n,0)/32];
}
const base=JSON.parse(baseSignature);
export const deployQueueSignature=JSON.stringify({...base,version:'expansion-deploy-queue-v1',featureKeys:[...base.featureKeys,...deployQueueKeys]});
