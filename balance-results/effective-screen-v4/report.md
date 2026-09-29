# Effective sampling: screen-v4

2048 games; 32 seeds per ordered cell; 16 CPUs. No powers or Worship; frozen v14 controls. No pooling of policy, parent, Thin or seat.

## Direct new versus old

| Policy | Strategy | New seat | New share | Adjusted interval |
| --- | --- | ---: | ---: | --- |
| balanced | Money | 1 | 48.44% | 23.44% to 73.44% |
| balanced | Money | 2 | 37.50% | 14.06% to 62.50% |
| balanced | Money + Thin | 1 | 51.56% | 26.56% to 76.56% |
| balanced | Money + Thin | 2 | 37.50% | 14.06% to 62.50% |
| balanced | Engine | 1 | 71.88% | 48.44% to 92.19% |
| balanced | Engine | 2 | 50.00% | 25.00% to 75.00% |
| balanced | Engine + Thin | 1 | 78.13% | 54.69% to 95.31% |
| balanced | Engine + Thin | 2 | 71.88% | 46.88% to 92.19% |
| raw | Money | 1 | 48.44% | 23.44% to 73.44% |
| raw | Money | 2 | 54.69% | 29.69% to 78.13% |
| raw | Money + Thin | 1 | 53.13% | 28.13% to 78.13% |
| raw | Money + Thin | 2 | 43.75% | 20.31% to 68.75% |
| raw | Engine | 1 | 73.44% | 51.56% to 92.19% |
| raw | Engine | 2 | 46.88% | 21.88% to 73.44% |
| raw | Engine + Thin | 1 | 71.88% | 48.44% to 92.19% |
| raw | Engine + Thin | 2 | 64.06% | 39.06% to 85.94% |

## Paired change against the same old opponent

| Policy | Strategy | Seat | Change pp | Adjusted interval pp |
| --- | --- | ---: | ---: | --- |
| balanced | Money | 1 | -3.13 | -29.69 to 21.88 |
| balanced | Money | 2 | -10.94 | -35.94 to 10.94 |
| balanced | Money + Thin | 1 | -3.13 | -28.13 to 21.88 |
| balanced | Money + Thin | 2 | -7.81 | -35.94 to 21.88 |
| balanced | Engine | 1 | 12.50 | -17.19 to 40.63 |
| balanced | Engine | 2 | 9.38 | -23.44 to 42.19 |
| balanced | Engine + Thin | 1 | 26.56 | 0.00 to 51.56 |
| balanced | Engine + Thin | 2 | 23.44 | 3.13 to 46.88 |
| raw | Money | 1 | -3.13 | -25.00 to 18.75 |
| raw | Money | 2 | 6.25 | -15.63 to 31.25 |
| raw | Money + Thin | 1 | -1.56 | -29.69 to 28.13 |
| raw | Money + Thin | 2 | -1.56 | -28.13 to 23.44 |
| raw | Engine | 1 | 14.06 | -12.50 to 42.19 |
| raw | Engine | 2 | 6.25 | -26.56 to 37.50 |
| raw | Engine + Thin | 1 | 20.31 | -7.81 to 48.44 |
| raw | Engine + Thin | 2 | 15.63 | -4.69 to 37.50 |

## balanced new 4×4 (P1 shares)

| P1 / P2 | Money | Money + Thin | Engine | Engine + Thin |
| --- | ---: | ---: | ---: | ---: |
| Money | 56.25% | 56.25% | 62.50% | 62.50% |
| Money + Thin | 56.25% | 56.25% | 62.50% | 62.50% |
| Engine | 53.13% | 53.13% | 57.81% | 57.81% |
| Engine + Thin | 53.13% | 53.13% | 57.81% | 57.81% |

Engine versus frozen old Money, with Engine win share by seat:

- Engine as P1: 54.69%.
- Engine as P2: 45.31%.
- Engine + Thin as P1: 54.69%.
- Engine + Thin as P2: 45.31%.

## raw new 4×4 (P1 shares)

| P1 / P2 | Money | Money + Thin | Engine | Engine + Thin |
| --- | ---: | ---: | ---: | ---: |
| Money | 50.00% | 50.00% | 54.69% | 54.69% |
| Money + Thin | 50.00% | 50.00% | 54.69% | 54.69% |
| Engine | 60.94% | 60.94% | 62.50% | 62.50% |
| Engine + Thin | 60.94% | 60.94% | 62.50% | 62.50% |

Engine versus frozen old Money, with Engine win share by seat:

- Engine as P1: 53.13%.
- Engine as P2: 45.31%.
- Engine + Thin as P1: 53.13%.
- Engine + Thin as P2: 45.31%.

All ending inventories and seed schedules audited. Intervals use 20,000 paired seed bootstrap resamples, adjusted across selected policies within each comparison family. Unanimous rate outcomes use exact binomial boundary bounds. Screening rankings are provisional. A separately seeded confirmation applies only to its frozen policies; it does not establish optimal play.
