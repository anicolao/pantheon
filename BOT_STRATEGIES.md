# Bot strategy design reference — version 10

Current evaluation uses [explicit strategy-response matrices](BALANCE_OBJECTIVE.md), with no pooling across leader, strategy or turn order. The base-game experiment is an opt-in rule variant; standard-game policies retain their existing behavior.

This reference describes implemented behavior. The [defect ledger](BOT_DEFECTS.md) records the concrete corrections and regression coverage. Bots are deterministic public-information heuristics, not optimal players. Earlier studies remain reproducible at their recorded source commits; their outcomes do not describe this version.

The completed [standard-rule v4 matrix](balance-results/all-leaders-v4/README.md) covers every leader pair and all five strategy families **at policy v4**. Treasure changed in v5; the [paired v4→v5 rerun](balance-results/all-leaders-v5/README.md) records its effect. Engine remains the highest-share family for all leaders, while Treasure loses share in every matchup against Engine.

## Orthogonal Race (v10)

Race is now an independent `race: boolean` profile option for either parent, with thinning independently off/on. The [8×8 trial](balance-results/base-race-v1/README.md) contains every combination. The legacy standalone Race family remains available for reproducing historical studies; it is not one of these eight profiles.

Race prioritizes safe scoring baskets containing points worth at least half the highest printed VP tier in the supply. With the standard cards, that means Polis or Acropolis; Hamlet joins only when the public horizon is at most one turn. This threshold derives from VP values, not a named card list. Positive-share known endings take precedence and known losing endings remain protected, including multi-buy rescues. Choices are recomputed after each purchase. Ordinary gains follow the same scoring preference; Action-only gains, restrictions and mandatory choices remain legal.

Race caps the investment horizon at `min(3, scoringAt)`, using the same default parameters (three turns) for all eight profiles. The parent's usual economic acquisition policy handles turns without a scoring purchase. Engine therefore discounts long-term draw investments earlier; Big Money retains its all-card EV and $0.035 Treasure preference. The low-VP point tier receives no discretionary early-buy value. Race does not change Action effects, income estimates, draw-capacity calculations, or the parent's Action/discard policy.

When combined with thinning, the parent-specific income-per-draw or whole-deck-draw objective is unchanged, but its projected benefits have fewer turns to repay. Removal costs include any Race scoring opportunity lost this turn. Forge/offering upgrades retain joint before/after parent-objective evaluation and gain selection, rather than switching objectives halfway through the conversion. Race alone does not enable optional trashing.

The race horizon exists only on the bot's derived view; it changes no game state and exposes no hidden information. `race: false` and omission retain v9 decisions, including all sixteen archived 4×4 matchup regression fixtures. Race is a deliberately fixed early-scoring heuristic, not an optimal stopping policy or an opponent-search algorithm. No thresholds are tuned against the evaluation matrix.

Implementation: [Race overlay](scripts/balance/race.ts). Coverage: [Race tests](tests/simulation/race.test.ts), including all 64 ordered combinations, exact historical controls, legal gains and safe endings, modifier independence, shorter-horizon thinning, and lost scoring opportunity.

## Orthogonal thinning for Money and Engine (v9)

A profile may explicitly set `thinning: false` or `thinning: true` while retaining `family: treasure` or `family: engine`. The [base-game 4×4 trial](balance-results/base-thinning-v1/README.md) uses all four combinations with identical fixed parameters. This is not a sixth family or a renamed legacy Thin bot.

**Off** declines optional trash/upgrade choices and assigns no future-removal value to tools. Engine's legacy Thin tool score and generic trash payload bonus are bypassed; ordinary draw/Action/coin acquisition still uses Engine utility. Mandatory choices remain legal. **On** purchases and plays tools only with an objective-specific estimate of useful work; normal parent acquisitions and scoring remain in place. Profiles with the field omitted retain historical behavior for reproduction, including Engine's old shared Thin heuristic. Consequently, the explicit off Engine is not identical to the preceding 2×2 Engine.

