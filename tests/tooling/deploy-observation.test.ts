import {test,expect} from 'bun:test';
import {deployQueueFeatures,deployQueueKeys,deployQueueSignature} from '../../scripts/rl/expansion/deploy_schema';
import {featureKeys} from '../../scripts/rl/expansion/schema';
test('queue observations distinguish future grants without changing the legacy prefix',()=>{
 expect(deployQueueFeatures([1,2,3])).not.toEqual(deployQueueFeatures([1,3,2]));
 expect(deployQueueFeatures([])).toEqual(Array(deployQueueKeys.length).fill(0));
 expect(JSON.parse(deployQueueSignature).featureKeys.slice(0,featureKeys.length)).toEqual(featureKeys);
});
test('long queues retain total grant and resolution counts beyond the ordered prefix',()=>{
 const queue=Array(40).fill(3),features=deployQueueFeatures(queue);
 expect(features).toHaveLength(deployQueueKeys.length);
 expect(features[32]).toBe(40/16);
 expect(features[35]).toBe(40/16);
 expect(features[36]).toBe(120/32);
});
