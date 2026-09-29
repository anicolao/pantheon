import {test,expect} from 'bun:test';
import {setupExperiment,runExperiment} from '../../scripts/balance/experiment';
import {activePlayer} from '../../src/lib/game/actions';
import {inventoryAtSetup,strategyView,strategyCommand} from '../../scripts/balance/strategy';
import {baseProfiles,v15BaseProfiles} from '../../scripts/balance/base-profiles';
import {rolloutEstimate,sampledValue,sampledAfter,resourceDominates,rolloutPlay} from '../../scripts/balance/sampled';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
function view(){
 const {game}=setupExperiment('effective-test',['thaleia','nereon'],'base-game');
 const v=strategyView(game,activePlayer(game),inventoryAtSetup(game,'base-game'),undefined,'base-game');
 v.phase='buys';v.resources={actions:0,coins:6,buys:1,worship:0};v.endGamePolicy='turn-2';return v;
}
test('all card types still sample; excess income is capped by actual scoring capacity',()=>{
 const v=view();v.owned={talent:5};const r=rolloutEstimate(v);
 expect(r.samples).toBe(64);expect(r.coins).toBe(45);expect(r.income).toBe(24);
 expect(r.balanced).toBe(36);expect(r.reliable).toBe(48);
 expect(r.fullDeckRate).toBe(1);expect(r.fundedCoverage).toBe(3);
});
test('Engine rewards funding a working draw chain rather than more empty draw',()=>{
 const v=view();v.owned={obol:6,hamlet:3,'harbor-pilot':2,'council-of-sages':3,'sacred-academy':4};
 for(const samplingPolicy of ['income','balanced','reliable'] as const){
  const p={...baseProfiles.engine,samplingPolicy};
  expect(sampledAfter(v,p,'talent')).toBeGreaterThan(sampledAfter(v,p,'oracles-acolyte'));
 }
});
test('resource dominance is effect-based and disabled where leader triggers matter',()=>{
 const v=view();expect(resourceDominates(v,'drachma','bronze-recruit')).toBe(true);
 expect(resourceDominates(v,'bronze-recruit','drachma')).toBe(false);
 expect(resourceDominates(v,'drachma','council-of-sages')).toBe(false);
 expect(resourceDominates({...v,variant:'standard'},'drachma','bronze-recruit')).toBe(false);
});
test('shared play takes usable income over a weaker terminal draw while preserving chains',()=>{
 const v=view();v.phase='actions';v.resources.actions=1;
 v.owned={obol:1,hamlet:15,'bronze-recruit':1,'council-of-sages':1};
 v.hand=[{id:'coin',cardId:'bronze-recruit',copy:1},{id:'draw',cardId:'council-of-sages',copy:1}];
 expect(rolloutPlay(v,false)).toMatchObject({instanceId:'coin'});
 v.hand.push({id:'support',cardId:'harbor-pilot',copy:1});v.owned['harbor-pilot']=1;
 expect(rolloutPlay(v,false)).toMatchObject({instanceId:'support'});
});
test('v15 controls exactly retain saved sampled behavior',()=>{
 for(const first of ['treasure','engine']){
  const saved=JSON.parse(gunzipSync(readFileSync('balance-results/shuffle-three-evaluation-v1/replays/0-'+first+'@new-'+first+'@old.json.gz')).toString());
  expect(runExperiment(saved.options)).toEqual({result:saved.result,events:saved.events});
 }
},180000);

test('stratification samples every opening position, including pure Treasure candidates',()=>{
 const v=view();v.owned={obol:6,hamlet:4};
 const e=rolloutEstimate(v,v.owned,false,'stratified');
 expect(e.samples).toBe(80);expect(e.perTurn[0].coins).toBe(3);expect(e.perTurn[0].draws).toBe(5);
 const owned={...v.owned,drachma:1},next=rolloutEstimate(v,owned,false,'stratified');
 expect(next.samples).toBe(88);expect(next.perTurn[0].coins).toBeCloseTo(40/11,10);
});
