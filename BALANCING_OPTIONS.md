# Balance simulation options

This document is the design plan. A basic executable baseline is now described in [BALANCE_SIMULATION.md](BALANCE_SIMULATION.md); the expanded [decision-study framework](BALANCE_STUDIES.md) adds training, mixed opposition and paired confirmation. Unimplemented experiments below remain future work.

This plan targets the v0.1 rules in [MVP_CARDSET.md](MVP_CARDSET.md), starting from commit `bd78ae3`. Its purpose is to discover whether leader choices, Worship options, or individual cards create persistent advantages, and to distinguish those advantages from seating, luck, strategy, and bot weaknesses. Every suspected issue below is a hypothesis, not a finding.

## 1. What would count as a balance issue?

A strong option is not automatically a problem. Specialization, situational advantages, and useful combinations are desirable. Flag options that dominate credible alternatives across contexts, become effectively mandatory, or permit a strategy that reasonable counterplay cannot contain.

Answer these questions separately:

- **Leaders:** Does a leader's complete package outperform others after controlling for seating and strategy? Does reverse-order drafting compensate for first-player advantage? Are some leaders only weak because the bot cannot exploit them?
- **Worship:** Does an event provide excessive value compared with spending the same Coins elsewhere? Does Favored access reward an appropriate investment? Do public events benefit their affiliated leader disproportionately, or make another leader stronger?
- **Cards:** Does acquiring a particular card improve outcomes beyond plausible alternatives at that decision? Are first copies, repeated copies, or combinations too efficient? Does a seemingly weak card have a meaningful role?
- **Game shape:** Do engine building and territory rushing both have credible paths to victory? Can players exploit three-pile endings? Do results change substantially with player count?

Keep 2-, 3-, and 4-player results separate. A game with one universal optimal strategy can be unhealthy even if all four leaders have similar win rates.

## 2. Simulation options and recommended order

| Option | What it resolves | Limitation | Priority |
| --- | --- | --- | --- |
| Scripted turns and fixed-deck trials | Resource efficiency, ordering, Devotion access, suspicious combinations | Cannot establish match balance | Targeted diagnosis of suspected advantages |
| Complete games between configurable heuristic bots | Broad leader, event, card, and strategy comparisons at modest cost | Findings depend on policy competence | Main initial experiment |
| Paired decision rollouts | Value of buying, gaining, or Worshipping versus the best alternatives from the same position | Continuation policy and hidden-state assumptions matter | Confirm suspected issues |
| Policy search and adversarial tournaments | Whether optimized strategies remain strong against adapted opponents | More compute; can overfit to the opponent population | After the basic league is credible |
| Human replay review and targeted playtests | Whether the advantage is understandable and achievable by players | Smaller samples and skill differences | Before recommending a rules change |

Run automated matches directly against the production game with recorded seeds. Add bounded search only after useful heuristic opponents exist. Browser automation is appropriate for gameplay acceptance, but unnecessary for thousands of balance matches.

## 3. Running automated matches

Simulations run against the production game. Its implementation defines the behavior being measured; verifying that implementation against the rulebook is outside this balance study.

The runner sets up matches with the chosen seeds, player counts, and bot strategies. At each decision, it asks the active bot what to do and submits that choice to the production game. The game resolves effects, advances turns, and determines the final result. The runner records decisions and outcomes for comparison and replay.

The simulation-specific responsibilities are choosing the match schedule, providing bots with the information a player could see, and collecting the measurements described below.

Bots receive only their own hand and public information: supply, leaders, events, played/discarded/trashed cards, deck sizes, and public history. They must not see deck order, opponents' hands, or the PRNG seed. A bot can remember public acquisitions and a known topdeck until subsequent information invalidates that knowledge. Search samples unknown cards consistently with that information; privileged fixed-state diagnostics must be labelled and excluded from competitive win-rate evidence.

