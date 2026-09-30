// Accepted baseline plus validated P2-only improvement; original ties and equal turns.
import {selectedConfig as baseline} from '../engine-p2-search/baseline';
import {policy,type Config} from '../engine-p2-search/policy';
export const selectedConfig:Config={...baseline,p2Patch:{extraTalent:true}};
export const selectedEngine=policy(selectedConfig);
