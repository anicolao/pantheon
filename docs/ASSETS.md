# Card artwork

The 26 illustrations in `static/assets/cards/` were generated with the built-in image generation tool for this project. Each card has its own illustration: 18 supply cards, four mortal leaders, and four gods for their event cards. The Acropolis illustration also appears in the gallery masthead. There are no remote runtime image dependencies.

The complete prompts are stored in [art-prompts.json](art-prompts.json), keyed by asset basename. The art direction is painted classical mythology, weathered mineral pigments, antique gold, and readable silhouettes. Rules, frames, cost badges, names, and affiliations are implemented in HTML/CSS rather than baked into the illustrations.

Generated PNGs are converted to 960 × 640 WebP at quality 85 with Sharp for the browser. This is delivery resizing and compression only; no content edits or compositing are applied. The original generated PNGs remain in the generating workstation's Codex image output directory; the repository includes every final WebP needed to render the site and does not depend on that directory. Prompts document the source process but do not guarantee identical regeneration.

Run `bun scripts/optimize-art.mjs /path/to/named-pngs` to repeat delivery processing. Input filenames match the IDs in the prompt manifest, such as `athena.png` and `thaleia.png`. The renderer uses a shallow landscape art window with a crop biased toward the top to keep faces visible.

To prepare replacement artwork, generate a new illustration using the relevant prompt, inspect it, and optimize it to the same dimensions and filename. Keep rules text out of the image and verify the gallery after replacing it. All shipped original illustrations use the repository's GPL-3.0-only license.
