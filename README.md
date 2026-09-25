# Pantheon: Bloodlines

**Build an empire. Cultivate your bloodline. Earn the favor of the gods.**

Pantheon: Bloodlines is a competitive deck-building game for 2–4 players set in a mythic Greek world. Each player commands a unique leader affiliated with a god, begins with a modest deck, and acquires the wealth, followers, and territories needed to build the greatest empire.

Your deck is both your engine and your empire. Wealth purchases new cards; Actions create combinations and improve future turns; Territories score victory points but occupy space in your deck. The central decision is when to keep strengthening your engine and when to turn its power into land.

Every deck card has a god affiliation. The leaders chosen for a game determine which gods appear as public event cards. Anyone can pay to invoke these gods, while matching cards and a leader’s bloodline unlock stronger blessings. A leader gives you a starting direction without restricting which cards you can acquire.

On your turn, play Actions, collect Coins from Treasures, buy cards or invoke a god, then discard and draw a new hand. Purchased cards join your personal deck through your discard pile. The game ends when the greatest Territories run out or enough shared supply piles are empty; the player with the most territory victory points wins.

## Documents

- [VISION.md](VISION.md) describes the high-level direction and intended player experience.
- [MVP_CARDSET.md](MVP_CARDSET.md) contains the complete v0.1 prototype rules, setup, leaders, god events, and card definitions.
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) covers the web scaffold, local setup, browser tests, and PR previews.

## Current scope

The first web milestone is an illustrated card gallery built with SvelteKit. Browse all 26 card faces, filter by type or god, inspect rules, switch to larger tabletop cards, or print the current selection. Gameplay and synchronized multiplayer tables are future milestones.

Version 0.1 uses four leaders, four possible god events, and twelve shared Action piles. It focuses on deck building, divine affiliations, and the race for territory. It has no map, combat system, or direct attacks on other players.

The card costs and powers are initial playtest values, not a claim of tested balance. Use the v0.1 rules as the authority when running the prototype.

## Run the gallery

With Node 24 and Bun 1.3.10 installed:

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://127.0.0.1:5193/`. To validate the card renders, run `bunx playwright install chromium`, then `bun run verify`.

The project is licensed under [GPLv3](LICENSE). Original card art was created with image generation; the [asset notes](docs/ASSETS.md) include the full prompt set and provenance.
