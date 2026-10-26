// @bun
// scripts/rl/two_planner_worker.ts
import { readFileSync as readFileSync2 } from "fs";
import { createHash as createHash2 } from "crypto";
import { createInterface } from "readline";

// scripts/rl/four_environment.ts
import { readFileSync } from "fs";
import { createHash } from "crypto";

// src/lib/game/cards.ts
var cards = [
  {
    id: "obol",
    name: "Obol",
    type: "Treasure",
    god: "Hestia",
    cost: 0,
    effect: "+1 Coin.",
    art: "obol",
    artDescription: "A single worn bronze Greek coin bearing a simple hearth motif on a dark stone offering table, warm firelight, intimate still life.",
    number: 1,
    startingCopiesPerPlayer: 6,
    supply: {
      "2": 40,
      "3": 40,
      "4": 40
    }
  },
  {
    id: "drachma",
    name: "Drachma",
    type: "Treasure",
    god: "Hestia",
    cost: 3,
    effect: "+2 Coins.",
    art: "drachma",
    artDescription: "A small stack of silver ancient Greek coins beside a linen purse on a marble counting table, silver and warm candlelight, intimate still life.",
    number: 2,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 30,
      "3": 30,
      "4": 30
    }
  },
  {
    id: "talent",
    name: "Talent",
    type: "Treasure",
    god: "Hestia",
    cost: 6,
    effect: "+3 Coins.",
    art: "talent",
    artDescription: "Heavy gold ingots and a bronze balance scale in an ancient Greek treasury, luxurious amber light and dark shadow, intimate still life.",
    number: 3,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 20,
      "3": 20,
      "4": 20
    }
  },
  {
    id: "hamlet",
    name: "Hamlet",
    type: "Territory",
    god: "Hestia",
    cost: 2,
    effect: "1 VP.",
    art: "hamlet",
    artDescription: "A humble cluster of whitewashed Greek farmhouses among olive trees, earthen path and terraced hills at dawn, intimate pastoral landscape.",
    vp: 1,
    number: 4,
    startingCopiesPerPlayer: 3,
    supply: {
      "2": 6,
      "3": 9,
      "4": 12
    }
  },
  {
    id: "polis",
    name: "Polis",
    type: "Territory",
    god: "Hestia",
    cost: 5,
    effect: "3 VP.",
    art: "polis",
    artDescription: "A prosperous ancient Greek city surrounding a columned agora, tiled roofs, fountain and market, sunlit marble, elevated landscape view.",
    vp: 3,
    number: 5,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 6,
      "3": 9,
      "4": 12
    }
  },
  {
    id: "acropolis",
    name: "Acropolis",
    type: "Territory",
    god: "Hestia",
    cost: 8,
    effect: "6 VP.",
    art: "acropolis",
    artDescription: "A monumental Greek acropolis crowning a steep rocky hill above a sprawling city and the Aegean, soaring marble colonnades, dramatic sunbeams, epic landscape.",
    vp: 6,
    number: 6,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 6,
      "3": 9,
      "4": 12
    }
  },
  {
    id: "oracles-acolyte",
    name: "Oracle\u2019s Acolyte",
    type: "Action",
    god: "Athena",
    cost: 2,
    effect: "+1 Card; +1 Action.",
    art: "oracles-acolyte",
    artDescription: "A young Greek acolyte in ivory linen reading a scroll beside an owl in a candlelit marble oracle sanctuary, incense and indigo shadows.",
    number: 7,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "council-of-sages",
    name: "Council of Sages",
    type: "Action",
    god: "Athena",
    cost: 4,
    effect: "+3 Cards.",
    art: "council-of-sages",
    artDescription: "Three elderly Greek philosophers in ivory and indigo robes gathered around scrolls at a stone council table beneath marble columns, considered debate.",
    number: 8,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "sacred-academy",
    name: "Sacred Academy",
    type: "Action",
    god: "Athena",
    cost: 5,
    effect: "+2 Cards; +1 Action.",
    art: "sacred-academy",
    artDescription: "A luminous marble academy with students under graceful colonnades, olive trees and scrolls, serene Greek sanctuary of wisdom.",
    number: 9,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "harbor-pilot",
    name: "Harbor Pilot",
    type: "Action",
    god: "Poseidon",
    cost: 3,
    effect: "+1 Card; +2 Actions.",
    art: "harbor-pilot",
    artDescription: "A weathered Greek harbor pilot holding a ship's steering oar on the deck of an ancient merchant vessel, turquoise sea and busy harbor behind.",
    number: 10,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "sea-trade",
    name: "Sea Trade",
    type: "Action",
    god: "Poseidon",
    cost: 4,
    effect: "+2 Coins; +1 Buy.",
    art: "sea-trade",
    artDescription: "Two Greek merchants exchanging amphorae and a purse at a sunlit dock, wooden merchant ship and turquoise sea behind them, warm bronze details.",
    number: 11,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "merchant-fleet",
    name: "Merchant Fleet",
    type: "Action",
    god: "Poseidon",
    cost: 5,
    effect: "+1 Card; +1 Action; +1 Coin; +1 Buy.",
    art: "merchant-fleet",
    artDescription: "A proud fleet of three ancient Greek merchant sailing ships with ivory sails crossing deep turquoise water toward a marble port, dramatic wide seascape.",
    number: 12,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "seed-keeper",
    name: "Seed Keeper",
    type: "Action",
    god: "Demeter",
    cost: 2,
    effect: "You may trash up to 2 cards from your hand.",
    art: "seed-keeper",
    artDescription: "An older Greek woman carefully sorting seeds into clay bowls at a wooden table in an olive orchard, earthy greens and warm golden morning light.",
    number: 13,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "harvest-feast",
    name: "Harvest Feast",
    type: "Action",
    god: "Demeter",
    cost: 4,
    effect: "+2 Cards; +1 Action; discard 1 card from your hand.",
    art: "harvest-feast",
    artDescription: "A bountiful communal Greek harvest table under grapevines, bread, figs, wheat and terracotta cups, joyful villagers in distance, golden evening light.",
    number: 14,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "sacred-grove",
    name: "Sacred Grove",
    type: "Action",
    god: "Demeter",
    cost: 5,
    effect: "+1 Action; gain a card costing up to 4 Coins to your discard pile.",
    art: "sacred-grove",
    artDescription: "An ancient olive grove surrounding a small marble altar, shaft of golden sunlight through silver-green leaves, roots and wildflowers, tranquil sacred landscape.",
    number: 15,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "bronze-recruit",
    name: "Bronze Recruit",
    type: "Action",
    god: "Ares",
    cost: 3,
    effect: "+2 Coins.",
    art: "bronze-recruit",
    artDescription: "A young adult Greek recruit in simple bronze cuirass holding a round shield and spear upright in a sunlit training yard, rust red cloak, determined expression.",
    number: 16,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "forge-of-heroes",
    name: "Forge of Heroes",
    type: "Action",
    god: "Ares",
    cost: 4,
    effect: "You may trash 1 card from your hand. If you do, gain a card costing up to 2 Coins more than the trashed card to your discard pile.",
    art: "forge-of-heroes",
    artDescription: "A muscular Greek blacksmith hammering a glowing bronze blade at a stone forge, sparks, finished heroic shields hanging in shadows, dramatic ember light.",
    number: 17,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "victorious-procession",
    name: "Victorious Procession",
    type: "Action",
    god: "Ares",
    cost: 5,
    effect: "+2 Coins; +1 Buy; reveal the top card of your deck. If it is a Territory, put it into your discard pile and gain +2 Coins. Otherwise, put it back on top of your deck.",
    art: "victorious-procession",
    artDescription: "A peaceful triumphant Greek procession through monumental city gates, laurel-wreathed soldiers bearing crimson standards, citizens welcoming them, no violence.",
    number: 18,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "thaleia",
    name: "Thaleia, Keeper of the Owl",
    type: "Leader",
    god: "Athena",
    cost: null,
    effect: "After you resolve the first Athena Action you play this turn, +1 Action.",
    art: "thaleia",
    artDescription: "Thaleia, original mortal Greek woman leader, thoughtful dark-eyed face, dark braided hair, indigo mantle over ivory robes, small owl brooch, holding a rolled scroll in an academy, dignified half-length portrait. No crown or divine halo.",
    number: 19,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "nereon",
    name: "Nereon, Heir of the Tide",
    type: "Leader",
    god: "Poseidon",
    cost: null,
    effect: "After you resolve the first Poseidon Action you play this turn, +1 Coin.",
    art: "nereon",
    artDescription: "Nereon, original mortal Greek man leader, weathered olive skin, short curly dark beard, teal cloak with bronze clasp, captain overlooking a harbor, dignified half-length portrait. No crown or divine halo.",
    number: 20,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "melia",
    name: "Melia, Warden of the Fields",
    type: "Leader",
    god: "Demeter",
    cost: null,
    effect: "After you resolve the first Demeter Action you play this turn, +1 Card.",
    art: "melia",
    artDescription: "Melia, original mortal Greek woman leader, mature face, curly auburn hair, olive green mantle, woven wheat circlet and basket of seeds, golden fields behind, dignified half-length portrait. No divine halo.",
    number: 21,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "doreios",
    name: "Doreios, Bearer of the Red Spear",
    type: "Leader",
    god: "Ares",
    cost: null,
    effect: "After you resolve the first Ares Action you play this turn, you may trash 1 card from your hand.",
    art: "doreios",
    artDescription: "Doreios, original mortal Greek man leader, close-cropped gray hair and beard, scarred dignified face, bronze cuirass and crimson cloak, holding a red-shafted spear, city walls behind, half-length portrait. No helmet or divine halo.",
    number: 22,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "counsel-of-olympus",
    name: "Counsel of Olympus",
    type: "Event",
    god: "Athena",
    cost: 3,
    effect: "Gain an Action costing up to 3 Coins onto your deck.",
    favored: "Gain an Action costing up to 5 Coins onto your deck.",
    art: "athena",
    artDescription: "Athena, serene armored Greek goddess of wisdom with an owl perched beside her, luminous marble academy above an olive grove behind her. Painterly museum-quality oil and tempera illustration, weathered mineral pigments, antique gold highlights, deep midnight indigo shadows, warm ivory marble, subtle canvas grain. Strong readable central silhouette. Landscape 3:2 composition, bust and environment, usable in a card art window. Entire canvas is illustration, no border, no frame, no lettering, no numerals, no watermark. Mythic classical Greece, no modern objects. This establishes the cohesive art direction for a family of card illustrations.",
    number: 23,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "tribute-of-the-tides",
    name: "Tribute of the Tides",
    type: "Event",
    god: "Poseidon",
    cost: 3,
    effect: "Gain a Drachma to your discard pile.",
    favored: "Gain a Drachma onto your deck; +1 Buy.",
    art: "poseidon",
    artDescription: "Poseidon, mighty bearded Greek sea god holding a trident above a storm-swept turquoise harbor, Greek merchant ships on the waves, sea-green and bronze palette.",
    number: 24,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "blessing-of-the-fields",
    name: "Blessing of the Fields",
    type: "Event",
    god: "Demeter",
    cost: 3,
    effect: "You may trash up to 2 cards from your hand.",
    favored: "You may trash up to 2 cards from your hand; you may gain a card costing up to their combined cost to your discard pile; +1 Buy.",
    art: "demeter",
    artDescription: "Demeter, dignified Greek goddess of harvest carrying a sheaf of ripe wheat in a sunlit terraced orchard, golden fields and distant marble sanctuary, olive green and amber palette.",
    number: 25,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "trial-of-the-spear",
    name: "Trial of the Spear",
    type: "Event",
    god: "Ares",
    cost: 4,
    effect: "You may trash 1 card from your hand. If you do, gain a card costing up to 1 Coin more than the trashed card to your discard pile.",
    favored: "You may trash 1 card from your hand. If you do, gain a card costing up to 3 Coins more than the trashed card to your discard pile.",
    art: "ares",
    artDescription: "Ares, solemn Greek god of war in dark bronze armor and a crimson cloak, crested helmet, standing before an ancient forge and distant city walls, ember red and bronze palette.",
    number: 26,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "temple-of-athena",
    name: "Temple of Athena",
    type: "Action",
    god: "Athena",
    cost: 0,
    effect: "+1 Worship; +1 Action.",
    art: "temple-of-athena",
    artDescription: "A sacred Greek temple dedicated to Athena.",
    number: 27,
    startingCopiesPerPlayer: 0,
    uniqueStartingCard: true,
    supply: {
      "2": 0,
      "3": 0,
      "4": 0
    }
  },
  {
    id: "temple-of-poseidon",
    name: "Temple of Poseidon",
    type: "Action",
    god: "Poseidon",
    cost: 0,
    effect: "+1 Worship; +1 Action.",
    art: "temple-of-poseidon",
    artDescription: "A sacred Greek temple dedicated to Poseidon.",
    number: 28,
    startingCopiesPerPlayer: 0,
    uniqueStartingCard: true,
    supply: {
      "2": 0,
      "3": 0,
      "4": 0
    }
  },
  {
    id: "temple-of-demeter",
    name: "Temple of Demeter",
    type: "Action",
    god: "Demeter",
    cost: 0,
    effect: "+1 Worship; +1 Action.",
    art: "temple-of-demeter",
    artDescription: "A sacred Greek temple dedicated to Demeter.",
    number: 29,
    startingCopiesPerPlayer: 0,
    uniqueStartingCard: true,
    supply: {
      "2": 0,
      "3": 0,
      "4": 0
    }
  },
  {
    id: "temple-of-ares",
    name: "Temple of Ares",
    type: "Action",
    god: "Ares",
    cost: 0,
    effect: "+1 Worship; +1 Action.",
    art: "temple-of-ares",
    artDescription: "A sacred Greek temple dedicated to Ares.",
    number: 30,
    startingCopiesPerPlayer: 0,
    uniqueStartingCard: true,
    supply: {
      "2": 0,
      "3": 0,
      "4": 0
    }
  }
];

// src/lib/game/random.ts
function createPrng(seed) {
  let value = 2166136261;
  for (const character of seed) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 16777619);
  }
  let state = value >>> 0 || 2654435769;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
