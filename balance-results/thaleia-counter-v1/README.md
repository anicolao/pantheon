# Thaleia versus leader-specific counter-strategies

The extra-card trigger still appears to overshoot after each rival selects its strongest tested counter. Thaleia's training-selected strategy wins about 65–69% of held-out games against those counters, compared with 29–39% under the current trigger. This is a narrower and more useful result than the earlier 85–98% shares at homogeneous Engine/Worship tables.

## Held-out heads-up results

Each rule/leader/profile matchup has 400 games: 200 fresh seed blocks, both turn orders. Tied wins split victory share equally. Strategies are chosen entirely on training data.

| Rival | Selected counter, both rules | Current Thaleia strategy | Current victory share | Proposed Thaleia strategy | Proposed victory share |
| --- | --- | --- | ---: | --- | ---: |
| Nereon | Treasure | Engine | 38.5% | Engine | 64.8% |
| Melia | Engine, preset 1 | Engine | 37.8% | Worship | 68.8% |
| Doreios | Treasure | Engine | 28.7% | Race | 66.5% |

The selected counter happens to be identical across rules in these primary rows, despite separate searches. Thaleia's chosen profile changes against Melia and Doreios. Consequently the before/after differences include adaptation and are not estimates of the card alone with policies fixed.

| Rival | Current share, adjusted interval | Proposed share, adjusted interval | Adapted change, adjusted interval |
| --- | --- | --- | --- |
| Nereon | 32.1–45.1% | 58.3–70.9% | +26.3 pp (+19.9 to +32.9) |
| Melia | 31.5–44.4% | 62.7–74.6% | +31.0 pp (+23.9 to +38.1) |
| Doreios | 23.0–34.8% | 60.4–72.8% | +37.8 pp (+30.8 to +44.9) |

All three proposed-rule intervals are above 55%, the symmetric 50% reference plus the framework's 5-point practical margin. The current-rule intervals are all below 50%. This strengthens the evidence that the proposed unconditional card is too large a buff within the tested bot population. It does not establish balance under optimal or human play. The live game still uses the original trigger.

## How the counters were chosen

For each of Nereon, Melia and Doreios, separately under each rule:

1. Play each of Thaleia's five existing trained profiles (Treasure, Engine, Thin, Worship, Race) against 13 rival configurations: one Treasure benchmark and three parameter presets for each other family.
2. Use 40 training seed blocks and both turn orders, giving 80 games per candidate matchup. Each candidate receives the same seeds and budget.
3. For each Thaleia profile, select the rival configuration that minimizes her training victory share. Then choose her profile with the highest such minimum. Ties retain the declared order.
4. Freeze all 30 profile/counter selections before testing on 200 disjoint evaluation seed blocks. Only the six training-selected Thaleia profiles are primary; all 30 rows appear in [report.md](report.md).

This uses 31,200 training games and 12,000 evaluation games, all completed with no failures. The nine primary quantities (six victory shares and three adapted differences) share a Bonferroni correction. Intervals use 20,000 bootstrap resamples of whole seed blocks, preserving the two turn orders and pairing across rules. They are approximate intervals conditional on the selected strategies, not uncertainty bounds on the entire optimization process.

The search deliberately gives rivals all three presets while retaining one previously trained profile per Thaleia family. It is a conservative counterplay stress test, not equally exhaustive optimization of both sides. It does not search arbitrary card priorities, new strategies, strategic drafting, or mixed-strategy equilibria. Finite training can misrank candidates: for example, Race Thaleia scores 75.6% against Nereon's selected counter in the proposed-rule diagnostic, higher than the training-selected Engine's 64.8%. We retain Engine as primary rather than selecting again on evaluation. Nor does evaluation prove the chosen counter is the true best response.

Melia's `engine-1` is preset index 1 (zero-based): scoring threshold 5, desired engine copies 2, retained-money floor 9, Worship margin 1. Candidate definitions and every training score are archived. These labels describe heuristic configurations, not newly discovered human strategies.

## Reproduction and artifacts

Source commit: `768f958a197cd2aa6fc7687aa6994f2359e763a9`, clean at execution. Bun 1.3.13 in the pinned Nix development environment. The unchanged flake/lock from commit `52479a00107f709f896694a324f93e7a13063705` supplied the shell. Runtime was about seven minutes. The distinct 900-game execution pilot is excluded from these results.

From the recorded source commit, choose a fresh output directory:

```sh
nix develop --no-write-lock-file --command bun run balance:counter --out balance-runs/thaleia-counter-v1
```

- [manifest.json](manifest.json): exact seeds, profiles, candidate configurations, source, budgets and frozen-selection hash.
- [training.jsonl.gz](training.jsonl.gz): both turn-order shares for every training candidate and seed; [training-scores.json](training-scores.json): aggregate scores.
- [selections.json](selections.json): every frozen counter and the primary Thaleia choices.
- [games.jsonl.gz](games.jsonl.gz): complete evaluation results, including telemetry and replay inputs.
- [report.md](report.md) and [estimates.json](estimates.json): primary intervals and all profile/counter diagnostics.
- `replays/`: 60 compressed first-block traces, covering all rule/leader/profile/turn-order combinations.

Verified all training counts and scores, selection reconstruction and hash, disjoint seeds, evaluation profiles and seat coverage; regenerated the report and estimates exactly; replayed all 60 traces to identical scores and turn counts. All 25 simulation tests passed, including counter selection, deterministic ties, incomplete matrices, unequal budgets, held-out pairing and failed-block exclusion. Strict TypeScript checks passed; application checks reported no errors or warnings. No production rules or UI changed in this addition.
