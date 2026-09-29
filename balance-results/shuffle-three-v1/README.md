# Shared three-turn acquisition sampling (v15)

Status: implementation and targeted tests complete; runtime pilot and frozen evaluation pending.

Both Money and Engine now evaluate every economic acquisition using the same production-rule sampler. Mean total spendable coins over three consecutive turns is Money's objective; mean total cards actually drawn is Engine's. Opening draws count, and redraws count if they actually occur. This is raw draw volume, not probability of drawing the entire deck or a fraction of its size.

Each of 64 samples starts with a fresh shuffle of the public owned inventory plus the acquisition. Turns carry deck, discard, trash, gained cards and reshuffles forward. There are no additional purchases or Worship inside samples; card effects still apply. Candidate additions share initial insertion ranks, and existing copies share random ranks. Production reshuffles use paired seeds; different cleanup orders can still create sampling variance. No real game seed or hidden deck order is consulted.

The same bounded play controller is used for both objectives, including actual Action/discard play. It preserves Action chains and prioritizes useful draw/payload. Within rollouts, gain choices use a fixed resource/draw continuation score; optional Thin removes inert cards and weak money when cycle payload allows. These bounded continuation heuristics are shared, not recursively optimized. Actual optional removals and upgrades compare the sampled parent metric, charging lost VP/current cash and protecting known endings. Thin off never optionally trashes.

All card types use sampling; there are no analytic Treasure shortcuts, Engine capacity scores, named openings, separate Treasure utility or Treasure epsilon preference in economic acquisition. Exact ties use lower cost then card ID for both parents. Current shared endgame scoring, safe ending plans and the affordable top-point priority sit above economic selection. Thus points can still be bought despite dilution. The new controller applies the top-tier priority identically to both parents (old Engine compared its utility with investments).

This requested three-turn deck test does not plan a second complementary purchase. It measures the candidate's effect on the deck that would actually exist after this purchase, then plays that deck. Total draws can reward cycling without sufficient money; this is a property to measure, not silently correct by adding a different objective.

## Frozen experiment

Retain exact v14 profiles as old controls. New profiles differ by the shared sampled controller. No outcome-driven tuning of samples or metric is planned. A separate runtime pilot is excluded from reported evaluation.

Evaluate 256 fresh common seeds in 28 ordered cells: new Money/Engine × Thin complete 4×4 (16 cells); each of the four profiles against its old version in both seats (8); and four old mirrors (4). Total 7,168 games. All have no leader powers or Worship and identical starting decks. Runs use all available CPUs inside Nix with a dynamic work queue.

Report the eight direct new-versus-old shares separately by seat. Also compare each new arm with the old mirror in the same seat on paired seeds, holding the opponent fixed. Report the new full 4×4 and each row's best response, with no seat/strategy pooling. Bootstrap intervals adjust separately over the eight direct comparisons, eight paired changes and sixteen new matrix cells.

Historical defaults remain available as v14BaseProfiles; modern baseProfiles use evaluation: shuffle-3. New policy definitions live in sampled.ts.
