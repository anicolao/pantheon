# Effective sampling: validation

9216 games; 256 seeds per ordered cell; 16 CPUs. No powers or Worship; frozen v14 controls. No pooling of policy, parent, Thin or seat.

## Direct new versus old

| Policy | Strategy | New seat | New share | Adjusted interval |
| --- | --- | ---: | ---: | --- |
| balanced | Money | 1 | 52.34% | 44.34% to 60.35% |
| balanced | Money | 2 | 44.53% | 36.52% to 52.73% |
| balanced | Money + Thin | 1 | 52.93% | 44.34% to 61.13% |
| balanced | Money + Thin | 2 | 46.48% | 38.09% to 54.49% |
| balanced | Engine | 1 | 69.14% | 61.33% to 76.56% |
| balanced | Engine | 2 | 63.87% | 55.86% to 71.68% |
| balanced | Engine + Thin | 1 | 74.22% | 66.60% to 81.05% |
| balanced | Engine + Thin | 2 | 65.04% | 56.64% to 72.85% |

## Paired change against the same old opponent

| Policy | Strategy | Seat | Change pp | Adjusted interval pp |
| --- | --- | ---: | ---: | --- |
| balanced | Money | 1 | 1.17 | -7.42 to 9.77 |
| balanced | Money | 2 | -4.30 | -12.89 to 4.49 |
| balanced | Money + Thin | 1 | 0.20 | -9.38 to 9.18 |
| balanced | Money + Thin | 2 | -0.78 | -9.77 to 8.20 |
| balanced | Engine | 1 | 13.28 | 3.32 to 22.85 |
| balanced | Engine | 2 | 19.73 | 9.77 to 29.49 |
| balanced | Engine + Thin | 1 | 17.77 | 7.81 to 27.54 |
| balanced | Engine + Thin | 2 | 21.48 | 11.52 to 31.64 |

## balanced new 4×4 (P1 shares)

| P1 / P2 | Money | Money + Thin | Engine | Engine + Thin |
| --- | ---: | ---: | ---: | ---: |
| Money | 56.25% | 56.25% | 62.50% | 62.50% |
| Money + Thin | 56.25% | 56.25% | 62.50% | 62.50% |
| Engine | 50.78% | 50.78% | 54.10% | 54.10% |
| Engine + Thin | 50.78% | 50.78% | 54.10% | 54.10% |

Engine versus frozen old Money, with Engine win share by seat:

- Engine as P1: 53.52%.
- Engine as P2: 38.48%.
- Engine + Thin as P1: 53.52%.
- Engine + Thin as P2: 38.48%.

All ending inventories and seed schedules audited. Intervals use 20,000 paired seed bootstrap resamples, adjusted across selected policies within each comparison family. Unanimous rate outcomes use exact binomial boundary bounds. Screening rankings are provisional. A separately seeded confirmation applies only to its frozen policies; it does not establish optimal play.
