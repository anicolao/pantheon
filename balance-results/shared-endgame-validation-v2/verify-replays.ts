import {readdirSync,readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {replayExperiment} from '../../scripts/balance/experiment';
import {standings} from '../../src/lib/game/actions';
const dir=process.argv[2];let checked=0;
for(const file of readdirSync(dir+'/replays')){
 const saved=JSON.parse(gunzipSync(readFileSync(dir+'/replays/'+file)).toString());
 const game=replayExperiment(saved.events,saved.options);
 if(game.turn.phase!=='finished')throw Error('Unfinished replay');
 const rows=standings(game),winners=rows.filter(r=>r.winner).length;
 for(const p of saved.result.players){
  const row=rows.find(r=>r.uid===p.uid)!;
  if(row.score!==p.score||row.turns!==p.turns||(row.winner?1/winners:0)!==p.share)throw Error('Standings differ: '+file);
  const expected:Record<string,number>={obol:6,hamlet:3,'temple-of-athena':1};
  for(const[id,n]of Object.entries(p.telemetry.acquisitions) as [string,number][])expected[id]=(expected[id]??0)+n;
  for(const[id,n]of Object.entries(p.telemetry.trashes) as [string,number][])expected[id]=(expected[id]??0)-n;
  const actual:Record<string,number>={};
  for(const card of Object.values(game.decks[p.uid]).flat())actual[card.cardId]=(actual[card.cardId]??0)+1;
  for(const id of new Set([...Object.keys(actual),...Object.keys(expected)]))if((actual[id]??0)!==(expected[id]??0))throw Error('Inventory mismatch');
 }
 checked++;
}
console.log('Verified exact scores, turns, shares and ending cards in '+checked+' replays');
