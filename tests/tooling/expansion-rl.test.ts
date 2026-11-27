import {test,expect,afterAll} from 'bun:test';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ExpansionEnvironment} from '../../scripts/rl/expansion/environment';
import * as schema from '../../scripts/rl/expansion/schema';
import * as echo from '../../scripts/rl/echo/schema';
import {EchoEnvironment} from '../../scripts/rl/echo/environment';
import {activePlayer,definition,applyPlayCommand} from '../../src/lib/game/actions';
const directory=mkdtempSync(join(tmpdir(),'pantheon-expansion-rl-'));
afterAll(()=>rmSync(directory,{recursive:true,force:true}));
function manifest(n:number){const path=join(directory,n+'.json');writeFileSync(path,JSON.stringify({stageLeaders:schema.leaders.slice(0,n),newest:schema.leaders[n-1],actors:{}}));return path;}
test('all old Echo observation/action identities have a lossless full-schema mapping',()=>{
 const e=new EchoEnvironment('echo');e.reset('migration:0');const old=echo.observation(e.game),next=schema.observation(e.game);
 const keys=schema.featureNames(echo.deckIds,echo.eventIds,echo.leaders,echo.cards.map(c=>c.id));
 expect(next).toHaveLength(schema.featureKeys.length);expect(old).toHaveLength(keys.length);
 keys.forEach((key,i)=>expect(next[schema.featureKeys.indexOf(key)]).toBe(old[i]));
 for(const slot of echo.slots)expect(schema.slots).toContainEqual(slot);
});
test('every stage excludes unintroduced houses and balances the same matchup and market across both starting orders',()=>{
 for(const n of [6,7,8])for(const leader of schema.leaders.slice(0,n)){
  const env=new ExpansionEnvironment(leader,manifest(n));env.reset('paired:0');const first=structuredClone(env.game),opponent=env.opponent,seed=env.gameSeed;
  expect(env.first).toBe(true);expect(first.turnOrder.indexOf(env.uid)).toBe(0);expect(schema.observation(first)).toHaveLength(schema.featureKeys.length);
  const gods=schema.leaders.slice(0,n).map(id=>definition(id).god);
  for(const id of Object.keys(first.supply))if(definition(id).type==='Action')expect(gods).toContain(definition(id).god);
  env.reset('paired:1');expect(env.first).toBe(false);expect(env.gameSeed).toBe(seed);expect(env.opponent).toBe(opponent);expect(env.game.turnOrder.indexOf(env.uid)).toBe(1);
  // Opponent may already have bought before the second player acts, so compare pile IDs.
  expect(Object.keys(env.game.supply)).toEqual(Object.keys(first.supply));
 }
});
test('all eight leaders complete legal, replay-identical games with stable observation size',()=>{
 const path=manifest(8);
 for(const leader of schema.leaders){const env=new ExpansionEnvironment(leader,path);let state=env.reset('full-game:0'),n=0;
  while(!state.done){expect(state.observation).toHaveLength(schema.featureKeys.length);
   if(n++%11===0)for(const command of schema.commands(env.game))if(command){const g=structuredClone(env.game);expect(()=>applyPlayCommand(g,activePlayer(g),command,env.events.length+1)).not.toThrow();}
   state=env.step(env.teacher());
  }expect(state.info?.replayVerified).toBe(true);
 }
});
test('headsup observations never expose hidden hands or deck order',()=>{
 const env=new ExpansionEnvironment('theseus',manifest(6));env.reset('privacy:0');const g=env.game,changed=structuredClone(g),uid=activePlayer(g);
 changed.seed='different';for(const [id,z] of Object.entries(changed.decks)){z.deck.reverse();if(id!==uid){const n=z.hand.length,hidden=[...z.hand,...z.deck].reverse();z.hand=hidden.slice(0,n);z.deck=hidden.slice(n);}}
 expect(schema.observation(changed)).toEqual(schema.observation(g));expect(schema.commands(changed)).toEqual(schema.commands(g));
});

test('long campaign identities map to bounded production seeds without losing pairing',()=>{
 const env=new ExpansionEnvironment('theseus',manifest(6)),prefix='long-campaign-identity:'.repeat(8);
 env.reset(prefix+'0');const seed=env.gameSeed;expect(seed.length).toBeLessThanOrEqual(64);
 env.reset(prefix+'1');expect(env.gameSeed).toBe(seed);
 env.reset(prefix+'2');expect(env.gameSeed).not.toBe(seed);
});
