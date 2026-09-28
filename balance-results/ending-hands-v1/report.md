# Ending-deck audit: 100 fresh hands from every deck

240,000 ending decks (both players in every v4/v5 evaluation game), 100 hands each: **24,000,000 deals**. Every hand starts with a fresh shuffle and plays Actions before counting spendable Coins. Both versions use the same v5 cash play rule. No purchases or Worship; optional trash/upgrades declined. This tests the income model on independently dealt hands, not optimal play or historical per-turn cash.

## Treasure ending decks

| Leader | Mean Coins before | Mean Coins after | P(≥$8) before | P(≥$8) after |
| --- | ---: | ---: | ---: | ---: |
| thaleia | 6.153 | 8.235 | 27.63% | 56.16% |
| nereon | 6.154 | 8.187 | 27.30% | 56.88% |
| melia | 6.158 | 8.088 | 27.76% | 56.05% |
| doreios | 6.331 | 8.216 | 30.10% | 59.26% |

600,000 dealt hands per leader and version, from 6,000 decks. Each deck has equal weight.

## Calibration of the v5 EV estimator

The v5 estimator is evaluated on both versions’ ending decks. Its synthetic sample orders are separate from these fresh shuffles. Bias is predicted minus dealt mean.

| Leader | Version | Predicted mean | Dealt mean | Bias | Mean absolute per-deck discrepancy |
| --- | --- | ---: | ---: | ---: | ---: |
| thaleia | v4 | 6.154 | 6.153 | +0.001 | 0.169 |
| thaleia | v5 | 8.374 | 8.235 | +0.138 | 0.293 |
| nereon | v4 | 6.154 | 6.154 | -0.000 | 0.173 |
| nereon | v5 | 8.293 | 8.187 | +0.106 | 0.271 |
| melia | v4 | 6.160 | 6.158 | +0.001 | 0.173 |
| melia | v5 | 8.278 | 8.088 | +0.190 | 0.300 |
| doreios | v4 | 6.334 | 6.331 | +0.003 | 0.172 |
| doreios | v5 | 8.221 | 8.216 | +0.005 | 0.246 |

## All leader/strategy ending decks

| Leader | Strategy | Mean before | Mean after | P(≥$8) before | P(≥$8) after |
| --- | --- | ---: | ---: | ---: | ---: |
| thaleia | treasure | 6.153 | 8.235 | 27.63% | 56.16% |
| thaleia | engine | 6.907 | 7.470 | 38.83% | 45.71% |
| thaleia | thin | 7.228 | 7.217 | 42.32% | 42.30% |
| thaleia | worship | 7.313 | 7.268 | 43.90% | 43.49% |
| thaleia | race | 5.844 | 5.821 | 24.07% | 23.77% |
| nereon | treasure | 6.154 | 8.187 | 27.30% | 56.88% |
| nereon | engine | 6.789 | 6.742 | 35.62% | 34.99% |
| nereon | thin | 6.450 | 5.986 | 30.98% | 24.48% |
| nereon | worship | 6.862 | 6.807 | 36.80% | 36.09% |
| nereon | race | 5.535 | 5.512 | 18.86% | 18.60% |
| melia | treasure | 6.158 | 8.088 | 27.76% | 56.05% |
| melia | engine | 6.738 | 6.655 | 35.03% | 33.97% |
| melia | thin | 6.500 | 6.440 | 32.14% | 31.34% |
| melia | worship | 7.059 | 6.978 | 39.89% | 38.91% |
| melia | race | 5.822 | 5.812 | 22.74% | 22.59% |
| doreios | treasure | 6.331 | 8.216 | 30.10% | 59.26% |
| doreios | engine | 6.335 | 6.735 | 29.76% | 35.34% |
| doreios | thin | 6.644 | 6.555 | 34.06% | 32.92% |
| doreios | worship | 6.611 | 6.527 | 33.86% | 32.74% |
| doreios | race | 5.789 | 5.613 | 22.47% | 20.11% |

## Interpretation limits

A higher mean does not mathematically guarantee a higher threshold probability; the full income histograms are archived. More importantly, ending-deck income is not accumulated VP or the time needed to build that deck. These final decks contain different quantities of points and come from games that may end on different turns. The prior matrix supplies scoring timing and final VP; this audit alone cannot isolate the scoring gate, acquisition policy or estimator error as a cause of lost games.

All observations here are descriptive. A hundred hands gives a noisy estimate for an individual deck; the aggregate pools many decks, but the original games share 200 seed blocks. The audit is not 24 million independent game outcomes.
