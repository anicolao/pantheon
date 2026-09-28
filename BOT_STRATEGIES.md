# Bot strategy design review

This is a description of the implemented bots, not a claim that their strategy designs are correct. Reviewed against source commit `be60b041e6b742ff4abacbd8a7f618215c29177c` (strategy version 2). Documentation changes do not change policies or archived results.

The Engine correction demonstrated a central limitation: a legal, deterministic bot with many completed games can still implement its named strategy badly. Statistical precision does not validate strategy design. Review the behavioral contracts below before using these bots to make balance decisions.

## Strategy map

| Family | Intended strategic idea | Actual implementation | Design review status |
| --- | --- | --- | --- |
| Treasure | Increase reliable spending power, then score | Fixed purchase list; never voluntarily buys Actions or Worships | Transparent benchmark, deliberately limited |
| Engine | Draw the whole deck, support that draw with Actions, convert it into points | Generic marginal draw-capacity scoring, shared economy/Worship/scoring rules | Draw objective implemented and tested; economy and reliability still heuristic |
| Thin | Remove weak cards to improve deck quality | Shared policy with higher Seed Keeper/Forge scores and income-floor trashing | Deck-quality objective is not implemented |
| Worship | Build access to valuable, preferably Favored, Worship | Shared immediate Worship evaluator plus small matching-god and named-card acquisition bonuses | Does not plan Devotion or future offerings |
| Race | Score quickly and control the ending | Higher Polis/Grove/Procession scores plus shared one-purchase winning-ending override | Does not plan a race or reject losing endings |
| Legacy Draw | Simple Action-buying comparison for the original simulator | Fixed purchase list with named copy limits | Historical baseline; not Engine v2 |

Thin, Worship and Race share almost all control flow and differ mainly in numeric acquisition preferences. All four non-Treasure families Worship. The label “Worship” does not mean other families ignore events. Multiplayer studies currently assign all opponents one family per scheduled matchup; they do not search every combination of opposing families.

Sources: [strategy definitions and shared decisions](scripts/balance/strategy.ts), [Engine scoring](scripts/balance/engine.ts), [Treasure and legacy Draw](scripts/balance/bot.ts), [production effects](src/lib/game/actions.ts).

## What bots can know

Bots receive their hand, unordered owned-card counts, resources, supply, phase, pending choice, leader and trigger-used flag. Study bots additionally receive public played cards, available events, turn counts, public inventory-derived scores and the actual leader trigger effects for the rule variant. Engine receives a count of unseen turn-start cards, maintained from its observed draws and gains. No policy receives the shuffle seed, future deck order or opposing hands.

Public score estimates are exact inventory VP totals for the current card set, not estimates of hidden hands. The ending heuristic uses scores but ignores the fewer-turn tiebreak. All decisions are deterministic; there is no rollout, probability model, opponent policy inference, learning during play or strategic leader drafting.

## Shared decisions: Engine, Thin, Worship and Race

At each decision, the bot follows this order:

1. Resolve a pending choice.
2. Consider an affordable Worship, if Worship capacity remains. If its immediate score clears the threshold, do it before anything else.
3. In Actions, play the highest-priority available Action if Actions remain; otherwise advance phase.
4. In Treasures, play one Treasure, cheapest first. Reconsider Worship before playing the next one so cards can remain available as offerings.
5. If a Buy remains, prefer a detected winning pile-ending purchase; otherwise buy the affordable card with the highest positive utility.
6. End the turn when no purchase is selected.

Utilities are arbitrary comparable scores, not expected VP or victory probabilities. Purchases and gains use the same scores. Acquisitions tie-break by card ID; Action/discard ties generally use instance ID. The purchase heuristic does not plan how to split multiple Buys or preserve money for a later command.

### Common economy and scoring

Let `M` be total owned Treasure face value: Obols + 2×Drachmas + 3×Talents. This is not expected money in a hand or a turn. “Late” means the Acropolis pile is at or below the profile's `scoringAt` threshold; other piles and opponent scores do not affect this transition.

| Card | Acquisition utility |
| --- | --- |
| Acropolis | 14 |
| Polis | 9 when late or playing Race; otherwise 0.4 |
| Hamlet | 2.5 when late; otherwise −1 |
| Obol | 1 if M < 5; otherwise −2 |
| Talent | 6 when late; otherwise 9 |
| Drachma | max(1, 6.5 − 0.35×max(0, M−10)) |
| Unique starting Temple | 1; not normally acquirable |

