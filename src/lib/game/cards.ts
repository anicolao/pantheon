import type { CardDefinition } from './types';

// v0.1 card copy mirrors MVP_CARDSET.md. Artwork contains no rules text.
export const cards: CardDefinition[] = [
  {
    "id": "obol",
    "name": "Obol",
    "type": "Treasure",
    "god": "Hestia",
    "cost": 0,
    "effect": "+1 Coin.",
    "art": "obol",
    "artDescription": "A single worn bronze Greek coin bearing a simple hearth motif on a dark stone offering table, warm firelight, intimate still life."
  },
  {
    "id": "drachma",
    "name": "Drachma",
    "type": "Treasure",
    "god": "Hestia",
    "cost": 3,
    "effect": "+2 Coins.",
    "art": "drachma",
    "artDescription": "A small stack of silver ancient Greek coins beside a linen purse on a marble counting table, silver and warm candlelight, intimate still life."
  },
  {
    "id": "talent",
    "name": "Talent",
    "type": "Treasure",
    "god": "Hestia",
    "cost": 6,
    "effect": "+3 Coins.",
    "art": "talent",
    "artDescription": "Heavy gold ingots and a bronze balance scale in an ancient Greek treasury, luxurious amber light and dark shadow, intimate still life."
  },
  {
    "id": "hamlet",
    "name": "Hamlet",
    "type": "Territory",
    "god": "Hestia",
    "cost": 2,
    "effect": "1 VP.",
    "art": "hamlet",
    "artDescription": "A humble cluster of whitewashed Greek farmhouses among olive trees, earthen path and terraced hills at dawn, intimate pastoral landscape.",
    "vp": 1
  },
  {
    "id": "polis",
    "name": "Polis",
    "type": "Territory",
    "god": "Hestia",
    "cost": 5,
    "effect": "3 VP.",
    "art": "polis",
    "artDescription": "A prosperous ancient Greek city surrounding a columned agora, tiled roofs, fountain and market, sunlit marble, elevated landscape view.",
    "vp": 3
  },
  {
    "id": "acropolis",
    "name": "Acropolis",
    "type": "Territory",
    "god": "Hestia",
    "cost": 8,
    "effect": "6 VP.",
    "art": "acropolis",
    "artDescription": "A monumental Greek acropolis crowning a steep rocky hill above a sprawling city and the Aegean, soaring marble colonnades, dramatic sunbeams, epic landscape.",
    "vp": 6
  },
  {
    "id": "oracles-acolyte",
    "name": "Oracle’s Acolyte",
    "type": "Action",
    "god": "Athena",
    "cost": 2,
    "effect": "+1 Card; +1 Action.",
    "art": "oracles-acolyte",
    "artDescription": "A young Greek acolyte in ivory linen reading a scroll beside an owl in a candlelit marble oracle sanctuary, incense and indigo shadows."
  },
  {
    "id": "council-of-sages",
    "name": "Council of Sages",
    "type": "Action",
    "god": "Athena",
    "cost": 4,
    "effect": "+3 Cards.",
    "art": "council-of-sages",
    "artDescription": "Three elderly Greek philosophers in ivory and indigo robes gathered around scrolls at a stone council table beneath marble columns, considered debate."
  },
  {
    "id": "sacred-academy",
    "name": "Sacred Academy",
    "type": "Action",
    "god": "Athena",
    "cost": 5,
    "effect": "+2 Cards; +1 Action.",
    "art": "sacred-academy",
    "artDescription": "A luminous marble academy with students under graceful colonnades, olive trees and scrolls, serene Greek sanctuary of wisdom."
  },
  {
    "id": "harbor-pilot",
    "name": "Harbor Pilot",
    "type": "Action",
    "god": "Poseidon",
    "cost": 3,
    "effect": "+1 Card; +2 Actions.",
    "art": "harbor-pilot",
    "artDescription": "A weathered Greek harbor pilot holding a ship's steering oar on the deck of an ancient merchant vessel, turquoise sea and busy harbor behind."
  },
  {
    "id": "sea-trade",
    "name": "Sea Trade",
    "type": "Action",
    "god": "Poseidon",
    "cost": 4,
    "effect": "+2 Coins; +1 Buy.",
    "art": "sea-trade",
    "artDescription": "Two Greek merchants exchanging amphorae and a purse at a sunlit dock, wooden merchant ship and turquoise sea behind them, warm bronze details."
  },
  {
    "id": "merchant-fleet",
    "name": "Merchant Fleet",
    "type": "Action",
    "god": "Poseidon",
    "cost": 5,
    "effect": "+1 Card; +1 Action; +1 Coin; +1 Buy.",
    "art": "merchant-fleet",
    "artDescription": "A proud fleet of three ancient Greek merchant sailing ships with ivory sails crossing deep turquoise water toward a marble port, dramatic wide seascape."
  },
  {
    "id": "seed-keeper",
    "name": "Seed Keeper",
    "type": "Action",
    "god": "Demeter",
    "cost": 2,
    "effect": "You may trash up to 2 cards from your hand.",
    "art": "seed-keeper",
    "artDescription": "An older Greek woman carefully sorting seeds into clay bowls at a wooden table in an olive orchard, earthy greens and warm golden morning light."
  },
  {
    "id": "harvest-feast",
    "name": "Harvest Feast",
    "type": "Action",
    "god": "Demeter",
    "cost": 4,
    "effect": "+2 Cards; +1 Action; discard 1 card from your hand.",
    "art": "harvest-feast",
    "artDescription": "A bountiful communal Greek harvest table under grapevines, bread, figs, wheat and terracotta cups, joyful villagers in distance, golden evening light."
  },
  {
    "id": "sacred-grove",
    "name": "Sacred Grove",
    "type": "Action",
    "god": "Demeter",
    "cost": 5,
    "effect": "+1 Action; gain a card costing up to 4 Coins to your discard pile.",
    "art": "sacred-grove",
    "artDescription": "An ancient olive grove surrounding a small marble altar, shaft of golden sunlight through silver-green leaves, roots and wildflowers, tranquil sacred landscape."
  },
  {
    "id": "bronze-recruit",
    "name": "Bronze Recruit",
    "type": "Action",
    "god": "Ares",
    "cost": 3,
    "effect": "+2 Coins.",
    "art": "bronze-recruit",
    "artDescription": "A young adult Greek recruit in simple bronze cuirass holding a round shield and spear upright in a sunlit training yard, rust red cloak, determined expression."
  },
  {
    "id": "forge-of-heroes",
    "name": "Forge of Heroes",
    "type": "Action",
    "god": "Ares",
    "cost": 4,
    "effect": "You may trash 1 card from your hand. If you do, gain a card costing up to 2 Coins more than the trashed card to your discard pile.",
    "art": "forge-of-heroes",
    "artDescription": "A muscular Greek blacksmith hammering a glowing bronze blade at a stone forge, sparks, finished heroic shields hanging in shadows, dramatic ember light."
  },
  {
    "id": "victorious-procession",
    "name": "Victorious Procession",
    "type": "Action",
    "god": "Ares",
    "cost": 5,
    "effect": "+2 Coins; +1 Buy; reveal the top card of your deck. If it is a Territory, put it into your discard pile and gain +2 Coins. Otherwise, put it back on top of your deck.",
    "art": "victorious-procession",
    "artDescription": "A peaceful triumphant Greek procession through monumental city gates, laurel-wreathed soldiers bearing crimson standards, citizens welcoming them, no violence."
  },
  {
    "id": "thaleia",
    "name": "Thaleia, Keeper of the Owl",
    "type": "Leader",
    "god": "Athena",
    "cost": null,
    "effect": "After you resolve the first Athena Action you play this turn, +1 Action.",
    "art": "thaleia",
    "artDescription": "Thaleia, original mortal Greek woman leader, thoughtful dark-eyed face, dark braided hair, indigo mantle over ivory robes, small owl brooch, holding a rolled scroll in an academy, dignified half-length portrait. No crown or divine halo."
  },
  {
    "id": "nereon",
    "name": "Nereon, Heir of the Tide",
    "type": "Leader",
    "god": "Poseidon",
    "cost": null,
    "effect": "After you resolve the first Poseidon Action you play this turn, +1 Coin.",
    "art": "nereon",
    "artDescription": "Nereon, original mortal Greek man leader, weathered olive skin, short curly dark beard, teal cloak with bronze clasp, captain overlooking a harbor, dignified half-length portrait. No crown or divine halo."
  },
  {
    "id": "melia",
    "name": "Melia, Warden of the Fields",
    "type": "Leader",
    "god": "Demeter",
    "cost": null,
    "effect": "After you resolve the first Demeter Action you play this turn, +1 Card.",
    "art": "melia",
    "artDescription": "Melia, original mortal Greek woman leader, mature face, curly auburn hair, olive green mantle, woven wheat circlet and basket of seeds, golden fields behind, dignified half-length portrait. No divine halo."
  },
  {
    "id": "doreios",
    "name": "Doreios, Bearer of the Red Spear",
    "type": "Leader",
    "god": "Ares",
    "cost": null,
    "effect": "After you resolve the first Ares Action you play this turn, you may trash 1 card from your hand.",
    "art": "doreios",
    "artDescription": "Doreios, original mortal Greek man leader, close-cropped gray hair and beard, scarred dignified face, bronze cuirass and crimson cloak, holding a red-shafted spear, city walls behind, half-length portrait. No helmet or divine halo."
  },
  {
    "id": "counsel-of-olympus",
    "name": "Counsel of Olympus",
    "type": "Event",
    "god": "Athena",
    "cost": 3,
    "effect": "Gain an Action costing up to 4 Coins onto your deck.",
    "favored": "Gain an Action costing up to 5 Coins onto your deck.",
    "art": "athena",
    "artDescription": "Athena, serene armored Greek goddess of wisdom with an owl perched beside her, luminous marble academy above an olive grove behind her. Painterly museum-quality oil and tempera illustration, weathered mineral pigments, antique gold highlights, deep midnight indigo shadows, warm ivory marble, subtle canvas grain. Strong readable central silhouette. Landscape 3:2 composition, bust and environment, usable in a card art window. Entire canvas is illustration, no border, no frame, no lettering, no numerals, no watermark. Mythic classical Greece, no modern objects. This establishes the cohesive art direction for a family of card illustrations."
  },
  {
    "id": "tribute-of-the-tides",
    "name": "Tribute of the Tides",
    "type": "Event",
    "god": "Poseidon",
    "cost": 3,
    "effect": "Gain a Drachma to your discard pile.",
    "favored": "Gain a Drachma onto your deck; +1 Buy.",
    "art": "poseidon",
    "artDescription": "Poseidon, mighty bearded Greek sea god holding a trident above a storm-swept turquoise harbor, Greek merchant ships on the waves, sea-green and bronze palette."
  },
  {
    "id": "blessing-of-the-fields",
    "name": "Blessing of the Fields",
    "type": "Event",
    "god": "Demeter",
    "cost": 3,
    "effect": "You may trash up to 2 cards from your hand.",
    "favored": "You may trash up to 2 cards from your hand; gain a Hamlet to your discard pile; +1 Buy.",
    "art": "demeter",
    "artDescription": "Demeter, dignified Greek goddess of harvest carrying a sheaf of ripe wheat in a sunlit terraced orchard, golden fields and distant marble sanctuary, olive green and amber palette."
  },
  {
    "id": "trial-of-the-spear",
    "name": "Trial of the Spear",
    "type": "Event",
    "god": "Ares",
    "cost": 4,
    "effect": "You may trash 1 card from your hand. If you do, gain a card costing up to 2 Coins more than the trashed card to your discard pile.",
    "favored": "You may trash 1 card from your hand. If you do, gain a card costing up to 3 Coins more than the trashed card to your discard pile.",
    "art": "ares",
    "artDescription": "Ares, solemn Greek god of war in dark bronze armor and a crimson cloak, crested helmet, standing before an ancient forge and distant city walls, ember red and bronze palette."
  }
];
