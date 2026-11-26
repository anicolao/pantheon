# Four new divine houses: proposed rules and cards

Status: **design proposal for review, not implemented or balance-tested**.

This draft adds four leaders with distinct engines. All names, costs, limits, and patron assignments below are proposed starting points. The current rules remain authoritative until we agree on this design.

## 1. The four identities

| Leader | Proposed patron | Engine | What the player does |
| --- | --- | --- | --- |
| Echo, Voice of the Thunder | Zeus | Repeat opponents’ effects | Choose from a public record of opponents’ last turns and resolve an effect for herself. |
| Theseus, Walker of the Labyrinth | Hermes | Find cards in his own deck | Reveal a bounded number of cards, keep a useful one, and discard the rest. |
| Achilles, Spearhead of Victory | Nike | Play groups of Actions | Commit several cards together, then resolve them in a chosen order without spending an Action on each. |
| Perseus, Bearer of the Gorgon | Hades | Temporarily immobilize an opponent’s card | Put a Bind marker on an opponent; on their next turn they must set aside one playable card. |

**Patron choice needs agreement.** Echo/Zeus follows the requested pairing. Hermes, Nike, and Hades are proposed game affiliations to give the other three leaders new, distinct houses; they are not claims of exclusive mythological patronage. The mechanics can be reassigned or renamed without changing their rules.

For Perseus, this draft interprets “immobilize players” as temporarily denying access to one card, rather than skipping a player’s turn. They still take all their phases and can play their remaining cards.

## 2. Setup and shared rules

- Keep games at **2–4 players** and retain equal turns. Eight available leaders does not mean eight seats.
- Draft from all eight leaders using the existing reverse-order draft. Each leader remains unique.
- Starting decks remain **6 Obols, 3 Hamlets, and the chosen leader’s Temple**.
- Each new Temple is an Action, costs 0 for comparisons, has its patron’s affiliation, and reads **“+1 Worship; +1 Action.”** There is one unique starting copy and no Temple supply pile. Temples cannot be bought or gained.
- Add the three supply Actions for each new house to the existing twelve: **24 Action piles** in the full expansion prototype. Each pile has 8/12/16 copies in a 2/3/4-player game. All remain available regardless of the leaders chosen.
- Only chosen leaders’ worship events enter play. Every player may use those events, including events outside their own affiliation.
- Worship costs **1 Worship resource plus the printed Coin cost**, uses no Buy, and ordinarily uses no Action. Favored requires at least **2 matching Action cards actually in play**, checked when you pay to use the event. Resolve Favored **instead of** Standard.
- Each leader triggers once per own turn, after resolving the first Action played with their patron’s affiliation. Playing another house’s Action does not trigger that leader. Starting Temples qualify.
- Gains go to discard unless a card explicitly says otherwise. New effects do not change card ownership, printed costs, supply exhaustion, scoring, or end conditions.

Adding twelve piles makes the market larger and makes the three-empty-pile ending less likely. For the first prototype, retain all existing pile sizes and ending rules; evaluate a smaller selectable market separately after the mechanics are agreed.

## 3. Echo / Zeus — borrowed effects

### Public memory

Keep a public record of the **Action card names each opponent actually played during their most recently completed turn**. Replace that opponent’s record when they finish their next turn. Before someone has completed a turn, their record is empty.

At the start of your turn, take a snapshot of those opponents’ records. This is **your Echo menu** for the whole turn. It contains card definitions, not physical cards, and identical names appear once. It never includes your own plays, Treasures, leaders, or worship events. A recorded Temple is allowed even if its owner has since trashed it.

For the initial design, exclude every Action whose text instructs a player to **Echo** or **Deploy**. This exclusion applies even if that instruction is optional. It prevents copying from recursively invoking more copies or groups of card plays. Ordinary draw, discard, trash, gain, resource, Seek, and Bind effects are eligible.

### Echo an Action costing up to N

Choose one eligible Action from your Echo menu with printed cost at most N. Resolve its entire printed effect once, as though its instructions were addressed to you.

