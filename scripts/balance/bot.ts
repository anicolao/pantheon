import { moneyBuy, moneyAction, moneyDiscard } from './money';
import { actionEffects, definition, leaderEffects, type ActionCommand, type Choice } from '../../src/lib/game/actions';
import type { CardInstance, SetupState } from '../../src/lib/game/setup';

export const policies = ['treasure', 'draw'] as const;
export type Policy = typeof policies[number];
export const policyVersion = 3;
/** No seed, draw order, opposing hands, or private movement log crosses this boundary. */
export type Observation = {
  hand: CardInstance[];
  owned: Record<string, number>;
  supply: Record<string, number>;
  resources: SetupState['resources'];
  phase: SetupState['turn']['phase'];
  choice: Choice | null;
  leader: string;
  leaderUsed: boolean;
};
export function observe(game: SetupState, uid: string): Observation {
  const owned: Record<string, number> = {};
  // Equivalent to remembering the starting inventory and all own gains/trashes.
  for (const card of Object.values(game.decks[uid]).flat()) owned[card.cardId] = (owned[card.cardId] ?? 0) + 1;
  return structuredClone({ hand: game.decks[uid].hand, owned, supply: game.supply,
    resources: game.resources, phase: game.turn.phase, choice: game.turn.choice,
    leader: game.leaders[uid], leaderUsed: game.turn.leaderUsed });
}
function preferences(view: Observation, policy: Policy): string[] {
  const late = view.supply.acropolis <= 3;
  const engine: string[] = [];
  if (policy === 'draw' && !late) {
    if ((view.owned['sacred-academy'] ?? 0) < 4) engine.push('sacred-academy');
    if ((view.owned['harbor-pilot'] ?? 0) < 1) engine.push('harbor-pilot');
    if ((view.owned['council-of-sages'] ?? 0) < 1) engine.push('council-of-sages');
  }
  return ['acropolis', ...(late ? ['polis'] : []), 'talent', ...engine, 'drachma', ...(late ? ['hamlet'] : [])];
}
function trashable(view: Observation, card: CardInstance): boolean {
  if (view.supply.acropolis <= 3) return false;
  if (card.cardId === 'hamlet') return true;
  const money = (view.owned.obol ?? 0) + 2 * (view.owned.drachma ?? 0) + 3 * (view.owned.talent ?? 0);
  return card.cardId === 'obol' && money >= 8;
}
export function chooseCommand(view: Observation, policy: Policy): ActionCommand {
  const choice = view.choice;
  if (choice) {
    let targets: string[];
    if (choice.kind === 'gain') {
      const eligible = Object.keys(view.supply).filter(id => view.supply[id] > 0 && definition(id).cost !== null &&
        definition(id).cost! <= choice.limit! && (!choice.actionOnly || definition(id).type === 'Action'));
      const preferred = policy === 'treasure' ? moneyBuy(view, eligible, choice.min > 0) : preferences(view, policy).find(id => eligible.includes(id));
      const fallback = eligible.sort((a, b) => definition(b).cost! - definition(a).cost! || a.localeCompare(b))[0];
      targets = preferred ? [preferred] : choice.min && fallback ? [fallback] : [];
    } else {
      const ordered = [...view.hand].sort((a, b) => {
        const value = (card: CardInstance) => definition(card.cardId).type === 'Territory' ? -1 : definition(card.cardId).cost ?? 0;
        return value(a) - value(b) || a.id.localeCompare(b.id);
      });
      let remainingMoney = (view.owned.obol ?? 0) + 2 * (view.owned.drachma ?? 0) + 3 * (view.owned.talent ?? 0);
      targets = [];
      for (const card of ordered) {
        if (targets.length >= choice.max) break;
        if (choice.kind !== 'discard' && (!trashable(view, card) || card.cardId === 'obol' && remainingMoney <= 7)) continue;
        targets.push(card.id);
        if (choice.kind !== 'discard' && card.cardId === 'obol') remainingMoney--;
      }
    }
    if (policy === 'treasure' && choice.kind === 'discard') targets = moneyDiscard(view);
    return { type: 'choice/resolved', choiceId: choice.id, targets };
  }
  if (view.phase === 'actions') {
    if (policy === 'treasure') {
      const action = view.resources.actions > 0 ? moneyAction(view) : undefined;
      return action ? { type: 'action/played', instanceId: action.id } : { type: 'phase/advanced' };
    }
    const actions = view.hand.filter(card => definition(card.cardId).type === 'Action');
    const priority = (card: CardInstance) => {
      const effects = [...actionEffects(card.cardId), ...(!view.leaderUsed && definition(card.cardId).god === definition(view.leader).god ? leaderEffects(view.leader) : [])];
      return effects.reduce((score, effect) => score + (effect.kind === 'resource' && effect.resource === 'actions' ? 20 * effect.amount : effect.kind === 'draw' ? effect.amount : 0), 0);
    };
    actions.sort((a, b) => priority(b) - priority(a) || a.id.localeCompare(b.id));
    if (view.resources.actions > 0 && actions[0]) return { type: 'action/played', instanceId: actions[0].id };
    return { type: 'phase/advanced' };
  }
  if (view.phase === 'treasures' && view.hand.some(card => definition(card.cardId).type === 'Treasure')) return { type: 'treasures/played' };
  const purchase = policy === 'treasure' ? moneyBuy(view) : preferences(view, policy).find(id => view.supply[id] > 0 && definition(id).cost! <= view.resources.coins);
  if (view.resources.buys > 0 && purchase) return { type: 'card/bought', cardId: purchase };
  return { type: 'turn/ended' };
}
