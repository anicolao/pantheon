# All-leader, all-strategy heads-up matrix

60,000 evaluation games; 200 fresh seed blocks; 150 strategy matchup cells with both seat orders. Profiles were frozen using separate training seeds. Standard rules unless the enclosing manifest declares another variant.

Primary quantities are the six leader-pair victory shares, averaging the 25 strategy pairings equally. This measures an explicitly uniform strategy population, not optimal play or a metagame equilibrium. Intervals bootstrap whole seed blocks (20,000 resamples) with Bonferroni adjustment across six pairs. Individual strategy cells and rankings are descriptive; no strategy is selected on evaluation and then presented as a validated best response.

| Leader A | Leader B | A victory share | Adjusted interval | Games |
| --- | --- | ---: | --- | ---: |
| thaleia | nereon | 59.5% | 57.8% to 61.2% | 10000 |
| thaleia | melia | 55.5% | 53.7% to 57.2% | 10000 |
| thaleia | doreios | 55.6% | 53.8% to 57.3% | 10000 |
| nereon | melia | 46.3% | 44.3% to 48.3% | 10000 |
| nereon | doreios | 49.9% | 48.0% to 51.8% | 10000 |
| melia | doreios | 52.0% | 49.9% to 54.2% | 10000 |

## Every strategy pairing

Each entry is the row leader’s victory share; all cells have the same game count. Tied wins split their share.

### thaleia (rows) versus nereon (columns)

| Strategy | treasure | engine | thin | worship | race |
| --- | ---: | ---: | ---: | ---: | ---: |
| treasure | 30.8% | 22.0% | 46.5% | 26.5% | 54.5% |
| engine | 78.0% | 72.6% | 96.8% | 77.4% | 90.5% |
| thin | 47.5% | 40.8% | 74.0% | 40.0% | 79.8% |
| worship | 69.4% | 60.6% | 89.4% | 66.9% | 89.5% |
| race | 46.4% | 34.4% | 57.4% | 32.0% | 64.9% |

### thaleia (rows) versus melia (columns)

| Strategy | treasure | engine | thin | worship | race |
| --- | ---: | ---: | ---: | ---: | ---: |
| treasure | 25.4% | 15.8% | 48.1% | 18.6% | 64.8% |
| engine | 72.9% | 64.6% | 91.8% | 75.3% | 94.8% |
| thin | 43.5% | 31.5% | 64.0% | 41.0% | 82.3% |
| worship | 68.0% | 47.5% | 83.5% | 61.5% | 94.5% |
| race | 38.9% | 18.4% | 47.4% | 25.3% | 68.5% |

### thaleia (rows) versus doreios (columns)

| Strategy | treasure | engine | thin | worship | race |
| --- | ---: | ---: | ---: | ---: | ---: |
| treasure | 21.6% | 18.0% | 57.5% | 26.3% | 68.8% |
| engine | 63.7% | 57.6% | 92.6% | 81.4% | 95.0% |
| thin | 42.9% | 24.3% | 72.8% | 43.6% | 80.0% |
| worship | 63.2% | 46.6% | 85.8% | 66.3% | 93.8% |
| race | 30.8% | 14.8% | 47.4% | 28.0% | 66.6% |

### nereon (rows) versus melia (columns)

| Strategy | treasure | engine | thin | worship | race |
| --- | ---: | ---: | ---: | ---: | ---: |
| treasure | 42.3% | 39.3% | 75.3% | 45.3% | 60.3% |
| engine | 52.5% | 42.1% | 77.8% | 51.1% | 66.9% |
| thin | 26.0% | 17.5% | 48.1% | 21.3% | 48.8% |
| worship | 50.5% | 38.8% | 70.9% | 46.9% | 67.5% |
| race | 29.5% | 24.0% | 46.4% | 23.1% | 45.1% |

### nereon (rows) versus doreios (columns)

| Strategy | treasure | engine | thin | worship | race |
| --- | ---: | ---: | ---: | ---: | ---: |
| treasure | 39.1% | 48.4% | 76.9% | 48.0% | 64.3% |
| engine | 51.7% | 40.5% | 90.5% | 49.1% | 69.3% |
| thin | 32.3% | 16.1% | 62.9% | 23.4% | 52.4% |
| worship | 50.6% | 44.5% | 84.8% | 47.3% | 72.6% |
| race | 32.8% | 20.8% | 56.0% | 28.0% | 44.6% |

### melia (rows) versus doreios (columns)

| Strategy | treasure | engine | thin | worship | race |
| --- | ---: | ---: | ---: | ---: | ---: |
| treasure | 45.4% | 55.1% | 79.6% | 61.3% | 79.0% |
| engine | 53.4% | 50.9% | 74.1% | 56.5% | 78.9% |
| thin | 28.7% | 33.4% | 65.4% | 43.0% | 75.0% |
| worship | 41.8% | 39.3% | 66.5% | 46.9% | 71.5% |
| race | 20.6% | 20.4% | 35.9% | 28.5% | 49.8% |

## Leader and strategy summaries (descriptive)

| Leader | Strategy | Share | Games | Mean turns | Full-deck phases | Favored / all Worship |
| --- | --- | ---: | ---: | ---: | --- | --- |
| thaleia | treasure | 36.3% | 6000 | 18.3 | 0/109893 | 0/0 |
| thaleia | engine | 80.3% | 6000 | 14.9 | 6446/89368 | 35118/42692 |
| thaleia | thin | 53.8% | 6000 | 16.1 | 738/96403 | 26709/30465 |
| thaleia | worship | 72.4% | 6000 | 14.7 | 4166/88272 | 38026/44707 |
| thaleia | race | 41.4% | 6000 | 17.5 | 262/105019 | 5099/12834 |
| nereon | treasure | 51.1% | 6000 | 17.6 | 0/105892 | 0/0 |
| nereon | engine | 57.4% | 6000 | 15.9 | 426/95217 | 7915/24727 |
| nereon | thin | 32.3% | 6000 | 17.1 | 4/102825 | 4338/17754 |
| nereon | worship | 55.4% | 6000 | 16.0 | 374/96095 | 12933/27713 |
| nereon | race | 31.4% | 6000 | 18.7 | 6/112196 | 42/12338 |
| melia | treasure | 58.1% | 6000 | 17.8 | 0/106503 | 0/0 |
| melia | engine | 65.0% | 6000 | 15.7 | 4253/94243 | 10255/24986 |
| melia | thin | 39.5% | 6000 | 17.0 | 119/102029 | 4305/11145 |
| melia | worship | 57.1% | 6000 | 15.6 | 4350/93411 | 13692/29177 |
| melia | race | 30.8% | 6000 | 18.6 | 722/111704 | 334/9405 |
| doreios | treasure | 58.8% | 6000 | 16.7 | 0/100370 | 0/0 |
| doreios | engine | 64.6% | 6000 | 16.3 | 2020/97681 | 8611/17197 |
| doreios | thin | 30.1% | 6000 | 17.6 | 194/105728 | 5403/12746 |
| doreios | worship | 54.8% | 6000 | 16.1 | 1588/96432 | 12603/23512 |
| doreios | race | 29.2% | 6000 | 18.6 | 36/111868 | 310/6776 |
