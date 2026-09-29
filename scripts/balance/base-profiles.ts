import {withEndGame} from './end-game';
import {candidates,type Profile} from './strategy';
export const historicalBaseProfiles: Record<string,Profile> = {
 treasure:{family:'treasure',parameters:candidates[0],thinning:false},
 'treasure-thin':{family:'treasure',parameters:candidates[0],thinning:true},
 engine:{family:'engine',parameters:candidates[0],thinning:false},
 'engine-thin':{family:'engine',parameters:candidates[0],thinning:true}
};
export const v14BaseProfiles:Record<string,Profile>=Object.fromEntries(Object.entries(historicalBaseProfiles).map(([key,p])=>[key,withEndGame(p)]));
export const v15BaseProfiles:Record<string,Profile>=Object.fromEntries(Object.entries(v14BaseProfiles).map(([key,p])=>[key,{...p,evaluation:'shuffle-3'}]));
export const baseProfiles:Record<string,Profile>=Object.fromEntries(Object.entries(v14BaseProfiles).map(([key,p])=>[key,{...p,evaluation:'shuffle-effective',samplingPolicy:'balanced',samplingMethod:'stratified'}]));
export const raceProfiles:Record<string,Profile>=Object.fromEntries(
 Object.entries(historicalBaseProfiles).flatMap(([key,p])=>[[key,{...p,race:false}],[key+'-race',{...p,race:true}]]));
export const endGameProfiles:Record<string,Profile>=Object.fromEntries(
 Object.entries(historicalBaseProfiles).filter(([,p])=>p.family==='treasure').flatMap(([key,p])=>[[key,{...p,endGame:false}],[key+'-endgame',{...p,endGame:true}]]));
export const engineEndGameProfiles:Record<string,Profile>=Object.fromEntries(
 Object.entries(historicalBaseProfiles).filter(([,p])=>p.family==='engine').flatMap(([key,p])=>[[key,{...p,endGame:false}],[key+'-endgame',{...p,endGame:true}]]));
export const baseLabel=(key:string)=>({treasure:'Big Money','treasure-thin':'Big Money + Thin',engine:'Engine','engine-thin':'Engine + Thin'}[key.replace(/-(race|endgame)$/,'')]??key)+(key.endsWith('-race')?' + Race':key.endsWith('-endgame')?' + End Game':'');
