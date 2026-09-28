# Bot strategy design reference — version 7

This reference describes implemented behavior. The [defect ledger](BOT_DEFECTS.md) records the concrete corrections and regression coverage. Bots are deterministic public-information heuristics, not optimal players. Earlier studies remain reproducible at their recorded source commits; their outcomes do not describe this version.

The completed [standard-rule v4 matrix](balance-results/all-leaders-v4/README.md) covers every leader pair and all five strategy families **at policy v4**. Treasure changed in v5; the [paired v4→v5 rerun](balance-results/all-leaders-v5/README.md) records its effect. Engine remains the highest-share family for all leaders, while Treasure loses share in every matchup against Engine.

## The five families

| Family | Objective and implementation |
| --- | --- |
| Treasure | Big money through expected hand income. Considers every card, including Actions; takes affordable top-value points, otherwise maximizes the resulting deck’s expected spendable Coins or takes lesser points that preserve at least $8 EV. Recomputes after every buy and retains known-ending protection. Does not Worship. |
| Engine | Builds executable whole-deck draw, buys support when draw is blocked, then converts income to points. Generic effect-based scoring; no named opening or draw-copy cap. |
| Thin | Favors economically useful removals and upgrades. Scores trashing tools by remaining work; uses joint before/after deck evaluation and current-turn opportunity costs. Other Actions receive 0.8× Engine utility. |
| Worship | Builds achievable two-Action Devotion and uses worthwhile events. Actions receive 0.8× Engine utility plus marginal Favored-access value; tools use remaining-work value plus Devotion value. |
| Race | Prefers points earlier and discounts investments as the ending approaches. Polis always has scoring utility. Other Actions receive 0.45× Engine utility plus printed Coin/gain payload discounted by remaining time. Shares safe ending and multi-buy planning. |

All four non-Treasure families Worship. Their objectives and weights differ, but they share execution, information limits, ending protection and many evaluators. Legacy `draw` remains a separate fixed-list historical baseline, not a sixth study family. The original simulator's source version must also match when reproducing old archives.

## Information and decision order

The observation contains the bot's hand, unordered owned inventory, public supply/events/played cards, resources, phase, pending choice and actual leader trigger effects. Public inventory ledgers supply opposing VP, turns and approximate income (five-card nominal Treasure/printed Action income). Engine's unseen-card count comes from observed own draws and gains. No policy receives the seed, hidden draw order or opposing hands.

Study decisions resolve choices first, consider whether a legal known Action sequence should establish Favored, compare available Worship against displaced purchases, play Actions, play Treasures one at a time, execute a purchase plan, then end. Treasure plays its Treasures together and bypasses Worship. Forecasts never fabricate cards from an unseen draw.

Source: [money EV](scripts/balance/money.ts), [controller](scripts/balance/strategy.ts), [planning](scripts/balance/planning.ts), [Worship](scripts/balance/worship.ts), [Engine](scripts/balance/engine.ts), [Thin](scripts/balance/thin.ts), [benchmark](scripts/balance/bot.ts).

## Game horizon and common scoring

A public horizon `H` is the minimum of six turns, `1.5 × Acropolises remaining / players`, `1.5 × cards remaining in the three smallest piles / players`, and `Acropolises remaining / (1 + sum(opponent nominal income / 8))`. It reaches zero for an ending already triggered. This is an explicit pressure estimate, not a learned forecast. It responds to third-pile danger and publicly richer opponents.

For the four non-Treasure families, a profile enters its late scoring mode when H is at most `scoringAt`. Acropolis utility is 14; Polis is 9 when late or playing Race, otherwise 0.4; Hamlet is 2.5 late, otherwise −1. Talent is 6 late, otherwise 9. Drachma is `max(1, 6.5 − 0.35 × max(0, nominal owned Treasure value−10))`. Obol is 1 below five nominal Treasure Coins, otherwise −2. These utilities compare investment and points heuristically; they are not expected VP or probabilities.

There is no longer a named Action purchase-score table for the study families. Action value comes from effects, owned composition, actual trigger capacity, time and family objective. The `engineCopies` preset field is retained for artifact compatibility but is unused by v5 study policies. Utilities for extra copies in a multi-buy basket are recomputed with preceding copies of that card added.

## Ending and purchase planning

The planner evaluates all affordable bounded purchase quantities across remaining Buys and supply. Dynamic programming retains nondominated utility/VP alternatives per spending, Buy count and depleted-pile mask. It prefers guaranteed positive-share endings and rejects a known losing ending when continuation is available. It can combine purchases to turn a losing single-card ending into a win. Replanning occurs after each purchase.