function shuffle(values, seed) {
  const result = [...values], random = createPrng(seed);
  for (let i = result.length - 1;i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// src/lib/game/actions.ts
function initialTurn() {
  return { equalTurns: true, number: 1, index: 0, phase: "actions", leaderUsed: false, queue: [], choice: null, shuffles: {}, turns: {} };
}
var definition = (id) => {
  const card = cards.find((card2) => card2.id === id);
  if (!card)
    throw new Error("Unknown card.");
  return card;
};
var activePlayer = (game) => game.turnOrder[game.turn.index];
function eligibleGains(game, limit, actionOnly = false) {
  return cards.filter((card) => (game.supply[card.id] ?? 0) > 0 && card.cost !== null && card.cost <= limit && (!actionOnly || card.type === "Action")).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
}
function devotionCards(game, uid, eventId) {
  const god = definition(eventId).god;
  return (game.decks[uid]?.play ?? []).filter((card) => definition(card.cardId).type === "Action" && definition(card.cardId).god === god);
}
function worshipReason(game, uid, eventId) {
  if (game.phase !== "playing" || game.turn.phase === "finished")
    return "Worship is available during play.";
  if (activePlayer(game) !== uid)
    return "Wait for your turn.";
  if (game.turn.choice || game.turn.queue.length)
    return "Finish your current choice.";
  if (!game.sharedEvents.includes(eventId))
    return "This god is not at this table.";
  if (game.resources.worship < 1)
    return "No Worship remaining.";
  const cost = definition(eventId).cost;
  if (game.resources.coins < cost)
    return `You need ${cost - game.resources.coins} more ${cost - game.resources.coins === 1 ? "Coin" : "Coins"}.`;
  return "";
}
function worshipEffects(id, favored) {
  const buy = { kind: "resource", source: id, resource: "buys", amount: 1 };
  switch (id) {
    case "counsel-of-olympus":
      return [{ kind: "gain", source: id, limit: favored ? 5 : 3, actionOnly: true, topdeck: true }];
    case "tribute-of-the-tides":
      return [{ kind: "gain", source: id, limit: 3, cardId: "drachma", topdeck: favored }, ...favored ? [buy] : []];
    case "blessing-of-the-fields":
      return [{ kind: "trash", source: id, amount: 2, ...favored ? { offering: "sum" } : {} }, ...favored ? [buy] : []];
    case "trial-of-the-spear":
      return [{ kind: "trash", source: id, amount: 1, offering: favored ? 3 : 1 }];
    default:
      throw new Error("Choose a shared god event.");
  }
}
function canPlayAction(game, uid, instanceId) {
  return game.phase === "playing" && activePlayer(game) === uid && game.turn.phase === "actions" && !game.turn.choice && game.resources.actions > 0 && game.decks[uid]?.hand.some((card) => card.id === instanceId && definition(card.cardId).type === "Action");
}
function purchaseReason(game, uid, id) {
  if (game.turn.phase === "finished")
    return "The game is over.";
  if (activePlayer(game) !== uid)
    return "Wait for your turn.";
  if (game.turn.choice)
    return "Finish your current choice.";
  if (game.phase !== "playing" || game.turn.queue.length)
    return "Finish your current choice.";
  if (!game.supply[id])
    return "This pile is empty.";
  if (game.resources.buys < 1)
    return "No Buys remaining.";
  const cost = definition(id).cost;
  if (cost === null || game.resources.coins < cost)
    return `You need ${cost - game.resources.coins} more Coins.`;
  return "";
}
function standings(game) {
  const rows = game.players.map((player) => {
    const owned = Object.values(game.decks[player.uid]).flat();
    return {
      ...player,
      score: owned.reduce((sum, card) => sum + (definition(card.cardId).vp ?? 0), 0),
      turns: game.turn.turns[player.uid] ?? 0,
      territories: ["hamlet", "polis", "acropolis"].map((id) => ({ id, count: owned.filter((card) => card.cardId === id).length }))
    };
  }).sort((a, b) => b.score - a.score || a.turns - b.turns);
  return rows.map((row) => ({ ...row, winner: row.score === rows[0].score && row.turns === rows[0].turns }));
}
function resource(source, key, amount) {
  return { kind: "resource", source, resource: key, amount };
}
function actionEffects(id, variant = "standard") {
  if (variant === "base-game" && definition(id).uniqueStartingCard)
    return [];
  const draw = (amount) => ({ kind: "draw", source: id, amount });
  const add = (key, amount) => resource(id, key, amount);
  if (definition(id).uniqueStartingCard)
    return [add("worship", 1), add("actions", 1)];
  switch (id) {
    case "oracles-acolyte":
      return [draw(1), add("actions", 1)];
    case "council-of-sages":
      return [draw(3)];
    case "sacred-academy":
      return [draw(2), add("actions", 1)];
    case "harbor-pilot":
      return [draw(1), add("actions", 2)];
    case "sea-trade":
      return [add("coins", 2), add("buys", 1)];
    case "merchant-fleet":
      return [draw(1), add("actions", 1), add("coins", 1), add("buys", 1)];
    case "seed-keeper":
      return [{ kind: "trash", source: id, amount: 2 }];
    case "harvest-feast":
      return [draw(2), add("actions", 1), { kind: "discard", source: id, amount: 1 }];
    case "sacred-grove":
      return [add("actions", 1), { kind: "gain", source: id, limit: 4 }];
    case "bronze-recruit":
      return [add("coins", 2)];
    case "forge-of-heroes":
      return [{ kind: "trash", source: id, amount: 1, forge: true }];
    case "victorious-procession":
      return [add("coins", 2), add("buys", 1), { kind: "reveal", source: id }];
    default:
      throw new Error("This card is not an Action.");
  }
}
function leaderEffects(id, variant = "standard") {
  if (variant === "base-game")
    return [];
  if (id === "thaleia")
    return [
      resource(id, "actions", variant === "thaleia-actions" ? 2 : 1),
      ...variant === "thaleia-buy" ? [resource(id, "buys", 1)] : [],
      ...variant === "thaleia-draw" || variant === "leader-buffs" ? [{ kind: "draw", source: id, amount: 1 }] : []
    ];
  if (id === "nereon")
    return [resource(id, "coins", variant === "leader-buffs" ? 2 : 1)];
  if (id === "melia")
    return [{ kind: "draw", source: id, amount: variant === "leader-buffs" ? 2 : 1 }];
  if (id === "doreios")
    return [{ kind: "trash", source: id, amount: 1 }];
  return [];
}
function applyPlayCommand(game, uid, command, sequence, variant = "standard") {
  if (command.type === "action/undone")
    throw new Error("Undo requires the committed command history.");
  if (game.phase !== "playing" || activePlayer(game) !== uid || game.turn.phase === "finished")
    throw new Error("Wait for your turn.");
  if (command.type === "market/browsed") {
    if (game.turn.choice || !Object.hasOwn(game.supply, command.cardId))
      throw new Error("Choose a market pile outside a pending choice.");
    game.turn.marketFocus = { cardId: command.cardId, sequence };
    return `${game.players.find((player) => player.uid === uid).name} browsed ${definition(command.cardId).name}.`;
  }
  if (command.type === "worship/focused") {
    if (game.turn.choice || command.cardId && !game.sharedEvents.includes(command.cardId))
      throw new Error("Choose a shared worship card outside a pending choice.");
    if (command.cardId)
      game.turn.worshipFocus = command.cardId;
    else
      delete game.turn.worshipFocus;
    return `${game.players.find((player) => player.uid === uid).name} ${command.cardId ? "focused on " + definition(command.cardId).god : "returned the worship card"}.`;
  }
  if (command.type === "choice/staged") {
    const choice = game.turn.choice;
    if (!choice || choice.id !== command.choiceId || choice.kind === "gain" || !Number.isInteger(command.count) || command.count < 0 || command.count > choice.max)
      throw new Error("Choose a valid count for the current hand choice.");
    choice.selectedCount = command.count;
    return `${game.players.find((player) => player.uid === uid).name} selected ${command.count} cards to ${choice.kind}.`;
  }
  if (command.type === "choice/browsed") {
    const choice = game.turn.choice;
    if (!choice || choice.id !== command.choiceId || choice.kind !== "gain" || !eligibleGains(game, choice.limit, choice.actionOnly).some((card) => card.id === command.cardId))
      throw new Error("Choose an available pile for the current gain.");
    choice.browsedCardId = command.cardId;
    return `${game.players.find((player) => player.uid === uid).name} browsed ${definition(command.cardId).name}.`;
  }
  delete game.turn.marketFocus;
  const zones = game.decks[uid], name = game.players.find((player) => player.uid === uid).name;
  const messages = [];
  const move = (kind, source, card, amount) => game.movements.push({ sequence, index: game.movements.length, uid, kind, source, ...card ? { card: { ...card } } : {}, ...amount !== undefined ? { amount } : {} });
  function takeTop(source) {
    if (!zones.deck.length && zones.discard.length) {
      const seat = game.players.findIndex((player) => player.uid === uid), count = game.turn.shuffles[uid] ?? 0;
      zones.deck = shuffle(zones.discard, `${game.seed}:reshuffle:${seat}:${count}`);
      zones.discard = [];
      game.turn.shuffles[uid] = count + 1;
      move("shuffle", source, undefined, zones.deck.length);
    }
    return zones.deck.shift();
  }
  function draw(amount, source) {
    let drawn = 0;
    for (let i = 0;i < amount; i++) {
      const card = takeTop(source);
      if (!card)
        break;
      zones.hand.push(card);
      move("draw", source, card);
      drawn++;
    }
    messages.push(`drew ${drawn} ${drawn === 1 ? "card" : "cards"}`);
  }
  function gain(id, source, topdeck = false) {
    const card = definition(id), remaining = game.supply[id];
    if (!remaining)
      throw new Error("That supply pile is empty.");
    const copy = card.supply[game.playerCount] - remaining + 1;
    const instance = { id: `supply-${id}-${copy}`, cardId: id, copy };
    game.supply[id]--;
    if (topdeck)
      zones.deck.unshift(instance);
    else
      zones.discard.push(instance);
    move(topdeck ? "topdeck" : "gain", source, instance);
    messages.push(`gained ${card.name} ${topdeck ? "onto the deck" : "to discard"}`);
  }
  function resolve() {
    while (game.turn.queue.length && !game.turn.choice) {
      const effect = game.turn.queue.shift();
      if (definition(effect.source).type === "Leader") {
        move("leader", effect.source);
        messages.push(`${definition(effect.source).name.split(",")[0]}\u2019s blessing`);
      }
      if (effect.kind === "resource") {
        game.resources[effect.resource] += effect.amount;
        messages.push(`+${effect.amount} ${effect.resource === "worship" ? "Worship" : effect.resource}`);
      } else if (effect.kind === "draw")
        draw(effect.amount, effect.source);
      else if (effect.kind === "reveal") {
        const card = takeTop(effect.source);
        if (!card) {
          messages.push("no card to reveal");
          continue;
        }
        move("reveal", effect.source, card);
        if (definition(card.cardId).type === "Territory") {
          zones.discard.push(card);
          game.resources.coins += 2;
          move("discard", effect.source, card);
          messages.push(`revealed ${definition(card.cardId).name} to discard, +2 coins`);
        } else {
          zones.deck.unshift(card);
          move("topdeck", effect.source, card);
          messages.push(`revealed ${definition(card.cardId).name} and returned it to the deck`);
        }
      } else if (effect.kind === "gain") {
        if (effect.cardId) {
          if (game.supply[effect.cardId])
            gain(effect.cardId, effect.source, effect.topdeck);
          else
            messages.push(`${definition(effect.cardId).name} pile is empty`);
          continue;
        }
        if (!eligibleGains(game, effect.limit, effect.actionOnly).length) {
          messages.push("no eligible card to gain");
          continue;
        }
        game.turn.choice = { id: `${sequence}:${game.turn.queue.length}:gain`, kind: "gain", source: effect.source, min: effect.optional ? 0 : 1, max: 1, limit: effect.limit, ...effect.actionOnly ? { actionOnly: true } : {}, ...effect.topdeck ? { topdeck: true } : {} };
      } else {
        const max = Math.min(effect.amount, zones.hand.length);
        if (!max) {
          messages.push(`no cards to ${effect.kind}`);
          if (effect.offering === "sum")
            game.turn.queue.unshift({ kind: "gain", source: effect.source, limit: 0, optional: true });
          continue;
        }
        game.turn.choice = { id: `${sequence}:${game.turn.queue.length}:${effect.kind}`, kind: effect.kind, source: effect.source, min: effect.kind === "discard" ? max : 0, max, ...effect.forge ? { forge: true } : {}, ...effect.offering ? { offering: effect.offering } : {} };
      }
    }
  }
  if (command.type !== "choice/resolved" && game.turn.choice)
    throw new Error("Finish the current choice first.");
  switch (command.type) {
    case "action/played": {
      if (!canPlayAction(game, uid, command.instanceId))
        throw new Error("Choose an Action in your hand while you have an Action remaining.");
      const index = zones.hand.findIndex((card2) => card2.id === command.instanceId), card = zones.hand.splice(index, 1)[0];
      zones.play.push(card);
      game.resources.actions--;
      move("play", card.cardId, card);
      messages.push(`played ${definition(card.cardId).name}`);
      game.turn.queue = actionEffects(card.cardId, variant);
      const leader = definition(game.leaders[uid]);
      if (variant !== "base-game" && !game.turn.leaderUsed && leader.god === definition(card.cardId).god) {
        game.turn.leaderUsed = true;
        game.turn.queue.push(...leaderEffects(leader.id, variant));
      }
      resolve();
      break;
    }
    case "god/worshipped": {
      if (variant === "base-game")
        throw new Error("Worship is disabled in the base-game trial.");
      const reason = worshipReason(game, uid, command.cardId);
      if (reason)
        throw new Error(reason);
      const event = definition(command.cardId), devotion = devotionCards(game, uid, event.id).length;
      game.resources.worship--;
      game.resources.coins -= event.cost;
      move("worship", event.id, undefined, devotion);
      messages.push(`worshipped ${event.god} \xB7 ${devotion >= 2 ? "Favored" : "Standard"}`);
      game.turn.queue = worshipEffects(event.id, devotion >= 2);
      resolve();
      break;
    }
    case "choice/resolved": {
      const choice = game.turn.choice;
      if (!choice || command.choiceId !== choice.id || !Array.isArray(command.targets) || command.targets.some((id) => typeof id !== "string") || new Set(command.targets).size !== command.targets.length || command.targets.length < choice.min || command.targets.length > choice.max)
        throw new Error("Choose the required cards for this effect.");
      if (choice.kind === "gain") {
        if (command.targets.length && !eligibleGains(game, choice.limit, choice.actionOnly).some((card) => card.id === command.targets[0]))
          throw new Error("Choose an available card within the cost limit.");
        if (command.targets.length)
          gain(command.targets[0], choice.source, choice.topdeck);
        else
          messages.push("chose not to gain");
      } else {
        if (command.targets.some((id) => !zones.hand.some((card) => card.id === id)))
          throw new Error("Choose cards from your hand.");
        const chosen = command.targets.map((id) => zones.hand.find((card) => card.id === id));
        zones.hand = zones.hand.filter((card) => !command.targets.includes(card.id));
        for (const card of chosen) {
          (choice.kind === "trash" ? game.trash : zones.discard).push(card);
          move(choice.kind, choice.source, card);
        }
        messages.push(chosen.length ? `${choice.kind === "trash" ? "trashed" : "discarded"} ${chosen.map((card) => definition(card.cardId).name).join(", ")}` : "trashed no cards");
        if (choice.offering === "sum")
          game.turn.queue.unshift({ kind: "gain", source: choice.source, limit: chosen.reduce((sum, card) => sum + definition(card.cardId).cost, 0), optional: true });
        else if (choice.offering && chosen.length)
          game.turn.queue.unshift({ kind: "gain", source: choice.source, limit: definition(chosen[0].cardId).cost + choice.offering });
        if (choice.forge && chosen.length)
          game.turn.queue.unshift({ kind: "gain", source: choice.source, limit: definition(chosen[0].cardId).cost + 2 });
      }
      game.turn.choice = null;
      resolve();
      break;
    }
    case "phase/advanced": {
      if (command.automatic !== undefined && typeof command.automatic !== "boolean")
        throw new Error("Invalid automatic transition.");
      if (command.automatic && (game.turn.phase !== "actions" || zones.hand.some((card) => canPlayAction(game, uid, card.id))))
        throw new Error("Automatic Treasure mode requires no playable Actions.");
      if (game.turn.phase === "buys")
        throw new Error("You are already in the Buy phase.");
      game.turn.phase = game.turn.phase === "actions" ? "treasures" : "buys";
      messages.push(`entered the ${game.turn.phase === "treasures" ? "Treasure" : "Buy"} phase`);
      break;
    }
    case "treasures/played": {
      const treasures = zones.hand.filter((card) => definition(card.cardId).type === "Treasure");
      if (!["actions", "treasures"].includes(game.turn.phase) || !treasures.length)
        throw new Error("There are no Treasures to play.");
      game.turn.phase = "treasures";
      for (const card of treasures) {
        zones.hand.splice(zones.hand.findIndex((item) => item.id === card.id), 1);
        zones.play.push(card);
        const value = { obol: 1, drachma: 2, talent: 3 }[card.cardId];
        game.resources.coins += value;
        move("play", card.cardId, card);
        messages.push(`played ${definition(card.cardId).name}, +${value} coins`);
      }
      break;
    }
    case "treasure/played": {
      const index = zones.hand.findIndex((card2) => card2.id === command.instanceId);
      if (!["actions", "treasures"].includes(game.turn.phase) || index < 0 || definition(zones.hand[index].cardId).type !== "Treasure")
        throw new Error("Play a Treasure from your hand in the Treasure phase.");
      game.turn.phase = "treasures";
      const card = zones.hand.splice(index, 1)[0];
      zones.play.push(card);
      const value = { obol: 1, drachma: 2, talent: 3 }[card.cardId];
      game.resources.coins += value;
      move("play", card.cardId, card);
      messages.push(`played ${definition(card.cardId).name}, +${value} coins`);
      break;
    }
    case "card/bought": {
      const card = definition(command.cardId);
      if (card.cost === null || purchaseReason(game, uid, card.id))
        throw new Error("That purchase is not available.");
      game.turn.phase = "buys";
      game.resources.buys--;
      game.resources.coins -= card.cost;
      gain(card.id, card.id);
      break;
    }
    case "turn/ended": {
      delete game.turn.worshipFocus;
      if (!["treasures", "buys"].includes(game.turn.phase))
        throw new Error("Finish the Action phase first.");
      zones.discard.push(...zones.hand, ...zones.play);
      zones.hand = [];
      zones.play = [];
      draw(5, game.leaders[uid]);
      game.turn.turns[uid] = (game.turn.turns[uid] ?? 0) + 1;
      game.resources = { actions: 1, coins: 0, buys: 1, worship: variant === "base-game" ? 0 : 1 };
      game.turn.leaderUsed = false;
      const triggered = game.supply.acropolis === 0 || Object.values(game.supply).filter((count) => count === 0).length >= 3;
      if (game.turn.equalTurns && triggered && !game.turn.finalRound) {
        game.turn.finalRound = true;
        game.turn.endTriggeredBy = uid;
      }
      if ((triggered || game.turn.finalRound) && (!game.turn.equalTurns || game.turn.index === game.turnOrder.length - 1)) {
        game.turn.phase = "finished";
        game.resources = { actions: 0, coins: 0, buys: 0, worship: 0 };
      } else {
        game.turn.index = (game.turn.index + 1) % game.turnOrder.length;
        game.turn.number++;
        game.turn.phase = "actions";
      }
      messages.push("ended the turn");
      break;
    }
    default:
      throw new Error("Unknown play command.");
  }
  return `${name} ${messages.join("; ")}.`;
}

// src/lib/game/undo.ts
var position = (game) => structuredClone({ turn: game.turn, decks: game.decks, supply: game.supply, trash: game.trash, resources: game.resources });
function canUndo(game, uid) {
  return game.phase === "playing" && game.turn.phase !== "finished" && activePlayer(game) === uid && game.undo?.actorUid === uid;
}

class UndoHistory {
  checkpoints = [];
  apply(game, uid, command, sequence) {
    if (["choice/browsed", "market/browsed", "worship/focused", "choice/staged"].includes(command.type))
      return applyPlayCommand(game, uid, command, sequence);
    if (command.type === "action/undone") {
      const checkpoint = this.checkpoints.at(-1);
      if (!canUndo(game, uid) || !checkpoint || checkpoint.target.sequence !== command.targetSequence)
        throw new Error("That action can no longer be undone.");
      Object.assign(game, structuredClone(checkpoint.before));
      delete game.turn.worshipFocus;
      delete game.turn.marketFocus;
      if (game.turn.choice)
        delete game.turn.choice.selectedCount;
      this.checkpoints.pop();
      game.undo = this.checkpoints.at(-1)?.target ?? null;
      return `${game.players.find((player) => player.uid === uid).name} undid ${checkpoint.target.label}.`;
    }
    const before = position(game), movementIndex = game.movements.length;
    const message = applyPlayCommand(game, uid, command, sequence);
    const disclosed = game.movements.slice(movementIndex).some((move) => ["draw", "reveal", "shuffle"].includes(move.kind));
    if (disclosed || command.type === "turn/ended")
      this.checkpoints = [];
    else if (!(command.type === "phase/advanced" && command.automatic)) {
      this.checkpoints.push({ target: { sequence, actorUid: uid, label: undoLabel(before, uid, command) }, before });
    }
    game.undo = this.checkpoints.at(-1)?.target ?? null;
    return message;
  }
}
function undoLabel(before, uid, command) {
  switch (command.type) {
    case "action/played":
    case "treasure/played":
      return `playing ${definition(before.decks[uid].hand.find((card) => card.id === command.instanceId).cardId).name}`;
    case "treasures/played":
      return "playing all Treasures";
    case "card/bought":
      return `buying ${definition(command.cardId).name}`;
    case "god/worshipped":
      return `worshipping ${definition(command.cardId).god}`;
    case "choice/resolved":
      return `the ${definition(before.turn.choice.source).name} choice`;
    case "market/browsed":
    case "worship/focused":
    case "choice/staged":
    case "choice/browsed":
      return "browsing the market";
    case "phase/advanced":
      return "advancing the phase";
    case "turn/ended":
      return "ending the turn";
  }
}

// src/lib/game/bot-kind.ts
var botKinds = ["bot", "mm", "money", "engine", "classic-engine"];
var isBotKind = (value) => botKinds.includes(value);

// src/lib/game/public-table.ts
function publicCommandContext(game, uid) {
  const zones = game.decks[uid];
  if (!zones)
    throw new Error("Unknown player.");
  return {
    uid,
    movementIndex: game.movements.length,
    resources: { ...game.resources },
    handCount: zones.hand.length,
    playCount: zones.play.length
  };
}
function describePublicCommand(before, game, event) {
  const actor = game.players.find((player) => player.uid === event.actorUid);
  if (!actor || before.uid !== actor.uid)
    throw new Error("Command actor does not match.");
  const owned = (zone) => ({ zone, uid: actor.uid });
  const steps = [];
  if (event.type === "turn/ended") {
    for (const [zone, count] of [["hand", before.handCount], ["play", before.playCount]]) {
      if (count)
        steps.push({ id: `${event.sequence}:cleanup:${zone}`, kind: "cleanup", from: owned(zone), to: owned("discard"), count, backs: true, effect: "Cleanup" });
    }
  }
  const revealed = new Set;
  for (const movement of game.movements.slice(before.movementIndex)) {
    if (movement.sequence !== event.sequence || movement.uid !== actor.uid)
      throw new Error("Movement does not belong to this command.");
    const { kind, card } = movement;
    const source = definition(movement.source);
    let from, to;
    switch (kind) {
      case "play":
        from = owned("hand");
        to = owned("play");
        break;
      case "draw":
        from = owned("deck");
        to = owned("hand");
        break;
      case "shuffle":
        from = owned("discard");
        to = owned("deck");
        break;
      case "trash":
        from = owned("hand");
        to = { zone: "trash" };
        break;
      case "discard":
        from = owned(card && revealed.has(card.id) ? "reveal" : "hand");
        to = owned("discard");
        break;
      case "gain":
        from = { zone: "supply", cardId: card.cardId };
        to = owned("discard");
        break;
      case "topdeck":
        from = card && revealed.has(card.id) ? owned("reveal") : { zone: "supply", cardId: card.cardId };
        to = owned("deck");
        break;
      case "reveal":
        from = owned("deck");
        to = owned("reveal");
        revealed.add(card.id);
        break;
      case "leader":
        from = { ...owned("leader"), cardId: source.id };
        to = owned("play");
        break;
      case "worship":
        from = { zone: "altar", cardId: source.id };
        to = owned("play");
        break;
    }
    const backs = kind === "draw" || kind === "shuffle";
    steps.push({
      id: `${event.sequence}:${movement.index}`,
      kind,
      from,
      to,
      count: kind === "shuffle" ? movement.amount : 1,
      effect: event.type === "turn/ended" ? "Cleanup" : source.name,
      backs,
      ...kind === "worship" ? { devotion: movement.amount } : {},
      ...!backs && card ? { card: { ...card } } : {}
    });
  }
  const values = { ...game.resources };
  return {
    ...event.type === "choice/resolved" ? { choiceId: event.choiceId } : {},
    sequence: event.sequence,
    ...event.type === "action/undone" ? { undoneSequence: event.targetSequence } : {},
    actor: { ...actor },
    command: event.type,
    steps,
    change: event.type === "turn/ended" ? null : {
      actions: values.actions - before.resources.actions,
      coins: values.coins - before.resources.coins,
      buys: values.buys - before.resources.buys,
      worship: values.worship - before.resources.worship
    },
    resources: { uid: activePlayer(game), values }
  };
}

// src/lib/game/setup.ts
var leaderIds = ["thaleia", "nereon", "melia", "doreios"];
function leaderLinks(id) {
  const leader = cards.find((card) => card.id === id && card.type === "Leader");
  if (!leader)
    throw new Error("Unknown leader.");
  return { leader, temple: cards.find((card) => card.uniqueStartingCard && card.god === leader.god), event: cards.find((card) => card.type === "Event" && card.god === leader.god) };
}
function replaySetup(events) {
  const state = { undo: null, turn: initialTurn(), supply: {}, trash: [], movements: [], publicActivity: [], playerCount: 2, players: [], activity: [], phase: "gathering", seed: null, turnOrder: [], draftOrder: [], leaders: {}, decks: {}, sharedEvents: [], dealtAtSequence: null, resources: { actions: 1, buys: 1, worship: 1, coins: 0 } };
  const commandIds = new Set;
  const undo = new UndoHistory;
  for (const event of [...events].sort((a, b) => a.sequence - b.sequence)) {
    if (event.schemaVersion !== 1 || event.sequence !== state.activity.length + 1 || ![2, 3, 4].includes(event.playerCount) || !event.actorUid || typeof event.name !== "string" || !event.name.trim() || event.name.length > 24)
      throw new Error("Invalid setup event stream.");
    if (event.equalTurns !== undefined && (event.type !== "game/created" || typeof event.equalTurns !== "boolean"))
      throw new Error("Invalid end-of-game rule.");
    if (event.type === "draft/started" || event.type === "leader/chosen" || ["action/played", "choice/resolved", "choice/browsed", "market/browsed", "worship/focused", "choice/staged", "phase/advanced", "treasure/played", "treasures/played", "card/bought", "god/worshipped", "turn/ended", "action/undone"].includes(event.type)) {
      if (event.reducerVersion !== 1 || !event.commandId || event.commandId.length > 64 || commandIds.has(event.commandId) || event.playerCount !== state.playerCount || !state.players.some((player) => player.uid === event.actorUid && player.name === event.name))
        throw new Error("Invalid play event.");
      commandIds.add(event.commandId);
      if (event.type !== "draft/started" && event.type !== "leader/chosen") {
        const before = publicCommandContext(state, event.actorUid);
        state.activity.push({ sequence: event.sequence, message: undo.apply(state, event.actorUid, event, event.sequence) });
        state.publicActivity.push(describePublicCommand(before, state, event));
        continue;
      }
      if (event.type === "draft/started") {
        if (state.phase !== "gathering" || event.actorUid !== state.players[0]?.uid || state.players.length !== state.playerCount || typeof event.seed !== "string" || !event.seed.length || event.seed.length > 64)
          throw new Error("The host may begin once every seat is filled.");
        state.seed = event.seed;
        const first = Math.floor(createPrng(`${event.seed}:first-player`)() * state.players.length);
        state.turnOrder = [...state.players.slice(first), ...state.players.slice(0, first)].map((player) => player.uid);
        state.draftOrder = [...state.turnOrder].reverse();
        state.phase = "draft";
        state.activity.push({ sequence: event.sequence, message: `${state.players.find((player) => player.uid === state.turnOrder[0]).name} goes first. Choose your bloodlines in reverse order.` });
      } else {
        const chosen = Object.values(state.leaders);
        if (state.phase !== "draft" || state.draftOrder[chosen.length] !== event.actorUid || !leaderIds.includes(event.leaderId) || chosen.includes(event.leaderId))
          throw new Error("Choose an available leader on your draft turn.");
        state.leaders[event.actorUid] = event.leaderId;
        state.sharedEvents.push(leaderLinks(event.leaderId).event.id);
        state.activity.push({ sequence: event.sequence, message: `${event.name} chose ${leaderLinks(event.leaderId).leader.name.split(",")[0]}.` });
        if (Object.keys(state.leaders).length === state.players.length) {
          for (const [seat, player] of state.players.entries()) {
            const inventory = [
              ...Array.from({ length: 6 }, (_, i) => ({ id: `seat-${seat}-obol-${i}`, cardId: "obol", copy: 41 + seat * 6 + i })),
              ...Array.from({ length: 3 }, (_, i) => ({ id: `seat-${seat}-hamlet-${i}`, cardId: "hamlet", copy: state.playerCount * 3 + 1 + seat * 3 + i })),
              { id: `seat-${seat}-temple`, cardId: leaderLinks(state.leaders[player.uid]).temple.id, copy: 1 }
            ];
            const shuffled = shuffle(inventory, `${state.seed}:starting-deck:${seat}`);
            state.decks[player.uid] = { hand: shuffled.slice(0, 5), deck: shuffled.slice(5), discard: [], play: [] };
          }
          state.supply = Object.fromEntries(setupSupply(state.playerCount).map((pile) => [pile.id, pile.count]));
          state.phase = "playing";
          state.dealtAtSequence = event.sequence;
          state.activity.at(-1).message += " Five cards dealt to each player.";
        }
      }
      continue;
    }
    if (state.phase !== "gathering")
      throw new Error("The gathering has already begun.");
    if (event.type === "player/automated") {
      const host = state.players[0];
      if (!host || event.actorUid !== host.uid || event.name !== host.name || event.playerCount !== state.playerCount || event.botKind !== null && !isBotKind(event.botKind))
        throw new Error("Only the host can automate their own seat before drafting.");
      if (event.botKind === null)
        delete host.botKind;
      else
        host.botKind = event.botKind;
      state.activity.push({ sequence: event.sequence, message: `${host.name} ${event.botKind ? "handed their seat to a bot" : "will play their own seat"}.` });
      continue;
    }
    if (event.type === "table/resized") {
      if (event.actorUid !== state.players[0]?.uid || event.name !== state.players[0]?.name || event.playerCount < state.players.length || event.playerCount === state.playerCount)
        throw new Error("Invalid table resize event.");
      state.playerCount = event.playerCount;
      state.activity.push({ sequence: event.sequence, message: `${event.name} set the table for ${event.playerCount} players.` });
      continue;
    }
    if (state.players.some((player) => player.uid === event.actorUid))
      throw new Error("Duplicate player.");
    if (event.sequence === 1) {
      if (event.type !== "game/created")
        throw new Error("Missing game creation event.");
      state.playerCount = event.playerCount;
      state.turn.equalTurns = event.equalTurns ?? false;
    } else if (event.type !== "player/joined" || event.playerCount !== state.playerCount || state.players.length >= state.playerCount) {
      throw new Error("Invalid player join event.");
    }
    if (event.botKind !== undefined && (event.type !== "player/joined" || !isBotKind(event.botKind)))
      throw new Error("Invalid bot seat.");
    state.players.push({ uid: event.actorUid, name: event.name, ...event.botKind ? { botKind: event.botKind } : {} });
    state.activity.push({ sequence: event.sequence, message: `${event.name} ${event.type === "game/created" ? "created the table" : "joined the table"}.` });
  }
  return state;
}
function setupSupply(players) {
  return cards.filter((card) => card.type !== "Leader" && card.type !== "Event" && card.supply[players] > 0).map((card) => ({ id: card.id, count: card.supply[players] }));
}

// balance-checkpoint/equal-turns/source/src/lib/game/cards.ts
var cards2 = [
  {
    id: "obol",
    name: "Obol",
    type: "Treasure",
    god: "Hestia",
    cost: 0,
    effect: "+1 Coin.",
    art: "obol",
    artDescription: "A single worn bronze Greek coin bearing a simple hearth motif on a dark stone offering table, warm firelight, intimate still life.",
    number: 1,
    startingCopiesPerPlayer: 6,
    supply: {
      "2": 40,
      "3": 40,
      "4": 40
    }
  },
  {
    id: "drachma",
    name: "Drachma",
    type: "Treasure",
    god: "Hestia",
    cost: 3,
    effect: "+2 Coins.",
    art: "drachma",
    artDescription: "A small stack of silver ancient Greek coins beside a linen purse on a marble counting table, silver and warm candlelight, intimate still life.",
    number: 2,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 30,
      "3": 30,
      "4": 30
    }
  },
  {
    id: "talent",
    name: "Talent",
    type: "Treasure",
    god: "Hestia",
    cost: 6,
    effect: "+3 Coins.",
    art: "talent",
    artDescription: "Heavy gold ingots and a bronze balance scale in an ancient Greek treasury, luxurious amber light and dark shadow, intimate still life.",
    number: 3,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 20,
      "3": 20,
      "4": 20
    }
  },
  {
    id: "hamlet",
    name: "Hamlet",
    type: "Territory",
    god: "Hestia",
    cost: 2,
    effect: "1 VP.",
    art: "hamlet",
    artDescription: "A humble cluster of whitewashed Greek farmhouses among olive trees, earthen path and terraced hills at dawn, intimate pastoral landscape.",
    vp: 1,
    number: 4,
    startingCopiesPerPlayer: 3,
    supply: {
      "2": 6,
      "3": 9,
      "4": 12
    }
  },
  {
    id: "polis",
    name: "Polis",
    type: "Territory",
    god: "Hestia",
    cost: 5,
    effect: "3 VP.",
    art: "polis",
    artDescription: "A prosperous ancient Greek city surrounding a columned agora, tiled roofs, fountain and market, sunlit marble, elevated landscape view.",
    vp: 3,
    number: 5,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 6,
      "3": 9,
      "4": 12
    }
  },
  {
    id: "acropolis",
    name: "Acropolis",
    type: "Territory",
    god: "Hestia",
    cost: 8,
    effect: "6 VP.",
    art: "acropolis",
    artDescription: "A monumental Greek acropolis crowning a steep rocky hill above a sprawling city and the Aegean, soaring marble colonnades, dramatic sunbeams, epic landscape.",
    vp: 6,
    number: 6,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 6,
      "3": 9,
      "4": 12
    }
  },
  {
    id: "oracles-acolyte",
    name: "Oracle\u2019s Acolyte",
    type: "Action",
    god: "Athena",
    cost: 2,
    effect: "+1 Card; +1 Action.",
    art: "oracles-acolyte",
    artDescription: "A young Greek acolyte in ivory linen reading a scroll beside an owl in a candlelit marble oracle sanctuary, incense and indigo shadows.",
    number: 7,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "council-of-sages",
    name: "Council of Sages",
    type: "Action",
    god: "Athena",
    cost: 4,
    effect: "+3 Cards.",
    art: "council-of-sages",
    artDescription: "Three elderly Greek philosophers in ivory and indigo robes gathered around scrolls at a stone council table beneath marble columns, considered debate.",
    number: 8,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "sacred-academy",
    name: "Sacred Academy",
    type: "Action",
    god: "Athena",
    cost: 5,
    effect: "+2 Cards; +1 Action.",
    art: "sacred-academy",
    artDescription: "A luminous marble academy with students under graceful colonnades, olive trees and scrolls, serene Greek sanctuary of wisdom.",
    number: 9,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "harbor-pilot",
    name: "Harbor Pilot",
    type: "Action",
    god: "Poseidon",
    cost: 3,
    effect: "+1 Card; +2 Actions.",
    art: "harbor-pilot",
    artDescription: "A weathered Greek harbor pilot holding a ship's steering oar on the deck of an ancient merchant vessel, turquoise sea and busy harbor behind.",
    number: 10,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "sea-trade",
    name: "Sea Trade",
    type: "Action",
    god: "Poseidon",
    cost: 4,
    effect: "+2 Coins; +1 Buy.",
    art: "sea-trade",
    artDescription: "Two Greek merchants exchanging amphorae and a purse at a sunlit dock, wooden merchant ship and turquoise sea behind them, warm bronze details.",
    number: 11,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "merchant-fleet",
    name: "Merchant Fleet",
    type: "Action",
    god: "Poseidon",
    cost: 5,
    effect: "+1 Card; +1 Action; +1 Coin; +1 Buy.",
    art: "merchant-fleet",
    artDescription: "A proud fleet of three ancient Greek merchant sailing ships with ivory sails crossing deep turquoise water toward a marble port, dramatic wide seascape.",
    number: 12,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "seed-keeper",
    name: "Seed Keeper",
    type: "Action",
    god: "Demeter",
    cost: 2,
    effect: "You may trash up to 2 cards from your hand.",
    art: "seed-keeper",
    artDescription: "An older Greek woman carefully sorting seeds into clay bowls at a wooden table in an olive orchard, earthy greens and warm golden morning light.",
    number: 13,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "harvest-feast",
    name: "Harvest Feast",
    type: "Action",
    god: "Demeter",
    cost: 4,
    effect: "+2 Cards; +1 Action; discard 1 card from your hand.",
    art: "harvest-feast",
    artDescription: "A bountiful communal Greek harvest table under grapevines, bread, figs, wheat and terracotta cups, joyful villagers in distance, golden evening light.",
    number: 14,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "sacred-grove",
    name: "Sacred Grove",
    type: "Action",
    god: "Demeter",
    cost: 5,
    effect: "+1 Action; gain a card costing up to 4 Coins to your discard pile.",
    art: "sacred-grove",
    artDescription: "An ancient olive grove surrounding a small marble altar, shaft of golden sunlight through silver-green leaves, roots and wildflowers, tranquil sacred landscape.",
    number: 15,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "bronze-recruit",
    name: "Bronze Recruit",
    type: "Action",
    god: "Ares",
    cost: 3,
    effect: "+2 Coins.",
    art: "bronze-recruit",
    artDescription: "A young adult Greek recruit in simple bronze cuirass holding a round shield and spear upright in a sunlit training yard, rust red cloak, determined expression.",
    number: 16,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "forge-of-heroes",
    name: "Forge of Heroes",
    type: "Action",
    god: "Ares",
    cost: 4,
    effect: "You may trash 1 card from your hand. If you do, gain a card costing up to 2 Coins more than the trashed card to your discard pile.",
    art: "forge-of-heroes",
    artDescription: "A muscular Greek blacksmith hammering a glowing bronze blade at a stone forge, sparks, finished heroic shields hanging in shadows, dramatic ember light.",
    number: 17,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "victorious-procession",
    name: "Victorious Procession",
    type: "Action",
    god: "Ares",
    cost: 5,
    effect: "+2 Coins; +1 Buy; reveal the top card of your deck. If it is a Territory, put it into your discard pile and gain +2 Coins. Otherwise, put it back on top of your deck.",
    art: "victorious-procession",
    artDescription: "A peaceful triumphant Greek procession through monumental city gates, laurel-wreathed soldiers bearing crimson standards, citizens welcoming them, no violence.",
    number: 18,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 8,
      "3": 12,
      "4": 16
    }
  },
  {
    id: "thaleia",
    name: "Thaleia, Keeper of the Owl",
    type: "Leader",
    god: "Athena",
    cost: null,
    effect: "After you resolve the first Athena Action you play this turn, +1 Action.",
    art: "thaleia",
    artDescription: "Thaleia, original mortal Greek woman leader, thoughtful dark-eyed face, dark braided hair, indigo mantle over ivory robes, small owl brooch, holding a rolled scroll in an academy, dignified half-length portrait. No crown or divine halo.",
    number: 19,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "nereon",
    name: "Nereon, Heir of the Tide",
    type: "Leader",
    god: "Poseidon",
    cost: null,
    effect: "After you resolve the first Poseidon Action you play this turn, +1 Coin.",
    art: "nereon",
    artDescription: "Nereon, original mortal Greek man leader, weathered olive skin, short curly dark beard, teal cloak with bronze clasp, captain overlooking a harbor, dignified half-length portrait. No crown or divine halo.",
    number: 20,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "melia",
    name: "Melia, Warden of the Fields",
    type: "Leader",
    god: "Demeter",
    cost: null,
    effect: "After you resolve the first Demeter Action you play this turn, +1 Card.",
    art: "melia",
    artDescription: "Melia, original mortal Greek woman leader, mature face, curly auburn hair, olive green mantle, woven wheat circlet and basket of seeds, golden fields behind, dignified half-length portrait. No divine halo.",
    number: 21,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "doreios",
    name: "Doreios, Bearer of the Red Spear",
    type: "Leader",
    god: "Ares",
    cost: null,
    effect: "After you resolve the first Ares Action you play this turn, you may trash 1 card from your hand.",
    art: "doreios",
    artDescription: "Doreios, original mortal Greek man leader, close-cropped gray hair and beard, scarred dignified face, bronze cuirass and crimson cloak, holding a red-shafted spear, city walls behind, half-length portrait. No helmet or divine halo.",
    number: 22,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "counsel-of-olympus",
    name: "Counsel of Olympus",
    type: "Event",
    god: "Athena",
    cost: 3,
    effect: "Gain an Action costing up to 3 Coins onto your deck.",
    favored: "Gain an Action costing up to 5 Coins onto your deck.",
    art: "athena",
    artDescription: "Athena, serene armored Greek goddess of wisdom with an owl perched beside her, luminous marble academy above an olive grove behind her. Painterly museum-quality oil and tempera illustration, weathered mineral pigments, antique gold highlights, deep midnight indigo shadows, warm ivory marble, subtle canvas grain. Strong readable central silhouette. Landscape 3:2 composition, bust and environment, usable in a card art window. Entire canvas is illustration, no border, no frame, no lettering, no numerals, no watermark. Mythic classical Greece, no modern objects. This establishes the cohesive art direction for a family of card illustrations.",
    number: 23,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "tribute-of-the-tides",
    name: "Tribute of the Tides",
    type: "Event",
    god: "Poseidon",
    cost: 3,
    effect: "Gain a Drachma to your discard pile.",
    favored: "Gain a Drachma onto your deck; +1 Buy.",
    art: "poseidon",
    artDescription: "Poseidon, mighty bearded Greek sea god holding a trident above a storm-swept turquoise harbor, Greek merchant ships on the waves, sea-green and bronze palette.",
    number: 24,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "blessing-of-the-fields",
    name: "Blessing of the Fields",
    type: "Event",
    god: "Demeter",
    cost: 3,
    effect: "You may trash up to 2 cards from your hand.",
    favored: "You may trash up to 2 cards from your hand; you may gain a card costing up to their combined cost to your discard pile; +1 Buy.",
    art: "demeter",
    artDescription: "Demeter, dignified Greek goddess of harvest carrying a sheaf of ripe wheat in a sunlit terraced orchard, golden fields and distant marble sanctuary, olive green and amber palette.",
    number: 25,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "trial-of-the-spear",
    name: "Trial of the Spear",
    type: "Event",
    god: "Ares",
    cost: 4,
    effect: "You may trash 1 card from your hand. If you do, gain a card costing up to 1 Coin more than the trashed card to your discard pile.",
    favored: "You may trash 1 card from your hand. If you do, gain a card costing up to 3 Coins more than the trashed card to your discard pile.",
    art: "ares",
    artDescription: "Ares, solemn Greek god of war in dark bronze armor and a crimson cloak, crested helmet, standing before an ancient forge and distant city walls, ember red and bronze palette.",
    number: 26,
    startingCopiesPerPlayer: 0,
    supply: {
      "2": 1,
      "3": 1,
      "4": 1
    }
  },
  {
    id: "temple-of-athena",
    name: "Temple of Athena",
    type: "Action",
    god: "Athena",
    cost: 0,
    effect: "+1 Worship; +1 Action.",
    art: "temple-of-athena",
    artDescription: "A sacred Greek temple dedicated to Athena.",
    number: 27,
    startingCopiesPerPlayer: 0,
    uniqueStartingCard: true,
    supply: {
      "2": 0,
      "3": 0,
      "4": 0
    }
  },
  {
    id: "temple-of-poseidon",
    name: "Temple of Poseidon",
    type: "Action",
    god: "Poseidon",
    cost: 0,
    effect: "+1 Worship; +1 Action.",
    art: "temple-of-poseidon",
    artDescription: "A sacred Greek temple dedicated to Poseidon.",
    number: 28,
    startingCopiesPerPlayer: 0,
    uniqueStartingCard: true,
    supply: {
      "2": 0,
      "3": 0,
      "4": 0
    }
  },
  {
    id: "temple-of-demeter",
    name: "Temple of Demeter",
    type: "Action",
    god: "Demeter",
    cost: 0,
    effect: "+1 Worship; +1 Action.",
    art: "temple-of-demeter",
    artDescription: "A sacred Greek temple dedicated to Demeter.",
    number: 29,
    startingCopiesPerPlayer: 0,
    uniqueStartingCard: true,
    supply: {
      "2": 0,
      "3": 0,
      "4": 0
    }
  },
  {
    id: "temple-of-ares",
    name: "Temple of Ares",
    type: "Action",
    god: "Ares",
    cost: 0,
    effect: "+1 Worship; +1 Action.",
    art: "temple-of-ares",
    artDescription: "A sacred Greek temple dedicated to Ares.",
    number: 30,
    startingCopiesPerPlayer: 0,
    uniqueStartingCard: true,
    supply: {
      "2": 0,
      "3": 0,
      "4": 0
    }
  }
];