Propose guards of 200 turns per player and 10,000 commands per turn initially. Guard hits, crashes, and illegal commands are separate outcomes, never silent draws or losses. Report their frequency and investigate before interpreting affected comparisons. Raise guards if legitimate engine play requires it.

## 4. Opponent population

A random legal bot is a smoke test, not a balance opponent. Build several tunable policy families, all able to make legal trash, discard, gain, and Worship choices:

| Family | Intended behavior |
| --- | --- |
| Treasure / territory baseline | Builds income with Drachmas and Talents, then converts to VP; tests whether complex engines pay for themselves |
| Draw engine | Balances draw and available Actions, then adds income and Buys; exploits Athena and Harbor Pilot where useful |
| Thin / upgrade | Removes starting clutter, preserves enough income, and times Forge, Demeter, and Ares transformations |
| Worship specialist | Builds two matching Actions in play and uses extra Temple Worship when its opportunity cost is justified |
| Territory / pile race | Scores earlier, watches opponents' public acquisitions, and intentionally ends on Acropolis or three piles |
| Adaptive mixed strategy | Chooses among the above according to leader, shared gods, supply, and estimated game length |

Tune purchase thresholds, desired copy counts, trash priorities, action order, scoring transition, and Worship timing separately for each leader and player count, with equal tuning budgets. Never hard-code “own god only.” Include cross-affiliation engines and strategies using cards whose event is absent.

Action ordering must account for once-per-turn triggers: playing Thaleia's Temple first can spend the bonus before Council of Sages; Melia draws only after the whole Demeter effect; Doreios's optional trash cannot be postponed to a later Ares Action. Bots must consider individual Treasure plays, retained offerings, Worship before drawing, and Worship after purchases. A bot that always plays all Treasures first cannot fairly evaluate this ruleset.

Separate tuning, discovery, and confirmation seeds. Freeze policies for confirmation. If a suspicious strategy wins, train or tune a response against it using new training seeds, then evaluate both on fresh confirmation seeds. Preserve older opponents in the league so adaptation does not hide regressions or cyclic matchups.

## 5. Shared experimental controls

### Seats, lineups, and randomness

Enumerate all leader-to-turn-order assignments: 12 for two players, 24 for three, and 24 for four. These cover six leader pairs, four triples, and the single four-leader set. In controlled assignment games, leaders are chosen legally in reverse draft order according to the assigned lineup. Test strategic draft choice separately.

Cross leader assignments with a balanced schedule of policy families. Include homogeneous-policy tables and mixed tables; rotate policies independently of leaders and seats. Publish the schedule and weights so an aggregate is not dominated by one opponent family.

For each independent seed block, replay compared conditions with matched setup randomness and rotate seats. Preserve existing seat-specific shuffle semantics; record both joining-seat and turn-order mappings. With changed deck contents or shuffle timing, equal seeds no longer imply identical future draws. Treat matching as variance reduction, not proof of identical luck. Policy randomness needs a separate seed stream from game randomness.

In multiplayer, the game is the experimental unit. Seats, rotated games, and counterfactual branches from the same seed block are correlated; do not count them as independent observations.

### Outcomes and evidence thresholds

Primary outcome: **victory share**, awarding each final winner `1 / number of tied winners` after the fewer-turn tiebreak. Shares total one per completed game. Symmetric reference shares are 50%, 33.3%, and 25%, but the main comparison is a matched treatment difference, not an unadjusted departure from those values.

Also record VP, VP margin versus the best opponent, turns per player, end condition, per-turn income, unused resources, deck size/composition, scoring acquisition timing, and supply depletion. VP per turn alone rewards engines that lose the actual race.

Use these provisional triage thresholds, to be agreed before confirmation:

- A **5 percentage-point absolute** increase in victory share is a practically important primary effect. Report the estimate and a 95% interval; prioritize effects whose interval excludes zero and whose estimate exceeds this threshold.
- Call evidence strong for an effect of at least that size only when the interval's lower bound exceeds 5 points. Otherwise distinguish a promising signal from a confirmed practical magnitude.
- Context-specific effects and inability to find competitive alternatives remain worth investigation even without a broad aggregate effect. Low usage alone is not evidence of weakness.

