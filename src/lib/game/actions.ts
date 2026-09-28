import { cards } from './cards';
import { shuffle } from './random';
import type { CardInstance, SetupState } from './setup';

export type ActionCommand =
  | { type: 'action/played'; instanceId: string }
  | { type: 'choice/resolved'; choiceId: string; targets: string[] }
  | { type: 'phase/advanced' }
  | { type: 'treasure/played'; instanceId: string }
  | { type: 'treasures/played' }
  | { type: 'card/bought'; cardId: string }
  | { type: 'god/worshipped'; cardId: string }
  | { type: 'turn/ended' };
export type Effect =
  | { kind: 'resource'; resource: 'actions' | 'coins' | 'buys' | 'worship'; amount: number; source: string }
  | { kind: 'draw'; amount: number; source: string }
  | { kind: 'trash' | 'discard'; amount: number; source: string; forge?: boolean; offering?: 'sum' | 1 | 3 }
  | { kind: 'gain'; limit: number; source: string; actionOnly?: boolean; topdeck?: boolean; optional?: boolean; cardId?: string }
  | { kind: 'reveal'; source: string };
export type Choice = { id: string; kind: 'trash' | 'discard' | 'gain'; source: string; min: number; max: number; limit?: number; forge?: boolean; offering?: 'sum' | 1 | 3; actionOnly?: boolean; topdeck?: boolean };
export type Movement = { sequence: number; index: number; uid: string; kind: 'play' | 'draw' | 'trash' | 'discard' | 'gain' | 'reveal' | 'topdeck' | 'shuffle' | 'leader' | 'worship'; card?: CardInstance; source: string; amount?: number };
export type TurnState = { number: number; index: number; phase: 'actions' | 'treasures' | 'buys' | 'finished'; leaderUsed: boolean; queue: Effect[]; choice: Choice | null; shuffles: Record<string, number>; turns: Record<string, number> };
export function initialTurn(): TurnState { return { number: 1, index: 0, phase: 'actions', leaderUsed: false, queue: [], choice: null, shuffles: {}, turns: {} }; }
export const definition = (id: string) => { const card = cards.find(card => card.id === id); if (!card) throw new Error('Unknown card.'); return card; };
export const activePlayer = (game: SetupState) => game.turnOrder[game.turn.index];
export function eligibleGains(game: SetupState, limit: number, actionOnly = false) { return cards.filter(card => (game.supply[card.id] ?? 0) > 0 && card.cost !== null && card.cost <= limit && (!actionOnly || card.type === 'Action')); }
export function devotionCards(game: SetupState, uid: string, eventId: string) {
  const god = definition(eventId).god;
  return (game.decks[uid]?.play ?? []).filter(card => definition(card.cardId).type === 'Action' && definition(card.cardId).god === god);
}
export function worshipReason(game: SetupState, uid: string, eventId: string): string {
  if (game.phase !== 'playing' || game.turn.phase === 'finished') return 'Worship is available during play.';
  if (activePlayer(game) !== uid) return 'Wait for your turn.';
  if (game.turn.choice || game.turn.queue.length) return 'Finish your current choice.';
  if (!game.sharedEvents.includes(eventId)) return 'This god is not at this table.';
  if (game.resources.worship < 1) return 'No Worship remaining.';
  const cost = definition(eventId).cost!;
  if (game.resources.coins < cost) return `You need ${cost - game.resources.coins} more ${cost - game.resources.coins === 1 ? 'Coin' : 'Coins'}.`;
  return '';
}
export function worshipEffects(id: string, favored: boolean): Effect[] {
  const buy: Effect = { kind: 'resource', source: id, resource: 'buys', amount: 1 };
  switch (id) {
    case 'counsel-of-olympus': return [{ kind: 'gain', source: id, limit: favored ? 5 : 3, actionOnly: true, topdeck: true }];
    case 'tribute-of-the-tides': return [{ kind: 'gain', source: id, limit: 3, cardId: 'drachma', topdeck: favored }, ...(favored ? [buy] : [])];
    case 'blessing-of-the-fields': return [{ kind: 'trash', source: id, amount: 2, ...(favored ? { offering: 'sum' as const } : {}) }, ...(favored ? [buy] : [])];
    case 'trial-of-the-spear': return [{ kind: 'trash', source: id, amount: 1, offering: favored ? 3 : 1 }];
    default: throw new Error('Choose a shared god event.');
  }
}
export function canPlayAction(game: SetupState, uid: string, instanceId: string) {
  return game.phase === 'playing' && activePlayer(game) === uid && game.turn.phase === 'actions' && !game.turn.choice && game.resources.actions > 0 && game.decks[uid]?.hand.some(card => card.id === instanceId && definition(card.cardId).type === 'Action');
}
export function canPlayTreasure(game: SetupState, uid: string, instanceId: string) {
  return game.phase === 'playing' && activePlayer(game) === uid && game.turn.phase === 'treasures' && !game.turn.choice && game.decks[uid]?.hand.some(card => card.id === instanceId && definition(card.cardId).type === 'Treasure');
}
export function purchaseReason(game: SetupState, uid: string, id: string): string {
  if (game.turn.phase === 'finished') return 'The game is over.';
  if (activePlayer(game) !== uid) return 'Wait for your turn.';
  if (game.turn.choice) return 'Finish your current choice.';
  if (!['treasures', 'buys'].includes(game.turn.phase)) return 'Finish playing Actions before buying cards.';
  if (!game.supply[id]) return 'This pile is empty.';
  if (game.resources.buys < 1) return 'No Buys remaining.';
  const cost = definition(id).cost;
  if (cost === null || game.resources.coins < cost) return `You need ${cost! - game.resources.coins} more Coins.`;
  return '';
}
/** Printed cost is the reminder's value; ties use card ID, independent of hand/pile order. */
export function departureReminder(game: SetupState, uid: string) {
  if (game.phase !== 'playing' || activePlayer(game) !== uid || game.turn.choice || game.turn.phase === 'finished') return null;
  const highest = (options: ReturnType<typeof definition>[]) => options.sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0];
  const playable = game.decks[uid].hand.filter(card => canPlayAction(game, uid, card.id) || canPlayTreasure(game, uid, card.id)).map(card => definition(card.cardId));
  const card = highest(playable);
  if (card) return { verb: 'play' as const, card };
  const purchase = highest(cards.filter(card => !purchaseReason(game, uid, card.id)));
  if(purchase)return {verb:'buy' as const,card:purchase};
  const worship=game.turn.phase!=='actions'?highest(game.sharedEvents.filter(id=>!worshipReason(game,uid,id)).map(definition)):undefined;
  return worship?{verb:'worship' as const,card:worship}:null;
}
export function standings(game: SetupState) {
  const rows = game.players.map(player => {
    const owned = Object.values(game.decks[player.uid]).flat();
    return { ...player, score: owned.reduce((sum, card) => sum + (definition(card.cardId).vp ?? 0), 0), turns: game.turn.turns[player.uid] ?? 0,
      territories: ['hamlet', 'polis', 'acropolis'].map(id => ({ id, count: owned.filter(card => card.cardId === id).length })) };
  }).sort((a,b) => b.score-a.score || a.turns-b.turns);
  return rows.map(row => ({ ...row, winner: row.score === rows[0].score && row.turns === rows[0].turns }));
}
function resource(source: string, key: 'actions' | 'coins' | 'buys' | 'worship', amount: number): Effect { return { kind: 'resource', source, resource: key, amount }; }
export function actionEffects(id: string): Effect[] {
  const draw = (amount: number): Effect => ({ kind: 'draw', source: id, amount });
  const add = (key: 'actions' | 'coins' | 'buys' | 'worship', amount: number) => resource(id, key, amount);
  if (definition(id).uniqueStartingCard) return [add('worship', 1), add('actions', 1)];
  switch (id) {
    case 'oracles-acolyte': return [draw(1), add('actions', 1)];
    case 'council-of-sages': return [draw(3)];
    case 'sacred-academy': return [draw(2), add('actions', 1)];
    case 'harbor-pilot': return [draw(1), add('actions', 2)];
    case 'sea-trade': return [add('coins', 2), add('buys', 1)];
    case 'merchant-fleet': return [draw(1), add('actions', 1), add('coins', 1), add('buys', 1)];
    case 'seed-keeper': return [{ kind: 'trash', source: id, amount: 2 }];
    case 'harvest-feast': return [draw(2), add('actions', 1), { kind: 'discard', source: id, amount: 1 }];
    case 'sacred-grove': return [add('actions', 1), { kind: 'gain', source: id, limit: 4 }];
    case 'bronze-recruit': return [add('coins', 2)];
    case 'forge-of-heroes': return [{ kind: 'trash', source: id, amount: 1, forge: true }];
    case 'victorious-procession': return [add('coins', 2), add('buys', 1), { kind: 'reveal', source: id }];
    default: throw new Error('This card is not an Action.');
  }
}
export function applyPlayCommand(game: SetupState, uid: string, command: ActionCommand, sequence: number): string {
  if (game.phase !== 'playing' || activePlayer(game) !== uid || game.turn.phase === 'finished') throw new Error('Wait for your turn.');
  const zones = game.decks[uid], name = game.players.find(player => player.uid === uid)!.name;
  const messages: string[] = [];
  const move = (kind: Movement['kind'], source: string, card?: CardInstance, amount?: number) => game.movements.push({ sequence, index: game.movements.length, uid, kind, source, ...(card ? { card: { ...card } } : {}), ...(amount !== undefined ? { amount } : {}) });
  function takeTop(source: string) {
    if (!zones.deck.length && zones.discard.length) {
      const seat = game.players.findIndex(player => player.uid === uid), count = game.turn.shuffles[uid] ?? 0;
      zones.deck = shuffle(zones.discard, `${game.seed}:reshuffle:${seat}:${count}`); zones.discard = []; game.turn.shuffles[uid] = count + 1;
      move('shuffle', source, undefined, zones.deck.length);
    }
    return zones.deck.shift();
  }
  function draw(amount: number, source: string) {
    let drawn = 0;
    for (let i = 0; i < amount; i++) { const card = takeTop(source); if (!card) break; zones.hand.push(card); move('draw', source, card); drawn++; }
    messages.push(`drew ${drawn} ${drawn === 1 ? 'card' : 'cards'}`);
  }
  function gain(id: string, source: string, topdeck = false) {
    const card = definition(id), remaining = game.supply[id];
    if (!remaining) throw new Error('That supply pile is empty.');
    const copy = card.supply[game.playerCount] - remaining + 1;
    const instance = { id: `supply-${id}-${copy}`, cardId: id, copy };
    game.supply[id]--;
    if (topdeck) zones.deck.unshift(instance); else zones.discard.push(instance);
    move(topdeck ? 'topdeck' : 'gain', source, instance); messages.push(`gained ${card.name} ${topdeck ? 'onto the deck' : 'to discard'}`);
  }
  function resolve() {
    while (game.turn.queue.length && !game.turn.choice) {
      const effect = game.turn.queue.shift()!;
      if (definition(effect.source).type === 'Leader') { move('leader', effect.source); messages.push(`${definition(effect.source).name.split(',')[0]}’s blessing`); }
      if (effect.kind === 'resource') { game.resources[effect.resource] += effect.amount; messages.push(`+${effect.amount} ${effect.resource === 'worship' ? 'Worship' : effect.resource}`); }
      else if (effect.kind === 'draw') draw(effect.amount, effect.source);
      else if (effect.kind === 'reveal') {
        const card = takeTop(effect.source);
        if (!card) { messages.push('no card to reveal'); continue; }
        move('reveal', effect.source, card);
        if (definition(card.cardId).type === 'Territory') { zones.discard.push(card); game.resources.coins += 2; move('discard', effect.source, card); messages.push(`revealed ${definition(card.cardId).name} to discard, +2 coins`); }
        else { zones.deck.unshift(card); move('topdeck', effect.source, card); messages.push(`revealed ${definition(card.cardId).name} and returned it to the deck`); }
      } else if (effect.kind === 'gain') {
        if (effect.cardId) {
          if (game.supply[effect.cardId]) gain(effect.cardId, effect.source, effect.topdeck);
          else messages.push(`${definition(effect.cardId).name} pile is empty`);
          continue;
        }
        if (!eligibleGains(game, effect.limit, effect.actionOnly).length) { messages.push('no eligible card to gain'); continue; }
        game.turn.choice = { id: `${sequence}:${game.turn.queue.length}:gain`, kind: 'gain', source: effect.source, min: effect.optional ? 0 : 1, max: 1, limit: effect.limit, ...(effect.actionOnly ? { actionOnly: true } : {}), ...(effect.topdeck ? { topdeck: true } : {}) };
      } else {
        const max = Math.min(effect.amount, zones.hand.length);
        if (!max) {
          messages.push(`no cards to ${effect.kind}`);
          if (effect.offering === 'sum') game.turn.queue.unshift({ kind: 'gain', source: effect.source, limit: 0, optional: true });
          continue;
        }
        game.turn.choice = { id: `${sequence}:${game.turn.queue.length}:${effect.kind}`, kind: effect.kind, source: effect.source, min: effect.kind === 'discard' ? max : 0, max, ...(effect.forge ? { forge: true } : {}), ...(effect.offering ? { offering: effect.offering } : {}) };
      }
    }
  }
  if (command.type !== 'choice/resolved' && game.turn.choice) throw new Error('Finish the current choice first.');
  switch (command.type) {
    case 'action/played': {
      if (!canPlayAction(game, uid, command.instanceId)) throw new Error('Choose an Action in your hand while you have an Action remaining.');
      const index = zones.hand.findIndex(card => card.id === command.instanceId), card = zones.hand.splice(index, 1)[0];
      zones.play.push(card); game.resources.actions--; move('play', card.cardId, card); messages.push(`played ${definition(card.cardId).name}`);
      game.turn.queue = actionEffects(card.cardId);
      const leader = definition(game.leaders[uid]);
      if (!game.turn.leaderUsed && leader.god === definition(card.cardId).god) {
        game.turn.leaderUsed = true;
        if (leader.id === 'thaleia') game.turn.queue.push(resource(leader.id, 'actions', 1));
        if (leader.id === 'nereon') game.turn.queue.push(resource(leader.id, 'coins', 1));
        if (leader.id === 'melia') game.turn.queue.push({ kind: 'draw', source: leader.id, amount: 1 });
        if (leader.id === 'doreios') game.turn.queue.push({ kind: 'trash', source: leader.id, amount: 1 });
      }
      resolve(); break;
    }
    case 'god/worshipped': {
      const reason = worshipReason(game, uid, command.cardId);
      if (reason) throw new Error(reason);
      const event = definition(command.cardId), devotion = devotionCards(game, uid, event.id).length;
      game.resources.worship--; game.resources.coins -= event.cost!;
      move('worship', event.id, undefined, devotion);
      messages.push(`worshipped ${event.god} · ${devotion >= 2 ? 'Favored' : 'Standard'}`);
      game.turn.queue = worshipEffects(event.id, devotion >= 2); resolve(); break;
    }
    case 'choice/resolved': {
      const choice = game.turn.choice;
      if (!choice || command.choiceId !== choice.id || !Array.isArray(command.targets) || command.targets.some(id => typeof id !== 'string') || new Set(command.targets).size !== command.targets.length || command.targets.length < choice.min || command.targets.length > choice.max) throw new Error('Choose the required cards for this effect.');
      if (choice.kind === 'gain') {
        if (command.targets.length && !eligibleGains(game, choice.limit!, choice.actionOnly).some(card => card.id === command.targets[0])) throw new Error('Choose an available card within the cost limit.');
        if (command.targets.length) gain(command.targets[0], choice.source, choice.topdeck);
        else messages.push('chose not to gain');
      } else {
        if (command.targets.some(id => !zones.hand.some(card => card.id === id))) throw new Error('Choose cards from your hand.');
        const chosen = command.targets.map(id => zones.hand.find(card => card.id === id)!);
        zones.hand = zones.hand.filter(card => !command.targets.includes(card.id));
        for (const card of chosen) { (choice.kind === 'trash' ? game.trash : zones.discard).push(card); move(choice.kind, choice.source, card); }
        messages.push(chosen.length ? `${choice.kind === 'trash' ? 'trashed' : 'discarded'} ${chosen.map(card => definition(card.cardId).name).join(', ')}` : 'trashed no cards');
        if (choice.offering === 'sum') game.turn.queue.unshift({ kind: 'gain', source: choice.source, limit: chosen.reduce((sum, card) => sum + definition(card.cardId).cost!, 0), optional: true });
        else if (choice.offering && chosen.length) game.turn.queue.unshift({ kind: 'gain', source: choice.source, limit: definition(chosen[0].cardId).cost! + choice.offering });
        if (choice.forge && chosen.length) game.turn.queue.unshift({ kind: 'gain', source: choice.source, limit: definition(chosen[0].cardId).cost! + 2 });
      }
      game.turn.choice = null; resolve(); break;
    }
    // Phase changes, payment and cleanup are ordinary replayable commands.
    case 'phase/advanced': {
      if (game.turn.phase === 'buys') throw new Error('You are already in the Buy phase.');
      game.turn.phase = game.turn.phase === 'actions' ? 'treasures' : 'buys'; messages.push(`entered the ${game.turn.phase === 'treasures' ? 'Treasure' : 'Buy'} phase`); break;
    }
    case 'treasures/played': {
      const treasures = zones.hand.filter(card => definition(card.cardId).type === 'Treasure');
      if (game.turn.phase !== 'treasures' || !treasures.length) throw new Error('There are no Treasures to play.');
      for (const card of treasures) { zones.hand.splice(zones.hand.findIndex(item => item.id === card.id), 1); zones.play.push(card); const value = { obol: 1, drachma: 2, talent: 3 }[card.cardId]!; game.resources.coins += value; move('play', card.cardId, card); messages.push(`played ${definition(card.cardId).name}, +${value} coins`); }
      break;
    }
    case 'treasure/played': {
      const index = zones.hand.findIndex(card => card.id === command.instanceId);
      if (game.turn.phase !== 'treasures' || index < 0 || definition(zones.hand[index].cardId).type !== 'Treasure') throw new Error('Play a Treasure from your hand in the Treasure phase.');
      const card = zones.hand.splice(index, 1)[0]; zones.play.push(card); const value = { obol: 1, drachma: 2, talent: 3 }[card.cardId]!;
      game.resources.coins += value; move('play', card.cardId, card); messages.push(`played ${definition(card.cardId).name}, +${value} coins`); break;
    }
    case 'card/bought': {
      const card = definition(command.cardId);
      if (card.cost === null || purchaseReason(game, uid, card.id)) throw new Error('That purchase is not available.');
      // Purchase and phase transition are one replayable command, including retry recovery.
      game.turn.phase = 'buys';
      game.resources.buys--; game.resources.coins -= card.cost; gain(card.id, card.id); break;
    }
    case 'turn/ended': {
      if (!['treasures', 'buys'].includes(game.turn.phase)) throw new Error('Finish the Action phase first.');
      zones.discard.push(...zones.hand, ...zones.play); zones.hand = []; zones.play = []; draw(5, game.leaders[uid]);
      game.turn.turns[uid] = (game.turn.turns[uid] ?? 0) + 1;
      game.resources = { actions: 1, coins: 0, buys: 1, worship: 1 }; game.turn.leaderUsed = false;
      if (game.supply.acropolis === 0 || Object.values(game.supply).filter(count => count === 0).length >= 3) {game.turn.phase = 'finished';game.resources={actions:0,coins:0,buys:0,worship:0};}
      else { game.turn.index = (game.turn.index + 1) % game.turnOrder.length; game.turn.number++; game.turn.phase = 'actions'; }
      messages.push('ended the turn'); break;
    }
    default: throw new Error('Unknown play command.');
  }
  return `${name} ${messages.join('; ')}.`;
}