- Make fresh choices using your own hand, deck, and resources and the current supply. Do not reproduce the opponent’s choices or assume they are still legal.
- Pay every cost and meet every condition in the copied text. Copying Forge of Heroes still requires trashing one of your cards before gaining anything.
- Resolve a copied attack against your opponents, never yourself.
- No physical copy is gained, moved, or played. No extra Action is spent, no leader is triggered by the copied definition, and no Devotion is added for it.
- The Zeus card you actually played remains in play and supplies Zeus Devotion normally. It can trigger Echo’s leader ability after its full effect resolves.
- Repeated effects are not added to anyone’s public play record. An eligible name may be selected again by a later Echo effect in the same turn.
- Echo is optional. If the menu has no eligible card, skip the Echo instruction and continue resolving the rest of the source card.

### Proposed cards

| Card | Type | Cost | Exact proposed text |
| --- | --- | ---: | --- |
| Echo, Voice of the Thunder | Leader · Zeus | — | After you resolve the first Zeus Action you play this turn, choose an eligible Action in your Echo menu with an unconditional printed +Cards, +Actions, +Coins, +Buys, or +Worship bonus. Gain 1 of one resource named by such a bonus; for Cards, draw 1 card. |
| Temple of Zeus | Unique starting Action · Zeus | 0 | +1 Worship; +1 Action. |
| Borrowed Voice | Action · Zeus | 2 | +1 Action. Choose an eligible Action in your Echo menu with an unconditional printed +Cards, +Actions, +Coins, +Buys, or +Worship bonus. Gain 1 of one resource named by such a bonus; for Cards, draw 1 card. |
| Thunder’s Answer | Action · Zeus | 4 | You may Echo an Action costing up to 4. |
| Chorus of Olympus | Action · Zeus | 5 | +1 Action. You may Echo an Action costing up to 5. |
| Reverberation | Worship event · Zeus | 3 | **Standard:** You may Echo an Action costing up to 3. **Favored:** You may Echo an Action costing up to 5. |

For the leader and Borrowed Voice, choose only a bonus directly printed on the recorded card, not a bonus generated by another effect or behind a condition. A printed “+2 Cards” permits drawing **one** card. A Temple permits +1 Action or +1 Worship. Without an eligible bonus, gain nothing. Borrowed Voice does not itself contain an Echo instruction and may appear in an Echo menu; its bonus-selection effect reads the current player’s fixed menu and never resolves another card, so it cannot recurse.

**Example:** An opponent played Sacred Academy last turn. Echo plays Temple of Zeus, gaining its normal resources. Her leader may borrow the Academy’s draw bonus to draw one card. Later, Chorus of Olympus can repeat the Academy’s complete printed effect. The Academy adds no Athena Devotion and cannot trigger an Athena leader through this repetition.

**Tradeoff:** Echo gains flexibility from opponents’ engines, but has little to copy on the opening turn. She cannot copy another Echo card’s repeat instruction or a Deploy engine.

## 4. Theseus / Hermes — navigate the deck

### Seek N for a stated card type

Reveal up to N cards from the top of your deck. Once the reveal finishes, choose up to one revealed card of the stated type, put it into your hand, and discard all other revealed cards. “Any card” also permits Treasures and Territories. You may choose none.

- Revealed cards wait in a separate face-up area until the whole Seek finishes. They are not in the deck, hand, discard, or play area during the reveal.
- If the deck empties before N cards have been revealed, shuffle the existing discard pile and continue. The cards held in this Seek’s reveal area cannot be shuffled back into the same Seek.
- If both available piles run out, stop revealing and make the choice from the cards found.
- Revealing fewer than N is allowed only when there are no cards left to reveal; the “up to” accounts for exhaustion, not an early-stop choice.
- Finding a card is not gaining or playing it. It generates no resources, Devotion, or leader trigger until played normally.
- Seek reveals information, so it creates an undo boundary even when no card is kept.

### Proposed cards

