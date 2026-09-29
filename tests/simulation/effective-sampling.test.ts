import {test,expect} from 'bun:test';
import {setupExperiment,runExperiment} from '../../scripts/balance/experiment';
import {activePlayer} from '../../src/lib/game/actions';
import {inventoryAtSetup,strategyView,strategyCommand} from '../../scripts/balance/strategy';
import {baseProfiles,v15BaseProfiles} from '../../scripts/balance/base-profiles';
import {rolloutEstimate,sampledValue,sampledAfter,resourceDominates,rolloutPlay,objectivePointScale} from '../../scripts/balance/sampled';
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
 expect(resourceDominates(v,'drachma','sea-trade')).toBe(false); // Different costs can matter to upgrades.
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

test('skip mandatory discard for an empty draw without suppressing possible leader triggers',()=>{
 const v=view();v.phase='actions';v.resources.actions=1;
 v.owned={obol:2,'harvest-feast':1};v.play=[];
 v.hand=[{id:'a',cardId:'harvest-feast',copy:0},{id:'b',cardId:'obol',copy:0},{id:'c',cardId:'obol',copy:1}];
 expect(rolloutPlay(v,false)).toEqual({type:'phase/advanced'});
 expect(rolloutPlay({...v,variant:'standard'},false)).toMatchObject({type:'action/played'});
});
test('productive thinning can take a terminal slot and its payoff appears after reshuffling',()=>{
 const v=view();v.phase='actions';v.resources.actions=1;
 v.owned={...v.owned,'seed-keeper':1,'council-of-sages':1};
 v.hand=[{id:'t',cardId:'seed-keeper',copy:0},{id:'d',cardId:'council-of-sages',copy:0},{id:'j',cardId:'hamlet',copy:0}];
 expect(rolloutPlay(v,true)).toMatchObject({instanceId:'t'});
 expect(rolloutPlay(v,false)).toMatchObject({instanceId:'d'});
 const r=rolloutEstimate(v,{obol:6,hamlet:3,'temple-of-athena':1,'seed-keeper':1},true,'stratified');
 expect(r.lateBalanced).toBeGreaterThan(r.balanced);
});
test('projected optional thinning preserves valuable points',()=>{
 const v=view();v.phase='actions';
 v.hand=[{id:'p',cardId:'acropolis',copy:0}];v.owned={acropolis:1};
 v.choice={id:'trash',kind:'trash',source:'seed-keeper',min:0,max:2};
 expect(rolloutPlay(v,true)).toMatchObject({targets:[]});
});

test('point costs are calibrated for each objective rather than added to arbitrary units',()=>{
 const v=view();
 const money={...baseProfiles.treasure,samplingPolicy:'balanced' as const};
 const engine={...baseProfiles.engine,samplingPolicy:'balanced' as const};
 // The same fully funded turn has greater Engine utility, not more victory points.
 expect(objectivePointScale(v,money)).toBe(0.5);
 expect(objectivePointScale(v,engine)).toBe(0.3);
 expect(objectivePointScale(v,{...engine,samplingPolicy:'coverage'})).toBeLessThan(objectivePointScale(v,engine));
});
