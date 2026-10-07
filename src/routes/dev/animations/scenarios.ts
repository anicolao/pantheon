import { treasuresRightToLeft } from '$lib/components/play/hand-order';
import { replaySetup, leaderIds, type SetupEvent } from '$lib/game/setup';
import { activePlayer, applyPlayCommand, definition, eligibleGains, type ActionCommand } from '$lib/game/actions';
import type { GameCommand } from '$lib/backend/setup-repository';

export const scenarios = [
  { id: 'treasure', name: 'Single treasure', hint: 'One Obol, one Drachma and one Talent in hand. Trigger plays the rightmost Treasure (Talent); click the others individually to compare flights and hand reflow.' },
  { id: 'treasures', name: 'Play all treasures', hint: 'One Obol, one Drachma and one Talent fly together. Compare staggering, landing order and hand reflow.' },
  { id: 'buy', name: 'Purchase', hint: 'Market → purchased-card area, separated from played cards.' },
  { id: 'cleanup', name: 'Cleanup and redeal', hint: 'Played cards, purchases and hand → discard, then five new cards. The viewpoint stays on the player who ended the turn.' },
  { id: 'shuffle', name: 'Shuffle and redeal', hint: 'Cleanup with an exhausted deck: discard → deck → sorted hand.' },
  ...['oracles-acolyte','council-of-sages','harbor-pilot','harvest-feast','seed-keeper','forge-of-heroes','sacred-grove','bronze-recruit','victorious-procession'].map(id => ({ id, name: definition(id).name, hint: 'Trigger plays this card. Use the normal hand/market controls to finish any choices; replay restores the exact same hand and deck.' })),
  { id: 'favor', name: 'Worship becomes favored', hint: 'The second Athena Action triggers the glint. Play treasures afterward to see the persistent playable glow.' },
  ...['counsel-of-olympus','tribute-of-the-tides','blessing-of-the-fields','trial-of-the-spear'].map(id => ({ id, name: `Worship · ${definition(id).god}`, hint: 'Open the named worship card using the sidebar (or Worship drawer on phones), then worship and complete its choices. Trigger directly runs the worship command for observer/flight review.' })),
  { id: 'deal', name: 'Last leader claim and initial deal', hint: 'Claim the last leader and watch the table form and all hands deal.' },
  { id: 'victory', name: 'Game end and victory', hint: 'End the final turn after three piles emptied through legal purchases. Distinct scores show every placement colour.' },
  { id: 'browse', name: 'Coverflows, drawers and inspections', hint: 'Browse the supply and worship stacks, open/close phone drawers, inspect a leader, and expand the Chronicle. Use 3 or 4 players for vertical worship coverflow.' }
];
export type Fixture = { events: SetupEvent[]; actor: string; trigger?: GameCommand };