Ending evaluation uses actual VP and the production fewer-completed-turns tiebreak, including the current turn at cleanup. Gain choices avoid losing pile endings when a safe gain exists; optional gains can decline. A gain that initially loses may still be accepted if a known remaining purchase sequence rescues it. Mandatory gains can be unavoidably losing if every legal choice loses. Thin removal/replacement evaluation also checks ending consequences.

The planner is exact for the enumerated purchase quantities and retained utility/VP frontier, not a full game-tree solver. Utilities for different card types are separable within a basket and reevaluated after actual purchases. It does not plan arbitrary future Actions, Worship chains, unknown draws or opponent turns. Positive split-tie endings may be preferred to an uncertain continuation.

## Treasure: expected hand income with scoring (v6)

The previous Treasure policy was a fixed Acropolis/Talent/Drachma priority list that excluded Action purchases. That was a restricted baseline, not the requested big-money objective. Both the study Treasure family (strategy version 6) and standalone Treasure policy (policy version 4) now use the same acquisition model; legacy Draw is unchanged.

For every legal affordable supply card, evaluate the entire owned deck after adding it. Buy the card with the highest resulting expected spendable Coins, provided it improves on buying nothing. Every supply card competes, including draw, filtering, Action support and coin Actions. Cost breaks exact EV ties before card ID. Prefer the highest printed VP tier in the entire supply whenever it is legal and affordable, regardless of income dilution. Lesser point cards qualify only when they leave expected income **at least $8 after dilution**; otherwise keep improving income. Recompute after each actual purchase. Known positive-share endings, including multi-buy wins and split ties, override this investment gate in the study controller; known losing endings remain protected. Mandatory gains take the highest-EV available option even when all gains dilute income.

“Hand EV” means income from five cards drawn uniformly from the resulting whole deck, followed by legal Action play. It measures the next shuffled hand's economy, not the literal next turn's draw from the current deck: a purchase normally goes to discard and may not be available immediately. No actual shuffled order, game seed or opponent hand enters the estimate.

Pure money/point decks have exact mean `min(5,N) × total Treasure Coins / N`. Decks containing one simple Action also have an exact mean: opening probability times printed/trigger Coins and expected extra draw, capped by available cards. Other decks use 16 deterministic shuffled orders and every cyclic rotation of each order (`16N` sampled hands), so each card appears equally often in opening hands. Alternative inventories share per-copy random ranks; these synthetic samples do not use match seeds. The production reducer executes draws, Action consumption, once-per-turn leader effects, discards, conditional reveals and reshuffles. The estimator caches only public composition, leader effects and supply when gains can matter.

Execution preserves an available Action chain, then ranks Action payloads by printed/trigger Coins and expected Treasure draw income. Forced discards use current-turn cash/playability. The same greedy play rule runs inside the estimator and in actual Treasure turns. This is finite-policy income estimation, not exhaustive optimal Action sequencing. Optional trash/upgrade is declined inside the one-hand model; mandatory sampled gains use immediate draw/coin payload. Discard gains contribute only if later draw reaches them. Actual gain decisions use the EV model; actual optional trashing retains the conservative benchmark income floor. Pure trashing/gaining/Worship capacity receives no speculative future-turn premium. Treasure continues to skip Worship events.

Examples without leader bonuses: seven Obols and three Hamlets give $3.50 EV; adding Drachma gives $4.091, while adding Council of Sages gives $4.136. With six Obols and four inert cards, Drachma instead gives $3.636 versus Council's $3.545. The actual game starts with six Obols, three Hamlets and a leader-specific Temple. A six-Talent/five-Hamlet deck has $8.182 EV, but adding Acropolis drops it to $7.50, so v5 bought income instead. V6 accepts that Acropolis: the six points are available now, even though the next hand has lower mean income. With six Talents/four Hamlets, Acropolis leaves $8.182 and both versions accept it.

The economic acquisition objective is the **mean of spendable Coins**, not `P(Coins >= 8)`, expected VP, or eventual victory probability. Sampled means have approximation error, especially for close decisions; multi-turn investment and mixed-card purchase baskets are not searched. Regression coverage: [money tests](tests/simulation/money.test.ts).

## Engine

The capacity model starts with one Action and adds surplus Actions from nonterminal cards plus the matching leader trigger. Terminal slots are allocated to the largest draw effects first; mandatory discards reduce net draw. Draw demand is deck size minus five opening cards, plus a two-card reliability margin. Spare Actions with unseen cards after the Action phase increase that margin by up to three and increase marginal draw pressure by 25%.

