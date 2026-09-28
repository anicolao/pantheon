# Thaleia against selected leader-specific counters

Rules: standard → thaleia-buy. Evaluation seeds are deliberately reused from the prior study. This is an exploratory same-seed comparison, not independent confirmation. Training and evaluation remain disjoint. Strategy selection uses training only.

Training selects the lowest Thaleia victory share among 13 counter configurations for each of her five frozen profiles, then selects her highest such minimum. Selection is separate for each rival and rule. Evaluation seeds never select strategies. Ties retain candidate order. This is a pure-strategy search within these bots, not optimal play or a mixed-strategy equilibrium.

Primary intervals bootstrap paired turn orders by seed block (20,000 resamples), with Bonferroni adjustment across six selected victory shares and three adapted-policy differences. Victory shares split tied wins. Failed games exclude the entire affected seed block. Diagnostic rows are descriptive.

| Rival | Rule | Thaleia strategy | Selected counter | Thaleia victory share | Adjusted interval | Complete blocks |
| --- | --- | --- | --- | ---: | --- | ---: |
| nereon | standard | engine | treasure-0 | 38.5% | 32.1% to 45.1% | 200 |
| nereon | thaleia-buy | engine | treasure-0 | 38.4% | 32.0% to 45.0% | 200 |
| melia | standard | engine | engine-1 | 37.8% | 31.5% to 44.4% | 200 |
| melia | thaleia-buy | engine | engine-1 | 38.3% | 32.0% to 44.5% | 200 |
| doreios | standard | engine | treasure-0 | 28.7% | 23.0% to 34.8% | 200 |
| doreios | thaleia-buy | engine | treasure-0 | 29.3% | 23.4% to 35.3% | 200 |

## Change with both sides reselected

These differences include adaptation by both players; they do not isolate the card effect with fixed policies.

| Rival | Proposed − current | Adjusted interval | Complete blocks |
| --- | ---: | --- | ---: |
| nereon | -0.1 pp | -1.1 pp to +0.5 pp | 200 |
| melia | +0.5 pp | -0.8 pp to +2.0 pp | 200 |
| doreios | +0.5 pp | +0.0 pp to +1.5 pp | 200 |

## Every Thaleia family against its trained counter (descriptive)

| Rival | Rule | Thaleia strategy | Counter | Training share | Held-out share | Complete games |
| --- | --- | --- | --- | ---: | ---: | ---: |
| nereon | standard | treasure | treasure-0 | 21.3% | 25.6% | 400 |
| nereon | standard | engine (selected) | treasure-0 | 34.4% | 38.5% | 400 |
| nereon | standard | thin | treasure-0 | 5.6% | 14.4% | 400 |
| nereon | standard | worship | treasure-0 | 22.5% | 25.8% | 400 |
| nereon | standard | race | treasure-0 | 25.6% | 33.6% | 400 |
| nereon | thaleia-buy | treasure | treasure-0 | 26.9% | 27.8% | 400 |
| nereon | thaleia-buy | engine (selected) | treasure-0 | 35.6% | 38.4% | 400 |
| nereon | thaleia-buy | thin | treasure-0 | 6.3% | 14.9% | 400 |
| nereon | thaleia-buy | worship | treasure-0 | 21.3% | 25.8% | 400 |
| nereon | thaleia-buy | race | treasure-0 | 26.3% | 34.1% | 400 |
| melia | standard | treasure | engine-0 | 19.4% | 21.1% | 400 |
| melia | standard | engine (selected) | engine-1 | 33.1% | 37.8% | 400 |
| melia | standard | thin | treasure-0 | 7.5% | 13.4% | 400 |
| melia | standard | worship | engine-1 | 30.6% | 30.1% | 400 |
| melia | standard | race | engine-0 | 31.3% | 28.4% | 400 |
| melia | thaleia-buy | treasure | engine-0 | 19.4% | 21.3% | 400 |
| melia | thaleia-buy | engine (selected) | engine-1 | 33.1% | 38.3% | 400 |
| melia | thaleia-buy | thin | treasure-0 | 8.8% | 13.4% | 400 |
| melia | thaleia-buy | worship | engine-1 | 29.4% | 30.6% | 400 |
| melia | thaleia-buy | race | engine-0 | 31.3% | 29.1% | 400 |
| doreios | standard | treasure | treasure-0 | 19.4% | 20.3% | 400 |
| doreios | standard | engine (selected) | treasure-0 | 31.9% | 28.7% | 400 |
| doreios | standard | thin | treasure-0 | 8.1% | 10.6% | 400 |
| doreios | standard | worship | treasure-0 | 7.5% | 11.1% | 400 |
| doreios | standard | race | treasure-0 | 27.5% | 25.8% | 400 |
| doreios | thaleia-buy | treasure | treasure-0 | 19.4% | 21.4% | 400 |
| doreios | thaleia-buy | engine (selected) | treasure-0 | 31.9% | 29.3% | 400 |
| doreios | thaleia-buy | thin | treasure-0 | 8.1% | 9.9% | 400 |
| doreios | thaleia-buy | worship | treasure-0 | 6.3% | 11.1% | 400 |
| doreios | thaleia-buy | race | treasure-0 | 27.5% | 25.6% | 400 |
