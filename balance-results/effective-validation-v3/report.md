# Effective sampling: validation-v3

9216 games; 256 seeds per ordered cell; 16 CPUs. No powers or Worship; frozen v14 controls. No pooling of policy, parent, Thin or seat.

## Direct new versus old

| Policy | Strategy | New seat | New share | Adjusted interval |
| --- | --- | ---: | ---: | --- |
| raw | Money | 1 | 50.78% | 42.97% to 58.79% |
| raw | Money | 2 | 46.48% | 38.48% to 54.49% |
| raw | Money + Thin | 1 | 53.13% | 44.53% to 61.33% |
| raw | Money + Thin | 2 | 50.39% | 42.19% to 58.98% |
| raw | Engine | 1 | 72.46% | 64.84% to 79.69% |
| raw | Engine | 2 | 61.33% | 53.13% to 69.34% |
| raw | Engine + Thin | 1 | 70.70% | 63.28% to 77.93% |
| raw | Engine + Thin | 2 | 60.55% | 52.15% to 68.75% |

## Paired change against the same old opponent

| Policy | Strategy | Seat | Change pp | Adjusted interval pp |
| --- | --- | ---: | ---: | --- |
| raw | Money | 1 | -0.98 | -9.18 to 6.84 |
| raw | Money | 2 | -1.76 | -9.38 to 5.66 |
| raw | Money + Thin | 1 | -3.52 | -12.30 to 5.08 |
| raw | Money + Thin | 2 | 7.03 | -1.95 to 15.82 |
| raw | Engine | 1 | 18.16 | 8.01 to 28.13 |
| raw | Engine | 2 | 15.63 | 5.86 to 25.39 |
| raw | Engine + Thin | 1 | 10.74 | 0.98 to 20.31 |
| raw | Engine + Thin | 2 | 20.51 | 9.18 to 31.45 |

## raw new 4×4 (P1 shares)

| P1 / P2 | Money | Money + Thin | Engine | Engine + Thin |
| --- | ---: | ---: | ---: | ---: |
| Money | 50.59% | 50.59% | 54.49% | 54.49% |
| Money + Thin | 50.59% | 50.59% | 54.49% | 54.49% |
| Engine | 46.48% | 46.48% | 50.39% | 50.39% |
| Engine + Thin | 46.48% | 46.48% | 50.39% | 50.39% |

Engine versus frozen old Money, with Engine win share by seat:

- Engine as P1: 48.24%.
- Engine as P2: 44.73%.
- Engine + Thin as P1: 48.24%.
- Engine + Thin as P2: 44.73%.

All ending inventories and seed schedules audited. Intervals use 20,000 paired seed bootstrap resamples, adjusted across selected policies within each comparison family. Unanimous rate outcomes use exact binomial boundary bounds. Screening rankings are provisional. A separately seeded confirmation applies only to its frozen policies; it does not establish optimal play.
