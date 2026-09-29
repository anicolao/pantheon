# Shared three-turn sampling: pilot

448 games; 16 seeds per ordered cell; 16 CPUs. No powers or Worship; shared turn-2 endgame behavior. Ties split, no seat or strategy pooling.

## New versus old, direct heads-up

New player win share. Adjusted intervals cover the eight separate family/Thin/seat comparisons.

| Strategy | New seat | New win share | Adjusted interval |
| --- | ---: | ---: | --- |
| Money | 1 | 37.50% | 6.25% to 68.75% |
| Money | 2 | 31.25% | 6.25% to 62.50% |
| Money + Thin | 1 | 46.88% | 15.63% to 78.13% |
| Money + Thin | 2 | 34.38% | 6.25% to 65.63% |
| Engine | 1 | 0.00% | 0.00% to 30.27% |
| Engine | 2 | 0.00% | 0.00% to 30.27% |
| Engine + Thin | 1 | 0.00% | 0.00% to 30.27% |
| Engine + Thin | 2 | 0.00% | 0.00% to 30.27% |

## Paired change against fixed old opponent

Replace only the focal player; baseline is the old same-family mirror in the same seat on the same seeds. Positive change favors new. Intervals adjust across eight effects.

| Strategy | New seat | Change pp | Adjusted interval pp |
| --- | ---: | ---: | --- |
| Money | 1 | -12.50 | -40.63 to 9.38 |
| Money | 2 | -18.75 | -53.13 to 15.63 |
| Money + Thin | 1 | -9.38 | -50.00 to 31.25 |
| Money + Thin | 2 | -9.38 | -43.75 to 25.00 |
| Engine | 1 | -43.75 | -75.00 to -12.50 |
| Engine | 2 | -56.25 | -87.50 to -25.00 |
| Engine + Thin | 1 | -53.13 | -84.38 to -21.88 |
| Engine + Thin | 2 | -46.88 | -78.13 to -18.75 |

## New four-by-four

P1 shares, rows P1 and columns P2. Full per-cell adjusted intervals and diagnostics are in matrix.json.

| P1 / P2 | Money | Money + Thin | Engine | Engine + Thin |
| --- | ---: | ---: | ---: | ---: |
| Money | 46.88% | 46.88% | 100.00% | 100.00% |
| Money + Thin | 46.88% | 46.88% | 100.00% | 100.00% |
| Engine | 0.00% | 0.00% | 43.75% | 50.00% |
| Engine + Thin | 0.00% | 0.00% | 46.88% | 53.13% |

Observed maximin response pair: Money / Money, 46.88% / 53.13%. This is a fixed-bot comparison, not optimal play.

All ending inventories and complete seed coverage were audited. Bootstrap resamples whole seeds 20,000 times; unanimous 0%/100% shares use exact binomial boundary intervals rather than degenerate bootstrap bounds. Reproduce inside Nix using balance-sampled-study.ts and balance-sampled-report.ts; source and seed namespace are pinned in manifest.json.
