// Frozen control for P2 search: original ties, equal turns, fixed book, both improvements, P1 guard.
import {selectedConfig as prior} from '../equal-turns-engine-v3/selected-policy';
import {openingBook} from '../engine-opening-book/candidate-book';
import {policy,type Config} from '../engine-discard/policy';
export const selectedConfig:Config={...prior,openingBook,lookaheadDiscard:true,payload:0,replyMargin:1};
export const selectedEngine=policy(selectedConfig);