For screening, start with 200 independent seed blocks per declared comparison cell, with required rotations inside each block. A cell fixes player count, leader subset, policy matchup, and treatment. Expand shortlisted comparisons to 2,000 blocks, and, if needed, up to 10,000. Publish actual game counts (blocks multiplied by rotations and treatment arms); run a throughput pilot before committing to the full cross-product. These are budget stages, not guaranteed statistical power.

Use paired differences and bootstrap confidence intervals clustered by seed block. For observational summaries, stratify or model leader, seat, player count, shared-event set, and policy family; label associations as such. Correct discovery comparisons within leader, event, and card families for multiple testing, then confirm selected hypotheses on untouched seeds with a predeclared family-wise correction. Fix the confirmation sample size from pilot variance and the target effect; do not repeatedly peek and stop at significance. If the budget cap leaves a wide interval, report “inconclusive.”

## 6. Leader experiments

### A. Complete-package league

Measure all four leaders with their actual Temple, trigger, and resulting shared events across the controlled schedule. Report leader-by-seat and leader-by-policy outcomes, pairwise two-player matchups, and each three-player subset. Four-player tables are especially useful because all events are always present.

Measure opening Temple position, first leader trigger, triggers per turn, useful Actions/Coins/Cards gained, and Doreios's accepted versus declined trash. Count actual use of a resource, not only its nominal production. Compare early Temple draws with late draws to expose opening variance without changing the official deck.

Specific hypotheses:

- Thaleia makes terminal Council of Sages unusually efficient, but Temple-first ordering changes which Action receives her bonus.
- Nereon's unconditional Coin on the first matching Action accelerates opening purchases and Worship access.
- Melia turns Seed Keeper or Sacred Grove into more efficient deck development, especially after thinning.
- Doreios's free thinning outperforms paid removal early, or loses too much value once the deck is clean.

### B. Attribution variants

On matched setups, switch off one leader trigger while preserving its Temple and all shared events; compare the owner and every opponent. Separately test a Temple with its Worship bonus disabled while retaining its type, affiliation, cost, and Action refund. These are deliberately nonstandard diagnostic variants, not legal baseline games or proposed fixes.

Hold the shared-event set fixed while varying a leader package where possible, especially in four-player games. For two- and three-player event-presence experiments, use explicit variants rather than claiming a legal leader substitution isolates the leader: substitution changes opponents and public gods too. Estimate interactions instead of assuming trigger, Temple, and event effects add independently.

### C. Strategic draft simulation

After policy strength is credible, let bots choose among remaining leaders in the actual reverse-order draft. Evaluate candidate choices by rollouts including later drafters' responses and the final shared-event set. Compare adaptive drafting with random legal drafting and a fixed preference ranking.

Report pick rate when available, outcome conditional on draft position, and the gain from first draft choice versus first turn. A frequently selected leader may be a good denial or event-access choice rather than personally overpowered. Controlled assignments and strategic drafting answer different questions; report both.

## 7. Worship experiments

For each available event, compare an unrestricted policy against a matched policy prohibited from using that event while opponents retain access. Retune both under equal budgets for the strategic comparison; also run frozen-policy comparisons to identify immediate reliance. Separately disable the event for everyone to measure its effect on the whole game. Neither intervention alone measures intrinsic event power.

Run local paired rollouts at sampled legal Worship opportunities: Worship now, defer, buy the best available alternative, or preserve resources. Resolve all follow-up choices and the rest of the game. Sample opportunities independently of whether the original bot chose to Worship; otherwise the test selects favorable positions. Branches share the same legal information and continuation policy. Average over hidden-state samples when assessing a player's decision.

Stratify by Standard/Favored, own/off-god leader, early/middle/late game, remaining Buys, hand offerings, and one versus multiple Worship uses. Record Coins paid, printed cost and destination of gains, VP sacrificed, additional Buys actually used, time until a gained card is drawn/played, and net victory-share change. Printed gain cost minus payment is a diagnostic, not a valuation of victory.

