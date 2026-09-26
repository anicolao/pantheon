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

The root opens the illustrated sanctuary with working Play, Learn and verified Continue navigation. The layered card gallery at `/gallery/` is built with SvelteKit. Browse all 30 faces with illustrated frames and resource icons, filter by type or god, inspect rules and copy numbers, switch to tabletop sizing, or print the current selection. Deck cards, landscape events, and larger landscape leaders each have their own back. The `/play/` route gathers 2–4 players around an illustrated table, with visible five-letter game codes, joining by code from Play, live seats, and invitations. Hosts can change the player count in Table details without removing occupied seats. Setup and recovery are backed by Firestore events. Leader drafting and playable turns are future milestones.

Version 0.1 uses four leaders, four possible god events, and twelve shared Action piles. It focuses on deck building, divine affiliations, and the race for territory. It has no map, combat system, or direct attacks on other players.

The card costs and powers are initial playtest values, not a claim of tested balance. Use the v0.1 rules as the authority when running the prototype.

## Run locally

With Node 24 and Bun 1.3.10 installed:

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://127.0.0.1:5193/` for the sanctuary or `/gallery/` for the card catalog. To validate the card renders, run `bunx playwright install chromium`, then `bun run verify` with Java 21+ available for the Firebase emulators (`nix develop` supplies it).

The project is licensed under [GPLv3](LICENSE). Original card art was created with image generation; the [asset notes](docs/ASSETS.md) include the full prompt set and provenance.

The first online-play milestone adds anonymous sign-in and shared game setup at `/play/`, backed by Firestore events. See [event-sourced setup](docs/EVENT_SOURCING.md) for emulator instructions and the remaining gameplay milestones.