// balance-checkpoint/equal-turns/source/src/lib/game/random.ts
function createPrng2(seed) {
  let value = 2166136261;
  for (const character of seed) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 16777619);
  }
  let state = value >>> 0 || 2654435769;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
function shuffle2(values, seed) {
  const result = [...values], random = createPrng2(seed);
  for (let i = result.length - 1;i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// balance-checkpoint/equal-turns/source/src/lib/game/actions.ts
function initialTurn2() {
  return { number: 1, index: 0, phase: "actions", leaderUsed: false, queue: [], choice: null, shuffles: {}, turns: {} };
}
var definition2 = (id) => {
  const card = cards2.find((card2) => card2.id === id);
  if (!card)
    throw new Error("Unknown card.");
  return card;
};
var activePlayer2 = (game) => game.turnOrder[game.turn.index];
function eligibleGains2(game, limit, actionOnly = false) {
  return cards2.filter((card) => (game.supply[card.id] ?? 0) > 0 && card.cost !== null && card.cost <= limit && (!actionOnly || card.type === "Action"));
}
function devotionCards2(game, uid, eventId) {
  const god = definition2(eventId).god;
  return (game.decks[uid]?.play ?? []).filter((card) => definition2(card.cardId).type === "Action" && definition2(card.cardId).god === god);
}
function worshipReason2(game, uid, eventId) {
  if (game.phase !== "playing" || game.turn.phase === "finished")
    return "Worship is available during play.";
  if (activePlayer2(game) !== uid)
    return "Wait for your turn.";
  if (game.turn.choice || game.turn.queue.length)
    return "Finish your current choice.";
  if (!game.sharedEvents.includes(eventId))
    return "This god is not at this table.";
  if (game.resources.worship < 1)
    return "No Worship remaining.";
  const cost = definition2(eventId).cost;
  if (game.resources.coins < cost)
    return `You need ${cost - game.resources.coins} more ${cost - game.resources.coins === 1 ? "Coin" : "Coins"}.`;
  return "";
}
function worshipEffects2(id, favored) {
  const buy = { kind: "resource", source: id, resource: "buys", amount: 1 };
  switch (id) {
    case "counsel-of-olympus":
      return [{ kind: "gain", source: id, limit: favored ? 5 : 3, actionOnly: true, topdeck: true }];
    case "tribute-of-the-tides":
      return [{ kind: "gain", source: id, limit: 3, cardId: "drachma", topdeck: favored }, ...favored ? [buy] : []];
    case "blessing-of-the-fields":
      return [{ kind: "trash", source: id, amount: 2, ...favored ? { offering: "sum" } : {} }, ...favored ? [buy] : []];
    case "trial-of-the-spear":
      return [{ kind: "trash", source: id, amount: 1, offering: favored ? 3 : 1 }];
    default:
      throw new Error("Choose a shared god event.");
  }
}
function canPlayAction2(game, uid, instanceId) {
  return game.phase === "playing" && activePlayer2(game) === uid && game.turn.phase === "actions" && !game.turn.choice && game.resources.actions > 0 && game.decks[uid]?.hand.some((card) => card.id === instanceId && definition2(card.cardId).type === "Action");
}
function purchaseReason2(game, uid, id) {
  if (game.turn.phase === "finished")
    return "The game is over.";
  if (activePlayer2(game) !== uid)
    return "Wait for your turn.";
  if (game.turn.choice)
    return "Finish your current choice.";
  if (!["treasures", "buys"].includes(game.turn.phase))
    return "Finish playing Actions before buying cards.";
  if (!game.supply[id])
    return "This pile is empty.";
  if (game.resources.buys < 1)
    return "No Buys remaining.";
  const cost = definition2(id).cost;
  if (cost === null || game.resources.coins < cost)
    return `You need ${cost - game.resources.coins} more Coins.`;
  return "";
}
function resource2(source, key, amount) {
  return { kind: "resource", source, resource: key, amount };
}
function actionEffects2(id, variant = "standard") {
  if (variant === "base-game" && definition2(id).uniqueStartingCard)
    return [];
  const draw = (amount) => ({ kind: "draw", source: id, amount });
  const add = (key, amount) => resource2(id, key, amount);
  if (definition2(id).uniqueStartingCard)
    return [add("worship", 1), add("actions", 1)];
  switch (id) {
    case "oracles-acolyte":
      return [draw(1), add("actions", 1)];
    case "council-of-sages":
      return [draw(3)];
    case "sacred-academy":
      return [draw(2), add("actions", 1)];
    case "harbor-pilot":
      return [draw(1), add("actions", 2)];
    case "sea-trade":
      return [add("coins", 2), add("buys", 1)];
    case "merchant-fleet":
      return [draw(1), add("actions", 1), add("coins", 1), add("buys", 1)];
    case "seed-keeper":
      return [{ kind: "trash", source: id, amount: 2 }];
    case "harvest-feast":
      return [draw(2), add("actions", 1), { kind: "discard", source: id, amount: 1 }];
    case "sacred-grove":
      return [add("actions", 1), { kind: "gain", source: id, limit: 4 }];
    case "bronze-recruit":
      return [add("coins", 2)];
    case "forge-of-heroes":
      return [{ kind: "trash", source: id, amount: 1, forge: true }];
    case "victorious-procession":
      return [add("coins", 2), add("buys", 1), { kind: "reveal", source: id }];
    default:
      throw new Error("This card is not an Action.");
  }
}
function leaderEffects2(id, variant = "standard") {
  if (variant === "base-game")
    return [];
  if (id === "thaleia")
    return [
      resource2(id, "actions", variant === "thaleia-actions" ? 2 : 1),
      ...variant === "thaleia-buy" ? [resource2(id, "buys", 1)] : [],
      ...variant === "thaleia-draw" || variant === "leader-buffs" ? [{ kind: "draw", source: id, amount: 1 }] : []
    ];
  if (id === "nereon")
    return [resource2(id, "coins", variant === "leader-buffs" ? 2 : 1)];
  if (id === "melia")
    return [{ kind: "draw", source: id, amount: variant === "leader-buffs" ? 2 : 1 }];
  if (id === "doreios")
    return [{ kind: "trash", source: id, amount: 1 }];
  return [];
}
function applyPlayCommand2(game, uid, command, sequence, variant = "standard") {
  if (game.phase !== "playing" || activePlayer2(game) !== uid || game.turn.phase === "finished")
    throw new Error("Wait for your turn.");
  const zones = game.decks[uid], name = game.players.find((player) => player.uid === uid).name;
  const messages = [];
  const move = (kind, source, card, amount) => game.movements.push({ sequence, index: game.movements.length, uid, kind, source, ...card ? { card: { ...card } } : {}, ...amount !== undefined ? { amount } : {} });
  function takeTop(source) {
    if (!zones.deck.length && zones.discard.length) {
      const seat = game.players.findIndex((player) => player.uid === uid), count = game.turn.shuffles[uid] ?? 0;
      zones.deck = shuffle2(zones.discard, `${game.seed}:reshuffle:${seat}:${count}`);
      zones.discard = [];
      game.turn.shuffles[uid] = count + 1;
      move("shuffle", source, undefined, zones.deck.length);
    }
    return zones.deck.shift();
  }
  function draw(amount, source) {
    let drawn = 0;
    for (let i = 0;i < amount; i++) {
      const card = takeTop(source);
      if (!card)
        break;
      zones.hand.push(card);
      move("draw", source, card);
      drawn++;
    }
    messages.push(`drew ${drawn} ${drawn === 1 ? "card" : "cards"}`);
  }
  function gain(id, source, topdeck = false) {
    const card = definition2(id), remaining = game.supply[id];
    if (!remaining)
      throw new Error("That supply pile is empty.");
    const copy = card.supply[game.playerCount] - remaining + 1;
    const instance = { id: `supply-${id}-${copy}`, cardId: id, copy };
    game.supply[id]--;
    if (topdeck)
      zones.deck.unshift(instance);
    else
      zones.discard.push(instance);
    move(topdeck ? "topdeck" : "gain", source, instance);
    messages.push(`gained ${card.name} ${topdeck ? "onto the deck" : "to discard"}`);
  }
  function resolve() {
    while (game.turn.queue.length && !game.turn.choice) {
      const effect = game.turn.queue.shift();
      if (definition2(effect.source).type === "Leader") {
        move("leader", effect.source);
        messages.push(`${definition2(effect.source).name.split(",")[0]}\u2019s blessing`);
      }
      if (effect.kind === "resource") {
        game.resources[effect.resource] += effect.amount;
        messages.push(`+${effect.amount} ${effect.resource === "worship" ? "Worship" : effect.resource}`);
      } else if (effect.kind === "draw")
        draw(effect.amount, effect.source);
      else if (effect.kind === "reveal") {
        const card = takeTop(effect.source);
        if (!card) {
          messages.push("no card to reveal");
          continue;
        }
        move("reveal", effect.source, card);
        if (definition2(card.cardId).type === "Territory") {
          zones.discard.push(card);
          game.resources.coins += 2;
          move("discard", effect.source, card);
          messages.push(`revealed ${definition2(card.cardId).name} to discard, +2 coins`);
        } else {
          zones.deck.unshift(card);
          move("topdeck", effect.source, card);
          messages.push(`revealed ${definition2(card.cardId).name} and returned it to the deck`);
        }
      } else if (effect.kind === "gain") {
        if (effect.cardId) {
          if (game.supply[effect.cardId])
            gain(effect.cardId, effect.source, effect.topdeck);
          else
            messages.push(`${definition2(effect.cardId).name} pile is empty`);
          continue;
        }
        if (!eligibleGains2(game, effect.limit, effect.actionOnly).length) {
          messages.push("no eligible card to gain");
          continue;
        }
        game.turn.choice = { id: `${sequence}:${game.turn.queue.length}:gain`, kind: "gain", source: effect.source, min: effect.optional ? 0 : 1, max: 1, limit: effect.limit, ...effect.actionOnly ? { actionOnly: true } : {}, ...effect.topdeck ? { topdeck: true } : {} };
      } else {
        const max = Math.min(effect.amount, zones.hand.length);
        if (!max) {
          messages.push(`no cards to ${effect.kind}`);
          if (effect.offering === "sum")
            game.turn.queue.unshift({ kind: "gain", source: effect.source, limit: 0, optional: true });
          continue;
        }
        game.turn.choice = { id: `${sequence}:${game.turn.queue.length}:${effect.kind}`, kind: effect.kind, source: effect.source, min: effect.kind === "discard" ? max : 0, max, ...effect.forge ? { forge: true } : {}, ...effect.offering ? { offering: effect.offering } : {} };
      }
    }
  }
  if (command.type !== "choice/resolved" && game.turn.choice)
    throw new Error("Finish the current choice first.");
  switch (command.type) {
    case "action/played": {
      if (!canPlayAction2(game, uid, command.instanceId))
        throw new Error("Choose an Action in your hand while you have an Action remaining.");
      const index = zones.hand.findIndex((card2) => card2.id === command.instanceId), card = zones.hand.splice(index, 1)[0];
      zones.play.push(card);
      game.resources.actions--;
      move("play", card.cardId, card);
      messages.push(`played ${definition2(card.cardId).name}`);
      game.turn.queue = actionEffects2(card.cardId, variant);
      const leader = definition2(game.leaders[uid]);
      if (variant !== "base-game" && !game.turn.leaderUsed && leader.god === definition2(card.cardId).god) {
        game.turn.leaderUsed = true;
        game.turn.queue.push(...leaderEffects2(leader.id, variant));
      }
      resolve();
      break;
    }
    case "god/worshipped": {
      if (variant === "base-game")
        throw new Error("Worship is disabled in the base-game trial.");
      const reason = worshipReason2(game, uid, command.cardId);
      if (reason)
        throw new Error(reason);
      const event = definition2(command.cardId), devotion = devotionCards2(game, uid, event.id).length;
      game.resources.worship--;
      game.resources.coins -= event.cost;
      move("worship", event.id, undefined, devotion);
      messages.push(`worshipped ${event.god} \xB7 ${devotion >= 2 ? "Favored" : "Standard"}`);
      game.turn.queue = worshipEffects2(event.id, devotion >= 2);
      resolve();
      break;
    }
    case "choice/resolved": {
      const choice = game.turn.choice;
      if (!choice || command.choiceId !== choice.id || !Array.isArray(command.targets) || command.targets.some((id) => typeof id !== "string") || new Set(command.targets).size !== command.targets.length || command.targets.length < choice.min || command.targets.length > choice.max)
        throw new Error("Choose the required cards for this effect.");
      if (choice.kind === "gain") {
        if (command.targets.length && !eligibleGains2(game, choice.limit, choice.actionOnly).some((card) => card.id === command.targets[0]))
          throw new Error("Choose an available card within the cost limit.");
        if (command.targets.length)
          gain(command.targets[0], choice.source, choice.topdeck);
        else
          messages.push("chose not to gain");
      } else {
        if (command.targets.some((id) => !zones.hand.some((card) => card.id === id)))
          throw new Error("Choose cards from your hand.");
        const chosen = command.targets.map((id) => zones.hand.find((card) => card.id === id));
        zones.hand = zones.hand.filter((card) => !command.targets.includes(card.id));
        for (const card of chosen) {
          (choice.kind === "trash" ? game.trash : zones.discard).push(card);
          move(choice.kind, choice.source, card);
        }
        messages.push(chosen.length ? `${choice.kind === "trash" ? "trashed" : "discarded"} ${chosen.map((card) => definition2(card.cardId).name).join(", ")}` : "trashed no cards");
        if (choice.offering === "sum")
          game.turn.queue.unshift({ kind: "gain", source: choice.source, limit: chosen.reduce((sum, card) => sum + definition2(card.cardId).cost, 0), optional: true });
        else if (choice.offering && chosen.length)
          game.turn.queue.unshift({ kind: "gain", source: choice.source, limit: definition2(chosen[0].cardId).cost + choice.offering });
        if (choice.forge && chosen.length)
          game.turn.queue.unshift({ kind: "gain", source: choice.source, limit: definition2(chosen[0].cardId).cost + 2 });
      }
      game.turn.choice = null;
      resolve();
      break;
    }
    case "phase/advanced": {
      if (game.turn.phase === "buys")
        throw new Error("You are already in the Buy phase.");
      game.turn.phase = game.turn.phase === "actions" ? "treasures" : "buys";
      messages.push(`entered the ${game.turn.phase === "treasures" ? "Treasure" : "Buy"} phase`);
      break;
    }
    case "treasures/played": {
      const treasures = zones.hand.filter((card) => definition2(card.cardId).type === "Treasure");
      if (game.turn.phase !== "treasures" || !treasures.length)
        throw new Error("There are no Treasures to play.");
      for (const card of treasures) {
        zones.hand.splice(zones.hand.findIndex((item) => item.id === card.id), 1);
        zones.play.push(card);
        const value = { obol: 1, drachma: 2, talent: 3 }[card.cardId];
        game.resources.coins += value;
        move("play", card.cardId, card);
        messages.push(`played ${definition2(card.cardId).name}, +${value} coins`);
      }
      break;
    }
    case "treasure/played": {
      const index = zones.hand.findIndex((card2) => card2.id === command.instanceId);
      if (game.turn.phase !== "treasures" || index < 0 || definition2(zones.hand[index].cardId).type !== "Treasure")
        throw new Error("Play a Treasure from your hand in the Treasure phase.");
      const card = zones.hand.splice(index, 1)[0];
      zones.play.push(card);
      const value = { obol: 1, drachma: 2, talent: 3 }[card.cardId];
      game.resources.coins += value;
      move("play", card.cardId, card);
      messages.push(`played ${definition2(card.cardId).name}, +${value} coins`);
      break;
    }
    case "card/bought": {
      const card = definition2(command.cardId);
      if (card.cost === null || purchaseReason2(game, uid, card.id))
        throw new Error("That purchase is not available.");
      game.turn.phase = "buys";
      game.resources.buys--;
      game.resources.coins -= card.cost;
      gain(card.id, card.id);
      break;
    }
    case "turn/ended": {
      if (!["treasures", "buys"].includes(game.turn.phase))
        throw new Error("Finish the Action phase first.");
      zones.discard.push(...zones.hand, ...zones.play);
      zones.hand = [];
      zones.play = [];
      draw(5, game.leaders[uid]);
      game.turn.turns[uid] = (game.turn.turns[uid] ?? 0) + 1;
      game.resources = { actions: 1, coins: 0, buys: 1, worship: variant === "base-game" ? 0 : 1 };
      game.turn.leaderUsed = false;
      const triggered = game.supply.acropolis === 0 || Object.values(game.supply).filter((count) => count === 0).length >= 3;
      if (game.turn.equalTurns && triggered && !game.turn.finalRound) {
        game.turn.finalRound = true;
        game.turn.endTriggeredBy = uid;
      }
      if ((triggered || game.turn.finalRound) && (!game.turn.equalTurns || game.turn.index === game.turnOrder.length - 1)) {
        game.turn.phase = "finished";
        game.resources = { actions: 0, coins: 0, buys: 0, worship: 0 };
      } else {
        game.turn.index = (game.turn.index + 1) % game.turnOrder.length;
        game.turn.number++;
        game.turn.phase = "actions";
      }
      messages.push("ended the turn");
      break;
    }
    default:
      throw new Error("Unknown play command.");
  }
  return `${name} ${messages.join("; ")}.`;
}

// balance-checkpoint/equal-turns/source/scripts/balance/planning.ts
var treasureValue = (id) => id === "obol" ? 1 : id === "drachma" ? 2 : id === "talent" ? 3 : 0;
var availableCoins = (view) => view.resources.coins + (view.phase === "buys" ? 0 : view.hand.reduce((n, c) => n + treasureValue(c.cardId), 0));
function isEnding(supply) {
  return supply.acropolis === 0 || Object.values(supply).filter((n) => n === 0).length >= 3;
}
function endingShare(view, vp = 0, supply = view.supply) {
  if (!isEnding(supply))
    return null;
  if (view.equalTurns && (view.playersAfter ?? 0) > 0)
    return null;
  const score = view.myScore + vp, turns = view.myTurns + 1;
  if (view.scores.some((s, i) => s > score || s === score && view.opposingTurns[i] < turns))
    return 0;
  return 1 / (1 + view.scores.filter((s, i) => s === score && view.opposingTurns[i] === turns).length);
}
function purchasePlan(view, utility, coins = view.resources.coins, buys = view.resources.buys) {
  const ids = Object.keys(view.supply).filter((id) => view.supply[id] > 0 && !view.bannedCards.includes(id) && definition2(id).cost !== null && definition2(id).cost <= coins).sort();
  const candidates = ids.map((id) => ({ id, cost: definition2(id).cost, values: Array.from({ length: Math.min(buys, view.supply[id]) }, (_, n) => utility(id, n)), vp: definition2(id).vp ?? 0 }));
  let states = new Map([["0/0/0", [{ cards: [], utility: 0, vp: 0, coins: 0, buys: 0, mask: 0 }]]]);
  const keep = (map, node) => {
    const key = `${node.coins}/${node.buys}/${node.mask}`, old = map.get(key) ?? [];
    if (old.some((n) => n.utility >= node.utility && n.vp >= node.vp))
      return;
    map.set(key, [...old.filter((n) => !(node.utility >= n.utility && node.vp >= n.vp)), node]);
  };
  for (const [index, item] of candidates.entries()) {
    const next = new Map;
    for (const bucket of states.values())
      for (const state of bucket) {
        const max = Math.min(buys - state.buys, view.supply[item.id], item.cost ? Math.floor((coins - state.coins) / item.cost) : buys - state.buys);
        for (let n = 0;n <= max; n++) {
          if (n && item.values[n - 1] <= 0 && n !== view.supply[item.id])
            continue;
          keep(next, {
            cards: [...state.cards, ...Array(n).fill(item.id)],
            utility: state.utility + item.values.slice(0, n).reduce((a, b) => a + b, 0),
            vp: state.vp + n * item.vp,
            coins: state.coins + n * item.cost,
            buys: state.buys + n,
            mask: state.mask | (n === view.supply[item.id] ? 1 << index : 0)
          });
        }
      }
    states = next;
  }
  let best = { cards: [], utility: 0, vp: 0, share: endingShare(view) };
  for (const bucket of states.values())
    for (const node of bucket) {
      const supply = { ...view.supply };
      for (const id of node.cards)
        supply[id]--;
      const share = endingShare(view, node.vp, supply);
      if (share === 0 && best.share !== 0)
        continue;
      const rank = share !== null && share > 0 ? 1000 * share + node.vp : node.utility;
      const bestRank = best.share !== null && best.share > 0 ? 1000 * best.share + best.vp : best.share === 0 ? -Infinity : best.utility;
      if (rank > bestRank + 0.000000001)
        best = { cards: node.cards, utility: node.utility, vp: node.vp, share };
    }
  best.cards.sort((a, b) => (definition2(b).vp ?? 0) - (definition2(a).vp ?? 0) || definition2(b).cost - definition2(a).cost || a.localeCompare(b));
  return best;
}
function gainOutcome(view, id, vpLoss = 0) {
  const supply = { ...view.supply, [id]: view.supply[id] - 1 };
  const vp = (definition2(id).vp ?? 0) - vpLoss;
  const result = endingShare(view, vp, supply);
  if (result !== 0 || view.resources.buys === 0)
    return result;
  const future = { ...view, supply, myScore: view.myScore + vp };
  return purchasePlan(future, (card) => (definition2(card).vp ?? 0) * 2, availableCoins(view)).share;
}
function publicHorizon(view) {
  if (view.finalRound)
    return 0;
  if (view.horizonOverride !== undefined)
    return view.horizonOverride;
  const smallest = Object.values(view.supply).sort((a, b) => a - b).slice(0, 3).reduce((a, b) => a + b, 0);
  const pressure = 1 + (view.opponentIncome ?? []).reduce((n, x) => n + x / 8, 0);
  return Math.max(0, Math.min(6, view.raceHorizon ?? 6, view.supply.acropolis * 1.5 / view.playerCount, smallest * 1.5 / view.playerCount, view.supply.acropolis / pressure));
}

// balance-checkpoint/equal-turns/source/scripts/balance/scoring.ts
function pointPurchase(view, eligible) {
  if (view.resources.buys <= 0)
    return;
  const plan = purchasePlan(view, (id) => eligible(id) ? definition2(id).vp ?? 0 : 0);
  if (plan.cards[0] && (plan.share !== null && plan.share > 0 || plan.utility > 0))
    return { type: "card/bought", cardId: plan.cards[0] };
}
function pointGain(view, legal, pointEligible) {
  const safe = legal.filter((id) => !view.bannedCards.includes(id) && view.supply[id] > 0 && gainOutcome(view, id) !== 0);
  const wins = safe.filter((id) => (gainOutcome(view, id) ?? 0) > 0);
  const eligible = wins.length ? wins : safe.filter(pointEligible);
  return eligible.sort((a, b) => (gainOutcome(view, b) ?? 0) - (gainOutcome(view, a) ?? 0) || (definition2(b).vp ?? 0) - (definition2(a).vp ?? 0) || definition2(a).cost - definition2(b).cost || a.localeCompare(b))[0];
}

// balance-checkpoint/equal-turns/source/scripts/balance/end-game.ts
var defaultEndGamePolicy = "turn-2";
function withEndGame(profile, policy = defaultEndGamePolicy) {
  const result = { ...profile, endGamePolicy: policy };
  delete result.endGame;
  delete result.race;
  return result;
}

// balance-checkpoint/equal-turns/source/scripts/balance/engine.ts
function effectFeatures(effects) {
  const result = { draw: 0, discard: 0, reveal: 0, actions: 0, coins: 0, buys: 0, trash: 0, gain: 0 };
  for (const effect of effects) {
    if (effect.kind === "draw")
      result.draw += effect.amount;
    if (effect.kind === "reveal")
      result.reveal++;
    if (effect.kind === "discard")
      result.discard += effect.amount;
    if (effect.kind === "resource" && ["actions", "coins", "buys"].includes(effect.resource))
      result[effect.resource] += effect.amount;
    if (effect.kind === "trash")
      result.trash += effect.amount;
    if (effect.kind === "gain")
      result.gain += Math.min(2, effect.limit / 3);
  }
  return result;
}
var featureCache = new Map;
function cardFeatures(id, variant = "standard") {
  const key = `${variant}/${id}`;
  let features = featureCache.get(key);
  if (!features) {
    features = effectFeatures(definition2(id).type === "Action" ? actionEffects2(id, variant) : []);
    featureCache.set(key, features);
  }
  return features;
}
function engineCapacity(view, extra) {
  const owned = { ...view.owned };
  if (extra)
    owned[extra] = (owned[extra] ?? 0) + 1;
  let size = 0, nonterminalDraw = 0, actionBudget = 1, terminalDemand = 0;
  const terminals = [];
  let matching = false;
  for (const [id, count] of Object.entries(owned)) {
    if (count <= 0)
      continue;
    size += count;
    if (definition2(id).type !== "Action")
      continue;
    const f = cardFeatures(id, view.variant);
    if (Object.values(f).every((n) => n === 0))
      continue;
    const netDraw = Math.max(0, f.draw - f.discard);
    if (definition2(id).god === definition2(view.leader).god)
      matching = true;
    if (f.actions >= 1) {
      actionBudget += (f.actions - 1) * count;
      nonterminalDraw += netDraw * count;
    } else {
      terminalDemand += count;
      terminals.push({ draw: netDraw, count });
    }
  }
  if (matching)
    actionBudget += view.leaderBonus.actions;
  let remaining = actionBudget, terminalDraw = 0, strandedDraw = 0;
  for (const terminal of terminals.sort((a, b) => b.draw - a.draw)) {
    const playable = Math.min(remaining, terminal.count);
    terminalDraw += playable * terminal.draw;
    strandedDraw += (terminal.count - playable) * terminal.draw;
    remaining -= playable;
  }
  const playableDraw = nonterminalDraw + terminalDraw + (matching ? view.leaderBonus.draw : 0);
  const missedWithActions = view.phase !== "actions" && view.resources.actions > 0 ? Math.min(3, view.unseenCount / 2) : 0;
  return { size, actionBudget, terminalDemand, playableDraw, strandedDraw, drawDeficit: Math.max(0, size + 2 + missedWithActions - 5 - playableDraw) };
}
var capacityCache = new WeakMap;
var keepCache = new WeakMap;
function startReliability(view, owned) {
  let total = 0, starters = 0;
  for (const [id, n] of Object.entries(owned)) {
    total += n;
    const f = cardFeatures(id, view.variant), bonus = definition2(id).god === definition2(view.leader).god ? view.leaderBonus : { actions: 0, draw: 0 };
    if (f.draw + bonus.draw > 0 && f.actions + bonus.actions > 0)
      starters += n;
  }
  let miss = 1;
  for (let i = 0;i < Math.min(5, total); i++)
    miss *= Math.max(0, total - starters - i) / (total - i);
  return 1 - miss;
}

// balance-checkpoint/equal-turns/source/scripts/balance/money.ts
var cache = new Map;
var ranks = new Map;
var bonus = (view) => view.leaderBonus ?? effectFeatures(leaderEffects2(view.leader, view.variant));
function actionValue(view, card) {
  const remaining = { ...view.owned };
  for (const c of [...view.hand, ...view.play ?? []])
    remaining[c.cardId] = Math.max(0, (remaining[c.cardId] ?? 0) - 1);
  const n = Object.values(remaining).reduce((a, b) => a + b, 0);
  const density = Object.entries(remaining).reduce((sum, [id, count]) => sum + count * treasureValue(id), 0) / Math.max(1, n);
  const territories = Object.entries(remaining).reduce((sum, [id, count]) => sum + count * Number(definition2(id).type === "Territory"), 0) / Math.max(1, n);
  const f = cardFeatures(card.cardId, view.variant), trigger = !view.leaderUsed && definition2(card.cardId).god === definition2(view.leader).god ? bonus(view) : effectFeatures([]);
  const preserves = view.resources.actions - 1 + f.actions + trigger.actions > 0;
  const otherActions = view.hand.some((c) => c.id !== card.id && definition2(c.cardId).type === "Action");
  return f.coins + trigger.coins + Math.min(n, f.draw + trigger.draw) * density + 2 * f.reveal * territories + (preserves && otherActions && f.actions + trigger.actions > 0 ? 100 : 0);
}
function moneyDiscard(view) {
  const value = (c) => treasureValue(c.cardId) || (definition2(c.cardId).type === "Action" && view.resources.actions > 0 ? Math.max(0, actionValue(view, c)) : 0);
  return [...view.hand].sort((a, b) => value(a) - value(b) || a.id.localeCompare(b.id)).slice(0, view.choice.max).map((c) => c.id);
}

// balance-checkpoint/equal-turns/source/scripts/balance/sampled.ts
var cache2 = new Map;
var ranks2 = new Map;

// balance-checkpoint/equal-turns/source/scripts/balance/sampled-v15.ts
var cache3 = new Map;
var ranks3 = new Map;

// balance-checkpoint/equal-turns/source/scripts/balance/objective-thin.ts
var premiumCache = new Map;

// balance-checkpoint/equal-turns/source/scripts/balance/thin.ts
var effectCache = new Map;
var economyCache = new Map;
var baseEconomy = new WeakMap;
var workCache = new WeakMap;
var toolCache = new Map;

// balance-checkpoint/equal-turns/source/scripts/balance/bot.ts
function observe(game, uid) {
  const owned = {};
  for (const card of Object.values(game.decks[uid]).flat())
    owned[card.cardId] = (owned[card.cardId] ?? 0) + 1;
  return structuredClone({
    hand: game.decks[uid].hand,
    owned,
    supply: game.supply,
    resources: game.resources,
    phase: game.turn.phase,
    choice: game.turn.choice,
    leader: game.leaders[uid],
    leaderUsed: game.turn.leaderUsed
  });
}

// balance-checkpoint/equal-turns/source/scripts/balance/strategy.ts
var candidates = [
  { scoringAt: 3, engineCopies: 3, moneyFloor: 7, worshipMargin: 0.5 },
  { scoringAt: 5, engineCopies: 2, moneyFloor: 9, worshipMargin: 1 },
  { scoringAt: 2, engineCopies: 5, moneyFloor: 6, worshipMargin: 0 }
];
function inventoryAtSetup(game, variant = "standard") {
  return Object.fromEntries(game.players.map(({ uid }) => [uid, {
    obol: 6,
    hamlet: 3,
    [variant === "base-game" ? "temple-of-athena" : `temple-of-${definition2(game.leaders[uid]).god.toLowerCase()}`]: 1
  }]));
}
function updateInventory(inventory, game, start, acquired) {
  for (const move of game.movements.slice(start)) {
    if (!move.card)
      continue;
    const { id, cardId } = move.card, owned = inventory[move.uid];
    if ((move.kind === "gain" || move.kind === "topdeck") && id.startsWith("supply-") && !acquired.has(id)) {
      acquired.add(id);
      owned[cardId] = (owned[cardId] ?? 0) + 1;
    } else if (move.kind === "trash")
      owned[cardId] = (owned[cardId] ?? 0) - 1;
  }
}
function strategyView(game, uid, inventory, restriction, variant = "standard", unseenCount) {
  const score = (player) => Object.entries(inventory[player]).reduce((sum, [id, count]) => sum + (definition2(id).vp ?? 0) * count, 0);
  return {
    ...observe(game, uid),
    ...game.turn.equalTurns ? { equalTurns: true, finalRound: !!game.turn.finalRound, playersAfter: game.turnOrder.length - 1 - game.turnOrder.indexOf(uid) } : {},
    drawPileCount: game.decks[uid].deck.length,
    variant,
    leaderBonus: effectFeatures(restriction?.kind === "leader-trigger" && restriction.id === game.leaders[uid] ? [] : leaderEffects2(game.leaders[uid], variant)),
    unseenCount: unseenCount ?? game.decks[uid].deck.length + game.decks[uid].discard.length,
    discard: structuredClone(game.decks[uid].discard),
    play: structuredClone(game.decks[uid].play),
    events: variant === "base-game" ? [] : [...game.sharedEvents],
    playerCount: game.playerCount,
    turn: game.turn.number,
    myTurns: game.turn.turns[uid] ?? 0,
    opposingTurns: game.players.filter((player) => player.uid !== uid).map((player) => game.turn.turns[player.uid] ?? 0),
    opponentIncome: game.players.filter((player) => player.uid !== uid).map((player) => {
      const cards3 = inventory[player.uid];
      return 5 * Object.entries(cards3).reduce((sum, [id, n]) => sum + n * (treasureValue(id) + cardFeatures(id, variant).coins), 0) / Math.max(5, Object.values(cards3).reduce((a, b) => a + b, 0));
    }),
    scores: game.players.filter((player) => player.uid !== uid).map((player) => score(player.uid)),
    myScore: score(uid),
    bannedCards: restriction?.kind === "card" ? [restriction.id] : [],
    bannedEvents: restriction?.kind === "event" ? [restriction.id] : []
  };
}
var valueCache = new WeakMap;
// src/lib/bots/rl-schema.ts
var deckIds = cards.filter((c) => !["Leader", "Event"].includes(c.type)).map((c) => c.id);
var eventIds = cards.filter((c) => c.type === "Event").map((c) => c.id);
var slots = [
  ...deckIds.map((id) => ({ kind: "play", ids: [id] })),
  ...deckIds.map((id) => ({ kind: "buy", ids: [id] })),
  ...deckIds.map((id) => ({ kind: "gain", ids: [id] })),
  { kind: "select", ids: [] },
  ...deckIds.map((id) => ({ kind: "select", ids: [id] })),
  ...deckIds.flatMap((id, i) => deckIds.slice(i).map((other) => ({ kind: "select", ids: [id, other] }))),
  ...eventIds.map((id) => ({ kind: "worship", ids: [id] })),
  { kind: "advance", ids: [] },
  { kind: "end", ids: [] },
  { kind: "all", ids: [] }
];
function commandFor(v, slot) {
  const id = slot.ids[0], c = v.choice;
  if (c) {
    if (c.kind === "gain") {
      if (slot.kind === "select" && !slot.ids.length && c.min === 0)
        return { type: "choice/resolved", choiceId: c.id, targets: [] };
      if (slot.kind === "gain" && v.supply[id] > 0 && definition(id).cost !== null && definition(id).cost <= c.limit && (!c.actionOnly || definition(id).type === "Action"))
        return { type: "choice/resolved", choiceId: c.id, targets: [id] };
    } else if (slot.kind === "select" && slot.ids.length >= c.min && slot.ids.length <= c.max) {
      const remaining = [...v.hand], targets = [];
      for (const id2 of slot.ids) {
        const i = remaining.findIndex((x) => x.cardId === id2);
        if (i < 0)
          return;
        targets.push(remaining.splice(i, 1)[0].id);
      }
      return { type: "choice/resolved", choiceId: c.id, targets };
    }
    return;
  }
  if (slot.kind === "play") {
    const card = v.hand.find((x) => x.cardId === id);
    if (!card)
      return;
    if (definition(id).type === "Action" && v.phase === "actions" && v.resources.actions > 0)
      return { type: "action/played", instanceId: card.id };
    if (definition(id).type === "Treasure" && ["actions", "treasures"].includes(v.phase))
      return { type: "treasure/played", instanceId: card.id };
  }
  if (slot.kind === "buy" && v.resources.buys > 0 && v.supply[id] > 0 && definition(id).cost !== null && definition(id).cost <= v.resources.coins)
    return { type: "card/bought", cardId: id };
  if (slot.kind === "worship" && v.resources.worship > 0 && v.events.includes(id) && definition(id).cost <= v.resources.coins)
    return { type: "god/worshipped", cardId: id };
  if (slot.kind === "advance" && v.phase !== "buys")
    return { type: "phase/advanced" };
  if (slot.kind === "end" && v.phase !== "actions")
    return { type: "turn/ended" };
  if (slot.kind === "all" && ["actions", "treasures"].includes(v.phase) && v.hand.some((x) => definition(x.cardId).type === "Treasure"))
    return { type: "treasures/played" };
}
function commands(v) {
  return slots.map((s) => commandFor(v, s));
}
function observation(v) {
  const counts = (zone) => deckIds.map((id) => zone.filter((c) => c.cardId === id).length / 10);
  const choice = v.choice;
  return [
    ...counts(v.hand),
    ...counts(v.play),
    ...counts(v.discard ?? []),
    ...deckIds.map((id) => (v.owned[id] ?? 0) / 10),
    ...deckIds.map((id) => (v.supply[id] ?? 0) / 40),
    ...eventIds.map((id) => Number(v.events.includes(id))),
    ...["actions", "treasures", "buys"].map((p) => Number(v.phase === p)),
    ...["trash", "discard", "gain"].map((k) => Number(choice?.kind === k)),
    ...cards.map((c) => Number(choice?.source === c.id)),
    v.resources.actions / 10,
    v.resources.coins / 20,
    v.resources.buys / 5,
    v.resources.worship / 5,
    v.myScore / 50,
    Math.max(...v.scores) / 50,
    v.myTurns / 50,
    (v.opposingTurns[0] ?? 0) / 50,
    Number(v.leaderUsed),
    Number(!!v.finalRound),
    Number(!!v.equalTurns),
    v.playersAfter ?? 0,
    (choice?.min ?? 0) / 2,
    (choice?.max ?? 0) / 2,
    (choice?.limit ?? 0) / 10,
    choice?.offering === "sum" ? 1 : typeof choice?.offering === "number" ? choice.offering / 3 : 0,
    Number(!!choice?.forge),
    Number(!!choice?.actionOnly),
    Number(!!choice?.topdeck),
    (v.drawPileCount ?? 0) / 30,
    (v.drawsPerTurn ?? 0) / 20
  ];
}
function actionIndex(v, command) {
  const canonical = (c) => {
    if (c.type === "choice/resolved")
      return JSON.stringify({ type: c.type, targets: c.targets.map((id) => v.choice?.kind === "gain" ? id : v.hand.find((x) => x.id === id).cardId).sort() });
    if (c.type === "action/played" || c.type === "treasure/played")
      return JSON.stringify({ type: c.type, card: v.hand.find((x) => x.id === c.instanceId).cardId });
    return JSON.stringify(c);
  };
  const key = canonical(command), i = commands(v).findIndex((c) => c && canonical(c) === key);
  if (i < 0)
    throw Error("Unmapped teacher command " + key);
  return i;
}
var schemaSignature = JSON.stringify({ version: 1, deckIds, eventIds, choiceSources: cards.map((c) => c.id), slots });

// src/lib/bots/rl-runtime.ts
function createActor(actor, expectedSchemaSignature = schemaSignature) {
  let cached;
  function floats(encoded) {
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    if (bytes.length % 4)
      throw Error("Invalid RL tensor");
    const view = new DataView(bytes.buffer), values = new Float32Array(bytes.length / 4);
    for (let i = 0;i < values.length; i++)
      values[i] = view.getFloat32(i * 4, true);
    return values;
  }
  function layersFor() {
    if (cached)
      return cached;
    const leader = actor.leader;
    if (!actor || actor.version !== 1 || actor.schemaSignature !== expectedSchemaSignature || actor.activation !== "tanh" || actor.dtype !== "float32-le")
      throw Error(`Incompatible RL model for ${leader}`);
    const layers = actor.layers.map((layer) => ({ ...layer, weights: floats(layer.weights), bias: floats(layer.bias) }));
    for (const layer of layers)
      if (layer.weights.length !== layer.input * layer.output || layer.bias.length !== layer.output)
        throw Error("Invalid RL layer dimensions");
    cached = layers;
    return layers;
  }
  function logits(values) {
    let input = new Float32Array(values);
    const layers = layersFor();
    for (let n = 0;n < layers.length; n++) {
      const layer = layers[n];
      if (input.length !== layer.input)
        throw Error("RL observation dimensions changed");
      const output = new Float32Array(layer.output);
      for (let row = 0;row < layer.output; row++) {
        let value = layer.bias[row];
        const start = row * layer.input;
        for (let col = 0;col < layer.input; col++)
          value += layer.weights[start + col] * input[col];
        value = Math.fround(value);
        output[row] = n === layers.length - 1 ? value : Math.tanh(value);
      }
      input = output;
    }
    return input;
  }
  function action(values, mask) {
    const valuesOut = logits(values);
    if (mask.length !== valuesOut.length)
      throw Error("RL action dimensions changed");
    let best = -1;
    for (let i = 0;i < valuesOut.length; i++) {
      if (!Number.isFinite(valuesOut[i]))
        throw Error("Nonfinite RL policy output");
      if (mask[i] && (best < 0 || valuesOut[i] > valuesOut[best]))
        best = i;
    }
    if (best < 0)
      throw Error("RL policy has no legal action");
    return best;
  }
  return { logits, action, leader: actor.leader, checkpointSHA256: actor.checkpointSHA256 };
}

// src/lib/bots/rl.ts
var runtime = new Map;

// src/lib/bots/mm.ts
var money = { obol: 1, drachma: 2, talent: 3 };
var count = (v, id) => v.owned[id] ?? 0;
var cash = (v) => Object.entries(money).reduce((n, [id, value]) => n + count(v, id) * value, 0);
var late = (v) => !!v.finalRound || v.supply.acropolis <= 2;
var handCash = (v) => v.resources.coins + v.hand.reduce((n, c) => n + (money[c.cardId] ?? 0), 0);
function createMinhPolicy(leader) {
  const starterTemple = leader === "melia" ? "temple-of-demeter" : "temple-of-poseidon";
  const replacements = leader === "melia" ? ["harvest-feast", "sacred-grove"] : ["harbor-pilot", "merchant-fleet"];
  function trashTargets(v, max) {
    if (late(v))
      return [];
    let coins = cash(v), obols = count(v, "obol");
    const openingPair = !v.events.includes("trial-of-the-spear") && obols === 6 && v.hand.filter((c) => c.cardId === "hamlet").length === 1 && Object.entries(v.owned).every(([id, n]) => !n || ["obol", "hamlet", starterTemple].includes(id));
    const replacementsOwned = replacements.reduce((n, id) => n + count(v, id), 0);
    const candidates2 = [...v.hand].sort((a, b) => trashRank(a) - trashRank(b) || a.id.localeCompare(b.id));
    const result = [];
    for (const c of candidates2) {
      if (result.length >= max)
        break;
      if (c.cardId === "hamlet" || c.cardId === starterTemple && replacementsOwned >= 2 || c.cardId === "obol" && (obols > 4 && coins >= 8 || openingPair && obols === 6)) {
        result.push(c);
        if (c.cardId === "obol") {
          coins--;
          obols--;
        }
      }
    }
    return result;
  }
  const trashRank = (c) => c.cardId === "hamlet" ? 0 : c.cardId === starterTemple ? 1 : c.cardId === "obol" ? 2 : 3;
  function preference(v) {
    const engine = [];
    if (!late(v) || !v.finalRound && !v.supply.polis && !v.supply.hamlet) {
      if (cash(v) < 9)
        engine.push("talent");
      if (!count(v, "sacred-grove"))
        engine.push("sacred-grove");
      if (!count(v, "harvest-feast"))
        engine.push("harvest-feast");
      if (count(v, "sacred-academy") < 1)
        engine.push("sacred-academy");
      if (cash(v) < 9)
        engine.push("drachma");
    }
    return ["acropolis", ...late(v) ? ["polis", "hamlet"] : [], ...engine, ...count(v, "sacred-academy") && cash(v) >= 9 ? ["polis"] : []];
  }
  function gain(v) {
    const c = v.choice;
    const eligible = Object.keys(v.supply).filter((id2) => v.supply[id2] > 0 && !v.bannedCards.includes(id2) && definition(id2).cost !== null && definition(id2).cost <= c.limit && (!c.actionOnly || definition(id2).type === "Action"));
    const order = c.source === "trial-of-the-spear" && cash(v) < 9 ? ["drachma", ...preference(v)] : preference(v);
    const preferred = order.find((id2) => eligible.includes(id2));
    const fallback = ["polis", "drachma"].find((id2) => eligible.includes(id2)) ?? [...eligible].sort((a, b) => definition(b).cost - definition(a).cost || a.localeCompare(b))[0];
    const id = preferred ?? (c.min ? fallback : undefined);
    return { type: "choice/resolved", choiceId: c.id, targets: id ? [id] : [] };
  }
  function worship(v) {
    if (v.resources.worship < 1 || late(v) || handCash(v) >= 8)
      return;
    const available = (id) => v.events.includes(id) && !v.bannedEvents.includes(id) && v.resources.coins >= definition(id).cost;
    const hamlets = v.hand.filter((c) => c.cardId === "hamlet");
    if (hamlets.length === 1 && cash(v) < 9 && v.events.includes("trial-of-the-spear") && !v.bannedEvents.includes("trial-of-the-spear") && handCash(v) >= 4 && v.supply.drachma > 0)
      return available("trial-of-the-spear") ? "trial-of-the-spear" : undefined;
    const trash = trashTargets(v, 2);
    if (available("blessing-of-the-fields") && (trash.length === 2 || trash.some((c) => c.cardId === "hamlet")))
      return "blessing-of-the-fields";
  }
  function finishingBuy(v) {
    if (v.finalRound || v.resources.buys < 1)
      return;
    const empty = Object.values(v.supply).filter((n) => n === 0).length;
    const legal = Object.keys(v.supply).filter((id) => v.supply[id] === 1 && (id === "acropolis" || empty >= 2) && !v.bannedCards.includes(id) && definition(id).cost !== null && definition(id).cost <= v.resources.coins);
    return legal.filter((id) => {
      const reply = v.equalTurns && v.playersAfter !== 0 ? Object.entries(v.supply).reduce((n, [card, count2]) => n + (count2 - Number(card === id)) * (definition(card).vp ?? 0), 0) : 0;
      return v.myScore + (definition(id).vp ?? 0) > Math.max(...v.scores) + reply;
    }).sort((a, b) => (definition(b).vp ?? 0) - (definition(a).vp ?? 0) || definition(a).cost - definition(b).cost || a.localeCompare(b))[0];
  }
  return function minhCommand(v) {
    if (v.choice) {
      const c = v.choice;
      if (c.kind === "gain")
        return gain(v);
      let targets;
      if (c.kind === "discard") {
        const value = (card) => definition(card.cardId).type === "Territory" ? -10 : definition(card.cardId).type === "Action" && v.resources.actions === 0 ? -5 : definition(card.cardId).cost ?? 0;
        targets = [...v.hand].sort((a, b) => value(a) - value(b) || a.id.localeCompare(b.id)).slice(0, c.min);
      } else
        targets = trashTargets(v, c.max);
      return { type: "choice/resolved", choiceId: c.id, targets: targets.map((c2) => c2.id) };
    }
    if (v.phase === "actions") {
      const actions = v.hand.filter((c) => definition(c.cardId).type === "Action");
      const priority = (c) => actionEffects(c.cardId).reduce((n, e) => n + (e.kind === "resource" && e.resource === "actions" ? 20 * e.amount : e.kind === "draw" ? e.amount : 0), 0) + (!v.leaderUsed && definition(c.cardId).god === definition(v.leader).god ? 5 : 0);
      const thinning = trashTargets(v, 2);
      const holdTemple = thinning.length === 2 && thinning.some((c) => c.cardId === starterTemple) && handCash(v) - thinning.reduce((n, c) => n + (money[c.cardId] ?? 0), 0) >= 3 && handCash(v) < 8 && v.events.includes("blessing-of-the-fields") && !v.bannedEvents.includes("blessing-of-the-fields") && v.resources.worship > 0;
      const next = actions.filter((c) => !(holdTemple && c.cardId === starterTemple)).sort((a, b) => priority(b) - priority(a) || a.id.localeCompare(b.id))[0];
      if (v.resources.actions > 0 && next)
        return { type: "action/played", instanceId: next.id };
      return { type: "phase/advanced" };
    }
    const event = worship(v);
    if (event)
      return { type: "god/worshipped", cardId: event };
    if (v.phase === "treasures") {
      const next = v.hand.filter((c) => money[c.cardId]).sort((a, b) => money[b.cardId] - money[a.cardId] || a.id.localeCompare(b.id))[0];
      if (next)
        return { type: "treasure/played", instanceId: next.id };
    }
    const finish = finishingBuy(v);
    if (finish)
      return { type: "card/bought", cardId: finish };
    const purchase = preference(v).find((id) => v.resources.buys > 0 && v.supply[id] > 0 && !v.bannedCards.includes(id) && definition(id).cost <= v.resources.coins);
    return purchase ? { type: "card/bought", cardId: purchase } : { type: "turn/ended" };
  };
}
var mmCommand = createMinhPolicy("melia");

// balance-checkpoint/equal-turns-engine-v3/ending-margin.ts
function unsafeReplyPurchase(v, id, margin) {
  const supply = { ...v.supply, [id]: v.supply[id] - 1 };
  if (!isEnding(supply))
    return false;
  const vp = definition2(id).vp ?? 0;
  const next = {
    ...v,
    supply,
    myScore: v.myScore + vp,
    owned: { ...v.owned, [id]: (v.owned[id] ?? 0) + 1 },
    resources: { ...v.resources, coins: v.resources.coins - definition2(id).cost, buys: v.resources.buys - 1 },
    phase: "buys"
  };
  const rest = purchasePlan(next, (c) => definition2(c).vp ?? 0);
  return next.myScore + rest.vp < Math.max(...v.scores) + margin;
}
// balance-checkpoint/equal-turns-engine-v3/policy.ts
function metrics(v, p) {
  const cap = engineCapacity(v);
  if (p.ignoreTools) {
    for (const [id, n] of Object.entries(v.owned)) {
      const f = cardFeatures(id, v.variant);
      if (f.trash > 0 && !f.gain && !f.draw && !f.coins && !f.actions && !f.buys)
        cap.terminalDemand -= n;
    }
  }
  let money2 = 0, buys = 1, payload = 0, trash = 0, junk = 0;
  for (const [id, n] of Object.entries(v.owned)) {
    const f = cardFeatures(id, v.variant);
    money2 += n * (treasureValue(id) + f.coins);
    buys += n * f.buys;
    if (f.coins > 0 && f.buys > 0 && (!p.chainPayload || f.actions >= 1))
      payload += n;
    trash += n * f.trash;
    if (id === "hamlet" || definition2(id).uniqueStartingCard && v.variant === "base-game")
      junk += n;
  }
  junk += Math.max(0, (v.owned.obol ?? 0) - p.obols);
  if (p.maintenanceCutoff !== undefined && (junk <= p.maintenanceCutoff || p.stopLateTrash && publicHorizon(v) <= 2)) {
    for (const [id, n] of Object.entries(v.owned)) {
      const f = cardFeatures(id, v.variant);
      if (f.trash > 0 && !f.gain && !f.draw && !f.coins && !f.actions && !f.buys)
        cap.terminalDemand -= n;
    }
  }
  const coverage = Math.min(1, (5 + cap.playableDraw) / Math.max(1, cap.size));
  return { cap, money: money2, buys, payload, trash, junk, coverage };
}
function playablePayload(v) {
  let money2 = 0, buys = 1;
  const terminals = [];
  for (const [id, n] of Object.entries(v.owned)) {
    if (n <= 0)
      continue;
    const f = cardFeatures(id, v.variant);
    money2 += n * treasureValue(id);
    if (definition2(id).type !== "Action")
      continue;
    if (f.actions >= 1) {
      money2 += n * f.coins;
      buys += n * f.buys;
    } else
      terminals.push({ draw: Math.max(0, f.draw - f.discard), coins: f.coins, buys: f.buys, count: n });
  }
  let slots2 = engineCapacity(v).actionBudget;
  for (const t of terminals.sort((a, b) => b.draw - a.draw || b.coins - a.coins || b.buys - a.buys)) {
    const n = Math.min(slots2, t.count);
    money2 += n * t.coins;
    buys += n * t.buys;
    slots2 -= n;
  }
  return { money: money2, buys };
}
function utility(v, p) {
  const m = metrics(v, p), c = m.cap;
  const income = p.playableIncome ? playablePayload(v) : m;
  return -p.draw * Math.max(0, c.size + p.buffer - 5 - c.playableDraw) - p.action * Math.max(0, c.terminalDemand + (c.size > 5 + c.playableDraw ? p.spare ?? 0 : 0) - c.actionBudget) + (p.reliability ?? 8) * startReliability(v, v.owned) + (p.joint ?? 0) * Math.min(income.money * m.coverage, 8 * income.buys) + p.cash * Math.min(p.moneyTarget, income.money) + p.buy * Math.min(income.buys, Math.max(p.fundedBuys ? 1 : 2, income.money * (p.fundedBuys ? m.coverage : 1) / (p.buyFunding ?? 8))) + p.payload * Math.min(1, m.payload) * Number(m.money >= (p.payloadIncome ?? 0)) + p.thin * Math.min(1, m.trash / 2) * Math.min(1, m.junk / 3) - 0.4 * c.size;
}
function basePolicy(p) {
  const pointEligible = (v, id) => {
    const vp = definition2(id).vp ?? 0, h = publicHorizon(v);
    if (vp === 6)
      return p.earlyAcropolis || h <= (p.late ?? 2) || ready(v);
    return vp >= 3 ? h <= (p.polisHorizon ?? p.late ?? 2) : vp > 0 && h <= (p.hamletHorizon ?? p.late ?? 2);
  };
  const after = (v, id, n = 1) => ({ ...v, owned: { ...v.owned, [id]: (v.owned[id] ?? 0) + n } });
  const gain = (v, limit, actionOnly = false) => {
    const ids = Object.keys(v.supply).filter((id) => v.supply[id] > 0 && !v.bannedCards.includes(id) && definition2(id).cost !== null && definition2(id).cost <= limit && (!actionOnly || definition2(id).type === "Action"));
    const points = pointGain(v, ids, (id) => pointEligible(v, id));
    if (points)
      return points;
    const safe = ids.filter((id) => gainOutcome(v, id) !== 0);
    return (safe.length ? safe : ids).sort((a, b) => utility(after(v, b), p) - utility(after(v, a), p) || definition2(a).cost - definition2(b).cost || a.localeCompare(b))[0];
  };
  const ready = (v) => {
    const m = metrics(v, p);
    return m.coverage >= p.ready && m.payload > 0 && m.money >= 8 && m.cap.actionBudget >= m.cap.terminalDemand;
  };
  function trash(v) {
    if (p.stopLateTrash && publicHorizon(v) <= 2)
      return [];
    const out = [];
    let next = v;
    for (let i = 0;i < (v.choice?.max ?? 2); i++) {
      const candidates2 = next.hand.filter((c2) => !out.includes(c2.id) && (c2.cardId === "obol" && (next.owned.obol ?? 0) > p.obols || c2.cardId === "hamlet" && publicHorizon(v) > 2 || definition2(c2.cardId).uniqueStartingCard && v.variant === "base-game"));
      const c = candidates2.filter((c2) => metrics(next, p).money - treasureValue(c2.cardId) >= p.floor).sort((a, b) => utility(after(next, b.cardId, -1), p) - utility(after(next, a.cardId, -1), p) || a.id.localeCompare(b.id))[0];
      if (!c || !p.trashRule && utility(after(next, c.cardId, -1), p) <= utility(next, p))
        break;
      out.push(c.id);
      next = after(next, c.cardId, -1);
    }
    return out;
  }
  function forge(v) {
    const base = utility(v, p);
    let best;
    for (const c of v.hand) {
      if (c.cardId === "acropolis" || c.cardId === "polis")
        continue;
      if (metrics(v, p).money - treasureValue(c.cardId) < p.floor)
        continue;
      const next = after(v, c.cardId, -1), g = gain(next, (definition2(c.cardId).cost ?? 0) + 2);
      if (!g)
        continue;
      const value = utility(after(next, g), p) - base + (definition2(g).vp ?? 0) - (definition2(c.cardId).vp ?? 0);
      if (value > 0 && (!best || value > best.value))
        best = { id: c.id, gain: g, value };
    }
    return best;
  }
  return (v, _m) => {
    if (v.choice) {
      if (v.choice.kind === "discard")
        return { type: "choice/resolved", choiceId: v.choice.id, targets: moneyDiscard(v) };
      if (v.choice.kind === "trash")
        return { type: "choice/resolved", choiceId: v.choice.id, targets: v.choice.forge ? forge(v) ? [forge(v).id] : [] : trash(v) };
      const id2 = gain(v, v.choice.limit, v.choice.actionOnly);
      return { type: "choice/resolved", choiceId: v.choice.id, targets: id2 ? [id2] : [] };
    }
    if (v.phase === "actions") {
      const options = v.hand.filter((c2) => definition2(c2.cardId).type === "Action" && Object.values(cardFeatures(c2.cardId, v.variant)).some((x) => x > 0));
      const rank = (c2) => {
        const f = cardFeatures(c2.cardId, v.variant), others = v.hand.filter((x) => x.id !== c2.id), future = { ...v, hand: others };
        const thin = f.trash ? c2.cardId === "forge-of-heroes" ? forge(future)?.value ?? 0 : trash(future).length * (p.thinPlay ?? 8) : 0;
        if (f.trash && !thin && !f.draw && !f.coins && !f.actions)
          return -1e4;
        const remains = Math.max(0, v.unseenCount), density = metrics(v, p).money / Math.max(1, Object.values(v.owned).reduce((s, n) => s + n, 0));
        const preserve = f.actions > 0 && others.some((c3) => definition2(c3.cardId).type === "Action") ? 100 : 0;
        return preserve + Math.min(remains, f.draw) * (v.resources.actions > 1 ? 4 : density) + f.coins + f.buys * 0.5 + thin + (f.actions - 1) * 2;
      };
      const c = v.resources.actions > 0 ? options.sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id))[0] : undefined;
      return c && rank(c) > -1000 ? { type: "action/played", instanceId: c.id } : { type: "phase/advanced" };
    }
    if (v.phase === "treasures" && v.hand.some((c) => definition2(c.cardId).type === "Treasure"))
      return { type: "treasures/played" };
    if (v.resources.buys <= 0)
      return { type: "turn/ended" };
    const finish = purchasePlan(v, (id2) => definition2(id2).vp ?? 0);
    if (finish.share !== null && finish.share > 0 && finish.cards[0])
      return { type: "card/bought", cardId: finish.cards[0] };
    if (p.earlyThin && v.resources.coins < 8 && metrics(v, p).money >= (p.toolIncome ?? 0) && publicHorizon(v) > Math.max(p.late ?? 2, p.stopLateTrash ? 2 : 0) && metrics(v, p).trash === 0 && metrics(v, p).junk >= 3) {
      const tools = Object.keys(v.supply).filter((id2) => v.supply[id2] > 0 && !v.bannedCards.includes(id2) && definition2(id2).cost !== null && definition2(id2).cost <= v.resources.coins && cardFeatures(id2, v.variant).trash >= 2 && gainOutcome(v, id2) !== 0);
      const tool = tools.sort((a, b) => definition2(a).cost - definition2(b).cost)[0];
      if (tool && (v.resources.coins <= definition2(tool).cost + (p.toolOverpay ?? Infinity) || _m.turn >= (p.toolDeadline ?? Infinity)))
        return { type: "card/bought", cardId: tool };
    }
    if (p.earlyAcropolis || publicHorizon(v) <= Math.max(p.late ?? 2, p.polisHorizon ?? 0, p.hamletHorizon ?? 0) || ready(v)) {
      const points = pointPurchase(v, (id2) => pointEligible(v, id2));
      if (points)
        return points;
    }
    const ids = Object.keys(v.supply).filter((id2) => v.supply[id2] > 0 && !v.bannedCards.includes(id2) && definition2(id2).cost !== null && definition2(id2).cost <= v.resources.coins && !(definition2(id2).vp ?? 0) && gainOutcome(v, id2) !== 0);
    const id = ids.sort((a, b) => utility(after(v, b), p) - utility(after(v, a), p) || definition2(a).cost - definition2(b).cost || a.localeCompare(b))[0];
    return id && utility(after(v, id), p) > utility(v, p) + 0.00000001 ? { type: "card/bought", cardId: id } : { type: "turn/ended" };
  };
}
function policy(p) {
  const base = basePolicy(p);
  return (v, m) => {
    let current = v, command = base(current, m);
    if (p.replyMargin !== undefined && v.equalTurns && (v.playersAfter ?? 0) > 0) {
      for (let i = 0;i < Object.keys(v.supply).length; i++) {
        if (command.type !== "card/bought" || !unsafeReplyPurchase(current, command.cardId, p.replyMargin))
          break;
        current = { ...current, bannedCards: [...current.bannedCards, command.cardId] };
        command = base(current, m);
      }
    }
    if (p.extraTalent && !m.firstAcropolisConsidered && command.type === "card/bought" && command.cardId === "acropolis") {
      m.firstAcropolisConsidered = true;
      if (v.supply.talent > 0 && !v.bannedCards.includes("talent") && v.resources.coins >= definition2("talent").cost) {
        m.talentSwap = { turn: m.turn, coins: v.resources.coins };
        return { type: "card/bought", cardId: "talent" };
      }
    }
    return command;
  };
}

