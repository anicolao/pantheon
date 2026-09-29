import {definition} from '../../src/lib/game/actions';
import {publicHorizon} from './planning';
import {racePurchase,raceGain} from './race';
import type {View} from './strategy';

/** Use the uncapped public estimate; never force an early investment cutoff. */
export const endGameActive=(view:View)=>publicHorizon(view)<=2;
const points=(id:string)=>(definition(id).vp??0)>0;
export const endGamePurchase=(view:View)=>endGameActive(view)?racePurchase(view,points):undefined;
export const endGameGain=(view:View,legal:string[])=>endGameActive(view)?raceGain(view,legal,points):undefined;
