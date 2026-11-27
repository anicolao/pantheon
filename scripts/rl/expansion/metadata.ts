import * as full from './schema';
import * as echo from '../echo/schema';
const echoKeys=full.featureNames(echo.deckIds,echo.eventIds,echo.leaders,echo.cards.map(c=>c.id));
console.log(JSON.stringify({schema:full.schemaSignature,features:full.featureKeys.length,actions:full.slots.length,
 echoFeatures:echoKeys.map(key=>full.featureKeys.indexOf(key)),echoActions:echo.slots.map(slot=>full.slots.findIndex(s=>JSON.stringify(s)===JSON.stringify(slot)))}));
