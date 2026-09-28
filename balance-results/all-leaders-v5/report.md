# All-leader, all-strategy heads-up matrix

60,000 evaluation games; 200 fresh seed blocks; 150 strategy matchup cells with both seat orders. Profiles were frozen using separate training seeds. Standard rules unless the enclosing manifest declares another variant.

Primary quantities are the six leader-pair victory shares, averaging the 25 strategy pairings equally. This measures an explicitly uniform strategy population, not optimal play or a metagame equilibrium. Intervals bootstrap whole seed blocks (20,000 resamples) with Bonferroni adjustment across six pairs. Individual strategy cells and rankings are descriptive; no strategy is selected on evaluation and then presented as a validated best response.

| Leader A | Leader B | A victory share | Adjusted interval | Games |
| --- | --- | ---: | --- | ---: |
| thaleia | nereon | 60.2% | 58.6% to 61.8% | 10000 |
| thaleia | melia | 55.6% | 53.8% to 57.4% | 10000 |
| thaleia | doreios | 55.5% | 53.8% to 57.1% | 10000 |
| nereon | melia | 45.2% | 43.1% to 47.3% | 10000 |
| nereon | doreios | 48.4% | 46.6% to 50.2% | 10000 |
| melia | doreios | 51.1% | 48.9% to 53.2% | 10000 |

## Every strategy pairing

Each entry is the row leader’s victory share; all cells have the same game count. Tied wins split their share.

### thaleia (rows) versus nereon (columns)

| Strategy | treasure | engine | thin | worship | race |
| --- | ---: | ---: | ---: | ---: | ---: |
| treasure | 31.9% | 12.5% | 26.0% | 8.6% | 34.5% |
| engine | 95.4% | 72.8% | 92.8% | 76.0% | 91.6% |
| thin | 74.5% | 40.8% | 73.1% | 40.0% | 79.8% |
| worship | 92.0% | 60.6% | 87.8% | 66.9% | 89.5% |
| race | 69.1% | 34.4% | 59.0% | 32.0% | 64.9% |

### thaleia (rows) versus melia (columns)

| Strategy | treasure | engine | thin | worship | race |
| --- | ---: | ---: | ---: | ---: | ---: |
| treasure | 20.1% | 5.0% | 25.5% | 8.5% | 37.0% |
| engine | 90.5% | 64.6% | 94.1% | 77.6% | 96.4% |
| thin | 67.8% | 31.5% | 64.0% | 41.0% | 82.3% |
| worship | 83.3% | 47.5% | 83.5% | 61.5% | 94.5% |
| race | 53.3% | 18.4% | 47.4% | 25.3% | 68.5% |

### thaleia (rows) versus doreios (columns)

| Strategy | treasure | engine | thin | worship | race |
| --- | ---: | ---: | ---: | ---: | ---: |
| treasure | 22.0% | 2.6% | 37.9% | 11.9% | 46.1% |
| engine | 88.1% | 57.4% | 92.6% | 82.9% | 95.6% |
| thin | 58.9% | 24.6% | 72.8% | 43.6% | 82.1% |
| worship | 80.5% | 43.4% | 85.8% | 66.3% | 94.3% |
| race | 42.4% | 12.5% | 47.4% | 28.0% | 67.3% |

### nereon (rows) versus melia (columns)

| Strategy | treasure | engine | thin | worship | race |
| --- | ---: | ---: | ---: | ---: | ---: |
| treasure | 42.5% | 17.1% | 43.3% | 15.9% | 42.9% |
| engine | 69.4% | 42.1% | 77.8% | 51.1% | 66.9% |
| thin | 46.5% | 21.0% | 48.3% | 18.9% | 47.1% |
| worship | 71.6% | 38.8% | 70.9% | 46.9% | 67.5% |
| race | 45.6% | 24.0% | 46.4% | 23.1% | 45.1% |

### nereon (rows) versus doreios (columns)

| Strategy | treasure | engine | thin | worship | race |
| --- | ---: | ---: | ---: | ---: | ---: |
| treasure | 37.4% | 14.4% | 51.6% | 17.9% | 47.3% |
| engine | 66.5% | 39.5% | 90.5% | 49.1% | 69.1% |
| thin | 42.6% | 15.0% | 65.3% | 22.5% | 52.3% |
| worship | 73.0% | 44.5% | 84.8% | 47.3% | 75.4% |
| race | 48.0% | 22.6% | 56.0% | 28.0% | 50.6% |

### melia (rows) versus doreios (columns)

| Strategy | treasure | engine | thin | worship | race |
| --- | ---: | ---: | ---: | ---: | ---: |
| treasure | 47.5% | 20.8% | 61.3% | 43.3% | 65.1% |
| engine | 69.6% | 47.4% | 74.1% | 56.5% | 80.9% |
| thin | 46.5% | 29.0% | 65.4% | 43.0% | 75.0% |
| worship | 61.9% | 39.6% | 66.5% | 46.9% | 72.8% |
| race | 32.1% | 18.8% | 35.9% | 28.5% | 48.5% |

## Leader and strategy summaries (descriptive)

| Leader | Strategy | Share | Games | Mean turns | Full-deck phases | Favored / all Worship |
| --- | --- | ---: | ---: | ---: | --- | --- |
| thaleia | treasure | 22.0% | 6000 | 18.8 | 0/112891 | 0/0 |
| thaleia | engine | 84.6% | 6000 | 14.5 | 8779/86801 | 42862/50374 |
| thaleia | thin | 58.4% | 6000 | 16.2 | 744/97045 | 27441/31176 |
| thaleia | worship | 75.8% | 6000 | 14.8 | 4267/88967 | 38435/45197 |
| thaleia | race | 44.6% | 6000 | 17.8 | 263/106540 | 5195/12990 |
| nereon | treasure | 31.1% | 6000 | 18.1 | 0/108551 | 0/0 |
| nereon | engine | 60.1% | 6000 | 15.9 | 414/95699 | 7872/24597 |
| nereon | thin | 36.0% | 6000 | 17.8 | 43/106521 | 2642/14736 |
| nereon | worship | 59.8% | 6000 | 16.0 | 383/96226 | 12951/27604 |
| nereon | race | 35.3% | 6000 | 18.9 | 6/113626 | 60/12146 |
| melia | treasure | 43.2% | 6000 | 17.8 | 0/106604 | 0/0 |
| melia | engine | 67.9% | 6000 | 15.8 | 4269/95034 | 10111/24976 |
| melia | thin | 43.9% | 6000 | 17.1 | 127/102565 | 4354/11299 |
| melia | worship | 61.2% | 6000 | 15.7 | 4405/93957 | 13650/29381 |
| melia | race | 34.4% | 6000 | 18.9 | 722/113621 | 351/9408 |
| doreios | treasure | 45.5% | 6000 | 16.9 | 1619/101423 | 0/0 |
| doreios | engine | 71.2% | 6000 | 15.6 | 2533/93464 | 11186/21779 |
| doreios | thin | 34.2% | 6000 | 17.7 | 198/106202 | 5441/12933 |
| doreios | worship | 59.0% | 6000 | 16.3 | 1629/97527 | 12564/23551 |
| doreios | race | 31.9% | 6000 | 19.2 | 34/115406 | 140/6020 |