Acropolis is not an unconditional first choice for these four families: an Action with utility above 14 can beat it. Action utilities are multiplied by 0.35 when late. There is no model of how many future shuffles remain before buying an investment or a scoring card.

The ending override looks for an affordable last Acropolis, or last card in a third empty pile, that would put the bot strictly ahead of every opponent in VP. It does not model later commands before cleanup, tied-score turn counts, opponent responses, gains that end piles, or coordinated multi-buy endings. It does not veto a losing ending selected by ordinary utility.

### Trashing, discarding and gaining

Ordinary optional trashing removes Hamlets before late game and Obols while retained nominal Treasure value stays above `moneyFloor`. It never deliberately trashes another card type, and it stops this ordinary trashing entirely when late. Forge and Worship offerings are evaluated separately and can trash other card types.

Retention loss is −2 for a disposable Hamlet/Obol, twice VP for a Territory, and otherwise at least 1 using acquisition utility. Engine instead values owned Actions by their marginal contribution when removed and restored. Other families still use the value of buying an additional copy as a proxy for losing an existing copy; this can undervalue important cards with declining copy scores.

Mandatory discards take Territories first, then lowest retention loss. This does not generally evaluate this turn's remaining spending or play sequence. Optional gains require positive utility; mandatory gains take the best eligible card even when its utility is poor.

Offering/Forge choices enumerate zero, one or two hand cards, as allowed, and maximize gained-card utility minus retention losses. Only a strictly positive improvement is accepted. The calculation does not model topdeck timing, the resulting hand's execution, or long-term income distribution.

### Shared Worship evaluator

Favored status is detected from at least two played Actions matching the event's god. Any available god may be used, including off-god Worship. The utility of each affordable event is reduced by:

- the best single purchase's utility lost by spending the event cost, if any Buys remain;
- an additional 0.5 per Coin of event cost.

The best event is used only when its net utility strictly exceeds `worshipMargin`.

| Event | Immediate estimated benefit |
| --- | --- |
| Counsel of Olympus | Best eligible Action gain costing up to 3, or 5 when Favored; +1 utility in Actions |
| Tribute of the Tides | Drachma acquisition utility if available; +1 when Favored and no Buys remain |
| Blessing of the Fields | Standard: 2 per disposable card, up to two; Favored: best combined-cost offering improvement |
| Trial of the Spear | Best one-card offering improvement using +1 gain limit, or +3 when Favored |

This evaluator does not compare Worship now with Worship after another Action establishes Favored, anticipate money from unplayed Treasures, or plan multiple Worships. It compares only the best single displaced purchase, not a complete turn. These limitations affect every non-Treasure family, including Engine.

## Treasure and legacy Draw

Treasure uses the original benchmark controller, bypassing the shared decisions above. Its first affordable, available purchase is Acropolis; then late Polis (three or fewer Acropolises); then Talent; then Drachma; then late Hamlet. It never buys an Action voluntarily and never Worships. It plays starting or gained Actions and all Treasures together. Its profile parameters are ignored.

For forced gains it tries the same preference list, then the most expensive legal card if the gain is mandatory. Optional unwanted gains are declined. Discards order Territories first, then card cost. Before late game it trashes Hamlets and Obols when total Treasure value is at least 8. Unlike the shared controller, that trash eligibility is not recomputed after each selected Obol, so multi-card trashing can cross its apparent income threshold.

Legacy Draw uses this same controller but inserts, after Talent and before Drachma, up to four Sacred Academies, one Harbor Pilot and one Council while not late. It has no full-deck objective and remains distinct from Engine v2. Both original policies use the non-Engine Action ordering described below.

**Review contract:** Treasure should provide a stable money benchmark, not a best possible economy strategy. Its no-Worship restriction makes it unsuitable as the only evidence about event or leader balance. Legacy Draw should not be used as evidence that a mature engine strategy has been tested.

## Engine v2

**Intended contract:** Buy enough executable draw to see the whole deck; buy Action support when draw would otherwise be stranded; then convert a functioning engine into points.

