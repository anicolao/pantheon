# Direct play and overlapping hands

These recorded-history scenarios exercise real authenticated commands from a legally prepared table. All captures retain the two-second deadline, exact-pixel comparison, and clipping/overlap audits.

- [Tap to play; hold, right-click, or use the keyboard to inspect](stories/tap-to-play-and-hold-or-right-click-to-inspect-without-committing/README.md)
- [Fit an expanded hand and keep fallback paging clear of Treasures](stories/an-expanded-fan-fits-without-paging-and-narrow-screen-paging-stays-clear-of-treasures/README.md)

The hand uses the overlapping fan in the [phone](../../../docs/ux/concepts/04-table-mobile.png) and [desktop](../../../docs/ux/concepts/04-table-desktop.png) concepts. Card faces retain their approved artwork and slight rotation. Each exposed card strip has its own hit area. Paging appears only when strips would become too narrow, and resizing restores the full fan when it fits. Small-phone arrows sit beside the hand, away from Play all Treasures.

Inspection remains available before committing a play. A real touch hold opens the shared frame; releasing it does not send a command. A quick touch, click, Enter, or Space plays directly. Treasure commands validate before moving from Actions to Treasures, so the phase change and card play are atomic.
