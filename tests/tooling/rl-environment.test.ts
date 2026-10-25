import {expect,test} from 'bun:test';
import {RLEnvironment,commands,observation,slots} from '../../scripts/rl/environment';
import {PracticeSession} from '../../src/lib/bots/session';
import {applyPlayCommand,activePlayer} from '../../src/lib/game/actions';

for(let game=0;game<4;game++)test('every mask-enabled command is accepted by the production reducer, seed '+game,()=>{
 const env=new RLEnvironment();let checked=0;
 {
  let state=env.reset('rl-legality-test:'+game,game%2===0);
  while(!state.done){
   const v=env.session.tracker.view(env.session.game);
   expect(observation(v).every(Number.isFinite)).toBe(true);
   for(const command of commands(v).filter(Boolean)){
    // Prior display logs do not affect command legality; avoid copying their growing history.
    const copy=structuredClone({...env.session.game,movements:[],activity:[],publicActivity:[]});
    expect(()=>applyPlayCommand(copy,activePlayer(copy),command!,copy.activity.length+1)).not.toThrow();checked++;
   }
   state=env.step(env.teacher());
  }
  const restored=PracticeSession.restore(env.session.save());
  expect(restored.game).toEqual(env.session.game);
 }
 expect(checked).toBeGreaterThan(100);
});
test('observations and masks do not expose hidden deck order, opponent hand, or instance IDs',()=>{
 const env=new RLEnvironment();env.reset('rl-visibility-test',true);
 const v=env.session.tracker.view(env.session.game),before=observation(v),mask=commands(v).map(Boolean);
 env.session.game.decks.bot.deck.reverse();
 const opponent=env.session.game.decks.human;
 [opponent.hand,opponent.deck]=[opponent.deck,opponent.hand];
 const after=env.session.tracker.view(env.session.game);
 expect(observation(after)).toEqual(before);
 expect(commands(after).map(Boolean)).toEqual(mask);
 const renamed={...v,hand:v.hand.map((c,i)=>({...c,id:'renamed-'+i}))};
 expect(observation(renamed)).toEqual(before);
 expect(commands(renamed).map(Boolean)).toEqual(mask);
});
test('two-card selections support repeated types without reusing an instance',()=>{
 const env=new RLEnvironment();env.reset('rl-pair-test',true);
 const v=env.session.tracker.view(env.session.game);
 v.hand=[{cardId:'obol',id:'a',copy:1},{cardId:'obol',id:'b',copy:2}];
 v.choice={id:'choice',kind:'trash',source:'seed-keeper',min:0,max:2};
 const index=slots.findIndex(s=>s.kind==='select'&&s.ids.join(',')==='obol,obol');
 expect(commands(v)[index]).toEqual({type:'choice/resolved',choiceId:'choice',targets:['a','b']});
 v.hand.pop();expect(commands(v)[index]).toBeUndefined();
});
