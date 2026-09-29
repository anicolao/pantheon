Baseline: policy v7 (balance-results/treasure-epsilon-v7); treatment: v8, $0.035.

# Treasure $0.035 tolerance: frozen-profile paired test

21,600 rerun games, 200 original evaluation seed blocks, both seats. Only economic near-ties prefer Treasures; the v6 scoring rule is unchanged. All profiles remain exactly the frozen v6 profiles (originally trained at v5); no retraining. Primary: Treasure against frozen Engine opponents, pooled equally across the other three leaders.

| Treasure leader | Before | After | Change | Eight-comparison adjusted interval | Games per arm |
| --- | ---: | ---: | ---: | --- | ---: |
| thaleia | 37.6% | 38.4% | 0.83 pp | -2.88 to 4.58 pp | 1200 |
| nereon | 38.8% | 40.2% | 1.42 pp | -1.33 to 4.33 pp | 1200 |
| melia | 43.0% | 45.3% | 2.33 pp | -2.04 to 6.67 pp | 1200 |
| doreios | 46.7% | 48.1% | 1.42 pp | -1.46 to 4.25 pp | 1200 |

Intervals use 20,000 paired seed-block bootstrap resamples and Bonferroni adjustment over eight leader-by-baseline comparisons (four versus no epsilon and four versus $0.10). Reused seeds make this exploratory. The intervention is isolated for non-Treasure opponents; Treasure mirrors change both players. These are strategy diagnostics, not an average-strategy headline leader balance table.

## Every Treasure versus Engine matchup

| Treasure leader | Engine leader | Before | After |
| --- | --- | ---: | ---: |
| thaleia | nereon | 49.6% | 50.3% |
| thaleia | melia | 36.8% | 36.9% |
| thaleia | doreios | 26.4% | 28.1% |
| nereon | thaleia | 32.3% | 31.9% |
| nereon | melia | 40.9% | 42.3% |
| nereon | doreios | 43.1% | 46.4% |
| melia | thaleia | 26.5% | 28.9% |
| melia | nereon | 54.0% | 53.6% |
| melia | doreios | 48.4% | 53.4% |
| doreios | thaleia | 30.3% | 31.8% |
| doreios | nereon | 56.8% | 57.8% |
| doreios | melia | 53.1% | 54.9% |

## Treasure across all five opposing families (supplementary)

| Leader | Share before → after | First points turn | Final VP | Acropolises gained | Final deck size |
| --- | ---: | ---: | ---: | ---: | ---: |
| thaleia | 55.9% → 56.2% | 8.12 → 7.97 | 24.68 → 24.78 | 3.53 → 3.55 | 25.39 → 25.33 |
| nereon | 55.2% → 56.9% | 7.14 → 7.10 | 24.27 → 24.44 | 3.42 → 3.45 | 26.07 → 26.20 |
| melia | 60.4% → 63.0% | 7.39 → 7.31 | 25.47 → 25.73 | 3.60 → 3.64 | 25.48 → 25.30 |
| doreios | 58.8% → 58.8% | 7.23 → 7.15 | 24.29 → 24.31 | 3.79 → 3.78 | 20.53 → 20.48 |

Every leader has 6000 Treasure player results per arm. First-points means exclude never-scoring games; counts are in the accompanying JSON report. Only economic candidate selection changes. Scoring, EV estimation and Action play remain unchanged. No non-Treasure control games are rerun. All 108 saved new traces replay to finished production states. Full outcome rows, all 54 affected cell results and source provenance are archived.

## Ending-deck composition

Reconstructed from starting inventories plus gains minus trashes; every final size and VP total is checked. Mean copies include decks without the card. Starting Temples are excluded from supply Action totals.

| Leader | Bronze mean before → after | Decks with Bronze before → after | Drachma mean before → after | Supply Actions before → after |
| --- | ---: | ---: | ---: | ---: |
| thaleia | 0.00 → 0.00 | 0.0% → 0.0% | 3.75 → 3.28 | 3.89 → 4.36 |
| nereon | 0.00 → 0.00 | 0.0% → 0.0% | 3.08 → 2.63 | 4.02 → 4.79 |
| melia | 0.00 → 0.01 | 0.0% → 1.3% | 3.65 → 3.17 | 3.44 → 4.04 |
| doreios | 0.00 → 0.00 | 0.0% → 0.0% | 4.04 → 3.75 | 1.95 → 2.26 |

## All ending supply Action cards

Average copies per deck. Every leader has 6000 decks per version.

| Card | Thaleia before → after | Nereon before → after | Melia before → after | Doreios before → after |
| --- | ---: | ---: | ---: | ---: |
| Oracle’s Acolyte | 0.03 → 0.06 | 0.23 → 0.39 | 0.01 → 0.03 | 0.00 → 0.01 |
| Council of Sages | 3.11 → 3.19 | 0.28 → 0.21 | 0.71 → 0.62 | 1.65 → 1.70 |
| Sacred Academy | 0.21 → 0.39 | 0.20 → 0.28 | 0.16 → 0.31 | 0.14 → 0.29 |
| Harbor Pilot | 0.00 → 0.05 | 0.00 → 0.03 | 0.00 → 0.00 | 0.00 → 0.01 |
| Sea Trade | 0.00 → 0.00 | 0.84 → 0.92 | 0.00 → 0.00 | 0.00 → 0.00 |
| Merchant Fleet | 0.00 → 0.00 | 1.79 → 1.88 | 0.01 → 0.03 | 0.00 → 0.00 |
| Harvest Feast | 0.20 → 0.35 | 0.51 → 0.91 | 1.97 → 2.47 | 0.10 → 0.19 |
| Bronze Recruit | 0.00 → 0.00 | 0.00 → 0.00 | 0.00 → 0.01 | 0.00 → 0.00 |
| Victorious Procession | 0.34 → 0.32 | 0.16 → 0.16 | 0.57 → 0.57 | 0.06 → 0.06 |
