import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {baseProfiles,historicalBaseProfiles,raceProfiles,endGameProfiles} from '../../scripts/balance/base-profiles';
import {withEndGame,defaultEndGamePolicy} from '../../scripts/balance/end-game';
import {runExperiment} from '../../scripts/balance/experiment';
test('modern defaults share one endgame policy while historical controls remain explicit',()=>{
 expect(defaultEndGamePolicy).toBe('turn-2');
 for(const p of Object.values(baseProfiles))expect(p.endGamePolicy).toBe(defaultEndGamePolicy);
 for(const p of [...Object.values(historicalBaseProfiles),...Object.values(raceProfiles),...Object.values(endGameProfiles)])expect(p.endGamePolicy).toBeUndefined();
 const base={...historicalBaseProfiles.engine,endGame:true,race:true};
 const attached=withEndGame(base,'redraw-25');
 expect(attached.endGamePolicy).toBe('redraw-25');expect(attached.endGame).toBeUndefined();expect(attached.race).toBeUndefined();
 expect(base.endGame).toBe(true);expect(base.race).toBe(true);
});
test('default profiles exactly reproduce every validated ordered parent/Thin matchup',()=>{
 for(const first of Object.keys(baseProfiles))for(const second of Object.keys(baseProfiles)){
  const saved=JSON.parse(gunzipSync(readFileSync('balance-results/shared-endgame-validation-v1/replays/0-'+first+'@turn-2-'+second+'@turn-2.json.gz')).toString());
  const next=runExperiment({...saved.options,profiles:[baseProfiles[first],baseProfiles[second]]});
  expect(next.events).toEqual(saved.events);expect(next.result).toEqual(saved.result);
 }
},180000);
