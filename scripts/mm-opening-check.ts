import {PracticeSession} from '../src/lib/bots/session';
import {decide} from '../src/lib/bots/policy';
import {activePlayer} from '../src/lib/game/actions';
let checked=0;
for(let i=0;i<100;i++){
 const s=new PracticeSession({seed:`mm-v2-evaluation:engine:thaleia:${i}`,humanLeader:'thaleia',botLeader:'melia',humanFirst:i%2===0,bot:'mm'});
 for(let step=0;step<150;step++){
  const uid=activePlayer(s.game),v=s.tracker.view(s.game);
  if(uid==='bot'&&s.tracker.memories.bot.turn===3&&v.phase!=='actions'){
   const owned=s.tracker.inventory.bot;
   if(owned.obol===5&&!owned.hamlet&&Object.entries(owned).every(([id,n])=>!n||['obol','temple-of-demeter'].includes(id))){
    const cash=v.resources.coins+v.hand.filter(c=>c.cardId==='obol').length;
    if(cash!==5)throw Error(`Expected five coins: seed ${i}, got ${cash}`);
    checked++;
   }
   break;
  }
  s.apply(decide(v,s.tracker.memories[uid],uid==='bot'?'mm':'engine'));
 }
}
if(!checked)throw Error('No lean-deck openings exercised');
console.log(`Verified ${checked} actual five-Obol + Temple openings have $5 on turn three (100 seeds examined).`);