// balance-checkpoint/equal-turns-engine-v3/selected-policy.ts
var selectedConfig = {
  draw: 2.25,
  action: 6,
  cash: 2,
  buy: 1,
  payload: 4,
  thin: 0,
  floor: 4,
  obols: 0,
  ready: 0.9,
  moneyTarget: 16,
  buffer: 2,
  playableIncome: true,
  earlyThin: true,
  trashRule: true,
  joint: 1,
  reliability: 4,
  earlyAcropolis: true,
  late: 1,
  spare: 0,
  thinPlay: 3,
  stopLateTrash: true,
  ignoreTools: false,
  toolOverpay: 1,
  toolDeadline: 4,
  polisHorizon: 1.5,
  hamletHorizon: 1,
  fundedBuys: true,
  chainPayload: true,
  toolIncome: 0,
  payloadIncome: 12,
  equalTurns: true,
  replyMargin: 1
};
var selectedEngine = policy(selectedConfig);

// balance-checkpoint/engine-opening-book/policy.ts
function policy2(p) {
  const base = policy(p);
  return (v, m) => {
    if (!p.openingBook || m.turn > 2 || v.choice || v.phase === "actions")
      return base(v, m);
    if (v.phase === "treasures" && v.hand.some((c) => definition2(c.cardId).type === "Treasure"))
      return base(v, m);
    if (v.resources.buys <= 0)
      return { type: "turn/ended" };
    if (m.turn === 1)
      m.openingFirstCoins ??= v.resources.coins;
    const first = m.openingFirstCoins;
    if (first === undefined)
      return base(v, m);
    const high = Math.max(first, 6 - first), split = high === 5 ? "5/1" : high === 4 ? "4/2" : "3/3";
    const opening = p.openingBook[split];
    if (!opening)
      return base(v, m);
    const index = split === "3/3" ? m.turn - 1 : v.resources.coins === high ? 0 : 1;
    const card = opening.cards[index];
    if (card !== null && (v.supply[card] <= 0 || v.bannedCards.includes(card) || definition2(card).cost === null || definition2(card).cost > v.resources.coins))
      throw Error("Illegal opening-book purchase: " + card);
    (m.openingActions ??= []).push({ turn: m.turn, coins: v.resources.coins, card });
    return card === null ? { type: "turn/ended" } : { type: "card/bought", cardId: card };
  };
}

