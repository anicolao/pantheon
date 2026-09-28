# Treasure v6: take affordable top-value points

Treasure improves against every frozen Engine opponent. Pooled across the three opposing leaders, the before → after shares are Thaleia **6.7% → 37.3%**, Nereon **12.0% → 40.3%**, Melia **20.3% → 49.2%**, and Doreios **25.3% → 47.7%**. All four adjusted paired intervals exclude zero, with lower bounds above +18 percentage points. See the [full paired results](report.md).

Across all five opposing families, scoring begins 1.1–3.1 turns earlier and Acropolis acquisitions increase. A follow-up 100-hand audit of every new Treasure deck confirms that ending mean income falls from roughly $8.1–8.2 to $7.2–7.4, while the $8 hit rate falls from 56–59% to 43–48%. The bot wins more by accepting some income dilution in exchange for scoring opportunities. The isolated scoring change provides evidence that the income gate caused a substantial loss of performance against these fixed opponents; it does not establish an optimal scoring rule for every game state.

The v5 policy maximized economic acquisitions across all cards, but required every point acquisition to preserve at least $8 expected hand income. That gate could reject an Acropolis already affordable now. V6 exempts the highest printed VP tier in the complete supply from that income floor. Lower-value points, economic choices, EV estimation and Action play are unchanged. The existing study ending planner still rejects known losing endings and accepts known positive-share endings.

This is an explicit scoring heuristic: money has to be converted into points before the shared supply ends the game. It does not claim that buying top points immediately is optimal in every possible state. In particular, the test does not optimize smaller-point timing, opponent adaptation or multi-turn investment.

## Experimental design

The implementation and experiment plan were committed at `676e560` before play. The baseline is the completed v5 matrix at source `784cfd52a69984b67c58327afc53525bcf33895e`. Both arms use exactly the same v5 profiles, 200 original evaluation seeds, lineups and seats. No profiles are retrained. Standard leader rules apply, including Thaleia +1 Action. Only the Treasure scoring exception changes.

All 54 strategy cells involving Treasure are rerun: 200 seed blocks × two seats × 54 cells = 21,600 games. The primary quantities are four leader-specific Treasure victory shares against the three frozen Engine opponents, with 1,200 games per leader per arm. Intervals bootstrap whole seed blocks (20,000 resamples) and adjust over these four comparisons. The 12 directed leader matchups and summaries against all five families are descriptive. Treasure mirrors change both players; the primary comparisons change only Treasure. Previously examined seeds make this exploratory evidence.

This is a policy diagnostic, not a replacement leader-balance matrix and not an average across strategies presented as each leader's best strategy. The Engine-versus-Engine results are unaffected by this change.

## Validation and provenance

All 84 simulation tests pass (8,371 assertions); strict TypeScript passes. Regression tests cover top-point dilution, cheap-point rejection when the top tier is unaffordable, safe endings, all-card draw investment, and production replays. The run uses all 16 available CPUs. The source is clean and fixed throughout execution. The runner checks 192 non-Treasure games against v5 byte-for-byte and saves 108 production replays. The report generator validates every before/after seed, profile and seat, unique game identities and all cell sizes.

`manifest.json` identifies source, budgets, seeds, assumptions and completion. `profiles.json` is copied unchanged from v5 (its policyVersion 5 correctly records the origin of those frozen parameters). `games-*.jsonl.gz` contain all new outcome rows; `checks-*.json` contain per-worker validation counts; `replays/` contains all affected block-0 traces. Baseline rows remain in `../all-leaders-v5/`. Temporary worker inputs are reconstructed by the CLI and omitted. `summary.json` and `report.md` contain paired estimates, scoring diagnostics and all 54 affected cells. `scoring-examples.json` and `examples.ts` document historical scoring decisions in the 24 archived block-0 Treasure-versus-Engine traces; these examples illustrate mechanism and are not an independent sample of games.

## Reproduction

Run commands inside `nix develop`. At the pinned implementation source:

```sh
bun scripts/balance-scoring.ts balance-runs/treasure-scoring-v6
```

The report scripts were archived after the run. From this repository, regenerate the analysis with:

```sh
bun balance-results/treasure-scoring-v6/summarize.ts balance-results/treasure-scoring-v6
```

`SHA256SUMS` covers the archived raw outcomes, replays, manifest, profiles and generated reports. Copied files are byte-checked against the original run, and report regeneration is checked for identical output.

## Ending-hand follow-up

`income/` archives 24,000 Treasure ending decks, 100 fresh hands each (2.4 million deals), using all 16 CPUs and the same independent sample namespace as the previous audit. Every reconstructed deck agrees with its final size and VP. Every sampled key matches exactly one v5 Treasure deck in the prior audit; all histogram totals, means and $8 counts were independently checked. Mean income and threshold frequency are descriptive, and both depend on the greater number of points in the final inventories. `income.ts` reconstructs inputs from the game rows and runs the existing audit workers; temporary inputs are omitted. After a fresh game run, invoke `bun balance-results/treasure-scoring-v6/income.ts balance-runs/treasure-scoring-v6` inside Nix before generating the report.
