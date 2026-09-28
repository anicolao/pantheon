# Treasure scoring fix: frozen-profile paired test

21,600 rerun games, 200 original evaluation seed blocks, both seats. Only the top-point scoring gate changes. All profiles remain exactly v5; no retraining. Primary: Treasure against frozen Engine opponents, pooled equally across the other three leaders.

| Treasure leader | Before | After | Change | Four-comparison adjusted interval | Games per arm |
| --- | ---: | ---: | ---: | --- | ---: |
| thaleia | 6.7% | 37.3% | 30.54 pp | 26.71 to 34.58 pp | 1200 |
| nereon | 12.0% | 40.3% | 28.21 pp | 23.75 to 32.50 pp | 1200 |
| melia | 20.3% | 49.2% | 28.88 pp | 24.92 to 32.83 pp | 1200 |
| doreios | 25.3% | 47.7% | 22.42 pp | 18.46 to 26.42 pp | 1200 |

Intervals use 20,000 paired seed-block bootstrap resamples and Bonferroni adjustment over four leaders. Reused seeds make this exploratory. The intervention is isolated for non-Treasure opponents; Treasure mirrors change both players. These are strategy diagnostics, not an average-strategy headline leader balance table.

## Every Treasure versus Engine matchup

| Treasure leader | Engine leader | Before | After |
| --- | --- | ---: | ---: |
| thaleia | nereon | 12.5% | 50.0% |
| thaleia | melia | 5.0% | 34.0% |
| thaleia | doreios | 2.6% | 27.8% |
| nereon | thaleia | 4.6% | 34.0% |
| nereon | melia | 17.1% | 41.4% |
| nereon | doreios | 14.4% | 45.4% |
| melia | thaleia | 9.5% | 32.1% |
| melia | nereon | 30.6% | 59.6% |
| melia | doreios | 20.8% | 55.8% |
| doreios | thaleia | 11.9% | 34.1% |
| doreios | nereon | 33.5% | 57.4% |
| doreios | melia | 30.4% | 51.5% |

## Treasure across all five opposing families (supplementary)

| Leader | Share before → after | First points turn | Final VP | Acropolises gained | Final deck size |
| --- | ---: | ---: | ---: | ---: | ---: |
| thaleia | 22.0% → 53.8% | 11.24 → 8.19 | 20.62 → 24.31 | 2.16 → 3.48 | 28.84 → 25.37 |
| nereon | 31.2% → 57.0% | 10.49 → 7.46 | 22.57 → 24.38 | 2.17 → 3.44 | 32.47 → 26.15 |
| melia | 43.2% → 65.0% | 10.25 → 7.57 | 24.39 → 25.82 | 2.76 → 3.70 | 28.00 → 24.78 |
| doreios | 45.5% → 60.5% | 8.86 → 7.76 | 23.45 → 24.22 | 3.07 → 3.81 | 20.49 → 18.38 |

Every leader has 6000 Treasure player results per arm. First-points means exclude never-scoring games; counts are in summary.json. Economic acquisition and Action-play rules remain unchanged. Different scoring changes later inventories, opportunities and game endings, as expected. All 192 sampled non-Treasure games exactly match v5, and all 108 saved new traces replay to finished production states. Full outcome rows, all 54 affected cell results and source provenance are archived.

## Independent ending income: 100 hands per Treasure deck

24,000 new ending decks, 2,400,000 fresh deals; same sample seeds and cash execution as the v5 ending-deck audit. Actions are included. These final inventories contain different amounts of points and arise at different ending turns.

| Leader | Mean Coins before → after | Chance of at least $8 before → after |
| --- | ---: | ---: |
| nereon | 8.19 → 7.30 | 56.9% → 44.9% |
| thaleia | 8.24 → 7.20 | 56.2% → 43.2% |
| melia | 8.09 → 7.34 | 56.1% → 46.2% |
| doreios | 8.22 → 7.41 | 59.3% → 47.5% |
