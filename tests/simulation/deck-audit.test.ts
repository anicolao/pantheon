import {expect,test} from 'bun:test';
import {auditDeck,dealIncome,endingDecks,type DeckInput} from '../../scripts/balance/deck-audit';
import {setupSupply} from '../../src/lib/game/setup';
import {runExperiment,replayExperiment} from '../../scripts/balance/experiment';
import {candidates} from '../../scripts/balance/strategy';
const deck=(owned:Record<string,number>):DeckInput=>({version:5,key:'audit-unit',block:0,leader:'nereon',family:'treasure',owned,supply:Object.fromEntries(setupSupply(2).map(p=>[p.id,p.count])),score:0,size:Object.values(owned).reduce((a,b)=>a+b,0)});
test('100 independent audit hands measure exact all-money income and threshold hits',()=>{
 const r=auditDeck(deck({talent:10}));expect(r.hands).toBe(100);expect(r.histogram).toEqual({'15':100});expect(r.mean).toBe(15);expect(r.hitEight).toBe(100);expect(r.predictedMean).toBe(15);
});
test('Action draws contribute spendable Coins but cannot reuse played cards',()=>{
 const d=deck({obol:6,'council-of-sages':1});
 const r=auditDeck(d);expect(Object.keys(r.histogram).sort()).toEqual(['5','6']);expect(r.hitEight).toBe(0);
 expect(r.mean).toBeGreaterThan(5.5);expect(r.mean).toBeLessThan(6);
 expect(Object.keys(r.openingHistogram).sort()).toEqual(['4','5']);
});
test('matched versions use the same fresh deals and audit seeds are deterministic',()=>{
 const d=deck({talent:3,drachma:2,hamlet:4,'council-of-sages':2});
 expect(dealIncome(d,'independent-audit')).toEqual(dealIncome(d,'independent-audit'));
 const a=auditDeck(d),b=auditDeck({...d,version:4});expect(a.histogram).toEqual(b.histogram);expect(a.openingHistogram).toEqual(b.openingHistogram);
});
test('ending inventories and supply reconstructed from telemetry match production replay',()=>{
 const options={seed:'ending-reconstruction',block:0,lineup:['doreios','melia'],focal:0,profiles:[{family:'thin' as const,parameters:candidates[0]},{family:'engine' as const,parameters:candidates[0]}]};
 const {result,events}=runExperiment(options);expect(result.status).toBe('completed');const game=replayExperiment(events,options);
 const rows=endingDecks({a:'doreios',b:'melia',familyA:'thin',familyB:'engine',seat:0,result},5);
 for(const row of rows){const uid=result.players.find(p=>p.leader===row.leader)!.uid;const owned:Record<string,number>={};for(const c of Object.values(game.decks[uid]).flat())owned[c.cardId]=(owned[c.cardId]??0)+1;expect(row.owned).toEqual(owned);expect(row.supply).toEqual(game.supply);}
});