// balance-checkpoint/engine-opening-book/candidate-book.ts
var openingBook = {
  "5/1": {
    split: "5/1",
    cards: [
      "merchant-fleet",
      null
    ]
  },
  "4/2": {
    split: "4/2",
    cards: [
      "harvest-feast",
      "seed-keeper"
    ]
  },
  "3/3": {
    split: "3/3",
    cards: [
      "drachma",
      "seed-keeper"
    ]
  }
};
var openingEngine = policy2({ ...selectedConfig, openingBook });

// balance-checkpoint/engine-discard/discard.ts
var SAMPLES = 8;
function evaluateDiscards(v, m, p, base) {
  if (v.choice?.kind !== "discard" || v.choice.source !== "harvest-feast" || v.choice.min !== 1 || v.choice.max !== 1)
    throw Error("Expected Feast single discard");
  const old = base(v, structuredClone(m));
  if (old.type !== "choice/resolved")
    throw Error("Expected discard");
  const visible = [...v.hand, ...v.play, ...v.discard ?? []], counts = { ...v.owned };
  for (const c of visible)
    counts[c.cardId]--;
  const unknown = [];
  for (const [id, n] of Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) {
    if (n < 0)
      throw Error("Inconsistent public inventory");
    for (let i = 0;i < n; i++)
      unknown.push({ id: `evaluation-${id}-${i}`, cardId: id, copy: i });
  }
  if (v.drawPileCount !== undefined && unknown.length !== v.drawPileCount)
    throw Error("Draw pool mismatch");
  const candidates2 = [...v.hand].sort((a, b) => Number(old.targets.includes(b.id)) - Number(old.targets.includes(a.id)) || a.id.localeCompare(b.id));
  const unique = candidates2.filter((c, i) => candidates2.findIndex((x) => x.cardId === c.cardId) === i);
  return unique.map((c) => {
    let total = 0;
    const details = [];
    for (let sample = 0;sample < SAMPLES; sample++) {
      const game = { phase: "playing", seed: `discard-v1:${sample}`, turn: { ...initialTurn2(), phase: v.phase, choice: structuredClone(v.choice), leaderUsed: v.leaderUsed, number: v.turn, turns: { ev: v.myTurns } }, supply: { ...v.supply }, trash: [], movements: [], turnOrder: ["ev"], draftOrder: [], leaders: { ev: v.leader }, decks: { ev: { hand: structuredClone(v.hand), play: structuredClone(v.play), discard: structuredClone(v.discard ?? []), deck: shuffle2(unknown, `discard-v1:pool:${sample}`) } }, sharedEvents: [], dealtAtSequence: null, resources: { ...v.resources }, playerCount: v.playerCount, players: [{ uid: "ev", name: "Evaluation" }], activity: [] };
      const inventory = { ev: { ...v.owned } }, acquired = new Set, memory = structuredClone(m), drawn = new Set;
      let gainedVP = 0, unseen = v.unseenCount;
      const view = () => ({ ...v, hand: game.decks.ev.hand, play: game.decks.ev.play, discard: game.decks.ev.discard, phase: game.turn.phase, choice: game.turn.choice, leaderUsed: game.turn.leaderUsed, resources: { ...game.resources }, supply: { ...game.supply }, owned: { ...inventory.ev }, drawPileCount: game.decks.ev.deck.length, unseenCount: unseen, myScore: Object.entries(inventory.ev).reduce((s, [id, n]) => s + n * (definition2(id).vp ?? 0), 0) });
      const commands2 = [];
      let command = { type: "choice/resolved", choiceId: v.choice.id, targets: [c.id] };
      for (let step = 0;; step++) {
        if (step >= 200)
          throw Error("Discard continuation guard");
        if (command.type === "turn/ended")
          break;
        commands2.push(command);
        const start = game.movements.length;
        applyPlayCommand2(game, "ev", command, step + 1, "base-game");
        for (const move of game.movements.slice(start))
          if (move.card) {
            if (move.kind === "gain")
              gainedVP += definition2(move.card.cardId).vp ?? 0;
            if (move.kind === "draw" && !drawn.has(move.card.id)) {
              drawn.add(move.card.id);
              unseen = Math.max(0, unseen - 1);
            }
          }
        updateInventory(inventory, game, start, acquired);
        command = base(view(), memory);
      }
      const final = view(), share = endingShare(final);
      const score = share !== null ? 1e4 * share + final.myScore : v.finalRound ? 100 * final.myScore : utility(final, p) + p.cash * 8 / 6 * gainedVP;
      if (!Number.isFinite(score))
        throw Error("Nonfinite discard score");
      total += score;
      details.push({ draws: game.movements.filter((x) => x.kind === "draw").length, shuffles: game.movements.filter((x) => x.kind === "shuffle").length, score, owned: final.owned, coins: final.resources.coins, gainedVP, commands: commands2 });
    }
    return { targets: [c.id], card: c.cardId, score: total / SAMPLES, baseline: old.targets.includes(c.id), details };
  }).sort((a, b) => b.score - a.score || Number(b.baseline) - Number(a.baseline) || a.targets[0].localeCompare(b.targets[0]));
}

