# Shared three-turn sampling: evaluation

7168 games; 256 seeds per ordered cell; 16 CPUs. No powers or Worship; shared turn-2 endgame behavior. Ties split, no seat or strategy pooling.

## New versus old, direct heads-up

New player win share. Adjusted intervals cover the eight separate family/Thin/seat comparisons.

| Strategy | New seat | New win share | Adjusted interval |
| --- | ---: | ---: | --- |
| Money | 1 | 47.07% | 38.87% to 55.47% |
| Money | 2 | 35.94% | 28.13% to 43.95% |
| Money + Thin | 1 | 47.46% | 39.06% to 55.86% |
| Money + Thin | 2 | 34.57% | 26.56% to 42.38% |
| Engine | 1 | 0.00% | 0.00% to 2.23% |
| Engine | 2 | 0.00% | 0.00% to 2.23% |
| Engine + Thin | 1 | 0.00% | 0.00% to 2.23% |
| Engine + Thin | 2 | 0.00% | 0.00% to 2.23% |

## Paired change against fixed old opponent

Replace only the focal player; baseline is the old same-family mirror in the same seat on the same seeds. Positive change favors new. Intervals adjust across eight effects.

| Strategy | New seat | Change pp | Adjusted interval pp |
| --- | ---: | ---: | --- |
| Money | 1 | -3.32 | -13.28 to 7.03 |
| Money | 2 | -13.67 | -22.85 to -4.88 |
| Money + Thin | 1 | -6.25 | -17.19 to 4.49 |
| Money + Thin | 2 | -11.72 | -21.29 to -2.34 |
| Engine | 1 | -58.59 | -66.60 to -50.59 |
| Engine | 2 | -41.41 | -49.41 to -33.40 |
| Engine + Thin | 1 | -58.20 | -66.21 to -50.00 |
| Engine + Thin | 2 | -41.80 | -50.00 to -33.79 |

## New four-by-four

P1 shares, rows P1 and columns P2. Full per-cell adjusted intervals and diagnostics are in matrix.json.

| P1 / P2 | Money | Money + Thin | Engine | Engine + Thin |
| --- | ---: | ---: | ---: | ---: |
| Money | 51.56% | 51.56% | 100.00% | 100.00% |
| Money + Thin | 51.56% | 51.56% | 100.00% | 100.00% |
| Engine | 0.00% | 0.00% | 54.30% | 53.91% |
| Engine + Thin | 0.00% | 0.00% | 50.00% | 50.98% |

Observed maximin response pair: Money / Money, 51.56% / 48.44%. This is a fixed-bot comparison, not optimal play.

All ending inventories and complete seed coverage were audited. Bootstrap resamples whole seeds 20,000 times; unanimous 0%/100% shares use exact binomial boundary intervals rather than degenerate bootstrap bounds. Reproduce inside Nix using balance-sampled-study.ts and balance-sampled-report.ts; source and seed namespace are pinned in manifest.json.
