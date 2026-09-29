import {candidates,type Profile} from './strategy';
export const baseProfiles: Record<string,Profile> = {
 treasure:{family:'treasure',parameters:candidates[0],thinning:false},
 'treasure-thin':{family:'treasure',parameters:candidates[0],thinning:true},
 engine:{family:'engine',parameters:candidates[0],thinning:false},
 'engine-thin':{family:'engine',parameters:candidates[0],thinning:true}
};
export const raceProfiles:Record<string,Profile>=Object.fromEntries(
 Object.entries(baseProfiles).flatMap(([key,p])=>[[key,{...p,race:false}],[key+'-race',{...p,race:true}]]));
export const endGameProfiles:Record<string,Profile>=Object.fromEntries(
 Object.entries(baseProfiles).filter(([,p])=>p.family==='treasure').flatMap(([key,p])=>[[key,{...p,endGame:false}],[key+'-endgame',{...p,endGame:true}]]));
export const engineEndGameProfiles:Record<string,Profile>=Object.fromEntries(
 Object.entries(baseProfiles).filter(([,p])=>p.family==='engine').flatMap(([key,p])=>[[key,{...p,endGame:false}],[key+'-endgame',{...p,endGame:true}]]));
export const baseLabel=(key:string)=>({treasure:'Big Money','treasure-thin':'Big Money + Thin',engine:'Engine','engine-thin':'Engine + Thin'}[key.replace(/-(race|endgame)$/,'')]??key)+(key.endsWith('-race')?' + Race':key.endsWith('-endgame')?' + End Game':'');