// balance-checkpoint/engine-discard/policy.ts
function policy3(p) {
  const base = policy2(p);
  return (v, m) => {
    if (p.lookaheadDiscard && v.variant === "base-game" && v.choice?.kind === "discard" && v.choice.source === "harvest-feast") {
      const best = evaluateDiscards(v, m, p, base)[0];
      return { type: "choice/resolved", choiceId: v.choice.id, targets: best.targets };
    }
    return base(v, m);
  };
}

// balance-checkpoint/engine-p2-search/baseline.ts
var selectedConfig2 = { ...selectedConfig, openingBook, lookaheadDiscard: true, payload: 0, replyMargin: 1 };
var selectedEngine2 = policy3(selectedConfig2);

// balance-checkpoint/engine-p2-search/policy.ts
function policy4(p) {
  const base = policy3(p), adjusted = policy3({ ...p, ...p.p2Patch });
  return (v, m) => p.p2Patch && m.turn > 2 && v.playerCount === 2 && v.equalTurns && v.playersAfter === 0 ? adjusted(v, m) : base(v, m);
}

// balance-checkpoint/accepted-engine/selected-policy.ts
var selectedConfig3 = { ...selectedConfig2, p2Patch: { extraTalent: true } };
var selectedEngine3 = policy4(selectedConfig3);

