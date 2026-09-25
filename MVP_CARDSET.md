# Pantheon: Bloodlines — v0.1 Rules and Card Set

This document defines a complete, fixed-market prototype for **2–4 players**. All costs, quantities, and abilities below are the starting values for playtesting.

## 1. Objective

Finish with the most victory points (VP) from Territories in your possession. Your leader provides a unique ability and a god affiliation. Build your personal deck from a shared supply, use affiliated Actions to earn stronger divine blessings, and decide when to invest in scoring land.

Territories are cards, not spaces on a map. There is no movement, combat, territory capture, or direct player attack in v0.1.

## 2. Components

Prepare the following cards. Starting cards are separate from the listed supply counts.

| Component | Quantity |
| --- | --- |
| Starting deck for each player | 7 Obols and 3 Hamlets |
| Obol supply | 40 |
| Drachma supply | 30 |
| Talent supply | 20 |
| Hamlet supply | 8 in a 2-player game; 12 in a 3–4-player game |
| Polis supply | 8 in a 2-player game; 12 in a 3–4-player game |
| Acropolis supply | 8 in a 2-player game; 12 in a 3–4-player game |
| Each of the 12 Action cards in section 8 | 10 copies, making 120 Action cards |
| Unique leaders | 4, one of each in section 9 |
| God event cards | 4, one of each in section 10 |

Also provide a shared trash area, a first-player marker, and a way to track Actions, Buys, and Coins during a turn. These counters are temporary resources, not cards or victory points.

### Prototype presentation

Deck cards use a portrait face and one shared back regardless of type or god. God events use landscape faces and a distinct event back. Leaders use larger landscape boards and their own leader back. Events and leaders never enter a player's deck.

The illustrated resource notation uses a laurel wreath for VP, a fan of cards for Cards, a market basket for Buys, a lightning bolt for Actions, and a coin for Coins. The overlaid number gives the quantity; `+` means add or draw that quantity. Without `+`, read the quantity in the surrounding instruction (for example, a cost or a number of cards to trash). Icons do not change timing or rules. The written card effects below are the authoritative full wording.

Each face has a unique catalog-and-copy identifier, plus `N/M` for its copy number and total copies of that named card in the selected player-count inventory. Totals include starting decks as well as supply; they are not remaining-supply counters. The gallery shows copy 1 by default and offers other copies in the inspector. Each unique leader and god event has one physical copy; selection during setup still determines which are used.

## 3. Setup

1. Randomly determine a first player. Play proceeds clockwise; keep the first-player marker in place throughout the game.
2. Starting with the last player in turn order and proceeding backward toward the first player, each player chooses one unused leader. Leaders are unique and remain face up outside their owners’ decks.
3. Place the god event corresponding to each chosen leader face up in a shared event area. Return unselected god events and leaders to the box. The events in play remain available to **all players** for the entire game.
4. Build the six basic supply piles using the quantities above. Put all twelve Action piles in the supply; do not randomize or remove Action piles for this version. Keep supply cards face up with remaining quantities visible.
5. Give each player 7 Obols and 3 Hamlets. Each player shuffles these ten cards into a face-down personal deck and draws five cards.
6. Each player begins with an empty discard pile and play area. Leave space for the shared trash.

All twelve Actions remain available even if their gods have no event in this game. Leaders never limit purchasing or playing cards of another affiliation.

## 4. Card anatomy and resources

Every deck card has a **name**, **cost in Coins**, **type**, **god affiliation**, and either an effect or VP value. Each card has exactly one affiliation.

- **Action:** Played during the Action phase by spending 1 Action; resolve its printed effect in order.
- **Treasure:** Played during the Treasure phase to produce Coins. Playing a Treasure costs no Action.
- **Territory:** Provides VP at the end of the game. Territories cannot be played and have no turn effect.
- **Leader:** A permanent personal ability outside the deck; cannot be bought, gained, discarded, or trashed.
- **God event:** A public paid effect outside all decks and supply piles; cannot be gained or depleted.

**+N Cards** means draw N cards. **+N Actions**, **+N Buys**, and **+N Coins** add to your current turn’s counters. Resources cannot be transferred to another player or saved for later turns. Printed costs never change in v0.1.