Money's composition objective is `moneyEstimate(deck).mean / 5`: expected spendable income per initial card drawn, including legal Action play and terminal collisions. For a removal/replacement it uses `H × change in hand income + change in VP`. Engine's composition objective is `−drawDeficit − strandedDraw / 3 + (4/3) × openingReliability`, the same coverage/reliability terms as Engine acquisition divided by six. It uses `H × change in this objective + change in VP + 0.1 × H × change in cycle payload`. Capacity is evaluated in a fresh composition-only context, without current-hand draw-shortfall feedback. Engine refuses to reduce executable cycle payload below `min(8, existing payload)`; this keeps the whole-deck objective from deleting the income needed to score. Terminal Action payload is discounted by available slots.

Both enumerate joint legal hand subsets, protect known losing endings, favor known positive-share endings, charge unplayed Treasure Coins and an additional lost affordable top-tier VP opportunity, and protect owned VP when H≤1. Losing the last useful tool incurs its remaining-work cost. Forge/offering replacements and subsequent Forge gains use the same objective; gains obey supply and bans. Parent scoring still controls ordinary purchases, including Big Money's immediate top-tier scoring and $0.035 near-tie Treasure preference.

Tool investment forecasts add the tool to the deck, charge its dilution/terminal cost through the parent's ordinary score, and project productive removals using only public composition. Expected uses are `(H−1) × reach × terminalSlotShare`, where reach is `min(1, 5 / max(5, N−playableDraw))`. Existing tools cover work first. Each successive removal/replacement is reevaluated; work with nonpositive value is rejected. Fractional uses are weighted, and the total benefit is divided by H to yield an income/coverage premium. Engine multiplies that premium by six for its acquisition scale. There is no named opening, fixed trash list, or unlimited value for redundant tools.

Play ordering adds the value of legal work in the remaining hand after the Action leaves it; the parent still values draw, coin payload and Action continuity. Forecasts approximate tool accessibility, removal timing and terminal competition; Money's income model retains finite sampling. This is not exhaustive multi-turn search, and optimizing these objectives does not guarantee higher victory share.

Implementation: [objective thinning](scripts/balance/objective-thin.ts). Tests cover independent toggles, objective disagreement, payload/draw retention, joint removals, ending and scoring protection, diminishing tools, legal upgrades/bans, inactive leader invariance, and all sixteen ordered combinations. The legacy Thin family and the descriptions below remain applicable to profiles without the explicit switch.

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

## Treasure: expected hand income with scoring (v8)

The previous Treasure policy was a fixed Acropolis/Talent/Drachma priority list that excluded Action purchases. That was a restricted baseline, not the requested big-money objective. Both the study Treasure family (strategy version 8) and standalone Treasure policy (policy version 6) now use the same acquisition model; legacy Draw is unchanged.

For every legal affordable supply card, evaluate the entire owned deck after adding it. Prefer the highest-EV Treasure within $0.035 of the maximum estimated spendable Coins, or the maximum-EV card if no Treasure qualifies, provided the selected card improves on buying nothing. Every supply card competes, including draw, filtering, Action support and coin Actions. Cost breaks exact EV ties before card ID. Prefer the highest printed VP tier in the entire supply whenever it is legal and affordable, regardless of income dilution. Lesser point cards qualify only when they leave expected income **at least $8 after dilution**; otherwise keep improving income. Recompute after each actual purchase. Known positive-share endings, including multi-buy wins and split ties, override this investment gate in the study controller; known losing endings remain protected. Mandatory gains take the highest-EV available option even when all gains dilute income.

“Hand EV” means income from five cards drawn uniformly from the resulting whole deck, followed by legal Action play. It measures the next shuffled hand's economy, not the literal next turn's draw from the current deck: a purchase normally goes to discard and may not be available immediately. No actual shuffled order, game seed or opponent hand enters the estimate.

Pure money/point decks have exact mean `min(5,N) × total Treasure Coins / N`. Decks containing one simple Action also have an exact mean: opening probability times printed/trigger Coins and expected extra draw, capped by available cards. Other decks use 16 deterministic shuffled orders and every cyclic rotation of each order (`16N` sampled hands), so each card appears equally often in opening hands. Alternative inventories share per-copy random ranks; these synthetic samples do not use match seeds. The production reducer executes draws, Action consumption, once-per-turn leader effects, discards, conditional reveals and reshuffles. The estimator caches only public composition, leader effects and supply when gains can matter.

