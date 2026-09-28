# Completing a match

The [ordinary two-player journey](stories/keep-playing-a-temple-spend-the-last-buy-and-hand-the-turn-to-a-friend-exactly-once/README.md) begins with gathering and drafting. Ariadne keeps playing a Temple, spends her final Buy, then ends her turn. Theseus receives fresh resources while Ariadne draws a private hand. A lost cleanup acknowledgement must neither repeat the draw nor append another event.

Recorded-history scenarios prepare the last turn of a complete legal match, then use the real UI to finish and inspect it:

- [Two empires: the last Acropolis, score inspection, Chronicle, and Play again](stories/2-empires-finish-at-the-last-acropolis/README.md)
- [Two empires: three empty Action piles and fewer turns deciding victory](stories/2-empires-finish-with-fewer-turns-deciding-victory/README.md)
- [Three empires: equal scores and turns share victory](stories/3-empires-finish-with-shared-victory/README.md)
- [Four empires: every score remains visible on a phone](stories/4-empires-finish-with-shared-victory/README.md)

These ending scenarios explicitly identify their recorded prelude; they do not present earlier turns as photographed UI interactions. Separately, [authenticated match tests](../../backend/setup.test.ts) play six complete games from creation through cleanup, using the production command repository with independent authenticated clients: 2/3/4 players and both ending conditions. Every client must replay the same final state; duplicate cleanup is idempotent and further play is rejected. Reducer checks include starting Hamlets, every owned zone, excluded trash, and cleared final resources.

[Fidelity review](FIDELITY.md) compares the actual implementation with the accepted paintings. Each illustrated story shows desktop and phone together, with expandable 4K captures. All three resolutions retain the 2,000 ms combined readiness/animation/layout/capture/comparison deadline and zero changed pixels.