Hestia is the affiliation of the foundational Treasures and Territories. She has no leader or event in this version. Their affiliation is still printed on every card; it does not grant an additional ability.

## 5. Turn structure

### A. Start

Set your counters to **1 Action, 1 Buy, and 0 Coins**. Reset your leader’s once-per-turn ability and your once-per-turn invocation allowance.

### B. Action phase

You may play Actions from your hand, one at a time, while you have Actions remaining. Spend 1 Action, put the card face up in your play area, and resolve its effect from top to bottom. Then resolve any triggered leader ability before playing another card.

Actions granted by a card can be spent later in this phase. You may stop even if you could play more cards. Unplayed Actions stay in your hand until discarded or otherwise moved by an effect.

### C. Treasure phase

Play any number of Treasures from your hand into your play area, adding their Coins. You may leave Treasures unplayed to use as targets for later effects. Once you proceed to the Buy phase, you cannot play more Treasures or return to the Action phase.

### D. Buy phase

In any order, while you can pay the required resources, you may:

- **Buy a card:** Spend 1 Buy and Coins equal to its cost. Take one copy from its supply pile and gain it to your discard pile.
- **Invoke a god:** Spend 1 Buy and the event’s Coin cost, then resolve that event. You may invoke **at most one god event per turn**, even if you have extra Buys.

You may buy multiple copies of a card with multiple Buys. You may buy a cost-0 card, but it still costs 1 Buy. You cannot buy from an empty pile, borrow Coins, or spend more Buys than you have.

Effects can grant more Coins or Buys during this phase; use them immediately or later in the same phase. Cards gained during this phase cannot be played this turn. Buying and invoking are optional; unused resources are lost.

### E. Cleanup

Discard all cards left in your hand and all cards in your play area. Set all resource counters to zero, then draw five cards for your next hand. Check the end conditions in section 11. If the game has not ended, the next player takes a turn.

## 6. Deck handling and effect rules

- **Draw and shuffle:** Draw from your deck. Whenever you must draw or reveal a card and the deck is empty, shuffle your discard pile into a new deck, then continue. Never shuffle your hand, play area, or the trash into your deck. If both deck and discard pile are empty, stop drawing or revealing; complete the rest of the effect.
- **Gain:** Unless stated otherwise, take a card from its supply pile and place it face up in your discard pile. A gain is free: it spends neither Coins nor Buys unless it is the result of a purchase. A cost limit includes all cheaper cards, including cost 0, of any type unless restricted.
- **Empty piles:** A gain must come from a nonempty eligible pile. If none exists, that gain does nothing. Resolve any other parts of the effect. An effect cannot retrieve cards from the trash.
- **Discard:** Move a card to your own discard pile. Discarded cards remain yours and can return through shuffling.
- **Trash:** Move a card to the shared trash. It leaves your possession, no longer scores, and never returns in v0.1. Trashing does not refill a supply pile.
- **Resolve in order:** Complete each instruction before moving to the next. Do as much as possible. “May” and “up to” are optional; other instructions are mandatory when possible. A benefit beginning with “if you do” requires the stated preceding action to actually occur.
- **Hand targets:** An effect that specifies “from your hand” cannot target cards already in play. A played Action cannot trash itself with such an effect. A Territory in hand is a valid discard or trash target.
- **Top of deck:** A card placed on your deck becomes the next card drawn. If multiple cards are placed there together, choose their order. Do not shuffle just because you place a card on an empty deck.
- **Reveals:** A revealed card is temporarily face up outside other zones. It cannot enter a shuffle while being resolved. Move it to the destination specified by the effect.
- **Information:** Hands and deck order are private. Supply quantities, leaders, events, play areas, discarded cards, and trashed cards are public. Players may inspect discard piles without changing their contents and count any deck without looking at its faces. Reveal gained or trashed cards, including cards gained onto a deck.

## 7. Basic cards

All six basic cards are affiliated with **Hestia**. They have no effects beyond those listed.

