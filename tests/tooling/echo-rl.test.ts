import {test,expect} from 'bun:test';
import {EchoEnvironment} from '../../scripts/rl/echo/environment';
import {commands,observation,leaders,deckIds,schemaSignature} from '../../scripts/rl/echo/schema';
import {applyPlayCommand,activePlayer,definition,effectOptions} from '../../src/lib/game/actions';
import {schemaSignature as shippedSchema} from '../../src/lib/bots/rl-schema';

test('Echo curriculum excludes the other new houses and balances every starting position',()=>{
 for(const leader of leaders){
  const positions=new Set<number>();
  for(let i=0;i<4;i++){
   const env=new EchoEnvironment(leader);env.reset(`echo-test:${i}`);
   positions.add(env.game.turnOrder.indexOf(env.uid));
   expect(Object.values(env.game.leaders)).toContain('echo');
   expect(Object.values(env.game.leaders)).toContain(leader);
   expect(Object.keys(env.game.supply)).toHaveLength(18);
   for(const id of Object.keys(env.game.supply))expect(['Hermes','Nike','Hades']).not.toContain(definition(id).god);
  }
  expect([...positions].sort()).toEqual([0,1,2,3]);
 }
 expect(deckIds).toContain('borrowed-voice');expect(schemaSignature).not.toBe(shippedSchema);
});

test('observations and legal masks do not reveal hidden order or opponents hands',()=>{
 const env=new EchoEnvironment('echo');env.reset('privacy:0');
 const g=env.game,uid=activePlayer(g),changed=structuredClone(g);
 changed.seed='a completely different secret seed';
 for(const [id,zones] of Object.entries(changed.decks)){
  zones.deck.reverse();
  if(id!==uid){const n=zones.hand.length,hidden=[...zones.hand,...zones.deck].reverse();zones.hand=hidden.slice(0,n);zones.deck=hidden.slice(n);}
 }
 expect(observation(changed)).toEqual(observation(g));
 expect(commands(changed)).toEqual(commands(g));
});

test('all offered choices execute legally and complete replay-identical games for both sides of Echo',()=>{
 for(const leader of leaders){
  const env=new EchoEnvironment(leader);let state=env.reset('legal:0'),decisions=0;
  while(!state.done){
   if(decisions++%13===0)for(const command of commands(env.game))if(command){
    const copy=structuredClone(env.game);
    expect(()=>applyPlayCommand(copy,activePlayer(copy),command,env.events.length+1)).not.toThrow();
   }
   state=env.step(env.teacher());
  }
  expect(state.info?.replayVerified).toBe(true);expect(state.info?.share).toBeGreaterThanOrEqual(0);
 }
});

test('Echo masks include each opponent Action and empty-discard fallback, but never a nonempty ineligible pile',()=>{
 const env=new EchoEnvironment('echo');env.reset('targets:0');const g=env.game,uid=activePlayer(g),others=g.turnOrder.filter(x=>x!==uid);
 g.turn.choice={id:'test-choice',kind:'echo',source:'echo',min:0,max:1};
 g.decks[others[0]].discard=[{id:'public-action',cardId:'sacred-academy',copy:1}];
 g.decks[others[1]].discard=[];g.decks[others[1]].deck=[{id:'hidden-card',cardId:'obol',copy:1}];
 g.decks[others[2]].discard=[{id:'public-territory',cardId:'hamlet',copy:1}];
 const choices=commands(g).filter(x=>x?.type==='choice/resolved').map(x=>x!.type==='choice/resolved'?x!.targets:[]);
 expect(choices).toContainEqual([]);expect(choices).toContainEqual(['public-action']);expect(choices).toContainEqual(['deck:'+others[1]]);
 expect(choices).not.toContainEqual(['public-territory']);expect(choices).not.toContainEqual(['deck:'+others[2]]);
 expect(effectOptions(g,uid)).toHaveLength(2);
});
