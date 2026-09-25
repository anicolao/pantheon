# Development

## Stack and repository review

The initial scaffold follows the neighboring `jaipur`, `roborally`, and `wfme` projects: Svelte 5, SvelteKit, TypeScript, Vite, the static adapter, Bun, and Playwright. Their GitHub Pages workflows retain each PR beneath a distinct base path. The gallery adopts that deployment model and tests a non-root base path locally as well as in CI.

`wfme` separates typed card presentation data, generated illustrations, and live HTML rules typography. Its Chronicle card uses a fixed portrait ratio with a bounded art window, cost badge, and rules sections. `roborally` also checks that card titles and rules fit at different display sizes, including large tabletop displays. Pantheon follows those patterns with a reusable `CardFace`, container-relative typography, labeled affiliation colors, and browser layout checks. No neighboring game artwork or game logic is reused.

The neighboring apps use Firebase for synchronized rooms and private hands. That is a candidate for a later gameplay milestone; this first PR is a static card gallery and needs no Firebase account, secrets, authentication, or emulators. Tabletop view currently means larger shared-display card faces, not a playable multiplayer table. A future engine should keep serializable rules and state separate from the renderer and distinguish public table state from private hands.

## Run locally

Use Node 24 and Bun 1.3.10.

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://127.0.0.1:5193/` or `/gallery/`; the illustrated player rules are at `/rules/`. The gallery offers combined type, god, and text filters; keyboard-accessible inspection; larger tabletop cards; separate front/back viewing; and an A4 print layout. Deck cards are 63 × 88.2 mm, landscape events 88.2 × 63 mm, and larger landscape leaders 120 × 75 mm. These are prototype face dimensions, without bleed or cut marks.

Printing includes one representative copy of each currently filtered card, on the displayed side, not a complete supply or an automatically aligned duplex sheet. Enable background graphics and use 100% scale when printing. Supply counts remain in [MVP_CARDSET.md](../MVP_CARDSET.md).

Each face has a permanent catalog number and copy suffix, such as `PB-007-01`, alongside `1/8`. Choose 2, 3, or 4 players to update inventory totals; these include starting decks. For example, Obol totals are 52/58/64 and Hamlet totals are 12/18/24. Territory supply piles have 6/9/12 cards and regular Action piles have 8/12/16 cards. Each unique starting Temple has one copy and no supply pile; each leader and event has one physical copy even when unused in setup. The inspector can select any copy of that card. Numbering describes physical inventory, not remaining supply or ownership. New catalog numbers must be assigned explicitly and never renumbered by sorting or filtering.

## Verify

```sh
bunx playwright install chromium
bun run verify
```

On a Linux machine without browser system libraries, use `bunx playwright install --with-deps chromium` first. Tests build the production app and serve it under `/pantheon/pr-test/`, exercising the same nested paths as a PR preview. The 36 browser cases run across phone, desktop, and 4K viewports and cover all 30 cards, including unique Temples and Worship. They also exercise shared sticky navigation, section anchors and reloads, leader explanations, and every player-count inventory. They check layered faces, image decoding, resource icons and values, rules, text fit, actual transparent frame windows and layer order, copy counts, three distinct back families, filters, keyboard inspection, format-specific print dimensions, and phone/desktop/4K tabletop layouts. Screenshots and traces are saved in Playwright's output directories; CI uploads the HTML report and screenshots.

```sh
PUBLIC_BASE_PATH=/pantheon/pr1 bun run build
PUBLIC_BASE_PATH=/pantheon/pr1 bun run preview
```

The second command serves the build at `http://127.0.0.1:4193/pantheon/pr1/`. The base path is baked in at build time; pass the same value to Vite's local preview server so its mount path matches. No runtime server is required in production.

## Structure

- `src/lib/game/cards.ts`: typed v0.1 definitions matching the rules document.
- `src/lib/components/CardFace.svelte`: reusable card face; no game state or turn logic.
- `src/lib/components/CardBack.svelte`: shared back per form factor, without identifying metadata.
- `src/lib/components/ResourceIcon.svelte` and `RuleText.svelte`: image symbols with live values and accessible wording.
- `src/lib/game/presentation.ts`: formats, physical inventory counts, serial numbers, and ordered resource tokenization.
- `src/routes/rules/+page.svelte`: illustrated player rules, leaders, setup, and Worship.
- `src/lib/components/StickyNav.svelte`: shared sticky filters and section navigation.
- `src/lib/layout/card-fit.ts`: live panel containment and collision checks.
- `src/lib/components/Gallery.svelte`: gallery, filters, inspector, tabletop sizing, and printing.
- `static/assets/cards/`: generated card illustrations, optimized as WebP.
- `static/assets/frames/`, `icons/`, and `backs/`: generated overlay frames, resource components, and three back families.
- `docs/art-prompts.json`: the exact built-in image generation prompts.
- `docs/layer-prompts.json`: the exact prompts for the additional layer assets.
- `tests/e2e/`: production-browser render and interaction checks.

## Publishing

The public repository is `anicolao/pantheon`. Enable GitHub Pages with `gh-pages` and `/` as its branch source. The workflow verifies every PR; same-repository PRs publish to `https://anicolao.github.io/pantheon/prN/`. Fork PRs run verification without a deployment write token. Successful main builds publish to `https://anicolao.github.io/pantheon/`. PR previews are retained after closing so review links remain usable.

The production gallery appears after the gallery PR is merged. This scaffold intentionally leaves the first PR open for review.

## License and assets

Project code, documentation, and original generated illustrations are distributed under GPL-3.0-only; see [LICENSE](../LICENSE). Bundled Fontsource fonts retain their upstream SIL Open Font License notices in their packages. The original illustration prompts are recorded in [art-prompts.json](art-prompts.json); see [ASSETS.md](ASSETS.md) for provenance and processing.

### Card layout checks

The local gallery shows a live card layout report above the collection. `CardFace` measures all visible text lines and nested icons against named frame panels, checks number overlays against their icons, and detects content collisions. Checks rerun after card resizing, content changes, image loads, and font loading. They do not clip content or automatically shrink it to suppress errors. The report is shown in development; `data-layout-state` and `data-layout-issues` remain available to browser tests in production builds.

The e2e suite checks gallery, tabletop, inspector, rules-page, and physical print sizes. Regression cases deliberately move nested icons beyond every panel edge, overflow a clipped title, and overlap the title and cost to verify detection. Dense rules use smaller inline icons, four-bonus cards use a single row, and Territory wreaths and event footer icons are sized for their frame windows.
