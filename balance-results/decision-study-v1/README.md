# First paired balance decision study

The expanded framework completed **9,216 training games**, **11,880 discovery games**, and **118,800 confirmation games**, all without failures or guard hits. Confirmation used a fixed 200 held-out seed blocks and finished in 836.4 seconds. The source and profiles were frozen before discovery; the same three contrasts were declared before confirmation.

## Two-player confirmation

Effects below are focal victory share with normal access **minus** victory share with the named feature restricted. Each pair preserves setup seed, joining seats, leader lineup and policies. The population is the complete ordered leader/seat schedule crossed with Treasure, Engine and Worship as focal and opposing policies.

| Feature available to focal player | Effect | Family-adjusted interval | Interpretation |
| --- | ---: | --- | --- |
| Doreios's leader trigger | +16.6 percentage points | +15.0 to +18.2 | Supported practical benefit for these policies |
| Athena Worship | −1.7 percentage points | −2.4 to −0.9 | Small negative effect for these bots; no supported 5-point effect |
| Sacred Academy acquisition | approximately +5.0 percentage points | +4.5 to +5.5 | Positive effect; whether it exceeds the 5-point practical threshold remains unresolved |

The adjusted intervals bootstrap seed-block means and apply Bonferroni correction across all three planned primary comparisons. They are approximate bootstrap intervals. These are 200 independent seed blocks, not 118,800 independent observations. Baseline exposure was 100% for Doreios's trigger, 64.4% for Athena Worship, and 65.5% for Academy acquisition. No blocks were excluded. See [the complete confirmation report](confirmation-v2/report.md) and [numeric estimates](confirmation-v2/estimates.json).

## What to decide from this

**Investigate Doreios's thinning mechanism; do not automatically nerf the leader.** Removing a useful leader ability is a large intervention. A +16.6-point contribution does not establish that its complete leader package is stronger than the others, or tell us what a smaller rule change would do. In the homogeneous Treasure baseline, Nereon, Melia and Doreios have similar shares (58.2%, 59.2%, 58.9%), while Thaleia has 23.7%. Those are per-leader averages across three different opponents, not four players in one game.

**Treat the Athena result as a policy-quality question before changing Worship.** The new bots can use standard, Favored and off-god events, but their heuristic spending can be poor. For example, Nereon's Engine bot wins only 36.2% against the Treasure population; Doreios's Engine bot wins 13.9%. Thaleia's Engine has 60.9% in homogeneous Engine tables but only 35.3% against Treasure. The [mixed-policy league](confirmation-v2/league.md) exposes these weaknesses rather than disguising them with one aggregate leader ranking.

**Prioritize Sacred Academy for retuned comparisons and opponent adaptation.** Its overall estimate is almost exactly the practical threshold; the interval straddles that threshold. Descriptive subgroup effects range from zero for Treasure (which never acquires it) to +15.3 points for Worship versus Worship. Those subgroups were not separate confirmatory hypotheses, and selecting only the favorable subgroup would change the question.

The next useful experiment is equal-budget restricted-policy retraining and stronger counterplay, followed by a newly declared held-out study. The framework supports retuned arms, but the main results here are **frozen-policy reliance**. Training searched only three parameter presets with two seeds per player-count/leader/family against fixed Treasure and Engine references. It is a modest search budget, not evidence of optimal play. The new families share much of their decision logic. Cost/effect variants, strategic draft search, hidden-information rollouts, and human validation remain outside this implementation; no live rule changes are proposed.

## Replay mechanism example

An explicitly selected [discovery case](discovery-v2/case-study.json) illustrates why the effect can be large. Against Melia with the same Treasure policy, Doreios's trigger trashed three Hamlets and two Obols. He won 27–21 after 14 turns each, with a 19-card final deck. With only the trigger disabled, he finished with 25 cards and lost 27–33 after 16 turns to Melia's 17. Both full event streams are retained. This was deliberately selected for a contrasting result and is not additional independent statistical evidence.

## Scope, artifacts and reproduction

- [Training artifact](training-v2/profiles.json): every selected profile and every candidate's training score/game count for 2–4 players.
- [Discovery](discovery-v2/report.md): 20 independent seed blocks, separate from training and confirmation.
- [Confirmation](confirmation-v2/report.md): 200 independent seed blocks with 75,600 matched contrasts, using 43,200 baseline and 75,600 restricted games.
- [Multiplayer smoke test](multiplayer-smoke-v2/report.md): 2,112 additional 3-/4-player games, zero failures. One block tests execution/replay coverage and supports no multiplayer balance inference.
- [Retuning smoke test](retune-smoke-v2/report.md): 120 additional games with separately trained, equal-budget treatment profiles, zero failures. This is workflow validation, not confirmatory evidence. Its manifest embeds both sets of profiles and all candidate budgets.

Each directory contains its manifest, reports, compressed complete game/pair records, and compressed replay samples. The discovery directory additionally retains the selected mechanism example. Archived pairs were checked against their source game records, every report was regenerated exactly from archived data, and every archived replay was checked against saved scores and turn counts.

Experiments ran from clean commit `2734eec3d40b16038bee92216d6d52ab3d517e5d`. To reproduce from that commit, follow [BALANCE_STUDIES.md](../../BALANCE_STUDIES.md) using fresh output directories. The checked-in discovery and confirmation plans were not changed after observing discovery outcomes. `gzip -dc` reads the archived `.jsonl.gz`/`.json.gz` files; study event streams replay through `replayExperiment`, which includes the leader-trigger intervention wrapper.

Validation also passed 16 simulation tests (including all 75 player-count/family matchup combinations), the strict TypeScript checks, and 34 repository-policy tests. Production UI and Firebase integration behavior were not modified; browser and backend integration suites were not run locally for this change.
