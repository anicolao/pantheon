import {allLeaderIds,replaySetup} from '../game/setup';
import {definition} from '../game/actions';
import {freshTable,edges,begin,seatUid,type Tabletop} from '../tabletop/table';
export function expansionTable(leaders:string[],humanFirst:boolean,seed:string):Tabletop {
 if(leaders.length<2||leaders.length>4||new Set(leaders).size!==leaders.length||leaders.some(l=>!allLeaderIds.includes(l as typeof allLeaderIds[number])))throw Error('Choose a different leader for each player.');
 const unused=allLeaderIds.filter(l=>!leaders.includes(l));
 let table=freshTable(true);
 table={...table,seats:table.seats.map((seat,i)=>({...seat,leader:(leaders[i]??unused.shift()!) as typeof seat.leader,mode:i>=leaders.length?'empty':i===0?'human':'bot',joined:i<leaders.length?i+1:0,...(i>0&&i<leaders.length?{botKind:'expansion-rl' as const}:{})}))};
 table=begin(table,seed,seatUid(humanFirst?edges[0]:edges[1]));
 const names=Object.fromEntries(table.seats.map(s=>[seatUid(s.edge),s.edge==='south'?'You':definition(s.leader).name.split(',')[0]]));
 table={...table,events:table.events.map(e=>({...e,name:names[e.actorUid]}))};
 replaySetup(table.events);return table;
}
