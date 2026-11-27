# Expansion engine and animation review

Local review: http://127.0.0.1:5193/dev/expansion/#lab

The expansion scenario links open the existing production animation lab at
`/dev/animations/`. They render `GameSession` or `TabletopSession`, issue ordinary
game commands, replay the real reducer, and animate its public movement stream.
There is no parallel scripted animation board.

## Starting points

- `?scenario=expansion-echo-action`: play Borrowed Voice, select an opponent's
  Action, then end the turn to see the borrowed card returned to its owner.
- `?scenario=expansion-echo-treasure` and `expansion-echo-territory`: choose the
  empty-discard deck option and watch the public reveal and resulting effect.
- `?scenario=expansion-wayfinder`: reveal a real deck selection; choose one card
  to keep, or discard all. Revealed cards cannot be shuffled into the same Seek.
- `?scenario=expansion-deploy-draw`: trigger favored Nike worship, then play
  Sacred Academy from the hand. One card resolves three times.
- `?scenario=expansion-deploy-forge`: trigger favored Nike worship, then play
  Forge of Heroes. Each resolution pays its own trash cost before gaining.
- `?scenario=expansion-stillness-of-the-underworld`: favored worship topdecks
  two Territories sequentially; the later selection lands above the first.

All twelve new Actions and all four favored worships have scenarios. Use the
lab's existing surface, seat, observer, player-count, speed, and replay controls.
Fixtures acquire cards and prepare their positions through legal seeded games;
they do not patch decks or supply, and replay/trigger tests cover 2–4 players and
all four tabletop orientations.

## Engine boundaries

New definitions are registered in the shared card catalog. Four-house markets
contain twelve Action piles, plus the six basic piles. Only drafted houses add
Temples and shared worship events. Original-leader games preserve their original
market and phase behavior for replay and frozen-bot compatibility. Expansion
games permit Treasures during Buy and pending Deploy permits the next Action in
any live phase.

Borrowed cards have one physical instance and retain their original owner.
Their transfers, revealed selections, and topdecks carry explicit public source
and destination anchors, shared by actor and observer animations. Reveals and
draws remain undo barriers. Each repeated resolution has a public cue on the
physical card; it does not add another card or Devotion.

The normal lobby still offers its existing leaders. The playable shared-screen
table at `/expansion/` starts with the four new houses, offers all eight leaders,
and supports two to four humans, saved games, reverse drafting, and rematches.
Review scenarios also opt into the new houses. Frozen bot policies reject expansion observations explicitly;
they have not been trained or adapted for these mechanics. This review does not
enable expansion bot games or revise the main gallery layout.

## Validation

Reducer and public-movement tests cover ownership/cleanup, Echo fallback,
Seek filtering and reshuffling, Deploy stacking and separate costs, Bind order,
Shield's conditional draw, and undo. Firestore draft tests cover all four new
leader IDs. Existing rules, replay, bot compatibility, and animation fixtures
remain part of validation.

Rendered browser layout and animation review still requires localhost browser
permission. Passing reducer tests does not substitute for that visual review.
