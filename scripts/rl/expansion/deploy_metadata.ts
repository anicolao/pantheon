import {deployQueueSignature,deployQueueKeys} from './deploy_schema';
import {featureKeys,slots} from './schema';
console.log(JSON.stringify({schema:deployQueueSignature,baseFeatures:featureKeys.length,features:featureKeys.length+deployQueueKeys.length,actions:slots.length}));
