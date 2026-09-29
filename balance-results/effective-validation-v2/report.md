# Effective sampling: validation-v2

11264 games; 256 seeds per ordered cell; 16 CPUs. No powers or Worship; frozen v14 controls. No pooling of policy, parent, Thin or seat.

## Direct new versus old

| Policy | Strategy | New seat | New share | Adjusted interval |
| --- | --- | ---: | ---: | --- |
| late | Money | 1 | 51.95% | 43.75% to 59.96% |
| late | Money | 2 | 40.04% | 32.03% to 48.24% |
| late | Money + Thin | 1 | 49.41% | 41.02% to 57.62% |
| late | Money + Thin | 2 | 41.80% | 33.79% to 50.00% |
| late | Engine | 1 | 62.89% | 54.88% to 70.70% |
| late | Engine | 2 | 52.15% | 44.14% to 60.55% |
| late | Engine + Thin | 1 | 66.21% | 58.20% to 74.02% |
| late | Engine + Thin | 2 | 50.59% | 42.38% to 58.79% |

## Paired change against the same old opponent

| Policy | Strategy | Seat | Change pp | Adjusted interval pp |
| --- | --- | ---: | ---: | --- |
| late | Money | 1 | -4.88 | -14.45 to 4.30 |
| late | Money | 2 | -3.13 | -12.11 to 5.86 |
| late | Money + Thin | 1 | -7.81 | -17.97 to 2.15 |
| late | Money + Thin | 2 | -0.98 | -10.94 to 8.79 |
| late | Engine | 1 | 6.45 | -3.13 to 16.21 |
| late | Engine | 2 | 8.59 | -1.17 to 18.75 |
| late | Engine + Thin | 1 | 7.81 | -2.34 to 17.77 |
| late | Engine + Thin | 2 | 8.98 | -2.34 to 20.12 |

## Direct comparison with the failed v15 sampler

| Strategy | New seat | New share | Adjusted interval |
| --- | ---: | ---: | --- |
| Money | 1 | 58.20% | 50.20% to 66.21% |
| Money | 2 | 44.53% | 36.33% to 52.73% |
| Money + Thin | 1 | 51.56% | 43.55% to 60.16% |
| Money + Thin | 2 | 44.92% | 36.52% to 52.93% |
| Engine | 1 | 99.80% | 99.22% to 100.00% |
| Engine | 2 | 99.61% | 98.44% to 100.00% |
| Engine + Thin | 1 | 100.00% | 97.77% to 100.00% |
| Engine + Thin | 2 | 99.61% | 98.44% to 100.00% |

## late new 4×4 (P1 shares)

| P1 / P2 | Money | Money + Thin | Engine | Engine + Thin |
| --- | ---: | ---: | ---: | ---: |
| Money | 53.32% | 53.52% | 61.13% | 61.33% |
| Money + Thin | 51.37% | 51.95% | 57.23% | 59.18% |
| Engine | 44.34% | 44.53% | 51.56% | 53.71% |
| Engine + Thin | 42.38% | 41.41% | 49.41% | 50.00% |

Engine versus frozen old Money, with Engine win share by seat:

- Engine as P1: 45.51%.
- Engine as P2: 38.87%.
- Engine + Thin as P1: 41.02%.
- Engine + Thin as P2: 36.72%.

All ending inventories and seed schedules audited. Intervals use 20,000 paired seed bootstrap resamples, adjusted across selected policies within each comparison family. Unanimous rate outcomes use exact binomial boundary bounds. Screening rankings are provisional. A separately seeded confirmation applies only to its frozen policies; it does not establish optimal play.
