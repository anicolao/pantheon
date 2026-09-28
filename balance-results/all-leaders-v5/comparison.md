# Treasure v5: paired heads-up comparison

Standard rules; Thaleia +1 Action. Each version has 11,520 training games and 60,000 evaluation games. Training and evaluation seeds are identical across versions, with training/evaluation separated within each version. Profiles are retrained independently at equal budgets.

## Best observed strategy versus best observed strategy

Each leader selects its highest observed league-share family separately in each version. Rows show the actual head-to-head cells, not averages over weaker strategies. Selection uses evaluation outcomes: these are exploratory comparisons, not independently validated optimal strategies. Delta intervals bootstrap paired seed blocks 20,000 times and adjust across six rows, conditional on the selected families; they do not adjust for strategy selection.

| Leader A | Leader B | Before strategies (A / B) | Before A share | After strategies (A / B) | After A share | Change | Conditional adjusted delta interval |
| --- | --- | --- | ---: | --- | ---: | ---: | --- |
| thaleia | nereon | engine / engine | 72.6% | engine / engine | 72.8% | +0.1 pp | -4.5 pp to +4.8 pp |
| thaleia | melia | engine / engine | 64.6% | engine / engine | 64.6% | 0.0 pp | -5.3 pp to +5.1 pp |
| thaleia | doreios | engine / engine | 57.6% | engine / engine | 57.4% | -0.3 pp | -6.8 pp to +6.4 pp |
| nereon | melia | engine / engine | 42.1% | engine / engine | 42.1% | 0.0 pp | 0.0 pp to 0.0 pp |
| nereon | doreios | engine / engine | 40.5% | engine / engine | 39.5% | -1.0 pp | -7.4 pp to +5.3 pp |
| melia | doreios | engine / engine | 50.9% | engine / engine | 47.4% | -3.5 pp | -8.9 pp to +1.9 pp |

Each displayed cell contains 400 games per version, across the same 200 seeds and both seats. Changes are computed from unrounded shares; displayed values are rounded to tenths.

## Treasure versus Engine

These fixed-family comparisons show Treasure’s change against each opposing leader’s Engine. Engine presets may change through retraining; these are descriptive same-seed differences.

| Treasure leader | Engine leader | Before Treasure share | After Treasure share | Change |
| --- | --- | ---: | ---: | ---: |
| thaleia | nereon | 22.0% | 12.5% | -9.5 pp |
| thaleia | melia | 15.8% | 5.0% | -10.8 pp |
| thaleia | doreios | 18.0% | 2.6% | -15.4 pp |
| nereon | thaleia | 22.0% | 4.6% | -17.4 pp |
| nereon | melia | 39.3% | 17.1% | -22.1 pp |
| nereon | doreios | 48.4% | 14.4% | -34.0 pp |
| melia | thaleia | 27.1% | 9.5% | -17.6 pp |
| melia | nereon | 47.5% | 30.6% | -16.9 pp |
| melia | doreios | 55.1% | 20.8% | -34.4 pp |
| doreios | thaleia | 36.3% | 11.9% | -24.4 pp |
| doreios | nereon | 48.3% | 33.5% | -14.8 pp |
| doreios | melia | 46.6% | 30.4% | -16.3 pp |

## Treasure against the full population (supplementary)

These four summaries average all three rivals and all five opposing families equally (6,000 games per leader/version). They describe Treasure’s overall performance, not best-strategy leader balance.

| Leader | Before Treasure share | After Treasure share | Change |
| --- | ---: | ---: | ---: |
| thaleia | 36.3% | 22.0% | -14.3 pp |
| nereon | 51.1% | 31.2% | -20.0 pp |
| melia | 58.1% | 43.2% | -14.9 pp |
| doreios | 58.8% | 45.5% | -13.2 pp |

## Treasure behavior (descriptive)

First-points timing is conditional on gaining any points; the number of no-points games (out of 6,000) is shown separately. Acquisitions include both purchases and gains. These are behavioral summaries, not an isolated causal mechanism test.

| Leader | First points, before → after | No-points games, before → after | Action acquisitions/game, before → after | Final VP, before → after |
| --- | ---: | ---: | ---: | ---: |
| thaleia | 9.6 → 11.2 | 0 → 2 | 0.0 → 7.4 | 26.2 → 20.6 |
| nereon | 8.4 → 10.5 | 0 → 0 | 0.0 → 8.8 | 28.9 → 22.6 |
| melia | 8.3 → 10.3 | 0 → 0 | 0.0 → 6.6 | 29.9 → 24.4 |
| doreios | 8.3 → 8.9 | 0 → 0 | 0.0 → 4.3 | 28.4 → 23.4 |

## Attribution and verification

4 training-selected profiles changed. 21,200 non-Treasure games with unchanged profiles reproduce their v4 results exactly. The before/after study includes both the Treasure implementation change and any other families’ preset adaptation to that opponent. Reused evaluation seeds make this paired exploratory evidence, not fresh confirmation.

[All 150 cell differences](cell-changes.csv) · [Changed presets and machine-readable results](comparison.json) · [Original v4 study](../all-leaders-v4/README.md)
