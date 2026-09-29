# Base game: orthogonal thinning

[Full 4×4 report](report.md) · [Per-cell diagnostics and ending decks](cells.json) · [Observed responses](responses.json) · [Manifest](manifest.json)

Thinning is now an independent on/off profile option for Big Money and Engine. Big Money targets expected income per initial draw; Engine targets executable whole-deck draw coverage and retains scoring payload. The parent strategy still handles ordinary purchases and scoring. [Detailed policy design](../../BOT_STRATEGIES.md#orthogonal-thinning-for-money-and-engine-v9).

The trial has **1,000 games in each of sixteen ordered cells (16,000 total)**, no leader powers or Worship, and identical starting decks with inert Temples. Player 1 acts first. Seeds are reused across cells, never pooled. Profiles and default parameters were frozen before evaluation; no tuning followed the outcomes.

The observed response pairing is **Engine / Engine: 51.35% / 48.65%**, with a family-adjusted P1 interval of **46.85%–55.75%**. That is compatible with 50/50, not proof of equivalence or optimal play.

## What thinning changes

It does not consistently improve outcomes. As Player 1 against the same second-player Big Money:
- Big Money rises from 44.35% to 47.20% with thinning.
- Engine falls from 54.55% to 52.65% with thinning.
- Engine + Thin removes 4.11 cards per game and ends with 23.96 cards, versus 29.04 without thinning.
- Full-deck draws remain rare: 0.06 per game for Engine + Thin versus 0.01 for Engine in that matchup.

These are descriptive within-cell comparisons, not pooled strategy results or separately tested effects. The full report shows every ordered cell and diagnostics; results depend on the frozen heuristics.

**The explicit off Engine differs from the previous 2×2 Engine**, which already used legacy thinning. Profiles with thinning omitted still retain their historical behavior. The 4×4 therefore isolates the new on/off decision rather than treating the earlier Engine as a no-thinning baseline.

## Validation and provenance

Source: `2f8ba68ec18d8de994307cb6ff4c92582b8c5053`. All 16 available CPUs ran inside Nix. Zero failed games; all 32,000 ending inventories match final size and VP; no leader/Worship effects occur; off profiles never trash. All 160 saved traces replay to identical scores, turn counts, victory shares and exact ending-card inventories. The archive includes every raw game result and the traces. Files were byte-verified against the run, and all three report artifacts regenerate identically.

The full simulation suite passed: 100 tests and 8,635 assertions. After adding the final future-ending guard, the nine objective-thinning tests passed with 185 assertions, including all sixteen matchups and replay checks. Strict TypeScript and application checks passed (zero application errors/warnings).

The initial run was interrupted during pre-result code review: a tool's speculative future projection could receive credit reserved for a guaranteed current-turn ending. That was corrected and regression-tested before the complete run. No initial-run results informed tuning or appear in this archive.

From a clean tree at the source commit, inside `nix develop`:

```sh
bun scripts/balance-base.ts balance-runs/base-thinning-v1 1000 thinning
bun scripts/balance-base-report.ts balance-runs/base-thinning-v1
```

Regenerate the archived reports inside Nix with:

```sh
bun scripts/balance-base-report.ts balance-results/base-thinning-v1
```