/** Seeded legal event histories, not fabricated zones. Reset always restores the same deal. */
export function fixture(id: string, count: 2 | 3 | 4, playerIds = Array.from({length:count},(_,i)=>`lab-${i}`)): Fixture {
  const leader = id === 'bronze-recruit' || id === 'forge-of-heroes' ? 'doreios' : id === 'favor' ? 'thaleia' : definitionOrGod(id);
  const names = ['Ariadne', 'Theseus', 'Iris', 'Leon'];
  let events: SetupEvent[] = names.slice(0, count).map((name, i) => ({ schemaVersion: 1, sequence: i + 1, actorUid: playerIds[i], name, playerCount: count, type: i ? 'player/joined' : 'game/created' }));
  let projected = replaySetup(events);
  function append(command: GameCommand, uid?: string) {
    const game = projected;
    const actor = uid ?? activePlayer(game);
    const sequence = events.length + 1;
    const event: SetupEvent = { schemaVersion: 1, reducerVersion: 1, commandId: `lab-${sequence}`, sequence, actorUid: actor, name: names[playerIds.indexOf(actor)], playerCount: count, ...command };
    const next = [...events, event];
    if (projected.phase === 'playing') {
      // Plan with the shared rules reducer instead of replaying the growing
      // history for every move. The emitted stream is still fully replayed by
      // GameSession and the fixture regression tests.
      projected = structuredClone(projected);
      projected.activity.push({sequence, message:applyPlayCommand(projected,actor,command as ActionCommand,sequence)});
    } else projected = replaySetup(next);
    events = next;
  }
  append({ type: 'draft/started', seed: id==='treasure' || id==='treasures' ? 'animation-treasures-v1' : 'animation-lab-v1' }, playerIds[0]);
  const order = replaySetup(events).draftOrder;
  const others = leaderIds.filter(value => value !== leader);
  const chosen = Object.fromEntries(playerIds.map((uid,i)=>[uid,i ? others[i-1] : leader]));
  for (const uid of order) {
    if (id === 'deal' && uid === order.at(-1)) return { events, actor: uid, trigger: { type: 'leader/chosen', leaderId: chosen[uid] } };
    append({ type: 'leader/chosen', leaderId: chosen[uid] }, uid);
  }
  const state = () => projected;
  function resolveChoices() {
    for (let i=0; i<8 && state().turn.choice; i++) {
      const game=state(), choice=game.turn.choice!;
      const targets=choice.kind==='gain' ? eligibleGains(game,choice.limit!,choice.actionOnly).slice(-1).map(card=>card.id) : game.decks[activePlayer(game)].hand.slice(0,choice.min).map(card=>card.id);
      append({type:'choice/resolved',choiceId:choice.id,targets});
    }
  }
  function money() { if (state().decks[activePlayer(state())].hand.some(card=>definition(card.cardId).type==='Treasure')) append({type:'treasures/played'}); else if(state().turn.phase==='actions')append({type:'phase/advanced'}); }
  function end() { resolveChoices(); money(); append({type:'turn/ended'}); }
  for(let i=0;activePlayer(state())!==playerIds[0] && i<count;i++)end();
  if (id==='treasure' || id==='treasures') {
    const kinds=['obol','drachma','talent'];
    // Acquire the higher denominations through normal purchases, then keep the
    // first seeded deal containing exactly one of each and two non-Treasures.
    for(let i=0;i<400;i++) {
      const game=state(), actor=activePlayer(game), hand=game.decks[actor].hand;
      if(actor===playerIds[0] && kinds.every(kind=>hand.filter(card=>card.cardId===kind).length===1)) {
        return {events,actor,trigger:id==='treasure'
          ? {type:'treasure/played',instanceId:treasuresRightToLeft(hand)[0].id}
          : {type:'treasures/played'}};
      }
      if(actor===playerIds[0]) {
        const temple=hand.find(card=>definition(card.cardId).uniqueStartingCard);
        if(temple)append({type:'action/played',instanceId:temple.id});
        money();
        const owned=Object.values(state().decks[actor]).flat();
        const next=['drachma','talent'].find(kind=>!owned.some(card=>card.cardId===kind));
        if(next && state().resources.coins>=definition(next).cost!)append({type:'card/bought',cardId:next});
      }
      end();
    }
    throw Error('Could not prepare one of each Treasure');
  }
  if (id==='victory') {
    // Reserve a different number of Hamlet purchases for each runner-up;
    // Ariadne buys the remainder. All scores still come from legal play.
    const purchased=Array<number>(count).fill(0);
    const quotas=purchased.map((_,index)=>index===0?0:(count-1-index)*(count-index)/2);
    for(let i=0;i<250;i++) {
      money();
      const game=state();
      const player=playerIds.indexOf(activePlayer(game));
      const reserved=quotas.reduce((sum,quota,index)=>sum+Math.max(0,quota-purchased[index]),0);
      const canBuyHamlet=player===0?game.supply.hamlet>reserved:purchased[player]<quotas[player];
      const pile=['obol','hamlet','seed-keeper'].find(card=>game.supply[card]>0 && definition(card).cost!<=game.resources.coins && (card!=='hamlet'||canBuyHamlet));
      if(pile){append({type:'card/bought',cardId:pile});if(pile==='hamlet')purchased[player]++;}
      if(Object.values(state().supply).filter(n=>n===0).length>=3)return {events,actor:activePlayer(state()),trigger:{type:'turn/ended'}};
      end();
    }
    throw Error('Could not prepare victory');
  }
  const action = id==='favor' ? 'oracles-acolyte' : ['oracles-acolyte','council-of-sages','harbor-pilot','harvest-feast','seed-keeper','forge-of-heroes','sacred-grove','bronze-recruit','victorious-procession'].includes(id) ? id : undefined;
  if (action) {
    let bought=false;
    for(let i=0;i<180;i++) {
      const game=state(), uid=activePlayer(game), hand=game.decks[uid].hand;
      const card=hand.find(card=>card.cardId===action);
      const temple=hand.find(card=>definition(card.cardId).uniqueStartingCard);
      if(uid===playerIds[0] && card && (id!=='favor'||temple)) {
        if(id==='favor')append({type:'action/played',instanceId:temple!.id});
        return {events,actor:uid,trigger:{type:'action/played',instanceId:card.id}};
      }
      if(uid===playerIds[0] && temple) { append({type:'action/played',instanceId:temple.id}); resolveChoices(); }
      money();
      if(uid===playerIds[0] && !bought) {
        if(state().resources.coins>=definition(action).cost!) {append({type:'card/bought',cardId:action});bought=true;}
        else if(state().resources.coins>=3)append({type:'card/bought',cardId:'drachma'});
      }
      end();
    }
    throw Error(`Could not prepare ${id}`);
  }
  if (['counsel-of-olympus','tribute-of-the-tides','blessing-of-the-fields','trial-of-the-spear'].includes(id)) {
    for(let i=0;i<100;i++) {
      money();
      if(activePlayer(state())===playerIds[0] && state().resources.coins>=definition(id).cost!)return {events,actor:playerIds[0],trigger:{type:'god/worshipped',cardId:id}};
      end();
    }
    throw Error(`Could not prepare ${id}`);
  }
  if(id==='shuffle') { for(let i=0;i<100 && !(activePlayer(state())===playerIds[0] && state().decks[playerIds[0]].deck.length<5);i++)end(); }
  if(['buy','cleanup','shuffle'].includes(id))money();
  if(id==='cleanup')append({type:'card/bought',cardId:'obol'});
  const game=state(), actor=activePlayer(game);
  const trigger: ActionCommand | undefined = id==='buy' ? {type:'card/bought',cardId:eligibleGains(game,game.resources.coins).at(-1)!.id} : ['cleanup','shuffle'].includes(id) ? {type:'turn/ended'} : undefined;
  return {events,actor,trigger};
}
function definitionOrGod(id:string) {
  const mapping: Record<string,string> = { 'counsel-of-olympus':'thaleia', 'tribute-of-the-tides':'nereon', 'blessing-of-the-fields':'melia', 'trial-of-the-spear':'doreios' };
  return mapping[id] ?? 'nereon';
}
