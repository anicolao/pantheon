import { expect, test } from 'bun:test';
import { matrixSchedule, leaderPairs, matrixReport, type MatrixGame } from '../../scripts/balance/matrix';
import { leaderIds } from '../../src/lib/game/setup';
import { families, candidates } from '../../scripts/balance/strategy';
import type { Profiles } from '../../scripts/balance/study';
const profiles: Profiles = { version:1, policyVersion:4, variant:'standard', trainingSeeds:['train:0'], training:[],
 selected:Object.fromEntries(leaderIds.flatMap(l=>families.map(f=>[`2/${l}/${f}`,{family:f,parameters:candidates[0]}]))) };
test('full matrix covers every distinct leader pair, strategy pairing and both seats exactly once',()=>{
 const rows=[...matrixSchedule(0,'eval:0',profiles)];
 expect(leaderPairs).toHaveLength(6);expect(rows).toHaveLength(300);
 expect(new Set(rows.map(r=>`${r.a}/${r.b}/${r.familyA}/${r.familyB}/${r.seat}`)).size).toBe(300);
 for(const r of rows){expect(r.options.lineup[r.options.focal]).toBe(r.a);expect(r.options.profiles[r.options.focal].family).toBe(r.familyA);expect(r.options.variant).toBe('standard');}
});
test('matrix report rejects incomplete, duplicate or failed schedules instead of scoring failures',()=>{
 expect(()=>matrixReport([],2)).toThrow();
 const row={a:'thaleia',b:'nereon',familyA:'engine',familyB:'treasure',seat:0,result:{status:'error'}} as MatrixGame;
 expect(()=>matrixReport(Array(600).fill(row),2)).toThrow();
 const duplicate={...row,result:{...row.result,status:'completed',block:0}} as MatrixGame;
 expect(()=>matrixReport(Array(600).fill(duplicate),2)).toThrow();
});
