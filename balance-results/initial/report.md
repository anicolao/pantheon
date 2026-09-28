# Basic balance simulation results

24000 / 24000 games completed. Outcomes: {"completed":24000,"turn-limit":0,"command-limit":0,"error":0}.

Exploratory, homogeneous-policy tables: every player uses the same policy. All ordered leader lineups have equal weight within each player count and policy. These are policy-dependent associations, not confirmed balance defects. Neither bot Worships; no event-value or individual-card conclusions are supported.

Intervals are marginal 95% percentile bootstrap intervals (2,000 resamples) over whole seed-block means, including every lineup in a block. They are not adjusted for multiple comparisons. If any game in a count/policy/block fails, that entire block is excluded from that summary; unfinished games are never scored as losses or draws. Different player counts remain separate.

| Players | Policy | Leader | Complete blocks | Games with leader | Victory share | 95% interval | Mean VP | Mean turns |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: | ---: |
| 2 | treasure | thaleia | 200 | 1200 | 22.8% | 20.1%–25.6% | 23.7 | 15.9 |
| 2 | treasure | nereon | 200 | 1200 | 56.8% | 54.0%–59.5% | 26.6 | 15.4 |
| 2 | treasure | melia | 200 | 1200 | 60.8% | 57.4%–64.2% | 26.8 | 15.2 |
| 2 | treasure | doreios | 200 | 1200 | 59.6% | 56.7%–62.5% | 26.1 | 14.9 |
| 2 | draw | thaleia | 200 | 1200 | 20.6% | 18.0%–23.4% | 23.2 | 15.3 |
| 2 | draw | nereon | 200 | 1200 | 64.1% | 61.2%–66.9% | 27.1 | 14.7 |
| 2 | draw | melia | 200 | 1200 | 53.0% | 49.7%–56.1% | 26.0 | 14.9 |
| 2 | draw | doreios | 200 | 1200 | 62.3% | 59.2%–65.3% | 25.8 | 14.1 |
| 3 | treasure | thaleia | 200 | 3600 | 8.8% | 7.4%–10.1% | 20.8 | 15.0 |
| 3 | treasure | nereon | 200 | 3600 | 32.7% | 30.5%–35.0% | 24.4 | 14.8 |
| 3 | treasure | melia | 200 | 3600 | 41.5% | 38.8%–44.1% | 25.1 | 14.8 |
| 3 | treasure | doreios | 200 | 3600 | 50.3% | 47.9%–52.8% | 25.2 | 14.7 |
| 3 | draw | thaleia | 200 | 3600 | 8.0% | 6.8%–9.2% | 19.9 | 14.0 |
| 3 | draw | nereon | 200 | 3600 | 40.6% | 38.1%–43.2% | 24.7 | 13.8 |
| 3 | draw | melia | 200 | 3600 | 30.3% | 28.0%–32.7% | 23.7 | 13.8 |
| 3 | draw | doreios | 200 | 3600 | 54.5% | 51.7%–57.2% | 25.1 | 13.6 |
| 4 | treasure | thaleia | 200 | 4800 | 5.6% | 4.5%–6.6% | 19.5 | 14.7 |
| 4 | treasure | nereon | 200 | 4800 | 22.3% | 20.4%–24.5% | 23.4 | 14.8 |
| 4 | treasure | melia | 200 | 4800 | 30.0% | 27.8%–32.2% | 24.2 | 14.7 |
| 4 | treasure | doreios | 200 | 4800 | 42.1% | 39.7%–44.4% | 25.0 | 14.8 |
| 4 | draw | thaleia | 200 | 4800 | 3.3% | 2.6%–3.9% | 18.5 | 13.6 |
| 4 | draw | nereon | 200 | 4800 | 29.9% | 27.8%–31.9% | 23.7 | 13.6 |
| 4 | draw | melia | 200 | 4800 | 19.0% | 17.3%–20.7% | 22.5 | 13.6 |
| 4 | draw | doreios | 200 | 4800 | 47.8% | 45.2%–50.2% | 24.9 | 13.6 |

| Players | Policy | Completed games | Acropolis endings | Three-pile endings | First-turn victory share |
| --- | --- | ---: | ---: | ---: | ---: |
| 2 | treasure | 2400 | 2400 | 0 | 56.0% |
| 2 | draw | 2400 | 2400 | 0 | 54.9% |
| 3 | treasure | 4800 | 4799 | 1 | 38.3% |
| 3 | draw | 4800 | 4800 | 0 | 37.6% |
| 4 | treasure | 4800 | 4798 | 2 | 30.4% |
| 4 | draw | 4800 | 4800 | 0 | 29.1% |

The ending and first-turn table describes completed games only. Inspect failures before interpreting affected comparisons.
