Baseline: policy v6 (balance-results/treasure-scoring-v6); treatment: v8, $0.035.

# Treasure $0.035 tolerance: frozen-profile paired test

21,600 rerun games, 200 original evaluation seed blocks, both seats. Only economic near-ties prefer Treasures; the v6 scoring rule is unchanged. All profiles remain exactly the frozen v6 profiles (originally trained at v5); no retraining. Primary: Treasure against frozen Engine opponents, pooled equally across the other three leaders.

| Treasure leader | Before | After | Change | Eight-comparison adjusted interval | Games per arm |
| --- | ---: | ---: | ---: | --- | ---: |
| thaleia | 37.3% | 38.4% | 1.17 pp | -4.25 to 6.58 pp | 1200 |
| nereon | 40.3% | 40.2% | -0.08 pp | -3.92 to 4.00 pp | 1200 |
| melia | 49.2% | 45.3% | -3.88 pp | -8.92 to 1.13 pp | 1200 |
| doreios | 47.7% | 48.1% | 0.46 pp | -4.21 to 5.25 pp | 1200 |

Intervals use 20,000 paired seed-block bootstrap resamples and Bonferroni adjustment over eight leader-by-baseline comparisons (four versus no epsilon and four versus $0.10). Reused seeds make this exploratory. The intervention is isolated for non-Treasure opponents; Treasure mirrors change both players. These are strategy diagnostics, not an average-strategy headline leader balance table.

## Every Treasure versus Engine matchup

| Treasure leader | Engine leader | Before | After |
| --- | --- | ---: | ---: |
| thaleia | nereon | 50.0% | 50.3% |
| thaleia | melia | 34.0% | 36.9% |
| thaleia | doreios | 27.8% | 28.1% |
| nereon | thaleia | 34.0% | 31.9% |
| nereon | melia | 41.4% | 42.3% |
| nereon | doreios | 45.4% | 46.4% |
| melia | thaleia | 32.1% | 28.9% |
| melia | nereon | 59.6% | 53.6% |
| melia | doreios | 55.8% | 53.4% |
| doreios | thaleia | 34.1% | 31.8% |
| doreios | nereon | 57.4% | 57.8% |
| doreios | melia | 51.5% | 54.9% |

## Treasure across all five opposing families (supplementary)

| Leader | Share before → after | First points turn | Final VP | Acropolises gained | Final deck size |
| --- | ---: | ---: | ---: | ---: | ---: |
| thaleia | 53.8% → 56.2% | 8.19 → 7.97 | 24.31 → 24.78 | 3.48 → 3.55 | 25.37 → 25.33 |
| nereon | 57.0% → 56.9% | 7.46 → 7.10 | 24.38 → 24.44 | 3.44 → 3.45 | 26.15 → 26.20 |
| melia | 65.0% → 63.0% | 7.57 → 7.31 | 25.82 → 25.73 | 3.70 → 3.64 | 24.78 → 25.30 |
| doreios | 60.5% → 58.8% | 7.76 → 7.15 | 24.22 → 24.31 | 3.81 → 3.78 | 18.38 → 20.48 |

Every leader has 6000 Treasure player results per arm. First-points means exclude never-scoring games; counts are in the accompanying JSON report. Only economic candidate selection changes. Scoring, EV estimation and Action play remain unchanged. No non-Treasure control games are rerun. All 108 saved new traces replay to finished production states. Full outcome rows, all 54 affected cell results and source provenance are archived.

## Ending-deck composition

Reconstructed from starting inventories plus gains minus trashes; every final size and VP total is checked. Mean copies include decks without the card. Starting Temples are excluded from supply Action totals.

| Leader | Bronze mean before → after | Decks with Bronze before → after | Drachma mean before → after | Supply Actions before → after |
| --- | ---: | ---: | ---: | ---: |
| thaleia | 0.96 → 0.00 | 96.5% → 0.0% | 2.41 → 3.28 | 5.28 → 4.36 |
| nereon | 0.43 → 0.00 | 43.3% → 0.0% | 2.40 → 2.63 | 5.47 → 4.79 |
| melia | 0.88 → 0.01 | 88.0% → 1.3% | 1.80 → 3.17 | 5.35 → 4.04 |
| doreios | 0.79 → 0.00 | 78.8% → 0.0% | 2.77 → 3.75 | 3.60 → 2.26 |

## All ending supply Action cards

Average copies per deck. Every leader has 6000 decks per version.

| Card | Thaleia before → after | Nereon before → after | Melia before → after | Doreios before → after |
| --- | ---: | ---: | ---: | ---: |
| Oracle’s Acolyte | 0.22 → 0.06 | 0.43 → 0.39 | 0.13 → 0.03 | 0.05 → 0.01 |
| Council of Sages | 2.45 → 3.19 | 0.22 → 0.21 | 0.00 → 0.62 | 0.73 → 1.70 |
| Sacred Academy | 0.97 → 0.39 | 0.38 → 0.28 | 0.95 → 0.31 | 1.36 → 0.29 |
| Harbor Pilot | 0.02 → 0.05 | 0.09 → 0.03 | 0.00 → 0.00 | 0.01 → 0.01 |
| Sea Trade | 0.00 → 0.00 | 0.66 → 0.92 | 0.00 → 0.00 | 0.00 → 0.00 |
| Merchant Fleet | 0.04 → 0.00 | 2.06 → 1.88 | 0.02 → 0.03 | 0.04 → 0.00 |
| Harvest Feast | 0.58 → 0.35 | 1.04 → 0.91 | 3.23 → 2.47 | 0.59 → 0.19 |
| Bronze Recruit | 0.96 → 0.00 | 0.43 → 0.00 | 0.88 → 0.01 | 0.79 → 0.00 |
| Victorious Procession | 0.04 → 0.32 | 0.16 → 0.16 | 0.13 → 0.57 | 0.04 → 0.06 |
