export type OpeningBook=Record<string,string|null>;
export const openingBooks:Record<string,OpeningBook>={
  "thaleia": {
    "1:1": "obol",
    "1:2": "obol",
    "1:5": "drachma"
  },
  "nereon": {
    "1:4": "sea-trade",
    "1:5": "sacred-academy",
    "2:3": "obol",
    "2:4": "obol"
  },
  "melia": {
    "1:3": "obol",
    "2:0": "obol",
    "2:2": null,
    "2:4": null
  },
  "doreios": {
    "1:1": "obol",
    "1:2": null,
    "1:4": "obol",
    "2:4": "obol"
  }
};
export const currentOpeningBooks:Record<string,OpeningBook>={
  "thaleia": {
    "1:4": "forge-of-heroes",
    "1:5": "sacred-grove",
    "2:2": null
  },
  "nereon": {
    "1:3": "seed-keeper",
    "1:4": "drachma",
    "1:5": "sacred-academy",
    "2:4": "drachma"
  },
  "melia": {
    "1:4": "drachma",
    "1:5": "harvest-feast",
    "2:5": "sacred-academy"
  },
  "doreios": {
    "1:5": "sacred-academy"
  }
};