// balance-checkpoint/equal-turns/source/scripts/balance/base-profiles.ts
var historicalBaseProfiles = {
  treasure: { family: "treasure", parameters: candidates[0], thinning: false },
  "treasure-thin": { family: "treasure", parameters: candidates[0], thinning: true },
  engine: { family: "engine", parameters: candidates[0], thinning: false },
  "engine-thin": { family: "engine", parameters: candidates[0], thinning: true }
};
var v14BaseProfiles = Object.fromEntries(Object.entries(historicalBaseProfiles).map(([key, p]) => [key, withEndGame(p)]));
var v15BaseProfiles = Object.fromEntries(Object.entries(v14BaseProfiles).map(([key, p]) => [key, { ...p, evaluation: "shuffle-3" }]));
var v18BaseProfiles = Object.fromEntries(Object.entries(v14BaseProfiles).map(([key, p]) => [key, { ...p, evaluation: "shuffle-effective", samplingPolicy: "raw", samplingMethod: "stratified" }]));
var pairBaseProfiles = Object.fromEntries(Object.entries(v18BaseProfiles).map(([key, p]) => [key, { ...p, purchasePlanner: "pair" }]));
var raceProfiles = Object.fromEntries(Object.entries(historicalBaseProfiles).flatMap(([key, p]) => [[key, { ...p, race: false }], [key + "-race", { ...p, race: true }]]));
var endGameProfiles = Object.fromEntries(Object.entries(historicalBaseProfiles).filter(([, p]) => p.family === "treasure").flatMap(([key, p]) => [[key, { ...p, endGame: false }], [key + "-endgame", { ...p, endGame: true }]]));
var engineEndGameProfiles = Object.fromEntries(Object.entries(historicalBaseProfiles).filter(([, p]) => p.family === "engine").flatMap(([key, p]) => [[key, { ...p, endGame: false }], [key + "-endgame", { ...p, endGame: true }]]));

// standard-matrix/policy.ts
var accepted = policy4(selectedConfig3);
var outsideBook = policy4({ ...selectedConfig3, openingBook: undefined });
var events = new Set(["counsel-of-olympus", "tribute-of-the-tides", "blessing-of-the-fields", "trial-of-the-spear"]);

// historical-thaleia/source/scripts/balance/engine.ts
var featureCache2 = new Map;
var capacityCache2 = new WeakMap;
var keepCache2 = new WeakMap;

// historical-thaleia/source/scripts/balance/thin.ts
var effectCache2 = new Map;
var economyCache2 = new Map;
var baseEconomy2 = new WeakMap;
var workCache2 = new WeakMap;
var toolCache2 = new Map;

// historical-thaleia/source/scripts/balance/strategy.ts
var valueCache2 = new WeakMap;
// src/lib/bots/session.ts
class BotTracker {
  inventory;
  acquired = new Set;
  memories = {};
  histories = {};
  supplies = {};
  key = "";
  draws = 0;
  seen = new Set;
  gained = new Set;
  target = 0;
  constructor(game) {
    this.inventory = inventoryAtSetup(game, "standard");
    for (const uid of game.turnOrder)
      this.memories[uid] = { turn: 0 };
  }
  view(game) {
    const uid = activePlayer(game), mem = this.memories[uid];
    if (this.key !== uid + "/" + game.turn.number) {
      this.key = uid + "/" + game.turn.number;
      mem.turn++;
      this.draws = game.decks[uid].hand.length;
      this.target = Object.values(this.inventory[uid]).reduce((a, b) => a + b, 0);
      this.seen = new Set(game.decks[uid].hand.map((c) => c.id));
      this.gained = new Set;
      (this.supplies[uid] ??= []).push({ turn: mem.turn, supply: { ...game.supply } });
    }
    const v = strategyView(game, uid, this.inventory, undefined, "standard", Math.max(0, this.target - this.seen.size));
    const recent = [...(this.histories[uid] ?? []).slice(-3), this.draws];
    v.drawsPerTurn = recent.reduce((a, b) => a + b, 0) / recent.length;
    const old = this.supplies[uid].slice(-4)[0], elapsed = Math.max(1, mem.turn - old.turn);
    v.supplyRates = Object.fromEntries(Object.entries(game.supply).map(([id, n]) => [id, Math.max(0, (old.supply[id] - n) / elapsed)]));
    return { ...v, effectQueue: structuredClone(game.turn.queue) };
  }
  observe(game, uid, start, command2) {
    for (const move of game.movements.slice(start))
      if (move.uid === uid && move.card) {
        if ((move.kind === "gain" || move.kind === "topdeck") && move.card.id.startsWith("supply-") && !this.acquired.has(move.card.id))
          this.gained.add(move.card.id);
        if (move.kind === "draw" && command2.type !== "turn/ended") {
          this.draws++;
          if (!this.gained.has(move.card.id))
            this.seen.add(move.card.id);
        }
      }
    updateInventory(this.inventory, game, start, this.acquired);
    if (command2.type === "turn/ended")
      (this.histories[uid] ??= []).push(this.draws);
  }
}

// scripts/rl/masked_actor.ts
function maskedActorAction(actor, expectedSchemaSignature) {
  let layers;
  function floats(encoded) {
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    if (bytes.length % 4)
      throw Error("Invalid tensor");
    const view = new DataView(bytes.buffer), out = new Float32Array(bytes.length / 4);
    for (let i = 0;i < out.length; i++) {
      out[i] = view.getFloat32(i * 4, true);
      if (!Number.isFinite(out[i]))
        throw Error("Nonfinite tensor");
    }
    return out;
  }
  return (values, mask) => {
    if (actor.version !== 1 || actor.schemaSignature !== expectedSchemaSignature || actor.activation !== "tanh" || actor.dtype !== "float32-le")
      throw Error("Incompatible research model");
    layers ??= actor.layers.map((l) => ({ ...l, weights: floats(l.weights), bias: floats(l.bias) }));
    let input = new Float32Array(values);
    for (const x of input)
      if (!Number.isFinite(x))
        throw Error("Nonfinite observation");
    const nonzero = [];
    for (let i = 0;i < input.length; i++)
      if (input[i] !== 0)
        nonzero.push(i);
    for (let n = 0;n < layers.length; n++) {
      const l = layers[n], last = n === layers.length - 1;
      if (input.length !== l.input || l.weights.length !== l.input * l.output || l.bias.length !== l.output)
        throw Error("Invalid dimensions");
      if (last && mask.length !== l.output)
        throw Error("Invalid action mask");
      const output = new Float32Array(l.output);
      let best = -1;
      for (let row = 0;row < l.output; row++) {
        if (last && !mask[row])
          continue;
        let value = l.bias[row];
        const start = row * l.input;
        if (n === 0) {
          for (const col of nonzero)
            value += l.weights[start + col] * input[col];
        } else
          for (let col = 0;col < l.input; col++)
            value += l.weights[start + col] * input[col];
        value = Math.fround(value);
        output[row] = last ? value : Math.tanh(value);
        if (!Number.isFinite(output[row]))
          throw Error("Nonfinite policy output");
        if (last && (best < 0 || output[row] > output[best]))
          best = row;
      }
      if (last) {
        if (best < 0)
          throw Error("No legal action");
        return best;
      }
      input = output;
    }
    throw Error("No actor layers");
  };
}

// scripts/rl/public_features.ts
var leaders = ["melia", "nereon", "thaleia", "doreios"];
var kinds = ["resource", "draw", "trash", "discard", "gain", "reveal"];
var resources = ["actions", "coins", "buys", "worship"];
var sourceIds = cards.map((c) => c.id);
var maxPublicQueue = 5;
var extraFeatureNames = [
  "playerCount",
  ...leaders.map((l) => `self.leader.${l}`),
  ...[0, 1, 2, 3].map((i) => `self.turnPosition.${i}`),
  ...[1, 2, 3].flatMap((i) => [
    `opponent${i}.present`,
    ...leaders.map((l) => `opponent${i}.leader.${l}`),
    ...[0, 1, 2, 3].map((p) => `opponent${i}.turnPosition.${p}`),
    ...["alreadyPlayedThisRound", "turns", "score", "handCount", "drawPileCount", "discardCount"].map((k) => `opponent${i}.${k}`),
    ...deckIds.map((id) => `opponent${i}.publicInventory.${id}`)
  ]),
  ...Array.from({ length: maxPublicQueue }, (_, i) => [
    `queue${i}.present`,
    ...kinds.map((k) => `queue${i}.kind.${k}`),
    ...resources.map((k) => `queue${i}.resource.${k}`),
    ...sourceIds.map((id) => `queue${i}.source.${id}`),
    ...deckIds.map((id) => `queue${i}.fixedGain.${id}`),
    ...["amount", "limit", "forge", "offeringSum", "offeringAmount", "actionOnly", "topdeck", "optional"].map((k) => `queue${i}.${k}`)
  ]).flat(),
  ...eventIds.flatMap((id) => ["present", "devotion", "favored", "affordable", "worshipAvailable", "executable"].map((k) => `worship.${id}.${k}`))
];
var publicObservationSize = 171 + extraFeatureNames.length;
var publicSchemaSignature = (kind) => JSON.stringify({ base: schemaSignature, kind, extraFeatureNames, opponentOrder: "cyclic future turn order from current player", inventory: "starting inventory plus public acquisitions minus public trashes", normalizationVersion: 1 });
function publicObservation(game, tracker, view, kind) {
  const base = observation(view);
  if (kind === "zero-public-v1")
    return [...base, ...extraFeatureNames.map(() => 0)];
  const uid = activePlayer(game), position2 = game.turnOrder.indexOf(uid), order = game.turnOrder;
  const extra = [game.playerCount / 4, ...leaders.map((l) => Number(game.leaders[uid] === l)), ...[0, 1, 2, 3].map((i) => Number(position2 === i))];
  for (let distance = 1;distance <= 3; distance++) {
    const other = distance < order.length ? order[(position2 + distance) % order.length] : undefined;
    const index = other ? order.indexOf(other) : -1, inventory = other ? tracker.inventory[other] : {};
    const score = Object.entries(inventory).reduce((n, [id, count2]) => n + count2 * (definition(id).vp ?? 0), 0);
    extra.push(Number(!!other), ...leaders.map((l) => Number(!!other && game.leaders[other] === l)), ...[0, 1, 2, 3].map((i) => Number(index === i)), Number(!!other && index < position2), other ? (game.turn.turns[other] ?? 0) / 50 : 0, score / 50, other ? game.decks[other].hand.length / 20 : 0, other ? game.decks[other].deck.length / 30 : 0, other ? game.decks[other].discard.length / 30 : 0, ...deckIds.map((id) => (inventory[id] ?? 0) / 10));
  }
  if (game.turn.queue.length > maxPublicQueue)
    throw Error("Public observation queue exceeds versioned schema");
  for (let i = 0;i < maxPublicQueue; i++) {
    const e = game.turn.queue[i];
    extra.push(Number(!!e), ...kinds.map((k) => Number(e?.kind === k)), ...resources.map((k) => Number(e?.kind === "resource" && e.resource === k)), ...sourceIds.map((id) => Number(e?.source === id)), ...deckIds.map((id) => Number(e?.kind === "gain" && e.cardId === id)), e && "amount" in e ? e.amount / 10 : 0, e?.kind === "gain" ? e.limit / 10 : 0, Number(!!e && "forge" in e && e.forge), Number(!!e && "offering" in e && e.offering === "sum"), e && "offering" in e && typeof e.offering === "number" ? e.offering / 3 : 0, Number(e?.kind === "gain" && !!e.actionOnly), Number(e?.kind === "gain" && !!e.topdeck), Number(e?.kind === "gain" && !!e.optional));
  }
  for (const id of eventIds) {
    const devotion = devotionCards(game, uid, id).length;
    extra.push(Number(game.sharedEvents.includes(id)), devotion / 4, Number(devotion >= 2), Number(game.resources.coins >= definition(id).cost), Number(game.resources.worship > 0), Number(worshipReason(game, uid, id) === ""));
  }
  if (extra.length !== extraFeatureNames.length || extra.some((n) => !Number.isFinite(n)))
    throw Error("Invalid public feature vector");
  return [...base, ...extra];
}

// scripts/rl/research_actor.ts
function createResearchActor(data) {
  const kind = data.observationKind;
  if (kind !== undefined && !["public-v1", "zero-public-v1"].includes(kind))
    throw Error("Unknown research observation");
  const expected = kind ? publicSchemaSignature(kind) : schemaSignature;
  return { ...createActor(data, expected), maskedAction: maskedActorAction(data, expected), observationKind: kind };
}
function actorObservation(actor, game, tracker, view) {
  return actor.observationKind ? publicObservation(game, tracker, view, actor.observationKind) : observation(view);
}

// src/lib/bots/doreios-grove.ts
var money2 = { obol: 1, drachma: 2, talent: 3 };
var owned = (v, id) => v.owned[id] ?? 0;
var available = (v, id) => v.supply[id] > 0 && !v.bannedCards.includes(id);
var cash2 = (v) => v.resources.coins + v.hand.reduce((n, c) => n + (money2[c.cardId] ?? 0), 0);
var late2 = (v) => !!v.finalRound || v.supply.acropolis <= 1;
var favored = (v, god) => v.play.filter((c) => definition(c.cardId).type === "Action" && definition(c.cardId).god === god).length >= 2;
var actions = (id) => actionEffects(id).reduce((n, e) => n + (e.kind === "resource" && e.resource === "actions" ? e.amount : 0), 0);
var buffer = (v) => 1 + Object.entries(v.owned).reduce((n, [id, count2]) => n + (definition(id).type === "Action" ? count2 * (actions(id) - 1) : 0), 0);
function safeGain(v, id, removedVP = 0) {
  const ends = v.supply[id] === 1 && (id === "acropolis" || Object.values(v.supply).filter((n) => n === 0).length >= 2);
  return !ends || v.myScore - removedVP + (definition(id).vp ?? 0) >= Math.max(...v.scores);
}
function pointCard(v, budget, removedVP = 0) {
  return ["acropolis", "polis", "hamlet"].find((id) => available(v, id) && definition(id).cost <= budget && safeGain(v, id, removedVP));
}
function buy(v, budget) {
  if (v.resources.buys < 1)
    return;
  if (late2(v))
    return pointCard(v, budget);
  const list = [
    "acropolis",
    ...!owned(v, "sacred-grove") ? ["sacred-grove"] : [],
    ...owned(v, "talent") < 2 ? ["talent"] : [],
    "sacred-academy",
    ...!owned(v, "bronze-recruit") ? ["bronze-recruit"] : [],
    ...owned(v, "harbor-pilot") < 1 || buffer(v) < 0 ? ["harbor-pilot"] : [],
    "harvest-feast",
    ...!owned(v, "oracles-acolyte") ? ["oracles-acolyte"] : []
  ];
  return list.find((id) => available(v, id) && definition(id).cost <= budget && safeGain(v, id));
}
function thin(v, max) {
  if (late2(v))
    return [];
  const result = v.hand.filter((c) => c.cardId === "hamlet").slice(0, max);
  let total = Object.entries(money2).reduce((n, [id, value]) => n + owned(v, id) * value, 0) + 2 * owned(v, "bronze-recruit");
  let potential = cash2(v);
  const target = buy(v, potential), floor = target ? definition(target).cost : 0;
  for (const c of v.hand.filter((c2) => c2.cardId === "obol")) {
    if (result.length >= max)
      break;
    if (total <= 5 || potential - 1 < floor)
      continue;
    result.push(c);
    total--;
    potential--;
  }
  return result;
}
function conversion(v, offering) {
  const pairs = v.hand.flatMap((card) => {
    const removedVP = definition(card.cardId).vp ?? 0, limit = definition(card.cardId).cost + offering;
    if (late2(v)) {
      const gain = pointCard(v, limit, removedVP);
      return gain && (definition(gain).vp ?? 0) > removedVP ? [{ card, gain, value: definition(gain).vp - removedVP }] : [];
    }
    return (card.cardId === "hamlet" || card.cardId === "obol") && limit >= 3 && available(v, "drachma") ? [{ card, gain: "drachma", value: 1 }] : [];
  });
  return pairs.sort((a, b) => b.value - a.value || definition(a.card.cardId).cost - definition(b.card.cardId).cost || a.card.id.localeCompare(b.card.id))[0];
}
function doreiosGroveCommand(v) {
  if (v.leader !== "doreios")
    throw Error("Grove experiment requires Doreios");
  const c = v.choice;
  if (c) {
    if (c.kind === "gain") {
      const legal = (id3) => available(v, id3) && definition(id3).cost <= c.limit && (!c.actionOnly || definition(id3).type === "Action");
      let list;
      if (late2(v))
        list = ["acropolis", "polis", "hamlet"];
      else if (c.source === "trial-of-the-spear")
        list = ["drachma"];
      else
        list = [
          ...buffer(v) < 0 ? ["harbor-pilot"] : [],
          ...!owned(v, "council-of-sages") && buffer(v) >= 1 && owned(v, "harvest-feast") >= 3 ? ["council-of-sages"] : [],
          "harvest-feast",
          ...!owned(v, "harbor-pilot") ? ["harbor-pilot"] : [],
          "drachma",
          "oracles-acolyte"
        ];
      const id2 = list.find((id3) => legal(id3) && safeGain(v, id3)) ?? (c.min ? Object.keys(v.supply).filter(legal).sort((a, b) => definition(b).cost - definition(a).cost || a.localeCompare(b))[0] : undefined);
      return { type: "choice/resolved", choiceId: c.id, targets: id2 ? [id2] : [] };
    }
    if (c.kind === "trash") {
      const target = c.source === "trial-of-the-spear" ? conversion(v, typeof c.offering === "number" ? c.offering : 1)?.card : undefined;
      return { type: "choice/resolved", choiceId: c.id, targets: c.source === "trial-of-the-spear" ? target ? [target.id] : [] : thin(v, c.max).map((x) => x.id) };
    }
    const keep = (x) => definition(x.cardId).type === "Territory" ? -20 : definition(x.cardId).type === "Action" && v.resources.actions === 0 ? -10 : definition(x.cardId).cost ?? 0;
    return { type: "choice/resolved", choiceId: c.id, targets: [...v.hand].sort((a, b) => keep(a) - keep(b) || a.id.localeCompare(b.id)).slice(0, c.min).map((x) => x.id) };
  }
  if (v.phase === "actions") {
    const priority = (x) => 20 * actions(x.cardId) + actionEffects(x.cardId).reduce((n, e) => n + (e.kind === "draw" ? e.amount : 0), 0);
    const next = v.hand.filter((x) => definition(x.cardId).type === "Action").sort((a, b) => priority(b) - priority(a) || a.id.localeCompare(b.id))[0];
    return next && v.resources.actions > 0 ? { type: "action/played", instanceId: next.id } : { type: "phase/advanced" };
  }
  const can = (id2) => !v.finalRound && v.resources.worship > 0 && v.events.includes(id2) && !v.bannedEvents.includes(id2) && v.resources.coins >= definition(id2).cost;
  if (!late2(v) && cash2(v) < 5 && v.hand.filter((x) => x.cardId === "hamlet").length >= 2 && can("blessing-of-the-fields"))
    return { type: "god/worshipped", cardId: "blessing-of-the-fields" };
  if (can("trial-of-the-spear")) {
    const option = conversion(v, favored(v, "Ares") ? 3 : 1);
    const before = pointCard(v, cash2(v)), after = pointCard(v, cash2(v) - 4);
    const points = (id2) => id2 ? definition(id2).vp ?? 0 : 0;
    if (option && (late2(v) ? option.value + (v.resources.buys ? points(after) : 0) > (v.resources.buys ? points(before) : 0) : cash2(v) - (money2[option.card.cardId] ?? 0) < 5))
      return { type: "god/worshipped", cardId: "trial-of-the-spear" };
  }
  if (v.phase === "treasures") {
    const next = v.hand.filter((x) => money2[x.cardId]).sort((a, b) => money2[b.cardId] - money2[a.cardId] || a.id.localeCompare(b.id))[0];
    if (next)
      return { type: "treasure/played", instanceId: next.id };
  }
  const id = buy(v, v.resources.coins);
  return id ? { type: "card/bought", cardId: id } : { type: "turn/ended" };
}

// scripts/rl/four_reward.ts
function validateFourReward(value) {
  if (value === undefined)
    return;
  const v = value;
  if (v?.kind === "round-discounted-win" && Number.isFinite(v.discount) && v.discount > 0 && v.discount <= 1)
    return { kind: v.kind, discount: v.discount };
  if (v?.kind === "score-margin" && Number.isFinite(v.scale) && v.scale > 0 && Number.isFinite(v.winWeight) && v.winWeight >= 0 && v.winWeight <= 1)
    return { kind: v.kind, scale: v.scale, winWeight: v.winWeight };
  throw Error("Invalid four-player reward");
}
function fourReward(share, rounds, reward, margin) {
  if (!Number.isFinite(share) || share < 0 || share > 1 || !Number.isInteger(rounds) || rounds < 1)
    throw Error("Invalid terminal reward inputs");
  if (reward?.kind === "score-margin") {
    if (!Number.isFinite(margin))
      throw Error("Score-margin reward needs terminal score margin");
    return reward.winWeight * share + (1 - reward.winWeight) * (0.5 + 0.5 * Math.tanh(margin / reward.scale));
  }
  return reward ? share * Math.pow(reward.discount, rounds - 1) : 2 * share - 1;
}

// scripts/rl/thin_policy.ts
function thinOverride(view, base, rule) {
  if (view.leader !== "doreios" || view.choice?.kind !== "trash" || view.choice.source !== "doreios" || base.type !== "choice/resolved" || base.targets.length || view.finalRound || view.supply.acropolis <= rule.stopSupply)
    return base;
  const obol = view.hand.find((c) => c.cardId === "obol");
  if (!obol || view.hand.some((c) => c.cardId === "hamlet"))
    return base;
  const money3 = (view.owned.obol ?? 0) + 2 * (view.owned.drachma ?? 0) + 3 * (view.owned.talent ?? 0);
  if (money3 - 1 < rule.floor)
    return base;
  const cash3 = view.resources.coins + view.hand.reduce((s, c) => s + (c.cardId === "obol" ? 1 : c.cardId === "drachma" ? 2 : c.cardId === "talent" ? 3 : 0), 0);
  if (rule.protect.includes(cash3))
    return base;
  return { type: "choice/resolved", choiceId: view.choice.id, targets: [obol.id] };
}

