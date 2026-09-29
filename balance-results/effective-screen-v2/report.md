# Effective sampling: screen-2

2048 games; 32 seeds per ordered cell; 16 CPUs. No powers or Worship; frozen v14 controls. No pooling of policy, parent, Thin or seat.

## Direct new versus old

| Policy | Strategy | New seat | New share | Adjusted interval |
| --- | --- | ---: | ---: | --- |
| balanced | Money | 1 | 57.81% | 32.81% to 81.25% |
| balanced | Money | 2 | 60.94% | 34.38% to 84.38% |
| balanced | Money + Thin | 1 | 40.63% | 15.63% to 65.63% |
| balanced | Money + Thin | 2 | 45.31% | 20.31% to 70.31% |
| balanced | Engine | 1 | 82.81% | 62.50% to 98.44% |
| balanced | Engine | 2 | 60.94% | 35.94% to 84.38% |
| balanced | Engine + Thin | 1 | 89.06% | 70.31% to 100.00% |
| balanced | Engine + Thin | 2 | 59.38% | 34.38% to 84.38% |
| reliable | Money | 1 | 56.25% | 31.25% to 79.69% |
| reliable | Money | 2 | 56.25% | 31.25% to 79.69% |
| reliable | Money + Thin | 1 | 43.75% | 18.75% to 68.75% |
| reliable | Money + Thin | 2 | 37.50% | 14.06% to 62.50% |
| reliable | Engine | 1 | 84.38% | 64.06% to 98.44% |
| reliable | Engine | 2 | 53.13% | 28.13% to 78.13% |
| reliable | Engine + Thin | 1 | 95.31% | 82.81% to 100.00% |
| reliable | Engine + Thin | 2 | 54.69% | 28.13% to 79.69% |

## Paired change against the same old opponent

| Policy | Strategy | Seat | Change pp | Adjusted interval pp |
| --- | --- | ---: | ---: | --- |
| balanced | Money | 1 | 15.63 | -14.06 to 43.75 |
| balanced | Money | 2 | 3.13 | -20.31 to 26.56 |
| balanced | Money + Thin | 1 | -9.38 | -43.75 to 25.00 |
| balanced | Money + Thin | 2 | -4.69 | -31.25 to 20.31 |
| balanced | Engine | 1 | 17.19 | -9.38 to 45.31 |
| balanced | Engine | 2 | 26.56 | -6.25 to 56.25 |
| balanced | Engine + Thin | 1 | 37.50 | 4.69 to 67.19 |
| balanced | Engine + Thin | 2 | 10.94 | -14.06 to 35.94 |
| reliable | Money | 1 | 14.06 | -17.19 to 43.75 |
| reliable | Money | 2 | -1.56 | -29.69 to 25.00 |
| reliable | Money + Thin | 1 | -6.25 | -37.50 to 25.00 |
| reliable | Money + Thin | 2 | -12.50 | -43.75 to 18.75 |
| reliable | Engine | 1 | 18.75 | -6.25 to 45.31 |
| reliable | Engine | 2 | 18.75 | -15.63 to 50.00 |
| reliable | Engine + Thin | 1 | 43.75 | 14.06 to 71.88 |
| reliable | Engine + Thin | 2 | 6.25 | -21.88 to 34.38 |

## balanced new 4×4 (P1 shares)

| P1 / P2 | Money | Money + Thin | Engine | Engine + Thin |
| --- | ---: | ---: | ---: | ---: |
| Money | 48.44% | 48.44% | 50.00% | 50.00% |
| Money + Thin | 48.44% | 48.44% | 50.00% | 50.00% |
| Engine | 43.75% | 43.75% | 68.75% | 68.75% |
| Engine + Thin | 43.75% | 43.75% | 68.75% | 68.75% |

Engine versus frozen old Money, with Engine win share by seat:

- Engine as P1: 56.25%.
- Engine as P2: 64.06%.
- Engine + Thin as P1: 56.25%.
- Engine + Thin as P2: 64.06%.

## reliable new 4×4 (P1 shares)

| P1 / P2 | Money | Money + Thin | Engine | Engine + Thin |
| --- | ---: | ---: | ---: | ---: |
| Money | 51.56% | 51.56% | 59.38% | 59.38% |
| Money + Thin | 51.56% | 51.56% | 59.38% | 59.38% |
| Engine | 53.13% | 53.13% | 64.06% | 64.06% |
| Engine + Thin | 53.13% | 53.13% | 64.06% | 64.06% |

Engine versus frozen old Money, with Engine win share by seat:

- Engine as P1: 50.00%.
- Engine as P2: 48.44%.
- Engine + Thin as P1: 50.00%.
- Engine + Thin as P2: 48.44%.

All ending inventories and seed schedules audited. Intervals use 20,000 paired seed bootstrap resamples, adjusted across selected policies within each comparison family. Unanimous rate outcomes use exact binomial boundary bounds. Screening rankings are provisional. A separately seeded confirmation applies only to its frozen policies; it does not establish optimal play.