The implementation models deck size and printed effects, allocating one starting Action plus extra Actions from nonterminal cards and one matching leader trigger. It counts nonterminal draw and allocates remaining terminal slots to the biggest terminal draw effects first. Mandatory discards reduce estimated net draw. It assumes the supporting cards can be reached, so this is optimistic capacity rather than a shuffle simulation.

The draw target is deck size minus the opening five cards, plus a reliability margin of two. After Actions, spare Actions with unseen cards increase that margin by up to three. A candidate is evaluated by adding it to the deck, including its own deck-size cost:

- Each unit of reduced draw deficit earns 6 utility, multiplied by 1.25 when Actions remain with unseen cards.
- Each unit of unlocked previously stranded draw earns 2.
- Printed Coins earn 2 each; a gain effect contributes min(2, gain-limit/3).
- Trashing scores remaining junk demand at 6 per unit, discounting existing trash capacity. This uses Hamlets and Obols beyond three, not an expected-income model.
- Useful filtering adds 0.5 per discard up to junk count. Printed Buys earn 1 each when nominal draw already covers the deck.
- Add a base 2, then apply the late-game multiplier.

There are no named opening rules or draw-copy limits. Actual leader Actions/draw enter capacity; leader Coins also enter play ordering. The model does not fully value leader trashing, Worship capacity, reveal effects, topdeck timing, or the usefulness of the particular cards a gainer can obtain. Terminal non-draw payload is not explicitly discounted for competition over Actions.

Play priority is 4×useful draw + 2×Actions + Coins + 0.5×printed trash, including the unused matching leader's draw/Actions/Coins. A 20-point penalty discourages using the last Action while another Action remains in hand. That penalty is heuristic and can also apply when none of those other Actions supplies Actions.

**Evidence:** Tests cover draw demand growing with deck size, no draw-copy cap, support when blocked, public trigger variants, play ordering, retention and draw accounting. The [latest comparison](balance-results/engine-cycle-v1/README.md) measures actual full-deck phases. It does not establish optimal engine construction. Shared economy, Worship, scoring transitions and ending limitations still apply.

## Thin

**Intended contract for review:** Trash when the expected improvement in future hands outweighs the lost payload, preserve sufficient income, and stop buying thinning tools when their remaining work is small.

**Implemented:** Higher Seed Keeper and Forge scores, slightly lower Sacred Academy score, and the shared trash/upgrade/retention rules. It has no target deck composition, money-per-hand estimate, time-to-payoff model or general valuation of removing a card. Forge's acquisition score does not inspect remaining useful upgrade targets. Ordinary trashing shuts off solely because the Acropolis threshold is reached.

**Review examples to agree before changing it:** A weak Treasure can be useful to keep before replacing income but harmful afterward; a second trashing card should depend on remaining junk and time; an obsolete Action may be worth trashing; a late trash that enables a winning hand should not be rejected merely by the scoring threshold. These are proposed behavioral contracts, not claims that current tests establish them.

## Worship

**Intended contract for review:** Build and sequence a deck that obtains worthwhile Worship effects, including Favored access, while accounting for offering cards, money and competing uses of those resources.

**Implemented:** The shared immediate event evaluator, +1 utility for matching-god Actions while owning fewer than two copies of that specific card, higher Bronze Recruit value, and higher Oracle's Acolyte value when Counsel is available. The matching-god bonus counts copies of each card, not total Devotion or probability of playing two matching Actions together. It does not explicitly value future Worship capacity or choose plays to establish Favored before spending Worship.

**Review examples:** Wait for an available second matching Action before Worship when doing so improves the effect; preserve a valuable offering instead of automatically playing it; prefer a useful off-god event when its net payoff is higher; decline Devotion investments that do not improve achievable Worship. Existing tests cover some immediate offerings, Favored gains and after-buy Worship, not this whole design.

## Race

**Intended contract for review:** Maximize points before the likely ending, control pile depletion and avoid ending behind when a better continuation exists.

**Implemented:** Polis always has utility 9; Sacred Grove and Victorious Procession receive higher scores; the shared winning-purchase override remains available. No estimated game horizon, pile-control plan, opponent tempo model, multi-gain ending search or general losing-ending veto exists. The production reducer still applies correct VP and tiebreaks; the bot does not reason fully about them.

**Review examples:** Avoid an immediate losing ending when passing preserves a chance; deliberately end with a win; handle tied VP using turns taken; choose between investment and points based on likely remaining turns; recognize a gain or a sequence of purchases that completes a winning third pile. These goals are not established by legal-game completion tests.

