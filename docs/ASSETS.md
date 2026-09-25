# Card artwork

The 26 illustrations in `static/assets/cards/` were generated with the built-in image generation tool for this project. Each card has its own illustration: 18 supply cards, four mortal leaders, and four gods for their event cards. The Acropolis illustration also appears in the gallery masthead. There are no remote runtime image dependencies.

The illustration prompts are stored in [art-prompts.json](art-prompts.json), keyed by asset basename. The art direction is painted classical mythology, weathered mineral pigments, antique gold, and readable silhouettes. The additional frame, resource, and back prompts are stored in [layer-prompts.json](layer-prompts.json). All were generated with the built-in image generation tool.

Generated PNGs are converted to 960 × 640 WebP at quality 85 with Sharp for the browser. This is delivery resizing and compression only; no content edits or compositing are applied. The original generated PNGs remain in the generating workstation's Codex image output directory; the repository includes every final WebP needed to render the site and does not depend on that directory. Prompts document the source process but do not guarantee identical regeneration.

Run `bun scripts/optimize-art.mjs /path/to/named-pngs` to repeat delivery processing. Input filenames match the IDs in the prompt manifest, such as `athena.png` and `thaleia.png`. The renderer uses a shallow landscape art window with a crop biased toward the top to keep faces visible.

## Layered card construction

Each face is composed bottom to top, with explicit CSS stacking:

1. The existing illustration, cropped to its art window.
2. Independent colored substrates for god and card type, below the frame.
3. A generated bronze-and-marble frame with genuine alpha holes for the illustration and both tags.
4. Generated resource component images.
5. Live numeric overlays, title, rules, tags, and inventory metadata.

`static/assets/frames/` contains separate deck, event, and leader frames. `static/assets/icons/` contains victory (laurel wreath), cards (card fan), buys (market basket), actions (lightning bolt), and coins (gold coin). Values such as `+1` are overlaid in HTML. Icons replace numeric resource phrases in their original order, including conditional effects; full wording remains available to screen readers and in the inspector's readable transcript. The gallery provides a legend.

`static/assets/backs/` contains three distinct backs: the indigo temple design shared by **all** shuffled cards, the turquoise celestial event design, and the oxblood lion-and-laurel leader design. Deck backs do not vary by affiliation, type, or serial number, so they do not reveal a held card's identity.

Frames and icons use lossless WebP to preserve alpha. Frames are delivered at 1200 pixels wide, icons at 256, and backs at 1000 pixels wide with quality 90 compression. Use `bun scripts/optimize-layers.mjs /path/to/asset-root` with PNG inputs in `frames/`, `icons/`, and `backs/` subdirectories to repeat processing. Original PNGs remain in the generating workstation's image output directory. The repository contains all final assets needed at runtime.

The browser tests sample actual frame alpha at all three windows, verify the layer order, check the resource values and text fit, and load all three back families. Frame registration lives in `CardFace.svelte`; changing a frame requires checking its window coordinates against the overlays at every supported size.

To prepare replacement artwork, generate a new illustration using the relevant prompt, inspect it, and optimize it to the same dimensions and filename. Keep rules text out of the image and verify the gallery after replacing it. All shipped original illustrations use the repository's GPL-3.0-only license.

## Worship and Temples

Five additional assets were generated with the built-in image generation tool. Exact prompts are in `docs/worship-prompts.json`. The transparent burning-altar resource icon is saved as `static/assets/icons/worship.webp` (256px lossless WebP). Four Temple illustrations are saved as `static/assets/cards/temple-of-{athena,poseidon,demeter,ares}.webp` (960px WebP). Originals remain in the generating workstation’s image output directory. The Cards resource now reuses `static/assets/backs/back-deck.webp`.

## Card operation icons

Trash (broken card), Discard (card stack and downward arrow), and Gain (hand receiving a card) were generated with the built-in image generation tool. Exact prompts are in `docs/operation-prompts.json`. Final transparent, lossless 256px assets are saved as `static/assets/icons/trash.webp`, `discard.webp`, and `gain.webp`. Conditional arrows use a live text glyph. The visual renderer retains the original effect as accessible text and the inspector’s full transcript.

## Discard and topdeck distinction

`static/assets/icons/discard-v2.webp` is a new built-in-generated face-up discard fan with a sideways arrow (transparent, lossless 256px WebP). `static/assets/icons/topdeck.webp` reuses the earlier face-down stack and downward arrow formerly used for Discard. Exact generation prompt and reuse provenance are in `docs/discard-topdeck-prompts.json`. The original Discard file is retained as generation history; the renderer selects `discard-v2.webp`.

## Sanctuary production layers

The accepted sanctuary painting supplied the reference for five built-in image-generation outputs: separate landscape and portrait environments, a transparent gold wordmark, and transparent lapis/charcoal control skins. Exact prompts are in [sanctuary-assets.json](ux/sanctuary-assets.json). Final runtime files are in `static/assets/ui/`; environments use WebP quality 92 and alpha assets use lossless WebP. Only delivery conversion was applied. These assets are covered by the repository's GPL-3.0-only license.

The environments contain no controls or cards. Svelte renders live link labels and the existing `CardFace`/`CardBack` components above the scene. The wordmark has a semantic heading. No concept screenshot is shipped as an interactive screen.
