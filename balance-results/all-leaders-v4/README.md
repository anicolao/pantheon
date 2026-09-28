# All leaders and strategies — policy v4

**Historical policy v4:** Treasure changed to all-card expected-income purchasing in v5. The [paired v5 rerun](../all-leaders-v5/README.md) reports before/after figures; the original v4 data here is unchanged.

This study uses standard production leader rules: Thaleia has +1 Action. All five study families (Treasure, Engine, Thin, Worship and Race) use the corrected v4 controller. The correction ledger and complete policy specification are linked below. Legacy Draw is a historical baseline, not a sixth study family.

Each leader uses its highest-share family in the observed league: Engine for all four leaders. Each row reports the actual head-to-head cell, with 400 games across 200 seeds and both seats. Strategies were selected after evaluation, so this is a descriptive comparison of the strongest observed families, not independently validated optimal play.

| Leader A | A strategy | Leader B | B strategy | A victory share | Games |
| --- | --- | --- | --- | ---: | ---: |
| thaleia | engine | nereon | engine | 72.6% | 400 |
| thaleia | engine | melia | engine | 64.6% | 400 |
| thaleia | engine | doreios | engine | 57.6% | 400 |
| nereon | engine | melia | engine | 42.1% | 400 |
| nereon | engine | doreios | engine | 40.5% | 400 |
| melia | engine | doreios | engine | 50.9% | 400 |

Thaleia leads every rival in Engine-versus-Engine play. Melia and Doreios are near even with each other; both lead Nereon. The previous equal-strategy summary diluted these differences with games involving weaker families and did not answer the intended best-strategy-versus-best-strategy question.

Thin and Race remain weak despite the defect corrections: Thin averages 30.1–39.5% for the other three leaders (53.8% for Thaleia), and Race 29.2–41.4%. Fixing decision defects does not make all strategic objectives equally effective. Broad leader averages therefore need to be read alongside the full matrices, not as a definitive ranking of optimal play.

The descriptive counter scan mostly favors Engine, but has exceptions: Nereon’s largest observed worst-case share against Doreios comes from Worship (44.5% against Engine); Doreios’s against Melia comes from Treasure (46.6% against Engine). These are post-evaluation selections, not held-out counter validation.

Engine reaches a full-deck Action phase in 7.2% of Thaleia’s Action phases, 4.5% of Melia’s, 2.1% of Doreios’s and 0.4% of Nereon’s; these denominators include opening and scoring turns. Thaleia Engine uses Favored Worship in 82.3% of its Worship events. The policy supports these plans without guaranteeing full-deck completion every turn.

## Design and interpretation

The 11,520 training games compare three presets for each of 16 leader/non-benchmark-family combinations, against all three rival leaders and all five fixed-reference families, in both seats over eight seeds. Treasure is fixed. Profiles are frozen before evaluation.

The 60,000 evaluation games cover all six distinct leader pairs and all 25 family combinations in both seats across 200 fresh seed blocks. Every strategy cell has 400 games, every leader pair has 10,000, and every leader/family summary has 6,000. A win is one share; ties split the share after the production turn-count tiebreak.

The headline comparison now uses each leader’s best observed family against the other leader’s best observed family, as requested. This is a reporting correction using existing games; no bots or game outcomes changed. The original predeclared six equal-strategy estimates are retained as supplementary evidence and average the 25 strategy pairings equally. Their intervals resample whole seed blocks 20,000 times, with Bonferroni adjustment across the six leader pairs (family-wise alpha 0.05). Those intervals describe the supplementary averages and do not apply to the headline best-strategy table. The individual cells, family rankings and selected counter patterns are descriptive; selecting a strong strategy after evaluation does not establish a validated best response or equilibrium. No tuning used these final win rates.

## Artifacts

- [Headline best-strategy matchups](best-strategies.md), [machine-readable matchups](best-strategies.json)
- [Supplementary full matrix: six strategy matrices and 20 leader/family summaries](report.md)
- [Machine-readable cells](cells.csv), [estimates](estimates.json), [league](league.json)
- [Descriptive counter patterns](counter-patterns.md)
- [Manifest](manifest.json), [frozen profiles and candidate scores](profiles.json)
- All four compressed game-record shards and all 300 first-block replay traces
- [Verification script](verify.ts)
- [Policy v4 design](https://github.com/anicolao/pantheon/blob/744d0b142e19c7cc06d59421d6461b6f2730992e/BOT_STRATEGIES.md), [v4 defect corrections](https://github.com/anicolao/pantheon/blob/744d0b142e19c7cc06d59421d6461b6f2730992e/BOT_DEFECTS.md)

## Provenance and validation

Source: `744d0b142e19c7cc06d59421d6461b6f2730992e`; policy version 4; Bun 1.3.13; seed namespace `all-leaders-v4-final`. The source tree remained clean and unchanged throughout training and evaluation. All commands ran inside the pinned Nix development environment.

All **11,520 training + 60,000 evaluation games** completed with **zero failures**. Verification checked candidate budgets, frozen selection/hash, disjoint seeds, every profile/seat/cell, production scoring and exact regeneration of all reports. All **300 saved traces** replay to the same standings and rerun to identical complete results, including telemetry.

The final source passes **70 simulation tests (8,321 assertions)**, strict TypeScript and application checks (zero errors/warnings). Archived source artifacts were compared byte-for-byte with the completed run; `SHA256SUMS` records their hashes.

Two isolated execution pilots are excluded. An earlier full run on `c81edee3c03e60a847769dc81833bfa1efeaa83c` was interrupted during source review to correct omitted leader play payloads and conditional reveal income. Its evaluation results were not inspected or used. The final run uses a fresh namespace, with all training repeated. Historical v2/v3 studies retain their recorded meaning and are not pooled here.

## Reproduce

Check out the recorded source commit in a clean worktree. Run within `nix develop`:

```sh
bun run balance:matrix --out balance-runs/reproduction-v4 --seed all-leaders-v4-final
```

Check out `2bdef22f506a71441081e57de9a44c35f63e2974` (the archive with v4 policies) to verify its records and first-block deterministic reruns inside `nix develop`:

```sh
bun balance-results/all-leaders-v4/verify.ts balance-results/all-leaders-v4
```

Regenerate the descriptive summaries with `python3 balance-results/all-leaders-v4/summarize.py balance-results/all-leaders-v4`.

The archived worker task files are omitted because they contain machine-specific paths; the manifest and frozen profiles preserve the portable configuration. Raw game records, training scores and replay traces are unchanged.

## Remaining limits

Concrete known decision defects have regression coverage, but this does not certify optimal play. Income, Action reach, Devotion and game horizon are approximate; purchase baskets use separable utilities; known-hand planning is bounded. There is no arbitrary multi-turn hidden-information search, strategic drafting or mixed-strategy equilibrium calculation. Treasure intentionally remains a restricted benchmark. Equal-weight averages can change under another strategy population, and weak family performance can reflect model limitations as well as leader suitability. These results guide the next balance question rather than proving human-play balance.
