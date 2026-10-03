# Pantheon: Bloodlines

**Build an empire. Cultivate your bloodline. Earn the favor of the gods.**

Pantheon: Bloodlines is a competitive deck-building game for 2–4 players set in a mythic Greek world. Each player commands a unique leader affiliated with a god, begins with a modest deck, and acquires the wealth, followers, and territories needed to build the greatest empire.

Your deck is both your engine and your empire. Wealth purchases new cards; Actions create combinations and improve future turns; Territories score victory points but occupy space in your deck. The central decision is when to keep strengthening your engine and when to turn its power into land.

Every deck card has a god affiliation. The leaders chosen for a game determine which gods appear as public event cards. Anyone can Worship these gods. Matching Actions in play unlock stronger blessings, and each leader starts with a unique Temple of their god. A leader gives you a starting direction without restricting which cards you can acquire.

On your turn, play Actions, collect Coins from Treasures, buy cards, and Worship gods between effects, then discard and draw a new hand. Purchased cards join your personal deck through your discard pile. The game ends when the greatest Territories run out or enough shared supply piles are empty; the player with the most territory victory points wins.

## Documents

- [VISION.md](VISION.md) describes the high-level direction and intended player experience.
- [MVP_CARDSET.md](MVP_CARDSET.md) contains the complete v0.1 prototype rules, setup, leaders, god events, and card definitions.
- [UX_DESIGN.md](UX_DESIGN.md) specifies the accepted mobile, desktop and tabletop gameplay, with generated game concept art and E2E user stories.
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) breaks the accepted design into complete, visually reviewed implementation milestones.
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) covers the web scaffold, local setup, browser tests, and PR previews.

## Current scope

The root opens the illustrated sanctuary with working Play, Learn and verified Continue navigation. The layered card gallery at `/gallery/` is built with SvelteKit. Browse all 30 faces with illustrated frames and resource icons, filter by type or god, inspect rules and copy numbers, switch to tabletop sizing, or print the current selection. Deck cards, landscape events, and larger landscape leaders each have their own back. The `/play/` route gathers 2–4 players around an illustrated table, with visible five-letter game codes, joining by code from Play, live seats, and invitations. Hosts can change the player count in Table details without removing occupied seats. Setup and recovery are backed by Firestore events. Begin draws the first player, opens the unique-leader draft, and deals each starting hand. Trusted clients replay the shared seed and event stream. Players can inspect and play Actions, resolve optional trash, mandatory discard and gains, see public reveals, and receive their leader’s blessing. All twelve Actions and four Temples resolve through replayable commands. Players can advance through Treasures and Buys, play individual or all Treasures, buy from all eighteen supply piles, and end turns to draw and reshuffle. The supply shows real stock, costs, remaining Buys, and the discard destination. Players can Worship any shared god between resolved effects in Actions, Treasures, or Buys. The altar shows contributing Actions, exact Devotion, and the active Standard or Favored effect; all four gods resolve through replayable commands.

Both ending conditions lead to a persistent victory scene with every empire’s score, Territory arithmetic, and the fewer-turn or shared-victory tie rule. Players can inspect the finished table and Chronicle or gather a new table with Play again. The public Chronicle shows ordered card movements, their sources and destinations, and exact resource changes. Browse any player’s public play/discard piles or shared trash, inspect cards, and keep your reading position while new moves arrive. Hidden draws stay backs, and reconnecting restores the table without replaying old motion. The next milestone adds a separate read-only shared display.

Version 0.1 uses four leaders, four possible god events, and twelve shared Action piles. It focuses on deck building, divine affiliations, and the race for territory. It has no map, combat system, or direct attacks on other players.

The card costs and powers are initial playtest values, not a claim of tested balance. Use the v0.1 rules as the authority when running the prototype.

## Run locally

Run all development, test, simulation, and repository commands inside the pinned Nix shell. It supplies Bun, Node.js, Java, Git, GitHub CLI, Python, and ripgrep:

```sh
nix develop
bun install --frozen-lockfile
bun run dev
```

Open `http://127.0.0.1:5193/` for the sanctuary or `/gallery/` for the card catalog. To validate the card renders, run `bunx playwright install chromium`, then `bun run verify` inside the same shell. Java is used by the Firebase emulators; the balance simulations run directly in Bun.

To adjust the invitation lettering, run `bun run dev:curve-editor` and open `http://127.0.0.1:5194/`. The [curve editor guide](tools/curve-editor/README.md) covers control points, whole-curve translation, previews, and exporting values.

The project is licensed under [GPLv3](LICENSE). Original card art was created with image generation; the [asset notes](docs/ASSETS.md) include the full prompt set and provenance.

The first online-play milestone adds anonymous sign-in and shared game setup at `/play/`, backed by Firestore events. See [event-sourced setup](docs/EVENT_SOURCING.md) for emulator instructions and the remaining gameplay milestones.

### Print & play

Choose **Print cards** in the gallery to open `/gallery/print/`. Gallery filters and player count carry over. Choose a full setup (including starting decks) or one of each card, A4 or US Letter, and either the in-game colour artwork or plain black-and-white rules to save ink. A full set includes all kingdom piles and spare leaders/Temples; set aside the cards not used in your chosen game.

Deck cards trim to **63 × 88 mm**, events to **120 × 86 mm**, and leaders to **120 × 75 mm**. The landscape cards are rotated on the sheets. Each front page is immediately followed by its matching back page, with columns mirrored for long-edge duplex printing, including partially filled sheets. Alternatively, select **One-sided — fronts only** or **One-sided — backs only** to print separate jobs in matching sheet order. Shared cut lines, black trim borders (1 mm for colour, 2 mm for black-and-white) and 1 mm black bleed simplify cutting and conceal small errors.

Use **Print / save PDF** to open the browser's print dialog. Select your printer or **Save as PDF**, the matching paper size, portrait orientation, **100% / actual size**, background graphics on, and browser headers/footers off. Print duplex with **flip on long edge**, or disable duplex for a one-sided job. The crop marks require a printable area within 4 mm of the paper edge. Test the first front/back pair before printing a full set; physical feed alignment varies by printer. White 2 mm diamonds mark cut intersections: compare them against a light, then use **Adjust double-sided alignment** to move the backs as needed. Positive offsets move right/down as viewed from the back. Keep actual-size scaling when printing a saved PDF.
