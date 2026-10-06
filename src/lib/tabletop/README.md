# Shared tabletop prototype

Open `/pantheontt/` on a large shared display (locally, `http://localhost:5193/pantheontt/`). Each physical edge starts with a different leader. Tap a leader to join or leave, or use **Add bot** at that edge. Any of the four **Play** buttons starts a table with two to four occupied edges.

- With **Randomize play order** off, humans keep their tapped leaders. Joining represents drafting, so the last occupied edge goes first and play proceeds in reverse join order. Bots choose from leaders not reserved by humans.
- With randomization on, initial leader assignments are discarded. Player 1 is chosen at random; occupied edges play clockwise (South → West → North → East as seen from above), and draft in reverse order. Bots draft through the existing bot engine.
- Each hand stays at its physical edge. Only the active hand faces up and accepts input. The market, temples, status, and play area turn toward that player; controls wait for the actual rotation to finish.
- Tap to play or buy; long-press/right-click a hand or market card to inspect it. Worship and card choices use the shared table and active hand. The market accepts swipes in the current player's orientation.

This is a local shared-screen game, saved automatically in this browser under `pantheon-tabletop-v1`. Reload resumes it; **New table** resets it after confirmation. It does not create a network room or synchronize separate devices. The ordinary network game remains at `/play/`.

`table.ts` creates and appends ordinary game events and validates them through the existing reducer. The preset order adapter compensates for the reducer's seeded first-player rotation by ordering the creation events, without overriding game state. Bots use the production table worker. Game rules, event schemas, and backend authorization are unchanged.

The tabletop reuses production card-flight choreography. Bots await card flights before their next command; cleanup and redealing finish from the departing player’s perspective before the center rotates. Inactive hands shrink to give the active player and center more room. Status and Chronicle identify players by their current leaders. Every corner provides Chronicle, trash, and exit controls facing its edge. Chronicle and trash open in independent docked readers that reserve their own space outside the playable table, stay oriented to the edge that opened them, and do not pause gameplay. There are no central navigation controls. Card flights preserve their source facing throughout travel, including draw reveals; exiting during a game asks for confirmation and preserves the browser save. Browser-created windows can close directly; browsers may require manually closing a tab they did not open through script.

Validation covers deterministic ordering across seeds and seat permutations, bot drafting/play, save restoration, browser joins/drafts/turn handoff, rotated market swiping with motion enabled, and exact desktop/4K screenshots. Phone cases are explicitly excluded because this surface is for several people around one large display. The regular phone game remains covered by its existing tests.