| Card | Type | Cost | Exact proposed text |
| --- | --- | ---: | --- |
| Theseus, Walker of the Labyrinth | Leader · Hermes | — | After you resolve the first Hermes Action you play this turn, Seek 2 for an Action. |
| Temple of Hermes | Unique starting Action · Hermes | 0 | +1 Worship; +1 Action. |
| Ariadne’s Thread | Action · Hermes | 2 | +1 Action. Seek 3 for a Treasure. |
| Labyrinth Scout | Action · Hermes | 4 | +1 Action. Seek 4 for an Action. |
| Wayfinder | Action · Hermes | 5 | +1 Card; +1 Action. Seek 3 for any card. |
| Open the Hidden Way | Worship event · Hermes | 3 | **Standard:** Seek 4 for any card. **Favored:** Seek 6 for any card; +1 Action. |

The extra Action from Favored is immediately usable if you are still in the Actions phase. It does not reopen that phase after you have moved on. A Treasure found during the Buy phase cannot be played that turn. You may use the event at any normal worship opportunity, even when its best use would have been earlier.

**Example:** Theseus plays his Temple and his leader Seeks 2 for an Action. He reveals a Hamlet and Harvest Feast, keeps Harvest Feast, and discards the Hamlet. His Temple left an Action available, so he can now play Harvest Feast normally.

**Tradeoff:** Searching gives selection and rapid cycling, but discards potentially valuable cards along the way. Theseus can find an Action without having enough Actions left to play it.

## 5. Achilles / Nike — commit a formation

### Deploy up to N Actions

Choose up to N Action cards currently in your hand, choose their order, and commit them face up to a reserved group. Resolve the group in that order. For each card, move it into play and resolve it **without spending an Action**.

This is the precise meaning of “play multiple cards at once”: selection and commitment happen together, but card effects resolve sequentially so choices, draw effects, and attacks have a definite order.

- The group is fixed before its first card resolves. Cards drawn during the group cannot be added to that group.
- Reserved cards are no longer in hand and are not yet in play. They cannot be discarded, trashed, selected by another Deploy, or counted for Devotion until their own play begins.
- Each deployed card is an actual play: it contributes its god’s Devotion, appears in the public play record, and may trigger its owner’s leader.
- The source Action still costs the normal 1 Action when played from hand. Its deployed cards cost none. Resources printed on deployed cards are gained normally.
- A deployed card may itself Deploy. Finish its nested group before continuing the outer group. All reserved cards remain unavailable to nested selections.
- No voluntary purchase, worship, or ordinary card play can interrupt a resolving group. Required choices and leader effects resolve at their defined timing.
- A worship event that says Deploy explicitly permits those Action plays even during the Treasure or Buy phase. This does **not** reopen the Actions phase or allow other Actions to be played from hand afterward. Any Actions generated remain unused if the Actions phase is already over.
- Deploying zero cards is legal. Deploy never plays Treasures or Territories.

### First-matching-Action timing

When the first matching Action enters play, mark the leader’s once-per-turn trigger as claimed immediately. Resolve the leader ability **after that Action’s complete effect**, including any nested Deploy groups. Matching Actions inside that effect cannot claim another trigger. This extends the existing “first matching Action, then its leader” rule to nested plays without duplicating triggers.

### Proposed cards

| Card | Type | Cost | Exact proposed text |
| --- | --- | ---: | --- |
| Achilles, Spearhead of Victory | Leader · Nike | — | After you resolve the first Nike Action you play this turn, you may Deploy 1 Action. |
| Temple of Nike | Unique starting Action · Nike | 0 | +1 Worship; +1 Action. |
| Rallying Cry | Action · Nike | 2 | +1 Card. You may Deploy 1 Action costing up to 3. |
| Myrmidon Vanguard | Action · Nike | 4 | +2 Coins. You may Deploy 1 Action. |
| Phalanx Advance | Action · Nike | 5 | +1 Card. You may Deploy up to 2 Actions. |
| March of Victory | Worship event · Nike | 3 | **Standard:** You may Deploy 1 Action. **Favored:** You may Deploy up to 2 Actions. |

A cost restriction on Deploy applies separately to each selected card, using printed costs. Temples qualify as cost-0 Actions. Their usual “cannot be bought or gained” restriction does not prevent playing them through Deploy.

