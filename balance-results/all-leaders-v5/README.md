# Treasure v5: before/after heads-up balance

Engine remains the highest-share observed family for every leader in both versions. The headline therefore stays **Engine versus Engine**:

| Leader A | Leader B | Before A share | After A share |
| --- | --- | ---: | ---: |
| thaleia | nereon | 72.6% | 72.8% |
| thaleia | melia | 64.6% | 64.6% |
| thaleia | doreios | 57.6% | 57.4% |
| nereon | melia | 42.1% | 42.1% |
| nereon | doreios | 40.5% | 39.5% |
| melia | doreios | 50.9% | 47.4% |

**Treasure became substantially weaker.** It loses share in all 12 directed matchups against Engine. The largest drops are Nereon Treasure versus Doreios Engine (48.4% → 14.4%) and Melia Treasure versus Doreios Engine (55.1% → 20.8%). Across the full opponent population, its leader-specific shares are:

| Treasure leader | Before | After |
| --- | ---: | ---: |
| thaleia | 36.3% | 22.0% |
| nereon | 51.1% | 31.2% |
| melia | 58.1% | 43.2% |
| doreios | 58.8% | 45.5% |

Those Treasure summaries average all opponents and are supplementary, not the headline leader-balance estimate.

Treasure now acquires roughly 4–9 Actions per game, but starts scoring about 0.6–2.1 turns later and finishes with fewer VP. This is consistent with overinvestment before scoring, but the study does not isolate the $8 scoring gate from the acquisition model or other changed execution decisions. It does not establish that considering draw cards is inherently harmful.

The headline leader comparisons move by at most 3.5 percentage points, and all conditional paired delta intervals include zero. This is not proof of equivalence. Engine code did not change; Thaleia and Doreios selected different Engine presets after retraining. Nereon Thin and Doreios Race also changed presets. All **21,200** non-Treasure games with unchanged profiles are exactly identical to v4.

No policies were tuned from these outcomes. The report records the regression as observed.

## Study design

Both versions use standard production rules, including Thaleia’s +1 Action. V4 is the previously archived population at `744d0b142e19c7cc06d59421d6461b6f2730992e`; v5 is the all-card expected-income Treasure update at `784cfd52a69984b67c58327afc53525bcf33895e`. The four other families’ implementations are unchanged.

The v5 run repeats all 11,520 training games and 60,000 evaluation games with v4’s exact seed lists (`all-leaders-v4-final`). Training and evaluation remain disjoint within each version. Three presets compete for each leader/non-Treasure-family combination against all rival leaders, all five reference families and both seats. Profiles are frozen before evaluation. The 200 evaluation seeds cross six leader pairs, all 25 family combinations and both seats: 400 games per cell.

The headline selects each leader’s highest observed league-share family separately in each version and reports their actual head-to-head cell. This is the requested strongest-observed-strategy comparison, not a mean across weaker strategies. Selection uses evaluation outcomes; the comparisons remain exploratory. Paired delta intervals resample whole seed blocks 20,000 times with Bonferroni adjustment across six headline rows, conditional on the selected families. They do not account for selection uncertainty or establish optimal play. Reusing v4 seeds enables paired comparisons but is not fresh confirmation.

Before/after changes include adaptation of the other families’ selected presets to the new Treasure opponent. The report lists changed profiles and checks exact equality of every non-Treasure game whose profiles stayed fixed.

## Results and artifacts

- [Before/after report](comparison.md): six headline matchups, 12 directed Treasure-versus-Engine comparisons and supplementary Treasure summaries
- [All 150 cell changes](cell-changes.csv), [machine-readable comparison and changed presets](comparison.json)
- [V5 best-strategy table](best-strategies.md), [full six matrices](report.md), [league](league.json)
- [Manifest](manifest.json), [frozen profiles and training scores](profiles.json), [comparison plan](comparison-plan.json)
- All compressed game records, training records and 300 first-block replay traces
- [Artifact verification](verify.ts), [paired comparison generator](compare.ts), [summary generator](summarize.py)
- [Original v4 archive](../all-leaders-v4/README.md)

## Validation and reproduction

All **11,520 training + 60,000 evaluation games** completed with **zero failures**. Verification checked frozen profile hashes and selection, training budgets, disjoint training/evaluation seeds, complete coverage, seats, scoring and exact regeneration of all reports. All **300 replay traces** replayed to the same standings and reran to identical complete results. Every evaluation game was paired to its v4 seed/seat/cell, and the 21,200 unchanged-profile non-Treasure results matched exactly.

The comparison generator passed an identity-input check: all 150 deltas and six paired intervals were zero. Raw archived files were compared byte-for-byte with the completed run. The unchanged simulation source was previously validated with 79 tests (8,350 assertions), strict TypeScript and application checks.

The v5 source remained clean and unchanged for the run. Eight workers were used; worker count only partitions the same declared games. All commands ran inside the pinned Nix development environment (Bun 1.3.13). No failed games are scored as losses.

At the v5 source commit, in a clean worktree, run inside `nix develop`:

```sh
bun run balance:matrix --out balance-runs/reproduce-v5 --seed all-leaders-v4-final --workers 8
```

At the commit containing this archive, with v5 simulation source, verify and regenerate the comparison inside `nix develop`:

```sh
bun balance-results/all-leaders-v5/verify.ts balance-results/all-leaders-v5
bun balance-results/all-leaders-v5/compare.ts balance-results/all-leaders-v4 balance-results/all-leaders-v5 balance-results/all-leaders-v5
python3 balance-results/all-leaders-v5/summarize.py balance-results/all-leaders-v5
```

Raw run files are byte-preserved and listed in `SHA256SUMS`. Machine-specific worker task files are omitted; portable run configuration is in the manifest. Supplemental reports and generators are separate from the original raw outputs.

Treasure’s one-hand expected-income model uses exact simple cases and deterministic sampling for complex decks, with greedy Action ordering. It does not optimize eventual victory, arbitrary multi-turn investment or Worship. All strategy rankings are conditional on these bots and their limited preset search.
