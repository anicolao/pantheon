# Effective sampling: screen-v3

1472 games; 16 seeds per ordered cell; 16 CPUs. No powers or Worship; frozen v14 controls. No pooling of policy, parent, Thin or seat.

## Direct new versus old

| Policy | Strategy | New seat | New share | Adjusted interval |
| --- | --- | ---: | ---: | --- |
| balanced | Money | 1 | 59.38% | 21.88% to 93.75% |
| balanced | Money | 2 | 43.75% | 9.38% to 81.25% |
| balanced | Money + Thin | 1 | 59.38% | 21.88% to 90.63% |
| balanced | Money + Thin | 2 | 40.63% | 6.25% to 78.13% |
| balanced | Engine | 1 | 53.13% | 15.63% to 87.50% |
| balanced | Engine | 2 | 65.63% | 28.13% to 96.88% |
| balanced | Engine + Thin | 1 | 71.88% | 37.50% to 100.00% |
| balanced | Engine + Thin | 2 | 62.50% | 25.00% to 93.75% |
| late | Money | 1 | 53.13% | 15.63% to 87.50% |
| late | Money | 2 | 50.00% | 15.63% to 84.38% |
| late | Money + Thin | 1 | 62.50% | 25.00% to 93.75% |
| late | Money + Thin | 2 | 46.88% | 12.50% to 84.38% |
| late | Engine | 1 | 62.50% | 25.00% to 93.75% |
| late | Engine | 2 | 68.75% | 31.25% to 96.88% |
| late | Engine + Thin | 1 | 59.38% | 21.88% to 93.75% |
| late | Engine + Thin | 2 | 71.88% | 34.38% to 100.00% |
| coverage | Money | 1 | 53.13% | 15.63% to 87.50% |
| coverage | Money | 2 | 50.00% | 15.63% to 84.38% |
| coverage | Money + Thin | 1 | 62.50% | 25.00% to 93.75% |
| coverage | Money + Thin | 2 | 46.88% | 12.50% to 84.38% |
| coverage | Engine | 1 | 56.25% | 21.88% to 90.63% |
| coverage | Engine | 2 | 40.63% | 6.25% to 78.13% |
| coverage | Engine + Thin | 1 | 34.38% | 3.13% to 68.75% |
| coverage | Engine + Thin | 2 | 21.88% | 0.00% to 56.25% |

## Paired change against the same old opponent

| Policy | Strategy | Seat | Change pp | Adjusted interval pp |
| --- | --- | ---: | ---: | --- |
| balanced | Money | 1 | 6.25 | -37.50 to 50.00 |
| balanced | Money | 2 | -3.13 | -50.00 to 40.63 |
| balanced | Money + Thin | 1 | 6.25 | -43.75 to 56.25 |
| balanced | Money + Thin | 2 | -6.25 | -59.38 to 43.75 |
| balanced | Engine | 1 | 15.63 | -15.63 to 53.13 |
| balanced | Engine | 2 | 3.13 | -37.50 to 37.50 |
| balanced | Engine + Thin | 1 | 21.88 | -21.88 to 62.50 |
| balanced | Engine + Thin | 2 | 12.50 | -50.00 to 71.88 |
| late | Money | 1 | 0.00 | -50.00 to 43.75 |
| late | Money | 2 | 3.13 | -46.88 to 53.13 |
| late | Money + Thin | 1 | 9.38 | -34.38 to 53.13 |
| late | Money + Thin | 2 | 0.00 | -40.63 to 43.75 |
| late | Engine | 1 | 25.00 | -6.25 to 62.50 |
| late | Engine | 2 | 6.25 | -28.13 to 37.50 |
| late | Engine + Thin | 1 | 9.38 | -34.38 to 46.88 |
| late | Engine + Thin | 2 | 21.88 | -25.00 to 68.75 |
| coverage | Money | 1 | 0.00 | -50.00 to 43.75 |
| coverage | Money | 2 | 3.13 | -46.88 to 53.13 |
| coverage | Money + Thin | 1 | 9.38 | -34.38 to 53.13 |
| coverage | Money + Thin | 2 | 0.00 | -40.63 to 43.75 |
| coverage | Engine | 1 | 18.75 | -9.38 to 50.00 |
| coverage | Engine | 2 | -21.88 | -65.63 to 15.63 |
| coverage | Engine + Thin | 1 | -15.63 | -65.63 to 37.50 |
| coverage | Engine + Thin | 2 | -28.13 | -75.00 to 18.75 |

## balanced new 4×4 (P1 shares)

| P1 / P2 | Money | Money + Thin | Engine | Engine + Thin |
| --- | ---: | ---: | ---: | ---: |
| Money | 50.00% | 50.00% | 43.75% | 43.75% |
| Money + Thin | 50.00% | 50.00% | 43.75% | 43.75% |
| Engine | 40.63% | 40.63% | 53.13% | 53.13% |
| Engine + Thin | 40.63% | 40.63% | 53.13% | 53.13% |

Engine versus frozen old Money, with Engine win share by seat:

- Engine as P1: 31.25%.
- Engine as P2: 50.00%.
- Engine + Thin as P1: 31.25%.
- Engine + Thin as P2: 50.00%.

## late new 4×4 (P1 shares)

| P1 / P2 | Money | Money + Thin | Engine | Engine + Thin |
| --- | ---: | ---: | ---: | ---: |
| Money | 56.25% | 56.25% | 65.63% | 65.63% |
| Money + Thin | 50.00% | 50.00% | 65.63% | 65.63% |
| Engine | 56.25% | 50.00% | 56.25% | 56.25% |
| Engine + Thin | 56.25% | 50.00% | 50.00% | 50.00% |

Engine versus frozen old Money, with Engine win share by seat:

- Engine as P1: 43.75%.
- Engine as P2: 43.75%.
- Engine + Thin as P1: 43.75%.
- Engine + Thin as P2: 37.50%.

## coverage new 4×4 (P1 shares)

| P1 / P2 | Money | Money + Thin | Engine | Engine + Thin |
| --- | ---: | ---: | ---: | ---: |
| Money | 56.25% | 56.25% | 65.63% | 75.00% |
| Money + Thin | 50.00% | 50.00% | 62.50% | 71.88% |
| Engine | 25.00% | 31.25% | 46.88% | 78.13% |
| Engine + Thin | 15.63% | 21.88% | 28.13% | 56.25% |

Engine versus frozen old Money, with Engine win share by seat:

- Engine as P1: 25.00%.
- Engine as P2: 31.25%.
- Engine + Thin as P1: 12.50%.
- Engine + Thin as P2: 28.13%.

All ending inventories and seed schedules audited. Intervals use 20,000 paired seed bootstrap resamples, adjusted across selected policies within each comparison family. Unanimous rate outcomes use exact binomial boundary bounds. Screening rankings are provisional. A separately seeded confirmation applies only to its frozen policies; it does not establish optimal play.