// scripts/rl/opening_policy.ts
var positiveActions = (id) => actionEffects(id).some((e) => e.kind === "resource" && e.resource === "actions" && e.amount > 0);
function openingOverride(v, base, r) {
  if (v.leader !== "doreios")
    return base;
  if (r.thin) {
    const result = thinOverride(v, base, r.thin);
    if (result !== base)
      return result;
  }
  if (v.choice)
    return base;
  if (r.playAres && !v.leaderUsed && v.phase === "actions" && v.resources.actions > 0 && !v.hand.some((c) => definition(c.cardId).type === "Action" && positiveActions(c.cardId))) {
    const order = ["victorious-procession", "bronze-recruit", "forge-of-heroes"];
    const card = order.map((id) => v.hand.find((c) => c.cardId === id)).find(Boolean);
    if (card)
      return { type: "action/played", instanceId: card.id };
  }
  if (r.spendBeforeBuy !== undefined && v.phase !== "buys" && v.resources.coins <= r.spendBeforeBuy && (base.type === "card/bought" || base.type === "turn/ended") && v.hand.some((c) => definition(c.cardId).type === "Treasure"))
    return { type: "treasures/played" };
  if (base.type !== "card/bought" || v.myTurns > r.through || v.finalRound || v.resources.coins >= 6)
    return base;
  const buy2 = (id) => v.supply[id] > 0 && !v.bannedCards.includes(id) && definition(id).cost <= v.resources.coins;
  if (r.card && !(v.owned[r.card] ?? 0) && buy2(r.card))
    return { type: "card/bought", cardId: r.card };
  const terminals = Object.entries(v.owned).reduce((n, [id, count2]) => n + (definition(id).type === "Action" && !positiveActions(id) ? count2 : 0), 0);
  if (r.harbor && terminals >= 2 && !(v.owned["harbor-pilot"] ?? 0) && buy2("harbor-pilot"))
    return { type: "card/bought", cardId: "harbor-pilot" };
  return base;
}

// scripts/rl/temple_order_policy.ts
function templeOrderOverride(v, base, r) {
  if (v.leader !== "doreios" || v.choice || v.phase !== "actions" || v.resources.actions < 1)
    return base;
  const temple = v.hand.find((c) => c.cardId === "temple-of-ares");
  if (!temple || base.type === "action/played" && base.instanceId === temple.id)
    return base;
  if (r.mode === "hamlet" && !v.hand.some((c) => c.cardId === "hamlet"))
    return base;
  if (r.mode === "last-action") {
    if (v.resources.actions !== 1 || base.type !== "action/played")
      return base;
    const id = v.hand.find((c) => c.id === base.instanceId).cardId;
    if (actionEffects(id).some((e) => e.kind === "resource" && e.resource === "actions" && e.amount > 0))
      return base;
  }
  return { type: "action/played", instanceId: temple.id };
}

// scripts/rl/four_environment.ts
class FourEnvironment {
  leader;
  game;
  tracker;
  undo;
  events = [];
  steps = 0;
  uid = "";
  seed = "";
  block = 0;
  rotation = 0;
  actors = {};
  observationKind;
  reward;
  openingCurriculum;
  curriculumApplied = false;
  teacherPolicy;
  teacherThinRule;
  constructor(leader, manifestPath) {
    this.leader = leader;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    this.reward = validateFourReward(manifest.reward);
    if (manifest.openingCurriculum !== undefined) {
      const p = manifest.openingCurriculum?.probability;
      if (!Number.isFinite(p) || p < 0 || p > 1)
        throw Error("Invalid opening curriculum");
      this.openingCurriculum = { probability: p };
    }
    if (manifest.observationKind !== undefined) {
      if (!["public-v1", "zero-public-v1"].includes(manifest.observationKind))
        throw Error("Unknown observation kind");
      this.observationKind = manifest.observationKind;
    }
    if (manifest.teacher !== undefined) {
      if (!["grove", "mm", "temple-order"].includes(manifest.teacher) || leader !== "doreios")
        throw Error("Unsupported four-player teacher");
      this.teacherPolicy = manifest.teacher;
    }
    if (manifest.teacherThinRule !== undefined) {
      const r = manifest.teacherThinRule;
      if (this.teacherPolicy !== "temple-order" || !Number.isFinite(r.floor) || r.floor < 0 || !Number.isFinite(r.stopSupply) || r.stopSupply < 0 || !Array.isArray(r.protect) || r.protect.some((x) => typeof x !== "number" || !Number.isFinite(x)))
        throw Error("Invalid teacher thinning rule");
      this.teacherThinRule = r;
    }
    for (const [leader2, entry] of Object.entries(manifest.actors)) {
      const raw = readFileSync(entry.path);
      if (createHash("sha256").update(raw).digest("hex") !== entry.sha256)
        throw Error("Frozen actor drift");
      const actor = JSON.parse(raw.toString());
      if (actor.leader !== leader2)
        throw Error("Wrong leader");
      this.actors[leader2] = createResearchActor(actor);
    }
    if (Object.keys(this.actors).sort().join() !== "doreios,melia,nereon,thaleia")
      throw Error("Four actors required");
  }
  reset(seed, _first) {
    this.seed = seed;
    const index = Number(seed.split(":").at(-1)) || 0;
    this.block = Math.floor(index / 4);
    this.rotation = index % 4;
    const orders = [["nereon", "thaleia", "doreios"], ["nereon", "doreios", "thaleia"], ["thaleia", "nereon", "doreios"], ["thaleia", "doreios", "nereon"], ["doreios", "nereon", "thaleia"], ["doreios", "thaleia", "nereon"]];
    const order = ["melia", ...orders[this.block % 6]], seats = order.slice(this.rotation).concat(order.slice(0, this.rotation));
    this.uid = `p${seats.indexOf(this.leader)}`;
    this.events = [];
    this.steps = 0;
    const add = (uid, data) => this.events.push({ schemaVersion: 1, reducerVersion: 1, sequence: this.events.length + 1, commandId: `four-${this.events.length + 1}`, actorUid: uid, name: seats[Number(uid.slice(1))], playerCount: 4, type: "player/joined", ...data });
    for (let i = 0;i < 4; i++)
      add(`p${i}`, i ? { botKind: "bot" } : { type: "game/created", equalTurns: true });
    add("p0", { type: "player/automated", botKind: "bot" });
    add("p0", { type: "draft/started", seed: seed.replace(/[^:]+$/, String(this.block)) });
    for (const uid of replaySetup(this.events).draftOrder)
      add(uid, { type: "leader/chosen", leaderId: seats[Number(uid.slice(1))] });
    this.game = replaySetup(this.events);
    this.tracker = new BotTracker(this.game);
    this.undo = new UndoHistory;
    this.opponents();
    this.curriculumApplied = false;
    if (this.openingCurriculum) {
      const random = createPrng(seed + ":opening-curriculum");
      this.curriculumApplied = random() < this.openingCurriculum.probability;
      if (this.curriculumApplied) {
        while ((this.game.turn.turns[this.uid] ?? 0) < 2 && this.game.turn.phase !== "finished") {
          const view = this.tracker.view(this.game), base = commands(view)[this.runtime()];
          let command2 = openingOverride(view, base, { card: "", through: 0, harbor: false, playAres: false, thin: null, spendBeforeBuy: 100 });
          if (command2.type === "card/bought") {
            const buys = commands(view).filter((x) => !!x && x.type === "card/bought" && definition(x.cardId).type !== "Territory" && definition(x.cardId).cost >= 2);
            if (buys.length)
              command2 = buys[Math.floor(random() * buys.length)];
          }
          this.apply(command2);
          this.opponents();
        }
        if (this.game.turn.phase === "finished")
          throw Error("Curriculum ended before learner starts");
      }
    }
    return this.state();
  }
  apply(command2) {
    if (++this.steps > 1e4)
      throw Error("Episode limit: abort without excluding game");
    const uid = activePlayer(this.game), sequence = this.events.length + 1;
    this.tracker.view(this.game);
    const before = publicCommandContext(this.game, uid), start = this.game.movements.length;
    const event = { schemaVersion: 1, reducerVersion: 1, sequence, commandId: `four-${sequence}`, actorUid: uid, name: this.game.leaders[uid], playerCount: 4, ...command2 };
    const message = this.undo.apply(this.game, uid, command2, sequence);
    this.game.activity.push({ sequence, message });
    this.game.publicActivity.push(describePublicCommand(before, this.game, event));
    this.tracker.observe(this.game, uid, start, command2);
    this.events.push(event);
  }
  runtime() {
    const view = this.tracker.view(this.game), choices = commands(view);
    const actor = this.actors[view.leader];
    return actor.action(actorObservation(actor, this.game, this.tracker, view), choices.map(Boolean));
  }
  opponents() {
    while (this.game.turn.phase !== "finished" && activePlayer(this.game) !== this.uid) {
      const view = this.tracker.view(this.game);
      this.apply(commands(view)[this.runtime()]);
    }
  }
  state() {
    if (this.game.turn.phase === "finished") {
      const rows = standings(this.game), me = rows.find((r) => r.uid === this.uid), winners = rows.filter((r) => r.winner);
      if (new Set(rows.map((r) => r.turns)).size !== 1)
        throw Error("Unequal turns");
      const share = me.winner ? 1 / winners.length : 0;
      return { done: true, reward: fourReward(share, me.turns, this.reward, me.score - Math.max(...rows.filter((r) => r.uid !== this.uid).map((r) => r.score))), info: {
        seed: this.seed,
        block: this.block,
        rotation: this.rotation,
        share,
        score: me.score,
        turns: me.turns,
        seat: Number(this.uid.slice(1)),
        turnPosition: this.game.turnOrder.indexOf(this.uid),
        winnerCount: winners.length,
        scores: Object.fromEntries(rows.map((r) => [this.game.leaders[r.uid], r.score])),
        replayVerified: this.verify(),
        ...this.openingCurriculum ? { curriculumApplied: this.curriculumApplied } : {}
      } };
    }
    const view = this.tracker.view(this.game);
    return { done: false, observation: this.observationKind ? publicObservation(this.game, this.tracker, view, this.observationKind) : observation(view), mask: commands(view).map(Boolean), potential: 0 };
  }
  step(action) {
    if (activePlayer(this.game) !== this.uid)
      throw Error("Wrong learner");
    const command2 = commands(this.tracker.view(this.game))[action];
    if (!command2)
      throw Error("Illegal action");
    this.apply(command2);
    this.opponents();
    return this.state();
  }
  teacher(_preview = false) {
    if (this.teacherPolicy === "temple-order") {
      const view = this.tracker.view(this.game), base = commands(view)[this.runtime()], ordered = templeOrderOverride(view, base, { mode: "last-action" });
      return actionIndex(view, this.teacherThinRule ? thinOverride(view, ordered, this.teacherThinRule) : ordered);
    }
    if (this.teacherPolicy === "grove") {
      const view = this.tracker.view(this.game);
      return actionIndex(view, doreiosGroveCommand(view));
    }
    if (this.teacherPolicy === "mm") {
      const view = this.tracker.view(this.game);
      return actionIndex(view, mmCommand(view));
    }
    return this.runtime();
  }
  verify() {
    if (JSON.stringify(replaySetup(this.events)) !== JSON.stringify(this.game))
      throw Error("Four-player replay mismatch");
    return true;
  }
}

// scripts/rl/belief_rollout.ts
function copyTracker(source, game) {
  const t = new BotTracker(game);
  Object.assign(t, structuredClone(source));
  return t;
}
function sampleBelief(game, tracker, sample) {
  const uid = activePlayer(game), key = JSON.stringify({ turn: game.turn, supply: game.supply, leaders: game.leaders, inventory: tracker.inventory, hand: game.decks[uid].hand, discard: game.decks[uid].discard, counts: game.turnOrder.map((p) => [p, game.decks[p].deck.length, game.decks[p].hand.length, game.decks[p].discard.length, game.decks[p].play]) }) + ":belief:" + sample;
  const belief = structuredClone({ undo: null, turn: game.turn, supply: game.supply, trash: game.trash, movements: [], publicActivity: [], phase: game.phase, seed: key, turnOrder: game.turnOrder, draftOrder: game.draftOrder, leaders: game.leaders, decks: {}, sharedEvents: game.sharedEvents, dealtAtSequence: game.dealtAtSequence, resources: game.resources, playerCount: game.playerCount, players: game.players, activity: [] });
  for (const player of game.turnOrder) {
    const real = game.decks[player], own = player === uid, known = own ? [...real.hand, ...real.play, ...real.discard] : [...real.play];
    const counts = { ...tracker.inventory[player] };
    for (const card of known) {
      counts[card.cardId] = (counts[card.cardId] ?? 0) - 1;
      if (counts[card.cardId] < 0)
        throw Error("Public inventory inconsistent");
    }
    let hidden = [];
    for (const id of Object.keys(counts).sort())
      for (let i = 0;i < counts[id]; i++)
        hidden.push({ id: `belief-${sample}-${player}-${id}-${i}`, cardId: id, copy: i + 1 });
    const expected = own ? real.deck.length : real.deck.length + real.hand.length + real.discard.length;
    if (hidden.length !== expected)
      throw Error("Public zone counts inconsistent");
    hidden = shuffle(hidden, key + ":" + player);
    belief.decks[player] = own ? { hand: structuredClone(real.hand), play: structuredClone(real.play), discard: structuredClone(real.discard), deck: hidden } : { hand: hidden.slice(0, real.hand.length), deck: hidden.slice(real.hand.length, real.hand.length + real.deck.length), discard: hidden.slice(real.hand.length + real.deck.length), play: structuredClone(real.play) };
  }
  return { game: belief, tracker: copyTracker(tracker, belief) };
}
function policy5(game, tracker, actors, learner, maskedInference = false, guardTreasures = true) {
  const v = tracker.view(game), actor = actors[v.leader], choices = commands(v), base = choices[(maskedInference ? actor.maskedAction : actor.action)(actorObservation(actor, game, tracker, v), choices.map(Boolean))];
  return guardTreasures && activePlayer(game) === learner ? openingOverride(v, base, { card: "", through: 0, harbor: false, playAres: false, thin: null, spendBeforeBuy: 5 }) : base;
}
function applyHypothetical(game, tracker, command2, sequence, recordHistory = false) {
  const uid = activePlayer(game);
  tracker.view(game);
  const before = recordHistory ? publicCommandContext(game, uid) : null, start = game.movements.length;
  const message = applyPlayCommand(game, uid, command2, sequence);
  if (before) {
    game.activity.push({ sequence, message });
    game.publicActivity.push(describePublicCommand(before, game, { ...command2, sequence, actorUid: uid }));
  }
  tracker.observe(game, uid, start, command2);
}
function finish(sample, actors, learner, index, utility2, recordHistory, maskedInference, leafHorizon, leafValue, guardTreasures = true) {
  const game = structuredClone(sample.game), tracker = copyTracker(sample.tracker, game), v = tracker.view(game), first = commands(v)[index];
  if (!first)
    throw Error("Hypothesis changed root legality");
  const startingTurns = game.turn.turns[learner] ?? 0;
  let n = 0;
  applyHypothetical(game, tracker, first, 1e5 + ++n, recordHistory);
  while (game.turn.phase !== "finished") {
    if (leafHorizon !== undefined && activePlayer(game) === learner && (game.turn.turns[learner] ?? 0) >= startingTurns + leafHorizon) {
      const value = leafValue(game, tracker);
      if (!Number.isFinite(value))
        throw Error("Nonfinite leaf value");
      return Math.max(0, Math.min(1, value));
    }
    if (++n > 5000)
      throw Error("Unfinished hypothetical game");
    applyHypothetical(game, tracker, policy5(game, tracker, actors, learner, maskedInference, guardTreasures), 1e5 + n, recordHistory);
  }
  const scores = standings(game), me = scores.find((s) => s.uid === learner), winners = scores.filter((s) => s.winner), share = me.winner ? 1 / winners.length : 0;
  const margin = me.score - Math.max(...scores.filter((s) => s.uid !== learner).map((s) => s.score));
  return utility2 === "win" ? share : utility2 === "margin" ? 0.5 + 0.5 * Math.tanh(margin / 8) : share + 0.01 * Math.tanh(margin / 8);
}
function rolloutDecision(game, tracker, actors, options, leafValue) {
  if (options.leafHorizon !== undefined && (!Number.isInteger(options.leafHorizon) || options.leafHorizon < 1 || !leafValue || !["margin", "win"].includes(options.utility ?? "")))
    throw Error("Invalid value-leaf configuration");
  if (options.utility !== undefined && !["share", "margin", "win"].includes(options.utility))
    throw Error("Invalid rollout utility");
  if (!Number.isFinite(options.risk) || options.risk < 0 || !Number.isInteger(options.samples) || options.samples < 2 || !Number.isInteger(options.candidates) || options.candidates < 2)
    throw Error("Invalid rollout budget");
  const learner = activePlayer(game), v = tracker.view(game), actor = actors[v.leader], choices = commands(v), base = policy5(game, tracker, actors, learner, false, options.guardTreasures ?? true), baseIndex = actionIndex(v, base);
  const investigate = v.choice ? v.choice.kind === "gain" || options.trash && v.choice.kind === "trash" : ["card/bought", "god/worshipped", "turn/ended"].includes(base.type);
  if (!investigate)
    return { command: base, searched: false, scores: [] };
  const logits = actor.logits(actorObservation(actor, game, tracker, v)), legal = choices.map((x, i) => x ? i : -1).filter((i) => i >= 0);
  if (legal.length < 2)
    return { command: base, searched: false, scores: [] };
  const ranked = [...legal].sort((a, b) => logits[b] - logits[a] || a - b), selected = [baseIndex];
  const point = legal.find((i) => ["buy", "gain"].includes(slots[i].kind) && slots[i].ids[0] === "acropolis");
  if (point !== undefined && point !== baseIndex)
    selected.push(point);
  for (const i of ranked)
    if (!selected.includes(i) && selected.length < options.candidates)
      selected.push(i);
  const values = selected.map(() => []);
  for (let sample = 0;sample < options.samples; sample++) {
    const hypothesis = sampleBelief(game, tracker, sample);
    for (let i = 0;i < selected.length; i++)
      values[i].push(finish(hypothesis, actors, learner, selected[i], options.utility, options.recordHypotheticalHistory ?? false, options.maskedInference ?? false, options.leafHorizon, leafValue, options.guardTreasures ?? true));
  }
  let best = 0, bestBound = 0;
  const scores = selected.map((index, i) => {
    const delta = values[i].map((x, k) => x - values[0][k]), mean = delta.reduce((a, b) => a + b, 0) / delta.length;
    const se = Math.sqrt(delta.reduce((n, x) => n + (x - mean) ** 2, 0) / (delta.length - 1) / delta.length), bound = mean - options.risk * se;
    if (bound > bestBound + 0.000000001) {
      best = i;
      bestBound = bound;
    }
    return { index, mean: values[i].reduce((a, b) => a + b, 0) / options.samples, delta: mean, se, bound };
  });
  return { command: choices[selected[best]], searched: true, scores };
}

// scripts/rl/two_planner_worker.ts
var c = JSON.parse(readFileSync2(process.argv[2], "utf8"));
function critic(entry, leader, kind) {
  const raw = readFileSync2(entry.path);
  if (createHash2("sha256").update(raw).digest("hex") !== entry.sha256)
    throw Error("Critic drift");
  const data = JSON.parse(raw.toString());
  if (data.leader !== leader || data.purpose !== "research-value" || data.reward.kind !== kind || data.layers.at(-1).output !== 1)
    throw Error("Wrong critic");
  if (leader === "doreios" && (data.reward.scale !== 8 || data.reward.winWeight !== 0))
    throw Error("Wrong Doreios reward");
  return createResearchActor(data);
}
var dc = critic(c.doreiosCritic, "doreios", "score-margin");
var tc = critic(c.thaleiaCritic, "thaleia", "signed-split-win");

class Table extends FourEnvironment {
  thaleiaPlanning = false;
  counts = { doreios: { searched: 0, overrides: 0 }, thaleia: { searched: 0, overrides: 0 } };
  leaf(actor, signed = false) {
    return (game, tracker) => {
      const v = actor.logits(actorObservation(actor, game, tracker, tracker.view(game)))[0];
      return signed ? (v + 1) / 2 : v;
    };
  }
  planned(leader, base) {
    const view = this.tracker.view(this.game);
    if (view.leader !== leader)
      throw Error("Wrong planner perspective");
    const decision = rolloutDecision(this.game, this.tracker, this.actors, leader === "doreios" ? c.doreiosRule : c.thaleiaRule, this.leaf(leader === "doreios" ? dc : tc, leader === "thaleia"));
    const chosen = actionIndex(view, decision.command);
    if (decision.searched)
      this.counts[leader].searched++;
    if (chosen !== base)
      this.counts[leader].overrides++;
    return chosen;
  }
  runtime() {
    const base = super.runtime();
    return this.thaleiaPlanning && this.tracker.view(this.game).leader === "thaleia" ? this.planned("thaleia", base) : base;
  }
}
var env = new Table("doreios", c.opponentManifest);
for await (const line of createInterface({ input: process.stdin })) {
  const job = JSON.parse(line), rows = [], start = performance.now();
  env.thaleiaPlanning = job.thaleiaPlanner;
  env.counts = { doreios: { searched: 0, overrides: 0 }, thaleia: { searched: 0, overrides: 0 } };
  for (let i = 0;i < job.games; i++) {
    let state = env.reset(`${job.prefix}:${job.start + i}`, true);
    while (!state.done)
      state = env.step(env.planned("doreios", env.runtime()));
    rows.push(state.info);
  }
  process.stdout.write(JSON.stringify({ rows, counts: env.counts, seconds: (performance.now() - start) / 1000 }) + `
`);
}