Each unit of reduced draw deficit earns 6 utility; each unit of unlocked stranded draw earns 2. Printed Coins, gains, filtering and useful Buys provide payload value. Conditional reveal income uses public Territory density; it never inspects the next card. Terminal payload is discounted by Action capacity relative to terminal demand. Acquisition includes the new card's deck-size cost. A probability-based opening bonus rewards a marginal increase in opening a draw card that can preserve Actions. Utilities receive a 0.35 late multiplier.

The four non-Treasure families obtain trashing-tool scores from Thin's remaining-work model; Engine, Worship and Race weight its utility by 0.35, while Thin uses full weight. This prevents a generic engine from valuing upgrades as highly as the dedicated thinning strategy solely because of a shared evaluator.

Play ordering considers usable draw, Actions, Coins and trashing, including actual unused leader effects. It penalizes ending the Action chain only when another available card could keep that chain alive. Owned Action retention uses marginal removal/restoration, rather than the value of acquiring another copy.

Draw capacity still assumes favorable accessibility of support and uses approximate terminal allocation. The opening probability and observed shortfall feedback reduce that weakness without claiming to solve shuffle risk. Full-deck telemetry is essential: unused Actions alone are not evidence that Actions are unnecessary.

## Thin

Thin evaluates a removal/replacement by `H × change in expected spending utility + change in owned VP`, minus this turn's spending utility lost by removing unplayed Treasures. It estimates cards seen as `min(N, 5N / max(1, N−playable net draw))`. Dynamic programming computes the exact Treasure-coin distribution of a uniform subset of that size, interpolating fractional sizes. Expected playable Action/leader Coins are added as an approximation. Access to extra Worship receives a small capped value.

Spending utility is 0.25 per Coin plus premiums at $3, $4, $5, $6 and $8 (0.5, 0.5, 0.75, 0.75, 1.5 respectively), interpolated over the preceding Coin. With more than one modeled turn remaining, a removal must retain a modeled $3 chance of at least `min(80%, current chance)−5 percentage points`, except for a positive-share ending. VP loss is a cost, not an unconditional prohibition on trashing scoring cards.

Actual trash choices enumerate legal hand subsets jointly. Useful future work is estimated by repeatedly choosing a positive marginal removal and recomputing the deck, rather than summing independent removals that may collectively destroy income. The last plain trasher is protected while useful work remains and H≥2; the last Forge receives an upgrade opportunity-cost penalty. Redundant or exhausted tools and other obsolete Actions may be removed. Useful thinning does not shut off at the old Acropolis threshold.

Tool acquisition subtracts work covered by current tools and actual leader trashing, discounts acquisition delay/remaining cycles, and charges the tool's own deck cost. Forge considers legal owned-card replacements. Thin's play ordering compares useful trash/upgrade work with other Action payloads, including actual leader Coins and trashing. It evaluates the remaining hand after the played card leaves and adds its known resource effects before valuing the opportunity. Consecutive Forge/leader trash effects use the larger opportunity rather than claiming the same offering twice. Forge and offerings evaluate removal plus gain; bans, supply, optional-gain rules and ending outcomes are respected. Topdeck gains get additional immediate value only when a known legal draw can reach them and sufficient Actions remain to use an Action gain.

All study families use joint Thin evaluation for ordinary optional trashing. The dedicated Thin family also uses it for offerings and gains. Other non-Treasure families score offerings using their own marginal retention/acquisition utilities, with joint income/ending safety checks and updated inventory after removal.

Conditional Treasure distributions are exact; the horizon, draw accessibility, Action income and useful-tool availability are approximations. No arbitrary upgrade-chain search or forecast of future acquisitions is implemented.

## Worship

Acquisition value considers the change in probability of reaching two matching Actions for each available event, using total matching owned cards and executable terminal capacity. It no longer applies a bonus to the first two copies of every matching card. Marginal Favored probability is multiplied by the event's standard-to-Favored effect improvement and a fixed weight of 6.

Before spending Worship, the controller searches up to four known in-hand Action plays that establish Favored. It accounts for Actions, printed Coins/Buys/Worship and the actual unused leader trigger. It does not forecast through trash/discard/gain choices that could change required hand cards, and it does not invent future drawn cards. It delays Worship when the resulting evaluated opportunity is better than spending immediately.

Immediate event benefits use the best eligible gain for Counsel, Drachma and relevant Buy value for Tribute, joint thinning for standard Blessing, and offering improvements for Favored Blessing/Trial. Known losing gains are excluded. Counsel/Favored Tribute topdeck timing is valued only with a usable known draw.

