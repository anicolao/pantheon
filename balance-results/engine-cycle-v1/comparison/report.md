# Thaleia against selected leader-specific counters

Both arms use the revised Engine policy for all leaders. Initial profiles were separately retrained under each rule with equal candidate and game budgets before counter selection. Earlier-policy baseline outcomes are not reused.

Rules: standard → thaleia-actions. Evaluation seeds are deliberately reused from the prior study. This is an exploratory same-seed comparison, not independent confirmation. Training and evaluation remain disjoint. Strategy selection uses training only.

Training selects the lowest Thaleia victory share among 13 counter configurations for each of her five frozen profiles, then selects her highest such minimum. Selection is separate for each rival and rule. Evaluation seeds never select strategies. Ties retain candidate order. This is a pure-strategy search within these bots, not optimal play or a mixed-strategy equilibrium.

Primary intervals bootstrap paired turn orders by seed block (20,000 resamples), with Bonferroni adjustment across six selected victory shares and three adapted-policy differences. Victory shares split tied wins. Failed games exclude the entire affected seed block. Diagnostic rows are descriptive.

| Rival | Rule | Thaleia strategy | Selected counter | Thaleia victory share | Adjusted interval | Complete blocks |
| --- | --- | --- | --- | ---: | --- | ---: |
| nereon | standard | engine | treasure-0 | 65.1% | 58.5% to 71.5% | 200 |
| nereon | thaleia-actions | engine | treasure-0 | 70.9% | 64.6% to 77.1% | 200 |
| melia | standard | engine | engine-0 | 57.0% | 50.6% to 63.7% | 200 |
| melia | thaleia-actions | engine | engine-0 | 73.0% | 67.0% to 78.8% | 200 |
| doreios | standard | engine | treasure-0 | 55.3% | 48.3% to 62.0% | 200 |
| doreios | thaleia-actions | engine | treasure-0 | 79.5% | 74.0% to 84.7% | 200 |

## Change with both sides reselected

These differences include adaptation by both players; they do not isolate the card effect with fixed policies.

| Rival | Proposed − current | Adjusted interval | Complete blocks |
| --- | ---: | --- | ---: |
| nereon | +5.8 pp | -2.0 pp to +13.6 pp | 200 |
| melia | +16.0 pp | +8.1 pp to +23.9 pp | 200 |
| doreios | +24.3 pp | +17.0 pp to +31.6 pp | 200 |

## Every Thaleia family against its trained counter (descriptive)

| Rival | Rule | Thaleia strategy | Counter | Training share | Held-out share | Complete games |
| --- | --- | --- | --- | ---: | ---: | ---: |
| nereon | standard | treasure | treasure-0 | 21.3% | 25.6% | 400 |
| nereon | standard | engine (selected) | treasure-0 | 66.9% | 65.1% | 400 |
| nereon | standard | thin | treasure-0 | 12.5% | 16.6% | 400 |
| nereon | standard | worship | engine-0 | 15.6% | 18.5% | 400 |
| nereon | standard | race | engine-0 | 20.0% | 25.5% | 400 |
| nereon | thaleia-actions | treasure | treasure-0 | 21.3% | 25.6% | 400 |
| nereon | thaleia-actions | engine (selected) | treasure-0 | 74.4% | 70.9% | 400 |
| nereon | thaleia-actions | thin | treasure-0 | 12.5% | 19.4% | 400 |
| nereon | thaleia-actions | worship | engine-0 | 20.0% | 18.8% | 400 |
| nereon | thaleia-actions | race | engine-0 | 25.0% | 30.4% | 400 |
| melia | standard | treasure | engine-2 | 20.6% | 26.4% | 400 |
| melia | standard | engine (selected) | engine-0 | 60.0% | 57.0% | 400 |
| melia | standard | thin | engine-0 | 11.3% | 9.3% | 400 |
| melia | standard | worship | engine-0 | 16.3% | 16.0% | 400 |
| melia | standard | race | engine-0 | 18.8% | 19.6% | 400 |
| melia | thaleia-actions | treasure | engine-2 | 20.6% | 26.4% | 400 |
| melia | thaleia-actions | engine (selected) | engine-0 | 75.0% | 73.0% | 400 |
| melia | thaleia-actions | thin | engine-0 | 12.5% | 9.6% | 400 |
| melia | thaleia-actions | worship | engine-0 | 23.1% | 21.5% | 400 |
| melia | thaleia-actions | race | engine-0 | 21.3% | 22.3% | 400 |
| doreios | standard | treasure | treasure-0 | 19.4% | 20.3% | 400 |
| doreios | standard | engine (selected) | treasure-0 | 68.8% | 55.3% | 400 |
| doreios | standard | thin | treasure-0 | 15.0% | 17.1% | 400 |
| doreios | standard | worship | treasure-0 | 17.5% | 15.8% | 400 |
| doreios | standard | race | engine-0 | 25.0% | 25.6% | 400 |
| doreios | thaleia-actions | treasure | treasure-0 | 19.4% | 20.3% | 400 |
| doreios | thaleia-actions | engine (selected) | treasure-0 | 81.3% | 79.5% | 400 |
| doreios | thaleia-actions | thin | engine-0 | 15.0% | 17.1% | 400 |
| doreios | thaleia-actions | worship | treasure-0 | 9.4% | 11.3% | 400 |
| doreios | thaleia-actions | race | engine-0 | 26.3% | 30.3% | 400 |
