# Eight-house playtest models

These eight actor files are byte-for-byte exports of the selected field from
`balance-diagnostics/eight-house-league-v2/consolidation/selected-field.json`.
`provenance.json` records the source manifest and SHA-256 hashes. The 28,000-game
matrix and validation limits are in `docs/research/eight-house-league-2026-11-27/`.

`expansion-schema.ts` is shared by the training bridge and browser worker. Inference
uses the same deterministic masked argmax as the evaluated matrix; there is no
planner, heuristic fallback, or access to hidden opponent hands/deck order.

Play at `/expansion/bots/` on a personal screen, or add trained bot seats at
`/expansion/tabletop/`. Preset tabletop seating uses each chosen leader; randomized
drafting chooses among all eight available leaders. The web playtest saves locally
and exports full event histories. Shared online expansion rooms remain human-only.

Two-player results were measured; three- and four-player support is playtest-only.