| Card | Type | Cost | Effect / scoring |
| --- | --- | ---: | --- |
| Obol | Treasure | 0 | +1 Coin. |
| Drachma | Treasure | 3 | +2 Coins. |
| Talent | Treasure | 6 | +3 Coins. |
| Hamlet | Territory | 2 | 1 VP. |
| Polis | Territory | 5 | 3 VP. |
| Acropolis | Territory | 8 | 6 VP. |

The three starting Hamlets score normally if still in your possession at the end. Treasures and Actions have no VP value.

## 8. Action supply

Use ten copies of every card below in every game. All are single-type **Action** cards. Semicolons separate instructions in resolution order.

| Card | God | Cost | Complete effect |
| --- | --- | ---: | --- |
| Oracle’s Acolyte | Athena | 2 | +1 Card; +1 Action. |
| Council of Sages | Athena | 4 | +3 Cards. |
| Sacred Academy | Athena | 5 | +2 Cards; +1 Action. |
| Harbor Pilot | Poseidon | 3 | +1 Card; +2 Actions. |
| Sea Trade | Poseidon | 4 | +2 Coins; +1 Buy. |
| Merchant Fleet | Poseidon | 5 | +1 Card; +1 Action; +1 Coin; +1 Buy. |
| Seed Keeper | Demeter | 2 | You may trash up to 2 cards from your hand. |
| Harvest Feast | Demeter | 4 | +2 Cards; +1 Action; discard 1 card from your hand. |
| Sacred Grove | Demeter | 5 | +1 Action; gain a card costing up to 4 Coins to your discard pile. |
| Bronze Recruit | Ares | 3 | +2 Coins. |
| Forge of Heroes | Ares | 4 | You may trash 1 card from your hand. If you do, gain a card costing up to 2 Coins more than the trashed card to your discard pile. |
| Victorious Procession | Ares | 5 | +2 Coins; +1 Buy; reveal the top card of your deck. If it is a Territory, put it into your discard pile and gain +2 Coins. Otherwise, put it back on top of your deck. |

**Resolution examples:**

- Harbor Pilot spends 1 Action to play and grants 2; with your starting Action, playing it leaves you with 2 Actions.
- Forge of Heroes can turn a cost-2 Hamlet into any available card costing up to 4, including a Drachma or an Action. You may choose a cheaper replacement.
- Harvest Feast draws before requiring a discard. You may discard a card you just drew.
- Victorious Procession gives its initial Coins and Buy even if there is no card available to reveal. Revealing a Territory does not score it or remove it from your possession.

## 9. Leaders

These four leaders are original mythic characters. Each has exactly one god affiliation. Their abilities trigger only on their owner’s turn.

| Leader | God | Once-per-turn ability |
| --- | --- | --- |
| Thaleia, Keeper of the Owl | Athena | After you resolve the first Athena Action you play this turn, +1 Action. |
| Nereon, Heir of the Tide | Poseidon | After you resolve the first Poseidon Action you play this turn, +1 Coin. |
| Melia, Warden of the Fields | Demeter | After you resolve the first Demeter Action you play this turn, +1 Card. |
| Doreios, Bearer of the Red Spear | Ares | After you resolve the first Ares Action you play this turn, you may trash 1 card from your hand. |

“First” refers to the first matching Action actually played, not the first Action drawn or gained. A card whose own effect accomplishes nothing still triggers the leader. Doreios’s opportunity is used when it triggers, even if you choose not to trash a card; it cannot be saved for a later Ares Action.

In addition to the printed ability, every leader contributes **1 Devotion toward their own god** when invoking that god, as described below.

## 10. Gods, Devotion, and invocations

Only gods represented by chosen leaders have event cards in play. These events are shared opportunities; the affiliated leader does not own or exhaust them for other players.

When you invoke an available god during your Buy phase, calculate your **Devotion to that god**:

> Number of Action cards of that god currently in your play area, plus 1 if your leader is affiliated with that god.

Each matching Action card contributes 1. Cards in your hand, deck, discard pile, or trash contribute nothing. Devotion is a value checked for the invocation, not a resource to spend or carry over. It does not grant Coins, Actions, or VP.

At **2 or more Devotion**, use the event’s **Favored effect instead of its Standard effect**. Below 2, use the Standard effect. Invoking never requires a minimum Devotion. Your leader alone is insufficient for the Favored effect: you also need at least one matching Action in play. A player with another leader needs at least two matching Actions in play.