**Example:** Achilles plays Phalanx Advance as his first Nike Action. Claim his leader trigger, draw one card, then commit Harvest Feast and Sacred Academy. Resolve Harvest Feast completely, then Sacred Academy. After the entire Phalanx effect finishes, Achilles’s leader may Deploy one more Action from his now-current hand, including a card just drawn. His leader cannot trigger again during any of those plays.

**Tradeoff:** Achilles can use several terminal Actions together, but must assemble them in hand. Grouping alone does not draw his deck, and reserved cards cannot be used as trash or discard payment while another group member resolves.

## 6. Perseus / Hades — bind, recover, retaliate

### Bind an opponent

Choose one opponent who has no pending Bind marker and is not currently resolving a Bound turn. Give them one public Bind marker. Bind effects are optional; if no eligible opponent exists, skip that instruction.

At the start of the marked player’s next turn, after setting their normal turn resources and before any voluntary action:

1. Consume the marker and mark this as a Bound turn.
2. The affected player chooses one **Action or Treasure** from their hand and places it face up in a locked area. Territories cannot be chosen. If there is no eligible card, reveal the hand to establish this and lock nothing.
3. The locked card cannot be played, discarded, trashed, exchanged, or targeted by other effects during that turn. It is not in hand or in play, supplies no Devotion, and remains owned by that player for scoring.
4. At cleanup, move the locked card to the discard pile **before shuffling or drawing the next hand**. Clear the Bound-turn status. The next turn can proceed normally unless a fresh marker is applied after this cleanup.

An opponent can have at most **one pending marker**. Repeated Bind effects cannot stack, refresh, extend, or reserve additional missed turns. A player currently taking a Bound turn cannot acquire another marker until that turn ends. There is no permanent immunity: opponents may Bind them again between later turns. Multiple players attacking the same opponent still lock at most one card for that turn.

There are no out-of-turn defensive choices. The attacker chooses whom to mark during their own effect; the defender chooses which eligible card to lock when their own turn starts. On a shared tabletop, only that active defender’s hand needs to be revealed normally; the selected locked card is public.

### Proposed cards

| Card | Type | Cost | Exact proposed text |
| --- | --- | ---: | --- |
| Perseus, Bearer of the Gorgon | Leader · Hades | — | After you resolve the first Hades Action you play this turn, you may Bind one opponent. |
| Temple of Hades | Unique starting Action · Hades | 0 | +1 Worship; +1 Action. |
| Polished Shield | Action · Hades | 2 | +1 Card; +1 Action. If you have a locked card, return it to your hand. |
| Gorgon’s Gaze | Action · Hades | 4 | +2 Coins. You may Bind one opponent. |
| Harpe Bearer | Action · Hades | 5 | +2 Cards. You may Bind one opponent. |
| Stillness of the Underworld | Worship event · Hades | 3 | **Standard:** +1 Coin. You may Bind one opponent. **Favored:** +2 Coins. You may Bind one opponent. |

Polished Shield is the explicit exception to the locked-card targeting rule. Once returned, the card behaves normally in hand. The turn remains marked Bound until cleanup, preventing another Bind during that turn. The defender may choose to lock their Shield, but then cannot play it to free itself; another Shield in hand can rescue it. Everyone may buy Shields, and using one requires an Action as usual.

Worship’s Coin bonus is received **after** paying its full cost. Standard therefore costs a net 2 Coins, Favored a net 1 Coin, plus the Worship resource in either case. No target is required to receive the Coin bonus. It never refunds Worship.

**Example:** Perseus plays his Temple and marks Melia. At the start of her next turn, Melia chooses an Obol from her hand to lock. She may play her other cards and take her usual phases. If she plays Polished Shield, she draws one card, gains one Action, and returns the Obol to her hand; she may later play that Obol during Treasures. Without the Shield, it returns to discard at cleanup.

**Tradeoff:** Perseus slows an opponent without adding points or thinning his own deck. The defender controls which eligible card is lost and can buy an answer. In multiplayer, choosing the target is strategically significant; target selection and frequent repeat attacks need explicit playtesting.

## 7. Cross-house rulings

