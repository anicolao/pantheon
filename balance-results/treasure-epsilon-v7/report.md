# Treasure $0.10 tolerance: frozen-profile paired test

21,600 rerun games, 200 original evaluation seed blocks, both seats. Only economic near-ties prefer Treasures; the v6 scoring rule is unchanged. All profiles remain exactly the frozen v6 profiles (originally trained at v5); no retraining. Primary: Treasure against frozen Engine opponents, pooled equally across the other three leaders.

| Treasure leader | Before | After | Change | Four-comparison adjusted interval | Games per arm |
| --- | ---: | ---: | ---: | --- | ---: |
| thaleia | 37.3% | 37.6% | 0.33 pp | -4.71 to 5.29 pp | 1200 |
| nereon | 40.3% | 38.8% | -1.50 pp | -5.13 to 2.17 pp | 1200 |
| melia | 49.2% | 43.0% | -6.21 pp | -10.79 to -1.67 pp | 1200 |
| doreios | 47.7% | 46.7% | -0.96 pp | -5.63 to 3.83 pp | 1200 |

Intervals use 20,000 paired seed-block bootstrap resamples and Bonferroni adjustment over four leaders. Reused seeds make this exploratory. The intervention is isolated for non-Treasure opponents; Treasure mirrors change both players. These are strategy diagnostics, not an average-strategy headline leader balance table.

## Every Treasure versus Engine matchup

| Treasure leader | Engine leader | Before | After |
| --- | --- | ---: | ---: |
| thaleia | nereon | 50.0% | 49.6% |
| thaleia | melia | 34.0% | 36.8% |
| thaleia | doreios | 27.8% | 26.4% |
| nereon | thaleia | 34.0% | 32.3% |
| nereon | melia | 41.4% | 40.9% |
| nereon | doreios | 45.4% | 43.1% |
| melia | thaleia | 32.1% | 26.5% |
| melia | nereon | 59.6% | 54.0% |
| melia | doreios | 55.8% | 48.4% |
| doreios | thaleia | 34.1% | 30.3% |
| doreios | nereon | 57.4% | 56.8% |
| doreios | melia | 51.5% | 53.1% |

## Treasure across all five opposing families (supplementary)

| Leader | Share before → after | First points turn | Final VP | Acropolises gained | Final deck size |
| --- | ---: | ---: | ---: | ---: | ---: |
| thaleia | 53.8% → 55.9% | 8.19 → 8.12 | 24.31 → 24.68 | 3.48 → 3.53 | 25.37 → 25.39 |
| nereon | 57.0% → 55.2% | 7.46 → 7.14 | 24.38 → 24.27 | 3.44 → 3.42 | 26.15 → 26.07 |
| melia | 65.0% → 60.4% | 7.57 → 7.39 | 25.82 → 25.47 | 3.70 → 3.60 | 24.78 → 25.48 |
| doreios | 60.5% → 58.8% | 7.76 → 7.23 | 24.22 → 24.29 | 3.81 → 3.79 | 18.38 → 20.53 |

Every leader has 6000 Treasure player results per arm. First-points means exclude never-scoring games; counts are in summary.json. Only economic candidate selection changes. Scoring, EV estimation and Action play remain unchanged. All 192 sampled non-Treasure games exactly match the unchanged v5/v6 controls, and all 108 saved new traces replay to finished production states. Full outcome rows, all 54 affected cell results and source provenance are archived.

## Ending-deck composition

Reconstructed from starting inventories plus gains minus trashes; every final size and VP total is checked. Mean copies include decks without the card. Starting Temples are excluded from supply Action totals.

| Leader | Bronze mean before → after | Decks with Bronze before → after | Drachma mean before → after | Supply Actions before → after |
| --- | ---: | ---: | ---: | ---: |
| thaleia | 0.96 → 0.00 | 96.5% → 0.0% | 2.41 → 3.75 | 5.28 → 3.89 |
| nereon | 0.43 → 0.00 | 43.3% → 0.0% | 2.40 → 3.08 | 5.47 → 4.02 |
| melia | 0.88 → 0.00 | 88.0% → 0.0% | 1.80 → 3.65 | 5.35 → 3.44 |
| doreios | 0.79 → 0.00 | 78.8% → 0.0% | 2.77 → 4.04 | 3.60 → 1.95 |

## All ending supply Action cards

Average copies per deck. Every leader has 6000 decks per version.

| Card | Thaleia before → after | Nereon before → after | Melia before → after | Doreios before → after |
| --- | ---: | ---: | ---: | ---: |
| Oracle’s Acolyte | 0.22 → 0.03 | 0.43 → 0.23 | 0.13 → 0.01 | 0.05 → 0.00 |
| Council of Sages | 2.45 → 3.11 | 0.22 → 0.28 | 0.00 → 0.71 | 0.73 → 1.65 |
| Sacred Academy | 0.97 → 0.21 | 0.38 → 0.20 | 0.95 → 0.16 | 1.36 → 0.14 |
| Harbor Pilot | 0.02 → 0.00 | 0.09 → 0.00 | 0.00 → 0.00 | 0.01 → 0.00 |
| Sea Trade | 0.00 → 0.00 | 0.66 → 0.84 | 0.00 → 0.00 | 0.00 → 0.00 |
| Merchant Fleet | 0.04 → 0.00 | 2.06 → 1.79 | 0.02 → 0.01 | 0.04 → 0.00 |
| Harvest Feast | 0.58 → 0.20 | 1.04 → 0.51 | 3.23 → 1.97 | 0.59 → 0.10 |
| Bronze Recruit | 0.96 → 0.00 | 0.43 → 0.00 | 0.88 → 0.00 | 0.79 → 0.00 |
| Victorious Procession | 0.04 → 0.34 | 0.16 → 0.16 | 0.13 → 0.57 | 0.04 → 0.06 |