Every invocation costs **1 Buy**, the listed Coins, and your turn’s single invocation allowance. Pay before resolving. You may invoke even if part or all of its effect cannot be completed, but there are no refunds. Invocations do not count as playing Actions and do not trigger leader abilities.

| God event | Coin cost | Standard effect | Favored effect (2+ Devotion) |
| --- | ---: | --- | --- |
| Athena — Counsel of Olympus | 3 | Gain an Action costing up to 4 Coins onto your deck. | Gain an Action costing up to 5 Coins onto your deck. |
| Poseidon — Tribute of the Tides | 3 | Gain a Drachma to your discard pile. | Gain a Drachma onto your deck; +1 Buy. |
| Demeter — Blessing of the Fields | 3 | You may trash up to 2 cards from your hand. | You may trash up to 2 cards from your hand; gain a Hamlet to your discard pile; +1 Buy. |
| Ares — Trial of the Spear | 4 | You may trash 1 card from your hand. If you do, gain a card costing up to 2 Coins more than the trashed card to your discard pile. | You may trash 1 card from your hand. If you do, gain a card costing up to 3 Coins more than the trashed card to your discard pile. |

The bonus Buy from Poseidon or Demeter can purchase a card if you can afford it; it cannot override the one-invocation limit. Demeter’s Favored gain and Buy do not depend on trashing a card and still occur if you trash none. If the Hamlet pile is empty, you still receive the Buy.

**Example:** Nereon plays Harbor Pilot and Sea Trade, then plays two Obols. He has 5 Coins: 2 from Sea Trade, 2 from the Obols, and 1 from his leader. He has 2 Buys from his starting Buy and Sea Trade. With two Poseidon Actions in play and his leader’s affiliation, he has 3 Devotion to Poseidon. He spends 3 Coins and 1 Buy to invoke Tribute of the Tides, gains a Drachma onto his deck, and receives +1 Buy. He now has 2 Coins and 2 Buys; he can buy a Hamlet and an Obol. During cleanup, his new Drachma will be the first card he draws.

## 11. Game end and scoring

At the end of each turn, after cleanup, the game ends if either condition is true:

- The **Acropolis supply pile is empty**.
- **Any three supply piles are empty**, counting both basic and Action piles.

Finish the entire turn even if a pile empties partway through it. There is no final round and no equal-turn adjustment. Leaders, god events, and the trash are not supply piles.

Each player gathers every card they possess, including their hand, deck, discard pile, and any cards left in play. Add 1 VP per Hamlet, 3 VP per Polis, and 6 VP per Acropolis. Unspent resources, Actions, Treasures, leaders, and invocations score nothing. Trashed cards score for nobody.

The highest score wins. If tied, the tied player who took fewer turns wins. If they also took the same number of turns, they share victory. Use the first-player marker and the last active player to determine who received an extra turn in the final round.

## 12. First-turn example

Thaleia draws four Obols and a Hamlet. She has no Actions to play, so she proceeds to the Treasure phase and plays all four Obols for 4 Coins. In her Buy phase she spends 1 Buy and 4 Coins on Council of Sages, placing it in her discard pile. She discards her hand and played Treasures, then draws the five cards remaining in her deck.

On a later turn, Council of Sages costs her 1 Action and draws three cards. Because it is her first Athena Action of that turn, her leader then grants +1 Action. She may spend that Action on another Action in her hand. If she later invokes Athena, Council of Sages in play and her leader together provide the 2 Devotion needed for Athena’s Favored effect.

## 13. Prototype boundaries and playtest notes

Version 0.1 has no reaction cards, effects that persist into later turns, variable-cost cards, private gods, resource banking, or alternative VP sources. All rules needed for the listed components are above; these omissions are scope boundaries rather than unfinished rules.

For each playtest, record player count, chosen leaders, winner, final scores, turns taken, which end condition occurred, and which invocations were used. Review whether every leader offers a useful direction, whether buying an engine competes with buying territory, and whether public gods attract players outside their own bloodlines. Adjust costs and effects only between games, and record any deviations from this version.