Event cost is compared with the best complete purchase basket before/after spending, including unplayed Treasure income, plus 0.5 per Coin. Worship must clear `worshipMargin`; it cannot displace a known winning purchase plan unless that winning plan remains available. All available gods may be considered. Treasures are played incrementally to preserve offerings.

This is bounded known-hand planning, not arbitrary multi-Worship search. Devotion probability is conditional on approximate draw capacity; it does not model every sequencing failure or opportunity cost. The values of additional Buys, multiple future events and uncertainty remain heuristic.

## Race, retention and discards

Race emphasizes immediate scoring through Polis value and lower Action-investment weight. Shared horizon estimates make it less willing to invest near an ending; the ending planner handles purchase/gain sequences and tiebreaks. It does not infer a particular opponent's future strategy or solve a multi-turn adversarial race.

Worship and Race now value losing an owned Action by removing it and evaluating its restoration, avoiding the extra-copy retention defect. Offerings update inventory between losses so multiple copies cannot all be treated as independently redundant. Ordinary trashing uses joint deck evaluation across non-Treasure families.

Discarding is distinct from permanent removal: Territories go first; unplayable Actions have no current-turn value; usable Actions use play priority; Treasures are valued by the spending opportunity they preserve. This prevents discarding needed money merely to retain a costly Action that cannot be played. The benchmark's multi-trash income floor is enforced across the full selected subset.

## Training and interpretation

The three bundled presets remain `(scoringAt, engineCopies, moneyFloor, worshipMargin)` = `(3,3,7,0.5)`, `(5,2,9,1)`, `(2,5,6,0)`. `engineCopies` is now unused by study policies. `moneyFloor` remains relevant to the legacy disposable-card retention shortcut in non-Thin offerings; actual joint trash safety uses the income model. Treasure uses preset 0 for artifact compatibility and ignores all preset parameters; its income threshold is $8.

The full matrix runner trains all four non-Treasure families for every leader against all five fixed preset-0 reference families, every other leader and both seats, with equal candidate budgets. It freezes one preset per leader/family before evaluation. Training changes only these presets, not objective weights or program structure.

The historical v4 full study used eight training blocks (11,520 games), then 200 independent evaluation blocks (60,000 games): six distinct leader pairs × 25 strategy pairings × two seats × 200. Standard leader rules apply. Every strategy cell has 400 games. Its headline comparison uses the best observed family for each leader against the other leader’s best observed family. Original equal-strategy averages and adjusted intervals are supplementary. Every individual strategy matchup is also reported, descriptively. This is a defined policy population, not optimal play, a mixed-strategy equilibrium or human balance validation.

Historical variants and earlier studies are separate, source-pinned artifacts. Fresh profiles and fresh evaluation seeds are required to assess the corrected population.

## Treasure scoring correction (v6)

Treasure now takes the highest printed VP tier in the complete supply whenever legal and affordable, even when its dilution lowers estimated income below $8. The top tier is determined from the whole supply, not the affordable subset. Known losing endings are still rejected by the study purchase planner. Lower-value points retain the v5 income floor; all economic acquisitions, Action execution, estimation and Worship behavior remain unchanged. This single scoring exception addresses the opportunity cost of rejecting points already affordable. It is a heuristic, not an optimal multi-turn investment calculation. Standalone Treasure increments to policy 4 and study strategies to version 6.

The fixed-profile experiment uses the v5 profiles and all 200 original evaluation seeds, changes only this scoring rule, and reruns every cell involving Treasure. Non-Treasure profiles are not retrained. Results are exploratory because the seeds were examined previously.

The [completed v6 scoring test](balance-results/treasure-scoring-v6/README.md) reruns all 21,600 Treasure games with frozen v5 profiles. Treasure gains 22–31 percentage points against Engine, scores sooner and finishes with lower income but more points. This supports the scoring exception against these fixed opponents; it is not a claim of optimal play.

## Treasure EV tie tolerance (v7)

After applying the unchanged v6 scoring rule, identify the highest estimated economic income. If any Treasure is within $0.10 (inclusive) of that maximum, choose the highest-EV such Treasure; otherwise retain the highest-EV card. Remaining ties use cost then card ID. Compare every candidate to the global maximum, avoiding a non-transitive pairwise epsilon sort. The existing rule still declines optional acquisitions that do not improve income; mandatory gains can accept dilution. This changes only buying/gaining selection, not EV estimation, Action execution, leader valuation or scoring. Study version is 7 and standalone Treasure version is 5.

The isolated experiment freezes the same profiles and 200 seed blocks as v6, reruns all 21,600 Treasure games, and checks the same 192 non-Treasure controls. Primary comparisons are Treasure against fixed Engine opponents; all other strategy cells and ending composition are descriptive.
