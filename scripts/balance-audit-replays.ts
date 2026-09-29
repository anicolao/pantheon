import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deepStrictEqual,equal} from 'node:assert/strict';
import {replayExperiment} from './balance/experiment';
import {standings} from '../src/lib/game/actions';
for(const dir of process.argv.slice(2)){
 let traces=0;
 for(const file of readdirSync(dir+'/replays')){
  const saved=JSON.parse(gunzipSync(readFileSync(dir+'/replays/'+file)).toString());
  const game=replayExperiment(saved.events,saved.options);equal(game.turn.phase,'finished');
  for(const p of saved.result.players){
   const standing=standings(game).find(s=>s.uid===p.uid)!;equal(standing.score,p.score);equal(standing.turns,p.turns);equal(p.share,standing.winner?1/standings(game).filter(s=>s.winner).length:0);
   const expected:Record<string,number>={obol:6,hamlet:3,'temple-of-athena':1};
   for(const [id,n] of Object.entries(p.telemetry.acquisitions))expected[id]=(expected[id]??0)+Number(n);
   for(const [id,n] of Object.entries(p.telemetry.trashes))expected[id]=(expected[id]??0)-Number(n);
   const actual:Record<string,number>={};for(const c of Object.values(game.decks[p.uid]).flat())actual[c.cardId]=(actual[c.cardId]??0)+1;
   deepStrictEqual(Object.fromEntries(Object.entries(expected).filter(([,n])=>n)),actual);
  }
  traces++;
 }
 const audit={traces,failures:0,checks:['legal event replay','finished state','scores','completed turns','winner shares','every final inventory']};
 writeFileSync(dir+'/replay-audit.json',JSON.stringify(audit,null,2)+'\n');console.log(dir,traces);
}