| Event | Specific tests |
| --- | --- |
| Athena: 3 Coins | Standard cost-3 versus Favored cost-5 Action gains; compare with purchasing. Test Temple plus Acolyte access, repeated Sacred Academy gains, and topdeck-then-draw during Actions. Acquiring an Action must not imply permission to play it after Actions end. |
| Poseidon: 3 Coins | Standard Drachma versus buying Drachma while saving the Buy; Favored topdeck timing and useful extra Buys. Compare Drachma saturation, other income investments, and the exhausted Drachma pile where the Favored Buy still resolves. |
| Demeter: 3 Coins | Paid thinning versus Seed Keeper or Doreios; Favored combined offerings versus keeping income/VP. Include Hamlet + Drachma → Polis, two Polises → Acropolis (no immediate VP gain), and Talent + Hamlet → Acropolis. Test retained Treasures, zero-trash choices, and extra-Buy value. |
| Ares: 4 Coins | Standard +1 versus Favored +3 upgrades; Hamlet → Polis and Polis → Acropolis under Favored. Compare with Forge's +2 upgrade and direct buying, charging both the payment and the lost card. Examine whether terminal Ares Actions make two Devotion difficult without the Temple or Harbor Pilot. |

For shortlisted events, vary only one parameter at a time in explicit rule variants: Coin cost ±1, Favored threshold 2 → 3, gain ceiling/upgrade delta ±1, or a repeat-use limit. Retune policies and then test combinations only if interactions justify them. These are sensitivity probes, not recommendations to nerf an event before evidence exists.

## 8. Individual-card experiments

Cover all twelve supply Actions, the six basic cards, and the four starting Temples. Basic cards anchor the economy and scoring race; compare Treasure investment and scoring timing rather than interpreting Acropolis's association with winning as excess power. Temples require starting-deck/ability variants because they cannot be acquired.

Use three complementary measurements for each supply Action:

1. **Acquisition alternatives:** At representative affordable purchase or eligible gain choices, branch into the target card, credible alternatives, and skip where legal. Continue complete games. Keep Coin/Buy costs and gain destinations correct; an Athena gain is a different intervention from a purchase.
2. **Access and quantity:** Let one policy avoid acquiring the card through every route while opponents remain unrestricted; retune. Sweep desired copy counts (0, 1, 2, 3, then more if useful). Measure the marginal value of each copy, acquisition timing, and whether access becomes mandatory against strong opponents.
3. **Whole-market sensitivity:** Change cost by ±1 or adjust a suspected effect in a labelled variant, then retune and rerun. Cost changes also affect Forge, Worship gain ceilings, and offerings. If removing a pile for diagnosis, exclude it from the empty-pile count rather than representing it as an empty starting pile; label this as a changed market.

