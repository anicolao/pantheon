// Experimental book frozen before validation. Base-game starting decks only.
import {policy,type Book} from './policy';
import {selectedConfig} from '../equal-turns-engine-v3/selected-policy';
export const openingBook:Book={
  "5/1": {
    "split": "5/1",
    "cards": [
      "merchant-fleet",
      null
    ]
  },
  "4/2": {
    "split": "4/2",
    "cards": [
      "harvest-feast",
      "seed-keeper"
    ]
  },
  "3/3": {
    "split": "3/3",
    "cards": [
      "drachma",
      "seed-keeper"
    ]
  }
};
export const openingEngine=policy({...selectedConfig,openingBook});