Execution preserves an available Action chain, then ranks Action payloads by printed/trigger Coins and expected Treasure draw income. Forced discards use current-turn cash/playability. The same greedy play rule runs inside the estimator and in actual Treasure turns. This is finite-policy income estimation, not exhaustive optimal Action sequencing. Optional trash/upgrade is declined inside the one-hand model; mandatory sampled gains use immediate draw/coin payload. Discard gains contribute only if later draw reaches them. Actual gain decisions use the EV model; actual optional trashing retains the conservative benchmark income floor. Pure trashing/gaining/Worship capacity receives no speculative future-turn premium. Treasure continues to skip Worship events.

Examples without leader bonuses: seven Obols and three Hamlets give $3.50 EV; adding Drachma gives $4.091, while adding Council of Sages gives $4.136. V7 selected Drachma because that difference is within $0.10; v8 selects Council because the difference exceeds $0.035. With six Obols and four inert cards, Drachma instead gives $3.636 versus Council's $3.545. The actual game starts with six Obols, three Hamlets and a leader-specific Temple. A six-Talent/five-Hamlet deck has $8.182 EV, but adding Acropolis drops it to $7.50, so v5 bought income instead. V6 accepts that Acropolis: the six points are available now, even though the next hand has lower mean income. With six Talents/four Hamlets, Acropolis leaves $8.182 and both versions accept it.

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

The [completed v7 epsilon test](balance-results/treasure-epsilon-v7/README.md) removes Bronze Recruit from all 24,000 ending Treasure decks but does not demonstrate an overall improvement. Melia loses 6.21 percentage points against fixed Engine opponents (adjusted paired interval −10.79 to −1.67); the other leader changes are inconclusive. The broad preference also reduces draw purchases. The requested epsilon remains in the tested implementation; no further policy edits were made based on these results.

## Treasure epsilon refinement (v8)

The economic near-tie threshold is now $0.035 instead of $0.10. All other v7 behavior is unchanged, including v6 scoring and the global-maximum comparison. This covers Melia's approximately $0.03409 starting Bronze Recruit estimation edge while allowing the approximately $0.045 opening Council advantage to win. Study version is 8; standalone Treasure version is 6.

The experiment runs only the 21,600 games involving Treasure, on the same 200 seed blocks and frozen profiles. It compares with both v6 (no epsilon) and v7 ($0.10); eight primary leader-by-baseline comparisons against Engine share a Bonferroni-adjusted family. No non-Treasure control games are rerun. Results remain exploratory because the seeds were previously examined.

The [completed v8 test](balance-results/treasure-epsilon-v8/README.md) uses only the 21,600 Treasure-involving games. Its observed Engine matchup shares exceed v7 for every leader, but all eight adjusted comparisons with v6/v7 include zero. Bronze Recruit remains in 1.25% of Melia decks and none of the others. The smaller band recovers some draw-card purchases; it is not yet a demonstrated win-rate improvement.

## End Game modifier (v11)

End Game replaces aggressive orthogonal Race for new experiments. `endGame` is independent of `thinning` and parent objective. Historical Race profiles remain available to reproduce archived results. End Game does not cap investment time: it activates only when the existing public horizon is ≤2 turns. That estimate is the minimum of six turns, Acropolis supply depletion, three-pile depletion, and Acropolis pressure inferred from public opponent income; it is a heuristic, not a calibrated forecast.

While active, safe purchase baskets and ordinary gains maximize immediate positive VP, including Polis and Hamlet. Known losing endings are rejected and winning continuations retain priority. Before activation the parent policy is unchanged, including Big Money's immediate affordable Acropolis rule. Objective thinning and upgrades keep their joint evaluation, with the loss of affordable current-turn scoring charged while End Game is active. End Game off reproduces previous behavior; it cannot be combined with aggressive Race.

The initial screening crosses Big Money with Thin and End Game booleans: 16 ordered cells ×200 common seed blocks, no leader powers or Worship, identical starting decks. No pooling of strategies or seats; compare concrete responses and treat rankings as provisional.
