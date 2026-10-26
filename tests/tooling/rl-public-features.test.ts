import {expect,test} from 'bun:test';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {FourEnvironment} from '../../scripts/rl/four_environment';
import {extraFeatureNames,publicObservation,publicObservationSize,maxPublicQueue} from '../../scripts/rl/public_features';
import {observation,eventIds,deckIds} from '../../src/lib/bots/rl-schema';
import {activePlayer,actionEffects,leaderEffects,definition} from '../../src/lib/game/actions';

function fixture(run:(env:FourEnvironment)=>void){
 const dir=mkdtempSync(join(tmpdir(),'public-rl-'));
 try{
  const actors=Object.fromEntries(['melia','nereon','thaleia','doreios'].map(leader=>{
   const path=resolve(`src/lib/bots/models/${leader}.json`);return [leader,{path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}];
  }));
  const path=join(dir,'manifest.json');writeFileSync(path,JSON.stringify({actors,observationKind:'public-v1'}));
  const env=new FourEnvironment('doreios',path);env.reset('public-feature-tests:0',true);run(env);
 }finally{rmSync(dir,{recursive:true,force:true});}
}
const at=(name:string)=>171+extraFeatureNames.indexOf(name);

test('new observation never reads opposing private card identities or order',()=>fixture(env=>{
 const view=env.tracker.view(env.game),before=publicObservation(env.game,env.tracker,view,'public-v1');
 expect(before.length).toBe(publicObservationSize);expect(before.every(Number.isFinite)).toBe(true);
 expect(before.slice(0,171)).toEqual(observation(view));
 for(const uid of env.game.turnOrder.filter(uid=>uid!==env.uid)){
  for(const zone of ['hand','deck'] as const){
   env.game.decks[uid][zone]=new Proxy(env.game.decks[uid][zone],{get(target,key){if(key==='length')return target.length;throw Error('Private zone read: '+String(key));}});
  }
 }
 env.game.seed='hidden-seed-must-not-affect-input';
 expect(publicObservation(env.game,env.tracker,view,'public-v1')).toEqual(before);
 const zeros=publicObservation(env.game,env.tracker,view,'zero-public-v1');
 expect(zeros.slice(0,171)).toEqual(before.slice(0,171));expect(zeros.slice(171).every(x=>x===0)).toBe(true);
}));

test('opponents are ordered by future turn order and respond to public acquisitions',()=>fixture(env=>{
 const game=env.game,view=env.tracker.view(game),index=game.turnOrder.indexOf(activePlayer(game));
 const other=game.turnOrder[(index+1)%4];
 const before=publicObservation(game,env.tracker,view,'public-v1');
 expect(before[at(`opponent1.leader.${game.leaders[other]}`)]).toBe(1);
 expect(before[at(`opponent1.turnPosition.${game.turnOrder.indexOf(other)}`)]).toBe(1);
 env.tracker.inventory[other].acropolis=(env.tracker.inventory[other].acropolis??0)+1;
 const after=publicObservation(game,env.tracker,view,'public-v1');
 expect(after[at('opponent1.publicInventory.acropolis')]-before[at('opponent1.publicInventory.acropolis')]).toBeCloseTo(.1);
 expect(after[at('opponent1.score')]-before[at('opponent1.score')]).toBeCloseTo(definition('acropolis').vp!/50);
 expect(after[at('opponent2.score')]).toBe(before[at('opponent2.score')]);
}));

test('pending effects preserve order and worship fields distinguish favored from executable',()=>fixture(env=>{
 const game=env.game;
 game.turn.queue=[{kind:'draw',amount:2,source:'council-of-sages'},{kind:'gain',limit:5,source:'counsel-of-olympus',topdeck:true,actionOnly:true}];
 const view=env.tracker.view(game),before=publicObservation(game,env.tracker,view,'public-v1');
 expect(before[at('queue0.kind.draw')]).toBe(1);expect(before[at('queue1.limit')]).toBe(.5);
 expect(before[at('queue1.topdeck')]).toBe(1);expect(before[at('queue1.optional')]).toBe(0);
 game.turn.queue.reverse();expect(publicObservation(game,env.tracker,view,'public-v1')[at('queue0.kind.gain')]).toBe(1);
 const event=eventIds[0],card=deckIds.find(id=>definition(id).type==='Action'&&definition(id).god===definition(event).god)!;
 game.turn.queue=[];game.turn.choice=null;game.resources.coins=10;game.resources.worship=1;
 game.decks[env.uid].play=[{id:'test-a',cardId:card,copy:1},{id:'test-b',cardId:card,copy:2}];
 let features=publicObservation(game,env.tracker,env.tracker.view(game),'public-v1');
 expect(features[at(`worship.${event}.favored`)]).toBe(1);expect(features[at(`worship.${event}.executable`)]).toBe(1);
 game.resources.coins=0;features=publicObservation(game,env.tracker,env.tracker.view(game),'public-v1');
 expect(features[at(`worship.${event}.favored`)]).toBe(1);expect(features[at(`worship.${event}.executable`)]).toBe(0);
}));

test('queue schema covers every current standard action plus leader trigger',()=>{
 const actionMaximum=Math.max(...deckIds.filter(id=>definition(id).type==='Action').map(id=>actionEffects(id).length));
 const leaderMaximum=Math.max(...['melia','nereon','thaleia','doreios'].map(id=>leaderEffects(id).length));
 expect(actionMaximum+leaderMaximum).toBeLessThanOrEqual(maxPublicQueue);
 expect(new Set(extraFeatureNames).size).toBe(extraFeatureNames.length);
});