## Exact named-card scores outside Engine

This table applies to Thin, Worship and Race before the 0.35 late multiplier. `n` means copies owned of that card, `C` is `engineCopies`, `S` is total deck size. `T` is the number of owned Actions with no printed +Action. Thaleia's support allowance here remains hardcoded to 1 even under the +2A variant; only Engine's generic model was corrected.

| Action | Utility |
| --- | --- |
| Sacred Academy | 10 − 1.3n − 4×max(0,n−C); subtract another 1 for Thin |
| Council of Sages | (9.5 for Thaleia, otherwise 6) − 2n |
| Harbor Pilot | 9 if T > n + (1 for Thaleia, otherwise 0); otherwise 4−n |
| Merchant Fleet | 8.5−n |
| Sea Trade | 7−2n |
| Seed Keeper | (11 for Thin or Melia, otherwise 8) − 12n − (8 if S<9) |
| Harvest Feast | (9 for Melia, otherwise 6) − 2n |
| Sacred Grove | (10 for Race, otherwise 6) − 3n |
| Bronze Recruit | (7 for Doreios or Worship, otherwise 4) − 2n |
| Forge of Heroes | (10 for Thin, otherwise 5) − 10n |
| Victorious Procession | (9 for Race, otherwise 5) − 2n |
| Oracle's Acolyte | (8 for Worship with Counsel available, otherwise 3) − 3n |

Worship adds its +1 matching-god bonus after these adjustments when n<2. Unrecognized supply Actions receive zero base value in this switch. `engineCopies` is a soft penalty threshold only for Sacred Academy here, not a general cap on Actions or draw.

Non-Engine play ordering gives a Council with unused Thaleia trigger priority 100; otherwise it scores 20 per printed +Action and 1 per printed draw. It does not evaluate actual trigger amounts, current draw need, terminal payload or Devotion sequencing.

## What training changes

| Preset | Acropolis late threshold | Academy soft threshold | Retained Treasure floor | Worship margin |
| --- | ---: | ---: | ---: | ---: |
| 0 | 3 | 3 | 7 | 0.5 |
| 1 | 5 | 2 | 9 | 1 |
| 2 | 2 | 5 | 6 | 0 |

Training selects one of these three bundled presets per leader, family and player count by victory share against fixed Treasure and Engine preset-0 references, across relevant leader/seat assignments. Ties keep the first candidate. Engine ignores the Academy threshold; Treasure ignores all four parameters. Training does not learn the utility weights, purchase tables, objectives or decision order, and cannot repair a missing design concept.

The heads-up counter search offers one Treasure configuration and three presets for each other family: 13 rivals. It chooses the lowest Thaleia share per family, then her best minimum. “Best counter” therefore means best among this small declared population. See [training](scripts/balance/study.ts) and [counter selection](scripts/balance/counter.ts).

## Review priorities and validation boundary

| Priority | Concern supported by code inspection | Design decision to settle |
| --- | --- | --- |
| 1 | Worship is evaluated before actions without planning Favored | When should it wait, and how should acquisition value Devotion? |
| 1 | Thin uses nominal total income and fixed junk classes | What deck-quality and income-reliability objective should govern trashing? |
| 1 | Race lacks a losing-ending veto and horizon model | What ending search and opponent-tempo model are required? |
| 2 | Shared scoring uses one pile threshold and arbitrary utility scales | How should future income/draw be compared with immediate VP? |
| 2 | Non-Engine leader/copy heuristics are static | Should all families use generic capacity and actual trigger effects? |
| 2 | Non-Engine retention uses extra-copy purchase value | How should discards, offerings and upgrades value the owned copy? |
| 2 | Engine is optimistic about draw accessibility and payload execution | What reliability and Action-contention model is sufficient? |

These are design findings, not measured estimates of how much each issue changes wins. The existing tests establish legal execution, replay, information isolation and specific local behaviors; they do not certify strategic soundness. Source review identified the gaps above without changing policies or rerunning balance outcomes.

A useful next review is one family at a time: agree its objective and concrete decision examples, write behavioral tests for those examples, inspect game traces for whether the intended behavior occurs, then retrain and rerun both balance arms with equal budgets. Retain the simple Treasure benchmark and use fresh evaluation seeds for confirmation after the design choices are settled.