| Card or group | Main hypothesis and diagnostic |
| --- | --- |
| Oracle's Acolyte | Cheap cycling makes Athena Favored access nearly free; compare first/second copies and missing-Athena tables. |
| Council of Sages | +3 Cards becomes disproportionately good with Thaleia or sufficient Harbor Pilots; measure terminal collisions and unused Actions. |
| Sacred Academy | Repeated nonterminal draw dominates cost-5 alternatives, especially through Athena; measure full-deck draws and remaining useful payload. |
| Harbor Pilot | +2 Actions enables otherwise impossible terminal/Devotion combinations; measure additional Actions actually played rather than leftover counters. |
| Sea Trade / Merchant Fleet | Income plus Buys accelerates multi-buy scoring or pile endings; test whether Fleet's cycling justifies its premium and whether extra Buys are used. |
| Seed Keeper | Early two-card thinning is close to mandatory, or excessive thinning destroys income; compare acquisition windows and removal targets. |
| Harvest Feast | Cycling/filtering plus Melia's later draw outperforms peers; track discarded Territories and useful cards retained. |
| Sacred Grove | Repeatable free gains accelerate engines or empty piles too quickly; count gains drawn before the ending and unwanted mandatory gains. |
| Bronze Recruit | A terminal +2 Coins appears weaker than Drachma until Ares trigger/Devotion is counted; compare with and without Ares access. |
| Forge of Heroes | Upgrade chains convert starting clutter or wealth into VP too efficiently; include the opportunity cost of the sacrificed card and Doreios's separate trash. |
| Victorious Procession | Territory-heavy decks earn too much income while filtering scoring cards; measure reveal rates, known topdeck sequencing, and scoring-rush viability. |
| Obol / Drachma / Talent | Income progression and deck pollution; compare purchases with Worship gains, upgrades, and thinning. Cost changes affect the whole economy. |
| Hamlet / Polis / Acropolis | When to start scoring, VP retained versus offered, and strategic ending control; evaluate both ending routes and turn-order tiebreaks. |
| Starting Temples | Value of leader activation, Devotion, and extra Worship versus a non-drawing deck slot; compare keep/trash decisions and isolated bonus variants. |

Screen pair interactions first: Academy–Acolyte, Pilot–Council, Pilot–Ares terminals, Seed Keeper–draw engines, Grove–cheap pile depletion, and Forge–territory upgrades. For promising pairs, use a four-arm access experiment (both, A only, B only, neither) with equal policy tuning. Compare the joint effect with individual effects; a card may be healthy alone but excessive in a combination. Extend only strong signals to three-card or leader/event interactions to contain the search budget.

Never infer a card's strength from “win rate when owned” alone. Strong players can afford costly cards, winning positions buy Territories, and losing bots may buy rescue cards. Acquisition timing and paired alternatives are necessary to interpret those correlations.

## 9. Reports and decision process

Each run should produce a manifest containing source commit, rules/variant identifier, policy versions and parameters, seed lists, seat/lineup schedule, tuning budget, sample size, exclusions, guards, and elapsed compute. Store game-level results plus per-decision summaries; keep full replay traces for all failures and a reproducible sample of ordinary games and extreme wins/losses.

The review report should contain:

- Leader victory shares by player count, seat, lineup, and policy, plus the strategic-draft comparison.
- A policy matchup matrix to expose cycles and dominance hidden by aggregate win rates.
- Event usage and paired value, split by Standard/Favored and own/off-god use.
- Card first-copy and extra-copy effects, tested alternatives, timing, and leader/event interactions.
- Game length, ending-route frequency, unfinished/error rates, and opening variance.
- For each suspected issue: effect size and interval, independent seed-block count, practical threshold, strongest counterstrategy tested, and replay examples explaining the mechanism.

Classify findings as **policy weakness**, **contextual strength**, **credible balance concern**, or **inconclusive**. A credible concern should survive fresh seeds and stronger opposition, and either recur across multiple competent policy families or remain dominant as a specialized strategy after targeted counterplay. A narrow effect can still matter; describe exactly where it occurs.

Only then propose the smallest rule change supported by the mechanism. Compare it against unchanged v0.1 with retuned bots, check for new dominant strategies and lost niches, and replay representative games with humans. Preserve the original baseline and do not mix results across rules versions.

## 10. Suggested first implementation tranche (future work)

1. Connect bots to the production game, give them player-visible observations, and record match results and replays.
2. Add a competent Treasure/territory baseline plus draw-engine and thin/upgrade policies; verify complete games and throughput.
3. Run the two-player controlled leader league, then the three- and four-player schedules with the same reporting contracts.
4. Add Worship specialists and pile-ending strategies before drawing balance conclusions. Run event restrictions and paired card-acquisition screening.
5. Confirm the largest effects with held-out rollouts, optimized counterplay, and targeted human games; investigate only then whether parameter changes improve the game.

The first useful deliverable is a reproducible comparison with uncertainty and replayable explanations, not a single ranked list of “best” leaders or cards.