| Situation | Proposed ruling |
| --- | --- |
| Echo repeats Labyrinth Scout. | Seek her own deck. No Hermes card enters play and no Hermes leader triggers. Revealed information still blocks undo. |
| Echo repeats Gorgon’s Gaze. | Gain its Coins and optionally Bind an eligible opponent. No Hades Devotion is added. |
| Echo tries to repeat Phalanx Advance, Rallying Cry, or Thunder’s Answer. | Ineligible: their text instructs Deploy or Echo. |
| Echo repeats an Action during worship in the Buy phase. | Resolve that effect, including drawing, gaining, or resources. It does not reopen earlier phases; newly drawn Treasures cannot be played. |
| Achilles Deploys a Zeus Action. | That card uses Achilles’s Echo menu, based on Achilles’s opponents. Echo’s leader ability belongs to Echo, not the Zeus card. |
| Achilles Deploys a Hermes Action. | Resolve its Seek before the next reserved Action. A selected card cannot join the already committed outer group. |
| Theseus finds Phalanx Advance. | Put it in hand. Playing it later still costs an Action unless another effect Deploys it. |
| A group contains two Actions matching the owner’s leader. | Only the first matching Action claims the trigger. The trigger resolves after that card’s complete effect. |
| A player is Bound but has five Territories. | Reveal the hand; lock nothing. The marker is consumed and the turn is still Bound until cleanup. |
| A Bind marker is placed on someone who will not get another turn before the game ends. | It has no gameplay effect. It scores no points and grants no extra turn. |
| A locked card is still outside the deck when scoring occurs. | It remains owned and would count for any applicable scoring; normal final cleanup returns it to discard first. |
| Undo crosses a draw, Seek, or new hand reveal. | Unavailable under the existing new-information rule. A committed card group or lock selection is an atomic choice; no half-selected state enters the game log. |

## 8. Presentation needed for an understandable prototype

- **Echo:** show her public Echo menu beside the source card. Choosing an entry highlights the opponent turn it came from. Animate an effect copy, not movement or theft of the opponent’s physical card. Observers see the selection and result. For physical play, record names in a small public ledger; no supply copies are removed to represent memories.
- **Theseus:** reveal cards in the center, choose one into hand, and move the rest to discard. Show each reveal to observers. Keep currently revealed cards out of shuffle counts until the choice finishes.
- **Achilles:** select and order the whole group in hand, then place it in a reserved row. Move each card into play as its turn to resolve arrives. Observers can see the commitment order and all nested plays. A group never appears to resolve simultaneously in the log.
- **Perseus:** show a Bind marker on the chosen leader, a clear start-of-turn lock choice, and the locked card beside the affected player. Display when it will return. Animate Shield recovery and cleanup. No modal or input is required from an inactive player.
- Provide concise reminder text for Echo, Seek, Deploy, and Bind on inspection. The printed prototype must include the same timing and public-record aids; none of these rules may rely on hidden digital bookkeeping.

## 9. Decisions to approve before implementation

1. **Patrons and names:** accept Hermes/Nike/Hades for Theseus/Achilles/Perseus, or choose different affiliations.
2. **Echo scope:** approve copying complete effects from opponents’ latest completed turns, with Echo/Deploy cards excluded, and a one-resource leader trigger.
3. **Search scope:** approve bounded public reveals with unchosen cards discarded; this is selective cycling, not searching the entire deck for a guaranteed named card.
4. **Group timing:** approve committing several Actions at once and resolving sequentially, including the explicit phase exception for Nike’s worship event.
5. **Immobilization severity:** approve one defender-chosen Action/Treasure locked for one turn, the non-stacking limit, and Polished Shield as a universal purchasable answer. Whole-turn skipping is a separate, substantially harsher alternative.
6. **Market size:** accept 24 Action piles for the first prototype, retaining 2–4 seats and the current ending rules.
7. **Starting values:** approve these costs and numbers as experimental, then tune with human play and fresh bot evaluations. Existing RL models have not learned these mechanics and cannot establish balance without further work.

The first balance review should look particularly at Echo copying high-efficiency draw engines, Wayfinder plus Theseus’s extra Seek, Achilles chaining terminal draw cards, and whether recurring Bind markers make the defender’s turns frustrating. Track win shares, ending turns, actual locked-card impact, and target concentration rather than assuming the original leaders’ balance carries over.
